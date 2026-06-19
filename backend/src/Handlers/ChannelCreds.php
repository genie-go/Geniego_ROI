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
 * Key values are encrypted at rest (AES-256-GCM via Genie\Crypto, 202차+) and masked on read.
 * Decryption (plaintext passthrough for legacy rows) happens just-in-time for real API calls.
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
     *  1. auth_tenant request attribute (api_key 미들웨어가 주입, 위조불가)
     *  2. 인증 세션(Bearer user_session 토큰 / genie_session 쿠키) → user_session ⨝ app_user.tenant_id
     *  3. fallback 'demo'
     * ★[228차 S5 정리] raw X-Tenant-Id 헤더는 신뢰하지 않는다(184차 P0 보안수정으로 제거됨 — 과거 docstring 오기).
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

    /**
     * 209차 P2: 완전 익명(Authorization 없음/junk Bearer) 거부 — 익명이 공유 'demo' 버킷에
     *   자격증명을 R/W·삭제·연결테스트(외부호출)하던 경로 차단(ChannelSync.denyAnon 패턴).
     *   데모 토큰(demo·local_demo_ 계열) 과 실제 세션은 의도대로 허용. api_key 미들웨어가 주입한
     *   auth_tenant 가 있으면 통과(프로그래매틱/유료 테넌트).
     */
    private static function denyAnon(Request $req, Response $res): ?Response
    {
        $attr = $req->getAttribute('auth_tenant', '');
        if ($attr !== '' && $attr !== null) return null;
        if (preg_match('/Bearer\s+(\S+)/i', $req->getHeaderLine('Authorization'), $m)) {
            $tok = $m[1];
            if ($tok === 'demo-token' || str_starts_with($tok, 'demo') || str_starts_with($tok, 'local_demo_')) return null;
            try {
                $st = Db::pdo()->prepare('SELECT 1 FROM user_session s JOIN app_user u ON u.id=s.user_id WHERE s.token=? AND s.expires_at>? AND u.is_active=1 LIMIT 1');
                $st->execute([$tok, gmdate('Y-m-d\TH:i:s\Z')]);
                if ($st->fetchColumn()) return null;
            } catch (\Throwable $e) {}
        }
        return TemplateResponder::respond($res->withStatus(401), ['ok' => false, 'error' => 'unauthorized']);
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
        if ($deny = self::denyAnon($request, $response)) return $deny; // 209차 P2: 익명 demo버킷 쓰기 차단
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

        // [현 차수] ★발급 확인 실검증용 평문 보존(암호화 전). 저장은 암호화본, 검증 ping 은 평문 사용.
        $plainValue = $keyValue;

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

        // [현 차수] ★발급 확인은 '실제 검증'으로만 표기(임의 조작 금지) — 등록만으로 완료 처리하지 않는다.
        //   방금 저장한 토큰/키 필드를 실 채널 API로 즉시 검증(ping)해 test_status 기록 →
        //   라이브 실검증을 genuine 하게 통과한 경우에만 발급 신청을 '완료(발급 확인됨)'로 갱신한다.
        //   미검증(토큰 아님/저장만/검증실패) → 신청은 '처리중(발급 확인 대기)'로만 둔다.
        $verifiableField = in_array($keyName, ['api_key', 'access_token', 'oauth_token', 'oauth_access_token'], true);
        $verified = false;
        if ($tenant !== '' && $tenant !== 'demo' && !str_starts_with($tenant, 'demo') && $verifiableField && $plainValue !== '') {
            try {
                [$vok] = self::pingChannel($channel, $keyName, $plainValue);
                try {
                    $pdo->prepare('UPDATE channel_credential SET last_tested_at=?, test_status=? WHERE tenant_id=? AND channel=? AND key_name=?')
                        ->execute([$now, $vok ? 'ok' : 'error', $tenant, $channel, $keyName]);
                } catch (\Throwable $e) {}
                // soft-ok(저장만 확인) 채널은 발급확인 아님 — 라이브 실검증 채널만 genuine.
                $verified = $vok && self::hasLiveVerify($channel);
            } catch (\Throwable $e) { /* 검증 실패는 무음 — 저장 성공 우선 */ }
        }
        self::markApplyCompleted($pdo, $tenant, $channel, $verified);

        // ── [현 차수 P0] 자격증명 저장 직후 백엔드 자동 동기화 트리거 ───────────────
        //   기존엔 프론트(ApiKeys.handleConnectSave)가 별도 POST 로만 sync 를 호출해,
        //   프로그래매틱/단일폼/API 직접 등록 경로는 cron(최대 5분)까지 미동기화였다.
        //   이제 저장 성공 시 백엔드가 채널 종류에 따라 1회 동기화를 직접 트리거(저장 경로 무관 대칭).
        //   광고 채널 → Connectors::syncAdChannelOnSave(performance_metrics),
        //   커머스 채널 → ChannelSync::syncTenantChannel(channel_orders/products).
        //   데모/익명 테넌트는 skip(오염 차단). 실패는 무음 — 저장 성공이 우선(cron 백업).
        $autoSync = null;
        if ($tenant !== '' && $tenant !== 'demo') {
            try {
                if (Connectors::isAdChannel($channel)) {
                    $autoSync = ['kind' => 'ad', 'result' => Connectors::syncAdChannelOnSave($tenant, $channel)];
                } elseif (ChannelSync::isCommerceChannel($channel)) { // [현 차수] 별칭 인식(silent break 방지)
                    $autoSync = ['kind' => 'commerce', 'result' => ChannelSync::syncTenantChannel($tenant, $channel, $userPlan !== '' ? $userPlan : 'pro')];
                } elseif (($pgProv = PgSettlement::providerForChannel($channel)) !== null) {
                    // [227차 Tier2] PG 정산 채널(stripe/tosspayments/toss/paypal…)도 자격증명 등록 즉시 자동 수집.
                    //   기존엔 PG만 자동 트리거 누락 → 사용자가 /v427/pg/sync 를 수동 호출해야 정산이 들어왔다.
                    $autoSync = ['kind' => 'pg', 'result' => PgSettlement::syncForTenant($pdo, $tenant, $pgProv)];
                } elseif (in_array(strtolower($channel), ['cj', 'lotte', 'hanjin', 'logen', 'epost', 'smarttracker', 'dhl', 'fedex', 'ups', 'ems', 'tnt', 'cj_intl'], true)) {
                    // [228차 S5] 물류 추적 채널도 자격증명 등록 즉시 자동 갱신(광고/커머스/PG 와 대칭). 미배송 송장 보유 시 추적
                    //   갱신(없으면 no-op). 주문 동기화로 적재된 송장이 있으면 즉시 최신 배송상태 반영, cron(*/15) 백업.
                    $autoSync = ['kind' => 'logistics', 'result' => ['refreshed' => Logistics::refreshTenant($pdo, $tenant)]];
                }
            } catch (\Throwable $e) {
                error_log('[ChannelCreds::upsert] auto-sync failed: ' . $e->getMessage());
            }
            // ── [227차] 자격증명 등록 시 writeback 큐 자동 push ──────────────
            //   상품 일괄등록/가격수정이 자격증명 미등록으로 'awaiting_credentials'/'queued' 보류돼 있던 것을
            //   해당 채널 자격증명 등록 즉시 채널로 push(영원히 queued 갭 해소). best-effort·커머스 채널만.
            if (ChannelSync::isCommerceChannel($channel)) {
                try { Catalog::processWritebackQueue($pdo, $tenant, $channel, 100); }
                catch (\Throwable $e) { error_log('[ChannelCreds::upsert] writeback auto-push failed: ' . $e->getMessage()); }
            }
        }

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
            'auto_sync'      => $autoSync, // [현 차수 P0] 저장 직후 백엔드 자동 동기화 결과(null=해당없음)
        ];
        if ($updatedUser !== null) {
            $resp['user'] = $updatedUser;
        }
        return TemplateResponder::respond($response, $resp);
    }


    // ── DELETE /v423/creds/{id} ─────────────────────────────────────────────
    public static function delete(Request $request, Response $response, array $args): Response
    {
        if ($deny = self::denyAnon($request, $response)) return $deny; // 209차 P2
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
        if ($deny = self::denyAnon($request, $response)) return $deny; // 209차 P2: 익명 외부호출 차단
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

        // [현 차수] ★수동 연결 테스트가 라이브 실검증을 통과하면 발급 신청을 '발급 확인됨(완료)'로 갱신.
        //   임의 조작이 아니라 실 채널 API 검증 결과 → 신청자에게 발급 확인 이메일 발송(markApplyCompleted 내부).
        if ($success && self::hasLiveVerify($channel)) {
            self::markApplyCompleted($pdo, $tenant, $channel, true);
        }

        return TemplateResponder::respond($response, [
            'ok'       => $success,
            'channel'  => $channel,
            'status'   => $status,
            'message'  => $message,
            'tested_at'=> $now,
            'verified' => $success && self::hasLiveVerify($channel),
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
            in_array($channel, ['amazon_spapi', 'amazon'], true) => [true, 'Amazon SP-API: 자격증명 저장됨 — 동기화 시 실연동 검증(OAuth refresh)'],
            in_array($channel, ['shopify'], true) => self::pingShopify($keyValue),
            in_array($channel, ['naver', 'naver_smartstore'], true) => [true, 'Naver: 자격증명 저장됨 — 동기화 시 실연동 검증(OAuth+HMAC)'],
            in_array($channel, ['coupang'], true) => [true, 'Coupang: 자격증명 저장됨 — 동기화 시 실연동 검증(HMAC)'],
            in_array($channel, ['adyen'], true) => [true, 'Adyen: 자격증명 저장됨 — 정산 수집 시 실 리포트(Settlement Detail Report)로 검증됩니다.'],
            in_array($channel, ['kakao', 'kakao_moment'], true) => self::pingKakao($keyValue),
            // [현 차수] YouTube Data API 키 실 검증 — 임의 발급확인 금지, 실제 API 호출로 키 유효성 확인.
            in_array($channel, ['youtube'], true) => self::pingYouTube($keyName, $keyValue),
            // ★[현 차수 P0] 거짓양성 차단: 실 어댑터가 있는 채널만 'stored=ok', 미구현 stub 은 정직하게 not-connected.
            //   과거 default=[true,...] 라 PG/물류/국제특송/genericFetch stub 채널이 "테스트 성공"으로 오표시됐다.
            default => self::hasRealAdapter($channel)
                ? [true, "[{$channel}] 자격증명 저장됨 — 동기화 시 실연동 검증됩니다."]
                : [false, "[{$channel}] 전용 어댑터 연동 준비 중입니다. 자격증명은 저장됐으며, 정식 연동 후 자동 동기화됩니다."],
        };
    }

    /**
     * ★[현 차수 P0] 실제 외부 API 어댑터(라이브 fetch/ingest)가 구현된 채널인지 판정.
     *   미구현(stub/genericFetch) 채널이 연결 테스트에서 거짓 'ok'(성공)로 표시되는 것을 방지한다.
     *   목록 동기화 기준: ChannelSync 전용 fetch 어댑터(shopify/amazon/coupang/naver/ebay/tiktok_shop/
     *   rakuten/cafe24) + Connectors 광고 ingest(meta/google/tiktok/naver_sa) + 라이브 ping(kakao).
     */
    private static function hasRealAdapter(string $channel): bool
    {
        // [현 차수] 별칭 인식(ChannelSync::normalizeChannelKey) — 동일 채널의 별칭 표기 누락으로 인한
        //   "실어댑터 있는데 거짓 '준비중'" 오표기 방지. 원본키·canonical키 둘 다 화이트리스트와 대조.
        $list = [
            'meta_ads', 'meta', 'google_ads', 'google', 'tiktok', 'tiktok_business', 'tiktok_shop',
            'naver_sa', 'naver_searchad', 'kakao', 'kakao_moment',
            'shopify', 'amazon', 'amazon_spapi', 'coupang', 'naver', 'naver_smartstore',
            'ebay', 'rakuten', 'cafe24',
            '11st', 'st11', 'gmarket', 'auction', 'lotteon', // 국내 오픈마켓 4종 실어댑터
            // [232차 Sprint2] 글로벌 커머스 실어댑터 9종(ChannelSync fetch) — 거짓 '준비중' 표기 제거.
            'woocommerce', 'magento', 'walmart', 'etsy', 'shopee', 'lazada', 'qoo10', 'yahoo_japan', 'yahoo_jp', 'godomall',
            'stripe', 'tosspayments', 'toss', 'paypal', 'adyen', // PG 정산 실 수집 어댑터(228차 Adyen 추가)
        ];
        if (in_array($channel, $list, true)) return true;
        $c = ChannelSync::normalizeChannelKey($channel);
        return $c !== $channel && in_array($c, $list, true);
    }

    /**
     * [현 차수] ★연결 테스트가 '실제 발급 검증'(라이브 API 호출로 키 유효성 확인)인 채널 판정.
     *   '발급 확인됨' 배지/신청완료는 이 채널들의 실 검증 통과에만 근거한다(임의 조작 금지).
     *   저장만 확인하는 soft-ok 채널(amazon/naver/coupang 등 — ping 이 'stored'만 반환)은 제외.
     */
    private static function hasLiveVerify(string $channel): bool
    {
        $live = ['meta_ads', 'meta', 'tiktok', 'tiktok_business', 'google_ads', 'google', 'kakao', 'kakao_moment', 'youtube'];
        if (in_array($channel, $live, true)) return true;
        $c = ChannelSync::normalizeChannelKey($channel);
        return $c !== $channel && in_array($c, $live, true);
    }

    /** YouTube Data API v3 키 실 검증 — 가벼운 공개 엔드포인트(i18nLanguages) 호출로 키 발급·유효성 확인. */
    private static function pingYouTube(string $keyName, string $apiKey): array
    {
        // 발급 확인은 'API 키'로만 — 채널 ID 등 비-키 필드는 키 행에서 검증하도록 안내.
        if (!in_array($keyName, ['api_key', 'access_token', 'oauth_token', 'key_value'], true)) {
            return [false, 'YouTube 발급 확인은 API 키로 검증됩니다 — API 키 항목을 등록·테스트하세요.'];
        }
        $key = trim($apiKey);
        if ($key === '') return [false, 'YouTube: API 키 미입력'];
        [$code, $body, $err] = self::httpGet('https://www.googleapis.com/youtube/v3/i18nLanguages?part=snippet&hl=ko&key=' . urlencode($key));
        if ($err) return [false, "YouTube 연결 오류: $err"];
        if ($code === 200 && isset($body['items'])) return [true, 'YouTube Data API 키 발급·검증 확인됨'];
        $msg = $body['error']['message'] ?? "HTTP $code";
        return [false, "YouTube 키 검증 실패: $msg"];
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

        // 채널별 등록된 키 개수 + 동기화 상태 집계 ([현 차수] H1: stub 채널 'pending' 노출)
        $hasSync = false;
        try { $hasSync = (bool)$pdo->query("SELECT sync_status FROM channel_credential LIMIT 1") !== false; } catch (\Throwable $e) { $hasSync = false; }
        $sel = $hasSync
            ? "SELECT channel, COUNT(*) as key_count,
                      MAX(CASE WHEN sync_status='error' THEN 1 ELSE 0 END) as any_err,
                      MAX(CASE WHEN sync_status='ok' THEN 1 ELSE 0 END) as any_ok,
                      MAX(CASE WHEN sync_status='pending' THEN 1 ELSE 0 END) as any_pend
               FROM channel_credential WHERE tenant_id=? AND is_active=1 GROUP BY channel"
            : "SELECT channel, COUNT(*) as key_count, 0 as any_err, 0 as any_ok, 0 as any_pend
               FROM channel_credential WHERE tenant_id=? AND is_active=1 GROUP BY channel";
        $stmt = $pdo->prepare($sel);
        $stmt->execute([$tenant]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $channels = [];
        foreach ($rows as $r) {
            // 우선순위: error > ok > pending > none. (ok 가 하나라도 있으면 실연동된 것으로 간주)
            $ss = (int)($r['any_err'] ?? 0) ? 'error'
                : ((int)($r['any_ok'] ?? 0) ? 'ok'
                : ((int)($r['any_pend'] ?? 0) ? 'pending' : 'none'));
            $channels[(string)$r['channel']] = [
                'keyCount'    => (int)$r['key_count'],
                'hasRequired' => (int)$r['key_count'] > 0,
                'syncStatus'  => $ss,
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
        if ($deny = self::denyAnon($request, $response)) return $deny; // [현 차수] 익명 외부 ping 남용 차단(test/upsert 일관)
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
        if ($deny = self::denyAnon($request, $response)) return $deny; // [현 차수] 익명 발급신청 티켓 스팸 차단
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
        // [현 차수] 채널별 발급 필요 정보(계정/식별 등) — 신청 접수에 함께 보관·통지.
        $extra           = is_array($body['extra'] ?? null) ? $body['extra'] : [];
        $extraJson       = !empty($extra) ? json_encode($extra, JSON_UNESCAPED_UNICODE) : null;

        if ($channel === '') {
            return TemplateResponder::respond($response->withStatus(422), ['error' => 'channel required']);
        }

        // ── [현 차수] 데모 체험 모드 차단 ─────────────────────────────────────────────
        //   체험 데모에서는 실제 발급 신청·티켓 기록·메일 통지를 하지 않는다(데모 오염/오발송 방지).
        //   프론트(_IS_DEMO_ENV 차단)의 백엔드 정합 — 데모 테넌트는 신청 불가 메시지를 반환.
        if ($tenant === 'demo') {
            return TemplateResponder::respond($response, [
                'ok'      => false,
                'demo'    => true,
                'channel' => $channel,
                'message' => '체험 데모 모드에서는 API 키 발급 신청이 되지 않습니다. 실제 계정으로 로그인 후 신청해 주세요.',
            ]);
        }

        $ticketId = 'APPLY-' . strtoupper(base_convert((string)time(), 10, 36)) . '-' . strtoupper(substr(bin2hex(random_bytes(3)), 0, 6));

        // connector_apply_log 테이블에 저장 (없으면 channel_credential의 note에 기록)
        try {
            // [현 차수] ★테이블·컬럼 보장(idempotent) — 최초 신청이 fallback(note)으로 새어나가
            //   신청현황(applyList)에 안 보이던 문제 차단. 신청은 항상 connector_apply_log에 기록 → 항상 현황 확인 가능.
            self::ensureApplyTable($pdo);
            try { $pdo->exec("ALTER TABLE connector_apply_log ADD COLUMN extra_json TEXT"); } catch (\Throwable $e) {}
            $pdo->prepare(
                'INSERT INTO connector_apply_log(tenant_id, channel, ticket_id, member_name, member_email,
                 business_number, phone, company, status, requested_at, created_at, extra_json)
                 VALUES(?,?,?,?,?,?,?,?,?,?,?,?)'
            )->execute([
                $tenant, $channel, $ticketId, $memberName, $memberEmail,
                $businessNumber, $phone, $company, 'pending', $requestedAt, gmdate('c'), $extraJson,
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

        // ── [현 차수] 발급 신청을 실제로 전달 — 신청자 확인 메일 + 운영팀 알림 메일 ─────────────
        //   ★외부 채널은 프로그래매틱 키 발급 API 가 없어 "채널에 자동 전송"은 불가(OAuth 채널만 자동발급).
        //   따라서 발급 대행 접수(티켓)를 메일로 실제 통지해 처리 흐름을 보장한다(무음 기록 → 실처리).
        //   Mailer 미설정 시 graceful skip(티켓은 이미 기록됨). 외부 발송 실패는 신청 성공에 영향 없음.
        $notified = false;
        try {
            if (\Genie\Mailer::isConfigured($pdo)) {
                $chName = strtoupper($channel);
                // (1) 신청자 확인 메일
                if ($memberEmail !== '' && filter_var($memberEmail, FILTER_VALIDATE_EMAIL)) {
                    $nameSafe = htmlspecialchars($memberName !== '' ? $memberName : '고객', ENT_QUOTES);
                    $html = \Genie\Mailer::wrapHtml(
                        "{$chName} API 키 발급 신청 접수",
                        "<p>{$nameSafe}님, <b>{$chName}</b> 채널 API 키 발급 신청이 접수되었습니다.</p>"
                        . "<p>· 티켓 번호: <b>" . htmlspecialchars($ticketId, ENT_QUOTES) . "</b><br>· 처리 상태: 접수(pending)</p>"
                        . "<p>발급이 완료되면 등록 즉시 자동으로 연동·동기화됩니다. 추가 정보가 필요하면 회신드리겠습니다.</p>"
                    );
                    // [현 차수] ★신청 접수 확인은 플랫폼 시스템 알림 → 플랫폼 SMTP(app_setting) 사용(tenant 미지정).
                    //   기존엔 tenant 지정으로 미설정 테넌트 캠페인 SMTP를 타 발송 실패 → 사용자가 확인 메일을 못 받던 원인.
                    //   ★실제 발송 결과로 notified 판정(메일 실패 시 false positive 방지 — 접수 성공/메일 실패 정직 구분).
                    $sendRes = \Genie\Mailer::send($memberEmail, "[GenieGo ROI] {$chName} API 키 발급 신청 접수 ({$ticketId})", $html, ['pdo' => $pdo]);
                    $notified = !empty($sendRes['ok']);
                }
                // (2) 운영팀 알림 메일 — APPLY_NOTIFY_EMAIL(env) 또는 app_setting(apply_notify_email)
                $opsTo = (string)(getenv('APPLY_NOTIFY_EMAIL') ?: '');
                if ($opsTo === '') {
                    try { $os = $pdo->prepare("SELECT svalue FROM app_setting WHERE skey='apply_notify_email' LIMIT 1"); $os->execute(); $opsTo = (string)($os->fetchColumn() ?: ''); } catch (\Throwable $e) {}
                }
                if ($opsTo !== '' && filter_var($opsTo, FILTER_VALIDATE_EMAIL)) {
                    $esc = fn($v) => htmlspecialchars((string)$v, ENT_QUOTES);
                    // [현 차수] 채널별 발급 필요 정보(extra)를 운영팀 메일에 전부 포함 — 신청 접수 완결성.
                    $extraHtml = '';
                    foreach ($extra as $ek => $ev) { if ((string)$ev !== '') $extraHtml .= '<br>' . $esc($ek) . ': <b>' . $esc($ev) . '</b>'; }
                    $ohtml = \Genie\Mailer::wrapHtml(
                        "신규 API 키 발급 신청 ({$chName})",
                        "<p>채널: <b>{$chName}</b><br>테넌트: {$esc($tenant)}<br>신청자: {$esc($memberName)} ({$esc($memberEmail)})<br>"
                        . "회사: {$esc($company)}<br>사업자번호: {$esc($businessNumber)}<br>연락처: {$esc($phone)}<br>티켓: {$esc($ticketId)}"
                        . ($extraHtml !== '' ? "</p><p><b>채널 발급 정보</b>{$extraHtml}" : '') . "</p>"
                    );
                    \Genie\Mailer::send($opsTo, "[발급신청] {$chName} - " . ($company !== '' ? $company : $tenant) . " ({$ticketId})", $ohtml, ['pdo' => $pdo]);
                }
            }
        } catch (\Throwable $e) { error_log('[apply] mail notify failed: ' . $e->getMessage()); }

        return TemplateResponder::respond($response, [
            'ok'        => true,
            'ticket_id' => $ticketId,
            'channel'   => $channel,
            'status'    => 'pending',
            'notified'  => $notified,
            'message'   => $notified
                ? "발급 신청이 접수되어 확인 메일을 보냈습니다 (티켓 {$ticketId}). 발급 후 등록 즉시 자동 연동됩니다."
                : "발급 신청이 접수되었습니다 (티켓 {$ticketId}). 발급 후 등록 즉시 자동 연동됩니다.",
        ]);
    }

    /* ─────────────────── [현 차수] ③ 발급 신청 현황·완료 추적 ─────────────────── */

    /** connector_apply_log 테이블/보조 컬럼(완료일·완료메모) 보장 — idempotent. */
    private static function ensureApplyTable(\PDO $pdo): void
    {
        $isMy = (stripos((string)$pdo->getAttribute(\PDO::ATTR_DRIVER_NAME), 'mysql') !== false);
        if ($isMy) {
            $pdo->exec("CREATE TABLE IF NOT EXISTS connector_apply_log (
                id BIGINT AUTO_INCREMENT PRIMARY KEY, tenant_id VARCHAR(100), channel VARCHAR(60),
                ticket_id VARCHAR(60), member_name VARCHAR(120), member_email VARCHAR(190),
                business_number VARCHAR(60), phone VARCHAR(60), company VARCHAR(190),
                status VARCHAR(20) DEFAULT 'pending', requested_at VARCHAR(40), created_at VARCHAR(40),
                completed_at VARCHAR(40) NULL, completed_note VARCHAR(255) NULL, extra_json TEXT NULL,
                INDEX idx_cal_tenant (tenant_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
        } else {
            $pdo->exec("CREATE TABLE IF NOT EXISTS connector_apply_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT, tenant_id TEXT, channel TEXT, ticket_id TEXT,
                member_name TEXT, member_email TEXT, business_number TEXT, phone TEXT, company TEXT,
                status TEXT DEFAULT 'pending', requested_at TEXT, created_at TEXT,
                completed_at TEXT, completed_note TEXT, extra_json TEXT
            )");
        }
        foreach (['completed_at' => 'VARCHAR(40)', 'completed_note' => 'VARCHAR(255)'] as $col => $type) {
            try { $pdo->exec("ALTER TABLE connector_apply_log ADD COLUMN $col $type"); } catch (\Throwable $e) {}
        }
    }

    /** GET /v423/connectors/apply/list — 본 테넌트 발급 신청 현황(상태 추적). 데모는 빈 목록. */
    public static function applyList(Request $request, Response $response): Response
    {
        $tenant = self::tenantId($request);
        if ($tenant === '' || $tenant === 'demo' || str_starts_with($tenant, 'demo')) {
            return TemplateResponder::respond($response, ['ok' => true, 'demo' => true, 'applies' => []]);
        }
        try {
            $pdo = Db::pdo();
            self::ensureApplyTable($pdo);
            $st = $pdo->prepare("SELECT channel, ticket_id, member_email, status, requested_at, completed_at, completed_note FROM connector_apply_log WHERE tenant_id=? ORDER BY id DESC LIMIT 100");
            $st->execute([$tenant]);
            return TemplateResponder::respond($response, ['ok' => true, 'applies' => $st->fetchAll(\PDO::FETCH_ASSOC) ?: []]);
        } catch (\Throwable $e) {
            return TemplateResponder::respond($response, ['ok' => true, 'applies' => []]);
        }
    }

    /** POST /v423/connectors/apply/{ticket}/status — 관리자 발급 대행 처리 상태 갱신 + 신청자 통지. */
    public static function applyStatus(Request $request, Response $response, array $args): Response
    {
        $gate = UserAuth::requirePlan($request, $response, 'admin'); // 관리자 전용
        if ($gate !== null) return $gate;
        $ticket = (string)($args['ticket'] ?? '');
        $body = (array)($request->getParsedBody() ?? []);
        if (empty($body)) { $d = json_decode((string)$request->getBody(), true); if (is_array($d)) $body = $d; }
        $status = strtolower(trim((string)($body['status'] ?? '')));
        $note   = mb_substr(trim((string)($body['note'] ?? '')), 0, 255);
        if (!in_array($status, ['pending', 'processing', 'completed', 'rejected'], true)) {
            return TemplateResponder::respond($response->withStatus(422), ['ok' => false, 'error' => 'invalid status']);
        }
        try {
            $pdo = Db::pdo();
            self::ensureApplyTable($pdo);
            $row = $pdo->prepare("SELECT tenant_id, channel, member_email FROM connector_apply_log WHERE ticket_id=? LIMIT 1");
            $row->execute([$ticket]);
            $r = $row->fetch(\PDO::FETCH_ASSOC);
            if (!$r) return TemplateResponder::respond($response->withStatus(404), ['ok' => false, 'error' => 'ticket not found']);
            $completedAt = in_array($status, ['completed', 'rejected'], true) ? gmdate('c') : null;
            $pdo->prepare("UPDATE connector_apply_log SET status=?, completed_at=?, completed_note=? WHERE ticket_id=?")
                ->execute([$status, $completedAt, $note, $ticket]);
            // 완료/거절 시 신청자 통지(발급완료 정보 수신).
            $notified = false;
            $email = (string)($r['member_email'] ?? '');
            if ($email !== '' && filter_var($email, FILTER_VALIDATE_EMAIL) && in_array($status, ['completed', 'rejected'], true)) {
                try {
                    if (\Genie\Mailer::isConfigured($pdo)) {
                        $chName = (string)$r['channel'];
                        $isDone = ($status === 'completed');
                        $subj = $isDone
                            ? "[GenieGo ROI] {$chName} API 키 발급 완료 ({$ticket})"
                            : "[GenieGo ROI] {$chName} API 키 발급 신청 안내 ({$ticket})";
                        $noteHtml = $note !== '' ? "<p>안내: " . htmlspecialchars($note, ENT_QUOTES) . "</p>" : '';
                        $bodyHtml = $isDone
                            ? "<p>{$chName} 채널 API 키 발급이 <b>완료</b>되었습니다 (티켓 {$ticket}).</p><p>연동 허브에서 발급된 키를 등록하시면 즉시 자동으로 연동·동기화됩니다.</p>{$noteHtml}"
                            : "<p>{$chName} 채널 API 키 발급 신청 건(티켓 {$ticket})에 대한 안내입니다.</p>{$noteHtml}";
                        \Genie\Mailer::send($email, $subj, \Genie\Mailer::wrapHtml($subj, $bodyHtml), ['pdo' => $pdo, 'tenant' => (string)$r['tenant_id']]);
                        $notified = true;
                    }
                } catch (\Throwable $e) {}
            }
            return TemplateResponder::respond($response, ['ok' => true, 'ticket' => $ticket, 'status' => $status, 'notified' => $notified]);
        } catch (\Throwable $e) {
            return TemplateResponder::respond($response->withStatus(500), ['ok' => false, 'error' => $e->getMessage()]);
        }
    }

    /**
     * [현 차수] ★발급 신청 현황 갱신 — 발급 '확인(완료)'은 연동허브 실검증 통과($verified=true)에만 표기한다.
     *   임의 조작 금지: 등록만으로는 완료로 뒤집지 않고 '처리중(발급 확인 대기)'로만 둔다.
     *   실검증 통과 시에만 'completed(발급 확인됨)'로 갱신 + 신청자에게 발급 확인 이메일 별도 발송.
     */
    public static function markApplyCompleted(\PDO $pdo, string $tenant, string $channel, bool $verified): void
    {
        if ($tenant === '' || str_starts_with($tenant, 'demo') || $channel === '') return;
        try {
            if (!$verified) {
                // 등록됐으나 미검증 → '처리중'(발급 확인 대기). 완료로 표기하지 않음.
                $pdo->prepare("UPDATE connector_apply_log SET status='processing', completed_note=? WHERE tenant_id=? AND channel=? AND status='pending'")
                    ->execute(['자격증명 등록됨 — 연동허브 발급 확인(실검증) 대기', $tenant, $channel]);
                return;
            }
            // 실 검증 통과 → 발급 확인(완료). 통지 대상(아직 미완료) 행 먼저 조회.
            $sel = $pdo->prepare("SELECT ticket_id, member_email FROM connector_apply_log WHERE tenant_id=? AND channel=? AND status IN('pending','processing') ORDER BY id DESC");
            $sel->execute([$tenant, $channel]);
            $open = $sel->fetchAll(\PDO::FETCH_ASSOC);
            $pdo->prepare("UPDATE connector_apply_log SET status='completed', completed_at=?, completed_note=? WHERE tenant_id=? AND channel=? AND status IN('pending','processing')")
                ->execute([gmdate('c'), '연동허브 실검증 통과 — 발급 확인됨', $tenant, $channel]);
            // 발급 확인 통지(신청자 이메일) — 실검증으로 확인된 경우에만(조작 없음).
            foreach ($open as $r) {
                $em = (string)($r['member_email'] ?? '');
                if ($em === '' || !filter_var($em, FILTER_VALIDATE_EMAIL)) continue;
                try {
                    $tk = (string)$r['ticket_id'];
                    $subj = "[GenieGo ROI] {$channel} 발급 확인됨 — 연동 완료 ({$tk})";
                    $bodyHtml = "<p>{$channel} 채널의 API 키/토큰이 <b>GenieGo ROI 연동허브에서 실제 발급·검증 확인</b>되었습니다 (티켓 {$tk}).</p>"
                        . "<p>이 확인은 플랫폼이 실 채널 API로 직접 검증한 결과이며 임의 표기가 아닙니다. 이제 자동으로 연동·동기화됩니다.</p>";
                    \Genie\Mailer::send($em, $subj, \Genie\Mailer::wrapHtml($subj, $bodyHtml), ['pdo' => $pdo]);
                } catch (\Throwable $e) {}
            }
        } catch (\Throwable $e) { /* 테이블 미존재 등 — 무시 */ }
    }
}
