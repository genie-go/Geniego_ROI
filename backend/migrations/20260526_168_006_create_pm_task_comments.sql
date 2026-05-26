-- 168차 N-152-F PM-Core spec: docs/spec/n152f_pm_features_spec.md §2.2.6
-- PM Task Comments

CREATE TABLE IF NOT EXISTS pm_task_comments (
  id           VARCHAR(64) PRIMARY KEY,
  tenant_id    VARCHAR(64) NOT NULL,
  task_id      VARCHAR(64) NOT NULL,
  author_id    VARCHAR(64) NOT NULL,
  body         TEXT NOT NULL,
  mentions_csv VARCHAR(500) DEFAULT NULL,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  edited_at    DATETIME DEFAULT NULL,
  KEY idx_pm_comment_task_created (task_id, created_at),
  KEY idx_pm_comment_tenant (tenant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- @rollback
DROP TABLE IF EXISTS pm_task_comments;
-- @end-rollback
