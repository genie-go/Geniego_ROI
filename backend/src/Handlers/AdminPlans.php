<?php
declare(strict_types=1);

namespace Genie\Handlers;

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;
use Genie\Db;

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
        $planId = (string)($args['id'] ?? '');
        if (!preg_match('/^[a-z0-9_-]{1,64}$/i', $planId)) {
            return self::json($res, ['error' => 'invalid_plan_id'], 422);
        }
        $pdo = Db::pdo();
        $pdo->prepare('UPDATE plan_config SET is_active = 0 WHERE plan_id = ?')->execute([$planId]);
        return self::json($res, ['ok' => true]);
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
