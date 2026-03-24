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
    private static function plan(Request $req): string
    {
        $auth = $req->getHeaderLine('Authorization');
        if (preg_match('/Bearer\s+(\S+)/i', $auth, $m) && $m[1] !== 'demo-token') {
            try {
                $s = Db::pdo()->prepare('SELECT u.plan FROM user_session s JOIN app_user u ON u.id=s.user_id WHERE s.token=? LIMIT 1');
                $s->execute([$m[1]]);
                $r = $s->fetch(PDO::FETCH_ASSOC);
                if ($r) return (string)$r['plan'];
            } catch (\Throwable) {}
        }
        return 'demo';
    }

    private static function tenant(Request $req): string
    {
        $auth = $req->getHeaderLine('Authorization');
        if (preg_match('/Bearer\s+(\S+)/i', $auth, $m) && $m[1] !== 'demo-token') {
            try {
                $s = Db::pdo()->prepare('SELECT user_id FROM user_session WHERE token=? LIMIT 1');
                $s->execute([$m[1]]);
                $r = $s->fetch(PDO::FETCH_ASSOC);
                if ($r) return (string)$r['user_id'];
            } catch (\Throwable) {}
        }
        return 'demo';
    }

    private static function ensureTables(): void
    {
        $pdo = Db::pdo();
        $pdo->exec("CREATE TABLE IF NOT EXISTS whatsapp_settings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tenant_id TEXT NOT NULL,
            phone_number_id TEXT,
            access_token TEXT,
            business_id TEXT,
            webhook_verify_token TEXT,
            is_active INTEGER DEFAULT 1,
            test_status TEXT DEFAULT 'untested',
            last_tested_at TEXT,
            updated_at TEXT,
            UNIQUE(tenant_id)
        )");
        $pdo->exec("CREATE TABLE IF NOT EXISTS whatsapp_messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tenant_id TEXT NOT NULL,
            wa_message_id TEXT,
            recipient TEXT NOT NULL,
            template_name TEXT,
            body TEXT,
            status TEXT DEFAULT 'pending',
            error TEXT,
            sent_at TEXT,
            delivered_at TEXT,
            read_at TEXT,
            created_at TEXT
        )");
        $pdo->exec("CREATE TABLE IF NOT EXISTS whatsapp_templates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tenant_id TEXT NOT NULL,
            name TEXT NOT NULL,
            language TEXT DEFAULT 'ko',
            category TEXT DEFAULT 'MARKETING',
            components_json TEXT,
            status TEXT DEFAULT 'APPROVED',
            created_at TEXT
        )");
    }

    // POST /api/whatsapp/settings
    public static function saveSettings(Request $req, Response $res, array $args): Response
    {
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

        $pdo->prepare("INSERT INTO whatsapp_settings(tenant_id,phone_number_id,access_token,business_id,test_status,last_tested_at,updated_at)
            VALUES(?,?,?,?,?,?,?) ON CONFLICT(tenant_id) DO UPDATE SET
            phone_number_id=excluded.phone_number_id, access_token=excluded.access_token,
            business_id=excluded.business_id, test_status=excluded.test_status,
            last_tested_at=excluded.last_tested_at, updated_at=excluded.updated_at"
        )->execute([$tenant, $phoneNumberId, $accessToken, $businessId,
            $testResult['ok'] ? 'ok' : 'error', $now, $now]);

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
        self::ensureTables();
        $pdo    = Db::pdo();
        $tenant = self::tenant($req);
        $plan   = self::plan($req);

        $stmt = $pdo->prepare("SELECT id,tenant_id,phone_number_id,business_id,test_status,last_tested_at,updated_at FROM whatsapp_settings WHERE tenant_id=?");
        $stmt->execute([$tenant]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($plan === 'demo' && !$row) {
            return TemplateResponder::respond($res, [
                'ok' => true, 'plan' => 'demo',
                'settings' => ['test_status' => 'demo', 'phone_number_id' => '123456789', 'display_name' => 'Geniego ROI Demo'],
                'stats' => ['sent' => 142, 'delivered' => 138, 'read' => 95, 'failed' => 4],
            ]);
        }

        return TemplateResponder::respond($res, ['ok' => true, 'plan' => $plan, 'settings' => $row ?: null]);
    }

    // POST /api/whatsapp/send
    public static function send(Request $req, Response $res, array $args): Response
    {
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

        if ($plan === 'demo') {
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

        $result = self::sendMessage($cfg['phone_number_id'], $cfg['access_token'], $to, $templateName, $textBody, $params);

        $pdo->prepare("INSERT INTO whatsapp_messages(tenant_id,wa_message_id,recipient,template_name,body,status,error,sent_at,created_at) VALUES(?,?,?,?,?,?,?,?,?)")
            ->execute([$tenant, $result['wa_id'] ?? null, $to, $templateName, $textBody,
                $result['ok'] ? 'sent' : 'failed', $result['error'] ?? null, $now, $now]);

        return TemplateResponder::respond($res, ['ok' => $result['ok'], 'wa_message_id' => $result['wa_id'] ?? null, 'status' => $result['ok'] ? 'sent' : 'failed', 'error' => $result['error'] ?? null]);
    }

    // POST /api/whatsapp/broadcast
    public static function broadcast(Request $req, Response $res, array $args): Response
    {
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

        $cfg = null;
        if ($plan !== 'demo') {
            $s = $pdo->prepare("SELECT phone_number_id,access_token FROM whatsapp_settings WHERE tenant_id=? AND is_active=1");
            $s->execute([$tenant]);
            $cfg = $s->fetch(PDO::FETCH_ASSOC);
        }

        foreach (array_slice($numbers, 0, 200) as $to) {
            $to = preg_replace('/\D/', '', (string)$to);
            if (strlen($to) < 8) continue;
            if ($plan === 'demo' || !$cfg) {
                $status = rand(0, 9) < 9 ? 'delivered' : 'failed';
            } else {
                $r = self::sendMessage($cfg['phone_number_id'], $cfg['access_token'], $to, $template, $text, []);
                $status = $r['ok'] ? 'sent' : 'failed';
            }
            $pdo->prepare("INSERT INTO whatsapp_messages(tenant_id,recipient,template_name,body,status,sent_at,created_at) VALUES(?,?,?,?,?,?,?)")
                ->execute([$tenant, $to, $template, $text, $status, $now, $now]);
            $status === 'failed' ? $failed++ : $sent++;
        }

        return TemplateResponder::respond($res, ['ok' => true, 'sent' => $sent, 'failed' => $failed, 'total' => $sent + $failed]);
    }

    // GET /api/whatsapp/templates
    public static function templates(Request $req, Response $res, array $args): Response
    {
        self::ensureTables();
        $pdo    = Db::pdo();
        $tenant = self::tenant($req);
        $plan   = self::plan($req);

        $stmt = $pdo->prepare("SELECT * FROM whatsapp_templates WHERE tenant_id=? ORDER BY id DESC");
        $stmt->execute([$tenant]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        if (empty($rows)) {
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
        self::ensureTables();
        $pdo    = Db::pdo();
        $tenant = self::tenant($req);
        $plan   = self::plan($req);
        $limit  = max(1, min(100, (int)(($req->getQueryParams())['limit'] ?? 50)));

        if ($plan === 'demo') {
            return TemplateResponder::respond($res, ['ok' => true, 'plan' => 'demo', 'messages' => self::demoMessages()]);
        }

        $stmt = $pdo->prepare("SELECT * FROM whatsapp_messages WHERE tenant_id=? ORDER BY created_at DESC LIMIT ?");
        $stmt->execute([$tenant, $limit]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        if (empty($rows)) $rows = self::demoMessages();
        return TemplateResponder::respond($res, ['ok' => true, 'messages' => $rows]);
    }

    // POST /api/whatsapp/webhooks
    public static function webhook(Request $req, Response $res, array $args): Response
    {
        $q = $req->getQueryParams();
        // Meta webhook verification
        if ($q['hub.mode'] ?? '' === 'subscribe') {
            return TemplateResponder::respond($res, (int)($q['hub.challenge'] ?? 0));
        }

        $body = (array)($req->getParsedBody() ?? []);
        // 상태 업데이트 처리
        try {
            $pdo = Db::pdo();
            foreach (($body['entry'][0]['changes'][0]['value']['statuses'] ?? []) as $status) {
                $pdo->prepare("UPDATE whatsapp_messages SET status=?,delivered_at=CASE WHEN ? IN ('delivered') THEN ? ELSE delivered_at END,read_at=CASE WHEN ? = 'read' THEN ? ELSE read_at END WHERE wa_message_id=?")
                    ->execute([$status['status'], $status['status'], gmdate('c'), $status['status'], gmdate('c'), $status['id']]);
            }
        } catch (\Throwable) {}

        return TemplateResponder::respond($res, ['ok' => true]);
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
        foreach (($data['data'] ?? []) as $t) {
            $pdo->prepare("INSERT INTO whatsapp_templates(tenant_id,name,language,category,components_json,status,created_at) VALUES(?,?,?,?,?,?,?)
                ON CONFLICT DO NOTHING")
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
