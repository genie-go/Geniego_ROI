// session147_b8e_apply_tail_patch.mjs
// B8-E: Apply japanese_tail_mapped.csv (B8-D v2 output) to ko.js.
//
// Algorithm: identical to b7v2 — full-dotted-path resolution + direct offset replacement.
// Input differs from b7v2: this consumes the b8 tail (2,505 rows from B8-D v2) instead of
// the b1-b5 merged set (2,122 rows). Schema is identical: path, ko_current, ja_value,
// proposed_ko, source, ns — so the b7v2 patcher logic works unmodified except for path
// constants and the backup folder name.
//
// Strategy: parse ko.js source once, building a complete map of
//   { dottedPath -> { valueStart, valueEnd, quote } } for every string leaf.
// Then patch by direct offset replacement (no ambiguity).
//
// Safety guards (N-145-B, 7 of them) — same as b7v2:
//   G1. Backup ko.js to backup_session147_B8E/
//   G2. ja.js bytes unchanged (SHA256, N-79 sacred)
//   G3. zh.js bytes unchanged (SHA256, N-79 sacred)
//   G4. en.js leaf count unchanged
//   G5. ko.js leaf count unchanged (path-only edit)
//   G6. Dry-run first; user must rerun with --apply
//   G7. ko.js re-import syntax check; rollback on fail
//
// B7 v2 RESULT PROTECTION:
//   - Before patching, verify that the rows in tail_mapped.csv all have ko_current
//     values that LOOK like raw Japanese (not already patched by b7v2). This is a
//     defensive read-only check — b7v2 patched a disjoint set (the merged.csv rows),
//     so b8e's input (the unmapped tail) should still contain raw Japanese ko_current.
//
// Usage:
//   node session147_b8e_apply_tail_patch.mjs              (dry-run)
//   node session147_b8e_apply_tail_patch.mjs --apply      (commit)

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

const MERGED_CSV = path.join(ROOT, 'japanese_tail_mapped.csv');  // B8-D v2 output
const LOG_PATH   = path.join(ROOT, 'b8e_patch_log.txt');

const APPLY = process.argv.includes('--apply');

// ============================================================
// CSV parser (minimal)
// ============================================================
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

