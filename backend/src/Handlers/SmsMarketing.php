<?php
declare(strict_types=1);
namespace Genie\Handlers;

use Genie\Db;
use Genie\TemplateResponder;
use PDO;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

/**
 * SMS Marketing Handler — NHN Cloud bizMessage 연동
 * 인증키(App Key + Secret Key) 등록만으로 즉시 발송
 *
 * Routes:
 *   GET    /api/sms/settings              — 설정 조회
 *   POST   /api/sms/settings              — 인증키 저장 + 테스트
 *   POST   /api/sms/send                  — SMS 단건 발송
 *   POST   /api/sms/broadcast             — 일괄 발송 (LMS)
 *   GET    /api/sms/messages              — 발송 이력
 *   GET    /api/sms/stats                 — 통계
 */
final class SmsMarketing
{
    // NHN Cloud Biz Message API endpoint
    private const NHN_API = 'https://api-sms.cloud.toast.com/sms/v3.0';

    // 191차 부활: 세션 기반 plan/tenant(UserAuth). api_key 미들웨어 bypass(/sms,/api/sms) + requirePro 게이트.
    private static function isMysql(\PDO $pdo): bool { return $pdo->getAttribute(\PDO::ATTR_DRIVER_NAME) === 'mysql'; }

    private static function plan(Request $req): string
    {
        // [현 차수 감사 ISO-1] 폴백 'demo'→'free' — 운영 사용자 plan 공백 시 데모 오판→실발송 시뮬레이션·가짜이력
        //   운영 유입 차단(데모 판별 plan==='demo' 는 불변, 회귀 없음). WhatsApp.php 와 동일 정책.
        $u = UserAuth::authedUser($req);
        return $u['plan'] ?? 'free';
    }

    private static function tenant(Request $req): string
    {
        $t = UserAuth::authedTenant($req);
        return ($t !== null && $t !== '') ? $t : 'demo';
    }

