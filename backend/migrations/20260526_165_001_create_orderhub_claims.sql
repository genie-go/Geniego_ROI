-- 165차 spec: docs/spec/backend_orderhub_aggregator_165_v3.md §3.2
-- OrderHub claims aggregator table

CREATE TABLE IF NOT EXISTS orderhub_claims (
  id VARCHAR(64) PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL,
  order_id VARCHAR(64) NOT NULL,
  buyer VARCHAR(128) DEFAULT NULL,
  channel VARCHAR(32) DEFAULT NULL,
  type ENUM('return','cancel','exchange') NOT NULL DEFAULT 'return',
  reason VARCHAR(255) DEFAULT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  amount DECIMAL(14,2) DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_tenant (tenant_id),
  KEY idx_tenant_status (tenant_id, status),
  KEY idx_order (order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
