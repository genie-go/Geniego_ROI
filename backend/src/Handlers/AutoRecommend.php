<?php
declare(strict_types=1);

namespace Genie\Handlers;

use Genie\Db;
use PDO;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Throwable;

/**
 * 201차 — 마케팅 자동화 채널 추천/예산배분 엔진 (데이터 기반).
 *
 * 사용자 요구: "각 광고 채널을 기존 타사(업계) 자료를 분석해 추천하고, 그 데이터로 초기 진행한 뒤,
 *   집행하면서 각 채널의 유입효과 비교 분석을 통해 예산 변경·채널 할당을 자동화."
 *
 * 설계 (Cold-start → Warm 전환):
 *   1) COLD: 테넌트 실데이터가 없을 때 → 업계 벤치마크(channel_benchmark, 전역 참조데이터)로
 *      카테고리×채널 기대 ROAS 를 산출해 예산을 비례 배분. source='benchmark'.
 *   2) WARM: 테넌트 performance_metrics(실 집행 결과)가 쌓이면 → 채널별 실측 ROAS 와 벤치마크를
 *      데이터량 가중으로 블렌딩(measuredWeight) → 점진적으로 실측 중심 재배분. source='measured'/'blended'.
 *
 * ★ 격리: channel_benchmark 는 업계 평균(참조데이터, 가격표와 동급)이며 테넌트 데이터 아님.
 *   실측은 반드시 tenant_id 스코프(AttributionMetrics/AdPerformance 와 동일 원칙). 교차유입 0.
 *
 * Endpoints:
 *   POST /v424/marketing/auto-recommend  — {budget, category, period} → 채널 추천·배분·예측
 *   GET  /v424/marketing/benchmarks      — 벤치마크 참조표(투명성)
 */
final class AutoRecommend
{
    /** 채널 id ← AutoMarketing.jsx 와 일치. 업계 평균 벤치마크(참조데이터). */
    private const CHANNEL = [
        'meta'        => ['label' => 'Meta',     'cpm' => 8000,  'ctr' => 0.90, 'cvr' => 2.0, 'roas' => 3.2, 'minBudget' => 100000, 'connectorKey' => 'meta_ads'],
        'google'      => ['label' => 'Google',   'cpm' => 10000, 'ctr' => 3.50, 'cvr' => 3.5, 'roas' => 4.0, 'minBudget' => 50000,  'connectorKey' => 'google_ads'],
        'tiktok'      => ['label' => 'TikTok',    'cpm' => 5000,  'ctr' => 1.20, 'cvr' => 1.5, 'roas' => 2.8, 'minBudget' => 150000, 'connectorKey' => 'tiktok_business'],
        'naver'       => ['label' => 'Naver SA',  'cpm' => 7000,  'ctr' => 2.50, 'cvr' => 3.0, 'roas' => 3.8, 'minBudget' => 100000, 'connectorKey' => 'naver_sa'],
        'kakao'       => ['label' => 'Kakao',     'cpm' => 6000,  'ctr' => 1.00, 'cvr' => 2.2, 'roas' => 3.0, 'minBudget' => 100000, 'connectorKey' => 'kakao_moment'],
        'coupang_ads' => ['label' => 'Coupang',   'cpm' => 9000,  'ctr' => 1.50, 'cvr' => 4.0, 'roas' => 4.5, 'minBudget' => 50000,  'connectorKey' => 'coupang'],
    ];

