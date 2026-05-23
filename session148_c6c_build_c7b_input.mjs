// session148_c6c_build_c7b_input.mjs
// Purpose: Build c7b-compatible input CSV from c6b output + workbook
//
// Inputs:
//   - latin_long_tail_all_in_one.csv  (c6b output, 1,876 unique ko_value → suggested_ko)
//   - latin_long_workbook.csv         (3,798 occurrences with ns/path/ko_value)
//
// Output:
//   - latin_long_c6c_c7b_input.csv    (ns,path,ko_value,suggested_ko — expanded by occurrence)
//   - latin_long_c6c_build_log.txt    (verification report)
//
// Behavior:
//   - For each (ns, path, ko_value) in workbook, look up suggested_ko by ko_value
//   - Skip if ko_value not in mapping (warning, should be 0 if coverage is complete)
//   - Skip if suggested_ko == ko_value (no-op, will be filtered by c7b anyway, but log)
//   - Output schema matches what c7b expects: ns, path, ko_value, suggested_ko
//
// Guards:
//   - Verify workbook total rows
//   - Verify mapping coverage of workbook ko_values
//   - Detect orphan workbook ko_values (no mapping)
//   - Detect orphan mappings (not in workbook — would mean dead mapping)

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const IN_MAPPING = 'latin_long_tail_all_in_one.csv';
const IN_WORKBOOK = 'latin_long_workbook.csv';
const IN_C2_AUTO = 'latin_long_auto_mapped.csv';
const OUT_CSV = 'latin_long_c6c_c7b_input.csv';
const OUT_LOG = 'latin_long_c6c_build_log.txt';

const log = [];
const L = (s) => { log.push(s); console.log(s); };

L('=== c6c: build c7b input from c6b mapping + workbook ===');
L(`cwd: ${ROOT}`);
L('');

function parseCsv(text) {
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
  const rows = [];
  let row = [], field = '', inQ = false, i = 0;
  const n = text.length;
  while (i < n) {
    const c = text[i];
    if (inQ) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; }
        else { inQ = false; i++; }
      } else { field += c; i++; }
    } else {
      if (c === '"') { inQ = true; i++; }
      else if (c === ',') { row.push(field); field = ''; i++; }
      else if (c === '\r') {
        row.push(field); rows.push(row); row = []; field = ''; i++;
        if (text[i] === '\n') i++;
      } else if (c === '\n') {
        row.push(field); rows.push(row); row = []; field = ''; i++;
      } else { field += c; i++; }
    }
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows;
}

