<?php
declare(strict_types=1);

namespace Genie\Handlers;

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;
use Genie\Db;
use Genie\Handlers\UserAuth;

/**
 * AdminPlans — 169차 신규.
 *
 * admin 의 플랜별 구독요금 설정 endpoint.
 * 168차 USD/Paddle 단일 정책 정합. Paddle MoR — 본 endpoint 는 plan 정의 (price 표시, features, limits,
 * Paddle priceId 매핑) 만 관리. 실 결제는 Paddle dashboard 의 가격이 source of truth.
 *
 * - GET  /v424/admin/plans          : 전체 plan list
 * - PUT  /v424/admin/plans/{id}     : plan 정의 UPSERT
 * - DELETE /v424/admin/plans/{id}   : plan 비활성화 (soft, is_active=0)
 *
 * RBAC: analyst+ (write 는 admin only — index.php middleware 정합).
 */
final class AdminPlans
{
    public static function list(Request $req, Response $res): Response
    {
        $gate = UserAuth::requirePlan($req, $res, 'admin');
        if ($gate !== null) return $gate;
        $pdo  = Db::pdo();
        $stmt = $pdo->query(
            'SELECT plan_id, name, description, price_usd, price_annual_usd,
                    price_id_monthly, price_id_annual, features_json, limits_json,
                    display_order, is_active, is_custom_quote, updated_by, updated_at
             FROM plan_config WHERE is_active = 1
             ORDER BY display_order, plan_id'
        );
        $rows = $stmt->fetchAll(\PDO::FETCH_ASSOC);
        $plans = array_map([self::class, 'hydrate'], $rows);
        return self::json($res, ['ok' => true, 'plans' => $plans]);
    }

    public static function upsert(Request $req, Response $res, array $args): Response
    {
        $gate = UserAuth::requirePlan($req, $res, 'admin');
        if ($gate !== null) return $gate;
        $planId = (string)($args['id'] ?? '');
        if (!preg_match('/^[a-z0-9_-]{1,64}$/i', $planId)) {
            return self::json($res, ['error' => 'invalid_plan_id'], 422);
        }
        $body = (array)$req->getParsedBody();
        $name = trim((string)($body['name'] ?? ''));
        if ($name === '' || strlen($name) > 128) {
            return self::json($res, ['error' => 'invalid_name'], 422);
        }
        $features = isset($body['features']) && is_array($body['features']) ? $body['features'] : [];
        $limits   = isset($body['limits'])   && is_array($body['limits'])   ? $body['limits']   : [];

        $actor = (string)($req->getAttribute('auth_key') ?? 'admin');

        $pdo = Db::pdo();
        $pdo->prepare(
            'INSERT INTO plan_config
               (plan_id, name, description, price_usd, price_annual_usd,
                price_id_monthly, price_id_annual, features_json, limits_json,
                display_order, is_active, is_custom_quote, updated_by)
             VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
             ON DUPLICATE KEY UPDATE
               name=VALUES(name), description=VALUES(description),
               price_usd=VALUES(price_usd), price_annual_usd=VALUES(price_annual_usd),
               price_id_monthly=VALUES(price_id_monthly), price_id_annual=VALUES(price_id_annual),
               features_json=VALUES(features_json), limits_json=VALUES(limits_json),
               display_order=VALUES(display_order), is_active=VALUES(is_active),
               is_custom_quote=VALUES(is_custom_quote), updated_by=VALUES(updated_by)'
        )->execute([
            $planId,
            $name,
            $body['description'] ?? null,
            self::numOrNull($body['price_usd'] ?? null),
            self::numOrNull($body['price_annual_usd'] ?? null),
            $body['price_id_monthly'] ?? null,
            $body['price_id_annual']  ?? null,
            json_encode($features, JSON_UNESCAPED_UNICODE),
            json_encode($limits,   JSON_UNESCAPED_UNICODE),
            (int)($body['display_order']   ?? 0),
            (int)!empty($body['is_active'] ?? true),
            (int)!empty($body['is_custom_quote'] ?? false),
            substr($actor, 0, 64),
        ]);
        return self::json($res, ['ok' => true, 'plan_id' => $planId]);
    }

    public static function delete(Request $req, Response $res, array $args): Response
    {
        $gate = UserAuth::requirePlan($req, $res, 'admin');
        if ($gate !== null) return $gate;
        $planId = (string)($args['id'] ?? '');
        if (!preg_match('/^[a-z0-9_-]{1,64}$/i', $planId)) {
            return self::json($res, ['error' => 'invalid_plan_id'], 422);
        }
        $pdo = Db::pdo();
        $pdo->prepare('UPDATE plan_config SET is_active = 0 WHERE plan_id = ?')->execute([$planId]);
        return self::json($res, ['ok' => true]);
    }

