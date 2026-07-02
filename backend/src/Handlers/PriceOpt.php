<?php
declare(strict_types=1);

namespace Genie\Handlers;

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;

/**
 * v420 — Price Optimisation Engine
 *
 * 206차 #6: 기존 `sqlite::memory:`(요청마다 소실 + 테넌트 미격리)를 영속 SQLite 파일 +
 *   전 테이블 tenant_id + 전 쿼리 테넌트 스코핑으로 전환.
 *   - 영속: backend/data/priceopt.sqlite (운영/데모는 backend 디렉터리가 분리돼 파일도 자동 분리).
 *   - 격리: tenant = UserAuth::authedTenant(세션 토큰 해석, 익명/데모→'demo'). 라우트는 public bypass
 *           이지만 핸들러가 세션 토큰에서 테넌트를 자체 도출(ChannelSync 패턴)하므로 격리 성립.
 *   ※ SQLite 전용 SQL(INSERT OR REPLACE/AUTOINCREMENT)을 유지해 MySQL DDL 변환 위험을 회피.
 */
class PriceOpt
{
    // ─── DB bootstrap ────────────────────────────────────────────────────────

    private static ?\PDO $db = null;

    private static function db(): \PDO
    {
        if (self::$db !== null) return self::$db;

        $dir = __DIR__ . '/../../data';
        if (!is_dir($dir)) { @mkdir($dir, 0775, true); }
        $path = $dir . '/priceopt.sqlite';

        $pdo = new \PDO('sqlite:' . $path);
        $pdo->setAttribute(\PDO::ATTR_ERRMODE, \PDO::ERRMODE_EXCEPTION);
        $pdo->exec("PRAGMA journal_mode=WAL");
        $pdo->exec("PRAGMA busy_timeout=5000");

        $pdo->exec("CREATE TABLE IF NOT EXISTS po_products (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            tenant_id    TEXT NOT NULL DEFAULT 'demo',
            sku          TEXT NOT NULL,
            product_name TEXT NOT NULL,
            cost_price   REAL NOT NULL DEFAULT 0,
            target_margin REAL NOT NULL DEFAULT 0.30,
            base_price   REAL,
            unit         TEXT DEFAULT 'KRW',
            created_at   TEXT NOT NULL,
            UNIQUE(tenant_id, sku)
        )");

        $pdo->exec("CREATE TABLE IF NOT EXISTS po_elasticity (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            tenant_id  TEXT NOT NULL DEFAULT 'demo',
            sku        TEXT NOT NULL,
            channel    TEXT NOT NULL DEFAULT '*',
            price      REAL NOT NULL,
            quantity   REAL NOT NULL,
            recorded_at TEXT NOT NULL
        )");

        $pdo->exec("CREATE TABLE IF NOT EXISTS po_recommendations (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            tenant_id       TEXT NOT NULL DEFAULT 'demo',
            sku             TEXT NOT NULL,
            channel         TEXT NOT NULL DEFAULT '*',
            current_price   REAL,
            optimal_price   REAL,
            expected_margin REAL,
            expected_qty    REAL,
            inventory_level INTEGER DEFAULT 0,
            algo            TEXT DEFAULT 'elasticity',
            created_at      TEXT NOT NULL
        )");

        $pdo->exec("CREATE TABLE IF NOT EXISTS po_simulations (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            tenant_id    TEXT NOT NULL DEFAULT 'demo',
            sim_type     TEXT NOT NULL DEFAULT 'channel_mix',
            payload_json TEXT NOT NULL,
            result_json  TEXT NOT NULL,
            created_at   TEXT NOT NULL
        )");

        $pdo->exec("CREATE TABLE IF NOT EXISTS po_competitors (
            id INTEGER PRIMARY KEY AUTOINCREMENT, tenant_id TEXT NOT NULL DEFAULT 'demo',
            sku TEXT NOT NULL, name TEXT, ourPrice REAL, compA REAL, compB REAL,
            sosRank INTEGER DEFAULT 99, alert INTEGER DEFAULT 0, updated_at TEXT,
            UNIQUE(tenant_id, sku)
        )");

        $pdo->exec("CREATE TABLE IF NOT EXISTS po_repricer_rules (
            id INTEGER PRIMARY KEY AUTOINCREMENT, tenant_id TEXT NOT NULL DEFAULT 'demo',
            name TEXT NOT NULL, sku TEXT, channel TEXT DEFAULT '*', mode TEXT DEFAULT 'min_price',
            active INTEGER DEFAULT 1, lastRun TEXT, changeCount INTEGER DEFAULT 0, created_at TEXT
        )");
        // [R-P2-5] per-rule 전략 파라미터 — beat_by(언더컷/매칭 오프셋 %), min/max 가격 한계(사용자 가드),
        //   comp_max_age_hours(경쟁가 신선도 가드: stale 데이터로 리프라이싱 방지=실시간성 안전). graceful ADD.
        foreach (['beat_by REAL DEFAULT 1.0', 'min_price REAL DEFAULT 0', 'max_price REAL DEFAULT 0', 'comp_max_age_hours INTEGER DEFAULT 0'] as $col) {
            try { $pdo->exec("ALTER TABLE po_repricer_rules ADD COLUMN $col"); } catch (\Throwable $e) { /* 이미 존재 */ }
        }

        $pdo->exec("CREATE TABLE IF NOT EXISTS po_repricer_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT, tenant_id TEXT NOT NULL DEFAULT 'demo',
            sku TEXT, channel TEXT, prev REAL, next REAL, reason TEXT, time TEXT, created_at TEXT
        )");

        $pdo->exec("CREATE TABLE IF NOT EXISTS po_calendar (
            id INTEGER PRIMARY KEY AUTOINCREMENT, tenant_id TEXT NOT NULL DEFAULT 'demo',
            sku TEXT, name TEXT, channel TEXT DEFAULT 'all', startDate TEXT, endDate TEXT,
            promoPrice REAL, discountRate REAL, reason TEXT, status TEXT DEFAULT '초안', created_at TEXT
        )");

        // [현 차수] 채널별 배송조건 — 무료배송(판매자 흡수) 시 ship_cost 가 실효원가에 가산되어 최적가가
        //   마진을 보존하도록 상향. 소비자부담(buyer_paid)은 판매자 마진 무영향(burden=0). sku+channel 단위,
        //   미설정 채널은 '*' 기본값 폴백. 국내(무료배송 다수)·해외(소비자부담 다수, 가변) 실효원가 정확화.
        $pdo->exec("CREATE TABLE IF NOT EXISTS po_shipping (
            id INTEGER PRIMARY KEY AUTOINCREMENT, tenant_id TEXT NOT NULL DEFAULT 'demo',
            sku TEXT NOT NULL, channel TEXT NOT NULL DEFAULT '*',
            ship_mode TEXT NOT NULL DEFAULT 'buyer_paid', ship_cost REAL NOT NULL DEFAULT 0,
            updated_at TEXT, UNIQUE(tenant_id, sku, channel)
        )");

        self::$db = $pdo;
        return $pdo;
    }

