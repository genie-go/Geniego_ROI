<?php
declare(strict_types=1);
namespace Genie\Handlers;

use Genie\Db;
use Genie\TemplateResponder;
use PDO;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

/**
 * LINE Messaging API 채널 — 191차 신설(채널 dead-route 보강).
 *   프론트 LINEChannel.jsx 가 /api/line/{settings,campaigns,templates,stats} 를 호출하나 백엔드 부재였음.
 *   부활 채널(SMS/WhatsApp/Kakao) 동일 패턴: 세션 self-auth(bypass)+requirePro+authedTenant 격리
 *   +ensureTables 드라이버분기. 미설정 시 honest(가짜 미생성), 데모는 프론트 로컬 시드.
 *
 * Routes(등록 /line, 호출 /api/line — index.php basePath strip 정합):
 *   GET/POST /line/settings · GET /line/templates · POST /line/templates · DELETE /line/templates/{id}
 *   GET /line/campaigns · POST /line/campaigns · POST /line/campaigns/{id}/send · DELETE /line/campaigns/{id}
 *   GET /line/stats · POST /line/webhooks(무인증)
 */
final class Line
{
    private const API = 'https://api.line.me/v2/bot';

    private static function isMysql(\PDO $pdo): bool { return $pdo->getAttribute(\PDO::ATTR_DRIVER_NAME) === 'mysql'; }
    private static function now(): string { return gmdate('Y-m-d H:i:s'); }

    private static function plan(Request $req): string { $u = UserAuth::authedUser($req); return $u['plan'] ?? 'demo'; }
    private static function tenant(Request $req): string { $t = UserAuth::authedTenant($req); return ($t !== null && $t !== '') ? $t : 'demo'; }

