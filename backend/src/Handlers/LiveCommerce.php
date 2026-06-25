<?php
declare(strict_types=1);
namespace Genie\Handlers;

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;
use Genie\Db;
use Genie\Crypto;

/**
 * 라이브 커머스(Live Commerce) 영속화 핸들러 — 208차 신설.
 *
 * "라이브 커머스 + OMS + WMS + 멀티송출 + 글로벌 마켓 연동" 생태계의 백엔드 두뇌.
 * 실시간 라이브 방송을 통한 상품 판매 시스템을 5개 엔터티로 테넌트 격리 영속화한다:
 *   live_sessions     — 방송 세션(예약/방송중/종료, 멀티송출 채널, 시청자/매출 집계)
 *   live_products     — 방송 편성 상품(특가, 재고, 판매수, 현재노출 핀)
 *   live_orders       — 방송 중 구매(댓글주문/구매하기) → OMS(channel_orders) 미러
 *   live_chat         — 실시간 채팅/댓글주문(SSE 이벤트 소스)
 *   live_integrations — 연동 프레임워크(SNS Live/오픈마켓/글로벌/D2C/PG/물류/CRM/AI)
 *
 * 라우팅: /v425/live/* (세션 self-auth, index.php bypass + no-/api 변형 등록).
 *   ★ basePath '/api' strip 트랩(205차 WMS 정본): routes.php 에 '/api' 없이 등록해야 매칭.
 * 인증: UserAuth::requirePro(pro+). 테넌트=authedTenant(위조 X-Tenant-Id 무시).
 * 실시간: GET /v425/live/stream (SSE long-poll, live_chat.id 커서 + 주기적 stats emit).
 *   EventSource 는 커스텀 헤더 불가 → ?token=<genie_token> 로 인증(UserAuth::extractToken 지원).
 * 연동 비밀값(api_key/secret)은 AES-256-GCM 저장(Crypto, 평문 passthrough 복호화).
 */
class LiveCommerce
{
    private const SSE_MAX_SEC = 300;   // 5분 hard cap (PHP-FPM worker 점유 보호)
    private const SSE_POLL_SEC = 2;    // DB 폴링 주기
    private const SSE_HB_SEC = 20;     // heartbeat 주기
    private const PRESENCE_WINDOW = 35; // 시청자 presence 유효(초)

    private static function db(): \PDO { return Db::pdo(); }
    private static function isMysql(\PDO $pdo): bool { return $pdo->getAttribute(\PDO::ATTR_DRIVER_NAME) === 'mysql'; }
    private static function now(): string { return gmdate('Y-m-d H:i:s'); }

    private static function tenant(Request $req): string
    {
        $t = UserAuth::authedTenant($req);
        return ($t !== null && $t !== '') ? $t : 'demo';
    }

    private static function body(Request $req): array
    {
        $b = (array)($req->getParsedBody() ?? []);
        if (empty($b)) {
            $decoded = json_decode((string)$req->getBody(), true);
            if (is_array($decoded)) $b = $decoded;
        }
        return $b;
    }

