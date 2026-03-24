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
const GOOGLE_ADS_CAMPAIGN_RESOURCE_NAMES = (process.env.GOOGLE_ADS_CAMPAIGN_RESOURCE_NAMES || "").split(",").map(s=>s.trim()).filter(Boolean);
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


async function searchCampaign(resource_name){
  const url = `${GOOGLE_ADS_API_BASE}/${GOOGLE_ADS_API_VERSION}/customers/${GOOGLE_ADS_CUSTOMER_ID}/googleAds:search`;
  const query = `SELECT campaign.resource_name, campaign.status, campaign.bidding_strategy_type, campaign.manual_cpc.enhanced_cpc_enabled FROM campaign WHERE campaign.resource_name = '${resource_name}' LIMIT 1`;
  const { data } = await fetchJson(url, { method:"POST", headers: headers(), body: JSON.stringify({ query }) });
  const rows = data && data.results ? data.results : [];
  if (!rows.length) throw new Error(`Google Ads campaign not found: ${resource_name}`);
  const c = rows[0].campaign || rows[0].Campaign || rows[0].campaign;
  const manual = c && (c.manualCpc || c.manual_cpc);
  return {
    resource_name: (c && (c.resourceName || c.resource_name)) || resource_name,
    status: (c && c.status) || null,
    bidding_strategy_type: (c && (c.biddingStrategyType || c.bidding_strategy_type)) || null,
    manual_cpc: manual ? { enhanced_cpc_enabled: !!(manual.enhancedCpcEnabled ?? manual.enhanced_cpc_enabled) } : null,
    raw: rows[0],
  };
}

async function mutateCampaignBidding(resource_name, mode, opts){
  const url = `${GOOGLE_ADS_API_BASE}/${GOOGLE_ADS_API_VERSION}/customers/${GOOGLE_ADS_CUSTOMER_ID}/campaigns:mutate`;

  // Supported minimal set (practical + rollbackable):
  // - MANUAL_CPC (manual_cpc)
  // - MAXIMIZE_CONVERSIONS (maximize_conversions)
  const update = { resourceName: resource_name };
  let updateMask = "";

  if (mode === "MANUAL_CPC") {
    update.manualCpc = { enhancedCpcEnabled: !!(opts && opts.enhanced_cpc_enabled) };
    updateMask = "manual_cpc.enhanced_cpc_enabled";
  } else if (mode === "MAXIMIZE_CONVERSIONS") {
    update.maximizeConversions = {};
    updateMask = "maximize_conversions";
  } else if (mode === "TARGET_CPA") {
    const micros = Number((opts && (opts.target_cpa_micros ?? opts.targetCpaMicros)) || 0);
    if (!micros || micros <= 0) throw new Error("TARGET_CPA requires target_cpa_micros");
    update.targetCpa = { targetCpaMicros: micros };
    updateMask = "target_cpa.target_cpa_micros";
  } else if (mode === "TARGET_ROAS") {
    const roas = Number((opts && (opts.target_roas ?? opts.targetRoas)) || 0);
    if (!roas || roas <= 0) throw new Error("TARGET_ROAS requires target_roas");
    update.targetRoas = { targetRoas: roas };
    updateMask = "target_roas.target_roas";
  } else {
    throw new Error(`Unsupported Google bidding mode: ${mode}`);
  }
  } else {
    throw new Error(`Unsupported Google bidding mode: ${mode}`);
  }

  const body = {
    operations: [{ update, updateMask }],
    partialFailure: false,
    validateOnly: false
  };
  const { data } = await fetchJson(url, { method:"POST", headers: headers(), body: JSON.stringify(body) });
  return data;
}