function escCsv(v) {
  const s = String(v ?? '');
  if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

// Normalize ko_value for fallback lookup (trim leading/trailing whitespace)
function normKo(s) { return String(s ?? '').trim(); }

// Verify inputs exist
for (const f of [IN_MAPPING, IN_WORKBOOK, IN_C2_AUTO]) {
  if (!fs.existsSync(path.join(ROOT, f))) {
    L(`FATAL: missing input ${f}`);
    fs.writeFileSync(path.join(ROOT, OUT_LOG), log.join('\n'));
    process.exit(1);
  }
}
L(`Inputs found: ${IN_MAPPING}, ${IN_WORKBOOK}`);
L('');

// Load c6b mapping
L('--- loading c6b mapping ---');
const mapRows = parseCsv(fs.readFileSync(path.join(ROOT, IN_MAPPING), 'utf8'));
const mapHeader = mapRows[0] || [];
const mapHasHeader = mapHeader.length >= 2 && mapHeader[0].toLowerCase() === 'ko_value';
const mapDataStart = mapHasHeader ? 1 : 0;
const mapIdxKo = mapHasHeader ? mapHeader.indexOf('ko_value') : 0;
const mapIdxSug = mapHasHeader ? mapHeader.indexOf('suggested_ko') : 1;

if (mapIdxKo < 0 || mapIdxSug < 0) {
  L(`FATAL: ${IN_MAPPING} missing required columns ko_value, suggested_ko`);
  L(`  header: ${JSON.stringify(mapHeader)}`);
  fs.writeFileSync(path.join(ROOT, OUT_LOG), log.join('\n'));
  process.exit(1);
}

const mapping = new Map(); // ko_value -> suggested_ko
const mappingNorm = new Map(); // trimmed ko_value -> suggested_ko (fallback)
const normToOrigKeys = new Map(); // trimmed -> Set of original mapping keys (for dead-mapping check)
let mapDup = 0;
for (let r = mapDataStart; r < mapRows.length; r++) {
  const row = mapRows[r];
  if (row.length < Math.max(mapIdxKo, mapIdxSug) + 1) continue;
  const ko = row[mapIdxKo];
  const sug = row[mapIdxSug];
  if (!ko) continue;
  if (mapping.has(ko)) {
    if (mapping.get(ko) !== sug) {
      L(`  ! duplicate ko_value with different suggested_ko: ${JSON.stringify(ko)}`);
    }
    mapDup++;
    continue;
  }
  mapping.set(ko, sug);
  const nk = normKo(ko);
  if (!mappingNorm.has(nk)) mappingNorm.set(nk, sug);
  if (!normToOrigKeys.has(nk)) normToOrigKeys.set(nk, new Set());
  normToOrigKeys.get(nk).add(ko);
}
L(`  loaded: ${mapping.size} unique mappings (duplicates skipped: ${mapDup})`);
L('');

// Load c2 auto_mapped overlay (workbook-style 8-col schema)
L('--- loading c2 auto_mapped ---');
const c6bKeys = new Set(mapping.keys());
const c2Rows = parseCsv(fs.readFileSync(path.join(ROOT, IN_C2_AUTO), 'utf8'));
const c2Header = c2Rows[0] || [];
const c2HasHeader = c2Header.includes('ko_value') && c2Header.includes('suggested_ko');
const c2DataStart = c2HasHeader ? 1 : 0;
const c2IdxKo = c2HasHeader ? c2Header.indexOf('ko_value') : -1;
const c2IdxSug = c2HasHeader ? c2Header.indexOf('suggested_ko') : -1;
if (c2IdxKo < 0 || c2IdxSug < 0) {
  L(`FATAL: ${IN_C2_AUTO} missing required columns ko_value, suggested_ko`);
  L(`  header: ${JSON.stringify(c2Header)}`);
  fs.writeFileSync(path.join(ROOT, OUT_LOG), log.join('\n'));
  process.exit(1);
}
let c2Added = 0, c2OverlapWithC6b = 0;
const c2Seen = new Set();
for (let r = c2DataStart; r < c2Rows.length; r++) {
  const row = c2Rows[r];
  if (row.length < Math.max(c2IdxKo, c2IdxSug) + 1) continue;
  const ko = row[c2IdxKo];
  const sug = row[c2IdxSug];
  if (!ko) continue;
  if (c2Seen.has(ko)) continue; // c2-internal duplicate
  c2Seen.add(ko);
  if (mapping.has(ko)) { c2OverlapWithC6b++; continue; }
  mapping.set(ko, sug);
  const nk = normKo(ko);
  if (!mappingNorm.has(nk)) mappingNorm.set(nk, sug);
  if (!normToOrigKeys.has(nk)) normToOrigKeys.set(nk, new Set());
  normToOrigKeys.get(nk).add(ko);
  c2Added++;
}
L(`  c2 unique loaded: ${c2Seen.size}`);
L(`  c2 added: ${c2Added}, overlap with c6b: ${c2OverlapWithC6b}`);
L(`  total mapping after c2: ${mapping.size}`);
L('');

// Load workbook
L('--- loading workbook ---');
const wbRows = parseCsv(fs.readFileSync(path.join(ROOT, IN_WORKBOOK), 'utf8'));
const wbHeader = wbRows[0] || [];
const wbIdxNs = wbHeader.indexOf('ns');
const wbIdxPath = wbHeader.indexOf('path');
const wbIdxKo = wbHeader.indexOf('ko_value');

if (wbIdxNs < 0 || wbIdxPath < 0 || wbIdxKo < 0) {
  L(`FATAL: workbook missing required columns ns, path, ko_value`);
  L(`  header: ${JSON.stringify(wbHeader)}`);
  fs.writeFileSync(path.join(ROOT, OUT_LOG), log.join('\n'));
  process.exit(1);
}

const wbData = wbRows.slice(1).filter(r => r.length >= Math.max(wbIdxNs, wbIdxPath, wbIdxKo) + 1);
L(`  workbook rows: ${wbData.length} (expected 3,798)`);
L('');

// Build c7b input
L('--- building c7b input ---');
const outRows = [['ns', 'path', 'ko_value', 'suggested_ko']];
let matched = 0, orphans = 0, noOps = 0, normFallbackHits = 0;
const orphanKoValues = new Set();
const matchedKoValues = new Set();
const matchedMapKeys = new Set(); // mapping keys actually used (for dead-mapping detection)

for (const r of wbData) {
  const ns = r[wbIdxNs];
  const pathVal = r[wbIdxPath];
  const ko = r[wbIdxKo];
  if (!ko) continue;
  let sug;
  if (mapping.has(ko)) {
    sug = mapping.get(ko);
    matchedMapKeys.add(ko);
  } else {
    const nk = normKo(ko);
    if (mappingNorm.has(nk)) {
      sug = mappingNorm.get(nk);
      normFallbackHits++;
      for (const origKey of normToOrigKeys.get(nk)) matchedMapKeys.add(origKey);
    } else {
      orphans++;
      orphanKoValues.add(ko);
      continue;
    }
  }
  matchedKoValues.add(ko);
  if (sug === ko) {
    noOps++;
    // Still emit — let c7b filter as no-op (consistent with c7b internal logic)
  }
  outRows.push([ns, pathVal, ko, sug]);
  matched++;
}

L(`  matched (occurrences): ${matched}`);
L(`  orphans (no mapping):  ${orphans} (across ${orphanKoValues.size} unique ko_values)`);
L(`  normalized fallback hits: ${normFallbackHits}`);
L(`  no-ops (sug==ko):      ${noOps}`);
L('');

// Detect dead mappings (mappings present but never referenced in workbook)
L('--- coverage check ---');
const deadMappings = [];
for (const ko of mapping.keys()) {
  if (!matchedMapKeys.has(ko)) deadMappings.push(ko);
}
L(`  workbook unique ko_values matched: ${matchedKoValues.size}`);
L(`  workbook unique ko_values orphan:  ${orphanKoValues.size}`);
L(`  mapping unique ko_values total:    ${mapping.size}`);
L(`  dead mappings (in map, not in wb): ${deadMappings.length}`);
L('');

if (orphanKoValues.size > 0) {
  L(`--- orphan workbook ko_values (first 20) ---`);
  let i = 0;
  for (const ko of orphanKoValues) {
    L(`  ${JSON.stringify(ko)}`);
    if (++i >= 20) break;
  }
  if (orphanKoValues.size > 20) L(`  ... (${orphanKoValues.size - 20} more)`);
  L('');
}

if (deadMappings.length > 0) {
  L(`--- dead mappings (first 20) ---`);
  for (const ko of deadMappings.slice(0, 20)) {
    L(`  ${JSON.stringify(ko)}`);
  }
  if (deadMappings.length > 20) L(`  ... (${deadMappings.length - 20} more)`);
  L('');
}

// Write output
fs.writeFileSync(
  path.join(ROOT, OUT_CSV),
  outRows.map(r => r.map(escCsv).join(',')).join('\n') + '\n',
  'utf8'
);
L(`Wrote: ${OUT_CSV} (${outRows.length - 1} data rows)`);

// Validation
let ok = true;
function check(label, actual, expected) {
  const pass = actual === expected;
  L(`${pass ? '✓' : '✗'} ${label}: ${actual} (expected ${expected})`);
  if (!pass) ok = false;
}

L('');
L('--- final checks ---');
check('workbook total rows', wbData.length, 3798);
check('mapping unique total', mapping.size, 1914);
check('orphans (should be 0 if coverage complete)', orphans, 0);

// Note: deadMappings check is informational, not blocking
if (deadMappings.length > 0) {
  L(`⚠ ${deadMappings.length} mappings not referenced by workbook (informational, may indicate workbook/mapping mismatch)`);
}

L('');
L(`Status: ${ok ? 'OK' : 'FAILED'}`);

fs.writeFileSync(path.join(ROOT, OUT_LOG), log.join('\n') + '\n', 'utf8');
L(`Log written: ${OUT_LOG}`);

process.exit(ok ? 0 : 2);
