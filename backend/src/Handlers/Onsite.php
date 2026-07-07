<?php
/**
 * Onsite — 온사이트 CRO 실험(랜딩/팝업/CTA A/B·개인화).
 *
 * [R-P3-8] AbTesting(광고 크리에이티브 ad-level A/B)·EventPopup(팝업 CRUD)은 있으나, 사이트 방문자 단위의
 *   온사이트 실험(변형 정의·결정론적 버킷팅·노출/전환 비콘·승자판정)이 부재했음 → 신설.
 *   - 결정론적 버킷팅: variant = hash(visitor_id|exp_key) → 가중치 누적 매핑. 같은 방문자=항상 같은 변형(sticky)·
 *     서버 무상태(per-visitor 저장 불요). 전환도 동일 해시로 변형 역산 → 정확 귀속.
 *   - 승자판정: 변형별 노출/전환 → CVR + 2-비율 z검정(AttributionEngine::computeLift 재사용, 중복 0).
 *   공개 비콘(assign/convert)은 세션 불요(자연 스코프). CRUD/결과는 인증.
 */

declare(strict_types=1);

namespace Genie\Handlers;

use Genie\Db;
use PDO;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;

final class Onsite
{
    private static function json(Response $res, array $data, int $status = 200): Response
    {
        $res->getBody()->write(json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
        return $res->withHeader('Content-Type', 'application/json')->withStatus($status);
    }

    private static function tenant(Request $req): string
    {
        $t = (string)($req->getAttribute('auth_tenant') ?? '');
        if ($t === '') { $t = UserAuth::authedTenant($req) ?? ''; }
        return $t;
    }

    /** 클라이언트 IP(프록시/nginx 뒤 X-Forwarded-For 첫 홉 우선). 레이트리밋 키. */
    private static function clientIp(Request $req): string
    {
        $xff = trim((string)($req->getHeaderLine('X-Forwarded-For')));
        if ($xff !== '') { $first = trim(explode(',', $xff)[0]); if ($first !== '') return substr($first, 0, 64); }
        $sp = $req->getServerParams();
        return substr((string)($sp['REMOTE_ADDR'] ?? ''), 0, 64);
    }

    /** IP×분 신규-배정 레이트리밋. 임계 초과 시 false(지표 부풀리기 차단) — fail-open(오류 시 허용). */
    private static function newVidRateOk(PDO $pdo, string $ip): bool
    {
        if ($ip === '') return true;
        $limit = (int)(getenv('ONSITE_NEWVID_PER_MIN') ?: 600); // 실 단일 방문자는 도달 불가·NAT 뒤 신규유입만 카운트.
        if ($limit <= 0) return true;
        $bucket = (int)floor(time() / 60);
        $isMy = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'mysql';
        try {
            $sql = $isMy
                ? "INSERT INTO onsite_rate(ip,bucket,hits) VALUES(?,?,1) ON DUPLICATE KEY UPDATE hits=hits+1"
                : "INSERT INTO onsite_rate(ip,bucket,hits) VALUES(?,?,1) ON CONFLICT(ip,bucket) DO UPDATE SET hits=hits+1";
            $pdo->prepare($sql)->execute([$ip, $bucket]);
            $st = $pdo->prepare("SELECT hits FROM onsite_rate WHERE ip=? AND bucket=?");
            $st->execute([$ip, $bucket]);
            $hits = (int)$st->fetchColumn();
            return $hits <= $limit;
        } catch (\Throwable $e) { return true; /* fail-open */ }
    }

    private static function ensure(PDO $pdo): void
    {
        $isMy = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'mysql';
        $AI = $isMy ? 'INT AUTO_INCREMENT PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT';
        try {
            $pdo->exec("CREATE TABLE IF NOT EXISTS onsite_experiment (
                id $AI, tenant_id VARCHAR(100), exp_key VARCHAR(80), name TEXT, goal TEXT,
                variants_json TEXT, status VARCHAR(20) DEFAULT 'running',
                created_at VARCHAR(32), updated_at VARCHAR(32)
            )");
            $pdo->exec("CREATE TABLE IF NOT EXISTS onsite_stat (
                tenant_id VARCHAR(100), exp_key VARCHAR(80), variant_key VARCHAR(80),
                exposures INT DEFAULT 0, conversions INT DEFAULT 0,
                PRIMARY KEY (tenant_id, exp_key, variant_key)
            )");
            // [246차 P2] 세그먼트 타겟팅 — 실험 오디언스 조건(기기/방문자/utm/국가). 없으면 전체.
            try { $pdo->exec("ALTER TABLE onsite_experiment ADD COLUMN audience_json TEXT"); } catch (\Throwable $e) { /* 이미 존재 */ }
            // [정밀감사] 방문자 배정 원장 — 공개 비콘 metric poisoning 방어 + 통계 정확도(고유 방문자 단위).
            //   노출/전환을 (tenant,exp,vid) 1회로 멱등 집계: 반복 assign 은 노출 미증가(sticky), convert 는
            //   "선행 노출 보유 + 미전환" 일 때만 1회 집계(전환 위조·승자 강제 차단). 변형은 원장에 고정 저장.
            $pdo->exec("CREATE TABLE IF NOT EXISTS onsite_assignment (
                tenant_id VARCHAR(100), exp_key VARCHAR(80), vid VARCHAR(120), variant_key VARCHAR(80),
                exposed_at VARCHAR(32), converted_at VARCHAR(32),
                PRIMARY KEY (tenant_id, exp_key, vid)
            )");
            // [정밀감사] IP 신규-배정 레이트리밋 버킷(분 단위) — 대량 vid 위조에 의한 지표 부풀리기 차단.
            //   반복 방문(기존 vid)은 원장 dedup 으로 무영향이라, 신규 배정 발생률만 IP×분 으로 바운드(fail-open).
            $pdo->exec("CREATE TABLE IF NOT EXISTS onsite_rate (
                ip VARCHAR(64), bucket INT, hits INT DEFAULT 0,
                PRIMARY KEY (ip, bucket)
            )");
            // [257차] 비주얼 에디터 단기 편집 토큰 — 머천트 라이브 사이트(크로스오리진)서 변형B 체인지셋 저장 인증.
            $pdo->exec("CREATE TABLE IF NOT EXISTS onsite_edit_token (
                token VARCHAR(80) PRIMARY KEY, tenant_id VARCHAR(100), exp_key VARCHAR(80),
                expires_at VARCHAR(32), created_at VARCHAR(32)
            )");
        } catch (\Throwable $e) { /* graceful */ }
    }

    /**
     * [246차 P2] 오디언스(세그먼트) 매칭 — 방문자 컨텍스트가 실험 타겟 조건에 부합하는지.
     *   audience: {device:all|mobile|desktop, visitor:all|new|returning, utm_source:substr, country:csv}.
     *   미설정/all 은 전체 허용(무회귀). Optimizely식 타겟 실험.
     */
    private static function audienceMatches(?array $aud, array $ctx): bool
    {
        if (!$aud) return true;
        $dev = strtolower((string)($aud['device'] ?? 'all'));
        if ($dev === 'mobile' || $dev === 'desktop') { if (strtolower((string)($ctx['dev'] ?? '')) !== $dev) return false; }
        $vis = strtolower((string)($aud['visitor'] ?? 'all'));
        if ($vis === 'new' || $vis === 'returning') { if (strtolower((string)($ctx['vis'] ?? '')) !== $vis) return false; }
        $src = trim((string)($aud['utm_source'] ?? ''));
        if ($src !== '' && stripos((string)($ctx['src'] ?? ''), $src) === false) return false;
        $country = trim((string)($aud['country'] ?? ''));
        if ($country !== '') {
            $allow = array_filter(array_map(fn($c) => strtoupper(trim($c)), explode(',', $country)));
            if ($allow && !in_array(strtoupper((string)($ctx['country'] ?? '')), $allow, true)) return false;
        }
        return true;
    }

    /** 변형 가중치 정규화 + 결정론적 버킷 선택. variants=[{key,weight}], vid+exp_key 해시. */
    private static function pickVariant(array $variants, string $vid, string $expKey): ?string
    {
        $vs = array_values(array_filter($variants, fn($v) => is_array($v) && ($v['key'] ?? '') !== ''));
        if (empty($vs)) return null;
        $total = 0.0; foreach ($vs as $v) { $total += max(0.0, (float)($v['weight'] ?? 1)); }
        if ($total <= 0) { $total = count($vs); foreach ($vs as &$v) { $v['weight'] = 1; } unset($v); }
        $h = hexdec(substr(md5($vid . '|' . $expKey), 0, 8)); // 0..2^32-1
        $point = ($h % 1000000) / 1000000.0 * $total;
        $cum = 0.0;
        foreach ($vs as $v) { $cum += max(0.0, (float)($v['weight'] ?? 1)); if ($point < $cum) return (string)$v['key']; }
        return (string)$vs[count($vs) - 1]['key'];
    }

    private static function loadExp(PDO $pdo, string $tenant, string $expKey): ?array
    {
        $st = $pdo->prepare("SELECT * FROM onsite_experiment WHERE tenant_id=? AND exp_key=? AND status='running' LIMIT 1");
        $st->execute([$tenant, $expKey]); $row = $st->fetch(PDO::FETCH_ASSOC);
        if (!$row) return null;
        $vs = json_decode((string)($row['variants_json'] ?? ''), true);
        $row['variants'] = is_array($vs) ? $vs : [];
        $aud = json_decode((string)($row['audience_json'] ?? ''), true);
        $row['audience'] = is_array($aud) ? $aud : null;
        return $row;
    }

    /** [공개] GET /v424/cro/assign?key=&vid=&tenant= — 방문자 변형 배정(sticky·결정론) + 노출 기록. */
    public static function assign(Request $req, Response $res): Response
    {
        $q = $req->getQueryParams();
        $expKey = substr((string)($q['key'] ?? ''), 0, 80);
        $vid = substr((string)($q['vid'] ?? ''), 0, 120);
        $tenant = substr((string)($q['tenant'] ?? ($req->getAttribute('auth_tenant') ?? '')), 0, 100);
        if ($expKey === '' || $vid === '' || $tenant === '') return self::json($res, ['ok' => false, 'variant' => null]);
        try {
            $pdo = Db::pdo(); self::ensure($pdo);
            $exp = self::loadExp($pdo, $tenant, $expKey);
            if (!$exp) return self::json($res, ['ok' => false, 'variant' => null, 'reason' => 'no_active_experiment']);
            // [246차 P2] 세그먼트 타겟팅 — 방문자 컨텍스트가 오디언스에 부합하지 않으면 미노출(원본 유지·노출 미집계).
            $ctx = ['dev' => (string)($q['dev'] ?? ''), 'vis' => (string)($q['vis'] ?? ''), 'src' => (string)($q['src'] ?? ''), 'country' => (string)($q['country'] ?? '')];
            if (!self::audienceMatches($exp['audience'] ?? null, $ctx)) {
                return self::json($res, ['ok' => true, 'variant' => null, 'reason' => 'not_in_audience']);
            }
            $variant = self::pickVariant($exp['variants'], $vid, $expKey);
            if ($variant === null) return self::json($res, ['ok' => false, 'variant' => null]);
            // [정밀감사] 노출은 (tenant,exp,vid) 1회만 집계(sticky). 신규 배정만 원장에 기록 → 신규일 때만,
            //   그리고 IP 레이트리밋 통과 시에만 onsite_stat.exposures 증가(반복방문·위조 vid 부풀리기 차단).
            //   변형 UX 는 항상 정상 제공(차단해도 방문자 경험 무손상).
            if (self::recordExposure($pdo, $tenant, $expKey, $vid, $variant, self::clientIp($req))) {
                self::bump($pdo, $tenant, $expKey, $variant, 'exposures');
            }
            $content = null; $changes = null;
            foreach ($exp['variants'] as $v) { if (($v['key'] ?? '') === $variant) { $content = $v['content'] ?? null; $changes = $v['changes'] ?? null; break; } }
            // [246차 P2] 노코드 변형 체인지셋(selector→text/html/css/hide/redirect) — 온사이트 스니펫이 적용.
            return self::json($res, ['ok' => true, 'variant' => $variant, 'content' => $content, 'changes' => $changes]);
        } catch (\Throwable $e) { return self::json($res, ['ok' => false, 'variant' => null]); }
    }

    /** [공개] POST /v424/cro/convert {key, vid, tenant} — 방문자 변형 역산 후 전환 기록. */
    public static function convert(Request $req, Response $res): Response
    {
        $b = (array)($req->getParsedBody() ?? []);
        $q = $req->getQueryParams();
        $expKey = substr((string)($b['key'] ?? $q['key'] ?? ''), 0, 80);
        $vid = substr((string)($b['vid'] ?? $q['vid'] ?? ''), 0, 120);
        $tenant = substr((string)($b['tenant'] ?? $q['tenant'] ?? ($req->getAttribute('auth_tenant') ?? '')), 0, 100);
        if ($expKey === '' || $vid === '' || $tenant === '') return self::json($res, ['ok' => false]);
        try {
            $pdo = Db::pdo(); self::ensure($pdo);
            $exp = self::loadExp($pdo, $tenant, $expKey);
            if (!$exp) return self::json($res, ['ok' => false]);
            // [정밀감사] 전환은 선행 노출(원장) 보유 + 미전환일 때만 1회 집계 — 위조 전환·승자 강제 차단.
            //   변형은 원장에 고정 저장된 값 사용(실험 중 가중치 변경에도 정확 귀속).
            $conv = self::recordConversion($pdo, $tenant, $expKey, $vid);
            if ($conv === null) return self::json($res, ['ok' => false, 'reason' => 'no_exposure']);
            if (!empty($conv['counted'])) self::bump($pdo, $tenant, $expKey, (string)$conv['variant'], 'conversions');
            return self::json($res, ['ok' => true, 'variant' => $conv['variant']]);
        } catch (\Throwable $e) { return self::json($res, ['ok' => false]); }
    }

    private static function bump(PDO $pdo, string $tenant, string $expKey, string $variant, string $col): void
    {
        $isMy = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'mysql';
        $sql = $isMy
            ? "INSERT INTO onsite_stat(tenant_id,exp_key,variant_key,$col) VALUES(?,?,?,1) ON DUPLICATE KEY UPDATE $col=$col+1"
            : "INSERT INTO onsite_stat(tenant_id,exp_key,variant_key,$col) VALUES(?,?,?,1) ON CONFLICT(tenant_id,exp_key,variant_key) DO UPDATE SET $col=$col+1";
        try { $pdo->prepare($sql)->execute([$tenant, $expKey, $variant]); } catch (\Throwable $e) { /* graceful */ }
    }

    /**
     * [정밀감사] 노출 원장 기록 — 신규 (tenant,exp,vid) 일 때만 true(노출 집계 대상).
     *   반복 방문(이미 배정)=false(sticky·재집계 안 함). 신규 배정 폭주(IP 레이트리밋 초과)=false(위조 차단).
     */
    private static function recordExposure(PDO $pdo, string $tenant, string $expKey, string $vid, string $variant, string $ip): bool
    {
        try {
            $st = $pdo->prepare("SELECT 1 FROM onsite_assignment WHERE tenant_id=? AND exp_key=? AND vid=? LIMIT 1");
            $st->execute([$tenant, $expKey, $vid]);
            if ($st->fetchColumn()) return false; // 이미 배정 → sticky
            if (!self::newVidRateOk($pdo, $ip)) return false; // 신규 배정 폭주(위조 의심) → 지표 미집계
            $now = gmdate('Y-m-d\\TH:i:s\\Z');
            $isMy = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'mysql';
            $sql = $isMy
                ? "INSERT IGNORE INTO onsite_assignment(tenant_id,exp_key,vid,variant_key,exposed_at) VALUES(?,?,?,?,?)"
                : "INSERT OR IGNORE INTO onsite_assignment(tenant_id,exp_key,vid,variant_key,exposed_at) VALUES(?,?,?,?,?)";
            $pdo->prepare($sql)->execute([$tenant, $expKey, $vid, $variant, $now]);
            return true;
        } catch (\Throwable $e) { return false; }
    }

    /**
     * [정밀감사] 전환 원장 기록. null=선행 노출 없음(전환 거부). counted=true 는 미전환→전환 1회 전이 시에만.
     *   변형은 노출 시 고정 저장된 값 반환(정확 귀속).
     */
    private static function recordConversion(PDO $pdo, string $tenant, string $expKey, string $vid): ?array
    {
        try {
            $st = $pdo->prepare("SELECT variant_key, converted_at FROM onsite_assignment WHERE tenant_id=? AND exp_key=? AND vid=? LIMIT 1");
            $st->execute([$tenant, $expKey, $vid]);
            $row = $st->fetch(PDO::FETCH_ASSOC);
            if (!$row) return null; // 선행 노출 없음 → 위조 전환 차단
            $variant = (string)($row['variant_key'] ?? '');
            if (!empty($row['converted_at'])) return ['variant' => $variant, 'counted' => false]; // 이미 전환(멱등)
            $now = gmdate('Y-m-d\\TH:i:s\\Z');
            $up = $pdo->prepare("UPDATE onsite_assignment SET converted_at=? WHERE tenant_id=? AND exp_key=? AND vid=? AND converted_at IS NULL");
            $up->execute([$now, $tenant, $expKey, $vid]);
            return ['variant' => $variant, 'counted' => $up->rowCount() > 0];
        } catch (\Throwable $e) { return null; }
    }

    /* ───────── 관리(인증) ───────── */

    public static function listExperiments(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        $t = self::tenant($req);
        try {
            $pdo = Db::pdo(); self::ensure($pdo);
            $st = $pdo->prepare("SELECT * FROM onsite_experiment WHERE tenant_id=? ORDER BY id DESC"); $st->execute([$t]);
            $rows = array_map(function ($r) {
                $vs = json_decode((string)($r['variants_json'] ?? ''), true); $r['variants'] = is_array($vs) ? $vs : []; unset($r['variants_json']);
                $aud = json_decode((string)($r['audience_json'] ?? ''), true); $r['audience'] = is_array($aud) ? $aud : null; unset($r['audience_json']);
                return $r;
            }, $st->fetchAll(PDO::FETCH_ASSOC) ?: []);
            return self::json($res, ['ok' => true, 'experiments' => $rows]);
        } catch (\Throwable $e) { return self::json($res, ['ok' => true, 'experiments' => []]); }
    }

    public static function createExperiment(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        $t = self::tenant($req); $b = (array)($req->getParsedBody() ?? []);
        $name = trim((string)($b['name'] ?? '')); if ($name === '') return self::json($res, ['ok' => false, 'error' => '실험명을 입력하세요.']);
        $expKey = preg_replace('/[^a-z0-9_-]/', '', strtolower((string)($b['exp_key'] ?? ''))) ?: ('exp_' . substr(md5($name . microtime()), 0, 8));
        $variants = is_array($b['variants'] ?? null) ? array_slice($b['variants'], 0, 6) : [['key' => 'A', 'label' => 'A', 'weight' => 50], ['key' => 'B', 'label' => 'B', 'weight' => 50]];
        $audience = is_array($b['audience'] ?? null) ? $b['audience'] : null;
        try {
            $pdo = Db::pdo(); self::ensure($pdo); $now = gmdate('c');
            $pdo->prepare("INSERT INTO onsite_experiment(tenant_id,exp_key,name,goal,variants_json,audience_json,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)")
                ->execute([$t, $expKey, substr($name, 0, 200), substr((string)($b['goal'] ?? ''), 0, 300), json_encode($variants, JSON_UNESCAPED_UNICODE), $audience ? json_encode($audience, JSON_UNESCAPED_UNICODE) : null, 'running', $now, $now]);
            return self::json($res, ['ok' => true, 'id' => (int)$pdo->lastInsertId(), 'exp_key' => $expKey]);
        } catch (\Throwable $e) { return self::json($res, ['ok' => false, 'error' => $e->getMessage()]); }
    }

    public static function updateExperiment(Request $req, Response $res, array $args): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        $t = self::tenant($req); $id = (int)($args['id'] ?? 0); $b = (array)($req->getParsedBody() ?? []);
        try {
            $pdo = Db::pdo(); self::ensure($pdo);
            $status = in_array(($b['status'] ?? ''), ['running', 'paused', 'concluded'], true) ? $b['status'] : null;
            if ($status !== null) $pdo->prepare("UPDATE onsite_experiment SET status=?, updated_at=? WHERE id=? AND tenant_id=?")->execute([$status, gmdate('c'), $id, $t]);
            if (is_array($b['variants'] ?? null)) $pdo->prepare("UPDATE onsite_experiment SET variants_json=?, updated_at=? WHERE id=? AND tenant_id=?")->execute([json_encode(array_slice($b['variants'], 0, 6), JSON_UNESCAPED_UNICODE), gmdate('c'), $id, $t]);
            if (array_key_exists('audience', $b)) $pdo->prepare("UPDATE onsite_experiment SET audience_json=?, updated_at=? WHERE id=? AND tenant_id=?")->execute([is_array($b['audience']) ? json_encode($b['audience'], JSON_UNESCAPED_UNICODE) : null, gmdate('c'), $id, $t]);
            return self::json($res, ['ok' => true]);
        } catch (\Throwable $e) { return self::json($res, ['ok' => false]); }
    }

