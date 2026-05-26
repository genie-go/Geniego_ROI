-- 168차 N-152-F PM-Core spec: docs/spec/n152f_pm_features_spec.md §2.2.1
-- PM Project — 프로젝트 컨테이너

CREATE TABLE IF NOT EXISTS pm_projects (
  id              VARCHAR(64) PRIMARY KEY,
  tenant_id       VARCHAR(64) NOT NULL,
  name            VARCHAR(255) NOT NULL,
  description     TEXT DEFAULT NULL,
  status          ENUM('planning','active','on_hold','completed','archived') NOT NULL DEFAULT 'planning',
  start_date      DATE DEFAULT NULL,
  target_date     DATE DEFAULT NULL,
  completed_at    DATETIME DEFAULT NULL,
  owner_user_id   VARCHAR(64) DEFAULT NULL,
  budget_amount   DECIMAL(14,2) DEFAULT NULL,
  budget_currency VARCHAR(8) DEFAULT 'KRW',
  metadata_json   JSON DEFAULT NULL,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_pm_proj_tenant (tenant_id),
  KEY idx_pm_proj_tenant_status (tenant_id, status),
  KEY idx_pm_proj_owner (owner_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- @rollback
DROP TABLE IF EXISTS pm_projects;
-- @end-rollback
