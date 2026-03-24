PRAGMA foreign_keys=ON;

CREATE TABLE IF NOT EXISTS attribution_config (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  rule_chain TEXT NOT NULL DEFAULT '["campaign_id"]', -- JSON array
  updated_at TEXT
);
INSERT OR IGNORE INTO attribution_config(id, rule_chain, updated_at) VALUES (1, '["campaign_id"]', '1970-01-01');

-- Ads table (adds utm_campaign optional)
CREATE TABLE IF NOT EXISTS ads_daily (
  date TEXT NOT NULL,
  channel TEXT NOT NULL,

  campaign_id TEXT NOT NULL,
  campaign_name TEXT,

  utm_campaign TEXT,

  ad_group_id TEXT,
  ad_group_name TEXT,

  ad_id TEXT,
  ad_name TEXT,

  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,

  cost REAL DEFAULT 0,
  cost_micros INTEGER DEFAULT 0,
  currency TEXT DEFAULT 'KRW',

  tax_rate REAL DEFAULT 0,
  cost_tax REAL DEFAULT 0,
  cost_includes_tax INTEGER DEFAULT 0,

  cost_net REAL DEFAULT 0,
  cost_base REAL DEFAULT 0,

  PRIMARY KEY (date, channel, campaign_id, COALESCE(ad_id,''), COALESCE(ad_group_id,''))
);

CREATE TABLE IF NOT EXISTS conversions_daily (
  date TEXT NOT NULL,
  campaign_id TEXT DEFAULT '',
  utm_campaign TEXT DEFAULT '',
  ad_id TEXT DEFAULT '',
  conversions INTEGER DEFAULT 0,
  revenue REAL DEFAULT 0,
  PRIMARY KEY (date, campaign_id, utm_campaign, ad_id)
);

CREATE INDEX IF NOT EXISTS idx_ads_campaign_date ON ads_daily(date, channel, campaign_id);
CREATE INDEX IF NOT EXISTS idx_ads_ad_date ON ads_daily(date, channel, ad_id);
CREATE INDEX IF NOT EXISTS idx_conv_date ON conversions_daily(date);

-- Custom mapper storage (also mirrored to templates/v318/custom_mappers.json for easy portability)
CREATE TABLE IF NOT EXISTS custom_mappers (
  channel TEXT PRIMARY KEY,
  mapping_json TEXT NOT NULL,
  updated_at TEXT
);
