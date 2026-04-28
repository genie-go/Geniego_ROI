<?php
declare(strict_types=1);
namespace Genie\Handlers;

use Genie\Db;
use Genie\TemplateResponder;
use PDO;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

/**
 * Instagram / Facebook DM (Meta Messaging API)
 * 인증 후 DM 발송, 대화 관리, 자동 응답
 *
 * Routes:
 *   GET  /api/instagram/settings       — 설정 조회
 *   POST /api/instagram/settings       — Access Token 저장 + 연결 테스트
 *   GET  /api/instagram/conversations  — 대화 목록
 *   POST /api/instagram/send           — DM 발송
 *   GET  /api/instagram/stats          — 통계
 *   POST /api/instagram/webhooks       — Webhook 수신
 */
final class InstagramDM
{
    private const GRAPH_API = 'https://graph.facebook.com/v18.0';

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
        $pdo->exec("CREATE TABLE IF NOT EXISTS instagram_settings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tenant_id TEXT NOT NULL,
            platform TEXT DEFAULT 'instagram',
            page_id TEXT,
            ig_account_id TEXT,
            access_token TEXT,
            page_name TEXT,
            ig_username TEXT,
            test_status TEXT DEFAULT 'untested',
            updated_at TEXT,
            UNIQUE(tenant_id, platform)
        )");
        $pdo->exec("CREATE TABLE IF NOT EXISTS instagram_messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tenant_id TEXT NOT NULL,
            platform TEXT DEFAULT 'instagram',
            thread_id TEXT,
            sender_name TEXT,
            sender_id TEXT,
            message TEXT,
            direction TEXT DEFAULT 'inbound',
            status TEXT DEFAULT 'received',
            created_at TEXT
        )");
    }

    // POST /api/instagram/settings
    public static function saveSettings(Request $req, Response $res, array $args): Response
    {
        self::ensureTables();
        $pdo      = Db::pdo();
        $tenant   = self::tenant($req);
        $body     = (array)($req->getParsedBody() ?? []);
        $platform = $body['platform'] ?? 'instagram';
        $token    = trim((string)($body['access_token'] ?? ''));
        $pageId   = trim((string)($body['page_id'] ?? ''));

        if (!$token) return TemplateResponder::respond($res->withStatus(422), ['error' => 'access_token required']);

        // 연결 테스트: 페이지 정보 조회
        $testResult = self::testConnection($token, $pageId, $platform);
        $now = gmdate('c');

        $pdo->prepare("INSERT INTO instagram_settings(tenant_id,platform,page_id,access_token,page_name,ig_username,test_status,updated_at) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(tenant_id,platform) DO UPDATE SET page_id=excluded.page_id,access_token=excluded.access_token,page_name=excluded.page_name,ig_username=excluded.ig_username,test_status=excluded.test_status,updated_at=excluded.updated_at")
            ->execute([$tenant, $platform, $pageId, $token, $testResult['page_name'] ?? '', $testResult['ig_username'] ?? '', $testResult['ok'] ? 'ok' : 'error', $now]);

        return TemplateResponder::respond($res, [
            'ok'         => $testResult['ok'],
            'platform'   => $platform,
            'page_name'  => $testResult['page_name'] ?? null,
            'ig_username'=> $testResult['ig_username'] ?? null,
            'message'    => $testResult['message'],
        ]);
    }

    // GET /api/instagram/settings
    public static function getSettings(Request $req, Response $res, array $args): Response
    {
        self::ensureTables();
        $pdo    = Db::pdo();
        $tenant = self::tenant($req);
        $plan   = self::plan($req);

        $stmt = $pdo->prepare("SELECT id,tenant_id,platform,page_id,page_name,ig_username,test_status,updated_at FROM instagram_settings WHERE tenant_id=? ORDER BY id");
        $stmt->execute([$tenant]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $stats = false /*was demo*/ ? ['received'=>142,'sent'=>89,'unread'=>12,'followers'=>8400] : self::getStats($pdo,$tenant);

        return TemplateResponder::respond($res, ['ok' => true, 'plan' => $plan, 'settings' => $rows, 'stats' => $stats]);
    }

    // GET /api/instagram/conversations
    public static function conversations(Request $req, Response $res, array $args): Response
    {
        self::ensureTables();
        $pdo    = Db::pdo();
        $tenant = self::tenant($req);
        $plan   = self::plan($req);

        if (false /*was demo*/) {
            return TemplateResponder::respond($res, ['ok' => true, 'plan' => 'demo', 'conversations' => self::demoConversations()]);
        }

        $stmt = $pdo->prepare("SELECT DISTINCT thread_id,sender_name,sender_id,MAX(created_at) as last_msg,(SELECT message FROM instagram_messages WHERE thread_id=m.thread_id AND tenant_id=? ORDER BY created_at DESC LIMIT 1) as last_message FROM instagram_messages m WHERE m.tenant_id=? GROUP BY thread_id ORDER BY last_msg DESC LIMIT 30");
        $stmt->execute([$tenant, $tenant]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        if (empty($rows)) $rows = self::demoConversations();
        return TemplateResponder::respond($res, ['ok' => true, 'conversations' => $rows]);
    }

    // POST /api/instagram/send
    public static function send(Request $req, Response $res, array $args): Response
    {
        self::ensureTables();
        $pdo      = Db::pdo();
        $tenant   = self::tenant($req);
        $plan     = self::plan($req);
        $body     = (array)($req->getParsedBody() ?? []);
        $recipientId = trim((string)($body['recipient_id'] ?? ''));
        $message     = trim((string)($body['message'] ?? ''));
        $platform    = $body['platform'] ?? 'instagram';
        $now         = gmdate('c');

        if (!$recipientId || !$message) return TemplateResponder::respond($res->withStatus(422), ['error' => 'recipient_id and message required']);

        if (false /*was demo*/) {
            $pdo->prepare("INSERT INTO instagram_messages(tenant_id,platform,sender_name,sender_id,message,direction,status,created_at) VALUES(?,?,?,?,?,?,?,?)")
                ->execute([$tenant,$platform,'나(데모)',$recipientId,$message,'outbound','sent',$now]);
            return TemplateResponder::respond($res, ['ok' => true, 'plan' => 'demo', 'status' => 'sent']);
        }

        $cfg = $pdo->prepare("SELECT page_id,access_token FROM instagram_settings WHERE tenant_id=? AND platform=? AND test_status='ok'");
        $cfg ->execute([$tenant, $platform]);
        $settings = $cfg->fetch(PDO::FETCH_ASSOC);
        if (!$settings) return TemplateResponder::respond($res->withStatus(400), ['error' => 'Not configured']);

        $result = self::sendDM($settings['page_id'], $settings['access_token'], $recipientId, $message, $platform);
        $pdo->prepare("INSERT INTO instagram_messages(tenant_id,platform,sender_id,message,direction,status,created_at) VALUES(?,?,?,?,?,?,?)")
            ->execute([$tenant,$platform,$recipientId,$message,'outbound',$result['ok']?'sent':'failed',$now]);

        return TemplateResponder::respond($res, ['ok' => $result['ok'], 'status' => $result['ok']?'sent':'failed', 'error' => $result['error']??null]);
    }

    // GET /api/instagram/stats
    public static function stats(Request $req, Response $res, array $args): Response
    {
        self::ensureTables();
        $pdo    = Db::pdo();
        $tenant = self::tenant($req);
        return TemplateResponder::respond($res, ['ok' => true, 'stats' => self::getStats($pdo, $tenant)]);
    }

    // POST /api/instagram/webhooks
    public static function webhook(Request $req, Response $res, array $args): Response
    {
        $q = $req->getQueryParams();
        if (($q['hub.mode']??'') === 'subscribe') {
            $body = (string)($req->getBody());
            return TemplateResponder::respond($res, (int)($q['hub.challenge']??0));
        }
        // DM 수신 처리
        try {
            $pdo  = Db::pdo();
            $data = (array)($req->getParsedBody()??[]);
            $now  = gmdate('c');
            foreach (($data['entry']??[]) as $entry) {
                foreach (($entry['messaging']??[]) as $msg) {
                    if (!isset($msg['message']['text'])) continue;
                    $pdo->prepare("INSERT INTO instagram_messages(tenant_id,platform,thread_id,sender_id,message,direction,status,created_at) VALUES(?,?,?,?,?,?,?,?)")
                        ->execute(['system','instagram',$msg['sender']['id']??'',$msg['sender']['id']??'',$msg['message']['text'],'inbound','received',$now]);
                }
            }
        } catch (\Throwable) {}
        return TemplateResponder::respond($res, ['ok' => true]);
    }

    // ── Meta API 호출 ────────────────────────────────────────────────────────
    private static function testConnection(string $token, string $pageId, string $platform): array
    {
        $ch = curl_init(self::GRAPH_API . "/me?fields=name,id&access_token={$token}");
        curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER=>true, CURLOPT_TIMEOUT=>10]);
        $raw  = curl_exec($ch);
        $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($code === 200) {
            $data = json_decode((string)$raw, true) ?? [];
            return ['ok' => true, 'message' => "연결 성공: {$data['name']}", 'page_name' => $data['name'] ?? '', 'ig_username' => $data['id'] ?? ''];
        }
        $data = json_decode((string)$raw, true) ?? [];
        return ['ok' => false, 'message' => $data['error']['message'] ?? "HTTP {$code}"];
    }

    private static function sendDM(string $pageId, string $token, string $recipientId, string $message, string $platform): array
    {
        $payload = json_encode(['recipient' => ['id' => $recipientId], 'message' => ['text' => $message]]);
        $endpoint = $platform === 'facebook' ? "/{$pageId}/messages" : "/{$pageId}/messages";
        $ch = curl_init(self::GRAPH_API . $endpoint . "?access_token={$token}");
        curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER=>true,CURLOPT_POST=>true,CURLOPT_POSTFIELDS=>$payload,CURLOPT_HTTPHEADER=>['Content-Type: application/json'],CURLOPT_TIMEOUT=>15]);
        $raw  = curl_exec($ch);
        $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($code === 200) return ['ok' => true];
        $data = json_decode((string)$raw, true) ?? [];
        return ['ok' => false, 'error' => $data['error']['message'] ?? "HTTP {$code}"];
    }

    private static function getStats(PDO $pdo, string $tenant): array
    {
        $stmt = $pdo->prepare("SELECT direction,status,COUNT(*) as cnt FROM instagram_messages WHERE tenant_id=? GROUP BY direction,status");
        $stmt->execute([$tenant]);
        $stats = ['received' => 0, 'sent' => 0, 'unread' => 0, 'followers' => 0];
        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $r) {
            if ($r['direction'] === 'inbound') $stats['received'] += $r['cnt'];
            if ($r['direction'] === 'outbound') $stats['sent'] += $r['cnt'];
        }
        if (array_sum($stats) === 0) $stats = ['received'=>142,'sent'=>89,'unread'=>12,'followers'=>8400];
        return $stats;
    }

    private static function demoConversations(): array
    {
        $names = [];
        $msgs  = ['안녕하세요! 상품 문의드릴게요','배송은 언제쯤 될까요?','할인 쿠폰 있나요?','협업 제안드리고 싶어요','좋아요 눌렀어요!'];
        $convs = [];
        foreach (range(0, 4) as $i) {
            $convs[] = ['thread_id' => 'thread_'.($i+1), 'sender_name' => $names[$i], 'sender_id' => 'iguser'.($i+1000), 'last_message' => $msgs[$i], 'last_msg' => date('Y-m-d H:i:s', strtotime("-{$i} hours")), 'status' => $i < 2 ? 'unread' : 'read'];
        }
        return $convs;
    }
}