    private static function ensureTables(): void
    {
        $pdo = Db::pdo();
        if (self::isMysql($pdo)) {
            $pdo->exec("CREATE TABLE IF NOT EXISTS line_settings (
                id INT AUTO_INCREMENT PRIMARY KEY, tenant_id VARCHAR(100) NOT NULL, channel_id VARCHAR(120),
                channel_secret VARCHAR(255), access_token VARCHAR(512), test_status VARCHAR(20) DEFAULT 'untested',
                updated_at VARCHAR(32), UNIQUE KEY uq_line_settings_tenant (tenant_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
            $pdo->exec("CREATE TABLE IF NOT EXISTS line_templates (
                id INT AUTO_INCREMENT PRIMARY KEY, tenant_id VARCHAR(100) NOT NULL, name VARCHAR(200) NOT NULL,
                type VARCHAR(30) DEFAULT 'marketing', content TEXT, status VARCHAR(20) DEFAULT 'approved',
                usage_count INT DEFAULT 0, created_at VARCHAR(32), KEY idx_line_tpl_tenant (tenant_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
            $pdo->exec("CREATE TABLE IF NOT EXISTS line_campaigns (
                id INT AUTO_INCREMENT PRIMARY KEY, tenant_id VARCHAR(100) NOT NULL, name VARCHAR(200) NOT NULL,
                type VARCHAR(30) DEFAULT 'marketing', template_id INT, status VARCHAR(20) DEFAULT 'draft',
                sent INT DEFAULT 0, opened INT DEFAULT 0, clicked INT DEFAULT 0, created_at VARCHAR(32), sent_at VARCHAR(32),
                KEY idx_line_cmp_tenant (tenant_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
            $pdo->exec("CREATE TABLE IF NOT EXISTS line_sends (
                id INT AUTO_INCREMENT PRIMARY KEY, tenant_id VARCHAR(100) NOT NULL, campaign_id INT, recipient VARCHAR(120),
                status VARCHAR(20) DEFAULT 'pending', sent_at VARCHAR(32), KEY idx_line_send_tenant (tenant_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
        } else {
            $pdo->exec("CREATE TABLE IF NOT EXISTS line_settings (id INTEGER PRIMARY KEY AUTOINCREMENT, tenant_id TEXT NOT NULL,
                channel_id TEXT, channel_secret TEXT, access_token TEXT, test_status TEXT DEFAULT 'untested', updated_at TEXT, UNIQUE(tenant_id))");
            $pdo->exec("CREATE TABLE IF NOT EXISTS line_templates (id INTEGER PRIMARY KEY AUTOINCREMENT, tenant_id TEXT NOT NULL,
                name TEXT NOT NULL, type TEXT DEFAULT 'marketing', content TEXT, status TEXT DEFAULT 'approved', usage_count INTEGER DEFAULT 0, created_at TEXT)");
            $pdo->exec("CREATE TABLE IF NOT EXISTS line_campaigns (id INTEGER PRIMARY KEY AUTOINCREMENT, tenant_id TEXT NOT NULL,
                name TEXT NOT NULL, type TEXT DEFAULT 'marketing', template_id INTEGER, status TEXT DEFAULT 'draft',
                sent INTEGER DEFAULT 0, opened INTEGER DEFAULT 0, clicked INTEGER DEFAULT 0, created_at TEXT, sent_at TEXT)");
            $pdo->exec("CREATE TABLE IF NOT EXISTS line_sends (id INTEGER PRIMARY KEY AUTOINCREMENT, tenant_id TEXT NOT NULL,
                campaign_id INTEGER, recipient TEXT, status TEXT DEFAULT 'pending', sent_at TEXT)");
        }
    }

    /* ─── GET /line/settings ─── */
    public static function getSettings(Request $req, Response $res, array $args): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $tenant = self::tenant($req);
        $st = Db::pdo()->prepare("SELECT channel_id, test_status, updated_at FROM line_settings WHERE tenant_id=?");
        $st->execute([$tenant]);
        $row = $st->fetch(PDO::FETCH_ASSOC) ?: null;
        $host = ($_SERVER['HTTP_HOST'] ?? 'roi.genie-go.com');
        return TemplateResponder::respond($res, [
            'ok'         => true,
            'channel_id' => $row['channel_id'] ?? null,
            'connected'  => $row ? ($row['test_status'] === 'ok') : false,
            'webhook'    => 'https://' . $host . '/api/line/webhooks',
            'plan'       => 'Messaging API',
        ]);
    }

    /* ─── POST /line/settings ─── 자격증명 저장 + 연결 테스트 */
    public static function saveSettings(Request $req, Response $res, array $args): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $pdo = Db::pdo();
        $tenant = self::tenant($req);
        $b = (array)($req->getParsedBody() ?? []);
        $channelId = trim((string)($b['channel_id'] ?? ''));
        $secret    = trim((string)($b['channel_secret'] ?? ''));
        $token     = trim((string)($b['access_token'] ?? ''));
        if ($token === '') return TemplateResponder::respond($res->withStatus(422), ['error' => 'access_token required']);

        $test = self::testConnection($token);
        $now = self::now();
        $cols = "tenant_id,channel_id,channel_secret,access_token,test_status,updated_at";
        // [현 차수] Low: secret-at-rest 암호화(AES-256-GCM) — 타 메시징 채널(Kakao/WhatsApp/IG/SMS)과 동일.
        $secEnc = $secret !== '' ? \Genie\Crypto::encrypt($secret) : '';
        $tokEnc = $token  !== '' ? \Genie\Crypto::encrypt($token)  : '';
        $vals = [$tenant, $channelId, $secEnc, $tokEnc, $test['ok'] ? 'ok' : 'error', $now];
        if (self::isMysql($pdo)) {
            $pdo->prepare("INSERT INTO line_settings($cols) VALUES(?,?,?,?,?,?)
                ON DUPLICATE KEY UPDATE channel_id=VALUES(channel_id),channel_secret=VALUES(channel_secret),
                access_token=VALUES(access_token),test_status=VALUES(test_status),updated_at=VALUES(updated_at)")->execute($vals);
        } else {
            $pdo->prepare("INSERT INTO line_settings($cols) VALUES(?,?,?,?,?,?)
                ON CONFLICT(tenant_id) DO UPDATE SET channel_id=excluded.channel_id,channel_secret=excluded.channel_secret,
                access_token=excluded.access_token,test_status=excluded.test_status,updated_at=excluded.updated_at")->execute($vals);
        }
        return TemplateResponder::respond($res, ['ok' => $test['ok'], 'connected' => $test['ok'], 'message' => $test['message']]);
    }

    /* ─── GET /line/templates ─── */
    public static function listTemplates(Request $req, Response $res, array $args): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        // usage 는 MySQL 예약어 → usage_count 로 받아 PHP 에서 'usage' 키로 매핑(프론트 기대 필드).
        $st = Db::pdo()->prepare("SELECT id, name, type, status, usage_count, content FROM line_templates WHERE tenant_id=? ORDER BY id DESC"); // [266차 계약불일치] content 추가(프론트 템플릿 미리보기 소비)
        $st->execute([self::tenant($req)]);
        $rows = $st->fetchAll(PDO::FETCH_ASSOC);
        foreach ($rows as &$r) { $r['usage'] = (int)($r['usage_count'] ?? 0); unset($r['usage_count']); }
        return TemplateResponder::respond($res, ['ok' => true, 'templates' => $rows]);
    }

    /* ─── POST /line/templates ─── */
    public static function createTemplate(Request $req, Response $res, array $args): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $pdo = Db::pdo();
        $tenant = self::tenant($req);
        $b = (array)($req->getParsedBody() ?? []);
        if (empty($b['name'])) return TemplateResponder::respond($res->withStatus(400), ['ok' => false, 'error' => 'name 필수']);
        $pdo->prepare("INSERT INTO line_templates(tenant_id,name,type,content,status,created_at) VALUES(?,?,?,?,?,?)")
            ->execute([$tenant, $b['name'], $b['type'] ?? 'marketing', $b['content'] ?? '', 'approved', self::now()]);
        return TemplateResponder::respond($res, ['ok' => true, 'id' => (int)$pdo->lastInsertId()]);
    }

    /* ─── DELETE /line/templates/{id} ─── */
    public static function deleteTemplate(Request $req, Response $res, array $args): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        Db::pdo()->prepare("DELETE FROM line_templates WHERE id=? AND tenant_id=?")->execute([(int)$args['id'], self::tenant($req)]);
        return TemplateResponder::respond($res, ['ok' => true]);
    }

    /* ─── GET /line/campaigns ─── */
    public static function listCampaigns(Request $req, Response $res, array $args): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $st = Db::pdo()->prepare("SELECT c.id, c.name, c.type, c.status, c.sent, c.opened, c.clicked, t.name AS template_name
            FROM line_campaigns c LEFT JOIN line_templates t ON t.id=c.template_id AND t.tenant_id=c.tenant_id
            WHERE c.tenant_id=? ORDER BY c.id DESC");
        $st->execute([self::tenant($req)]);
        return TemplateResponder::respond($res, ['ok' => true, 'campaigns' => $st->fetchAll(PDO::FETCH_ASSOC)]);
    }

    /* ─── POST /line/campaigns ─── */
    public static function createCampaign(Request $req, Response $res, array $args): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $pdo = Db::pdo();
        $tenant = self::tenant($req);
        $b = (array)($req->getParsedBody() ?? []);
        if (empty($b['name'])) return TemplateResponder::respond($res->withStatus(400), ['ok' => false, 'error' => 'name 필수']);
        $pdo->prepare("INSERT INTO line_campaigns(tenant_id,name,type,template_id,status,created_at) VALUES(?,?,?,?,?,?)")
            ->execute([$tenant, $b['name'], $b['type'] ?? 'marketing', (int)($b['template_id'] ?? 0), 'draft', self::now()]);
        return TemplateResponder::respond($res, ['ok' => true, 'id' => (int)$pdo->lastInsertId()]);
    }

    /* ─── POST /line/campaigns/{id}/send ─── (LINE 브로드캐스트, 미설정 시 honest) */
    public static function sendCampaign(Request $req, Response $res, array $args): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $pdo = Db::pdo();
        $tenant = self::tenant($req);
        $cid = (int)$args['id'];
        $camp = $pdo->prepare("SELECT * FROM line_campaigns WHERE id=? AND tenant_id=?");
        $camp->execute([$cid, $tenant]);
        $campaign = $camp->fetch(PDO::FETCH_ASSOC);
        if (!$campaign) return TemplateResponder::respond($res->withStatus(404), ['ok' => false, 'error' => '캠페인 없음']);

        $cfg = $pdo->prepare("SELECT access_token FROM line_settings WHERE tenant_id=? AND test_status='ok'");
        $cfg->execute([$tenant]);
        $s = $cfg->fetch(PDO::FETCH_ASSOC);
        if (!$s) {
            return TemplateResponder::respond($res->withStatus(422), ['ok' => false, 'mode' => 'unconfigured',
                'error' => 'LINE 채널 설정이 없습니다. 설정에서 Access Token 을 먼저 등록하세요.']);
        }
        // [254차 초고도화] 실 브로드캐스트 — 캠페인 연결 템플릿 본문(line_templates.content)을 사용(기존 하드코딩 제거).
        $msg = '';
        $tid = (int)($campaign['template_id'] ?? 0);
        if ($tid > 0) {
            try { $tq = $pdo->prepare("SELECT content FROM line_templates WHERE id=? AND tenant_id=?"); $tq->execute([$tid, $tenant]); $msg = trim((string)($tq->fetchColumn() ?: '')); } catch (\Throwable $e) {}
        }
        if ($msg === '') $msg = trim((string)($campaign['name'] ?? '')) ?: 'GenieGo';
        $r = self::broadcast(\Genie\Crypto::decrypt((string)$s['access_token']), $msg); // [현 차수] Low: 복호화(평문 passthrough 하위호환)
        // [259차] 브로드캐스트 실패(토큰만료·쿼터) 시 status='sent' 확정하던 것 수정 — 실 결과로 sent/failed 분기(WhatsApp/Kakao 정합·재발송 판단 정확).
        $st = !empty($r['ok']) ? 'sent' : 'failed';
        $pdo->prepare("UPDATE line_campaigns SET status=?, sent_at=? WHERE id=? AND tenant_id=?")->execute([$st, self::now(), $cid, $tenant]);
        return TemplateResponder::respond($res, ['ok' => $r['ok'], 'mode' => 'live', 'error' => $r['error'] ?? null]);
    }

    /* ─── DELETE /line/campaigns/{id} ─── */
    public static function deleteCampaign(Request $req, Response $res, array $args): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $pdo = Db::pdo();
        $tenant = self::tenant($req);
        $id = (int)$args['id'];
        $pdo->prepare("DELETE FROM line_sends WHERE campaign_id=? AND tenant_id=?")->execute([$id, $tenant]);
        $pdo->prepare("DELETE FROM line_campaigns WHERE id=? AND tenant_id=?")->execute([$id, $tenant]);
        return TemplateResponder::respond($res, ['ok' => true]);
    }

    /* ─── GET /line/stats ─── (운영: 실집계, 미설정 0. 가짜 금지) */
    public static function stats(Request $req, Response $res, array $args): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $pdo = Db::pdo();
        $tenant = self::tenant($req);
        $agg = $pdo->prepare("SELECT COALESCE(SUM(sent),0) AS sent, COALESCE(SUM(opened),0) AS opened, COALESCE(SUM(clicked),0) AS clicked FROM line_campaigns WHERE tenant_id=?");
        $agg->execute([$tenant]);
        $a = $agg->fetch(PDO::FETCH_ASSOC) ?: ['sent' => 0, 'opened' => 0, 'clicked' => 0];
        $sent = (int)$a['sent'];
        // 팔로워 수는 LINE API(연결 시) — 미연동/미집계 0(가짜 금지).
        return TemplateResponder::respond($res, [
            'ok'             => true,
            'total_followers'=> 0,
            'monthly_sent'   => $sent,
            'avg_open_rate'  => $sent > 0 ? round((int)$a['opened'] / $sent * 100, 1) : 0,
            'avg_click_rate' => $sent > 0 ? round((int)$a['clicked'] / $sent * 100, 1) : 0,
        ]);
    }

    /* ─── POST /line/webhooks ─── (LINE 플랫폼 수신, 무인증) */
    public static function webhook(Request $req, Response $res, array $args): Response
    {
        // 서명검증/이벤트 처리는 채널 시크릿 설정 후 확장. 현재는 200 OK 수신 확인만.
        return TemplateResponder::respond($res, ['ok' => true]);
    }

    // ── LINE Messaging API ──────────────────────────────────────────────
    private static function testConnection(string $token): array
    {
        $ch = curl_init(self::API . '/info');
        curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 10,
            CURLOPT_HTTPHEADER => ["Authorization: Bearer {$token}"], CURLOPT_SSL_VERIFYPEER => true]);
        $raw = curl_exec($ch); $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE); $err = curl_error($ch); curl_close($ch);
        if ($err) return ['ok' => false, 'message' => "연결 오류: {$err}"];
        if ($code === 200) return ['ok' => true, 'message' => 'LINE 연결 성공'];
        $d = json_decode((string)$raw, true) ?? [];
        return ['ok' => false, 'message' => $d['message'] ?? "HTTP {$code}"];
    }

    private static function broadcast(string $token, string $text): array
    {
        $payload = json_encode(['messages' => [['type' => 'text', 'text' => $text]]]);
        $ch = curl_init(self::API . '/message/broadcast');
        curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_POST => true, CURLOPT_POSTFIELDS => $payload,
            CURLOPT_HTTPHEADER => ["Authorization: Bearer {$token}", "Content-Type: application/json"], CURLOPT_TIMEOUT => 15, CURLOPT_SSL_VERIFYPEER => true]);
        $raw = curl_exec($ch); $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE); $err = curl_error($ch); curl_close($ch);
        if ($err) return ['ok' => false, 'error' => $err];
        if ($code === 200) return ['ok' => true];
        $d = json_decode((string)$raw, true) ?? [];
        return ['ok' => false, 'error' => $d['message'] ?? "HTTP {$code}"];
    }
}
