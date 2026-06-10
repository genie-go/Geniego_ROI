<?php
declare(strict_types=1);

namespace Genie\Handlers;

use Genie\Db;
use Genie\TemplateResponder;
use PDO;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

/**
 * v423 Channel Credential Management
 *
 * Stores external API keys / tokens for each marketing/commerce channel.
 * Key values are stored in plain text (masked on read) – no server-side encryption
 * as credentials are needed for real API calls.
 *
 * Routes:
 *   GET    /v423/creds              list all creds for tenant (values masked)
 *   POST   /v423/creds              upsert a credential
 *   DELETE /v423/creds/{id}         delete a credential
 *   POST   /v423/creds/{id}/test    ping-test the credential
 */
final class ChannelCreds
{
    /**
     * Resolve tenant_id from (in order):
     *  1. auth_tenant request attribute set by Auth middleware
     *  2. X-Tenant-Id header
     *  3. genie_session cookie → user_session table look-up
     *  4. fallback 'demo'
     */
    private static function tenantId(Request $request): string
    {
        // 1. Auth middleware already resolved it
        $attr = $request->getAttribute('auth_tenant', '');
        if ($attr !== '') return (string)$attr;

        // 184차 P0 보안: 무인증 X-Tenant-Id 원시 헤더 신뢰 제거.
        // 이 라우트(/v423/creds)는 index.php public bypass 라 미들웨어 auth_tenant 가 없을 수 있는데,
        // 과거엔 클라이언트가 보낸 X-Tenant-Id 헤더를 그대로 신뢰해 임의 테넌트의 채널 자격증명(Meta/
        // Google/Coupang API키)을 무인증으로 조회·변조할 수 있었다(크로스테넌트 read/write 취약점).
        // 이제 테넌트는 반드시 인증된 세션(Bearer 토큰 / genie_session 쿠키)의 tenant_id 로만 해석한다.
        // 둘 다 없으면 'demo' 로 한정 → 공격자가 특정 실 테넌트를 표적할 수 없다.
        $st = self::sessionTenant($request);
        if ($st !== '') return $st;

        return 'demo';
    }

    /**
     * 184차 P0: 인증된 세션(Bearer user_session 토큰 또는 genie_session 쿠키)에서
     * 격리 테넌트 식별자(tenant_id, owner='acct_<id>')를 해석한다. UserAuth::resolveTenantId 와 동일 의미
     * (하위계정은 상위 owner tenant 상속, 미설정 owner 는 'acct_<id>'). 인증 없으면 '' 반환.
     * ※ resolveUserPlan() 의 [0]=app_user.id 와 달리 여기서는 격리 키(tenant_id)를 반환한다.
     */
    private static function sessionTenant(Request $request): string
    {
        $token = '';
        $auth  = $request->getHeaderLine('Authorization');
        if (strpos($auth, 'Bearer ') === 0) {
            $t = substr($auth, 7);
            if ($t !== '' && !str_starts_with($t, 'local_demo_')) $token = $t;
        }
        if ($token === '') {
            $cookies = $request->getCookieParams();
            $token   = $cookies['genie_session'] ?? '';
        }
        if ($token === '') return '';
        try {
            $pdo  = Db::pdo();
            $now  = gmdate('Y-m-d\TH:i:s\Z');
            $stmt = $pdo->prepare(
                'SELECT u.id, u.tenant_id, u.parent_user_id FROM user_session s
                   JOIN app_user u ON u.id = s.user_id
                  WHERE s.token = ? AND s.expires_at > ? AND u.is_active = 1
                  LIMIT 1'
            );
            $stmt->execute([$token, $now]);
            $row = $stmt->fetch(\PDO::FETCH_ASSOC);
            if (!$row) return '';
            $tid = trim((string)($row['tenant_id'] ?? ''));
            if ($tid !== '') return $tid;
            $pid = (int)($row['parent_user_id'] ?? 0);
            if ($pid > 0) {
                $ps = $pdo->prepare('SELECT tenant_id FROM app_user WHERE id = ? LIMIT 1');
                $ps->execute([$pid]);
                $ptid = trim((string)($ps->fetchColumn() ?: ''));
                return $ptid !== '' ? $ptid : ('acct_' . $pid);
            }
            return 'acct_' . (int)$row['id'];
        } catch (\Throwable $e) {
            return '';
        }
    }

