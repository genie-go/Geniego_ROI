-- 172차 P0-C: 쿠폰 시스템 활성화 (CouponEngine 의존 테이블)
-- coupon_rules 는 CouponEngine 가 자동 생성 (이미 운영에 존재).
-- free_coupons + coupon_redemptions 는 본 migration 으로 추가.

CREATE TABLE IF NOT EXISTS free_coupons (
  id                   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code                 VARCHAR(64) NOT NULL UNIQUE,
  plan                 VARCHAR(30) NOT NULL DEFAULT 'starter',
  duration_days        INT NOT NULL DEFAULT 7,
  max_uses             INT NOT NULL DEFAULT 1,
  use_count            INT NOT NULL DEFAULT 0,
  issued_to_user_id    INT UNSIGNED DEFAULT NULL,
  issued_to_email      VARCHAR(255) DEFAULT NULL,
  note                 VARCHAR(255) DEFAULT NULL,
  issued_by            INT UNSIGNED DEFAULT NULL,
  is_revoked           TINYINT(1) NOT NULL DEFAULT 0,
  redeemed_at          DATETIME DEFAULT NULL,
  redeemed_by_user_id  INT UNSIGNED DEFAULT NULL,
  created_at           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_free_coupons_code (code),
  KEY idx_free_coupons_user (issued_to_user_id),
  KEY idx_free_coupons_email (issued_to_email),
  KEY idx_free_coupons_revoked (is_revoked, redeemed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS coupon_redemptions (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  coupon_id   INT UNSIGNED NOT NULL,
  user_id     INT UNSIGNED NOT NULL,
  plan        VARCHAR(30) NOT NULL,
  expires_at  DATETIME NOT NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_coupon_user (coupon_id, user_id),
  KEY idx_coupon_redemptions_user (user_id),
  KEY idx_coupon_redemptions_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
