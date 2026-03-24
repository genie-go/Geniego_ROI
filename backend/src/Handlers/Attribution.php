<?php
declare(strict_types=1);

namespace Genie\Handlers;

use Genie\Db;
use Genie\TemplateResponder;
use PDO;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

/**
 * v419 Semi-Attribution Handler
 * Supports UTM / Coupon / Deeplink based attribution with confidence scoring.
 *
 * Confidence Score Rules (capped at 1.0):
 *   UTM source+medium+campaign fully matched  → +0.60
 *   UTM content or term present               → +0.10
 *   Coupon code matched to registered coupon  → +0.20
 *   Deeplink matched to registered template   → +0.15
 *   Each touch point within 7-day window      → +0.05 (max 3 touches)
 */
final class Attribution {

    private static function tenantId(Request $request): string {
        $tid = $request->getHeaderLine('X-Tenant-Id');
        return $tid !== '' ? $tid : 'demo';
    }

    // ── Coupons ────────────────────────────────────────────────────────────

    public static function createCoupon(Request $request, Response $response, array $args): Response {
        $pdo    = Db::pdo();
        $tenant = self::tenantId($request);
        $body   = (array)($request->getParsedBody() ?? []);

        $code    = trim((string)($body['code'] ?? ''));
        $channel = trim((string)($body['channel'] ?? ''));
        if ($code === '' || $channel === '') {
            return TemplateResponder::respond($response->withStatus(422), ['error' => 'code and channel required']);
        }

        $stmt = $pdo->prepare(
            'INSERT INTO attribution_coupon(tenant_id,code,channel,campaign,discount_type,note,created_at)
             VALUES(?,?,?,?,?,?,?)
             ON CONFLICT(tenant_id,code) DO UPDATE SET
               channel=excluded.channel, campaign=excluded.campaign,
               discount_type=excluded.discount_type, note=excluded.note'
        );
        $stmt->execute([
            $tenant, $code, $channel,
            $body['campaign'] ?? null,
            $body['discount_type'] ?? null,
            $body['note'] ?? null,
            gmdate('c'),
        ]);
        return TemplateResponder::respond($response, ['ok' => true, 'code' => $code, 'channel' => $channel]);
    }

