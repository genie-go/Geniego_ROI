-- V269 additions: key rotation metadata + experiment config/stop actions + Amazon SP perf ingest tables
ALTER TABLE experiments ADD COLUMN IF NOT EXISTS config JSONB NOT NULL DEFAULT '{}';

CREATE TABLE IF NOT EXISTS experiment_stop_actions (
  id BIGSERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  experiment_id TEXT NOT NULL,
  trigger TEXT NOT NULL, -- NEGATIVE, POSITIVE
  action JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_experiment_stop_actions ON experiment_stop_actions(tenant_id, experiment_id, trigger);

-- Amazon SP performance ingest (search terms & targets)
CREATE TABLE IF NOT EXISTS amazon_sp_search_terms (
  id BIGSERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  profile_id TEXT NOT NULL,
  campaign_id BIGINT,
  ad_group_id BIGINT,
  keyword_id BIGINT,
  match_type TEXT,
  search_term TEXT,
  clicks BIGINT,
  impressions BIGINT,
  cost DOUBLE PRECISION,
  sales DOUBLE PRECISION,
  orders BIGINT,
  acos DOUBLE PRECISION,
  at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  raw JSONB NOT NULL DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS idx_amz_sp_terms_tenant_at ON amazon_sp_search_terms(tenant_id, at);

CREATE TABLE IF NOT EXISTS amazon_sp_targets_perf (
  id BIGSERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  profile_id TEXT NOT NULL,
  campaign_id BIGINT,
  ad_group_id BIGINT,
  target_id BIGINT,
  target_expression TEXT,
  clicks BIGINT,
  impressions BIGINT,
  cost DOUBLE PRECISION,
  sales DOUBLE PRECISION,
  orders BIGINT,
  acos DOUBLE PRECISION,
  at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  raw JSONB NOT NULL DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS idx_amz_sp_targets_tenant_at ON amazon_sp_targets_perf(tenant_id, at);
