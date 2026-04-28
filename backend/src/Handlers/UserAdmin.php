<?php
declare(strict_types=1);

namespace Genie\Handlers;

use Genie\Db;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;

/**
 * UserAdmin — 회원 관리 Admin API
 *
 * Plans:
 *   demo       — 무료 체험 (읽기 제한, 핵심 기능만)
 *   starter    — 유료 Starter ($49/mo)
 *   pro        — 유료 Pro ($149/mo)
 *   enterprise — 유료 Enterprise (커스텀)
 *   admin      — 시스템 관리자 (전체 권한)
 *
 * Access: admin plan 만 접근 허용
 */
final class UserAdmin
{
    private static function json(ResponseInterface $res, mixed $data, int $status = 200): ResponseInterface
    {
        $res->getBody()->write(json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
        return $res->withHeader('Content-Type', 'application/json')->withStatus($status);
    }

    private static function now(): string { return gmdate('Y-m-d\TH:i:s\Z'); }

    /** 요청자 토큰에서 admin 확인 */
    private static function requireAdmin(ServerRequestInterface $req): ?array
    {
        $h = $req->getHeaderLine('Authorization');
        preg_match('/^Bearer\s+(.+)$/i', $h, $m);
        $token = $m[1] ?? ($req->getQueryParams()['token'] ?? '');
        if (!$token) return null;

        $pdo = Db::pdo();
        $stmt = $pdo->prepare(
            "SELECT u.id, u.email, u.name, COALESCE(u.plans, u.plan, 'pro' /*replaced demo*/) as plan
               FROM user_session s
               JOIN app_user u ON u.id = s.user_id
              WHERE s.token = ? AND s.expires_at > ? AND u.is_active = 1
                AND (u.plan = 'admin' OR u.plans = 'admin')"
        );
        $stmt->execute([$token, self::now()]);
        return $stmt->fetch(\PDO::FETCH_ASSOC) ?: null;
    }

    /** 공통 필터: plan/status/검색어 */
    private static function buildQuery(array $params): array
    {
        $where = ['1=1'];
        $args  = [];

        if (!empty($params['plan'])) {
            $where[] = 'plan = ?';
            $args[]  = $params['plan'];
        }
        if (isset($params['active']) && $params['active'] !== '') {
            $where[] = 'is_active = ?';
            $args[]  = (int)$params['active'];
        }
        if (!empty($params['q'])) {
            $where[] = '(email LIKE ? OR name LIKE ? OR company LIKE ? OR phone LIKE ?)';
            $like = '%' . $params['q'] . '%';
            $args  = array_merge($args, [$like, $like, $like, $like]);
        }
        return ['WHERE ' . implode(' AND ', $where), $args];
    }

    // ── GET /v423/admin/users ──────────────────────────────────────────────────

    public static function listUsers(ServerRequestInterface $req, ResponseInterface $res): ResponseInterface
    {
        if (!self::requireAdmin($req)) {
            return self::json($res, ['ok' => false, 'error' => 'Admin access required'], 403);
        }

        $params = $req->getQueryParams();
        $page   = max(1, (int)($params['page'] ?? 1));
        $limit  = min(100, max(10, (int)($params['limit'] ?? 20)));
        $offset = ($page - 1) * $limit;

        [$whereClause, $args] = self::buildQuery($params);

        $pdo = Db::pdo();

        // Total count
        $cntStmt = $pdo->prepare("SELECT COUNT(*) FROM app_user $whereClause");
        $cntStmt->execute($args);
        $total = (int)$cntStmt->fetchColumn();

        // Users
        $stmt = $pdo->prepare(
            "SELECT u.id, u.email, u.name, u.plan, u.company, u.is_active, u.created_at,
                    u.phone, u.extra_data,
                    ps.status AS paddle_status, ps.plan_name AS paddle_plan,
                    ps.next_bill_date, ps.currency, ps.unit_price,
                    (SELECT MAX(s.created_at) FROM user_session s WHERE s.user_id = u.id) AS last_login
               FROM app_user u
               LEFT JOIN paddle_subscriptions ps ON ps.user_email = u.email
             $whereClause
             ORDER BY u.created_at DESC
             LIMIT $limit OFFSET $offset"
        );
        $stmt->execute($args);
        $users = $stmt->fetchAll(\PDO::FETCH_ASSOC);

        // Plan stats
        $statsStmt = $pdo->prepare(
            "SELECT plan, is_active, COUNT(*) as cnt FROM app_user GROUP BY plan, is_active"
        );
        $statsStmt->execute();
        $stats = [];
        foreach ($statsStmt->fetchAll(\PDO::FETCH_ASSOC) as $row) {
            $stats[$row['plan']] = ($stats[$row['plan']] ?? 0) + (int)$row['cnt'];
        }

        return self::json($res, [
            'ok'    => true,
            '명' => $users,
            'users' => $users,
            'total' => $total,
            'page'  => $page,
            'limit' => $limit,
            'pages' => (int)ceil($total / $limit),
            'stats' => $stats,
        ]);
    }

    // ── GET /v423/admin/users/{id} ────────────────────────────────────────────

    public static function getUser(ServerRequestInterface $req, ResponseInterface $res, array $args): ResponseInterface
    {
        if (!self::requireAdmin($req)) {
            return self::json($res, ['ok' => false, 'error' => 'Admin access required'], 403);
        }

        $id  = (int)($args['id'] ?? 0);
        $pdo = Db::pdo();

        $stmt = $pdo->prepare(
            "SELECT u.*, ps.status AS paddle_status, ps.plan_name AS paddle_plan,
                    ps.paddle_subscription_id, ps.next_bill_date, ps.cancelled_at,
                    ps.currency, ps.unit_price, ps.billing_cycle
               FROM app_user u
               LEFT JOIN paddle_subscriptions ps ON ps.user_email = u.email
              WHERE u.id = ?"
        );
        $stmt->execute([$id]);
        $user = $stmt->fetch(\PDO::FETCH_ASSOC);

        if (!$user) return self::json($res, ['ok' => false, 'error' => 'User not found'], 404);

        // Paddle event history
        if (!empty($user['email'])) {
            $evtStmt = $pdo->prepare(
                "SELECT paddle_event_id, event_type, occurred_at, processed
                   FROM paddle_events
                  WHERE payload LIKE ?
                  ORDER BY occurred_at DESC LIMIT 10"
            );
            $evtStmt->execute(['%' . $user['email'] . '%']);
            $user['paddle_events'] = $evtStmt->fetchAll(\PDO::FETCH_ASSOC);
        }

        return self::json($res, ['ok' => true, 'user' => $user]);
    }

    // ── PATCH /v423/admin/users/{id}/plan ─────────────────────────────────────

    public static function updatePlan(ServerRequestInterface $req, ResponseInterface $res, array $args): ResponseInterface
    {
        $admin = self::requireAdmin($req);
        if (!$admin) return self::json($res, ['ok' => false, 'error' => 'Admin access required'], 403);

        $id   = (int)($args['id'] ?? 0);
        $body = (array)($req->getParsedBody() ?? []);
        if (empty($body)) {
            $body = json_decode((string)$req->getBody(), true) ?? [];
        }

        $validPlans = ['pro' /*replaced demo*/, 'starter', 'pro', 'enterprise', 'admin'];
        $plan = $body['plan'] ?? '';
        if (!in_array($plan, $validPlans, true)) {
            return self::json($res, ['ok' => false, 'error' => 'Invalid plan. Valid: ' . implode(', ', $validPlans)], 422);
        }

        $pdo = Db::pdo();
        $stmt = $pdo->prepare("SELECT id, email, name, plan FROM app_user WHERE id = ?");
        $stmt->execute([$id]);
        $user = $stmt->fetch(\PDO::FETCH_ASSOC);
        if (!$user) return self::json($res, ['ok' => false, 'error' => 'User not found'], 404);

        $oldPlan = $user['plan'];
        $pdo->prepare("UPDATE app_user SET plan = ? WHERE id = ?")->execute([$plan, $id]);

        // Audit log
        self::auditLog($admin, "plan_change", "user#{$id} {$user['email']}: $oldPlan → $plan");

        return self::json($res, [
            'ok'      => true,
            'user_id' => $id,
            'old_plan'=> $oldPlan,
            'new_plan'=> $plan,
            'message' => "Plan updated: $oldPlan → $plan",
        ]);
    }

    // ── PATCH /v423/admin/users/{id}/active ───────────────────────────────────

    public static function setActive(ServerRequestInterface $req, ResponseInterface $res, array $args): ResponseInterface
    {
        $admin = self::requireAdmin($req);
        if (!$admin) return self::json($res, ['ok' => false, 'error' => 'Admin access required'], 403);

        $id   = (int)($args['id'] ?? 0);
        $body = (array)($req->getParsedBody() ?? []);
        if (empty($body)) $body = json_decode((string)$req->getBody(), true) ?? [];

        $active = isset($body['active']) ? (int)(bool)$body['active'] : 1;

        $pdo = Db::pdo();
        $pdo->prepare("UPDATE app_user SET is_active = ? WHERE id = ?")->execute([$active, $id]);

        // Revoke all sessions if deactivating
        if (!$active) {
            $pdo->prepare("DELETE FROM user_session WHERE user_id = ?")->execute([$id]);
        }

        self::auditLog($admin, "set_active", "user#{$id} active=$active");

        return self::json($res, ['ok' => true, 'user_id' => $id, 'is_active' => $active]);
    }

    // ── POST /v423/admin/users/{id}/reset-password ────────────────────────────

    public static function resetPassword(ServerRequestInterface $req, ResponseInterface $res, array $args): ResponseInterface
    {
        $admin = self::requireAdmin($req);
        if (!$admin) return self::json($res, ['ok' => false, 'error' => 'Admin access required'], 403);

        $id   = (int)($args['id'] ?? 0);
        $body = (array)($req->getParsedBody() ?? []);
        if (empty($body)) $body = json_decode((string)$req->getBody(), true) ?? [];

        $newPw = $body['password'] ?? '';
        if (strlen($newPw) < 6) {
            return self::json($res, ['ok' => false, 'error' => 'Password must be at least 6 characters'], 422);
        }

        $pdo = Db::pdo();
        $pdo->prepare("UPDATE app_user SET password_hash = ? WHERE id = ?")
            ->execute([password_hash($newPw, PASSWORD_DEFAULT), $id]);

        // Force re-login
        $pdo->prepare("DELETE FROM user_session WHERE user_id = ?")->execute([$id]);

        self::auditLog($admin, "reset_password", "user#{$id}");

        return self::json($res, ['ok' => true, 'message' => 'Password reset. User will need to log in again.']);
    }

    // ── POST /v423/admin/users (create a new user) ────────────────────────────

    public static function createUser(ServerRequestInterface $req, ResponseInterface $res): ResponseInterface
    {
        $admin = self::requireAdmin($req);
        if (!$admin) return self::json($res, ['ok' => false, 'error' => 'Admin access required'], 403);

        $body = (array)($req->getParsedBody() ?? []);
        if (empty($body)) $body = json_decode((string)$req->getBody(), true) ?? [];

        $email    = trim($body['email'] ?? '');
        $password = $body['password'] ?? '';
        $name     = trim($body['name'] ?? '');
        $company  = trim($body['company'] ?? '');
        $plan     = $body['plan'] ?? 'pro' /*replaced demo*/;

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return self::json($res, ['ok' => false, 'error' => 'Invalid email'], 422);
        }
        if (strlen($password) < 6) {
            return self::json($res, ['ok' => false, 'error' => 'Password must be at least 6 characters'], 422);
        }

        $validPlans = ['pro' /*replaced demo*/, 'starter', 'pro', 'enterprise', 'admin'];
        if (!in_array($plan, $validPlans, true)) $plan = 'pro' /*replaced demo*/;

        $pdo = Db::pdo();

        // Check duplicate
        $ck = $pdo->prepare("SELECT id FROM app_user WHERE email = ?");
        $ck->execute([$email]);
        if ($ck->fetchColumn()) {
            return self::json($res, ['ok' => false, 'error' => 'Email already registered'], 409);
        }

        $now = self::now();
        $pdo->prepare(
            "INSERT INTO app_user(email,password_hash,name,plan,company,is_active,created_at)
             VALUES(?,?,?,?,?,1,?)"
        )->execute([$email, password_hash($password, PASSWORD_DEFAULT), $name, $plan, $company ?: null, $now]);

        $userId = (int)$pdo->lastInsertId();
        self::auditLog($admin, "create_user", "user#{$userId} {$email} plan={$plan}");

        return self::json($res, ['ok' => true, 'user_id' => $userId, 'plan' => $plan], 201);
    }

