const fs = require("fs");
const path = require("path");
const { fetchJson } = require("../http");

const SNAP_DIR = process.env.SNAP_DIR || "/tmp/genie_roi_snapshots";
const GOOGLE_ADS_API_BASE = process.env.GOOGLE_ADS_API_BASE || "https://googleads.googleapis.com";
const GOOGLE_ADS_API_VERSION = process.env.GOOGLE_ADS_API_VERSION || "v16";

const GOOGLE_ADS_ACCESS_TOKEN = process.env.GOOGLE_ADS_ACCESS_TOKEN || (process.env.GOOGLE_ADS_ACCESS_TOKEN_FILE ? fs.readFileSync(process.env.GOOGLE_ADS_ACCESS_TOKEN_FILE,"utf-8").trim() : "");
const GOOGLE_ADS_DEVELOPER_TOKEN = process.env.GOOGLE_ADS_DEVELOPER_TOKEN || "";
const GOOGLE_ADS_LOGIN_CUSTOMER_ID = (process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID || "").replace(/-/g,"");
const GOOGLE_ADS_CUSTOMER_ID = (process.env.GOOGLE_ADS_CUSTOMER_ID || "").replace(/-/g,"");
const GOOGLE_ADS_BUDGET_RESOURCE_NAMES = (process.env.GOOGLE_ADS_BUDGET_RESOURCE_NAMES || "").split(",").map(s=>s.trim()).filter(Boolean);

function ensureDir(p){ if (!fs.existsSync(p)) fs.mkdirSync(p,{recursive:true}); }
ensureDir(SNAP_DIR);
function snapPath(execution_id, rn){ 
  const safe = rn.replace(/[^\w]+/g,"_").slice(-120);
  return path.join(SNAP_DIR, `google_ads_${execution_id}_${safe}.json`);
}

function headers(){
  const h = {
    "Content-Type":"application/json",
    "Authorization": `Bearer ${GOOGLE_ADS_ACCESS_TOKEN}`,
    "developer-token": GOOGLE_ADS_DEVELOPER_TOKEN,
  };
  if (GOOGLE_ADS_LOGIN_CUSTOMER_ID) h["login-customer-id"] = GOOGLE_ADS_LOGIN_CUSTOMER_ID;
  return h;
}

async function searchBudget(resource_name){
  const url = `${GOOGLE_ADS_API_BASE}/${GOOGLE_ADS_API_VERSION}/customers/${GOOGLE_ADS_CUSTOMER_ID}/googleAds:search`;
  const query = `SELECT campaign_budget.resource_name, campaign_budget.amount_micros FROM campaign_budget WHERE campaign_budget.resource_name = '${resource_name}' LIMIT 1`;
  const { data } = await fetchJson(url, { method:"POST", headers: headers(), body: JSON.stringify({ query }) });
  const rows = data && data.results ? data.results : [];
  if (!rows.length) throw new Error(`Google Ads budget not found: ${resource_name}`);
  const b = rows[0].campaignBudget || rows[0].campaign_budget || rows[0].campaignBudget;
  return {
    resource_name: (b && (b.resourceName || b.resource_name)) || resource_name,
    amount_micros: Number((b && (b.amountMicros || b.amount_micros)) || 0),
    raw: rows[0],
  };
}

async function mutateBudget(resource_name, amount_micros){
  const url = `${GOOGLE_ADS_API_BASE}/${GOOGLE_ADS_API_VERSION}/customers/${GOOGLE_ADS_CUSTOMER_ID}/campaignBudgets:mutate`;
  const body = {
    operations: [{
      update: {
        resourceName: resource_name,
        amountMicros: String(amount_micros),
      },
      updateMask: "amount_micros"
    }],
    partialFailure: false,
    validateOnly: false
  };
  const { data } = await fetchJson(url, { method:"POST", headers: headers(), body: JSON.stringify(body) });
  return data;
}

module.exports = {
  capabilities: { supports: ["snapshot","rollback","quota_retries"] },

  async execute({ execution_id, actions, dry_run }) {
    if (!GOOGLE_ADS_ACCESS_TOKEN || !GOOGLE_ADS_DEVELOPER_TOKEN || !GOOGLE_ADS_CUSTOMER_ID) {
      throw new Error("Google Ads missing GOOGLE_ADS_ACCESS_TOKEN / GOOGLE_ADS_DEVELOPER_TOKEN / GOOGLE_ADS_CUSTOMER_ID");
    }
    if (!GOOGLE_ADS_BUDGET_RESOURCE_NAMES.length) throw new Error("Google Ads missing GOOGLE_ADS_BUDGET_RESOURCE_NAMES");

    const a = (actions||[]).find(x=>x && (x.type==="set_budget" || x.type==="set_campaign_budget_micros" || x.type==="set_budget_micros"));
    if (!a) return { ok:true, channel:"google", results:[{skipped:true, reason:"no_budget_action"}] };

    // accept value as micros if large; or accept currency and convert by GOOGLE_ADS_BUDGET_UNIT_MICROS
    const unitMicros = Number(process.env.GOOGLE_ADS_BUDGET_UNIT_MICROS || "1000000"); // 1 currency unit = 1,000,000 micros
    const isMicros = !!process.env.GOOGLE_ADS_VALUE_IS_MICROS && (process.env.GOOGLE_ADS_VALUE_IS_MICROS.toLowerCase()==="true");
    const newMicros = isMicros ? Number(a.value) : Math.round(Number(a.value) * unitMicros);

    const results = [];
    for (const rn of GOOGLE_ADS_BUDGET_RESOURCE_NAMES) {
      const snap = await searchBudget(rn);
      fs.writeFileSync(snapPath(execution_id, rn), JSON.stringify(snap, null, 2));

      const oldMicros = snap.amount_micros;
      if (Number(oldMicros) === Number(newMicros)) {
        results.push({ budget_resource: rn, skipped:true, reason:"idempotent", oldMicros, newMicros });
        continue;
      }
      if (dry_run) { results.push({ budget_resource: rn, dry_run:true, oldMicros, newMicros }); continue; }
      const resp = await mutateBudget(rn, newMicros);
      results.push({ budget_resource: rn, oldMicros, newMicros, resp });
    }
    return { ok:true, channel:"google", results };
  },

  async rollback({ execution_id, dry_run }) {
    const results = [];
    for (const rn of GOOGLE_ADS_BUDGET_RESOURCE_NAMES) {
      const p = snapPath(execution_id, rn);
      if (!fs.existsSync(p)) { results.push({ budget_resource: rn, skipped:true, reason:"no_snapshot" }); continue; }
      const snap = JSON.parse(fs.readFileSync(p,"utf-8"));
      const restore = Number(snap.amount_micros);
      if (dry_run) { results.push({ budget_resource: rn, dry_run:true, restore_micros: restore }); continue; }
      const resp = await mutateBudget(rn, restore);
      results.push({ budget_resource: rn, restore_micros: restore, resp });
    }
    return { ok:true, channel:"google", results };
  }
};
