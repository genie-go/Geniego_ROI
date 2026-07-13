<?php
declare(strict_types=1);
namespace Genie\Handlers;

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;
use Genie\Db;

/**
 * 1st-Party Pixel Tracking (190차 부활 + 멀티테넌트 격리 + MySQL/SQLite 이식).
 *
 * 189차까지 runtime-dead(Db::get). CRM 패턴 4층 부활.
 * ★테넌트 도출이 2갈래:
 *   - collect(공개 비콘, 세션 없음): tenant = pixel_id → pixel_configs.tenant_id (미등록=unknown)
 *   - 관리(configs/analytics): tenant = 인증 세션 user.tenant_id
 * pixel_* 3테이블 tenant_id + analytics 테넌트 스코프(타 테넌트 이벤트 비노출). /api/pixel public bypass.
 */
class PixelTracking
{
    private static function db(): \PDO { return Db::pdo(); }
    private static function isMysql(\PDO $pdo): bool { return $pdo->getAttribute(\PDO::ATTR_DRIVER_NAME) === 'mysql'; }
    private static function now(): string { return gmdate('Y-m-d H:i:s'); }
    private static function cutoff(int $days): string { return gmdate('Y-m-d H:i:s', time() - $days * 86400); }
    private static function tenant(Request $req): string
    {
        $t = UserAuth::authedTenant($req);
        return ($t !== null && $t !== '') ? $t : 'demo';
    }

