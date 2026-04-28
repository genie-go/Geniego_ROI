-- V285 growth & UX upgrade: segments, events, connector accounts, message experiments, journey engine state
-- Generated: 2026-02-25

-- Segments (dynamic definitions evaluated against contacts + events)
CREATE TABLE IF NOT EXISTS segments (
  tenant_id TEXT NOT NULL,
  segment_id TEXT NOT NULL,
  name TEXT NOT NULL,
  definition_json JSONB NOT NULL,
  is_dynamic BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, segment_id)
);

CREATE TABLE IF NOT EXISTS segment_members (
  tenant_id TEXT NOT NULL,
  segment_id TEXT NOT NULL,
  contact_id TEXT NOT NULL,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, segment_id, contact_id)
);

-- Event stream (for real-time segmentation + journey triggers)
CREATE TABLE IF NOT EXISTS events (
  tenant_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  contact_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  properties JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL,
  ingested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, event_id)
);

CREATE INDEX IF NOT EXISTS idx_events_tenant_contact_time
  ON events (tenant_id, contact_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_events_tenant_type_time
  ON events (tenant_id, event_type, occurred_at DESC);

-- Connector accounts (enterprise: manage credentials/status per tenant/provider)
CREATE TABLE IF NOT EXISTS connector_accounts (
  tenant_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  account_id TEXT NOT NULL,
  config_json JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  last_sync_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, provider, account_id)
);

-- Message experiments (A/B, holdout; for email/sms/push)
CREATE TABLE IF NOT EXISTS message_experiments (
  tenant_id TEXT NOT NULL,
  experiment_id TEXT NOT NULL,
  name TEXT NOT NULL,
  channel TEXT NOT NULL, -- email|sms|push|ads
  status TEXT NOT NULL DEFAULT 'DRAFT', -- DRAFT|RUNNING|PAUSED|STOPPED
  holdout_pct INT NOT NULL DEFAULT 0, -- 0..100
  variants_json JSONB NOT NULL, -- [{id, name, template_id, weight, meta}]
  policy_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, experiment_id)
);

CREATE TABLE IF NOT EXISTS message_assignments (
  tenant_id TEXT NOT NULL,
  experiment_id TEXT NOT NULL,
  contact_id TEXT NOT NULL,
  assignment TEXT NOT NULL, -- HOLDOUT or VARIANT:<id>
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, experiment_id, contact_id)
);

-- Journey engine: richer state + idempotent re-entry protection
ALTER TABLE IF EXISTS enrollments
  ADD COLUMN IF NOT EXISTS current_step_id TEXT NULL,
  ADD COLUMN IF NOT EXISTS state_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS reentry_key TEXT NULL,
  ADD COLUMN IF NOT EXISTS last_event_at TIMESTAMPTZ NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_enrollments_reentry
  ON enrollments (tenant_id, journey_id, reentry_key)
  WHERE reentry_key IS NOT NULL;


-- Journey steps: branching + conditions (backwards compatible)
ALTER TABLE IF EXISTS journey_steps
  ADD COLUMN IF NOT EXISTS next_step_order INT NULL,
  ADD COLUMN IF NOT EXISTS branch_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS idempotency_key_template TEXT NULL;
