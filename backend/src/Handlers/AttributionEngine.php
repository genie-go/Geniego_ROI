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
    /** [283차 P2] 크레딧 산출 차원. channel=기존 동작(회귀0)·campaign=채널×캠페인·creative=채널×캠페인×소재. */
    private const GRANULARITIES = ['channel', 'campaign', 'creative'];
    /** [283차 P2 성능] 비채널 차원의 markov 상태공간 상한. markovRemovalEffect 는 키 1개당 흡수연쇄를 1회씩
     *  재수렴(O(K)×solveConversion)하므로 소재 차원에서 키가 수백 개로 폭증하면 응답이 초 단위로 악화된다.
     *  터치 빈도 상위 K개만 고유키로 두고 나머지는 '<채널> / (other)' 로 접어 상태공간을 제한한다(크레딧 총합 보존). */
    private const MAX_GRAN_KEYS = 80;

    // ── GET /v424/attribution/models ───────────────────────────────────────
    public static function models(Request $request, Response $response, array $args): Response
    {
        $start = microtime(true);
        $t = self::tenant($request);
        $empty = ['models' => new \stdClass(), 'channels' => [], 'data_driven' => 'markov',
                  'journeys' => 0, 'converted' => 0, 'window_days' => self::DEFAULT_WINDOW,
                  'granularity' => 'channel']; // [283차 P2]
        if ($t === '') return self::ok($response, $empty + ['response_time_ms' => self::elapsed($start)]);

        try {
            $q = $request->getQueryParams();
            $window = max(1, min(730, (int)($q['window'] ?? self::DEFAULT_WINDOW)));
            $halflife = max(0.5, min(90.0, (float)($q['halflife'] ?? self::DEFAULT_HALFLIFE)));
            // [240차 ⑧-A] 뷰스루 가중치(0~1, 기본 1.0=영향없음). 비기본 시 캐시 우회(라이브 계산).
            // [260차 심화] vt_weight=auto → 데이터 기반 자동보정. vt_halflife>0 → 뷰스루 전용 반감기 자동감쇠.
            $vtAuto = strtolower(trim((string)($q['vt_weight'] ?? ''))) === 'auto';
            $vtWeight = $vtAuto ? 1.0 : max(0.0, min(1.0, (float)($q['vt_weight'] ?? 1.0)));
            $vtHalflife = max(0.0, min(90.0, (float)($q['vt_halflife'] ?? 0.0)));
            // [264차 성숙화] vt_window(일)>0 → 결정론적 뷰스루 윈도우(전환-노출 간격 초과 노출 기여 0). 클릭윈도우와 분리.
            $vtWindow = max(0.0, min(365.0, (float)($q['vt_window'] ?? 0.0)));
            // [차기 P1 준실시간] fresh=1 → 캐시 우회 강제 재계산(대시보드 "지금 새로고침"). max_age 로 신선도 임계 조정 가능(기본 1800s).
            $fresh = in_array((string)($q['fresh'] ?? ''), ['1', 'true', 'yes'], true);
            $maxAge = max(60, min(1800, (int)($q['max_age'] ?? 1800)));
            // [283차 P2] ad/creative-level MTA — 크레딧 산출 차원. attribution_touch 는 utm_campaign/content/term 을
            //   이미 저장(PixelTracking::bridgeToAttribution)하는데 엔진이 채널 단일키로만 group-by 해서
            //   "어떤 캠페인·어떤 소재가 기여했나"(Northbeam/Triple Whale 핵심 판매포인트)에 답할 수 없었다.
            //   신규 수집 불요(데이터 이미 적재). 기본 channel = 기존 동작 그대로(회귀 0).
            $gran = strtolower(trim((string)($q['granularity'] ?? 'channel')));
            if (!in_array($gran, self::GRANULARITIES, true)) $gran = 'channel';

            $pdo = Db::pdo();
            // [228차 S2] ★캐시 우선 — attribution_cron 선계산 결과가 신선하면 즉시 반환.
            //   기존엔 대시보드 히트마다 동기 재계산(대용량 테넌트 MAX_ORDERS=20000 스캔 지연). 캐시 미스 시 라이브 계산+저장.
            //   [283차 P2] 캐시 키에 granularity 포함(ckey) → 차원별 캐시 격리(오염 방지).
            if ($vtWeight >= 1.0 && $vtHalflife <= 0.0 && !$vtAuto && $vtWindow <= 0.0 && !$fresh) {
                $cached = self::cacheGet($pdo, $t, $window, $halflife, $maxAge, $gran);
                if ($cached !== null) {
                    $cached['cached'] = true;
                    $cached['response_time_ms'] = self::elapsed($start);
                    return self::ok($response, $cached);
                }
            }
            $result = self::precompute($pdo, $t, $window, $halflife, $vtWeight, $vtHalflife, $vtAuto, $vtWindow, $gran);
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
        $lang = \Genie\I18n::lang($request);
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
            // [현 차수 초고도화 ③] 캘리브레이션 — 모델 예측(share) vs 실험 ground-truth(holdout lift) 방향 일치도.
            //   단위가 달라 정밀 비율은 오해소지 → 방향(과대/과소/정합) 진단으로 신뢰도만 제시.
            $calCovered = 0; $calAligned = 0;
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
                // [현 차수 ③] 캘리브레이션 — holdout 실험 보유 채널만: 모델 share vs 실측 lift 방향 일치.
                $cal = null;
                if (isset($hold[$lc])) {
                    $calCovered++;
                    $lift = (float)($hold[$lc]['lift'] ?? 0);
                    $expInc = !empty($hold[$lc]['sig']) && $lift > 0; // 유의+양의 lift = 실측 증분
                    if ($expInc && $blendedShare >= 0.10) { $cal = 'aligned'; $calAligned++; }
                    elseif (!$expInc && $blendedShare >= 0.20) $cal = 'over_attributed';
                    elseif ($expInc && $blendedShare < 0.05) $cal = 'under_attributed';
                    else $cal = 'inconclusive';
                }
                $rows[] = [
                    'channel' => $disp[$lc] ?? $lc,
                    'blended_incremental_share' => round($blendedShare * 100, 1),
                    'markov_share' => isset($mkShare[$lc]) ? round($mkShare[$lc] * 100, 1) : null,
                    'mmm_share' => isset($mmmShare[$lc]) ? round($mmmShare[$lc] * 100, 1) : null,
                    'holdout_lift_pct' => $hold[$lc]['lift'] ?? null,
                    'holdout_significant' => isset($hold[$lc]) ? $hold[$lc]['sig'] : null,
                    'calibration' => $cal,
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
                // [현 차수 초고도화 ③] 모델 vs 실험 캘리브레이션 — holdout 보유 채널의 방향 일치 비율.
                'calibration' => ['covered' => $calCovered, 'aligned' => $calAligned,
                    'score' => $calCovered > 0 ? round($calAligned / $calCovered * 100, 1) : null,
                    'note' => \Genie\I18n::t('attr.note.calibration', [], $lang)],
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
            $r = self::computeLift($cc, $cs, $tc, $ts, $rpc, \Genie\I18n::lang($request));
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
    public static function computeLift(float $cc, float $cs, float $tc, float $ts, float $rpc, string $lang = 'ko'): array
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
                ? \Genie\I18n::t('attr.verdict.liftSignificant', [], $lang)
                : ($liftAbs <= 0 ? \Genie\I18n::t('attr.verdict.liftNone', [], $lang) : \Genie\I18n::t('attr.verdict.liftNotYet', [], $lang)),
        ];
    }

    /**
     * [254차 감사] 지역 geo-홀드아웃 diff-in-diff 검정(카운트 기반·Poisson). computeLift(2-비율 z검정·rate∈[0,1])는
     *   성장비(현재전환/기준전환, >1 가능)를 비율로 오해석해 pPool*(1-pPool)<0 → 분산 0 퇴화 → 조기 유의 영구 미발화였다.
     *   여기서는 로그 성장비 차이(=ln(curT/baseT) − ln(curC/baseC))를 Poisson 분산(Var(ln N)≈1/N)으로 검정한다.
     *   ★중복 아님: computeLift 는 모수(size) 분모의 전환율 검정(HTTP 결과입력 엔드포인트 전용)으로 그대로 유지.
     */
    public static function computeGeoLift(float $curT, float $baseT, float $curC, float $baseC, float $rpc, string $lang = 'ko'): array
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
            'verdict'           => $significant ? \Genie\I18n::t('attr.verdict.geoSignificant', [], $lang)
                : ($liftAbs <= 0 ? \Genie\I18n::t('attr.verdict.geoNone', [], $lang) : \Genie\I18n::t('attr.verdict.geoNotYet', [], $lang)),
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
            // [279차 재감사 M6-P2] 취소제외 SSOT(OrderHub::observedExclusion) 사용 — 인라인 event_type NOT IN 은
            //   status 토큰만으로 신호된 취소(event_type='order'+status='cancelled')를 놓쳐 전환/매출 과대였음.
            [$exSql, $exTok] = \Genie\Handlers\OrderHub::observedExclusion();
            $st = $pdo->prepare("SELECT addr, total_price FROM channel_orders WHERE tenant_id=? AND NOT $exSql AND ordered_at >= ?");
            $st->execute(array_merge([$tenant], $exTok, [$since]));
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
            [$exSql, $exTok] = \Genie\Handlers\OrderHub::observedExclusion(); // [M6-P2] 취소제외 SSOT
            $st = $pdo->prepare("SELECT addr, total_price FROM channel_orders WHERE tenant_id=? AND NOT $exSql AND ordered_at >= ?");
            $st->execute(array_merge([$tenant], $exTok, [gmdate('Y-m-d', time() - $baseWin * 86400)]));
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
        // [255차 심화] 인과 geo-exclusion(register-then-execute) — geo-ID 맵 등록 시 control 지역을 매체 타겟에서 제외(노출0)
        //   → 진짜 인과 holdout. 맵 미등록=관측 폴백(현행·spend영향0). 제외는 노출 축소만(과집행 불가=안전).
        $excl = self::resolveGeoExclusion($pdo, $tenant, $channel, $ctrl);
        $causal = !empty($excl);
        $geoResults = null;
        if ($causal) {
            $applied = [];
            try { $applied = AdAdapters::excludeGeo($pdo, $tenant, $channel, $excl); } catch (\Throwable $e) { $applied = ['ok' => false, 'error' => $e->getMessage()]; }
            $geoResults = json_encode(['excluded_geo_ids' => $excl, 'media_apply' => $applied], JSON_UNESCAPED_UNICODE);
        }
        $meta = ['auto_design' => ['mode' => $causal ? 'causal' : 'observational', 'baseline_days' => $baseWin, 'baseline_treatment' => $tSum,
            'baseline_control' => $cSum, 'duration_days' => $days, 'guardrails' => ['min_days' => 7, 'min_conv' => 30, 'early_stop_lift_pct' => -5], 'auto' => true,
            'note' => $causal
                ? '인과 지오 홀드아웃 — control 지역을 매체 타겟에서 제외(노출0). 등록된 geo-ID 맵 기반.'
                : '관측 지오 리프트(광고 미변경·spend영향0). geo-ID 맵 등록 시 인과 holdout 자동 활성.']];
        try {
            $st = $pdo->prepare("INSERT INTO holdout_experiment(tenant_id,name,channel,hypothesis,status,control_size,treatment_size,revenue_per_conversion,start_date,end_date,geo_strategy,geo_regions,geo_results,result_json,created_at,updated_at)
                                 VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)");
            $st->execute([$tenant, '자동 지오 홀드아웃 ' . $start, substr($channel, 0, 60), '광고 노출 지역군(test) vs 대조 지역군(control)의 기준기간 대비 전환 성장 리프트',
                'running', $cSum, $tSum, 0, $start, $end, 'regional', $geoRegions, $geoResults, json_encode($meta, JSON_UNESCAPED_UNICODE), $now, $now]);
            return ['ok' => true, 'id' => (int)$pdo->lastInsertId(), 'mode' => $causal ? 'causal' : 'observational', 'test_regions' => $test, 'control_regions' => $ctrl, 'baseline' => ['treatment' => $tSum, 'control' => $cSum], 'duration_days' => $days];
        } catch (Throwable $e) { return ['ok' => false, 'error' => $e->getMessage()]; }
    }

    /** [255차 심화] geo-ID 맵(app_setting JSON) — {channel:{region_key:media_geo_id}}. 미등록=빈 배열. */
    private static function geoMap(PDO $pdo, string $tenant): array
    {
        try {
            $s = $pdo->prepare("SELECT svalue FROM app_setting WHERE skey=? LIMIT 1"); $s->execute(['geo_region_map@' . $tenant]);
            $v = $s->fetchColumn(); if ($v) { $j = json_decode((string)$v, true); return is_array($j) ? $j : []; }
        } catch (\Throwable $e) {}
        return [];
    }

    /** [255차 심화] control 지역 → 매체 geo-ID 배열(등록 맵 기반). 맵 미등록/미매칭=빈 배열(관측 폴백). */
    public static function resolveGeoExclusion(PDO $pdo, string $tenant, string $channel, array $controlRegions): array
    {
        $ch = strtolower(trim($channel)); if ($ch === '') return [];
        $map = self::geoMap($pdo, $tenant);
        $chMap = $map[$ch] ?? ($map[$channel] ?? []);
        if (!is_array($chMap) || !$chMap) return [];
        $out = [];
        foreach ($controlRegions as $r) { $gid = $chMap[(string)$r] ?? null; if ($gid !== null && $gid !== '') $out[] = (string)$gid; }
        return array_values(array_unique($out));
    }

    /** [255차 심화] GET /v424/attribution/geo-map — 등록된 geo-ID 맵 조회. */
    public static function geoMapGet(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        $pdo = Db::pdo(); $t = (string)($req->getAttribute('auth_tenant') ?? UserAuth::authedTenant($req) ?? '');
        $body = ['ok' => true, 'map' => self::geoMap($pdo, $t)];
        $res->getBody()->write(json_encode($body, JSON_UNESCAPED_UNICODE)); return $res->withHeader('Content-Type', 'application/json');
    }

    /** [255차 심화] PUT /v424/attribution/geo-map — geo-ID 맵 저장. body: {map:{channel:{region:geo_id}}}. */
    public static function geoMapSave(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        $pdo = Db::pdo(); $t = (string)($req->getAttribute('auth_tenant') ?? UserAuth::authedTenant($req) ?? '');
        $b = (array)($req->getParsedBody() ?? []); if (empty($b)) { $d = json_decode((string)$req->getBody(), true); if (is_array($d)) $b = $d; }
        $map = is_array($b['map'] ?? null) ? $b['map'] : [];
        try {
            Db::ensureAppSetting($pdo);
            $json = json_encode($map, JSON_UNESCAPED_UNICODE); $now = gmdate('c'); $k = 'geo_region_map@' . $t;
            if ($pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'mysql') {
                $pdo->prepare("INSERT INTO app_setting(skey,svalue,updated_at) VALUES(?,?,?) ON DUPLICATE KEY UPDATE svalue=VALUES(svalue),updated_at=VALUES(updated_at)")->execute([$k, $json, $now]);
            } else {
                $u = $pdo->prepare("UPDATE app_setting SET svalue=?,updated_at=? WHERE skey=?"); $u->execute([$json, $now, $k]);
                if ($u->rowCount() === 0) $pdo->prepare("INSERT INTO app_setting(skey,svalue,updated_at) VALUES(?,?,?)")->execute([$k, $json, $now]);
            }
        } catch (\Throwable $e) { $res->getBody()->write(json_encode(['ok' => false, 'error' => $e->getMessage()])); return $res->withHeader('Content-Type', 'application/json'); }
        $res->getBody()->write(json_encode(['ok' => true])); return $res->withHeader('Content-Type', 'application/json');
    }

    /** running geo 실험 일일 검증 — 실측 전환 집계→리프트 검정→가드레일→자동 결론(기간종료/유의/조기중단). 반환: 갱신수. */
    public static function validateRunningHoldouts(PDO $pdo, string $tenant, string $lang = 'ko'): int
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
                $lift = self::computeGeoLift($curT, $baseT, $curC, $baseC, $rpc, $lang);
                $daysRun = $start !== '' ? max(0, (int)floor((time() - strtotime($start)) / 86400)) : 0;
                $minDays = (int)($meta['guardrails']['min_days'] ?? 7);
                $minConv = (int)($meta['guardrails']['min_conv'] ?? 30);
                $earlyStop = (float)($meta['guardrails']['early_stop_lift_pct'] ?? -5);
                $enough = ($curT + $curC) >= $minConv && $daysRun >= 3;
                $geoResults = ['as_of' => gmdate('c'), 'days_run' => $daysRun, 'mode' => 'observational',
                    'treatment' => ['conv' => $curT, 'baseline' => $baseT], 'control' => ['conv' => $curC, 'baseline' => $baseC], 'lift' => $lift];
                $conclude = false; $verdict = '';
                if ($end !== '' && gmdate('Y-m-d') >= $end) { $conclude = true; $verdict = \Genie\I18n::t('attr.verdict.concludePeriodEnd', [], $lang); }
                elseif ($enough && $daysRun >= $minDays && !empty($lift['significant'])) { $conclude = true; $verdict = \Genie\I18n::t('attr.verdict.concludeEarlySig', [], $lang); }
                elseif ($enough && $daysRun >= $minDays && (float)($lift['lift_abs_pct'] ?? 0) < $earlyStop) { $conclude = true; $verdict = \Genie\I18n::t('attr.verdict.concludeGuardrailStop', [], $lang); }
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
            $lang = \Genie\I18n::lang($request);
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
                $resultJson = json_encode(self::computeLift($cc, $cs, $tc, $ts, $rpc, $lang), JSON_UNESCAPED_UNICODE);
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
                    $gr[] = ['region' => substr((string)($g['region'] ?? ''), 0, 60)] + self::computeLift($gcc, $gcs, $gtc, $gts, $rpc, $lang);
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
        $lang = \Genie\I18n::lang($request);
        $t = self::tenant($request);
        $empty = ['ok' => true, 'regions' => [], 'feasible' => false, 'reason' => \Genie\I18n::t('attr.reason.geoEmpty', [], $lang)];
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
                return self::ok($response, $empty + ['regions' => $regions, 'reason' => \Genie\I18n::t('attr.reason.geoNeedRegions', [], $lang), 'response_time_ms' => self::elapsed($start)]);
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
                'note' => \Genie\I18n::t('attr.note.geoReadiness', [], $lang),
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
    /**
     * [254차 초고도화 ⑤] 서버측 Shapley value 어트리뷰션(협조게임 한계기여 평균) — 권위·감사가능·테넌트격리.
     *   기존 프론트 mlAttribution.js(n≤10, 비권위)를 서버 권위엔진으로 승격. v(S)=연합 S 채널만으로 달성된 전환수
     *   (zeta transform), φ_i=Σ_{S⊄i} w(|S|)(v(S∪i)−v(S)). 채널 n>12면 빈도상위 12 + 'other' 흡수(정확도/성능 균형).
     *   ★중복0: 기존 6모델(markov 권위)과 별개 model. computeModels 비변경(회귀0).
     */
    public static function shapleyAttribution(array $convJourneys): array
    {
        $freq = []; $sets = [];
        foreach ($convJourneys as $j) {
            $chs = array_values(array_unique(array_map('strval', $j['channels'] ?? [])));
            if (!$chs) continue;
            foreach ($chs as $c) $freq[$c] = ($freq[$c] ?? 0) + 1;
            $sets[] = ['chs' => $chs, 'rev' => (float)($j['revenue'] ?? 0)];
        }
        if (!$sets) return ['ok' => true, 'method' => 'shapley-exact', 'channels' => [], 'journeys' => 0, 'total_conversions' => 0, 'total_revenue' => 0];
        arsort($freq);
        // [현 차수 P3] ★tail 채널을 'other' 단일 연합 플레이어로 승격 — 기존엔 top-12 밖 채널을 비트에서 통째로
        //   무시(혼합 여정 [A(in),Z(out)]→A 단독 크레딧)해 in-universe 과대·tail 과소였다. universe 상한을 11 로
        //   낮추고 12번째 슬롯을 'other'(권외 채널 any → 세팅)로 배정 → Shapley 가 tail 기여를 공정 분배(혼합 여정 포함).
        $topReal = array_slice(array_keys($freq), 0, 11);
        $realSet = array_flip($topReal);
        $hasOther = count($freq) > count($topReal);
        $universe = $topReal;
        $otherBitIndex = null;
        if ($hasOther) { $otherBitIndex = count($universe); $universe[] = '__OTHER__'; }
        $idx = array_flip($topReal); $n = count($universe);
        $size = 1 << $n;
        $cnt = array_fill(0, $size, 0.0); $cntRev = array_fill(0, $size, 0.0);
        $otherConv = 0.0; $otherRev = 0.0; // 잔여(권외만·other플레이어 미사용 시) — 회귀 안전 폴백
        foreach ($sets as $s) {
            $mask = 0; $touchesOther = false;
            foreach ($s['chs'] as $c) {
                if (isset($idx[$c])) $mask |= (1 << $idx[$c]);
                elseif (!isset($realSet[$c])) $touchesOther = true; // top-11 밖 = other
            }
            if ($touchesOther && $otherBitIndex !== null) $mask |= (1 << $otherBitIndex);
            if ($mask === 0) { $otherConv += 1.0; $otherRev += $s['rev']; continue; } // 어떤 플레이어도 없음(이론상 없음)
            $cnt[$mask] += 1.0; $cntRev[$mask] += $s['rev'];
        }
        // zeta transform: v(S)=Σ_{m⊆S} cnt[m]
        $v = $cnt; $vr = $cntRev;
        for ($b = 0; $b < $n; $b++) for ($S = 0; $S < $size; $S++) if ($S & (1 << $b)) { $v[$S] += $v[$S ^ (1 << $b)]; $vr[$S] += $vr[$S ^ (1 << $b)]; }
        $fact = [1.0]; for ($k = 1; $k <= $n; $k++) $fact[$k] = $fact[$k - 1] * $k;
        $phi = array_fill(0, $n, 0.0); $phiR = array_fill(0, $n, 0.0); $full = $size - 1;
        for ($i = 0; $i < $n; $i++) {
            $bit = 1 << $i; $rest = $full ^ $bit;
            for ($S = $rest; ; $S = ($S - 1) & $rest) {
                $sz = self::popcount($S); $w = ($fact[$sz] * $fact[$n - $sz - 1]) / $fact[$n];
                $phi[$i] += $w * ($v[$S | $bit] - $v[$S]); $phiR[$i] += $w * ($vr[$S | $bit] - $vr[$S]);
                if ($S === 0) break;
            }
        }
        $totConv = array_sum($phi) + $otherConv; $totRev = array_sum($phiR) + $otherRev;
        $channels = [];
        for ($i = 0; $i < $n; $i++) {
            // '__OTHER__' 플레이어는 'other' 로 표기(tail 채널 집합의 Shapley 몫).
            $label = ($universe[$i] === '__OTHER__') ? 'other' : $universe[$i];
            $channels[] = ['channel' => $label, 'shapley_conversions' => round($phi[$i], 3), 'shapley_revenue' => round($phiR[$i], 0), 'credit_pct' => $totConv > 0 ? round($phi[$i] / $totConv * 100, 2) : 0];
        }
        // 폴백 잔여(어떤 플레이어에도 안 잡힌 journey — 이론상 0) 는 'other' 에 합산.
        if ($otherConv > 0) $channels[] = ['channel' => 'other', 'shapley_conversions' => round($otherConv, 3), 'shapley_revenue' => round($otherRev, 0), 'credit_pct' => $totConv > 0 ? round($otherConv / $totConv * 100, 2) : 0];
        usort($channels, fn($a, $b) => $b['shapley_conversions'] <=> $a['shapley_conversions']);
        return ['ok' => true, 'method' => 'shapley-exact', 'n_channels' => $n, 'journeys' => count($sets), 'total_conversions' => round($totConv, 3), 'total_revenue' => round($totRev, 0), 'channels' => $channels];
    }

    private static function popcount(int $x): int { $c = 0; while ($x) { $x &= $x - 1; $c++; } return $c; }

    /** GET /v424/attribution/shapley?window=90 — 서버 Shapley value 어트리뷰션. */
    public static function shapley(Request $request, Response $response, array $args): Response
    {
        $start = microtime(true);
        $t = self::tenant($request);
        if ($t === '') return self::ok($response, ['ok' => true, 'channels' => [], 'journeys' => 0, 'response_time_ms' => self::elapsed($start)]);
        try {
            $q = $request->getQueryParams(); $window = max(1, min(730, (int)($q['window'] ?? self::DEFAULT_WINDOW)));
            [$conv] = self::loadJourneys(Db::pdo(), $t, $window);
            $r = self::shapleyAttribution($conv);
            $r['window_days'] = $window; $r['response_time_ms'] = self::elapsed($start);
            return self::ok($response, $r);
        } catch (Throwable $e) { return self::fail($response, $e, ['ok' => false, 'channels' => []]); }
    }

    /**
     * [283차 P2] 크레딧 키 산출 — granularity 별 group-by 키.
     *   channel  : <채널>                              (기존 동작 — normChannel 결과 그대로, 회귀 0)
     *   campaign : <채널> / <utm_campaign>
     *   creative : <채널> / <utm_campaign> / <utm_content|utm_term>
     * 빈 캠페인/소재는 '(none)' 으로 명시(정직성 — 임의 병합·날조 금지). $allowed 가 주어지면(성능 상한)
     * 상위 키 집합 밖은 '<채널> / (other)' 로 접는다.
     */
    private static function creditKey(string $ch, array $row, string $gran, ?array $allowed = null): string
    {
        if ($ch === '' || $gran === 'channel') return $ch;
        $norm = static function ($v): string {
            $s = trim((string)($v ?? ''));
            if ($s === '') return '';
            $s = preg_replace('/\s+/u', ' ', $s);
            return mb_strtolower(mb_substr((string)$s, 0, 80));
        };
        $camp = $norm($row['utm_campaign'] ?? '');
        if ($camp === '') $camp = '(none)';
        if ($gran === 'campaign') {
            $key = $ch . ' / ' . $camp;
        } else {
            $cr = $norm($row['utm_content'] ?? '');
            if ($cr === '') $cr = $norm($row['utm_term'] ?? '');
            if ($cr === '') $cr = '(none)';
            $key = $ch . ' / ' . $camp . ' / ' . $cr;
        }
        if ($allowed !== null && !isset($allowed[$key])) return $ch . ' / (other)';
        return $key;
    }

    /**
     * [283차 P2 성능] 비채널 차원의 상위 키 집합(터치 빈도 상위 MAX_GRAN_KEYS). markov 상태공간 폭증 차단.
     * channel 차원은 null(무제한 = 기존 동작 그대로).
     */
    private static function topKeys(PDO $pdo, string $tenant, string $sinceDate, string $gran): ?array
    {
        if ($gran === 'channel') return null;
        try {
            $st = $pdo->prepare(
                'SELECT channel, utm_campaign, utm_content, utm_term, COUNT(*) AS c FROM attribution_touch '
                . 'WHERE tenant_id = :t AND channel IS NOT NULL AND channel <> \'\' AND DATE(touched_at) >= :since '
                . 'GROUP BY channel, utm_campaign, utm_content, utm_term'
            );
            $st->execute([':t' => $tenant, ':since' => $sinceDate]);
        } catch (Throwable $e) {
            return null; // 스키마 변형 — 상한 없이 진행(정확도 우선)
        }
        $freq = [];
        foreach ($st->fetchAll(PDO::FETCH_ASSOC) ?: [] as $row) {
            $ch = self::normChannel((string)$row['channel']);
            if ($ch === '') continue;
            $k = self::creditKey($ch, $row, $gran, null);
            $freq[$k] = ($freq[$k] ?? 0) + (int)$row['c'];
        }
        // 상한 이내면 null(=화이트리스트 미적용). ★중요: 화이트리스트를 걸면 윈도우 밖 터치(최근 주문에 달린
        //   오래된 터치 — 이 조회는 touched_at 필터가 있으나 전환 여정 조회는 order_id 기준이라 윈도우 밖 터치도
        //   포함될 수 있다)가 (other) 로 접혀 정확도가 떨어진다. 접는 것은 상태공간 폭증 시에만.
        if (count($freq) <= self::MAX_GRAN_KEYS) return null;
        arsort($freq);                                   // 빈도 내림차순(동률은 삽입순 — 결정적)
        return array_slice($freq, 0, self::MAX_GRAN_KEYS, true);
    }

    /**
     * [283차 P1] 세션 → 아이덴티티 맵(크로스디바이스 여정 병합용).
     *   attribution_identity_link 에 링크가 0건이면 빈 배열 → 모든 여정이 세션 단위로 남는다(= 기존 동작, 회귀 0).
     *   확률적 링크(confidence < 0.999)는 테넌트 opt-in(app_setting attribution_prob_stitch@<t>) 시에만 포함
     *   — Attribution::sessionsForIdentity 와 동일 임계·동일 규약(기본 off).
     *   한 세션이 복수 아이덴티티에 링크될 수 있으므로(확률 스티칭) confidence 최고 1건만 채택하고,
     *   동률은 identity_hash 사전순으로 tie-break 해 run 간 결정성을 보장한다.
     */
    private static function identityMap(PDO $pdo, string $tenant): array
    {
        $map = [];
        try {
            $incProb = false;
            try {
                $g = $pdo->prepare('SELECT svalue FROM app_setting WHERE skey=? LIMIT 1');
                $g->execute(['attribution_prob_stitch@' . $tenant]);
                $incProb = ((string)($g->fetchColumn() ?: '0')) === '1';
            } catch (Throwable $e) { /* 설정 테이블 없음 → 결정론만 */ }
            $minConf = $incProb ? 0.4 : 0.999;
            $st = $pdo->prepare(
                'SELECT session_id, identity_hash, COALESCE(confidence,1.0) AS conf FROM attribution_identity_link '
                . 'WHERE tenant_id = ? AND COALESCE(confidence,1.0) >= ? '
                . 'ORDER BY session_id, conf DESC, identity_hash ASC LIMIT 200000'
            );
            $st->execute([$tenant, $minConf]);
            foreach ($st->fetchAll(PDO::FETCH_ASSOC) ?: [] as $r) {
                $sid = (string)$r['session_id'];
                $idh = (string)$r['identity_hash'];
                if ($sid === '' || $idh === '' || isset($map[$sid])) continue; // 첫 행 = 최고 confidence
                $map[$sid] = $idh;
            }
        } catch (Throwable $e) { /* 테이블 미존재 등 — 세션 단위 폴백(기존 동작) */ }
        return $map;
    }

    /** [283차 P1] 여정 그룹 키 — 아이덴티티가 있으면 아이덴티티(크로스디바이스 병합), 없으면 세션 단위(기존).
     *  own:<hash> 의사세션(오운드채널 발송 터치)은 접두를 벗기면 그 자체가 아이덴티티다. */
    private static function journeyGroup(string $sessionId, array $idMap): string
    {
        if (isset($idMap[$sessionId])) return 'id:' . $idMap[$sessionId];
        if (strncmp($sessionId, 'own:', 4) === 0) return 'id:' . substr($sessionId, 4);
        return 'sess:' . $sessionId;
    }

    private static function loadJourneys(PDO $pdo, string $tenant, int $window, string $gran = 'channel'): array
    {
        $sinceDate = gmdate('Y-m-d', time() - $window * 86400);
        $allowed = self::topKeys($pdo, $tenant, $sinceDate, $gran); // [283차 P2] 상태공간 상한(channel=null)

        // 1) 전환된 order_id 집합 + 전환 시각(created_at) — attribution_result.
        $rs = $pdo->prepare(
            'SELECT ar.order_id, MAX(ar.created_at) AS conv_at FROM attribution_result ar '
            . 'WHERE ar.tenant_id = :t AND ar.order_id IS NOT NULL AND ar.order_id <> \'\' '
            . 'AND DATE(ar.created_at) >= :since '
            // [현 차수 감사 ATT-1] 취소/반품 주문 제외 — attribution_result 는 취소 시 삭제/영점화되지 않아
            //   귀속매출·전환수에 과다 계상되고, 형제(AttributionMetrics:82·geo-holdout:488/506)와 불일치였다.
            //   channel_orders 에 취소/반품 행이 있으면 제외(픽셀 단독 전환=행 미존재→NOT EXISTS 참→포함 유지).
            . 'AND NOT EXISTS (SELECT 1 FROM channel_orders co WHERE co.tenant_id = ar.tenant_id '
            . "AND co.channel_order_id = ar.order_id AND COALESCE(co.event_type,'order') IN ('cancel','return')) "
            // [현 차수 감사 ATT-2] 결정적 정렬 — MAX_ORDERS 초과 절단 시 남는 집합이 비결정(run마다 총계 변동)이던 문제 해소.
            . 'GROUP BY ar.order_id ORDER BY conv_at DESC LIMIT ' . self::MAX_ORDERS
        );
        $rs->execute([':t' => $tenant, ':since' => $sinceDate]);
        $convAt = [];
        foreach ($rs->fetchAll(PDO::FETCH_ASSOC) ?: [] as $r) {
            $convAt[(string)$r['order_id']] = self::ts((string)$r['conv_at']);
        }
        if (empty($convAt)) return [[], self::loadNullJourneys($pdo, $tenant, $sinceDate, [], $gran, $allowed)];

        // 2) 전환 order 들의 모든 터치(시간순).
        //   ★크로스디바이스는 여기서 자동 반영된다: 여정 조립이 session_id 가 아니라 order_id 기준이므로,
        //     PixelTracking::bridgeToAttribution 의 아이덴티티 백필(283차)이 모바일 세션 터치에 같은 order_id 를
        //     찍어주면 그 터치들이 이 쿼리에 함께 잡혀 하나의 여정으로 병합된다(touched_at 순 인터리브).
        $orderIds = array_keys($convAt);
        $convJourneys = [];
        foreach (array_chunk($orderIds, 500) as $chunk) {
            $ph = implode(',', array_fill(0, count($chunk), '?'));
            $st = $pdo->prepare(
                // [283차 P2] utm_campaign/content/term 소비 — 이미 적재돼 있으나 엔진이 읽지 않던 컬럼.
                'SELECT order_id, channel, touched_at, extra_json, utm_campaign, utm_content, utm_term FROM attribution_touch '
                . 'WHERE tenant_id = ? AND order_id IN (' . $ph . ') AND channel IS NOT NULL AND channel <> \'\' '
                . 'ORDER BY order_id, touched_at, id'
            );
            $st->execute(array_merge([$tenant], $chunk));
            $byOrder = [];
            foreach ($st->fetchAll(PDO::FETCH_ASSOC) ?: [] as $row) {
                $oid = (string)$row['order_id'];
                $byOrder[$oid][] = $row;
            }
            // [현 차수 P1] 여정 매출을 channel_orders(취소/반품 제외)에서 산출 — recordTouch 가 extra_json 에
            //   revenue 를 넣지 않아 매출가중/증분 ROAS 가 전 계층 0 이었다(형제 AttributionMetrics 와 동일 조인).
            $revMap = [];
            try {
                $rs = $pdo->prepare('SELECT channel_order_id, MAX(COALESCE(total_price,0)) rev FROM channel_orders '
                    . 'WHERE tenant_id = ? AND channel_order_id IN (' . $ph . ') '
                    . "AND COALESCE(event_type,'order') NOT IN ('cancel','return') GROUP BY channel_order_id");
                $rs->execute(array_merge([$tenant], $chunk));
                foreach ($rs->fetchAll(PDO::FETCH_ASSOC) ?: [] as $r) $revMap[(string)$r['channel_order_id']] = (float)$r['rev'];
            } catch (\Throwable $e) { /* 스키마 변형 폴백 — extra_json 사용 */ }
            foreach ($byOrder as $oid => $touches) {
                $channels = []; $times = []; $views = []; $revenue = 0.0;
                foreach ($touches as $tr) {
                    $ch = self::normChannel((string)$tr['channel']);
                    if ($ch === '') continue;
                    // [283차 P2] 크레딧 키 = granularity 차원. channel 차원에서는 $ch 그대로(기존과 완전 동일).
                    $ch = self::creditKey($ch, $tr, $gran, $allowed);
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
                // channel_orders 실매출 우선, 없으면 extra_json 폴백.
                if (isset($revMap[$oid]) && $revMap[$oid] > 0) $revenue = $revMap[$oid];
                $ct = $convAt[$oid] ?? end($times);
                if ($ct <= 0) $ct = end($times);
                $convJourneys[] = ['channels' => $channels, 'times' => $times, 'views' => $views, 'conv_time' => $ct, 'revenue' => $revenue];
            }
        }

        $nullJourneys = self::loadNullJourneys($pdo, $tenant, $sinceDate, array_flip($orderIds), $gran, $allowed);
        return [$convJourneys, $nullJourneys];
    }

    /** 비전환 여정 — 전환 order 에 속하지 않은 터치. Markov null 경로용.
     *  [283차 P1] 그룹 단위가 session_id → "아이덴티티(있으면) / 세션(없으면)" 으로 확장. 동일인의 모바일·데스크톱
     *  익명 세션이 하나의 비전환 여정으로 병합돼 markov 의 null 경로가 실제 사람 단위와 일치한다.
     *  ★회귀 0: attribution_identity_link 가 비면 idMap 이 빈 배열 → 그룹키 = 'sess:'.<session_id> → 기존과 동일. */
    private static function loadNullJourneys(PDO $pdo, string $tenant, string $sinceDate, array $convOrderSet, string $gran = 'channel', ?array $allowed = null): array
    {
        try {
            $st = $pdo->prepare(
                // [283차 P2] utm_* 소비(granularity). channel 차원에서는 읽기만 하고 키에 반영하지 않는다.
                'SELECT session_id, channel, order_id, touched_at, utm_campaign, utm_content, utm_term FROM attribution_touch '
                . 'WHERE tenant_id = :t AND session_id IS NOT NULL AND session_id <> \'\' '
                . 'AND channel IS NOT NULL AND channel <> \'\' AND DATE(touched_at) >= :since '
                . 'ORDER BY session_id, touched_at, id LIMIT 100000'
            );
            $st->execute([':t' => $tenant, ':since' => $sinceDate]);
        } catch (Throwable $e) {
            return [];
        }
        $rows = $st->fetchAll(PDO::FETCH_ASSOC) ?: [];
        $idMap = self::identityMap($pdo, $tenant); // [283차 P1] 링크 0건이면 빈 배열(= 세션 단위 = 기존 동작)

        // [현 차수 P3] ★전환 세션 '전체' 제외 — 기존엔 전환 order_id 를 가진 '행'만 skip 하고 같은 세션의 나머지
        //   비전환 터치(order_id 공백/미백필)는 null journey 로 남겨, 실제 전환한 세션이 전환+비전환 양쪽에
        //   이중 계수됐다 → Markov removal effect(전환/비전환 대비) 왜곡. 세션에 전환 터치가 하나라도 있으면 통째 제외.
        // [283차 P1] 동일 논리를 아이덴티티 그룹으로 승격 — 크로스디바이스 백필로 그룹 내 어느 세션이든 전환에
        //   귀속됐다면 그 그룹의 채널 시퀀스는 이미 전환 여정에 반영돼 있다. 그룹째 제외해야 이중 계수가 없다.
        $convertedGroups = [];
        foreach ($rows as $row) {
            $oid = (string)($row['order_id'] ?? '');
            if ($oid !== '' && isset($convOrderSet[$oid])) {
                $convertedGroups[self::journeyGroup((string)$row['session_id'], $idMap)] = true;
            }
        }

        // 그룹별 터치 수집(크로스디바이스 병합 시 세션이 섞이므로 touched_at 으로 재정렬해야 시퀀스가 옳다).
        $byGroup = [];
        foreach ($rows as $i => $row) {
            $g = self::journeyGroup((string)$row['session_id'], $idMap);
            if (isset($convertedGroups[$g])) continue; // 전환 그룹 전체 제외(비전환 여정 아님)
            $ch = self::normChannel((string)$row['channel']);
            if ($ch === '') continue;
            $ch = self::creditKey($ch, $row, $gran, $allowed); // [283차 P2]
            if ($ch === '') continue;
            $byGroup[$g][] = ['ch' => $ch, 't' => self::ts((string)($row['touched_at'] ?? '')), 'i' => $i];
        }

        $out = [];
        foreach ($byGroup as $touches) {
            // 시간순 정렬(동시각은 원 쿼리 순서 = touched_at,id 로 tie-break → 결정적).
            // ★단일세션 그룹은 원 쿼리가 이미 touched_at,id 순이라 이 정렬이 항등(회귀 0).
            usort($touches, static fn($a, $b) => ($a['t'] <=> $b['t']) ?: ($a['i'] <=> $b['i']));
            $channels = [];
            foreach ($touches as $tr) {
                if (!empty($channels) && end($channels) === $tr['ch']) continue; // 연속중복 축약(self-loop 회피)
                $channels[] = $tr['ch'];
            }
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
    public static function computeModels(array $convJourneys, array $nullJourneys, float $halflife = self::DEFAULT_HALFLIFE, float $vtWeight = 1.0, float $vtHalflife = 0.0, float $vtWindow = 0.0): array
    {
        // [240차 ⑧-A] 뷰스루 가중치 — 노출(view-through) 터치는 클릭 대비 낮은 기여(vtWeight, 기본 1.0=영향없음/회귀0).
        //   view_through 플래그가 있는 포지션만 vtWeight 배율 후 재정규화. iOS 프라이버시 시대 노출기여 반영.
        // [260차 심화] 뷰스루 자동감쇠 — vtHalflife>0 이면 노출 터치를 "전용 반감기(클릭보다 짧음)"로 시간감쇠.
        //   전환에서 먼 노출은 기여 급감(업계 표준 VT 윈도우). vtHalflife=0(기본)=기존 flat 유지(회귀0).
        // [264차 성숙화] ① VT 윈도우 하드 컷오프 — vtWindow>0(일)이면 전환-노출 간격이 윈도우 초과한 노출은 기여 0(결정론적
        //   뷰스루 윈도우, Triple Whale Deterministic Views 표준). 클릭윈도우(window)와 분리. vtWindow=0(기본)=컷오프 없음(회귀0).
        //   ② VTC/CTC 분리 집계 — 전환을 순수 뷰스루(view-through)·클릭기여(click-through)·뷰보조클릭으로 분류해 리포팅.
        $vtWeight = max(0.0, min(1.0, $vtWeight));
        $vtHalflife = max(0.0, min(90.0, $vtHalflife));
        $vtWindow = max(0.0, min(365.0, $vtWindow));
        // [264차] VTC/CTC 세그먼트 카운터
        $vtcConv = 0.0; $ctcConv = 0.0; $viewAssistedConv = 0.0;
        $vtcRev = 0.0; $viewAssistedRev = 0.0; $outWindowViewConv = 0.0;
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

            // [240차 ⑧-A · 260차 심화] 포지션별 뷰스루 배율. view_through=true → vtWeight(+선택적 전용 반감기 감쇠).
            $views = $j['views'] ?? [];
            $times = $j['times'] ?? [];
            $convT = (float)($j['conv_time'] ?? 0);
            $vm = []; $vmFlat = []; $sumVm = 0.0;
            $jHasClick = false; $jHasView = false; $jHasOutWindowView = false;
            for ($i = 0; $i < $n; $i++) {
                if (!empty($views[$i])) {
                    $tt = (float)($times[$i] ?? $convT);
                    $dDaysV = max(0.0, ($convT - $tt) / 86400.0);
                    if ($vtWindow > 0.0 && $dDaysV > $vtWindow) {
                        $vm[$i] = 0.0; $vmFlat[$i] = 0.0; // [264차] VT 윈도우 초과 노출 = 결정론적 제외(기여 0)
                        $jHasOutWindowView = true;
                    } elseif ($vtHalflife > 0.0) {
                        $vm[$i] = $vtWeight * pow(2.0, -$dDaysV / $vtHalflife); // 뷰스루 전용 반감기 시간감쇠(무시간 모델용)
                        $vmFlat[$i] = $vtWeight; // [현 차수 P2] time_decay 는 자체 시간감쇠가 있어 vt시간감쇠를 빼야 이중감쇠가 안 된다
                        if ($vm[$i] > 0) $jHasView = true;
                    } else {
                        $vm[$i] = $vtWeight; $vmFlat[$i] = $vtWeight; // 기존 flat(회귀0)
                        if ($vm[$i] > 0) $jHasView = true;
                    }
                } else {
                    $vm[$i] = 1.0; $vmFlat[$i] = 1.0;
                    $jHasClick = true;
                }
                $sumVm += $vm[$i];
            }
            if ($sumVm <= 0) { $vm = array_fill(0, $n, 1.0); $vmFlat = array_fill(0, $n, 1.0); $sumVm = (float)$n; }
            // [264차] VTC/CTC 분류 — 클릭기여(하나라도 클릭)·순수뷰스루(윈도우내 노출만)·뷰보조클릭·윈도우外노출전용.
            if ($jHasClick) {
                $ctcConv += 1.0;
                if ($jHasView) { $viewAssistedConv += 1.0; $viewAssistedRev += $rev; }
            } elseif ($jHasView) {
                $vtcConv += 1.0; $vtcRev += $rev;
            } elseif ($jHasOutWindowView) {
                $outWindowViewConv += 1.0; // 윈도우 밖 노출만 → 뷰스루 미귀속(결정론적 배제)
            }

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
                // [현 차수 P2] flat 뷰가중 사용 — 뷰스루 vm 의 vtHalflife 감쇠와 time_decay 자체 감쇠가 겹쳐
                //   뷰스루 터치가 이중으로 과소평가되던 것을 해소(윈도우外 제외·vtWeight 배율은 보존).
                $wi = pow(2.0, -$dDays / max(0.5, $halflife)) * $vmFlat[$i];
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
            // [264차 성숙화] 결정론적 뷰스루 세그먼트 — VTC(순수 뷰스루)·CTC(클릭기여)·뷰보조·윈도우外배제.
            'view_through' => [
                'window_days'              => round($vtWindow, 2),
                'view_through_conversions' => round($vtcConv, 2),      // 순수 뷰스루 전환(클릭없이 윈도우내 노출만)
                'view_through_revenue'     => round($vtcRev, 2),
                'click_through_conversions'=> round($ctcConv, 2),      // 클릭기여 전환
                'view_assisted_conversions'=> round($viewAssistedConv, 2), // 클릭이 닫았으나 노출이 보조
                'view_assisted_revenue'    => round($viewAssistedRev, 2),
                'out_of_window_view_conversions' => round($outWindowViewConv, 2), // 윈도우 밖 노출만→미귀속
                'vtc_rate' => $totalConv > 0 ? round($vtcConv / $totalConv * 100, 2) : 0.0,
            ],
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
    public static function precompute(PDO $pdo, string $t, int $window = self::DEFAULT_WINDOW, float $halflife = self::DEFAULT_HALFLIFE, float $vtWeight = 1.0, float $vtHalflife = 0.0, bool $vtAuto = false, float $vtWindow = 0.0, string $gran = 'channel'): array
    {
        // [283차 P2] granularity 방어 — cron 등 내부 호출은 기본 'channel'(기존 동작).
        if (!in_array($gran, self::GRANULARITIES, true)) $gran = 'channel';
        [$convJourneys, $nullJourneys] = self::loadJourneys($pdo, $t, $window, $gran);
        if (empty($convJourneys)) {
            $r = ['models' => new \stdClass(), 'channels' => [], 'data_driven' => 'markov',
                  'window_days' => $window, 'journeys' => count($nullJourneys), 'converted' => 0, 'granularity' => $gran,
                  'note' => '전환(attribution_result)에 연결된 터치 여정이 아직 없습니다. 전환 스코어링 후 자동 반영됩니다.'];
        } else {
            if ($vtAuto) $vtWeight = self::autoVtWeight($convJourneys); // [260차] 데이터 기반 뷰스루 가중 자동보정
            $r = self::computeModels($convJourneys, $nullJourneys, $halflife, $vtWeight, $vtHalflife, $vtWindow);
            $r['window_days'] = $window; $r['halflife_days'] = $halflife; $r['vt_weight'] = $vtWeight;
            $r['vt_halflife_days'] = $vtHalflife; $r['vt_auto'] = $vtAuto; // [260차 심화]
            $r['vt_window_days'] = $vtWindow; // [264차 성숙화]
            $r['journeys'] = count($convJourneys) + count($nullJourneys);
            $r['converted'] = count($convJourneys); $r['data_driven'] = 'markov';
            $r['granularity'] = $gran; // [283차 P2]
        }
        // [240차 ⑧-A · 260차 · 264차] 비기본(vtWeight≠1·vtHalflife>0·auto·vtWindow>0) 결과는 캐시 저장 스킵(기본 캐시 오염 방지).
        // [283차 P2] 캐시 키에 granularity 포함 → 차원별 격리(채널 캐시가 소재 결과로 덮이는 오염 차단).
        if ($vtWeight >= 1.0 && $vtHalflife <= 0.0 && !$vtAuto && $vtWindow <= 0.0) self::cachePut($pdo, $t, $window, $halflife, $r, $gran);
        return $r;
    }

    /** [260차 심화] 뷰스루 가중 자동보정 — 관측 데이터 기반. view-only(클릭 0) 전환 여정이 많을수록 노출 기여를
     *  높게(클릭 근접), 적을수록 낮게(스팸 노출 과대 방지). 클릭과 완전 동등(1.0)은 되지 않도록 상한 0.7·하한 0.15. */
    public static function autoVtWeight(array $convJourneys): float
    {
        $n = count($convJourneys); if ($n === 0) return 0.3;
        $viewOnly = 0;
        foreach ($convJourneys as $j) {
            $views = $j['views'] ?? []; $chs = $j['channels'] ?? [];
            if (count($chs) === 0) continue;
            $allView = true;
            for ($i = 0; $i < count($chs); $i++) { if (empty($views[$i])) { $allView = false; break; } }
            if ($allView) $viewOnly++;
        }
        $share = $viewOnly / $n; // view-only 전환 비중(노출만으로 전환한 직접 증거)
        return max(0.15, min(0.7, 0.2 + 0.6 * $share));
    }

    /** [283차 P2] 캐시 키 — granularity 포함(차원별 격리). 단, 'channel' 은 접미를 붙이지 않아 기존 키와 동일하게
     *  유지한다 → 배포 즉시 기존 캐시·attribution_cron 선계산 결과가 그대로 히트(캐시 스탬피드 0·회귀 0). */
    private static function ckey(string $t, int $w, float $hl, string $gran = 'channel'): string
    {
        $base = $t . ':' . $w . ':' . number_format($hl, 1, '.', '');
        return ($gran === 'channel' || $gran === '') ? $base : ($base . ':' . $gran);
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
    private static function cacheGet(PDO $pdo, string $t, int $w, float $hl, int $ttl, string $gran = 'channel'): ?array
    {
        try {
            self::ensureCacheTable($pdo);
            $st = $pdo->prepare("SELECT result_json, computed_at FROM attribution_model_cache WHERE ckey=? LIMIT 1");
            $st->execute([self::ckey($t, $w, $hl, $gran)]);
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

    private static function cachePut(PDO $pdo, string $t, int $w, float $hl, array $r, string $gran = 'channel'): void
    {
        try {
            self::ensureCacheTable($pdo);
            $json = json_encode($r, JSON_UNESCAPED_UNICODE); $now = gmdate('c'); $ck = self::ckey($t, $w, $hl, $gran);
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
