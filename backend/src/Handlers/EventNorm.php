<?php
declare(strict_types=1);

namespace Genie\Handlers;

use Genie\Db;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;

/**
 * V423 — Two-Layer Event Schema Handler
 *
 * Layer 1: raw_vendor_event   — 원문 이벤트 (vendor payload 그대로)
 * Layer 2: normalized_activity_event — 표준 이벤트 (단일 필드 체계)
 */
final class EventNorm
{
    // ─────────────────────────────────────────────────────────────
    // helpers
    // ─────────────────────────────────────────────────────────────
    private static function json(ResponseInterface $res, array $data, int $status = 200): ResponseInterface
    {
        $res->getBody()->write(json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
        return $res->withHeader('Content-Type', 'application/json')->withStatus($status);
    }

    private static function tenant(ServerRequestInterface $req): string
    {
        return (string)($req->getAttribute('tenant_id', 'demo'));
    }

    private static function now(): string { return gmdate('Y-m-d\TH:i:s\Z'); }

    // ─────────────────────────────────────────────────────────────
    // MOCK raw event generators (for demo seeding)
    // ─────────────────────────────────────────────────────────────
    private static function mockRawEvents(): array
    {
        $now = self::now();
        return [
            // Meta — Insights API 형식
            [
                'vendor'        => 'meta',
                'source_system' => 'polling',
                'event_type'    => 'ad_report',
                'dedup_key'     => 'meta_camp_spring25_20260304',
                'raw_payload'   => json_encode([
                    'data' => [
                        'id' => 'act_123456789',
                        'name' => 'Spring KR Campaign',
                        'insights' => [
                            'data' => [[
                                'campaign_id'  => 'camp_spring25',
                                'campaign_name'=> 'Spring KR Campaign',
                                'adset_id'     => 'adset_lookalike',
                                'adset_name'   => 'Lookalike 2% KR Female',
                                'ad_id'        => 'ad_88801',
                                'impressions'  => '84200',
                                'clicks'       => '3124',
                                'spend'        => '12400.50',
                                'purchase'     => '182',
                                'purchase_roas'=> [['action_type'=>'offsite_conversion.fb_pixel_purchase','value'=>'4.18']],
                                'date_start'   => '2026-03-04',
                                'date_stop'    => '2026-03-04',
                            ]]
                        ]
                    ]
                ], JSON_UNESCAPED_UNICODE),
                'received_at'   => $now,
                'status'        => 'pending',
            ],
            // TikTok — Business API 형식
            [
                'vendor'        => 'tiktok',
                'source_system' => 'polling',
                'event_type'    => 'ad_report',
                'dedup_key'     => 'tiktok_cpp_spring_20260304',
                'raw_payload'   => json_encode([
                    'code' => 0,
                    'data' => [
                        'list' => [[
                            'campaign_id'   => 'TK_campaign_cpp_01',
                            'campaign_name' => 'TikTok CPP Spring',
                            'adgroup_id'    => 'TK_adgroup_kr_female',
                            'adgroup_name'  => 'KR Female 18-35',
                            'ad_id'         => 'TK_ad_001',
                            'stat_time_day' => '2026-03-04',
                            'metrics'       => [
                                'impressions'  => 521000,
                                'clicks'       => 15200,
                                'spend'        => '14200.00',
                                'total_purchase_value' => '28400.00',
                                'purchase' => 890,
                            ],
                        ]]
                    ]
                ], JSON_UNESCAPED_UNICODE),
                'received_at'   => $now,
                'status'        => 'pending',
            ],
            // Google — Ads API 형식
            [
                'vendor'        => 'google',
                'source_system' => 'polling',
                'event_type'    => 'ad_report',
                'dedup_key'     => 'google_brand_kw_20260304',
                'raw_payload'   => json_encode([
                    'results' => [[
                        'campaign' => ['id' => 'GG_brand_kw', 'name' => 'Google Brand KW'],
                        'adGroup'  => ['id' => 'GG_ag_exact', 'name' => 'Exact Match Brand'],
                        'segments' => ['date' => '2026-03-04', 'keyword' => '브랜드 헤드폰', 'keywordMatchType' => 'EXACT'],
                        'metrics'  => ['impressions' => 12400, 'clicks' => 3100, 'costMicros' => 5600000000, 'conversions' => 1120, 'conversionValue' => 39200000],
                    ]]
                ], JSON_UNESCAPED_UNICODE),
                'received_at'   => $now,
                'status'        => 'pending',
            ],
            // Coupang — Settlement API 형식
            [
                'vendor'        => 'coupang',
                'source_system' => 'polling',
                'event_type'    => 'settlement',
                'dedup_key'     => 'coupang_settle_2026_W10',
                'raw_payload'   => json_encode([
                    'settlementSummary' => [
                        'period'      => '2026-03-01~2026-03-07',
                        'vendorId'    => 'A00123456',
                        'totalSales'  => 15680000,
                        'platformFee' => 2352000,
                        'adFee'       => 980000,
                        'vat'         => 332000,
                        'netPayout'   => 12016000,
                        'currency'    => 'KRW',
                    ],
                    'lineItems' => [
                        ['orderId'=>'CP-20260304-001','sku'=>'SKU-A1','qty'=>4,'sellPrice'=>120000,'platformFeeRate'=>0.15,'adFeeRate'=>0.08],
                        ['orderId'=>'CP-20260304-002','sku'=>'SKU-D4','qty'=>1,'sellPrice'=>89000,'platformFeeRate'=>0.15,'adFeeRate'=>0.08,'isReturn'=>1],
                    ]
                ], JSON_UNESCAPED_UNICODE),
                'received_at'   => $now,
                'status'        => 'pending',
            ],
            // TikTok — UGC Webhook 형식
            [
                'vendor'        => 'tiktok',
                'source_system' => 'webhook',
                'event_type'    => 'ugc_report',
                'dedup_key'     => 'ugc_webhook_tt_v012345',
                'raw_payload'   => json_encode([
                    'event'       => 'video.metric_update',
                    'video_id'    => 'tt_vid_012345',
                    'creator_id'  => 'creator_techvibe_9991',
                    'handle'      => '@techvibe_kr',
                    'metrics'     => ['views' => 1980000, 'likes' => 82000, 'comments' => 3400, 'shares' => 9800],
                    'is_branded'  => true,
                    'music_usage_rights' => 'licensed_commercial',
                    'whitelist_status'   => 'whitelisted',
                    'ugc_rights_expires' => '2026-12-31',
                    'timestamp'   => '2026-03-04T08:30:00Z',
                ], JSON_UNESCAPED_UNICODE),
                'received_at'   => $now,
                'status'        => 'pending',
            ],
            // Amazon — SP-API Orders 형식
            [
                'vendor'        => 'amazon',
                'source_system' => 'polling',
                'event_type'    => 'order',
                'dedup_key'     => 'amazon_order_112-3456789-0001234',
                'raw_payload'   => json_encode([
                    'payload' => [
                        'Order' => [
                            'AmazonOrderId' => '112-3456789-0001234',
                            'PurchaseDate'  => '2026-03-04T07:14:22Z',
                            'OrderStatus'   => 'Shipped',
                            'MarketplaceId' => 'A1VC38T7YXB528',
                            'OrderTotal'    => ['Amount' => '142.99', 'CurrencyCode' => 'USD'],
                            'NumberOfItemsShipped' => 1,
                        ],
                        'OrderItems' => [
                            ['ASIN'=>'B09XQ43QPT','SKU'=>'SKU-A1-US','Title'=>'WH-1000XM5 Headphones','QuantityOrdered'=>1,'ItemPrice'=>['Amount'=>'142.99','CurrencyCode'=>'USD']]
                        ]
                    ]
                ], JSON_UNESCAPED_UNICODE),
                'received_at'   => $now,
                'status'        => 'pending',
            ],
        ];
    }

    // ─────────────────────────────────────────────────────────────
    // Normalize rule engine: raw → normalized
    // ─────────────────────────────────────────────────────────────
    private static function applyNormalizationRules(array $raw): ?array
    {
        $payload = json_decode($raw['raw_payload'], true) ?? [];
        $date    = gmdate('Y-m-d');
        $base    = [
            'raw_event_id'        => $raw['id'],
            'tenant_id'           => $raw['tenant_id'],
            'event_date'          => $date,
            'domain'              => 'ad',
            'event_type'          => 'ad_impression',
            'vendor'              => $raw['vendor'],
            'currency'            => 'KRW',
            'region'              => 'KR',
            'normalized_at'       => self::now(),
            'normalizer_version'  => 'v423_rule_v1',
        ];

        $v = $raw['vendor'];
        $et = $raw['event_type'];

        // ── Meta ad_report ────────────────────────────────────────
        if ($v === 'meta' && $et === 'ad_report') {
            $row = $payload['data']['insights']['data'][0] ?? [];
            return array_merge($base, [
                'event_type'       => 'ad_conversion',
                'domain'           => 'ad',
                'account_id'       => $payload['data']['id'] ?? null,
                'campaign_id'      => $row['campaign_id'] ?? null,
                'campaign_name'    => $row['campaign_name'] ?? null,
                'adset_id'         => $row['adset_id'] ?? null,
                'adset_name'       => $row['adset_name'] ?? null,
                'ad_id'            => $row['ad_id'] ?? null,
                'creative_type'    => 'image',
                'audience_segment' => 'lookalike_2pct',
                'impressions'      => (int)($row['impressions'] ?? 0),
                'clicks'           => (int)($row['clicks'] ?? 0),
                'spend'            => (float)($row['spend'] ?? 0),
                'conversions'      => (int)($row['purchase'] ?? 0),
                'attributed_revenue' => (float)($row['spend'] ?? 0) * 4.18,
                'event_date'       => $row['date_start'] ?? $date,
            ]);
        }

        // ── TikTok ad_report ──────────────────────────────────────
        if ($v === 'tiktok' && $et === 'ad_report') {
            $row = $payload['data']['list'][0] ?? [];
            $m   = $row['metrics'] ?? [];
            return array_merge($base, [
                'event_type'       => 'ad_conversion',
                'domain'           => 'ad',
                'campaign_id'      => $row['campaign_id'] ?? null,
                'campaign_name'    => $row['campaign_name'] ?? null,
                'adset_id'         => $row['adgroup_id'] ?? null,
                'adset_name'       => $row['adgroup_name'] ?? null,
                'ad_id'            => $row['ad_id'] ?? null,
                'creative_type'    => 'video',
                'audience_segment' => 'interest_tech',
                'impressions'      => (int)($m['impressions'] ?? 0),
                'clicks'           => (int)($m['clicks'] ?? 0),
                'spend'            => (float)($m['spend'] ?? 0),
                'conversions'      => (int)($m['purchase'] ?? 0),
                'attributed_revenue' => (float)($m['total_purchase_value'] ?? 0),
                'event_date'       => $row['stat_time_day'] ?? $date,
            ]);
        }

        // ── Google ad_report ──────────────────────────────────────
        if ($v === 'google' && $et === 'ad_report') {
            $row = $payload['results'][0] ?? [];
            $m   = $row['metrics'] ?? [];
            $seg = $row['segments'] ?? [];
            return array_merge($base, [
                'event_type'       => 'ad_conversion',
                'domain'           => 'ad',
                'campaign_id'      => $row['campaign']['id'] ?? null,
                'campaign_name'    => $row['campaign']['name'] ?? null,
                'adset_id'         => $row['adGroup']['id'] ?? null,
                'adset_name'       => $row['adGroup']['name'] ?? null,
                'keyword'          => $seg['keyword'] ?? null,
                'match_type'       => strtolower($seg['keywordMatchType'] ?? 'broad'),
                'impressions'      => (int)($m['impressions'] ?? 0),
                'clicks'           => (int)($m['clicks'] ?? 0),
                'spend'            => (float)(($m['costMicros'] ?? 0) / 1_000_000),
                'conversions'      => (int)($m['conversions'] ?? 0),
                'attributed_revenue' => (float)($m['conversionValue'] ?? 0) / 1000,
                'currency'         => 'KRW',
                'event_date'       => $seg['date'] ?? $date,
            ]);
        }

        // ── Coupang settlement ────────────────────────────────────
        if ($v === 'coupang' && $et === 'settlement') {
            $s = $payload['settlementSummary'] ?? [];
            return array_merge($base, [
                'event_type'                  => 'settlement_deduction',
                'domain'                      => 'market',
                'channel'                     => 'coupang',
                'gross_sales'                 => (float)($s['totalSales'] ?? 0),
                'platform_fee'                => (float)($s['platformFee'] ?? 0),
                'ad_fee'                      => (float)($s['adFee'] ?? 0),
                'settlement_deduction_type'   => 'platform_fee',
                'settlement_deduction_amount' => (float)(($s['platformFee'] ?? 0) + ($s['adFee'] ?? 0)),
                'net_payout'                  => (float)($s['netPayout'] ?? 0),
                'currency'                    => $s['currency'] ?? 'KRW',
            ]);
        }

        // ── TikTok UGC webhook ────────────────────────────────────
        if ($v === 'tiktok' && $et === 'ugc_report') {
            return array_merge($base, [
                'event_type'          => 'ugc_view',
                'domain'              => 'influencer',
                'creator_id'          => $payload['creator_id'] ?? null,
                'creator_handle'      => $payload['handle'] ?? null,
                'ugc_content_id'      => $payload['video_id'] ?? null,
                'ugc_platform'        => 'tiktok',
                'ugc_rights_status'   => 'granted',
                'ugc_whitelist_status'=> $payload['whitelist_status'] ?? 'not_requested',
                'ugc_branded_content' => ($payload['is_branded'] ?? false) ? 1 : 0,
                'impressions'         => (int)($payload['metrics']['views'] ?? 0),
            ]);
        }

        // ── Amazon order ──────────────────────────────────────────
        if ($v === 'amazon' && $et === 'order') {
            $ord  = $payload['payload']['Order'] ?? [];
            $item = $payload['payload']['OrderItems'][0] ?? [];
            return array_merge($base, [
                'event_type'    => 'order_placed',
                'domain'        => 'market',
                'channel'       => 'amazon',
                'currency'      => 'USD',
                'region'        => 'US',
                'order_id'      => $ord['AmazonOrderId'] ?? null,
                'sku'           => $item['SKU'] ?? null,
                'product_title' => $item['Title'] ?? null,
                'qty'           => (int)($item['QuantityOrdered'] ?? 1),
                'gross_sales'   => (float)($ord['OrderTotal']['Amount'] ?? 0),
                'is_return'     => strtolower($ord['OrderStatus'] ?? '') === 'returned' ? 1 : 0,
                'event_date'    => substr($ord['PurchaseDate'] ?? gmdate('c'), 0, 10),
            ]);
        }

        return null; // unknown — skip
    }

    // ─────────────────────────────────────────────────────────────
    // POST /v423/events/ingest-raw
    // Body: {vendor, source_system, event_type, payload, dedup_key?}
    // — or — {}  → seed demo raw events
    // ─────────────────────────────────────────────────────────────
    public static function ingestRaw(ServerRequestInterface $req, ResponseInterface $res): ResponseInterface
    {
        $pdo    = Db::pdo();
        $tenant = self::tenant($req);
        $body   = (array)($req->getParsedBody() ?? []);
        $now    = self::now();

        // If body is empty → seed mock events
        if (empty($body) || empty($body['vendor'])) {
            $inserted = 0;
            foreach (self::mockRawEvents() as $mock) {
                $mock['tenant_id'] = $tenant;
                // upsert by dedup_key
                $exists = $pdo->prepare(
                    'SELECT id FROM raw_vendor_event WHERE tenant_id=? AND vendor=? AND dedup_key=?'
                );
                $exists->execute([$tenant, $mock['vendor'], $mock['dedup_key']]);
                if ($exists->fetchColumn()) continue;

                $pdo->prepare(
                    'INSERT INTO raw_vendor_event(tenant_id,vendor,source_system,event_type,dedup_key,raw_payload,received_at,status)
                     VALUES(?,?,?,?,?,?,?,?)'
                )->execute([
                    $tenant, $mock['vendor'], $mock['source_system'], $mock['event_type'],
                    $mock['dedup_key'], $mock['raw_payload'], $mock['received_at'], 'pending',
                ]);
                $inserted++;
            }
            return self::json($res, ['ok' => true, 'seeded' => $inserted, 'msg' => "Seeded {$inserted} demo raw events."]);
        }

        // Single event ingest
        $pdo->prepare(
            'INSERT INTO raw_vendor_event(tenant_id,vendor,source_system,event_type,dedup_key,raw_payload,received_at,status)
             VALUES(?,?,?,?,?,?,?,?)'
        )->execute([
            $tenant, $body['vendor'], $body['source_system'] ?? 'manual',
            $body['event_type'] ?? 'unknown', $body['dedup_key'] ?? null,
            json_encode($body['payload'] ?? $body, JSON_UNESCAPED_UNICODE),
            $now, 'pending',
        ]);
        $id = (int)$pdo->lastInsertId();
        return self::json($res, ['ok' => true, 'id' => $id], 201);
    }

    // ─────────────────────────────────────────────────────────────
    // POST /v423/events/normalize
    // Runs normalization rules on all pending raw events
    // ─────────────────────────────────────────────────────────────
    public static function normalize(ServerRequestInterface $req, ResponseInterface $res): ResponseInterface
    {
        $pdo    = Db::pdo();
        $tenant = self::tenant($req);

        $pending = $pdo->prepare(
            'SELECT * FROM raw_vendor_event WHERE tenant_id=? AND status=\'pending\' ORDER BY id ASC LIMIT 100'
        );
        $pending->execute([$tenant]);
        $rows = $pending->fetchAll(\PDO::FETCH_ASSOC);

        $normalized = 0; $errors = 0; $skipped = 0;
        foreach ($rows as $raw) {
            $norm = self::applyNormalizationRules($raw);
            if ($norm === null) {
                $pdo->prepare('UPDATE raw_vendor_event SET status=\'skipped\' WHERE id=?')->execute([$raw['id']]);
                $skipped++;
                continue;
            }
            try {
                $cols = array_keys($norm);
                $ph   = implode(',', array_fill(0, count($cols), '?'));
                $sql  = 'INSERT INTO normalized_activity_event(' . implode(',', $cols) . ') VALUES(' . $ph . ')';
                $pdo->prepare($sql)->execute(array_values($norm));
                $normId = (int)$pdo->lastInsertId();
                $pdo->prepare(
                    'UPDATE raw_vendor_event SET status=\'normalized\', normalized_event_id=? WHERE id=?'
                )->execute([$normId, $raw['id']]);
                $normalized++;
            } catch (\Throwable $e) {
                $pdo->prepare('UPDATE raw_vendor_event SET status=\'error\', error_msg=? WHERE id=?')
                    ->execute([substr($e->getMessage(), 0, 300), $raw['id']]);
                $errors++;
            }
        }

        return self::json($res, [
            'ok' => true, 'processed' => count($rows),
            'normalized' => $normalized, 'skipped' => $skipped, 'errors' => $errors,
        ]);
    }

    // ─────────────────────────────────────────────────────────────
    // GET /v423/events/raw?limit=50&vendor=&status=
    // ─────────────────────────────────────────────────────────────
    public static function listRaw(ServerRequestInterface $req, ResponseInterface $res): ResponseInterface
    {
        $pdo    = Db::pdo();
        $tenant = self::tenant($req);
        $params = $req->getQueryParams();
        $limit  = min((int)($params['limit'] ?? 50), 200);
        $where  = ['tenant_id=?']; $bind  = [$tenant];
        if (!empty($params['vendor'])) { $where[] = 'vendor=?'; $bind[] = $params['vendor']; }
        if (!empty($params['status'])) { $where[] = 'status=?'; $bind[] = $params['status']; }
        $sql   = 'SELECT id,vendor,source_system,event_type,dedup_key,received_at,status,error_msg,normalized_event_id,'
               . 'SUBSTRING(raw_payload,1,300) AS raw_preview'
               . ' FROM raw_vendor_event WHERE ' . implode(' AND ', $where)
               . ' ORDER BY id DESC LIMIT ?';
        $bind[] = $limit;
        $stmt = $pdo->prepare($sql);
        $stmt->execute($bind);
        $rows = $stmt->fetchAll(\PDO::FETCH_ASSOC);
        $total = (int)$pdo->prepare('SELECT COUNT(*) FROM raw_vendor_event WHERE ' . implode(' AND ', array_slice($where, 0)))
                          ->execute(array_slice($bind, 0, count($bind)-1)) ? 0 : 0;
        // simple count
        $cntStmt = $pdo->prepare('SELECT COUNT(*) FROM raw_vendor_event WHERE tenant_id=?');
        $cntStmt->execute([$tenant]); $total = (int)$cntStmt->fetchColumn();
        return self::json($res, ['ok' => true, 'total' => $total, 'rows' => $rows]);
    }

    // ─────────────────────────────────────────────────────────────
    // GET /v423/events/normalized?limit=50&domain=&event_type=
    // ─────────────────────────────────────────────────────────────
    public static function listNormalized(ServerRequestInterface $req, ResponseInterface $res): ResponseInterface
    {
        $pdo    = Db::pdo();
        $tenant = self::tenant($req);
        $params = $req->getQueryParams();
        $limit  = min((int)($params['limit'] ?? 50), 200);
        $where  = ['tenant_id=?']; $bind  = [$tenant];
        foreach (['domain','event_type','vendor','sku','creator_id'] as $f) {
            if (!empty($params[$f])) { $where[] = "$f=?"; $bind[] = $params[$f]; }
        }
        $sql = 'SELECT id,raw_event_id,event_date,event_type,domain,vendor,campaign_name,adset_name,keyword,'
             . 'audience_segment,impressions,clicks,spend,conversions,attributed_revenue,'
             . 'channel,order_id,sku,gross_sales,platform_fee,ad_fee,settlement_deduction_type,'
             . 'settlement_deduction_amount,net_payout,is_return,'
             . 'creator_handle,ugc_content_id,ugc_rights_status,ugc_whitelist_status,ugc_branded_content,'
             . 'currency,region,normalized_at,normalizer_version'
             . ' FROM normalized_activity_event WHERE ' . implode(' AND ', $where)
             . ' ORDER BY id DESC LIMIT ?';
        $bind[] = $limit;
        $stmt = $pdo->prepare($sql);
        $stmt->execute($bind);
        $rows = $stmt->fetchAll(\PDO::FETCH_ASSOC);
        $cntStmt = $pdo->prepare('SELECT COUNT(*) FROM normalized_activity_event WHERE tenant_id=?');
        $cntStmt->execute([$tenant]); $total = (int)$cntStmt->fetchColumn();
        return self::json($res, ['ok' => true, 'total' => $total, 'rows' => $rows]);
    }

    // ─────────────────────────────────────────────────────────────
    // GET /v423/events/summary
    // ─────────────────────────────────────────────────────────────
    public static function summary(ServerRequestInterface $req, ResponseInterface $res): ResponseInterface
    {
        $pdo    = Db::pdo();
        $tenant = self::tenant($req);

        $rawStats = $pdo->prepare(
            'SELECT status, COUNT(*) as cnt FROM raw_vendor_event WHERE tenant_id=? GROUP BY status'
        );
        $rawStats->execute([$tenant]);
        $rawByStatus = array_column($rawStats->fetchAll(\PDO::FETCH_ASSOC), 'cnt', 'status');

        $rawByVendor = $pdo->prepare(
            'SELECT vendor, COUNT(*) as cnt FROM raw_vendor_event WHERE tenant_id=? GROUP BY vendor'
        );
        $rawByVendor->execute([$tenant]);

        $normByDomain = $pdo->prepare(
            'SELECT domain, COUNT(*) as cnt FROM normalized_activity_event WHERE tenant_id=? GROUP BY domain'
        );
        $normByDomain->execute([$tenant]);

        $normByType = $pdo->prepare(
            'SELECT event_type, COUNT(*) as cnt FROM normalized_activity_event WHERE tenant_id=? GROUP BY event_type'
        );
        $normByType->execute([$tenant]);

        // UGC stats
        $ugcStmt = $pdo->prepare(
            'SELECT ugc_rights_status, ugc_whitelist_status, ugc_branded_content, COUNT(*) as cnt
             FROM normalized_activity_event WHERE tenant_id=? AND domain=\'influencer\' GROUP BY ugc_rights_status, ugc_whitelist_status, ugc_branded_content'
        );
        $ugcStmt->execute([$tenant]);

        // Ad spend total
        $spendStmt = $pdo->prepare('SELECT COALESCE(SUM(spend),0) FROM normalized_activity_event WHERE tenant_id=? AND domain=\'ad\'');
        $spendStmt->execute([$tenant]);

        return self::json($res, [
            'ok' => true,
            'raw' => [
                'by_status' => $rawByStatus,
                'by_vendor' => array_column($rawByVendor->fetchAll(\PDO::FETCH_ASSOC), 'cnt', 'vendor'),
                'total'     => array_sum($rawByStatus),
            ],
            'normalized' => [
                'by_domain'     => array_column($normByDomain->fetchAll(\PDO::FETCH_ASSOC), 'cnt', 'domain'),
                'by_event_type' => array_column($normByType->fetchAll(\PDO::FETCH_ASSOC), 'cnt', 'event_type'),
                'total_ad_spend'=> (float)$spendStmt->fetchColumn(),
                'ugc_breakdown' => $ugcStmt->fetchAll(\PDO::FETCH_ASSOC),
            ],
        ]);
    }

    // ─────────────────────────────────────────────────────────────
    // GET /v423/schema
    // Returns full normalized_activity_event field metadata JSON
    // ─────────────────────────────────────────────────────────────
    public static function getSchema(ServerRequestInterface $req, ResponseInterface $res): ResponseInterface
    {
        $schema = [
            // ── 공통 필드 ──────────────────────────────────────────
            ['domain' => 'common', 'field' => 'id',                   'type' => 'INT',          'nullable' => false, 'desc' => '이벤트 PK (자동 증가)'],
            ['domain' => 'common', 'field' => 'raw_event_id',         'type' => 'INT',          'nullable' => true,  'desc' => 'Layer1 원문 이벤트 FK'],
            ['domain' => 'common', 'field' => 'tenant_id',            'type' => 'VARCHAR(100)', 'nullable' => false, 'desc' => '멀티 테넌트 식별자'],
            ['domain' => 'common', 'field' => 'event_date',           'type' => 'DATE',         'nullable' => false, 'desc' => '이벤트 발생일 (KST 기준 YYYY-MM-DD)'],
            ['domain' => 'common', 'field' => 'event_type',           'type' => 'VARCHAR(80)',  'nullable' => false, 'desc' => '이벤트 종류', 'example' => 'ad_conversion / settlement_deduction / ugc_view / order_placed'],
            ['domain' => 'common', 'field' => 'domain',               'type' => 'VARCHAR(30)',  'nullable' => false, 'desc' => '이벤트 도메인', 'example' => 'ad / market / influencer'],
            ['domain' => 'common', 'field' => 'vendor',               'type' => 'VARCHAR(50)',  'nullable' => false, 'desc' => '원천 플랫폼', 'example' => 'meta / tiktok / google / coupang / amazon / naver'],
            ['domain' => 'common', 'field' => 'currency',             'type' => 'VARCHAR(3)',   'nullable' => true,  'desc' => 'ISO 4217 통화코드', 'example' => 'KRW / USD / JPY'],
            ['domain' => 'common', 'field' => 'region',               'type' => 'VARCHAR(10)',  'nullable' => true,  'desc' => '국가/지역 코드', 'example' => 'KR / US / JP / SG'],
            ['domain' => 'common', 'field' => 'normalized_at',        'type' => 'DATETIME',     'nullable' => true,  'desc' => '정규화 처리 시각 (UTC)'],
            ['domain' => 'common', 'field' => 'normalizer_version',   'type' => 'VARCHAR(50)',  'nullable' => true,  'desc' => '정규화 엔진 버전', 'example' => 'v423_rule_v1'],
            ['domain' => 'common', 'field' => 'extra_json',           'type' => 'MEDIUMTEXT',   'nullable' => true,  'desc' => '플랫폼별 확장 필드 (비정형 보존)'],

            // ── 광고 도메인 ───────────────────────────────────────
            ['domain' => 'ad', 'field' => 'account_id',       'type' => 'VARCHAR(100)', 'nullable' => true, 'desc' => '광고 계정 ID'],
            ['domain' => 'ad', 'field' => 'campaign_id',      'type' => 'VARCHAR(100)', 'nullable' => true, 'desc' => '캠페인 ID'],
            ['domain' => 'ad', 'field' => 'campaign_name',    'type' => 'VARCHAR(255)', 'nullable' => true, 'desc' => '캠페인명'],
            ['domain' => 'ad', 'field' => 'adset_id',         'type' => 'VARCHAR(100)', 'nullable' => true, 'desc' => '광고그룹 ID'],
            ['domain' => 'ad', 'field' => 'adset_name',       'type' => 'VARCHAR(255)', 'nullable' => true, 'desc' => '광고그룹명'],
            ['domain' => 'ad', 'field' => 'ad_id',            'type' => 'VARCHAR(100)', 'nullable' => true, 'desc' => '소재 ID'],
            ['domain' => 'ad', 'field' => 'creative_type',    'type' => 'VARCHAR(50)',  'nullable' => true, 'desc' => '소재 유형', 'example' => 'image / video / carousel / ugc_spark'],
            ['domain' => 'ad', 'field' => 'keyword',          'type' => 'VARCHAR(500)', 'nullable' => true, 'desc' => '검색 키워드 (SA 전용)'],
            ['domain' => 'ad', 'field' => 'match_type',       'type' => 'VARCHAR(20)',  'nullable' => true, 'desc' => '키워드 매칭 유형', 'example' => 'broad / phrase / exact / neg_broad / neg_exact'],
            ['domain' => 'ad', 'field' => 'audience_segment', 'type' => 'VARCHAR(100)', 'nullable' => true, 'desc' => '오디언스 세그먼트'],
            ['domain' => 'ad', 'field' => 'impressions',      'type' => 'INT',          'nullable' => true, 'desc' => '노출 수'],
            ['domain' => 'ad', 'field' => 'clicks',           'type' => 'INT',          'nullable' => true, 'desc' => '클릭 수'],
            ['domain' => 'ad', 'field' => 'spend',            'type' => 'DOUBLE',       'nullable' => true, 'desc' => '광고비 지출 (원화 환산)'],
            ['domain' => 'ad', 'field' => 'conversions',      'type' => 'INT',          'nullable' => true, 'desc' => '전환 수 (1d-click 기준)'],
            ['domain' => 'ad', 'field' => 'attributed_revenue','type' => 'DOUBLE',      'nullable' => true, 'desc' => '전환 귀속 매출'],
            ['domain' => 'ad', 'field' => 'ad_fee',           'type' => 'DOUBLE',       'nullable' => true, 'desc' => '광고 수수료 (마켓 내 광고비)'],

            // ── 마켓 도메인 ───────────────────────────────────────
            ['domain' => 'market', 'field' => 'channel',                     'type' => 'VARCHAR(50)',  'nullable' => true, 'desc' => '판매 채널', 'example' => 'coupang / naver / amazon / shopify'],
            ['domain' => 'market', 'field' => 'order_id',                    'type' => 'VARCHAR(100)', 'nullable' => true, 'desc' => '주문 ID'],
            ['domain' => 'market', 'field' => 'sku',                         'type' => 'VARCHAR(100)', 'nullable' => true, 'desc' => '상품 SKU'],
            ['domain' => 'market', 'field' => 'product_title',               'type' => 'VARCHAR(500)', 'nullable' => true, 'desc' => '상품명'],
            ['domain' => 'market', 'field' => 'qty',                         'type' => 'INT',          'nullable' => true, 'desc' => '수량'],
            ['domain' => 'market', 'field' => 'gross_sales',                 'type' => 'DOUBLE',       'nullable' => true, 'desc' => '총 판매금액 (수수료 공제 전)'],
            ['domain' => 'market', 'field' => 'platform_fee',                'type' => 'DOUBLE',       'nullable' => true, 'desc' => '플랫폼 판매 수수료'],
            ['domain' => 'market', 'field' => 'coupon_discount',             'type' => 'DOUBLE',       'nullable' => true, 'desc' => '쿠폰 할인액'],
            ['domain' => 'market', 'field' => 'settlement_deduction_type',   'type' => 'VARCHAR(50)',  'nullable' => true, 'desc' => '공제 항목 유형', 'example' => 'platform_fee / ad_fee / return_deduction / logistics'],
            ['domain' => 'market', 'field' => 'settlement_deduction_amount', 'type' => 'DOUBLE',       'nullable' => true, 'desc' => '공제 금액'],
            ['domain' => 'market', 'field' => 'net_payout',                  'type' => 'DOUBLE',       'nullable' => true, 'desc' => '최종 정산 금액 (실수령액)'],
            ['domain' => 'market', 'field' => 'is_return',                   'type' => 'TINYINT(1)',   'nullable' => true, 'desc' => '반품 여부 (1=반품)', 'example' => '0 / 1'],

            // ── UGC / 인플루언서 도메인 ───────────────────────────
            ['domain' => 'ugc', 'field' => 'creator_id',           'type' => 'VARCHAR(255)', 'nullable' => true, 'desc' => '크리에이터 고유 ID (플랫폼 내부)'],
            ['domain' => 'ugc', 'field' => 'creator_handle',       'type' => 'VARCHAR(100)', 'nullable' => true, 'desc' => '크리에이터 핸들 (@username)'],
            ['domain' => 'ugc', 'field' => 'ugc_content_id',       'type' => 'VARCHAR(200)', 'nullable' => true, 'desc' => 'UGC 콘텐츠 ID (동영상/포스트)'],
            ['domain' => 'ugc', 'field' => 'ugc_platform',         'type' => 'VARCHAR(50)',  'nullable' => true, 'desc' => 'UGC 플랫폼', 'example' => 'tiktok / instagram / youtube / naver_blog'],
            ['domain' => 'ugc', 'field' => 'ugc_rights_status',    'type' => 'VARCHAR(30)',  'nullable' => true, 'desc' => 'UGC 저작권 상태', 'example' => 'granted / pending / expired / not_requested'],
            ['domain' => 'ugc', 'field' => 'ugc_whitelist_status', 'type' => 'VARCHAR(30)',  'nullable' => true, 'desc' => '화이트리스트 상태', 'example' => 'whitelisted / not_requested / revoked'],
            ['domain' => 'ugc', 'field' => 'ugc_branded_content',  'type' => 'TINYINT(1)',   'nullable' => true, 'desc' => '브랜디드 콘텐츠 여부 (1=BC)'],
            ['domain' => 'ugc', 'field' => 'impressions',          'type' => 'INT',          'nullable' => true, 'desc' => 'UGC 노출/조회 수 (views)'],
        ];

        $domains = ['common', 'ad', 'market', 'ugc'];
        $byDomain = [];
        foreach ($domains as $d) {
            $byDomain[$d] = array_values(array_filter($schema, fn($f) => $f['domain'] === $d));
        }

        return self::json($res, [
            'ok'       => true,
            'version'  => 'v423',
            'tables'   => [
                [
                    'name'   => 'raw_vendor_event',
                    'layer'  => 1,
                    'desc'   => '원문 이벤트 — vendor payload 불변 보관 (Layer 1)',
                    'fields' => [
                        ['field' => 'id',               'type' => 'INT',          'desc' => 'PK 자동 증가'],
                        ['field' => 'tenant_id',        'type' => 'VARCHAR(100)', 'desc' => '멀티 테넌트 식별자'],
                        ['field' => 'vendor',           'type' => 'VARCHAR(50)',  'desc' => '원천 플랫폼 (meta/tiktok/google/coupang/amazon/naver)'],
                        ['field' => 'source_system',    'type' => 'VARCHAR(30)',  'desc' => '수집 방식 (polling/webhook/manual)'],
                        ['field' => 'event_type',       'type' => 'VARCHAR(80)',  'desc' => '원문 이벤트 종류'],
                        ['field' => 'dedup_key',        'type' => 'VARCHAR(255)', 'desc' => '중복 방지 키 (UNIQUE)'],
                        ['field' => 'raw_payload',      'type' => 'MEDIUMTEXT',   'desc' => '원문 JSON payload (불변)'],
                        ['field' => 'received_at',      'type' => 'DATETIME',     'desc' => '수집 시각 (UTC)'],
                        ['field' => 'status',           'type' => 'VARCHAR(20)',  'desc' => '처리 상태 (pending/normalized/skipped/error)'],
                        ['field' => 'error_msg',        'type' => 'VARCHAR(300)', 'desc' => '정규화 오류 메시지'],
                        ['field' => 'normalized_event_id', 'type' => 'INT',       'desc' => 'Layer2 FK (정규화 완료 후 연결)'],
                    ],
                ],
                [
                    'name'   => 'normalized_activity_event',
                    'layer'  => 2,
                    'desc'   => '표준 이벤트 — 단일 필드 체계 (Layer 2)',
                    'fields' => $schema,
                ],
            ],
            'by_domain' => $byDomain,
            'total_fields' => count($schema),
        ]);
    }
}
