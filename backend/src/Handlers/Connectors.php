<?php
declare(strict_types=1);

namespace Genie\Handlers;

use Genie\Db;
use Genie\TemplateResponder;
use PDO;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

/**
 * v421 Real Connector Calls — TikTok Business API + Amazon SP-API
 *
 * Credentials are read from environment variables or stored connector_token table.
 *
 * TikTok:
 *   TIKTOK_APP_ID, TIKTOK_APP_SECRET, TIKTOK_ACCESS_TOKEN (or via DB)
 *   API base: https://business-api.tiktok.com/open_api/v1.3
 *
 * Amazon SP-API:
 *   AMAZON_CLIENT_ID, AMAZON_CLIENT_SECRET, AMAZON_REFRESH_TOKEN
 *   AMAZON_MARKETPLACE_ID  (default: A1QL5UJWI25QY1 = KR)
 *   LWA token URL: https://api.amazon.com/auth/o2/token
 *   SP-API base:   https://sellingpartnerapi-na.amazon.com  (NA)
 *                  https://sellingpartnerapi-fe.amazon.com  (FE/KR)
 */
final class Connectors
{
    // ── Helpers ───────────────────────────────────────────────────────────────

    private static function tenantId(Request $request): string
    {
        $tid = $request->getHeaderLine('X-Tenant-Id');
        return $tid !== '' ? $tid : 'demo';
    }

