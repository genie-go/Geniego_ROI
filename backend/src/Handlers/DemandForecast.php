<?php
declare(strict_types=1);
namespace Genie\Handlers;

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;
use Genie\Db;

/**
 * 수요예측 서버측 실모델 (206차 #5).
 *   채널 주문 히스토리(channel_orders)를 SKU×일자 시계열로 집계하고,
 *   데이터량에 따라 Holt-Winters(가법, 주간 계절성) / Holt 선형추세 / 이동평균을
 *   자동 선택해 미래 수요를 예측한다. 정확도는 1-step in-sample sMAPE 로 산출(날조 금지),
 *   안전재고/재주문점은 잔차 표준편차 기반(서비스레벨 95%).
 *
 * Routes(세션 self-auth bypass — /api/demand/*, /demand/*):
 *   GET /api/demand/summary    — KPI(추적 SKU·예측가능·평균 정확도·데이터일수)
 *   GET /api/demand/forecast   — SKU별 예측(?horizon=14&sku=&days=90&top=50&lead=7)
 *   GET /api/demand/seasonality — 요일 계절 지수
 */
class DemandForecast
{
    private static function db(): \PDO { return Db::pdo(); }
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

    /** SKU별 일자 수요 시계열 적재(결측일 0 채움). @return array<string,array{name:string,series:float[],dates:string[]}> */
    private static function loadSeries(string $tenant, int $days, int $topN): array
    {
        $pdo = self::db();
        $since = gmdate('Y-m-d', time() - $days * 86400);
        // SKU별 일자 합계 — ordered_at 은 'Y-m-d...' 또는 ISO('Y-m-dT...'), 앞 10자리=날짜
        $sql = "SELECT sku, SUBSTR(ordered_at,1,10) AS d,
                       SUM(qty) AS q, MAX(product_name) AS name
                  FROM channel_orders
                 WHERE tenant_id = :t AND sku IS NOT NULL AND sku <> ''
                   AND SUBSTR(ordered_at,1,10) >= :since
                   AND (event_type IS NULL OR event_type = 'order')
                 GROUP BY sku, SUBSTR(ordered_at,1,10)";
        try {
            $st = $pdo->prepare($sql);
            $st->execute([':t' => $tenant, ':since' => $since]);
            $rows = $st->fetchAll(\PDO::FETCH_ASSOC);
        } catch (\Throwable $e) { return []; }
        if (!$rows) return [];

        // SKU별 총량으로 상위 N 선별
        $bySku = [];
        foreach ($rows as $r) {
            $sku = (string)$r['sku'];
            $bySku[$sku]['name'] = $bySku[$sku]['name'] ?? (string)($r['name'] ?? $sku);
            $bySku[$sku]['days'][(string)$r['d']] = (float)$r['q'];
            $bySku[$sku]['total'] = ($bySku[$sku]['total'] ?? 0) + (float)$r['q'];
        }
        uasort($bySku, fn($a, $b) => ($b['total'] ?? 0) <=> ($a['total'] ?? 0));
        $bySku = array_slice($bySku, 0, max(1, $topN), true);

        // 연속 일자축(전체 SKU 공통 min~today) 생성 후 결측 0 채움.
        // ★206차 TZ 트랩 회피: strtotime 은 서버 로컬TZ, gmdate 는 UTC → KST(+9) 에서 '+1 day'가
        //   UTC 동일 날짜로 되돌아와 무한루프(엔드포인트 hang). 정수 일수 기반(UTC 고정)으로 경계 보장.
        $startTs = (int)gmmktime(0, 0, 0, (int)substr($since, 5, 2), (int)substr($since, 8, 2), (int)substr($since, 0, 4));
        $dates = [];
        for ($i = 0; $i <= $days; $i++) $dates[] = gmdate('Y-m-d', $startTs + $i * 86400);

        $out = [];
        foreach ($bySku as $sku => $info) {
            $series = [];
            foreach ($dates as $d) $series[] = (float)($info['days'][$d] ?? 0);
            $out[$sku] = ['name' => $info['name'], 'series' => $series, 'dates' => $dates];
        }
        return $out;
    }