    /**
     * GET /v424/admin/db/stats — 169차 P5 mock 제거 (DbAdmin.jsx 의 2.4GB / 48 / 99.97% 가상 제거)
     * MySQL information_schema + SHOW STATUS 실 데이터.
     * SQLite fallback: PRAGMA / count.
     */
    public static function dbStats(Request $req, Response $res): Response
    {
        $gate = UserAuth::requirePlan($req, $res, 'admin');
        if ($gate !== null) return $gate;
        $pdo = Db::pdo();
        $driver = $pdo->getAttribute(\PDO::ATTR_DRIVER_NAME);
        $stats = [
            'driver'      => $driver,
            'database'    => null,
            'version'     => null,
            'tables'      => 0,
            'size_mb'     => 0,
            'uptime_sec'  => null,
            'connections' => null,
            'data_source' => 'live',
            'mock'        => false,
        ];
        try {
            if ($driver === 'mysql') {
                $stats['version']    = (string)$pdo->query('SELECT VERSION()')->fetchColumn();
                $stats['database']   = (string)$pdo->query('SELECT DATABASE()')->fetchColumn();
                $stats['tables']     = (int)$pdo->query(
                    "SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE()"
                )->fetchColumn();
                $stats['size_mb']    = (float)$pdo->query(
                    "SELECT ROUND(SUM(DATA_LENGTH + INDEX_LENGTH) / 1024 / 1024, 2)
                     FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE()"
                )->fetchColumn();
                $stats['uptime_sec'] = (int)$pdo->query("SHOW STATUS LIKE 'Uptime'")->fetch(\PDO::FETCH_ASSOC)['Value'] ?? null;
                $conn = $pdo->query("SHOW STATUS LIKE 'Threads_connected'")->fetch(\PDO::FETCH_ASSOC);
                $stats['connections'] = isset($conn['Value']) ? (int)$conn['Value'] : null;
            } else {
                $stats['version']  = (string)$pdo->query("SELECT sqlite_version()")->fetchColumn();
                $stats['database'] = 'sqlite';
                $stats['tables']   = (int)$pdo->query("SELECT COUNT(*) FROM sqlite_master WHERE type='table'")->fetchColumn();
            }
        } catch (\Throwable $e) {
            $stats['data_source'] = 'query_failed';
            $stats['error']       = $e->getMessage();
        }
        return self::json($res, ['ok' => true, 'stats' => $stats]);
    }

    /**
     * GET /v424/admin/paddle/stats — 169차 사용자 발견 issue fix
     *
     * PgConfig.jsx 의 가상데이터 (142건/8.4M/토스페이먼츠) 제거 → paddle_subscriptions 실 통계.
     * 168차 USD/Paddle 단일 정책 정합. 모든 KPI 실 DB read, mock fallback 절대 금지.
     *
     * 응답:
     *   - provider: "Paddle (MoR)"
     *   - currency: "USD"
     *   - env: sandbox/production
     *   - subscriptions: { active, total, cancelled }
     *   - month: { tx_count, revenue_usd } — paddle_subscriptions 의 current_period_end 가 이번 달
     *   - integration_status: env 기반 (token 존재 여부)
     *
     * 테이블 미존재 시 zero 응답 (mock 금지). data_source 명시.
     */
    public static function paddleStats(Request $req, Response $res): Response
    {
        $gate = UserAuth::requirePlan($req, $res, 'admin');
        if ($gate !== null) return $gate;
        $pdo = Db::pdo();
        $stats = [
            'provider'           => 'Paddle (MoR)',
            'currency'           => 'USD',
            'env'                => getenv('PADDLE_ENV') ?: 'sandbox',
            'integration_status' => getenv('PADDLE_CLIENT_TOKEN') ? 'configured' : 'not_configured',
            'subscriptions'      => ['active' => 0, 'total' => 0, 'cancelled' => 0],
            'month'              => ['tx_count' => 0, 'revenue_usd' => 0.0],
            'data_source'        => 'paddle_subscriptions',
            'mock'               => false,
        ];

        // 테이블 존재 여부 확인 (운영 backend deploy 안 됐을 수 있음 — graceful)
        try {
            $check = $pdo->query("SHOW TABLES LIKE 'paddle_subscriptions'")->fetch();
            if (!$check) {
                $stats['data_source'] = 'table_missing';
                return self::json($res, ['ok' => true, 'stats' => $stats]);
            }
        } catch (\Throwable $e) {
            $stats['data_source'] = 'check_failed';
            $stats['error'] = $e->getMessage();
            return self::json($res, ['ok' => true, 'stats' => $stats]);
        }

        try {
            $row = $pdo->query(
                "SELECT
                    COUNT(*)                                          AS total,
                    SUM(CASE WHEN status='active'    THEN 1 ELSE 0 END) AS active,
                    SUM(CASE WHEN status='canceled'  THEN 1 ELSE 0 END)
                  + SUM(CASE WHEN status='cancelled' THEN 1 ELSE 0 END) AS cancelled
                 FROM paddle_subscriptions"
            )->fetch(\PDO::FETCH_ASSOC);
            $stats['subscriptions']['total']     = (int)($row['total'] ?? 0);
            $stats['subscriptions']['active']    = (int)($row['active'] ?? 0);
            $stats['subscriptions']['cancelled'] = (int)($row['cancelled'] ?? 0);

            // 이번 달 (YYYY-MM) 시작 ISO 8601 prefix
            $monthPrefix = date('Y-m');
            $row = $pdo->prepare(
                "SELECT COUNT(*) AS tx_count, COALESCE(SUM(unit_price),0) AS revenue_usd
                 FROM paddle_subscriptions
                 WHERE status = 'active' AND SUBSTRING(current_period_end, 1, 7) = ?"
            );
            $row->execute([$monthPrefix]);
            $r = $row->fetch(\PDO::FETCH_ASSOC);
            $stats['month']['tx_count']    = (int)($r['tx_count'] ?? 0);
            $stats['month']['revenue_usd'] = (float)($r['revenue_usd'] ?? 0);
        } catch (\Throwable $e) {
            $stats['data_source'] = 'query_failed';
            $stats['error']       = $e->getMessage();
        }

        return self::json($res, ['ok' => true, 'stats' => $stats]);
    }

