<?php
declare(strict_types=1);
namespace Genie\Handlers;

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;
use Genie\Db;

class CRM
{
    private static function db(): \PDO { return Db::get(); }

    /* ─── DB 초기화 ───────────────────────────────────────────────────── */
    private static function ensureTables(): void
    {
        $pdo = self::db();
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS crm_customers (
                id            INTEGER PRIMARY KEY AUTOINCREMENT,
                email         TEXT NOT NULL UNIQUE,
                name          TEXT,
                phone         TEXT,
                kakao_id      TEXT,
                grade         TEXT DEFAULT 'normal',
                ltv           REAL DEFAULT 0,
                rfm_r         INTEGER DEFAULT 0,
                rfm_f         INTEGER DEFAULT 0,
                rfm_m         INTEGER DEFAULT 0,
                rfm_score     REAL DEFAULT 0,
                tags          TEXT DEFAULT '[]',
                memo          TEXT,
                created_at    TEXT DEFAULT (datetime('now')),
                updated_at    TEXT DEFAULT (datetime('now'))
            )
        ");
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS crm_activities (
                id            INTEGER PRIMARY KEY AUTOINCREMENT,
                customer_id   INTEGER NOT NULL,
                type          TEXT NOT NULL,
                channel       TEXT DEFAULT 'direct',
                amount        REAL,
                data          TEXT DEFAULT '{}',
                created_at    TEXT DEFAULT (datetime('now')),
                FOREIGN KEY (customer_id) REFERENCES crm_customers(id) ON DELETE CASCADE
            )
        ");
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS crm_segments (
                id            INTEGER PRIMARY KEY AUTOINCREMENT,
                name          TEXT NOT NULL,
                description   TEXT,
                rules         TEXT DEFAULT '[]',
                auto_refresh  INTEGER DEFAULT 1,
                member_count  INTEGER DEFAULT 0,
                color         TEXT DEFAULT '#4f8ef7',
                created_at    TEXT DEFAULT (datetime('now')),
                updated_at    TEXT DEFAULT (datetime('now'))
            )
        ");
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS crm_segment_members (
                segment_id    INTEGER NOT NULL,
                customer_id   INTEGER NOT NULL,
                added_at      TEXT DEFAULT (datetime('now')),
                PRIMARY KEY (segment_id, customer_id)
            )
        ");
        // 인덱스
        $pdo->exec("CREATE INDEX IF NOT EXISTS idx_crm_activities_cid ON crm_activities(customer_id)");
        $pdo->exec("CREATE INDEX IF NOT EXISTS idx_crm_activities_type ON crm_activities(type)");
    }

