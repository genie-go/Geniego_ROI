-- 168차 N-152-F PM-Core spec: docs/spec/n152f_pm_features_spec.md §2.2.7
-- PM Attachments — SHA-256 + storage_key (서명 URL 패턴)

CREATE TABLE IF NOT EXISTS pm_attachments (
  id          VARCHAR(64) PRIMARY KEY,
  tenant_id   VARCHAR(64) NOT NULL,
  task_id     VARCHAR(64) DEFAULT NULL,
  comment_id  VARCHAR(64) DEFAULT NULL,
  filename    VARCHAR(255) NOT NULL,
  mime_type   VARCHAR(128) DEFAULT NULL,
  size_bytes  BIGINT UNSIGNED NOT NULL,
  sha256_hex  CHAR(64) NOT NULL,
  storage_key VARCHAR(500) NOT NULL,
  uploaded_by VARCHAR(64) DEFAULT NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_pm_att_task (task_id),
  KEY idx_pm_att_sha (sha256_hex),
  KEY idx_pm_att_tenant (tenant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- @rollback
DROP TABLE IF EXISTS pm_attachments;
-- @end-rollback
