-- V266 additions: admin write APIs + experiment randomization/contamination control + extra connector objects
ALTER TABLE executions ADD COLUMN IF NOT EXISTS experiment_id TEXT;
ALTER TABLE executions ADD COLUMN IF NOT EXISTS variant TEXT;
ALTER TABLE executions ADD COLUMN IF NOT EXISTS unit_id TEXT;

CREATE INDEX IF NOT EXISTS idx_executions_experiment ON executions(experiment_id);

CREATE TABLE IF NOT EXISTS experiment_units (
  experiment_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  unit_id TEXT NOT NULL,
  variant TEXT NOT NULL, -- control/treatment
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY(experiment_id, tenant_id, unit_id)
);

-- Track admin changes (optional higher-level view; audit_log already exists)
CREATE TABLE IF NOT EXISTS admin_changes (
  id BIGSERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actor_id TEXT,
  action TEXT NOT NULL,
  target TEXT NOT NULL,
  detail JSONB
);
CREATE INDEX IF NOT EXISTS idx_admin_changes_tenant ON admin_changes(tenant_id, at);
