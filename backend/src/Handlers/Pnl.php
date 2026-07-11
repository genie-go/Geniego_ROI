<?php
declare(strict_types=1);

namespace Genie\Handlers;

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;
use Genie\Db;

/**
 * P&L / Finance SSOT (현 차수 — P&L·재무 약점 근절).
 *
 * 배경(감사): 최종 손익 산식이 클라이언트(GlobalDataContext.pnlStats)에만 존재했다.
 *   서버엔 OrderHub.ordersStats(매출+WAC COGS)·settlementsStats(정산 머니경로)·Influencer.costSummary
 *   (인플루언서 비용) 가 흩어져 있고, 이들을 조립해 grossProfit/operatingProfit/netProfit 를 산출하는
 *   서버 단일소스가 없었다(구 Trends::pnl 스텁은 삭제됨).
 *
 * 본 핸들러는 그 조립을 서버로 승격한다(SSOT). 프론트는 server-first / client-fallback 로 동작하며,
 *   컴포넌트 소스가 프론트가 이미 쓰던 것과 동일(orderhub_settlements·channel_orders WAC·performance_metrics·
 *   influencer_store)하므로 값 회귀(regression) 없음 — 산식도 클라와 100% 동일.
 *
 * 산식(클라 GlobalDataContext.jsx pnlStats 와 동일):
 *   grossProfit     = revenue - cogs
 *   operatingProfit = grossProfit - adSpend - platformFee - couponDiscount - returnFee - shippingCost - influencerCost
 *   netProfit       = netPayout>0 ? netPayout - cogs - adSpend - couponDiscount - influencerCost : operatingProfit
 *
 * 부가세(VAT) 엔진: 기존 pass-through 캡처(kr_settlement_line.vat, 마진 제외 유지)를 확장 —
 *   매출세액(output) vs 매입세액(input) 상계·과세기간 버킷팅·Paddle MoR 납부뷰. 마진엔 미반영(이중계상 방지).
 *
 * 다통화: 내부 base 는 KRW(Connectors.fxToKrw 정규화). app_setting 의 테넌트 보고통화로 환산 뷰 제공.
 *
 * Endpoints (routes.php 등록 필요):
 *   GET  /v424/pnl                     => Pnl::summary              — 손익 조립(보고통화 환산 + by_currency)
 *   POST /v424/pnl/reporting-currency  => Pnl::setReportingCurrency — 테넌트 보고통화 설정(H5 writer)
 *   GET  /v424/pnl/vat                 => Pnl::vat                  — 부가세 상계/과세기간/Paddle MoR 납부뷰(+ 요약 영속)
 */
final class Pnl
{
    private static function isDemoTenant(string $tenant): bool
    {
        return $tenant === 'demo' || str_starts_with($tenant, 'demo_');
    }

    private static function json(Response $resp, array $payload, int $status = 200): Response
    {
        $resp->getBody()->write(json_encode($payload, JSON_UNESCAPED_UNICODE));
        return $resp->withStatus($status)->withHeader('Content-Type', 'application/json; charset=utf-8');
    }

    /** 공통 진입 가드 — middleware 가 검증한 auth_tenant 만 신뢰(OrderHub.gate 와 동일 규약). */
    private static function gate(Request $req, Response $resp): array
    {
        $tenant = (string)($req->getAttribute('auth_tenant') ?? '');
        if ($tenant === '') {
            return ['error' => self::json($resp, ['ok' => false, 'error' => 'no_tenant'], 401)];
        }
        $isDemo = self::isDemoTenant($tenant);
        $env = Db::env();
        if ($env === 'production' && $isDemo) {
            return ['error' => self::json($resp, ['ok' => false, 'error' => 'demo_blocked_in_production'], 403)];
        }
        if ($env === 'demo' && !$isDemo) {
            return ['error' => self::json($resp, ['ok' => false, 'error' => 'production_blocked_in_demo'], 403)];
        }
        return ['tenant' => $tenant, 'isDemo' => $isDemo, 'pdo' => Db::pdoFor($isDemo)];
    }

    /** 요청 기간(YYYY-MM-DD prefix) — 미지정 시 [''..''] (=전기간, 프론트 기본 동작과 정합). */
    private static function periodParams(Request $req): array
    {
        $q = $req->getQueryParams();
        $from = isset($q['from']) ? substr(trim((string)$q['from']), 0, 10) : '';
        $to   = isset($q['to'])   ? substr(trim((string)$q['to']),   0, 10) : '';
        return [$from, $to];
    }

