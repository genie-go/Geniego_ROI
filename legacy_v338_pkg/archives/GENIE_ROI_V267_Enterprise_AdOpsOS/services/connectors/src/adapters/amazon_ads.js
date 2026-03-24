const fs = require("fs");
const path = require("path");
const { fetchJson } = require("../http");

const SNAP_DIR = process.env.SNAP_DIR || "/tmp/genie_roi_snapshots";
const AMAZON_ADS_API_BASE = process.env.AMAZON_ADS_API_BASE || "https://advertising-api.amazon.com";
const AMAZON_ADS_ACCESS_TOKEN = process.env.AMAZON_ADS_ACCESS_TOKEN || (process.env.AMAZON_ADS_ACCESS_TOKEN_FILE ? fs.readFileSync(process.env.AMAZON_ADS_ACCESS_TOKEN_FILE,"utf-8").trim() : "");
const AMAZON_ADS_PROFILE_ID = process.env.AMAZON_ADS_PROFILE_ID || "";
const AMAZON_ADS_CLIENT_ID = process.env.AMAZON_ADS_CLIENT_ID || "";
const AMAZON_ADS_CAMPAIGN_IDS = (process.env.AMAZON_ADS_CAMPAIGN_IDS || "").split(",").map(s=>s.trim()).filter(Boolean);
const AMAZON_ADS_SP_ADGROUP_IDS = (process.env.AMAZON_ADS_SP_ADGROUP_IDS || "").split(",").map(s=>s.trim()).filter(Boolean);

function ensureDir(p){ if (!fs.existsSync(p)) fs.mkdirSync(p,{recursive:true}); }
ensureDir(SNAP_DIR);
function snapPath(execution_id, campaign_id){ return path.join(SNAP_DIR, `amazon_ads_${execution_id}_${campaign_id}.json`); 
function snapPathAdGroup(execution_id, adgroup_id){ return path.join(SNAP_DIR, `amazon_ads_sp_adgroup_${execution_id}_${adgroup_id}.json`); }
}

function headers(){
  const h = {
    "Content-Type":"application/json",
    "Amazon-Advertising-API-Scope": AMAZON_ADS_PROFILE_ID,
    "Authorization": `Bearer ${AMAZON_ADS_ACCESS_TOKEN}`,
  };
  if (AMAZON_ADS_CLIENT_ID) h["Amazon-Advertising-API-ClientId"] = AMAZON_ADS_CLIENT_ID;
  return h;
}


async function getSpAdGroup(adGroupId){
  const url = `${AMAZON_ADS_API_BASE}/v2/sp/adGroups?adGroupIdFilter=${encodeURIComponent(adGroupId)}`;
  const { data } = await fetchJson(url, { method:"GET", headers: headers() });
  const arr = Array.isArray(data) ? data : (data && data.adGroups ? data.adGroups : []);
  const g = arr && arr.length ? arr[0] : null;
  if (!g) throw new Error(`Amazon SP adGroup not found: ${adGroupId}`);
  return g;
}

