-- GENIE_ROI V280 schema (simplified)
CREATE TABLE IF NOT EXISTS tenants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS policies (
  tenant_id TEXT NOT NULL,
  version INT NOT NULL,
  policy_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, version)
);

CREATE TABLE IF NOT EXISTS approvals (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  action_type TEXT NOT NULL,
  status TEXT NOT NULL, -- PENDING/APPROVED/REJECTED
  requested_by TEXT NOT NULL,
  approved_by TEXT,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  decided_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS executions (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  approval_id TEXT,
  idempotency_key TEXT NOT NULL,
  channel TEXT NOT NULL,      -- ads/email/crm/journey
  action_type TEXT NOT NULL,  -- e.g. BUDGET_UPDATE, EMAIL_SEND
  status TEXT NOT NULL,       -- CREATED/QUEUED/RUNNING/SUCCEEDED/FAILED/ROLLED_BACK
  request_json JSONB NOT NULL,
  result_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS executions_idem_uq ON executions(tenant_id, idempotency_key);

CREATE TABLE IF NOT EXISTS outbox (
  id BIGSERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  execution_id TEXT NOT NULL,
  payload_json JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING', -- PENDING/PROCESSING/DONE/DEAD
  attempts INT NOT NULL DEFAULT 0,
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_events (
  id BIGSERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  execution_id TEXT,
  event_type TEXT NOT NULL,
  event_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Marketing automation
CREATE TABLE IF NOT EXISTS contacts (
  tenant_id TEXT NOT NULL,
  contact_id TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  attrs JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, contact_id)
);

CREATE TABLE IF NOT EXISTS consent (
  tenant_id TEXT NOT NULL,
  contact_id TEXT NOT NULL,
  channel TEXT NOT NULL, -- email/sms/push
  status TEXT NOT NULL,  -- GRANTED/REVOKED
  source TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, contact_id, channel)
);

CREATE TABLE IF NOT EXISTS templates (
  tenant_id TEXT NOT NULL,
  template_id TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, template_id)
);

CREATE TABLE IF NOT EXISTS journeys (
  tenant_id TEXT NOT NULL,
  journey_id TEXT NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL, -- DRAFT/ACTIVE/PAUSED
  definition_json JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, journey_id)
);

CREATE TABLE IF NOT EXISTS enrollments (
  tenant_id TEXT NOT NULL,
  enrollment_id TEXT NOT NULL,
  journey_id TEXT NOT NULL,
  contact_id TEXT NOT NULL,
  step_index INT NOT NULL DEFAULT 0,
  next_run_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'ACTIVE', -- ACTIVE/DONE/STOPPED
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, enrollment_id)
);

-- Frequency caps: per contact per channel per day
CREATE TABLE IF NOT EXISTS frequency_caps (
  tenant_id TEXT NOT NULL,
  contact_id TEXT NOT NULL,
  channel TEXT NOT NULL, -- email/sms/push
  day DATE NOT NULL,
  count INT NOT NULL DEFAULT 0,
  PRIMARY KEY (tenant_id, contact_id, channel, day)
);