    /* ════════════════════════════════════════════════════════════════════
     *  P&L 컴포넌트 조립(SSOT) — summary·vat 공용.
     *  ★프론트 pnlStats 와 동일 소스/윈도를 재현(값 회귀 없음):
     *    - 매출/COGS/정산 머니경로/인플루언서 = 전기간(from/to 미지정 시). 프론트가 stats 를 기간 없이 fetch.
     *    - adSpend = from 지정 시 [from,to], 미지정 시 당월(프론트 rollup/platform?period=monthly&n=1 과 정합).
     * ════════════════════════════════════════════════════════════════════ */
    private static function components(\PDO $pdo, string $tenant, string $from, string $to): array
    {
        // ── 1) 주문 매출(활성) + WAC COGS : OrderHub 서버집계와 동일 소스 ──────────────────
        $base = ['tenant_id = ?']; $baseArgs = [$tenant];
        if ($from !== '') { $base[] = "SUBSTR(ordered_at,1,10) >= ?"; $baseArgs[] = $from; }
        if ($to   !== '') { $base[] = "SUBSTR(ordered_at,1,10) <= ?"; $baseArgs[] = $to; }
        $baseSql = implode(' AND ', $base);
        [$cancelExpr, $cancelTokens] = OrderHub::cancelExclusion();

        $orderRevenue = 0.0;
        try {
            $st = $pdo->prepare("SELECT COALESCE(SUM(total_price),0) FROM channel_orders WHERE $baseSql AND NOT $cancelExpr");
            $st->execute(array_merge($baseArgs, $cancelTokens));
            $orderRevenue = (float)$st->fetchColumn();
        } catch (\Throwable $e) { $orderRevenue = 0.0; }

        // COGS(WAC) — OrderHub::aggregateCogs SSOT 재사용(중복 divergence 방지).
        [$cogs, $cogsUncosted] = OrderHub::aggregateCogs($pdo, $tenant, $baseSql, $baseArgs, $cancelExpr, $cancelTokens);
        if ($cogs === null) $cogs = 0.0;
        $cogsUncosted = (int)($cogsUncosted ?? 0);

        // ── 2) 정산 머니경로(orderhub_settlements) : settlementsStats 와 동일 집계 ───────────
        $sw = ['tenant_id = ?']; $sa = [$tenant];
        if ($from !== '') { $sw[] = "period >= ?"; $sa[] = substr($from, 0, 7); }
        if ($to   !== '') { $sw[] = "period <= ?"; $sa[] = substr($to,   0, 7); }
        $swSql = implode(' AND ', $sw);
        $sett = ['gross' => 0.0, 'net' => 0.0, 'pfee' => 0.0, 'coupon' => 0.0, 'rfee' => 0.0];
        try {
            $st = $pdo->prepare(
                "SELECT COALESCE(SUM(gross_sales),0) AS gross, COALESCE(SUM(net_payout),0) AS net,
                        COALESCE(SUM(platform_fee),0) AS pfee, COALESCE(SUM(coupon_discount),0) AS coupon,
                        COALESCE(SUM(return_fee),0) AS rfee
                 FROM orderhub_settlements WHERE $swSql"
            );
            $st->execute($sa);
            $r = $st->fetch(\PDO::FETCH_ASSOC) ?: [];
            $sett = ['gross' => (float)($r['gross'] ?? 0), 'net' => (float)($r['net'] ?? 0),
                     'pfee' => (float)($r['pfee'] ?? 0), 'coupon' => (float)($r['coupon'] ?? 0),
                     'rfee' => (float)($r['rfee'] ?? 0)];
        } catch (\Throwable $e) { /* 빈 정산 → 0 (프론트 클라 폴백과 동일 결과) */ }

        // 배송비 — settlementsStats 와 동일 로직(채널별 정률·무료배송 기준금액, 활성 주문만).
        $shipFee = 0.0;
        try {
            $shipW = ['co.tenant_id = ?']; $shipA = [$tenant];
            if ($from !== '') { $shipW[] = "SUBSTR(co.ordered_at,1,10) >= ?"; $shipA[] = $from; }
            if ($to   !== '') { $shipW[] = "SUBSTR(co.ordered_at,1,10) <= ?"; $shipA[] = $to; }
            $shipW[] = "COALESCE(co.status,'') NOT IN ('cancelled','canceled','취소','반품','refunded','returned','cancel','return')";
            $shipSql = implode(' AND ', $shipW);
            $shipSt = $pdo->prepare(
                "SELECT COALESCE(SUM(CASE WHEN fr.ship > 0 AND (fr.thr <= 0 OR co.total_price < fr.thr) THEN fr.ship ELSE 0 END),0) AS shipfee
                 FROM channel_orders co
                 JOIN (SELECT channel_key, shipping_standard AS ship, free_ship_threshold AS thr FROM kr_fee_rule
                       WHERE tenant_id = ? AND id IN (SELECT MAX(id) FROM kr_fee_rule WHERE tenant_id = ? GROUP BY channel_key)) fr
                   ON fr.channel_key = co.channel
                 WHERE $shipSql"
            );
            $shipSt->execute(array_merge([$tenant, $tenant], $shipA));
            $shipFee = (float)($shipSt->fetchColumn() ?: 0);
        } catch (\Throwable $e) { $shipFee = 0.0; }

        // ── 3) 광고비(performance_metrics.spend, KRW 정규화됨) ──
        //   [현 차수 P1] ★기간 정합 수정: 기존엔 from 미지정 시 광고비만 '전월+당월'로 고정 집계하고
        //   매출·원가·수수료는 전기간이라, 영업/순이익이 광고비 누락분만큼 과대계상됐다(예: 12개월 운영
        //   테넌트가 광고비 2개월치만 차감). → 광고비도 매출과 동일 윈도우로 집계: from/to 지정 시 그 구간,
        //   미지정 시 '전기간'. (KPI 카드 budgetStats(rollup monthly)는 별개 위젯으로 무영향.)
        $adSpend = 0.0;
        try {
            if ($from !== '' && $to !== '') {
                $st = $pdo->prepare("SELECT COALESCE(SUM(spend),0) FROM performance_metrics WHERE tenant_id=? AND SUBSTR(date,1,10) >= ? AND SUBSTR(date,1,10) <= ?");
                $st->execute([$tenant, $from, $to]);
            } elseif ($from !== '') {
                $st = $pdo->prepare("SELECT COALESCE(SUM(spend),0) FROM performance_metrics WHERE tenant_id=? AND SUBSTR(date,1,10) >= ?");
                $st->execute([$tenant, $from]);
            } else {
                $st = $pdo->prepare("SELECT COALESCE(SUM(spend),0) FROM performance_metrics WHERE tenant_id=?");
                $st->execute([$tenant]);
            }
            $adSpend = (float)$st->fetchColumn();
        } catch (\Throwable $e) { $adSpend = 0.0; }

        // ── 4) 인플루언서 비용 — Influencer::costSummary 와 동일 산식(실 지급액 settle.paid 합) ──
        $influencerCost = 0.0;
        try {
            $st = $pdo->prepare("SELECT payload_json FROM influencer_store WHERE tenant_id=? AND kind='creators'");
            $st->execute([$tenant]);
            $row = $st->fetchColumn();
            $creators = $row ? json_decode((string)$row, true) : [];
            if (is_array($creators)) {
                foreach ($creators as $c) {
                    if (!is_array($c)) continue;
                    $settle = (array)($c['settle'] ?? []);
                    $paid = (float)($settle['paid'] ?? 0);
                    // ★Influencer::costSummary 와 동일 무게이트 합산(음수 클로백 포함). 값 후퇴 0.
                    if ($paid == 0.0) continue;
                    if ($from !== '' || $to !== '') {
                        $dt = substr((string)($c['campaignMonth'] ?? $settle['resolvedAt'] ?? $c['date'] ?? ''), 0, 10);
                        if ($dt === '') continue; // 귀속일 미상 → 기간 스코프 시 제외
                        if ($from !== '' && $dt < $from) continue;
                        if ($to   !== '' && $dt > $to)   continue;
                    }
                    $influencerCost += $paid;
                }
            }
        } catch (\Throwable $e) { $influencerCost = 0.0; }
        $influencerCost = round($influencerCost);

        // ── 5) 조립(프론트 pnlStats 와 동일 산식) ─────────────────────────────────────────
        $settlementGross = $sett['gross'];
        $revenue     = $settlementGross > 0 ? $settlementGross : $orderRevenue; // 정산 우선(운영)
        $platformFee = $sett['pfee'];
        $couponDiscount = $sett['coupon'];
        $returnFee   = $sett['rfee'];
        $netPayout   = $sett['net'];
        $shippingCost = $shipFee;

        // ★[279차 감사 C-P1] 쿠폰 이중차감 근본수정. revenue(=gross_sales=SUM(total_price)) 는 채널 결제금액
        //   (payment/totalPayAmount)이라 쿠폰이 이미 차감된 값이다(post-coupon). 정산 SSOT 도 동일:
        //   OrderHub::rollupSettlementsCore 의 gross_sales=SUM(total_price)·net_payout=gross-platform-returnFee 로
        //   쿠폰을 net 에서 빼지 않는다(coupon_discount 는 정보용 컬럼). 그런데 여기서 couponDiscount 를 또 빼
        //   operating/net 이 쿠폰액만큼 과소였다(Rollup.php:310 주석과 정합하지 않던 유일 지점). 쿠폰은 이미
        //   revenue 에 반영됐으므로 별도 재차감하지 않는다(couponDiscount 는 응답에 정보용으로만 유지).
        $grossProfit     = $revenue - $cogs;
        $operatingProfit = $grossProfit - $adSpend - $platformFee - $returnFee - $shippingCost - $influencerCost;
        $netProfit       = $netPayout > 0
            ? $netPayout - $cogs - $adSpend - $influencerCost
            : $operatingProfit;

        return [
            'revenue' => $revenue, 'cogs' => $cogs, 'cogsUncostedUnits' => $cogsUncosted,
            'orderRevenue' => $orderRevenue, 'settlementGross' => $settlementGross,
            'adSpend' => $adSpend, 'platformFee' => $platformFee, 'couponDiscount' => $couponDiscount,
            'returnFee' => $returnFee, 'shippingCost' => $shippingCost, 'influencerCost' => $influencerCost,
            'netPayout' => $netPayout,
            'grossProfit' => $grossProfit, 'operatingProfit' => $operatingProfit, 'netProfit' => $netProfit,
            'adWindowFrom' => $adFrom,
        ];
    }

