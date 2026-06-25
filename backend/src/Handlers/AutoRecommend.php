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
        // [현 차수] 프론트 17개 업종 전수 커버(이전엔 미정의→DEFAULT 균일 폴백, 차별화 무력).
        'general'      => ['naver' => 1.2, 'coupang_ads' => 1.3, 'meta' => 1.1, 'google' => 1.0, 'kakao' => 1.0, 'tiktok' => 0.9],
        'travel'       => ['meta' => 1.3, 'google' => 1.3, 'naver' => 1.2, 'tiktok' => 1.1, 'kakao' => 1.0, 'coupang_ads' => 0.7],
        'platform'     => ['google' => 1.4, 'naver' => 1.2, 'meta' => 1.0, 'kakao' => 0.9, 'tiktok' => 0.8, 'coupang_ads' => 0.7],
        'overseas_ship'=> ['google' => 1.3, 'naver' => 1.2, 'meta' => 1.2, 'kakao' => 1.0, 'tiktok' => 1.0, 'coupang_ads' => 0.8],
        'overseas_buy' => ['meta' => 1.3, 'google' => 1.2, 'naver' => 1.2, 'tiktok' => 1.2, 'kakao' => 1.0, 'coupang_ads' => 0.9],
        'finance'      => ['google' => 1.4, 'naver' => 1.3, 'kakao' => 1.2, 'meta' => 1.1, 'tiktok' => 0.8, 'coupang_ads' => 0.7],
        'insurance'    => ['naver' => 1.4, 'google' => 1.3, 'kakao' => 1.2, 'meta' => 1.0, 'tiktok' => 0.7, 'coupang_ads' => 0.6],
        'medical'      => ['naver' => 1.4, 'google' => 1.3, 'kakao' => 1.2, 'meta' => 1.0, 'tiktok' => 0.8, 'coupang_ads' => 0.6],
        'tax'          => ['naver' => 1.4, 'google' => 1.3, 'kakao' => 1.1, 'meta' => 0.9, 'tiktok' => 0.7, 'coupang_ads' => 0.6],
        'legal'        => ['naver' => 1.4, 'google' => 1.4, 'kakao' => 1.1, 'meta' => 0.9, 'tiktok' => 0.7, 'coupang_ads' => 0.6],
        'etc_service'  => ['naver' => 1.2, 'google' => 1.2, 'meta' => 1.1, 'kakao' => 1.1, 'tiktok' => 1.0, 'coupang_ads' => 0.8],
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
            // [239차+ P2] 진실 ROAS 소비 — measured ROAS 는 매체 자가보고 매출(뷰스루·중복 과대) 기반이었다.
            //   추천이 실주문 귀속 매출로 보정되도록, 옵티마이저(AutoCampaign)와 동일한 truthRatio(클램프·MIN_ATTR_CONV
            //   게이트)를 적용 → 추천·집행 두뇌가 동일 진실 기준 사용. 귀속 데이터 부족 채널은 매체보고 폴백(회귀 0).
            $since = gmdate('Y-m-d', time() - $days * 86400);
            $out = [];
            foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $r) {
                $spend = (float)$r['spend'];
                $conv  = (int)$r['conversions'];
                $mediaRev = (float)$r['revenue'];
                $tr = AutoCampaign::truthRatioForChannel($pdo, $tenant, (string)$r['channel'], $mediaRev, $since);
                $revenue = $tr !== null ? round($mediaRev * $tr, 2) : $mediaRev;
                $out[$r['channel']] = [
                    'spend' => $spend,
                    'revenue' => $revenue,
                    'roas' => $spend > 0 ? round($revenue / $spend, 2) : 0.0,
                    'clicks' => (int)$r['clicks'],
                    'impressions' => (int)$r['impressions'],
                    'conversions' => $conv,
                    'cac' => $conv > 0 ? round($spend / $conv, 0) : 0.0,
                    'truth_adjusted' => $tr !== null,
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
    /** [현 차수] 선택 카테고리들의 채널 적합도를 평균 블렌딩. 빈 입력은 DEFAULT(균일). */
    private static function blendAffinity(array $categories): array
    {
        $chans = ['meta', 'google', 'tiktok', 'naver', 'kakao', 'coupang_ads'];
        $cats = array_values(array_filter($categories, fn($c) => $c !== '' && $c !== 'DEFAULT'));
        if (empty($cats)) return self::AFFINITY['DEFAULT'];
        $sum = array_fill_keys($chans, 0.0); $n = 0;
        foreach ($cats as $c) {
            $row = self::AFFINITY[$c] ?? self::AFFINITY['DEFAULT'];
            foreach ($chans as $ch) $sum[$ch] += (float)($row[$ch] ?? 1.0);
            $n++;
        }
        if ($n === 0) return self::AFFINITY['DEFAULT'];
        foreach ($chans as $ch) $sum[$ch] = round($sum[$ch] / $n, 3);
        return $sum;
    }

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
        // [현 차수] 다중 카테고리 지원 — 선택한 판매상품 카테고리 전체의 적합도를 블렌딩(평균).
        //   (이전엔 selCats[0] 단일값만 반영해 다중선택이 무력했음.)
        $categories = array_values(array_filter(array_map('strval', (array)($b['categories'] ?? []))));
        if (empty($categories) && $category !== '' && $category !== 'DEFAULT') $categories = [$category];
        $aff = self::blendAffinity($categories);
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

        // [현 차수] ★한계ROAS(체감수익) 배분 모드 — mode=marginal. 채널 지출↔매출 일별 포화곡선 R=a·s^b(b<1)
        //   적합 → 한계ROAS(dR/ds) 균등화 water-filling + 목표ROAS 미만 정지(잔여=절감). "최소 비용·최대 효과":
        //   다음 1원의 한계수익이 목표 밑인 곳엔 추가 투입 안 함. 기본=기존 점수비례(안전·무회귀). 모든 값 실측 파생.
        $allocMode = strtolower((string)($b['mode'] ?? $b['alloc'] ?? ''));
        if ($allocMode === 'marginal') {
            return self::marginalRecommend($res, $tenant, $budget, $category, $period, $days, $objective, $maxShare, $minRoasGate, $cand, $measured);
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

    /**
     * [현 차수] 채널 지출↔매출 반응(포화)곡선 적합 — 일별 (spend, revenue) 시계열로 R=a·s^b(체감수익 b<1) 추정.
     *   log-log 선형회귀(ln R = ln a + b·ln s). b 는 (0.05,0.98)로 클램프(비포화/이상치 방지), a 는 역사적 중심점
     *   통과하도록 재고정(robust). 일별 유효점 3개 미만 채널은 제외(적합 불가=정직 폴백). 모든 값 실측.
     *   반환: [channel => ['a','b','n','r2','avgSpend']].
     */
    private static function fitChannelResponse(string $tenant, int $days): array
    {
        $out = [];
        if ($tenant === '') return $out;
        try {
            $pdo = Db::pdo();
            $days = max(14, min(365, $days));
            $sql = "SELECT channel, date, SUM(spend) AS sp, SUM(revenue) AS rv FROM performance_metrics "
                 . "WHERE tenant_id = :t AND channel IS NOT NULL "
                 . "AND date >= DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL " . $days . " DAY), '%Y-%m-%d') "
                 . "GROUP BY channel, date";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([':t' => $tenant]);
            $since = gmdate('Y-m-d', time() - $days * 86400);
            $series = [];
            foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $r) {
                $s = (float)$r['sp']; $v = (float)$r['rv'];
                if ($s > 0 && $v > 0) $series[(string)$r['channel']][] = [$s, $v];
            }
            foreach ($series as $ch => $pts) {
                $n = count($pts);
                if ($n < 3) continue;
                $sx = 0.0; $sy = 0.0; $sxx = 0.0; $sxy = 0.0; $sumS = 0.0; $sumV = 0.0;
                foreach ($pts as [$s, $v]) {
                    $x = log($s); $y = log($v);
                    $sx += $x; $sy += $y; $sxx += $x * $x; $sxy += $x * $y; $sumS += $s; $sumV += $v;
                }
                $den = $n * $sxx - $sx * $sx;
                if (abs($den) < 1e-9) continue;
                $bRaw = ($n * $sxy - $sx * $sy) / $den;
                $lnaRaw = ($sy - $bRaw * $sx) / $n;
                // R²(log 공간)
                $ybar = $sy / $n; $ssTot = 0.0; $ssRes = 0.0;
                foreach ($pts as [$s, $v]) {
                    $y = log($v); $yhat = $lnaRaw + $bRaw * log($s);
                    $ssTot += ($y - $ybar) ** 2; $ssRes += ($y - $yhat) ** 2;
                }
                $r2 = $ssTot > 1e-9 ? max(0.0, 1.0 - $ssRes / $ssTot) : 0.0;
                $b = max(0.05, min(0.98, $bRaw));          // 체감수익 강제(b<1)
                $avgSpend = $sumS / $n; $avgRev = $sumV / $n;
                $a = $avgSpend > 0 ? $avgRev / pow($avgSpend, $b) : 0.0;   // 곡선이 역사적 중심점 통과(robust)
                if ($a <= 0) continue;
                // [현 차수] ③ 증분성 보정 — 곡선 매출을 truthRatio(매체보고 과대분 제거·실귀속 비율)로 스케일 →
                //   한계ROAS 가 증분(귀속) 기준이 됨(measured()와 동일 진실). "가만둬도 전환될" 매체보고 과대분에
                //   과투자 방지. AutoCampaign::truthRatioForChannel 재사용(알고리즘 중복 0). a 만 스케일(b=포화형 불변).
                $tr = AutoCampaign::truthRatioForChannel($pdo, $tenant, (string)$ch, $sumV, $since);
                $truthAdj = ($tr !== null);
                if ($truthAdj && $tr > 0) $a *= $tr;
                $out[$ch] = ['a' => $a, 'b' => $b, 'n' => $n, 'r2' => round($r2, 2), 'avgSpend' => $avgSpend, 'truth_adjusted' => $truthAdj];
            }
        } catch (Throwable $e) { /* 적합 실패 = 빈 결과(정직 폴백) */ }
        return $out;
    }

    /**
     * [현 차수] 한계ROAS(체감수익) 배분 — 포화곡선 기반 water-filling. 한계ROAS(dR/ds=a·b·s^(b-1))가 가장 높은
     *   채널에 증분 배정을 반복하되, 목표ROAS 미만이면 정지(잔여 예산=절감). 곡선 미적합 채널은 평탄(상수 한계=expRoas)
     *   폴백. min_budget floor·max_share cap 준수. ★모든 값 실측 파생(날조 0)·정직 라벨(절감액·적합점수).
     */
    private static function marginalRecommend(Response $res, string $tenant, int $budget, string $category, string $period, int $days, string $objective, float $maxShare, float $minRoasGate, array $cand, array $measured): Response
    {
        $fits = self::fitChannelResponse($tenant, max(30, $days));
        $targetRoas = $minRoasGate > 0 ? $minRoasGate : 1.0;   // 목표(가드레일 없으면 손익분기 1.0x)
        $marginalOf = function (string $id, float $s) use ($cand, $fits): float {
            if (isset($fits[$id])) { $f = $fits[$id]; return $f['a'] * $f['b'] * pow(max($s, 1.0), $f['b'] - 1.0); }
            return (float)$cand[$id]['expRoas'];               // 곡선 없음 → 평탄(상수 한계=평균ROAS)
        };
        $alloc = array_fill_keys(array_keys($cand), 0);
        $step = max(1000, (int)(round($budget / 300 / 1000) * 1000));
        $cap = $budget * $maxShare;
        $spent = 0; $guard = 0;
        while ($spent + $step <= $budget && $guard++ < 100000) {
            $best = null; $bestM = -1.0;
            foreach ($cand as $id => $x) {
                if (($alloc[$id] + $step) > $cap) continue;
                $m = $marginalOf($id, $alloc[$id] + $step / 2.0);
                if ($m >= $targetRoas && $m > $bestM) { $bestM = $m; $best = $id; }
            }
            if ($best === null) break;                         // 모든 채널 한계ROAS < 목표 → 정지(잔여=절감)
            $alloc[$best] += $step; $spent += $step;
        }
        // min_budget floor 미달 채널은 비효율 진입 방지 위해 제외(정직)
        foreach ($alloc as $id => $a) {
            if ($a > 0 && $a < (int)$cand[$id]['cfg']['minBudget']) { $spent -= $a; $alloc[$id] = 0; }
        }
        $recSpent = $spent; $savings = max(0, $budget - $spent);

        $weeks = max(1, (int)round($days / 7));
        $out = [];
        foreach ($alloc as $id => $a) {
            if ($a <= 0) continue;
            $x = $cand[$id]; $c = $x['cfg']; $m = $measured[$id] ?? null; $f = $fits[$id] ?? null;
            $cpm = $m && $m['impressions'] > 0 && $m['spend'] > 0 ? ($m['spend'] / $m['impressions'] * 1000) : $c['cpm'];
            $ctr = $m && $m['impressions'] > 0 ? ($m['clicks'] / max(1, $m['impressions']) * 100) : $c['ctr'];
            $cvr = $m && $m['clicks'] > 0 ? ($m['conversions'] / max(1, $m['clicks']) * 100) : $c['cvr'];
            $impr = $cpm > 0 ? (int)round($a / $cpm * 1000) : 0;
            $clicks = (int)round($impr * $ctr / 100);
            $conv = (int)round($clicks * $cvr / 100);
            $mRoas = $marginalOf($id, (float)$a);
            $estRevenue = $f ? (int)round($f['a'] * pow($a, $f['b'])) : (int)round($a * $x['expRoas']);
            $avgRoas = $a > 0 ? round($estRevenue / $a, 2) : 0;
            $rationale = $f
                ? ("포화곡선 적합(일별 {$f['n']}점·R² {$f['r2']}" . (!empty($f['truth_adjusted']) ? "·증분보정" : "") . ") — 추천 지출의 한계ROAS {$mRoas}x 가 목표 {$targetRoas}x 이상인 구간까지만 투입(체감수익" . (!empty($f['truth_adjusted']) ? "·실귀속 매출 기준" : "") . " 반영).")
                : "곡선 적합 데이터 부족 — 평균 ROAS 평탄가정 배분(집행 누적 시 자동 곡선화).";
            $out[] = [
                'channel' => $id, 'label' => $c['label'], 'connectorKey' => $c['connectorKey'],
                'allocation' => $a, 'allocation_pct' => $budget > 0 ? round($a / $budget * 100, 1) : 0,
                'daily_pace' => $days > 0 ? (int)round($a / $days / 100) * 100 : $a,
                'weekly_pace' => (int)round($a / $weeks / 1000) * 1000,
                'marginal_roas' => round($mRoas, 2),
                'avg_roas' => $avgRoas,
                'expected_roas' => $avgRoas,
                'curve_fit' => $f ? ['b' => round($f['b'], 2), 'r2' => $f['r2'], 'points' => $f['n'], 'truth_adjusted' => ($f['truth_adjusted'] ?? false)] : null,
                'expected_cac' => (int)round($x['expCac']),
                'confidence' => $x['conf'],
                'est_impressions' => $impr, 'est_clicks' => $clicks, 'est_conversions' => $conv, 'est_revenue' => $estRevenue,
                'source' => $f ? 'curve' : $x['src'],
                'rationale' => $rationale,
            ];
        }
        usort($out, fn($p, $q) => $q['allocation'] <=> $p['allocation']);
        $totalRev = array_sum(array_column($out, 'est_revenue'));
        $totalConv = array_sum(array_column($out, 'est_conversions'));
        return self::json($res, [
            'ok' => true,
            'budget' => $budget, 'recommended_spend' => $recSpent, 'savings' => $savings,
            'category' => $category, 'period' => $period, 'period_days' => $days, 'objective' => $objective,
            'guardrails' => ['max_share' => $maxShare, 'min_roas' => $minRoasGate, 'target_roas' => $targetRoas],
            'channels' => $out,
            'total_est_revenue' => $totalRev, 'total_est_conversions' => $totalConv,
            'blended_roas' => $recSpent > 0 ? round($totalRev / $recSpent, 2) : 0,
            'blended_cac' => $totalConv > 0 ? (int)round($recSpent / $totalConv) : 0,
            'engine' => 'marginal-roas-v1',
            'rationale' => ($savings > 0
                ? "한계수익(체감) 최적화 — 다음 1원의 한계ROAS가 목표 {$targetRoas}x 밑으로 떨어지는 채널엔 추가 투입을 멈췄습니다. 예산 " . number_format($budget) . "원 중 " . number_format($recSpent) . "원만 집행 권장(" . number_format($savings) . "원 절감 = 동일 효과·최소 비용). 곡선 미적합 채널은 평탄가정으로 정직 폴백."
                : "한계수익(체감) 최적화 — 채널 간 한계ROAS를 균등화해 효율 프론티어에서 배분했습니다. 모든 구간의 한계ROAS가 목표 이상이라 전액 집행이 효율적입니다."),
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
