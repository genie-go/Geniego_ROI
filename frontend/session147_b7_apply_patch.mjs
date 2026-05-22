// session147_b7_apply_patch.mjs
// Apply japanese_b1_b5_merged.csv mappings to ko.js
//
// Strategy: PATH-LEVEL exact matching (not value-replacement).
//   For each merged row, find the ko.js entry at <path> and verify its current
//   value equals <ja_value>. Only then replace with <proposed_ko>.
//   If current value differs from expected ja_value, log mismatch and SKIP
//   (never overwrite something that doesn't match).
//
// Safety guards (N-145-B, 7 of them):
//   G1. Backup ko.js to backup_session147_B7/ before any write
//   G2. ja.js bytes unchanged after run                     (N-79 sacred)
//   G3. zh.js bytes unchanged after run                     (N-79 sacred)
//   G4. en.js leaf count unchanged after run
//   G5. ko.js leaf count unchanged after run                (path-only edit)
//   G6. Dry-run first; user must rerun with --apply to write
//   G7. ko.js syntax check (Node require) after write; rollback on fail
//
// Usage:
//   node session147_b7_apply_patch.mjs               (dry-run, no writes)
//   node session147_b7_apply_patch.mjs --apply       (actually patch ko.js)

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';

const ROOT = 'E:/project/GeniegoROI/frontend';
const LOCALES_DIR = path.join(ROOT, 'src/i18n/locales');
const KO_PATH = path.join(LOCALES_DIR, 'ko.js');
const JA_PATH = path.join(LOCALES_DIR, 'ja.js');
const ZH_PATH = path.join(LOCALES_DIR, 'zh.js');
const EN_PATH = path.join(LOCALES_DIR, 'en.js');

const MERGED_CSV = path.join(ROOT, 'japanese_b1_b5_merged.csv');
const LOG_PATH   = path.join(ROOT, 'b7_patch_log.txt');

const APPLY = process.argv.includes('--apply');

// ---------- CSV parser (minimal) ----------
function parseCsv(text) {
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
  const rows = [];
  let cur = [], field = '', inQuote = false, i = 0;
  const n = text.length;
  while (i < n) {
    const ch = text[i];
    if (inQuote) {
      if (ch === '"') {
        if (i + 1 < n && text[i + 1] === '"') { field += '"'; i += 2; continue; }
        inQuote = false; i++; continue;
      }
      field += ch; i++; continue;
    }
    if (ch === '"') { inQuote = true; i++; continue; }
    if (ch === ',') { cur.push(field); field = ''; i++; continue; }
    if (ch === '\r') {
      if (i + 1 < n && text[i + 1] === '\n') {
        cur.push(field); rows.push(cur); cur = []; field = ''; i += 2; continue;
      }
      cur.push(field); rows.push(cur); cur = []; field = ''; i++; continue;
    }
    if (ch === '\n') { cur.push(field); rows.push(cur); cur = []; field = ''; i++; continue; }
    field += ch; i++;
  }
  if (field.length > 0 || cur.length > 0) { cur.push(field); rows.push(cur); }
  return rows;
}

function rowsToObjects(rows) {
  if (rows.length === 0) return [];
  const header = rows[0];
  const out = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || (row.length === 1 && row[0] === '')) continue;
    const o = {};
    for (let c = 0; c < header.length; c++) o[header[c]] = row[c] ?? '';
    out.push(o);
  }
  return out;
}

// ---------- recursive walk (N-145-A) ----------
function countLeaves(obj) {
  let n = 0;
  function walk(v) {
    if (v === null || v === undefined) return;
    if (typeof v === 'string') { n++; return; }
    if (Array.isArray(v)) {
      // leaf = array of strings counted as 1; otherwise recurse
      if (v.every(x => typeof x === 'string')) { n++; return; }
      for (const x of v) walk(x);
      return;
    }
    if (typeof v === 'object') {
      for (const k of Object.keys(v)) walk(v[k]);
    }
  }
  walk(obj);
  return n;
}

