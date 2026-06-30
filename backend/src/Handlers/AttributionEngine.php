<?php
declare(strict_types=1);

namespace Genie\Handlers;

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;
use Genie\Db;
use Genie\TemplateResponder;
use PDO;
use Throwable;

/**
 * 203차 — 서버측 멀티터치 어트리뷰션(MTA) 엔진.
 *
 * 배경(공백 진단):
 *   기존 AttributionMetrics(v424)는 attribution_touch 의 "원시 터치/경로"만 반환하고,
 *   Attribution(v419)은 주문당 단일 채널(semi_rule_v1=사실상 last-touch)만 기록했다.
 *   고급 멀티터치 모델(Shapley/Markov/MMM)은 전부 클라이언트(mlAttribution.js)에만 존재 →
 *   대용량 데이터에서 신뢰 불가·감사 불가·테넌트 간 일관성 없음.
 *
 * 본 엔진은 1st-party 터치 데이터(attribution_touch)를 전환(attribution_result)과 결합해
 * 서버에서 권위 있는(authoritative) 멀티터치 크레딧을 계산한다. 매출 컬럼이 없으므로
 * "전환 수(conversions)"를 단위로 배분하되, 터치 extra_json 에 revenue/order_value 가
 * 있으면 매출 가중 크레딧도 함께 산출한다.
 *
 * 6개 모델:
 *   1) last_touch       — 마지막 터치 100%
 *   2) first_touch      — 첫 터치 100%
 *   3) linear           — 터치 이벤트 균등 배분
 *   4) time_decay       — 전환 시점에 가까운 터치 가중(반감기 7일, 지수감쇠)
 *   5) position_based   — U자형(첫 40% · 마지막 40% · 중간 20% 균등)
 *   6) markov           — ★데이터기반: 흡수 마르코프 연쇄 removal-effect(제거 효과)
 *
 * 설계 원칙(은행급/글로벌 SaaS):
 *   - 테넌트 격리 강제: 모든 query WHERE tenant_id=:t (prepared). 미해결 시 빈 결과.
 *   - 가상/목 데이터 금지: 실 DB 결과만. 데이터 부족 시 빈 배열.
 *   - 순수 계산부(computeModels/markovRemovalEffect)는 DB/HTTP 와 분리 → 단위 검증 가능.
 *
 * Endpoint:
 *   GET /v424/attribution/models?window=90&halflife=7
 *     → { models: {<model>: [{channel, conversions, pct, revenue, revenue_pct}]},
 *         channels: [...], data_driven: 'markov', journeys: N, converted: M, ... }
 */
final class AttributionEngine
{
    /** 기본 lookback 윈도우(일) — 전환 created_at 기준. */
    private const DEFAULT_WINDOW = 90;
    /** time_decay 기본 반감기(일). */
    private const DEFAULT_HALFLIFE = 7.0;
    /** 분석 상한(과부하 방지). */
    private const MAX_ORDERS = 20000;

    // ── GET /v424/attribution/models ───────────────────────────────────────
    public static function models(Request $request, Response $response, array $args): Response
    {
        $start = microtime(true);
        $t = self::tenant($request);
        $empty = ['models' => new \stdClass(), 'channels' => [], 'data_driven' => 'markov',
                  'journeys' => 0, 'converted' => 0, 'window_days' => self::DEFAULT_WINDOW];
        if ($t === '') return self::ok($response, $empty + ['response_time_ms' => self::elapsed($start)]);

        try {
            $q = $request->getQueryParams();
            $window = max(1, min(730, (int)($q['window'] ?? self::DEFAULT_WINDOW)));
            $halflife = max(0.5, min(90.0, (float)($q['halflife'] ?? self::DEFAULT_HALFLIFE)));
            // [240차 ⑧-A] 뷰스루 가중치(0~1, 기본 1.0=영향없음). 비기본 시 캐시 우회(라이브 계산).
            $vtWeight = max(0.0, min(1.0, (float)($q['vt_weight'] ?? 1.0)));
            // [차기 P1 준실시간] fresh=1 → 캐시 우회 강제 재계산(대시보드 "지금 새로고침"). max_age 로 신선도 임계 조정 가능(기본 1800s).
            $fresh = in_array((string)($q['fresh'] ?? ''), ['1', 'true', 'yes'], true);
            $maxAge = max(60, min(1800, (int)($q['max_age'] ?? 1800)));

            $pdo = Db::pdo();
            // [228차 S2] ★캐시 우선 — attribution_cron 선계산 결과가 신선하면 즉시 반환.
            //   기존엔 대시보드 히트마다 동기 재계산(대용량 테넌트 MAX_ORDERS=20000 스캔 지연). 캐시 미스 시 라이브 계산+저장.
            if ($vtWeight >= 1.0 && !$fresh) {
                $cached = self::cacheGet($pdo, $t, $window, $halflife, $maxAge);
                if ($cached !== null) {
                    $cached['cached'] = true;
                    $cached['response_time_ms'] = self::elapsed($start);
                    return self::ok($response, $cached);
                }
            }
            $result = self::precompute($pdo, $t, $window, $halflife, $vtWeight);
            $result['response_time_ms'] = self::elapsed($start);
            return self::ok($response, $result);
        } catch (Throwable $e) {
            return self::fail($response, $e, $empty);
        }
    }

    /** [현 차수 P3] GET /v424/attribution/confidence — 부트스트랩 신뢰구간 + 모델 합의도(설명가능성/신뢰성). */
    public static function confidence(Request $request, Response $response, array $args): Response
    {
        $start = microtime(true);
        $t = self::tenant($request);
        $empty = ['channels' => [], 'overall_confidence' => 0, 'model_agreement' => [], 'journeys' => 0, 'converted' => 0];
        if ($t === '') return self::ok($response, $empty + ['response_time_ms' => self::elapsed($start)]);
        try {
            $q = $request->getQueryParams();
            $window = max(1, min(730, (int)($q['window'] ?? self::DEFAULT_WINDOW)));
            $B = max(20, min(80, (int)($q['samples'] ?? 40)));
            $pdo = Db::pdo();
            [$conv, $null] = self::loadJourneys($pdo, $t, $window);
            $result = self::computeModels($conv, $null);
            $totalConv = (float)($result['total_conversions'] ?? 0);
            $channelSet = [];
            foreach (($result['channels'] ?? []) as $row) { if (!empty($row['channel'])) $channelSet[$row['channel']] = true; }
            $ci = self::confidenceIntervals($conv, $null, $totalConv, $channelSet, $B);
            $hiCnt = 0; foreach ($ci as $c) { if (($c['stability'] ?? '') === 'high') $hiCnt++; }
            $overall = count($ci) ? (int)round($hiCnt / count($ci) * 100) : 0;
            $agreement = self::modelAgreement($result['models'] ?? [], $channelSet, $totalConv);
            return self::ok($response, [
                'channels' => $ci, 'overall_confidence' => $overall, 'model_agreement' => $agreement,
                'journeys' => count($conv) + count($null), 'converted' => count($conv), 'samples' => $B,
                'window_days' => $window, 'response_time_ms' => self::elapsed($start),
            ]);
        } catch (Throwable $e) {
            return self::fail($response, $e, $empty);
        }
    }

    /**
     * [현 차수 P4] GET /v424/attribution/incrementality — 증분성 스코어카드 + 홀드아웃 검정력.
     *
     * 기존 엔진 재사용(중복 0): computeModels 의 last_touch(과대귀속 baseline)와 markov(데이터기반 순증분)
     * credit 을 결합해 채널별 증분 ROAS/CPA·과대귀속률을 산출하고, performance_metrics 의 spend/clicks 로
     * 정규화한다. 추가로 각 채널에 대해 50/50 홀드아웃 실험의 검정력(MDE·필요기간)을 계산해 "실제 리프트
     * 테스트가 통계적으로 유효하려면 얼마나 필요한가"를 안내한다(실 실험 설계 도구). 전부 실DB 파생(날조 0).
     */
    public static function incrementality(Request $request, Response $response, array $args): Response
    {
        $start = microtime(true);
        $t = self::tenant($request);
        $empty = ['channels' => [], 'totals' => new \stdClass(), 'journeys' => 0, 'converted' => 0];
        if ($t === '') return self::ok($response, $empty + ['response_time_ms' => self::elapsed($start)]);
        try {
            $q = $request->getQueryParams();
            $window = max(1, min(730, (int)($q['window'] ?? self::DEFAULT_WINDOW)));
            $pdo = Db::pdo();
            [$conv, $null] = self::loadJourneys($pdo, $t, $window);
            $models = self::computeModels($conv, $null);
            $totalConv = (float)($models['total_conversions'] ?? 0);
            $totalRev  = (float)($models['total_revenue'] ?? 0);
            // last_touch(과대귀속 baseline)·markov(증분) credit + revenue 를 채널별 맵으로.
            $lt = []; $ltRev = [];
            foreach (($models['models']['last_touch'] ?? []) as $e) { $lt[$e['channel']] = (float)($e['conversions'] ?? 0); $ltRev[$e['channel']] = (float)($e['revenue'] ?? 0); }
            $mk = [];
            foreach (($models['models']['markov'] ?? []) as $e) { $mk[$e['channel']] = (float)($e['conversions'] ?? 0); }

            $spendMap = self::channelSpendMap($pdo, $t, $window); // lower(channel) => ['spend','clicks','impressions']

            $rows = [];
            $channels = array_keys(array_merge($lt, $mk));
            foreach ($channels as $ch) {
                $ltc = (float)($lt[$ch] ?? 0);
                $mkc = (float)($mk[$ch] ?? 0);
                $sp  = $spendMap[strtolower($ch)] ?? ['spend' => 0.0, 'clicks' => 0, 'impressions' => 0];
                $spend = (float)$sp['spend']; $clicks = (int)$sp['clicks'];
                $ltShare = $totalConv > 0 ? $ltc / $totalConv : 0.0;
                $mkShare = $totalConv > 0 ? $mkc / $totalConv : 0.0;
                $ltRevenue = (float)($ltRev[$ch] ?? 0);
                $incRevenue = $mkShare * $totalRev; // markov 는 전환기반 → 매출은 데이터기반 share 배분
                $overAttr = $ltShare > 0 ? max(-100.0, ($ltShare - $mkShare) / $ltShare * 100.0) : 0.0;
                $power = self::holdoutPower($ltc, $clicks, $window);
                $rows[] = [
                    'channel'             => $ch,
                    'spend'               => round($spend, 2),
                    'clicks'              => $clicks,
                    'last_touch_conv'     => round($ltc, 2),
                    'incremental_conv'    => round($mkc, 2),
                    'last_touch_share'    => round($ltShare * 100, 1),
                    'incremental_share'   => round($mkShare * 100, 1),
                    'over_attribution_pct'=> round($overAttr, 1),   // 양수 = last-touch 가 과대평가
                    'reported_roas'       => $spend > 0 ? round($ltRevenue / $spend, 2) : null,
                    'incremental_roas'    => $spend > 0 ? round($incRevenue / $spend, 2) : null,
                    'incremental_cpa'     => $mkc > 0 ? round($spend / $mkc, 0) : null,
                    'incremental_revenue' => round($incRevenue, 0),
                    'holdout'             => $power,
                ];
            }
            // 증분 기여 큰 순.
            usort($rows, fn($a, $b) => $b['incremental_conv'] <=> $a['incremental_conv']);
            $blendedRoas = null; $sumSpend = 0.0; foreach ($spendMap as $s) $sumSpend += (float)$s['spend'];
            if ($sumSpend > 0) $blendedRoas = round($totalRev / $sumSpend, 2);
            return self::ok($response, [
                'channels' => $rows,
                'totals'   => [
                    'conversions' => round($totalConv, 2), 'revenue' => round($totalRev, 0),
                    'spend' => round($sumSpend, 0), 'blended_roas' => $blendedRoas,
                ],
                'journeys' => count($conv) + count($null), 'converted' => count($conv),
                'window_days' => $window, 'response_time_ms' => self::elapsed($start),
            ]);
        } catch (Throwable $e) {
            return self::fail($response, $e, $empty);
        }
    }

