-- 168차 N-152-F PM-Core spec: docs/spec/n152f_pm_features_spec.md §2.2.2
-- PM Task — 위계 self-ref

CREATE TABLE IF NOT EXISTS pm_tasks (
  id              VARCHAR(64) PRIMARY KEY,
  tenant_id       VARCHAR(64) NOT NULL,
  project_id      VARCHAR(64) NOT NULL,
  parent_task_id  VARCHAR(64) DEFAULT NULL,
  title           VARCHAR(500) NOT NULL,
  description     TEXT DEFAULT NULL,
  status          ENUM('todo','in_progress','review','done','blocked','cancelled') NOT NULL DEFAULT 'todo',
  priority        ENUM('low','normal','high','urgent') NOT NULL DEFAULT 'normal',
  progress_pct    TINYINT UNSIGNED NOT NULL DEFAULT 0,
  start_date      DATE DEFAULT NULL,
  due_date        DATE DEFAULT NULL,
  estimate_hours  DECIMAL(8,2) DEFAULT NULL,
  actual_hours    DECIMAL(8,2) DEFAULT NULL,
  milestone_id    VARCHAR(64) DEFAULT NULL,
  labels_csv      VARCHAR(500) DEFAULT NULL,
  position_idx    INT NOT NULL DEFAULT 0,
  archived_at     DATETIME DEFAULT NULL,
  created_by      VARCHAR(64) DEFAULT NULL,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_pm_task_tenant_project (tenant_id, project_id),
  KEY idx_pm_task_tenant_status (tenant_id, status),
  KEY idx_pm_task_project_parent (project_id, parent_task_id),
  KEY idx_pm_task_milestone (milestone_id),
  KEY idx_pm_task_due (tenant_id, due_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- @rollback
DROP TABLE IF EXISTS pm_tasks;
-- @end-rollback
