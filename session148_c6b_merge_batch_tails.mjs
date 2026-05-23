// session148_c6b_merge_batch_tails.mjs
// Purpose: Merge 10 batch tail mapped CSVs into a single canonical mapping file
// Inputs:
//   - latin_long_unmapped_batch_01_raw_final_mapped.csv
//   - ... (batch_02 ~ batch_10)
//   - latin_long_top500_raw_final_mapped.csv (already exists from earlier)
// Outputs:
//   - latin_long_tail_merged.csv        (1,376 batch entries merged)
//   - latin_long_tail_all_in_one.csv    (top500 500 + tail 1,376 = 1,876 entries)
//   - latin_long_tail_merge_log.txt     (verification report)
//
// CSV format expected (matches c5 output):
//   ko_value,suggested_ko,count,path_sample
//
// Guards:
//   - Detect duplicate ko_value across batches (should be 0 — they came from disjoint unique sets)
//   - Detect duplicate ko_value vs top500 (should be 0 — disjoint)
//   - Verify total = 1,876
//   - Detect empty suggested_ko (should be 0)
//   - Detect ko_value == suggested_ko (no-op, log only)

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const BATCH_FILES = [];
for (let i = 1; i <= 10; i++) {
  const nn = String(i).padStart(2, '0');
  BATCH_FILES.push(`latin_long_unmapped_batch_${nn}_raw_final_mapped.csv`);
}
const TOP500_FILE = 'latin_long_top500_raw_final_mapped.csv';

const OUT_TAIL = 'latin_long_tail_merged.csv';
const OUT_ALL = 'latin_long_tail_all_in_one.csv';
const OUT_LOG = 'latin_long_tail_merge_log.txt';

function parseCsv(text) {
  // Simple CSV parser respecting double-quoted values with embedded commas/quotes
  const rows = [];
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    if (!line.trim()) continue;
    const row = [];
    let cur = '';
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQ) {
        if (ch === '"') {
          if (line[i + 1] === '"') { cur += '"'; i++; }
          else { inQ = false; }
        } else cur += ch;
      } else {
        if (ch === ',') { row.push(cur); cur = ''; }
        else if (ch === '"') { inQ = true; }
        else cur += ch;
      }
    }
    row.push(cur);
    rows.push(row);
  }
  return rows;
}