    private static function json(Response $res, array $data, int $status = 200): Response
    {
        $res->getBody()->write(json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
        return $res->withHeader('Content-Type', 'application/json')->withStatus($status);
    }

    /** 209차 P1: secret-at-rest. 빈값은 빈값, 평문 복호화는 passthrough(기존 평문행 하위호환). */
    private static function enc(string $v): string { return $v === '' ? '' : \Genie\Crypto::encrypt($v); }
    private static function dec(string $v): string { return $v === '' ? '' : \Genie\Crypto::decrypt($v); }

    /**
     * [현 차수] 감사 P2: pixel_id HMAC 서명 — 공개 비콘 위조 차단.
     * 형식: px_<rand16>_<hmac12>. 서명은 서버 cred 키(용도분리)로 생성 → 시크릿 없이는 유효 pixel_id 위조 불가.
     * 효과: 무작위·열거·오타 pixel_id 가 수집 단계에서 거부(불명 테넌트 오염 행/불필요 DB조회 차단).
     * (스니펫에 노출된 정당 pixel_id 재전송은 본질적으로 막을 수 없어 도메인 신뢰 게이트가 추가 방어.)
     */
    private static function genPixelId(): string
    {
        $base = 'px_' . bin2hex(random_bytes(8));
        return $base . '_' . \Genie\Crypto::hmacTag($base, 'pixel', 12);
    }

    /** pixel_id 서명 검증(타이밍 안전). 레거시(태그 없는 px_<rand>)는 무효 처리(운영 config 0 → 영향 없음). */
    private static function verifyPixelId(string $pixelId): bool
    {
        $parts = explode('_', $pixelId);
        if (count($parts) < 3 || $parts[0] !== 'px') return false;
        $tag = array_pop($parts);
        $base = implode('_', $parts); // 'px_<rand>'
        $expect = \Genie\Crypto::hmacTag($base, 'pixel', 12);
        return hash_equals($expect, $tag);
    }

    private static function ensureTables(): void
    {
        $pdo = self::db();
        if (self::isMysql($pdo)) {
            $pdo->exec("CREATE TABLE IF NOT EXISTS pixel_events (
                id INT AUTO_INCREMENT PRIMARY KEY, tenant_id VARCHAR(100) NOT NULL DEFAULT 'demo',
                event_id VARCHAR(64) NOT NULL UNIQUE, pixel_id VARCHAR(64) NOT NULL, event_name VARCHAR(80) NOT NULL,
                session_id VARCHAR(80), user_id VARCHAR(100), email_hash VARCHAR(72), phone_hash VARCHAR(72),
                page_url TEXT, referrer TEXT, utm_source VARCHAR(120), utm_medium VARCHAR(120), utm_campaign VARCHAR(160),
                utm_content VARCHAR(160), utm_term VARCHAR(160), value DOUBLE DEFAULT 0, currency VARCHAR(10) DEFAULT 'KRW',
                product_ids TEXT, custom_data TEXT, ip_hash VARCHAR(72), user_agent VARCHAR(500), country VARCHAR(8),
                device_type VARCHAR(20), forwarded_meta INT DEFAULT 0, forwarded_tiktok INT DEFAULT 0, created_at VARCHAR(32),
                KEY idx_pixel_evt_tenant (tenant_id), KEY idx_pixel_evt_pixel (pixel_id), KEY idx_pixel_evt_name (event_name),
                KEY idx_pixel_evt_created (created_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
            $pdo->exec("CREATE TABLE IF NOT EXISTS pixel_configs (
                id INT AUTO_INCREMENT PRIMARY KEY, tenant_id VARCHAR(100) NOT NULL DEFAULT 'demo',
                pixel_id VARCHAR(64) NOT NULL UNIQUE, name VARCHAR(255) NOT NULL, domain VARCHAR(255),
                meta_pixel_id VARCHAR(64), meta_api_token VARCHAR(500), tiktok_pixel_id VARCHAR(64), tiktok_access_token VARCHAR(500),
                ga4_measurement_id VARCHAR(64), ga4_api_secret VARCHAR(255), enabled INT DEFAULT 1,
                created_at VARCHAR(32), updated_at VARCHAR(32), KEY idx_pixel_cfg_tenant (tenant_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
            $pdo->exec("CREATE TABLE IF NOT EXISTS pixel_sessions (
                session_id VARCHAR(80) PRIMARY KEY, tenant_id VARCHAR(100) NOT NULL DEFAULT 'demo', pixel_id VARCHAR(64),
                first_event VARCHAR(32), last_event VARCHAR(32), page_views INT DEFAULT 0, add_to_cart INT DEFAULT 0,
                purchases INT DEFAULT 0, total_revenue DOUBLE DEFAULT 0, utm_source VARCHAR(120), utm_medium VARCHAR(120),
                utm_campaign VARCHAR(160), landing_page TEXT, duration_sec INT DEFAULT 0, converted INT DEFAULT 0,
                created_at VARCHAR(32), updated_at VARCHAR(32), KEY idx_pixel_sess_tenant (tenant_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
        } else {
            $pdo->exec("CREATE TABLE IF NOT EXISTS pixel_events (id INTEGER PRIMARY KEY AUTOINCREMENT, tenant_id TEXT NOT NULL DEFAULT 'demo', event_id TEXT NOT NULL UNIQUE, pixel_id TEXT NOT NULL, event_name TEXT NOT NULL, session_id TEXT, user_id TEXT, email_hash TEXT, phone_hash TEXT, page_url TEXT, referrer TEXT, utm_source TEXT, utm_medium TEXT, utm_campaign TEXT, utm_content TEXT, utm_term TEXT, value REAL DEFAULT 0, currency TEXT DEFAULT 'KRW', product_ids TEXT DEFAULT '[]', custom_data TEXT DEFAULT '{}', ip_hash TEXT, user_agent TEXT, country TEXT, device_type TEXT, forwarded_meta INTEGER DEFAULT 0, forwarded_tiktok INTEGER DEFAULT 0, created_at TEXT)");
            $pdo->exec("CREATE TABLE IF NOT EXISTS pixel_configs (id INTEGER PRIMARY KEY AUTOINCREMENT, tenant_id TEXT NOT NULL DEFAULT 'demo', pixel_id TEXT NOT NULL UNIQUE, name TEXT NOT NULL, domain TEXT, meta_pixel_id TEXT, meta_api_token TEXT, tiktok_pixel_id TEXT, tiktok_access_token TEXT, ga4_measurement_id TEXT, ga4_api_secret TEXT, enabled INTEGER DEFAULT 1, created_at TEXT, updated_at TEXT)");
            $pdo->exec("CREATE TABLE IF NOT EXISTS pixel_sessions (session_id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL DEFAULT 'demo', pixel_id TEXT, first_event TEXT, last_event TEXT, page_views INTEGER DEFAULT 0, add_to_cart INTEGER DEFAULT 0, purchases INTEGER DEFAULT 0, total_revenue REAL DEFAULT 0, utm_source TEXT, utm_medium TEXT, utm_campaign TEXT, landing_page TEXT, duration_sec INTEGER DEFAULT 0, converted INTEGER DEFAULT 0, created_at TEXT, updated_at TEXT)");
            $pdo->exec("CREATE INDEX IF NOT EXISTS idx_pixel_events_pixel ON pixel_events(pixel_id)");
            $pdo->exec("CREATE INDEX IF NOT EXISTS idx_pixel_events_created ON pixel_events(created_at)");
            $pdo->exec("CREATE INDEX IF NOT EXISTS idx_pixel_events_tenant ON pixel_events(tenant_id)");
        }
        foreach (['pixel_events','pixel_configs','pixel_sessions'] as $tbl) {
            try { $pdo->exec("ALTER TABLE {$tbl} ADD COLUMN tenant_id VARCHAR(100) NOT NULL DEFAULT 'demo'"); } catch (\Throwable $e) {}
        }
        // [227차 P0] GA4 포워딩 추적 컬럼(idempotent — 이미 있으면 catch).
        try { $pdo->exec("ALTER TABLE pixel_events ADD COLUMN forwarded_ga4 " . (self::isMysql($pdo) ? "INT DEFAULT 0" : "INTEGER DEFAULT 0")); } catch (\Throwable $e) {}
        // [현 차수 P2] Pinterest/Snapchat CAPI — 설정 컬럼 + 포워딩 추적(idempotent ALTER).
        $intc = self::isMysql($pdo) ? "INT DEFAULT 0" : "INTEGER DEFAULT 0";
        $txtc = self::isMysql($pdo) ? "VARCHAR(500)" : "TEXT";
        foreach ([
            "pixel_configs ADD COLUMN pinterest_ad_account_id " . (self::isMysql($pdo) ? "VARCHAR(64)" : "TEXT"),
            "pixel_configs ADD COLUMN pinterest_conversion_token {$txtc}",
            "pixel_configs ADD COLUMN snap_pixel_id " . (self::isMysql($pdo) ? "VARCHAR(64)" : "TEXT"),
            "pixel_configs ADD COLUMN snap_api_token {$txtc}",
            // [279차 M2 초고도화] Reddit Conversions API — CAPI 목적지 완결(유일 미배선 채널). 패턴=Pinterest/Snapchat.
            "pixel_configs ADD COLUMN reddit_ad_account_id " . (self::isMysql($pdo) ? "VARCHAR(64)" : "TEXT"),
            "pixel_configs ADD COLUMN reddit_conversion_token {$txtc}",
            // [280차] LinkedIn Conversions API — 전환룰 URN + 액세스 토큰. B2B 리드/구매 귀속.
            //   linkedin_conversion_urn = 'urn:lla:llaPartnerConversion:<id>' (또는 숫자 ID만 넣어도 정규화).
            //   linkedin_events = 이 전환룰로 보낼 이벤트 화이트리스트(기본 purchase). LinkedIn 전환룰은
            //   생성 시 type(PURCHASE/LEAD/…)이 고정되므로 아무 이벤트나 보내면 룰이 오염된다 → 명시 화이트리스트.
            "pixel_configs ADD COLUMN linkedin_conversion_urn " . (self::isMysql($pdo) ? "VARCHAR(128)" : "TEXT"),
            "pixel_configs ADD COLUMN linkedin_access_token {$txtc}",
            "pixel_configs ADD COLUMN linkedin_events " . (self::isMysql($pdo) ? "VARCHAR(255)" : "TEXT"),
            "pixel_events ADD COLUMN forwarded_pinterest {$intc}",
            "pixel_events ADD COLUMN forwarded_snap {$intc}",
            "pixel_events ADD COLUMN forwarded_reddit {$intc}",
            "pixel_events ADD COLUMN forwarded_linkedin {$intc}",
        ] as $alt) { try { $pdo->exec("ALTER TABLE {$alt}"); } catch (\Throwable $e) {} }
    }

    /* ─── POST /pixel/collect ─── 픽셀 이벤트 수집 (공개 비콘) ─────────── */
    public static function collect(Request $req, Response $res): Response
    {
        self::ensureTables();
        $pdo = self::db();
        $b = (array)$req->getParsedBody();
        // [280차 P0] 원시 바디 JSON 폴백 — 비콘(pixel.js)은 CORS-simple 전송을 위해
        //   Content-Type: text/plain 으로 보낸다(프리플라이트를 만들지 않아야 고객사 임의 도메인에서 차단 없이
        //   나가고, 이탈 직전 purchase 를 navigator.sendBeacon 으로 보낼 수 있다 — sendBeacon 은 커스텀 헤더 불가).
        //   Slim 은 application/json 만 파싱하므로 text/plain 은 여기서 직접 디코드한다. 기존 JSON 전송은 무영향.
        if (!$b) {
            $raw = (string)$req->getBody();
            if ($raw !== '') { $d = json_decode($raw, true); if (is_array($d)) $b = $d; }
        }

        $pixelId   = trim($b['pixel_id'] ?? '');
        $eventName = trim($b['event_name'] ?? 'page_view');
        $sessionId = trim($b['session_id'] ?? '');
        if (!$pixelId) return self::json($res, ['ok' => false, 'error' => 'pixel_id 필수'], 400);

        // [현 차수] 감사 P2: HMAC 서명 검증 — 위조/열거된 pixel_id 를 DB 조회 전에 거부(오염·부하 차단).
        if (!self::verifyPixelId($pixelId)) return self::json($res, ['ok' => false, 'error' => 'invalid pixel signature'], 403);

        // [225차 P1-5] 클라이언트 IP 해시 선계산(rate-limit + 저장 공용). 프록시 뒤에서는 X-Forwarded-For
        //   첫 토큰(실 클라이언트)을 우선, 없으면 REMOTE_ADDR. (XFF 는 위조 가능하나 단순 봇 대량주입은 차단.)
        $xff = trim(explode(',', $req->getHeaderLine('X-Forwarded-For'))[0] ?? '');
        $ipRaw = $xff !== '' ? $xff : (string)($_SERVER['REMOTE_ADDR'] ?? '');
        $ipHash = $ipRaw !== '' ? hash('sha256', $ipRaw) : null;
        // [225차 P1-5] rate-limit: 공개 비콘 대량 위조 주입 차단(pixel_id+ip 분당 캡). 구매는 더 엄격.
        //   created_at='Y-m-d H:i:s'(UTC) 고정포맷이라 문자열 사전비교가 시간비교와 동치.
        if ($ipHash !== null) {
            try {
                $rl = $pdo->prepare("SELECT COUNT(*) FROM pixel_events WHERE pixel_id=:pid AND ip_hash=:iph AND created_at > :since");
                $rl->execute([':pid' => $pixelId, ':iph' => $ipHash, ':since' => gmdate('Y-m-d H:i:s', time() - 60)]);
                $recent = (int)$rl->fetchColumn();
                $cap = ($eventName === 'purchase') ? 20 : 120; // 분당
                if ($recent >= $cap) return self::json($res, ['ok' => false, 'error' => 'rate_limited'], 429);
            } catch (\Throwable $e) { /* rate-limit 인프라 실패 시 통과(가용성 우선) */ }
        }

        // ★테넌트 = pixel_id 의 소유 config. 미등록 픽셀=unknown(어느 테넌트 analytics 에도 미노출).
        $cfgStmt = $pdo->prepare("SELECT * FROM pixel_configs WHERE pixel_id=:pid LIMIT 1");
        $cfgStmt->execute([':pid' => $pixelId]);
        $config = $cfgStmt->fetch(\PDO::FETCH_ASSOC);
        // 209차 P1: secret-at-rest 복호화(서버 전송 API 토큰). 평문 행은 passthrough.
        if ($config) foreach (['meta_api_token','tiktok_access_token','ga4_api_secret','pinterest_conversion_token','snap_api_token','reddit_conversion_token','linkedin_access_token'] as $sk) { if (!empty($config[$sk])) $config[$sk] = self::dec((string)$config[$sk]); }
        $tenant = $config['tenant_id'] ?? 'unknown';

        // 209차 P1: 익명 공개 비콘 오염 방어(pixel_id 는 사이트 스니펫에 공개 → 수집·위조 가능).
        //   ① event_name 화이트리스트(임의 라벨 차단) ② value 음수·비현실 상한 클램프
        //   ③ 등록 도메인(config.domain) 있으면 Origin/Referer host 일치 시에만 '신뢰' → 신뢰 외엔
        //      매출집계·CRM 구매기록·매체 포워딩 차단(가짜 구매/매출 주입 무력화). 원시 이벤트는 기록(정직 분석).
        $EVENTS = ['page_view','product_view','view_content','search','add_to_cart','add_to_wishlist','initiate_checkout','add_payment_info','purchase','lead','complete_registration','contact','subscribe','custom'];
        if (!in_array($eventName, $EVENTS, true)) $eventName = 'custom';
        $value = max(0.0, min((float)($b['value'] ?? 0), 1.0e9));
        // [현 차수] 감사 P2(오염차단): 신뢰는 fail-closed. 등록 도메인이 설정된 경우에만 Origin/Referer 호스트
        //   일치 시 신뢰. 도메인 미설정(빈값)은 기존엔 무조건 trusted=true 라 가짜 구매/매출(임의 value) 주입이
        //   가능했다(매출 오염 통로). 이제 도메인 미설정 또는 미등록 픽셀은 비신뢰 → 매출/전환/포워딩 중립화.
        $cfgDomain = strtolower(trim((string)($config['domain'] ?? '')));
        $trusted = false;
        if ($config && $cfgDomain !== '') {
            $orig = $req->getHeaderLine('Origin') ?: $req->getHeaderLine('Referer');
            $reqHost = ($orig !== '' && preg_match('~^https?://([^/:]+)~i', $orig, $hm)) ? strtolower($hm[1]) : '';
            $cfgHost = explode('/', preg_replace('~^https?://~i', '', $cfgDomain))[0];
            $trusted = $reqHost !== '' && ($reqHost === $cfgHost || str_ends_with($reqHost, '.' . $cfgHost));
        }
        // 신뢰 외 비콘은 event='custom'·value=0 으로 중립화(가짜 구매/매출/전환 주입 전면 차단).
        $effEvent = $trusted ? $eventName : 'custom';
        $effValue = $trusted ? $value : 0.0;

        // [225차 P1-5] dedup: 클라이언트 제공 event_id(Meta/TikTok CAPI 표준 eventID) 수용 → UNIQUE 키로
        //   동일 이벤트 재전송(브라우저 픽셀+서버 CAPI 중복, 악의적 replay)을 INSERT IGNORE 로 1회만 적재.
        //   미제공·비정상 형식이면 서버 난수(기존 동작). 안전 문자셋만 허용(주입/충돌 방지).
        $cid = (string)($b['event_id'] ?? '');
        $eventId = (preg_match('/^[A-Za-z0-9._-]{8,64}$/', $cid)) ? ('cid_' . $cid) : ('evt_' . bin2hex(random_bytes(12)));
        $emailHash = !empty($b['email']) ? hash('sha256', strtolower(trim($b['email']))) : null;
        $phoneHash = !empty($b['phone']) ? hash('sha256', preg_replace('/[^0-9]/', '', $b['phone'])) : null;
        $ua = $req->getHeaderLine('User-Agent');
        $deviceType = 'desktop';
        if (preg_match('/Mobile|Android|iPhone|iPad/i', $ua)) { $deviceType = preg_match('/iPad/i', $ua) ? 'tablet' : 'mobile'; }

        // 212차 #6(P2): 공개 비콘 utm_*/url 저장형 XSS·길이남용 방어. prepared 로 SQLi 는 막히나
        //   대시보드(Attribution/PriceOpt) 렌더 시 HTML 주입·과대길이 가능 → 태그·제어문자 제거 + 길이 캡.
        $clean = static function ($v, int $max): ?string {
            if ($v === null) return null;
            $s = strip_tags((string)$v);                       // HTML 태그 제거
            $s = preg_replace('/[\x00-\x1F\x7F]/u', '', $s);     // 제어문자 제거
            $s = trim($s);
            return $s === '' ? null : mb_substr($s, 0, $max);
        };
        $ignore = self::isMysql($pdo) ? 'IGNORE' : 'OR IGNORE';
        $insStmt = $pdo->prepare("INSERT {$ignore} INTO pixel_events
            (tenant_id, event_id, pixel_id, event_name, session_id, user_id, email_hash, phone_hash,
             page_url, referrer, utm_source, utm_medium, utm_campaign, utm_content, utm_term,
             value, currency, product_ids, custom_data, ip_hash, user_agent, device_type, created_at)
            VALUES (:t,:eid,:pid,:en,:sid,:uid,:eh,:ph,:url,:ref,:us,:um,:uc,:uco,:ut,:val,:cur,:prod,:cdata,:iph,:ua,:dev,:ca)
        ");
        $insStmt->execute([
            ':t'=>$tenant, ':eid'=>$eventId, ':pid'=>$pixelId, ':en'=>$effEvent, ':sid'=>$sessionId ?: null,
            ':uid'=>$clean($b['user_id'] ?? null, 120), ':eh'=>$emailHash, ':ph'=>$phoneHash, ':url'=>$clean($b['page_url'] ?? null, 500),
            ':ref'=>$clean($b['referrer'] ?? null, 500), ':us'=>$clean($b['utm_source'] ?? null, 120), ':um'=>$clean($b['utm_medium'] ?? null, 120),
            ':uc'=>$clean($b['utm_campaign'] ?? null, 160), ':uco'=>$clean($b['utm_content'] ?? null, 160), ':ut'=>$clean($b['utm_term'] ?? null, 160),
            ':val'=>$effValue, ':cur'=>$b['currency'] ?? 'KRW', ':prod'=>json_encode($b['product_ids'] ?? []),
            ':cdata'=>json_encode($b['custom_data'] ?? []), ':iph'=>$ipHash, ':ua'=>substr($ua, 0, 500), ':dev'=>$deviceType, ':ca'=>self::now(),
        ]);

        // [225차 P1-5] dedup 가드: 실제 신규 적재(IGNORE 로 스킵 안 됨) 시에만 부수효과 실행.
        //   기존엔 event_id 가 항상 서버난수라 무조건 적재됐으나, 클라 event_id 재전송 replay 시
        //   세션 매출 증분·CRM 구매기록·CAPI 포워딩이 중복 실행돼 매출/전환이 이중 계상될 수 있었다.
        $inserted = $insStmt->rowCount() > 0;
        if ($inserted) {
            if ($sessionId) { self::updateSession($pdo, $tenant, $sessionId, $pixelId, $effEvent, $effValue, $b); }
            if ($trusted && $eventName === 'purchase' && $emailHash) { self::syncToCRM($pdo, $tenant, $eventName, $effValue, $eventId, (string)($b['email'] ?? '')); }
            // [227차 Tier3] Pixel → attribution_touch 브릿지: 1st-party 멀티터치 데이터로 markov 엔진 활성화.
            //   기존엔 픽셀 이벤트가 attribution_touch 에 안 들어가 AttributionEngine(markov-removal-effect)이
            //   실 전환 여정 0 → 항상 빈 결과였다. 이제 마케팅 터치(utm_source 보유)와 구매 전환을 적재한다.
            //   ★오염차단: $trusted(등록 도메인 Origin 일치) 비콘만 적재 — 위조 비콘의 가짜 채널/전환이
            //     attribution 에 주입되는 것을 차단(syncToCRM/매출집계와 동일한 fail-closed 신뢰 모델).
            if ($trusted && $sessionId) { self::bridgeToAttribution($pdo, $tenant, $sessionId, $eventName, $b, $eventId, $effValue); }

            if ($trusted && $config && (int)($config['enabled'] ?? 0) === 1) {
                // [280차 P0] 매칭신호 서버권위 주입. 종전 포워더는 $b['user_agent'](비콘 바디)를 읽었는데 이를 보내는
                //   비콘 자체가 없었고(pixel.js 부재), Meta 는 client_ip_address 를 하드코딩 null 로 보냈다
                //   → 비로그인 이벤트(상단퍼널 대다수)는 매칭신호 0. Reddit/Pinterest 는 "attribution signal 최소 1개"
                //   규격이라 그런 이벤트를 통째로 거부한다. 요청 헤더의 UA·클라이언트 IP 가 위조불가 정본이다.
                $b['user_agent'] = $ua;
                $b['client_ip']  = $ipRaw;
                self::forwardToMeta($pdo, $config, $eventId, $eventName, $emailHash, $phoneHash, $b, $deviceType);
                self::forwardToTikTok($pdo, $config, $eventId, $eventName, $emailHash, $b);
                self::forwardToGA4($pdo, $config, $eventId, $eventName, (string)$sessionId, $b); // [227차 P0] GA4 Measurement Protocol
                self::forwardToPinterest($pdo, $config, $eventId, $eventName, $emailHash, $phoneHash, $b); // [현 차수 P2] Pinterest CAPI
                self::forwardToSnapchat($pdo, $config, $eventId, $eventName, $emailHash, $b);              // [현 차수 P2] Snapchat CAPI
                self::forwardToReddit($pdo, $config, $eventId, $eventName, $emailHash, $b);               // [279차 초고도화] Reddit Conversions API
                self::forwardToLinkedIn($pdo, $config, $eventId, $eventName, $emailHash, $b);            // [280차] LinkedIn Conversions API
            }
        }
        return self::json($res, ['ok' => true, 'event_id' => $eventId, 'deduped' => !$inserted]);
    }

    private static function updateSession(\PDO $pdo, string $tenant, string $sid, string $pixelId, string $eventName, float $value, array $b): void
    {
        // [225차 P1-5] $clean 은 collect() 지역 클로저라 이 메서드 스코프엔 없었다(선재 버그: 신규 세션
        //   INSERT 분기에서 null() 호출 → TypeError fatal → 모든 첫 세션 적재 500). 동일 sanitizer 를 지역 정의.
        $clean = static function ($v, int $max): ?string {
            if ($v === null) return null;
            $s = trim(preg_replace('/[\x00-\x1F\x7F]/u', '', strip_tags((string)$v)));
            return $s === '' ? null : mb_substr($s, 0, $max);
        };
        // 204차 P2: 세션 집계도 tenant_id 로 스코프(공개 비콘이라 session_id 추측 시 타 테넌트 카운터 오염 차단).
        $exists = $pdo->prepare("SELECT session_id FROM pixel_sessions WHERE session_id=:sid AND tenant_id=:t");
        $exists->execute([':sid' => $sid, ':t' => $tenant]);
        $now = self::now();
        if ($exists->fetch()) {
            $pdo->prepare("UPDATE pixel_sessions SET last_event=:le,
                    page_views = page_views + CASE WHEN :en='page_view' THEN 1 ELSE 0 END,
                    add_to_cart = add_to_cart + CASE WHEN :en2='add_to_cart' THEN 1 ELSE 0 END,
                    purchases = purchases + CASE WHEN :en3='purchase' THEN 1 ELSE 0 END,
                    total_revenue = total_revenue + :val,
                    converted = CASE WHEN :en4='purchase' THEN 1 ELSE converted END, updated_at=:ua
                WHERE session_id=:sid AND tenant_id=:t
            ")->execute([':le'=>$now, ':en'=>$eventName, ':en2'=>$eventName, ':en3'=>$eventName, ':en4'=>$eventName, ':val'=>$value, ':ua'=>$now, ':sid'=>$sid, ':t'=>$tenant]);
        } else {
            $pdo->prepare("INSERT INTO pixel_sessions (session_id, tenant_id, pixel_id, first_event, last_event,
                    page_views, add_to_cart, purchases, total_revenue, utm_source, utm_medium, utm_campaign, landing_page, converted, created_at, updated_at)
                VALUES (:sid,:t,:pid,:fe,:le,:pv,:atc,:pur,:val,:us,:um,:uc,:lp,:cv,:ca,:ua)
            ")->execute([
                ':sid'=>$sid, ':t'=>$tenant, ':pid'=>$pixelId, ':fe'=>$now, ':le'=>$now,
                ':pv'=>$eventName === 'page_view' ? 1 : 0, ':atc'=>$eventName === 'add_to_cart' ? 1 : 0, ':pur'=>$eventName === 'purchase' ? 1 : 0,
                ':val'=>$value, ':us'=>$clean($b['utm_source'] ?? null, 120), ':um'=>$clean($b['utm_medium'] ?? null, 120), ':uc'=>$clean($b['utm_campaign'] ?? null, 160),
                ':lp'=>$clean($b['page_url'] ?? null, 500), ':cv'=>$eventName === 'purchase' ? 1 : 0, ':ca'=>$now, ':ua'=>$now,
            ]);
        }
    }

    private static function syncToCRM(\PDO $pdo, string $tenant, string $eventName, float $value, string $eventId, string $email = ''): void
    {
        // [280차 P0] 픽셀 구매를 CRM 활동으로 기록 — 반드시 그 구매를 한 고객(email 매칭)에게만.
        //   ★종전 버그: `SELECT id ... WHERE tenant_id=:t LIMIT 1`(ORDER BY·매칭 없음)이 테넌트의 첫 고객 행에
        //   전 픽셀 매출을 꽂아, 한 명이 전체 매출을 흡수 → LTV/RFM/세그먼트/예측CLV 오염(라이브 crm_activities
        //   집계 기반). 279차까진 픽셀 이벤트 0이라 잠복, 280차 파이프라인 개통으로 실피해가 시작됐다.
        //   collect() 는 $b['email'] 원문을 갖고 있고 crm_customers.email 은 평문 UNIQUE(tenant_id,email)라 매칭 가능하다.
        //   매칭 고객이 없으면 no-op(픽셀 익명 데이터로 CRM 프로필을 임의 생성하지 않는다 — PII 최소화·오염방지).
        $email = strtolower(trim($email));
        if ($email === '') return;
        try {
            $cst = $pdo->prepare("SELECT id FROM crm_customers WHERE tenant_id=:t AND email=:e LIMIT 1");
            $cst->execute([':t' => $tenant, ':e' => $email]);
            $cid = $cst->fetchColumn();
            if (!$cid) return;   // 이 구매자가 CRM 에 없음 → 기장 안 함(첫 고객 오염 금지)

            $ignore = self::isMysql($pdo) ? 'IGNORE' : 'OR IGNORE';
            $type = $eventName === 'purchase' ? 'purchase' : 'event';
            $pdo->prepare("INSERT {$ignore} INTO crm_activities (tenant_id, customer_id, type, channel, amount, data, created_at)
                VALUES (:t,:cid,:type,'pixel',:amt,:data,:ca)
            ")->execute([
                ':t' => $tenant, ':cid' => $cid, ':type' => $type,
                ':amt' => $value, ':data' => json_encode(['source' => 'pixel', 'event_id' => $eventId]), ':ca' => self::now(),
            ]);
            // LTV 재계산(refund 음수 반영) — addActivity 와 동일 규약. 매칭 고객에게만.
            if ($type === 'purchase') {
                $pdo->prepare("UPDATE crm_customers SET ltv=(SELECT COALESCE(SUM(CASE WHEN type='refund' THEN -amount ELSE amount END),0) FROM crm_activities WHERE tenant_id=:t AND customer_id=:cid AND type IN ('purchase','refund')), updated_at=:u WHERE tenant_id=:t AND id=:cid")
                    ->execute([':t' => $tenant, ':cid' => $cid, ':u' => self::now()]);
            }
        } catch (\Exception $e) { /* CRM 테이블 없으면 무시 */ }
    }

    /**
     * [227차 Tier3] Pixel 이벤트 → attribution_touch / attribution_result 브릿지.
     *   AttributionEngine(markov-removal-effect)은 attribution_touch(터치 여정) + attribution_result(전환)을
     *   결합해 채널 기여도를 산출한다. 픽셀이 이 두 테이블에 안 들어가면 markov 는 늘 빈 결과였다.
     *
     *   ① 마케팅 터치(utm_source 보유) → attribution_touch 1행(session_id 기준 비전환 여정 = markov null 경로).
     *   ② 구매(purchase) → 같은 세션의 미귀속 터치에 order_id 백필(멀티터치 전환 여정 완성) + attribution_result
     *      1행 기록(마지막 터치 채널을 attributed_channel 로, 모델=pixel). 이로써 전환 여정이 markov 에 노출된다.
     *
     *   best-effort: 테이블 미존재/오류는 무음(픽셀 수집 성공이 우선). 데모 테넌트도 자기 버킷에만 적재(격리 유지).
     */
    private static function bridgeToAttribution(\PDO $pdo, string $tenant, string $sessionId, string $eventName, array $b, string $eventId, float $value): void
    {
        $cut = static function ($v, int $max = 160): ?string {
            if ($v === null) return null;
            $s = trim(preg_replace('/[\x00-\x1F\x7F]/u', '', strip_tags((string)$v)));
            return $s === '' ? null : mb_substr($s, 0, $max);
        };
        $utmSource   = $cut($b['utm_source']   ?? null, 120);
        $utmMedium   = $cut($b['utm_medium']   ?? null, 120);
        $utmCampaign = $cut($b['utm_campaign'] ?? null, 160);
        $utmContent  = $cut($b['utm_content']  ?? null, 160);
        $utmTerm     = $cut($b['utm_term']     ?? null, 160);
        // 채널 = utm_source(없으면 referrer host). 마케팅 터치가 아니면(direct) 채널 비움 → markov 가 스킵.
        $channel = $utmSource;
        if ($channel === null && !empty($b['referrer'])) {
            $host = parse_url((string)$b['referrer'], PHP_URL_HOST);
            if (is_string($host) && $host !== '') $channel = mb_substr(preg_replace('/^www\./', '', strtolower($host)), 0, 120);
        }
        $isPurchase = ($eventName === 'purchase');
        // 마케팅 터치도 전환도 아니면 적재 불요(잡음 차단).
        if ($channel === null && !$isPurchase) return;

        $now = self::now();
        try {
            // ① 터치 1행 적재(전환이면 order_id 즉시 부여 — 백필 대상에서 자기 자신 포함).
            $orderId = null;
            if ($isPurchase) {
                $cd = is_array($b['custom_data'] ?? null) ? $b['custom_data'] : [];
                $orderId = $cut($b['order_id'] ?? ($cd['order_id'] ?? null), 120) ?: ('PX-' . $eventId);
            }
            // [240차 ⑧-A] 뷰스루 — 노출 추적 태그가 view_through=true 를 보내면 터치에 표기(어트리뷰션 모델이 낮은 가중치 적용).
            $viewThrough = !empty($b['view_through']) || in_array(strtolower((string)($b['interaction'] ?? '')), ['view', 'impression'], true);
            $extra = json_encode(['source' => 'pixel', 'event' => $eventName, 'value' => $value] + ($viewThrough ? ['view_through' => true] : []), JSON_UNESCAPED_UNICODE);
            $pdo->prepare(
                'INSERT INTO attribution_touch
                 (tenant_id,session_id,order_id,channel,utm_source,utm_medium,utm_campaign,
                  utm_content,utm_term,coupon_code,deeplink,touched_at,extra_json)
                 VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)'
            )->execute([$tenant, $sessionId, $orderId, $channel, $utmSource, $utmMedium, $utmCampaign,
                        $utmContent, $utmTerm, null, null, $now, $extra]);

            // ② 구매: 같은 세션의 미귀속 터치에 order_id 백필 + 전환 결과 기록.
            if ($isPurchase) {
                $pdo->prepare(
                    "UPDATE attribution_touch SET order_id=? WHERE tenant_id=? AND session_id=? AND (order_id IS NULL OR order_id='')"
                )->execute([$orderId, $tenant, $sessionId]);
                // attributed_channel = 마지막 마케팅 터치 채널(없으면 현재 채널/direct).
                $attrCh = $channel ?? 'direct';
                try {
                    $lt = $pdo->prepare(
                        "SELECT channel FROM attribution_touch WHERE tenant_id=? AND order_id=? AND channel IS NOT NULL AND channel<>'' ORDER BY touched_at DESC, id DESC LIMIT 1"
                    );
                    $lt->execute([$tenant, $orderId]);
                    $lc = $lt->fetchColumn();
                    if ($lc) $attrCh = (string)$lc;
                } catch (\Throwable $e) {}
                $evidence = json_encode(['source' => 'pixel', 'session_id' => $sessionId, 'value' => $value], JSON_UNESCAPED_UNICODE);
                $ignore = self::isMysql($pdo) ? 'IGNORE' : 'OR IGNORE';
                // [228차 일관성 P0] ★order당 전환 1행 멱등 — attribution_result 에 UNIQUE 키가 없어 INSERT IGNORE 만으론
                //   중복 방지 불가. 이미 적재된 전환이 있으면 skip(전환 이중계산·markov/ROAS 왜곡 방지, first-writer-wins).
                $arChk = $pdo->prepare("SELECT 1 FROM attribution_result WHERE tenant_id=? AND order_id=? LIMIT 1");
                $arChk->execute([$tenant, $orderId]);
                if (!$arChk->fetchColumn()) {
                    $pdo->prepare(
                        "INSERT {$ignore} INTO attribution_result(tenant_id,order_id,attributed_channel,confidence_score,evidence_json,model,created_at)
                         VALUES(?,?,?,?,?,?,?)"
                    )->execute([$tenant, $orderId, $attrCh, 1.0, $evidence, 'pixel', $now]);
                }
            }
        } catch (\Throwable $e) { /* attribution_touch/result 미존재 등 — best-effort */ }
    }

    /** [280차 P1] 매체 dedup event_id — 주문 기반 서버전환 cron(AdAdapters::uploadPendingServerConversions)은
     *  같은 구매를 ch_order_id 로 매체에 올린다. 픽셀 forward 가 다른 event_id(cid_/evt_ 접두)를 쓰면
     *  Meta/TikTok 이 dedup 하지 못해 동일 구매가 2건의 Purchase 로 계상된다(자동입찰·ROAS 왜곡).
     *  purchase 에 order_id 가 실리면 cron 과 동일 규칙으로 맞춰 매체가 dedup 하게 한다. (DB 의 forwarded_* 는
     *  실제 pixel_events.event_id 로 갱신 — 이 값은 payload 전용이다.) */
    private static function capiDedupId(string $channel, string $eventId, string $eventName, array $b): string
    {
        if ($eventName === 'purchase' && !empty($b['order_id'])) {
            $oid = preg_replace('/[^A-Za-z0-9._-]/', '', (string)$b['order_id']);
            if ($oid !== '') return $channel . '_' . $oid;
        }
        return $eventId;
    }

    private static function forwardToMeta(\PDO $pdo, array $cfg, string $eventId, string $eventName, ?string $emailHash, ?string $phoneHash, array $b, string $deviceType): void
    {
        if (empty($cfg['meta_pixel_id']) || empty($cfg['meta_api_token'])) return;
        $metaEventMap = ['page_view'=>'PageView', 'view_content'=>'ViewContent', 'add_to_cart'=>'AddToCart', 'initiate_checkout'=>'InitiateCheckout', 'purchase'=>'Purchase', 'lead'=>'Lead', 'subscribe'=>'Subscribe'];
        $metaEvent = $metaEventMap[$eventName] ?? 'CustomEvent';
        $dedupId = self::capiDedupId('meta', $eventId, $eventName, $b);
        $payload = ['data' => [[
            'event_name'=>$metaEvent, 'event_time'=>time(), 'event_id'=>$dedupId, 'event_source_url'=>$b['page_url'] ?? '', 'action_source'=>'website',
            // [280차] fbc/fbp = Meta 매칭품질(EMQ) 최상위 신호. pixel.js 가 _fbc/_fbp 쿠키·fbclid 합성으로 실어 보낸다.
            'user_data'=>array_filter([
                'em'=>$emailHash ? [$emailHash] : null, 'ph'=>$phoneHash ? [$phoneHash] : null,
                'client_ip_address'=>$b['client_ip'] ?? null, 'client_user_agent'=>$b['user_agent'] ?? '',
                'fbc'=>$b['fbc'] ?? null, 'fbp'=>$b['fbp'] ?? null,
                'external_id'=>!empty($b['user_id']) ? hash('sha256', strtolower(trim((string)$b['user_id']))) : null,
            ]),
            'custom_data'=>array_filter(['value'=>(float)($b['value'] ?? 0) ?: null, 'currency'=>$b['currency'] ?? 'KRW', 'content_ids'=>$b['product_ids'] ?? null]),
        ]]];
        try {
            $ch = curl_init("https://graph.facebook.com/v18.0/{$cfg['meta_pixel_id']}/events?access_token={$cfg['meta_api_token']}");
            curl_setopt_array($ch, [CURLOPT_POST=>true, CURLOPT_POSTFIELDS=>json_encode($payload), CURLOPT_RETURNTRANSFER=>true, CURLOPT_TIMEOUT=>5, CURLOPT_HTTPHEADER=>['Content-Type: application/json']]);
            // [현 차수 P3-3] 전달확인 — 응답코드 확인(기존 fire-and-forget→실패도 forwarded=1 표기 갭). 2xx 만 성공표기,
            //   실패는 로그(무음실패 가시화). events_received(EMQ 피드백)도 로그.
            $resp = curl_exec($ch); $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE); $err = curl_error($ch); curl_close($ch);
            if ($code >= 200 && $code < 300) {
                $pdo->prepare("UPDATE pixel_events SET forwarded_meta=1 WHERE event_id=:eid")->execute([':eid'=>$eventId]);
            } else {
                error_log("[CAPI meta] event={$eventId} http={$code} err={$err} resp=" . substr((string)$resp, 0, 200));
            }
        } catch (\Exception $e) {}
    }

    /** [현 차수 P2] Pinterest Conversions API (v5) — 서버측 전환 전송. 패턴=forwardToMeta. */
    private static function forwardToPinterest(\PDO $pdo, array $cfg, string $eventId, string $eventName, ?string $emailHash, ?string $phoneHash, array $b): void
    {
        if (empty($cfg['pinterest_ad_account_id']) || empty($cfg['pinterest_conversion_token'])) return;
        $map = ['page_view'=>'page_visit', 'view_content'=>'view_category', 'product_view'=>'view_category', 'add_to_cart'=>'add_to_cart', 'initiate_checkout'=>'checkout', 'purchase'=>'checkout', 'lead'=>'lead', 'subscribe'=>'signup', 'complete_registration'=>'signup'];
        $ev = $map[$eventName] ?? 'custom';
        $payload = ['data' => [array_filter([
            'event_name'=>$ev, 'action_source'=>'web', 'event_time'=>time(), 'event_id'=>$eventId, 'event_source_url'=>$b['page_url'] ?? null,
            // [280차] client_ip_address·click_id(epik) 추가 — Pinterest 는 매칭신호 부재 이벤트를 거부한다.
            'user_data'=>array_filter([
                'em'=>$emailHash ? [$emailHash] : null, 'ph'=>$phoneHash ? [$phoneHash] : null,
                'client_user_agent'=>$b['user_agent'] ?? null, 'client_ip_address'=>$b['client_ip'] ?? null,
                'click_id'=>$b['epik'] ?? null,
            ]),
            'custom_data'=>array_filter(['value'=>((float)($b['value'] ?? 0) ?: null) ? (string)(float)$b['value'] : null, 'currency'=>$b['currency'] ?? 'KRW']),
        ], fn($v) => $v !== null && $v !== [])]];
        try {
            $ch = curl_init("https://api.pinterest.com/v5/ad_accounts/{$cfg['pinterest_ad_account_id']}/events");
            curl_setopt_array($ch, [CURLOPT_POST=>true, CURLOPT_POSTFIELDS=>json_encode($payload), CURLOPT_RETURNTRANSFER=>true, CURLOPT_TIMEOUT=>5, CURLOPT_HTTPHEADER=>['Content-Type: application/json', 'Authorization: Bearer '.$cfg['pinterest_conversion_token']]]);
            $resp = curl_exec($ch); $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE); curl_close($ch); // [현 차수 P3-3] 전달확인
            if ($code >= 200 && $code < 300) { try { $pdo->prepare("UPDATE pixel_events SET forwarded_pinterest=1 WHERE event_id=:eid")->execute([':eid'=>$eventId]); } catch (\Throwable $e) {} }
            else error_log("[CAPI pinterest] event={$eventId} http={$code} resp=" . substr((string)$resp, 0, 160));
        } catch (\Exception $e) {}
    }

    /** [현 차수 P2] Snapchat Conversions API (v3) — 서버측 전환 전송. 패턴=forwardToMeta. */
    private static function forwardToSnapchat(\PDO $pdo, array $cfg, string $eventId, string $eventName, ?string $emailHash, array $b): void
    {
        if (empty($cfg['snap_pixel_id']) || empty($cfg['snap_api_token'])) return;
        $map = ['page_view'=>'PAGE_VIEW', 'view_content'=>'VIEW_CONTENT', 'product_view'=>'VIEW_CONTENT', 'add_to_cart'=>'ADD_CART', 'initiate_checkout'=>'START_CHECKOUT', 'purchase'=>'PURCHASE', 'lead'=>'SIGN_UP', 'subscribe'=>'SUBSCRIBE'];
        $ev = $map[$eventName] ?? 'CUSTOM_EVENT_1';
        $payload = ['data' => [array_filter([
            'event_name'=>$ev, 'action_source'=>'WEB', 'event_time'=>time() * 1000, 'event_id'=>$eventId, 'event_source_url'=>$b['page_url'] ?? null,
            // [280차] client_ip_address·sc_click_id 추가 — Snapchat CAPI 도 매칭신호 최소 1개 요구.
            'user_data'=>array_filter([
                'em'=>$emailHash ? [$emailHash] : null, 'client_user_agent'=>$b['user_agent'] ?? null,
                'client_ip_address'=>$b['client_ip'] ?? null, 'sc_click_id'=>$b['sc_cid'] ?? null,
            ]),
            'custom_data'=>array_filter(['value'=>(float)($b['value'] ?? 0) ?: null, 'currency'=>$b['currency'] ?? 'KRW']),
        ], fn($v) => $v !== null && $v !== [])]];
        try {
            $ch = curl_init("https://tr.snapchat.com/v3/{$cfg['snap_pixel_id']}/events?access_token=" . urlencode((string)$cfg['snap_api_token']));
            curl_setopt_array($ch, [CURLOPT_POST=>true, CURLOPT_POSTFIELDS=>json_encode($payload), CURLOPT_RETURNTRANSFER=>true, CURLOPT_TIMEOUT=>5, CURLOPT_HTTPHEADER=>['Content-Type: application/json']]);
            $resp = curl_exec($ch); $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE); curl_close($ch); // [현 차수 P3-3] 전달확인
            if ($code >= 200 && $code < 300) { try { $pdo->prepare("UPDATE pixel_events SET forwarded_snap=1 WHERE event_id=:eid")->execute([':eid'=>$eventId]); } catch (\Throwable $e) {} }
            else error_log("[CAPI snapchat] event={$eventId} http={$code} resp=" . substr((string)$resp, 0, 160));
        } catch (\Exception $e) {}
    }

    /** [279차 M2 초고도화] Reddit Conversions API (v2.0) — 서버측 전환 전송. 패턴=forwardToPinterest.
     *   자격증명 미등록 시 no-op(honest). 이메일 sha256(Reddit 요구 소문자→sha256, emailHash 는 상위서 이미 정규화). */
    private static function forwardToReddit(\PDO $pdo, array $cfg, string $eventId, string $eventName, ?string $emailHash, array $b): void
    {
        if (empty($cfg['reddit_ad_account_id']) || empty($cfg['reddit_conversion_token'])) return;
        $map = ['page_view'=>'PageVisit', 'view_content'=>'ViewContent', 'product_view'=>'ViewContent', 'add_to_cart'=>'AddToCart',
                'initiate_checkout'=>'AddToCart', 'purchase'=>'Purchase', 'lead'=>'Lead', 'subscribe'=>'SignUp', 'complete_registration'=>'SignUp', 'search'=>'Search'];
        $tracking = $map[$eventName] ?? 'Custom';
        $payload = ['events' => [array_filter([
            'event_at'       => gmdate('Y-m-d\TH:i:s\Z'),
            'event_type'     => ['tracking_type' => $tracking],
            'click_id'       => $b['rdt_cid'] ?? null,   // 스펙상 최상위(event_at/action_source/test_mode 와 동렬)
            // [280차] ip_address·uuid(_rdt_uuid 쿠키)·external_id 추가. Reddit 은 attribution signal 최소 1개를
            //   요구하는데 종전엔 email 뿐이라 비로그인 이벤트(대다수)가 통째로 거부됐다.
            'user'           => array_filter([
                'email'      => $emailHash ?: null,
                'user_agent' => $b['user_agent'] ?? null,
                'ip_address' => $b['client_ip'] ?? null,
                'uuid'       => $b['rdt_uuid'] ?? null,
                'external_id'=> !empty($b['user_id']) ? hash('sha256', strtolower(trim((string)$b['user_id']))) : null,
            ]),
            'event_metadata' => array_filter([
                'currency'      => $b['currency'] ?? 'KRW',
                'value_decimal' => (float)($b['value'] ?? 0) ?: null,
                'item_count'    => isset($b['item_count']) ? (int)$b['item_count'] : null,
                'conversion_id' => $eventId, // 픽셀 이벤트와 dedup
            ], fn($v) => $v !== null),
        ], fn($v) => $v !== null && $v !== [])]];
        try {
            $ch = curl_init('https://ads-api.reddit.com/api/v2.0/conversions/events/' . rawurlencode((string)$cfg['reddit_ad_account_id']));
            curl_setopt_array($ch, [CURLOPT_POST=>true, CURLOPT_POSTFIELDS=>json_encode($payload), CURLOPT_RETURNTRANSFER=>true, CURLOPT_TIMEOUT=>5, CURLOPT_HTTPHEADER=>['Content-Type: application/json', 'Authorization: Bearer '.$cfg['reddit_conversion_token']]]);
            $resp = curl_exec($ch); $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE); curl_close($ch); // 전달확인(2xx만 성공표기)
            if ($code >= 200 && $code < 300) { try { $pdo->prepare("UPDATE pixel_events SET forwarded_reddit=1 WHERE event_id=:eid")->execute([':eid'=>$eventId]); } catch (\Throwable $e) {} }
            else error_log("[CAPI reddit] event={$eventId} http={$code} resp=" . substr((string)$resp, 0, 160));
        } catch (\Exception $e) {}
    }

    /** [280차] LinkedIn Conversions API — 서버측 전환 스트리밍.
     *  POST /rest/conversionEvents (성공 201). 전환룰(conversionMethod=CONVERSIONS_API)을 LinkedIn 쪽에서
     *  미리 만들고 그 URN 을 등록해야 한다. 룰은 type(PURCHASE/LEAD/…)이 고정이라 이벤트를 무차별 전송하면
     *  룰이 오염된다 → linkedin_events 화이트리스트(기본 purchase)로만 발사.
     *  매칭 식별자는 최소 1개 필수(SHA256_EMAIL / LINKEDIN_FIRST_PARTY_ADS_TRACKING_UUID(li_fat_id) /
     *  PLAINTEXT_IP_ADDRESS) — 하나도 없으면 400 이므로 아예 보내지 않는다(정직 no-op).
     *  전환 시각은 과거 90일 이내만 유효(현재 이벤트라 항상 충족).
     */
    private static function forwardToLinkedIn(\PDO $pdo, array $cfg, string $eventId, string $eventName, ?string $emailHash, array $b): void
    {
        if (empty($cfg['linkedin_conversion_urn']) || empty($cfg['linkedin_access_token'])) return;

        $allowed = array_filter(array_map('trim', explode(',', strtolower((string)($cfg['linkedin_events'] ?? '')))));
        if (!$allowed) $allowed = ['purchase'];
        if (!in_array($eventName, $allowed, true)) return;

        // 숫자 ID 만 입력한 경우도 흡수(사용자 실수 방지). 이미 URN 이면 그대로.
        $urn = trim((string)$cfg['linkedin_conversion_urn']);
        if (ctype_digit($urn)) $urn = 'urn:lla:llaPartnerConversion:' . $urn;

        $userIds = [];
        if ($emailHash)                   $userIds[] = ['idType'=>'SHA256_EMAIL', 'idValue'=>$emailHash];
        if (!empty($b['li_fat_id']))      $userIds[] = ['idType'=>'LINKEDIN_FIRST_PARTY_ADS_TRACKING_UUID', 'idValue'=>(string)$b['li_fat_id']];
        if (!empty($b['client_ip']))      $userIds[] = ['idType'=>'PLAINTEXT_IP_ADDRESS', 'idValue'=>(string)$b['client_ip']];
        if (!$userIds) return;            // 식별자 0 → LinkedIn 이 400 으로 거부. 발사 자체를 안 한다.

        $val = (float)($b['value'] ?? 0);
        $payload = array_filter([
            'conversion'           => $urn,
            'conversionHappenedAt' => time() * 1000,                       // ms epoch
            'conversionValue'      => $val > 0 ? ['currencyCode'=>$b['currency'] ?? 'KRW', 'amount'=>(string)$val] : null,
            'user'                 => ['userIds'=>$userIds],
            'eventId'              => $eventId,                            // 브라우저 픽셀과 dedup
        ], fn($v) => $v !== null);

        try {
            $ch = curl_init('https://api.linkedin.com/rest/conversionEvents');
            curl_setopt_array($ch, [CURLOPT_POST=>true, CURLOPT_POSTFIELDS=>json_encode($payload), CURLOPT_RETURNTRANSFER=>true, CURLOPT_TIMEOUT=>5, CURLOPT_HTTPHEADER=>[
                'Content-Type: application/json',
                'Authorization: Bearer ' . $cfg['linkedin_access_token'],
                'LinkedIn-Version: ' . gmdate('Ym'),                       // 필수 헤더(YYYYMM)
                'X-Restli-Protocol-Version: 2.0.0',                        // 필수 헤더
            ]]);
            $resp = curl_exec($ch); $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE); curl_close($ch);
            if ($code >= 200 && $code < 300) { try { $pdo->prepare("UPDATE pixel_events SET forwarded_linkedin=1 WHERE event_id=:eid")->execute([':eid'=>$eventId]); } catch (\Throwable $e) {} }
            else error_log("[CAPI linkedin] event={$eventId} http={$code} resp=" . substr((string)$resp, 0, 160));
        } catch (\Exception $e) {}
    }

