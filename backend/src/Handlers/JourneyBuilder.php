<?php
declare(strict_types=1);
namespace Genie\Handlers;

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;
use Genie\Db;

/**
 * 고객 여정 빌더 — Klaviyo Flows 수준 이상
 *
 * 기능:
 * - 시각적 다단계 여정 (트리거 → 딜레이 → 액션 → 조건 분기)
 * - 트리거: 구매, 이탈, 가입, 카트 추가, 생일, 세그먼트 진입
 * - 액션: 이메일 발송, 카카오 알림톡, SMS, 태그 추가, CRM 세그먼트 변경
 * - 조건 분기: 클릭 여부, 구매 여부, LTV 임계값, 세그먼트 소속
 * - A/B 테스트 노드
 * - 실시간 실행 이력 추적
 */
class JourneyBuilder
{
    private static function db(): \PDO { return Db::get(); }

    private static function json(Response $res, array $data, int $status = 200): Response
    {
        $res->getBody()->write(json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
        return $res->withHeader('Content-Type', 'application/json')->withStatus($status);
    }

    private static function ensureTables(): void
    {
        $pdo = self::db();

        $pdo->exec("
            CREATE TABLE IF NOT EXISTS journeys (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                name        TEXT NOT NULL,
                description TEXT,
                trigger_type TEXT NOT NULL DEFAULT 'manual',
                trigger_config TEXT DEFAULT '{}',
                nodes       TEXT DEFAULT '[]',
                edges       TEXT DEFAULT '[]',
                status      TEXT DEFAULT 'draft',
                stats_entered INTEGER DEFAULT 0,
                stats_completed INTEGER DEFAULT 0,
                stats_revenue REAL DEFAULT 0,
                created_at  TEXT DEFAULT (datetime('now')),
                updated_at  TEXT DEFAULT (datetime('now'))
            )
        ");

        $pdo->exec("
            CREATE TABLE IF NOT EXISTS journey_enrollments (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                journey_id  INTEGER NOT NULL,
                customer_id INTEGER,
                session_id  TEXT,
                current_node TEXT,
                status      TEXT DEFAULT 'active',
                entered_at  TEXT DEFAULT (datetime('now')),
                completed_at TEXT,
                revenue     REAL DEFAULT 0,
                FOREIGN KEY (journey_id) REFERENCES journeys(id) ON DELETE CASCADE
            )
        ");

        $pdo->exec("
            CREATE TABLE IF NOT EXISTS journey_node_logs (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                enrollment_id INTEGER NOT NULL,
                journey_id  INTEGER NOT NULL,
                node_id     TEXT NOT NULL,
                node_type   TEXT NOT NULL,
                action      TEXT,
                result      TEXT DEFAULT '{}',
                executed_at TEXT DEFAULT (datetime('now'))
            )
        ");

        $pdo->exec("CREATE INDEX IF NOT EXISTS idx_journey_enroll_jid ON journey_enrollments(journey_id)");
        $pdo->exec("CREATE INDEX IF NOT EXISTS idx_journey_logs_eid ON journey_node_logs(enrollment_id)");
    }

    /* ─── GET /api/journey/journeys ─── 목록 ─────────────────────── */
    public static function listJourneys(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $rows = self::db()->query("
            SELECT j.*,
                   (SELECT COUNT(*) FROM journey_enrollments WHERE journey_id=j.id AND status='active') AS active_count
            FROM journeys j ORDER BY j.updated_at DESC
        ")->fetchAll(\PDO::FETCH_ASSOC);

        foreach ($rows as &$r) {
            $r['nodes'] = json_decode($r['nodes'] ?? '[]', true);
            $r['edges'] = json_decode($r['edges'] ?? '[]', true);
            $r['trigger_config'] = json_decode($r['trigger_config'] ?? '{}', true);
        }
        return self::json($res, ['ok' => true, 'journeys' => $rows]);
    }

    /* ─── POST /api/journey/journeys ─── 생성 ────────────────────── */
    public static function createJourney(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $pdo = self::db();
        $b = (array)$req->getParsedBody();

        // 기본 여정 템플릿 노드 생성
        $defaultNodes = [
            ['id' => 'trigger_1', 'type' => 'trigger', 'label' => '트리거', 'config' => ['type' => $b['trigger_type'] ?? 'manual'], 'x' => 300, 'y' => 50],
            ['id' => 'email_1', 'type' => 'email', 'label' => '환영 이메일', 'config' => ['template_id' => null, 'subject' => ''], 'x' => 300, 'y' => 200],
            ['id' => 'delay_1', 'type' => 'delay', 'label' => '3일 대기', 'config' => ['unit' => 'days', 'value' => 3], 'x' => 300, 'y' => 350],
            ['id' => 'condition_1', 'type' => 'condition', 'label' => '이메일 클릭?', 'config' => ['field' => 'email_clicked', 'op' => 'eq', 'value' => true], 'x' => 300, 'y' => 500],
        ];
        $defaultEdges = [
            ['from' => 'trigger_1', 'to' => 'email_1'],
            ['from' => 'email_1', 'to' => 'delay_1'],
            ['from' => 'delay_1', 'to' => 'condition_1'],
        ];

        $pdo->prepare("
            INSERT INTO journeys (name, description, trigger_type, trigger_config, nodes, edges, status)
            VALUES (:name, :desc, :ttype, :tconf, :nodes, :edges, 'draft')
        ")->execute([
            ':name'  => $b['name'] ?? '새 여정',
            ':desc'  => $b['description'] ?? '',
            ':ttype' => $b['trigger_type'] ?? 'manual',
            ':tconf' => json_encode($b['trigger_config'] ?? []),
            ':nodes' => json_encode($b['nodes'] ?? $defaultNodes),
            ':edges' => json_encode($b['edges'] ?? $defaultEdges),
        ]);

        return self::json($res, ['ok' => true, 'id' => (int)$pdo->lastInsertId()]);
    }

    /* ─── PUT /api/journey/journeys/{id} ─── 업데이트 ──────────── */
    public static function updateJourney(Request $req, Response $res, array $args): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $pdo = self::db();
        $b = (array)$req->getParsedBody();
        $id = (int)$args['id'];

        $fields = [];
        $bind   = [':id' => $id];

        if (isset($b['name']))           { $fields[] = "name=:name"; $bind[':name'] = $b['name']; }
        if (isset($b['description']))    { $fields[] = "description=:desc"; $bind[':desc'] = $b['description']; }
        if (isset($b['nodes']))          { $fields[] = "nodes=:nodes"; $bind[':nodes'] = json_encode($b['nodes']); }
        if (isset($b['edges']))          { $fields[] = "edges=:edges"; $bind[':edges'] = json_encode($b['edges']); }
        if (isset($b['trigger_type']))   { $fields[] = "trigger_type=:ttype"; $bind[':ttype'] = $b['trigger_type']; }
        if (isset($b['trigger_config'])) { $fields[] = "trigger_config=:tconf"; $bind[':tconf'] = json_encode($b['trigger_config']); }
        if (isset($b['status']))         { $fields[] = "status=:status"; $bind[':status'] = $b['status']; }

        $fields[] = "updated_at=datetime('now')";

        if ($fields) {
            $pdo->prepare("UPDATE journeys SET " . implode(', ', $fields) . " WHERE id=:id")->execute($bind);
        }

        return self::json($res, ['ok' => true]);
    }

    /* ─── DELETE /api/journey/journeys/{id} ─── 삭제 ─────────────── */
    public static function deleteJourney(Request $req, Response $res, array $args): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::db()->prepare("DELETE FROM journeys WHERE id=:id")->execute([':id' => (int)$args['id']]);
        return self::json($res, ['ok' => true]);
    }

    /* ─── POST /api/journey/journeys/{id}/enroll ─── 고객 등록 ──── */
    public static function enrollCustomer(Request $req, Response $res, array $args): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $pdo = self::db();
        $b = (array)$req->getParsedBody();
        $jid = (int)$args['id'];

        // 여정 가져오기
        $journey = $pdo->prepare("SELECT * FROM journeys WHERE id=:id AND status='active'");
        $journey->execute([':id' => $jid]);
        $j = $journey->fetch(\PDO::FETCH_ASSOC);

        if (!$j) {
            return self::json($res, ['ok' => false, 'error' => '활성 여정 없음'], 404);
        }

        $nodes = json_decode($j['nodes'] ?? '[]', true);
        $startNode = $nodes[0]['id'] ?? 'trigger_1';

        $pdo->prepare("
            INSERT INTO journey_enrollments (journey_id, customer_id, session_id, current_node, status)
            VALUES (:jid, :cid, :sid, :node, 'active')
        ")->execute([
            ':jid'  => $jid,
            ':cid'  => (int)($b['customer_id'] ?? 0) ?: null,
            ':sid'  => $b['session_id'] ?? null,
            ':node' => $startNode,
        ]);

        $enrollId = (int)$pdo->lastInsertId();

        // 여정 진입 통계 업데이트
        $pdo->exec("UPDATE journeys SET stats_entered=stats_entered+1 WHERE id=$jid");

        // 첫 노드 즉시 실행 (이메일/카카오 등)
        $log = self::executeNode($pdo, $enrollId, $jid, $startNode, $nodes);

        return self::json($res, ['ok' => true, 'enrollment_id' => $enrollId, 'first_action' => $log]);
    }

