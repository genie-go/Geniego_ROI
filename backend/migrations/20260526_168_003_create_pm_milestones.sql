-- 168차 N-152-F PM-Core spec: docs/spec/n152f_pm_features_spec.md §2.2.3
-- PM Milestone — 프로젝트별 마일스톤

CREATE TABLE IF NOT EXISTS pm_milestones (
  id                  VARCHAR(64) PRIMARY KEY,
  tenant_id           VARCHAR(64) NOT NULL,
  project_id          VARCHAR(64) NOT NULL,
  title               VARCHAR(255) NOT NULL,
  description         TEXT DEFAULT NULL,
  target_date         DATE NOT NULL,
  achieved_at         DATETIME DEFAULT NULL,
  status              ENUM('upcoming','in_progress','achieved','missed','cancelled') NOT NULL DEFAULT 'upcoming',
  completion_criteria TEXT DEFAULT NULL,
  position_idx        INT NOT NULL DEFAULT 0,
  created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_pm_ms_tenant_project (tenant_id, project_id),
  KEY idx_pm_ms_tenant_target (tenant_id, target_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- @rollback
DROP TABLE IF EXISTS pm_milestones;
-- @end-rollback
