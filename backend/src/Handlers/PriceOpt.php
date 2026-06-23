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

        $pdo->exec("CREATE TABLE IF NOT EXISTS po_repricer_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT, tenant_id TEXT NOT NULL DEFAULT 'demo',
            sku TEXT, channel TEXT, prev REAL, next REAL, reason TEXT, time TEXT, created_at TEXT
        )");

        $pdo->exec("CREATE TABLE IF NOT EXISTS po_calendar (
            id INTEGER PRIMARY KEY AUTOINCREMENT, tenant_id TEXT NOT NULL DEFAULT 'demo',
            sku TEXT, name TEXT, channel TEXT DEFAULT 'all', startDate TEXT, endDate TEXT,
            promoPrice REAL, discountRate REAL, reason TEXT, status TEXT DEFAULT '초안', created_at TEXT
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
        $minPrice = $cost > 0 ? round($cost / (1 - $targetMargin), 0) : (float)($body['min_price'] ?? 0);
        $es = $db->prepare("SELECT price, quantity FROM po_elasticity WHERE sku = ? AND channel = ? AND tenant_id = ? ORDER BY price");
        $es->execute([$sku, $channel, $t]);
        $rows = $es->fetchAll(\PDO::FETCH_ASSOC);
        if (!count($rows)) { $es->execute([$sku, '*', $t]); $rows = $es->fetchAll(\PDO::FETCH_ASSOC); }
        if (count($rows) >= 2) {
            $xs = array_column($rows, 'price'); $ys = array_column($rows, 'quantity');
            $lxs = array_map('log', array_map(fn($v) => max($v, 1), $xs));
            $lys = array_map('log', array_map(fn($v) => max($v, 0.1), $ys));
            $reg = self::linReg($lxs, $lys);
            $candidates = range(max($minPrice, $cost * 1.05), max($cost * 3, ($currentPx ?? $minPrice) * 1.5), max(100, $cost * 0.02));
            $best = ['price' => $minPrice, 'profit' => -INF, 'qty' => 0];
            foreach ($candidates as $p) {
                $q = exp($reg['intercept'] + $reg['slope'] * log(max($p, 1)));
                if ($inventory > 0) $q = min($q, $inventory * 0.8);
                $profit = ($p - $cost) * $q;
                if ($profit > $best['profit']) $best = ['price' => $p, 'profit' => $profit, 'qty' => $q];
            }
            $optPrice = round($best['price'], -2); $optQty = round($best['qty'], 1);
            $optMargin = $optPrice > 0 ? round(($optPrice - $cost) / $optPrice, 4) : 0;
            $algo = 'log-log-regression'; $r2 = $reg['r2'];
        } else {
            $optPrice = $minPrice; $optQty = null; $optMargin = $targetMargin;
            $algo = 'cost-plus-fallback'; $r2 = null;
        }
        $clearancePrice = null;
        if ($inventory > 0 && $inventory < 30) $clearancePrice = round($optPrice * 1.08, -2);
        elseif ($inventory > 200) $clearancePrice = round(max($minPrice, $optPrice * 0.88), -2);
        $ins = $db->prepare("INSERT INTO po_recommendations (tenant_id,sku,channel,current_price,optimal_price,expected_margin,expected_qty,inventory_level,algo,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)");
        $ins->execute([$t, $sku, $channel, $currentPx, $optPrice, $optMargin, $optQty, $inventory, $algo, gmdate('c')]);
        return self::json($response, ['ok'=>true,'sku'=>$sku,'channel'=>$channel,'current_price'=>$currentPx,'optimal_price'=>$optPrice,'clearance_price'=>$clearancePrice,'expected_margin'=>$optMargin,'expected_qty'=>$optQty,'algo'=>$algo,'r2'=>$r2,'min_price'=>$minPrice,'inventory'=>$inventory,'cost_price'=>$cost]);
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
        $db->prepare("INSERT INTO po_repricer_rules (tenant_id,name,sku,channel,mode,active,created_at) VALUES (?,?,?,?,?,1,?)")
            ->execute([$t,$name,$body['sku']??'*',$body['channel']??'*',$body['mode']??'min_price',gmdate('c')]);
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

    /** [237차] 리프라이서 실행 코어(HTTP 핸들러 runRepricer + cron repricer_cron.php 공용). @return array 요약 */
    public static function repriceForTenant(string $t): array
    {
        $db = self::db(); $now = gmdate('c');
        $rs = $db->prepare("SELECT * FROM po_repricer_rules WHERE tenant_id=? AND active=1");
        $rs->execute([$t]);
        $rules = $rs->fetchAll(\PDO::FETCH_ASSOC);
        $changes = []; $evaluated = 0; $enqueued = 0;
        $hist = $db->prepare("INSERT INTO po_repricer_history (tenant_id,sku,channel,prev,next,reason,time,created_at) VALUES (?,?,?,?,?,?,?,?)");
        $updComp = $db->prepare("UPDATE po_competitors SET ourPrice=?, updated_at=? WHERE tenant_id=? AND sku=?");
        $updProd = $db->prepare("UPDATE po_products SET base_price=? WHERE tenant_id=? AND sku=?");
        foreach ($rules as $rule) {
            $mode = (string)($rule['mode'] ?? 'min_price');
            $ruleSku = trim((string)($rule['sku'] ?? '*'));
            $channel = (string)($rule['channel'] ?? '*');
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
                $comps = array_filter([(float)($c['compA'] ?? 0), (float)($c['compB'] ?? 0)], fn($x) => $x > 0);
                // 원가·목표마진 가드(절대 하한). 상품 미등록 시 현가의 70%를 안전하한.
                $ps = $db->prepare("SELECT cost_price, target_margin FROM po_products WHERE tenant_id=? AND sku=? LIMIT 1");
                $ps->execute([$t, $sku]); $prod = $ps->fetch(\PDO::FETCH_ASSOC);
                $cost = $prod ? (float)$prod['cost_price'] : 0.0;
                $tMargin = $prod ? (float)$prod['target_margin'] : 0.30;
                $floor = $cost > 0 ? round($cost * (1 + $tMargin * 0.5)) : round($cur * 0.7); // 원가+절반목표마진, 또는 현가70%
                $new = $cur;
                $reason = '';
                if ($mode === 'match' && $comps) {
                    $new = max($floor, round(min($comps))); $reason = '경쟁사 최저가 매칭';
                } elseif ($mode === 'margin') {
                    $target = $cost > 0 ? round($cost * (1 + $tMargin)) : $cur;
                    $new = max($cur < $target ? $target : $cur, $floor); $reason = '목표마진 확보';
                } else { // min_price(언더컷, 기본)
                    if ($comps) { $new = max($floor, round(min($comps) * 0.99)); $reason = '경쟁사 최저가 -1% 언더컷'; }
                }
                // 가드: 하한 미만 금지·과도변동(±50%) 방지·의미있는 변화(>0.5%)만 적용.
                if ($new < $floor) { $new = $floor; $reason .= '(원가마진 하한 적용)'; }
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
            'pending_approval' => $enqueued,
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
