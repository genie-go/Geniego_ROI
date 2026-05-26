-- 169차 사용자 발견 issue fix: admin 플랜별 구독요금 설정 페이지 신규
-- spec: 168차 N-152-F USD/Paddle 단일 정책 정합
--
-- plan_config 테이블 — admin 이 plan 정의를 편집·저장
-- /v423/paddle/plans 가 DB 우선 read → 없으면 hardcoded fallback

CREATE TABLE IF NOT EXISTS plan_config (
  plan_id           VARCHAR(64)  PRIMARY KEY,
  name              VARCHAR(128) NOT NULL,
  description       TEXT DEFAULT NULL,
  price_usd         DECIMAL(10,2) DEFAULT NULL,
  price_annual_usd  DECIMAL(10,2) DEFAULT NULL,
  price_id_monthly  VARCHAR(128) DEFAULT NULL,
  price_id_annual   VARCHAR(128) DEFAULT NULL,
  features_json     JSON DEFAULT NULL,
  limits_json       JSON DEFAULT NULL,
  display_order     INT NOT NULL DEFAULT 0,
  is_active         TINYINT(1) NOT NULL DEFAULT 1,
  is_custom_quote   TINYINT(1) NOT NULL DEFAULT 0,
  updated_by        VARCHAR(64) DEFAULT NULL,
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_plan_config_order (display_order),
  KEY idx_plan_config_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- @rollback
DROP TABLE IF EXISTS plan_config;
-- @end-rollback
