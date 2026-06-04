<?php
declare(strict_types=1);
namespace Genie\Handlers;

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;
use Genie\Db;

/**
 * KakaoChannel — 카카오 알림톡 (190차 부활 + 멀티테넌트 격리 + MySQL/SQLite 이식).
 * 189차까지 runtime-dead(Db::get). CRM 패턴 4층 부활. live 알림톡 API(callKakaoAPI)는 설정 시 실호출.
 * kakao_* 4테이블 tenant_id + crm_* 참조 테넌트 스코핑(무스코핑=전 테넌트 발송 P0). /api/kakao public bypass.
 */
class KakaoChannel
{
    private static function db(): \PDO { return Db::pdo(); }
    private static function isMysql(\PDO $pdo): bool { return $pdo->getAttribute(\PDO::ATTR_DRIVER_NAME) === 'mysql'; }
    private static function now(): string { return gmdate('Y-m-d H:i:s'); }
    private static function tenant(Request $req): string
    {
        $t = UserAuth::authedTenant($req);
        return ($t !== null && $t !== '') ? $t : 'demo';
    }
    private static function jsonRes(Response $res, array $payload, int $status = 200): Response
    {
        $res->getBody()->write(json_encode($payload, JSON_UNESCAPED_UNICODE));
        return $res->withStatus($status)->withHeader('Content-Type', 'application/json');
    }

