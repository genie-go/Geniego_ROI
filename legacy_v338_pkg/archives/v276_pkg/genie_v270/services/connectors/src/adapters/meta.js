const fs = require("fs");
const path = require("path");

const SNAP_DIR = process.env.SNAP_DIR || "/tmp/genie_roi_snapshots";
const META_API_VERSION = process.env.META_API_VERSION || "v19.0";
const META_ACCESS_TOKEN_ENV = process.env.META_ACCESS_TOKEN || "";
const META_ACCESS_TOKEN_FILE = process.env.META_ACCESS_TOKEN_FILE || "";
const META_AD_ACCOUNT_ID = (process.env.META_AD_ACCOUNT_ID || "").replace(/^act_/, "");
const META_TARGET_ADSET_IDS = (process.env.META_TARGET_ADSET_IDS || "").split(",").map(s=>s.trim()).filter(Boolean);
const META_CURRENCY_DECIMALS = parseInt(process.env.META_CURRENCY_DECIMALS || "0", 10); // KRW=0, USD=2
const MAX_RETRIES = parseInt(process.env.META_MAX_RETRIES || "5", 10);
const MAX_BACKOFF_MS = parseInt(process.env.META_MAX_BACKOFF_MS || "60000", 10);
const DRY_RUN_FORCE = (process.env.DRY_RUN || "true").toLowerCase() === "true";

function loadAccessToken(){
  if (META_ACCESS_TOKEN_FILE){
    try { return fs.readFileSync(META_ACCESS_TOKEN_FILE, "utf-8").trim(); } catch(e){ /* ignore */ }
  }
  return META_ACCESS_TOKEN_ENV;
}

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
  const m = Number(minorStr);
  if (!isFinite(m)) return 0;
  return m / Math.pow(10, META_CURRENCY_DECIMALS);
}

