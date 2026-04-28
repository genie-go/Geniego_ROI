const fs = require("fs");
const path = require("path");
const { fetchJson } = require("../http");

const SNAP_DIR = process.env.SNAP_DIR || "/tmp/genie_roi_snapshots";
const AMAZON_ADS_API_BASE = process.env.AMAZON_ADS_API_BASE || "https://advertising-api.amazon.com";

const AMAZON_ADS_ACCESS_TOKEN = process.env.AMAZON_ADS_ACCESS_TOKEN ||
  (process.env.AMAZON_ADS_ACCESS_TOKEN_FILE ? fs.readFileSync(process.env.AMAZON_ADS_ACCESS_TOKEN_FILE, "utf-8").trim() : "");
const AMAZON_ADS_PROFILE_ID = process.env.AMAZON_ADS_PROFILE_ID || "";
const AMAZON_ADS_CLIENT_ID = process.env.AMAZON_ADS_CLIENT_ID || "";

const AMAZON_ADS_CAMPAIGN_IDS = (process.env.AMAZON_ADS_CAMPAIGN_IDS || "").split(",").map(s=>s.trim()).filter(Boolean);
const AMAZON_ADS_SP_ADGROUP_IDS = (process.env.AMAZON_ADS_SP_ADGROUP_IDS || "").split(",").map(s=>s.trim()).filter(Boolean);
const AMAZON_ADS_SP_KEYWORD_IDS = (process.env.AMAZON_ADS_SP_KEYWORD_IDS || "").split(",").map(s=>s.trim()).filter(Boolean);
const AMAZON_ADS_SP_TARGET_IDS = (process.env.AMAZON_ADS_SP_TARGET_IDS || "").split(",").map(s=>s.trim()).filter(Boolean);

function ensureDir(p){ if (!fs.existsSync(p)) fs.mkdirSync(p,{recursive:true}); }
ensureDir(SNAP_DIR);

