<?php
declare(strict_types=1);
namespace Genie\Handlers;

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;
use Genie\Db;

/**
 * Catalog — 상품 일괄 등록/가격 수정 writeback (192차 Sprint2 신규).
 *
 * 배경: CatalogSync 프론트가 호출하던 /v382/writeback/{ch}/{sku}/execute 는 191차에 제거되어
 *   404(dead-route)였고, 일괄 가격수정은 setTimeout 시뮬레이션으로 실제 반영이 전혀 없었다.
 *   → 세션 self-auth(requirePro) + 테넌트 격리(authedTenant)로 catalog_listing 에 실제 영속.
 *
 * 상태(status): 채널 자격증명(channel_credential) 존재 → 'queued'(채널 동기화 대기),
 *   없으면 'saved'(저장됨·연동대기), unregister → 'unregistered'.
 *   (실 채널 API push 는 채널별 write 어댑터로 후속 확장 — 본 핸들러는 테넌트격리 영속이 정본.)
 *
 * /api/catalog/* 는 index.php public bypass(세션 기반) → 핸들러 self-auth. (190차 CRM 패턴 정합)
 */
class Catalog
{
    private static function db(): \PDO { return Db::pdo(); }
    private static function isMysql(\PDO $pdo): bool { return $pdo->getAttribute(\PDO::ATTR_DRIVER_NAME) === 'mysql'; }
    private static function now(): string { return gmdate('Y-m-d H:i:s'); }

    private static function tenant(Request $req): string
    {
        $t = UserAuth::authedTenant($req);
        return ($t !== null && $t !== '') ? $t : 'demo';
    }

    private static function jsonRes(Response $res, array $payload, int $status = 200): Response
    {
        $res->getBody()->write(json_encode($payload, JSON_UNESCAPED_UNICODE));
        return $res->withStatus($status)->withHeader('Content-Type', 'application/json');
    }

