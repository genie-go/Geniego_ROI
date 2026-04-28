CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- V290: LIVE collectors (tokens/auth), dynamic throttling state storage, influencer deal estimation

ALTER TABLE IF EXISTS connector_accounts
  ADD COLUMN IF NOT EXISTS auth_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS token_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMPTZ NULL;

-- Optional checkpoint watermark for safe reprocessing beyond cursor
CREATE TABLE IF NOT EXISTS collector_watermarks (
  tenant_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  account_id TEXT NOT NULL,
  report_key TEXT NOT NULL,
  watermark JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, provider, account_id, report_key)
);

-- Provider-specific rate-limit overrides (per tenant)
CREATE TABLE IF NOT EXISTS provider_rate_limits (
  tenant_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  config_json JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, provider)
);

-- Influencer pricing / deal estimation inputs
CREATE TABLE IF NOT EXISTS influencer_rate_cards (
  id UUID PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  influencer_id UUID NOT NULL REFERENCES influencers(id) ON DELETE CASCADE,
  channel TEXT NOT NULL,
  content_type TEXT NOT NULL,
  base_fee NUMERIC NOT NULL DEFAULT 0,
  cpm NUMERIC NOT NULL DEFAULT 0, -- cost per 1000 impressions
  cpc NUMERIC NOT NULL DEFAULT 0, -- cost per click
  rev_share NUMERIC NOT NULL DEFAULT 0, -- 0..1 optional
  meta_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, influencer_id, channel, content_type)
);

CREATE TABLE IF NOT EXISTS influencer_deal_estimates (
  id UUID PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  influencer_id UUID NOT NULL REFERENCES influencers(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  channel TEXT NOT NULL,
  content_type TEXT NOT NULL,
  horizon_days INT NOT NULL DEFAULT 14,
  expected_impressions BIGINT NOT NULL DEFAULT 0,
  expected_clicks BIGINT NOT NULL DEFAULT 0,
  expected_conversions BIGINT NOT NULL DEFAULT 0,
  expected_revenue NUMERIC NOT NULL DEFAULT 0,
  expected_gross_profit NUMERIC NOT NULL DEFAULT 0,
  recommended_fee_min NUMERIC NOT NULL DEFAULT 0,
  recommended_fee_max NUMERIC NOT NULL DEFAULT 0,
  assumptions_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_deal_estimates ON influencer_deal_estimates(tenant_id, influencer_id, product_id, created_at DESC);