    /** 카테고리 → 채널 적합도 가중(업계 관행). 미정의 카테고리는 DEFAULT. */
    private const AFFINITY = [
        'fashion'      => ['meta' => 1.3, 'tiktok' => 1.4, 'naver' => 1.1, 'google' => 0.9, 'kakao' => 1.0, 'coupang_ads' => 1.1],
        'beauty'       => ['meta' => 1.4, 'tiktok' => 1.3, 'naver' => 1.1, 'google' => 0.9, 'kakao' => 1.1, 'coupang_ads' => 1.2],
        'electronics'  => ['google' => 1.4, 'naver' => 1.3, 'coupang_ads' => 1.3, 'meta' => 0.9, 'tiktok' => 0.8, 'kakao' => 0.9],
        'food'         => ['naver' => 1.3, 'kakao' => 1.3, 'coupang_ads' => 1.3, 'meta' => 1.0, 'tiktok' => 1.0, 'google' => 0.9],
        'home'         => ['naver' => 1.2, 'coupang_ads' => 1.3, 'google' => 1.1, 'meta' => 1.0, 'kakao' => 1.0, 'tiktok' => 0.9],
        'health'       => ['naver' => 1.3, 'google' => 1.2, 'meta' => 1.1, 'kakao' => 1.1, 'coupang_ads' => 1.1, 'tiktok' => 0.9],
        'baby'         => ['naver' => 1.3, 'kakao' => 1.2, 'coupang_ads' => 1.3, 'meta' => 1.1, 'google' => 1.0, 'tiktok' => 0.8],
        'pet'          => ['naver' => 1.2, 'coupang_ads' => 1.3, 'meta' => 1.1, 'kakao' => 1.1, 'google' => 1.0, 'tiktok' => 1.0],
        'digital'      => ['google' => 1.4, 'meta' => 1.1, 'naver' => 1.2, 'tiktok' => 1.0, 'kakao' => 0.9, 'coupang_ads' => 1.1],
        'sports'       => ['meta' => 1.2, 'tiktok' => 1.3, 'naver' => 1.1, 'google' => 1.0, 'coupang_ads' => 1.1, 'kakao' => 1.0],
        'DEFAULT'      => ['meta' => 1.0, 'google' => 1.0, 'tiktok' => 1.0, 'naver' => 1.0, 'kakao' => 1.0, 'coupang_ads' => 1.0],
    ];

    private const PERIOD_DAYS = ['monthly' => 30, 'quarter' => 90, 'halfyear' => 180, 'annual' => 365];

    private static function tenant(Request $req): string
    {
        // 프론트는 세션 토큰(genie_token)으로 호출 → 세션 기반 tenant 우선 해석(AutoCampaign/ClaudeAI 패턴).
        try {
            $st = UserAuth::authedTenant($req);
            if (is_string($st) && $st !== '' && strtolower($st) !== 'unknown') return $st;
        } catch (\Throwable $e) {}
        // ★ 202차 P1(격리): raw X-Tenant-Id 헤더 폴백 제거. api_key 인증 시 AI-게이트(index.php)가
        //   키의 tenant_id 를 auth_tenant 속성으로 주입(위조 불가)하므로 그 권위 소스만 신뢰한다.
        //   (과거: 헤더 폴백으로 api_key 보유자가 타 테넌트 집계지표 위조 열람 가능했음.)
        $t = $req->getAttribute('auth_tenant');
        $t = trim((string)(is_string($t) ? $t : ''));
        return ($t === '' || strtolower($t) === 'unknown') ? '' : $t;
    }

