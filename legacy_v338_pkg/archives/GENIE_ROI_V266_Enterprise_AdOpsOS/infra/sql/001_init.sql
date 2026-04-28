CREATE TABLE IF NOT EXISTS executions (
  execution_id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  objective TEXT NOT NULL,
  channels JSONB NOT NULL,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL,
  dry_run BOOLEAN NOT NULL,
  shadow_mode BOOLEAN NOT NULL DEFAULT TRUE,
  confidence DOUBLE PRECISION,
  recommendation JSONB,
  approval JSONB,
  last_error TEXT
);

CREATE TABLE IF NOT EXISTS audit_log (
  id BIGSERIAL PRIMARY KEY,
  execution_id TEXT NOT NULL,
  at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actor_id TEXT,
  action TEXT NOT NULL,
  detail JSONB
);

CREATE TABLE IF NOT EXISTS outbox (
  id BIGSERIAL PRIMARY KEY,
  execution_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  attempts INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'PENDING',
  payload JSONB NOT NULL,
  last_error TEXT
);

CREATE TABLE IF NOT EXISTS shadow_events (
  id BIGSERIAL PRIMARY KEY,
  execution_id TEXT NOT NULL,
  at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  channel TEXT NOT NULL,
  metric JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS connector_snapshots (
  id BIGSERIAL PRIMARY KEY,
  execution_id TEXT NOT NULL,
  channel TEXT NOT NULL,
  at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  snapshot JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_outbox_next_attempt ON outbox(next_attempt_at) WHERE status='PENDING';
CREATE INDEX IF NOT EXISTS idx_shadow_exec ON shadow_events(execution_id);
CREATE INDEX IF NOT EXISTS idx_snap_exec ON connector_snapshots(execution_id);


-- V163: Enterprise multi-tenancy / governance tables
CREATE TABLE IF NOT EXISTS tenants (
  tenant_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS api_keys (
  api_key_hash TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'viewer',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  label TEXT
);
CREATE INDEX IF NOT EXISTS idx_api_keys_tenant ON api_keys(tenant_id);

CREATE TABLE IF NOT EXISTS tenant_policies (
  tenant_id TEXT PRIMARY KEY,
  policy JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tenant_quotas (
  tenant_id TEXT PRIMARY KEY,
  daily_exec_limit INT NOT NULL,
  per_minute_limit INT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Experiment framework (shadow uplift → experiments/guardrails/autostop)
CREATE TABLE IF NOT EXISTS experiments (
  experiment_id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  objective TEXT NOT NULL,
  channels JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'RUNNING',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  stopped_at TIMESTAMPTZ,
  stop_reason TEXT
);
CREATE INDEX IF NOT EXISTS idx_experiments_tenant ON experiments(tenant_id);

CREATE TABLE IF NOT EXISTS experiment_guardrails (
  experiment_id TEXT PRIMARY KEY,
  max_daily_spend DOUBLE PRECISION NOT NULL DEFAULT 0,
  max_negative_uplift_pct DOUBLE PRECISION NOT NULL DEFAULT -10,
  min_confidence DOUBLE PRECISION NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS incidents (
  id BIGSERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  execution_id TEXT,
  experiment_id TEXT,
  at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  severity TEXT NOT NULL,
  kind TEXT NOT NULL,
  detail JSONB
);
CREATE INDEX IF NOT EXISTS idx_incidents_tenant ON incidents(tenant_id);
