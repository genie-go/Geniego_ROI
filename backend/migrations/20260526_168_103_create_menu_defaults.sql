-- 168차 N-152-F F2/F3 = T3 spec
-- 출처: T3_BACKEND_API_REQUEST.md §2.3 menu_defaults
-- super_admin 의 default 복원용 snapshot 저장

CREATE TABLE IF NOT EXISTS menu_defaults (
  id              VARCHAR(255) PRIMARY KEY,
  snapshot_data   JSON NOT NULL,
  version         VARCHAR(32) NOT NULL,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_menu_defaults_version (version, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- @rollback
DROP TABLE IF EXISTS menu_defaults;
-- @end-rollback