function escCsv(v) {
  const s = String(v ?? '');
  if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

const log = [];
function L(line) { log.push(line); console.log(line); }

L('=== c6b: merge batch tail mappings ===');
L(`cwd: ${ROOT}`);
L('');

// Verify all inputs exist
const allInputs = [TOP500_FILE, ...BATCH_FILES];
const missing = allInputs.filter(f => !fs.existsSync(path.join(ROOT, f)));
if (missing.length) {
  L(`FATAL: missing inputs (${missing.length}):`);
  for (const m of missing) L(`  - ${m}`);
  fs.writeFileSync(path.join(ROOT, OUT_LOG), log.join('\n'));
  process.exit(1);
}
L(`All ${allInputs.length} input files present.`);
L('');

// Read each, parse, accumulate
const byKoValue = new Map(); // ko_value -> {suggested_ko, count, path_sample, source}
const collisions = []; // duplicate ko_value across sources
const noOps = []; // ko_value == suggested_ko
const empties = []; // empty suggested_ko
const sourceTallies = {};

function loadSource(filename, sourceLabel) {
  const txt = fs.readFileSync(path.join(ROOT, filename), 'utf8');
  const rows = parseCsv(txt);
  if (!rows.length) {
    L(`  ! ${filename}: empty`);
    return 0;
  }
  // Detect header (c5 output schema: ko_value,count,path,ja_value,en_value,suggested_ko)
  const first = rows[0];
  let startIdx = 0;
  if (first.length >= 6 && first[0] === 'ko_value' && first[5] === 'suggested_ko') {
    startIdx = 1;
  }
  let added = 0;
  for (let r = startIdx; r < rows.length; r++) {
    const row = rows[r];
    if (row.length < 6) continue;
    const ko = row[0];
    const count = row[1] || '1';
    const pathSample = row[2] || '';
    const sug = row[5];
    if (!ko) continue;
    if (!sug || !sug.trim()) {
      empties.push({ source: sourceLabel, ko_value: ko });
      continue;
    }
    if (ko === sug) {
      noOps.push({ source: sourceLabel, ko_value: ko });
    }
    if (byKoValue.has(ko)) {
      const prev = byKoValue.get(ko);
      if (prev.suggested_ko !== sug) {
        collisions.push({
          ko_value: ko,
          prev_source: prev.source,
          prev_suggested: prev.suggested_ko,
          new_source: sourceLabel,
          new_suggested: sug,
        });
      }
      // Keep first occurrence (top500 wins over batches; lower batch wins over higher)
      continue;
    }
    byKoValue.set(ko, { suggested_ko: sug, count, path_sample: pathSample, source: sourceLabel });
    added++;
  }
  sourceTallies[sourceLabel] = added;
  return added;
}

// Load top500 first (highest priority)
L('--- loading top500 ---');
const top500Count = loadSource(TOP500_FILE, 'top500');
L(`  top500: ${top500Count} loaded`);
L('');

// Load batches in order
L('--- loading batches ---');
const batchCounts = [];
for (let i = 0; i < BATCH_FILES.length; i++) {
  const nn = String(i + 1).padStart(2, '0');
  const cnt = loadSource(BATCH_FILES[i], `batch_${nn}`);
  batchCounts.push(cnt);
  L(`  batch_${nn}: ${cnt} loaded`);
}
L('');

// Summary
const totalUnique = byKoValue.size;
const totalAdded = top500Count + batchCounts.reduce((a, b) => a + b, 0);
L('--- summary ---');
L(`unique ko_value (merged map size): ${totalUnique}`);
L(`total added across all sources:    ${totalAdded}`);
L(`collisions detected:               ${collisions.length}`);
L(`no-ops (ko == suggested):          ${noOps.length}`);
L(`empty suggested_ko:                ${empties.length}`);
L('');

// Expectations
const EXPECT_TOP500 = 500;
const EXPECT_BATCH_TOTAL = 1376;
const EXPECT_GRAND = 1876;

let ok = true;
function check(label, actual, expected) {
  const pass = actual === expected;
  L(`${pass ? '✓' : '✗'} ${label}: ${actual} (expected ${expected})`);
  if (!pass) ok = false;
}
check('top500 count', top500Count, EXPECT_TOP500);
check('batch tail total', batchCounts.reduce((a, b) => a + b, 0), EXPECT_BATCH_TOTAL);
check('grand unique', totalUnique, EXPECT_GRAND);
L('');

if (collisions.length) {
  L('--- COLLISIONS (suggested_ko differs across sources) ---');
  for (const c of collisions.slice(0, 30)) {
    L(`  ko_value=${JSON.stringify(c.ko_value)}`);
    L(`    ${c.prev_source}: ${JSON.stringify(c.prev_suggested)}`);
    L(`    ${c.new_source}: ${JSON.stringify(c.new_suggested)}`);
  }
  if (collisions.length > 30) L(`  ... (${collisions.length - 30} more)`);
  L('');
}

if (noOps.length) {
  L(`--- no-ops (ko == suggested, ${noOps.length} entries, kept as-is) ---`);
  for (const n of noOps.slice(0, 20)) {
    L(`  [${n.source}] ${JSON.stringify(n.ko_value)}`);
  }
  if (noOps.length > 20) L(`  ... (${noOps.length - 20} more)`);
  L('');
}

if (empties.length) {
  L('--- FATAL: empty suggested_ko ---');
  for (const e of empties) L(`  [${e.source}] ${JSON.stringify(e.ko_value)}`);
  L('');
  ok = false;
}

// Write outputs
// 1. tail_merged.csv (batch entries only, ordered by batch_01..10)
const tailRows = [['ko_value', 'suggested_ko', 'count', 'path_sample', 'source']];
const allRows = [['ko_value', 'suggested_ko', 'count', 'path_sample', 'source']];
for (const [ko, info] of byKoValue.entries()) {
  const row = [ko, info.suggested_ko, info.count, info.path_sample, info.source];
  allRows.push(row);
  if (info.source !== 'top500') tailRows.push(row);
}

fs.writeFileSync(
  path.join(ROOT, OUT_TAIL),
  tailRows.map(r => r.map(escCsv).join(',')).join('\n') + '\n',
  'utf8'
);
fs.writeFileSync(
  path.join(ROOT, OUT_ALL),
  allRows.map(r => r.map(escCsv).join(',')).join('\n') + '\n',
  'utf8'
);

L(`Wrote: ${OUT_TAIL} (${tailRows.length - 1} entries)`);
L(`Wrote: ${OUT_ALL} (${allRows.length - 1} entries)`);
L('');
L(`Status: ${ok ? 'OK' : 'FAILED'}`);

fs.writeFileSync(path.join(ROOT, OUT_LOG), log.join('\n') + '\n', 'utf8');
L(`Log written: ${OUT_LOG}`);

process.exit(ok ? 0 : 2);
