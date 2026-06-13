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

            $pdo = Db::pdo();
            [$convJourneys, $nullJourneys] = self::loadJourneys($pdo, $t, $window);

            if (empty($convJourneys)) {
                return self::ok($response, $empty + [
                    'window_days' => $window,
                    'journeys' => count($nullJourneys),
                    'note' => '전환(attribution_result)에 연결된 터치 여정이 아직 없습니다. 전환 스코어링 후 자동 반영됩니다.',
                    'response_time_ms' => self::elapsed($start),
                ]);
            }

            $result = self::computeModels($convJourneys, $nullJourneys, $halflife);
            $result['window_days'] = $window;
            $result['halflife_days'] = $halflife;
            $result['journeys'] = count($convJourneys) + count($nullJourneys);
            $result['converted'] = count($convJourneys);
            $result['data_driven'] = 'markov';
            $result['response_time_ms'] = self::elapsed($start);
            return self::ok($response, $result);
        } catch (Throwable $e) {
            return self::fail($response, $e, $empty);
        }
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
                $channels = []; $times = []; $revenue = 0.0;
                foreach ($touches as $tr) {
                    $ch = self::normChannel((string)$tr['channel']);
                    if ($ch === '') continue;
                    // 연속 중복 채널은 self-loop 회피를 위해 축약(시퀀스 의미 보존).
                    if (!empty($channels) && end($channels) === $ch) {
                        $times[count($times) - 1] = self::ts((string)$tr['touched_at']); // 최신 터치 시각 갱신
                        continue;
                    }
                    $channels[] = $ch;
                    $times[] = self::ts((string)$tr['touched_at']);
                    if ($revenue <= 0) $revenue = self::extractRevenue((string)($tr['extra_json'] ?? ''));
                }
                if (empty($channels)) continue;
                $ct = $convAt[$oid] ?? end($times);
                if ($ct <= 0) $ct = end($times);
                $convJourneys[] = ['channels' => $channels, 'times' => $times, 'conv_time' => $ct, 'revenue' => $revenue];
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
    public static function computeModels(array $convJourneys, array $nullJourneys, float $halflife = self::DEFAULT_HALFLIFE): array
    {
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

            // last / first
            self::addCredit($modelsConv['last_touch'], $modelsRev['last_touch'], $chs[$n - 1], 1.0, $rev);
            self::addCredit($modelsConv['first_touch'], $modelsRev['first_touch'], $chs[0], 1.0, $rev);

            // linear (이벤트 균등)
            foreach ($chs as $c) self::addCredit($modelsConv['linear'], $modelsRev['linear'], $c, 1.0 / $n, $rev / max(1, $n));

            // time_decay (전환 시점 기준 지수감쇠, 반감기 halflife 일)
            $convT = (float)($j['conv_time'] ?? 0);
            $times = $j['times'] ?? [];
            $w = []; $sumW = 0.0;
            for ($i = 0; $i < $n; $i++) {
                $tt = (float)($times[$i] ?? $convT);
                $dDays = max(0.0, ($convT - $tt) / 86400.0);
                $wi = pow(2.0, -$dDays / max(0.5, $halflife));
                $w[$i] = $wi; $sumW += $wi;
            }
            if ($sumW <= 0) { $sumW = $n; $w = array_fill(0, $n, 1.0); }
            for ($i = 0; $i < $n; $i++) {
                self::addCredit($modelsConv['time_decay'], $modelsRev['time_decay'], $chs[$i], $w[$i] / $sumW, $rev * $w[$i] / $sumW);
            }

            // position_based (U-shaped 40/20/40)
            $pw = self::positionWeights($n);
            for ($i = 0; $i < $n; $i++) {
                self::addCredit($modelsConv['position_based'], $modelsRev['position_based'], $chs[$i], $pw[$i], $rev * $pw[$i]);
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

    private static function ok(Response $response, array $payload): Response
    {
        return TemplateResponder::respond($response->withStatus(200), $payload);
    }

    private static function fail(Response $response, Throwable $e, array $emptyShape): Response
    {
        return TemplateResponder::respond($response->withStatus(500), array_merge(['error' => $e->getMessage()], $emptyShape));
    }
}
