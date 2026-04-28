-- V313: Influencer vetting, fraud signals, and industry playbooks

CREATE TABLE IF NOT EXISTS influencer_vetting_runs (
  id UUID PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  influencer_handle TEXT NOT NULL,
  platform TEXT NOT NULL, -- instagram/youtube/tiktok/etc
  evaluated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  total_score NUMERIC NOT NULL DEFAULT 0,
  verdict TEXT NOT NULL DEFAULT 'REVIEW', -- PASS/REVIEW/FAIL
  notes TEXT
);

CREATE TABLE IF NOT EXISTS influencer_vetting_items (
  id UUID PRIMARY KEY,
  run_id UUID NOT NULL REFERENCES influencer_vetting_runs(id) ON DELETE CASCADE,
  category TEXT NOT NULL, -- FIT/AUDIENCE/PERFORMANCE/OPS/RISK
  item TEXT NOT NULL,
  weight NUMERIC NOT NULL DEFAULT 1,
  score NUMERIC NOT NULL DEFAULT 0,
  evidence JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS influencer_fraud_signals (
  id UUID PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  influencer_handle TEXT NOT NULL,
  platform TEXT NOT NULL,
  signal_key TEXT NOT NULL, -- growth_spike/comment_auth/audience_match/eng_consistency/conversion_check
  signal_value NUMERIC,
  signal_label TEXT, -- LOW/MED/HIGH
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  details JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS industry_playbooks (
  id UUID PRIMARY KEY,
  industry TEXT NOT NULL, -- beauty/fashion/food/it/b2b/manufacturing/distribution
  title TEXT NOT NULL,
  content_md TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
