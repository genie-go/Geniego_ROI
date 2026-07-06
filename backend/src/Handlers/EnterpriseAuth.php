<?php
declare(strict_types=1);
namespace Genie\Handlers;

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;
use Genie\Db;
use Genie\Crypto;

/**
 * EnterpriseAuth — [245차 P2-3] 엔터프라이즈 인증: SSO(OIDC/SAML) + SCIM 2.0 프로비저닝.
 *
 * 글로벌 엔터프라이즈 영업 필수. ★기존 인증 인프라 재사용(중복0):
 *   - 세션 발급: user_session(user_id,token,expires_at) — UserAuth::generateToken 동형
 *   - 유저 프로비저닝: app_user(tenant_id,parent_user_id,team_role) — 회사(테넌트) owner 하위로 SSO/SCIM 유저 생성
 *   - 테넌트 격리: authedTenant(서버권위), Crypto AES-256-GCM(client_secret/scim_token 암호화)
 *   - HTTP: curl, /auth/* 이미 public bypass(콜백·SCIM 외부 IdP 호출 도달)
 *
 * 프로토콜:
 *   OIDC — Authorization Code. id_token RS256/JWKS 검증(+userinfo 폴백). state/nonce CSRF·replay 방어.
 *   SAML — HTTP-POST ACS. ds:Signature 검증(DOMNode exclusive C14N + openssl RSA-SHA256 + digest 대조).
 *   SCIM 2.0 — /scim/v2/Users·Groups CRUD. Bearer scim_token(sha256 해시 룩업→테넌트).
 *
 * 라우팅: 설정=/v430/sso/* (admin), 콜백=/auth/sso/* (public), SCIM=/scim/v2/* (Bearer).
 */
