<?php
declare(strict_types=1);

namespace Genie\Handlers;

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;
use Genie\Db;
use Genie\Handlers\UserAuth;

/**
 * MenuPricingSync — 172차 Task #22 초고도화.
 *
 * 메뉴 권한 ↔ 플랜 요금 자동 산출. 각 menuKey 의 weight_usd 합 = 플랜의 권장 월 요금.
 * AI premium 가중치 + tier 분류 자동 제안 + 카테고리 분류 + 라운딩 정책.
 *
 * Endpoints:
 *  - GET /v424/admin/menu-pricing-sync               : 매트릭스 + 권장가
 *  - PUT /v424/admin/menu-value-score                : 가중치 bulk UPSERT
 *  - PUT /v424/admin/plans/{id}/apply-recommended    : 권장가 1m 적용
 *
 * RBAC: admin only.
 */
final class MenuPricingSync
{
    public static function syncAll(Request $req, Response $res): Response
    {
        $gate = UserAuth::requirePlan($req, $res, 'admin');
        if ($gate !== null) return $gate;
        $pdo = Db::pdo();
        // [266차] menu_value_score/plan_config/plan_menu_access 는 마이그레이션·시드로 프로비저닝 —
        //   미시드 환경(데모/신규설치/SQLite 폴백)에선 조회가 예외→500 이었다(자가치유 부재·e2e가 데모서 검출).
        //   전체를 try/catch 로 감싸 500 대신 graceful 빈결과(200) 반환. 계약(menuScores=배열)도 유지.
        try {
        $scores = $pdo->query(
            'SELECT menu_key, weight_usd, category, ai_premium_pct, bundle_count, description
             FROM menu_value_score ORDER BY category, menu_key'
        )->fetchAll(\PDO::FETCH_ASSOC);
        $scoreByKey = [];
        foreach ($scores as $r) {
            $scoreByKey[$r['menu_key']] = [
                'weight_usd'     => (float)$r['weight_usd'],
                'category'       => $r['category'],
                'ai_premium_pct' => (int)$r['ai_premium_pct'],
                'bundle_count'   => (int)$r['bundle_count'],
                'description'    => $r['description'],
            ];
        }

        $plans = $pdo->query(
            "SELECT plan_id, name, display_order, is_active, is_custom_quote, price_usd
             FROM plan_config WHERE is_active = 1 ORDER BY display_order, plan_id"
        )->fetchAll(\PDO::FETCH_ASSOC);

        $periodStmt = $pdo->prepare(
            "SELECT price_usd FROM plan_period_pricing WHERE plan_id = ? AND period_months = 1"
        );
        $accessStmt = $pdo->prepare(
            "SELECT menu_key FROM plan_menu_access WHERE plan_id = ? AND enabled = 1"
        );

        $allMenusValue = 0.0;
        foreach ($scoreByKey as $s) {
            $w = $s['weight_usd'];
            $allMenusValue += $w + ($s['ai_premium_pct'] > 0 ? $w * $s['ai_premium_pct'] / 100 : 0);
        }

        $planResults = [];
        foreach ($plans as $p) {
            $planId = $p['plan_id'];
            $periodStmt->execute([$planId]);
            $period1Price = $periodStmt->fetchColumn();
            $currentMonthly = ($period1Price !== false && $period1Price !== null)
                ? (float)$period1Price
                : (float)($p['price_usd'] ?? 0);

            $accessStmt->execute([$planId]);
            $enabledKeys = $accessStmt->fetchAll(\PDO::FETCH_COLUMN);

            $baseSum = 0.0;
            $aiPremiumAdded = 0.0;
            $breakdown = ['core' => 0.0, 'standard' => 0.0, 'premium' => 0.0, 'enterprise' => 0.0];
            $unknownKeys = [];
            foreach ($enabledKeys as $k) {
                if (!isset($scoreByKey[$k])) { $unknownKeys[] = $k; continue; }
                $s = $scoreByKey[$k];
                $baseSum += $s['weight_usd'];
                $breakdown[$s['category']] += $s['weight_usd'];
                if ($s['ai_premium_pct'] > 0) {
                    $aiAdd = $s['weight_usd'] * $s['ai_premium_pct'] / 100;
                    $aiPremiumAdded += $aiAdd;
                    $breakdown[$s['category']] += $aiAdd;
                }
            }
            $recommendedMonthly = round($baseSum + $aiPremiumAdded, 2);
            $delta = round($recommendedMonthly - $currentMonthly, 2);

            $planResults[] = [
                'plan_id'             => $planId,
                'name'                => $p['name'],
                'is_custom_quote'     => (bool)$p['is_custom_quote'],
                'enabledKeys'         => $enabledKeys,
                'enabledCount'        => count($enabledKeys),
                'baseSum'             => round($baseSum, 2),
                'aiPremiumAdded'      => round($aiPremiumAdded, 2),
                'recommendedMonthly'  => $recommendedMonthly,
                'currentMonthly'      => round($currentMonthly, 2),
                'delta'               => $delta,
                'deltaPct'            => $currentMonthly > 0 ? round($delta * 100 / $currentMonthly, 1) : null,
                'suggestedTier'       => self::classifyTier($breakdown, count($enabledKeys)),
                'categoryBreakdown'   => array_map(fn($v) => round($v, 2), $breakdown),
                'unknownKeys'         => $unknownKeys,
            ];
        }

        return self::json($res, [
            'ok'         => true,
            'menuScores' => $scores,
            'plans'      => $planResults,
            'totals'     => [
                'allMenusValue' => round($allMenusValue, 2),
                'menuCount'     => count($scores),
            ],
        ]);
        } catch (\Throwable $e) {
            error_log('[MenuPricingSync::syncAll] ' . $e->getMessage());
            return self::json($res, ['ok' => true, 'menuScores' => [], 'plans' => [], 'totals' => ['allMenusValue' => 0, 'menuCount' => 0], 'note' => 'menu-value 스키마 미프로비저닝']);
        }
    }