    /* ─── 보고통화(reporting currency) ──────────────────────────────────────────────
     *  내부 base=KRW 유지. app_setting('reporting_currency:{tenant}' → 'reporting_currency' → 'KRW').
     *  환율은 Connectors::fxToKrw(1,cur)=KRW/1unit. 보고금액 = KRW / rate. */
    private static function reportingCurrency(string $tenant): string
    {
        $cur = '';
        try {
            $pdo = Db::pdo();
            $st = $pdo->prepare("SELECT svalue FROM app_setting WHERE skey=? LIMIT 1");
            $st->execute(['reporting_currency:' . $tenant]);
            $cur = (string)($st->fetchColumn() ?: '');
            if ($cur === '') { $st->execute(['reporting_currency']); $cur = (string)($st->fetchColumn() ?: ''); }
        } catch (\Throwable $e) { $cur = ''; }
        $cur = strtoupper(trim($cur));
        return $cur !== '' ? $cur : 'KRW';
    }

    /** KRW/1단위 보고통화 환율(1.0=KRW 또는 미상통화). Connectors 공개 접근자 사용. */
    private static function krwPerUnit(string $cur): float
    {
        if ($cur === 'KRW') return 1.0;
        try { $rate = Connectors::fxRateKrwPerUnit($cur); return $rate > 0 ? $rate : 1.0; }
        catch (\Throwable $e) { return 1.0; }
    }