    // ── GET /v423/admin/stats ─────────────────────────────────────────────────

    public static function stats(ServerRequestInterface $req, ResponseInterface $res): ResponseInterface
    {
        if (!self::requireAdmin($req)) {
            return self::json($res, ['ok' => false, 'error' => 'Admin access required'], 403);
        }

        $pdo = Db::pdo();

        // User counts by plan
        $byPlan = $pdo->query(
            "SELECT plan, COUNT(*) as total, SUM(is_active) as active FROM app_user GROUP BY plan"
        )->fetchAll(\PDO::FETCH_ASSOC);

        // New users (last 30 days)
        $newUsers = (int)$pdo->query(
            "SELECT COUNT(*) FROM app_user WHERE created_at >= date('now', '-30 days') OR created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)"
        )->fetchColumn();

        // Active sessions
        $sessions = (int)$pdo->query(
            "SELECT COUNT(*) FROM user_session WHERE expires_at > '" . self::now() . "'"
        )->fetchColumn();

        // Revenue estimate (from paddle_subscriptions)
        try {
            $mrr = (float)$pdo->query(
                "SELECT COALESCE(SUM(unit_price), 0) FROM paddle_subscriptions WHERE status='active'"
            )->fetchColumn();
        } catch (\Exception $e) {
            $mrr = 0;
        }

        // Recent signups (last 10)
        $recent = $pdo->query(
            "SELECT id, email, name, plan, created_at FROM app_user ORDER BY created_at DESC LIMIT 10"
        )->fetchAll(\PDO::FETCH_ASSOC);

        return self::json($res, [
            'ok'         => true,
            'by_plan'    => $byPlan,
            'new_users_30d' => $newUsers,
            'active_sessions' => $sessions,
            'mrr_usd'    => $mrr,
            'recent'     => $recent,
        ]);
    }

    // ── Audit log ─────────────────────────────────────────────────────────────

