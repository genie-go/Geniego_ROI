-- V268 additions: unified approval queue + API key expiry/scopes + connector deep objects + export extras
ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS scopes JSONB;
ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_api_keys_expires ON api_keys(expires_at);

-- Unified approval items view-like table
CREATE TABLE IF NOT EXISTS approval_items (
  id BIGSERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  kind TEXT NOT NULL, -- EXECUTION, POLICY
  ref_id TEXT NOT NULL, -- execution_id or policy_change_request_id
  status TEXT NOT NULL, -- PENDING, APPROVED, REJECTED, APPLIED, etc
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  payload JSONB NOT NULL DEFAULT '{}',
  UNIQUE(tenant_id, kind, ref_id)
);

CREATE INDEX IF NOT EXISTS idx_approval_items_status ON approval_items(tenant_id, status);

-- Backfill: create approval_items rows for existing pending executions and pending policy changes
INSERT INTO approval_items(tenant_id, kind, ref_id, status, payload)
SELECT tenant_id, 'EXECUTION', execution_id, 'PENDING', COALESCE(approval,'{}'::jsonb)
FROM executions
WHERE status='PENDING_APPROVAL'
ON CONFLICT DO NOTHING;

INSERT INTO approval_items(tenant_id, kind, ref_id, status, payload)
SELECT tenant_id, 'POLICY', id::text, status, jsonb_build_object('diff',diff,'proposed_policy',proposed_policy)
FROM policy_change_requests
WHERE status IN ('PENDING','APPROVED1')
ON CONFLICT DO NOTHING;