    /**
     * GET /auth/pricing/public-plans  (public, auth 불필요)
     *
     * AuthContext.loadMenuAccess 가 호출 (frontend 가 user.plan 기반 sidebar 필터 사용).
     * 응답 형식 정합:
     *   { ok: true, plans: [
     *       { id, name, price_usd, price_annual_usd, price_id_monthly, price_id_annual,
     *         features, limits, is_custom_quote, menuAccess: [menu_key, ...] }, ...
     *   ] }
     *
     * menuAccess: plan_menu_access 의 enabled=1 row 의 menu_key 목록.
     * 초기 DB empty 시 menuAccess: [] → AuthContext 가 graceful 허용 (기존 동작 유지).
     */
    public static function publicPlans(Request $req, Response $res): Response
    {
        $pdo = Db::pdo();
        $stmt = $pdo->query(
            'SELECT plan_id, name, description, price_usd, price_annual_usd,
                    price_id_monthly, price_id_annual, features_json, limits_json,
                    display_order, is_custom_quote
             FROM plan_config WHERE is_active = 1
             ORDER BY display_order, plan_id'
        );
        $rows = $stmt->fetchAll(\PDO::FETCH_ASSOC);

        $accessByPlan = [];
        $accStmt = $pdo->query('SELECT plan_id, menu_key FROM plan_menu_access WHERE enabled = 1');
        foreach ($accStmt->fetchAll(\PDO::FETCH_ASSOC) as $r) {
            $accessByPlan[$r['plan_id']][] = $r['menu_key'];
        }

        $plans = array_map(static function ($row) use ($accessByPlan) {
            $features = json_decode((string)($row['features_json'] ?? '[]'), true) ?: [];
            $limits   = json_decode((string)($row['limits_json']   ?? '{}'), true) ?: [];
            return [
                'id'               => $row['plan_id'],
                'name'             => $row['name'],
                'description'      => $row['description'],
                'price_usd'        => $row['price_usd'] !== null ? (float)$row['price_usd'] : null,
                'price_annual_usd' => $row['price_annual_usd'] !== null ? (float)$row['price_annual_usd'] : null,
                'price_id_monthly' => $row['price_id_monthly'] ?? '',
                'price_id_annual'  => $row['price_id_annual']  ?? '',
                'features'         => $features,
                'limits'           => $limits,
                'is_custom_quote'  => (bool)$row['is_custom_quote'],
                'menuAccess'       => $accessByPlan[$row['plan_id']] ?? [],
            ];
        }, $rows);

        // 초기 DB empty fallback — Paddle.php hardcoded 3 plan 정합 (메뉴 권한은 빈 배열 = graceful 허용)
        if (!$plans) {
            $plans = [
                ['id'=>'starter','name'=>'Starter','price_usd'=>49,'price_annual_usd'=>39,'features'=>[],'limits'=>[],'menuAccess'=>[]],
                ['id'=>'pro','name'=>'Pro','price_usd'=>149,'price_annual_usd'=>119,'features'=>[],'limits'=>[],'menuAccess'=>[]],
                ['id'=>'enterprise','name'=>'Enterprise','price_usd'=>null,'price_annual_usd'=>null,'is_custom_quote'=>true,'features'=>[],'limits'=>[],'menuAccess'=>[]],
            ];
        }

        return self::json($res, ['ok' => true, 'plans' => $plans]);
    }