function getByPath(obj, dotPath) {
  const parts = dotPath.split('.');
  let cur = obj;
  for (const p of parts) {
    if (cur === null || cur === undefined) return undefined;
    if (typeof cur !== 'object') return undefined;
    cur = cur[p];
  }
  return cur;
}

// ---------- JS source patcher ----------
// Approach: find the exact `<finalKey>: "<jaValue>"` occurrence and replace its value.
// We use the dotted path to disambiguate by namespace if needed, but most leaf keys
// are unique enough. Strategy:
//   1. Compute finalKey = last segment of dotPath
//   2. Build search pattern: /(\b<finalKey>\s*:\s*)("...escape jaValue..."|'...'|`...`)/
//   3. If multiple matches in source, search within parent namespace block (heuristic)
//   4. Replace value with quoted proposed_ko
//
// For robustness, we instead use a direct read-modify-write on a parsed AST? Too heavy.
// Use a regex-based approach: find lines matching `<key>:\s*<quote><expectedJaValue><quote>`
// where the entire literal value matches expectedJaValue exactly.

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function jsStringLiteralEscape(s) {
  // Wrap in double quotes, escape \, ", and newlines
  return '"' + s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r') + '"';
}

// Find and replace one entry. Returns { ok, reason, beforeLine, afterLine }
function patchOne(src, dotPath, expectedJa, newKo, srcMutableRef) {
  const finalKey = dotPath.split('.').pop();
  const keyEsc = escapeRegExp(finalKey);

  // Pattern matches lines like:    finalKey: "ja_value",
  //                              "finalKey": 'ja_value',
  //                              finalKey: `ja_value`,
  // We require the value to be a quoted string literal (single, double, or backtick).
  // Match the literal portion strictly equal to expectedJa (after unescaping).

  // We'll use a permissive matcher then verify the unescaped value.
  // To keep this simple and safe, do an iterative search through quoted strings.

  // Build a regex that finds ANY occurrence of `<finalKey>: <quoted-string>`
  // The key can be bare or string-quoted.
  const keyRe = new RegExp(
    `(['"\`]?)${keyEsc}\\1\\s*:\\s*(['"\`])`,
    'g'
  );

  let m;
  const candidates = [];
  while ((m = keyRe.exec(srcMutableRef.value)) !== null) {
    const quote = m[2];
    const startOfStr = m.index + m[0].length; // first char of string content
    // Find matching closing quote (respecting backslash escapes)
    let i = startOfStr;
    let buf = '';
    let escaped = false;
    while (i < srcMutableRef.value.length) {
      const ch = srcMutableRef.value[i];
      if (escaped) {
        // Unescape common sequences
        if (ch === 'n') buf += '\n';
        else if (ch === 'r') buf += '\r';
        else if (ch === 't') buf += '\t';
        else if (ch === '\\') buf += '\\';
        else if (ch === '"') buf += '"';
        else if (ch === '\'') buf += '\'';
        else if (ch === '`') buf += '`';
        else if (ch === 'u' && i + 4 < srcMutableRef.value.length) {
          const hex = srcMutableRef.value.slice(i + 1, i + 5);
          if (/^[0-9a-fA-F]{4}$/.test(hex)) {
            buf += String.fromCharCode(parseInt(hex, 16));
            i += 4;
          } else {
            buf += ch;
          }
        }
        else buf += ch;
        escaped = false;
        i++;
        continue;
      }
      if (ch === '\\') { escaped = true; i++; continue; }
      if (ch === quote) {
        // Found end
        if (buf === expectedJa) {
          candidates.push({ matchStart: m.index, valueStart: startOfStr, valueEnd: i, quote });
        }
        break;
      }
      buf += ch;
      i++;
    }
  }

  if (candidates.length === 0) {
    return { ok: false, reason: 'NO_MATCH', detail: `key=${finalKey} expectedJa=${expectedJa.slice(0,40)}` };
  }
  if (candidates.length > 1) {
    // Multiple candidates — to disambiguate, prefer one whose surrounding source contains parent namespaces.
    // For now: skip if ambiguous, with reason
    return { ok: false, reason: 'AMBIGUOUS', detail: `key=${finalKey} matches=${candidates.length}` };
  }

  const c = candidates[0];
  // Replace value substring (valueStart..valueEnd, exclusive of closing quote)
  // We rewrite with double-quoted JS literal regardless of original quote (safe).
  const newLiteral = jsStringLiteralEscape(newKo);
  // We must also replace the original quote chars (open and close)
  const replaceFrom = c.valueStart - 1; // include opening quote
  const replaceTo   = c.valueEnd + 1;   // include closing quote
  srcMutableRef.value = srcMutableRef.value.slice(0, replaceFrom) + newLiteral + srcMutableRef.value.slice(replaceTo);

  return { ok: true };
}

