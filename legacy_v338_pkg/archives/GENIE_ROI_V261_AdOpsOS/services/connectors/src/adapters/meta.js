const fs = require("fs");
const path = require("path");

const SNAP_DIR = process.env.SNAP_DIR || "/tmp/genie_roi_snapshots";
const META_API_VERSION = process.env.META_API_VERSION || "v19.0";
const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN || "";
const META_AD_ACCOUNT_ID = (process.env.META_AD_ACCOUNT_ID || "").replace(/^act_/, "");
const META_TARGET_ADSET_IDS = (process.env.META_TARGET_ADSET_IDS || "").split(",").map(s=>s.trim()).filter(Boolean);
const META_CURRENCY_DECIMALS = parseInt(process.env.META_CURRENCY_DECIMALS || "0", 10); // KRW=0, USD=2
const MAX_RETRIES = parseInt(process.env.META_MAX_RETRIES || "5", 10);

function sleep(ms){ return new Promise(r=>setTimeout(r, ms)); }
function jitter(ms){ return Math.floor(ms * (0.7 + Math.random()*0.6)); }

function ensureDir(p){ fs.mkdirSync(p, {recursive:true}); }

function snapPath(execution_id){
  return path.join(SNAP_DIR, "meta", `${execution_id}.json`);
}

function toMinorUnits(amountMajor){
  // Meta expects integer minor units for budgets (e.g., cents). For KRW, decimals=0 => minor == major.
  const m = Math.round(amountMajor * Math.pow(10, META_CURRENCY_DECIMALS));
  return `${m}`;
}

function fromMinorUnits(minorStr){
  const m = parseInt(minorStr || "0", 10);
  return m / Math.pow(10, META_CURRENCY_DECIMALS);
}

async function metaFetch(url, opts={}, attempt=0){
  const resp = await fetch(url, opts);
  if ((resp.status === 429 || resp.status >= 500) && attempt < MAX_RETRIES){
    const backoff = jitter(Math.min(60000, 1000 * Math.pow(2, attempt)));
    await sleep(backoff);
    return metaFetch(url, opts, attempt+1);
  }
  const text = await resp.text();
  let json;
  try { json = JSON.parse(text); } catch(e){ json = { raw: text }; }
  if (!resp.ok){
    const msg = json?.error?.message || json?.raw || `http_${resp.status}`;
    const err = new Error(`meta_api_error:${resp.status}:${msg}`);
    err.status = resp.status;
    err.body = json;
    throw err;
  }
  return json;
}

async function getAdset(adsetId){
  const fields = "id,name,status,effective_status,daily_budget,lifetime_budget";
  const url = `https://graph.facebook.com/${META_API_VERSION}/${encodeURIComponent(adsetId)}?fields=${fields}&access_token=${encodeURIComponent(META_ACCESS_TOKEN)}`;
  return metaFetch(url, {method:"GET"});
}

async function updateAdset(adsetId, params){
  const body = new URLSearchParams({...params, access_token: META_ACCESS_TOKEN});
  const url = `https://graph.facebook.com/${META_API_VERSION}/${encodeURIComponent(adsetId)}`;
  return metaFetch(url, {method:"POST", body});
}

function parseBudgetDeltaPct(actions){
  const a = (actions||[]).find(x => (x||{}).type === "BUDGET_DELTA_PCT");
  const v = a ? Number(a.value) : 0;
  if (!isFinite(v)) return 0;
  return v;
}

async function snapshotBeforeChange(execution_id, adsetIds){
  ensureDir(path.join(SNAP_DIR, "meta"));
  const sp = snapPath(execution_id);
  if (fs.existsSync(sp)){
    // already snapped
    return JSON.parse(fs.readFileSync(sp, "utf-8"));
  }
  const states = [];
  for (const id of adsetIds){
    const s = await getAdset(id);
    states.push(s);
  }
  const snap = { execution_id, at: new Date().toISOString(), adsets: states };
  fs.writeFileSync(sp, JSON.stringify(snap, null, 2), "utf-8");
  return snap;
}

async function execute({ execution_id, channel, actions, dry_run, cap }) {
  if (!META_ACCESS_TOKEN) {
    return { execution_id, channel, dry_run, error: "META_ACCESS_TOKEN_not_set", note: "Set META_ACCESS_TOKEN env to enable real calls." };
  }
  if (!META_AD_ACCOUNT_ID) {
    return { execution_id, channel, dry_run, error: "META_AD_ACCOUNT_ID_not_set", note: "Set META_AD_ACCOUNT_ID (act_...) env." };
  }
  if (META_TARGET_ADSET_IDS.length === 0){
    return { execution_id, channel, dry_run, error:"META_TARGET_ADSET_IDS_not_set", note:"Provide comma-separated adset IDs to update." };
  }

  const deltaPct = parseBudgetDeltaPct(actions);
  const summary = { updated: [], skipped: [], delta_pct: deltaPct };

  // Snapshot first (even in dry-run, so rollback can be nstrated)
  const snap = await snapshotBeforeChange(execution_id, META_TARGET_ADSET_IDS);

  for (const adsetId of META_TARGET_ADSET_IDS){
    const before = snap.adsets.find(a=>a.id===adsetId) || await getAdset(adsetId);
    const beforeDaily = before.daily_budget ? fromMinorUnits(before.daily_budget) : null;

    if (beforeDaily === null){
      summary.skipped.push({ adset_id: adsetId, reason: "no_daily_budget_field" });
      continue;
    }

    const afterDaily = Math.max(0, beforeDaily * (1 + deltaPct/100));
    const patch = { daily_budget: toMinorUnits(afterDaily) };

    if (!dry_run){
      const r = await updateAdset(adsetId, patch);
      summary.updated.push({ adset_id: adsetId, before_daily: beforeDaily, after_daily: afterDaily, result: r });
    } else {
      summary.updated.push({ adset_id: adsetId, before_daily: beforeDaily, after_daily: afterDaily, result: { dry_run:true } });
    }
  }

  return {
    execution_id, channel, dry_run,
    capabilities: cap,
    snapshot_path: snapPath(execution_id),
    summary,
    note: dry_run ? "Dry-run: computed budgets + captured snapshot; no POST performed." : "Applied budget changes via Meta Graph API.",
  };
}

async function rollback({ execution_id, channel, dry_run }) {
  const sp = snapPath(execution_id);
  if (!fs.existsSync(sp)){
    return { execution_id, channel, dry_run, ok:false, error:"snapshot_not_found", note:"No snapshot file present for this execution_id." };
  }
  if (!META_ACCESS_TOKEN){
    return { execution_id, channel, dry_run, ok:false, error:"META_ACCESS_TOKEN_not_set" };
  }
  const snap = JSON.parse(fs.readFileSync(sp, "utf-8"));
  const restored = [];

  for (const before of (snap.adsets || [])){
    const adsetId = before.id;
    const patch = {};
    if (before.daily_budget) patch.daily_budget = before.daily_budget;
    if (before.lifetime_budget) patch.lifetime_budget = before.lifetime_budget;
    if (before.status) patch.status = before.status;

    if (!dry_run){
      const r = await updateAdset(adsetId, patch);
      restored.push({ adset_id: adsetId, restored: patch, result: r });
    } else {
      restored.push({ adset_id: adsetId, restored: patch, result: { dry_run:true } });
    }
  }

  return { execution_id, channel, dry_run, ok:true, snapshot_path: sp, restored };
}

module.exports = { execute, rollback };