    /**
     * Resolve [tenant_id, plan] from Bearer token in Authorization header.
     * Returns ['', 'demo'] if not found.
     */
    private static function resolveUserPlan(Request $request): array
    {
        $auth = $request->getHeaderLine('Authorization');
        if (strpos($auth, 'Bearer ') !== 0) return ['', 'demo'];
        $token = substr($auth, 7);
        if ($token === '' || str_starts_with($token, 'local_demo_')) return ['', 'demo'];

        try {
            $pdo  = Db::pdo();
            $now  = gmdate('Y-m-d\TH:i:s\Z');

            // Try user_session table (session tokens from /auth/login or /auth/demo)
            $stmt = $pdo->prepare(
                'SELECT u.id, u.plan FROM user_session s
                   JOIN app_user u ON u.id = s.user_id
                  WHERE s.token = ? AND s.expires_at > ? AND u.is_active = 1
                  LIMIT 1'
            );
            $stmt->execute([$token, $now]);
            $row = $stmt->fetch(\PDO::FETCH_ASSOC);
            if ($row) {
                return [(string)$row['id'], (string)($row['plan'] ?? 'demo')];
            }
        } catch (\Throwable $e) {
            // DB not available
        }
        return ['', 'demo'];
    }

    /** Returns true if this request is from a demo/free-tier user */
    private static function isDemoRequest(Request $request): bool
    {
        [, $plan] = self::resolveUserPlan($request);
        return in_array($plan, ['demo', 'free', ''], true);
    }


    /** Mask all but first 4 and last 4 characters */
    private static function mask(string $val): string
    {
        $len = mb_strlen($val);
        if ($len <= 8) return str_repeat('*', $len);
        return mb_substr($val, 0, 4) . str_repeat('*', max(0, $len - 8)) . mb_substr($val, -4);
    }

    // ── GET /v423/creds ─────────────────────────────────────────────────────
    public static function list(Request $request, Response $response, array $args): Response
    {
        $pdo    = Db::pdo();
        $tenant = self::tenantId($request);
        $q      = $request->getQueryParams();
        $channel = isset($q['channel']) ? trim((string)$q['channel']) : '';

        $sql  = 'SELECT id, tenant_id, channel, cred_type, label, key_name, key_value, is_active, note, last_tested_at, test_status, updated_at, created_at FROM channel_credential WHERE tenant_id=?';
        $bind = [$tenant];
        if ($channel !== '') {
            $sql  .= ' AND channel=?';
            $bind[] = $channel;
        }
        $sql .= ' ORDER BY channel, key_name';

        $stmt = $pdo->prepare($sql);
        $stmt->execute($bind);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Mask key values
        foreach ($rows as &$r) {
            $r['key_value_masked'] = $r['key_value'] !== null ? self::mask(\Genie\Crypto::decrypt((string)$r['key_value'])) : null;
            unset($r['key_value']);
        }
        unset($r);

        return TemplateResponder::respond($response, [
            'ok'    => true,
            'count' => count($rows),
            'creds' => $rows,
        ]);
    }

