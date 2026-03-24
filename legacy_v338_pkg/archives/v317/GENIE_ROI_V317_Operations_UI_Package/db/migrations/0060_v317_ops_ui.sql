PRAGMA foreign_keys=ON;

-- Settings / attribution
CREATE TABLE IF NOT EXISTS attribution_config (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  rule TEXT NOT NULL DEFAULT 'campaign_id', -- campaign_id / utm_campaign / ad_id
  updated_at TEXT
);
INSERT OR IGNORE INTO attribution_config(id, rule, updated_at) VALUES (1, 'campaign_id', '1970-01-01');

-- Ads (more detailed)
CREATE TABLE IF NOT EXISTS ads_daily (
  date TEXT NOT NULL,
  channel TEXT NOT NULL,

  campaign_id TEXT NOT NULL,
  campaign_name TEXT,

  ad_group_id TEXT,
  ad_group_name TEXT,

  ad_id TEXT,
  ad_name TEXT,

  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,

  -- raw cost fields
  cost REAL DEFAULT 0,
  cost_micros INTEGER DEFAULT 0,
  currency TEXT DEFAULT 'KRW',

  -- tax fields
  tax_rate REAL DEFAULT 0,        -- e.g. 0.1 for 10%
  cost_tax REAL DEFAULT 0,        -- if explicit tax amount given
  cost_includes_tax INTEGER DEFAULT 0,  -- 1 if cost already includes tax

  -- normalized
  cost_net REAL DEFAULT 0,        -- net of tax, in original currency
  cost_base REAL DEFAULT 0,       -- converted to base currency (e.g. KRW)

  PRIMARY KEY (date, channel, campaign_id, COALESCE(ad_id,''), COALESCE(ad_group_id,''))
);

-- Conversions (support multiple keys for attribution)
CREATE TABLE IF NOT EXISTS conversions_daily (
  date TEXT NOT NULL,
  campaign_id TEXT DEFAULT '',
  utm_campaign TEXT DEFAULT '',
  ad_id TEXT DEFAULT '',
  conversions INTEGER DEFAULT 0,
  revenue REAL DEFAULT 0,
  PRIMARY KEY (date, campaign_id, utm_campaign, ad_id)
);

-- Influencer (kept from V316 for compatibility/future)
CREATE TABLE IF NOT EXISTS influencers (
  influencer_id TEXT PRIMARY KEY,
  handle TEXT NOT NULL,
  platform TEXT,
  category TEXT,
  follower_count INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS audience_demographics (
  influencer_id TEXT NOT NULL,
  dimension TEXT NOT NULL,
  key TEXT NOT NULL,
  pct REAL DEFAULT 0,
  PRIMARY KEY (influencer_id, dimension, key),
  FOREIGN KEY (influencer_id) REFERENCES influencers(influencer_id)
);

CREATE TABLE IF NOT EXISTS fraud_estimates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  influencer_id TEXT NOT NULL,
  fake_follower_pct REAL DEFAULT 0,
  suspicious_engagement_pct REAL DEFAULT 0,
  notes TEXT,
  source TEXT,
  collected_at TEXT,
  FOREIGN KEY (influencer_id) REFERENCES influencers(influencer_id)
);

CREATE TABLE IF NOT EXISTS influencer_campaign_results (
  influencer_id TEXT NOT NULL,
  date TEXT NOT NULL,
  campaign_id TEXT,
  ad_id TEXT,
  link_clicks INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  revenue REAL DEFAULT 0,
  FOREIGN KEY (influencer_id) REFERENCES influencers(influencer_id)
);

CREATE TABLE IF NOT EXISTS influencer_scores (
  influencer_id TEXT PRIMARY KEY,
  handle TEXT NOT NULL,
  total REAL NOT NULL,
  fit REAL NOT NULL,
  risk REAL NOT NULL,
  performance REAL NOT NULL,
  FOREIGN KEY (influencer_id) REFERENCES influencers(influencer_id)
);

CREATE INDEX IF NOT EXISTS idx_ads_campaign_date ON ads_daily(date, channel, campaign_id);
CREATE INDEX IF NOT EXISTS idx_conv_date ON conversions_daily(date);
CREATE INDEX IF NOT EXISTS idx_fraud_influencer_date ON fraud_estimates(influencer_id, collected_at);