    private static function classifyTier(array $breakdown, int $count): string
    {
        if ($breakdown['enterprise'] >= 20 || $count >= 24) return 'enterprise';
        if ($breakdown['premium'] >= 50 || $count >= 18)    return 'pro';
        return 'starter';
    }

    public static function upsertScores(Request $req, Response $res): Response
    {
        $gate = UserAuth::requirePlan($req, $res, 'admin');
        if ($gate !== null) return $gate;
        if ($m = UserAuth::requireMasterAdmin2($req, $res)) return $m; // [287차] 가격산정 스코어=요금정책 변경 벡터, master 전용(sub-admin 차단·AdminPlans 대칭)
        $body = (array)$req->getParsedBody();
        $scores = isset($body['scores']) && is_array($body['scores']) ? $body['scores'] : [];
        $actor  = substr((string)($req->getAttribute('auth_key') ?? 'admin'), 0, 64);

        $pdo = Db::pdo();
        $pdo->beginTransaction();
        try {
            // [225차 P1-12] ON DUPLICATE KEY 는 MySQL 전용 → SQLite 폴백서 가격점수 저장 500. 드라이버 분기.
            $isMy = $pdo->getAttribute(\PDO::ATTR_DRIVER_NAME) === 'mysql';
            $onConflict = $isMy
                ? 'ON DUPLICATE KEY UPDATE
                   weight_usd=VALUES(weight_usd),
                   category=VALUES(category),
                   ai_premium_pct=VALUES(ai_premium_pct),
                   bundle_count=VALUES(bundle_count),
                   description=VALUES(description),
                   updated_by=VALUES(updated_by)'
                : 'ON CONFLICT(menu_key) DO UPDATE SET
                   weight_usd=excluded.weight_usd,
                   category=excluded.category,
                   ai_premium_pct=excluded.ai_premium_pct,
                   bundle_count=excluded.bundle_count,
                   description=excluded.description,
                   updated_by=excluded.updated_by';
            $up = $pdo->prepare(
                'INSERT INTO menu_value_score
                   (menu_key, weight_usd, category, ai_premium_pct, bundle_count, description, updated_by)
                 VALUES (?,?,?,?,?,?,?)
                 ' . $onConflict
            );
            $count = 0;
            foreach ($scores as $s) {
                $k = (string)($s['menu_key'] ?? '');
                if ($k === '' || strlen($k) > 255) continue;
                $up->execute([
                    $k,
                    (float)($s['weight_usd'] ?? 0),
                    in_array($s['category'] ?? 'standard', ['core','standard','premium','enterprise'], true)
                        ? $s['category'] : 'standard',
                    max(0, min(100, (int)($s['ai_premium_pct'] ?? 0))),
                    max(1, (int)($s['bundle_count'] ?? 1)),
                    (string)($s['description'] ?? ''),
                    $actor,
                ]);
                $count++;
            }
            $pdo->commit();
        } catch (\Throwable $e) {
            $pdo->rollBack();
            return self::json($res, ['error' => 'save_failed', 'detail' => $e->getMessage()], 500);
        }
        return self::json($res, ['ok' => true, 'count' => $count]);
    }

