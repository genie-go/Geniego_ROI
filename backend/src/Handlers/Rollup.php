<?php
declare(strict_types=1);

namespace Genie\Handlers;

use Genie\Db;
use Genie\TemplateResponder;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

/**
 * V423 — Rollup Aggregation Layer
 * SKU / Campaign / Creator / Platform × daily / weekly / monthly / seasonal / yearly
 *
 * 204차 재구축: 과거엔 모든 시드배열이 비어 항상 빈 결과를 반환했고(실 DB 집계 미배선),
 *   공개 bypass + mt_rand 합성 잔재로 테넌트 격리도 없었다. 이제:
 *   - 테넌트는 인증 세션(Bearer user_session)에서 tenant_id 로 해석(헤더 불신, 미인증=demo).
 *   - tenant==='demo' → 데모 체험용 가상 롤업(운영 오염 0, demo 테넌트 한정).
 *   - 실 테넌트 → channel_orders(SKU/플랫폼 판매)·performance_metrics(캠페인/플랫폼 광고) 실집계
 *     (tenant_id WHERE 격리). 데이터 없으면 정직한 빈 결과.
 */
final class Rollup {

    /** [현 차수] 채널 → 마켓 국가/권역 매핑(상품×국가 성과). 채널이라는 실수집 데이터에서 도출(허위값 0).
     *   국내 KR / 일본 JP(Qoo10·Yahoo·Rakuten) / 미국 US(Amazon·eBay·Walmart·Etsy) / 동남아 SEA(Shopee·Lazada) / 중국 CN. 미상=ETC. */
    private const CHANNEL_COUNTRY = [
        'coupang'=>'KR','naver'=>'KR','naver_smartstore'=>'KR','smartstore'=>'KR','11st'=>'KR','st11'=>'KR','gmarket'=>'KR',
        'auction'=>'KR','lotteon'=>'KR','ssg'=>'KR','kakao'=>'KR','kakaogift'=>'KR','cafe24'=>'KR','godomall'=>'KR','wemef'=>'KR','tmon'=>'KR',
        'qoo10'=>'JP','yahoo_japan'=>'JP','yahoo_jp'=>'JP','rakuten'=>'JP','amazon_jp'=>'JP',
        'amazon'=>'US','amazon_spapi'=>'US','ebay'=>'US','walmart'=>'US','etsy'=>'US',
        'shopee'=>'SEA','lazada'=>'SEA','aliexpress'=>'CN',
    ];
    private static function channelCountry(string $ch): string {
        $c = strtolower(trim($ch));
        return self::CHANNEL_COUNTRY[$c] ?? 'ETC';
    }

    // ── 테넌트 해석 (세션 토큰 → tenant_id, 미인증/데모토큰 = 'demo') ────────────
    private static function tenantOf(Request $req): string {
        $auth = $req->getHeaderLine('Authorization');
        if (preg_match('/Bearer\s+(\S+)/i', $auth, $m)
            && $m[1] !== 'demo-token' && !str_starts_with($m[1], 'demo') && !str_starts_with($m[1], 'local_demo_')) {
            try {
                $pdo = Db::pdo();
                $now = gmdate('Y-m-d\TH:i:s\Z');
                $s = $pdo->prepare(
                    'SELECT u.id, u.tenant_id, u.parent_user_id FROM user_session s
                       JOIN app_user u ON u.id = s.user_id
                      WHERE s.token IN (?, ?) AND s.expires_at > ? AND u.is_active = 1 LIMIT 1'
                );
                $s->execute([UserAuth::hashToken($m[1]), $m[1], $now]);
                $r = $s->fetch(\PDO::FETCH_ASSOC);
                if ($r) {
                    $tid = trim((string)($r['tenant_id'] ?? ''));
                    if ($tid !== '') return $tid;
                    $pid = (int)($r['parent_user_id'] ?? 0);
                    if ($pid > 0) {
                        $ps = $pdo->prepare('SELECT tenant_id FROM app_user WHERE id = ? LIMIT 1');
                        $ps->execute([$pid]);
                        $ptid = trim((string)($ps->fetchColumn() ?: ''));
                        return $ptid !== '' ? $ptid : ('acct_' . $pid);
                    }
                    return 'acct_' . (int)$r['id'];
                }
            } catch (\Throwable $e) { /* 미해결 → demo */ }
        }
        return 'demo';
    }

    private static function isDemo(string $tenant): bool { return $tenant === 'demo'; }

    /* [현 차수] ★취소/반품 상태 캐논 통일 SSOT — OrderHub::CANCEL_TOKENS/RETURN_TOKENS 참조(드리프트 제거).
       표준 신호 event_type('cancel'/'return') 우선 + 어댑터별 localized status 토큰(영문/한글) 폴백.
       정합 규칙: 취소주문은 매출·주문수에서 제외(미실현 매출), 반품은 매출 포함하되 반품률만 카운트.
       219 감사 하드닝: 기존 Rollup 자체 const 가 OrderHub 와 RETURN_TOKENS 드리프트(반품Done/입고/return 누락)
       했던 것을 OrderHub SSOT 단일 참조로 통일. */
    private static function isCancel(string $event, string $status): bool {
        return $event === 'cancel' || in_array($status, OrderHub::CANCEL_TOKENS, true);
    }
    private static function isReturn(string $event, string $status): bool {
        return $event === 'return' || in_array($status, OrderHub::RETURN_TOKENS, true);
    }

    // Generate date/period labels
    private static function dates(string $period, int $n): array {
        // [현 차수] ★base date 하드코딩(2026-03-05/2026) 제거 — 오늘 기준으로 버킷 생성. 기존엔 고정 기준이라
        //   오늘 이후 입력된 운영 주문/광고 데이터가 dates 범위 밖으로 전량 제외(매출 0)되던 결함. (프론트 derive와 정합.)
        $result = [];
        $now = time();
        switch ($period) {
            case 'monthly':
                $baseYear = (int)gmdate('Y', $now); $baseMon = (int)gmdate('n', $now);
                for ($i = $n - 1; $i >= 0; $i--) {
                    $totalMonths = ($baseYear * 12 + $baseMon - 1) - $i;
                    $y = intdiv($totalMonths, 12);
                    $mo = ($totalMonths % 12) + 1;
                    $result[] = sprintf('%04d-%02d', $y, $mo);
                }
                break;
            case 'yearly':
                $baseY = (int)gmdate('Y', $now);
                for ($i = $n - 1; $i >= 0; $i--) $result[] = (string)($baseY - $i);
                break;
            case 'seasonal':
                $baseYear = (int)gmdate('Y', $now); $baseQ = (int)ceil((int)gmdate('n', $now) / 3);
                for ($i = $n - 1; $i >= 0; $i--) {
                    $totalQ = ($baseYear * 4 + $baseQ - 1) - $i;
                    $y = intdiv($totalQ, 4);
                    $qq = ($totalQ % 4) + 1;
                    $result[] = sprintf('%04d-Q%d', $y, $qq);
                }
                break;
            case 'weekly':
                $base = $now;
                for ($i = $n - 1; $i >= 0; $i--) {
                    $ts = $base - $i * 7 * 86400;
                    $result[] = gmdate('Y', $ts) . '-W' . str_pad((string)(int)gmdate('W', $ts), 2, '0', STR_PAD_LEFT);
                }
                break;
            default: // daily
                $base = $now;
                for ($i = $n - 1; $i >= 0; $i--) $result[] = gmdate('Y-m-d', $base - $i * 86400);
                break;
        }
        return $result;
    }

