-- 165차 spec: docs/spec/backend_orderhub_aggregator_165_v3.md §3.3
-- OrderHub settlements aggregator table

CREATE TABLE IF NOT EXISTS orderhub_settlements (
  id VARCHAR(64) PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL,
  period VARCHAR(7) NOT NULL,
  channel VARCHAR(32) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  gross_sales DECIMAL(14,2) DEFAULT 0,
  net_payout DECIMAL(14,2) DEFAULT 0,
  platform_fee DECIMAL(14,2) DEFAULT 0,
  ad_fee DECIMAL(14,2) DEFAULT 0,
  coupon_discount DECIMAL(14,2) DEFAULT 0,
  return_fee DECIMAL(14,2) DEFAULT 0,
  orders_count INT DEFAULT 0,
  returns_count INT DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_tenant (tenant_id),
  KEY idx_tenant_period (tenant_id, period),
  UNIQUE KEY uniq_tenant_period_channel (tenant_id, period, channel)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- @rollback
DROP TABLE IF EXISTS orderhub_settlements;
-- @end-rollback
