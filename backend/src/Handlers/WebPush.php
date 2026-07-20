<?php
/**
 * WebPush — 모바일/데스크톱 웹 푸시 알림(246차 P3, VAPID).
 *
 *  - push-only SW(push-sw.js, fetch핸들러 부재=화이트스크린 트랩 회피)와 짝.
 *  - VAPID 키는 admin 설정(app_setting webpush_vapid_*) 또는 env — 미설정 시 전 동작 graceful(무영향).
 *    [283차 R2 정정] **공개키는 PEM 이 아니라 base64url raw**(P-256 비압축점 65B — 브라우저 applicationServerKey /
 *    Authorization 헤더의 `k=` 파라미터에 그대로 들어간다). **개인키만 EC PEM**(openssl_pkey_get_private 로 서명).
 *    종전 독블록이 둘 다 "PEM"이라 기술해 운영자가 공개키에 PEM 을 넣으면 구독이 전부 실패했다.
 *  - [283차 R2] ★스토어프론트(소비자) 공개 구독 경로 — publicSubscribe()/publicConfig() 참조.
 *  - [283차 P1] 발송은 **RFC8291 aes128gcm 암호화 페이로드**(제목·본문·딥링크 실적재). 종전 payload-less(Content-Length: 0)
 *    구현은 push-sw.js 가 항상 폴백 문구("GeniegoROI / 새 알림이 도착했습니다")만 띄워 캠페인 내용이 0이었다.
 *    암호화 실패(구키 누락/openssl 미지원 등) 시 기존 payload-less 로 graceful fallback(무회귀).
 *  - [283차 P1] push_subscription.customer_id — 세그먼트/개인 타겟팅 + 크로스채널 빈도캡(push_sent) 근거.
 *  - 전부 테넌트 격리(구독은 tenant_id 스코프). PII 미저장(endpoint=익명 푸시 채널·customer_id 는 내부 FK).
 */
declare(strict_types=1);

namespace Genie\Handlers;

use Genie\Db;
use PDO;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;

