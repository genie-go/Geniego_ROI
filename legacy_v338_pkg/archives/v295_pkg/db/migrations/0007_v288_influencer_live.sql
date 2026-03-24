-- V288: LIVE collectors + influencer/product intelligence

CREATE TABLE IF NOT EXISTS connector_accounts (
  id UUID PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  account_id TEXT NOT NULL,
  display_name TEXT,
  auth_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, provider, account_id)
);

CREATE TABLE IF NOT EXISTS collector_checkpoints (
  tenant_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  account_id TEXT NOT NULL,
  cursor TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (tenant_id, provider, account_id)
);

CREATE TABLE IF NOT EXISTS provider_webhook_events (
  id UUID PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  event_type TEXT NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  payload_json JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS message_events (
  id UUID PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  message_id TEXT,
  contact_id UUID,
  event_type TEXT NOT NULL, -- OPEN, CLICK, BOUNCE, DELIVERED, UNSUBSCRIBE
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  meta_json JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_message_events_lookup ON message_events(tenant_id, contact_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_message_events_msgid ON message_events(tenant_id, message_id);

CREATE TABLE IF NOT EXISTS attribution_links (
  id UUID PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  conversion_id UUID NOT NULL,
  contact_id UUID,
  linked_message_event_id UUID,
  model TEXT NOT NULL DEFAULT 'last_touch',
  lookback_hours INT NOT NULL DEFAULT 168,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS influencers (
  id UUID PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  handle TEXT,
  categories JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  sku TEXT,
  name TEXT NOT NULL,
  categories JSONB NOT NULL DEFAULT '[]'::jsonb,
  price NUMERIC,
  margin NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS influencer_channel_stats (
  id UUID PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  influencer_id UUID NOT NULL REFERENCES influencers(id) ON DELETE CASCADE,
  channel TEXT NOT NULL, -- instagram,tiktok,youtube,naver_blog,kakao_channel,meta_ads,etc.
  stat_date DATE NOT NULL,
  impressions BIGINT NOT NULL DEFAULT 0,
  clicks BIGINT NOT NULL DEFAULT 0,
  conversions BIGINT NOT NULL DEFAULT 0,
  revenue NUMERIC NOT NULL DEFAULT 0,
  cost NUMERIC NOT NULL DEFAULT 0,
  followers BIGINT NOT NULL DEFAULT 0,
  engagement_rate NUMERIC NOT NULL DEFAULT 0,
  meta_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE(tenant_id, influencer_id, channel, stat_date)
);

CREATE INDEX IF NOT EXISTS idx_influencer_stats ON influencer_channel_stats(tenant_id, channel, stat_date DESC);

CREATE TABLE IF NOT EXISTS influencer_product_stats (
  id UUID PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  influencer_id UUID NOT NULL REFERENCES influencers(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  channel TEXT NOT NULL,
  stat_date DATE NOT NULL,
  impressions BIGINT NOT NULL DEFAULT 0,
  clicks BIGINT NOT NULL DEFAULT 0,
  conversions BIGINT NOT NULL DEFAULT 0,
  revenue NUMERIC NOT NULL DEFAULT 0,
  cost NUMERIC NOT NULL DEFAULT 0,
  meta_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE(tenant_id, influencer_id, product_id, channel, stat_date)
);

CREATE INDEX IF NOT EXISTS idx_influencer_product_stats ON influencer_product_stats(tenant_id, product_id, channel, stat_date DESC);