    /**
     * GET /v424/pnl — 서버측 손익 조립 SSOT + 보고통화 환산 + by_currency(광고비 원통화 분해).
     */
    public static function summary(Request $req, Response $resp): Response
    {
        $g = self::gate($req, $resp);
        if (isset($g['error'])) return $g['error'];
        [$tenant, $isDemo, $pdo] = [$g['tenant'], $g['isDemo'], $g['pdo']];
        [$from, $to] = self::periodParams($req);

        try {
            $c = self::components($pdo, $tenant, $from, $to);
        } catch (\Throwable $e) {
            return self::json($resp, ['ok' => false, 'error' => 'pnl_error', 'message' => $e->getMessage()], 500);
        }

        $revenue = $c['revenue'];
        $margin    = $revenue > 0 ? round($c['operatingProfit'] / $revenue * 100, 1) : 0.0;
        $netMargin = $revenue > 0 ? round($c['netProfit']       / $revenue * 100, 1) : 0.0;

        // 보고통화 환산(KRW base → reporting). base 값은 그대로 노출, report 블록에 환산치.
        $reportCur = self::reportingCurrency($tenant);
        $rate = self::krwPerUnit($reportCur);
        $conv = fn($v) => round(Connectors::krwToCurrency((float)$v, $reportCur), 2);
        $report = [
            'currency' => $reportCur,
            'fx_krw_per_unit' => $rate,
            'revenue' => $conv($revenue), 'cogs' => $conv($c['cogs']), 'grossProfit' => $conv($c['grossProfit']),
            'adSpend' => $conv($c['adSpend']), 'operatingProfit' => $conv($c['operatingProfit']),
            'netProfit' => $conv($c['netProfit']),
        ];

        // by_currency — 광고비(performance_metrics)의 원통화별 분해.
        //   ★계약(contract): 버킷당 { amount, krwEquivalent, adSpendKrw }.
        //     - performance_metrics.spend 는 ingest 시 Connectors::fxToKrw 로 KRW 정규화되어 저장 → sp=KRW 등가.
        //     - amount        = 원통화 광고비(= krwToCurrency(sp, cur), KRW 버킷은 sp 그대로)
        //     - krwEquivalent = KRW 환산치(= sp)
        //     - adSpendKrw    = krwEquivalent 별칭(레거시 리더 호환 유지 — 무회귀)
        //   프론트(PnLDashboard)는 amount(원통화)·krwEquivalent(KRW) 키를 정확히 읽는다(C2 계약 불일치 해소).
        $byCurrency = ['KRW' => ['amount' => 0.0, 'krwEquivalent' => 0.0, 'adSpendKrw' => 0.0]];
        try {
            $adFrom = $c['adWindowFrom'];
            if ($to !== '') {
                $st = $pdo->prepare("SELECT COALESCE(UPPER(currency),'KRW') cur, COALESCE(SUM(spend),0) sp FROM performance_metrics WHERE tenant_id=? AND SUBSTR(date,1,10) >= ? AND SUBSTR(date,1,10) <= ? GROUP BY COALESCE(UPPER(currency),'KRW')");
                $st->execute([$tenant, $adFrom, $to]);
            } else {
                $st = $pdo->prepare("SELECT COALESCE(UPPER(currency),'KRW') cur, COALESCE(SUM(spend),0) sp FROM performance_metrics WHERE tenant_id=? AND SUBSTR(date,1,10) >= ? GROUP BY COALESCE(UPPER(currency),'KRW')");
                $st->execute([$tenant, $adFrom]);
            }
            $byCurrency = [];
            foreach ($st->fetchAll(\PDO::FETCH_ASSOC) as $r) {
                $cur = (string)$r['cur'];
                $krw = (float)$r['sp'];                                   // KRW 등가(정규화 저장분)
                $orig = $cur === 'KRW' ? $krw : round(Connectors::krwToCurrency($krw, $cur), 2); // 원통화 환원
                $byCurrency[$cur] = [
                    'amount'        => $orig,
                    'krwEquivalent' => round($krw, 2),
                    'adSpendKrw'    => round($krw, 2),
                ];
            }
            if (!$byCurrency) $byCurrency = ['KRW' => ['amount' => 0.0, 'krwEquivalent' => 0.0, 'adSpendKrw' => 0.0]];
        } catch (\Throwable $e) { /* currency 컬럼 부재(구 SQLite) → KRW 단일 버킷 유지 */ }

        return self::json($resp, [
            'ok' => true,
            'revenue' => $revenue, 'cogs' => $c['cogs'], 'cogsUncostedUnits' => $c['cogsUncostedUnits'],
            'grossProfit' => $c['grossProfit'],
            'adSpend' => $c['adSpend'], 'platformFee' => $c['platformFee'], 'couponDiscount' => $c['couponDiscount'],
            'returnFee' => $c['returnFee'], 'shippingCost' => $c['shippingCost'], 'influencerCost' => $c['influencerCost'],
            'operatingProfit' => $c['operatingProfit'], 'netProfit' => $c['netProfit'], 'netPayout' => $c['netPayout'],
            'margin' => $margin, 'netMargin' => $netMargin,
            'reporting' => $report,
            'by_currency' => $byCurrency,
            'period_from' => $from !== '' ? $from : null,
            'period_to'   => $to   !== '' ? $to   : null,
            '_env' => Db::envLabel(), '_isDemo' => $isDemo,
        ]);
    }

