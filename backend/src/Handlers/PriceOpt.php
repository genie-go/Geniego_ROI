<?php
declare(strict_types=1);

namespace Genie\Handlers;

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;

/**
 * v420 — Price Optimisation Engine
 * In-memory SQLite; no external DB required.
 */
class PriceOpt
{
    // ─── DB bootstrap ────────────────────────────────────────────────────────

    private static ?\PDO $db = null;

    private static function db(): \PDO
    {
        if (self::$db !== null) return self::$db;

        $pdo = new \PDO('sqlite::memory:');
        $pdo->setAttribute(\PDO::ATTR_ERRMODE, \PDO::ERRMODE_EXCEPTION);
        $pdo->exec("PRAGMA journal_mode=WAL");

        $pdo->exec("CREATE TABLE IF NOT EXISTS po_products (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            sku          TEXT NOT NULL UNIQUE,
            product_name TEXT NOT NULL,
            cost_price   REAL NOT NULL DEFAULT 0,
            target_margin REAL NOT NULL DEFAULT 0.30,
            base_price   REAL,
            unit         TEXT DEFAULT 'KRW',
            created_at   TEXT NOT NULL
        )");

        $pdo->exec("CREATE TABLE IF NOT EXISTS po_elasticity (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            sku        TEXT NOT NULL,
            channel    TEXT NOT NULL DEFAULT '*',
            price      REAL NOT NULL,
            quantity   REAL NOT NULL,
            recorded_at TEXT NOT NULL
        )");

        $pdo->exec("CREATE TABLE IF NOT EXISTS po_recommendations (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
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
            sim_type     TEXT NOT NULL DEFAULT 'channel_mix',
            payload_json TEXT NOT NULL,
            result_json  TEXT NOT NULL,
            created_at   TEXT NOT NULL
        )");

        // No seed products — real user data only

        // No seed data — real user data only

        self::$db = $pdo;
        return $pdo;
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
        $db   = self::db();
        $body = self::body($request);
        $sku  = trim($body['sku'] ?? '');
        if (!$sku) return self::json($response, ['ok' => false, 'error' => 'sku required'], 400);

        $stmt = $db->prepare("INSERT OR REPLACE INTO po_products
            (sku, product_name, cost_price, target_margin, base_price, unit, created_at)
            VALUES (:sku, :pn, :cp, :tm, :bp, :unit, :ts)");
        $stmt->execute([
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
        $db   = self::db();
        $body = self::body($request);
        $sku  = $args['sku'] ?? '';
        if (!$sku) return self::json($response, ['ok' => false, 'error' => 'sku required'], 400);
        $sets = []; $params = [':sku' => $sku];
        foreach (['product_name','cost_price','target_margin','base_price','unit'] as $f) {
            if (isset($body[$f])) { $sets[] = "$f = :$f"; $params[":$f"] = $body[$f]; }
        }
        if (!count($sets)) return self::json($response, ['ok' => false, 'error' => 'no fields'], 400);
        $db->prepare("UPDATE po_products SET " . implode(',', $sets) . " WHERE sku = :sku")->execute($params);
        return self::json($response, ['ok' => true, 'sku' => $sku]);
    }

    /** DELETE /v420/price/products/{sku} */
    public static function deleteProduct(Request $request, Response $response, array $args): Response
    {
        $db  = self::db();
        $sku = $args['sku'] ?? '';
        $db->prepare("DELETE FROM po_products WHERE sku = ?")->execute([$sku]);
        return self::json($response, ['ok' => true, 'deleted' => $sku]);
    }

    /** GET /v420/price/products */
    public static function listProducts(Request $request, Response $response, array $args): Response
    {
        $rows = self::db()->query("SELECT * FROM po_products ORDER BY created_at DESC")->fetchAll(\PDO::FETCH_ASSOC);
        return self::json($response, ['ok' => true, 'products' => $rows]);
    }

    /** POST /v420/price/elasticity */
    public static function addElasticity(Request $request, Response $response, array $args): Response
    {
        $db   = self::db();
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
        $ins = $db->prepare("INSERT INTO po_elasticity (sku, channel, price, quantity, recorded_at) VALUES (?,?,?,?,?)");
        $ch  = $body['channel'] ?? '*';
        $ts  = gmdate('c');
        $cnt = 0;
        foreach ($points as $pt) {
            $ins->execute([$sku, $ch, (float)($pt['price'] ?? 0), (float)($pt['quantity'] ?? 0), $ts]);
            $cnt++;
        }
        return self::json($response, ['ok' => true, 'inserted' => $cnt]);
    }

    /** POST /v420/price/elasticity/bulk — CSV-style bulk import */
    public static function bulkElasticity(Request $request, Response $response, array $args): Response
    {
        $db   = self::db();
        $body = self::body($request);
        $rows = $body['rows'] ?? [];
        if (!is_array($rows)) return self::json($response, ['ok' => false, 'error' => 'rows[] required'], 400);
        $ins = $db->prepare("INSERT INTO po_elasticity (sku, channel, price, quantity, recorded_at) VALUES (?,?,?,?,?)");
        $ts = gmdate('c'); $cnt = 0;
        foreach ($rows as $r) {
            $ins->execute([trim($r['sku'] ?? ''), $r['channel'] ?? '*', (float)($r['price'] ?? 0), (float)($r['quantity'] ?? 0), $ts]);
            $cnt++;
        }
        return self::json($response, ['ok' => true, 'inserted' => $cnt]);
    }

    /** POST /v420/price/optimize */
    public static function optimize(Request $request, Response $response, array $args): Response
    {
        $db   = self::db();
        $body = self::body($request);
        $sku  = trim($body['sku'] ?? '');
        if (!$sku) return self::json($response, ['ok' => false, 'error' => 'sku required'], 400);
        $channel = $body['channel'] ?? '*';
        $inventory = (int)($body['inventory'] ?? 0);
        $currentPx = isset($body['current_price']) ? (float)$body['current_price'] : null;
        $ps = $db->prepare("SELECT * FROM po_products WHERE sku = ?");
        $ps->execute([$sku]);
        $product = $ps->fetch(\PDO::FETCH_ASSOC);
        $cost = $product ? (float)$product['cost_price'] : 0;
        $targetMargin = $product ? (float)$product['target_margin'] : 0.30;
        $minPrice = $cost > 0 ? round($cost / (1 - $targetMargin), 0) : (float)($body['min_price'] ?? 0);
        $es = $db->prepare("SELECT price, quantity FROM po_elasticity WHERE sku = ? AND channel = ? ORDER BY price");
        $es->execute([$sku, $channel]);
        $rows = $es->fetchAll(\PDO::FETCH_ASSOC);
        if (!count($rows)) { $es->execute([$sku, '*']); $rows = $es->fetchAll(\PDO::FETCH_ASSOC); }
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
        $ins = $db->prepare("INSERT INTO po_recommendations (sku,channel,current_price,optimal_price,expected_margin,expected_qty,inventory_level,algo,created_at) VALUES (?,?,?,?,?,?,?,?,?)");
        $ins->execute([$sku, $channel, $currentPx, $optPrice, $optMargin, $optQty, $inventory, $algo, gmdate('c')]);
        return self::json($response, ['ok'=>true,'sku'=>$sku,'channel'=>$channel,'current_price'=>$currentPx,'optimal_price'=>$optPrice,'clearance_price'=>$clearancePrice,'expected_margin'=>$optMargin,'expected_qty'=>$optQty,'algo'=>$algo,'r2'=>$r2,'min_price'=>$minPrice,'inventory'=>$inventory,'cost_price'=>$cost]);
    }

    /** POST /v420/price/optimize/batch */
    public static function optimizeBatch(Request $request, Response $response, array $args): Response
    {
        $db = self::db(); $body = self::body($request);
        $skus = $body['skus'] ?? [];
        $results = [];
        foreach ($skus as $s) {
            $sku = is_string($s) ? $s : ($s['sku'] ?? '');
            if (!$sku) continue;
            // reuse optimize logic inline
            $ps = $db->prepare("SELECT * FROM po_products WHERE sku = ?");
            $ps->execute([$sku]); $product = $ps->fetch(\PDO::FETCH_ASSOC);
            if (!$product) continue;
            $cost = (float)$product['cost_price']; $tm = (float)$product['target_margin'];
            $minP = $cost > 0 ? round($cost / (1 - $tm), 0) : 0;
            $es = $db->prepare("SELECT price,quantity FROM po_elasticity WHERE sku=? AND channel='*' ORDER BY price");
            $es->execute([$sku]); $rows=$es->fetchAll(\PDO::FETCH_ASSOC);
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
        $rows = self::db()->query("SELECT r.*, p.product_name FROM po_recommendations r LEFT JOIN po_products p ON p.sku = r.sku ORDER BY r.created_at DESC LIMIT 100")->fetchAll(\PDO::FETCH_ASSOC);
        return self::json($response, ['ok' => true, 'recommendations' => $rows]);
    }

    /** POST /v420/price/simulate */
    public static function simulate(Request $request, Response $response, array $args): Response
    {
        $db = self::db(); $body = self::body($request);
        $sku = trim($body['sku'] ?? ''); $prices = array_map('floatval', $body['prices'] ?? []);
        if (!$sku || !count($prices)) return self::json($response, ['ok'=>false,'error'=>'sku and prices[] required'], 400);
        $ps = $db->prepare("SELECT * FROM po_products WHERE sku = ?"); $ps->execute([$sku]);
        $product = $ps->fetch(\PDO::FETCH_ASSOC); $cost = $product ? (float)$product['cost_price'] : 0;
        $ch = $body['channel'] ?? '*';
        $es = $db->prepare("SELECT price,quantity FROM po_elasticity WHERE sku=? AND channel=?");
        $es->execute([$sku,$ch]); $rows=$es->fetchAll(\PDO::FETCH_ASSOC);
        if (!count($rows)){$es->execute([$sku,'*']);$rows=$es->fetchAll(\PDO::FETCH_ASSOC);}
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
        $db->prepare("INSERT INTO po_simulations (sim_type,payload_json,result_json,created_at) VALUES ('scenario',?,?,?)")->execute([json_encode($body),json_encode($result),gmdate('c')]);
        return self::json($response, $result);
    }

    /** GET /v420/price/summary */
    public static function summary(Request $request, Response $response, array $args): Response
    {
        $db = self::db();
        $products = (int)$db->query("SELECT COUNT(*) FROM po_products")->fetchColumn();
        $ePoints  = (int)$db->query("SELECT COUNT(*) FROM po_elasticity")->fetchColumn();
        $recCount = (int)$db->query("SELECT COUNT(*) FROM po_recommendations")->fetchColumn();
        $avgMargin = $db->query("SELECT AVG(expected_margin) FROM po_recommendations WHERE expected_margin IS NOT NULL")->fetchColumn();
        $avgOpt    = $db->query("SELECT AVG(optimal_price) FROM po_recommendations")->fetchColumn();
        $recent = $db->query("SELECT r.sku,r.channel,r.current_price,r.optimal_price,r.expected_margin,p.product_name FROM po_recommendations r LEFT JOIN po_products p ON p.sku=r.sku ORDER BY r.created_at DESC LIMIT 10")->fetchAll(\PDO::FETCH_ASSOC);
        $byChannel = $db->query("SELECT channel,COUNT(*) as cnt,AVG(optimal_price) as avg_optimal,AVG(expected_margin) as avg_margin FROM po_recommendations GROUP BY channel")->fetchAll(\PDO::FETCH_ASSOC);
        return self::json($response, ['ok'=>true,'products'=>$products,'elasticity_pts'=>$ePoints,'recommendations'=>$recCount,'avg_margin'=>$avgMargin!==false?round((float)$avgMargin,4):null,'avg_optimal_px'=>$avgOpt!==false?round((float)$avgOpt,0):null,'recent'=>$recent,'by_channel'=>$byChannel]);
    }

    /** POST /v420/channel-mix/simulate */
    public static function channelMixSimulate(Request $request, Response $response, array $args): Response
    {
        $db = self::db(); $body = self::body($request);
        $budget = (float)($body['total_budget'] ?? 1000000);
        $channels = $body['channels'] ?? [];
        $totalRoi = array_sum(array_column($channels, 'roi_per_won'));
        $alloc = []; $allocated = 0;
        foreach ($channels as $ch) {
            $pct = max((float)($ch['min_pct']??0),min((float)($ch['max_pct']??1),($ch['roi_per_won']/$totalRoi)));
            $spend = round($budget*$pct,0);
            $alloc[] = ['channel'=>$ch['channel'],'roi_per_won'=>$ch['roi_per_won'],'allocation_pct'=>round($pct*100,1),'spend'=>$spend,'expected_return'=>round($spend*$ch['roi_per_won'],0),'expected_profit'=>round($spend*($ch['roi_per_won']-1),0)];
            $allocated += $spend;
        }
        $diff=$budget-$allocated;
        if($diff!=0&&count($alloc)){$alloc[0]['spend']+=$diff;$alloc[0]['expected_return']=round($alloc[0]['spend']*$alloc[0]['roi_per_won'],0);$alloc[0]['expected_profit']=round($alloc[0]['spend']*($alloc[0]['roi_per_won']-1),0);}
        $totalReturn=array_sum(array_column($alloc,'expected_return'));
        $totalProfit=array_sum(array_column($alloc,'expected_profit'));
        $result=['ok'=>true,'total_budget'=>$budget,'total_return'=>$totalReturn,'total_profit'=>$totalProfit,'blended_roi'=>$budget>0?round($totalReturn/$budget,4):0,'allocations'=>$alloc];
        $db->prepare("INSERT INTO po_simulations (sim_type,payload_json,result_json,created_at) VALUES ('channel_mix',?,?,?)")->execute([json_encode($body),json_encode($result),gmdate('c')]);
        return self::json($response, $result);
    }

    /** GET /v420/channel-mix/results */
    public static function channelMixResults(Request $request, Response $response, array $args): Response
    {
        $rows = self::db()->query("SELECT id,result_json,created_at FROM po_simulations WHERE sim_type='channel_mix' ORDER BY created_at DESC LIMIT 20")->fetchAll(\PDO::FETCH_ASSOC);
        $results = array_map(function($r){$d=json_decode($r['result_json'],true);$d['id']=$r['id'];$d['created_at']=$r['created_at'];return $d;},$rows);
        return self::json($response, ['ok'=>true,'results'=>$results]);
    }

    // ── Competitor Monitoring ────────────────────────────────────────────────

    /** GET /v420/price/competitor */
    public static function listCompetitors(Request $request, Response $response, array $args): Response
    {
        $db = self::db();
        $db->exec("CREATE TABLE IF NOT EXISTS po_competitors (
            id INTEGER PRIMARY KEY AUTOINCREMENT, sku TEXT NOT NULL, name TEXT,
            ourPrice REAL, compA REAL, compB REAL, sosRank INTEGER DEFAULT 99,
            alert INTEGER DEFAULT 0, updated_at TEXT)");
        $rows = $db->query("SELECT * FROM po_competitors ORDER BY alert DESC, sku")->fetchAll(\PDO::FETCH_ASSOC);
        return self::json($response, ['ok'=>true,'items'=>$rows]);
    }

    /** POST /v420/price/competitor */
    public static function upsertCompetitor(Request $request, Response $response, array $args): Response
    {
        $db = self::db(); $body = self::body($request);
        $db->exec("CREATE TABLE IF NOT EXISTS po_competitors (
            id INTEGER PRIMARY KEY AUTOINCREMENT, sku TEXT NOT NULL, name TEXT,
            ourPrice REAL, compA REAL, compB REAL, sosRank INTEGER DEFAULT 99,
            alert INTEGER DEFAULT 0, updated_at TEXT)");
        $sku = trim($body['sku'] ?? '');
        if (!$sku) return self::json($response, ['ok'=>false,'error'=>'sku required'], 400);
        $alert = ((float)($body['compA']??0) < (float)($body['ourPrice']??0)) ? 1 : 0;
        $db->prepare("INSERT OR REPLACE INTO po_competitors (sku,name,ourPrice,compA,compB,sosRank,alert,updated_at) VALUES (?,?,?,?,?,?,?,?)")
            ->execute([$sku,$body['name']??$sku,(float)($body['ourPrice']??0),(float)($body['compA']??0),(float)($body['compB']??0),(int)($body['sosRank']??99),$alert,gmdate('c')]);
        return self::json($response, ['ok'=>true,'sku'=>$sku]);
    }

    // ── Dynamic Repricer ─────────────────────────────────────────────────────

    /** GET /v420/price/repricer/rules */
    public static function listRepricerRules(Request $request, Response $response, array $args): Response
    {
        $db = self::db();
        $db->exec("CREATE TABLE IF NOT EXISTS po_repricer_rules (
            id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL,
            sku TEXT, channel TEXT DEFAULT '*', mode TEXT DEFAULT 'min_price',
            active INTEGER DEFAULT 1, lastRun TEXT, changeCount INTEGER DEFAULT 0, created_at TEXT)");
        $db->exec("CREATE TABLE IF NOT EXISTS po_repricer_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT, sku TEXT, channel TEXT, prev REAL, next REAL,
            reason TEXT, time TEXT, created_at TEXT)");
        $rules = $db->query("SELECT * FROM po_repricer_rules ORDER BY created_at DESC")->fetchAll(\PDO::FETCH_ASSOC);
        $avgImprove = $db->query("SELECT CASE WHEN COUNT(*)>0 THEN AVG((next-prev)/NULLIF(prev,0)) ELSE NULL END FROM po_repricer_history WHERE prev>0")->fetchColumn();
        return self::json($response, ['ok'=>true,'rules'=>$rules,'avg_margin_improve'=>$avgImprove!==false&&$avgImprove!==null?round((float)$avgImprove,4):null]);
    }

    /** POST /v420/price/repricer/rules */
    public static function createRepricerRule(Request $request, Response $response, array $args): Response
    {
        $db = self::db(); $body = self::body($request);
        $db->exec("CREATE TABLE IF NOT EXISTS po_repricer_rules (
            id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL,
            sku TEXT, channel TEXT DEFAULT '*', mode TEXT DEFAULT 'min_price',
            active INTEGER DEFAULT 1, lastRun TEXT, changeCount INTEGER DEFAULT 0, created_at TEXT)");
        $name = trim($body['name'] ?? '');
        if (!$name) return self::json($response, ['ok'=>false,'error'=>'name required'], 400);
        $db->prepare("INSERT INTO po_repricer_rules (name,sku,channel,mode,active,created_at) VALUES (?,?,?,?,1,?)")
            ->execute([$name,$body['sku']??'*',$body['channel']??'*',$body['mode']??'min_price',gmdate('c')]);
        return self::json($response, ['ok'=>true,'id'=>$db->lastInsertId()]);
    }

    /** GET /v420/price/repricer/history */
    public static function repricerHistory(Request $request, Response $response, array $args): Response
    {
        $db = self::db();
        $db->exec("CREATE TABLE IF NOT EXISTS po_repricer_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT, sku TEXT, channel TEXT, prev REAL, next REAL,
            reason TEXT, time TEXT, created_at TEXT)");
        $rows = $db->query("SELECT * FROM po_repricer_history ORDER BY created_at DESC LIMIT 50")->fetchAll(\PDO::FETCH_ASSOC);
        return self::json($response, ['ok'=>true,'history'=>$rows]);
    }

    /** POST /v420/price/repricer/rules/{id}/toggle */
    public static function toggleRepricerRule(Request $request, Response $response, array $args): Response
    {
        $db = self::db(); $id = (int)($args['id'] ?? 0);
        $db->exec("CREATE TABLE IF NOT EXISTS po_repricer_rules (
            id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL,
            sku TEXT, channel TEXT DEFAULT '*', mode TEXT DEFAULT 'min_price',
            active INTEGER DEFAULT 1, lastRun TEXT, changeCount INTEGER DEFAULT 0, created_at TEXT)");
        $db->prepare("UPDATE po_repricer_rules SET active = CASE WHEN active=1 THEN 0 ELSE 1 END WHERE id=?")->execute([$id]);
        return self::json($response, ['ok'=>true,'toggled'=>$id]);
    }

    // ── Promo Calendar ───────────────────────────────────────────────────────

    /** GET /v420/price/calendar */
    public static function listCalendar(Request $request, Response $response, array $args): Response
    {
        $db = self::db();
        $db->exec("CREATE TABLE IF NOT EXISTS po_calendar (
            id INTEGER PRIMARY KEY AUTOINCREMENT, sku TEXT, name TEXT, channel TEXT DEFAULT 'all',
            startDate TEXT, endDate TEXT, promoPrice REAL, discountRate REAL,
            reason TEXT, status TEXT DEFAULT '초안', created_at TEXT)");
        $rows = $db->query("SELECT * FROM po_calendar ORDER BY startDate DESC")->fetchAll(\PDO::FETCH_ASSOC);
        return self::json($response, ['ok'=>true,'events'=>$rows]);
    }

    /** POST /v420/price/calendar */
    public static function createCalendarEvent(Request $request, Response $response, array $args): Response
    {
        $db = self::db(); $body = self::body($request);
        $db->exec("CREATE TABLE IF NOT EXISTS po_calendar (
            id INTEGER PRIMARY KEY AUTOINCREMENT, sku TEXT, name TEXT, channel TEXT DEFAULT 'all',
            startDate TEXT, endDate TEXT, promoPrice REAL, discountRate REAL,
            reason TEXT, status TEXT DEFAULT '초안', created_at TEXT)");
        $db->prepare("INSERT INTO po_calendar (sku,name,channel,startDate,endDate,promoPrice,discountRate,reason,status,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)")
            ->execute([$body['sku']??'',$body['name']??'',$body['channel']??'all',$body['startDate']??'',$body['endDate']??'',(float)($body['promoPrice']??0),(float)($body['discountRate']??0),$body['reason']??'','초안',gmdate('c')]);
        return self::json($response, ['ok'=>true,'id'=>$db->lastInsertId()]);
    }

    /** DELETE /v420/price/calendar/{id} */
    public static function deleteCalendarEvent(Request $request, Response $response, array $args): Response
    {
        $db = self::db();
        $db->prepare("DELETE FROM po_calendar WHERE id=?")->execute([(int)($args['id']??0)]);
        return self::json($response, ['ok'=>true]);
    }
}

