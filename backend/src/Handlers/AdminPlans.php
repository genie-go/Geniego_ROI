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
                    seat_tiers_json,
                    display_order, is_active, is_custom_quote,
                    IFNULL(is_recommended, 0) AS is_recommended,
                    IFNULL(discount_pct, 20) AS discount_pct,
                    updated_by, updated_at
             FROM plan_config WHERE is_active = 1
             ORDER BY display_order, plan_id'
        );
        $rows = $stmt->fetchAll(\PDO::FETCH_ASSOC);
        $plans = array_map([self::class, 'hydrate'], $rows);
        return self::json($res, ['ok' => true, 'plans' => $plans]);
    }

    /**
     * [현 차수] 글로벌 상품설정(요금·메뉴접근) 운영↔데모 DB 동기화.
     *   plan_config/plan_period_pricing/plan_menu_access 는 테넌트 무관 product config 이므로
     *   admin 이 한쪽(운영)에서 저장하면 sibling DB(데모)에도 동일 반영해야 한다(데모가 admin 설정 미반영 문제 해소).
     *   같은 MySQL 서버의 형제 스키마로 풀-테이블 미러(소량이라 저렴, 멱등). MySQL 전용·sibling 부재 시 무시.
     */
    private static function mirrorPlanTablesToSibling(\PDO $pdo): void
    {
        try {
            if ($pdo->getAttribute(\PDO::ATTR_DRIVER_NAME) !== 'mysql') return;
            $cur = (string)$pdo->query('SELECT DATABASE()')->fetchColumn();
            $sib = $cur === 'geniego_roi_demo' ? 'geniego_roi' : ($cur === 'geniego_roi' ? 'geniego_roi_demo' : '');
            if ($sib === '') return;
            $chk = $pdo->prepare("SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME=?");
            $chk->execute([$sib]);
            if (!$chk->fetchColumn()) return;
            $pdo->exec("SET FOREIGN_KEY_CHECKS=0");
            foreach (['plan_config', 'plan_period_pricing', 'plan_menu_access'] as $t) {
                try {
                    $pdo->exec("DELETE FROM `{$sib}`.`{$t}`");
                    $pdo->exec("INSERT INTO `{$sib}`.`{$t}` SELECT * FROM `{$cur}`.`{$t}`");
                } catch (\Throwable $e) { error_log("[AdminPlans.mirror:{$t}] " . $e->getMessage()); }
            }
            $pdo->exec("SET FOREIGN_KEY_CHECKS=1");
        } catch (\Throwable $e) { error_log('[AdminPlans.mirror] ' . $e->getMessage()); }
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

        // [254차] 이미지 호스팅(GB)은 admin 자유 수정값을 그대로 저장(상품수 기반 권장값 자동채움은 프론트가 담당).
        $actor = (string)($req->getAttribute('auth_key') ?? 'admin');

        $pdo = Db::pdo();
        // [171차] is_recommended + discount_pct 컬럼 추가 — 추천 플랜 + 자동 산출 비율
        // [225차 P1-12] ON DUPLICATE KEY 는 MySQL 전용 → SQLite 폴백서 플랜 저장 500. 드라이버 분기(SQLite=ON CONFLICT).
        $isMy = $pdo->getAttribute(\PDO::ATTR_DRIVER_NAME) === 'mysql';
        $onConflict = $isMy
            ? 'ON DUPLICATE KEY UPDATE
               name=VALUES(name), description=VALUES(description),
               price_usd=VALUES(price_usd), price_annual_usd=VALUES(price_annual_usd),
               price_id_monthly=VALUES(price_id_monthly), price_id_annual=VALUES(price_id_annual),
               features_json=VALUES(features_json), limits_json=VALUES(limits_json),
               display_order=VALUES(display_order), is_active=VALUES(is_active),
               is_custom_quote=VALUES(is_custom_quote),
               is_recommended=VALUES(is_recommended), discount_pct=VALUES(discount_pct),
               updated_by=VALUES(updated_by)'
            : 'ON CONFLICT(plan_id) DO UPDATE SET
               name=excluded.name, description=excluded.description,
               price_usd=excluded.price_usd, price_annual_usd=excluded.price_annual_usd,
               price_id_monthly=excluded.price_id_monthly, price_id_annual=excluded.price_id_annual,
               features_json=excluded.features_json, limits_json=excluded.limits_json,
               display_order=excluded.display_order, is_active=excluded.is_active,
               is_custom_quote=excluded.is_custom_quote,
               is_recommended=excluded.is_recommended, discount_pct=excluded.discount_pct,
               updated_by=excluded.updated_by';
        $pdo->prepare(
            'INSERT INTO plan_config
               (plan_id, name, description, price_usd, price_annual_usd,
                price_id_monthly, price_id_annual, features_json, limits_json,
                display_order, is_active, is_custom_quote,
                is_recommended, discount_pct, updated_by)
             VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
             ' . $onConflict
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
            (int)!empty($body['is_recommended'] ?? false),
            (int)($body['discount_pct'] ?? 20),
            substr($actor, 0, 64),
        ]);
        self::mirrorPlanTablesToSibling($pdo); // 데모 DB 동기화
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
        self::mirrorPlanTablesToSibling($pdo); // 데모 DB 동기화
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
                    display_order, is_custom_quote, seat_tiers_json
             FROM plan_config WHERE is_active = 1
             ORDER BY display_order, plan_id'
        );
        $rows = $stmt->fetchAll(\PDO::FETCH_ASSOC);

        $accessByPlan = [];
        $accStmt = $pdo->query('SELECT plan_id, menu_key FROM plan_menu_access WHERE enabled = 1');
        foreach ($accStmt->fetchAll(\PDO::FETCH_ASSOC) as $r) {
            $accessByPlan[$r['plan_id']][] = $r['menu_key'];
        }

        // 172차 P0-B — periods (회원가입 cycle 선택용) / 186차 — seat(계정수) 차원 동봉
        // graceful: 테이블/컬럼 미존재 시 빈 배열 (옛 backend 호환)
        $periodsByPlan = [];      // legacy: base seat('1') periods (하위호환)
        $seatPricingByPlan = [];  // 186차: [plan][seat_tier][] = period cfg
        try {
            $check = $pdo->query("SHOW TABLES LIKE 'plan_period_pricing'")->fetch();
            if ($check) {
                $hasSeat = (bool)$pdo->query("SHOW COLUMNS FROM plan_period_pricing LIKE 'seat_tier'")->fetch();
                $cols = $hasSeat ? 'plan_id, seat_tier, period_months, price_usd, discount_pct, paddle_price_id, is_active'
                                 : 'plan_id, period_months, price_usd, discount_pct, paddle_price_id, is_active';
                $ppStmt = $pdo->query(
                    "SELECT $cols FROM plan_period_pricing WHERE is_active = 1 ORDER BY plan_id, period_months"
                );
                foreach ($ppStmt->fetchAll(\PDO::FETCH_ASSOC) as $r) {
                    $months = (int)$r['period_months'];
                    $price  = $r['price_usd'] !== null ? (float)$r['price_usd'] : null;
                    $seat   = $hasSeat ? (string)($r['seat_tier'] ?? '1') : '1';
                    $entry = [
                        'period_months'   => $months,
                        'price_usd'       => $price,                                        // 월 환산
                        'discount_pct'    => (int)$r['discount_pct'],
                        'total_charge'    => $price !== null ? round($price * $months, 2) : null,  // 총 결제액
                        'paddle_price_id' => (string)($r['paddle_price_id'] ?? ''),
                    ];
                    $seatPricingByPlan[$r['plan_id']][$seat][] = $entry;
                    if ($seat === '1') $periodsByPlan[$r['plan_id']][] = $entry;
                }
            }
        } catch (\Throwable $e) { /* graceful */ }

        $plans = array_map(static function ($row) use ($accessByPlan, $periodsByPlan, $seatPricingByPlan) {
            $features = json_decode((string)($row['features_json'] ?? '[]'), true) ?: [];
            $limits   = json_decode((string)($row['limits_json']   ?? '{}'), true) ?: [];
            $seatTiers = json_decode((string)($row['seat_tiers_json'] ?? ''), true);
            if (!is_array($seatTiers) || !$seatTiers) $seatTiers = self::defaultSeatTiers();
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
                'periods'          => $periodsByPlan[$row['plan_id']] ?? [],  // 172차 P0-B (base seat '1')
                'seatTiers'        => $seatTiers,                              // 186차 계정수 티어
                'seatPricing'      => $seatPricingByPlan[$row['plan_id']] ?? [], // 186차 계정수별 가격
            ];
        }, $rows);

        // 초기 DB empty fallback — ★246차 5티어(Free 진입 + Starter/Growth/Pro/Enterprise) 1계정 추천가 정합.
        //   실제 가격·메뉴접근·설명은 admin 이 plan_config 에 등록하면 즉시 이 응답으로 전 페이지 자동 반영(데모/운영 각 DB).
        if (!$plans) {
            $plans = [
                ['id'=>'free','name'=>'Free','price_usd'=>0,'price_annual_usd'=>0,'description'=>'무료 진입 · 판매 채널 3개','features'=>[],'limits'=>['channels'=>3],'menuAccess'=>[]],
                ['id'=>'starter','name'=>'Starter','price_usd'=>49,'price_annual_usd'=>39,'description'=>'마케팅 입문 · 1계정 기준','features'=>[],'limits'=>[],'menuAccess'=>[]],
                ['id'=>'growth','name'=>'Growth','price_usd'=>149,'price_annual_usd'=>119,'description'=>'데이터 기반 성장 · 1계정 기준','features'=>[],'limits'=>[],'menuAccess'=>[]],
                ['id'=>'pro','name'=>'Pro','price_usd'=>399,'price_annual_usd'=>319,'is_recommended'=>true,'description'=>'풀 운영 자동화 · 1계정 기준','features'=>[],'limits'=>[],'menuAccess'=>[]],
                ['id'=>'enterprise','name'=>'Enterprise','price_usd'=>1500,'price_annual_usd'=>1200,'is_custom_quote'=>true,'description'=>'대규모 운영 · 맞춤 통합','features'=>[],'limits'=>[],'menuAccess'=>[]],
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
        // 203차: menu_tree 는 선택적(일부 환경/데모 DB 에 미존재) — 부재 시 빈 배열로 폴백(500 방지).
        //   프론트(MenuAccessManager)는 sidebarManifest 의 menuKey 를 행 SSOT 로 사용하므로 menus 미사용.
        $menus = [];
        try {
            $menus = $pdo->query(
                'SELECT id, label_key, route, menu_key, display_order FROM menu_tree ORDER BY display_order, id'
            )->fetchAll(\PDO::FETCH_ASSOC);
        } catch (\Throwable $e) { $menus = []; }
        $rows = [];
        try {
            $rows = $pdo->query('SELECT plan_id, menu_key, enabled FROM plan_menu_access')->fetchAll(\PDO::FETCH_ASSOC);
        } catch (\Throwable $e) { $rows = []; }
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
        self::mirrorPlanTablesToSibling($pdo); // 데모 DB 동기화(메뉴접근)
        return self::json($res, ['ok' => true, 'plan_id' => $planId, 'count' => count($menus)]);
    }

    /**
     * GET /v424/admin/plans/period-pricing
     * 전체 plan × period 가격 매트릭스 조회
     */
    public static function periodPricingAll(Request $req, Response $res): Response
    {
        $gate = UserAuth::requirePlan($req, $res, 'admin');
        if ($gate !== null) return $gate;
        $pdo = Db::pdo();
        $plans = $pdo->query(
            "SELECT plan_id, name, display_order, is_custom_quote, seat_tiers_json
             FROM plan_config WHERE is_active = 1 ORDER BY display_order"
        )->fetchAll(\PDO::FETCH_ASSOC);

        // 186차: 계정수(seat) 차원 추가 — pricing[plan][seat_tier][months]
        $rows = $pdo->query(
            "SELECT plan_id, seat_tier, period_months, price_usd, discount_pct,
                    paddle_price_id, is_active, display_order, updated_by, updated_at
             FROM plan_period_pricing ORDER BY plan_id, seat_tier, period_months"
        )->fetchAll(\PDO::FETCH_ASSOC);

        // group by plan_id → seat_tier → months
        $byPlan = [];
        foreach ($rows as $r) {
            $seat = (string)($r['seat_tier'] ?? '1');
            $byPlan[$r['plan_id']][$seat][(int)$r['period_months']] = [
                'price_usd'       => $r['price_usd'] !== null ? (float)$r['price_usd'] : null,
                'discount_pct'    => (int)$r['discount_pct'],
                'paddle_price_id' => (string)$r['paddle_price_id'],
                'is_active'       => (bool)$r['is_active'],
                'display_order'   => (int)$r['display_order'],
                'total_charge'    => $r['price_usd'] !== null
                    ? round((float)$r['price_usd'] * (int)$r['period_months'], 2)
                    : null,
            ];
        }
        // seat_tiers per plan (plan_config.seat_tiers_json → fallback 기본 1/10/무제한)
        $seatTiersByPlan = [];
        foreach ($plans as &$pl) {
            $st = json_decode((string)($pl['seat_tiers_json'] ?? ''), true);
            if (!is_array($st) || !$st) $st = self::defaultSeatTiers();
            $seatTiersByPlan[$pl['plan_id']] = $st;
            $pl['seat_tiers'] = $st;
            unset($pl['seat_tiers_json']);
        }
        unset($pl);
        return self::json($res, ['ok' => true, 'plans' => $plans, 'pricing' => $byPlan, 'seatTiers' => $seatTiersByPlan]);
    }

    /** 186차: 기본 계정수 티어 (1계정 / 10계정 / 무제한) — admin 자유 편집 */
    private static function defaultSeatTiers(): array
    {
        return [
            ['key' => '1',         'label' => '1계정',  'count' => 1,  'unlimited' => false],
            ['key' => '10',        'label' => '10계정', 'count' => 10, 'unlimited' => false],
            ['key' => 'unlimited', 'label' => '무제한', 'count' => 0,  'unlimited' => true],
        ];
    }

    /**
     * PUT /v424/admin/plans/{id}/period-pricing
     * Body: { periods: { "1": {price_usd, discount_pct, paddle_price_id, is_active}, "3": {...}, ... } }
     *
     * 172차 변경 (두 탭 통합 + 기간 자유 설정):
     *  - DELETE 후 INSERT 패턴 → admin 이 기간을 자유롭게 추가/제거 가능
     *    (예: 기존 {1,3,6,12} → {1,2,9,12,24} 로 변경 시 미포함 row 제거)
     *  - 저장 후 plan_config legacy 5컬럼 자동 동기화:
     *      price_usd        ← periods[1].price_usd     (없으면 NULL)
     *      price_annual_usd ← periods[12].price_usd    (없으면 NULL)
     *      price_id_monthly ← periods[1].paddle_price_id  (없으면 '')
     *      price_id_annual  ← periods[12].paddle_price_id (없으면 '')
     *      discount_pct     ← periods[12].discount_pct (12m 존재 시에만 갱신)
     *  - plan_period_pricing 가 가격 SSOT, plan_config 는 derived view.
     *    /auth/pricing/public-plans (plan_config 기반 공용 API) 동작 보존.
     */
    public static function periodPricingUpsert(Request $req, Response $res, array $args): Response
    {
        $gate = UserAuth::requirePlan($req, $res, 'admin');
        if ($gate !== null) return $gate;
        $planId = (string)($args['id'] ?? '');
        if (!preg_match('/^[a-z0-9_-]{1,64}$/i', $planId)) {
            return self::json($res, ['error' => 'invalid_plan_id'], 422);
        }
        $body    = (array)$req->getParsedBody();
        $actor   = substr((string)($req->getAttribute('auth_key') ?? 'admin'), 0, 64);

        // 186차: seat 차원 입력. 신규 { seatPricing: { seat_tier: { months: cfg } } }
        //          legacy { periods: { months: cfg } } → seat_tier '1' 로 호환.
        $seatPricing = isset($body['seatPricing']) && is_array($body['seatPricing']) ? $body['seatPricing'] : null;
        if ($seatPricing === null) {
            $legacy = isset($body['periods']) && is_array($body['periods']) ? $body['periods'] : [];
            $seatPricing = ['1' => $legacy];
        }
        // seatTiers 정의 (admin 자유 편집) — 없으면 기존 유지(미변경)
        $seatTiers = isset($body['seatTiers']) && is_array($body['seatTiers']) ? $body['seatTiers'] : null;

        // 입력 정규화: seat_tier → month → cfg, 유효 범위(1~60) 외 제거
        $clean = []; // [seat_tier][months] = cfg
        foreach ($seatPricing as $seat => $periods) {
            $seatKey = preg_replace('/[^a-zA-Z0-9_-]/', '', (string)$seat);
            if ($seatKey === '' || strlen($seatKey) > 16) continue;
            if (!is_array($periods)) continue;
            foreach ($periods as $months => $cfg) {
                $m = (int)$months;
                if ($m <= 0 || $m > 60) continue;
                if (!is_array($cfg)) continue;
                $clean[$seatKey][$m] = [
                    'price_usd'       => self::numOrNull($cfg['price_usd'] ?? null),
                    'discount_pct'    => max(0, min(100, (int)($cfg['discount_pct'] ?? 0))),
                    'paddle_price_id' => (string)($cfg['paddle_price_id'] ?? ''),
                    'is_active'       => (int)!empty($cfg['is_active'] ?? true),
                    'display_order'   => (int)($cfg['display_order'] ?? (10 + $m)),
                ];
            }
        }

        $pdo = Db::pdo();
        $pdo->beginTransaction();
        try {
            // 1) 본 플랜의 기존 row 전체 제거 → 누락 (seat,기간) 은 자연스럽게 삭제됨
            $pdo->prepare('DELETE FROM plan_period_pricing WHERE plan_id = ?')->execute([$planId]);

            // 2) 신규 row INSERT (seat_tier 포함)
            $cnt = 0;
            if ($clean) {
                $ins = $pdo->prepare(
                    'INSERT INTO plan_period_pricing
                       (plan_id, seat_tier, period_months, price_usd, discount_pct, paddle_price_id, is_active, display_order, updated_by)
                     VALUES (?,?,?,?,?,?,?,?,?)'
                );
                foreach ($clean as $seat => $periods) {
                    foreach ($periods as $m => $cfg) {
                        $ins->execute([
                            $planId, $seat, $m, $cfg['price_usd'], $cfg['discount_pct'],
                            $cfg['paddle_price_id'], $cfg['is_active'], $cfg['display_order'], $actor,
                        ]);
                        $cnt++;
                    }
                }
            }

            // 3) plan_config 동기화 — legacy 컬럼은 최소 계정수 티어('1' 우선, 없으면 첫 티어) 1m/12m 기준
            $baseSeat = isset($clean['1']) ? '1' : (array_key_first($clean) ?: '1');
            $base = $clean[$baseSeat] ?? [];
            $cfg1  = $base[1]  ?? null;
            $cfg12 = $base[12] ?? null;
            $syncFields = ['price_usd = ?', 'price_annual_usd = ?', 'price_id_monthly = ?', 'price_id_annual = ?'];
            $syncParams = [
                $cfg1  ? $cfg1['price_usd']        : null,
                $cfg12 ? $cfg12['price_usd']       : null,
                $cfg1  ? $cfg1['paddle_price_id']  : '',
                $cfg12 ? $cfg12['paddle_price_id'] : '',
            ];
            if ($cfg12) { $syncFields[] = 'discount_pct = ?'; $syncParams[] = $cfg12['discount_pct']; }
            // seat_tiers_json 갱신 (제공된 경우)
            if ($seatTiers !== null) {
                $syncFields[] = 'seat_tiers_json = ?';
                $syncParams[] = json_encode(array_values($seatTiers), JSON_UNESCAPED_UNICODE);
            }
            $syncParams[] = $planId;
            $pdo->prepare(
                'UPDATE plan_config SET ' . implode(', ', $syncFields) . ' WHERE plan_id = ?'
            )->execute($syncParams);

            $pdo->commit();
        } catch (\Throwable $e) {
            $pdo->rollBack();
            return self::json($res, ['error' => 'save_failed', 'detail' => $e->getMessage()], 500);
        }
        self::mirrorPlanTablesToSibling($pdo); // 데모 DB 동기화(기간별 요금)
        return self::json($res, ['ok' => true, 'plan_id' => $planId, 'count' => $cnt]);
    }

    private static function hydrate(array $row): array
    {
        $row['features'] = json_decode((string)($row['features_json'] ?? '[]'), true) ?: [];
        $row['limits']   = json_decode((string)($row['limits_json']   ?? '{}'), true) ?: [];
        $seatTiers = json_decode((string)($row['seat_tiers_json'] ?? ''), true);
        $row['seat_tiers'] = (is_array($seatTiers) && $seatTiers) ? $seatTiers : self::defaultSeatTiers();
        unset($row['features_json'], $row['limits_json'], $row['seat_tiers_json']);
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
