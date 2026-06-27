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
            self::bump($pdo, $tenant, $expKey, $variant, 'exposures');
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
            $variant = self::pickVariant($exp['variants'], $vid, $expKey); // 동일 해시로 역산(저장 불요)
            if ($variant === null) return self::json($res, ['ok' => false]);
            self::bump($pdo, $tenant, $expKey, $variant, 'conversions');
            return self::json($res, ['ok' => true, 'variant' => $variant]);
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
                    $lift = AttributionEngine::computeLift((float)$ctrl['conversions'], (float)$ctrl['exposures'], (float)$best['conversions'], (float)$best['exposures'], 0);
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
}
