-- V292: Journey always-on worker upgrades (cursor + idempotency) and drilldown reporting helpers
-- 1) Cursor per journey trigger processing (avoid lookback duplicates while staying safe)
CREATE TABLE IF NOT EXISTS journey_event_cursors (
  tenant_id TEXT NOT NULL,
  journey_id TEXT NOT NULL,
  last_occurred_at TIMESTAMPTZ NOT NULL DEFAULT '1970-01-01'::timestamptz,
  last_event_id TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, journey_id)
);

-- 2) Step idempotency keys (prevent duplicate sends / API calls across retries or multiple workers)
CREATE TABLE IF NOT EXISTS journey_idempotency_keys (
  tenant_id TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  journey_id TEXT,
  enrollment_id TEXT,
  step_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, key_hash)
);

-- 3) Optional rollups for dashboard drilldown (indexes to make joins fast)
CREATE INDEX IF NOT EXISTS idx_channel_metrics_campaign ON channel_metrics(tenant_id, day, campaign_id);
CREATE INDEX IF NOT EXISTS idx_conversion_events_campaign ON conversion_events(tenant_id, occurred_at, campaign_id);
CREATE INDEX IF NOT EXISTS idx_attribution_campaign ON attribution_links(tenant_id, campaign_id);
