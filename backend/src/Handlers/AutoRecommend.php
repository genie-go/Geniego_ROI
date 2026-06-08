<?php
declare(strict_types=1);

namespace Genie\Handlers;

use Genie\Db;
use PDO;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Throwable;

/**
 * 마케팅 자동화 추천·예산배분 엔진 v2 (202차 초고도화).
 *
 * 글로벌 마케팅 대행사/세계 최고 광고 자동화(Google PMax·Meta Advantage+·Smartly·Albert.ai) 수준의
 * 의사결정 두뇌를 목표로, 단순 ROAS 비례 배분(v1)을 다음으로 재구축한다:
 *
 *   1) 다목표 최적화(Multi-objective): ROAS(효율) + CAC(획득비용) + 성장(전환량) + 다양성(리스크 분산)을
 *      objective(roas|cac|growth|balanced)에 따라 가중 결합. min-max 정규화로 이종 지표 합성.
 *   2) 경험적 베이즈(Empirical Bayes) 신뢰도 블렌딩: 실측을 spend가 아닌 "전환수(표본수)" 기반
 *      confidence = conv/(conv+PRIOR)로 벤치마크에 수축(shrinkage). 표본 적으면 벤치마크 우위, 많으면 실측 우위.
 *   3) UCB Bandit 탐색: 데이터가 적은(불확실한) 고잠재 채널에 상한신뢰구간 보너스를 부여해
 *      탐색-활용(explore-exploit) 균형. 무작위 아닌 결정적 UCB(재현성).
 *   4) 가드레일: 채널 최소예산 floor + 최대 점유율 cap(과집중 차단) + 최소 ROAS gate(손실 채널 배제).
 *   5) 페이싱: 일/주 예산 페이스 산출(과소진 방지).
 *   6) DB 기반 갱신 가능 벤치마크(channel_benchmark): 상수 시드 + 관리자 갱신(시장 변동 반영). 전역 참조.
 *
 * ★ 격리: 벤치마크는 업계 평균(전역 참조, 가격표 동급). 실측은 tenant_id 스코프 강제(교차유입 0).
 *
 * Endpoints:
 *   POST /v424/marketing/auto-recommend  — {budget, category, period, objective?, channels?, guardrails?}
 *   GET  /v424/marketing/benchmarks      — 벤치마크 참조표(투명성, DB 우선)
 *   PUT  /v424/marketing/benchmarks      — 벤치마크 갱신(관리자, 시장 변동 반영)
 */
final class AutoRecommend
{
    /** 채널 기본 벤치마크 시드(업계 평균). DB(channel_benchmark) 미존재 시 폴백·시드 원본. */
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

    /** 경험적 베이즈 사전 강도(전환수). 이만큼 전환이 쌓이면 실측 신뢰도 50%. */
    private const PRIOR_CONV = 30.0;
    /** UCB 탐색 강도(0=순수 활용, 클수록 탐색↑). 점수 정규화(0~1) 대비 보너스 스케일. */
    private const UCB_C = 0.25;
    /** 다양성 가드: 단일 채널 최대 예산 점유율 기본 상한. */
    private const MAX_SHARE_DEFAULT = 0.6;

