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
        // 연결된 실제 DB명으로 데모 백엔드 확정 판별(geniego_roi_demo).
        try {
            $dbn = strtolower((string)Db::pdo()->query('SELECT DATABASE()')->fetchColumn());
            if ($dbn !== '' && strpos($dbn, 'demo') !== false) return true;
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
                'data_driven' => count($channels) > 0,
                'note' => count($channels) > 0 ? '실측 performance_metrics 기반 적합' : '성과 데이터가 아직 충분하지 않습니다. 채널 집행·수집 후 적합됩니다.',
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

        $bestR2 = -INF; $best = null;
        $lambdas = [0.0, 0.2, 0.4, 0.6];
        // κ 후보: 평균지출의 0.3~6배 (포화 스케일 탐색)
        $kappaGrid = [];
        foreach ([0.3, 0.5, 0.8, 1.2, 2.0, 3.0, 5.0] as $mul) $kappaGrid[] = $avgSpend * $mul;

        foreach ($lambdas as $lam) {
            // adstock 변환
            $ad = []; $prev = 0.0;
            foreach ($spend as $s) { $prev = $s + $lam * $prev; $ad[] = $prev; }
            foreach ($kappaGrid as $kap) {
                if ($kap <= 0) continue;
                // sat_t = 1 - exp(-ad_t/κ);  β = Σ(rev·sat)/Σ(sat²)  (최소제곱)
                $sse = 0.0; $sNum = 0.0; $sDen = 0.0;
                foreach ($ad as $i => $x) {
                    $sat = 1.0 - exp(-$x / $kap);
                    $sNum += $rev[$i] * $sat;
                    $sDen += $sat * $sat;
                }
                if ($sDen <= 1e-9) continue;
                $beta = $sNum / $sDen;
                if ($beta <= 0) continue;
                // R²
                $meanRev = $totalRev / $n; $ssTot = 0.0;
                foreach ($ad as $i => $x) {
                    $pred = $beta * (1.0 - exp(-$x / $kap));
                    $sse += ($rev[$i] - $pred) ** 2;
                    $ssTot += ($rev[$i] - $meanRev) ** 2;
                }
                $r2 = $ssTot > 1e-9 ? (1.0 - $sse / $ssTot) : 0.0;
                if ($r2 > $bestR2) {
                    $bestR2 = $r2;
                    // 정상상태 보정: 일정 일지출 x → adstock 정상값 x/(1−λ). κ_eff 로 흡수.
                    $kappaEff = $kap * (1.0 - $lam);
                    if ($kappaEff <= 0) $kappaEff = $kap;
                    $best = ['beta' => $beta, 'kappa' => $kappaEff, 'lambda' => $lam, 'r2' => $r2];
                }
            }
        }
        if ($best === null) return null;

        $beta = $best['beta']; $kappa = $best['kappa'];
        $curRev = $beta * (1.0 - exp(-$avgSpend / $kappa)); // 예측 일매출(현 지출)
        $marginal = ($beta / $kappa) * exp(-$avgSpend / $kappa); // dRev/dSpend
        $saturation = 1.0 - exp(-$avgSpend / $kappa);
        return [
            'beta' => round($beta, 2),
            'kappa' => round($kappa, 2),
            'lambda' => $best['lambda'],
            'r2' => round(max(0, $best['r2']), 3),
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
                'r2' => 0.82, 'days' => $window,
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
        return ['ok' => true, 'demo' => true, 'window_days' => $window, 'channels' => $channels, 'data_driven' => true, 'note' => '데모 합성 곡선(체험용)'];
    }
}
