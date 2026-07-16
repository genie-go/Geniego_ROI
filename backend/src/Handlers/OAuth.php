<?php
declare(strict_types=1);
namespace Genie\Handlers;

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;
use Genie\Db;
use Genie\Crypto;

/**
 * 범용 OAuth 2.0 연결 프레임워크 (208차 #2, 활성화 준비).
 *
 * 채널/광고 연동의 토큰을 수기 붙여넣기 대신 OAuth 인가 플로우로 발급한다.
 *   ① GET  /v425/oauth/{provider}/authorize → 인가 URL 생성(프론트가 사용자를 리다이렉트)
 *   ② GET  /v425/oauth/{provider}/callback?code&state → code→token 교환 후 channel_credential 저장
 *   ③ GET  /v425/oauth/status → provider 별 {configured, connected}
 *   ④ POST /v425/admin/oauth/{provider}/config → client_id/secret 등록(admin, app_setting 암호화 저장)
 *
 * ★활성화 조건: 각 provider 의 OAuth 앱 client_id/secret 이 등록되어야 실제 작동(미등록 시 configured=false, inert).
 *   client_id/secret 은 env(OAUTH_{PROVIDER}_CLIENT_ID/SECRET) 또는 app_setting(oauth_{provider}_client_id/secret) 에서 읽음.
 * 인증: authorize/status 는 세션 self-auth(UserAuth::requirePro). callback 은 provider 리다이렉트라 무인증
 *   (state→tenant 매핑으로 격리·CSRF 방어). routes 는 /api strip 위해 /api 없이 등록 + index bypass.
 */
class OAuth
{
    /**
     * [현 차수] 공급자 토큰교환 실패 응답에서 진단용 메타만 화이트리스트 추출.
     * 응답 전문(json_encode)을 로그에 남기면 부분 토큰·내부 식별자가 로그로 유출될 수 있다.
     */
    private static function errDigest(mixed $resp): string
    {
        if (!is_array($resp)) return 'non_array_response';
        $out = [];
        foreach (['error', 'error_description', 'code', 'message', 'log_id', 'request_id'] as $k) {
            if (isset($resp[$k]) && is_scalar($resp[$k])) $out[$k] = (string)$resp[$k];
        }
        return $out ? json_encode($out, JSON_UNESCAPED_UNICODE) : 'no_error_metadata';
    }

    /** provider 별 엔드포인트/스코프 정적 레지스트리(client_id/secret 은 config 에서). */
    private const PROVIDERS = [
        'google'   => ['auth' => 'https://accounts.google.com/o/oauth2/v2/auth', 'token' => 'https://oauth2.googleapis.com/token', 'scope' => 'https://www.googleapis.com/auth/adwords', 'extra' => ['access_type' => 'offline', 'prompt' => 'consent']],
        'meta'     => ['auth' => 'https://www.facebook.com/v19.0/dialog/oauth', 'token' => 'https://graph.facebook.com/v19.0/oauth/access_token', 'scope' => 'ads_management,business_management', 'extra' => []],
        'facebook' => ['auth' => 'https://www.facebook.com/v19.0/dialog/oauth', 'token' => 'https://graph.facebook.com/v19.0/oauth/access_token', 'scope' => 'pages_show_list,instagram_basic', 'extra' => []],
        // [227차] TikTok 광고 집행용 Marketing API OAuth(소비자 Login Kit 아님).
        //   portal/auth(app_id 파라미터) → oauth2/access_token(JSON {app_id,secret,auth_code} → data.access_token).
        //   표준 OAuth2 와 파라미터/응답이 달라 dialect='tiktok_marketing' 로 authorize/callback 에서 분기 처리.
        'tiktok'   => ['auth' => 'https://business-api.tiktok.com/portal/auth', 'token' => 'https://business-api.tiktok.com/open_api/v1.3/oauth2/access_token/', 'scope' => '', 'extra' => [], 'dialect' => 'tiktok_marketing'],
        // [현 차수] TikTok Shop(커머스) OAuth — Marketing(광고)과 별개.
        //   authorize=services.tiktokshop.com/open/authorize?service_id={service_id}&state (redirect_uri 는 파트너센터 앱에 등록).
        //   token=auth.tiktok-shops.com/api/v2/token/get?app_key&app_secret&auth_code&grant_type=authorized_code (GET) → data.access_token.
        //   저장 후 ChannelSync::tiktokFetch(channel=tiktok_shop)가 access_token 으로 /authorization/202309/shops 에서 shop_cipher 자동 도출.
        //   ★파트너센터 Redirect(Callback) URL = https://{운영도메인}/api/v425/oauth/tiktok_shop/callback (redirectUri()와 동일).
        'tiktok_shop' => ['auth' => 'https://services.tiktokshop.com/open/authorize', 'token' => 'https://auth.tiktok-shops.com/api/v2/token/get', 'scope' => '', 'extra' => [], 'dialect' => 'tiktok_shop'],
        'kakao'    => ['auth' => 'https://kauth.kakao.com/oauth/authorize', 'token' => 'https://kauth.kakao.com/oauth/token', 'scope' => 'talk_message', 'extra' => []],
        'naver'    => ['auth' => 'https://nid.naver.com/oauth2.0/authorize', 'token' => 'https://nid.naver.com/oauth2.0/token', 'scope' => '', 'extra' => []],
        // [282차 R3] Twitch(라이브 커머스 멀티송출) — 표준 OAuth2. 브로드캐스터 팔로워 통계 스코프(moderator:read:followers).
        //   ※채널 조회수/동시시청자는 client_credentials(app token)로도 조회(fetchTwitchStats). 이 OAuth 는 팔로워수 등
        //     브로드캐스터 권한 데이터용. Twitch 앱 등록 시 요구되는 OAuth Redirect URL = redirectUri() 값과 동일.
        'twitch'   => ['auth' => 'https://id.twitch.tv/oauth2/authorize', 'token' => 'https://id.twitch.tv/oauth2/token', 'scope' => 'moderator:read:followers', 'extra' => []],
    ];