    /**
     * POST /v424/pnl/reporting-currency — 테넌트 보고통화 설정(H5 writer).
     *   기존엔 reportingCurrency() 리더만 있고 writer 부재 → 보고통화가 상시 KRW 로 고정(inert)이었다.
     *   본 EP 가 app_setting('reporting_currency:{tenant}') 을 영속하면 summary 의 report 블록이 해당 통화로
     *   환산 표기된다. ★내부 집계는 KRW SSOT 불변 — 표기(reporting)만 전환(무회귀·이중계상 없음).
     *   gate 는 summary/vat 와 동일(미들웨어 auth_tenant 만 신뢰, self-auth 폴백 없음 — 세션 게이트 편입 라우트).
     *   body: { currency: "USD" }  (ISO-4217 3-letter). 리더(reportingCurrency)와 동일 Db::pdo() 소스에 기록.
     */
    public static function setReportingCurrency(Request $req, Response $resp): Response
    {
        $g = self::gate($req, $resp);
        if (isset($g['error'])) return $g['error'];
        $tenant = $g['tenant'];

        $body = $req->getParsedBody();
        if (!is_array($body)) $body = [];
        $cur = strtoupper(trim((string)($body['currency'] ?? $body['reporting_currency'] ?? '')));
        if (!preg_match('/^[A-Z]{3}$/', $cur)) {
            return self::json($resp, ['ok' => false, 'error' => 'invalid_currency', 'hint' => 'ISO-4217 3-letter code (e.g. KRW, USD, EUR)'], 400);
        }

        $skey = 'reporting_currency:' . $tenant;
        $now  = gmdate('c');
        try {
            $pdo  = Db::pdo(); // ★reportingCurrency 리더와 동일 소스. 키가 테넌트 네임스페이스라 env 격리 유지.
            $isMy = $pdo->getAttribute(\PDO::ATTR_DRIVER_NAME) === 'mysql';
            $sql  = $isMy
                ? "INSERT INTO app_setting(skey,svalue,updated_at) VALUES(?,?,?) ON DUPLICATE KEY UPDATE svalue=VALUES(svalue),updated_at=VALUES(updated_at)"
                : "INSERT INTO app_setting(skey,svalue,updated_at) VALUES(?,?,?) ON CONFLICT(skey) DO UPDATE SET svalue=excluded.svalue,updated_at=excluded.updated_at";
            $pdo->prepare($sql)->execute([$skey, $cur, $now]);
        } catch (\Throwable $e) {
            return self::json($resp, ['ok' => false, 'error' => 'persist_failed', 'message' => $e->getMessage()], 500);
        }

        return self::json($resp, [
            'ok' => true,
            'reporting_currency' => $cur,
            'currency' => $cur,
            'fx_krw_per_unit' => self::krwPerUnit($cur),
        ]);
    }

