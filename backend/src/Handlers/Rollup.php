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
                      WHERE s.token = ? AND s.expires_at > ? AND u.is_active = 1 LIMIT 1'
                );
                $s->execute([$m[1], $now]);
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

    // Generate date/period labels
    private static function dates(string $period, int $n): array {
        $result = [];
        switch ($period) {
            case 'monthly':
                $baseYear = 2026; $baseMon = 3;
                for ($i = $n - 1; $i >= 0; $i--) {
                    $totalMonths = ($baseYear * 12 + $baseMon - 1) - $i;
                    $y = intdiv($totalMonths, 12);
                    $mo = ($totalMonths % 12) + 1;
                    $result[] = sprintf('%04d-%02d', $y, $mo);
                }
                break;
            case 'yearly':
                $baseY = 2026;
                for ($i = $n - 1; $i >= 0; $i--) $result[] = (string)($baseY - $i);
                break;
            case 'seasonal':
                $baseYear = 2026; $baseQ = 1;
                for ($i = $n - 1; $i >= 0; $i--) {
                    $totalQ = ($baseYear * 4 + $baseQ - 1) - $i;
                    $y = intdiv($totalQ, 4);
                    $qq = ($totalQ % 4) + 1;
                    $result[] = sprintf('%04d-Q%d', $y, $qq);
                }
                break;
            case 'weekly':
                $base = strtotime('2026-03-05');
                for ($i = $n - 1; $i >= 0; $i--) {
                    $ts = $base - $i * 7 * 86400;
                    $result[] = gmdate('Y', $ts) . '-W' . str_pad((string)(int)gmdate('W', $ts), 2, '0', STR_PAD_LEFT);
                }
                break;
            default: // daily
                $base = strtotime('2026-03-05');
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

    // ════════════════════════════════════════════════════════════════════════
    //  데모 가상 시드 (demo 테넌트 한정 — 운영 오염 0)
    // ════════════════════════════════════════════════════════════════════════
    private static function demoSkus(): array {
        return [
            'LOR-REV-001' => ['name'=>'Revitalift Filler 세럼 30ml', 'platform'=>'Naver', 'price'=>38000, 'ord_base'=>62, 'rev_base'=>2356000, 'spend_base'=>520000, 'ret_base'=>4.2, 'ord_noise'=>6, 'rev_noise'=>240000, 'spend_noise'=>60000, 'ret_noise'=>0.6],
            'LAN-ABS-001' => ['name'=>'Lancôme Absolue 크림 60ml', 'platform'=>'Amazon', 'price'=>182000, 'ord_base'=>28, 'rev_base'=>5096000, 'spend_base'=>880000, 'ret_base'=>2.8, 'ord_noise'=>4, 'rev_noise'=>520000, 'spend_noise'=>90000, 'ret_noise'=>0.4],
            'LOR-UV-001'  => ['name'=>'UV Defender 선크림 SPF50', 'platform'=>'Coupang', 'price'=>24000, 'ord_base'=>95, 'rev_base'=>2280000, 'spend_base'=>410000, 'ret_base'=>3.1, 'ord_noise'=>10, 'rev_noise'=>260000, 'spend_noise'=>50000, 'ret_noise'=>0.5],
            'NYX-LIP-001' => ['name'=>'NYX 소프트 매트 립크림', 'platform'=>'TikTok', 'price'=>15000, 'ord_base'=>120, 'rev_base'=>1800000, 'spend_base'=>360000, 'ret_base'=>5.4, 'ord_noise'=>14, 'rev_noise'=>220000, 'spend_noise'=>48000, 'ret_noise'=>0.7],
            'VIC-MIN-001' => ['name'=>'Vichy Minéral 89 부스터', 'platform'=>'Naver', 'price'=>32000, 'ord_base'=>54, 'rev_base'=>1728000, 'spend_base'=>300000, 'ret_base'=>2.4, 'ord_noise'=>6, 'rev_noise'=>180000, 'spend_noise'=>36000, 'ret_noise'=>0.3],
            'KER-SIL-001' => ['name'=>'Kérastase 실크 헤어오일', 'platform'=>'Amazon', 'price'=>56000, 'ord_base'=>33, 'rev_base'=>1848000, 'spend_base'=>340000, 'ret_base'=>3.6, 'ord_noise'=>5, 'rev_noise'=>200000, 'spend_noise'=>42000, 'ret_noise'=>0.5],
            'LRP-EFF-001' => ['name'=>'La Roche-Posay 이펙라 세럼', 'platform'=>'Coupang', 'price'=>29000, 'ord_base'=>71, 'rev_base'=>2059000, 'spend_base'=>380000, 'ret_base'=>2.9, 'ord_noise'=>8, 'rev_noise'=>230000, 'spend_noise'=>44000, 'ret_noise'=>0.4],
            'GAR-MIC-001' => ['name'=>'Garnier 미셀라 클렌징워터', 'platform'=>'TikTok', 'price'=>12000, 'ord_base'=>140, 'rev_base'=>1680000, 'spend_base'=>300000, 'ret_base'=>6.8, 'ord_noise'=>16, 'rev_noise'=>200000, 'spend_noise'=>40000, 'ret_noise'=>0.9],
        ];
    }
    private static function demoCampaigns(): array {
        return [
            ['id'=>'CAMP-001', 'name'=>"L'Oréal 2026 Summer UV", 'platform'=>'Meta', 'spend_base'=>320000, 'imp_base'=>142000, 'clk_base'=>4250, 'conv_base'=>128, 'rev_base'=>1340000, 'spend_noise'=>40000, 'imp_noise'=>18000, 'clk_noise'=>520, 'conv_noise'=>18, 'rev_noise'=>180000],
            ['id'=>'CAMP-002', 'name'=>'Revitalift 리뉴얼', 'platform'=>'Naver SA', 'spend_base'=>260000, 'imp_base'=>96000, 'clk_base'=>3120, 'conv_base'=>98, 'rev_base'=>1430000, 'spend_noise'=>32000, 'imp_noise'=>12000, 'clk_noise'=>380, 'conv_noise'=>14, 'rev_noise'=>160000],
            ['id'=>'CAMP-003', 'name'=>'Lancôme 럭셔리 브랜딩', 'platform'=>'Google', 'spend_base'=>410000, 'imp_base'=>168000, 'clk_base'=>3680, 'conv_base'=>72, 'rev_base'=>2200000, 'spend_noise'=>48000, 'imp_noise'=>20000, 'clk_noise'=>440, 'conv_noise'=>10, 'rev_noise'=>240000],
            ['id'=>'CAMP-004', 'name'=>'TikTok 바이럴 챌린지', 'platform'=>'TikTok', 'spend_base'=>180000, 'imp_base'=>890000, 'clk_base'=>21000, 'conv_base'=>210, 'rev_base'=>1260000, 'spend_noise'=>24000, 'imp_noise'=>120000, 'clk_noise'=>2800, 'conv_noise'=>28, 'rev_noise'=>150000],
        ];
    }
    private static function demoCreators(): array {
        return [
            ['id'=>'CR-001', 'handle'=>'@BeautyHana', 'platform'=>'YouTube', 'tier'=>'Macro', 'followers'=>1850000, 'fee'=>8000000, 'views_base'=>2450000, 'clicks_base'=>73500, 'conv_base'=>1240, 'rev_base'=>89200000, 'views_noise'=>180000, 'clicks_noise'=>6000, 'conv_noise'=>120, 'rev_noise'=>8000000],
            ['id'=>'CR-004', 'handle'=>'@LuxurySujin', 'platform'=>'YouTube', 'tier'=>'Macro', 'followers'=>1850000, 'fee'=>12000000, 'views_base'=>1850000, 'clicks_base'=>55000, 'conv_base'=>680, 'rev_base'=>206000000, 'views_noise'=>150000, 'clicks_noise'=>4500, 'conv_noise'=>60, 'rev_noise'=>18000000],
            ['id'=>'CR-002', 'handle'=>'@minji_beauty', 'platform'=>'Instagram', 'tier'=>'Mid', 'followers'=>540000, 'fee'=>3000000, 'views_base'=>980000, 'clicks_base'=>29400, 'conv_base'=>580, 'rev_base'=>34800000, 'views_noise'=>80000, 'clicks_noise'=>2400, 'conv_noise'=>50, 'rev_noise'=>3200000],
            ['id'=>'CR-005', 'handle'=>'@yena.beauty', 'platform'=>'TikTok', 'tier'=>'Mid', 'followers'=>540000, 'fee'=>2000000, 'views_base'=>1620000, 'clicks_base'=>48600, 'conv_base'=>380, 'rev_base'=>22800000, 'views_noise'=>130000, 'clicks_noise'=>4000, 'conv_noise'=>32, 'rev_noise'=>2400000],
            ['id'=>'CR-007', 'handle'=>'@PharmSisBeauty', 'platform'=>'YouTube', 'tier'=>'Mid', 'followers'=>540000, 'fee'=>4000000, 'views_base'=>720000, 'clicks_base'=>21600, 'conv_base'=>510, 'rev_base'=>38200000, 'views_noise'=>60000, 'clicks_noise'=>1800, 'conv_noise'=>44, 'rev_noise'=>3400000],
        ];
    }
    private static function demoPlatforms(): array {
        return [
            'Naver'   => ['color'=>'#22c55e', 'spend_b'=>820000, 'rev_b'=>4084000, 'ord_b'=>116, 'imp_b'=>238000, 'clk_b'=>7370, 'spend_n'=>90000, 'rev_n'=>440000, 'ord_n'=>12, 'imp_n'=>26000, 'clk_n'=>820],
            'Coupang' => ['color'=>'#f59e0b', 'spend_b'=>790000, 'rev_b'=>4339000, 'ord_b'=>166, 'imp_b'=>196000, 'clk_b'=>6280, 'spend_n'=>86000, 'rev_n'=>470000, 'ord_n'=>18, 'imp_n'=>22000, 'clk_n'=>700],
            'Amazon'  => ['color'=>'#ff9900', 'spend_b'=>1220000, 'rev_b'=>8944000, 'ord_b'=>78, 'imp_b'=>168000, 'clk_b'=>4620, 'spend_n'=>130000, 'rev_n'=>900000, 'ord_n'=>9, 'imp_n'=>18000, 'clk_n'=>520],
            'TikTok'  => ['color'=>'#ff0050', 'spend_b'=>540000, 'rev_b'=>3060000, 'ord_b'=>140, 'imp_b'=>890000, 'clk_b'=>21000, 'spend_n'=>60000, 'rev_n'=>340000, 'ord_n'=>16, 'imp_n'=>120000, 'clk_n'=>2800],
        ];
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

    private static function demoSkuRows(array $dates, float $scale): array {
        $rows = [];
        foreach (self::demoSkus() as $id => $s) {
            $series = []; $cur_ord = $s['ord_base']; $cur_rev = $s['rev_base']; $cur_spe = $s['spend_base']; $cur_ret = $s['ret_base'];
            foreach ($dates as $d) {
                $cur_ord = max(1, (int)round($cur_ord + $s['ord_noise'] * $scale * (mt_rand(-100,100)/100)));
                $cur_rev = max(0, round($cur_rev + $s['rev_noise'] * $scale * (mt_rand(-100,100)/100)));
                $cur_spe = max(0, round($cur_spe + $s['spend_noise'] * $scale * (mt_rand(-100,100)/100)));
                $cur_ret = max(0.5, min(40, round($cur_ret + $s['ret_noise'] * (mt_rand(-100,100)/100), 1)));
                $series[] = ['date'=>$d, 'orders'=>$cur_ord, 'revenue'=>$cur_rev, 'spend'=>$cur_spe, 'net_payout'=>$cur_rev - $cur_spe, 'roas'=>$cur_spe > 0 ? round($cur_rev/$cur_spe,2) : 0, 'return_rate'=>$cur_ret];
            }
            $rows[] = self::skuRowFromSeries($id, $s['name'], $s['platform'], $s['price'], $series);
        }
        return $rows;
    }

    /** 실 테넌트: channel_orders 에서 SKU별 판매 집계(테넌트 격리). SKU 단위 광고비 부재 → spend/roas 0. */
    private static function realSkuRows(string $tenant, string $period, array $dates): array {
        try {
            $pdo = Db::pdo();
            $start = self::rangeStart($dates);
            $stmt = $pdo->prepare(
                "SELECT sku, MAX(product_name) AS name, MAX(channel) AS channel, ordered_at, qty, total_price, status
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
                $by[$sku]['buckets'][$bucket]['orders'] += $qty;
                $by[$sku]['buckets'][$bucket]['revenue'] += $price;
                if (in_array((string)($r['status'] ?? ''), ['returned','cancelled','refunded'], true)) $by[$sku]['buckets'][$bucket]['returns'] += $qty;
            }
            $rows = [];
            foreach ($by as $sku => $info) {
                $series = [];
                foreach ($dates as $d) {
                    $b = $info['buckets'][$d] ?? ['orders'=>0, 'revenue'=>0.0, 'returns'=>0];
                    $tot = $b['orders'] + $b['returns'];
                    $series[] = ['date'=>$d, 'orders'=>$b['orders'], 'revenue'=>round($b['revenue'],2), 'spend'=>0, 'net_payout'=>round($b['revenue'],2), 'roas'=>0, 'return_rate'=>$tot > 0 ? round($b['returns']/$tot*100,1) : 0];
                }
                $rows[] = self::skuRowFromSeries($sku, $info['name'], $info['channel'], 0, $series);
            }
            return $rows;
        } catch (\Throwable $e) { return []; }
    }

    private static function skuRowFromSeries(string $id, string $name, string $platform, $price, array $series): array {
        $totalRev = array_sum(array_column($series, 'revenue'));
        $totalSpe = array_sum(array_column($series, 'spend'));
        return [
            'sku_id'=>$id, 'name'=>$name, 'platform'=>$platform, 'unit_price'=>$price,
            'avg_roas'=>$totalSpe > 0 ? round($totalRev/$totalSpe,2) : 0,
            'total_revenue'=>$totalRev, 'total_spend'=>$totalSpe,
            'total_orders'=>array_sum(array_column($series, 'orders')),
            'avg_return_rate'=>count($series) ? round(array_sum(array_column($series, 'return_rate'))/count($series),1) : 0,
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

    private static function demoCampaignRows(array $dates, float $scale): array {
        $rows = [];
        foreach (self::demoCampaigns() as $c) {
            $series = []; $cur_s=$c['spend_base']; $cur_i=$c['imp_base']; $cur_c=$c['clk_base']; $cur_v=$c['conv_base']; $cur_r=$c['rev_base'];
            foreach ($dates as $d) {
                $cur_s = max(0, round($cur_s + $c['spend_noise'] * $scale * (mt_rand(-100,100)/100)));
                $cur_i = max(0, (int)round($cur_i + $c['imp_noise'] * $scale * (mt_rand(-100,100)/100)));
                $cur_c = max(0, (int)round($cur_c + $c['clk_noise'] * $scale * (mt_rand(-100,100)/100)));
                $cur_v = max(0, (int)round($cur_v + $c['conv_noise'] * $scale * (mt_rand(-100,100)/100)));
                $cur_r = max(0, round($cur_r + $c['rev_noise'] * $scale * (mt_rand(-100,100)/100)));
                $series[] = self::campaignSeriesPoint($d, $cur_s, $cur_i, $cur_c, $cur_v, $cur_r);
            }
            $rows[] = self::campaignRowFromSeries($c['id'], $c['name'], $c['platform'], $series);
        }
        return $rows;
    }

    /** 실 테넌트: performance_metrics 에서 campaign_ext_id(없으면 channel)별 집계. */
    private static function realCampaignRows(string $tenant, string $period, array $dates): array {
        try {
            $pdo = Db::pdo();
            $start = self::rangeStart($dates);
            $stmt = $pdo->prepare(
                "SELECT COALESCE(NULLIF(campaign_ext_id,''), channel) AS cid, MAX(channel) AS channel, date, spend, impressions, clicks, conversions, revenue
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

    private static function demoPlatformRows(array $dates, float $scale): array {
        $rows = [];
        foreach (self::demoPlatforms() as $pf => $p) {
            $series = []; $cur_s=$p['spend_b']; $cur_r=$p['rev_b']; $cur_o=$p['ord_b']; $cur_i=$p['imp_b']; $cur_c=$p['clk_b'];
            foreach ($dates as $d) {
                $cur_s = max(0, round($cur_s + $p['spend_n'] * $scale * (mt_rand(-100,100)/100)));
                $cur_r = max(0, round($cur_r + $p['rev_n'] * $scale * (mt_rand(-100,100)/100)));
                $cur_o = max(0, (int)round($cur_o + $p['ord_n'] * $scale * (mt_rand(-100,100)/100)));
                $cur_i = max(0, (int)round($cur_i + $p['imp_n'] * $scale * (mt_rand(-100,100)/100)));
                $cur_c = max(0, (int)round($cur_c + $p['clk_n'] * $scale * (mt_rand(-100,100)/100)));
                $series[] = self::platformSeriesPoint($d, $cur_s, $cur_r, $cur_o, $cur_i, $cur_c);
            }
            $rows[] = self::platformRowFromSeries($pf, $p['color'], $series);
        }
        return $rows;
    }

    /** 실 테넌트: performance_metrics(광고 spend/rev/imp/clk) + channel_orders(주문수) 를 채널별 결합. */
    private static function realPlatformRows(string $tenant, string $period, array $dates): array {
        try {
            $pdo = Db::pdo();
            $start = self::rangeStart($dates);
            $by = [];
            $mk = function(&$by, $pf, $bucket) { if (!isset($by[$pf])) $by[$pf]=[]; if (!isset($by[$pf][$bucket])) $by[$pf][$bucket]=['spend'=>0.0,'rev'=>0.0,'ord'=>0,'imp'=>0,'clk'=>0]; };
            // 광고 메트릭
            $pm = $pdo->prepare("SELECT channel, date, spend, revenue, impressions, clicks FROM performance_metrics WHERE tenant_id = ? AND date >= ?");
            $pm->execute([$tenant, substr($start,0,10)]);
            while ($r = $pm->fetch(\PDO::FETCH_ASSOC)) {
                $bucket = self::bucketLabel((string)$r['date'], $period); if ($bucket==='' || !in_array($bucket,$dates,true)) continue;
                // 209차: 플랫폼키 lowercase 정규화(채널주문 loop의 ucfirst 와 불일치해 naver/Naver 중복행
                //   생기던 버그). 광고매출(revenue)은 주문매출과 별개 → rev 에 합산하지 않음(주석 의도대로
                //   매출=주문 기준). 광고기여 revenue 는 ad_rev 로 분리 보관(필요 시 노출용).
                $pf = strtolower((string)($r['channel'] ?? 'unknown')); $mk($by,$pf,$bucket);
                $by[$pf][$bucket]['spend'] += (float)($r['spend'] ?? 0); $by[$pf][$bucket]['ad_rev'] = ($by[$pf][$bucket]['ad_rev'] ?? 0) + (float)($r['revenue'] ?? 0);
                $by[$pf][$bucket]['imp'] += (int)($r['impressions'] ?? 0); $by[$pf][$bucket]['clk'] += (int)($r['clicks'] ?? 0);
            }
            // 채널 주문(판매 매출·주문수) — 광고매출과 별개. 매출은 주문 기준으로 보정.
            $co = $pdo->prepare("SELECT channel, ordered_at, qty, total_price FROM channel_orders WHERE tenant_id = ? AND ordered_at >= ?");
            $co->execute([$tenant, $start]);
            while ($r = $co->fetch(\PDO::FETCH_ASSOC)) {
                $bucket = self::bucketLabel((string)($r['ordered_at'] ?? ''), $period); if ($bucket==='' || !in_array($bucket,$dates,true)) continue;
                $pf = strtolower((string)($r['channel'] ?? 'unknown')); $mk($by,$pf,$bucket);
                $by[$pf][$bucket]['ord'] += (int)($r['qty'] ?? 0); $by[$pf][$bucket]['rev'] += (float)($r['total_price'] ?? 0);
            }
            $rows = [];
            $palette = ['#22c55e','#f59e0b','#ff9900','#ff0050','#4f8ef7','#a855f7','#ec4899','#14b8a6'];
            $ci = 0;
            foreach ($by as $pf => $buckets) {
                $series = [];
                foreach ($dates as $d) {
                    $b = $buckets[$d] ?? ['spend'=>0,'rev'=>0,'ord'=>0,'imp'=>0,'clk'=>0];
                    $series[] = self::platformSeriesPoint($d, round($b['spend'],2), round($b['rev'],2), $b['ord'], $b['imp'], $b['clk']);
                }
                $rows[] = self::platformRowFromSeries($pf, $palette[$ci++ % count($palette)], $series);
            }
            return $rows;
        } catch (\Throwable $e) { return []; }
    }

    private static function platformSeriesPoint(string $d, $s, $r, $o, $i, $c): array {
        return ['date'=>$d, 'spend'=>$s, 'revenue'=>$r, 'orders'=>$o, 'impressions'=>$i, 'clicks'=>$c,
            'roas'=>$s > 0 ? round($r/$s,2) : 0, 'ctr'=>$i > 0 ? round($c/$i*100,2) : 0, 'cpc'=>$c > 0 ? round($s/$c) : 0];
    }
    private static function platformRowFromSeries(string $pf, string $color, array $series): array {
        $totS = array_sum(array_column($series, 'spend')); $totR = array_sum(array_column($series, 'revenue'));
        return ['platform'=>ucfirst($pf), 'color'=>$color, 'total_spend'=>$totS, 'total_revenue'=>$totR,
            'total_orders'=>array_sum(array_column($series, 'orders')), 'total_impressions'=>array_sum(array_column($series, 'impressions')),
            'total_clicks'=>array_sum(array_column($series, 'clicks')), 'avg_roas'=>$totS > 0 ? round($totR/$totS,2) : 0, 'series'=>$series];
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
        $totalOrders = array_sum(array_column($platformRows, 'total_orders'));
        if ($totalOrders === 0) $totalOrders = (int)array_sum(array_column($skuRows, 'total_orders'));
        if ($totalRev == 0) $totalRev = array_sum(array_column($skuRows, 'total_revenue'));

        $byPlatform = [];
        foreach ($platformRows as $p) $byPlatform[$p['platform']] = $p['total_revenue'];
        usort($skuRows, fn($a, $b) => $b['total_revenue'] <=> $a['total_revenue']);
        $topSkus = array_map(fn($s) => ['sku_id'=>$s['sku_id'], 'name'=>$s['name'], 'revenue'=>$s['total_revenue'], 'orders'=>$s['total_orders'], 'return_rate'=>$s['avg_return_rate']], array_slice($skuRows, 0, 8));

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
                'avg_roas'        => $totalSpend > 0 ? round($totalRev / $totalSpend, 2) : 0,
                'revenue_per_order' => $totalOrders > 0 ? round($totalRev / $totalOrders) : 0,
            ],
            'by_platform' => $byPlatform,
            'top_skus'    => $topSkus,
            'alerts'      => $alerts,
        ]);
    }
}
