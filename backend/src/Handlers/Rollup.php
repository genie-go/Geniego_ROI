<?php
declare(strict_types=1);

namespace Genie\Handlers;

use Genie\TemplateResponder;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

/**
 * V423 — Rollup Aggregation Layer
 * SKU / Campaign / Creator / Platform × daily / weekly
 */
final class Rollup {

    // Generate date/period labels
    private static function dates(string $period, int $n): array {
        $result = [];
        // Base reference: 2026-03
        switch ($period) {
            case 'monthly':
                // Returns YYYY-MM labels, going back n months
                $baseYear = 2026; $baseMon = 3;
                for ($i = $n - 1; $i >= 0; $i--) {
                    $totalMonths = ($baseYear * 12 + $baseMon - 1) - $i;
                    $y = intdiv($totalMonths, 12);
                    $m = ($totalMonths % 12) + 1;
                    $result[] = sprintf('%04d-%02d', $y, $m);
                }
                break;
            case 'yearly':
                // Returns YYYY labels
                $baseY = 2026;
                for ($i = $n - 1; $i >= 0; $i--) {
                    $result[] = (string)($baseY - $i);
                }
                break;
            case 'seasonal':
                // Returns YYYY-Q# labels (quarters)
                $baseYear = 2026; $baseQ = 1;
                for ($i = $n - 1; $i >= 0; $i--) {
                    $totalQ = ($baseYear * 4 + $baseQ - 1) - $i;
                    $y = intdiv($totalQ, 4);
                    $q = ($totalQ % 4) + 1;
                    $result[] = sprintf('%04d-Q%d', $y, $q);
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
                for ($i = $n - 1; $i >= 0; $i--) {
                    $result[] = gmdate('Y-m-d', $base - $i * 86400);
                }
                break;
        }
        return $result;
    }

    // n range based on period
    private static function nRange(string $period, int $n, int $default): int {
        switch ($period) {
            case 'monthly':  return max(2, min(36, $n ?: $default));
            case 'yearly':   return max(2, min(10, $n ?: $default));
            case 'seasonal': return max(2, min(20, $n ?: $default));
            case 'weekly':   return max(4, min(52, $n ?: $default));
            default:         return max(7, min(90, $n ?: $default));
        }
    }

    // Noise multiplier: larger periods get bigger absolute noise, same relative
    private static function periodScale(string $period): float {
        switch ($period) {
            case 'monthly':  return 30.0;
            case 'yearly':   return 365.0;
            case 'seasonal': return 91.0;
            case 'weekly':   return 7.0;
            default:         return 1.0;
        }
    }

    private static function rand(float $base, float $noise): float {
        return round($base + $noise * (mt_rand(-100, 100) / 100), 2);
    }

    // ── 1. SKU Rollup ──────────────────────────────────────────────────────
    /**
     * GET /v423/rollup/sku?period=daily|weekly&n=14
     */
    public static function sku(Request $req, Response $res, array $args = []): Response {
        $q      = $req->getQueryParams();
        $period = $q['period'] ?? 'daily';
        $n      = self::nRange($period, (int)($q['n'] ?? 0), 14);
        $scale  = self::periodScale($period);
        $dates  = self::dates($period, $n);

        $skus = [
            'SKU-A1' => ['name' => '스마트 워치 Pro', 'platform' => 'Coupang',  'price' => 189000,
                         'ord_base' => 62,  'ord_noise' => 12,
                         'rev_base' => 11718000, 'rev_noise' => 2000000,
                         'spend_base' => 1800000, 'spend_noise' => 300000,
                         'ret_base' => 4.1, 'ret_noise' => 0.5],
            'SKU-B2' => ['name' => '블루투스 이어폰 X', 'platform' => 'Naver',  'price' => 89000,
                         'ord_base' => 138, 'ord_noise' => 25,
                         'rev_base' => 12282000, 'rev_noise' => 2500000,
                         'spend_base' => 2100000, 'spend_noise' => 400000,
                         'ret_base' => 12.1, 'ret_noise' => 1.0],
            'SKU-C3' => ['name' => '4K 웹캠 Ultra', 'platform' => 'Amazon',  'price' => 234000,
                         'ord_base' => 34,  'ord_noise' => 8,
                         'rev_base' => 7956000, 'rev_noise' => 1800000,
                         'spend_base' => 1600000, 'spend_noise' => 350000,
                         'ret_base' => 19.8, 'ret_noise' => 1.5],
            'SKU-D4' => ['name' => '기계식 키보드 TKL', 'platform' => 'Coupang', 'price' => 156000,
                         'ord_base' => 45,  'ord_noise' => 10,
                         'rev_base' => 7020000, 'rev_noise' => 1500000,
                         'spend_base' => 980000, 'spend_noise' => 200000,
                         'ret_base' => 8.3, 'ret_noise' => 0.9],
            'SKU-E5' => ['name' => '무선 충전 패드', 'platform' => 'Naver', 'price' => 45000,
                         'ord_base' => 220, 'ord_noise' => 40,
                         'rev_base' => 9900000, 'rev_noise' => 1800000,
                         'spend_base' => 1200000, 'spend_noise' => 250000,
                         'ret_base' => 2.8, 'ret_noise' => 0.4],
        ];

        $rows = [];
        foreach ($skus as $id => $s) {
            $series = [];
            $cur_ord = $s['ord_base'];
            $cur_rev = $s['rev_base'];
            $cur_spe = $s['spend_base'];
            $cur_ret = $s['ret_base'];
            foreach ($dates as $d) {
                $cur_ord = max(1, (int)round($cur_ord + $s['ord_noise'] * $scale * (mt_rand(-100,100)/100)));
                $cur_rev = max(0, round($cur_rev + $s['rev_noise'] * $scale * (mt_rand(-100,100)/100)));
                $cur_spe = max(0, round($cur_spe + $s['spend_noise'] * $scale * (mt_rand(-100,100)/100)));
                $cur_ret = max(0.5, min(40, round($cur_ret + $s['ret_noise'] * (mt_rand(-100,100)/100), 1)));
                $net    = $cur_rev - $cur_spe;
                $roas   = $cur_spe > 0 ? round($cur_rev / $cur_spe, 2) : 0;
                $series[] = [
                    'date'      => $d,
                    'orders'    => $cur_ord,
                    'revenue'   => $cur_rev,
                    'spend'     => $cur_spe,
                    'net_payout'=> $net,
                    'roas'      => $roas,
                    'return_rate'=> $cur_ret,
                ];
            }
            $totalRev = array_sum(array_column($series, 'revenue'));
            $totalSpe = array_sum(array_column($series, 'spend'));
            $rows[] = [
                'sku_id'    => $id,
                'name'      => $s['name'],
                'platform'  => $s['platform'],
                'unit_price'=> $s['price'],
                'avg_roas'  => $totalSpe > 0 ? round($totalRev / $totalSpe, 2) : 0,
                'total_revenue' => $totalRev,
                'total_spend'   => $totalSpe,
                'total_orders'  => array_sum(array_column($series, 'orders')),
                'avg_return_rate'=> round(array_sum(array_column($series, 'return_rate')) / count($series), 1),
                'series'    => $series,
            ];
        }

        // Sort by total_revenue desc
        usort($rows, fn($a, $b) => $b['total_revenue'] <=> $a['total_revenue']);

        return TemplateResponder::json($res, [
            'ok' => true, 'version' => 'v423', 'dimension' => 'sku',
            'period' => $period, 'n' => $n, 'dates' => $dates, 'rows' => $rows,
        ]);
    }

    // ── 2. Campaign Rollup ─────────────────────────────────────────────────
    /**
     * GET /v423/rollup/campaign?period=daily|weekly&n=14
     */
    public static function campaign(Request $req, Response $res, array $args = []): Response {
        $q      = $req->getQueryParams();
        $period = $q['period'] ?? 'daily';
        $n      = self::nRange($period, (int)($q['n'] ?? 0), 14);
        $scale  = self::periodScale($period);
        $dates  = self::dates($period, $n);

        $campaigns = [
            ['id' => 'CMP-001', 'name' => 'Meta — 스마트기기 봄 컬렉션', 'platform' => 'Meta',
             'spend_base' => 12500000, 'spend_noise' => 1500000,
             'imp_base' => 2800000, 'imp_noise' => 300000,
             'clk_base' => 68000, 'clk_noise' => 8000,
             'conv_base' => 840, 'conv_noise' => 120,
             'rev_base' => 52500000, 'rev_noise' => 5000000],
            ['id' => 'CMP-002', 'name' => 'Google SA — 브랜드 키워드', 'platform' => 'Google',
             'spend_base' => 8200000, 'spend_noise' => 800000,
             'imp_base' => 1400000, 'imp_noise' => 150000,
             'clk_base' => 95000, 'clk_noise' => 10000,
             'conv_base' => 1140, 'conv_noise' => 150,
             'rev_base' => 57000000, 'rev_noise' => 5500000],
            ['id' => 'CMP-003', 'name' => 'TikTok — 챌린지 캠페인 #24', 'platform' => 'TikTok',
             'spend_base' => 9800000, 'spend_noise' => 1200000,
             'imp_base' => 5200000, 'imp_noise' => 600000,
             'clk_base' => 156000, 'clk_noise' => 20000,
             'conv_base' => 390, 'conv_noise' => 80,
             'rev_base' => 19600000, 'rev_noise' => 3000000],
            ['id' => 'CMP-004', 'name' => 'Naver SA — 경쟁 KW 공략', 'platform' => 'Naver',
             'spend_base' => 7400000, 'spend_noise' => 700000,
             'imp_base' => 980000, 'imp_noise' => 100000,
             'clk_base' => 78000, 'clk_noise' => 9000,
             'conv_base' => 1100, 'conv_noise' => 130,
             'rev_base' => 52800000, 'rev_noise' => 4800000],
            ['id' => 'CMP-005', 'name' => 'Coupang DA — 신제품 런칭', 'platform' => 'Coupang',
             'spend_base' => 5600000, 'spend_noise' => 600000,
             'imp_base' => 1800000, 'imp_noise' => 200000,
             'clk_base' => 42000, 'clk_noise' => 5000,
             'conv_base' => 420, 'conv_noise' => 60,
             'rev_base' => 9400000, 'rev_noise' => 1500000],
        ];

        $rows = [];
        foreach ($campaigns as $c) {
            $series = [];
            $cur_s = $c['spend_base']; $cur_i = $c['imp_base'];
            $cur_c = $c['clk_base'];   $cur_v = $c['conv_base'];
            $cur_r = $c['rev_base'];
            foreach ($dates as $d) {
                $cur_s = max(0, round($cur_s + $c['spend_noise'] * $scale * (mt_rand(-100,100)/100)));
                $cur_i = max(0, (int)round($cur_i + $c['imp_noise'] * $scale * (mt_rand(-100,100)/100)));
                $cur_c = max(0, (int)round($cur_c + $c['clk_noise'] * $scale * (mt_rand(-100,100)/100)));
                $cur_v = max(0, (int)round($cur_v + $c['conv_noise'] * $scale * (mt_rand(-100,100)/100)));
                $cur_r = max(0, round($cur_r + $c['rev_noise'] * $scale * (mt_rand(-100,100)/100)));
                $ctr  = $cur_i > 0 ? round($cur_c / $cur_i * 100, 2) : 0;
                $cpc  = $cur_c > 0 ? round($cur_s / $cur_c) : 0;
                $cpa  = $cur_v > 0 ? round($cur_s / $cur_v) : 0;
                $roas = $cur_s > 0 ? round($cur_r / $cur_s, 2) : 0;
                $series[] = [
                    'date' => $d, 'spend' => $cur_s,
                    'impressions' => $cur_i, 'clicks' => $cur_c,
                    'conversions' => $cur_v, 'revenue' => $cur_r,
                    'ctr' => $ctr, 'cpc' => $cpc, 'cpa' => $cpa, 'roas' => $roas,
                ];
            }
            $totS = array_sum(array_column($series, 'spend'));
            $totR = array_sum(array_column($series, 'revenue'));
            $totV = array_sum(array_column($series, 'conversions'));
            $rows[] = [
                'campaign_id' => $c['id'],
                'name'    => $c['name'],
                'platform'=> $c['platform'],
                'total_spend'   => $totS,
                'total_revenue' => $totR,
                'total_conversions' => $totV,
                'avg_roas'  => $totS > 0 ? round($totR / $totS, 2) : 0,
                'avg_cpa'   => $totV > 0 ? round($totS / $totV) : 0,
                'series'    => $series,
            ];
        }

        usort($rows, fn($a, $b) => $b['total_revenue'] <=> $a['total_revenue']);

        return TemplateResponder::json($res, [
            'ok' => true, 'version' => 'v423', 'dimension' => 'campaign',
            'period' => $period, 'n' => $n, 'dates' => $dates, 'rows' => $rows,
        ]);
    }

    // ── 3. Creator (Influencer) Rollup ─────────────────────────────────────
    /**
     * GET /v423/rollup/creator?period=weekly&n=8
     */
    public static function creator(Request $req, Response $res, array $args = []): Response {
        $q      = $req->getQueryParams();
        $period = $q['period'] ?? 'weekly';
        $n      = self::nRange($period, (int)($q['n'] ?? 0), 8);
        $scale  = self::periodScale($period);
        $dates  = self::dates($period, $n);

        $creators = [
            ['id' => 'CR-001', 'handle' => '@techkimchi_kr', 'platform' => 'YouTube',
             'tier' => 'Macro', 'followers' => 1240000, 'fee' => 4800000,
             'views_base' => 280000, 'views_noise' => 50000,
             'clicks_base' => 8200, 'clicks_noise' => 1500,
             'conv_base' => 148, 'conv_noise' => 30,
             'rev_base' => 13320000, 'rev_noise' => 2000000],
            ['id' => 'CR-002', 'handle' => '@lifestylemom88', 'platform' => 'Instagram',
             'tier' => 'Macro', 'followers' => 820000, 'fee' => 3200000,
             'views_base' => 185000, 'views_noise' => 30000,
             'clicks_base' => 5600, 'clicks_noise' => 1000,
             'conv_base' => 112, 'conv_noise' => 25,
             'rev_base' => 10080000, 'rev_noise' => 1800000],
            ['id' => 'CR-003', 'handle' => '@geeknerd.dev', 'platform' => 'TikTok',
             'tier' => 'Mega', 'followers' => 3100000, 'fee' => 7500000,
             'views_base' => 920000, 'views_noise' => 120000,
             'clicks_base' => 18400, 'clicks_noise' => 3500,
             'conv_base' => 230, 'conv_noise' => 50,
             'rev_base' => 20700000, 'rev_noise' => 3500000],
            ['id' => 'CR-004', 'handle' => '@minimalist_daily', 'platform' => 'YouTube',
             'tier' => 'Micro', 'followers' => 145000, 'fee' => 650000,
             'views_base' => 38000, 'views_noise' => 8000,
             'clicks_base' => 1520, 'clicks_noise' => 350,
             'conv_base' => 68, 'conv_noise' => 15,
             'rev_base' => 6120000, 'rev_noise' => 1200000],
            ['id' => 'CR-005', 'handle' => '@kshop_queen', 'platform' => 'Instagram',
             'tier' => 'Micro', 'followers' => 92000, 'fee' => 480000,
             'views_base' => 24000, 'views_noise' => 5000,
             'clicks_base' => 960, 'clicks_noise' => 200,
             'conv_base' => 48, 'conv_noise' => 12,
             'rev_base' => 4320000, 'rev_noise' => 900000],
        ];

        $rows = [];
        foreach ($creators as $c) {
            $series = [];
            $cur_v = $c['views_base']; $cur_c = $c['clicks_base'];
            $cur_cv = $c['conv_base']; $cur_r = $c['rev_base'];
            foreach ($dates as $d) {
                $cur_v  = max(0, (int)round($cur_v  + $c['views_noise'] * $scale * (mt_rand(-100,100)/100)));
                $cur_c  = max(0, (int)round($cur_c  + $c['clicks_noise'] * $scale * (mt_rand(-100,100)/100)));
                $cur_cv = max(0, (int)round($cur_cv + $c['conv_noise'] * $scale * (mt_rand(-100,100)/100)));
                $cur_r  = max(0, round($cur_r + $c['rev_noise'] * $scale * (mt_rand(-100,100)/100)));
                $ctr = $cur_v > 0 ? round($cur_c / $cur_v * 100, 2) : 0;
                $cvr = $cur_c > 0 ? round($cur_cv / $cur_c * 100, 2) : 0;
                $roi = $c['fee'] > 0 ? round(($cur_r - $c['fee']) / $c['fee'] * 100, 1) : 0;
                $series[] = [
                    'date' => $d, 'views' => $cur_v,
                    'clicks' => $cur_c, 'conversions' => $cur_cv,
                    'revenue' => $cur_r, 'ctr' => $ctr, 'cvr' => $cvr, 'roi_pct' => $roi,
                ];
            }
            $totR = array_sum(array_column($series, 'revenue'));
            $totC = array_sum(array_column($series, 'conversions'));
            $roi  = $c['fee'] > 0 ? round(($totR - $c['fee'] * $n) / ($c['fee'] * $n) * 100, 1) : 0;
            $rows[] = [
                'creator_id'=> $c['id'],
                'handle'    => $c['handle'],
                'platform'  => $c['platform'],
                'tier'      => $c['tier'],
                'followers' => $c['followers'],
                'fee_per_post'=> $c['fee'],
                'total_revenue'    => $totR,
                'total_conversions'=> $totC,
                'avg_roi_pct'      => $roi,
                'revenue_per_fee'  => $c['fee'] > 0 ? round($totR / ($c['fee'] * $n), 2) : 0,
                'series'    => $series,
            ];
        }

        usort($rows, fn($a, $b) => $b['avg_roi_pct'] <=> $a['avg_roi_pct']);

        return TemplateResponder::json($res, [
            'ok' => true, 'version' => 'v423', 'dimension' => 'creator',
            'period' => $period, 'n' => $n, 'dates' => $dates, 'rows' => $rows,
        ]);
    }

    // ── 4. Platform Rollup ─────────────────────────────────────────────────
    /**
     * GET /v423/rollup/platform?period=daily|weekly&n=14
     */
    public static function platform(Request $req, Response $res, array $args = []): Response {
        $q      = $req->getQueryParams();
        $period = $q['period'] ?? 'daily';
        $n      = self::nRange($period, (int)($q['n'] ?? 0), 14);
        $scale  = self::periodScale($period);
        $dates  = self::dates($period, $n);

        $platforms = [
            'Meta'     => ['color' => '#1877F2', 'spend_b'=>12000000,'spend_n'=>1500000,
                           'rev_b'=>57600000,'rev_n'=>5500000,'ord_b'=>1440,'ord_n'=>200,
                           'imp_b'=>3800000,'imp_n'=>400000,'clk_b'=>102000,'clk_n'=>12000],
            'Google'   => ['color' => '#4285F4', 'spend_b'=>9500000,'spend_n'=>900000,
                           'rev_b'=>70300000,'rev_n'=>6500000,'ord_b'=>1755,'ord_n'=>180,
                           'imp_b'=>2100000,'imp_n'=>250000,'clk_b'=>168000,'clk_n'=>18000],
            'TikTok'   => ['color' => '#010101', 'spend_b'=>11000000,'spend_n'=>1400000,
                           'rev_b'=>23100000,'rev_n'=>3500000,'ord_b'=>578,'ord_n'=>100,
                           'imp_b'=>6500000,'imp_n'=>800000,'clk_b'=>195000,'clk_n'=>25000],
            'Naver'    => ['color' => '#03C75A', 'spend_b'=>8200000,'spend_n'=>750000,
                           'rev_b'=>60680000,'rev_n'=>5500000,'ord_b'=>1517,'ord_n'=>170,
                           'imp_b'=>1600000,'imp_n'=>180000,'clk_b'=>128000,'clk_n'=>14000],
            'Coupang'  => ['color' => '#E51937', 'spend_b'=>6800000,'spend_n'=>700000,
                           'rev_b'=>11560000,'rev_n'=>2200000,'ord_b'=>289,'ord_n'=>60,
                           'imp_b'=>2200000,'imp_n'=>280000,'clk_b'=>66000,'clk_n'=>9000],
        ];

        $rows = [];
        foreach ($platforms as $pf => $p) {
            $series = [];
            $cur_s = $p['spend_b']; $cur_r = $p['rev_b'];
            $cur_o = $p['ord_b'];   $cur_i = $p['imp_b']; $cur_c = $p['clk_b'];
            foreach ($dates as $d) {
                $cur_s = max(0, round($cur_s + $p['spend_n'] * $scale * (mt_rand(-100,100)/100)));
                $cur_r = max(0, round($cur_r + $p['rev_n']   * $scale * (mt_rand(-100,100)/100)));
                $cur_o = max(0, (int)round($cur_o + $p['ord_n'] * $scale * (mt_rand(-100,100)/100)));
                $cur_i = max(0, (int)round($cur_i + $p['imp_n'] * $scale * (mt_rand(-100,100)/100)));
                $cur_c = max(0, (int)round($cur_c + $p['clk_n'] * $scale * (mt_rand(-100,100)/100)));
                $roas  = $cur_s > 0 ? round($cur_r / $cur_s, 2) : 0;
                $ctr   = $cur_i > 0 ? round($cur_c / $cur_i * 100, 2) : 0;
                $cpc   = $cur_c > 0 ? round($cur_s / $cur_c) : 0;
                $series[] = [
                    'date' => $d, 'spend' => $cur_s, 'revenue' => $cur_r,
                    'orders' => $cur_o, 'impressions' => $cur_i, 'clicks' => $cur_c,
                    'roas' => $roas, 'ctr' => $ctr, 'cpc' => $cpc,
                ];
            }
            $totS = array_sum(array_column($series, 'spend'));
            $totR = array_sum(array_column($series, 'revenue'));
            $rows[] = [
                'platform'      => $pf,
                'color'         => $p['color'],
                'total_spend'   => $totS,
                'total_revenue' => $totR,
                'total_orders'  => array_sum(array_column($series, 'orders')),
                'total_impressions'=> array_sum(array_column($series, 'impressions')),
                'total_clicks'  => array_sum(array_column($series, 'clicks')),
                'avg_roas'      => $totS > 0 ? round($totR / $totS, 2) : 0,
                'series'        => $series,
            ];
        }

        usort($rows, fn($a, $b) => $b['total_revenue'] <=> $a['total_revenue']);

        return TemplateResponder::json($res, [
            'ok' => true, 'version' => 'v423', 'dimension' => 'platform',
            'period' => $period, 'n' => $n, 'dates' => $dates, 'rows' => $rows,
        ]);
    }

    // ── 5. Summary (all dimensions, latest N snapshot) ─────────────────────
    /**
     * GET /v423/rollup/summary
     */
    public static function summary(Request $req, Response $res, array $args = []): Response {
        $q = $req->getQueryParams();
        $period = $q['period'] ?? 'daily';
        $n = (int)($q['n'] ?? 14);

        // Lightweight summary using sub-calls
        $fakeReq = $req->withQueryParams(['period' => $period, 'n' => $n]);
        $fakeRes = $res;

        // Aggregate totals
        $totalRev   = 0; $totalSpend = 0; $totalOrders = 0;
        $platforms  = ['Meta'=>57600000,'Google'=>70300000,'TikTok'=>23100000,'Naver'=>60680000,'Coupang'=>11560000];
        $skus       = [
            ['sku_id'=>'SKU-A1','name'=>'스마트 워치 Pro', 'revenue'=>163000000,'orders'=>868,'roas'=>4.2,'return_rate'=>4.1],
            ['sku_id'=>'SKU-B2','name'=>'블루투스 이어폰 X','revenue'=>171900000,'orders'=>1932,'roas'=>4.1,'return_rate'=>12.1],
            ['sku_id'=>'SKU-C3','name'=>'4K 웹캠 Ultra',   'revenue'=>111400000,'orders'=>476,'roas'=>3.8,'return_rate'=>19.8],
            ['sku_id'=>'SKU-D4','name'=>'기계식 키보드 TKL','revenue'=>98300000, 'orders'=>630,'roas'=>4.5,'return_rate'=>8.3],
            ['sku_id'=>'SKU-E5','name'=>'무선 충전 패드',  'revenue'=>138600000,'orders'=>3080,'roas'=>5.8,'return_rate'=>2.8],
        ];
        foreach ($platforms as $pf => $rev) {
            $totalRev += $rev;
        }
        $totalSpend = round($totalRev / 4.8);
        $totalOrders = 7986;

        return TemplateResponder::json($res, [
            'ok' => true, 'version' => 'v423', 'dimension' => 'summary',
            'period' => $period, 'n' => $n,
            'kpi' => [
                'total_revenue'   => $totalRev,
                'total_spend'     => $totalSpend,
                'total_orders'    => $totalOrders,
                'avg_roas'        => round($totalRev / $totalSpend, 2),
                'revenue_per_order' => round($totalRev / $totalOrders),
            ],
            'by_platform' => $platforms,
            'top_skus'    => $skus,
            'alerts'      => [
                ['type'=>'warn', 'msg'=>'SKU-C3 반품률 19.8% — 임계치 초과'],
                ['type'=>'warn', 'msg'=>'TikTok ROAS 2.1x — 손익분기 미달'],
                ['type'=>'info', 'msg'=>'SKU-E5 무선충전패드 ROAS 5.8x 최고 효율'],
            ],
        ]);
    }
}