    /**
     * [R-P1-1] GET /v424/attribution/blended — 3개 증분성 신호(Markov 제거효과·MMM Bayesian 사후·Holdout 검증)를
     *   채널별 단일 "통합 증분 기여도 + 신뢰도"로 블렌딩. markov·MMM 은 cross-channel share(신뢰도 가중평균),
     *   holdout 은 per-channel 인과검증(share 비반영·신뢰도 가중). 의사결정자가 "어느 채널을 믿고 증/감액할지"를
     *   단일 수치(blended_trust·confidence_grade)로 판단. 전부 실DB 파생(날조 0, 신호 부족 시 graceful 생략).
     */
    public static function blendedIncrementality(Request $request, Response $response, array $args): Response
    {
        $start = microtime(true);
        $t = self::tenant($request);
        $empty = ['channels' => [], 'decision_confidence' => 0, 'signals_available' => []];
        if ($t === '') return self::ok($response, $empty + ['response_time_ms' => self::elapsed($start)]);
        try {
            $q = $request->getQueryParams();
            $window = max(1, min(730, (int)($q['window'] ?? self::DEFAULT_WINDOW)));
            $pdo = Db::pdo();

            // ── 신호1: Markov(증분) share + 부트스트랩 신뢰도 ──
            [$conv, $null] = self::loadJourneys($pdo, $t, $window);
            $models = self::computeModels($conv, $null);
            $totalConv = (float)($models['total_conversions'] ?? 0);
            $mkShare = []; $disp = [];
            foreach (($models['models']['markov'] ?? []) as $e) {
                $c = (string)$e['channel']; $lc = strtolower($c); $disp[$lc] = $c;
                $mkShare[$lc] = $totalConv > 0 ? (float)($e['conversions'] ?? 0) / $totalConv : 0.0;
            }
            $mkTrust = []; $channelSet = [];
            foreach (array_keys($mkShare) as $lc) $channelSet[$disp[$lc]] = true;
            if (!empty($channelSet) && count($conv) > 0) {
                foreach (self::confidenceIntervals($conv, $null, $totalConv, $channelSet, 30) as $ci) {
                    $mkTrust[strtolower((string)$ci['channel'])] = round(1.0 / (1.0 + (float)($ci['cv'] ?? 0)), 3);
                }
            }

            // ── 신호2: MMM Bayesian 사후 기여 share + trust ──
            $mmmShare = []; $mmmTrust = [];
            try {
                $post = Mmm::posteriorData($t, max(14, $window));
                foreach (($post['channels'] ?? []) as $c) {
                    $lc = strtolower((string)$c['channel']); if (!isset($disp[$lc])) $disp[$lc] = (string)$c['channel'];
                    $mmmShare[$lc] = (float)($c['contribution_share'] ?? 0);
                    $mmmTrust[$lc] = (float)($c['trust'] ?? 0);
                }
            } catch (\Throwable $e) { /* MMM 데이터 부족 — 신호 생략 */ }

            // ── 신호3: Holdout 인과검증(채널별 최신 concluded) ──
            $hold = [];
            try {
                self::ensureExpTable($pdo);
                $st = $pdo->prepare("SELECT channel, result_json FROM holdout_experiment WHERE tenant_id=? AND status='concluded' AND channel<>'' ORDER BY updated_at DESC");
                $st->execute([$t]);
                foreach ($st->fetchAll(PDO::FETCH_ASSOC) ?: [] as $r) {
                    $lc = strtolower((string)$r['channel']); if ($lc === '' || isset($hold[$lc])) continue;
                    $res = json_decode((string)($r['result_json'] ?? ''), true);
                    if (!is_array($res)) continue;
                    $p = (float)($res['p_value'] ?? 1.0);
                    $hold[$lc] = ['lift' => $res['lift_relative_pct'] ?? null, 'sig' => !empty($res['significant']),
                        'trust' => round(max(0.0, min(1.0, -log10(max($p, 1e-6)) / 3.0)), 3)];
                    if (!isset($disp[$lc])) $disp[$lc] = (string)$r['channel'];
                }
            } catch (\Throwable $e) { /* graceful */ }

            // ── 블렌딩 ──
            $rows = []; $signalsUsed = [];
            foreach (array_keys(array_merge($mkShare, $mmmShare, $hold)) as $lc) {
                $signals = []; $wsum = 0.0; $shareSum = 0.0; $trusts = [];
                if (isset($mkShare[$lc])) { $tr = $mkTrust[$lc] ?? 0.5; $signals[] = 'markov'; $wsum += $tr; $shareSum += $tr * $mkShare[$lc]; $trusts[] = $tr; }
                if (isset($mmmShare[$lc])) { $tr = $mmmTrust[$lc] ?? 0.5; $signals[] = 'mmm'; $wsum += $tr; $shareSum += $tr * $mmmShare[$lc]; $trusts[] = $tr; }
                $blendedShare = $wsum > 0 ? $shareSum / $wsum : 0.0;
                if (isset($hold[$lc])) { $signals[] = 'holdout'; $trusts[] = $hold[$lc]['trust']; }
                $coverage = count($signals) / 3.0;
                $avgTrust = $trusts ? array_sum($trusts) / count($trusts) : 0.0;
                $blendedTrust = round($avgTrust * (0.6 + 0.4 * $coverage), 3);
                foreach ($signals as $s) $signalsUsed[$s] = true;
                $rows[] = [
                    'channel' => $disp[$lc] ?? $lc,
                    'blended_incremental_share' => round($blendedShare * 100, 1),
                    'markov_share' => isset($mkShare[$lc]) ? round($mkShare[$lc] * 100, 1) : null,
                    'mmm_share' => isset($mmmShare[$lc]) ? round($mmmShare[$lc] * 100, 1) : null,
                    'holdout_lift_pct' => $hold[$lc]['lift'] ?? null,
                    'holdout_significant' => isset($hold[$lc]) ? $hold[$lc]['sig'] : null,
                    'blended_trust' => $blendedTrust,
                    'confidence_grade' => $blendedTrust >= 0.7 ? 'high' : ($blendedTrust >= 0.45 ? 'medium' : 'low'),
                    'contributing_signals' => $signals,
                    'signal_count' => count($signals),
                ];
            }
            usort($rows, fn($a, $b) => $b['blended_incremental_share'] <=> $a['blended_incremental_share']);
            $dc = 0.0; $sw = 0.0;
            foreach ($rows as $r) { $w = (float)$r['blended_incremental_share']; $dc += $w * (float)$r['blended_trust']; $sw += $w; }
            return self::ok($response, [
                'channels' => $rows,
                'decision_confidence' => $sw > 0 ? round($dc / $sw * 100, 1) : 0.0,
                'signals_available' => array_keys($signalsUsed),
                'window_days' => $window,
                'note' => '3개 증분성 신호(Markov 제거효과·MMM Bayesian 사후·Holdout 검증)의 신뢰도 가중 통합. holdout 은 share 비반영·신뢰도 가중.',
                'response_time_ms' => self::elapsed($start),
            ]);
        } catch (Throwable $e) {
            return self::fail($response, $e, $empty);
        }
    }

    /**
     * [현 차수 P4] POST /v424/attribution/lift-test — 홀드아웃 리프트 테스트 분석(2-비율 z검정).
     *
     * 실제 홀드아웃(control=노출제외, treatment=노출) 전환 결과를 입력하면 리프트%·95% 신뢰구간·p값·유의성을
     * 통계적으로 판정하고, 증분 전환수/매출을 산출한다. 모델추정 증분성을 실측 리프트로 검증하는 인과추론 레이어.
     * Body: { control_conversions, control_size, treatment_conversions, treatment_size, [revenue_per_conversion], [channel] }
     */
    public static function liftTest(Request $request, Response $response, array $args): Response
    {
        $start = microtime(true);
        try {
            $b = (array)($request->getParsedBody() ?? []);
            $cc = max(0.0, (float)($b['control_conversions'] ?? 0));
            $cs = max(0.0, (float)($b['control_size'] ?? 0));
            $tc = max(0.0, (float)($b['treatment_conversions'] ?? 0));
            $ts = max(0.0, (float)($b['treatment_size'] ?? 0));
            $rpc = max(0.0, (float)($b['revenue_per_conversion'] ?? 0));
            if ($cs <= 0 || $ts <= 0) {
                return self::ok($response, ['ok' => false, 'error' => 'control_size 와 treatment_size 는 0보다 커야 합니다.']);
            }
            if ($cc > $cs || $tc > $ts) {
                return self::ok($response, ['ok' => false, 'error' => '전환수는 그룹 크기를 초과할 수 없습니다.']);
            }
            $r = self::computeLift($cc, $cs, $tc, $ts, $rpc);
            $r['ok'] = true;
            $r['response_time_ms'] = self::elapsed($start);
            return self::ok($response, $r);
        } catch (Throwable $e) {
            return self::fail($response, $e, ['ok' => false]);
        }
    }

