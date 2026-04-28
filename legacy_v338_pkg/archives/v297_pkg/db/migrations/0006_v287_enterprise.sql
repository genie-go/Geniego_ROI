-- V287 "Enterprise Lock-in" upgrade: live collector checkpoints, provider webhooks, message events, attribution links, event-triggered campaigns
-- Generated: 2026-02-26

CREATE TABLE IF NOT EXISTS collector_checkpoints (
  tenant_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  account_id TEXT NOT NULL,
  cursor TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, provider, account_id)
);

CREATE TABLE IF NOT EXISTS provider_webhook_events (
  tenant_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  event_id TEXT NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  payload_json JSONB NOT NULL,
  PRIMARY KEY (tenant_id, provider, event_id)
);

CREATE TABLE IF NOT EXISTS message_events (
  tenant_id TEXT NOT NULL,
  campaign_id TEXT NOT NULL,
  contact_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  message_id TEXT NOT NULL,
  event_type TEXT NOT NULL, -- DELIVERED, OPEN, CLICK, BOUNCE, COMPLAINT
  event_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  meta_json JSONB,
  PRIMARY KEY (tenant_id, provider, message_id, event_type, event_at)
);

-- Link conversions to marketing touchpoints (simple, extensible)
CREATE TABLE IF NOT EXISTS attribution_links (
  tenant_id TEXT NOT NULL,
  conversion_id TEXT NOT NULL,
  contact_id TEXT NOT NULL,
  campaign_id TEXT,
  experiment_id TEXT,
  touch_provider TEXT,
  touch_message_id TEXT,
  model TEXT NOT NULL DEFAULT 'last_touch',
  lookback_days INT NOT NULL DEFAULT 7,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, conversion_id)
);

-- Event-triggered campaigns (optional)
CREATE TABLE IF NOT EXISTS campaign_triggers (
  tenant_id TEXT NOT NULL,
  campaign_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  within_minutes INT NOT NULL DEFAULT 60,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, campaign_id)
);

