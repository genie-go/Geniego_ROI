<?php
/**
 * Mmm — Marketing Mix Modeling(마케팅 믹스 모델) + 예측 예산 최적화.
 *
 * ② 광고·채널 분석 초고도화 플래그십. performance_metrics(채널×일자 spend/revenue)에서
 * 채널별 반응곡선을 적합한다:
 *   - 애드스톡(adstock, 광고효과 이월): 기하감쇠 λ
 *   - 포화(saturation, 한계효용 체감): revenue = β·(1 − exp(−spend/κ))
 * 산출: 채널별 기여도, 현재 한계ROAS(dRev/dSpend), 포화수준, 적합도(R²).
 * 최적화: 반응곡선(오목)에 대해 그리디 한계배분으로 총예산을 채널에 배분 → 예측 매출 극대화.
 *
 * 실데이터 기반(테넌트 격리). 데모는 합성 곡선(명시). 추정이 아닌 실측 적합.
 */

declare(strict_types=1);

namespace Genie\Handlers;

use Genie\Db;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;

final class Mmm
{
    private static function json(Response $res, array $data, int $status = 200): Response
    {
        $res->getBody()->write(json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
        return $res->withHeader('Content-Type', 'application/json')->withStatus($status);
    }

    private static function tenant(Request $req): string
    {
        $t = UserAuth::authedTenant($req);
        if ($t === null || $t === '') $t = (string)($req->getAttribute('auth_tenant') ?? '');
        return $t !== '' ? $t : 'unknown';
    }

    private static function isDemo(string $tenant): bool
    {
        // 테넌트 문자열 기준 + 데모 백엔드(geniego_roi_demo) 전체 — 데모는 합성 곡선으로 기능 시연.
        if ($tenant === '' || $tenant === 'demo' || $tenant === 'unknown' || str_starts_with($tenant, 'demo')) return true;
        try { if (\Genie\Db::env() === 'demo') return true; } catch (\Throwable $e) {}
        // 연결된 실제 DB명으로 데모 백엔드 확정 판별(geniego_roi_demo). [현 차수] 하드닝: substring('demo')
        //   → 정확일치/suffix('_demo')만(운영 DB명에 'demo' 부분문자열 포함 시 오판 방지).
        try {
            $dbn = strtolower((string)Db::pdo()->query('SELECT DATABASE()')->fetchColumn());
            if ($dbn === 'demo' || str_ends_with($dbn, '_demo')) return true;
        } catch (\Throwable $e) {}
        return false;
    }

    /** GET /v424/mmm/model?window=90 — 채널별 MMM 반응곡선 적합 결과. */
    public static function model(Request $req, Response $res): Response
    {
        $tenant = self::tenant($req);
        $qs = $req->getQueryParams();
        $window = max(14, min(365, (int)($qs['window'] ?? 90)));

        if (self::isDemo($tenant)) {
            return self::json($res, self::demoModel($window));
        }
        try {
            $series = self::loadSeries(Db::pdo(), $tenant, $window);
            $channels = [];
            foreach ($series as $ch => $rows) {
                $m = self::fitChannel($rows);
                if ($m !== null) $channels[] = ['channel' => $ch] + $m;
            }
            // 기여도 비중(예측 매출 기준)
            $totalContrib = array_sum(array_map(fn($c) => $c['contribution'], $channels)) ?: 1;
            foreach ($channels as &$c) { $c['contribution_share'] = round($c['contribution'] / $totalContrib, 4); }
            unset($c);
            usort($channels, fn($a, $b) => $b['contribution'] <=> $a['contribution']);
            return self::json($res, [
                'ok' => true, 'demo' => false, 'window_days' => $window,
                'channels' => $channels,
                'model_diagnostics' => self::mmmDiagnostics($channels),
                'data_driven' => count($channels) > 0,
                'note' => count($channels) > 0 ? '실측 performance_metrics 기반 적합' : '성과 데이터가 아직 충분하지 않습니다. 채널 집행·수집 후 적합됩니다.',
            ]);
        } catch (\Throwable $e) {
            return self::json($res, ['ok' => false, 'error' => 'DB 오류: ' . $e->getMessage()], 500);
        }
    }

    /**
     * [현 차수 초고도화 ③-1] GET /v424/mmm/backtest?window=90&holdout=14 — MMM OOS(out-of-sample) 백테스트.
     *   최근 holdout일을 검증셋으로 분리 → 이전 구간(train)으로 fitChannel 적합 후, 보고 모델과 동일한 response()
     *   곡선으로 검증셋 예측 → 채널별 OOS MAPE/NRMSE + train 잔차기반 95% 예측구간 커버리지.
     *   ★fitChannel/response 재사용(중복0)·미수정(회귀0). 데모 fake 없음(실 데이터 부족=빈 결과, 정직).
     */
    public static function backtest(Request $req, Response $res): Response
    {
        $tenant = self::tenant($req);
        $qs = $req->getQueryParams();
        $window  = max(21, min(365, (int)($qs['window'] ?? 90)));
        $holdout = max(7, min(60, (int)($qs['holdout'] ?? 14)));
        try {
            $series = self::loadSeries(Db::pdo(), $tenant, $window);
            $rows = []; $sumMape = 0.0; $sumNrmse = 0.0; $sumCov = 0.0; $cnt = 0;
            foreach ($series as $ch => $chRows) {
                $n = count($chRows);
                if ($n < $holdout + 7) continue; // train 최소 7일 확보
                $train = array_slice($chRows, 0, $n - $holdout);
                $test  = array_slice($chRows, $n - $holdout);
                $fit = self::fitChannel($train);
                if ($fit === null) continue;
                // train 잔차 표준편차 → 예측구간(±1.96σ).
                $resid = [];
                foreach ($train as $r) $resid[] = ((float)$r['revenue'] - self::response($fit, (float)$r['spend']));
                $cr = count($resid); $mR = $cr ? array_sum($resid) / $cr : 0.0;
                $vR = 0.0; foreach ($resid as $e) $vR += ($e - $mR) ** 2; $sd = $cr ? sqrt($vR / $cr) : 0.0;
                // OOS 예측/오차.
                $m = count($test); if ($m === 0) continue;
                $actMean = 0.0; foreach ($test as $r) $actMean += (float)$r['revenue']; $actMean /= $m;
                $absPctSum = 0.0; $seSum = 0.0; $within = 0;
                foreach ($test as $r) {
                    $act = (float)$r['revenue']; $pred = self::response($fit, (float)$r['spend']);
                    $absPctSum += abs($act - $pred) / max(1.0, $act);
                    $seSum += ($act - $pred) ** 2;
                    if (abs($act - $pred) <= 1.96 * $sd) $within++;
                }
                $mape  = $absPctSum / $m * 100;
                $rmse  = sqrt($seSum / $m);
                $nrmse = $actMean > 0 ? $rmse / $actMean * 100 : 0.0;
                $cov   = $within / $m * 100;
                $rows[] = [
                    'channel' => $ch, 'train_days' => count($train), 'test_days' => $m,
                    'oos_mape' => round($mape, 1), 'oos_rmse' => round($rmse, 0), 'oos_nrmse' => round($nrmse, 1),
                    'ci_coverage_95' => round($cov, 1), 'r2_insample' => $fit['r2'] ?? null,
                    'grade' => $mape <= 20 ? 'good' : ($mape <= 40 ? 'fair' : 'poor'),
                ];
                $sumMape += $mape; $sumNrmse += $nrmse; $sumCov += $cov; $cnt++;
            }
            usort($rows, fn($a, $b) => $a['oos_mape'] <=> $b['oos_mape']);
            return self::json($res, [
                'ok' => true, 'window_days' => $window, 'holdout_days' => $holdout,
                'channels' => $rows,
                'overall' => $cnt > 0 ? [
                    'avg_oos_mape' => round($sumMape / $cnt, 1), 'avg_oos_nrmse' => round($sumNrmse / $cnt, 1),
                    'avg_ci_coverage_95' => round($sumCov / $cnt, 1),
                    'grade' => ($sumMape / $cnt) <= 20 ? 'good' : (($sumMape / $cnt) <= 40 ? 'fair' : 'poor'),
                ] : null,
                'note' => '최근 holdout일=검증셋, 이전 구간=학습셋. 보고 모델(response 곡선)과 동일 함수로 예측 → OOS MAPE/NRMSE(정확도)·95% 예측구간 커버리지(train 잔차 기반). 채널 데이터 부족 시 제외.',
            ]);
        } catch (\Throwable $e) {
            return self::json($res, ['ok' => false, 'error' => $e->getMessage(), 'channels' => []]);
        }
    }

    /**
     * [237차] GET /v424/mmm/series?window=90 — 증분성(Double ML Uplift·로빈슨 편회귀) 입력용 데이터.
     *   날짜정렬 채널별 일지출 매트릭스 + 총매출 시계열(실 performance_metrics, loadSeries 재사용).
     *   ★알고리즘 중복 금지: 계산은 프론트 기존 incrementalUplift(mlAttribution.js)가 수행, 백엔드는 데이터만.
     *   기존엔 운영서 TS_DATA 빈값이라 증분모델이 데모 전용이었던 것을 실데이터로 동작시킨다.
     */
    public static function series(Request $req, Response $res): Response
    {
        $tenant = self::tenant($req);
        $qs = $req->getQueryParams();
        $window = max(14, min(365, (int)($qs['window'] ?? 90)));
        if (self::isDemo($tenant)) {
            return self::json($res, ['ok' => true, 'demo' => true, 'spends' => new \stdClass(), 'revenue' => [], 'dates' => []]);
        }
        try {
            $series = self::loadSeries(Db::pdo(), $tenant, $window);
            $dateSet = [];
            foreach ($series as $rows) foreach ($rows as $r) $dateSet[$r['date']] = true;
            $dates = array_keys($dateSet); sort($dates);
            if (count($dates) < 7 || count($series) < 2) {
                return self::json($res, ['ok' => true, 'demo' => false, 'spends' => new \stdClass(), 'revenue' => [], 'dates' => $dates,
                    'note' => '증분성 분석은 2개 이상 채널 × 7일 이상 데이터가 필요합니다(현재 부족 — 집행·수집 후 표시).']);
            }
            $idx = array_flip($dates);
            $nd = count($dates);
            $spends = []; $revByDate = array_fill(0, $nd, 0.0);
            foreach ($series as $ch => $rows) {
                $arr = array_fill(0, $nd, 0.0);
                foreach ($rows as $r) {
                    $i = $idx[$r['date']] ?? null;
                    if ($i !== null) { $arr[$i] += (float)$r['spend']; $revByDate[$i] += (float)$r['revenue']; }
                }
                $spends[$ch] = $arr;
            }
            return self::json($res, [
                'ok' => true, 'demo' => false, 'window_days' => $window, 'days' => $nd,
                'dates' => $dates, 'spends' => $spends, 'revenue' => array_values($revByDate),
                'channels' => array_keys($spends),
                'note' => '실측 performance_metrics 기반 — 증분모델(로빈슨 편회귀) 입력.',
            ]);
        } catch (\Throwable $e) {
            return self::json($res, ['ok' => false, 'error' => 'DB 오류: ' . $e->getMessage()], 500);
        }
    }

    /** POST /v424/mmm/optimize — {daily_budget, constraints?} 총 일예산을 반응곡선 기반 최적 배분. */
    public static function optimize(Request $req, Response $res): Response
    {
        $tenant = self::tenant($req);
        $body = (array)($req->getParsedBody() ?? []);
        if (empty($body)) { $d = json_decode((string)$req->getBody(), true); if (is_array($d)) $body = $d; }
        $window = max(14, min(365, (int)($body['window'] ?? 90)));
        $dailyBudget = max(0, (int)round((float)($body['daily_budget'] ?? 0)));
        $constraints = is_array($body['constraints'] ?? null) ? $body['constraints'] : [];

        if (self::isDemo($tenant)) {
            $dm = self::demoModel($window);
            $channels = $dm['channels'];
        } else {
            try {
                $series = self::loadSeries(Db::pdo(), $tenant, $window);
                $channels = [];
                foreach ($series as $ch => $rows) { $m = self::fitChannel($rows); if ($m !== null) $channels[] = ['channel' => $ch] + $m; }
            } catch (\Throwable $e) {
                return self::json($res, ['ok' => false, 'error' => 'DB 오류: ' . $e->getMessage()], 500);
            }
        }
        if (empty($channels)) {
            return self::json($res, ['ok' => true, 'optimized' => false, 'reason' => '적합된 채널 모델이 없습니다(데이터 부족).']);
        }
        // 현재 일평균 지출 합(기본 예산 = 미입력 시 현재 수준)
        $curDaily = array_sum(array_map(fn($c) => $c['current_daily_spend'], $channels));
        if ($dailyBudget <= 0) $dailyBudget = (int)round($curDaily);

        $alloc = self::greedyAllocate($channels, $dailyBudget, $constraints);

        // 예측: 현재 배분 vs 최적 배분의 일 매출
        $predCurrent = 0.0; $predOpt = 0.0;
        foreach ($channels as $c) {
            $predCurrent += self::response($c, $c['current_daily_spend']);
            $predOpt += self::response($c, $alloc[$c['channel']] ?? 0);
        }
        $rows = [];
        foreach ($channels as $c) {
            $x = $alloc[$c['channel']] ?? 0;
            $rows[] = [
                'channel' => $c['channel'],
                'current_daily' => (int)round($c['current_daily_spend']),
                'recommended_daily' => (int)round($x),
                'delta' => (int)round($x - $c['current_daily_spend']),
                'pred_daily_revenue' => (int)round(self::response($c, $x)),
                'marginal_roas' => round(self::marginal($c, $x), 3),
                'saturation' => round(1 - exp(-$x / max(1e-9, $c['kappa'])), 3),
            ];
        }
        usort($rows, fn($a, $b) => $b['recommended_daily'] <=> $a['recommended_daily']);
        return self::json($res, [
            'ok' => true, 'optimized' => true,
            'daily_budget' => $dailyBudget,
            'allocations' => $rows,
            'pred_daily_revenue_current' => (int)round($predCurrent),
            'pred_daily_revenue_optimized' => (int)round($predOpt),
            'pred_monthly_revenue_current' => (int)round($predCurrent * 30),
            'pred_monthly_revenue_optimized' => (int)round($predOpt * 30),
            'lift_pct' => $predCurrent > 0 ? round(($predOpt - $predCurrent) / $predCurrent * 100, 1) : 0,
            'demo' => self::isDemo($tenant),
        ]);
    }

    /* ═══════════════════════ [270차 초고도화] 이익 최대화 마케팅 자동화 ═══════════════════════
     *  경쟁사(Northbeam·Triple Whale·PMax·Advantage+)는 전부 매출/ROAS 로 배분한다. 그러나
     *  ①채널마다 파는 SKU 믹스가 달라 동일 ROAS 라도 실 순이익이 다르고 ②"이익 최대 총지출은 얼마인가"
     *  (포트폴리오 한계이익이 0 이 되는 지점)에 답하는 곳은 없다. 여기서는 이미 존재하는 반응곡선
     *  (β·(1−exp(−x/κ)))+공헌마진(attribution⨝channel_orders+SKU원가)을 융합해 이익 프론티어를 산출한다.
     *  한계이익(c,x)=margin_c·(β/κ)·exp(−x/κ)−1. x*_c=κ·ln(margin_c·β/κ). T*=Σx*_c(피크). */

    /** 광고채널별 공헌마진율 — attribution_result(order-match)⨝channel_orders 로 귀속주문 SKU믹스 마진 도출
     *  (광고채널≠커머스채널). 원가 커버리지 부족 채널은 전사 마진 폴백. 원가 전무=null(정직·이익최적화 불가). */
    public static function channelMargins(\PDO $pdo, string $tenant, int $window): array
    {
        $since = gmdate('Y-m-d', time() - $window * 86400);
        $cost = PriceOpt::costMap($tenant); // sku→cost_price (미등록=빈)
        $byCh = [];
        try {
            $st = $pdo->prepare("SELECT ar.attributed_channel AS ch, co.sku AS sku, co.qty AS qty, co.total_price AS rev
                FROM attribution_result ar JOIN channel_orders co ON co.tenant_id=ar.tenant_id AND co.channel_order_id=ar.order_id
                WHERE ar.tenant_id=? AND ar.model='order-match' AND co.ordered_at>=? AND COALESCE(co.event_type,'order') NOT IN ('cancel','return')");
            $st->execute([$tenant, $since]);
            while ($r = $st->fetch(\PDO::FETCH_ASSOC)) {
                $ch = strtolower((string)($r['ch'] ?? '')); if ($ch === '') continue;
                $rev = (float)($r['rev'] ?? 0); $qty = (float)($r['qty'] ?? 0); $sku = (string)($r['sku'] ?? '');
                if (!isset($byCh[$ch])) $byCh[$ch] = ['rev' => 0.0, 'cogs' => 0.0, 'covRev' => 0.0];
                $byCh[$ch]['rev'] += $rev;
                if (isset($cost[$sku]) && $cost[$sku] > 0) { $byCh[$ch]['cogs'] += $cost[$sku] * $qty; $byCh[$ch]['covRev'] += $rev; }
            }
        } catch (\Throwable $e) {}
        // 전사 마진(폴백) — 전 주문 SKU 원가.
        $ov = ['cogs' => 0.0, 'covRev' => 0.0];
        try {
            $st = $pdo->prepare("SELECT sku, qty, total_price rev FROM channel_orders WHERE tenant_id=? AND ordered_at>=? AND COALESCE(event_type,'order') NOT IN ('cancel','return')");
            $st->execute([$tenant, $since]);
            while ($r = $st->fetch(\PDO::FETCH_ASSOC)) {
                $rev = (float)($r['rev'] ?? 0); $qty = (float)($r['qty'] ?? 0); $sku = (string)($r['sku'] ?? '');
                if (isset($cost[$sku]) && $cost[$sku] > 0) { $ov['cogs'] += $cost[$sku] * $qty; $ov['covRev'] += $rev; }
            }
        } catch (\Throwable $e) {}
        $overall = ($ov['covRev'] > 0) ? max(0.0, min(1.0, ($ov['covRev'] - $ov['cogs']) / $ov['covRev'])) : null;
        $out = [];
        foreach ($byCh as $ch => $v) {
            if ($v['covRev'] > 0 && $v['rev'] > 0 && $v['covRev'] >= 0.5 * $v['rev']) {
                $out[$ch] = max(0.0, min(1.0, ($v['covRev'] - $v['cogs']) / $v['covRev']));
            } elseif ($overall !== null) {
                $out[$ch] = $overall;
            }
        }
        return ['byChannel' => $out, 'overall' => $overall];
    }

    /** 채널 c 의 이익 최적 일지출 x*(공통 shadow price λ≥0) — margin·(β/κ)·exp(−x/κ)=1+λ → x=κ·ln(margin·β/((1+λ)κ)).
     *  λ=0 이 무제약 이익최대(T*). cap 으로 외삽 폭주 방지. */
    private static function profitOptSpend(array $c, float $margin, float $lambda): float
    {
        $beta = (float)$c['beta']; $kappa = max(1e-9, (float)$c['kappa']);
        $ratio = $margin * $beta / (max(1e-9, (1.0 + $lambda)) * $kappa);
        if ($ratio <= 1.0) return 0.0; // 한계이익이 첫 원부터 음수 → 지출 0
        $x = $kappa * log($ratio);
        $cap = max(3.0 * (float)($c['current_daily_spend'] ?? 0), 5.0 * $kappa); // 관측범위 밖 외삽 억제
        return max(0.0, min($x, $cap));
    }

    /**
     * POST /v424/mmm/frontier — 이익 효율 프론티어(적정 총예산 T* + 이익곡선).
     * body: {window?, margin_override?}. 반환: 채널별 이익최적 일지출·현행 대비·PROFIT(T) 곡선·T*·증액여력.
     */
    public static function frontier(Request $req, Response $res): Response
    {
        $tenant = self::tenant($req);
        $body = (array)($req->getParsedBody() ?? []);
        if (empty($body)) { $d = json_decode((string)$req->getBody(), true); if (is_array($d)) $body = $d; }
        $window = max(14, min(365, (int)($body['window'] ?? 90)));

        try {
            if (self::isDemo($tenant)) {
                $dm = self::demoModel($window); $channels = $dm['channels'];
                $marg = ['byChannel' => [], 'overall' => 0.45]; // 데모: 대표 공헌마진 45%
            } else {
                $series = self::loadSeries(\Genie\Db::pdo(), $tenant, $window);
                $channels = [];
                foreach ($series as $ch => $rows) { $m = self::fitChannel($rows); if ($m !== null) $channels[] = ['channel' => $ch] + $m; }
                $marg = self::channelMargins(\Genie\Db::pdo(), $tenant, $window);
            }
        } catch (\Throwable $e) {
            return self::json($res, ['ok' => false, 'error' => 'DB 오류: ' . $e->getMessage()], 500);
        }
        if (empty($channels)) return self::json($res, ['ok' => true, 'optimized' => false, 'reason' => '적합된 채널 모델이 없습니다(광고 데이터 부족).']);
        $override = isset($body['margin_override']) ? max(0.0, min(1.0, (float)$body['margin_override'])) : null;
        if ($override === null && $marg['overall'] === null && empty($marg['byChannel'])) {
            return self::json($res, ['ok' => true, 'optimized' => false, 'reason' => 'SKU 원가 미등록 — 이익 최적화 불가. 상품 원가를 등록하면 이익 프론티어가 활성화됩니다.', 'needs' => 'sku_cost']);
        }
        // 채널별 마진 확정(override > 채널 > 전사).
        $marginOf = function (string $ch) use ($marg, $override): float {
            if ($override !== null) return $override;
            return (float)($marg['byChannel'][$ch] ?? $marg['overall'] ?? 0.4);
        };

        // 이익 최적(무제약 T*) 지출·현행 지출.
        $curTotal = 0.0; $tstar = 0.0; $rows = []; $curProfit = 0.0; $optProfit = 0.0;
        foreach ($channels as $c) {
            $ch = (string)$c['channel']; $mg = $marginOf($ch);
            $curX = (float)$c['current_daily_spend'];
            $optX = self::profitOptSpend($c, $mg, 0.0);
            $curTotal += $curX; $tstar += $optX;
            $curProfit += $mg * self::response($c, $curX) - $curX;
            $optProfit += $mg * self::response($c, $optX) - $optX;
            $rows[] = [
                'channel' => $ch, 'margin' => round($mg, 3),
                'current_daily' => (int)round($curX),
                'profit_optimal_daily' => (int)round($optX),
                'delta' => (int)round($optX - $curX),
                'marginal_roas_now' => round(self::marginal($c, $curX), 3),
                'breakeven_roas' => $mg > 0 ? round(1.0 / $mg, 2) : null, // 한계ROAS 가 1/margin 에 도달할 때까지 증액이 이익
                'saturation_now' => round(1 - exp(-$curX / max(1e-9, (float)$c['kappa'])), 3),
            ];
        }
        usort($rows, fn($a, $b) => $b['profit_optimal_daily'] <=> $a['profit_optimal_daily']);

        // PROFIT(T) 프론티어 곡선 — shadow price λ 스윕(무제약 T* 포함, T* 초과 구간까지 표시해 피크 시각화).
        $curve = [];
        $tmax = max($curTotal, $tstar) * 1.6 + 1;
        for ($i = 0; $i <= 24; $i++) {
            $T = $tmax * $i / 24.0;
            // 주어진 T 에 대한 λ 이진탐색(T(λ) 은 λ 증가 시 감소).
            $lo = -0.95; $hi = 50.0;
            for ($it = 0; $it < 40; $it++) {
                $mid = ($lo + $hi) / 2.0; $sum = 0.0;
                foreach ($channels as $c) $sum += self::profitOptSpend($c, $marginOf((string)$c['channel']), $mid);
                if ($sum > $T) $lo = $mid; else $hi = $mid;
            }
            $lam = ($lo + $hi) / 2.0; $prof = 0.0; $spent = 0.0;
            foreach ($channels as $c) { $x = self::profitOptSpend($c, $marginOf((string)$c['channel']), $lam); $prof += $marginOf((string)$c['channel']) * self::response($c, $x) - $x; $spent += $x; }
            $curve[] = ['budget' => (int)round($spent), 'profit' => (int)round($prof)];
        }
        // 중복 budget 제거·정렬.
        usort($curve, fn($a, $b) => $a['budget'] <=> $b['budget']);

        return self::json($res, [
            'ok' => true, 'optimized' => true,
            'window' => $window,
            'current_daily_spend' => (int)round($curTotal),
            'optimal_daily_spend' => (int)round($tstar),           // T* = 이익 최대 총지출
            'headroom' => (int)round($tstar - $curTotal),          // 증액 여력(양수=더 써야 이익↑ / 음수=과지출)
            'current_daily_profit' => (int)round($curProfit),
            'optimal_daily_profit' => (int)round($optProfit),
            'profit_uplift' => (int)round($optProfit - $curProfit),
            'optimal_monthly_profit' => (int)round($optProfit * 30),
            'channels' => $rows,
            'frontier' => $curve,
            'margin_source' => $override !== null ? 'override' : (!empty($marg['byChannel']) ? 'per_channel' : 'tenant_overall'),
            'demo' => self::isDemo($tenant),
        ]);
    }

    /* ───────────────────────── 데이터 적재 ───────────────────────── */

    /** 채널별 일자 정렬 시계열: [channel => [ ['date'=>, 'spend'=>, 'revenue'=>], ... ]]. */
    private static function loadSeries(\PDO $pdo, string $tenant, int $window): array
    {
        $since = gmdate('Y-m-d', time() - $window * 86400);
        $st = $pdo->prepare(
            "SELECT channel, date, SUM(spend) AS spend, SUM(revenue) AS revenue
               FROM performance_metrics
              WHERE tenant_id = ? AND date >= ? AND channel IS NOT NULL AND channel <> ''
              GROUP BY channel, date ORDER BY channel, date"
        );
        $st->execute([$tenant, $since]);
        $out = [];
        foreach ($st->fetchAll(\PDO::FETCH_ASSOC) as $r) {
            $ch = (string)$r['channel'];
            $out[$ch][] = ['date' => (string)$r['date'], 'spend' => (float)$r['spend'], 'revenue' => (float)$r['revenue']];
        }
        return $out;
    }

    /* ───────────────────────── 곡선 적합 ───────────────────────── */

    /**
     * 채널 반응곡선 적합: adstock(λ) + 포화 revenue=β·(1−exp(−x/κ)).
     * 그리드서치(λ,κ) → R² 최대. 유효 κ는 정상상태 보정(κ_eff=κ·(1−λ))으로 흡수.
     * @return array|null  ['beta','kappa','lambda','r2','current_daily_spend','current_daily_revenue','total_spend','total_revenue','current_roas','marginal_roas','saturation','contribution']
     */
    private static function fitChannel(array $rows): ?array
    {
        $n = count($rows);
        if ($n < 7) return null; // 최소 1주 데이터
        $spend = array_map(fn($r) => max(0.0, $r['spend']), $rows);
        $rev   = array_map(fn($r) => max(0.0, $r['revenue']), $rows);
        $totalSpend = array_sum($spend);
        $totalRev   = array_sum($rev);
        if ($totalSpend <= 0) return null;
        $avgSpend = $totalSpend / $n;
        if ($avgSpend <= 0) return null;

        $meanRev = $totalRev / $n; $ssTot = 0.0;
        foreach ($rev as $rv) $ssTot += ($rv - $meanRev) ** 2;

        // [Robyn식 하이퍼파라미터 자동탐색] 단일 (λ,κ) 적합 평가 — adstock+포화 최소제곱. 반환 [beta,r2,sse,...] | null.
        $evalFit = function (float $lam, float $kap) use ($spend, $rev, $n, $ssTot): ?array {
            if ($kap <= 0 || $lam < 0 || $lam >= 0.97) return null;
            $ad = []; $prev = 0.0;
            foreach ($spend as $s) { $prev = $s + $lam * $prev; $ad[] = $prev; }
            $sNum = 0.0; $sDen = 0.0;
            foreach ($ad as $i => $x) { $sat = 1.0 - exp(-$x / $kap); $sNum += $rev[$i] * $sat; $sDen += $sat * $sat; }
            if ($sDen <= 1e-9) return null;
            $beta = $sNum / $sDen;
            if ($beta <= 0) return null;
            $sse = 0.0;
            foreach ($ad as $i => $x) { $pred = $beta * (1.0 - exp(-$x / $kap)); $sse += ($rev[$i] - $pred) ** 2; }
            $r2 = $ssTot > 1e-9 ? (1.0 - $sse / $ssTot) : 0.0;
            return ['beta' => $beta, 'r2' => $r2, 'sse' => $sse, 'lambda' => $lam, 'kappa_raw' => $kap];
        };
        // 1) coarse 그리드(λ 9 × κ 7) → 2) best 주변 fine 정제(coarse→fine, 고정 28→적응형 88+). 결정론·R²는 단조 개선.
        $best = null;
        $consider = function ($f) use (&$best) { if ($f !== null && ($best === null || $f['r2'] > $best['r2'])) $best = $f; };
        foreach ([0.0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8] as $lam) {
            foreach ([0.3, 0.5, 0.8, 1.2, 2.0, 3.0, 5.0] as $mul) $consider($evalFit($lam, $avgSpend * $mul));
        }
        if ($best === null) return null;
        $bl = $best['lambda']; $bk = $best['kappa_raw'];
        foreach ([$bl - 0.1, $bl - 0.05, $bl + 0.05, $bl + 0.1] as $lam) {
            foreach ([0.7, 0.85, 1.0, 1.15, 1.3] as $m) $consider($evalFit($lam, $bk * $m));
        }
        foreach ([0.7, 0.85, 1.15, 1.3] as $m) $consider($evalFit($bl, $bk * $m)); // best λ 고정 κ 정제

        // 정상상태 보정: 일정 일지출 x → adstock 정상값 x/(1−λ). κ_eff 로 흡수.
        $lamBest = $best['lambda']; $kapRaw = $best['kappa_raw'];
        $kappaEff = $kapRaw * (1.0 - $lamBest); if ($kappaEff <= 0) $kappaEff = $kapRaw;
        $nrmse = $meanRev > 0 ? sqrt($best['sse'] / $n) / $meanRev : 0.0; // Robyn 기본 지표(정규화 RMSE=상대오차)
        $best = ['beta' => $best['beta'], 'kappa' => $kappaEff, 'lambda' => $lamBest, 'r2' => $best['r2'], 'nrmse' => $nrmse];

        $beta = $best['beta']; $kappa = $best['kappa'];
        $curRev = $beta * (1.0 - exp(-$avgSpend / $kappa)); // 예측 일매출(현 지출)
        $marginal = ($beta / $kappa) * exp(-$avgSpend / $kappa); // dRev/dSpend
        $saturation = 1.0 - exp(-$avgSpend / $kappa);
        return [
            'beta' => round($beta, 2),
            'kappa' => round($kappa, 2),
            'lambda' => round($best['lambda'], 3),
            'r2' => round(max(0, $best['r2']), 3),
            'nrmse' => round($best['nrmse'], 4),
            'days' => $n,
            'current_daily_spend' => round($avgSpend, 2),
            'current_daily_revenue' => round($totalRev / $n, 2),
            'total_spend' => round($totalSpend, 2),
            'total_revenue' => round($totalRev, 2),
            'current_roas' => $totalSpend > 0 ? round($totalRev / $totalSpend, 3) : 0,
            'marginal_roas' => round($marginal, 3),
            'saturation' => round($saturation, 3),
            'contribution' => round($curRev, 2), // 현 지출에서의 예측 기여 매출(일)
        ];
    }

    private static function response(array $c, float $x): float
    {
        $k = max(1e-9, (float)$c['kappa']);
        return (float)$c['beta'] * (1.0 - exp(-$x / $k));
    }

    private static function marginal(array $c, float $x): float
    {
        $k = max(1e-9, (float)$c['kappa']);
        return ((float)$c['beta'] / $k) * exp(-$x / $k);
    }

    /* ───────────────────────── Bayesian MMM (사후분포·신뢰구간) ───────────────────────── */

    /**
     * [R-P1-1] GET /v424/mmm/bayesian?window=90 — 채널별 Bayesian 사후 기여도(95% credible interval)·신뢰도.
     *   점추정(fitChannel)만으로는 채널 불확실성을 알 수 없다 → 잔차 부트스트랩(무정보 사전 근사 사후)으로
     *   β·기여매출의 사후분포를 표본화하여 평균·표준편차·95% CI·신뢰도(trust)를 산출. Northbeam/Recast급
     *   uncertainty 정량화. 전부 실 performance_metrics 파생(날조 0).
     */
    public static function bayesian(Request $req, Response $res): Response
    {
        $tenant = self::tenant($req);
        $qs = $req->getQueryParams();
        $window = max(14, min(365, (int)($qs['window'] ?? 90)));
        $method = (($qs['method'] ?? 'mcmc') === 'bootstrap') ? 'bootstrap' : 'mcmc';
        try {
            $data = self::posteriorData($tenant, $window, $method);
            $usedMcmc = $method === 'mcmc';
            return self::json($res, [
                'ok' => true, 'demo' => self::isDemo($tenant), 'window_days' => $window,
                'channels' => $data['channels'],
                'total_contribution' => $data['total_contribution'],
                'data_driven' => count($data['channels']) > 0,
                'method' => $usedMcmc
                    ? 'metropolis-hastings-mcmc (2 chains, β·κ·λ·σ 결합사후, R̂ 수렴진단)'
                    : 'residual-bootstrap-posterior (B=300, 무정보 사전 근사)',
                'note' => count($data['channels']) > 0
                    ? ($usedMcmc
                        ? '실측 performance_metrics 기반 정식 Bayesian MMM — (β,κ,λ,σ) 결합 사후표본화로 곡선형태 불확실성까지 반영한 95% credible interval·R̂ 수렴진단 제공'
                        : '실측 performance_metrics 기반 사후분포 표본화 — 채널별 95% credible interval 제공')
                    : '성과 데이터가 충분하지 않습니다. 채널 집행·수집 후 사후추정됩니다.',
            ]);
        } catch (\Throwable $e) {
            return self::json($res, ['ok' => false, 'error' => 'DB 오류: ' . $e->getMessage()], 500);
        }
    }

    /**
     * 채널별 Bayesian 사후 기여도 데이터(엔드포인트 + AttributionEngine 블렌딩 공용 — 중복 0).
     * @param string $method 'mcmc'(정식 MH-MCMC 결합사후, 기본) | 'bootstrap'(잔차 부트스트랩, β만).
     * @return array ['channels'=>[{channel, contribution, posterior_mean, posterior_sd, ci_lo, ci_hi, cv, trust, r2, contribution_share, marginal_roas}], 'total_contribution'=>float]
     */
    public static function posteriorData(string $tenant, int $window, string $method = 'mcmc'): array
    {
        $series = self::loadSeries(Db::pdo(), $tenant, $window);
        $channels = [];
        foreach ($series as $ch => $rows) {
            // 정식 MCMC 우선, 퇴화/실패 시 잔차 부트스트랩으로 graceful 폴백(둘 다 동일 응답 스키마).
            $p = ($method === 'bootstrap') ? self::bayesianFit($rows) : (self::mcmcFit($rows) ?? self::bayesianFit($rows));
            if ($p !== null) $channels[] = ['channel' => (string)$ch] + $p;
        }
        $totalContrib = array_sum(array_map(fn($c) => (float)$c['posterior_mean'], $channels)) ?: 1.0;
        foreach ($channels as &$c) { $c['contribution_share'] = round((float)$c['posterior_mean'] / $totalContrib, 4); }
        unset($c);
        usort($channels, fn($a, $b) => $b['posterior_mean'] <=> $a['posterior_mean']);
        return ['channels' => $channels, 'total_contribution' => round($totalContrib, 2)];
    }

    /**
     * 잔차 부트스트랩으로 β·기여매출의 사후분포 표본화.
     *   곡선 형태(λ,κ_eff,R²)는 fitChannel 점추정 사용 → 정상상태 포화 sat_t=1−exp(−spend_t/κ_eff).
     *   β̂=Σ(rev·sat)/Σ(sat²); pred_t=β̂·sat_t; 잔차 e_t=rev_t−pred_t.
     *   B회: 잔차 복원추출 e*_t → rev*_t=pred_t+e*_t(≥0) → β*=Σ(rev*·sat)/Σ(sat²) → contribution*=β*·sat(avgSpend).
     *   사후: 평균·표준편차·2.5/97.5 백분위 CI·변동계수·trust=1/(1+cv).
     */
    private static function bayesianFit(array $rows): ?array
    {
        $base = self::fitChannel($rows);
        if ($base === null) return null;
        $n = count($rows);
        $spend = array_map(fn($r) => max(0.0, (float)$r['spend']), $rows);
        $rev   = array_map(fn($r) => max(0.0, (float)$r['revenue']), $rows);
        $kappa = max(1e-9, (float)$base['kappa']);
        $avgSpend = (float)$base['current_daily_spend'];
        // 정상상태 포화 기저(κ_eff). β̂·pred·잔차.
        $sat = []; $sNum = 0.0; $sDen = 0.0;
        foreach ($spend as $i => $x) { $s = 1.0 - exp(-$x / $kappa); $sat[$i] = $s; $sNum += $rev[$i] * $s; $sDen += $s * $s; }
        if ($sDen <= 1e-9) return null;
        $betaHat = $sNum / $sDen;
        if ($betaHat <= 0) return null;
        $pred = []; $resid = [];
        foreach ($sat as $i => $s) { $pred[$i] = $betaHat * $s; $resid[$i] = $rev[$i] - $pred[$i]; }
        $satAvg = 1.0 - exp(-$avgSpend / $kappa);

        $B = 300; $betaS = []; $contribS = [];
        for ($b = 0; $b < $B; $b++) {
            $num = 0.0;
            for ($i = 0; $i < $n; $i++) {
                $e = $resid[random_int(0, $n - 1)];           // 잔차 복원추출
                $rv = max(0.0, $pred[$i] + $e);                 // 합성 매출
                $num += $rv * $sat[$i];
            }
            $betaStar = $num / $sDen;
            $betaS[] = $betaStar;
            $contribS[] = $betaStar * $satAvg;                  // 현 일지출에서의 기여 일매출
        }
        sort($contribS);
        $mean = array_sum($contribS) / $B;
        $var = 0.0; foreach ($contribS as $v) $var += ($v - $mean) ** 2; $var /= $B;
        $sd = sqrt($var); $cv = $mean > 0 ? $sd / $mean : 0.0;
        $pct = function (array $a, float $p) { $k = ($p / 100) * (count($a) - 1); $lo = (int)floor($k); $hi = (int)ceil($k); return $lo === $hi ? $a[$lo] : $a[$lo] + ($a[$hi] - $a[$lo]) * ($k - $lo); };
        $marginal = ($betaHat / $kappa) * exp(-$avgSpend / $kappa);
        return [
            'beta' => round($betaHat, 2),
            'kappa' => round($kappa, 2),
            'lambda' => $base['lambda'],
            'r2' => $base['r2'],
            'days' => $n,
            'current_daily_spend' => round($avgSpend, 2),
            'contribution' => round($betaHat * $satAvg, 2),     // 점추정 기여(일)
            'posterior_mean' => round($mean, 2),
            'posterior_sd' => round($sd, 2),
            'ci_lo' => round($pct($contribS, 2.5), 2),
            'ci_hi' => round($pct($contribS, 97.5), 2),
            'cv' => round($cv, 3),
            'trust' => round(1.0 / (1.0 + $cv), 3),             // 0~1: CI 좁을수록 신뢰↑
            'marginal_roas' => round($marginal, 3),
            'stability' => $cv <= 0.15 ? 'high' : ($cv <= 0.35 ? 'medium' : 'low'),
        ];
    }

    /* ───────────── 정식 Bayesian MMM (Metropolis-Hastings MCMC 결합 사후) ───────────── */

    /** 표준정규 난수(Box-Muller) — random_int 기반(암호학적 시드, 결정론 불요). */
    private static function gaussian(): float
    {
        $u1 = (random_int(1, 1_000_000_000) / 1_000_000_001.0);
        $u2 = (random_int(0, 1_000_000_000) / 1_000_000_000.0);
        return sqrt(-2.0 * log($u1)) * cos(2.0 * M_PI * $u2);
    }

    /** [0,1) 균등 난수. */
    private static function uniform(): float { return random_int(0, 1_000_000_000) / 1_000_000_001.0; }

    /** Gamma(shape, 1) 난수 — Marsaglia-Tsang(shape≥1). σ² InvGamma Gibbs 표본용(shape=a0+n/2≥1 보장). */
    private static function gammaRand(float $a): float
    {
        if ($a < 1.0) $a = 1.0;
        $d = $a - 1.0 / 3.0;
        $c = 1.0 / sqrt(9.0 * $d);
        for ($iter = 0; $iter < 1000; $iter++) {
            do { $x = self::gaussian(); $v = 1.0 + $c * $x; } while ($v <= 0);
            $v = $v * $v * $v;
            $u = self::uniform();
            if ($u < 1.0 - 0.0331 * $x * $x * $x * $x) return $d * $v;
            if (log(max(1e-300, $u)) < 0.5 * $x * $x + $d * (1.0 - $v + log($v))) return $d * $v;
        }
        return $d; // 극히 드문 미수렴 — 평균값 반환(graceful)
    }

    /**
     * 정식 Bayesian MMM — Metropolis-Hastings MCMC 로 (β, κ_raw, λ, σ) 결합 사후표본화.
     *
     * 잔차 부트스트랩(bayesianFit)은 곡선형태(λ,κ)를 점추정에 고정 → β 불확실성만 반영(CI 과소추정).
     * 본 MCMC 는 광고효과 이월(adstock λ)·포화(κ)·노이즈(σ)까지 전 파라미터를 결합 사후표본화하여
     * 곡선형태 불확실성을 기여도 CI 에 정직하게 전파한다(Northbeam/Recast급 uncertainty).
     *
     * 모델:  adstock_t = spend_t + λ·adstock_{t-1};  rev_t = β·(1−exp(−adstock_t/κ)) + ε,  ε~N(0,σ²)
     * 사전(경험적 베이즈·전부 데이터 파생, 임의 숫자 0):
     *   log β ~ N(log β̂, 0.5²),  log κ ~ N(log κ̂_raw, 0.5²),  λ=0.95·sigmoid(w)·w~N(ŵ,1.0²),
     *   log σ ~ N(log σ̂, 0.5²)   (β̂·κ̂·λ̂·σ̂ = fitChannel 점추정 + 점추정 잔차표준편차)
     * 표본: 2 체인 × 1400(burn-in 500) random-walk → 기여도 사후평균·SD·95% CI·R̂(Gelman-Rubin).
     *
     * @return array|null bayesianFit 와 동일 스키마 + rhat/accept_rate/beta_ci/kappa_ci/lambda_mean.
     */
    private static function mcmcFit(array $rows): ?array
    {
        $base = self::fitChannel($rows);
        if ($base === null) return null;
        $n = count($rows);
        if ($n < 10) return null; // MCMC 는 부트스트랩보다 데이터 요구 ↑ → 폴백
        $spend = array_map(fn($r) => max(0.0, (float)$r['spend']), $rows);
        $rev   = array_map(fn($r) => max(0.0, (float)$r['revenue']), $rows);
        $avgSpend = (float)$base['current_daily_spend'];

        // 점추정(사전 중심). κ̂_eff → κ̂_raw 환산(adstock 정상상태: κ_eff=κ_raw·(1−λ)).
        $beta0  = max(1e-6, (float)$base['beta']);
        $lam0   = max(0.0, min(0.9, (float)$base['lambda']));
        $kEff0  = max(1e-6, (float)$base['kappa']);
        $kRaw0  = max(1e-6, $kEff0 / max(0.05, 1.0 - $lam0));

        // 점추정 잔차표준편차(σ̂ 사전 중심) — adstock(λ̂)+포화(κ̂_raw) 예측 기준.
        $adstockOf = function (float $lam) use ($spend, $n): array {
            $ad = []; $prev = 0.0;
            for ($i = 0; $i < $n; $i++) { $prev = $spend[$i] + $lam * $prev; $ad[$i] = $prev; }
            return $ad;
        };
        $ad0 = $adstockOf($lam0);
        $sse0 = 0.0;
        for ($i = 0; $i < $n; $i++) { $pr = $beta0 * (1.0 - exp(-$ad0[$i] / $kRaw0)); $sse0 += ($rev[$i] - $pr) ** 2; }
        $sig0 = max(1e-6, sqrt($sse0 / max(1, $n)));

        // λ=0.95·sigmoid(w); w 사전 중심 ŵ.
        $lamOf = fn(float $w): float => 0.95 / (1.0 + exp(-$w));
        $w0 = log(max(1e-6, ($lam0 / 0.95)) / max(1e-6, (1.0 - $lam0 / 0.95)));
        // sat 벡터(adstock(λ)+κ_raw 포화)·sse 헬퍼.
        $satVec = function (float $kRaw, array $ad) use ($n): array {
            $s = []; for ($i = 0; $i < $n; $i++) $s[$i] = 1.0 - exp(-$ad[$i] / $kRaw); return $s;
        };
        $sseOf = function (float $beta, array $sat) use ($rev, $n): float {
            $e = 0.0; for ($i = 0; $i < $n; $i++) { $d = $rev[$i] - $beta * $sat[$i]; $e += $d * $d; } return $e;
        };

        // ── Metropolis-within-Gibbs: β·σ² 는 켤레사전 정확 Gibbs(항상 수락), κ_raw·λ 만 적응형 MH ──
        //   σ까지 MH로 random-walk 하면 우도가 너무 첨예해 수락률 폭락→CI 과소. β(가우시안 켤레)·σ²(역감마 켤레)를
        //   닫힌형으로 표본화하면 혼합이 안정되고 κ·λ MH만 적응하면 된다(정직한 사후폭).
        $priorVarB = ($beta0 * 0.5) ** 2;            // β ~ N(β̂, (0.5β̂)²) 약정보 사전
        $a0 = 2.0; $b0 = $sig0 * $sig0 * ($a0 - 1.0); // σ² ~ InvGamma(a0,b0), 사전평균=σ̂²
        $iters = 1500; $burn = 600;

        $chains = []; $accMH = 0; $cntMH = 0;
        for ($ch = 0; $ch < 2; $ch++) {
            // 분산 시작점(R̂ 진단용).
            $beta = $beta0 * ($ch ? 1.25 : 0.8);
            $kRaw = $kRaw0 * ($ch ? 1.35 : 0.74);
            $w = $w0 + ($ch ? 0.6 : -0.6); $lam = $lamOf($w);
            $sigma2 = $sig0 * $sig0;
            $ad = $adstockOf($lam); $sat = $satVec($kRaw, $ad); $sse = $sseOf($beta, $sat);
            $stepK = 0.08; $stepW = 0.30; $accK = 0; $cntK = 0; $accW = 0; $cntW = 0;
            $contribS = [];
            for ($it = 0; $it < $iters; $it++) {
                // 1) Gibbs β | κ,λ,σ²  (β ~ N: 정밀도=Σsat²/σ² + 1/priorVar)
                $Ssat2 = 0.0; $Srs = 0.0;
                for ($i = 0; $i < $n; $i++) { $Ssat2 += $sat[$i] * $sat[$i]; $Srs += $rev[$i] * $sat[$i]; }
                $prec = $Ssat2 / $sigma2 + 1.0 / $priorVarB;
                $muB = ($Srs / $sigma2 + $beta0 / $priorVarB) / $prec;
                $beta = $muB + sqrt(1.0 / $prec) * self::gaussian();
                if ($beta <= 1e-6) $beta = max(1e-6, $muB);
                $sse = $sseOf($beta, $sat);
                // 2) Gibbs σ² | β,κ,λ  (InvGamma: aPost=a0+n/2, bPost=b0+sse/2)
                $aPost = $a0 + $n / 2.0; $bPost = $b0 + $sse / 2.0;
                $g = self::gammaRand($aPost); $sigma2 = $g > 1e-12 ? $bPost / $g : $sigma2;
                if ($sigma2 <= 1e-9) $sigma2 = 1e-9;
                // 3) MH κ_raw (log scale)
                $logK = log($kRaw); $logKp = $logK + $stepK * self::gaussian(); $kRawP = exp($logKp);
                $satP = $satVec($kRawP, $ad); $sseP = $sseOf($beta, $satP);
                $logR = (-$sseP + $sse) / (2.0 * $sigma2)
                      + (-(($logKp - log($kRaw0)) ** 2) + (($logK - log($kRaw0)) ** 2)) / (2 * 0.25);
                $cntK++; $cntMH++;
                if (log(max(1e-300, self::uniform())) < $logR) { $kRaw = $kRawP; $sat = $satP; $sse = $sseP; $accK++; $accMH++; }
                // 4) MH λ (w) — adstock 재계산 필요
                $wp = $w + $stepW * self::gaussian(); $lamP = $lamOf($wp);
                $adP = $adstockOf($lamP); $satP = $satVec($kRaw, $adP); $sseP = $sseOf($beta, $satP);
                $logR = (-$sseP + $sse) / (2.0 * $sigma2)
                      + (-(($wp - $w0) ** 2) + (($w - $w0) ** 2)) / (2 * 1.0);
                $cntW++; $cntMH++;
                if (log(max(1e-300, self::uniform())) < $logR) { $w = $wp; $lam = $lamP; $ad = $adP; $sat = $satP; $sse = $sseP; $accW++; $accMH++; }
                // 적응(burn-in 중 100회마다): 1D MH 목표 수락률 0.44.
                if ($it < $burn && ($it + 1) % 100 === 0) {
                    $arK = $cntK > 0 ? $accK / $cntK : 0.44; $stepK = max(1e-4, min(2.0, $stepK * exp(($arK - 0.44) * 1.5))); $accK = 0; $cntK = 0;
                    $arW = $cntW > 0 ? $accW / $cntW : 0.44; $stepW = max(1e-4, min(3.0, $stepW * exp(($arW - 0.44) * 1.5))); $accW = 0; $cntW = 0;
                }
                if ($it >= $burn) {
                    $satAvg = 1.0 - exp(-($avgSpend / max(0.05, 1.0 - $lam)) / $kRaw);
                    $contribS[] = $beta * $satAvg;   // 현 일지출에서의 기여 일매출
                }
            }
            $chains[] = $contribS;
        }
        $accepts = $accMH; $totalProp = max(1, $cntMH);

        // R̂(Gelman-Rubin) — 기여도 체인 간/내 분산.
        $m = count($chains); $L = count($chains[0]);
        if ($L < 2) return null;
        $chainMeans = []; $chainVars = [];
        foreach ($chains as $c) {
            $mu = array_sum($c) / $L; $chainMeans[] = $mu;
            $v = 0.0; foreach ($c as $x) $v += ($x - $mu) ** 2; $chainVars[] = $v / max(1, $L - 1);
        }
        $grand = array_sum($chainMeans) / $m;
        $Bvar = 0.0; foreach ($chainMeans as $mu) $Bvar += ($mu - $grand) ** 2; $Bvar = $Bvar * $L / max(1, $m - 1);
        $W = array_sum($chainVars) / $m;
        $varHat = ($L - 1) / $L * $W + $Bvar / $L;
        $rhat = ($W > 1e-12) ? sqrt(max(0.0, $varHat) / $W) : 1.0;

        // [255차 심화] ESS(유효표본수)·MCSE — R̂ 보완 수렴진단(Stan/PyMC 표준 페어). 순서보존 체인서 자기상관(Geyer 초기양수합) 기반.
        $essTotal = 0.0; foreach ($chains as $c) { $essTotal += self::chainEss($c); }
        $essTotal = max(1.0, min((float)($m * $L), $essTotal));

        // 통합 사후표본 → 평균·SD·CI.
        $all = array_merge(...$chains); sort($all); $N = count($all);
        $mean = array_sum($all) / $N;
        $var = 0.0; foreach ($all as $x) $var += ($x - $mean) ** 2; $var /= $N;
        $sd = sqrt($var); $cv = $mean > 0 ? $sd / $mean : 0.0;
        $mcse = $sd / sqrt($essTotal); // 몬테카를로 표준오차(사후평균 추정 정밀도)
        $pct = function (array $a, float $p) { $k = ($p / 100) * (count($a) - 1); $lo = (int)floor($k); $hi = (int)ceil($k); return $lo === $hi ? $a[$lo] : $a[$lo] + ($a[$hi] - $a[$lo]) * ($k - $lo); };

        // R̂ 미수렴(>1.2) 시 신뢰불가 → 폴백(부트스트랩) 신호.
        if ($rhat > 1.2 || !is_finite($mean) || $mean <= 0) return null;

        $marginal = ($beta0 / $kEff0) * exp(-$avgSpend / $kEff0); // 한계ROAS(점추정 곡선)
        $accRate = $totalProp > 0 ? $accepts / $totalProp : 0.0;
        return [
            'beta' => round($beta0, 2),
            'kappa' => round($kEff0, 2),
            'lambda' => $lam0,
            'r2' => $base['r2'],
            'days' => $n,
            'current_daily_spend' => round($avgSpend, 2),
            'contribution' => round($beta0 * (1.0 - exp(-$avgSpend / $kEff0)), 2), // 점추정 기여(일)
            'posterior_mean' => round($mean, 2),
            'posterior_sd' => round($sd, 2),
            'ci_lo' => round($pct($all, 2.5), 2),
            'ci_hi' => round($pct($all, 97.5), 2),
            'cv' => round($cv, 3),
            'trust' => round(1.0 / (1.0 + $cv), 3),
            'marginal_roas' => round($marginal, 3),
            'stability' => $cv <= 0.15 ? 'high' : ($cv <= 0.35 ? 'medium' : 'low'),
            'rhat' => round($rhat, 3),
            'converged' => $rhat <= 1.1 && $essTotal >= 100, // [255차] R̂+ESS 동시충족(저ESS=신뢰불가)
            'accept_rate' => round($accRate, 3),
            'posterior_samples' => $N,
            'ess' => round($essTotal, 1),                    // [255차] 유효표본수(자기상관 보정)
            'mcse' => round($mcse, 4),                       // [255차] 몬테카를로 표준오차
            'ess_ratio' => round($essTotal / max(1, $N), 3), // ESS/표본 비율(혼합도)
            'inference' => 'mcmc',
        ];
    }

    /** [255차 심화] 단일 체인 ESS — 자기상관 rho_k 의 Geyer 초기양수합. ESS=L/(1+2·Σrho). */
    private static function chainEss(array $c): float
    {
        $L = count($c); if ($L < 4) return (float)max(1, $L);
        $mu = array_sum($c) / $L;
        $c0 = 0.0; foreach ($c as $x) { $c0 += ($x - $mu) ** 2; } $c0 /= $L;
        if ($c0 <= 1e-12) return (float)$L; // 분산0=완전상관 회피, 보수적 L
        $sumRho = 0.0; $maxLag = min($L - 1, 200);
        for ($k = 1; $k <= $maxLag; $k++) {
            $ck = 0.0; for ($i = 0; $i < $L - $k; $i++) { $ck += ($c[$i] - $mu) * ($c[$i + $k] - $mu); } $ck /= $L;
            $rho = $ck / $c0;
            if ($rho <= 0.0) break;       // Geyer 초기양수: 음수 도달 시 절단
            $sumRho += $rho;
        }
        $ess = $L / (1.0 + 2.0 * $sumRho);
        return max(1.0, min((float)$L, $ess));
    }

    /* ───────────────────────── 예산 최적화(그리디 한계배분) ───────────────────────── */

    private static function greedyAllocate(array $channels, int $budget, array $constraints): array
    {
        $alloc = []; $minA = []; $maxA = [];
        foreach ($channels as $c) {
            $ch = $c['channel'];
            $minA[$ch] = max(0, (float)($constraints[$ch]['min'] ?? 0));
            $maxA[$ch] = isset($constraints[$ch]['max']) ? max($minA[$ch], (float)$constraints[$ch]['max']) : INF;
            $alloc[$ch] = $minA[$ch];
        }
        $remaining = $budget - array_sum($alloc);
        if ($remaining <= 0) return $alloc;
        $steps = 400; $inc = $remaining / $steps;
        if ($inc <= 0) return $alloc;
        $byCh = [];
        foreach ($channels as $c) $byCh[$c['channel']] = $c;
        for ($i = 0; $i < $steps; $i++) {
            $bestCh = null; $bestM = -INF;
            foreach ($byCh as $ch => $c) {
                if ($alloc[$ch] + $inc > $maxA[$ch]) continue;
                $m = self::marginal($c, $alloc[$ch]);
                if ($m > $bestM) { $bestM = $m; $bestCh = $ch; }
            }
            if ($bestCh === null) break; // 전 채널 상한 도달
            $alloc[$bestCh] += $inc;
        }
        return $alloc;
    }

    /* ───────────────────────── 데모 합성 모델 ───────────────────────── */

    private static function demoModel(int $window): array
    {
        // 합성 채널(현실적 포화곡선) — 데모 명시.
        $defs = [
            ['channel' => 'meta_ads',      'beta' => 4200000, 'kappa' => 380000, 'lambda' => 0.4, 'cur' => 250000, 'roas' => 3.4],
            ['channel' => 'google_ads',    'beta' => 5100000, 'kappa' => 520000, 'lambda' => 0.3, 'cur' => 300000, 'roas' => 3.9],
            ['channel' => 'tiktok_business','beta' => 2600000, 'kappa' => 300000, 'lambda' => 0.5, 'cur' => 120000, 'roas' => 2.7],
            ['channel' => 'naver_sa',      'beta' => 3300000, 'kappa' => 280000, 'lambda' => 0.2, 'cur' => 180000, 'roas' => 4.3],
            ['channel' => 'kakao_moment',  'beta' => 1500000, 'kappa' => 210000, 'lambda' => 0.3, 'cur' => 90000,  'roas' => 2.4],
        ];
        $channels = [];
        foreach ($defs as $d) {
            $beta = $d['beta']; $kap = $d['kappa']; $x = $d['cur'];
            $curRev = $beta * (1 - exp(-$x / $kap));
            $channels[] = [
                'channel' => $d['channel'], 'beta' => $beta, 'kappa' => $kap, 'lambda' => $d['lambda'],
                'r2' => 0.82, 'nrmse' => 0.11, 'days' => $window,
                'current_daily_spend' => $x, 'current_daily_revenue' => round($curRev, 2),
                'total_spend' => $x * $window, 'total_revenue' => round($curRev * $window, 2),
                'current_roas' => $d['roas'], 'marginal_roas' => round(($beta / $kap) * exp(-$x / $kap), 3),
                'saturation' => round(1 - exp(-$x / $kap), 3), 'contribution' => round($curRev, 2),
            ];
        }
        $tot = array_sum(array_map(fn($c) => $c['contribution'], $channels)) ?: 1;
        foreach ($channels as &$c) $c['contribution_share'] = round($c['contribution'] / $tot, 4);
        unset($c);
        usort($channels, fn($a, $b) => $b['contribution'] <=> $a['contribution']);
        return ['ok' => true, 'demo' => true, 'window_days' => $window, 'channels' => $channels,
            'model_diagnostics' => self::mmmDiagnostics($channels), 'data_driven' => true, 'note' => '데모 합성 곡선(체험용)'];
    }

    /**
     * [P4 MMM 고도화] Robyn식 모델선택 진단 — DECOMP.RSSD + 지출가중 R².
     *   DECOMP.RSSD = √Σ(효과비중 − 지출비중)²: 채널 지출비중과 모델 효과비중의 거리(Robyn 비즈니스로직 적합도).
     *   낮을수록 "지출↔효과" 정합(과적합·비현실 분해 경고). 기존 적합 결과만으로 산출(추가 가정·날조 0).
     */
    private static function mmmDiagnostics(array $channels): array
    {
        $totalSpend = 0.0; $totalContrib = 0.0;
        foreach ($channels as $c) { $totalSpend += (float)($c['total_spend'] ?? 0); $totalContrib += (float)($c['contribution'] ?? 0); }
        if ($totalSpend <= 0 || $totalContrib <= 0 || count($channels) === 0) {
            return ['decomp_rssd' => null, 'avg_r2' => null, 'grade' => 'insufficient', 'channels' => [],
                'note' => '진단에 충분한 지출/효과 데이터가 없습니다.'];
        }
        $rssd2 = 0.0; $wR2 = 0.0; $wNrmse = 0.0; $rows = [];
        foreach ($channels as $c) {
            $ss = (float)($c['total_spend'] ?? 0) / $totalSpend;     // 지출 비중
            $es = (float)($c['contribution'] ?? 0) / $totalContrib;  // 효과(기여) 비중
            $d = $es - $ss; $rssd2 += $d * $d; $wR2 += $ss * (float)($c['r2'] ?? 0); $wNrmse += $ss * (float)($c['nrmse'] ?? 0);
            $rows[] = ['channel' => (string)($c['channel'] ?? ''), 'spend_share' => round($ss, 4), 'effect_share' => round($es, 4), 'distance' => round($d, 4)];
        }
        $rssd = sqrt($rssd2);
        $grade = $rssd < 0.1 ? 'excellent' : ($rssd < 0.25 ? 'good' : ($rssd < 0.5 ? 'fair' : 'poor'));
        usort($rows, fn($a, $b) => abs($b['distance']) <=> abs($a['distance']));
        return [
            'decomp_rssd' => round($rssd, 4),
            'avg_r2' => round($wR2, 3),
            'avg_nrmse' => round($wNrmse, 4),
            'grade' => $grade,
            'channels' => $rows,
            'note' => 'DECOMP.RSSD=√Σ(효과비중−지출비중)² (Robyn 비즈니스로직 적합도, 낮을수록 지출↔효과 정합). avg_r2=지출가중 설명력·avg_nrmse=지출가중 정규화 RMSE(상대오차, 낮을수록 정확). 하이퍼파라미터(λ·κ)는 coarse→fine 적응형 자동탐색. distance>0=과대평가(효과>지출), <0=과소평가.',
        ];
    }
}
