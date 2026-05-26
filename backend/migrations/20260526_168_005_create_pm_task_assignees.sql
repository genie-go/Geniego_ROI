-- 168차 N-152-F PM-Core spec: docs/spec/n152f_pm_features_spec.md §2.2.5
-- PM Task Assignees — task ↔ user N:N

CREATE TABLE IF NOT EXISTS pm_task_assignees (
  id          VARCHAR(64) PRIMARY KEY,
  tenant_id   VARCHAR(64) NOT NULL,
  task_id     VARCHAR(64) NOT NULL,
  user_id     VARCHAR(64) NOT NULL,
  role        ENUM('owner','contributor','reviewer','observer') NOT NULL DEFAULT 'contributor',
  assigned_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_pm_assign (tenant_id, task_id, user_id),
  KEY idx_pm_assign_user (user_id),
  KEY idx_pm_assign_task (task_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- @rollback
DROP TABLE IF EXISTS pm_task_assignees;
-- @end-rollback
