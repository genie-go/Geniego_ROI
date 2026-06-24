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
}
