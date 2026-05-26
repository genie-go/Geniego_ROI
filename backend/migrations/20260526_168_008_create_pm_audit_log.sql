-- 168차 N-152-F PM-Core spec: docs/spec/n152f_pm_features_spec.md §2.2.8
-- PM Audit Log — append-only (9개 절대원칙 §4, N-152-A baseline)
-- application 차원 UPDATE/DELETE 거부 (PM/Audit handler 에서)

CREATE TABLE IF NOT EXISTS pm_audit_log (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tenant_id     VARCHAR(64) NOT NULL,
  actor_user_id VARCHAR(64) DEFAULT NULL,
  actor_api_key VARCHAR(64) DEFAULT NULL,
  entity_type   ENUM('project','task','milestone','dependency','assignee','comment','attachment') NOT NULL,
  entity_id     VARCHAR(64) NOT NULL,
  action        ENUM('create','update','delete','restore','status_change','assign','unassign') NOT NULL,
  diff_json     JSON DEFAULT NULL,
  ip_addr       VARCHAR(45) DEFAULT NULL,
  user_agent    VARCHAR(500) DEFAULT NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_pm_audit_tenant_time (tenant_id, created_at),
  KEY idx_pm_audit_entity (entity_type, entity_id),
  KEY idx_pm_audit_actor (actor_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- @rollback
DROP TABLE IF EXISTS pm_audit_log;
-- @end-rollback