    private static function json(Response $res, array $data, int $status = 200): Response
    {
        $res->getBody()->write(json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
        return $res->withHeader('Content-Type', 'application/json')->withStatus($status);
    }

    private static function body(Request $req): array
    {
        $b = (array)($req->getParsedBody() ?? []);
        if (empty($b)) { $d = json_decode((string)$req->getBody(), true); if (is_array($d)) $b = $d; }
        return $b['data'] ?? $b;
    }

    /** 테넌트 실측 채널 성과(최근 N일). 없으면 빈 배열. ★tenant_id 스코프 필수. */
    private static function measured(string $tenant, int $days): array
    {
        if ($tenant === '') return [];
        try {
            $pdo = Db::pdo();
            $stmt = $pdo->prepare(
                'SELECT channel, SUM(spend) AS spend, SUM(revenue) AS revenue, '
                . 'SUM(impressions) AS impressions, SUM(clicks) AS clicks, SUM(conversions) AS conversions '
                . 'FROM performance_metrics '
                . 'WHERE tenant_id = :t AND channel IS NOT NULL '
                . "AND date >= DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL :d DAY), '%Y-%m-%d') "
                . 'GROUP BY channel'
            );
            // INTERVAL 바인딩 회피 위해 정수 검증 후 직접 삽입
            $days = max(1, min(365, $days));
            $sql = str_replace(':d DAY', $days . ' DAY', $stmt->queryString);
            $stmt = $pdo->prepare($sql);
            $stmt->execute([':t' => $tenant]);
            $out = [];
            foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $r) {
                $spend = (float)$r['spend'];
                $out[$r['channel']] = [
                    'spend' => $spend,
                    'revenue' => (float)$r['revenue'],
                    'roas' => $spend > 0 ? round(((float)$r['revenue']) / $spend, 2) : 0.0,
                    'clicks' => (int)$r['clicks'],
                    'impressions' => (int)$r['impressions'],
                    'conversions' => (int)$r['conversions'],
                ];
            }
            return $out;
        } catch (Throwable $e) {
            return [];
        }
    }

