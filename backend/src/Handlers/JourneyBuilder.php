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
        } else {
            $pdo->exec("CREATE TABLE IF NOT EXISTS journeys (id INTEGER PRIMARY KEY AUTOINCREMENT, tenant_id TEXT NOT NULL DEFAULT 'demo', name TEXT NOT NULL, description TEXT, trigger_type TEXT NOT NULL DEFAULT 'manual', trigger_config TEXT DEFAULT '{}', nodes TEXT DEFAULT '[]', edges TEXT DEFAULT '[]', status TEXT DEFAULT 'draft', stats_entered INTEGER DEFAULT 0, stats_completed INTEGER DEFAULT 0, stats_revenue REAL DEFAULT 0, created_at TEXT, updated_at TEXT)");
            $pdo->exec("CREATE TABLE IF NOT EXISTS journey_enrollments (id INTEGER PRIMARY KEY AUTOINCREMENT, tenant_id TEXT NOT NULL DEFAULT 'demo', journey_id INTEGER NOT NULL, customer_id INTEGER, session_id TEXT, current_node TEXT, status TEXT DEFAULT 'active', entered_at TEXT, completed_at TEXT, revenue REAL DEFAULT 0)");
            $pdo->exec("CREATE TABLE IF NOT EXISTS journey_node_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, tenant_id TEXT NOT NULL DEFAULT 'demo', enrollment_id INTEGER NOT NULL, journey_id INTEGER NOT NULL, node_id TEXT NOT NULL, node_type TEXT NOT NULL, action TEXT, result TEXT DEFAULT '{}', executed_at TEXT)");
            $pdo->exec("CREATE INDEX IF NOT EXISTS idx_journey_enroll_jid ON journey_enrollments(journey_id)");
            $pdo->exec("CREATE INDEX IF NOT EXISTS idx_journey_logs_eid ON journey_node_logs(enrollment_id)");
        }
        foreach (['journeys','journey_enrollments','journey_node_logs'] as $tbl) {
            try { $pdo->exec("ALTER TABLE {$tbl} ADD COLUMN tenant_id VARCHAR(100) NOT NULL DEFAULT 'demo'"); } catch (\Throwable $e) {}
        }
        // 206차 #2: 실행러너 상태머신 컬럼(delay resume + cron 픽업).
        foreach (['resume_at VARCHAR(32)', 'last_run_at VARCHAR(32)', 'converted INT DEFAULT 0'] as $col) {
            try { $pdo->exec("ALTER TABLE journey_enrollments ADD COLUMN {$col}"); } catch (\Throwable $e) {}
        }
        // [현 차수] 전환 목표(goal) 집계 컬럼.
        try { $pdo->exec("ALTER TABLE journeys ADD COLUMN stats_converted INT DEFAULT 0"); } catch (\Throwable $e) {}
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

        $pdo->prepare("INSERT INTO journeys (tenant_id, name, description, trigger_type, trigger_config, nodes, edges, status, created_at, updated_at)
            VALUES (:t, :name, :desc, :ttype, :tconf, :nodes, :edges, 'draft', :ca, :ua)
        ")->execute([
            ':t'=>$tenant, ':name'=>$b['name'] ?? '새 여정', ':desc'=>$b['description'] ?? '', ':ttype'=>$b['trigger_type'] ?? 'manual',
            ':tconf'=>json_encode($b['trigger_config'] ?? []), ':nodes'=>json_encode($b['nodes'] ?? $defaultNodes), ':edges'=>json_encode($b['edges'] ?? $defaultEdges), ':ca'=>$now, ':ua'=>$now,
        ]);
        return self::json($res, ['ok' => true, 'id' => (int)$pdo->lastInsertId()]);
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
        if (isset($b['trigger_type']))   { $fields[] = "trigger_type=:ttype"; $bind[':ttype'] = $b['trigger_type']; }
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

            // ── condition: 분기 ──
            if ($type === 'condition') {
                $branch = self::evalCondition($pdo, $tenant, $enr, $node);
                self::logNode($pdo, $tenant, $enrollId, $jid, $nodeId, 'condition', 'evaluated', ['branch' => $branch]);
                $actions[] = ['node'=>$nodeId, 'action'=>'condition', 'branch'=>$branch];
                $nodeId = self::nextNode($edges, $nodeId, $branch);
                continue;
            }

            // ── [현 차수] split: A/B 분기(가중치, 등록ID 결정적 분배 — 동일 고객 동일 분기·재현가능) ──
            if ($type === 'split') {
                $cfg = (array)($node['config'] ?? []);
                $wA  = max(0, min(100, (int)($cfg['weight_a'] ?? 50)));
                $pick = (($enrollId * 2654435761 + 1) % 100) < $wA ? 'a' : 'b';
                self::logNode($pdo, $tenant, $enrollId, $jid, $nodeId, 'split', 'split', ['branch'=>$pick, 'weight_a'=>$wA]);
                $actions[] = ['node'=>$nodeId, 'action'=>'split', 'branch'=>$pick];
                $nodeId = self::nextNode($edges, $nodeId, $pick);
                continue;
            }

            // ── [현 차수] goal: 전환 목표 도달 기록(여정·등록건 전환 카운트) ──
            if ($type === 'goal') {
                self::logNode($pdo, $tenant, $enrollId, $jid, $nodeId, 'goal', 'goal_reached', ['goal'=>(string)($node['label'] ?? 'goal')]);
                try { $pdo->prepare("UPDATE journeys SET stats_converted=stats_converted+1 WHERE id=:id AND tenant_id=:t")->execute([':id'=>$jid, ':t'=>$tenant]); } catch (\Throwable $e) {}
                try { $pdo->prepare("UPDATE journey_enrollments SET converted=1 WHERE id=:id AND tenant_id=:t")->execute([':id'=>$enrollId, ':t'=>$tenant]); } catch (\Throwable $e) {}
                $actions[] = ['node'=>$nodeId, 'action'=>'goal_reached'];
                $nodeId = self::nextNode($edges, $nodeId, null);
                continue;
            }

            // ── 실행 노드(email/kakao/sms/action/...) ──
            switch ($type) {
                case 'email': $a = self::sendEmailNode($pdo, $tenant, $enr, $node); break;
                case 'kakao': $a = self::sendKakaoNode($pdo, $tenant, $enr, $node); break;
                case 'sms':   $a = self::sendSmsNode($pdo, $tenant, $enr, $node); break;
                default:      $a = ['action' => 'processed']; break;
            }
            self::logNode($pdo, $tenant, $enrollId, $jid, $nodeId, $type, (string)($a['action'] ?? 'processed'), $a);
            $actions[] = ['node'=>$nodeId] + $a;

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
        }
        $actual = $facts[$field] ?? null; // email_clicked 등 서버 미추적 신호 → null → 보수적 false
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
            $s = $pdo->prepare("SELECT email, phone, name FROM crm_customers WHERE id=:id AND tenant_id=:t");
            $s->execute([':id'=>$cid, ':t'=>$tenant]);
            return $s->fetch(\PDO::FETCH_ASSOC) ?: [];
        } catch (\Throwable $e) { return []; }
    }

    private static function sendEmailNode(\PDO $pdo, string $tenant, array $enr, array $node): array
    {
        $c     = self::contact($pdo, $tenant, (int)($enr['customer_id'] ?? 0));
        $email = trim((string)($c['email'] ?? ''));
        if ($email === '') return ['action' => 'skipped', 'reason' => 'no_email'];
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
        return ['action' => ($r['ok'] ?? false) ? 'email_sent' : 'email_failed', 'to' => $email, 'mode' => $r['mode'] ?? null];
    }

    private static function sendSmsNode(\PDO $pdo, string $tenant, array $enr, array $node): array
    {
        $c     = self::contact($pdo, $tenant, (int)($enr['customer_id'] ?? 0));
        $phone = preg_replace('/[^0-9]/', '', (string)($c['phone'] ?? ''));
        if ($phone === '') return ['action' => 'skipped', 'reason' => 'no_phone'];
        $cfg     = (array)($node['config'] ?? []);
        $content = (string)($cfg['content'] ?? $cfg['message'] ?? '') ?: (string)($node['label'] ?? '안내');
        $r = \Genie\NaverSms::sendPlatform($pdo, $phone, $content);
        if (($r['ok'] ?? false) && ($r['mode'] ?? '') !== 'unconfigured') { try { Attribution::recordOwnedTouch($pdo, $tenant, 'journey', null, $phone, 'journey:'.(string)($enr['journey_id'] ?? ''), ['node' => 'sms']); } catch (\Throwable $e) {} }
        return ['action' => ($r['ok'] ?? false) ? 'sms_sent' : ('sms_' . ($r['mode'] ?? 'failed')), 'to' => $phone];
    }

    private static function sendKakaoNode(\PDO $pdo, string $tenant, array $enr, array $node): array
    {
        $c     = self::contact($pdo, $tenant, (int)($enr['customer_id'] ?? 0));
        $phone = preg_replace('/[^0-9]/', '', (string)($c['phone'] ?? ''));
        if ($phone === '') return ['action' => 'skipped', 'reason' => 'no_phone'];
        $cfg     = (array)($node['config'] ?? []);
        $tplCode = (string)($cfg['template_code'] ?? '');
        $content = (string)($cfg['content'] ?? '') ?: (string)($node['label'] ?? '안내');
        $r = KakaoChannel::sendOne($pdo, $tenant, $phone, $tplCode, $content);
        if (($r['ok'] ?? false) && ($r['mode'] ?? '') !== 'unconfigured') { try { Attribution::recordOwnedTouch($pdo, $tenant, 'journey', null, $phone, 'journey:'.(string)($enr['journey_id'] ?? ''), ['node' => 'kakao']); } catch (\Throwable $e) {} }
        return ['action' => ($r['ok'] ?? false) ? 'kakao_sent' : ('kakao_' . ($r['mode'] ?? 'failed')), 'to' => $phone];
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
