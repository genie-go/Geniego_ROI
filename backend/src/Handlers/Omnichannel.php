<?php
/**
 * Omnichannel — 옴니채널 캠페인 오케스트레이터 (255차 P1 CRM 규모/실시간/옴니채널 초고도화).
 *
 *  하나의 세그먼트를 향해 여러 채널(WhatsApp·Kakao 알림톡·Email)을 우선순위 워터폴로 발송한다.
 *  수신자별로 "도달 가능 + 자격 등록된" 첫 채널을 선택하고, 실패/미설정 시 다음 채널로 폴백한다.
 *  추가로 캠페인 단위 웹푸시(WebPush, 테넌트 구독자 전체) 동시 발송을 지원한다.
 *
 *  ▸ 규모/실시간: 발송 요청 시 동기 루프 대신 comms 아웃박스(omni_outbox)에 일괄 큐잉 후 즉시 반환.
 *    워커(omni_dispatch_cron / runOutbox)가 배치(OMNI_BATCH, 기본 500)로 드레인·실발송·재시도.
 *  ▸ 옴니채널: 채널별 send 프리미티브를 그대로 재사용(중복0) —
 *      Email   = EmailMarketing::omniSend, Kakao = KakaoChannel::sendOne,
 *      WhatsApp= WhatsApp::sendOne,         WebPush= WebPush::sendToTenant.
 *  ▸ register-then-execute: 자격증명 미등록 채널은 graceful 하게 "미설정"으로 건너뛰고 다음 채널 폴백.
 *    어떤 채널도 자격이 없으면 에러 없이 'skipped'(정직). 등록만 하면 즉시 해당 채널로 실발송.
 *  ▸ 컴플라이언스: suppression(이메일)·빈도캡(CRM)·quiet-hours(STO) 게이트를 기존 SSOT 로 적용.
 *  전부 테넌트 스코프. PII 미저장(어트리뷰션은 해시/익명 식별자).
 */
declare(strict_types=1);

namespace Genie\Handlers;

use Genie\Db;
use PDO;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;

final class Omnichannel
{
    /** 수신자별 워터폴이 지원하는 채널(주소 지정형). line/webpush 는 브로드캐스트형이라 캠페인 단위로 별도 처리. */
    private const WATERFALL_CHANNELS = ['whatsapp', 'kakao', 'email'];

    private static function db(): PDO { return Db::pdo(); }
    private static function isMysql(PDO $pdo): bool { return $pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'mysql'; }
    private static function now(): string { return gmdate('Y-m-d H:i:s'); }

    private static function tenant(Request $req): string
    {
        $t = (string)($req->getAttribute('auth_tenant') ?? '');
        if ($t === '') { $t = UserAuth::authedTenant($req) ?? ''; }
        return $t !== '' ? $t : 'demo';
    }

    private static function plan(Request $req): string
    {
        $u = UserAuth::authedUser($req);
        return $u['plan'] ?? 'demo';
    }

