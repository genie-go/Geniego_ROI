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
    /** provider 별 엔드포인트/스코프 정적 레지스트리(client_id/secret 은 config 에서). */
    private const PROVIDERS = [
        'google'   => ['auth' => 'https://accounts.google.com/o/oauth2/v2/auth', 'token' => 'https://oauth2.googleapis.com/token', 'scope' => 'https://www.googleapis.com/auth/adwords', 'extra' => ['access_type' => 'offline', 'prompt' => 'consent']],
        'meta'     => ['auth' => 'https://www.facebook.com/v19.0/dialog/oauth', 'token' => 'https://graph.facebook.com/v19.0/oauth/access_token', 'scope' => 'ads_management,business_management', 'extra' => []],
        'facebook' => ['auth' => 'https://www.facebook.com/v19.0/dialog/oauth', 'token' => 'https://graph.facebook.com/v19.0/oauth/access_token', 'scope' => 'pages_show_list,instagram_basic', 'extra' => []],
        'tiktok'   => ['auth' => 'https://www.tiktok.com/v2/auth/authorize/', 'token' => 'https://open.tiktokapis.com/v2/oauth/token/', 'scope' => 'user.info.basic', 'extra' => []],
        'kakao'    => ['auth' => 'https://kauth.kakao.com/oauth/authorize', 'token' => 'https://kauth.kakao.com/oauth/token', 'scope' => 'talk_message', 'extra' => []],
        'naver'    => ['auth' => 'https://nid.naver.com/oauth2.0/authorize', 'token' => 'https://nid.naver.com/oauth2.0/token', 'scope' => '', 'extra' => []],
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
                $pdo->exec("CREATE TABLE IF NOT EXISTS app_setting (skey VARCHAR(64) PRIMARY KEY, svalue TEXT, updated_at VARCHAR(32))");
            } else {
                $pdo->exec("CREATE TABLE IF NOT EXISTS oauth_state (id INTEGER PRIMARY KEY AUTOINCREMENT, state TEXT NOT NULL, tenant_id TEXT NOT NULL, provider TEXT NOT NULL, created_at TEXT)");
                try { $pdo->exec("CREATE UNIQUE INDEX IF NOT EXISTS uq_oauth_state ON oauth_state(state)"); } catch (\Throwable $e) {}
                $pdo->exec("CREATE TABLE IF NOT EXISTS app_setting (skey TEXT PRIMARY KEY, svalue TEXT, updated_at TEXT)");
            }
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
        $uri = $req->getUri();
        $scheme = $uri->getScheme() ?: 'https';
        $host = $uri->getHost() ?: 'roi.genie-go.com';
        return $scheme . '://' . $host . '/api/v425/oauth/' . $provider . '/callback';
    }

    /** GET /v425/oauth/{provider}/authorize — 인가 URL 생성. */
    public static function authorize(Request $req, Response $res, array $args): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $provider = strtolower((string)($args['provider'] ?? ''));
        if (!isset(self::PROVIDERS[$provider])) return self::json($res, ['ok' => false, 'error' => '지원하지 않는 provider'], 422);
        $cfg = self::config($provider);
        if ($cfg['client_id'] === '') {
            return self::json($res, ['ok' => false, 'configured' => false, 'error' => $provider . ' OAuth 앱이 미설정입니다. 관리자가 client_id/secret을 등록하면 활성화됩니다.'], 200);
        }
        $tenant = UserAuth::authedTenant($req) ?: 'demo';
        $state = bin2hex(random_bytes(16));
        try {
            self::db()->prepare("INSERT INTO oauth_state(state,tenant_id,provider,created_at) VALUES(?,?,?,?)")
                ->execute([$state, $tenant, $provider, self::now()]);
        } catch (\Throwable $e) {}
        $p = self::PROVIDERS[$provider];
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
        $code = (string)($q['code'] ?? '');
        $state = (string)($q['state'] ?? '');
        $front = '/integration-hub';
        if (!isset(self::PROVIDERS[$provider]) || $code === '' || $state === '') {
            return $res->withHeader('Location', $front . '?oauth=error')->withStatus(302);
        }
        // state 검증 → tenant 도출(CSRF 방어·격리)
        $tenant = '';
        try {
            $pdo = self::db();
            $sel = $pdo->prepare("SELECT tenant_id FROM oauth_state WHERE state=? AND provider=? LIMIT 1");
            $sel->execute([$state, $provider]);
            $tenant = (string)($sel->fetchColumn() ?: '');
            if ($tenant !== '') $pdo->prepare("DELETE FROM oauth_state WHERE state=?")->execute([$state]);
        } catch (\Throwable $e) {}
        if ($tenant === '') return $res->withHeader('Location', $front . '?oauth=invalid_state')->withStatus(302);

        $cfg = self::config($provider);
        $p = self::PROVIDERS[$provider];
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
            error_log('[OAuth.callback] token exchange failed: ' . json_encode($token));
            return $res->withHeader('Location', $front . '?oauth=token_failed')->withStatus(302);
        }
        // channel_credential 에 암호화 저장(채널=provider, key_name=oauth_access_token / oauth_refresh_token)
        try {
            self::saveCred($tenant, $provider, 'oauth_access_token', $access);
            if (!empty($token['refresh_token'])) self::saveCred($tenant, $provider, 'oauth_refresh_token', (string)$token['refresh_token']);
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
        return self::json($res, ['ok' => true, 'provider' => $provider, 'configured' => self::config($provider)['client_id'] !== '']);
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
}
