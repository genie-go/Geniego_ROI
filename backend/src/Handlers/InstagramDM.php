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
        $vals = [$tenant, $platform, $pageId, ($token === '' ? '' : \Genie\Crypto::encrypt($token)), $testResult['page_name'] ?? '', $testResult['ig_username'] ?? '', $testResult['ok'] ? 'ok' : 'error', $now]; // 209차 P1: secret-at-rest
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
        if (!empty($settings['access_token'])) $settings['access_token'] = \Genie\Crypto::decrypt((string)$settings['access_token']); // 209차 P1: secret-at-rest

        $result = self::sendDM($settings['page_id'], $settings['access_token'], $recipientId, $message, $platform);
        $pdo->prepare("INSERT INTO instagram_messages(tenant_id,platform,sender_id,message,direction,status,created_at) VALUES(?,?,?,?,?,?,?)")
            ->execute([$tenant,$platform,$recipientId,$message,'outbound',$result['ok']?'sent':'failed',$now]);

        return TemplateResponder::respond($res, ['ok' => $result['ok'], 'status' => $result['ok']?'sent':'failed', 'error' => $result['error']??null]);
    }

    // POST /api/instagram/broadcast — [현차수] DM 단체 발송(프론트 시뮬레이션→실배선).
    //   Meta 정책: 24시간 윈도우 내(고객이 먼저 DM 보낸) recipient 에게만 발송 가능.
    //   대상: 최근 수신(inbound) 대화의 sender_id 집합. 발송 결과는 instagram_messages 에 적재→통계/이력 동기화.
    public static function broadcast(Request $req, Response $res, array $args): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $pdo      = Db::pdo();
        $tenant   = self::tenant($req);
        $body     = (array)($req->getParsedBody() ?? []);
        $message  = trim((string)($body['message'] ?? ''));
        $platform = $body['platform'] ?? 'instagram';
        $now      = gmdate('c');

        if (!$message) return TemplateResponder::respond($res->withStatus(422), ['ok' => false, 'error' => 'message required']);

        // 발신 설정(연결됨) 확인 — 미설정 시 가짜 발송 금지(honest).
        $cfg = $pdo->prepare("SELECT page_id,access_token FROM instagram_settings WHERE tenant_id=? AND platform=? AND test_status='ok'");
        $cfg->execute([$tenant, $platform]);
        $settings = $cfg->fetch(PDO::FETCH_ASSOC);
        if (!$settings) {
            return TemplateResponder::respond($res->withStatus(422), ['ok' => false, 'mode' => 'unconfigured',
                'sent' => 0, 'failed' => 0, 'total' => 0,
                'error' => 'Instagram/Facebook 연동 설정이 없습니다. 설정에서 Page Access Token 을 먼저 등록하세요.']);
        }
        if (!empty($settings['access_token'])) $settings['access_token'] = \Genie\Crypto::decrypt((string)$settings['access_token']);

        // 대상 수신자: 24h 윈도우 내 inbound 대화의 distinct sender_id(Meta 정책 준수).
        $rcp = $pdo->prepare("SELECT DISTINCT sender_id FROM instagram_messages WHERE tenant_id=? AND platform=? AND direction='inbound' AND sender_id<>'' ORDER BY created_at DESC LIMIT 200");
        $rcp->execute([$tenant, $platform]);
        $recipients = array_column($rcp->fetchAll(PDO::FETCH_ASSOC), 'sender_id');

        $sent = 0; $failed = 0;
        foreach ($recipients as $rid) {
            $r = self::sendDM($settings['page_id'], $settings['access_token'], (string)$rid, $message, $platform);
            $pdo->prepare("INSERT INTO instagram_messages(tenant_id,platform,sender_id,message,direction,status,created_at) VALUES(?,?,?,?,?,?,?)")
                ->execute([$tenant, $platform, $rid, $message, 'outbound', $r['ok'] ? 'sent' : 'failed', $now]);
            $r['ok'] ? $sent++ : $failed++;
        }

        return TemplateResponder::respond($res, ['ok' => true, 'sent' => $sent, 'failed' => $failed, 'total' => $sent + $failed]);
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
            $vt = getenv('META_VERIFY_TOKEN');
            if ($vt && ($q['hub.verify_token'] ?? '') !== $vt) {
                return TemplateResponder::respond($res->withStatus(403), ['ok' => false]);
            }
            return TemplateResponder::respond($res, (int)($q['hub.challenge']??0));
        }
        // [현 차수] 은행급 fail-closed: Meta 서명 검증 필수화. META_APP_SECRET 미설정 시 미검증 DM payload 미처리
        //   (위조 inbound DM 주입 차단). 200 ok 로 Meta 재시도 폭주만 회피.
        $appSecret = getenv('META_APP_SECRET');
        if (!$appSecret) {
            error_log('[InstagramDM.webhook] META_APP_SECRET 미설정 — 미검증 webhook 처리 거부(fail-closed)');
            return TemplateResponder::respond($res, ['ok' => true, 'skipped' => 'unverified']);
        }
        $bs = $req->getBody(); $bs->rewind(); $raw = $bs->getContents();
        $expected = 'sha256=' . hash_hmac('sha256', $raw, $appSecret);
        if (!hash_equals($expected, $req->getHeaderLine('X-Hub-Signature-256'))) {
            return TemplateResponder::respond($res->withStatus(403), ['ok' => false, 'error' => 'invalid signature']);
        }
        // DM 수신 처리
        try {
            $pdo  = Db::pdo();
            $data = (array)($req->getParsedBody()??[]);
            $now  = gmdate('c');
            foreach (($data['entry']??[]) as $entry) {
                // [현 차수] 테넌트 격리: 수신 webhook 의 entry.id(page/IG 계정 ID)로 소유 테넌트를 역매핑한다.
                //   과거엔 tenant_id='system' 고정 적재 → 소유 테넌트에 미노출(고아 메시지). 이제 instagram_settings
                //   에 등록된 page_id/ig_account_id 로 소유 테넌트를 찾고, 미매핑이면 적재하지 않는다(오염 방지).
                $pageId = (string)($entry['id'] ?? '');
                $tenant = self::resolveTenantByPage($pdo, $pageId);
                if ($tenant === '') { error_log("[InstagramDM.webhook] unmapped page_id={$pageId} — message skipped"); continue; }
                foreach (($entry['messaging']??[]) as $msg) {
                    if (!isset($msg['message']['text'])) continue;
                    $pdo->prepare("INSERT INTO instagram_messages(tenant_id,platform,thread_id,sender_id,message,direction,status,created_at) VALUES(?,?,?,?,?,?,?,?)")
                        ->execute([$tenant,'instagram',$msg['sender']['id']??'',$msg['sender']['id']??'',$msg['message']['text'],'inbound','received',$now]);
                }
            }
        } catch (\Throwable) {}
        return TemplateResponder::respond($res, ['ok' => true]);
    }

    /** [현 차수] 수신 webhook 의 page/IG 계정 ID → 소유 테넌트 역매핑(instagram_settings, 평문 page_id). 미등록=''. */
    private static function resolveTenantByPage(PDO $pdo, string $pageId): string
    {
        if ($pageId === '') return '';
        try {
            $st = $pdo->prepare("SELECT tenant_id FROM instagram_settings WHERE page_id=? OR ig_account_id=? LIMIT 1");
            $st->execute([$pageId, $pageId]);
            return (string)($st->fetchColumn() ?: '');
        } catch (\Throwable $e) { return ''; }
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