    /**
     * GET /v424/admin/plans/menu-access
     * 전체 매트릭스: { plans: [...], menus: [...], access: { plan_id: { menu_key: 1 } } }
     */
    public static function menuAccessAll(Request $req, Response $res): Response
    {
        $gate = UserAuth::requirePlan($req, $res, 'admin');
        if ($gate !== null) return $gate;
        $pdo = Db::pdo();
        $plans = $pdo->query(
            'SELECT plan_id, name, display_order FROM plan_config WHERE is_active=1 ORDER BY display_order, plan_id'
        )->fetchAll(\PDO::FETCH_ASSOC);
        $menus = $pdo->query(
            'SELECT id, label_key, route, menu_key, display_order
             FROM menu_tree ORDER BY display_order, id'
        )->fetchAll(\PDO::FETCH_ASSOC);
        $rows = $pdo->query(
            'SELECT plan_id, menu_key, enabled FROM plan_menu_access'
        )->fetchAll(\PDO::FETCH_ASSOC);
        $access = [];
        foreach ($rows as $r) {
            $access[$r['plan_id']][$r['menu_key']] = (int)$r['enabled'];
        }
        return self::json($res, [
            'ok'     => true,
            'plans'  => $plans,
            'menus'  => $menus,
            'access' => $access,
        ]);
    }

    /**
     * PUT /v424/admin/plans/{id}/menu-access
     * Body: { menus: { menu_key: 1/0, ... } }
     * 본 plan 의 menu access bulk UPSERT (DELETE 후 INSERT) — atomic.
     */
    public static function menuAccessUpsert(Request $req, Response $res, array $args): Response
    {
        $gate = UserAuth::requirePlan($req, $res, 'admin');
        if ($gate !== null) return $gate;
        $planId = (string)($args['id'] ?? '');
        if (!preg_match('/^[a-z0-9_-]{1,64}$/i', $planId)) {
            return self::json($res, ['error' => 'invalid_plan_id'], 422);
        }
        $body  = (array)$req->getParsedBody();
        $menus = isset($body['menus']) && is_array($body['menus']) ? $body['menus'] : [];
        $actor = substr((string)($req->getAttribute('auth_key') ?? 'admin'), 0, 64);

        $pdo = Db::pdo();
        $pdo->beginTransaction();
        try {
            $pdo->prepare('DELETE FROM plan_menu_access WHERE plan_id = ?')->execute([$planId]);
            if ($menus) {
                $ins = $pdo->prepare(
                    'INSERT INTO plan_menu_access (plan_id, menu_key, enabled, updated_by)
                     VALUES (?,?,?,?)'
                );
                foreach ($menus as $menuKey => $enabled) {
                    if (!is_string($menuKey) || $menuKey === '') continue;
                    $ins->execute([$planId, (string)$menuKey, (int)!empty($enabled), $actor]);
                }
            }
            $pdo->commit();
        } catch (\Throwable $e) {
            $pdo->rollBack();
            return self::json($res, ['error' => 'save_failed', 'detail' => $e->getMessage()], 500);
        }
        return self::json($res, ['ok' => true, 'plan_id' => $planId, 'count' => count($menus)]);
    }

    private static function hydrate(array $row): array
    {
        $row['features'] = json_decode((string)($row['features_json'] ?? '[]'), true) ?: [];
        $row['limits']   = json_decode((string)($row['limits_json']   ?? '{}'), true) ?: [];
        unset($row['features_json'], $row['limits_json']);
        return $row;
    }

    private static function numOrNull($v)
    {
        if ($v === null || $v === '') return null;
        return is_numeric($v) ? (float)$v : null;
    }

    private static function json(Response $res, array $body, int $code = 200): Response
    {
        $res->getBody()->write(json_encode($body, JSON_UNESCAPED_UNICODE));
        return $res->withStatus($code)->withHeader('Content-Type', 'application/json; charset=utf-8');
    }
}