class EnterpriseAuth
{
    private static function db(): \PDO { return Db::pdo(); }
    private static function isMysql(\PDO $pdo): bool { return $pdo->getAttribute(\PDO::ATTR_DRIVER_NAME) === 'mysql'; }
    private static function now(): string { return gmdate('Y-m-d H:i:s'); }
    private static function tenant(Request $req): string { $t = UserAuth::authedTenant($req); return ($t !== null && $t !== '') ? $t : 'demo'; }
    private static function body(Request $req): array { $b = (array)($req->getParsedBody() ?? []); if (empty($b)) { $d = json_decode((string)$req->getBody(), true); if (is_array($d)) $b = $d; } return $b; }
    private static function json(Response $res, array $data, int $status = 200): Response
    { $res->getBody()->write(json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)); return $res->withHeader('Content-Type', 'application/json')->withStatus($status); }
    private static function scimJson(Response $res, array $data, int $status = 200): Response
    { $res->getBody()->write(json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)); return $res->withHeader('Content-Type', 'application/scim+json')->withStatus($status); }
    private static function publicBase(): string { $b = getenv('APP_PUBLIC_URL'); if ($b) return rtrim($b, '/'); return (Db::env() === 'demo') ? 'https://demo.genieroi.com' : 'https://www.genieroi.com'; }

    private static function ensureTables(): void
    {
        $pdo = self::db();
        if (self::isMysql($pdo)) {
            $pdo->exec("CREATE TABLE IF NOT EXISTS sso_config (
                tenant_id VARCHAR(100) NOT NULL PRIMARY KEY, slug VARCHAR(60), domain VARCHAR(190),
                protocol VARCHAR(10) NOT NULL DEFAULT 'oidc', enabled TINYINT(1) DEFAULT 0,
                oidc_issuer VARCHAR(300), oidc_client_id VARCHAR(300), oidc_client_secret TEXT,
                oidc_authorize_url VARCHAR(400), oidc_token_url VARCHAR(400), oidc_jwks_url VARCHAR(400), oidc_userinfo_url VARCHAR(400),
                oidc_scopes VARCHAR(200) DEFAULT 'openid email profile',
                saml_idp_entity_id VARCHAR(400), saml_idp_sso_url VARCHAR(400), saml_idp_cert TEXT,
                email_attr VARCHAR(120), name_attr VARCHAR(120), default_role VARCHAR(20) DEFAULT 'member', auto_provision TINYINT(1) DEFAULT 1,
                scim_enabled TINYINT(1) DEFAULT 0, scim_token TEXT, scim_token_hash VARCHAR(64),
                updated_at VARCHAR(32),
                KEY idx_sso_slug (slug), KEY idx_sso_domain (domain), KEY idx_sso_scim (scim_token_hash)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
            $pdo->exec("CREATE TABLE IF NOT EXISTS sso_state (state VARCHAR(80) PRIMARY KEY, tenant_id VARCHAR(100), nonce VARCHAR(80), created_at VARCHAR(32)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
            // [261차 보안] SAML assertion 리플레이 방어 — 소비한 어설션 ID 기록(중복 제출 거부).
            $pdo->exec("CREATE TABLE IF NOT EXISTS saml_consumed_assertion (assertion_id VARCHAR(255) NOT NULL PRIMARY KEY, tenant_id VARCHAR(100), consumed_at VARCHAR(32)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
        } else {
            $pdo->exec("CREATE TABLE IF NOT EXISTS sso_config (tenant_id TEXT PRIMARY KEY, slug TEXT, domain TEXT, protocol TEXT NOT NULL DEFAULT 'oidc', enabled INTEGER DEFAULT 0, oidc_issuer TEXT, oidc_client_id TEXT, oidc_client_secret TEXT, oidc_authorize_url TEXT, oidc_token_url TEXT, oidc_jwks_url TEXT, oidc_userinfo_url TEXT, oidc_scopes TEXT DEFAULT 'openid email profile', saml_idp_entity_id TEXT, saml_idp_sso_url TEXT, saml_idp_cert TEXT, email_attr TEXT, name_attr TEXT, default_role TEXT DEFAULT 'member', auto_provision INTEGER DEFAULT 1, scim_enabled INTEGER DEFAULT 0, scim_token TEXT, scim_token_hash TEXT, updated_at TEXT)");
            $pdo->exec("CREATE TABLE IF NOT EXISTS sso_state (state TEXT PRIMARY KEY, tenant_id TEXT, nonce TEXT, created_at TEXT)");
            $pdo->exec("CREATE TABLE IF NOT EXISTS saml_consumed_assertion (assertion_id TEXT PRIMARY KEY, tenant_id TEXT, consumed_at TEXT)");
        }
        // app_user 에 SSO 연결 컬럼(멱등 best-effort).
        foreach (['oidc_sub' => 'VARCHAR(255)', 'oidc_provider' => 'VARCHAR(40)', 'scim_external_id' => 'VARCHAR(190)'] as $col => $type) {
            try { $pdo->exec("ALTER TABLE app_user ADD COLUMN {$col} " . (self::isMysql($pdo) ? $type : 'TEXT')); } catch (\Throwable $e) {}
        }
        // [255차 심화] SCIM/IdP 그룹(displayName) → 내부 롤(manager/member) 매핑. Okta/Entra 그룹기반 자동 롤 프로비저닝.
        try {
            if (self::isMysql($pdo)) {
                $pdo->exec("CREATE TABLE IF NOT EXISTS sso_group_role_map (id INT AUTO_INCREMENT PRIMARY KEY, tenant_id VARCHAR(100) NOT NULL, group_name VARCHAR(190) NOT NULL, role VARCHAR(20) NOT NULL DEFAULT 'member', updated_at VARCHAR(32), UNIQUE KEY uq_sgrm (tenant_id, group_name)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
            } else {
                $pdo->exec("CREATE TABLE IF NOT EXISTS sso_group_role_map (id INTEGER PRIMARY KEY AUTOINCREMENT, tenant_id TEXT NOT NULL, group_name TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'member', updated_at TEXT, UNIQUE(tenant_id, group_name))");
            }
        } catch (\Throwable $e) {}
    }

    /** [255차 심화] IdP 그룹 목록 → 내부 롤 해석(manager 우선). 매핑 없거나 그룹 없으면 ''(호출측 default 사용). */
    private static function roleForGroups(\PDO $pdo, string $tenant, array $groups): string
    {
        $groups = array_values(array_filter(array_map(fn($g) => is_array($g) ? (string)($g['display'] ?? $g['value'] ?? '') : (string)$g, $groups), fn($g) => $g !== ''));
        if (!$groups) return '';
        try {
            $in = implode(',', array_fill(0, count($groups), '?'));
            $st = $pdo->prepare("SELECT role FROM sso_group_role_map WHERE tenant_id=? AND group_name IN ($in)");
            $st->execute(array_merge([$tenant], $groups));
            $roles = array_map('strval', $st->fetchAll(\PDO::FETCH_COLUMN) ?: []);
            if (in_array('manager', $roles, true)) return 'manager';
            if (in_array('member', $roles, true)) return 'member';
        } catch (\Throwable $e) {}
        return '';
    }

    /* ════════════════ 설정 (admin) ════════════════ */
    public static function getConfig(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePlan($req, $res, 'enterprise')) return $err;
        self::ensureTables();
        $t = self::tenant($req);
        $st = self::db()->prepare("SELECT * FROM sso_config WHERE tenant_id=?"); $st->execute([$t]);
        $row = $st->fetch(\PDO::FETCH_ASSOC) ?: null;
        $acs = self::publicBase() . '/api/auth/sso/saml/acs';
        $meta = self::publicBase() . '/api/auth/sso/saml/metadata?tenant=' . rawurlencode($t);
        $oidcRedirect = self::publicBase() . '/api/auth/sso/oidc/callback';
        $scimBase = self::publicBase() . '/api/scim/v2';
        if (!$row) {
            return self::json($res, ['ok' => true, 'config' => null, 'sp' => ['acs_url' => $acs, 'metadata_url' => $meta, 'oidc_redirect_uri' => $oidcRedirect, 'scim_base_url' => $scimBase, 'entity_id' => self::publicBase() . '/sso/' . $t]]);
        }
        $cfg = [
            'slug' => $row['slug'], 'domain' => $row['domain'], 'protocol' => $row['protocol'], 'enabled' => (int)$row['enabled'],
            'oidc_issuer' => $row['oidc_issuer'], 'oidc_client_id' => $row['oidc_client_id'],
            'oidc_client_secret' => !empty($row['oidc_client_secret']) ? '••••••••' : '',
            'oidc_authorize_url' => $row['oidc_authorize_url'], 'oidc_token_url' => $row['oidc_token_url'],
            'oidc_jwks_url' => $row['oidc_jwks_url'], 'oidc_userinfo_url' => $row['oidc_userinfo_url'], 'oidc_scopes' => $row['oidc_scopes'],
            'saml_idp_entity_id' => $row['saml_idp_entity_id'], 'saml_idp_sso_url' => $row['saml_idp_sso_url'],
            'saml_idp_cert' => !empty($row['saml_idp_cert']) ? '••••••••' : '',
            'email_attr' => $row['email_attr'], 'name_attr' => $row['name_attr'], 'default_role' => $row['default_role'], 'auto_provision' => (int)$row['auto_provision'],
            'scim_enabled' => (int)$row['scim_enabled'], 'scim_token' => !empty($row['scim_token']) ? '••••••••' : '',
            'login_url' => self::publicBase() . '/api/auth/sso/' . rawurlencode((string)($row['slug'] ?: $t)) . '/login',
        ];
        return self::json($res, ['ok' => true, 'config' => $cfg, 'sp' => ['acs_url' => $acs, 'metadata_url' => $meta, 'oidc_redirect_uri' => $oidcRedirect, 'scim_base_url' => $scimBase, 'entity_id' => self::publicBase() . '/sso/' . $t]]);
    }

    public static function saveConfig(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePlan($req, $res, 'enterprise')) return $err;
        self::ensureTables();
        $t = self::tenant($req); $b = self::body($req); $pdo = self::db();
        $cur = $pdo->prepare("SELECT * FROM sso_config WHERE tenant_id=?"); $cur->execute([$t]); $ex = $cur->fetch(\PDO::FETCH_ASSOC) ?: [];
        $keep = fn($k, $col) => (function () use ($b, $ex, $k, $col) { $v = (string)($b[$k] ?? ''); if ($v === '' || strpos($v, '•') !== false) return $ex[$col] ?? null; return Crypto::encrypt($v); })();
        $slug = preg_replace('/[^a-z0-9-]/', '', strtolower((string)($b['slug'] ?? $ex['slug'] ?? ''))); if ($slug === '') $slug = 'sso-' . substr(md5($t), 0, 8);
        $protocol = in_array(($b['protocol'] ?? ''), ['oidc', 'saml'], true) ? (string)$b['protocol'] : (string)($ex['protocol'] ?? 'oidc');
        $scimTok = (string)($b['scim_token'] ?? '');
        $scimEnc = ($scimTok === '' || strpos($scimTok, '•') !== false) ? ($ex['scim_token'] ?? null) : Crypto::encrypt($scimTok);
        $scimHash = ($scimTok === '' || strpos($scimTok, '•') !== false) ? ($ex['scim_token_hash'] ?? null) : hash('sha256', $scimTok);
        $fields = [
            'slug' => $slug, 'domain' => strtolower(trim((string)($b['domain'] ?? $ex['domain'] ?? ''))), 'protocol' => $protocol, 'enabled' => !empty($b['enabled']) ? 1 : 0,
            'oidc_issuer' => (string)($b['oidc_issuer'] ?? $ex['oidc_issuer'] ?? ''), 'oidc_client_id' => (string)($b['oidc_client_id'] ?? $ex['oidc_client_id'] ?? ''),
            'oidc_client_secret' => $keep('oidc_client_secret', 'oidc_client_secret'),
            'oidc_authorize_url' => (string)($b['oidc_authorize_url'] ?? $ex['oidc_authorize_url'] ?? ''), 'oidc_token_url' => (string)($b['oidc_token_url'] ?? $ex['oidc_token_url'] ?? ''),
            'oidc_jwks_url' => (string)($b['oidc_jwks_url'] ?? $ex['oidc_jwks_url'] ?? ''), 'oidc_userinfo_url' => (string)($b['oidc_userinfo_url'] ?? $ex['oidc_userinfo_url'] ?? ''),
            'oidc_scopes' => (string)($b['oidc_scopes'] ?? $ex['oidc_scopes'] ?? 'openid email profile'),
            'saml_idp_entity_id' => (string)($b['saml_idp_entity_id'] ?? $ex['saml_idp_entity_id'] ?? ''), 'saml_idp_sso_url' => (string)($b['saml_idp_sso_url'] ?? $ex['saml_idp_sso_url'] ?? ''),
            'saml_idp_cert' => (($b['saml_idp_cert'] ?? '') !== '' && strpos((string)($b['saml_idp_cert'] ?? ''), '•') === false) ? (string)$b['saml_idp_cert'] : ($ex['saml_idp_cert'] ?? ''),
            'email_attr' => (string)($b['email_attr'] ?? $ex['email_attr'] ?? ''), 'name_attr' => (string)($b['name_attr'] ?? $ex['name_attr'] ?? ''),
            'default_role' => in_array(($b['default_role'] ?? ''), ['manager', 'member'], true) ? (string)$b['default_role'] : (string)($ex['default_role'] ?? 'member'),
            'auto_provision' => isset($b['auto_provision']) ? (!empty($b['auto_provision']) ? 1 : 0) : (int)($ex['auto_provision'] ?? 1),
            'scim_enabled' => !empty($b['scim_enabled']) ? 1 : 0, 'scim_token' => $scimEnc, 'scim_token_hash' => $scimHash, 'updated_at' => self::now(),
        ];
        if ($ex) {
            $set = implode(',', array_map(fn($k) => "{$k}=?", array_keys($fields)));
            $pdo->prepare("UPDATE sso_config SET {$set} WHERE tenant_id=?")->execute([...array_values($fields), $t]);
        } else {
            $cols = implode(',', array_merge(['tenant_id'], array_keys($fields)));
            $ph = implode(',', array_fill(0, count($fields) + 1, '?'));
            $pdo->prepare("INSERT INTO sso_config({$cols}) VALUES({$ph})")->execute([$t, ...array_values($fields)]);
        }
        return self::json($res, ['ok' => true, 'slug' => $slug]);
    }

    /** SCIM 토큰 발급(평문 1회 반환). */
    public static function rotateScimToken(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePlan($req, $res, 'enterprise')) return $err;
        self::ensureTables();
        $t = self::tenant($req);
        $tok = 'scim_' . bin2hex(random_bytes(24));
        $pdo = self::db();
        $exists = $pdo->prepare("SELECT 1 FROM sso_config WHERE tenant_id=?"); $exists->execute([$t]);
        if ($exists->fetchColumn()) $pdo->prepare("UPDATE sso_config SET scim_token=?, scim_token_hash=?, scim_enabled=1, updated_at=? WHERE tenant_id=?")->execute([Crypto::encrypt($tok), hash('sha256', $tok), self::now(), $t]);
        else $pdo->prepare("INSERT INTO sso_config(tenant_id,scim_token,scim_token_hash,scim_enabled,updated_at) VALUES(?,?,?,1,?)")->execute([$t, Crypto::encrypt($tok), hash('sha256', $tok), self::now()]);
        return self::json($res, ['ok' => true, 'scim_token' => $tok, 'warning' => '이 토큰은 다시 표시되지 않습니다. IdP의 SCIM 설정에 즉시 저장하세요.']);
    }

    /* ════════════════ SSO 로그인 시작 (public) ════════════════ */
    public static function login(Request $req, Response $res, array $args): Response
    {
        self::ensureTables();
        $slug = (string)($args['slug'] ?? '');
        $pdo = self::db();
        $st = $pdo->prepare("SELECT * FROM sso_config WHERE (slug=? OR tenant_id=?) AND enabled=1 LIMIT 1");
        $st->execute([$slug, $slug]); $cfg = $st->fetch(\PDO::FETCH_ASSOC);
        if (!$cfg) return self::json($res, ['ok' => false, 'error' => 'SSO가 설정/활성화되지 않았습니다.'], 404);
        if (($cfg['protocol'] ?? 'oidc') === 'saml') {
            // SAML: HTTP-Redirect AuthnRequest(서명 없는 최소 요청 — IdP가 ACS로 서명 어설션 POST).
            $acs = self::publicBase() . '/api/auth/sso/saml/acs';
            $id = '_' . bin2hex(random_bytes(16));
            $authn = sprintf('<samlp:AuthnRequest xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol" ID="%s" Version="2.0" IssueInstant="%s" ProtocolBinding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST" AssertionConsumerServiceURL="%s"><saml:Issuer xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion">%s</saml:Issuer></samlp:AuthnRequest>',
                $id, gmdate('Y-m-d\TH:i:s\Z'), htmlspecialchars($acs), htmlspecialchars(self::publicBase() . '/sso/' . $cfg['tenant_id']));
            $enc = base64_encode(gzdeflate($authn) ?: $authn);
            $url = $cfg['saml_idp_sso_url'] . (strpos((string)$cfg['saml_idp_sso_url'], '?') !== false ? '&' : '?') . 'SAMLRequest=' . rawurlencode($enc) . '&RelayState=' . rawurlencode((string)$cfg['tenant_id']);
            return $res->withHeader('Location', $url)->withStatus(302);
        }
        // OIDC: state/nonce 발급 후 authorize 리다이렉트.
        $state = bin2hex(random_bytes(20)); $nonce = bin2hex(random_bytes(16));
        $pdo->prepare("INSERT INTO sso_state(state,tenant_id,nonce,created_at) VALUES(?,?,?,?)")->execute([$state, (string)$cfg['tenant_id'], $nonce, self::now()]);
        $redirect = self::publicBase() . '/api/auth/sso/oidc/callback';
        $q = http_build_query([
            'response_type' => 'code', 'client_id' => (string)$cfg['oidc_client_id'], 'redirect_uri' => $redirect,
            'scope' => (string)($cfg['oidc_scopes'] ?: 'openid email profile'), 'state' => $state, 'nonce' => $nonce,
        ]);
        $auth = (string)$cfg['oidc_authorize_url'];
        return $res->withHeader('Location', $auth . (strpos($auth, '?') !== false ? '&' : '?') . $q)->withStatus(302);
    }

    /* ════════════════ OIDC 콜백 (public) ════════════════ */
    public static function oidcCallback(Request $req, Response $res): Response
    {
        self::ensureTables();
        $q = $req->getQueryParams(); $pdo = self::db();
        $code = (string)($q['code'] ?? ''); $state = (string)($q['state'] ?? '');
        if ($code === '' || $state === '') return self::fail($res, 'missing code/state');
        $stRow = $pdo->prepare("SELECT * FROM sso_state WHERE state=?"); $stRow->execute([$state]); $st = $stRow->fetch(\PDO::FETCH_ASSOC);
        if (!$st) return self::fail($res, 'invalid state');
        $pdo->prepare("DELETE FROM sso_state WHERE state=?")->execute([$state]); // 1회용
        $tenant = (string)$st['tenant_id'];
        $cfg = self::cfgByTenant($pdo, $tenant);
        if (!$cfg) return self::fail($res, 'sso not configured');
        $secret = self::dec($cfg['oidc_client_secret'] ?? '');
        $redirect = self::publicBase() . '/api/auth/sso/oidc/callback';
        $tok = self::httpPostForm((string)$cfg['oidc_token_url'], [
            'grant_type' => 'authorization_code', 'code' => $code, 'redirect_uri' => $redirect,
            'client_id' => (string)$cfg['oidc_client_id'], 'client_secret' => $secret,
        ]);
        if (empty($tok['access_token']) && empty($tok['id_token'])) return self::fail($res, 'token exchange failed');
        $claims = null;
        // 1) id_token RS256/JWKS 검증 우선.
        if (!empty($tok['id_token']) && !empty($cfg['oidc_jwks_url'])) {
            $claims = self::verifyIdToken((string)$tok['id_token'], (string)$cfg['oidc_jwks_url'], (string)$cfg['oidc_client_id'], (string)($cfg['oidc_issuer'] ?? ''), (string)$st['nonce']);
        }
        // 2) userinfo 폴백(백채널 TLS access_token).
        if (!$claims && !empty($tok['access_token']) && !empty($cfg['oidc_userinfo_url'])) {
            $ui = self::httpGet((string)$cfg['oidc_userinfo_url'], ['Authorization: Bearer ' . $tok['access_token']]);
            $claims = json_decode($ui, true) ?: null;
        }
        if (!$claims || empty($claims['email'])) return self::fail($res, 'no verified email from IdP');
        $email = strtolower((string)$claims['email']);
        $name = (string)($claims['name'] ?? ($claims['given_name'] ?? '') . ' ' . ($claims['family_name'] ?? ''));
        $sub = (string)($claims['sub'] ?? '');
        try {
            $uid = self::provisionUser($pdo, $tenant, $email, trim($name) ?: $email, 'oidc', $sub, (string)($cfg['default_role'] ?? 'member'), (int)($cfg['auto_provision'] ?? 1));
        } catch (\Throwable $e) { return self::fail($res, $e->getMessage()); }
        $session = self::issueSession($pdo, $uid);
        return $res->withHeader('Location', self::publicBase() . '/login?sso_token=' . $session)->withStatus(302);
    }

    /* ════════════════ SAML ACS (public) ════════════════ */
    public static function samlAcs(Request $req, Response $res): Response
    {
        self::ensureTables();
        $b = self::body($req); $pdo = self::db();
        $samlResp = (string)($b['SAMLResponse'] ?? '');
        $tenant = (string)($b['RelayState'] ?? '');
        if ($samlResp === '') return self::fail($res, 'missing SAMLResponse');
        $xml = base64_decode($samlResp) ?: '';
        if ($xml === '') return self::fail($res, 'invalid SAMLResponse');
        $cfg = $tenant !== '' ? self::cfgByTenant($pdo, $tenant) : null;
        if (!$cfg) { // RelayState 부재 시 Issuer 로 테넌트 도출.
            if (preg_match('/<(?:saml2?:)?Issuer[^>]*>([^<]+)</', $xml, $m)) {
                $iss = trim($m[1]);
                $r = $pdo->prepare("SELECT * FROM sso_config WHERE saml_idp_entity_id=? AND enabled=1 LIMIT 1"); $r->execute([$iss]); $cfg = $r->fetch(\PDO::FETCH_ASSOC) ?: null;
                if ($cfg) $tenant = (string)$cfg['tenant_id'];
            }
        }
        if (!$cfg) return self::fail($res, 'sso not configured for this IdP');
        $cert = (string)($cfg['saml_idp_cert'] ?? '');
        // [261차 보안] 서명검증은 서명된 노드의 정규화 XML을 반환한다. 신원(NameID/속성)은 반드시
        //   이 "검증된 서명 서브트리"에서만 추출해야 한다(전체 $xml 대상 추출 시 signature-wrapping[XSW]
        //   공격으로 서명 밖 위조 assertion의 email이 채택돼 계정탈취 가능).
        $signedXml = self::verifySamlSignature($xml, $cert);
        if ($signedXml === '') return self::fail($res, 'SAML signature verification failed');
        // [261차] 어설션 유효기간(NotOnOrAfter) 검증 — 만료 캡처 무한 리플레이 차단(120초 스큐 허용).
        if (preg_match('/NotOnOrAfter="([^"]+)"/', $signedXml, $nx)) {
            $exp = strtotime($nx[1]);
            if ($exp !== false && $exp < (time() - 120)) return self::fail($res, 'SAML assertion expired');
        }
        // [261차] 리플레이 방어 — 검증된 어설션 ID 1회성 소비(중복 제출 거부).
        if (preg_match('/<(?:saml2?:)?Assertion\b[^>]*\bID="([^"]+)"/', $signedXml, $ax)) {
            $aid = substr(trim($ax[1]), 0, 255);
            try {
                $pdo->prepare("INSERT INTO saml_consumed_assertion(assertion_id,tenant_id,consumed_at) VALUES(?,?,?)")
                    ->execute([$aid, $tenant, self::now()]);
            } catch (\Throwable $e) { return self::fail($res, 'SAML assertion already consumed'); }
        }
        // 어설션 속성 추출 — ★검증된 서명 서브트리($signedXml)에서만.
        $email = ''; $name = ''; $sub = '';
        if (preg_match('/<(?:saml2?:)?NameID[^>]*>([^<]+)</', $signedXml, $m)) { $sub = trim($m[1]); if (strpos($sub, '@') !== false) $email = strtolower($sub); }
        $emailAttr = (string)($cfg['email_attr'] ?? '') ?: 'email';
        $nameAttr = (string)($cfg['name_attr'] ?? '') ?: 'name';
        $email = self::samlAttr($signedXml, $emailAttr) ?: $email ?: self::samlAttr($signedXml, 'mail') ?: self::samlAttr($signedXml, 'urn:oid:0.9.2342.19200300.100.1.3');
        $name = self::samlAttr($signedXml, $nameAttr) ?: self::samlAttr($signedXml, 'displayName') ?: '';
        $email = strtolower(trim((string)$email));
        if ($email === '' || strpos($email, '@') === false) return self::fail($res, 'no email in SAML assertion');
        try {
            $uid = self::provisionUser($pdo, $tenant, $email, trim((string)$name) ?: $email, 'saml', $sub, (string)($cfg['default_role'] ?? 'member'), (int)($cfg['auto_provision'] ?? 1));
        } catch (\Throwable $e) { return self::fail($res, $e->getMessage()); }
        $session = self::issueSession($pdo, $uid);
        return $res->withHeader('Location', self::publicBase() . '/login?sso_token=' . $session)->withStatus(302);
    }

    public static function samlMetadata(Request $req, Response $res): Response
    {
        $tenant = (string)($req->getQueryParams()['tenant'] ?? '');
        $acs = self::publicBase() . '/api/auth/sso/saml/acs';
        $entity = self::publicBase() . '/sso/' . $tenant;
        $xml = '<?xml version="1.0"?>' .
            '<EntityDescriptor xmlns="urn:oasis:names:tc:SAML:2.0:metadata" entityID="' . htmlspecialchars($entity) . '">' .
            '<SPSSODescriptor AuthnRequestsSigned="false" WantAssertionsSigned="true" protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">' .
            '<NameIDFormat>urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress</NameIDFormat>' .
            '<AssertionConsumerService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST" Location="' . htmlspecialchars($acs) . '" index="0"/>' .
            '</SPSSODescriptor></EntityDescriptor>';
        $res->getBody()->write($xml);
        return $res->withHeader('Content-Type', 'application/xml')->withStatus(200);
    }

    /* ════════════════ SCIM 2.0 (Bearer scim_token) ════════════════ */
    private static function scimAuth(Request $req): ?array
    {
        self::ensureTables();
        $h = $req->getHeaderLine('Authorization');
        if (!preg_match('/Bearer\s+(\S+)/i', $h, $m)) return null;
        $hash = hash('sha256', $m[1]);
        $st = self::db()->prepare("SELECT tenant_id FROM sso_config WHERE scim_token_hash=? AND scim_enabled=1 LIMIT 1");
        $st->execute([$hash]); $t = $st->fetchColumn();
        return $t ? ['tenant' => (string)$t] : null;
    }
    private static function scimErr(Response $res, int $status, string $detail): Response
    { return self::scimJson($res, ['schemas' => ['urn:ietf:params:scim:api:messages:2.0:Error'], 'detail' => $detail, 'status' => (string)$status], $status); }

    private static function scimUserOut(array $u): array
    {
        return [
            'schemas' => ['urn:ietf:params:scim:schemas:core:2.0:User'],
            'id' => (string)$u['id'], 'externalId' => (string)($u['scim_external_id'] ?? ''),
            'userName' => (string)$u['email'], 'active' => (int)$u['is_active'] === 1,
            'name' => ['formatted' => (string)($u['name'] ?? '')],
            'emails' => [['value' => (string)$u['email'], 'primary' => true]],
            'meta' => ['resourceType' => 'User'],
        ];
    }

    public static function scimListUsers(Request $req, Response $res): Response
    {
        $a = self::scimAuth($req); if (!$a) return self::scimErr($res, 401, 'invalid SCIM token');
        $q = $req->getQueryParams(); $pdo = self::db();
        $where = 'tenant_id=?'; $params = [$a['tenant']];
        if (!empty($q['filter']) && preg_match('/userName\s+eq\s+"([^"]+)"/i', (string)$q['filter'], $m)) { $where .= ' AND LOWER(email)=?'; $params[] = strtolower($m[1]); }
        $st = $pdo->prepare("SELECT * FROM app_user WHERE {$where} ORDER BY id DESC LIMIT 200"); $st->execute($params);
        $rows = $st->fetchAll(\PDO::FETCH_ASSOC) ?: [];
        return self::scimJson($res, ['schemas' => ['urn:ietf:params:scim:api:messages:2.0:ListResponse'], 'totalResults' => count($rows), 'startIndex' => 1, 'itemsPerPage' => count($rows), 'Resources' => array_map([self::class, 'scimUserOut'], $rows)]);
    }

    public static function scimGetUser(Request $req, Response $res, array $args): Response
    {
        $a = self::scimAuth($req); if (!$a) return self::scimErr($res, 401, 'invalid SCIM token');
        $st = self::db()->prepare("SELECT * FROM app_user WHERE id=? AND tenant_id=?"); $st->execute([(int)$args['id'], $a['tenant']]);
        $u = $st->fetch(\PDO::FETCH_ASSOC); if (!$u) return self::scimErr($res, 404, 'user not found');
        return self::scimJson($res, self::scimUserOut($u));
    }

    public static function scimCreateUser(Request $req, Response $res): Response
    {
        $a = self::scimAuth($req); if (!$a) return self::scimErr($res, 401, 'invalid SCIM token');
        $b = self::body($req); $pdo = self::db();
        $email = strtolower(trim((string)($b['userName'] ?? ($b['emails'][0]['value'] ?? ''))));
        if ($email === '' || strpos($email, '@') === false) return self::scimErr($res, 400, 'userName(email) required');
        $name = (string)($b['name']['formatted'] ?? trim(((string)($b['name']['givenName'] ?? '')) . ' ' . ((string)($b['name']['familyName'] ?? '')))) ?: $email;
        $ext = (string)($b['externalId'] ?? '');
        $exists = $pdo->prepare("SELECT * FROM app_user WHERE LOWER(email)=? AND tenant_id=?"); $exists->execute([$email, $a['tenant']]);
        if ($e = $exists->fetch(\PDO::FETCH_ASSOC)) { // 멱등 — 이미 있으면 활성화 + 반환.
            $pdo->prepare("UPDATE app_user SET is_active=1, scim_external_id=? WHERE id=?")->execute([$ext, (int)$e['id']]);
            $e['is_active'] = 1; $e['scim_external_id'] = $ext;
            return self::scimJson($res, self::scimUserOut($e), 200);
        }
        $groups = is_array($b['groups'] ?? null) ? $b['groups'] : []; // [255차 심화] SCIM 그룹 → 롤 매핑 입력
        try { $uid = self::provisionUser($pdo, $a['tenant'], $email, $name, 'scim', '', 'member', 1, $ext, $groups); }
        catch (\Throwable $e) { return self::scimErr($res, 400, $e->getMessage()); }
        $st = $pdo->prepare("SELECT * FROM app_user WHERE id=?"); $st->execute([$uid]);
        return self::scimJson($res, self::scimUserOut($st->fetch(\PDO::FETCH_ASSOC) ?: []), 201);
    }

    public static function scimUpdateUser(Request $req, Response $res, array $args): Response
    {
        $a = self::scimAuth($req); if (!$a) return self::scimErr($res, 401, 'invalid SCIM token');
        $b = self::body($req); $pdo = self::db(); $id = (int)$args['id'];
        $cur = $pdo->prepare("SELECT * FROM app_user WHERE id=? AND tenant_id=?"); $cur->execute([$id, $a['tenant']]); $u = $cur->fetch(\PDO::FETCH_ASSOC);
        if (!$u) return self::scimErr($res, 404, 'user not found');
        // PUT(전체) 또는 PATCH(Operations) 모두 active/name 반영.
        $active = (int)$u['is_active']; $name = (string)($u['name'] ?? '');
        if (array_key_exists('active', $b)) $active = !empty($b['active']) ? 1 : 0;
        if (isset($b['name']['formatted'])) $name = (string)$b['name']['formatted'];
        if (!empty($b['Operations']) && is_array($b['Operations'])) {
            foreach ($b['Operations'] as $op) {
                $path = strtolower((string)($op['path'] ?? '')); $val = $op['value'] ?? null;
                if ($path === 'active' || (is_array($val) && array_key_exists('active', $val))) { $av = is_array($val) ? ($val['active'] ?? $val) : $val; $active = (filter_var($av, FILTER_VALIDATE_BOOLEAN)) ? 1 : 0; }
            }
        }
        // owner 계정 비활성화 금지(테넌트 잠금 방지).
        if ($active === 0 && (string)$u['team_role'] === 'owner') return self::scimErr($res, 403, 'cannot deactivate tenant owner via SCIM');
        $pdo->prepare("UPDATE app_user SET is_active=?, name=? WHERE id=? AND tenant_id=?")->execute([$active, $name, $id, $a['tenant']]);
        if ($active === 0) $pdo->prepare("DELETE FROM user_session WHERE user_id=?")->execute([$id]); // 즉시 deprovision.
        $u['is_active'] = $active; $u['name'] = $name;
        return self::scimJson($res, self::scimUserOut($u));
    }

    public static function scimDeleteUser(Request $req, Response $res, array $args): Response
    {
        $a = self::scimAuth($req); if (!$a) return self::scimErr($res, 401, 'invalid SCIM token');
        $pdo = self::db(); $id = (int)$args['id'];
        $cur = $pdo->prepare("SELECT team_role FROM app_user WHERE id=? AND tenant_id=?"); $cur->execute([$id, $a['tenant']]); $role = $cur->fetchColumn();
        if ($role === false) return self::scimErr($res, 404, 'user not found');
        if ($role === 'owner') return self::scimErr($res, 403, 'cannot delete tenant owner');
        $pdo->prepare("UPDATE app_user SET is_active=0 WHERE id=? AND tenant_id=?")->execute([$id, $a['tenant']]);
        $pdo->prepare("DELETE FROM user_session WHERE user_id=?")->execute([$id]);
        return $res->withStatus(204);
    }

    public static function scimListGroups(Request $req, Response $res): Response
    {
        $a = self::scimAuth($req); if (!$a) return self::scimErr($res, 401, 'invalid SCIM token');
        $rows = [];
        try { $st = self::db()->prepare("SELECT id,name FROM team WHERE tenant_id=? ORDER BY id DESC LIMIT 200"); $st->execute([$a['tenant']]); $rows = $st->fetchAll(\PDO::FETCH_ASSOC) ?: []; } catch (\Throwable $e) {}
        $grp = array_map(fn($r) => ['schemas' => ['urn:ietf:params:scim:schemas:core:2.0:Group'], 'id' => (string)$r['id'], 'displayName' => (string)$r['name'], 'meta' => ['resourceType' => 'Group']], $rows);
        return self::scimJson($res, ['schemas' => ['urn:ietf:params:scim:api:messages:2.0:ListResponse'], 'totalResults' => count($grp), 'Resources' => $grp]);
    }

    public static function scimServiceProviderConfig(Request $req, Response $res): Response
    {
        return self::scimJson($res, [
            'schemas' => ['urn:ietf:params:scim:schemas:core:2.0:ServiceProviderConfig'],
            'patch' => ['supported' => true], 'bulk' => ['supported' => false], 'filter' => ['supported' => true, 'maxResults' => 200],
            'changePassword' => ['supported' => false], 'sort' => ['supported' => false], 'etag' => ['supported' => false],
            'authenticationSchemes' => [['name' => 'OAuth Bearer Token', 'description' => 'SCIM token', 'type' => 'oauthbearertoken', 'primary' => true]],
        ]);
    }

    /* ════════════════ [255차 심화] 그룹→롤 매핑 + KEK 회전 (admin) ════════════════ */
    public static function groupRoleMapGet(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePlan($req, $res, 'enterprise')) return $err;
        self::ensureTables(); $t = self::tenant($req);
        $st = self::db()->prepare("SELECT group_name, role FROM sso_group_role_map WHERE tenant_id=? ORDER BY group_name"); $st->execute([$t]);
        return self::json($res, ['ok' => true, 'mappings' => $st->fetchAll(\PDO::FETCH_ASSOC) ?: []]);
    }
    public static function groupRoleMapSave(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePlan($req, $res, 'enterprise')) return $err;
        self::ensureTables(); $t = self::tenant($req); $pdo = self::db();
        $b = self::body($req); $maps = is_array($b['mappings'] ?? null) ? $b['mappings'] : [];
        $pdo->prepare("DELETE FROM sso_group_role_map WHERE tenant_id=?")->execute([$t]);
        $now = self::now(); $n = 0;
        $ins = $pdo->prepare("INSERT INTO sso_group_role_map(tenant_id,group_name,role,updated_at) VALUES(?,?,?,?)");
        foreach ($maps as $m) {
            $g = trim((string)($m['group_name'] ?? '')); $r = (string)($m['role'] ?? 'member');
            if ($g === '' || !in_array($r, ['manager', 'member'], true)) continue;
            try { $ins->execute([$t, mb_substr($g, 0, 190), $r, $now]); $n++; } catch (\Throwable $e) {}
        }
        return self::json($res, ['ok' => true, 'saved' => $n]);
    }
    /** [255차 심화] KEK 무파괴 회전(admin). 신규 버전 KEK 활성화·기존 암호문 계속 복호화(재암호화 0). */
    public static function rotateKek(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requireAdmin($req, $res)) return $err;
        return self::json($res, Crypto::rotateKek());
    }

    /* ════════════════ 공통 헬퍼 ════════════════ */
    private static function cfgByTenant(\PDO $pdo, string $tenant): ?array
    { $st = $pdo->prepare("SELECT * FROM sso_config WHERE tenant_id=? AND enabled=1"); $st->execute([$tenant]); return $st->fetch(\PDO::FETCH_ASSOC) ?: null; }
    private static function dec(?string $v): string { if (!$v) return ''; try { return Crypto::decrypt($v); } catch (\Throwable $e) { return ''; } }
    private static function fail(Response $res, string $msg): Response
    { return $res->withHeader('Location', self::publicBase() . '/login?sso_error=' . rawurlencode(substr($msg, 0, 120)))->withStatus(302); }

    /** SSO 유저 프로비저닝 — 회사(테넌트) owner 하위 member 로 생성/갱신. 미존재 owner=거부. */
    private static function provisionUser(\PDO $pdo, string $tenant, string $email, string $name, string $provider, string $sub, string $defaultRole, int $autoProvision, string $externalId = '', array $groups = []): int
    {
        $email = strtolower(trim($email));
        // [255차 심화] IdP 그룹 → 롤 매핑(있으면 default 보다 우선). 그룹/매핑 없으면 default 유지.
        $mappedRole = self::roleForGroups($pdo, $tenant, $groups);
        $cur = $pdo->prepare("SELECT id, team_role FROM app_user WHERE LOWER(email)=? AND tenant_id=? LIMIT 1"); $cur->execute([$email, $tenant]);
        $exRow = $cur->fetch(\PDO::FETCH_ASSOC);
        if ($exRow !== false && $exRow) {
            $existing = (int)$exRow['id'];
            $pdo->prepare("UPDATE app_user SET is_active=1, name=COALESCE(NULLIF(?,''),name), oidc_sub=COALESCE(NULLIF(?,''),oidc_sub), oidc_provider=?, scim_external_id=COALESCE(NULLIF(?,''),scim_external_id) WHERE id=?")
                ->execute([$name, $sub, $provider, $externalId, $existing]);
            // 그룹 매핑이 있고 owner 가 아니면 IdP 그룹 기준으로 롤 동기화(IdP=source of truth, owner 강등 금지).
            if ($mappedRole !== '' && (string)($exRow['team_role'] ?? '') !== 'owner' && (string)($exRow['team_role'] ?? '') !== $mappedRole) {
                try { $pdo->prepare("UPDATE app_user SET team_role=? WHERE id=?")->execute([$mappedRole, $existing]); } catch (\Throwable $e) {}
            }
            return $existing;
        }
        if ($autoProvision !== 1) throw new \RuntimeException('auto-provision disabled — user not pre-provisioned');
        $own = $pdo->prepare("SELECT id, plan, plans FROM app_user WHERE tenant_id=? AND team_role='owner' AND is_active=1 LIMIT 1"); $own->execute([$tenant]);
        $owner = $own->fetch(\PDO::FETCH_ASSOC);
        if (!$owner) throw new \RuntimeException('tenant has no owner — cannot provision');
        $role = $mappedRole !== '' ? $mappedRole : (in_array($defaultRole, ['manager', 'member'], true) ? $defaultRole : 'member');
        $hash = password_hash(bin2hex(random_bytes(24)), PASSWORD_BCRYPT);
        $now = self::now();
        $pdo->prepare("INSERT INTO app_user(email,password_hash,name,plan,plans,is_active,created_at,tenant_id,parent_user_id,team_role,oidc_sub,oidc_provider,scim_external_id)
                       VALUES(?,?,?,?,?,1,?,?,?,?,?,?,?)")
            ->execute([$email, $hash, $name, (string)($owner['plan'] ?? 'enterprise'), (string)($owner['plans'] ?? $owner['plan'] ?? 'enterprise'), $now, $tenant, (int)$owner['id'], $role, $sub, $provider, $externalId]);
        return (int)$pdo->lastInsertId();
    }

    private static function issueSession(\PDO $pdo, int $userId): string
    {
        $token = bin2hex(random_bytes(32));
        $exp = gmdate('Y-m-d\TH:i:s\Z', time() + 30 * 24 * 3600);
        $pdo->prepare("INSERT INTO user_session(user_id,token,expires_at,created_at) VALUES(?,?,?,?)")->execute([$userId, $token, $exp, self::now()]);
        return $token;
    }

    /** id_token RS256 검증(JWKS) + aud/iss/exp/nonce. 성공 시 claims, 실패 null. */
    private static function verifyIdToken(string $jwt, string $jwksUrl, string $aud, string $iss, string $nonce): ?array
    {
        $parts = explode('.', $jwt); if (count($parts) !== 3) return null;
        $header = json_decode(self::b64urlDec($parts[0]), true); $claims = json_decode(self::b64urlDec($parts[1]), true);
        if (!is_array($header) || !is_array($claims)) return null;
        $kid = (string)($header['kid'] ?? '');
        $jwks = json_decode(self::httpGet($jwksUrl, []), true);
        if (empty($jwks['keys'])) return null;
        $jwk = null;
        foreach ($jwks['keys'] as $k) { if (($kid === '' || ($k['kid'] ?? '') === $kid) && ($k['kty'] ?? '') === 'RSA') { $jwk = $k; break; } }
        if (!$jwk) return null;
        $pem = self::jwkToPem((string)$jwk['n'], (string)$jwk['e']);
        if (!$pem) return null;
        $signed = $parts[0] . '.' . $parts[1]; $sig = self::b64urlDec($parts[2]);
        if (openssl_verify($signed, $sig, $pem, OPENSSL_ALGO_SHA256) !== 1) return null;
        // 클레임 검증.
        if (isset($claims['exp']) && time() >= (int)$claims['exp']) return null;
        if ($aud !== '' && isset($claims['aud'])) { $a = (array)$claims['aud']; if (!in_array($aud, $a, true)) return null; }
        if ($iss !== '' && isset($claims['iss']) && rtrim((string)$claims['iss'], '/') !== rtrim($iss, '/')) return null;
        if ($nonce !== '' && isset($claims['nonce']) && (string)$claims['nonce'] !== $nonce) return null;
        return $claims;
    }

    /** JWK(n,e) → RSA public key PEM(ASN.1 DER SPKI). */
    private static function jwkToPem(string $n64, string $e64): ?string
    {
        $n = self::b64urlDec($n64); $e = self::b64urlDec($e64);
        if ($n === '' || $e === '') return null;
        $encInt = function (string $bytes): string {
            if (ord($bytes[0]) > 0x7f) $bytes = "\x00" . $bytes; // 양수 보장
            return "\x02" . self::asn1Len(strlen($bytes)) . $bytes;
        };
        $seq = $encInt($n) . $encInt($e);
        $seq = "\x30" . self::asn1Len(strlen($seq)) . $seq;
        $bitStr = "\x03" . self::asn1Len(strlen($seq) + 1) . "\x00" . $seq;
        $algo = "\x30\x0d\x06\x09\x2a\x86\x48\x86\xf7\x0d\x01\x01\x01\x05\x00"; // rsaEncryption OID
        $spki = "\x30" . self::asn1Len(strlen($algo) + strlen($bitStr)) . $algo . $bitStr;
        return "-----BEGIN PUBLIC KEY-----\n" . chunk_split(base64_encode($spki), 64, "\n") . "-----END PUBLIC KEY-----\n";
    }
    private static function asn1Len(int $len): string
    {
        if ($len < 0x80) return chr($len);
        $bytes = ''; while ($len > 0) { $bytes = chr($len & 0xff) . $bytes; $len >>= 8; }
        return chr(0x80 | strlen($bytes)) . $bytes;
    }
    private static function b64urlDec(string $s): string { return base64_decode(strtr($s, '-_', '+/') . str_repeat('=', (4 - strlen($s) % 4) % 4)) ?: ''; }

    /**
     * SAML ds:Signature 검증 — exclusive C14N(DOMNode::C14N) + RSA-SHA256 + digest 대조.
     * [261차 보안] 반환값 변경: bool → 검증에 성공한 "서명된 노드"의 정규화 XML(실패=''). 호출측은
     *   반드시 이 반환 서브트리에서만 신원(NameID/속성)을 추출해 signature-wrapping(XSW)을 차단한다.
     *   또한 Reference URI(#ID)가 실제 서명된 노드를 가리키는지 대조해 서명-대상 스와핑을 방지한다.
     */
    private static function verifySamlSignature(string $xml, string $idpCert): string
    {
        if (trim($idpCert) === '') return '';
        $prev = libxml_use_internal_errors(true);
        $doc = new \DOMDocument();
        // XXE 방어: 엔티티 로딩 차단.
        $ok = $doc->loadXML($xml, LIBXML_NONET | (defined('LIBXML_NOENT') ? 0 : 0));
        libxml_use_internal_errors($prev);
        if (!$ok) return '';
        $xp = new \DOMXPath($doc);
        $xp->registerNamespace('ds', 'http://www.w3.org/2000/09/xmldsig#');
        $sig = $xp->query('//ds:Signature')->item(0);
        if (!$sig) return '';
        $signedInfo = $xp->query('ds:SignedInfo', $sig)->item(0);
        $sigValNode = $xp->query('ds:SignatureValue', $sig)->item(0);
        $refNodeQ   = $xp->query('ds:SignedInfo/ds:Reference', $sig)->item(0);
        $digestNode = $xp->query('ds:SignedInfo/ds:Reference/ds:DigestValue', $sig)->item(0);
        if (!$signedInfo || !$sigValNode || !$digestNode || !$refNodeQ) return '';
        $sigVal = base64_decode(preg_replace('/\s+/', '', $sigValNode->nodeValue)) ?: '';
        $digest = base64_decode(preg_replace('/\s+/', '', $digestNode->nodeValue)) ?: '';
        // 1) SignedInfo 서명 검증.
        $c14nSignedInfo = $signedInfo->C14N(true, false); // exclusive, no comments
        $pubPem = "-----BEGIN " . "CERTIFICATE-----\n" . chunk_split(preg_replace('/\s+/', '', $idpCert), 64, "\n") . "-----END CERTIFICATE-----\n";
        $pub = @openssl_pkey_get_public($pubPem);
        if (!$pub) return '';
        if (openssl_verify($c14nSignedInfo, $sigVal, $pub, OPENSSL_ALGO_SHA256) !== 1) return '';
        // 2) 참조 요소(서명된 노드) 결정 — Reference URI(#ID)가 있으면 그 ID의 노드를, 없으면 서명 부모를.
        //    URI 기반 노드결정으로 서명이 실제로 "그 노드"를 보증함을 확인(XSW 방어의 핵심).
        $refUri = (string)$refNodeQ->getAttribute('URI');
        $refNode = null;
        if ($refUri !== '' && $refUri[0] === '#') {
            $targetId = substr($refUri, 1);
            // ID 속성 후보(SAML: AssertionID/ID) 전수 탐색.
            foreach ($xp->query('//*[@ID or @AssertionID]') as $el) {
                if ($el->getAttribute('ID') === $targetId || $el->getAttribute('AssertionID') === $targetId) { $refNode = $el; break; }
            }
            if (!$refNode) return ''; // URI가 가리키는 서명대상 노드를 찾지 못하면 거부.
        } else {
            $refNode = $sig->parentNode; // enveloped(URI="") 폴백.
        }
        if (!$refNode) return '';
        $clone = $refNode->cloneNode(true);
        // clone 내부 Signature 제거(enveloped).
        $innerSig = null;
        foreach ($clone->childNodes as $c) { if ($c->localName === 'Signature' && $c->namespaceURI === 'http://www.w3.org/2000/09/xmldsig#') { $innerSig = $c; break; } }
        if ($innerSig) $clone->removeChild($innerSig);
        $c14nRef = $clone->C14N(true, false);
        $calc = hash('sha256', $c14nRef, true);
        if (!hash_equals($digest, $calc)) return '';
        // 검증 성공: 서명된 노드의 정규화 XML 반환(호출측 신원추출 소스).
        return $c14nRef;
    }

    private static function samlAttr(string $xml, string $name): string
    {
        if ($name === '') return '';
        $pat = '/<(?:saml2?:)?Attribute[^>]*Name="' . preg_quote($name, '/') . '"[^>]*>.*?<(?:saml2?:)?AttributeValue[^>]*>([^<]+)<\/(?:saml2?:)?AttributeValue>/is';
        if (preg_match($pat, $xml, $m)) return trim($m[1]);
        return '';
    }

    private static function httpGet(string $url, array $headers): string
    {
        if (!function_exists('curl_init')) return '';
        $ch = curl_init($url);
        curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_HTTPHEADER => $headers, CURLOPT_TIMEOUT => 15, CURLOPT_CONNECTTIMEOUT => 8, CURLOPT_SSL_VERIFYPEER => true, CURLOPT_SSL_VERIFYHOST => 2]);
        $r = curl_exec($ch); curl_close($ch);
        return $r === false ? '' : (string)$r;
    }
    private static function httpPostForm(string $url, array $form): array
    {
        if (!function_exists('curl_init')) return [];
        $ch = curl_init($url);
        curl_setopt_array($ch, [CURLOPT_POST => true, CURLOPT_POSTFIELDS => http_build_query($form), CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => ['Content-Type: application/x-www-form-urlencoded', 'Accept: application/json'],
            CURLOPT_TIMEOUT => 15, CURLOPT_CONNECTTIMEOUT => 8, CURLOPT_SSL_VERIFYPEER => true, CURLOPT_SSL_VERIFYHOST => 2]);
        $r = curl_exec($ch); curl_close($ch);
        if ($r === false) return [];
        $j = json_decode((string)$r, true);
        return is_array($j) ? $j : [];
    }
}
