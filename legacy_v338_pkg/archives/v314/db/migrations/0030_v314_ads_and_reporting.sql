-- 0030_v314_ads_and_reporting.sql
-- GENIE_ROI V314: 광고만 운영 모드 + 리포팅 지원(예시 스키마)
-- DB는 PostgreSQL 기준 예시이며, 운영 환경에 맞게 조정하세요.

BEGIN;

-- Feature toggles (간단 예시)
CREATE TABLE IF NOT EXISTS feature_flags (
  key TEXT PRIMARY KEY,
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO feature_flags(key, enabled) VALUES
 ('influencer_module', TRUE),
 ('ads_only_module', TRUE),
 ('auto_reporting', TRUE)
ON CONFLICT (key) DO NOTHING;

-- Ads performance (daily)
CREATE TABLE IF NOT EXISTS ads_campaign_daily (
  date DATE NOT NULL,
  channel TEXT NOT NULL,                -- google/meta/tiktok/naver/amazon 등
  campaign_id TEXT NOT NULL,
  campaign_name TEXT,
  objective TEXT,
  spend_krw BIGINT NOT NULL DEFAULT 0,
  impressions BIGINT NOT NULL DEFAULT 0,
  clicks BIGINT NOT NULL DEFAULT 0,
  extra JSONB NOT NULL DEFAULT '{}'::jsonb, -- CPM, frequency 등 선택지표
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY(date, channel, campaign_id)
);

-- Conversions / revenue (daily)
CREATE TABLE IF NOT EXISTS conversions_daily (
  date DATE NOT NULL,
  campaign_id TEXT NOT NULL,
  conversion_key TEXT,                  -- UTM, pixel event id, coupon 등
  conversions BIGINT NOT NULL DEFAULT 0,
  revenue_krw BIGINT NOT NULL DEFAULT 0,
  leads BIGINT NOT NULL DEFAULT 0,
  extra JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY(date, campaign_id, COALESCE(conversion_key,''))
);

-- Materialized view style aggregation (실제 운영에서는 MV/ETL 사용 권장)
CREATE OR REPLACE VIEW v314_ads_kpi_daily AS
SELECT
  a.date,
  a.channel,
  a.campaign_id,
  a.campaign_name,
  a.spend_krw,
  a.impressions,
  a.clicks,
  COALESCE(c.conversions, 0) AS conversions,
  COALESCE(c.revenue_krw, 0) AS revenue_krw,
  CASE WHEN a.impressions > 0 THEN (a.clicks::numeric / a.impressions) ELSE NULL END AS ctr,
  CASE WHEN a.clicks > 0 THEN (COALESCE(c.conversions,0)::numeric / a.clicks) ELSE NULL END AS cvr,
  CASE WHEN a.spend_krw > 0 THEN (COALESCE(c.revenue_krw,0)::numeric / a.spend_krw) ELSE NULL END AS roas,
  CASE WHEN COALESCE(c.conversions,0) > 0 THEN (a.spend_krw::numeric / c.conversions) ELSE NULL END AS cpa
FROM ads_campaign_daily a
LEFT JOIN conversions_daily c
  ON c.date = a.date
 AND c.campaign_id = a.campaign_id;

COMMIT;
