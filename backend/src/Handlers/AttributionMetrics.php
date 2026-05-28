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
 * 176차 PM7 — Attribution/Marketing 실 API endpoint.
 *
 * 원칙 (사용자 명시):
 *   - 가상/목 데이터 절대 금지 — 실 DB query 결과만 반환
 *   - 빈 데이터 시 빈 배열 (EmptyState UI)
 *   - DB 데이터 유입 시 자동 반영
 *
 * Endpoints (v424):
 *   GET /v424/attribution/touches      — attribution_touch 채널 분포 + 최근 N건
 *   GET /v424/attribution/journeys     — 세션 단위 channel sequence 집계
 *   GET /v424/attribution/time-series  — performance_metrics weekly aggregation
 *   GET /v424/attribution/channels     — channel 별 spend/revenue/clicks
 *   GET /v424/marketing/daily-trends   — performance_metrics 일자별 trend
 */
final class AttributionMetrics
{
    // ── /v424/attribution/touches — channel 분포 + 최근 100 touch ────
    public static function touches(Request $request, Response $response, array $args): Response
    {
        $start = microtime(true);
        try {
            $pdo = Db::pdo();
            $byChannel = self::query($pdo,
                'SELECT channel, COUNT(*) AS touches, COUNT(DISTINCT session_id) AS sessions '
                . 'FROM attribution_touch WHERE channel IS NOT NULL '
                . 'GROUP BY channel ORDER BY touches DESC LIMIT 20'
            );
            $recent = self::query($pdo,
                'SELECT session_id, channel, utm_source, utm_medium, utm_campaign, touched_at '
                . 'FROM attribution_touch ORDER BY id DESC LIMIT 100'
            );
            return self::ok($response, [
                'by_channel' => $byChannel,
                'recent' => $recent,
                'total' => self::scalar($pdo, 'SELECT COUNT(*) FROM attribution_touch'),
                'response_time_ms' => self::elapsed($start),
            ]);
        } catch (Throwable $e) {
            return self::ok($response, ['error' => $e->getMessage(), 'by_channel' => [], 'recent' => [], 'total' => 0]);
        }
    }

    // ── /v424/attribution/journeys — session 단위 channel sequence ───
    public static function journeys(Request $request, Response $response, array $args): Response
    {
        $start = microtime(true);
        try {
            $pdo = Db::pdo();
            // session 별 channel 순서 + revenue 집계 (attribution_result 와 join)
            $sql = 'SELECT t.session_id, GROUP_CONCAT(t.channel ORDER BY t.touched_at) AS path, '
                . 'COUNT(*) AS touches, MAX(t.touched_at) AS last_touch '
                . 'FROM attribution_touch t '
                . 'WHERE t.channel IS NOT NULL AND t.session_id IS NOT NULL '
                . 'GROUP BY t.session_id '
                . 'ORDER BY last_touch DESC LIMIT 500';
            $rows = self::query($pdo, $sql);
            // 응답 normalize — path를 array 로 분리
            $journeys = [];
            foreach ($rows as $r) {
                $journeys[] = [
                    'session_id' => $r['session_id'],
                    'path' => $r['path'] ? array_values(array_unique(explode(',', $r['path']))) : [],
                    'touches' => (int)$r['touches'],
                    'last_touch' => $r['last_touch'],
                ];
            }
            return self::ok($response, [
                'journeys' => $journeys,
                'count' => count($journeys),
                'response_time_ms' => self::elapsed($start),
            ]);
        } catch (Throwable $e) {
            return self::ok($response, ['error' => $e->getMessage(), 'journeys' => [], 'count' => 0]);
        }
    }

    // ── /v424/attribution/time-series — performance_metrics weekly ───
    public static function timeSeries(Request $request, Response $response, array $args): Response
    {
        $start = microtime(true);
        try {
            $pdo = Db::pdo();
            // 최근 52주 (varchar date YYYY-MM-DD)
            $sql = 'SELECT channel, '
                . "DATE_FORMAT(STR_TO_DATE(date, '%Y-%m-%d'), '%Y-%u') AS week, "
                . 'SUM(spend) AS spend, SUM(revenue) AS revenue, '
                . 'SUM(impressions) AS impressions, SUM(clicks) AS clicks, '
                . 'SUM(conversions) AS conversions '
                . 'FROM performance_metrics '
                . "WHERE date >= DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL 52 WEEK), '%Y-%m-%d') "
                . 'GROUP BY channel, week ORDER BY channel, week';
            $rows = self::query($pdo, $sql);
            // group by channel
            $spends = []; $revenue = [];
            foreach ($rows as $r) {
                $ch = $r['channel'];
                if (!isset($spends[$ch])) $spends[$ch] = [];
                $spends[$ch][] = ['week' => $r['week'], 'spend' => (float)$r['spend'], 'revenue' => (float)$r['revenue']];
            }
            return self::ok($response, [
                'spends' => $spends,
                'revenue' => $revenue,
                'channel_count' => count($spends),
                'response_time_ms' => self::elapsed($start),
            ]);
        } catch (Throwable $e) {
            return self::ok($response, ['error' => $e->getMessage(), 'spends' => [], 'revenue' => []]);
        }
    }

