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

    // 191차 부활: 세션 plan/tenant(UserAuth) + bypass(/instagram) + requirePro. webhook 만 무인증(Meta).
    private static function isMysql(\PDO $pdo): bool { return $pdo->getAttribute(\PDO::ATTR_DRIVER_NAME) === 'mysql'; }

    private static function plan(Request $req): string
    {
        $u = UserAuth::authedUser($req);
        return $u['plan'] ?? 'demo';
    }

    private static function tenant(Request $req): string
    {
        $t = UserAuth::authedTenant($req);
        return ($t !== null && $t !== '') ? $t : 'demo';
    }

    private static function ensureTables(): void
    {
        $pdo = Db::pdo();
        if (self::isMysql($pdo)) {
            $pdo->exec("CREATE TABLE IF NOT EXISTS instagram_settings (
                id INT AUTO_INCREMENT PRIMARY KEY, tenant_id VARCHAR(100) NOT NULL, platform VARCHAR(20) DEFAULT 'instagram',
                page_id VARCHAR(100), ig_account_id VARCHAR(100), access_token VARCHAR(512), page_name VARCHAR(255),
                ig_username VARCHAR(120), test_status VARCHAR(20) DEFAULT 'untested', updated_at VARCHAR(32),
                UNIQUE KEY uq_ig_settings (tenant_id, platform)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
            $pdo->exec("CREATE TABLE IF NOT EXISTS instagram_messages (
                id INT AUTO_INCREMENT PRIMARY KEY, tenant_id VARCHAR(100) NOT NULL, platform VARCHAR(20) DEFAULT 'instagram',
                thread_id VARCHAR(120), sender_name VARCHAR(255), sender_id VARCHAR(120), message TEXT,
                direction VARCHAR(20) DEFAULT 'inbound', status VARCHAR(20) DEFAULT 'received', created_at VARCHAR(32),
                KEY idx_ig_msg_tenant (tenant_id), KEY idx_ig_msg_thread (thread_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
        } else {
            $pdo->exec("CREATE TABLE IF NOT EXISTS instagram_settings (
                id INTEGER PRIMARY KEY AUTOINCREMENT, tenant_id TEXT NOT NULL, platform TEXT DEFAULT 'instagram',
                page_id TEXT, ig_account_id TEXT, access_token TEXT, page_name TEXT, ig_username TEXT,
                test_status TEXT DEFAULT 'untested', updated_at TEXT, UNIQUE(tenant_id, platform))");
            $pdo->exec("CREATE TABLE IF NOT EXISTS instagram_messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT, tenant_id TEXT NOT NULL, platform TEXT DEFAULT 'instagram',
                thread_id TEXT, sender_name TEXT, sender_id TEXT, message TEXT, direction TEXT DEFAULT 'inbound',
                status TEXT DEFAULT 'received', created_at TEXT)");
        }
    }

    // POST /api/instagram/settings
    public static function saveSettings(Request $req, Response $res, array $args): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
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

        // 191차: ON CONFLICT(tenant_id,platform) → 드라이버별 upsert.
        $cols = "tenant_id,platform,page_id,access_token,page_name,ig_username,test_status,updated_at";
        $vals = [$tenant, $platform, $pageId, $token, $testResult['page_name'] ?? '', $testResult['ig_username'] ?? '', $testResult['ok'] ? 'ok' : 'error', $now];
        if (self::isMysql($pdo)) {
            $pdo->prepare("INSERT INTO instagram_settings($cols) VALUES(?,?,?,?,?,?,?,?)
                ON DUPLICATE KEY UPDATE page_id=VALUES(page_id),access_token=VALUES(access_token),page_name=VALUES(page_name),ig_username=VALUES(ig_username),test_status=VALUES(test_status),updated_at=VALUES(updated_at)")->execute($vals);
        } else {
            $pdo->prepare("INSERT INTO instagram_settings($cols) VALUES(?,?,?,?,?,?,?,?)
                ON CONFLICT(tenant_id,platform) DO UPDATE SET page_id=excluded.page_id,access_token=excluded.access_token,page_name=excluded.page_name,ig_username=excluded.ig_username,test_status=excluded.test_status,updated_at=excluded.updated_at")->execute($vals);
        }

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
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $pdo    = Db::pdo();
        $tenant = self::tenant($req);
        $plan   = self::plan($req);

        $stmt = $pdo->prepare("SELECT id,tenant_id,platform,page_id,page_name,ig_username,test_status,updated_at FROM instagram_settings WHERE tenant_id=? ORDER BY id");
        $stmt->execute([$tenant]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        return TemplateResponder::respond($res, ['ok' => true, 'plan' => $plan, 'settings' => $rows, 'stats' => self::getStats($pdo, $tenant, $plan)]);
    }

    // GET /api/instagram/conversations
    public static function conversations(Request $req, Response $res, array $args): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $pdo    = Db::pdo();
        $tenant = self::tenant($req);
        $plan   = self::plan($req);

        // 191차: GROUP BY 에 비집계 컬럼 포함(MySQL ONLY_FULL_GROUP_BY 안전). 빈 결과 demoConversations 는 데모 전용.
        $stmt = $pdo->prepare("SELECT thread_id,sender_name,sender_id,MAX(created_at) as last_msg,(SELECT message FROM instagram_messages WHERE thread_id=m.thread_id AND tenant_id=? ORDER BY created_at DESC LIMIT 1) as last_message FROM instagram_messages m WHERE m.tenant_id=? GROUP BY thread_id,sender_name,sender_id ORDER BY last_msg DESC LIMIT 30");
        $stmt->execute([$tenant, $tenant]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        if (empty($rows) && $plan === 'demo') $rows = self::demoConversations();
        return TemplateResponder::respond($res, ['ok' => true, 'conversations' => $rows]);
    }

    // POST /api/instagram/send
    public static function send(Request $req, Response $res, array $args): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
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
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $pdo    = Db::pdo();
        $tenant = self::tenant($req);
        return TemplateResponder::respond($res, ['ok' => true, 'stats' => self::getStats($pdo, $tenant, self::plan($req))]);
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

    private static function getStats(PDO $pdo, string $tenant, string $plan = 'pro'): array
    {
        $stmt = $pdo->prepare("SELECT direction,status,COUNT(*) as cnt FROM instagram_messages WHERE tenant_id=? GROUP BY direction,status");
        $stmt->execute([$tenant]);
        $stats = ['received' => 0, 'sent' => 0, 'unread' => 0, 'followers' => 0];
        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $r) {
            if ($r['direction'] === 'inbound') $stats['received'] += $r['cnt'];
            if ($r['direction'] === 'outbound') $stats['sent'] += $r['cnt'];
        }
        // 191차: 빈 통계 가짜값(142/89/...)은 데모 전용. 운영은 정직한 0.
        if (array_sum($stats) === 0 && $plan === 'demo') $stats = ['received'=>142,'sent'=>89,'unread'=>12,'followers'=>8400];
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
