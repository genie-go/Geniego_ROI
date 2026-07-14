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
    /** 수신자별 워터폴이 지원하는 채널(주소 지정형). line 은 브로드캐스트형(개인 타겟 불가)이라 캠페인 단위로 별도 처리.
     *  [283차 P2-1] ★sms 정식 편입 — deliverWaterfall(:466~)에 SMS 발송 코드가 있으면서도 이 상수와 normalizeChannels
     *    (생성:134 · 드레인:308)가 sms 를 제거해 **호출 0(도달 불가 데드코드)** 이었다. 주석(:468)이 "워터폴 SMS 편입"을
     *    주장하던 것과 코드 사실을 일치시킨다. 기존 캠페인의 저장 channels JSON 에는 sms 가 없으므로 회귀 0
     *    (sms 를 명시적으로 고른 신규 캠페인만 활성).
     *  [283차 P2-3] webpush 도 편입 — 저니/캠페인 개인 타겟 푸시가 RFC8291 암호화 페이로드로 실동작하게 됐다. */
    private const WATERFALL_CHANNELS = ['whatsapp', 'kakao', 'sms', 'email', 'push'];

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
        // [현 차수] 원자적 클레임/리스 컬럼 — 동시 cron 이중발송 방지(SELECT..FOR UPDATE SKIP LOCKED / 조건부 UPDATE 클레임).
        //   레포 관례대로 멱등 ALTER(이미 있으면 throw → 무시). MySQL TEXT DEFAULT 회피(VARCHAR).
        foreach (['claim_id', 'claimed_at'] as $col) {
            try { $pdo->exec("ALTER TABLE omni_outbox ADD COLUMN {$col} VARCHAR(64) DEFAULT NULL"); } catch (\Throwable $e) {}
        }
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
            $ex = $pdo->prepare("SELECT customer_id FROM omni_outbox WHERE campaign_id=:c AND tenant_id=:t AND status IN ('queued','processing','sent')");
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
        // [283차 P1] ★종전엔 payload 없이 호출 → 수신자에게 "새 알림이 도착했습니다" 폴백만 떴다(캠페인 제목·본문·딥링크 0).
        //   이제 캠페인 콘텐츠를 RFC8291 암호화 페이로드로 실적재한다. 토픽 옵트아웃도 게이트에 전달.
        //   ★대상 범위는 종전과 동일한 '테넌트 브로드캐스트' 유지(세그먼트 축소 금지) — customer_id 결속 구독이
        //     아직 0인 기존 테넌트에서 세그먼트 필터를 걸면 수신자가 0으로 급감하는 회귀가 생긴다.
        //     세그먼트/개인 타겟 푸시는 신규 'push' 워터폴 채널(deliverWaterfall)이 담당한다.
        $push = null;
        if (!empty($config['also_webpush'])) {
            try {
                $push = WebPush::sendToTenant($tenant, true, [
                    'payload' => [
                        'title' => (string)($config['push_title'] ?? $config['email_subject'] ?? ($camp['name'] ?? '알림')),
                        'body'  => (string)($config['push_body'] ?? $config['email_body'] ?? ($config['whatsapp_body'] ?? '')),
                        'url'   => (string)($config['push_url'] ?? '/'),
                    ],
                    'topic' => ($config['topic'] ?? null),
                ]);
            } catch (\Throwable $e) { $push = ['ok'=>false, 'note'=>$e->getMessage()]; }
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
        $queuedRemain = (int)($byStatus['queued'] ?? 0) + (int)($byStatus['processing'] ?? 0);
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
        // [283차 P2-1] sms 를 워터폴 상태 배지에 노출(정식 편입).
        foreach (['email','kakao','whatsapp','sms'] as $c) {
            $out[$c] = ['live' => self::isChannelLive($pdo, $tenant, $c), 'fallback' => ($c === 'email')];
        }
        // 웹푸시 — VAPID + 구독자 유무. [283차] customer_id 결속 구독 수(개인 타겟 가능분)를 분리 노출(정직).
        $pushSubs = 0; $pushLinked = 0;
        try { $ps = $pdo->prepare("SELECT COUNT(*) FROM push_subscription WHERE tenant_id=?"); $ps->execute([$tenant]); $pushSubs = (int)$ps->fetchColumn(); } catch (\Throwable $e) {}
        try { $pl = $pdo->prepare("SELECT COUNT(*) FROM push_subscription WHERE tenant_id=? AND customer_id>0"); $pl->execute([$tenant]); $pushLinked = (int)$pl->fetchColumn(); } catch (\Throwable $e) {}
        $out['webpush'] = ['live' => $pushSubs > 0, 'subscribers' => $pushSubs, 'targetable' => $pushLinked, 'broadcast' => true];
        return self::json($res, ['ok'=>true, 'demo'=>$demo, 'channels'=>$out]);
    }

    /** 채널 자격 등록(라이브) 여부 — email 은 Mailer graceful(미설정 시 mock) 이라 항상 도달 가능(true). */
    private static function isChannelLive(PDO $pdo, string $tenant, string $channel): bool
    {
        try {
            switch ($channel) {
                case 'email': return true;
                case 'sms':
                    // [283차 P2-1] SMS 워터폴 편입 — 플랫폼 발신(NaverSms::sendPlatform) 자격이 있어야 '라이브'(정직 배지).
                    return \Genie\NaverSms::isConfigured($pdo);
                case 'push':
                    // [283차] 웹푸시 개인 타겟 — 고객 결속 구독이 1건 이상이어야 워터폴 도달 가능.
                    $r = $pdo->prepare("SELECT 1 FROM push_subscription WHERE tenant_id=? AND customer_id>0 LIMIT 1");
                    $r->execute([$tenant]); return (bool)$r->fetchColumn();
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
            // [현 차수] 원자적 배치 클레임 — 동시 cron 이중발송 차단(FOR UPDATE SKIP LOCKED / 조건부 UPDATE).
            $rows = self::claimBatch($pdo, $tn, $batch);
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
                // [현 차수] 개인 방해금지시간(quiet-hours) → 발송 보류(재큐, attempts 미증가). 다음 cron 재시도.
                if (PreferenceCenter::isQuietNow($pdo, $tn, $uid)) {
                    self::mark($pdo, $obId, 'queued', null, 'quiet_hours_defer', $now, (int)$row['attempts']); continue;
                }
                // 빈도캡(수신자 1회) — 과발송 차단.
                if (CRM::isFrequencyCapped($pdo, $tn, $uid, (int)$freqCfg['cap'], (int)$freqCfg['window'])) {
                    self::mark($pdo, $obId, 'skipped', null, 'frequency_capped', $now); $skipped++; continue;
                }
                $r = self::deliverWaterfall($pdo, $tn, $cust, $channels, $config);
                if ($r['ok']) {
                    self::mark($pdo, $obId, 'sent', $r['channel'], $r['status'] ?? null, $now);
                    self::recordSuccess($pdo, $tn, $cid, $cust, $r['channel'], $config);
                    $sent++;
                } elseif (($r['reason'] ?? '') === 'defer') {
                    // [283차 P1] STO defer — 개인 최적시각 대기. 실패가 아니므로 attempts 미증가·재큐(3회 재시도 소진 방지).
                    self::mark($pdo, $obId, 'queued', null, 'sto_defer', $now, (int)$row['attempts']); continue;
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

    /**
     * [현 차수] 원자적 배치 클레임 — 동시 워커(cron × HTTP 인라인 드레인) 이중발송 방지.
     *   MySQL: 트랜잭션 + SELECT..FOR UPDATE SKIP LOCKED 로 잠금 후 claim_id 마킹(다른 워커는 잠긴 행 건너뜀).
     *   SQLite/구형MySQL: 조건부 UPDATE 클레임(쓰기락 직렬화 + status='queued' 가드로 원자성 확보).
     *   크래시 워커의 stale 'processing'(리스 15분 초과)은 재큐(회수)해 유실 방지.
     * @return array<int,array> 이 워커가 소유한(status='processing', claim_id 일치) 행들.
     */
    private static function claimBatch(PDO $pdo, string $tn, int $batch): array
    {
        $claimId = bin2hex(random_bytes(8));
        $now = self::now();
        // 리스 만료(15분) stale 'processing' 회수 → 재발송.
        $staleTtl = gmdate('Y-m-d H:i:s', time() - 900);
        try {
            $pdo->prepare("UPDATE omni_outbox SET status='queued', claim_id=NULL, claimed_at=NULL
                           WHERE tenant_id=:t AND status='processing' AND (claimed_at IS NULL OR claimed_at < :ttl)")
                ->execute([':t'=>$tn, ':ttl'=>$staleTtl]);
        } catch (\Throwable $e) {}

        if (self::isMysql($pdo)) {
            try {
                $pdo->beginTransaction();
                $sel = $pdo->prepare("SELECT id FROM omni_outbox WHERE tenant_id=:t AND status='queued' ORDER BY id LIMIT $batch FOR UPDATE SKIP LOCKED");
                $sel->execute([':t'=>$tn]);
                $ids = array_map('intval', $sel->fetchAll(PDO::FETCH_COLUMN) ?: []);
                if ($ids) {
                    $in = implode(',', $ids);
                    $pdo->prepare("UPDATE omni_outbox SET status='processing', claim_id=:cid, claimed_at=:now WHERE id IN ($in)")
                        ->execute([':cid'=>$claimId, ':now'=>$now]);
                }
                $pdo->commit();
            } catch (\Throwable $e) {
                if ($pdo->inTransaction()) { try { $pdo->rollBack(); } catch (\Throwable $e2) {} }
                return self::claimConditional($pdo, $tn, $batch, $claimId, $now); // SKIP LOCKED 미지원(MySQL<8) 폴백
            }
            $rowsSt = $pdo->prepare("SELECT * FROM omni_outbox WHERE tenant_id=:t AND claim_id=:cid AND status='processing' ORDER BY id");
            $rowsSt->execute([':t'=>$tn, ':cid'=>$claimId]);
            return $rowsSt->fetchAll(PDO::FETCH_ASSOC) ?: [];
        }
        return self::claimConditional($pdo, $tn, $batch, $claimId, $now); // SQLite
    }

    /** 조건부 UPDATE 클레임(SKIP LOCKED 미지원 드라이버). status='queued' 배치만 claim_id 마킹 후 소유행 로드. */
    private static function claimConditional(PDO $pdo, string $tn, int $batch, string $claimId, string $now): array
    {
        try {
            $pdo->prepare("UPDATE omni_outbox SET status='processing', claim_id=:cid, claimed_at=:now
                           WHERE id IN (SELECT id FROM omni_outbox WHERE tenant_id=:t AND status='queued' ORDER BY id LIMIT $batch)")
                ->execute([':cid'=>$claimId, ':now'=>$now, ':t'=>$tn]);
        } catch (\Throwable $e) {
            // 일부 SQLite 빌드가 UPDATE..IN(subquery+LIMIT) 를 거부 → 2단계(SELECT 후 IN 목록 + status 가드) 폴백.
            try {
                $sel = $pdo->prepare("SELECT id FROM omni_outbox WHERE tenant_id=:t AND status='queued' ORDER BY id LIMIT $batch");
                $sel->execute([':t'=>$tn]);
                $ids = array_map('intval', $sel->fetchAll(PDO::FETCH_COLUMN) ?: []);
                if ($ids) {
                    $in = implode(',', $ids);
                    $pdo->prepare("UPDATE omni_outbox SET status='processing', claim_id=:cid, claimed_at=:now WHERE id IN ($in) AND status='queued'")
                        ->execute([':cid'=>$claimId, ':now'=>$now]);
                }
            } catch (\Throwable $e2) { return []; }
        }
        $rowsSt = $pdo->prepare("SELECT * FROM omni_outbox WHERE tenant_id=:t AND claim_id=:cid AND status='processing' ORDER BY id");
        $rowsSt->execute([':t'=>$tn, ':cid'=>$claimId]);
        return $rowsSt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }

    /** 수신자별 채널 워터폴 — 도달 가능 + 자격 등록된 첫 채널로 발송. 모두 미설정/미도달 = reason 'unavailable'.
     *  [283차 P1] STO defer(개인 최적시각 대기)로 전 채널이 막히면 reason 'defer' → 워커가 드롭 없이 재큐(무유실). */
    private static function deliverWaterfall(PDO $pdo, string $tenant, array $cust, array $channels, array $config): array
    {
        $email = trim((string)($cust['email'] ?? ''));
        $phone = preg_replace('/[^0-9]/', '', (string)($cust['phone'] ?? ''));
        $name = (string)($cust['name'] ?? '고객');
        $anyAttempt = false; $lastErr = null; $stoDefer = false;
        $uid = (int)($cust['id'] ?? 0);
        // [283차 P0/P1] 캠페인 config 의 topic/sto → 통합 게이트 입력(선호센터 토픽 옵트아웃 실강제 · 개인 최적시각).
        //   omni_campaigns.config(TEXT JSON) 재사용 → 스키마 변경 0. 미지정 = 빈배열 = 무회귀.
        $sendOpt = CRM::sendOptions($config['topic'] ?? null, $config['sto'] ?? false);
        foreach ($channels as $ch) {
            // [282차 E-P2] 통합 발송게이트 SSOT 로 통일 — 종전엔 채널 옵트아웃만 봤고 RuleEngine frequency_window
            //   (관리자 설정 일/주 크로스채널 캡)을 우회해 옴니 캠페인만 과발송됐다(형제 Email/Kakao/SMS/Journey 는
            //   전부 isMarketingSendAllowed 경유). isMarketingSendAllowed = 옵트아웃+suppression+quiet+빈도캡+freq_window
            //   단일 게이트. 수신자 quiet/캡은 배치 상위(302/322/326)서 이미 통과했으므로 실질 신규 차단은 freq_window 뿐(무회귀).
            $gate = CRM::isMarketingSendAllowed($tenant, $uid, $ch, ['email' => $email] + $sendOpt);
            if (!$gate['allowed']) {
                if (CRM::isStoDefer($gate)) $stoDefer = true; // [283차 P1] 드롭 금지 — 아래에서 재큐(defer) 신호
                continue;
            }
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
            } elseif ($ch === 'sms') {
                // [현 차수 초고도화 ②] 워터폴 SMS 편입 — 기존 NaverSms::sendPlatform 재사용(중복0).
                //   기본 WATERFALL_CHANNELS 불변(sms 를 순서에 명시한 테넌트만 활성 → 회귀0).
                if ($phone === '') continue;
                $content = self::mergeName((string)($config['sms_content'] ?? $config['kakao_content'] ?? ($config['whatsapp_body'] ?? '')), $name);
                if ($content === '') continue;
                $r = \Genie\NaverSms::sendPlatform($pdo, $phone, $content);
                if (($r['mode'] ?? '') === 'unconfigured' || ($r['mode'] ?? '') === 'invalid') continue; // 미설정 → 폴백
                $anyAttempt = true;
                if (!empty($r['ok'])) return ['ok'=>true, 'channel'=>'sms', 'status'=>'sent'];
                $lastErr = $r['error'] ?? 'sms_failed';
            } elseif ($ch === 'push') {
                // [283차 P2-3] 웹푸시 개인 타겟 — customer_id 결속 구독에만 RFC8291 암호화 페이로드 발송.
                //   구독 없는 고객은 도달 불가 → 다음 채널 폴백(정직). 캠페인 단위 브로드캐스트(config.also_webpush)와 별개.
                if ($uid <= 0 || !WebPush::hasSubscription($pdo, $tenant, $uid)) continue;
                $title = (string)($config['push_title'] ?? $config['email_subject'] ?? '알림');
                $bodyTx = self::mergeName((string)($config['push_body'] ?? $config['kakao_content'] ?? ($config['whatsapp_body'] ?? '')), $name);
                if ($bodyTx === '') continue;
                // marketing=false — 동의 게이트는 위(432행)에서 이미 이 채널로 평가 완료(이중 게이트 회피).
                $r = WebPush::sendToCustomer($tenant, $uid, ['title'=>$title, 'body'=>$bodyTx, 'url'=>(string)($config['push_url'] ?? '/')], false);
                if ((int)($r['sent'] ?? 0) < 1) { $lastErr = $r['note'] ?? 'push_failed'; continue; } // 미발송 → 폴백
                $anyAttempt = true;
                return ['ok'=>true, 'channel'=>'push', 'status'=>'sent'];
            }
        }
        // [283차 P1] 전 채널이 STO defer 로만 막힌 경우 = '지금은 발송 안 함'(실패 아님) → 워커가 재큐(다음 cron 재시도).
        if (!$anyAttempt && $stoDefer) return ['ok'=>false, 'reason'=>'defer', 'error'=>'sto_defer'];
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
        // [현 차수] 처리 완료(또는 재큐) 시 클레임 해제(claim_id=NULL) — 재큐 행이 다음 cron 에 재클레임 가능하도록.
        try {
            if ($attempts === null) {
                $pdo->prepare("UPDATE omni_outbox SET status=:s, chosen_channel=:c, error=:e, sent_at=:sa, claim_id=NULL, claimed_at=NULL WHERE id=:id")
                    ->execute([':s'=>$status, ':c'=>$channel, ':e'=>$err, ':sa'=>$now, ':id'=>$id]);
            } else {
                $pdo->prepare("UPDATE omni_outbox SET status=:s, chosen_channel=:c, error=:e, sent_at=:sa, attempts=:a, claim_id=NULL, claimed_at=NULL WHERE id=:id")
                    ->execute([':s'=>$status, ':c'=>$channel, ':e'=>$err, ':sa'=>$now, ':a'=>$attempts, ':id'=>$id]);
            }
        } catch (\Throwable $e) {}
    }

    /** 발송 성공 시 CRM 활동 + 오운드채널 어트리뷰션 기록(채널별, 테넌트 스코프). */
    private static function recordSuccess(PDO $pdo, string $tenant, int $cid, array $cust, string $channel, array $config): void
    {
        $uid = (int)$cust['id']; $now = self::now();
        // [283차 P2-3] ★push 는 WebPush::sendToTenant 가 발송 성공 시 이미 crm_activities('push_sent')를 적재한다.
        //   여기서 또 넣으면 빈도캡이 1회 발송을 2건으로 세어 과차단된다 → push 만 제외(단일 기록점 유지).
        if ($channel !== 'push') {
            try {
                $pdo->prepare("INSERT INTO crm_activities (tenant_id, customer_id, type, channel, data, created_at) VALUES (:t,:uid,:ty,:ch,:d,:ca)")
                    ->execute([':t'=>$tenant, ':uid'=>$uid, ':ty'=>$channel.'_sent', ':ch'=>$channel,
                        ':d'=>json_encode(['omni_campaign_id'=>$cid]), ':ca'=>$now]);
            } catch (\Throwable $e) {}
        }
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
                status  = CASE WHEN (SELECT COUNT(*) FROM omni_outbox o WHERE o.campaign_id=omni_campaigns.id AND o.tenant_id=omni_campaigns.tenant_id AND o.status IN ('queued','processing'))=0 THEN 'sent' ELSE 'sending' END
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