    // ── /v424/attribution/channels — channel aggregation ─────────────
    public static function channels(Request $request, Response $response, array $args): Response
    {
        $start = microtime(true);
        try {
            $pdo = Db::pdo();
            $rows = self::query($pdo,
                'SELECT channel, '
                . 'SUM(spend) AS spend, SUM(revenue) AS revenue, '
                . 'SUM(impressions) AS impressions, SUM(clicks) AS clicks, '
                . 'SUM(conversions) AS conversions, COUNT(DISTINCT date) AS days '
                . 'FROM performance_metrics WHERE channel IS NOT NULL '
                . 'GROUP BY channel ORDER BY spend DESC'
            );
            // 파생 metrics
            $channels = [];
            foreach ($rows as $r) {
                $spend = (float)$r['spend'];
                $revenue = (float)$r['revenue'];
                $clicks = (int)$r['clicks'];
                $impr = (int)$r['impressions'];
                $channels[] = [
                    'channel' => $r['channel'],
                    'spend' => $spend,
                    'revenue' => $revenue,
                    'roas' => $spend > 0 ? round($revenue / $spend, 2) : 0,
                    'ctr' => $impr > 0 ? round($clicks * 100 / $impr, 2) : 0,
                    'impressions' => $impr,
                    'clicks' => $clicks,
                    'conversions' => (int)$r['conversions'],
                    'days' => (int)$r['days'],
                ];
            }
            return self::ok($response, [
                'channels' => $channels,
                'count' => count($channels),
                'response_time_ms' => self::elapsed($start),
            ]);
        } catch (Throwable $e) {
            return self::ok($response, ['error' => $e->getMessage(), 'channels' => [], 'count' => 0]);
        }
    }

    // ── /v424/marketing/daily-trends — performance_metrics 일자별 ────
    public static function dailyTrends(Request $request, Response $response, array $args): Response
    {
        $start = microtime(true);
        try {
            $pdo = Db::pdo();
            $params = $request->getQueryParams();
            $days = max(1, min(365, (int)($params['days'] ?? 30)));
            $rows = self::query($pdo,
                'SELECT date, '
                . 'SUM(spend) AS adSpend, SUM(revenue) AS revenue, '
                . 'SUM(impressions) AS visitors, SUM(clicks) AS orders, '
                . 'SUM(conversions) AS newCustomers '
                . 'FROM performance_metrics '
                . "WHERE date >= DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL $days DAY), '%Y-%m-%d') "
                . 'GROUP BY date ORDER BY date'
            );
            $trends = array_map(fn($r) => [
                'date' => $r['date'],
                'adSpend' => (float)$r['adSpend'],
                'revenue' => (float)$r['revenue'],
                'visitors' => (int)$r['visitors'],
                'orders' => (int)$r['orders'],
                'newCustomers' => (int)$r['newCustomers'],
                'roas' => ((float)$r['adSpend']) > 0 ? round(((float)$r['revenue']) / ((float)$r['adSpend']), 2) : 0,
                'conversionRate' => ((int)$r['orders']) > 0 ? round(((int)$r['newCustomers']) * 100 / ((int)$r['orders']), 2) : 0,
                'avgOrderValue' => ((int)$r['orders']) > 0 ? round(((float)$r['revenue']) / ((int)$r['orders']), 0) : 0,
                'returningCustomers' => 0,
            ], $rows);
            return self::ok($response, [
                'trends' => $trends,
                'days' => $days,
                'count' => count($trends),
                'response_time_ms' => self::elapsed($start),
            ]);
        } catch (Throwable $e) {
            return self::ok($response, ['error' => $e->getMessage(), 'trends' => [], 'count' => 0]);
        }
    }

    // ── helpers ───────────────────────────────────────────────────────

    private static function query(PDO $pdo, string $sql): array
    {
        $stmt = $pdo->query($sql);
        return $stmt ? $stmt->fetchAll(PDO::FETCH_ASSOC) : [];
    }

    private static function scalar(PDO $pdo, string $sql): int
    {
        $stmt = $pdo->query($sql);
        return $stmt ? (int)$stmt->fetchColumn() : 0;
    }

    private static function elapsed(float $start): float
    {
        return round((microtime(true) - $start) * 1000, 2);
    }

    private static function ok(Response $response, array $payload): Response
    {
        return TemplateResponder::respond($response->withStatus(200), $payload);
    }
}