    private static function db(): \PDO { return Db::pdo(); }
    private static function now(): string { return gmdate('Y-m-d H:i:s'); }

    private static function json(Response $res, array $d, int $s = 200): Response
    {
        $res->getBody()->write(json_encode($d, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
        return $res->withHeader('Content-Type', 'application/json')->withStatus($s);
    }

    private static function ensureTables(): void
    {
        $pdo = self::db();
        $isMy = $pdo->getAttribute(\PDO::ATTR_DRIVER_NAME) === 'mysql';
        try {
            if ($isMy) {
                $pdo->exec("CREATE TABLE IF NOT EXISTS oauth_state (id INT AUTO_INCREMENT PRIMARY KEY, state VARCHAR(80) NOT NULL, tenant_id VARCHAR(100) NOT NULL, provider VARCHAR(40) NOT NULL, created_at VARCHAR(32), UNIQUE KEY uq_oauth_state (state)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
            } else {
                $pdo->exec("CREATE TABLE IF NOT EXISTS oauth_state (id INTEGER PRIMARY KEY AUTOINCREMENT, state TEXT NOT NULL, tenant_id TEXT NOT NULL, provider TEXT NOT NULL, created_at TEXT)");
                try { $pdo->exec("CREATE UNIQUE INDEX IF NOT EXISTS uq_oauth_state ON oauth_state(state)"); } catch (\Throwable $e) {}
            }
            Db::ensureAppSetting($pdo); // SSOT: 전역 KV 스토어 단일 정의(Db::ensureAppSetting)
            // [228차] 채널키 불일치 수정: 인가를 시작한 '레지스트리 채널키'(예: meta_ads)를 state 에 함께 보관 →
            //   콜백이 provider('meta')뿐 아니라 registry 채널에도 토큰을 반영하고 발급신청을 완료 처리한다.
            try { $pdo->exec("ALTER TABLE oauth_state ADD COLUMN channel " . ($isMy ? "VARCHAR(60)" : "TEXT")); } catch (\Throwable $e) {}
        } catch (\Throwable $e) {}
    }

    /** provider config(client_id/secret): env > app_setting. 미설정 시 빈값. */
    private static function config(string $provider): array
    {
        $cid = (string)(getenv('OAUTH_' . strtoupper($provider) . '_CLIENT_ID') ?: '');
        $sec = (string)(getenv('OAUTH_' . strtoupper($provider) . '_CLIENT_SECRET') ?: '');
        if ($cid === '' || $sec === '') {
            try {
                $pdo = self::db();
                $g = $pdo->prepare("SELECT skey, svalue FROM app_setting WHERE skey IN (?, ?)");
                $g->execute(['oauth_' . $provider . '_client_id', 'oauth_' . $provider . '_client_secret']);
                foreach ($g->fetchAll(\PDO::FETCH_ASSOC) as $r) {
                    if ($r['skey'] === 'oauth_' . $provider . '_client_id' && $cid === '') $cid = Crypto::decrypt((string)$r['svalue']);
                    if ($r['skey'] === 'oauth_' . $provider . '_client_secret' && $sec === '') $sec = Crypto::decrypt((string)$r['svalue']);
                }
            } catch (\Throwable $e) {}
        }
        return ['client_id' => $cid, 'client_secret' => $sec];
    }

    private static function redirectUri(Request $req, string $provider): string
    {
        // [현 차수] 219 검증: redirect_uri 호스트를 위조 가능한 raw Host 헤더로 그대로 쓰지 않는다.
        //   ①OAUTH_BASE_URL env 우선 ②알려진 호스트 allowlist 만 허용 ③그 외 기본 도메인 폴백.
        //   (OAuth provider 가 redirect_uri 를 검증하지만 open-redirect/토큰 표적화 표면을 선제 차단.)
        $envBase = getenv('OAUTH_BASE_URL') ?: (string)($_ENV['OAUTH_BASE_URL'] ?? '');
        if ($envBase !== '') {
            return rtrim($envBase, '/') . '/api/v425/oauth/' . $provider . '/callback';
        }
        $allowHosts = ['www.genieroi.com', 'roi.geniego.com', 'demo.genieroi.com', 'roidemo.geniego.com'];
        $uri = $req->getUri();
        $scheme = $uri->getScheme() ?: 'https';
        $host = $uri->getHost();
        if (!in_array($host, $allowHosts, true)) $host = 'www.genieroi.com'; // 미인가 호스트 → 기본 도메인
        return $scheme . '://' . $host . '/api/v425/oauth/' . $provider . '/callback';
    }

    /** GET /v425/oauth/{provider}/authorize — 인가 URL 생성. */
    public static function authorize(Request $req, Response $res, array $args): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $provider = strtolower((string)($args['provider'] ?? ''));
        if (!isset(self::PROVIDERS[$provider])) return self::json($res, ['ok' => false, 'error' => '지원하지 않는 provider'], 422);
        // [현 차수 잔여] ★Naver 로그인(NID) OAuth 는 커머스/광고 API 권한을 제공하지 않는다(scope='' = 프로필/로그인만).
        //   스마트스토어=커머스API HMAC(client_id/secret), 검색광고=API 라이선스 키로 '수동 등록'해야 실제 동기화된다.
        //   OAuth 로 연동한 NID 토큰으로 커머스 sync 를 시도하면 영구 실패하므로, 채널연동 시작 단계에서 정직 안내로 차단.
        if ($provider === 'naver') {
            return self::json($res, ['ok' => false, 'configured' => false, 'manual_required' => true,
                'error' => 'Naver 로그인(NID) OAuth 는 커머스/광고 권한을 제공하지 않습니다. 스마트스토어는 커머스 API client_id·client_secret(HMAC), 검색광고는 API 라이선스 키를 수동 등록하세요.'], 200);
        }
        $cfg = self::config($provider);
        // [현 차수] TikTok Shop 은 셀러가 폼에 입력·저장한 app_key/app_secret/service_id(테넌트 자격증명)로 인증하므로
        //   플랫폼 config(client_id) 조기체크에서 제외한다(아래 dialect 분기에서 테넌트 자격증명 확인).
        if ($cfg['client_id'] === '' && $provider !== 'tiktok_shop') {
            return self::json($res, ['ok' => false, 'configured' => false, 'error' => $provider . ' OAuth 앱이 미설정입니다. 관리자가 client_id/secret을 등록하면 활성화됩니다.'], 200);
        }
        $tenant = UserAuth::authedTenant($req) ?: 'demo';
        // [228차] 인가를 시작한 레지스트리 채널키(예: meta_ads) — 콜백에서 registry 반영·발급신청 완료에 사용.
        $channel = strtolower(trim((string)($req->getQueryParams()['channel'] ?? '')));
        $state = bin2hex(random_bytes(16));
        try {
            self::db()->prepare("INSERT INTO oauth_state(state,tenant_id,provider,channel,created_at) VALUES(?,?,?,?,?)")
                ->execute([$state, $tenant, $provider, $channel, self::now()]);
        } catch (\Throwable $e) {
            // channel 컬럼 미존재 등 폴백 — 기존 4컬럼 INSERT.
            try { self::db()->prepare("INSERT INTO oauth_state(state,tenant_id,provider,created_at) VALUES(?,?,?,?)")->execute([$state, $tenant, $provider, self::now()]); } catch (\Throwable $e2) {}
        }
        $p = self::PROVIDERS[$provider];
        // [현 차수] TikTok Shop: authorize 는 service_id + state (redirect_uri 는 파트너센터 앱에 등록).
        //   ★셀러가 폼에 저장한 service_id(테넌트 자격증명) 우선, 플랫폼 폴백. app_key/app_secret 은 callback 토큰교환에서 사용.
        //   Access Token 은 인증 후 동적 발급되므로 셀러가 수동입력하지 않는다.
        if (($p['dialect'] ?? '') === 'tiktok_shop') {
            $serviceId = self::loadCred($tenant, 'tiktok_shop', 'service_id');
            if ($serviceId === '') $serviceId = self::tiktokShopServiceId();
            if ($serviceId === '') {
                return self::json($res, ['ok' => false, 'configured' => false, 'manual_required' => true,
                    'error' => 'TikTok Shop: 먼저 App Key·App Secret·Service ID 를 입력·저장한 뒤 [인증]하세요. Access Token 은 인증으로 자동 발급됩니다.'], 200);
            }
            $url = $p['auth'] . '?' . http_build_query(['service_id' => $serviceId, 'state' => $state]);
            return self::json($res, ['ok' => true, 'configured' => true, 'authorize_url' => $url]);
        }
        // [227차] TikTok Marketing API: app_id 파라미터·response_type/scope 없음(권한은 앱 설정에서 부여).
        if (($p['dialect'] ?? '') === 'tiktok_marketing') {
            $url = $p['auth'] . '?' . http_build_query([
                'app_id'       => $cfg['client_id'], // client_id 슬롯에 TikTok app_id 저장
                'redirect_uri' => self::redirectUri($req, $provider),
                'state'        => $state,
            ]);
            return self::json($res, ['ok' => true, 'configured' => true, 'authorize_url' => $url]);
        }
        $params = array_merge([
            'client_id' => $cfg['client_id'],
            'redirect_uri' => self::redirectUri($req, $provider),
            'response_type' => 'code',
            'state' => $state,
        ], $p['scope'] !== '' ? ['scope' => $p['scope']] : [], $p['extra']);
        $url = $p['auth'] . '?' . http_build_query($params);
        return self::json($res, ['ok' => true, 'configured' => true, 'authorize_url' => $url]);
    }

    /** GET /v425/oauth/{provider}/callback?code&state — code→token 교환·저장 후 프론트로 리다이렉트. */
    public static function callback(Request $req, Response $res, array $args): Response
    {
        self::ensureTables();
        $provider = strtolower((string)($args['provider'] ?? ''));
        $q = $req->getQueryParams();
        // [227차] TikTok Marketing API 는 인가코드를 'auth_code' 로 반환(표준 'code' 아님).
        $code = (string)($q['code'] ?? $q['auth_code'] ?? '');
        $state = (string)($q['state'] ?? '');
        $front = '/integration-hub';
        if (!isset(self::PROVIDERS[$provider]) || $code === '' || $state === '') {
            return $res->withHeader('Location', $front . '?oauth=error')->withStatus(302);
        }
        // state 검증 → tenant·channel 도출(CSRF 방어·격리)
        $tenant = ''; $regChannel = '';
        try {
            $pdo = self::db();
            try {
                $sel = $pdo->prepare("SELECT tenant_id, channel FROM oauth_state WHERE state=? AND provider=? LIMIT 1");
                $sel->execute([$state, $provider]);
                $row = $sel->fetch(\PDO::FETCH_ASSOC) ?: [];
                $tenant = (string)($row['tenant_id'] ?? '');
                $regChannel = strtolower(trim((string)($row['channel'] ?? '')));
            } catch (\Throwable $e) {
                // channel 컬럼 미존재 폴백.
                $sel = $pdo->prepare("SELECT tenant_id FROM oauth_state WHERE state=? AND provider=? LIMIT 1");
                $sel->execute([$state, $provider]);
                $tenant = (string)($sel->fetchColumn() ?: '');
            }
            if ($tenant !== '') $pdo->prepare("DELETE FROM oauth_state WHERE state=?")->execute([$state]);
        } catch (\Throwable $e) {}
        if ($tenant === '') return $res->withHeader('Location', $front . '?oauth=invalid_state')->withStatus(302);

        $cfg = self::config($provider);
        $p = self::PROVIDERS[$provider];

        // ── [227차] TikTok Marketing API 토큰 교환(JSON {app_id,secret,auth_code} → data.access_token) ──
        if (($p['dialect'] ?? '') === 'tiktok_marketing') {
            $tok = self::httpPostJson($p['token'], [
                'app_id'    => $cfg['client_id'],
                'secret'    => $cfg['client_secret'],
                'auth_code' => $code,
            ]);
            $data   = is_array($tok['data'] ?? null) ? $tok['data'] : [];
            $access = (string)($data['access_token'] ?? '');
            if ($access === '') {
                // [현 차수] 응답 전문 직렬화 금지 — 에러 메타만 기록(자격증명·부분토큰 로그 유출 회피).
                error_log('[OAuth.callback] TikTok token exchange failed: ' . self::errDigest($tok));
                return $res->withHeader('Location', $front . '?oauth=token_failed')->withStatus(302);
            }
            try {
                self::saveCred($tenant, $provider, 'oauth_access_token', $access);
                // 광고계정 ID(첫번째) 저장 → AdAdapters/Connectors 가 집행·리포팅에 사용(채널 별칭 tiktok_business→tiktok).
                $advs = (array)($data['advertiser_ids'] ?? []);
                if (!empty($advs)) self::saveCred($tenant, $provider, 'advertiser_id', (string)$advs[0]);
                // [228차] ★registry 채널키 반영(tiktok_business 등)+발급신청 완료. 광고주ID도 registry 에 함께 반영.
                self::reflectRegistryChannel($tenant, $provider, $regChannel, $access, '');
                if (!empty($advs) && $regChannel !== '' && $regChannel !== $provider) { self::saveCred($tenant, $regChannel, 'advertiser_id', (string)$advs[0]); }
                if (Connectors::isAdChannel($provider)) { Connectors::syncAdChannelOnSave($tenant, $provider); }
            } catch (\Throwable $e) {}
            return $res->withHeader('Location', $front . '?oauth=success&provider=' . $provider)->withStatus(302);
        }

        // ── [현 차수] TikTok Shop 토큰 교환(GET token/get: app_key/app_secret/auth_code → data.access_token) ──
        //   ★셀러가 저장한 app_key/app_secret(테넌트 자격증명) 우선, 플랫폼 폴백. Access Token 은 여기서 동적 발급·저장.
        if (($p['dialect'] ?? '') === 'tiktok_shop') {
            $appKey    = self::loadCred($tenant, 'tiktok_shop', 'app_key');    if ($appKey === '')    $appKey = $cfg['client_id'];
            $appSecret = self::loadCred($tenant, 'tiktok_shop', 'app_secret'); if ($appSecret === '') $appSecret = $cfg['client_secret'];
            if ($appKey === '' || $appSecret === '') {
                error_log('[OAuth.callback] TikTok Shop: app_key/app_secret 미저장(셀러가 폼에 먼저 저장 필요)');
                return $res->withHeader('Location', $front . '?oauth=token_failed')->withStatus(302);
            }
            $tok = self::httpGet($p['token'] . '?' . http_build_query([
                'app_key'    => $appKey,
                'app_secret' => $appSecret,
                'auth_code'  => $code,
                'grant_type' => 'authorized_code',
            ]));
            $data   = is_array($tok['data'] ?? null) ? $tok['data'] : [];
            $access = (string)($data['access_token'] ?? '');
            if ($access === '') {
                error_log('[OAuth.callback] TikTok Shop token exchange failed: ' . self::errDigest($tok));
                return $res->withHeader('Location', $front . '?oauth=token_failed')->withStatus(302);
            }
            try {
                // ChannelSync::tiktokFetch(channel=tiktok_shop)가 읽는 key_name 으로 저장(shop_cipher 는 첫 sync 에서 자동 도출).
                self::saveCred($tenant, 'tiktok_shop', 'app_key', $appKey);
                self::saveCred($tenant, 'tiktok_shop', 'app_secret', $appSecret);
                self::saveCred($tenant, 'tiktok_shop', 'access_token', $access);
                if (!empty($data['refresh_token'])) self::saveCred($tenant, 'tiktok_shop', 'refresh_token', (string)$data['refresh_token']);
                try { self::db()->prepare("UPDATE channel_credential SET test_status='ok', last_tested_at=? WHERE tenant_id=? AND channel='tiktok_shop' AND key_name='access_token'")->execute([gmdate('c'), $tenant]); } catch (\Throwable $e) {}
                // OAuth 토큰 취득 = 실 발급 검증 → 발급신청 완료 처리.
                try { \Genie\Handlers\ChannelCreds::markApplyCompleted(self::db(), $tenant, 'tiktok_shop', true); } catch (\Throwable $e) {}
                // 저장 즉시 1회 동기화(상품/주문) — shop_cipher 자동 도출 포함. best-effort.
                try { \Genie\Handlers\ChannelSync::syncTenantChannel($tenant, 'tiktok_shop', 'pro'); } catch (\Throwable $e) {}
            } catch (\Throwable $e) {}
            return $res->withHeader('Location', $front . '?oauth=success&provider=tiktok_shop')->withStatus(302);
        }

        $body = http_build_query([
            'grant_type' => 'authorization_code',
            'code' => $code,
            'client_id' => $cfg['client_id'],
            'client_secret' => $cfg['client_secret'],
            'redirect_uri' => self::redirectUri($req, $provider),
        ]);
        $token = self::httpPost($p['token'], $body);
        $access = (string)($token['access_token'] ?? '');
        if ($access === '') {
            // [현 차수] 응답 전문 직렬화 금지 — 에러 메타만 기록.
            error_log('[OAuth.callback] token exchange failed: ' . self::errDigest($token));
            return $res->withHeader('Location', $front . '?oauth=token_failed')->withStatus(302);
        }
        // channel_credential 에 암호화 저장(채널=provider, key_name=oauth_access_token / oauth_refresh_token)
        try {
            self::saveCred($tenant, $provider, 'oauth_access_token', $access);
            if (!empty($token['refresh_token'])) self::saveCred($tenant, $provider, 'oauth_refresh_token', (string)$token['refresh_token']);
            // [228차] ★registry 채널키 반영 — 카드/ConnectModal/발급신청이 registry키(meta_ads 등)를 기준하므로
            //   registry 채널에도 표준 key_name(access_token/refresh_token)으로 토큰을 반영하고 발급신청을 완료 처리.
            self::reflectRegistryChannel($tenant, $provider, $regChannel, $access, (string)($token['refresh_token'] ?? ''));
            // [현 차수] H2: OAuth 연결 직후 성과 ingest 1회 트리거(저장→sync 대칭). 광고채널만.
            //   광고계정 ID 등 잔여 자격증명이 폼으로 입력돼 있으면 즉시 적재, 아니면 cron/후속 폼저장 시 적재.
            if (Connectors::isAdChannel($provider)) { Connectors::syncAdChannelOnSave($tenant, $provider); }
        } catch (\Throwable $e) {}
        return $res->withHeader('Location', $front . '?oauth=success&provider=' . $provider)->withStatus(302);
    }

    /** GET /v425/oauth/status — provider 별 {configured, connected}. */
    public static function status(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $tenant = UserAuth::authedTenant($req) ?: 'demo';
        $out = [];
        foreach (array_keys(self::PROVIDERS) as $provider) {
            $configured = self::config($provider)['client_id'] !== '';
            $connected = false;
            try {
                $st = self::db()->prepare("SELECT 1 FROM channel_credential WHERE tenant_id=? AND channel=? AND key_name='oauth_access_token' AND is_active=1 LIMIT 1");
                $st->execute([$tenant, $provider]);
                $connected = (bool)$st->fetchColumn();
            } catch (\Throwable $e) {}
            $out[$provider] = ['configured' => $configured, 'connected' => $connected];
        }
        return self::json($res, ['ok' => true, 'providers' => $out]);
    }

    /** POST /v425/admin/oauth/{provider}/config — admin 이 client_id/secret 등록(암호화). */
    public static function saveConfig(Request $req, Response $res, array $args): Response
    {
        if ($err = UserAuth::requirePlan($req, $res, 'admin')) return $err;
        self::ensureTables();
        $provider = strtolower((string)($args['provider'] ?? ''));
        if (!isset(self::PROVIDERS[$provider])) return self::json($res, ['ok' => false, 'error' => '지원하지 않는 provider'], 422);
        $b = (array)($req->getParsedBody() ?? []);
        if (empty($b)) { $d = json_decode((string)$req->getBody(), true); if (is_array($d)) $b = $d; }
        $cid = trim((string)($b['client_id'] ?? ''));
        $sec = trim((string)($b['client_secret'] ?? ''));
        $now = self::now(); $pdo = self::db();
        $set = function (string $k, string $v) use ($pdo, $now) {
            if ($v === '' || strpos($v, '•') !== false) return; // 마스킹 재전송 무시
            $enc = Crypto::encrypt($v);
            $isMy = $pdo->getAttribute(\PDO::ATTR_DRIVER_NAME) === 'mysql';
            if ($isMy) $pdo->prepare("INSERT INTO app_setting(skey,svalue,updated_at) VALUES(?,?,?) ON DUPLICATE KEY UPDATE svalue=VALUES(svalue),updated_at=VALUES(updated_at)")->execute([$k, $enc, $now]);
            else $pdo->prepare("INSERT INTO app_setting(skey,svalue,updated_at) VALUES(?,?,?) ON CONFLICT(skey) DO UPDATE SET svalue=excluded.svalue,updated_at=excluded.updated_at")->execute([$k, $enc, $now]);
        };
        $set('oauth_' . $provider . '_client_id', $cid);
        $set('oauth_' . $provider . '_client_secret', $sec);
        // [현 차수] TikTok Shop 은 authorize 에 service_id 가 별도로 필요(app_key=client_id, app_secret=client_secret 외).
        if ($provider === 'tiktok_shop') {
            $svc = trim((string)($b['service_id'] ?? ''));
            $set('oauth_tiktok_shop_service_id', $svc);
        }
        return self::json($res, ['ok' => true, 'provider' => $provider, 'configured' => self::config($provider)['client_id'] !== '']);
    }

    /**
     * [228차] OAuth 토큰을 '레지스트리 채널키'(예: meta_ads)에도 표준 key_name 으로 반영 + 발급신청 완료 처리.
     *   provider 키 저장(기존 리더 호환)은 그대로 두고, 카드/ConnectModal/발급신청이 기준하는 registry 채널에
     *   access_token/refresh_token 을 추가 저장한다. regChannel 이 비었거나 provider 와 같으면 no-op.
     *   OAuth 토큰 취득 = 발급 검증(provider 가 실제 토큰을 발급) → markApplyCompleted(verified=true).
     */
    private static function reflectRegistryChannel(string $tenant, string $provider, string $regChannel, string $access, string $refresh): void
    {
        $rc = strtolower(trim($regChannel));
        if ($rc === '' || $rc === strtolower($provider) || $access === '') {
            // registry 채널 미지정(구 프론트 등) — provider 만 저장된 상태. 그래도 provider 기준 발급신청은 완료 처리.
            try { \Genie\Handlers\ChannelCreds::markApplyCompleted(self::db(), $tenant, strtolower($provider), true); } catch (\Throwable $e) {}
            return;
        }
        try {
            self::saveCred($tenant, $rc, 'access_token', $access);
            if ($refresh !== '') self::saveCred($tenant, $rc, 'refresh_token', $refresh);
            // OAuth 토큰 취득 = provider 가 실제 발급·인증한 결과 → 카드 '발급 확인됨'과 정합되게 test_status=ok.
            try { self::db()->prepare("UPDATE channel_credential SET test_status='ok', last_tested_at=? WHERE tenant_id=? AND channel=? AND key_name='access_token'")->execute([gmdate('c'), $tenant, $rc]); } catch (\Throwable $e) {}
        } catch (\Throwable $e) {}
        // 발급신청(연동허브 카드/현황) 완료 처리 — OAuth 토큰 취득은 실 발급 검증.
        try { \Genie\Handlers\ChannelCreds::markApplyCompleted(self::db(), $tenant, $rc, true); } catch (\Throwable $e) {}
    }

    private static function saveCred(string $tenant, string $channel, string $keyName, string $value): void
    {
        $pdo = self::db(); $now = gmdate('c');
        $enc = Crypto::encrypt($value);
        $sel = $pdo->prepare("SELECT id FROM channel_credential WHERE tenant_id=? AND channel=? AND key_name=? LIMIT 1");
        $sel->execute([$tenant, $channel, $keyName]);
        $id = $sel->fetchColumn();
        if ($id) {
            $pdo->prepare("UPDATE channel_credential SET key_value=?, is_active=1, updated_at=? WHERE id=?")->execute([$enc, $now, (int)$id]);
        } else {
            $pdo->prepare("INSERT INTO channel_credential(tenant_id,channel,cred_type,label,key_name,key_value,is_active,updated_at,created_at) VALUES(?,?,?,?,?,?,1,?,?)")
                ->execute([$tenant, $channel, 'oauth_token', strtoupper($channel) . ' OAuth', $keyName, $enc, $now, $now]);
        }
    }

    private static function httpPost(string $url, string $body): array
    {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true, CURLOPT_POST => true, CURLOPT_POSTFIELDS => $body,
            CURLOPT_TIMEOUT => 10, CURLOPT_CONNECTTIMEOUT => 5,
            CURLOPT_HTTPHEADER => ['Content-Type: application/x-www-form-urlencoded', 'Accept: application/json'],
        ]);
        $raw = curl_exec($ch); curl_close($ch);
        $j = json_decode((string)$raw, true);
        if (is_array($j)) return $j;
        // 일부 provider(naver/legacy facebook)는 querystring 응답
        parse_str((string)$raw, $parsed);
        return is_array($parsed) ? $parsed : [];
    }