    private static function auditLog(array $admin, string $action, string $detail): void
    {
        try {
            Db::pdo()->prepare(
                "INSERT INTO paddle_audit_log (event_id, action, detail)
                 VALUES (?, ?, ?)"
            )->execute(["admin#{$admin['id']}", "admin:$action", $detail]);
        } catch (\Exception $e) {
            error_log('[UserAdmin] Audit error: ' . $e->getMessage());
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ── 기간별 구독요금 관리 (plan_prices table) ─────────────────────────────
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * GET /v423/admin/plan-prices
     * 전체 플랜 × 기간별 요금표 조회
     */
    public static function listPlanPrices(ServerRequestInterface $req, ResponseInterface $res): ResponseInterface
    {
        if (!self::requireAdmin($req)) {
            return self::json($res, ['ok' => false, 'error' => 'Admin access required'], 403);
        }

        $pdo  = Db::pdo();
        $rows = $pdo->query(
            "SELECT * FROM plan_prices ORDER BY plan_key, period_months ASC"
        )->fetchAll(\PDO::FETCH_ASSOC);

        return self::json($res, ['ok' => true, 'prices' => $rows]);
    }

    /**
     * POST /v423/admin/plan-prices
     * 요금 등록 또는 수정 (upsert)
     * Body: { plan_key, period_months, price_usd, currency, discount_pct, label_ko, label_en, paddle_price_id, is_active }
     */
    public static function upsertPlanPrice(ServerRequestInterface $req, ResponseInterface $res): ResponseInterface
    {
        $admin = self::requireAdmin($req);
        if (!$admin) return self::json($res, ['ok' => false, 'error' => 'Admin access required'], 403);

        $body = (array)($req->getParsedBody() ?? []);
        if (empty($body)) $body = json_decode((string)$req->getBody(), true) ?? [];

        $planKey      = $body['plan_key']      ?? '';
        $periodMonths = (int)($body['period_months'] ?? 1);
        $priceUsd     = (float)($body['price_usd'] ?? 0);
        $currency     = $body['currency']     ?? 'USD';
        $discountPct  = (float)($body['discount_pct'] ?? 0);
        $labelKo      = $body['label_ko']      ?? '';
        $labelEn      = $body['label_en']      ?? '';
        $paddlePriceId= $body['paddle_price_id'] ?? '';
        $isActive     = isset($body['is_active']) ? (int)(bool)$body['is_active'] : 1;

        $validPlans   = ['free', 'pro' /*replaced demo*/, 'starter', 'growth', 'pro', 'enterprise'];

        $validPeriods = [1, 3, 6, 12, 24];

        if (!in_array($planKey, $validPlans, true)) {
            return self::json($res, ['ok' => false, 'error' => 'Invalid plan_key'], 422);
        }
        if (!in_array($periodMonths, $validPeriods, true)) {
            return self::json($res, ['ok' => false, 'error' => 'Invalid period_months (1,3,6,12,24)'], 422);
        }
        if ($priceUsd < 0) {
            return self::json($res, ['ok' => false, 'error' => 'price_usd must be >= 0'], 422);
        }

        $pdo = Db::pdo();
        $driver = $pdo->getAttribute(\PDO::ATTR_DRIVER_NAME);

        if ($driver === 'mysql') {
            $pdo->prepare("
                INSERT INTO plan_prices
                    (plan_key, period_months, price_usd, currency, discount_pct, label_ko, label_en, paddle_price_id, is_active, updated_at)
                VALUES (?,?,?,?,?,?,?,?,?,NOW())
                ON DUPLICATE KEY UPDATE
                    price_usd=VALUES(price_usd), currency=VALUES(currency),
                    discount_pct=VALUES(discount_pct), label_ko=VALUES(label_ko),
                    label_en=VALUES(label_en), paddle_price_id=VALUES(paddle_price_id),
                    is_active=VALUES(is_active), updated_at=NOW()
            ")->execute([$planKey, $periodMonths, $priceUsd, $currency, $discountPct, $labelKo, $labelEn, $paddlePriceId, $isActive]);
        } else {
            // SQLite
            $pdo->prepare("
                INSERT INTO plan_prices
                    (plan_key, period_months, price_usd, currency, discount_pct, label_ko, label_en, paddle_price_id, is_active, updated_at)
                VALUES (?,?,?,?,?,?,?,?,?,datetime('now'))
                ON CONFLICT(plan_key, period_months) DO UPDATE SET
                    price_usd=excluded.price_usd, currency=excluded.currency,
                    discount_pct=excluded.discount_pct, label_ko=excluded.label_ko,
                    label_en=excluded.label_en, paddle_price_id=excluded.paddle_price_id,
                    is_active=excluded.is_active, updated_at=datetime('now')
            ")->execute([$planKey, $periodMonths, $priceUsd, $currency, $discountPct, $labelKo, $labelEn, $paddlePriceId, $isActive]);
        }

        self::auditLog($admin, "upsert_plan_price", "$planKey/{$periodMonths}mo = \${$priceUsd}");
        return self::json($res, ['ok' => true, 'message' => "Plan price saved: $planKey / {$periodMonths} month(s)"]);
    }

    /**
     * DELETE /v423/admin/plan-prices/{plan}/{period}
     */
    public static function deletePlanPrice(ServerRequestInterface $req, ResponseInterface $res, array $args): ResponseInterface
    {
        $admin = self::requireAdmin($req);
        if (!$admin) return self::json($res, ['ok' => false, 'error' => 'Admin access required'], 403);

        $plan   = $args['plan']   ?? '';
        $period = (int)($args['period'] ?? 0);

        Db::pdo()->prepare(
            "DELETE FROM plan_prices WHERE plan_key = ? AND period_months = ?"
        )->execute([$plan, $period]);

        self::auditLog($admin, "delete_plan_price", "$plan/{$period}mo");
        return self::json($res, ['ok' => true]);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ── 권한(역할) 관리 ─────────────────────────────────────────────────────
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * GET /v423/admin/roles
     * 역할 목록 조회
     */
    public static function listRoles(ServerRequestInterface $req, ResponseInterface $res): ResponseInterface
    {
        if (!self::requireAdmin($req)) {
            return self::json($res, ['ok' => false, 'error' => 'Admin access required'], 403);
        }

        $rows = Db::pdo()->query(
            "SELECT * FROM admin_roles ORDER BY sort_order ASC, id ASC"
        )->fetchAll(\PDO::FETCH_ASSOC);

        return self::json($res, ['ok' => true, 'roles' => $rows]);
    }

    /**
     * POST /v423/admin/roles
     * 역할 생성/수정 (upsert by role_key)
     * Body: { role_key, name_ko, name_en, permissions (JSON array), is_active, sort_order }
     */
    public static function upsertRole(ServerRequestInterface $req, ResponseInterface $res): ResponseInterface
    {
        $admin = self::requireAdmin($req);
        if (!$admin) return self::json($res, ['ok' => false, 'error' => 'Admin access required'], 403);

        $body = (array)($req->getParsedBody() ?? []);
        if (empty($body)) $body = json_decode((string)$req->getBody(), true) ?? [];

        $roleKey    = trim($body['role_key']  ?? '');
        $nameKo     = trim($body['name_ko']   ?? '');
        $nameEn     = trim($body['name_en']   ?? '');
        $perms      = $body['permissions']    ?? [];
        $isActive   = isset($body['is_active']) ? (int)(bool)$body['is_active'] : 1;
        $sortOrder  = (int)($body['sort_order'] ?? 0);

        if (!$roleKey || !preg_match('/^[a-z0-9_]+$/', $roleKey)) {
            return self::json($res, ['ok' => false, 'error' => 'role_key must be lowercase alphanumeric/underscore'], 422);
        }

        $permsJson = json_encode(is_array($perms) ? $perms : []);
        $pdo = Db::pdo();
        $driver = $pdo->getAttribute(\PDO::ATTR_DRIVER_NAME);

        if ($driver === 'mysql') {
            $pdo->prepare("
                INSERT INTO admin_roles (role_key, name_ko, name_en, permissions, is_active, sort_order, updated_at)
                VALUES (?,?,?,?,?,?,NOW())
                ON DUPLICATE KEY UPDATE
                    name_ko=VALUES(name_ko), name_en=VALUES(name_en),
                    permissions=VALUES(permissions), is_active=VALUES(is_active),
                    sort_order=VALUES(sort_order), updated_at=NOW()
            ")->execute([$roleKey, $nameKo, $nameEn, $permsJson, $isActive, $sortOrder]);
        } else {
            $pdo->prepare("
                INSERT INTO admin_roles (role_key, name_ko, name_en, permissions, is_active, sort_order, updated_at)
                VALUES (?,?,?,?,?,?,datetime('now'))
                ON CONFLICT(role_key) DO UPDATE SET
                    name_ko=excluded.name_ko, name_en=excluded.name_en,
                    permissions=excluded.permissions, is_active=excluded.is_active,
                    sort_order=excluded.sort_order, updated_at=datetime('now')
            ")->execute([$roleKey, $nameKo, $nameEn, $permsJson, $isActive, $sortOrder]);
        }

        self::auditLog($admin, "upsert_role", "role_key=$roleKey");
        return self::json($res, ['ok' => true, 'role_key' => $roleKey]);
    }

    /**
     * DELETE /v423/admin/roles/{role_key}
     */
    public static function deleteRole(ServerRequestInterface $req, ResponseInterface $res, array $args): ResponseInterface
    {
        $admin = self::requireAdmin($req);
        if (!$admin) return self::json($res, ['ok' => false, 'error' => 'Admin access required'], 403);

        $roleKey = $args['role_key'] ?? '';
        Db::pdo()->prepare("DELETE FROM admin_roles WHERE role_key = ?")->execute([$roleKey]);
        self::auditLog($admin, "delete_role", "role_key=$roleKey");
        return self::json($res, ['ok' => true]);
    }

    /**
     * PATCH /v423/admin/users/{id}/role
     * 사용자에 역할 직접 부여 (sub-role in user_roles table)
     */
    public static function assignRole(ServerRequestInterface $req, ResponseInterface $res, array $args): ResponseInterface
    {
        $admin = self::requireAdmin($req);
        if (!$admin) return self::json($res, ['ok' => false, 'error' => 'Admin access required'], 403);

        $userId = (int)($args['id'] ?? 0);
        $body   = (array)($req->getParsedBody() ?? []);
        if (empty($body)) $body = json_decode((string)$req->getBody(), true) ?? [];

        $roleKey = $body['role_key'] ?? '';
        $pdo     = Db::pdo();

        // Verify role exists
        $rStmt = $pdo->prepare("SELECT id FROM admin_roles WHERE role_key = ?");
        $rStmt->execute([$roleKey]);
        if (!$rStmt->fetchColumn()) {
            return self::json($res, ['ok' => false, 'error' => "Role '$roleKey' not found"], 404);
        }

        $driver = $pdo->getAttribute(\PDO::ATTR_DRIVER_NAME);
        if ($driver === 'mysql') {
            $pdo->prepare("
                INSERT INTO user_roles (user_id, role_key, granted_by, created_at)
                VALUES (?,?,?,NOW())
                ON DUPLICATE KEY UPDATE granted_by=VALUES(granted_by), created_at=NOW()
            ")->execute([$userId, $roleKey, $admin['id']]);
        } else {
            $pdo->prepare("
                INSERT OR REPLACE INTO user_roles (user_id, role_key, granted_by, created_at)
                VALUES (?,?,?,datetime('now'))
            ")->execute([$userId, $roleKey, $admin['id']]);
        }

        self::auditLog($admin, "assign_role", "user#{$userId} role=$roleKey");
        return self::json($res, ['ok' => true, 'user_id' => $userId, 'role_key' => $roleKey]);
    }

    /**
     * GET /v423/admin/users/{id}/roles
     * 특정 사용자의 역할 목록
     */
    public static function getUserRoles(ServerRequestInterface $req, ResponseInterface $res, array $args): ResponseInterface
    {
        if (!self::requireAdmin($req)) {
            return self::json($res, ['ok' => false, 'error' => 'Admin access required'], 403);
        }

        $userId = (int)($args['id'] ?? 0);
        $stmt = Db::pdo()->prepare(
            "SELECT ur.role_key, r.name_ko, r.name_en, r.permissions, ur.created_at
               FROM user_roles ur
               JOIN admin_roles r ON r.role_key = ur.role_key
              WHERE ur.user_id = ?"
        );
        $stmt->execute([$userId]);
        $roles = $stmt->fetchAll(\PDO::FETCH_ASSOC);

        return self::json($res, ['ok' => true, 'roles' => $roles]);
    }

    /**
     * DELETE /v423/admin/users/{id}/roles/{role_key}
     * 특정 사용자의 역할 해제
     */
    public static function revokeRole(ServerRequestInterface $req, ResponseInterface $res, array $args): ResponseInterface
    {
        $admin = self::requireAdmin($req);
        if (!$admin) return self::json($res, ['ok' => false, 'error' => 'Admin access required'], 403);

        $userId  = (int)($args['id'] ?? 0);
        $roleKey = $args['role_key'] ?? '';

        Db::pdo()->prepare("DELETE FROM user_roles WHERE user_id = ? AND role_key = ?")
            ->execute([$userId, $roleKey]);

        self::auditLog($admin, "revoke_role", "user#{$userId} role=$roleKey");
        return self::json($res, ['ok' => true]);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ── 결제 내역 조회 ────────────────────────────────────────────────────────
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * GET /v423/admin/billing
     * 전체 결제 내역 + 구독 현황
     */
    public static function billingList(ServerRequestInterface $req, ResponseInterface $res): ResponseInterface
    {
        if (!self::requireAdmin($req)) {
            return self::json($res, ['ok' => false, 'error' => 'Admin access required'], 403);
        }

        $params = $req->getQueryParams();
        $page   = max(1, (int)($params['page'] ?? 1));
        $limit  = min(100, (int)($params['limit'] ?? 20));
        $offset = ($page - 1) * $limit;

        $pdo = Db::pdo();

        // Subscriptions
        try {
            $total = (int)$pdo->query("SELECT COUNT(*) FROM paddle_subscriptions")->fetchColumn();
            $subs  = $pdo->prepare("
                SELECT ps.*, u.name AS user_name
                  FROM paddle_subscriptions ps
                  LEFT JOIN app_user u ON u.email = ps.user_email
                 ORDER BY ps.created_at DESC
                 LIMIT $limit OFFSET $offset
            ");
            $subs->execute();
            $subscriptions = $subs->fetchAll(\PDO::FETCH_ASSOC);
        } catch (\Exception $e) {
            $subscriptions = [];
            $total = 0;
        }

        // Recent payment events
        try {
            $evtStmt = $pdo->prepare("
                SELECT paddle_event_id, event_type, occurred_at, processed
                  FROM paddle_events
                 WHERE event_type IN ('subscription_payment_succeeded','subscription_payment_failed','payment_refunded')
                 ORDER BY occurred_at DESC LIMIT 50
            ");
            $evtStmt->execute();
            $events = $evtStmt->fetchAll(\PDO::FETCH_ASSOC);
        } catch (\Exception $e) {
            $events = [];
        }

        // MRR by plan
        try {
            $mrrByPlan = $pdo->query(
                "SELECT plan_name, SUM(unit_price) as mrr, COUNT(*) as count
                   FROM paddle_subscriptions WHERE status='active'
                  GROUP BY plan_name"
            )->fetchAll(\PDO::FETCH_ASSOC);
        } catch (\Exception $e) {
            $mrrByPlan = [];
        }

        return self::json($res, [
            'ok'            => true,
            'subscriptions' => $subscriptions,
            'total'         => $total,
            'page'          => $page,
            'limit'         => $limit,
            'events'        => $events,
            'mrr_by_plan'   => $mrrByPlan,
        ]);
    }

    /**
     * GET /v423/admin/audit-logs
     * 감사 로그 조회
     */
    public static function auditLogs(ServerRequestInterface $req, ResponseInterface $res): ResponseInterface
    {
        if (!self::requireAdmin($req)) {
            return self::json($res, ['ok' => false, 'error' => 'Admin access required'], 403);
        }

        $params = $req->getQueryParams();
        $limit  = min(200, (int)($params['limit'] ?? 50));

        try {
            $rows = Db::pdo()->prepare(
                "SELECT * FROM paddle_audit_log ORDER BY created_at DESC LIMIT $limit"
            );
            $rows->execute();
            $logs = $rows->fetchAll(\PDO::FETCH_ASSOC);
        } catch (\Exception $e) {
            $logs = [];
        }

        return self::json($res, ['ok' => true, 'logs' => $logs]);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ── 무료 쿠폰 관리 (free_coupons table) ─────────────────────────────────
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * POST /v423/admin/coupons
     * 관리자 → 특정 회원에게 무료 이용 쿠폰 발급
     * Body: {
     *   user_id        int|null  — null이면 범용 쿠폰
     *   plan           string    — 적용 플랜 (pro, enterprise, …)
     *   duration_days  int       — 이용일수 (7/14/30/90/365)
     *   max_uses       int       — 최대 사용횟수 (1 = 1인 전용, >1 = 다중)
     *   note           string    — 발급 메모
     * }
     */
    public static function issueCoupon(ServerRequestInterface $req, ResponseInterface $res): ResponseInterface
    {
        $admin = self::requireAdmin($req);
        if (!$admin) return self::json($res, ['ok' => false, 'error' => 'Admin access required'], 403);

        $body = (array)($req->getParsedBody() ?? []);
        if (empty($body)) $body = json_decode((string)$req->getBody(), true) ?? [];

        $userId       = isset($body['user_id']) && $body['user_id'] ? (int)$body['user_id'] : null;
        $plan         = trim($body['plan'] ?? 'pro');
        $durationDays = max(1, (int)($body['duration_days'] ?? 30));
        $maxUses      = max(1, (int)($body['max_uses'] ?? 1));
        $note         = trim($body['note'] ?? '');

        $validPlans = ['growth', 'starter', 'pro', 'enterprise'];
        if (!in_array($plan, $validPlans, true)) {
            return self::json($res, ['ok' => false, 'error' => "Invalid plan. Use: " . implode(', ', $validPlans)], 422);
        }

        $pdo = Db::pdo();

        // 지정 회원이 있으면 존재여부 확인 (demo/free 회원도 가능)
        $userEmail = null;
        $requires_profile = false;
        if ($userId) {
            $uStmt = $pdo->prepare("SELECT id, email, plan, company, phone FROM app_user WHERE id = ?");
            $uStmt->execute([$userId]);
            $uRow = $uStmt->fetch(\PDO::FETCH_ASSOC);
            if (!$uRow) return self::json($res, ['ok' => false, 'error' => 'User not found'], 404);
            $userEmail = $uRow['email'];
            // 무료회원에게 발급 시 프로필 등록 필수 플래그
            if (in_array($uRow['plan'], ['pro' /*replaced demo*/, 'free'], true)) {
                $requires_profile = true;
            }
        }

        // 쿠폰 코드 생성 (GENIE-FREE-XXXXXX)
        $code = 'GENIE-FREE-' . strtoupper(bin2hex(random_bytes(4)));

        $driver = $pdo->getAttribute(\PDO::ATTR_DRIVER_NAME);
        if ($driver === 'mysql') {
            $pdo->prepare("
                INSERT INTO free_coupons
                    (code, plan, duration_days, max_uses, issued_to_user_id, issued_to_email, note, issued_by, created_at)
                VALUES (?,?,?,?,?,?,?,?,NOW())
            ")->execute([$code, $plan, $durationDays, $maxUses, $userId, $userEmail, $note, $admin['id']]);
        } else {
            $pdo->prepare("
                INSERT INTO free_coupons
                    (code, plan, duration_days, max_uses, issued_to_user_id, issued_to_email, note, issued_by, created_at)
                VALUES (?,?,?,?,?,?,?,?,datetime('now'))
            ")->execute([$code, $plan, $durationDays, $maxUses, $userId, $userEmail, $note, $admin['id']]);
        }

        $couponId = (int)$pdo->lastInsertId();
        // requires_profile 플래그 저장
        if ($requires_profile) {
            try {
                $pdo->prepare("UPDATE free_coupons SET note = CONCAT(COALESCE(note,''),' [profile_required]') WHERE id = ?")
                    ->execute([$couponId]);
            } catch (\Exception $e) {}
        }
        self::auditLog($admin, "issue_coupon", "coupon#$couponId $code → user#$userId plan=$plan {$durationDays}d" . ($requires_profile ? ' [profile_required]' : ''));

        return self::json($res, [
            'ok'              => true,
            'coupon_id'       => $couponId,
            'code'            => $code,
            'plan'            => $plan,
            'duration_days'   => $durationDays,
            'max_uses'        => $maxUses,
            'issued_to'       => $userEmail,
            'requires_profile'=> $requires_profile,
            'message'         => "쿠폰 발급 완료: $code" . ($requires_profile ? " (무료회원 → 추가 정보 등록 필요)" : ""),
        ], 201);
    }

    /**
     * GET /v423/admin/coupons
     * 쿠폰 목록 조회 (admin)
     */
    public static function listCoupons(ServerRequestInterface $req, ResponseInterface $res): ResponseInterface
    {
        if (!self::requireAdmin($req)) {
            return self::json($res, ['ok' => false, 'error' => 'Admin access required'], 403);
        }

        $params = $req->getQueryParams();
        $page   = max(1, (int)($params['page'] ?? 1));
        $limit  = min(100, (int)($params['limit'] ?? 20));
        $offset = ($page - 1) * $limit;

        $pdo = Db::pdo();
        try {
            $total = (int)$pdo->query("SELECT COUNT(*) FROM free_coupons")->fetchColumn();
            $stmt  = $pdo->prepare("
                SELECT fc.*, u.email AS redeemer_email, u.name AS redeemer_name
                  FROM free_coupons fc
                  LEFT JOIN app_user u ON u.id = fc.redeemed_by_user_id
                 ORDER BY fc.created_at DESC
                 LIMIT $limit OFFSET $offset
            ");
            $stmt->execute();
            $coupons = $stmt->fetchAll(\PDO::FETCH_ASSOC);
        } catch (\Exception $e) {
            // 테이블이 없을 경우 빈 배열
            $coupons = [];
            $total   = 0;
        }

        // KPI
        try {
            $kpi = $pdo->query("
                SELECT
                  COUNT(*) AS total,
                  SUM(CASE WHEN is_revoked=0 AND (redeemed_at IS NULL AND use_count < max_uses) THEN 1 ELSE 0 END) AS active,
                  SUM(CASE WHEN use_count >= max_uses THEN 1 ELSE 0 END) AS used,
                  SUM(CASE WHEN is_revoked=1 THEN 1 ELSE 0 END) AS revoked
                FROM free_coupons
            ")->fetch(\PDO::FETCH_ASSOC);
        } catch (\Exception $e) {
            $kpi = ['total'=>0,'active'=>0,'used'=>0,'revoked'=>0];
        }

        return self::json($res, [
            'ok'      => true,
            'coupons' => $coupons,
            'total'   => $total,
            'page'    => $page,
            'limit'   => $limit,
            'pages'   => (int)ceil(max(1, $total) / $limit),
            'kpi'     => $kpi,
        ]);
    }

    /**
     * POST /v423/admin/coupons/{id}/revoke
     * 쿠폰 취소 (admin)
     */
    public static function revokeCoupon(ServerRequestInterface $req, ResponseInterface $res, array $args): ResponseInterface
    {
        $admin = self::requireAdmin($req);
        if (!$admin) return self::json($res, ['ok' => false, 'error' => 'Admin access required'], 403);

        $id  = (int)($args['id'] ?? 0);
        $pdo = Db::pdo();

        $stmt = $pdo->prepare("SELECT id, code, is_revoked FROM free_coupons WHERE id = ?");
        $stmt->execute([$id]);
        $coupon = $stmt->fetch(\PDO::FETCH_ASSOC);
        if (!$coupon) return self::json($res, ['ok' => false, 'error' => 'Coupon not found'], 404);
        if ($coupon['is_revoked']) return self::json($res, ['ok' => false, 'error' => 'Already revoked'], 409);

        $pdo->prepare("UPDATE free_coupons SET is_revoked=1 WHERE id=?")->execute([$id]);
        self::auditLog($admin, "revoke_coupon", "coupon#$id {$coupon['code']}");

        return self::json($res, ['ok' => true, 'message' => "쿠폰 {$coupon['code']} 취소 완료"]);
    }

    /**
     * POST /v423/coupons/redeem
     * 회원 → 쿠폰 사용 (plan 적용)
     * Body: { code }
     */
    public static function redeemCoupon(ServerRequestInterface $req, ResponseInterface $res): ResponseInterface
    {
        // 일반 로그인 사용자 인증
        $h = $req->getHeaderLine('Authorization');
        preg_match('/^Bearer\s+(.+)$/i', $h, $m);
        $token = $m[1] ?? '';
        if (!$token) return self::json($res, ['ok' => false, 'error' => 'Login required'], 401);

        $pdo = Db::pdo();
        $sStmt = $pdo->prepare(
            "SELECT u.id, u.email, u.name, u.plan
               FROM user_session s
               JOIN app_user u ON u.id = s.user_id
              WHERE s.token = ? AND s.expires_at > ? AND u.is_active = 1"
        );
        $sStmt->execute([$token, self::now()]);
        $user = $sStmt->fetch(\PDO::FETCH_ASSOC);
        if (!$user) return self::json($res, ['ok' => false, 'error' => 'Session expired or invalid'], 401);

        $body = (array)($req->getParsedBody() ?? []);
        if (empty($body)) $body = json_decode((string)$req->getBody(), true) ?? [];

        $code = strtoupper(trim($body['code'] ?? ''));
        if (!$code) return self::json($res, ['ok' => false, 'error' => '쿠폰 코드를 입력해주세요'], 422);

        // 쿠폰 조회
        $cStmt = $pdo->prepare("SELECT * FROM free_coupons WHERE code = ?");
        $cStmt->execute([$code]);
        $coupon = $cStmt->fetch(\PDO::FETCH_ASSOC);

        if (!$coupon) return self::json($res, ['ok' => false, 'error' => '등록되지 않은 쿠폰 코드입니다'], 404);
        if ($coupon['is_revoked']) return self::json($res, ['ok' => false, 'error' => '취소된 쿠폰입니다'], 409);
        if ((int)$coupon['use_count'] >= (int)$coupon['max_uses']) {
            return self::json($res, ['ok' => false, 'error' => '이미 사용 완료된 쿠폰입니다'], 409);
        }

        // 특정 회원 전용 쿠폰 검사
        if ($coupon['issued_to_user_id'] && (int)$coupon['issued_to_user_id'] !== (int)$user['id']) {
            return self::json($res, ['ok' => false, 'error' => '해당 계정에서 사용할 수 없는 쿠폰입니다'], 403);
        }

        // ── 무료회원 프로필 완성 여부 확인 ──────────────────────────────────────
        // note에 [profile_required] 태그가 있거나 쿠폰 대상이 demo 플랜인 경우
        $isProfileRequired = strpos($coupon['note'] ?? '', '[profile_required]') !== false;
        if ($isProfileRequired || $user['plan'] === 'pro' /*replaced demo*/) {
            // 필수 프로필 필드 체크
            $pStmt = $pdo->prepare("SELECT company, phone, representative, business_type FROM app_user WHERE id = ?");
            $pStmt->execute([$user['id']]);
            $profile = $pStmt->fetch(\PDO::FETCH_ASSOC) ?: [];

            $missing = [];
            if (empty(trim($profile['company'] ?? '')))        $missing[] = 'company';
            if (empty(trim($profile['phone'] ?? '')))          $missing[] = 'phone';
            if (empty(trim($profile['representative'] ?? ''))) $missing[] = 'representative';

            if (!empty($missing)) {
                return self::json($res, [
                    'ok'               => false,
                    'error'            => 'PROFILE_REQUIRED',
                    'message'          => '쿠폰 사용 전 비즈니스 정보를 등록해주세요.',
                    'missing_fields'   => $missing,
                    'coupon_code'      => $code,
                ], 422);
            }
        }

        // 이미 사용했는지 (coupon_redemptions)
        try {
            $dStmt = $pdo->prepare("SELECT id FROM coupon_redemptions WHERE coupon_id=? AND user_id=?");
            $dStmt->execute([$coupon['id'], $user['id']]);
            if ($dStmt->fetchColumn()) {
                return self::json($res, ['ok' => false, 'error' => '이미 이 쿠폰을 사용하셨습니다'], 409);
            }
        } catch (\Exception $e) {}

        // 플랜 적용 + 만료일 계산
        $days     = (int)$coupon['duration_days'];
        $driver   = $pdo->getAttribute(\PDO::ATTR_DRIVER_NAME);
        $expiresAt = $driver === 'mysql'
            ? "DATE_ADD(NOW(), INTERVAL $days DAY)"
            : "datetime('now', '+$days days')";

        $pdo->prepare("
            UPDATE app_user
               SET plan = ?,
                   subscription_expires_at = $expiresAt
             WHERE id = ?
        ")->execute([$coupon['plan'], $user['id']]);

        // use_count 증가 + 사용자 기록
        $pdo->prepare("UPDATE free_coupons SET use_count = use_count + 1, redeemed_at = " .
            ($driver === 'mysql' ? "NOW()" : "datetime('now')") .
            ", redeemed_by_user_id = ? WHERE id = ?"
        )->execute([$user['id'], $coupon['id']]);

        // 상세 redemption 기록
        try {
            $pdo->prepare("
                INSERT INTO coupon_redemptions (coupon_id, user_id, plan, expires_at, created_at)
                VALUES (?, ?, ?, " . ($driver === 'mysql' ? "DATE_ADD(NOW(), INTERVAL $days DAY)" : "datetime('now', '+$days days')") . ", " .
                ($driver === 'mysql' ? "NOW()" : "datetime('now')") . ")"
            )->execute([$coupon['id'], $user['id'], $coupon['plan']]);
        } catch (\Exception $e) {}

        return self::json($res, [
            'ok'           => true,
            'plan'         => $coupon['plan'],
            'duration_days'=> $days,
            'message'      => "🎉 쿠폰 적용 완료! {$coupon['plan']} 플랜 {$days}일 이용권이 활성화되었습니다.",
        ]);
    }

    /**
     * GET /v423/coupons/mine
     * 로그인 회원의 사용 가능 쿠폰 목록 (issued_to_user_id 기준)
     */
    public static function myCoupons(ServerRequestInterface $req, ResponseInterface $res): ResponseInterface
    {
        $h = $req->getHeaderLine('Authorization');
        preg_match('/^Bearer\s+(.+)$/i', $h, $m);
        $token = $m[1] ?? '';
        if (!$token) return self::json($res, ['ok' => false, 'error' => 'Login required'], 401);

        $pdo = Db::pdo();
        $sStmt = $pdo->prepare(
            "SELECT u.id FROM user_session s JOIN app_user u ON u.id=s.user_id
              WHERE s.token=? AND s.expires_at>? AND u.is_active=1"
        );
        $sStmt->execute([$token, self::now()]);
        $userId = (int)($sStmt->fetchColumn() ?: 0);
        if (!$userId) return self::json($res, ['ok' => false, 'error' => 'Session expired'], 401);

        try {
            $stmt = $pdo->prepare("
                SELECT code, plan, duration_days, max_uses, use_count, is_revoked, created_at
                  FROM free_coupons
                 WHERE (issued_to_user_id = ? OR issued_to_user_id IS NULL)
                   AND is_revoked = 0
                   AND use_count < max_uses
                 ORDER BY created_at DESC LIMIT 20
            ");
            $stmt->execute([$userId]);
            $coupons = $stmt->fetchAll(\PDO::FETCH_ASSOC);
        } catch (\Exception $e) {
            $coupons = [];
        }

        return self::json($res, ['ok' => true, 'coupons' => $coupons]);
    }

    /**
     * GET /v423/admin/demo-users
     * 무료(demo) 플랜 사용자 목록 조회 (쿠폰 발급 대상 선택용)
     */
    public static function listDemoUsers(ServerRequestInterface $req, ResponseInterface $res): ResponseInterface
    {
        if (!self::requireAdmin($req)) {
            return self::json($res, ['ok' => false, 'error' => 'Admin access required'], 403);
        }

        $params = $req->getQueryParams();
        $search = trim($params['search'] ?? '');
        $pdo    = Db::pdo();

        try {
            $where = "WHERE plan IN ('pro' /*replaced demo*/,'free')";
            $binds = [];
            if ($search) {
                $where .= " AND (email LIKE ? OR name LIKE ? OR company LIKE ?)";
                $like   = "%$search%";
                $binds  = [$like, $like, $like];
            }

            $stmt = $pdo->prepare(
                "SELECT id, email, name, company, phone, representative, plan, created_at
                   FROM app_user $where
                  ORDER BY created_at DESC LIMIT 200"
            );
            $stmt->execute($binds);
            $rows = $stmt->fetchAll(\PDO::FETCH_ASSOC);
        } catch (\Exception $e) {
            $rows = [];
        }

        return self::json($res, ['ok' => true, 'rows' => $rows, 'total' => count($rows)]);
    }

    /**
     * POST /v423/coupon/profile
     * 쿠폰 활성화 전 비즈니스 프로필 등록 (무료회원 전용)
     * Body: { company, phone, representative, business_type, website, ad_channels }
     */
    public static function registerCouponProfile(ServerRequestInterface $req, ResponseInterface $res): ResponseInterface
    {
        $h = $req->getHeaderLine('Authorization');
        preg_match('/^Bearer\s+(.+)$/i', $h, $m);
        $token = $m[1] ?? '';
        if (!$token) return self::json($res, ['ok' => false, 'error' => 'Login required'], 401);

        $pdo   = Db::pdo();
        $sStmt = $pdo->prepare(
            "SELECT u.id, u.email, u.plan FROM user_session s
               JOIN app_user u ON u.id=s.user_id
              WHERE s.token=? AND s.expires_at>? AND u.is_active=1"
        );
        $sStmt->execute([$token, self::now()]);
        $user = $sStmt->fetch(\PDO::FETCH_ASSOC);
        if (!$user) return self::json($res, ['ok' => false, 'error' => 'Session expired or invalid'], 401);

        $body = (array)($req->getParsedBody() ?? []);
        if (empty($body)) $body = json_decode((string)$req->getBody(), true) ?? [];

        $company      = trim($body['company']        ?? '');
        $phone        = trim($body['phone']           ?? '');
        $repr         = trim($body['representative'] ?? '');
        $bizType      = trim($body['business_type']  ?? '');
        $website      = trim($body['website']         ?? '');
        $adChannels   = is_array($body['ad_channels'] ?? null)
                          ? json_encode($body['ad_channels'])
                          : trim($body['ad_channels'] ?? '');
        $monthlySales = trim($body['monthly_sales']   ?? '');

        if (!$company || !$phone || !$repr) {
            return self::json($res, [
                'ok'    => false,
                'error' => '회사명, 전화번호, 대표자명은 필수입니다.',
            ], 422);
        }

        $driver = $pdo->getAttribute(\PDO::ATTR_DRIVER_NAME);
        $now    = $driver === 'mysql' ? 'NOW()' : "datetime('now')";

        // app_user 프로필 업데이트
        $pdo->prepare("
            UPDATE app_user
               SET company          = ?,
                   phone             = ?,
                   representative    = ?,
                   business_type     = ?,
                   website           = ?,
                   monthly_sales     = ?,
                   ad_channels       = ?,
                   updated_at        = $now
             WHERE id = ?
        ")->execute([$company, $phone, $repr, $bizType, $website, $monthlySales, $adChannels, $user['id']]);

        return self::json($res, [
            'ok'      => true,
            'message' => '비즈니스 정보가 저장되었습니다. 이제 쿠폰을 사용할 수 있습니다.',
            'user_id' => $user['id'],
        ]);
    }

    // ── 무료 쿠폰 DB Migration (migrate()에 포함) ────────────────────────────

    public static function migrateCoupons(ServerRequestInterface $req, ResponseInterface $res): ResponseInterface
    {
        $pdo    = Db::pdo();
        $driver = $pdo->getAttribute(\PDO::ATTR_DRIVER_NAME);

        if ($driver === 'mysql') {
            $pdo->exec("
                CREATE TABLE IF NOT EXISTS free_coupons (
                    id                    BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                    code                  VARCHAR(50)  NOT NULL UNIQUE,
                    plan                  VARCHAR(30)  NOT NULL DEFAULT 'pro',
                    duration_days         INT          NOT NULL DEFAULT 30,
                    max_uses              INT          NOT NULL DEFAULT 1,
                    use_count             INT          NOT NULL DEFAULT 0,
                    issued_to_user_id     BIGINT UNSIGNED NULL,
                    issued_to_email       VARCHAR(255) NULL,
                    issued_by             BIGINT UNSIGNED NOT NULL DEFAULT 0,
                    note                  TEXT         NULL,
                    is_revoked            TINYINT(1)   NOT NULL DEFAULT 0,
                    redeemed_at           DATETIME     NULL,
                    redeemed_by_user_id   BIGINT UNSIGNED NULL,
                    created_at            DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    INDEX idx_code(code),
                    INDEX idx_issued_to(issued_to_user_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            ");
            $pdo->exec("
                CREATE TABLE IF NOT EXISTS coupon_redemptions (
                    id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                    coupon_id  BIGINT UNSIGNED NOT NULL,
                    user_id    BIGINT UNSIGNED NOT NULL,
                    plan       VARCHAR(30) NOT NULL,
                    expires_at DATETIME NOT NULL,
                    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE KEY uq_coupon_user (coupon_id, user_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            ");
        } else {
            $pdo->exec("
                CREATE TABLE IF NOT EXISTS free_coupons (
                    id                    INTEGER PRIMARY KEY AUTOINCREMENT,
                    code                  TEXT    NOT NULL UNIQUE,
                    plan                  TEXT    NOT NULL DEFAULT 'pro',
                    duration_days         INTEGER NOT NULL DEFAULT 30,
                    max_uses              INTEGER NOT NULL DEFAULT 1,
                    use_count             INTEGER NOT NULL DEFAULT 0,
                    issued_to_user_id     INTEGER NULL,
                    issued_to_email       TEXT    NULL,
                    issued_by             INTEGER NOT NULL DEFAULT 0,
                    note                  TEXT    NULL,
                    is_revoked            INTEGER NOT NULL DEFAULT 0,
                    redeemed_at           TEXT    NULL,
                    redeemed_by_user_id   INTEGER NULL,
                    created_at            TEXT    NOT NULL DEFAULT (datetime('now'))
                );
            ");
            $pdo->exec("
                CREATE TABLE IF NOT EXISTS coupon_redemptions (
                    id         INTEGER PRIMARY KEY AUTOINCREMENT,
                    coupon_id  INTEGER NOT NULL,
                    user_id    INTEGER NOT NULL,
                    plan       TEXT NOT NULL,
                    expires_at TEXT NOT NULL,
                    created_at TEXT NOT NULL DEFAULT (datetime('now')),
                    UNIQUE(coupon_id, user_id)
                );
            ");
        }

        if (!self::requireAdmin($req)) {
            return self::json($res, ['ok' => false, 'error' => 'Admin access required'], 403);
        }

        return self::json($res, ['ok' => true, 'message' => 'Coupon tables created']);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ── 자동 쿠폰 발급 규칙 (coupon_rules) ──────────────────────────────────
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * POST /v423/admin/coupon-rules
     * 자동 발급 규칙 저장 (신규가입/유료전환/갱신)
     * Body: { rules: [{ trigger, is_active, plan, duration_days, note }] }
     */
    public static function saveCouponRules(ServerRequestInterface $req, ResponseInterface $res): ResponseInterface
    {
        $admin = self::requireAdmin($req);
        if (!$admin) return self::json($res, ['ok' => false, 'error' => 'Admin access required'], 403);

        $body = (array)($req->getParsedBody() ?? []);
        if (empty($body)) $body = json_decode((string)$req->getBody(), true) ?? [];

        $rules = $body['rules'] ?? [];
        if (!is_array($rules) || empty($rules)) {
            return self::json($res, ['ok' => false, 'error' => 'rules array required'], 422);
        }

        $validTriggers = ['signup', 'upgrade', 'renewal'];
        $validPlans    = ['starter', 'growth', 'pro', 'enterprise'];
        $pdo    = Db::pdo();
        $driver = $pdo->getAttribute(\PDO::ATTR_DRIVER_NAME);

        // 테이블 생성 (없으면)
        try {
            if ($driver === 'mysql') {
                $pdo->exec("
                    CREATE TABLE IF NOT EXISTS coupon_rules (
                        id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                        trigger_name VARCHAR(30) NOT NULL UNIQUE,
                        is_active    TINYINT(1) NOT NULL DEFAULT 0,
                        plan         VARCHAR(30) NOT NULL DEFAULT 'starter',
                        duration_days INT NOT NULL DEFAULT 7,
                        max_uses     INT NOT NULL DEFAULT 1,
                        note         TEXT NULL,
                        updated_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
                ");
            } else {
                $pdo->exec("
                    CREATE TABLE IF NOT EXISTS coupon_rules (
                        id           INTEGER PRIMARY KEY AUTOINCREMENT,
                        trigger_name TEXT NOT NULL UNIQUE,
                        is_active    INTEGER NOT NULL DEFAULT 0,
                        plan         TEXT NOT NULL DEFAULT 'starter',
                        duration_days INTEGER NOT NULL DEFAULT 7,
                        max_uses     INTEGER NOT NULL DEFAULT 1,
                        note         TEXT NULL,
                        updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
                    )
                ");
            }
        } catch (\Exception $e) {
            error_log('[coupon_rules] table create error: ' . $e->getMessage());
        }

        $saved = 0;
        foreach ($rules as $rule) {
            $trigger      = $rule['trigger'] ?? '';
            $isActive     = (int)(bool)($rule['is_active'] ?? false);
            $plan         = $rule['plan'] ?? 'starter';
            $durationDays = max(1, (int)($rule['duration_days'] ?? 7));
            $note         = trim($rule['note'] ?? '');

            if (!in_array($trigger, $validTriggers, true)) continue;
            if (!in_array($plan, $validPlans, true)) $plan = 'starter';

            try {
                if ($driver === 'mysql') {
                    $pdo->prepare("
                        INSERT INTO coupon_rules (trigger_name, is_active, plan, duration_days, note, updated_at)
                        VALUES (?,?,?,?,?,NOW())
                        ON DUPLICATE KEY UPDATE
                            is_active=VALUES(is_active), plan=VALUES(plan),
                            duration_days=VALUES(duration_days), note=VALUES(note), updated_at=NOW()
                    ")->execute([$trigger, $isActive, $plan, $durationDays, $note]);
                } else {
                    $pdo->prepare("
                        INSERT INTO coupon_rules (trigger_name, is_active, plan, duration_days, note, updated_at)
                        VALUES (?,?,?,?,?,datetime('now'))
                        ON CONFLICT(trigger_name) DO UPDATE SET
                            is_active=excluded.is_active, plan=excluded.plan,
                            duration_days=excluded.duration_days, note=excluded.note,
                            updated_at=datetime('now')
                    ")->execute([$trigger, $isActive, $plan, $durationDays, $note]);
                }
                $saved++;
            } catch (\Exception $e) {
                error_log('[coupon_rules] save error: ' . $e->getMessage());
            }
        }

        self::auditLog($admin, 'save_coupon_rules', "saved=$saved rules");
        return self::json($res, ['ok' => true, 'saved' => $saved, 'message' => "쿠폰 자동 발급 규칙 {$saved}개 저장 완료"]);
    }

    /**
     * GET /v423/admin/coupon-rules
     * 자동 발급 규칙 조회
     */
    public static function getCouponRules(ServerRequestInterface $req, ResponseInterface $res): ResponseInterface
    {
        if (!self::requireAdmin($req)) {
            return self::json($res, ['ok' => false, 'error' => 'Admin access required'], 403);
        }

        $pdo = Db::pdo();
        try {
            $rows = $pdo->query("SELECT * FROM coupon_rules ORDER BY id ASC")->fetchAll(\PDO::FETCH_ASSOC);
        } catch (\Exception $e) {
            $rows = [];
        }

        return self::json($res, ['ok' => true, 'rules' => $rows]);
    }

    /**
     * POST /v423/admin/coupons/batch-issue
     * 자동 규칙 기반 대상 회원 일괄 쿠폰 발급
     * Body: { rules: [{ trigger, plan, duration_days, note }], target_plan?: string }
     */
    public static function batchIssueCoupons(ServerRequestInterface $req, ResponseInterface $res): ResponseInterface
    {
        $admin = self::requireAdmin($req);
        if (!$admin) return self::json($res, ['ok' => false, 'error' => 'Admin access required'], 403);

        $body = (array)($req->getParsedBody() ?? []);
        if (empty($body)) $body = json_decode((string)$req->getBody(), true) ?? [];

        $rules = $body['rules'] ?? [];
        if (empty($rules)) {
            return self::json($res, ['ok' => false, 'error' => 'rules array required'], 422);
        }

        $pdo = Db::pdo();
        $issued = 0;
        $codes  = [];

        foreach ($rules as $rule) {
            $trigger      = $rule['trigger'] ?? '';
            $plan         = $rule['plan'] ?? 'starter';
            $durationDays = max(1, (int)($rule['duration_days'] ?? 7));
            $note         = trim($rule['note'] ?? '');

            // 트리거별 대상 회원 결정
            $targetUsers = [];
            try {
                if ($trigger === 'signup') {
                    // 최근 7일 신규 demo 가입자
                    $stmt = $pdo->prepare(
                        "SELECT id, email FROM app_user
                          WHERE plan IN ('pro' /*replaced demo*/,'free')
                            AND (created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
                              OR created_at >= datetime('now','-7 days'))
                          LIMIT 50"
                    );
                    $stmt->execute();
                    $targetUsers = $stmt->fetchAll(\PDO::FETCH_ASSOC);
                } elseif ($trigger === 'upgrade') {
                    // 최근 30일 유료 전환 사용자 (demo→유료)
                    $stmt = $pdo->prepare(
                        "SELECT id, email FROM app_user
                          WHERE plan IN ('starter','growth','pro','enterprise')
                            AND (created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                              OR created_at >= datetime('now','-30 days'))
                          LIMIT 50"
                    );
                    $stmt->execute();
                    $targetUsers = $stmt->fetchAll(\PDO::FETCH_ASSOC);
                } elseif ($trigger === 'renewal') {
                    // paddle_subscriptions에서 갱신 예정 (30일 이내)
                    try {
                        $stmt = $pdo->prepare(
                            "SELECT u.id, u.email
                               FROM paddle_subscriptions ps
                               JOIN app_user u ON u.email = ps.user_email
                              WHERE ps.status = 'active'
                              LIMIT 50"
                        );
                        $stmt->execute();
                        $targetUsers = $stmt->fetchAll(\PDO::FETCH_ASSOC);
                    } catch (\Exception $e) {
                        // paddle_subscriptions 없으면 pro 이상 유저
                        $stmt = $pdo->prepare(
                            "SELECT id, email FROM app_user WHERE plan IN ('pro','enterprise') LIMIT 50"
                        );
                        $stmt->execute();
                        $targetUsers = $stmt->fetchAll(\PDO::FETCH_ASSOC);
                    }
                }
            } catch (\Exception $e) {
                error_log('[batch_issue] target query error: ' . $e->getMessage());
                continue;
            }

            $driver = $pdo->getAttribute(\PDO::ATTR_DRIVER_NAME);
            foreach ($targetUsers as $user) {
                $code = 'GENIE-FREE-' . strtoupper(bin2hex(random_bytes(4)));
                try {
                    if ($driver === 'mysql') {
                        $pdo->prepare("
                            INSERT INTO free_coupons
                                (code, plan, duration_days, max_uses, issued_to_user_id, issued_to_email, note, issued_by, created_at)
                            VALUES (?,?,?,1,?,?,?,?,NOW())
                        ")->execute([$code, $plan, $durationDays, $user['id'], $user['email'],
                            "[auto:{$trigger}] " . $note, $admin['id']]);
                    } else {
                        $pdo->prepare("
                            INSERT INTO free_coupons
                                (code, plan, duration_days, max_uses, issued_to_user_id, issued_to_email, note, issued_by, created_at)
                            VALUES (?,?,?,1,?,?,?,?,datetime('now'))
                        ")->execute([$code, $plan, $durationDays, $user['id'], $user['email'],
                            "[auto:{$trigger}] " . $note, $admin['id']]);
                    }
                    $issued++;
                    $codes[] = $code;
                } catch (\Exception $e) {
                    error_log('[batch_issue] insert error: ' . $e->getMessage());
                }
            }
        }

        self::auditLog($admin, 'batch_issue_coupons', "issued={$issued}");
        return self::json($res, [
            'ok'           => true,
            'issued_count' => $issued,
            'codes'        => array_slice($codes, 0, 10),
            'message'      => "{$issued}건 일괄 발급 완료",
        ]);
    }
    // == 쿠폰 직접 등록 POST /v423/admin/coupons/create ==
    public static function createCoupon(\Psr\Http\Message\ServerRequestInterface $req, \Psr\Http\Message\ResponseInterface $res): \Psr\Http\Message\ResponseInterface
    {
        $admin = self::requireAdmin($req);
        if (!$admin) return self::json($res, ['ok' => false, 'error' => 'Admin access required'], 403);
        $body = (array)($req->getParsedBody() ?? []);
        if (empty($body)) $body = json_decode((string)$req->getBody(), true) ?? [];
        $targetEmail  = trim($body['target_email']  ?? '');
        $plan         = $body['plan']                ?? 'starter';
        $months       = isset($body['months'])  ? (int)$body['months']  : null;
        $years        = isset($body['years'])   ? (int)$body['years']   : null;
        $durationDays = isset($body['duration_days']) && (int)$body['duration_days'] > 0 ? (int)$body['duration_days'] : null;
        $customCode   = trim($body['code']           ?? '');
        $note         = trim($body['note']           ?? '');
        $notifyEmail  = (bool)($body['notify_email']  ?? true);
        $notifySms    = (bool)($body['notify_sms']    ?? false);
        $notifyKakao  = (bool)($body['notify_kakao']  ?? false);
        if (!in_array($plan, ['starter','growth','pro','enterprise'], true)) $plan = 'starter';
        if ($durationDays === null) $durationDays = \Genie\NotifyEngine::periodToDays($months, $years);
        $code = $customCode ?: ('GENIE-' . strtoupper(bin2hex(random_bytes(5))));
        $pdo = Db::pdo(); $driver = $pdo->getAttribute(\PDO::ATTR_DRIVER_NAME);
        try { if ($driver === 'mysql') $pdo->exec("CREATE TABLE IF NOT EXISTS free_coupons (id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, code VARCHAR(50) NOT NULL UNIQUE, plan VARCHAR(30) NOT NULL DEFAULT 'starter', duration_days INT NOT NULL DEFAULT 30, max_uses INT NOT NULL DEFAULT 1, use_count INT NOT NULL DEFAULT 0, issued_to_user_id BIGINT UNSIGNED NULL, issued_to_email VARCHAR(255) NULL, issued_by BIGINT UNSIGNED NOT NULL DEFAULT 0, note TEXT NULL, is_revoked TINYINT(1) NOT NULL DEFAULT 0, redeemed_at DATETIME NULL, redeemed_by_user_id BIGINT UNSIGNED NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"); else $pdo->exec("CREATE TABLE IF NOT EXISTS free_coupons (id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT NOT NULL UNIQUE, plan TEXT NOT NULL DEFAULT 'starter', duration_days INTEGER NOT NULL DEFAULT 30, max_uses INTEGER NOT NULL DEFAULT 1, use_count INTEGER NOT NULL DEFAULT 0, issued_to_user_id INTEGER NULL, issued_to_email TEXT NULL, issued_by INTEGER NOT NULL DEFAULT 0, note TEXT NULL, is_revoked INTEGER NOT NULL DEFAULT 0, redeemed_at TEXT NULL, redeemed_by_user_id INTEGER NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')))"); } catch (\Throwable $e) {}
        $targetUser = null;
        if ($targetEmail) { try { $su = $pdo->prepare("SELECT id,email,name,phone FROM app_user WHERE email=? LIMIT 1"); $su->execute([$targetEmail]); $targetUser = $su->fetch(\PDO::FETCH_ASSOC) ?: null; } catch (\Throwable $e) {} }
        $targetUserId = $targetUser ? (int)$targetUser['id'] : null;
        $expiresAt = date('Y-m-d H:i:s', strtotime("+{$durationDays} days"));
        try {
            if ($driver === 'mysql') $pdo->prepare("INSERT INTO free_coupons (code,plan,duration_days,max_uses,use_count,issued_to_user_id,issued_to_email,issued_by,note,created_at) VALUES (?,?,?,1,0,?,?,?,?,NOW())")->execute([$code,$plan,$durationDays,$targetUserId,$targetEmail?:null,(int)$admin['id'],$note]);
            else $pdo->prepare("INSERT INTO free_coupons (code,plan,duration_days,max_uses,use_count,issued_to_user_id,issued_to_email,issued_by,note) VALUES (?,?,?,1,0,?,?,?,?)")->execute([$code,$plan,$durationDays,$targetUserId,$targetEmail?:null,(int)$admin['id'],$note]);
        } catch (\Throwable $e) { return self::json($res, ['ok'=>false,'error'=>'쿠폰 생성 실패: '.$e->getMessage()], 500); }
        $couponData = ['code'=>$code,'plan'=>$plan,'duration_days'=>$durationDays,'expires_at'=>$expiresAt];
        $notifyResults = [];
        if ($targetUser) { try { $notifyResults = \Genie\NotifyEngine::sendCouponNotification($couponData,$targetUser,['email'=>$notifyEmail,'sms'=>$notifySms,'kakao'=>$notifyKakao]); } catch (\Throwable $e) {} }
        self::auditLog($admin,'create_coupon',"code=$code plan=$plan days=$durationDays to=$targetEmail");
        return self::json($res, ['ok'=>true,'code'=>$code,'plan'=>$plan,'duration_days'=>$durationDays,'expires_at'=>$expiresAt,'period'=>\Genie\NotifyEngine::daysToMonthLabel($durationDays),'notify'=>$notifyResults,'message'=>"쿠폰 $code 발급 완료 (".\Genie\NotifyEngine::daysToMonthLabel($durationDays).")"], 201);
    }



}
