const express = require("express");
const pinoHttp = require("pino-http");

const { getAdapter } = require("./registry");
const { capabilities } = require("./capabilities");

const app = express();
app.use(express.json({ limit: "1mb" }));
app.use(pinoHttp());

app.get("/healthz", (req, res) => res.json({ ok: true }));

app.get("/v254/connectors/capabilities", (req, res) => {
  res.json({ capabilities });
});

app.post("/v254/connectors/:channel/execute", async (req, res) => {
  const channel = req.params.channel;
  const adapter = getAdapter(channel);
  const dryRun = !!req.body.dry_run;

  // Safety: even if DRY_RUN=false, this reference implementation does NOT call real ad APIs.
  // Implement real API calls in adapters/ and add secrets handling + retries + idempotency.
  const result = await adapter.execute({ ...req.body, dry_run: dryRun });
  res.json(result);
});

app.post("/v254/connectors/:channel/rollback", async (req, res) => {
  const channel = req.params.channel;
  const adapter = getAdapter(channel);
  const dryRun = !!req.body.dry_run;
  const result = await adapter.rollback({ ...req.body, dry_run: dryRun });
  res.json(result);
});

const port = process.env.CONNECTORS_PORT || 3000;
app.listen(port, () => {
  console.log(`connectors listening on :${port}`);
});
