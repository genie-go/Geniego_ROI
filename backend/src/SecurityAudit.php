<?php
namespace Genie;

/**
 * [240차 약점⑦] 불변(append-only) 보안 감사 로그 — tamper-evident 해시체인.
 * ──────────────────────────────────────────────────────────────────────────
 *   엔터프라이즈 신뢰자산(SOC2/ISO 감사 요구 정합). 로그인·플랜변경·자격증명변경 등 민감 액션 기록.
 *   ★append-only(UPDATE/DELETE 코드경로 없음) + 해시체인(prev_hash → 변조 시 verify 깨짐).
 *   기존 audit_log(growth)·menu_audit_log(menu)와 별개 관심사(보안 트레일) → 중복 아님.
 *   ★감사 실패가 원 액션을 막지 않음(best-effort). MySQL TEXT DEFAULT 트랩 회피(VARCHAR 키).
 */
final class SecurityAudit
{
    public static function log(\PDO $pdo, string $tenant, string $actor, string $action, array $details = [], $req = null): void
    {
        try {
            self::ensure($pdo);
            $ip = ''; $ua = '';
            if ($req !== null && method_exists($req, 'getServerParams')) {
                $sp = $req->getServerParams();
                $ip = (string)($sp['HTTP_X_FORWARDED_FOR'] ?? $sp['REMOTE_ADDR'] ?? '');
                $ua = substr((string)$req->getHeaderLine('User-Agent'), 0, 200);
            }
            $now  = gmdate('Y-m-d H:i:s');
            $prev = self::lastHash($pdo);
            $dj   = json_encode($details, JSON_UNESCAPED_UNICODE) ?: '{}';
            $hash = hash('sha256', $prev . '|' . $tenant . '|' . $actor . '|' . $action . '|' . $dj . '|' . $now);
            $pdo->prepare(
                "INSERT INTO security_audit_log (tenant_id, actor, action, details_json, ip_address, user_agent, prev_hash, hash_chain, created_at)
                 VALUES (?,?,?,?,?,?,?,?,?)"
            )->execute([$tenant, substr($actor, 0, 190), substr($action, 0, 120), $dj, substr($ip, 0, 64), $ua, $prev, $hash, $now]);
        } catch (\Throwable $e) { /* 감사 실패는 원 액션 비차단(가용성 우선) */ }
    }

    private static function lastHash(\PDO $pdo): string
    {
        try {
            $r = $pdo->query("SELECT hash_chain FROM security_audit_log ORDER BY id DESC LIMIT 1")->fetchColumn();
            return $r ? (string)$r : 'GENESIS';
        } catch (\Throwable $e) { return 'GENESIS'; }
    }

