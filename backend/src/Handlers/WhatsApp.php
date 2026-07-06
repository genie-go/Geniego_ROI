<?php
declare(strict_types=1);
namespace Genie\Handlers;

use Genie\Db;
use Genie\TemplateResponder;
use PDO;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

/**
 * WhatsApp Business API Handler
 * 인증키(Phone Number ID + Access Token) 등록만으로 즉시 발송 가능
 *
 * Routes:
 *   GET    /api/whatsapp/settings          — 설정 조회
 *   POST   /api/whatsapp/settings          — 인증키 저장 + 연결 테스트
 *   POST   /api/whatsapp/send              — 단건 메시지 발송
 *   POST   /api/whatsapp/broadcast         — 일괄 발송
 *   GET    /api/whatsapp/templates         — 승인된 템플릿 목록
 *   GET    /api/whatsapp/messages          — 발송 이력
 *   POST   /api/whatsapp/webhooks          — Meta Webhook 수신
 */
final class WhatsApp
{
    // 191차 부활: 세션 plan/tenant(UserAuth) + bypass(/whatsapp) + requirePro. webhook 만 무인증(Meta).
    private static function isMysql(\PDO $pdo): bool { return $pdo->getAttribute(\PDO::ATTR_DRIVER_NAME) === 'mysql'; }

    private static function plan(Request $req): string
    {
        // [현 차수 감사 ISO-1] 폴백을 'demo'→'free' 로 교정. 인증된 운영 사용자의 plan 이 비었을 때
        //   'demo' 로 오판→실발송이 시뮬레이션되고 가짜 이력이 운영 테넌트에 주입되던 오염 방향 차단.
        //   (실 데모 사용자는 plan 이 명시되어 있어 시뮬레이션 분기 plan==='demo' 는 불변 → 회귀 없음.)
        $u = UserAuth::authedUser($req);
        return $u['plan'] ?? 'free';
    }

    private static function tenant(Request $req): string
    {
        $t = UserAuth::authedTenant($req);
        return ($t !== null && $t !== '') ? $t : 'demo';
    }

    /** [현 차수 동의센터 SSOT] 전화번호(숫자열)로 CRM 고객 id 해석 — SmsMarketing 패턴 재사용. 없으면 0. */
    private static function customerIdByPhone(\PDO $pdo, string $tenant, string $digits): int
    {
        if ($digits === '') return 0;
        try {
            $norm = "REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(COALESCE(phone,''),'-',''),' ',''),'(',''),')',''),'+','')";
            $st = $pdo->prepare("SELECT id FROM crm_customers WHERE tenant_id=? AND {$norm}=? LIMIT 1");
            $st->execute([$tenant, $digits]);
            return (int)($st->fetchColumn() ?: 0);
        } catch (\Throwable $e) { return 0; }
    }

