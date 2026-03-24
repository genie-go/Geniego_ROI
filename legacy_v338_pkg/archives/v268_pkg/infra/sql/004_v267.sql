-- V267 additions: policy change requests with 2-step approval + export support
CREATE TABLE IF NOT EXISTS policy_change_requests (
  id BIGSERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  status TEXT NOT NULL, -- PENDING, APPROVED1, APPLIED, REJECTED
  requested_by TEXT NOT NULL,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  proposed_policy JSONB NOT NULL,
  diff JSONB NOT NULL DEFAULT '[]'::jsonb,
  reason TEXT,
  approved1_by TEXT,
  approved1_at TIMESTAMPTZ,
  approved2_by TEXT,
  approved2_at TIMESTAMPTZ,
  applied_at TIMESTAMPTZ,
  rejected_by TEXT,
  rejected_at TIMESTAMPTZ,
  reject_reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_policy_change_requests_tenant ON policy_change_requests(tenant_id, requested_at DESC);
