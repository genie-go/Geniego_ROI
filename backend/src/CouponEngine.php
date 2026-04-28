<?php
declare(strict_types=1);

namespace Genie;

/**
 * CouponEngine  ─  자동 쿠폰 발급 + 즉시 플랜 적용
 *
 * 호출 지점:
 *  1. UserAuth::register()            → trigger='signup'
 *  2. Paddle::onSubscriptionActivated() → trigger='upgrade'  (첫 구독 생성 시)
 *  3. Paddle::onTransactionCompleted()  → trigger='renewal'  (결제 완료 시)
 *
 * 동작 방식:
 *  a. coupon_rules 테이블에서 해당 trigger의 is_active 규칙 조회
 *  b. 규칙이 활성화되어 있으면 free_coupons에 쿠폰 INSERT
 *  c. 쿠폰을 즉시 사용 처리(redeem) → coupon_redemptions INSERT
 *  d. app_user의 plan + subscription_expires_at 즉시 업데이트
 *  e. 모든 처리는 조용한 실패(silent fail) — 주 기능을 해쳐서는 안 됨
 */
final class CouponEngine
{
    /**
     * 트리거 발생 시 호출.
     *
     * @param \PDO   $pdo     DB 연결
     * @param int    $userId  대상 사용자 ID
     * @param string $email   대상 이메일
     * @param string $trigger 'signup' | 'upgrade' | 'renewal'
     * @param string $currentPlan 현재 플랜 (중복 발급 방지 판단용)
     * @return array|null  발급된 쿠폰 정보(ok, code, plan, duration_days) or null
     */
    public static function fire(
        \PDO   $pdo,
        int    $userId,
        string $email,
        string $trigger,
        string $currentPlan = 'free'
    ): ?array {
        try {
            // 1. coupon_rules 테이블에서 활성 규칙 조회
            $rule = self::getActiveRule($pdo, $trigger);
            if (!$rule) return null;   // 해당 트리거 규칙 없음 or 비활성

            // 2. upgrade/renewal 트리거의 경우 이미 유료 플랜이라면 skip
            //    (signup은 항상 발급 — demo/free 대상)
            if ($trigger === 'upgrade') {
                $paidPlans = ['starter','growth','pro','enterprise'];
                // 이미 더 높은 플랜이면 skip
                // (단, 현재 free/demo인 경우만 발급)
                if (!in_array($currentPlan, ['free','demo'], true)) {
                    // 이미 유료 → 쿠폰 스킵
                    return null;
                }
            }

            // 3. 이미 해당 트리거로 발급된 쿠폰이 있는지 확인 (중복 방지)
            if (self::alreadyIssued($pdo, $userId, $trigger)) {
                return null;
            }

            // 4. 쿠폰 코드 생성
            $code         = 'GENIE-AUTO-' . strtoupper(bin2hex(random_bytes(4)));
            $plan         = $rule['plan'];
            $durationDays = (int)$rule['duration_days'];
            $note         = "[auto:{$trigger}] " . ($rule['note'] ?? '');

            // 5. free_coupons에 INSERT (이미 사용됨 상태로)
            $now      = gmdate('Y-m-d H:i:s');
            $driver   = $pdo->getAttribute(\PDO::ATTR_DRIVER_NAME);
            $expiresAt = date('Y-m-d H:i:s', strtotime("+{$durationDays} days"));

            if ($driver === 'mysql') {
                $pdo->prepare("
                    INSERT INTO free_coupons
                        (code, plan, duration_days, max_uses, use_count,
                         issued_to_user_id, issued_to_email, note, issued_by,
                         is_revoked, redeemed_at, redeemed_by_user_id, created_at)
                    VALUES (?,?,?,1,1,?,?,?,0,0,NOW(),?,NOW())
                ")->execute([$code, $plan, $durationDays, $userId, $email, $note, $userId]);
            } else {
                $pdo->prepare("
                    INSERT INTO free_coupons
                        (code, plan, duration_days, max_uses, use_count,
                         issued_to_user_id, issued_to_email, note, issued_by,
                         is_revoked, redeemed_at, redeemed_by_user_id, created_at)
                    VALUES (?,?,?,1,1,?,?,?,0,0,datetime('now'),?,datetime('now'))
                ")->execute([$code, $plan, $durationDays, $userId, $email, $note, $userId]);
            }

            $couponId = (int)$pdo->lastInsertId();

            // 6. coupon_redemptions에도 기록
            try {
                if ($driver === 'mysql') {
                    $pdo->prepare("
                        INSERT IGNORE INTO coupon_redemptions
                            (coupon_id, user_id, plan, expires_at, created_at)
                        VALUES (?,?,?,?,NOW())
                    ")->execute([$couponId, $userId, $plan, $expiresAt]);
                } else {
                    $pdo->prepare("
                        INSERT OR IGNORE INTO coupon_redemptions
                            (coupon_id, user_id, plan, expires_at, created_at)
                        VALUES (?,?,?,?,datetime('now'))
                    ")->execute([$couponId, $userId, $plan, $expiresAt]);
                }
            } catch (\Throwable $e) {
                error_log('[CouponEngine] redemptions insert: ' . $e->getMessage());
            }

            // 7. app_user 플랜 즉시 업데이트
            self::applyPlanToUser($pdo, $userId, $email, $plan, $expiresAt);

            return [
                'ok'           => true,
                'code'         => $code,
                'plan'         => $plan,
                'duration_days'=> $durationDays,
                'expires_at'   => $expiresAt,
                'trigger'      => $trigger,
            ];

        } catch (\Throwable $e) {
            error_log('[CouponEngine] fire error: ' . $e->getMessage());
            return null;
        }
    }

    /** coupon_rules에서 활성 규칙 조회 (테이블 없으면 자동 생성+기본규칙 삽입) */
    private static function getActiveRule(\PDO $pdo, string $trigger): ?array
    {
        $driver = $pdo->getAttribute(\PDO::ATTR_DRIVER_NAME);
        // 한 번만 테이블 체크·생성
        try {
            if ($driver === 'mysql') {
                $pdo->exec("CREATE TABLE IF NOT EXISTS coupon_rules (
                    id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                    trigger_name VARCHAR(30) NOT NULL UNIQUE,
                    is_active    TINYINT(1) NOT NULL DEFAULT 0,
                    plan         VARCHAR(30) NOT NULL DEFAULT 'starter',
                    duration_days INT NOT NULL DEFAULT 7,
                    max_uses     INT NOT NULL DEFAULT 1,
                    note         TEXT NULL,
                    updated_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
                $pdo->exec("INSERT IGNORE INTO coupon_rules
                    (trigger_name,is_active,plan,duration_days,note) VALUES
                    ('signup',1,'starter',7,'신규가입 환영 쿠폰'),
                    ('upgrade',0,'growth',14,'유료전환 감사 쿠폰'),
                    ('renewal',0,'pro',30,'갱신 감사 쿠폰')");
            } else {
                $pdo->exec("CREATE TABLE IF NOT EXISTS coupon_rules (
                    id           INTEGER PRIMARY KEY AUTOINCREMENT,
                    trigger_name TEXT NOT NULL UNIQUE,
                    is_active    INTEGER NOT NULL DEFAULT 0,
                    plan         TEXT NOT NULL DEFAULT 'starter',
                    duration_days INTEGER NOT NULL DEFAULT 7,
                    max_uses     INTEGER NOT NULL DEFAULT 1,
                    note         TEXT NULL,
                    updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
                )");
                $pdo->exec("INSERT OR IGNORE INTO coupon_rules
                    (trigger_name,is_active,plan,duration_days,note) VALUES
                    ('signup',1,'starter',7,'신규가입 환영 쿠폰'),
                    ('upgrade',0,'growth',14,'유료전환 감사 쿠폰'),
                    ('renewal',0,'pro',30,'갱신 감사 쿠폰')");
            }
        } catch (\Throwable $e) {
            error_log('[CouponEngine] table init: ' . $e->getMessage());
        }
        try {
            $stmt = $pdo->prepare(
                "SELECT * FROM coupon_rules WHERE trigger_name = ? AND is_active = 1 LIMIT 1"
            );
            $stmt->execute([$trigger]);
            $row = $stmt->fetch(\PDO::FETCH_ASSOC);
            return $row ?: null;
        } catch (\Throwable $e) {
            return null;
        }
    }

    /** 같은 트리거로 이미 발급받은 쿠폰이 있는지 확인 */
    private static function alreadyIssued(\PDO $pdo, int $userId, string $trigger): bool
    {
        try {
            $stmt = $pdo->prepare(
                "SELECT COUNT(*) FROM free_coupons
                  WHERE issued_to_user_id = ?
                    AND note LIKE ?
                  LIMIT 1"
            );
            $stmt->execute([$userId, "[auto:{$trigger}]%"]);
            return (int)$stmt->fetchColumn() > 0;
        } catch (\Throwable $e) {
            return false;
        }
    }

    /** app_user의 plan + subscription_expires_at 즉시 적용 */
    private static function applyPlanToUser(
        \PDO   $pdo,
        int    $userId,
        string $email,
        string $plan,
        string $expiresAt
    ): void {
        try {
            // subscription_expires_at 컬럼이 있는 경우
            $pdo->prepare(
                "UPDATE app_user SET plan = ?, plans = ?, subscription_expires_at = ?
                  WHERE id = ? OR email = ?"
            )->execute([$plan, $plan, $expiresAt, $userId, $email]);
        } catch (\Throwable $e) {
            // 컬럼 없는 경우 폴백
            try {
                $pdo->prepare(
                    "UPDATE app_user SET plan = ? WHERE id = ? OR email = ?"
                )->execute([$plan, $userId, $email]);
            } catch (\Throwable $e2) {
                error_log('[CouponEngine] applyPlanToUser failed: ' . $e2->getMessage());
            }
        }
    }
}
