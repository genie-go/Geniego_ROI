const fs = require("fs");
const path = require("path");
const { fetchJson } = require("../http");

const SNAP_DIR = process.env.SNAP_DIR || "/tmp/genie_roi_snapshots";
const AMAZON_ADS_API_BASE = process.env.AMAZON_ADS_API_BASE || "https://advertising-api.amazon.com";
const AMAZON_ADS_ACCESS_TOKEN = process.env.AMAZON_ADS_ACCESS_TOKEN || (process.env.AMAZON_ADS_ACCESS_TOKEN_FILE ? fs.readFileSync(process.env.AMAZON_ADS_ACCESS_TOKEN_FILE,"utf-8").trim() : "");
const AMAZON_ADS_PROFILE_ID = process.env.AMAZON_ADS_PROFILE_ID || "";
const AMAZON_ADS_CLIENT_ID = process.env.AMAZON_ADS_CLIENT_ID || "";
const AMAZON_ADS_CAMPAIGN_IDS = (process.env.AMAZON_ADS_CAMPAIGN_IDS || "").split(",").map(s=>s.trim()).filter(Boolean);

function ensureDir(p){ if (!fs.existsSync(p)) fs.mkdirSync(p,{recursive:true}); }
ensureDir(SNAP_DIR);
function snapPath(execution_id, campaign_id){ return path.join(SNAP_DIR, `amazon_ads_${execution_id}_${campaign_id}.json`); }

function headers(){
  const h = {
    "Content-Type":"application/json",
    "Amazon-Advertising-API-Scope": AMAZON_ADS_PROFILE_ID,
    "Authorization": `Bearer ${AMAZON_ADS_ACCESS_TOKEN}`,
  };
  if (AMAZON_ADS_CLIENT_ID) h["Amazon-Advertising-API-ClientId"] = AMAZON_ADS_CLIENT_ID;
  return h;
}

async function getCampaign(campaign_id){
  // Many accounts support listing with filter instead of a direct GET; keep both.
  const listUrl = `${AMAZON_ADS_API_BASE}/v2/campaigns?campaignIdFilter=${encodeURIComponent(campaign_id)}`;
  const { data } = await fetchJson(listUrl, { method:"GET", headers: headers() });
  if (Array.isArray(data) && data.length) return data[0];
  throw new Error(`Amazon Ads campaign not found: ${campaign_id}`);
}

async function updateCampaignBudget(campaign_id, dailyBudget){
  const url = `${AMAZON_ADS_API_BASE}/v2/campaigns`;
  const payload = [{ campaignId: Number(campaign_id), dailyBudget: Number(dailyBudget) }];
  const { data } = await fetchJson(url, { method:"PUT", headers: headers(), body: JSON.stringify(payload) });
  return data;
}

module.exports = {
  capabilities: { supports: ["snapshot","rollback","quota_retries"] },

  async execute({ execution_id, actions, dry_run }) {
    if (!AMAZON_ADS_ACCESS_TOKEN || !AMAZON_ADS_PROFILE_ID) {
      throw new Error("Amazon Ads missing AMAZON_ADS_ACCESS_TOKEN / AMAZON_ADS_PROFILE_ID");
    }
    if (!AMAZON_ADS_CAMPAIGN_IDS.length) throw new Error("Amazon Ads missing AMAZON_ADS_CAMPAIGN_IDS");

    const a = (actions||[]).find(x=>x && (x.type==="set_budget" || x.type==="set_campaign_budget"));
    if (!a) return { ok:true, channel:"amazon_ads", results:[{skipped:true, reason:"no_budget_action"}] };

    const results = [];
    for (const cid of AMAZON_ADS_CAMPAIGN_IDS) {
      const snap = await getCampaign(cid);
      fs.writeFileSync(snapPath(execution_id, cid), JSON.stringify(snap, null, 2));
      const oldBudget = snap.dailyBudget;
      const newBudget = a.value;

      if (String(oldBudget) === String(newBudget)) {
        results.push({ campaign_id: cid, skipped:true, reason:"idempotent", oldBudget, newBudget });
        continue;
      }
      if (dry_run) { results.push({ campaign_id: cid, dry_run:true, oldBudget, newBudget }); continue; }
      const resp = await updateCampaignBudget(cid, newBudget);
      results.push({ campaign_id: cid, oldBudget, newBudget, resp });
    }
    return { ok:true, channel:"amazon_ads", results };
  },

  async rollback({ execution_id, dry_run }) {
    const results = [];
    for (const cid of AMAZON_ADS_CAMPAIGN_IDS) {
      const p = snapPath(execution_id, cid);
      if (!fs.existsSync(p)) { results.push({ campaign_id: cid, skipped:true, reason:"no_snapshot" }); continue; }
      const snap = JSON.parse(fs.readFileSync(p,"utf-8"));
      const restore = snap.dailyBudget;
      if (dry_run) { results.push({ campaign_id: cid, dry_run:true, restore_budget: restore }); continue; }
      const resp = await updateCampaignBudget(cid, restore);
      results.push({ campaign_id: cid, restore_budget: restore, resp });
    }
    return { ok:true, channel:"amazon_ads", results };
  }
};
