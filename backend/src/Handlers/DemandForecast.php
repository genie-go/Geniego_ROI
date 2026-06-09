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
        $n = count($y);
        $avg = max(0.0, self::mean($y));
        if ($n < 4) {
            $f = array_fill(0, $horizon, round($avg, 2));
            return ['method' => 'mean', 'forecast' => $f, 'accuracy' => 0.0, 'sigma' => self::stddev($y), 'avg' => $avg];
        }
        if ($n >= 2 * $season) return self::holtWinters($y, $horizon, $season);
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
        $z = 1.65; // 서비스레벨 95%

        $all = self::loadSeries($tenant, $days, $topN);
        if ($skuFilter !== '') $all = array_intersect_key($all, [$skuFilter => true]);

        $items = [];
        foreach ($all as $sku => $info) {
            $fc = self::forecast($info['series'], $horizon);
            $sum = array_sum($fc['forecast']);
            $avgDaily = $horizon ? $sum / $horizon : 0;
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
                'safety_stock'  => $safety,
                'reorder_point' => $reorder,
            ];
        }
        usort($items, fn($a, $b) => $b['forecast_sum'] <=> $a['forecast_sum']);

        return self::json($res, [
            'ok' => true, 'tenant' => $tenant, 'horizon' => $horizon, 'lead_time' => $lead,
            'count' => count($items), 'items' => $items, '_env' => Db::env(),
        ]);
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
            '_env' => Db::env(),
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
        return self::json($res, ['ok' => true, 'tenant' => $tenant, 'baseline' => round($base, 2), 'seasonality' => $index, '_env' => Db::env()]);
    }
}
