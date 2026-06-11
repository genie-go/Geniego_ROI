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
        string $currentPlan = 'free',
        string $planOverride = ''
    ): ?array {
        try {
            // 1. coupon_rules 테이블에서 활성 규칙 조회
            $rule = self::getActiveRule($pdo, $trigger);
            if (!$rule) return null;   // 해당 트리거 규칙 없음 or 비활성

            // 2. upgrade 트리거의 경우 이미 유료 플랜이라면 skip
            //    (signup은 항상 발급 — demo/free 대상. renewal 은 유료 갱신이므로 skip 안 함)
            if ($trigger === 'upgrade') {
                if (!in_array($currentPlan, ['free','demo'], true)) {
                    // 이미 유료 → 쿠폰 스킵
                    return null;
                }
            }

            // 3. 이미 해당 트리거로 발급된 쿠폰이 있는지 확인 (중복 방지).
            //    212차 #5: renewal 은 연 1회(yearly) 갱신 보너스이므로 300일 윈도우(재발급 허용),
            //    signup/upgrade 는 1회 한정(0=영구 dedup).
            $dedupWindow = ($trigger === 'renewal') ? 300 : 0;
            if (self::alreadyIssued($pdo, $userId, $trigger, $dedupWindow)) {
                return null;
            }

            // 4. 쿠폰 코드 생성
            $code         = 'GENIE-AUTO-' . strtoupper(bin2hex(random_bytes(4)));
            // 212차 #5: planOverride 가 있으면 "사용자가 가입/구독한 해당 플랜" 3개월 무료로 발급.
            $plan         = ($planOverride !== '') ? $planOverride : $rule['plan'];
            $durationDays = (int)$rule['duration_days'];
            $note         = "[auto:{$trigger}] " . ($rule['note'] ?? '');

            // 4.5 현재 사용자 플랜·만료일 조회 — 연장(extend) + 다운그레이드 방지
            //     (갱신/전환 보너스 쿠폰이 기존 유료 구독을 단축·강등하지 않도록)
            $curPlan = $currentPlan; $curExpiry = null;
            try {
                $u = $pdo->prepare('SELECT plan, subscription_expires_at FROM app_user WHERE id = ? LIMIT 1');
                $u->execute([$userId]);
                if ($urow = $u->fetch(\PDO::FETCH_ASSOC)) {
                    if (!empty($urow['plan'])) $curPlan = (string)$urow['plan'];
                    $curExpiry = $urow['subscription_expires_at'] ?? null;
                }
            } catch (\Throwable $e) { /* 컬럼 부재 등 → 전달된 currentPlan 사용 */ }
            // 만료일: 현재 만료일(미래)·now 중 더 늦은 시점 + duration → 항상 연장(단축 X)
            $baseTs = ($curExpiry && strtotime((string)$curExpiry) > time()) ? strtotime((string)$curExpiry) : time();
            // 적용 플랜: 룰 플랜 vs 현재 플랜 중 상위 — 보너스가 등급을 떨어뜨리지 않도록
            $effectivePlan = (PlanPolicy::rank($plan) >= PlanPolicy::rank($curPlan)) ? $plan : $curPlan;

            // 5. free_coupons에 INSERT (이미 사용됨 상태로)
            $now      = gmdate('Y-m-d H:i:s');
            $driver   = $pdo->getAttribute(\PDO::ATTR_DRIVER_NAME);
            $expiresAt = gmdate('Y-m-d H:i:s', $baseTs + $durationDays * 86400);

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
                    ")->execute([$couponId, $userId, $effectivePlan, $expiresAt]);
                } else {
                    $pdo->prepare("
                        INSERT OR IGNORE INTO coupon_redemptions
                            (coupon_id, user_id, plan, expires_at, created_at)
                        VALUES (?,?,?,?,datetime('now'))
                    ")->execute([$couponId, $userId, $effectivePlan, $expiresAt]);
                }
            } catch (\Throwable $e) {
                error_log('[CouponEngine] redemptions insert: ' . $e->getMessage());
            }

            // 7. app_user 플랜 즉시 업데이트 (다운그레이드 방지된 effectivePlan)
            self::applyPlanToUser($pdo, $userId, $email, $effectivePlan, $expiresAt);

            return [
                'ok'           => true,
                'code'         => $code,
                'plan'         => $effectivePlan,
                'coupon_plan'  => $plan,
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
                    ('upgrade',1,'pro',90,'유료플랜 가입 3개월 무료'),
                    ('renewal',1,'pro',90,'연간 구독 갱신 3개월 무료')");
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
                    ('upgrade',1,'pro',90,'유료플랜 가입 3개월 무료'),
                    ('renewal',1,'pro',90,'연간 구독 갱신 3개월 무료')");
            }
        } catch (\Throwable $e) {
            error_log('[CouponEngine] table init: ' . $e->getMessage());
        }
        // 212차 #5: free_coupons / coupon_redemptions 자동 보장(데모 등 미마이그레이션 DB 대응) — fire() 자급자족.
        try {
            if ($driver === 'mysql') {
                $pdo->exec("CREATE TABLE IF NOT EXISTS free_coupons (id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, code VARCHAR(50) NOT NULL UNIQUE, plan VARCHAR(30) NOT NULL DEFAULT 'starter', duration_days INT NOT NULL DEFAULT 30, max_uses INT NOT NULL DEFAULT 1, use_count INT NOT NULL DEFAULT 0, issued_to_user_id BIGINT UNSIGNED NULL, issued_to_email VARCHAR(255) NULL, issued_by BIGINT UNSIGNED NOT NULL DEFAULT 0, note TEXT NULL, is_revoked TINYINT(1) NOT NULL DEFAULT 0, redeemed_at DATETIME NULL, redeemed_by_user_id BIGINT UNSIGNED NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
                $pdo->exec("CREATE TABLE IF NOT EXISTS coupon_redemptions (id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, coupon_id BIGINT UNSIGNED NOT NULL, user_id BIGINT UNSIGNED NOT NULL, plan VARCHAR(30) NOT NULL, expires_at DATETIME NOT NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE KEY uq_coupon_user (coupon_id, user_id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
            } else {
                $pdo->exec("CREATE TABLE IF NOT EXISTS free_coupons (id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT NOT NULL UNIQUE, plan TEXT NOT NULL DEFAULT 'starter', duration_days INTEGER NOT NULL DEFAULT 30, max_uses INTEGER NOT NULL DEFAULT 1, use_count INTEGER NOT NULL DEFAULT 0, issued_to_user_id INTEGER NULL, issued_to_email TEXT NULL, issued_by INTEGER NOT NULL DEFAULT 0, note TEXT NULL, is_revoked INTEGER NOT NULL DEFAULT 0, redeemed_at TEXT NULL, redeemed_by_user_id INTEGER NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')))");
                $pdo->exec("CREATE TABLE IF NOT EXISTS coupon_redemptions (id INTEGER PRIMARY KEY AUTOINCREMENT, coupon_id INTEGER NOT NULL, user_id INTEGER NOT NULL, plan TEXT NOT NULL, expires_at TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')), UNIQUE(coupon_id, user_id))");
            }
        } catch (\Throwable $e) {
            error_log('[CouponEngine] coupon table init: ' . $e->getMessage());
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

    /** 같은 트리거로 이미 발급받은 쿠폰이 있는지 확인. $withinDays>0 이면 그 기간 내 발급분만 중복으로 간주(연 1회 갱신 보너스용). */
    private static function alreadyIssued(\PDO $pdo, int $userId, string $trigger, int $withinDays = 0): bool
    {
        try {
            if ($withinDays > 0) {
                $since = gmdate('Y-m-d H:i:s', time() - $withinDays * 86400);
                $stmt = $pdo->prepare(
                    "SELECT COUNT(*) FROM free_coupons WHERE issued_to_user_id = ? AND note LIKE ? AND created_at >= ? LIMIT 1"
                );
                $stmt->execute([$userId, "[auto:{$trigger}]%", $since]);
            } else {
                $stmt = $pdo->prepare(
                    "SELECT COUNT(*) FROM free_coupons WHERE issued_to_user_id = ? AND note LIKE ? LIMIT 1"
                );
                $stmt->execute([$userId, "[auto:{$trigger}]%"]);
            }
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