    // ── POST /v423/creds ────────────────────────────────────────────────────
    /**
     * 플랜별 연동 가능 채널 수 한도. -1 = 무제한.
     * 유료(starter 이상)/admin → 무제한. free/demo/'' → plan_config.limits.channels 우선,
     * 미설정 시 기본 3(사방넷 무료 모델). 202차.
     */
    private static function channelLimitForPlan(PDO $pdo, string $plan): int
    {
        $plan = strtolower(trim($plan));
        if (in_array($plan, ['starter', 'growth', 'pro', 'enterprise', 'admin'], true)) {
            return -1; // 무제한
        }
        // free / demo / '' — plan_config 한도 우선
        try {
            $row = $pdo->prepare('SELECT limits_json FROM plan_config WHERE plan_id=? LIMIT 1');
            $row->execute([$plan !== '' ? $plan : 'free']);
            $lj = $row->fetchColumn();
            if ($lj) {
                $lim = json_decode((string)$lj, true);
                if (is_array($lim) && isset($lim['channels']) && is_numeric($lim['channels'])) {
                    return (int)$lim['channels']; // -1(무제한) 포함 admin 설정 존중
                }
            }
        } catch (\Throwable $e) { /* plan_config 부재 → 기본값 */ }
        return 3; // FREE_CHANNEL_LIMIT 기본
    }