    // ── 통계 헬퍼 ──────────────────────────────────────────────────────────
    private static function mean(array $a): float { return $a ? array_sum($a) / count($a) : 0.0; }
    private static function stddev(array $a): float
    {
        $n = count($a); if ($n < 2) return 0.0;
        $m = self::mean($a); $s = 0.0;
        foreach ($a as $v) $s += ($v - $m) ** 2;
        return sqrt($s / ($n - 1));
    }

    /**
     * 시계열 예측 — 데이터량 기반 모델 자동선택.
     * @return array{method:string,forecast:float[],accuracy:float,sigma:float,avg:float}
     */
    private static function forecast(array $y, int $horizon, int $season = 7): array
    {
        // [현 차수 P2] ★모델 자동선택을 '비영(실판매) 관측수' 기준으로 — 시계열을 연속일자축에 0채움하면
        //   count($y)=91 고정이라 mean/holtLinear 분기가 영원히 dead 이고 항상 holtWinters 였다. 결과: 90일 중
        //   3일만 판매된 간헐수요 SKU 도 주간계절성 예측 → sigma 팽창 → 안전재고·reorder point 과대 → 과잉발주.
        $n = count($y);
        $nz = count(array_filter($y, fn($v) => $v > 0)); // 실판매 관측일수
        $avg = max(0.0, self::mean($y));
        if ($nz < 4) {
            $f = array_fill(0, $horizon, round($avg, 2));
            return ['method' => 'mean', 'forecast' => $f, 'accuracy' => 0.0, 'sigma' => self::stddev($y), 'avg' => $avg];
        }
        if ($nz >= 2 * $season && $n >= 2 * $season) return self::holtWinters($y, $horizon, $season);
        return self::holtLinear($y, $horizon);
    }

    /** Holt 선형추세(이중 지수평활). */
    private static function holtLinear(array $y, int $horizon, float $alpha = 0.4, float $beta = 0.2): array
    {
        $n = count($y);
        $level = $y[0]; $trend = $y[1] - $y[0];
        $fitted = [];
        for ($i = 0; $i < $n; $i++) {
            $pred = $level + $trend;
            $fitted[$i] = $pred;
            $prevLevel = $level;
            $level = $alpha * $y[$i] + (1 - $alpha) * ($level + $trend);
            $trend = $beta * ($level - $prevLevel) + (1 - $beta) * $trend;
        }
        $forecast = [];
        for ($h = 1; $h <= $horizon; $h++) $forecast[] = round(max(0.0, $level + $h * $trend), 2);
        return self::pack('holt_linear', $forecast, $y, $fitted);
    }

    /** Holt-Winters 가법(level+trend+계절성). */
    private static function holtWinters(array $y, int $horizon, int $m, float $alpha = 0.3, float $beta = 0.1, float $gamma = 0.2): array
    {
        $n = count($y);
        // 초기화: 첫 2주기 평균으로 level/trend, 계절지수
        $seasons = (int)floor($n / $m);
        $seasonAvgs = [];
        for ($s = 0; $s < $seasons; $s++) {
            $slice = array_slice($y, $s * $m, $m);
            $seasonAvgs[$s] = self::mean($slice);
        }
        $level = $seasonAvgs[0];
        $trend = ($seasonAvgs[count($seasonAvgs) > 1 ? 1 : 0] - $seasonAvgs[0]) / $m;
        $seasonal = [];
        for ($i = 0; $i < $m; $i++) {
            $sum = 0.0; $cnt = 0;
            for ($s = 0; $s < $seasons; $s++) {
                $idx = $s * $m + $i;
                if ($idx < $n && $seasonAvgs[$s] != 0.0) { $sum += $y[$idx] - $seasonAvgs[$s]; $cnt++; }
            }
            $seasonal[$i] = $cnt ? $sum / $cnt : 0.0;
        }
        $fitted = [];
        for ($i = 0; $i < $n; $i++) {
            $si = $i % $m;
            $pred = $level + $trend + $seasonal[$si];
            $fitted[$i] = $pred;
            $prevLevel = $level;
            $level = $alpha * ($y[$i] - $seasonal[$si]) + (1 - $alpha) * ($level + $trend);
            $trend = $beta * ($level - $prevLevel) + (1 - $beta) * $trend;
            $seasonal[$si] = $gamma * ($y[$i] - $level) + (1 - $gamma) * $seasonal[$si];
        }
        $forecast = [];
        for ($h = 1; $h <= $horizon; $h++) {
            $si = ($n + $h - 1) % $m;
            $forecast[] = round(max(0.0, $level + $h * $trend + $seasonal[$si]), 2);
        }
        return self::pack('holt_winters', $forecast, $y, $fitted);
    }

