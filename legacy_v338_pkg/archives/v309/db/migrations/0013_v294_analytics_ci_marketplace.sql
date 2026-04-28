-- V294 analytics drilldowns, CI-based deal recommendation, marketplace expansion, journey graph templates
-- Generated: 2026-02-26

-- Analytics: helpful indexes for cohort/funnel queries
CREATE INDEX IF NOT EXISTS idx_events_tenant_type_time ON events(tenant_id, event_type, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_tenant_contact_time ON events(tenant_id, contact_id, occurred_at DESC);

-- Marketplace core tables
CREATE TABLE IF NOT EXISTS marketplace_catalog_items (
  id UUID PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  sku TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'general',
  currency TEXT NOT NULL DEFAULT 'USD',
  list_price NUMERIC(18,2) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, sku)
);

CREATE INDEX IF NOT EXISTS idx_mkt_catalog_active ON marketplace_catalog_items(tenant_id, is_active, updated_at DESC);

-- Offers: unified for influencer/partner/app channels
CREATE TABLE IF NOT EXISTS marketplace_offers (
  id UUID PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  offer_code TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'discount', -- discount | cashback | bundle | affiliate
  rules_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  start_at TIMESTAMPTZ NULL,
  end_at TIMESTAMPTZ NULL,
  status TEXT NOT NULL DEFAULT 'draft', -- draft | active | paused | archived
  created_by TEXT NOT NULL DEFAULT 'system',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, offer_code)
);

CREATE INDEX IF NOT EXISTS idx_mkt_offers_status ON marketplace_offers(tenant_id, status, updated_at DESC);

-- Offer to catalog mapping
CREATE TABLE IF NOT EXISTS marketplace_offer_items (
  id UUID PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  offer_id UUID NOT NULL REFERENCES marketplace_offers(id) ON DELETE CASCADE,
  catalog_item_id UUID NOT NULL REFERENCES marketplace_catalog_items(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, offer_id, catalog_item_id)
);

-- Apps / integrations marketplace
CREATE TABLE IF NOT EXISTS marketplace_apps (
  id UUID PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  app_key TEXT NOT NULL,
  name TEXT NOT NULL,
  publisher TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  scopes_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  install_url TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'listed', -- listed | unlisted | deprecated
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, app_key)
);

CREATE INDEX IF NOT EXISTS idx_mkt_apps_status ON marketplace_apps(tenant_id, status, updated_at DESC);

-- Settlements / payouts (basic ledger)
CREATE TABLE IF NOT EXISTS marketplace_settlements (
  id UUID PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  settlement_date DATE NOT NULL,
  partner_type TEXT NOT NULL DEFAULT 'influencer', -- influencer | affiliate | app | other
  partner_id TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  gross_revenue NUMERIC(18,2) NOT NULL DEFAULT 0,
  fees NUMERIC(18,2) NOT NULL DEFAULT 0,
  payout NUMERIC(18,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'open', -- open | approved | paid | void
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, settlement_date, partner_type, partner_id)
);

CREATE INDEX IF NOT EXISTS idx_mkt_settlements_status ON marketplace_settlements(tenant_id, status, settlement_date DESC);

-- Evaluation summary table (optional storage)
CREATE TABLE IF NOT EXISTS product_evaluations (
  tenant_id TEXT NOT NULL,
  version TEXT NOT NULL,
  evaluation_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, version)
);