    public static function upsert(Request $request, Response $response, array $args): Response
    {
        // ── 주의: 데모 사용자도 API 키 등록 가능 ──────────────────────────────
        // 데모→실사용 전환의 핵심 트리거: 키 등록 시 plan=pro 자동 업그레이드
        [$userId, $userPlan] = self::resolveUserPlan($request);

        $pdo    = Db::pdo();
        $tenant = self::tenantId($request);
        $body   = (array)($request->getParsedBody() ?? []);

        $channel  = trim((string)($body['channel']   ?? ''));
        $credType = trim((string)($body['cred_type'] ?? 'api_key'));
        $label    = trim((string)($body['label']     ?? ''));
        $keyName  = trim((string)($body['key_name']  ?? ''));
        $keyValue = trim((string)($body['key_value'] ?? ''));
        $note     = trim((string)($body['note']      ?? ''));

        // ★ 202차 은행급: 비밀값은 AES-256-GCM 암호화 저장. 빈 값은 "미덮어씀"이므로 그대로 둠.
        if ($keyValue !== '') $keyValue = \Genie\Crypto::encrypt($keyValue);

        if ($channel === '' || $keyName === '') {
            return TemplateResponder::respond(
                $response->withStatus(422),
                ['error' => 'channel and key_name are required']
            );
        }

        $now = gmdate('c');

        // Check if updating existing row (by id) or upserting by unique key
        $existingId = isset($body['id']) ? (int)$body['id'] : 0;

        // ── Free 채널 수 제한 (202차: 사방넷 무료 모델 — 채널 N개 평생 무료) ────────
        //   신규 distinct 채널 등록이 플랜 한도를 넘으면 차단(업그레이드 유도).
        //   기존 채널의 키 추가/수정(예: meta_ads 의 ad_account_id 추가)은 허용(채널 수 불변).
        //   ★ 실제 세션 사용자(userId 확인)에게만 적용 — api_key/프로그래매틱(세션 미해결,
        //     userId='') 호출은 관리·유료 테넌트이므로 제한 제외(오작동 방지).
        $channelLimit = self::channelLimitForPlan($pdo, $userPlan); // -1 = 무제한
        if ($channelLimit >= 0 && $existingId <= 0 && $userId !== '' && $userId !== '0') {
            try {
                $cs = $pdo->prepare('SELECT DISTINCT channel FROM channel_credential WHERE tenant_id=? AND is_active=1');
                $cs->execute([$tenant]);
                $existingChannels = array_map(static fn($r) => $r['channel'], $cs->fetchAll(PDO::FETCH_ASSOC));
            } catch (\Throwable $e) {
                $existingChannels = [];
            }
            $isNewChannel = !in_array($channel, $existingChannels, true);
            if ($isNewChannel && count($existingChannels) >= $channelLimit) {
                return TemplateResponder::respond($response->withStatus(402), [
                    'ok'      => false,
                    'error'   => 'channel_limit_reached',
                    'limit'   => $channelLimit,
                    'current' => count($existingChannels),
                    'message' => "현재 플랜은 판매·마케팅 채널을 {$channelLimit}개까지 무료로 연동할 수 있습니다. 더 많은 채널을 연동하려면 플랜을 업그레이드하세요.",
                ]);
            }
        }

        if ($existingId > 0) {
            // Update existing by id
            $stmt = $pdo->prepare(
                'UPDATE channel_credential SET channel=?, cred_type=?, label=?, key_name=?, key_value=?, note=?, updated_at=? WHERE id=? AND tenant_id=?'
            );
            if ($keyValue !== '') {
                $stmt->execute([$channel, $credType, $label, $keyName, $keyValue, $note, $now, $existingId, $tenant]);
            } else {
                // Don't overwrite value if empty (leave existing)
                $stmt2 = $pdo->prepare(
                    'UPDATE channel_credential SET channel=?, cred_type=?, label=?, key_name=?, note=?, updated_at=? WHERE id=? AND tenant_id=?'
                );
                $stmt2->execute([$channel, $credType, $label, $keyName, $note, $now, $existingId, $tenant]);
            }
        } else {
            // Upsert by (tenant_id, channel, key_name)
            $driver = Db::pdo()->getAttribute(PDO::ATTR_DRIVER_NAME);
            if ($driver === 'mysql') {
                $stmt = $pdo->prepare(
                    'INSERT INTO channel_credential(tenant_id,channel,cred_type,label,key_name,key_value,note,is_active,updated_at,created_at)
                     VALUES(?,?,?,?,?,?,?,1,?,?)
                     ON DUPLICATE KEY UPDATE cred_type=VALUES(cred_type), label=VALUES(label), key_value=IF(VALUES(key_value)=\'\',key_value,VALUES(key_value)), note=VALUES(note), is_active=1, updated_at=VALUES(updated_at)'
                );
                $stmt->execute([$tenant, $channel, $credType, $label, $keyName, $keyValue, $note, $now, $now]);
            } else {
                // SQLite: INSERT OR REPLACE
                $stmt = $pdo->prepare(
                    'INSERT INTO channel_credential(tenant_id,channel,cred_type,label,key_name,key_value,note,is_active,updated_at,created_at)
                     VALUES(?,?,?,?,?,?,?,1,?,?)
                     ON CONFLICT(tenant_id,channel,key_name) DO UPDATE SET
                       cred_type=excluded.cred_type, label=excluded.label,
                       key_value=CASE WHEN excluded.key_value=\'\' THEN key_value ELSE excluded.key_value END,
                       note=excluded.note, is_active=1, updated_at=excluded.updated_at'
                );
                $stmt->execute([$tenant, $channel, $credType, $label, $keyName, $keyValue, $note, $now, $now]);
            }
        }

        $newId = (int)$pdo->lastInsertId();

        // ── 데모 사용자: API 키 등록 시 plan=pro 자동 업그레이드(실사용 체험 전환) ──
        //   ★ 202차: free/'' 는 자동 업그레이드 제외 → "Free 채널 N개 평생 무료" 모델 유지.
        //     (free 는 한도 내 채널을 무료로 계속 사용, 한도 초과 시에만 위에서 차단·업그레이드 유도)
        $modeActivated = false;
        $updatedUser   = null;
        if (in_array($userPlan, ['demo'], true) && $userId !== '' && $userId !== '0') {
            $uid = (int)$userId;
            if ($uid > 0) {
                try {
                    $expiresAt = gmdate('Y-m-d\\TH:i:s\\Z', time() + 365 * 86400); // 1년
                    // plan 업그레이드 (subscription_expires_at 컬럼 있는 경우)
                    try {
                        $pdo->prepare(
                            "UPDATE app_user SET plan='pro', subscription_expires_at=?, subscription_cycle='api_key', updated_at=? WHERE id=?"
                        )->execute([$expiresAt, $now, $uid]);
                    } catch (\Throwable $e) {
                        $pdo->prepare("UPDATE app_user SET plan='pro', updated_at=? WHERE id=?")->execute([$now, $uid]);
                    }

                    // 업그레이드된 user 정보 조회 (프론트엔드 상태 즉시 반영용)
                    try {
                        $uRow = $pdo->prepare("SELECT id,email,name,plan,company,subscription_expires_at FROM app_user WHERE id=? LIMIT 1");
                        $uRow->execute([$uid]);
                        $uData = $uRow->fetch(\PDO::FETCH_ASSOC);
                        if ($uData) {
                            $updatedUser = [
                                'id'                      => (int)$uData['id'],
                                'email'                   => $uData['email'] ?? '',
                                'name'                    => $uData['name'] ?? '',
                                'plan'                    => 'pro',
                                'company'                 => $uData['company'] ?? '',
                                'subscription_status'     => 'active',
                                'subscription_expires_at' => $expiresAt,
                            ];
                        }
                    } catch (\Throwable $e) {}

                    $modeActivated = true;
                } catch (\Throwable $e) {
                    error_log('[ChannelCreds::upsert] plan upgrade failed: ' . $e->getMessage());
                }
            }
        }

        $resp = [
            'ok'             => true,
            'id'             => $newId,
            'channel'        => $channel,
            'key_name'       => $keyName,
            'mode_activated' => $modeActivated,
        ];
        if ($updatedUser !== null) {
            $resp['user'] = $updatedUser;
        }
        return TemplateResponder::respond($response, $resp);
    }


    // ── DELETE /v423/creds/{id} ─────────────────────────────────────────────
    public static function delete(Request $request, Response $response, array $args): Response
    {
        $pdo    = Db::pdo();
        $tenant = self::tenantId($request);
        $id     = (int)($args['id'] ?? 0);

        $stmt = $pdo->prepare('DELETE FROM channel_credential WHERE id=? AND tenant_id=?');
        $stmt->execute([$id, $tenant]);

        if ($stmt->rowCount() === 0) {
            return TemplateResponder::respond($response->withStatus(404), ['error' => 'Credential not found']);
        }
        return TemplateResponder::respond($response, ['ok' => true, 'deleted_id' => $id]);
    }

    // ── POST /v423/creds/{id}/test ─────────────────────────────────────────
    public static function test(Request $request, Response $response, array $args): Response
    {
        $pdo    = Db::pdo();
        $tenant = self::tenantId($request);
        $id     = (int)($args['id'] ?? 0);

        // Load credential (with full value for testing)
        $stmt = $pdo->prepare('SELECT * FROM channel_credential WHERE id=? AND tenant_id=?');
        $stmt->execute([$id, $tenant]);
        $cred = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$cred) {
            return TemplateResponder::respond($response->withStatus(404), ['error' => 'Credential not found']);
        }

        $channel  = (string)$cred['channel'];
        $keyName  = (string)$cred['key_name'];
        $keyValue = \Genie\Crypto::decrypt((string)($cred['key_value'] ?? '')); // 복호화 후 실 ping

        [$success, $message] = self::pingChannel($channel, $keyName, $keyValue);

        $now    = gmdate('c');
        $status = $success ? 'ok' : 'error';
        $pdo->prepare(
            'UPDATE channel_credential SET last_tested_at=?, test_status=? WHERE id=?'
        )->execute([$now, $status, $id]);

        return TemplateResponder::respond($response, [
            'ok'       => $success,
            'channel'  => $channel,
            'status'   => $status,
            'message'  => $message,
            'tested_at'=> $now,
        ]);
    }

