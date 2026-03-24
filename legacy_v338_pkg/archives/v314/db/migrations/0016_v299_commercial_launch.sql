-- V299 "Commercial Launch Pack" upgrade: enterprise SSO/RBAC/audit, billing/plans/usage, connector SDK + marketplace publish automation, tenant policy templates
-- Generated: 2026-02-26
CREATE TABLE IF NOT EXISTS roles (
  tenant_id TEXT NOT NULL,
  role_name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, role_name)
);

CREATE TABLE IF NOT EXISTS role_permissions (
  tenant_id TEXT NOT NULL,
  role_name TEXT NOT NULL,
  permission TEXT NOT NULL,
  PRIMARY KEY (tenant_id, role_name, permission),
  FOREIGN KEY (tenant_id, role_name) REFERENCES roles(tenant_id, role_name) ON DELETE CASCADE
);

-- Keep legacy api_keys.role but enrich via role_permissions when present.
CREATE INDEX IF NOT EXISTS idx_api_keys_tenant_role ON api_keys(tenant_id, role);

CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGSERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  actor_user_id TEXT,
  actor_role TEXT,
  action TEXT NOT NULL,
  resource TEXT,
  status_code INT,
  ip TEXT,
  user_agent TEXT,
  request_id TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_time ON audit_logs(tenant_id, created_at DESC);

-- SSO (OIDC) configuration (scaffold)
CREATE TABLE IF NOT EXISTS sso_oidc_configs (
  tenant_id TEXT PRIMARY KEY,
  issuer_url TEXT NOT NULL,
  client_id TEXT NOT NULL,
  client_secret TEXT NOT NULL,
  redirect_url TEXT NOT NULL,
  scopes TEXT NOT NULL DEFAULT 'openid profile email',
  enabled BOOL NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Billing / plans / subscriptions / usage metering (reference implementation)
CREATE TABLE IF NOT EXISTS billing_plans (
  plan_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  monthly_base_cents INT NOT NULL DEFAULT 0,
  included_events BIGINT NOT NULL DEFAULT 0,
  included_contacts BIGINT NOT NULL DEFAULT 0,
  included_connectors INT NOT NULL DEFAULT 0,
  overage_event_cpm_cents INT NOT NULL DEFAULT 0, -- cents per 1,000 events
  overage_contact_cents INT NOT NULL DEFAULT 0,
  overage_connector_cents INT NOT NULL DEFAULT 0,
  is_active BOOL NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS billing_subscriptions (
  tenant_id TEXT PRIMARY KEY,
  plan_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active', -- active, past_due, canceled
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  canceled_at TIMESTAMPTZ,
  FOREIGN KEY (plan_id) REFERENCES billing_plans(plan_id)
);

CREATE TABLE IF NOT EXISTS usage_counters_daily (
  tenant_id TEXT NOT NULL,
  day DATE NOT NULL,
  events BIGINT NOT NULL DEFAULT 0,
  contacts BIGINT NOT NULL DEFAULT 0,
  connectors INT NOT NULL DEFAULT 0,
  PRIMARY KEY (tenant_id, day)
);

CREATE TABLE IF NOT EXISTS invoices (
  invoice_id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  subtotal_cents INT NOT NULL,
  tax_cents INT NOT NULL DEFAULT 0,
  total_cents INT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'issued', -- issued, paid, void
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB
);
CREATE INDEX IF NOT EXISTS idx_invoices_tenant_period ON invoices(tenant_id, period_start DESC);

-- Tenant policy templates
CREATE TABLE IF NOT EXISTS policy_templates (
  template_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  policy_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tenant_policies (
  tenant_id TEXT PRIMARY KEY,
  template_id TEXT,
  policy_json JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (template_id) REFERENCES policy_templates(template_id)
);

-- Marketplace publish automation: connector/app registration link
CREATE TABLE IF NOT EXISTS connector_registry (
  connector_id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  display_name TEXT NOT NULL,
  version TEXT NOT NULL DEFAULT '0.1.0',
  scopes TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft', -- draft, submitted, approved, published
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_connector_registry_tenant ON connector_registry(tenant_id, created_at DESC);

-- Seed: default roles and permissions for new tenants (reference)
-- NOTE: bootstrap endpoint may insert these.
