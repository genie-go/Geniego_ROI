PRAGMA foreign_keys=ON;

-- V321 migration (SQLite 호환): PRIMARY KEY에 표현식 사용 금지 → 빈 문자열로 정규화
CREATE TABLE IF NOT EXISTS attribution_config (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  config_json TEXT NOT NULL,
  updated_at TEXT
);
INSERT OR IGNORE INTO attribution_config(id, config_json, updated_at)
VALUES (1, '{"chain":["campaign_id"],"min_score":0.8,"prefix_len":4,"rules":{}}', '1970-01-01');

CREATE TABLE IF NOT EXISTS ads_daily (
  date TEXT NOT NULL,
  channel TEXT NOT NULL,
  campaign_id TEXT NOT NULL,
  campaign_name TEXT,
  utm_campaign TEXT,
  ad_group_id TEXT NOT NULL DEFAULT '',
  ad_group_name TEXT,
  ad_id TEXT NOT NULL DEFAULT '',
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
  PRIMARY KEY (date, channel, campaign_id, ad_group_id, ad_id)
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

CREATE TABLE IF NOT EXISTS custom_mappers (
  channel TEXT PRIMARY KEY,
  mapping_json TEXT NOT NULL,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS ops_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_type TEXT NOT NULL,
  detail_json TEXT,
  created_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_ads_campaign_date ON ads_daily(date, channel, campaign_id);
CREATE INDEX IF NOT EXISTS idx_ads_adgroup_date ON ads_daily(date, channel, ad_group_id);
CREATE INDEX IF NOT EXISTS idx_ads_ad_date ON ads_daily(date, channel, ad_id);
CREATE INDEX IF NOT EXISTS idx_conv_date ON conversions_daily(date);
CREATE INDEX IF NOT EXISTS idx_ops_type_date ON ops_log(event_type, created_at);
