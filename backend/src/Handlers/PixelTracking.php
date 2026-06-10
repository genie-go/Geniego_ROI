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
    }

    /* ─── POST /pixel/collect ─── 픽셀 이벤트 수집 (공개 비콘) ─────────── */
    public static function collect(Request $req, Response $res): Response
    {
        self::ensureTables();
        $pdo = self::db();
        $b = (array)$req->getParsedBody();

        $pixelId   = trim($b['pixel_id'] ?? '');
        $eventName = trim($b['event_name'] ?? 'page_view');
        $sessionId = trim($b['session_id'] ?? '');
        if (!$pixelId) return self::json($res, ['ok' => false, 'error' => 'pixel_id 필수'], 400);

        // ★테넌트 = pixel_id 의 소유 config. 미등록 픽셀=unknown(어느 테넌트 analytics 에도 미노출).
        $cfgStmt = $pdo->prepare("SELECT * FROM pixel_configs WHERE pixel_id=:pid LIMIT 1");
        $cfgStmt->execute([':pid' => $pixelId]);
        $config = $cfgStmt->fetch(\PDO::FETCH_ASSOC);
        // 209차 P1: secret-at-rest 복호화(서버 전송 API 토큰). 평문 행은 passthrough.
        if ($config) foreach (['meta_api_token','tiktok_access_token','ga4_api_secret'] as $sk) { if (!empty($config[$sk])) $config[$sk] = self::dec((string)$config[$sk]); }
        $tenant = $config['tenant_id'] ?? 'unknown';

        // 209차 P1: 익명 공개 비콘 오염 방어(pixel_id 는 사이트 스니펫에 공개 → 수집·위조 가능).
        //   ① event_name 화이트리스트(임의 라벨 차단) ② value 음수·비현실 상한 클램프
        //   ③ 등록 도메인(config.domain) 있으면 Origin/Referer host 일치 시에만 '신뢰' → 신뢰 외엔
        //      매출집계·CRM 구매기록·매체 포워딩 차단(가짜 구매/매출 주입 무력화). 원시 이벤트는 기록(정직 분석).
        $EVENTS = ['page_view','product_view','view_content','search','add_to_cart','add_to_wishlist','initiate_checkout','add_payment_info','purchase','lead','complete_registration','contact','subscribe','custom'];
        if (!in_array($eventName, $EVENTS, true)) $eventName = 'custom';
        $value = max(0.0, min((float)($b['value'] ?? 0), 1.0e9));
        $trusted = true;
        $cfgDomain = strtolower(trim((string)($config['domain'] ?? '')));
        if ($config && $cfgDomain !== '') {
            $orig = $req->getHeaderLine('Origin') ?: $req->getHeaderLine('Referer');
            $reqHost = ($orig !== '' && preg_match('~^https?://([^/:]+)~i', $orig, $hm)) ? strtolower($hm[1]) : '';
            $cfgHost = explode('/', preg_replace('~^https?://~i', '', $cfgDomain))[0];
            $trusted = $reqHost !== '' && ($reqHost === $cfgHost || str_ends_with($reqHost, '.' . $cfgHost));
        }
        // 신뢰 외 비콘은 event='custom'·value=0 으로 중립화(가짜 구매/매출/전환 주입 전면 차단).
        $effEvent = $trusted ? $eventName : 'custom';
        $effValue = $trusted ? $value : 0.0;

        $eventId = 'evt_' . bin2hex(random_bytes(12));
        $emailHash = !empty($b['email']) ? hash('sha256', strtolower(trim($b['email']))) : null;
        $phoneHash = !empty($b['phone']) ? hash('sha256', preg_replace('/[^0-9]/', '', $b['phone'])) : null;
        $ip = $_SERVER['REMOTE_ADDR'] ?? ($req->getHeaderLine('X-Forwarded-For') ?: '');
        $ipHash = $ip ? hash('sha256', $ip) : null;
        $ua = $req->getHeaderLine('User-Agent');
        $deviceType = 'desktop';
        if (preg_match('/Mobile|Android|iPhone|iPad/i', $ua)) { $deviceType = preg_match('/iPad/i', $ua) ? 'tablet' : 'mobile'; }

        $ignore = self::isMysql($pdo) ? 'IGNORE' : 'OR IGNORE';
        $pdo->prepare("INSERT {$ignore} INTO pixel_events
            (tenant_id, event_id, pixel_id, event_name, session_id, user_id, email_hash, phone_hash,
             page_url, referrer, utm_source, utm_medium, utm_campaign, utm_content, utm_term,
             value, currency, product_ids, custom_data, ip_hash, user_agent, device_type, created_at)
            VALUES (:t,:eid,:pid,:en,:sid,:uid,:eh,:ph,:url,:ref,:us,:um,:uc,:uco,:ut,:val,:cur,:prod,:cdata,:iph,:ua,:dev,:ca)
        ")->execute([
            ':t'=>$tenant, ':eid'=>$eventId, ':pid'=>$pixelId, ':en'=>$effEvent, ':sid'=>$sessionId ?: null,
            ':uid'=>$b['user_id'] ?? null, ':eh'=>$emailHash, ':ph'=>$phoneHash, ':url'=>$b['page_url'] ?? null,
            ':ref'=>$b['referrer'] ?? null, ':us'=>$b['utm_source'] ?? null, ':um'=>$b['utm_medium'] ?? null,
            ':uc'=>$b['utm_campaign'] ?? null, ':uco'=>$b['utm_content'] ?? null, ':ut'=>$b['utm_term'] ?? null,
            ':val'=>$effValue, ':cur'=>$b['currency'] ?? 'KRW', ':prod'=>json_encode($b['product_ids'] ?? []),
            ':cdata'=>json_encode($b['custom_data'] ?? []), ':iph'=>$ipHash, ':ua'=>substr($ua, 0, 500), ':dev'=>$deviceType, ':ca'=>self::now(),
        ]);

        if ($sessionId) { self::updateSession($pdo, $tenant, $sessionId, $pixelId, $effEvent, $effValue, $b); }
        if ($trusted && $eventName === 'purchase' && $emailHash) { self::syncToCRM($pdo, $tenant, $eventName, $effValue, $eventId); }

        if ($trusted && $config && (int)($config['enabled'] ?? 0) === 1) {
            self::forwardToMeta($pdo, $config, $eventId, $eventName, $emailHash, $phoneHash, $b, $deviceType);
            self::forwardToTikTok($pdo, $config, $eventId, $eventName, $emailHash, $b);
        }
        return self::json($res, ['ok' => true, 'event_id' => $eventId]);
    }

    private static function updateSession(\PDO $pdo, string $tenant, string $sid, string $pixelId, string $eventName, float $value, array $b): void
    {
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
                ':val'=>$value, ':us'=>$b['utm_source'] ?? null, ':um'=>$b['utm_medium'] ?? null, ':uc'=>$b['utm_campaign'] ?? null,
                ':lp'=>$b['page_url'] ?? null, ':cv'=>$eventName === 'purchase' ? 1 : 0, ':ca'=>$now, ':ua'=>$now,
            ]);
        }
    }

    private static function syncToCRM(\PDO $pdo, string $tenant, string $eventName, float $value, string $eventId): void
    {
        // 픽셀 구매 이벤트를 해당 테넌트 CRM 활동으로 best-effort 기록(sha256 직접매칭 불가 → 테넌트 스코프 안전).
        try {
            $ignore = self::isMysql($pdo) ? 'IGNORE' : 'OR IGNORE';
            $pdo->prepare("INSERT {$ignore} INTO crm_activities (tenant_id, customer_id, type, channel, amount, data, created_at)
                SELECT tenant_id, id, :type, 'pixel', :amt, :data, :ca FROM crm_customers WHERE tenant_id=:t LIMIT 1
            ")->execute([
                ':type' => $eventName === 'purchase' ? 'purchase' : 'event',
                ':amt' => $value, ':data' => json_encode(['source' => 'pixel', 'event_id' => $eventId]), ':ca' => self::now(), ':t' => $tenant,
            ]);
        } catch (\Exception $e) { /* CRM 테이블 없으면 무시 */ }
    }

    private static function forwardToMeta(\PDO $pdo, array $cfg, string $eventId, string $eventName, ?string $emailHash, ?string $phoneHash, array $b, string $deviceType): void
    {
        if (empty($cfg['meta_pixel_id']) || empty($cfg['meta_api_token'])) return;
        $metaEventMap = ['page_view'=>'PageView', 'view_content'=>'ViewContent', 'add_to_cart'=>'AddToCart', 'initiate_checkout'=>'InitiateCheckout', 'purchase'=>'Purchase', 'lead'=>'Lead', 'subscribe'=>'Subscribe'];
        $metaEvent = $metaEventMap[$eventName] ?? 'CustomEvent';
        $payload = ['data' => [[
            'event_name'=>$metaEvent, 'event_time'=>time(), 'event_id'=>$eventId, 'event_source_url'=>$b['page_url'] ?? '', 'action_source'=>'website',
            'user_data'=>array_filter(['em'=>$emailHash ? [$emailHash] : null, 'ph'=>$phoneHash ? [$phoneHash] : null, 'client_ip_address'=>null, 'client_user_agent'=>$b['user_agent'] ?? '']),
            'custom_data'=>array_filter(['value'=>(float)($b['value'] ?? 0) ?: null, 'currency'=>$b['currency'] ?? 'KRW', 'content_ids'=>$b['product_ids'] ?? null]),
        ]]];
        try {
            $ch = curl_init("https://graph.facebook.com/v18.0/{$cfg['meta_pixel_id']}/events?access_token={$cfg['meta_api_token']}");
            curl_setopt_array($ch, [CURLOPT_POST=>true, CURLOPT_POSTFIELDS=>json_encode($payload), CURLOPT_RETURNTRANSFER=>true, CURLOPT_TIMEOUT=>5, CURLOPT_HTTPHEADER=>['Content-Type: application/json']]);
            curl_exec($ch); curl_close($ch);
            $u = $pdo->prepare("UPDATE pixel_events SET forwarded_meta=1 WHERE event_id=:eid"); $u->execute([':eid'=>$eventId]);
        } catch (\Exception $e) {}
    }

    private static function forwardToTikTok(\PDO $pdo, array $cfg, string $eventId, string $eventName, ?string $emailHash, array $b): void
    {
        if (empty($cfg['tiktok_pixel_id']) || empty($cfg['tiktok_access_token'])) return;
        $tiktokEventMap = ['page_view'=>'PageView', 'view_content'=>'ViewContent', 'add_to_cart'=>'AddToCart', 'purchase'=>'CompletePayment', 'lead'=>'SubmitForm'];
        $tiktokEvent = $tiktokEventMap[$eventName] ?? 'CustomEvent';
        $payload = ['pixel_code'=>$cfg['tiktok_pixel_id'], 'event'=>$tiktokEvent, 'event_id'=>$eventId, 'timestamp'=>gmdate('Y-m-d\TH:i:s+00:00'),
            'context'=>['page'=>['url'=>$b['page_url'] ?? ''], 'user'=>array_filter(['sha256_email'=>$emailHash])],
            'properties'=>array_filter(['value'=>(float)($b['value'] ?? 0) ?: null, 'currency'=>$b['currency'] ?? 'KRW', 'content_id'=>!empty($b['product_ids']) ? $b['product_ids'][0] : null])];
        try {
            $ch = curl_init('https://business-api.tiktok.com/open_api/v1.3/pixel/track/');
            curl_setopt_array($ch, [CURLOPT_POST=>true, CURLOPT_POSTFIELDS=>json_encode($payload), CURLOPT_RETURNTRANSFER=>true, CURLOPT_TIMEOUT=>5, CURLOPT_HTTPHEADER=>['Content-Type: application/json', 'Access-Token: '.$cfg['tiktok_access_token']]]);
            curl_exec($ch); curl_close($ch);
            $u = $pdo->prepare("UPDATE pixel_events SET forwarded_tiktok=1 WHERE event_id=:eid"); $u->execute([':eid'=>$eventId]);
        } catch (\Exception $e) {}
    }

    /* ─── GET /pixel/configs ─── 픽셀 설정 목록 ────────────── */
    public static function listConfigs(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $tenant = self::tenant($req);
        $st = self::db()->prepare("SELECT id, pixel_id, name, domain, enabled, created_at FROM pixel_configs WHERE tenant_id=? ORDER BY created_at DESC");
        $st->execute([$tenant]);
        return self::json($res, ['ok' => true, 'configs' => $st->fetchAll(\PDO::FETCH_ASSOC)]);
    }

    /* ─── POST /pixel/configs ─── 픽셀 생성 ─────────────────── */
    public static function createConfig(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $pdo = self::db();
        $tenant = self::tenant($req);
        $b = (array)$req->getParsedBody();
        $pixelId = 'px_' . bin2hex(random_bytes(8));
        $now = self::now();
        $pdo->prepare("INSERT INTO pixel_configs (tenant_id, pixel_id, name, domain, meta_pixel_id, meta_api_token, tiktok_pixel_id, tiktok_access_token, ga4_measurement_id, ga4_api_secret, created_at, updated_at)
            VALUES (:t,:pid,:name,:dom,:mpid,:mapi,:tpid,:tapi,:ga4id,:ga4sec,:ca,:ua)
        ")->execute([
            ':t'=>$tenant, ':pid'=>$pixelId, ':name'=>$b['name'] ?? '기본 픽셀', ':dom'=>$b['domain'] ?? '',
            ':mpid'=>$b['meta_pixel_id'] ?? '', ':mapi'=>self::enc($b['meta_api_token'] ?? ''), ':tpid'=>$b['tiktok_pixel_id'] ?? '',
            ':tapi'=>self::enc($b['tiktok_access_token'] ?? ''), ':ga4id'=>$b['ga4_measurement_id'] ?? '', ':ga4sec'=>self::enc($b['ga4_api_secret'] ?? ''), ':ca'=>$now, ':ua'=>$now,
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
        $channels = $run("SELECT COALESCE(utm_source,'direct') AS source, COALESCE(utm_medium,'none') AS medium, COUNT(*) AS sessions, SUM(CASE WHEN event_name='purchase' THEN 1 ELSE 0 END) AS conversions, COALESCE(SUM(CASE WHEN event_name='purchase' THEN value ELSE 0 END),0) AS revenue FROM pixel_events WHERE $where GROUP BY utm_source, utm_medium ORDER BY revenue DESC LIMIT 20")->fetchAll(\PDO::FETCH_ASSOC);

        $funnelData = ['page_view'=>0,'view_content'=>0,'add_to_cart'=>0,'initiate_checkout'=>0,'purchase'=>0];
        foreach ($run("SELECT event_name, COUNT(*) AS cnt FROM pixel_events WHERE $where AND event_name IN ('page_view','view_content','add_to_cart','initiate_checkout','purchase') GROUP BY event_name")->fetchAll(\PDO::FETCH_ASSOC) as $row) {
            $funnelData[$row['event_name']] = (int)$row['cnt'];
        }
        $timeSeries = $run("SELECT DATE(created_at) AS dt, COUNT(*) AS events, SUM(CASE WHEN event_name='purchase' THEN 1 ELSE 0 END) AS purchases, COALESCE(SUM(CASE WHEN event_name='purchase' THEN value ELSE 0 END),0) AS revenue FROM pixel_events WHERE $where GROUP BY DATE(created_at) ORDER BY dt ASC")->fetchAll(\PDO::FETCH_ASSOC);
        $devices = $run("SELECT device_type, COUNT(*) AS cnt FROM pixel_events WHERE $where GROUP BY device_type")->fetchAll(\PDO::FETCH_ASSOC);
        $forwarding = $run("SELECT COALESCE(SUM(forwarded_meta),0) AS meta_forwarded, COALESCE(SUM(forwarded_tiktok),0) AS tiktok_forwarded, COUNT(*) AS total_events FROM pixel_events WHERE $where")->fetch(\PDO::FETCH_ASSOC);

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
        $baseUrl = (isset($_SERVER['HTTPS']) ? 'https' : 'http') . '://' . ($_SERVER['HTTP_HOST'] ?? 'roi.genie-go.com');
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
<!-- /Geniego-ROI Pixel -->
JS;
        return self::json($res, ['ok' => true, 'snippet' => $snippet, 'pixel_id' => $pixelId]);
    }
}