    /** 테넌트 격리키 — 세션 토큰에서 도출(익명/데모→'demo'). public bypass 라우트에서도 동작. */
    private static function tenant(Request $request): string
    {
        $t = UserAuth::authedTenant($request);
        return ($t !== null && $t !== '') ? $t : 'demo';
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private static function json(Response $response, mixed $data, int $status = 200): Response
    {
        $response->getBody()->write(json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
        return $response->withStatus($status)->withHeader('Content-Type', 'application/json');
    }

    private static function body(Request $request): array
    {
        $parsed = $request->getParsedBody();
        if (is_array($parsed) && count($parsed)) return $parsed;
        $raw = (string)$request->getBody();
        if ($raw === '') return [];
        $decoded = json_decode($raw, true);
        return is_array($decoded) ? $decoded : [];
    }

    /**
     * Simple linear regression to estimate elasticity slope.
     * Returns ['slope' => float, 'intercept' => float, 'r2' => float]
     */
    private static function linReg(array $xs, array $ys): array
    {
        $n = count($xs);
        if ($n < 2) return ['slope' => 0, 'intercept' => ($ys[0] ?? 0), 'r2' => 0];
        $sx = array_sum($xs);
        $sy = array_sum($ys);
        $sxy = 0;
        $sxx = 0;
        for ($i = 0; $i < $n; $i++) { $sxy += $xs[$i] * $ys[$i]; $sxx += $xs[$i] ** 2; }
        $denom = ($n * $sxx - $sx ** 2);
        if (abs($denom) < 1e-10) return ['slope' => 0, 'intercept' => $sy / $n, 'r2' => 0];
        $slope = ($n * $sxy - $sx * $sy) / $denom;
        $intercept = ($sy - $slope * $sx) / $n;
        // R²
        $yMean = $sy / $n;
        $ssTot = 0; $ssRes = 0;
        for ($i = 0; $i < $n; $i++) {
            $ssTot += ($ys[$i] - $yMean) ** 2;
            $ssRes += ($ys[$i] - ($slope * $xs[$i] + $intercept)) ** 2;
        }
        $r2 = $ssTot < 1e-10 ? 1.0 : max(0, 1 - $ssRes / $ssTot);
        return ['slope' => $slope, 'intercept' => $intercept, 'r2' => round($r2, 4)];
    }

    /**
     * [239차+ ML] 수요탄력성 기반 이익최대 최적가 — optimize(수동) + repriceForTenant(자동 리프라이서) 공용(중복0).
     *   po_elasticity(price,quantity) log-log 회귀로 수요곡선 추정 → 후보가격 중 이익최대 선택(재고 상한 반영).
     *   관측 2점 미만 또는 가격 변동 없으면 null → 호출부가 규칙/cost-plus 폴백(데이터 부족 시 회귀0).
     * @return array|null ['price','qty','margin','algo','r2','points']
     */
    private static function elasticityOptimal(\PDO $db, string $t, string $sku, string $channel, float $cost, float $targetMargin, ?float $currentPx, int $inventory): ?array
    {
        $minPrice = $cost > 0 ? round($cost / (1 - max(0.01, min(0.95, $targetMargin))), 0) : (float)($currentPx ?? 0);
        if ($minPrice <= 0) return null;
        $es = $db->prepare("SELECT price, quantity FROM po_elasticity WHERE sku=? AND channel=? AND tenant_id=? ORDER BY price");
        $es->execute([$sku, $channel, $t]); $rows = $es->fetchAll(\PDO::FETCH_ASSOC);
        if (count($rows) < 2) { $es->execute([$sku, '*', $t]); $rows = $es->fetchAll(\PDO::FETCH_ASSOC); }
        if (count($rows) < 2) return null;
        $xs = array_map('floatval', array_column($rows, 'price'));
        $ys = array_map('floatval', array_column($rows, 'quantity'));
        if (count(array_unique($xs)) < 2) return null; // 가격 변동 없으면 탄력성 추정 불가
        $lxs = array_map('log', array_map(fn($v) => max($v, 1.0), $xs));
        $lys = array_map('log', array_map(fn($v) => max($v, 0.1), $ys));
        $reg = self::linReg($lxs, $lys);
        $step = max(100.0, $cost * 0.02);
        $hi = max($cost * 3, ($currentPx ?? $minPrice) * 1.5);
        $lo = max($minPrice, $cost * 1.05);
        $best = ['price' => $minPrice, 'profit' => -INF, 'qty' => 0.0];
        for ($p = $lo, $guard = 0; $p <= $hi && $guard < 5000; $p += $step, $guard++) {
            $q = exp($reg['intercept'] + $reg['slope'] * log(max($p, 1.0)));
            if ($inventory > 0) $q = min($q, $inventory * 0.8);
            $profit = ($p - $cost) * $q;
            if ($profit > $best['profit']) $best = ['price' => $p, 'profit' => $profit, 'qty' => $q];
        }
        $optPrice = round($best['price'], -2);
        return ['price' => $optPrice, 'qty' => round($best['qty'], 1), 'margin' => $optPrice > 0 ? round(($optPrice - $cost) / $optPrice, 4) : 0, 'algo' => 'log-log-regression', 'r2' => $reg['r2'], 'points' => count($rows)];
    }

    /**
     * [239차+ ML] 실주문(channel_orders, 메인DB)에서 (가격,수량) 관측을 주별 집계해 po_elasticity 자동 적재.
     *   ★"실데이터 투입 시 가동": 수동 ingest 없이 실 판매가 쌓이면 탄력성 추정 데이터가 자동 형성.
     *   멱등: (tenant,sku,channel,recorded_at=주키) 중복 시 갱신. 메인DB 미가용/무데이터 시 no-op(회귀0).
     * @return int 적재/갱신 관측 수
     */
    public static function harvestElasticityFromOrders(string $t, int $weeks = 12): int
    {
        if ($t === '' || $t === 'demo') return 0;
        try {
            $main = \Genie\Db::pdo();
            $since = gmdate('Y-m-d', time() - $weeks * 7 * 86400);
            // 주별·SKU·채널 평균단가/총수량(unit price=total_price/qty, KRW 정규화 적재). 컬럼=channel_orders.qty(스키마 정본 Db.php:385).
            // [259차 복구] 과거 존재하지 않는 `quantity` 컬럼 참조로 쿼리가 항상 예외→try/catch no-op(탄력성 자동수집 영구 사망)였음. qty 로 정정.
            // [259차] 취소/반품 관측 제외(형제 집계 roasRecon/realRevMap/productPerf 와 동일 취소제외 정책) — 탄력성 곡선 오염 방지.
            $sql = "SELECT sku, LOWER(channel) ch,
                           " . (\Genie\Db::pdo()->getAttribute(\PDO::ATTR_DRIVER_NAME) === 'mysql'
                                ? "DATE_FORMAT(ordered_at,'%x-W%v')" : "strftime('%Y-W%W', ordered_at)") . " AS wk,
                           SUM(total_price) rev, SUM(qty) qty
                      FROM channel_orders
                     WHERE tenant_id=? AND ordered_at>=? AND qty>0 AND total_price>0 AND sku IS NOT NULL AND sku<>''
                       AND COALESCE(event_type,'order') NOT IN('cancel','return')
                     GROUP BY sku, LOWER(channel), wk
                     HAVING qty>0";
            $st = $main->prepare($sql); $st->execute([$t, $since]);
            $obs = $st->fetchAll(\PDO::FETCH_ASSOC) ?: [];
        } catch (\Throwable $e) { return 0; } // 스키마 상이/미가용 → no-op
        if (!$obs) return 0;
        $db = self::db(); $n = 0;
        $sel = $db->prepare("SELECT id FROM po_elasticity WHERE tenant_id=? AND sku=? AND channel=? AND recorded_at=?");
        $upd = $db->prepare("UPDATE po_elasticity SET price=?, quantity=? WHERE id=?");
        $ins = $db->prepare("INSERT INTO po_elasticity (tenant_id,sku,channel,price,quantity,recorded_at) VALUES (?,?,?,?,?,?)");
        foreach ($obs as $o) {
            $qty = (float)$o['qty']; if ($qty <= 0) continue;
            $unit = round((float)$o['rev'] / $qty);
            $ch = (string)$o['ch']; $sku = (string)$o['sku']; $wk = 'wk:' . (string)$o['wk'];
            try {
                $sel->execute([$t, $sku, $ch, $wk]); $id = $sel->fetchColumn();
                if ($id) $upd->execute([$unit, $qty, $id]); else $ins->execute([$t, $sku, $ch, $unit, $qty, $wk]);
                $n++;
            } catch (\Throwable $e) { /* skip */ }
        }
        return $n;
    }

    private static function optimalPrice(float $a, float $b, float $cost, float $minPrice): float
    {
        if (abs($b) < 1e-10 || $b > 0) return $minPrice;
        $p = ($a + (-$b) * $cost) / (2 * (-$b));
        return max($minPrice, round($p, 0));
    }

    // ─── Endpoints ───────────────────────────────────────────────────────────

    /** POST /v420/price/products */
    public static function createProduct(Request $request, Response $response, array $args): Response
    {
        if ($err = UserAuth::requirePro($request, $response)) return $err; // [227차 감사 P0] 익명 쓰기 차단
        $db   = self::db();
        $t    = self::tenant($request);
        $body = self::body($request);
        $sku  = trim($body['sku'] ?? '');
        if (!$sku) return self::json($response, ['ok' => false, 'error' => 'sku required'], 400);

        // 206차 #6: SKU 중복 등록 차단(중복 시 조용히 덮어쓰던 INSERT OR REPLACE 방지).
        //   엑셀 일괄 업로드/수정은 _replace=true 로 덮어쓰기 허용. 200+duplicate 플래그로 반환
        //   (requestJsonAuth 는 non-2xx 에서 throw → 프론트 깔끔 처리 위해 200 유지).
        if (empty($body['_replace'])) {
            $ex = $db->prepare("SELECT id FROM po_products WHERE sku = ? AND tenant_id = ?");
            $ex->execute([$sku, $t]);
            if ($ex->fetchColumn() !== false) {
                return self::json($response, ['ok' => false, 'duplicate' => true, 'sku' => $sku, 'error' => '이미 등록된 SKU 입니다'], 200);
            }
        }

        $stmt = $db->prepare("INSERT OR REPLACE INTO po_products
            (tenant_id, sku, product_name, cost_price, target_margin, base_price, unit, created_at)
            VALUES (:t, :sku, :pn, :cp, :tm, :bp, :unit, :ts)");
        $stmt->execute([
            ':t'    => $t,
            ':sku'  => $sku,
            ':pn'   => $body['product_name']   ?? $sku,
            ':cp'   => (float)($body['cost_price']    ?? 0),
            ':tm'   => (float)($body['target_margin']  ?? 0.30),
            ':bp'   => isset($body['base_price']) ? (float)$body['base_price'] : null,
            ':unit' => $body['unit'] ?? 'KRW',
            ':ts'   => gmdate('c'),
        ]);
        return self::json($response, ['ok' => true, 'sku' => $sku]);
    }

    /** PUT /v420/price/products/{sku} */
    public static function updateProduct(Request $request, Response $response, array $args): Response
    {
        if ($err = UserAuth::requirePro($request, $response)) return $err; // [227차 감사 P0] 익명 쓰기 차단
        $db   = self::db();
        $t    = self::tenant($request);
        $body = self::body($request);
        $sku  = $args['sku'] ?? '';
        if (!$sku) return self::json($response, ['ok' => false, 'error' => 'sku required'], 400);
        $sets = []; $params = [':sku' => $sku, ':t' => $t];
        foreach (['product_name','cost_price','target_margin','base_price','unit'] as $f) {
            if (isset($body[$f])) { $sets[] = "$f = :$f"; $params[":$f"] = $body[$f]; }
        }
        if (!count($sets)) return self::json($response, ['ok' => false, 'error' => 'no fields'], 400);
        $db->prepare("UPDATE po_products SET " . implode(',', $sets) . " WHERE sku = :sku AND tenant_id = :t")->execute($params);
        return self::json($response, ['ok' => true, 'sku' => $sku]);
    }

    /** DELETE /v420/price/products/{sku} */
    public static function deleteProduct(Request $request, Response $response, array $args): Response
    {
        if ($err = UserAuth::requirePro($request, $response)) return $err; // [227차 감사 P0] 익명 쓰기 차단
        $db  = self::db();
        $t   = self::tenant($request);
        $sku = $args['sku'] ?? '';
        $db->prepare("DELETE FROM po_products WHERE sku = ? AND tenant_id = ?")->execute([$sku, $t]);
        return self::json($response, ['ok' => true, 'deleted' => $sku]);
    }

    /** GET /v420/price/products */
    public static function listProducts(Request $request, Response $response, array $args): Response
    {
        $t = self::tenant($request);
        $stmt = self::db()->prepare("SELECT * FROM po_products WHERE tenant_id = ? ORDER BY created_at DESC");
        $stmt->execute([$t]);
        return self::json($response, ['ok' => true, 'products' => $stmt->fetchAll(\PDO::FETCH_ASSOC)]);
    }

    /** POST /v420/price/elasticity */
    public static function addElasticity(Request $request, Response $response, array $args): Response
    {
        if ($err = UserAuth::requirePro($request, $response)) return $err; // [227차 감사 P0] 익명 쓰기 차단
        $db   = self::db();
        $t    = self::tenant($request);
        $body = self::body($request);
        $sku  = trim($body['sku'] ?? '');
        if (!$sku) return self::json($response, ['ok' => false, 'error' => 'sku required'], 400);
        $points = $body['points'] ?? [];
        if (!is_array($points) || !count($points)) {
            if (isset($body['price'], $body['quantity'])) {
                $points = [['price' => $body['price'], 'quantity' => $body['quantity']]];
            } else {
                return self::json($response, ['ok' => false, 'error' => 'points[] or price+quantity required'], 400);
            }
        }
        $ins = $db->prepare("INSERT INTO po_elasticity (tenant_id, sku, channel, price, quantity, recorded_at) VALUES (?,?,?,?,?,?)");
        $ch  = $body['channel'] ?? '*';
        $ts  = gmdate('c');
        $cnt = 0;
        foreach ($points as $pt) {
            $ins->execute([$t, $sku, $ch, (float)($pt['price'] ?? 0), (float)($pt['quantity'] ?? 0), $ts]);
            $cnt++;
        }
        return self::json($response, ['ok' => true, 'inserted' => $cnt]);
    }

    /** POST /v420/price/elasticity/bulk — CSV-style bulk import */
    public static function bulkElasticity(Request $request, Response $response, array $args): Response
    {
        if ($err = UserAuth::requirePro($request, $response)) return $err; // [227차 감사 P0] 익명 쓰기 차단
        $db   = self::db();
        $t    = self::tenant($request);
        $body = self::body($request);
        $rows = $body['rows'] ?? [];
        if (!is_array($rows)) return self::json($response, ['ok' => false, 'error' => 'rows[] required'], 400);
        $ins = $db->prepare("INSERT INTO po_elasticity (tenant_id, sku, channel, price, quantity, recorded_at) VALUES (?,?,?,?,?,?)");
        $ts = gmdate('c'); $cnt = 0;
        foreach ($rows as $r) {
            $ins->execute([$t, trim($r['sku'] ?? ''), $r['channel'] ?? '*', (float)($r['price'] ?? 0), (float)($r['quantity'] ?? 0), $ts]);
            $cnt++;
        }
        return self::json($response, ['ok' => true, 'inserted' => $cnt]);
    }

    /**
     * [현 차수] 채널별 배송관행 스마트 기본 모드 — 실세계 관행 기반(사용자가 채널별 override 가능).
     *   free=무료배송(판매자 흡수→실효원가 가산) / buyer_paid=소비자부담(판매자 마진 무영향).
     *   ★실 배송비(ship_cost)는 상품/무게별로 다르므로 하드코딩 안 함(사용자 입력) — 여기선 '모드'만 기본 추정.
     */
    private const SHIP_DEFAULT_MODE = [
        // 무료배송 관행(판매자 흡수): 국내 주요 채널 + Amazon(FBA/Prime)·Shopify(D2C 무료배송 경쟁)·Rakuten·TikTok Shop·Walmart
        'coupang'=>'free','naver'=>'free','naver_smartstore'=>'free','smartstore'=>'free','11st'=>'free','st11'=>'free',
        'gmarket'=>'free','auction'=>'free','lotteon'=>'free','ssg'=>'free','kakao'=>'free','cafe24'=>'free','godomall'=>'free',
        'amazon'=>'free','amazon_spapi'=>'free','shopify'=>'free','rakuten'=>'free','tiktok_shop'=>'free','walmart'=>'free',
        // 소비자부담 관행: eBay·Etsy·동남아(Shopee/Lazada/Qoo10)·Yahoo!JP (배송비 별도 청구가 일반적)
        'ebay'=>'buyer_paid','etsy'=>'buyer_paid','shopee'=>'buyer_paid','lazada'=>'buyer_paid',
        'qoo10'=>'buyer_paid','yahoo_japan'=>'buyer_paid','yahoo_jp'=>'buyer_paid',
    ];

    /** 채널 배송 기본 모드(미설정 채널은 buyer_paid=무부담, 가격 비의도적 상향 회피). */
    private static function shipDefaultMode(string $channel): string
    {
        $c = strtolower(trim($channel));
        return self::SHIP_DEFAULT_MODE[$c] ?? 'buyer_paid';
    }

    /**
     * 배송조건 해석 — body 에 ship_mode 오면 persist(채널 단위) 후 사용. 없으면 저장값(sku,channel)→(sku,'*')→
     *   채널 관행 기본 순 폴백. 반환 burden = 무료배송일 때만 ship_cost(판매자 흡수분), 아니면 0.
     */
    private static function resolveShipping(\PDO $db, string $t, string $sku, string $channel, array $body): array
    {
        $mode = isset($body['ship_mode']) ? (string)$body['ship_mode'] : null;
        $cost = isset($body['ship_cost']) ? (float)$body['ship_cost'] : null;
        if ($mode !== null && in_array($mode, ['free','buyer_paid'], true)) {
            // 명시 입력 → 저장(채널 단위 upsert).
            self::saveShippingRow($db, $t, $sku, $channel, $mode, $cost ?? 0);
            $rcost = $cost ?? 0; $isDefault = false;
        } else {
            // 저장값 (sku,channel) → (sku,'*') 폴백.
            $row = self::loadShippingRow($db, $t, $sku, $channel) ?: self::loadShippingRow($db, $t, $sku, '*');
            if ($row) { $mode = (string)$row['ship_mode']; $rcost = (float)$row['ship_cost']; $isDefault = false; }
            else { $mode = self::shipDefaultMode($channel); $rcost = 0.0; $isDefault = true; }
        }
        $burden = ($mode === 'free') ? max(0.0, $rcost) : 0.0;
        return ['mode'=>$mode, 'cost'=>$rcost, 'burden'=>$burden, 'is_default'=>$isDefault];
    }

    private static function loadShippingRow(\PDO $db, string $t, string $sku, string $channel): ?array
    {
        try {
            $st = $db->prepare("SELECT ship_mode, ship_cost FROM po_shipping WHERE tenant_id=? AND sku=? AND channel=? LIMIT 1");
            $st->execute([$t, $sku, $channel]);
            return $st->fetch(\PDO::FETCH_ASSOC) ?: null;
        } catch (\Throwable $e) { return null; }
    }

    private static function saveShippingRow(\PDO $db, string $t, string $sku, string $channel, string $mode, float $cost): void
    {
        try {
            $ex = $db->prepare("SELECT id FROM po_shipping WHERE tenant_id=? AND sku=? AND channel=? LIMIT 1");
            $ex->execute([$t, $sku, $channel]);
            $now = gmdate('c');
            if ($id = $ex->fetchColumn()) {
                $db->prepare("UPDATE po_shipping SET ship_mode=?, ship_cost=?, updated_at=? WHERE id=?")->execute([$mode, $cost, $now, $id]);
            } else {
                $db->prepare("INSERT INTO po_shipping (tenant_id,sku,channel,ship_mode,ship_cost,updated_at) VALUES (?,?,?,?,?,?)")->execute([$t, $sku, $channel, $mode, $cost, $now]);
            }
        } catch (\Throwable $e) { /* 멱등 best-effort */ }
    }

    /** GET /v420/price/shipping?sku=&channel= — 저장값 또는 채널 관행 기본 반환. */
    public static function getShipping(Request $request, Response $response, array $args): Response
    {
        $db = self::db(); $t = self::tenant($request);
        $q = $request->getQueryParams();
        $sku = trim((string)($q['sku'] ?? '')); $channel = (string)($q['channel'] ?? '*');
        if ($sku === '') return self::json($response, ['ok'=>false,'error'=>'sku required'], 400);
        $ship = self::resolveShipping($db, $t, $sku, $channel, []);
        return self::json($response, ['ok'=>true,'sku'=>$sku,'channel'=>$channel,'ship_mode'=>$ship['mode'],'ship_cost'=>$ship['cost'],'is_default'=>$ship['is_default'],'default_mode'=>self::shipDefaultMode($channel)]);
    }

    /** POST /v420/price/shipping — 채널별 배송조건 저장(무료배송/소비자부담 + 배송비). */
    public static function saveShipping(Request $request, Response $response, array $args): Response
    {
        if ($err = UserAuth::requirePro($request, $response)) return $err;
        $db = self::db(); $t = self::tenant($request); $body = self::body($request);
        $sku = trim((string)($body['sku'] ?? '')); $channel = (string)($body['channel'] ?? '*');
        $mode = (string)($body['ship_mode'] ?? 'buyer_paid');
        if ($sku === '') return self::json($response, ['ok'=>false,'error'=>'sku required'], 400);
        if (!in_array($mode, ['free','buyer_paid'], true)) return self::json($response, ['ok'=>false,'error'=>'invalid ship_mode'], 400);
        self::saveShippingRow($db, $t, $sku, $channel, $mode, (float)($body['ship_cost'] ?? 0));
        return self::json($response, ['ok'=>true,'sku'=>$sku,'channel'=>$channel,'ship_mode'=>$mode,'ship_cost'=>(float)($body['ship_cost'] ?? 0)]);
    }

    /** POST /v420/price/optimize */
    public static function optimize(Request $request, Response $response, array $args): Response
    {
        if ($err = UserAuth::requirePro($request, $response)) return $err; // [227차 감사 P0] 익명 쓰기 차단
        $db   = self::db();
        $t    = self::tenant($request);
        $body = self::body($request);
        $sku  = trim($body['sku'] ?? '');
        if (!$sku) return self::json($response, ['ok' => false, 'error' => 'sku required'], 400);
        $channel = $body['channel'] ?? '*';
        $inventory = (int)($body['inventory'] ?? 0);
        $currentPx = isset($body['current_price']) ? (float)$body['current_price'] : null;
        $ps = $db->prepare("SELECT * FROM po_products WHERE sku = ? AND tenant_id = ?");
        $ps->execute([$sku, $t]);
        $product = $ps->fetch(\PDO::FETCH_ASSOC);
        $cost = $product ? (float)$product['cost_price'] : 0;
        $targetMargin = $product ? (float)$product['target_margin'] : 0.30;
        // [현 차수] 채널 배송조건 반영 — 무료배송이면 배송비를 실효원가에 가산해 최적가가 마진을 보존하도록 상향.
        //   소비자부담이면 burden=0(판매자 마진 무영향). body 에 ship_mode 오면 persist, 없으면 저장값/'*' 폴백.
        $ship = self::resolveShipping($db, $t, $sku, $channel, $body);
        $effectiveCost = $cost + $ship['burden'];
        $minPrice = $effectiveCost > 0 ? round($effectiveCost / (1 - $targetMargin), 0) : (float)($body['min_price'] ?? 0);
        // [239차+ ML] 탄력성 최적가 = 공용 헬퍼(elasticityOptimal) 재사용(중복0). 데이터 부족 시 cost-plus 폴백.
        //   ★cost 인자에 effectiveCost 전달 → 이익최대 (p-effectiveCost)*q·마진 모두 배송반영.
        $opt = self::elasticityOptimal($db, $t, $sku, $channel, $effectiveCost, $targetMargin, $currentPx, $inventory);
        if ($opt) {
            $optPrice = $opt['price']; $optQty = $opt['qty']; $optMargin = $opt['margin']; $algo = $opt['algo']; $r2 = $opt['r2'];
        } else {
            $optPrice = $minPrice; $optQty = null; $optMargin = $targetMargin;
            $algo = 'cost-plus-fallback'; $r2 = null;
        }
        $clearancePrice = null;
        if ($inventory > 0 && $inventory < 30) $clearancePrice = round($optPrice * 1.08, -2);
        elseif ($inventory > 200) $clearancePrice = round(max($minPrice, $optPrice * 0.88), -2);
        $ins = $db->prepare("INSERT INTO po_recommendations (tenant_id,sku,channel,current_price,optimal_price,expected_margin,expected_qty,inventory_level,algo,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)");
        $ins->execute([$t, $sku, $channel, $currentPx, $optPrice, $optMargin, $optQty, $inventory, $algo, gmdate('c')]);
        return self::json($response, ['ok'=>true,'sku'=>$sku,'channel'=>$channel,'current_price'=>$currentPx,'optimal_price'=>$optPrice,'clearance_price'=>$clearancePrice,'expected_margin'=>$optMargin,'expected_qty'=>$optQty,'algo'=>$algo,'r2'=>$r2,'min_price'=>$minPrice,'inventory'=>$inventory,'cost_price'=>$cost,
            'ship_mode'=>$ship['mode'],'ship_cost'=>$ship['cost'],'shipping_burden'=>$ship['burden'],'effective_cost'=>$effectiveCost]);
    }

    /** [260차 심화] POST /v420/price/game-theory — 크로스마켓 경쟁 반응 게임이론 시뮬레이션.
     *  경쟁가(po_competitors) + 수요탄력성(po_elasticity)로 best-response 동학을 반복해 내시-근사 균형가 산출.
     *  순진한 이익최대가(경쟁 반응 무시)가 경쟁사 언더컷을 유발해 이익이 잠식되는 "함정"을 시뮬레이션·정량 비교. */
    public static function gameTheorySim(Request $request, Response $response, array $args): Response
    {
        if ($err = UserAuth::requirePro($request, $response)) return $err;
        $db = self::db(); $t = self::tenant($request); $body = self::body($request);
        $sku = trim((string)($body['sku'] ?? '')); if ($sku === '') return self::json($response, ['ok' => false, 'error' => 'sku required'], 400);
        $channel = (string)($body['channel'] ?? '*');

        $ps = $db->prepare("SELECT * FROM po_products WHERE sku=? AND tenant_id=?"); $ps->execute([$sku, $t]);
        $product = $ps->fetch(\PDO::FETCH_ASSOC);
        $cost = $product ? (float)$product['cost_price'] : (float)($body['cost'] ?? 0);
        $targetMargin = $product ? (float)$product['target_margin'] : 0.30;
        if ($cost <= 0) return self::json($response, ['ok' => false, 'error' => '원가(cost) 필요 — 상품 등록 또는 cost 전달'], 422);

        $cs = $db->prepare("SELECT ourPrice, compA, compB FROM po_competitors WHERE sku=? AND tenant_id=? LIMIT 1"); $cs->execute([$sku, $t]);
        $comp = $cs->fetch(\PDO::FETCH_ASSOC) ?: [];
        $ourP0 = (float)($comp['ourPrice'] ?? ($body['current_price'] ?? 0));
        $comps = []; foreach (['compA', 'compB'] as $k) { $v = (float)($comp[$k] ?? 0); if ($v > 0) $comps[] = $v; }
        if ($ourP0 <= 0) $ourP0 = $cost / (1 - max(0.01, min(0.95, $targetMargin)));
        if (!$comps) return self::json($response, ['ok' => false, 'error' => '경쟁가 데이터 없음 — 경쟁가 등록/수집 후 시뮬레이션'], 422);

        // 수요 회귀(log-log) — elasticityOptimal 과 동일 원천(po_elasticity). 데이터 부족 시 탄력성 -1.5 폴백.
        $es = $db->prepare("SELECT price, quantity FROM po_elasticity WHERE sku=? AND channel=? AND tenant_id=? ORDER BY price");
        $es->execute([$sku, $channel, $t]); $rows = $es->fetchAll(\PDO::FETCH_ASSOC);
        if (count($rows) < 2) { $es->execute([$sku, '*', $t]); $rows = $es->fetchAll(\PDO::FETCH_ASSOC); }
        $slope = -1.5; $intercept = null;
        if (count($rows) >= 2) {
            $xs = array_map('floatval', array_column($rows, 'price')); $ys = array_map('floatval', array_column($rows, 'quantity'));
            if (count(array_unique($xs)) >= 2) {
                $lxs = array_map('log', array_map(fn($v) => max($v, 1.0), $xs)); $lys = array_map('log', array_map(fn($v) => max($v, 0.1), $ys));
                $reg = self::linReg($lxs, $lys); $slope = $reg['slope']; $intercept = $reg['intercept'];
            }
        }
        $refPx = $ourP0 > 0 ? $ourP0 : $cost * 1.4;
        if ($intercept === null) $intercept = log(100.0) - $slope * log(max($refPx, 1.0)); // 폴백 스케일 q0(ref)=100
        $q0 = fn($p) => exp($intercept + $slope * log(max($p, 1.0)));
        $beta = 6.0; // 가격민감 점유(다항 로짓)
        $attract = fn($p) => exp(-$beta * $p / max($refPx, 1.0));
        $ourDemand = function ($p, $others) use ($q0, $attract) {
            $den = $attract($p); foreach ($others as $o) $den += $attract($o);
            $share = $den > 0 ? $attract($p) / $den : 1.0;
            return $q0($p) * $share * (1 + count($others));
        };
        $ourProfitAt = fn($p, $others) => ($p - $cost) * $ourDemand($p, $others);
        $ourBR = function ($others) use ($cost, $ourProfitAt, $refPx) {
            $lo = $cost * 1.02; $hi = max($refPx * 2.0, $cost * 4); $step = max(100.0, $cost * 0.02);
            $best = ['p' => $lo, 'profit' => -INF];
            for ($p = $lo, $g = 0; $p <= $hi && $g < 3000; $p += $step, $g++) { $pr = $ourProfitAt($p, $others); if ($pr > $best['profit']) $best = ['p' => round($p, -2), 'profit' => $pr]; }
            return $best['p'];
        };
        $compFloor = array_map(fn($c) => $c * 0.8, $comps); // 경쟁 원가 프록시(바닥)
        $compBR = function ($ourP, $cur, $floors) {
            $out = [];
            foreach ($cur as $i => $c) {
                $rivalMin = $ourP; foreach ($cur as $j => $cc) if ($j !== $i) $rivalMin = min($rivalMin, $cc);
                $out[$i] = max($floors[$i], round($rivalMin * 0.98, -2)); // 최저가 대비 방어적 언더컷
            }
            return $out;
        };
        // 균형 반복(best-response 동학 → 내시 근사)
        $ourP = $ourP0; $cp = $comps;
        $path = [['round' => 0, 'our' => round($ourP), 'comp' => array_map('round', $cp), 'profit' => round($ourProfitAt($ourP, $cp))]];
        for ($r = 1; $r <= 8; $r++) {
            $newOur = $ourBR($cp);
            $newCp = $compBR($newOur, $cp, $compFloor);
            $path[] = ['round' => $r, 'our' => round($newOur), 'comp' => array_map('round', $newCp), 'profit' => round($ourProfitAt($newOur, $newCp))];
            $conv = abs($newOur - $ourP) / max(1.0, $ourP) < 0.01;
            $ourP = $newOur; $cp = $newCp;
            if ($conv) break;
        }
        $eqPrice = round($ourP, -2); $eqProfit = round($ourProfitAt($eqPrice, $cp));
        $naivePrice = $ourBR($comps); // 경쟁 반응 무시 이익최대
        $naiveStatic = round($ourProfitAt($naivePrice, $comps));
        $naiveAfter = round($ourProfitAt($naivePrice, $compBR($naivePrice, $comps, $compFloor))); // 순진가로 갔을 때 반응 후 실제 이익
        try { $db->prepare("INSERT INTO po_simulations (tenant_id,sim_type,payload_json,result_json,created_at) VALUES (?,?,?,?,?)")
            ->execute([$t, 'game_theory', json_encode(['sku' => $sku, 'channel' => $channel], JSON_UNESCAPED_UNICODE), json_encode(['eq' => $eqPrice, 'naive' => $naivePrice], JSON_UNESCAPED_UNICODE), gmdate('c')]); } catch (\Throwable $e) {}

        return self::json($response, ['ok' => true, 'sku' => $sku, 'channel' => $channel, 'cost' => $cost,
            'our_current' => round($ourP0), 'competitors' => array_map('round', $comps),
            'equilibrium_price' => $eqPrice, 'equilibrium_profit' => $eqProfit,
            'naive_price' => $naivePrice, 'naive_profit_static' => $naiveStatic, 'naive_profit_after_reaction' => $naiveAfter,
            'reaction_trap_pct' => $naiveStatic > 0 ? round(($naiveStatic - $naiveAfter) / $naiveStatic * 100, 1) : 0,
            'recommendation' => ($eqProfit >= $naiveAfter ? $eqPrice : $naivePrice),
            'path' => $path, 'model' => 'best-response-nash-approx', 'elasticity_slope' => round($slope, 3)]);
    }

    /** POST /v420/price/optimize/batch */
    public static function optimizeBatch(Request $request, Response $response, array $args): Response
    {
        if ($err = UserAuth::requirePro($request, $response)) return $err; // [227차 감사 P0] 익명 쓰기 차단
        $db = self::db(); $t = self::tenant($request); $body = self::body($request);
        $skus = $body['skus'] ?? [];
        $results = [];
        foreach ($skus as $s) {
            $sku = is_string($s) ? $s : ($s['sku'] ?? '');
            if (!$sku) continue;
            // reuse optimize logic inline
            $ps = $db->prepare("SELECT * FROM po_products WHERE sku = ? AND tenant_id = ?");
            $ps->execute([$sku, $t]); $product = $ps->fetch(\PDO::FETCH_ASSOC);
            if (!$product) continue;
            $cost = (float)$product['cost_price']; $tm = (float)$product['target_margin'];
            // [현 차수] 배송반영 일관성(batch 도 단건 optimize 와 동일 실효원가). batch 는 통합('*') 기준.
            $cost = $cost + self::resolveShipping($db, $t, $sku, '*', [])['burden'];
            $minP = $cost > 0 ? round($cost / (1 - $tm), 0) : 0;
            $es = $db->prepare("SELECT price,quantity FROM po_elasticity WHERE sku=? AND channel='*' AND tenant_id=? ORDER BY price");
            $es->execute([$sku, $t]); $rows=$es->fetchAll(\PDO::FETCH_ASSOC);
            if (count($rows) >= 2) {
                $lxs=array_map('log',array_map(fn($v)=>max($v,1),array_column($rows,'price')));
                $lys=array_map('log',array_map(fn($v)=>max($v,0.1),array_column($rows,'quantity')));
                $reg=self::linReg($lxs,$lys);
                $bst=['price'=>$minP,'profit'=>-INF];
                foreach(range(max($minP,$cost*1.05),max($cost*3,$minP*1.5),max(100,$cost*0.02)) as $p){
                    $q=exp($reg['intercept']+$reg['slope']*log(max($p,1)));
                    $pr=($p-$cost)*$q; if($pr>$bst['profit'])$bst=['price'=>$p,'profit'=>$pr,'qty'=>$q];
                }
                $results[]=['sku'=>$sku,'optimal_price'=>round($bst['price'],-2),'margin'=>round(($bst['price']-$cost)/$bst['price'],4)];
            }
        }
        return self::json($response, ['ok'=>true,'results'=>$results]);
    }

    /** GET /v420/price/recommendations */
    public static function listRecommendations(Request $request, Response $response, array $args): Response
    {
        $t = self::tenant($request);
        $stmt = self::db()->prepare("SELECT r.*, p.product_name FROM po_recommendations r LEFT JOIN po_products p ON p.sku = r.sku AND p.tenant_id = r.tenant_id WHERE r.tenant_id = ? ORDER BY r.created_at DESC LIMIT 100");
        $stmt->execute([$t]);
        return self::json($response, ['ok' => true, 'recommendations' => $stmt->fetchAll(\PDO::FETCH_ASSOC)]);
    }

    /** POST /v420/price/simulate */
    public static function simulate(Request $request, Response $response, array $args): Response
    {
        if ($err = UserAuth::requirePro($request, $response)) return $err; // [227차 감사 P0] 익명 쓰기 차단
        $db = self::db(); $t = self::tenant($request); $body = self::body($request);
        $sku = trim($body['sku'] ?? ''); $prices = array_map('floatval', $body['prices'] ?? []);
        if (!$sku || !count($prices)) return self::json($response, ['ok'=>false,'error'=>'sku and prices[] required'], 400);
        $ps = $db->prepare("SELECT * FROM po_products WHERE sku = ? AND tenant_id = ?"); $ps->execute([$sku, $t]);
        $product = $ps->fetch(\PDO::FETCH_ASSOC); $cost = $product ? (float)$product['cost_price'] : 0;
        $ch = $body['channel'] ?? '*';
        $es = $db->prepare("SELECT price,quantity FROM po_elasticity WHERE sku=? AND channel=? AND tenant_id=?");
        $es->execute([$sku,$ch,$t]); $rows=$es->fetchAll(\PDO::FETCH_ASSOC);
        if (!count($rows)){$es->execute([$sku,'*',$t]);$rows=$es->fetchAll(\PDO::FETCH_ASSOC);}
        $scenarios = [];
        if (count($rows)>=2){
            $xs=array_map('log',array_map(fn($v)=>max($v,1),array_column($rows,'price')));
            $ys=array_map('log',array_map(fn($v)=>max($v,0.1),array_column($rows,'quantity')));
            $reg=self::linReg($xs,$ys);
            foreach($prices as $p){$q=exp($reg['intercept']+$reg['slope']*log(max($p,1)));$scenarios[]=['price'=>$p,'qty_est'=>round($q,1),'revenue'=>round($p*$q,0),'profit'=>round(($p-$cost)*$q,0),'margin'=>$p>0?round(($p-$cost)/$p,4):0];}
        } else {
            foreach($prices as $p){$scenarios[]=['price'=>$p,'qty_est'=>null,'revenue'=>null,'profit'=>null,'margin'=>$p>0?round(($p-$cost)/$p,4):0];}
        }
        $result = ['sku'=>$sku,'channel'=>$ch,'scenarios'=>$scenarios];
        $db->prepare("INSERT INTO po_simulations (tenant_id,sim_type,payload_json,result_json,created_at) VALUES (?,'scenario',?,?,?)")->execute([$t,json_encode($body),json_encode($result),gmdate('c')]);
        return self::json($response, $result);
    }

    /** GET /v420/price/summary */
    public static function summary(Request $request, Response $response, array $args): Response
    {
        $db = self::db(); $t = self::tenant($request);
        $cnt = function(string $sql) use ($db, $t) { $s = $db->prepare($sql); $s->execute([$t]); return $s->fetchColumn(); };
        $products = (int)$cnt("SELECT COUNT(*) FROM po_products WHERE tenant_id=?");
        $ePoints  = (int)$cnt("SELECT COUNT(*) FROM po_elasticity WHERE tenant_id=?");
        $recCount = (int)$cnt("SELECT COUNT(*) FROM po_recommendations WHERE tenant_id=?");
        $avgMargin = $cnt("SELECT AVG(expected_margin) FROM po_recommendations WHERE expected_margin IS NOT NULL AND tenant_id=?");
        $avgOpt    = $cnt("SELECT AVG(optimal_price) FROM po_recommendations WHERE tenant_id=?");
        $rs = $db->prepare("SELECT r.sku,r.channel,r.current_price,r.optimal_price,r.expected_margin,p.product_name FROM po_recommendations r LEFT JOIN po_products p ON p.sku=r.sku AND p.tenant_id=r.tenant_id WHERE r.tenant_id=? ORDER BY r.created_at DESC LIMIT 10");
        $rs->execute([$t]); $recent = $rs->fetchAll(\PDO::FETCH_ASSOC);
        $bc = $db->prepare("SELECT channel,COUNT(*) as cnt,AVG(optimal_price) as avg_optimal,AVG(expected_margin) as avg_margin FROM po_recommendations WHERE tenant_id=? GROUP BY channel");
        $bc->execute([$t]); $byChannel = $bc->fetchAll(\PDO::FETCH_ASSOC);
        return self::json($response, ['ok'=>true,'products'=>$products,'elasticity_pts'=>$ePoints,'recommendations'=>$recCount,'avg_margin'=>$avgMargin!==false&&$avgMargin!==null?round((float)$avgMargin,4):null,'avg_optimal_px'=>$avgOpt!==false&&$avgOpt!==null?round((float)$avgOpt,0):null,'recent'=>$recent,'by_channel'=>$byChannel]);
    }

    /** POST /v420/channel-mix/simulate */
    public static function channelMixSimulate(Request $request, Response $response, array $args): Response
    {
        if ($err = UserAuth::requirePro($request, $response)) return $err; // [227차 감사 P0] 익명 쓰기 차단
        $db = self::db(); $t = self::tenant($request); $body = self::body($request);
        $budget = (float)($body['total_budget'] ?? 1000000);
        $channels = $body['channels'] ?? [];
        $totalRoi = array_sum(array_column($channels, 'roi_per_won'));
        $alloc = []; $allocated = 0;
        foreach ($channels as $ch) {
            $pct = ($totalRoi > 0) ? max((float)($ch['min_pct']??0),min((float)($ch['max_pct']??1),($ch['roi_per_won']/$totalRoi))) : 0;
            $spend = round($budget*$pct,0);
            $alloc[] = ['channel'=>$ch['channel'],'roi_per_won'=>$ch['roi_per_won'],'allocation_pct'=>round($pct*100,1),'spend'=>$spend,'expected_return'=>round($spend*$ch['roi_per_won'],0),'expected_profit'=>round($spend*($ch['roi_per_won']-1),0)];
            $allocated += $spend;
        }
        $diff=$budget-$allocated;
        if($diff!=0&&count($alloc)){$alloc[0]['spend']+=$diff;$alloc[0]['expected_return']=round($alloc[0]['spend']*$alloc[0]['roi_per_won'],0);$alloc[0]['expected_profit']=round($alloc[0]['spend']*($alloc[0]['roi_per_won']-1),0);}
        $totalReturn=array_sum(array_column($alloc,'expected_return'));
        $totalProfit=array_sum(array_column($alloc,'expected_profit'));
        $result=['ok'=>true,'total_budget'=>$budget,'total_return'=>$totalReturn,'total_profit'=>$totalProfit,'blended_roi'=>$budget>0?round($totalReturn/$budget,4):0,'allocations'=>$alloc];
        $db->prepare("INSERT INTO po_simulations (tenant_id,sim_type,payload_json,result_json,created_at) VALUES (?,'channel_mix',?,?,?)")->execute([$t,json_encode($body),json_encode($result),gmdate('c')]);
        return self::json($response, $result);
    }

    /** GET /v420/channel-mix/results */
    public static function channelMixResults(Request $request, Response $response, array $args): Response
    {
        $t = self::tenant($request);
        $stmt = self::db()->prepare("SELECT id,result_json,created_at FROM po_simulations WHERE sim_type='channel_mix' AND tenant_id=? ORDER BY created_at DESC LIMIT 20");
        $stmt->execute([$t]);
        $rows = $stmt->fetchAll(\PDO::FETCH_ASSOC);
        $results = array_map(function($r){$d=json_decode($r['result_json'],true);$d['id']=$r['id'];$d['created_at']=$r['created_at'];return $d;},$rows);
        return self::json($response, ['ok'=>true,'results'=>$results]);
    }

    // ── 공개 헬퍼 (다른 핸들러 재사용) ───────────────────────────────────────
    //   ★PriceOpt 의 SKU 원가·경쟁사는 격리 sqlite(priceopt.sqlite)에 있어 메인 DB(Db::pdo) 조인이 불가하다.
    //   Rollup 순이익/매트릭스가 이 헬퍼로만 접근해 중복 저장 없이 재사용한다(기존 메인DB 조인 항상-null 버그 해소).

    /** sku→cost_price 맵. 미등록·오류 시 빈 배열(정직). */
    public static function costMap(string $tenant): array
    {
        $out = [];
        try {
            $st = self::db()->prepare("SELECT sku, cost_price FROM po_products WHERE tenant_id = ?");
            $st->execute([$tenant]);
            while ($r = $st->fetch(\PDO::FETCH_ASSOC)) { $out[(string)$r['sku']] = (float)($r['cost_price'] ?? 0); }
        } catch (\Throwable $e) { /* 미등록 */ }
        return $out;
    }

    /** sku→{our_price,comp_min,sos_rank,alert,gap_pct} 맵(공개데이터=가격·SoS만, 경쟁사 내부실적 아님). */
    public static function competitorMap(string $tenant): array
    {
        $out = [];
        try {
            $st = self::db()->prepare("SELECT sku, ourPrice, compA, compB, sosRank, alert FROM po_competitors WHERE tenant_id = ?");
            $st->execute([$tenant]);
            while ($r = $st->fetch(\PDO::FETCH_ASSOC)) {
                $sku = (string)$r['sku']; $a = (float)($r['compA'] ?? 0); $b = (float)($r['compB'] ?? 0);
                $mins = array_filter([$a, $b], fn($x) => $x > 0); $cmin = $mins ? min($mins) : 0; $our = (float)($r['ourPrice'] ?? 0);
                $out[$sku] = [
                    'our_price' => round($our), 'comp_min' => round($cmin),
                    'sos_rank' => $r['sosRank'] !== null ? (int)$r['sosRank'] : null,
                    'alert' => ((int)($r['alert'] ?? 0)) ? true : false,
                    'gap_pct' => ($cmin > 0 && $our > 0) ? round(($our - $cmin) / $cmin * 100, 1) : null,
                ];
            }
        } catch (\Throwable $e) { /* 미등록 */ }
        return $out;
    }

    // ── Competitor Monitoring ────────────────────────────────────────────────

    /** GET /v420/price/competitor */
    public static function listCompetitors(Request $request, Response $response, array $args): Response
    {
        $t = self::tenant($request);
        $stmt = self::db()->prepare("SELECT * FROM po_competitors WHERE tenant_id=? ORDER BY alert DESC, sku");
        $stmt->execute([$t]);
        return self::json($response, ['ok'=>true,'items'=>$stmt->fetchAll(\PDO::FETCH_ASSOC)]);
    }

    /** POST /v420/price/competitor */
    public static function upsertCompetitor(Request $request, Response $response, array $args): Response
    {
        if ($err = UserAuth::requirePro($request, $response)) return $err; // [227차 감사 P0] 익명 쓰기 차단
        $db = self::db(); $t = self::tenant($request); $body = self::body($request);
        $sku = trim($body['sku'] ?? '');
        if (!$sku) return self::json($response, ['ok'=>false,'error'=>'sku required'], 400);
        $alert = ((float)($body['compA']??0) < (float)($body['ourPrice']??0)) ? 1 : 0;
        $db->prepare("INSERT OR REPLACE INTO po_competitors (tenant_id,sku,name,ourPrice,compA,compB,sosRank,alert,updated_at) VALUES (?,?,?,?,?,?,?,?,?)")
            ->execute([$t,$sku,$body['name']??$sku,(float)($body['ourPrice']??0),(float)($body['compA']??0),(float)($body['compB']??0),(int)($body['sosRank']??99),$alert,gmdate('c')]);
        return self::json($response, ['ok'=>true,'sku'=>$sku]);
    }

    /** [240차 ⑧-B] POST /v420/price/competitor/harvest — 라이브 경쟁가 자동 수집(Naver 쇼핑 최저가 API).
     *   ★게이트(client_id/secret 필요)+graceful(없으면 pending). 수동 입력 대체 → po_competitors 자동 갱신
     *   (compA=최저·compB=차순·alert=우리가 더 비쌈). 실 자격증명 확보 후 즉시 라이브(리프라이서 elasticity 모드가 경쟁가 가드에 사용). */
    public static function harvestCompetitors(Request $request, Response $response, array $args): Response
    {
        if ($err = UserAuth::requirePro($request, $response)) return $err;
        $db = self::db(); $t = self::tenant($request);
        return self::json($response, self::harvestCompetitorsForTenant($db, $t));
    }

    /**
     * [차기 P1] 경쟁가 자동수집 코어(엔드포인트 + cron/리프라이서 공용 — 중복 0).
     *   Naver 쇼핑 최저가 API로 po_products 명칭 검색 → po_competitors 자동 갱신(compA=최저·compB=차순).
     *   ★게이트(client_id/secret)+graceful(없으면 pending). repriceForTenant 가 실행 전 호출 → 30분 cron 에
     *   편승해 "실시간 경쟁가 자동수집 스케줄" 성립(별도 cron 불요·중복 없음).
     */
    public static function harvestCompetitorsForTenant(\PDO $db, string $t): array
    {
        // [240차] 자격증명 우선순위: 연동허브(channel_credential naver_shopping) → env → app_setting(레거시).
        $cid = (string)(self::loadChannelCred($db, $t, 'naver_shopping', 'client_id')     ?: getenv('NAVER_SHOP_CLIENT_ID')     ?: self::appSetting($db, $t, 'naver_shop_client_id'));
        $sec = (string)(self::loadChannelCred($db, $t, 'naver_shopping', 'client_secret') ?: getenv('NAVER_SHOP_CLIENT_SECRET') ?: self::appSetting($db, $t, 'naver_shop_client_secret'));
        if ($cid === '' || $sec === '')
            return ['ok'=>true,'pending'=>true,'updated'=>0,'note'=>'Naver 쇼핑 API 자격증명(client_id/secret) 미설정 — 설정 후 라이브 경쟁가 자동 수집(현재는 수동 입력 사용)'];
        $ps = $db->prepare("SELECT sku, product_name, base_price FROM po_products WHERE tenant_id=? AND product_name<>'' LIMIT 50");
        $ps->execute([$t]);
        $updated = 0;
        foreach ($ps->fetchAll(\PDO::FETCH_ASSOC) as $p) {
            $q = trim((string)$p['product_name']); if ($q === '') continue;
            $ch = curl_init('https://openapi.naver.com/v1/search/shop.json?display=10&sort=asc&query=' . rawurlencode($q));
            curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER=>true, CURLOPT_TIMEOUT=>8, CURLOPT_SSL_VERIFYPEER=>true,
                CURLOPT_HTTPHEADER=>["X-Naver-Client-Id: {$cid}", "X-Naver-Client-Secret: {$sec}"]]);
            $raw = curl_exec($ch); $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE); curl_close($ch);
            if ($code !== 200 || !$raw) continue;
            $j = json_decode((string)$raw, true);
            $prices = [];
            foreach ((array)($j['items'] ?? []) as $it) { $lp = (float)($it['lprice'] ?? 0); if ($lp > 0) $prices[] = $lp; }
            if (!$prices) continue;
            sort($prices);
            $compA = $prices[0]; $compB = $prices[1] ?? $prices[0]; $our = (float)($p['base_price'] ?? 0);
            $alert = ($our > 0 && $compA < $our) ? 1 : 0;
            $db->prepare("INSERT OR REPLACE INTO po_competitors (tenant_id,sku,name,ourPrice,compA,compB,sosRank,alert,updated_at) VALUES (?,?,?,?,?,?,?,?,?)")
                ->execute([$t, (string)$p['sku'], $q, $our, $compA, $compB, 99, $alert, gmdate('c')]);
            $updated++;
        }
        return ['ok'=>true,'updated'=>$updated,'source'=>'naver_shopping','live'=>true];
    }

    /**
     * [차기 P1] 재고·판매속도 맵(메인DB) — 리프라이서 재고연동용. ★PriceOpt 는 priceopt.sqlite 격리이므로
     *   재고(wms_stock)·판매속도(channel_orders)는 메인DB(Db::pdo)에서 읽는다(243차 트랩 정합).
     *   velocity = 최근 $days 일 판매수량/일. days_cover = on_hand / max(velocity, ε)(소진예상일).
     *   @return array<string sku, array{on_hand:float, velocity:float, days_cover:?float}>
     */
    public static function stockVelocityMap(string $t, int $days = 30): array
    {
        $out = [];
        try {
            $main = \Genie\Db::pdo();
            // 재고: sku별 on_hand 합(전 창고).
            $s = $main->prepare("SELECT sku, SUM(on_hand) oh FROM wms_stock WHERE tenant_id=? AND sku<>'' GROUP BY sku");
            $s->execute([$t]);
            foreach ($s->fetchAll(\PDO::FETCH_ASSOC) ?: [] as $r) {
                $out[(string)$r['sku']] = ['on_hand'=>(float)$r['oh'], 'velocity'=>0.0, 'days_cover'=>null];
            }
            // 판매속도: 최근 days 일 판매수량(channel_orders, 취소 제외).
            $since = gmdate('Y-m-d', time() - $days * 86400);
            // [259차] 취소/반품 제외를 event_type SSOT 로 통일(과거 영문 status 4토큰만 → 국내채널 한국어 status '취소완료' 등 미제외로 velocity 과대·품절오판). 형제 harvestElasticity/deadStock 와 동일.
            $v = $main->prepare("SELECT sku, SUM(qty) q FROM channel_orders
                                 WHERE tenant_id=? AND sku<>'' AND COALESCE(ordered_at,synced_at)>=?
                                   AND COALESCE(event_type,'order') NOT IN ('cancel','return')
                                 GROUP BY sku");
            $v->execute([$t, $since]);
            foreach ($v->fetchAll(\PDO::FETCH_ASSOC) ?: [] as $r) {
                $sku = (string)$r['sku']; $vel = (float)$r['q'] / max(1, $days);
                if (!isset($out[$sku])) $out[$sku] = ['on_hand'=>0.0, 'velocity'=>0.0, 'days_cover'=>null];
                $out[$sku]['velocity'] = round($vel, 3);
                $out[$sku]['days_cover'] = $vel > 1e-6 ? round($out[$sku]['on_hand'] / $vel, 1) : null;
            }
        } catch (\Throwable $e) { /* 메인DB 미가용 — graceful(재고연동 없이 리프라이싱) */ }
        return $out;
    }

    /**
     * [차기 P1] 재고·판매속도 기반 가격 조정 계수(Feedvisor식 inventory-aware repricing).
     *   - 과잉재고+저속(days_cover 큼): 할인(재고 소진 가속). - 희소+고속(days_cover 작음): 프리미엄(마진/품절방지).
     *   임계: <14일=품절임박(상향), >90일=적체(하향). 임의 숫자 아님 — 소진예상일(실재고/실판매속도) 파생.
     *   @return array{factor:float, reason:string}  factor=가격배율(1=무변동).
     */
    public static function velocityFactor(?array $sv): array
    {
        if (!$sv || $sv['days_cover'] === null || $sv['velocity'] <= 0) return ['factor'=>1.0, 'reason'=>''];
        $dc = (float)$sv['days_cover'];
        if ($dc < 14)  return ['factor'=>1.05, 'reason'=>"품절임박(소진 {$dc}일) +5% 프리미엄"];
        if ($dc < 30)  return ['factor'=>1.02, 'reason'=>"고회전(소진 {$dc}일) +2%"];
        if ($dc > 120) return ['factor'=>0.92, 'reason'=>"장기적체(소진 {$dc}일) -8% 소진"];
        if ($dc > 90)  return ['factor'=>0.95, 'reason'=>"적체(소진 {$dc}일) -5% 소진"];
        return ['factor'=>1.0, 'reason'=>''];
    }

    private static function appSetting(\PDO $db, string $t, string $k): string
    {
        try { $st = $db->prepare("SELECT v FROM app_setting WHERE tenant_id=? AND k=? LIMIT 1"); $st->execute([$t, $k]); $v = $st->fetchColumn(); return $v ? (string)$v : ''; }
        catch (\Throwable $e) { return ''; }
    }

    /** [240차] 연동허브 자격증명 읽기 — channel_credential(channel/key_name/key_value, AES-256-GCM 복호화). Connectors::loadCred 패턴 정합. */
    private static function loadChannelCred(\PDO $db, string $t, string $channel, string $key): string
    {
        try {
            $st = $db->prepare("SELECT key_value FROM channel_credential WHERE tenant_id=? AND channel=? AND key_name=? AND is_active=1 LIMIT 1");
            $st->execute([$t, $channel, $key]);
            $row = $st->fetch(\PDO::FETCH_ASSOC);
            return \Genie\Crypto::decrypt((string)($row['key_value'] ?? ''));
        } catch (\Throwable $e) { return ''; }
    }

    // ── Dynamic Repricer ─────────────────────────────────────────────────────

    /** GET /v420/price/repricer/rules */
    public static function listRepricerRules(Request $request, Response $response, array $args): Response
    {
        $db = self::db(); $t = self::tenant($request);
        $rs = $db->prepare("SELECT * FROM po_repricer_rules WHERE tenant_id=? ORDER BY created_at DESC");
        $rs->execute([$t]); $rules = $rs->fetchAll(\PDO::FETCH_ASSOC);
        $ai = $db->prepare("SELECT CASE WHEN COUNT(*)>0 THEN AVG((next-prev)/NULLIF(prev,0)) ELSE NULL END FROM po_repricer_history WHERE prev>0 AND tenant_id=?");
        $ai->execute([$t]); $avgImprove = $ai->fetchColumn();
        return self::json($response, ['ok'=>true,'rules'=>$rules,'avg_margin_improve'=>$avgImprove!==false&&$avgImprove!==null?round((float)$avgImprove,4):null]);
    }

    /** POST /v420/price/repricer/rules */
    public static function createRepricerRule(Request $request, Response $response, array $args): Response
    {
        if ($err = UserAuth::requirePro($request, $response)) return $err; // [227차 감사 P0] 익명 쓰기 차단
        $db = self::db(); $t = self::tenant($request); $body = self::body($request);
        $name = trim($body['name'] ?? '');
        if (!$name) return self::json($response, ['ok'=>false,'error'=>'name required'], 400);
        // [R-P2-5] 전략 파라미터 — beat_by(0~50%로 클램프), min/max 가격(0=미설정), 경쟁가 최대허용나이(시간).
        $beatBy = max(0.0, min(50.0, (float)($body['beat_by'] ?? 1.0)));
        $minP   = max(0.0, (float)($body['min_price'] ?? 0));
        $maxP   = max(0.0, (float)($body['max_price'] ?? 0));
        $compAge = max(0, (int)($body['comp_max_age_hours'] ?? 0));
        $db->prepare("INSERT INTO po_repricer_rules (tenant_id,name,sku,channel,mode,beat_by,min_price,max_price,comp_max_age_hours,active,created_at) VALUES (?,?,?,?,?,?,?,?,?,1,?)")
            ->execute([$t,$name,$body['sku']??'*',$body['channel']??'*',$body['mode']??'min_price',$beatBy,$minP,$maxP,$compAge,gmdate('c')]);
        return self::json($response, ['ok'=>true,'id'=>$db->lastInsertId()]);
    }

    /** GET /v420/price/repricer/history */
    public static function repricerHistory(Request $request, Response $response, array $args): Response
    {
        $t = self::tenant($request);
        $stmt = self::db()->prepare("SELECT * FROM po_repricer_history WHERE tenant_id=? ORDER BY created_at DESC LIMIT 50");
        $stmt->execute([$t]);
        return self::json($response, ['ok'=>true,'history'=>$stmt->fetchAll(\PDO::FETCH_ASSOC)]);
    }

    /**
     * [차기 P1-(b)] GET /v420/price/repricer/buybox — Buybox 승률 현황.
     *   po_competitors 의 ourPrice vs 경쟁사 최저가 비교로 SKU별 승/패 + 전체 승률을 산출(Feedvisor Buy Box 대응).
     *   win = ourPrice <= 경쟁사 최저가. gap = (ourPrice − 최저가)/최저가. 재고/판매속도 동반표기. 실데이터 파생(날조 0).
     */
    public static function buyboxStatus(Request $request, Response $response, array $args): Response
    {
        $db = self::db(); $t = self::tenant($request);
        $svMap = self::stockVelocityMap($t);
        $rs = $db->prepare("SELECT sku, name, ourPrice, compA, compB, updated_at FROM po_competitors WHERE tenant_id=?");
        $rs->execute([$t]);
        $items = []; $won = 0; $total = 0;
        foreach ($rs->fetchAll(\PDO::FETCH_ASSOC) as $c) {
            $our = (float)($c['ourPrice'] ?? 0);
            $comps = array_filter([(float)($c['compA'] ?? 0), (float)($c['compB'] ?? 0)], fn($x) => $x > 0);
            if ($our <= 0 || !$comps) continue;
            $low = min($comps); $win = $our <= $low; $total++; if ($win) $won++;
            $sv = $svMap[(string)$c['sku']] ?? null;
            $items[] = [
                'sku' => (string)$c['sku'], 'name' => (string)($c['name'] ?? $c['sku']),
                'our_price' => round($our), 'comp_low' => round($low),
                'win' => $win, 'gap_pct' => round(($our - $low) / $low * 100, 1),
                'on_hand' => $sv ? (float)$sv['on_hand'] : null,
                'days_cover' => $sv['days_cover'] ?? null,
                'updated_at' => (string)($c['updated_at'] ?? ''),
            ];
        }
        usort($items, fn($a, $b) => ($a['win'] <=> $b['win']) ?: ($b['gap_pct'] <=> $a['gap_pct'])); // 패배·고갭 우선
        return self::json($response, [
            'ok' => true, 'win_rate' => $total > 0 ? round($won / $total * 100, 1) : null,
            'won' => $won, 'total' => $total, 'items' => $items,
            'note' => $total === 0 ? '경쟁가 데이터가 없습니다. [경쟁사 가격] 등록 또는 자동수집(자격증명) 후 표시됩니다.' : null,
        ]);
    }

    /** POST /v420/price/repricer/rules/{id}/toggle */
    public static function toggleRepricerRule(Request $request, Response $response, array $args): Response
    {
        if ($err = UserAuth::requirePro($request, $response)) return $err; // [227차 감사 P0] 익명 쓰기 차단
        $db = self::db(); $t = self::tenant($request); $id = (int)($args['id'] ?? 0);
        $db->prepare("UPDATE po_repricer_rules SET active = CASE WHEN active=1 THEN 0 ELSE 1 END WHERE id=? AND tenant_id=?")->execute([$id, $t]);
        return self::json($response, ['ok'=>true,'toggled'=>$id]);
    }

    /**
     * [237차] POST /v420/price/repricer/run — 다이내믹 리프라이서 ★실행 엔진(기존엔 규칙·경쟁가만 저장하고
     *   실제 리프라이싱이 없던 갭=po_repricer_history INSERT 전무). 활성 규칙별로 경쟁사 가격(po_competitors)
     *   대비 새 가격을 산출(언더컷/매칭/마진)하고 원가·목표마진 가드 적용 → 이력 기록 + 가격 갱신. 채널 전파는
     *   기존 writeback(일괄가격) 경로. ★중복 없음: 규칙/경쟁가/상품/마진 기존 자산을 묶는 실행 로직만 신설.
     */
    public static function runRepricer(Request $request, Response $response, array $args): Response
    {
        if ($err = UserAuth::requirePro($request, $response)) return $err;
        return self::json($response, self::repriceForTenant(self::tenant($request)));
    }

    /** [237차] 활성 리프라이서 규칙 보유 테넌트 목록 — cron 팬아웃용(현재 backend 의 priceopt.sqlite 기준). */
    public static function tenantsWithActiveRepricerRules(): array
    {
        try {
            $rs = self::db()->query("SELECT DISTINCT tenant_id FROM po_repricer_rules WHERE active=1 AND tenant_id IS NOT NULL AND tenant_id<>''");
            return array_values(array_filter(array_map(fn($r) => (string)$r, $rs->fetchAll(\PDO::FETCH_COLUMN))));
        } catch (\Throwable $e) { return []; }
    }

    /** [255차 심화] 경쟁가 수집 cron 팬아웃 — 상품 보유 전 테넌트(리프라이서 규칙 무관·독립 수집, Prisync/Feedvisor 정합). */
    public static function tenantsWithPriceProducts(): array
    {
        try {
            $rs = self::db()->query("SELECT DISTINCT tenant_id FROM po_products WHERE tenant_id IS NOT NULL AND tenant_id<>''");
            return array_values(array_filter(array_map(fn($r) => (string)$r, $rs->fetchAll(\PDO::FETCH_COLUMN))));
        } catch (\Throwable $e) { return []; }
    }

    /** [255차 심화] 경쟁가 수집 CLI 래퍼(competitor_price_cron 전용) — priceopt.sqlite(self::db) 주입. 자격 미등록=graceful no-op. */
    public static function harvestCompetitorsCli(string $t): array
    {
        try { return self::harvestCompetitorsForTenant(self::db(), $t); }
        catch (\Throwable $e) { return ['ok'=>false, 'error'=>$e->getMessage()]; }
    }

    /** [237차] 리프라이서 실행 코어(HTTP 핸들러 runRepricer + cron repricer_cron.php 공용). @return array 요약 */
    public static function repriceForTenant(string $t): array
    {
        $db = self::db(); $now = gmdate('c');
        $rs = $db->prepare("SELECT * FROM po_repricer_rules WHERE tenant_id=? AND active=1");
        $rs->execute([$t]);
        $rules = $rs->fetchAll(\PDO::FETCH_ASSOC);
        // [239차+ ML] 실주문에서 (가격,수량) 관측 자동 적재 → elasticity 모드가 실데이터로 가동(데이터 없으면 no-op).
        $harvested = 0; try { $harvested = self::harvestElasticityFromOrders($t); } catch (\Throwable $e) {}
        // [차기 P1-(a)] 경쟁가 자동수집 — 리프라이싱 전 라이브 경쟁가 갱신(자격증명 있으면). 30분 cron 편승=실시간 스케줄.
        $harvestComp = 0; try { $hc = self::harvestCompetitorsForTenant($db, $t); $harvestComp = (int)($hc['updated'] ?? 0); } catch (\Throwable $e) {}
        // [차기 P1-(c)] 재고·판매속도 맵(메인DB) — inventory-aware 리프라이싱.
        $svMap = self::stockVelocityMap($t);
        $changes = []; $evaluated = 0; $enqueued = 0;
        $hist = $db->prepare("INSERT INTO po_repricer_history (tenant_id,sku,channel,prev,next,reason,time,created_at) VALUES (?,?,?,?,?,?,?,?)");
        $updComp = $db->prepare("UPDATE po_competitors SET ourPrice=?, updated_at=? WHERE tenant_id=? AND sku=?");
        $updProd = $db->prepare("UPDATE po_products SET base_price=? WHERE tenant_id=? AND sku=?");
        foreach ($rules as $rule) {
            $mode = (string)($rule['mode'] ?? 'min_price');
            $ruleSku = trim((string)($rule['sku'] ?? '*'));
            $channel = (string)($rule['channel'] ?? '*');
            // [R-P2-5] per-rule 전략 파라미터.
            $beatBy = max(0.0, min(50.0, (float)($rule['beat_by'] ?? 1.0))) / 100.0; // 언더컷/매칭 오프셋 비율
            $ruleMin = max(0.0, (float)($rule['min_price'] ?? 0));   // 사용자 절대 하한(0=미설정)
            $ruleMax = max(0.0, (float)($rule['max_price'] ?? 0));   // 사용자 절대 상한(0=미설정)
            $compMaxAge = max(0, (int)($rule['comp_max_age_hours'] ?? 0)); // 경쟁가 최대허용나이(시간, 0=무제한)
            $compCutoff = $compMaxAge > 0 ? (time() - $compMaxAge * 3600) : 0;
            // 대상 SKU: 특정 sku 또는 '*'(전체 경쟁사 등록 SKU)
            if ($ruleSku !== '' && $ruleSku !== '*') {
                $cs = $db->prepare("SELECT * FROM po_competitors WHERE tenant_id=? AND sku=?"); $cs->execute([$t, $ruleSku]);
            } else {
                $cs = $db->prepare("SELECT * FROM po_competitors WHERE tenant_id=?"); $cs->execute([$t]);
            }
            $changed = 0;
            foreach ($cs->fetchAll(\PDO::FETCH_ASSOC) as $c) {
                $evaluated++;
                $sku = (string)$c['sku'];
                $cur = (float)($c['ourPrice'] ?? 0);
                if ($cur <= 0) continue;
                // [R-P2-5] 경쟁가 신선도 가드 — stale 데이터로 리프라이싱 방지(실시간성 안전).
                if ($compCutoff > 0) {
                    $cu = strtotime((string)($c['updated_at'] ?? '')) ?: 0;
                    if ($cu > 0 && $cu < $compCutoff) continue; // 경쟁가가 허용나이보다 오래됨 → 스킵
                }
                $comps = array_filter([(float)($c['compA'] ?? 0), (float)($c['compB'] ?? 0)], fn($x) => $x > 0);
                // [차기 P1-(c)] 실재고·판매속도(메인DB) — elasticity 수량상한·velocity 조정에 사용.
                $sv = $svMap[$sku] ?? null;
                $inv = $sv ? (int)round((float)$sv['on_hand']) : 0;
                // 원가·목표마진 가드(절대 하한). 상품 미등록 시 현가의 70%를 안전하한.
                $ps = $db->prepare("SELECT cost_price, target_margin FROM po_products WHERE tenant_id=? AND sku=? LIMIT 1");
                $ps->execute([$t, $sku]); $prod = $ps->fetch(\PDO::FETCH_ASSOC);
                $cost = $prod ? (float)$prod['cost_price'] : 0.0;
                $tMargin = $prod ? (float)$prod['target_margin'] : 0.30;
                // [현 차수] 배송반영 일관성 — optimize 와 동일하게 무료배송 채널은 배송비를 실효원가에 가산.
                //   리프라이서(floor·margin·elasticity)와 optimize 가 같은 실효원가를 써야 메뉴 간 추천가가 발산하지 않음.
                $cost = $cost + self::resolveShipping($db, $t, $sku, $channel, [])['burden'];
                $floor = $cost > 0 ? round($cost * (1 + $tMargin * 0.5)) : round($cur * 0.7); // 실효원가+절반목표마진, 또는 현가70%
                $new = $cur;
                $reason = '';
                $beatPct = round($beatBy * 100, 1);
                if ($mode === 'match' && $comps) {
                    $new = max($floor, round(min($comps))); $reason = '경쟁사 최저가 매칭';
                } elseif ($mode === 'buybox' && $comps) {
                    // [차기 P1-(b)] Buybox 승률 전략 — 최저가보다 beat_by 만큼 낮춰 바이박스 점유. floor 가 최저가 위면
                    //   floor 로 클램프(승리 불가 = 마진 보호 우선). 승리 가능 시 최저-beat_by% 로 점유.
                    $low = round(min($comps));
                    $target = round($low * (1 - $beatBy));
                    $new = max($floor, $target);
                    $reason = ($new <= $low) ? "Buybox 점유(최저가 -{$beatPct}%)" : "Buybox 마진가드(최저가 하회 불가 → 원가마진 하한)";
                } elseif ($mode === 'margin') {
                    $target = $cost > 0 ? round($cost * (1 + $tMargin)) : $cur;
                    $new = max($cur < $target ? $target : $cur, $floor); $reason = '목표마진 확보';
                } elseif ($mode === 'elasticity' || $mode === 'ml') {
                    // [239차+ ML] 수요탄력성 이익최대(공용 헬퍼 재사용). 데이터 부족 시 경쟁사 언더컷 폴백(회귀0).
                    //   [차기 P1-(c)] 실재고($inv) 전달 → 재고 소진 가능 수량으로 최적화 상한(과대추정 방지).
                    $opt = self::elasticityOptimal($db, $t, $sku, $channel, $cost, $tMargin, $cur, $inv);
                    if ($opt && $opt['price'] > 0) {
                        $new = max($floor, (float)$opt['price']);
                        // 경쟁반응 가드: 경쟁가 존재 시 최저가 +5% 상한(과도 프리미엄 방지·경쟁력 유지)
                        if ($comps) $new = min($new, max($floor, round(min($comps) * 1.05)));
                        $reason = 'ML 수요탄력성 이익최대(R²=' . ($opt['r2'] ?? 0) . ')';
                    } elseif ($comps) {
                        $new = max($floor, round(min($comps) * (1 - $beatBy))); $reason = "ML 데이터 부족 → 경쟁사 -{$beatPct}% 폴백";
                    }
                } else { // min_price(언더컷, 기본) — [R-P2-5] beat_by 설정만큼 언더컷.
                    if ($comps) { $new = max($floor, round(min($comps) * (1 - $beatBy))); $reason = "경쟁사 최저가 -{$beatPct}% 언더컷"; }
                }
                // [차기 P1-(c)] 재고/판매속도 조정 — 소진예상일 기반 가격 nudge(품절임박 상향·적체 하향). buybox/match 는 경쟁가 점유가
                //   목적이라 velocity 미적용(가격왜곡 방지). elasticity/margin/min_price 에만 적용.
                if (!in_array($mode, ['buybox', 'match'], true)) {
                    $vf = self::velocityFactor($sv);
                    if ($vf['factor'] != 1.0) { $new = max($floor, round($new * $vf['factor'])); $reason .= ' · ' . $vf['reason']; }
                }
                // 가드: 하한 미만 금지·과도변동(±50%) 방지·의미있는 변화(>0.5%)만 적용.
                if ($new < $floor) { $new = $floor; $reason .= '(원가마진 하한 적용)'; }
                // [R-P2-5] 사용자 절대 min/max 가격 한계(원가마진 하한 위에 추가 가드).
                if ($ruleMin > 0 && $new < $ruleMin) { $new = $ruleMin; $reason .= '(최소가 하한)'; }
                if ($ruleMax > 0 && $new > $ruleMax) { $new = $ruleMax; $reason .= '(최대가 상한)'; }
                if ($new > $cur * 1.5 || $new < $cur * 0.5) continue; // 비정상 변동 스킵
                if (abs($new - $cur) / $cur < 0.005) continue;        // 변화 미미 → 스킵
                try {
                    $hist->execute([$t, $sku, $channel, $cur, $new, $reason, $now, $now]);
                    $updComp->execute([$new, $now, $t, $sku]);
                    if ($prod) $updProd->execute([$new, $t, $sku]);
                    $changes[] = ['sku' => $sku, 'channel' => $channel, 'prev' => $cur, 'next' => $new, 'reason' => $reason];
                    $changed++;
                    // [239차] human-in-loop 채널 반영: 내부가격 갱신 후 writeback 큐에 'pending_approval' 로 적재.
                    //   사용자 승인(POST /catalog/writeback/approve) 시에만 실 채널 push → 실 마켓 가격 자동변경 방지.
                    Catalog::enqueueRepricePending($t, $channel, $sku, (float)$new, (float)$cur);
                    $enqueued++;
                } catch (\Throwable $e) { /* 개별 실패 스킵 */ }
            }
            try { $db->prepare("UPDATE po_repricer_rules SET lastRun=?, changeCount=COALESCE(changeCount,0)+? WHERE id=? AND tenant_id=?")
                ->execute([$now, $changed, (int)$rule['id'], $t]); } catch (\Throwable $e) {}
        }
        return [
            'ok' => true, 'rules_run' => count($rules), 'skus_evaluated' => $evaluated,
            'changes_applied' => count($changes), 'changes' => array_slice($changes, 0, 100),
            'pending_approval' => $enqueued, 'elasticity_observations' => $harvested,
            'competitor_prices_harvested' => $harvestComp,
            'note' => count($changes) > 0
                ? count($changes) . '건 리프라이싱 적용(이력 기록·내부가격 갱신). 실 채널 반영은 사람 검토 보호를 위해 ' . $enqueued . '건이 승인 대기 중입니다 — [채널 반영 승인]을 눌러 push 하세요.'
                : ($evaluated === 0 ? '활성 규칙 또는 경쟁사 가격 데이터가 없습니다. [경쟁사 가격] 등록 후 실행하세요.' : '가드(원가마진·변동상한) 내 변경 대상이 없습니다.'),
        ];
    }

    // ── Promo Calendar ───────────────────────────────────────────────────────

    /** GET /v420/price/calendar */
    public static function listCalendar(Request $request, Response $response, array $args): Response
    {
        $t = self::tenant($request);
        $stmt = self::db()->prepare("SELECT * FROM po_calendar WHERE tenant_id=? ORDER BY startDate DESC");
        $stmt->execute([$t]);
        return self::json($response, ['ok'=>true,'events'=>$stmt->fetchAll(\PDO::FETCH_ASSOC)]);
    }

    /**
     * [255차 심화] 프로모 윈도우 — [today, today+horizon] 구간과 겹치는 프로모를 sku 별 반환(수요예측 promo uplift 입력).
     *   DemandForecast::autoReplenishForTenant 가 호출(크로스핸들러·priceopt.sqlite). @return array sku=>['discount'=>0~1,'name'=>,'end'=>]
     */
    public static function promoWindows(string $tenant, int $horizonDays = 14): array
    {
        $out = [];
        try {
            $today = gmdate('Y-m-d'); $end = gmdate('Y-m-d', time() + max(1, $horizonDays) * 86400);
            $st = self::db()->prepare("SELECT sku, name, startDate, endDate, discountRate FROM po_calendar
                WHERE tenant_id=? AND status<>'cancelled' AND startDate <= ? AND endDate >= ?");
            $st->execute([$tenant, $end, $today]);
            foreach ($st->fetchAll(\PDO::FETCH_ASSOC) as $r) {
                $sku = (string)($r['sku'] ?? ''); if ($sku === '') continue;
                $disc = (float)($r['discountRate'] ?? 0); if ($disc > 1) $disc /= 100.0; // 0~1 정규화(퍼센트 허용)
                $disc = max(0.0, min(0.9, $disc));
                if (!isset($out[$sku]) || $disc > $out[$sku]['discount']) $out[$sku] = ['discount'=>$disc, 'name'=>(string)($r['name'] ?? ''), 'end'=>(string)($r['endDate'] ?? '')];
            }
        } catch (\Throwable $e) {}
        return $out;
    }

    /** POST /v420/price/calendar */
    public static function createCalendarEvent(Request $request, Response $response, array $args): Response
    {
        if ($err = UserAuth::requirePro($request, $response)) return $err; // [227차 감사 P0] 익명 쓰기 차단
        $db = self::db(); $t = self::tenant($request); $body = self::body($request);
        $db->prepare("INSERT INTO po_calendar (tenant_id,sku,name,channel,startDate,endDate,promoPrice,discountRate,reason,status,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)")
            ->execute([$t,$body['sku']??'',$body['name']??'',$body['channel']??'all',$body['startDate']??'',$body['endDate']??'',(float)($body['promoPrice']??0),(float)($body['discountRate']??0),$body['reason']??'','초안',gmdate('c')]);
        return self::json($response, ['ok'=>true,'id'=>$db->lastInsertId()]);
    }

    /** DELETE /v420/price/calendar/{id} */
    public static function deleteCalendarEvent(Request $request, Response $response, array $args): Response
    {
        if ($err = UserAuth::requirePro($request, $response)) return $err; // [227차 감사 P0] 익명 쓰기 차단
        $db = self::db(); $t = self::tenant($request);
        $db->prepare("DELETE FROM po_calendar WHERE id=? AND tenant_id=?")->execute([(int)($args['id']??0), $t]);
        return self::json($response, ['ok'=>true]);
    }
}
