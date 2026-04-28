const express = require("express");
const app = express();
app.use(express.json());

const DRY_RUN = (process.env.DRY_RUN || "true").toLowerCase() === "true";
const capabilities = require("./capabilities");
const adapters = require("./adapters");
const { validateActions } = require("./contract");

app.get("/healthz", (req,res)=>res.json({ok:true}));

app.post("/v260/connectors/execute", async (req,res) => {
  const { execution_id, channel, actions, dry_run } = req.body || {};
  if (!execution_id || !channel) return res.status(400).json({error:"missing_fields"});
  if (!capabilities[channel]) return res.status(400).json({error:"unknown_channel", channel});
  if (!validateActions(actions || [])) return res.status(400).json({error:"bad_actions"});

  const useDry = (dry_run !== undefined) ? !!dry_run : DRY_RUN;
  const adapter = adapters[channel] || adapters.stub;
  const result = await adapter.execute({ execution_id, channel, actions: actions || [], dry_run: useDry, cap: capabilities[channel] });

  return res.json({ ok:true, dry_run: useDry, result });
});

app.post("/v260/connectors/rollback", async (req,res) => {
  const { execution_id, channel, dry_run } = req.body || {};
  if (!execution_id || !channel) return res.status(400).json({error:"missing_fields"});
  const useDry = (dry_run !== undefined) ? !!dry_run : DRY_RUN;

  const adapter = adapters[channel] || adapters.stub;
  const result = await adapter.rollback({ execution_id, channel, dry_run: useDry });

  return res.json({ ok:true, dry_run: useDry, result });
});

app.listen(3000, ()=>console.log(JSON.stringify({ts:new Date().toISOString(), msg:"connectors_start", port:3000, dry_run:DRY_RUN})));
