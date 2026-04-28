<?php
declare(strict_types=1);
namespace Genie\Handlers;

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;
use Genie\Db;

class EmailMarketing
{
    private static function db(): \PDO { return Db::get(); }

    private static function ensureTables(): void
    {
        $pdo = self::db();
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS email_settings (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                provider    TEXT DEFAULT 'smtp',
                smtp_host   TEXT,
                smtp_port   INTEGER DEFAULT 587,
                smtp_user   TEXT,
                smtp_pass   TEXT,
                from_email  TEXT,
                from_name   TEXT,
                aws_region  TEXT,
                aws_key     TEXT,
                aws_secret  TEXT,
                updated_at  TEXT DEFAULT (datetime('now'))
            )
        ");
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS email_templates (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                name        TEXT NOT NULL,
                subject     TEXT NOT NULL,
                html_body   TEXT NOT NULL,
                plain_body  TEXT,
                variables   TEXT DEFAULT '[]',
                category    TEXT DEFAULT 'general',
                created_at  TEXT DEFAULT (datetime('now')),
                updated_at  TEXT DEFAULT (datetime('now'))
            )
        ");
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS email_campaigns (
                id           INTEGER PRIMARY KEY AUTOINCREMENT,
                name         TEXT NOT NULL,
                template_id  INTEGER,
                segment_id   INTEGER,
                status       TEXT DEFAULT 'draft',
                scheduled_at TEXT,
                sent_at      TEXT,
                total_sent   INTEGER DEFAULT 0,
                opened       INTEGER DEFAULT 0,
                clicked      INTEGER DEFAULT 0,
                bounced      INTEGER DEFAULT 0,
                created_at   TEXT DEFAULT (datetime('now'))
            )
        ");
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS email_sends (
                id           INTEGER PRIMARY KEY AUTOINCREMENT,
                campaign_id  INTEGER NOT NULL,
                customer_id  INTEGER,
                email        TEXT NOT NULL,
                status       TEXT DEFAULT 'pending',
                opened_at    TEXT,
                clicked_at   TEXT,
                bounce_reason TEXT,
                sent_at      TEXT DEFAULT (datetime('now'))
            )
        ");
        $pdo->exec("CREATE INDEX IF NOT EXISTS idx_email_sends_cmp ON email_sends(campaign_id)");
        $pdo->exec("CREATE INDEX IF NOT EXISTS idx_email_sends_status ON email_sends(status)");
    }

    /* ─── 설정 GET/PUT ─────────────────────────────────────────────── */
    public static function getSettings(Request $req, Response $res): Response
    {
        self::ensureTables();
        $pdo = self::db();
        $row = $pdo->query("SELECT * FROM email_settings ORDER BY id DESC LIMIT 1")->fetch(\PDO::FETCH_ASSOC);
        if ($row) {
            unset($row['smtp_pass'], $row['aws_secret']); // 비밀키 숨김
        }
        $res->getBody()->write(json_encode(['ok'=>true,'settings'=>$row ?: null]));
        return $res->withHeader('Content-Type','application/json');
    }

