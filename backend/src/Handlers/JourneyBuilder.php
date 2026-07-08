<?php
declare(strict_types=1);
namespace Genie\Handlers;

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;
use Genie\Db;

/**
 * 고객 여정 빌더 (190차 부활 + 멀티테넌트 격리 + MySQL/SQLite 이식).
 * 189차까지 runtime-dead(Db::get). CRM 패턴 4층 부활.
 * journey* 3테이블 tenant_id + 전 쿼리 테넌트 스코핑. /api/journey public bypass(세션 self-auth).
 */
class JourneyBuilder
{
    private static function db(): \PDO { return Db::pdo(); }
    private static function isMysql(\PDO $pdo): bool { return $pdo->getAttribute(\PDO::ATTR_DRIVER_NAME) === 'mysql'; }
    private static function now(): string { return gmdate('Y-m-d H:i:s'); }
    private static function tenant(Request $req): string
    {
        $t = UserAuth::authedTenant($req);
        return ($t !== null && $t !== '') ? $t : 'demo';
    }

    private static function json(Response $res, array $data, int $status = 200): Response
    {
        $res->getBody()->write(json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
        return $res->withHeader('Content-Type', 'application/json')->withStatus($status);
    }

    private static function ensureTables(): void
    {
        $pdo = self::db();
        if (self::isMysql($pdo)) {
            $pdo->exec("CREATE TABLE IF NOT EXISTS journeys (
                id INT AUTO_INCREMENT PRIMARY KEY, tenant_id VARCHAR(100) NOT NULL DEFAULT 'demo',
                name VARCHAR(255) NOT NULL, description TEXT, trigger_type VARCHAR(50) NOT NULL DEFAULT 'manual',
                trigger_config TEXT, nodes MEDIUMTEXT, edges MEDIUMTEXT, status VARCHAR(20) DEFAULT 'draft',
                stats_entered INT DEFAULT 0, stats_completed INT DEFAULT 0, stats_revenue DOUBLE DEFAULT 0,
                created_at VARCHAR(32), updated_at VARCHAR(32), KEY idx_journeys_tenant (tenant_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
            $pdo->exec("CREATE TABLE IF NOT EXISTS journey_enrollments (
                id INT AUTO_INCREMENT PRIMARY KEY, tenant_id VARCHAR(100) NOT NULL DEFAULT 'demo',
                journey_id INT NOT NULL, customer_id INT, session_id VARCHAR(80), current_node VARCHAR(80),
                status VARCHAR(20) DEFAULT 'active', entered_at VARCHAR(32), completed_at VARCHAR(32), revenue DOUBLE DEFAULT 0,
                KEY idx_journey_enroll_jid (journey_id), KEY idx_journey_enroll_tenant (tenant_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
            $pdo->exec("CREATE TABLE IF NOT EXISTS journey_node_logs (
                id INT AUTO_INCREMENT PRIMARY KEY, tenant_id VARCHAR(100) NOT NULL DEFAULT 'demo',
                enrollment_id INT NOT NULL, journey_id INT NOT NULL, node_id VARCHAR(80) NOT NULL, node_type VARCHAR(40) NOT NULL,
                action VARCHAR(60), result TEXT, executed_at VARCHAR(32), KEY idx_journey_logs_eid (enrollment_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
            // [263차 초고도화 Track A] 메시지레벨 RL 1:1 결정(OfferFit式 contextual bandit) — 변형×고객컨텍스트버킷 Thompson.
            $pdo->exec("CREATE TABLE IF NOT EXISTS journey_decision_arm (
                id INT AUTO_INCREMENT PRIMARY KEY, tenant_id VARCHAR(100) NOT NULL DEFAULT 'demo',
                scope_key VARCHAR(120) NOT NULL, variant_id VARCHAR(80) NOT NULL, context_bucket VARCHAR(60) NOT NULL DEFAULT '_',
                successes INT DEFAULT 0, trials INT DEFAULT 0, updated_at VARCHAR(32),
                UNIQUE KEY uq_jda (tenant_id, scope_key, variant_id, context_bucket)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
            $pdo->exec("CREATE TABLE IF NOT EXISTS journey_decision_log (
                id INT AUTO_INCREMENT PRIMARY KEY, tenant_id VARCHAR(100) NOT NULL DEFAULT 'demo',
                scope_key VARCHAR(120) NOT NULL, enrollment_id INT NOT NULL, customer_id INT, variant_id VARCHAR(80) NOT NULL,
                channel VARCHAR(20), context_bucket VARCHAR(60) DEFAULT '_', rewarded INT DEFAULT 0, sent_at VARCHAR(32), reward_at VARCHAR(32),
                KEY idx_jdl_enr (enrollment_id), KEY idx_jdl_tenant (tenant_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
        } else {
            $pdo->exec("CREATE TABLE IF NOT EXISTS journeys (id INTEGER PRIMARY KEY AUTOINCREMENT, tenant_id TEXT NOT NULL DEFAULT 'demo', name TEXT NOT NULL, description TEXT, trigger_type TEXT NOT NULL DEFAULT 'manual', trigger_config TEXT DEFAULT '{}', nodes TEXT DEFAULT '[]', edges TEXT DEFAULT '[]', status TEXT DEFAULT 'draft', stats_entered INTEGER DEFAULT 0, stats_completed INTEGER DEFAULT 0, stats_revenue REAL DEFAULT 0, created_at TEXT, updated_at TEXT)");
            $pdo->exec("CREATE TABLE IF NOT EXISTS journey_enrollments (id INTEGER PRIMARY KEY AUTOINCREMENT, tenant_id TEXT NOT NULL DEFAULT 'demo', journey_id INTEGER NOT NULL, customer_id INTEGER, session_id TEXT, current_node TEXT, status TEXT DEFAULT 'active', entered_at TEXT, completed_at TEXT, revenue REAL DEFAULT 0)");
            $pdo->exec("CREATE TABLE IF NOT EXISTS journey_node_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, tenant_id TEXT NOT NULL DEFAULT 'demo', enrollment_id INTEGER NOT NULL, journey_id INTEGER NOT NULL, node_id TEXT NOT NULL, node_type TEXT NOT NULL, action TEXT, result TEXT DEFAULT '{}', executed_at TEXT)");
            $pdo->exec("CREATE INDEX IF NOT EXISTS idx_journey_enroll_jid ON journey_enrollments(journey_id)");
            $pdo->exec("CREATE INDEX IF NOT EXISTS idx_journey_logs_eid ON journey_node_logs(enrollment_id)");
            // [263차 초고도화 Track A] 메시지레벨 RL 1:1 결정(contextual bandit)
            $pdo->exec("CREATE TABLE IF NOT EXISTS journey_decision_arm (id INTEGER PRIMARY KEY AUTOINCREMENT, tenant_id TEXT NOT NULL DEFAULT 'demo', scope_key TEXT NOT NULL, variant_id TEXT NOT NULL, context_bucket TEXT NOT NULL DEFAULT '_', successes INTEGER DEFAULT 0, trials INTEGER DEFAULT 0, updated_at TEXT, UNIQUE(tenant_id, scope_key, variant_id, context_bucket))");
            $pdo->exec("CREATE TABLE IF NOT EXISTS journey_decision_log (id INTEGER PRIMARY KEY AUTOINCREMENT, tenant_id TEXT NOT NULL DEFAULT 'demo', scope_key TEXT NOT NULL, enrollment_id INTEGER NOT NULL, customer_id INTEGER, variant_id TEXT NOT NULL, channel TEXT, context_bucket TEXT DEFAULT '_', rewarded INTEGER DEFAULT 0, sent_at TEXT, reward_at TEXT)");
            $pdo->exec("CREATE INDEX IF NOT EXISTS idx_jdl_enr ON journey_decision_log(enrollment_id)");
        }
        foreach (['journeys','journey_enrollments','journey_node_logs'] as $tbl) {
            try { $pdo->exec("ALTER TABLE {$tbl} ADD COLUMN tenant_id VARCHAR(100) NOT NULL DEFAULT 'demo'"); } catch (\Throwable $e) {}
        }
        // 206차 #2: 실행러너 상태머신 컬럼(delay resume + cron 픽업).
        // [255차 심화] wait_until: 이벤트 대기 노드의 절대 타임아웃 기한(resume_at=폴링주기와 분리).
        foreach (['resume_at VARCHAR(32)', 'last_run_at VARCHAR(32)', 'converted INT DEFAULT 0', 'wait_until VARCHAR(32)'] as $col) {
            try { $pdo->exec("ALTER TABLE journey_enrollments ADD COLUMN {$col}"); } catch (\Throwable $e) {}
        }
        // [현 차수] 전환 목표(goal) 집계 컬럼.
        try { $pdo->exec("ALTER TABLE journeys ADD COLUMN stats_converted INT DEFAULT 0"); } catch (\Throwable $e) {}
        // [255차 심화] 웹훅 트리거 토큰(인바운드 이벤트→여정 진입, Braze API-trigger 정합). 멱등 ALTER.
        try { $pdo->exec("ALTER TABLE journeys ADD COLUMN webhook_token VARCHAR(64)"); } catch (\Throwable $e) {}
    }

    /* ─── GET /journey/journeys ─── 목록 ─────────────────────── */
    public static function listJourneys(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $tenant = self::tenant($req);
        $st = self::db()->prepare("
            SELECT j.*, (SELECT COUNT(*) FROM journey_enrollments WHERE journey_id=j.id AND status='active') AS active_count
            FROM journeys j WHERE j.tenant_id=:t ORDER BY j.updated_at DESC
        ");
        $st->execute([':t'=>$tenant]);
        $rows = $st->fetchAll(\PDO::FETCH_ASSOC);
        foreach ($rows as &$r) {
            $r['nodes'] = json_decode($r['nodes'] ?? '[]', true);
            $r['edges'] = json_decode($r['edges'] ?? '[]', true);
            $r['trigger_config'] = json_decode($r['trigger_config'] ?? '{}', true);
        }
        return self::json($res, ['ok' => true, 'journeys' => $rows]);
    }

    /* ─── POST /journey/journeys ─── 생성 ────────────────────── */
    public static function createJourney(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $pdo = self::db();
        $tenant = self::tenant($req);
        $b = (array)$req->getParsedBody();

        $defaultNodes = [
            ['id'=>'trigger_1', 'type'=>'trigger', 'label'=>'트리거', 'config'=>['type'=>$b['trigger_type'] ?? 'manual'], 'x'=>300, 'y'=>50],
            ['id'=>'email_1', 'type'=>'email', 'label'=>'환영 이메일', 'config'=>['template_id'=>null, 'subject'=>''], 'x'=>300, 'y'=>200],
            ['id'=>'delay_1', 'type'=>'delay', 'label'=>'3일 대기', 'config'=>['unit'=>'days', 'value'=>3], 'x'=>300, 'y'=>350],
            ['id'=>'condition_1', 'type'=>'condition', 'label'=>'이메일 클릭?', 'config'=>['field'=>'email_clicked', 'op'=>'eq', 'value'=>true], 'x'=>300, 'y'=>500],
        ];
        $defaultEdges = [['from'=>'trigger_1','to'=>'email_1'], ['from'=>'email_1','to'=>'delay_1'], ['from'=>'delay_1','to'=>'condition_1']];
        $now = self::now();

        // [255차 심화] 웹훅 트리거용 토큰 생성(인바운드 ingress URL 식별자). 생성 시 항상 발급(트리거 전환 즉시 사용).
        $whTok = bin2hex(random_bytes(16));
        $pdo->prepare("INSERT INTO journeys (tenant_id, name, description, trigger_type, trigger_config, nodes, edges, status, webhook_token, created_at, updated_at)
            VALUES (:t, :name, :desc, :ttype, :tconf, :nodes, :edges, 'draft', :wt, :ca, :ua)
        ")->execute([
            ':t'=>$tenant, ':name'=>$b['name'] ?? '새 여정', ':desc'=>$b['description'] ?? '', ':ttype'=>$b['trigger_type'] ?? 'manual',
            ':tconf'=>json_encode($b['trigger_config'] ?? []), ':nodes'=>json_encode($b['nodes'] ?? $defaultNodes), ':edges'=>json_encode($b['edges'] ?? $defaultEdges), ':wt'=>$whTok, ':ca'=>$now, ':ua'=>$now,
        ]);
        return self::json($res, ['ok' => true, 'id' => (int)$pdo->lastInsertId(), 'webhook_token' => $whTok]);
    }

    /* ─── PUT /journey/journeys/{id} ─── 업데이트 ──────────── */
    public static function updateJourney(Request $req, Response $res, array $args): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $pdo = self::db();
        $tenant = self::tenant($req);
        $b = (array)$req->getParsedBody();
        $id = (int)$args['id'];

        $fields = []; $bind = [':id'=>$id, ':t'=>$tenant];
        if (isset($b['name']))           { $fields[] = "name=:name"; $bind[':name'] = $b['name']; }
        if (isset($b['description']))    { $fields[] = "description=:desc"; $bind[':desc'] = $b['description']; }
        if (isset($b['nodes']))          { $fields[] = "nodes=:nodes"; $bind[':nodes'] = json_encode($b['nodes']); }
        if (isset($b['edges']))          { $fields[] = "edges=:edges"; $bind[':edges'] = json_encode($b['edges']); }
        if (isset($b['trigger_type']))   { $fields[] = "trigger_type=:ttype"; $bind[':ttype'] = $b['trigger_type'];
            // [255차 심화] 웹훅 트리거 전환 시 토큰 없으면 발급(기존 여정 호환).
            if ($b['trigger_type'] === 'webhook') {
                try { $cur = $pdo->prepare("SELECT webhook_token FROM journeys WHERE id=:id AND tenant_id=:t"); $cur->execute([':id'=>$id, ':t'=>$tenant]);
                    if (trim((string)($cur->fetchColumn() ?: '')) === '') { $fields[] = "webhook_token=:wt"; $bind[':wt'] = bin2hex(random_bytes(16)); } } catch (\Throwable $e) {}
            }
        }
        if (isset($b['trigger_config'])) { $fields[] = "trigger_config=:tconf"; $bind[':tconf'] = json_encode($b['trigger_config']); }
        if (isset($b['status']))         { $fields[] = "status=:status"; $bind[':status'] = $b['status']; }
        $fields[] = "updated_at=:ua"; $bind[':ua'] = self::now();

        $stmt = $pdo->prepare("UPDATE journeys SET " . implode(', ', $fields) . " WHERE id=:id AND tenant_id=:t");
        $stmt->execute($bind);
        if ($stmt->rowCount() === 0) return self::json($res, ['ok'=>false,'error'=>'없음'], 404);
        return self::json($res, ['ok' => true]);
    }

    /* ─── DELETE /journey/journeys/{id} ─── 삭제 ─────────────── */
    public static function deleteJourney(Request $req, Response $res, array $args): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $tenant = self::tenant($req);
        self::db()->prepare("DELETE FROM journeys WHERE id=:id AND tenant_id=:t")->execute([':id'=>(int)$args['id'], ':t'=>$tenant]);
        return self::json($res, ['ok' => true]);
    }

    /* ─── POST /journey/journeys/{id}/enroll ─── 고객 등록 ──── */
    public static function enrollCustomer(Request $req, Response $res, array $args): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $pdo = self::db();
        $tenant = self::tenant($req);
        $b = (array)$req->getParsedBody();
        $jid = (int)$args['id'];

        $journey = $pdo->prepare("SELECT * FROM journeys WHERE id=:id AND tenant_id=:t AND status='active'");
        $journey->execute([':id'=>$jid, ':t'=>$tenant]);
        $j = $journey->fetch(\PDO::FETCH_ASSOC);
        if (!$j) return self::json($res, ['ok' => false, 'error' => '활성 여정 없음'], 404);

        $nodes = json_decode($j['nodes'] ?? '[]', true);
        $startNode = $nodes[0]['id'] ?? 'trigger_1';
        $now = self::now();

        $pdo->prepare("INSERT INTO journey_enrollments (tenant_id, journey_id, customer_id, session_id, current_node, status, entered_at)
            VALUES (:t, :jid, :cid, :sid, :node, 'active', :ea)
        ")->execute([
            ':t'=>$tenant, ':jid'=>$jid, ':cid'=>(int)($b['customer_id'] ?? 0) ?: null, ':sid'=>$b['session_id'] ?? null, ':node'=>$startNode, ':ea'=>$now,
        ]);
        $enrollId = (int)$pdo->lastInsertId();
        $pdo->prepare("UPDATE journeys SET stats_entered=stats_entered+1 WHERE id=:id AND tenant_id=:t")->execute([':id'=>$jid, ':t'=>$tenant]);

        // 206차 #2: 등록 즉시 실행 엔진으로 첫 delay/완료까지 진행(엣지 순회·실발송).
        $enr = ['id'=>$enrollId, 'journey_id'=>$jid, 'current_node'=>$startNode, 'status'=>'active',
                'customer_id'=>(int)($b['customer_id'] ?? 0), 'session_id'=>$b['session_id'] ?? null,
                'resume_at'=>null, 'revenue'=>0];
        $run = self::advanceEnrollment($pdo, $tenant, $enr, $j);
        return self::json($res, ['ok' => true, 'enrollment_id' => $enrollId, 'run' => $run]);
    }

    /* ─── POST /journey/journeys/{id}/launch ─── 여정 활성화 ── */
    public static function launchJourney(Request $req, Response $res, array $args): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $tenant = self::tenant($req);
        $stmt = self::db()->prepare("UPDATE journeys SET status='active', updated_at=:ua WHERE id=:id AND tenant_id=:t");
        $stmt->execute([':ua'=>self::now(), ':id'=>(int)$args['id'], ':t'=>$tenant]);
        if ($stmt->rowCount() === 0) return self::json($res, ['ok'=>false,'error'=>'없음'], 404);
        return self::json($res, ['ok' => true, 'status' => 'active']);
    }

    /* ─── GET /journey/journeys/{id}/stats ─── 성과 ─────────── */
    public static function journeyStats(Request $req, Response $res, array $args): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $pdo = self::db();
        $tenant = self::tenant($req);
        $id = (int)$args['id'];

        $journey = $pdo->prepare("SELECT * FROM journeys WHERE id=:id AND tenant_id=:t");
        $journey->execute([':id'=>$id, ':t'=>$tenant]);
        $j = $journey->fetch(\PDO::FETCH_ASSOC);
        if (!$j) return self::json($res, ['ok' => false, 'error' => '없음'], 404);

        $es = $pdo->prepare("SELECT status, COUNT(*) AS cnt FROM journey_enrollments WHERE journey_id=:id AND tenant_id=:t GROUP BY status");
        $es->execute([':id'=>$id, ':t'=>$tenant]);
        $byStatus = [];
        foreach ($es->fetchAll(\PDO::FETCH_ASSOC) as $r) { $byStatus[$r['status']] = (int)$r['cnt']; }

        $ns = $pdo->prepare("SELECT node_id, node_type, COUNT(*) AS executions FROM journey_node_logs WHERE journey_id=:id AND tenant_id=:t GROUP BY node_id, node_type ORDER BY executions DESC");
        $ns->execute([':id'=>$id, ':t'=>$tenant]);
        $nodes = $ns->fetchAll(\PDO::FETCH_ASSOC);

        return self::json($res, ['ok'=>true, 'journey'=>$j, 'by_status'=>$byStatus, 'node_stats'=>$nodes]);
    }

    /* ════════════════════════════════════════════════════════════════════
     * 206차 #2 — 여정 실행 엔진(상태머신)
     *   enroll 즉시 + journey_cron.php 주기 호출. 엣지 순회 → 노드별 실행
     *   (email=Mailer·kakao=KakaoChannel·sms=NaverSms 실발송, condition=분기,
     *    delay=resume_at 설정 후 중단) → 다음 delay/완료까지 진행.
     * ════════════════════════════════════════════════════════════════════ */

    /**
     * [현 차수] 이벤트 기반 자동 진입 — 트리거 발화 시(회원가입/구매 등) 해당 트리거의 활성 여정에 고객 자동 등록.
     *   타 핸들러에서 호출: CRM::createCustomer→'signup', 구매 적재→'purchase'. 중복 진입 차단 + 즉시 advance.
     *   ★ 이것이 없으면 여정을 launch 해도 진입 멤버가 0이라 엔진이 실데이터로 가동되지 않는다(최대 갭 해소).
     *   반환: 신규 등록된 여정 수. best-effort(예외 삼킴 — 호출측 트랜잭션 보호).
     */
    public static function enrollByTrigger(\PDO $pdo, string $tenant, string $triggerType, int $customerId, array $ctx = []): int
    {
        if ($customerId <= 0 || $triggerType === '' || $tenant === '') return 0;
        try { self::ensureTables(); } catch (\Throwable $e) { return 0; }
        $journeys = [];
        try {
            $st = $pdo->prepare("SELECT * FROM journeys WHERE tenant_id=:t AND status='active' AND trigger_type=:tt");
            $st->execute([':t'=>$tenant, ':tt'=>$triggerType]);
            $journeys = $st->fetchAll(\PDO::FETCH_ASSOC);
        } catch (\Throwable $e) { return 0; }
        $n = 0;
        foreach ($journeys as $j) { if (self::enrollOne($pdo, $tenant, $j, $customerId, $ctx)) $n++; }
        return $n;
    }

    /** 단일 고객을 단일 여정에 등록 + 즉시 advance. 진행중(active/waiting) 중복 차단. 반환: 신규등록 여부. */
    private static function enrollOne(\PDO $pdo, string $tenant, array $j, int $customerId, array $ctx = []): bool
    {
        try {
            $dup = $pdo->prepare("SELECT 1 FROM journey_enrollments WHERE tenant_id=:t AND journey_id=:j AND customer_id=:c AND status IN ('active','waiting') LIMIT 1");
            $dup->execute([':t'=>$tenant, ':j'=>(int)$j['id'], ':c'=>$customerId]);
            if ($dup->fetchColumn()) return false;
            $nodes = json_decode($j['nodes'] ?? '[]', true) ?: [];
            $start = $nodes[0]['id'] ?? 'trigger_1';
            $now = self::now();
            $rev = (float)($ctx['revenue'] ?? 0);
            $pdo->prepare("INSERT INTO journey_enrollments (tenant_id, journey_id, customer_id, current_node, status, entered_at, revenue) VALUES (:t,:j,:c,:n,'active',:e,:rev)")
                ->execute([':t'=>$tenant, ':j'=>(int)$j['id'], ':c'=>$customerId, ':n'=>$start, ':e'=>$now, ':rev'=>$rev]);
            $eid = (int)$pdo->lastInsertId();
            $pdo->prepare("UPDATE journeys SET stats_entered=stats_entered+1 WHERE id=:id AND tenant_id=:t")->execute([':id'=>(int)$j['id'], ':t'=>$tenant]);
            $enr = ['id'=>$eid, 'journey_id'=>(int)$j['id'], 'current_node'=>$start, 'status'=>'active', 'customer_id'=>$customerId, 'session_id'=>null, 'resume_at'=>null, 'revenue'=>$rev];
            self::advanceEnrollment($pdo, $tenant, $enr, $j);
            return true;
        } catch (\Throwable $e) { return false; }
    }

    /**
     * [현 차수] 트리거 detector — churn(휴면)·segment(세그먼트 진입)·abandon(장바구니 이탈) 자동 진입.
     *   journey_cron 주기 호출. signup/purchase 는 이벤트 훅(CRM/ChannelSync)으로 즉시 진입하나,
     *   churn/segment/abandon 은 "상태"라 주기 평가 필요.
     *   - churn: 마지막 구매가 trigger_config.churn_days(기본 60)일 이전 + 계정도 그 이전 생성 + 미진행 → 진입
     *   - segment: trigger_config.segment_id(또는 segment 이름) 의 crm_segment_members 중 미진행 → 진입
     *   - abandon: [212차 #3] Pixel add_to_cart 이벤트(email_hash 로 CRM 고객 연결) 후 구매 없음 → 진입.
     *       trigger_config.abandon_hours(기본 1, 최소 경과시간=구매 기회 부여) / abandon_lookback_days(기본 7, 최대 소급).
     */
    public static function runTriggerDetectors(?string $onlyTenant = null, int $perJourney = 200): array
    {
        try { self::ensureTables(); } catch (\Throwable $e) { return ['ok'=>false]; }
        $pdo = self::db();
        $enrolled = 0; $scanned = 0; $journeys = [];
        $sql = "SELECT * FROM journeys WHERE status='active' AND trigger_type IN ('churn','segment','abandon')";
        $bind = [];
        if ($onlyTenant !== null && $onlyTenant !== '') { $sql .= " AND tenant_id=:t"; $bind[':t'] = $onlyTenant; }
        try { $st = $pdo->prepare($sql); $st->execute($bind); $journeys = $st->fetchAll(\PDO::FETCH_ASSOC); }
        catch (\Throwable $e) { return ['ok'=>false]; }

        foreach ($journeys as $j) {
            $tenant = (string)$j['tenant_id'];
            $jid = (int)$j['id'];
            $cfg = json_decode((string)($j['trigger_config'] ?? '{}'), true) ?: [];
            $cands = [];
            try {
                if ($j['trigger_type'] === 'churn') {
                    $days  = (int)($cfg['churn_days'] ?? 60);
                    $since = gmdate('Y-m-d H:i:s', time() - max(1, $days) * 86400);
                    $q = $pdo->prepare("SELECT c.id FROM crm_customers c
                        WHERE c.tenant_id=:t AND c.created_at < :since
                          AND NOT EXISTS (SELECT 1 FROM crm_activities a WHERE a.tenant_id=:t AND a.customer_id=c.id AND a.type='purchase' AND a.created_at >= :since)
                          AND NOT EXISTS (SELECT 1 FROM journey_enrollments e WHERE e.tenant_id=:t AND e.journey_id=:j AND e.customer_id=c.id AND e.status IN ('active','waiting'))
                        LIMIT :lim");
                    $q->bindValue(':t', $tenant); $q->bindValue(':since', $since); $q->bindValue(':j', $jid, \PDO::PARAM_INT); $q->bindValue(':lim', $perJourney, \PDO::PARAM_INT);
                    $q->execute(); $cands = $q->fetchAll(\PDO::FETCH_COLUMN);
                } elseif ($j['trigger_type'] === 'abandon') {
                    // [212차 #3] 장바구니 이탈 — Pixel add_to_cart(email_hash) 후 미구매 고객 진입.
                    //   ① 기간내 add_to_cart 의 email_hash 집합(이후 동일 hash purchase 이벤트 없음)
                    //   ② 테넌트 고객 중 sha256(lower(email)) 가 이탈집합에 속하고 미진행 → 후보(driver-portable PHP 매칭)
                    $hours        = max(1, (int)($cfg['abandon_hours'] ?? 1));
                    $lookbackDays = max(1, (int)($cfg['abandon_lookback_days'] ?? 7));
                    $ceil  = gmdate('Y-m-d H:i:s', time() - $hours * 3600);        // 최소 경과(구매 기회 부여)
                    $floor = gmdate('Y-m-d H:i:s', time() - $lookbackDays * 86400); // 최대 소급
                    $cartQ = $pdo->prepare("SELECT DISTINCT pe.email_hash FROM pixel_events pe
                        WHERE pe.tenant_id=:t AND pe.event_name='add_to_cart' AND pe.email_hash IS NOT NULL AND pe.email_hash<>''
                          AND pe.created_at BETWEEN :floor AND :ceil
                          AND NOT EXISTS (SELECT 1 FROM pixel_events p2 WHERE p2.tenant_id=:t AND p2.email_hash=pe.email_hash AND p2.event_name='purchase' AND p2.created_at >= pe.created_at)
                        LIMIT 2000");
                    $cartQ->execute([':t'=>$tenant, ':floor'=>$floor, ':ceil'=>$ceil]);
                    $abHashes = array_flip($cartQ->fetchAll(\PDO::FETCH_COLUMN));
                    if ($abHashes) {
                        $cq = $pdo->prepare("SELECT c.id, c.email FROM crm_customers c
                            WHERE c.tenant_id=:t AND c.email IS NOT NULL AND c.email<>''
                              AND NOT EXISTS (SELECT 1 FROM journey_enrollments e WHERE e.tenant_id=:t AND e.journey_id=:j AND e.customer_id=c.id AND e.status IN ('active','waiting'))");
                        $cq->bindValue(':t', $tenant); $cq->bindValue(':j', $jid, \PDO::PARAM_INT); $cq->execute();
                        while (count($cands) < $perJourney && ($row = $cq->fetch(\PDO::FETCH_ASSOC))) {
                            $h = hash('sha256', strtolower(trim((string)$row['email'])));
                            if (isset($abHashes[$h])) $cands[] = (int)$row['id'];
                        }
                    }
                } else { // segment
                    $sid = (int)($cfg['segment_id'] ?? 0);
                    if ($sid <= 0 && !empty($cfg['segment'])) {
                        $sr = $pdo->prepare("SELECT id FROM crm_segments WHERE tenant_id=:t AND name=:n LIMIT 1");
                        $sr->execute([':t'=>$tenant, ':n'=>(string)$cfg['segment']]);
                        $sid = (int)($sr->fetchColumn() ?: 0);
                    }
                    if ($sid > 0) {
                        $q = $pdo->prepare("SELECT sm.customer_id FROM crm_segment_members sm
                            WHERE sm.tenant_id=:t AND sm.segment_id=:sid
                              AND NOT EXISTS (SELECT 1 FROM journey_enrollments e WHERE e.tenant_id=:t AND e.journey_id=:j AND e.customer_id=sm.customer_id AND e.status IN ('active','waiting'))
                            LIMIT :lim");
                        $q->bindValue(':t', $tenant); $q->bindValue(':sid', $sid, \PDO::PARAM_INT); $q->bindValue(':j', $jid, \PDO::PARAM_INT); $q->bindValue(':lim', $perJourney, \PDO::PARAM_INT);
                        $q->execute(); $cands = $q->fetchAll(\PDO::FETCH_COLUMN);
                    }
                }
            } catch (\Throwable $e) { continue; }
            foreach ($cands as $cid) { $scanned++; if (self::enrollOne($pdo, $tenant, $j, (int)$cid)) $enrolled++; }
        }
        return ['ok'=>true, 'journeys'=>count($journeys), 'scanned'=>$scanned, 'enrolled'=>$enrolled];
    }

    /** 주기 실행 진입점 — journey_cron.php 호출. resume 시각 도래한 waiting 등록건 진행. */
    public static function runDue(?string $onlyTenant = null, int $limit = 300): array
    {
        self::ensureTables();
        $pdo = self::db();
        $now = self::now();
        $sql = "SELECT e.*, j.nodes AS j_nodes, j.edges AS j_edges
                  FROM journey_enrollments e
                  JOIN journeys j ON j.id = e.journey_id AND j.tenant_id = e.tenant_id
                 WHERE e.status = 'waiting' AND e.resume_at IS NOT NULL AND e.resume_at <= :now";
        $bind = [':now' => $now];
        if ($onlyTenant !== null && $onlyTenant !== '') { $sql .= " AND e.tenant_id = :t"; $bind[':t'] = $onlyTenant; }
        $sql .= " ORDER BY e.id ASC LIMIT " . max(1, min(2000, $limit));
        $st = $pdo->prepare($sql);
        $st->execute($bind);
        $rows = $st->fetchAll(\PDO::FETCH_ASSOC);

        $processed = 0; $completed = 0; $waiting = 0;
        foreach ($rows as $r) {
            $journey = ['id' => (int)$r['journey_id'], 'nodes' => $r['j_nodes'], 'edges' => $r['j_edges']];
            try {
                $res = self::advanceEnrollment($pdo, (string)$r['tenant_id'], $r, $journey);
                $processed++;
                if (($res['status'] ?? '') === 'completed') $completed++;
                elseif (($res['status'] ?? '') === 'waiting') $waiting++;
            } catch (\Throwable $e) { /* 단일 등록건 실패가 전체 배치를 막지 않게 */ }
        }
        return ['ok' => true, 'scanned' => count($rows), 'processed' => $processed, 'completed' => $completed, 'waiting' => $waiting];
    }

    /** 단일 등록건을 다음 delay(중단) 또는 완료까지 진행. */
    private static function advanceEnrollment(\PDO $pdo, string $tenant, array $enr, array $journey): array
    {
        $nodes = json_decode($journey['nodes'] ?? '[]', true) ?: [];
        $edges = json_decode($journey['edges'] ?? '[]', true) ?: [];
        $jid      = (int)($journey['id'] ?? $enr['journey_id'] ?? 0);
        $enrollId = (int)$enr['id'];
        $nodeId   = (string)($enr['current_node'] ?? '');
        $status   = (string)($enr['status'] ?? 'active');
        $now      = self::now();
        $actions  = [];
        $guard    = 0;
        $seen     = []; // 209차 P1: 순환 그래프 방지(실행노드 반복발송=이메일/SMS/Kakao 스팸·실비용 차단)

        while ($nodeId !== '' && $guard++ < 100) {
            // 한 advance 패스 내 노드 재방문 = 순환(작성자 JSON에 acyclicity 검증 없음) → 중단.
            //   delay 는 waiting 으로 early-return 하므로 정상 진행에서는 재방문 발생 안 함.
            if (isset($seen[$nodeId])) {
                self::logNode($pdo, $tenant, $enrollId, $jid, $nodeId, 'cycle', 'cycle_detected', ['node' => $nodeId]);
                break;
            }
            $seen[$nodeId] = true;
            $node = self::findNode($nodes, $nodeId);
            if (!$node) { $nodeId = ''; break; }
            $type = (string)($node['type'] ?? '');

            // ── trigger: 통과 ──
            if ($type === 'trigger') { $nodeId = self::nextNode($edges, $nodeId, null); continue; }

            // ── delay: resume 도래면 통과, 아니면 대기 설정 후 중단 ──
            if ($type === 'delay') {
                $resumeAt = (string)($enr['resume_at'] ?? '');
                if ($status === 'waiting' && $resumeAt !== '' && $resumeAt <= $now) {
                    self::logNode($pdo, $tenant, $enrollId, $jid, $nodeId, 'delay', 'delay_resumed', ['resumed_at' => $now]);
                    $status = 'active'; $enr['resume_at'] = null;
                    $nodeId = self::nextNode($edges, $nodeId, null);
                    continue;
                }
                $cfg  = (array)($node['config'] ?? []);
                $val  = (int)($cfg['value'] ?? 1);
                $unit = (string)($cfg['unit'] ?? 'days');
                $resume = gmdate('Y-m-d H:i:s', strtotime("+{$val} {$unit}") ?: time());
                $pdo->prepare("UPDATE journey_enrollments SET current_node=:n,status='waiting',resume_at=:r,last_run_at=:lr WHERE id=:id AND tenant_id=:t")
                    ->execute([':n'=>$nodeId, ':r'=>$resume, ':lr'=>$now, ':id'=>$enrollId, ':t'=>$tenant]);
                self::logNode($pdo, $tenant, $enrollId, $jid, $nodeId, 'delay', 'waiting', ['resume_at' => $resume]);
                $actions[] = ['node'=>$nodeId, 'action'=>'waiting', 'resume_at'=>$resume];
                return ['ok'=>true, 'status'=>'waiting', 'actions'=>$actions];
            }

            // ── [255차 심화] wait: 이벤트/날짜 대기(시간 delay 와 별개·Braze "Wait for Trigger/Until Date" 정합) ──
            //   mode=date: until 시각까지 대기. mode=event: event(purchase/email_open/email_click) 발생까지 대기, timeout 도래 시 'timeout' 분기.
            if ($type === 'wait') {
                $cfg  = (array)($node['config'] ?? []);
                $mode = (string)($cfg['mode'] ?? 'date');
                $cid  = (int)($enr['customer_id'] ?? 0);
                $since = (string)($enr['entered_at'] ?? '');
                if ($status === 'waiting') {
                    if ($mode === 'event') {
                        $ev = (string)($cfg['event'] ?? 'purchase');
                        if ($cid > 0 && self::eventOccurred($pdo, $tenant, $cid, $ev, $since)) {
                            self::logNode($pdo, $tenant, $enrollId, $jid, $nodeId, 'wait', 'event_occurred', ['event'=>$ev]);
                            $status = 'active'; $enr['resume_at'] = null;
                            $nodeId = self::nextNode($edges, $nodeId, 'occurred'); continue;
                        }
                        $until = (string)($enr['wait_until'] ?? '');
                        if ($until !== '' && $until <= $now) { // 타임아웃 → timeout 분기
                            self::logNode($pdo, $tenant, $enrollId, $jid, $nodeId, 'wait', 'event_timeout', ['event'=>$ev]);
                            $status = 'active'; $enr['resume_at'] = null;
                            $nodeId = self::nextNode($edges, $nodeId, 'timeout'); continue;
                        }
                        // 미발생·미타임아웃 → 다음 cron 재폴링(resume_at=now 유지, wait_until 보존)
                        $pdo->prepare("UPDATE journey_enrollments SET current_node=:n,status='waiting',resume_at=:r,last_run_at=:lr WHERE id=:id AND tenant_id=:t")
                            ->execute([':n'=>$nodeId, ':r'=>$now, ':lr'=>$now, ':id'=>$enrollId, ':t'=>$tenant]);
                        return ['ok'=>true, 'status'=>'waiting', 'actions'=>$actions];
                    }
                    // date 모드 재개
                    $resumeAt = (string)($enr['resume_at'] ?? '');
                    if ($resumeAt !== '' && $resumeAt <= $now) {
                        self::logNode($pdo, $tenant, $enrollId, $jid, $nodeId, 'wait', 'date_resumed', ['resumed_at'=>$now]);
                        $status = 'active'; $enr['resume_at'] = null;
                        $nodeId = self::nextNode($edges, $nodeId, null); continue;
                    }
                    return ['ok'=>true, 'status'=>'waiting', 'actions'=>$actions];
                }
                // 최초 진입 — 대기 설정
                if ($mode === 'event') {
                    $tv = max(1, (int)($cfg['timeout_value'] ?? 7)); $tu = (string)($cfg['timeout_unit'] ?? 'days');
                    $deadline = gmdate('Y-m-d H:i:s', strtotime("+{$tv} {$tu}") ?: time());
                    $pdo->prepare("UPDATE journey_enrollments SET current_node=:n,status='waiting',resume_at=:r,wait_until=:wu,last_run_at=:lr WHERE id=:id AND tenant_id=:t")
                        ->execute([':n'=>$nodeId, ':r'=>$now, ':wu'=>$deadline, ':lr'=>$now, ':id'=>$enrollId, ':t'=>$tenant]);
                    self::logNode($pdo, $tenant, $enrollId, $jid, $nodeId, 'wait', 'waiting', ['mode'=>'event', 'event'=>(string)($cfg['event'] ?? 'purchase'), 'timeout_at'=>$deadline]);
                } else {
                    $until = (string)($cfg['until'] ?? '');
                    $resume = ($until !== '') ? $until : gmdate('Y-m-d H:i:s', strtotime('+1 day') ?: time());
                    $pdo->prepare("UPDATE journey_enrollments SET current_node=:n,status='waiting',resume_at=:r,last_run_at=:lr WHERE id=:id AND tenant_id=:t")
                        ->execute([':n'=>$nodeId, ':r'=>$resume, ':lr'=>$now, ':id'=>$enrollId, ':t'=>$tenant]);
                    self::logNode($pdo, $tenant, $enrollId, $jid, $nodeId, 'wait', 'waiting', ['mode'=>'date', 'resume_at'=>$resume]);
                }
                return ['ok'=>true, 'status'=>'waiting', 'actions'=>$actions];
            }

            // ── condition: 분기 ──
            if ($type === 'condition') {
                $branch = self::evalCondition($pdo, $tenant, $enr, $node);
                self::logNode($pdo, $tenant, $enrollId, $jid, $nodeId, 'condition', 'evaluated', ['branch' => $branch]);
                $actions[] = ['node'=>$nodeId, 'action'=>'condition', 'branch'=>$branch];
                $nodeId = self::nextNode($edges, $nodeId, $branch);
                continue;
            }

            // ── [현 차수·260차 심화] split: 멀티변량 분기(N개 가중치, 등록ID 결정적 분배 — 동일 고객 동일 분기·재현가능) ──
            //   config.branches = [{key,weight},...] (2~N분기). 레거시 weight_a(2-way a/b) 하위호환. 목표기반 자동최적화(optimizeSplits)가 가중치 갱신.
            if ($type === 'split') {
                $cfg = (array)($node['config'] ?? []);
                $branches = [];
                if (is_array($cfg['branches'] ?? null) && count($cfg['branches']) >= 2) {
                    foreach ($cfg['branches'] as $b) { $k = trim((string)($b['key'] ?? '')); $w = max(0, (float)($b['weight'] ?? 0)); if ($k !== '') $branches[$k] = $w; }
                }
                if (count($branches) < 2) { $wA = max(0, min(100, (int)($cfg['weight_a'] ?? 50))); $branches = ['a' => $wA, 'b' => max(0, 100 - $wA)]; }
                $pick = self::pickWeighted($branches, $enrollId);
                self::logNode($pdo, $tenant, $enrollId, $jid, $nodeId, 'split', 'split', ['branch'=>$pick, 'branches'=>$branches, 'auto'=>!empty($cfg['auto_optimize'])]);
                $actions[] = ['node'=>$nodeId, 'action'=>'split', 'branch'=>$pick];
                $nodeId = self::nextNode($edges, $nodeId, $pick);
                continue;
            }

            // ── [현 차수 초고도화 ②] exit: 이탈 조건 — 충족 시 여정 즉시 종료(Braze exit criteria). 미충족=다음 진행 ──
            //   기존 evalCondition 재사용(중복0). status='exited'(완료와 구분·재선정 안 됨·stats_completed 미증가).
            if ($type === 'exit') {
                $branch = self::evalCondition($pdo, $tenant, $enr, $node);
                if ($branch === 'true') {
                    self::logNode($pdo, $tenant, $enrollId, $jid, $nodeId, 'exit', 'exited', ['reason' => (string)($node['label'] ?? 'exit_criteria')]);
                    try { $pdo->prepare("UPDATE journey_enrollments SET status='exited', completed_at=:c, last_run_at=:c WHERE id=:id AND tenant_id=:t")->execute([':c'=>$now, ':id'=>$enrollId, ':t'=>$tenant]); } catch (\Throwable $e) {}
                    $actions[] = ['node'=>$nodeId, 'action'=>'exited'];
                    return ['ok'=>true, 'status'=>'exited', 'actions'=>$actions];
                }
                self::logNode($pdo, $tenant, $enrollId, $jid, $nodeId, 'exit', 'exit_not_met', []);
                $actions[] = ['node'=>$nodeId, 'action'=>'exit_not_met'];
                $nodeId = self::nextNode($edges, $nodeId, null);
                continue;
            }

            // ── [현 차수 초고도화 ⑥] attr: 속성 업데이트 노드(Braze Update Attribute) — 여정 중 고객 tags 갱신 ──
            //   기존 crm_customers.tags(JSON) 재사용. RFM grade 는 미변경(자동 재계산과 충돌 방지). 중복 없이 추가·상한30.
            if ($type === 'attr') {
                $cid = (int)($enr['customer_id'] ?? 0);
                $tag = trim((string)(($node['config']['tag'] ?? $node['config']['value'] ?? '')));
                if ($cid > 0 && $tag !== '') {
                    try {
                        $ts = $pdo->prepare("SELECT tags FROM crm_customers WHERE id=:id AND tenant_id=:t");
                        $ts->execute([':id' => $cid, ':t' => $tenant]);
                        $cur = json_decode((string)($ts->fetchColumn() ?: '[]'), true); if (!is_array($cur)) $cur = [];
                        if (!in_array($tag, $cur, true)) {
                            $cur[] = mb_substr($tag, 0, 40);
                            $pdo->prepare("UPDATE crm_customers SET tags=:g, updated_at=:u WHERE id=:id AND tenant_id=:t")
                                ->execute([':g' => json_encode(array_slice($cur, 0, 30), JSON_UNESCAPED_UNICODE), ':u' => $now, ':id' => $cid, ':t' => $tenant]);
                        }
                    } catch (\Throwable $e) {}
                }
                self::logNode($pdo, $tenant, $enrollId, $jid, $nodeId, 'attr', 'tag_updated', ['tag' => $tag]);
                $actions[] = ['node' => $nodeId, 'action' => 'attr_tag'];
                $nodeId = self::nextNode($edges, $nodeId, null);
                continue;
            }

            // ── [현 차수] goal: 전환 목표 도달 기록(여정·등록건 전환 카운트) ──
            if ($type === 'goal') {
                self::logNode($pdo, $tenant, $enrollId, $jid, $nodeId, 'goal', 'goal_reached', ['goal'=>(string)($node['label'] ?? 'goal')]);
                try { $pdo->prepare("UPDATE journeys SET stats_converted=stats_converted+1 WHERE id=:id AND tenant_id=:t")->execute([':id'=>$jid, ':t'=>$tenant]); } catch (\Throwable $e) {}
                try { $pdo->prepare("UPDATE journey_enrollments SET converted=1 WHERE id=:id AND tenant_id=:t")->execute([':id'=>$enrollId, ':t'=>$tenant]); } catch (\Throwable $e) {}
                self::rewardDecisions($pdo, $tenant, (int)$enrollId); // [263차 Track A] 전환→선택변형 밴딧 리워드(1:1 학습)
                $actions[] = ['node'=>$nodeId, 'action'=>'goal_reached'];
                $nodeId = self::nextNode($edges, $nodeId, null);
                continue;
            }

            // ── 실행 노드(email/kakao/sms/action/...) ──
            switch ($type) {
                case 'email': $a = self::sendEmailNode($pdo, $tenant, $enr, $node); break;
                case 'kakao': $a = self::sendKakaoNode($pdo, $tenant, $enr, $node); break;
                case 'sms':   $a = self::sendSmsNode($pdo, $tenant, $enr, $node); break;
                case 'webhook': $a = self::webhookNode($pdo, $tenant, $enr, $node); break; // [255차 심화] 외부 HTTP 액션
                case 'nba':   $a = self::nbaNode($pdo, $tenant, $enr, $node); break; // [현 차수 초고도화 ②] RL/Next-Best-Action(Thompson). defer 전파는 기존 로직(하단) 재사용.
                case 'decision': $a = self::decisionNode($pdo, $tenant, $enr, $node); break; // [263차 Track A] 메시지레벨 1:1 결정(contextual bandit)
                default:      $a = ['action' => 'processed']; break;
            }
            self::logNode($pdo, $tenant, $enrollId, $jid, $nodeId, $type, (string)($a['action'] ?? 'processed'), $a);
            $actions[] = ['node'=>$nodeId] + $a;

            // [초고도화 #3] 조용시간 등 defer — 현 노드 유지(미진행)·다음 실행에서 재시도(야간발송 회피·최적시간 발송).
            if (!empty($a['defer'])) {
                try { $pdo->prepare("UPDATE journey_enrollments SET last_run_at=:lr WHERE id=:id AND tenant_id=:t")->execute([':lr'=>$now, ':id'=>$enrollId, ':t'=>$tenant]); } catch (\Throwable $e) {}
                return ['ok'=>true, 'status'=>'deferred', 'actions'=>$actions];
            }
            $nodeId = self::nextNode($edges, $nodeId, null);
            $pdo->prepare("UPDATE journey_enrollments SET current_node=:n,last_run_at=:lr WHERE id=:id AND tenant_id=:t")
                ->execute([':n'=>$nodeId, ':lr'=>$now, ':id'=>$enrollId, ':t'=>$tenant]);
        }

        // 다음 노드 없음 → 완료
        $pdo->prepare("UPDATE journey_enrollments SET status='completed', completed_at=:c, last_run_at=:c WHERE id=:id AND tenant_id=:t")
            ->execute([':c'=>$now, ':id'=>$enrollId, ':t'=>$tenant]);
        $pdo->prepare("UPDATE journeys SET stats_completed=stats_completed+1 WHERE id=:id AND tenant_id=:t")->execute([':id'=>$jid, ':t'=>$tenant]);
        return ['ok'=>true, 'status'=>'completed', 'actions'=>$actions];
    }

    private static function findNode(array $nodes, string $id): ?array
    {
        foreach ($nodes as $n) { if (($n['id'] ?? null) === $id) return $n; }
        return null;
    }

    /** [260차 심화] 결정적 가중 분기 선택 — enrollId 해시로 누적가중 구간 배정(동일 고객 동일 분기·재현가능·멀티변량). */
    private static function pickWeighted(array $weights, int $seed): string
    {
        $keys = array_keys($weights);
        $total = 0.0; foreach ($weights as $w) $total += max(0.0, (float)$w);
        if ($total <= 0) return (string)($keys[0] ?? 'a');
        $r = ((($seed * 2654435761) + 1) % 100000) / 100000.0 * $total;
        $acc = 0.0;
        foreach ($weights as $k => $w) { $acc += max(0.0, (float)$w); if ($r < $acc) return (string)$k; }
        return (string)end($keys);
    }

    /** [260차 심화] 목표기반 자동최적화 — split 노드(auto_optimize=true)의 분기 가중을 관측 전환율 기준 재배분(밴딧).
     *  branch별 등록수·전환수(journey_node_logs⋈journey_enrollments) → Laplace 평활 전환율 → softmax 재가중(탐색 최소5%·상한80%).
     *  결정론 분배는 유지(신규 등록만 새 분포 적용). 표본 20건 미만 노드는 유지. 반환: 갱신 노드 수. journey_cron 이 호출. */
    public static function optimizeSplits(?string $onlyTenant = null): int
    {
        $pdo = Db::pdo();
        $sql = "SELECT id, tenant_id, nodes FROM journeys WHERE status='active'" . ($onlyTenant ? " AND tenant_id=:t" : "");
        $st = $pdo->prepare($sql); $st->execute($onlyTenant ? [':t' => $onlyTenant] : []);
        $updated = 0;
        foreach ($st->fetchAll(\PDO::FETCH_ASSOC) as $j) {
            $jid = (int)$j['id']; $tenant = (string)$j['tenant_id'];
            $nodes = json_decode($j['nodes'] ?? '[]', true); if (!is_array($nodes)) continue;
            $changed = false;
            foreach ($nodes as &$node) {
                if (($node['type'] ?? '') !== 'split') continue;
                $cfg = (array)($node['config'] ?? []);
                if (empty($cfg['auto_optimize'])) continue;
                $nodeId = (string)($node['id'] ?? ''); if ($nodeId === '') continue;
                $keys = [];
                if (is_array($cfg['branches'] ?? null)) foreach ($cfg['branches'] as $b) { $k = trim((string)($b['key'] ?? '')); if ($k !== '') $keys[] = $k; }
                if (count($keys) < 2) $keys = ['a', 'b'];
                $q = $pdo->prepare("SELECT l.result AS result, e.converted AS converted FROM journey_node_logs l JOIN journey_enrollments e ON e.id=l.enrollment_id AND e.tenant_id=l.tenant_id WHERE l.journey_id=:j AND l.tenant_id=:t AND l.node_id=:n AND l.node_type='split'");
                $q->execute([':j' => $jid, ':t' => $tenant, ':n' => $nodeId]);
                $enr = []; $conv = [];
                foreach ($q->fetchAll(\PDO::FETCH_ASSOC) as $row) {
                    $r = json_decode($row['result'] ?? '{}', true); $br = is_array($r) ? (string)($r['branch'] ?? '') : '';
                    if ($br === '') continue;
                    $enr[$br] = ($enr[$br] ?? 0) + 1;
                    if ((int)$row['converted'] === 1) $conv[$br] = ($conv[$br] ?? 0) + 1;
                }
                if (array_sum($enr) < 20) continue; // 표본 부족 → 유지
                $rates = []; foreach ($keys as $k) { $e = $enr[$k] ?? 0; $c = $conv[$k] ?? 0; $rates[$k] = ($c + 1.0) / ($e + 2.0); }
                $maxR = max($rates); $exps = []; $sum = 0.0;
                foreach ($keys as $k) { $ev = exp(($rates[$k] - $maxR) * 8.0); $exps[$k] = $ev; $sum += $ev; }
                $raw = []; foreach ($keys as $k) { $raw[$k] = max(5.0, min(80.0, 100.0 * $exps[$k] / max(1e-9, $sum))); }
                $tot = array_sum($raw); $newBranches = [];
                foreach ($keys as $k) { $newBranches[] = ['key' => $k, 'weight' => round($raw[$k] * 100.0 / max(1e-9, $tot), 1)]; }
                $node['config']['branches'] = $newBranches;
                $node['config']['optimized_at'] = gmdate('c');
                $changed = true; $updated++;
            }
            unset($node);
            if ($changed) {
                try { $pdo->prepare("UPDATE journeys SET nodes=:n, updated_at=:u WHERE id=:id AND tenant_id=:t")->execute([':n' => json_encode($nodes, JSON_UNESCAPED_UNICODE), ':u' => gmdate('c'), ':id' => $jid, ':t' => $tenant]); } catch (\Throwable $e) {}
            }
        }
        return $updated;
    }

    /** 다음 노드 해석. $branch('true'/'false') 지정 시 조건 엣지(when/branch/label) 매칭. */
    private static function nextNode(array $edges, string $fromId, ?string $branch): string
    {
        $cand = [];
        foreach ($edges as $e) { if (($e['from'] ?? null) === $fromId) $cand[] = $e; }
        if (!$cand) return '';
        if ($branch !== null) {
            // [현 차수] true/false 외 임의 분기 라벨(split a/b 등)도 매칭.
            $bl = strtolower((string)$branch);
            $want = $bl === 'true' ? ['true','yes','y','1'] : ($bl === 'false' ? ['false','no','n','0'] : [$bl]);
            foreach ($cand as $e) {
                $w = $e['when'] ?? $e['branch'] ?? $e['condition'] ?? $e['label'] ?? null;
                if ($w === null) continue;
                $ws = is_bool($w) ? ($w ? 'true' : 'false') : strtolower((string)$w);
                if (in_array($ws, $want, true)) return (string)($e['to'] ?? '');
            }
            // 라벨 없으면 위치 폴백: true/a→첫번째, false/b→두번째
            $idx = in_array($bl, ['true','a','yes','1'], true) ? 0 : (count($cand) > 1 ? 1 : 0);
            return (string)($cand[$idx]['to'] ?? '');
        }
        return (string)($cand[0]['to'] ?? '');
    }

    /** 조건 평가 → 'true'/'false'. 고객 사실(grade/ltv) + 등록 revenue 기반, 미추적 신호는 보수적 false. */
    private static function evalCondition(\PDO $pdo, string $tenant, array $enr, array $node): string
    {
        $cfg      = (array)($node['config'] ?? []);
        $field    = (string)($cfg['field'] ?? '');
        $op       = (string)($cfg['op'] ?? 'eq');
        $expected = $cfg['value'] ?? null;
        $cid      = (int)($enr['customer_id'] ?? 0);

        $facts = ['revenue' => (float)($enr['revenue'] ?? 0)];
        if ($cid > 0) {
            try {
                $c = $pdo->prepare("SELECT grade, ltv FROM crm_customers WHERE id=:id AND tenant_id=:t");
                $c->execute([':id'=>$cid, ':t'=>$tenant]);
                $row = $c->fetch(\PDO::FETCH_ASSOC) ?: [];
                $facts['grade'] = $row['grade'] ?? null;
                $facts['ltv']   = (float)($row['ltv'] ?? 0);
            } catch (\Throwable $e) {}
            // [현 차수] engagement 분기 — 이메일 오픈/클릭 실신호(email_sends trackOpen/trackClick 적재). Klaviyo 'opened/clicked' 분기 정합.
            try {
                $e = $pdo->prepare("SELECT MAX(CASE WHEN opened_at IS NOT NULL AND opened_at <> '' THEN 1 ELSE 0 END) AS o, MAX(CASE WHEN clicked_at IS NOT NULL AND clicked_at <> '' THEN 1 ELSE 0 END) AS c FROM email_sends WHERE tenant_id=:t AND customer_id=:id");
                $e->execute([':t'=>$tenant, ':id'=>$cid]);
                $er = $e->fetch(\PDO::FETCH_ASSOC) ?: [];
                $facts['email_opened']  = (int)($er['o'] ?? 0);
                $facts['email_clicked'] = (int)($er['c'] ?? 0);
            } catch (\Throwable $e) {}
        }
        $actual = $facts[$field] ?? null; // 그 외 미추적 신호 → null → 보수적 false
        return self::compare($actual, $op, $expected) ? 'true' : 'false';
    }

    private static function compare($a, string $op, $b): bool
    {
        if ($a === null) return false;
        return match ($op) {
            'eq', '=='        => $a == $b,
            'neq', '!='       => $a != $b,
            'gt', '>'         => (float)$a >  (float)$b,
            'gte', '>='       => (float)$a >= (float)$b,
            'lt', '<'         => (float)$a <  (float)$b,
            'lte', '<='       => (float)$a <= (float)$b,
            'contains'        => str_contains((string)$a, (string)$b),
            default           => $a == $b,
        };
    }

    private static function contact(\PDO $pdo, string $tenant, int $cid): array
    {
        if ($cid <= 0) return [];
        try {
            $s = $pdo->prepare("SELECT email, phone, name, grade, rfm_r, rfm_f, rfm_score, ltv FROM crm_customers WHERE id=:id AND tenant_id=:t");
            $s->execute([':id'=>$cid, ':t'=>$tenant]);
            return $s->fetch(\PDO::FETCH_ASSOC) ?: [];
        } catch (\Throwable $e) { return []; }
    }

    /** [255차 심화] wait(event) — 지정 이벤트가 여정 진입(entered_at) 이후 발생했는지. purchase/email_open/email_click. */
    private static function eventOccurred(\PDO $pdo, string $tenant, int $cid, string $event, string $since): bool
    {
        if ($cid <= 0) return false;
        $since = $since !== '' ? $since : '1970-01-01 00:00:00';
        try {
            if ($event === 'purchase') {
                $s = $pdo->prepare("SELECT 1 FROM crm_activities WHERE tenant_id=:t AND customer_id=:c AND type='purchase' AND created_at > :s LIMIT 1");
                $s->execute([':t'=>$tenant, ':c'=>$cid, ':s'=>$since]); return (bool)$s->fetchColumn();
            }
            if ($event === 'email_open' || $event === 'email_click') {
                $col = $event === 'email_open' ? 'opened_at' : 'clicked_at';
                $s = $pdo->prepare("SELECT 1 FROM email_sends WHERE tenant_id=:t AND customer_id=:c AND {$col} IS NOT NULL AND {$col} <> '' AND {$col} > :s LIMIT 1");
                $s->execute([':t'=>$tenant, ':c'=>$cid, ':s'=>$since]); return (bool)$s->fetchColumn();
            }
        } catch (\Throwable $e) {}
        return false;
    }

    /** [255차 심화] webhook 액션 노드 — 외부 HTTP 호출(Braze Webhook action 정합). config: {url, method, headers, body}. */
    private static function webhookNode(\PDO $pdo, string $tenant, array $enr, array $node): array
    {
        $cfg = (array)($node['config'] ?? []);
        $url = trim((string)($cfg['url'] ?? ''));
        if ($url === '') return ['action' => 'skipped', 'reason' => 'no_url'];
        // [272차 P1 SSRF] 스킴 검사만으로는 169.254.169.254(클라우드 메타데이터)·10.x·localhost 등
        //   내부/사설/링크로컬 대역으로의 서버측 요청(고객 PII 유출·IAM 크리덴셜 탈취)을 못 막는다.
        //   OpenPlatform/DataExport 와 동일한 공개 https 게이트(DNS 해석 후 사설/예약 IP 거부·전달 직전 검증)를 적용.
        if (!self::isPublicHttpsUrl($url)) return ['action' => 'skipped', 'reason' => 'url_blocked'];
        $c = self::contact($pdo, $tenant, (int)($enr['customer_id'] ?? 0));
        // 머지 컨텍스트(PII 최소 — 이름/이메일/전화/매출). body 템플릿 {{var}} 치환.
        $ctx = ['name'=>(string)($c['name'] ?? ''), 'email'=>(string)($c['email'] ?? ''), 'phone'=>(string)($c['phone'] ?? ''),
                'customer_id'=>(int)($enr['customer_id'] ?? 0), 'journey_id'=>(int)($enr['journey_id'] ?? 0), 'revenue'=>(float)($enr['revenue'] ?? 0)];
        $method = strtoupper((string)($cfg['method'] ?? 'POST'));
        $bodyTpl = $cfg['body'] ?? null;
        if (is_string($bodyTpl) && $bodyTpl !== '') {
            $payload = $bodyTpl;
            foreach ($ctx as $k=>$v) { $payload = str_replace('{{'.$k.'}}', (string)$v, $payload); }
        } else { $payload = json_encode($ctx, JSON_UNESCAPED_UNICODE); }
        $headers = ['Content-Type: application/json'];
        foreach ((array)($cfg['headers'] ?? []) as $hk=>$hv) { $headers[] = $hk.': '.$hv; }
        try {
            $ch = curl_init($url);
            curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER=>true, CURLOPT_CUSTOMREQUEST=>($method==='GET'?'GET':'POST'),
                CURLOPT_POSTFIELDS=>($method==='GET'?null:$payload), CURLOPT_HTTPHEADER=>$headers, CURLOPT_TIMEOUT=>10, CURLOPT_SSL_VERIFYPEER=>true]);
            curl_exec($ch); $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE); $err = curl_error($ch); curl_close($ch);
            if ($err) return ['action'=>'webhook_failed', 'error'=>$err];
            return ['action'=>($code>=200 && $code<300)?'webhook_sent':'webhook_failed', 'code'=>$code];
        } catch (\Throwable $e) { return ['action'=>'webhook_failed', 'error'=>$e->getMessage()]; }
    }

    /** [272차] SSRF 방어 — 공개 https 호스트로 해석되는 URL만 허용(OpenPlatform::isPublicHttpsUrl 미러).
     *   사설/루프백/링크로컬/169.254.169.254(메타데이터) 대역 차단 + DNS rebinding 대비 전달시점 검증. */
    private static function isPublicHttpsUrl(string $url): bool
    {
        $p = parse_url($url);
        if (!$p || (($p['scheme'] ?? '') !== 'https')) return false;
        $host = (string)($p['host'] ?? '');
        if ($host === '') return false;
        $lh = strtolower($host);
        if (in_array($lh, ['localhost', 'metadata.google.internal'], true)) return false;
        if (substr($lh, -6) === '.local' || substr($lh, -9) === '.internal') return false;
        $ips = [];
        if (filter_var($host, FILTER_VALIDATE_IP)) {
            $ips = [$host];
        } else {
            $recs = @dns_get_record($host, DNS_A | DNS_AAAA);
            if (is_array($recs)) {
                foreach ($recs as $r) {
                    if (!empty($r['ip']))   $ips[] = $r['ip'];
                    if (!empty($r['ipv6'])) $ips[] = $r['ipv6'];
                }
            }
            if (!$ips) { $h = @gethostbyname($host); if ($h && $h !== $host) $ips[] = $h; }
        }
        if (!$ips) return false; // 해석 불가 → 안전측 거부.
        foreach ($ips as $ip) {
            if (!filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) return false;
        }
        return true;
    }

    /**
     * [255차 심화] POST /journey/webhook/{token} — 인바운드 웹훅 트리거(외부 이벤트→여정 진입, Braze API-trigger 정합).
     *   무인증(token=시크릿). token→소유 테넌트+여정 역매핑. 고객은 payload(customer_id/email/phone)로 **기존 고객만** 매칭(오염 방지).
     *   body: {customer_id?|email?|phone?, revenue?}. 미등록 고객은 enrolled=0(정직·미생성).
     */
    public static function webhookIngress(Request $req, Response $res, array $args): Response
    {
        self::ensureTables();
        $pdo = self::db();
        $token = (string)($args['token'] ?? '');
        if ($token === '' || strlen($token) < 16) return self::json($res, ['ok'=>false, 'error'=>'invalid token'], 400);
        try {
            $j = $pdo->prepare("SELECT * FROM journeys WHERE webhook_token=:tk AND trigger_type='webhook' AND status='active' LIMIT 1");
            $j->execute([':tk'=>$token]);
            $journey = $j->fetch(\PDO::FETCH_ASSOC);
        } catch (\Throwable $e) { $journey = null; }
        if (!$journey) return self::json($res, ['ok'=>false, 'error'=>'no active webhook journey'], 404);
        $tenant = (string)$journey['tenant_id'];
        $b = (array)($req->getParsedBody() ?? []);
        // 기존 고객만 매칭(미생성=오염 차단).
        $cid = (int)($b['customer_id'] ?? 0);
        if ($cid <= 0) {
            $email = strtolower(trim((string)($b['email'] ?? '')));
            $phone = preg_replace('/[^0-9]/', '', (string)($b['phone'] ?? ''));
            try {
                if ($email !== '') { $s = $pdo->prepare("SELECT id FROM crm_customers WHERE tenant_id=:t AND LOWER(email)=:e LIMIT 1"); $s->execute([':t'=>$tenant, ':e'=>$email]); $cid = (int)($s->fetchColumn() ?: 0); }
                if ($cid <= 0 && $phone !== '') { $s = $pdo->prepare("SELECT id FROM crm_customers WHERE tenant_id=:t AND REPLACE(REPLACE(phone,'-',''),' ','')=:p LIMIT 1"); $s->execute([':t'=>$tenant, ':p'=>$phone]); $cid = (int)($s->fetchColumn() ?: 0); }
            } catch (\Throwable $e) {}
        } else {
            // customer_id 도 테넌트 소유 확인(교차테넌트 차단).
            try { $s = $pdo->prepare("SELECT id FROM crm_customers WHERE id=:id AND tenant_id=:t LIMIT 1"); $s->execute([':id'=>$cid, ':t'=>$tenant]); if (!$s->fetchColumn()) $cid = 0; } catch (\Throwable $e) { $cid = 0; }
        }
        if ($cid <= 0) return self::json($res, ['ok'=>true, 'enrolled'=>0, 'note'=>'no matching customer']);
        $enrolled = self::enrollOne($pdo, $tenant, $journey, $cid, ['revenue'=>(float)($b['revenue'] ?? 0)]) ? 1 : 0;
        return self::json($res, ['ok'=>true, 'enrolled'=>$enrolled]);
    }

    /**
     * [현 차수 초고도화 ②] NBA(Next-Best-Action) 노드 — 데이터기반 Thompson 샘플링으로 고객별 최적 채널 선택 후 발송.
     *   기존 CustomerAI::nextBestAction 하드코딩 스텁을 실 데이터 밴딧으로 대체. 리워드=테넌트 채널효과(발송 수신→구매 co-occurrence).
     *   도달가능 채널만 후보. 발송은 기존 sendEmail/Kakao/SmsNode 재사용(중복0). 조용시간 defer 는 위임 전파(기존 로직 처리).
     */
    private static function nbaNode(\PDO $pdo, string $tenant, array $enr, array $node): array
    {
        $cid = (int)($enr['customer_id'] ?? 0);
        $c = self::contact($pdo, $tenant, $cid);
        $hasEmail = trim((string)($c['email'] ?? '')) !== '';
        $hasPhone = preg_replace('/[^0-9]/', '', (string)($c['phone'] ?? '')) !== '';
        $allow = (array)(($node['config']['channels'] ?? null) ?: ['email', 'kakao', 'sms']);
        $cands = [];
        foreach ($allow as $ch) {
            $ch = (string)$ch;
            if ($ch === 'email' && $hasEmail) $cands[] = 'email';
            elseif (($ch === 'kakao' || $ch === 'sms') && $hasPhone) $cands[] = $ch;
        }
        $cands = array_values(array_unique($cands));
        if (!$cands) return ['action' => 'skipped', 'reason' => 'no_reachable_channel'];
        $stats = self::nbaChannelStats($pdo, $tenant);
        $bestCh = $cands[0]; $bestScore = -1.0; $samples = [];
        foreach ($cands as $ch) {
            $score = self::nbaThompson($stats[$ch] ?? ['s' => 0, 't' => 0]);
            $samples[$ch] = round($score, 4);
            if ($score > $bestScore) { $bestScore = $score; $bestCh = $ch; }
        }
        $r = match ($bestCh) {
            'email' => self::sendEmailNode($pdo, $tenant, $enr, $node),
            'kakao' => self::sendKakaoNode($pdo, $tenant, $enr, $node),
            'sms'   => self::sendSmsNode($pdo, $tenant, $enr, $node),
            default => ['action' => 'skipped'],
        };
        $out = ['action' => 'nba:' . $bestCh . ':' . (string)($r['action'] ?? 'sent'), 'chosen_channel' => $bestCh, 'samples' => $samples];
        if (!empty($r['defer'])) $out['defer'] = true; // 조용시간 위임 전파(기존 defer 처리 재사용)
        return $out;
    }

    /** [②] 테넌트 채널효과 통계(요청내 메모이즈) — 채널별 발송 수신 고객수(trials)·그중 구매 고객수(successes). */
    private static function nbaChannelStats(\PDO $pdo, string $tenant): array
    {
        static $cache = [];
        if (array_key_exists($tenant, $cache)) return $cache[$tenant];
        $stats = ['email' => ['s' => 0, 't' => 0], 'kakao' => ['s' => 0, 't' => 0], 'sms' => ['s' => 0, 't' => 0]];
        try {
            $sql = "SELECT a.channel AS ch,
                           COUNT(DISTINCT a.customer_id) AS trials,
                           COUNT(DISTINCT p.customer_id) AS succ
                      FROM crm_activities a
                      LEFT JOIN (SELECT DISTINCT customer_id FROM crm_activities WHERE tenant_id = ? AND type = 'purchase') p
                        ON p.customer_id = a.customer_id
                     WHERE a.tenant_id = ? AND a.type IN ('email_sent','kakao_sent','sms_sent')
                     GROUP BY a.channel";
            $st = $pdo->prepare($sql);
            $st->execute([$tenant, $tenant]);
            foreach ($st->fetchAll(\PDO::FETCH_ASSOC) ?: [] as $r) {
                $ch = (string)$r['ch'];
                if (isset($stats[$ch])) $stats[$ch] = ['s' => (int)$r['succ'], 't' => (int)$r['trials']];
            }
        } catch (\Throwable $e) { /* 데이터부족/스키마 → 균등 prior(탐색 우선) */ }
        $cache[$tenant] = $stats;
        return $stats;
    }

    /** [②] Gaussian Thompson 샘플 — Beta(1+s,1+(t-s)) 평균/분산의 정규근사(밴딧 탐색-활용). 데이터 적을수록 분산↑=탐색↑. */
    private static function nbaThompson(array $stat): float
    {
        $s = (int)($stat['s'] ?? 0); $t = (int)($stat['t'] ?? 0);
        $a = 1.0 + $s; $b = 1.0 + max(0, $t - $s);
        $mean = $a / ($a + $b);
        $var  = ($a * $b) / (($a + $b) * ($a + $b) * ($a + $b + 1.0));
        $std  = sqrt(max(1e-12, $var));
        $u1 = max(1e-9, mt_rand() / mt_getrandmax());
        $u2 = mt_rand() / mt_getrandmax();
        $z  = sqrt(-2.0 * log($u1)) * cos(2.0 * M_PI * $u2); // Box-Muller
        return min(1.0, max(0.0, $mean + $std * $z));
    }

    /* ─── [263차 초고도화 Track A] 메시지레벨 RL 1:1 결정(OfferFit式 contextual bandit) ───────────────
     *   ★기존 nbaNode(채널레벨)·AbTesting(캠페인 글로벌 승자)과 구분: 여기는 고객 컨텍스트버킷(grade×recency×frequency)
     *   마다 상이한 최적 변형(콘텐츠×오퍼×채널)을 1:1 개인화 선택 + 전환(goal) 리워드로 학습. nbaThompson·send노드 재사용(중복0).
     *   변형 미지정 시 단일 발송 폴백(회귀0). 데이터 적으면 분산↑=탐색 우선(cold-start 안전). */
    private static function decisionNode(\PDO $pdo, string $tenant, array $enr, array $node): array
    {
        $cid = (int)($enr['customer_id'] ?? 0);
        $c   = self::contact($pdo, $tenant, $cid);
        $hasEmail = trim((string)($c['email'] ?? '')) !== '';
        $hasPhone = preg_replace('/[^0-9]/', '', (string)($c['phone'] ?? '')) !== '';
        $cfg      = (array)($node['config'] ?? []);
        $variants = is_array($cfg['variants'] ?? null) ? $cfg['variants'] : [];
        if (!$variants) { // 변형 없음 → 단일 발송 폴백(기존 노드 재사용)
            $ch = (string)($cfg['channel'] ?? 'email');
            return match ($ch) { 'kakao' => self::sendKakaoNode($pdo,$tenant,$enr,$node), 'sms' => self::sendSmsNode($pdo,$tenant,$enr,$node), default => self::sendEmailNode($pdo,$tenant,$enr,$node) };
        }
        $cands = [];
        foreach ($variants as $i => $v) {
            if (!is_array($v)) continue;
            $vch = (string)($v['channel'] ?? 'email');
            if ($vch === 'email' && !$hasEmail) continue;
            if (($vch === 'kakao' || $vch === 'sms') && !$hasPhone) continue;
            $cands[] = ['id' => (string)($v['id'] ?? ('v' . $i)), 'channel' => $vch, 'cfg' => $v];
        }
        if (!$cands) return ['action' => 'skipped', 'reason' => 'no_reachable_variant'];
        $scope  = (string)($enr['journey_id'] ?? '0') . ':' . (string)($node['id'] ?? '_');
        $bucket = self::decisionContextBucket($c);
        $best = $cands[0]; $bestScore = -1.0; $samples = [];
        foreach ($cands as $cd) {
            $score = self::nbaThompson(self::decisionArmStat($pdo, $tenant, $scope, $cd['id'], $bucket)); // Beta-Bernoulli Thompson 재사용
            $samples[$cd['id']] = round($score, 4);
            if ($score > $bestScore) { $bestScore = $score; $best = $cd; }
        }
        $sendNode = ['id' => $node['id'] ?? '', 'label' => $node['label'] ?? '', 'config' => $best['cfg']];
        $r = match ($best['channel']) {
            'kakao' => self::sendKakaoNode($pdo, $tenant, $enr, $sendNode),
            'sms'   => self::sendSmsNode($pdo, $tenant, $enr, $sendNode),
            default => self::sendEmailNode($pdo, $tenant, $enr, $sendNode),
        };
        $act = (string)($r['action'] ?? 'sent');
        if (empty($r['defer']) && strpos($act, 'skipped') === false && strpos($act, 'deferred') === false) {
            self::bumpDecisionArm($pdo, $tenant, $scope, $best['id'], $bucket, 0, 1); // trials+1
            try { $pdo->prepare("INSERT INTO journey_decision_log(tenant_id,scope_key,enrollment_id,customer_id,variant_id,channel,context_bucket,rewarded,sent_at) VALUES(?,?,?,?,?,?,?,0,?)")
                ->execute([$tenant, $scope, (int)($enr['id'] ?? 0), $cid, $best['id'], $best['channel'], $bucket, self::now()]); } catch (\Throwable $e) {}
        }
        $out = ['action' => 'decision:' . $best['id'] . ':' . $act, 'chosen_variant' => $best['id'], 'chosen_channel' => $best['channel'], 'context' => $bucket, 'samples' => $samples];
        if (!empty($r['defer'])) $out['defer'] = true;
        return $out;
    }

    /** 고객 컨텍스트 버킷 = grade × recency(rfm_r) × frequency(rfm_f) × [264차] monetary(ltv) — 버킷별 상이한 최적변형 학습(개인화 축).
     *   저장컬럼만 사용(무유령). [264차] 고LTV 고객은 프리미엄 오퍼에 반응 상이 → monetary 축(hi/lo) 추가로 1:1 정밀도↑(OfferFit式 다차원 컨텍스트). */
    private static function decisionContextBucket(array $c): string
    {
        $grade = strtolower((string)($c['grade'] ?? 'normal')); if ($grade === '') $grade = 'normal';
        $r = (int)($c['rfm_r'] ?? 0); $f = (int)($c['rfm_f'] ?? 0);
        $rt = $r >= 4 ? 'r' : ($r >= 2 ? 'w' : 'c');
        $ft = $f >= 4 ? 'h' : ($f >= 2 ? 'm' : 'l');
        $ltv = (float)($c['ltv'] ?? 0);
        $mt = $ltv >= 300000 ? 'M' : ($ltv >= 50000 ? 'm' : 'l'); // 원화 LTV 임계(고/중/저) — monetary 축
        return substr($grade, 0, 6) . '|' . $rt . '|' . $ft . '|' . $mt;
    }

    private static function decisionArmStat(\PDO $pdo, string $tenant, string $scope, string $variantId, string $bucket): array
    {
        try {
            $st = $pdo->prepare("SELECT successes, trials FROM journey_decision_arm WHERE tenant_id=? AND scope_key=? AND variant_id=? AND context_bucket=? LIMIT 1");
            $st->execute([$tenant, $scope, $variantId, $bucket]);
            $r = $st->fetch(\PDO::FETCH_ASSOC);
            if ($r) return ['s' => (int)$r['successes'], 't' => (int)$r['trials']];
        } catch (\Throwable $e) {}
        return ['s' => 0, 't' => 0];
    }

    private static function bumpDecisionArm(\PDO $pdo, string $tenant, string $scope, string $variantId, string $bucket, int $dS, int $dT): void
    {
        $now = self::now();
        try {
            if (self::isMysql($pdo)) {
                $pdo->prepare("INSERT INTO journey_decision_arm(tenant_id,scope_key,variant_id,context_bucket,successes,trials,updated_at) VALUES(?,?,?,?,?,?,?)
                               ON DUPLICATE KEY UPDATE successes=successes+VALUES(successes), trials=trials+VALUES(trials), updated_at=VALUES(updated_at)")
                    ->execute([$tenant, $scope, $variantId, $bucket, $dS, $dT, $now]);
            } else {
                $pdo->prepare("INSERT INTO journey_decision_arm(tenant_id,scope_key,variant_id,context_bucket,successes,trials,updated_at) VALUES(?,?,?,?,?,?,?)
                               ON CONFLICT(tenant_id,scope_key,variant_id,context_bucket) DO UPDATE SET successes=successes+excluded.successes, trials=trials+excluded.trials, updated_at=excluded.updated_at")
                    ->execute([$tenant, $scope, $variantId, $bucket, $dS, $dT, $now]);
            }
            // [264차 심화] 비정상성(concept drift) 대응 — 발송(dT>0) 시 trials 가 cap 초과하면 successes/trials 를 절반 forgetting.
            //   비율(전환율)은 보존하되 신뢰도(표본)를 감쇠 → 밴딧이 최근 선호변화에 재적응(OfferFit式 non-stationary). DB무관 PHP산출.
            //   cap=0 이면 비활성(기존 정상성 유지·회귀0). 기본 400 = 최근 ~400 발송 유효기억.
            if ($dT > 0) {
                $cap = (int)(getenv('JOURNEY_DECISION_ARM_CAP') ?: 400);
                if ($cap > 0) {
                    $q = $pdo->prepare("SELECT successes, trials FROM journey_decision_arm WHERE tenant_id=? AND scope_key=? AND variant_id=? AND context_bucket=?");
                    $q->execute([$tenant, $scope, $variantId, $bucket]);
                    $row = $q->fetch(\PDO::FETCH_ASSOC);
                    if ($row && (int)$row['trials'] > $cap) {
                        $ns = (int)floor(((int)$row['successes'] + 1) / 2);
                        $nt = (int)floor(((int)$row['trials'] + 1) / 2);
                        $pdo->prepare("UPDATE journey_decision_arm SET successes=?, trials=?, updated_at=? WHERE tenant_id=? AND scope_key=? AND variant_id=? AND context_bucket=?")
                            ->execute([$ns, $nt, $now, $tenant, $scope, $variantId, $bucket]);
                    }
                }
            }
        } catch (\Throwable $e) { error_log('[JourneyBuilder.bumpDecisionArm] ' . $e->getMessage()); }
    }

    /** [Track A 리워드] 전환(goal) 도달 시 이 enrollment 의 미보상 결정에 success 크레딧 — 선택 변형이 전환 유도(OfferFit 크레딧할당). */
    private static function rewardDecisions(\PDO $pdo, string $tenant, int $enrollId): void
    {
        try {
            $st = $pdo->prepare("SELECT id, scope_key, variant_id, context_bucket FROM journey_decision_log WHERE tenant_id=? AND enrollment_id=? AND rewarded=0");
            $st->execute([$tenant, $enrollId]);
            foreach ($st->fetchAll(\PDO::FETCH_ASSOC) ?: [] as $r) {
                self::bumpDecisionArm($pdo, $tenant, (string)$r['scope_key'], (string)$r['variant_id'], (string)$r['context_bucket'], 1, 0); // success+1
                try { $pdo->prepare("UPDATE journey_decision_log SET rewarded=1, reward_at=? WHERE id=?")->execute([self::now(), (int)$r['id']]); } catch (\Throwable $e) {}
            }
        } catch (\Throwable $e) { error_log('[JourneyBuilder.rewardDecisions] ' . $e->getMessage()); }
    }

    private static function sendEmailNode(\PDO $pdo, string $tenant, array $enr, array $node): array
    {
        $c     = self::contact($pdo, $tenant, (int)($enr['customer_id'] ?? 0));
        $email = trim((string)($c['email'] ?? ''));
        if ($email === '') return ['action' => 'skipped', 'reason' => 'no_email'];
        // [240차 약점⑥] 빈도캡 — 자동 저니 과발송 차단(딜리버러빌리티 보호).
        $fc = CRM::commsFreqConfig($pdo, $tenant);
        if (CRM::isFrequencyCapped($pdo, $tenant, (int)($enr['customer_id'] ?? 0), $fc['cap'], $fc['window'])) return ['action' => 'skipped', 'reason' => 'frequency_capped'];
        // [초고도화 #3] 조용시간(STO ON 시 야간 defer) — 최적 시간대 발송(Klaviyo STO 정합·기본 OFF=무영향).
        if (!CRM::commsSendAllowedNow($fc)) return ['action' => 'deferred_quiet_hours', 'defer' => true, 'reason' => 'quiet_hours'];
        // [현 차수 동의센터 SSOT] 통합 발송 게이트 — 채널 옵트아웃/suppression 등 단일소스(crm_channel_prefs). fail-open(오류 시 발송).
        // [R1 메시지손실 방지] 조용시간(quiet_hours/quiet_hours_tenant) 거부는 노드 유지 defer(뒤 실행에서 재시도)·그 외(옵트아웃/suppression/빈도)만 종결 skip.
        $g = CRM::isMarketingSendAllowed($tenant, (int)($enr['customer_id'] ?? 0), 'email', ['email' => $email]);
        if (!($g['allowed'] ?? false)) {
            if (strpos((string)($g['reason'] ?? ''), 'quiet') !== false) return ['action' => 'deferred_quiet_hours', 'defer' => true, 'reason' => (string)($g['reason'] ?? 'quiet_hours')];
            return ['action' => 'skipped', 'reason' => (string)($g['reason'] ?? '') ?: 'consent_opt_out'];
        }
        $cfg     = (array)($node['config'] ?? []);
        $subject = (string)($cfg['subject'] ?? '') ?: (string)($node['label'] ?? '안내');
        $html    = (string)($cfg['html'] ?? $cfg['body'] ?? '');
        if ($html === '') {
            $name = htmlspecialchars((string)($c['name'] ?? '고객'), ENT_QUOTES);
            $html = \Genie\Mailer::wrapHtml($subject, "<p>{$name}님, " . htmlspecialchars($subject, ENT_QUOTES) . "</p>");
        }
        $r = \Genie\Mailer::send($email, $subject, $html, ['pdo' => $pdo, 'tenant' => $tenant]);
        // [240차 약점②] 오운드채널 어트리뷰션 — 저니 이메일 발송 터치(주문 시 order_id 백필 → 저니 매출 멀티터치 귀속).
        if (($r['ok'] ?? false) && ($r['mode'] ?? '') !== 'unconfigured') { try { Attribution::recordOwnedTouch($pdo, $tenant, 'journey', $email, null, 'journey:'.(string)($enr['journey_id'] ?? ''), ['node' => 'email']); } catch (\Throwable $e) {} }
        // [현 차수] CRM 활동 기록 — 저니 발송도 빈도캡 카운트 대상에 포함(EmailMarketing 패턴 재사용).
        if (($r['ok'] ?? false) && ($r['mode'] ?? '') !== 'unconfigured') { self::recordCrmActivity($pdo, $tenant, (int)($enr['customer_id'] ?? 0), 'email_sent', 'email', ['journey_id' => (string)($enr['journey_id'] ?? ''), 'subject' => $subject]); }
        return ['action' => ($r['ok'] ?? false) ? 'email_sent' : 'email_failed', 'to' => $email, 'mode' => $r['mode'] ?? null];
    }

    private static function sendSmsNode(\PDO $pdo, string $tenant, array $enr, array $node): array
    {
        $c     = self::contact($pdo, $tenant, (int)($enr['customer_id'] ?? 0));
        $phone = preg_replace('/[^0-9]/', '', (string)($c['phone'] ?? ''));
        if ($phone === '') return ['action' => 'skipped', 'reason' => 'no_phone'];
        // [초고도화 #3] ★크로스채널 글로벌 빈도캡(이메일만 적용되던 비대칭 해소) + 조용시간(야간발송 제한·STO ON시 defer).
        $fc = CRM::commsFreqConfig($pdo, $tenant);
        if (CRM::isFrequencyCapped($pdo, $tenant, (int)($enr['customer_id'] ?? 0), $fc['cap'], $fc['window'])) return ['action' => 'skipped', 'reason' => 'frequency_capped'];
        if (!CRM::commsSendAllowedNow($fc)) return ['action' => 'deferred_quiet_hours', 'defer' => true, 'reason' => 'quiet_hours'];
        // [현 차수 동의센터 SSOT] 통합 발송 게이트 — SMS 채널 옵트아웃 단일소스(crm_channel_prefs). fail-open.
        // [R1 메시지손실 방지] 조용시간 거부는 노드 유지 defer(재시도)·그 외만 종결 skip.
        $g = CRM::isMarketingSendAllowed($tenant, (int)($enr['customer_id'] ?? 0), 'sms');
        if (!($g['allowed'] ?? false)) {
            if (strpos((string)($g['reason'] ?? ''), 'quiet') !== false) return ['action' => 'deferred_quiet_hours', 'defer' => true, 'reason' => (string)($g['reason'] ?? 'quiet_hours')];
            return ['action' => 'skipped', 'reason' => (string)($g['reason'] ?? '') ?: 'consent_opt_out'];
        }
        $cfg     = (array)($node['config'] ?? []);
        $content = (string)($cfg['content'] ?? $cfg['message'] ?? '') ?: (string)($node['label'] ?? '안내');
        $r = \Genie\NaverSms::sendPlatform($pdo, $phone, $content);
        if (($r['ok'] ?? false) && ($r['mode'] ?? '') !== 'unconfigured') { try { Attribution::recordOwnedTouch($pdo, $tenant, 'journey', null, $phone, 'journey:'.(string)($enr['journey_id'] ?? ''), ['node' => 'sms']); } catch (\Throwable $e) {} }
        // [현 차수] CRM 활동 기록 — 저니 발송도 빈도캡 카운트 대상에 포함.
        if (($r['ok'] ?? false) && ($r['mode'] ?? '') !== 'unconfigured') { self::recordCrmActivity($pdo, $tenant, (int)($enr['customer_id'] ?? 0), 'sms_sent', 'sms', ['journey_id' => (string)($enr['journey_id'] ?? '')]); }
        return ['action' => ($r['ok'] ?? false) ? 'sms_sent' : ('sms_' . ($r['mode'] ?? 'failed')), 'to' => $phone];
    }

    private static function sendKakaoNode(\PDO $pdo, string $tenant, array $enr, array $node): array
    {
        $c     = self::contact($pdo, $tenant, (int)($enr['customer_id'] ?? 0));
        $phone = preg_replace('/[^0-9]/', '', (string)($c['phone'] ?? ''));
        if ($phone === '') return ['action' => 'skipped', 'reason' => 'no_phone'];
        // [초고도화 #3] ★크로스채널 글로벌 빈도캡 + 조용시간(야간발송 제한·STO ON시 defer).
        $fc = CRM::commsFreqConfig($pdo, $tenant);
        if (CRM::isFrequencyCapped($pdo, $tenant, (int)($enr['customer_id'] ?? 0), $fc['cap'], $fc['window'])) return ['action' => 'skipped', 'reason' => 'frequency_capped'];
        if (!CRM::commsSendAllowedNow($fc)) return ['action' => 'deferred_quiet_hours', 'defer' => true, 'reason' => 'quiet_hours'];
        // [현 차수 동의센터 SSOT] 통합 발송 게이트 — 카카오 채널 옵트아웃 단일소스(crm_channel_prefs). fail-open.
        // [R1 메시지손실 방지] 조용시간 거부는 노드 유지 defer(재시도)·그 외만 종결 skip.
        $g = CRM::isMarketingSendAllowed($tenant, (int)($enr['customer_id'] ?? 0), 'kakao');
        if (!($g['allowed'] ?? false)) {
            if (strpos((string)($g['reason'] ?? ''), 'quiet') !== false) return ['action' => 'deferred_quiet_hours', 'defer' => true, 'reason' => (string)($g['reason'] ?? 'quiet_hours')];
            return ['action' => 'skipped', 'reason' => (string)($g['reason'] ?? '') ?: 'consent_opt_out'];
        }
        $cfg     = (array)($node['config'] ?? []);
        $tplCode = (string)($cfg['template_code'] ?? '');
        $content = (string)($cfg['content'] ?? '') ?: (string)($node['label'] ?? '안내');
        $r = KakaoChannel::sendOne($pdo, $tenant, $phone, $tplCode, $content);
        if (($r['ok'] ?? false) && ($r['mode'] ?? '') !== 'unconfigured') { try { Attribution::recordOwnedTouch($pdo, $tenant, 'journey', null, $phone, 'journey:'.(string)($enr['journey_id'] ?? ''), ['node' => 'kakao']); } catch (\Throwable $e) {} }
        // [현 차수] CRM 활동 기록 — 저니 발송도 빈도캡 카운트 대상에 포함.
        if (($r['ok'] ?? false) && ($r['mode'] ?? '') !== 'unconfigured') { self::recordCrmActivity($pdo, $tenant, (int)($enr['customer_id'] ?? 0), 'kakao_sent', 'kakao', ['journey_id' => (string)($enr['journey_id'] ?? '')]); }
        return ['action' => ($r['ok'] ?? false) ? 'kakao_sent' : ('kakao_' . ($r['mode'] ?? 'failed')), 'to' => $phone];
    }

    /** [현 차수] CRM 활동 기록 헬퍼 — 저니 발송이 빈도캡(crm_activities)에 카운트되도록.
     *  EmailMarketing/KakaoChannel 의 crm_activities INSERT 패턴 동일 재사용. customer_id 없으면 no-op. */
    private static function recordCrmActivity(\PDO $pdo, string $tenant, int $cid, string $type, string $channel, array $data): void
    {
        if ($cid <= 0) return;
        try {
            $pdo->prepare("INSERT INTO crm_activities (tenant_id, customer_id, type, channel, data, created_at) VALUES (:t,:cid,:ty,:ch,:data,:ca)")
                ->execute([':t'=>$tenant, ':cid'=>$cid, ':ty'=>$type, ':ch'=>$channel, ':data'=>json_encode($data, JSON_UNESCAPED_UNICODE), ':ca'=>self::now()]);
        } catch (\Throwable $e) {}
    }

    private static function logNode(\PDO $pdo, string $tenant, int $enrollId, int $jid, string $nodeId, string $type, string $action, array $result): void
    {
        try {
            $pdo->prepare("INSERT INTO journey_node_logs (tenant_id, enrollment_id, journey_id, node_id, node_type, action, result, executed_at)
                VALUES (:t, :eid, :jid, :nid, :ntype, :action, :result, :ea)")
                ->execute([
                    ':t'=>$tenant, ':eid'=>$enrollId, ':jid'=>$jid, ':nid'=>$nodeId, ':ntype'=>$type,
                    ':action'=>$action, ':result'=>json_encode($result, JSON_UNESCAPED_UNICODE), ':ea'=>self::now(),
                ]);
        } catch (\Throwable $e) {}
    }

    /* ─── GET /journey/templates ─── [현 차수] 베스트프랙티스 여정 추천(전체 노드/엣지 그래프) ──
       선택 시 그래프 그대로 생성 → 비주얼 캔버스에서 편집·실행. trigger_type 은 자동진입 트리거와 정합. */
    public static function listTemplates(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        $N = fn($id, $type, $label, $cfg, $x, $y) => ['id'=>$id, 'type'=>$type, 'label'=>$label, 'config'=>$cfg, 'x'=>$x, 'y'=>$y];
        $E = function ($from, $to, $when = null) { $e = ['from'=>$from, 'to'=>$to]; if ($when !== null) $e['when'] = $when; return $e; };
        $cx = 140;
        $templates = [
            ['id'=>'welcome_series', 'name'=>'🎉 신규 가입 환영 시리즈', 'category'=>'온보딩', 'goal'=>'첫 구매 전환',
             'description'=>'가입 즉시 환영 → 1일 후 제품 소개 → 3일 후 구매 여부 분기(미구매 시 첫 구매 쿠폰)', 'trigger_type'=>'signup', 'estimated_duration'=>'4일',
             'nodes'=>[$N('t1','trigger','가입 트리거',['type'=>'signup'],$cx,40), $N('e1','email','환영 이메일',['subject'=>'환영합니다! 🎉'],$cx,150), $N('d1','delay','1일 대기',['value'=>1,'unit'=>'days'],$cx,260), $N('e2','email','제품 소개',['subject'=>'이런 제품 어떠세요?'],$cx,370), $N('d2','delay','3일 대기',['value'=>3,'unit'=>'days'],$cx,480), $N('c1','condition','구매했나요?',['field'=>'revenue','op'=>'gt','value'=>0],$cx,590), $N('g1','goal','구매 전환',['label'=>'구매 전환'],$cx+150,700), $N('e3','email','첫 구매 쿠폰',['subject'=>'🎁 첫 구매 10% 쿠폰'],$cx-150,700)],
             'edges'=>[$E('t1','e1'),$E('e1','d1'),$E('d1','e2'),$E('e2','d2'),$E('d2','c1'),$E('c1','g1','true'),$E('c1','e3','false'),$E('e3','g1')]],

            ['id'=>'cart_abandonment', 'name'=>'🛒 장바구니 이탈 복구', 'category'=>'리타게팅', 'goal'=>'구매 완료',
             'description'=>'이탈 1시간 후 이메일 → 1일 후 카카오 알림톡 → 3일 후 할인 쿠폰', 'trigger_type'=>'abandon', 'estimated_duration'=>'3일',
             'nodes'=>[$N('t1','trigger','이탈 트리거',['type'=>'abandon'],$cx,40), $N('d1','delay','1시간 대기',['value'=>1,'unit'=>'hours'],$cx,150), $N('e1','email','장바구니 리마인더',['subject'=>'담아두신 상품이 기다려요'],$cx,260), $N('d2','delay','1일 대기',['value'=>1,'unit'=>'days'],$cx,370), $N('k1','kakao','카카오 알림톡',['content'=>'아직 망설이세요? 지금 구매 시 혜택!'],$cx,480), $N('d3','delay','3일 대기',['value'=>3,'unit'=>'days'],$cx,590), $N('e2','email','할인 쿠폰',['subject'=>'🎁 마지막 기회 15% 할인'],$cx,700), $N('g1','goal','구매 완료',['label'=>'구매 완료'],$cx,810)],
             'edges'=>[$E('t1','d1'),$E('d1','e1'),$E('e1','d2'),$E('d2','k1'),$E('k1','d3'),$E('d3','e2'),$E('e2','g1')]],

            ['id'=>'win_back', 'name'=>'🔄 이탈 고객 재활성화', 'category'=>'리텐션', 'goal'=>'재방문/재구매',
             'description'=>'개인화 이메일 → 7일 후 재방문 분기(미방문 시 특별 혜택 카카오)', 'trigger_type'=>'churn', 'estimated_duration'=>'7일',
             'nodes'=>[$N('t1','trigger','이탈 위험 트리거',['type'=>'churn'],$cx,40), $N('e1','email','개인화 리마인더',['subject'=>'오랜만이에요, 다시 만나요'],$cx,150), $N('d1','delay','7일 대기',['value'=>7,'unit'=>'days'],$cx,260), $N('c1','condition','재방문/재구매?',['field'=>'revenue','op'=>'gt','value'=>0],$cx,370), $N('g1','goal','재활성화',['label'=>'재활성화'],$cx+150,480), $N('k1','kakao','특별 혜택 카카오',['content'=>'당신만을 위한 특별 혜택'],$cx-150,480), $N('g2','goal','재활성화',['label'=>'재활성화'],$cx-150,590)],
             'edges'=>[$E('t1','e1'),$E('e1','d1'),$E('d1','c1'),$E('c1','g1','true'),$E('c1','k1','false'),$E('k1','g2')]],

            ['id'=>'vip_upgrade', 'name'=>'👑 VIP 전환 여정', 'category'=>'업셀', 'goal'=>'VIP 전환',
             'description'=>'고가치 세그먼트 진입 → VIP 혜택 이메일 → 전용 카카오 채널 초대', 'trigger_type'=>'segment', 'estimated_duration'=>'즉시',
             'nodes'=>[$N('t1','trigger','세그먼트 진입',['type'=>'segment'],$cx,40), $N('e1','email','VIP 혜택 안내',['subject'=>'👑 VIP 전용 혜택을 받으세요'],$cx,150), $N('k1','kakao','전용 채널 초대',['content'=>'VIP 전용 카카오 채널에 초대합니다'],$cx,260), $N('g1','goal','VIP 전환',['label'=>'VIP 전환'],$cx,370)],
             'edges'=>[$E('t1','e1'),$E('e1','k1'),$E('k1','g1')]],

            ['id'=>'post_purchase', 'name'=>'✅ 구매 후 관리 시리즈', 'category'=>'리텐션', 'goal'=>'재구매',
             'description'=>'구매 감사 → 2일 후 배송 안내 → 7일 후 리뷰 요청 → 30일 후 재구매 제안', 'trigger_type'=>'purchase', 'estimated_duration'=>'30일',
             'nodes'=>[$N('t1','trigger','구매 트리거',['type'=>'purchase'],$cx,40), $N('k1','kakao','구매 감사',['content'=>'구매 감사합니다! 🙏'],$cx,150), $N('d1','delay','2일 대기',['value'=>2,'unit'=>'days'],$cx,260), $N('e1','email','배송 안내',['subject'=>'상품이 출발했어요 📦'],$cx,370), $N('d2','delay','7일 대기',['value'=>7,'unit'=>'days'],$cx,480), $N('e2','email','리뷰 요청',['subject'=>'⭐ 리뷰 남기고 적립금 받기'],$cx,590), $N('d3','delay','30일 대기',['value'=>30,'unit'=>'days'],$cx,700), $N('e3','email','재구매 제안',['subject'=>'다시 필요하지 않으세요?'],$cx,810), $N('g1','goal','재구매',['label'=>'재구매'],$cx,920)],
             'edges'=>[$E('t1','k1'),$E('k1','d1'),$E('d1','e1'),$E('e1','d2'),$E('d2','e2'),$E('e2','d3'),$E('d3','e3'),$E('e3','g1')]],

            ['id'=>'review_request', 'name'=>'⭐ 구매 후 리뷰 요청', 'category'=>'UGC', 'goal'=>'리뷰 작성',
             'description'=>'구매 7일 후 리뷰 요청 이메일(적립금 인센티브)', 'trigger_type'=>'purchase', 'estimated_duration'=>'7일',
             'nodes'=>[$N('t1','trigger','구매 트리거',['type'=>'purchase'],$cx,40), $N('d1','delay','7일 대기',['value'=>7,'unit'=>'days'],$cx,150), $N('e1','email','리뷰 요청',['subject'=>'⭐ 리뷰 남기고 적립금 받기'],$cx,260), $N('g1','goal','리뷰 작성',['label'=>'리뷰 작성'],$cx,370)],
             'edges'=>[$E('t1','d1'),$E('d1','e1'),$E('e1','g1')]],

            ['id'=>'birthday_coupon', 'name'=>'🎂 생일 축하 쿠폰', 'category'=>'CRM', 'goal'=>'생일 구매',
             'description'=>'생일 세그먼트 진입 → 카카오 생일 축하 + 전용 쿠폰', 'trigger_type'=>'segment', 'estimated_duration'=>'즉시',
             'nodes'=>[$N('t1','trigger','생일 세그먼트',['type'=>'segment'],$cx,40), $N('k1','kakao','생일 축하 쿠폰',['content'=>'🎂 생일 축하합니다! 특별 쿠폰을 드려요'],$cx,150), $N('g1','goal','생일 구매',['label'=>'생일 구매'],$cx,260)],
             'edges'=>[$E('t1','k1'),$E('k1','g1')]],

            ['id'=>'replenishment', 'name'=>'🔁 소모품 재구매 주기 알림', 'category'=>'리텐션', 'goal'=>'재구매',
             'description'=>'구매 25일 후 재구매 시점 이메일 → 5일 후 미구매 시 카카오 리마인더(소모품/정기재구매)', 'trigger_type'=>'purchase', 'estimated_duration'=>'30일',
             'nodes'=>[$N('t1','trigger','구매 트리거',['type'=>'purchase'],$cx,40), $N('d1','delay','25일 대기',['value'=>25,'unit'=>'days'],$cx,150), $N('e1','email','재구매 시점 안내',['subject'=>'이제 다시 채울 시간이에요'],$cx,260), $N('d2','delay','5일 대기',['value'=>5,'unit'=>'days'],$cx,370), $N('c1','condition','재구매했나요?',['field'=>'revenue','op'=>'gt','value'=>0],$cx,480), $N('g1','goal','재구매',['label'=>'재구매'],$cx+150,590), $N('k1','kakao','재구매 리마인더',['content'=>'재구매 시 무료배송 혜택!'],$cx-150,590), $N('g2','goal','재구매',['label'=>'재구매'],$cx-150,700)],
             'edges'=>[$E('t1','d1'),$E('d1','e1'),$E('e1','d2'),$E('d2','c1'),$E('c1','g1','true'),$E('c1','k1','false'),$E('k1','g2')]],

            ['id'=>'back_in_stock', 'name'=>'📦 재입고 알림', 'category'=>'리타게팅', 'goal'=>'구매 완료',
             'description'=>'재입고 대기 세그먼트 진입 → 즉시 카카오 재입고 알림 + 이메일(품절 전 구매 유도)', 'trigger_type'=>'segment', 'estimated_duration'=>'즉시',
             'nodes'=>[$N('t1','trigger','재입고 대기 세그먼트',['type'=>'segment'],$cx,40), $N('k1','kakao','재입고 알림',['content'=>'기다리신 상품이 재입고됐어요! 🎉'],$cx,150), $N('e1','email','재입고 안내',['subject'=>'재입고 완료 — 품절 전 구매하세요'],$cx,260), $N('g1','goal','구매 완료',['label'=>'구매 완료'],$cx,370)],
             'edges'=>[$E('t1','k1'),$E('k1','e1'),$E('e1','g1')]],

            ['id'=>'browse_abandonment', 'name'=>'👀 상품 조회 이탈 복구', 'category'=>'리타게팅', 'goal'=>'구매 완료',
             'description'=>'상품 조회 후 미구매 세그먼트 → 2시간 후 본 상품 리마인더 → 1일 후 미구매 시 첫구매 할인', 'trigger_type'=>'segment', 'estimated_duration'=>'2일',
             'nodes'=>[$N('t1','trigger','조회 이탈 세그먼트',['type'=>'segment'],$cx,40), $N('d1','delay','2시간 대기',['value'=>2,'unit'=>'hours'],$cx,150), $N('e1','email','본 상품 리마인더',['subject'=>'관심 가지신 상품, 아직 고민 중이세요?'],$cx,260), $N('d2','delay','1일 대기',['value'=>1,'unit'=>'days'],$cx,370), $N('c1','condition','구매했나요?',['field'=>'revenue','op'=>'gt','value'=>0],$cx,480), $N('g1','goal','구매 완료',['label'=>'구매 완료'],$cx+150,590), $N('e2','email','할인 제안',['subject'=>'🎁 첫 구매 10% 할인'],$cx-150,590), $N('g2','goal','구매 완료',['label'=>'구매 완료'],$cx-150,700)],
             'edges'=>[$E('t1','d1'),$E('d1','e1'),$E('e1','d2'),$E('d2','c1'),$E('c1','g1','true'),$E('c1','e2','false'),$E('e2','g2')]],

            ['id'=>'ab_welcome', 'name'=>'🧪 환영 메시지 A/B 테스트', 'category'=>'실험', 'goal'=>'전환(승자)',
             'description'=>'가입 후 A/B 50:50 분배(버전 A vs B 이메일) → 성과 비교로 승자 결정', 'trigger_type'=>'signup', 'estimated_duration'=>'즉시',
             'nodes'=>[$N('t1','trigger','가입 트리거',['type'=>'signup'],$cx,40), $N('s1','split','A/B 50:50',['weight_a'=>50],$cx,150), $N('e1','email','버전 A',['subject'=>'[A] 환영합니다 — 혜택 중심'],$cx-150,270), $N('e2','email','버전 B',['subject'=>'[B] 환영합니다 — 스토리 중심'],$cx+150,270), $N('g1','goal','전환',['label'=>'전환'],$cx,390)],
             'edges'=>[$E('t1','s1'),$E('s1','e1','a'),$E('s1','e2','b'),$E('e1','g1'),$E('e2','g1')]],
        ];
        foreach ($templates as &$tpl) { $tpl['nodes_count'] = count($tpl['nodes']); }
        unset($tpl);
        return self::json($res, ['ok' => true, 'templates' => $templates]);
    }
}