    private static function tenant(Request $req): string
    {
        try {
            $st = UserAuth::authedTenant($req);
            if (is_string($st) && $st !== '' && strtolower($st) !== 'unknown') return $st;
        } catch (\Throwable $e) {}
        // ★ 202차 P1(격리): raw X-Tenant-Id 헤더 폴백 제거. api_key 인증 시 AI-게이트(index.php)가
        //   키의 tenant_id 를 auth_tenant 속성으로 주입(위조 불가)하므로 그 권위 소스만 신뢰한다.
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

    // ── 벤치마크: DB(channel_benchmark) 우선, 상수 폴백·시드 ──────────────────────
    private static function ensureBenchmarkTable(PDO $pdo): void
    {
        $pdo->exec("CREATE TABLE IF NOT EXISTS channel_benchmark (
            channel VARCHAR(40) PRIMARY KEY,
            label VARCHAR(80),
            cpm REAL DEFAULT 0,
            ctr REAL DEFAULT 0,
            cvr REAL DEFAULT 0,
            roas REAL DEFAULT 0,
            min_budget INTEGER DEFAULT 0,
            connector_key VARCHAR(40),
            updated_at VARCHAR(32)
        )");
        // 비어 있으면 상수에서 시드(전역 참조 — 테넌트 무관)
        try {
            $cnt = (int)$pdo->query('SELECT COUNT(*) FROM channel_benchmark')->fetchColumn();
            if ($cnt === 0) {
                $now = gmdate('c');
                $ins = $pdo->prepare('INSERT INTO channel_benchmark(channel,label,cpm,ctr,cvr,roas,min_budget,connector_key,updated_at) VALUES(?,?,?,?,?,?,?,?,?)');
                foreach (self::CHANNEL as $id => $c) {
                    $ins->execute([$id, $c['label'], $c['cpm'], $c['ctr'], $c['cvr'], $c['roas'], $c['minBudget'], $c['connectorKey'], $now]);
                }
            }
        } catch (Throwable $e) { /* 시드 실패는 폴백으로 동작 */ }
    }

    /** 벤치마크 로드 — DB 우선(갱신 가능), 미존재 채널은 상수 폴백. 항상 6채널 보장. */
    private static function loadBenchmarks(): array
    {
        $out = [];
        foreach (self::CHANNEL as $id => $c) {
            $out[$id] = ['label' => $c['label'], 'cpm' => (float)$c['cpm'], 'ctr' => (float)$c['ctr'],
                'cvr' => (float)$c['cvr'], 'roas' => (float)$c['roas'], 'minBudget' => (int)$c['minBudget'],
                'connectorKey' => $c['connectorKey']];
        }
        try {
            $pdo = Db::pdo();
            self::ensureBenchmarkTable($pdo);
            foreach ($pdo->query('SELECT * FROM channel_benchmark')->fetchAll(PDO::FETCH_ASSOC) as $r) {
                $id = (string)$r['channel'];
                if (!isset($out[$id])) continue; // 알려진 채널만(미지 채널 무시)
                $out[$id] = [
                    'label' => $r['label'] ?: $out[$id]['label'],
                    'cpm' => (float)$r['cpm'] ?: $out[$id]['cpm'],
                    'ctr' => (float)$r['ctr'] ?: $out[$id]['ctr'],
                    'cvr' => (float)$r['cvr'] ?: $out[$id]['cvr'],
                    'roas' => (float)$r['roas'] ?: $out[$id]['roas'],
                    'minBudget' => (int)$r['min_budget'] ?: $out[$id]['minBudget'],
                    'connectorKey' => $r['connector_key'] ?: $out[$id]['connectorKey'],
                ];
            }
        } catch (Throwable $e) { /* DB 불가 → 상수 폴백 */ }
        return $out;
    }

    /** 테넌트 실측 채널 성과(최근 N일). 없으면 빈 배열. ★tenant_id 스코프 필수. */
    private static function measured(string $tenant, int $days): array
    {
        if ($tenant === '') return [];
        try {
            $pdo = Db::pdo();
            $days = max(1, min(365, $days));
            $sql = 'SELECT channel, SUM(spend) AS spend, SUM(revenue) AS revenue, '
                . 'SUM(impressions) AS impressions, SUM(clicks) AS clicks, SUM(conversions) AS conversions '
                . 'FROM performance_metrics '
                . 'WHERE tenant_id = :t AND channel IS NOT NULL '
                . "AND date >= DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL " . $days . " DAY), '%Y-%m-%d') "
                . 'GROUP BY channel';
            $stmt = $pdo->prepare($sql);
            $stmt->execute([':t' => $tenant]);
            $out = [];
            foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $r) {
                $spend = (float)$r['spend'];
                $conv  = (int)$r['conversions'];
                $out[$r['channel']] = [
                    'spend' => $spend,
                    'revenue' => (float)$r['revenue'],
                    'roas' => $spend > 0 ? round(((float)$r['revenue']) / $spend, 2) : 0.0,
                    'clicks' => (int)$r['clicks'],
                    'impressions' => (int)$r['impressions'],
                    'conversions' => $conv,
                    'cac' => $conv > 0 ? round($spend / $conv, 0) : 0.0,
                ];
            }
            return $out;
        } catch (Throwable $e) {
            return [];
        }
    }

