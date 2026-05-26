-- 169차 P4 사용자 발견 issue: 플랜별 메뉴 접근 권한 매트릭스
-- spec: backup SubscriptionPricing.jsx 의 menuData[menu_key][plan_enabled] 구조 정합
--
-- plan_menu_access (plan_id × menu_key) — 한 menu 가 여러 plan 에 동시 enabled
-- enabled=1 인 plan 의 user 만 sidebar 에서 해당 menu 노출

CREATE TABLE IF NOT EXISTS plan_menu_access (
  plan_id      VARCHAR(64)  NOT NULL,
  menu_key     VARCHAR(255) NOT NULL,
  enabled      TINYINT(1)   NOT NULL DEFAULT 1,
  updated_by   VARCHAR(64) DEFAULT NULL,
  updated_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (plan_id, menu_key),
  KEY idx_plan_menu_access_menu (menu_key),
  KEY idx_plan_menu_access_plan (plan_id, enabled)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- @rollback
DROP TABLE IF EXISTS plan_menu_access;
-- @end-rollback