    // ── Channel ping helpers ────────────────────────────────────────────────

    /** Returns [bool $success, string $message] */
    private static function pingChannel(string $channel, string $keyName, string $keyValue): array
    {
        if ($keyValue === '') {
            return [false, 'No key value configured'];
        }

        return match (true) {
            in_array($channel, ['meta_ads', 'meta'], true) => self::pingMeta($keyValue),
            in_array($channel, ['tiktok', 'tiktok_business'], true) => self::pingTikTok($keyValue),
            in_array($channel, ['google_ads'], true) => self::pingGoogle($keyValue),
            in_array($channel, ['amazon_spapi', 'amazon'], true) => [true, 'Amazon SP-API: credential stored (full OAuth test requires refresh flow)'],
            in_array($channel, ['shopify'], true) => self::pingShopify($keyValue),
            in_array($channel, ['naver', 'naver_smartstore'], true) => [true, 'Naver: credential stored (API test requires additional params)'],
            in_array($channel, ['coupang'], true) => [true, 'Coupang: credential stored (HMAC test requires additional params)'],
            in_array($channel, ['kakao', 'kakao_moment'], true) => self::pingKakao($keyValue),
            default => [true, "Channel [{$channel}] credential saved (no live test available)"],
        };
    }

    private static function httpGet(string $url, array $headers = []): array
    {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => 10,
            CURLOPT_HTTPHEADER     => array_map(
                fn($k, $v) => "$k: $v",
                array_keys($headers),
                array_values($headers)
            ),
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_USERAGENT      => 'Geniego-ROI/v423',
        ]);
        $raw  = curl_exec($ch);
        $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $err  = curl_error($ch) ?: null;
        curl_close($ch);
        $body = ($err === null && $raw) ? (json_decode((string)$raw, true) ?? []) : [];
        return [$code, $body, $err];
    }

    private static function pingMeta(string $accessToken): array
    {
        [$code, $body, $err] = self::httpGet(
            'https://graph.facebook.com/v18.0/me?fields=id,name&access_token=' . urlencode($accessToken)
        );
        if ($err) return [false, "Connection error: $err"];
        if ($code === 200 && isset($body['id'])) {
            return [true, "Meta: connected as " . ($body['name'] ?? $body['id'])];
        }
        $errMsg = $body['error']['message'] ?? "HTTP $code";
        return [false, "Meta: $errMsg"];
    }

    private static function pingTikTok(string $accessToken): array
    {
        [$code, $body, $err] = self::httpGet(
            'https://business-api.tiktok.com/open_api/v1.3/user/info/',
            ['Access-Token' => $accessToken]
        );
        if ($err) return [false, "Connection error: $err"];
        $ttCode = (int)($body['code'] ?? -1);
        if ($ttCode === 0) return [true, 'TikTok Business: connected'];
        $msg = $body['message'] ?? "HTTP $code / TT code $ttCode";
        return [false, "TikTok: $msg"];
    }

    private static function pingGoogle(string $accessToken): array
    {
        [$code, $body, $err] = self::httpGet(
            'https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=' . urlencode($accessToken)
        );
        if ($err) return [false, "Connection error: $err"];
        if ($code === 200 && isset($body['sub'])) {
            return [true, "Google: token valid, scope=" . ($body['scope'] ?? 'n/a')];
        }
        return [false, "Google: " . ($body['error_description'] ?? "HTTP $code")];
    }

    private static function pingShopify(string $apiKey): array
    {
        // Without the shop domain we can only confirm key format
        if (strlen($apiKey) >= 32) {
            return [true, 'Shopify: API key format valid (live test requires shop domain)'];
        }
        return [false, 'Shopify: API key appears too short'];
    }

    private static function pingKakao(string $accessToken): array
    {
        [$code, $body, $err] = self::httpGet(
            'https://kapi.kakao.com/v2/user/me',
            ['Authorization' => 'Bearer ' . $accessToken]
        );
        if ($err) return [false, "Connection error: $err"];
        if ($code === 200 && isset($body['id'])) return [true, 'Kakao: connected, id=' . $body['id']];
        $msg = $body['msg'] ?? "HTTP $code";
        return [false, "Kakao: $msg"];
    }

    // ── GET /v423/creds/summary — ConnectorSyncContext 전역 동기화용 ──────────
    /**
     * 모든 채널의 연결 상태 요약을 한 번에 반환.
     * ConnectorSyncContext의 KNOWN_CHANNELS 목록과 DB를 대조해
     * 각 채널의 keyCount와 hasRequired 여부를 반환.
     */
    public static function summary(Request $request, Response $response, array $args): Response
    {
        $pdo    = Db::pdo();
        $tenant = self::tenantId($request);

        // 채널별 등록된 키 개수 집계
        $stmt = $pdo->prepare(
            'SELECT channel, COUNT(*) as key_count FROM channel_credential
             WHERE tenant_id=? AND is_active=1
             GROUP BY channel'
        );
        $stmt->execute([$tenant]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $channels = [];
        foreach ($rows as $r) {
            $channels[(string)$r['channel']] = [
                'keyCount'    => (int)$r['key_count'],
                'hasRequired' => (int)$r['key_count'] > 0,
            ];
        }

        return TemplateResponder::respond($response, [
            'ok'       => true,
            'tenant'   => $tenant,
            'channels' => $channels,
        ]);
    }


    /**
     * SmartConnect 단일 채널 스캔:
     * DB에 등록된 키가 있으면 keyCount + maskedPreview 반환.
     * 없으면 keyCount=0.
     */
    public static function scan(Request $request, Response $response, array $args): Response
    {
        $pdo     = Db::pdo();
        $tenant  = self::tenantId($request);
        $q       = $request->getQueryParams();
        $channel = trim((string)($q['channel'] ?? ''));

        if ($channel === '') {
            return TemplateResponder::respond($response->withStatus(422), ['error' => 'channel required']);
        }

        $stmt = $pdo->prepare(
            'SELECT id, key_name, key_value, test_status FROM channel_credential
             WHERE tenant_id=? AND channel=? AND is_active=1
             ORDER BY key_name'
        );
        $stmt->execute([$tenant, $channel]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $keyCount = count($rows);
        $keyPreview = '';
        if ($keyCount > 0 && !empty($rows[0]['key_value'])) {
            $v = \Genie\Crypto::decrypt((string)$rows[0]['key_value']);
            $keyPreview = 'db_' . mb_substr($v, 0, 4) . str_repeat('•', min(8, max(0, mb_strlen($v) - 4)));
        }

        return TemplateResponder::respond($response, [
            'ok'         => true,
            'channel'    => $channel,
            'keyCount'   => $keyCount,
            'keyPreview' => $keyPreview,
            'keys'       => array_map(fn($r) => ['key_name' => $r['key_name'], 'test_status' => $r['test_status']], $rows),
        ]);
    }

    // ── POST /v423/connectors/{channel}/test ───────────────────────────────────
    /**
     * SmartConnect 채널 키 테스트:
     * DB에서 해당 채널의 첫 번째 키를 찾아 pingChannel() 실행.
     */
    public static function channelTest(Request $request, Response $response, array $args): Response
    {
        $pdo     = Db::pdo();
        $tenant  = self::tenantId($request);
        $channel = trim((string)($args['channel'] ?? ''));

        if ($channel === '') {
            return TemplateResponder::respond($response->withStatus(422), ['error' => 'channel required']);
        }

        $stmt = $pdo->prepare(
            'SELECT id, key_name, key_value FROM channel_credential
             WHERE tenant_id=? AND channel=? AND is_active=1
             ORDER BY key_name LIMIT 1'
        );
        $stmt->execute([$tenant, $channel]);
        $cred = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$cred) {
            return TemplateResponder::respond($response, [
                'ok'      => false,
                'channel' => $channel,
                'live'    => false,
                'message' => '등록된 API 키가 없습니다. 먼저 API 키를 등록하세요.',
            ]);
        }

        [$success, $message] = self::pingChannel($channel, (string)$cred['key_name'], \Genie\Crypto::decrypt((string)($cred['key_value'] ?? '')));

        // 테스트 결과 저장
        $now    = gmdate('c');
        $status = $success ? 'ok' : 'error';
        $pdo->prepare('UPDATE channel_credential SET last_tested_at=?, test_status=? WHERE id=?')
            ->execute([$now, $status, $cred['id']]);

        return TemplateResponder::respond($response, [
            'ok'        => $success,
            'channel'   => $channel,
            'live'      => $success,
            'status'    => $status,
            'message'   => $message,
            'tested_at' => $now,
        ]);
    }

    // ── POST /v423/connectors/apply ────────────────────────────────────────────
    /**
     * SmartConnect 발급신청:
     * 회원정보 기반 API 키 발급신청을 기록하고 티켓 ID 발급.
     * (실제로는 이메일/슬랙으로 전달하거나 외부 신청 시스템 연동)
     */
    public static function apply(Request $request, Response $response, array $args): Response
    {
        $pdo    = Db::pdo();
        $tenant = self::tenantId($request);
        $body   = (array)($request->getParsedBody() ?? []);

        $channel         = trim((string)($body['channel']         ?? ''));
        $memberName      = trim((string)($body['member_name']     ?? ''));
        $memberEmail     = trim((string)($body['member_email']    ?? ''));
        $businessNumber  = trim((string)($body['business_number'] ?? ''));
        $phone           = trim((string)($body['phone']           ?? ''));
        $company         = trim((string)($body['company']         ?? ''));
        $requestedAt     = trim((string)($body['requested_at']    ?? gmdate('c')));

        if ($channel === '') {
            return TemplateResponder::respond($response->withStatus(422), ['error' => 'channel required']);
        }

        $ticketId = 'APPLY-' . strtoupper(base_convert((string)time(), 10, 36)) . '-' . strtoupper(substr(bin2hex(random_bytes(3)), 0, 6));

        // connector_apply_log 테이블에 저장 (없으면 channel_credential의 note에 기록)
        try {
            $pdo->prepare(
                'INSERT INTO connector_apply_log(tenant_id, channel, ticket_id, member_name, member_email,
                 business_number, phone, company, status, requested_at, created_at)
                 VALUES(?,?,?,?,?,?,?,?,?,?,?)'
            )->execute([
                $tenant, $channel, $ticketId, $memberName, $memberEmail,
                $businessNumber, $phone, $company, 'pending', $requestedAt, gmdate('c'),
            ]);
        } catch (\Throwable $e) {
            // 테이블이 없으면 channel_credential의 note에 신청 정보 기록
            try {
                $now = gmdate('c');
                $note = "apply:{$ticketId}|{$memberEmail}|{$requestedAt}";
                // 209차 sweep: bare ON CONFLICT(SQLite 전용)는 MySQL 1064 → 내부 catch 로 신청노트 무음 미기록.
                //   channel_credential 은 UNIQUE(tenant_id,channel,key_name) 보유 → 드라이버 분기(L295 패턴).
                $applySql = ($pdo->getAttribute(\PDO::ATTR_DRIVER_NAME) === 'mysql')
                    ? 'INSERT INTO channel_credential(tenant_id,channel,cred_type,label,key_name,key_value,note,is_active,updated_at,created_at)
                       VALUES(?,?,?,?,?,?,?,0,?,?)
                       ON DUPLICATE KEY UPDATE note=VALUES(note), updated_at=VALUES(updated_at)'
                    : 'INSERT INTO channel_credential(tenant_id,channel,cred_type,label,key_name,key_value,note,is_active,updated_at,created_at)
                       VALUES(?,?,?,?,?,?,?,0,?,?)
                       ON CONFLICT(tenant_id,channel,key_name) DO UPDATE SET note=excluded.note, updated_at=excluded.updated_at';
                $pdo->prepare($applySql)
                    ->execute([$tenant, $channel, 'apply_ticket', '발급신청', '__apply__', $ticketId, $note, $now, $now]);
            } catch (\Throwable $e2) {
                // 최후 폴백: 로그만 남김
                error_log("[apply] tenant=$tenant channel=$channel ticket=$ticketId email=$memberEmail");
            }
        }

        return TemplateResponder::respond($response, [
            'ok'        => true,
            'ticket_id' => $ticketId,
            'channel'   => $channel,
            'status'    => 'pending',
            'message'   => '발급신청이 접수되었습니다. 1~3 영업일 내 발급 후 자동 연동됩니다.',
        ]);
    }
}
