-- V293: Journey retry/DLQ primitives + Drilldown decision pack helpers

-- 1) Track step failures for controlled retries (instead of failing enrollment immediately)
CREATE TABLE IF NOT EXISTS journey_step_failures (
  tenant_id TEXT NOT NULL,
  enrollment_id TEXT NOT NULL,
  journey_id TEXT NOT NULL,
  step_order INT NOT NULL,
  attempts INT NOT NULL DEFAULT 0,
  next_retry_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_error TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'PENDING', -- PENDING|GAVE_UP|RESOLVED
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, enrollment_id, step_order)
);

CREATE INDEX IF NOT EXISTS idx_journey_step_failures_due
  ON journey_step_failures (tenant_id, next_retry_at)
  WHERE status='PENDING';

-- 2) Optional helper view for deal "decision pack" (simple proxy: incremental revenue - spend)
-- This is intentionally light; real product would include MMM/MTA and CI bands.
CREATE OR REPLACE VIEW v293_deal_decision_pack AS
SELECT
  d.tenant_id,
  d.deal_id,
  d.campaign_id,
  d.day,
  d.incremental_revenue,
  d.spend,
  (d.incremental_revenue - d.spend) AS incremental_profit,
  CASE
    WHEN d.spend = 0 THEN NULL
    ELSE (d.incremental_revenue - d.spend) / NULLIF(d.spend,0)
  END AS roi_ratio
FROM deal_ledger d;
