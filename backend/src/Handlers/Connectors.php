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
        // [현 차수] 회귀 하드닝: 미들웨어 주입 auth_tenant 우선(위조불가). bypass 추가 시 raw 헤더 위조 방지.
        //   (쓰기 경로 sessionTenant():1123 은 이미 auth_tenant 우선 — 읽기 경로도 동일 정렬)
        $attr = (string)($request->getAttribute('auth_tenant') ?? '');
        if ($attr !== '') return $attr;
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
        // 207차 MySQL 호환: connector_token 은 UNIQUE(tenant_id,provider) 제약이 없어
        //   기존 'ON CONFLICT(tenant_id,provider)'(SQLite 전용·인덱스 의존)가 MySQL/SQLite 모두에서
        //   OAuth 토큰 영속을 실패시켰다 → 포터블 SELECT-then-UPDATE/INSERT 로 교체.
        $sel = $pdo->prepare('SELECT id FROM connector_token WHERE tenant_id=? AND provider=? LIMIT 1');
        $sel->execute([$tenant, $provider]);
        $id = $sel->fetchColumn();
        if ($id) {
            $pdo->prepare(
                'UPDATE connector_token SET access_token=?, refresh_token=?, token_type=?, expires_at=?, scopes=?, meta_json=?, updated_at=? WHERE id=?'
            )->execute([
                $data['access_token']  ?? null,
                $data['refresh_token'] ?? null,
                $data['token_type']    ?? 'Bearer',
                $data['expires_at']    ?? null,
                $data['scopes']        ?? null,
                json_encode($data['meta'] ?? []),
                $now, $id,
            ]);
        } else {
            $pdo->prepare(
                'INSERT INTO connector_token(tenant_id,provider,access_token,refresh_token,token_type,expires_at,scopes,meta_json,updated_at,created_at)
                 VALUES(?,?,?,?,?,?,?,?,?,?)'
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
        // ★ 201차: AdChannelConnect 가 'tiktok_business' 채널키로 저장 → DB 자격증명도 읽도록 폴백 추가.
        $advertiserId = (string)($q['advertiser_id'] ?? (getenv('TIKTOK_ADVERTISER_ID') ?: self::loadCred($tenant, 'tiktok_business', 'advertiser_id')));
        $rawDims      = (string)($q['dimensions']    ?? 'STAT_TIME_DAY,PLACEMENT');
        $rawMetrics   = (string)($q['metrics']       ?? 'spend,clicks,impressions,reach,conversion,cost_per_conversion');

        // ── Get access token ─────────────────────────────────────────────────
        $accessToken = (string)(getenv('TIKTOK_ACCESS_TOKEN') ?: '');
        if ($accessToken === '') {
            $tokenRow = self::loadToken($tenant, 'tiktok');
            $accessToken = (string)($tokenRow['access_token'] ?? '');
        }
        if ($accessToken === '') {
            $accessToken = (string)self::loadCred($tenant, 'tiktok_business', 'access_token');
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
                // 191차 188차원칙: 운영(non-demo)은 가짜 샘플 금지 → 빈 상태. 데모만 미리보기 샘플.
                'rows'         => $tenant === 'demo' ? self::tiktokMockRows($startDate, $endDate) : [],
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
                'reports'   => $tenant === 'demo' ? self::amazonMockReports() : [],
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
                'orders' => $tenant === 'demo' ? self::amazonMockOrders() : [],
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
    // [현 차수] H2: OAuth 콜백은 channel=provider(meta/google/tiktok/naver), key_name=oauth_access_token 로 저장 →
    //   페처의 정확매칭(meta_ads/access_token)으로는 영구 미독출이었다. 별칭 폴백으로 OAuth 자격증명도 ingest.
    private const OAUTH_CHANNEL_ALIAS = ['meta_ads'=>'meta','google_ads'=>'google','tiktok_business'=>'tiktok','naver_sa'=>'naver','kakao_moment'=>'kakao'];
    private const OAUTH_KEY_ALIAS     = ['access_token'=>'oauth_access_token','refresh_token'=>'oauth_refresh_token'];
    // 저장 채널키 → runSync 단축 채널명(meta/google/tiktok/naver). OAuth provider명·정식 광고채널명 모두 포함.
    private const AD_SHORT = [
        'meta_ads'=>'meta','meta'=>'meta',
        'google_ads'=>'google','google'=>'google',
        'tiktok_business'=>'tiktok','tiktok'=>'tiktok',
        'naver_sa'=>'naver','naver'=>'naver','naver_searchad'=>'naver',
        'kakao_moment'=>'kakao','kakao'=>'kakao', // [현 차수] Kakao Moment 자동sync 배선(저장 직후+cron)
    ];

    private static function loadCred(string $tenant, string $channelKey, string $credKey): string
    {
        try {
            $pdo  = Db::pdo();
            // ★ 201차 P0(마케팅): channel_credential 실 컬럼은 channel/key_name/key_value.
            $stmt = $pdo->prepare(
                'SELECT key_value FROM channel_credential WHERE tenant_id=? AND channel=? AND key_name=? AND is_active=1 LIMIT 1'
            );
            $stmt->execute([$tenant, $channelKey, $credKey]);
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            $val = \Genie\Crypto::decrypt((string)($row['key_value'] ?? '')); // 202차 은행급 복호화
            // [현 차수] H2: 정확매칭이 비면 OAuth 별칭(provider/oauth_access_token)으로 폴백 조회.
            if ($val === '' && isset(self::OAUTH_CHANNEL_ALIAS[$channelKey])) {
                $aliasKey = self::OAUTH_KEY_ALIAS[$credKey] ?? $credKey;
                $stmt->execute([$tenant, self::OAUTH_CHANNEL_ALIAS[$channelKey], $aliasKey]);
                $row2 = $stmt->fetch(PDO::FETCH_ASSOC);
                $val = \Genie\Crypto::decrypt((string)($row2['key_value'] ?? ''));
            }
            return $val;
        } catch (\Throwable $e) {
            return '';
        }
    }

    /** [현 차수] H2: 광고 채널 여부 + 저장 직후 1회 ingest 동기화(저장 경로 무관 대칭화). */
    public static function isAdChannel(string $channelKey): bool { return isset(self::AD_SHORT[$channelKey]); }
    public static function syncAdChannelOnSave(string $tenant, string $channelKey): array
    {
        $short = self::AD_SHORT[$channelKey] ?? '';
        if ($short === '' || $tenant === '' || $tenant === 'demo') return ['skipped' => true];
        try {
            $end = date('Y-m-d'); $start = date('Y-m-d', strtotime('-7 days'));
            return self::runSync($tenant, $start, $end, [$short]);
        } catch (\Throwable $e) {
            return ['error' => substr($e->getMessage(), 0, 120)]; // 저장 성공 우선 — 동기화 실패는 cron 백업
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
            // 자격증명 미설정 → 빈 상태(가짜 데이터 일체 미반환). 등록 시 라이브 fetch.
            return TemplateResponder::respond($response, [
                'ok'       => true, 'provider' => 'meta',
                'live'     => false, 'mock' => false,
                'note'     => 'API 키를 등록하세요: META_ACCESS_TOKEN, META_AD_ACCOUNT_ID',
                'rows'     => [],
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
            // 자격증명 미설정 → 빈 상태(가짜 데이터 일체 미반환). 등록 시 라이브 fetch.
            return TemplateResponder::respond($response, [
                'ok'   => true, 'provider' => 'google_ads',
                'live' => false, 'mock' => false,
                'note' => 'API 키를 등록하세요: GOOGLE_DEVELOPER_TOKEN, GOOGLE_ACCESS_TOKEN, GOOGLE_CUSTOMER_ID',
                'rows' => [],
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

        // ★ 201차: 자격증명은 프론트(AutoMarketing/AdChannelConnect) 정본 채널키 'naver_sa' 로 저장됨.
        //   기존 'naver_searchad' 조회는 불일치로 미독출 → 'naver_sa' 우선, 레거시 'naver_searchad' 폴백.
        $apiKey     = (string)(getenv('NAVER_API_KEY')     ?: self::loadCred($tenant, 'naver_sa', 'api_key')     ?: self::loadCred($tenant, 'naver_searchad', 'api_key'));
        $apiSecret  = (string)(getenv('NAVER_API_SECRET')  ?: self::loadCred($tenant, 'naver_sa', 'api_secret')  ?: self::loadCred($tenant, 'naver_searchad', 'api_secret'));
        $customerId = (string)(getenv('NAVER_CUSTOMER_ID') ?: self::loadCred($tenant, 'naver_sa', 'customer_id') ?: self::loadCred($tenant, 'naver_searchad', 'customer_id'));

        if ($apiKey === '' || $apiSecret === '') {
            return TemplateResponder::respond($response, [
                'ok'   => true, 'provider' => 'naver_searchad',
                'live' => false, 'mock' => false,
                'note' => 'API 키를 등록하세요: NAVER_API_KEY, NAVER_API_SECRET, NAVER_CUSTOMER_ID',
                'rows' => $tenant === 'demo' ? self::naverMockRows() : [],
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
                'orders' => $tenant === 'demo' ? self::coupangMockOrders() : [],
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
        // ★ 실 컬럼은 channel(기존 channel_key 오타로 항상 예외→미연결 표시되던 버그 수정).
        //   채널키는 프론트(AdChannelConnect) 정본 사용: tiktok_business / naver_sa.
        //   레거시 별칭(naver_searchad)도 함께 카운트하여 과거 저장분 호환.
        $credChannels = [
            'meta_ads'        => ['meta_ads'],
            'google_ads'      => ['google_ads'],
            'tiktok_business' => ['tiktok_business'],
            'naver_sa'        => ['naver_sa', 'naver_searchad'],
            'coupang'         => ['coupang'],
        ];
        $credStatus   = [];
        foreach ($credChannels as $key => $aliases) {
            $cnt = 0;
            try {
                $ph    = implode(',', array_fill(0, count($aliases), '?'));
                $stmt2 = $pdo->prepare(
                    "SELECT COUNT(*) AS cnt FROM channel_credential
                      WHERE tenant_id=? AND is_active=1 AND channel IN ($ph)"
                );
                $stmt2->execute(array_merge([$tenant], $aliases));
                $cnt = (int)($stmt2->fetch(PDO::FETCH_ASSOC)['cnt'] ?? 0);
            } catch (\Throwable $e) {
                $cnt = 0;
            }
            $credStatus[$key] = [
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

    // ════════════════════════════════════════════════════════════════════════════
    //  191차 — 광고 메트릭 ingest 브릿지 (커넥터 라이브 fetch → performance_metrics 적재)
    //  성격: AdPerformance/Alerting/대시보드가 의존하는 performance_metrics 테이블이
    //        그동안 어떤 적재 경로도 없어 항상 0행이었다(운영/데모 모두 검증). 커넥터는
    //        라이브 API 를 프록시할 뿐 결과를 저장하지 않았다. 이 브릿지가 연결된 광고
    //        채널(meta/google/tiktok)을 fetch→정규화→멱등 upsert 하여 실데이터 전환의
    //        선행 인프라를 완성한다. SMS/주문(amazon/coupang/naver order)은 광고 메트릭이
    //        아니므로 제외(별도 ChannelSync 커머스 트랙).
    // ════════════════════════════════════════════════════════════════════════════

    /**
     * 인증 세션 테넌트. api_key 미들웨어가 X-Tenant-Id 를 키의 tenant_id 로 강제
     * 덮어쓰므로(188차) auth_tenant 속성/헤더 모두 위조 불가. 쓰기 경로라 명시적으로 사용.
     */
    private static function authTenant(Request $request): string
    {
        $t = (string)($request->getAttribute('auth_tenant') ?? '');
        if ($t !== '') return $t;
        // 은행급 fail-closed(쓰기 경로): raw X-Tenant-Id(위조가능)를 performance_metrics 적재 테넌트로 신뢰하지 않는다.
        //   /v423/connectors/sync 는 의도적으로 bypass 제외(api_key 미들웨어 경유)라 auth_tenant 가 항상 주입되나,
        //   회귀 방어로 세션 자가인증 폴백, 미해결은 demo 격리버킷으로 귀결(교차테넌트 ingest 위조 차단).
        $st = UserAuth::authedTenant($request);
        return ($st !== null && $st !== '') ? $st : 'demo';
    }

    /**
     * POST /v423/connectors/sync
     * Body/Query: { start_date?, end_date?, channels?: "meta,google,tiktok" }
     * 연결된 광고 채널을 라이브 fetch → 정규화 → performance_metrics 멱등 적재.
     * 자격증명 없는 채널은 건너뛴다(기존 데이터 보존). 라이브 실패 채널도 보존(요약에 error).
     */
    public static function sync(Request $request, Response $response, array $args): Response
    {
        $tenant = self::authTenant($request);
        $body   = (array)($request->getParsedBody() ?? []);
        $q      = $request->getQueryParams();

        $start = (string)($body['start_date'] ?? $q['start_date'] ?? date('Y-m-d', strtotime('-7 days')));
        $end   = (string)($body['end_date']   ?? $q['end_date']   ?? date('Y-m-d'));

        $want = (string)($body['channels'] ?? $q['channels'] ?? 'meta,google,tiktok,naver');
        $wantSet = array_filter(array_map('trim', explode(',', strtolower($want))));
        $wantSet = $wantSet ?: ['meta', 'google', 'tiktok', 'naver'];

        $result = self::runSync($tenant, $start, $end, $wantSet);

        return TemplateResponder::respond($response, array_merge(['ok' => true], $result));
    }

    /**
     * 동기화 코어 — HTTP 핸들러(sync)와 CLI cron(connectors_sync_cron.php) 공용.
     * 연결된 광고 채널을 라이브 fetch → 정규화 → performance_metrics 멱등 적재.
     * 자격증명 없는 채널은 건너뛴다(기존 데이터 보존). 라이브 실패 채널도 보존(요약에 error).
     *
     * @param string[] $wantSet 동기화 대상 단축 채널명(meta/google/tiktok)
     * @return array{tenant_id:string,window:array,persisted:int,channels:array}
     */
    public static function runSync(string $tenant, string $start, string $end, array $wantSet): array
    {
        $pdo = Db::pdo();
        $summary  = [];
        $totalRows = 0;

        $fetchers = [
            'meta'   => fn() => self::fetchMetaRows($tenant, $start, $end),
            'google' => fn() => self::fetchGoogleRows($tenant, $start, $end),
            'tiktok' => fn() => self::fetchTiktokRows($tenant, $start, $end),
            'naver'  => fn() => self::fetchNaverRows($tenant, $start, $end),
            'kakao'  => fn() => self::fetchKakaoRows($tenant, $start, $end), // [현 차수] Kakao Moment 실 ingest 배선
        ];

        foreach ($fetchers as $ch => $fn) {
            if (!in_array($ch, $wantSet, true)) continue;
            try {
                $res = $fn();
            } catch (\Throwable $e) {
                $summary[$ch] = ['status' => 'error', 'error' => substr($e->getMessage(), 0, 120)];
                continue;
            }
            if (empty($res['hasCreds'])) {
                $summary[$ch] = ['status' => 'skipped', 'reason' => 'no_credentials'];
                continue;
            }
            if (empty($res['live'])) {
                // 자격증명은 있으나 API 호출 실패 — 기존 데이터 보존, 적재 안 함
                $summary[$ch] = ['status' => 'error', 'error' => $res['error'] ?? 'fetch_failed'];
                continue;
            }
            $rows = $res['rows'] ?? [];
            $persisted = self::persistMetricRows($pdo, $tenant, $ch, $rows, $start, $end);
            $totalRows += $persisted;
            $summary[$ch] = ['status' => 'ok', 'rows' => $persisted];
        }

        return [
            'tenant_id'  => $tenant,
            'window'     => compact('start', 'end'),
            'persisted'  => $totalRows,
            'channels'   => $summary,
        ];
    }

    /**
     * 광고 자격증명을 보유한 테넌트 목록 — cron 팬아웃용.
     * channel_credential 의 활성 광고 채널(meta_ads/google_ads/tiktok_business) 보유 테넌트.
     */
    public static function tenantsWithAdCreds(): array
    {
        $pdo = Db::pdo();
        try {
            $stmt = $pdo->query(
                "SELECT DISTINCT tenant_id FROM channel_credential
                  WHERE is_active=1
                    AND channel IN ('meta_ads','google_ads','tiktok_business','naver_sa','kakao_moment')
                    AND tenant_id IS NOT NULL AND tenant_id<>''"
            );
            $out = [];
            foreach ($stmt->fetchAll(PDO::FETCH_COLUMN) as $t) {
                if ($t !== null && $t !== '') $out[] = (string)$t;
            }
            return $out;
        } catch (\Throwable $e) {
            return [];
        }
    }

    /** performance_metrics 에 campaign_ext_id 컬럼이 있는지(요청당 1회 캐시). 구 스키마 폴백용. */
    private static function perfHasCampaignCol(PDO $pdo): bool
    {
        static $cached = null;
        if ($cached !== null) return $cached;
        try {
            if ($pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'mysql') {
                $q = $pdo->query("SHOW COLUMNS FROM performance_metrics LIKE 'campaign_ext_id'");
                $cached = ($q && $q->fetch() !== false);
            } else {
                $cached = false;
                foreach ($pdo->query("PRAGMA table_info(performance_metrics)")->fetchAll(PDO::FETCH_ASSOC) as $c) {
                    if (($c['name'] ?? '') === 'campaign_ext_id') { $cached = true; break; }
                }
            }
        } catch (\Throwable $e) { $cached = false; }
        return $cached;
    }

    /** [현 차수] A/B variant 성과 추적용 ad_ext_id 컬럼 존재 여부(멱등 감지). */
    private static function perfHasAdCol(PDO $pdo): bool
    {
        static $cached = null;
        if ($cached !== null) return $cached;
        try {
            if ($pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'mysql') {
                $q = $pdo->query("SHOW COLUMNS FROM performance_metrics LIKE 'ad_ext_id'");
                $cached = ($q && $q->fetch() !== false);
            } else {
                $cached = false;
                foreach ($pdo->query("PRAGMA table_info(performance_metrics)")->fetchAll(PDO::FETCH_ASSOC) as $c) {
                    if (($c['name'] ?? '') === 'ad_ext_id') { $cached = true; break; }
                }
            }
        } catch (\Throwable $e) { $cached = false; }
        return $cached;
    }

    /**
     * performance_metrics 멱등 적재: (tenant,channel,date∈[start,end]) 기존 행 삭제 후 신규 삽입.
     * 재동기화 시 중복 누적 없이 최신 스냅샷 유지. 테넌트 스코핑 강제.
     */
    private static function persistMetricRows(PDO $pdo, string $tenant, string $channel, array $rows, string $start, string $end): int
    {
        if (!$rows) {
            // 라이브 성공했으나 0행이면 해당 구간을 비운다(채널 데이터 없음 = 빈 상태가 정직).
            $del = $pdo->prepare('DELETE FROM performance_metrics WHERE tenant_id=? AND LOWER(channel)=? AND date BETWEEN ? AND ?');
            $del->execute([$tenant, strtolower($channel), $start, $end]);
            return 0;
        }

        $pdo->beginTransaction();
        try {
            $del = $pdo->prepare('DELETE FROM performance_metrics WHERE tenant_id=? AND LOWER(channel)=? AND date BETWEEN ? AND ?');
            $del->execute([$tenant, strtolower($channel), $start, $end]);

            // Phase3: campaign_ext_id 포함(측정↔액추에이션 입도 일치). [현 차수]: ad_ext_id(A/B variant 추적).
            //   존재하는 선택 컬럼만 동적으로 INSERT(구 스키마 폴백 + 신규 컬럼 동시 지원).
            $hasCampCol = self::perfHasCampaignCol($pdo);
            $hasAdCol   = self::perfHasAdCol($pdo);
            $cols = ['tenant_id', 'team', 'channel', 'account', 'date', 'impressions', 'clicks', 'spend', 'conversions', 'revenue'];
            if ($hasCampCol) $cols[] = 'campaign_ext_id';
            if ($hasAdCol)   $cols[] = 'ad_ext_id';
            $cols[] = 'extra_json';
            $ins = $pdo->prepare('INSERT INTO performance_metrics (' . implode(',', $cols) . ') VALUES (' . implode(',', array_fill(0, count($cols), '?')) . ')');
            $n = 0;
            foreach ($rows as $r) {
                $date = (string)($r['date'] ?? '');
                if ($date === '') continue;
                // 적재는 동기화 구간으로 제한(API 가 범위 밖 날짜를 돌려줘도 격리).
                if ($date < $start || $date > $end) continue;
                $base = [
                    $tenant,
                    (string)($r['team'] ?? ''),
                    strtolower($channel),
                    (string)($r['account'] ?? ''),
                    $date,
                    (int)($r['impressions'] ?? 0),
                    (int)($r['clicks'] ?? 0),
                    (float)($r['spend'] ?? 0),
                    (int)($r['conversions'] ?? 0),
                    (float)($r['revenue'] ?? 0),
                ];
                $extra = isset($r['extra']) ? json_encode($r['extra'], JSON_UNESCAPED_UNICODE) : null;
                if ($hasCampCol) $base[] = ($r['campaign_ext_id'] ?? '') !== '' ? (string)$r['campaign_ext_id'] : null;
                if ($hasAdCol)   $base[] = ($r['ad_ext_id'] ?? '') !== '' ? (string)$r['ad_ext_id'] : null;
                $base[] = $extra;
                $ins->execute($base);
                $n++;
            }
            $pdo->commit();
            return $n;
        } catch (\Throwable $e) {
            if ($pdo->inTransaction()) $pdo->rollBack();
            throw $e;
        }
    }

    /** Meta 광고 일자별 인사이트 → 정규화 행. */
    private static function fetchMetaRows(string $tenant, string $start, string $end): array
    {
        $accessToken = (string)(getenv('META_ACCESS_TOKEN')  ?: self::loadCred($tenant, 'meta_ads', 'access_token'));
        $adAccountId = (string)(getenv('META_AD_ACCOUNT_ID') ?: self::loadCred($tenant, 'meta_ads', 'ad_account_id'));
        if ($accessToken === '' || $adAccountId === '') {
            return ['hasCreds' => false, 'live' => false, 'rows' => []];
        }

        // [현 차수] A/B variant 추적: level=ad 로 ad_id/adset_id 까지 수집(행에 campaign_ext_id 도 유지 →
        //   기존 캠페인 단위 집계는 그대로 동작, 추가로 variant(ad) 단위 성과 추적 가능).
        $fields = 'campaign_id,campaign_name,adset_id,ad_id,impressions,clicks,spend,actions,action_values';
        $params = http_build_query([
            'time_range'     => json_encode(['since' => $start, 'until' => $end]),
            'level'          => 'ad',
            'fields'         => $fields,
            'time_increment' => 1,
            'limit'          => 500,
            'access_token'   => $accessToken,
        ]);
        $url = "https://graph.facebook.com/v19.0/act_{$adAccountId}/insights?{$params}";
        [$code, $body, $err] = self::httpGet($url);

        if ($err || $code >= 400 || isset($body['error'])) {
            return ['hasCreds' => true, 'live' => false, 'error' => $err ?? ($body['error']['message'] ?? "meta http $code")];
        }

        $rows = [];
        foreach (($body['data'] ?? []) as $r) {
            [$conv, $rev] = self::metaConvValue($r['actions'] ?? [], $r['action_values'] ?? []);
            $rows[] = [
                'team'        => 'Meta',
                'account'     => (string)($r['campaign_name'] ?? 'Meta Campaign'),
                'campaign_ext_id' => (string)($r['campaign_id'] ?? ''),
                'ad_ext_id'   => (string)($r['ad_id'] ?? ''),
                'date'        => (string)($r['date_start'] ?? $r['date_stop'] ?? ''),
                'impressions' => (int)($r['impressions'] ?? 0),
                'clicks'      => (int)($r['clicks'] ?? 0),
                'spend'       => (float)($r['spend'] ?? 0),
                'conversions' => $conv,
                'revenue'     => $rev,
            ];
        }
        return ['hasCreds' => true, 'live' => true, 'rows' => $rows];
    }

    /** Meta actions/action_values 배열에서 구매 전환수/매출 추출. */
    private static function metaConvValue(array $actions, array $values): array
    {
        $purchaseTypes = ['purchase', 'omni_purchase', 'offsite_conversion.fb_pixel_purchase', 'onsite_web_purchase'];
        $conv = 0; $rev = 0.0;
        foreach ($actions as $a) {
            if (in_array((string)($a['action_type'] ?? ''), $purchaseTypes, true)) $conv += (int)round((float)($a['value'] ?? 0));
        }
        foreach ($values as $v) {
            if (in_array((string)($v['action_type'] ?? ''), $purchaseTypes, true)) $rev += (float)($v['value'] ?? 0);
        }
        return [$conv, $rev];
    }

    /** Google Ads 일자별 캠페인 메트릭 → 정규화 행. */
    private static function fetchGoogleRows(string $tenant, string $start, string $end): array
    {
        $devToken    = (string)(getenv('GOOGLE_DEVELOPER_TOKEN') ?: self::loadCred($tenant, 'google_ads', 'developer_token'));
        $accessToken = (string)(getenv('GOOGLE_ACCESS_TOKEN')    ?: self::loadCred($tenant, 'google_ads', 'access_token'));
        $customerId  = str_replace('-', '', (string)(getenv('GOOGLE_CUSTOMER_ID') ?: self::loadCred($tenant, 'google_ads', 'customer_id')));
        if ($devToken === '' || $accessToken === '' || $customerId === '') {
            return ['hasCreds' => false, 'live' => false, 'rows' => []];
        }

        $gaql = "SELECT campaign.name, campaign.resource_name, metrics.impressions, metrics.clicks, metrics.cost_micros,
                        metrics.conversions, metrics.conversions_value, segments.date
                 FROM campaign
                 WHERE segments.date BETWEEN '$start' AND '$end' AND campaign.status != 'REMOVED'
                 ORDER BY segments.date DESC LIMIT 500";
        $url = "https://googleads.googleapis.com/v17/customers/{$customerId}/googleAds:searchStream";
        [$code, $body, $err] = self::httpPost($url, ['query' => $gaql], [
            'Authorization'   => "Bearer {$accessToken}",
            'developer-token' => $devToken,
            'Content-Type'    => 'application/json',
        ]);

        if ($err || $code >= 400) {
            return ['hasCreds' => true, 'live' => false, 'error' => $err ?? "google http $code"];
        }

        $rows = [];
        $results = $body[0]['results'] ?? $body['results'] ?? [];
        foreach ($results as $r) {
            $rows[] = [
                'team'        => 'Google Ads',
                'account'     => (string)($r['campaign']['name'] ?? 'Google Campaign'),
                'campaign_ext_id' => (string)($r['campaign']['resourceName'] ?? ''),
                'date'        => (string)($r['segments']['date'] ?? ''),
                'impressions' => (int)($r['metrics']['impressions'] ?? 0),
                'clicks'      => (int)($r['metrics']['clicks'] ?? 0),
                'spend'       => round((int)($r['metrics']['costMicros'] ?? 0) / 1_000_000, 2),
                'conversions' => (int)round((float)($r['metrics']['conversions'] ?? 0)),
                'revenue'     => round((float)($r['metrics']['conversionsValue'] ?? 0), 2),
            ];
        }
        return ['hasCreds' => true, 'live' => true, 'rows' => $rows];
    }

    /** TikTok 광고 일자별 리포트 → 정규화 행. */
    private static function fetchTiktokRows(string $tenant, string $start, string $end): array
    {
        // [현 차수] AdChannelConnect 자격증명(channel_credential 'tiktok_business') 우선 조회. 기존엔 env+connector_token만
        //   봐서 수동 등록 TikTok이 sync에서 no_credentials로 skip되던 버그(집행은 AdAdapters 별칭으로 동작하나 성과 미적재).
        $accessToken = (string)(getenv('TIKTOK_ACCESS_TOKEN') ?: self::loadCred($tenant, 'tiktok_business', 'access_token'));
        if ($accessToken === '') {
            $tokenRow = self::loadToken($tenant, 'tiktok');
            $accessToken = (string)($tokenRow['access_token'] ?? '');
        }
        $advertiserId = (string)(getenv('TIKTOK_ADVERTISER_ID') ?: self::loadCred($tenant, 'tiktok_business', 'advertiser_id'));
        if ($advertiserId === '') {
            $tokenRow = $tokenRow ?? self::loadToken($tenant, 'tiktok');
            $meta = json_decode((string)($tokenRow['meta_json'] ?? '{}'), true);
            $ids  = (array)($meta['advertiser_ids'] ?? []);
            $advertiserId = (string)($ids[0] ?? '');
        }
        if ($accessToken === '' || $advertiserId === '') {
            return ['hasCreds' => false, 'live' => false, 'rows' => []];
        }

        $payload = [
            'advertiser_id' => $advertiserId,
            'report_type'   => 'BASIC',
            'dimensions'    => ['campaign_id', 'stat_time_day'],
            'metrics'       => ['campaign_name', 'spend', 'clicks', 'impressions', 'conversion', 'total_purchase_value'],
            'data_level'    => 'AUCTION_CAMPAIGN',
            'start_date'    => $start,
            'end_date'      => $end,
            'page_size'     => 200,
            'page'          => 1,
        ];
        [$code, $body, $err] = self::httpPost(
            'https://business-api.tiktok.com/open_api/v1.3/report/integrated/get',
            $payload,
            ['Access-Token' => $accessToken, 'Content-Type' => 'application/json']
        );

        if ($err || $code >= 400 || (int)($body['code'] ?? -1) !== 0) {
            return ['hasCreds' => true, 'live' => false, 'error' => $err ?? ($body['message'] ?? "tiktok http $code")];
        }

        $rows = [];
        foreach (($body['data']['list'] ?? []) as $r) {
            $dim = $r['dimensions'] ?? [];
            $m   = $r['metrics'] ?? [];
            $rows[] = [
                'team'        => 'TikTok',
                'account'     => (string)($m['campaign_name'] ?? $dim['campaign_id'] ?? 'TikTok Campaign'),
                'campaign_ext_id' => (string)($dim['campaign_id'] ?? ''),
                'date'        => substr((string)($dim['stat_time_day'] ?? ''), 0, 10),
                'impressions' => (int)($m['impressions'] ?? 0),
                'clicks'      => (int)($m['clicks'] ?? 0),
                'spend'       => (float)($m['spend'] ?? 0),
                'conversions' => (int)round((float)($m['conversion'] ?? 0)),
                'revenue'     => (float)($m['total_purchase_value'] ?? 0),
            ];
        }
        return ['hasCreds' => true, 'live' => true, 'rows' => $rows];
    }

    /** 네이버 검색광고 일자별 성과 → 정규화 행(202차 ingest 편입). 캠페인 id 조회 후 /stats 일별 집계. */
    private static function fetchNaverRows(string $tenant, string $start, string $end): array
    {
        $apiKey     = (string)(getenv('NAVER_API_KEY')     ?: self::loadCred($tenant, 'naver_sa', 'api_key')     ?: self::loadCred($tenant, 'naver_searchad', 'api_key'));
        $apiSecret  = (string)(getenv('NAVER_API_SECRET')  ?: self::loadCred($tenant, 'naver_sa', 'api_secret')  ?: self::loadCred($tenant, 'naver_searchad', 'api_secret'));
        $customerId = (string)(getenv('NAVER_CUSTOMER_ID') ?: self::loadCred($tenant, 'naver_sa', 'customer_id') ?: self::loadCred($tenant, 'naver_searchad', 'customer_id'));
        if ($apiKey === '' || $apiSecret === '' || $customerId === '') {
            return ['hasCreds' => false, 'live' => false, 'rows' => []];
        }
        $sign = function (string $method, string $path) use ($apiSecret): array {
            $ts = (string)(round(microtime(true) * 1000));
            return [$ts, base64_encode(hash_hmac('sha256', "{$ts}.{$method}.{$path}", $apiSecret, true))];
        };
        $hdr = function (array $sg) use ($apiKey, $customerId): array {
            return ['X-Timestamp' => $sg[0], 'X-API-KEY' => $apiKey, 'X-Customer' => $customerId, 'X-Signature' => $sg[1], 'Content-Type' => 'application/json; charset=UTF-8'];
        };

        // 1) 캠페인 id 목록
        [$cCode, $cBody, $cErr] = self::httpGet('https://api.naver.com/ncc/campaigns', $hdr($sign('GET', '/ncc/campaigns')));
        if ($cErr || $cCode >= 400) return ['hasCreds' => true, 'live' => false, 'error' => $cErr ?? "naver campaigns http {$cCode}"];
        $ids = [];
        foreach ((is_array($cBody) ? $cBody : []) as $c) { if (!empty($c['nccCampaignId'])) $ids[] = (string)$c['nccCampaignId']; }
        if (empty($ids)) return ['hasCreds' => true, 'live' => true, 'rows' => []]; // 캠페인 없음 = 빈 적재(정직)

        // 2) /stats 일별 성과(최대 100 id)
        $ids = array_slice($ids, 0, 100);
        $query = http_build_query([
            'ids'       => implode(',', $ids),
            'fields'    => json_encode(['impCnt', 'clkCnt', 'salesAmt', 'ccnt', 'convAmt']),
            'timeRange' => json_encode(['since' => $start, 'until' => $end]),
            'breakdown' => 'day',
        ]);
        [$sCode, $sBody, $sErr] = self::httpGet('https://api.naver.com/stats?' . $query, $hdr($sign('GET', '/stats')));
        if ($sErr || $sCode >= 400) return ['hasCreds' => true, 'live' => false, 'error' => $sErr ?? "naver stats http {$sCode}"];

        // 일별 집계(응답 포맷 방어적 파싱)
        $byDay = [];
        $data = $sBody['data'] ?? (is_array($sBody) ? $sBody : []);
        foreach ((array)$data as $row) {
            if (!is_array($row)) continue;
            $day = '';
            if (isset($row['dimension']) && is_array($row['dimension'])) $day = (string)($row['dimension']['day'] ?? $row['dimension']['statDt'] ?? '');
            if ($day === '') $day = (string)($row['day'] ?? $row['statDt'] ?? (is_string($row['dimension'] ?? null) ? $row['dimension'] : ''));
            $day = substr(str_replace(['.', '/'], '-', $day), 0, 10);
            if ($day === '' || $day < $start || $day > $end) continue;
            if (!isset($byDay[$day])) $byDay[$day] = ['imp' => 0, 'clk' => 0, 'spend' => 0.0, 'conv' => 0, 'rev' => 0.0];
            $byDay[$day]['imp']   += (int)($row['impCnt'] ?? 0);
            $byDay[$day]['clk']   += (int)($row['clkCnt'] ?? 0);
            $byDay[$day]['spend'] += (float)($row['salesAmt'] ?? 0);
            $byDay[$day]['conv']  += (int)round((float)($row['ccnt'] ?? 0));
            $byDay[$day]['rev']   += (float)($row['convAmt'] ?? 0);
        }
        $rows = [];
        foreach ($byDay as $day => $v) {
            $rows[] = ['team' => 'Naver', 'account' => 'Naver SA', 'date' => $day,
                'impressions' => $v['imp'], 'clicks' => $v['clk'], 'spend' => $v['spend'],
                'conversions' => $v['conv'], 'revenue' => $v['rev']];
        }
        return ['hasCreds' => true, 'live' => true, 'rows' => $rows];
    }

    /**
     * [현 차수] Kakao Moment Open API v4 — 캠페인 일자별 성과 리포트 → performance_metrics 정규화.
     *   거짓양성(hasRealAdapter엔 있으나 ingest 미배선) 해소: 자격증명(access_token+ad_account_id) 등록 시
     *   실제 fetch 동작. 필드명은 다중 후보로 방어매핑(API 응답 편차 대응), 실패 시 graceful(error).
     *   라이브 검증은 실 Kakao Moment 광고계정 필요(타 어댑터와 동일 graceful 드롭인).
     */
    private static function fetchKakaoRows(string $tenant, string $start, string $end): array
    {
        $accessToken = (string)(getenv('KAKAO_MOMENT_ACCESS_TOKEN')  ?: self::loadCred($tenant, 'kakao_moment', 'access_token'));
        $adAccountId = (string)(getenv('KAKAO_MOMENT_AD_ACCOUNT_ID') ?: self::loadCred($tenant, 'kakao_moment', 'ad_account_id'));
        if ($accessToken === '' || $adAccountId === '') {
            return ['hasCreds' => false, 'live' => false, 'rows' => []];
        }
        // Kakao Moment 리포트: start/end=YYYYMMDD, 일자별(datePreset 대신 명시 기간), 캠페인 차원.
        $params = http_build_query([
            'start'        => str_replace('-', '', $start),
            'end'          => str_replace('-', '', $end),
            'metricsGroup' => 'BASIC',
            'dimension'    => 'CAMPAIGN',
        ]);
        $url = "https://apis.moment.kakao.com/openapi/v4/campaigns/report?{$params}";
        [$code, $body, $err] = self::httpGet($url, [
            'Authorization' => "Bearer {$accessToken}",
            'adAccountId'   => $adAccountId,
            'Content-Type'  => 'application/json',
        ]);
        if ($err || $code >= 400) {
            return ['hasCreds' => true, 'live' => false, 'error' => $err ?: "kakao http $code"];
        }
        $rows = [];
        foreach ((array)($body['data'] ?? $body['report'] ?? []) as $r) {
            $dim = (array)($r['dimension'] ?? $r['dimensions'] ?? []);
            $m   = (array)($r['metric'] ?? $r['metrics'] ?? []);
            $rawDate = (string)($r['start'] ?? $r['date'] ?? $dim['date'] ?? '');
            $date = (strlen($rawDate) === 8) ? substr($rawDate,0,4).'-'.substr($rawDate,4,2).'-'.substr($rawDate,6,2) : substr($rawDate,0,10);
            $rows[] = [
                'team'            => 'Kakao',
                'account'         => (string)($dim['campaignName'] ?? $dim['campaign'] ?? 'Kakao Moment'),
                'campaign_ext_id' => (string)($dim['campaignId'] ?? $dim['campaign_id'] ?? ''),
                'date'            => $date,
                'impressions'     => (int)($m['imp'] ?? $m['impression'] ?? $m['impressions'] ?? 0),
                'clicks'          => (int)($m['click'] ?? $m['clicks'] ?? 0),
                'spend'           => (float)($m['cost'] ?? $m['spending'] ?? $m['spend'] ?? 0),
                'conversions'     => (int)round((float)($m['convPurchaseCnt'] ?? $m['conversionPurchase'] ?? $m['conv'] ?? 0)),
                'revenue'         => (float)($m['convPurchaseAmount'] ?? $m['conversionPurchaseAmount'] ?? $m['convValue'] ?? 0),
            ];
        }
        return ['hasCreds' => true, 'live' => true, 'rows' => $rows];
    }
}
