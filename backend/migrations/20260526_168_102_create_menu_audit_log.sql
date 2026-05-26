-- 168차 N-152-F F2/F3 = T3 spec
-- 출처: T3_BACKEND_API_REQUEST.md §2.2 menu_audit_log
-- N-152-A 은행급 baseline — append-only, hash_chain (tamper-evident)
-- application 차원 UPDATE/DELETE 거부 (AdminMenu Handler 에서)

CREATE TABLE IF NOT EXISTS menu_audit_log (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  menu_id         VARCHAR(255) NOT NULL,
  action          ENUM('visibility_change','plan_change','role_change',
                       'order_change','reset','create','delete') NOT NULL,
  old_value       JSON DEFAULT NULL,
  new_value       JSON DEFAULT NULL,
  changed_by      VARCHAR(255) NOT NULL,
  changed_by_role VARCHAR(32) NOT NULL,
  reason          TEXT DEFAULT NULL,
  ip_address      VARCHAR(45) DEFAULT NULL,
  user_agent      VARCHAR(500) DEFAULT NULL,
  request_id      VARCHAR(64) DEFAULT NULL,
  hash_chain      CHAR(64) DEFAULT NULL,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_audit_menu (menu_id),
  KEY idx_audit_user (changed_by),
  KEY idx_audit_time (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- @rollback
DROP TABLE IF EXISTS menu_audit_log;
-- @end-rollback
