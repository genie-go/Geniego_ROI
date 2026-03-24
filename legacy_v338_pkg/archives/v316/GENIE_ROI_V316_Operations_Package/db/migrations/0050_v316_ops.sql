PRAGMA foreign_keys=ON;

CREATE TABLE IF NOT EXISTS ads_campaign_daily (
  date TEXT NOT NULL,
  channel TEXT NOT NULL,
  campaign_id TEXT NOT NULL,
  campaign_name TEXT,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  cost REAL DEFAULT 0,
  PRIMARY KEY (date, channel, campaign_id)
);

CREATE TABLE IF NOT EXISTS conversions_daily (
  date TEXT NOT NULL,
  campaign_id TEXT NOT NULL,
  utm_campaign TEXT NOT NULL,
  conversions INTEGER DEFAULT 0,
  revenue REAL DEFAULT 0,
  PRIMARY KEY (date, campaign_id, utm_campaign)
);

CREATE VIEW IF NOT EXISTS v316_ads_kpi_daily AS
SELECT
  a.date,
  a.channel,
  a.campaign_id,
  a.campaign_name,
  a.impressions,
  a.clicks,
  a.cost,
  COALESCE(SUM(c.conversions), 0) AS conversions,
  COALESCE(SUM(c.revenue), 0) AS revenue,
  CASE WHEN a.impressions > 0 THEN CAST(a.clicks AS REAL)/a.impressions ELSE NULL END AS ctr,
  CASE WHEN a.clicks > 0 THEN CAST(COALESCE(SUM(c.conversions),0) AS REAL)/a.clicks ELSE NULL END AS cvr,
  CASE WHEN a.cost > 0 THEN COALESCE(SUM(c.revenue),0)/a.cost ELSE NULL END AS roas,
  CASE WHEN COALESCE(SUM(c.conversions),0) > 0 THEN a.cost/COALESCE(SUM(c.conversions),0) ELSE NULL END AS cpa
FROM ads_campaign_daily a
LEFT JOIN conversions_daily c
  ON c.date = a.date AND c.campaign_id = a.campaign_id
GROUP BY a.date, a.channel, a.campaign_id;

CREATE TABLE IF NOT EXISTS influencers (
  influencer_id TEXT PRIMARY KEY,
  handle TEXT NOT NULL,
  platform TEXT,
  category TEXT,
  follower_count INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS influencer_campaign_results (
  influencer_id TEXT NOT NULL,
  date TEXT NOT NULL,
  campaign_id TEXT,
  link_clicks INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  revenue REAL DEFAULT 0,
  FOREIGN KEY (influencer_id) REFERENCES influencers(influencer_id)
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

CREATE TABLE IF NOT EXISTS influencer_scores (
  influencer_id TEXT PRIMARY KEY,
  handle TEXT NOT NULL,
  total REAL NOT NULL,
  fit REAL NOT NULL,
  risk REAL NOT NULL,
  performance REAL NOT NULL,
  FOREIGN KEY (influencer_id) REFERENCES influencers(influencer_id)
);

CREATE INDEX IF NOT EXISTS idx_fraud_influencer_date ON fraud_estimates(influencer_id, collected_at);
