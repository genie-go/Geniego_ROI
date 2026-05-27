-- 171차 — plan_period_pricing 신규 테이블 (3/6/12개월 구독 옵션 + 기간별 할인율)
-- @session 171차 ; @author cc ; @date 2026-05-27
--
-- 사용자 요구: 구버전(168차 이전)에 회원가입 시 3/6/12개월 옵션 + 각 기간별 할인율 적용 기능 존재.
-- 현 버전(월/연 2가지)을 4-tier(1/3/6/12)로 확장 + 고도화.
--
-- 설계 결정 (plan_config 컬럼 확장 vs 별도 테이블):
--   plan_period_pricing 별도 테이블 선택 이유:
--     - 확장성 (24개월 추가 쉬움)
--     - plan_config 컬럼 폭증 회피 (현재 15컬럼, 추가 시 30+)
--     - 각 기간별 Paddle priceId 별도 저장 (실제 결제 시 매핑)
--     - discount_pct 를 기간별로 분리 (3m=5%, 6m=10%, 12m=20% 가 표준)
--
-- 자동 산출 정책:
--   price_per_month (월 환산) = base_monthly × (1 - discount_pct/100)
--   total_charge = price_per_month × period_months
--   savings = base_monthly × period_months − total_charge
--
-- 결제 통화 USD 고정 (168차 USD/Paddle 정책 정합 — Paddle MoR).

CREATE TABLE IF NOT EXISTS plan_period_pricing (
  plan_id          VARCHAR(64)  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'plan_config 의 plan_id 참조 (app-level 무결성)',
  period_months    TINYINT UNSIGNED NOT NULL COMMENT '1, 3, 6, 12 (개월)',
  price_usd        DECIMAL(10,2) NULL COMMENT '월 환산 USD 가격 (custom_quote 시 NULL)',
  discount_pct     TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '할인율 (기간별, admin 자유 설정)',
  paddle_price_id  VARCHAR(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL COMMENT 'Paddle dashboard 의 priceId',
  is_active        TINYINT(1)   NOT NULL DEFAULT 1,
  display_order    INT          NOT NULL DEFAULT 0,
  created_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  updated_by       VARCHAR(64)  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  PRIMARY KEY (plan_id, period_months),
  INDEX idx_active (is_active, display_order)
  -- FK 제거: plan_config 는 soft delete (is_active=0) 만 사용 → app-level 무결성으로 충분.
  -- FK 사용 시 collation 불일치 risk + cascade 동작 복잡성.
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='기간별 구독 가격 (1/3/6/12개월, admin 자유 설정)';

-- starter 4-tier seed
INSERT INTO plan_period_pricing (plan_id, period_months, price_usd, discount_pct, display_order, updated_by) VALUES
('starter',  1, 49.00,  0, 10, '171_cc_seed'),
('starter',  3, 46.55,  5, 20, '171_cc_seed'),  -- 49 × 0.95
('starter',  6, 44.10, 10, 30, '171_cc_seed'),  -- 49 × 0.90
('starter', 12, 39.20, 20, 40, '171_cc_seed');  -- 49 × 0.80  (SEED_PLANS 정합 ≈ $39)

-- pro 4-tier seed
INSERT INTO plan_period_pricing (plan_id, period_months, price_usd, discount_pct, display_order, updated_by) VALUES
('pro',  1, 149.00,  0, 10, '171_cc_seed'),
('pro',  3, 141.55,  5, 20, '171_cc_seed'),  -- 149 × 0.95
('pro',  6, 134.10, 10, 30, '171_cc_seed'),  -- 149 × 0.90
('pro', 12, 119.20, 20, 40, '171_cc_seed');  -- 149 × 0.80  (SEED_PLANS 정합 ≈ $119)

-- enterprise = custom_quote, 가격 NULL (admin 직접 입력 또는 영업 협의)
INSERT INTO plan_period_pricing (plan_id, period_months, price_usd, discount_pct, display_order, updated_by) VALUES
('enterprise',  1, NULL,  0, 10, '171_cc_seed'),
('enterprise',  3, NULL,  5, 20, '171_cc_seed'),
('enterprise',  6, NULL, 10, 30, '171_cc_seed'),
('enterprise', 12, NULL, 20, 40, '171_cc_seed');

-- app_user 에 subscription_period_months 컬럼 추가 (가입 시 선택한 구독 기간 저장)
-- 이미 subscription_cycle 컬럼이 있을 수 있으므로 IF NOT EXISTS 패턴 시뮬레이션
-- (MySQL 8+ ALTER TABLE IF NOT EXISTS 미지원, 별도 procedure 또는 try/catch 필요)

-- 검증 쿼리:
-- SELECT plan_id, period_months, price_usd, discount_pct,
--        ROUND(price_usd * period_months, 2) AS total_charge_usd,
--        paddle_price_id
-- FROM plan_period_pricing
-- ORDER BY plan_id, period_months;
-- 예상: starter (49.00/1m, 46.55/3m=139.65 total, 44.10/6m=264.60 total, 39.20/12m=470.40 total)