    /* ════════════════════════════════════════════════════════════════════
     *  부가세(VAT) 엔진 — 매출세액/매입세액 상계·과세기간 버킷·Paddle MoR.
     *  ★기존 pass-through 캡처(kr_settlement_line.vat)는 그대로 유지(마진 제외). 본 엔진은 별도 납부 뷰라
     *    이중계상 없음(손익 산식 미변경).
     * ════════════════════════════════════════════════════════════════════ */

    /** vat 요약 영속 테이블 자가 생성(MySQL/SQLite). */
    private static function ensureVatTable(\PDO $pdo): void
    {
        try {
            $isMy = $pdo->getAttribute(\PDO::ATTR_DRIVER_NAME) === 'mysql';
            if ($isMy) {
                $pdo->exec("CREATE TABLE IF NOT EXISTS pnl_vat_summary (
                    tenant_id VARCHAR(64) NOT NULL,
                    period_from VARCHAR(10) NOT NULL,
                    period_to VARCHAR(10) NOT NULL,
                    taxable_period VARCHAR(16) NOT NULL DEFAULT '',
                    output_vat DECIMAL(16,2) NOT NULL DEFAULT 0,
                    input_vat DECIMAL(16,2) NOT NULL DEFAULT 0,
                    net_vat DECIMAL(16,2) NOT NULL DEFAULT 0,
                    vat_rate DECIMAL(6,4) NOT NULL DEFAULT 0.1000,
                    updated_at VARCHAR(32) NOT NULL DEFAULT '',
                    PRIMARY KEY (tenant_id, period_from, period_to)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
            } else {
                $pdo->exec("CREATE TABLE IF NOT EXISTS pnl_vat_summary (
                    tenant_id TEXT NOT NULL,
                    period_from TEXT NOT NULL,
                    period_to TEXT NOT NULL,
                    taxable_period TEXT NOT NULL DEFAULT '',
                    output_vat REAL NOT NULL DEFAULT 0,
                    input_vat REAL NOT NULL DEFAULT 0,
                    net_vat REAL NOT NULL DEFAULT 0,
                    vat_rate REAL NOT NULL DEFAULT 0.1,
                    updated_at TEXT NOT NULL DEFAULT '',
                    PRIMARY KEY (tenant_id, period_from, period_to)
                )");
            }
        } catch (\Throwable $e) { /* 영속 실패해도 계산 응답은 정상 반환 */ }
    }

    /** 과세기간 라벨(한국 부가세 분기: Q1 1-3월 …). from 기준 연·분기. */
    private static function taxablePeriodLabel(string $from): string
    {
        $y = substr($from !== '' ? $from : gmdate('Y-m-d'), 0, 4);
        $m = (int)substr($from !== '' ? $from : gmdate('Y-m-d'), 5, 2);
        if ($m < 1 || $m > 12) $m = (int)gmdate('n');
        $q = (int)ceil($m / 3);
        return $y . '-Q' . $q;
    }

    /**
     * GET /v424/pnl/vat — 부가세 상계/과세기간/Paddle MoR 납부뷰(+ 요약 영속).
     */
    public static function vat(Request $req, Response $resp): Response
    {
        $g = self::gate($req, $resp);
        if (isset($g['error'])) return $g['error'];
        [$tenant, $isDemo, $pdo] = [$g['tenant'], $g['isDemo'], $g['pdo']];
        [$from, $to] = self::periodParams($req);

        // vat_rate — 테넌트 최신 kr_fee_rule(채널 무관 최신). 없으면 0.10(국세 표준).
        $vatRate = 0.10;
        try {
            $st = $pdo->prepare("SELECT vat_rate FROM kr_fee_rule WHERE tenant_id=? ORDER BY effective_from DESC, id DESC LIMIT 1");
            $st->execute([$tenant]);
            $v = $st->fetchColumn();
            if ($v !== false && $v !== null && (float)$v > 0) $vatRate = (float)$v;
        } catch (\Throwable $e) { $vatRate = 0.10; }

        // 매출세액(output VAT) — 정산 라인의 실 캡처 부가세(pass-through) 합. 월별 버킷 동반.
        $outputVat = 0.0; $monthly = [];
        try {
            $sw = ['tenant_id = ?']; $sa = [$tenant];
            if ($from !== '') { $sw[] = "DATE(period_start) >= ?"; $sa[] = $from; }
            if ($to   !== '') { $sw[] = "DATE(period_end) <= ?";   $sa[] = $to; }
            $swSql = implode(' AND ', $sw);
            $st = $pdo->prepare("SELECT SUBSTR(period_start,1,7) AS ym, COALESCE(SUM(vat),0) AS vat
                                 FROM kr_settlement_line WHERE $swSql GROUP BY SUBSTR(period_start,1,7) ORDER BY ym");
            $st->execute($sa);
            foreach ($st->fetchAll(\PDO::FETCH_ASSOC) as $r) {
                $mv = (float)($r['vat'] ?? 0);
                $outputVat += $mv;
                $monthly[] = ['month' => (string)($r['ym'] ?? ''), 'output_vat' => $mv];
            }
        } catch (\Throwable $e) { $outputVat = 0.0; }

        // 매입세액(input VAT) — 부가세 포함(VAT-inclusive) 매입비용에서 세액 추출(공급대가 × rate/(1+rate)).
        //   대상: COGS(매입원가)·광고비·플랫폼수수료·배송비(공제 매입). 쿠폰/반품비는 매출차감(contra-revenue)이라
        //   매입 아님 → 제외(이중계상 방지). 손익 마진엔 미반영(별도 납부 뷰).
        $comp = self::components($pdo, $tenant, $from, $to);
        $vatInclusiveInputs = $comp['cogs'] + $comp['adSpend'] + $comp['platformFee'] + $comp['shippingCost'];
        $inputVat = $vatRate > 0 ? round($vatInclusiveInputs * $vatRate / (1 + $vatRate)) : 0.0;
        $outputVat = round($outputVat);
        $netVat = $outputVat - $inputVat; // 납부(+)/환급(-) 세액

        // [270차 수정] 월별표 매입/납부세액 프로라타 분배 — 과거 monthly 는 output_vat 만 반환해
        //   프론트 월별표가 매입=0·납부=매출세액(과대납부 오인)이었다. 집계 input_vat 를 월별 매출세액 비중으로 안분.
        $totOutForShare = array_sum(array_column($monthly, 'output_vat'));
        foreach ($monthly as &$_m) {
            $share = $totOutForShare > 0 ? ((float)$_m['output_vat'] / $totOutForShare) : 0;
            $mIn = round($inputVat * $share);
            $_m['input_vat'] = $mIn;
            $_m['net_vat_payable'] = round((float)$_m['output_vat']) - $mIn;
        }
        unset($_m);

        $taxablePeriod = self::taxablePeriodLabel($from);

        // Paddle MoR 납부뷰 — GenieGo 자체 구독매출(Paddle=MoR)의 부가세는 Paddle 이 징수·대납.
        //   ★플랫폼 구독 데이터(테넌트 격리 없음)라 admin 롤만 노출(일반 테넌트엔 null). self_liability=0(MoR 대납).
        $paddleMor = null;
        $role = (string)($req->getAttribute('auth_role') ?? '');
        if ($role === 'admin') {
            try {
                $st = $pdo->query("SELECT COALESCE(SUM(unit_price),0) AS gross, COUNT(*) AS cnt
                                   FROM paddle_subscriptions WHERE status='active'");
                $pr = $st ? ($st->fetch(\PDO::FETCH_ASSOC) ?: []) : [];
                $grossSubs = (float)($pr['gross'] ?? 0);
                // Paddle 표시가는 tax-inclusive(MoR) 가정 → 부가세 추출.
                $vatCollected = $vatRate > 0 ? round($grossSubs * $vatRate / (1 + $vatRate)) : 0.0;
                $paddleMor = [
                    'active_subscriptions' => (int)($pr['cnt'] ?? 0),
                    'gross_subscription_revenue' => round($grossSubs),
                    'vat_collected_by_mor' => $vatCollected,   // Paddle 이 고객에게 징수
                    'remitted_by_mor' => $vatCollected,        // Paddle 이 대납(MoR)
                    'self_remittance_liability' => 0.0,        // GenieGo 자체 납부 의무 없음(MoR)
                    'note' => 'Paddle acts as Merchant of Record; VAT is collected and remitted by Paddle.',
                ];
            } catch (\Throwable $e) { $paddleMor = null; }
        }

        // 영속 — vat 요약 upsert(감사·리포트 소스).
        self::ensureVatTable($pdo);
        try {
            $now = gmdate('c'); $pf = $from !== '' ? $from : ''; $pt = $to !== '' ? $to : '';
            $isMy = $pdo->getAttribute(\PDO::ATTR_DRIVER_NAME) === 'mysql';
            $sql = $isMy
                ? "INSERT INTO pnl_vat_summary (tenant_id,period_from,period_to,taxable_period,output_vat,input_vat,net_vat,vat_rate,updated_at)
                   VALUES (?,?,?,?,?,?,?,?,?)
                   ON DUPLICATE KEY UPDATE taxable_period=VALUES(taxable_period),output_vat=VALUES(output_vat),
                     input_vat=VALUES(input_vat),net_vat=VALUES(net_vat),vat_rate=VALUES(vat_rate),updated_at=VALUES(updated_at)"
                : "INSERT INTO pnl_vat_summary (tenant_id,period_from,period_to,taxable_period,output_vat,input_vat,net_vat,vat_rate,updated_at)
                   VALUES (?,?,?,?,?,?,?,?,?)
                   ON CONFLICT(tenant_id,period_from,period_to) DO UPDATE SET taxable_period=excluded.taxable_period,
                     output_vat=excluded.output_vat,input_vat=excluded.input_vat,net_vat=excluded.net_vat,
                     vat_rate=excluded.vat_rate,updated_at=excluded.updated_at";
            $pdo->prepare($sql)->execute([$tenant, $pf, $pt, $taxablePeriod, $outputVat, $inputVat, $netVat, $vatRate, $now]);
        } catch (\Throwable $e) { /* 영속 실패 무시 */ }

        return self::json($resp, [
            'ok' => true,
            'taxable_period' => $taxablePeriod,
            'vat_rate' => $vatRate,
            'output_vat' => $outputVat,           // 매출세액(정산 실캡처)
            'input_vat' => $inputVat,             // 매입세액(공제 매입 추출)
            'net_vat_payable' => $netVat,         // 납부(+)/환급(-)
            'input_vat_base' => round($vatInclusiveInputs),
            'monthly' => $monthly,                // 과세기간 내 월별 매출세액 버킷
            'paddle_mor' => $paddleMor,           // 구독 MoR 납부뷰(admin only)
            'period_from' => $from !== '' ? $from : null,
            'period_to'   => $to   !== '' ? $to   : null,
            '_env' => Db::envLabel(), '_isDemo' => $isDemo,
        ]);
    }
}
