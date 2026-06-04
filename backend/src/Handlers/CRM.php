<?php
declare(strict_types=1);
namespace Genie\Handlers;

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;
use Genie\Db;

/**
 * CRM — 고객 관리 (190차 부활 + 멀티테넌트 격리 + MySQL/SQLite 이식).
 *
 * ★189차까지 runtime-dead. 부활은 3개 층 정합 필요(메모리 project_n190):
 *   ① Db::get → Db::pdo
 *   ② 라우팅: routes.php 에서 /api 접두 제거(basePath('/api')와 이중 /api 충돌 해소)
 *   ③ 멀티테넌트 격리: 전 엔드포인트 requirePro + 세션 user tenant_id 스코핑(헤더 불신)
 *   ④ SQL 이식: 원본은 SQLite 전용(datetime('now')·AUTOINCREMENT) → MySQL/SQLite 양립
 * /api/crm/* 는 index.php public bypass(세션 기반) → 핸들러 self-auth.
 */
class CRM
{
    private static function db(): \PDO { return Db::pdo(); }

    private static function isMysql(\PDO $pdo): bool
    {
        return $pdo->getAttribute(\PDO::ATTR_DRIVER_NAME) === 'mysql';
    }

    /** 현재 UTC 타임스탬프 (양 DB 공통 문자열 컬럼에 저장). */
    private static function now(): string { return gmdate('Y-m-d H:i:s'); }

    /** N일 전 컷오프(문자열, lexical 비교용). */
    private static function cutoff(int $days): string { return gmdate('Y-m-d H:i:s', time() - $days * 86400); }

    /** 인증 세션 user 의 격리 테넌트. requirePro 통과 후 호출(항상 유효). */
    private static function tenant(Request $req): string
    {
        $t = UserAuth::authedTenant($req);
        return ($t !== null && $t !== '') ? $t : 'demo';
    }

