-- V284 core upgrade: RBAC, multi-step approvals, policy pinning, journeys

-- 1) RBAC / API Keys
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  email TEXT NOT NULL,
  name TEXT,
  role TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS users_tenant_email_uq ON users(tenant_id, email);

CREATE TABLE IF NOT EXISTS api_keys (
  key_hash TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS api_keys_tenant_idx ON api_keys(tenant_id);

-- 2) Policy pinning and hash
ALTER TABLE policies ADD COLUMN IF NOT EXISTS policy_hash TEXT;

ALTER TABLE executions ADD COLUMN IF NOT EXISTS policy_version INT;
ALTER TABLE executions ADD COLUMN IF NOT EXISTS policy_hash TEXT;
ALTER TABLE executions ADD COLUMN IF NOT EXISTS requested_by_user_id TEXT;

-- 3) Multi-step approvals (best-effort; backward compatible)
ALTER TABLE approvals ADD COLUMN IF NOT EXISTS required_steps INT NOT NULL DEFAULT 1;
ALTER TABLE approvals ADD COLUMN IF NOT EXISTS current_step INT NOT NULL DEFAULT 0;
ALTER TABLE approvals ADD COLUMN IF NOT EXISTS approvers_json JSONB;
ALTER TABLE approvals ADD COLUMN IF NOT EXISTS decision_log JSONB;

-- 4) Journey execution tables
CREATE TABLE IF NOT EXISTS journey_steps (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  journey_id TEXT NOT NULL,
  step_order INT NOT NULL,
  step_type TEXT NOT NULL,           -- EMAIL_SEND / CRM_UPSERT_CONTACT / ADS_BUDGET_UPDATE ...
  provider TEXT,
  template_id TEXT,
  delay_minutes INT NOT NULL DEFAULT 0,
  payload_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS journey_steps_order_uq ON journey_steps(tenant_id, journey_id, step_order);

CREATE TABLE IF NOT EXISTS journey_jobs (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  enrollment_id TEXT NOT NULL,
  journey_id TEXT NOT NULL,
  step_id TEXT NOT NULL,
  due_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  last_error TEXT,
  attempts INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS journey_jobs_due_idx ON journey_jobs(status, due_at);