    private static function forwardToTikTok(\PDO $pdo, array $cfg, string $eventId, string $eventName, ?string $emailHash, array $b): void
    {
        if (empty($cfg['tiktok_pixel_id']) || empty($cfg['tiktok_access_token'])) return;
        $tiktokEventMap = ['page_view'=>'PageView', 'view_content'=>'ViewContent', 'add_to_cart'=>'AddToCart', 'purchase'=>'CompletePayment', 'lead'=>'SubmitForm'];
        $tiktokEvent = $tiktokEventMap[$eventName] ?? 'CustomEvent';
        $dedupId = self::capiDedupId('tiktok', $eventId, $eventName, $b);   // [280차 P1] 주문 서버전환 cron 과 dedup
        $payload = ['pixel_code'=>$cfg['tiktok_pixel_id'], 'event'=>$tiktokEvent, 'event_id'=>$dedupId, 'timestamp'=>gmdate('Y-m-d\TH:i:s+00:00'),
            // [280차] ip·user_agent·ad.callback(ttclid) 추가 — TikTok 매칭키. 종전엔 sha256_email 뿐이라
            //   비로그인 이벤트 매칭 불가(page_view/add_to_cart 대다수).
            'context'=>array_filter([
                'page'=>array_filter(['url'=>$b['page_url'] ?? '', 'referrer'=>$b['referrer'] ?? null]),
                'user'=>array_filter(['sha256_email'=>$emailHash]),
                'ad'=>array_filter(['callback'=>$b['ttclid'] ?? null]),
                'ip'=>$b['client_ip'] ?? null,
                'user_agent'=>$b['user_agent'] ?? null,
            ], fn($v) => $v !== null && $v !== []),
            'properties'=>array_filter(['value'=>(float)($b['value'] ?? 0) ?: null, 'currency'=>$b['currency'] ?? 'KRW', 'content_id'=>!empty($b['product_ids']) ? $b['product_ids'][0] : null])];
        try {
            $ch = curl_init('https://business-api.tiktok.com/open_api/v1.3/pixel/track/');
            curl_setopt_array($ch, [CURLOPT_POST=>true, CURLOPT_POSTFIELDS=>json_encode($payload), CURLOPT_RETURNTRANSFER=>true, CURLOPT_TIMEOUT=>5, CURLOPT_HTTPHEADER=>['Content-Type: application/json', 'Access-Token: '.$cfg['tiktok_access_token']]]);
            $resp = curl_exec($ch); $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE); curl_close($ch); // [현 차수 P3-3] 전달확인
            if ($code >= 200 && $code < 300) { $pdo->prepare("UPDATE pixel_events SET forwarded_tiktok=1 WHERE event_id=:eid")->execute([':eid'=>$eventId]); }
            else error_log("[CAPI tiktok] event={$eventId} http={$code} resp=" . substr((string)$resp, 0, 160));
        } catch (\Exception $e) {}
    }

    /**
     * [227차 P0] GA4 Measurement Protocol 서버측 포워딩. 기존엔 ga4_measurement_id/ga4_api_secret 를
     *   수집·저장만 하고 실제 전송 메서드가 없어 GA4 측정이 단절됐다(거짓 기능). 이제 trusted 구매/이벤트를
     *   GA4 로 server-to-server 전송한다. client_id 는 픽셀 session_id(세션 일관성), 표준 GA4 이벤트로 매핑.
     */
    private static function forwardToGA4(\PDO $pdo, array $cfg, string $eventId, string $eventName, string $sessionId, array $b): void
    {
        if (empty($cfg['ga4_measurement_id']) || empty($cfg['ga4_api_secret'])) return;
        $map = ['page_view'=>'page_view', 'view_content'=>'view_item', 'product_view'=>'view_item', 'add_to_cart'=>'add_to_cart',
                'initiate_checkout'=>'begin_checkout', 'add_payment_info'=>'add_payment_info', 'purchase'=>'purchase',
                'lead'=>'generate_lead', 'subscribe'=>'sign_up', 'complete_registration'=>'sign_up'];
        $ev = $map[$eventName] ?? $eventName;
        $clientId = $sessionId !== '' ? $sessionId : ('px.' . substr($eventId, 0, 16));
        $params = array_filter([
            'currency'             => $b['currency'] ?? 'KRW',
            'value'                => (float)($b['value'] ?? 0) ?: null,
            'transaction_id'       => $ev === 'purchase' ? $eventId : null,
            'page_location'        => $b['page_url'] ?? null,
            'session_id'           => $sessionId !== '' ? $sessionId : null,
            'engagement_time_msec' => 1,
        ], static fn($v) => $v !== null);
        $payload = ['client_id' => $clientId, 'events' => [['name' => $ev, 'params' => $params]]];
        try {
            $url = 'https://www.google-analytics.com/mp/collect?measurement_id=' . urlencode((string)$cfg['ga4_measurement_id'])
                 . '&api_secret=' . urlencode((string)$cfg['ga4_api_secret']);
            $ch = curl_init($url);
            curl_setopt_array($ch, [CURLOPT_POST=>true, CURLOPT_POSTFIELDS=>json_encode($payload), CURLOPT_RETURNTRANSFER=>true, CURLOPT_TIMEOUT=>5, CURLOPT_HTTPHEADER=>['Content-Type: application/json']]);
            // [현 차수 P3-3] 전달확인 — GA4 MP 성공=204 No Content(2xx 포함). 실패만 로그.
            $resp = curl_exec($ch); $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE); curl_close($ch);
            if ($code >= 200 && $code < 300) { try { $pdo->prepare("UPDATE pixel_events SET forwarded_ga4=1 WHERE event_id=:eid")->execute([':eid'=>$eventId]); } catch (\Throwable $e) { /* 컬럼 부재 무시 */ } }
            else error_log("[CAPI ga4] event={$eventId} http={$code} resp=" . substr((string)$resp, 0, 160));
        } catch (\Exception $e) {}
    }

    /* ─── GET /pixel/configs ─── 픽셀 설정 목록 ────────────── */
    public static function listConfigs(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $tenant = self::tenant($req);
        // [281차 P2] 어느 CAPI 채널이 설정됐는지 boolean 으로 반환(자격증명 값 자체는 노출 금지·편집 UI 표시용).
        //   종전엔 meta/tiktok/ga4/pinterest/snap/reddit/linkedin 설정 여부를 대시보드가 알 수 없었다.
        $rows = self::db()->prepare("SELECT * FROM pixel_configs WHERE tenant_id=? ORDER BY created_at DESC");
        $rows->execute([$tenant]);
        $configs = [];
        foreach ($rows->fetchAll(\PDO::FETCH_ASSOC) as $r) {
            $configs[] = [
                'id' => $r['id'] ?? null, 'pixel_id' => $r['pixel_id'] ?? '', 'name' => $r['name'] ?? '',
                'domain' => $r['domain'] ?? '', 'enabled' => (int)($r['enabled'] ?? 1), 'created_at' => $r['created_at'] ?? '',
                'capi' => [
                    'meta'      => !empty($r['meta_pixel_id']) && !empty($r['meta_api_token']),
                    'tiktok'    => !empty($r['tiktok_pixel_id']) && !empty($r['tiktok_access_token']),
                    'ga4'       => !empty($r['ga4_measurement_id']) && !empty($r['ga4_api_secret']),
                    'pinterest' => !empty($r['pinterest_ad_account_id']) && !empty($r['pinterest_conversion_token']),
                    'snap'      => !empty($r['snap_pixel_id']) && !empty($r['snap_api_token']),
                    'reddit'    => !empty($r['reddit_ad_account_id']) && !empty($r['reddit_conversion_token']),
                    'linkedin'  => !empty($r['linkedin_conversion_urn']) && !empty($r['linkedin_access_token']),
                ],
            ];
        }
        return self::json($res, ['ok' => true, 'configs' => $configs]);
    }

    /* ─── PUT /pixel/configs/{id} ─── 기존 픽셀 부분갱신(CAPI 자격증명 주입) ─────
     *   [281차 P2] 종전엔 생성(POST)·삭제만 있어 279차 이전에 만든 픽셀에 GA4/Pinterest/Snap/Reddit/LinkedIn
     *   자격증명을 넣을 방법이 없었다(재생성하면 pixel_id 가 바뀌어 고객사 스니펫 전면 재설치 필요). 부분갱신:
     *   빈 문자열/미전송 필드는 미변경(기존 시크릿 보존), 값이 오면 갱신. 토큰류는 at-rest 암호화. */
    public static function updateConfig(Request $req, Response $res, array $args): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $pdo = self::db();
        $tenant = self::tenant($req);
        $b = (array)$req->getParsedBody();
        $id = (int)($args['id'] ?? ($b['id'] ?? 0));
        if ($id <= 0) return self::json($res, ['ok' => false, 'error' => 'id 필요'], 422);

        // 소유권 검증
        $own = $pdo->prepare("SELECT id FROM pixel_configs WHERE id=:id AND tenant_id=:t LIMIT 1");
        $own->execute([':id' => $id, ':t' => $tenant]);
        if (!$own->fetchColumn()) return self::json($res, ['ok' => false, 'error' => '픽셀 없음'], 404);

        // 필드별 부분갱신 — 평문 컬럼과 암호화 컬럼 구분. 빈값/미전송은 스킵(기존값 보존).
        $plain = ['name', 'meta_pixel_id', 'tiktok_pixel_id', 'ga4_measurement_id', 'pinterest_ad_account_id', 'snap_pixel_id', 'reddit_ad_account_id', 'linkedin_conversion_urn', 'linkedin_events'];
        $enc   = ['meta_api_token', 'tiktok_access_token', 'ga4_api_secret', 'pinterest_conversion_token', 'snap_api_token', 'reddit_conversion_token', 'linkedin_access_token'];
        $sets = []; $vals = [];
        foreach ($plain as $f) { if (isset($b[$f]) && $b[$f] !== '') { $sets[] = "$f=?"; $vals[] = (string)$b[$f]; } }
        foreach ($enc as $f)   { if (isset($b[$f]) && $b[$f] !== '') { $sets[] = "$f=?"; $vals[] = self::enc((string)$b[$f]); } }
        // domain 은 갱신 허용하되 비우기는 금지(수집 신뢰모델). enabled 토글 허용.
        if (isset($b['domain']) && trim((string)$b['domain']) !== '') {
            $dom = strtolower(trim((string)$b['domain'])); $dom = preg_replace('~^https?://~i', '', $dom); $dom = explode('/', $dom)[0];
            if ($dom !== '') { $sets[] = "domain=?"; $vals[] = $dom; }
        }
        if (isset($b['enabled'])) { $sets[] = "enabled=?"; $vals[] = ((int)$b['enabled']) ? 1 : 0; }
        if (!$sets) return self::json($res, ['ok' => true, 'unchanged' => true]);

        $sets[] = "updated_at=?"; $vals[] = self::now();
        $vals[] = $id; $vals[] = $tenant;
        $pdo->prepare("UPDATE pixel_configs SET " . implode(', ', $sets) . " WHERE id=? AND tenant_id=?")->execute($vals);
        return self::json($res, ['ok' => true, 'id' => $id]);
    }

    /* ─── POST /pixel/configs ─── 픽셀 생성 ─────────────────── */
    public static function createConfig(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $pdo = self::db();
        $tenant = self::tenant($req);
        $b = (array)$req->getParsedBody();
        // [280차] 도메인 필수(서버 게이트 — 프론트 검증만으론 API 직접 호출로 우회된다).
        //   수집 신뢰모델이 fail-closed 라 domain 이 비면 Origin 일치 판정 자체가 불가능해 모든 이벤트가
        //   'custom'·value=0 으로 중립화된다(collect() $trusted) → 픽셀이 조용히 무용지물이 된다.
        //   종전엔 선택 입력이라 도메인 없이 만든 픽셀이 그대로 그 함정에 빠졌다.
        $domain = strtolower(trim((string)($b['domain'] ?? '')));
        $domain = preg_replace('~^https?://~i', '', $domain);   // 사용자가 URL 을 붙여넣는 흔한 실수 흡수
        $domain = explode('/', $domain)[0];
        if ($domain === '') {
            return self::json($res, ['ok'=>false, 'error'=>'도메인은 필수입니다. 픽셀을 설치할 사이트 도메인(예: shop.example.com)을 입력하세요 — 도메인이 없으면 이벤트가 수집되지 않습니다.'], 400);
        }
        $pixelId = self::genPixelId(); // [현 차수] HMAC 서명 pixel_id(위조 차단)
        $now = self::now();
        $pdo->prepare("INSERT INTO pixel_configs (tenant_id, pixel_id, name, domain, meta_pixel_id, meta_api_token, tiktok_pixel_id, tiktok_access_token, ga4_measurement_id, ga4_api_secret, pinterest_ad_account_id, pinterest_conversion_token, snap_pixel_id, snap_api_token, reddit_ad_account_id, reddit_conversion_token, linkedin_conversion_urn, linkedin_access_token, linkedin_events, created_at, updated_at)
            VALUES (:t,:pid,:name,:dom,:mpid,:mapi,:tpid,:tapi,:ga4id,:ga4sec,:pinid,:pintok,:snpid,:sntok,:rdid,:rdtok,:liurn,:litok,:liev,:ca,:ua)
        ")->execute([
            ':t'=>$tenant, ':pid'=>$pixelId, ':name'=>$b['name'] ?? '기본 픽셀', ':dom'=>$domain,
            ':mpid'=>$b['meta_pixel_id'] ?? '', ':mapi'=>self::enc($b['meta_api_token'] ?? ''), ':tpid'=>$b['tiktok_pixel_id'] ?? '',
            ':tapi'=>self::enc($b['tiktok_access_token'] ?? ''), ':ga4id'=>$b['ga4_measurement_id'] ?? '', ':ga4sec'=>self::enc($b['ga4_api_secret'] ?? ''),
            ':pinid'=>$b['pinterest_ad_account_id'] ?? '', ':pintok'=>self::enc($b['pinterest_conversion_token'] ?? ''),
            ':snpid'=>$b['snap_pixel_id'] ?? '', ':sntok'=>self::enc($b['snap_api_token'] ?? ''),
            ':rdid'=>$b['reddit_ad_account_id'] ?? '', ':rdtok'=>self::enc($b['reddit_conversion_token'] ?? ''),
            // [280차] LinkedIn — 전환룰 URN·토큰·이벤트 화이트리스트(미지정 시 purchase 만).
            ':liurn'=>$b['linkedin_conversion_urn'] ?? '', ':litok'=>self::enc($b['linkedin_access_token'] ?? ''),
            ':liev'=>$b['linkedin_events'] ?? 'purchase',
            ':ca'=>$now, ':ua'=>$now,
        ]);
        return self::json($res, ['ok' => true, 'pixel_id' => $pixelId]);
    }

    /* ─── GET /pixel/analytics ─── 통합 분석 (테넌트 스코프) ────────── */
    public static function analytics(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $pdo = self::db();
        $tenant = self::tenant($req);
        $p = $req->getQueryParams();
        $days  = max(1, min(90, (int)($p['days'] ?? 30)));
        $pixelId = $p['pixel_id'] ?? '';
        $cut = self::cutoff($days);

        $where = "tenant_id=:t AND created_at >= :cut";
        $bind  = [':t'=>$tenant, ':cut'=>$cut];
        if ($pixelId) { $where .= " AND pixel_id=:pid"; $bind[':pid'] = $pixelId; }

        $run = function(string $sql) use ($pdo, $bind) { $s = $pdo->prepare($sql); $s->execute($bind); return $s; };

        $events = $run("SELECT event_name, COUNT(*) AS total, COUNT(DISTINCT session_id) AS unique_sessions, COALESCE(SUM(value),0) AS total_value FROM pixel_events WHERE $where GROUP BY event_name ORDER BY total DESC")->fetchAll(\PDO::FETCH_ASSOC);
        // [280차 P1] '세션'은 COUNT(DISTINCT session_id) 여야 한다 — 종전 COUNT(*)는 page_view 등 전 이벤트 행을
        //   세어 세션을 수십 배 부풀렸고(형제 unique_sessions 쿼리는 이미 DISTINCT), 그 결과 채널 전환율(전환/세션)이
        //   수십 배 과소로 보였다.
        $channels = $run("SELECT COALESCE(utm_source,'direct') AS source, COALESCE(utm_medium,'none') AS medium, COUNT(DISTINCT session_id) AS sessions, SUM(CASE WHEN event_name='purchase' THEN 1 ELSE 0 END) AS conversions, COALESCE(SUM(CASE WHEN event_name='purchase' THEN value ELSE 0 END),0) AS revenue FROM pixel_events WHERE $where GROUP BY utm_source, utm_medium ORDER BY revenue DESC LIMIT 20")->fetchAll(\PDO::FETCH_ASSOC);

        $funnelData = ['page_view'=>0,'view_content'=>0,'add_to_cart'=>0,'initiate_checkout'=>0,'purchase'=>0];
        foreach ($run("SELECT event_name, COUNT(*) AS cnt FROM pixel_events WHERE $where AND event_name IN ('page_view','view_content','add_to_cart','initiate_checkout','purchase') GROUP BY event_name")->fetchAll(\PDO::FETCH_ASSOC) as $row) {
            $funnelData[$row['event_name']] = (int)$row['cnt'];
        }
        $timeSeries = $run("SELECT DATE(created_at) AS dt, COUNT(*) AS events, SUM(CASE WHEN event_name='purchase' THEN 1 ELSE 0 END) AS purchases, COALESCE(SUM(CASE WHEN event_name='purchase' THEN value ELSE 0 END),0) AS revenue FROM pixel_events WHERE $where GROUP BY DATE(created_at) ORDER BY dt ASC")->fetchAll(\PDO::FETCH_ASSOC);
        $devices = $run("SELECT device_type, COUNT(*) AS cnt FROM pixel_events WHERE $where GROUP BY device_type")->fetchAll(\PDO::FETCH_ASSOC);
        // [281차 P2] forwarding 집계에 GA4/Pinterest/Snap/Reddit/LinkedIn 추가 — 컬럼·UPDATE 는 있는데 SELECT 가
        //   Meta/TikTok 뿐이라 대시보드가 나머지 5종 전송현황을 못 봤다(280차 UI 개통으로 실제 등록 가능해진 채널들).
        //   컬럼 부재 환경 대비 개별 try(멱등 ALTER 는 ensureTables 가 보장하나 방어적으로 COALESCE).
        $forwarding = $run("SELECT COALESCE(SUM(forwarded_meta),0) AS meta_forwarded, COALESCE(SUM(forwarded_tiktok),0) AS tiktok_forwarded,
                                   COALESCE(SUM(forwarded_ga4),0) AS ga4_forwarded, COALESCE(SUM(forwarded_pinterest),0) AS pinterest_forwarded,
                                   COALESCE(SUM(forwarded_snap),0) AS snap_forwarded, COALESCE(SUM(forwarded_reddit),0) AS reddit_forwarded,
                                   COALESCE(SUM(forwarded_linkedin),0) AS linkedin_forwarded, COUNT(*) AS total_events FROM pixel_events WHERE $where")->fetch(\PDO::FETCH_ASSOC);

        return self::json($res, ['ok'=>true, 'events'=>$events, 'channels'=>$channels, 'funnel'=>$funnelData, 'time_series'=>$timeSeries, 'devices'=>$devices, 'forwarding'=>$forwarding, 'days'=>$days]);
    }

    /* ─── DELETE /pixel/configs/{id} ─── 픽셀 삭제 ──────────── */
    public static function deleteConfig(Request $req, Response $res, array $args): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $tenant = self::tenant($req);
        self::db()->prepare("DELETE FROM pixel_configs WHERE id=:id AND tenant_id=:t")->execute([':id'=>(int)$args['id'], ':t'=>$tenant]);
        return self::json($res, ['ok' => true]);
    }

    /* ─── GET /pixel/snippet/{pixel_id} ─── 스니펫 코드 생성 ── */
    public static function getSnippet(Request $req, Response $res, array $args): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $tenant = self::tenant($req);
        // 본인 테넌트 소유 픽셀만 스니펫 발급
        $own = self::db()->prepare("SELECT 1 FROM pixel_configs WHERE pixel_id=:pid AND tenant_id=:t LIMIT 1");
        $own->execute([':pid'=>$args['pixel_id'], ':t'=>$tenant]);
        if (!$own->fetchColumn()) return self::json($res, ['ok'=>false,'error'=>'픽셀 없음'], 404);

        $pixelId = addslashes($args['pixel_id']);
        $baseUrl = (isset($_SERVER['HTTPS']) ? 'https' : 'http') . '://' . ($_SERVER['HTTP_HOST'] ?? 'www.genieroi.com');
        $snippet = <<<JS
