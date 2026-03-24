import express from "express";
import { z } from "zod";

const app = express();
app.use(express.json({ limit: "2mb" }));
const DRY_RUN = (process.env.DRY_RUN || "true") === "true";

const ExecutePayload = z.object({
  execution_id: z.string(),
  request: z.object({
    tenant_id: z.string().optional(),
    actor: z.string().optional(),
    channel: z.string(),
    objective: z.string().optional(),
    current_budget: z.number(),
    proposed_budget: z.number(),
    currency: z.string().optional(),
    metadata: z.record(z.any()).optional(),
  }),
  dry_run: z.boolean().optional(),
});

const CapabilityMatrix = {
  meta:   { supports_adset_budget: true,  supports_campaign_budget: true,  supports_pause_resume: true },
  google: { supports_campaign_budget: true, supports_adset_budget: false, supports_pause_resume: true },
  tiktok: { supports_campaign_budget: true, supports_adset_budget: true,  supports_pause_resume: true },
  naver:  { supports_campaign_budget: true, supports_adset_budget: false, supports_pause_resume: true },
  kakao:  { supports_campaign_budget: true, supports_adset_budget: false, supports_pause_resume: true },
};

app.get("/health", (_req, res) => res.json({ ok: true, dry_run: DRY_RUN }));

app.post("/execute", async (req, res) => {
  const parsed = ExecutePayload.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_payload", detail: parsed.error.flatten() });

  const payload = parsed.data;
  const channel = payload.request.channel;
  const caps = CapabilityMatrix[channel] || null;
  if (!caps) return res.status(400).json({ error: "unsupported_channel" });

  const effectiveDryRun = payload.dry_run ?? DRY_RUN;
  const snapshot = {
    before_budget: payload.request.current_budget,
    after_budget: payload.request.proposed_budget,
    currency: payload.request.currency || "KRW",
  };

  const forceFail = Boolean(payload.request.metadata?.force_fail);
  if (forceFail) {
    return res.status(500).json({ error: "simulated_failure", execution_id: payload.execution_id, channel, caps, snapshot, dry_run: effectiveDryRun });
  }

  return res.json({
    ok: true,
    execution_id: payload.execution_id,
    channel,
    caps,
    dry_run: effectiveDryRun,
    applied: effectiveDryRun ? "no (dry-run)" : "yes",
    snapshot,
    note: "replace stub with real publisher API calls + auth + quota + retries + idempotency",
  });
});

app.post("/rollback", (_req, res) => res.json({ ok: true, note: "rollback simulated (no-op in stub)" }));

app.listen(3001, "0.0.0.0", () => console.log(JSON.stringify({ msg: "connectors up", port: 3001, dry_run: DRY_RUN })));