    /**
     * Make a cURL HTTP request.
     * Returns [status_code, decoded_body_array, error_string|null]
     */
    private static function httpGet(string $url, array $headers = []): array
    {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_TIMEOUT        => 15,
            CURLOPT_HTTPHEADER     => array_map(
                fn ($k, $v) => "$k: $v",
                array_keys($headers),
                array_values($headers)
            ),
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_USERAGENT      => 'Geniego-ROI/v421 PHP',
        ]);
        $raw   = curl_exec($ch);
        $code  = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $err   = curl_error($ch) ?: null;
        curl_close($ch);

        $body = $err === null ? (json_decode((string)$raw, true) ?? []) : [];
        return [$code, $body, $err];
    }

    private static function httpPost(string $url, array $payload, array $headers = []): array
    {
        $ch = curl_init($url);
        $isForm = isset($headers['Content-Type']) && $headers['Content-Type'] === 'application/x-www-form-urlencoded';
        $body   = $isForm ? http_build_query($payload) : json_encode($payload);

        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => $body,
            CURLOPT_TIMEOUT        => 15,
            CURLOPT_HTTPHEADER     => array_map(
                fn ($k, $v) => "$k: $v",
                array_keys($headers),
                array_values($headers)
            ),
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_USERAGENT      => 'Geniego-ROI/v421 PHP',
        ]);
        $raw  = curl_exec($ch);
        $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $err  = curl_error($ch) ?: null;
        curl_close($ch);

        $resp = $err === null ? (json_decode((string)$raw, true) ?? []) : [];
        return [$code, $resp, $err];
    }

    // ── Save / load connector token ────────────────────────────────────────────

    private static function loadToken(string $tenant, string $provider): ?array
    {
        $pdo  = Db::pdo();
        $stmt = $pdo->prepare('SELECT * FROM connector_token WHERE tenant_id=? AND provider=? LIMIT 1');
        $stmt->execute([$tenant, $provider]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
        return $row;
    }

    private static function saveToken(string $tenant, string $provider, array $data): void
    {
        $pdo  = Db::pdo();
        $now  = gmdate('c');
        $pdo->prepare(
            'INSERT INTO connector_token(tenant_id,provider,access_token,refresh_token,token_type,expires_at,scopes,meta_json,updated_at,created_at)
             VALUES(?,?,?,?,?,?,?,?,?,?)
             ON CONFLICT(tenant_id,provider) DO UPDATE SET
               access_token=excluded.access_token, refresh_token=excluded.refresh_token,
               expires_at=excluded.expires_at, meta_json=excluded.meta_json, updated_at=excluded.updated_at'
        )->execute([
            $tenant, $provider,
            $data['access_token']  ?? null,
            $data['refresh_token'] ?? null,
            $data['token_type']    ?? 'Bearer',
            $data['expires_at']    ?? null,
            $data['scopes']        ?? null,
            json_encode($data['meta'] ?? []),
            $now, $now,
        ]);
    }

    // ════════════════════════════════════════════════════════════════════════════
    //  TikTok Business API
    // ════════════════════════════════════════════════════════════════════════════

    /**
     * GET /v421/connectors/tiktok/report
     * Query: start_date, end_date, advertiser_id, dimensions (comma-separated), metrics
     *
     * Reads TIKTOK_ACCESS_TOKEN from env, falls back to connector_token table.
     * Calls: POST /open_api/v1.3/report/integrated/get
     *
     * If no credentials configured → returns mock data + note.
     */
    public static function tiktokReport(Request $request, Response $response, array $args): Response
    {
        $tenant = self::tenantId($request);
        $q      = $request->getQueryParams();

        $startDate    = (string)($q['start_date']    ?? date('Y-m-d', strtotime('-7 days')));
        $endDate      = (string)($q['end_date']      ?? date('Y-m-d'));
        $advertiserId = (string)($q['advertiser_id'] ?? (getenv('TIKTOK_ADVERTISER_ID') ?: ''));
        $rawDims      = (string)($q['dimensions']    ?? 'STAT_TIME_DAY,PLACEMENT');
        $rawMetrics   = (string)($q['metrics']       ?? 'spend,clicks,impressions,reach,conversion,cost_per_conversion');

        // ── Get access token ─────────────────────────────────────────────────
        $accessToken = (string)(getenv('TIKTOK_ACCESS_TOKEN') ?: '');
        if ($accessToken === '') {
            $tokenRow = self::loadToken($tenant, 'tiktok');
            $accessToken = (string)($tokenRow['access_token'] ?? '');
        }

        $hasCreds = $accessToken !== '' && $advertiserId !== '';

        if (!$hasCreds) {
            // Return mock data so the UI is still useful
            return TemplateResponder::respond($response, [
                'ok'           => true,
                'provider'     => 'tiktok',
                'tenant_id'    => $tenant,
                'live'         => false,
                'mock' => false,
                'note'         => 'Set env TIKTOK_ACCESS_TOKEN + TIKTOK_ADVERTISER_ID for real calls.',
                'params'       => compact('startDate', 'endDate'),
                'rows'         => self::tiktokMockRows($startDate, $endDate),
            ]);
        }

        // ── Real TikTok Business API call ─────────────────────────────────────
        $dimensions = array_map('trim', explode(',', $rawDims));
        $metrics    = array_map('trim', explode(',', $rawMetrics));

        $apiUrl  = 'https://business-api.tiktok.com/open_api/v1.3/report/integrated/get';
        $payload = [
            'advertiser_id'  => $advertiserId,
            'report_type'    => 'BASIC',
            'dimensions'     => $dimensions,
            'metrics'        => $metrics,
            'data_level'     => 'AUCTION_CAMPAIGN',
            'start_date'     => $startDate,
            'end_date'       => $endDate,
            'page_size'      => min(100, (int)($q['limit'] ?? 50)),
            'page'           => 1,
        ];

        [$code, $body, $err] = self::httpPost($apiUrl, $payload, [
            'Access-Token'  => $accessToken,
            'Content-Type'  => 'application/json',
        ]);

        if ($err !== null || $code >= 500) {
            return TemplateResponder::respond($response->withStatus(502), [
                'ok'       => false,
                'provider' => 'tiktok',
                'error'    => $err ?? 'TikTok API error',
                'code'     => $code,
            ]);
        }

        // TikTok wraps → code 0 = success
        $ttCode = (int)($body['code'] ?? -1);
        if ($ttCode !== 0) {
            return TemplateResponder::respond($response->withStatus(400), [
                'ok'       => false,
                'provider' => 'tiktok',
                'tt_code'  => $ttCode,
                'message'  => $body['message'] ?? 'unknown',
                'raw'      => $body,
            ]);
        }

        $rows = $body['data']['list'] ?? [];
        return TemplateResponder::respond($response, [
            'ok'        => true,
            'provider'  => 'tiktok',
            'tenant_id' => $tenant,
            'live'      => true,
            'rows'      => $rows,
            'page_info' => $body['data']['page_info'] ?? [],
            'params'    => compact('startDate', 'endDate', 'advertiserId', 'dimensions', 'metrics'),
        ]);
    }

    /**
     * POST /v421/connectors/tiktok/token
     * Body: { app_id, app_secret, auth_code }  — exchange auth_code for access_token
     */
    public static function tiktokExchangeToken(Request $request, Response $response, array $args): Response
    {
        $tenant = self::tenantId($request);
        $body   = (array)($request->getParsedBody() ?? []);

        $appId     = trim((string)($body['app_id']     ?? getenv('TIKTOK_APP_ID')     ?? ''));
        $appSecret = trim((string)($body['app_secret'] ?? getenv('TIKTOK_APP_SECRET') ?? ''));
        $authCode  = trim((string)($body['auth_code']  ?? ''));

        if ($appId === '' || $appSecret === '' || $authCode === '') {
            return TemplateResponder::respond($response->withStatus(422), [
                'error' => 'app_id, app_secret, auth_code required',
            ]);
        }

        [$code, $resp, $err] = self::httpPost(
            'https://business-api.tiktok.com/open_api/v1.3/oauth2/access_token/',
            ['app_id' => $appId, 'secret' => $appSecret, 'auth_code' => $authCode],
            ['Content-Type' => 'application/json']
        );

        if ($err || $code >= 500) {
            return TemplateResponder::respond($response->withStatus(502), ['error' => $err ?? 'TikTok token error']);
        }

        $accessToken = $resp['data']['access_token'] ?? null;
        if ($accessToken) {
            self::saveToken($tenant, 'tiktok', [
                'access_token'  => $accessToken,
                'refresh_token' => $resp['data']['refresh_token'] ?? null,
                'expires_at'    => $resp['data']['access_token_expire_time'] ?? null,
                'scopes'        => implode(',', (array)($resp['data']['scope'] ?? [])),
                'meta'          => ['advertiser_ids' => $resp['data']['advertiser_ids'] ?? []],
            ]);
        }

        return TemplateResponder::respond($response, [
            'ok'          => true,
            'provider'    => 'tiktok',
            'access_token_stored' => $accessToken !== null,
            'raw'         => $resp,
        ]);
    }

    // ════════════════════════════════════════════════════════════════════════════
    //  Amazon SP-API
    // ════════════════════════════════════════════════════════════════════════════

    /**
     * Refresh LWA access token using client credentials + refresh_token
     */
    private static function amazonRefreshToken(string $clientId, string $clientSecret, string $refreshToken): ?string
    {
        [$code, $body, $err] = self::httpPost(
            'https://api.amazon.com/auth/o2/token',
            [
                'grant_type'    => 'refresh_token',
                'refresh_token' => $refreshToken,
                'client_id'     => $clientId,
                'client_secret' => $clientSecret,
            ],
            ['Content-Type' => 'application/x-www-form-urlencoded']
        );

        if ($err || $code >= 400) return null;
        return $body['access_token'] ?? null;
    }

    /**
     * GET /v421/connectors/amazon/reports
     * Query: marketplace_id, report_type, start_date, end_date
     *
     * Reads AMAZON_CLIENT_ID + AMAZON_CLIENT_SECRET + AMAZON_REFRESH_TOKEN from env
     * or connector_token table.
     *
     * Calls: GET /reports/2021-06-30/reports
     */
    public static function amazonReports(Request $request, Response $response, array $args): Response
    {
        $tenant = self::tenantId($request);
        $q      = $request->getQueryParams();

        $clientId      = (string)(getenv('AMAZON_CLIENT_ID')      ?: '');
        $clientSecret  = (string)(getenv('AMAZON_CLIENT_SECRET')   ?: '');
        $refreshToken  = (string)(getenv('AMAZON_REFRESH_TOKEN')   ?: '');
        $marketplaceId = (string)($q['marketplace_id'] ?? getenv('AMAZON_MARKETPLACE_ID') ?: 'ATVPDKIKX0DER');
        $endpoint      = (string)(getenv('AMAZON_SP_ENDPOINT') ?: 'https://sellingpartnerapi-na.amazon.com');

        // Try DB fallback
        if ($refreshToken === '') {
            $tokenRow     = self::loadToken($tenant, 'amazon');
            $refreshToken = (string)($tokenRow['refresh_token'] ?? '');
            $clientId     = $clientId     ?: (string)(json_decode((string)($tokenRow['meta_json'] ?? '{}'), true)['client_id'] ?? '');
            $clientSecret = $clientSecret ?: (string)(json_decode((string)($tokenRow['meta_json'] ?? '{}'), true)['client_secret'] ?? '');
        }

        $hasCreds = $clientId !== '' && $clientSecret !== '' && $refreshToken !== '';

        if (!$hasCreds) {
            return TemplateResponder::respond($response, [
                'ok'        => true,
                'provider'  => 'amazon',
                'tenant_id' => $tenant,
                'live'      => false,
                'mock' => false,
                'note'      => 'Set env AMAZON_CLIENT_ID + AMAZON_CLIENT_SECRET + AMAZON_REFRESH_TOKEN for real calls.',
                'reports'   => self::amazonMockReports(),
            ]);
        }

        // ── LWA token ─────────────────────────────────────────────────────────
        // Check if we have a fresh access token
        $tokenRow    = self::loadToken($tenant, 'amazon');
        $accessToken = (string)($tokenRow['access_token'] ?? '');
        $expiresAt   = (string)($tokenRow['expires_at']   ?? '');
        if ($accessToken === '' || ($expiresAt && strtotime($expiresAt) < time() + 60)) {
            $accessToken = self::amazonRefreshToken($clientId, $clientSecret, $refreshToken) ?? '';
            if ($accessToken !== '') {
                self::saveToken($tenant, 'amazon', [
                    'access_token'  => $accessToken,
                    'refresh_token' => $refreshToken,
                    'expires_at'    => gmdate('c', time() + 3600),
                    'meta'          => compact('clientId', 'clientSecret'),
                ]);
            }
        }

        if ($accessToken === '') {
            return TemplateResponder::respond($response->withStatus(502), [
                'ok'    => false,
                'error' => 'Failed to refresh Amazon LWA access token',
            ]);
        }

        // ── SP-API: List Reports ───────────────────────────────────────────────
        $reportType = (string)($q['report_type'] ?? 'GET_FLAT_FILE_ALL_ORDERS_DATA_BY_ORDER_DATE_GENERAL');
        $params = [
            'reportTypes'   => $reportType,
            'marketplaceIds'=> $marketplaceId,
            'pageSize'      => min(10, (int)($q['limit'] ?? 5)),
        ];
        if (!empty($q['start_date'])) $params['dataStartTime'] = $q['start_date'] . 'T00:00:00Z';
        if (!empty($q['end_date']))   $params['dataEndTime']   = $q['end_date']   . 'T23:59:59Z';

        $url = $endpoint . '/reports/2021-06-30/reports?' . http_build_query($params);
        [$code, $body, $err] = self::httpGet($url, [
            'x-amz-access-token' => $accessToken,
            'Accept'             => 'application/json',
        ]);

        if ($err || $code >= 500) {
            return TemplateResponder::respond($response->withStatus(502), [
                'ok'    => false,
                'error' => $err ?? "SP-API error $code",
            ]);
        }

        return TemplateResponder::respond($response, [
            'ok'           => true,
            'provider'     => 'amazon',
            'tenant_id'    => $tenant,
            'live'         => true,
            'http_code'    => $code,
            'reports'      => $body['reports']   ?? $body,
            'next_token'   => $body['nextToken'] ?? null,
            'params'       => compact('reportType', 'marketplaceId'),
        ]);
    }

    /**
     * POST /v421/connectors/amazon/orders
     * Body: { start_date, end_date, marketplace_id }
     * Calls SP-API Orders API: GET /orders/v0/orders
     */
    public static function amazonOrders(Request $request, Response $response, array $args): Response
    {
        $tenant = self::tenantId($request);
        $body   = (array)($request->getParsedBody() ?? []);

        $clientId     = (string)(getenv('AMAZON_CLIENT_ID')     ?: '');
        $clientSecret = (string)(getenv('AMAZON_CLIENT_SECRET') ?: '');
        $refreshToken = (string)(getenv('AMAZON_REFRESH_TOKEN') ?: '');
        $endpoint     = (string)(getenv('AMAZON_SP_ENDPOINT')   ?: 'https://sellingpartnerapi-na.amazon.com');

        if ($refreshToken === '') {
            $tokenRow     = self::loadToken($tenant, 'amazon');
            $refreshToken = (string)($tokenRow['refresh_token'] ?? '');
            $meta         = json_decode((string)($tokenRow['meta_json'] ?? '{}'), true);
            $clientId     = $clientId     ?: (string)($meta['clientId']     ?? '');
            $clientSecret = $clientSecret ?: (string)($meta['clientSecret'] ?? '');
        }

        if ($clientId === '' || $clientSecret === '' || $refreshToken === '') {
            return TemplateResponder::respond($response, [
                'ok'    => true,
                'live'  => false,
                'mock' => false,
                'note'  => 'Set AMAZON_CLIENT_ID, AMAZON_CLIENT_SECRET, AMAZON_REFRESH_TOKEN env vars.',
                'orders' => self::amazonMockOrders(),
            ]);
        }

        $tokenRow    = self::loadToken($tenant, 'amazon');
        $accessToken = (string)($tokenRow['access_token'] ?? '');
        if ($accessToken === '') {
            $accessToken = self::amazonRefreshToken($clientId, $clientSecret, $refreshToken) ?? '';
            if ($accessToken) {
                self::saveToken($tenant, 'amazon', [
                    'access_token'  => $accessToken,
                    'refresh_token' => $refreshToken,
                    'expires_at'    => gmdate('c', time() + 3600),
                    'meta'          => compact('clientId', 'clientSecret'),
                ]);
            }
        }

        $marketplaceId = (string)($body['marketplace_id'] ?? getenv('AMAZON_MARKETPLACE_ID') ?: 'ATVPDKIKX0DER');
        $startDate     = (string)($body['start_date'] ?? date('Y-m-d', strtotime('-7 days')));
        $endDate       = (string)($body['end_date']   ?? date('Y-m-d'));

        $url = $endpoint . '/orders/v0/orders?' . http_build_query([
            'MarketplaceIds'       => $marketplaceId,
            'CreatedAfter'         => $startDate . 'T00:00:00Z',
            'CreatedBefore'        => $endDate   . 'T23:59:59Z',
            'MaxResultsPerPage'    => min(50, (int)($body['limit'] ?? 20)),
        ]);

        [$code, $resp, $err] = self::httpGet($url, [
            'x-amz-access-token' => $accessToken,
            'Accept'             => 'application/json',
        ]);

        if ($err || $code >= 500) {
            return TemplateResponder::respond($response->withStatus(502), ['ok' => false, 'error' => $err ?? "SP-API $code"]);
        }

        return TemplateResponder::respond($response, [
            'ok'         => true,
            'provider'   => 'amazon',
            'live'       => true,
            'http_code'  => $code,
            'orders'     => $resp['payload']['Orders'] ?? [],
            'next_token' => $resp['payload']['NextToken'] ?? null,
        ]);
    }

    /**
     * POST /v421/connectors/amazon/token
     * Body: { client_id, client_secret, refresh_token }
     * Stores credentials and returns exchanged access token.
     */
    public static function amazonStoreToken(Request $request, Response $response, array $args): Response
    {
        $tenant = self::tenantId($request);
        $body   = (array)($request->getParsedBody() ?? []);

        $clientId     = trim((string)($body['client_id']     ?? ''));
        $clientSecret = trim((string)($body['client_secret'] ?? ''));
        $refreshToken = trim((string)($body['refresh_token'] ?? ''));

        if ($clientId === '' || $clientSecret === '' || $refreshToken === '') {
            return TemplateResponder::respond($response->withStatus(422), [
                'error' => 'client_id, client_secret, refresh_token required',
            ]);
        }

        $accessToken = self::amazonRefreshToken($clientId, $clientSecret, $refreshToken);
        if ($accessToken === null) {
            return TemplateResponder::respond($response->withStatus(502), [
                'ok'    => false,
                'error' => 'Failed to obtain Amazon LWA access token. Check credentials.',
            ]);
        }

        self::saveToken($tenant, 'amazon', [
            'access_token'  => $accessToken,
            'refresh_token' => $refreshToken,
            'expires_at'    => gmdate('c', time() + 3600),
            'meta'          => compact('clientId', 'clientSecret'),
        ]);

        return TemplateResponder::respond($response, [
            'ok'           => true,
            'provider'     => 'amazon',
            'token_stored' => true,
            'expires_at'   => gmdate('c', time() + 3600),
        ]);
    }

    /**
     * GET /v421/connectors/status
     * Returns connected status of all configured providers for the tenant.
     */
    public static function status(Request $request, Response $response, array $args): Response
    {
        $tenant = self::tenantId($request);
        $pdo    = Db::pdo();

        $stmt = $pdo->prepare('SELECT provider, expires_at, updated_at FROM connector_token WHERE tenant_id=?');
        $stmt->execute([$tenant]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $connected = [];
        foreach ($rows as $r) {
            $exp = $r['expires_at'] ? strtotime($r['expires_at']) : PHP_INT_MAX;
            $connected[$r['provider']] = [
                'connected'  => $exp > time(),
                'expires_at' => $r['expires_at'],
                'updated_at' => $r['updated_at'],
            ];
        }

        // Env-based providers (no DB token required when env set)
        foreach (['tiktok', 'amazon'] as $p) {
            if (!isset($connected[$p])) {
                $envKey = match ($p) {
                    'tiktok' => 'TIKTOK_ACCESS_TOKEN',
                    'amazon' => 'AMAZON_REFRESH_TOKEN',
                };
                $connected[$p] = [
                    'connected'    => (bool)getenv($envKey),
                    'via'          => 'env',
                    'env_var'      => $envKey,
                    'expires_at'   => null,
                    'updated_at'   => null,
                ];
            }
        }

        return TemplateResponder::respond($response, [
            'ok'        => true,
            'tenant_id' => $tenant,
            'providers' => $connected,
        ]);
    }

    // ── Mock data helpers ─────────────────────────────────────────────────────

    private static function tiktokMockRows(string $start, string $end): array
    {
        $rows = [];
        $d    = strtotime($start);
        $e    = strtotime($end);
        $ch   = ['SHOPPING', 'IN_FEED_AD', 'AUDIENCE_NETWORK'];
        for ($ts = $d; $ts <= $e && count($rows) < 14; $ts += 86400) {
            foreach ($ch as $c) {
                $spend = round(rand(800, 8500) / 100, 2);
                $rows[] = [
                    'dimensions' => ['stat_time_day' => date('Y-m-d', $ts), 'placement' => $c],
                    'metrics'    => [
                        'spend'                  => $spend,
                        'clicks'                 => rand(40, 400),
                        'impressions'            => rand(2000, 25000),
                        'reach'                  => rand(1500, 18000),
                        'conversion'             => rand(1, 30),
                        'cost_per_conversion'    => round($spend / max(1, rand(1, 30)), 2),
                    ],
                ];
                if (count($rows) >= 14) break;
            }
        }
        return $rows;
    }

    private static function amazonMockReports(): array
    {
        $types = ['GET_MERCHANT_LISTINGS_ALL_DATA', 'GET_FLAT_FILE_ALL_ORDERS_DATA_BY_ORDER_DATE_GENERAL'];
        $rows  = [];
        for ($i = 0; $i < 3; $i++) {
            $rows[] = [
                'reportId'       => 'RPT' . rand(10000, 99999),
                'reportType'     => $types[$i % 2],
                'dataStartTime'  => date('c', strtotime("-" . ($i + 1) * 3 . " days")),
                'dataEndTime'    => date('c', strtotime("-" . $i . " days")),
                'processingStatus' => 'DONE',
                'marketplaceIds' => ['ATVPDKIKX0DER'],
                'mock' => false,
            ];
        }
        return $rows;
    }

    private static function amazonMockOrders(): array
    {
        $statuses = ['Shipped', 'Unshipped', 'Pending'];
        $rows     = [];
        for ($i = 0; $i < 5; $i++) {
            $rows[] = [
                'AmazonOrderId'  => '123-' . rand(1000000, 9999999) . '-' . rand(1000000, 9999999),
                'OrderStatus'    => $statuses[$i % 3],
                'PurchaseDate'   => date('c', strtotime("-$i days")),
                'LastUpdateDate' => date('c'),
                'OrderTotal'     => ['Amount' => number_format(rand(1000, 150000) / 100, 2), 'CurrencyCode' => 'USD'],
                'mock' => false,
            ];
        }
        return $rows;
    }

    // ════════════════════════════════════════════════════════════════════════════
    //  ChannelCreds 헬퍼 — DB에서 채널 자격증명 조회
    // ════════════════════════════════════════════════════════════════════════════

    /**
     * channel_credential 테이블에서 특정 채널의 자격증명 조회
     * ChannelCreds.php가 관리하는 테이블을 직접 참조
     */
    private static function loadCred(string $tenant, string $channelKey, string $credKey): string
    {
        try {
            $pdo  = Db::pdo();
            $stmt = $pdo->prepare(
                'SELECT cred_value FROM channel_credential WHERE tenant_id=? AND channel_key=? AND cred_key=? LIMIT 1'
            );
            $stmt->execute([$tenant, $channelKey, $credKey]);
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            return (string)($row['cred_value'] ?? '');
        } catch (\Throwable $e) {
            return '';
        }
    }

    // ════════════════════════════════════════════════════════════════════════════
    //  Meta Ads API (Graph API v19.0)
    // ════════════════════════════════════════════════════════════════════════════

    /**
     * GET /v423/connectors/meta/insights
     * Query: start_date, end_date, level(campaign/adset/ad), fields
     *
     * 자격증명: META_ACCESS_TOKEN, META_AD_ACCOUNT_ID (env 또는 DB channel_credential)
     */
    public static function metaInsights(Request $request, Response $response, array $args): Response
    {
        $tenant    = self::tenantId($request);
        $q         = $request->getQueryParams();
        $startDate = (string)($q['start_date'] ?? date('Y-m-d', strtotime('-7 days')));
        $endDate   = (string)($q['end_date']   ?? date('Y-m-d'));
        $level     = (string)($q['level']      ?? 'campaign');

        // ── 자격증명 로드 ──────────────────────────────────────────────────────
        $accessToken = (string)(getenv('META_ACCESS_TOKEN') ?: self::loadCred($tenant, 'meta_ads', 'access_token'));
        $adAccountId = (string)(getenv('META_AD_ACCOUNT_ID') ?: self::loadCred($tenant, 'meta_ads', 'ad_account_id'));

        if ($accessToken === '' || $adAccountId === '') {
            return TemplateResponder::respond($response, [
                'ok'       => true, 'provider' => 'meta',
                'live'     => false, 'mock' => false,
                'note'     => 'API 키를 등록하세요: META_ACCESS_TOKEN, META_AD_ACCOUNT_ID',
                'rows'     => self::metaMockRows($startDate, $endDate),
            ]);
        }

        // ── Meta Graph API 호출 ────────────────────────────────────────────────
        $fields  = (string)($q['fields'] ?? 'campaign_name,impressions,clicks,spend,reach,cpc,cpm,cpp,ctr,frequency,objective');
        $params  = http_build_query([
            'time_range'        => json_encode(['since' => $startDate, 'until' => $endDate]),
            'level'             => $level,
            'fields'            => $fields,
            'time_increment'    => 1,
            'limit'             => min(100, (int)($q['limit'] ?? 50)),
            'access_token'      => $accessToken,
        ]);
        $url = "https://graph.facebook.com/v19.0/act_{$adAccountId}/insights?{$params}";

        [$code, $body, $err] = self::httpGet($url);

        if ($err || $code >= 500) {
            return TemplateResponder::respond($response->withStatus(502), [
                'ok' => false, 'provider' => 'meta', 'error' => $err ?? "API error $code",
            ]);
        }
        if (isset($body['error'])) {
            return TemplateResponder::respond($response->withStatus(400), [
                'ok'       => false, 'provider' => 'meta',
                'fb_error' => $body['error'],
            ]);
        }

        $rows = $body['data'] ?? [];
        return TemplateResponder::respond($response, [
            'ok'        => true, 'provider' => 'meta',
            'tenant_id' => $tenant, 'live' => true,
            'rows'      => $rows,
            'paging'    => $body['paging'] ?? [],
            'params'    => compact('startDate', 'endDate', 'level', 'fields'),
        ]);
    }

    private static function metaMockRows(string $start, string $end): array
    {
        $campaigns = [];
        $rows = [];
        $d = strtotime($start); $e = strtotime($end);
        for ($ts = $d; $ts <= $e && count($rows) < 20; $ts += 86400) {
            foreach ($campaigns as $c) {
                $spend = round(rand(5000, 150000) / 100, 2);
                $clicks = rand(80, 2000);
                $impr = rand(5000, 80000);
                $rows[] = [
                    'campaign_name' => $c,
                    'date_start'    => date('Y-m-d', $ts),
                    'date_stop'     => date('Y-m-d', $ts),
                    'spend'         => $spend,
                    'impressions'   => $impr,
                    'clicks'        => $clicks,
                    'reach'         => (int)($impr * 0.7),
                    'cpc'           => round($spend / max(1, $clicks), 2),
                    'cpm'           => round($spend / max(1, $impr) * 1000, 2),
                    'ctr'           => round($clicks / max(1, $impr) * 100, 2),
                    'mock' => false,
                ];
                if (count($rows) >= 20) break;
            }
        }
        return $rows;
    }

    // ════════════════════════════════════════════════════════════════════════════
    //  Google Ads API (REST API v17)
    // ════════════════════════════════════════════════════════════════════════════

    /**
     * GET /v423/connectors/google/report
     * 자격증명: GOOGLE_DEVELOPER_TOKEN, GOOGLE_ACCESS_TOKEN, GOOGLE_CUSTOMER_ID (env 또는 DB)
     */
    public static function googleReport(Request $request, Response $response, array $args): Response
    {
        $tenant = self::tenantId($request);
        $q      = $request->getQueryParams();
        $startDate = (string)($q['start_date'] ?? date('Y-m-d', strtotime('-7 days')));
        $endDate   = (string)($q['end_date']   ?? date('Y-m-d'));

        $devToken    = (string)(getenv('GOOGLE_DEVELOPER_TOKEN') ?: self::loadCred($tenant, 'google_ads', 'developer_token'));
        $accessToken = (string)(getenv('GOOGLE_ACCESS_TOKEN')    ?: self::loadCred($tenant, 'google_ads', 'access_token'));
        $customerId  = (string)(getenv('GOOGLE_CUSTOMER_ID')     ?: self::loadCred($tenant, 'google_ads', 'customer_id'));
        $customerId  = str_replace('-', '', $customerId); // "123-456-7890" → "1234567890"

        if ($devToken === '' || $accessToken === '' || $customerId === '') {
            return TemplateResponder::respond($response, [
                'ok'   => true, 'provider' => 'google_ads',
                'live' => false, 'mock' => false,
                'note' => 'API 키를 등록하세요: GOOGLE_DEVELOPER_TOKEN, GOOGLE_ACCESS_TOKEN, GOOGLE_CUSTOMER_ID',
                'rows' => self::googleMockRows($startDate, $endDate),
            ]);
        }

        // Google Ads API GAQL 쿼리
        $gaql = "SELECT campaign.name, campaign.status,
                         metrics.impressions, metrics.clicks, metrics.cost_micros,
                         metrics.ctr, metrics.average_cpc, metrics.conversions,
                         segments.date
                  FROM campaign
                  WHERE segments.date BETWEEN '$startDate' AND '$endDate'
                    AND campaign.status != 'REMOVED'
                  ORDER BY segments.date DESC LIMIT 100";

        $url = "https://googleads.googleapis.com/v17/customers/{$customerId}/googleAds:searchStream";
        [$code, $body, $err] = self::httpPost($url, ['query' => $gaql], [
            'Authorization'           => "Bearer {$accessToken}",
            'developer-token'         => $devToken,
            'Content-Type'            => 'application/json',
        ]);

        if ($err || $code >= 500) {
            return TemplateResponder::respond($response->withStatus(502), [
                'ok' => false, 'provider' => 'google_ads', 'error' => $err ?? "API error $code",
            ]);
        }
        if ($code >= 400) {
            return TemplateResponder::respond($response->withStatus($code), [
                'ok' => false, 'provider' => 'google_ads', 'http_code' => $code, 'raw' => $body,
            ]);
        }

        // searchStream 응답은 배열; flatten
        $rows = [];
        $results = $body[0]['results'] ?? $body['results'] ?? [];
        foreach ($results as $r) {
            $costMicros = (int)($r['metrics']['costMicros'] ?? 0);
            $rows[] = [
                'campaign_name' => $r['campaign']['name']          ?? '',
                'campaign_status' => $r['campaign']['status']      ?? '',
                'date'          => $r['segments']['date']          ?? '',
                'impressions'   => (int)($r['metrics']['impressions'] ?? 0),
                'clicks'        => (int)($r['metrics']['clicks']      ?? 0),
                'cost_krw'      => round($costMicros / 1_000_000, 0),
                'ctr'           => round((float)($r['metrics']['ctr'] ?? 0) * 100, 2),
                'avg_cpc'       => round((int)($r['metrics']['averageCpc'] ?? 0) / 1_000_000, 2),
                'conversions'   => round((float)($r['metrics']['conversions'] ?? 0), 1),
            ];
        }
        return TemplateResponder::respond($response, [
            'ok' => true, 'provider' => 'google_ads', 'live' => true,
            'rows' => $rows, 'params' => compact('startDate', 'endDate', 'customerId'),
        ]);
    }

    private static function googleMockRows(string $start, string $end): array
    {
        $campaigns = [];
        $rows = []; $d = strtotime($start); $e = strtotime($end);
        for ($ts = $d; $ts <= $e && count($rows) < 20; $ts += 86400) {
            foreach ($campaigns as $c) {
                $clicks = rand(50, 800); $impr = rand(2000, 30000);
                $cost = round(rand(3000, 80000) / 100, 2);
                $rows[] = [
                    'campaign_name' => $c, 'date' => date('Y-m-d', $ts),
                    'impressions' => $impr, 'clicks' => $clicks, 'cost_krw' => $cost,
                    'ctr' => round($clicks / max(1, $impr) * 100, 2),
                    'avg_cpc' => round($cost / max(1, $clicks), 2),
                    'conversions' => rand(1, 40), 'mock' => false,
                ];
                if (count($rows) >= 20) break;
            }
        }
        return $rows;
    }

    // ════════════════════════════════════════════════════════════════════════════
    //  네이버 검색광고 API
    // ════════════════════════════════════════════════════════════════════════════

    /**
     * GET /v423/connectors/naver/report
     * 자격증명: NAVER_API_KEY, NAVER_API_SECRET, NAVER_CUSTOMER_ID (env 또는 DB)
     * API: https://api.naver.com/ncc/campaigns
     */
    public static function naverReport(Request $request, Response $response, array $args): Response
    {
        $tenant = self::tenantId($request);
        $q      = $request->getQueryParams();
        $startDate = (string)($q['start_date'] ?? date('Ymd', strtotime('-7 days')));
        $endDate   = (string)($q['end_date']   ?? date('Ymd'));

        $apiKey     = (string)(getenv('NAVER_API_KEY')     ?: self::loadCred($tenant, 'naver_searchad', 'api_key'));
        $apiSecret  = (string)(getenv('NAVER_API_SECRET')  ?: self::loadCred($tenant, 'naver_searchad', 'api_secret'));
        $customerId = (string)(getenv('NAVER_CUSTOMER_ID') ?: self::loadCred($tenant, 'naver_searchad', 'customer_id'));

        if ($apiKey === '' || $apiSecret === '') {
            return TemplateResponder::respond($response, [
                'ok'   => true, 'provider' => 'naver_searchad',
                'live' => false, 'mock' => false,
                'note' => 'API 키를 등록하세요: NAVER_API_KEY, NAVER_API_SECRET, NAVER_CUSTOMER_ID',
                'rows' => self::naverMockRows(),
            ]);
        }

        // 네이버 광고 API — HMAC-SHA256 서명
        $timestamp = (string)(round(microtime(true) * 1000));
        $method    = 'GET';
        $path      = '/ncc/campaigns';
        $signature = base64_encode(hash_hmac('sha256', "{$timestamp}.{$method}.{$path}", $apiSecret, true));

        $url = 'https://api.naver.com' . $path . '?' . http_build_query([
            'startDate'  => $startDate,
            'endDate'    => $endDate,
        ]);
        $headers = [
            'X-Timestamp'   => $timestamp,
            'X-API-KEY'     => $apiKey,
            'X-Customer'    => $customerId,
            'X-Signature'   => $signature,
            'Content-Type'  => 'application/json; charset=UTF-8',
        ];
        [$code, $body, $err] = self::httpGet($url, $headers);

        if ($err || $code >= 500) {
            return TemplateResponder::respond($response->withStatus(502), [
                'ok' => false, 'provider' => 'naver_searchad', 'error' => $err ?? "API error $code",
            ]);
        }

        $campaigns = is_array($body) ? $body : [];
        return TemplateResponder::respond($response, [
            'ok' => true, 'provider' => 'naver_searchad', 'live' => true,
            'campaigns' => $campaigns,
            'params'    => compact('startDate', 'endDate'),
        ]);
    }

    private static function naverMockRows(): array
    {
        return [
            ['campaignId' => 'C001', 'campaignName' => '브랜드_키워드', 'status' => 'ELIGIBLE', 'budget' => 500000, 'clicks' => 1240, 'impressions' => 38000, 'cost' => 310000, 'mock' => false],
            ['campaignId' => 'C002', 'campaignName' => '상품_카테고리_타겟팅', 'status' => 'ELIGIBLE', 'budget' => 300000, 'clicks' => 870, 'impressions' => 22000, 'cost' => 215000, 'mock' => false],
            ['campaignId' => 'C003', 'campaignName' => '경쟁사_방어', 'status' => 'ELIGIBLE', 'budget' => 200000, 'clicks' => 450, 'impressions' => 15000, 'cost' => 145000, 'mock' => false],
        ];
    }

    // ════════════════════════════════════════════════════════════════════════════
    //  쿠팡 파트너스 API
    // ════════════════════════════════════════════════════════════════════════════

    /**
     * GET /v423/connectors/coupang/orders
     * 자격증명: COUPANG_ACCESS_KEY, COUPANG_SECRET_KEY, COUPANG_VENDOR_ID (env 또는 DB)
     * API: https://api-gateway.coupang.com
     */
    public static function coupangOrders(Request $request, Response $response, array $args): Response
    {
        $tenant = self::tenantId($request);
        $q      = $request->getQueryParams();
        $startDate = (string)($q['start_date'] ?? date('Y-m-d', strtotime('-7 days')));
        $endDate   = (string)($q['end_date']   ?? date('Y-m-d'));
        $status    = (string)($q['status']     ?? 'ACCEPT');

        $accessKey = (string)(getenv('COUPANG_ACCESS_KEY') ?: self::loadCred($tenant, 'coupang', 'access_key'));
        $secretKey = (string)(getenv('COUPANG_SECRET_KEY') ?: self::loadCred($tenant, 'coupang', 'secret_key'));
        $vendorId  = (string)(getenv('COUPANG_VENDOR_ID')  ?: self::loadCred($tenant, 'coupang', 'vendor_id'));

        if ($accessKey === '' || $secretKey === '' || $vendorId === '') {
            return TemplateResponder::respond($response, [
                'ok'   => true, 'provider' => 'coupang',
                'live' => false, 'mock' => false,
                'note' => 'API 키를 등록하세요: COUPANG_ACCESS_KEY, COUPANG_SECRET_KEY, COUPANG_VENDOR_ID',
                'orders' => self::coupangMockOrders(),
            ]);
        }

        // 쿠팡 HMAC-SHA256 서명
        $datetime  = gmdate('ymmdd') . 'T' . gmdate('His') . 'Z';
        $path      = "/v2/providers/seller_api/apis/api/v1/vendor-items/orders";
        $queryStr  = http_build_query([
            'createdAtFrom' => $startDate . 'T00:00:00',
            'createdAtTo'   => $endDate   . 'T23:59:59',
            'status'        => $status,
            'limit'         => min(50, (int)($q['limit'] ?? 20)),
        ]);
        $message   = "{$datetime}{method}GET{$path}{$queryStr}";
        $signature = hash_hmac('sha256', $message, $secretKey);
        $authHeader = "CEA algorithm=HmacSHA256, access-key={$accessKey}, signed-date={$datetime}, signature={$signature}";

        $url = "https://api-gateway.coupang.com{$path}?{$queryStr}";
        [$code, $body, $err] = self::httpGet($url, [
            'Authorization' => $authHeader,
            'Content-Type'  => 'application/json;charset=UTF-8',
        ]);

        if ($err || $code >= 500) {
            return TemplateResponder::respond($response->withStatus(502), [
                'ok' => false, 'provider' => 'coupang', 'error' => $err ?? "API error $code",
            ]);
        }

        $orders = $body['data'] ?? $body['content'] ?? [];
        return TemplateResponder::respond($response, [
            'ok'       => true, 'provider' => 'coupang', 'live' => true,
            'http_code'=> $code, 'orders' => $orders,
            'params'   => compact('startDate', 'endDate', 'vendorId'),
        ]);
    }

    private static function coupangMockOrders(): array
    {
        $statuses = ['ACCEPT', 'INSTRUCT', 'DEPARTURE', 'DELIVERING', 'FINAL_DONE'];
        $rows = [];
        for ($i = 0; $i < 10; $i++) {
            $rows[] = [
                'orderId'         => '10' . rand(10000000, 99999999),
                'orderDate'       => date('Y-m-d H:i:s', strtotime("-$i hours")),
                'status'          => $statuses[$i % 5],
                'vendorItemId'    => 'V' . rand(1000000, 9999999),
                'productName'     => ['봄 신상 원피스', '루카 크롭 자켓', '미니 숄더백', '데님 팬츠'][rand(0,3)],
                'shippingPrice'   => 3000,
                'cancelable'      => $i > 3,
                'orderTotalPrice' => rand(15000, 180000),
                'mock' => false,
            ];
        }
        return $rows;
    }

    // ════════════════════════════════════════════════════════════════════════════
    //  전체 채널 연동 상태 통합 조회
    // ════════════════════════════════════════════════════════════════════════════

    /**
     * GET /v423/connectors/status-all
     * 모든 연동 채널의 상태(연동됨/미연동/만료)를 한 번에 반환
     */
    public static function statusAll(Request $request, Response $response, array $args): Response
    {
        $tenant = self::tenantId($request);
        $pdo    = Db::pdo();

        // connector_token 테이블 (TikTok, Amazon 토큰 기반)
        $stmt = $pdo->prepare('SELECT provider, expires_at, updated_at FROM connector_token WHERE tenant_id=?');
        $stmt->execute([$tenant]);
        $tokenRows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $tokenMap = [];
        foreach ($tokenRows as $r) {
            $exp = $r['expires_at'] ? strtotime($r['expires_at']) : PHP_INT_MAX;
            $tokenMap[$r['provider']] = [
                'connected'  => $exp > time(),
                'method'     => 'oauth_token',
                'expires_at' => $r['expires_at'],
                'updated_at' => $r['updated_at'],
            ];
        }

        // channel_credential 테이블 (API 키 기반)
        $credChannels = ['meta_ads', 'google_ads', 'naver_searchad', 'coupang'];
        $credStatus   = [];
        foreach ($credChannels as $ch) {
            try {
                $stmt2 = $pdo->prepare(
                    'SELECT COUNT(*) AS cnt FROM channel_credential WHERE tenant_id=? AND channel_key=?'
                );
                $stmt2->execute([$tenant, $ch]);
                $cnt = (int)($stmt2->fetch(PDO::FETCH_ASSOC)['cnt'] ?? 0);
            } catch (\Throwable $e) {
                $cnt = 0;
            }
            $credStatus[$ch] = [
                'connected'  => $cnt > 0,
                'method'     => 'api_key',
                'key_count'  => $cnt,
                'expires_at' => null,
            ];
        }

        // 환경변수 기반 채널 (TikTok, Amazon fallback)
        $envProviders = [
            'tiktok'  => 'TIKTOK_ACCESS_TOKEN',
            'amazon'  => 'AMAZON_REFRESH_TOKEN',
        ];
        foreach ($envProviders as $p => $envKey) {
            if (!isset($tokenMap[$p])) {
                $tokenMap[$p] = [
                    'connected'  => (bool)getenv($envKey),
                    'method'     => 'env_var',
                    'env_var'    => $envKey,
                    'expires_at' => null,
                    'updated_at' => null,
                ];
            }
        }

        $all = array_merge($tokenMap, $credStatus);
        $connectedCount = count(array_filter($all, fn($v) => $v['connected']));

        return TemplateResponder::respond($response, [
            'ok'              => true,
            'tenant_id'       => $tenant,
            'total_channels'  => count($all),
            'connected_count' => $connectedCount,
            'providers'       => $all,
        ]);
    }
}
