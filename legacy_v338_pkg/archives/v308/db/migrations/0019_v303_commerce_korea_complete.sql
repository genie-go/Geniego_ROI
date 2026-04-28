-- V303: Korea commerce "complete" ops additions: credentials/tokens, reservations, events, rate-limit state
CREATE TABLE IF NOT EXISTS commerce_channel_credentials (
  tenant_id TEXT NOT NULL,
  channel TEXT NOT NULL,
  creds_json TEXT NOT NULL,
  schema_version TEXT DEFAULT 'v2',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, channel)
);

CREATE TABLE IF NOT EXISTS commerce_channel_tokens (
  tenant_id TEXT NOT NULL,
  channel TEXT NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  expires_at TIMESTAMPTZ,
  token_json TEXT DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, channel)
);

CREATE TABLE IF NOT EXISTS commerce_inventory_reservations (
  reservation_id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  channel TEXT NOT NULL,
  order_id TEXT NOT NULL,
  sku TEXT NOT NULL,
  qty INT NOT NULL,
  status TEXT NOT NULL DEFAULT 'reserved', -- reserved|released|consumed
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_commerce_resv_order ON commerce_inventory_reservations(tenant_id, order_id);

CREATE TABLE IF NOT EXISTS commerce_order_events (
  event_id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  channel TEXT NOT NULL,
  order_id TEXT NOT NULL,
  event_type TEXT NOT NULL, -- created|cancelled|returned|fulfilled
  occurred_at TIMESTAMPTZ NOT NULL,
  payload_json TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_commerce_order_events_order ON commerce_order_events(tenant_id, order_id, occurred_at);

-- Rate-limit state (token bucket) for worker-side throttling
CREATE TABLE IF NOT EXISTS commerce_rate_limit_state (
  tenant_id TEXT NOT NULL,
  channel TEXT NOT NULL,
  scope TEXT NOT NULL DEFAULT 'default',
  tokens DOUBLE PRECISION NOT NULL DEFAULT 0,
  last_refill_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, channel, scope)
);