    /** 실제 날짜(YYYY-MM-DD…)를 period 버킷 라벨로 변환(dates() 출력과 정합). */
    private static function bucketLabel(string $dateStr, string $period): string {
        $ts = strtotime(substr($dateStr, 0, 19));
        if ($ts === false) return '';
        switch ($period) {
            case 'monthly':  return gmdate('Y-m', $ts);
            case 'yearly':   return gmdate('Y', $ts);
            case 'seasonal': return gmdate('Y', $ts) . '-Q' . (string)(intdiv((int)gmdate('n', $ts) - 1, 3) + 1);
            case 'weekly':   return gmdate('Y', $ts) . '-W' . str_pad((string)(int)gmdate('W', $ts), 2, '0', STR_PAD_LEFT);
            default:         return gmdate('Y-m-d', $ts);
        }
    }

    private static function nRange(string $period, int $n, int $default): int {
        switch ($period) {
            case 'monthly':  return max(2, min(36, $n ?: $default));
            case 'yearly':   return max(2, min(10, $n ?: $default));
            case 'seasonal': return max(2, min(20, $n ?: $default));
            case 'weekly':   return max(4, min(52, $n ?: $default));
            default:         return max(7, min(90, $n ?: $default));
        }
    }

    private static function periodScale(string $period): float {
        switch ($period) {
            case 'monthly':  return 30.0;
            case 'yearly':   return 365.0;
            case 'seasonal': return 91.0;
            case 'weekly':   return 7.0;
            default:         return 1.0;
        }
    }

    // ── 1. SKU Rollup ──────────────────────────────────────────────────────
    public static function sku(Request $req, Response $res, array $args = []): Response {
        $q = $req->getQueryParams();
        $period = $q['period'] ?? 'daily';
        $n = self::nRange($period, (int)($q['n'] ?? 0), 14);
        $scale = self::periodScale($period);
        $dates = self::dates($period, $n);
        // 204차: 데모는 프론트(rollupDemoDerive)가 단일 소스에서 파생 → 백엔드는 실집계 전용(테넌트격리).
        //   미인증/익명(=demo 미해결)도 실집계(빈 결과) — 운영 공개 합성데이터 노출 차단(감사 P2).
        $tenant = self::tenantOf($req);
        $rows = self::realSkuRows($tenant, $period, $dates);
        usort($rows, fn($a, $b) => $b['total_revenue'] <=> $a['total_revenue']);
        return TemplateResponder::json($res, [
            'ok' => true, 'version' => 'v423', 'dimension' => 'sku',
            'period' => $period, 'n' => $n, 'dates' => $dates, 'rows' => $rows,
        ]);
    }

