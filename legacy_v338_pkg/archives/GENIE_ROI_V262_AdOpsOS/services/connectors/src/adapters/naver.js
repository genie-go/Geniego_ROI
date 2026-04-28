const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const SNAP_DIR = process.env.SNAP_DIR || "/tmp/genie_roi_snapshots";
const NAVER_API_BASE = process.env.NAVER_API_BASE || "https://api.searchad.naver.com";

// Secrets can be provided either via env vars or mounted files (for rotation without rebuild).
const NAVER_API_KEY = process.env.NAVER_API_KEY || (process.env.NAVER_API_KEY_FILE ? fs.readFileSync(process.env.NAVER_API_KEY_FILE, "utf-8").trim() : "");
const NAVER_SECRET_KEY = process.env.NAVER_SECRET_KEY || (process.env.NAVER_SECRET_KEY_FILE ? fs.readFileSync(process.env.NAVER_SECRET_KEY_FILE, "utf-8").trim() : "");
const NAVER_CUSTOMER_ID = process.env.NAVER_CUSTOMER_ID || (process.env.NAVER_CUSTOMER_ID_FILE ? fs.readFileSync(process.env.NAVER_CUSTOMER_ID_FILE, "utf-8").trim() : "");

// Choose ONE object level to implement fully: Campaign daily budget.
// We apply delta to NAVER_TARGET_CAMPAIGN_IDS. (Enterprise deployments should map these per-tenant in gateway config.)
const NAVER_TARGET_CAMPAIGN_IDS = (process.env.NAVER_TARGET_CAMPAIGN_IDS || "").split(",").map(s=>s.trim()).filter(Boolean);

const MAX_RETRIES = parseInt(process.env.NAVER_MAX_RETRIES || "5", 10);
const MAX_BACKOFF_MS = parseInt(process.env.NAVER_MAX_BACKOFF_MS || "60000", 10);
const DRY_RUN_FORCE = (process.env.DRY_RUN || "true").toLowerCase() === "true";

function sleep(ms){ return new Promise(r=>setTimeout(r, ms)); }
function jitter(ms){ return Math.floor(ms * (0.7 + Math.random()*0.6)); }
function ensureDir(p){ fs.mkdirSync(p, {recursive:true}); }

function snapPath(execution_id){
  return path.join(SNAP_DIR, "naver", `${execution_id}.json`);
}

// Naver SearchAd signature: timestamp + "." + method + "." + uri, HMAC-SHA256(secretKey), base64.
// (This follows the commonly documented pattern in community writeups and Naver's apidoc examples.)
function sign(method, uri, timestamp){
  const msg = `${timestamp}.${method}.${uri}`;
  return crypto.createHmac("sha256", NAVER_SECRET_KEY).update(msg).digest("base64");
}

