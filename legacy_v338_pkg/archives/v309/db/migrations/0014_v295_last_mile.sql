-- V295 Last mile upgrades: ordered funnel support + marketplace appstore workflows
-- + indexes to speed analytics.

-- Ordered funnel indexes
CREATE INDEX IF NOT EXISTS idx_events_tenant_contact_time ON events(tenant_id, contact_id, occurred_at);
CREATE INDEX IF NOT EXISTS idx_events_tenant_type_time ON events(tenant_id, event_type, occurred_at);

-- Marketplace appstore workflow tables
CREATE TABLE IF NOT EXISTS marketplace_app_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL,
  app_id uuid NOT NULL,
  version text NOT NULL,
  release_notes text NOT NULL DEFAULT '',
  package_url text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, app_id, version)
);

CREATE TABLE IF NOT EXISTS marketplace_installs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL,
  app_id uuid NOT NULL,
  installed_by text NOT NULL DEFAULT '',
  installed_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'installed', -- installed|disabled|uninstalled
  config_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE(tenant_id, app_id)
);


CREATE TABLE IF NOT EXISTS marketplace_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL,
  app_id uuid NOT NULL,
  reviewer text NOT NULL DEFAULT '',
  rating int NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title text NOT NULL DEFAULT '',
  body text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Optional publisher workflow (draft -> submitted -> approved -> published)
CREATE TABLE IF NOT EXISTS marketplace_publisher_workflows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL,
  app_id uuid NOT NULL,
  state text NOT NULL DEFAULT 'draft',
  notes text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mp_installs_tenant_app ON marketplace_installs(tenant_id, app_id);
CREATE INDEX IF NOT EXISTS idx_mp_reviews_tenant_app ON marketplace_reviews(tenant_id, app_id);
CREATE INDEX IF NOT EXISTS idx_mp_app_versions_tenant_app ON marketplace_app_versions(tenant_id, app_id);