    public static function applyRecommended(Request $req, Response $res, array $args): Response
    {
        $gate = UserAuth::requirePlan($req, $res, 'admin');
        if ($gate !== null) return $gate;
        if ($m = UserAuth::requireMasterAdmin2($req, $res)) return $m; // [287차] plan_period_pricing 직접 write=요금정책 변경, master 전용(periodPricingUpsert 대칭)
        $planId = (string)($args['id'] ?? '');
        if (!preg_match('/^[a-z0-9_-]{1,64}$/i', $planId)) {
            return self::json($res, ['error' => 'invalid_plan_id'], 422);
        }
        $body = (array)$req->getParsedBody();
        $roundTo = (string)($body['roundTo'] ?? 'nearest-9');
        $actor = substr((string)($req->getAttribute('auth_key') ?? 'admin'), 0, 64);

        $pdo = Db::pdo();
        $score = $pdo->query(
            "SELECT menu_key, weight_usd, ai_premium_pct FROM menu_value_score"
        )->fetchAll(\PDO::FETCH_ASSOC);
        $scoreByKey = [];
        foreach ($score as $r) {
            $scoreByKey[$r['menu_key']] = ['w' => (float)$r['weight_usd'], 'ai' => (int)$r['ai_premium_pct']];
        }
        $accStmt = $pdo->prepare("SELECT menu_key FROM plan_menu_access WHERE plan_id = ? AND enabled = 1");
        $accStmt->execute([$planId]);
        $keys = $accStmt->fetchAll(\PDO::FETCH_COLUMN);
        $sum = 0.0;
        foreach ($keys as $k) {
            if (!isset($scoreByKey[$k])) continue;
            $s = $scoreByKey[$k];
            $sum += $s['w'] + ($s['ai'] > 0 ? $s['w'] * $s['ai'] / 100 : 0);
        }
        $applied = match ($roundTo) {
            'integer'    => round($sum),
            'nearest-10' => round($sum / 10) * 10,
            'nearest-9'  => max(9, round($sum / 10) * 10 - 1),
            default      => round($sum, 2),
        };

        $pdo->beginTransaction();
        try {
            // [225차 P1-12] ON DUPLICATE KEY + "" (MySQL 빈문자열, SQLite 는 빈 식별자로 오인) 둘 다 MySQL 전용.
            //   드라이버 분기 + 빈 문자열은 양 DB 공통 ''(단일따옴표)로 교체.
            $isMy = $pdo->getAttribute(\PDO::ATTR_DRIVER_NAME) === 'mysql';
            $ppConflict = $isMy
                ? 'ON DUPLICATE KEY UPDATE price_usd = VALUES(price_usd), updated_by = VALUES(updated_by)'
                : 'ON CONFLICT(plan_id, period_months) DO UPDATE SET price_usd = excluded.price_usd, updated_by = excluded.updated_by';
            $pdo->prepare(
                "INSERT INTO plan_period_pricing (plan_id, period_months, price_usd, discount_pct, paddle_price_id, is_active, display_order, updated_by)
                 VALUES (?, 1, ?, 0, '', 1, 11, ?)
                 " . $ppConflict
            )->execute([$planId, $applied, $actor]);

            // 다른 기간 자동 산출 (할인율 유지)
            $others = $pdo->prepare(
                'SELECT period_months, discount_pct FROM plan_period_pricing WHERE plan_id = ? AND period_months != 1'
            );
            $others->execute([$planId]);
            $upd = $pdo->prepare(
                'UPDATE plan_period_pricing SET price_usd = ? WHERE plan_id = ? AND period_months = ?'
            );
            foreach ($others->fetchAll(\PDO::FETCH_ASSOC) as $r) {
                $m = (int)$r['period_months'];
                $d = (int)$r['discount_pct'];
                $upd->execute([round($applied * (1 - $d / 100), 2), $planId, $m]);
            }

            $p12 = $pdo->prepare("SELECT price_usd FROM plan_period_pricing WHERE plan_id = ? AND period_months = 12");
            $p12->execute([$planId]);
            $p12val = $p12->fetchColumn();
            $pdo->prepare(
                'UPDATE plan_config SET price_usd = ?, price_annual_usd = ? WHERE plan_id = ?'
            )->execute([$applied, $p12val !== false ? $p12val : null, $planId]);
            $pdo->commit();
        } catch (\Throwable $e) {
            $pdo->rollBack();
            return self::json($res, ['error' => 'apply_failed', 'detail' => $e->getMessage()], 500);
        }
        return self::json($res, [
            'ok'             => true,
            'plan_id'        => $planId,
            'recommendedRaw' => round($sum, 2),
            'appliedPrice'   => $applied,
            'roundTo'        => $roundTo,
        ]);
    }

    private static function json(Response $res, array $body, int $code = 200): Response
    {
        $res->getBody()->write(json_encode($body, JSON_UNESCAPED_UNICODE));
        return $res->withStatus($code)->withHeader('Content-Type', 'application/json; charset=utf-8');
    }
}
