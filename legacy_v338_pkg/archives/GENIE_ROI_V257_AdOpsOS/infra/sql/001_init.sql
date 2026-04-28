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

CREATE INDEX IF NOT EXISTS idx_outbox_next_attempt ON outbox(next_attempt_at) WHERE status='PENDING';