    private static function ensureTables(): void
    {
        $pdo = Db::pdo();
        if (self::isMysql($pdo)) {
            $pdo->exec("CREATE TABLE IF NOT EXISTS whatsapp_settings (
                id INT AUTO_INCREMENT PRIMARY KEY, tenant_id VARCHAR(100) NOT NULL, phone_number_id VARCHAR(100),
                access_token VARCHAR(512), business_id VARCHAR(100), webhook_verify_token VARCHAR(255),
                is_active TINYINT DEFAULT 1, test_status VARCHAR(20) DEFAULT 'untested', last_tested_at VARCHAR(32),
                updated_at VARCHAR(32), UNIQUE KEY uq_wa_settings_tenant (tenant_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
            $pdo->exec("CREATE TABLE IF NOT EXISTS whatsapp_messages (
                id INT AUTO_INCREMENT PRIMARY KEY, tenant_id VARCHAR(100) NOT NULL, wa_message_id VARCHAR(120),
                recipient VARCHAR(50) NOT NULL, template_name VARCHAR(120), body TEXT, status VARCHAR(20) DEFAULT 'pending',
                error TEXT, sent_at VARCHAR(32), delivered_at VARCHAR(32), read_at VARCHAR(32), created_at VARCHAR(32),
                KEY idx_wa_msg_tenant (tenant_id), KEY idx_wa_msg_waid (wa_message_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
            $pdo->exec("CREATE TABLE IF NOT EXISTS whatsapp_templates (
                id INT AUTO_INCREMENT PRIMARY KEY, tenant_id VARCHAR(100) NOT NULL, name VARCHAR(200) NOT NULL,
                language VARCHAR(10) DEFAULT 'ko', category VARCHAR(30) DEFAULT 'MARKETING', components_json TEXT,
                status VARCHAR(20) DEFAULT 'APPROVED', created_at VARCHAR(32),
                UNIQUE KEY uq_wa_tpl (tenant_id, name)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
        } else {
            $pdo->exec("CREATE TABLE IF NOT EXISTS whatsapp_settings (
                id INTEGER PRIMARY KEY AUTOINCREMENT, tenant_id TEXT NOT NULL, phone_number_id TEXT, access_token TEXT,
                business_id TEXT, webhook_verify_token TEXT, is_active INTEGER DEFAULT 1, test_status TEXT DEFAULT 'untested',
                last_tested_at TEXT, updated_at TEXT, UNIQUE(tenant_id))");
            $pdo->exec("CREATE TABLE IF NOT EXISTS whatsapp_messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT, tenant_id TEXT NOT NULL, wa_message_id TEXT, recipient TEXT NOT NULL,
                template_name TEXT, body TEXT, status TEXT DEFAULT 'pending', error TEXT, sent_at TEXT, delivered_at TEXT,
                read_at TEXT, created_at TEXT)");
            $pdo->exec("CREATE TABLE IF NOT EXISTS whatsapp_templates (
                id INTEGER PRIMARY KEY AUTOINCREMENT, tenant_id TEXT NOT NULL, name TEXT NOT NULL, language TEXT DEFAULT 'ko',
                category TEXT DEFAULT 'MARKETING', components_json TEXT, status TEXT DEFAULT 'APPROVED', created_at TEXT,
                UNIQUE(tenant_id, name))");
        }
    }

    // POST /api/whatsapp/settings
    public static function saveSettings(Request $req, Response $res, array $args): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $pdo    = Db::pdo();
        $tenant = self::tenant($req);
        $body   = (array)($req->getParsedBody() ?? []);

        $phoneNumberId = trim((string)($body['phone_number_id'] ?? ''));
        $accessToken   = trim((string)($body['access_token'] ?? ''));
        $businessId    = trim((string)($body['business_id'] ?? ''));

        if (!$phoneNumberId || !$accessToken) {
            return TemplateResponder::respond($res->withStatus(422), ['error' => 'phone_number_id and access_token required']);
        }

        $now = gmdate('c');

        // 실제 연결 테스트
        $testResult = self::testConnection($phoneNumberId, $accessToken);

        // 191차: ON CONFLICT → 드라이버별 upsert.
        $cols = "tenant_id,phone_number_id,access_token,business_id,test_status,last_tested_at,updated_at";
        $vals = [$tenant, $phoneNumberId, ($accessToken === '' ? '' : \Genie\Crypto::encrypt($accessToken)), $businessId, $testResult['ok'] ? 'ok' : 'error', $now, $now]; // 209차 P1: secret-at-rest
        if (self::isMysql($pdo)) {
            $pdo->prepare("INSERT INTO whatsapp_settings($cols) VALUES(?,?,?,?,?,?,?)
                ON DUPLICATE KEY UPDATE phone_number_id=VALUES(phone_number_id),access_token=VALUES(access_token),
                business_id=VALUES(business_id),test_status=VALUES(test_status),last_tested_at=VALUES(last_tested_at),updated_at=VALUES(updated_at)")->execute($vals);
        } else {
            $pdo->prepare("INSERT INTO whatsapp_settings($cols) VALUES(?,?,?,?,?,?,?)
                ON CONFLICT(tenant_id) DO UPDATE SET phone_number_id=excluded.phone_number_id,access_token=excluded.access_token,
                business_id=excluded.business_id,test_status=excluded.test_status,last_tested_at=excluded.last_tested_at,updated_at=excluded.updated_at")->execute($vals);
        }

        // 연결 성공 시 템플릿 자동 수집
        if ($testResult['ok']) {
            self::syncTemplates($pdo, $tenant, $phoneNumberId, $businessId, $accessToken);
        }

        return TemplateResponder::respond($res, [
            'ok'     => $testResult['ok'],
            'status' => $testResult['ok'] ? 'connected' : 'error',
            'message'=> $testResult['message'],
            'display_name' => $testResult['display_name'] ?? null,
        ]);
    }

    // GET /api/whatsapp/settings
    public static function getSettings(Request $req, Response $res, array $args): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $pdo    = Db::pdo();
        $tenant = self::tenant($req);
        $plan   = self::plan($req);

        $stmt = $pdo->prepare("SELECT id,tenant_id,phone_number_id,business_id,test_status,last_tested_at,updated_at FROM whatsapp_settings WHERE tenant_id=?");
        $stmt->execute([$tenant]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if (false /*was demo*/ && !$row) {
            return TemplateResponder::respond($res, [
                'ok' => true, 'plan' => 'demo',
                'settings' => ['test_status' => 'demo', 'phone_number_id' => '123456789', 'display_name' => 'Geniego ROI Demo'],
                'stats' => ['sent' => 142, 'delivered' => 138, 'read' => 95, 'failed' => 4],
            ]);
        }

        // [현차수] 동기화: 발송/일괄발송·webhook 상태업데이트가 Overview KPI 에 반영되도록 실 집계 stats 동봉.
        //   (기존엔 stats 미반환 → 운영 Overview 가 항상 0. 가짜 금지 — whatsapp_messages 실집계.)
        return TemplateResponder::respond($res, ['ok' => true, 'plan' => $plan, 'settings' => $row ?: null, 'stats' => self::aggStats($pdo, $tenant)]);
    }

    /** [현차수] whatsapp_messages 실집계 — sent/delivered/read/failed. 운영 미발송=0(가짜 금지). */
    private static function aggStats(PDO $pdo, string $tenant): array
    {
        $out = ['sent' => 0, 'delivered' => 0, 'read' => 0, 'failed' => 0];
        try {
            $st = $pdo->prepare("SELECT status, COUNT(*) AS cnt FROM whatsapp_messages WHERE tenant_id=? GROUP BY status");
            $st->execute([$tenant]);
            foreach ($st->fetchAll(PDO::FETCH_ASSOC) as $r) {
                $s = (string)$r['status']; $c = (int)$r['cnt'];
                if ($s === 'failed') { $out['failed'] += $c; continue; }
                // sent 는 전체 발송 시도 누계(delivered/read 도 보낸 것). delivered/read 는 단계별 누계.
                $out['sent'] += $c;
                if ($s === 'delivered' || $s === 'read') $out['delivered'] += $c;
                if ($s === 'read') $out['read'] += $c;
            }
        } catch (\Throwable $e) { /* 빈 집계 폴백 */ }
        return $out;
    }

    // POST /api/whatsapp/send
    public static function send(Request $req, Response $res, array $args): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $pdo    = Db::pdo();
        $tenant = self::tenant($req);
        $plan   = self::plan($req);
        $body   = (array)($req->getParsedBody() ?? []);

        $to           = trim((string)($body['to'] ?? ''));
        $templateName = trim((string)($body['template'] ?? ''));
        $textBody     = trim((string)($body['body'] ?? ''));
        $params       = (array)($body['params'] ?? []);

        if (!$to) return TemplateResponder::respond($res->withStatus(422), ['error' => 'to is required']);

        $now = gmdate('c');

        if (false /*was demo*/) {
            // 데모: 시뮬레이션
            $pdo->prepare("INSERT INTO whatsapp_messages(tenant_id,recipient,template_name,body,status,sent_at,created_at) VALUES(?,?,?,?,?,?,?)")
                ->execute([$tenant, $to, $templateName, $textBody ?: "Demo: {$templateName}", 'delivered', $now, $now]);
            return TemplateResponder::respond($res, ['ok' => true, 'plan' => 'demo', 'wa_message_id' => 'demo_' . uniqid(), 'status' => 'delivered']);
        }

        // 실 발송
        $settings = $pdo->prepare("SELECT phone_number_id,access_token FROM whatsapp_settings WHERE tenant_id=? AND is_active=1");
        $settings->execute([$tenant]);
        $cfg = $settings->fetch(PDO::FETCH_ASSOC);
        if (!$cfg) return TemplateResponder::respond($res->withStatus(400), ['error' => 'WhatsApp not configured']);
        if (!empty($cfg['access_token'])) $cfg['access_token'] = \Genie\Crypto::decrypt((string)$cfg['access_token']); // 209차 P1: secret-at-rest

        $result = self::sendMessage($cfg['phone_number_id'], $cfg['access_token'], $to, $templateName, $textBody, $params);

        $pdo->prepare("INSERT INTO whatsapp_messages(tenant_id,wa_message_id,recipient,template_name,body,status,error,sent_at,created_at) VALUES(?,?,?,?,?,?,?,?,?)")
            ->execute([$tenant, $result['wa_id'] ?? null, $to, $templateName, $textBody,
                $result['ok'] ? 'sent' : 'failed', $result['error'] ?? null, $now, $now]);

        return TemplateResponder::respond($res, ['ok' => $result['ok'], 'wa_message_id' => $result['wa_id'] ?? null, 'status' => $result['ok'] ? 'sent' : 'failed', 'error' => $result['error'] ?? null]);
    }

    // POST /api/whatsapp/broadcast
    public static function broadcast(Request $req, Response $res, array $args): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $pdo      = Db::pdo();
        $tenant   = self::tenant($req);
        $plan     = self::plan($req);
        $body     = (array)($req->getParsedBody() ?? []);
        $numbers  = (array)($body['numbers'] ?? []);
        $template = trim((string)($body['template'] ?? ''));
        $text     = trim((string)($body['body'] ?? ''));

        $now     = gmdate('c');
        $sent    = 0;
        $failed  = 0;
        $optout  = 0;
        $capped  = 0;
        $quiet   = 0;

        $cfg = null;
        if ($plan !== 'demo') {
            $s = $pdo->prepare("SELECT phone_number_id,access_token FROM whatsapp_settings WHERE tenant_id=? AND is_active=1");
            $s->execute([$tenant]);
            $cfg = $s->fetch(PDO::FETCH_ASSOC);
            if ($cfg && !empty($cfg['access_token'])) $cfg['access_token'] = \Genie\Crypto::decrypt((string)$cfg['access_token']); // 209차 P1: secret-at-rest
        }

        // 191차: 운영(비데모) 발신 설정 미존재 시 가짜 랜덤 'delivered' 기록 금지 → 명시적 차단(188차).
        if ($plan !== 'demo' && !$cfg) {
            return TemplateResponder::respond($res->withStatus(422), [
                'ok' => false, 'error' => 'WhatsApp 발신 설정이 없습니다. 설정에서 인증키를 먼저 등록하세요.',
                'sent' => 0, 'failed' => 0, 'total' => 0,
            ]);
        }

        foreach (array_slice($numbers, 0, 200) as $to) {
            $to = preg_replace('/\D/', '', (string)$to);
            if (strlen($to) < 8) continue;
            // [현 차수 동의센터 SSOT] 통합 발송 게이트 — WhatsApp 채널 옵트아웃/조용시간 단일소스(crm_channel_prefs). cid=0이면 fail-open. fail-open on error.
            $cid = self::customerIdByPhone($pdo, $tenant, $to);
            // [R4 라벨교정] 게이트 거부사유별 정확 집계 — 빈도=capped·조용시간=quiet·그 외(옵트아웃/suppression)만 opted_out.
            $g = CRM::isMarketingSendAllowed($tenant, $cid, 'whatsapp', ['phone'=>$to]);
            if (!($g['allowed'] ?? false)) {
                $rc = (string)($g['reason'] ?? '');
                if (strpos($rc, 'freq') !== false) { $capped++; }
                elseif (strpos($rc, 'quiet') !== false) { $quiet++; }
                else { $optout++; }
                continue;
            }
            if ($plan === 'demo') {
                $status = rand(0, 9) < 9 ? 'delivered' : 'failed'; // 데모 시뮬레이션 한정
            } else {
                $r = self::sendMessage($cfg['phone_number_id'], $cfg['access_token'], $to, $template, $text, []);
                $status = $r['ok'] ? 'sent' : 'failed';
            }
            $pdo->prepare("INSERT INTO whatsapp_messages(tenant_id,recipient,template_name,body,status,sent_at,created_at) VALUES(?,?,?,?,?,?,?)")
                ->execute([$tenant, $to, $template, $text, $status, $now, $now]);
            $status === 'failed' ? $failed++ : $sent++;
        }

        return TemplateResponder::respond($res, ['ok' => true, 'sent' => $sent, 'failed' => $failed, 'capped' => $capped, 'quiet_deferred' => $quiet, 'opted_out' => $optout, 'total' => $sent + $failed]);
    }

    // GET /api/whatsapp/templates
    public static function templates(Request $req, Response $res, array $args): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $pdo    = Db::pdo();
        $tenant = self::tenant($req);
        $plan   = self::plan($req);

        $stmt = $pdo->prepare("SELECT * FROM whatsapp_templates WHERE tenant_id=? ORDER BY id DESC");
        $stmt->execute([$tenant]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // 191차: 빈 템플릿 demoTemplates 주입은 데모 전용(운영은 정직한 빈 목록).
        if (empty($rows) && $plan === 'demo') {
            $rows = self::demoTemplates();
        }
        foreach ($rows as &$r) {
            $r['components'] = isset($r['components_json']) ? json_decode((string)$r['components_json'], true) : [];
            unset($r['components_json']);
        }
        return TemplateResponder::respond($res, ['ok' => true, 'templates' => $rows]);
    }

    // GET /api/whatsapp/messages
    public static function messages(Request $req, Response $res, array $args): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $pdo    = Db::pdo();
        $tenant = self::tenant($req);
        $plan   = self::plan($req);
        $limit  = max(1, min(100, (int)(($req->getQueryParams())['limit'] ?? 50)));

        // 191차: LIMIT 인라인(PDO 문자열바인드 500 해소) + 빈 결과 demoMessages(rand) 주입 제거(188차).
        $stmt = $pdo->prepare("SELECT * FROM whatsapp_messages WHERE tenant_id=? ORDER BY created_at DESC LIMIT $limit");
        $stmt->execute([$tenant]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        return TemplateResponder::respond($res, ['ok' => true, 'messages' => $rows]);
    }

    // POST /api/whatsapp/webhooks
    public static function webhook(Request $req, Response $res, array $args): Response
    {
        $q = $req->getQueryParams();
        // Meta webhook verification (GET challenge) — 192차: 연산자 우선순위 버그 수정(괄호).
        if (($q['hub.mode'] ?? '') === 'subscribe') {
            $vt = getenv('META_VERIFY_TOKEN');
            if ($vt && ($q['hub.verify_token'] ?? '') !== $vt) {
                return TemplateResponder::respond($res->withStatus(403), ['ok' => false]);
            }
            return TemplateResponder::respond($res, (int)($q['hub.challenge'] ?? 0));
        }

        // [현 차수] 은행급 fail-closed: Meta 서명(X-Hub-Signature-256) 검증을 필수화. META_APP_SECRET 미설정 시
        //   미검증 payload 를 처리하지 않는다(위조 webhook 으로 상태 변조 차단). 200 ok 반환으로 Meta 재시도 폭주만 회피.
        $appSecret = getenv('META_APP_SECRET');
        if (!$appSecret) {
            error_log('[WhatsApp.webhook] META_APP_SECRET 미설정 — 미검증 webhook 처리 거부(fail-closed)');
            return TemplateResponder::respond($res, ['ok' => true, 'skipped' => 'unverified']);
        }
        $bs = $req->getBody(); $bs->rewind(); $raw = $bs->getContents();
        $expected = 'sha256=' . hash_hmac('sha256', $raw, $appSecret);
        if (!hash_equals($expected, $req->getHeaderLine('X-Hub-Signature-256'))) {
            return TemplateResponder::respond($res->withStatus(403), ['ok' => false, 'error' => 'invalid signature']);
        }

        $body = (array)($req->getParsedBody() ?? []);
        // 상태 업데이트 처리 — [현 차수] 테넌트 격리: webhook metadata.phone_number_id 로 소유 테넌트를
        //   역매핑(whatsapp_settings, 평문)하고 UPDATE 에 tenant_id 스코프를 추가(방어심화). 전 entry/change 순회.
        try {
            $pdo = Db::pdo();
            foreach (($body['entry'] ?? []) as $entry) {
                foreach (($entry['changes'] ?? []) as $change) {
                    $value  = (array)($change['value'] ?? []);
                    $pnid   = (string)($value['metadata']['phone_number_id'] ?? '');
                    $tenant = self::resolveTenantByPhone($pdo, $pnid);
                    foreach (($value['statuses'] ?? []) as $status) {
                        $now = gmdate('c');
                        // [현 차수] 은행급 방어심화: tenant 미해결 시 전역 UPDATE 금지(교차테넌트 상태변조 벡터 제거).
                        //   phone_number_id 가 whatsapp_settings 에 없으면 우리 소유 메시지가 아니므로 skip.
                        if ($tenant === '') { error_log('[WhatsApp.webhook] unmapped phone_number_id=' . $pnid . ' — status skip'); continue; }
                        $pdo->prepare("UPDATE whatsapp_messages SET status=?,delivered_at=CASE WHEN ? IN ('delivered') THEN ? ELSE delivered_at END,read_at=CASE WHEN ? = 'read' THEN ? ELSE read_at END WHERE wa_message_id=? AND tenant_id=?")
                            ->execute([$status['status'], $status['status'], $now, $status['status'], $now, $status['id'], $tenant]);
                    }
                }
            }
        } catch (\Throwable) {}

        return TemplateResponder::respond($res, ['ok' => true]);
    }

    /** [현 차수] webhook metadata.phone_number_id → 소유 테넌트 역매핑(whatsapp_settings, 평문). 미등록=''. */
    private static function resolveTenantByPhone(PDO $pdo, string $phoneNumberId): string
    {
        if ($phoneNumberId === '') return '';
        try {
            $st = $pdo->prepare("SELECT tenant_id FROM whatsapp_settings WHERE phone_number_id=? LIMIT 1");
            $st->execute([$phoneNumberId]);
            return (string)($st->fetchColumn() ?: '');
        } catch (\Throwable $e) { return ''; }
    }

    /**
     * [255차 옴니채널] per-recipient WhatsApp 발송 프리미티브(Omnichannel 워커 재사용).
     *   whatsapp_settings(is_active) 로드 → 미설정/비활성 시 graceful unconfigured(에러 없음, 워커가 다음 채널 폴백).
     *   발송 시 whatsapp_messages 기록(stats 정합). 전부 테넌트 스코프.
     * @return array{ok:bool,mode:string,status?:string,error?:string} mode: live|unconfigured|invalid
     */
    public static function sendOne(\PDO $pdo, string $tenant, string $to, string $template, string $text, array $params = []): array
    {
        $to = preg_replace('/\D/', '', (string)$to);
        if (strlen($to) < 8) return ['ok' => false, 'mode' => 'invalid'];
        try {
            self::ensureTables();
            $s = $pdo->prepare("SELECT phone_number_id, access_token FROM whatsapp_settings WHERE tenant_id=? AND is_active=1");
            $s->execute([$tenant]);
            $cfg = $s->fetch(PDO::FETCH_ASSOC) ?: [];
        } catch (\Throwable $e) { $cfg = []; }
        // 자격 미등록 → graceful(에러 없음). 등록만 하면 즉시 live 발송(register-then-execute).
        if (empty($cfg['phone_number_id']) || empty($cfg['access_token'])) return ['ok' => false, 'mode' => 'unconfigured'];
        $token = \Genie\Crypto::decrypt((string)$cfg['access_token']);
        $r = self::sendMessage((string)$cfg['phone_number_id'], $token, $to, $template, $text, $params);
        $now = gmdate('c');
        try {
            $pdo->prepare("INSERT INTO whatsapp_messages(tenant_id,wa_message_id,recipient,template_name,body,status,error,sent_at,created_at) VALUES(?,?,?,?,?,?,?,?,?)")
                ->execute([$tenant, $r['wa_id'] ?? null, $to, $template, $text, $r['ok'] ? 'sent' : 'failed', $r['error'] ?? null, $now, $now]);
        } catch (\Throwable $e) {}
        return ['ok' => !empty($r['ok']), 'mode' => 'live', 'status' => $r['ok'] ? 'sent' : 'failed', 'error' => $r['error'] ?? null];
    }

    // ── 실 API 호출 ──────────────────────────────────────────────────────
    private static function testConnection(string $phoneNumberId, string $token): array
    {
        $ch = curl_init("https://graph.facebook.com/v18.0/{$phoneNumberId}?fields=display_phone_number,verified_name");
        curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER=>true, CURLOPT_TIMEOUT=>10,
            CURLOPT_HTTPHEADER=>["Authorization: Bearer {$token}"], CURLOPT_SSL_VERIFYPEER=>true]);
        $raw  = curl_exec($ch);
        $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $err  = curl_error($ch);
        curl_close($ch);

        if ($err) return ['ok'=>false, 'message'=>"Connection error: {$err}"];
        $data = json_decode((string)$raw, true) ?? [];
        if ($code === 200 && isset($data['display_phone_number'])) {
            return ['ok'=>true, 'message'=>"Connected: {$data['verified_name']} ({$data['display_phone_number']})", 'display_name'=>$data['verified_name']];
        }
        return ['ok'=>false, 'message'=>($data['error']['message'] ?? "HTTP {$code}")];
    }

    private static function sendMessage(string $phoneNumberId, string $token, string $to, string $template, string $text, array $params): array
    {
        $payload = $template
            ? ['messaging_product'=>'whatsapp','to'=>$to,'type'=>'template','template'=>['name'=>$template,'language'=>['code'=>'ko'],'components'=>array_map(fn($p)=>['type'=>'body','parameters'=>[['type'=>'text','text'=>$p]]],$params)]]
            : ['messaging_product'=>'whatsapp','to'=>$to,'type'=>'text','text'=>['body'=>$text]];

        $ch = curl_init("https://graph.facebook.com/v18.0/{$phoneNumberId}/messages");
        curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER=>true, CURLOPT_POST=>true,
            CURLOPT_POSTFIELDS=>json_encode($payload),
            CURLOPT_HTTPHEADER=>["Authorization: Bearer {$token}", "Content-Type: application/json"],
            CURLOPT_TIMEOUT=>15, CURLOPT_SSL_VERIFYPEER=>true]);
        $raw  = curl_exec($ch);
        $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $err  = curl_error($ch);
        curl_close($ch);

        if ($err) return ['ok'=>false, 'error'=>$err];
        $data = json_decode((string)$raw, true) ?? [];
        if ($code === 200 && isset($data['messages'][0]['id'])) {
            return ['ok'=>true, 'wa_id'=>$data['messages'][0]['id']];
        }
        return ['ok'=>false, 'error'=>$data['error']['message'] ?? "HTTP {$code}"];
    }