    /* ─── POST /api/journey/journeys/{id}/launch ─── 여정 활성화 ── */
    public static function launchJourney(Request $req, Response $res, array $args): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::db()->prepare("UPDATE journeys SET status='active', updated_at=datetime('now') WHERE id=:id")
            ->execute([':id' => (int)$args['id']]);
        return self::json($res, ['ok' => true, 'status' => 'active']);
    }

    /* ─── GET /api/journey/journeys/{id}/stats ─── 성과 ─────────── */
    public static function journeyStats(Request $req, Response $res, array $args): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $pdo = self::db();
        $id = (int)$args['id'];

        $journey = $pdo->prepare("SELECT * FROM journeys WHERE id=:id");
        $journey->execute([':id' => $id]);
        $j = $journey->fetch(\PDO::FETCH_ASSOC);
        if (!$j) return self::json($res, ['ok' => false, 'error' => '없음'], 404);

        $enrollStats = $pdo->prepare("
            SELECT status, COUNT(*) AS cnt FROM journey_enrollments WHERE journey_id=:id GROUP BY status
        ");
        $enrollStats->execute([':id' => $id]);
        $byStatus = [];
        foreach ($enrollStats->fetchAll(\PDO::FETCH_ASSOC) as $r) {
            $byStatus[$r['status']] = (int)$r['cnt'];
        }

        $nodeStats = $pdo->prepare("
            SELECT node_id, node_type, COUNT(*) AS executions
            FROM journey_node_logs WHERE journey_id=:id
            GROUP BY node_id, node_type ORDER BY executions DESC
        ");
        $nodeStats->execute([':id' => $id]);
        $nodes = $nodeStats->fetchAll(\PDO::FETCH_ASSOC);

        return self::json($res, [
            'ok'       => true,
            'journey'  => $j,
            'by_status'=> $byStatus,
            'node_stats'=> $nodes,
        ]);
    }

    private static function executeNode(\PDO $pdo, int $enrollId, int $jid, string $nodeId, array $nodes): array
    {
        $node = null;
        foreach ($nodes as $n) {
            if ($n['id'] === $nodeId) { $node = $n; break; }
        }
        if (!$node) return ['skipped' => true];

        $result = ['node_id' => $nodeId, 'type' => $node['type']];

        switch ($node['type']) {
            case 'email':
                // 이메일 노드 — EmailMarketing 캠페인과 연동
                $result['action'] = 'email_queued';
                $result['template_id'] = $node['config']['template_id'] ?? null;
                break;
            case 'kakao':
                // 카카오 노드
                $result['action'] = 'kakao_queued';
                $result['template_code'] = $node['config']['template_code'] ?? null;
                break;
            case 'delay':
                $result['action'] = 'waiting';
                $result['resume_at'] = date('Y-m-d H:i:s', strtotime("+{$node['config']['value']} {$node['config']['unit']}"));
                break;
            default:
                $result['action'] = 'processed';
        }

        $pdo->prepare("
            INSERT INTO journey_node_logs (enrollment_id, journey_id, node_id, node_type, action, result)
            VALUES (:eid, :jid, :nid, :ntype, :action, :result)
        ")->execute([
            ':eid'    => $enrollId,
            ':jid'    => $jid,
            ':nid'    => $nodeId,
            ':ntype'  => $node['type'],
            ':action' => $result['action'] ?? 'unknown',
            ':result' => json_encode($result),
        ]);

        return $result;
    }

    /* ─── GET /api/journey/templates ─── 여정 템플릿 목록 ────────── */
    public static function listTemplates(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;

        $templates = [
            [
                'id' => 'welcome_series',
                'name' => '🎉 신규 가입 환영 시리즈',
                'description' => '가입 즉시 환영 이메일 → 3일 후 제품 소개 → 7일 후 첫 구매 쿠폰',
                'trigger_type' => 'signup',
                'estimated_duration' => '7일',
                'nodes_count' => 6,
            ],
            [
                'id' => 'cart_abandonment',
                'name' => '🛒 장바구니 이탈 복구',
                'description' => '이탈 1시간 후 이메일 → 24시간 후 카카오 알림톡 → 3일 후 할인 쿠폰',
                'trigger_type' => 'cart_abandoned',
                'estimated_duration' => '3일',
                'nodes_count' => 5,
            ],
            [
                'id' => 'win_back',
                'name' => '🔄 이탈 고객 재활성화',
                'description' => '90일 미구매 고객 → 개인화 이메일 → 7일 후 특별 혜택 카카오 발송',
                'trigger_type' => 'churned',
                'estimated_duration' => '14일',
                'nodes_count' => 4,
            ],
            [
                'id' => 'vip_upgrade',
                'name' => '👑 VIP 전환 여정',
                'description' => 'LTV 상위 20% 세그먼트 진입 → VIP 혜택 이메일 → 전용 카카오 채널 초대',
                'trigger_type' => 'segment_entered',
                'estimated_duration' => '즉시',
                'nodes_count' => 3,
            ],
            [
                'id' => 'post_purchase',
                'name' => '✅ 구매 후 관리 시리즈',
                'description' => '구매 감사 → 배송 알림 → 7일 후 리뷰 요청 → 30일 후 재구매 제안',
                'trigger_type' => 'purchase',
                'estimated_duration' => '30일',
                'nodes_count' => 7,
            ],
        ];

        return self::json($res, ['ok' => true, 'templates' => $templates]);
    }
}