// ---------- MAIN ----------
async function main() {
  // Existence
  for (const [name, p] of [['ko.js', KO_PATH], ['ja.js', JA_PATH], ['zh.js', ZH_PATH], ['en.js', EN_PATH], ['merged.csv', MERGED_CSV]]) {
    if (!fs.existsSync(p)) {
      console.error(`[FATAL] ${name} not found at ${p}`);
      process.exit(1);
    }
  }

  console.log(`[mode] ${APPLY ? 'APPLY (will write ko.js)' : 'DRY-RUN (no writes)'}`);

  // Read CSV
  const mergedRows = rowsToObjects(parseCsv(fs.readFileSync(MERGED_CSV, 'utf8')));
  console.log(`[load] merged.csv : ${mergedRows.length} rows`);

  // Hash before
  const jaBefore = crypto.createHash('sha256').update(fs.readFileSync(JA_PATH)).digest('hex');
  const zhBefore = crypto.createHash('sha256').update(fs.readFileSync(ZH_PATH)).digest('hex');

  // Read locales for verification
  const enMod = await import(pathToFileURL(EN_PATH).href + '?cb=' + Date.now());
  const koMod = await import(pathToFileURL(KO_PATH).href + '?cb=' + Date.now());
  const enObj = enMod.default || enMod;
  const koObj = koMod.default || koMod;
  const enLeavesBefore = countLeaves(enObj);
  const koLeavesBefore = countLeaves(koObj);
  console.log(`[before] en leaves: ${enLeavesBefore}  ko leaves: ${koLeavesBefore}`);

  // Iterate CSV rows, patch in-memory source
  const srcRef = { value: fs.readFileSync(KO_PATH, 'utf8') };
  const results = { ok: 0, noMatch: 0, ambiguous: 0, mismatch: 0 };
  const logLines = [];
  logLines.push(`# B7 patch log — ${new Date().toISOString()}`);
  logLines.push(`# mode: ${APPLY ? 'APPLY' : 'DRY-RUN'}`);
  logLines.push(`# csv rows: ${mergedRows.length}`);
  logLines.push('');

  for (const row of mergedRows) {
    const dotPath  = row.path;
    const expected = row.ja_value;
    const newKo    = row.proposed_ko;

    if (!dotPath || !expected || !newKo) {
      results.mismatch++;
      logLines.push(`SKIP_EMPTY  path=${dotPath} expected=${expected?.slice(0,30)}`);
      continue;
    }

    // Sanity: verify current ko value at path equals expected ja (the pollution)
    const curVal = getByPath(koObj, dotPath);
    if (typeof curVal !== 'string') {
      results.noMatch++;
      logLines.push(`PATH_NOT_STRING  ${dotPath}  type=${typeof curVal}`);
      continue;
    }
    if (curVal !== expected) {
      results.mismatch++;
      logLines.push(`VALUE_MISMATCH  ${dotPath}  expected="${expected.slice(0,40)}"  actual="${curVal.slice(0,40)}"`);
      continue;
    }

    const r = patchOne(srcRef.value, dotPath, expected, newKo, srcRef);
    if (r.ok) {
      results.ok++;
    } else if (r.reason === 'NO_MATCH') {
      results.noMatch++;
      logLines.push(`SRC_NO_MATCH    ${dotPath}  ${r.detail}`);
    } else if (r.reason === 'AMBIGUOUS') {
      results.ambiguous++;
      logLines.push(`SRC_AMBIGUOUS   ${dotPath}  ${r.detail}`);
    }
  }

  // Write log always
  fs.writeFileSync(LOG_PATH, logLines.join('\n') + '\n', 'utf8');

  // Summary
  console.log('================ B7 PATCH SUMMARY ================');
  console.log(`csv rows         : ${mergedRows.length}`);
  console.log(`patched (ok)     : ${results.ok}`);
  console.log(`value mismatch   : ${results.mismatch}  (current ko != expected ja; SKIPPED)`);
  console.log(`source no-match  : ${results.noMatch}  (path resolves but src regex fails; SKIPPED)`);
  console.log(`ambiguous match  : ${results.ambiguous}  (multiple finalKey matches; SKIPPED)`);
  console.log(`log              : ${LOG_PATH}`);
  console.log('==================================================');

  if (!APPLY) {
    console.log('[DRY-RUN] No files written. Re-run with --apply to commit.');
    return;
  }

  // APPLY mode: write with backup + verification
  const backupDir = path.join(ROOT, 'backup_session147_B7');
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
  const backupPath = path.join(backupDir, 'ko.js.bak');
  fs.copyFileSync(KO_PATH, backupPath);
  console.log(`[backup] ko.js -> ${backupPath}`);

  // Write
  fs.writeFileSync(KO_PATH, srcRef.value, 'utf8');
  console.log(`[write] ko.js (${srcRef.value.length} bytes)`);

  // Syntax check by re-importing
  try {
    const koAfter = await import(pathToFileURL(KO_PATH).href + '?cb2=' + Date.now());
    const koObjAfter = koAfter.default || koAfter;
    const koLeavesAfter = countLeaves(koObjAfter);
    console.log(`[after]  ko leaves: ${koLeavesAfter} (before: ${koLeavesBefore})`);

    if (koLeavesAfter !== koLeavesBefore) {
      console.error('[FATAL] ko.js leaf count changed! Rolling back.');
      fs.copyFileSync(backupPath, KO_PATH);
      process.exit(1);
    }
  } catch (e) {
    console.error('[FATAL] ko.js syntax error after patch — rolling back.');
    console.error(e.message);
    fs.copyFileSync(backupPath, KO_PATH);
    process.exit(1);
  }

  // Verify ja.js, zh.js bytes unchanged
  const jaAfter = crypto.createHash('sha256').update(fs.readFileSync(JA_PATH)).digest('hex');
  const zhAfter = crypto.createHash('sha256').update(fs.readFileSync(ZH_PATH)).digest('hex');
  if (jaAfter !== jaBefore) {
    console.error('[FATAL] ja.js bytes changed (N-79 violation)! Rolling back ko.js.');
    fs.copyFileSync(backupPath, KO_PATH);
    process.exit(1);
  }
  if (zhAfter !== zhBefore) {
    console.error('[FATAL] zh.js bytes changed (N-79 violation)! Rolling back ko.js.');
    fs.copyFileSync(backupPath, KO_PATH);
    process.exit(1);
  }
  console.log('[verify] ja.js sha256 unchanged ✓');
  console.log('[verify] zh.js sha256 unchanged ✓');

  // Verify en.js leaf count
  const enAfter = await import(pathToFileURL(EN_PATH).href + '?cb3=' + Date.now());
  const enObjAfter = enAfter.default || enAfter;
  const enLeavesAfter = countLeaves(enObjAfter);
  if (enLeavesAfter !== enLeavesBefore) {
    console.error('[FATAL] en.js leaf count changed! Rolling back ko.js.');
    fs.copyFileSync(backupPath, KO_PATH);
    process.exit(1);
  }
  console.log(`[verify] en.js leaves unchanged: ${enLeavesAfter} ✓`);

  console.log('==================================================');
  console.log('[SUCCESS] B7 apply complete. All 7 guards passed.');
  console.log(`  - ${results.ok} entries patched in ko.js`);
  console.log(`  - backup saved at ${backupPath}`);
  console.log(`  - log at ${LOG_PATH}`);
  console.log('==================================================');
}

main().catch(e => {
  console.error('[UNHANDLED ERROR]', e);
  process.exit(1);
});