final class WebPush
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

    /** [283차 성능] 프로세스당 1회 가드 — 발송 루프에서 DDL 재실행 회피(DDL 자체가 idempotent 라 동작 무변화). */
    private static bool $tablesReady = false;

    private static function ensure(PDO $pdo): void
    {
        if (self::$tablesReady) return;
        $isMy = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'mysql';
        $AI = $isMy ? 'INT AUTO_INCREMENT PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT';
        try {
            $pdo->exec("CREATE TABLE IF NOT EXISTS push_subscription (
                id $AI, tenant_id VARCHAR(100), endpoint VARCHAR(500), p256dh VARCHAR(200), auth VARCHAR(100),
                ua VARCHAR(255), created_at VARCHAR(32)
            )");
            try { $pdo->exec("CREATE UNIQUE INDEX uq_push_ep ON push_subscription(endpoint)"); } catch (\Throwable $e) {}
            // [283차 P1] customer_id — 구독을 CRM 고객에 결속(세그먼트/개인 타겟팅 + push_sent 빈도캡 근거).
            //   종전 스키마엔 수신자 식별자가 전혀 없어 per-customer 옵트아웃/타겟팅이 구조적으로 불가능했다.
            //   기본 0 = 미결속(익명 구독) → 기존 테넌트 브로드캐스트 동작 그대로(무회귀). 멱등 ALTER.
            try { $pdo->exec("ALTER TABLE push_subscription ADD COLUMN customer_id INT DEFAULT 0"); } catch (\Throwable $e) {}
            try { $pdo->exec("CREATE INDEX idx_push_cust ON push_subscription(tenant_id, customer_id)"); } catch (\Throwable $e) {}
            self::$tablesReady = true;
        } catch (\Throwable $e) { /* graceful */ }
    }

    private static function setting(PDO $pdo, string $k): string
    {
        try { $st = $pdo->prepare("SELECT svalue FROM app_setting WHERE skey=? LIMIT 1"); $st->execute([$k]); $v = $st->fetchColumn(); return $v !== false ? (string)$v : ''; }
        catch (\Throwable $e) { return ''; }
    }

    private static function vapidPublicKey(PDO $pdo): string { return (string)(getenv('VAPID_PUBLIC_KEY') ?: self::setting($pdo, 'webpush_vapid_public')); }
    private static function vapidPrivateKey(PDO $pdo): string { $env = (string)getenv('VAPID_PRIVATE_KEY'); if ($env !== '') return $env; $s = self::setting($pdo, 'webpush_vapid_private'); return $s !== '' ? (string)\Genie\Crypto::decrypt($s) : ''; } // [259차] at-rest 복호화(평문 passthrough 하위호환)
    private static function vapidSubject(PDO $pdo): string { $s = (string)(getenv('VAPID_SUBJECT') ?: self::setting($pdo, 'webpush_vapid_subject')); return $s !== '' ? $s : 'mailto:admin@genieroi.com'; }

    /** [공개] GET /v426/push/vapid-key — 구독용 VAPID 공개키(미설정 시 enabled=false). */
    public static function vapidKey(Request $req, Response $res): Response
    {
        try { $pdo = Db::pdo(); $pub = self::vapidPublicKey($pdo);
            return self::json($res, ['ok' => true, 'enabled' => $pub !== '', 'public_key' => $pub]);
        } catch (\Throwable $e) { return self::json($res, ['ok' => true, 'enabled' => false, 'public_key' => '']); }
    }

    /** POST /v426/push/subscribe — 브라우저 PushSubscription 저장(테넌트). body: {endpoint, keys:{p256dh,auth}, customer_id?}.
     *  [283차 P1] customer_id(선택) — 전달 시 구독을 CRM 고객에 결속(세그먼트/개인 타겟팅·per-customer 옵트아웃 가능).
     *    ★테넌트 소유 검증 필수(타 테넌트 고객 결속 차단). 미전달/미소유 = 0(익명 구독, 기존 동작). */
    public static function subscribe(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        $t = self::tenant($req); $b = (array)($req->getParsedBody() ?? []);
        $endpoint = substr((string)($b['endpoint'] ?? ''), 0, 500);
        $keys = (array)($b['keys'] ?? []);
        $p256dh = substr((string)($keys['p256dh'] ?? ''), 0, 200);
        $auth = substr((string)($keys['auth'] ?? ''), 0, 100);
        if ($endpoint === '') return self::json($res, ['ok' => false, 'error' => 'endpoint 누락'], 422);
        if (!self::isPushServiceEndpoint($endpoint)) return self::json($res, ['ok' => false, 'error' => 'invalid_push_endpoint'], 422); // [현 차수] 공개경로(publicSubscribe)와 동일 푸시서비스 allowlist 를 인증 경로에도 적용(SSRF: 내부 endpoint 저장 차단)
        try {
            $pdo = Db::pdo(); self::ensure($pdo);
            $cid = self::ownedCustomerId($pdo, $t, (int)($b['customer_id'] ?? 0));
            // [283차 R2] ★유일한 호출부(pushNotify.js)가 customer_id 를 보내지 않아 이 경로의 모든 행이 cid=0 이었고,
            //   그 결과 행별 동의 게이트·push_sent 빈도캡·저니 push 노드가 전부 미실행이었다(283차 자기모순).
            //   프론트를 신뢰하는 대신 **서버가** 세션 사용자의 email 로 자기 테넌트 CRM 고객을 해상한다(위조 불가).
            //   미매칭(대시보드 전용 사용자)이면 종전대로 0 = 익명 구독(무회귀).
            if ($cid === 0) {
                $u = UserAuth::authedUser($req);
                if ($u && !empty($u['email'])) $cid = self::resolveCustomerByContact($pdo, $t, (string)$u['email'], '');
            }
            $ua = substr((string)($req->getHeaderLine('User-Agent')), 0, 255);
            $up = $pdo->prepare("UPDATE push_subscription SET tenant_id=?, p256dh=?, auth=?, ua=?, customer_id=? WHERE endpoint=?");
            $up->execute([$t, $p256dh, $auth, $ua, $cid, $endpoint]);
            if ($up->rowCount() === 0) {
                $pdo->prepare("INSERT INTO push_subscription(tenant_id,endpoint,p256dh,auth,ua,customer_id,created_at) VALUES(?,?,?,?,?,?,?)")
                    ->execute([$t, $endpoint, $p256dh, $auth, $ua, $cid, gmdate('c')]);
            }
            return self::json($res, ['ok' => true, 'customer_id' => $cid]);
        } catch (\Throwable $e) { return self::json($res, ['ok' => false, 'error' => $e->getMessage()]); }
    }

    /** [283차] 테넌트 소유 고객만 통과(크로스테넌트 결속 차단). 미소유/미존재 = 0. */
    private static function ownedCustomerId(PDO $pdo, string $tenant, int $cid): int
    {
        if ($cid <= 0 || $tenant === '') return 0;
        try {
            $st = $pdo->prepare("SELECT id FROM crm_customers WHERE id=? AND tenant_id=? LIMIT 1");
            $st->execute([$cid, $tenant]);
            return (int)($st->fetchColumn() ?: 0);
        } catch (\Throwable $e) { return 0; }
    }

    /** POST /v426/push/unsubscribe — 구독 해지. body: {endpoint}. */
    public static function unsubscribe(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        $t = self::tenant($req); $b = (array)($req->getParsedBody() ?? []);
        $endpoint = (string)($b['endpoint'] ?? '');
        try { $pdo = Db::pdo(); self::ensure($pdo);
            $pdo->prepare("DELETE FROM push_subscription WHERE endpoint=? AND tenant_id=?")->execute([$endpoint, $t]);
            return self::json($res, ['ok' => true]);
        } catch (\Throwable $e) { return self::json($res, ['ok' => false]); }
    }

    /* ═══════════════════════════════════════════════════════════════════════════════
     *  [283차 R2] 스토어프론트(소비자) 공개 구독 경로 — 웹푸시 "고객 결속"의 정문
     *  ─────────────────────────────────────────────────────────────────────────────
     *  ▸ 283차의 자기모순: 유일한 구독 경로 /v426/push/subscribe 는 requirePro(=테넌트 **대시보드 로그인 사용자**)
     *    전용이고, 그 유일한 호출부(pushNotify.js)가 customer_id 를 안 보냈다. 즉 고객사의 **소비자**가 구독할
     *    경로 자체가 부재 → 모든 행 customer_id=0 → 행별 동의 게이트(:242)·push_sent 빈도캡(:278)·
     *    JourneyBuilder push 노드(hasSubscription)·Omnichannel push 스텝이 전부 영구 미실행이었다.
     *    283차가 만든 RFC8291 암호화의 가치가 테넌트 브로드캐스트에서만 실현되고 있었다.
     *  ▸ 정문: **공개 픽셀 인프라 재사용**(신규 공개 인프라 0).
     *      - 테넌트는 오직 HMAC 서명 pixel_id → pixel_configs.tenant_id 로 도출. 요청의 임의 tenant_id 는 절대 미수신
     *        (= 타 테넌트 구독 위조 원천 차단. PixelTracking::collect 와 동일한 신뢰모델).
     *      - 경로가 /pixel/ 접두라 index.php 의 공개 bypass(:231) + 임의 오리진 CORS(:52)가 그대로 적용된다.
     *      - 소비자 식별은 픽셀 identify 와 동일 규약(email/phone) → crm_customers 해상. 미매칭이면 customer_id=0
     *        (익명 구독으로 **정직하게** 저장 — 픽셀 syncToCRM 과 동일하게 신규 고객을 임의 생성하지 않는다).
     *  ▸ 방어(공개 엔드포인트): ① pixel_id HMAC 서명 ② 푸시서비스 호스트 화이트리스트(=우리 서버가 curl 하는 URL 이므로
     *    임의 endpoint 수용은 저장형 SSRF 다) ③ endpoint 500B 길이 제한 ④ (pixel_id, IP) 분당 캡 ⑤ endpoint UNIQUE upsert.
     * ═══════════════════════════════════════════════════════════════════════════════ */

    /** 공개 구독 분당 캡((pixel_id, IP) 기준). 정상 사용자는 1회면 끝 — 넉넉히 잡아도 남용은 차단된다. */
    private const PUBLIC_SUB_CAP = 20;

    /** 브라우저 푸시 서비스 호스트 화이트리스트 — 이외 endpoint 는 거부(저장형 SSRF 차단). */
    private const PUSH_HOSTS = [
        'fcm.googleapis.com',            // Chrome / Edge(Chromium) / Samsung
        'android.googleapis.com',        // 레거시 GCM
        'push.services.mozilla.com',     // Firefox
        'notify.windows.com',            // Edge(WNS)
        'push.apple.com',                // Safari(web.push.apple.com)
    ];

    /** [공개] GET /pixel/push/config?pixel_id= — 스토어프론트 구독용 VAPID 공개키(base64url raw). */
    public static function publicConfig(Request $req, Response $res): Response
    {
        $off = ['ok' => true, 'enabled' => false, 'public_key' => ''];
        $pixelId = trim((string)($req->getQueryParams()['pixel_id'] ?? ''));
        if ($pixelId === '' || !self::verifyPixelId($pixelId)) return self::json($res, $off);
        try {
            $pdo = Db::pdo();
            if (self::tenantByPixelId($pdo, $pixelId) === '') return self::json($res, $off);
            $pub = self::vapidPublicKey($pdo);
            return self::json($res, ['ok' => true, 'enabled' => $pub !== '', 'public_key' => $pub]);
        } catch (\Throwable $e) { return self::json($res, $off); }
    }

    /** [공개] POST /pixel/push/subscribe — 고객사 상점 방문자(소비자)의 푸시 구독 저장.
     *  body: {pixel_id, endpoint, keys:{p256dh,auth}, email?, phone?}  (pixel.js 와 동일한 text/plain 비콘 허용) */
    public static function publicSubscribe(Request $req, Response $res): Response
    {
        $b = (array)($req->getParsedBody() ?? []);
        // pixel.js 는 프리플라이트 회피를 위해 Content-Type: text/plain 으로 보낸다(Slim 미파싱) → 원시 바디 폴백.
        if (!$b) { $raw = (string)$req->getBody(); if ($raw !== '') { $d = json_decode($raw, true); if (is_array($d)) $b = $d; } }

        $pixelId = trim((string)($b['pixel_id'] ?? ''));
        if ($pixelId === '' || !self::verifyPixelId($pixelId)) return self::json($res, ['ok' => false, 'error' => 'invalid pixel signature'], 403);
        $endpoint = substr(trim((string)($b['endpoint'] ?? '')), 0, 500);
        $keys = (array)($b['keys'] ?? []);
        $p256dh = substr((string)($keys['p256dh'] ?? ''), 0, 200);
        $auth   = substr((string)($keys['auth'] ?? ''), 0, 100);
        if ($endpoint === '' || $p256dh === '' || $auth === '') return self::json($res, ['ok' => false, 'error' => 'subscription 누락'], 422);
        if (!self::isPushServiceEndpoint($endpoint)) return self::json($res, ['ok' => false, 'error' => 'unsupported push endpoint'], 422);

        try {
            $pdo = Db::pdo(); self::ensure($pdo);
            $tenant = self::tenantByPixelId($pdo, $pixelId);
            if ($tenant === '') return self::json($res, ['ok' => false, 'error' => 'unknown pixel'], 404);
            if (self::publicRateLimited($pdo, $pixelId, $req)) return self::json($res, ['ok' => false, 'error' => 'rate_limited'], 429);

            // 소비자 식별 — 픽셀 identify(email/phone) 규약. 미매칭 = 0(익명 구독, 정직).
            $cid = self::resolveCustomerByContact($pdo, $tenant, (string)($b['email'] ?? ''), (string)($b['phone'] ?? ''));
            $ua = substr((string)($req->getHeaderLine('User-Agent')), 0, 255);

            // endpoint UNIQUE upsert(중복 구독·재방문 재구독은 갱신). 익명(0)으로 저장된 기존 행이 나중에
            // identify 후 재구독하면 그때 cid 가 채워진다(비파괴 승격).
            $up = $pdo->prepare("UPDATE push_subscription SET tenant_id=?, p256dh=?, auth=?, ua=?, customer_id=? WHERE endpoint=?");
            $up->execute([$tenant, $p256dh, $auth, $ua, $cid, $endpoint]);
            if ($up->rowCount() === 0) {
                $pdo->prepare("INSERT INTO push_subscription(tenant_id,endpoint,p256dh,auth,ua,customer_id,created_at) VALUES(?,?,?,?,?,?,?)")
                    ->execute([$tenant, $endpoint, $p256dh, $auth, $ua, $cid, gmdate('c')]);
            }
            // 공개 응답에 내부 customer_id 를 노출하지 않는다(열거 방지) — 결속 여부만 정직 표기.
            return self::json($res, ['ok' => true, 'matched' => $cid > 0]);
        } catch (\Throwable $e) { return self::json($res, ['ok' => false, 'error' => 'subscribe_failed'], 500); }
    }

    /** pixel_id HMAC 서명 검증 — PixelTracking::verifyPixelId 와 동일 규약(서명키 SSOT = Crypto 'pixel' 용도키).
     *  (형제 메서드가 private 이라 여기서 동일 검증을 수행한다. 위조 pixel_id 는 DB 조회 전에 거부.) */
    private static function verifyPixelId(string $pixelId): bool
    {
        $parts = explode('_', $pixelId);
        if (count($parts) < 3 || $parts[0] !== 'px') return false;
        $tag = array_pop($parts);
        return hash_equals(\Genie\Crypto::hmacTag(implode('_', $parts), 'pixel', 12), (string)$tag);
    }

    /** pixel_id → 소유 테넌트(비활성 픽셀 제외). 미등록 = ''(구독 거부). */
    private static function tenantByPixelId(PDO $pdo, string $pixelId): string
    {
        try {
            $st = $pdo->prepare("SELECT tenant_id FROM pixel_configs WHERE pixel_id=? AND (enabled IS NULL OR enabled=1) LIMIT 1");
            $st->execute([$pixelId]);
            return (string)($st->fetchColumn() ?: '');
        } catch (\Throwable $e) { return ''; }
    }

    /** 푸시 서비스 endpoint 인가(https + 호스트 화이트리스트). 우리 서버가 이 URL 로 POST 하므로 필수 방어. */
    private static function isPushServiceEndpoint(string $url): bool
    {
        $p = parse_url($url);
        if (!is_array($p) || ($p['scheme'] ?? '') !== 'https' || empty($p['host'])) return false;
        $h = strtolower((string)$p['host']);
        foreach (self::PUSH_HOSTS as $s) { if ($h === $s || str_ends_with($h, '.' . $s)) return true; }
        return false;
    }

    /** email/phone → 테넌트 소유 CRM 고객(픽셀 syncToCRM 과 동일 규약). 미매칭 = 0.
     *  ★신규 고객을 만들지 않는다 — 익명 푸시 구독으로 CRM 프로필을 임의 생성하면 PII/집계 오염(280차 P0 교훈). */
    private static function resolveCustomerByContact(PDO $pdo, string $tenant, string $email, string $phone): int
    {
        if ($tenant === '') return 0;
        $email = strtolower(trim($email));
        if ($email !== '') {
            try {
                $st = $pdo->prepare("SELECT id FROM crm_customers WHERE tenant_id=:t AND email=:e LIMIT 1");
                $st->execute([':t' => $tenant, ':e' => $email]);
                $id = (int)($st->fetchColumn() ?: 0);
                if ($id > 0) return $id;
            } catch (\Throwable $e) {}
        }
        // 전화 폴백 — 구분자(-, 공백, +, 괄호)를 제거한 뒤 뒤 8자리 일치(273차 tail8 규약, 저장 포맷 혼재 흡수).
        $digits = (string)preg_replace('/\D/', '', $phone);
        if (strlen($digits) >= 9) {
            try {
                $st = $pdo->prepare("SELECT id FROM crm_customers WHERE tenant_id=:t AND phone IS NOT NULL AND phone<>''
                    AND REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(phone,'-',''),' ',''),'+',''),'(',''),')','') LIKE :p LIMIT 1");
                $st->execute([':t' => $tenant, ':p' => '%' . substr($digits, -8)]);
                $id = (int)($st->fetchColumn() ?: 0);
                if ($id > 0) return $id;
            } catch (\Throwable $e) {}
        }
        return 0;
    }

    /** 공개 구독 레이트리밋 — 전역 미들웨어 테이블(api_rate_limit) 재사용(신규 스키마 0).
     *  key_id 는 api_key.id(양수)만 쓰이므로 **음수 공간**을 점유해 충돌이 구조적으로 불가능하다.
     *  인프라 실패는 fail-open(픽셀 collect 의 레이트리밋과 동일한 가용성 우선 정책). */
    private static function publicRateLimited(PDO $pdo, string $pixelId, Request $req): bool
    {
        $xff = trim(explode(',', $req->getHeaderLine('X-Forwarded-For'))[0] ?? '');
        $ip = $xff !== '' ? $xff : (string)($_SERVER['REMOTE_ADDR'] ?? '');
        if ($ip === '') return false;
        $keyId = -((int)(crc32('push:' . $pixelId . '|' . $ip) % 2147483647)) - 1; // 음수 키 공간
        $win = (int)floor(time() / 60);
        try {
            if ($pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'mysql') {
                $pdo->prepare('INSERT INTO api_rate_limit (key_id, window_min, cnt) VALUES (?,?,1) ON DUPLICATE KEY UPDATE cnt=cnt+1')->execute([$keyId, $win]);
            } else {
                $pdo->prepare('INSERT INTO api_rate_limit (key_id, window_min, cnt) VALUES (?,?,1) ON CONFLICT(key_id,window_min) DO UPDATE SET cnt=cnt+1')->execute([$keyId, $win]);
            }
            $q = $pdo->prepare('SELECT cnt FROM api_rate_limit WHERE key_id=? AND window_min=?');
            $q->execute([$keyId, $win]);
            try { $pdo->prepare('DELETE FROM api_rate_limit WHERE window_min < ?')->execute([$win - 3]); } catch (\Throwable $eGc) {}
            return ((int)$q->fetchColumn()) > self::PUBLIC_SUB_CAP;
        } catch (\Throwable $e) {
            // 테이블 미생성(인증 요청이 아직 없던 서버) → 생성 시도 후 이번 요청은 통과.
            try {
                if ($pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'mysql') {
                    $pdo->exec('CREATE TABLE IF NOT EXISTS api_rate_limit (key_id BIGINT NOT NULL, window_min BIGINT NOT NULL, cnt INT NOT NULL DEFAULT 0, PRIMARY KEY(key_id, window_min))');
                } else {
                    $pdo->exec('CREATE TABLE IF NOT EXISTS api_rate_limit (key_id INTEGER NOT NULL, window_min INTEGER NOT NULL, cnt INTEGER NOT NULL DEFAULT 0, PRIMARY KEY(key_id, window_min))');
                }
            } catch (\Throwable $e2) {}
            return false;
        }
    }

    /** POST /v426/push/test — 본 테넌트 구독 전체에 테스트 푸시(VAPID JWT + [283차] 암호화 페이로드).
     *  body(선택): {title, body, url} — 미전달 시 진단 기본문구. 암호화 성공 여부(encrypted)를 응답에 정직 표기. */
    public static function test(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        $t = self::tenant($req);
        $b = (array)($req->getParsedBody() ?? []);
        // [현 차수 동의센터 SSOT] 진단용 테스트 푸시 — 마케팅 캠페인이 아니므로 동의 게이트 우회($marketing=false).
        $r = self::sendToTenant($t, false, ['payload' => [
            'title' => (string)($b['title'] ?? 'GeniegoROI 테스트 알림'),
            'body'  => (string)($b['body'] ?? '웹푸시 설정이 정상 동작합니다.'),
            'url'   => (string)($b['url'] ?? '/'),
        ]]);
        return self::json($res, ['ok' => $r['ok'], 'sent' => $r['sent'], 'failed' => $r['failed'],
            'encrypted' => $r['encrypted'] ?? 0, 'payload_less' => $r['payload_less'] ?? 0, 'note' => $r['note'] ?? null]);
    }

    /** [admin] POST /v426/push/vapid-config — VAPID 키 설정. body: {public, private, subject}.
     *  [283차 R2 정정] 종전 독블록이 "public/private PEM" 이라 기술했으나 **형식이 다르다**:
     *    - public  : **base64url raw**(P-256 비압축점 65B, `0x04‖X‖Y`) — 브라우저 applicationServerKey 와
     *                Authorization 헤더의 `k=` 파라미터에 **그대로** 실린다(sendToTenant:'k=' . $pub). PEM 을 넣으면
     *                전 구독/발송이 실패한다. 예) BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBO9-Y...
     *    - private : **EC PEM**(-----BEGIN EC PRIVATE KEY----- … openssl_pkey_get_private 로 ES256 서명) — at-rest 암호화 저장.
     *    - subject : mailto: 또는 https: URL(VAPID sub 클레임). */
    public static function saveVapidConfig(Request $req, Response $res): Response
    {
        // [280차 P1] UserAuth::requireAdmin 은 정의되지 않은 메서드 → 매 호출 fatal 500(VAPID 설정 저장 영구 불능,
        //   246차 도입 이래). 형제 admin 게이트 requirePlan(...,'admin')로 교체(동일 시그니처).
        if ($err = UserAuth::requirePlan($req, $res, 'admin')) return $err;
        $b = (array)($req->getParsedBody() ?? []);
        try {
            $pdo = Db::pdo();
            foreach (['webpush_vapid_public' => 'public', 'webpush_vapid_private' => 'private', 'webpush_vapid_subject' => 'subject'] as $skey => $bk) {
                if (!array_key_exists($bk, $b)) continue;
                $v = (string)$b[$bk];
                if ($skey === 'webpush_vapid_private' && $v !== '') $v = \Genie\Crypto::encrypt($v); // [259차] VAPID 개인키 at-rest 암호화(SMTP/AI/SSO 등 형제 시크릿 정합)
                $u = $pdo->prepare("UPDATE app_setting SET svalue=?, updated_at=? WHERE skey=?");
                $u->execute([$v, gmdate('c'), $skey]);
                if ($u->rowCount() === 0) $pdo->prepare("INSERT INTO app_setting(skey,svalue,updated_at) VALUES(?,?,?)")->execute([$skey, $v, gmdate('c')]);
            }
            return self::json($res, ['ok' => true]);
        } catch (\Throwable $e) { return self::json($res, ['ok' => false, 'error' => $e->getMessage()]); }
    }

    /**
     * 테넌트 구독에 푸시 발송(VAPID JWT ES256 인증 + [283차] RFC8291 암호화 페이로드). VAPID 미설정 시 graceful skip.
     *
     * [283차 P1] 종전 구현의 3대 결함을 정문 수정:
     *   ① payload-less(CURLOPT_POSTFIELDS='' · Content-Length: 0) → push-sw.js 가 항상 폴백 문구만 표기.
     *      캠페인 제목·본문·딥링크가 수신자에게 **0** 전달됐다. → RFC8291(aes128gcm) 암호화 페이로드 실적재.
     *   ② push_subscription 에 수신자 식별자가 없어 세그먼트/개인 타겟팅·per-customer 옵트아웃이 구조적 불가.
     *      → customer_id 결속(ensure() ALTER) + segment_id/customer_id 타겟팅 + 행별 동의 게이트.
     *   ③ push_sent 활동이 repo 전체에서 한 번도 INSERT 되지 않아 크로스채널 빈도캡(CRM::countSentSignals 화이트리스트)에
     *      푸시가 영영 잡히지 않았다. → 실발송 성공 시 crm_activities('push_sent') 적재.
     *
     * @param string $tenant
     * @param bool   $marketing 마케팅 발송(동의 게이트 적용). 진단/트랜잭션 알림은 false.
     * @param array  $opts {
     *   payload?:    array{title?:string, body?:string, url?:string, icon?:string, tag?:string} 알림 내용(미지정 시 payload-less)
     *   segment_id?: int  CRM 세그먼트 타겟(해당 세그먼트 멤버에 결속된 구독만)
     *   customer_id?:int  단일 고객 타겟
     *   topic?:      string 콘텐츠 카테고리(promo/newsletter/product/event) — 토픽 옵트아웃 강제
     *   ttl?:        int
     * }
     * @return array{ok:bool, sent:int, failed:int, encrypted?:int, payload_less?:int, opted_out?:int, note?:string}
     */
    public static function sendToTenant(string $tenant, bool $marketing = true, array $opts = []): array
    {
        try {
            $pdo = Db::pdo(); self::ensure($pdo);
            $priv = self::vapidPrivateKey($pdo); $pub = self::vapidPublicKey($pdo);
            if ($priv === '' || $pub === '') return ['ok' => false, 'sent' => 0, 'failed' => 0, 'note' => 'VAPID 키 미설정 — admin 푸시 설정에서 키를 등록하세요.'];
            $sub = self::vapidSubject($pdo);

            // [현 차수 동의센터 SSOT] 통합 발송 게이트 — 마케팅 발송 한정($marketing=true).
            //   (a) 테넌트 스코프(cid=0) 1회 평가 = 테넌트 조용시간/글로벌 정책(익명 구독까지 커버).
            //   (b) [283차] customer_id 가 결속된 구독은 **행별**로 재평가 → 개인 채널/토픽 옵트아웃·빈도캡이 실제 강제된다.
            //   진단용 test push 는 마케팅이 아니므로 test()가 $marketing=false 로 우회(트랜잭션/관리자 알림 비게이트 원칙).
            if ($marketing) {
                $g = CRM::isMarketingSendAllowed($tenant, 0, 'push');
                if (!($g['allowed'] ?? true)) return ['ok' => true, 'sent' => 0, 'failed' => 0, 'note' => 'consent_gate:' . ($g['reason'] ?? 'blocked')];
            }

            // ── 수신 대상 해석(무지정 = 테넌트 전체 브로드캐스트 = 기존 동작) ──
            $segId  = (int)($opts['segment_id'] ?? 0);
            $onlyId = (int)($opts['customer_id'] ?? 0);
            $sql = "SELECT id, endpoint, p256dh, auth, customer_id FROM push_subscription WHERE tenant_id=?";
            $par = [$tenant];
            if ($onlyId > 0) { $sql .= " AND customer_id=?"; $par[] = $onlyId; }
            elseif ($segId > 0) {
                // 세그먼트 타겟 — 고객 결속 구독만(익명 구독은 세그먼트 해석 불가 → 정직하게 제외).
                $sql .= " AND customer_id>0 AND customer_id IN (SELECT customer_id FROM crm_segment_members WHERE segment_id=? AND tenant_id=?)";
                $par[] = $segId; $par[] = $tenant;
            }
            $st = $pdo->prepare($sql); $st->execute($par);
            $rows = $st->fetchAll(PDO::FETCH_ASSOC) ?: [];
            if (!$rows) return ['ok' => true, 'sent' => 0, 'failed' => 0, 'note' => '대상 구독자가 없습니다.'];

            // ── 페이로드(암호화 대상) ──
            $payload = (array)($opts['payload'] ?? []);
            $json = '';
            if ($payload) {
                $json = (string)json_encode([
                    'title' => mb_substr((string)($payload['title'] ?? 'GeniegoROI'), 0, 120),
                    'body'  => mb_substr((string)($payload['body'] ?? ''), 0, 500),
                    'url'   => (string)($payload['url'] ?? '/'),
                    'icon'  => (string)($payload['icon'] ?? '/icon-192.png'),
                    'tag'   => (string)($payload['tag'] ?? 'geniego'),
                ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
                // RFC8188 레코드(rs=4096) 한도 — 헤더(21B)+구분자(1B)+GCM태그(16B) 여유 확보. 초과 시 본문 절단.
                if (strlen($json) > self::MAX_PLAINTEXT) $json = '';
            }
            $ttl = max(0, (int)($opts['ttl'] ?? 86400));
            $sendOpt = CRM::sendOptions($opts['topic'] ?? null, false); // [283차 P0] 토픽 옵트아웃(행별 게이트 입력)

            $sent = 0; $failed = 0; $enc = 0; $plain = 0; $optout = 0;
            foreach ($rows as $r) {
                $endpoint = (string)$r['endpoint'];
                $cid = (int)($r['customer_id'] ?? 0);
                // [283차 P1] 행별 동의 게이트 — customer_id 결속 구독은 개인 옵트아웃/토픽/빈도캡을 실제로 강제.
                //   익명 구독(cid=0)은 위 테넌트 스코프 평가로 이미 커버(fail-open 정책 유지).
                if ($marketing && $cid > 0) {
                    $gr = CRM::isMarketingSendAllowed($tenant, $cid, 'push', $sendOpt);
                    if (!($gr['allowed'] ?? true)) { $optout++; continue; }
                }
                $aud = self::originOf($endpoint);
                $jwt = self::vapidJwt($aud, $sub, $priv);
                if ($jwt === '') { $failed++; continue; }

                // [283차 P1] RFC8291 암호화 — 실패 시 payload-less 로 graceful fallback(무회귀: 최소한 알림은 뜬다).
                $body = ''; $headers = ['TTL: ' . $ttl, 'Authorization: vapid t=' . $jwt . ', k=' . $pub];
                $cipher = ($json !== '') ? self::encryptPayload($json, (string)$r['p256dh'], (string)$r['auth']) : null;
                if ($cipher !== null) {
                    $body = $cipher;
                    $headers[] = 'Content-Encoding: aes128gcm';
                    $headers[] = 'Content-Type: application/octet-stream';
                    $headers[] = 'Content-Length: ' . strlen($body);
                    $enc++;
                } else {
                    $headers[] = 'Content-Length: 0';
                    $plain++;
                }

                $ch = curl_init($endpoint);
                curl_setopt_array($ch, [
                    CURLOPT_RETURNTRANSFER => true, CURLOPT_POST => true, CURLOPT_POSTFIELDS => $body,
                    CURLOPT_TIMEOUT => 10, CURLOPT_SSL_VERIFYPEER => true,
                    CURLOPT_HTTPHEADER => $headers,
                ]);
                curl_exec($ch); $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE); curl_close($ch);
                if ($code === 404 || $code === 410) { // 만료 구독 → 정리
                    try { $pdo->prepare("DELETE FROM push_subscription WHERE id=?")->execute([(int)$r['id']]); } catch (\Throwable $e) {}
                    $failed++;
                } elseif ($code >= 200 && $code < 300) {
                    $sent++;
                    // [283차 P1] ★push_sent 신호 적재 — repo 전체에서 단 한 번도 INSERT 되지 않아 크로스채널 빈도캡
                    //   화이트리스트(CRM::countSentSignals 의 'push_sent')가 영구 dead 였다. 고객 결속 구독만 기록.
                    if ($cid > 0) {
                        try {
                            $pdo->prepare("INSERT INTO crm_activities (tenant_id, customer_id, type, channel, data, created_at) VALUES (?,?,'push_sent','push',?,?)")
                                ->execute([$tenant, $cid, json_encode(['title' => (string)($payload['title'] ?? ''), 'topic' => ($sendOpt['topic'] ?? null)], JSON_UNESCAPED_UNICODE), gmdate('Y-m-d H:i:s')]);
                        } catch (\Throwable $e) {}
                    }
                } else { $failed++; }
            }
            return ['ok' => true, 'sent' => $sent, 'failed' => $failed, 'encrypted' => $enc, 'payload_less' => $plain, 'opted_out' => $optout];
        } catch (\Throwable $e) { return ['ok' => false, 'sent' => 0, 'failed' => 0, 'note' => $e->getMessage()]; }
    }

    /** [283차] 고객 1인에게 푸시(저니 push 노드 등). 구독 부재 시 sent=0(정직 — 가짜 성공 금지). */
    public static function sendToCustomer(string $tenant, int $customerId, array $payload, bool $marketing = true, ?string $topic = null): array
    {
        if ($customerId <= 0) return ['ok' => false, 'sent' => 0, 'failed' => 0, 'note' => 'no_customer'];
        return self::sendToTenant($tenant, $marketing, ['payload' => $payload, 'customer_id' => $customerId, 'topic' => $topic]);
    }

    /** [283차] 고객에게 활성 웹푸시 구독이 있는지(저니 노드 도달가능성 판정). */
    public static function hasSubscription(PDO $pdo, string $tenant, int $customerId): bool
    {
        if ($customerId <= 0) return false;
        try {
            self::ensure($pdo);
            $st = $pdo->prepare("SELECT 1 FROM push_subscription WHERE tenant_id=? AND customer_id=? LIMIT 1");
            $st->execute([$tenant, $customerId]);
            return (bool)$st->fetchColumn();
        } catch (\Throwable $e) { return false; }
    }

    /* ═══════════════════════════════════════════════════════════════════════════════
     *  [283차 P1] RFC8291 Web Push Message Encryption + RFC8188 aes128gcm 콘텐츠 인코딩
     *  ─────────────────────────────────────────────────────────────────────────────
     *  ▸ 절차(RFC8291 §3.1, RFC8188 §2):
     *      1. ECDH(P-256): as_private(임시) × ua_public(p256dh) → ecdh_secret(32B)
     *      2. PRK_key = HMAC-SHA256(auth_secret, ecdh_secret)                      ← HKDF-Extract(salt=auth)
     *      3. key_info = "WebPush: info" ‖ 0x00 ‖ ua_public(65B) ‖ as_public(65B)
     *         IKM     = HKDF-Expand(PRK_key, key_info, 32)
     *      4. salt(16B, random); PRK = HMAC-SHA256(salt, IKM)                      ← HKDF-Extract(salt=salt)
     *      5. CEK   = HKDF-Expand(PRK, "Content-Encoding: aes128gcm" ‖ 0x00, 16)
     *         NONCE = HKDF-Expand(PRK, "Content-Encoding: nonce" ‖ 0x00, 12)       ← seq=0 이라 XOR 생략
     *      6. ciphertext = AES-128-GCM(CEK, NONCE, plaintext ‖ 0x02)  (0x02 = 마지막 레코드 구분자)
     *      7. body = salt(16) ‖ rs(4, uint32be) ‖ idlen(1=65) ‖ as_public(65) ‖ ciphertext‖tag(16)
     *  ▸ 실패(구키 누락·openssl 미지원·좌표 파싱 실패)는 전부 null → 호출측이 payload-less 로 폴백(무회귀).
     * ═══════════════════════════════════════════════════════════════════════════════ */

    /** RFC8188 레코드 크기(rs). body = 21B 헤더 + as_public(65B) + ciphertext. */
    private const RECORD_SIZE = 4096;
    /** 평문 최대 — rs - (구분자 1B + GCM 태그 16B). 여유를 두고 보수적으로 제한. */
    private const MAX_PLAINTEXT = 3800;

    /**
     * @param  string      $plaintext 알림 JSON
     * @param  string      $p256dhB64 구독 공개키(base64url, 65B 비압축점)
     * @param  string      $authB64   구독 auth secret(base64url, 16B)
     * @return string|null 전송 본문(aes128gcm) — 실패 시 null
     */
    public static function encryptPayload(string $plaintext, string $p256dhB64, string $authB64): ?string
    {
        try {
            if (!function_exists('openssl_pkey_derive') || !function_exists('openssl_encrypt')) return null;
            $uaPublic = self::b64urlDecode($p256dhB64);
            $authSecret = self::b64urlDecode($authB64);
            // P-256 비압축점 = 0x04 ‖ X(32) ‖ Y(32). auth secret = 16B(RFC8291 §3.2).
            if (strlen($uaPublic) !== 65 || $uaPublic[0] !== "\x04" || strlen($authSecret) !== 16) return null;
            if (strlen($plaintext) > self::MAX_PLAINTEXT) return null;

            // 1) 임시(ephemeral) ECDH 키쌍 — 구독마다 새로 생성(RFC8291 §3.1 필수).
            $asKey = openssl_pkey_new(['curve_name' => 'prime256v1', 'private_key_type' => OPENSSL_KEYTYPE_EC]);
            if ($asKey === false) return null;
            $d = openssl_pkey_get_details($asKey);
            if (!$d || !isset($d['ec']['x'], $d['ec']['y'])) return null;
            $asPublic = "\x04" . str_pad($d['ec']['x'], 32, "\x00", STR_PAD_LEFT) . str_pad($d['ec']['y'], 32, "\x00", STR_PAD_LEFT);

            // 2) ECDH 공유비밀 — 구독 공개키(raw) → SPKI PEM 변환 후 derive.
            $uaPem = self::rawP256ToPem($uaPublic);
            if ($uaPem === null) return null;
            $peer = openssl_pkey_get_public($uaPem);
            if ($peer === false) return null;
            $ecdh = openssl_pkey_derive($peer, $asKey, 32);
            if ($ecdh === false || strlen($ecdh) !== 32) return null;

            // 3) IKM = HKDF(auth_secret, ecdh, "WebPush: info" ‖ 0x00 ‖ ua_public ‖ as_public, 32)
            $prkKey = hash_hmac('sha256', $ecdh, $authSecret, true);                  // HKDF-Extract(salt=auth)
            $keyInfo = "WebPush: info\x00" . $uaPublic . $asPublic;
            $ikm = self::hkdfExpand($prkKey, $keyInfo, 32);

            // 4~5) salt → PRK → CEK/NONCE
            $salt  = random_bytes(16);
            $prk   = hash_hmac('sha256', $ikm, $salt, true);                          // HKDF-Extract(salt=salt)
            $cek   = self::hkdfExpand($prk, "Content-Encoding: aes128gcm\x00", 16);
            $nonce = self::hkdfExpand($prk, "Content-Encoding: nonce\x00", 12);        // seq=0 → XOR 불요

            // 6) AES-128-GCM(평문 ‖ 0x02 마지막-레코드 구분자). 패딩 없음(RFC8188 상 선택).
            $tag = '';
            $ct = openssl_encrypt($plaintext . "\x02", 'aes-128-gcm', $cek, OPENSSL_RAW_DATA, $nonce, $tag, '', 16);
            if ($ct === false || strlen($tag) !== 16) return null;

            // 7) aes128gcm 헤더 ‖ ciphertext‖tag
            $header = $salt . pack('N', self::RECORD_SIZE) . chr(strlen($asPublic)) . $asPublic;
            return $header . $ct . $tag;
        } catch (\Throwable $e) { return null; }
    }

    /** HKDF-Expand(RFC5869) — L ≤ 32 이므로 1블록(T(1) = HMAC(PRK, info ‖ 0x01))으로 충분. */
    private static function hkdfExpand(string $prk, string $info, int $len): string
    {
        return substr(hash_hmac('sha256', $info . "\x01", $prk, true), 0, $len);
    }

    /** raw P-256 비압축점(65B) → SubjectPublicKeyInfo PEM. openssl_pkey_get_public 이 raw 점을 못 받아 필요. */
    private static function rawP256ToPem(string $raw): ?string
    {
        if (strlen($raw) !== 65 || $raw[0] !== "\x04") return null;
        // DER: SEQUENCE{ SEQUENCE{ OID id-ecPublicKey, OID prime256v1 }, BIT STRING(0x00 ‖ point) }
        $der = hex2bin('3059301306072a8648ce3d020106082a8648ce3d030107034200') . $raw;
        if ($der === false) return null;
        return "-----BEGIN PUBLIC KEY-----\n" . chunk_split(base64_encode($der), 64, "\n") . "-----END PUBLIC KEY-----\n";
    }

    private static function b64urlDecode(string $s): string
    {
        $s = strtr(trim($s), '-_', '+/');
        $pad = strlen($s) % 4;
        if ($pad) $s .= str_repeat('=', 4 - $pad);
        $d = base64_decode($s, true);
        return $d === false ? '' : $d;
    }

    private static function originOf(string $url): string
    {
        $p = parse_url($url);
        return ($p['scheme'] ?? 'https') . '://' . ($p['host'] ?? '') . (isset($p['port']) ? ':' . $p['port'] : '');
    }

    private static function b64url(string $d): string { return rtrim(strtr(base64_encode($d), '+/', '-_'), '='); }

    /** VAPID JWT(ES256). EC P-256 개인키 PEM 으로 서명, DER→raw(r||s 64B) 변환. */
    private static function vapidJwt(string $audience, string $subject, string $privatePem): string
    {
        try {
            $header = self::b64url(json_encode(['typ' => 'JWT', 'alg' => 'ES256']));
            $payload = self::b64url(json_encode(['aud' => $audience, 'exp' => time() + 12 * 3600, 'sub' => $subject]));
            $input = $header . '.' . $payload;
            $key = openssl_pkey_get_private($privatePem);
            if ($key === false) return '';
            $der = '';
            if (!openssl_sign($input, $der, $key, OPENSSL_ALGO_SHA256)) return '';
            $raw = self::derToRaw($der);
            if ($raw === '') return '';
            return $input . '.' . self::b64url($raw);
        } catch (\Throwable $e) { return ''; }
    }

    /** ECDSA DER(SEQUENCE{INTEGER r, INTEGER s}) → 64바이트 raw(r||s, 각 32B 좌측 0패딩). */
    private static function derToRaw(string $der): string
    {
        $o = 0; $len = strlen($der);
        if ($len < 8 || ord($der[$o++]) !== 0x30) return '';
        $seqLen = ord($der[$o++]);
        if ($seqLen & 0x80) { $n = $seqLen & 0x7f; $o += $n; } // long-form length (드묾) 건너뜀
        $readInt = function () use (&$o, $der, $len): string {
            if ($o >= $len || ord($der[$o++]) !== 0x02) return '';
            $l = ord($der[$o++]);
            $v = substr($der, $o, $l); $o += $l;
            $v = ltrim($v, "\x00");                       // 선행 0(부호) 제거
            return str_pad($v, 32, "\x00", STR_PAD_LEFT); // 32B 좌패딩
        };
        $r = $readInt(); $s = $readInt();
        if (strlen($r) !== 32 || strlen($s) !== 32) return '';
        return $r . $s;
    }
}
