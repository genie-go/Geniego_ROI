<?php
declare(strict_types=1);

namespace Genie\Handlers;

use Genie\Db;
use Genie\TemplateResponder;
use PDO;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

/**
 * v419 Semi-Attribution Handler
 * Supports UTM / Coupon / Deeplink based attribution with confidence scoring.
 *
 * Confidence Score Rules (capped at 1.0):
 *   UTM source+medium+campaign fully matched  → +0.60
 *   UTM content or term present               → +0.10
 *   Coupon code matched to registered coupon  → +0.20
 *   Deeplink matched to registered template   → +0.15
 *   Each touch point within 7-day window      → +0.05 (max 3 touches)
 */
final class Attribution {

    private static function tenantId(Request $request): string {
        // [현 차수] 회귀 하드닝: 미들웨어가 주입한 auth_tenant 속성을 우선 신뢰(api_key 의 tenant_id, 위조불가).
        //   현재는 api_key 미들웨어의 X-Tenant-Id 강제덮어쓰기(188차)로 헤더도 안전하나, 향후 이 라우트가
        //   bypass 목록에 추가되면 raw 헤더는 위조 가능해진다 → auth_tenant 우선으로 크로스테넌트 위조 차단.
        $attr = (string)($request->getAttribute('auth_tenant') ?? '');
        if ($attr !== '') return $attr;
        // 은행급 fail-closed: raw X-Tenant-Id(위조가능)는 적재 테넌트로 신뢰하지 않는다. 세션 자가인증 폴백→미해결은 demo 격리.
        $t = UserAuth::authedTenant($request);
        return ($t !== null && $t !== '') ? $t : 'demo';
    }

    // ── Coupons ────────────────────────────────────────────────────────────

    public static function createCoupon(Request $request, Response $response, array $args): Response {
        $pdo    = Db::pdo();
        $tenant = self::tenantId($request);
        $body   = (array)($request->getParsedBody() ?? []);

        $code    = trim((string)($body['code'] ?? ''));
        $channel = trim((string)($body['channel'] ?? ''));
        if ($code === '' || $channel === '') {
            return TemplateResponder::respond($response->withStatus(422), ['error' => 'code and channel required']);
        }

        // 209차 P1: 기존 `ON CONFLICT(tenant_id,code)`는 MySQL 에서 1064 구문오류 → /v419 쿠폰 생성 500.
        //   게다가 attribution_coupon 에는 (tenant_id,code) UNIQUE 제약이 없어 SQLite·MySQL 모두 upsert 불가
        //   → SELECT-then-upsert(207차 정본 패턴, UNIQUE 부재 시).
        $existing = $pdo->prepare('SELECT id FROM attribution_coupon WHERE tenant_id=? AND code=? LIMIT 1');
        $existing->execute([$tenant, $code]);
        $row = $existing->fetch(PDO::FETCH_ASSOC);
        if ($row) {
            $pdo->prepare('UPDATE attribution_coupon SET channel=?, campaign=?, discount_type=?, note=? WHERE id=?')
                ->execute([$channel, $body['campaign'] ?? null, $body['discount_type'] ?? null, $body['note'] ?? null, $row['id']]);
        } else {
            $pdo->prepare('INSERT INTO attribution_coupon(tenant_id,code,channel,campaign,discount_type,note,created_at) VALUES(?,?,?,?,?,?,?)')
                ->execute([$tenant, $code, $channel, $body['campaign'] ?? null, $body['discount_type'] ?? null, $body['note'] ?? null, gmdate('c')]);
        }
        return TemplateResponder::respond($response, ['ok' => true, 'code' => $code, 'channel' => $channel]);
    }