    /**
     * 2-비율 z검정 핵심 계산(엔드포인트/실험 레지스트리 공용 — 중복 0). 입력 검증은 호출측 책임.
     * @return array 리프트 지표(ok/response_time 제외).
     */
    public static function computeLift(float $cc, float $cs, float $tc, float $ts, float $rpc): array
    {
        $p1 = $cs > 0 ? $cc / $cs : 0.0;     // control 전환율
        $p2 = $ts > 0 ? $tc / $ts : 0.0;     // treatment 전환율
        $liftAbs = $p2 - $p1;
        $liftRel = $p1 > 0 ? $liftAbs / $p1 : null;
        $pPool = ($cs + $ts) > 0 ? ($cc + $tc) / ($cs + $ts) : 0.0;
        $sePool = sqrt(max(0.0, $pPool * (1 - $pPool) * (($cs > 0 ? 1 / $cs : 0) + ($ts > 0 ? 1 / $ts : 0))));
        $z = $sePool > 0 ? $liftAbs / $sePool : 0.0;
        $pValue = 2 * (1 - self::normalCdf(abs($z)));
        $seUnpooled = sqrt(max(0.0, ($cs > 0 ? $p1 * (1 - $p1) / $cs : 0) + ($ts > 0 ? $p2 * (1 - $p2) / $ts : 0)));
        $ciLoAbs = $liftAbs - 1.96 * $seUnpooled;
        $ciHiAbs = $liftAbs + 1.96 * $seUnpooled;
        $incrementalConv = $ts * $liftAbs;
        $incrementalValue = $rpc > 0 ? $incrementalConv * $rpc : null;
        $significant = $pValue < 0.05 && $liftAbs > 0;
        return [
            'control_cvr'        => round($p1 * 100, 3),
            'treatment_cvr'      => round($p2 * 100, 3),
            'lift_abs_pct'       => round($liftAbs * 100, 3),
            'lift_relative_pct'  => $liftRel !== null ? round($liftRel * 100, 1) : null,
            'lift_ci95'          => [round($ciLoAbs * 100, 3), round($ciHiAbs * 100, 3)],
            'z_score'            => round($z, 3),
            'p_value'            => round($pValue, 5),
            'significant'        => $significant,
            'incremental_conversions' => round($incrementalConv, 1),
            'incremental_value'  => $incrementalValue !== null ? round($incrementalValue, 0) : null,
            'verdict'            => $significant
                ? '통계적으로 유의한 증분 효과 (95% 신뢰수준)'
                : ($liftAbs <= 0 ? '증분 효과 없음/음수 — 노출이 전환을 끌어올리지 못함' : '아직 유의하지 않음 — 표본/기간 확대 필요'),
        ];
    }

    /**
     * [254차 감사] 지역 geo-홀드아웃 diff-in-diff 검정(카운트 기반·Poisson). computeLift(2-비율 z검정·rate∈[0,1])는
     *   성장비(현재전환/기준전환, >1 가능)를 비율로 오해석해 pPool*(1-pPool)<0 → 분산 0 퇴화 → 조기 유의 영구 미발화였다.
     *   여기서는 로그 성장비 차이(=ln(curT/baseT) − ln(curC/baseC))를 Poisson 분산(Var(ln N)≈1/N)으로 검정한다.
     *   ★중복 아님: computeLift 는 모수(size) 분모의 전환율 검정(HTTP 결과입력 엔드포인트 전용)으로 그대로 유지.
     */
    public static function computeGeoLift(float $curT, float $baseT, float $curC, float $baseC, float $rpc): array
    {
        $gT = $baseT > 0 ? $curT / $baseT : 0.0;   // 치료 지역 성장비
        $gC = $baseC > 0 ? $curC / $baseC : 0.0;   // 대조 지역 성장비
        $liftAbs = $gT - $gC;                       // 성장비 차이(diff-in-diff, %p)
        $liftRel = $gC > 0 ? $liftAbs / $gC : null;
        $didLog = (($curT > 0 && $baseT > 0) ? log($curT / $baseT) : 0.0)
                - (($curC > 0 && $baseC > 0) ? log($curC / $baseC) : 0.0);
        $se = sqrt((($curT > 0) ? 1 / $curT : 0) + (($baseT > 0) ? 1 / $baseT : 0)
                 + (($curC > 0) ? 1 / $curC : 0) + (($baseC > 0) ? 1 / $baseC : 0));
        $z = $se > 0 ? $didLog / $se : 0.0;
        $pValue = 2 * (1 - self::normalCdf(abs($z)));
        $ciLoLog = $didLog - 1.96 * $se; $ciHiLog = $didLog + 1.96 * $se;
        $incrementalConv = $curT - ($baseT > 0 ? $baseT * $gC : 0.0); // 대조 성장률 반사실 대비 초과 전환(인과 증분)
        $incrementalValue = $rpc > 0 ? $incrementalConv * $rpc : null;
        $significant = $pValue < 0.05 && $liftAbs > 0;
        return [
            'treatment_growth'  => round($gT, 3),
            'control_growth'    => round($gC, 3),
            'lift_abs_pct'      => round($liftAbs * 100, 3),
            'lift_relative_pct' => $liftRel !== null ? round($liftRel * 100, 1) : null,
            'did_log'           => round($didLog, 4),
            'lift_ci95'         => [round((exp($ciLoLog) - 1) * 100, 2), round((exp($ciHiLog) - 1) * 100, 2)],
            'z_score'           => round($z, 3),
            'p_value'           => round($pValue, 5),
            'significant'       => $significant,
            'incremental_conversions' => round($incrementalConv, 1),
            'incremental_value' => $incrementalValue !== null ? round($incrementalValue, 0) : null,
            'method'            => 'poisson-did',
            'verdict'           => $significant ? '통계적으로 유의한 지오 증분 리프트 (95% 신뢰수준)'
                : ($liftAbs <= 0 ? '증분 리프트 없음/음수 — 노출이 지역 성장을 끌어올리지 못함' : '아직 유의하지 않음 — 기간/전환 확대 필요'),
        ];
    }

    // ── 홀드아웃 실험 레지스트리 (P4 완성) ─────────────────────────────────
    //   플랫폼측 conversion-lift 실험(Meta Conversion Lift·Google geo 등) 결과를 등록·추적·검증.
    //   테넌트 격리(WHERE tenant_id). 결과 입력 시 computeLift 로 자동 검정 → result_json 영속.

    private static function ensureExpTable(PDO $pdo): void
    {
        $isMy = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'mysql';
        $AI = $isMy ? 'INT AUTO_INCREMENT PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT';
        try {
            $pdo->exec("CREATE TABLE IF NOT EXISTS holdout_experiment (
                id $AI,
                tenant_id VARCHAR(64),
                name TEXT, channel VARCHAR(60), hypothesis TEXT,
                status VARCHAR(20) DEFAULT 'draft',
                control_size REAL DEFAULT 0, treatment_size REAL DEFAULT 0,
                control_conversions REAL DEFAULT 0, treatment_conversions REAL DEFAULT 0,
                revenue_per_conversion REAL DEFAULT 0,
                start_date VARCHAR(20), end_date VARCHAR(20),
                result_json TEXT,
                created_at TEXT, updated_at TEXT
            )");
        } catch (\Throwable $e) { /* graceful */ }
        // [R-P1-1] geo 홀드아웃 표준화 — 지역 기반 실험 컬럼(없으면 추가, graceful).
        foreach (['geo_strategy' => "VARCHAR(20) DEFAULT 'national'", 'geo_regions' => 'TEXT', 'geo_results' => 'TEXT'] as $col => $type) {
            try { $pdo->exec("ALTER TABLE holdout_experiment ADD COLUMN $col $type"); } catch (\Throwable $e) { /* 이미 존재 */ }
        }
    }

    private static function expRow(array $r): array
    {
        $out = [
            'id' => (int)$r['id'], 'name' => (string)$r['name'], 'channel' => (string)($r['channel'] ?? ''),
            'hypothesis' => (string)($r['hypothesis'] ?? ''), 'status' => (string)($r['status'] ?? 'draft'),
            'control_size' => (float)$r['control_size'], 'treatment_size' => (float)$r['treatment_size'],
            'control_conversions' => (float)$r['control_conversions'], 'treatment_conversions' => (float)$r['treatment_conversions'],
            'revenue_per_conversion' => (float)$r['revenue_per_conversion'],
            'start_date' => (string)($r['start_date'] ?? ''), 'end_date' => (string)($r['end_date'] ?? ''),
            'created_at' => (string)($r['created_at'] ?? ''), 'updated_at' => (string)($r['updated_at'] ?? ''),
            'geo_strategy' => (string)($r['geo_strategy'] ?? 'national'),
            'geo_regions' => (string)($r['geo_regions'] ?? ''),
        ];
        $res = json_decode((string)($r['result_json'] ?? ''), true);
        $out['result'] = is_array($res) ? $res : null;
        $geo = json_decode((string)($r['geo_results'] ?? ''), true);
        $out['geo_results'] = is_array($geo) ? $geo : null;
        return $out;
    }

    /* ════════════ [초고도화 #2] 지오 홀드아웃 자동화 엔진 (자동 설계·일일 검증·가드레일·자동 결론) ════════════
     *   기존 수동 holdout_experiment 레지스트리 위에 '자동화 레이어'를 얹어 Northbeam/Polar 지오리프트 자동화 격차 해소.
     *   ★안전: media geo-exclusion 미지원이라 광고 집행을 바꾸지 않는 '관측(observational) 지오 리프트'(지역 분할 후
     *   기준기간 대비 성장률 diff-in-diff). 광고 미변경=spend 영향0. 인과 holdout(control 지역 광고제외)은 geo-targeting
     *   지원 시 활성(로드맵)으로 정직 표기. 자동 설계는 spend 무변경이라 안전하게 cron 자동 실행. */

    /** 주소에서 광역 지역(시/도) 추출 — geo 실험 그룹핑. 빈/미상은 ''(실험 제외). */
    private static function regionOf(string $addr): string
    {
        $addr = trim($addr);
        if ($addr === '') return '';
        $tok = preg_split('/\s+/', $addr)[0] ?? '';
        static $map = ['서울특별시'=>'서울','서울'=>'서울','경기도'=>'경기','경기'=>'경기','인천광역시'=>'인천','인천'=>'인천',
            '부산광역시'=>'부산','부산'=>'부산','대구광역시'=>'대구','대구'=>'대구','광주광역시'=>'광주','광주'=>'광주',
            '대전광역시'=>'대전','대전'=>'대전','울산광역시'=>'울산','울산'=>'울산','세종특별자치시'=>'세종','세종'=>'세종',
            '강원특별자치도'=>'강원','강원도'=>'강원','강원'=>'강원','충청북도'=>'충북','충북'=>'충북','충청남도'=>'충남','충남'=>'충남',
            '전라북도'=>'전북','전북특별자치도'=>'전북','전북'=>'전북','전라남도'=>'전남','전남'=>'전남','경상북도'=>'경북','경북'=>'경북',
            '경상남도'=>'경남','경남'=>'경남','제주특별자치도'=>'제주','제주도'=>'제주','제주'=>'제주'];
        foreach ($map as $k => $v) { if (strncmp($tok, $k, strlen($k)) === 0) return $v; }
        return mb_substr($tok, 0, 10);
    }

    /** 실험기간 내 지역집합의 전환(취소제외 주문)·매출 집계 — addr→regionOf 버킷팅(LIKE 모호성 회피). */
    private static function ordersInRegions(PDO $pdo, string $tenant, array $regionSet, string $since): array
    {
        $set = array_flip(array_map('strval', $regionSet));
        $conv = 0; $rev = 0.0;
        try {
            $st = $pdo->prepare("SELECT addr, total_price FROM channel_orders WHERE tenant_id=? AND COALESCE(event_type,'order') NOT IN ('cancel','return') AND ordered_at >= ?");
            $st->execute([$tenant, $since]);
            foreach ($st->fetchAll(PDO::FETCH_ASSOC) ?: [] as $r) {
                $reg = self::regionOf((string)($r['addr'] ?? '')); if ($reg === '' || !isset($set[$reg])) continue;
                $conv++; $rev += (float)($r['total_price'] ?? 0);
            }
        } catch (Throwable $e) {}
        return [$conv, $rev];
    }

