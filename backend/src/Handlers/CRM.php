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
    /** [254차 #7] AdminGrowth(platform_growth 리드 미러)가 crm_customers 스키마를 보장하기 위해 public 으로 노출.
     *   idempotent CREATE IF NOT EXISTS 라 외부 호출 안전(자기 호출 self:: 영향 없음). */
    public static function ensureTables(): void
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
        // [현 차수] 아이덴티티 해석 — 한 사람의 다중 연락처(email/phone/kakao)를 canonical identity_id 로 통합
        //   (LTV/세그먼트 파편화 방지). 원본 행은 보존(비파괴), identity_id 링크만 부여. 멱등 ALTER(있으면 무시).
        try { $pdo->exec("ALTER TABLE crm_customers ADD COLUMN identity_id VARCHAR(64) DEFAULT NULL"); } catch (\Throwable $e) {}
        try { $pdo->exec("CREATE INDEX idx_crm_identity ON crm_customers(tenant_id, identity_id)"); } catch (\Throwable $e) {}
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
            $newId = (int)$pdo->lastInsertId();
            // [현 차수] 아이덴티티 링크 — 동일 phone/kakao 를 가진 기존 고객과 canonical identity 통합(best-effort).
            try { self::linkCustomerIdentity($pdo, $tenant, $newId); } catch (\Throwable $e) {}
            // [현 차수] 신규 고객 등록 → 'signup' 트리거 여정 자동 진입. best-effort(여정 미정의 시 무동작).
            try { JourneyBuilder::enrollByTrigger($pdo, $tenant, 'signup', $newId); } catch (\Throwable $e) {}
            return self::jsonRes($res, ['ok'=>true,'id'=>$newId]);
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

    /* ─── DELETE /crm/customers/{id} ─── 191차: 고객 삭제(테넌트 스코프 + 연관 cascade) ── */
    public static function deleteCustomer(Request $req, Response $res, array $args): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $pdo = self::db();
        $tenant = self::tenant($req);
        $id = (int)$args['id'];
        $chk = $pdo->prepare("SELECT id FROM crm_customers WHERE id=:id AND tenant_id=:t");
        $chk->execute([':id'=>$id, ':t'=>$tenant]);
        if (!$chk->fetch()) return self::jsonRes($res, ['ok'=>false,'error'=>'고객 없음'], 404);
        $pdo->prepare("DELETE FROM crm_segment_members WHERE customer_id=:id AND tenant_id=:t")->execute([':id'=>$id, ':t'=>$tenant]);
        $pdo->prepare("DELETE FROM crm_activities WHERE customer_id=:id AND tenant_id=:t")->execute([':id'=>$id, ':t'=>$tenant]);
        $pdo->prepare("DELETE FROM crm_customers WHERE id=:id AND tenant_id=:t")->execute([':id'=>$id, ':t'=>$tenant]);
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
                SELECT COALESCE(SUM(CASE WHEN type='refund' THEN -amount ELSE amount END),0) FROM crm_activities WHERE customer_id=:cid AND type IN ('purchase','refund') AND tenant_id=:t
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
                   a.last_purchase, a.first_purchase,
                   CASE
                     WHEN a.last_purchase >= :c30 THEN 5
                     WHEN a.last_purchase >= :c60 THEN 4
                     WHEN a.last_purchase >= :c90 THEN 3
                     WHEN a.last_purchase >= :c180 THEN 2
                     ELSE 1
                   END AS recency
            FROM crm_customers c
            LEFT JOIN (
                SELECT customer_id, SUM(CASE WHEN type='purchase' THEN 1 ELSE 0 END) AS purchase_count, SUM(CASE WHEN type='refund' THEN -amount ELSE amount END) AS total_amount, MAX(CASE WHEN type='purchase' THEN created_at END) AS last_purchase, MIN(CASE WHEN type='purchase' THEN created_at END) AS first_purchase
                FROM crm_activities WHERE type IN ('purchase','refund') AND tenant_id=:t GROUP BY customer_id
            ) a ON a.customer_id = c.id
            WHERE c.tenant_id=:t ORDER BY monetary DESC LIMIT 500
        ");
        $stmt->execute([
            ':t'=>$tenant, ':c30'=>self::cutoff(30), ':c60'=>self::cutoff(60),
            ':c90'=>self::cutoff(90), ':c180'=>self::cutoff(180),
        ]);
        $rows = $stmt->fetchAll(\PDO::FETCH_ASSOC);

        // [255차 감사 E] 표시 리스트는 LIMIT 500(고액순)이나, 세그먼트 분포·총고객수(stats)는
        //   캡 집합이 아닌 **전체 테넌트** 기준으로 산출해야 정확(>500 테넌트 언더카운트/고액편향 해소).
        //   per-row rfm_grade(표시용)는 리스트 루프에서 부여, stats 는 전수 SQL 집계로 분리.
        foreach ($rows as &$r) {
            $r_score = (int)$r['recency'];
            $f_score = $r['frequency'] >= 10 ? 5 : ($r['frequency'] >= 5 ? 4 : ($r['frequency'] >= 3 ? 3 : ($r['frequency'] >= 1 ? 2 : 1)));
            $r['rfm_grade'] = match(true) {
                $r_score >= 4 && $f_score >= 4 => 'champions',
                $r_score >= 3 && $f_score >= 3 => 'loyal',
                $r_score <= 2 && $f_score >= 3 => 'at_risk',
                $r_score <= 2 && $f_score <= 2 => 'lost',
                default => 'new'
            };
        }
        unset($r);
        $stats = self::rfmStatsFull($pdo, $tenant);
        // [240차 약점③] 예측형 CDP — 이탈확률·예측CLV 부착(기존 RFM 탭에 통합, 신규메뉴 0).
        $predictive = self::addPredictiveScores($rows);
        return self::jsonRes($res, ['ok'=>true,'customers'=>$rows,'stats'=>$stats,'predictive'=>$predictive]);
    }

    /** [255차 감사 E] RFM 세그먼트 분포·총고객수를 **전체 테넌트** 기준 SQL 집계(LIMIT 캡 없음).
     *   recency/frequency 점수 CASE + 등급 CASE(match(true)와 동일 first-match 우선순위)로 등급 파생 후 GROUP BY.
     *   MySQL/SQLite 공통. 고객 >500 테넌트에서 분포 언더카운트·고액편향 제거. */
    private static function rfmStatsFull(\PDO $pdo, string $tenant): array
    {
        $out = ['champions'=>0,'loyal'=>0,'at_risk'=>0,'lost'=>0,'new'=>0,'total'=>0];
        try {
            // rs/fs 점수를 inner 서브쿼리 컬럼으로 1회 산출(:c30~:c180 각 1회 등장 — 드라이버별 반복 네임드파라미터 회피).
            $rsCol = "(CASE WHEN a.last_purchase >= :c30 THEN 5 WHEN a.last_purchase >= :c60 THEN 4 WHEN a.last_purchase >= :c90 THEN 3 WHEN a.last_purchase >= :c180 THEN 2 ELSE 1 END)";
            $fsCol = "(CASE WHEN COALESCE(a.purchase_count,0) >= 10 THEN 5 WHEN COALESCE(a.purchase_count,0) >= 5 THEN 4 WHEN COALESCE(a.purchase_count,0) >= 3 THEN 3 WHEN COALESCE(a.purchase_count,0) >= 1 THEN 2 ELSE 1 END)";
            $grade = "CASE WHEN rs >= 4 AND fs >= 4 THEN 'champions' WHEN rs >= 3 AND fs >= 3 THEN 'loyal' WHEN rs <= 2 AND fs >= 3 THEN 'at_risk' WHEN rs <= 2 AND fs <= 2 THEN 'lost' ELSE 'new' END";
            // [현 차수 H4] identity_id 로 연결된 다중 연락처를 **한 논리적 사람**으로 통합 후 RFM 등급 집계.
            //   idk = COALESCE(NULLIF(c.identity_id,''), CAST(c.id AS CHAR)) — identity_id 는 항상 'idt_' 접두(정수 id 와 무충돌).
            //   identity_id 가 NULL/'' 이면 idk=고객 id 문자열 = 고객당 1행 → 기존 per-customer 집계와 완전 동일(회귀0).
            $idk = "COALESCE(NULLIF(c.identity_id,''), CAST(c.id AS CHAR))";
            $sql = "SELECT g AS grd, COUNT(*) AS cnt FROM (
                        SELECT ($grade) AS g FROM (
                            SELECT $rsCol AS rs, $fsCol AS fs FROM (
                                SELECT $idk AS idk,
                                       COUNT(act.id) AS purchase_count,
                                       MAX(act.created_at) AS last_purchase
                                FROM crm_customers c
                                LEFT JOIN crm_activities act
                                       ON act.customer_id = c.id AND act.tenant_id=:t AND act.type='purchase'
                                WHERE c.tenant_id=:t
                                GROUP BY $idk
                            ) a
                        ) s
                    ) x GROUP BY g";
            $st = $pdo->prepare($sql);
            $st->execute([':t'=>$tenant, ':c30'=>self::cutoff(30), ':c60'=>self::cutoff(60), ':c90'=>self::cutoff(90), ':c180'=>self::cutoff(180)]);
            foreach ($st->fetchAll(\PDO::FETCH_ASSOC) as $r) {
                $g = (string)$r['grd']; $c = (int)$r['cnt'];
                if (isset($out[$g])) $out[$g] = $c;
                $out['total'] += $c;
            }
        } catch (\Throwable $e) { /* graceful — 빈 stats */ }
        return $out;
    }

    /* ─── [현 차수] 예측 CLV 고도화 — BG/NBD(기대거래수) × Gamma-Gamma(예측 객단가) ────────────────
     *   240차의 단일 생존휴리스틱(1-exp)에서 확률모델로 승격. 외부 ML 라이브러리 0(MMM 코드처럼 hand-rolled).
     *   ① population 파라미터 추정(method-of-moments):
     *        Gamma(r,α)  = 개인 거래율 λ_i=freq/T 의 표본 평균/분산 → α=mean/var, r=mean·α.
     *        Beta(a,b)   = 개인 이탈확률 프록시(휴리스틱 churn)의 표본 평균/분산 MoM(a>1 클램프로 공식 안정).
     *   ② 개인 예측:
     *        P(alive|x,t_x,T) 과 E[Y(t)|x,t_x,T](Gauss 초기하 2F1 급수 hand-roll)로 12개월 기대거래수·잔존확률,
     *        Gamma-Gamma 근사(정밀도가중 객단가 수축추정)로 예측 객단가 → predicted_clv = E[Y(t)]·E[M].
     *   ③ 폴백: 표본 부족(<MIN) 또는 단일구매(x<1)·수치불안정 시 기존 휴리스틱(heuristicScore)으로 복귀(문서화).
     *   ★실 구매데이터(crm_activities)만. 응답 스키마(churn_prob/predicted_clv/churn_tier) 불변(프론트 회귀0). */
    private static function addPredictiveScores(array &$rows): array
    {
        $now = time();
        $HORIZON = 365.0; // 예측 지평(일)
        $pop = self::estimatePopParams($rows, $now);
        $useModel = !empty($pop['ok']);
        $popAov = (float)($pop['pop_aov'] ?? 0);

        $sumChurn = 0.0; $highChurn = 0; $sumPredClv = 0.0; $n = 0; $modeled = 0;
        foreach ($rows as &$r) {
            $freq  = (int)($r['frequency'] ?? 0);
            $monet = (float)($r['monetary'] ?? 0);
            $last  = !empty($r['last_purchase'])  ? strtotime((string)$r['last_purchase'])  : false;
            $first = !empty($r['first_purchase']) ? strtotime((string)$r['first_purchase']) : false;
            $aov   = $freq > 0 ? $monet / $freq : 0.0;

            $scored = false;
            if ($useModel && $freq >= 2 && $first && $last && $last >= $first) {
                $T  = max(1.0, ($now - $first) / 86400.0);  // 관측기간(일)
                $tx = ($last - $first) / 86400.0;           // 마지막 반복구매 시점(일)
                $x  = $freq - 1;                            // 반복거래수(BG/NBD frequency)
                $pAlive = self::bgnbdPAlive($x, $tx, $T, $pop);
                $eY     = self::bgnbdExpected($x, $tx, $T, $HORIZON, $pop);
                if (is_finite($pAlive) && is_finite($eY) && $eY >= 0) {
                    // Gamma-Gamma 근사: 정밀도가중 객단가 수축(고빈도일수록 개인 AOV 신뢰, 저빈도는 population 으로 수축).
                    $eM = ($pop['gg_pseudo'] * $popAov + $freq * $aov) / ($pop['gg_pseudo'] + $freq);
                    $r['churn_prob']    = round(max(0.0, min(0.99, 1.0 - $pAlive)), 3);
                    $r['predicted_clv'] = round(max(0.0, $eY * $eM));
                    $r['clv_model']     = 'bgnbd';
                    $scored = true; $modeled++;
                }
            }
            if (!$scored) {
                [$churn, $predClv] = self::heuristicScore($freq, $aov, $first, $last, $now);
                $r['churn_prob']    = round(max(0.0, min(0.99, $churn)), 3);
                $r['predicted_clv'] = round(max(0.0, $predClv));
                $r['clv_model']     = 'heuristic';
            }
            $cp = (float)$r['churn_prob'];
            $r['churn_tier'] = $cp >= 0.6 ? 'high' : ($cp >= 0.35 ? 'medium' : 'low');
            if ($freq > 0) { $sumChurn += $cp; $sumPredClv += (float)$r['predicted_clv']; if ($cp >= 0.6) $highChurn++; $n++; }
        }
        unset($r);
        return ['avg_churn' => $n ? round($sumChurn / $n, 3) : 0, 'high_churn_count' => $highChurn,
                'total_predicted_clv' => round($sumPredClv), 'scored' => $n,
                'model' => ($modeled > 0 ? 'bgnbd' : 'heuristic'), 'modeled' => $modeled,
                'params' => $useModel ? ['r'=>round($pop['r'],4), 'alpha'=>round($pop['alpha'],4), 'a'=>round($pop['a'],4), 'b'=>round($pop['b'],4), 'pop_aov'=>round($popAov)] : null];
    }

    /** [기존 폴백] 단일 생존휴리스틱 — BG/NBD 표본부족·단일구매·수치불안정 시 사용. 240차 로직 그대로(문서화된 fallback). */
    private static function heuristicScore(int $freq, float $aov, $first, $last, int $now): array
    {
        $recencyDays = $last ? max(0, ($now - $last) / 86400) : 999;
        $churn = 0.5; $predClv = 0.0;
        if ($freq >= 2 && $first && $last && $last > $first) {
            $interval   = max(1, (($last - $first) / 86400) / ($freq - 1));   // 평균 구매주기(일)
            $churn      = 1 - exp(-$recencyDays / ($interval * 2));           // recency=2×주기 → 0.63
            $ageYears   = max(0.25, ($now - $first) / 31536000);
            $annualFreq = min(52, $freq / $ageYears);
            $predClv    = $aov * $annualFreq * (1 - $churn);                  // 12개월 예측가치
        } elseif ($freq == 1) {
            $churn   = min(0.95, $recencyDays / 180);                         // 단일구매: recency 기반
            $predClv = $aov * (1 - $churn) * 0.5;                             // 보수적 재구매 기대
        }
        return [$churn, $predClv];
    }

    /** [현 차수] BG/NBD population 파라미터 추정(method-of-moments). 표본 부족 시 ok=false → 휴리스틱 폴백. */
    private static function estimatePopParams(array $rows, int $now): array
    {
        $lam = []; $ch = []; $aovs = [];
        foreach ($rows as $r) {
            $freq  = (int)($r['frequency'] ?? 0);
            $monet = (float)($r['monetary'] ?? 0);
            $first = !empty($r['first_purchase']) ? strtotime((string)$r['first_purchase']) : false;
            $last  = !empty($r['last_purchase'])  ? strtotime((string)$r['last_purchase'])  : false;
            if ($freq >= 1 && $first) {
                $T = max(1.0, ($now - $first) / 86400.0);
                $lam[] = $freq / $T;                 // 개인 거래율(건/일)
                $aovs[] = $monet / $freq;
            }
            if ($freq >= 2 && $first && $last && $last >= $first) {
                [$c, ] = self::heuristicScore($freq, ($freq > 0 ? $monet / $freq : 0.0), $first, $last, $now);
                $ch[] = max(0.01, min(0.99, $c));
            }
        }
        $nLam = count($lam); $nCh = count($ch);
        if ($nLam < 20 || $nCh < 10) return ['ok' => false]; // 표본 부족 → 신뢰불가
        // Gamma(r,α) MoM
        $mL = array_sum($lam) / $nLam;
        $vL = 0.0; foreach ($lam as $v) { $vL += ($v - $mL) ** 2; } $vL /= max(1, $nLam - 1);
        if ($mL <= 0 || $vL <= 0) return ['ok' => false];
        $alpha = $mL / $vL; $r = $mL * $alpha;
        // Beta(a,b) MoM
        $mC = array_sum($ch) / $nCh;
        $vC = 0.0; foreach ($ch as $v) { $vC += ($v - $mC) ** 2; } $vC /= max(1, $nCh - 1);
        $a = 1.5; $b = 3.0;
        if ($vC > 0 && $mC > 0 && $mC < 1) {
            $common = $mC * (1 - $mC) / $vC - 1;
            if ($common > 0) { $a = $mC * $common; $b = (1 - $mC) * $common; }
        }
        $popAov = $aovs ? array_sum($aovs) / count($aovs) : 0.0;
        // 수치 안정 클램프(2F1 발산·a<=1 방지).
        $r = max(0.01, min(50.0, $r)); $alpha = max(0.01, min(10000.0, $alpha));
        $a = max(1.05, min(50.0, $a)); $b = max(0.1, min(50.0, $b));
        return ['ok' => true, 'r' => $r, 'alpha' => $alpha, 'a' => $a, 'b' => $b, 'pop_aov' => $popAov, 'gg_pseudo' => 3.0];
    }

    /** BG/NBD 잔존확률 P(alive | x, t_x, T). x=반복거래수. */
    private static function bgnbdPAlive(int $x, float $tx, float $T, array $p): float
    {
        if ($x <= 0) return 1.0;
        $r = $p['r']; $alpha = $p['alpha']; $a = $p['a']; $b = $p['b'];
        $denomBeta = $b + $x - 1;
        if ($denomBeta <= 0) return 1.0;
        // BG/NBD(Fader-Hardie-Lee 2005) P(alive) 정본 비율 = (α+T)/(α+t_x). t_x·T 모두 first 기준이라 분모는 α+t_x.
        //   (종전 α+t_x+T 는 T 이중가산 → ratio 축소 → P(alive) 과대 → churn 과소. 고위험 고객이 저위험으로 오분류되던 버그.)
        $ratio = ($alpha + $T) / ($alpha + $tx);
        $term = ($a / $denomBeta) * ($ratio ** ($r + $x));
        return 1.0 / (1.0 + $term);
    }

    /** BG/NBD 조건부 기대거래수 E[Y(t) | x, t_x, T] (지평 t 일). */
    private static function bgnbdExpected(int $x, float $tx, float $T, float $t, array $p): float
    {
        $r = $p['r']; $alpha = $p['alpha']; $a = $p['a']; $b = $p['b'];
        if ($a <= 1.0) return NAN;
        $A = $r + $x; $B = $b + $x; $C = $a + $b + $x - 1;
        if ($C <= 0) return NAN;
        $z = $t / ($alpha + $T + $t);
        $hyp = self::hyp2f1($A, $B, $C, $z);
        if (!is_finite($hyp)) return NAN;
        $base = ($alpha + $T) / ($alpha + $T + $t);
        $num = ($C / ($a - 1)) * (1.0 - ($base ** $A) * $hyp);
        $denom = 1.0;
        if ($x > 0 && ($b + $x - 1) > 0) {
            // 정본 P(alive) 정규화 분모와 동일 비율 = (α+T)/(α+t_x) (T 이중가산 제거).
            $ratio = ($alpha + $T) / ($alpha + $tx);
            $denom = 1.0 + ($a / ($b + $x - 1)) * ($ratio ** $A);
        }
        return $num / $denom;
    }

    /** Gauss 초기하함수 2F1(A,B;C;z) 급수합(|z|<1 수렴). hand-rolled(외부의존 0). */
    private static function hyp2f1(float $A, float $B, float $C, float $z): float
    {
        if ($z <= 0.0) return 1.0;
        if ($z >= 1.0) $z = 0.999999; // 안전 클램프
        $term = 1.0; $sum = 1.0;
        for ($k = 0; $k < 400; $k++) {
            $term *= (($A + $k) * ($B + $k)) / (($C + $k) * ($k + 1)) * $z;
            $sum += $term;
            if (abs($term) < 1e-12 * abs($sum)) break;
            if (!is_finite($sum)) return NAN;
        }
        return $sum;
    }

    /* ═══ [현 차수] 아이덴티티 해석 — 다중 연락처를 canonical identity 로 통합(LTV/세그먼트 파편화 방지) ═══ */

    /** 전화번호 정규화(숫자만, 9자리 미만은 무시 → 오매칭 방지). */
    private static function normalizePhone(string $p): string { $d = preg_replace('/[^0-9]/', '', $p); return strlen($d) >= 9 ? $d : ''; }
    private static function normalizeKakao(string $k): string { return strtolower(trim($k)); }

    /**
     * 단일 고객 아이덴티티 링크(create 훅·lazy). 동일 phone/kakao 를 가진 기존 고객의 identity 채택(없으면 신규 mint).
     * 원본 행 보존(비파괴). 전부 테넌트 스코프. 반환=부여된 identity_id.
     */
    public static function linkCustomerIdentity(\PDO $pdo, string $tenant, int $customerId): string
    {
        try {
            $c = $pdo->prepare("SELECT id, phone, kakao_id FROM crm_customers WHERE id=:id AND tenant_id=:t");
            $c->execute([':id'=>$customerId, ':t'=>$tenant]);
            $me = $c->fetch(\PDO::FETCH_ASSOC);
            if (!$me) return '';
            $ph = self::normalizePhone((string)($me['phone'] ?? ''));
            $kk = self::normalizeKakao((string)($me['kakao_id'] ?? ''));
            $adopt = null; $rootId = $customerId;
            if ($ph !== '' || $kk !== '') {
                $q = $pdo->prepare("SELECT id, phone, kakao_id, identity_id FROM crm_customers
                    WHERE tenant_id=:t AND id<>:id AND ((phone IS NOT NULL AND phone<>'') OR (kakao_id IS NOT NULL AND kakao_id<>''))");
                $q->execute([':t'=>$tenant, ':id'=>$customerId]);
                foreach ($q->fetchAll(\PDO::FETCH_ASSOC) ?: [] as $o) {
                    $oph = self::normalizePhone((string)($o['phone'] ?? '')); $okk = self::normalizeKakao((string)($o['kakao_id'] ?? ''));
                    if (($ph !== '' && $oph === $ph) || ($kk !== '' && $okk === $kk)) {
                        $oid = (int)$o['id'];
                        if ($oid < $rootId) $rootId = $oid;
                        if ($adopt === null && !empty($o['identity_id'])) $adopt = (string)$o['identity_id'];
                    }
                }
            }
            $idt = $adopt ?: ('idt_' . substr(sha1($tenant . ':' . $rootId), 0, 24));
            $pdo->prepare("UPDATE crm_customers SET identity_id=:idt WHERE id=:id AND tenant_id=:t")
                ->execute([':idt'=>$idt, ':id'=>$customerId, ':t'=>$tenant]);
            return $idt;
        } catch (\Throwable $e) { return ''; }
    }

    /**
     * 테넌트 전체 아이덴티티 재해석 — union-find 로 phone/kakao 공유 고객을 클러스터링, canonical identity_id 부여.
     *   email 은 이미 UNIQUE(tenant,email) 라 별도 키로 취급하지 않음(같은 이메일=같은 행). 원본 보존.
     */
    public static function resolveIdentitiesForTenant(\PDO $pdo, string $tenant): array
    {
        $st = $pdo->prepare("SELECT id, phone, kakao_id FROM crm_customers WHERE tenant_id=:t");
        $st->execute([':t'=>$tenant]);
        $custs = $st->fetchAll(\PDO::FETCH_ASSOC) ?: [];
        if (!$custs) return ['ok'=>true, 'customers'=>0, 'clusters'=>0, 'merged'=>0];

        $parent = [];
        $find = function ($x) use (&$parent, &$find) { while ($parent[$x] !== $x) { $parent[$x] = $parent[$parent[$x]]; $x = $parent[$x]; } return $x; };
        $union = function ($p, $q) use (&$parent, $find) { $rp = $find($p); $rq = $find($q); if ($rp !== $rq) $parent[max($rp, $rq)] = min($rp, $rq); };
        foreach ($custs as $c) { $parent[(int)$c['id']] = (int)$c['id']; }

        $byPhone = []; $byKakao = [];
        foreach ($custs as $c) {
            $id = (int)$c['id'];
            $ph = self::normalizePhone((string)($c['phone'] ?? ''));
            $kk = self::normalizeKakao((string)($c['kakao_id'] ?? ''));
            if ($ph !== '') { if (isset($byPhone[$ph])) $union($byPhone[$ph], $id); else $byPhone[$ph] = $id; }
            if ($kk !== '') { if (isset($byKakao[$kk])) $union($byKakao[$kk], $id); else $byKakao[$kk] = $id; }
        }

        $sizes = [];
        foreach ($custs as $c) { $root = $find((int)$c['id']); $sizes[$root] = ($sizes[$root] ?? 0) + 1; }
        $roots = []; $merged = 0;
        foreach ($custs as $c) {
            $id = (int)$c['id']; $root = $find($id);
            $idt = 'idt_' . substr(sha1($tenant . ':' . $root), 0, 24);
            $roots[$root] = true;
            try { $pdo->prepare("UPDATE crm_customers SET identity_id=:idt WHERE id=:id AND tenant_id=:t")->execute([':idt'=>$idt, ':id'=>$id, ':t'=>$tenant]); } catch (\Throwable $e) {}
            if (($sizes[$root] ?? 1) > 1) $merged++;
        }
        return ['ok'=>true, 'customers'=>count($custs), 'clusters'=>count($roots), 'merged'=>$merged];
    }

    /* ─── POST /crm/identity/resolve — 테넌트 전체 아이덴티티 재해석(관리자 배치) ─── */
    public static function resolveIdentity(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $pdo = self::db(); $tenant = self::tenant($req);
        return self::jsonRes($res, self::resolveIdentitiesForTenant($pdo, $tenant));
    }

    /* ─── GET /crm/identity/{id} — 통합 아이덴티티 360(파편화된 다중 연락처 합산 LTV/타임라인) ─── */
    public static function identityView(Request $req, Response $res, array $args): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $pdo = self::db(); $tenant = self::tenant($req); $id = (int)$args['id'];
        $c = $pdo->prepare("SELECT identity_id FROM crm_customers WHERE id=:id AND tenant_id=:t");
        $c->execute([':id'=>$id, ':t'=>$tenant]);
        $row = $c->fetch(\PDO::FETCH_ASSOC);
        if (!$row) return self::jsonRes($res, ['ok'=>false, 'error'=>'고객 없음'], 404);
        $idt = (string)($row['identity_id'] ?? '');
        if ($idt === '') { $idt = self::linkCustomerIdentity($pdo, $tenant, $id); }

        $members = [];
        if ($idt !== '') {
            $ms = $pdo->prepare("SELECT id, email, name, phone, kakao_id, ltv, grade FROM crm_customers WHERE tenant_id=:t AND identity_id=:idt");
            $ms->execute([':t'=>$tenant, ':idt'=>$idt]);
            $members = $ms->fetchAll(\PDO::FETCH_ASSOC) ?: [];
        }
        $ids = array_values(array_filter(array_map(fn($m) => (int)$m['id'], $members)));
        if (!$ids) $ids = [$id];
        $in = implode(',', array_map('intval', $ids));
        $tQ = $pdo->quote($tenant);

        $agg = ['ltv'=>0.0, 'frequency'=>0, 'last_purchase'=>null, 'first_purchase'=>null];
        try {
            $a = $pdo->query("SELECT SUM(CASE WHEN type='refund' THEN -amount ELSE amount END) AS ltv,
                              SUM(CASE WHEN type='purchase' THEN 1 ELSE 0 END) AS freq,
                              MAX(CASE WHEN type='purchase' THEN created_at END) AS last_p,
                              MIN(CASE WHEN type='purchase' THEN created_at END) AS first_p
                              FROM crm_activities WHERE tenant_id={$tQ} AND type IN ('purchase','refund') AND customer_id IN ($in)")->fetch(\PDO::FETCH_ASSOC);
            if ($a) $agg = ['ltv'=>(float)($a['ltv'] ?? 0), 'frequency'=>(int)($a['freq'] ?? 0), 'last_purchase'=>$a['last_p'], 'first_purchase'=>$a['first_p']];
        } catch (\Throwable $e) {}

        $acts = [];
        try {
            $acts = $pdo->query("SELECT customer_id, type, channel, amount, created_at FROM crm_activities
                WHERE tenant_id={$tQ} AND customer_id IN ($in) ORDER BY created_at DESC LIMIT 100")->fetchAll(\PDO::FETCH_ASSOC) ?: [];
        } catch (\Throwable $e) {}

        return self::jsonRes($res, ['ok'=>true, 'identity_id'=>$idt, 'members'=>$members,
            'member_count'=>count($members), 'aggregate'=>$agg, 'activities'=>$acts]);
    }

    /* ─── [240차 약점⑥] 메시징 빈도캡(Frequency Capping) + 발송시간 최적화 — 딜리버러빌리티 보호(경쟁사 Braze/Klaviyo 정합) ───
     *   기존 crm_activities(email_sent/kakao_sent/sms_sent 로그) 재사용(중복0). 과발송 차단으로 스팸/차단/평판하락 방지. */

    /** 빈도캡/STO 설정 5키 — 테넌트 격리는 skey 접두(canonical app_setting=skey,svalue,updated_at 단일스키마, tenant 컬럼 없음). */
    private const COMMS_FREQ_KEYS = ['comms_freq_cap', 'comms_freq_window', 'comms_quiet_start', 'comms_quiet_end', 'comms_sto'];

    /** 테넌트 격리 skey: "comms_freq_cap@<tenant>" 형식(canonical app_setting 단일 KV 스키마 위에서 테넌트 격리). */
    private static function commsFreqSkey(string $tenant, string $k): string { return $k . '@' . $tenant; }

    /** 테넌트 빈도캡 설정 — app_setting override(없으면 기본 4건/7일). 발송 루프 1회 호출 권장. */
    public static function commsFreqConfig(\PDO $pdo, string $tenant): array
    {
        $cap = 4; $win = 7; $quietStart = 21; $quietEnd = 8; $stoEnabled = false;
        try {
            Db::ensureAppSetting($pdo);
            $skeys = array_map(fn($k) => self::commsFreqSkey($tenant, $k), self::COMMS_FREQ_KEYS);
            $ph = implode(',', array_fill(0, count($skeys), '?'));
            $st = $pdo->prepare("SELECT skey, svalue FROM app_setting WHERE skey IN ($ph)");
            $st->execute($skeys);
            foreach ($st->fetchAll(\PDO::FETCH_KEY_PAIR) ?: [] as $skey => $v) {
                $k = explode('@', (string)$skey, 2)[0];
                if ($k === 'comms_freq_cap'   && is_numeric($v)) $cap = max(1, min(50, (int)$v));
                if ($k === 'comms_freq_window'&& is_numeric($v)) $win = max(1, min(90, (int)$v));
                if ($k === 'comms_quiet_start'&& is_numeric($v)) $quietStart = max(0, min(23, (int)$v));
                if ($k === 'comms_quiet_end'  && is_numeric($v)) $quietEnd = max(0, min(23, (int)$v));
                if ($k === 'comms_sto') $stoEnabled = ($v === '1' || $v === 'true');
            }
        } catch (\Throwable $e) { /* app_setting 부재 시 기본값 */ }
        return ['cap' => $cap, 'window' => $win, 'quiet_start' => $quietStart, 'quiet_end' => $quietEnd, 'sto' => $stoEnabled];
    }

    /** app_setting 테넌트 격리 skey upsert(canonical skey,svalue,updated_at · MySQL/SQLite 분기). */
    private static function commsFreqSet(\PDO $pdo, string $tenant, string $k, string $v): void
    {
        $skey = self::commsFreqSkey($tenant, $k);
        $now  = gmdate('c');
        if (self::isMysql($pdo)) {
            $pdo->prepare("INSERT INTO app_setting(skey,svalue,updated_at) VALUES(?,?,?) ON DUPLICATE KEY UPDATE svalue=VALUES(svalue),updated_at=VALUES(updated_at)")
                ->execute([$skey, $v, $now]);
        } else {
            $pdo->prepare("INSERT INTO app_setting(skey,svalue,updated_at) VALUES(?,?,?) ON CONFLICT(skey) DO UPDATE SET svalue=excluded.svalue,updated_at=excluded.updated_at")
                ->execute([$skey, $v, $now]);
        }
    }

    /* ─── GET /crm/comms-freq ─── 빈도캡/STO 설정 조회(테넌트 격리) ─── */
    public static function getCommsFreqConfig(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        $pdo = self::db();
        $tenant = self::tenant($req);
        $cfg = self::commsFreqConfig($pdo, $tenant);
        return self::jsonRes($res, ['ok' => true, 'config' => $cfg]);
    }

    /* ─── PUT /crm/comms-freq ─── 빈도캡/STO 설정 저장(화이트리스트·범위검증·테넌트 격리) ─── */
    public static function saveCommsFreqConfig(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        $pdo = self::db();
        $tenant = self::tenant($req);
        Db::ensureAppSetting($pdo);
        $b = (array)$req->getParsedBody();

        // 화이트리스트 + 범위 검증(cap 1~50, window 1~90, quiet 0~23, sto bool). 제공된 키만 갱신.
        if (array_key_exists('cap', $b)) {
            if (!is_numeric($b['cap'])) return self::jsonRes($res, ['ok' => false, 'error' => 'cap must be numeric'], 422);
            self::commsFreqSet($pdo, $tenant, 'comms_freq_cap', (string)max(1, min(50, (int)$b['cap'])));
        }
        if (array_key_exists('window', $b)) {
            if (!is_numeric($b['window'])) return self::jsonRes($res, ['ok' => false, 'error' => 'window must be numeric'], 422);
            self::commsFreqSet($pdo, $tenant, 'comms_freq_window', (string)max(1, min(90, (int)$b['window'])));
        }
        if (array_key_exists('quiet_start', $b)) {
            if (!is_numeric($b['quiet_start'])) return self::jsonRes($res, ['ok' => false, 'error' => 'quiet_start must be numeric'], 422);
            self::commsFreqSet($pdo, $tenant, 'comms_quiet_start', (string)max(0, min(23, (int)$b['quiet_start'])));
        }
        if (array_key_exists('quiet_end', $b)) {
            if (!is_numeric($b['quiet_end'])) return self::jsonRes($res, ['ok' => false, 'error' => 'quiet_end must be numeric'], 422);
            self::commsFreqSet($pdo, $tenant, 'comms_quiet_end', (string)max(0, min(23, (int)$b['quiet_end'])));
        }
        if (array_key_exists('sto', $b)) {
            $sto = ($b['sto'] === true || $b['sto'] === '1' || $b['sto'] === 1 || $b['sto'] === 'true');
            self::commsFreqSet($pdo, $tenant, 'comms_sto', $sto ? '1' : '0');
        }
        return self::jsonRes($res, ['ok' => true, 'config' => self::commsFreqConfig($pdo, $tenant)]);
    }

    /** 빈도캡 초과 여부 — 윈도 내 발송(email/kakao/sms) 건수 ≥ cap. 오류 시 false(발송 비차단=안전). */
    public static function isFrequencyCapped(\PDO $pdo, string $tenant, int $customerId, int $cap = 4, int $windowDays = 7): bool
    {
        if ($customerId <= 0 || $cap <= 0) return false;
        $cutoff = gmdate('Y-m-d H:i:s', time() - max(1, $windowDays) * 86400);
        try {
            $st = $pdo->prepare("SELECT COUNT(*) FROM crm_activities WHERE tenant_id=? AND customer_id=? AND type IN ('email_sent','kakao_sent','sms_sent','whatsapp_sent') AND created_at >= ?");
            $st->execute([$tenant, $customerId, $cutoff]);
            return (int)$st->fetchColumn() >= $cap;
        } catch (\Throwable $e) { return false; }
    }

    /** 발송시간 최적화(STO) — quiet-hours(야간) 발송 차단. sto 비활성 시 항상 허용. @return bool 지금 발송 가능 */
    public static function commsSendAllowedNow(array $cfg): bool
    {
        if (empty($cfg['sto'])) return true;
        $h = (int)gmdate('G', time() + 9 * 3600); // KST(UTC+9) 기준 시각
        $s = (int)($cfg['quiet_start'] ?? 21); $e = (int)($cfg['quiet_end'] ?? 8);
        // quiet 구간이 자정을 넘는 경우(21~08) 처리
        $inQuiet = ($s > $e) ? ($h >= $s || $h < $e) : ($h >= $s && $h < $e);
        return !$inQuiet;
    }

    /* ═══ 통합 마케팅 발송 게이트(단일 정본) ═══════════════════════════════
     *   [현 차수 동기화감사] 신규 동의센터(crm_channel_prefs)·quiet-hours·빈도캡을 **하나의 게이트**로 통합.
     *   중복 시스템 신설 금지 — 기존 실가동 로직(PreferenceCenter::isChannelAllowed / isQuietNow /
     *   EmailMarketing::isSuppressed / CRM::commsSendAllowedNow / CRM::isFrequencyCapped)을 재사용해 편입.
     *   RuleEngine 의 신규 frequency_window(일/주 캡·크로스채널) 설정도 기존 crm_activities *_sent 신호로
     *   라이브 강제 → inert 였던 설정을 별도 frequency_event 테이블 없이 실가동시킴(단일 집행경로).
     *   ★거래성/MFA(OTP·배송알림 등)는 절대 게이트 대상 아님 — 이 메서드는 **마케팅 발송 전용**이며 호출은 발송측이 결정.
     *   무회귀 원칙: 미설정/오류 시 allowed=true(기존 발송경로 그대로).
     *
     *   @param array $contact ['email'=>string] 등(이메일 suppression·선호 email 스코프 대조용, 선택).
     *   @return array ['allowed'=>bool, 'reason'=>string]  reason: ok|channel_opt_out|email_suppressed|
     *                 quiet_hours|quiet_hours_tenant|frequency_capped|freq_window_daily|freq_window_weekly|gate_error_open
     */
    public static function isMarketingSendAllowed(string $tenant, int $customerId, string $channel, array $contact = []): array
    {
        $tenant  = ($tenant !== '') ? $tenant : 'demo';
        $channel = strtolower(trim($channel));
        $email   = strtolower(trim((string)($contact['email'] ?? '')));
        try {
            $pdo = self::db();

            // (a) 채널 옵트아웃 — 동의센터(crm_channel_prefs). 명시적 opted_in=0('all'/채널) 있으면 차단.
            if (!PreferenceCenter::isChannelAllowed($pdo, $tenant, $customerId, $channel, $email)) {
                return ['allowed' => false, 'reason' => 'channel_opt_out'];
            }
            // (a') 이메일 채널 하드 suppression(하드바운스/스팸/수신거부) — defense-in-depth(정적 재사용, 로직 무중복).
            if ($channel === 'email' && $email !== '' && EmailMarketing::isSuppressed($pdo, $tenant, $email)) {
                return ['allowed' => false, 'reason' => 'email_suppressed'];
            }

            // (b) quiet-hours — 고객 개인(crm_customer_prefs) 우선, 없으면 테넌트 STO 로 폴백.
            $cfg = self::commsFreqConfig($pdo, $tenant);
            if (PreferenceCenter::isQuietNow($pdo, $tenant, $customerId)) {
                return ['allowed' => false, 'reason' => 'quiet_hours'];
            }
            if (!self::commsSendAllowedNow($cfg)) {
                return ['allowed' => false, 'reason' => 'quiet_hours_tenant'];
            }

            // (c) 빈도캡 — 기존 테넌트 빈도캡(crm_activities *_sent 윈도 카운트).
            if (self::isFrequencyCapped($pdo, $tenant, $customerId, (int)$cfg['cap'], (int)$cfg['window'])) {
                return ['allowed' => false, 'reason' => 'frequency_capped'];
            }
            // (c') RuleEngine frequency_window(일/주 캡·channel=''=크로스채널) — 동일 crm_activities 신호로 라이브 강제.
            $fw = self::frequencyWindowReason($pdo, $tenant, $customerId, $channel);
            if ($fw !== '') {
                return ['allowed' => false, 'reason' => $fw];
            }
        } catch (\Throwable $e) {
            return ['allowed' => true, 'reason' => 'gate_error_open']; // 무회귀: 게이트 오류 시 발송 비차단(안전)
        }
        return ['allowed' => true, 'reason' => 'ok'];
    }

    /** RuleEngine frequency_window 룰을 기존 crm_activities *_sent 신호로 평가(초과 시 사유, 아니면 '').
     *   frequency_window 테이블은 RuleEngine 소유 — 부재/비어있어도 안전(무회귀). 별도 frequency_event 미사용. */
    private static function frequencyWindowReason(\PDO $pdo, string $tenant, int $customerId, string $channel): string
    {
        if ($customerId <= 0) return '';
        $channel = strtolower(trim($channel));
        try {
            // 해당 채널 룰 + 크로스채널(channel=''/NULL) 룰만 방어적 조회.
            $st = $pdo->prepare("SELECT channel, daily_cap, weekly_cap FROM frequency_window
                                  WHERE tenant_id=? AND enabled=1 AND (channel=? OR channel='' OR channel IS NULL)");
            $st->execute([$tenant, $channel]);
            $wins = $st->fetchAll(\PDO::FETCH_ASSOC) ?: [];
        } catch (\Throwable $e) { return ''; } // 테이블 부재/오류 = 미적용
        if (!$wins) return '';
        foreach ($wins as $w) {
            $wch    = strtolower((string)($w['channel'] ?? ''));
            $daily  = (int)($w['daily_cap'] ?? 0);
            $weekly = (int)($w['weekly_cap'] ?? 0);
            foreach ([[$daily, 1, 'freq_window_daily'], [$weekly, 7, 'freq_window_weekly']] as [$cap, $days, $reason]) {
                if ($cap <= 0) continue;
                if (self::countSentSignals($pdo, $tenant, $customerId, $wch, $days) >= $cap) return $reason;
            }
        }
        return '';
    }

    /** crm_activities *_sent 신호 카운트 — $channel='' 이면 전 채널 합산(크로스채널), 아니면 해당 채널만. */
    private static function countSentSignals(\PDO $pdo, string $tenant, int $customerId, string $channel, int $days): int
    {
        $cutoff = gmdate('Y-m-d H:i:s', time() - max(1, $days) * 86400);
        try {
            if ($channel === '') {
                // 고정 화이트리스트(SQL 인젝션 불가) — 모든 채널 발송 신호 합산.
                $st = $pdo->prepare("SELECT COUNT(*) FROM crm_activities WHERE tenant_id=? AND customer_id=?
                    AND type IN ('email_sent','kakao_sent','sms_sent','whatsapp_sent','push_sent') AND created_at >= ?");
                $st->execute([$tenant, $customerId, $cutoff]);
            } else {
                $st = $pdo->prepare("SELECT COUNT(*) FROM crm_activities WHERE tenant_id=? AND customer_id=?
                    AND type=? AND created_at >= ?");
                $st->execute([$tenant, $customerId, $channel . '_sent', $cutoff]);
            }
            return (int)$st->fetchColumn();
        } catch (\Throwable $e) { return 0; }
    }

    /* ─── GET /crm/cohort-retention — 가입월 코호트 × N개월 재구매율(리텐션). [현 차수] Klaviyo 코호트 정합. ─── */
    public static function cohortRetention(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $pdo = self::db();
        $tenant = self::tenant($req);
        try {
            $cs = $pdo->prepare("SELECT id, created_at FROM crm_customers WHERE tenant_id=:t");
            $cs->execute([':t'=>$tenant]);
            $custs = $cs->fetchAll(\PDO::FETCH_ASSOC);
            $ps = $pdo->prepare("SELECT customer_id, created_at FROM crm_activities WHERE tenant_id=:t AND type='purchase'");
            $ps->execute([':t'=>$tenant]);
            $purch = [];
            foreach ($ps->fetchAll(\PDO::FETCH_ASSOC) as $p) { $purch[(int)$p['customer_id']][] = (string)$p['created_at']; }
        } catch (\Throwable $e) {
            return self::jsonRes($res, ['ok'=>true, 'cohorts'=>[], 'max_offset'=>0]);
        }
        $offMonths = function (string $a, string $b): int {
            $a = substr($a, 0, 7); $b = substr($b, 0, 7);
            if (strlen($a) < 7 || strlen($b) < 7) return -1;
            [$ay, $am] = array_map('intval', explode('-', $a));
            [$by, $bm] = array_map('intval', explode('-', $b));
            return ($by - $ay) * 12 + ($bm - $am);
        };
        $MAXO = 11;
        $cohorts = [];
        foreach ($custs as $c) {
            $cm = substr((string)($c['created_at'] ?? ''), 0, 7);
            if (strlen($cm) < 7) continue;
            if (!isset($cohorts[$cm])) $cohorts[$cm] = ['size'=>0, 'ret'=>[]];
            $cohorts[$cm]['size']++;
            $cid = (int)$c['id'];
            foreach (($purch[$cid] ?? []) as $pd) {
                $o = $offMonths((string)$c['created_at'], $pd);
                if ($o < 0 || $o > $MAXO) continue;
                $cohorts[$cm]['ret'][$o][$cid] = true; // distinct 고객
            }
        }
        ksort($cohorts);
        $out = [];
        foreach ($cohorts as $month => $d) {
            $row = ['cohort'=>$month, 'size'=>$d['size'], 'retention'=>[]];
            for ($o = 0; $o <= $MAXO; $o++) {
                $cnt = isset($d['ret'][$o]) ? count($d['ret'][$o]) : 0;
                $row['retention'][$o] = $d['size'] > 0 ? round($cnt / $d['size'] * 100, 1) : 0.0;
            }
            $out[] = $row;
        }
        return self::jsonRes($res, ['ok'=>true, 'cohorts'=>array_reverse($out), 'max_offset'=>$MAXO]);
    }

    /* ─── GET /crm/product-affinity — 상품 연관분석(함께 구매) [257차 net-new] ───
       동일 고객(buyer_email)이 구매한 SKU 쌍의 동시구매 고객수·support·confidence(A→B/B→A)·lift 산출.
       크로스셀/번들 추천의 근거(Amazon "함께 구매" / 장바구니 분석). 실 주문(취소/반품 제외)만·테넌트 스코프·가짜0.
       ★channel_orders 는 주문당 1행이라 주문내 라인 co-occurrence 불가 → 고객 레벨 동시구매(고객당 SKU집합)로 산출.
       파라미터: ?min_co=2(최소 동시구매 고객수)&top=30. */
    public static function productAffinity(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $pdo    = self::db();
        $tenant = self::tenant($req);
        $q      = $req->getQueryParams();
        $minCo  = max(2, min(50, (int)($q['min_co'] ?? 2)));
        $top    = min(100, max(5, (int)($q['top'] ?? 30)));

        // 고객(buyer_email)별 구매 SKU 집합(취소/반품 제외) + SKU별 구매고객수·상품명
        $byBuyer = []; $skuName = []; $skuBuyers = [];
        try {
            $st = $pdo->prepare("SELECT LOWER(buyer_email) AS be, sku, MAX(product_name) AS name
                                   FROM channel_orders
                                  WHERE tenant_id = :t AND buyer_email IS NOT NULL AND buyer_email <> ''
                                    AND sku IS NOT NULL AND sku <> ''
                                    AND (event_type IS NULL OR event_type = 'order')
                                  GROUP BY LOWER(buyer_email), sku");
            $st->execute([':t' => $tenant]);
            foreach ($st->fetchAll(\PDO::FETCH_ASSOC) as $r) {
                $be = (string)$r['be']; $sku = (string)$r['sku'];
                if ($be === '' || $sku === '') continue;
                $byBuyer[$be][$sku] = true;
                if (!isset($skuName[$sku])) $skuName[$sku] = (string)(($r['name'] ?? '') !== '' ? $r['name'] : $sku);
                $skuBuyers[$sku] = ($skuBuyers[$sku] ?? 0) + 1;
            }
        } catch (\Throwable $e) { $byBuyer = []; }

        $totalBuyers = count($byBuyer);
        if ($totalBuyers < 2) {
            return self::jsonRes($res, ['ok' => true, 'pairs' => [], 'total_buyers' => $totalBuyers,
                'params' => ['min_co' => $minCo]]);
        }

        // SKU 쌍 동시구매 카운트(정렬키로 방향 중복 제거). 폭주 방지: SKU 200개 초과 고객은 스킵.
        $pairCo = [];
        foreach ($byBuyer as $skus) {
            $list = array_keys($skus);
            $n = count($list);
            if ($n < 2 || $n > 200) continue;
            sort($list);
            for ($i = 0; $i < $n; $i++) {
                for ($j = $i + 1; $j < $n; $j++) {
                    $key = $list[$i] . '||' . $list[$j];
                    $pairCo[$key] = ($pairCo[$key] ?? 0) + 1;
                }
            }
        }

        $pairs = [];
        foreach ($pairCo as $key => $co) {
            if ($co < $minCo) continue;
            [$a, $b] = explode('||', $key, 2);
            $ba = $skuBuyers[$a] ?? 0; $bb = $skuBuyers[$b] ?? 0;
            if ($ba <= 0 || $bb <= 0) continue;
            $pa = $ba / $totalBuyers; $pb = $bb / $totalBuyers; $pab = $co / $totalBuyers;
            $pairs[] = [
                'a' => $a, 'a_name' => $skuName[$a] ?? $a,
                'b' => $b, 'b_name' => $skuName[$b] ?? $b,
                'co_buyers' => $co, 'buyers_a' => $ba, 'buyers_b' => $bb,
                'support'   => round($pab * 100, 2),       // 전체 고객 중 둘 다 구매 비율(%)
                'conf_ab'   => round($co / $ba * 100, 1),  // A 구매자 중 B도 구매(%)
                'conf_ba'   => round($co / $bb * 100, 1),  // B 구매자 중 A도 구매(%)
                'lift'      => ($pa > 0 && $pb > 0) ? round($pab / ($pa * $pb), 2) : 0, // 연관강도(1=무관·>1 양의연관)
            ];
        }
        // 연관강도(lift) 큰 순, 동률이면 동시구매 고객수
        usort($pairs, fn($x, $y) => ($y['lift'] <=> $x['lift']) ?: ($y['co_buyers'] <=> $x['co_buyers']));
        $pairs = array_slice($pairs, 0, $top);

        return self::jsonRes($res, ['ok' => true, 'pairs' => $pairs, 'total_buyers' => $totalBuyers,
            'params' => ['min_co' => $minCo], '_env' => Db::envLabel()]);
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

    /* ─── DELETE /crm/segments/{id} ─── 191차: 세그먼트 삭제(테넌트 스코프 + 멤버 cascade) ── */
    public static function deleteSegment(Request $req, Response $res, array $args): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $pdo = self::db();
        $tenant = self::tenant($req);
        $id = (int)$args['id'];
        $chk = $pdo->prepare("SELECT id FROM crm_segments WHERE id=:id AND tenant_id=:t");
        $chk->execute([':id'=>$id, ':t'=>$tenant]);
        if (!$chk->fetch()) return self::jsonRes($res, ['ok'=>false,'error'=>'세그먼트 없음'], 404);
        $pdo->prepare("DELETE FROM crm_segment_members WHERE segment_id=:id AND tenant_id=:t")->execute([':id'=>$id, ':t'=>$tenant]);
        $pdo->prepare("DELETE FROM crm_segments WHERE id=:id AND tenant_id=:t")->execute([':id'=>$id, ':t'=>$tenant]);
        return self::jsonRes($res, ['ok'=>true]);
    }

    /* ─── POST /crm/segments/smart-seed ─── [239차+ CDP] 표준 행동기반 세그먼트 원클릭 생성 ───
       ★중복0: 기존 crm_segments + refreshSegmentMembers 재사용. 실 구매(crm_activities) 라이브 멤버십.
       동일 이름 세그먼트는 skip(중복 생성 방지). recency/ltv/frequency 행동 룰. */
    public static function smartSeedSegments(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $pdo = self::db(); $tenant = self::tenant($req); $now = self::now();
        $templates = [
            ['name'=>'VIP 고객',  'color'=>'#a855f7', 'rules'=>[['field'=>'ltv','op'=>'gte','value'=>500000],['field'=>'recency','op'=>'lte','value'=>60]]],
            ['name'=>'충성 고객', 'color'=>'#22c55e', 'rules'=>[['field'=>'frequency','op'=>'gte','value'=>3]]],
            ['name'=>'신규 고객', 'color'=>'#4f8ef7', 'rules'=>[['field'=>'frequency','op'=>'lte','value'=>1],['field'=>'recency','op'=>'lte','value'=>30]]],
            ['name'=>'이탈 위험', 'color'=>'#f59e0b', 'rules'=>[['field'=>'ltv','op'=>'gt','value'=>0],['field'=>'recency','op'=>'gte','value'=>60],['field'=>'recency','op'=>'lte','value'=>180]]],
            ['name'=>'휴면 고객', 'color'=>'#ef4444', 'rules'=>[['field'=>'recency','op'=>'gte','value'=>180]]],
            // [현 차수 약점②] 예측형 CDP 세그먼트 — RFM프록시 탈피, 실 예측필드(predicted_clv/churn_prob) 평가.
            //   refreshSegmentMembers 가 라이브 구매데이터에서 백엔드 생존모델의 portable 근사로 SQL 파생.
            ['name'=>'고가치 예측', 'color'=>'#8b5cf6', 'rules'=>[['field'=>'predicted_clv','op'=>'gte','value'=>200000],['field'=>'churn_prob','op'=>'lte','value'=>0.4]]],   // 예측 CLV 상위 & 이탈저위험
            ['name'=>'이탈위험 예측', 'color'=>'#f97316', 'rules'=>[['field'=>'churn_prob','op'=>'gte','value'=>0.6],['field'=>'frequency','op'=>'gte','value'=>2]]],          // 예측 이탈고위험 & 과거 반복구매(구제가치)
        ];
        $created = []; $skipped = [];
        foreach ($templates as $tpl) {
            $ex = $pdo->prepare("SELECT id FROM crm_segments WHERE tenant_id=:t AND name=:n");
            $ex->execute([':t'=>$tenant, ':n'=>$tpl['name']]);
            if ($ex->fetchColumn()) { $skipped[] = $tpl['name']; continue; }
            $pdo->prepare("INSERT INTO crm_segments (tenant_id,name,description,rules,color,created_at,updated_at) VALUES (:t,:n,:d,:r,:c,:ca,:ua)")
                ->execute([':t'=>$tenant, ':n'=>$tpl['name'], ':d'=>'표준 행동 세그먼트(자동 멤버십)', ':r'=>json_encode($tpl['rules']), ':c'=>$tpl['color'], ':ca'=>$now, ':ua'=>$now]);
            $sid = (int)$pdo->lastInsertId();
            $cnt = self::refreshSegmentMembers($pdo, $sid, $tpl['rules'], $tenant);
            $pdo->prepare("UPDATE crm_segments SET member_count=:c WHERE id=:id AND tenant_id=:t")->execute([':c'=>$cnt, ':id'=>$sid, ':t'=>$tenant]);
            $created[] = ['name'=>$tpl['name'], 'members'=>$cnt];
        }
        return self::jsonRes($res, ['ok'=>true,'created'=>$created,'skipped'=>$skipped]);
    }

    /**
     * [차기 P2] 예측세그먼트 자동 재편입(cron) — 룰 보유 세그먼트 멤버십을 현재 예측스코어(churn_prob/predicted_clv)로
     *   재계산. 점수 변화 시 고객 자동 편입/이탈 → "발송 직전 1회만 갱신"하던 갭 해소(예측 CDP 자동화).
     *   정적/수동 세그먼트(룰 없음)는 제외(보존). 전부 테넌트 스코프·멱등.
     */
    public static function autoRefreshPredictiveSegments(string $t): array
    {
        self::ensureTables(); $pdo = self::db();
        $refreshed = 0; $totalMembers = 0;
        try {
            $rs = $pdo->prepare("SELECT id, rules FROM crm_segments WHERE tenant_id=?");
            $rs->execute([$t]);
            foreach ($rs->fetchAll(\PDO::FETCH_ASSOC) ?: [] as $seg) {
                $rules = json_decode((string)($seg['rules'] ?? '[]'), true);
                if (!is_array($rules) || count($rules) === 0) continue; // 정적/수동 세그먼트 보존
                $cnt = self::refreshSegmentMembers($pdo, (int)$seg['id'], $rules, $t);
                $pdo->prepare("UPDATE crm_segments SET member_count=:c, updated_at=:u WHERE id=:id AND tenant_id=:t")
                    ->execute([':c'=>$cnt, ':u'=>self::now(), ':id'=>(int)$seg['id'], ':t'=>$t]);
                $refreshed++; $totalMembers += $cnt;
            }
        } catch (\Throwable $e) { return ['ok'=>false, 'error'=>$e->getMessage()]; }
        return ['ok'=>true, 'segments_refreshed'=>$refreshed, 'total_members'=>$totalMembers];
    }

    /** [차기 P2] CRM 고객 보유 테넌트(자동 재편입 cron 팬아웃). */
    public static function tenantsWithCustomers(): array
    {
        try {
            $rs = self::db()->query("SELECT DISTINCT tenant_id FROM crm_customers WHERE tenant_id IS NOT NULL AND tenant_id<>''");
            return array_values(array_filter(array_map('strval', $rs->fetchAll(\PDO::FETCH_COLUMN) ?: []), fn($t)=>$t!==''));
        } catch (\Throwable $e) { return []; }
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

    /** [현 차수 약점①] 발송 직전 stale 방지 — 세그먼트가 동적 룰을 가지면 멤버 1회 최신화(best-effort).
     *   EmailMarketing/KakaoChannel sendCampaign 이 발송 루프 진입 전 호출. 룰 없음(정적/수동 세그먼트)=무동작.
     *   refresh 실패해도 발송은 진행(materialized 멤버 그대로). 전부 테넌트 스코프. 반환=최신 멤버 수 또는 null(미수행). */
    public static function refreshSegmentForSend(\PDO $pdo, string $tenant, int $sid): ?int
    {
        if ($sid <= 0) return null;
        try {
            $seg = $pdo->prepare("SELECT rules FROM crm_segments WHERE id=:id AND tenant_id=:t");
            $seg->execute([':id'=>$sid, ':t'=>$tenant]);
            $row = $seg->fetch(\PDO::FETCH_ASSOC);
            if (!$row) return null;
            $rules = json_decode($row['rules'] ?? '[]', true);
            if (!is_array($rules) || count($rules) === 0) return null;   // 정적/수동 세그먼트 → 최신화 불필요
            $cnt = self::refreshSegmentMembers($pdo, $sid, $rules, $tenant);
            $pdo->prepare("UPDATE crm_segments SET member_count=:c WHERE id=:id AND tenant_id=:t")
                ->execute([':c'=>$cnt, ':id'=>$sid, ':t'=>$tenant]);
            return $cnt;
        } catch (\Throwable $e) { return null; }   // best-effort — 발송 진행
    }

    /** 세그먼트 멤버 재계산 — 전부 테넌트 스코프. 반환=멤버 수. */
    private static function refreshSegmentMembers(\PDO $pdo, int $sid, array $rules, string $tenant): int
    {
        $pdo->prepare("DELETE FROM crm_segment_members WHERE segment_id=:id AND tenant_id=:t")
            ->execute([':id'=>$sid, ':t'=>$tenant]);

        $tQ = $pdo->quote($tenant);
        // 191차: 멤버십 룰을 crm_activities(구매) 라이브 집계로 평가. ltv=SUM(amount), frequency=COUNT.
        //   (c.rfm_f 컬럼은 addActivity 가 갱신하지 않아 stale → 라이브 freq 가 정확). grade 는 컬럼 직접.
        //   알 수 없는 룰 필드는 무시하고 try/catch 로 세그먼트 생성 자체는 보호.
        $isMy = self::isMysql($pdo);
        // [현 차수 약점②] 예측세그먼트 RFM프록시 탈피 — '예측 이탈위험/고가치' 룰(churn_prob/predicted_clv)을
        //   라이브 구매데이터에서 SQL로 파생(백엔드 addPredictiveScores 생존모델의 portable 근사).
        //   avg_interval = lifespan/(freq-1). churn_prob ≈ recency / (2×avg_interval) → recency=2×주기 시 1.0 도달
        //   (PHP의 1-exp(-r/2I)와 단조 정합, 0.63 임계만 1.0으로 선형치환). freq<2 = recency/180 단일구매 근사.
        //   predicted_clv ≈ ltv × (1-churn) (잔존 기대가치). exp/GREATEST 미사용분기로 SQLite/MySQL 공통 평가.
        $maxFn = $isMy ? 'GREATEST' : 'MAX';   // SQLite 스칼라 max()/min() = MySQL GREATEST/LEAST
        $minFn = $isMy ? 'LEAST'    : 'MIN';
        // 평균 구매주기(일) — freq<2 또는 lifespan=0 보호(분모 최소 1). recency 비례 이탈확률, [0,0.99] 클램프.
        $churnExpr = "(CASE WHEN COALESCE(a.freq,0) >= 2 AND COALESCE(a.lifespan_days,0) > 0"
                   . " THEN {$minFn}(0.99, COALESCE(a.recency_days,99999) / (2.0 * {$maxFn}(1.0, a.lifespan_days * 1.0 / (a.freq - 1))))"
                   . " WHEN COALESCE(a.freq,0) = 1 THEN {$minFn}(0.95, COALESCE(a.recency_days,99999) / 180.0)"
                   . " ELSE 0.5 END)";
        $predClvExpr = "(COALESCE(a.ltv,0) * (1.0 - {$churnExpr}))";
        $conds = ["c.tenant_id = $tQ"];
        foreach ($rules as $rule) {
            $field = strtolower((string)($rule['field'] ?? ''));
            $op    = match($rule['op'] ?? 'eq') { 'gte'=>'>=', 'lte'=>'<=', 'gt'=>'>', 'lt'=>'<', 'eq'=>'=', 'ne'=>'!=', default=>'' };
            if (!$op) continue;
            $expr = match($field) {
                'ltv', 'monetary'              => 'COALESCE(a.ltv,0)',
                'rfm_f', 'frequency', 'freq'   => 'COALESCE(a.freq,0)',
                'recency', 'recency_days', 'days_since' => 'COALESCE(a.recency_days, 99999)', // [239차+ CDP] 최근 구매 경과일(행동기반)
                'rfm_score'                    => 'COALESCE(c.rfm_score, 0)',
                'grade'                        => 'c.grade',
                'churn_prob', 'churn_risk', 'churn' => $churnExpr,       // [현 차수 약점②] 예측 이탈확률(SQL 파생)
                'predicted_clv', 'pred_clv', 'clv' => $predClvExpr,      // [현 차수 약점②] 예측 CLV(SQL 파생)
                default                        => '',
            };
            if ($expr === '') continue;
            $raw = $rule['value'] ?? '';
            $val = is_numeric($raw) ? (float)$raw : $pdo->quote((string)$raw);
            $conds[] = "$expr $op $val";
        }
        $whereStr = implode(' AND ', $conds);
        $sidQ = (int)$sid;
        $ignore = $isMy ? 'IGNORE' : 'OR IGNORE';
        // [239차+ CDP] recency_days = 최근 구매 경과일(드라이버별 date diff). 실 구매(crm_activities) 라이브 집계.
        // [263차] recency/lifespan 은 실 구매(type='purchase')만 — refund 행이 최근성/수명을 오염하지 않도록 CASE 로 격리.
        // [현 차수 H4] identity_id 로 연결된 다중 연락처를 **한 논리적 사람**으로 통합해 ltv/freq/recency/lifespan 집계.
        //   집계는 identity(idk) 단위, 삽입 멤버는 원본 고객 행(c.id) 그대로 유지(원본 비파괴). identity 공유 고객은
        //   동일한 통합 지표를 공유 → 룰 매칭 일관. identity_id NULL/'' 이면 idk=고객 id 문자열 = 고객당 1행
        //   → 기존 per-customer 집계와 완전 동일(회귀0). crm_customers 조인으로 type/created_at 모호성 회피(act. 정규화).
        $idkA = "COALESCE(NULLIF(cc.identity_id,''), CAST(cc.id AS CHAR))";      // 집계 서브쿼리 내부(cc)
        $idkC = "COALESCE(NULLIF(c.identity_id,''), CAST(c.id AS CHAR))";        // 외부 고객 행(c)
        $mpur = "MAX(CASE WHEN act.type='purchase' THEN act.created_at END)"; $ipur = "MIN(CASE WHEN act.type='purchase' THEN act.created_at END)";
        $recencyExpr  = $isMy ? "DATEDIFF(NOW(), {$mpur})" : "CAST(julianday('now') - julianday({$mpur}) AS INTEGER)";
        // [현 차수 약점②] 구매 수명(첫↔마지막 구매 경과일) — 평균 구매주기 산출용.
        $lifespanExpr = $isMy ? "DATEDIFF({$mpur}, {$ipur})" : "CAST(julianday({$mpur}) - julianday({$ipur}) AS INTEGER)";
        try {
            $pdo->exec("INSERT {$ignore} INTO crm_segment_members (tenant_id, segment_id, customer_id)
                        SELECT {$tQ}, {$sidQ}, c.id FROM crm_customers c
                        LEFT JOIN (SELECT {$idkA} AS idk, SUM(CASE WHEN act.type='refund' THEN -act.amount ELSE act.amount END) AS ltv, SUM(CASE WHEN act.type='purchase' THEN 1 ELSE 0 END) AS freq, {$recencyExpr} AS recency_days, {$lifespanExpr} AS lifespan_days
                                   FROM crm_activities act JOIN crm_customers cc ON cc.id = act.customer_id AND cc.tenant_id={$tQ}
                                   WHERE act.type IN ('purchase','refund') AND act.tenant_id={$tQ} GROUP BY {$idkA}) a
                          ON a.idk = {$idkC}
                        WHERE {$whereStr}");
        } catch (\Throwable $e) { /* 룰 필드 오류 시 0 멤버 — 세그먼트 생성 자체는 성공(정직) */ }

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

        // [현 차수 H4] 총 고객수·활성수는 identity_id 로 연결된 다중 연락처를 **한 논리적 사람**으로 통합 후 카운트.
        //   idk = COALESCE(NULLIF(identity_id,''), CAST(id AS CHAR)); identity_id 가 NULL/'' 이면 id 문자열 = 고객당 유일
        //   → COUNT(DISTINCT idk) == COUNT(*)/COUNT(DISTINCT customer_id)(회귀0). total_ltv(SUM)·grades 는 행 단위로
        //   합/분포 불변이라 유지(부분합=전체합, 중복산정 없음).
        $q1 = $pdo->prepare("SELECT COUNT(DISTINCT COALESCE(NULLIF(identity_id,''), CAST(id AS CHAR))) FROM crm_customers WHERE tenant_id=:t");
        $q1->execute([':t'=>$tenant]); $total = (int)$q1->fetchColumn();

        // 활성(30일 내 구매) — 주문 customer_id 를 고객 identity 로 해석해 논리적 사람 기준 distinct. 고아 활동은 customer_id 로 폴백.
        $q2 = $pdo->prepare("SELECT COUNT(DISTINCT COALESCE(NULLIF(c.identity_id,''), CAST(a.customer_id AS CHAR)))
                             FROM crm_activities a
                             LEFT JOIN crm_customers c ON c.id = a.customer_id AND c.tenant_id = a.tenant_id
                             WHERE a.tenant_id=:t AND a.created_at >= :c30 AND a.type='purchase'");
        $q2->execute([':t'=>$tenant, ':c30'=>self::cutoff(30)]); $active = (int)$q2->fetchColumn();

        $q3 = $pdo->prepare("SELECT COALESCE(SUM(ltv),0) FROM crm_customers WHERE tenant_id=:t");
        $q3->execute([':t'=>$tenant]); $total_ltv = (float)$q3->fetchColumn();

        $q4 = $pdo->prepare("SELECT grade, COUNT(*) AS cnt FROM crm_customers WHERE tenant_id=:t GROUP BY grade");
        $q4->execute([':t'=>$tenant]); $grades = $q4->fetchAll(\PDO::FETCH_ASSOC);

        return self::jsonRes($res, ['ok'=>true,'total'=>$total,'active_30d'=>$active,'total_ltv'=>$total_ltv,'grades'=>$grades]);
    }
}
