<?php
declare(strict_types=1);
namespace Genie\Handlers;

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;
use Genie\Db;

class KakaoChannel
{
    private static function db(): \PDO { return Db::get(); }

    private static function ensureTables(): void
    {
        $pdo = self::db();
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS kakao_settings (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                sender_key  TEXT,
                api_key     TEXT,
                channel_id  TEXT,
                channel_name TEXT,
                mode        TEXT DEFAULT 'mock',
                updated_at  TEXT DEFAULT (datetime('now'))
            )
        ");
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS kakao_templates (
                id            INTEGER PRIMARY KEY AUTOINCREMENT,
                template_code TEXT NOT NULL UNIQUE,
                name          TEXT NOT NULL,
                content       TEXT NOT NULL,
                msg_type      TEXT DEFAULT 'AT',
                buttons       TEXT DEFAULT '[]',
                variables     TEXT DEFAULT '[]',
                status        TEXT DEFAULT 'pending',
                created_at    TEXT DEFAULT (datetime('now')),
                updated_at    TEXT DEFAULT (datetime('now'))
            )
        ");
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS kakao_campaigns (
                id           INTEGER PRIMARY KEY AUTOINCREMENT,
                name         TEXT NOT NULL,
                template_code TEXT,
                segment_id   INTEGER,
                status       TEXT DEFAULT 'draft',
                scheduled_at TEXT,
                sent_at      TEXT,
                total        INTEGER DEFAULT 0,
                success      INTEGER DEFAULT 0,
                failed       INTEGER DEFAULT 0,
                created_at   TEXT DEFAULT (datetime('now'))
            )
        ");
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS kakao_sends (
                id           INTEGER PRIMARY KEY AUTOINCREMENT,
                campaign_id  INTEGER NOT NULL,
                customer_id  INTEGER,
                phone        TEXT NOT NULL,
                status       TEXT DEFAULT 'pending',
                result_code  TEXT,
                result_msg   TEXT,
                sent_at      TEXT DEFAULT (datetime('now'))
            )
        ");
        $pdo->exec("CREATE INDEX IF NOT EXISTS idx_kakao_sends_cmp ON kakao_sends(campaign_id)");
    }

    /* ─── 설정 ─────────────────────────────────────────────────────── */
    public static function getSettings(Request $req, Response $res): Response
    {
        self::ensureTables();
        $row = self::db()->query("SELECT id, sender_key, channel_id, channel_name, mode, updated_at FROM kakao_settings ORDER BY id DESC LIMIT 1")->fetch(\PDO::FETCH_ASSOC);
        $res->getBody()->write(json_encode(['ok'=>true,'settings'=>$row ?: null]));
        return $res->withHeader('Content-Type','application/json');
    }

    public static function saveSettings(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $pdo = self::db();
        $b = (array)$req->getParsedBody();
        $exists = $pdo->query("SELECT id FROM kakao_settings LIMIT 1")->fetch();
        if ($exists) {
            $pdo->prepare("UPDATE kakao_settings SET sender_key=:sk, api_key=:ak, channel_id=:ci, channel_name=:cn, mode=:m, updated_at=datetime('now') WHERE id=:id")->execute([
                ':id'=>$exists['id'],':sk'=>$b['sender_key']??'',':ak'=>$b['api_key']??'',
                ':ci'=>$b['channel_id']??'',':cn'=>$b['channel_name']??'',
                ':m'=>$b['mode']??'mock',
            ]);
        } else {
            $pdo->prepare("INSERT INTO kakao_settings (sender_key, api_key, channel_id, channel_name, mode) VALUES (:sk,:ak,:ci,:cn,:m)")->execute([
                ':sk'=>$b['sender_key']??'',':ak'=>$b['api_key']??'',
                ':ci'=>$b['channel_id']??'',':cn'=>$b['channel_name']??'',
                ':m'=>$b['mode']??'mock',
            ]);
        }
        $res->getBody()->write(json_encode(['ok'=>true]));
        return $res->withHeader('Content-Type','application/json');
    }

