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
        Db::ensureCouponTables($pdo); // [282차 R3] valid_until 컬럼 보강(선존재 테이블)
        $stmt = $pdo->prepare(
            'SELECT id, code, plan, duration_days, max_uses, use_count,
                    issued_to_user_id, issued_to_email, is_revoked, redeemed_at, valid_until, usable_from
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
        // 1.5) [282차 R3 추천인제도] 유효기간(valid_until) 만료 검증 — 추천 보상쿠폰은 발급일+1년. NULL=무기한.
        if (!empty($coupon['valid_until']) && strtotime((string)$coupon['valid_until']) <= time()) {
            return self::json($res, ['error' => 'coupon_expired', 'message' => '쿠폰 유효기간이 만료되었습니다.'], 403);
        }
        // 1.6) [282차 R3 먹튀방지] 사용가능 시작일(usable_from) 잠금 — 추천 보상은 피추천 회원 1개월 유지 후 해제.
        if (!empty($coupon['usable_from']) && strtotime((string)$coupon['usable_from']) > time()) {
            return self::json($res, ['error' => 'coupon_locked',
                'message' => '아직 사용할 수 없는 쿠폰입니다. 추천 회원의 구독 유지(1개월) 확인 후 사용 가능합니다.',
                'usable_from' => (string)$coupon['usable_from']], 403);
        }
        // 1.7) [282차 R3 먹튀방지] 추천 보상쿠폰은 usable_from(30일) 경과 시점에도 피추천 회원이 여전히 활성
        //   구독이어야 사용 가능(1개월만 쓰고 탈퇴하면 영구 잠금). 일반 쿠폰은 null → 무영향.
        $retained = \Genie\Handlers\Referral::referredRetained($pdo, (int)$coupon['id']);
        if ($retained === false) {
            return self::json($res, ['error' => 'coupon_locked',
                'message' => '추천하신 회원이 구독을 유지하지 않아 아직 보상을 사용할 수 없습니다.'], 403);
        }
        // 2) use_count check
        if ((int)$coupon['use_count'] >= (int)$coupon['max_uses']) {
            return self::json($res, ['error' => 'coupon_exhausted', 'message' => '쿠폰 사용 한도 초과.'], 403);
        }
        // 3) email mismatch check (대상자 지정 쿠폰)
        if (!empty($coupon['issued_to_email']) && strcasecmp($coupon['issued_to_email'], $email) !== 0) {
            return self::json($res, ['error' => 'coupon_email_mismatch', 'message' => '본 쿠폰은 다른 사용자 전용입니다.'], 403);
        }
        // 3.5) [282차 R3] user_id 지정 쿠폰 검증 — 종전엔 email 만 확인해, issued_to_user_id 만 있고 email 이 빈
        //   대상지정 쿠폰(예: 추천 보상쿠폰=추천인 user_id 지정)을 코드만 알면 아무나 리딤할 수 있었다(보안 구멍).
        if (!empty($coupon['issued_to_user_id']) && (int)$coupon['issued_to_user_id'] !== $userId) {
            return self::json($res, ['error' => 'coupon_user_mismatch', 'message' => '본 쿠폰은 다른 사용자 전용입니다.'], 403);
        }
        // 4) 이미 같은 사용자가 redeem 했는지
        $dupStmt = $pdo->prepare(
            'SELECT id FROM coupon_redemptions WHERE coupon_id = ? AND user_id = ? LIMIT 1'
        );
        $dupStmt->execute([$coupon['id'], $userId]);
        if ($dupStmt->fetchColumn()) {
            return self::json($res, ['error' => 'coupon_already_used', 'message' => '이미 사용한 쿠폰입니다.'], 403);
        }

        // 4.5) [282차 R3] 다운그레이드 방지 — rank-max 로직(형제 CouponEngine::fire 와 정합).
        //   종전엔 admin/enterprise 만 하드코딩 거부해, Pro(rank3) 고객이 starter(rank1) 쿠폰을 리딤하면
        //   plan 이 starter 로 강등(메뉴접근 상실)됐다. 이제 적용 plan = max(현재, 쿠폰) 등급 → 절대 하락 없음.
        //   현재 등급이 쿠폰보다 높으면 plan 은 유지하고 기간(만료일)만 연장한다(보상 소실 없음).
        $userPlanStmt = $pdo->prepare('SELECT plan FROM app_user WHERE id = ?');
        $userPlanStmt->execute([$userId]);
        $userCurrentPlan = (string)$userPlanStmt->fetchColumn();
        $couponPlan = (string)$coupon['plan'];
        $applyPlan = (\Genie\PlanPolicy::rank($couponPlan) >= \Genie\PlanPolicy::rank($userCurrentPlan))
            ? $couponPlan : $userCurrentPlan;

        // 5) 적용 — subscription_expires_at 갱신 + free_coupons.use_count++
        $duration = (int)$coupon['duration_days'];
        $plan     = $applyPlan;   // 등급하락 없는 실효 플랜
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
            // [225차 P0-2] NOW() 는 MySQL 전용 → SQLite 폴백서 throw/500. 양 드라이버 공통
            //   CURRENT_TIMESTAMP 로 교체(MySQL·SQLite 모두 표준 지원).
            // [현 차수] 원자 선점(TOCTOU 방어) — 85행 사전체크와 137행 증가가 분리돼 동시 리딤 시 한도 1 초과 소진/
            //   1회용 쿠폰 이중 사용이 가능했다. use_count<max_uses 조건부 UPDATE + rowCount 로 원자화(사전체크는 빠른 실패용 유지).
            $upd = $pdo->prepare(
                'UPDATE free_coupons
                    SET use_count = use_count + 1,
                        redeemed_at = CURRENT_TIMESTAMP,
                        redeemed_by_user_id = ?
                  WHERE id = ? AND use_count < max_uses'
            );
            $upd->execute([$userId, $coupon['id']]);
            if ($upd->rowCount() === 0) {
                $pdo->rollBack();
                return self::json($res, ['error' => 'coupon_exhausted', 'message' => '쿠폰 사용 한도 초과.'], 403);
            }

            // coupon_redemptions insert
            $pdo->prepare(
                'INSERT INTO coupon_redemptions (coupon_id, user_id, plan, expires_at, created_at)
                 VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)'
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
        Db::ensureCouponTables($pdo);
        $stmt = $pdo->prepare(
            'SELECT id, code, plan, duration_days, max_uses, use_count, issued_to_email, is_revoked, redeemed_at, valid_until, usable_from
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
        if (!empty($coupon['valid_until']) && strtotime((string)$coupon['valid_until']) <= time()) {
            return self::json($res, ['ok' => false, 'reason' => 'expired', 'message' => '쿠폰 유효기간이 만료되었습니다.']);
        }
        if (!empty($coupon['usable_from']) && strtotime((string)$coupon['usable_from']) > time()) {
            return self::json($res, ['ok' => false, 'reason' => 'locked', 'usable_from' => (string)$coupon['usable_from'],
                'message' => '추천 회원의 구독 유지 확인 후 사용 가능합니다(잠금).']);
        }
        if (\Genie\Handlers\Referral::referredRetained($pdo, (int)$coupon['id']) === false) {
            return self::json($res, ['ok' => false, 'reason' => 'locked',
                'message' => '추천하신 회원이 구독을 유지하지 않아 아직 사용할 수 없습니다.']);
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
        // [225차 P0-2] STR_TO_DATE/NOW() 는 MySQL 전용 → SQLite 폴백서 resolveUser 전면 throw/500.
        //   만료 판정을 SQL 에서 제거하고 expires_at 을 PHP 에서 strtotime 비교(양 드라이버 공통 동작).
        $stmt = $pdo->prepare(
            'SELECT s.user_id, s.expires_at, u.email FROM user_session s
              JOIN app_user u ON u.id = s.user_id
              WHERE s.token IN (?, ?)
              LIMIT 1'
        );
        $stmt->execute([UserAuth::hashToken($token), $token]);
        $row = $stmt->fetch(\PDO::FETCH_ASSOC);
        if (!$row) return null;
        $exp = (string)($row['expires_at'] ?? '');
        if ($exp !== '' && strtotime($exp) <= time()) return null;  // 만료 세션 거부
        unset($row['expires_at']);
        return $row;
    }

    private static function json(Response $res, array $body, int $code = 200): Response
    {
        $res->getBody()->write(json_encode($body, JSON_UNESCAPED_UNICODE));
        return $res->withStatus($code)->withHeader('Content-Type', 'application/json; charset=utf-8');
    }
}