    private static function ensureTables(): void
    {
        $pdo = self::db();
        if (self::isMysql($pdo)) {
            $pdo->exec("CREATE TABLE IF NOT EXISTS catalog_listing (
                id INT AUTO_INCREMENT PRIMARY KEY,
                tenant_id VARCHAR(100) NOT NULL DEFAULT 'demo',
                channel VARCHAR(100) NOT NULL,
                sku VARCHAR(190) NOT NULL,
                name VARCHAR(500), category VARCHAR(255),
                price DOUBLE DEFAULT 0, inventory INT DEFAULT 0, spec TEXT,
                action VARCHAR(30) NOT NULL DEFAULT 'register',
                status VARCHAR(30) NOT NULL DEFAULT 'saved',
                channel_result TEXT,
                created_at VARCHAR(32), updated_at VARCHAR(32),
                UNIQUE KEY uq_catalog_listing (tenant_id, channel, sku),
                KEY idx_catalog_tenant (tenant_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
            // 193차 Sprint4 #6: 가격이력 — 채널×SKU 가격 변경(old→new) 기록(테넌트 격리).
            $pdo->exec("CREATE TABLE IF NOT EXISTS price_history (
                id INT AUTO_INCREMENT PRIMARY KEY,
                tenant_id VARCHAR(100) NOT NULL DEFAULT 'demo',
                channel VARCHAR(100) NOT NULL, sku VARCHAR(190) NOT NULL,
                old_price DOUBLE DEFAULT 0, new_price DOUBLE DEFAULT 0,
                source VARCHAR(30) NOT NULL DEFAULT 'writeback', created_at VARCHAR(32),
                KEY idx_ph_tenant (tenant_id), KEY idx_ph_sku (tenant_id, channel, sku)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
            // [현 차수] Writeback Console 실배선 — 송출 작업 이력(테넌트 격리).
            //   ★ 레거시 writeback_job(구 v382/v392 엔진, channel 컬럼 없음)과 충돌 회피 위해 catalog_ 접두.
            $pdo->exec("CREATE TABLE IF NOT EXISTS catalog_writeback_job (
                id INT AUTO_INCREMENT PRIMARY KEY,
                tenant_id VARCHAR(100) NOT NULL DEFAULT 'demo',
                channel VARCHAR(100) NOT NULL, sku VARCHAR(190) NOT NULL,
                operation VARCHAR(40) NOT NULL DEFAULT 'publish',
                status VARCHAR(30) NOT NULL DEFAULT 'queued',
                attempt INT DEFAULT 1, payload TEXT, result TEXT,
                created_at VARCHAR(32), updated_at VARCHAR(32),
                KEY idx_wbjob_tenant (tenant_id), KEY idx_wbjob_sku (tenant_id, channel, sku)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
            // 고위험 송출(고액·등록해제) 승인 티켓(테넌트 격리).
            $pdo->exec("CREATE TABLE IF NOT EXISTS catalog_writeback_approval (
                id INT AUTO_INCREMENT PRIMARY KEY,
                tenant_id VARCHAR(100) NOT NULL DEFAULT 'demo',
                type VARCHAR(60) NOT NULL DEFAULT 'writeback',
                channel VARCHAR(100), sku VARCHAR(190), payload TEXT,
                status VARCHAR(30) NOT NULL DEFAULT 'pending',
                created_at VARCHAR(32), updated_at VARCHAR(32),
                KEY idx_wbappr_tenant (tenant_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
        } else {
            $pdo->exec("CREATE TABLE IF NOT EXISTS catalog_listing (
                id INTEGER PRIMARY KEY AUTOINCREMENT, tenant_id TEXT NOT NULL DEFAULT 'demo',
                channel TEXT NOT NULL, sku TEXT NOT NULL, name TEXT, category TEXT,
                price REAL DEFAULT 0, inventory INTEGER DEFAULT 0, spec TEXT,
                action TEXT NOT NULL DEFAULT 'register', status TEXT NOT NULL DEFAULT 'saved',
                channel_result TEXT, created_at TEXT, updated_at TEXT,
                UNIQUE (tenant_id, channel, sku)
            )");
            $pdo->exec("CREATE TABLE IF NOT EXISTS price_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT, tenant_id TEXT NOT NULL DEFAULT 'demo',
                channel TEXT NOT NULL, sku TEXT NOT NULL,
                old_price REAL DEFAULT 0, new_price REAL DEFAULT 0,
                source TEXT NOT NULL DEFAULT 'writeback', created_at TEXT
            )");
            $pdo->exec("CREATE TABLE IF NOT EXISTS catalog_writeback_job (
                id INTEGER PRIMARY KEY AUTOINCREMENT, tenant_id TEXT NOT NULL DEFAULT 'demo',
                channel TEXT NOT NULL, sku TEXT NOT NULL, operation TEXT NOT NULL DEFAULT 'publish',
                status TEXT NOT NULL DEFAULT 'queued', attempt INTEGER DEFAULT 1,
                payload TEXT, result TEXT, created_at TEXT, updated_at TEXT
            )");
            $pdo->exec("CREATE TABLE IF NOT EXISTS catalog_writeback_approval (
                id INTEGER PRIMARY KEY AUTOINCREMENT, tenant_id TEXT NOT NULL DEFAULT 'demo',
                type TEXT NOT NULL DEFAULT 'writeback', channel TEXT, sku TEXT, payload TEXT,
                status TEXT NOT NULL DEFAULT 'pending', created_at TEXT, updated_at TEXT
            )");
        }
    }

    /** 가격 변경(old≠new) 시에만 price_history 기록(테넌트 격리). best-effort. */
    private static function recordPriceChange(\PDO $pdo, string $tenant, string $channel, string $sku, $old, $new, string $source): void
    {
        $o = (float)$old; $n = (float)$new;
        if (abs($o - $n) < 0.000001) return; // 변경 없음
        try {
            $pdo->prepare("INSERT INTO price_history(tenant_id,channel,sku,old_price,new_price,source,created_at) VALUES(?,?,?,?,?,?,?)")
                ->execute([$tenant, $channel, $sku, $o, $n, $source, self::now()]);
        } catch (\Throwable $e) { /* best-effort */ }
    }

    /** 현재 등록가 조회(없으면 null). */
    private static function currentPrice(\PDO $pdo, string $tenant, string $channel, string $sku): ?float
    {
        try {
            $st = $pdo->prepare("SELECT price FROM catalog_listing WHERE tenant_id=? AND channel=? AND sku=? LIMIT 1");
            $st->execute([$tenant, $channel, $sku]);
            $v = $st->fetchColumn();
            return $v === false ? null : (float)$v;
        } catch (\Throwable $e) { return null; }
    }

    /** 채널 연결 여부 → 상태 결정 (테넌트 격리). */
    private static function channelStatus(\PDO $pdo, string $tenant, string $channel, string $action): string
    {
        if ($action === 'unregister' || $action === 'disconnect') return 'unregistered';
        try {
            $st = $pdo->prepare("SELECT 1 FROM channel_credential WHERE tenant_id=:t AND channel=:c AND is_active=1 LIMIT 1");
            $st->execute([':t' => $tenant, ':c' => $channel]);
            return $st->fetchColumn() ? 'queued' : 'saved';
        } catch (\Throwable $e) { return 'saved'; }
    }

    private static function upsert(\PDO $pdo, string $tenant, string $channel, string $sku, array $f, string $status): void
    {
        $now = self::now();
        if (self::isMysql($pdo)) {
            $sql = "INSERT INTO catalog_listing (tenant_id,channel,sku,name,category,price,inventory,spec,action,status,created_at,updated_at)
                    VALUES (:t,:c,:s,:n,:cat,:p,:inv,:spec,:act,:st,:now,:now2)
                    ON DUPLICATE KEY UPDATE name=VALUES(name),category=VALUES(category),price=VALUES(price),
                      inventory=VALUES(inventory),spec=VALUES(spec),action=VALUES(action),status=VALUES(status),updated_at=VALUES(updated_at)";
        } else {
            $sql = "INSERT INTO catalog_listing (tenant_id,channel,sku,name,category,price,inventory,spec,action,status,created_at,updated_at)
                    VALUES (:t,:c,:s,:n,:cat,:p,:inv,:spec,:act,:st,:now,:now2)
                    ON CONFLICT(tenant_id,channel,sku) DO UPDATE SET name=excluded.name,category=excluded.category,
                      price=excluded.price,inventory=excluded.inventory,spec=excluded.spec,action=excluded.action,
                      status=excluded.status,updated_at=excluded.updated_at";
        }
        $oldPrice = self::currentPrice($pdo, $tenant, $channel, $sku); // 변경 전 등록가(없으면 null)
        $newPrice = (float)($f['price'] ?? 0);
        $st = $pdo->prepare($sql);
        $st->execute([
            ':t' => $tenant, ':c' => $channel, ':s' => $sku,
            ':n' => (string)($f['name'] ?? ''), ':cat' => (string)($f['category'] ?? ''),
            ':p' => $newPrice, ':inv' => (int)($f['inventory'] ?? 0),
            ':spec' => (string)($f['spec'] ?? ''), ':act' => (string)($f['action'] ?? 'register'),
            ':st' => $status, ':now' => $now, ':now2' => $now,
        ]);
        // 기존 리스팅의 실제 가격 변경만 이력화(신규 등록은 변경 아님 → 제외).
        if ($oldPrice !== null && array_key_exists('price', $f)) {
            self::recordPriceChange($pdo, $tenant, $channel, $sku, $oldPrice, $newPrice, 'writeback');
        }
    }

    /* POST /catalog/writeback/{channel}/{sku} — 단일 상품×채널 등록/수정 */
    public static function writeback(Request $req, Response $res, array $args): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $pdo = self::db();
        $tenant = self::tenant($req);
        $channel = (string)($args['channel'] ?? '');
        $sku = rawurldecode((string)($args['sku'] ?? ''));
        if ($channel === '' || $sku === '') return self::jsonRes($res, ['ok' => false, 'error' => 'channel/sku required'], 400);
        $body = (array)($req->getParsedBody() ?? []);
        $action = (string)($body['action'] ?? 'register');
        // 기존 리스팅과 병합(누락 필드는 기존값 보존 → execute 시 부분 payload 로 인한 데이터 손실 방지).
        $f = self::mergeWithExisting($pdo, $tenant, $channel, $sku, $body, $action);
        $status = self::channelStatus($pdo, $tenant, $channel, $action);
        self::upsert($pdo, $tenant, $channel, $sku, $f, $status);
        self::logJob($pdo, $tenant, $channel, $sku, (string)($body['operation'] ?? 'publish'), $status, $f);
        return self::jsonRes($res, ['ok' => true, 'status' => $status, 'channel' => $channel, 'sku' => $sku]);
    }

    /* POST /catalog/bulk-price — body: {items:[{channel,sku,price}]} 일괄 가격 수정 */
    public static function bulkPrice(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $pdo = self::db();
        $tenant = self::tenant($req);
        $body = (array)($req->getParsedBody() ?? []);
        $items = $body['items'] ?? [];
        if (!is_array($items) || !$items) return self::jsonRes($res, ['ok' => false, 'error' => 'items required'], 400);
        $now = self::now();
        $updated = 0;
        $pdo->beginTransaction();
        try {
            $upd = $pdo->prepare("UPDATE catalog_listing SET price=:p, updated_at=:now WHERE tenant_id=:t AND channel=:c AND sku=:s");
            foreach ($items as $it) {
                if (!is_array($it)) continue;
                $ch = (string)($it['channel'] ?? '');
                $sk = (string)($it['sku'] ?? '');
                if ($ch === '' || $sk === '') continue;
                $newP = (float)($it['price'] ?? 0);
                $oldP = self::currentPrice($pdo, $tenant, $ch, $sk); // 변경 전 가격
                $upd->execute([':p' => $newP, ':now' => $now, ':t' => $tenant, ':c' => $ch, ':s' => $sk]);
                $n = $upd->rowCount();
                $updated += $n;
                if ($n > 0 && $oldP !== null) self::recordPriceChange($pdo, $tenant, $ch, $sk, $oldP, $newP, 'bulk');
            }
            $pdo->commit();
        } catch (\Throwable $e) {
            if ($pdo->inTransaction()) $pdo->rollBack();
            return self::jsonRes($res, ['ok' => false, 'error' => $e->getMessage()], 500);
        }
        return self::jsonRes($res, ['ok' => true, 'updated' => $updated]);
    }

    /* GET /catalog/listings — 테넌트 등록 리스팅 조회 */
    public static function listings(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $pdo = self::db();
        $tenant = self::tenant($req);
        $st = $pdo->prepare("SELECT channel,sku,name,category,price,inventory,action,status,updated_at
                             FROM catalog_listing WHERE tenant_id=:t ORDER BY updated_at DESC LIMIT 1000");
        $st->execute([':t' => $tenant]);
        return self::jsonRes($res, ['ok' => true, 'listings' => $st->fetchAll(\PDO::FETCH_ASSOC)]);
    }

    /* GET /catalog/price-history?channel=&sku= — 테넌트 가격 변경 이력(최근순). 193차 Sprint4 #6 */
    public static function priceHistory(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $pdo = self::db();
        $tenant = self::tenant($req);
        $q = $req->getQueryParams();
        $where = ['tenant_id = :t']; $params = [':t' => $tenant];
        if (!empty($q['channel'])) { $where[] = 'channel = :c'; $params[':c'] = (string)$q['channel']; }
        if (!empty($q['sku']))     { $where[] = 'sku = :s';     $params[':s'] = (string)$q['sku']; }
        $sql = "SELECT channel,sku,old_price,new_price,source,created_at FROM price_history
                WHERE " . implode(' AND ', $where) . " ORDER BY id DESC LIMIT 500";
        $st = $pdo->prepare($sql);
        $st->execute($params);
        return self::jsonRes($res, ['ok' => true, 'history' => $st->fetchAll(\PDO::FETCH_ASSOC)]);
    }

    /* ════════════════════════════════════════════════════════════════════════
       Writeback Console 실배선 ([현 차수])
       프론트 Writeback.jsx 콘솔이 호출하던 /v382/* (404)·/v401·/v398 (api_key 401)
       을 세션 기반 /catalog/* 로 통합 재배선. 정책검증·카테고리추천·미리보기·prepare·
       approvals·jobs 전부 테넌트 격리 영속. (192차 CatalogSync 세션 패턴 동일.)
       ════════════════════════════════════════════════════════════════════════ */

    private const HIGH_VALUE_KRW = 5000000.0; // 고액 상품 → 승인 게이트 임계

    /** 기존 catalog_listing 행과 병합(body 우선, 누락 필드는 기존값 보존). title→name 폴백. */
    private static function mergeWithExisting(\PDO $pdo, string $tenant, string $channel, string $sku, array $body, string $action): array
    {
        $existing = [];
        try {
            $st = $pdo->prepare("SELECT name,category,price,inventory,spec FROM catalog_listing WHERE tenant_id=? AND channel=? AND sku=? LIMIT 1");
            $st->execute([$tenant, $channel, $sku]);
            $existing = $st->fetch(\PDO::FETCH_ASSOC) ?: [];
        } catch (\Throwable $e) { /* best-effort */ }
        $name = $body['name'] ?? $body['title'] ?? null;
        return [
            'name'      => ($name !== null && $name !== '') ? (string)$name : (string)($existing['name'] ?? ''),
            'category'  => array_key_exists('category', $body) ? (string)$body['category'] : (string)($existing['category'] ?? ''),
            'price'     => array_key_exists('price', $body) ? $body['price'] : ($existing['price'] ?? 0),
            'inventory' => array_key_exists('inventory', $body) ? $body['inventory'] : ($existing['inventory'] ?? 0),
            'spec'      => array_key_exists('spec', $body) ? (string)$body['spec'] : (string)($existing['spec'] ?? ''),
            'action'    => $action,
        ];
    }

    /** 결정적 정책 검증(랜덤 없음·테넌트 무관 규칙). findings + 승인필요 여부 산출. */
    private static function evaluatePolicy(\PDO $pdo, string $tenant, string $channel, array $product, string $action): array
    {
        $findings = [];
        $title = trim((string)($product['title'] ?? $product['name'] ?? ''));
        $price = (float)($product['price'] ?? 0);
        $category = trim((string)($product['category'] ?? ''));
        $requiresApproval = false; $approvalType = null;

        if ($action === 'unregister' || $action === 'disconnect') {
            $requiresApproval = true; $approvalType = 'unregister';
            $findings[] = ['level' => 'warn', 'code' => 'UNREGISTER', 'message' => '채널 등록 해제는 승인이 필요합니다.'];
        }
        if ($title === '') {
            $findings[] = ['level' => 'error', 'code' => 'MISSING_TITLE', 'message' => '상품명(title)이 필요합니다.'];
        } elseif (mb_strlen($title) > 100) {
            $findings[] = ['level' => 'warn', 'code' => 'TITLE_TOO_LONG', 'message' => '상품명이 100자를 초과합니다(채널에서 잘릴 수 있음).'];
        }
        if ($price <= 0) {
            $findings[] = ['level' => 'error', 'code' => 'INVALID_PRICE', 'message' => '판매가는 0보다 커야 합니다.'];
        } elseif ($price >= self::HIGH_VALUE_KRW) {
            $requiresApproval = true; $approvalType = $approvalType ?: 'high_value';
            $findings[] = ['level' => 'warn', 'code' => 'HIGH_VALUE', 'message' => '고액 상품(₩' . number_format($price) . ')은 승인이 필요합니다.'];
        }
        if ($category === '') {
            $findings[] = ['level' => 'info', 'code' => 'NO_CATEGORY', 'message' => '카테고리가 비어 있습니다(자동 추천을 사용하세요).'];
        }
        $connected = false;
        try {
            $st = $pdo->prepare("SELECT 1 FROM channel_credential WHERE tenant_id=:t AND channel=:c AND is_active=1 LIMIT 1");
            $st->execute([':t' => $tenant, ':c' => $channel]);
            $connected = (bool)$st->fetchColumn();
        } catch (\Throwable $e) { /* best-effort */ }
        if (!$connected) {
            $findings[] = ['level' => 'warn', 'code' => 'CHANNEL_NOT_CONNECTED', 'message' => '채널 자격증명이 없습니다. 저장은 되나 송출은 연동 후 진행됩니다.'];
        }
        $hasError = false;
        foreach ($findings as $fnd) { if ($fnd['level'] === 'error') { $hasError = true; break; } }
        return [
            'ok' => !$hasError,
            'findings' => $findings,
            'requires_approval' => $requiresApproval,
            'approval_type' => $approvalType,
            'connected' => $connected,
        ];
    }

    /** 결정적 카테고리 추천(키워드 사전 기반·랜덤 없음·공개 분류 체계라 테넌트 무관). */
    private static function suggestCategories(string $channel, array $product): array
    {
        $hay = mb_strtolower(trim(((string)($product['title'] ?? $product['name'] ?? '')) . ' '
            . ((string)($product['category'] ?? '')) . ' ' . ((string)($product['spec'] ?? ''))));
        $map = [
            'Electronics/Mobile'    => ['phone','smartphone','갤럭시','아이폰','iphone','galaxy','스마트폰','휴대폰'],
            'Electronics/Computers' => ['laptop','노트북','컴퓨터','pc','tablet','태블릿','맥북','macbook'],
            'Electronics/Audio'     => ['earbuds','이어폰','헤드폰','headphone','스피커','speaker','airpods'],
            'Fashion/Apparel'       => ['shirt','셔츠','티셔츠','의류','apparel','dress','원피스','바지','pants','자켓','jacket'],
            'Fashion/Shoes'         => ['shoes','신발','운동화','sneaker','구두','부츠','boots'],
            'Beauty/Skincare'       => ['skincare','스킨케어','크림','cream','세럼','serum','로션','lotion','화장품','cosmetic'],
            'Home/Kitchen'          => ['kitchen','주방','냄비','pan','그릇','텀블러','tumbler','조리'],
            'Food/Grocery'          => ['food','식품','간식','snack','커피','coffee','과자','음료','beverage'],
            'Sports/Outdoor'        => ['sports','스포츠','운동','fitness','캠핑','camping','outdoor','등산'],
            'Baby/Kids'             => ['baby','아기','유아','kids','어린이','장난감','toy'],
        ];
        $suggestions = [];
        foreach ($map as $path => $kw) {
            $hits = 0;
            foreach ($kw as $w) { if ($w !== '' && mb_strpos($hay, $w) !== false) $hits++; }
            if ($hits > 0) $suggestions[] = ['category_path' => $path, 'confidence' => round(min(0.95, 0.5 + 0.15 * $hits), 2), 'matched' => $hits];
        }
        usort($suggestions, fn($a, $b) => $b['confidence'] <=> $a['confidence']);
        if (!$suggestions) $suggestions[] = ['category_path' => 'General/Uncategorized', 'confidence' => 0.3, 'matched' => 0];
        return array_slice($suggestions, 0, 3);
    }

    /** 채널 송출용 정규화 payload. */
    private static function normalizePayload(string $channel, string $sku, array $product): array
    {
        return [
            'channel'   => $channel,
            'sku'       => $sku !== '' ? $sku : (string)($product['sku'] ?? ''),
            'title'     => (string)($product['title'] ?? $product['name'] ?? ''),
            'price'     => (float)($product['price'] ?? 0),
            'currency'  => (string)($product['currency'] ?? 'KRW'),
            'inventory' => (int)($product['inventory'] ?? 0),
            'category'  => (string)($product['category'] ?? ''),
            'spec'      => (string)($product['spec'] ?? ''),
        ];
    }

    /** writeback_job 기록(best-effort). */
    private static function logJob(\PDO $pdo, string $tenant, string $channel, string $sku, string $operation, string $status, array $payload): void
    {
        try {
            $now = self::now();
            $pdo->prepare("INSERT INTO catalog_writeback_job(tenant_id,channel,sku,operation,status,attempt,payload,created_at,updated_at)
                           VALUES(?,?,?,?,?,1,?,?,?)")
                ->execute([$tenant, $channel, $sku, $operation, $status, json_encode($payload, JSON_UNESCAPED_UNICODE), $now, $now]);
        } catch (\Throwable $e) { /* best-effort */ }
    }

    /* POST /catalog/writeback/policy — body:{channel,product} 정책 검증 */
    public static function policyValidate(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $pdo = self::db(); $tenant = self::tenant($req);
        $body = (array)($req->getParsedBody() ?? []);
        $channel = (string)($body['channel'] ?? '');
        $product = (array)($body['product'] ?? []);
        $action = (string)($product['action'] ?? $body['action'] ?? 'register');
        if ($channel === '') return self::jsonRes($res, ['ok' => false, 'error' => 'channel required'], 400);
        return self::jsonRes($res, self::evaluatePolicy($pdo, $tenant, $channel, $product, $action));
    }

    /* POST /catalog/writeback/category — body:{channel,product} 카테고리 추천 */
    public static function categorySuggest(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        $body = (array)($req->getParsedBody() ?? []);
        $channel = (string)($body['channel'] ?? '');
        $product = (array)($body['product'] ?? []);
        if ($channel === '') return self::jsonRes($res, ['ok' => false, 'error' => 'channel required'], 400);
        return self::jsonRes($res, ['ok' => true, 'channel' => $channel, 'suggestions' => self::suggestCategories($channel, $product)]);
    }

    /* POST /catalog/writeback/preview — body:{channel,product} 송출 전 검증+정규화 미리보기 */
    public static function preview(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $pdo = self::db(); $tenant = self::tenant($req);
        $body = (array)($req->getParsedBody() ?? []);
        $channel = (string)($body['channel'] ?? '');
        $product = (array)($body['product'] ?? []);
        if ($channel === '') return self::jsonRes($res, ['ok' => false, 'error' => 'channel required'], 400);
        $sku = (string)($product['sku'] ?? '');
        $action = (string)($product['action'] ?? 'register');
        $policy = self::evaluatePolicy($pdo, $tenant, $channel, $product, $action);
        return self::jsonRes($res, [
            'ok' => true,
            'validation' => ['ok' => $policy['ok'], 'findings' => $policy['findings']],
            'normalized_payload' => self::normalizePayload($channel, $sku, $product),
            'category' => self::suggestCategories($channel, $product),
        ]);
    }

    /* POST /catalog/writeback/{channel}/{sku}/prepare — 송출 준비(정책+승인판정+job 기록) */
    public static function prepare(Request $req, Response $res, array $args): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $pdo = self::db(); $tenant = self::tenant($req);
        $channel = (string)($args['channel'] ?? '');
        $sku = rawurldecode((string)($args['sku'] ?? ''));
        if ($channel === '' || $sku === '') return self::jsonRes($res, ['ok' => false, 'error' => 'channel/sku required'], 400);
        $body = (array)($req->getParsedBody() ?? []);
        $operation = (string)($req->getQueryParams()['operation'] ?? $body['operation'] ?? 'publish');
        $action = $operation === 'unregister' ? 'unregister' : (string)($body['action'] ?? 'register');
        // 요청 body 의 product 우선, 없으면 기존 등록 리스팅을 기반으로 payload 구성.
        $product = $body['product'] ?? [];
        if (!is_array($product) || !$product) {
            try {
                $st = $pdo->prepare("SELECT name AS title, category, price, inventory, spec FROM catalog_listing WHERE tenant_id=? AND channel=? AND sku=? LIMIT 1");
                $st->execute([$tenant, $channel, $sku]);
                $row = $st->fetch(\PDO::FETCH_ASSOC);
                if ($row) $product = $row;
            } catch (\Throwable $e) { /* best-effort */ }
        }
        $product = (array)$product;
        $product['sku'] = $sku;
        $policy = self::evaluatePolicy($pdo, $tenant, $channel, $product, $action);
        $payload = self::normalizePayload($channel, $sku, $product);
        self::logJob($pdo, $tenant, $channel, $sku, $operation, $policy['requires_approval'] ? 'pending_approval' : 'prepared', $payload);
        return self::jsonRes($res, [
            'ok' => $policy['ok'],
            'channel' => $channel, 'sku' => $sku, 'operation' => $operation,
            'requires_approval' => $policy['requires_approval'],
            'approval_type' => $policy['approval_type'],
            'findings' => $policy['findings'],
            'payload' => $payload,
        ]);
    }

    /* POST /catalog/approvals — body:{type,channel,sku,payload} 승인 티켓 생성(테넌트 격리) */
    public static function approvalCreate(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $pdo = self::db(); $tenant = self::tenant($req);
        $body = (array)($req->getParsedBody() ?? []);
        $type = (string)($body['type'] ?? 'writeback');
        $channel = (string)($body['channel'] ?? '');
        $sku = (string)($body['sku'] ?? '');
        $payload = $body['payload'] ?? [];
        $now = self::now();
        try {
            $pdo->prepare("INSERT INTO catalog_writeback_approval(tenant_id,type,channel,sku,payload,status,created_at,updated_at)
                           VALUES(?,?,?,?,?,?,?,?)")
                ->execute([$tenant, $type, $channel, $sku, json_encode($payload, JSON_UNESCAPED_UNICODE), 'pending', $now, $now]);
            $id = (int)$pdo->lastInsertId();
        } catch (\Throwable $e) {
            return self::jsonRes($res, ['ok' => false, 'error' => $e->getMessage()], 500);
        }
        return self::jsonRes($res, ['ok' => true, 'approval_id' => $id, 'status' => 'pending', 'type' => $type]);
    }

    /* GET /catalog/writeback/jobs — 테넌트 writeback 작업 이력(최근순·바 배열 반환) */
    public static function jobs(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $pdo = self::db(); $tenant = self::tenant($req);
        $st = $pdo->prepare("SELECT id,channel,sku,operation,status,attempt,updated_at FROM catalog_writeback_job WHERE tenant_id=:t ORDER BY id DESC LIMIT 200");
        $st->execute([':t' => $tenant]);
        return self::jsonRes($res, $st->fetchAll(\PDO::FETCH_ASSOC));
    }
}