    /** min-max 정규화(0~1). 모두 동일하면 0.5. */
    private static function normalize(array $vals): array
    {
        if (empty($vals)) return [];
        $min = min($vals); $max = max($vals);
        if ($max - $min < 1e-9) { return array_map(fn() => 0.5, $vals); }
        $out = [];
        foreach ($vals as $k => $v) $out[$k] = ($v - $min) / ($max - $min);
        return $out;
    }

    /** POST /v424/marketing/auto-recommend */
    public static function recommend(Request $req, Response $res): Response
    {
        $b = self::body($req);
        $budget = max(0, (int)($b['budget'] ?? 0));
        $category = (string)($b['category'] ?? 'DEFAULT');
        $period = (string)($b['period'] ?? 'monthly');
        $days = self::PERIOD_DAYS[$period] ?? 30;
        $objective = strtolower((string)($b['objective'] ?? 'balanced'));   // roas|cac|growth|balanced
        if (!in_array($objective, ['roas', 'cac', 'growth', 'balanced'], true)) $objective = 'balanced';
        if ($budget <= 0) {
            return self::json($res, ['ok' => false, 'error' => 'budget required'], 400);
        }

        // 가드레일(요청 override 가능) — 다양성/리스크 관리.
        $g = (array)($b['guardrails'] ?? []);
        $maxShare = (float)($g['max_share'] ?? self::MAX_SHARE_DEFAULT);          // 단일 채널 최대 점유율
        $maxShare = max(0.2, min(1.0, $maxShare));
        $minRoasGate = (float)($g['min_roas'] ?? 0.0);                            // 이 ROAS 미만 채널 배제(0=미적용)
        $explore = (float)($g['exploration'] ?? self::UCB_C);                     // 탐색 강도
        $explore = max(0.0, min(1.0, $explore));

        $tenant = self::tenant($req);
        $measured = self::measured($tenant, max(30, $days));      // 실측 성과(테넌트 스코프)
        $aff = self::AFFINITY[$category] ?? self::AFFINITY['DEFAULT'];
        $bench = self::loadBenchmarks();
        $only = array_filter(array_map('strval', (array)($b['channels'] ?? [])));

        // 전체 전환수(UCB 탐색 분모용)
        $totalConv = 0; foreach ($measured as $m) $totalConv += (int)($m['conversions'] ?? 0);

        // 1) 후보 채널 산정 + 지표 추정(경험적 베이즈 블렌딩).
        $cand = [];
        foreach ($bench as $id => $c) {
            if (!empty($only) && !in_array($id, $only, true)) continue;
            if ($budget < $c['minBudget']) continue;             // 예산 미달 채널 제외
            $affw = $aff[$id] ?? 1.0;
            $benchRoas = $c['roas'] * $affw;
            // 벤치마크 CAC(획득비용) = cpm*10 / (ctr*cvr) (1000노출당 전환수 역산). ctr/cvr 0 방지.
            $benchCac = ($c['ctr'] > 0 && $c['cvr'] > 0) ? ($c['cpm'] * 10.0 / ($c['ctr'] * $c['cvr'])) : ($c['cpm'] * 50);
            // 성장 잠재(1000노출당 전환 = 0.1*ctr*cvr), 적합도 반영.
            $benchGrowth = 0.1 * $c['ctr'] * $c['cvr'] * $affw;

            $src = 'benchmark'; $conf = 0.0;
            $expRoas = round($benchRoas, 2); $expCac = round($benchCac, 0); $expGrowth = $benchGrowth;
            $m = $measured[$id] ?? null;
            if ($m && $m['conversions'] > 0) {
                // 경험적 베이즈: 신뢰도 = 전환수/(전환수+사전강도). 표본 많을수록 실측 우위.
                $conf = $m['conversions'] / ($m['conversions'] + self::PRIOR_CONV);
                $expRoas = round($benchRoas * (1 - $conf) + $m['roas'] * $conf, 2);
                $mCac = $m['cac'] > 0 ? $m['cac'] : $benchCac;
                $expCac = round($benchCac * (1 - $conf) + $mCac * $conf, 0);
                $mGrowth = $m['impressions'] > 0 ? ($m['conversions'] / $m['impressions'] * 1000) : $benchGrowth;
                $expGrowth = $benchGrowth * (1 - $conf) + $mGrowth * $conf;
                $src = $conf >= 0.6 ? 'measured' : 'blended';
            }
            // 최소 ROAS gate(가드레일): 손실 채널 배제(단, 탐색 대상은 유지 위해 데이터 있는 채널만 컷).
            if ($minRoasGate > 0 && $conf >= 0.6 && $expRoas < $minRoasGate) continue;

            // UCB 탐색 보너스: 데이터 적은 고잠재 채널에 상한신뢰구간 가산(결정적).
            $chConv = (int)($m['conversions'] ?? 0);
            $ucb = $explore * sqrt(log($totalConv + 2.0) / ($chConv + 1.0));

            $cand[$id] = [
                'cfg' => $c, 'affw' => $affw, 'conf' => round($conf, 2), 'src' => $src,
                'expRoas' => $expRoas, 'expCac' => $expCac, 'expGrowth' => $expGrowth,
                'benchRoas' => round($benchRoas, 2), 'ucb' => $ucb,
            ];
        }
        if (empty($cand)) {
            return self::json($res, ['ok' => true, 'budget' => $budget, 'category' => $category, 'period' => $period,
                'objective' => $objective, 'channels' => [],
                'note' => '조건(최소예산/ROAS 가드레일)을 충족하는 채널이 없습니다. 예산을 상향하거나 가드레일을 완화하세요.', 'source' => 'benchmark']);
        }

        // 2) 다목표 점수 = 정규화된 ROAS·CAC(역)·성장 가중 결합 + UCB 탐색 보너스.
        $roasN = self::normalize(array_map(fn($x) => $x['expRoas'], $cand));
        $cacInvN = self::normalize(array_map(fn($x) => $x['expCac'] > 0 ? 1.0 / $x['expCac'] : 0.0, $cand)); // 낮을수록 좋음→역수
        $growthN = self::normalize(array_map(fn($x) => $x['expGrowth'], $cand));
        // objective별 가중치
        $W = [
            'roas'     => ['roas' => 0.75, 'cac' => 0.20, 'growth' => 0.05],
            'cac'      => ['roas' => 0.20, 'cac' => 0.70, 'growth' => 0.10],
            'growth'   => ['roas' => 0.25, 'cac' => 0.15, 'growth' => 0.60],
            'balanced' => ['roas' => 0.45, 'cac' => 0.30, 'growth' => 0.25],
        ][$objective];

        $scores = [];
        foreach ($cand as $id => $x) {
            $base = $W['roas'] * ($roasN[$id] ?? 0.5)
                  + $W['cac'] * ($cacInvN[$id] ?? 0.5)
                  + $W['growth'] * ($growthN[$id] ?? 0.5);
            $scores[$id] = max(0.01, $base + $x['ucb']);   // 탐색 보너스 가산
        }

        // 3) 점수 비례 배분 + 가드레일(min 예산 floor, max 점유율 cap) + 정규화.
        $sumScore = array_sum($scores);
        $channels = [];
        foreach ($cand as $id => $x) {
            $share = $scores[$id] / $sumScore;
            $share = min($maxShare, $share);                          // 과집중 cap
            $alloc = (int)round($budget * $share / 1000) * 1000;
            if ($alloc < $x['cfg']['minBudget']) $alloc = $x['cfg']['minBudget']; // min floor
            $channels[$id] = $alloc;
        }
        // 합계 정규화(예산 일치 — cap/floor 보정으로 어긋난 총액 재스케일)
        $allocSum = array_sum($channels);
        if ($allocSum > 0 && $allocSum !== $budget) {
            $scale = $budget / $allocSum;
            foreach ($channels as $id => $a) $channels[$id] = (int)round($a * $scale / 1000) * 1000;
        }

        // 4) 채널별 예측·페이싱·근거(정직 라벨 source/confidence).
        $weeks = max(1, (int)round($days / 7));
        $out = [];
        foreach ($channels as $id => $alloc) {
            $x = $cand[$id]; $c = $x['cfg']; $m = $measured[$id] ?? null;
            $cpm = $m && $m['impressions'] > 0 && $m['spend'] > 0 ? ($m['spend'] / $m['impressions'] * 1000) : $c['cpm'];
            $ctr = $m && $m['impressions'] > 0 ? ($m['clicks'] / max(1, $m['impressions']) * 100) : $c['ctr'];
            $cvr = $m && $m['clicks'] > 0 ? ($m['conversions'] / max(1, $m['clicks']) * 100) : $c['cvr'];
            $impr = $cpm > 0 ? (int)round($alloc / $cpm * 1000) : 0;
            $clicks = (int)round($impr * $ctr / 100);
            $conv = (int)round($clicks * $cvr / 100);
            $estRevenue = (int)round($alloc * $x['expRoas']);
            $isExplore = $x['conf'] < 0.3 && $x['ucb'] > 0.05;   // 데이터 적은 탐색 채널 표시
            $rationale = $x['src'] === 'measured'
                ? "실측 전환 {$m['conversions']}건(신뢰도 " . round($x['conf'] * 100) . "%) 기반 — 성과 검증 채널"
                : ($x['src'] === 'blended'
                    ? "벤치마크+실측 블렌드(신뢰도 " . round($x['conf'] * 100) . "%)"
                    : ($isExplore ? "업계 벤치마크 기반 — 탐색(미검증 고잠재) 채널" : "업계 벤치마크 기반 추천"));
            $out[] = [
                'channel' => $id,
                'label' => $c['label'],
                'connectorKey' => $c['connectorKey'],
                'allocation' => $alloc,
                'allocation_pct' => $budget > 0 ? round($alloc / $budget * 100, 1) : 0,
                'daily_pace' => $days > 0 ? (int)round($alloc / $days / 100) * 100 : $alloc,   // 일 예산 페이스
                'weekly_pace' => (int)round($alloc / $weeks / 1000) * 1000,
                'expected_roas' => $x['expRoas'],
                'benchmark_roas' => $x['benchRoas'],
                'expected_cac' => (int)round($x['expCac']),                                     // 예상 획득비용(원)
                'confidence' => $x['conf'],                                                     // 0~1 실측 신뢰도
                'est_impressions' => $impr,
                'est_clicks' => $clicks,
                'est_conversions' => $conv,
                'est_revenue' => $estRevenue,
                'source' => $x['src'],                 // benchmark | blended | measured
                'exploration' => $isExplore,           // 탐색 채널 여부(bandit)
                'rationale' => $rationale,
            ];
        }
        // 예산 비중 높은 순(추천 우선순위)
        usort($out, fn($a, $b) => $b['allocation'] <=> $a['allocation']);

        $hasMeasured = !empty($measured);
        $totalRev = array_sum(array_column($out, 'est_revenue'));
        $totalConvOut = array_sum(array_column($out, 'est_conversions'));
        return self::json($res, [
            'ok' => true,
            'budget' => $budget, 'category' => $category, 'period' => $period, 'period_days' => $days,
            'objective' => $objective,
            'guardrails' => ['max_share' => $maxShare, 'min_roas' => $minRoasGate, 'exploration' => $explore],
            'channels' => $out,
            'total_est_revenue' => $totalRev,
            'total_est_conversions' => $totalConvOut,
            'blended_roas' => $budget > 0 ? round($totalRev / $budget, 2) : 0,
            'blended_cac' => $totalConvOut > 0 ? (int)round($budget / $totalConvOut) : 0,
            'source' => $hasMeasured ? 'blended' : 'benchmark',
            'engine' => 'multi-objective-v2',
            'rationale' => $hasMeasured
                ? "목표('{$objective}') 기준 다목표 최적화 — 실측 전환 데이터(경험적 베이즈)를 반영해 효율·획득비용·성장·다양성을 균형있게 재배분했습니다. 데이터가 적은 고잠재 채널엔 탐색 예산을 일부 배정했습니다."
                : "목표('{$objective}') 기준 다목표 최적화 — 업계 벤치마크×카테고리 적합도로 효율·획득비용·성장을 평가해 배분했습니다. 집행 실측이 쌓이면 경험적 베이즈로 자동 재학습됩니다.",
        ]);
    }