    /* ─── GET /api/crm/customers ─────────────────────────────────────── */
    public static function listCustomers(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $pdo = self::db();
        $p   = $req->getQueryParams();
        $page  = max(1, (int)($p['page'] ?? 1));
        $limit = min(100, max(10, (int)($p['limit'] ?? 20)));
        $offset = ($page - 1) * $limit;
        $search = $p['q'] ?? '';
        $grade  = $p['grade'] ?? '';
        $segment = $p['segment_id'] ?? '';

        $where = ['1=1'];
        $bind  = [];
        if ($search) {
            $where[] = "(c.email LIKE :q OR c.name LIKE :q OR c.phone LIKE :q)";
            $bind[':q'] = "%$search%";
        }
        if ($grade) { $where[] = "c.grade = :grade"; $bind[':grade'] = $grade; }
        $join = '';
        if ($segment) {
            $join    = "JOIN crm_segment_members sm ON sm.customer_id = c.id AND sm.segment_id = :seg";
            $bind[':seg'] = (int)$segment;
        }
        $whereStr = implode(' AND ', $where);

        $totalRow = $pdo->prepare("SELECT COUNT(*) FROM crm_customers c $join WHERE $whereStr");
        $totalRow->execute($bind);
        $total = (int)$totalRow->fetchColumn();

        $stmt = $pdo->prepare("
            SELECT c.*, 
                   (SELECT COUNT(*) FROM crm_activities WHERE customer_id=c.id AND type='purchase') AS purchase_count,
                   (SELECT MAX(created_at) FROM crm_activities WHERE customer_id=c.id AND type='purchase') AS last_purchase
            FROM crm_customers c $join
            WHERE $whereStr
            ORDER BY c.updated_at DESC
            LIMIT :lim OFFSET :off
        ");
        foreach ($bind as $k => $v) $stmt->bindValue($k, $v);
        $stmt->bindValue(':lim', $limit, \PDO::PARAM_INT);
        $stmt->bindValue(':off', $offset, \PDO::PARAM_INT);
        $stmt->execute();
        $rows = $stmt->fetchAll(\PDO::FETCH_ASSOC);

        foreach ($rows as &$r) {
            $r['tags'] = json_decode($r['tags'] ?? '[]', true);
        }

        $res->getBody()->write(json_encode([
            'ok' => true, 'customers' => $rows,
            'total' => $total, 'page' => $page, 'limit' => $limit
        ]));
        return $res->withHeader('Content-Type', 'application/json');
    }

    /* ─── POST /api/crm/customers ───────────────────────────────────── */
    public static function createCustomer(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $b = (array)$req->getParsedBody();
        $email = trim($b['email'] ?? '');
        if (!$email || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $res->getBody()->write(json_encode(['ok'=>false,'error'=>'유효한 이메일 필요']));
            return $res->withStatus(400)->withHeader('Content-Type','application/json');
        }
        $pdo = self::db();
        try {
            $stmt = $pdo->prepare("
                INSERT INTO crm_customers (email, name, phone, kakao_id, grade, tags, memo)
                VALUES (:email, :name, :phone, :kakao, :grade, :tags, :memo)
            ");
            $stmt->execute([
                ':email' => $email,
                ':name'  => $b['name'] ?? '',
                ':phone' => $b['phone'] ?? '',
                ':kakao' => $b['kakao_id'] ?? '',
                ':grade' => $b['grade'] ?? 'normal',
                ':tags'  => json_encode($b['tags'] ?? []),
                ':memo'  => $b['memo'] ?? '',
            ]);
            $id = (int)$pdo->lastInsertId();
            $res->getBody()->write(json_encode(['ok'=>true,'id'=>$id]));
        } catch (\Exception $e) {
            $res->getBody()->write(json_encode(['ok'=>false,'error'=>'이메일 중복 또는 오류: '.$e->getMessage()]));
            return $res->withStatus(409)->withHeader('Content-Type','application/json');
        }
        return $res->withHeader('Content-Type','application/json');
    }

    /* ─── GET /api/crm/customers/{id} — 360° 뷰 ────────────────────── */
    public static function getCustomer(Request $req, Response $res, array $args): Response
    {
        self::ensureTables();
        $pdo = self::db();
        $id  = (int)$args['id'];
        $c   = $pdo->prepare("SELECT * FROM crm_customers WHERE id=:id");
        $c->execute([':id'=>$id]);
        $customer = $c->fetch(\PDO::FETCH_ASSOC);
        if (!$customer) {
            $res->getBody()->write(json_encode(['ok'=>false,'error'=>'고객 없음']));
            return $res->withStatus(404)->withHeader('Content-Type','application/json');
        }
        $customer['tags'] = json_decode($customer['tags'] ?? '[]', true);

        // 활동 이력
        $acts = $pdo->prepare("SELECT * FROM crm_activities WHERE customer_id=:id ORDER BY created_at DESC LIMIT 50");
        $acts->execute([':id'=>$id]);
        $activities = $acts->fetchAll(\PDO::FETCH_ASSOC);
        foreach ($activities as &$a) { $a['data'] = json_decode($a['data'] ?? '{}', true); }

        // 소속 세그먼트
        $segs = $pdo->prepare("SELECT s.id, s.name, s.color FROM crm_segments s JOIN crm_segment_members sm ON sm.segment_id=s.id WHERE sm.customer_id=:id");
        $segs->execute([':id'=>$id]);
        $segments = $segs->fetchAll(\PDO::FETCH_ASSOC);

        $res->getBody()->write(json_encode([
            'ok'=>true, 'customer'=>$customer,
            'activities'=>$activities, 'segments'=>$segments
        ]));
        return $res->withHeader('Content-Type','application/json');
    }

    /* ─── PUT /api/crm/customers/{id} ──────────────────────────────── */
    public static function updateCustomer(Request $req, Response $res, array $args): Response
    {
        self::ensureTables();
        $pdo = self::db();
        $id  = (int)$args['id'];
        $b   = (array)$req->getParsedBody();
        $pdo->prepare("
            UPDATE crm_customers SET
                name=:name, phone=:phone, kakao_id=:kakao, grade=:grade,
                tags=:tags, memo=:memo, updated_at=datetime('now')
            WHERE id=:id
        ")->execute([
            ':id'=>$id, ':name'=>$b['name']??'', ':phone'=>$b['phone']??'',
            ':kakao'=>$b['kakao_id']??'', ':grade'=>$b['grade']??'normal',
            ':tags'=>json_encode($b['tags']??[]), ':memo'=>$b['memo']??'',
        ]);
        $res->getBody()->write(json_encode(['ok'=>true]));
        return $res->withHeader('Content-Type','application/json');
    }

    /* ─── POST /api/crm/activities ──────────────────────────────────── */
    public static function addActivity(Request $req, Response $res): Response
    {
        self::ensureTables();
        $b = (array)$req->getParsedBody();
        $pdo = self::db();
        $pdo->prepare("
            INSERT INTO crm_activities (customer_id, type, channel, amount, data)
            VALUES (:cid, :type, :ch, :amt, :data)
        ")->execute([
            ':cid'  => (int)($b['customer_id']??0),
            ':type' => $b['type']??'event',
            ':ch'   => $b['channel']??'direct',
            ':amt'  => (float)($b['amount']??0),
            ':data' => json_encode($b['data']??[]),
        ]);
        // LTV 재계산
        $pdo->prepare("
            UPDATE crm_customers SET ltv=(
                SELECT COALESCE(SUM(amount),0) FROM crm_activities WHERE customer_id=:cid AND type='purchase'
            ), updated_at=datetime('now') WHERE id=:cid
        ")->execute([':cid'=>(int)($b['customer_id']??0)]);
        $res->getBody()->write(json_encode(['ok'=>true,'id'=>(int)$pdo->lastInsertId()]));
        return $res->withHeader('Content-Type','application/json');
    }

    /* ─── GET /api/crm/rfm ──────────────────────────────────────────── */
    public static function rfmAnalysis(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $pdo = self::db();
        // RFM 집계 — 최근 구매일(R), 구매횟수(F), 구매금액(M)
        $stmt = $pdo->query("
            SELECT c.id, c.email, c.name, c.grade,
                   COALESCE(a.purchase_count, 0) AS frequency,
                   COALESCE(a.total_amount, 0)   AS monetary,
                   a.last_purchase,
                   CASE
                     WHEN a.last_purchase >= datetime('now', '-30 days') THEN 5
                     WHEN a.last_purchase >= datetime('now', '-60 days') THEN 4
                     WHEN a.last_purchase >= datetime('now', '-90 days') THEN 3
                     WHEN a.last_purchase >= datetime('now', '-180 days') THEN 2
                     ELSE 1
                   END AS recency
            FROM crm_customers c
            LEFT JOIN (
                SELECT customer_id,
                       COUNT(*) AS purchase_count,
                       SUM(amount) AS total_amount,
                       MAX(created_at) AS last_purchase
                FROM crm_activities WHERE type='purchase'
                GROUP BY customer_id
            ) a ON a.customer_id = c.id
            ORDER BY monetary DESC
            LIMIT 500
        ");
        $rows = $stmt->fetchAll(\PDO::FETCH_ASSOC);

        $stats = ['champions'=>0,'loyal'=>0,'at_risk'=>0,'lost'=>0,'new'=>0,'total'=>count($rows)];
        foreach ($rows as &$r) {
            $r_score = (int)$r['recency'];
            $f_score = $r['frequency'] >= 10 ? 5 : ($r['frequency'] >= 5 ? 4 : ($r['frequency'] >= 3 ? 3 : ($r['frequency'] >= 1 ? 2 : 1)));
            $grade = match(true) {
                $r_score >= 4 && $f_score >= 4 => 'champions',
                $r_score >= 3 && $f_score >= 3 => 'loyal',
                $r_score <= 2 && $f_score >= 3 => 'at_risk',
                $r_score <= 2 && $f_score <= 2 => 'lost',
                default => 'new'
            };
            $r['rfm_grade'] = $grade;
            $stats[$grade]++;
        }

        $res->getBody()->write(json_encode(['ok'=>true,'customers'=>$rows,'stats'=>$stats]));
        return $res->withHeader('Content-Type','application/json');
    }

    /* ─── GET /api/crm/segments ─────────────────────────────────────── */
    public static function listSegments(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $pdo = self::db();
        $rows = $pdo->query("SELECT * FROM crm_segments ORDER BY created_at DESC")->fetchAll(\PDO::FETCH_ASSOC);
        foreach ($rows as &$r) { $r['rules'] = json_decode($r['rules']??'[]', true); }
        $res->getBody()->write(json_encode(['ok'=>true,'segments'=>$rows]));
        return $res->withHeader('Content-Type','application/json');
    }

    /* ─── POST /api/crm/segments ────────────────────────────────────── */
    public static function createSegment(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $pdo = self::db();
        $b = (array)$req->getParsedBody();
        $pdo->prepare("
            INSERT INTO crm_segments (name, description, rules, color)
            VALUES (:name, :desc, :rules, :color)
        ")->execute([
            ':name'=>$b['name']??'새 세그먼트',
            ':desc'=>$b['description']??'',
            ':rules'=>json_encode($b['rules']??[]),
            ':color'=>$b['color']??'#4f8ef7',
        ]);
        $sid = (int)$pdo->lastInsertId();
        // 즉시 멤버십 갱신
        self::refreshSegmentMembers($pdo, $sid, $b['rules']??[]);
        $cnt = $pdo->query("SELECT COUNT(*) FROM crm_segment_members WHERE segment_id=$sid")->fetchColumn();
        $pdo->exec("UPDATE crm_segments SET member_count=$cnt WHERE id=$sid");
        $res->getBody()->write(json_encode(['ok'=>true,'id'=>$sid,'member_count'=>$cnt]));
        return $res->withHeader('Content-Type','application/json');
    }

    /* ─── POST /api/crm/segments/{id}/refresh ───────────────────────── */
    public static function refreshSegment(Request $req, Response $res, array $args): Response
    {
        self::ensureTables();
        $pdo = self::db();
        $sid = (int)$args['id'];
        $seg = $pdo->prepare("SELECT rules FROM crm_segments WHERE id=:id");
        $seg->execute([':id'=>$sid]);
        $row = $seg->fetch(\PDO::FETCH_ASSOC);
        if (!$row) { $res->getBody()->write(json_encode(['ok'=>false,'error'=>'세그먼트 없음'])); return $res->withStatus(404)->withHeader('Content-Type','application/json'); }
        $rules = json_decode($row['rules']??'[]', true);
        self::refreshSegmentMembers($pdo, $sid, $rules);
        $cnt = $pdo->query("SELECT COUNT(*) FROM crm_segment_members WHERE segment_id=$sid")->fetchColumn();
        $pdo->exec("UPDATE crm_segments SET member_count=$cnt, updated_at=datetime('now') WHERE id=$sid");
        $res->getBody()->write(json_encode(['ok'=>true,'member_count'=>$cnt]));
        return $res->withHeader('Content-Type','application/json');
    }

    private static function refreshSegmentMembers(\PDO $pdo, int $sid, array $rules): void
    {
        $pdo->exec("DELETE FROM crm_segment_members WHERE segment_id=$sid");
        // 기본 ALL 멤버 또는 룰 적용
        if (empty($rules)) {
            $pdo->exec("INSERT OR IGNORE INTO crm_segment_members (segment_id, customer_id) SELECT $sid, id FROM crm_customers");
            return;
        }
        // 룰 기반 (grade, ltv, rfm_score 조건 지원)
        $where = [];
        foreach ($rules as $rule) {
            $field = preg_replace('/[^a-z_]/', '', strtolower($rule['field']??''));
            $op    = match($rule['op']??'eq') { 'gte'=>'>=', 'lte'=>'<=', 'gt'=>'>', 'lt'=>'<', 'eq'=>'=', default=>'' };
            if (!$op || !$field) continue;
            $val = is_numeric($rule['value']) ? (float)$rule['value'] : $pdo->quote($rule['value']??'');
            $where[] = "$field $op $val";
        }
        if ($where) {
            $pdo->exec("INSERT OR IGNORE INTO crm_segment_members (segment_id, customer_id) SELECT $sid, id FROM crm_customers WHERE ".implode(' AND ', $where));
        }
    }

    /* ─── GET /api/crm/stats ────────────────────────────────────────── */
    public static function stats(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $pdo = self::db();
        $total    = (int)$pdo->query("SELECT COUNT(*) FROM crm_customers")->fetchColumn();
        $active   = (int)$pdo->query("SELECT COUNT(DISTINCT customer_id) FROM crm_activities WHERE created_at >= datetime('now','-30 days') AND type='purchase'")->fetchColumn();
        $total_ltv= (float)$pdo->query("SELECT COALESCE(SUM(ltv),0) FROM crm_customers")->fetchColumn();
        $grades   = $pdo->query("SELECT grade, COUNT(*) AS cnt FROM crm_customers GROUP BY grade")->fetchAll(\PDO::FETCH_ASSOC);
        $res->getBody()->write(json_encode(['ok'=>true,'total'=>$total,'active_30d'=>$active,'total_ltv'=>$total_ltv,'grades'=>$grades]));
        return $res->withHeader('Content-Type','application/json');
    }
}