    private static function json(Response $res, array $data, int $status = 200): Response
    {
        $res->getBody()->write(json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
        return $res->withHeader('Content-Type', 'application/json')->withStatus($status);
    }

    private static function ensureTables(): void
    {
        $pdo = self::db();
        $isMy = self::isMysql($pdo);
        try {
            if ($isMy) {
                $pdo->exec("CREATE TABLE IF NOT EXISTS omni_campaigns (
                    id INT AUTO_INCREMENT PRIMARY KEY, tenant_id VARCHAR(100) NOT NULL,
                    name VARCHAR(255) NOT NULL, segment_id INT DEFAULT 0, channels TEXT, config TEXT,
                    status VARCHAR(30) DEFAULT 'draft', total INT DEFAULT 0, sent INT DEFAULT 0,
                    failed INT DEFAULT 0, skipped INT DEFAULT 0, created_at VARCHAR(32), sent_at VARCHAR(32),
                    KEY idx_omni_cmp_tenant (tenant_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
                $pdo->exec("CREATE TABLE IF NOT EXISTS omni_outbox (
                    id INT AUTO_INCREMENT PRIMARY KEY, tenant_id VARCHAR(100) NOT NULL,
                    campaign_id INT NOT NULL, customer_id INT NOT NULL, channels TEXT,
                    status VARCHAR(30) DEFAULT 'queued', chosen_channel VARCHAR(20), attempts INT DEFAULT 0,
                    error TEXT, created_at VARCHAR(32), sent_at VARCHAR(32),
                    KEY idx_omni_ob_drain (tenant_id, status), KEY idx_omni_ob_cmp (campaign_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
            } else {
                $pdo->exec("CREATE TABLE IF NOT EXISTS omni_campaigns (
                    id INTEGER PRIMARY KEY AUTOINCREMENT, tenant_id TEXT NOT NULL, name TEXT NOT NULL,
                    segment_id INTEGER DEFAULT 0, channels TEXT, config TEXT, status TEXT DEFAULT 'draft',
                    total INTEGER DEFAULT 0, sent INTEGER DEFAULT 0, failed INTEGER DEFAULT 0, skipped INTEGER DEFAULT 0,
                    created_at TEXT, sent_at TEXT)");
                $pdo->exec("CREATE TABLE IF NOT EXISTS omni_outbox (
                    id INTEGER PRIMARY KEY AUTOINCREMENT, tenant_id TEXT NOT NULL, campaign_id INTEGER NOT NULL,
                    customer_id INTEGER NOT NULL, channels TEXT, status TEXT DEFAULT 'queued', chosen_channel TEXT,
                    attempts INTEGER DEFAULT 0, error TEXT, created_at TEXT, sent_at TEXT)");
                $pdo->exec("CREATE INDEX IF NOT EXISTS idx_omni_ob_drain ON omni_outbox(tenant_id, status)");
                $pdo->exec("CREATE INDEX IF NOT EXISTS idx_omni_ob_cmp ON omni_outbox(campaign_id)");
            }
        } catch (\Throwable $e) { /* graceful */ }
    }

    /** 워터폴 채널 정규화 — 알 수 없는/브로드캐스트 채널 제거, 순서 보존, 중복 제거. */
    private static function normalizeChannels(array $raw): array
    {
        $out = [];
        foreach ($raw as $c) {
            $c = strtolower(trim((string)$c));
            if (in_array($c, self::WATERFALL_CHANNELS, true) && !in_array($c, $out, true)) $out[] = $c;
        }
        return $out ?: ['email']; // 최소 1채널(이메일 폴백)
    }

    /* ─── GET /v427/omni/campaigns ─── */
    public static function listCampaigns(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $pdo = self::db(); $tenant = self::tenant($req);
        $st = $pdo->prepare("SELECT oc.*, cs.name AS segment_name FROM omni_campaigns oc
            LEFT JOIN crm_segments cs ON cs.id=oc.segment_id AND cs.tenant_id=oc.tenant_id
            WHERE oc.tenant_id=:t ORDER BY oc.created_at DESC");
        $st->execute([':t'=>$tenant]);
        $rows = $st->fetchAll(PDO::FETCH_ASSOC) ?: [];
        foreach ($rows as &$r) {
            $r['channels'] = json_decode((string)($r['channels'] ?? '[]'), true) ?: [];
            $r['config'] = json_decode((string)($r['config'] ?? '{}'), true) ?: [];
        }
        return self::json($res, ['ok'=>true, 'campaigns'=>$rows]);
    }

    /* ─── POST /v427/omni/campaigns ─── body: {name, segment_id, channels[], config{}} ─── */
    public static function createCampaign(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $pdo = self::db(); $tenant = self::tenant($req);
        $b = (array)($req->getParsedBody() ?? []);
        if (empty($b['name'])) return self::json($res, ['ok'=>false, 'error'=>'name 필수'], 400);
        $channels = self::normalizeChannels((array)($b['channels'] ?? []));
        $config = (array)($b['config'] ?? []);
        $pdo->prepare("INSERT INTO omni_campaigns (tenant_id,name,segment_id,channels,config,status,created_at)
            VALUES (:t,:n,:s,:ch,:cf,'draft',:ca)")->execute([
            ':t'=>$tenant, ':n'=>substr((string)$b['name'],0,255), ':s'=>(int)($b['segment_id'] ?? 0),
            ':ch'=>json_encode($channels), ':cf'=>json_encode($config), ':ca'=>self::now(),
        ]);
        return self::json($res, ['ok'=>true, 'id'=>(int)$pdo->lastInsertId(), 'channels'=>$channels]);
    }

    /* ─── DELETE /v427/omni/campaigns/{id} ─── */
    public static function deleteCampaign(Request $req, Response $res, array $args): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $pdo = self::db(); $tenant = self::tenant($req); $id = (int)$args['id'];
        $chk = $pdo->prepare("SELECT id FROM omni_campaigns WHERE id=:id AND tenant_id=:t");
        $chk->execute([':id'=>$id, ':t'=>$tenant]);
        if (!$chk->fetch()) return self::json($res, ['ok'=>false, 'error'=>'캠페인 없음'], 404);
        $pdo->prepare("DELETE FROM omni_outbox WHERE campaign_id=:id AND tenant_id=:t")->execute([':id'=>$id, ':t'=>$tenant]);
        $pdo->prepare("DELETE FROM omni_campaigns WHERE id=:id AND tenant_id=:t")->execute([':id'=>$id, ':t'=>$tenant]);
        return self::json($res, ['ok'=>true]);
    }

    /* ─── POST /v427/omni/campaigns/{id}/send ─── 세그먼트 → 아웃박스 일괄 큐잉(즉시 반환) + 1배치 드레인 ─── */
    public static function sendCampaign(Request $req, Response $res, array $args): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $pdo = self::db(); $tenant = self::tenant($req); $cid = (int)$args['id'];
        $cmpSt = $pdo->prepare("SELECT * FROM omni_campaigns WHERE id=:id AND tenant_id=:t");
        $cmpSt->execute([':id'=>$cid, ':t'=>$tenant]);
        $camp = $cmpSt->fetch(PDO::FETCH_ASSOC);
        if (!$camp) return self::json($res, ['ok'=>false, 'error'=>'캠페인 없음'], 404);

        $channels = self::normalizeChannels(json_decode((string)($camp['channels'] ?? '[]'), true) ?: []);
        $config = json_decode((string)($camp['config'] ?? '{}'), true) ?: [];

        // 대상 고객 — 세그먼트(발송 직전 동적 멤버 최신화, best-effort) 또는 전체.
        $segId = (int)$camp['segment_id'];
        if ($segId) { CRM::refreshSegmentForSend($pdo, $tenant, $segId); }
        if ($segId) {
            $cust = $pdo->prepare("SELECT c.id FROM crm_customers c
                JOIN crm_segment_members sm ON sm.customer_id=c.id AND sm.tenant_id=c.tenant_id
                WHERE sm.segment_id=:sid AND c.tenant_id=:t");
            $cust->execute([':sid'=>$segId, ':t'=>$tenant]);
        } else {
            $cust = $pdo->prepare("SELECT id FROM crm_customers WHERE tenant_id=:t");
            $cust->execute([':t'=>$tenant]);
        }
        $ids = array_map('intval', $cust->fetchAll(PDO::FETCH_COLUMN) ?: []);
        $now = self::now();
        $chJson = json_encode($channels);

        // [255차 감사 C/B] 재발송 멱등화 — 이미 발송완료(sent)했거나 대기중(queued)인 수신자는 재적재 제외(이중발송 차단).
        //   재발송 = 신규/실패 수신자만 추가 큐잉(SaaS 표준: 같은 캠페인 중복발송 방지). 실패(failed)·건너뜀(skipped)은 재시도 허용.
        $already = [];
        try {
            $ex = $pdo->prepare("SELECT customer_id FROM omni_outbox WHERE campaign_id=:c AND tenant_id=:t AND status IN ('queued','sent')");
            $ex->execute([':c'=>$cid, ':t'=>$tenant]);
            foreach ($ex->fetchAll(PDO::FETCH_COLUMN) as $x) { $already[(int)$x] = true; }
        } catch (\Throwable $e) {}
        $newIds = array_values(array_filter($ids, fn($id) => !isset($already[(int)$id])));

        // chunk 일괄 큐잉(동기 발송 회피).
        $queued = 0;
        foreach (array_chunk($newIds, 300) as $chunk) {
            $flat = [];
            foreach ($chunk as $id) { array_push($flat, $tenant, $cid, $id, $chJson, $now); }
            try {
                $pdo->prepare("INSERT INTO omni_outbox (tenant_id,campaign_id,customer_id,channels,created_at,status)
                    VALUES " . implode(',', array_fill(0, count($chunk), "(?,?,?,?,?,'queued')")))->execute($flat);
                $queued += count($chunk);
            } catch (\Throwable $e) {}
        }

        // 캠페인 단위 웹푸시(테넌트 구독자 전체, 1회) — config.also_webpush.
        $push = null;
        if (!empty($config['also_webpush'])) {
            try { $push = WebPush::sendToTenant($tenant); } catch (\Throwable $e) { $push = ['ok'=>false, 'note'=>$e->getMessage()]; }
        }

        $pdo->prepare("UPDATE omni_campaigns SET status='sending', total=:tot, sent=0, failed=0, skipped=0, sent_at=:sa WHERE id=:id AND tenant_id=:t")
            ->execute([':tot'=>count($ids), ':sa'=>$now, ':id'=>$cid, ':t'=>$tenant]);

        // 즉시 1배치 드레인(소량 캠페인 즉각 피드백). 대량은 cron 이 잔여 배치 처리.
        $drain = self::runOutbox($tenant);

        return self::json($res, ['ok'=>true, 'mode'=>'async', 'total'=>count($ids), 'queued'=>$queued,
            'channels'=>$channels, 'webpush'=>$push, 'first_batch'=>$drain]);
    }

    /* ─── GET /v427/omni/campaigns/{id}/stats ─── 진행률(status·chosen_channel 집계) ─── */
    public static function campaignStats(Request $req, Response $res, array $args): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $pdo = self::db(); $tenant = self::tenant($req); $cid = (int)$args['id'];
        $cmp = $pdo->prepare("SELECT * FROM omni_campaigns WHERE id=:id AND tenant_id=:t");
        $cmp->execute([':id'=>$cid, ':t'=>$tenant]);
        $camp = $cmp->fetch(PDO::FETCH_ASSOC);
        if (!$camp) return self::json($res, ['ok'=>false, 'error'=>'캠페인 없음'], 404);
        $byStatus = []; $byChannel = [];
        try {
            $s1 = $pdo->prepare("SELECT status, COUNT(*) AS cnt FROM omni_outbox WHERE campaign_id=:c AND tenant_id=:t GROUP BY status");
            $s1->execute([':c'=>$cid, ':t'=>$tenant]); $byStatus = $s1->fetchAll(PDO::FETCH_KEY_PAIR) ?: [];
            $s2 = $pdo->prepare("SELECT chosen_channel, COUNT(*) AS cnt FROM omni_outbox WHERE campaign_id=:c AND tenant_id=:t AND chosen_channel IS NOT NULL AND chosen_channel<>'' GROUP BY chosen_channel");
            $s2->execute([':c'=>$cid, ':t'=>$tenant]); $byChannel = $s2->fetchAll(PDO::FETCH_KEY_PAIR) ?: [];
        } catch (\Throwable $e) {}
        $queuedRemain = (int)($byStatus['queued'] ?? 0);
        return self::json($res, ['ok'=>true, 'campaign'=>$camp, 'by_status'=>$byStatus, 'by_channel'=>$byChannel,
            'progress_done'=> ($camp['total'] > 0 ? round((1 - $queuedRemain / max(1,(int)$camp['total'])) * 100, 1) : 100.0)]);
    }

    /* ─── GET /v427/omni/channels ─── 채널별 자격 등록(라이브) 상태 — register-then-execute UI 힌트 ─── */
    public static function channelStatus(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $pdo = self::db(); $tenant = self::tenant($req); $demo = self::plan($req) === 'demo';
        $out = [];
        foreach (['email','kakao','whatsapp'] as $c) {
            $out[$c] = ['live' => self::isChannelLive($pdo, $tenant, $c), 'fallback' => ($c === 'email')];
        }
        // 웹푸시(캠페인 단위) — VAPID + 구독자 유무.
        $pushSubs = 0;
        try { $ps = $pdo->prepare("SELECT COUNT(*) FROM push_subscription WHERE tenant_id=?"); $ps->execute([$tenant]); $pushSubs = (int)$ps->fetchColumn(); } catch (\Throwable $e) {}
        $out['webpush'] = ['live' => $pushSubs > 0, 'subscribers' => $pushSubs, 'broadcast' => true];
        return self::json($res, ['ok'=>true, 'demo'=>$demo, 'channels'=>$out]);
    }

    /** 채널 자격 등록(라이브) 여부 — email 은 Mailer graceful(미설정 시 mock) 이라 항상 도달 가능(true). */
    private static function isChannelLive(PDO $pdo, string $tenant, string $channel): bool
    {
        try {
            switch ($channel) {
                case 'email': return true;
                case 'kakao':
                    // 실발송(callKakaoAPI)은 sender_key(URL)+api_key(KakaoAK 헤더) 둘 다 필요 → 둘 다 있어야 '라이브'(정직 배지).
                    $r = $pdo->prepare("SELECT mode, sender_key, api_key FROM kakao_settings WHERE tenant_id=? ORDER BY id DESC LIMIT 1");
                    $r->execute([$tenant]); $row = $r->fetch(PDO::FETCH_ASSOC) ?: [];
                    return ($row['mode'] ?? '') === 'live'
                        && trim((string)($row['sender_key'] ?? '')) !== ''
                        && trim((string)($row['api_key'] ?? '')) !== '';
                case 'whatsapp':
                    $r = $pdo->prepare("SELECT phone_number_id, access_token FROM whatsapp_settings WHERE tenant_id=? AND is_active=1");
                    $r->execute([$tenant]); $row = $r->fetch(PDO::FETCH_ASSOC) ?: [];
                    return trim((string)($row['phone_number_id'] ?? '')) !== '' && trim((string)($row['access_token'] ?? '')) !== '';
            }
        } catch (\Throwable $e) {}
        return false;
    }

    /**
     * 옴니채널 아웃박스 드레인 워커(HTTP send 인라인 + cron 공용). 테넌트별 quiet-hours 게이트 후 배치 처리.
     * @return array{sent:int,failed:int,skipped:int,tenants_deferred:int}
     */
    public static function runOutbox(?string $onlyTenant = null): array
    {
        self::ensureTables();
        $pdo = self::db();
        if ($onlyTenant !== null && $onlyTenant !== '') { $tenants = [$onlyTenant]; }
        else { $tenants = $pdo->query("SELECT DISTINCT tenant_id FROM omni_outbox WHERE status='queued'")->fetchAll(PDO::FETCH_COLUMN) ?: []; }
        $batch = max(1, (int)(getenv('OMNI_BATCH') ?: 500));
        $sent = 0; $failed = 0; $skipped = 0; $deferred = 0;
        foreach ($tenants as $tn) {
            $tn = (string)$tn;
            $freqCfg = CRM::commsFreqConfig($pdo, $tn);
            if (!CRM::commsSendAllowedNow($freqCfg)) { $deferred++; continue; } // quiet-hours → 다음 cron
            $rowsSt = $pdo->prepare("SELECT * FROM omni_outbox WHERE tenant_id=:t AND status='queued' ORDER BY id LIMIT $batch");
            $rowsSt->execute([':t'=>$tn]);
            $rows = $rowsSt->fetchAll(PDO::FETCH_ASSOC) ?: [];
            $campCache = []; $now = self::now();
            foreach ($rows as $row) {
                $obId = (int)$row['id']; $cid = (int)$row['campaign_id']; $uid = (int)$row['customer_id'];
                $channels = self::normalizeChannels(json_decode((string)($row['channels'] ?? '[]'), true) ?: []);
                // 캠페인 config(채널별 콘텐츠 참조) 캐시.
                if (!isset($campCache[$cid])) {
                    $cq = $pdo->prepare("SELECT config FROM omni_campaigns WHERE id=:id AND tenant_id=:t");
                    $cq->execute([':id'=>$cid, ':t'=>$tn]);
                    $campCache[$cid] = json_decode((string)($cq->fetchColumn() ?: '{}'), true) ?: [];
                }
                $config = $campCache[$cid];
                // 고객 로드(테넌트 스코프).
                $cs = $pdo->prepare("SELECT id, email, name, phone FROM crm_customers WHERE id=:id AND tenant_id=:t");
                $cs->execute([':id'=>$uid, ':t'=>$tn]);
                $cust = $cs->fetch(PDO::FETCH_ASSOC);
                if (!$cust) { self::mark($pdo, $obId, 'skipped', null, 'no_customer', $now); $skipped++; continue; }
                // 빈도캡(수신자 1회) — 과발송 차단.
                if (CRM::isFrequencyCapped($pdo, $tn, $uid, (int)$freqCfg['cap'], (int)$freqCfg['window'])) {
                    self::mark($pdo, $obId, 'skipped', null, 'frequency_capped', $now); $skipped++; continue;
                }
                $r = self::deliverWaterfall($pdo, $tn, $cust, $channels, $config);
                if ($r['ok']) {
                    self::mark($pdo, $obId, 'sent', $r['channel'], $r['status'] ?? null, $now);
                    self::recordSuccess($pdo, $tn, $cid, $cust, $r['channel'], $config);
                    $sent++;
                } else {
                    $att = (int)$row['attempts'] + 1;
                    if ($r['reason'] === 'unavailable') {
                        // 어떤 채널도 자격 미등록/미도달 → 재시도 무의미. skipped(정직, 에러 아님).
                        self::mark($pdo, $obId, 'skipped', null, 'no_channel_available', $now, $att); $skipped++;
                    } elseif ($att < 3) {
                        self::mark($pdo, $obId, 'queued', null, $r['error'] ?? 'retry', $now, $att); // 일시 실패 재시도
                    } else {
                        self::mark($pdo, $obId, 'failed', null, $r['error'] ?? 'failed', $now, $att); $failed++;
                    }
                }
            }
            // 캠페인 집계 갱신.
            self::rollupCampaigns($pdo, $tn);
        }
        return ['sent'=>$sent, 'failed'=>$failed, 'skipped'=>$skipped, 'tenants_deferred'=>$deferred];
    }

    /** 수신자별 채널 워터폴 — 도달 가능 + 자격 등록된 첫 채널로 발송. 모두 미설정/미도달 = reason 'unavailable'. */
    private static function deliverWaterfall(PDO $pdo, string $tenant, array $cust, array $channels, array $config): array
    {
        $email = trim((string)($cust['email'] ?? ''));
        $phone = preg_replace('/[^0-9]/', '', (string)($cust['phone'] ?? ''));
        $name = (string)($cust['name'] ?? '고객');
        $anyAttempt = false; $lastErr = null;
        foreach ($channels as $ch) {
            if ($ch === 'whatsapp') {
                if ($phone === '') continue;
                $tpl = (string)($config['whatsapp_template'] ?? '');
                $body = self::mergeName((string)($config['whatsapp_body'] ?? ''), $name);
                $r = WhatsApp::sendOne($pdo, $tenant, $phone, $tpl, $body, $tpl !== '' ? [$name] : []);
                if (($r['mode'] ?? '') === 'unconfigured' || ($r['mode'] ?? '') === 'invalid') continue; // 폴백
                $anyAttempt = true;
                if (!empty($r['ok'])) return ['ok'=>true, 'channel'=>'whatsapp', 'status'=>'sent'];
                $lastErr = $r['error'] ?? 'whatsapp_failed';
            } elseif ($ch === 'kakao') {
                if ($phone === '') continue;
                $tplCode = (string)($config['kakao_template_code'] ?? '');
                $content = self::mergeName((string)($config['kakao_content'] ?? ($config['whatsapp_body'] ?? '')), $name);
                $r = KakaoChannel::sendOne($pdo, $tenant, $phone, $tplCode, $content);
                if (($r['mode'] ?? '') === 'invalid') continue;
                if (($r['mode'] ?? '') === 'mock') {
                    // 자격 미등록(mock) → 폴백(다음 채널). 단, 데모 체험은 mock 을 성공으로 간주.
                    if (self::isChannelLive($pdo, $tenant, 'kakao')) { $anyAttempt = true; }
                    else { continue; }
                }
                if (!empty($r['ok']) && ($r['mode'] ?? '') === 'live') return ['ok'=>true, 'channel'=>'kakao', 'status'=>'sent'];
                if (!empty($r['ok']) && ($r['mode'] ?? '') === 'mock') return ['ok'=>true, 'channel'=>'kakao', 'status'=>'mock_sent'];
                $lastErr = $r['code'] ?? 'kakao_failed';
            } elseif ($ch === 'email') {
                if ($email === '') continue;
                $tplId = (int)($config['email_template_id'] ?? 0);
                [$subj, $html] = self::emailTemplate($pdo, $tenant, $tplId, $config, $name);
                $r = EmailMarketing::omniSend($pdo, $tenant, $email, $name, $subj, $html);
                if (($r['status'] ?? '') === 'suppressed') continue; // 수신거부 → 다른 채널 시도
                $anyAttempt = true;
                if (!empty($r['ok'])) return ['ok'=>true, 'channel'=>'email', 'status'=>$r['status']];
                $lastErr = 'email_failed';
            }
        }
        return ['ok'=>false, 'reason'=>($anyAttempt ? 'failed' : 'unavailable'), 'error'=>$lastErr];
    }

    /** 이메일 템플릿(subject/html) — config.email_template_id 우선, 없으면 config.email_subject/email_body 인라인. */
    private static function emailTemplate(PDO $pdo, string $tenant, int $tplId, array $config, string $name): array
    {
        if ($tplId > 0) {
            try {
                $t = $pdo->prepare("SELECT subject, html_body FROM email_templates WHERE id=:id AND tenant_id=:t");
                $t->execute([':id'=>$tplId, ':t'=>$tenant]); $row = $t->fetch(PDO::FETCH_ASSOC);
                if ($row) return [(string)$row['subject'], (string)$row['html_body']];
            } catch (\Throwable $e) {}
        }
        $subj = (string)($config['email_subject'] ?? '안내');
        $body = (string)($config['email_body'] ?? self::mergeName((string)($config['whatsapp_body'] ?? ''), $name));
        return [$subj, $body];
    }

    private static function mergeName(string $tpl, string $name): string
    {
        return str_replace(['{{name}}', '{name}'], $name, $tpl);
    }

    /** 아웃박스 행 상태 갱신. */
    private static function mark(PDO $pdo, int $id, string $status, ?string $channel, ?string $err, string $now, ?int $attempts = null): void
    {
        try {
            if ($attempts === null) {
                $pdo->prepare("UPDATE omni_outbox SET status=:s, chosen_channel=:c, error=:e, sent_at=:sa WHERE id=:id")
                    ->execute([':s'=>$status, ':c'=>$channel, ':e'=>$err, ':sa'=>$now, ':id'=>$id]);
            } else {
                $pdo->prepare("UPDATE omni_outbox SET status=:s, chosen_channel=:c, error=:e, sent_at=:sa, attempts=:a WHERE id=:id")
                    ->execute([':s'=>$status, ':c'=>$channel, ':e'=>$err, ':sa'=>$now, ':a'=>$attempts, ':id'=>$id]);
            }
        } catch (\Throwable $e) {}
    }

    /** 발송 성공 시 CRM 활동 + 오운드채널 어트리뷰션 기록(채널별, 테넌트 스코프). */
    private static function recordSuccess(PDO $pdo, string $tenant, int $cid, array $cust, string $channel, array $config): void
    {
        $uid = (int)$cust['id']; $now = self::now();
        try {
            $pdo->prepare("INSERT INTO crm_activities (tenant_id, customer_id, type, channel, data, created_at) VALUES (:t,:uid,:ty,:ch,:d,:ca)")
                ->execute([':t'=>$tenant, ':uid'=>$uid, ':ty'=>$channel.'_sent', ':ch'=>$channel,
                    ':d'=>json_encode(['omni_campaign_id'=>$cid]), ':ca'=>$now]);
        } catch (\Throwable $e) {}
        try {
            $email = ($channel === 'email') ? (string)($cust['email'] ?? '') : null;
            $phone = ($channel === 'kakao' || $channel === 'whatsapp') ? preg_replace('/[^0-9]/', '', (string)($cust['phone'] ?? '')) : null;
            Attribution::recordOwnedTouch($pdo, $tenant, $channel, $email, $phone, 'omni:'.$cid, ['campaign'=>'omni:'.$cid]);
        } catch (\Throwable $e) {}
    }

    /** 캠페인 단위 sent/failed/skipped 집계를 아웃박스에서 재계산(멱등). */
    private static function rollupCampaigns(PDO $pdo, string $tenant): void
    {
        try {
            // ★드라이버 호환: SQLite 는 UPDATE 대상에 테이블 별칭 미지원 → 상관 서브쿼리에서 전체 테이블명 사용.
            $pdo->prepare("UPDATE omni_campaigns SET
                sent    = (SELECT COUNT(*) FROM omni_outbox o WHERE o.campaign_id=omni_campaigns.id AND o.tenant_id=omni_campaigns.tenant_id AND o.status='sent'),
                failed  = (SELECT COUNT(*) FROM omni_outbox o WHERE o.campaign_id=omni_campaigns.id AND o.tenant_id=omni_campaigns.tenant_id AND o.status='failed'),
                skipped = (SELECT COUNT(*) FROM omni_outbox o WHERE o.campaign_id=omni_campaigns.id AND o.tenant_id=omni_campaigns.tenant_id AND o.status='skipped'),
                status  = CASE WHEN (SELECT COUNT(*) FROM omni_outbox o WHERE o.campaign_id=omni_campaigns.id AND o.tenant_id=omni_campaigns.tenant_id AND o.status='queued')=0 THEN 'sent' ELSE 'sending' END
                WHERE tenant_id=:t")->execute([':t'=>$tenant]);
        } catch (\Throwable $e) {}
    }

    /** CRM 고객 보유 테넌트(cron 팬아웃). */
    public static function tenantsWithOutbox(): array
    {
        try {
            $rs = self::db()->query("SELECT DISTINCT tenant_id FROM omni_outbox WHERE status='queued'");
            return array_values(array_filter(array_map('strval', $rs->fetchAll(PDO::FETCH_COLUMN) ?: []), fn($t)=>$t!==''));
        } catch (\Throwable $e) { return []; }
    }
}
