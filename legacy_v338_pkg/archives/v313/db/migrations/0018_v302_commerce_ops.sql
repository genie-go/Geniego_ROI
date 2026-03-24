-- V302: Commerce operations hardening: jobs/items/results, rate limits, partial failure reporting.
CREATE TABLE IF NOT EXISTS commerce_jobs (
  job_id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  channel TEXT NOT NULL,
  kind TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  message TEXT DEFAULT '',
  input_json TEXT DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS commerce_job_items (
  item_id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES commerce_jobs(job_id) ON DELETE CASCADE,
  seq INT NOT NULL,
  external_key TEXT DEFAULT '',
  payload_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  attempt INT NOT NULL DEFAULT 0,
  next_run_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_error TEXT DEFAULT '',
  last_response_json TEXT DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_commerce_job_items_job ON commerce_job_items(job_id, status, next_run_at);

CREATE TABLE IF NOT EXISTS commerce_rate_limits (
  tenant_id TEXT NOT NULL,
  channel TEXT NOT NULL,
  scope TEXT NOT NULL,
  rps INT NOT NULL DEFAULT 2,
  burst INT NOT NULL DEFAULT 4,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, channel, scope)
);

ALTER TABLE IF EXISTS commerce_channel_credentials
  ADD COLUMN IF NOT EXISTS schema_version TEXT DEFAULT 'v1';

CREATE OR REPLACE VIEW v_commerce_job_summary AS
SELECT
  j.job_id,
  j.tenant_id,
  j.channel,
  j.kind,
  j.status,
  j.created_at,
  j.started_at,
  j.finished_at,
  j.message,
  (SELECT COUNT(*) FROM commerce_job_items i WHERE i.job_id=j.job_id) AS total_items,
  (SELECT COUNT(*) FROM commerce_job_items i WHERE i.job_id=j.job_id AND i.status='success') AS success_items,
  (SELECT COUNT(*) FROM commerce_job_items i WHERE i.job_id=j.job_id AND i.status='failed') AS failed_items
FROM commerce_jobs j;
