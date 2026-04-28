-- V265 additions: commerce ingestion + sequential testing metadata
CREATE TABLE IF NOT EXISTS commerce_orders (
  id BIGSERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  source TEXT NOT NULL, -- shopify, qoo10, rakuten, coupang, etc
  order_id TEXT NOT NULL,
  order_ts TIMESTAMPTZ NOT NULL,
  currency TEXT,
  total_price DOUBLE PRECISION,
  raw JSONB NOT NULL,
  UNIQUE(tenant_id, source, order_id)
);

CREATE INDEX IF NOT EXISTS commerce_orders_tenant_ts_idx ON commerce_orders(tenant_id, order_ts);

CREATE TABLE IF NOT EXISTS commerce_daily_metrics (
  day DATE NOT NULL,
  tenant_id TEXT NOT NULL,
  source TEXT NOT NULL,
  orders_count BIGINT NOT NULL DEFAULT 0,
  revenue DOUBLE PRECISION NOT NULL DEFAULT 0,
  currency TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY(day, tenant_id, source)
);

-- Optional: store sequential test checkpoints per experiment
CREATE TABLE IF NOT EXISTS experiment_checkpoints (
  id BIGSERIAL PRIMARY KEY,
  experiment_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  ts TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metric TEXT NOT NULL,
  control_value DOUBLE PRECISION,
  treatment_value DOUBLE PRECISION,
  n_control BIGINT,
  n_treatment BIGINT,
  p_value DOUBLE PRECISION,
  decision TEXT, -- continue/stop_negative/stop_positive
  raw JSONB
);

CREATE INDEX IF NOT EXISTS experiment_checkpoints_exp_idx ON experiment_checkpoints(experiment_id, ts);
