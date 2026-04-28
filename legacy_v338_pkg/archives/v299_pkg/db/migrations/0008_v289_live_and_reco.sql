-- V289: LIVE auth templates + influencer recommendation v2 (product/channel/content fit) + Amazon Ads provider

-- Extend influencers with content types and richer profile
ALTER TABLE IF EXISTS influencers
  ADD COLUMN IF NOT EXISTS content_types JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS channels JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS audience_json JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Extend products with attributes and preferred content/channels
ALTER TABLE IF EXISTS products
  ADD COLUMN IF NOT EXISTS attributes_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS content_types JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS preferred_channels JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Channel traits for recommendation fit
CREATE TABLE IF NOT EXISTS channel_traits (
  tenant_id TEXT NOT NULL,
  channel TEXT NOT NULL, -- e.g. instagram, tiktok, youtube, naver_blog, kakao
  traits_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (tenant_id, channel)
);

-- Provider rate-limit config (optional, can be set per tenant/provider)
CREATE TABLE IF NOT EXISTS provider_rate_limits (
  tenant_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  limits_json JSONB NOT NULL DEFAULT '{}'::jsonb, -- {"rps":10,"burst":20,"max_retries":6}
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (tenant_id, provider)
);

-- Add Amazon Ads provider accounts (uses connector_accounts.provider='amazon_ads') no schema change needed.