async function metaFetch(url, attempt=0){
  const resp = await fetch(url);
  if ((resp.status === 429 || resp.status >= 500) && attempt < MAX_RETRIES){
    const backoff = jitter(Math.min(MAX_BACKOFF_MS, 1000 * Math.pow(2, attempt)));
    await sleep(backoff);
    return metaFetch(url, attempt+1);
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

function parseBudgetDeltaPct(actions){
  const a = (actions||[]).find(x => (x||{}).type === "BUDGET_DELTA_PCT");
  const v = a ? Number(a.value) : 0;
  if (!isFinite(v)) return 0;
  return v;
}

async function snapshotBeforeChange(execution_id, token, targetIds){
  ensureDir(path.join(SNAP_DIR, "meta"));
  const sp = snapPath(execution_id);
  if (fs.existsSync(sp)) return JSON.parse(fs.readFileSync(sp,"utf-8"));

  // Snapshot current budgets for target adsets
  const items = [];
  for (const adsetId of targetIds){
    try{
      const url = `https://graph.facebook.com/${META_API_VERSION}/${adsetId}?fields=id,name,daily_budget,lifetime_budget,status&access_token=${encodeURIComponent(token)}`;
      const r = await metaFetch(url);
      items.push(r);
    }catch(e){
      items.push({ id: adsetId, error: String(e.message || e) });
    }
  }
  const snap = { execution_id, at: new Date().toISOString(), adsets: items, scope: "adset_budget" };
  fs.writeFileSync(sp, JSON.stringify(snap, null, 2), "utf-8");
  return snap;
}

async function updateAdsetDailyBudget(adset, deltaPct, token, dry_run){
  const currentMinor = Number(adset?.daily_budget);
  const currentMajor = fromMinorUnits(currentMinor);
  const nextMajor = Math.max(0, currentMajor * (1 + deltaPct/100));
  const nextMinor = Number(toMinorUnits(nextMajor));

  // Idempotency guard: if no change, skip.
  if (Math.round(currentMinor) === Math.round(nextMinor)){
    return { adset_id: adset.id, ok:true, skipped:true, reason:"no_change", current_daily_budget: Math.round(currentMinor) };
  }

  if (dry_run){
    return { adset_id: adset.id, ok:true, dry_run:true, current_daily_budget: Math.round(currentMinor), next_daily_budget: Math.round(nextMinor) };
  }

  const url = `https://graph.facebook.com/${META_API_VERSION}/${adset.id}?daily_budget=${encodeURIComponent(String(Math.round(nextMinor)))}&access_token=${encodeURIComponent(token)}`;
  const res = await metaFetch(url); // Graph API accepts POST for update; we use GET-style with params via fetch (Graph allows POST). To be safe, do POST below.
  return { adset_id: adset.id, ok:true, current_daily_budget: Math.round(currentMinor), next_daily_budget: Math.round(nextMinor), updated: res };
}

async function metaPost(url, attempt=0){
  const resp = await fetch(url, { method:"POST" });
  if ((resp.status === 429 || resp.status >= 500) && attempt < MAX_RETRIES){
    const backoff = jitter(Math.min(MAX_BACKOFF_MS, 1000 * Math.pow(2, attempt)));
    await sleep(backoff);
    return metaPost(url, attempt+1);
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

async function setAdsetDailyBudget(adsetId, nextMinor, token, dry_run){
  if (dry_run){
    return { adset_id: adsetId, ok:true, dry_run:true, next_daily_budget: Math.round(nextMinor) };
  }
  const url = `https://graph.facebook.com/${META_API_VERSION}/${adsetId}?daily_budget=${encodeURIComponent(String(Math.round(nextMinor)))}&access_token=${encodeURIComponent(token)}`;
  const res = await metaPost(url);
  return { adset_id: adsetId, ok:true, next_daily_budget: Math.round(nextMinor), updated: res };
}

async function execute({execution_id, channel, actions, dry_run, cap, targets}) {
  const useDry = (dry_run !== undefined) ? !!dry_run : DRY_RUN_FORCE;
  const token = loadAccessToken();

  if (!token || !META_AD_ACCOUNT_ID){
    return { execution_id, channel, dry_run: useDry, error:"META_auth_not_set", note:"Set META_ACCESS_TOKEN(+optional META_ACCESS_TOKEN_FILE) and META_AD_ACCOUNT_ID to enable real calls." };
  }
  const targetIds = (Array.isArray(targets) && targets.length) ? targets : META_TARGET_ADSET_IDS;
  if (targetIds.length === 0){
    return { execution_id, channel, dry_run: useDry, error:"META_TARGET_ADSET_IDS_not_set", note:"Provide comma-separated adset IDs to update." };
  }

  const deltaPct = parseBudgetDeltaPct(actions);
  const snap = await snapshotBeforeChange(execution_id, token, targetIds);

  // Re-fetch current state per adset to reduce drift between snapshot and apply.
  const results = [];
  for (const adsetId of targetIds){
    try{
      const before = await metaFetch(`https://graph.facebook.com/${META_API_VERSION}/${adsetId}?fields=id,name,daily_budget,status&access_token=${encodeURIComponent(token)}`);
      const currentMinor = Number(before?.daily_budget);
      const currentMajor = fromMinorUnits(currentMinor);
      const nextMajor = Math.max(0, currentMajor * (1 + deltaPct/100));
      const nextMinor = Number(toMinorUnits(nextMajor));

      if (Math.round(currentMinor) === Math.round(nextMinor)){
        results.push({ adset_id: adsetId, ok:true, skipped:true, reason:"no_change", current_daily_budget: Math.round(currentMinor) });
        continue;
      }
      const r = await setAdsetDailyBudget(adsetId, nextMinor, token, useDry);
      results.push({ ...r, current_daily_budget: Math.round(currentMinor) });
    }catch(e){
      results.push({ adset_id: adsetId, ok:false, error:String(e.message || e) });
    }
  }

  return {
    execution_id, channel, dry_run: useDry,
    capabilities: cap,
    snapshot_path: snapPath(execution_id),
    snapshot: snap,
    summary: {
      scope: "adset_daily_budget",
      target_adset_ids: targetIds,
      delta_pct: deltaPct,
      applied_count: results.filter(r=>r.ok && !r.skipped && !r.dry_run).length,
      skipped_count: results.filter(r=>r.ok && r.skipped).length,
      error_count: results.filter(r=>!r.ok).length,
    },
    results
  };
}

async function rollback({execution_id, channel, dry_run, targets}) {
  const useDry = (dry_run !== undefined) ? !!dry_run : DRY_RUN_FORCE;
  const token = loadAccessToken();

  const sp = snapPath(execution_id);
  if (!fs.existsSync(sp)){
    return { execution_id, channel, dry_run: useDry, ok:false, error:"snapshot_not_found" };
  }
  const snap = JSON.parse(fs.readFileSync(sp, "utf-8"));
  const adsets = Array.isArray(snap?.adsets) ? snap.adsets : [];

  const results = [];
  for (const a of adsets){
    const id = a?.id;
    const orig = a?.daily_budget;
    if (!id || orig === undefined){
      results.push({ adset_id: id || "unknown", ok:false, error:"missing_original_daily_budget_in_snapshot" });
      continue;
    }
    try{
      const r = await setAdsetDailyBudget(id, Number(orig), token, useDry);
      results.push({ ...r, restore_daily_budget: Math.round(Number(orig)) });
    }catch(e){
      results.push({ adset_id: id, ok:false, error:String(e.message || e) });
    }
  }

  return {
    execution_id, channel, dry_run: useDry,
    ok: results.every(r=>r.ok),
    snapshot_path: sp,
    snapshot: snap,
    summary: { restored: results.filter(r=>r.ok).length, failed: results.filter(r=>!r.ok).length },
    results
  };
}

module.exports = { execute, rollback };
