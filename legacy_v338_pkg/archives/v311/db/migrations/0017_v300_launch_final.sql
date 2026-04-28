-- V300: launch-final (SSO sessions, OIDC state/nonce, Stripe, plan bundles, commerce hub, marketplace security/webhooks)

-- OIDC login flow + sessions
CREATE TABLE IF NOT EXISTS oidc_login_states (
  tenant_id TEXT NOT NULL,
  state TEXT NOT NULL,
  nonce TEXT NOT NULL,
  redirect_uri TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (tenant_id, state)
);

CREATE TABLE IF NOT EXISTS auth_sessions (
  session_token TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  last_seen_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_tenant_user ON auth_sessions(tenant_id, user_id);

-- Enhance existing OIDC config table if present
ALTER TABLE IF EXISTS sso_oidc_configs
  ADD COLUMN IF NOT EXISTS jwks_json TEXT,
  ADD COLUMN IF NOT EXISTS client_secret TEXT;

-- Billing: stripe + tax rules + plan bundles
CREATE TABLE IF NOT EXISTS billing_tax_rules (
  tenant_id TEXT NOT NULL,
  country_code TEXT NOT NULL,
  vat_rate NUMERIC NOT NULL DEFAULT 0,
  tax_inclusive BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, country_code)
);

ALTER TABLE IF EXISTS billing_plans
  ADD COLUMN IF NOT EXISTS stripe_price_id TEXT;

CREATE TABLE IF NOT EXISTS billing_stripe_configs (
  tenant_id TEXT PRIMARY KEY,
  stripe_secret_key TEXT,
  stripe_webhook_secret TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS plan_policy_bundles (
  tenant_id TEXT NOT NULL,
  plan_id TEXT NOT NULL,
  policy_template_id TEXT NOT NULL,
  bundle_name TEXT NOT NULL DEFAULT 'default',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, plan_id, policy_template_id, bundle_name)
);

-- Commerce hub (multi-marketplace product/order/inventory)
CREATE TABLE IF NOT EXISTS commerce_products (
  tenant_id TEXT NOT NULL,
  sku TEXT NOT NULL,
  title TEXT,
  description TEXT,
  price NUMERIC,
  currency TEXT DEFAULT 'USD',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, sku)
);

CREATE TABLE IF NOT EXISTS commerce_listings (
  tenant_id TEXT NOT NULL,
  channel TEXT NOT NULL, -- amazon/shopify/qoo10/rakuten/coupang/naver/cafe24
  channel_item_id TEXT NOT NULL,
  sku TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  last_sync_at TIMESTAMPTZ,
  PRIMARY KEY (tenant_id, channel, channel_item_id)
);
CREATE INDEX IF NOT EXISTS idx_commerce_listings_sku ON commerce_listings(tenant_id, sku);

CREATE TABLE IF NOT EXISTS commerce_orders (
  tenant_id TEXT NOT NULL,
  channel TEXT NOT NULL,
  order_id TEXT NOT NULL,
  ordered_at TIMESTAMPTZ,
  buyer_id TEXT,
  total_amount NUMERIC,
  currency TEXT,
  raw_json TEXT,
  PRIMARY KEY (tenant_id, channel, order_id)
);

CREATE TABLE IF NOT EXISTS commerce_inventory (
  tenant_id TEXT NOT NULL,
  sku TEXT NOT NULL,
  on_hand INTEGER NOT NULL DEFAULT 0,
  reserved INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, sku)
);

CREATE TABLE IF NOT EXISTS commerce_sync_runs (
  tenant_id TEXT NOT NULL,
  run_id TEXT NOT NULL,
  channel TEXT NOT NULL,
  kind TEXT NOT NULL, -- products/prices/orders/inventory
  status TEXT NOT NULL DEFAULT 'running',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  message TEXT,
  PRIMARY KEY (tenant_id, run_id)
);

-- Marketplace: evidence attachments for scope proof
ALTER TABLE IF EXISTS marketplace_app_scope_requests
  ADD COLUMN IF NOT EXISTS evidence_url TEXT,
  ADD COLUMN IF NOT EXISTS evidence_sha256 TEXT;