    /** 자동 geo-홀드아웃 설계 — 최근 주문 지역을 주문량 균형 분할(test/control)해 running 실험 생성. spend 무변경(관측). */
    public static function autoDesignGeoHoldout(PDO $pdo, string $tenant, string $channel = '', array $opts = []): array
    {
        self::ensureExpTable($pdo);
        $days    = max(7, min(60, (int)($opts['duration_days'] ?? 21)));
        $baseWin = max(14, (int)($opts['baseline_days'] ?? 28));
        $regions = [];
        try {
            $st = $pdo->prepare("SELECT addr, total_price FROM channel_orders WHERE tenant_id=? AND COALESCE(event_type,'order') NOT IN ('cancel','return') AND ordered_at >= ?");
            $st->execute([$tenant, gmdate('Y-m-d', time() - $baseWin * 86400)]);
            foreach ($st->fetchAll(PDO::FETCH_ASSOC) ?: [] as $r) {
                $reg = self::regionOf((string)($r['addr'] ?? '')); if ($reg === '') continue;
                if (!isset($regions[$reg])) $regions[$reg] = 0;
                $regions[$reg]++;
            }
        } catch (Throwable $e) {}
        if (count($regions) < 4) return ['ok' => false, 'error' => '지역 분포 부족(최소 4개 시/도 주문 필요) — 주문 데이터 축적 후 자동 설계됩니다.'];
        uasort($regions, fn($a, $b) => $b <=> $a);
        $test = []; $ctrl = []; $tSum = 0; $cSum = 0;
        foreach ($regions as $reg => $cnt) { if ($tSum <= $cSum) { $test[] = (string)$reg; $tSum += $cnt; } else { $ctrl[] = (string)$reg; $cSum += $cnt; } }
        if ($tSum <= 0 || $cSum <= 0) return ['ok' => false, 'error' => '균형 분할 실패(한쪽 그룹 주문 0).'];
        $now = gmdate('c'); $start = gmdate('Y-m-d'); $end = gmdate('Y-m-d', time() + $days * 86400);
        $geoRegions = json_encode(['test' => $test, 'control' => $ctrl], JSON_UNESCAPED_UNICODE);
        $meta = ['auto_design' => ['mode' => 'observational', 'baseline_days' => $baseWin, 'baseline_treatment' => $tSum,
            'baseline_control' => $cSum, 'duration_days' => $days, 'guardrails' => ['min_days' => 7, 'min_conv' => 30, 'early_stop_lift_pct' => -5], 'auto' => true,
            'note' => '관측 지오 리프트(광고 미변경·spend영향0). 인과 holdout 은 geo-targeting 지원 시 활성(로드맵).']];
        try {
            $st = $pdo->prepare("INSERT INTO holdout_experiment(tenant_id,name,channel,hypothesis,status,control_size,treatment_size,revenue_per_conversion,start_date,end_date,geo_strategy,geo_regions,geo_results,result_json,created_at,updated_at)
                                 VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)");
            $st->execute([$tenant, '자동 지오 홀드아웃 ' . $start, substr($channel, 0, 60), '광고 노출 지역군(test) vs 대조 지역군(control)의 기준기간 대비 전환 성장 리프트',
                'running', $cSum, $tSum, 0, $start, $end, 'regional', $geoRegions, null, json_encode($meta, JSON_UNESCAPED_UNICODE), $now, $now]);
            return ['ok' => true, 'id' => (int)$pdo->lastInsertId(), 'test_regions' => $test, 'control_regions' => $ctrl, 'baseline' => ['treatment' => $tSum, 'control' => $cSum], 'duration_days' => $days];
        } catch (Throwable $e) { return ['ok' => false, 'error' => $e->getMessage()]; }
    }

    /** running geo 실험 일일 검증 — 실측 전환 집계→리프트 검정→가드레일→자동 결론(기간종료/유의/조기중단). 반환: 갱신수. */
    public static function validateRunningHoldouts(PDO $pdo, string $tenant): int
    {
        self::ensureExpTable($pdo); $n = 0;
        try {
            $st = $pdo->prepare("SELECT * FROM holdout_experiment WHERE tenant_id=? AND status='running' AND geo_strategy='regional'");
            $st->execute([$tenant]);
            foreach ($st->fetchAll(PDO::FETCH_ASSOC) ?: [] as $row) {
                $geo = json_decode((string)($row['geo_regions'] ?? ''), true);
                $rj  = json_decode((string)($row['result_json'] ?? ''), true) ?: [];
                $meta = $rj['auto_design'] ?? [];
                if (!is_array($geo) || empty($geo['test']) || empty($geo['control'])) continue;
                $start = (string)($row['start_date'] ?? ''); $end = (string)($row['end_date'] ?? '');
                $baseT = (float)($meta['baseline_treatment'] ?? $row['treatment_size']);
                $baseC = (float)($meta['baseline_control'] ?? $row['control_size']);
                if ($baseT <= 0 || $baseC <= 0) continue;
                [$curT, $revT] = self::ordersInRegions($pdo, $tenant, $geo['test'], $start);
                [$curC, $revC] = self::ordersInRegions($pdo, $tenant, $geo['control'], $start);
                $rpc = $curT > 0 ? $revT / $curT : 0.0;
                // [254차 감사] 카운트 기반 Poisson diff-in-diff(치료 성장비 − 대조 성장비). 과거 computeLift(2-비율 z검정)는
                //   성장비>1 에서 분산 0 퇴화로 조기 유의 영구 미발화였다 → computeGeoLift 로 교정(rate 검정과 분리).
                $lift = self::computeGeoLift($curT, $baseT, $curC, $baseC, $rpc);
                $daysRun = $start !== '' ? max(0, (int)floor((time() - strtotime($start)) / 86400)) : 0;
                $minDays = (int)($meta['guardrails']['min_days'] ?? 7);
                $minConv = (int)($meta['guardrails']['min_conv'] ?? 30);
                $earlyStop = (float)($meta['guardrails']['early_stop_lift_pct'] ?? -5);
                $enough = ($curT + $curC) >= $minConv && $daysRun >= 3;
                $geoResults = ['as_of' => gmdate('c'), 'days_run' => $daysRun, 'mode' => 'observational',
                    'treatment' => ['conv' => $curT, 'baseline' => $baseT], 'control' => ['conv' => $curC, 'baseline' => $baseC], 'lift' => $lift];
                $conclude = false; $verdict = '';
                if ($end !== '' && gmdate('Y-m-d') >= $end) { $conclude = true; $verdict = '기간 종료 — 최종 리프트 확정'; }
                elseif ($enough && $daysRun >= $minDays && !empty($lift['significant'])) { $conclude = true; $verdict = '통계 유의 도달 — 조기 확정'; }
                elseif ($enough && $daysRun >= $minDays && (float)($lift['lift_abs_pct'] ?? 0) < $earlyStop) { $conclude = true; $verdict = '가드레일: 강한 음의 리프트 — 조기 종료'; }
                $rj['interim'] = $geoResults; if ($conclude) { $rj['final'] = $lift; $rj['verdict'] = $verdict; }
                try {
                    $pdo->prepare("UPDATE holdout_experiment SET status=?,control_conversions=?,treatment_conversions=?,revenue_per_conversion=?,geo_results=?,result_json=?,updated_at=? WHERE id=? AND tenant_id=?")
                        ->execute([$conclude ? 'concluded' : 'running', $curC, $curT, $rpc, json_encode($geoResults, JSON_UNESCAPED_UNICODE), json_encode($rj, JSON_UNESCAPED_UNICODE), gmdate('c'), (int)$row['id'], $tenant]);
                    $n++;
                } catch (Throwable $e) {}
            }
        } catch (Throwable $e) {}
        return $n;
    }

    /** [cron 단일 진입] 테넌트 geo 자동화 — running 있으면 검증, 없으면 데이터 충분 시 자동 설계. spend 무변경(안전). */
    public static function autoRunGeoHoldouts(PDO $pdo, string $tenant): array
    {
        if ($tenant === '' || $tenant === 'unknown' || strncmp($tenant, 'demo', 4) === 0) return ['validated' => 0, 'designed' => false];
        self::ensureExpTable($pdo);
        $validated = self::validateRunningHoldouts($pdo, $tenant);
        $hasRunning = false;
        try {
            $c = $pdo->prepare("SELECT COUNT(*) FROM holdout_experiment WHERE tenant_id=? AND status='running' AND geo_strategy='regional'");
            $c->execute([$tenant]); $hasRunning = ((int)$c->fetchColumn()) > 0;
        } catch (Throwable $e) {}
        $designed = false;
        if (!$hasRunning) { $d = self::autoDesignGeoHoldout($pdo, $tenant); $designed = !empty($d['ok']); }
        return ['validated' => $validated, 'designed' => $designed];
    }

    /** POST /v424/attribution/geo-holdout/auto-design — 수동 트리거(자동 설계 1건). */
    public static function geoHoldoutAutoDesign(Request $request, Response $response, array $args): Response
    {
        $t = self::tenant($request);
        if ($t === '') return self::ok($response, ['ok' => false, 'error' => '인증이 필요합니다.']);
        try {
            $b = (array)($request->getParsedBody() ?? []);
            $r = self::autoDesignGeoHoldout(Db::pdo(), $t, (string)($b['channel'] ?? ''), $b);
            return self::ok($response, $r);
        } catch (Throwable $e) { return self::fail($response, $e, ['ok' => false]); }
    }

    /** GET /v424/attribution/experiments — 목록(테넌트). */
    public static function experiments(Request $request, Response $response, array $args): Response
    {
        $t = self::tenant($request);
        if ($t === '') return self::ok($response, ['ok' => true, 'experiments' => []]);
        try {
            $pdo = Db::pdo(); self::ensureExpTable($pdo);
            $st = $pdo->prepare("SELECT * FROM holdout_experiment WHERE tenant_id=? ORDER BY id DESC");
            $st->execute([$t]);
            $rows = array_map([self::class, 'expRow'], $st->fetchAll(PDO::FETCH_ASSOC) ?: []);
            return self::ok($response, ['ok' => true, 'experiments' => $rows]);
        } catch (Throwable $e) { return self::fail($response, $e, ['ok' => false, 'experiments' => []]); }
    }

