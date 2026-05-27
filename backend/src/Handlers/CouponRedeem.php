<?php
declare(strict_types=1);

namespace Genie\Handlers;

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;
use Genie\Db;
use Genie\Handlers\UserAuth;

/**
 * CouponRedeem — 172차 P0-C.3 사용자 쿠폰 사용.
 *
 * Endpoints:
 *  - POST /auth/coupon/redeem      : 인증 사용자가 쿠폰 코드 사용
 *  - GET  /auth/coupon/preview     : 코드 유효성 검증 (사용 X) — 적용 전 미리보기
 *
 * 규칙:
 *  1. revoked 쿠폰은 거부
 *  2. use_count >= max_uses 이면 거부
 *  3. issued_to_email 있으면 현재 사용자 email 과 일치해야 함
 *  4. 이미 redeemed 된 1회용 쿠폰 거부
 *  5. duration_days 가 큰 쿠폰을 redeem 하면 subscription_expires_at 갱신
 *     (현재 만료일 + duration vs 새 만료일 중 더 늦은 시점)
 */
final class CouponRedeem
{
    /**
     * POST /auth/coupon/redeem
     * Body: { code }
     * Auth: Bearer token (any plan)
     */
    public static function redeem(Request $req, Response $res): Response
    {
        $userId = (int)($req->getAttribute('auth_user_id') ?? 0);
        $email  = (string)($req->getAttribute('auth_email') ?? '');
        if (!$userId) {
            // fallback: parse token directly
            $info = self::resolveUser($req);
            if (!$info) return self::json($res, ['error' => 'unauthorized'], 401);
            $userId = (int)$info['user_id'];
            $email  = (string)$info['email'];
        }
        $body = (array)$req->getParsedBody();
        $code = trim(strtoupper((string)($body['code'] ?? '')));
        if ($code === '' || strlen($code) > 64) {
            return self::json($res, ['error' => 'invalid_code'], 422);
        }

        $pdo = Db::pdo();
        $stmt = $pdo->prepare(
            'SELECT id, code, plan, duration_days, max_uses, use_count,
                    issued_to_user_id, issued_to_email, is_revoked, redeemed_at
             FROM free_coupons WHERE code = ? LIMIT 1'
        );
        $stmt->execute([$code]);
        $coupon = $stmt->fetch(\PDO::FETCH_ASSOC);
        if (!$coupon) {
            return self::json($res, ['error' => 'coupon_not_found', 'message' => '쿠폰 코드를 찾을 수 없습니다.'], 404);
        }

        // 1) revoked check
        if ((int)$coupon['is_revoked'] === 1) {
            return self::json($res, ['error' => 'coupon_revoked', 'message' => '무효화된 쿠폰입니다.'], 403);
        }
        // 2) use_count check
        if ((int)$coupon['use_count'] >= (int)$coupon['max_uses']) {
            return self::json($res, ['error' => 'coupon_exhausted', 'message' => '쿠폰 사용 한도 초과.'], 403);
        }
        // 3) email mismatch check (대상자 지정 쿠폰)
        if (!empty($coupon['issued_to_email']) && strcasecmp($coupon['issued_to_email'], $email) !== 0) {
            return self::json($res, ['error' => 'coupon_email_mismatch', 'message' => '본 쿠폰은 다른 사용자 전용입니다.'], 403);
        }
        // 4) 이미 같은 사용자가 redeem 했는지
        $dupStmt = $pdo->prepare(
            'SELECT id FROM coupon_redemptions WHERE coupon_id = ? AND user_id = ? LIMIT 1'
        );
        $dupStmt->execute([$coupon['id'], $userId]);
        if ($dupStmt->fetchColumn()) {
            return self::json($res, ['error' => 'coupon_already_used', 'message' => '이미 사용한 쿠폰입니다.'], 403);
        }

        // 4.5) admin / enterprise downgrade 방지 (172차 P0-C.3 긴급 fix)
        //   admin/enterprise plan 인 user 가 쿠폰으로 starter/pro 받으면 권한 손실 발생.
        //   이런 경우 거부 — 사용자 명시 요청 시 admin 이 직접 plan 조정.
        $protectedPlans = ['admin', 'enterprise'];
        $userPlanStmt = $pdo->prepare('SELECT plan FROM app_user WHERE id = ?');
        $userPlanStmt->execute([$userId]);
        $userCurrentPlan = (string)$userPlanStmt->fetchColumn();
        if (in_array($userCurrentPlan, $protectedPlans, true)) {
            return self::json($res, [
                'error' => 'protected_plan',
                'message' => "현재 {$userCurrentPlan} 플랜이라 쿠폰을 적용하면 권한이 다운그레이드됩니다. 관리자에게 문의하세요.",
                'currentPlan' => $userCurrentPlan,
                'couponPlan'  => $coupon['plan'],
            ], 403);
        }

        // 5) 적용 — subscription_expires_at 갱신 + free_coupons.use_count++
        $duration = (int)$coupon['duration_days'];
        $plan     = (string)$coupon['plan'];
        $now      = gmdate('Y-m-d H:i:s');

        $pdo->beginTransaction();
        try {
            // 현재 만료일 + duration vs 신규 만료일 중 더 늦은 시점
            $userStmt = $pdo->prepare('SELECT plan, subscription_expires_at FROM app_user WHERE id = ?');
            $userStmt->execute([$userId]);
            $userRow = $userStmt->fetch(\PDO::FETCH_ASSOC);
            $currentExpiry = $userRow['subscription_expires_at'] ?? null;
            $base = $currentExpiry && strtotime($currentExpiry) > time() ? $currentExpiry : $now;
            $newExpiry = date('Y-m-d H:i:s', strtotime("$base +$duration days"));

            // free_coupons update
            $pdo->prepare(
                'UPDATE free_coupons
                    SET use_count = use_count + 1,
                        redeemed_at = NOW(),
                        redeemed_by_user_id = ?
                  WHERE id = ?'
            )->execute([$userId, $coupon['id']]);

            // coupon_redemptions insert
            $pdo->prepare(
                'INSERT INTO coupon_redemptions (coupon_id, user_id, plan, expires_at, created_at)
                 VALUES (?, ?, ?, ?, NOW())'
            )->execute([$coupon['id'], $userId, $plan, $newExpiry]);

            // app_user plan + expiry update
            $pdo->prepare(
                'UPDATE app_user SET plan = ?, plans = ?, subscription_expires_at = ? WHERE id = ?'
            )->execute([$plan, $plan, $newExpiry, $userId]);

            $pdo->commit();
        } catch (\Throwable $e) {
            $pdo->rollBack();
            return self::json($res, ['error' => 'redeem_failed', 'detail' => $e->getMessage()], 500);
        }

        return self::json($res, [
            'ok'             => true,
            'code'           => $code,
            'plan'           => $plan,
            'duration_days'  => $duration,
            'expires_at'     => $newExpiry,
            'message'        => "🎉 {$plan} 플랜 {$duration}일 무료 이용권이 적용되었습니다!",
        ]);
    }

