-- GENIE_ROI V315 Complete Schema (reference implementation)
-- 목적: 채널별 광고 CSV 업로드 -> 통합 스키마 적재 -> KPI/대시보드 산출
--      인플루언서 점수/리스크/성과도 동일한 ROI 레이어로 연결

PRAGMA foreign_keys=ON;

-- Feature flags (모듈 선택)
CREATE TABLE IF NOT EXISTS feature_flags (
  flag TEXT PRIMARY KEY,
  enabled INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO feature_flags(flag, enabled) VALUES
  ('ads_only_module', 1),
  ('influencer_module', 1),
  ('auto_reporting', 1),
  ('weight_config_ui', 1);

-- 광고 성과(일별, 채널/캠페인 단위) - 통합 스키마
CREATE TABLE IF NOT EXISTS ads_campaign_daily (
  date TEXT NOT NULL,
  channel TEXT NOT NULL,              -- google_ads/meta_ads/tiktok_ads/naver_ads/other
  account_id TEXT,
  campaign_id TEXT NOT NULL,
  campaign_name TEXT,
  adgroup_id TEXT,
  adgroup_name TEXT,
  creative_id TEXT,
  creative_name TEXT,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  spend REAL DEFAULT 0,               -- 광고비
  PRIMARY KEY(date, channel, campaign_id, COALESCE(adgroup_id,''), COALESCE(creative_id,''))
);

-- 전환/매출(일별) - UTM/캠페인ID/쿠폰코드 등으로 귀속
CREATE TABLE IF NOT EXISTS conversions_daily (
  date TEXT NOT NULL,
  source TEXT NOT NULL,               -- web/app/offline/affiliate
  channel TEXT,                       -- optional (if known)
  campaign_id TEXT,                   -- optional (if known)
  utm_campaign TEXT,                  -- optional
  promo_code TEXT,                    -- optional (influencer attribution)
  conversions INTEGER DEFAULT 0,
  revenue REAL DEFAULT 0,
  PRIMARY KEY(date, source, COALESCE(channel,''), COALESCE(campaign_id,''), COALESCE(utm_campaign,''), COALESCE(promo_code,''))
);

-- 인플루언서 기본
CREATE TABLE IF NOT EXISTS influencers (
  influencer_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  platform TEXT NOT NULL,             -- instagram/youtube/tiktok/etc
  category TEXT,
  followers INTEGER DEFAULT 0,
  country TEXT,
  language TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 인플루언서 콘텐츠 성과(콘텐츠 단위)
CREATE TABLE IF NOT EXISTS influencer_content (
  date TEXT NOT NULL,
  influencer_id TEXT NOT NULL,
  content_id TEXT NOT NULL,
  content_type TEXT,                  -- reels/shorts/post/live
  views INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  saves INTEGER DEFAULT 0,
  link_clicks INTEGER DEFAULT 0,
  promo_code_sales INTEGER DEFAULT 0,
  PRIMARY KEY(date, influencer_id, content_id),
  FOREIGN KEY(influencer_id) REFERENCES influencers(influencer_id)
);

-- 점수/리스크 신호(정규화)
CREATE TABLE IF NOT EXISTS influencer_vetting_runs (
  run_id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  notes TEXT
);

CREATE TABLE IF NOT EXISTS influencer_scores (
  run_id TEXT NOT NULL,
  influencer_id TEXT NOT NULL,
  score_total REAL NOT NULL,
  score_fit REAL,
  score_quality REAL,
  score_performance REAL,
  score_risk REAL,
  PRIMARY KEY(run_id, influencer_id),
  FOREIGN KEY(run_id) REFERENCES influencer_vetting_runs(run_id),
  FOREIGN KEY(influencer_id) REFERENCES influencers(influencer_id)
);

-- KPI 뷰: 광고
CREATE VIEW IF NOT EXISTS v315_ads_kpi_daily AS
SELECT
  d.date,
  d.channel,
  d.campaign_id,
  d.campaign_name,
  SUM(d.impressions) AS impressions,
  SUM(d.clicks) AS clicks,
  SUM(d.spend) AS spend,
  COALESCE(SUM(c.conversions),0) AS conversions,
  COALESCE(SUM(c.revenue),0) AS revenue,
  CASE WHEN SUM(d.impressions) > 0 THEN 1.0*SUM(d.clicks)/SUM(d.impressions) ELSE 0 END AS ctr,
  CASE WHEN SUM(d.clicks) > 0 THEN 1.0*COALESCE(SUM(c.conversions),0)/SUM(d.clicks) ELSE 0 END AS cvr,
  CASE WHEN SUM(d.spend) > 0 THEN 1.0*COALESCE(SUM(c.revenue),0)/SUM(d.spend) ELSE 0 END AS roas,
  CASE WHEN COALESCE(SUM(c.conversions),0) > 0 THEN 1.0*SUM(d.spend)/COALESCE(SUM(c.conversions),0) ELSE 0 END AS cpa
FROM ads_campaign_daily d
LEFT JOIN conversions_daily c
  ON c.date = d.date
 AND (c.channel = d.channel OR c.channel IS NULL OR c.channel = '')
 AND (c.campaign_id = d.campaign_id OR c.campaign_id IS NULL OR c.campaign_id = '')
GROUP BY d.date, d.channel, d.campaign_id, d.campaign_name;

-- KPI 뷰: 인플루언서 콘텐츠 참여율(ER)
CREATE VIEW IF NOT EXISTS v315_influencer_content_kpi AS
SELECT
  ic.date,
  ic.influencer_id,
  i.name,
  i.platform,
  i.followers,
  ic.content_id,
  ic.content_type,
  ic.views,
  ic.likes,
  ic.comments,
  ic.shares,
  ic.saves,
  ic.link_clicks,
  (ic.likes + ic.comments + ic.shares + ic.saves) AS engagements,
  CASE WHEN i.followers > 0 THEN 1.0*(ic.likes + ic.comments + ic.shares + ic.saves)/i.followers ELSE 0 END AS engagement_rate
FROM influencer_content ic
JOIN influencers i ON i.influencer_id = ic.influencer_id;
