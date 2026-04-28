<?php
declare(strict_types=1);

namespace Genie\Handlers;

use Genie\Db;
use Genie\TemplateResponder;
use PDO;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

final class Decisioning {

    private static function tenantId(Request $request): string {
        // Frontend usually sends X-Tenant-Id. Fallback to 'demo'.
        $tid = $request->getHeaderLine('X-Tenant-Id');
        return $tid !== '' ? $tid : 'demo';
    }

    public static function ingestAdInsights(Request $request, Response $response, array $args): Response {
        $pdo = Db::pdo();
        $tenant = self::tenantId($request);
        $body = $request->getParsedBody();
        if (!is_array($body)) $body = [];
        $rows = $body['rows'] ?? $body;
        if (!is_array($rows)) $rows = [];

        $stmt = $pdo->prepare('INSERT INTO ad_insight_agg
            (tenant_id, platform, date, campaign_id, adset_id, ad_id, sku, gender, age_range, region,
             impressions, clicks, spend, conversions, revenue, extra_json)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');

        $count = 0;
        foreach ($rows as $r) {
            if (!is_array($r)) continue;
            $platform = (string)($r['platform'] ?? $r['source'] ?? $r['provider'] ?? 'unknown');
            $date = (string)($r['date'] ?? $r['day'] ?? date('Y-m-d'));
            $campaign = isset($r['campaign_id']) ? (string)$r['campaign_id'] : (isset($r['campaign']) ? (string)$r['campaign'] : null);
            $adset = isset($r['adset_id']) ? (string)$r['adset_id'] : null;
            $ad = isset($r['ad_id']) ? (string)$r['ad_id'] : null;
            $sku = isset($r['sku']) ? (string)$r['sku'] : null;

            $gender = isset($r['gender']) ? (string)$r['gender'] : (isset($r['sex']) ? (string)$r['sex'] : null);
            $age = isset($r['age_range']) ? (string)$r['age_range'] : (isset($r['age']) ? (string)$r['age'] : null);
            $region = isset($r['region']) ? (string)$r['region'] : (isset($r['country']) ? (string)$r['country'] : null);

            $impr = (int)($r['impressions'] ?? 0);
            $clicks = (int)($r['clicks'] ?? 0);
            $spend = (float)($r['spend'] ?? ($r['cost'] ?? 0));
            $conv = (int)($r['conversions'] ?? ($r['purchases'] ?? 0));
            $rev = (float)($r['revenue'] ?? ($r['purchase_value'] ?? 0));

            $extra = $r;
            unset($extra['platform'],$extra['source'],$extra['provider'],$extra['date'],$extra['day'],$extra['campaign_id'],$extra['campaign'],$extra['adset_id'],$extra['ad_id'],$extra['sku'],
                  $extra['gender'],$extra['sex'],$extra['age_range'],$extra['age'],$extra['region'],$extra['country'],
                  $extra['impressions'],$extra['clicks'],$extra['spend'],$extra['cost'],$extra['conversions'],$extra['purchases'],$extra['revenue'],$extra['purchase_value']);

            $stmt->execute([
                $tenant, $platform, $date, $campaign, $adset, $ad, $sku, $gender, $age, $region,
                $impr, $clicks, $spend, $conv, $rev, json_encode($extra, JSON_UNESCAPED_UNICODE)
            ]);
            $count++;
        }

        return TemplateResponder::respond($response, [
            'ok' => true,
            'tenant_id' => $tenant,
            'inserted' => $count
        ]);
    }

    public static function ingestInfluencerInsights(Request $request, Response $response, array $args): Response {
        $pdo = Db::pdo();
        $tenant = self::tenantId($request);
        $body = $request->getParsedBody();
        if (!is_array($body)) $body = [];
        $rows = $body['rows'] ?? $body;
        if (!is_array($rows)) $rows = [];

        $stmt = $pdo->prepare('INSERT INTO influencer_audience_agg
            (tenant_id, platform, creator_id, gender, age_range, region, followers, engagement_rate, updated_at, extra_json)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');

        $count = 0;
        $now = date('c');
        foreach ($rows as $r) {
            if (!is_array($r)) continue;
            $platform = (string)($r['platform'] ?? $r['source'] ?? 'instagram');
            $creator = (string)($r['creator_id'] ?? $r['creator'] ?? $r['handle'] ?? 'unknown');
            $gender = isset($r['gender']) ? (string)$r['gender'] : null;
            $age = isset($r['age_range']) ? (string)$r['age_range'] : null;
            $region = isset($r['region']) ? (string)$r['region'] : null;
            $followers = (int)($r['followers'] ?? 0);
            $er = isset($r['engagement_rate']) ? (float)$r['engagement_rate'] : (isset($r['er']) ? (float)$r['er'] : null);
            $updated = (string)($r['updated_at'] ?? $now);

            $extra = $r;
            unset($extra['platform'],$extra['source'],$extra['creator_id'],$extra['creator'],$extra['handle'],
                  $extra['gender'],$extra['age_range'],$extra['region'],$extra['followers'],$extra['engagement_rate'],$extra['er'],$extra['updated_at']);

            $stmt->execute([
                $tenant, $platform, $creator, $gender, $age, $region, $followers, $er, $updated,
                json_encode($extra, JSON_UNESCAPED_UNICODE)
            ]);
            $count++;
        }

        return TemplateResponder::respond($response, [
            'ok' => true,
            'tenant_id' => $tenant,
            'inserted' => $count
        ]);
    }

    public static function ingestCommerceAgg(Request $request, Response $response, array $args): Response {
        $pdo = Db::pdo();
        $tenant = self::tenantId($request);
        $body = $request->getParsedBody();
        if (!is_array($body)) $body = [];
        $rows = $body['rows'] ?? $body;
        if (!is_array($rows)) $rows = [];

        $stmt = $pdo->prepare('INSERT INTO commerce_sku_day
            (tenant_id, channel, date, sku, orders, units, revenue, refunds, extra_json)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');

        $count = 0;
        foreach ($rows as $r) {
            if (!is_array($r)) continue;
            $channel = (string)($r['channel'] ?? $r['platform'] ?? 'unknown');
            $date = (string)($r['date'] ?? $r['day'] ?? date('Y-m-d'));
            $sku = (string)($r['sku'] ?? $r['asin'] ?? $r['product_id'] ?? 'UNKNOWN');
            $orders = (int)($r['orders'] ?? 0);
            $units = (int)($r['units'] ?? ($r['qty'] ?? 0));
            $rev = (float)($r['revenue'] ?? ($r['sales'] ?? 0));
            $refunds = (float)($r['refunds'] ?? 0);

            $extra = $r;
            unset($extra['channel'],$extra['platform'],$extra['date'],$extra['day'],$extra['sku'],$extra['asin'],$extra['product_id'],
                  $extra['orders'],$extra['units'],$extra['qty'],$extra['revenue'],$extra['sales'],$extra['refunds']);

            $stmt->execute([
                $tenant, $channel, $date, $sku, $orders, $units, $rev, $refunds,
                json_encode($extra, JSON_UNESCAPED_UNICODE)
            ]);
            $count++;
        }

        return TemplateResponder::respond($response, [
            'ok' => true,
            'tenant_id' => $tenant,
            'inserted' => $count
        ]);
    }

    public static function segments(Request $request, Response $response, array $args): Response {
        $pdo = Db::pdo();
        $tenant = self::tenantId($request);

        $q = $request->getQueryParams();
        $metric = (string)($q['metric'] ?? 'roas'); // roas | ctr | cvr | revenue | conversions
        $platform = (string)($q['platform'] ?? '');
        $since = (string)($q['since'] ?? date('Y-m-d', strtotime('-30 days')));
        $until = (string)($q['until'] ?? date('Y-m-d'));
        $limit = max(1, min(200, (int)($q['limit'] ?? 25)));

        $where = 'tenant_id = ? AND date >= ? AND date <= ?';
        $params = [$tenant, $since, $until];
        if ($platform !== '') {
            $where .= ' AND platform = ?';
            $params[] = $platform;
        }

        // Base segment aggregates from ad data.
        $sql = "SELECT
                    COALESCE(gender,'UNKNOWN') AS gender,
                    COALESCE(age_range,'UNKNOWN') AS age_range,
                    COALESCE(region,'UNKNOWN') AS region,
                    SUM(impressions) AS impressions,
                    SUM(clicks) AS clicks,
                    SUM(spend) AS spend,
                    SUM(conversions) AS conversions,
                    SUM(revenue) AS revenue
                FROM ad_insight_agg
                WHERE $where
                GROUP BY gender, age_range, region";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        if (!is_array($rows)) $rows = [];

        // Influencer audience share by segment (aggregated).
        $stmt2 = $pdo->prepare("SELECT
                    COALESCE(gender,'UNKNOWN') AS gender,
                    COALESCE(age_range,'UNKNOWN') AS age_range,
                    COALESCE(region,'UNKNOWN') AS region,
                    SUM(followers) AS followers
                FROM influencer_audience_agg
                WHERE tenant_id = ?
                GROUP BY gender, age_range, region");
        $stmt2->execute([$tenant]);
        $aud = $stmt2->fetchAll(PDO::FETCH_ASSOC);
        $audIndex = [];
        $audTotal = 0.0;
        foreach ($aud as $a) {
            $k = $a['gender'].'|'.$a['age_range'].'|'.$a['region'];
            $f = (float)($a['followers'] ?? 0);
            $audIndex[$k] = $f;
            $audTotal += $f;
        }
        if ($audTotal <= 0) $audTotal = 1.0;

        $out = [];
        foreach ($rows as $r) {
            $impr = (float)$r['impressions'];
            $clicks = (float)$r['clicks'];
            $spend = (float)$r['spend'];
            $conv = (float)$r['conversions'];
            $rev = (float)$r['revenue'];

            $ctr = $impr > 0 ? $clicks / $impr : 0.0;
            $cvr = $clicks > 0 ? $conv / $clicks : 0.0;
            $roas = $spend > 0 ? $rev / $spend : 0.0;

            $k = $r['gender'].'|'.$r['age_range'].'|'.$r['region'];
            $audShare = ($audIndex[$k] ?? 0.0) / $audTotal;

            // Heuristic "decisioning score": performance * reachable audience (no PII).
            $base = match ($metric) {
                'ctr' => $ctr,
                'cvr' => $cvr,
                'revenue' => $rev,
                'conversions' => $conv,
                default => $roas
            };
            // Audience-share bonus encourages segments where creator audience exists.
            $score = $base * (1.0 + (0.50 * $audShare));

            $out[] = [
                'gender' => $r['gender'],
                'age_range' => $r['age_range'],
                'region' => $r['region'],
                'impressions' => (int)$impr,
                'clicks' => (int)$clicks,
                'spend' => $spend,
                'conversions' => (int)$conv,
                'revenue' => $rev,
                'ctr' => $ctr,
                'cvr' => $cvr,
                'roas' => $roas,
                'influencer_audience_share' => $audShare,
                'score' => $score
            ];
        }

        usort($out, fn($a,$b) => ($b['score'] <=> $a['score']));
        $out = array_slice($out, 0, $limit);

        return TemplateResponder::respond($response, [
            'ok' => true,
            'tenant_id' => $tenant,
            'metric' => $metric,
            'platform' => $platform !== '' ? $platform : null,
            'since' => $since,
            'until' => $until,
            'segments' => $out
        ]);
    }

    public static function segmentAffinity(Request $request, Response $response, array $args): Response {
        $pdo = Db::pdo();
        $tenant = self::tenantId($request);

        $gender = (string)($args['gender'] ?? 'UNKNOWN');
        $age = (string)($args['age'] ?? 'UNKNOWN');
        $region = (string)($args['region'] ?? 'UNKNOWN');

        $q = $request->getQueryParams();
        $since = (string)($q['since'] ?? date('Y-m-d', strtotime('-30 days')));
        $until = (string)($q['until'] ?? date('Y-m-d'));
        $limit = max(1, min(200, (int)($q['limit'] ?? 20)));

        // Identify high-performing SKUs for this segment using ad-driven SKU signals when available.
        $stmt = $pdo->prepare("SELECT
                COALESCE(sku,'UNKNOWN') AS sku,
                SUM(conversions) AS conversions,
                SUM(revenue) AS revenue,
                SUM(spend) AS spend
            FROM ad_insight_agg
            WHERE tenant_id = ? AND date >= ? AND date <= ?
              AND COALESCE(gender,'UNKNOWN') = ?
              AND COALESCE(age_range,'UNKNOWN') = ?
              AND COALESCE(region,'UNKNOWN') = ?
            GROUP BY sku");
        $stmt->execute([$tenant,$since,$until,$gender,$age,$region]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        if (!is_array($rows)) $rows = [];

        $aff = [];
        foreach ($rows as $r) {
            $sku = (string)$r['sku'];
            $conv = (float)($r['conversions'] ?? 0);
            $rev = (float)($r['revenue'] ?? 0);
            $sp = (float)($r['spend'] ?? 0);
            $roas = $sp > 0 ? $rev / $sp : 0.0;
            $score = $rev + (50.0 * $conv) + (10.0 * $roas);
            $aff[$sku] = ['sku'=>$sku,'conversions'=>(int)$conv,'revenue'=>$rev,'spend'=>$sp,'roas'=>$roas,'score'=>$score];
        }

        // Fall back to commerce top SKUs if ad insights do not contain sku.
        if (count($aff) === 0) {
            $stmt2 = $pdo->prepare("SELECT sku, SUM(revenue) AS revenue, SUM(units) AS units, SUM(orders) AS orders
                FROM commerce_sku_day
                WHERE tenant_id = ? AND date >= ? AND date <= ?
                GROUP BY sku
                ORDER BY revenue DESC
                LIMIT ?");
            $stmt2->execute([$tenant,$since,$until,$limit]);
            $rows2 = $stmt2->fetchAll(PDO::FETCH_ASSOC);
            foreach ($rows2 as $r) {
                $aff[] = [
                    'sku' => (string)$r['sku'],
                    'revenue' => (float)$r['revenue'],
                    'units' => (int)$r['units'],
                    'orders' => (int)$r['orders'],
                    'note' => 'Fallback: commerce aggregates (segment-specific SKU signals unavailable)'
                ];
            }
            return TemplateResponder::respond($response, [
                'ok' => true,
                'tenant_id' => $tenant,
                'segment' => ['gender'=>$gender,'age_range'=>$age,'region'=>$region],
                'since' => $since,
                'until' => $until,
                'affinity' => $aff
            ]);
        }

        $affList = array_values($aff);
        usort($affList, fn($a,$b) => ($b['score'] <=> $a['score']));
        $affList = array_slice($affList, 0, $limit);

        return TemplateResponder::respond($response, [
            'ok' => true,
            'tenant_id' => $tenant,
            'segment' => ['gender'=>$gender,'age_range'=>$age,'region'=>$region],
            'since' => $since,
            'until' => $until,
            'affinity' => $affList
        ]);
    }

    public static function recommendations(Request $request, Response $response, array $args): Response {
        // A lightweight, explainable recommendations endpoint that stays within aggregate-only constraints.
        $pdo = Db::pdo();
        $tenant = self::tenantId($request);
        $q = $request->getQueryParams();
        $since = (string)($q['since'] ?? date('Y-m-d', strtotime('-30 days')));
        $until = (string)($q['until'] ?? date('Y-m-d'));
        $platform = (string)($q['platform'] ?? '');

        // Top segments by score
        $fakeReq = $request->withQueryParams(array_merge($q, ['metric'=>'roas','limit'=>10,'since'=>$since,'until'=>$until,'platform'=>$platform]));
        // Can't easily call segments() because of immutable PSR-7 interface differences across implementations.
        // We'll compute quickly here (reuse SQL but minimal).
        $where = 'tenant_id = ? AND date >= ? AND date <= ?';
        $params = [$tenant, $since, $until];
        if ($platform !== '') { $where .= ' AND platform = ?'; $params[] = $platform; }

        $stmt = $pdo->prepare("SELECT
                COALESCE(gender,'UNKNOWN') AS gender,
                COALESCE(age_range,'UNKNOWN') AS age_range,
                COALESCE(region,'UNKNOWN') AS region,
                SUM(clicks) AS clicks,
                SUM(spend) AS spend,
                SUM(conversions) AS conversions,
                SUM(revenue) AS revenue
            FROM ad_insight_agg
            WHERE $where
            GROUP BY gender, age_range, region");
        $stmt->execute($params);
        $seg = $stmt->fetchAll(PDO::FETCH_ASSOC);
        if (!is_array($seg)) $seg = [];

        $recs = [];
        foreach ($seg as $s) {
            $sp = (float)$s['spend']; $rev=(float)$s['revenue']; $conv=(float)$s['conversions']; $clicks=(float)$s['clicks'];
            $roas = $sp>0 ? $rev/$sp : 0.0;
            $cpa = $conv>0 ? $sp/$conv : null;
            $recs[] = [
                'segment' => ['gender'=>$s['gender'],'age_range'=>$s['age_range'],'region'=>$s['region']],
                'signals' => ['roas'=>$roas,'cpa'=>$cpa,'spend'=>$sp,'revenue'=>$rev,'conversions'=>(int)$conv,'clicks'=>(int)$clicks],
                'suggestions' => [
                    $roas >= 2.0 ? 'Scale budget cautiously (+10~20%) and test 1-2 new creatives for this segment.' :
                    ($roas >= 1.0 ? 'Optimize creatives/landing page; keep spend flat until ROAS improves.' :
                                    'Reduce spend and shift budget to higher-ROAS segments; refresh creatives.')
                ],
                'explainability' => [
                    'no_pii' => true,
                    'derived_from' => ['ad_insight_agg','influencer_audience_agg (optional)','commerce_sku_day (optional)'],
                    'note' => 'Recommendations are based on aggregated segment performance, not individual-level tracking.'
                ]
            ];
        }

        usort($recs, fn($a,$b) => ($b['signals']['roas'] <=> $a['signals']['roas']));
        $recs = array_slice($recs, 0, 10);

        return TemplateResponder::respond($response, [
            'ok' => true,
            'tenant_id' => $tenant,
            'since' => $since,
            'until' => $until,
            'platform' => $platform !== '' ? $platform : null,
            'recommendations' => $recs
        ]);
    }
}