<!-- Geniego-ROI 1st-Party Pixel | pixel_id: {$pixelId} -->
<script>
(function(g,e,n,i,p,x,l){g['GeniePixel']=g['GeniePixel']||{};
var q=g['GeniePixel'].q=g['GeniePixel'].q||[];
g['GeniePixel'].track=function(e,d){q.push([e,d,Date.now()])};
g['GeniePixel'].pixelId='{$pixelId}';
var s=document.createElement('script');s.async=true;
s.src='{$baseUrl}/pixel.js?v=1';document.head.appendChild(s);
})(window);
GeniePixel.track('page_view', {});
</script>
<!--
  [구매 전환 추적] page_view 는 자동 수집되지만 purchase 는 자동 감지되지 않습니다.
  주문완료(감사) 페이지에 아래를 추가하세요 — 값은 서버 실제 주문 데이터로 치환:
  <script>
    GeniePixel.identify({ email: '<구매자 이메일>' });
    GeniePixel.track('purchase', {
      value: <결제금액 숫자>, currency: 'KRW',
      order_id: '<주문번호>',            // 서버전환 dedup·어트리뷰션에 필수
      product_ids: ['<상품ID>']
    });
  </script>
  add_to_cart 등 다른 이벤트도 같은 방식(GeniePixel.track('add_to_cart',{...}))으로 호출합니다.
-->
<!-- /Geniego-ROI Pixel -->
JS;
        return self::json($res, ['ok' => true, 'snippet' => $snippet, 'pixel_id' => $pixelId]);
    }
}
