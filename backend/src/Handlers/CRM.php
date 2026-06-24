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
            $newId = (int)$pdo->lastInsertId();
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
                SELECT customer_id, COUNT(*) AS purchase_count, SUM(amount) AS total_amount, MAX(created_at) AS last_purchase, MIN(created_at) AS first_purchase
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
        unset($r);
        // [240차 약점③] 예측형 CDP — 이탈확률·예측CLV 부착(기존 RFM 탭에 통합, 신규메뉴 0).
        $predictive = self::addPredictiveScores($rows);
        return self::jsonRes($res, ['ok'=>true,'customers'=>$rows,'stats'=>$stats,'predictive'=>$predictive]);
    }

    /* ─── [240차 약점③] 예측형 CDP — 구매이력 기반 통계 예측(외부의존 0, 경쟁사 Klaviyo predictive 정합) ─────
     *   churn_prob   : 생존모델 1-exp(-recency/(주기×2)) — 고객 고유 구매주기 대비 경과로 이탈확률 추정.
     *   predicted_clv: 12개월 예측가치 = AOV × 연구매빈도 × P(alive). ★실 구매데이터(crm_activities)만, 데이터부족=보수적기본. */
    private static function addPredictiveScores(array &$rows): array
    {
        $now = time();
        $sumChurn = 0.0; $highChurn = 0; $sumPredClv = 0.0; $n = 0;
        foreach ($rows as &$r) {
            $freq  = (int)($r['frequency'] ?? 0);
            $monet = (float)($r['monetary'] ?? 0);
            $last  = !empty($r['last_purchase'])  ? strtotime((string)$r['last_purchase'])  : false;
            $first = !empty($r['first_purchase']) ? strtotime((string)$r['first_purchase']) : false;
            $aov   = $freq > 0 ? $monet / $freq : 0;
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
            $churn   = round(max(0.0, min(0.99, $churn)), 3);
            $predClv = round(max(0.0, $predClv));
            $r['churn_prob']    = $churn;
            $r['predicted_clv'] = $predClv;
            $r['churn_tier']    = $churn >= 0.6 ? 'high' : ($churn >= 0.35 ? 'medium' : 'low');
            if ($freq > 0) { $sumChurn += $churn; $sumPredClv += $predClv; if ($churn >= 0.6) $highChurn++; $n++; }
        }
        unset($r);
        return ['avg_churn' => $n ? round($sumChurn / $n, 3) : 0, 'high_churn_count' => $highChurn,
                'total_predicted_clv' => round($sumPredClv), 'scored' => $n];
    }

    /* ─── [240차 약점⑥] 메시징 빈도캡(Frequency Capping) + 발송시간 최적화 — 딜리버러빌리티 보호(경쟁사 Braze/Klaviyo 정합) ───
     *   기존 crm_activities(email_sent/kakao_sent/sms_sent 로그) 재사용(중복0). 과발송 차단으로 스팸/차단/평판하락 방지. */

    /** 테넌트 빈도캡 설정 — app_setting override(없으면 기본 4건/7일). 발송 루프 1회 호출 권장. */
    public static function commsFreqConfig(\PDO $pdo, string $tenant): array
    {
        $cap = 4; $win = 7; $quietStart = 21; $quietEnd = 8; $stoEnabled = false;
        try {
            $st = $pdo->prepare("SELECT k, v FROM app_setting WHERE tenant_id=? AND k IN ('comms_freq_cap','comms_freq_window','comms_quiet_start','comms_quiet_end','comms_sto')");
            $st->execute([$tenant]);
            foreach ($st->fetchAll(\PDO::FETCH_KEY_PAIR) ?: [] as $k => $v) {
                if ($k === 'comms_freq_cap'   && is_numeric($v)) $cap = max(1, min(50, (int)$v));
                if ($k === 'comms_freq_window'&& is_numeric($v)) $win = max(1, min(90, (int)$v));
                if ($k === 'comms_quiet_start'&& is_numeric($v)) $quietStart = max(0, min(23, (int)$v));
                if ($k === 'comms_quiet_end'  && is_numeric($v)) $quietEnd = max(0, min(23, (int)$v));
                if ($k === 'comms_sto') $stoEnabled = ($v === '1' || $v === 'true');
            }
        } catch (\Throwable $e) { /* app_setting 부재 시 기본값 */ }
        return ['cap' => $cap, 'window' => $win, 'quiet_start' => $quietStart, 'quiet_end' => $quietEnd, 'sto' => $stoEnabled];
    }

    /** 빈도캡 초과 여부 — 윈도 내 발송(email/kakao/sms) 건수 ≥ cap. 오류 시 false(발송 비차단=안전). */
    public static function isFrequencyCapped(\PDO $pdo, string $tenant, int $customerId, int $cap = 4, int $windowDays = 7): bool
    {
        if ($customerId <= 0 || $cap <= 0) return false;
        $cutoff = gmdate('Y-m-d H:i:s', time() - max(1, $windowDays) * 86400);
        try {
            $st = $pdo->prepare("SELECT COUNT(*) FROM crm_activities WHERE tenant_id=? AND customer_id=? AND type IN ('email_sent','kakao_sent','sms_sent') AND created_at >= ?");
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
            // [240차 약점③] 예측형 CDP 세그먼트(경쟁사 Klaviyo predictive 정합) — 예측가치/이탈확률 의도. churn_prob/predicted_clv 정밀치는 RFM 탭 표시.
            ['name'=>'고가치 예측', 'color'=>'#8b5cf6', 'rules'=>[['field'=>'ltv','op'=>'gte','value'=>300000],['field'=>'frequency','op'=>'gte','value'=>2],['field'=>'recency','op'=>'lte','value'=>30]]],   // 활성·고가치·반복(예측 CLV 상위)
            ['name'=>'이탈위험 예측', 'color'=>'#f97316', 'rules'=>[['field'=>'frequency','op'=>'gte','value'=>3],['field'=>'recency','op'=>'gte','value'=>45]]],                                            // 과거 충성→침묵(예측 이탈·구제가치 높음)
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

        $tQ = $pdo->quote($tenant);
        // 191차: 멤버십 룰을 crm_activities(구매) 라이브 집계로 평가. ltv=SUM(amount), frequency=COUNT.
        //   (c.rfm_f 컬럼은 addActivity 가 갱신하지 않아 stale → 라이브 freq 가 정확). grade 는 컬럼 직접.
        //   알 수 없는 룰 필드는 무시하고 try/catch 로 세그먼트 생성 자체는 보호.
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
                default                        => '',
            };
            if ($expr === '') continue;
            $raw = $rule['value'] ?? '';
            $val = is_numeric($raw) ? (float)$raw : $pdo->quote((string)$raw);
            $conds[] = "$expr $op $val";
        }
        $whereStr = implode(' AND ', $conds);
        $sidQ = (int)$sid;
        $isMy = self::isMysql($pdo);
        $ignore = $isMy ? 'IGNORE' : 'OR IGNORE';
        // [239차+ CDP] recency_days = 최근 구매 경과일(드라이버별 date diff). 실 구매(crm_activities) 라이브 집계.
        $recencyExpr = $isMy ? "DATEDIFF(NOW(), MAX(created_at))" : "CAST(julianday('now') - julianday(MAX(created_at)) AS INTEGER)";
        try {
            $pdo->exec("INSERT {$ignore} INTO crm_segment_members (tenant_id, segment_id, customer_id)
                        SELECT {$tQ}, {$sidQ}, c.id FROM crm_customers c
                        LEFT JOIN (SELECT customer_id, SUM(amount) AS ltv, COUNT(*) AS freq, {$recencyExpr} AS recency_days
                                   FROM crm_activities WHERE type='purchase' AND tenant_id={$tQ} GROUP BY customer_id) a
                          ON a.customer_id = c.id
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
