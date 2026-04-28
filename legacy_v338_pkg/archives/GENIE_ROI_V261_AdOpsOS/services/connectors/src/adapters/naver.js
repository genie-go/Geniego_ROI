const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const SNAP_DIR = process.env.SNAP_DIR || "/tmp/genie_roi_snapshots";
const NAVER_API_BASE = process.env.NAVER_API_BASE || "https://api.searchad.naver.com";
const NAVER_API_KEY = process.env.NAVER_API_KEY || "";
const NAVER_SECRET_KEY = process.env.NAVER_SECRET_KEY || "";
const NAVER_CUSTOMER_ID = process.env.NAVER_CUSTOMER_ID || "";
const NAVER_TARGET_CAMPAIGN_IDS = (process.env.NAVER_TARGET_CAMPAIGN_IDS || "").split(",").map(s=>s.trim()).filter(Boolean);
const MAX_RETRIES = parseInt(process.env.NAVER_MAX_RETRIES || "5", 10);

function sleep(ms){ return new Promise(r=>setTimeout(r, ms)); }
function jitter(ms){ return Math.floor(ms * (0.7 + Math.random()*0.6)); }
function ensureDir(p){ fs.mkdirSync(p, {recursive:true}); }

function snapPath(execution_id){
  return path.join(SNAP_DIR, "naver", `${execution_id}.json`);
}

// Naver SearchAd signature: timestamp + method + uri, HMAC-SHA256(secretKey), base64.
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
  if (bodyObj) opts.body = JSON.stringify(bodyObj);

  const resp = await fetch(NAVER_API_BASE + uri, opts);
  if ((resp.status === 429 || resp.status >= 500) && attempt < MAX_RETRIES){
    const backoff = jitter(Math.min(60000, 1000 * Math.pow(2, attempt)));
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

async function snapshotBeforeChange(execution_id){
  ensureDir(path.join(SNAP_DIR, "naver"));
  const sp = snapPath(execution_id);
  if (fs.existsSync(sp)) return JSON.parse(fs.readFileSync(sp,"utf-8"));

  // NOTE: This is a scaffold. The exact endpoint/field depends on SearchAd object type (campaign/adgroup/keyword).
  // For a real deployment, fill this with GET /ncc/campaigns?ids=... or equivalent.
  const snap = { execution_id, at: new Date().toISOString(), note: "snapshot scaffold: fill with real GET calls", campaigns: [] };
  fs.writeFileSync(sp, JSON.stringify(snap, null, 2), "utf-8");
  return snap;
}

async function execute({ execution_id, channel, actions, dry_run, cap }) {
  if (!NAVER_API_KEY || !NAVER_SECRET_KEY || !NAVER_CUSTOMER_ID){
    return { execution_id, channel, dry_run, error:"NAVER_auth_not_set", note:"Set NAVER_API_KEY/NAVER_SECRET_KEY/NAVER_CUSTOMER_ID to enable real calls." };
  }
  if (NAVER_TARGET_CAMPAIGN_IDS.length === 0){
    return { execution_id, channel, dry_run, error:"NAVER_TARGET_CAMPAIGN_IDS_not_set", note:"Provide comma-separated campaign IDs to update." };
  }

  const deltaPct = parseBudgetDeltaPct(actions);
  const snap = await snapshotBeforeChange(execution_id);

  // Real implementation TODO: 
  // 1) GET current budgets
  // 2) Convert KRW daily budget units if needed
  // 3) PATCH budgets
  // This scaffold proves: auth headers + signature + retry + snapshot file + rollback hook.
  return {
    execution_id, channel, dry_run,
    capabilities: cap,
    snapshot_path: snapPath(execution_id),
    summary: { target_campaign_ids: NAVER_TARGET_CAMPAIGN_IDS, delta_pct: deltaPct, applied: !dry_run ? "TODO" : "dry_run_only" },
    note: "Naver adapter scaffold: signature/quota/snapshot/rollback plumbing present; fill endpoint mappings per SearchAd object model.",
  };
}

async function rollback({ execution_id, channel, dry_run }) {
  const sp = snapPath(execution_id);
  if (!fs.existsSync(sp)){
    return { execution_id, channel, dry_run, ok:false, error:"snapshot_not_found" };
  }
  const snap = JSON.parse(fs.readFileSync(sp, "utf-8"));
  // Real implementation TODO: restore budgets/status from snapshot via PATCH.
  return { execution_id, channel, dry_run, ok:true, snapshot_path: sp, note:"Rollback scaffold: restore calls TODO", snapshot: snap };
}

module.exports = { execute, rollback };