    /** POST /v424/attribution/experiments — 실험 설계(draft) 생성. */
    public static function createExperiment(Request $request, Response $response, array $args): Response
    {
        $t = self::tenant($request);
        if ($t === '') return self::ok($response, ['ok' => false, 'error' => '인증이 필요합니다.']);
        try {
            $b = (array)($request->getParsedBody() ?? []);
            $name = trim((string)($b['name'] ?? ''));
            if ($name === '') return self::ok($response, ['ok' => false, 'error' => '실험명을 입력하세요.']);
            $pdo = Db::pdo(); self::ensureExpTable($pdo); $now = gmdate('c');
            $geoStrategy = in_array(($b['geo_strategy'] ?? 'national'), ['national', 'regional', 'demographic'], true) ? (string)$b['geo_strategy'] : 'national';
            $geoRegions = is_array($b['geo_regions'] ?? null) ? implode(',', array_map('strval', $b['geo_regions'])) : substr((string)($b['geo_regions'] ?? ''), 0, 500);
            $st = $pdo->prepare("INSERT INTO holdout_experiment(tenant_id,name,channel,hypothesis,status,control_size,treatment_size,revenue_per_conversion,start_date,end_date,geo_strategy,geo_regions,created_at,updated_at)
                                 VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)");
            $st->execute([$t, substr($name, 0, 200), substr((string)($b['channel'] ?? ''), 0, 60), substr((string)($b['hypothesis'] ?? ''), 0, 500),
                'draft', (float)($b['control_size'] ?? 0), (float)($b['treatment_size'] ?? 0), (float)($b['revenue_per_conversion'] ?? 0),
                substr((string)($b['start_date'] ?? ''), 0, 20), substr((string)($b['end_date'] ?? ''), 0, 20), $geoStrategy, $geoRegions, $now, $now]);
            return self::ok($response, ['ok' => true, 'id' => (int)$pdo->lastInsertId()]);
        } catch (Throwable $e) { return self::fail($response, $e, ['ok' => false]); }
    }

    /** PUT /v424/attribution/experiments/{id} — 상태/결과 갱신. 결과 입력 시 computeLift 자동 검정·영속. */
    public static function updateExperiment(Request $request, Response $response, array $args): Response
    {
        $t = self::tenant($request);
        if ($t === '') return self::ok($response, ['ok' => false, 'error' => '인증이 필요합니다.']);
        try {
            $id = (int)($args['id'] ?? 0);
            $pdo = Db::pdo(); self::ensureExpTable($pdo);
            $cur = $pdo->prepare("SELECT * FROM holdout_experiment WHERE id=? AND tenant_id=?");
            $cur->execute([$id, $t]); $row = $cur->fetch(PDO::FETCH_ASSOC);
            if (!$row) return self::ok($response, ['ok' => false, 'error' => '실험을 찾을 수 없습니다.']);
            $b = (array)($request->getParsedBody() ?? []);
            $f = fn($k, $d) => array_key_exists($k, $b) ? $b[$k] : $d;
            $cs = (float)$f('control_size', $row['control_size']);
            $ts = (float)$f('treatment_size', $row['treatment_size']);
            $cc = (float)$f('control_conversions', $row['control_conversions']);
            $tc = (float)$f('treatment_conversions', $row['treatment_conversions']);
            $rpc = (float)$f('revenue_per_conversion', $row['revenue_per_conversion']);
            $status = (string)$f('status', $row['status']);
            $validStatus = ['draft', 'running', 'concluded'];
            if (!in_array($status, $validStatus, true)) $status = (string)$row['status'];
            // concluded 로 전환(또는 이미 concluded) + 유효 규모 → 자동 검정.
            $resultJson = $row['result_json'];
            if ($status === 'concluded' && $cs > 0 && $ts > 0 && $cc <= $cs && $tc <= $ts) {
                $resultJson = json_encode(self::computeLift($cc, $cs, $tc, $ts, $rpc), JSON_UNESCAPED_UNICODE);
            }
            // [R-P1-1] geo 홀드아웃 — 지역별 control/treatment 입력 시 지역 서브그룹 리프트 자동검정(이질성 포착).
            $geoStrategy = in_array(($b['geo_strategy'] ?? ($row['geo_strategy'] ?? 'national')), ['national', 'regional', 'demographic'], true)
                ? (string)($b['geo_strategy'] ?? $row['geo_strategy'] ?? 'national') : 'national';
            $geoRegions = array_key_exists('geo_regions', $b)
                ? (is_array($b['geo_regions']) ? implode(',', array_map('strval', $b['geo_regions'])) : substr((string)$b['geo_regions'], 0, 500))
                : (string)($row['geo_regions'] ?? '');
            $geoResults = $row['geo_results'] ?? null;
            if (is_array($b['geo_breakdown'] ?? null)) {
                $gr = [];
                foreach ($b['geo_breakdown'] as $g) {
                    $g = (array)$g;
                    $gcs = (float)($g['control_size'] ?? 0); $gts = (float)($g['treatment_size'] ?? 0);
                    $gcc = (float)($g['control_conversions'] ?? 0); $gtc = (float)($g['treatment_conversions'] ?? 0);
                    if ($gcs <= 0 || $gts <= 0 || $gcc > $gcs || $gtc > $gts) continue;
                    $gr[] = ['region' => substr((string)($g['region'] ?? ''), 0, 60)] + self::computeLift($gcc, $gcs, $gtc, $gts, $rpc);
                }
                $geoResults = $gr ? json_encode($gr, JSON_UNESCAPED_UNICODE) : $geoResults;
            }
            $up = $pdo->prepare("UPDATE holdout_experiment SET status=?, control_size=?, treatment_size=?, control_conversions=?, treatment_conversions=?, revenue_per_conversion=?, result_json=?, geo_strategy=?, geo_regions=?, geo_results=?, updated_at=? WHERE id=? AND tenant_id=?");
            $up->execute([$status, $cs, $ts, $cc, $tc, $rpc, $resultJson, $geoStrategy, $geoRegions, $geoResults, gmdate('c'), $id, $t]);
            $cur->execute([$id, $t]);
            return self::ok($response, ['ok' => true, 'experiment' => self::expRow($cur->fetch(PDO::FETCH_ASSOC))]);
        } catch (Throwable $e) { return self::fail($response, $e, ['ok' => false]); }
    }

    /** DELETE /v424/attribution/experiments/{id}. */
    public static function deleteExperiment(Request $request, Response $response, array $args): Response
    {
        $t = self::tenant($request);
        if ($t === '') return self::ok($response, ['ok' => false, 'error' => '인증이 필요합니다.']);
        try {
            $id = (int)($args['id'] ?? 0);
            $pdo = Db::pdo(); self::ensureExpTable($pdo);
            $st = $pdo->prepare("DELETE FROM holdout_experiment WHERE id=? AND tenant_id=?");
            $st->execute([$id, $t]);
            if ($st->rowCount() === 0) return self::ok($response, ['ok' => false, 'error' => '실험을 찾을 수 없습니다.']);
            return self::ok($response, ['ok' => true, 'deleted_id' => $id]);
        } catch (Throwable $e) { return self::fail($response, $e, ['ok' => false]); }
    }

    /**
     * [차기 P1] GET /v424/attribution/experiments/geo-readiness?channel=&window=90
     *   geo 홀드아웃 *실행 표준화*: 지역별 실측 노출(ad_insight_agg)에서 균형 잡힌 treatment/control 지역 분할을
     *   자동 추천하고, 추천 분할의 검정력(MDE·필요기간)을 산출한다. 실험을 "스키마/수동검정"에서
     *   "데이터 기반 설계→배정→검정력 확인" 표준 워크플로우로 승격.
     *
     *   ★날조 0: ad_insight_agg 는 광고 노출 기반 데이터이므로 control(무노출 지역 유기 전환)을 여기서
     *   날조하지 않는다. 본 엔드포인트는 *설계 보조*(지역 균형 분할·검정력)만 제공하고, 실제 리프트는
     *   updateExperiment 의 geo_breakdown(플랫폼 conversion-lift 실측) 입력으로만 검정된다.
     *   분할은 LPT(longest-processing-time) 그리디로 두 그룹 노출(클릭)을 균형화.
     */
    public static function geoReadiness(Request $request, Response $response, array $args): Response
    {
        $start = microtime(true);
        $t = self::tenant($request);
        $empty = ['ok' => true, 'regions' => [], 'feasible' => false, 'reason' => '인증/데이터 없음'];
        if ($t === '') return self::ok($response, $empty + ['response_time_ms' => self::elapsed($start)]);
        try {
            $q = $request->getQueryParams();
            $window = max(7, min(365, (int)($q['window'] ?? self::DEFAULT_WINDOW)));
            $channel = strtolower(trim((string)($q['channel'] ?? '')));
            $since = gmdate('Y-m-d', time() - $window * 86400);
            $pdo = Db::pdo();

            // 지역별 실측 노출/전환(ad_insight_agg). 채널 미지정 시 전 채널 합.
            $sql = "SELECT region, SUM(impressions) im, SUM(clicks) ck, SUM(conversions) cv, SUM(spend) sp, SUM(revenue) rv
                      FROM ad_insight_agg
                     WHERE tenant_id=? AND date>=? AND region IS NOT NULL AND region<>''";
            $params = [$t, $since];
            if ($channel !== '') { $sql .= " AND LOWER(platform)=?"; $params[] = $channel; }
            $sql .= " GROUP BY region ORDER BY ck DESC";
            $st = $pdo->prepare($sql); $st->execute($params);
            $regions = [];
            foreach ($st->fetchAll(PDO::FETCH_ASSOC) ?: [] as $r) {
                $ck = (int)$r['ck']; $cv = (int)$r['cv'];
                $regions[] = [
                    'region' => (string)$r['region'],
                    'impressions' => (int)$r['im'], 'clicks' => $ck, 'conversions' => $cv,
                    'spend' => round((float)$r['sp'], 0), 'revenue' => round((float)$r['rv'], 0),
                    'cvr' => $ck > 0 ? round($cv / $ck * 100, 3) : 0.0,
                ];
            }
            if (count($regions) < 2) {
                return self::ok($response, $empty + ['regions' => $regions, 'reason' => '지역 차원 데이터가 2개 미만입니다. 지역 분해 수집(ad_insight_agg.region) 후 설계됩니다.', 'response_time_ms' => self::elapsed($start)]);
            }

            // LPT 그리디 — 노출(클릭) 균형 2그룹 분할(A=treatment 후보, B=control 후보).
            $A = ['regions' => [], 'clicks' => 0, 'conv' => 0]; $B = ['regions' => [], 'clicks' => 0, 'conv' => 0];
            foreach ($regions as $r) { // clicks 내림차순(이미 정렬)
                $tgt = ($A['clicks'] <= $B['clicks']) ? 'A' : 'B';
                if ($tgt === 'A') { $A['regions'][] = $r['region']; $A['clicks'] += $r['clicks']; $A['conv'] += $r['conversions']; }
                else { $B['regions'][] = $r['region']; $B['clicks'] += $r['clicks']; $B['conv'] += $r['conversions']; }
            }
            $totalClicks = $A['clicks'] + $B['clicks'];
            $balance = $totalClicks > 0 ? round(1 - abs($A['clicks'] - $B['clicks']) / $totalClicks, 3) : 0.0; // 1=완전균형
            // 검정력 — 작은 그룹 기준(보수적): holdoutPower(전환, 클릭, window).
            $small = $A['clicks'] <= $B['clicks'] ? $A : $B;
            $power = self::holdoutPower((float)$small['conv'], (int)$small['clicks'], $window);

            return self::ok($response, [
                'ok' => true,
                'channel' => $channel !== '' ? $channel : '(전체)',
                'window_days' => $window,
                'regions' => $regions,
                'recommended_split' => [
                    'treatment_regions' => $A['regions'], 'treatment_clicks' => $A['clicks'], 'treatment_conversions' => $A['conv'],
                    'control_regions' => $B['regions'], 'control_clicks' => $B['clicks'], 'control_conversions' => $B['conv'],
                    'balance_score' => $balance,
                    'geo_regions_value' => implode(',', $A['regions']), // updateExperiment geo_regions 에 그대로 적용 가능
                ],
                'power' => $power,
                'feasible' => ($power['feasible'] ?? false) && $balance >= 0.6,
                'note' => '지역별 실측 노출 기반 균형 분할(treatment/control) 추천 + 검정력. 실제 증분 리프트는 무노출 control 지역의 전환을 플랫폼 conversion-lift 또는 자체 측정으로 입력(geo_breakdown)해야 검정됩니다.',
                'response_time_ms' => self::elapsed($start),
            ]);
        } catch (Throwable $e) {
            return self::fail($response, $e, $empty);
        }
    }

