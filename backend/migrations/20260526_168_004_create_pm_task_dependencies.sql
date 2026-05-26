-- 168차 N-152-F PM-Core spec: docs/spec/n152f_pm_features_spec.md §2.2.4
-- PM Task Dependencies — FS/SS/FF/SF (PMI 표준) + lag_days

CREATE TABLE IF NOT EXISTS pm_task_dependencies (
  id              VARCHAR(64) PRIMARY KEY,
  tenant_id       VARCHAR(64) NOT NULL,
  predecessor_id  VARCHAR(64) NOT NULL,
  successor_id    VARCHAR(64) NOT NULL,
  dep_type        ENUM('FS','SS','FF','SF') NOT NULL DEFAULT 'FS',
  lag_days        INT NOT NULL DEFAULT 0,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_pm_dep (tenant_id, predecessor_id, successor_id, dep_type),
  KEY idx_pm_dep_pred (predecessor_id),
  KEY idx_pm_dep_succ (successor_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- @rollback
DROP TABLE IF EXISTS pm_task_dependencies;
-- @end-rollback