async function putSpAdGroupDefaultBid(adGroupId, defaultBid){
  const url = `${AMAZON_ADS_API_BASE}/v2/sp/adGroups`;
  const body = [{ adGroupId: Number(adGroupId), defaultBid: Number(defaultBid) }];
  const { data } = await fetchJson(url, { method:"PUT", headers: headers(), body: JSON.stringify(body) });
  return data;
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

    const aBudget = (actions||[]).find(x=>x && (x.type==="set_budget" || x.type==="set_campaign_budget"));
    const aState = (actions||[]).find(x=>x && (x.type==="set_campaign_state" || x.type==="set_state"));
    const aSpBid = (actions||[]).find(x=>x && (x.type==="set_sp_adgroup_default_bid" || x.type==="set_sp_bid" || x.type==="set_adgroup_bid"));
    if (!aBudget && !aState && !aSpBid) return { ok:true, channel:"amazon_ads", results:[{skipped:true, reason:"no_supported_action"}] }; return { ok:true, channel:"amazon_ads", results:[{skipped:true, reason:"no_supported_action"}] };

    const results = [];

    // (1) Budget updates
    if (aBudget) {
    for (const cid of AMAZON_ADS_CAMPAIGN_IDS) {
      const snap = await getCampaign(cid);
      fs.writeFileSync(snapPath(execution_id, cid), JSON.stringify(snap, null, 2));
      const oldBudget = snap.dailyBudget;
      const newBudget = aBudget ? aBudget.value : null;

      if (String(oldBudget) === String(newBudget)) {
        results.push({ campaign_id: cid, skipped:true, reason:"idempotent", oldBudget, newBudget });
        continue;
      }
      if (dry_run) { results.push({ campaign_id: cid, dry_run:true, oldBudget, newBudget }); continue; }
      const resp = await updateCampaignBudget(cid, newBudget);
      results.push({ campaign_id: cid, oldBudget, newBudget, resp });
}
}

// (2) Campaign state updates (enabled/paused/archived)
if (aState) {
  const desired = String(aState.value||"").toLowerCase();
  for (const cid of AMAZON_ADS_CAMPAIGN_IDS) {
    const snap = await getCampaign(cid);
    const snapObj = Object.assign({}, snap);
    fs.writeFileSync(snapPath(execution_id, cid+"_state"), JSON.stringify(snapObj, null, 2));
    const oldState = String(snap.state||"").toLowerCase();
    if (oldState === desired) { results.push({ campaign_id: cid, skipped:true, reason:"idempotent_state", oldState, newState: desired }); continue; }
    if (dry_run) { results.push({ campaign_id: cid, dry_run:true, oldState, newState: desired }); continue; }
    const url = `${AMAZON_ADS_API_BASE}/v2/campaigns`;
    const payload = [{ campaignId: Number(cid), state: desired }];
    const { data } = await fetchJson(url, { method:"PUT", headers: headers(), body: JSON.stringify(payload) });
    results.push({ campaign_id: cid, oldState, newState: desired, resp: data });
  }
}

// rollback campaign states
for (const cid of AMAZON_ADS_CAMPAIGN_IDS) {
  const p2 = snapPath(execution_id, cid+"_state");
  if (!fs.existsSync(p2)) { results.push({ campaign_id: cid, skipped:true, reason:"no_snapshot_state" }); continue; }
  const snap = JSON.parse(fs.readFileSync(p2,"utf-8"));
  const restoreState = String(snap.state||"").toLowerCase();
  if (!restoreState) { results.push({ campaign_id: cid, skipped:true, reason:"empty_restore_state" }); continue; }
  if (dry_run) { results.push({ campaign_id: cid, dry_run:true, restore_state: restoreState }); continue; }
  const url = `${AMAZON_ADS_API_BASE}/v2/campaigns`;
  const payload = [{ campaignId: Number(cid), state: restoreState }];
  const { data } = await fetchJson(url, { method:"PUT", headers: headers(), body: JSON.stringify(payload) });
  results.push({ campaign_id: cid, restore_state: restoreState, resp: data });
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
    
    // (3) Sponsored Products adGroup default bid
    if (aSpBid) {
      if (!AMAZON_ADS_SP_ADGROUP_IDS.length) throw new Error("Amazon Ads missing AMAZON_ADS_SP_ADGROUP_IDS for Sponsored Products bid");
      const newBid = Number(aSpBid.value || process.env.AMAZON_ADS_SP_NEW_BID || "0");
      if (!newBid || newBid <= 0) throw new Error("Amazon Ads missing/invalid bid value for Sponsored Products (set value or AMAZON_ADS_SP_NEW_BID)");
      for (const gid of AMAZON_ADS_SP_ADGROUP_IDS) {
        const snap = await getSpAdGroup(gid);
        const sp = snapPathAdGroup(execution_id, gid);
        fs.writeFileSync(sp, JSON.stringify({ kind:"sp_adgroup", ...snap }, null, 2));
        const oldBid = Number(snap.defaultBid || snap.default_bid || 0);
        if (Math.abs(oldBid - newBid) < 1e-9) {
          results.push({ sp_adgroup_id: gid, idempotent:true, oldBid, newBid });
          continue;
        }
        if (dry_run) { results.push({ sp_adgroup_id: gid, dry_run:true, oldBid, newBid }); continue; }
        try {
          const resp = await putSpAdGroupDefaultBid(gid, newBid);
          results.push({ sp_adgroup_id: gid, oldBid, newBid, resp });
        } catch (e) {
          // rollback
          try {
            await putSpAdGroupDefaultBid(gid, oldBid);
            results.push({ sp_adgroup_id: gid, rollback_attempted:true, rollback_to: oldBid, error: String(e && e.message || e) });
          } catch (re) {
            results.push({ sp_adgroup_id: gid, rollback_failed:true, rollback_to: oldBid, error: String(e && e.message || e), rollback_error: String(re && re.message || re) });
          }
        }
      }
    }

return { ok:true, channel:"amazon_ads", results };
  }
};