    /* ─── 템플릿 ───────────────────────────────────────────────────── */
    public static function listTemplates(Request $req, Response $res): Response
    {
        self::ensureTables();
        $rows = self::db()->query("SELECT * FROM kakao_templates ORDER BY updated_at DESC")->fetchAll(\PDO::FETCH_ASSOC);
        foreach ($rows as &$r) {
            $r['buttons']   = json_decode($r['buttons']??'[]', true);
            $r['variables'] = json_decode($r['variables']??'[]', true);
        }
        $res->getBody()->write(json_encode(['ok'=>true,'templates'=>$rows]));
        return $res->withHeader('Content-Type','application/json');
    }

    public static function createTemplate(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $pdo = self::db();
        $b = (array)$req->getParsedBody();
        if (empty($b['template_code']) || empty($b['name']) || empty($b['content'])) {
            $res->getBody()->write(json_encode(['ok'=>false,'error'=>'template_code / name / content 필수']));
            return $res->withStatus(400)->withHeader('Content-Type','application/json');
        }
        try {
            $pdo->prepare("INSERT INTO kakao_templates (template_code, name, content, msg_type, buttons, variables) VALUES (:tc,:n,:c,:mt,:btn,:var)")->execute([
                ':tc'=>$b['template_code'],':n'=>$b['name'],':c'=>$b['content'],
                ':mt'=>$b['msg_type']??'AT',':btn'=>json_encode($b['buttons']??[]),':var'=>json_encode($b['variables']??[]),
            ]);
            $res->getBody()->write(json_encode(['ok'=>true,'id'=>(int)$pdo->lastInsertId()]));
        } catch (\Exception $e) {
            $res->getBody()->write(json_encode(['ok'=>false,'error'=>'중복된 template_code: '.$e->getMessage()]));
            return $res->withStatus(409)->withHeader('Content-Type','application/json');
        }
        return $res->withHeader('Content-Type','application/json');
    }

    public static function updateTemplate(Request $req, Response $res, array $args): Response
    {
        self::ensureTables();
        $b = (array)$req->getParsedBody();
        self::db()->prepare("UPDATE kakao_templates SET name=:n, content=:c, msg_type=:mt, buttons=:btn, variables=:var, status=:st, updated_at=datetime('now') WHERE id=:id")->execute([
            ':id'=>(int)$args['id'],':n'=>$b['name']??'',':c'=>$b['content']??'',
            ':mt'=>$b['msg_type']??'AT',':btn'=>json_encode($b['buttons']??[]),
            ':var'=>json_encode($b['variables']??[]),':st'=>$b['status']??'pending',
        ]);
        $res->getBody()->write(json_encode(['ok'=>true]));
        return $res->withHeader('Content-Type','application/json');
    }

    public static function deleteTemplate(Request $req, Response $res, array $args): Response
    {
        self::ensureTables();
        self::db()->prepare("DELETE FROM kakao_templates WHERE id=:id")->execute([':id'=>(int)$args['id']]);
        $res->getBody()->write(json_encode(['ok'=>true]));
        return $res->withHeader('Content-Type','application/json');
    }

    /* ─── 테스트 발송 ──────────────────────────────────────────────── */
    public static function testSend(Request $req, Response $res, array $args): Response
    {
        self::ensureTables();
        $pdo = self::db();
        $b = (array)$req->getParsedBody();
        $phone = preg_replace('/[^0-9]/', '', $b['phone']??'');
        if (!$phone) { $res->getBody()->write(json_encode(['ok'=>false,'error'=>'전화번호 필수'])); return $res->withStatus(400)->withHeader('Content-Type','application/json'); }

        $tpl = $pdo->prepare("SELECT * FROM kakao_templates WHERE template_code=:tc");
        $tpl->execute([':tc'=>$args['code']]);
        $template = $tpl->fetch(\PDO::FETCH_ASSOC);
        if (!$template) { $res->getBody()->write(json_encode(['ok'=>false,'error'=>'템플릿 없음'])); return $res->withStatus(404)->withHeader('Content-Type','application/json'); }

        $cfg = $pdo->query("SELECT * FROM kakao_settings ORDER BY id DESC LIMIT 1")->fetch(\PDO::FETCH_ASSOC);
        $mode = $cfg['mode'] ?? 'mock';

        if ($mode === 'live' && !empty($cfg['sender_key']) && !empty($cfg['api_key'])) {
            // 카카오 비즈메시지 API 실제 호출
            $content = str_replace('{{name}}', $b['name']??'고객', $template['content']);
            $result = self::callKakaoAPI($cfg, $phone, $template['template_code'], $content, json_decode($template['buttons']??'[]',true));
            $res->getBody()->write(json_encode(['ok'=>true,'mode'=>'live','result'=>$result]));
        } else {
            $res->getBody()->write(json_encode([
                'ok'=>true,'mode'=>'mock',
                'message'=>"[Mock] {$template['name']} → {$phone} 발송 시뮬레이션 완료",
                'phone'=>$phone,'content'=>$template['content'],
            ]));
        }
        return $res->withHeader('Content-Type','application/json');
    }

