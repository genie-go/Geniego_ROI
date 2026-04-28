import express from "express";

type ExecutePayload = {
  execution_id: string;
  tenant_id: string;
  dry_run?: boolean;
  channel: "ads" | "email" | "crm" | "journey";
  action_type: string;
  payload: Record<string, any>;
};

const app = express();
app.use(express.json({ limit: "2mb" }));

app.get("/healthz", (_req, res) => res.json({ ok: true }));

app.post("/v1/execute", async (req, res) => {
  const p = req.body as ExecutePayload;

  // Scaffold-only: do not call external providers.
  // Implement provider-specific adapters here:
  // - Ads: Google Ads / Meta / Naver / Amazon Ads
  // - Email: SES / SendGrid
  // - CRM: HubSpot / Salesforce

  const result = {
    ok: true,
    execution_id: p.execution_id,
    channel: p.channel,
    action_type: p.action_type,
    provider: "stub",
    timestamp: new Date().toISOString(),
    applied: {
      payload: p.payload
    }
  };

  res.json(result);
});

const port = process.env.CONNECTORS_PORT || "9100";
app.listen(parseInt(port, 10), () => {
  console.log(`connectors listening on :${port}`);
});