    private static function syncTemplates(PDO $pdo, string $tenant, string $phoneNumberId, string $businessId, string $token): void
    {
        if (!$businessId) return;
        $ch = curl_init("https://graph.facebook.com/v18.0/{$businessId}/message_templates?limit=20");
        curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER=>true, CURLOPT_TIMEOUT=>10,
            CURLOPT_HTTPHEADER=>["Authorization: Bearer {$token}"]]);
        $raw  = curl_exec($ch);
        $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        if ($code !== 200) return;
        $data = json_decode((string)$raw, true) ?? [];
        $now  = gmdate('c');
        // 191차: ON CONFLICT DO NOTHING(SQLite) → 드라이버별 무시삽입(MySQL=INSERT IGNORE). UNIQUE(tenant_id,name) dedup.
        $ins  = self::isMysql($pdo) ? 'INSERT IGNORE' : 'INSERT OR IGNORE';
        foreach (($data['data'] ?? []) as $t) {
            $pdo->prepare("$ins INTO whatsapp_templates(tenant_id,name,language,category,components_json,status,created_at) VALUES(?,?,?,?,?,?,?)")
                ->execute([$tenant,$t['name'],$t['language'],$t['category'],json_encode($t['components']),$t['status'],$now]);
        }
    }

    private static function demoTemplates(): array
    {
        return [
            ['id'=>1,'name'=>'order_confirmation','language'=>'ko','category'=>'TRANSACTIONAL','status'=>'APPROVED','components'=>[['type'=>'BODY','text'=>'안녕하세요 {{1}}님! 주문({{2}})이 확인되었습니다.']]],
            ['id'=>2,'name'=>'shipping_update','language'=>'ko','category'=>'TRANSACTIONAL','status'=>'APPROVED','components'=>[['type'=>'BODY','text'=>'{{1}}님의 주문이 발송되었습니다. 운송장번호: {{2}}']]],
            ['id'=>3,'name'=>'cart_recovery','language'=>'ko','category'=>'MARKETING','status'=>'APPROVED','components'=>[['type'=>'BODY','text'=>'{{1}}님, 장바구니에 상품이 남아있어요! 지금 구매하면 {{2}} 할인!']]],
            ['id'=>4,'name'=>'loyalty_point','language'=>'ko','category'=>'MARKETING','status'=>'APPROVED','components'=>[['type'=>'BODY','text'=>'{{1}}님, 포인트 {{2}}P가 적립되었습니다!']]],
            ['id'=>5,'name'=>'restock_alert','language'=>'ko','category'=>'MARKETING','status'=>'APPROVED','components'=>[['type'=>'BODY','text'=>'관심 상품 {{1}}이 재입고되었습니다!']]],
        ];
    }

    private static function demoMessages(): array
    {
        $statuses = ['sent','delivered','read','failed'];
        $templates = ['order_confirmation','cart_recovery','shipping_update','loyalty_point'];
        $msgs = [];
        foreach (range(1, 12) as $i) {
            $msgs[] = ['id'=>$i,'recipient'=>'010-' . rand(1000,9999) . '-' . rand(1000,9999),'template_name'=>$templates[$i%4],'status'=>$statuses[$i%4],'sent_at'=>date('Y-m-d H:i:s',strtotime("-{$i} hours")),'created_at'=>date('Y-m-d H:i:s',strtotime("-{$i} hours"))];
        }
        return $msgs;
    }
}
