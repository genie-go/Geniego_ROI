<?php
declare(strict_types=1);

namespace Genie\Handlers;

use Genie\Db;
use Genie\TemplateResponder;
use PDO;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

/**
 * v418.1 (compatible upgrade): Aggregated-only marketing insights.
 * - No PII. Only demographic breakdowns provided by ad platforms / creator insights.
 * - Commerce is product/order aggregates (no buyer lists).
 *
 * This handler is additive: it does not change any existing v377~v418 endpoints.
 */
final class Insights {

    private static function now(): string {
        return gmdate('c');
    }

    private static function readJson(Request $req): array {
        $raw = (string)$req->getBody();
        $data = json_decode($raw, true);
        return is_array($data) ? $data : [];
    }

    private static function normDate(?string $d): string {
        // Accept YYYY-MM-DD or ISO8601; fallback to today (UTC)
        if (is_string($d) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $d)) return $d;
        if (is_string($d)) {
            $ts = strtotime($d);
            if ($ts !== false) return gmdate('Y-m-d', $ts);
        }
        return gmdate('Y-m-d');
    }

    private static function normStr($v): ?string {
        if ($v === null) return null;
        if (is_string($v)) {
            $s = trim($v);
            return $s === '' ? null : $s;
        }
        if (is_numeric($v)) return (string)$v;
        return null;
    }

    private static function normInt($v): int {
        if (is_int($v)) return $v;
        if (is_numeric($v)) return (int)$v;
        return 0;
    }

    private static function normFloat($v): float {
        if (is_float($v) || is_int($v)) return (float)$v;
        if (is_numeric($v)) return (float)$v;
        return 0.0;
    }

    /**
     * POST /v418/insights/audience-breakdowns
     * POST /v4181/insights/audience-breakdowns
     *
     * Body:
     * {
     *   "rows": [
     *     {
     *       "source_platform": "meta|tiktok|amazon_ads|...",
     *       "account_id": "...",
     *       "campaign_id": "...",
     *       "adset_id": "...",
     *       "ad_id": "...",
     *       "creative_id": "...",
     *       "product_sku": "SKU-123",               // optional attribution hint
     *       "event_date": "2026-03-01",
     *       "region": "KR|US|JP|...",
     *       "gender": "female|male|unknown",
     *       "age_bucket": "18-24|25-34|...",
     *       "impressions": 123,
     *       "clicks": 12,
     *       "spend": 45.67,
     *       "conversions": 3,
     *       "attributed_revenue": 120.00
     *     }
     *   ]
     * }
     */
    public static function ingestAdAudience(Request $req, Response $res, array $args = []): Response {
        $pdo = Db::pdo();
        $data = self::readJson($req);
        $rows = $data['rows'] ?? [];
        if (!is_array($rows)) $rows = [];

        $stmt = $pdo->prepare('INSERT INTO ad_audience_breakdowns (
            source_platform, account_id, campaign_id, adset_id, ad_id, creative_id, product_sku,
            event_date, region, gender, age_bucket,
            impressions, clicks, spend, conversions, attributed_revenue, raw_json, created_at
        ) VALUES (
            :source_platform, :account_id, :campaign_id, :adset_id, :ad_id, :creative_id, :product_sku,
            :event_date, :region, :gender, :age_bucket,
            :impressions, :clicks, :spend, :conversions, :attributed_revenue, :raw_json, :created_at
        );');

        $inserted = 0;
        foreach ($rows as $r) {
            if (!is_array($r)) continue;
            $sp = self::normStr($r['source_platform'] ?? null) ?? 'unknown';
            $payload = [
                ':source_platform' => $sp,
                ':account_id' => self::normStr($r['account_id'] ?? null),
                ':campaign_id' => self::normStr($r['campaign_id'] ?? null),
                ':adset_id' => self::normStr($r['adset_id'] ?? null),
                ':ad_id' => self::normStr($r['ad_id'] ?? null),
                ':creative_id' => self::normStr($r['creative_id'] ?? null),
                ':product_sku' => self::normStr($r['product_sku'] ?? null),
                ':event_date' => self::normDate($r['event_date'] ?? null),
                ':region' => self::normStr($r['region'] ?? null),
                ':gender' => self::normStr($r['gender'] ?? null),
                ':age_bucket' => self::normStr($r['age_bucket'] ?? null),
                ':impressions' => self::normInt($r['impressions'] ?? 0),
                ':clicks' => self::normInt($r['clicks'] ?? 0),
                ':spend' => self::normFloat($r['spend'] ?? 0),
                ':conversions' => self::normInt($r['conversions'] ?? 0),
                ':attributed_revenue' => self::normFloat($r['attributed_revenue'] ?? 0),
                ':raw_json' => json_encode($r, JSON_UNESCAPED_UNICODE),
                ':created_at' => self::now(),
            ];
            $stmt->execute($payload);
            $inserted++;
        }

        return TemplateResponder::json($res, [
            'ok' => true,
            'inserted' => $inserted,
            'schema' => 'ad_audience_breakdowns',
        ]);
    }

    /**
     * POST /v418/insights/influencer-audience
     * POST /v4181/insights/influencer-audience
     *
     * Body: { "rows": [ { "platform":"instagram", "influencer_id":"...", "handle":"@x", "event_date":"YYYY-MM-DD",
     *   "region":"KR", "gender":"female", "age_bucket":"25-34", "followers":12345, "engaged_accounts":123,
     *   "impressions": 1000, "clicks": 12 } ] }
     */
    public static function ingestInfluencerAudience(Request $req, Response $res, array $args = []): Response {
        $pdo = Db::pdo();
        $data = self::readJson($req);
        $rows = $data['rows'] ?? [];
        if (!is_array($rows)) $rows = [];

        $stmt = $pdo->prepare('INSERT INTO influencer_audience_breakdowns (
            platform, influencer_id, influencer_handle, event_date, region, gender, age_bucket,
            followers, engaged_accounts, impressions, clicks, raw_json, created_at
        ) VALUES (
            :platform, :influencer_id, :influencer_handle, :event_date, :region, :gender, :age_bucket,
            :followers, :engaged_accounts, :impressions, :clicks, :raw_json, :created_at
        );');

        $inserted = 0;
        foreach ($rows as $r) {
            if (!is_array($r)) continue;
            $platform = self::normStr($r['platform'] ?? null) ?? 'instagram';
            $influencerId = self::normStr($r['influencer_id'] ?? null);
            if ($influencerId === null) continue;

            $stmt->execute([
                ':platform' => $platform,
                ':influencer_id' => $influencerId,
                ':influencer_handle' => self::normStr($r['handle'] ?? $r['influencer_handle'] ?? null),
                ':event_date' => self::normDate($r['event_date'] ?? null),
                ':region' => self::normStr($r['region'] ?? null),
                ':gender' => self::normStr($r['gender'] ?? null),
                ':age_bucket' => self::normStr($r['age_bucket'] ?? null),
                ':followers' => self::normInt($r['followers'] ?? 0),
                ':engaged_accounts' => self::normInt($r['engaged_accounts'] ?? 0),
                ':impressions' => self::normInt($r['impressions'] ?? 0),
                ':clicks' => self::normInt($r['clicks'] ?? 0),
                ':raw_json' => json_encode($r, JSON_UNESCAPED_UNICODE),
                ':created_at' => self::now(),
            ]);
            $inserted++;
        }

        return TemplateResponder::json($res, [
            'ok' => true,
            'inserted' => $inserted,
            'schema' => 'influencer_audience_breakdowns',
        ]);
    }

    /**
     * POST /v418/insights/commerce-aggregates
     * POST /v4181/insights/commerce-aggregates
     *
     * Body: { "rows": [ { "channel":"amazon|shopify|qoo10|rakuten|...", "store_id":"...", "product_sku":"SKU",
     *   "product_title":"...", "event_date":"YYYY-MM-DD", "units_sold":10, "gross_revenue":100.0, "refunds":5.0,
     *   "net_revenue":95.0, "sessions": 200 } ] }
     */
    public static function ingestCommerceDaily(Request $req, Response $res, array $args = []): Response {
        $pdo = Db::pdo();
        $data = self::readJson($req);
        $rows = $data['rows'] ?? [];
        if (!is_array($rows)) $rows = [];

        $stmt = $pdo->prepare('INSERT INTO commerce_product_daily (
            channel, store_id, product_sku, product_title, event_date,
            units_sold, gross_revenue, refunds, net_revenue, sessions, raw_json, created_at
        ) VALUES (
            :channel, :store_id, :product_sku, :product_title, :event_date,
            :units_sold, :gross_revenue, :refunds, :net_revenue, :sessions, :raw_json, :created_at
        );');

        $inserted = 0;
        foreach ($rows as $r) {
            if (!is_array($r)) continue;
            $channel = self::normStr($r['channel'] ?? null) ?? 'unknown';
            $sku = self::normStr($r['product_sku'] ?? null);
            if ($sku === null) continue;

            $stmt->execute([
                ':channel' => $channel,
                ':store_id' => self::normStr($r['store_id'] ?? null),
                ':product_sku' => $sku,
                ':product_title' => self::normStr($r['product_title'] ?? null),
                ':event_date' => self::normDate($r['event_date'] ?? null),
                ':units_sold' => self::normInt($r['units_sold'] ?? 0),
                ':gross_revenue' => self::normFloat($r['gross_revenue'] ?? 0),
                ':refunds' => self::normFloat($r['refunds'] ?? 0),
                ':net_revenue' => self::normFloat($r['net_revenue'] ?? ($r['gross_revenue'] ?? 0) - ($r['refunds'] ?? 0)),
                ':sessions' => self::normInt($r['sessions'] ?? 0),
                ':raw_json' => json_encode($r, JSON_UNESCAPED_UNICODE),
                ':created_at' => self::now(),
            ]);
            $inserted++;
        }

        return TemplateResponder::json($res, [
            'ok' => true,
            'inserted' => $inserted,
            'schema' => 'commerce_product_daily',
        ]);
    }

    /**
     * POST /v418/insights/creative-sku-map
     * POST /v4181/insights/creative-sku-map
     *
     * Body: { "rows": [ { "source_platform":"meta", "creative_id":"...", "product_sku":"SKU-1", "confidence":0.8 } ] }
     */
    public static function upsertCreativeSkuMap(Request $req, Response $res, array $args = []): Response {
        $pdo = Db::pdo();
        $data = self::readJson($req);
        $rows = $data['rows'] ?? [];
        if (!is_array($rows)) $rows = [];

        $stmt = $pdo->prepare('INSERT INTO creative_sku_map (source_platform, creative_id, product_sku, confidence, updated_at)
            VALUES (:source_platform, :creative_id, :product_sku, :confidence, :updated_at)
            ON CONFLICT(source_platform, creative_id, product_sku) DO UPDATE SET
                confidence=excluded.confidence,
                updated_at=excluded.updated_at;');

        $upserted = 0;
        foreach ($rows as $r) {
            if (!is_array($r)) continue;
            $sp = self::normStr($r['source_platform'] ?? null);
            $cid = self::normStr($r['creative_id'] ?? null);
            $sku = self::normStr($r['product_sku'] ?? null);
            if ($sp === null || $cid === null || $sku === null) continue;
            $stmt->execute([
                ':source_platform' => $sp,
                ':creative_id' => $cid,
                ':product_sku' => $sku,
                ':confidence' => max(0.0, min(1.0, self::normFloat($r['confidence'] ?? 0.5))),
                ':updated_at' => self::now(),
            ]);
            $upserted++;
        }

        return TemplateResponder::json($res, [
            'ok' => true,
            'upserted' => $upserted,
            'schema' => 'creative_sku_map',
        ]);
    }

    /**
     * GET /v418/insights/target-performance?start=YYYY-MM-DD&end=YYYY-MM-DD&region=KR&gender=female&age=25-34&limit=10
     * GET /v4181/insights/target-performance?...
     *
     * Returns:
     * - best products (SKU) by blended ROAS-like score using (ad attributed revenue / ad spend) and commerce net revenue.
     * - best creatives (by clicks/conversions for target)
     * - best influencers (whose audience matches the target)
     *
     * Note: This is an "evidence dashboard" helper, not a perfect attribution model.
     */
    public static function targetPerformance(Request $req, Response $res, array $args = []): Response {
        $pdo = Db::pdo();
        $q = $req->getQueryParams();

        $start = self::normDate($q['start'] ?? null);
        $end = self::normDate($q['end'] ?? null);
        if ($end < $start) { $tmp=$start; $start=$end; $end=$tmp; }

        $region = self::normStr($q['region'] ?? null);
        $gender = self::normStr($q['gender'] ?? null);
        $age = self::normStr($q['age'] ?? ($q['age_bucket'] ?? null));
        $limit = max(1, min(50, (int)($q['limit'] ?? 10)));

        $where = 'event_date BETWEEN :start AND :end';
        $params = [':start' => $start, ':end' => $end];
        if ($region !== null) { $where .= ' AND region = :region'; $params[':region'] = $region; }
        if ($gender !== null) { $where .= ' AND gender = :gender'; $params[':gender'] = $gender; }
        if ($age !== null) { $where .= ' AND age_bucket = :age'; $params[':age'] = $age; }

        // Products from ad audience breakdowns (attribution hint or mapped via creative_sku_map)
        $sqlProducts = <<<SQL
WITH ad AS (
                SELECT
                    COALESCE(a.product_sku, m.product_sku) AS product_sku,
                    SUM(a.spend) AS spend,
                    SUM(a.attributed_revenue) AS attributed_revenue,
                    SUM(a.clicks) AS clicks,
                    SUM(a.conversions) AS conversions
                FROM ad_audience_breakdowns a
                LEFT JOIN creative_sku_map m
                    ON m.source_platform = a.source_platform AND m.creative_id = a.creative_id
                WHERE {$where}
                GROUP BY COALESCE(a.product_sku, m.product_sku)
            ),
            com AS (
                SELECT product_sku, SUM(net_revenue) AS net_revenue, SUM(units_sold) AS units_sold
                FROM commerce_product_daily
                WHERE event_date BETWEEN :start AND :end
                GROUP BY product_sku
            )
            SELECT
                ad.product_sku,
                COALESCE(com.net_revenue, 0) AS commerce_net_revenue,
                COALESCE(com.units_sold, 0) AS units_sold,
                ad.spend,
                ad.attributed_revenue,
                ad.clicks,
                ad.conversions,
                CASE
                    WHEN ad.spend > 0 THEN (ad.attributed_revenue / ad.spend)
                    ELSE NULL
                END AS roas_attributed,
                -- a simple blended score to help ranking without claiming exact attribution:
                (COALESCE(com.net_revenue, 0) + ad.attributed_revenue) / (ad.spend + 1.0) AS blended_score
            FROM ad
            LEFT JOIN com ON com.product_sku = ad.product_sku
            WHERE ad.product_sku IS NOT NULL
            ORDER BY blended_score DESC
            LIMIT :limit;
SQL;

        $stmt = $pdo->prepare($sqlProducts);
        foreach ($params as $k=>$v) $stmt->bindValue($k, $v);
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->execute();
        $topProducts = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

        // Top creatives for the target
        $sqlCreatives = "SELECT source_platform, creative_id,
            SUM(impressions) AS impressions, SUM(clicks) AS clicks, SUM(conversions) AS conversions,
            SUM(spend) AS spend, SUM(attributed_revenue) AS attributed_revenue,
            CASE WHEN SUM(impressions) > 0 THEN (CAST(SUM(clicks) AS REAL)/SUM(impressions)) ELSE NULL END AS ctr,
            CASE WHEN SUM(clicks) > 0 THEN (CAST(SUM(conversions) AS REAL)/SUM(clicks)) ELSE NULL END AS cvr
            FROM ad_audience_breakdowns
            WHERE {$where} AND creative_id IS NOT NULL
            GROUP BY source_platform, creative_id
            ORDER BY (SUM(conversions) * 1000000 + SUM(clicks)) DESC
            LIMIT :limit;";
        $stmt = $pdo->prepare($sqlCreatives);
        foreach ($params as $k=>$v) $stmt->bindValue($k, $v);
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->execute();
        $topCreatives = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

        // Best influencers whose audience matches the target (same target filters applied)
        $whereInf = 'event_date BETWEEN :start AND :end';
        $paramsInf = [':start'=>$start, ':end'=>$end];
        if ($region !== null) { $whereInf .= ' AND region = :region'; $paramsInf[':region'] = $region; }
        if ($gender !== null) { $whereInf .= ' AND gender = :gender'; $paramsInf[':gender'] = $gender; }
        if ($age !== null) { $whereInf .= ' AND age_bucket = :age'; $paramsInf[':age'] = $age; }

        $sqlInfluencers = "SELECT platform, influencer_id, COALESCE(MAX(influencer_handle), '') AS handle,
            SUM(followers) AS followers, SUM(engaged_accounts) AS engaged_accounts,
            SUM(impressions) AS impressions, SUM(clicks) AS clicks,
            CASE WHEN SUM(followers) > 0 THEN (CAST(SUM(engaged_accounts) AS REAL)/SUM(followers)) ELSE NULL END AS engagement_rate
            FROM influencer_audience_breakdowns
            WHERE {$whereInf}
            GROUP BY platform, influencer_id
            ORDER BY (SUM(engaged_accounts) * 1000000 + SUM(clicks)) DESC
            LIMIT :limit;";
        $stmt = $pdo->prepare($sqlInfluencers);
        foreach ($paramsInf as $k=>$v) $stmt->bindValue($k, $v);
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->execute();
        $topInfluencers = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

        return TemplateResponder::json($res, [
            'ok' => true,
            'version' => 'v418.1',
            'query' => [
                'start' => $start,
                'end' => $end,
                'region' => $region,
                'gender' => $gender,
                'age_bucket' => $age,
                'limit' => $limit,
            ],
            'insights' => [
                'top_products' => $topProducts,
                'top_creatives' => $topCreatives,
                'top_influencers' => $topInfluencers,
            ],
            'notes' => [
                'No PII is stored. Demographics are aggregated breakdowns provided by platforms.',
                'Commerce is product/order aggregates; no buyer lists.',
                'blended_score is a ranking heuristic, not a definitive attribution model.',
            ],
        ]);
    }
}