    /**
     * GET /auth/coupon/preview?code=GENIE-XXX
     * 코드 유효성 검증 (사용 X). 적용 전 사용자에게 미리보기 노출.
     */
    public static function preview(Request $req, Response $res): Response
    {
        $userId = (int)($req->getAttribute('auth_user_id') ?? 0);
        $email  = (string)($req->getAttribute('auth_email') ?? '');
        if (!$userId) {
            $info = self::resolveUser($req);
            if ($info) { $userId = (int)$info['user_id']; $email = (string)$info['email']; }
        }
        $code = trim(strtoupper((string)($req->getQueryParams()['code'] ?? '')));
        if ($code === '') return self::json($res, ['error' => 'invalid_code'], 422);

        $pdo = Db::pdo();
        $stmt = $pdo->prepare(
            'SELECT code, plan, duration_days, max_uses, use_count, issued_to_email, is_revoked, redeemed_at
             FROM free_coupons WHERE code = ? LIMIT 1'
        );
        $stmt->execute([$code]);
        $coupon = $stmt->fetch(\PDO::FETCH_ASSOC);
        if (!$coupon) {
            return self::json($res, ['ok' => false, 'reason' => 'not_found', 'message' => '쿠폰 코드를 찾을 수 없습니다.']);
        }
        if ((int)$coupon['is_revoked'] === 1) {
            return self::json($res, ['ok' => false, 'reason' => 'revoked', 'message' => '무효화된 쿠폰입니다.']);
        }
        if ((int)$coupon['use_count'] >= (int)$coupon['max_uses']) {
            return self::json($res, ['ok' => false, 'reason' => 'exhausted', 'message' => '쿠폰 사용 한도 초과.']);
        }
        if ($email && !empty($coupon['issued_to_email']) && strcasecmp($coupon['issued_to_email'], $email) !== 0) {
            return self::json($res, ['ok' => false, 'reason' => 'email_mismatch', 'message' => '본 쿠폰은 다른 사용자 전용입니다.']);
        }
        return self::json($res, [
            'ok'            => true,
            'code'          => $coupon['code'],
            'plan'          => $coupon['plan'],
            'duration_days' => (int)$coupon['duration_days'],
            'message'       => "✅ {$coupon['plan']} 플랜 {$coupon['duration_days']}일 무료 이용권 — 적용 가능",
        ]);
    }

    /** Bearer token 으로 user 찾기 */
    private static function resolveUser(Request $req): ?array
    {
        $auth = $req->getHeaderLine('Authorization');
        if (!preg_match('/Bearer\s+([a-f0-9]{64})/i', $auth, $m)) return null;
        $token = $m[1];
        $pdo = Db::pdo();
        $stmt = $pdo->prepare(
            'SELECT s.user_id, u.email FROM user_session s
              JOIN app_user u ON u.id = s.user_id
              WHERE s.token = ? AND STR_TO_DATE(SUBSTRING(s.expires_at,1,19), "%Y-%m-%dT%H:%i:%s") > NOW()
              LIMIT 1'
        );
        $stmt->execute([$token]);
        $row = $stmt->fetch(\PDO::FETCH_ASSOC);
        return $row ?: null;
    }

    private static function json(Response $res, array $body, int $code = 200): Response
    {
        $res->getBody()->write(json_encode($body, JSON_UNESCAPED_UNICODE));
        return $res->withStatus($code)->withHeader('Content-Type', 'application/json; charset=utf-8');
    }
}