async function naverFetch(method, uri, bodyObj=null, attempt=0){
  const timestamp = Date.now().toString();
  const sig = sign(method, uri, timestamp);

  const headers = {
    "Content-Type":"application/json; charset=UTF-8",
    "X-Timestamp": timestamp,
    "X-API-KEY": NAVER_API_KEY,
    "X-Customer": NAVER_CUSTOMER_ID,
    "X-Signature": sig,
  };
  const opts = { method, headers };
  if (bodyObj !== null) opts.body = JSON.stringify(bodyObj);

  const resp = await fetch(NAVER_API_BASE + uri, opts);
  if ((resp.status === 429 || resp.status >= 500) && attempt < MAX_RETRIES){
    const backoff = jitter(Math.min(MAX_BACKOFF_MS, 1000 * Math.pow(2, attempt)));
    await sleep(backoff);
    return naverFetch(method, uri, bodyObj, attempt+1);
  }
  const text = await resp.text();
  let json;
  try { json = JSON.parse(text); } catch(e){ json = { raw: text }; }
  if (!resp.ok){
    const msg = json?.title || json?.message || json?.raw || `http_${resp.status}`;
    const err = new Error(`naver_api_error:${resp.status}:${msg}`);
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

function clampBudgetKrw(v){
  // SearchAd dailyBudget is KRW integer in many masters/examples; keep it integer and >= 0.
  const n = Math.round(Number(v));
  if (!isFinite(n)) return 0;
  return Math.max(0, n);
}

async function snapshotBeforeChange(execution_id, campaignIds){
  ensureDir(path.join(SNAP_DIR, "naver"));
  const sp = snapPath(execution_id);
  if (fs.existsSync(sp)) return JSON.parse(fs.readFileSync(sp,"utf-8"));

  // Snapshot = GET /ncc/campaigns/{id}
  const campaigns = [];
  for (const id of campaignIds){
    try{
      const c = await naverFetch("GET", `/ncc/campaigns/${encodeURIComponent(id)}`, null);
      campaigns.push({ id, data: c });
    }catch(e){
      campaigns.push({ id, error: String(e.message || e) });
    }
  }
  const snap = { execution_id, at: new Date().toISOString(), scope: "campaign_dailyBudget", campaigns };
  fs.writeFileSync(sp, JSON.stringify(snap, null, 2), "utf-8");
  return snap;
}

async function applyCampaignDailyBudget({ campaignId, deltaPct, dry_run }){
  const before = await naverFetch("GET", `/ncc/campaigns/${encodeURIComponent(campaignId)}`, null);

  const current = Number(before?.dailyBudget);
  if (!isFinite(current)){
    return { campaignId, ok:false, error:"missing_dailyBudget", before };
  }
  const next = clampBudgetKrw(current * (1 + deltaPct/100));

  // Idempotency guard: if computed budget equals current, do nothing.
  if (next === clampBudgetKrw(current)){
    return { campaignId, ok:true, skipped:true, reason:"no_change", current_dailyBudget: clampBudgetKrw(current) };
  }

  if (dry_run){
    return { campaignId, ok:true, dry_run:true, current_dailyBudget: clampBudgetKrw(current), next_dailyBudget: next };
  }

  // Update via PUT /ncc/campaigns/{id}?fields=dailyBudget with body {"dailyBudget": <int>}
  // (SearchAd apidoc uses PUT with a `fields` query param to specify which fields are being updated.)
  const uri = `/ncc/campaigns/${encodeURIComponent(campaignId)}?fields=dailyBudget`;
  const updated = await naverFetch("PUT", uri, { dailyBudget: next });

  return { campaignId, ok:true, current_dailyBudget: clampBudgetKrw(current), next_dailyBudget: next, updated };
}

async function rollbackCampaignDailyBudget({ campaignId, originalDailyBudget, dry_run }){
  const orig = clampBudgetKrw(originalDailyBudget);
  if (dry_run){
    return { campaignId, ok:true, dry_run:true, restore_dailyBudget: orig };
  }
  const uri = `/ncc/campaigns/${encodeURIComponent(campaignId)}?fields=dailyBudget`;
  const updated = await naverFetch("PUT", uri, { dailyBudget: orig });
  return { campaignId, ok:true, restore_dailyBudget: orig, updated };
}

async function execute({execution_id, channel, actions, dry_run, cap, targets}) {
  const useDry = (dry_run !== undefined) ? !!dry_run : DRY_RUN_FORCE;

  if (!NAVER_API_KEY || !NAVER_SECRET_KEY || !NAVER_CUSTOMER_ID){
    return { execution_id, channel, dry_run: useDry, error:"NAVER_auth_not_set", note:"Set NAVER_API_KEY/NAVER_SECRET_KEY/NAVER_CUSTOMER_ID (or *_FILE) to enable real calls." };
  }
  const targetIds = (Array.isArray(targets) && targets.length) ? targets : NAVER_TARGET_CAMPAIGN_IDS;
  if (targetIds.length === 0){
    return { execution_id, channel, dry_run: useDry, error:"NAVER_TARGET_CAMPAIGN_IDS_not_set", note:"Provide comma-separated campaign IDs to update." };
  }

  const deltaPct = parseBudgetDeltaPct(actions);
  const snap = await snapshotBeforeChange(execution_id, targetIds);

  const results = [];
  for (const cid of targetIds){
    try{
      const r = await applyCampaignDailyBudget({ campaignId: cid, deltaPct, dry_run: useDry });
      results.push(r);
    }catch(e){
      results.push({ campaignId: cid, ok:false, error:String(e.message || e) });
    }
  }

  return {
    execution_id, channel, dry_run: useDry,
    capabilities: cap,
    snapshot_path: snapPath(execution_id),
    snapshot: snap, // surfaced so gateway can store evidence in DB
    summary: {
      scope: "campaign_dailyBudget",
      target_campaign_ids: targetIds,
      delta_pct: deltaPct,
      applied_count: results.filter(r=>r.ok && !r.skipped && !r.dry_run).length,
      skipped_count: results.filter(r=>r.ok && r.skipped).length,
      error_count: results.filter(r=>!r.ok).length,
    },
    results,
  };
}

async function rollback({execution_id, channel, dry_run, targets}) {
  const useDry = (dry_run !== undefined) ? !!dry_run : DRY_RUN_FORCE;

  const sp = snapPath(execution_id);
  if (!fs.existsSync(sp)){
    return { execution_id, channel, dry_run: useDry, ok:false, error:"snapshot_not_found" };
  }
  const snap = JSON.parse(fs.readFileSync(sp, "utf-8"));

  const results = [];
  const campaigns = Array.isArray(snap?.campaigns) ? snap.campaigns : [];
  for (const c of campaigns){
    const cid = c?.id;
    const original = c?.data?.dailyBudget;
    if (!cid || original === undefined){
      results.push({ campaignId: cid || "unknown", ok:false, error:"missing_original_dailyBudget_in_snapshot" });
      continue;
    }
    try{
      const r = await rollbackCampaignDailyBudget({ campaignId: cid, originalDailyBudget: original, dry_run: useDry });
      results.push(r);
    }catch(e){
      results.push({ campaignId: cid, ok:false, error:String(e.message || e) });
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