    /* ─── DB 초기화 (MySQL/SQLite 양립 + tenant_id + 멱등 ALTER) ───────────── */
    private static function ensureTables(): void
    {
        $pdo = self::db();
        if (self::isMysql($pdo)) {
            $pdo->exec("CREATE TABLE IF NOT EXISTS crm_customers (
                id INT AUTO_INCREMENT PRIMARY KEY,
                tenant_id VARCHAR(100) NOT NULL DEFAULT 'demo',
                email VARCHAR(255) NOT NULL, name VARCHAR(255), phone VARCHAR(50), kakao_id VARCHAR(100),
                grade VARCHAR(50) DEFAULT 'normal', ltv DOUBLE DEFAULT 0,
                rfm_r INT DEFAULT 0, rfm_f INT DEFAULT 0, rfm_m INT DEFAULT 0, rfm_score DOUBLE DEFAULT 0,
                tags TEXT, memo TEXT, created_at VARCHAR(32), updated_at VARCHAR(32),
                UNIQUE KEY uq_crm_cust (tenant_id, email), KEY idx_crm_cust_tenant (tenant_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
            $pdo->exec("CREATE TABLE IF NOT EXISTS crm_activities (
                id INT AUTO_INCREMENT PRIMARY KEY,
                tenant_id VARCHAR(100) NOT NULL DEFAULT 'demo',
                customer_id INT NOT NULL, type VARCHAR(50) NOT NULL, channel VARCHAR(50) DEFAULT 'direct',
                amount DOUBLE, data TEXT, created_at VARCHAR(32),
                KEY idx_crm_act_cid (customer_id), KEY idx_crm_act_tenant (tenant_id, type)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
            $pdo->exec("CREATE TABLE IF NOT EXISTS crm_segments (
                id INT AUTO_INCREMENT PRIMARY KEY,
                tenant_id VARCHAR(100) NOT NULL DEFAULT 'demo',
                name VARCHAR(255) NOT NULL, description TEXT, rules TEXT,
                auto_refresh INT DEFAULT 1, member_count INT DEFAULT 0, color VARCHAR(20) DEFAULT '#4f8ef7',
                created_at VARCHAR(32), updated_at VARCHAR(32), KEY idx_crm_seg_tenant (tenant_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
            $pdo->exec("CREATE TABLE IF NOT EXISTS crm_segment_members (
                tenant_id VARCHAR(100) NOT NULL DEFAULT 'demo',
                segment_id INT NOT NULL, customer_id INT NOT NULL, added_at VARCHAR(32),
                PRIMARY KEY (segment_id, customer_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
        } else {
            $pdo->exec("CREATE TABLE IF NOT EXISTS crm_customers (
                id INTEGER PRIMARY KEY AUTOINCREMENT, tenant_id TEXT NOT NULL DEFAULT 'demo',
                email TEXT NOT NULL, name TEXT, phone TEXT, kakao_id TEXT, grade TEXT DEFAULT 'normal',
                ltv REAL DEFAULT 0, rfm_r INTEGER DEFAULT 0, rfm_f INTEGER DEFAULT 0, rfm_m INTEGER DEFAULT 0,
                rfm_score REAL DEFAULT 0, tags TEXT DEFAULT '[]', memo TEXT,
                created_at TEXT, updated_at TEXT, UNIQUE (tenant_id, email)
            )");
            $pdo->exec("CREATE TABLE IF NOT EXISTS crm_activities (
                id INTEGER PRIMARY KEY AUTOINCREMENT, tenant_id TEXT NOT NULL DEFAULT 'demo',
                customer_id INTEGER NOT NULL, type TEXT NOT NULL, channel TEXT DEFAULT 'direct',
                amount REAL, data TEXT DEFAULT '{}', created_at TEXT
            )");
            $pdo->exec("CREATE TABLE IF NOT EXISTS crm_segments (
                id INTEGER PRIMARY KEY AUTOINCREMENT, tenant_id TEXT NOT NULL DEFAULT 'demo',
                name TEXT NOT NULL, description TEXT, rules TEXT DEFAULT '[]',
                auto_refresh INTEGER DEFAULT 1, member_count INTEGER DEFAULT 0, color TEXT DEFAULT '#4f8ef7',
                created_at TEXT, updated_at TEXT
            )");
            $pdo->exec("CREATE TABLE IF NOT EXISTS crm_segment_members (
                tenant_id TEXT NOT NULL DEFAULT 'demo', segment_id INTEGER NOT NULL, customer_id INTEGER NOT NULL,
                added_at TEXT, PRIMARY KEY (segment_id, customer_id)
            )");
            $pdo->exec("CREATE INDEX IF NOT EXISTS idx_crm_customers_tenant ON crm_customers(tenant_id)");
            $pdo->exec("CREATE INDEX IF NOT EXISTS idx_crm_activities_cid ON crm_activities(customer_id)");
            $pdo->exec("CREATE INDEX IF NOT EXISTS idx_crm_segments_tenant ON crm_segments(tenant_id)");
        }
        // 기존(190차 이전 SQLite 스키마) 테이블 멱등 보강 — tenant_id 누락 시 추가
        foreach (['crm_customers','crm_activities','crm_segments','crm_segment_members'] as $tbl) {
            try { $pdo->exec("ALTER TABLE {$tbl} ADD COLUMN tenant_id VARCHAR(100) NOT NULL DEFAULT 'demo'"); } catch (\Throwable $e) {}
        }
    }

    private static function customerOwned(\PDO $pdo, int $id, string $tenant): bool
    {
        $st = $pdo->prepare("SELECT 1 FROM crm_customers WHERE id=:id AND tenant_id=:t LIMIT 1");
        $st->execute([':id'=>$id, ':t'=>$tenant]);
        return (bool)$st->fetchColumn();
    }

    private static function jsonRes(Response $res, array $payload, int $status = 200): Response
    {
        $res->getBody()->write(json_encode($payload, JSON_UNESCAPED_UNICODE));
        return $res->withStatus($status)->withHeader('Content-Type', 'application/json');
    }

    /* ─── GET /crm/customers ─────────────────────────────────────────── */
    public static function listCustomers(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $pdo = self::db();
        $tenant = self::tenant($req);
        $p   = $req->getQueryParams();
        $page  = max(1, (int)($p['page'] ?? 1));
        $limit = min(100, max(10, (int)($p['limit'] ?? 20)));
        $offset = ($page - 1) * $limit;
        $search = $p['q'] ?? '';
        $grade  = $p['grade'] ?? '';
        $segment = $p['segment_id'] ?? '';

        $where = ['c.tenant_id = :tenant'];
        $bind  = [':tenant' => $tenant];
        if ($search) { $where[] = "(c.email LIKE :q OR c.name LIKE :q OR c.phone LIKE :q)"; $bind[':q'] = "%$search%"; }
        if ($grade)  { $where[] = "c.grade = :grade"; $bind[':grade'] = $grade; }
        $join = '';
        if ($segment) { $join = "JOIN crm_segment_members sm ON sm.customer_id = c.id AND sm.segment_id = :seg"; $bind[':seg'] = (int)$segment; }
        $whereStr = implode(' AND ', $where);

        $totalRow = $pdo->prepare("SELECT COUNT(*) FROM crm_customers c $join WHERE $whereStr");
        $totalRow->execute($bind);
        $total = (int)$totalRow->fetchColumn();

        $stmt = $pdo->prepare("
            SELECT c.*,
                   (SELECT COUNT(*) FROM crm_activities WHERE customer_id=c.id AND type='purchase') AS purchase_count,
                   (SELECT MAX(created_at) FROM crm_activities WHERE customer_id=c.id AND type='purchase') AS last_purchase
            FROM crm_customers c $join WHERE $whereStr
            ORDER BY c.updated_at DESC LIMIT :lim OFFSET :off
        ");
        foreach ($bind as $k => $v) $stmt->bindValue($k, $v);
        $stmt->bindValue(':lim', $limit, \PDO::PARAM_INT);
        $stmt->bindValue(':off', $offset, \PDO::PARAM_INT);
        $stmt->execute();
        $rows = $stmt->fetchAll(\PDO::FETCH_ASSOC);
        foreach ($rows as &$r) { $r['tags'] = json_decode($r['tags'] ?? '[]', true); }
        return self::jsonRes($res, ['ok'=>true,'customers'=>$rows,'total'=>$total,'page'=>$page,'limit'=>$limit]);
    }

    /* ─── POST /crm/customers ───────────────────────────────────────── */
    public static function createCustomer(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $tenant = self::tenant($req);
        $b = (array)$req->getParsedBody();
        $email = trim($b['email'] ?? '');
        if (!$email || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return self::jsonRes($res, ['ok'=>false,'error'=>'유효한 이메일 필요'], 400);
        }
        $pdo = self::db();
        $now = self::now();
        try {
            $stmt = $pdo->prepare("
                INSERT INTO crm_customers (tenant_id, email, name, phone, kakao_id, grade, tags, memo, created_at, updated_at)
                VALUES (:tenant, :email, :name, :phone, :kakao, :grade, :tags, :memo, :ca, :ua)
            ");
            $stmt->execute([
                ':tenant'=> $tenant, ':email' => $email,
                ':name'  => $b['name'] ?? '', ':phone' => $b['phone'] ?? '', ':kakao' => $b['kakao_id'] ?? '',
                ':grade' => $b['grade'] ?? 'normal', ':tags' => json_encode($b['tags'] ?? []), ':memo' => $b['memo'] ?? '',
                ':ca'    => $now, ':ua' => $now,
            ]);
            return self::jsonRes($res, ['ok'=>true,'id'=>(int)$pdo->lastInsertId()]);
        } catch (\Exception $e) {
            return self::jsonRes($res, ['ok'=>false,'error'=>'이메일 중복 또는 오류'], 409);
        }
    }

    /* ─── GET /crm/customers/{id} — 360° 뷰 ────────────────────────── */
    public static function getCustomer(Request $req, Response $res, array $args): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $pdo = self::db();
        $tenant = self::tenant($req);
        $id  = (int)$args['id'];
        $c   = $pdo->prepare("SELECT * FROM crm_customers WHERE id=:id AND tenant_id=:t");
        $c->execute([':id'=>$id, ':t'=>$tenant]);
        $customer = $c->fetch(\PDO::FETCH_ASSOC);
        if (!$customer) return self::jsonRes($res, ['ok'=>false,'error'=>'고객 없음'], 404);
        $customer['tags'] = json_decode($customer['tags'] ?? '[]', true);

        $acts = $pdo->prepare("SELECT * FROM crm_activities WHERE customer_id=:id AND tenant_id=:t ORDER BY created_at DESC LIMIT 50");
        $acts->execute([':id'=>$id, ':t'=>$tenant]);
        $activities = $acts->fetchAll(\PDO::FETCH_ASSOC);
        foreach ($activities as &$a) { $a['data'] = json_decode($a['data'] ?? '{}', true); }

        $segs = $pdo->prepare("SELECT s.id, s.name, s.color FROM crm_segments s JOIN crm_segment_members sm ON sm.segment_id=s.id WHERE sm.customer_id=:id AND s.tenant_id=:t");
        $segs->execute([':id'=>$id, ':t'=>$tenant]);
        $segments = $segs->fetchAll(\PDO::FETCH_ASSOC);
        return self::jsonRes($res, ['ok'=>true,'customer'=>$customer,'activities'=>$activities,'segments'=>$segments]);
    }

    /* ─── PUT /crm/customers/{id} ──────────────────────────────────── */
    public static function updateCustomer(Request $req, Response $res, array $args): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $pdo = self::db();
        $tenant = self::tenant($req);
        $id  = (int)$args['id'];
        $b   = (array)$req->getParsedBody();
        $stmt = $pdo->prepare("
            UPDATE crm_customers SET name=:name, phone=:phone, kakao_id=:kakao, grade=:grade,
                tags=:tags, memo=:memo, updated_at=:ua WHERE id=:id AND tenant_id=:t
        ");
        $stmt->execute([
            ':id'=>$id, ':t'=>$tenant, ':name'=>$b['name']??'', ':phone'=>$b['phone']??'',
            ':kakao'=>$b['kakao_id']??'', ':grade'=>$b['grade']??'normal',
            ':tags'=>json_encode($b['tags']??[]), ':memo'=>$b['memo']??'', ':ua'=>self::now(),
        ]);
        if ($stmt->rowCount() === 0) return self::jsonRes($res, ['ok'=>false,'error'=>'고객 없음'], 404);
        return self::jsonRes($res, ['ok'=>true]);
    }

    /* ─── POST /crm/activities ──────────────────────────────────────── */
    public static function addActivity(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $pdo = self::db();
        $tenant = self::tenant($req);
        $b = (array)$req->getParsedBody();
        $cid = (int)($b['customer_id'] ?? 0);
        if (!self::customerOwned($pdo, $cid, $tenant)) {
            return self::jsonRes($res, ['ok'=>false,'error'=>'고객 없음'], 404);
        }
        $pdo->prepare("
            INSERT INTO crm_activities (tenant_id, customer_id, type, channel, amount, data, created_at)
            VALUES (:t, :cid, :type, :ch, :amt, :data, :ca)
        ")->execute([
            ':t'=>$tenant, ':cid'=>$cid, ':type'=>$b['type']??'event', ':ch'=>$b['channel']??'direct',
            ':amt'=>(float)($b['amount']??0), ':data'=>json_encode($b['data']??[]), ':ca'=>self::now(),
        ]);
        $pdo->prepare("
            UPDATE crm_customers SET ltv=(
                SELECT COALESCE(SUM(amount),0) FROM crm_activities WHERE customer_id=:cid AND type='purchase' AND tenant_id=:t
            ), updated_at=:ua WHERE id=:cid AND tenant_id=:t
        ")->execute([':cid'=>$cid, ':t'=>$tenant, ':ua'=>self::now()]);
        return self::jsonRes($res, ['ok'=>true,'id'=>(int)$pdo->lastInsertId()]);
    }

    /* ─── GET /crm/rfm ──────────────────────────────────────────────── */
    public static function rfmAnalysis(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $pdo = self::db();
        $tenant = self::tenant($req);
        $stmt = $pdo->prepare("
            SELECT c.id, c.email, c.name, c.grade,
                   COALESCE(a.purchase_count, 0) AS frequency,
                   COALESCE(a.total_amount, 0)   AS monetary,
                   a.last_purchase,
                   CASE
                     WHEN a.last_purchase >= :c30 THEN 5
                     WHEN a.last_purchase >= :c60 THEN 4
                     WHEN a.last_purchase >= :c90 THEN 3
                     WHEN a.last_purchase >= :c180 THEN 2
                     ELSE 1
                   END AS recency
            FROM crm_customers c
            LEFT JOIN (
                SELECT customer_id, COUNT(*) AS purchase_count, SUM(amount) AS total_amount, MAX(created_at) AS last_purchase
                FROM crm_activities WHERE type='purchase' AND tenant_id=:t GROUP BY customer_id
            ) a ON a.customer_id = c.id
            WHERE c.tenant_id=:t ORDER BY monetary DESC LIMIT 500
        ");
        $stmt->execute([
            ':t'=>$tenant, ':c30'=>self::cutoff(30), ':c60'=>self::cutoff(60),
            ':c90'=>self::cutoff(90), ':c180'=>self::cutoff(180),
        ]);
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
        return self::jsonRes($res, ['ok'=>true,'customers'=>$rows,'stats'=>$stats]);
    }

    /* ─── GET /crm/segments ─────────────────────────────────────────── */
    public static function listSegments(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $pdo = self::db();
        $tenant = self::tenant($req);
        $st = $pdo->prepare("SELECT * FROM crm_segments WHERE tenant_id=:t ORDER BY created_at DESC");
        $st->execute([':t'=>$tenant]);
        $rows = $st->fetchAll(\PDO::FETCH_ASSOC);
        foreach ($rows as &$r) { $r['rules'] = json_decode($r['rules']??'[]', true); }
        return self::jsonRes($res, ['ok'=>true,'segments'=>$rows]);
    }

    /* ─── POST /crm/segments ────────────────────────────────────────── */
    public static function createSegment(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $pdo = self::db();
        $tenant = self::tenant($req);
        $b = (array)$req->getParsedBody();
        $now = self::now();
        $st = $pdo->prepare("
            INSERT INTO crm_segments (tenant_id, name, description, rules, color, created_at, updated_at)
            VALUES (:t, :name, :desc, :rules, :color, :ca, :ua)
        ");
        $st->execute([
            ':t'=>$tenant, ':name'=>$b['name']??'새 세그먼트', ':desc'=>$b['description']??'',
            ':rules'=>json_encode($b['rules']??[]), ':color'=>$b['color']??'#4f8ef7', ':ca'=>$now, ':ua'=>$now,
        ]);
        $sid = (int)$pdo->lastInsertId();
        $cnt = self::refreshSegmentMembers($pdo, $sid, $b['rules']??[], $tenant);
        $pdo->prepare("UPDATE crm_segments SET member_count=:c WHERE id=:id AND tenant_id=:t")
            ->execute([':c'=>$cnt, ':id'=>$sid, ':t'=>$tenant]);
        return self::jsonRes($res, ['ok'=>true,'id'=>$sid,'member_count'=>$cnt]);
    }

    /* ─── POST /crm/segments/{id}/refresh ───────────────────────────── */
    public static function refreshSegment(Request $req, Response $res, array $args): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $pdo = self::db();
        $tenant = self::tenant($req);
        $sid = (int)$args['id'];
        $seg = $pdo->prepare("SELECT rules FROM crm_segments WHERE id=:id AND tenant_id=:t");
        $seg->execute([':id'=>$sid, ':t'=>$tenant]);
        $row = $seg->fetch(\PDO::FETCH_ASSOC);
        if (!$row) return self::jsonRes($res, ['ok'=>false,'error'=>'세그먼트 없음'], 404);
        $rules = json_decode($row['rules']??'[]', true);
        $cnt = self::refreshSegmentMembers($pdo, $sid, $rules, $tenant);
        $pdo->prepare("UPDATE crm_segments SET member_count=:c, updated_at=:ua WHERE id=:id AND tenant_id=:t")
            ->execute([':c'=>$cnt, ':ua'=>self::now(), ':id'=>$sid, ':t'=>$tenant]);
        return self::jsonRes($res, ['ok'=>true,'member_count'=>$cnt]);
    }

    /** 세그먼트 멤버 재계산 — 전부 테넌트 스코프. 반환=멤버 수. */
    private static function refreshSegmentMembers(\PDO $pdo, int $sid, array $rules, string $tenant): int
    {
        $pdo->prepare("DELETE FROM crm_segment_members WHERE segment_id=:id AND tenant_id=:t")
            ->execute([':id'=>$sid, ':t'=>$tenant]);

        $where = ['tenant_id = ' . $pdo->quote($tenant)];
        foreach ($rules as $rule) {
            $field = preg_replace('/[^a-z_]/', '', strtolower($rule['field']??''));
            $op    = match($rule['op']??'eq') { 'gte'=>'>=', 'lte'=>'<=', 'gt'=>'>', 'lt'=>'<', 'eq'=>'=', default=>'' };
            if (!$op || !$field) continue;
            $val = is_numeric($rule['value']) ? (float)$rule['value'] : $pdo->quote($rule['value']??'');
            $where[] = "$field $op $val";
        }
        $whereStr = implode(' AND ', $where);
        $sidQ = (int)$sid;
        $tQ = $pdo->quote($tenant);
        $ignore = self::isMysql($pdo) ? 'IGNORE' : 'OR IGNORE';
        $pdo->exec("INSERT {$ignore} INTO crm_segment_members (tenant_id, segment_id, customer_id)
                    SELECT {$tQ}, {$sidQ}, id FROM crm_customers WHERE {$whereStr}");

        $cnt = $pdo->prepare("SELECT COUNT(*) FROM crm_segment_members WHERE segment_id=:id AND tenant_id=:t");
        $cnt->execute([':id'=>$sid, ':t'=>$tenant]);
        return (int)$cnt->fetchColumn();
    }

    /* ─── GET /crm/stats ────────────────────────────────────────────── */
    public static function stats(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $pdo = self::db();
        $tenant = self::tenant($req);

        $q1 = $pdo->prepare("SELECT COUNT(*) FROM crm_customers WHERE tenant_id=:t");
        $q1->execute([':t'=>$tenant]); $total = (int)$q1->fetchColumn();

        $q2 = $pdo->prepare("SELECT COUNT(DISTINCT customer_id) FROM crm_activities WHERE tenant_id=:t AND created_at >= :c30 AND type='purchase'");
        $q2->execute([':t'=>$tenant, ':c30'=>self::cutoff(30)]); $active = (int)$q2->fetchColumn();

        $q3 = $pdo->prepare("SELECT COALESCE(SUM(ltv),0) FROM crm_customers WHERE tenant_id=:t");
        $q3->execute([':t'=>$tenant]); $total_ltv = (float)$q3->fetchColumn();

        $q4 = $pdo->prepare("SELECT grade, COUNT(*) AS cnt FROM crm_customers WHERE tenant_id=:t GROUP BY grade");
        $q4->execute([':t'=>$tenant]); $grades = $q4->fetchAll(\PDO::FETCH_ASSOC);

        return self::jsonRes($res, ['ok'=>true,'total'=>$total,'active_30d'=>$active,'total_ltv'=>$total_ltv,'grades'=>$grades]);
    }
}