    /** [현 차수] 수신번호(숫자만) → crm_customers.id 역매핑. 저장 phone 의 구분자(-, 공백, (), +)를
     *  SQL REPLACE 로 제거 후 숫자비교(best-effort). 매핑 실패 시 0(빈도캡 미적용·기존대로 발송). */
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
            $pdo->exec("CREATE TABLE IF NOT EXISTS sms_settings (
                id INT AUTO_INCREMENT PRIMARY KEY, tenant_id VARCHAR(100) NOT NULL,
                provider VARCHAR(30) DEFAULT 'nhn', app_key VARCHAR(255), secret_key VARCHAR(255), sender_no VARCHAR(50),
                is_active TINYINT DEFAULT 1, test_status VARCHAR(20) DEFAULT 'untested', updated_at VARCHAR(32),
                UNIQUE KEY uq_sms_settings_tenant (tenant_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
            $pdo->exec("CREATE TABLE IF NOT EXISTS sms_messages (
                id INT AUTO_INCREMENT PRIMARY KEY, tenant_id VARCHAR(100) NOT NULL, msg_type VARCHAR(10) DEFAULT 'SMS',
                recipient VARCHAR(50) NOT NULL, body TEXT, status VARCHAR(20) DEFAULT 'pending', msg_id VARCHAR(100),
                error TEXT, sent_at VARCHAR(32), created_at VARCHAR(32), KEY idx_sms_msg_tenant (tenant_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
            // 209차 P1: Templates·Campaigns 영속(프론트 탭 백엔드 부재 해소)
            $pdo->exec("CREATE TABLE IF NOT EXISTS sms_templates (id INT AUTO_INCREMENT PRIMARY KEY, tenant_id VARCHAR(100) NOT NULL, name VARCHAR(190), category VARCHAR(40) DEFAULT 'promotion', body TEXT, variables TEXT, created_at VARCHAR(32), updated_at VARCHAR(32), KEY idx_sms_tpl_tenant (tenant_id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
            $pdo->exec("CREATE TABLE IF NOT EXISTS sms_campaigns (id INT AUTO_INCREMENT PRIMARY KEY, tenant_id VARCHAR(100) NOT NULL, name VARCHAR(190), template_id VARCHAR(40), segment_id VARCHAR(40), scheduled_at VARCHAR(40), message TEXT, status VARCHAR(20) DEFAULT 'draft', sent_count INT DEFAULT 0, created_at VARCHAR(32), updated_at VARCHAR(32), KEY idx_sms_camp_tenant (tenant_id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
        } else {
            $pdo->exec("CREATE TABLE IF NOT EXISTS sms_settings (
                id INTEGER PRIMARY KEY AUTOINCREMENT, tenant_id TEXT NOT NULL, provider TEXT DEFAULT 'nhn',
                app_key TEXT, secret_key TEXT, sender_no TEXT, is_active INTEGER DEFAULT 1,
                test_status TEXT DEFAULT 'untested', updated_at TEXT, UNIQUE(tenant_id))");
            $pdo->exec("CREATE TABLE IF NOT EXISTS sms_messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT, tenant_id TEXT NOT NULL, msg_type TEXT DEFAULT 'SMS',
                recipient TEXT NOT NULL, body TEXT, status TEXT DEFAULT 'pending', msg_id TEXT, error TEXT,
                sent_at TEXT, created_at TEXT)");
            $pdo->exec("CREATE TABLE IF NOT EXISTS sms_templates (id INTEGER PRIMARY KEY AUTOINCREMENT, tenant_id TEXT NOT NULL, name TEXT, category TEXT DEFAULT 'promotion', body TEXT, variables TEXT, created_at TEXT, updated_at TEXT)");
            $pdo->exec("CREATE TABLE IF NOT EXISTS sms_campaigns (id INTEGER PRIMARY KEY AUTOINCREMENT, tenant_id TEXT NOT NULL, name TEXT, template_id TEXT, segment_id TEXT, scheduled_at TEXT, message TEXT, status TEXT DEFAULT 'draft', sent_count INTEGER DEFAULT 0, created_at TEXT, updated_at TEXT)");
        }
        // [283차 P0] topic(콘텐츠 카테고리) — 선호센터 토픽 옵트아웃을 SMS 캠페인에도 강제(멱등 ALTER, 기본 NULL=무회귀).
        try { $pdo->exec("ALTER TABLE sms_campaigns ADD COLUMN topic VARCHAR(20) DEFAULT NULL"); } catch (\Throwable $e) {}
    }

    /* ─────────── 209차 P1: SMS Templates CRUD (/api/sms/templates) ─────────── */
    private static function bodyArr(Request $req): array {
        $b = (array)($req->getParsedBody() ?? []);
        if (!$b) { $d = json_decode((string)$req->getBody(), true); if (is_array($d)) $b = $d; }
        return $b;
    }
    private static function varsToArr($v): array {
        if (is_array($v)) return array_values(array_filter(array_map('trim', $v), fn($x)=>$x!==''));
        $s = trim((string)$v);
        if ($s === '') return [];
        $j = json_decode($s, true);
        if (is_array($j)) return array_values(array_filter(array_map('trim', $j), fn($x)=>$x!==''));
        return array_values(array_filter(array_map('trim', explode(',', $s)), fn($x)=>$x!==''));
    }

    public static function listTemplates(Request $req, Response $res, array $args = []): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $st = Db::pdo()->prepare("SELECT id,name,category,body,variables,updated_at FROM sms_templates WHERE tenant_id=? ORDER BY id DESC");
        $st->execute([self::tenant($req)]);
        $rows = array_map(function($r){ $r['variables'] = self::varsToArr($r['variables'] ?? ''); return $r; }, $st->fetchAll(PDO::FETCH_ASSOC));
        return TemplateResponder::respond($res, ['ok'=>true,'templates'=>$rows]);
    }

    public static function saveTemplate(Request $req, Response $res, array $args = []): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $pdo = Db::pdo(); $tenant = self::tenant($req); $b = self::bodyArr($req); $now = gmdate('c');
        $name = trim((string)($b['name'] ?? ''));
        if ($name === '') return TemplateResponder::respond($res->withStatus(422), ['ok'=>false,'error'=>'name required']);
        $vars = json_encode(self::varsToArr($b['variables'] ?? []), JSON_UNESCAPED_UNICODE);
        $pdo->prepare("INSERT INTO sms_templates(tenant_id,name,category,body,variables,created_at,updated_at) VALUES(?,?,?,?,?,?,?)")
            ->execute([$tenant,$name,trim((string)($b['category'] ?? 'promotion')),(string)($b['body'] ?? ''),$vars,$now,$now]);
        return TemplateResponder::respond($res, ['ok'=>true,'id'=>(int)$pdo->lastInsertId()]);
    }

    public static function updateTemplate(Request $req, Response $res, array $args = []): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $pdo = Db::pdo(); $tenant = self::tenant($req); $b = self::bodyArr($req);
        $id = (int)($args['id'] ?? 0);
        $vars = json_encode(self::varsToArr($b['variables'] ?? []), JSON_UNESCAPED_UNICODE);
        $st = $pdo->prepare("UPDATE sms_templates SET name=?,category=?,body=?,variables=?,updated_at=? WHERE id=? AND tenant_id=?");
        $st->execute([trim((string)($b['name'] ?? '')),trim((string)($b['category'] ?? 'promotion')),(string)($b['body'] ?? ''),$vars,gmdate('c'),$id,$tenant]);
        if ($st->rowCount() === 0) return TemplateResponder::respond($res->withStatus(404), ['ok'=>false,'error'=>'not found']);
        return TemplateResponder::respond($res, ['ok'=>true,'id'=>$id]);
    }

    public static function deleteTemplate(Request $req, Response $res, array $args = []): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $st = Db::pdo()->prepare("DELETE FROM sms_templates WHERE id=? AND tenant_id=?");
        $st->execute([(int)($args['id'] ?? 0), self::tenant($req)]);
        return TemplateResponder::respond($res, ['ok'=>true,'deleted'=>$st->rowCount()]);
    }