    /** GET /v424/marketing/benchmarks — 참조 벤치마크 공개(DB 우선, 투명성) */
    public static function benchmarks(Request $req, Response $res): Response
    {
        $rows = [];
        foreach (self::loadBenchmarks() as $id => $c) {
            $rows[] = ['channel' => $id, 'label' => $c['label'], 'cpm' => $c['cpm'], 'ctr' => $c['ctr'],
                'cvr' => $c['cvr'], 'roas' => $c['roas'], 'min_budget' => $c['minBudget']];
        }
        return self::json($res, ['ok' => true, 'benchmarks' => $rows, 'source' => 'industry_reference',
            'note' => '업계 평균 참조값입니다(DB 우선·관리자 갱신 가능). 실제 성과는 집행 후 테넌트 실측으로 대체됩니다.']);
    }

    /** PUT /v424/marketing/benchmarks — 벤치마크 갱신(관리자, 시장 변동 반영). body: {benchmarks:[{channel,cpm,ctr,cvr,roas,min_budget}]} */
    public static function updateBenchmarks(Request $req, Response $res): Response
    {
        // 관리자 게이트: auth_role=admin 또는 admin:keys/write:* 스코프(api_key 미들웨어 주입).
        //   벤치마크는 전역 참조데이터(전 테넌트 영향)이므로 관리자/쓰기권한 키만 갱신 허용.
        $role = (string)($req->getAttribute('auth_role') ?? '');
        $keyRow = (array)($req->getAttribute('auth_key') ?? []);
        $scopes = [];
        if (!empty($keyRow['scopes_json'])) {
            $dec = json_decode((string)$keyRow['scopes_json'], true);
            if (is_array($dec)) $scopes = $dec;
        }
        if ($role !== 'admin' && !in_array('admin:keys', $scopes, true) && !in_array('write:*', $scopes, true)) {
            return self::json($res, ['ok' => false, 'error' => 'admin or admin:keys/write:* scope required'], 403);
        }
        $b = self::body($req);
        $items = (array)($b['benchmarks'] ?? []);
        if (empty($items)) return self::json($res, ['ok' => false, 'error' => 'benchmarks[] required'], 422);
        try {
            $pdo = Db::pdo();
            self::ensureBenchmarkTable($pdo);
            $now = gmdate('c');
            $driver = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME);
            $updated = 0;
            foreach ($items as $it) {
                $id = (string)($it['channel'] ?? '');
                if (!isset(self::CHANNEL[$id])) continue;     // 알려진 채널만
                $def = self::CHANNEL[$id];
                $vals = [
                    $id,
                    (string)($it['label'] ?? $def['label']),
                    (float)($it['cpm'] ?? $def['cpm']),
                    (float)($it['ctr'] ?? $def['ctr']),
                    (float)($it['cvr'] ?? $def['cvr']),
                    (float)($it['roas'] ?? $def['roas']),
                    (int)($it['min_budget'] ?? $def['minBudget']),
                    $def['connectorKey'],
                    $now,
                ];
                if ($driver === 'mysql') {
                    $pdo->prepare('INSERT INTO channel_benchmark(channel,label,cpm,ctr,cvr,roas,min_budget,connector_key,updated_at)
                        VALUES(?,?,?,?,?,?,?,?,?)
                        ON DUPLICATE KEY UPDATE label=VALUES(label),cpm=VALUES(cpm),ctr=VALUES(ctr),cvr=VALUES(cvr),roas=VALUES(roas),min_budget=VALUES(min_budget),updated_at=VALUES(updated_at)')
                        ->execute($vals);
                } else {
                    $pdo->prepare('INSERT INTO channel_benchmark(channel,label,cpm,ctr,cvr,roas,min_budget,connector_key,updated_at)
                        VALUES(?,?,?,?,?,?,?,?,?)
                        ON CONFLICT(channel) DO UPDATE SET label=excluded.label,cpm=excluded.cpm,ctr=excluded.ctr,cvr=excluded.cvr,roas=excluded.roas,min_budget=excluded.min_budget,updated_at=excluded.updated_at')
                        ->execute($vals);
                }
                $updated++;
            }
            return self::json($res, ['ok' => true, 'updated' => $updated]);
        } catch (Throwable $e) {
            return self::json($res, ['ok' => false, 'error' => substr($e->getMessage(), 0, 120)], 500);
        }
    }
}