    // ── 1b. 상품 성과 분석 (순위 · 상품×채널 · 상품×국가) ───────────────────────
    /** [현 차수] GET /v423/rollup/product-performance — "어떤 상품이 잘/안 팔리는지(순위), 어느 채널·국가에서
     *   잘/안 팔리는지"를 channel_orders(sku·channel) 실집계로 산출(취소제외 SSOT). 국가=채널→마켓 매핑(실수집 채널 기반).
     *   마케팅 활동·제품개발 의사결정의 핵심. 데모는 프론트가 단일소스(orders)에서 동일 파생(백엔드=실집계 전용). */
    public static function productPerformance(Request $req, Response $res, array $args = []): Response {
        $tenant = self::tenantOf($req);
        $q = $req->getQueryParams();
        $period = (string)($q['period'] ?? 'monthly');
        $n = self::nRange($period, (int)($q['n'] ?? 0), 6);
        $dates = self::dates($period, $n);
        $start = self::rangeStart($dates);
        $products = []; $channelsSeen = []; $countriesSeen = [];
        try {
            $pdo = Db::pdo();
            $stmt = $pdo->prepare(
                "SELECT sku, product_name AS name, channel, qty, total_price, status, event_type
                   FROM channel_orders
                  WHERE tenant_id = ? AND sku IS NOT NULL AND sku <> '' AND ordered_at >= ?"
            );
            $stmt->execute([$tenant, $start]);
            while ($r = $stmt->fetch(\PDO::FETCH_ASSOC)) {
                $ev = (string)($r['event_type'] ?? 'order'); $st = (string)($r['status'] ?? '');
                if (self::isCancel($ev, $st)) continue; // 취소 제외(매출·주문수 정합)
                $sku = (string)$r['sku']; $ch = (string)($r['channel'] ?? ''); $country = self::channelCountry($ch);
                $qty = (int)($r['qty'] ?? 0); $rev = (float)($r['total_price'] ?? 0); $isRet = self::isReturn($ev, $st);
                if (!isset($products[$sku])) $products[$sku] = ['sku'=>$sku,'name'=>(string)($r['name'] ?? $sku),'qty'=>0,'revenue'=>0.0,'orders'=>0,'returns'=>0,'byChannel'=>[],'byCountry'=>[],'byGender'=>[],'byAge'=>[],'ad'=>null];
                $products[$sku]['qty'] += $qty; $products[$sku]['revenue'] += $rev; $products[$sku]['orders'] += 1;
                if ($isRet) $products[$sku]['returns'] += 1;
                if (!isset($products[$sku]['byChannel'][$ch])) $products[$sku]['byChannel'][$ch] = ['qty'=>0,'revenue'=>0.0,'orders'=>0];
                $products[$sku]['byChannel'][$ch]['qty'] += $qty; $products[$sku]['byChannel'][$ch]['revenue'] += $rev; $products[$sku]['byChannel'][$ch]['orders'] += 1;
                if (!isset($products[$sku]['byCountry'][$country])) $products[$sku]['byCountry'][$country] = ['qty'=>0,'revenue'=>0.0,'orders'=>0];
                $products[$sku]['byCountry'][$country]['qty'] += $qty; $products[$sku]['byCountry'][$country]['revenue'] += $rev; $products[$sku]['byCountry'][$country]['orders'] += 1;
                $channelsSeen[$ch] = true; $countriesSeen[$country] = true;
            }
        } catch (\Throwable $e) { /* 빈 결과(정직) */ }
        // [현 차수] 구매자 인구통계(성별·연령) — channel_orders 엔 개인정보(성별/연령) 미수집이라, 광고 오디언스 실데이터
        //   ad_insight_agg(sku×gender×age_range, conversions=구매근접·revenue)에서 도출(허위값 0·미적재 시 빈 결과).
        //   ★주문 있는 상품에만 부착(랭킹 집합 정합). 데이터 수집 확장 시 자동 반영(자격증명/오디언스 ingest).
        try {
            $dg = $pdo->prepare(
                "SELECT sku, gender, age_range, SUM(conversions) cv, SUM(revenue) rv
                   FROM ad_insight_agg
                  WHERE tenant_id = ? AND sku IS NOT NULL AND sku <> '' AND date >= ?
                  GROUP BY sku, gender, age_range"
            );
            $dg->execute([$tenant, substr($start, 0, 10)]);
            while ($d = $dg->fetch(\PDO::FETCH_ASSOC)) {
                $sku = (string)$d['sku']; if (!isset($products[$sku])) continue; // 주문 있는 상품만
                $g = (string)($d['gender'] ?? '') ?: 'unknown'; $a = (string)($d['age_range'] ?? '') ?: 'unknown';
                $cv = (int)($d['cv'] ?? 0); $rv = (float)($d['rv'] ?? 0);
                if (!isset($products[$sku]['byGender'][$g])) $products[$sku]['byGender'][$g] = ['conv'=>0,'revenue'=>0.0];
                $products[$sku]['byGender'][$g]['conv'] += $cv; $products[$sku]['byGender'][$g]['revenue'] += $rv;
                if (!isset($products[$sku]['byAge'][$a])) $products[$sku]['byAge'][$a] = ['conv'=>0,'revenue'=>0.0];
                $products[$sku]['byAge'][$a]['conv'] += $cv; $products[$sku]['byAge'][$a]['revenue'] += $rv;
            }
        } catch (\Throwable $e) { /* 인구통계 미적재 = 빈(정직) */ }
        // [현 차수] 상품별 광고 성과(ad_insight_agg sku 차원) — 상품 ROAS·광고매출·노출·클릭·전환. performance_metrics 엔
        //   sku 가 없어 상품별 광고분해가 불가했으나, ad_insight_agg(sku 키 보유)로 산출. 미적재 시 ad=null(정직·허위값 0).
        //   ★상품별 마케팅 성과 분석의 데이터 기반 — 광고-상품 매핑 ingest 확장 시 자동 채워짐.
        try {
            $am = $pdo->prepare(
                "SELECT sku, SUM(spend) sp, SUM(revenue) rv, SUM(conversions) cv, SUM(impressions) im, SUM(clicks) ck
                   FROM ad_insight_agg
                  WHERE tenant_id = ? AND sku IS NOT NULL AND sku <> '' AND date >= ?
                  GROUP BY sku"
            );
            $am->execute([$tenant, substr($start, 0, 10)]);
            while ($a = $am->fetch(\PDO::FETCH_ASSOC)) {
                $sku = (string)$a['sku']; if (!isset($products[$sku])) continue;
                $sp = (float)($a['sp'] ?? 0); $rv = (float)($a['rv'] ?? 0); $im = (int)($a['im'] ?? 0); $ck = (int)($a['ck'] ?? 0);
                $products[$sku]['ad'] = [
                    'spend' => round($sp, 2), 'ad_revenue' => round($rv, 2),
                    'roas' => $sp > 0 ? round($rv / $sp, 2) : null,
                    'impressions' => $im, 'clicks' => $ck, 'conversions' => (int)($a['cv'] ?? 0),
                    'ctr' => $im > 0 ? round($ck / $im * 100, 2) : 0,
                ];
            }
        } catch (\Throwable $e) { /* 광고 sku 미적재 = ad null(정직) */ }
        // [현 차수] ★어트리뷰션 기반 상품 광고비 배분 — performance_metrics 는 sku 가 없어(캠페인/채널 단위) 상품별
        //   광고비가 불가했다. attribution_touch(주문→귀속 광고채널) ⨯ channel_orders(주문→sku·매출) 로 각 채널
        //   광고비를 그 채널 귀속주문의 sku 매출비례로 배분(1/N 임의분배 아님=실 귀속 기반). 귀속 데이터 없으면 ad_attr
        //   미설정(정직·허위값 0). roas=귀속매출/배분광고비. ad_insight_agg 기반 ad(직접 sku 적재)와 출처 구분.
        try {
            $sp = $pdo->prepare("SELECT LOWER(channel) ch, SUM(spend) sp FROM performance_metrics WHERE tenant_id=? AND date >= ? GROUP BY LOWER(channel)");
            $sp->execute([$tenant, substr($start, 0, 10)]);
            $chSpend = []; while ($r = $sp->fetch(\PDO::FETCH_ASSOC)) { $chSpend[(string)$r['ch']] = (float)($r['sp'] ?? 0); }
            if ($chSpend) {
                // [현 차수 감사 P1] ★주문당 dedup — attribution_touch 는 주문당 N 터치행이라 channel_orders 와 직접
                //   JOIN+SUM 하면 주문 매출이 터치수만큼 곱해져 귀속매출/ROAS 과대(팬아웃). Connectors:910·AutoCampaign:541
                //   과 동일 패턴으로 내부 서브쿼리 GROUP BY (채널,sku,주문) MAX 로 주문당 1행 선dedup 후 외부 합산.
                // [현 차수] 취소 제외 SSOT 통일(OrderHub::observedExclusion) — 본선 isCancel() 은 event_type+status
                //   2축인데 이 서브쿼리만 event_type 축만 봐서 동일 함수 내부에서 비대칭이었다.
                [$exclExpr, $exclTokens] = OrderHub::observedExclusion('co');
                $aj = $pdo->prepare(
                    "SELECT ch, sku, SUM(rv) rv FROM (
                         SELECT LOWER(at.channel) ch, co.sku sku, co.channel_order_id oid, MAX(co.total_price) rv
                           FROM attribution_touch at
                           JOIN channel_orders co ON co.tenant_id = at.tenant_id AND (co.channel_order_id = at.order_id OR co.order_no = at.order_id)
                          WHERE at.tenant_id = ? AND at.order_id IS NOT NULL AND at.order_id <> '' AND co.sku IS NOT NULL AND co.sku <> '' AND NOT $exclExpr
                          GROUP BY LOWER(at.channel), co.sku, co.channel_order_id
                     ) t GROUP BY ch, sku"
                );
                $aj->execute(array_merge([$tenant], $exclTokens));
                $chSkuRev = []; $chTotRev = [];
                while ($r = $aj->fetch(\PDO::FETCH_ASSOC)) {
                    $ch = (string)$r['ch']; $sku = (string)$r['sku']; $rv = (float)($r['rv'] ?? 0);
                    $chSkuRev[$ch][$sku] = ($chSkuRev[$ch][$sku] ?? 0) + $rv; $chTotRev[$ch] = ($chTotRev[$ch] ?? 0) + $rv;
                }
                $skuAdSpend = []; $skuAttrRev = [];
                foreach ($chSpend as $ch => $sp2) {
                    $tot = $chTotRev[$ch] ?? 0; if ($tot <= 0) continue; // 귀속주문 없는 채널 광고비는 배분 안 함(임의배분 금지)
                    foreach (($chSkuRev[$ch] ?? []) as $sku => $rv) {
                        $skuAdSpend[$sku] = ($skuAdSpend[$sku] ?? 0) + $sp2 * ($rv / $tot);
                        $skuAttrRev[$sku] = ($skuAttrRev[$sku] ?? 0) + $rv;
                    }
                }
                foreach ($skuAdSpend as $sku => $as) {
                    if (!isset($products[$sku]) || $as <= 0) continue;
                    $ar = $skuAttrRev[$sku] ?? 0;
                    $products[$sku]['ad_attr'] = ['spend' => round($as, 2), 'attr_revenue' => round($ar, 2), 'roas' => $as > 0 ? round($ar / $as, 2) : null, 'source' => 'attribution'];
                }
            }
        } catch (\Throwable $e) { /* 어트리뷰션 미적재 = ad_attr 미설정(정직) */ }
        // [현 차수] 상품 원가(po_products.cost_price by sku) — 이익순 랭킹용. 매출총이익 = 매출 − 원가×수량(주문+원가
        //   파생=정확). 원가 미등록 sku 는 gross_profit=null(정직·임의원가 0). 광고비 제외(=매출총이익 gross).
        // [수정] 원가는 PriceOpt 격리 sqlite(priceopt.sqlite)에 있어 메인 DB(Db::pdo) 조인이 항상 빈 결과였다
        //   (→ 기존 gross_profit·Phase1 net_profit 이 운영에서 항상 null 이던 잠재버그). PriceOpt 공개 헬퍼로 재사용.
        $costs = \Genie\Handlers\PriceOpt::costMap($tenant);
        // [경쟁사] SKU별 경쟁사 가격/SoS(공개데이터=가격·점유율, 경쟁사 내부실적 아님) — 가격최적화 수집분 재사용.
        $compMap = \Genie\Handlers\PriceOpt::competitorMap($tenant);
        // [Phase1 순이익] 실 정산 수수료(kr_settlement_line, SKU 단위 실데이터) — 마켓수수료+광고수수료+배송비+반품비+기타차감.
        //   ★이중차감 방지: vat(대납세금)·coupon_discount·point_discount 제외(쿠폰/포인트는 channel_orders.total_price 에
        //   이미 반영, vat 는 대납). 정산 미적재 sku 는 settleFees 없음 → 요율추정 폴백.
        $settleFees = [];
        try {
            $sf = $pdo->prepare(
                "SELECT sku, SUM(platform_fee + ad_fee + shipping_fee + return_fee + other_deductions) fee
                   FROM kr_settlement_line
                  WHERE tenant_id = ? AND sku IS NOT NULL AND sku <> '' AND period_start >= ?
                  GROUP BY sku"
            );
            $sf->execute([$tenant, substr($start, 0, 10)]);
            while ($s = $sf->fetch(\PDO::FETCH_ASSOC)) { $settleFees[(string)$s['sku']] = (float)($s['fee'] ?? 0); }
        } catch (\Throwable $e) { /* 정산 미적재 = 요율추정 폴백 */ }
        // [Phase1 순이익] 채널별 수수료율(kr_fee_rule) — 정산 미적재 채널용 정직 추정(fees_source='estimated').
        //   요율은 분수(예: 0.1). 채널별 매출 × (판매수수료율+광고수수료율) 합산. 실 정산 적재 시 그 값이 우선.
        $feeRule = [];
        try {
            $fr = $pdo->prepare("SELECT LOWER(channel_key) ch, AVG(platform_fee_rate) pf, AVG(ad_fee_rate) af FROM kr_fee_rule WHERE tenant_id = ? GROUP BY LOWER(channel_key)");
            $fr->execute([$tenant]);
            while ($f = $fr->fetch(\PDO::FETCH_ASSOC)) { $feeRule[(string)$f['ch']] = (float)($f['pf'] ?? 0) + (float)($f['af'] ?? 0); }
        } catch (\Throwable $e) { /* 요율 미등록 */ }
        $list = array_values($products);
        foreach ($list as &$p) {
            $p['revenue'] = round($p['revenue'], 2);
            $p['return_rate'] = $p['orders'] > 0 ? round($p['returns'] / $p['orders'] * 100, 1) : 0;
            $p['aov'] = $p['orders'] > 0 ? round($p['revenue'] / $p['orders'], 0) : 0;
            if (isset($costs[$p['sku']]) && $costs[$p['sku']] > 0) {
                $cogs = $costs[$p['sku']] * $p['qty'];
                $p['cogs'] = round($cogs, 2); $p['gross_profit'] = round($p['revenue'] - $cogs, 2);
                $p['margin'] = $p['revenue'] > 0 ? round($p['gross_profit'] / $p['revenue'] * 100, 1) : 0;
            } else { $p['cogs'] = null; $p['gross_profit'] = null; $p['margin'] = null; }
            // [Phase1 순이익] net_profit = 매출총이익 − 외부광고비 − 마켓수수료. 원가 미등록 시 net 산출 불가(정직 null).
            //   외부광고비: ad_attr(귀속배분) 우선, 없으면 ad(직접 sku 적재). 마켓수수료: 실정산>요율추정>없음.
            $adCost = isset($p['ad_attr']['spend']) ? (float)$p['ad_attr']['spend'] : (isset($p['ad']['spend']) ? (float)$p['ad']['spend'] : 0.0);
            $feesSource = 'none'; $mktFees = 0.0;
            if (isset($settleFees[$p['sku']])) { $mktFees = $settleFees[$p['sku']]; $feesSource = 'settlement'; }
            elseif ($feeRule) {
                $est = 0.0; foreach ($p['byChannel'] as $c => $v) { $rate = $feeRule[strtolower((string)$c)] ?? 0; if ($rate > 0) $est += $v['revenue'] * $rate; }
                if ($est > 0) { $mktFees = $est; $feesSource = 'estimated'; }
            }
            $p['ad_cost'] = round($adCost, 2);
            $p['mkt_fees'] = round($mktFees, 2);
            $p['fees_source'] = $feesSource;
            if ($p['gross_profit'] !== null) {
                $p['net_profit'] = round($p['gross_profit'] - $adCost - $mktFees, 2);
                $p['net_margin'] = $p['revenue'] > 0 ? round($p['net_profit'] / $p['revenue'] * 100, 1) : 0;
            } else { $p['net_profit'] = null; $p['net_margin'] = null; }
            // [경쟁사] 등록된 SKU 만 부착(미등록=미부착, 정직). our_price·comp_min·gap_pct·sos_rank·alert.
            if (isset($compMap[$p['sku']])) $p['competitor'] = $compMap[$p['sku']];
            $tc = ''; $tcv = -1; foreach ($p['byChannel'] as $c => $v) { if ($v['revenue'] > $tcv) { $tcv = $v['revenue']; $tc = $c; } }
            $tk = ''; $tkv = -1; foreach ($p['byCountry'] as $c => $v) { if ($v['revenue'] > $tkv) { $tkv = $v['revenue']; $tk = $c; } }
            $p['top_channel'] = $tc; $p['top_country'] = $tk;
            foreach ($p['byChannel'] as $c => &$v) $v['revenue'] = round($v['revenue'], 2); unset($v);
            foreach ($p['byCountry'] as $c => &$v) $v['revenue'] = round($v['revenue'], 2); unset($v);
        } unset($p);
        usort($list, fn($a, $b) => $b['revenue'] <=> $a['revenue']);
        foreach ($list as $i => &$p) $p['rank'] = $i + 1; unset($p);
        return TemplateResponder::json($res, [
            'ok' => true, 'period' => $period, 'n' => $n, 'count' => count($list),
            'products' => $list, 'channels' => array_keys($channelsSeen), 'countries' => array_keys($countriesSeen),
        ]);
    }

    /** 실 테넌트: channel_orders 에서 SKU별 판매 집계(테넌트 격리). SKU 단위 광고비 부재 → spend/roas 0. */
    /** [Phase2] GET /v423/rollup/product-channel-matrix — "어떤 상품을 어떤 채널에 광고해야 최소비용 최대 순이익인가".
     *   ad_insight_agg(sku×platform 실광고성과) ⨯ po_products(원가)로 SKU×채널 셀별 ROAS·CAC·순이익ROI 산출 후
     *   AutoRecommend 벤치마크(채널 목표 ROAS) 재사용해 셀 액션(increase/monitor/decrease)+근거 판정. 실데이터만(허위 0).
     *   ★광고비 대비 '매출'이 아닌 '순이익(매출−원가×전환−광고비)' 중심. 광고데이터 적재 즉시 자동 채워짐. */
    public static function productChannelMatrix(Request $req, Response $res, array $args = []): Response {
        $tenant = self::tenantOf($req);
        $q = $req->getQueryParams();
        $period = (string)($q['period'] ?? 'monthly');
        $n = self::nRange($period, (int)($q['n'] ?? 0), 6);
        $dates = self::dates($period, $n);
        $start = self::rangeStart($dates); $d0 = substr($start, 0, 10);
        $bench = [];
        try { $bench = \Genie\Handlers\AutoRecommend::benchmarkMap(); } catch (\Throwable $e) { $bench = []; }
        $normCh = static function ($p) {
            $p = strtolower(trim((string)$p));
            $map = ['coupang'=>'coupang_ads','facebook'=>'meta','instagram'=>'meta','google_ads'=>'google','naver_sa'=>'naver','kakao_moment'=>'kakao'];
            return $map[$p] ?? $p;
        };
        $products = []; $channelsSeen = [];
        try {
            $pdo = Db::pdo();
            $costs = \Genie\Handlers\PriceOpt::costMap($tenant); // [수정] 격리 sqlite 원가 헬퍼 재사용(메인DB 조인 불가)
            $names = [];
            try { $nq = $pdo->prepare("SELECT DISTINCT sku, product_name FROM channel_orders WHERE tenant_id = ? AND sku IS NOT NULL AND sku <> ''"); $nq->execute([$tenant]);
                while ($r = $nq->fetch(\PDO::FETCH_ASSOC)) { $s = (string)$r['sku']; if (!isset($names[$s])) $names[$s] = (string)($r['product_name'] ?? $s); } } catch (\Throwable $e) {}
            $am = $pdo->prepare(
                "SELECT sku, LOWER(platform) platform, SUM(spend) sp, SUM(revenue) rv, SUM(conversions) cv, SUM(impressions) im, SUM(clicks) ck
                   FROM ad_insight_agg
                  WHERE tenant_id = ? AND sku IS NOT NULL AND sku <> '' AND date >= ?
                  GROUP BY sku, LOWER(platform)"
            );
            $am->execute([$tenant, $d0]);
            while ($r = $am->fetch(\PDO::FETCH_ASSOC)) {
                $sku = (string)$r['sku']; $ch = $normCh((string)$r['platform']);
                $sp = (float)($r['sp'] ?? 0); $rv = (float)($r['rv'] ?? 0); $cv = (int)($r['cv'] ?? 0); $im = (int)($r['im'] ?? 0); $ck = (int)($r['ck'] ?? 0);
                if ($sp <= 0 && $im <= 0) continue;
                if (!isset($products[$sku])) $products[$sku] = ['sku'=>$sku,'name'=>$names[$sku] ?? $sku,'cells'=>[],'total'=>['spend'=>0.0,'revenue'=>0.0,'conversions'=>0,'net_profit'=>0.0]];
                $cost = $costs[$sku] ?? null;
                $roas = $sp > 0 ? round($rv / $sp, 2) : null;
                $cac = $cv > 0 ? round($sp / $cv, 0) : null;
                $ctr = $im > 0 ? round($ck / $im * 100, 2) : 0;
                $cogs = ($cost !== null && $cost > 0) ? $cost * $cv : null;
                $netProfit = ($cogs !== null) ? round($rv - $cogs - $sp, 2) : null;
                $profitRoi = ($netProfit !== null && $sp > 0) ? round($netProfit / $sp * 100, 1) : null;
                $bRoas = (float)($bench[$ch]['roas'] ?? 3.0); if ($bRoas <= 0) $bRoas = 3.0;
                $action = 'monitor'; $reason = '';
                if ($sp > 0 && $cv === 0) { $action = 'decrease'; $reason = '지출 발생·전환 0 → 감액/중단'; }
                elseif ($profitRoi !== null) {
                    if ($profitRoi > 15 && $roas !== null && $roas >= $bRoas * 1.05) { $action = 'increase'; $reason = '순이익ROI +' . $profitRoi . '% · ROAS ' . $roas . 'x ≥ 벤치 ' . $bRoas . 'x'; }
                    elseif ($profitRoi < 0) { $action = 'decrease'; $reason = '순이익ROI ' . $profitRoi . '% (손실)'; }
                    else { $action = 'monitor'; $reason = '순이익ROI ' . $profitRoi . '%'; }
                } elseif ($roas !== null) {
                    if ($roas >= $bRoas * 1.1) { $action = 'increase'; $reason = 'ROAS ' . $roas . 'x ≥ 벤치 ' . $bRoas . 'x (원가 미등록=ROAS기준)'; }
                    elseif ($roas < $bRoas * 0.7) { $action = 'decrease'; $reason = 'ROAS ' . $roas . 'x < 벤치 ' . $bRoas . 'x'; }
                    else { $action = 'monitor'; $reason = 'ROAS ' . $roas . 'x'; }
                } else { $action = 'monitor'; $reason = '데이터 부족'; }
                $products[$sku]['cells'][$ch] = ['spend'=>round($sp,2),'revenue'=>round($rv,2),'roas'=>$roas,'conversions'=>$cv,'cac'=>$cac,'impressions'=>$im,'clicks'=>$ck,'ctr'=>$ctr,'cogs'=>$cogs !== null ? round($cogs,2) : null,'net_profit'=>$netProfit,'profit_roi'=>$profitRoi,'action'=>$action,'reason'=>$reason];
                $products[$sku]['total']['spend'] += $sp; $products[$sku]['total']['revenue'] += $rv; $products[$sku]['total']['conversions'] += $cv; if ($netProfit !== null) $products[$sku]['total']['net_profit'] += $netProfit;
                $channelsSeen[$ch] = true;
            }
        } catch (\Throwable $e) { /* 빈 결과(정직) */ }
        $list = array_values($products);
        foreach ($list as &$p) {
            $t = $p['total']; $best = null; $bestv = -INF;
            foreach ($p['cells'] as $ch => $c) { $v = $c['profit_roi'] !== null ? $c['profit_roi'] : ($c['roas'] !== null ? $c['roas'] * 10 : -INF); if ($c['action'] === 'increase' && $v > $bestv) { $bestv = $v; $best = $ch; } }
            $p['recommend_channel'] = $best;
            $p['total']['roas'] = $t['spend'] > 0 ? round($t['revenue'] / $t['spend'], 2) : null;
            $p['total']['spend'] = round($t['spend'], 2); $p['total']['revenue'] = round($t['revenue'], 2); $p['total']['net_profit'] = round($t['net_profit'], 2);
        } unset($p);
        usort($list, fn($a, $b) => ($b['total']['net_profit'] <=> $a['total']['net_profit']));
        $benchOut = []; foreach ($bench as $k => $v) $benchOut[$k] = ['roas' => (float)($v['roas'] ?? 0)];
        return TemplateResponder::json($res, ['ok'=>true,'period'=>$period,'n'=>$n,'count'=>count($list),'channels'=>array_keys($channelsSeen),'benchmark'=>$benchOut,'products'=>$list]);
    }

    private static function realSkuRows(string $tenant, string $period, array $dates): array {
        try {
            $pdo = Db::pdo();
            $start = self::rangeStart($dates);
            $stmt = $pdo->prepare(
                // [현 차수] ★MAX() 집계함수 + GROUP BY 부재 → MySQL이 전체를 1행으로 암묵집계해 SKU 롤업이
                //   0/1행만 반환하던 선재 버그. 행별 컬럼 직접 select(아래 루프가 sku 단위로 그룹핑).
                "SELECT sku, product_name AS name, channel, ordered_at, qty, total_price, status, event_type
                   FROM channel_orders
                  WHERE tenant_id = ? AND sku IS NOT NULL AND sku <> '' AND ordered_at >= ?"
            );
            $stmt->execute([$tenant, $start]);
            $by = [];
            while ($r = $stmt->fetch(\PDO::FETCH_ASSOC)) {
                $bucket = self::bucketLabel((string)($r['ordered_at'] ?? ''), $period);
                if ($bucket === '' || !in_array($bucket, $dates, true)) continue;
                $sku = (string)$r['sku'];
                if (!isset($by[$sku])) $by[$sku] = ['name'=>(string)($r['name'] ?? $sku), 'channel'=>(string)($r['channel'] ?? ''), 'buckets'=>[]];
                if (!isset($by[$sku]['buckets'][$bucket])) $by[$sku]['buckets'][$bucket] = ['orders'=>0, 'revenue'=>0.0, 'returns'=>0];
                $qty = (int)($r['qty'] ?? 0); $price = (float)($r['total_price'] ?? 0);
                $ev = (string)($r['event_type'] ?? 'order'); $st = (string)($r['status'] ?? '');
                // [현 차수] 취소주문은 매출·주문수에서 제외(프론트 대시보드 정합). 반품은 매출 포함·반품률만 카운트.
                if (self::isCancel($ev, $st)) continue;
                // [현 차수] 감사 P1: 주문수=주문 건수(orderStats 캐논). orders/returns 모두 건수로 통일해
                //   total_orders 과대·객단가 과소를 해소하고 return_rate(반품률)를 주문 기준으로 일관화.
                $by[$sku]['buckets'][$bucket]['orders'] += 1;
                $by[$sku]['buckets'][$bucket]['revenue'] += $price;
                if (self::isReturn($ev, $st)) $by[$sku]['buckets'][$bucket]['returns'] += 1;
            }
            $rows = [];
            foreach ($by as $sku => $info) {
                $series = [];
                foreach ($dates as $d) {
                    $b = $info['buckets'][$d] ?? ['orders'=>0, 'revenue'=>0.0, 'returns'=>0];
                    // [현 차수 P2] 반품률 분모=orders(총주문). 반품은 별도 행이 아니라 기존 주문의 상태변경이라
                    //   orders 에 이미 포함 → (orders+returns) 는 반품 이중계수(OrderHub SSOT 12% vs 여기 10.7% 불일치).
                    $series[] = ['date'=>$d, 'orders'=>$b['orders'], 'returns'=>$b['returns'], 'revenue'=>round($b['revenue'],2), 'spend'=>0, 'net_payout'=>round($b['revenue'],2), 'roas'=>0, 'return_rate'=>$b['orders'] > 0 ? round($b['returns']/$b['orders']*100,1) : 0];
                }
                $rows[] = self::skuRowFromSeries($sku, $info['name'], $info['channel'], 0, $series);
            }
            return $rows;
        } catch (\Throwable $e) { return []; }
    }

    private static function skuRowFromSeries(string $id, string $name, string $platform, $price, array $series): array {
        $totalRev = array_sum(array_column($series, 'revenue'));
        $totalSpe = array_sum(array_column($series, 'spend'));
        $totalOrd = array_sum(array_column($series, 'orders'));
        $totalRet = array_sum(array_column($series, 'returns')); // [현 차수] volume 가중 반품률(ratio-of-sums)용
        $retDenom = $totalOrd; // [현 차수 P2] 분모=총주문(반품 이미 포함) — OrderHub SSOT·productPerformance 와 일치
        return [
            'sku_id'=>$id, 'name'=>$name, 'platform'=>$platform, 'unit_price'=>$price,
            'avg_roas'=>$totalSpe > 0 ? round($totalRev/$totalSpe,2) : 0,
            'total_revenue'=>$totalRev, 'total_spend'=>$totalSpe,
            'total_orders'=>$totalOrd,
            // [현 차수] avg_return_rate ratio-of-sums(형제 avg_roas 와 대칭) — 기존 average-of-ratios 는 저볼륨 버킷이
            //   허위 고반품률 경보(top_skus ≥12% 임계) 유발. 정본 = SUM(returns)/SUM(orders+returns).
            'avg_return_rate'=>$retDenom > 0 ? round($totalRet/$retDenom*100,1) : 0,
            'series'=>$series,
        ];
    }

    // ── 2. Campaign Rollup ─────────────────────────────────────────────────
    public static function campaign(Request $req, Response $res, array $args = []): Response {
        $q = $req->getQueryParams();
        $period = $q['period'] ?? 'daily';
        $n = self::nRange($period, (int)($q['n'] ?? 0), 14);
        $scale = self::periodScale($period);
        $dates = self::dates($period, $n);
        $tenant = self::tenantOf($req);
        $rows = self::realCampaignRows($tenant, $period, $dates);
        usort($rows, fn($a, $b) => $b['total_revenue'] <=> $a['total_revenue']);
        return TemplateResponder::json($res, [
            'ok' => true, 'version' => 'v423', 'dimension' => 'campaign',
            'period' => $period, 'n' => $n, 'dates' => $dates, 'rows' => $rows,
        ]);
    }

    /** 실 테넌트: performance_metrics 에서 campaign_ext_id(없으면 channel)별 집계. */
    private static function realCampaignRows(string $tenant, string $period, array $dates): array {
        try {
            $pdo = Db::pdo();
            $start = self::rangeStart($dates);
            // [225차 P2-1] MAX(channel) 집계를 GROUP BY 없이 비집계 컬럼과 혼용 → MySQL ONLY_FULL_GROUP_BY
            //   throw → catch → 빈 롤업이었다. 집계는 아래 PHP 버킷에서 하므로 raw 행만 조회(집계 제거).
            $stmt = $pdo->prepare(
                "SELECT COALESCE(NULLIF(campaign_ext_id,''), channel) AS cid, channel, date, spend, impressions, clicks, conversions, revenue
                   FROM performance_metrics WHERE tenant_id = ? AND date >= ?"
            );
            $stmt->execute([$tenant, substr($start, 0, 10)]);
            $by = [];
            while ($r = $stmt->fetch(\PDO::FETCH_ASSOC)) {
                $bucket = self::bucketLabel((string)($r['date'] ?? ''), $period);
                if ($bucket === '' || !in_array($bucket, $dates, true)) continue;
                $cid = (string)($r['cid'] ?? 'unknown');
                if (!isset($by[$cid])) $by[$cid] = ['channel'=>(string)($r['channel'] ?? ''), 'buckets'=>[]];
                if (!isset($by[$cid]['buckets'][$bucket])) $by[$cid]['buckets'][$bucket] = ['spend'=>0.0,'imp'=>0,'clk'=>0,'conv'=>0,'rev'=>0.0];
                $b =& $by[$cid]['buckets'][$bucket];
                $b['spend'] += (float)($r['spend'] ?? 0); $b['imp'] += (int)($r['impressions'] ?? 0);
                $b['clk'] += (int)($r['clicks'] ?? 0); $b['conv'] += (int)($r['conversions'] ?? 0); $b['rev'] += (float)($r['revenue'] ?? 0);
                unset($b);
            }
            $rows = [];
            foreach ($by as $cid => $info) {
                $series = [];
                foreach ($dates as $d) {
                    $b = $info['buckets'][$d] ?? ['spend'=>0,'imp'=>0,'clk'=>0,'conv'=>0,'rev'=>0];
                    $series[] = self::campaignSeriesPoint($d, round($b['spend'],2), $b['imp'], $b['clk'], $b['conv'], round($b['rev'],2));
                }
                $rows[] = self::campaignRowFromSeries($cid, $cid, $info['channel'], $series);
            }
            return $rows;
        } catch (\Throwable $e) { return []; }
    }

    private static function campaignSeriesPoint(string $d, $s, $i, $c, $v, $r): array {
        return ['date'=>$d, 'spend'=>$s, 'impressions'=>$i, 'clicks'=>$c, 'conversions'=>$v, 'revenue'=>$r,
            'ctr'=>$i > 0 ? round($c/$i*100,2) : 0, 'cpc'=>$c > 0 ? round($s/$c) : 0, 'cpa'=>$v > 0 ? round($s/$v) : 0, 'roas'=>$s > 0 ? round($r/$s,2) : 0];
    }
    private static function campaignRowFromSeries(string $id, string $name, string $platform, array $series): array {
        $totS = array_sum(array_column($series, 'spend')); $totR = array_sum(array_column($series, 'revenue')); $totV = array_sum(array_column($series, 'conversions'));
        return ['campaign_id'=>$id, 'name'=>$name, 'platform'=>$platform, 'total_spend'=>$totS, 'total_revenue'=>$totR, 'total_conversions'=>$totV,
            'avg_roas'=>$totS > 0 ? round($totR/$totS,2) : 0, 'avg_cpa'=>$totV > 0 ? round($totS/$totV) : 0, 'series'=>$series];
    }

    // ── 3. Creator Rollup ──────────────────────────────────────────────────
    //   실 테넌트는 백엔드 크리에이터 적재원이 없어 빈 결과(정직). 데모만 가상.
    public static function creator(Request $req, Response $res, array $args = []): Response {
        $q = $req->getQueryParams();
        $period = $q['period'] ?? 'weekly';
        $n = self::nRange($period, (int)($q['n'] ?? 0), 8);
        $scale = self::periodScale($period);
        $dates = self::dates($period, $n);
        // 204차: 실 테넌트는 백엔드 크리에이터 적재원이 없어 빈 결과(정직). 데모는 프론트가 creators 시드에서 파생.
        self::tenantOf($req);
        return TemplateResponder::json($res, [
            'ok' => true, 'version' => 'v423', 'dimension' => 'creator',
            'period' => $period, 'n' => $n, 'dates' => $dates, 'rows' => [],
        ]);
    }

    // ── 4. Platform Rollup ─────────────────────────────────────────────────
    public static function platform(Request $req, Response $res, array $args = []): Response {
        $q = $req->getQueryParams();
        $period = $q['period'] ?? 'daily';
        $n = self::nRange($period, (int)($q['n'] ?? 0), 14);
        $scale = self::periodScale($period);
        $dates = self::dates($period, $n);
        $tenant = self::tenantOf($req);
        $rows = self::realPlatformRows($tenant, $period, $dates);
        usort($rows, fn($a, $b) => $b['total_revenue'] <=> $a['total_revenue']);
        return TemplateResponder::json($res, [
            'ok' => true, 'version' => 'v423', 'dimension' => 'platform',
            'period' => $period, 'n' => $n, 'dates' => $dates, 'rows' => $rows,
        ]);
    }

    /** 실 테넌트: performance_metrics(광고 spend/rev/imp/clk) + channel_orders(주문수) 를 채널별 결합. */
    private static function realPlatformRows(string $tenant, string $period, array $dates): array {
        try {
            $pdo = Db::pdo();
            $start = self::rangeStart($dates);
            $by = [];
            $mk = function(&$by, $pf, $bucket) { if (!isset($by[$pf])) $by[$pf]=[]; if (!isset($by[$pf][$bucket])) $by[$pf][$bucket]=['spend'=>0.0,'rev'=>0.0,'ord'=>0,'imp'=>0,'clk'=>0]; };
            // 광고 메트릭
            // [227차 P0] conversions 추가 — 운영 CVR/전환수가 channelBudgets 에 미배선되어 DashMarketing 운영
            //   CVR 이 stub-zero 였다. performance_metrics 의 conversions 를 플랫폼 series 에 배선.
            $pm = $pdo->prepare("SELECT channel, date, spend, revenue, impressions, clicks, conversions FROM performance_metrics WHERE tenant_id = ? AND date >= ?");
            $pm->execute([$tenant, substr($start,0,10)]);
            while ($r = $pm->fetch(\PDO::FETCH_ASSOC)) {
                $bucket = self::bucketLabel((string)$r['date'], $period); if ($bucket==='' || !in_array($bucket,$dates,true)) continue;
                // 209차: 플랫폼키 lowercase 정규화(채널주문 loop의 ucfirst 와 불일치해 naver/Naver 중복행
                //   생기던 버그). 광고매출(revenue)은 주문매출과 별개 → rev 에 합산하지 않음(주석 의도대로
                //   매출=주문 기준). 광고기여 revenue 는 ad_rev 로 분리 보관(필요 시 노출용).
                $pf = strtolower((string)($r['channel'] ?? 'unknown')); $mk($by,$pf,$bucket);
                $by[$pf][$bucket]['spend'] += (float)($r['spend'] ?? 0); $by[$pf][$bucket]['ad_rev'] = ($by[$pf][$bucket]['ad_rev'] ?? 0) + (float)($r['revenue'] ?? 0);
                $by[$pf][$bucket]['imp'] += (int)($r['impressions'] ?? 0); $by[$pf][$bucket]['clk'] += (int)($r['clicks'] ?? 0);
                $by[$pf][$bucket]['conv'] = ($by[$pf][$bucket]['conv'] ?? 0) + (int)($r['conversions'] ?? 0);
            }
            // 채널 주문(판매 매출·주문수) — 광고매출과 별개. 매출은 주문 기준으로 보정.
            $co = $pdo->prepare("SELECT channel, ordered_at, qty, total_price, status, event_type FROM channel_orders WHERE tenant_id = ? AND ordered_at >= ?");
            $co->execute([$tenant, $start]);
            while ($r = $co->fetch(\PDO::FETCH_ASSOC)) {
                $bucket = self::bucketLabel((string)($r['ordered_at'] ?? ''), $period); if ($bucket==='' || !in_array($bucket,$dates,true)) continue;
                // [현 차수] 취소주문은 채널 매출·주문수에서 제외(프론트/SKU 롤업 정합).
                if (self::isCancel((string)($r['event_type'] ?? 'order'), (string)($r['status'] ?? ''))) continue;
                $pf = strtolower((string)($r['channel'] ?? 'unknown')); $mk($by,$pf,$bucket);
                // [현 차수] 감사 P1: 주문수=주문 건수(orderStats.count 캐논). 기존 qty 합산은 멀티수량 주문을
                //   과대계상해 total_orders 과대·revenue_per_order(객단가) 과소를 유발했다.
                $by[$pf][$bucket]['ord'] += 1; $by[$pf][$bucket]['rev'] += (float)($r['total_price'] ?? 0);
            }
            $rows = [];
            $palette = ['#22c55e','#f59e0b','#ff9900','#ff0050','#4f8ef7','#a855f7','#ec4899','#14b8a6'];
            $ci = 0;
            foreach ($by as $pf => $buckets) {
                $series = [];
                foreach ($dates as $d) {
                    $b = $buckets[$d] ?? ['spend'=>0,'rev'=>0,'ord'=>0,'imp'=>0,'clk'=>0,'conv'=>0];
                    $series[] = self::platformSeriesPoint($d, round($b['spend'],2), round($b['rev'],2), $b['ord'], $b['imp'], $b['clk'], round($b['ad_rev'] ?? 0, 2), (int)($b['conv'] ?? 0));
                }
                $rows[] = self::platformRowFromSeries($pf, $palette[$ci++ % count($palette)], $series);
            }
            // [266차 계약불일치] 매출 점유율(share, %) 파생 — 프론트 by-platform 테이블 '점유율' 컬럼(fc.pct(r.share)=toFixed(1)+'%')이
            //   share 미반환으로 항상 '-' 였다. 플랫폼별 total_revenue / 전체합 × 100.
            $shareTot = array_sum(array_column($rows, 'total_revenue'));
            foreach ($rows as &$rw) { $rw['share'] = $shareTot > 0 ? round($rw['total_revenue'] / $shareTot * 100, 1) : 0; }
            unset($rw);
            return $rows;
        } catch (\Throwable $e) { return []; }
    }

    private static function platformSeriesPoint(string $d, $s, $r, $o, $i, $c, $ar = 0, $v = 0): array {
        // [현 차수] ★ROAS 채널키 미스매치 수정: ROAS 분자=광고기여 전환매출(ad_rev=performance_metrics.revenue),
        //   주문매출($r)이 아니다. 기존엔 광고비(meta/google)와 주문매출(coupang/naver)을 채널명으로 조인해
        //   광고채널은 주문 0→ROAS 0, 판매채널은 광고비 0→ROAS 0 이었다. 진짜 ROAS = 광고기여매출/광고비.
        // [227차 P0] conversions($v) 배선 + cvr(전환/클릭). 운영 CVR stub-zero 해소.
        return ['date'=>$d, 'spend'=>$s, 'revenue'=>$r, 'ad_rev'=>$ar, 'orders'=>$o, 'impressions'=>$i, 'clicks'=>$c, 'conversions'=>$v,
            'roas'=>$s > 0 ? round($ar/$s,2) : 0, 'ctr'=>$i > 0 ? round($c/$i*100,2) : 0, 'cpc'=>$c > 0 ? round($s/$c) : 0,
            'cvr'=>$c > 0 ? round($v/$c*100,2) : 0];
    }
    private static function platformRowFromSeries(string $pf, string $color, array $series): array {
        $totS = array_sum(array_column($series, 'spend')); $totR = array_sum(array_column($series, 'revenue'));
        $totAr = array_sum(array_column($series, 'ad_rev'));
        $totC = array_sum(array_column($series, 'clicks')); $totV = array_sum(array_column($series, 'conversions'));
        return ['platform'=>ucfirst($pf), 'color'=>$color, 'total_spend'=>$totS, 'total_revenue'=>$totR, 'total_ad_rev'=>$totAr,
            'total_orders'=>array_sum(array_column($series, 'orders')), 'total_impressions'=>array_sum(array_column($series, 'impressions')),
            'total_clicks'=>$totC, 'total_conversions'=>$totV, 'avg_roas'=>$totS > 0 ? round($totAr/$totS,2) : 0,
            'avg_cvr'=>$totC > 0 ? round($totV/$totC*100,2) : 0, 'series'=>$series];
    }

    /** dates 라벨의 가장 이른 시점 → 'YYYY-MM-DD…' 시작 경계. */
    private static function rangeStart(array $dates): string {
        if (!$dates) return gmdate('Y-m-d', strtotime('-90 days'));
        $first = (string)$dates[0];
        // 라벨 형태별 시작일 추정
        if (preg_match('/^(\d{4})-W(\d{2})$/', $first, $mm)) { return gmdate('Y-m-d', strtotime($mm[1] . '-01-01 +' . ((int)$mm[2]-1) . ' weeks')); }
        if (preg_match('/^(\d{4})-Q(\d)$/', $first, $mm))     { return sprintf('%04d-%02d-01', (int)$mm[1], ((int)$mm[2]-1)*3 + 1); }
        if (preg_match('/^(\d{4})-(\d{2})$/', $first))         { return $first . '-01'; }
        if (preg_match('/^(\d{4})$/', $first))                 { return $first . '-01-01'; }
        return $first; // daily Y-m-d
    }

    // ── 5. Summary ─────────────────────────────────────────────────────────
    public static function summary(Request $req, Response $res, array $args = []): Response {
        $q = $req->getQueryParams();
        $period = $q['period'] ?? 'daily';
        $n = self::nRange($period, (int)($q['n'] ?? 0), 14);
        $dates = self::dates($period, $n);
        $tenant = self::tenantOf($req);

        // 플랫폼/SKU 실집계를 재사용해 KPI/by_platform/top_skus 파생(데모는 프론트 파생).
        $platformRows = self::realPlatformRows($tenant, $period, $dates);
        $skuRows = self::realSkuRows($tenant, $period, $dates);

        $totalRev = array_sum(array_column($platformRows, 'total_revenue'));
        $totalSpend = array_sum(array_column($platformRows, 'total_spend'));
        // [225차 P2-1] avg_roas 정본화: 광고기여매출(total_ad_rev) 분자 사용(per-platform ROAS 와 일관).
        //   기존 totalRev(총매출)/spend 는 광고 외 매출까지 포함해 ROAS 과대 발산이었다.
        $totalAdRev = array_sum(array_column($platformRows, 'total_ad_rev'));
        $totalOrders = array_sum(array_column($platformRows, 'total_orders'));
        if ($totalOrders === 0) $totalOrders = (int)array_sum(array_column($skuRows, 'total_orders'));
        if ($totalRev == 0) $totalRev = array_sum(array_column($skuRows, 'total_revenue'));

        $byPlatform = [];
        foreach ($platformRows as $p) $byPlatform[$p['platform']] = $p['total_revenue'];
        usort($skuRows, fn($a, $b) => $b['total_revenue'] <=> $a['total_revenue']);
        // [266차 계약불일치] top_skus 에 roas 포함(프론트 s.roas 소비·데모 rollupDemoDerive 는 이미 포함이라 운영만 빈값이었음).
        $topSkus = array_map(fn($s) => ['sku_id'=>$s['sku_id'], 'name'=>$s['name'], 'revenue'=>$s['total_revenue'], 'orders'=>$s['total_orders'], 'roas'=>round($s['avg_roas'] ?? 0, 2), 'return_rate'=>$s['avg_return_rate']], array_slice($skuRows, 0, 8));

        // 실 alert: 반품률 임계(>=12%) 또는 ROAS 미달 SKU 파생
        $alerts = [];
        foreach (array_slice($skuRows, 0, 20) as $s) {
            if (($s['avg_return_rate'] ?? 0) >= 12) $alerts[] = ['type'=>'warn', 'dimension'=>'sku', 'id'=>$s['sku_id'], 'msg'=>$s['name'] . ' 반품률 ' . $s['avg_return_rate'] . '%'];
        }

        return TemplateResponder::json($res, [
            'ok' => true, 'version' => 'v423', 'dimension' => 'summary',
            'period' => $period, 'n' => $n,
            'kpi' => [
                'total_revenue'   => $totalRev,
                'total_spend'     => $totalSpend,
                'total_orders'    => $totalOrders,
                'avg_roas'        => $totalSpend > 0 ? round($totalAdRev / $totalSpend, 2) : 0,
                'revenue_per_order' => $totalOrders > 0 ? round($totalRev / $totalOrders) : 0,
            ],
            'by_platform' => $byPlatform,
            'top_skus'    => $topSkus,
            'alerts'      => $alerts,
        ]);
    }
}
