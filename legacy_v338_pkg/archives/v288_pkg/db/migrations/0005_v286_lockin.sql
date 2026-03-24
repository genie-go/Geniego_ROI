-- V286 "Lock-in" upgrade: template rendering/personalization, email campaigns with A/B + holdout, advanced connector roadmap fields
-- Generated: 2026-02-25

-- Template versions (audit + rollback)
CREATE TABLE IF NOT EXISTS template_versions (
  tenant_id TEXT NOT NULL,
  template_id TEXT NOT NULL,
  version INT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, template_id, version)
);

-- Email campaigns and deliveries (closed-loop tracking)
CREATE TABLE IF NOT EXISTS email_campaigns (
  tenant_id TEXT NOT NULL,
  campaign_id TEXT NOT NULL,
  name TEXT NOT NULL,
  segment_id TEXT NOT NULL,
  experiment_id TEXT,
  from_email TEXT,
  reply_to TEXT,
  status TEXT NOT NULL DEFAULT 'DRAFT',
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  PRIMARY KEY (tenant_id, campaign_id)
);

CREATE TABLE IF NOT EXISTS email_deliveries (
  tenant_id TEXT NOT NULL,
  campaign_id TEXT NOT NULL,
  contact_id TEXT NOT NULL,
  assignment TEXT NOT NULL, -- 'A','B','HOLDOUT'
  template_id TEXT NOT NULL,
  execution_id TEXT,
  provider_message_id TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING', -- PENDING,SENT,FAILED,SKIPPED
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, campaign_id, contact_id)
);

CREATE INDEX IF NOT EXISTS idx_email_deliveries_campaign_status
  ON email_deliveries (tenant_id, campaign_id, status);

-- Connector provider metadata (priority, roadmap)
ALTER TABLE connector_accounts
  ADD COLUMN IF NOT EXISTS priority INT NOT NULL DEFAULT 50;

ALTER TABLE connector_accounts
  ADD COLUMN IF NOT EXISTS notes TEXT;

