import express from "express";
import { ExecutePayload } from "./contracts.js";
import { adapters } from "./providers/index.js";

const app = express();
app.use(express.json({ limit: "4mb" }));

app.get("/healthz", (_req, res) => res.json({ ok: true }));

app.post("/v1/execute", async (req, res) => {
  const p = req.body as ExecutePayload;
  const provider = (p.provider || (p.payload?.provider as string) || "").toLowerCase();

  const adapter = adapters[provider];
  if (!adapter) {
    res.status(400).json({ ok: false, error: `unknown provider: ${provider}` });
    return;
  }

  try {
    const result = await adapter.execute({ ...p, provider });
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ ok: false, provider, error: e?.message || "provider_error" });
  }
});

const port = parseInt(process.env.CONNECTORS_PORT || "9100", 10);
app.listen(port, () => console.log(`connectors listening on :${port}`));
