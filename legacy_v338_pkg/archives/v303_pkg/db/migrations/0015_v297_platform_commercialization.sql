-- V297 Platform Commercialization Package
-- Experiments: multivariate, sequential testing, holdout decay
-- Marketplace: payments/tax/refund/fee policies + security review automation (scope evidence)
-- Insights: review content analysis + purchase linkage + influencer/subscriber correlation

CREATE TABLE IF NOT EXISTS experiments_mv (
  tenant_id text NOT NULL,
  id text PRIMARY KEY,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS experiments_mv_variants (
  tenant_id text NOT NULL,
  experiment_id text NOT NULL,
  variant_id text NOT NULL,
  label text NOT NULL,
  weight float8 NOT NULL DEFAULT 1.0,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, experiment_id, variant_id)
);

CREATE TABLE IF NOT EXISTS experiments_sequential_runs (
  tenant_id text NOT NULL,
  id text PRIMARY KEY,
  experiment_id text NOT NULL,
  alpha float8 NOT NULL DEFAULT 0.05,
  power float8 NOT NULL DEFAULT 0.8,
  mde float8 NOT NULL DEFAULT 0.02,
  looks int NOT NULL DEFAULT 6,
  started_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS experiments_holdout_decay (
  tenant_id text NOT NULL,
  experiment_id text NOT NULL,
  day int NOT NULL,
  metric text NOT NULL,
  holdout_value float8 NOT NULL,
  treatment_value float8 NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, experiment_id, day, metric)
);

-- Marketplace finance
CREATE TABLE IF NOT EXISTS marketplace_fee_policies (
  tenant_id text NOT NULL,
  id text PRIMARY KEY,
  name text NOT NULL,
  platform_fee_bps int NOT NULL DEFAULT 0,
  payment_fee_bps int NOT NULL DEFAULT 0,
  refund_fee_cents int NOT NULL DEFAULT 0,
  effective_from date NOT NULL,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS marketplace_tax_rules (
  tenant_id text NOT NULL,
  id text PRIMARY KEY,
  region text NOT NULL,
  tax_rate float8 NOT NULL,
  tax_inclusive boolean NOT NULL DEFAULT false,
  effective_from date NOT NULL,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS marketplace_invoices (
  tenant_id text NOT NULL,
  id text PRIMARY KEY,
  offer_id text NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  subtotal_cents bigint NOT NULL,
  tax_cents bigint NOT NULL DEFAULT 0,
  fees_cents bigint NOT NULL DEFAULT 0,
  total_cents bigint NOT NULL,
  status text NOT NULL DEFAULT 'issued', -- issued/paid/void
  issued_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz NULL,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS marketplace_refunds (
  tenant_id text NOT NULL,
  id text PRIMARY KEY,
  invoice_id text NOT NULL,
  amount_cents bigint NOT NULL,
  reason text NOT NULL DEFAULT 'customer_request',
  status text NOT NULL DEFAULT 'requested', -- requested/approved/processed/rejected
  requested_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz NULL,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb
);

-- Security review automation
CREATE TABLE IF NOT EXISTS marketplace_scope_evidence (
  tenant_id text NOT NULL,
  app_id text NOT NULL,
  scope text NOT NULL,
  evidence_type text NOT NULL, -- doc/url/screenshot/log
  evidence_ref text NOT NULL,
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, app_id, scope, evidence_ref)
);

CREATE TABLE IF NOT EXISTS marketplace_security_reviews (
  tenant_id text NOT NULL,
  id text PRIMARY KEY,
  app_id text NOT NULL,
  status text NOT NULL DEFAULT 'pending', -- pending/approved/rejected/needs_info
  risk_score float8 NOT NULL DEFAULT 0,
  findings jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Review insights + purchase linkage + influencer
CREATE TABLE IF NOT EXISTS review_insights (
  tenant_id text NOT NULL,
  id text PRIMARY KEY,
  app_id text NOT NULL,
  from_date date NOT NULL,
  to_date date NOT NULL,
  topics jsonb NOT NULL DEFAULT '[]'::jsonb,
  sentiment float8 NOT NULL DEFAULT 0,
  purchase_conv_rate float8 NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS influencer_profiles (
  tenant_id text NOT NULL,
  id text PRIMARY KEY,
  handle text NOT NULL,
  platform text NOT NULL, -- youtube/instagram/tiktok/etc
  subscriber_count bigint NOT NULL DEFAULT 0,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS influencer_posts (
  tenant_id text NOT NULL,
  id text PRIMARY KEY,
  influencer_id text NOT NULL,
  app_id text NOT NULL,
  posted_at timestamptz NOT NULL DEFAULT now(),
  url text NOT NULL,
  impressions bigint NOT NULL DEFAULT 0,
  clicks bigint NOT NULL DEFAULT 0,
  attributed_purchases bigint NOT NULL DEFAULT 0,
  revenue_cents bigint NOT NULL DEFAULT 0,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_influencer_posts_tenant_app ON influencer_posts(tenant_id, app_id, posted_at);