    public static function listCoupons(Request $request, Response $response, array $args): Response {
        $pdo    = Db::pdo();
        $tenant = self::tenantId($request);
        $stmt   = $pdo->prepare('SELECT * FROM attribution_coupon WHERE tenant_id=? ORDER BY created_at DESC LIMIT 200');
        $stmt->execute([$tenant]);
        return TemplateResponder::respond($response, ['ok' => true, 'coupons' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
    }

    // ── Deeplinks ─────────────────────────────────────────────────────────

    public static function createDeeplink(Request $request, Response $response, array $args): Response {
        $pdo    = Db::pdo();
        $tenant = self::tenantId($request);
        $body   = (array)($request->getParsedBody() ?? []);

        $template = trim((string)($body['template'] ?? ''));
        $channel  = trim((string)($body['channel'] ?? ''));
        if ($template === '' || $channel === '') {
            return TemplateResponder::respond($response->withStatus(422), ['error' => 'template and channel required']);
        }

        $stmt = $pdo->prepare(
            'INSERT INTO attribution_deeplink(tenant_id,template,channel,campaign,note,created_at)
             VALUES(?,?,?,?,?,?)
             ON CONFLICT(tenant_id,template) DO UPDATE SET
               channel=excluded.channel, campaign=excluded.campaign, note=excluded.note'
        );
        $stmt->execute([$tenant, $template, $channel, $body['campaign'] ?? null, $body['note'] ?? null, gmdate('c')]);
        return TemplateResponder::respond($response, ['ok' => true, 'template' => $template, 'channel' => $channel]);
    }

    public static function listDeeplinks(Request $request, Response $response, array $args): Response {
        $pdo    = Db::pdo();
        $tenant = self::tenantId($request);
        $stmt   = $pdo->prepare('SELECT * FROM attribution_deeplink WHERE tenant_id=? ORDER BY created_at DESC LIMIT 200');
        $stmt->execute([$tenant]);
        return TemplateResponder::respond($response, ['ok' => true, 'deeplinks' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
    }

    // ── Touch Points ──────────────────────────────────────────────────────

    public static function recordTouch(Request $request, Response $response, array $args): Response {
        $pdo    = Db::pdo();
        $tenant = self::tenantId($request);
        $body   = (array)($request->getParsedBody() ?? []);

        $extra = $body;
        foreach (['session_id','order_id','channel','utm_source','utm_medium','utm_campaign','utm_content','utm_term','coupon_code','deeplink','touched_at'] as $k) {
            unset($extra[$k]);
        }

        $stmt = $pdo->prepare(
            'INSERT INTO attribution_touch
             (tenant_id,session_id,order_id,channel,utm_source,utm_medium,utm_campaign,
              utm_content,utm_term,coupon_code,deeplink,touched_at,extra_json)
             VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)'
        );
        $stmt->execute([
            $tenant,
            $body['session_id'] ?? null,
            $body['order_id']   ?? null,
            $body['channel']    ?? null,
            $body['utm_source'] ?? null,
            $body['utm_medium'] ?? null,
            $body['utm_campaign'] ?? null,
            $body['utm_content'] ?? null,
            $body['utm_term']   ?? null,
            $body['coupon_code'] ?? null,
            $body['deeplink']   ?? null,
            $body['touched_at'] ?? gmdate('c'),
            json_encode($extra, JSON_UNESCAPED_UNICODE),
        ]);
        return TemplateResponder::respond($response, ['ok' => true, 'touch_id' => (int)$pdo->lastInsertId()]);
    }

    // ── Scoring ───────────────────────────────────────────────────────────

    /**
     * POST /v419/attribution/score
     * Body: { order_id, utm_source?, utm_medium?, utm_campaign?, utm_content?, utm_term?,
     *         coupon_code?, deeplink? }
     * Returns confidence score 0–1 + evidence breakdown.
     */
    public static function score(Request $request, Response $response, array $args): Response {
        $pdo    = Db::pdo();
        $tenant = self::tenantId($request);
        $body   = (array)($request->getParsedBody() ?? []);

        $orderId  = trim((string)($body['order_id'] ?? ''));
        if ($orderId === '') {
            return TemplateResponder::respond($response->withStatus(422), ['error' => 'order_id required']);
        }

        $utmSrc  = trim((string)($body['utm_source']   ?? ''));
        $utmMed  = trim((string)($body['utm_medium']   ?? ''));
        $utmCamp = trim((string)($body['utm_campaign'] ?? ''));
        $utmCont = trim((string)($body['utm_content']  ?? ''));
        $utmTerm = trim((string)($body['utm_term']     ?? ''));
        $coupon  = strtoupper(trim((string)($body['coupon_code'] ?? '')));
        $deeplink = trim((string)($body['deeplink'] ?? ''));

        $score    = 0.0;
        $evidence = [];
        $attributedChannel = null;

        // 1. UTM full match
        if ($utmSrc !== '' && $utmMed !== '' && $utmCamp !== '') {
            $score += 0.60;
            $evidence['utm_full'] = [
                'matched' => true,
                'score_contribution' => 0.60,
                'details' => "utm_source={$utmSrc} utm_medium={$utmMed} utm_campaign={$utmCamp}",
            ];
            $attributedChannel = $attributedChannel ?? "{$utmSrc}/{$utmMed}";
        } elseif ($utmSrc !== '' || $utmMed !== '') {
            $score += 0.20;
            $evidence['utm_partial'] = ['matched' => true, 'score_contribution' => 0.20, 'details' => "partial utm"];
            $attributedChannel = $attributedChannel ?? ($utmSrc ?: $utmMed);
        }

        // 2. UTM content / term bonus
        if ($utmCont !== '' || $utmTerm !== '') {
            $score += 0.10;
            $evidence['utm_extra'] = ['matched' => true, 'score_contribution' => 0.10, 'details' => "content={$utmCont} term={$utmTerm}"];
        }

        // 3. Coupon match
        if ($coupon !== '') {
            $cStmt = $pdo->prepare('SELECT channel, campaign FROM attribution_coupon WHERE tenant_id=? AND code=?');
            $cStmt->execute([$tenant, $coupon]);
            $cRow = $cStmt->fetch(PDO::FETCH_ASSOC);
            if ($cRow) {
                $score += 0.20;
                $evidence['coupon'] = ['matched' => true, 'score_contribution' => 0.20, 'code' => $coupon, 'channel' => $cRow['channel'], 'campaign' => $cRow['campaign']];
                $attributedChannel  = $attributedChannel ?? (string)$cRow['channel'];
            } else {
                $evidence['coupon'] = ['matched' => false, 'score_contribution' => 0.00, 'code' => $coupon, 'note' => 'Code not registered'];
            }
        }

        // 4. Deeplink match
        if ($deeplink !== '') {
            $dlStmt = $pdo->prepare('SELECT channel, campaign FROM attribution_deeplink WHERE tenant_id=? AND ?  LIKE (template || \'%\')');
            $dlStmt->execute([$tenant, $deeplink]);
            $dlRow = $dlStmt->fetch(PDO::FETCH_ASSOC);
            if ($dlRow) {
                $score += 0.15;
                $evidence['deeplink'] = ['matched' => true, 'score_contribution' => 0.15, 'url' => $deeplink, 'channel' => $dlRow['channel']];
                $attributedChannel   = $attributedChannel ?? (string)$dlRow['channel'];
            } else {
                // prefix scan fallback
                $dlAll = $pdo->prepare('SELECT template, channel, campaign FROM attribution_deeplink WHERE tenant_id=?');
                $dlAll->execute([$tenant]);
                foreach ($dlAll->fetchAll(PDO::FETCH_ASSOC) as $dl) {
                    if (str_starts_with($deeplink, (string)$dl['template'])) {
                        $score += 0.15;
                        $evidence['deeplink'] = ['matched' => true, 'score_contribution' => 0.15, 'url' => $deeplink, 'channel' => $dl['channel']];
                        $attributedChannel    = $attributedChannel ?? (string)$dl['channel'];
                        break;
                    }
                }
                if (!isset($evidence['deeplink'])) {
                    $evidence['deeplink'] = ['matched' => false, 'score_contribution' => 0.00, 'url' => $deeplink];
                }
            }
        }

        // 5. Time-window touches (last 7 days)
        $since = gmdate('c', strtotime('-7 days'));
        $tStmt = $pdo->prepare(
            'SELECT COUNT(*) FROM attribution_touch WHERE tenant_id=? AND order_id=? AND touched_at>=?'
        );
        $tStmt->execute([$tenant, $orderId, $since]);
        $touchCount = (int)$tStmt->fetchColumn();
        if ($touchCount > 0) {
            $twBonus = min(3, $touchCount) * 0.05;
            $score  += $twBonus;
            $evidence['time_window'] = ['matched' => true, 'touches_7d' => $touchCount, 'score_contribution' => $twBonus];
        } else {
            $evidence['time_window'] = ['matched' => false, 'touches_7d' => 0, 'score_contribution' => 0.00];
        }

        $score = round(min(1.0, $score), 4);

        // Persist result
        $rStmt = $pdo->prepare(
            'INSERT INTO attribution_result(tenant_id,order_id,attributed_channel,confidence_score,evidence_json,model,created_at)
             VALUES(?,?,?,?,?,?,?)'
        );
        $rStmt->execute([
            $tenant, $orderId, $attributedChannel, $score,
            json_encode($evidence, JSON_UNESCAPED_UNICODE),
            'semi_rule_v1', gmdate('c'),
        ]);

        return TemplateResponder::respond($response, [
            'ok'                 => true,
            'order_id'           => $orderId,
            'attributed_channel' => $attributedChannel,
            'confidence_score'   => $score,
            'evidence'           => $evidence,
            'model'              => 'semi_rule_v1',
        ]);
    }

    // ── Results ───────────────────────────────────────────────────────────

    public static function results(Request $request, Response $response, array $args): Response {
        $pdo    = Db::pdo();
        $tenant = self::tenantId($request);
        $q      = $request->getQueryParams();
        $limit  = max(1, min(500, (int)($q['limit'] ?? 100)));
        $since  = (string)($q['since'] ?? date('Y-m-d', strtotime('-30 days')));
        $until  = (string)($q['until'] ?? date('Y-m-d'));

        $stmt = $pdo->prepare(
            'SELECT * FROM attribution_result WHERE tenant_id=? AND DATE(created_at)>=? AND DATE(created_at)<=?
             ORDER BY created_at DESC LIMIT ?'
        );
        $stmt->execute([$tenant, $since, $until, $limit]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        foreach ($rows as &$r) {
            $r['evidence'] = json_decode((string)($r['evidence_json'] ?? '{}'), true);
            unset($r['evidence_json']);
        }
        return TemplateResponder::respond($response, ['ok' => true, 'total' => count($rows), 'results' => $rows]);
    }

    // ── Summary ───────────────────────────────────────────────────────────

    public static function summary(Request $request, Response $response, array $args): Response {
        $pdo    = Db::pdo();
        $tenant = self::tenantId($request);
        $q      = $request->getQueryParams();
        $since  = (string)($q['since'] ?? date('Y-m-d', strtotime('-30 days')));
        $until  = (string)($q['until'] ?? date('Y-m-d'));

        $stmt = $pdo->prepare(
            'SELECT attributed_channel,
                    COUNT(*) AS orders,
                    ROUND(AVG(confidence_score),4) AS avg_confidence,
                    ROUND(MAX(confidence_score),4) AS max_confidence,
                    ROUND(MIN(confidence_score),4) AS min_confidence
             FROM attribution_result
             WHERE tenant_id=? AND DATE(created_at)>=? AND DATE(created_at)<=?
             GROUP BY attributed_channel
             ORDER BY orders DESC'
        );
        $stmt->execute([$tenant, $since, $until]);
        $channels = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $touch = $pdo->prepare(
            'SELECT channel, COUNT(*) AS touches
             FROM attribution_touch WHERE tenant_id=? AND DATE(touched_at)>=? AND DATE(touched_at)<=?
             GROUP BY channel ORDER BY touches DESC'
        );
        $touch->execute([$tenant, $since, $until]);

        return TemplateResponder::respond($response, [
            'ok'                => true,
            'since'             => $since,
            'until'             => $until,
            'channel_summary'   => $channels,
            'touch_by_channel'  => $touch->fetchAll(PDO::FETCH_ASSOC),
        ]);
    }
}