    /** 채널별 spend/clicks/impressions 합(window, performance_metrics). lower(channel) 키. */
    private static function channelSpendMap(PDO $pdo, string $tenant, int $window): array
    {
        $since = gmdate('Y-m-d', time() - $window * 86400);
        $out = [];
        try {
            $st = $pdo->prepare("SELECT LOWER(channel) ch, SUM(spend) sp, SUM(clicks) ck, SUM(impressions) im
                                 FROM performance_metrics WHERE tenant_id=? AND date>=? GROUP BY LOWER(channel)");
            $st->execute([$tenant, $since]);
            foreach ($st->fetchAll(PDO::FETCH_ASSOC) ?: [] as $r) {
                $out[(string)$r['ch']] = ['spend' => (float)$r['sp'], 'clicks' => (int)$r['ck'], 'impressions' => (int)$r['im']];
            }
        } catch (\Throwable $e) { /* graceful — 빈 맵(증분 ROAS 만 null) */ }
        return $out;
    }

    /**
     * 50/50 홀드아웃 실험 검정력 — 채널 관측 전환율(conv/clicks)·일 클릭량 기준 최소검출효과(MDE)·필요기간.
     *   N = 2·(z_a+z_b)²·p(1-p)/(p·L)² (그룹당). z_a=1.96(α=.05 양측)·z_b=0.84(검정력 80%) → (z_a+z_b)²≈7.85.
     *   실 실험 설계 안내(데이터 부족 시 feasible=false). 임의 숫자 아님 — 채널 실측치 파생.
     */
    private static function holdoutPower(float $conversions, int $clicks, int $window): array
    {
        if ($clicks <= 0 || $conversions <= 0) {
            return ['feasible' => false, 'reason' => '클릭/전환 데이터 부족', 'base_cvr' => 0.0];
        }
        $p = min(0.99, $conversions / $clicks);   // 관측 전환율(클릭당)
        if ($p <= 0) return ['feasible' => false, 'reason' => '전환율 0', 'base_cvr' => 0.0];
        $K = 7.85; // (z_a+z_b)²
        $dailyClicks = $clicks / max(1, $window); // 실 window 기준 일평균 클릭
        // 그룹당 N(d일) = dailyClicks/2 × d. MDE(상대) = (z_a+z_b)·sqrt(2(1-p)/(p·N)).
        $mdeFor = function (int $days) use ($p, $dailyClicks, $K): ?float {
            $N = ($dailyClicks / 2.0) * $days;
            if ($N <= 0) return null;
            return sqrt(2.0 * (1 - $p) * $K / ($p * $N)); // 상대 MDE
        };
        // 10% 상대 리프트 검출 필요 그룹당 N → 일수.
        $L = 0.10;
        $nFor10 = 2.0 * $K * (1 - $p) / ($p * $L * $L);
        $daysFor10 = $dailyClicks > 0 ? (int)ceil($nFor10 / ($dailyClicks / 2.0)) : null;
        $mde14 = $mdeFor(14); $mde28 = $mdeFor(28);
        return [
            'feasible'         => $daysFor10 !== null && $daysFor10 <= 120,
            'base_cvr'         => round($p * 100, 3),
            'mde_14d_pct'      => $mde14 !== null ? round($mde14 * 100, 1) : null,
            'mde_28d_pct'      => $mde28 !== null ? round($mde28 * 100, 1) : null,
            'days_for_10pct_lift' => $daysFor10,
        ];
    }

    /** 표준정규 누적분포(Abramowitz-Stegun 7.1.26 erf 근사). p값·검정력 계산용. */
    private static function normalCdf(float $x): float
    {
        $t = 1.0 / (1.0 + 0.2316419 * abs($x));
        $d = 0.3989422804014327 * exp(-$x * $x / 2.0);
        $prob = $d * $t * (0.319381530 + $t * (-0.356563782 + $t * (1.781477937 + $t * (-1.821255978 + $t * 1.330274429))));
        return $x > 0 ? 1.0 - $prob : $prob;
    }

    // ── 데이터 적재: 전환 여정 + 비전환(null) 여정 ─────────────────────────
    /**
     * @return array{0: array<int,array>, 1: array<int,array>}
     *   convJourneys[i] = ['channels'=>[...순서], 'times'=>[epoch...], 'conv_time'=>epoch, 'revenue'=>float]
     *   nullJourneys[i] = ['channels'=>[...순서]]
     */
    private static function loadJourneys(PDO $pdo, string $tenant, int $window): array
    {
        $sinceDate = gmdate('Y-m-d', time() - $window * 86400);

        // 1) 전환된 order_id 집합 + 전환 시각(created_at) — attribution_result.
        $rs = $pdo->prepare(
            'SELECT order_id, MAX(created_at) AS conv_at FROM attribution_result '
            . 'WHERE tenant_id = :t AND order_id IS NOT NULL AND order_id <> \'\' '
            . "AND DATE(created_at) >= :since GROUP BY order_id LIMIT " . self::MAX_ORDERS
        );
        $rs->execute([':t' => $tenant, ':since' => $sinceDate]);
        $convAt = [];
        foreach ($rs->fetchAll(PDO::FETCH_ASSOC) ?: [] as $r) {
            $convAt[(string)$r['order_id']] = self::ts((string)$r['conv_at']);
        }
        if (empty($convAt)) return [[], self::loadNullJourneys($pdo, $tenant, $sinceDate, [])];

        // 2) 전환 order 들의 모든 터치(시간순).
        $orderIds = array_keys($convAt);
        $convJourneys = [];
        foreach (array_chunk($orderIds, 500) as $chunk) {
            $ph = implode(',', array_fill(0, count($chunk), '?'));
            $st = $pdo->prepare(
                'SELECT order_id, channel, touched_at, extra_json FROM attribution_touch '
                . 'WHERE tenant_id = ? AND order_id IN (' . $ph . ') AND channel IS NOT NULL AND channel <> \'\' '
                . 'ORDER BY order_id, touched_at, id'
            );
            $st->execute(array_merge([$tenant], $chunk));
            $byOrder = [];
            foreach ($st->fetchAll(PDO::FETCH_ASSOC) ?: [] as $row) {
                $oid = (string)$row['order_id'];
                $byOrder[$oid][] = $row;
            }
            foreach ($byOrder as $oid => $touches) {
                $channels = []; $times = []; $views = []; $revenue = 0.0;
                foreach ($touches as $tr) {
                    $ch = self::normChannel((string)$tr['channel']);
                    if ($ch === '') continue;
                    $isView = self::isViewThrough((string)($tr['extra_json'] ?? '')); // [240차 ⑧-A] 노출 터치 여부
                    // 연속 중복 채널은 self-loop 회피를 위해 축약(시퀀스 의미 보존).
                    if (!empty($channels) && end($channels) === $ch) {
                        $times[count($times) - 1] = self::ts((string)$tr['touched_at']); // 최신 터치 시각 갱신
                        $views[count($views) - 1] = ($views[count($views) - 1] && $isView); // 클릭 1건이라도 있으면 클릭 우선
                        continue;
                    }
                    $channels[] = $ch;
                    $times[] = self::ts((string)$tr['touched_at']);
                    $views[] = $isView;
                    if ($revenue <= 0) $revenue = self::extractRevenue((string)($tr['extra_json'] ?? ''));
                }
                if (empty($channels)) continue;
                $ct = $convAt[$oid] ?? end($times);
                if ($ct <= 0) $ct = end($times);
                $convJourneys[] = ['channels' => $channels, 'times' => $times, 'views' => $views, 'conv_time' => $ct, 'revenue' => $revenue];
            }
        }

        $nullJourneys = self::loadNullJourneys($pdo, $tenant, $sinceDate, array_flip($orderIds));
        return [$convJourneys, $nullJourneys];
    }

    /** 비전환 여정 — session_id 단위(전환 order 에 속하지 않은 터치). Markov null 경로용. */
    private static function loadNullJourneys(PDO $pdo, string $tenant, string $sinceDate, array $convOrderSet): array
    {
        try {
            $st = $pdo->prepare(
                'SELECT session_id, channel, order_id, touched_at FROM attribution_touch '
                . 'WHERE tenant_id = :t AND session_id IS NOT NULL AND session_id <> \'\' '
                . 'AND channel IS NOT NULL AND channel <> \'\' AND DATE(touched_at) >= :since '
                . 'ORDER BY session_id, touched_at, id LIMIT 100000'
            );
            $st->execute([':t' => $tenant, ':since' => $sinceDate]);
        } catch (Throwable $e) {
            return [];
        }
        $bySession = [];
        foreach ($st->fetchAll(PDO::FETCH_ASSOC) ?: [] as $row) {
            $oid = (string)($row['order_id'] ?? '');
            if ($oid !== '' && isset($convOrderSet[$oid])) continue; // 전환 여정은 제외(중복 방지)
            $sid = (string)$row['session_id'];
            $ch = self::normChannel((string)$row['channel']);
            if ($ch === '') continue;
            if (!empty($bySession[$sid]) && end($bySession[$sid]) === $ch) continue; // 연속중복 축약
            $bySession[$sid][] = $ch;
        }
        $out = [];
        foreach ($bySession as $channels) {
            if (!empty($channels)) $out[] = ['channels' => $channels];
        }
        return $out;
    }

    // ── 순수 계산: 6개 모델 크레딧 ─────────────────────────────────────────
    /**
     * @param array $convJourneys 전환 여정(channels/times/conv_time/revenue)
     * @param array $nullJourneys 비전환 여정(channels)
     * @return array{models: array, channels: array}
     */
    public static function computeModels(array $convJourneys, array $nullJourneys, float $halflife = self::DEFAULT_HALFLIFE, float $vtWeight = 1.0): array
    {
        // [240차 ⑧-A] 뷰스루 가중치 — 노출(view-through) 터치는 클릭 대비 낮은 기여(vtWeight, 기본 1.0=영향없음/회귀0).
        //   view_through 플래그가 있는 포지션만 vtWeight 배율 후 재정규화. iOS 프라이버시 시대 노출기여 반영.
        $vtWeight = max(0.0, min(1.0, $vtWeight));
        $modelsConv = [
            'last_touch' => [], 'first_touch' => [], 'linear' => [],
            'time_decay' => [], 'position_based' => [],
        ];
        $modelsRev = [
            'last_touch' => [], 'first_touch' => [], 'linear' => [],
            'time_decay' => [], 'position_based' => [],
        ];
        $channelSet = [];
        $totalConv = 0.0; $totalRev = 0.0;

        foreach ($convJourneys as $j) {
            $chs = $j['channels'];
            $n = count($chs);
            if ($n === 0) continue;
            $rev = (float)($j['revenue'] ?? 0);
            $totalConv += 1.0; $totalRev += $rev;
            foreach ($chs as $c) $channelSet[$c] = true;

            // [240차 ⑧-A] 포지션별 뷰스루 배율(view_through=true → vtWeight). 합이 0이면 균등 폴백.
            $views = $j['views'] ?? [];
            $vm = []; $sumVm = 0.0;
            for ($i = 0; $i < $n; $i++) { $vm[$i] = !empty($views[$i]) ? $vtWeight : 1.0; $sumVm += $vm[$i]; }
            if ($sumVm <= 0) { $vm = array_fill(0, $n, 1.0); $sumVm = (float)$n; }

            // last / first (단일터치 모델 — 시퀀스 의미 유지)
            self::addCredit($modelsConv['last_touch'], $modelsRev['last_touch'], $chs[$n - 1], 1.0, $rev);
            self::addCredit($modelsConv['first_touch'], $modelsRev['first_touch'], $chs[0], 1.0, $rev);

            // linear (이벤트 균등 × 뷰스루 배율 → 재정규화)
            for ($i = 0; $i < $n; $i++) {
                self::addCredit($modelsConv['linear'], $modelsRev['linear'], $chs[$i], $vm[$i] / $sumVm, $rev * $vm[$i] / $sumVm);
            }

            // time_decay (지수감쇠 × 뷰스루 배율)
            $convT = (float)($j['conv_time'] ?? 0);
            $times = $j['times'] ?? [];
            $w = []; $sumW = 0.0;
            for ($i = 0; $i < $n; $i++) {
                $tt = (float)($times[$i] ?? $convT);
                $dDays = max(0.0, ($convT - $tt) / 86400.0);
                $wi = pow(2.0, -$dDays / max(0.5, $halflife)) * $vm[$i];
                $w[$i] = $wi; $sumW += $wi;
            }
            if ($sumW <= 0) { $sumW = $n; $w = array_fill(0, $n, 1.0); }
            for ($i = 0; $i < $n; $i++) {
                self::addCredit($modelsConv['time_decay'], $modelsRev['time_decay'], $chs[$i], $w[$i] / $sumW, $rev * $w[$i] / $sumW);
            }

            // position_based (U-shaped × 뷰스루 배율 → 재정규화)
            $pw = self::positionWeights($n);
            $pwv = []; $sumPwv = 0.0;
            for ($i = 0; $i < $n; $i++) { $pwv[$i] = $pw[$i] * $vm[$i]; $sumPwv += $pwv[$i]; }
            if ($sumPwv <= 0) { $pwv = $pw; $sumPwv = array_sum($pw) ?: 1.0; }
            for ($i = 0; $i < $n; $i++) {
                self::addCredit($modelsConv['position_based'], $modelsRev['position_based'], $chs[$i], $pwv[$i] / $sumPwv, $rev * $pwv[$i] / $sumPwv);
            }
        }

        // markov (데이터기반 removal effect) — 전환 카운트 배분
        $markovConv = self::markovRemovalEffect($convJourneys, $nullJourneys, $totalConv, $channelSet);

        // 정규화 + 응답 구성
        $channels = array_keys($channelSet);
        sort($channels);
        $out = [];
        foreach (['last_touch','first_touch','linear','time_decay','position_based'] as $m) {
            $out[$m] = self::rankModel($modelsConv[$m], $modelsRev[$m], $totalConv, $totalRev);
        }
        $out['markov'] = self::rankModel($markovConv, [], $totalConv, 0.0);

        // 채널별 모델 교차표(채널 → 모델별 전환크레딧)
        $crosstab = [];
        foreach ($channels as $c) {
            $row = ['channel' => $c];
            foreach ($out as $m => $list) {
                $row[$m] = 0.0;
                foreach ($list as $e) { if ($e['channel'] === $c) { $row[$m] = $e['conversions']; break; } }
            }
            $crosstab[] = $row;
        }

        return [
            'models' => $out,
            'channels' => $crosstab,
            'total_conversions' => round($totalConv, 2),
            'total_revenue' => round($totalRev, 2),
        ];
    }

    /**
     * ★ 데이터기반 어트리뷰션 — 흡수 마르코프 연쇄 removal-effect.
     *
     *  상태: START, CONV(흡수), NULL(흡수), 각 채널.
     *  전이: 전환여정 [c1..cn] → START→c1→…→cn→CONV. 비전환여정 → …→NULL.
     *  전환확률 p(s)=Σ P(s,t)·p(t), p(CONV)=1, p(NULL)=0 → 반복 수렴.
     *  채널 c removal effect = (CR − CR_without_c)/CR. 채널 제거 = c 를 NULL 흡수로 처리.
     *  크레딧_c = removal_c / Σremoval × 전환수.
     *
     * @return array<string,float> channel => conversions credit
     */
    public static function markovRemovalEffect(array $convJourneys, array $nullJourneys, float $totalConv, array $channelSet): array
    {
        $channels = array_keys($channelSet);
        if (empty($channels) || $totalConv <= 0) return [];

        // 전이 카운트 집계.
        $trans = [];   // from => [to => count]
        $add = function (string $from, string $to) use (&$trans) {
            $trans[$from][$to] = ($trans[$from][$to] ?? 0) + 1;
        };
        foreach ($convJourneys as $j) {
            $seq = $j['channels']; if (empty($seq)) continue;
            $add('START', $seq[0]);
            for ($i = 0; $i < count($seq) - 1; $i++) $add($seq[$i], $seq[$i + 1]);
            $add($seq[count($seq) - 1], 'CONV');
        }
        foreach ($nullJourneys as $j) {
            $seq = $j['channels']; if (empty($seq)) continue;
            $add('START', $seq[0]);
            for ($i = 0; $i < count($seq) - 1; $i++) $add($seq[$i], $seq[$i + 1]);
            $add($seq[count($seq) - 1], 'NULL');
        }
        if (empty($trans['START'])) return [];

        // 전이확률 행렬(정규화).
        $prob = [];
        foreach ($trans as $from => $tos) {
            $sum = array_sum($tos);
            if ($sum <= 0) continue;
            foreach ($tos as $to => $c) $prob[$from][$to] = $c / $sum;
        }

        $states = array_merge(['START'], $channels);
        $baseCR = self::solveConversion($prob, $states, null);
        if ($baseCR <= 1e-9) return [];

        $removal = []; $sumRemoval = 0.0;
        foreach ($channels as $c) {
            $cr = self::solveConversion($prob, $states, $c);
            $eff = max(0.0, ($baseCR - $cr) / $baseCR);
            $removal[$c] = $eff; $sumRemoval += $eff;
        }
        if ($sumRemoval <= 1e-9) {
            // 모든 removal 0(예: 단일 채널) → 균등 배분 폴백.
            $credit = [];
            $eq = $totalConv / count($channels);
            foreach ($channels as $c) $credit[$c] = $eq;
            return $credit;
        }
        $credit = [];
        foreach ($channels as $c) $credit[$c] = $removal[$c] / $sumRemoval * $totalConv;
        return $credit;
    }

    /** [현 차수 P3] 부트스트랩 신뢰구간 — convJourneys 복원추출 B회 markov 재계산 → 채널별 credit p5/p95·변동계수(불확실성).
     *  Northbeam급 통계적 신뢰 표면화: 안정(high)/보통/낮음(low) 등급으로 의사결정 신뢰도 제공. */
    public static function confidenceIntervals(array $convJourneys, array $nullJourneys, float $totalConv, array $channelSet, int $B = 40): array
    {
        $channels = array_keys($channelSet);
        $n = count($convJourneys);
        if (empty($channels) || $n === 0) return [];
        $base = self::markovRemovalEffect($convJourneys, $nullJourneys, $totalConv, $channelSet);
        $samples = []; foreach ($channels as $c) $samples[$c] = [];
        for ($b = 0; $b < $B; $b++) {
            $res = [];
            for ($i = 0; $i < $n; $i++) { $res[] = $convJourneys[random_int(0, $n - 1)]; }
            $cr = self::markovRemovalEffect($res, $nullJourneys, $totalConv, $channelSet);
            foreach ($channels as $c) $samples[$c][] = (float)($cr[$c] ?? 0.0);
        }
        $out = [];
        foreach ($channels as $c) {
            $arr = $samples[$c]; sort($arr);
            $cnt = count($arr);
            $m = $cnt ? array_sum($arr) / $cnt : 0.0;
            $var = 0.0; foreach ($arr as $v) $var += ($v - $m) ** 2; $var = $cnt ? $var / $cnt : 0.0;
            $sd = sqrt($var); $cv = $m > 0 ? $sd / $m : 0.0;
            $out[] = [
                'channel' => $c, 'credit' => round((float)($base[$c] ?? $m), 2),
                'lo' => round(self::percentile($arr, 5), 2), 'hi' => round(self::percentile($arr, 95), 2),
                'cv' => round($cv, 3), 'stability' => $cv <= 0.15 ? 'high' : ($cv <= 0.35 ? 'medium' : 'low'),
            ];
        }
        usort($out, fn($a, $b) => $b['credit'] <=> $a['credit']);
        return $out;
    }
    private static function percentile(array $sorted, float $p): float
    {
        $n = count($sorted); if ($n === 0) return 0.0; if ($n === 1) return (float)$sorted[0];
        $idx = ($p / 100) * ($n - 1); $lo = (int)floor($idx); $hi = (int)ceil($idx);
        if ($lo === $hi) return (float)$sorted[$lo];
        return (float)$sorted[$lo] + ((float)$sorted[$hi] - (float)$sorted[$lo]) * ($idx - $lo);
    }
    /** [현 차수 P3] 모델 합의도 — 6개 모델이 한 채널 share에 얼마나 동의하는지(consensus%). 낮으면 모델 선택 민감 = 주의. */
    public static function modelAgreement(array $models, array $channelSet, float $totalConv): array
    {
        $names = array_keys($models);
        $out = [];
        foreach (array_keys($channelSet) as $c) {
            $shares = [];
            foreach ($names as $mn) {
                $cr = 0.0;
                foreach (($models[$mn] ?? []) as $e) { if (($e['channel'] ?? '') === $c) { $cr = (float)($e['conversions'] ?? 0); break; } }
                $shares[] = $totalConv > 0 ? $cr / $totalConv : 0.0;
            }
            $cnt = count($shares); $m = $cnt ? array_sum($shares) / $cnt : 0.0;
            $var = 0.0; foreach ($shares as $s) $var += ($s - $m) ** 2; $var = $cnt ? $var / $cnt : 0.0;
            $cv = $m > 0 ? sqrt($var) / $m : 0.0;
            $out[] = ['channel' => $c, 'consensus' => (int)round(max(0.0, 1 - $cv) * 100), 'avg_share' => round($m * 100, 1)];
        }
        usort($out, fn($a, $b) => $b['avg_share'] <=> $a['avg_share']);
        return $out;
    }

    /**
     * 전환확률 p(START) 반복해 풀기. $removed 채널은 NULL 흡수(p=0 고정·전이 무시).
     */
    private static function solveConversion(array $prob, array $states, ?string $removed): float
    {
        $p = ['CONV' => 1.0, 'NULL' => 0.0];
        foreach ($states as $s) $p[$s] = 0.0;
        if ($removed !== null) $p[$removed] = 0.0;

        for ($iter = 0; $iter < 400; $iter++) {
            $maxDelta = 0.0;
            foreach ($states as $s) {
                if ($s === $removed) continue; // 제거 채널은 0 고정
                $acc = 0.0;
                foreach (($prob[$s] ?? []) as $to => $pr) {
                    if ($to === $removed) continue;          // 제거 채널로의 전이는 소멸(→NULL 효과)
                    $acc += $pr * ($p[$to] ?? 0.0);
                }
                if (abs($acc - $p[$s]) > $maxDelta) $maxDelta = abs($acc - $p[$s]);
                $p[$s] = $acc;
            }
            if ($maxDelta < 1e-10) break;
        }
        return $p['START'] ?? 0.0;
    }

    // ── helpers ────────────────────────────────────────────────────────────

    /** U-shaped position 가중치(합=1). 1터치=1.0, 2터치=0.5/0.5, n≥3=0.4/(0.2 균등)/0.4. */
    private static function positionWeights(int $n): array
    {
        if ($n <= 0) return [];
        if ($n === 1) return [1.0];
        if ($n === 2) return [0.5, 0.5];
        $w = array_fill(0, $n, 0.0);
        $w[0] = 0.4; $w[$n - 1] = 0.4;
        $mid = 0.2 / ($n - 2);
        for ($i = 1; $i < $n - 1; $i++) $w[$i] = $mid;
        return $w;
    }

    private static function addCredit(array &$conv, array &$rev, string $channel, float $c, float $r): void
    {
        $conv[$channel] = ($conv[$channel] ?? 0.0) + $c;
        if ($r != 0.0) $rev[$channel] = ($rev[$channel] ?? 0.0) + $r;
    }

    /** 채널별 크레딧 → 정렬·퍼센트 부여 리스트. */
    private static function rankModel(array $conv, array $rev, float $totalConv, float $totalRev): array
    {
        $list = [];
        foreach ($conv as $ch => $v) {
            $list[] = [
                'channel' => $ch,
                'conversions' => round($v, 3),
                'pct' => $totalConv > 0 ? round($v / $totalConv * 100, 2) : 0.0,
                'revenue' => round((float)($rev[$ch] ?? 0), 2),
                'revenue_pct' => $totalRev > 0 ? round((float)($rev[$ch] ?? 0) / $totalRev * 100, 2) : 0.0,
            ];
        }
        usort($list, fn($a, $b) => $b['conversions'] <=> $a['conversions']);
        return $list;
    }

    /** extra_json 에서 매출 신호 추출(revenue/order_value/amount/total). 없으면 0. */
    private static function extractRevenue(string $extraJson): float
    {
        if ($extraJson === '') return 0.0;
        $d = json_decode($extraJson, true);
        if (!is_array($d)) return 0.0;
        foreach (['revenue', 'order_value', 'amount', 'total', 'value'] as $k) {
            if (isset($d[$k]) && is_numeric($d[$k])) return (float)$d[$k];
        }
        return 0.0;
    }

    /** [240차 ⑧-A] 노출(view-through) 터치 판정 — extra_json 의 view_through/vt true 또는 event=impression/view-only. */
    private static function isViewThrough(string $extraJson): bool
    {
        if ($extraJson === '') return false;
        $d = json_decode($extraJson, true);
        if (!is_array($d)) return false;
        if (!empty($d['view_through']) || !empty($d['vt'])) return true;
        $ev = strtolower((string)($d['event'] ?? ''));
        return in_array($ev, ['impression', 'ad_view', 'view'], true);
    }

    private static function normChannel(string $ch): string
    {
        $ch = trim($ch);
        return $ch === '' ? '' : mb_strtolower($ch);
    }

    /** ISO/날짜 문자열 → epoch. 실패 시 0. */
    private static function ts(string $s): int
    {
        $s = trim($s);
        if ($s === '') return 0;
        $u = strtotime($s);
        return $u === false ? 0 : $u;
    }

    /** 인증 미들웨어가 주입한 tenant. 미해결 시 '' → 빈 결과(유출 차단).
     *  [현 차수] 219 P2: raw X-Tenant-Id 헤더 폴백 제거 — 인증 키/세션이 주입한 auth_tenant 만 신뢰한다.
     *  과거엔 auth_tenant 미해결 시 클라이언트 위조 가능한 raw 헤더로 폴백해 타 테넌트 어트리뷰션을
     *  열람할 위험이 있었다(AutoRecommend/Connectors 의 안전 패턴과 정합). */
    private static function tenant(Request $request): string
    {
        $t = $request->getAttribute('auth_tenant');
        $t = trim((string)(is_string($t) ? $t : ''));
        return ($t === '' || strtolower($t) === 'unknown') ? '' : $t;
    }

    private static function elapsed(float $start): float
    {
        return round((microtime(true) - $start) * 1000, 2);
    }

    // ── [228차 S2] markov 모델 선계산 + 캐시 ──────────────────────────────
    /**
     * markov 모델 계산 + 캐시 저장(attribution_cron·models 공용). 전환 여정이 없으면 빈 결과도 캐시한다.
     *   (cron 이 주기 선계산 → models 는 캐시 신선 시 즉시 반환. 캐시 미스 시 본 메서드가 라이브 계산+저장.)
     */
    public static function precompute(PDO $pdo, string $t, int $window = self::DEFAULT_WINDOW, float $halflife = self::DEFAULT_HALFLIFE, float $vtWeight = 1.0): array
    {
        [$convJourneys, $nullJourneys] = self::loadJourneys($pdo, $t, $window);
        if (empty($convJourneys)) {
            $r = ['models' => new \stdClass(), 'channels' => [], 'data_driven' => 'markov',
                  'window_days' => $window, 'journeys' => count($nullJourneys), 'converted' => 0,
                  'note' => '전환(attribution_result)에 연결된 터치 여정이 아직 없습니다. 전환 스코어링 후 자동 반영됩니다.'];
        } else {
            $r = self::computeModels($convJourneys, $nullJourneys, $halflife, $vtWeight);
            $r['window_days'] = $window; $r['halflife_days'] = $halflife; $r['vt_weight'] = $vtWeight;
            $r['journeys'] = count($convJourneys) + count($nullJourneys);
            $r['converted'] = count($convJourneys); $r['data_driven'] = 'markov';
        }
        // [240차 ⑧-A] 비기본 vtWeight 결과는 캐시 저장 스킵(기본 캐시 오염 방지 — 캐시 키는 window+halflife만).
        if ($vtWeight >= 1.0) self::cachePut($pdo, $t, $window, $halflife, $r);
        return $r;
    }

    private static function ckey(string $t, int $w, float $hl): string
    {
        return $t . ':' . $w . ':' . number_format($hl, 1, '.', '');
    }

    private static function ensureCacheTable(PDO $pdo): void
    {
        $isMy = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'mysql';
        try {
            $pdo->exec($isMy
                ? "CREATE TABLE IF NOT EXISTS attribution_model_cache (ckey VARCHAR(220) PRIMARY KEY, tenant_id VARCHAR(190), result_json LONGTEXT, computed_at VARCHAR(40)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
                : "CREATE TABLE IF NOT EXISTS attribution_model_cache (ckey TEXT PRIMARY KEY, tenant_id TEXT, result_json TEXT, computed_at TEXT)");
        } catch (\Throwable $e) { /* 미존재/권한 — graceful(캐시 없이 라이브 계산) */ }
    }

    /** 신선한 캐시(ttl초 이내)면 디코드 결과 반환, 아니면 null. */
    private static function cacheGet(PDO $pdo, string $t, int $w, float $hl, int $ttl): ?array
    {
        try {
            self::ensureCacheTable($pdo);
            $st = $pdo->prepare("SELECT result_json, computed_at FROM attribution_model_cache WHERE ckey=? LIMIT 1");
            $st->execute([self::ckey($t, $w, $hl)]);
            $r = $st->fetch(PDO::FETCH_ASSOC);
            if (!$r) return null;
            $computedAt = strtotime((string)($r['computed_at'] ?? ''));
            if ($computedAt < time() - $ttl) return null; // 만료
            $d = json_decode((string)($r['result_json'] ?? ''), true);
            if (!is_array($d)) return null;
            $d['cache_age_seconds'] = max(0, time() - $computedAt); // [준실시간] 신선도 노출
            $d['cache_computed_at'] = (string)($r['computed_at'] ?? '');
            return $d;
        } catch (\Throwable $e) { return null; }
    }

    private static function cachePut(PDO $pdo, string $t, int $w, float $hl, array $r): void
    {
        try {
            self::ensureCacheTable($pdo);
            $json = json_encode($r, JSON_UNESCAPED_UNICODE); $now = gmdate('c'); $ck = self::ckey($t, $w, $hl);
            $u = $pdo->prepare("UPDATE attribution_model_cache SET result_json=?, computed_at=?, tenant_id=? WHERE ckey=?");
            $u->execute([$json, $now, $t, $ck]);
            if ($u->rowCount() === 0) {
                $pdo->prepare("INSERT INTO attribution_model_cache(ckey,tenant_id,result_json,computed_at) VALUES(?,?,?,?)")->execute([$ck, $t, $json, $now]);
            }
        } catch (\Throwable $e) { /* graceful */ }
    }

    private static function ok(Response $response, array $payload): Response
    {
        return TemplateResponder::respond($response->withStatus(200), $payload);
    }

    private static function fail(Response $response, Throwable $e, array $emptyShape): Response
    {
        return TemplateResponder::respond($response->withStatus(500), array_merge(['error' => $e->getMessage()], $emptyShape));
    }
}