    public static function listCoupons(Request $request, Response $response, array $args): Response {
        $pdo    = Db::pdo();
        $tenant = self::tenantId($request);
        $stmt   = $pdo->prepare('SELECT * FROM attribution_coupon WHERE tenant_id=? ORDER BY created_at DESC LIMIT 200');
        $stmt->execute([$tenant]);
        return TemplateResponder::respond($response, ['ok' => true, 'coupons' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
    }

    // ── Deeplinks ─────────────────────────────────────────────────────────

    public static function createDeeplink(Request $request, Response $response, array $args): Response {
        $pdo    = Db::pdo();
        $tenant = self::tenantId($request);
        $body   = (array)($request->getParsedBody() ?? []);

        $template = trim((string)($body['template'] ?? ''));
        $channel  = trim((string)($body['channel'] ?? ''));
        if ($template === '' || $channel === '') {
            return TemplateResponder::respond($response->withStatus(422), ['error' => 'template and channel required']);
        }

        // 209차 P1: ON CONFLICT(tenant_id,template) MySQL 1064 + UNIQUE 제약 부재 → SELECT-then-upsert.
        $existing = $pdo->prepare('SELECT id FROM attribution_deeplink WHERE tenant_id=? AND template=? LIMIT 1');
        $existing->execute([$tenant, $template]);
        $row = $existing->fetch(PDO::FETCH_ASSOC);
        if ($row) {
            $pdo->prepare('UPDATE attribution_deeplink SET channel=?, campaign=?, note=? WHERE id=?')
                ->execute([$channel, $body['campaign'] ?? null, $body['note'] ?? null, $row['id']]);
        } else {
            $pdo->prepare('INSERT INTO attribution_deeplink(tenant_id,template,channel,campaign,note,created_at) VALUES(?,?,?,?,?,?)')
                ->execute([$tenant, $template, $channel, $body['campaign'] ?? null, $body['note'] ?? null, gmdate('c')]);
        }
        return TemplateResponder::respond($response, ['ok' => true, 'template' => $template, 'channel' => $channel]);
    }

    public static function listDeeplinks(Request $request, Response $response, array $args): Response {
        $pdo    = Db::pdo();
        $tenant = self::tenantId($request);
        $stmt   = $pdo->prepare('SELECT * FROM attribution_deeplink WHERE tenant_id=? ORDER BY created_at DESC LIMIT 200');
        $stmt->execute([$tenant]);
        return TemplateResponder::respond($response, ['ok' => true, 'deeplinks' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
    }

    // ── [240차] 오운드채널 어트리뷰션 귀속 (이메일/카카오/SMS/저니) ───────────────────
    //   약점지적 ②: 오운드채널 발송이 attribution_touch 미기록 → 캠페인 매출이 멀티터치 모델에서 무크레딧이던 갭.
    //   설계: 발송 시 고객 email/phone 해시 기반 의사세션('own:<hash>')으로 터치 적재(order_id NULL=사전터치).
    //   주문 ingest 시 동일 고객 해시로 미귀속 터치에 order_id 백필 → markov/linear 등이 자동 크레딧.
    //   ★PII 미저장(SHA-256 해시만). 식별 불가/무전환 터치는 markov NULL 상태로 자연 처리(잡음 0). 경쟁사 Klaviyo/Braze 정합.

    /** 고객 식별 해시(원문 PII 미저장). email 우선, 없으면 phone. 식별 불가 시 null. */
    public static function identityHash(?string $email, ?string $phone): ?string {
        $e = is_string($email) ? trim(strtolower($email)) : '';
        $p = is_string($phone) ? preg_replace('/[^0-9]/', '', $phone) : '';
        if ($e !== '' && strpos($e, '@') !== false) return 'e' . substr(hash('sha256', $e), 0, 32);
        if (strlen((string)$p) >= 9)                return 'p' . substr(hash('sha256', $p), 0, 32);
        return null;
    }

    // ── [어트리뷰션 보강] 쿠키리스 결정론적 ID-resolution(cross-device 식별 그래프) ───────────────
    //   브라우저 세션 ↔ 해시 식별자(email/phone) 결정론 링크. 사용자가 식별되는 순간(로그인/뉴스레터/체크아웃)
    //   pixel/touch 가 보낸 email 로 그 세션을 identity 에 연결 → 주문(같은 email) 발생 시 own:<hash> + 링크된
    //   전 세션(모바일·데스크톱)의 미귀속 터치에 일괄 order_id 백필 = 기기 간 여정 스티칭. ★PII 미저장(해시만).

    private static function ensureIdentityTable(\PDO $pdo): void {
        static $done = false; if ($done) return; $done = true;
        $isMy = $pdo->getAttribute(\PDO::ATTR_DRIVER_NAME) === 'mysql';
        try {
            if ($isMy) {
                $pdo->exec("CREATE TABLE IF NOT EXISTS attribution_identity_link (
                    tenant_id VARCHAR(100) NOT NULL, identity_hash VARCHAR(40) NOT NULL, session_id VARCHAR(190) NOT NULL,
                    first_seen VARCHAR(32), last_seen VARCHAR(32),
                    UNIQUE KEY uq_idlink (tenant_id, identity_hash, session_id),
                    KEY idx_idlink_id (tenant_id, identity_hash)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
            } else {
                $pdo->exec("CREATE TABLE IF NOT EXISTS attribution_identity_link (
                    tenant_id TEXT NOT NULL, identity_hash TEXT NOT NULL, session_id TEXT NOT NULL, first_seen TEXT, last_seen TEXT)");
                try { $pdo->exec("CREATE UNIQUE INDEX IF NOT EXISTS uq_idlink ON attribution_identity_link(tenant_id,identity_hash,session_id)"); } catch (\Throwable $e) {}
            }
            // [254차 초고도화] 확률적 cross-device — confidence(결정론=1.0·확률=0.5) + 디바이스 시그니처(ip+ua 해시, PII미저장).
            try { $pdo->exec("ALTER TABLE attribution_identity_link ADD COLUMN confidence " . ($isMy ? "DOUBLE" : "REAL") . " DEFAULT 1.0"); } catch (\Throwable $e) {}
            if ($isMy) {
                try { $pdo->exec("CREATE TABLE IF NOT EXISTS attribution_device_sig (tenant_id VARCHAR(100) NOT NULL, sig_hash VARCHAR(64) NOT NULL, session_id VARCHAR(190) NOT NULL, seen_at VARCHAR(32), UNIQUE KEY uq_devsig (tenant_id, sig_hash, session_id), KEY idx_devsig (tenant_id, sig_hash)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"); } catch (\Throwable $e) {}
            } else {
                try { $pdo->exec("CREATE TABLE IF NOT EXISTS attribution_device_sig (tenant_id TEXT NOT NULL, sig_hash TEXT NOT NULL, session_id TEXT NOT NULL, seen_at TEXT)"); } catch (\Throwable $e) {}
                try { $pdo->exec("CREATE UNIQUE INDEX IF NOT EXISTS uq_devsig ON attribution_device_sig(tenant_id,sig_hash,session_id)"); } catch (\Throwable $e) {}
            }
        } catch (\Throwable $e) {}
    }

    /** 세션 ↔ 식별자 결정론 링크 upsert. own:/빈 세션은 스킵(자기참조 무의미). */
    public static function linkIdentity(\PDO $pdo, string $tenant, ?string $idHash, ?string $sessionId): bool {
        if ($idHash === null || $idHash === '' || $sessionId === null || $sessionId === '' || strncmp($sessionId, 'own:', 4) === 0) return false;
        self::ensureIdentityTable($pdo);
        $now = gmdate('Y-m-d H:i:s'); $isMy = $pdo->getAttribute(\PDO::ATTR_DRIVER_NAME) === 'mysql';
        try {
            $sql = $isMy
                ? "INSERT INTO attribution_identity_link(tenant_id,identity_hash,session_id,first_seen,last_seen) VALUES(?,?,?,?,?) ON DUPLICATE KEY UPDATE last_seen=VALUES(last_seen)"
                : "INSERT INTO attribution_identity_link(tenant_id,identity_hash,session_id,first_seen,last_seen) VALUES(?,?,?,?,?) ON CONFLICT(tenant_id,identity_hash,session_id) DO UPDATE SET last_seen=excluded.last_seen";
            $pdo->prepare($sql)->execute([$tenant, $idHash, $sessionId, $now, $now]);
            return true;
        } catch (\Throwable $e) { return false; }
    }

    /** 식별자에 연결된 전 세션(cross-device) + own:<hash> 의사세션.
     *   [254차] $includeProb=false(기본)=결정론(confidence>=1.0)만 → 회귀0. true=확률링크(0.5+) 포함(opt-in). */
    public static function sessionsForIdentity(\PDO $pdo, string $tenant, string $idHash, bool $includeProb = false): array {
        $out = ['own:' . $idHash];
        try {
            self::ensureIdentityTable($pdo);
            $minConf = $includeProb ? 0.4 : 0.999;
            $st = $pdo->prepare("SELECT session_id FROM attribution_identity_link WHERE tenant_id=? AND identity_hash=? AND COALESCE(confidence,1.0) >= ?");
            $st->execute([$tenant, $idHash, $minConf]);
            foreach ($st->fetchAll(\PDO::FETCH_COLUMN) as $s) { $s = (string)$s; if ($s !== '') $out[] = $s; }
        } catch (\Throwable $e) {}
        return array_values(array_unique($out));
    }

    /** [254차 초고도화] 확률적 링크 upsert(confidence 0.5). 이미 결정론(1.0) 링크면 다운그레이드 안 함. */
    public static function linkProbabilistic(\PDO $pdo, string $tenant, string $idHash, string $sessionId, float $conf = 0.5): bool {
        if ($idHash === '' || $sessionId === '' || strncmp($sessionId, 'own:', 4) === 0) return false;
        self::ensureIdentityTable($pdo);
        $now = gmdate('Y-m-d H:i:s'); $isMy = $pdo->getAttribute(\PDO::ATTR_DRIVER_NAME) === 'mysql';
        try {
            $sql = $isMy
                ? "INSERT INTO attribution_identity_link(tenant_id,identity_hash,session_id,first_seen,last_seen,confidence) VALUES(?,?,?,?,?,?) ON DUPLICATE KEY UPDATE last_seen=VALUES(last_seen)"
                : "INSERT INTO attribution_identity_link(tenant_id,identity_hash,session_id,first_seen,last_seen,confidence) VALUES(?,?,?,?,?,?) ON CONFLICT(tenant_id,identity_hash,session_id) DO UPDATE SET last_seen=excluded.last_seen";
            $pdo->prepare($sql)->execute([$tenant, $idHash, $sessionId, $now, $now, $conf]);
            return true;
        } catch (\Throwable $e) { return false; }
    }

    /** [254차 초고도화] 디바이스 시그니처 기록 + 확률적 스티칭. ip+ua 해시 동일 + window 내 known-identity 세션과 매칭 시
     *   익명세션을 그 식별자에 확률링크(confidence 0.5). 고특이도(ip AND ua)·PII미저장(해시만)·best-effort. */
    public static function recordDeviceSigAndStitch(\PDO $pdo, string $tenant, string $sessionId, string $ip, string $ua): void {
        if ($sessionId === '' || strncmp($sessionId, 'own:', 4) === 0) return;
        $ip = trim($ip); $ua = trim($ua);
        if ($ip === '' || $ua === '') return;
        try {
            self::ensureIdentityTable($pdo);
            $sig = hash('sha256', $tenant . '|' . $ip . '|' . substr($ua, 0, 200));
            $now = gmdate('Y-m-d H:i:s'); $isMy = $pdo->getAttribute(\PDO::ATTR_DRIVER_NAME) === 'mysql';
            $sql = $isMy
                ? "INSERT INTO attribution_device_sig(tenant_id,sig_hash,session_id,seen_at) VALUES(?,?,?,?) ON DUPLICATE KEY UPDATE seen_at=VALUES(seen_at)"
                : "INSERT INTO attribution_device_sig(tenant_id,sig_hash,session_id,seen_at) VALUES(?,?,?,?) ON CONFLICT(tenant_id,sig_hash,session_id) DO UPDATE SET seen_at=excluded.seen_at";
            $pdo->prepare($sql)->execute([$tenant, $sig, $sessionId, $now]);
            // 이 세션이 이미 결정론 식별자에 링크돼 있으면 스티칭 불요.
            $chk = $pdo->prepare("SELECT 1 FROM attribution_identity_link WHERE tenant_id=? AND session_id=? AND COALESCE(confidence,1.0) >= 0.999 LIMIT 1");
            $chk->execute([$tenant, $sessionId]); if ($chk->fetchColumn()) return;
            // 같은 시그니처의 다른 세션 중 known-identity(결정론)를 14일 내에서 찾아 확률링크.
            $since = gmdate('Y-m-d H:i:s', time() - 14 * 86400);
            $q = $pdo->prepare("SELECT DISTINCT l.identity_hash FROM attribution_device_sig d
                JOIN attribution_identity_link l ON l.tenant_id=d.tenant_id AND l.session_id=d.session_id AND COALESCE(l.confidence,1.0) >= 0.999
                WHERE d.tenant_id=? AND d.sig_hash=? AND d.session_id<>? AND d.seen_at >= ? LIMIT 3");
            $q->execute([$tenant, $sig, $sessionId, $since]);
            foreach ($q->fetchAll(\PDO::FETCH_COLUMN) as $idH) { if ((string)$idH !== '') self::linkProbabilistic($pdo, $tenant, (string)$idH, $sessionId, 0.5); }
        } catch (\Throwable $e) {}
    }

    /** GET/POST /v424/attribution/probabilistic — 확률적 cross-device 스티칭 opt-in 설정 + 커버리지. */
    public static function probabilistic(Request $req, Response $res): Response {
        $t = self::tenantId($req); $pdo = Db::pdo(); self::ensureIdentityTable($pdo);
        $key = 'attribution_prob_stitch@' . $t;
        if (in_array(strtoupper($req->getMethod()), ['POST', 'PUT'], true)) {
            $b = (array)($req->getParsedBody() ?? []); if (empty($b)) { $d = json_decode((string)$req->getBody(), true); if (is_array($d)) $b = $d; }
            $en = !empty($b['enabled']) ? '1' : '0';
            try {
                $isMy = $pdo->getAttribute(\PDO::ATTR_DRIVER_NAME) === 'mysql';
                $sql = $isMy ? "INSERT INTO app_setting(skey,svalue,updated_at) VALUES(?,?,?) ON DUPLICATE KEY UPDATE svalue=VALUES(svalue),updated_at=VALUES(updated_at)" : "INSERT INTO app_setting(skey,svalue,updated_at) VALUES(?,?,?) ON CONFLICT(skey) DO UPDATE SET svalue=excluded.svalue,updated_at=excluded.updated_at";
                $pdo->prepare($sql)->execute([$key, $en, gmdate('c')]);
            } catch (\Throwable $e) {}
            return TemplateResponder::respond($res, ['ok' => true, 'enabled' => $en === '1']);
        }
        $en = false; $links = 0; $ids = 0;
        try { $g = $pdo->prepare("SELECT svalue FROM app_setting WHERE skey=? LIMIT 1"); $g->execute([$key]); $en = ((string)($g->fetchColumn() ?: '0')) === '1'; } catch (\Throwable $e) {}
        try { $st = $pdo->prepare("SELECT COUNT(*) c, COUNT(DISTINCT identity_hash) i FROM attribution_identity_link WHERE tenant_id=? AND COALESCE(confidence,1.0) < 0.999"); $st->execute([$t]); $r = $st->fetch(\PDO::FETCH_ASSOC) ?: []; $links = (int)($r['c'] ?? 0); $ids = (int)($r['i'] ?? 0); } catch (\Throwable $e) {}
        return TemplateResponder::respond($res, ['ok' => true, 'enabled' => $en, 'probabilistic_links' => $links, 'probabilistic_identities' => $ids,
            'note' => '확률적 cross-device 스티칭(ip+ua 디바이스 시그니처·14일·confidence 0.5·PII미저장). 활성화 시 익명 기기 여정도 동일인으로 어트리뷰션 크레딧.']);
    }

    /** GET /v424/attribution/identity-coverage — cross-device 식별 그래프 커버리지(결정론 ID-resolution). */
    public static function identityCoverage(Request $req, Response $res): Response {
        // [286차] marketing_advanced=growth 서버 강제 — 데모 면제, 운영 실테넌트만.
        if (\Genie\Db::env() !== 'demo') { $_pg = \Genie\Handlers\UserAuth::requirePlan($req, $res, 'growth'); if ($_pg) return $_pg; }
        $pdo = Db::pdo(); $tenant = self::tenantId($req);
        $out = ['ok' => true, 'identities' => 0, 'linked_sessions' => 0, 'cross_device_identities' => 0, 'max_devices_per_identity' => 0,
            'note' => '결정론적(해시 기반·PII 미저장) cross-device 식별 그래프. 모바일↔데스크톱 여정을 동일인으로 스티칭해 어트리뷰션 여정 완전성을 높입니다.'];
        try {
            self::ensureIdentityTable($pdo);
            $st = $pdo->prepare("SELECT identity_hash, COUNT(*) c FROM attribution_identity_link WHERE tenant_id=? GROUP BY identity_hash");
            $st->execute([$tenant]); $rows = $st->fetchAll(\PDO::FETCH_ASSOC) ?: [];
            $out['identities'] = count($rows);
            foreach ($rows as $r) { $c = (int)$r['c']; $out['linked_sessions'] += $c; if ($c > 1) $out['cross_device_identities']++; if ($c > $out['max_devices_per_identity']) $out['max_devices_per_identity'] = $c; }
        } catch (\Throwable $e) {}
        $res->getBody()->write(json_encode($out, JSON_UNESCAPED_UNICODE));
        return $res->withHeader('Content-Type', 'application/json');
    }

    /** 오운드채널 발송 터치 1행 적재. 발송 실패에 영향 없도록 예외 무해 처리. */
    public static function recordOwnedTouch(\PDO $pdo, string $tenant, string $channel, ?string $email, ?string $phone, string $campaign = '', array $extra = []): bool {
        $id = self::identityHash($email, $phone);
        if ($id === null) return false;                       // 식별 불가 → 잡음 차단(스킵)
        $sess = 'own:' . $id;
        $now  = gmdate('Y-m-d H:i:s');
        $ex   = json_encode(array_merge(['source' => 'owned', 'ch' => $channel], $extra), JSON_UNESCAPED_UNICODE);
        try {
            $pdo->prepare(
                'INSERT INTO attribution_touch
                 (tenant_id,session_id,order_id,channel,utm_source,utm_medium,utm_campaign,touched_at,extra_json)
                 VALUES(?,?,?,?,?,?,?,?,?)'
            )->execute([$tenant, $sess, null, $channel, $channel, 'owned', $campaign, $now, $ex]);
            return true;
        } catch (\Throwable $e) { return false; }
    }

    /** 주문 ingest 시 동일 고객 해시의 미귀속 터치에 order_id 백필. [보강] own:<hash> 뿐 아니라 식별그래프에
     *   링크된 전 세션(cross-device)을 일괄 스티칭 → markov/linear 등이 기기 간 여정을 동일인으로 크레딧. */
    public static function backfillOwnedTouches(\PDO $pdo, string $tenant, string $orderId, ?string $email, ?string $phone, string $orderAt = '', int $windowDays = 30): int {
        $id = self::identityHash($email, $phone);
        if ($id === null || $orderId === '') return 0;
        $ts = $orderAt !== '' ? strtotime($orderAt) : time();
        if ($ts === false) $ts = time();
        $cutoff = gmdate('Y-m-d H:i:s', $ts - max(1, $windowDays) * 86400);
        // [254차 초고도화] 확률적 cross-device 포함 여부 — app_setting attribution_probabilistic_stitch(테넌트 격리·기본 off=회귀0).
        $incProb = false;
        try { $g = $pdo->prepare("SELECT svalue FROM app_setting WHERE skey=? LIMIT 1"); $g->execute(['attribution_prob_stitch@' . $tenant]); $incProb = ((string)($g->fetchColumn() ?: '0')) === '1'; } catch (\Throwable $e) {}
        $sessions = self::sessionsForIdentity($pdo, $tenant, $id, $incProb); // own:<hash> + 결정론(+opt-in 시 확률) cross-device 세션
        $total = 0;
        try {
            $up = $pdo->prepare(
                "UPDATE attribution_touch SET order_id=?
                 WHERE tenant_id=? AND session_id=? AND (order_id IS NULL OR order_id='') AND touched_at >= ?"
            );
            foreach ($sessions as $sess) { $up->execute([$orderId, $tenant, $sess, $cutoff]); $total += $up->rowCount(); }
        } catch (\Throwable $e) {}
        return $total;
    }

    // ── Touch Points ──────────────────────────────────────────────────────

    public static function recordTouch(Request $request, Response $response, array $args): Response {
        $pdo    = Db::pdo();
        $tenant = self::tenantId($request);
        $body   = (array)($request->getParsedBody() ?? []);

        $extra = $body;
        foreach (['session_id','order_id','channel','utm_source','utm_medium','utm_campaign','utm_content','utm_term','coupon_code','deeplink','touched_at'] as $k) {
            unset($extra[$k]);
        }

        $stmt = $pdo->prepare(
            'INSERT INTO attribution_touch
             (tenant_id,session_id,order_id,channel,utm_source,utm_medium,utm_campaign,
              utm_content,utm_term,coupon_code,deeplink,touched_at,extra_json)
             VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)'
        );
        $stmt->execute([
            $tenant,
            $body['session_id'] ?? null,
            $body['order_id']   ?? null,
            $body['channel']    ?? null,
            $body['utm_source'] ?? null,
            $body['utm_medium'] ?? null,
            $body['utm_campaign'] ?? null,
            $body['utm_content'] ?? null,
            $body['utm_term']   ?? null,
            $body['coupon_code'] ?? null,
            $body['deeplink']   ?? null,
            $body['touched_at'] ?? gmdate('c'),
            json_encode($extra, JSON_UNESCAPED_UNICODE),
        ]);
        // [어트리뷰션 ID-resolution] 식별 가능한 터치(email/phone)면 세션 ↔ 식별자 결정론 링크(cross-device 스티칭 기반).
        try {
            $idH = self::identityHash($body['email'] ?? $body['customer_email'] ?? null, $body['phone'] ?? $body['customer_phone'] ?? null);
            if ($idH !== null && !empty($body['session_id'])) self::linkIdentity($pdo, $tenant, $idH, (string)$body['session_id']);
            // [254차 초고도화] 확률적 cross-device — 디바이스 시그니처(ip+ua 해시) 기록 + 익명세션 고특이도 스티칭(PII미저장).
            if (!empty($body['session_id'])) {
                $srv = $request->getServerParams();
                $ip = (string)($request->getHeaderLine('X-Forwarded-For') ?: ($srv['REMOTE_ADDR'] ?? ''));
                if (strpos($ip, ',') !== false) $ip = trim(explode(',', $ip)[0]);
                $ua = (string)$request->getHeaderLine('User-Agent');
                self::recordDeviceSigAndStitch($pdo, $tenant, (string)$body['session_id'], $ip, $ua);
            }
        } catch (\Throwable $e) { /* 링크 실패는 터치 적재에 무영향 */ }
        return TemplateResponder::respond($response, ['ok' => true, 'touch_id' => (int)$pdo->lastInsertId()]);
    }

    // ── Scoring ───────────────────────────────────────────────────────────

    /**
     * POST /v419/attribution/score
     * Body: { order_id, utm_source?, utm_medium?, utm_campaign?, utm_content?, utm_term?,
     *         coupon_code?, deeplink? }
     * Returns confidence score 0–1 + evidence breakdown.
     */
    public static function score(Request $request, Response $response, array $args): Response {
        $pdo    = Db::pdo();
        $tenant = self::tenantId($request);
        $body   = (array)($request->getParsedBody() ?? []);

        $orderId  = trim((string)($body['order_id'] ?? ''));
        if ($orderId === '') {
            return TemplateResponder::respond($response->withStatus(422), ['error' => 'order_id required']);
        }

        $utmSrc  = trim((string)($body['utm_source']   ?? ''));
        $utmMed  = trim((string)($body['utm_medium']   ?? ''));
        $utmCamp = trim((string)($body['utm_campaign'] ?? ''));
        $utmCont = trim((string)($body['utm_content']  ?? ''));
        $utmTerm = trim((string)($body['utm_term']     ?? ''));
        $coupon  = strtoupper(trim((string)($body['coupon_code'] ?? '')));
        $deeplink = trim((string)($body['deeplink'] ?? ''));

        $score    = 0.0;
        $evidence = [];
        $attributedChannel = null;

        // 1. UTM full match
        if ($utmSrc !== '' && $utmMed !== '' && $utmCamp !== '') {
            $score += 0.60;
            $evidence['utm_full'] = [
                'matched' => true,
                'score_contribution' => 0.60,
                'details' => "utm_source={$utmSrc} utm_medium={$utmMed} utm_campaign={$utmCamp}",
            ];
            $attributedChannel = $attributedChannel ?? "{$utmSrc}/{$utmMed}";
        } elseif ($utmSrc !== '' || $utmMed !== '') {
            $score += 0.20;
            $evidence['utm_partial'] = ['matched' => true, 'score_contribution' => 0.20, 'details' => "partial utm"];
            $attributedChannel = $attributedChannel ?? ($utmSrc ?: $utmMed);
        }

        // 2. UTM content / term bonus
        if ($utmCont !== '' || $utmTerm !== '') {
            $score += 0.10;
            $evidence['utm_extra'] = ['matched' => true, 'score_contribution' => 0.10, 'details' => "content={$utmCont} term={$utmTerm}"];
        }

        // 3. Coupon match
        if ($coupon !== '') {
            $cStmt = $pdo->prepare('SELECT channel, campaign FROM attribution_coupon WHERE tenant_id=? AND code=?');
            $cStmt->execute([$tenant, $coupon]);
            $cRow = $cStmt->fetch(PDO::FETCH_ASSOC);
            if ($cRow) {
                $score += 0.20;
                $evidence['coupon'] = ['matched' => true, 'score_contribution' => 0.20, 'code' => $coupon, 'channel' => $cRow['channel'], 'campaign' => $cRow['campaign']];
                $attributedChannel  = $attributedChannel ?? (string)$cRow['channel'];
            } else {
                $evidence['coupon'] = ['matched' => false, 'score_contribution' => 0.00, 'code' => $coupon, 'note' => 'Code not registered'];
            }
        }

        // 4. Deeplink match — 191차: SQLite전용 `||` concat(MySQL=OR연산자) 제거. 접두 매칭을 PHP로 일원화(방언안전·정확).
        if ($deeplink !== '') {
            $dlAll = $pdo->prepare('SELECT template, channel, campaign FROM attribution_deeplink WHERE tenant_id=?');
            $dlAll->execute([$tenant]);
            foreach ($dlAll->fetchAll(PDO::FETCH_ASSOC) as $dl) {
                if (str_starts_with($deeplink, (string)$dl['template'])) {
                    $score += 0.15;
                    $evidence['deeplink'] = ['matched' => true, 'score_contribution' => 0.15, 'url' => $deeplink, 'channel' => $dl['channel']];
                    $attributedChannel    = $attributedChannel ?? (string)$dl['channel'];
                    break;
                }
            }
            if (!isset($evidence['deeplink'])) {
                $evidence['deeplink'] = ['matched' => false, 'score_contribution' => 0.00, 'url' => $deeplink];
            }
        }

        // 5. Time-window touches (last 7 days)
        $since = gmdate('c', strtotime('-7 days'));
        $tStmt = $pdo->prepare(
            'SELECT COUNT(*) FROM attribution_touch WHERE tenant_id=? AND order_id=? AND touched_at>=?'
        );
        $tStmt->execute([$tenant, $orderId, $since]);
        $touchCount = (int)$tStmt->fetchColumn();
        if ($touchCount > 0) {
            $twBonus = min(3, $touchCount) * 0.05;
            $score  += $twBonus;
            $evidence['time_window'] = ['matched' => true, 'touches_7d' => $touchCount, 'score_contribution' => $twBonus];
        } else {
            $evidence['time_window'] = ['matched' => false, 'touches_7d' => 0, 'score_contribution' => 0.00];
        }

        $score = round(min(1.0, $score), 4);

        // Persist result — [228차 일관성 P0] ★order당 전환 1행 멱등(UNIQUE 키 부재 + 무가드 append 였음).
        //   이미 적재된 전환이 있으면 skip(중복전환·markov/ROAS 이중계산 방지, first-writer-wins).
        $arChk = $pdo->prepare("SELECT 1 FROM attribution_result WHERE tenant_id=? AND order_id=? LIMIT 1");
        $arChk->execute([$tenant, $orderId]);
        if (!$arChk->fetchColumn()) {
            $rStmt = $pdo->prepare(
                'INSERT INTO attribution_result(tenant_id,order_id,attributed_channel,confidence_score,evidence_json,model,created_at)
                 VALUES(?,?,?,?,?,?,?)'
            );
            $rStmt->execute([
                $tenant, $orderId, $attributedChannel, $score,
                json_encode($evidence, JSON_UNESCAPED_UNICODE),
                'semi_rule_v1', gmdate('c'),
            ]);
        }

        return TemplateResponder::respond($response, [
            'ok'                 => true,
            'order_id'           => $orderId,
            'attributed_channel' => $attributedChannel,
            'confidence_score'   => $score,
            'evidence'           => $evidence,
            'model'              => 'semi_rule_v1',
        ]);
    }

    // ── Results ───────────────────────────────────────────────────────────

    public static function results(Request $request, Response $response, array $args): Response {
        // [286차] marketing_advanced(어트리뷰션 대시보드)=growth 서버 강제 — 데모 면제, 운영 실테넌트만. (touch/score 인제스트는 미게이트)
        if (\Genie\Db::env() !== 'demo') { $_pg = \Genie\Handlers\UserAuth::requirePlan($request, $response, 'growth'); if ($_pg) return $_pg; }
        $pdo    = Db::pdo();
        $tenant = self::tenantId($request);
        $q      = $request->getQueryParams();
        $limit  = max(1, min(500, (int)($q['limit'] ?? 100)));
        $since  = (string)($q['since'] ?? date('Y-m-d', strtotime('-30 days')));
        $until  = (string)($q['until'] ?? date('Y-m-d'));

        // [현 차수] 취소/반품 주문 제외 — attribution_result 는 취소 시 삭제/영점화되지 않아 형제(엔진 loadJourneys:1166·
        //   AttributionMetrics·geo-holdout)와 카운트 불일치였다. order_id↔channel_order_id NOT EXISTS(2축 observedExclusionInline).
        //   픽셀 단독 전환(order_id NULL/빈값)은 매칭 행 부재→NOT EXISTS 참→포함 유지. 인라인 리터럴이라 바인딩 불변.
        $exQ = ' AND NOT EXISTS (SELECT 1 FROM channel_orders co WHERE co.tenant_id = attribution_result.tenant_id '
             . 'AND co.channel_order_id = attribution_result.order_id AND (' . OrderHub::observedExclusionInline('co') . ')) ';
        $stmt = $pdo->prepare(
            'SELECT * FROM attribution_result WHERE tenant_id=? AND DATE(created_at)>=? AND DATE(created_at)<=?'
             . $exQ .
             'ORDER BY created_at DESC LIMIT ' . max(1, (int)$limit) // 209차 P1: LIMIT ? 배열바인딩 MySQL 500 → 검증 int inline
        );
        $stmt->execute([$tenant, $since, $until]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        foreach ($rows as &$r) {
            $r['evidence'] = json_decode((string)($r['evidence_json'] ?? '{}'), true);
            unset($r['evidence_json']);
        }
        return TemplateResponder::respond($response, ['ok' => true, 'total' => count($rows), 'results' => $rows]);
    }

    // ── Summary ───────────────────────────────────────────────────────────

    public static function summary(Request $request, Response $response, array $args): Response {
        // [286차] marketing_advanced=growth 서버 강제 — 데모 면제, 운영 실테넌트만.
        if (\Genie\Db::env() !== 'demo') { $_pg = \Genie\Handlers\UserAuth::requirePlan($request, $response, 'growth'); if ($_pg) return $_pg; }
        $pdo    = Db::pdo();
        $tenant = self::tenantId($request);
        $q      = $request->getQueryParams();
        $since  = (string)($q['since'] ?? date('Y-m-d', strtotime('-30 days')));
        $until  = (string)($q['until'] ?? date('Y-m-d'));

        // [현 차수] 취소/반품 제외(results 와 동일 2축 NOT EXISTS) — 형제 경로와 orders 카운트 정합.
        $exQ = ' AND NOT EXISTS (SELECT 1 FROM channel_orders co WHERE co.tenant_id = attribution_result.tenant_id '
             . 'AND co.channel_order_id = attribution_result.order_id AND (' . OrderHub::observedExclusionInline('co') . ')) ';
        $stmt = $pdo->prepare(
            'SELECT attributed_channel,
                    COUNT(*) AS orders,
                    ROUND(AVG(confidence_score),4) AS avg_confidence,
                    ROUND(MAX(confidence_score),4) AS max_confidence,
                    ROUND(MIN(confidence_score),4) AS min_confidence
             FROM attribution_result
             WHERE tenant_id=? AND DATE(created_at)>=? AND DATE(created_at)<=?'
             . $exQ .
            'GROUP BY attributed_channel
             ORDER BY orders DESC'
        );
        $stmt->execute([$tenant, $since, $until]);
        $channels = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $touch = $pdo->prepare(
            'SELECT channel, COUNT(*) AS touches
             FROM attribution_touch WHERE tenant_id=? AND DATE(touched_at)>=? AND DATE(touched_at)<=?
             GROUP BY channel ORDER BY touches DESC'
        );
        $touch->execute([$tenant, $since, $until]);

        return TemplateResponder::respond($response, [
            'ok'                => true,
            'since'             => $since,
            'until'             => $until,
            'channel_summary'   => $channels,
            'touch_by_channel'  => $touch->fetchAll(PDO::FETCH_ASSOC),
        ]);
    }
}
