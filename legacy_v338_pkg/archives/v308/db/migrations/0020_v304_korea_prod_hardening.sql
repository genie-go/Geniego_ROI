-- V304: Korea commerce production-hardening (claims, partial shipment, rate-limit state improvements)
-- Keep V303 tables; add minimal columns to ease analytics and automation.

ALTER TABLE IF EXISTS commerce_order_events
  ADD COLUMN IF NOT EXISTS claim_type TEXT,
  ADD COLUMN IF NOT EXISTS claim_status TEXT,
  ADD COLUMN IF NOT EXISTS reason_code TEXT,
  ADD COLUMN IF NOT EXISTS reason_text TEXT,
  ADD COLUMN IF NOT EXISTS partial_shipment BOOLEAN DEFAULT FALSE;

-- Helpful indexes for claim analytics
CREATE INDEX IF NOT EXISTS idx_commerce_order_events_claim
  ON commerce_order_events(tenant_id, channel, claim_type, occurred_at);

-- Default rate limits (can be overridden per tenant/channel/scope)
INSERT INTO commerce_rate_limits(tenant_id, channel, scope, rps, burst)
VALUES
  ('default','coupang','orders', 0.8, 20),
  ('default','coupang','claims', 0.8, 20),
  ('default','cafe24','orders', 2.0, 40),
  ('default','cafe24','claims', 2.0, 40),
  ('default','naver_smartstore','orders', 1.0, 20),
  ('default','naver_smartstore','claims', 1.0, 20)
ON CONFLICT DO NOTHING;
