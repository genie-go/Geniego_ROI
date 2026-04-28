-- V283 ROI & Experimentation upgrade

-- Ads / Channel performance metrics (daily grain; can be extended to hourly)
CREATE TABLE IF NOT EXISTS channel_metrics (
  tenant_id TEXT NOT NULL,
  day DATE NOT NULL,
  channel TEXT NOT NULL,
  provider TEXT,
  campaign_id TEXT,
  adgroup_id TEXT,
  spend NUMERIC NOT NULL DEFAULT 0,
  impressions BIGINT NOT NULL DEFAULT 0,
  clicks BIGINT NOT NULL DEFAULT 0,
  conversions BIGINT NOT NULL DEFAULT 0,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, day, channel, COALESCE(provider,''), COALESCE(campaign_id,''), COALESCE(adgroup_id,''))
);

-- Conversion / revenue events (event grain)
CREATE TABLE IF NOT EXISTS conversion_events (
  id BIGSERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  contact_id TEXT,
  revenue NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'KRW',
  channel TEXT,
  provider TEXT,
  campaign_id TEXT,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS conversion_events_tenant_time_idx ON conversion_events(tenant_id, occurred_at);

-- Experiments (holdout / incrementality)
CREATE TABLE IF NOT EXISTS experiments (
  tenant_id TEXT NOT NULL,
  experiment_id TEXT NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'DRAFT', -- DRAFT|RUNNING|PAUSED|ENDED
  holdout_pct INT NOT NULL DEFAULT 10,
  start_at TIMESTAMPTZ,
  end_at TIMESTAMPTZ,
  definition_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, experiment_id)
);

CREATE TABLE IF NOT EXISTS experiment_allocations (
  tenant_id TEXT NOT NULL,
  experiment_id TEXT NOT NULL,
  unit_id TEXT NOT NULL, -- contact_id or cookie_id etc.
  group_name TEXT NOT NULL, -- treatment|holdout
  allocated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, experiment_id, unit_id)
);

CREATE TABLE IF NOT EXISTS experiment_outcomes (
  id BIGSERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  experiment_id TEXT NOT NULL,
  unit_id TEXT NOT NULL,
  measured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  conversions BIGINT NOT NULL DEFAULT 0,
  revenue NUMERIC NOT NULL DEFAULT 0,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS experiment_outcomes_idx ON experiment_outcomes(tenant_id, experiment_id, measured_at);
