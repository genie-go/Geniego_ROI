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

        $skus = [];

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

        $campaigns = [];

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

        $creators = [];

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

        $platforms = [];

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
        $platforms = [];
        $skus = [];
        foreach ($platforms as $pf => $rev) {
            $totalRev += $rev;
        }
        $totalSpend = $totalRev > 0 ? round($totalRev / 4.8) : 0;
        $totalOrders = 0; // Changed from 7986

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