    public static function saveSettings(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $pdo = self::db();
        $b = (array)$req->getParsedBody();
        $exists = $pdo->query("SELECT id FROM email_settings LIMIT 1")->fetch();
        if ($exists) {
            $pdo->prepare("
                UPDATE email_settings SET provider=:prov, smtp_host=:host, smtp_port=:port,
                smtp_user=:user, smtp_pass=:pass, from_email=:fe, from_name=:fn,
                aws_region=:reg, aws_key=:akey, aws_secret=:asec, updated_at=datetime('now')
                WHERE id=:id
            ")->execute([
                ':id'=>$exists['id'],':prov'=>$b['provider']??'smtp',':host'=>$b['smtp_host']??'',
                ':port'=>(int)($b['smtp_port']??587),':user'=>$b['smtp_user']??'',':pass'=>$b['smtp_pass']??'',
                ':fe'=>$b['from_email']??'',':fn'=>$b['from_name']??'',
                ':reg'=>$b['aws_region']??'',':akey'=>$b['aws_key']??'',':asec'=>$b['aws_secret']??'',
            ]);
        } else {
            $pdo->prepare("
                INSERT INTO email_settings (provider, smtp_host, smtp_port, smtp_user, smtp_pass, from_email, from_name, aws_region, aws_key, aws_secret)
                VALUES (:prov, :host, :port, :user, :pass, :fe, :fn, :reg, :akey, :asec)
            ")->execute([
                ':prov'=>$b['provider']??'smtp',':host'=>$b['smtp_host']??'',':port'=>(int)($b['smtp_port']??587),
                ':user'=>$b['smtp_user']??'',':pass'=>$b['smtp_pass']??'',
                ':fe'=>$b['from_email']??'',':fn'=>$b['from_name']??'',
                ':reg'=>$b['aws_region']??'',':akey'=>$b['aws_key']??'',':asec'=>$b['aws_secret']??'',
            ]);
        }
        $res->getBody()->write(json_encode(['ok'=>true]));
        return $res->withHeader('Content-Type','application/json');
    }

    /* ─── 템플릿 ───────────────────────────────────────────────────── */
    public static function listTemplates(Request $req, Response $res): Response
    {
        self::ensureTables();
        $rows = self::db()->query("SELECT id,name,subject,category,variables,created_at FROM email_templates ORDER BY updated_at DESC")->fetchAll(\PDO::FETCH_ASSOC);
        foreach ($rows as &$r) { $r['variables'] = json_decode($r['variables']??'[]', true); }
        $res->getBody()->write(json_encode(['ok'=>true,'templates'=>$rows]));
        return $res->withHeader('Content-Type','application/json');
    }

    public static function createTemplate(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $pdo = self::db();
        $b = (array)$req->getParsedBody();
        if (empty($b['name']) || empty($b['subject']) || empty($b['html_body'])) {
            $res->getBody()->write(json_encode(['ok'=>false,'error'=>'name, subject, html_body 필수']));
            return $res->withStatus(400)->withHeader('Content-Type','application/json');
        }
        $pdo->prepare("INSERT INTO email_templates (name,subject,html_body,plain_body,variables,category) VALUES (:n,:s,:h,:p,:v,:c)")->execute([
            ':n'=>$b['name'],':s'=>$b['subject'],':h'=>$b['html_body'],
            ':p'=>$b['plain_body']??'',':v'=>json_encode($b['variables']??[]),':c'=>$b['category']??'general',
        ]);
        $res->getBody()->write(json_encode(['ok'=>true,'id'=>(int)$pdo->lastInsertId()]));
        return $res->withHeader('Content-Type','application/json');
    }

    public static function getTemplate(Request $req, Response $res, array $args): Response
    {
        self::ensureTables();
        $row = self::db()->prepare("SELECT * FROM email_templates WHERE id=:id");
        $row->execute([':id'=>(int)$args['id']]);
        $t = $row->fetch(\PDO::FETCH_ASSOC);
        if (!$t) { $res->getBody()->write(json_encode(['ok'=>false,'error'=>'없음'])); return $res->withStatus(404)->withHeader('Content-Type','application/json'); }
        $t['variables'] = json_decode($t['variables']??'[]', true);
        $res->getBody()->write(json_encode(['ok'=>true,'template'=>$t]));
        return $res->withHeader('Content-Type','application/json');
    }

    public static function updateTemplate(Request $req, Response $res, array $args): Response
    {
        self::ensureTables();
        $pdo = self::db();
        $b = (array)$req->getParsedBody();
        $pdo->prepare("UPDATE email_templates SET name=:n,subject=:s,html_body=:h,plain_body=:p,variables=:v,category=:c,updated_at=datetime('now') WHERE id=:id")->execute([
            ':id'=>(int)$args['id'],':n'=>$b['name']??'',':s'=>$b['subject']??'',
            ':h'=>$b['html_body']??'',':p'=>$b['plain_body']??'',
            ':v'=>json_encode($b['variables']??[]),':c'=>$b['category']??'general',
        ]);
        $res->getBody()->write(json_encode(['ok'=>true]));
        return $res->withHeader('Content-Type','application/json');
    }

    public static function deleteTemplate(Request $req, Response $res, array $args): Response
    {
        self::ensureTables();
        self::db()->prepare("DELETE FROM email_templates WHERE id=:id")->execute([':id'=>(int)$args['id']]);
        $res->getBody()->write(json_encode(['ok'=>true]));
        return $res->withHeader('Content-Type','application/json');
    }

    /* ─── 캠페인 ───────────────────────────────────────────────────── */
    public static function listCampaigns(Request $req, Response $res): Response
    {
        self::ensureTables();
        $rows = self::db()->query("
            SELECT ec.*, et.name AS template_name, cs.name AS segment_name
            FROM email_campaigns ec
            LEFT JOIN email_templates et ON et.id=ec.template_id
            LEFT JOIN crm_segments cs ON cs.id=ec.segment_id
            ORDER BY ec.created_at DESC
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
        $pdo->prepare("INSERT INTO email_campaigns (name,template_id,segment_id,status,scheduled_at) VALUES (:n,:t,:s,:st,:sc)")->execute([
            ':n'=>$b['name'],':t'=>(int)($b['template_id']??0),
            ':s'=>(int)($b['segment_id']??0),':st'=>$b['status']??'draft',':sc'=>$b['scheduled_at']??null,
        ]);
        $res->getBody()->write(json_encode(['ok'=>true,'id'=>(int)$pdo->lastInsertId()]));
        return $res->withHeader('Content-Type','application/json');
    }

    /* ─── POST /api/email/campaigns/{id}/send ──────────────────────── */
    public static function sendCampaign(Request $req, Response $res, array $args): Response
    {
        self::ensureTables();
        $pdo = self::db();
        $cid = (int)$args['id'];

        $camp = $pdo->prepare("SELECT * FROM email_campaigns WHERE id=:id");
        $camp->execute([':id'=>$cid]);
        $campaign = $camp->fetch(\PDO::FETCH_ASSOC);
        if (!$campaign) { $res->getBody()->write(json_encode(['ok'=>false,'error'=>'캠페인 없음'])); return $res->withStatus(404)->withHeader('Content-Type','application/json'); }

        // 템플릿 로드
        $tpl = $pdo->prepare("SELECT * FROM email_templates WHERE id=:id");
        $tpl->execute([':id'=>$campaign['template_id']]);
        $template = $tpl->fetch(\PDO::FETCH_ASSOC);

        // 대상 고객 목록 (세그먼트 기반)
        $segId = (int)$campaign['segment_id'];
        if ($segId) {
            $customers = $pdo->prepare("SELECT c.id, c.email, c.name FROM crm_customers c JOIN crm_segment_members sm ON sm.customer_id=c.id WHERE sm.segment_id=:sid");
            $customers->execute([':sid'=>$segId]);
        } else {
            $customers = $pdo->query("SELECT id, email, name FROM crm_customers");
        }
        $customerList = $customers->fetchAll(\PDO::FETCH_ASSOC);

        // SMTP 설정 조회
        $cfg = $pdo->query("SELECT * FROM email_settings ORDER BY id DESC LIMIT 1")->fetch(\PDO::FETCH_ASSOC);
        $sent = 0; $failed = 0;

        foreach ($customerList as $c) {
            $status = 'sent';
            $subject = $template ? str_replace('{{name}}', $c['name']??'', $template['subject']??'') : '(제목 없음)';
            $body    = $template ? str_replace('{{name}}', $c['name']??'', $template['html_body']??'') : '';

            // 실제 이메일 발송 시도 (PHP mail() 또는 SMTP)
            if ($cfg && $cfg['from_email']) {
                $headers = "From: {$cfg['from_name']} <{$cfg['from_email']}>\r\nContent-Type: text/html; charset=UTF-8\r\n";
                $ok = @mail($c['email'], $subject, $body, $headers);
                if (!$ok) { $status = 'failed'; $failed++; } else $sent++;
            } else {
                // Mock 모드 — SMTP 미설정 시 기록만
                $status = 'mock_sent';
                $sent++;
            }

            $pdo->prepare("INSERT INTO email_sends (campaign_id, customer_id, email, status) VALUES (:cid, :uid, :email, :st)")->execute([
                ':cid'=>$cid,':uid'=>$c['id'],':email'=>$c['email'],':st'=>$status,
            ]);
            // CRM 활동 기록
            $pdo->prepare("INSERT INTO crm_activities (customer_id, type, channel, data) VALUES (:uid, 'email_sent', 'email', :data)")->execute([
                ':uid'=>$c['id'],':data'=>json_encode(['campaign_id'=>$cid,'campaign_name'=>$campaign['name'],'subject'=>$subject]),
            ]);
        }

        $total = count($customerList);
        $pdo->prepare("UPDATE email_campaigns SET status='sent', sent_at=datetime('now'), total_sent=:t WHERE id=:id")->execute([':t'=>$total,':id'=>$cid]);
        $res->getBody()->write(json_encode(['ok'=>true,'total'=>$total,'sent'=>$sent,'failed'=>$failed]));
        return $res->withHeader('Content-Type','application/json');
    }

    /* ─── GET /api/email/campaigns/{id}/stats ──────────────────────── */
    public static function campaignStats(Request $req, Response $res, array $args): Response
    {
        self::ensureTables();
        $pdo = self::db();
        $cid = (int)$args['id'];
        $camp = $pdo->prepare("SELECT * FROM email_campaigns WHERE id=:id");
        $camp->execute([':id'=>$cid]);
        $campaign = $camp->fetch(\PDO::FETCH_ASSOC);

        $sends = $pdo->prepare("SELECT status, COUNT(*) AS cnt FROM email_sends WHERE campaign_id=:cid GROUP BY status");
        $sends->execute([':cid'=>$cid]);
        $byStatus = $sends->fetchAll(\PDO::FETCH_KEY_PAIR);

        $total = array_sum($byStatus);
        $sent  = ($byStatus['sent']??0) + ($byStatus['mock_sent']??0);
        $open  = (int)($campaign['opened']??0);
        $click = (int)($campaign['clicked']??0);

        $res->getBody()->write(json_encode([
            'ok'=>true,'campaign'=>$campaign,
            'stats'=>['total'=>$total,'sent'=>$sent,'failed'=>$byStatus['failed']??0,
                      'open_rate'=>$total>0?round($open/$total*100,2):0,
                      'click_rate'=>$total>0?round($click/$total*100,2):0],
            'by_status'=>$byStatus
        ]));
        return $res->withHeader('Content-Type','application/json');
    }

    /* ─── POST /api/email/track/open ───────────────────────────────── */
    public static function trackOpen(Request $req, Response $res): Response
    {
        $b = (array)$req->getParsedBody();
        $pdo = self::db();
        $pdo->prepare("UPDATE email_sends SET opened_at=datetime('now'), status='opened' WHERE campaign_id=:cid AND customer_id=:uid")
            ->execute([':cid'=>(int)($b['campaign_id']??0),':uid'=>(int)($b['customer_id']??0)]);
        $pdo->exec("UPDATE email_campaigns SET opened=opened+1 WHERE id=".(int)($b['campaign_id']??0));
        $res->getBody()->write('{"ok":true}');
        return $res->withHeader('Content-Type','application/json');
    }
}