    /** [현 차수] GET(JSON 응답) — TikTok Shop token/get(GET 쿼리파라미터) 등. */
    private static function httpGet(string $url): array
    {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 10, CURLOPT_CONNECTTIMEOUT => 5,
            CURLOPT_HTTPHEADER => ['Accept: application/json'],
        ]);
        $raw = curl_exec($ch); curl_close($ch);
        $j = json_decode((string)$raw, true);
        return is_array($j) ? $j : [];
    }

    /** [현 차수] TikTok Shop service_id: env(OAUTH_TIKTOK_SHOP_SERVICE_ID) > app_setting(oauth_tiktok_shop_service_id, 암호화). */
    private static function tiktokShopServiceId(): string
    {
        $v = (string)(getenv('OAUTH_TIKTOK_SHOP_SERVICE_ID') ?: '');
        if ($v === '') {
            try {
                $g = self::db()->prepare("SELECT svalue FROM app_setting WHERE skey='oauth_tiktok_shop_service_id' LIMIT 1");
                $g->execute();
                $r = $g->fetchColumn();
                if ($r !== false && $r !== null) $v = Crypto::decrypt((string)$r);
            } catch (\Throwable $e) {}
        }
        return $v;
    }

    /** [227차] JSON 바디 POST(TikTok Marketing API 등 application/json 요구 provider 용). */
    private static function httpPostJson(string $url, array $payload): array
    {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true, CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => json_encode($payload, JSON_UNESCAPED_UNICODE),
            CURLOPT_TIMEOUT => 10, CURLOPT_CONNECTTIMEOUT => 5,
            CURLOPT_HTTPHEADER => ['Content-Type: application/json', 'Accept: application/json'],
        ]);
        $raw = curl_exec($ch); curl_close($ch);
        $j = json_decode((string)$raw, true);
        return is_array($j) ? $j : [];
    }

    // ── [현 차수] OAuth 토큰 갱신(refresh) ──────────────────────────────────
    //   access token 은 만료된다(Google ~1h·TikTok ~24h·Meta ~60d). 과거엔 oauth_refresh_token 을
    //   저장만 하고 갱신에 쓰지 않아, 만료 시 AdAdapters 집행이 401 로 실패했다(지속 자동집행 불가).
    //   refreshCore 가 refresh_token grant 로 새 access token 을 발급·저장한다(핸들러+cron 공용).

    /** 자격증명 값 복호화 로드(없으면 ''). */
    private static function loadCred(string $tenant, string $channel, string $keyName): string
    {
        try {
            $st = self::db()->prepare("SELECT key_value FROM channel_credential WHERE tenant_id=? AND channel=? AND key_name=? AND is_active=1 LIMIT 1");
            $st->execute([$tenant, $channel, $keyName]);
            $v = $st->fetchColumn();
            return ($v !== false && $v !== null) ? Crypto::decrypt((string)$v) : '';
        } catch (\Throwable $e) { return ''; }
    }

    /** provider 별 refresh grant 바디. meta 는 표준 refresh_token 미발급 → 현재 장수명 토큰 재교환(연장). */
    private static function refreshBody(string $provider, array $cfg, string $refresh, string $current): array
    {
        if ($provider === 'meta' || $provider === 'facebook') {
            return ['ok' => $current !== '', 'body' => http_build_query([
                'grant_type' => 'fb_exchange_token',
                'client_id' => $cfg['client_id'], 'client_secret' => $cfg['client_secret'],
                'fb_exchange_token' => $current,
            ])];
        }
        if ($provider === 'tiktok') {
            return ['ok' => $refresh !== '', 'body' => http_build_query([
                'client_key' => $cfg['client_id'], 'client_secret' => $cfg['client_secret'],
                'grant_type' => 'refresh_token', 'refresh_token' => $refresh,
            ])];
        }
        // google · naver · kakao (표준 refresh_token grant)
        return ['ok' => $refresh !== '', 'body' => http_build_query([
            'grant_type' => 'refresh_token',
            'client_id' => $cfg['client_id'], 'client_secret' => $cfg['client_secret'],
            'refresh_token' => $refresh,
        ])];
    }

    /** 토큰 갱신 코어. @return array{ok:bool,...} */
    public static function refreshCore(string $tenant, string $provider): array
    {
        $provider = strtolower($provider);
        if (!isset(self::PROVIDERS[$provider])) return ['ok' => false, 'error' => 'unsupported_provider'];
        self::ensureTables();
        $cfg = self::config($provider);
        if ($cfg['client_id'] === '' || $cfg['client_secret'] === '') return ['ok' => false, 'error' => 'not_configured'];
        $refresh = self::loadCred($tenant, $provider, 'oauth_refresh_token');
        $current = self::loadCred($tenant, $provider, 'oauth_access_token');
        $rb = self::refreshBody($provider, $cfg, $refresh, $current);
        if (!$rb['ok']) return ['ok' => false, 'error' => 'no_refresh_token'];
        $resp = self::httpPost(self::PROVIDERS[$provider]['token'], $rb['body']);
        $data = (isset($resp['data']) && is_array($resp['data'])) ? $resp['data'] : $resp; // TikTok 은 data 래핑
        $access = (string)($data['access_token'] ?? '');
        if ($access === '') {
            error_log('[OAuth.refresh] ' . $provider . ' failed: ' . json_encode($resp));
            return ['ok' => false, 'error' => 'refresh_failed', 'detail' => $data['error'] ?? $data['error_description'] ?? null];
        }
        self::saveCred($tenant, $provider, 'oauth_access_token', $access);
        if (!empty($data['refresh_token'])) self::saveCred($tenant, $provider, 'oauth_refresh_token', (string)$data['refresh_token']);
        $expiresIn = (int)($data['expires_in'] ?? 0);
        if ($expiresIn > 0) self::saveCred($tenant, $provider, 'oauth_expires_at', gmdate('Y-m-d H:i:s', time() + $expiresIn));
        // 갱신 직후 성과 ingest 1회(저장→sync 대칭, 광고채널 한정).
        try { if (Connectors::isAdChannel($provider)) Connectors::syncAdChannelOnSave($tenant, $provider); } catch (\Throwable $e) {}
        return ['ok' => true, 'provider' => $provider, 'expires_in' => $expiresIn ?: null];
    }

    /** POST /v425/oauth/{provider}/refresh — 토큰 갱신(세션 인증·테넌트 스코프). */
    public static function refresh(Request $req, Response $res, array $args): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        $provider = strtolower((string)($args['provider'] ?? ''));
        $tenant = UserAuth::authedTenant($req) ?: '';
        if ($tenant === '' || $tenant === 'demo') return self::json($res, ['ok' => false, 'error' => 'unauthorized'], 401);
        $r = self::refreshCore($tenant, $provider);
        return self::json($res, $r, $r['ok'] ? 200 : 422);
    }

    /** cron 용: OAuth 토큰이 등록된 (tenant, provider) 쌍 열거(광고 자동집행 토큰 신선도 유지). */
    public static function connectedOAuthPairs(): array
    {
        self::ensureTables();
        try {
            $st = self::db()->prepare("SELECT DISTINCT tenant_id, channel FROM channel_credential
                WHERE key_name IN ('oauth_refresh_token','oauth_access_token') AND is_active=1");
            $st->execute();
            $out = [];
            foreach ($st->fetchAll(\PDO::FETCH_ASSOC) as $r) {
                $ch = strtolower((string)$r['channel']);
                if (isset(self::PROVIDERS[$ch])) $out[] = ['tenant' => (string)$r['tenant_id'], 'provider' => $ch];
            }
            return $out;
        } catch (\Throwable $e) { return []; }
    }
}