// ============================================================
// Leaf counter (N-145-A: recursive walk)
// ============================================================
function countLeaves(obj) {
  let n = 0;
  function walk(v) {
    if (v === null || v === undefined) return;
    if (typeof v === 'string') { n++; return; }
    if (Array.isArray(v)) {
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

// ============================================================
// CORE: parse ko.js source -> path -> {valueStart, valueEnd, quote}
//
// ko.js structure (assumed):
//   export default {
//     ns1: {
//       key1: "value",
//       sub: { key2: "value" },
//       ...
//     },
//     ns2: { ... },
//   };
//
// We tokenize, tracking:
//   - brace depth + a stack of "current key" at each depth level
//   - when we encounter `<key>:` we push pending key
//   - when we encounter a string literal as the value, we record:
//        path = stack.join('.')   (the current pending key at this level)
//        valueStart/valueEnd = offset of string CONTENT (excluding quotes)
//   - we handle strings, template literals (no ${} expressions assumed in i18n),
//     line comments //, block comments /* */, arrays, nested objects.
//
// Limitations:
//   - assumes no ${} interpolation inside template literals at top-level values
//   - assumes object keys are bare identifiers OR quoted strings (no computed keys)
//   - handles arrays containing only strings as a single "leaf" (we don't patch array
//     elements individually since merged.csv paths point to scalar leaves)
//
// Robustness:
//   - if parse fails, returns null (fatal)
// ============================================================
function buildPathMap(src) {
  const pathMap = new Map(); // dotted-path -> { valueStart, valueEnd, quote, unescapedValue }
  const stack = [];          // current path components (excluding "default" root)
  let i = 0;
  const n = src.length;

  // Find `export default {` and start at the `{`
  const expDef = src.match(/export\s+default\s*\{/);
  if (!expDef) return { error: 'no export-default found' };
  i = expDef.index + expDef[0].length;  // now at char after the `{`
  stack.push('__root__');               // sentinel; will be replaced as we descend

  // Track expected token. State:
  //   'KEY_OR_END'     — expect bare-key, "key", 'key', `key`, or `}`
  //   'COLON'          — expect `:`
  //   'VALUE'          — expect value (string, object, array, number, bool, null, identifier)
  //   'COMMA_OR_END'   — expect `,` or `}`
  let state = 'KEY_OR_END';
  let pendingKey = null;        // key name we just read; will become path[depth] when entering object

  // We need to track *which key* we're currently inside. When we open an object as a value,
  // we descend into it: stack push pendingKey.
  // When we close `}`, we pop.
  // For a scalar leaf, we record then move to COMMA_OR_END.

  while (i < n) {
    const ch = src[i];

    // Skip whitespace
    if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') { i++; continue; }

    // Skip line comment
    if (ch === '/' && src[i + 1] === '/') {
      while (i < n && src[i] !== '\n') i++;
      continue;
    }
    // Skip block comment
    if (ch === '/' && src[i + 1] === '*') {
      i += 2;
      while (i < n && !(src[i] === '*' && src[i + 1] === '/')) i++;
      i += 2;
      continue;
    }

    if (state === 'KEY_OR_END') {
      if (ch === '}') {
        // End of current object
        i++;
        stack.pop();
        if (stack.length === 0) {
          // Reached end of root
          break;
        }
        state = 'COMMA_OR_END';
        continue;
      }
      if (ch === ',') {
        // Trailing comma before end; just skip
        i++;
        continue;
      }
      // Read a key
      let key;
      if (ch === '"' || ch === '\'' || ch === '`') {
        // Quoted key
        const r = readString(src, i);
        if (!r) return { error: `bad string at ${i}` };
        key = r.value;
        i = r.endPlus1;
      } else if (/[A-Za-z_$0-9]/.test(ch)) {
        // Bare identifier (can include digits and _, $)
        const start = i;
        while (i < n && /[A-Za-z_$0-9]/.test(src[i])) i++;
        key = src.slice(start, i);
      } else {
        return { error: `unexpected char '${ch}' at ${i} expecting key` };
      }
      pendingKey = key;
      state = 'COLON';
      continue;
    }

    if (state === 'COLON') {
      if (ch === ':') {
        i++;
        state = 'VALUE';
        continue;
      }
      return { error: `expected ':' at ${i} got '${ch}'` };
    }

    if (state === 'VALUE') {
      // Compute current dotted path for this leaf (or new object)
      // stack currently has the path up to PARENT; we add pendingKey for THIS value
      const fullPathParts = stack.slice(1).concat(pendingKey); // exclude sentinel
      const dotted = fullPathParts.join('.');

      if (ch === '{') {
        // Open nested object. Push pendingKey onto stack and recurse via state machine.
        i++;
        stack.push(pendingKey);
        pendingKey = null;
        state = 'KEY_OR_END';
        continue;
      }
      if (ch === '[') {
        // Array. Skip entire array (we don't patch array leaves individually).
        const r = skipArray(src, i);
        if (!r) return { error: `bad array at ${i}` };
        i = r.endPlus1;
        // Record as a leaf? Only if all-string array (matches countLeaves rule)
        // But we never have CSV paths pointing into arrays anyway. Skip recording.
        pendingKey = null;
        state = 'COMMA_OR_END';
        continue;
      }
      if (ch === '"' || ch === '\'' || ch === '`') {
        // String leaf — RECORD IT
        const r = readString(src, i);
        if (!r) return { error: `bad string value at ${i}` };
        // record
        if (pathMap.has(dotted)) {
          // Duplicate path? Should not happen in i18n. Overwrite with last occurrence.
          // (We'll surface this as a warning later.)
        }
        pathMap.set(dotted, {
          valueStart: r.contentStart,
          valueEnd: r.contentEnd,         // exclusive
          quote: src[i],
          unescapedValue: r.value,
        });
        i = r.endPlus1;
        pendingKey = null;
        state = 'COMMA_OR_END';
        continue;
      }
      // Number, bool, null, identifier (function ref?), etc — skip until , or }
      // Be careful: also handle nested expressions? In i18n files this should not happen.
      const startSkip = i;
      let depth = 0;
      while (i < n) {
        const c = src[i];
        if (c === '"' || c === '\'' || c === '`') {
          const r = readString(src, i);
          if (!r) return { error: `bad inner string at ${i}` };
          i = r.endPlus1;
          continue;
        }
        if (c === '{' || c === '[' || c === '(') depth++;
        else if (c === '}' || c === ']' || c === ')') {
          if (depth === 0) break;
          depth--;
        }
        else if (c === ',' && depth === 0) break;
        i++;
      }
      pendingKey = null;
      state = 'COMMA_OR_END';
      continue;
    }

    if (state === 'COMMA_OR_END') {
      if (ch === ',') { i++; state = 'KEY_OR_END'; continue; }
      if (ch === '}') {
        // Close current object
        i++;
        stack.pop();
        if (stack.length === 0) break;
        // After closing, we're still in COMMA_OR_END of parent context
        state = 'COMMA_OR_END';
        continue;
      }
      return { error: `expected ',' or '}' at ${i} got '${ch}'` };
    }
  }

  return { pathMap };
}

// Read a string literal. Returns { value, contentStart, contentEnd, endPlus1 }
// where contentStart is the offset of the first char of content (after opening quote)
// and contentEnd is the offset of the closing quote (exclusive of content).
function readString(src, openIdx) {
  const quote = src[openIdx];
  if (quote !== '"' && quote !== '\'' && quote !== '`') return null;
  let i = openIdx + 1;
  const contentStart = i;
  let buf = '';
  const n = src.length;
  while (i < n) {
    const ch = src[i];
    if (ch === '\\') {
      const next = src[i + 1];
      if (next === undefined) return null;
      if (next === 'n') buf += '\n';
      else if (next === 'r') buf += '\r';
      else if (next === 't') buf += '\t';
      else if (next === '\\') buf += '\\';
      else if (next === '"') buf += '"';
      else if (next === '\'') buf += '\'';
      else if (next === '`') buf += '`';
      else if (next === 'u' && /^[0-9a-fA-F]{4}$/.test(src.slice(i + 2, i + 6))) {
        buf += String.fromCharCode(parseInt(src.slice(i + 2, i + 6), 16));
        i += 6;
        continue;
      } else {
        buf += next;
      }
      i += 2;
      continue;
    }
    if (ch === quote) {
      return { value: buf, contentStart, contentEnd: i, endPlus1: i + 1 };
    }
    // Template literal expressions ${...} — would need handling, but i18n files don't use them.
    // We treat ${ as literal text.
    buf += ch;
    i++;
  }
  return null;
}

function skipArray(src, openIdx) {
  if (src[openIdx] !== '[') return null;
  let i = openIdx + 1;
  let depth = 1;
  const n = src.length;
  while (i < n) {
    const ch = src[i];
    if (ch === '"' || ch === '\'' || ch === '`') {
      const r = readString(src, i);
      if (!r) return null;
      i = r.endPlus1;
      continue;
    }
    if (ch === '/' && src[i + 1] === '/') {
      while (i < n && src[i] !== '\n') i++;
      continue;
    }
    if (ch === '/' && src[i + 1] === '*') {
      i += 2;
      while (i < n && !(src[i] === '*' && src[i + 1] === '/')) i++;
      i += 2;
      continue;
    }
    if (ch === '[' || ch === '{') depth++;
    else if (ch === ']' || ch === '}') {
      depth--;
      if (depth === 0) return { endPlus1: i + 1 };
    }
    i++;
  }
  return null;
}

function jsStringLiteralEscape(s) {
  return '"' + s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r') + '"';
}

// ============================================================
// MAIN
// ============================================================
async function main() {
  // Pre-checks
  for (const [name, p] of [['ko.js', KO_PATH], ['ja.js', JA_PATH], ['zh.js', ZH_PATH], ['en.js', EN_PATH], ['merged.csv', MERGED_CSV]]) {
    if (!fs.existsSync(p)) { console.error(`[FATAL] ${name} not found at ${p}`); process.exit(1); }
  }

  console.log(`[mode] ${APPLY ? 'APPLY (will write ko.js)' : 'DRY-RUN (no writes)'}`);

  // Load CSV
  const mergedRows = rowsToObjects(parseCsv(fs.readFileSync(MERGED_CSV, 'utf8')));
  console.log(`[load] merged.csv : ${mergedRows.length} rows`);

  // Pre-hashes for sacred files
  const jaBefore = crypto.createHash('sha256').update(fs.readFileSync(JA_PATH)).digest('hex');
  const zhBefore = crypto.createHash('sha256').update(fs.readFileSync(ZH_PATH)).digest('hex');

  // Import objects for verification
  const enMod = await import(pathToFileURL(EN_PATH).href + '?cb=' + Date.now());
  const koMod = await import(pathToFileURL(KO_PATH).href + '?cb=' + Date.now());
  const enObj = enMod.default || enMod;
  const koObj = koMod.default || koMod;
  const enLeavesBefore = countLeaves(enObj);
  const koLeavesBefore = countLeaves(koObj);
  console.log(`[before] en leaves: ${enLeavesBefore}  ko leaves: ${koLeavesBefore}`);

  // Parse ko.js source -> path map
  const koSrc = fs.readFileSync(KO_PATH, 'utf8');
  console.log(`[parse] ko.js source: ${koSrc.length} bytes`);
  const parsed = buildPathMap(koSrc);
  if (parsed.error) {
    console.error(`[FATAL] ko.js parse failed: ${parsed.error}`);
    process.exit(1);
  }
  const pathMap = parsed.pathMap;
  console.log(`[parse] path map built: ${pathMap.size} string leaves found`);

  // Sanity check: pathMap size should be close to koLeavesBefore
  // (Strings only; arrays-of-strings count as 1 leaf in countLeaves but 0 in pathMap by design)
  const leafDiff = Math.abs(pathMap.size - koLeavesBefore);
  console.log(`[parse] map size vs leaf count diff: ${leafDiff}`);

  // Iterate CSV — for each row, look up its path in pathMap
  const edits = []; // { offsetStart, offsetEnd, newLiteral }
  const results = { ok: 0, pathNotFound: 0, valueMismatch: 0, skipped: 0 };
  const logLines = [];
  logLines.push(`# B8-E patch log — ${new Date().toISOString()}`);
  logLines.push(`# mode: ${APPLY ? 'APPLY' : 'DRY-RUN'}`);
  logLines.push(`# csv rows: ${mergedRows.length}`);
  logLines.push(`# ko.js leaves: ${koLeavesBefore}; path map size: ${pathMap.size}`);
  logLines.push('');

  for (const row of mergedRows) {
    const dotPath  = row.path;
    const expected = row.ja_value;
    const newKo    = row.proposed_ko;

    if (!dotPath || !expected || !newKo) {
      results.skipped++;
      logLines.push(`SKIP_EMPTY path=${dotPath}`);
      continue;
    }

    const entry = pathMap.get(dotPath);
    if (!entry) {
      results.pathNotFound++;
      logLines.push(`PATH_NOT_FOUND  ${dotPath}  expected="${expected.slice(0,40)}"`);
      continue;
    }
    if (entry.unescapedValue !== expected) {
      results.valueMismatch++;
      logLines.push(`VALUE_MISMATCH  ${dotPath}  expected="${expected.slice(0,40)}"  actual="${entry.unescapedValue.slice(0,40)}"`);
      continue;
    }

    // Queue edit: replace [valueStart-1, valueEnd+1) (including quotes) with new literal
    edits.push({
      offsetStart: entry.valueStart - 1,   // opening quote
      offsetEnd:   entry.valueEnd + 1,     // after closing quote
      newLiteral:  jsStringLiteralEscape(newKo),
      path: dotPath,
    });
    results.ok++;
  }

  fs.writeFileSync(LOG_PATH, logLines.join('\n') + '\n', 'utf8');

  console.log('================ B8-E PATCH SUMMARY ================');
  console.log(`csv rows         : ${mergedRows.length}`);
  console.log(`patched (ok)     : ${results.ok}`);
  console.log(`path not found   : ${results.pathNotFound}`);
  console.log(`value mismatch   : ${results.valueMismatch}`);
  console.log(`skipped (empty)  : ${results.skipped}`);
  console.log(`log              : ${LOG_PATH}`);
  console.log('=====================================================');

  // B8-E diagnostic boost: print first 5 mismatches with full ja-side hex prefix
  // (helps diagnose hidden whitespace / NBSP / LF/CRLF issues quickly)
  if (results.valueMismatch > 0) {
    console.log('');
    console.log('--- VALUE_MISMATCH diagnostics (first 5) ---');
    let shown = 0;
    for (const row of mergedRows) {
      if (shown >= 5) break;
      const entry = pathMap.get(row.path);
      if (!entry) continue;
      if (entry.unescapedValue === row.ja_value) continue;
      shown++;
      const hexPrefix = (s) =>
        Array.from(s.slice(0, 20)).map(ch => ch.codePointAt(0).toString(16).padStart(4, '0')).join(' ');
      console.log(`  path: ${row.path}`);
      console.log(`    csv ja  : ${row.ja_value.slice(0, 60)}`);
      console.log(`    ko.js ja: ${entry.unescapedValue.slice(0, 60)}`);
      console.log(`    csv hex : ${hexPrefix(row.ja_value)}`);
      console.log(`    ko.js hx: ${hexPrefix(entry.unescapedValue)}`);
    }
    console.log('---');
  }

  if (!APPLY) {
    console.log('[DRY-RUN] No files written. Re-run with --apply to commit.');
    return;
  }

  // Apply: sort edits by offsetStart DESCENDING and splice into source
  edits.sort((a, b) => b.offsetStart - a.offsetStart);
  let newSrc = koSrc;
  for (const e of edits) {
    newSrc = newSrc.slice(0, e.offsetStart) + e.newLiteral + newSrc.slice(e.offsetEnd);
  }

  // Backup
  const backupDir = path.join(ROOT, 'backup_session147_B8E');
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
  const backupPath = path.join(backupDir, 'ko.js.bak');
  fs.copyFileSync(KO_PATH, backupPath);
  console.log(`[backup] ko.js -> ${backupPath}`);

  // Write
  fs.writeFileSync(KO_PATH, newSrc, 'utf8');
  console.log(`[write] ko.js: ${koSrc.length} -> ${newSrc.length} bytes`);

  // Verify: re-import, count leaves, compare
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
    console.error('[FATAL] ko.js syntax error — rolling back.');
    console.error(e.message);
    fs.copyFileSync(backupPath, KO_PATH);
    process.exit(1);
  }

  // Sacred files unchanged
  const jaAfter = crypto.createHash('sha256').update(fs.readFileSync(JA_PATH)).digest('hex');
  const zhAfter = crypto.createHash('sha256').update(fs.readFileSync(ZH_PATH)).digest('hex');
  if (jaAfter !== jaBefore) {
    console.error('[FATAL] ja.js bytes changed — rollback.');
    fs.copyFileSync(backupPath, KO_PATH);
    process.exit(1);
  }
  if (zhAfter !== zhBefore) {
    console.error('[FATAL] zh.js bytes changed — rollback.');
    fs.copyFileSync(backupPath, KO_PATH);
    process.exit(1);
  }
  console.log('[verify] ja.js sha256 unchanged ✓');
  console.log('[verify] zh.js sha256 unchanged ✓');

  // en.js leaf count
  const enAfter = await import(pathToFileURL(EN_PATH).href + '?cb3=' + Date.now());
  const enObjAfter = enAfter.default || enAfter;
  const enLeavesAfter = countLeaves(enObjAfter);
  if (enLeavesAfter !== enLeavesBefore) {
    console.error('[FATAL] en.js leaf count changed — rollback.');
    fs.copyFileSync(backupPath, KO_PATH);
    process.exit(1);
  }
  console.log(`[verify] en.js leaves unchanged: ${enLeavesAfter} ✓`);

  console.log('=====================================================');
  console.log('[SUCCESS] B8-E apply complete. All 7 guards passed.');
  console.log(`  - ${results.ok} entries patched in ko.js`);
  console.log(`  - backup at ${backupPath}`);
  console.log(`  - log at ${LOG_PATH}`);
  console.log('=====================================================');
}

main().catch(e => {
  console.error('[UNHANDLED ERROR]', e);
  process.exit(1);
});