    /* ─── 캠페인 ───────────────────────────────────────────────────── */
    public static function listCampaigns(Request $req, Response $res): Response
    {
        self::ensureTables();
        $rows = self::db()->query("
            SELECT kc.*, cs.name AS segment_name, kt.name AS template_name
            FROM kakao_campaigns kc
            LEFT JOIN crm_segments cs ON cs.id=kc.segment_id
            LEFT JOIN kakao_templates kt ON kt.template_code=kc.template_code
            ORDER BY kc.created_at DESC
        ")->fetchAll(\PDO::FETCH_ASSOC);
        $res->getBody()->write(json_encode(['ok'=>true,'campaigns'=>$rows]));
        return $res->withHeader('Content-Type','application/json');
    }

    public static function createCampaign(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $pdo = self::db();
        $b = (array)$req->getParsedBody();
        if (empty($b['name'])) { $res->getBody()->write(json_encode(['ok'=>false,'error'=>'name 필수'])); return $res->withStatus(400)->withHeader('Content-Type','application/json'); }
        $pdo->prepare("INSERT INTO kakao_campaigns (name, template_code, segment_id, status, scheduled_at) VALUES (:n,:tc,:sid,:st,:sch)")->execute([
            ':n'=>$b['name'],':tc'=>$b['template_code']??'',
            ':sid'=>(int)($b['segment_id']??0),':st'=>$b['status']??'draft',':sch'=>$b['scheduled_at']??null,
        ]);
        $res->getBody()->write(json_encode(['ok'=>true,'id'=>(int)$pdo->lastInsertId()]));
        return $res->withHeader('Content-Type','application/json');
    }

    /* ─── POST /api/kakao/campaigns/{id}/send ──────────────────────── */
    public static function sendCampaign(Request $req, Response $res, array $args): Response
    {
        self::ensureTables();
        $pdo = self::db();
        $cid = (int)$args['id'];
        $camp = $pdo->prepare("SELECT * FROM kakao_campaigns WHERE id=:id");
        $camp->execute([':id'=>$cid]);
        $campaign = $camp->fetch(\PDO::FETCH_ASSOC);
        if (!$campaign) { $res->getBody()->write(json_encode(['ok'=>false,'error'=>'캠페인 없음'])); return $res->withStatus(404)->withHeader('Content-Type','application/json'); }

        $tpl = $pdo->prepare("SELECT * FROM kakao_templates WHERE template_code=:tc");
        $tpl->execute([':tc'=>$campaign['template_code']]);
        $template = $tpl->fetch(\PDO::FETCH_ASSOC);

        $cfg = $pdo->query("SELECT * FROM kakao_settings ORDER BY id DESC LIMIT 1")->fetch(\PDO::FETCH_ASSOC);
        $mode = $cfg['mode'] ?? 'mock';

        // 대상 고객 (전화번호 있는 세그먼트 고객)
        $segId = (int)$campaign['segment_id'];
        if ($segId) {
            $cst = $pdo->prepare("SELECT c.id, c.name, c.phone FROM crm_customers c JOIN crm_segment_members sm ON sm.customer_id=c.id WHERE sm.segment_id=:sid AND c.phone IS NOT NULL AND c.phone != ''");
            $cst->execute([':sid'=>$segId]);
        } else {
            $cst = $pdo->query("SELECT id, name, phone FROM crm_customers WHERE phone IS NOT NULL AND phone != ''");
        }
        $customers = $cst->fetchAll(\PDO::FETCH_ASSOC);

        $success = 0; $failed = 0;
        foreach ($customers as $c) {
            $phone   = preg_replace('/[^0-9]/', '', $c['phone']);
            $content = $template ? str_replace('{{name}}', $c['name']??'고객', $template['content']) : '';
            $status  = 'mock_sent';

            if ($mode === 'live' && !empty($cfg['sender_key'])) {
                $result = self::callKakaoAPI($cfg, $phone, $campaign['template_code'], $content, json_decode($template['buttons']??'[]',true));
                $status = ($result['code']??'E') === '0000' ? 'sent' : 'failed';
            }
            if ($status === 'failed') { $failed++; } else { $success++; }

            $pdo->prepare("INSERT INTO kakao_sends (campaign_id, customer_id, phone, status) VALUES (:cid,:uid,:phone,:st)")->execute([
                ':cid'=>$cid,':uid'=>$c['id'],':phone'=>$phone,':st'=>$status,
            ]);
            // CRM 활동 기록
            $pdo->prepare("INSERT INTO crm_activities (customer_id, type, channel, data) VALUES (:uid,'kakao_sent','kakao',:data)")->execute([
                ':uid'=>$c['id'],':data'=>json_encode(['campaign_id'=>$cid,'campaign_name'=>$campaign['name'],'template'=>$campaign['template_code']]),
            ]);
        }

        $total = count($customers);
        $pdo->prepare("UPDATE kakao_campaigns SET status='sent', sent_at=datetime('now'), total=:t, success=:s, failed=:f WHERE id=:id")->execute([
            ':t'=>$total,':s'=>$success,':f'=>$failed,':id'=>$cid,
        ]);
        $res->getBody()->write(json_encode(['ok'=>true,'mode'=>$mode,'total'=>$total,'success'=>$success,'failed'=>$failed]));
        return $res->withHeader('Content-Type','application/json');
    }

    /* ─── 성과 조회 ────────────────────────────────────────────────── */
    public static function campaignStats(Request $req, Response $res, array $args): Response
    {
        self::ensureTables();
        $pdo = self::db();
        $cid = (int)$args['id'];
        $camp = $pdo->prepare("SELECT * FROM kakao_campaigns WHERE id=:id");
        $camp->execute([':id'=>$cid]);
        $campaign = $camp->fetch(\PDO::FETCH_ASSOC);
        $sends = $pdo->prepare("SELECT status, COUNT(*) AS cnt FROM kakao_sends WHERE campaign_id=:cid GROUP BY status");
        $sends->execute([':cid'=>$cid]);
        $byStatus = $sends->fetchAll(\PDO::FETCH_KEY_PAIR);
        $res->getBody()->write(json_encode(['ok'=>true,'campaign'=>$campaign,'by_status'=>$byStatus]));
        return $res->withHeader('Content-Type','application/json');
    }

    /* ─── 카카오 API 호출 (비즈메시지 알림톡) ────────────────────── */
    private static function callKakaoAPI(array $cfg, string $phone, string $tplCode, string $content, array $buttons): array
    {
        $url  = 'https://alimtalk-api.kakao.com/v2/senderkeys/'.$cfg['sender_key'].'/messages';
        $body = json_encode([
            'senderKey'    => $cfg['sender_key'],
            'templateCode' => $tplCode,
            'recipientList' => [[
                'recipientNo'   => $phone,
                'templateParameter' => ['name' => '고객'],
                'buttons'       => $buttons,
            ]],
            'messageType' => 'AT',
            'message'     => $content,
        ]);
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => $body,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => 10,
            CURLOPT_HTTPHEADER     => [
                'Content-Type: application/json;charset=UTF-8',
                'Authorization: KakaoAK '.$cfg['api_key'],
            ],
        ]);
        $resp = curl_exec($ch);
        curl_close($ch);
        return json_decode($resp ?: '{"code":"E999"}', true) ?: ['code'=>'E999'];
    }
}