    /* ─────────── 209차 P1: SMS Campaigns (/api/sms/campaigns) ─────────── */
    public static function listCampaigns(Request $req, Response $res, array $args = []): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $st = Db::pdo()->prepare("SELECT id,name,template_id,segment_id,scheduled_at,message,status,sent_count,updated_at FROM sms_campaigns WHERE tenant_id=? ORDER BY id DESC");
        $st->execute([self::tenant($req)]);
        return TemplateResponder::respond($res, ['ok'=>true,'campaigns'=>$st->fetchAll(PDO::FETCH_ASSOC)]);
    }

    public static function saveCampaign(Request $req, Response $res, array $args = []): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $pdo = Db::pdo(); $tenant = self::tenant($req); $b = self::bodyArr($req); $now = gmdate('c');
        $name = trim((string)($b['name'] ?? ''));
        if ($name === '') return TemplateResponder::respond($res->withStatus(422), ['ok'=>false,'error'=>'name required']);
        $sched = trim((string)($b['scheduled_at'] ?? ''));
        $status = $sched !== '' ? 'scheduled' : 'draft';
        // [283차 P0] 토픽(콘텐츠 카테고리) — 화이트리스트 밖/미지정은 NULL(게이트 미적용=무회귀).
        $topic = strtolower(trim((string)($b['topic'] ?? '')));
        if ($topic === '' || !isset(PreferenceCenter::TOPICS[$topic])) $topic = null;
        $pdo->prepare("INSERT INTO sms_campaigns(tenant_id,name,template_id,segment_id,scheduled_at,message,status,topic,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)")
            ->execute([$tenant,$name,(string)($b['template_id'] ?? ''),(string)($b['segment_id'] ?? ''),$sched,(string)($b['message'] ?? ''),$status,$topic,$now,$now]);
        return TemplateResponder::respond($res, ['ok'=>true,'id'=>(int)$pdo->lastInsertId(),'status'=>$status,'topic'=>$topic]);
    }

    public static function campaignAction(Request $req, Response $res, array $args = []): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $pdo = Db::pdo(); $tenant = self::tenant($req);
        $id = (int)($args['id'] ?? 0);
        $act = strtolower((string)($args['action'] ?? ''));

        // 260차 정직화: send/start = "발송됨" 표기만이 아니라 캠페인 세그먼트로 실제 발송(sendSms+sms_messages 적재)한다.
        //   기존엔 status='sent' UPDATE만 해서 실제 문자 발송 없이 "발송됨"으로 표기(가짜집행).
        if ($act === 'send' || $act === 'start') {
            return self::dispatchCampaign($req, $res, $pdo, $tenant, $id);
        }

        // 상태 전이(소유 테넌트 한정): pause/resume/cancel.
        $map = ['pause'=>'paused','resume'=>'scheduled','cancel'=>'draft'];
        if (!isset($map[$act])) return TemplateResponder::respond($res->withStatus(422), ['ok'=>false,'error'=>'unknown action']);
        $st = $pdo->prepare("UPDATE sms_campaigns SET status=?, updated_at=? WHERE id=? AND tenant_id=?");
        $st->execute([$map[$act], gmdate('c'), $id, $tenant]);
        if ($st->rowCount() === 0) return TemplateResponder::respond($res->withStatus(404), ['ok'=>false,'error'=>'not found']);
        return TemplateResponder::respond($res, ['ok'=>true,'id'=>$id,'status'=>$map[$act]]);
    }

    /** 260차: 캠페인 실제 발송 — 세그먼트 멤버 전화번호 해석 → sendSms → sms_messages 적재 → status='sent'+sent_count.
     *  발신설정 미존재(운영)면 가짜 발송 금지·422. 데모는 시뮬레이션. broadcast 로직 재사용. */
    private static function dispatchCampaign(Request $req, Response $res, \PDO $pdo, string $tenant, int $id): Response
    {
        $plan = self::plan($req);
        // [현 차수 P1] template_id 도 조회 — 템플릿 기반 캠페인은 message 가 비어 무음 미발송(422)이었다.
        try {
            // [283차 P0] topic 도 조회 — 선호센터 토픽 옵트아웃 강제용. (구 스키마 폴백은 catch 에서 처리)
            $c = $pdo->prepare("SELECT id,segment_id,message,template_id,topic,status FROM sms_campaigns WHERE id=? AND tenant_id=?");
            $c->execute([$id, $tenant]);
            $camp = $c->fetch(PDO::FETCH_ASSOC);
        } catch (\Throwable $e) {
            $c = $pdo->prepare("SELECT id,segment_id,message,status FROM sms_campaigns WHERE id=? AND tenant_id=?");
            $c->execute([$id, $tenant]);
            $camp = $c->fetch(PDO::FETCH_ASSOC);
        }
        if (!$camp) return TemplateResponder::respond($res->withStatus(404), ['ok'=>false,'error'=>'not found']);
        if (($camp['status'] ?? '') === 'sent') {
            return TemplateResponder::respond($res, ['ok'=>true,'id'=>$id,'status'=>'sent','already'=>true,'sent'=>0]);
        }
        $message = trim((string)($camp['message'] ?? ''));
        // 메시지가 비고 template_id 가 있으면 sms_templates 본문 로드(템플릿 캠페인 발송 정상화).
        if ($message === '' && (int)($camp['template_id'] ?? 0) > 0) {
            try {
                $tq = $pdo->prepare("SELECT COALESCE(content, body, message, '') AS body FROM sms_templates WHERE id=? AND tenant_id=?");
                $tq->execute([(int)$camp['template_id'], $tenant]);
                $message = trim((string)($tq->fetchColumn() ?: ''));
            } catch (\Throwable $e) { /* 컬럼/테이블 변형 — 아래 422 폴백 */ }
        }
        if ($message === '') return TemplateResponder::respond($res->withStatus(422), ['ok'=>false,'error'=>'캠페인 메시지 또는 템플릿 본문이 비어 있습니다.']);
        $type = strlen($message) > 90 ? 'LMS' : 'SMS';
        $now  = gmdate('c');

        // 세그먼트 멤버 전화번호 해석(세그먼트 미지정 시 전체 고객)
        // [283차 P2-2] ★발송 직전 동적 세그먼트 멤버 최신화 — SMS 만 이 호출이 빠져 있어 stale 스냅샷으로 발송됐다
        //   (Email:sendCampaign · Kakao:sendCampaign · Omni:sendCampaign 은 전부 호출). 형제 채널과 대칭 배선.
        //   best-effort — 실패해도 발송 진행(무회귀).
        if ((int)($camp['segment_id'] ?? 0) > 0) { CRM::refreshSegmentForSend($pdo, $tenant, (int)$camp['segment_id']); }
        if ((int)($camp['segment_id'] ?? 0) > 0) {
            $q = $pdo->prepare("SELECT c.phone FROM crm_segment_members m JOIN crm_customers c ON c.id=m.customer_id AND c.tenant_id=? WHERE m.segment_id=? AND (m.tenant_id=? OR m.tenant_id IS NULL) AND c.phone IS NOT NULL AND c.phone<>''");
            $q->execute([$tenant, (int)$camp['segment_id'], $tenant]);
        } else {
            $q = $pdo->prepare("SELECT phone FROM crm_customers WHERE tenant_id=? AND phone IS NOT NULL AND phone<>''");
            $q->execute([$tenant]);
        }
        $numbers = array_column($q->fetchAll(PDO::FETCH_ASSOC), 'phone');

        $cfg = null;
        if ($plan !== 'demo') {
            $s = $pdo->prepare("SELECT app_key,secret_key,sender_no FROM sms_settings WHERE tenant_id=? AND is_active=1");
            $s->execute([$tenant]);
            $cfg = $s->fetch(PDO::FETCH_ASSOC);
            if ($cfg && !empty($cfg['secret_key'])) $cfg['secret_key'] = \Genie\Crypto::decrypt((string)$cfg['secret_key']);
            if (!$cfg) return TemplateResponder::respond($res->withStatus(422), ['ok'=>false,'error'=>'SMS 발신 설정이 없습니다. 설정에서 발신번호·인증키를 먼저 등록하세요.','sent'=>0]);
        }
        if (!$numbers) return TemplateResponder::respond($res->withStatus(422), ['ok'=>false,'error'=>'발송 대상(세그먼트 고객 전화번호)이 없습니다.','sent'=>0]);

        $freqCfg = CRM::commsFreqConfig($pdo, $tenant);
        // [283차 P0] 캠페인 토픽 → 통합 게이트 입력(선호센터 토픽 옵트아웃 실강제). 미지정=빈배열=무회귀.
        //   ★STO(개인 예측 발송시각)는 SMS 캠페인에 노출하지 않는다 — SMS 는 큐/워커(cron 드레인)가 없어 defer 시
        //     메시지가 영구 미발송(무음 유실)된다. STO 는 워커가 있는 이메일 캠페인·저니·옴니에서만 제공(정직).
        $sendOpt = CRM::sendOptions($camp['topic'] ?? null, false);
        $sent = $failed = $capped = $optout = $quiet = 0;
        foreach (array_slice($numbers, 0, 500) as $to) {
            $to = preg_replace('/\D/', '', (string)$to);
            if (strlen($to) < 8) continue;
            $cid = self::customerIdByPhone($pdo, $tenant, $to);
            // [현 차수 동의센터 SSOT] 통합 발송 게이트 — SMS 채널 옵트아웃/조용시간 단일소스(crm_channel_prefs). cid=0이면 fail-open. fail-open on error.
            // [R4 라벨교정] 게이트 거부사유별 정확 집계 — 빈도=capped·조용시간=quiet·그 외(옵트아웃/suppression)만 opted_out.
            $g = CRM::isMarketingSendAllowed($tenant, $cid, 'sms', ['phone'=>$to] + $sendOpt);
            if (!($g['allowed'] ?? false)) {
                $rc = (string)($g['reason'] ?? '');
                if (strpos($rc, 'freq') !== false) { $capped++; }
                elseif (strpos($rc, 'quiet') !== false) { $quiet++; }
                else { $optout++; }
                continue;
            }
            if ($cid > 0 && CRM::isFrequencyCapped($pdo, $tenant, $cid, $freqCfg['cap'], $freqCfg['window'])) { $capped++; continue; }
            if ($plan === 'demo') {
                $status = rand(0, 9) < 95 ? 'delivered' : 'failed';
            } else {
                $r = self::sendSms($cfg['app_key'],$cfg['secret_key'],$cfg['sender_no'],$to,$message,$type);
                $status = $r['ok'] ? 'sent' : 'failed';
            }
            $pdo->prepare("INSERT INTO sms_messages(tenant_id,msg_type,recipient,body,status,sent_at,created_at) VALUES(?,?,?,?,?,?,?)")
                ->execute([$tenant,$type,$to,$message,$status,$now,$now]);
            in_array($status, ['sent','delivered'], true) ? $sent++ : $failed++;
            if ($status === 'sent') { try { Attribution::recordOwnedTouch($pdo, $tenant, 'sms', null, $to, 'sms'); } catch (\Throwable $e) {} }
            if ($cid > 0 && in_array($status, ['sent','delivered'], true)) {
                try { $pdo->prepare("INSERT INTO crm_activities (tenant_id, customer_id, type, channel, data, created_at) VALUES (?,?,'sms_sent','sms',?,?)")
                    ->execute([$tenant, $cid, json_encode(['campaign_id'=>$id], JSON_UNESCAPED_UNICODE), $now]); } catch (\Throwable $e) {}
            }
        }
        $pdo->prepare("UPDATE sms_campaigns SET status='sent', sent_count=?, updated_at=? WHERE id=? AND tenant_id=?")
            ->execute([$sent, $now, $id, $tenant]);
        return TemplateResponder::respond($res, ['ok'=>true,'id'=>$id,'status'=>'sent','sent'=>$sent,'failed'=>$failed,'capped'=>$capped,'quiet_deferred'=>$quiet,'opted_out'=>$optout,'total'=>$sent+$failed,'topic'=>($camp['topic'] ?? null)]);
    }

    // POST /api/sms/settings
    public static function saveSettings(Request $req, Response $res, array $args): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $pdo    = Db::pdo();
        $tenant = self::tenant($req);
        $body   = (array)($req->getParsedBody() ?? []);

        $provider  = $body['provider'] ?? 'nhn';
        $appKey    = trim((string)($body['app_key'] ?? ''));
        $secretKey = trim((string)($body['secret_key'] ?? ''));
        $senderNo  = trim((string)($body['sender_no'] ?? ''));

        if (!$appKey || !$secretKey) {
            return TemplateResponder::respond($res->withStatus(422), ['error' => 'app_key and secret_key required']);
        }

        // 연결 테스트 (잔액 조회)
        $testResult = self::testConnection($provider, $appKey, $secretKey);
        $now = gmdate('c');

        // 191차: SQLite `ON CONFLICT` → 드라이버별 upsert(MySQL=ON DUPLICATE KEY UPDATE).
        $cols = "tenant_id,provider,app_key,secret_key,sender_no,test_status,updated_at";
        $vals = [$tenant,$provider,$appKey,($secretKey === '' ? '' : \Genie\Crypto::encrypt($secretKey)),$senderNo,$testResult['ok']?'ok':'error',$now]; // 209차 P1: secret-at-rest
        if (self::isMysql($pdo)) {
            $pdo->prepare("INSERT INTO sms_settings($cols) VALUES(?,?,?,?,?,?,?)
                ON DUPLICATE KEY UPDATE provider=VALUES(provider),app_key=VALUES(app_key),secret_key=VALUES(secret_key),
                sender_no=VALUES(sender_no),test_status=VALUES(test_status),updated_at=VALUES(updated_at)")->execute($vals);
        } else {
            $pdo->prepare("INSERT INTO sms_settings($cols) VALUES(?,?,?,?,?,?,?)
                ON CONFLICT(tenant_id) DO UPDATE SET provider=excluded.provider,app_key=excluded.app_key,
                secret_key=excluded.secret_key,sender_no=excluded.sender_no,test_status=excluded.test_status,updated_at=excluded.updated_at")->execute($vals);
        }

        return TemplateResponder::respond($res, [
            'ok'      => $testResult['ok'],
            'status'  => $testResult['ok'] ? 'connected' : 'error',
            'message' => $testResult['message'],
            'balance' => $testResult['balance'] ?? null,
        ]);
    }

    // GET /api/sms/settings
    public static function getSettings(Request $req, Response $res, array $args): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $pdo    = Db::pdo();
        $tenant = self::tenant($req);
        $plan   = self::plan($req);

        $stmt = $pdo->prepare("SELECT id,tenant_id,provider,sender_no,test_status,updated_at FROM sms_settings WHERE tenant_id=?");
        $stmt->execute([$tenant]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        $stats = ['sent'=>0,'delivered'=>0,'failed'=>0];
        $s2 = $pdo->prepare("SELECT status,COUNT(*) as cnt FROM sms_messages WHERE tenant_id=? GROUP BY status");
        $s2->execute([$tenant]);
        foreach ($s2->fetchAll(PDO::FETCH_ASSOC) as $r) {
            $stats[$r['status']] = (int)$r['cnt'];
        }
        // 191차: 빈 통계에 가짜값(324/318/6) 주입 제거 → 정직한 0(가짜 KPI 금지, 188차).

        return TemplateResponder::respond($res, ['ok'=>true, 'plan'=>$plan, 'settings'=>$row, 'stats'=>$stats]);
    }

    // POST /api/sms/send
    public static function send(Request $req, Response $res, array $args): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $pdo    = Db::pdo();
        $tenant = self::tenant($req);
        $plan   = self::plan($req);
        $body   = (array)($req->getParsedBody() ?? []);

        $to      = preg_replace('/\D/', '', trim((string)($body['to'] ?? '')));
        $message = trim((string)($body['message'] ?? ''));
        $type    = strlen($message) > 90 ? 'LMS' : 'SMS';

        if (!$to || !$message) return TemplateResponder::respond($res->withStatus(422), ['error'=>'to and message required']);

        $now = gmdate('c');

        if (false /*was demo*/) {
            $pdo->prepare("INSERT INTO sms_messages(tenant_id,msg_type,recipient,body,status,sent_at,created_at) VALUES(?,?,?,?,?,?,?)")
                ->execute([$tenant,$type,$to,$message,'delivered',$now,$now]);
            return TemplateResponder::respond($res, ['ok'=>true,'plan'=>'demo','status'=>'delivered','msg_id'=>'demo_'.uniqid()]);
        }

        $cfg = $pdo->prepare("SELECT app_key,secret_key,sender_no FROM sms_settings WHERE tenant_id=? AND is_active=1");
        $cfg->execute([$tenant]);
        $settings = $cfg->fetch(PDO::FETCH_ASSOC);
        if (!$settings) return TemplateResponder::respond($res->withStatus(400),['error'=>'SMS not configured']);
        if (!empty($settings['secret_key'])) $settings['secret_key'] = \Genie\Crypto::decrypt((string)$settings['secret_key']); // 209차 P1: secret-at-rest

        $result = self::sendSms($settings['app_key'],$settings['secret_key'],$settings['sender_no'],$to,$message,$type);

        $pdo->prepare("INSERT INTO sms_messages(tenant_id,msg_type,recipient,body,status,msg_id,error,sent_at,created_at) VALUES(?,?,?,?,?,?,?,?,?)")
            ->execute([$tenant,$type,$to,$message,$result['ok']?'sent':'failed',$result['msg_id']??null,$result['error']??null,$now,$now]);

        return TemplateResponder::respond($res, ['ok'=>$result['ok'],'status'=>$result['ok']?'sent':'failed','msg_id'=>$result['msg_id']??null,'error'=>$result['error']??null]);
    }

    // POST /api/sms/broadcast
    public static function broadcast(Request $req, Response $res, array $args): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $pdo      = Db::pdo();
        $tenant   = self::tenant($req);
        $plan     = self::plan($req);
        $body     = (array)($req->getParsedBody() ?? []);
        $numbers  = (array)($body['numbers'] ?? []);
        $message  = trim((string)($body['message'] ?? ''));
        $type     = strlen($message) > 90 ? 'LMS' : 'SMS';
        $now      = gmdate('c');

        $cfg = null;
        if ($plan !== 'demo') {
            $s = $pdo->prepare("SELECT app_key,secret_key,sender_no FROM sms_settings WHERE tenant_id=? AND is_active=1");
            $s->execute([$tenant]);
            $cfg = $s->fetch(PDO::FETCH_ASSOC);
            if ($cfg && !empty($cfg['secret_key'])) $cfg['secret_key'] = \Genie\Crypto::decrypt((string)$cfg['secret_key']); // 209차 P1: secret-at-rest
        }

        // 189차+ 신뢰성: 운영(비데모) 발신 설정 미존재 시 가짜 랜덤 'delivered' 기록 금지 → 명시적 차단.
        if ($plan !== 'demo' && !$cfg) {
            return TemplateResponder::respond($res->withStatus(422), [
                'ok' => false,
                'error' => 'SMS 발신 설정이 없습니다. 설정에서 발신번호·인증키를 먼저 등록하세요.',
                'sent' => 0, 'failed' => 0, 'total' => 0,
            ]);
        }

        // [현 차수] 빈도캡 — crm_customers.phone 역매핑 가능 시에만 평가(best-effort, 매핑 안 되면 기존대로 발송).
        $freqCfg = CRM::commsFreqConfig($pdo, $tenant);

        $sent = $failed = 0; $capped = 0;
        foreach (array_slice($numbers, 0, 500) as $to) {
            $to = preg_replace('/\D/', '', (string)$to);
            if (strlen($to) < 8) continue;
            // [현 차수] 수신번호 → customer_id 역매핑(전화번호 정규화 후 일치). 매핑 시 빈도캡 평가 대상.
            $cid = self::customerIdByPhone($pdo, $tenant, $to);
            if ($cid > 0 && CRM::isFrequencyCapped($pdo, $tenant, $cid, $freqCfg['cap'], $freqCfg['window'])) { $capped++; continue; }
            if ($plan === 'demo') {
                $status = rand(0, 9) < 95 ? 'delivered' : 'failed'; // 데모 시뮬레이션 한정
            } else {
                $r = self::sendSms($cfg['app_key'],$cfg['secret_key'],$cfg['sender_no'],$to,$message,$type);
                $status = $r['ok'] ? 'sent' : 'failed';
            }
            $pdo->prepare("INSERT INTO sms_messages(tenant_id,msg_type,recipient,body,status,sent_at,created_at) VALUES(?,?,?,?,?,?,?)")
                ->execute([$tenant,$type,$to,$message,$status,$now,$now]);
            in_array($status, ['sent','delivered'], true) ? $sent++ : $failed++;
            // [240차 약점②] 오운드채널 어트리뷰션 — 실발송 SMS 터치(phone 해시, PII미저장). 주문 phone 매칭 시 캠페인 매출 귀속.
            if ($status === 'sent') { try { Attribution::recordOwnedTouch($pdo, $tenant, 'sms', null, $to, 'sms'); } catch (\Throwable $e) {} }
            // [현 차수] CRM 활동 기록 — 매핑된 고객만(빈도캡 카운트 대상). EmailMarketing 패턴 재사용.
            if ($cid > 0 && in_array($status, ['sent','delivered'], true)) {
                try {
                    $pdo->prepare("INSERT INTO crm_activities (tenant_id, customer_id, type, channel, data, created_at) VALUES (?,?,'sms_sent','sms',?,?)")
                        ->execute([$tenant, $cid, json_encode(['broadcast'=>true], JSON_UNESCAPED_UNICODE), $now]);
                } catch (\Throwable $e) {}
            }
        }

        return TemplateResponder::respond($res, ['ok'=>true,'sent'=>$sent,'failed'=>$failed,'capped'=>$capped,'total'=>$sent+$failed]);
    }

    // GET /api/sms/messages
    public static function messages(Request $req, Response $res, array $args): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $pdo    = Db::pdo();
        $tenant = self::tenant($req);
        $limit  = max(1, min(100, (int)(($req->getQueryParams())['limit'] ?? 50)));

        // 191차: MySQL PDO 는 LIMIT 바인드를 문자열로 처리해 구문오류(500). 검증된 정수라 인라인.
        $stmt = $pdo->prepare("SELECT * FROM sms_messages WHERE tenant_id=? ORDER BY created_at DESC LIMIT $limit");
        $stmt->execute([$tenant]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        // 191차: 빈 결과에 demoMessages(rand 전화번호) 주입 제거 → 정직한 빈 상태(188차).
        return TemplateResponder::respond($res, ['ok'=>true,'messages'=>$rows]);
    }

    // GET /api/sms/stats
    public static function stats(Request $req, Response $res, array $args): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $pdo    = Db::pdo();
        $tenant = self::tenant($req);

        $stmt = $pdo->prepare("SELECT msg_type,status,COUNT(*) as cnt FROM sms_messages WHERE tenant_id=? GROUP BY msg_type,status");
        $stmt->execute([$tenant]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // 191차: 하드코딩 monthly 예산(가짜)은 데모 전용. 운영은 실데이터 없으면 null.
        $monthly = self::plan($req) === 'demo' ? ['budget'=>500000,'spent'=>230000,'remaining'=>270000] : null;
        return TemplateResponder::respond($res, ['ok'=>true, 'stats'=>$rows, 'monthly'=>$monthly]);
    }

    // ── NHN Cloud API 호출 ───────────────────────────────────────────────
    private static function testConnection(string $provider, string $appKey, string $secretKey): array
    {
        if ($provider === 'nhn') {
            $ch = curl_init(self::NHN_API."/appKeys/{$appKey}/sender/sms");
            curl_setopt_array($ch,[CURLOPT_RETURNTRANSFER=>true,CURLOPT_TIMEOUT=>10,
                CURLOPT_HTTPHEADER=>["X-Secret-Key: {$secretKey}"]]);
            $raw  = curl_exec($ch);
            $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);
            if ($code === 200) return ['ok'=>true,'message'=>'NHN Cloud: connected'];
            if ($raw) {
                $data = json_decode($raw, true) ?? [];
                return ['ok'=>false,'message'=>$data['header']['resultMessage']??("HTTP {$code}")];
            }
        }
        return ['ok'=>true,'message'=>"{$provider}: credentials stored"];
    }

    private static function sendSms(string $appKey, string $secret, string $from, string $to, string $body, string $type): array
    {
        $payload = json_encode(['body'=>$body,'sendNo'=>$from,'recipientList'=>[['recipientNo'=>$to]]]);
        $endpoint = $type === 'LMS' ? "/appKeys/{$appKey}/sender/mms" : "/appKeys/{$appKey}/sender/sms";
        $ch = curl_init(self::NHN_API.$endpoint);
        curl_setopt_array($ch,[CURLOPT_RETURNTRANSFER=>true,CURLOPT_POST=>true,CURLOPT_POSTFIELDS=>$payload,
            CURLOPT_HTTPHEADER=>["X-Secret-Key: {$secret}","Content-Type: application/json"],CURLOPT_TIMEOUT=>15]);
        $raw  = curl_exec($ch);
        $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        if ($code === 200) {
            $data = json_decode((string)$raw, true) ?? [];
            $msgId = $data['body']['data']['sendResultList'][0]['recipientSeq'] ?? null;
            return ['ok'=>true,'msg_id'=>(string)($msgId??uniqid())];
        }
        $data = json_decode((string)$raw, true) ?? [];
        return ['ok'=>false,'error'=>$data['header']['resultMessage']??("HTTP {$code}")];
    }

    /**
     * 189차+ 플랫폼 발송 위임(NotifyEngine 등 시스템 알림용).
     *   플랫폼 NHN 설정(env GENIE_NHN_APPKEY/SECRET/SENDER)이 있을 때만 실발송.
     *   미설정 시 ['ok'=>false,'configured'=>false]로 honest 반환(가짜 발송 금지).
     * @return array{ok:bool,configured:bool,error?:string,msg_id?:string}
     */
    public static function sendPlatform(string $to, string $body): array
    {
        $appKey = (string)(getenv('GENIE_NHN_APPKEY') ?: '');
        $secret = (string)(getenv('GENIE_NHN_SECRET') ?: '');
        $from   = (string)(getenv('GENIE_NHN_SENDER') ?: '');
        $to     = preg_replace('/\D/', '', $to);
        if ($appKey === '' || $secret === '' || $from === '' || strlen((string)$to) < 8) {
            return ['ok' => false, 'configured' => ($appKey !== '' && $secret !== '' && $from !== '')];
        }
        $type = mb_strlen($body) > 90 ? 'LMS' : 'SMS';
        $r = self::sendSms($appKey, $secret, $from, $to, $body, $type);
        return ['ok' => (bool)($r['ok'] ?? false), 'configured' => true, 'error' => $r['error'] ?? null, 'msg_id' => $r['msg_id'] ?? null];
    }

    private static function demoMessages(): array
    {
        $msgs = [];
        $types = ['SMS','LMS','SMS'];
        $statuses = ['delivered','delivered','delivered','failed','sent'];
        $bodies = ['주문이 완료되었습니다','장바구니 상품을 잊으셨나요? 지금 구매하면 10% 할인!','포인트 500P 적립되었습니다','배송이 완료되었습니다','신규 할인 쿠폰이 도착했어요!'];
        foreach (range(1,10) as $i) {
            $msgs[] = ['id'=>$i,'msg_type'=>$types[$i%3],'recipient'=>'010-'.rand(1000,9999).'-'.rand(1000,9999),'body'=>$bodies[$i%5],'status'=>$statuses[$i%5],'sent_at'=>date('Y-m-d H:i:s',strtotime("-{$i} hours"))];
        }
        return $msgs;
    }
}
