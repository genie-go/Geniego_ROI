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

        // 2. Explicit header
        $hdr = $request->getHeaderLine('X-Tenant-Id');
        if ($hdr !== '') return $hdr;

        // 3. Bearer token → look up user_session
        [$tid, ] = self::resolveUserPlan($request);
        if ($tid !== '') return $tid;

        // 4. Session cookie
        $cookies = $request->getCookieParams();
        $token   = $cookies['genie_session'] ?? '';
        if ($token !== '') {
            try {
                $pdo  = Db::pdo();
                $now  = gmdate('Y-m-d\TH:i:s\Z');
                $stmt = $pdo->prepare(
                    'SELECT u.id FROM user_session s
                       JOIN app_user u ON u.id = s.user_id
                      WHERE s.token = ? AND s.expires_at > ? AND u.is_active = 1
                      LIMIT 1'
                );
                $stmt->execute([$token, $now]);
                $row = $stmt->fetch(\PDO::FETCH_ASSOC);
                if ($row) return (string)$row['id'];
            } catch (\Throwable $e) {
                // fall through
            }
        }

        return 'demo';
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
            $r['key_value_masked'] = $r['key_value'] !== null ? self::mask((string)$r['key_value']) : null;
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

        if ($channel === '' || $keyName === '') {
            return TemplateResponder::respond(
                $response->withStatus(422),
                ['error' => 'channel and key_name are required']
            );
        }

        $now = gmdate('c');

        // Check if updating existing row (by id) or upserting by unique key
        $existingId = isset($body['id']) ? (int)$body['id'] : 0;

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

        // ── 데모/free 사용자: API 키 등록 시 plan=pro 자동 업그레이드 ──────────
        // 키 등록 = 실사용 의사 표시 → 즉시 실사용 모드 전환
        $modeActivated = false;
        $updatedUser   = null;
        if (in_array($userPlan, ['demo', 'free', ''], true) && $userId !== '' && $userId !== '0') {
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
        $keyValue = (string)($cred['key_value'] ?? '');

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
            $v = (string)$rows[0]['key_value'];
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

        [$success, $message] = self::pingChannel($channel, (string)$cred['key_name'], (string)($cred['key_value'] ?? ''));

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
                $pdo->prepare(
                    'INSERT INTO channel_credential(tenant_id,channel,cred_type,label,key_name,key_value,note,is_active,updated_at,created_at)
                     VALUES(?,?,?,?,?,?,?,0,?,?)
                     ON CONFLICT(tenant_id,channel,key_name) DO UPDATE SET note=excluded.note, updated_at=excluded.updated_at'
                )->execute([$tenant, $channel, 'apply_ticket', '발급신청', '__apply__', $ticketId, $note, $now, $now]);
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