async function mutateCampaignStatus(resource_name, status){
  const url = `${GOOGLE_ADS_API_BASE}/${GOOGLE_ADS_API_VERSION}/customers/${GOOGLE_ADS_CUSTOMER_ID}/campaigns:mutate`;
  const body = {
    operations: [{
      update: { resourceName: resource_name, status },
      updateMask: "status"
    }],
    partialFailure: false,
    validateOnly: false
  };
  const { data } = await fetchJson(url, { method:"POST", headers: headers(), body: JSON.stringify(body) });
  return data;
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

    const aBudget = (actions||[]).find(x=>x && (x.type==="set_budget" || x.type==="set_campaign_budget_micros" || x.type==="set_budget_micros"));
    const aStatus = (actions||[]).find(x=>x && (x.type==="set_campaign_status" || x.type==="set_status"));
    const aBidding = (actions||[]).find(x=>x && (x.type==="set_bidding_strategy" || x.type==="set_campaign_bidding" || x.type==="set_campaign_bidding_strategy"));
    if (!aBudget && !aStatus && !aBidding) return { ok:true, channel:"google", results:[{skipped:true, reason:"no_supported_action"}] }; return { ok:true, channel:"google", results:[{skipped:true, reason:"no_supported_action"}] };

    // accept value as micros if large; or accept currency and convert by GOOGLE_ADS_BUDGET_UNIT_MICROS
    const unitMicros = Number(process.env.GOOGLE_ADS_BUDGET_UNIT_MICROS || "1000000"); // 1 currency unit = 1,000,000 micros
    const isMicros = !!process.env.GOOGLE_ADS_VALUE_IS_MICROS && (process.env.GOOGLE_ADS_VALUE_IS_MICROS.toLowerCase()==="true");
    const newMicros = aBudget ? (isMicros ? Number(aBudget.value) : Math.round(Number(aBudget.value) * unitMicros)) : null;

    const results = [];

    // (1) Budget updates
    if (aBudget) {
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
}

// (2) Campaign status updates
if (aStatus) {
  if (!GOOGLE_ADS_CAMPAIGN_RESOURCE_NAMES.length) throw new Error("Google Ads missing GOOGLE_ADS_CAMPAIGN_RESOURCE_NAMES");
  const desired = String(aStatus.value||"").toUpperCase(); // ENABLED/PAUSED/REMOVED
  for (const rn of GOOGLE_ADS_CAMPAIGN_RESOURCE_NAMES) {
    const url = `${GOOGLE_ADS_API_BASE}/${GOOGLE_ADS_API_VERSION}/customers/${GOOGLE_ADS_CUSTOMER_ID}/googleAds:search`;
    const query = "SELECT campaign.resource_name, campaign.status FROM campaign WHERE campaign.resource_name = '" + rn + "' LIMIT 1";
    const { data } = await fetchJson(url, { method:"POST", headers: headers(), body: JSON.stringify({ query }) });
    const rows = data && data.results ? data.results : [];
    if (!rows.length) throw new Error("Google Ads campaign not found: " + rn);
    const c0 = rows[0].campaign || rows[0].campaign_;
    const oldStatus = (c0 && c0.status) || "";
    fs.writeFileSync(snapPath(execution_id, rn + "_status"), JSON.stringify({ resource_name: rn, status: oldStatus, raw: rows[0] }, null, 2));

    if (String(oldStatus).toUpperCase() === desired) {
      results.push({ campaign_resource: rn, skipped:true, reason:"idempotent_status", oldStatus, newStatus: desired });
      continue;
    }
    if (dry_run) { results.push({ campaign_resource: rn, dry_run:true, oldStatus, newStatus: desired }); continue; }
    const resp = await mutateCampaignStatus(rn, desired);
    results.push({ campaign_resource: rn, oldStatus, newStatus: desired, resp });
  }
}

return { ok:true, channel:"google", results };

  },

  async rollback({ execution_id, dry_run }) {
    const results = [];

    // (1) Budget updates
    if (aBudget) {
    for (const rn of GOOGLE_ADS_BUDGET_RESOURCE_NAMES) {
      const p = snapPath(execution_id, rn);
      if (!fs.existsSync(p)) { results.push({ budget_resource: rn, skipped:true, reason:"no_snapshot" }); continue; }
      const snap = JSON.parse(fs.readFileSync(p,"utf-8"));
      const restore = Number(snap.amount_micros);
      if (dry_run) { results.push({ budget_resource: rn, dry_run:true, restore_micros: restore }); continue; }
      const resp = await mutateBudget(rn, restore);
      results.push({ budget_resource: rn, restore_micros: restore, resp });
}
}

// (2) Campaign status updates
if (aStatus) {
  if (!GOOGLE_ADS_CAMPAIGN_RESOURCE_NAMES.length) throw new Error("Google Ads missing GOOGLE_ADS_CAMPAIGN_RESOURCE_NAMES");
  const desired = String(aStatus.value||"").toUpperCase(); // ENABLED/PAUSED/REMOVED
  for (const rn of GOOGLE_ADS_CAMPAIGN_RESOURCE_NAMES) {
    const url = `${GOOGLE_ADS_API_BASE}/${GOOGLE_ADS_API_VERSION}/customers/${GOOGLE_ADS_CUSTOMER_ID}/googleAds:search`;
    const query = "SELECT campaign.resource_name, campaign.status FROM campaign WHERE campaign.resource_name = '" + rn + "' LIMIT 1";
    const { data } = await fetchJson(url, { method:"POST", headers: headers(), body: JSON.stringify({ query }) });
    const rows = data && data.results ? data.results : [];
    if (!rows.length) throw new Error("Google Ads campaign not found: " + rn);
    const c0 = rows[0].campaign || rows[0].campaign_;
    const oldStatus = (c0 && c0.status) || "";
    fs.writeFileSync(snapPath(execution_id, rn + "_status"), JSON.stringify({ resource_name: rn, status: oldStatus, raw: rows[0] }, null, 2));

    if (String(oldStatus).toUpperCase() === desired) {
      results.push({ campaign_resource: rn, skipped:true, reason:"idempotent_status", oldStatus, newStatus: desired });
      continue;
    }
    if (dry_run) { results.push({ campaign_resource: rn, dry_run:true, oldStatus, newStatus: desired }); continue; }
    const resp = await mutateCampaignStatus(rn, desired);
    results.push({ campaign_resource: rn, oldStatus, newStatus: desired, resp });
  }
}


    // (3) Campaign bidding strategy (minimal, rollbackable)
    if (aBidding) {
      if (!GOOGLE_ADS_CAMPAIGN_RESOURCE_NAMES.length) throw new Error("Google Ads missing GOOGLE_ADS_CAMPAIGN_RESOURCE_NAMES for bidding strategy");
      const desiredMode = String(aBidding.value || process.env.GOOGLE_ADS_BIDDING_MODE || "MANUAL_CPC").toUpperCase();
      const enhanced = String(process.env.GOOGLE_ADS_MANUAL_CPC_ENHANCED || "false").toLowerCase()==="true";
      for (const rn of GOOGLE_ADS_CAMPAIGN_RESOURCE_NAMES) {
        const snap = await searchCampaign(rn);
        const sp = snapPath(execution_id, rn + "_bidding");
        fs.writeFileSync(sp, JSON.stringify({ kind:"campaign_bidding", ...snap }, null, 2));
        const oldMode = (snap.bidding_strategy_type || "").toUpperCase();
        if (oldMode === desiredMode) {
          results.push({ campaign_resource: rn, idempotent_bidding:true, oldMode, newMode: desiredMode });
          continue;
        }
        if (dry_run) { results.push({ campaign_resource: rn, dry_run:true, oldMode, newMode: desiredMode }); continue; }

        try {
          const resp = await mutateCampaignBidding(rn, desiredMode, { enhanced_cpc_enabled: enhanced });
          results.push({ campaign_resource: rn, oldMode, newMode: desiredMode, resp });
        } catch (e) {
          // attempt rollback to snapshot mode if supported
          try {
            if (oldMode === "MANUAL_CPC") {
              await mutateCampaignBidding(rn, "MANUAL_CPC", { enhanced_cpc_enabled: snap.manual_cpc ? snap.manual_cpc.enhanced_cpc_enabled : false });
            } else if (oldMode === "MAXIMIZE_CONVERSIONS") {
              await mutateCampaignBidding(rn, "MAXIMIZE_CONVERSIONS", {});
            }
            results.push({ campaign_resource: rn, rollback_attempted:true, rollback_to: oldMode, error: String(e && e.message || e) });
          } catch (re) {
            results.push({ campaign_resource: rn, rollback_failed:true, rollback_to: oldMode, error: String(e && e.message || e), rollback_error: String(re && re.message || re) });
          }
        }
      }
    }

return { ok:true, channel:"google", results };

  }
};
