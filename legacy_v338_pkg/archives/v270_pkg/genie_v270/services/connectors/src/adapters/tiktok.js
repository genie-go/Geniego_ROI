const fs = require("fs");
const path = require("path");
const { fetchJson } = require("../http");

const SNAP_DIR = process.env.SNAP_DIR || "/tmp/genie_roi_snapshots";
const TIKTOK_API_BASE = process.env.TIKTOK_API_BASE || "https://business-api.tiktok.com/open_api/v1.3";
const TIKTOK_ACCESS_TOKEN = process.env.TIKTOK_ACCESS_TOKEN || (process.env.TIKTOK_ACCESS_TOKEN_FILE ? fs.readFileSync(process.env.TIKTOK_ACCESS_TOKEN_FILE,"utf-8").trim() : "");
const TIKTOK_ADVERTISER_ID = process.env.TIKTOK_ADVERTISER_ID || "";
const TIKTOK_TARGET_ADGROUP_IDS = (process.env.TIKTOK_TARGET_ADGROUP_IDS || "").split(",").map(s=>s.trim()).filter(Boolean);

function ensureDir(p){ if (!fs.existsSync(p)) fs.mkdirSync(p,{recursive:true}); }
ensureDir(SNAP_DIR);

function snapPath(execution_id, adgroup_id){
  return path.join(SNAP_DIR, `tiktok_${execution_id}_${adgroup_id}.json`);
}

async function getAdgroup(adgroup_id){
  const url = `${TIKTOK_API_BASE}/adgroup/get/`;
  const body = {
    advertiser_id: TIKTOK_ADVERTISER_ID,
    filtering: { adgroup_ids: [ adgroup_id ] },
    page: 1,
    page_size: 1,
  };
  const { data } = await fetchJson(url, {
    method: "POST",
    headers: {
      "Content-Type":"application/json",
      "Access-Token": TIKTOK_ACCESS_TOKEN,
    },
    body: JSON.stringify(body),
  });
  // TikTok wraps: {code, message, data:{list:[...]}}
  const list = data && data.data && data.data.list ? data.data.list : (data.list || []);
  if (!Array.isArray(list) || list.length === 0) throw new Error(`TikTok adgroup not found: ${adgroup_id}`);
  return list[0];
}

async function updateAdgroupBudget(adgroup_id, budget){
  const url = `${TIKTOK_API_BASE}/adgroup/update/`;
  const body = {
    advertiser_id: TIKTOK_ADVERTISER_ID,
    adgroup_id,
    budget: budget, // typically string/number depending on account currency
  };
  const { data } = await fetchJson(url, {
    method:"POST",
    headers: {
      "Content-Type":"application/json",
      "Access-Token": TIKTOK_ACCESS_TOKEN,
    },
    body: JSON.stringify(body),
  });
  if (data && data.code && data.code !== 0) {
    throw new Error(`TikTok update failed: code=${data.code} message=${data.message || ""}`);
  }
  return data;
}

module.exports = {
  capabilities: { supports: ["snapshot","rollback","quota_retries"] },

  async execute({ execution_id, actions, dry_run }) {
    if (!TIKTOK_ACCESS_TOKEN || !TIKTOK_ADVERTISER_ID) {
      throw new Error("TikTok missing TIKTOK_ACCESS_TOKEN / TIKTOK_ADVERTISER_ID");
    }
    const targets = TIKTOK_TARGET_ADGROUP_IDS;
    if (!targets.length) throw new Error("TikTok missing TIKTOK_TARGET_ADGROUP_IDS");

    const results = [];
    for (const adgroup_id of targets) {
      // snapshot
      const snap = await getAdgroup(adgroup_id);
      fs.writeFileSync(snapPath(execution_id, adgroup_id), JSON.stringify(snap, null, 2));

      // derive budget action (default: first set_budget value)
      const a = (actions || []).find(x=>x && (x.type === "set_budget" || x.type === "set_adgroup_budget"));
      if (!a) {
        results.push({ adgroup_id, skipped:true, reason:"no_budget_action" });
        continue;
      }

      const newBudget = a.value;
      const oldBudget = snap.budget;
      if (String(oldBudget) === String(newBudget)) {
        results.push({ adgroup_id, skipped:true, reason:"idempotent", oldBudget, newBudget });
        continue;
      }

      if (dry_run) {
        results.push({ adgroup_id, dry_run:true, oldBudget, newBudget });
        continue;
      }
      const resp = await updateAdgroupBudget(adgroup_id, newBudget);
      results.push({ adgroup_id, oldBudget, newBudget, resp });
    }

    return { ok:true, channel:"tiktok", results };
  },

  async rollback({ execution_id, dry_run }) {
    const targets = TIKTOK_TARGET_ADGROUP_IDS;
    const results = [];
    for (const adgroup_id of targets) {
      const p = snapPath(execution_id, adgroup_id);
      if (!fs.existsSync(p)) { results.push({ adgroup_id, skipped:true, reason:"no_snapshot" }); continue; }
      const snap = JSON.parse(fs.readFileSync(p,"utf-8"));
      const oldBudget = snap.budget;
      if (dry_run) { results.push({ adgroup_id, dry_run:true, restore_budget: oldBudget }); continue; }
      const resp = await updateAdgroupBudget(adgroup_id, oldBudget);
      results.push({ adgroup_id, restore_budget: oldBudget, resp });
    }
    return { ok:true, channel:"tiktok", results };
  }
};