    private static function json(Response $res, array $data, int $status = 200): Response
    {
        $res->getBody()->write(json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
        return $res->withHeader('Content-Type', 'application/json')->withStatus($status);
    }

    private static function exists(string $tbl, int $id, string $tenant): bool
    {
        $st = self::db()->prepare("SELECT 1 FROM {$tbl} WHERE id=:id AND tenant_id=:t");
        $st->execute([':id' => $id, ':t' => $tenant]);
        return (bool)$st->fetchColumn();
    }

    private static function ensureTables(): void
    {
        $pdo = self::db();
        if (self::isMysql($pdo)) {
            $pdo->exec("CREATE TABLE IF NOT EXISTS live_sessions (
                id INT AUTO_INCREMENT PRIMARY KEY, tenant_id VARCHAR(100) NOT NULL DEFAULT 'demo',
                title VARCHAR(255) NOT NULL, description TEXT, host VARCHAR(120), cover_url VARCHAR(500),
                status VARCHAR(20) NOT NULL DEFAULT 'scheduled', channels TEXT,
                scheduled_at VARCHAR(32), started_at VARCHAR(32), ended_at VARCHAR(32),
                viewer_count INT DEFAULT 0, peak_viewers INT DEFAULT 0, like_count INT DEFAULT 0,
                created_at VARCHAR(32), updated_at VARCHAR(32),
                KEY idx_lc_sess_tenant (tenant_id), KEY idx_lc_sess_status (tenant_id, status)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
            $pdo->exec("CREATE TABLE IF NOT EXISTS live_products (
                id INT AUTO_INCREMENT PRIMARY KEY, tenant_id VARCHAR(100) NOT NULL DEFAULT 'demo',
                session_id INT NOT NULL, sku VARCHAR(120), name VARCHAR(255), image VARCHAR(40),
                price DOUBLE DEFAULT 0, special_price DOUBLE DEFAULT 0, stock DOUBLE DEFAULT 0,
                sold DOUBLE DEFAULT 0, featured TINYINT(1) DEFAULT 0, display_order INT DEFAULT 0,
                created_at VARCHAR(32), updated_at VARCHAR(32),
                KEY idx_lc_prod_tenant (tenant_id), KEY idx_lc_prod_sess (tenant_id, session_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
            $pdo->exec("CREATE TABLE IF NOT EXISTS live_orders (
                id INT AUTO_INCREMENT PRIMARY KEY, tenant_id VARCHAR(100) NOT NULL DEFAULT 'demo',
                session_id INT NOT NULL, sku VARCHAR(120), name VARCHAR(255), qty DOUBLE DEFAULT 1,
                price DOUBLE DEFAULT 0, total DOUBLE DEFAULT 0, buyer VARCHAR(160), channel VARCHAR(60) DEFAULT 'live',
                status VARCHAR(40) DEFAULT 'paid', created_at VARCHAR(32),
                KEY idx_lc_ord_tenant (tenant_id), KEY idx_lc_ord_sess (tenant_id, session_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
            $pdo->exec("CREATE TABLE IF NOT EXISTS live_chat (
                id INT AUTO_INCREMENT PRIMARY KEY, tenant_id VARCHAR(100) NOT NULL DEFAULT 'demo',
                session_id INT NOT NULL, author VARCHAR(120), message TEXT, kind VARCHAR(20) DEFAULT 'chat',
                meta TEXT, created_at VARCHAR(32),
                KEY idx_lc_chat_tenant (tenant_id), KEY idx_lc_chat_sess (tenant_id, session_id, id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
            $pdo->exec("CREATE TABLE IF NOT EXISTS live_integrations (
                id INT AUTO_INCREMENT PRIMARY KEY, tenant_id VARCHAR(100) NOT NULL DEFAULT 'demo',
                channel VARCHAR(80) NOT NULL, category VARCHAR(40) NOT NULL DEFAULT 'sns_live',
                status VARCHAR(20) NOT NULL DEFAULT 'disconnected', config TEXT, secret TEXT,
                connected_at VARCHAR(32), created_at VARCHAR(32), updated_at VARCHAR(32),
                KEY idx_lc_int_tenant (tenant_id), UNIQUE KEY uq_lc_int (tenant_id, channel)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
            $pdo->exec("CREATE TABLE IF NOT EXISTS live_presence (
                id INT AUTO_INCREMENT PRIMARY KEY, tenant_id VARCHAR(100) NOT NULL DEFAULT 'demo',
                session_id INT NOT NULL, viewer_key VARCHAR(80), last_seen VARCHAR(32),
                UNIQUE KEY uq_lc_pres (tenant_id, session_id, viewer_key), KEY idx_lc_pres (tenant_id, session_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
            $pdo->exec("CREATE TABLE IF NOT EXISTS live_destinations (
                id INT AUTO_INCREMENT PRIMARY KEY, tenant_id VARCHAR(100) NOT NULL DEFAULT 'demo',
                session_id INT NOT NULL, channel VARCHAR(80) NOT NULL, label VARCHAR(160),
                rtmp_url VARCHAR(500), stream_key TEXT, enabled TINYINT(1) DEFAULT 1,
                status VARCHAR(20) DEFAULT 'idle', last_status_at VARCHAR(32), created_at VARCHAR(32), updated_at VARCHAR(32),
                KEY idx_lc_dest (tenant_id, session_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
        } else {
            $pdo->exec("CREATE TABLE IF NOT EXISTS live_sessions (id INTEGER PRIMARY KEY AUTOINCREMENT, tenant_id TEXT NOT NULL DEFAULT 'demo', title TEXT NOT NULL, description TEXT, host TEXT, cover_url TEXT, status TEXT NOT NULL DEFAULT 'scheduled', channels TEXT, scheduled_at TEXT, started_at TEXT, ended_at TEXT, viewer_count INTEGER DEFAULT 0, peak_viewers INTEGER DEFAULT 0, like_count INTEGER DEFAULT 0, created_at TEXT, updated_at TEXT)");
            $pdo->exec("CREATE TABLE IF NOT EXISTS live_products (id INTEGER PRIMARY KEY AUTOINCREMENT, tenant_id TEXT NOT NULL DEFAULT 'demo', session_id INTEGER NOT NULL, sku TEXT, name TEXT, image TEXT, price REAL DEFAULT 0, special_price REAL DEFAULT 0, stock REAL DEFAULT 0, sold REAL DEFAULT 0, featured INTEGER DEFAULT 0, display_order INTEGER DEFAULT 0, created_at TEXT, updated_at TEXT)");
            $pdo->exec("CREATE TABLE IF NOT EXISTS live_orders (id INTEGER PRIMARY KEY AUTOINCREMENT, tenant_id TEXT NOT NULL DEFAULT 'demo', session_id INTEGER NOT NULL, sku TEXT, name TEXT, qty REAL DEFAULT 1, price REAL DEFAULT 0, total REAL DEFAULT 0, buyer TEXT, channel TEXT DEFAULT 'live', status TEXT DEFAULT 'paid', created_at TEXT)");
            $pdo->exec("CREATE TABLE IF NOT EXISTS live_chat (id INTEGER PRIMARY KEY AUTOINCREMENT, tenant_id TEXT NOT NULL DEFAULT 'demo', session_id INTEGER NOT NULL, author TEXT, message TEXT, kind TEXT DEFAULT 'chat', meta TEXT, created_at TEXT)");
            $pdo->exec("CREATE TABLE IF NOT EXISTS live_integrations (id INTEGER PRIMARY KEY AUTOINCREMENT, tenant_id TEXT NOT NULL DEFAULT 'demo', channel TEXT NOT NULL, category TEXT NOT NULL DEFAULT 'sns_live', status TEXT NOT NULL DEFAULT 'disconnected', config TEXT, secret TEXT, connected_at TEXT, created_at TEXT, updated_at TEXT)");
            $pdo->exec("CREATE TABLE IF NOT EXISTS live_presence (id INTEGER PRIMARY KEY AUTOINCREMENT, tenant_id TEXT NOT NULL DEFAULT 'demo', session_id INTEGER NOT NULL, viewer_key TEXT, last_seen TEXT)");
            $pdo->exec("CREATE TABLE IF NOT EXISTS live_destinations (id INTEGER PRIMARY KEY AUTOINCREMENT, tenant_id TEXT NOT NULL DEFAULT 'demo', session_id INTEGER NOT NULL, channel TEXT NOT NULL, label TEXT, rtmp_url TEXT, stream_key TEXT, enabled INTEGER DEFAULT 1, status TEXT DEFAULT 'idle', last_status_at TEXT, created_at TEXT, updated_at TEXT)");
            try { $pdo->exec("CREATE UNIQUE INDEX IF NOT EXISTS uq_lc_int ON live_integrations(tenant_id, channel)"); } catch (\Throwable $e) {}
            try { $pdo->exec("CREATE UNIQUE INDEX IF NOT EXISTS uq_lc_pres ON live_presence(tenant_id, session_id, viewer_key)"); } catch (\Throwable $e) {}
        }
        // 208차 검수: OMS 미러 대상 channel_orders 존재 보장(ChannelSync 미사용 테넌트 대비).
        //   ChannelSync::ensureTables 는 private → 동일 스키마를 IF NOT EXISTS 로 보강(이미 있으면 no-op).
        // SSOT: channel_orders 를 Db::ensureChannelOrders 로 일원화(종전 ChannelSync 와 동일 스키마 중복 제거)
        try { Db::ensureChannelOrders($pdo); } catch (\Throwable $e) { /* 이미 생성됐으면 no-op */ }
    }

    /* ════════════════ 방송 세션(Sessions) ════════════════ */

    public static function listSessions(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $t = self::tenant($req);
        $st = self::db()->prepare("SELECT * FROM live_sessions WHERE tenant_id=:t ORDER BY (status='live') DESC, id DESC LIMIT 200");
        $st->execute([':t' => $t]);
        $rows = $st->fetchAll(\PDO::FETCH_ASSOC);
        foreach ($rows as &$r) { $r = self::hydrateSession($r); }
        return self::json($res, ['ok' => true, 'sessions' => $rows]);
    }

    private static function hydrateSession(array $r): array
    {
        $r['channels'] = json_decode((string)($r['channels'] ?? '[]'), true) ?: [];
        $r['viewer_count'] = (int)($r['viewer_count'] ?? 0);
        $r['peak_viewers'] = (int)($r['peak_viewers'] ?? 0);
        $r['like_count'] = (int)($r['like_count'] ?? 0);
        return $r;
    }

    public static function saveSession(Request $req, Response $res, array $args = []): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $t = self::tenant($req); $b = self::body($req); $now = self::now(); $pdo = self::db();
        $title = trim((string)($b['title'] ?? ''));
        if ($title === '') return self::json($res, ['ok' => false, 'error' => '방송 제목을 입력하세요.'], 422);
        $channels = json_encode(array_values((array)($b['channels'] ?? [])), JSON_UNESCAPED_UNICODE);
        $f = [
            ':title' => $title, ':desc' => (string)($b['description'] ?? ''), ':host' => (string)($b['host'] ?? ''),
            ':cover' => (string)($b['cover_url'] ?? $b['coverUrl'] ?? ''), ':ch' => $channels,
            ':sched' => (string)($b['scheduled_at'] ?? $b['scheduledAt'] ?? ''),
        ];
        $id = (int)($args['id'] ?? $b['id'] ?? 0);
        if ($id > 0) {
            $f[':id'] = $id; $f[':t'] = $t; $f[':ua'] = $now;
            $st = $pdo->prepare("UPDATE live_sessions SET title=:title,description=:desc,host=:host,cover_url=:cover,channels=:ch,scheduled_at=:sched,updated_at=:ua WHERE id=:id AND tenant_id=:t");
            $st->execute($f);
            if ($st->rowCount() === 0 && !self::exists('live_sessions', $id, $t)) return self::json($res, ['ok' => false, 'error' => '없음'], 404);
            return self::json($res, ['ok' => true, 'id' => $id]);
        }
        $f[':t'] = $t; $f[':st'] = 'scheduled'; $f[':ca'] = $now; $f[':ua'] = $now;
        $st = $pdo->prepare("INSERT INTO live_sessions (tenant_id,title,description,host,cover_url,channels,scheduled_at,status,created_at,updated_at) VALUES (:t,:title,:desc,:host,:cover,:ch,:sched,:st,:ca,:ua)");
        $st->execute($f);
        return self::json($res, ['ok' => true, 'id' => (int)$pdo->lastInsertId()]);
    }

    public static function deleteSession(Request $req, Response $res, array $args): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $t = self::tenant($req); $id = (int)$args['id']; $pdo = self::db();
        foreach (['live_products', 'live_orders', 'live_chat', 'live_presence', 'live_destinations'] as $tbl) {
            try { $st = $pdo->prepare("DELETE FROM {$tbl} WHERE session_id=:s AND tenant_id=:t"); $st->execute([':s' => $id, ':t' => $t]); } catch (\Throwable $e) {}
        }
        $st = $pdo->prepare("DELETE FROM live_sessions WHERE id=:id AND tenant_id=:t");
        $st->execute([':id' => $id, ':t' => $t]);
        return self::json($res, ['ok' => true, 'deleted' => $st->rowCount()]);
    }

    /** POST /v425/live/sessions/{id}/go-live — 방송 시작 */
    public static function goLive(Request $req, Response $res, array $args): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $t = self::tenant($req); $id = (int)$args['id']; $now = self::now(); $pdo = self::db();
        // 동일 테넌트 다른 라이브는 종료(동시 1방송 정책 — 멀티송출은 한 세션 내 다채널)
        $pdo->prepare("UPDATE live_sessions SET status='ended', ended_at=:e WHERE tenant_id=:t AND status='live' AND id<>:id")
            ->execute([':e' => $now, ':t' => $t, ':id' => $id]);
        $st = $pdo->prepare("UPDATE live_sessions SET status='live', started_at=COALESCE(NULLIF(started_at,''),:s), updated_at=:u WHERE id=:id AND tenant_id=:t");
        $st->execute([':s' => $now, ':u' => $now, ':id' => $id, ':t' => $t]);
        if ($st->rowCount() === 0 && !self::exists('live_sessions', $id, $t)) return self::json($res, ['ok' => false, 'error' => '없음'], 404);
        self::sysChat($t, $id, '🔴 라이브 방송이 시작되었습니다.');
        return self::json($res, ['ok' => true, 'id' => $id, 'status' => 'live']);
    }

    /** POST /v425/live/sessions/{id}/end — 방송 종료 */
    public static function endSession(Request $req, Response $res, array $args): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $t = self::tenant($req); $id = (int)$args['id']; $now = self::now(); $pdo = self::db();
        $st = $pdo->prepare("UPDATE live_sessions SET status='ended', ended_at=:e, updated_at=:u WHERE id=:id AND tenant_id=:t");
        $st->execute([':e' => $now, ':u' => $now, ':id' => $id, ':t' => $t]);
        if ($st->rowCount() === 0 && !self::exists('live_sessions', $id, $t)) return self::json($res, ['ok' => false, 'error' => '없음'], 404);
        self::sysChat($t, $id, '⏹️ 라이브 방송이 종료되었습니다. 시청해 주셔서 감사합니다.');
        return self::json($res, ['ok' => true, 'id' => $id, 'status' => 'ended']);
    }

    /* ════════════════ 편성 상품(Products) ════════════════ */

    public static function listProducts(Request $req, Response $res, array $args): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $st = self::db()->prepare("SELECT * FROM live_products WHERE tenant_id=:t AND session_id=:s ORDER BY display_order ASC, id ASC");
        $st->execute([':t' => self::tenant($req), ':s' => (int)$args['id']]);
        $rows = $st->fetchAll(\PDO::FETCH_ASSOC);
        foreach ($rows as &$r) { $r['featured'] = (bool)(int)($r['featured'] ?? 0); }
        return self::json($res, ['ok' => true, 'products' => $rows]);
    }

    public static function saveProduct(Request $req, Response $res, array $args): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $t = self::tenant($req); $b = self::body($req); $now = self::now(); $pdo = self::db();
        $sessionId = (int)($args['id'] ?? $b['session_id'] ?? 0);
        $name = trim((string)($b['name'] ?? ''));
        if ($sessionId <= 0 || $name === '') return self::json($res, ['ok' => false, 'error' => '세션/상품명이 필요합니다.'], 422);
        $price = (float)($b['price'] ?? 0);
        $f = [
            ':sku' => (string)($b['sku'] ?? ''), ':name' => $name, ':img' => (string)($b['image'] ?? '🛍️'),
            ':price' => $price, ':sp' => (float)($b['special_price'] ?? $b['specialPrice'] ?? $price),
            ':stock' => (float)($b['stock'] ?? 0), ':ord' => (int)($b['display_order'] ?? $b['displayOrder'] ?? 0),
        ];
        $pid = (int)($b['id'] ?? 0);
        if ($pid > 0) {
            // 208차 검수(P1#5): 테넌트+세션 소유 동시 검증(테넌트 내 타 세션 상품 수정 차단).
            $f[':id'] = $pid; $f[':t'] = $t; $f[':s'] = $sessionId; $f[':ua'] = $now;
            $st = $pdo->prepare("UPDATE live_products SET sku=:sku,name=:name,image=:img,price=:price,special_price=:sp,stock=:stock,display_order=:ord,updated_at=:ua WHERE id=:id AND tenant_id=:t AND session_id=:s");
            $st->execute($f);
            return self::json($res, ['ok' => true, 'id' => $pid]);
        }
        $f[':t'] = $t; $f[':s'] = $sessionId; $f[':ca'] = $now; $f[':ua'] = $now;
        $st = $pdo->prepare("INSERT INTO live_products (tenant_id,session_id,sku,name,image,price,special_price,stock,sold,featured,display_order,created_at,updated_at) VALUES (:t,:s,:sku,:name,:img,:price,:sp,:stock,0,0,:ord,:ca,:ua)");
        $st->execute($f);
        return self::json($res, ['ok' => true, 'id' => (int)$pdo->lastInsertId()]);
    }

    public static function deleteProduct(Request $req, Response $res, array $args): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $st = self::db()->prepare("DELETE FROM live_products WHERE id=:id AND tenant_id=:t");
        $st->execute([':id' => (int)$args['id'], ':t' => self::tenant($req)]);
        return self::json($res, ['ok' => true, 'deleted' => $st->rowCount()]);
    }

    /** POST /v425/live/products/{id}/feature — 현재 노출 상품 핀(세션 내 단일) */
    public static function featureProduct(Request $req, Response $res, array $args): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $t = self::tenant($req); $pid = (int)$args['id']; $pdo = self::db();
        $row = $pdo->prepare("SELECT session_id, name FROM live_products WHERE id=:id AND tenant_id=:t");
        $row->execute([':id' => $pid, ':t' => $t]);
        $r = $row->fetch(\PDO::FETCH_ASSOC);
        if (!$r) return self::json($res, ['ok' => false, 'error' => '없음'], 404);
        $sid = (int)$r['session_id'];
        $pdo->prepare("UPDATE live_products SET featured=0 WHERE tenant_id=:t AND session_id=:s")->execute([':t' => $t, ':s' => $sid]);
        $pdo->prepare("UPDATE live_products SET featured=1 WHERE id=:id AND tenant_id=:t")->execute([':id' => $pid, ':t' => $t]);
        self::sysChat($t, $sid, '📌 지금 보고 계신 상품: ' . (string)$r['name']);
        return self::json($res, ['ok' => true, 'id' => $pid, 'session_id' => $sid]);
    }

    /* ════════════════ 방송 중 구매(Orders) ════════════════ */

    public static function listOrders(Request $req, Response $res, array $args): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $st = self::db()->prepare("SELECT * FROM live_orders WHERE tenant_id=:t AND session_id=:s ORDER BY id DESC LIMIT 500");
        $st->execute([':t' => self::tenant($req), ':s' => (int)$args['id']]);
        return self::json($res, ['ok' => true, 'orders' => $st->fetchAll(\PDO::FETCH_ASSOC)]);
    }

    /**
     * POST /v425/live/sessions/{id}/orders — 구매하기/댓글주문 처리.
     *   live_products.stock 차감 + sold 증가, live_orders 적재, channel_orders(OMS) 베스트에포트 미러.
     */
    public static function placeOrder(Request $req, Response $res, array $args): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $t = self::tenant($req); $b = self::body($req); $now = self::now(); $pdo = self::db();
        $sid = (int)($args['id'] ?? $b['session_id'] ?? 0);
        $productId = (int)($b['product_id'] ?? $b['productId'] ?? 0);
        $qty = max(1, (int)($b['qty'] ?? 1));
        $buyer = trim((string)($b['buyer'] ?? '게스트'));
        if ($sid <= 0) return self::json($res, ['ok' => false, 'error' => '세션이 필요합니다.'], 422);
        if ($productId <= 0) return self::json($res, ['ok' => false, 'error' => '상품이 필요합니다.'], 422);

        // 208차 검수(P1#6): 가격·SKU·상품명은 반드시 서버측 live_products 에서만 도출.
        //   클라이언트 body 의 price/sku/name 자유입력 경로 제거 → 매출 위조·정산 오염 차단.
        $ps = $pdo->prepare("SELECT * FROM live_products WHERE id=:id AND tenant_id=:t AND session_id=:s");
        $ps->execute([':id' => $productId, ':t' => $t, ':s' => $sid]);
        $prod = $ps->fetch(\PDO::FETCH_ASSOC) ?: null;
        if (!$prod) return self::json($res, ['ok' => false, 'error' => '해당 세션의 상품을 찾을 수 없습니다.'], 404);
        $sku = (string)$prod['sku'];
        $name = (string)$prod['name'];
        $price = (float)($prod['special_price'] ?: $prod['price']);
        $total = $price * $qty;

        if ((float)$prod['stock'] > 0 && (float)$prod['stock'] < $qty) {
            return self::json($res, ['ok' => false, 'error' => '재고가 부족합니다.', 'stock' => (float)$prod['stock']], 409);
        }

        $st = $pdo->prepare("INSERT INTO live_orders (tenant_id,session_id,sku,name,qty,price,total,buyer,channel,status,created_at) VALUES (:t,:s,:sku,:name,:qty,:price,:total,:buyer,:ch,'paid',:ca)");
        $st->execute([':t' => $t, ':s' => $sid, ':sku' => $sku, ':name' => $name, ':qty' => $qty, ':price' => $price, ':total' => $total, ':buyer' => $buyer, ':ch' => (string)($b['channel'] ?? 'live'), ':ca' => $now]);
        $orderId = (int)$pdo->lastInsertId();

        if ($prod) {
            $pdo->prepare("UPDATE live_products SET stock=CASE WHEN stock>=:q THEN stock-:q2 ELSE 0 END, sold=sold+:q3, updated_at=:u WHERE id=:id AND tenant_id=:t")
                ->execute([':q' => $qty, ':q2' => $qty, ':q3' => $qty, ':u' => $now, ':id' => $productId, ':t' => $t]);
        }
        // 채팅 피드에 구매 알림(SSE 전파)
        self::sysChat($t, $sid, '🛒 ' . $buyer . '님이 ' . $name . ' ' . $qty . '개 구매', 'order', ['total' => $total, 'sku' => $sku]);

        // OMS 미러: channel_orders 적재 → OrderHub/정산 rollup/홈·성과 대시보드 반영.
        //   ★208차 검수(P0): 실제 channel_orders 스키마 컬럼(buyer_name/sku/product_name/qty/unit_price/total_price/
        //   ordered_at/event_type/synced_at)으로 교정. 기존 buyer/product_sku/name/price/total/created_at/updated_at
        //   불일치로 INSERT가 무음 실패하여 라이브 매출이 OMS·정산·대시보드에 영구 미반영되던 결함 수정.
        //   channel_order_id 는 결정적('LIVE-{sid}-{orderId}') → UNIQUE(tenant,channel,oid)로 멱등.
        try {
            $om = $pdo->prepare("INSERT INTO channel_orders (tenant_id,channel,channel_order_id,buyer_name,sku,product_name,qty,unit_price,total_price,status,event_type,ordered_at,synced_at) VALUES (:t,:ch,:oid,:buyer,:sku,:name,:qty,:price,:total,'paid','order',:oa,:syn)");
            $om->execute([':t' => $t, ':ch' => 'live', ':oid' => 'LIVE-' . $sid . '-' . $orderId, ':buyer' => $buyer, ':sku' => $sku, ':name' => $name, ':qty' => $qty, ':price' => $price, ':total' => $total, ':oa' => $now, ':syn' => $now]);
        } catch (\Throwable $e) { error_log('[LiveCommerce.placeOrder] channel_orders mirror failed: ' . $e->getMessage()); }

        // [225차 P1-14] WMS 물리재고 차감 — 기존엔 live_products(채널재고)만 줄이고 wms_stock 미차감이라
        //   채널주문(ChannelSync)은 차감되는데 라이브주문만 누락돼 오버셀 위험이었다. reflectChannelSale 은
        //   ref='LIVE-{sid}-{orderId}' 로 멱등(중복 출고 skip)·데모가드·미추적 SKU skip 내장(드롭인 안전).
        try { \Genie\Handlers\Wms::reflectChannelSale($t, $sku, $name, (float)$qty, 'LIVE-' . $sid . '-' . $orderId); } catch (\Throwable $e) {}

        // [현 차수] 라이브 구매 → CRM/LTV/구매여정('purchase' 트리거) 자동 연결(ChannelSync 경로와 동등).
        //   email-less buyer 는 이름+채널 합성키로 CRM 매칭(ChannelSync.recordCrmPurchase). 데모는 내부에서 skip.
        try { \Genie\Handlers\ChannelSync::ingestPurchaseToCrm($pdo, $t, 'live', null, $buyer, $total, $sku, (int)$qty, 'LIVE-' . $sid . '-' . $orderId); } catch (\Throwable $e) {}
        // 어트리뷰션: 라이브 채널 전환 터치 기록(채널 귀속 분석 반영).
        try { \Genie\Handlers\ChannelSync::recordAttributionTouch($pdo, $t, 'live', 'LIVE-' . $sid . '-' . $orderId, $total); } catch (\Throwable $e) {}
        // [현 차수] 라이브 주문 전환 등록(attribution_result) — 폴링(2339)/웹훅(3411) enrichOrderAttribution 경로와 동등.
        //   광고 클릭ID 없으면 commerce-last-touch 로 전환 집계 → markov 여정에 라이브 채널 전환 반영. 데모는 내부 skip.
        try { \Genie\Handlers\ChannelSync::enrichOrderAttribution($pdo, $t, 'live', 'LIVE-' . $sid . '-' . $orderId, null, $total, ['product_name' => $name, 'sku' => $sku]); } catch (\Throwable $e) {}
        // [현 차수 P1] 오픈 플랫폼 아웃바운드 웹훅 — 구독 엔드포인트가 있으면 order.created 발신(없으면 no-op).
        //   emit 은 pending 행만 INSERT(비차단) → webhook_dispatch_cron 이 HMAC 서명 전달/재시도. 예외 비전파.
        \Genie\Handlers\OpenPlatform::emit($t, 'order.created', [
            'order_id' => 'LIVE-' . $sid . '-' . $orderId, 'channel' => 'live',
            'amount' => $total, 'currency' => 'KRW', 'qty' => $qty, 'sku' => $sku, 'product_name' => $name,
            'occurred_at' => $now,
        ]);

        return self::json($res, ['ok' => true, 'id' => $orderId, 'total' => $total, 'name' => $name, 'qty' => $qty]);
    }

    /* ════════════════ 실시간 채팅/댓글주문(Chat) ════════════════ */

    public static function listChat(Request $req, Response $res, array $args): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $since = (int)($req->getQueryParams()['since'] ?? 0);
        $st = self::db()->prepare("SELECT * FROM live_chat WHERE tenant_id=:t AND session_id=:s AND id>:since ORDER BY id ASC LIMIT 200");
        $st->execute([':t' => self::tenant($req), ':s' => (int)$args['id'], ':since' => $since]);
        $rows = $st->fetchAll(\PDO::FETCH_ASSOC);
        foreach ($rows as &$r) { $r['meta'] = $r['meta'] ? json_decode((string)$r['meta'], true) : null; }
        return self::json($res, ['ok' => true, 'chat' => $rows]);
    }

    public static function postChat(Request $req, Response $res, array $args): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $t = self::tenant($req); $b = self::body($req);
        $sid = (int)($args['id'] ?? $b['session_id'] ?? 0);
        $msg = trim((string)($b['message'] ?? ''));
        if ($sid <= 0 || $msg === '') return self::json($res, ['ok' => false, 'error' => '메시지가 비어 있습니다.'], 422);
        $author = trim((string)($b['author'] ?? '게스트'));
        $kind = (string)($b['kind'] ?? 'chat');
        $id = self::insertChat($t, $sid, $author, $msg, $kind, null);
        return self::json($res, ['ok' => true, 'id' => $id]);
    }

    private static function sysChat(string $t, int $sid, string $msg, string $kind = 'system', ?array $meta = null): void
    {
        try { self::insertChat($t, $sid, 'system', $msg, $kind, $meta); } catch (\Throwable $e) {}
    }

    private static function insertChat(string $t, int $sid, string $author, string $msg, string $kind, ?array $meta): int
    {
        $pdo = self::db();
        $st = $pdo->prepare("INSERT INTO live_chat (tenant_id,session_id,author,message,kind,meta,created_at) VALUES (:t,:s,:a,:m,:k,:meta,:ca)");
        $st->execute([':t' => $t, ':s' => $sid, ':a' => $author, ':m' => $msg, ':k' => $kind, ':meta' => $meta ? json_encode($meta, JSON_UNESCAPED_UNICODE) : null, ':ca' => self::now()]);
        return (int)$pdo->lastInsertId();
    }

    /* ════════════════ 시청자 presence + 실시간 통계(Stats) ════════════════ */

    /** POST /v425/live/sessions/{id}/heartbeat — 시청자 presence 갱신(+좋아요 옵션) */
    public static function heartbeat(Request $req, Response $res, array $args): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $t = self::tenant($req); $b = self::body($req); $sid = (int)$args['id']; $now = self::now(); $pdo = self::db();
        $vk = substr(trim((string)($b['viewer_key'] ?? $b['viewerKey'] ?? 'anon')), 0, 80) ?: 'anon';
        try {
            if (self::isMysql($pdo)) {
                $pdo->prepare("INSERT INTO live_presence (tenant_id,session_id,viewer_key,last_seen) VALUES (:t,:s,:v,:ls) ON DUPLICATE KEY UPDATE last_seen=:ls2")
                    ->execute([':t' => $t, ':s' => $sid, ':v' => $vk, ':ls' => $now, ':ls2' => $now]);
            } else {
                $pdo->prepare("INSERT OR REPLACE INTO live_presence (tenant_id,session_id,viewer_key,last_seen) VALUES (:t,:s,:v,:ls)")
                    ->execute([':t' => $t, ':s' => $sid, ':v' => $vk, ':ls' => $now]);
            }
        } catch (\Throwable $e) {}
        if (!empty($b['like'])) {
            $pdo->prepare("UPDATE live_sessions SET like_count=like_count+1 WHERE id=:id AND tenant_id=:t")->execute([':id' => $sid, ':t' => $t]);
        }
        return self::json($res, ['ok' => true, 'viewers' => self::liveViewers($t, $sid)]);
    }