    public static function deleteExperiment(Request $req, Response $res, array $args): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        $t = self::tenant($req); $id = (int)($args['id'] ?? 0);
        try {
            $pdo = Db::pdo(); self::ensure($pdo);
            $k = $pdo->prepare("SELECT exp_key FROM onsite_experiment WHERE id=? AND tenant_id=?"); $k->execute([$id, $t]); $ek = (string)$k->fetchColumn();
            $pdo->prepare("DELETE FROM onsite_experiment WHERE id=? AND tenant_id=?")->execute([$id, $t]);
            if ($ek !== '') $pdo->prepare("DELETE FROM onsite_stat WHERE tenant_id=? AND exp_key=?")->execute([$t, $ek]);
            return self::json($res, ['ok' => true, 'deleted_id' => $id]);
        } catch (\Throwable $e) { return self::json($res, ['ok' => false]); }
    }

    /** GET /v424/cro/experiments/{id}/results — 변형별 노출/전환/CVR + z검정 승자(computeLift 재사용). */
    public static function results(Request $req, Response $res, array $args): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        $t = self::tenant($req); $id = (int)($args['id'] ?? 0);
        try {
            $pdo = Db::pdo(); self::ensure($pdo);
            $e = $pdo->prepare("SELECT * FROM onsite_experiment WHERE id=? AND tenant_id=?"); $e->execute([$id, $t]); $exp = $e->fetch(PDO::FETCH_ASSOC);
            if (!$exp) return self::json($res, ['ok' => false, 'error' => '실험을 찾을 수 없습니다.']);
            $vs = json_decode((string)($exp['variants_json'] ?? ''), true) ?: [];
            $st = $pdo->prepare("SELECT variant_key, exposures, conversions FROM onsite_stat WHERE tenant_id=? AND exp_key=?");
            $st->execute([$t, (string)$exp['exp_key']]);
            $statMap = []; foreach ($st->fetchAll(PDO::FETCH_ASSOC) ?: [] as $r) { $statMap[(string)$r['variant_key']] = $r; }
            $variants = [];
            foreach ($vs as $v) {
                $k = (string)($v['key'] ?? ''); if ($k === '') continue;
                $exp_ = (int)($statMap[$k]['exposures'] ?? 0); $conv = (int)($statMap[$k]['conversions'] ?? 0);
                $variants[] = ['key' => $k, 'label' => (string)($v['label'] ?? $k), 'weight' => (float)($v['weight'] ?? 0),
                    'exposures' => $exp_, 'conversions' => $conv, 'cvr' => $exp_ > 0 ? round($conv / $exp_ * 100, 2) : 0.0];
            }
            // 승자: control=첫 변형, challenger=최고 CVR(노출>=control 충분) → 2-비율 z검정.
            $winner = null; $lift = null;
            if (count($variants) >= 2) {
                $ctrl = $variants[0];
                $best = $variants[0]; foreach ($variants as $v) { if ($v['cvr'] > $best['cvr']) $best = $v; }
                if ($best['key'] !== $ctrl['key'] && $ctrl['exposures'] > 0 && $best['exposures'] > 0) {
                    $lift = AttributionEngine::computeLift((float)$ctrl['conversions'], (float)$ctrl['exposures'], (float)$best['conversions'], (float)$best['exposures'], 0, \Genie\I18n::lang($req));
                    if (!empty($lift['significant'])) $winner = $best['key'];
                }
            }
            $totalExp = array_sum(array_column($variants, 'exposures'));
            return self::json($res, [
                'ok' => true, 'experiment' => ['id' => (int)$exp['id'], 'name' => (string)$exp['name'], 'exp_key' => (string)$exp['exp_key'], 'status' => (string)$exp['status'], 'goal' => (string)($exp['goal'] ?? '')],
                'variants' => $variants, 'total_exposures' => $totalExp,
                'winner' => $winner, 'lift' => $lift,
                'verdict' => $winner ? "변형 '{$winner}'가 통계적으로 유의한 승자입니다(95%)." : ($totalExp < 100 ? '표본이 더 필요합니다(노출 누적 중).' : '아직 유의한 차이가 없습니다 — 계속 수집하세요.'),
            ]);
        } catch (\Throwable $e) { return self::json($res, ['ok' => false, 'error' => $e->getMessage()]); }
    }

    /* ─── [257차] 비주얼 WYSIWYG 오버레이 에디터 ───
       크로스오리진(머천트 라이브 사이트)이라 앱 iframe 편집 불가 → 북마클릿이 GeniegoROI 서빙 에디터(cro-editor.js)를
       머천트 페이지에 주입 + 단기 edit-token 으로 변형B 체인지셋 저장. 노코드 폼(257)의 시각 편집판. */

    /** POST /v424/cro/experiments/{id}/edit-token — 비주얼 에디터 편집 토큰 발급(세션 인증). 북마클릿 반환. */
    public static function editToken(Request $req, Response $res, array $args): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        $t = self::tenant($req); if ($t === '') return self::json($res, ['ok' => false, 'error' => 'no_tenant'], 401);
        $id = (int)($args['id'] ?? 0);
        try {
            $pdo = Db::pdo(); self::ensure($pdo);
            $e = $pdo->prepare("SELECT exp_key FROM onsite_experiment WHERE id=? AND tenant_id=?"); $e->execute([$id, $t]);
            $exp = $e->fetch(PDO::FETCH_ASSOC);
            if (!$exp) return self::json($res, ['ok' => false, 'error' => '실험을 찾을 수 없습니다.']);
            $token = bin2hex(random_bytes(24)); $expKey = (string)$exp['exp_key'];
            $expAt = gmdate('Y-m-d\TH:i:s\Z', time() + 3600); // 1시간 유효
            $pdo->prepare("INSERT INTO onsite_edit_token(token,tenant_id,exp_key,expires_at,created_at) VALUES(?,?,?,?,?)")
                ->execute([$token, $t, $expKey, $expAt, gmdate('c')]);
            $host = (string)($req->getHeaderLine('Host') ?: ($req->getServerParams()['HTTP_HOST'] ?? 'www.genieroi.com'));
            $origin = 'https://' . $host;
            $editorUrl = $origin . '/cro-editor.js';
            $bookmarklet = "javascript:(function(){var s=document.createElement('script');s.src='" . $editorUrl . "?t=" . $token . "&exp=" . rawurlencode($expKey) . "&api=" . rawurlencode($origin) . "';s.setAttribute('data-genie-cro','1');document.body.appendChild(s);})();";
            return self::json($res, ['ok' => true, 'token' => $token, 'exp_key' => $expKey, 'expires_at' => $expAt, 'editor_url' => $editorUrl, 'bookmarklet' => $bookmarklet]);
        } catch (\Throwable $e) { return self::json($res, ['ok' => false, 'error' => $e->getMessage()]); }
    }

    /** POST /v424/cro/edit-save — 비주얼 에디터 저장(공개·edit-token 인증). body:{token, changes:[...]}. 변형B 체인지셋 갱신. */
    public static function editSave(Request $req, Response $res): Response
    {
        $b = (array)($req->getParsedBody() ?? []);
        $token = trim((string)($b['token'] ?? ''));
        $changes = is_array($b['changes'] ?? null) ? $b['changes'] : null;
        if ($token === '' || $changes === null) return self::json($res, ['ok' => false, 'error' => 'token_and_changes_required'], 400);
        try {
            $pdo = Db::pdo(); self::ensure($pdo);
            $q = $pdo->prepare("SELECT tenant_id,exp_key,expires_at FROM onsite_edit_token WHERE token=? LIMIT 1");
            $q->execute([$token]); $tk = $q->fetch(PDO::FETCH_ASSOC);
            if (!$tk) return self::json($res, ['ok' => false, 'error' => 'invalid_token'], 403);
            if (!empty($tk['expires_at']) && $tk['expires_at'] < gmdate('Y-m-d\TH:i:s\Z')) return self::json($res, ['ok' => false, 'error' => 'token_expired'], 403);
            $t = (string)$tk['tenant_id']; $expKey = (string)$tk['exp_key'];
            // 체인지셋 정제(화이트리스트 action·상한 100·길이캡). onsiteCro.applyChanges 스키마와 정합.
            // 260차 WYSIWYG 완전 패리티: attr/class/insert/img/remove 액션 추가(에디터·applier 3자 정합).
            $clean = [];
            foreach (array_slice($changes, 0, 100) as $c) {
                if (!is_array($c)) continue;
                $action = (string)($c['action'] ?? '');
                if (!in_array($action, ['text', 'html', 'css', 'hide', 'redirect', 'attr', 'class', 'insert', 'img', 'remove'], true)) continue;
                if ($action === 'redirect') { $v = trim((string)($c['value'] ?? '')); if ($v === '' || stripos($v, 'javascript:') === 0) continue; $clean[] = ['action' => 'redirect', 'value' => mb_substr($v, 0, 500)]; continue; }
                $sel = trim((string)($c['selector'] ?? '')); if ($sel === '') continue;
                $row = ['selector' => mb_substr($sel, 0, 300), 'action' => $action];
                if ($action === 'hide' || $action === 'remove') { $clean[] = $row; continue; }
                if ($action === 'css') { $prop = trim((string)($c['prop'] ?? '')); if ($prop === '') continue; $row['prop'] = mb_substr($prop, 0, 60); $row['value'] = mb_substr((string)($c['value'] ?? ''), 0, 300); }
                elseif ($action === 'attr') { $prop = trim((string)($c['prop'] ?? '')); if ($prop === '' || preg_match('/^on/i', $prop)) continue; $row['prop'] = mb_substr($prop, 0, 60); $v = (string)($c['value'] ?? ''); if (stripos($v, 'javascript:') !== false) continue; $row['value'] = mb_substr($v, 0, 500); }
                elseif ($action === 'class') { $mode = strtolower(trim((string)($c['prop'] ?? 'add'))); if (!in_array($mode, ['add', 'remove'], true)) continue; $cls = trim((string)($c['value'] ?? '')); if ($cls === '') continue; $row['prop'] = $mode; $row['value'] = mb_substr(preg_replace('/[^a-zA-Z0-9_\- ]/', '', $cls), 0, 100); }
                elseif ($action === 'insert') { $pos = strtolower(trim((string)($c['prop'] ?? 'after'))); if (!in_array($pos, ['before', 'after', 'prepend', 'append'], true)) continue; $row['prop'] = $pos; $row['value'] = mb_substr((string)($c['value'] ?? ''), 0, 2000); }
                elseif ($action === 'img') { $v = trim((string)($c['value'] ?? '')); if ($v === '' || stripos($v, 'javascript:') === 0) continue; $row['value'] = mb_substr($v, 0, 500); }
                else { $row['value'] = mb_substr((string)($c['value'] ?? ''), 0, 5000); } // text/html
                $clean[] = $row;
            }
            $e = $pdo->prepare("SELECT id,variants_json FROM onsite_experiment WHERE tenant_id=? AND exp_key=? LIMIT 1");
            $e->execute([$t, $expKey]); $exp = $e->fetch(PDO::FETCH_ASSOC);
            if (!$exp) return self::json($res, ['ok' => false, 'error' => 'experiment_not_found'], 404);
            $vs = json_decode((string)($exp['variants_json'] ?? ''), true); if (!is_array($vs)) $vs = [];
            $bi = null; foreach ($vs as $i => $v) { if (strtoupper((string)($v['key'] ?? '')) === 'B') { $bi = $i; break; } }
            if ($bi === null && count($vs) >= 2) $bi = 1;
            if ($bi === null) { $vs[] = ['key' => 'B', 'label' => '변형(B)', 'weight' => 50]; $bi = count($vs) - 1; }
            $vs[$bi]['changes'] = $clean;
            $pdo->prepare("UPDATE onsite_experiment SET variants_json=?, updated_at=? WHERE id=? AND tenant_id=?")
                ->execute([json_encode($vs, JSON_UNESCAPED_UNICODE), gmdate('c'), (int)$exp['id'], $t]);
            return self::json($res, ['ok' => true, 'saved' => count($clean), 'exp_key' => $expKey]);
        } catch (\Throwable $e) { return self::json($res, ['ok' => false, 'error' => $e->getMessage()], 500); }
    }
}