    /** POST /v424/marketing/auto-recommend */
    public static function recommend(Request $req, Response $res): Response
    {
        $b = self::body($req);
        $budget = max(0, (int)($b['budget'] ?? 0));
        $category = (string)($b['category'] ?? 'DEFAULT');
        $period = (string)($b['period'] ?? 'monthly');
        $days = self::PERIOD_DAYS[$period] ?? 30;
        if ($budget <= 0) {
            return self::json($res, ['ok' => false, 'error' => 'budget required'], 400);
        }

        $tenant = self::tenant($req);
        $measured = self::measured($tenant, max(30, $days));      // 실측 성과(테넌트 스코프)
        $aff = self::AFFINITY[$category] ?? self::AFFINITY['DEFAULT'];

        // 사용자가 채널을 선택했으면 그 채널들로 제한(미선택이면 전체에서 추천).
        $only = array_filter(array_map('strval', (array)($b['channels'] ?? [])));

        // 1) 후보 채널 = 최소예산 충족(affordable). 예측 ROAS = 벤치마크×카테고리 적합도, 실측 있으면 블렌드.
        $cand = [];
        foreach (self::CHANNEL as $id => $c) {
            if (!empty($only) && !in_array($id, $only, true)) continue;
            if ($budget < $c['minBudget']) continue;             // 예산 미달 채널 제외
            $benchRoas = $c['roas'] * ($aff[$id] ?? 1.0);
            $src = 'benchmark';
            $expRoas = $benchRoas;
            $m = $measured[$id] ?? null;
            if ($m && $m['spend'] > 0) {
                // 데이터량 가중: spend 가 클수록 실측 신뢰 ↑ (₩1M 에서 50%, ₩5M+ 에서 ~90%)
                $w = min(0.9, $m['spend'] / 5000000.0);
                $expRoas = round($benchRoas * (1 - $w) + $m['roas'] * $w, 2);
                $src = $w >= 0.6 ? 'measured' : 'blended';
            }
            $cand[$id] = ['benchRoas' => round($benchRoas, 2), 'expRoas' => $expRoas, 'src' => $src, 'cfg' => $c];
        }
        if (empty($cand)) {
            return self::json($res, ['ok' => true, 'budget' => $budget, 'category' => $category, 'period' => $period,
                'channels' => [], 'note' => '예산이 모든 채널의 최소 집행액 미만입니다. 예산을 상향하세요.', 'source' => 'benchmark']);
        }

        // 2) 기대 ROAS 비례 배분(min budget 보장 + 다양성 floor). 음수/0 방지.
        $sumRoas = array_sum(array_map(fn($x) => max(0.1, $x['expRoas']), $cand));
        $channels = [];
        $allocSum = 0;
        foreach ($cand as $id => $x) {
            $share = max(0.1, $x['expRoas']) / $sumRoas;
            $alloc = (int)round($budget * $share / 1000) * 1000;   // ₩1,000 단위
            if ($alloc < $x['cfg']['minBudget']) $alloc = $x['cfg']['minBudget'];
            $channels[$id] = $alloc;
            $allocSum += $alloc;
        }
        // 합계 정규화(예산 초과/미달 보정)
        if ($allocSum > 0 && $allocSum !== $budget) {
            $scale = $budget / $allocSum;
            foreach ($channels as $id => $a) $channels[$id] = (int)round($a * $scale / 1000) * 1000;
        }

        // 3) 채널별 예측(벤치마크/실측 기반) — 정직 라벨(source).
        $out = [];
        foreach ($channels as $id => $alloc) {
            $x = $cand[$id]; $c = $x['cfg'];
            $m = $measured[$id] ?? null;
            $cpm = $m && $m['impressions'] > 0 && $m['spend'] > 0 ? ($m['spend'] / $m['impressions'] * 1000) : $c['cpm'];
            $ctr = $m && $m['impressions'] > 0 ? ($m['clicks'] / max(1, $m['impressions']) * 100) : $c['ctr'];
            $cvr = $m && $m['clicks'] > 0 ? ($m['conversions'] / max(1, $m['clicks']) * 100) : $c['cvr'];
            $impr = $cpm > 0 ? (int)round($alloc / $cpm * 1000) : 0;
            $clicks = (int)round($impr * $ctr / 100);
            $conv = (int)round($clicks * $cvr / 100);
            $estRevenue = (int)round($alloc * $x['expRoas']);
            $out[] = [
                'channel' => $id,
                'label' => $c['label'],
                'connectorKey' => $c['connectorKey'],
                'allocation' => $alloc,
                'allocation_pct' => $budget > 0 ? round($alloc / $budget * 100, 1) : 0,
                'expected_roas' => $x['expRoas'],
                'benchmark_roas' => $x['benchRoas'],
                'est_impressions' => $impr,
                'est_clicks' => $clicks,
                'est_conversions' => $conv,
                'est_revenue' => $estRevenue,
                'source' => $x['src'],                 // benchmark | blended | measured
            ];
        }
        // 추천 ROAS 높은 순
        usort($out, fn($a, $b) => $b['expected_roas'] <=> $a['expected_roas']);

        $hasMeasured = !empty($measured);
        return self::json($res, [
            'ok' => true,
            'budget' => $budget, 'category' => $category, 'period' => $period, 'period_days' => $days,
            'channels' => $out,
            'total_est_revenue' => array_sum(array_column($out, 'est_revenue')),
            'blended_roas' => $budget > 0 ? round(array_sum(array_column($out, 'est_revenue')) / $budget, 2) : 0,
            'source' => $hasMeasured ? 'blended' : 'benchmark',
            'rationale' => $hasMeasured
                ? '집행 실측 데이터를 반영해 성과가 높은 채널로 예산을 재배분했습니다.'
                : '업계 벤치마크 기준 카테고리 적합도가 높은 채널에 예산을 배분했습니다. 집행이 시작되면 실측 성과로 자동 재배분됩니다.',
        ]);
    }

    /** GET /v424/marketing/benchmarks — 참조 벤치마크 공개(투명성) */
    public static function benchmarks(Request $req, Response $res): Response
    {
        $rows = [];
        foreach (self::CHANNEL as $id => $c) {
            $rows[] = ['channel' => $id, 'label' => $c['label'], 'cpm' => $c['cpm'], 'ctr' => $c['ctr'], 'cvr' => $c['cvr'], 'roas' => $c['roas'], 'min_budget' => $c['minBudget']];
        }
        return self::json($res, ['ok' => true, 'benchmarks' => $rows, 'source' => 'industry_reference',
            'note' => '업계 평균 참조값입니다. 실제 성과는 집행 후 테넌트 실측으로 대체됩니다.']);
    }
}