    private static function ensureTables(): void
    {
        $pdo = self::db();
        if (self::isMysql($pdo)) {
            $pdo->exec("CREATE TABLE IF NOT EXISTS kakao_settings (
                id INT AUTO_INCREMENT PRIMARY KEY, tenant_id VARCHAR(100) NOT NULL DEFAULT 'demo',
                sender_key VARCHAR(255), api_key VARCHAR(255), channel_id VARCHAR(255), channel_name VARCHAR(255),
                mode VARCHAR(20) DEFAULT 'mock', updated_at VARCHAR(32), KEY idx_kakao_set_tenant (tenant_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
            $pdo->exec("CREATE TABLE IF NOT EXISTS kakao_templates (
                id INT AUTO_INCREMENT PRIMARY KEY, tenant_id VARCHAR(100) NOT NULL DEFAULT 'demo',
                template_code VARCHAR(100) NOT NULL, name VARCHAR(255) NOT NULL, content MEDIUMTEXT NOT NULL,
                msg_type VARCHAR(10) DEFAULT 'AT', buttons TEXT, variables TEXT, status VARCHAR(20) DEFAULT 'pending',
                created_at VARCHAR(32), updated_at VARCHAR(32),
                UNIQUE KEY uq_kakao_tpl (tenant_id, template_code), KEY idx_kakao_tpl_tenant (tenant_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
            $pdo->exec("CREATE TABLE IF NOT EXISTS kakao_campaigns (
                id INT AUTO_INCREMENT PRIMARY KEY, tenant_id VARCHAR(100) NOT NULL DEFAULT 'demo',
                name VARCHAR(255) NOT NULL, template_code VARCHAR(100), segment_id INT, status VARCHAR(20) DEFAULT 'draft',
                scheduled_at VARCHAR(32), sent_at VARCHAR(32), total INT DEFAULT 0, success INT DEFAULT 0, failed INT DEFAULT 0,
                created_at VARCHAR(32), KEY idx_kakao_cmp_tenant (tenant_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
            $pdo->exec("CREATE TABLE IF NOT EXISTS kakao_sends (
                id INT AUTO_INCREMENT PRIMARY KEY, tenant_id VARCHAR(100) NOT NULL DEFAULT 'demo',
                campaign_id INT NOT NULL, customer_id INT, phone VARCHAR(50) NOT NULL, status VARCHAR(20) DEFAULT 'pending',
                result_code VARCHAR(20), result_msg TEXT, sent_at VARCHAR(32),
                KEY idx_kakao_sends_cmp (campaign_id), KEY idx_kakao_sends_tenant (tenant_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
        } else {
            $pdo->exec("CREATE TABLE IF NOT EXISTS kakao_settings (id INTEGER PRIMARY KEY AUTOINCREMENT, tenant_id TEXT NOT NULL DEFAULT 'demo', sender_key TEXT, api_key TEXT, channel_id TEXT, channel_name TEXT, mode TEXT DEFAULT 'mock', updated_at TEXT)");
            $pdo->exec("CREATE TABLE IF NOT EXISTS kakao_templates (id INTEGER PRIMARY KEY AUTOINCREMENT, tenant_id TEXT NOT NULL DEFAULT 'demo', template_code TEXT NOT NULL, name TEXT NOT NULL, content TEXT NOT NULL, msg_type TEXT DEFAULT 'AT', buttons TEXT DEFAULT '[]', variables TEXT DEFAULT '[]', status TEXT DEFAULT 'pending', created_at TEXT, updated_at TEXT, UNIQUE(tenant_id, template_code))");
            $pdo->exec("CREATE TABLE IF NOT EXISTS kakao_campaigns (id INTEGER PRIMARY KEY AUTOINCREMENT, tenant_id TEXT NOT NULL DEFAULT 'demo', name TEXT NOT NULL, template_code TEXT, segment_id INTEGER, status TEXT DEFAULT 'draft', scheduled_at TEXT, sent_at TEXT, total INTEGER DEFAULT 0, success INTEGER DEFAULT 0, failed INTEGER DEFAULT 0, created_at TEXT)");
            $pdo->exec("CREATE TABLE IF NOT EXISTS kakao_sends (id INTEGER PRIMARY KEY AUTOINCREMENT, tenant_id TEXT NOT NULL DEFAULT 'demo', campaign_id INTEGER NOT NULL, customer_id INTEGER, phone TEXT NOT NULL, status TEXT DEFAULT 'pending', result_code TEXT, result_msg TEXT, sent_at TEXT)");
            $pdo->exec("CREATE INDEX IF NOT EXISTS idx_kakao_sends_cmp ON kakao_sends(campaign_id)");
            $pdo->exec("CREATE INDEX IF NOT EXISTS idx_kakao_set_tenant ON kakao_settings(tenant_id)");
        }
        foreach (['kakao_settings','kakao_templates','kakao_campaigns','kakao_sends'] as $tbl) {
            try { $pdo->exec("ALTER TABLE {$tbl} ADD COLUMN tenant_id VARCHAR(100) NOT NULL DEFAULT 'demo'"); } catch (\Throwable $e) {}
        }
    }

    /* ─── 설정 ─────────────────────────────────────────────────────── */
    public static function getSettings(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $tenant = self::tenant($req);
        $st = self::db()->prepare("SELECT id, sender_key, channel_id, channel_name, mode, updated_at FROM kakao_settings WHERE tenant_id=? ORDER BY id DESC LIMIT 1");
        $st->execute([$tenant]);
        $row = $st->fetch(\PDO::FETCH_ASSOC);
        return self::jsonRes($res, ['ok'=>true,'settings'=>$row ?: null]);
    }

    public static function saveSettings(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $pdo = self::db();
        $tenant = self::tenant($req);
        $b = (array)$req->getParsedBody();
        $ex = $pdo->prepare("SELECT id FROM kakao_settings WHERE tenant_id=? LIMIT 1");
        $ex->execute([$tenant]);
        $exists = $ex->fetch();
        $now = self::now();
        if ($exists) {
            $pdo->prepare("UPDATE kakao_settings SET sender_key=:sk, api_key=:ak, channel_id=:ci, channel_name=:cn, mode=:m, updated_at=:ua WHERE id=:id AND tenant_id=:t")->execute([
                ':id'=>$exists['id'], ':t'=>$tenant, ':sk'=>$b['sender_key']??'', ':ak'=>$b['api_key']??'',
                ':ci'=>$b['channel_id']??'', ':cn'=>$b['channel_name']??'', ':m'=>$b['mode']??'mock', ':ua'=>$now,
            ]);
        } else {
            $pdo->prepare("INSERT INTO kakao_settings (tenant_id, sender_key, api_key, channel_id, channel_name, mode, updated_at) VALUES (:t,:sk,:ak,:ci,:cn,:m,:ua)")->execute([
                ':t'=>$tenant, ':sk'=>$b['sender_key']??'', ':ak'=>$b['api_key']??'',
                ':ci'=>$b['channel_id']??'', ':cn'=>$b['channel_name']??'', ':m'=>$b['mode']??'mock', ':ua'=>$now,
            ]);
        }
        return self::jsonRes($res, ['ok'=>true]);
    }

    /* ─── 템플릿 ───────────────────────────────────────────────────── */
    public static function listTemplates(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $tenant = self::tenant($req);
        $st = self::db()->prepare("SELECT * FROM kakao_templates WHERE tenant_id=? ORDER BY updated_at DESC");
        $st->execute([$tenant]);
        $rows = $st->fetchAll(\PDO::FETCH_ASSOC);
        foreach ($rows as &$r) { $r['buttons'] = json_decode($r['buttons']??'[]', true); $r['variables'] = json_decode($r['variables']??'[]', true); }
        return self::jsonRes($res, ['ok'=>true,'templates'=>$rows]);
    }

    public static function createTemplate(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $pdo = self::db();
        $tenant = self::tenant($req);
        $b = (array)$req->getParsedBody();
        if (empty($b['template_code']) || empty($b['name']) || empty($b['content'])) {
            return self::jsonRes($res, ['ok'=>false,'error'=>'template_code / name / content 필수'], 400);
        }
        $now = self::now();
        try {
            $pdo->prepare("INSERT INTO kakao_templates (tenant_id, template_code, name, content, msg_type, buttons, variables, created_at, updated_at) VALUES (:t,:tc,:n,:c,:mt,:btn,:var,:ca,:ua)")->execute([
                ':t'=>$tenant, ':tc'=>$b['template_code'], ':n'=>$b['name'], ':c'=>$b['content'],
                ':mt'=>$b['msg_type']??'AT', ':btn'=>json_encode($b['buttons']??[]), ':var'=>json_encode($b['variables']??[]), ':ca'=>$now, ':ua'=>$now,
            ]);
            return self::jsonRes($res, ['ok'=>true,'id'=>(int)$pdo->lastInsertId()]);
        } catch (\Exception $e) {
            return self::jsonRes($res, ['ok'=>false,'error'=>'중복된 template_code'], 409);
        }
    }

    public static function updateTemplate(Request $req, Response $res, array $args): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $tenant = self::tenant($req);
        $b = (array)$req->getParsedBody();
        $stmt = self::db()->prepare("UPDATE kakao_templates SET name=:n, content=:c, msg_type=:mt, buttons=:btn, variables=:var, status=:st, updated_at=:ua WHERE id=:id AND tenant_id=:t");
        $stmt->execute([
            ':id'=>(int)$args['id'], ':t'=>$tenant, ':n'=>$b['name']??'', ':c'=>$b['content']??'',
            ':mt'=>$b['msg_type']??'AT', ':btn'=>json_encode($b['buttons']??[]), ':var'=>json_encode($b['variables']??[]), ':st'=>$b['status']??'pending', ':ua'=>self::now(),
        ]);
        if ($stmt->rowCount() === 0) return self::jsonRes($res, ['ok'=>false,'error'=>'없음'], 404);
        return self::jsonRes($res, ['ok'=>true]);
    }

    public static function deleteTemplate(Request $req, Response $res, array $args): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $tenant = self::tenant($req);
        self::db()->prepare("DELETE FROM kakao_templates WHERE id=:id AND tenant_id=:t")->execute([':id'=>(int)$args['id'], ':t'=>$tenant]);
        return self::jsonRes($res, ['ok'=>true]);
    }

    /* ─── 테스트 발송 ──────────────────────────────────────────────── */
    public static function testSend(Request $req, Response $res, array $args): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $pdo = self::db();
        $tenant = self::tenant($req);
        $b = (array)$req->getParsedBody();
        $phone = preg_replace('/[^0-9]/', '', $b['phone']??'');
        if (!$phone) return self::jsonRes($res, ['ok'=>false,'error'=>'전화번호 필수'], 400);

        $tpl = $pdo->prepare("SELECT * FROM kakao_templates WHERE template_code=:tc AND tenant_id=:t");
        $tpl->execute([':tc'=>$args['code'], ':t'=>$tenant]);
        $template = $tpl->fetch(\PDO::FETCH_ASSOC);
        if (!$template) return self::jsonRes($res, ['ok'=>false,'error'=>'템플릿 없음'], 404);

        $cs = $pdo->prepare("SELECT * FROM kakao_settings WHERE tenant_id=? ORDER BY id DESC LIMIT 1");
        $cs->execute([$tenant]);
        $cfg = $cs->fetch(\PDO::FETCH_ASSOC);
        $mode = $cfg['mode'] ?? 'mock';

        if ($mode === 'live' && !empty($cfg['sender_key']) && !empty($cfg['api_key'])) {
            $content = str_replace('{{name}}', $b['name']??'고객', $template['content']);
            $result = self::callKakaoAPI($cfg, $phone, $template['template_code'], $content, json_decode($template['buttons']??'[]',true));
            return self::jsonRes($res, ['ok'=>true,'mode'=>'live','result'=>$result]);
        }
        return self::jsonRes($res, ['ok'=>true,'mode'=>'mock','message'=>"[Mock] {$template['name']} → {$phone} 발송 시뮬레이션 완료",'phone'=>$phone,'content'=>$template['content']]);
    }

    /* ─── 캠페인 ───────────────────────────────────────────────────── */
    public static function listCampaigns(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $tenant = self::tenant($req);
        $st = self::db()->prepare("
            SELECT kc.*, cs.name AS segment_name, kt.name AS template_name
            FROM kakao_campaigns kc
            LEFT JOIN crm_segments cs ON cs.id=kc.segment_id AND cs.tenant_id=kc.tenant_id
            LEFT JOIN kakao_templates kt ON kt.template_code=kc.template_code AND kt.tenant_id=kc.tenant_id
            WHERE kc.tenant_id=:t ORDER BY kc.created_at DESC
        ");
        $st->execute([':t'=>$tenant]);
        return self::jsonRes($res, ['ok'=>true,'campaigns'=>$st->fetchAll(\PDO::FETCH_ASSOC)]);
    }

    public static function createCampaign(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $pdo = self::db();
        $tenant = self::tenant($req);
        $b = (array)$req->getParsedBody();
        if (empty($b['name'])) return self::jsonRes($res, ['ok'=>false,'error'=>'name 필수'], 400);
        $pdo->prepare("INSERT INTO kakao_campaigns (tenant_id, name, template_code, segment_id, status, scheduled_at, created_at) VALUES (:t,:n,:tc,:sid,:st,:sch,:ca)")->execute([
            ':t'=>$tenant, ':n'=>$b['name'], ':tc'=>$b['template_code']??'',
            ':sid'=>(int)($b['segment_id']??0), ':st'=>$b['status']??'draft', ':sch'=>$b['scheduled_at']??null, ':ca'=>self::now(),
        ]);
        return self::jsonRes($res, ['ok'=>true,'id'=>(int)$pdo->lastInsertId()]);
    }

    /* ─── POST /kakao/campaigns/{id}/send ──────────────────────────── */
    public static function sendCampaign(Request $req, Response $res, array $args): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $pdo = self::db();
        $tenant = self::tenant($req);
        $cid = (int)$args['id'];
        $camp = $pdo->prepare("SELECT * FROM kakao_campaigns WHERE id=:id AND tenant_id=:t");
        $camp->execute([':id'=>$cid, ':t'=>$tenant]);
        $campaign = $camp->fetch(\PDO::FETCH_ASSOC);
        if (!$campaign) return self::jsonRes($res, ['ok'=>false,'error'=>'캠페인 없음'], 404);

        $template = null;
        if (!empty($campaign['template_code'])) {
            $tpl = $pdo->prepare("SELECT * FROM kakao_templates WHERE template_code=:tc AND tenant_id=:t");
            $tpl->execute([':tc'=>$campaign['template_code'], ':t'=>$tenant]);
            $template = $tpl->fetch(\PDO::FETCH_ASSOC);
        }
        $cs = $pdo->prepare("SELECT * FROM kakao_settings WHERE tenant_id=? ORDER BY id DESC LIMIT 1");
        $cs->execute([$tenant]);
        $cfg = $cs->fetch(\PDO::FETCH_ASSOC);
        $mode = $cfg['mode'] ?? 'mock';

        // 대상 고객 (★테넌트 스코프)
        $segId = (int)$campaign['segment_id'];
        if ($segId) {
            $cst = $pdo->prepare("SELECT c.id, c.name, c.phone FROM crm_customers c JOIN crm_segment_members sm ON sm.customer_id=c.id AND sm.tenant_id=c.tenant_id WHERE sm.segment_id=:sid AND c.tenant_id=:t AND c.phone IS NOT NULL AND c.phone != ''");
            $cst->execute([':sid'=>$segId, ':t'=>$tenant]);
        } else {
            $cst = $pdo->prepare("SELECT id, name, phone FROM crm_customers WHERE tenant_id=:t AND phone IS NOT NULL AND phone != ''");
            $cst->execute([':t'=>$tenant]);
        }
        $customers = $cst->fetchAll(\PDO::FETCH_ASSOC);

        $success = 0; $failed = 0; $now = self::now();
        foreach ($customers as $c) {
            $phone   = preg_replace('/[^0-9]/', '', $c['phone']);
            $content = $template ? str_replace('{{name}}', $c['name']??'고객', $template['content']) : '';
            $status  = 'mock_sent';
            if ($mode === 'live' && !empty($cfg['sender_key'])) {
                $result = self::callKakaoAPI($cfg, $phone, $campaign['template_code'], $content, json_decode($template['buttons']??'[]',true));
                $status = ($result['code']??'E') === '0000' ? 'sent' : 'failed';
            }
            if ($status === 'failed') { $failed++; } else { $success++; }

            $pdo->prepare("INSERT INTO kakao_sends (tenant_id, campaign_id, customer_id, phone, status, sent_at) VALUES (:t,:cid,:uid,:phone,:st,:sa)")->execute([
                ':t'=>$tenant, ':cid'=>$cid, ':uid'=>$c['id'], ':phone'=>$phone, ':st'=>$status, ':sa'=>$now,
            ]);
            $pdo->prepare("INSERT INTO crm_activities (tenant_id, customer_id, type, channel, data, created_at) VALUES (:t,:uid,'kakao_sent','kakao',:data,:ca)")->execute([
                ':t'=>$tenant, ':uid'=>$c['id'], ':data'=>json_encode(['campaign_id'=>$cid,'campaign_name'=>$campaign['name'],'template'=>$campaign['template_code']]), ':ca'=>$now,
            ]);
        }
        $total = count($customers);
        $pdo->prepare("UPDATE kakao_campaigns SET status='sent', sent_at=:sa, total=:t, success=:s, failed=:f WHERE id=:id AND tenant_id=:tn")->execute([
            ':sa'=>$now, ':t'=>$total, ':s'=>$success, ':f'=>$failed, ':id'=>$cid, ':tn'=>$tenant,
        ]);
        return self::jsonRes($res, ['ok'=>true,'mode'=>$mode,'total'=>$total,'success'=>$success,'failed'=>$failed]);
    }

    /* ─── 성과 조회 ────────────────────────────────────────────────── */
    public static function campaignStats(Request $req, Response $res, array $args): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $pdo = self::db();
        $tenant = self::tenant($req);
        $cid = (int)$args['id'];
        $camp = $pdo->prepare("SELECT * FROM kakao_campaigns WHERE id=:id AND tenant_id=:t");
        $camp->execute([':id'=>$cid, ':t'=>$tenant]);
        $campaign = $camp->fetch(\PDO::FETCH_ASSOC);
        if (!$campaign) return self::jsonRes($res, ['ok'=>false,'error'=>'캠페인 없음'], 404);
        $sends = $pdo->prepare("SELECT status, COUNT(*) AS cnt FROM kakao_sends WHERE campaign_id=:cid AND tenant_id=:t GROUP BY status");
        $sends->execute([':cid'=>$cid, ':t'=>$tenant]);
        $byStatus = $sends->fetchAll(\PDO::FETCH_KEY_PAIR);
        return self::jsonRes($res, ['ok'=>true,'campaign'=>$campaign,'by_status'=>$byStatus]);
    }

    /* ─── DELETE /kakao/campaigns/{id} ─── 191차: 캠페인 삭제(테넌트 스코프 + 발송로그 cascade) ── */
    public static function deleteCampaign(Request $req, Response $res, array $args): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $pdo = self::db();
        $tenant = self::tenant($req);
        $id = (int)$args['id'];
        $chk = $pdo->prepare("SELECT id FROM kakao_campaigns WHERE id=:id AND tenant_id=:t");
        $chk->execute([':id'=>$id, ':t'=>$tenant]);
        if (!$chk->fetch()) return self::jsonRes($res, ['ok'=>false,'error'=>'캠페인 없음'], 404);
        $pdo->prepare("DELETE FROM kakao_sends WHERE campaign_id=:id AND tenant_id=:t")->execute([':id'=>$id, ':t'=>$tenant]);
        $pdo->prepare("DELETE FROM kakao_campaigns WHERE id=:id AND tenant_id=:t")->execute([':id'=>$id, ':t'=>$tenant]);
        return self::jsonRes($res, ['ok'=>true]);
    }

    /* ─── 카카오 API 호출 (비즈메시지 알림톡) ────────────────────── */
    private static function callKakaoAPI(array $cfg, string $phone, string $tplCode, string $content, array $buttons): array
    {
        $url  = 'https://alimtalk-api.kakao.com/v2/senderkeys/'.$cfg['sender_key'].'/messages';
        $body = json_encode([
            'senderKey'    => $cfg['sender_key'],
            'templateCode' => $tplCode,
            'recipientList' => [['recipientNo'=>$phone, 'templateParameter'=>['name'=>'고객'], 'buttons'=>$buttons]],
            'messageType' => 'AT',
            'message'     => $content,
        ]);
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_POST=>true, CURLOPT_POSTFIELDS=>$body, CURLOPT_RETURNTRANSFER=>true, CURLOPT_TIMEOUT=>10,
            CURLOPT_HTTPHEADER=>['Content-Type: application/json;charset=UTF-8', 'Authorization: KakaoAK '.$cfg['api_key']],
        ]);
        $resp = curl_exec($ch);
        curl_close($ch);
        return json_decode($resp ?: '{"code":"E999"}', true) ?: ['code'=>'E999'];
    }
}