    private static function ensure(\PDO $pdo): void
    {
        $my = $pdo->getAttribute(\PDO::ATTR_DRIVER_NAME) === 'mysql';
        $ai = $my ? 'BIGINT AUTO_INCREMENT PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT';
        $pdo->exec(
            "CREATE TABLE IF NOT EXISTS security_audit_log (
                id $ai, tenant_id VARCHAR(64), actor VARCHAR(190), action VARCHAR(120),
                details_json TEXT, ip_address VARCHAR(64), user_agent VARCHAR(255),
                prev_hash CHAR(64), hash_chain CHAR(64), created_at VARCHAR(32))"
        );
    }

    /** 무결성 검증 — 해시체인 재계산. 변조/삭제 시 broken_at 반환. @return array{ok,checked,broken_at} */
    public static function verify(\PDO $pdo, int $limit = 5000): array
    {
        try {
            $rows = $pdo->query("SELECT * FROM security_audit_log ORDER BY id ASC LIMIT " . (int)$limit)->fetchAll(\PDO::FETCH_ASSOC);
        } catch (\Throwable $e) { return ['ok' => true, 'checked' => 0, 'note' => 'no_table']; }
        $prev = 'GENESIS'; $broken = null;
        foreach ($rows as $r) {
            $h = hash('sha256', $prev . '|' . $r['tenant_id'] . '|' . $r['actor'] . '|' . $r['action'] . '|' . $r['details_json'] . '|' . $r['created_at']);
            if (!hash_equals((string)$r['hash_chain'], $h) || (string)$r['prev_hash'] !== $prev) { $broken = (int)$r['id']; break; }
            $prev = $h;
        }
        return ['ok' => $broken === null, 'checked' => count($rows), 'broken_at' => $broken];
    }

    /** 최근 감사 항목 조회(읽기전용·테넌트 스코프). */
    public static function recent(\PDO $pdo, ?string $tenant = null, int $limit = 200): array
    {
        try {
            self::ensure($pdo);
            if ($tenant !== null) {
                $st = $pdo->prepare("SELECT id, tenant_id, actor, action, details_json, ip_address, created_at FROM security_audit_log WHERE tenant_id=? ORDER BY id DESC LIMIT " . (int)$limit);
                $st->execute([$tenant]);
            } else {
                $st = $pdo->query("SELECT id, tenant_id, actor, action, details_json, ip_address, created_at FROM security_audit_log ORDER BY id DESC LIMIT " . (int)$limit);
            }
            return $st->fetchAll(\PDO::FETCH_ASSOC) ?: [];
        } catch (\Throwable $e) { return []; }
    }

    /**
     * [현 차수 보강1] 회원 유형별 감사 조회(어드민 전용 호출 경로에서만 사용).
     *   type 화이트리스트 3값만 허용 — 그 외는 'all'(무필터)로 강제.
     *   demo      → tenant_id='demo' OR LIKE 'demo%'  (데모/체험 회원)
     *   subscriber→ tenant_id<>'demo' AND NOT LIKE 'demo%' (구독 회원)
     *   all       → 무필터(전테넌트). ★어드민 전테넌트 조회 경로(AdminGrowth)만 호출.
     *   반환 컬럼은 recent() 와 동일(details_json 포함).
     */
    public static function recentByType(\PDO $pdo, string $type = 'all', int $limit = 300): array
    {
        $type = in_array($type, ['demo', 'subscriber', 'all'], true) ? $type : 'all';
        try {
            self::ensure($pdo);
            $cols = "id, tenant_id, actor, action, details_json, ip_address, created_at";
            if ($type === 'demo') {
                $st = $pdo->prepare("SELECT $cols FROM security_audit_log WHERE tenant_id='demo' OR tenant_id LIKE 'demo%' ORDER BY id DESC LIMIT " . (int)$limit);
                $st->execute();
            } elseif ($type === 'subscriber') {
                $st = $pdo->prepare("SELECT $cols FROM security_audit_log WHERE tenant_id<>'demo' AND tenant_id NOT LIKE 'demo%' ORDER BY id DESC LIMIT " . (int)$limit);
                $st->execute();
            } else {
                $st = $pdo->query("SELECT $cols FROM security_audit_log ORDER BY id DESC LIMIT " . (int)$limit);
            }
            return $st->fetchAll(\PDO::FETCH_ASSOC) ?: [];
        } catch (\Throwable $e) { return []; }
    }

    /**
     * [현 차수 보강2] 유입(acquisition) 요약 — 분석/마케팅 자동화 참조용(어드민 전용 경로).
     *   최근 N일 로그인/가입 액션 기준 ① 데모 신규+활동 ② 구독 신규+활동 ③ 일자별 로그인 추세.
     *   ★신규(signup) vs 활동(login) 구분, 데모/구독 분리 집계. 읽기전용·집계만(PII 미저장).
     *   @return array{days,demo:{signup,login,tenants},subscriber:{signup,login,tenants},trend:array<{date,count}>}
     */
    public static function acquisitionSummary(\PDO $pdo, int $days = 30): array
    {
        $days = max(1, min(365, $days));
        $since = gmdate('Y-m-d H:i:s', time() - $days * 86400);
        $empty = ['signup' => 0, 'login' => 0, 'tenants' => 0];
        $out = ['days' => $days, 'demo' => $empty, 'subscriber' => $empty, 'trend' => []];
        try {
            self::ensure($pdo);
            $st = $pdo->prepare(
                "SELECT tenant_id, action, created_at FROM security_audit_log
                 WHERE action IN ('auth.login','auth.signup','user.signup') AND created_at >= ?
                 ORDER BY id DESC LIMIT 20000"
            );
            $st->execute([$since]);
            $rows = $st->fetchAll(\PDO::FETCH_ASSOC) ?: [];
            $demoT = []; $subT = []; $trend = [];
            foreach ($rows as $r) {
                $tid = (string)($r['tenant_id'] ?? '');
                $act = (string)($r['action'] ?? '');
                $isDemo = ($tid === 'demo' || strncmp($tid, 'demo', 4) === 0);
                $bucket = $isDemo ? 'demo' : 'subscriber';
                $isSignup = ($act === 'auth.signup' || $act === 'user.signup');
                $out[$bucket][$isSignup ? 'signup' : 'login']++;
                if ($isDemo) { $demoT[$tid] = 1; } else { $subT[$tid] = 1; }
                if ($act === 'auth.login') {
                    $d = substr((string)($r['created_at'] ?? ''), 0, 10);
                    if ($d !== '') { $trend[$d] = ($trend[$d] ?? 0) + 1; }
                }
            }
            $out['demo']['tenants'] = count($demoT);
            $out['subscriber']['tenants'] = count($subT);
            ksort($trend);
            foreach ($trend as $d => $c) { $out['trend'][] = ['date' => $d, 'count' => $c]; }
        } catch (\Throwable $e) { /* 집계 실패는 빈 요약 반환(비차단) */ }
        return $out;
    }
}
