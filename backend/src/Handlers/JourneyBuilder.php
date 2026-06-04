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

        $log = self::executeNode($pdo, $tenant, $enrollId, $jid, $startNode, $nodes);
        return self::json($res, ['ok' => true, 'enrollment_id' => $enrollId, 'first_action' => $log]);
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

    private static function executeNode(\PDO $pdo, string $tenant, int $enrollId, int $jid, string $nodeId, array $nodes): array
    {
        $node = null;
        foreach ($nodes as $n) { if (($n['id'] ?? null) === $nodeId) { $node = $n; break; } }
        if (!$node) return ['skipped' => true];

        $result = ['node_id' => $nodeId, 'type' => $node['type']];
        switch ($node['type']) {
            case 'email':
                $result['action'] = 'email_queued'; $result['template_id'] = $node['config']['template_id'] ?? null; break;
            case 'kakao':
                $result['action'] = 'kakao_queued'; $result['template_code'] = $node['config']['template_code'] ?? null; break;
            case 'delay':
                $result['action'] = 'waiting';
                $result['resume_at'] = gmdate('Y-m-d H:i:s', strtotime("+{$node['config']['value']} {$node['config']['unit']}") ?: time()); break;
            default:
                $result['action'] = 'processed';
        }
        $pdo->prepare("INSERT INTO journey_node_logs (tenant_id, enrollment_id, journey_id, node_id, node_type, action, result, executed_at)
            VALUES (:t, :eid, :jid, :nid, :ntype, :action, :result, :ea)
        ")->execute([
            ':t'=>$tenant, ':eid'=>$enrollId, ':jid'=>$jid, ':nid'=>$nodeId, ':ntype'=>$node['type'], ':action'=>$result['action'] ?? 'unknown', ':result'=>json_encode($result), ':ea'=>self::now(),
        ]);
        return $result;
    }

    /* ─── GET /journey/templates ─── 여정 템플릿(정적) ────────── */
    public static function listTemplates(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        $templates = [
            ['id'=>'welcome_series', 'name'=>'🎉 신규 가입 환영 시리즈', 'description'=>'가입 즉시 환영 이메일 → 3일 후 제품 소개 → 7일 후 첫 구매 쿠폰', 'trigger_type'=>'signup', 'estimated_duration'=>'7일', 'nodes_count'=>6],
            ['id'=>'cart_abandonment', 'name'=>'🛒 장바구니 이탈 복구', 'description'=>'이탈 1시간 후 이메일 → 24시간 후 카카오 알림톡 → 3일 후 할인 쿠폰', 'trigger_type'=>'cart_abandoned', 'estimated_duration'=>'3일', 'nodes_count'=>5],
            ['id'=>'win_back', 'name'=>'🔄 이탈 고객 재활성화', 'description'=>'90일 미구매 고객 → 개인화 이메일 → 7일 후 특별 혜택 카카오 발송', 'trigger_type'=>'churned', 'estimated_duration'=>'14일', 'nodes_count'=>4],
            ['id'=>'vip_upgrade', 'name'=>'👑 VIP 전환 여정', 'description'=>'LTV 상위 20% 세그먼트 진입 → VIP 혜택 이메일 → 전용 카카오 채널 초대', 'trigger_type'=>'segment_entered', 'estimated_duration'=>'즉시', 'nodes_count'=>3],
            ['id'=>'post_purchase', 'name'=>'✅ 구매 후 관리 시리즈', 'description'=>'구매 감사 → 배송 알림 → 7일 후 리뷰 요청 → 30일 후 재구매 제안', 'trigger_type'=>'purchase', 'estimated_duration'=>'30일', 'nodes_count'=>7],
        ];
        return self::json($res, ['ok' => true, 'templates' => $templates]);
    }
}
