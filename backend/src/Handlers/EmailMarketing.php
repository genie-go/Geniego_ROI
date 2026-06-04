<?php
declare(strict_types=1);
namespace Genie\Handlers;

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;
use Genie\Db;
use Genie\Mailer;

/**
 * EmailMarketing — 이메일 캠페인 (190차 부활 + 멀티테넌트 격리 + MySQL/SQLite 이식 + Mailer 연동).
 *
 * 189차까지 runtime-dead(Db::get). 부활 4층(메모리 project_n190 §④ CRM 패턴 동일):
 *   ① Db::get→pdo ② 라우팅 /api/email→/email(basePath 정합) ③ 격리먼저(requirePro+세션tenant,
 *   email_* 4테이블 tenant_id, ★crm_* 참조도 테넌트 스코핑 — 무스코핑 시 전 테넌트 고객에게 발송=P0)
 *   ④ SQL 이식(SQLite datetime('now')→PHP 바인드). + sendCampaign 실발송을 Mailer(SMTP) 위임.
 * email_settings = 테넌트 캠페인 SMTP(플랫폼 트랜잭션 메일은 Mailer env). /api/email public bypass(세션 self-auth).
 */
class EmailMarketing
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
            $pdo->exec("CREATE TABLE IF NOT EXISTS email_settings (
                id INT AUTO_INCREMENT PRIMARY KEY, tenant_id VARCHAR(100) NOT NULL DEFAULT 'demo',
                provider VARCHAR(30) DEFAULT 'smtp', smtp_host VARCHAR(255), smtp_port INT DEFAULT 587,
                smtp_user VARCHAR(255), smtp_pass VARCHAR(255), from_email VARCHAR(255), from_name VARCHAR(255),
                aws_region VARCHAR(64), aws_key VARCHAR(255), aws_secret VARCHAR(255), updated_at VARCHAR(32),
                KEY idx_email_settings_tenant (tenant_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
            $pdo->exec("CREATE TABLE IF NOT EXISTS email_templates (
                id INT AUTO_INCREMENT PRIMARY KEY, tenant_id VARCHAR(100) NOT NULL DEFAULT 'demo',
                name VARCHAR(255) NOT NULL, subject VARCHAR(500) NOT NULL, html_body MEDIUMTEXT NOT NULL,
                plain_body MEDIUMTEXT, variables TEXT, category VARCHAR(50) DEFAULT 'general',
                created_at VARCHAR(32), updated_at VARCHAR(32), KEY idx_email_tpl_tenant (tenant_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
            $pdo->exec("CREATE TABLE IF NOT EXISTS email_campaigns (
                id INT AUTO_INCREMENT PRIMARY KEY, tenant_id VARCHAR(100) NOT NULL DEFAULT 'demo',
                name VARCHAR(255) NOT NULL, template_id INT, segment_id INT, status VARCHAR(30) DEFAULT 'draft',
                scheduled_at VARCHAR(32), sent_at VARCHAR(32), total_sent INT DEFAULT 0, opened INT DEFAULT 0,
                clicked INT DEFAULT 0, bounced INT DEFAULT 0, created_at VARCHAR(32), KEY idx_email_cmp_tenant (tenant_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
            $pdo->exec("CREATE TABLE IF NOT EXISTS email_sends (
                id INT AUTO_INCREMENT PRIMARY KEY, tenant_id VARCHAR(100) NOT NULL DEFAULT 'demo',
                campaign_id INT NOT NULL, customer_id INT, email VARCHAR(255) NOT NULL, status VARCHAR(30) DEFAULT 'pending',
                opened_at VARCHAR(32), clicked_at VARCHAR(32), bounce_reason TEXT, sent_at VARCHAR(32),
                KEY idx_email_sends_cmp (campaign_id), KEY idx_email_sends_tenant (tenant_id, status)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
        } else {
            $pdo->exec("CREATE TABLE IF NOT EXISTS email_settings (
                id INTEGER PRIMARY KEY AUTOINCREMENT, tenant_id TEXT NOT NULL DEFAULT 'demo', provider TEXT DEFAULT 'smtp',
                smtp_host TEXT, smtp_port INTEGER DEFAULT 587, smtp_user TEXT, smtp_pass TEXT, from_email TEXT, from_name TEXT,
                aws_region TEXT, aws_key TEXT, aws_secret TEXT, updated_at TEXT)");
            $pdo->exec("CREATE TABLE IF NOT EXISTS email_templates (
                id INTEGER PRIMARY KEY AUTOINCREMENT, tenant_id TEXT NOT NULL DEFAULT 'demo', name TEXT NOT NULL,
                subject TEXT NOT NULL, html_body TEXT NOT NULL, plain_body TEXT, variables TEXT DEFAULT '[]',
                category TEXT DEFAULT 'general', created_at TEXT, updated_at TEXT)");
            $pdo->exec("CREATE TABLE IF NOT EXISTS email_campaigns (
                id INTEGER PRIMARY KEY AUTOINCREMENT, tenant_id TEXT NOT NULL DEFAULT 'demo', name TEXT NOT NULL,
                template_id INTEGER, segment_id INTEGER, status TEXT DEFAULT 'draft', scheduled_at TEXT, sent_at TEXT,
                total_sent INTEGER DEFAULT 0, opened INTEGER DEFAULT 0, clicked INTEGER DEFAULT 0, bounced INTEGER DEFAULT 0,
                created_at TEXT)");
            $pdo->exec("CREATE TABLE IF NOT EXISTS email_sends (
                id INTEGER PRIMARY KEY AUTOINCREMENT, tenant_id TEXT NOT NULL DEFAULT 'demo', campaign_id INTEGER NOT NULL,
                customer_id INTEGER, email TEXT NOT NULL, status TEXT DEFAULT 'pending', opened_at TEXT, clicked_at TEXT,
                bounce_reason TEXT, sent_at TEXT)");
            $pdo->exec("CREATE INDEX IF NOT EXISTS idx_email_sends_cmp ON email_sends(campaign_id)");
            $pdo->exec("CREATE INDEX IF NOT EXISTS idx_email_settings_tenant ON email_settings(tenant_id)");
        }
        foreach (['email_settings','email_templates','email_campaigns','email_sends'] as $tbl) {
            try { $pdo->exec("ALTER TABLE {$tbl} ADD COLUMN tenant_id VARCHAR(100) NOT NULL DEFAULT 'demo'"); } catch (\Throwable $e) {}
        }
    }

    /* ─── 설정 GET/PUT ─────────────────────────────────────────────── */
    public static function getSettings(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $pdo = self::db();
        $tenant = self::tenant($req);
        $st = $pdo->prepare("SELECT * FROM email_settings WHERE tenant_id=? ORDER BY id DESC LIMIT 1");
        $st->execute([$tenant]);
        $row = $st->fetch(\PDO::FETCH_ASSOC);
        if ($row) { unset($row['smtp_pass'], $row['aws_secret']); }
        return self::jsonRes($res, ['ok'=>true,'settings'=>$row ?: null]);
    }

    public static function saveSettings(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $pdo = self::db();
        $tenant = self::tenant($req);
        $b = (array)$req->getParsedBody();
        $exStmt = $pdo->prepare("SELECT id FROM email_settings WHERE tenant_id=? LIMIT 1");
        $exStmt->execute([$tenant]);
        $exists = $exStmt->fetch();
        $now = self::now();
        if ($exists) {
            $pdo->prepare("UPDATE email_settings SET provider=:prov, smtp_host=:host, smtp_port=:port,
                smtp_user=:user, smtp_pass=:pass, from_email=:fe, from_name=:fn,
                aws_region=:reg, aws_key=:akey, aws_secret=:asec, updated_at=:ua WHERE id=:id AND tenant_id=:t
            ")->execute([
                ':id'=>$exists['id'], ':t'=>$tenant, ':prov'=>$b['provider']??'smtp', ':host'=>$b['smtp_host']??'',
                ':port'=>(int)($b['smtp_port']??587), ':user'=>$b['smtp_user']??'', ':pass'=>$b['smtp_pass']??'',
                ':fe'=>$b['from_email']??'', ':fn'=>$b['from_name']??'',
                ':reg'=>$b['aws_region']??'', ':akey'=>$b['aws_key']??'', ':asec'=>$b['aws_secret']??'', ':ua'=>$now,
            ]);
        } else {
            $pdo->prepare("INSERT INTO email_settings (tenant_id, provider, smtp_host, smtp_port, smtp_user, smtp_pass, from_email, from_name, aws_region, aws_key, aws_secret, updated_at)
                VALUES (:t, :prov, :host, :port, :user, :pass, :fe, :fn, :reg, :akey, :asec, :ua)
            ")->execute([
                ':t'=>$tenant, ':prov'=>$b['provider']??'smtp', ':host'=>$b['smtp_host']??'', ':port'=>(int)($b['smtp_port']??587),
                ':user'=>$b['smtp_user']??'', ':pass'=>$b['smtp_pass']??'', ':fe'=>$b['from_email']??'', ':fn'=>$b['from_name']??'',
                ':reg'=>$b['aws_region']??'', ':akey'=>$b['aws_key']??'', ':asec'=>$b['aws_secret']??'', ':ua'=>$now,
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
        $st = self::db()->prepare("SELECT id,name,subject,category,variables,created_at FROM email_templates WHERE tenant_id=? ORDER BY updated_at DESC");
        $st->execute([$tenant]);
        $rows = $st->fetchAll(\PDO::FETCH_ASSOC);
        foreach ($rows as &$r) { $r['variables'] = json_decode($r['variables']??'[]', true); }
        return self::jsonRes($res, ['ok'=>true,'templates'=>$rows]);
    }

    public static function createTemplate(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $pdo = self::db();
        $tenant = self::tenant($req);
        $b = (array)$req->getParsedBody();
        if (empty($b['name']) || empty($b['subject']) || empty($b['html_body'])) {
            return self::jsonRes($res, ['ok'=>false,'error'=>'name, subject, html_body 필수'], 400);
        }
        $now = self::now();
        $pdo->prepare("INSERT INTO email_templates (tenant_id,name,subject,html_body,plain_body,variables,category,created_at,updated_at)
            VALUES (:t,:n,:s,:h,:p,:v,:c,:ca,:ua)")->execute([
            ':t'=>$tenant, ':n'=>$b['name'], ':s'=>$b['subject'], ':h'=>$b['html_body'],
            ':p'=>$b['plain_body']??'', ':v'=>json_encode($b['variables']??[]), ':c'=>$b['category']??'general', ':ca'=>$now, ':ua'=>$now,
        ]);
        return self::jsonRes($res, ['ok'=>true,'id'=>(int)$pdo->lastInsertId()]);
    }

    public static function getTemplate(Request $req, Response $res, array $args): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $tenant = self::tenant($req);
        $row = self::db()->prepare("SELECT * FROM email_templates WHERE id=:id AND tenant_id=:t");
        $row->execute([':id'=>(int)$args['id'], ':t'=>$tenant]);
        $t = $row->fetch(\PDO::FETCH_ASSOC);
        if (!$t) return self::jsonRes($res, ['ok'=>false,'error'=>'없음'], 404);
        $t['variables'] = json_decode($t['variables']??'[]', true);
        return self::jsonRes($res, ['ok'=>true,'template'=>$t]);
    }

    public static function updateTemplate(Request $req, Response $res, array $args): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $pdo = self::db();
        $tenant = self::tenant($req);
        $b = (array)$req->getParsedBody();
        $stmt = $pdo->prepare("UPDATE email_templates SET name=:n,subject=:s,html_body=:h,plain_body=:p,variables=:v,category=:c,updated_at=:ua WHERE id=:id AND tenant_id=:t");
        $stmt->execute([
            ':id'=>(int)$args['id'], ':t'=>$tenant, ':n'=>$b['name']??'', ':s'=>$b['subject']??'',
            ':h'=>$b['html_body']??'', ':p'=>$b['plain_body']??'', ':v'=>json_encode($b['variables']??[]), ':c'=>$b['category']??'general', ':ua'=>self::now(),
        ]);
        if ($stmt->rowCount() === 0) return self::jsonRes($res, ['ok'=>false,'error'=>'없음'], 404);
        return self::jsonRes($res, ['ok'=>true]);
    }

    public static function deleteTemplate(Request $req, Response $res, array $args): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $tenant = self::tenant($req);
        self::db()->prepare("DELETE FROM email_templates WHERE id=:id AND tenant_id=:t")->execute([':id'=>(int)$args['id'], ':t'=>$tenant]);
        return self::jsonRes($res, ['ok'=>true]);
    }

    /* ─── 캠페인 ───────────────────────────────────────────────────── */
    public static function listCampaigns(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $tenant = self::tenant($req);
        $st = self::db()->prepare("
            SELECT ec.*, et.name AS template_name, cs.name AS segment_name
            FROM email_campaigns ec
            LEFT JOIN email_templates et ON et.id=ec.template_id AND et.tenant_id=ec.tenant_id
            LEFT JOIN crm_segments cs ON cs.id=ec.segment_id AND cs.tenant_id=ec.tenant_id
            WHERE ec.tenant_id=:t ORDER BY ec.created_at DESC
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
        $pdo->prepare("INSERT INTO email_campaigns (tenant_id,name,template_id,segment_id,status,scheduled_at,created_at)
            VALUES (:t,:n,:tpl,:s,:st,:sc,:ca)")->execute([
            ':t'=>$tenant, ':n'=>$b['name'], ':tpl'=>(int)($b['template_id']??0),
            ':s'=>(int)($b['segment_id']??0), ':st'=>$b['status']??'draft', ':sc'=>$b['scheduled_at']??null, ':ca'=>self::now(),
        ]);
        return self::jsonRes($res, ['ok'=>true,'id'=>(int)$pdo->lastInsertId()]);
    }

    /* ─── POST /email/campaigns/{id}/send ──────────────────────────── */
    public static function sendCampaign(Request $req, Response $res, array $args): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $pdo = self::db();
        $tenant = self::tenant($req);
        $cid = (int)$args['id'];

        $camp = $pdo->prepare("SELECT * FROM email_campaigns WHERE id=:id AND tenant_id=:t");
        $camp->execute([':id'=>$cid, ':t'=>$tenant]);
        $campaign = $camp->fetch(\PDO::FETCH_ASSOC);
        if (!$campaign) return self::jsonRes($res, ['ok'=>false,'error'=>'캠페인 없음'], 404);

        $template = null;
        if (!empty($campaign['template_id'])) {
            $tpl = $pdo->prepare("SELECT * FROM email_templates WHERE id=:id AND tenant_id=:t");
            $tpl->execute([':id'=>$campaign['template_id'], ':t'=>$tenant]);
            $template = $tpl->fetch(\PDO::FETCH_ASSOC);
        }

        // 대상 고객 (★테넌트 스코프 — crm_* 도 동일 테넌트만)
        $segId = (int)$campaign['segment_id'];
        if ($segId) {
            $cust = $pdo->prepare("SELECT c.id, c.email, c.name FROM crm_customers c
                JOIN crm_segment_members sm ON sm.customer_id=c.id AND sm.tenant_id=c.tenant_id
                WHERE sm.segment_id=:sid AND c.tenant_id=:t");
            $cust->execute([':sid'=>$segId, ':t'=>$tenant]);
        } else {
            $cust = $pdo->prepare("SELECT id, email, name FROM crm_customers WHERE tenant_id=:t");
            $cust->execute([':t'=>$tenant]);
        }
        $customerList = $cust->fetchAll(\PDO::FETCH_ASSOC);

        $sent = 0; $failed = 0; $mock = 0;
        $now = self::now();
        foreach ($customerList as $c) {
            $subject = $template ? str_replace('{{name}}', $c['name']??'', (string)($template['subject']??'')) : '(제목 없음)';
            $body    = $template ? str_replace('{{name}}', $c['name']??'', (string)($template['html_body']??'')) : '';

            // 실발송 — 테넌트 email_settings SMTP(Mailer). 미설정 시 honest mock_sent.
            $mr = Mailer::send((string)$c['email'], $subject, $body, ['pdo'=>$pdo, 'tenant'=>$tenant]);
            if (($mr['mode']??'') === 'unconfigured') { $status='mock_sent'; $mock++; }
            elseif (!empty($mr['ok'])) { $status='sent'; $sent++; }
            else { $status='failed'; $failed++; }

            $pdo->prepare("INSERT INTO email_sends (tenant_id, campaign_id, customer_id, email, status, sent_at) VALUES (:t,:cid,:uid,:email,:st,:sa)")
                ->execute([':t'=>$tenant, ':cid'=>$cid, ':uid'=>$c['id'], ':email'=>$c['email'], ':st'=>$status, ':sa'=>$now]);
            // CRM 활동 기록 (테넌트 스코프)
            $pdo->prepare("INSERT INTO crm_activities (tenant_id, customer_id, type, channel, data, created_at) VALUES (:t,:uid,'email_sent','email',:data,:ca)")
                ->execute([':t'=>$tenant, ':uid'=>$c['id'], ':data'=>json_encode(['campaign_id'=>$cid,'campaign_name'=>$campaign['name'],'subject'=>$subject]), ':ca'=>$now]);
        }

        $total = count($customerList);
        $pdo->prepare("UPDATE email_campaigns SET status='sent', sent_at=:sa, total_sent=:t WHERE id=:id AND tenant_id=:tn")
            ->execute([':sa'=>$now, ':t'=>$total, ':id'=>$cid, ':tn'=>$tenant]);
        return self::jsonRes($res, ['ok'=>true,'total'=>$total,'sent'=>$sent,'mock_sent'=>$mock,'failed'=>$failed]);
    }

    /* ─── GET /email/campaigns/{id}/stats ──────────────────────────── */
    public static function campaignStats(Request $req, Response $res, array $args): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $pdo = self::db();
        $tenant = self::tenant($req);
        $cid = (int)$args['id'];
        $camp = $pdo->prepare("SELECT * FROM email_campaigns WHERE id=:id AND tenant_id=:t");
        $camp->execute([':id'=>$cid, ':t'=>$tenant]);
        $campaign = $camp->fetch(\PDO::FETCH_ASSOC);
        if (!$campaign) return self::jsonRes($res, ['ok'=>false,'error'=>'캠페인 없음'], 404);

        $sends = $pdo->prepare("SELECT status, COUNT(*) AS cnt FROM email_sends WHERE campaign_id=:cid AND tenant_id=:t GROUP BY status");
        $sends->execute([':cid'=>$cid, ':t'=>$tenant]);
        $byStatus = $sends->fetchAll(\PDO::FETCH_KEY_PAIR);

        $total = array_sum($byStatus);
        $sent  = ($byStatus['sent']??0) + ($byStatus['mock_sent']??0);
        $open  = (int)($campaign['opened']??0);
        $click = (int)($campaign['clicked']??0);

        return self::jsonRes($res, [
            'ok'=>true,'campaign'=>$campaign,
            'stats'=>['total'=>$total,'sent'=>$sent,'failed'=>$byStatus['failed']??0,
                      'open_rate'=>$total>0?round($open/$total*100,2):0,
                      'click_rate'=>$total>0?round($click/$total*100,2):0],
            'by_status'=>$byStatus,
        ]);
    }

    /* ─── POST /email/track/open — 공개 비콘(세션 없음). campaign+customer 로 자연 스코프 ── */
    public static function trackOpen(Request $req, Response $res): Response
    {
        self::ensureTables();
        $pdo = self::db();
        $b = (array)$req->getParsedBody();
        $cid = (int)($b['campaign_id']??0); $uid = (int)($b['customer_id']??0);
        $pdo->prepare("UPDATE email_sends SET opened_at=:oa, status='opened' WHERE campaign_id=:cid AND customer_id=:uid")
            ->execute([':oa'=>self::now(), ':cid'=>$cid, ':uid'=>$uid]);
        $pdo->prepare("UPDATE email_campaigns SET opened=opened+1 WHERE id=:cid")->execute([':cid'=>$cid]);
        $res->getBody()->write('{"ok":true}');
        return $res->withHeader('Content-Type','application/json');
    }
}