function snapPathCampaign(execution_id, campaign_id){
  return path.join(SNAP_DIR, `amazon_ads_${execution_id}_campaign_${campaign_id}.json`);
}
function snapPathAdGroup(execution_id, adgroup_id){
  return path.join(SNAP_DIR, `amazon_ads_${execution_id}_sp_adgroup_${adgroup_id}.json`);
}
function snapPathKeyword(execution_id, keyword_id){
  return path.join(SNAP_DIR, `amazon_ads_${execution_id}_sp_keyword_${keyword_id}.json`);
}
function snapPathTarget(execution_id, target_id){
  return path.join(SNAP_DIR, `amazon_ads_${execution_id}_sp_target_${target_id}.json`);
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

// -------- Campaign (budget/state) --------
async function getCampaign(campaignId){
  const url = `${AMAZON_ADS_API_BASE}/v2/campaigns?campaignIdFilter=${encodeURIComponent(campaignId)}`;
  const { data } = await fetchJson(url, { method:"GET", headers: headers() });
  const arr = Array.isArray(data) ? data : [];
  const c = arr.find(x => String(x.campaignId) === String(campaignId)) || (arr.length ? arr[0] : null);
  if (!c) throw new Error(`Amazon campaign not found: ${campaignId}`);
  return c;
}

async function putCampaigns(updates){
  const url = `${AMAZON_ADS_API_BASE}/v2/campaigns`;
  const { data } = await fetchJson(url, { method:"PUT", headers: headers(), body: JSON.stringify(updates) });
  return data;
}

// -------- SP adGroups (defaultBid) --------
async function getSpAdGroup(adGroupId){
  const url = `${AMAZON_ADS_API_BASE}/v2/sp/adGroups?adGroupIdFilter=${encodeURIComponent(adGroupId)}`;
  const { data } = await fetchJson(url, { method:"GET", headers: headers() });
  const arr = Array.isArray(data) ? data : [];
  const g = arr.find(x => String(x.adGroupId) === String(adGroupId)) || (arr.length ? arr[0] : null);
  if (!g) throw new Error(`Amazon SP adGroup not found: ${adGroupId}`);
  return g;
}

async function putSpAdGroups(updates){
  const url = `${AMAZON_ADS_API_BASE}/v2/sp/adGroups`;
  const { data } = await fetchJson(url, { method:"PUT", headers: headers(), body: JSON.stringify(updates) });
  return data;
}

// -------- SP keywords (bid) --------
async function getSpKeyword(keywordId){
  const url = `${AMAZON_ADS_API_BASE}/v2/sp/keywords?keywordIdFilter=${encodeURIComponent(keywordId)}`;
  const { data } = await fetchJson(url, { method:"GET", headers: headers() });
  const arr = Array.isArray(data) ? data : [];
  const k = arr.find(x => String(x.keywordId) === String(keywordId)) || (arr.length ? arr[0] : null);
  if (!k) throw new Error(`Amazon SP keyword not found: ${keywordId}`);
  return k;
}

async function putSpKeywords(updates){
  const url = `${AMAZON_ADS_API_BASE}/v2/sp/keywords`;
  const { data } = await fetchJson(url, { method:"PUT", headers: headers(), body: JSON.stringify(updates) });
  return data;
}

// -------- SP targets (bid) --------
async function getSpTarget(targetId){
  const url = `${AMAZON_ADS_API_BASE}/v2/sp/targets?targetIdFilter=${encodeURIComponent(targetId)}`;
  const { data } = await fetchJson(url, { method:"GET", headers: headers() });
  const arr = Array.isArray(data) ? data : [];
  const t = arr.find(x => String(x.targetId) === String(targetId)) || (arr.length ? arr[0] : null);
  if (!t) throw new Error(`Amazon SP target not found: ${targetId}`);
  return t;
}

async function putSpTargets(updates){
  const url = `${AMAZON_ADS_API_BASE}/v2/sp/targets`;
  const { data } = await fetchJson(url, { method:"PUT", headers: headers(), body: JSON.stringify(updates) });
  return data;
}

// -------- Adapter contract --------
async function snapshot(execution_id){
  const snaps = [];

  for (const id of AMAZON_ADS_CAMPAIGN_IDS){
    const c = await getCampaign(id);
    const p = snapPathCampaign(execution_id, id);
    fs.writeFileSync(p, JSON.stringify(c, null, 2));
    snaps.push({ kind:"campaign", id, path:p });
  }
  for (const id of AMAZON_ADS_SP_ADGROUP_IDS){
    const g = await getSpAdGroup(id);
    const p = snapPathAdGroup(execution_id, id);
    fs.writeFileSync(p, JSON.stringify(g, null, 2));
    snaps.push({ kind:"sp_adgroup", id, path:p });
  }
  for (const id of AMAZON_ADS_SP_KEYWORD_IDS){
    const k = await getSpKeyword(id);
    const p = snapPathKeyword(execution_id, id);
    fs.writeFileSync(p, JSON.stringify(k, null, 2));
    snaps.push({ kind:"sp_keyword", id, path:p });
  }
  for (const id of AMAZON_ADS_SP_TARGET_IDS){
    const t = await getSpTarget(id);
    const p = snapPathTarget(execution_id, id);
    fs.writeFileSync(p, JSON.stringify(t, null, 2));
    snaps.push({ kind:"sp_target", id, path:p });
  }
  return { snaps };
}

async function execute(execution_id, action){
  if (!action || !action.type) throw new Error("missing_action_type");

  if (action.type === "set_campaign_budget"){
    const ids = action.campaign_ids && action.campaign_ids.length ? action.campaign_ids : AMAZON_ADS_CAMPAIGN_IDS;
    const budget = Number(action.daily_budget);
    if (!ids.length) return { ok:true, skipped:true, reason:"no_campaign_ids" };
    await snapshot(execution_id);
    const updates = ids.map(id => ({ campaignId: Number(id), dailyBudget: budget }));
    const res = await putCampaigns(updates);
    return { ok:true, result:res };
  }

  if (action.type === "set_campaign_state"){
    const ids = action.campaign_ids && action.campaign_ids.length ? action.campaign_ids : AMAZON_ADS_CAMPAIGN_IDS;
    const state = String(action.state || "").toLowerCase();
    if (!ids.length) return { ok:true, skipped:true, reason:"no_campaign_ids" };
    await snapshot(execution_id);
    const updates = ids.map(id => ({ campaignId: Number(id), state }));
    const res = await putCampaigns(updates);
    return { ok:true, result:res };
  }

  if (action.type === "set_sp_adgroup_default_bid"){
    const ids = action.adgroup_ids && action.adgroup_ids.length ? action.adgroup_ids : AMAZON_ADS_SP_ADGROUP_IDS;
    const bid = Number(action.default_bid);
    if (!ids.length) return { ok:true, skipped:true, reason:"no_adgroup_ids" };
    await snapshot(execution_id);
    const updates = ids.map(id => ({ adGroupId: Number(id), defaultBid: bid }));
    const res = await putSpAdGroups(updates);
    return { ok:true, result:res };
  }

  if (action.type === "set_sp_keyword_bid"){
    const ids = action.keyword_ids && action.keyword_ids.length ? action.keyword_ids : AMAZON_ADS_SP_KEYWORD_IDS;
    const bid = Number(action.bid);
    if (!ids.length) return { ok:true, skipped:true, reason:"no_keyword_ids" };
    await snapshot(execution_id);
    const updates = ids.map(id => ({ keywordId: Number(id), bid }));
    const res = await putSpKeywords(updates);
    return { ok:true, result:res };
  }

  if (action.type === "set_sp_target_bid"){
    const ids = action.target_ids && action.target_ids.length ? action.target_ids : AMAZON_ADS_SP_TARGET_IDS;
    const bid = Number(action.bid);
    if (!ids.length) return { ok:true, skipped:true, reason:"no_target_ids" };
    await snapshot(execution_id);
    const updates = ids.map(id => ({ targetId: Number(id), bid }));
    const res = await putSpTargets(updates);
    return { ok:true, result:res };
  }

  throw new Error(`unsupported_action_type:${action.type}`);
}

async function rollback(execution_id){
  const files = fs.readdirSync(SNAP_DIR).filter(f => f.includes(`amazon_ads_${execution_id}_`));
  const restored = [];
  for (const f of files){
    const full = path.join(SNAP_DIR, f);
    const obj = JSON.parse(fs.readFileSync(full, "utf-8"));
    if (f.includes("_campaign_")){
      const id = obj.campaignId;
      await putCampaigns([{ campaignId: Number(id), dailyBudget: obj.dailyBudget, state: obj.state }]);
      restored.push({ kind:"campaign", id });
    } else if (f.includes("_sp_adgroup_")){
      const id = obj.adGroupId;
      await putSpAdGroups([{ adGroupId: Number(id), defaultBid: obj.defaultBid }]);
      restored.push({ kind:"sp_adgroup", id });
    } else if (f.includes("_sp_keyword_")){
      const id = obj.keywordId;
      await putSpKeywords([{ keywordId: Number(id), bid: obj.bid }]);
      restored.push({ kind:"sp_keyword", id });
    } else if (f.includes("_sp_target_")){
      const id = obj.targetId;
      await putSpTargets([{ targetId: Number(id), bid: obj.bid }]);
      restored.push({ kind:"sp_target", id });
    }
  }
  return { ok:true, restored };
}

module.exports = { snapshot, execute, rollback };
