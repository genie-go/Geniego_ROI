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
        // [227차 감사] raw X-Tenant-Id 폴백 제거 — auth_tenant(미들웨어 주입)만 신뢰. 향후 bypass 추가 시 위조 차단.
        $attr = (string)($request->getAttribute('auth_tenant') ?? '');
        return $attr !== '' ? $attr : 'demo';
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

    /** [현 차수] gzip/비-JSON 응답(예: Amazon Ads v3 GZIP_JSON 리포트 다운로드)을 위한 원시 바디 보존 GET.
     *  반환 [code, json|null, err, rawBody]. json 디코드 실패 시 rawBody 로 호출측이 gzdecode 처리. */
    private static function httpGetRaw(string $url, array $headers = []): array
    {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_TIMEOUT        => 20,
            CURLOPT_ENCODING       => '', // gzip/deflate 자동 해제(서버가 Content-Encoding 부여 시)
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
        $rawStr = $err === null ? (string)$raw : '';
        $json   = $rawStr !== '' ? json_decode($rawStr, true) : null;
        return [$code, is_array($json) ? $json : null, $err, $rawStr];
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
        // [225차 P1-13] at-rest 복호화(AES-256-GCM). 레거시 평문 행은 passthrough → 무중단 전환.
        //   client_secret 등 민감값은 meta_json 블롭에 들어가므로 meta_json 도 통째 복호화한다.
        if ($row) {
            $row['access_token']  = \Genie\Crypto::decrypt((string)($row['access_token']  ?? ''));
            $row['refresh_token'] = \Genie\Crypto::decrypt((string)($row['refresh_token'] ?? ''));
            $row['meta_json']     = \Genie\Crypto::decrypt((string)($row['meta_json']     ?? ''));
        }
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
        // [225차 P1-13] at-rest 암호화(AES-256-GCM): access_token/refresh_token 및 client_secret 을 품은
        //   meta_json 블롭을 평문 저장하던 결함 차단. 빈값은 null 보존, meta_json 은 항상 암호화.
        $enc = fn($v) => ($v === null || $v === '') ? $v : \Genie\Crypto::encrypt((string)$v);
        $encAccess  = $enc($data['access_token']  ?? null);
        $encRefresh = $enc($data['refresh_token'] ?? null);
        $encMeta    = \Genie\Crypto::encrypt(json_encode($data['meta'] ?? []));
        if ($id) {
            $pdo->prepare(
                'UPDATE connector_token SET access_token=?, refresh_token=?, token_type=?, expires_at=?, scopes=?, meta_json=?, updated_at=? WHERE id=?'
            )->execute([
                $encAccess,
                $encRefresh,
                $data['token_type']    ?? 'Bearer',
                $data['expires_at']    ?? null,
                $data['scopes']        ?? null,
                $encMeta,
                $now, $id,
            ]);
        } else {
            $pdo->prepare(
                'INSERT INTO connector_token(tenant_id,provider,access_token,refresh_token,token_type,expires_at,scopes,meta_json,updated_at,created_at)
                 VALUES(?,?,?,?,?,?,?,?,?,?)'
            )->execute([
                $tenant, $provider,
                $encAccess,
                $encRefresh,
                $data['token_type']    ?? 'Bearer',
                $data['expires_at']    ?? null,
                $data['scopes']        ?? null,
                $encMeta,
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

    /**
     * [227차] POST /v421/connectors/audience/sync — 오디언스/리타겟팅 매체 push.
     *   Body: { channel: meta|google, lookalike?: bool, country?: 'KR', name?: string }
     *   본 테넌트 CRM 고객/구매자 이메일을 sha256 해시로 매체 오디언스(Meta Custom Audience·Lookalike /
     *   Google Customer Match)에 업로드한다. ★PII 안전: 해시만 전송·신규저장 없음. 데모/익명 차단.
     */
    public static function audienceSync(Request $request, Response $response, array $args): Response
    {
        $tenant = self::tenantId($request);
        $lang = \Genie\I18n::lang($request);
        if ($tenant === '' || $tenant === 'demo' || strncmp($tenant, 'demo', 4) === 0) {
            return TemplateResponder::respond($response, ['ok' => false, 'demo' => true, 'note' => \Genie\I18n::t('conn.audience.demoBlock', [], $lang)]);
        }
        $body = (array)($request->getParsedBody() ?? []);
        if (empty($body)) { $d = json_decode((string)$request->getBody(), true); if (is_array($d)) $body = $d; }
        $channel = strtolower(trim((string)($body['channel'] ?? 'meta')));
        $opts = [
            'lookalike' => !empty($body['lookalike']),
            'country'   => mb_substr((string)($body['country'] ?? 'KR'), 0, 4),
            'name'      => mb_substr((string)($body['name'] ?? 'GenieGo 고객 오디언스'), 0, 80),
        ];
        try {
            $res = AdAdapters::syncAudience(\Genie\Db::pdo(), $tenant, $channel === 'meta' ? 'meta_ads' : ($channel === 'google' ? 'google_ads' : $channel), $opts);
            $status = !empty($res['ok']) ? 200 : (($res['status'] ?? '') === 'no_credentials' ? 200 : 200);
            return TemplateResponder::respond($response->withStatus($status), $res);
        } catch (\Throwable $e) {
            return TemplateResponder::respond($response->withStatus(500), ['ok' => false, 'error' => $e->getMessage()]);
        }
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
        'line_ads'=>'line', // [232차] LINE Ads(JWS) 자동sync 배선. 메시징 'line'(own_etc)과 별개 채널(line_ads).
        // [240차] 커넥터 확장(경쟁 마지막 약점) — 신규 광고 데이터소스 실 ingest 어댑터 자동sync 배선.
        //   AD_SHORT 한 곳에만 추가하면 저장직후 syncOne·cron 팬아웃·isAdChannel 전부 자동 전파(기존 SSOT 패턴).
        'snapchat_ads'=>'snapchat','snapchat'=>'snapchat',
        'linkedin_ads'=>'linkedin','linkedin'=>'linkedin',
        'criteo'=>'criteo','criteo_ads'=>'criteo',
        'pinterest_ads'=>'pinterest','pinterest'=>'pinterest',
        // [현 차수] 신규 광고 데이터소스 — 동일 SSOT 패턴(저장직후 syncOne·cron 팬아웃·isAdChannel 자동 전파).
        'amazon_ads'=>'amazon_ads','amazon_ads_dsp'=>'amazon_ads',
        'microsoft_ads'=>'microsoft_ads','bing_ads'=>'microsoft_ads',
        'x_ads'=>'x_ads','twitter_ads'=>'x_ads',
        // [현 차수 감사 F-1] 롱테일 광고 5종 — runSync fetcher·ChannelRegistry(sync_kind='ad')는 보유하나 AD_SHORT 누락으로
        //   저장직후 즉시동기화만 비대칭 스킵(cron은 동작)이던 결함 해소. 키=fetcher 디스패치명 동일(자동 전파).
        'reddit_ads'=>'reddit_ads',
        'apple_search_ads'=>'apple_search_ads',
        'amazon_dsp'=>'amazon_dsp',
        'quora_ads'=>'quora_ads',
        'spotify_ads'=>'spotify_ads',
        // [R-P3-7] 네이티브 광고(콘텐츠 디스커버리) — 동일 SSOT 패턴(저장직후 syncOne·cron·isAdChannel 자동 전파).
        'taboola'=>'taboola','taboola_ads'=>'taboola',
        'outbrain'=>'outbrain','outbrain_ads'=>'outbrain',
        // [246차 P3] 커넥터 폭 확대 — 글로벌 퍼포먼스/앱 광고 4종(creds 등록 즉시 자동 전파).
        'applovin'=>'applovin','applovin_ads'=>'applovin',
        'mintegral'=>'mintegral','mintegral_ads'=>'mintegral',
        'yandex_ads'=>'yandex_ads','yandex'=>'yandex_ads',
        'yahoo_jp_ads'=>'yahoo_jp_ads','yahoo_japan_ads'=>'yahoo_jp_ads',
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

    /** [237차] 채널 레지스트리(channel_registry)에서 지정 sync_kind 의 활성 채널키 목록(요청당 1회 캐시·graceful).
     *  ChannelSync::commerceTenantChannels 의 commerce 병합과 대칭으로, admin 이 레지스트리에 광고채널을
     *  추가하면 코드 수정 없이 cron 폴링·저장직후 sync·isAdChannel 에 자동 합류한다. 테이블 부재/오류 시 빈배열. */
    private static function registryChannels(string $syncKind): array
    {
        static $cache = [];
        if (isset($cache[$syncKind])) return $cache[$syncKind];
        $out = [];
        try {
            $st = Db::pdo()->prepare("SELECT channel_key FROM channel_registry WHERE is_active=1 AND sync_kind=?");
            $st->execute([$syncKind]);
            foreach ($st->fetchAll(PDO::FETCH_COLUMN) as $ck) { $c = (string)$ck; if ($c !== '') $out[] = $c; }
        } catch (\Throwable $e) { /* 레지스트리 부재 → 하드코딩만 사용 */ }
        return $cache[$syncKind] = array_values(array_unique($out));
    }

    /** [현 차수] H2: 광고 채널 여부 + 저장 직후 1회 ingest 동기화(저장 경로 무관 대칭화).
     *  [237차] 레지스트리 sync_kind='ad' 채널도 광고로 인지(커머스 isCommerceChannel 대칭). */
    public static function isAdChannel(string $channelKey): bool
    {
        return isset(self::AD_SHORT[$channelKey]) || in_array($channelKey, self::registryChannels('ad'), true);
    }
    /** [현 차수] 보편 채널 동기화: 지원되는 광고 채널 short 코드 전체(중복 제거). cron 이 하드코딩 목록 대신
     *  이 SSOT 를 폴링 대상으로 써, 신규 광고채널(예: kakao)을 AD_SHORT 한 곳에만 추가하면 cron·저장직후·
     *  isAdChannel 전부에 자동 전파된다(성과 누락→ROAS 허위 0 해소).
     *  [237차] 레지스트리 ad 채널 병합(fetcher 없는 채널은 fetch 디스패치에서 graceful no-op). */
    public static function adShortCodes(): array
    {
        return array_values(array_unique(array_merge(array_values(self::AD_SHORT), self::registryChannels('ad'))));
    }

    /**
     * [현 차수] GET /v424/connectors/campaign-funnel — 채널×objective 집계(목적별 퍼널 분류 근거).
     *   performance_metrics 의 extra_json.objective/reach 를 JSON 추출해 채널별 objective 버킷으로 합산한다.
     *   프론트(adFunnel.classifyCampaigns)가 objective→단계(도달인지/트래픽/전환) 분류 + 전체합산 CPM/빈도
     *   재계산. objective 미적재(라이브 동기화 전)면 빈 결과 → 프론트는 채널 누적 폴백(정직 배너).
     */
    public static function campaignFunnel(Request $req, Response $res): Response
    {
        $tenant = self::tenantId($req);
        $out = ['ok' => true, 'channels' => []];
        if ($tenant === '' || $tenant === 'demo') return TemplateResponder::respond($res, $out);
        try {
            $pdo = Db::pdo();
            $driver = $pdo->getAttribute(\PDO::ATTR_DRIVER_NAME);
            $obj = $driver === 'mysql' ? "JSON_UNQUOTE(JSON_EXTRACT(extra_json,'$.objective'))" : "json_extract(extra_json,'$.objective')";
            $rch = $driver === 'mysql' ? "JSON_EXTRACT(extra_json,'$.reach')" : "json_extract(extra_json,'$.reach')";
            $sql = "SELECT LOWER(channel) AS ch, $obj AS objective,
                           COALESCE(SUM(impressions),0) AS imp, COALESCE(SUM($rch),0) AS rch,
                           COALESCE(SUM(clicks),0) AS clk, COALESCE(SUM(spend),0) AS spd,
                           COALESCE(SUM(conversions),0) AS cnv, COALESCE(SUM(revenue),0) AS rev
                      FROM performance_metrics
                     WHERE tenant_id=? AND $obj IS NOT NULL AND $obj <> ''
                     GROUP BY LOWER(channel), $obj";
            $st = $pdo->prepare($sql);
            $st->execute([$tenant]);
            $byCh = [];
            foreach ($st->fetchAll(\PDO::FETCH_ASSOC) as $r) {
                $ch = (string)$r['ch'];
                if (!isset($byCh[$ch])) $byCh[$ch] = [];
                $byCh[$ch][] = [
                    'objective' => (string)$r['objective'], 'name' => (string)$r['objective'],
                    'impressions' => (int)$r['imp'], 'reach' => (int)$r['rch'], 'clicks' => (int)$r['clk'],
                    'spend' => (float)$r['spd'], 'conversions' => (int)$r['cnv'], 'revenue' => (float)$r['rev'],
                ];
            }
            $out['channels'] = $byCh;
        } catch (\Throwable $e) { /* graceful: 빈 결과 → 프론트 폴백 */ }
        return TemplateResponder::respond($res, $out);
    }

    /** 광고 채널 별칭 → 정규 키(매체보고 channel 과 attribution attributed_channel 정합). */
    private static function normAdCh(string $ch): string
    {
        $m = ['meta_ads' => 'meta', 'google_ads' => 'google', 'tiktok_business' => 'tiktok', 'tiktok_shop' => 'tiktok', 'naver_sa' => 'naver', 'kakao_moment' => 'kakao'];
        $c = strtolower(trim($ch));
        return $m[$c] ?? $c;
    }

    /**
     * [228차 S1] GET /v423/connectors/roas-reconciliation — 매체보고 ROAS vs 실주문귀속 ROAS 정합.
     *   매체보고 매출(performance_metrics.revenue)은 매체 자체 기여전환(뷰스루·중복·모델링)으로 체계적 과대.
     *   진실 = 광고 클릭ID(gclid/fbclid/ttclid)·픽셀 이메일매칭으로 실주문에 귀속된 매출(attribution_result
     *   model='order-match' ⨝ channel_orders). 두 ROAS를 채널별 병기 → 최적화 신호 정직화(자동화 두뇌 보정 근거).
     *   ★실주문 귀속만 = 광고에 진짜 귀속된 매출(과대 없음). truthRatio<1 이면 매체보고가 부풀려진 정도.
     */
    public static function roasReconciliation(Request $req, Response $res): Response
    {
        $tenant = self::tenantId($req);
        $out = ['ok' => true, 'channels' => [], 'totals' => ['spend' => 0, 'platformRevenue' => 0, 'realRevenue' => 0]];
        if ($tenant === '' || $tenant === 'demo' || str_starts_with($tenant, 'demo')) return TemplateResponder::respond($res, $out);
        try {
            $pdo = Db::pdo();
            // ① 매체보고(performance_metrics=광고 전용 테이블) — 전 광고 채널 집계.
            // [현 차수 감사 P2] 하드코딩 5채널 화이트리스트 제거 → 실매출측(②,채널 무필터)과 대칭.
            //   기존엔 snapchat/linkedin/criteo/pinterest/amazon_ads/microsoft_ads/x_ads/롱테일의 spend 가 누락돼
            //   totals.spend 과소 + 해당 채널 realRoas 가 spend=0 으로 강제 0표기되던 비대칭(staleness) 해소.
            //   performance_metrics 는 ad-scoped 테이블이고 normAdCh 가 양측 채널명 정규화 → 합집합 정합.
            $plat = [];
            try {
                $st = $pdo->prepare("SELECT LOWER(channel) ch, COALESCE(SUM(spend),0) spend, COALESCE(SUM(revenue),0) rev, COALESCE(SUM(conversions),0) conv
                    FROM performance_metrics WHERE tenant_id=? GROUP BY LOWER(channel)");
                $st->execute([$tenant]);
                foreach ($st->fetchAll(\PDO::FETCH_ASSOC) as $r) {
                    $ch = self::normAdCh((string)$r['ch']);
                    if (!isset($plat[$ch])) $plat[$ch] = ['spend' => 0, 'rev' => 0, 'conv' => 0];
                    $plat[$ch]['spend'] += (float)$r['spend']; $plat[$ch]['rev'] += (float)$r['rev']; $plat[$ch]['conv'] += (int)$r['conv'];
                }
            } catch (\Throwable $e) {}
            // ② 실주문 귀속 — attribution_result(order-match) ⨝ channel_orders(실 매출)
            $real = [];
            try {
                // [228차 일관성 P0] ★order당 dedup — attribution_result 에 동일 order 의 order-match 중복행이 있어도
                //   이중계산 방지(내부 GROUP BY ar.order_id 로 주문당 1행 → 외부에서 채널 집계). COUNT=distinct 전환수.
                $rs = $pdo->prepare("SELECT ch, COALESCE(SUM(rev),0) rev, COUNT(*) conv FROM (
                    SELECT LOWER(ar.attributed_channel) ch, ar.order_id, MAX(co.total_price) rev
                    FROM attribution_result ar JOIN channel_orders co ON co.tenant_id=ar.tenant_id AND co.channel_order_id=ar.order_id
                    WHERE ar.tenant_id=? AND ar.model='order-match' AND COALESCE(co.event_type,'order') NOT IN ('cancel','return') GROUP BY ar.order_id, LOWER(ar.attributed_channel)
                ) t GROUP BY ch");
                $rs->execute([$tenant]);
                foreach ($rs->fetchAll(\PDO::FETCH_ASSOC) as $r) {
                    $ch = self::normAdCh((string)$r['ch']);
                    if (!isset($real[$ch])) $real[$ch] = ['rev' => 0, 'conv' => 0];
                    $real[$ch]['rev'] += (float)$r['rev']; $real[$ch]['conv'] += (int)$r['conv'];
                }
            } catch (\Throwable $e) {}
            foreach (array_unique(array_merge(array_keys($plat), array_keys($real))) as $ch) {
                $sp = $plat[$ch]['spend'] ?? 0; $pr = $plat[$ch]['rev'] ?? 0; $rr = $real[$ch]['rev'] ?? 0;
                $out['channels'][] = [
                    'channel' => $ch, 'spend' => round($sp, 2),
                    'platformRevenue' => round($pr, 2), 'realRevenue' => round($rr, 2),
                    'platformRoas' => $sp > 0 ? round($pr / $sp, 2) : 0,
                    'realRoas' => $sp > 0 ? round($rr / $sp, 2) : 0,
                    'platformConv' => $plat[$ch]['conv'] ?? 0, 'realConv' => $real[$ch]['conv'] ?? 0,
                    'truthRatio' => $pr > 0 ? round($rr / $pr, 3) : null,
                ];
                $out['totals']['spend'] += $sp; $out['totals']['platformRevenue'] += $pr; $out['totals']['realRevenue'] += $rr;
            }
            $T = $out['totals'];
            $out['totals']['platformRoas'] = $T['spend'] > 0 ? round($T['platformRevenue'] / $T['spend'], 2) : 0;
            $out['totals']['realRoas'] = $T['spend'] > 0 ? round($T['realRevenue'] / $T['spend'], 2) : 0;
            $out['note'] = '실주문 귀속 ROAS = 광고 클릭ID/픽셀 매칭된 실 주문 매출 기준. 매체보고는 뷰스루·중복 포함으로 과대. truthRatio<1 = 매체보고 부풀림 정도.';
        } catch (\Throwable $e) { /* graceful */ }
        return TemplateResponder::respond($res, $out);
    }

    /**
     * [현 차수] POST /v424/connectors/ad-metrics — 범용 광고성과 ingest(추후 추가 채널 무코드 적재).
     *   전용 fetcher 가 없는 신규 광고채널도 표준 포맷으로 objective 포함 성과를 push 하면 campaignFunnel 이
     *   목적별 자동 분류(stageOf 키워드 폴백). api_key write 권한(미들웨어) + tenant 격리.
     *   body: { channel, rows:[{date,objective,impressions,reach,clicks,spend,conversions,revenue,campaign_id,name}] }
     */
    public static function adMetricsIngest(Request $req, Response $res): Response
    {
        $tenant = self::tenantId($req);
        if ($tenant === '' || $tenant === 'demo') return TemplateResponder::respond($res->withStatus(403), ['ok' => false, 'error' => 'tenant_required']);
        $b = (array)($req->getParsedBody() ?? []);
        $channel = strtolower(trim((string)($b['channel'] ?? '')));
        $rows = (array)($b['rows'] ?? []);
        if ($channel === '' || !$rows) return TemplateResponder::respond($res->withStatus(422), ['ok' => false, 'error' => 'channel and rows[] required']);
        $norm = []; $dates = [];
        foreach ($rows as $r) {
            if (!is_array($r)) continue;
            $d = substr((string)($r['date'] ?? ''), 0, 10);
            if ($d === '') continue;
            $dates[] = $d;
            $norm[] = [
                'team'            => (string)($r['team'] ?? ucfirst($channel)),
                'account'         => (string)($r['name'] ?? $r['campaign_name'] ?? $channel),
                'campaign_ext_id' => (string)($r['campaign_id'] ?? $r['campaign_ext_id'] ?? ''),
                'objective'       => (string)($r['objective'] ?? ''),
                'reach'           => (int)($r['reach'] ?? 0),
                'date'            => $d,
                'impressions'     => (int)($r['impressions'] ?? 0),
                'clicks'          => (int)($r['clicks'] ?? 0),
                'spend'           => (float)($r['spend'] ?? 0),
                'conversions'     => (int)($r['conversions'] ?? 0),
                'revenue'         => (float)($r['revenue'] ?? 0),
            ];
        }
        if (!$norm) return TemplateResponder::respond($res->withStatus(422), ['ok' => false, 'error' => 'no valid rows']);
        sort($dates); $start = $dates[0]; $end = $dates[count($dates) - 1];
        try {
            $n = self::persistMetricRows(Db::pdo(), $tenant, $channel, $norm, $start, $end);
            return TemplateResponder::respond($res, ['ok' => true, 'channel' => $channel, 'persisted' => $n, 'window' => "{$start}~{$end}"]);
        } catch (\Throwable $e) {
            return TemplateResponder::respond($res->withStatus(500), ['ok' => false, 'error' => 'persist_failed']);
        }
    }
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
        // [233차 감사 P1] 서명 정정 — 기존 gmdate('ymmdd')(月 'm' 중복 → yyMMMdd) + 서명메시지의 '{method}' 리터럴
        //   (미보간 → 서명 오염)로 쿠팡이 항상 401 거부, 실 테넌트 주문이 영구 0 이었다. ChannelSync::coupangFetch 정합.
        $datetime  = gmdate('ymd\THis\Z'); // yyMMdd'T'HHmmss'Z'
        $path      = "/v2/providers/seller_api/apis/api/v1/vendor-items/orders";
        $queryStr  = http_build_query([
            'createdAtFrom' => $startDate . 'T00:00:00',
            'createdAtTo'   => $endDate   . 'T23:59:59',
            'status'        => $status,
            'limit'         => min(50, (int)($q['limit'] ?? 20)),
        ]);
        $message   = "{$datetime}GET{$path}{$queryStr}";
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
            // [현 차수] Kakao/Naver/LINE — ad-group 입도 시도 → 데이터 없으면 campaign 폴백(additive-fallback, 회귀 0).
            'naver'  => fn() => self::adGroupOrFallback(fn() => self::fetchNaverAdGroupRows($tenant, $start, $end), fn() => self::fetchNaverRows($tenant, $start, $end)),
            'kakao'  => fn() => self::adGroupOrFallback(fn() => self::fetchKakaoAdGroupRows($tenant, $start, $end), fn() => self::fetchKakaoRows($tenant, $start, $end)),
            'line'   => fn() => self::adGroupOrFallback(fn() => self::fetchLineAdGroupRows($tenant, $start, $end), fn() => self::fetchLineRows($tenant, $start, $end)),
            // [240차] 커넥터 확장 — 신규 광고 데이터소스 실 fetch(자격증명 등록 시 동작·graceful 드롭인).
            'snapchat'  => fn() => self::fetchSnapchatRows($tenant, $start, $end),
            'linkedin'  => fn() => self::fetchLinkedinRows($tenant, $start, $end),
            'criteo'    => fn() => self::fetchCriteoRows($tenant, $start, $end),
            'pinterest' => fn() => self::fetchPinterestRows($tenant, $start, $end),
            // [240차 약점⑧] 광고 커넥터 확대 — Amazon/Microsoft/X Ads(게이트+OAuth 인증취득+graceful, 라이브 검증 후 매핑)
            'amazon_ads'    => fn() => self::fetchAmazonAdsRows($tenant, $start, $end),
            'microsoft_ads' => fn() => self::fetchMicrosoftAdsRows($tenant, $start, $end),
            'x_ads'         => fn() => self::fetchXAdsRows($tenant, $start, $end),
            // [현 차수] 롱테일 커넥터 5종 — 신용게이트(미설정 skip·키 등록 시 즉시 fetch·graceful).
            'reddit_ads'        => fn() => self::fetchRedditRows($tenant, $start, $end),
            'apple_search_ads'  => fn() => self::fetchAppleSearchAdsRows($tenant, $start, $end),
            'amazon_dsp'        => fn() => self::fetchAmazonDspRows($tenant, $start, $end),
            'quora_ads'         => fn() => self::fetchQuoraRows($tenant, $start, $end),
            'spotify_ads'       => fn() => self::fetchSpotifyAdsRows($tenant, $start, $end),
            // [R-P3-7] 네이티브 광고 커넥터 확대(콘텐츠 디스커버리) — 자격증명 등록 시 즉시 fetch·graceful.
            'taboola'           => fn() => self::fetchTaboolaRows($tenant, $start, $end),
            'outbrain'          => fn() => self::fetchOutbrainRows($tenant, $start, $end),
            'applovin'          => fn() => self::fetchAppLovinRows($tenant, $start, $end),
            'mintegral'         => fn() => self::fetchMintegralRows($tenant, $start, $end),
            'yandex_ads'        => fn() => self::fetchYandexRows($tenant, $start, $end),
            'yahoo_jp_ads'      => fn() => self::fetchYahooJpRows($tenant, $start, $end),
            // [P1 커넥터 폭] 웹 분석 인바운드 — performance_metrics 가 아닌 web_analytics_metrics 로 적재(아래 라우팅 분기).
            'ga4'               => fn() => self::fetchGa4Rows($tenant, $start, $end),
            'adobe_analytics'   => fn() => self::fetchAdobeAnalyticsRows($tenant, $start, $end),
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
            // [P1 커넥터 폭] 웹 분석 소스는 별도 테이블(web_analytics_metrics)로 적재 →
            //   광고 ROAS/demographic/keyword 로직을 절대 타지 않는다(이중계산·오분류 차단).
            if (self::isAnalyticsSource($ch)) {
                $persisted = self::persistAnalyticsRows($pdo, $tenant, $ch, $rows, $start, $end);
                $totalRows += $persisted;
                $summary[$ch] = ['status' => 'ok', 'rows' => $persisted, 'kind' => 'analytics'];
                continue;
            }
            $persisted = self::persistMetricRows($pdo, $tenant, $ch, $rows, $start, $end);
            $totalRows += $persisted;
            $summary[$ch] = ['status' => 'ok', 'rows' => $persisted];

            // [현 차수] 타겟 마케팅 데이터화 — 성과(performance_metrics) 외에 성별·연령·지역 demographic 을
            //   ad_insight_agg 에 자동수집(Decisioning::upsertAdInsights 공유=중복 없음). 실 매체 데이터만,
            //   실패해도 성과 적재엔 무영향(graceful). RollupDashboard 상품성과 '구매자 타겟층' 데이터 기반.
            try {
                $demoRows = self::fetchAdDemographics($ch, $tenant, $start, $end);
                if ($demoRows) {
                    $dn = \Genie\Handlers\Decisioning::upsertAdInsights($pdo, $tenant, $demoRows);
                    if ($dn > 0) $summary[$ch]['demographics'] = $dn;
                }
            } catch (\Throwable $e) { /* demographic 수집 실패 = 정직 무시(성과 적재 보존) */ }

            // [현 차수 P2-2a] 키워드 입도 — 검색광고(google/naver)의 키워드별 성과를 ★별도 keyword_insight 테이블에
            //   수집(performance_metrics 와 이중계산 회피). 검색 채널 세분 귀속 분석 기반. 실패=정직 무시(성과 보존).
            if (in_array($ch, ['google', 'naver'], true)) {
                try {
                    $kw = ($ch === 'google') ? self::fetchGoogleKeywordRows($tenant, $start, $end) : self::fetchNaverKeywordRows($tenant, $start, $end);
                    if (!empty($kw['live']) && !empty($kw['rows'])) {
                        $kn = self::persistKeywordRows($pdo, $tenant, $ch, $kw['rows'], $start, $end);
                        if ($kn > 0) $summary[$ch]['keywords'] = $kn;
                    }
                } catch (\Throwable $e) { /* 키워드 수집 실패 = 정직 무시 */ }
            }
        }

        // [R-P1-2] 신선도 추적 — 채널별 마지막 동기화 시각·상태·행수 기록(테넌트×채널 단일행 upsert).
        try { self::recordSyncFreshness($pdo, $tenant, $summary); } catch (\Throwable $e) { /* graceful */ }

        return [
            'tenant_id'  => $tenant,
            'window'     => compact('start', 'end'),
            'persisted'  => $totalRows,
            'channels'   => $summary,
        ];
    }

    /** [R-P1-2] connector_sync_log 테이블 보장. 테넌트×채널 단일행(최신 동기화 상태). */
    private static function ensureSyncLogTable(PDO $pdo): void
    {
        try {
            $pdo->exec("CREATE TABLE IF NOT EXISTS connector_sync_log (
                tenant_id VARCHAR(100), channel VARCHAR(100),
                status VARCHAR(20), rows_persisted INT DEFAULT 0,
                synced_at VARCHAR(32),
                PRIMARY KEY (tenant_id, channel)
            )");
        } catch (\Throwable $e) { /* graceful */ }
    }

    /** runSync 결과 summary 를 채널별 신선도 행으로 upsert. ok=실수집 시각, skipped/error=시도 시각+상태. */
    private static function recordSyncFreshness(PDO $pdo, string $tenant, array $summary): void
    {
        if ($tenant === '' || empty($summary)) return;
        self::ensureSyncLogTable($pdo);
        $now = gmdate('c');
        $isMy = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'mysql';
        $sql = $isMy
            ? "INSERT INTO connector_sync_log(tenant_id,channel,status,rows_persisted,synced_at) VALUES(?,?,?,?,?)
               ON DUPLICATE KEY UPDATE status=VALUES(status), rows_persisted=VALUES(rows_persisted), synced_at=VALUES(synced_at)"
            : "INSERT INTO connector_sync_log(tenant_id,channel,status,rows_persisted,synced_at) VALUES(?,?,?,?,?)
               ON CONFLICT(tenant_id,channel) DO UPDATE SET status=excluded.status, rows_persisted=excluded.rows_persisted, synced_at=excluded.synced_at";
        $st = $pdo->prepare($sql);
        foreach ($summary as $ch => $s) {
            $status = (string)($s['status'] ?? 'unknown');
            $rows = (int)($s['rows'] ?? 0);
            $st->execute([$tenant, (string)$ch, $status, $rows, $now]);
        }
    }

    /**
     * [R-P1-2] GET /v423/connectors/freshness — 채널별 마지막 동기화 시각·경과(분)·신선도 등급.
     *   준실시간 신선도 표면화: 각 채널 "N분 전 업데이트", stale(>90분) 경고. 실DB 파생.
     */
    public static function freshness(Request $request, Response $response, array $args): Response
    {
        $tenant = (string)($request->getAttribute('auth_tenant') ?? '');
        if ($tenant === '') { $tenant = UserAuth::authedTenant($request) ?? ''; }
        $out = ['ok' => true, 'channels' => [], 'last_sync_at' => null, 'oldest_minutes' => null];
        if ($tenant === '') { $response->getBody()->write(json_encode($out)); return $response->withHeader('Content-Type', 'application/json'); }
        try {
            $pdo = Db::pdo(); self::ensureSyncLogTable($pdo);
            $st = $pdo->prepare("SELECT channel, status, rows_persisted, synced_at FROM connector_sync_log WHERE tenant_id=? ORDER BY synced_at DESC");
            $st->execute([$tenant]);
            $rows = $st->fetchAll(PDO::FETCH_ASSOC) ?: [];
            $now = time(); $latest = null; $oldestMin = null; $chans = [];
            foreach ($rows as $r) {
                $ts = strtotime((string)$r['synced_at']) ?: 0;
                $minAgo = $ts > 0 ? (int)floor(($now - $ts) / 60) : null;
                $grade = $minAgo === null ? 'unknown' : ($minAgo <= 20 ? 'fresh' : ($minAgo <= 90 ? 'recent' : 'stale'));
                $chans[] = [
                    'channel' => (string)$r['channel'], 'status' => (string)$r['status'],
                    'rows' => (int)$r['rows_persisted'], 'synced_at' => (string)$r['synced_at'],
                    'minutes_ago' => $minAgo, 'freshness' => $grade,
                ];
                if ($ts > 0 && ($latest === null || $ts > $latest)) $latest = $ts;
                if ($ts > 0 && (string)$r['status'] === 'ok' && ($oldestMin === null || $minAgo > $oldestMin)) $oldestMin = $minAgo;
            }
            $out['channels'] = $chans;
            $out['last_sync_at'] = $latest ? gmdate('c', $latest) : null;
            $out['last_sync_minutes_ago'] = $latest ? (int)floor(($now - $latest) / 60) : null;
            $out['oldest_minutes'] = $oldestMin;
        } catch (\Throwable $e) { /* graceful — 빈 결과 */ }
        $response->getBody()->write(json_encode($out, JSON_UNESCAPED_UNICODE));
        return $response->withHeader('Content-Type', 'application/json');
    }

    /**
     * 광고 자격증명을 보유한 테넌트 목록 — cron 팬아웃용.
     * channel_credential 의 활성 광고 채널(meta_ads/google_ads/tiktok_business) 보유 테넌트.
     */
    public static function tenantsWithAdCreds(): array
    {
        $pdo = Db::pdo();
        try {
            // [현 차수 P1] AD_SHORT SSOT 동적 IN — 하드코딩 5채널 목록을 제거하고 광고채널 정본(AD_SHORT)에서
            //   파생. 신규 광고채널을 AD_SHORT 한 곳에만 추가하면 cron 팬아웃이 자동 편입된다(저장직후·수동·cron 대칭).
            // [237차] AD_SHORT 저장키 + 레지스트리 ad 채널 병합(커머스 commerceTenantChannels 대칭).
            $adKeys = array_values(array_unique(array_merge(array_keys(self::AD_SHORT), self::registryChannels('ad'))));
            $ph = implode(',', array_fill(0, count($adKeys), '?'));
            $stmt = $pdo->prepare(
                "SELECT DISTINCT tenant_id FROM channel_credential
                  WHERE is_active=1
                    AND channel IN ($ph)
                    AND tenant_id IS NOT NULL AND tenant_id<>''"
            );
            $stmt->execute($adKeys);
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

    /** [227차] performance_metrics.currency 컬럼 존재 여부(멱등 감지). */
    private static function perfHasCurrencyCol(PDO $pdo): bool
    {
        static $cached = null;
        if ($cached !== null) return $cached;
        try {
            if ($pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'mysql') {
                $q = $pdo->query("SHOW COLUMNS FROM performance_metrics LIKE 'currency'");
                $cached = ($q && $q->fetch() !== false);
                if (!$cached) { try { $pdo->exec("ALTER TABLE performance_metrics ADD COLUMN currency VARCHAR(8) DEFAULT 'KRW'"); $cached = true; } catch (\Throwable $e) {} }
            } else {
                $cached = false;
                foreach ($pdo->query("PRAGMA table_info(performance_metrics)")->fetchAll(PDO::FETCH_ASSOC) as $c) {
                    if (($c['name'] ?? '') === 'currency') { $cached = true; break; }
                }
                if (!$cached) { try { $pdo->exec("ALTER TABLE performance_metrics ADD COLUMN currency TEXT DEFAULT 'KRW'"); $cached = true; } catch (\Throwable $e) {} }
            }
        } catch (\Throwable $e) { $cached = false; }
        return $cached;
    }

    /**
     * [227차] 통화→KRW 정규화. 광고계정 통화(USD 등)로 표기된 spend/revenue 를 KRW 로 환산해 저장한다.
     *   기존엔 통화 무관하게 원값 저장 → 다통화 계정 합산 시 ROAS/지출 왜곡. KRW/빈값/미상통화는 무변환(정직).
     */
    public static function fxToKrw(float $amount, string $currency): float
    {
        $currency = strtoupper(trim($currency));
        if ($currency === '' || $currency === 'KRW' || $amount == 0.0) return $amount;
        $rates = self::fxRates();
        $rate = $rates[$currency] ?? 0.0;
        return $rate > 0 ? $amount * $rate : $amount; // 미상 통화 → 무변환
    }

    /**
     * [현 차수] 보고통화 지원 — KRW(내부 base) → 보고통화 환산. fxToKrw 의 역방향.
     *   내부 집계는 KRW SSOT 로 유지하고 표기(reporting)만 테넌트 지정 통화로 변환한다(P&L 다통화 리포팅).
     *   rate = KRW/1단위 보고통화. KRW·미상통화(rate<=0)는 무변환(정직).
     */
    public static function krwToCurrency(float $krwAmount, string $currency): float
    {
        $currency = strtoupper(trim($currency));
        if ($currency === '' || $currency === 'KRW') return $krwAmount;
        $rate = self::fxRateKrwPerUnit($currency);
        return $rate > 0 ? $krwAmount / $rate : $krwAmount; // 미상 통화 → 무변환(KRW 값 유지)
    }

    /** [현 차수] 통화 1단위당 KRW 환율(KRW=1.0, 미상=0.0). 보고통화 환산·표기용 공개 접근자. */
    public static function fxRateKrwPerUnit(string $currency): float
    {
        $currency = strtoupper(trim($currency));
        if ($currency === 'KRW' || $currency === '') return 1.0;
        $rates = self::fxRates();
        return (float)($rates[$currency] ?? 0.0);
    }

    /** 통화별 KRW 환율(1단위당 KRW). 캐시(app_setting fx_rates_krw, 24h) → 무료 API → 폴백 기본값. */
    private static function fxRates(): array
    {
        static $cache = null;
        if ($cache !== null) return $cache;
        // [현 차수 감사 P2] SEA 통화(MYR/PHP/IDR)+INR 추가 — Shopee/Lazada 가 IDR/MYR/PHP 를 정확 추출하나 환율맵
        //   부재로 fxToKrw 무변환(예: 150,000 IDR 이 ₩150,000 으로 ~12배 과대)되던 상시 결함 해소.
        $defaults = ['KRW'=>1.0,'USD'=>1350.0,'EUR'=>1450.0,'JPY'=>9.0,'CNY'=>185.0,'GBP'=>1700.0,'HKD'=>173.0,'SGD'=>1000.0,'AUD'=>890.0,'CAD'=>985.0,'TWD'=>42.0,'THB'=>37.0,'VND'=>0.053,'MYR'=>305.0,'PHP'=>23.5,'IDR'=>0.084,'INR'=>16.0,'RUB'=>15.0,'BRL'=>245.0,'MXN'=>75.0,'PLN'=>337.0,'TRY'=>42.0,'AED'=>368.0,'SAR'=>360.0];
        try {
            $pdo = Db::pdo();
            $st = $pdo->prepare("SELECT svalue, updated_at FROM app_setting WHERE skey='fx_rates_krw' LIMIT 1");
            $st->execute();
            $row = $st->fetch(PDO::FETCH_ASSOC) ?: null;
            if ($row && !empty($row['svalue'])) {
                $age = time() - (int)strtotime((string)($row['updated_at'] ?? '1970-01-01'));
                $data = json_decode((string)$row['svalue'], true);
                if (is_array($data) && $age < 86400 && !empty($data['USD'])) { $cache = $data + $defaults; return $cache; }
            }
            $live = self::fxFetchLive();
            if (!empty($live['USD'])) {
                try {
                    $now = gmdate('c'); $json = json_encode($live);
                    $isMy = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'mysql';
                    $sql = $isMy
                        ? "INSERT INTO app_setting(skey,svalue,updated_at) VALUES('fx_rates_krw',?,?) ON DUPLICATE KEY UPDATE svalue=VALUES(svalue),updated_at=VALUES(updated_at)"
                        : "INSERT INTO app_setting(skey,svalue,updated_at) VALUES('fx_rates_krw',?,?) ON CONFLICT(skey) DO UPDATE SET svalue=excluded.svalue,updated_at=excluded.updated_at";
                    $pdo->prepare($sql)->execute([$json, $now]);
                } catch (\Throwable $e) {}
                $cache = $live + $defaults; return $cache;
            }
            if ($row && !empty($row['svalue'])) { $data = json_decode((string)$row['svalue'], true); if (is_array($data) && !empty($data['USD'])) { $cache = $data + $defaults; return $cache; } }
        } catch (\Throwable $e) {}
        $cache = $defaults; return $cache;
    }

    /** 무료 FX API(open.er-api.com, 무키, USD base) → 통화별 KRW 환율. 실패 시 빈 배열. */
    private static function fxFetchLive(): array
    {
        try {
            [$code, $body] = self::httpGet('https://open.er-api.com/v6/latest/USD');
            if ($code === 200 && !empty($body['rates']['KRW']) && (float)$body['rates']['KRW'] > 0) {
                $usdKrw = (float)$body['rates']['KRW']; $rates = $body['rates'];
                $out = ['KRW'=>1.0,'USD'=>$usdKrw];
                foreach (['EUR','JPY','CNY','GBP','HKD','SGD','AUD','CAD','TWD','THB','VND','MYR','PHP','IDR','INR','RUB','BRL','MXN','PLN','TRY','AED','SAR'] as $c) {
                    if (!empty($rates[$c]) && (float)$rates[$c] > 0) $out[$c] = $usdKrw / (float)$rates[$c]; // 1 unit C → KRW
                }
                return $out;
            }
        } catch (\Throwable $e) {}
        return [];
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
            $hasCurCol  = self::perfHasCurrencyCol($pdo); // [227차] 다통화 정규화
            $cols = ['tenant_id', 'team', 'channel', 'account', 'date', 'impressions', 'clicks', 'spend', 'conversions', 'revenue'];
            if ($hasCampCol) $cols[] = 'campaign_ext_id';
            if ($hasAdCol)   $cols[] = 'ad_ext_id';
            if ($hasCurCol)  $cols[] = 'currency';
            $cols[] = 'extra_json';
            $ins = $pdo->prepare('INSERT INTO performance_metrics (' . implode(',', $cols) . ') VALUES (' . implode(',', array_fill(0, count($cols), '?')) . ')');
            $n = 0;
            foreach ($rows as $r) {
                $date = (string)($r['date'] ?? '');
                if ($date === '') continue;
                // 적재는 동기화 구간으로 제한(API 가 범위 밖 날짜를 돌려줘도 격리).
                if ($date < $start || $date > $end) continue;
                // [227차] 다통화 정규화: 광고계정 통화(currency)로 표기된 spend/revenue 를 KRW 로 환산 저장.
                //   다운스트림(Rollup/aggMetrics/DashOverview)은 통화무관 SUM 이라, 저장 시점에 KRW 통일해야 정합.
                $curr = strtoupper((string)($r['currency'] ?? 'KRW'));
                $spendKrw = self::fxToKrw((float)($r['spend'] ?? 0), $curr);
                $revKrw   = self::fxToKrw((float)($r['revenue'] ?? 0), $curr);
                $base = [
                    $tenant,
                    (string)($r['team'] ?? ''),
                    strtolower($channel),
                    (string)($r['account'] ?? ''),
                    $date,
                    (int)($r['impressions'] ?? 0),
                    (int)($r['clicks'] ?? 0),
                    $spendKrw,
                    (int)($r['conversions'] ?? 0),
                    $revKrw,
                ];
                // [현 차수] objective(캠페인 목적)·reach(도달)를 extra_json 에 적재(스키마 변경 없이) →
                //   campaign-funnel 엔드포인트가 JSON 추출로 목적별 그룹·도달 합산.
                $extraData = (array)($r['extra'] ?? []);
                if (($r['objective'] ?? '') !== '') $extraData['objective'] = (string)$r['objective'];
                if (isset($r['reach']))             $extraData['reach'] = (int)$r['reach'];
                $extra = $extraData ? json_encode($extraData, JSON_UNESCAPED_UNICODE) : null;
                if ($hasCampCol) $base[] = ($r['campaign_ext_id'] ?? '') !== '' ? (string)$r['campaign_ext_id'] : null;
                if ($hasAdCol)   $base[] = ($r['ad_ext_id'] ?? '') !== '' ? (string)$r['ad_ext_id'] : null;
                if ($hasCurCol)  $base[] = $curr; // 원 통화 보존(감사·재환산용); spend/revenue 는 KRW
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
        // [현 차수] objective(캠페인 목적)·reach(도달) 수집 → 대시보드 목적별 퍼널 분류·빈도 산출 근거.
        $fields = 'campaign_id,campaign_name,objective,adset_id,ad_id,impressions,reach,frequency,clicks,spend,actions,action_values';
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

        // [227차] 광고계정 통화 — Meta insights 의 spend/action_values 는 이 통화로 표기(USD/KRW 등 혼재).
        //   다통화 정규화 위해 1회 조회해 행에 stamp(persist 에서 KRW 환산). 실패 시 KRW 가정(국내 기본).
        $acctCur = 'KRW';
        [$cc, $cb] = self::httpGet("https://graph.facebook.com/v19.0/act_{$adAccountId}?fields=currency&access_token=" . urlencode($accessToken));
        if ($cc === 200 && !empty($cb['currency'])) $acctCur = strtoupper((string)$cb['currency']);

        $rows = [];
        foreach (($body['data'] ?? []) as $r) {
            [$conv, $rev] = self::metaConvValue($r['actions'] ?? [], $r['action_values'] ?? []);
            $rows[] = [
                'team'        => 'Meta',
                'account'     => (string)($r['campaign_name'] ?? 'Meta Campaign'),
                'campaign_ext_id' => (string)($r['campaign_id'] ?? ''),
                'ad_ext_id'   => (string)($r['ad_id'] ?? ''),
                'objective'   => (string)($r['objective'] ?? ''),
                'reach'       => (int)($r['reach'] ?? 0),
                'date'        => (string)($r['date_start'] ?? $r['date_stop'] ?? ''),
                'impressions' => (int)($r['impressions'] ?? 0),
                'clicks'      => (int)($r['clicks'] ?? 0),
                'spend'       => (float)($r['spend'] ?? 0),
                'conversions' => $conv,
                'revenue'     => $rev,
                'currency'    => $acctCur,
            ];
        }
        return ['hasCreds' => true, 'live' => true, 'rows' => $rows];
    }

    /**
     * [현 차수] 광고 demographic(성별·연령·지역) 자동수집 디스패처 — 타겟 마케팅 분석용 데이터화.
     *   채널별 breakdown 지원 매체만 실수집(현재 Meta). 미지원 매체는 빈 배열(정직·날조 없음).
     *   ★상품(sku)별 성별/연령은 매체 표준 API 가 product_id 와 age/gender 를 한 호출로 결합 못 해(Meta 제약)
     *     캠페인 레벨로 수집된다. 상품태깅(쇼핑/카탈로그 캠페인) 또는 1차 enrichment push(POST /v418x/ingest/ad-insights,
     *     Decisioning::upsertAdInsights 공유) 시 sku 차원이 채워져 RollupDashboard 상품성과 '구매자 타겟층'에 자동 반영.
     */
    private static function fetchAdDemographics(string $channel, string $tenant, string $start, string $end): array
    {
        switch ($channel) {
            case 'meta': return self::fetchMetaDemographics($tenant, $start, $end);
            case 'tiktok': return self::fetchTiktokDemographics($tenant, $start, $end); // [초고도화 #6] non-Meta 데모그래픽
            // 그 외 매체(google/naver 등)는 demographic breakdown 어댑터 추가 시 여기 배선(현재 정직 미수집).
            default: return [];
        }
    }

    /** [현 차수] Meta Insights demographic breakdown(성별·연령·국가) 실수집 → ad_insight_agg 행. 자격증명·API 실패 시 빈 배열(graceful). */
    private static function fetchMetaDemographics(string $tenant, string $start, string $end): array
    {
        $accessToken = (string)(getenv('META_ACCESS_TOKEN')  ?: self::loadCred($tenant, 'meta_ads', 'access_token'));
        $adAccountId = (string)(getenv('META_AD_ACCOUNT_ID') ?: self::loadCred($tenant, 'meta_ads', 'ad_account_id'));
        if ($accessToken === '' || $adAccountId === '') return [];
        $out = [];
        // 성별·연령 분포(캠페인 레벨). Meta 표준 breakdowns=age,gender(결합 허용).
        self::metaDemoCall($adAccountId, $accessToken, $start, $end, 'age,gender', $out);
        // 지역 분포(국가). breakdowns=country.
        self::metaDemoCall($adAccountId, $accessToken, $start, $end, 'country', $out);
        // [현 차수 감사 P2] 통화 정규화 — Meta 계정통화(account_currency) spend/revenue → KRW. ad_insight_agg 에 currency
        //   컬럼이 없어 비-KRW 계정은 raw 통화로 적재되어 KRW 원가/광고비와 혼합산술(productChannelMatrix net_profit) 왜곡.
        //   performance_metrics(persistMetricRows fxToKrw)와 정합. KRW/미설정 계정은 무변환(기존 동작 보존).
        $cur = strtoupper((string)(self::loadCred($tenant, 'meta_ads', 'account_currency') ?: 'KRW'));
        if ($cur !== '' && $cur !== 'KRW') {
            foreach ($out as &$row) {
                $row['spend']   = self::fxToKrw((float)($row['spend'] ?? 0), $cur);
                $row['revenue'] = self::fxToKrw((float)($row['revenue'] ?? 0), $cur);
            }
            unset($row);
        }
        return $out;
    }

    /** Meta insights demographic 1회 호출 → $out 누적(실 매체 데이터만, 날조 없음). breakdown 미지원/에러 시 무시(graceful). */
    private static function metaDemoCall(string $adAccountId, string $token, string $start, string $end, string $breakdowns, array &$out): void
    {
        $params = http_build_query([
            'time_range'  => json_encode(['since' => $start, 'until' => $end]),
            'level'       => 'campaign',
            'fields'      => 'campaign_id,campaign_name,impressions,clicks,spend,actions,action_values',
            'breakdowns'  => $breakdowns,
            'limit'       => 500,
            'access_token'=> $token,
        ]);
        $url = "https://graph.facebook.com/v19.0/act_{$adAccountId}/insights?{$params}";
        [$code, $body, $err] = self::httpGet($url);
        if ($err || $code >= 400 || isset($body['error'])) return; // breakdown 미허용/권한부족 → 정직 무시
        foreach (($body['data'] ?? []) as $r) {
            [$conv, $rev] = self::metaConvValue($r['actions'] ?? [], $r['action_values'] ?? []);
            $out[] = [
                'platform'    => 'meta',
                'date'        => (string)($r['date_start'] ?? $start),
                'campaign_id' => (string)($r['campaign_id'] ?? ''),
                'gender'      => isset($r['gender']) ? (string)$r['gender'] : null,
                'age_range'   => isset($r['age']) ? (string)$r['age'] : null,
                'region'      => isset($r['country']) ? (string)$r['country'] : null,
                'impressions' => (int)($r['impressions'] ?? 0),
                'clicks'      => (int)($r['clicks'] ?? 0),
                'spend'       => (float)($r['spend'] ?? 0),
                'conversions' => $conv,
                'revenue'     => $rev,
            ];
        }
    }

    /** [초고도화 #6] TikTok 광고 demographic(성별·연령·국가) 실수집 → ad_insight_agg 행. fetchMetaDemographics 와 동일 row
     *  형태(upsertAdInsights 공유=중복0). 자격증명/API 실패·breakdown 미허용 시 빈 배열(graceful·날조 없음). */
    private static function fetchTiktokDemographics(string $tenant, string $start, string $end): array
    {
        $token = (string)self::loadCred($tenant, 'tiktok_business', 'access_token');
        $advId = (string)self::loadCred($tenant, 'tiktok_business', 'advertiser_id');
        if ($token === '' || $advId === '') return [];
        $out = [];
        self::tiktokDemoCall($token, $advId, $start, $end, ['campaign_id', 'gender', 'age'], $out);
        self::tiktokDemoCall($token, $advId, $start, $end, ['campaign_id', 'country_code'], $out);
        // 통화 정규화(Meta 패턴 정합) — TikTok 계정통화 → KRW(ad_insight_agg KRW 일관).
        $cur = strtoupper((string)(self::loadCred($tenant, 'tiktok_business', 'account_currency') ?: 'KRW'));
        if ($cur !== '' && $cur !== 'KRW') {
            foreach ($out as &$row) { $row['spend'] = self::fxToKrw((float)($row['spend'] ?? 0), $cur); $row['revenue'] = self::fxToKrw((float)($row['revenue'] ?? 0), $cur); }
            unset($row);
        }
        return $out;
    }

    /** TikTok AUDIENCE 리포트 1회 호출(기존 fetchTiktokRows 패턴 정합) → $out 누적. 실패/미허용 시 정직 무시(graceful). */
    private static function tiktokDemoCall(string $token, string $advId, string $start, string $end, array $dims, array &$out): void
    {
        $payload = [
            'advertiser_id' => $advId, 'report_type' => 'AUDIENCE', 'dimensions' => $dims,
            'metrics' => ['spend', 'impressions', 'clicks', 'conversion', 'complete_payment'],
            'data_level' => 'AUCTION_CAMPAIGN', 'start_date' => $start, 'end_date' => $end, 'page_size' => 200, 'page' => 1,
        ];
        [$code, $body, $err] = self::httpPost('https://business-api.tiktok.com/open_api/v1.3/report/integrated/get', $payload, ['Access-Token' => $token, 'Content-Type' => 'application/json']);
        if ($err !== null || $code >= 400 || (int)($body['code'] ?? -1) !== 0) return; // breakdown 미허용/권한부족 → 정직 무시
        foreach (($body['data']['list'] ?? []) as $r) {
            $dim = (array)($r['dimensions'] ?? []); $met = (array)($r['metrics'] ?? []);
            $out[] = [
                'platform'    => 'tiktok', 'date' => $start,
                'campaign_id' => (string)($dim['campaign_id'] ?? ''),
                'gender'      => isset($dim['gender']) ? (string)$dim['gender'] : null,
                'age_range'   => isset($dim['age']) ? (string)$dim['age'] : null,
                'region'      => isset($dim['country_code']) ? (string)$dim['country_code'] : null,
                'impressions' => (int)($met['impressions'] ?? 0), 'clicks' => (int)($met['clicks'] ?? 0),
                'spend'       => (float)($met['spend'] ?? 0), 'conversions' => (int)round((float)($met['conversion'] ?? 0)),
                'revenue'     => (float)($met['complete_payment'] ?? 0),
            ];
        }
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

        // [현 차수 P2] 리포트 입도 확장: FROM campaign → FROM ad_group_ad(소재 단위 ad.id). ad_group/ad id·name 동반
        //   수집 → ad_ext_id + extra(level/adset) 적재. campaign.advertising_channel_type = objective(adFunnel 매핑).
        //   ★완전성: searchStream 전 청크 수집 + LIMIT 상향(10000). LIMIT 도달 시 truncate 경고 로그(무음 누락 금지 —
        //   campaign 합계 undercount 가시화). 다운스트림 SUM 이라 캠페인 집계 무손상. customer.currency_code = 다통화.
        $LIMIT = 10000;
        $gaql = "SELECT campaign.name, campaign.resource_name, campaign.advertising_channel_type,
                        ad_group.id, ad_group.name,
                        ad_group_ad.ad.id, ad_group_ad.ad.name,
                        customer.currency_code,
                        metrics.impressions, metrics.clicks, metrics.cost_micros,
                        metrics.conversions, metrics.conversions_value, segments.date
                 FROM ad_group_ad
                 WHERE segments.date BETWEEN '$start' AND '$end' AND ad_group_ad.status != 'REMOVED'
                 ORDER BY segments.date DESC LIMIT $LIMIT";
        $url = "https://googleads.googleapis.com/v17/customers/{$customerId}/googleAds:searchStream";
        [$code, $body, $err] = self::httpPost($url, ['query' => $gaql], [
            'Authorization'   => "Bearer {$accessToken}",
            'developer-token' => $devToken,
            'Content-Type'    => 'application/json',
        ]);

        if ($err || $code >= 400) {
            return ['hasCreds' => true, 'live' => false, 'error' => $err ?? "google http $code"];
        }

        // searchStream 응답은 청크 배열([{results:[...]}, ...]) 또는 단일 {results:[...]}. 전 청크 평탄화(누락 방지).
        $results = [];
        if (isset($body['results'])) {
            $results = (array)$body['results'];
        } else {
            foreach ((array)$body as $chunk) {
                if (is_array($chunk) && isset($chunk['results'])) $results = array_merge($results, (array)$chunk['results']);
            }
        }
        $rows = [];
        foreach ($results as $r) {
            $rows[] = [
                'team'        => 'Google Ads',
                'account'     => (string)($r['campaign']['name'] ?? 'Google Campaign'),
                'campaign_ext_id' => (string)($r['campaign']['resourceName'] ?? ''),
                'ad_ext_id'   => (string)($r['adGroupAd']['ad']['id'] ?? ''),
                'objective'   => (string)($r['campaign']['advertisingChannelType'] ?? ''),
                'date'        => (string)($r['segments']['date'] ?? ''),
                'impressions' => (int)($r['metrics']['impressions'] ?? 0),
                'clicks'      => (int)($r['metrics']['clicks'] ?? 0),
                'spend'       => round((int)($r['metrics']['costMicros'] ?? 0) / 1_000_000, 2),
                'conversions' => (int)round((float)($r['metrics']['conversions'] ?? 0)),
                'revenue'     => round((float)($r['metrics']['conversionsValue'] ?? 0), 2),
                'currency'    => strtoupper((string)($r['customer']['currencyCode'] ?? 'KRW')),
                'extra'       => [
                    'level'        => 'ad',
                    'adset_ext_id' => (string)($r['adGroup']['id'] ?? ''),
                    'adset_name'   => (string)($r['adGroup']['name'] ?? ''),
                    'ad_name'      => (string)($r['adGroupAd']['ad']['name'] ?? ''),
                ],
            ];
        }
        // ★완전성/안정성(P2 감사 R1): LIMIT 도달 = 절단 가능 → ORDER BY date DESC 특성상 가장 오래된 날짜가 잘리고
        //   persist DELETE 가 그 날짜를 0으로 비워 undercount 한다. 불완전 데이터로 기존 완전 데이터를 덮지 않도록
        //   live:false 반환(기존 데이터 보존·에러 표면화). 대형 계정은 window 축소/page_token 순회 필요. (TikTok 페이지네이션과 정합)
        if (count($results) >= $LIMIT) {
            error_log("[Connectors.fetchGoogleRows] tenant=$tenant LIMIT($LIMIT) 도달 — 절단 우려로 적재 보류(기존 데이터 보존).");
            return ['hasCreds' => true, 'live' => false, 'error' => "google ad-level rows truncated at LIMIT $LIMIT — preserving existing data (window 축소 또는 page_token 필요)"];
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

        // [228차 S1] ★광고주 통화 — TikTok spend/total_purchase_value 는 광고계정 통화(USD 등) 표기.
        //   기존엔 통화 미stamp → persist 가 KRW 기본값 적용 → USD 빌링 광고주 spend/ROAS 왜곡.
        //   advertiser/info 1회 조회로 통화 캡처(실패 시 KRW 가정). persist 에서 KRW 환산 저장.
        $ttCur = 'KRW';
        [$ic, $ib] = self::httpGet('https://business-api.tiktok.com/open_api/v1.3/advertiser/info/?'
            . http_build_query(['advertiser_ids' => json_encode([$advertiserId])]), ['Access-Token' => $accessToken]);
        if (($ic ?? 0) < 400 && (int)($ib['code'] ?? -1) === 0) {
            $ttCur = strtoupper((string)((($ib['data']['list'][0]['currency'] ?? '')) ?: 'KRW'));
        }

        // [현 차수 P2] 리포트 입도 확장: AUCTION_CAMPAIGN → AUCTION_AD(소재 단위 ad_id). adgroup/campaign id·name 동반
        //   수집 → ad_ext_id + extra(level/adset) 적재. ★완전성: page_info.total_page 까지 페이지네이션해 전수 적재
        //   (truncate 시 campaign 합계 undercount = spend/ROAS 왜곡 회귀를 방지). 다운스트림은 SUM 이라 캠페인 집계 무손상.
        $rows = [];
        $page = 1; $totalPage = 1; $pageSize = 200; $guard = 0;
        do {
            $payload = [
                'advertiser_id' => $advertiserId,
                'report_type'   => 'BASIC',
                'dimensions'    => ['ad_id', 'stat_time_day'],
                // objective_type(REACH/TRAFFIC/CONVERSIONS…)·reach·소재 식별(ad/adgroup/campaign name·id).
                'metrics'       => ['ad_name', 'adgroup_id', 'adgroup_name', 'campaign_id', 'campaign_name', 'objective_type', 'spend', 'clicks', 'impressions', 'reach', 'conversion', 'total_purchase_value'],
                'data_level'    => 'AUCTION_AD',
                'start_date'    => $start,
                'end_date'      => $end,
                'page_size'     => $pageSize,
                'page'          => $page,
            ];
            [$code, $body, $err] = self::httpPost(
                'https://business-api.tiktok.com/open_api/v1.3/report/integrated/get',
                $payload,
                ['Access-Token' => $accessToken, 'Content-Type' => 'application/json']
            );
            if ($err || $code >= 400 || (int)($body['code'] ?? -1) !== 0) {
                // ★완전성/안정성(P2 감사 R2): 어느 페이지든 실패하면 부분 적재 대신 전체 실패 처리 → 기존 데이터 보존.
                //   persist DELETE-then-INSERT 가 부분 rows 로 윈도를 덮어 일시적 undercount 하는 회귀 차단(all-or-nothing).
                return ['hasCreds' => true, 'live' => false, 'error' => $err ?? ($body['message'] ?? "tiktok http $code (page $page)")];
            }
            foreach (($body['data']['list'] ?? []) as $r) {
                $dim = $r['dimensions'] ?? [];
                $m   = $r['metrics'] ?? [];
                $rows[] = [
                    'team'        => 'TikTok',
                    'account'     => (string)($m['campaign_name'] ?? $m['adgroup_name'] ?? $m['ad_name'] ?? 'TikTok Campaign'),
                    'campaign_ext_id' => (string)($m['campaign_id'] ?? ''),
                    'ad_ext_id'   => (string)($dim['ad_id'] ?? ''),
                    'objective'   => (string)($m['objective_type'] ?? ''),
                    'reach'       => (int)($m['reach'] ?? 0),
                    'date'        => substr((string)($dim['stat_time_day'] ?? ''), 0, 10),
                    'impressions' => (int)($m['impressions'] ?? 0),
                    'clicks'      => (int)($m['clicks'] ?? 0),
                    'spend'       => (float)($m['spend'] ?? 0),
                    'conversions' => (int)round((float)($m['conversion'] ?? 0)),
                    'revenue'     => (float)($m['total_purchase_value'] ?? 0),
                    'currency'    => $ttCur, // [228차 S1] 다통화 정규화 — persist 에서 KRW 환산
                    'extra'       => [
                        'level'        => 'ad',
                        'adset_ext_id' => (string)($m['adgroup_id'] ?? ''),
                        'adset_name'   => (string)($m['adgroup_name'] ?? ''),
                        'ad_name'      => (string)($m['ad_name'] ?? ''),
                    ],
                ];
            }
            $totalPage = (int)($body['data']['page_info']['total_page'] ?? 1);
            $page++;
        } while ($page <= $totalPage && ++$guard < 50);
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

        // 1) 캠페인 id 목록 + [현 차수] campaignTp(목적 분류 근거) 매핑.
        //   Naver campaignTp → objective: WEB_SITE/PLACE=파워링크(트래픽), SHOPPING=쇼핑검색(전환),
        //   BRAND_SEARCH=브랜드검색(인지), POWER_CONTENTS=디스플레이(인지).
        [$cCode, $cBody, $cErr] = self::httpGet('https://api.naver.com/ncc/campaigns', $hdr($sign('GET', '/ncc/campaigns')));
        if ($cErr || $cCode >= 400) return ['hasCreds' => true, 'live' => false, 'error' => $cErr ?? "naver campaigns http {$cCode}"];
        $tpMap = ['WEB_SITE' => 'POWER_LINK', 'PLACE' => 'POWER_LINK', 'SHOPPING' => 'SHOPPING_SEARCH', 'BRAND_SEARCH' => 'BRAND_SEARCH', 'POWER_CONTENTS' => 'NAVER_DISPLAY'];
        $ids = []; $objById = [];
        foreach ((is_array($cBody) ? $cBody : []) as $c) {
            if (empty($c['nccCampaignId'])) continue;
            $id = (string)$c['nccCampaignId']; $ids[] = $id;
            $objById[$id] = $tpMap[(string)($c['campaignTp'] ?? '')] ?? '';
        }
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

        // [현 차수] 캠페인×일별 집계 — 캠페인 id 별 objective(campaignTp) 보존(목적별 분류). id 미식별 행은
        //   id=''(objective '' → other)로 집계(기존 일자 합산과 동등, 무손실).
        $byKey = [];
        $data = $sBody['data'] ?? (is_array($sBody) ? $sBody : []);
        foreach ((array)$data as $row) {
            if (!is_array($row)) continue;
            $day = '';
            if (isset($row['dimension']) && is_array($row['dimension'])) $day = (string)($row['dimension']['day'] ?? $row['dimension']['statDt'] ?? '');
            if ($day === '') $day = (string)($row['day'] ?? $row['statDt'] ?? (is_string($row['dimension'] ?? null) ? $row['dimension'] : ''));
            $day = substr(str_replace(['.', '/'], '-', $day), 0, 10);
            if ($day === '' || $day < $start || $day > $end) continue;
            $cid = (string)($row['id'] ?? ($row['dimension']['id'] ?? ''));
            $k = $cid . '|' . $day;
            if (!isset($byKey[$k])) $byKey[$k] = ['id' => $cid, 'day' => $day, 'imp' => 0, 'clk' => 0, 'spend' => 0.0, 'conv' => 0, 'rev' => 0.0];
            $byKey[$k]['imp']   += (int)($row['impCnt'] ?? 0);
            $byKey[$k]['clk']   += (int)($row['clkCnt'] ?? 0);
            $byKey[$k]['spend'] += (float)($row['salesAmt'] ?? 0);
            $byKey[$k]['conv']  += (int)round((float)($row['ccnt'] ?? 0));
            $byKey[$k]['rev']   += (float)($row['convAmt'] ?? 0);
        }
        $rows = [];
        foreach ($byKey as $v) {
            $rows[] = ['team' => 'Naver', 'account' => 'Naver SA',
                'campaign_ext_id' => $v['id'], 'objective' => $objById[$v['id']] ?? '', 'date' => $v['day'],
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
        // [225차 P1-6] UI 키명 통일(account_id→ad_account_id). 레거시로 저장된 account_id 도 폴백 조회해
        //   정상 연결인데 hasCreds=false(거짓양성·광고성과 영구 미적재)가 되던 갭 해소.
        $adAccountId = (string)(getenv('KAKAO_MOMENT_AD_ACCOUNT_ID') ?: self::loadCred($tenant, 'kakao_moment', 'ad_account_id'));
        if ($adAccountId === '') $adAccountId = (string)self::loadCred($tenant, 'kakao_moment', 'account_id');
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
                // [현 차수] Kakao Moment 캠페인 목적(REACH/VISITING/CONVERSION/VIEW…)·reach 수집(방어 필드명).
                'objective'       => (string)($dim['objective'] ?? $dim['campaignObjective'] ?? $dim['goal'] ?? $r['objective'] ?? ''),
                'reach'           => (int)($m['reach'] ?? $m['reach_cnt'] ?? 0),
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

    /**
     * [232차] LINE Ads Platform API 인증 — JWS(HMAC-SHA256). 공식 스펙:
     *   InputValue = Base64(Header).Base64(Payload), Signature = Base64(HMAC-SHA256(secret, InputValue)),
     *   Authorization: Bearer {InputValue},{Signature}. Payload = {Content-MD5(본문 md5), Content-Type, Date(YYYYMMDD), RequestUri(경로)}.
     *   HTTP 헤더: Date(RFC1123 GMT), Content-Type, Authorization. 키=Ad Manager>Group 페이지 발급(access_key/secret_key).
     *   ★헤더/페이로드 정확한 필드명·엔드포인트 경로는 실 자격증명 등록 시 라이브 응답으로 최종 확정(graceful 드롭인).
     */
    public static function lineAdsAuthHeaders(string $method, string $path, string $body, string $accessKey, string $secretKey): array
    {
        $ct = 'application/json';
        $header  = base64_encode(json_encode(['kid' => $accessKey, 'alg' => 'HMAC-SHA256', 'typ' => 'text/plain'], JSON_UNESCAPED_SLASHES));
        $payload = base64_encode(json_encode(['Content-MD5' => md5($body), 'Content-Type' => $ct, 'Date' => gmdate('Ymd'), 'RequestUri' => $path], JSON_UNESCAPED_SLASHES));
        $input = $header . '.' . $payload;
        $sig = base64_encode(hash_hmac('sha256', $input, $secretKey, true));
        return [
            'Content-Type'  => $ct,
            'Date'          => gmdate('D, d M Y H:i:s') . ' GMT',
            'Authorization' => 'Bearer ' . $input . ',' . $sig,
        ];
    }

    /**
     * [232차] LINE Ads 캠페인 성과 ingest → performance_metrics. 자격증명(access_key/secret_key/group_id) 등록 시 동작.
     *   필드명은 다중 후보 방어매핑(타 ingest와 동일). 실패 시 graceful(error). 라이브 검증은 실 LINE Ads 계정 필요.
     */
    private static function fetchLineRows(string $tenant, string $start, string $end): array
    {
        $accessKey = (string)(getenv('LINE_ADS_ACCESS_KEY') ?: self::loadCred($tenant, 'line_ads', 'access_key'));
        $secretKey = (string)(getenv('LINE_ADS_SECRET_KEY') ?: self::loadCred($tenant, 'line_ads', 'secret_key'));
        $groupId   = (string)(getenv('LINE_ADS_GROUP_ID')   ?: self::loadCred($tenant, 'line_ads', 'group_id'));
        if ($groupId === '') $groupId = (string)self::loadCred($tenant, 'line_ads', 'ad_account_id'); // 레거시 키명 폴백
        if ($accessKey === '' || $secretKey === '' || $groupId === '') {
            return ['hasCreds' => false, 'live' => false, 'rows' => []];
        }
        // LINE Ads 통계 리포트(캠페인 차원, 일자별). 경로/파라미터는 라이브 검증 시 최종 확정.
        $path = '/api/v3/groups/' . rawurlencode($groupId) . '/statistics/campaign';
        $query = http_build_query(['since' => str_replace('-', '', $start), 'until' => str_replace('-', '', $end), 'datePreset' => 'CUSTOM']);
        $url = 'https://ads.line.me' . $path . '?' . $query;
        $hdr = self::lineAdsAuthHeaders('GET', $path, '', $accessKey, $secretKey);
        [$code, $body, $err] = self::httpGet($url, $hdr);
        if ($err || $code >= 400) {
            return ['hasCreds' => true, 'live' => false, 'error' => $err ?: "line http $code"];
        }
        // [239차+ P1] LINE Ads 과금 통화 정규화 — LINE 은 KRW 로 과금하지 않는다(일본 JPY 주력·TH THB·TW TWD).
        //   통화 미stamp 시 persistMetricRows 가 KRW 기본 적용 → JPY spend 가 미환산 적재되어 ROAS/CAC 왜곡.
        //   (TikTok fetchTiktokRows 통화 정규화 패턴 정합.) 우선순위: 리포트 응답 통화 > cred 'currency' 선언 > JPY 기본.
        $lineCur = strtoupper((string)(self::loadCred($tenant, 'line_ads', 'currency') ?: 'JPY'));
        $rows = [];
        foreach ((array)($body['datas'] ?? $body['data'] ?? $body['statistics'] ?? $body['reports'] ?? []) as $r) {
            $dim = (array)($r['dimensions'] ?? $r['dimension'] ?? $r);
            $m   = (array)($r['metrics'] ?? $r['metric'] ?? $r);
            $rawDate = (string)($r['date'] ?? $dim['date'] ?? '');
            $date = (strlen($rawDate) === 8) ? substr($rawDate,0,4).'-'.substr($rawDate,4,2).'-'.substr($rawDate,6,2) : substr($rawDate,0,10);
            $rows[] = [
                'team'            => 'LINE',
                'account'         => (string)($dim['campaignName'] ?? $dim['campaign'] ?? 'LINE Ads'),
                'campaign_ext_id' => (string)($dim['campaignId'] ?? $dim['campaign_id'] ?? ''),
                'objective'       => (string)($dim['objective'] ?? $dim['campaignObjective'] ?? $dim['goal'] ?? ''),
                'reach'           => (int)($m['reach'] ?? 0),
                'date'            => $date,
                'impressions'     => (int)($m['imp'] ?? $m['impression'] ?? $m['impressions'] ?? 0),
                'clicks'          => (int)($m['click'] ?? $m['clicks'] ?? 0),
                'spend'           => (float)($m['cost'] ?? $m['spend'] ?? $m['spending'] ?? 0),
                'conversions'     => (int)round((float)($m['conversion'] ?? $m['conv'] ?? $m['cv'] ?? 0)),
                'revenue'         => (float)($m['conversionValue'] ?? $m['convValue'] ?? $m['revenue'] ?? 0),
                'currency'        => strtoupper((string)($m['currency'] ?? $dim['currency'] ?? $r['currency'] ?? $lineCur)), // [239차+ P1] persist 에서 KRW 환산
            ];
        }
        return ['hasCreds' => true, 'live' => true, 'rows' => $rows];
    }

    /**
     * [240차] Snapchat Marketing API — 광고계정 일자별 통계(timeseries) → performance_metrics 정규화.
     *   GET /v1/adaccounts/{id}/stats?granularity=DAY&fields=impressions,swipes,spend,conversion_purchases,...
     *   spend/conversion value 는 마이크로 통화(계정 통화) → 1e6 로 나눈다. swipes=clicks. 통화는 cred 'currency'
     *   (기본 USD)로 stamp → persistMetricRows 가 KRW 환산. 라이브 검증은 실 Snapchat Ads 계정 필요(graceful 드롭인).
     */
    private static function fetchSnapchatRows(string $tenant, string $start, string $end): array
    {
        $accessToken = (string)(getenv('SNAPCHAT_ACCESS_TOKEN')   ?: self::loadCred($tenant, 'snapchat_ads', 'access_token'));
        $adAccountId = (string)(getenv('SNAPCHAT_AD_ACCOUNT_ID')  ?: self::loadCred($tenant, 'snapchat_ads', 'ad_account_id'));
        if ($adAccountId === '') $adAccountId = (string)self::loadCred($tenant, 'snapchat_ads', 'account_id'); // 레거시 키명 폴백
        if ($accessToken === '' || $adAccountId === '') {
            return ['hasCreds' => false, 'live' => false, 'rows' => []];
        }
        // Snapchat 은 ISO8601(타임존 포함)·일 경계 요구. end 는 exclusive 이므로 +1일.
        $params = http_build_query([
            'granularity' => 'DAY',
            'start_time'  => $start . 'T00:00:00.000-00:00',
            'end_time'    => gmdate('Y-m-d', (int)strtotime($end . ' +1 day')) . 'T00:00:00.000-00:00',
            'fields'      => 'impressions,swipes,spend,conversion_purchases,conversion_purchases_value',
        ]);
        $url = 'https://adsapi.snapchat.com/v1/adaccounts/' . rawurlencode($adAccountId) . "/stats?{$params}";
        [$code, $body, $err] = self::httpGet($url, ['Authorization' => "Bearer {$accessToken}"]);
        if ($err || $code >= 400) {
            return ['hasCreds' => true, 'live' => false, 'error' => $err ?: "snapchat http $code"];
        }
        $cur = strtoupper((string)(self::loadCred($tenant, 'snapchat_ads', 'currency') ?: 'USD'));
        $rows = [];
        foreach ((array)($body['timeseries_stats'] ?? []) as $ts) {
            $stat = (array)($ts['timeseries_stat'] ?? $ts);
            foreach ((array)($stat['timeseries'] ?? []) as $pt) {
                $s = (array)($pt['stats'] ?? []);
                $date = substr((string)($pt['start_time'] ?? ''), 0, 10);
                if ($date === '') continue;
                $rows[] = [
                    'team'            => 'Snapchat',
                    'account'         => 'Snapchat Ads',
                    'campaign_ext_id' => (string)($stat['id'] ?? ''),
                    'objective'       => '',
                    'reach'           => 0,
                    'date'            => $date,
                    'impressions'     => (int)($s['impressions'] ?? 0),
                    'clicks'          => (int)($s['swipes'] ?? $s['clicks'] ?? 0),
                    'spend'           => ((float)($s['spend'] ?? 0)) / 1000000.0,
                    'conversions'     => (int)round((float)($s['conversion_purchases'] ?? 0)),
                    'revenue'         => ((float)($s['conversion_purchases_value'] ?? 0)) / 1000000.0,
                    'currency'        => $cur,
                ];
            }
        }
        return ['hasCreds' => true, 'live' => true, 'rows' => $rows];
    }

    /**
     * [240차] LinkedIn Marketing API — adAnalytics(캠페인 차원, 일자별) → performance_metrics.
     *   GET /rest/adAnalytics?q=analytics&pivot=CAMPAIGN&timeGranularity=DAILY&dateRange=(...)&accounts=List(urn..)
     *   헤더: LinkedIn-Version·X-Restli-Protocol-Version:2.0.0. costInLocalCurrency=문자열(소수). 통화=cred 'currency'(USD).
     *   restli 쿼리(괄호/urn)는 수동 구성. 라이브 검증은 실 LinkedIn Ads 계정 필요(graceful 드롭인).
     */
    private static function fetchLinkedinRows(string $tenant, string $start, string $end): array
    {
        $accessToken = (string)(getenv('LINKEDIN_ACCESS_TOKEN')    ?: self::loadCred($tenant, 'linkedin_ads', 'access_token'));
        $accountId   = (string)(getenv('LINKEDIN_AD_ACCOUNT_ID')   ?: self::loadCred($tenant, 'linkedin_ads', 'ad_account_id'));
        if ($accountId === '') $accountId = (string)self::loadCred($tenant, 'linkedin_ads', 'account_id'); // 레거시 키명 폴백
        if ($accessToken === '' || $accountId === '') {
            return ['hasCreds' => false, 'live' => false, 'rows' => []];
        }
        [$sy, $sm, $sd] = array_map('intval', array_pad(explode('-', $start), 3, 0));
        [$ey, $em, $ed] = array_map('intval', array_pad(explode('-', $end), 3, 0));
        $dateRange = "(start:(year:{$sy},month:{$sm},day:{$sd}),end:(year:{$ey},month:{$em},day:{$ed}))";
        $accounts  = 'List(' . rawurlencode('urn:li:sponsoredAccount:' . $accountId) . ')';
        $fields    = 'impressions,clicks,costInLocalCurrency,externalWebsiteConversions,conversionValueInLocalCurrency,dateRange,pivotValues';
        $url = 'https://api.linkedin.com/rest/adAnalytics?q=analytics&pivot=CAMPAIGN&timeGranularity=DAILY'
             . "&dateRange={$dateRange}&accounts={$accounts}&fields={$fields}";
        [$code, $body, $err] = self::httpGet($url, [
            'Authorization'             => "Bearer {$accessToken}",
            'LinkedIn-Version'          => '202401',
            'X-Restli-Protocol-Version' => '2.0.0',
        ]);
        if ($err || $code >= 400) {
            return ['hasCreds' => true, 'live' => false, 'error' => $err ?: "linkedin http $code"];
        }
        $cur = strtoupper((string)(self::loadCred($tenant, 'linkedin_ads', 'currency') ?: 'USD'));
        $rows = [];
        foreach ((array)($body['elements'] ?? []) as $el) {
            $dr = (array)($el['dateRange']['start'] ?? []);
            if (!$dr) continue;
            $date = sprintf('%04d-%02d-%02d', (int)($dr['year'] ?? 0), (int)($dr['month'] ?? 0), (int)($dr['day'] ?? 0));
            $pv = (array)($el['pivotValues'] ?? []);
            $rows[] = [
                'team'            => 'LinkedIn',
                'account'         => 'LinkedIn Ads',
                'campaign_ext_id' => (string)($pv[0] ?? ''),
                'objective'       => '',
                'reach'           => 0,
                'date'            => $date,
                'impressions'     => (int)($el['impressions'] ?? 0),
                'clicks'          => (int)($el['clicks'] ?? 0),
                'spend'           => (float)($el['costInLocalCurrency'] ?? 0),
                'conversions'     => (int)round((float)($el['externalWebsiteConversions'] ?? 0)),
                'revenue'         => (float)($el['conversionValueInLocalCurrency'] ?? 0),
                'currency'        => $cur,
            ];
        }
        return ['hasCreds' => true, 'live' => true, 'rows' => $rows];
    }

    /**
     * [240차] Criteo Marketing Solutions API — OAuth2(client_credentials) 토큰 발급 후 statistics/report(일자×캠페인).
     *   POST /oauth2/token → access_token, POST /2024-01/statistics/report(JSON) → 행. currency 명시 요청(stamp 정합).
     *   라이브 검증은 실 Criteo 광고주 계정 필요(graceful 드롭인).
     */
    private static function fetchCriteoRows(string $tenant, string $start, string $end): array
    {
        $clientId     = (string)(getenv('CRITEO_CLIENT_ID')     ?: self::loadCred($tenant, 'criteo', 'client_id'));
        $clientSecret = (string)(getenv('CRITEO_CLIENT_SECRET') ?: self::loadCred($tenant, 'criteo', 'client_secret'));
        if ($clientId === '' || $clientSecret === '') {
            return ['hasCreds' => false, 'live' => false, 'rows' => []];
        }
        [$tc, $tb, $te] = self::httpPost('https://api.criteo.com/oauth2/token', [
            'client_id' => $clientId, 'client_secret' => $clientSecret, 'grant_type' => 'client_credentials',
        ], ['Content-Type' => 'application/x-www-form-urlencoded']);
        $token = (string)($tb['access_token'] ?? '');
        if ($te || $tc >= 400 || $token === '') {
            return ['hasCreds' => true, 'live' => false, 'error' => $te ?: "criteo token http $tc"];
        }
        $cur = strtoupper((string)(self::loadCred($tenant, 'criteo', 'currency') ?: 'USD'));
        [$code, $body, $err] = self::httpPost('https://api.criteo.com/2024-01/statistics/report', [
            'dimensions' => ['Day', 'CampaignId'],
            'metrics'    => ['Displays', 'Clicks', 'AdvertiserCost', 'Sales', 'Revenue'],
            'startDate'  => $start, 'endDate' => $end,
            'currency'   => $cur, 'format' => 'Json', 'timezone' => 'GMT',
        ], ['Authorization' => "Bearer {$token}", 'Content-Type' => 'application/json', 'Accept' => 'application/json']);
        if ($err || $code >= 400) {
            return ['hasCreds' => true, 'live' => false, 'error' => $err ?: "criteo report http $code"];
        }
        // Criteo Json 포맷: {Rows:[{Day,CampaignId,Displays,Clicks,AdvertiserCost,Sales,Revenue}]} (필드 케이스 편차 방어).
        $data = $body['Rows'] ?? $body['rows'] ?? (array_is_list((array)$body) ? $body : []);
        $rows = [];
        foreach ((array)$data as $r) {
            if (!is_array($r)) continue;
            $g = fn($k) => $r[$k] ?? $r[lcfirst($k)] ?? $r[strtolower($k)] ?? null;
            $rawDate = (string)($g('Day') ?? '');
            $date = substr(str_replace('/', '-', $rawDate), 0, 10);
            if ($date === '') continue;
            $rows[] = [
                'team'            => 'Criteo',
                'account'         => 'Criteo',
                'campaign_ext_id' => (string)($g('CampaignId') ?? ''),
                'objective'       => '',
                'reach'           => 0,
                'date'            => $date,
                'impressions'     => (int)($g('Displays') ?? 0),
                'clicks'          => (int)($g('Clicks') ?? 0),
                'spend'           => (float)($g('AdvertiserCost') ?? 0),
                'conversions'     => (int)round((float)($g('Sales') ?? 0)),
                'revenue'         => (float)($g('Revenue') ?? 0),
                'currency'        => $cur,
            ];
        }
        return ['hasCreds' => true, 'live' => true, 'rows' => $rows];
    }

    /**
     * [240차] Pinterest Ads API v5 — 비동기 리포트(요청→폴링→다운로드). 캠페인×일자.
     *   POST /v5/ad_accounts/{id}/reports → {token}, GET .../reports?token= → {report_status,url}(FINISHED 시 url),
     *   GET url → JSON 행. spend/value 는 마이크로달러 → 1e6. 폴링은 짧게 바운드(최대 3회)·미완 시 graceful(다음 cron 재시도).
     */
    private static function fetchPinterestRows(string $tenant, string $start, string $end): array
    {
        $accessToken = (string)(getenv('PINTEREST_ACCESS_TOKEN')  ?: self::loadCred($tenant, 'pinterest_ads', 'access_token'));
        $adAccountId = (string)(getenv('PINTEREST_AD_ACCOUNT_ID') ?: self::loadCred($tenant, 'pinterest_ads', 'ad_account_id'));
        if ($adAccountId === '') $adAccountId = (string)self::loadCred($tenant, 'pinterest_ads', 'account_id'); // 레거시 키명 폴백
        if ($accessToken === '' || $adAccountId === '') {
            return ['hasCreds' => false, 'live' => false, 'rows' => []];
        }
        $base = 'https://api.pinterest.com/v5/ad_accounts/' . rawurlencode($adAccountId) . '/reports';
        $hdr  = ['Authorization' => "Bearer {$accessToken}", 'Content-Type' => 'application/json'];
        [$code, $body, $err] = self::httpPost($base, [
            'start_date' => $start, 'end_date' => $end, 'granularity' => 'DAY', 'level' => 'CAMPAIGN',
            'columns' => ['CAMPAIGN_ID', 'CAMPAIGN_NAME', 'IMPRESSION_1', 'CLICKTHROUGH_1', 'SPEND_IN_MICRO_DOLLAR', 'TOTAL_CONVERSIONS', 'TOTAL_CONVERSIONS_VALUE_IN_MICRO_DOLLAR'],
        ], $hdr);
        $token = (string)($body['token'] ?? '');
        if ($err || $code >= 400 || $token === '') {
            return ['hasCreds' => true, 'live' => false, 'error' => $err ?: "pinterest report http $code"];
        }
        $reportUrl = '';
        for ($i = 0; $i < 3; $i++) {
            [$pc, $pb, $pe] = self::httpGet($base . '?token=' . rawurlencode($token), $hdr);
            $status = strtoupper((string)($pb['report_status'] ?? ''));
            if ($status === 'FINISHED') { $reportUrl = (string)($pb['url'] ?? ''); break; }
            if ($pe || $pc >= 400 || $status === 'FAILED' || $status === 'EXPIRED' || $status === 'DOES_NOT_EXIST') break;
            usleep(2500000); // 2.5s — 비동기 리포트 생성 대기(바운드)
        }
        if ($reportUrl === '') {
            return ['hasCreds' => true, 'live' => false, 'error' => 'pinterest report not ready (다음 cron 재시도)'];
        }
        [$dc, $draw, $de] = self::httpGet($reportUrl);
        if ($de || $dc >= 400) {
            return ['hasCreds' => true, 'live' => false, 'error' => $de ?: "pinterest download http $dc"];
        }
        $cur = strtoupper((string)(self::loadCred($tenant, 'pinterest_ads', 'currency') ?: 'USD'));
        $data = $draw['data'] ?? (array_is_list((array)$draw) ? $draw : []);
        $rows = [];
        foreach ((array)$data as $r) {
            if (!is_array($r)) continue;
            $date = substr((string)($r['DATE'] ?? $r['date'] ?? ''), 0, 10);
            if ($date === '') continue;
            $rows[] = [
                'team'            => 'Pinterest',
                'account'         => (string)($r['CAMPAIGN_NAME'] ?? 'Pinterest Ads'),
                'campaign_ext_id' => (string)($r['CAMPAIGN_ID'] ?? ''),
                'objective'       => '',
                'reach'           => 0,
                'date'            => $date,
                'impressions'     => (int)($r['IMPRESSION_1'] ?? 0),
                'clicks'          => (int)($r['CLICKTHROUGH_1'] ?? 0),
                'spend'           => ((float)($r['SPEND_IN_MICRO_DOLLAR'] ?? 0)) / 1000000.0,
                'conversions'     => (int)round((float)($r['TOTAL_CONVERSIONS'] ?? 0)),
                'revenue'         => ((float)($r['TOTAL_CONVERSIONS_VALUE_IN_MICRO_DOLLAR'] ?? 0)) / 1000000.0,
                'currency'        => $cur,
            ];
        }
        return ['hasCreds' => true, 'live' => true, 'rows' => $rows];
    }

    /* [현 차수 약점⑧] Amazon Ads — LWA OAuth2(refresh_token) → v3 Reporting API(비동기: 생성→폴링→다운로드).
     *   POST {region}/reporting/reports (sponsoredProducts·spCampaigns·groupBy=campaign·DAILY) → reportId,
     *   GET .../reports/{id} → {status,url}(COMPLETED 시 gzip JSON url), GET url → 행(gzdecode).
     *   필드: campaignId/cost/impressions/clicks/purchases7d/sales7d/date. cost·sales=계정통화 실수(micro 아님).
     *   헤더: Amazon-Advertising-API-ClientId + Amazon-Advertising-API-Scope(profileId) + Bearer.
     *   region cred(na/eu/fe)로 base URL 분기·기본 na. 폴링 짧게 바운드(최대 3회) 미완 시 graceful(다음 cron). */
    private static function fetchAmazonAdsRows(string $tenant, string $start, string $end): array
    {
        $refresh = (string)(getenv('AMAZON_ADS_REFRESH_TOKEN') ?: self::loadCred($tenant, 'amazon_ads', 'refresh_token'));
        $cid     = (string)(getenv('AMAZON_ADS_CLIENT_ID')     ?: self::loadCred($tenant, 'amazon_ads', 'client_id'));
        $secret  = (string)(getenv('AMAZON_ADS_CLIENT_SECRET') ?: self::loadCred($tenant, 'amazon_ads', 'client_secret'));
        $profile = (string)self::loadCred($tenant, 'amazon_ads', 'profile_id');
        if ($refresh === '' || $cid === '' || $secret === '' || $profile === '') return ['hasCreds' => false, 'live' => false, 'rows' => []];
        [$tc, $tb] = self::httpPost('https://api.amazon.com/auth/o2/token',
            ['grant_type' => 'refresh_token', 'refresh_token' => $refresh, 'client_id' => $cid, 'client_secret' => $secret],
            ['Content-Type' => 'application/x-www-form-urlencoded']);
        $token = is_array($tb) ? (string)($tb['access_token'] ?? '') : '';
        if ($token === '') return ['hasCreds' => true, 'live' => false, 'error' => "amazon_ads token http $tc"];

        // region → Advertising API 엔드포인트(na 기본). cred 'region' 값 na/eu/fe.
        $region = strtolower((string)(self::loadCred($tenant, 'amazon_ads', 'region') ?: 'na'));
        $apiBase = [
            'na' => 'https://advertising-api.amazon.com',
            'eu' => 'https://advertising-api-eu.amazon.com',
            'fe' => 'https://advertising-api-fe.amazon.com',
        ][$region] ?? 'https://advertising-api.amazon.com';
        $cur = strtoupper((string)(self::loadCred($tenant, 'amazon_ads', 'currency') ?: 'USD'));
        // v3 Reporting 은 vendor-specific Accept(content-type)를 요구.
        $repCT = 'application/vnd.createasyncreportrequest.v3+json';
        $hdr = [
            'Authorization'                    => "Bearer {$token}",
            'Amazon-Advertising-API-ClientId'  => $cid,
            'Amazon-Advertising-API-Scope'     => $profile,
            'Content-Type'                     => $repCT,
            'Accept'                           => $repCT,
        ];
        // 1) 리포트 생성: Sponsored Products·캠페인 차원·일자 그룹.
        [$cc, $cb, $ce] = self::httpPost($apiBase . '/reporting/reports', [
            'name'          => 'geniego-sp-daily',
            'startDate'     => $start,
            'endDate'       => $end,
            'configuration' => [
                'adProduct'      => 'SPONSORED_PRODUCTS',
                'groupBy'        => ['campaign'],
                'columns'        => ['campaignId', 'campaignName', 'impressions', 'clicks', 'cost', 'purchases7d', 'sales7d', 'date'],
                'reportTypeId'   => 'spCampaigns',
                'timeUnit'       => 'DAILY',
                'format'         => 'GZIP_JSON',
            ],
        ], $hdr);
        $reportId = is_array($cb) ? (string)($cb['reportId'] ?? '') : '';
        if ($ce || $cc >= 400 || $reportId === '') {
            return ['hasCreds' => true, 'live' => false, 'error' => $ce ?: "amazon_ads report create http $cc"];
        }
        // 2) 상태 폴링(짧게 바운드). 상태 GET 은 일반 JSON Accept.
        $statHdr = [
            'Authorization'                    => "Bearer {$token}",
            'Amazon-Advertising-API-ClientId'  => $cid,
            'Amazon-Advertising-API-Scope'     => $profile,
        ];
        $reportUrl = '';
        for ($i = 0; $i < 3; $i++) {
            [$pc, $pb, $pe] = self::httpGet($apiBase . '/reporting/reports/' . rawurlencode($reportId), $statHdr);
            $status = strtoupper((string)($pb['status'] ?? ''));
            if ($status === 'COMPLETED' || $status === 'SUCCESS') { $reportUrl = (string)($pb['url'] ?? ''); break; }
            if ($pe || $pc >= 400 || $status === 'FAILED' || $status === 'CANCELLED') break;
            usleep(2500000); // 2.5s — 비동기 리포트 생성 대기(바운드)
        }
        if ($reportUrl === '') {
            return ['hasCreds' => true, 'live' => false, 'error' => 'amazon_ads report not ready (다음 cron 재시도)'];
        }
        // 3) 다운로드(gzip JSON). httpGet 은 json_decode 만 하므로 원시 gzip 은 별도 디코드.
        [$dc, $dbody, $de, $draw] = self::httpGetRaw($reportUrl);
        if ($de || $dc >= 400) {
            return ['hasCreds' => true, 'live' => false, 'error' => $de ?: "amazon_ads download http $dc"];
        }
        $json = is_array($dbody) ? $dbody : null;
        if ($json === null && $draw !== '') {
            $dec = @gzdecode($draw);
            if ($dec === false) $dec = $draw; // 비압축 폴백
            $json = json_decode($dec, true);
        }
        $data = is_array($json) ? ($json['rows'] ?? (array_is_list($json) ? $json : [])) : [];
        $rows = [];
        foreach ((array)$data as $r) {
            if (!is_array($r)) continue;
            $date = substr((string)($r['date'] ?? ''), 0, 10);
            if ($date === '') continue;
            $rows[] = [
                'team'            => 'Amazon Ads',
                'account'         => (string)($r['campaignName'] ?? 'Amazon Ads'),
                'campaign_ext_id' => (string)($r['campaignId'] ?? ''),
                'objective'       => '',
                'reach'           => 0,
                'date'            => $date,
                'impressions'     => (int)($r['impressions'] ?? 0),
                'clicks'          => (int)($r['clicks'] ?? 0),
                'spend'           => (float)($r['cost'] ?? 0),
                'conversions'     => (int)round((float)($r['purchases7d'] ?? 0)),
                'revenue'         => (float)($r['sales7d'] ?? 0),
                'currency'        => $cur,
            ];
        }
        return ['hasCreds' => true, 'live' => true, 'rows' => $rows];
    }

    /* [현 차수 약점⑧] Microsoft Ads(Bing) — MS Identity OAuth2(refresh_token) → Reporting SOAP v13(비동기).
     *   SubmitGenerateReport(CampaignPerformanceReport·Daily·CSV) → ReportRequestId,
     *   PollGenerateReport → {Status,ReportDownloadUrl}(Success 시 ZIP url), download → ZIP 내 CSV 파싱.
     *   컬럼: TimePeriod·CampaignId·Impressions·Clicks·Spend·Conversions·Revenue.
     *   헤더(SOAP body): DeveloperToken·CustomerId·CustomerAccountId·AuthenticationToken(Bearer).
     *   폴링 짧게 바운드(최대 3회) 미완 시 graceful. ZIP→CSV 추출은 ZipArchive(temp)·없으면 graceful note. */
    private static function fetchMicrosoftAdsRows(string $tenant, string $start, string $end): array
    {
        $refresh = (string)(getenv('MSADS_REFRESH_TOKEN') ?: self::loadCred($tenant, 'microsoft_ads', 'refresh_token'));
        $cid     = (string)(getenv('MSADS_CLIENT_ID')     ?: self::loadCred($tenant, 'microsoft_ads', 'client_id'));
        $secret  = (string)(getenv('MSADS_CLIENT_SECRET') ?: self::loadCred($tenant, 'microsoft_ads', 'client_secret'));
        $devToken = (string)self::loadCred($tenant, 'microsoft_ads', 'developer_token');
        $customerId = (string)self::loadCred($tenant, 'microsoft_ads', 'customer_id');
        $accountId  = (string)self::loadCred($tenant, 'microsoft_ads', 'account_id');
        if ($refresh === '' || $cid === '' || $devToken === '' || $customerId === '' || $accountId === '') {
            return ['hasCreds' => false, 'live' => false, 'rows' => []];
        }
        [$tc, $tb] = self::httpPost('https://login.microsoftonline.com/common/oauth2/v2.0/token',
            ['grant_type' => 'refresh_token', 'refresh_token' => $refresh, 'client_id' => $cid, 'client_secret' => $secret, 'scope' => 'https://ads.microsoft.com/msads.manage offline_access'],
            ['Content-Type' => 'application/x-www-form-urlencoded']);
        $token = is_array($tb) ? (string)($tb['access_token'] ?? '') : '';
        if ($token === '') return ['hasCreds' => true, 'live' => false, 'error' => "microsoft_ads token http $tc"];

        $cur = strtoupper((string)(self::loadCred($tenant, 'microsoft_ads', 'currency') ?: 'USD'));
        $svc = 'https://reporting.api.bingads.microsoft.com/Api/Advertiser/Reporting/v13/ReportingService.svc';
        // SOAP 공통 헤더 블록.
        $soapHeader =
            "<DeveloperToken xmlns=\"https://bingads.microsoft.com/Reporting/v13\">" . htmlspecialchars($devToken, ENT_XML1) . "</DeveloperToken>"
          . "<CustomerId xmlns=\"https://bingads.microsoft.com/Reporting/v13\">" . htmlspecialchars($customerId, ENT_XML1) . "</CustomerId>"
          . "<CustomerAccountId xmlns=\"https://bingads.microsoft.com/Reporting/v13\">" . htmlspecialchars($accountId, ENT_XML1) . "</CustomerAccountId>"
          . "<AuthenticationToken xmlns=\"https://bingads.microsoft.com/Reporting/v13\">" . htmlspecialchars($token, ENT_XML1) . "</AuthenticationToken>";
        $ns = 'https://bingads.microsoft.com/Reporting/v13';
        [$sy, $sm, $sd] = array_map('intval', array_pad(explode('-', $start), 3, 0));
        [$ey, $em, $ed] = array_map('intval', array_pad(explode('-', $end), 3, 0));
        // 1) SubmitGenerateReport — CampaignPerformanceReport·Daily·CSV.
        $columns = ['TimePeriod', 'CampaignId', 'Impressions', 'Clicks', 'Spend', 'Conversions', 'Revenue'];
        $colXml = '';
        foreach ($columns as $c) $colXml .= "<CampaignPerformanceReportColumn>{$c}</CampaignPerformanceReportColumn>";
        $reportReq =
            "<ReportRequest i:type=\"CampaignPerformanceReportRequest\">"
          . "<ExcludeColumnHeaders>false</ExcludeColumnHeaders><ExcludeReportFooter>true</ExcludeReportFooter>"
          . "<ExcludeReportHeader>true</ExcludeReportHeader><Format>Csv</Format><ReturnOnlyCompleteData>false</ReturnOnlyCompleteData>"
          . "<Aggregation>Daily</Aggregation>"
          . "<Columns>{$colXml}</Columns>"
          . "<Scope><AccountIds xmlns:a=\"http://schemas.microsoft.com/2003/10/Serialization/Arrays\"><a:long>" . htmlspecialchars($accountId, ENT_XML1) . "</a:long></AccountIds></Scope>"
          . "<Time><CustomDateRangeEnd><Day>{$ed}</Day><Month>{$em}</Month><Year>{$ey}</Year></CustomDateRangeEnd>"
          . "<CustomDateRangeStart><Day>{$sd}</Day><Month>{$sm}</Month><Year>{$sy}</Year></CustomDateRangeStart></Time>"
          . "</ReportRequest>";
        $submitBody = self::soapEnvelope($ns, 'SubmitGenerateReport', $soapHeader,
            "<SubmitGenerateReportRequest xmlns=\"{$ns}\" xmlns:i=\"http://www.w3.org/2001/XMLSchema-instance\">{$reportReq}</SubmitGenerateReportRequest>");
        [$rqId, $serr] = self::soapCall($svc, $ns, 'SubmitGenerateReport', $submitBody, 'ReportRequestId');
        if ($serr !== null || $rqId === '') {
            return ['hasCreds' => true, 'live' => false, 'error' => $serr ?: 'microsoft_ads submit empty request id'];
        }
        // 2) PollGenerateReport — Status/ReportDownloadUrl.
        $downloadUrl = '';
        for ($i = 0; $i < 3; $i++) {
            $pollBody = self::soapEnvelope($ns, 'PollGenerateReport', $soapHeader,
                "<PollGenerateReportRequest xmlns=\"{$ns}\"><ReportRequestId>" . htmlspecialchars($rqId, ENT_XML1) . "</ReportRequestId></PollGenerateReportRequest>");
            [$rawXml, $perr] = self::soapCall($svc, $ns, 'PollGenerateReport', $pollBody, null);
            if ($perr !== null) break;
            $status = self::xmlPick($rawXml, 'Status');
            if ($status === 'Success') { $downloadUrl = self::xmlPick($rawXml, 'ReportDownloadUrl'); break; }
            if ($status === 'Error') break;
            usleep(2500000); // 2.5s — 비동기 리포트 대기(바운드)
        }
        if ($downloadUrl === '') {
            return ['hasCreds' => true, 'live' => false, 'error' => 'microsoft_ads report not ready (다음 cron 재시도)'];
        }
        // 3) ZIP 다운로드 → CSV 파싱(ZipArchive). 미가용 시 graceful.
        [$dc, , $de, $draw] = self::httpGetRaw($downloadUrl);
        if ($de || $dc >= 400 || $draw === '') {
            return ['hasCreds' => true, 'live' => false, 'error' => $de ?: "microsoft_ads download http $dc"];
        }
        $csv = self::unzipFirstCsv($draw);
        if ($csv === null) {
            return ['hasCreds' => true, 'live' => false, 'note' => 'microsoft_ads ZIP 추출 미가용(ZipArchive 부재) — 다음 cron 재시도'];
        }
        $rows = self::parseMsAdsCsv($csv, $cur);
        return ['hasCreds' => true, 'live' => true, 'rows' => $rows];
    }

    /** [현 차수] Bing Reporting SOAP — 단순 봉투 빌더. */
    private static function soapEnvelope(string $ns, string $action, string $headerInner, string $bodyInner): string
    {
        return '<?xml version="1.0" encoding="utf-8"?>'
            . '<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">'
            . '<s:Header xmlns="' . $ns . '">' . $headerInner . '</s:Header>'
            . '<s:Body>' . $bodyInner . '</s:Body></s:Envelope>';
    }

    /** [현 차수] SOAP POST 호출(raw XML 전송/응답). $pick 지정 시 해당 태그값, 아니면 raw XML 반환.
     *  반환 [value|rawXml, err]. 4xx/5xx·전송오류 시 err 세팅. */
    private static function soapCall(string $url, string $ns, string $action, string $xmlBody, ?string $pick): array
    {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => $xmlBody,
            CURLOPT_TIMEOUT        => 20,
            CURLOPT_HTTPHEADER     => [
                'Content-Type: text/xml; charset=utf-8',
                'SOAPAction: "' . $action . '"',
            ],
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_USERAGENT      => 'Geniego-ROI/v421 PHP',
        ]);
        $raw  = curl_exec($ch);
        $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $err  = curl_error($ch) ?: null;
        curl_close($ch);
        if ($err !== null) return ['', $err];
        $rawStr = (string)$raw;
        if ($code >= 400) return ['', "soap {$action} http {$code}"];
        if ($pick === null) return [$rawStr, null];
        return [self::xmlPick($rawStr, $pick), null];
    }

    /** [현 차수] 네임스페이스 접두 무시하고 XML 에서 첫 <...:Tag> 또는 <Tag> 텍스트 추출(정규식·graceful). */
    private static function xmlPick(string $xml, string $tag): string
    {
        if ($xml === '') return '';
        if (preg_match('#<(?:[\w]+:)?' . preg_quote($tag, '#') . '[^>]*>(.*?)</(?:[\w]+:)?' . preg_quote($tag, '#') . '>#s', $xml, $m)) {
            return html_entity_decode(trim($m[1]), ENT_XML1 | ENT_QUOTES);
        }
        return '';
    }

    /** [현 차수] ZIP 바이트열에서 첫 .csv 엔트리 추출. ZipArchive 미존재/실패 시 null(graceful). temp 파일 사용·정리. */
    private static function unzipFirstCsv(string $zipBytes): ?string
    {
        if (!class_exists('ZipArchive')) return null;
        $tmp = tempnam(sys_get_temp_dir(), 'msads_');
        if ($tmp === false) return null;
        $csv = null;
        try {
            file_put_contents($tmp, $zipBytes);
            $za = new \ZipArchive();
            if ($za->open($tmp) === true) {
                for ($i = 0; $i < $za->numFiles; $i++) {
                    $name = (string)$za->getNameIndex($i);
                    if (preg_match('/\.csv$/i', $name)) {
                        $c = $za->getFromIndex($i);
                        if ($c !== false) { $csv = $c; break; }
                    }
                }
                $za->close();
            }
        } catch (\Throwable $e) {
            $csv = null;
        } finally {
            @unlink($tmp);
        }
        return $csv;
    }

    /** [현 차수] Bing CampaignPerformanceReport CSV → 표준 row. 헤더줄로 컬럼 인덱스 매핑(빈/비수치 graceful). */
    private static function parseMsAdsCsv(string $csv, string $cur): array
    {
        $lines = preg_split('/\r\n|\r|\n/', trim($csv));
        if (!is_array($lines) || count($lines) < 2) return [];
        $header = str_getcsv((string)array_shift($lines));
        $idx = [];
        foreach ($header as $i => $h) $idx[trim((string)$h)] = $i;
        $col = function (array $cells, string $name) use ($idx) {
            return isset($idx[$name]) ? ($cells[$idx[$name]] ?? '') : '';
        };
        $numKr = fn($v) => (float)str_replace([',', '%'], '', (string)$v);
        $rows = [];
        foreach ($lines as $ln) {
            if (trim((string)$ln) === '') continue;
            $cells = str_getcsv((string)$ln);
            $date = substr(str_replace('/', '-', (string)$col($cells, 'TimePeriod')), 0, 10);
            if ($date === '' || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) continue;
            $rows[] = [
                'team'            => 'Microsoft Ads',
                'account'         => 'Microsoft Ads',
                'campaign_ext_id' => (string)$col($cells, 'CampaignId'),
                'objective'       => '',
                'reach'           => 0,
                'date'            => $date,
                'impressions'     => (int)$numKr($col($cells, 'Impressions')),
                'clicks'          => (int)$numKr($col($cells, 'Clicks')),
                'spend'           => $numKr($col($cells, 'Spend')),
                'conversions'     => (int)round($numKr($col($cells, 'Conversions'))),
                'revenue'         => $numKr($col($cells, 'Revenue')),
                'currency'        => $cur,
            ];
        }
        return $rows;
    }

    /* [현 차수 약점⑧] X(Twitter) Ads — OAuth1.0a(per-request HMAC-SHA1) → Ads API v12 동기 통계.
     *   1) GET /12/accounts/{id}/campaigns(active) → entity_ids,
     *   2) GET /12/stats/accounts/{id}?entity=CAMPAIGN&entity_ids=...&metric_groups=BILLING,ENGAGEMENT,WEB_CONVERSION
     *      &granularity=DAY&start_time&end_time&placement=ALL_ON_TWITTER → 캠페인×일자 메트릭 시계열.
     *   필드: impressions[], (likes+clicks)→clicks 는 ENGAGEMENT.clicks[], billed_charge_local_micro[](÷1e6),
     *      conversion_purchases.metric[], sale_amount.metric[](÷1e6). entity_ids 는 배치 최대 20.
     *   start/end 는 RFC3339 일경계, end exclusive(+1d). graceful(서명실패/응답불일치 시 empty). */
    private static function fetchXAdsRows(string $tenant, string $start, string $end): array
    {
        $ck = (string)(getenv('X_ADS_CONSUMER_KEY')    ?: self::loadCred($tenant, 'x_ads', 'consumer_key'));
        $cs = (string)(getenv('X_ADS_CONSUMER_SECRET') ?: self::loadCred($tenant, 'x_ads', 'consumer_secret'));
        $at = (string)self::loadCred($tenant, 'x_ads', 'access_token');
        $as = (string)self::loadCred($tenant, 'x_ads', 'access_token_secret');
        $acct = (string)self::loadCred($tenant, 'x_ads', 'account_id');
        if ($ck === '' || $cs === '' || $at === '' || $as === '' || $acct === '') return ['hasCreds' => false, 'live' => false, 'rows' => []];

        $cur = strtoupper((string)(self::loadCred($tenant, 'x_ads', 'currency') ?: 'USD'));
        $oauth = ['ck' => $ck, 'cs' => $cs, 'at' => $at, 'as' => $as];
        $apiBase = 'https://ads-api.twitter.com';
        // 1) 캠페인 목록(entity_ids 확보). 최대 200·active.
        $campUrl = $apiBase . '/12/accounts/' . rawurlencode($acct) . '/campaigns';
        [$cc, $cb, $ce] = self::xAdsGet($campUrl, ['count' => '200', 'with_deleted' => 'false'], $oauth);
        if ($ce || $cc >= 400) {
            return ['hasCreds' => true, 'live' => false, 'error' => $ce ?: "x_ads campaigns http $cc"];
        }
        $ids = [];
        foreach ((array)($cb['data'] ?? []) as $c) {
            $id = (string)($c['id'] ?? '');
            if ($id !== '') $ids[] = $id;
        }
        if (!$ids) return ['hasCreds' => true, 'live' => true, 'rows' => []]; // 캠페인 없음 → 빈 rows(정상)

        // entity_id → date → 메트릭 누적. stats 응답은 entity 단위 시계열 배열(날짜축 동일 길이).
        $startTime = $start . 'T00:00:00Z';
        $endTime   = gmdate('Y-m-d', (int)strtotime($end . ' +1 day')) . 'T00:00:00Z'; // exclusive
        $dates = [];
        for ($d = strtotime($start . ' UTC'); $d <= strtotime($end . ' UTC'); $d = strtotime('+1 day', $d)) {
            $dates[] = gmdate('Y-m-d', $d);
        }
        $rows = [];
        foreach (array_chunk($ids, 20) as $batch) { // stats entity_ids 배치 상한 20
            [$sc, $sb, $se] = self::xAdsGet($apiBase . '/12/stats/accounts/' . rawurlencode($acct), [
                'entity'        => 'CAMPAIGN',
                'entity_ids'    => implode(',', $batch),
                'start_time'    => $startTime,
                'end_time'      => $endTime,
                'granularity'   => 'DAY',
                'placement'     => 'ALL_ON_TWITTER',
                'metric_groups' => 'BILLING,ENGAGEMENT,WEB_CONVERSION',
            ], $oauth);
            if ($se || $sc >= 400) continue; // 배치 실패 → graceful skip(부분 성공 보존)
            foreach ((array)($sb['data'] ?? []) as $ent) {
                $entId = (string)($ent['id'] ?? '');
                $series = (array)($ent['id_data'][0]['metrics'] ?? []);
                $imp  = (array)($series['impressions'] ?? []);
                $clk  = (array)($series['clicks'] ?? []);
                $bill = (array)($series['billed_charge_local_micro'] ?? []);
                $conv = (array)($series['conversion_purchases']['metric'] ?? $series['conversion_purchases'] ?? []);
                $sale = (array)($series['conversion_sale_amount']['metric'] ?? $series['conversion_sale_amount'] ?? []);
                foreach ($dates as $di => $date) {
                    $impv = (int)($imp[$di] ?? 0);
                    $clkv = (int)($clk[$di] ?? 0);
                    $billv = (float)($bill[$di] ?? 0);
                    $convv = (float)($conv[$di] ?? 0);
                    $salev = (float)($sale[$di] ?? 0);
                    if ($impv === 0 && $clkv === 0 && $billv == 0.0 && $convv == 0.0 && $salev == 0.0) continue;
                    $rows[] = [
                        'team'            => 'X Ads',
                        'account'         => 'X Ads',
                        'campaign_ext_id' => $entId,
                        'objective'       => '',
                        'reach'           => 0,
                        'date'            => $date,
                        'impressions'     => $impv,
                        'clicks'          => $clkv,
                        'spend'           => $billv / 1000000.0,
                        'conversions'     => (int)round($convv),
                        'revenue'         => $salev / 1000000.0,
                        'currency'        => $cur,
                    ];
                }
            }
        }
        return ['hasCreds' => true, 'live' => true, 'rows' => $rows];
    }

    /**
     * [현 차수] ad-group/소재 입도 additive-fallback — 더 미세한 입도 fetch 를 시도하되, 데이터가 없거나(빈/에러)
     * 자격증명 미설정이면 검증된 campaign-level fetch 로 폴백한다. ★기존 안정성: ad-group 엔드포인트가 틀려도
     * campaign-level(현행 동작)이 그대로 유지되어 회귀 0. ad-group 이 실데이터를 반환할 때만 미세 입도 적용.
     */
    private static function adGroupOrFallback(callable $adGroup, callable $campaign): array
    {
        try {
            $r = $adGroup();
            if (!empty($r['live']) && !empty($r['rows'])) return $r; // 미세 입도 실데이터 → 사용
            if (empty($r['hasCreds'])) return $campaign();           // 자격증명 없음 → campaign 도 동일 skip 처리
        } catch (\Throwable $e) { /* 폴백 */ }
        return $campaign(); // ad-group 빈/실패 → 검증된 campaign-level(회귀 0)
    }

    /** Naver SA ad-group 입도 — /ncc/adgroups(캠페인별) → /stats(adgroup ids, breakdown=day). 실패/빈 시 상위가 campaign 폴백. */
    private static function fetchNaverAdGroupRows(string $tenant, string $start, string $end): array
    {
        $apiKey     = (string)(getenv('NAVER_API_KEY')     ?: self::loadCred($tenant, 'naver_sa', 'api_key')     ?: self::loadCred($tenant, 'naver_searchad', 'api_key'));
        $apiSecret  = (string)(getenv('NAVER_API_SECRET')  ?: self::loadCred($tenant, 'naver_sa', 'api_secret')  ?: self::loadCred($tenant, 'naver_searchad', 'api_secret'));
        $customerId = (string)(getenv('NAVER_CUSTOMER_ID') ?: self::loadCred($tenant, 'naver_sa', 'customer_id') ?: self::loadCred($tenant, 'naver_searchad', 'customer_id'));
        if ($apiKey === '' || $apiSecret === '' || $customerId === '') return ['hasCreds' => false, 'live' => false, 'rows' => []];
        $sign = function (string $method, string $path) use ($apiSecret): array {
            $ts = (string)(round(microtime(true) * 1000));
            return [$ts, base64_encode(hash_hmac('sha256', "{$ts}.{$method}.{$path}", $apiSecret, true))];
        };
        $hdr = function (array $sg) use ($apiKey, $customerId): array {
            return ['X-Timestamp' => $sg[0], 'X-API-KEY' => $apiKey, 'X-Customer' => $customerId, 'X-Signature' => $sg[1], 'Content-Type' => 'application/json; charset=UTF-8'];
        };
        // 캠페인 → adgroup id 수집(캠페인당 1콜, 상한). campaignName 보존(account 표기).
        [$cCode, $cBody] = self::httpGet('https://api.naver.com/ncc/campaigns', $hdr($sign('GET', '/ncc/campaigns')));
        if ($cCode >= 400 || !is_array($cBody)) return ['hasCreds' => true, 'live' => false, 'rows' => []];
        $agIds = []; $agMeta = []; $cnt = 0;
        foreach ($cBody as $c) {
            $cid = (string)($c['nccCampaignId'] ?? ''); if ($cid === '') continue;
            if (++$cnt > 30) break; // 콜 상한(대형 계정 보호)
            [$aCode, $aBody] = self::httpGet('https://api.naver.com/ncc/adgroups?' . http_build_query(['nccCampaignId' => $cid]), $hdr($sign('GET', '/ncc/adgroups')));
            if ($aCode >= 400 || !is_array($aBody)) continue;
            foreach ($aBody as $ag) {
                $aid = (string)($ag['nccAdgroupId'] ?? ''); if ($aid === '') continue;
                $agIds[] = $aid; $agMeta[$aid] = ['campaign' => (string)($c['name'] ?? 'Naver SA'), 'adgroup' => (string)($ag['name'] ?? ''), 'campaign_id' => $cid];
            }
        }
        if (empty($agIds)) return ['hasCreds' => true, 'live' => false, 'rows' => []]; // adgroup 미확보 → campaign 폴백
        $rows = [];
        foreach (array_chunk($agIds, 100) as $batch) {
            $query = http_build_query(['ids' => implode(',', $batch), 'fields' => json_encode(['impCnt', 'clkCnt', 'salesAmt', 'ccnt', 'convAmt']), 'timeRange' => json_encode(['since' => $start, 'until' => $end]), 'breakdown' => 'day']);
            [$sCode, $sBody] = self::httpGet('https://api.naver.com/stats?' . $query, $hdr($sign('GET', '/stats')));
            if ($sCode >= 400) return ['hasCreds' => true, 'live' => false, 'rows' => []]; // 부분실패=전체 폴백(all-or-nothing)
            foreach ((array)($sBody['data'] ?? (is_array($sBody) ? $sBody : [])) as $row) {
                if (!is_array($row)) continue;
                $day = (string)($row['dimension']['day'] ?? $row['day'] ?? $row['statDt'] ?? '');
                $day = substr(str_replace(['.', '/'], '-', $day), 0, 10);
                if ($day === '' || $day < $start || $day > $end) continue;
                $aid = (string)($row['id'] ?? ($row['dimension']['id'] ?? ''));
                $m = $agMeta[$aid] ?? ['campaign' => 'Naver SA', 'adgroup' => '', 'campaign_id' => ''];
                $rows[] = [
                    'team' => 'Naver SA', 'account' => $m['campaign'], 'campaign_ext_id' => $m['campaign_id'], 'ad_ext_id' => $aid,
                    'objective' => '', 'reach' => 0, 'date' => $day,
                    'impressions' => (int)($row['impCnt'] ?? 0), 'clicks' => (int)($row['clkCnt'] ?? 0),
                    'spend' => (float)($row['salesAmt'] ?? 0), 'conversions' => (int)round((float)($row['ccnt'] ?? 0)), 'revenue' => (float)($row['convAmt'] ?? 0),
                    'currency' => 'KRW', 'extra' => ['level' => 'adgroup', 'adset_ext_id' => $aid, 'adset_name' => $m['adgroup']],
                ];
            }
        }
        return ['hasCreds' => true, 'live' => true, 'rows' => $rows];
    }

    /** Kakao Moment ad-group 입도 — /openapi/v4/adGroups/report(dimension=AD_GROUP). 실패/빈 시 상위가 campaign 폴백. */
    private static function fetchKakaoAdGroupRows(string $tenant, string $start, string $end): array
    {
        $accessToken = (string)(getenv('KAKAO_MOMENT_ACCESS_TOKEN') ?: self::loadCred($tenant, 'kakao_moment', 'access_token'));
        $adAccountId = (string)(getenv('KAKAO_MOMENT_AD_ACCOUNT_ID') ?: self::loadCred($tenant, 'kakao_moment', 'ad_account_id'));
        if ($adAccountId === '') $adAccountId = (string)self::loadCred($tenant, 'kakao_moment', 'account_id');
        if ($accessToken === '' || $adAccountId === '') return ['hasCreds' => false, 'live' => false, 'rows' => []];
        $params = http_build_query(['start' => str_replace('-', '', $start), 'end' => str_replace('-', '', $end), 'metricsGroup' => 'BASIC', 'dimension' => 'AD_GROUP']);
        [$code, $body] = self::httpGet("https://apis.moment.kakao.com/openapi/v4/adGroups/report?{$params}", ['Authorization' => "Bearer {$accessToken}", 'adAccountId' => $adAccountId, 'Content-Type' => 'application/json']);
        if ($code >= 400) return ['hasCreds' => true, 'live' => false, 'rows' => []]; // 폴백
        $rows = [];
        foreach ((array)($body['data'] ?? $body['report'] ?? []) as $r) {
            $dim = (array)($r['dimension'] ?? $r['dimensions'] ?? []);
            $m   = (array)($r['metric'] ?? $r['metrics'] ?? []);
            $rawDate = (string)($r['start'] ?? $r['date'] ?? $dim['date'] ?? '');
            $date = (strlen($rawDate) === 8) ? substr($rawDate, 0, 4) . '-' . substr($rawDate, 4, 2) . '-' . substr($rawDate, 6, 2) : substr($rawDate, 0, 10);
            $rows[] = [
                'team' => 'Kakao', 'account' => (string)($dim['campaignName'] ?? $dim['adGroupName'] ?? 'Kakao Moment'),
                'campaign_ext_id' => (string)($dim['campaignId'] ?? ''), 'ad_ext_id' => (string)($dim['adGroupId'] ?? $dim['adGroupName'] ?? ''),
                'objective' => (string)($dim['objective'] ?? $dim['campaignObjective'] ?? ''), 'reach' => (int)($m['reach'] ?? 0), 'date' => $date,
                'impressions' => (int)($m['imp'] ?? $m['impression'] ?? 0), 'clicks' => (int)($m['click'] ?? $m['clicks'] ?? 0),
                'spend' => (float)($m['cost'] ?? $m['spending'] ?? 0), 'conversions' => (int)round((float)($m['convPurchaseCnt'] ?? $m['conv'] ?? 0)),
                'revenue' => (float)($m['convPurchaseAmount'] ?? $m['convValue'] ?? 0),
                'extra' => ['level' => 'adgroup', 'adset_ext_id' => (string)($dim['adGroupId'] ?? ''), 'adset_name' => (string)($dim['adGroupName'] ?? '')],
            ];
        }
        return ['hasCreds' => true, 'live' => true, 'rows' => $rows];
    }

    /** LINE Ads ad-group 입도 — /statistics/adgroup(JWS). 실패/빈 시 상위가 campaign 폴백. */
    private static function fetchLineAdGroupRows(string $tenant, string $start, string $end): array
    {
        $accessKey = (string)(getenv('LINE_ADS_ACCESS_KEY') ?: self::loadCred($tenant, 'line_ads', 'access_key'));
        $secretKey = (string)(getenv('LINE_ADS_SECRET_KEY') ?: self::loadCred($tenant, 'line_ads', 'secret_key'));
        $groupId   = (string)(getenv('LINE_ADS_GROUP_ID')   ?: self::loadCred($tenant, 'line_ads', 'group_id'));
        if ($groupId === '') $groupId = (string)self::loadCred($tenant, 'line_ads', 'ad_account_id');
        if ($accessKey === '' || $secretKey === '' || $groupId === '') return ['hasCreds' => false, 'live' => false, 'rows' => []];
        $path = '/api/v3/groups/' . rawurlencode($groupId) . '/statistics/adgroup';
        $query = http_build_query(['since' => str_replace('-', '', $start), 'until' => str_replace('-', '', $end), 'datePreset' => 'CUSTOM']);
        $hdr = self::lineAdsAuthHeaders('GET', $path, '', $accessKey, $secretKey);
        [$code, $body] = self::httpGet('https://ads.line.me' . $path . '?' . $query, $hdr);
        if ($code >= 400) return ['hasCreds' => true, 'live' => false, 'rows' => []]; // 폴백
        $lineCur = strtoupper((string)(self::loadCred($tenant, 'line_ads', 'currency') ?: 'JPY'));
        $rows = [];
        foreach ((array)($body['datas'] ?? $body['data'] ?? $body['statistics'] ?? []) as $r) {
            $dim = (array)($r['dimensions'] ?? $r['dimension'] ?? $r);
            $m   = (array)($r['metrics'] ?? $r['metric'] ?? $r);
            $rawDate = (string)($r['date'] ?? $dim['date'] ?? '');
            $date = (strlen($rawDate) === 8) ? substr($rawDate, 0, 4) . '-' . substr($rawDate, 4, 2) . '-' . substr($rawDate, 6, 2) : substr($rawDate, 0, 10);
            $rows[] = [
                'team' => 'LINE', 'account' => (string)($dim['campaignName'] ?? $dim['adgroupName'] ?? 'LINE Ads'),
                'campaign_ext_id' => (string)($dim['campaignId'] ?? ''), 'ad_ext_id' => (string)($dim['adgroupId'] ?? $dim['adGroupId'] ?? ''),
                'objective' => (string)($dim['objective'] ?? ''), 'reach' => (int)($m['reach'] ?? 0), 'date' => $date,
                'impressions' => (int)($m['imp'] ?? $m['impression'] ?? $m['impressions'] ?? 0), 'clicks' => (int)($m['click'] ?? $m['clicks'] ?? 0),
                'spend' => (float)($m['cost'] ?? $m['spend'] ?? 0), 'conversions' => (int)round((float)($m['conversion'] ?? $m['conv'] ?? 0)),
                'revenue' => (float)($m['conversionValue'] ?? $m['convValue'] ?? 0),
                'currency' => strtoupper((string)($m['currency'] ?? $lineCur)),
                'extra' => ['level' => 'adgroup', 'adset_ext_id' => (string)($dim['adgroupId'] ?? ''), 'adset_name' => (string)($dim['adgroupName'] ?? '')],
            ];
        }
        return ['hasCreds' => true, 'live' => true, 'rows' => $rows];
    }

    // ════════════ [현 차수 P2-2a] 키워드 입도 — 검색광고 키워드별 성과(별도 테이블, 이중계산 회피) ════════════

    private static function ensureKeywordTable(PDO $pdo): void
    {
        $drv = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME);
        $AI = ($drv === 'mysql') ? 'INT AUTO_INCREMENT PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT';
        $pdo->exec("CREATE TABLE IF NOT EXISTS keyword_insight (
            id $AI, tenant_id VARCHAR(64), channel VARCHAR(40),
            campaign VARCHAR(255), adgroup VARCHAR(255), keyword VARCHAR(500), keyword_ext_id VARCHAR(120),
            match_type VARCHAR(30), date VARCHAR(20),
            impressions INTEGER DEFAULT 0, clicks INTEGER DEFAULT 0,
            spend REAL DEFAULT 0, conversions INTEGER DEFAULT 0, revenue REAL DEFAULT 0,
            currency VARCHAR(8) DEFAULT 'KRW', created_at TEXT
        )");
        try { $pdo->exec("CREATE INDEX idx_kwins_tenant ON keyword_insight(tenant_id, channel, date)"); } catch (\Throwable $e) {}
    }

    /** 키워드 행 적재 — DELETE-then-INSERT(tenant,channel,date 범위). spend KRW 환산. */
    private static function persistKeywordRows(PDO $pdo, string $tenant, string $channel, array $rows, string $start, string $end): int
    {
        self::ensureKeywordTable($pdo);
        $pdo->beginTransaction();
        try {
            $del = $pdo->prepare("DELETE FROM keyword_insight WHERE tenant_id=? AND channel=? AND date BETWEEN ? AND ?");
            $del->execute([$tenant, $channel, $start, $end]);
            $ins = $pdo->prepare("INSERT INTO keyword_insight(tenant_id,channel,campaign,adgroup,keyword,keyword_ext_id,match_type,date,impressions,clicks,spend,conversions,revenue,currency,created_at)
                                  VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)");
            $now = gmdate('c'); $n = 0;
            foreach ($rows as $r) {
                $date = (string)($r['date'] ?? ''); if ($date === '' || $date < $start || $date > $end) continue;
                $cur = strtoupper((string)($r['currency'] ?? 'KRW'));
                $ins->execute([$tenant, $channel, (string)($r['campaign'] ?? ''), (string)($r['adgroup'] ?? ''),
                    (string)($r['keyword'] ?? ''), (string)($r['keyword_ext_id'] ?? ''), (string)($r['match_type'] ?? ''), $date,
                    (int)($r['impressions'] ?? 0), (int)($r['clicks'] ?? 0),
                    self::fxToKrw((float)($r['spend'] ?? 0), $cur), (int)($r['conversions'] ?? 0),
                    self::fxToKrw((float)($r['revenue'] ?? 0), $cur), $cur, $now]);
                $n++;
            }
            $pdo->commit();
            return $n;
        } catch (\Throwable $e) { if ($pdo->inTransaction()) $pdo->rollBack(); throw $e; }
    }

    /** Google Ads keyword_view GAQL — 캠페인/애드그룹/키워드×일자. cost_micros÷1e6. */
    private static function fetchGoogleKeywordRows(string $tenant, string $start, string $end): array
    {
        $devToken    = (string)(getenv('GOOGLE_DEVELOPER_TOKEN') ?: self::loadCred($tenant, 'google_ads', 'developer_token'));
        $accessToken = (string)(getenv('GOOGLE_ACCESS_TOKEN')    ?: self::loadCred($tenant, 'google_ads', 'access_token'));
        $customerId  = str_replace('-', '', (string)(getenv('GOOGLE_CUSTOMER_ID') ?: self::loadCred($tenant, 'google_ads', 'customer_id')));
        if ($devToken === '' || $accessToken === '' || $customerId === '') return ['hasCreds' => false, 'live' => false, 'rows' => []];
        $gaql = "SELECT campaign.name, ad_group.name, ad_group_criterion.keyword.text, ad_group_criterion.keyword.match_type,
                        ad_group_criterion.criterion_id, customer.currency_code,
                        metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions, metrics.conversions_value, segments.date
                 FROM keyword_view
                 WHERE segments.date BETWEEN '$start' AND '$end' AND ad_group_criterion.status != 'REMOVED'
                 ORDER BY segments.date DESC LIMIT 10000";
        [$code, $body, $err] = self::httpPost("https://googleads.googleapis.com/v17/customers/{$customerId}/googleAds:searchStream", ['query' => $gaql],
            ['Authorization' => "Bearer {$accessToken}", 'developer-token' => $devToken, 'Content-Type' => 'application/json']);
        if ($err || $code >= 400) return ['hasCreds' => true, 'live' => false, 'error' => $err ?? "google kw http $code"];
        $results = [];
        if (isset($body['results'])) $results = (array)$body['results'];
        else foreach ((array)$body as $chunk) { if (is_array($chunk) && isset($chunk['results'])) $results = array_merge($results, (array)$chunk['results']); }
        if (count($results) >= 10000) return ['hasCreds' => true, 'live' => false, 'error' => 'google keyword truncated — window 축소 필요(기존 보존)'];
        $rows = [];
        foreach ($results as $r) {
            $rows[] = [
                'campaign' => (string)($r['campaign']['name'] ?? ''), 'adgroup' => (string)($r['adGroup']['name'] ?? ''),
                'keyword' => (string)($r['adGroupCriterion']['keyword']['text'] ?? ''),
                'keyword_ext_id' => (string)($r['adGroupCriterion']['criterionId'] ?? ''),
                'match_type' => (string)($r['adGroupCriterion']['keyword']['matchType'] ?? ''),
                'date' => (string)($r['segments']['date'] ?? ''),
                'impressions' => (int)($r['metrics']['impressions'] ?? 0), 'clicks' => (int)($r['metrics']['clicks'] ?? 0),
                'spend' => round((int)($r['metrics']['costMicros'] ?? 0) / 1_000_000, 2),
                'conversions' => (int)round((float)($r['metrics']['conversions'] ?? 0)),
                'revenue' => round((float)($r['metrics']['conversionsValue'] ?? 0), 2),
                'currency' => strtoupper((string)($r['customer']['currencyCode'] ?? 'KRW')),
            ];
        }
        return ['hasCreds' => true, 'live' => true, 'rows' => $rows];
    }

    /** Naver SA 키워드 성과 — /ncc/keywords(애드그룹별·콜상한) → /stats(keyword ids, breakdown=day). KRW. */
    private static function fetchNaverKeywordRows(string $tenant, string $start, string $end): array
    {
        $apiKey     = (string)(getenv('NAVER_API_KEY')     ?: self::loadCred($tenant, 'naver_sa', 'api_key')     ?: self::loadCred($tenant, 'naver_searchad', 'api_key'));
        $apiSecret  = (string)(getenv('NAVER_API_SECRET')  ?: self::loadCred($tenant, 'naver_sa', 'api_secret')  ?: self::loadCred($tenant, 'naver_searchad', 'api_secret'));
        $customerId = (string)(getenv('NAVER_CUSTOMER_ID') ?: self::loadCred($tenant, 'naver_sa', 'customer_id') ?: self::loadCred($tenant, 'naver_searchad', 'customer_id'));
        if ($apiKey === '' || $apiSecret === '' || $customerId === '') return ['hasCreds' => false, 'live' => false, 'rows' => []];
        $sign = function (string $m, string $p) use ($apiSecret): array { $ts = (string)(round(microtime(true) * 1000)); return [$ts, base64_encode(hash_hmac('sha256', "{$ts}.{$m}.{$p}", $apiSecret, true))]; };
        $hdr = function (array $sg) use ($apiKey, $customerId): array { return ['X-Timestamp' => $sg[0], 'X-API-KEY' => $apiKey, 'X-Customer' => $customerId, 'X-Signature' => $sg[1], 'Content-Type' => 'application/json; charset=UTF-8']; };
        [$aCode, $aBody] = self::httpGet('https://api.naver.com/ncc/adgroups', $hdr($sign('GET', '/ncc/adgroups')));
        if ($aCode >= 400 || !is_array($aBody)) return ['hasCreds' => true, 'live' => false, 'rows' => []];
        $kwIds = []; $kwMeta = []; $cnt = 0;
        foreach ($aBody as $ag) {
            $agid = (string)($ag['nccAdgroupId'] ?? ''); if ($agid === '') continue;
            if (++$cnt > 20) break; // 콜 상한
            [$kCode, $kBody] = self::httpGet('https://api.naver.com/ncc/keywords?' . http_build_query(['nccAdgroupId' => $agid]), $hdr($sign('GET', '/ncc/keywords')));
            if ($kCode >= 400 || !is_array($kBody)) continue;
            foreach ($kBody as $kw) {
                $kid = (string)($kw['nccKeywordId'] ?? ''); if ($kid === '') continue;
                $kwIds[] = $kid; $kwMeta[$kid] = ['keyword' => (string)($kw['keyword'] ?? ''), 'adgroup' => $agid];
            }
        }
        if (empty($kwIds)) return ['hasCreds' => true, 'live' => false, 'rows' => []];
        $rows = [];
        foreach (array_chunk($kwIds, 100) as $batch) {
            $q = http_build_query(['ids' => implode(',', $batch), 'fields' => json_encode(['impCnt', 'clkCnt', 'salesAmt', 'ccnt', 'convAmt']), 'timeRange' => json_encode(['since' => $start, 'until' => $end]), 'breakdown' => 'day']);
            [$sCode, $sBody] = self::httpGet('https://api.naver.com/stats?' . $q, $hdr($sign('GET', '/stats')));
            if ($sCode >= 400) return ['hasCreds' => true, 'live' => false, 'rows' => []];
            foreach ((array)($sBody['data'] ?? (is_array($sBody) ? $sBody : [])) as $row) {
                if (!is_array($row)) continue;
                $day = substr(str_replace(['.', '/'], '-', (string)($row['dimension']['day'] ?? $row['day'] ?? '')), 0, 10);
                if ($day === '' || $day < $start || $day > $end) continue;
                $kid = (string)($row['id'] ?? ($row['dimension']['id'] ?? ''));
                $m = $kwMeta[$kid] ?? ['keyword' => '', 'adgroup' => ''];
                $rows[] = [
                    'campaign' => '', 'adgroup' => $m['adgroup'], 'keyword' => $m['keyword'], 'keyword_ext_id' => $kid, 'match_type' => '', 'date' => $day,
                    'impressions' => (int)($row['impCnt'] ?? 0), 'clicks' => (int)($row['clkCnt'] ?? 0),
                    'spend' => (float)($row['salesAmt'] ?? 0), 'conversions' => (int)round((float)($row['ccnt'] ?? 0)), 'revenue' => (float)($row['convAmt'] ?? 0), 'currency' => 'KRW',
                ];
            }
        }
        return ['hasCreds' => true, 'live' => true, 'rows' => $rows];
    }

    /** GET /v424/connectors/keywords — 저장된 키워드 성과(검색광고 세분 귀속 분석). 테넌트 격리. */
    public static function keywords(Request $request, Response $response, array $args): Response
    {
        $tenant = (string)($request->getAttribute('auth_tenant') ?? '');
        if ($tenant === '') { $u = \Genie\Handlers\UserAuth::authedTenant($request); $tenant = $u ?? ''; }
        if ($tenant === '') return TemplateResponder::respond($response, ['ok' => false, 'keywords' => []]);
        try {
            $pdo = Db::pdo(); self::ensureKeywordTable($pdo);
            $q = $request->getQueryParams();
            $where = 'tenant_id=?'; $params = [$tenant];
            if (!empty($q['channel'])) { $where .= ' AND channel=?'; $params[] = (string)$q['channel']; }
            $st = $pdo->prepare("SELECT channel,campaign,adgroup,keyword,keyword_ext_id,match_type,
                                 SUM(impressions) impressions, SUM(clicks) clicks, SUM(spend) spend, SUM(conversions) conversions, SUM(revenue) revenue
                                 FROM keyword_insight WHERE $where GROUP BY channel,campaign,adgroup,keyword,keyword_ext_id,match_type
                                 ORDER BY spend DESC LIMIT 500");
            $st->execute($params);
            $rows = $st->fetchAll(PDO::FETCH_ASSOC) ?: [];
            foreach ($rows as &$r) {
                $r['impressions'] = (int)$r['impressions']; $r['clicks'] = (int)$r['clicks'];
                $r['spend'] = round((float)$r['spend'], 0); $r['conversions'] = (int)$r['conversions']; $r['revenue'] = round((float)$r['revenue'], 0);
                $r['roas'] = $r['spend'] > 0 ? round($r['revenue'] / $r['spend'], 2) : 0;
                $r['cpc'] = $r['clicks'] > 0 ? round($r['spend'] / $r['clicks'], 0) : 0;
            }
            return TemplateResponder::respond($response, ['ok' => true, 'keywords' => $rows, 'count' => count($rows)]);
        } catch (\Throwable $e) {
            return TemplateResponder::respond($response, ['ok' => false, 'keywords' => [], 'error' => $e->getMessage()]);
        }
    }

    // ════════════ [현 차수] 롱테일 광고 커넥터 5종 (신용게이트·자격증명→즉시 실행, graceful 드롭인) ════════════
    //   미설정=hasCreds:false skip, 키 등록=즉시 실 fetch. API 실패=live:false(기존 데이터 보존). 거짓데이터 0.
    //   라이브 검증=실 매체 계정 필요(amazon_ads/x_ads 와 동일 posture). 통화 stamp→persist 가 KRW 환산.

    /** Reddit Ads API v3 — POST /api/v3/ad_accounts/{id}/reports(DATE×CAMPAIGN). spend=microcurrency(÷1e6). */
    private static function fetchRedditRows(string $tenant, string $start, string $end): array
    {
        $token = (string)(getenv('REDDIT_ADS_ACCESS_TOKEN') ?: self::loadCred($tenant, 'reddit_ads', 'access_token'));
        $acct  = (string)(getenv('REDDIT_ADS_ACCOUNT_ID') ?: self::loadCred($tenant, 'reddit_ads', 'ad_account_id'));
        if ($token === '' || $acct === '') return ['hasCreds' => false, 'live' => false, 'rows' => []];
        $cur = strtoupper((string)(self::loadCred($tenant, 'reddit_ads', 'currency') ?: 'USD'));
        $payload = ['data' => ['breakdowns' => ['DATE', 'CAMPAIGN_ID'], 'fields' => ['impressions', 'clicks', 'spend', 'conversion_signup_total_items', 'conversion_signup_total_value'],
            'starts_at' => $start . 'T00:00:00Z', 'ends_at' => $end . 'T23:59:59Z', 'time_zone_id' => 'GMT']];
        [$code, $body, $err] = self::httpPost('https://ads-api.reddit.com/api/v3/ad_accounts/' . rawurlencode($acct) . '/reports', $payload, ['Authorization' => 'Bearer ' . $token, 'Content-Type' => 'application/json']);
        if ($err || $code >= 400) return ['hasCreds' => true, 'live' => false, 'error' => $err ?: "reddit http $code"];
        $rows = [];
        foreach ((array)($body['data']['metrics'] ?? $body['data'] ?? []) as $r) {
            if (!is_array($r)) continue;
            $rows[] = [
                'team' => 'Reddit Ads', 'account' => 'Reddit Ads', 'campaign_ext_id' => (string)($r['campaign_id'] ?? $r['CAMPAIGN_ID'] ?? ''),
                'objective' => '', 'reach' => 0, 'date' => substr((string)($r['date'] ?? $r['DATE'] ?? ''), 0, 10),
                'impressions' => (int)($r['impressions'] ?? 0), 'clicks' => (int)($r['clicks'] ?? 0),
                'spend' => round((float)($r['spend'] ?? 0) / 1000000.0, 2),
                'conversions' => (int)round((float)($r['conversion_signup_total_items'] ?? 0)),
                'revenue' => round((float)($r['conversion_signup_total_value'] ?? 0) / 1000000.0, 2), 'currency' => $cur,
            ];
        }
        return ['hasCreds' => true, 'live' => true, 'rows' => $rows];
    }

    /** Apple Search Ads API v5 — POST /api/v5/reports/campaigns(DAILY). 인증 Bearer + X-AP-Context: orgId. taps=clicks. */
    private static function fetchAppleSearchAdsRows(string $tenant, string $start, string $end): array
    {
        $token = (string)(getenv('APPLE_SEARCH_ADS_ACCESS_TOKEN') ?: self::loadCred($tenant, 'apple_search_ads', 'access_token'));
        $org   = (string)(getenv('APPLE_SEARCH_ADS_ORG_ID') ?: self::loadCred($tenant, 'apple_search_ads', 'org_id'));
        if ($token === '' || $org === '') return ['hasCreds' => false, 'live' => false, 'rows' => []];
        $cur = strtoupper((string)(self::loadCred($tenant, 'apple_search_ads', 'currency') ?: 'USD'));
        $payload = ['startTime' => $start, 'endTime' => $end, 'granularity' => 'DAILY',
            'selector' => ['orderBy' => [['field' => 'campaignId', 'sortOrder' => 'ASCENDING']], 'pagination' => ['offset' => 0, 'limit' => 1000]],
            'returnRowTotals' => false, 'returnGrandTotals' => false];
        [$code, $body, $err] = self::httpPost('https://api.searchads.apple.com/api/v5/reports/campaigns', $payload, ['Authorization' => 'Bearer ' . $token, 'X-AP-Context' => 'orgId=' . $org, 'Content-Type' => 'application/json']);
        if ($err || $code >= 400) return ['hasCreds' => true, 'live' => false, 'error' => $err ?: "apple_search_ads http $code"];
        $rows = [];
        foreach ((array)($body['data']['reportingDataResponse']['row'] ?? []) as $r) {
            $meta = $r['metadata'] ?? [];
            foreach ((array)($r['granularity'] ?? []) as $g) {
                $rows[] = [
                    'team' => 'Apple Search Ads', 'account' => (string)($meta['campaignName'] ?? 'Apple Search Ads'),
                    'campaign_ext_id' => (string)($meta['campaignId'] ?? ''), 'objective' => '', 'reach' => 0,
                    'date' => substr((string)($g['date'] ?? ''), 0, 10),
                    'impressions' => (int)($g['impressions'] ?? 0), 'clicks' => (int)($g['taps'] ?? 0),
                    'spend' => (float)($g['localSpend']['amount'] ?? 0),
                    'conversions' => (int)round((float)($g['totalInstalls'] ?? $g['installs'] ?? 0)), 'revenue' => 0.0,
                    'currency' => strtoupper((string)($g['localSpend']['currency'] ?? $cur)),
                ];
            }
        }
        return ['hasCreds' => true, 'live' => true, 'rows' => $rows];
    }

    /** Amazon DSP Reporting v3 — POST /dsp/reports(DAILY). 비동기 리포트(reportId 반환 시 다음 폴링)·graceful. */
    private static function fetchAmazonDspRows(string $tenant, string $start, string $end): array
    {
        $token   = (string)(getenv('AMAZON_DSP_ACCESS_TOKEN') ?: self::loadCred($tenant, 'amazon_dsp', 'access_token'));
        $profile = (string)(getenv('AMAZON_DSP_PROFILE_ID') ?: self::loadCred($tenant, 'amazon_dsp', 'profile_id'));
        $advertiser = (string)self::loadCred($tenant, 'amazon_dsp', 'advertiser_id');
        $clientId   = (string)(getenv('AMAZON_DSP_CLIENT_ID') ?: self::loadCred($tenant, 'amazon_dsp', 'client_id'));
        if ($token === '' || $profile === '' || $advertiser === '') return ['hasCreds' => false, 'live' => false, 'rows' => []];
        $cur = strtoupper((string)(self::loadCred($tenant, 'amazon_dsp', 'currency') ?: 'USD'));
        $headers = ['Authorization' => 'Bearer ' . $token, 'Amazon-Advertising-API-ClientId' => $clientId, 'Amazon-Advertising-API-Scope' => $profile, 'Content-Type' => 'application/json'];
        $payload = ['startDate' => str_replace('-', '', $start), 'endDate' => str_replace('-', '', $end), 'type' => 'CAMPAIGN',
            'dimensions' => ['ORDER', 'LINE_ITEM'], 'metrics' => ['impressions', 'clickThroughs', 'totalCost', 'totalPurchases14d', 'totalSales14d'], 'timeUnit' => 'DAILY', 'format' => 'JSON'];
        [$code, $body, $err] = self::httpPost('https://advertising-api.amazon.com/accounts/' . rawurlencode($advertiser) . '/dsp/reports', $payload, $headers);
        if ($err || $code >= 400) return ['hasCreds' => true, 'live' => false, 'error' => ($err ?: "amazon_dsp http $code") . ' (비동기 — 라이브 검증 시 폴링 보강)'];
        if (isset($body['reportId']) && !isset($body['data'])) return ['hasCreds' => true, 'live' => true, 'rows' => []]; // 비동기 생성됨 → 다음 사이클 폴링
        $rows = [];
        foreach ((array)($body['data'] ?? []) as $r) {
            if (!is_array($r)) continue;
            $rows[] = [
                'team' => 'Amazon DSP', 'account' => (string)($r['orderName'] ?? 'Amazon DSP'),
                'campaign_ext_id' => (string)($r['orderId'] ?? $r['lineItemId'] ?? ''), 'objective' => '', 'reach' => 0,
                'date' => substr((string)($r['date'] ?? $r['intervalStart'] ?? ''), 0, 10),
                'impressions' => (int)($r['impressions'] ?? 0), 'clicks' => (int)($r['clickThroughs'] ?? 0),
                'spend' => (float)($r['totalCost'] ?? 0), 'conversions' => (int)round((float)($r['totalPurchases14d'] ?? 0)),
                'revenue' => (float)($r['totalSales14d'] ?? 0), 'currency' => $cur,
            ];
        }
        return ['hasCreds' => true, 'live' => true, 'rows' => $rows];
    }

    /** Quora Ads API — GET /ads/v0/accounts/{id}/stats(day×campaign). best-effort(라이브 검증 후 매핑). */
    private static function fetchQuoraRows(string $tenant, string $start, string $end): array
    {
        $token = (string)(getenv('QUORA_ADS_ACCESS_TOKEN') ?: self::loadCred($tenant, 'quora_ads', 'access_token'));
        $acct  = (string)(getenv('QUORA_ADS_ACCOUNT_ID') ?: self::loadCred($tenant, 'quora_ads', 'account_id'));
        if ($token === '' || $acct === '') return ['hasCreds' => false, 'live' => false, 'rows' => []];
        $cur = strtoupper((string)(self::loadCred($tenant, 'quora_ads', 'currency') ?: 'USD'));
        $q = http_build_query(['start_date' => $start, 'end_date' => $end, 'granularity' => 'day', 'group_by' => 'campaign']);
        [$code, $body, $err] = self::httpGet('https://api.quora.com/ads/v0/accounts/' . rawurlencode($acct) . '/stats?' . $q, ['Authorization' => 'Bearer ' . $token, 'Accept' => 'application/json']);
        if ($err || $code >= 400) return ['hasCreds' => true, 'live' => false, 'error' => ($err ?: "quora http $code") . ' (라이브 검증 후 매핑)'];
        $rows = [];
        foreach ((array)($body['data'] ?? $body['stats'] ?? []) as $r) {
            if (!is_array($r)) continue;
            $rows[] = [
                'team' => 'Quora Ads', 'account' => 'Quora Ads', 'campaign_ext_id' => (string)($r['campaign_id'] ?? $r['campaignId'] ?? ''),
                'objective' => '', 'reach' => 0, 'date' => substr((string)($r['date'] ?? ''), 0, 10),
                'impressions' => (int)($r['impressions'] ?? 0), 'clicks' => (int)($r['clicks'] ?? 0),
                'spend' => (float)($r['spend'] ?? $r['cost'] ?? 0), 'conversions' => (int)round((float)($r['conversions'] ?? 0)),
                'revenue' => (float)($r['conversion_value'] ?? 0), 'currency' => $cur,
            ];
        }
        return ['hasCreds' => true, 'live' => true, 'rows' => $rows];
    }

    /** Spotify Ads(Ad Studio) API — GET /ads/v1/ad_accounts/{id}/reports(DAY). best-effort(라이브 검증 후 매핑). */
    private static function fetchSpotifyAdsRows(string $tenant, string $start, string $end): array
    {
        $token = (string)(getenv('SPOTIFY_ADS_ACCESS_TOKEN') ?: self::loadCred($tenant, 'spotify_ads', 'access_token'));
        $acct  = (string)(getenv('SPOTIFY_ADS_AD_ACCOUNT_ID') ?: self::loadCred($tenant, 'spotify_ads', 'ad_account_id'));
        if ($token === '' || $acct === '') return ['hasCreds' => false, 'live' => false, 'rows' => []];
        $cur = strtoupper((string)(self::loadCred($tenant, 'spotify_ads', 'currency') ?: 'USD'));
        $q = http_build_query(['start_date' => $start, 'end_date' => $end, 'granularity' => 'DAY']);
        [$code, $body, $err] = self::httpGet('https://api-partner.spotify.com/ads/v1/ad_accounts/' . rawurlencode($acct) . '/reports?' . $q, ['Authorization' => 'Bearer ' . $token, 'Accept' => 'application/json']);
        if ($err || $code >= 400) return ['hasCreds' => true, 'live' => false, 'error' => ($err ?: "spotify http $code") . ' (라이브 검증 후 매핑)'];
        $rows = [];
        foreach ((array)($body['data'] ?? $body['reports'] ?? []) as $r) {
            if (!is_array($r)) continue;
            $rows[] = [
                'team' => 'Spotify Ads', 'account' => 'Spotify Ads', 'campaign_ext_id' => (string)($r['campaign_id'] ?? $r['campaignId'] ?? ''),
                'objective' => '', 'reach' => 0, 'date' => substr((string)($r['date'] ?? ''), 0, 10),
                'impressions' => (int)($r['impressions'] ?? 0), 'clicks' => (int)($r['clicks'] ?? 0),
                'spend' => (float)($r['spend'] ?? $r['cost'] ?? 0), 'conversions' => (int)round((float)($r['conversions'] ?? 0)),
                'revenue' => (float)($r['conversion_value'] ?? 0), 'currency' => $cur,
            ];
        }
        return ['hasCreds' => true, 'live' => true, 'rows' => $rows];
    }

    /** [R-P3-7] Taboola(Backstage) 네이티브 광고 — campaign-summary 일자 리포트. access_token+account_id 등록 시 즉시 동작. */
    private static function fetchTaboolaRows(string $tenant, string $start, string $end): array
    {
        $token = (string)(getenv('TABOOLA_ACCESS_TOKEN') ?: self::loadCred($tenant, 'taboola', 'access_token'));
        $acct  = (string)(getenv('TABOOLA_ACCOUNT_ID') ?: self::loadCred($tenant, 'taboola', 'account_id'));
        if ($token === '' || $acct === '') return ['hasCreds' => false, 'live' => false, 'rows' => []];
        $cur = strtoupper((string)(self::loadCred($tenant, 'taboola', 'currency') ?: 'USD'));
        $q = http_build_query(['start_date' => $start, 'end_date' => $end]);
        [$code, $body, $err] = self::httpGet('https://backstage.taboola.com/backstage/api/1.0/' . rawurlencode($acct) . '/reports/campaign-summary/dimensions/day?' . $q, ['Authorization' => 'Bearer ' . $token, 'Accept' => 'application/json']);
        if ($err || $code >= 400) return ['hasCreds' => true, 'live' => false, 'error' => ($err ?: "taboola http $code") . ' (라이브 검증 후 매핑)'];
        $rows = [];
        foreach ((array)($body['results'] ?? []) as $r) {
            if (!is_array($r)) continue;
            $rows[] = [
                'team' => 'Taboola', 'account' => 'Taboola', 'campaign_ext_id' => (string)($r['campaign'] ?? $r['campaign_id'] ?? ''),
                'objective' => '', 'reach' => 0, 'date' => substr((string)($r['date'] ?? ''), 0, 10),
                'impressions' => (int)($r['impressions'] ?? 0), 'clicks' => (int)($r['clicks'] ?? 0),
                'spend' => (float)($r['spent'] ?? $r['spend'] ?? 0), 'conversions' => (int)round((float)($r['cpa_actions_num'] ?? $r['conversions'] ?? 0)),
                'revenue' => (float)($r['cpa_conversions_value'] ?? $r['conversions_value'] ?? 0), 'currency' => $cur,
            ];
        }
        return ['hasCreds' => true, 'live' => true, 'rows' => $rows];
    }

    /** [R-P3-7] Outbrain(Amplify) 네이티브 광고 — marketer periodic(daily) 리포트. ob_token+marketer_id 등록 시 즉시 동작. */
    private static function fetchOutbrainRows(string $tenant, string $start, string $end): array
    {
        $token = (string)(getenv('OUTBRAIN_OB_TOKEN') ?: self::loadCred($tenant, 'outbrain', 'ob_token'));
        $mkt   = (string)(getenv('OUTBRAIN_MARKETER_ID') ?: self::loadCred($tenant, 'outbrain', 'marketer_id'));
        if ($token === '' || $mkt === '') return ['hasCreds' => false, 'live' => false, 'rows' => []];
        $cur = strtoupper((string)(self::loadCred($tenant, 'outbrain', 'currency') ?: 'USD'));
        $q = http_build_query(['from' => $start, 'to' => $end, 'breakdown' => 'daily']);
        [$code, $body, $err] = self::httpGet('https://api.outbrain.com/amplify/v0.1/marketers/' . rawurlencode($mkt) . '/periodic?' . $q, ['OB-TOKEN-V1' => $token, 'Accept' => 'application/json']);
        if ($err || $code >= 400) return ['hasCreds' => true, 'live' => false, 'error' => ($err ?: "outbrain http $code") . ' (라이브 검증 후 매핑)'];
        $rows = [];
        foreach ((array)($body['results'] ?? []) as $r) {
            if (!is_array($r)) continue;
            $m = (array)($r['metrics'] ?? $r); $meta = (array)($r['metadata'] ?? []);
            $rows[] = [
                'team' => 'Outbrain', 'account' => 'Outbrain', 'campaign_ext_id' => (string)($meta['id'] ?? ''),
                'objective' => '', 'reach' => 0, 'date' => substr((string)($meta['fromDate'] ?? $meta['date'] ?? ''), 0, 10),
                'impressions' => (int)($m['impressions'] ?? 0), 'clicks' => (int)($m['clicks'] ?? 0),
                'spend' => (float)($m['spend'] ?? 0), 'conversions' => (int)round((float)($m['conversions'] ?? 0)),
                'revenue' => (float)($m['sumValue'] ?? $m['conversionsValue'] ?? 0), 'currency' => $cur,
            ];
        }
        return ['hasCreds' => true, 'live' => true, 'rows' => $rows];
    }

    /** [246차 P3] AppLovin 광고 리포트 — Report API(api_key, GET JSON). 등록 시 즉시 동작. */
    private static function fetchAppLovinRows(string $tenant, string $start, string $end): array
    {
        $key = (string)(getenv('APPLOVIN_API_KEY') ?: self::loadCred($tenant, 'applovin', 'api_key'));
        if ($key === '') return ['hasCreds' => false, 'live' => false, 'rows' => []];
        $cur = strtoupper((string)(self::loadCred($tenant, 'applovin', 'currency') ?: 'USD'));
        $q = http_build_query(['api_key' => $key, 'start' => $start, 'end' => $end, 'format' => 'json', 'report_type' => 'advertiser',
            'columns' => 'day,campaign,impressions,clicks,cost,conversions,revenue']);
        [$code, $body, $err] = self::httpGet('https://r.applovin.com/report?' . $q, ['Accept' => 'application/json']);
        if ($err || $code >= 400) return ['hasCreds' => true, 'live' => false, 'error' => ($err ?: "applovin http $code") . ' (라이브 검증 후 매핑)'];
        $rows = [];
        foreach ((array)($body['results'] ?? []) as $r) {
            if (!is_array($r)) continue;
            $rows[] = [
                'team' => 'AppLovin', 'account' => 'AppLovin', 'campaign_ext_id' => (string)($r['campaign'] ?? ''),
                'objective' => '', 'reach' => 0, 'date' => substr((string)($r['day'] ?? ''), 0, 10),
                'impressions' => (int)($r['impressions'] ?? 0), 'clicks' => (int)($r['clicks'] ?? 0),
                'spend' => (float)($r['cost'] ?? 0), 'conversions' => (int)round((float)($r['conversions'] ?? 0)),
                'revenue' => (float)($r['revenue'] ?? 0), 'currency' => $cur,
            ];
        }
        return ['hasCreds' => true, 'live' => true, 'rows' => $rows];
    }

    /** [246차 P3] Mintegral 광고 리포트 — Reporting API(access_key + api_key→token md5, GET JSON). */
    private static function fetchMintegralRows(string $tenant, string $start, string $end): array
    {
        $ak = (string)(getenv('MINTEGRAL_ACCESS_KEY') ?: self::loadCred($tenant, 'mintegral', 'access_key'));
        $apiKey = (string)(getenv('MINTEGRAL_API_KEY') ?: self::loadCred($tenant, 'mintegral', 'api_key'));
        if ($ak === '' || $apiKey === '') return ['hasCreds' => false, 'live' => false, 'rows' => []];
        $cur = strtoupper((string)(self::loadCred($tenant, 'mintegral', 'currency') ?: 'USD'));
        $ts = (string)time();
        $token = md5($apiKey . md5($ts)); // Mintegral 표준 인증 토큰
        $q = http_build_query(['start_time' => $start, 'end_time' => $end, 'type' => 1, 'utc' => '+0']);
        [$code, $body, $err] = self::httpGet('https://ss-api.mintegral.com/api/v1/reports/data?' . $q,
            ['access-key' => $ak, 'token' => $token, 'timestamp' => $ts, 'Accept' => 'application/json']);
        if ($err || $code >= 400) return ['hasCreds' => true, 'live' => false, 'error' => ($err ?: "mintegral http $code") . ' (라이브 검증 후 매핑)'];
        $rows = [];
        foreach ((array)($body['data'] ?? $body['results'] ?? []) as $r) {
            if (!is_array($r)) continue;
            $rows[] = [
                'team' => 'Mintegral', 'account' => 'Mintegral', 'campaign_ext_id' => (string)($r['campaign_id'] ?? ''),
                'objective' => '', 'reach' => 0, 'date' => substr((string)($r['date'] ?? ''), 0, 10),
                'impressions' => (int)($r['impression'] ?? $r['impressions'] ?? 0), 'clicks' => (int)($r['click'] ?? $r['clicks'] ?? 0),
                'spend' => (float)($r['spend'] ?? 0), 'conversions' => (int)round((float)($r['conversion'] ?? $r['conversions'] ?? 0)),
                'revenue' => (float)($r['revenue'] ?? 0), 'currency' => $cur,
            ];
        }
        return ['hasCreds' => true, 'live' => true, 'rows' => $rows];
    }

    /** [246차 P3] Yandex Direct 광고 — Reports API v5(OAuth + Client-Login, POST). TSV/async → 등록 후 라이브 매핑. */
    private static function fetchYandexRows(string $tenant, string $start, string $end): array
    {
        $token = (string)(getenv('YANDEX_OAUTH_TOKEN') ?: self::loadCred($tenant, 'yandex_ads', 'oauth_token'));
        if ($token === '') return ['hasCreds' => false, 'live' => false, 'rows' => []];
        $login = (string)(getenv('YANDEX_CLIENT_LOGIN') ?: self::loadCred($tenant, 'yandex_ads', 'client_login'));
        $cur = strtoupper((string)(self::loadCred($tenant, 'yandex_ads', 'currency') ?: 'RUB'));
        $payload = ['params' => [
            'SelectionCriteria' => ['DateFrom' => $start, 'DateTo' => $end],
            'FieldNames' => ['Date', 'CampaignId', 'Impressions', 'Clicks', 'Cost', 'Conversions'],
            'ReportName' => 'genie_' . substr(md5($start . $end . microtime()), 0, 10),
            'ReportType' => 'CAMPAIGN_PERFORMANCE_REPORT', 'DateRangeType' => 'CUSTOM_DATE',
            'Format' => 'TSV', 'IncludeVAT' => 'NO',
        ]];
        $headers = ['Authorization' => 'Bearer ' . $token, 'Content-Type' => 'application/json', 'Accept-Language' => 'en', 'processingMode' => 'auto', 'returnMoneyInMicros' => 'false'];
        if ($login !== '') $headers['Client-Login'] = $login;
        [$code, $body, $err] = self::httpPost('https://api.direct.yandex.com/json/v5/reports', $payload, $headers);
        // Yandex 는 TSV(200)/async(201·202) → 본문은 비JSON. 자격 확인됨·라이브 매핑은 TSV 파서 라운드(정직).
        if ($err || $code >= 400) return ['hasCreds' => true, 'live' => false, 'error' => ($err ?: "yandex http $code") . ' (라이브 검증 후 TSV 매핑)'];
        return ['hasCreds' => true, 'live' => true, 'rows' => [], 'note' => 'Yandex 리포트 수락(' . $code . ') — TSV 매핑은 라이브 자격증명 검증 라운드에서 활성화'];
    }

    /** [246차 P3] Yahoo! JAPAN Ads — ReportDefinition(비동기: 생성→폴링→다운로드). 등록 후 라이브 매핑. */
    private static function fetchYahooJpRows(string $tenant, string $start, string $end): array
    {
        $token = (string)(getenv('YJP_ACCESS_TOKEN') ?: self::loadCred($tenant, 'yahoo_jp_ads', 'access_token'));
        $acct  = (string)(getenv('YJP_ACCOUNT_ID') ?: self::loadCred($tenant, 'yahoo_jp_ads', 'account_id'));
        if ($token === '' || $acct === '') return ['hasCreds' => false, 'live' => false, 'rows' => []];
        $payload = ['accountId' => $acct, 'operand' => [[
            'reportName' => 'genie_' . substr(md5($start . $end . microtime()), 0, 10),
            'reportType' => 'CAMPAIGN', 'reportDateRangeType' => 'CUSTOM_DATE',
            'dateRange' => ['startDate' => str_replace('-', '', $start), 'endDate' => str_replace('-', '', $end)],
            'fields' => ['DAY', 'CAMPAIGN_ID', 'IMPS', 'CLICKS', 'COST', 'CONVERSIONS'],
        ]]];
        [$code, $body, $err] = self::httpPost('https://ads-search.yahooapis.jp/api/v9/ReportDefinitionService/add', $payload,
            ['Authorization' => 'Bearer ' . $token, 'Content-Type' => 'application/json', 'Accept' => 'application/json']);
        if ($err || $code >= 400) return ['hasCreds' => true, 'live' => false, 'error' => ($err ?: "yahoo_jp http $code") . ' (라이브 검증 후 비동기 매핑)'];
        return ['hasCreds' => true, 'live' => true, 'rows' => [], 'note' => 'Yahoo! JAPAN Ads 리포트 정의 생성(' . $code . ') — 비동기 다운로드 매핑은 라이브 검증 라운드에서 활성화'];
    }

    /** [현 차수] X Ads OAuth1.0a 서명 GET. params 는 쿼리이자 서명 베이스 스트링 일부. graceful 반환 [code, json, err]. */
    private static function xAdsGet(string $url, array $params, array $oauth): array
    {
        $oauthParams = [
            'oauth_consumer_key'     => $oauth['ck'],
            'oauth_token'            => $oauth['at'],
            'oauth_nonce'            => bin2hex(random_bytes(16)),
            'oauth_timestamp'        => (string)time(),
            'oauth_signature_method' => 'HMAC-SHA1',
            'oauth_version'          => '1.0',
        ];
        // 서명 베이스: 쿼리 + oauth 파라미터 병합 후 RFC3986 정렬 인코딩.
        $allParams = array_merge($params, $oauthParams);
        ksort($allParams);
        $pieces = [];
        foreach ($allParams as $k => $v) {
            $pieces[] = rawurlencode((string)$k) . '=' . rawurlencode((string)$v);
        }
        $paramStr = implode('&', $pieces);
        $baseStr  = 'GET&' . rawurlencode($url) . '&' . rawurlencode($paramStr);
        $signKey  = rawurlencode($oauth['cs']) . '&' . rawurlencode($oauth['as']);
        $sig = base64_encode(hash_hmac('sha1', $baseStr, $signKey, true));
        $oauthParams['oauth_signature'] = $sig;
        // Authorization 헤더(oauth_* 만, 정렬).
        ksort($oauthParams);
        $authPieces = [];
        foreach ($oauthParams as $k => $v) {
            $authPieces[] = rawurlencode((string)$k) . '="' . rawurlencode((string)$v) . '"';
        }
        $authHeader = 'OAuth ' . implode(', ', $authPieces);
        // 쿼리 스트링(서명용과 동일 인코딩).
        $qPieces = [];
        foreach ($params as $k => $v) $qPieces[] = rawurlencode((string)$k) . '=' . rawurlencode((string)$v);
        $fullUrl = $url . (empty($qPieces) ? '' : ('?' . implode('&', $qPieces)));
        return self::httpGet($fullUrl, ['Authorization' => $authHeader]);
    }

    // ════════════════════════════════════════════════════════════════════════════
    //  [P1 커넥터 폭] 웹 분석 인바운드 — GA4 · Adobe Analytics
    //  ─────────────────────────────────────────────────────────────────────────
    //  광고(performance_metrics)와 별개의 web_analytics_metrics 로 적재(이중계산 차단).
    //  세션/사용자/페이지뷰/전환/매출을 채널그룹×소스미디엄 차원으로 일자별 수집.
    //  catalog 엔 등록됐으나 fetcher 부재(sync_kind='none')로 '거짓 기능'이던 갭 해소.
    //  isAnalyticsSource 는 AD_SHORT(광고/ROAS)와 분리 — 절대 광고로 오인 적재되지 않는다.
    // ════════════════════════════════════════════════════════════════════════════

    /** 웹 분석 데이터소스 SSOT — runSync 라우팅·cron·저장직후 트리거 공용. */
    public const ANALYTICS_SOURCES = ['ga4', 'adobe_analytics'];

    /** 채널키가 웹 분석 데이터소스인가(광고/커머스와 분리). */
    public static function isAnalyticsSource(string $channelKey): bool
    {
        // [현 차수 감사 P2] 레지스트리 병합 — isAdChannel/isCommerceChannel 처럼 admin 추가 analytics 채널도
        //   저장직후 즉시sync 인식(기존 const-only 는 cron 만 인식하던 즉시성 비대칭 해소).
        return in_array(strtolower(trim($channelKey)), self::analyticsSources(), true);
    }

    /** 동기화 대상 웹 분석 소스 전체(레지스트리 sync_kind='analytics' 병합). cron 팬아웃 SSOT. */
    public static function analyticsSources(): array
    {
        return array_values(array_unique(array_merge(self::ANALYTICS_SOURCES, self::registryChannels('analytics'))));
    }

    /** web_analytics_metrics 테이블 보장(MySQL/SQLite). (tenant,source,date,source_medium) 멱등 단위. */
    private static function ensureAnalyticsTable(PDO $pdo): void
    {
        $isMy = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'mysql';
        try {
            if ($isMy) {
                $pdo->exec("CREATE TABLE IF NOT EXISTS web_analytics_metrics (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    tenant_id VARCHAR(100) NOT NULL, source VARCHAR(40) NOT NULL,
                    date VARCHAR(10) NOT NULL, source_medium VARCHAR(190) NOT NULL DEFAULT '(direct)',
                    channel_group VARCHAR(120) NOT NULL DEFAULT '',
                    sessions INT DEFAULT 0, users INT DEFAULT 0, new_users INT DEFAULT 0,
                    page_views INT DEFAULT 0, conversions INT DEFAULT 0,
                    revenue DOUBLE DEFAULT 0, engaged_sessions INT DEFAULT 0,
                    avg_session_sec DOUBLE DEFAULT 0, bounce_rate DOUBLE DEFAULT 0,
                    currency VARCHAR(10) DEFAULT 'KRW', extra_json TEXT, updated_at VARCHAR(32),
                    UNIQUE KEY uq_wa (tenant_id, source, date, source_medium),
                    KEY idx_wa_ts (tenant_id, source, date)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
            } else {
                $pdo->exec("CREATE TABLE IF NOT EXISTS web_analytics_metrics (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    tenant_id TEXT NOT NULL, source TEXT NOT NULL,
                    date TEXT NOT NULL, source_medium TEXT NOT NULL DEFAULT '(direct)',
                    channel_group TEXT NOT NULL DEFAULT '',
                    sessions INTEGER DEFAULT 0, users INTEGER DEFAULT 0, new_users INTEGER DEFAULT 0,
                    page_views INTEGER DEFAULT 0, conversions INTEGER DEFAULT 0,
                    revenue REAL DEFAULT 0, engaged_sessions INTEGER DEFAULT 0,
                    avg_session_sec REAL DEFAULT 0, bounce_rate REAL DEFAULT 0,
                    currency TEXT DEFAULT 'KRW', extra_json TEXT, updated_at TEXT)");
                try { $pdo->exec("CREATE UNIQUE INDEX IF NOT EXISTS uq_wa ON web_analytics_metrics(tenant_id,source,date,source_medium)"); } catch (\Throwable $e) {}
            }
        } catch (\Throwable $e) { /* graceful */ }
    }

    /** 웹 분석 행 멱등 적재: (tenant,source,date∈[start,end]) 삭제 후 삽입. revenue 는 KRW 정규화. */
    private static function persistAnalyticsRows(PDO $pdo, string $tenant, string $source, array $rows, string $start, string $end): int
    {
        self::ensureAnalyticsTable($pdo);
        $source = strtolower($source);
        if (!$rows) {
            $del = $pdo->prepare('DELETE FROM web_analytics_metrics WHERE tenant_id=? AND source=? AND date BETWEEN ? AND ?');
            $del->execute([$tenant, $source, $start, $end]);
            return 0;
        }
        $pdo->beginTransaction();
        try {
            $del = $pdo->prepare('DELETE FROM web_analytics_metrics WHERE tenant_id=? AND source=? AND date BETWEEN ? AND ?');
            $del->execute([$tenant, $source, $start, $end]);
            $ins = $pdo->prepare('INSERT INTO web_analytics_metrics
                (tenant_id,source,date,source_medium,channel_group,sessions,users,new_users,page_views,conversions,revenue,engaged_sessions,avg_session_sec,bounce_rate,currency,extra_json,updated_at)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
            $now = gmdate('c'); $n = 0;
            foreach ($rows as $r) {
                $date = (string)($r['date'] ?? '');
                if ($date === '' || $date < $start || $date > $end) continue;
                $curr = strtoupper((string)($r['currency'] ?? 'KRW'));
                $revKrw = self::fxToKrw((float)($r['revenue'] ?? 0), $curr);
                $ins->execute([
                    $tenant, $source, $date,
                    (string)($r['source_medium'] ?? '(direct)'),
                    (string)($r['channel_group'] ?? ''),
                    (int)($r['sessions'] ?? 0), (int)($r['users'] ?? 0), (int)($r['new_users'] ?? 0),
                    (int)($r['page_views'] ?? 0), (int)($r['conversions'] ?? 0),
                    $revKrw, (int)($r['engaged_sessions'] ?? 0),
                    (float)($r['avg_session_sec'] ?? 0), (float)($r['bounce_rate'] ?? 0),
                    $curr, isset($r['extra']) ? json_encode($r['extra'], JSON_UNESCAPED_UNICODE) : null, $now,
                ]);
                $n++;
            }
            $pdo->commit();
            return $n;
        } catch (\Throwable $e) {
            if ($pdo->inTransaction()) $pdo->rollBack();
            throw $e;
        }
    }

    /**
     * Google 서비스 계정(JSON) → OAuth2 액세스 토큰. RS256 JWT bearer 그랜트.
     *   재사용 가능(GA4 외 Sheets/BigQuery 등). 실패 시 null(graceful). 토큰 요청당 캐시.
     */
    private static function googleSaToken(string $saJson, string $scope): ?string
    {
        static $cache = [];
        $sa = json_decode($saJson, true);
        if (!is_array($sa) || empty($sa['client_email']) || empty($sa['private_key'])) return null;
        $ck = md5(((string)$sa['client_email']) . '|' . $scope);
        if (isset($cache[$ck]) && $cache[$ck]['exp'] > time() + 60) return $cache[$ck]['tok'];
        $now = time();
        $b64 = fn($d) => rtrim(strtr(base64_encode($d), '+/', '-_'), '=');
        $header = $b64(json_encode(['alg' => 'RS256', 'typ' => 'JWT']));
        $claim  = $b64(json_encode([
            'iss'   => $sa['client_email'],
            'scope' => $scope,
            'aud'   => 'https://oauth2.googleapis.com/token',
            'exp'   => $now + 3600, 'iat' => $now,
        ]));
        $signingInput = $header . '.' . $claim;
        $sig = '';
        if (!openssl_sign($signingInput, $sig, (string)$sa['private_key'], OPENSSL_ALGO_SHA256)) return null;
        $jwt = $signingInput . '.' . $b64($sig);
        // 토큰 엔드포인트는 x-www-form-urlencoded 요구 → cURL 직접(httpPost 는 JSON 전제).
        $post = http_build_query(['grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer', 'assertion' => $jwt]);
        $ch = curl_init('https://oauth2.googleapis.com/token');
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true, CURLOPT_POST => true, CURLOPT_POSTFIELDS => $post,
            CURLOPT_HTTPHEADER => ['Content-Type: application/x-www-form-urlencoded'], CURLOPT_TIMEOUT => 20,
        ]);
        $resp = curl_exec($ch); $hc = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE); curl_close($ch);
        if ($hc >= 400 || !$resp) return null;
        $j = json_decode((string)$resp, true);
        $tok = is_array($j) ? (string)($j['access_token'] ?? '') : '';
        if ($tok === '') return null;
        $cache[$ck] = ['tok' => $tok, 'exp' => $now + (int)($j['expires_in'] ?? 3600)];
        return $tok;
    }

    /**
     * GA4 Data API(v1beta) runReport → web_analytics_metrics 정규화 행.
     *   자격증명: ga4 채널의 property_id + service_account_json(+선택 currency).
     *   차원: date·sessionDefaultChannelGroup·sessionSourceMedium. 지표 9종. graceful 드롭인.
     */
    private static function fetchGa4Rows(string $tenant, string $start, string $end): array
    {
        $propertyId = trim((string)(getenv('GA4_PROPERTY_ID') ?: self::loadCred($tenant, 'ga4', 'property_id')));
        $saJson     = (string)(getenv('GA4_SERVICE_ACCOUNT_JSON') ?: self::loadCred($tenant, 'ga4', 'service_account_json'));
        if ($propertyId === '' || $saJson === '') return ['hasCreds' => false, 'live' => false, 'rows' => []];
        $token = self::googleSaToken($saJson, 'https://www.googleapis.com/auth/analytics.readonly');
        if ($token === null) return ['hasCreds' => true, 'live' => false, 'error' => 'ga4 service-account token exchange failed'];
        $propertyId = preg_replace('/[^0-9]/', '', $propertyId); // 'properties/123' 또는 '123' 모두 허용
        $payload = [
            'dateRanges' => [['startDate' => $start, 'endDate' => $end]],
            'dimensions' => [['name' => 'date'], ['name' => 'sessionDefaultChannelGroup'], ['name' => 'sessionSourceMedium']],
            'metrics'    => array_map(fn($m) => ['name' => $m], [
                'sessions', 'totalUsers', 'newUsers', 'screenPageViews', 'conversions',
                'totalRevenue', 'engagedSessions', 'averageSessionDuration', 'bounceRate',
            ]),
            'limit' => 100000,
        ];
        [$code, $body, $err] = self::httpPost(
            "https://analyticsdata.googleapis.com/v1beta/properties/{$propertyId}:runReport",
            $payload, ['Authorization' => "Bearer {$token}", 'Content-Type' => 'application/json']);
        if ($err || $code >= 400) {
            $msg = is_array($body) ? (string)($body['error']['message'] ?? '') : '';
            return ['hasCreds' => true, 'live' => false, 'error' => $err ?: ("ga4 http $code" . ($msg ? ": $msg" : ''))];
        }
        $cur = strtoupper((string)(self::loadCred($tenant, 'ga4', 'currency') ?: 'KRW'));
        $rows = [];
        foreach ((array)($body['rows'] ?? []) as $row) {
            $dim = array_map(fn($d) => (string)($d['value'] ?? ''), (array)($row['dimensionValues'] ?? []));
            $met = array_map(fn($d) => (string)($d['value'] ?? '0'), (array)($row['metricValues'] ?? []));
            $rawDate = $dim[0] ?? '';
            if (!preg_match('/^\d{8}$/', $rawDate)) continue;
            $date = substr($rawDate, 0, 4) . '-' . substr($rawDate, 4, 2) . '-' . substr($rawDate, 6, 2);
            $rows[] = [
                'date' => $date,
                'channel_group' => $dim[1] ?? '',
                'source_medium' => ($dim[2] ?? '') !== '' ? $dim[2] : '(direct)',
                'sessions' => (int)round((float)($met[0] ?? 0)),
                'users' => (int)round((float)($met[1] ?? 0)),
                'new_users' => (int)round((float)($met[2] ?? 0)),
                'page_views' => (int)round((float)($met[3] ?? 0)),
                'conversions' => (int)round((float)($met[4] ?? 0)),
                'revenue' => (float)($met[5] ?? 0),
                'engaged_sessions' => (int)round((float)($met[6] ?? 0)),
                'avg_session_sec' => (float)($met[7] ?? 0),
                'bounce_rate' => (float)($met[8] ?? 0),
                'currency' => $cur,
            ];
        }
        return ['hasCreds' => true, 'live' => true, 'rows' => $rows];
    }

    /**
     * Adobe Analytics 2.0 Reporting API → web_analytics_metrics 정규화 행.
     *   인증: OAuth Server-to-Server(client_credentials) → IMS 토큰. 헤더 x-api-key/x-proxy-global-company-id.
     *   차원: variables/daterangeday(일자). 지표: visits·visitors·pageviews·orders·revenue·bouncerate. graceful.
     */
    private static function fetchAdobeAnalyticsRows(string $tenant, string $start, string $end): array
    {
        $companyId    = trim((string)(getenv('ADOBE_COMPANY_ID') ?: self::loadCred($tenant, 'adobe_analytics', 'company_id')));
        $clientId     = trim((string)(getenv('ADOBE_CLIENT_ID') ?: self::loadCred($tenant, 'adobe_analytics', 'client_id')));
        $clientSecret = (string)(getenv('ADOBE_CLIENT_SECRET') ?: self::loadCred($tenant, 'adobe_analytics', 'client_secret'));
        $rsid         = trim((string)(getenv('ADOBE_REPORT_SUITE_ID') ?: self::loadCred($tenant, 'adobe_analytics', 'report_suite_id')));
        if ($companyId === '' || $clientId === '' || $clientSecret === '' || $rsid === '') {
            return ['hasCreds' => false, 'live' => false, 'rows' => []];
        }
        // 1) IMS 토큰(client_credentials).
        $imsPost = http_build_query([
            'grant_type' => 'client_credentials', 'client_id' => $clientId, 'client_secret' => $clientSecret,
            'scope' => 'openid,AdobeID,additional_info.projectedProductContext',
        ]);
        $ch = curl_init('https://ims-na1.adobelogin.com/ims/token/v3');
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true, CURLOPT_POST => true, CURLOPT_POSTFIELDS => $imsPost,
            CURLOPT_HTTPHEADER => ['Content-Type: application/x-www-form-urlencoded'], CURLOPT_TIMEOUT => 20,
        ]);
        $resp = curl_exec($ch); $hc = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE); curl_close($ch);
        if ($hc >= 400 || !$resp) return ['hasCreds' => true, 'live' => false, 'error' => "adobe ims token http $hc"];
        $tok = (string)(json_decode((string)$resp, true)['access_token'] ?? '');
        if ($tok === '') return ['hasCreds' => true, 'live' => false, 'error' => 'adobe ims token empty'];
        // 2) 리포트(일자 차원 × 지표 6종).
        $metricIds = ['metrics/visits', 'metrics/visitors', 'metrics/pageviews', 'metrics/orders', 'metrics/revenue', 'metrics/bouncerate'];
        $payload = [
            'rsid' => $rsid,
            'globalFilters' => [['type' => 'dateRange', 'dateRange' => $start . 'T00:00:00.000/' . $end . 'T23:59:59.999']],
            'metricContainer' => ['metrics' => array_map(fn($i, $id) => ['columnId' => (string)$i, 'id' => $id], array_keys($metricIds), $metricIds)],
            'dimension' => 'variables/daterangeday',
            'settings' => ['limit' => 400, 'page' => 0, 'dimensionSort' => 'asc'],
        ];
        [$code, $body, $err] = self::httpPost("https://analytics.adobe.io/api/{$companyId}/reports", $payload, [
            'Authorization' => "Bearer {$tok}", 'x-api-key' => $clientId, 'x-proxy-global-company-id' => $companyId,
            'Content-Type' => 'application/json',
        ]);
        if ($err || $code >= 400) {
            $msg = is_array($body) ? (string)($body['message'] ?? '') : '';
            return ['hasCreds' => true, 'live' => false, 'error' => $err ?: ("adobe http $code" . ($msg ? ": $msg" : ''))];
        }
        $cur = strtoupper((string)(self::loadCred($tenant, 'adobe_analytics', 'currency') ?: 'KRW'));
        $rows = [];
        foreach ((array)($body['rows'] ?? []) as $row) {
            // daterangeday value 는 'Jun 1, 2024' 또는 ISO. value 우선 → 정규화.
            $date = self::normAdobeDate((string)($row['value'] ?? ''));
            if ($date === '') continue;
            $d = array_map('floatval', (array)($row['data'] ?? []));
            $rows[] = [
                'date' => $date, 'source_medium' => 'adobe / all', 'channel_group' => 'Adobe Analytics',
                'sessions' => (int)round($d[0] ?? 0), 'users' => (int)round($d[1] ?? 0),
                'page_views' => (int)round($d[2] ?? 0), 'conversions' => (int)round($d[3] ?? 0),
                'revenue' => (float)($d[4] ?? 0), 'bounce_rate' => (float)($d[5] ?? 0),
                'currency' => $cur,
            ];
        }
        return ['hasCreds' => true, 'live' => true, 'rows' => $rows];
    }

    /** Adobe daterangeday value → YYYY-MM-DD(여러 표기 graceful). 실패 시 빈 문자열. */
    private static function normAdobeDate(string $v): string
    {
        $v = trim($v);
        if ($v === '') return '';
        if (preg_match('/^\d{4}-\d{2}-\d{2}/', $v)) return substr($v, 0, 10);
        $ts = strtotime($v);
        return $ts ? gmdate('Y-m-d', $ts) : '';
    }

    /** 자격증명 저장 직후 웹 분석 1회 동기화(광고 syncAdChannelOnSave 대칭). 데모/익명 skip. */
    public static function syncAnalyticsOnSave(string $tenant, string $source): array
    {
        $source = strtolower(trim($source));
        if (!self::isAnalyticsSource($source) || $tenant === '' || $tenant === 'demo') return ['skipped' => true];
        try {
            $end = date('Y-m-d'); $start = date('Y-m-d', strtotime('-28 days'));
            return self::runSync($tenant, $start, $end, [$source]);
        } catch (\Throwable $e) {
            return ['error' => substr($e->getMessage(), 0, 120)];
        }
    }

    /** 웹 분석 자격증명 보유 테넌트 목록 — analytics_sync_cron 팬아웃용. */
    public static function tenantsWithAnalyticsCreds(): array
    {
        $out = [];
        try {
            // [현 차수 기반강화] 레지스트리 병합 소스로 cron 팬아웃 — admin 이 ChannelRegistry 로 추가한 analytics
            //   채널도 정기 cron 자가치유에 자동 편입(기존 const-only 는 즉시sync 만 인식하던 비대칭 해소).
            $srcs = self::analyticsSources();
            $in = implode(',', array_fill(0, count($srcs), '?'));
            $st = Db::pdo()->prepare("SELECT DISTINCT tenant_id FROM channel_credential WHERE channel IN ($in) AND is_active=1");
            $st->execute($srcs);
            foreach ($st->fetchAll(PDO::FETCH_COLUMN) as $t) { $t = (string)$t; if ($t !== '' && $t !== 'demo') $out[] = $t; }
        } catch (\Throwable $e) { /* graceful */ }
        return array_values(array_unique($out));
    }

    /* ════════════════════════ [현 차수] SNS 라이브 채널 통계 동기화 ════════════════════════
     *   YouTube/Instagram/Facebook/Twitch = 라이브 커머스 멀티송출 채널. 등록한 키로 채널 통계(구독자/조회수/
     *   팔로워/영상수)를 수집해 sns_channel_stats 적재 → "동기화됨" 표기(송출 대상이자 채널 도달 분석 소스).
     *   각 채널 graceful(키 부재/오류 시 honest). Twitch 팔로워는 브로드캐스터 OAuth 스코프 필요 → honest pending. */
    public const SNS_LIVE_SOURCES = ['youtube', 'instagram', 'facebook', 'twitch'];

    public static function isSnsLiveChannel(string $channelKey): bool
    {
        return in_array(strtolower(trim($channelKey)), self::SNS_LIVE_SOURCES, true);
    }

    private static function ensureSnsStatsTable(PDO $pdo): void
    {
        $isMy = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'mysql';
        try {
            if ($isMy) {
                $pdo->exec("CREATE TABLE IF NOT EXISTS sns_channel_stats (
                    id INT AUTO_INCREMENT PRIMARY KEY, tenant_id VARCHAR(100) NOT NULL, channel VARCHAR(40) NOT NULL,
                    ext_id VARCHAR(190), title VARCHAR(255), followers BIGINT DEFAULT 0, views BIGINT DEFAULT 0,
                    items BIGINT DEFAULT 0, live_now INT DEFAULT 0, synced_at VARCHAR(32),
                    UNIQUE KEY uq_sns (tenant_id, channel)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
            } else {
                $pdo->exec("CREATE TABLE IF NOT EXISTS sns_channel_stats (id INTEGER PRIMARY KEY AUTOINCREMENT, tenant_id TEXT NOT NULL, channel TEXT NOT NULL, ext_id TEXT, title TEXT, followers INTEGER DEFAULT 0, views INTEGER DEFAULT 0, items INTEGER DEFAULT 0, live_now INTEGER DEFAULT 0, synced_at TEXT)");
                $pdo->exec("CREATE UNIQUE INDEX IF NOT EXISTS uq_sns ON sns_channel_stats(tenant_id, channel)");
            }
        } catch (\Throwable $e) {}
    }

    /** YouTube 채널 통계(YouTube Data API v3 · api_key + channel_id). 공개 통계는 API 키로 충분.
     *   ★다형식 해석 — 사용자가 UC… ID / @핸들 / 채널 URL / 커스텀 username 어느 것을 넣어도 동작(흔한 입력 혼동 흡수). */
    private static function fetchYoutubeStats(string $tenant): array
    {
        $apiKey = self::loadCred($tenant, 'youtube', 'api_key');
        $chId   = trim(self::loadCred($tenant, 'youtube', 'channel_id'));
        if ($apiKey === '' || $chId === '') return ['hasCreds' => false];
        $base = 'https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&key=' . urlencode($apiKey) . '&';
        // 입력 형식 → 우선 시도 파라미터 후보(순차 폴백). UC… ID > URL의 UC추출 > @핸들 > username.
        $params = [];
        if (preg_match('#channel/(UC[\w-]{20,})#', $chId, $m)) $params[] = 'id=' . urlencode($m[1]);          // 채널 URL
        if (strncmp($chId, 'UC', 2) === 0 && strlen($chId) >= 20) $params[] = 'id=' . urlencode($chId);        // UC… ID
        if (preg_match('/@([A-Za-z0-9._\-가-힣]+)/u', $chId, $hm)) $params[] = 'forHandle=' . urlencode('@' . $hm[1]); // @핸들
        if (strncmp($chId, 'UC', 2) !== 0 && strpos($chId, '@') === false) {                                   // 커스텀명/핸들 미상
            $params[] = 'forUsername=' . urlencode($chId);
            $params[] = 'forHandle=' . urlencode('@' . ltrim($chId, '@'));
        }
        if (!$params) $params[] = 'id=' . urlencode($chId);
        $lastErr = '';
        foreach (array_values(array_unique($params)) as $p) {
            [$code, $body, $err] = self::httpGet($base . $p);
            if ($err || $code >= 400) { $lastErr = $err ?: "youtube http $code"; continue; }
            $it = $body['items'][0] ?? null;
            if (!$it) { $lastErr = 'channel not found'; continue; }
            $s = (array)($it['statistics'] ?? []);
            return ['hasCreds' => true, 'live' => true, 'ext_id' => (string)($it['id'] ?? $chId), 'title' => (string)($it['snippet']['title'] ?? ''),
                'followers' => (int)($s['subscriberCount'] ?? 0), 'views' => (int)($s['viewCount'] ?? 0), 'items' => (int)($s['videoCount'] ?? 0), 'live_now' => 0];
        }
        return ['hasCreds' => true, 'live' => false, 'error' => ($lastErr ?: 'channel not found') . ' — 채널 ID(UC…)·@핸들·채널 URL 중 하나를 정확히 입력하세요'];
    }

    /** Instagram 비즈니스 계정 통계(Graph API · access_token + ig_user_id). */
    private static function fetchInstagramStats(string $tenant): array
    {
        $token = self::loadCred($tenant, 'instagram', 'access_token');
        $uid   = self::loadCred($tenant, 'instagram', 'ig_user_id');
        if ($token === '' || $uid === '') return ['hasCreds' => false];
        $url = 'https://graph.facebook.com/v19.0/' . urlencode($uid) . '?fields=username,followers_count,media_count&access_token=' . urlencode($token);
        [$code, $body, $err] = self::httpGet($url);
        if ($err || $code >= 400) return ['hasCreds' => true, 'live' => false, 'error' => $err ?: "instagram http $code"];
        return ['hasCreds' => true, 'live' => true, 'ext_id' => $uid, 'title' => (string)($body['username'] ?? ''),
            'followers' => (int)($body['followers_count'] ?? 0), 'views' => 0, 'items' => (int)($body['media_count'] ?? 0), 'live_now' => 0];
    }

    /** Facebook 페이지 통계(Graph API · access_token + page_id). */
    private static function fetchFacebookStats(string $tenant): array
    {
        $token  = self::loadCred($tenant, 'facebook', 'access_token');
        $pageId = self::loadCred($tenant, 'facebook', 'page_id');
        if ($token === '' || $pageId === '') return ['hasCreds' => false];
        $url = 'https://graph.facebook.com/v19.0/' . urlencode($pageId) . '?fields=name,fan_count,followers_count&access_token=' . urlencode($token);
        [$code, $body, $err] = self::httpGet($url);
        if ($err || $code >= 400) return ['hasCreds' => true, 'live' => false, 'error' => $err ?: "facebook http $code"];
        return ['hasCreds' => true, 'live' => true, 'ext_id' => $pageId, 'title' => (string)($body['name'] ?? ''),
            'followers' => (int)($body['followers_count'] ?? ($body['fan_count'] ?? 0)), 'views' => 0, 'items' => 0, 'live_now' => 0];
    }

    /** Twitch 채널 통계(Helix · client_id+client_secret app 토큰 + login). 라이브 동시시청자 포함.
     *   ★팔로워수는 user OAuth(moderator:read:followers) 필요 → app 토큰으론 0(honest). 채널명/라이브/시청자는 수집. */
    private static function fetchTwitchStats(string $tenant): array
    {
        $cid    = self::loadCred($tenant, 'twitch', 'client_id');
        $secret = self::loadCred($tenant, 'twitch', 'client_secret');
        $login  = ltrim(trim(self::loadCred($tenant, 'twitch', 'login')), '@');
        if ($cid === '' || $secret === '') return ['hasCreds' => false];
        if ($login === '') return ['hasCreds' => true, 'live' => false, 'error' => 'Twitch 채널 로그인명(login) 미등록 — 조회 대상 채널 지정 필요'];
        // 1) app access token(client_credentials)
        [$tc, $tb] = self::httpPost('https://id.twitch.tv/oauth2/token',
            ['client_id' => $cid, 'client_secret' => $secret, 'grant_type' => 'client_credentials'],
            ['Content-Type' => 'application/x-www-form-urlencoded']);
        $token = (string)($tb['access_token'] ?? '');
        if ($token === '') return ['hasCreds' => true, 'live' => false, 'error' => "twitch token http $tc (client_id/secret 확인)"];
        $hdr = ['Authorization' => 'Bearer ' . $token, 'Client-Id' => $cid];
        // 2) 사용자 정보(broadcaster id + display name)
        [$uc, $ub, $ue] = self::httpGet('https://api.twitch.tv/helix/users?login=' . urlencode($login), $hdr);
        $u = $ub['data'][0] ?? null;
        if (!$u) return ['hasCreds' => true, 'live' => false, 'error' => ($ue ?: "twitch users http $uc") . ' — 채널 로그인명 확인'];
        $bid = (string)($u['id'] ?? '');
        // 3) 라이브 여부 + 동시시청자(streams)
        $liveNow = 0;
        [$sc, $sb] = self::httpGet('https://api.twitch.tv/helix/streams?user_id=' . urlencode($bid), $hdr);
        if (($stream = $sb['data'][0] ?? null)) $liveNow = (int)($stream['viewer_count'] ?? 0);
        return ['hasCreds' => true, 'live' => true, 'ext_id' => $bid, 'title' => (string)($u['display_name'] ?? $login),
            'followers' => 0, 'views' => 0, 'items' => 0, 'live_now' => $liveNow]; // 팔로워는 user OAuth 필요(honest 0)
    }

    private static function persistSnsStats(string $tenant, string $channel, array $r): void
    {
        $pdo = Db::pdo(); self::ensureSnsStatsTable($pdo);
        $isMy = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'mysql';
        $now = gmdate('Y-m-d\TH:i:s\Z');
        $sql = $isMy
            ? "INSERT INTO sns_channel_stats (tenant_id,channel,ext_id,title,followers,views,items,live_now,synced_at) VALUES (?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE ext_id=VALUES(ext_id),title=VALUES(title),followers=VALUES(followers),views=VALUES(views),items=VALUES(items),live_now=VALUES(live_now),synced_at=VALUES(synced_at)"
            : "INSERT INTO sns_channel_stats (tenant_id,channel,ext_id,title,followers,views,items,live_now,synced_at) VALUES (?,?,?,?,?,?,?,?,?) ON CONFLICT(tenant_id,channel) DO UPDATE SET ext_id=excluded.ext_id,title=excluded.title,followers=excluded.followers,views=excluded.views,items=excluded.items,live_now=excluded.live_now,synced_at=excluded.synced_at";
        try { $pdo->prepare($sql)->execute([$tenant, $channel, (string)($r['ext_id'] ?? ''), (string)($r['title'] ?? ''), (int)($r['followers'] ?? 0), (int)($r['views'] ?? 0), (int)($r['items'] ?? 0), (int)($r['live_now'] ?? 0), $now]); } catch (\Throwable $e) {}
    }

    /** 자격증명 등록 즉시 SNS 라이브 채널 통계 동기화(ad/commerce/pg/물류/리뷰와 대칭). */
    public static function syncSnsLiveOnSave(string $tenant, string $channel): array
    {
        $channel = strtolower(trim($channel));
        if (!self::isSnsLiveChannel($channel) || $tenant === '' || $tenant === 'demo') return ['skipped' => true];
        try {
            $r = match ($channel) {
                'youtube'   => self::fetchYoutubeStats($tenant),
                'instagram' => self::fetchInstagramStats($tenant),
                'facebook'  => self::fetchFacebookStats($tenant),
                'twitch'    => self::fetchTwitchStats($tenant),
                default     => ['skipped' => true],
            };
            if (!empty($r['live'])) {
                self::persistSnsStats($tenant, $channel, $r);
                return ['synced' => true, 'channel' => $channel, 'title' => $r['title'] ?? '', 'followers' => $r['followers'] ?? 0];
            }
            return $r;
        } catch (\Throwable $e) { return ['error' => substr($e->getMessage(), 0, 120)]; }
    }

    /** 테넌트 전 SNS 라이브 채널 동기화(cron 팬아웃). */
    public static function syncSnsLiveForTenant(string $tenant): array
    {
        $out = [];
        foreach (self::SNS_LIVE_SOURCES as $ch) { $out[$ch] = self::syncSnsLiveOnSave($tenant, $ch); }
        return $out;
    }

    /** SNS 라이브 자격증명 보유 테넌트 목록 — cron 팬아웃용. */
    public static function tenantsWithSnsLiveCreds(): array
    {
        $out = [];
        try {
            $in = implode(',', array_fill(0, count(self::SNS_LIVE_SOURCES), '?'));
            $st = Db::pdo()->prepare("SELECT DISTINCT tenant_id FROM channel_credential WHERE channel IN ($in) AND is_active=1");
            $st->execute(self::SNS_LIVE_SOURCES);
            foreach ($st->fetchAll(PDO::FETCH_COLUMN) as $t) { $t = (string)$t; if ($t !== '' && $t !== 'demo') $out[] = $t; }
        } catch (\Throwable $e) {}
        return array_values(array_unique($out));
    }

    /** GET /v426/sns-live/stats — 본 테넌트 SNS 라이브 채널 통계(동기화 결과). */
    public static function snsLiveStats(Request $request, Response $response, array $args): Response
    {
        $tenant = self::authTenant($request);
        $rows = [];
        if ($tenant !== '' && $tenant !== 'demo') {
            try {
                $st = Db::pdo()->prepare("SELECT channel,ext_id,title,followers,views,items,live_now,synced_at FROM sns_channel_stats WHERE tenant_id=? ORDER BY channel");
                $st->execute([$tenant]);
                $rows = $st->fetchAll(PDO::FETCH_ASSOC) ?: [];
            } catch (\Throwable $e) { $rows = []; }
        }
        $response->getBody()->write(json_encode(['ok' => true, 'channels' => $rows], JSON_UNESCAPED_UNICODE));
        return $response->withHeader('Content-Type', 'application/json');
    }

    /**
     * GET /v426/analytics/web — 웹 분석 집계(채널그룹·소스미디엄·일자 추이). BI 깊이 표면화.
     *   Query: source(ga4/adobe_analytics/all), start_date, end_date, group_by(channel|source_medium|date).
     *   실DB 파생(날조 0). 자격증명 미등록·미동기화 시 빈 결과(정직).
     */
    public static function webAnalytics(Request $request, Response $response, array $args): Response
    {
        $tenant = self::authTenant($request);
        $q = $request->getQueryParams();
        $source = strtolower((string)($q['source'] ?? 'all'));
        $start = (string)($q['start_date'] ?? date('Y-m-d', strtotime('-28 days')));
        $end   = (string)($q['end_date'] ?? date('Y-m-d'));
        $groupBy = in_array(($q['group_by'] ?? ''), ['channel', 'source_medium', 'date'], true) ? $q['group_by'] : 'channel';
        $out = ['ok' => true, 'source' => $source, 'window' => compact('start', 'end'), 'group_by' => $groupBy, 'rows' => [], 'totals' => []];
        try {
            $pdo = Db::pdo(); self::ensureAnalyticsTable($pdo);
            $col = $groupBy === 'channel' ? 'channel_group' : ($groupBy === 'date' ? 'date' : 'source_medium');
            $where = 'tenant_id=? AND date BETWEEN ? AND ?';
            $params = [$tenant, $start, $end];
            if ($source !== 'all' && $source !== '') { $where .= ' AND source=?'; $params[] = $source; }
            $sql = "SELECT {$col} AS grp,
                    SUM(sessions) AS sessions, SUM(users) AS users, SUM(new_users) AS new_users,
                    SUM(page_views) AS page_views, SUM(conversions) AS conversions, SUM(revenue) AS revenue,
                    SUM(engaged_sessions) AS engaged_sessions,
                    AVG(NULLIF(bounce_rate,0)) AS bounce_rate, AVG(NULLIF(avg_session_sec,0)) AS avg_session_sec
                    FROM web_analytics_metrics WHERE {$where} GROUP BY {$col} ORDER BY sessions DESC";
            $st = $pdo->prepare($sql); $st->execute($params);
            $rows = $st->fetchAll(PDO::FETCH_ASSOC) ?: [];
            $tot = ['sessions' => 0, 'users' => 0, 'new_users' => 0, 'page_views' => 0, 'conversions' => 0, 'revenue' => 0.0];
            foreach ($rows as &$r) {
                foreach (['sessions', 'users', 'new_users', 'page_views', 'conversions'] as $k) { $r[$k] = (int)$r[$k]; $tot[$k] += $r[$k]; }
                $r['revenue'] = (float)$r['revenue']; $tot['revenue'] += $r['revenue'];
                $r['engaged_sessions'] = (int)$r['engaged_sessions'];
                // [현 차수 감사] bounce_rate 세션 가중 산출 — AVG(bounce_rate)(일자 비가중평균) 대신 1−참여세션/세션
                //   (ratio-of-sums). engaged_sessions/sessions 둘 다 SUM이라 정확. 참여세션 미적재(0) 시 쿼리 AVG 폴백.
                $r['bounce_rate'] = ($r['engaged_sessions'] > 0 && $r['sessions'] > 0)
                    ? round(max(0.0, 1 - $r['engaged_sessions'] / $r['sessions']), 4)
                    : round((float)$r['bounce_rate'], 4);
                $r['avg_session_sec'] = round((float)$r['avg_session_sec'], 1); // 가중 산출은 total_session_sec 컬럼 필요 → AVG 유지(근사)
                $r['conv_rate'] = $r['sessions'] > 0 ? round($r['conversions'] / $r['sessions'], 4) : 0;
            }
            unset($r);
            $out['rows'] = $rows;
            $out['totals'] = $tot;
        } catch (\Throwable $e) { /* graceful — 빈 결과 */ }
        $response->getBody()->write(json_encode($out, JSON_UNESCAPED_UNICODE));
        return $response->withHeader('Content-Type', 'application/json');
    }

    // ════════════════════════════════════════════════════════════════════════════
    //  [P1 커넥터 폭] 고객지원(CS/헬프데스크) 인바운드 — Zendesk · Intercom · Freshdesk · Gorgias
    //  ─────────────────────────────────────────────────────────────────────────
    //  cs_metrics(별도 테이블)로 적재 — 티켓 생성/해결/미해결·CSAT·첫응답/해결 소요(분).
    //  광고/커머스/분석과 분리(이중계산·오분류 차단). 윈도우 스냅샷(date=end) 1행/소스/동기화.
    //  자격증명 미등록 시 skip(정직), 등록 즉시 fetch(graceful 드롭인).
    // ════════════════════════════════════════════════════════════════════════════

    /** CS 데이터소스 SSOT. */
    public const CS_SOURCES = ['zendesk', 'intercom', 'freshdesk', 'gorgias'];

    public static function isCsSource(string $channelKey): bool
    {
        return in_array(strtolower(trim($channelKey)), self::csSources(), true); // [현 차수 감사 P2] 레지스트리 병합(즉시sync 대칭)
    }

    /** 동기화 대상 CS 소스 전체(레지스트리 sync_kind='cs' 병합). cron 팬아웃 SSOT. */
    public static function csSources(): array
    {
        return array_values(array_unique(array_merge(self::CS_SOURCES, self::registryChannels('cs'))));
    }

    /** cs_metrics 테이블 보장(MySQL/SQLite). (tenant,source,date) 멱등 단위. */
    private static function ensureCsTable(PDO $pdo): void
    {
        $isMy = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'mysql';
        try {
            if ($isMy) {
                $pdo->exec("CREATE TABLE IF NOT EXISTS cs_metrics (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    tenant_id VARCHAR(100) NOT NULL, source VARCHAR(40) NOT NULL, date VARCHAR(10) NOT NULL,
                    tickets_created INT DEFAULT 0, tickets_solved INT DEFAULT 0, open_tickets INT DEFAULT 0,
                    csat DOUBLE DEFAULT 0, avg_first_reply_min DOUBLE DEFAULT 0, avg_resolution_min DOUBLE DEFAULT 0,
                    extra_json TEXT, updated_at VARCHAR(32),
                    UNIQUE KEY uq_cs (tenant_id, source, date), KEY idx_cs_ts (tenant_id, source, date)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
            } else {
                $pdo->exec("CREATE TABLE IF NOT EXISTS cs_metrics (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    tenant_id TEXT NOT NULL, source TEXT NOT NULL, date TEXT NOT NULL,
                    tickets_created INTEGER DEFAULT 0, tickets_solved INTEGER DEFAULT 0, open_tickets INTEGER DEFAULT 0,
                    csat REAL DEFAULT 0, avg_first_reply_min REAL DEFAULT 0, avg_resolution_min REAL DEFAULT 0,
                    extra_json TEXT, updated_at TEXT)");
                try { $pdo->exec("CREATE UNIQUE INDEX IF NOT EXISTS uq_cs ON cs_metrics(tenant_id,source,date)"); } catch (\Throwable $e) {}
            }
        } catch (\Throwable $e) { /* graceful */ }
    }

    /** CS 행 멱등 적재: (tenant,source,date∈[start,end]) 삭제 후 삽입. */
    private static function persistCsRows(PDO $pdo, string $tenant, string $source, array $rows, string $start, string $end): int
    {
        self::ensureCsTable($pdo);
        $source = strtolower($source);
        $del = $pdo->prepare('DELETE FROM cs_metrics WHERE tenant_id=? AND source=? AND date BETWEEN ? AND ?');
        $del->execute([$tenant, $source, $start, $end]);
        if (!$rows) return 0;
        $ins = $pdo->prepare('INSERT INTO cs_metrics
            (tenant_id,source,date,tickets_created,tickets_solved,open_tickets,csat,avg_first_reply_min,avg_resolution_min,extra_json,updated_at)
            VALUES (?,?,?,?,?,?,?,?,?,?,?)');
        $now = gmdate('c'); $n = 0;
        foreach ($rows as $r) {
            $date = (string)($r['date'] ?? '');
            if ($date === '' || $date < $start || $date > $end) continue;
            $ins->execute([
                $tenant, $source, $date,
                (int)($r['tickets_created'] ?? 0), (int)($r['tickets_solved'] ?? 0), (int)($r['open_tickets'] ?? 0),
                (float)($r['csat'] ?? 0), (float)($r['avg_first_reply_min'] ?? 0), (float)($r['avg_resolution_min'] ?? 0),
                isset($r['extra']) ? json_encode($r['extra'], JSON_UNESCAPED_UNICODE) : null, $now,
            ]);
            $n++;
        }
        return $n;
    }

    /** Basic 인증 헤더 값(base64). */
    private static function basicAuth(string $user, string $pass): string
    {
        return 'Basic ' . base64_encode($user . ':' . $pass);
    }

    /**
     * Zendesk Support API — 티켓 생성/해결/미해결(search/count) + CSAT(satisfaction_ratings).
     *   자격증명: zendesk 채널의 subdomain + email + api_token. 인증=Basic(email/token:api_token).
     */
    private static function fetchZendeskCs(string $tenant, string $start, string $end): array
    {
        $sub   = trim((string)self::loadCred($tenant, 'zendesk', 'subdomain'));
        $email = trim((string)self::loadCred($tenant, 'zendesk', 'email'));
        $token = (string)self::loadCred($tenant, 'zendesk', 'api_token');
        if ($sub === '' || $email === '' || $token === '') return ['hasCreds' => false, 'live' => false, 'rows' => []];
        $base = 'https://' . rawurlencode($sub) . '.zendesk.com/api/v2';
        $auth = self::basicAuth($email . '/token', $token);
        $h = ['Authorization' => $auth];
        $countQ = function (string $query) use ($base, $h): int {
            [$code, $body] = self::httpGet($base . '/search/count.json?query=' . rawurlencode($query), $h);
            return ($code >= 200 && $code < 300) ? (int)($body['count'] ?? 0) : 0;
        };
        // 첫 호출로 라이브 여부 판정(인증 실패 시 graceful error).
        [$c0, $b0, $e0] = self::httpGet($base . '/search/count.json?query=' . rawurlencode('type:ticket created>=' . $start), $h);
        if ($e0 || $c0 >= 400) return ['hasCreds' => true, 'live' => false, 'error' => $e0 ?: "zendesk http $c0"];
        $created = (int)($b0['count'] ?? 0);
        $solved  = $countQ('type:ticket solved>=' . $start);
        $open    = $countQ('type:ticket status<solved');
        // CSAT: 최근 좋음/나쁨 비율(satisfaction_ratings).
        $csat = 0.0;
        [$cc, $cb] = self::httpGet($base . '/satisfaction_ratings.json?score=received&sort_order=desc', $h);
        if ($cc >= 200 && $cc < 300) {
            $good = 0; $bad = 0;
            foreach ((array)($cb['satisfaction_ratings'] ?? []) as $sr) {
                $s = (string)($sr['score'] ?? '');
                if ($s === 'good' || $s === 'goodwithcomment') $good++;
                elseif ($s === 'bad' || $s === 'badwithcomment') $bad++;
            }
            if ($good + $bad > 0) $csat = round($good / ($good + $bad) * 100, 1);
        }
        return ['hasCreds' => true, 'live' => true, 'rows' => [[
            'date' => $end, 'tickets_created' => $created, 'tickets_solved' => $solved,
            'open_tickets' => $open, 'csat' => $csat,
        ]]];
    }

    /**
     * Intercom API — 대화 생성/종료/오픈(search) + CSAT(conversation_rating).
     *   자격증명: intercom 채널의 access_token. 인증=Bearer + Intercom-Version 헤더.
     */
    private static function fetchIntercomCs(string $tenant, string $start, string $end): array
    {
        $token = (string)self::loadCred($tenant, 'intercom', 'access_token');
        if ($token === '') return ['hasCreds' => false, 'live' => false, 'rows' => []];
        $h = ['Authorization' => "Bearer {$token}", 'Intercom-Version' => '2.11', 'Content-Type' => 'application/json'];
        $startTs = (int)strtotime($start . ' 00:00:00');
        $search = function (array $query) use ($h): array {
            return self::httpPost('https://api.intercom.io/conversations/search', ['query' => $query], $h);
        };
        $totalOf = function ($body): int {
            if (!is_array($body)) return 0;
            return (int)($body['total_count'] ?? count((array)($body['conversations'] ?? [])));
        };
        [$c0, $b0, $e0] = $search(['field' => 'created_at', 'operator' => '>', 'value' => $startTs]);
        if ($e0 || $c0 >= 400) return ['hasCreds' => true, 'live' => false, 'error' => $e0 ?: "intercom http $c0"];
        $created = $totalOf($b0);
        [, $bOpen] = $search(['field' => 'state', 'operator' => '=', 'value' => 'open']); // open conversations
        $open = is_array($bOpen) ? (int)($bOpen['total_count'] ?? count((array)($bOpen['conversations'] ?? []))) : 0;
        [, $bClosed] = $search(['operator' => 'AND', 'value' => [
            ['field' => 'state', 'operator' => '=', 'value' => 'closed'],
            ['field' => 'updated_at', 'operator' => '>', 'value' => $startTs],
        ]]);
        $solved = is_array($bClosed) ? (int)($bClosed['total_count'] ?? count((array)($bClosed['conversations'] ?? []))) : 0;
        return ['hasCreds' => true, 'live' => true, 'rows' => [[
            'date' => $end, 'tickets_created' => $created, 'tickets_solved' => $solved, 'open_tickets' => $open,
        ]]];
    }

    /**
     * Freshdesk API — 티켓 생성/미해결(filter). 자격증명: freshdesk 채널의 domain + api_key. 인증=Basic(api_key:X).
     */
    private static function fetchFreshdeskCs(string $tenant, string $start, string $end): array
    {
        $domain = trim((string)self::loadCred($tenant, 'freshdesk', 'domain'));
        $apiKey = (string)self::loadCred($tenant, 'freshdesk', 'api_key');
        if ($domain === '' || $apiKey === '') return ['hasCreds' => false, 'live' => false, 'rows' => []];
        $domain = preg_replace('#https?://#', '', $domain);
        if (strpos($domain, '.') === false) $domain .= '.freshdesk.com';
        $base = 'https://' . $domain . '/api/v2';
        $h = ['Authorization' => self::basicAuth($apiKey, 'X'), 'Content-Type' => 'application/json'];
        $countQ = function (string $q) use ($base, $h): int {
            [$code, $body] = self::httpGet($base . '/search/tickets?query=' . rawurlencode('"' . $q . '"'), $h);
            return ($code >= 200 && $code < 300) ? (int)($body['total'] ?? 0) : 0;
        };
        [$c0, $b0, $e0] = self::httpGet($base . '/search/tickets?query=' . rawurlencode('"created_at:>\'' . $start . '\'"'), $h);
        if ($e0 || $c0 >= 400) return ['hasCreds' => true, 'live' => false, 'error' => $e0 ?: "freshdesk http $c0"];
        $created = (int)($b0['total'] ?? 0);
        $open    = $countQ('status:2'); // 2=Open
        $solved  = $countQ('status:4'); // 4=Resolved
        return ['hasCreds' => true, 'live' => true, 'rows' => [[
            'date' => $end, 'tickets_created' => $created, 'tickets_solved' => $solved, 'open_tickets' => $open,
        ]]];
    }

    /**
     * Gorgias API — 티켓 통계(statistics) / 티켓 목록. 자격증명: gorgias 채널의 domain + username + api_key. 인증=Basic.
     */
    private static function fetchGorgiasCs(string $tenant, string $start, string $end): array
    {
        $domain = trim((string)self::loadCred($tenant, 'gorgias', 'domain'));
        $user   = trim((string)self::loadCred($tenant, 'gorgias', 'username'));
        $apiKey = (string)self::loadCred($tenant, 'gorgias', 'api_key');
        if ($domain === '' || $user === '' || $apiKey === '') return ['hasCreds' => false, 'live' => false, 'rows' => []];
        $domain = preg_replace('#https?://#', '', $domain);
        if (strpos($domain, '.') === false) $domain .= '.gorgias.com';
        $base = 'https://' . $domain . '/api';
        $h = ['Authorization' => self::basicAuth($user, $apiKey)];
        // 오픈 티켓 목록(메타 totals) — 라이브 판정 + open_tickets.
        [$c0, $b0, $e0] = self::httpGet($base . '/tickets?limit=1&order_by=created_datetime:desc&filters=' . rawurlencode('status:open'), $h);
        if ($e0 || $c0 >= 400) return ['hasCreds' => true, 'live' => false, 'error' => $e0 ?: "gorgias http $c0"];
        $open = (int)($b0['meta']['total_count'] ?? count((array)($b0['data'] ?? [])));
        [$cc, $cb] = self::httpGet($base . '/tickets?limit=1&filters=' . rawurlencode('created_datetime:>=' . $start), $h);
        $created = ($cc >= 200 && $cc < 300) ? (int)($cb['meta']['total_count'] ?? 0) : 0;
        [$sc, $sb] = self::httpGet($base . '/tickets?limit=1&filters=' . rawurlencode('status:closed,closed_datetime:>=' . $start), $h);
        $solved = ($sc >= 200 && $sc < 300) ? (int)($sb['meta']['total_count'] ?? 0) : 0;
        return ['hasCreds' => true, 'live' => true, 'rows' => [[
            'date' => $end, 'tickets_created' => $created, 'tickets_solved' => $solved, 'open_tickets' => $open,
        ]]];
    }

    /** CS 동기화 코어 — HTTP/cron 공용. 소스별 fetch → cs_metrics 멱등 적재. */
    public static function runCsSync(string $tenant, string $start, string $end, array $wantSet): array
    {
        $pdo = Db::pdo();
        $summary = []; $total = 0;
        $fetchers = [
            'zendesk'   => fn() => self::fetchZendeskCs($tenant, $start, $end),
            'intercom'  => fn() => self::fetchIntercomCs($tenant, $start, $end),
            'freshdesk' => fn() => self::fetchFreshdeskCs($tenant, $start, $end),
            'gorgias'   => fn() => self::fetchGorgiasCs($tenant, $start, $end),
        ];
        foreach ($fetchers as $src => $fn) {
            if (!in_array($src, $wantSet, true)) continue;
            try { $res = $fn(); }
            catch (\Throwable $e) { $summary[$src] = ['status' => 'error', 'error' => substr($e->getMessage(), 0, 120)]; continue; }
            if (empty($res['hasCreds'])) { $summary[$src] = ['status' => 'skipped', 'reason' => 'no_credentials']; continue; }
            if (empty($res['live']))     { $summary[$src] = ['status' => 'error', 'error' => $res['error'] ?? 'fetch_failed']; continue; }
            $persisted = self::persistCsRows($pdo, $tenant, $src, $res['rows'] ?? [], $start, $end);
            $total += $persisted;
            $summary[$src] = ['status' => 'ok', 'rows' => $persisted, 'kind' => 'cs'];
        }
        try { self::recordSyncFreshness($pdo, $tenant, $summary); } catch (\Throwable $e) {}
        return ['tenant_id' => $tenant, 'window' => compact('start', 'end'), 'persisted' => $total, 'channels' => $summary];
    }

    /** 자격증명 저장 직후 CS 1회 동기화(데모/익명 skip). */
    public static function syncCsOnSave(string $tenant, string $source): array
    {
        $source = strtolower(trim($source));
        if (!self::isCsSource($source) || $tenant === '' || $tenant === 'demo') return ['skipped' => true];
        try { return self::runCsSync($tenant, date('Y-m-d', strtotime('-28 days')), date('Y-m-d'), [$source]); }
        catch (\Throwable $e) { return ['error' => substr($e->getMessage(), 0, 120)]; }
    }

    /** CS 자격증명 보유 테넌트 목록 — cron 팬아웃용. */
    public static function tenantsWithCsCreds(): array
    {
        $out = [];
        try {
            // [현 차수 기반강화] 레지스트리 병합 소스로 cron 팬아웃 — admin 추가 cs 채널도 정기 자가치유 편입.
            $srcs = self::csSources();
            $in = implode(',', array_fill(0, count($srcs), '?'));
            $st = Db::pdo()->prepare("SELECT DISTINCT tenant_id FROM channel_credential WHERE channel IN ($in) AND is_active=1");
            $st->execute($srcs);
            foreach ($st->fetchAll(PDO::FETCH_COLUMN) as $t) { $t = (string)$t; if ($t !== '' && $t !== 'demo') $out[] = $t; }
        } catch (\Throwable $e) {}
        return array_values(array_unique($out));
    }

    /**
     * POST /v426/cs/sync — CS 온디맨드 동기화(세션 self-auth). GET /v426/cs/metrics — 집계 조회.
     */
    public static function csSync(Request $request, Response $response, array $args): Response
    {
        $tenant = self::authTenant($request);
        if ($tenant === '' || $tenant === 'demo') { $response->getBody()->write(json_encode(['ok' => false, 'error' => 'tenant_required'])); return $response->withHeader('Content-Type', 'application/json')->withStatus(403); }
        $q = $request->getQueryParams(); $b = (array)($request->getParsedBody() ?? []);
        $start = (string)($b['start_date'] ?? $q['start_date'] ?? date('Y-m-d', strtotime('-28 days')));
        $end   = (string)($b['end_date'] ?? $q['end_date'] ?? date('Y-m-d'));
        $want  = (string)($b['sources'] ?? $q['sources'] ?? implode(',', self::csSources()));
        $wantSet = array_values(array_filter(array_map('trim', explode(',', strtolower($want))))) ?: self::csSources();
        $res = self::runCsSync($tenant, $start, $end, $wantSet);
        $response->getBody()->write(json_encode(['ok' => true] + $res, JSON_UNESCAPED_UNICODE));
        return $response->withHeader('Content-Type', 'application/json');
    }

    public static function csMetrics(Request $request, Response $response, array $args): Response
    {
        $tenant = self::authTenant($request);
        $q = $request->getQueryParams();
        $source = strtolower((string)($q['source'] ?? 'all'));
        $start = (string)($q['start_date'] ?? date('Y-m-d', strtotime('-28 days')));
        $end   = (string)($q['end_date'] ?? date('Y-m-d'));
        $out = ['ok' => true, 'source' => $source, 'window' => compact('start', 'end'), 'rows' => [], 'totals' => []];
        try {
            $pdo = Db::pdo(); self::ensureCsTable($pdo);
            $where = 'tenant_id=? AND date BETWEEN ? AND ?'; $params = [$tenant, $start, $end];
            if ($source !== 'all' && $source !== '') { $where .= ' AND source=?'; $params[] = $source; }
            $sql = "SELECT source,
                    SUM(tickets_created) AS tickets_created, SUM(tickets_solved) AS tickets_solved,
                    MAX(open_tickets) AS open_tickets, AVG(NULLIF(csat,0)) AS csat,
                    AVG(NULLIF(avg_first_reply_min,0)) AS avg_first_reply_min, AVG(NULLIF(avg_resolution_min,0)) AS avg_resolution_min
                    FROM cs_metrics WHERE {$where} GROUP BY source ORDER BY tickets_created DESC";
            $st = $pdo->prepare($sql); $st->execute($params);
            $rows = $st->fetchAll(PDO::FETCH_ASSOC) ?: [];
            $tot = ['tickets_created' => 0, 'tickets_solved' => 0, 'open_tickets' => 0];
            foreach ($rows as &$r) {
                foreach (['tickets_created', 'tickets_solved', 'open_tickets'] as $k) { $r[$k] = (int)$r[$k]; $tot[$k] += $r[$k]; }
                $r['csat'] = round((float)$r['csat'], 1);
                $r['avg_first_reply_min'] = round((float)$r['avg_first_reply_min'], 1);
                $r['avg_resolution_min'] = round((float)$r['avg_resolution_min'], 1);
                $r['solve_rate'] = $r['tickets_created'] > 0 ? round($r['tickets_solved'] / $r['tickets_created'], 4) : 0;
            }
            unset($r);
            $out['rows'] = $rows; $out['totals'] = $tot;
        } catch (\Throwable $e) { /* graceful */ }
        $response->getBody()->write(json_encode($out, JSON_UNESCAPED_UNICODE));
        return $response->withHeader('Content-Type', 'application/json');
    }

    // ════════════════════════════════════════════════════════════════════════════
    //  [P1 커넥터 폭] 외부 ESP(이메일) 인바운드 — Mailchimp · Klaviyo · SendGrid
    //  ─────────────────────────────────────────────────────────────────────────
    //  esp_metrics(별도 테이블)로 적재 — 발송/전달/오픈/클릭/수신거부/바운스·매출.
    //  자체 EmailMarketing(발송 플랫폼)과 분리·보완(외부 ESP 성과 통합 가시성).
    //  자격증명 미등록 시 skip(정직), 등록 즉시 fetch(graceful 드롭인).
    // ════════════════════════════════════════════════════════════════════════════

    public const ESP_SOURCES = ['mailchimp', 'klaviyo', 'sendgrid'];

    public static function isEspSource(string $channelKey): bool
    {
        return in_array(strtolower(trim($channelKey)), self::espSources(), true); // [현 차수 감사 P2] 레지스트리 병합(즉시sync 대칭)
    }

    public static function espSources(): array
    {
        return array_values(array_unique(array_merge(self::ESP_SOURCES, self::registryChannels('esp'))));
    }

    private static function ensureEspTable(PDO $pdo): void
    {
        $isMy = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'mysql';
        try {
            if ($isMy) {
                $pdo->exec("CREATE TABLE IF NOT EXISTS esp_metrics (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    tenant_id VARCHAR(100) NOT NULL, source VARCHAR(40) NOT NULL, date VARCHAR(10) NOT NULL,
                    campaigns_sent INT DEFAULT 0, emails_delivered INT DEFAULT 0, opens INT DEFAULT 0, clicks INT DEFAULT 0,
                    unsubscribes INT DEFAULT 0, bounces INT DEFAULT 0, revenue DOUBLE DEFAULT 0,
                    currency VARCHAR(10) DEFAULT 'KRW', extra_json TEXT, updated_at VARCHAR(32),
                    UNIQUE KEY uq_esp (tenant_id, source, date), KEY idx_esp_ts (tenant_id, source, date)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
            } else {
                $pdo->exec("CREATE TABLE IF NOT EXISTS esp_metrics (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    tenant_id TEXT NOT NULL, source TEXT NOT NULL, date TEXT NOT NULL,
                    campaigns_sent INTEGER DEFAULT 0, emails_delivered INTEGER DEFAULT 0, opens INTEGER DEFAULT 0, clicks INTEGER DEFAULT 0,
                    unsubscribes INTEGER DEFAULT 0, bounces INTEGER DEFAULT 0, revenue REAL DEFAULT 0,
                    currency TEXT DEFAULT 'KRW', extra_json TEXT, updated_at TEXT)");
                try { $pdo->exec("CREATE UNIQUE INDEX IF NOT EXISTS uq_esp ON esp_metrics(tenant_id,source,date)"); } catch (\Throwable $e) {}
            }
        } catch (\Throwable $e) { /* graceful */ }
    }

    private static function persistEspRows(PDO $pdo, string $tenant, string $source, array $rows, string $start, string $end): int
    {
        self::ensureEspTable($pdo);
        $source = strtolower($source);
        $del = $pdo->prepare('DELETE FROM esp_metrics WHERE tenant_id=? AND source=? AND date BETWEEN ? AND ?');
        $del->execute([$tenant, $source, $start, $end]);
        if (!$rows) return 0;
        $ins = $pdo->prepare('INSERT INTO esp_metrics
            (tenant_id,source,date,campaigns_sent,emails_delivered,opens,clicks,unsubscribes,bounces,revenue,currency,extra_json,updated_at)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)');
        $now = gmdate('c'); $n = 0;
        foreach ($rows as $r) {
            $date = (string)($r['date'] ?? '');
            if ($date === '' || $date < $start || $date > $end) continue;
            $curr = strtoupper((string)($r['currency'] ?? 'KRW'));
            $ins->execute([
                $tenant, $source, $date,
                (int)($r['campaigns_sent'] ?? 0), (int)($r['emails_delivered'] ?? 0), (int)($r['opens'] ?? 0), (int)($r['clicks'] ?? 0),
                (int)($r['unsubscribes'] ?? 0), (int)($r['bounces'] ?? 0), self::fxToKrw((float)($r['revenue'] ?? 0), $curr),
                $curr, isset($r['extra']) ? json_encode($r['extra'], JSON_UNESCAPED_UNICODE) : null, $now,
            ]);
            $n++;
        }
        return $n;
    }

    /** Mailchimp Reporting — /3.0/reports(캠페인 리포트 집계). 자격증명: mailchimp api_key(-dcNN 접미). 인증=Basic. */
    private static function fetchMailchimpEsp(string $tenant, string $start, string $end): array
    {
        $key = (string)self::loadCred($tenant, 'mailchimp', 'api_key');
        if ($key === '') return ['hasCreds' => false, 'live' => false, 'rows' => []];
        $dc = (strpos($key, '-') !== false) ? substr($key, strrpos($key, '-') + 1) : '';
        if ($dc === '') return ['hasCreds' => true, 'live' => false, 'error' => 'mailchimp api_key missing -dc suffix'];
        $base = 'https://' . $dc . '.api.mailchimp.com/3.0';
        $h = ['Authorization' => self::basicAuth('anystring', $key)];
        [$code, $body, $err] = self::httpGet($base . '/reports?count=500&since_send_time=' . rawurlencode($start . 'T00:00:00+00:00'), $h);
        if ($err || $code >= 400) return ['hasCreds' => true, 'live' => false, 'error' => $err ?: "mailchimp http $code"];
        $sent = 0; $deliv = 0; $opens = 0; $clicks = 0; $unsub = 0; $bounces = 0; $rev = 0.0; $campaigns = 0;
        foreach ((array)($body['reports'] ?? []) as $rep) {
            $campaigns++;
            $es = (int)($rep['emails_sent'] ?? 0);
            $sent += $es;
            $b = (array)($rep['bounces'] ?? []);
            $hb = (int)($b['hard_bounces'] ?? 0) + (int)($b['soft_bounces'] ?? 0);
            $bounces += $hb;
            $deliv += max(0, $es - $hb);
            $opens += (int)(($rep['opens']['unique_opens'] ?? 0));
            $clicks += (int)(($rep['clicks']['unique_clicks'] ?? 0));
            $unsub += (int)(($rep['unsubscribed'] ?? 0));
            $rev += (float)(($rep['ecommerce']['total_revenue'] ?? 0));
        }
        return ['hasCreds' => true, 'live' => true, 'rows' => [[
            'date' => $end, 'campaigns_sent' => $campaigns, 'emails_delivered' => $deliv, 'opens' => $opens,
            'clicks' => $clicks, 'unsubscribes' => $unsub, 'bounces' => $bounces, 'revenue' => $rev, 'currency' => 'USD',
        ]]];
    }

    /** Klaviyo — campaigns(발송 캠페인 수·수신자) best-effort. 자격증명: klaviyo private_key(pk_). 인증=Klaviyo-API-Key. */
    private static function fetchKlaviyoEsp(string $tenant, string $start, string $end): array
    {
        $key = (string)self::loadCred($tenant, 'klaviyo', 'private_key');
        if ($key === '') $key = (string)self::loadCred($tenant, 'klaviyo', 'api_key');
        if ($key === '') return ['hasCreds' => false, 'live' => false, 'rows' => []];
        $h = ['Authorization' => 'Klaviyo-API-Key ' . $key, 'revision' => '2024-10-15', 'Accept' => 'application/vnd.api+json'];
        // 이메일 채널 캠페인 목록(필수 filter=equals(messages.channel,'email')).
        $url = 'https://a.klaviyo.com/api/campaigns?filter=' . rawurlencode("equals(messages.channel,'email')") . '&fields[campaign]=name,send_time,created_at';
        [$code, $body, $err] = self::httpGet($url, $h);
        if ($err || $code >= 400) return ['hasCreds' => true, 'live' => false, 'error' => $err ?: "klaviyo http $code"];
        $campaigns = 0;
        foreach ((array)($body['data'] ?? []) as $c) {
            $st = (string)($c['attributes']['send_time'] ?? $c['attributes']['created_at'] ?? '');
            if ($st === '' || substr($st, 0, 10) >= $start) $campaigns++;
        }
        // 오픈/클릭 집계는 campaign-values-report(conversion_metric_id 필요)라 best-effort 생략 — 캠페인 수만 정직 적재.
        return ['hasCreds' => true, 'live' => true, 'rows' => [[
            'date' => $end, 'campaigns_sent' => $campaigns, 'extra' => ['note' => 'opens/clicks require campaign-values-report (conversion_metric_id)'],
        ]]];
    }

    /** SendGrid Stats — /v3/stats(일자별 집계). 자격증명: sendgrid api_key. 인증=Bearer. 일자별 행. */
    private static function fetchSendgridEsp(string $tenant, string $start, string $end): array
    {
        $key = (string)self::loadCred($tenant, 'sendgrid', 'api_key');
        if ($key === '') return ['hasCreds' => false, 'live' => false, 'rows' => []];
        $h = ['Authorization' => "Bearer {$key}"];
        $url = 'https://api.sendgrid.com/v3/stats?aggregated_by=day&start_date=' . rawurlencode($start) . '&end_date=' . rawurlencode($end);
        [$code, $body, $err] = self::httpGet($url, $h);
        if ($err || $code >= 400) return ['hasCreds' => true, 'live' => false, 'error' => $err ?: "sendgrid http $code"];
        $rows = [];
        foreach ((array)$body as $day) {
            $date = (string)($day['date'] ?? '');
            if ($date === '') continue;
            $m = [];
            foreach ((array)($day['stats'] ?? []) as $s) {
                foreach ((array)($s['metrics'] ?? []) as $k => $v) { $m[$k] = ($m[$k] ?? 0) + (int)$v; }
            }
            $rows[] = [
                'date' => $date,
                'emails_delivered' => (int)($m['delivered'] ?? 0),
                'opens' => (int)($m['unique_opens'] ?? $m['opens'] ?? 0),
                'clicks' => (int)($m['unique_clicks'] ?? $m['clicks'] ?? 0),
                'unsubscribes' => (int)($m['unsubscribes'] ?? 0),
                'bounces' => (int)($m['bounces'] ?? 0),
            ];
        }
        return ['hasCreds' => true, 'live' => true, 'rows' => $rows];
    }

    public static function runEspSync(string $tenant, string $start, string $end, array $wantSet): array
    {
        $pdo = Db::pdo();
        $summary = []; $total = 0;
        $fetchers = [
            'mailchimp' => fn() => self::fetchMailchimpEsp($tenant, $start, $end),
            'klaviyo'   => fn() => self::fetchKlaviyoEsp($tenant, $start, $end),
            'sendgrid'  => fn() => self::fetchSendgridEsp($tenant, $start, $end),
        ];
        foreach ($fetchers as $src => $fn) {
            if (!in_array($src, $wantSet, true)) continue;
            try { $res = $fn(); }
            catch (\Throwable $e) { $summary[$src] = ['status' => 'error', 'error' => substr($e->getMessage(), 0, 120)]; continue; }
            if (empty($res['hasCreds'])) { $summary[$src] = ['status' => 'skipped', 'reason' => 'no_credentials']; continue; }
            if (empty($res['live']))     { $summary[$src] = ['status' => 'error', 'error' => $res['error'] ?? 'fetch_failed']; continue; }
            $persisted = self::persistEspRows($pdo, $tenant, $src, $res['rows'] ?? [], $start, $end);
            $total += $persisted;
            $summary[$src] = ['status' => 'ok', 'rows' => $persisted, 'kind' => 'esp'];
        }
        try { self::recordSyncFreshness($pdo, $tenant, $summary); } catch (\Throwable $e) {}
        return ['tenant_id' => $tenant, 'window' => compact('start', 'end'), 'persisted' => $total, 'channels' => $summary];
    }

    public static function syncEspOnSave(string $tenant, string $source): array
    {
        $source = strtolower(trim($source));
        if (!self::isEspSource($source) || $tenant === '' || $tenant === 'demo') return ['skipped' => true];
        try { return self::runEspSync($tenant, date('Y-m-d', strtotime('-28 days')), date('Y-m-d'), [$source]); }
        catch (\Throwable $e) { return ['error' => substr($e->getMessage(), 0, 120)]; }
    }

    public static function tenantsWithEspCreds(): array
    {
        $out = [];
        try {
            // [현 차수 기반강화] 레지스트리 병합 소스로 cron 팬아웃 — admin 추가 esp 채널도 정기 자가치유 편입.
            $srcs = self::espSources();
            $in = implode(',', array_fill(0, count($srcs), '?'));
            $st = Db::pdo()->prepare("SELECT DISTINCT tenant_id FROM channel_credential WHERE channel IN ($in) AND is_active=1");
            $st->execute($srcs);
            foreach ($st->fetchAll(PDO::FETCH_COLUMN) as $t) { $t = (string)$t; if ($t !== '' && $t !== 'demo') $out[] = $t; }
        } catch (\Throwable $e) {}
        return array_values(array_unique($out));
    }

    public static function espSync(Request $request, Response $response, array $args): Response
    {
        $tenant = self::authTenant($request);
        if ($tenant === '' || $tenant === 'demo') { $response->getBody()->write(json_encode(['ok' => false, 'error' => 'tenant_required'])); return $response->withHeader('Content-Type', 'application/json')->withStatus(403); }
        $q = $request->getQueryParams(); $b = (array)($request->getParsedBody() ?? []);
        $start = (string)($b['start_date'] ?? $q['start_date'] ?? date('Y-m-d', strtotime('-28 days')));
        $end   = (string)($b['end_date'] ?? $q['end_date'] ?? date('Y-m-d'));
        $want  = (string)($b['sources'] ?? $q['sources'] ?? implode(',', self::espSources()));
        $wantSet = array_values(array_filter(array_map('trim', explode(',', strtolower($want))))) ?: self::espSources();
        $res = self::runEspSync($tenant, $start, $end, $wantSet);
        $response->getBody()->write(json_encode(['ok' => true] + $res, JSON_UNESCAPED_UNICODE));
        return $response->withHeader('Content-Type', 'application/json');
    }

    public static function espMetrics(Request $request, Response $response, array $args): Response
    {
        $tenant = self::authTenant($request);
        $q = $request->getQueryParams();
        $source = strtolower((string)($q['source'] ?? 'all'));
        $start = (string)($q['start_date'] ?? date('Y-m-d', strtotime('-28 days')));
        $end   = (string)($q['end_date'] ?? date('Y-m-d'));
        $out = ['ok' => true, 'source' => $source, 'window' => compact('start', 'end'), 'rows' => [], 'totals' => []];
        try {
            $pdo = Db::pdo(); self::ensureEspTable($pdo);
            $where = 'tenant_id=? AND date BETWEEN ? AND ?'; $params = [$tenant, $start, $end];
            if ($source !== 'all' && $source !== '') { $where .= ' AND source=?'; $params[] = $source; }
            $sql = "SELECT source,
                    SUM(campaigns_sent) AS campaigns_sent, SUM(emails_delivered) AS emails_delivered,
                    SUM(opens) AS opens, SUM(clicks) AS clicks, SUM(unsubscribes) AS unsubscribes,
                    SUM(bounces) AS bounces, SUM(revenue) AS revenue
                    FROM esp_metrics WHERE {$where} GROUP BY source ORDER BY emails_delivered DESC";
            $st = $pdo->prepare($sql); $st->execute($params);
            $rows = $st->fetchAll(PDO::FETCH_ASSOC) ?: [];
            $tot = ['campaigns_sent' => 0, 'emails_delivered' => 0, 'opens' => 0, 'clicks' => 0, 'unsubscribes' => 0, 'bounces' => 0, 'revenue' => 0.0];
            foreach ($rows as &$r) {
                foreach (['campaigns_sent', 'emails_delivered', 'opens', 'clicks', 'unsubscribes', 'bounces'] as $k) { $r[$k] = (int)$r[$k]; $tot[$k] += $r[$k]; }
                $r['revenue'] = (float)$r['revenue']; $tot['revenue'] += $r['revenue'];
                $r['open_rate'] = $r['emails_delivered'] > 0 ? round($r['opens'] / $r['emails_delivered'], 4) : 0;
                $r['click_rate'] = $r['emails_delivered'] > 0 ? round($r['clicks'] / $r['emails_delivered'], 4) : 0;
            }
            unset($r);
            $out['rows'] = $rows; $out['totals'] = $tot;
        } catch (\Throwable $e) { /* graceful */ }
        $response->getBody()->write(json_encode($out, JSON_UNESCAPED_UNICODE));
        return $response->withHeader('Content-Type', 'application/json');
    }
}