    private static function liveViewers(string $t, int $sid): int
    {
        try {
            $cut = gmdate('Y-m-d H:i:s', time() - self::PRESENCE_WINDOW);
            $st = self::db()->prepare("SELECT COUNT(*) FROM live_presence WHERE tenant_id=:t AND session_id=:s AND last_seen>=:cut");
            $st->execute([':t' => $t, ':s' => $sid, ':cut' => $cut]);
            return (int)$st->fetchColumn();
        } catch (\Throwable $e) { return 0; }
    }

    public static function stats(Request $req, Response $res, array $args): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        return self::json($res, ['ok' => true, 'stats' => self::computeStats(self::tenant($req), (int)$args['id'])]);
    }

    private static function computeStats(string $t, int $sid): array
    {
        $pdo = self::db();
        $sess = $pdo->prepare("SELECT * FROM live_sessions WHERE id=:id AND tenant_id=:t");
        $sess->execute([':id' => $sid, ':t' => $t]);
        $s = $sess->fetch(\PDO::FETCH_ASSOC) ?: [];

        $viewers = self::liveViewers($t, $sid);
        // peak 갱신
        if ($viewers > (int)($s['peak_viewers'] ?? 0)) {
            $pdo->prepare("UPDATE live_sessions SET viewer_count=:v, peak_viewers=:v2 WHERE id=:id AND tenant_id=:t")->execute([':v' => $viewers, ':v2' => $viewers, ':id' => $sid, ':t' => $t]);
        } else {
            $pdo->prepare("UPDATE live_sessions SET viewer_count=:v WHERE id=:id AND tenant_id=:t")->execute([':v' => $viewers, ':id' => $sid, ':t' => $t]);
        }

        $o = $pdo->prepare("SELECT COUNT(*) c, COALESCE(SUM(total),0) rev, COALESCE(SUM(qty),0) units FROM live_orders WHERE tenant_id=:t AND session_id=:s");
        $o->execute([':t' => $t, ':s' => $sid]);
        $orow = $o->fetch(\PDO::FETCH_ASSOC) ?: ['c' => 0, 'rev' => 0, 'units' => 0];

        $top = $pdo->prepare("SELECT name, COALESCE(SUM(qty),0) units, COALESCE(SUM(total),0) rev FROM live_orders WHERE tenant_id=:t AND session_id=:s GROUP BY name ORDER BY rev DESC LIMIT 5");
        $top->execute([':t' => $t, ':s' => $sid]);

        $chatCnt = $pdo->prepare("SELECT COUNT(*) FROM live_chat WHERE tenant_id=:t AND session_id=:s");
        $chatCnt->execute([':t' => $t, ':s' => $sid]);

        $orders = (int)$orow['c'];
        return [
            'session_id' => $sid,
            'status' => (string)($s['status'] ?? 'scheduled'),
            'viewers' => $viewers,
            'peak_viewers' => max($viewers, (int)($s['peak_viewers'] ?? 0)),
            'likes' => (int)($s['like_count'] ?? 0),
            'orders' => $orders,
            'units' => (float)$orow['units'],
            'revenue' => (float)$orow['rev'],
            'aov' => $orders > 0 ? round((float)$orow['rev'] / $orders) : 0,
            'conversion' => $viewers > 0 ? round($orders / $viewers * 100, 1) : 0,
            'chat_count' => (int)$chatCnt->fetchColumn(),
            'top_products' => $top->fetchAll(\PDO::FETCH_ASSOC),
            'started_at' => $s['started_at'] ?? null,
        ];
    }

    /** GET /v425/live/overview — 전 대시보드(홈/성과/커머스) 라이브 KPI 롤업 */
    public static function overview(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $t = self::tenant($req); $pdo = self::db();
        $sess = $pdo->prepare("SELECT COUNT(*) total, SUM(status='live') liveNow FROM live_sessions WHERE tenant_id=:t");
        // SQLite 는 status='live' 불리언 합계 미지원 → 분기
        if (self::isMysql($pdo)) {
            $sess->execute([':t' => $t]);
            $srow = $sess->fetch(\PDO::FETCH_ASSOC) ?: [];
            $total = (int)($srow['total'] ?? 0); $liveNow = (int)($srow['liveNow'] ?? 0);
        } else {
            $c1 = $pdo->prepare("SELECT COUNT(*) FROM live_sessions WHERE tenant_id=:t"); $c1->execute([':t' => $t]); $total = (int)$c1->fetchColumn();
            $c2 = $pdo->prepare("SELECT COUNT(*) FROM live_sessions WHERE tenant_id=:t AND status='live'"); $c2->execute([':t' => $t]); $liveNow = (int)$c2->fetchColumn();
        }
        $o = $pdo->prepare("SELECT COUNT(*) c, COALESCE(SUM(total),0) rev, COALESCE(SUM(qty),0) units FROM live_orders WHERE tenant_id=:t");
        $o->execute([':t' => $t]);
        $orow = $o->fetch(\PDO::FETCH_ASSOC) ?: ['c' => 0, 'rev' => 0, 'units' => 0];
        // 현재 라이브 세션 stats(있으면)
        $liveSess = $pdo->prepare("SELECT id FROM live_sessions WHERE tenant_id=:t AND status='live' ORDER BY id DESC LIMIT 1");
        $liveSess->execute([':t' => $t]);
        $liveId = (int)($liveSess->fetchColumn() ?: 0);
        return self::json($res, ['ok' => true, 'overview' => [
            'total_sessions' => $total,
            'live_now' => $liveNow,
            'total_orders' => (int)$orow['c'],
            'total_units' => (float)$orow['units'],
            'total_revenue' => (float)$orow['rev'],
            'live_session_id' => $liveId ?: null,
            'live_stats' => $liveId ? self::computeStats($t, $liveId) : null,
        ]]);
    }

    /* ════════════════ 연동 프레임워크(Integrations) ════════════════ */

    public static function listIntegrations(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $st = self::db()->prepare("SELECT id,tenant_id,channel,category,status,config,connected_at,updated_at,secret FROM live_integrations WHERE tenant_id=:t");
        $st->execute([':t' => self::tenant($req)]);
        $rows = $st->fetchAll(\PDO::FETCH_ASSOC);
        $map = [];
        foreach ($rows as $r) {
            $plain = Crypto::decrypt((string)($r['secret'] ?? ''));
            $map[$r['channel']] = [
                'channel' => $r['channel'], 'category' => $r['category'], 'status' => $r['status'],
                'config' => $r['config'] ? json_decode((string)$r['config'], true) : null,
                'hasSecret' => $plain !== '', 'connected_at' => $r['connected_at'], 'updated_at' => $r['updated_at'],
            ];
        }
        return self::json($res, ['ok' => true, 'integrations' => $map]);
    }

    public static function saveIntegration(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $t = self::tenant($req); $b = self::body($req); $now = self::now(); $pdo = self::db();
        $channel = trim((string)($b['channel'] ?? ''));
        if ($channel === '') return self::json($res, ['ok' => false, 'error' => '채널이 필요합니다.'], 422);
        $category = (string)($b['category'] ?? 'sns_live');
        $status = (string)($b['status'] ?? 'connected');
        $config = isset($b['config']) ? json_encode($b['config'], JSON_UNESCAPED_UNICODE) : null;
        $rawSecret = (string)($b['secret'] ?? $b['api_key'] ?? '');
        $secret = ($rawSecret !== '' && strpos($rawSecret, '•') === false) ? Crypto::encrypt($rawSecret) : null;

        $sel = $pdo->prepare("SELECT id, secret FROM live_integrations WHERE tenant_id=:t AND channel=:c");
        $sel->execute([':t' => $t, ':c' => $channel]);
        $exist = $sel->fetch(\PDO::FETCH_ASSOC);
        if ($exist) {
            $keepSecret = $secret ?? $exist['secret'];
            $pdo->prepare("UPDATE live_integrations SET category=:cat,status=:s,config=:cfg,secret=:sec,connected_at=:con,updated_at=:ua WHERE id=:id AND tenant_id=:t")
                ->execute([':cat' => $category, ':s' => $status, ':cfg' => $config, ':sec' => $keepSecret, ':con' => $status === 'connected' ? $now : ($exist['connected_at'] ?? null), ':ua' => $now, ':id' => $exist['id'], ':t' => $t]);
            return self::json($res, ['ok' => true, 'id' => (int)$exist['id'], 'status' => $status]);
        }
        $pdo->prepare("INSERT INTO live_integrations (tenant_id,channel,category,status,config,secret,connected_at,created_at,updated_at) VALUES (:t,:c,:cat,:s,:cfg,:sec,:con,:ca,:ua)")
            ->execute([':t' => $t, ':c' => $channel, ':cat' => $category, ':s' => $status, ':cfg' => $config, ':sec' => $secret, ':con' => $status === 'connected' ? $now : null, ':ca' => $now, ':ua' => $now]);
        return self::json($res, ['ok' => true, 'id' => (int)$pdo->lastInsertId(), 'status' => $status]);
    }

    public static function deleteIntegration(Request $req, Response $res, array $args): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $st = self::db()->prepare("DELETE FROM live_integrations WHERE channel=:c AND tenant_id=:t");
        $st->execute([':c' => (string)$args['channel'], ':t' => self::tenant($req)]);
        return self::json($res, ['ok' => true, 'deleted' => $st->rowCount()]);
    }

    /* ════════════════ 멀티 송출 대상(RTMP Destinations) — 208차 #1 ════════════════ */
    // 컨트롤 플레인: 세션별 송출 대상(채널·RTMP URL·스트림키 AES) 관리·활성화·상태.
    //   실제 릴레이(브라우저 카메라→RTMP 팬아웃)는 미디어 서버(SRS/nginx-rtmp 등) 워커가 수행.
    //   본 핸들러는 대상/상태를 영속화하고, 릴레이 워커가 읽어갈 페이로드(relayPlan)를 제공한다.

    public static function listDestinations(Request $req, Response $res, array $args): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $st = self::db()->prepare("SELECT id,session_id,channel,label,rtmp_url,stream_key,enabled,status,last_status_at,updated_at FROM live_destinations WHERE tenant_id=:t AND session_id=:s ORDER BY id ASC");
        $st->execute([':t' => self::tenant($req), ':s' => (int)$args['id']]);
        $rows = $st->fetchAll(\PDO::FETCH_ASSOC);
        foreach ($rows as &$r) {
            $r['enabled'] = (bool)(int)($r['enabled'] ?? 1);
            $plain = Crypto::decrypt((string)($r['stream_key'] ?? ''));
            $r['hasKey'] = $plain !== '';
            $r['stream_key'] = $plain !== '' ? (substr($plain, 0, 3) . str_repeat('•', max(0, min(12, strlen($plain) - 3)))) : '';
        }
        return self::json($res, ['ok' => true, 'destinations' => $rows]);
    }

    public static function saveDestination(Request $req, Response $res, array $args): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $t = self::tenant($req); $b = self::body($req); $now = self::now(); $pdo = self::db();
        $sid = (int)($args['id'] ?? $b['session_id'] ?? 0);
        $channel = trim((string)($b['channel'] ?? ''));
        if ($sid <= 0 || $channel === '') return self::json($res, ['ok' => false, 'error' => '세션/채널이 필요합니다.'], 422);
        $rawKey = (string)($b['stream_key'] ?? $b['streamKey'] ?? '');
        $f = [
            ':label' => (string)($b['label'] ?? $channel), ':url' => (string)($b['rtmp_url'] ?? $b['rtmpUrl'] ?? ''),
            ':ch' => $channel, ':en' => !empty($b['enabled']) || !isset($b['enabled']) ? 1 : 0,
        ];
        $id = (int)($b['id'] ?? 0);
        if ($id > 0) {
            $f[':id'] = $id; $f[':t'] = $t; $f[':s'] = $sid; $f[':ua'] = $now;
            if ($rawKey !== '' && strpos($rawKey, '•') === false) {
                $f[':key'] = Crypto::encrypt($rawKey);
                $st = $pdo->prepare("UPDATE live_destinations SET channel=:ch,label=:label,rtmp_url=:url,stream_key=:key,enabled=:en,updated_at=:ua WHERE id=:id AND tenant_id=:t AND session_id=:s");
            } else {
                $st = $pdo->prepare("UPDATE live_destinations SET channel=:ch,label=:label,rtmp_url=:url,enabled=:en,updated_at=:ua WHERE id=:id AND tenant_id=:t AND session_id=:s");
            }
            $st->execute($f);
            return self::json($res, ['ok' => true, 'id' => $id]);
        }
        $f[':t'] = $t; $f[':s'] = $sid; $f[':key'] = $rawKey !== '' ? Crypto::encrypt($rawKey) : ''; $f[':ca'] = $now; $f[':ua'] = $now;
        $st = $pdo->prepare("INSERT INTO live_destinations (tenant_id,session_id,channel,label,rtmp_url,stream_key,enabled,status,created_at,updated_at) VALUES (:t,:s,:ch,:label,:url,:key,:en,'idle',:ca,:ua)");
        $st->execute($f);
        return self::json($res, ['ok' => true, 'id' => (int)$pdo->lastInsertId()]);
    }

    public static function deleteDestination(Request $req, Response $res, array $args): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $st = self::db()->prepare("DELETE FROM live_destinations WHERE id=:id AND tenant_id=:t");
        $st->execute([':id' => (int)$args['id'], ':t' => self::tenant($req)]);
        return self::json($res, ['ok' => true, 'deleted' => $st->rowCount()]);
    }

    public static function toggleDestination(Request $req, Response $res, array $args): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $t = self::tenant($req); $id = (int)$args['id']; $pdo = self::db();
        $row = $pdo->prepare("SELECT enabled FROM live_destinations WHERE id=:id AND tenant_id=:t");
        $row->execute([':id' => $id, ':t' => $t]);
        $cur = $row->fetchColumn();
        if ($cur === false) return self::json($res, ['ok' => false, 'error' => '없음'], 404);
        $new = (int)$cur ? 0 : 1;
        $pdo->prepare("UPDATE live_destinations SET enabled=:e, updated_at=:u WHERE id=:id AND tenant_id=:t")
            ->execute([':e' => $new, ':u' => self::now(), ':id' => $id, ':t' => $t]);
        return self::json($res, ['ok' => true, 'id' => $id, 'enabled' => (bool)$new]);
    }

    /** POST /v425/live/sessions/{id}/multicast/{action} — start|stop. 활성 대상 status 전환 + relayPlan 반환. */
    public static function multicast(Request $req, Response $res, array $args): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $t = self::tenant($req); $sid = (int)$args['id']; $action = (string)($args['action'] ?? 'start'); $now = self::now(); $pdo = self::db();
        $start = $action !== 'stop';
        $newStatus = $start ? 'live' : 'idle';
        // 활성(enabled) 대상만 상태 전환
        $pdo->prepare("UPDATE live_destinations SET status=:st, last_status_at=:u WHERE tenant_id=:t AND session_id=:s AND enabled=1")
            ->execute([':st' => $newStatus, ':u' => $now, ':t' => $t, ':s' => $sid]);
        if (!$start) {
            $pdo->prepare("UPDATE live_destinations SET status='idle', last_status_at=:u WHERE tenant_id=:t AND session_id=:s")
                ->execute([':u' => $now, ':t' => $t, ':s' => $sid]);
        }
        // 릴레이 워커용 페이로드(스트림키 평문은 워커 권한에서만; 여기선 대상 목록만 노출, 키는 hasKey로 표기)
        $dst = $pdo->prepare("SELECT channel,label,rtmp_url,enabled,status,stream_key FROM live_destinations WHERE tenant_id=:t AND session_id=:s AND enabled=1");
        $dst->execute([':t' => $t, ':s' => $sid]);
        $plan = [];
        foreach ($dst->fetchAll(\PDO::FETCH_ASSOC) as $d) {
            $plan[] = ['channel' => $d['channel'], 'label' => $d['label'], 'rtmp_url' => $d['rtmp_url'], 'hasKey' => Crypto::decrypt((string)($d['stream_key'] ?? '')) !== '', 'status' => $newStatus];
        }
        return self::json($res, ['ok' => true, 'action' => $start ? 'start' : 'stop', 'session_id' => $sid, 'targets' => count($plan), 'relayPlan' => $plan,
            'note' => '대상 상태가 전환되었습니다. 실제 송출은 미디어 서버(SRS/nginx-rtmp) 릴레이 워커가 relayPlan과 ingest 스트림을 받아 수행합니다.']);
    }

    /* ════════════════ 실시간 SSE 스트림 ════════════════ */

    /**
     * GET /v425/live/stream?session_id=&since=&token= — SSE long-poll.
     * 이벤트: chat(신규 채팅/구매/시스템 행) + stats(주기적 통계 스냅샷) + bye(cap).
     * EventSource 는 헤더 불가 → ?token= 로 인증(UserAuth::extractToken 이 query token 지원).
     */
    public static function stream(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $t = self::tenant($req);
        $q = $req->getQueryParams();
        $sid = (int)($q['session_id'] ?? 0);
        if ($sid <= 0) return self::json($res, ['ok' => false, 'error' => 'session_id 필요'], 422);

        $lastId = (int)($req->getHeaderLine('Last-Event-ID') ?: ($q['since'] ?? 0));
        if ($lastId <= 0) {
            try {
                $m = self::db()->prepare("SELECT MAX(id) FROM live_chat WHERE tenant_id=:t AND session_id=:s");
                $m->execute([':t' => $t, ':s' => $sid]);
                $lastId = (int)($m->fetchColumn() ?: 0);
            } catch (\Throwable $e) { $lastId = 0; }
        }

        if (!headers_sent()) {
            header('Content-Type: text/event-stream; charset=utf-8');
            header('Cache-Control: no-cache, no-transform');
            header('Connection: keep-alive');
            header('X-Accel-Buffering: no');
        }
        while (ob_get_level() > 0) { @ob_end_flush(); }
        @ini_set('zlib.output_compression', '0');
        ob_implicit_flush(true);
        @set_time_limit(self::SSE_MAX_SEC + 10);
        ignore_user_abort(false);

        echo "retry: 4000\n\n";
        self::emit('ready', ['session_id' => $sid, 'last_event_id' => $lastId, 'ts' => date('c')], $lastId);
        self::emit('stats', self::computeStats($t, $sid), null);
        @flush();

        $pdo = self::db();
        $chatStmt = $pdo->prepare("SELECT * FROM live_chat WHERE tenant_id=? AND session_id=? AND id>? ORDER BY id ASC LIMIT 50");
        $start = time(); $lastHb = $start; $lastStats = $start;

        while (true) {
            if (connection_aborted()) break;
            if ((time() - $start) >= self::SSE_MAX_SEC) {
                self::emit('bye', ['reason' => 'duration_cap', 'last_event_id' => $lastId], null);
                @flush();
                break;
            }
            try {
                $chatStmt->execute([$t, $sid, $lastId]);
                $rows = $chatStmt->fetchAll(\PDO::FETCH_ASSOC);
            } catch (\Throwable $e) { $rows = []; }

            if ($rows) {
                foreach ($rows as $r) {
                    $eid = (int)$r['id'];
                    self::emit('chat', [
                        'id' => $eid, 'author' => $r['author'], 'message' => $r['message'],
                        'kind' => $r['kind'], 'meta' => $r['meta'] ? json_decode((string)$r['meta'], true) : null,
                        'ts' => $r['created_at'],
                    ], $eid);
                    $lastId = max($lastId, $eid);
                }
                @flush();
                $lastHb = time();
            }
            // 주기적 stats(3s) — 시청자/매출 실시간 반영
            if ((time() - $lastStats) >= 3) {
                self::emit('stats', self::computeStats($t, $sid), null);
                @flush();
                $lastStats = time(); $lastHb = time();
            } elseif ((time() - $lastHb) >= self::SSE_HB_SEC) {
                echo ": hb\n\n"; @flush(); $lastHb = time();
            }

            for ($i = 0; $i < self::SSE_POLL_SEC; $i++) {
                if (connection_aborted()) break 2;
                sleep(1);
            }
        }
        exit;
    }

    private static function emit(string $event, array $data, ?int $id): void
    {
        if ($id !== null) echo 'id: ' . $id . "\n";
        echo 'event: ' . $event . "\n";
        echo 'data: ' . json_encode($data, JSON_UNESCAPED_UNICODE) . "\n\n";
    }
}
