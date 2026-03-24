-- V291: Amazon Ads async report jobs + lift-aware deal estimates

CREATE TABLE IF NOT EXISTS amazon_report_jobs (
  tenant_id TEXT NOT NULL,
  account_id TEXT NOT NULL,
  report_id TEXT NOT NULL,
  status TEXT NOT NULL,
  request_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  response_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  location TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, account_id, report_id)
);

ALTER TABLE IF EXISTS influencer_deal_estimates
  ADD COLUMN IF NOT EXISTS experiment_id TEXT NULL,
  ADD COLUMN IF NOT EXISTS lift_pct NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS incremental_revenue NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS incremental_profit NUMERIC NOT NULL DEFAULT 0;