    /** 1-step in-sample sMAPE → accuracy(%) + 잔차 sigma. */
    private static function pack(string $method, array $forecast, array $y, array $fitted): array
    {
        $n = count($y); $resid = []; $smape = []; $start = max(1, (int)floor($n * 0.2));
        for ($i = $start; $i < $n; $i++) {
            $a = $y[$i]; $p = max(0.0, $fitted[$i] ?? 0);
            $resid[] = $a - $p;
            $den = abs($a) + abs($p);
            if ($den > 0) $smape[] = abs($a - $p) / ($den / 2);
        }
        $accuracy = $smape ? round(max(0.0, (1 - self::mean($smape)) * 100), 1) : 0.0;
        return [
            'method'   => $method,
            'forecast' => $forecast,
            'accuracy' => $accuracy,
            'sigma'    => round(self::stddev($resid), 3),
            'avg'      => round(self::mean($y), 2),
        ];
    }

    /* ─── [246차] 안전재고 최적화 헬퍼(forecast/autoReplenish 공용) ─── */

    /** 표준정규 역함수(Acklam 근사) — 서비스레벨 p∈(0,1) → z. */
    private static function invNorm(float $p): float
    {
        $p = max(1e-6, min(1 - 1e-6, $p));
        $a = [-3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02, 1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00];
        $b = [-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02, 6.680131188771972e+01, -1.328068155288572e+01];
        $c = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00, -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00];
        $d = [7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00, 3.754408661907416e+00];
        $pl = 0.02425;
        if ($p < $pl) { $q = sqrt(-2 * log($p)); return ((((($c[0] * $q + $c[1]) * $q + $c[2]) * $q + $c[3]) * $q + $c[4]) * $q + $c[5]) / (((($d[0] * $q + $d[1]) * $q + $d[2]) * $q + $d[3]) * $q + 1); }
        if ($p <= 1 - $pl) { $q = $p - 0.5; $r = $q * $q; return ((((($a[0] * $r + $a[1]) * $r + $a[2]) * $r + $a[3]) * $r + $a[4]) * $r + $a[5]) * $q / ((((($b[0] * $r + $b[1]) * $r + $b[2]) * $r + $b[3]) * $r + $b[4]) * $r + 1); }
        $q = sqrt(-2 * log(1 - $p)); return -((((($c[0] * $q + $c[1]) * $q + $c[2]) * $q + $c[3]) * $q + $c[4]) * $q + $c[5]) / (((($d[0] * $q + $d[1]) * $q + $d[2]) * $q + $d[3]) * $q + 1);
    }

    /**
     * 최적 서비스레벨 z — 비용기반(newsvendor) 우선, 없으면 ABC 차등.
     *   newsvendor SL = Cu/(Cu+Co): Cu=품절 단위손실(마진), Co=단위 보유비용(보유율×원가×lead/365).
     *   비용 미제공 시 ABC 차등(A 98%/B 95%/C 90%) — 매출기여 상위에 더 높은 가용성.
     */
    private static function optimalZ(string $abc, ?float $cu, ?float $co): float
    {
        if ($cu !== null && $co !== null && ($cu + $co) > 1e-9) {
            return self::invNorm(max(0.5, min(0.999, $cu / ($cu + $co))));
        }
        return $abc === 'A' ? 2.05 : ($abc === 'B' ? 1.65 : 1.28);
    }

    /** 매출/수요 기여 기반 ABC 분류(Pareto): 누적 80%=A·95%=B·나머지=C. @param array<sku,float> $weight */
    private static function abcClassify(array $weight): array
    {
        arsort($weight);
        $total = array_sum($weight) ?: 1.0;
        $cum = 0.0; $cls = [];
        foreach ($weight as $sku => $w) {
            $cum += $w;
            $share = $cum / $total;
            $cls[$sku] = $share <= 0.8 ? 'A' : ($share <= 0.95 ? 'B' : 'C');
        }
        return $cls;
    }

    /* ─── GET /api/demand/forecast ─── */
    public static function forecastEndpoint(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        $tenant = self::tenant($req);
        $q = $req->getQueryParams();
        $horizon = max(1, min(90, (int)($q['horizon'] ?? 14)));
        $days    = max(14, min(365, (int)($q['days'] ?? 90)));
        $topN    = max(1, min(200, (int)($q['top'] ?? 50)));
        $lead    = max(1, min(60, (int)($q['lead'] ?? 7)));
        $skuFilter = isset($q['sku']) ? (string)$q['sku'] : '';
        // [246차] 비용기반 최적화 옵션(미제공 시 ABC 차등). holding_rate=연 보유율(기본 0.20).
        $holdingRate = max(0.0, min(2.0, (float)($q['holding_rate'] ?? 0.20)));

        $all = self::loadSeries($tenant, $days, $topN);
        if ($skuFilter !== '') $all = array_intersect_key($all, [$skuFilter => true]);

        // 1-pass: 예측 산출 + 매출/수요기여(ABC 가중치).
        $fcMap = []; $weight = [];
        foreach ($all as $sku => $info) {
            $fc = self::forecast($info['series'], $horizon);
            $fcMap[$sku] = $fc;
            $weight[$sku] = array_sum($fc['forecast']); // 수요량 기여(매출 컬럼 부재 → 수요 프록시)
        }
        $abc = self::abcClassify($weight); // [246차] Pareto ABC

        // 2-pass: ABC/비용기반 최적 z → 안전재고·재발주점.
        $items = [];
        foreach ($all as $sku => $info) {
            $fc = $fcMap[$sku];
            $sum = array_sum($fc['forecast']);
            $avgDaily = $horizon ? $sum / $horizon : 0;
            $cls = $abc[$sku] ?? 'C';
            // 비용기반 newsvendor: Cu=마진(원가 미상 시 null→ABC 폴백), Co=보유비용. 원가 부재라 ABC 차등 기본.
            $z = self::optimalZ($cls, null, null);
            $safety = round($z * $fc['sigma'] * sqrt($lead), 1);
            $reorder = round($avgDaily * $lead + $safety, 1);
            $items[] = [
                'sku'           => $sku,
                'name'          => $info['name'],
                'method'        => $fc['method'],
                'accuracy'      => $fc['accuracy'],
                'history_days'  => count($info['series']),
                'avg_daily'     => round($fc['avg'], 2),
                'forecast'      => $fc['forecast'],
                'forecast_sum'  => round($sum, 1),
                'abc_class'     => $cls,
                'service_level' => $cls === 'A' ? 98 : ($cls === 'B' ? 95 : 90),
                'safety_stock'  => $safety,
                'reorder_point' => $reorder,
            ];
        }
        usort($items, fn($a, $b) => $b['forecast_sum'] <=> $a['forecast_sum']);

        return self::json($res, [
            'ok' => true, 'tenant' => $tenant, 'horizon' => $horizon, 'lead_time' => $lead,
            'count' => count($items), 'items' => $items,
            'optimization' => 'abc-differentiated (A 98%/B 95%/C 90%)',
            '_env' => Db::envLabel(),
        ]);
    }

    /* ─── POST /api/demand/auto-replenish ─── [현 차수] 수요예측 자동발주.
       SKU별 reorder_point > 현재고(channel_inventory.available 합) → wms_supply_orders 'suggested' 자동 생성.
       멱등(open 발주 있으면 skip). 데모/운영 GENIE_ENV DB 격리. cron 또는 프론트 버튼으로 호출. */
    public static function autoReplenish(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        $tenant = self::tenant($req);
        if ($tenant === 'demo' || $tenant === '') return self::json($res, ['ok' => true, 'created' => 0, 'note' => 'demo/anon skip']);
        $b = (array)($req->getParsedBody() ?? []);
        $lead    = max(1, min(60, (int)($b['lead'] ?? 7)));
        $horizon = max(7, min(60, (int)($b['horizon'] ?? 14)));
        $created = self::autoReplenishForTenant($tenant, $lead, $horizon);
        return self::json($res, ['ok' => true, 'created' => count($created), 'orders' => $created, '_env' => Db::envLabel()]);
    }

    /** [255차 심화] 자동발주 코어(CLI/cron 공용) — 스케줄형 자동 재주문(Inventory Planner 정합). HTTP 핸들러와 공유(중복0). */
    public static function autoReplenishForTenant(string $tenant, int $lead = 7, int $horizon = 14): array
    {
        if ($tenant === 'demo' || $tenant === '') return [];
        $lead = max(1, min(60, $lead)); $horizon = max(7, min(60, $horizon));
        $pdo = self::db();
        // wms_supply_orders 보장 — SSOT: Db::ensureWmsSupplyOrders 로 일원화(종전 Wms 와 중복 제거, IF NOT EXISTS 멱등)
        Db::ensureWmsSupplyOrders($pdo);
        // [현 차수 잔여] ★현재고 SSOT = 물리재고(wms_stock.on_hand) 우선 — Wms::reflectChannelSale 이 채널 주문과
        //   라이브 판매를 '모두' wms_stock 에 차감하므로 이것이 진짜 현재고다. 기존 channel_inventory 만 읽으면
        //   라이브 판매(decInventory 미호출 경로)가 미반영돼 현재고 과대→reorder 과소→발주 부족이었다.
        //   WMS 미추적 SKU 는 channel_inventory 로 폴백(회귀 안전).
        $stockMap = [];
        try {
            $rs = $pdo->prepare("SELECT sku, SUM(available) av FROM channel_inventory WHERE tenant_id=? GROUP BY sku");
            $rs->execute([$tenant]);
            foreach ($rs->fetchAll(\PDO::FETCH_ASSOC) as $r) { if ($r['sku'] !== null && $r['sku'] !== '') $stockMap[(string)$r['sku']] = (float)$r['av']; }
        } catch (\Throwable $e) {}
        try {
            $rw = $pdo->prepare("SELECT sku, SUM(on_hand) oh FROM wms_stock WHERE tenant_id=? GROUP BY sku");
            $rw->execute([$tenant]);
            foreach ($rw->fetchAll(\PDO::FETCH_ASSOC) as $r) { if ($r['sku'] !== null && $r['sku'] !== '') $stockMap[(string)$r['sku']] = (float)$r['oh']; } // 물리 우선 덮어쓰기
        } catch (\Throwable $e) {}
        $all = self::loadSeries($tenant, 90, 200);
        // [255차 심화] 프로모 반응 — horizon 내 프로모(po_calendar)가 있는 SKU 는 수요 증폭(promo uplift) 반영해 사전 비축.
        //   uplift = 1 + 1.5×discount(가격탄력 보수 근사·최대 2.0). 프로모 없으면 1.0(기존동작 보존=회귀0). 크로스핸들러(PriceOpt).
        $promos = [];
        try { $promos = \Genie\Handlers\PriceOpt::promoWindows($tenant, $horizon); } catch (\Throwable $e) {}
        // [246차] ABC 차등 안전재고 — 1-pass 예측·가중치 → 분류.
        $fcMap = []; $weight = [];
        foreach ($all as $sku => $info) { $fc = self::forecast($info['series'], $horizon); $fcMap[$sku] = $fc; $weight[$sku] = array_sum($fc['forecast']); }
        $abc = self::abcClassify($weight);
        $created = []; $now = gmdate('Y-m-d H:i:s');
        $chk = $pdo->prepare("SELECT 1 FROM wms_supply_orders WHERE tenant_id=? AND sku=? AND status IN ('suggested','pending','ordered') LIMIT 1");
        $ins = $pdo->prepare("INSERT INTO wms_supply_orders (tenant_id,sku,name,qty,supplier,wh_id,status,eta,created_at,updated_at) VALUES (?,?,?,?,?,?,'suggested',?,?,?)");
        foreach ($all as $sku => $info) {
            $fc = $fcMap[$sku];
            $avgDaily = $horizon ? array_sum($fc['forecast']) / $horizon : 0;
            // [255차 심화] promo uplift — 프로모 예정 SKU 수요 증폭(사전 비축). 미해당=1.0(회귀0).
            if (isset($promos[(string)$sku])) { $avgDaily *= min(2.0, 1.0 + 1.5 * (float)$promos[(string)$sku]['discount']); }
            $zc       = self::optimalZ($abc[$sku] ?? 'C', null, null); // ABC 차등 서비스레벨
            $safety   = round($zc * $fc['sigma'] * sqrt($lead), 1);
            $reorder  = round($avgDaily * $lead + $safety, 1);
            if ($reorder <= 0) continue;
            $stock = $stockMap[(string)$sku] ?? 0;
            if ($stock >= $reorder) continue;                 // 충분 → skip
            $chk->execute([$tenant, (string)$sku]);
            if ($chk->fetchColumn()) continue;                 // open 발주 존재 → 멱등 skip
            $orderQty = max(1, (int)ceil($reorder * 2 - $stock)); // 리오더포인트 2배까지 보충
            $eta = gmdate('Y-m-d', time() + $lead * 86400);
            $ins->execute([$tenant, (string)$sku, (string)$info['name'], $orderQty, '', '', $eta, $now, $now]);
            $created[] = ['sku' => $sku, 'name' => $info['name'], 'qty' => $orderQty, 'reorder_point' => $reorder, 'stock' => $stock, 'eta' => $eta];
        }
        return $created;
    }

    /** [255차 심화] 자동발주 cron 팬아웃 — 재고/주문 데이터 보유 테넌트(데모 제외는 cron 에서). */
    public static function tenantsForReplenish(): array
    {
        try {
            $rs = self::db()->query("SELECT DISTINCT tenant_id FROM channel_inventory WHERE tenant_id IS NOT NULL AND tenant_id<>''");
            return array_values(array_filter(array_map('strval', $rs->fetchAll(\PDO::FETCH_COLUMN) ?: []), fn($t)=>$t!==''));
        } catch (\Throwable $e) { return []; }
    }

    /* ─── GET /api/demand/summary ─── */
    public static function summary(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        $tenant = self::tenant($req);
        $all = self::loadSeries($tenant, 90, 200);

        $forecastable = 0; $accs = []; $maxDays = 0;
        foreach ($all as $info) {
            $nonzero = count(array_filter($info['series'], fn($v) => $v > 0));
            $maxDays = max($maxDays, count($info['series']));
            if ($nonzero >= 4) {
                $forecastable++;
                $fc = self::forecast($info['series'], 7);
                if ($fc['accuracy'] > 0) $accs[] = $fc['accuracy'];
            }
        }
        return self::json($res, [
            'ok' => true, 'tenant' => $tenant,
            'skus_tracked'   => count($all),
            'forecastable'   => $forecastable,
            'avg_accuracy'   => $accs ? round(array_sum($accs) / count($accs), 1) : 0.0,
            'history_days'   => $maxDays,
            '_env' => Db::envLabel(),
        ]);
    }

    /* ─── GET /api/demand/seasonality ─── 요일 계절 지수 ─── */
    public static function seasonality(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        $tenant = self::tenant($req);
        $all = self::loadSeries($tenant, 90, 200);

        // 전 SKU 합산 일자 시계열 → 요일별 평균 지수
        $byDow = array_fill(0, 7, []);
        foreach ($all as $info) {
            foreach ($info['series'] as $i => $v) {
                $dow = (int)date('w', strtotime($info['dates'][$i]));
                $byDow[$dow][] = $v;
            }
        }
        $dowAvg = [];
        $grand = [];
        foreach ($byDow as $dow => $vals) { $dowAvg[$dow] = self::mean($vals); $grand = array_merge($grand, $vals); }
        $base = self::mean($grand) ?: 1.0;
        $labels = ['일','월','화','수','목','금','토'];
        $index = [];
        foreach ($dowAvg as $dow => $avg) {
            $index[] = ['dow' => $labels[$dow], 'avg' => round($avg, 2), 'index' => round($avg / $base, 3)];
        }
        return self::json($res, ['ok' => true, 'tenant' => $tenant, 'baseline' => round($base, 2), 'seasonality' => $index, '_env' => Db::envLabel()]);
    }

    /* ─── GET /api/demand/dead-stock — 재고 노후/악성재고 분석 (신규 net-new) ───
       현재고 보유(channel_inventory.available>0) SKU × 실 판매활동(channel_orders 취소제외)으로
       노후도(days_since_last_sale)·최근30일 판매속도·회전일수(days_of_supply)·묶인 자본을 산출해
       dead(임계일+ 무판매/미판매)/slow(그 이하 저회전)/healthy 로 분류하고 권장 액션을 제안한다.
       ★실 데이터만(가짜 0)·테넌트 스코프. 자본 = SKU 평균 판매단가(KRW 정규화된 unit_price) × 현재고.
       파라미터: ?dead_days=90&slow_days=30&top=200. */
    public static function deadStock(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        $tenant = self::tenant($req);
        $pdo    = self::db();
        $q        = $req->getQueryParams();
        $deadDays = max(30, min(365, (int)($q['dead_days'] ?? 90)));
        $slowDays = max(7,  min($deadDays - 1, (int)($q['slow_days'] ?? 30)));
        $top      = min(500, max(10, (int)($q['top'] ?? 200)));

        $today   = gmdate('Y-m-d');
        $todayTs = gmmktime(0, 0, 0, (int)substr($today, 5, 2), (int)substr($today, 8, 2), (int)substr($today, 0, 4));
        $d30     = gmdate('Y-m-d', $todayTs - 30 * 86400);

        // 1) 현재고 보유 SKU(합산 available>0)
        $inv = [];
        try {
            $rs = $pdo->prepare("SELECT sku, SUM(available) AS qty, MAX(product_name) AS name
                                   FROM channel_inventory
                                  WHERE tenant_id = :t AND sku IS NOT NULL AND sku <> ''
                                  GROUP BY sku HAVING SUM(available) > 0");
            $rs->execute([':t' => $tenant]);
            foreach ($rs->fetchAll(\PDO::FETCH_ASSOC) as $r) {
                $inv[(string)$r['sku']] = ['qty' => (float)$r['qty'], 'name' => (string)(($r['name'] ?? '') !== '' ? $r['name'] : $r['sku'])];
            }
        } catch (\Throwable $e) { $inv = []; }
        if (!$inv) {
            return self::json($res, ['ok' => true, 'tenant' => $tenant, 'items' => [], 'summary' =>
                ['in_stock_skus' => 0, 'healthy' => 0, 'slow' => 0, 'dead' => 0, 'total_tied_capital' => 0, 'dead_tied_capital' => 0, 'slow_tied_capital' => 0],
                'params' => ['dead_days' => $deadDays, 'slow_days' => $slowDays], '_env' => Db::envLabel()]);
        }

        // 2) SKU별 판매활동(취소/반품 제외 — loadSeries 와 동일 규칙): 최근판매일·30일 판매량·평균단가
        $sales = [];
        try {
            $st = $pdo->prepare("SELECT sku,
                                        MAX(SUBSTR(ordered_at,1,10)) AS last_sale,
                                        SUM(CASE WHEN SUBSTR(ordered_at,1,10) >= :d30 THEN qty ELSE 0 END) AS qty30,
                                        AVG(CASE WHEN unit_price > 0 THEN unit_price ELSE NULL END) AS avg_price
                                   FROM channel_orders
                                  WHERE tenant_id = :t AND sku IS NOT NULL AND sku <> ''
                                    AND (event_type IS NULL OR event_type = 'order')
                                  GROUP BY sku");
            $st->execute([':t' => $tenant, ':d30' => $d30]);
            foreach ($st->fetchAll(\PDO::FETCH_ASSOC) as $r) $sales[(string)$r['sku']] = $r;
        } catch (\Throwable $e) { $sales = []; }

        // [272차 D-P2] 묶인 자본(tied_capital)은 재고에 묶인 '매입원가(cost basis)' 여야 한다. 기존엔 판매단가(retail
        //   AVG unit_price)로 산정해 마진율만큼 과대(예 원가5천/판매1.5만=3배). Rollup 이 gross_profit 에 쓰는
        //   PriceOpt::costMap(원가 SSOT)을 재사용 — 원가 미등록 SKU 만 판매가로 폴백(정직 라벨 cost_src).
        $costMap = [];
        try { $costMap = \Genie\Handlers\PriceOpt::costMap($tenant); } catch (\Throwable $e) { $costMap = []; }

        // 3) SKU별 노후도 분류
        $items = [];
        $sum = ['in_stock_skus' => count($inv), 'healthy' => 0, 'slow' => 0, 'dead' => 0,
                'total_tied_capital' => 0.0, 'dead_tied_capital' => 0.0, 'slow_tied_capital' => 0.0];
        foreach ($inv as $sku => $iv) {
            $s        = $sales[$sku] ?? null;
            $lastSale = $s && $s['last_sale'] ? (string)$s['last_sale'] : '';
            $qty30    = $s ? (int)$s['qty30'] : 0;
            $avgPrice = $s && $s['avg_price'] !== null ? (float)$s['avg_price'] : 0.0;
            $qty      = $iv['qty'];
            // [272차 D-P2] 원가 우선(cost basis), 미등록 SKU 만 판매가 폴백.
            $cost     = isset($costMap[$sku]) && (float)$costMap[$sku] > 0 ? (float)$costMap[$sku] : 0.0;
            $unitBase = $cost > 0 ? $cost : $avgPrice;
            $tied     = round($qty * $unitBase);

            if ($lastSale !== '' && preg_match('/^\d{4}-\d{2}-\d{2}$/', $lastSale)) {
                $lsTs      = gmmktime(0, 0, 0, (int)substr($lastSale, 5, 2), (int)substr($lastSale, 8, 2), (int)substr($lastSale, 0, 4));
                $daysSince = (int)floor(($todayTs - $lsTs) / 86400);
            } else {
                $daysSince = -1; // 미판매(판매 이력 없음) = 최악의 노후
            }

            // 분류: 미판매 또는 dead_days 이상 무판매 = dead / slow_days 이상 또는 최근30일 무판매 = slow / 그 외 healthy
            if ($daysSince === -1 || $daysSince >= $deadDays) $cls = 'dead';
            elseif ($daysSince >= $slowDays || $qty30 === 0)  $cls = 'slow';
            else                                             $cls = 'healthy';

            $sum[$cls]++;
            $sum['total_tied_capital'] += $tied;
            if ($cls === 'dead') $sum['dead_tied_capital'] += $tied;
            if ($cls === 'slow') $sum['slow_tied_capital'] += $tied;

            if ($cls === 'healthy') continue; // 액션 대상(dead/slow)만 목록화

            // 회전일수(days of supply): 최근30일 속도 기준. 속도 0 = 무한(∞).
            $daysOfSupply = $qty30 > 0 ? (int)round($qty / ($qty30 / 30.0)) : null;
            $action = $cls === 'dead'
                ? ($daysSince === -1 ? 'liquidate_never_sold' : 'liquidate_or_markdown')
                : 'promote_or_bundle';
            $items[] = [
                'sku' => $sku, 'name' => $iv['name'], 'class' => $cls,
                'on_hand' => (int)$qty, 'last_sale' => $lastSale ?: null,
                'days_since_sale' => $daysSince === -1 ? null : $daysSince,
                'sold_30d' => $qty30, 'avg_price' => round($avgPrice),
                'unit_cost' => round($unitBase), 'cost_src' => ($cost > 0 ? 'cost' : 'retail_fallback'),
                'tied_capital' => $tied, 'days_of_supply' => $daysOfSupply, 'action' => $action,
            ];
        }
        // 묶인 자본 큰 순(자본 회수 우선순위)
        usort($items, fn($a, $b) => $b['tied_capital'] <=> $a['tied_capital']);
        $items = array_slice($items, 0, $top);
        foreach (['total_tied_capital', 'dead_tied_capital', 'slow_tied_capital'] as $k) $sum[$k] = round($sum[$k]);

        return self::json($res, ['ok' => true, 'tenant' => $tenant, 'items' => $items, 'summary' => $sum,
            'params' => ['dead_days' => $deadDays, 'slow_days' => $slowDays], '_env' => Db::envLabel()]);
    }
}
