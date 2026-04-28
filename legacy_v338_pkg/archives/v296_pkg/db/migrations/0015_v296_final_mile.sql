-- V296 Final-mile-of-final-mile:
-- 1) Experiment sample size + bayesian credible intervals (no DB schema required; computed in API)
-- 2) Deal recommendations: support guardrail config and richer stats (no DB schema required)
-- 3) Marketplace: scopes approval flow + version deploy + weighted review ranking + publisher console

-- Marketplace scopes
CREATE TABLE IF NOT EXISTS marketplace_scopes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope_key text NOT NULL UNIQUE,
  title text NOT NULL,
  description text NOT NULL DEFAULT ''
);

-- App version lifecycle
ALTER TABLE marketplace_app_versions
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft', -- draft|submitted|approved|published|rolled_back
  ADD COLUMN IF NOT EXISTS published_at timestamptz;

-- Scope requests per version
CREATE TABLE IF NOT EXISTS marketplace_app_scope_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL,
  app_version_id uuid NOT NULL,
  scope_key text NOT NULL,
  status text NOT NULL DEFAULT 'requested', -- requested|approved|denied
  reviewer text NOT NULL DEFAULT '',
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, app_version_id, scope_key)
);

-- Publisher console (lightweight)
CREATE TABLE IF NOT EXISTS marketplace_publishers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL,
  name text NOT NULL,
  contact_email text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, name)
);

CREATE TABLE IF NOT EXISTS marketplace_publisher_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL,
  publisher_id uuid NOT NULL,
  member_email text NOT NULL,
  role text NOT NULL DEFAULT 'member', -- owner|admin|member
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, publisher_id, member_email)
);

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_mkt_scope_requests_tenant_version ON marketplace_app_scope_requests(tenant_id, app_version_id);
CREATE INDEX IF NOT EXISTS idx_mkt_reviews_tenant_app ON marketplace_reviews(tenant_id, app_id);
