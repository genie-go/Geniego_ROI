// session147_b8d_parse_and_expand.mjs
// B8-D: Parse 10 batches + Top 500 raw txt -> ja_value lookup map -> expand to 2,505 unmapped rows
//
// Inputs:
//   1) session147_b8b_batch_01_raw.txt ~ _batch_10_raw.txt
//        Format per line: idx|ja_value|proposed_ko
//        ja_value/ko may contain '|' if quoted with surrounding markers (NONE expected — verify)
//        Empty lines and lines without '|' are skipped (header noise)
//   2) top500_raw.txt   (already validated by b5 v2 — 500 lines, format: rank|ja|ko)
//        Used as supplementary fallback (B7 already applied these, but ja_value lookup
//        may catch a few stragglers if b6 dedup missed any)
//   3) japanese_b1_b5_unmapped.csv  (2,505 rows — output of b6, input for this stage)
//        Columns: path, ko_current, ja_value, ns, occurrences
//        NOTE: column order MUST match b6 output exactly (no proposed_ko column)
//
// Outputs:
//   1) japanese_b8_combined_mapping.csv  (unique ja_value -> proposed_ko, source)
//        Columns: ja_value, proposed_ko, source, batch
//        source ∈ {b8_batch, top500_fallback}
//        Expected: 2,486 unique
//   2) japanese_tail_mapped.csv  (2,505 rows, ko.js patch input)
//        Columns: path, ko_current, ja_value, proposed_ko, source, ns
//        ← matches japanese_b1_b5_merged.csv schema for b7v2 reuse
//   3) b8d_parse_log.txt  (validation report)
//
// Validation:
//   - Every batch line parsed (idx|ja|ko, where ko is non-empty)
//   - Unique ja_value count = 2,486
//   - Every unmapped row finds a ja_value in the map (zero lookup misses)
//   - Conflict detection: same ja_value in 2+ batches with different proposed_ko
//   - V2-style guards: Hangul in ja, kana/hanzi in ko, etc.
//
// Read-only on locale files. Only reads/writes own CSVs and logs.

import fs from 'node:fs';
import path from 'node:path';

const ROOT     = 'E:/project/GeniegoROI/frontend';
const IN_UNMAPPED = path.join(ROOT, 'japanese_b1_b5_unmapped.csv');
const IN_TOP500   = path.join(ROOT, 'top500_raw.txt');
const OUT_MAP     = path.join(ROOT, 'japanese_b8_combined_mapping.csv');
const OUT_TAIL    = path.join(ROOT, 'japanese_tail_mapped.csv');
const OUT_LOG     = path.join(ROOT, 'b8d_parse_log.txt');

const BATCH_COUNT = 10;
const BATCH_FILES = [];
for (let i = 1; i <= BATCH_COUNT; i++) {
  const tag = String(i).padStart(2, '0');
  BATCH_FILES.push({
    batch: tag,
    file: path.join(ROOT, `session147_b8b_batch_${tag}_raw.txt`),
  });
}

// Regex sets (same as v2)
const RE_HANGUL   = /[\uAC00-\uD7AF]/;
const RE_HIRAGANA = /[\u3040-\u309F]/;
const RE_KATAKANA = /[\u30A0-\u30FF]/;
const RE_CJK_HAN  = /[\u3400-\u4DBF\u4E00-\u9FFF]/;

// ---------- CSV parser ----------
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

// ---------- CSV writer ----------
function csvEscape(v) {
  const s = String(v ?? '');
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function writeCsv(filepath, header, rows) {
  const lines = [];
  lines.push(header.map(csvEscape).join(','));
  for (const r of rows) {
    lines.push(r.map(csvEscape).join(','));
  }
  const out = '\uFEFF' + lines.join('\r\n') + '\r\n';
  fs.writeFileSync(filepath, out, { encoding: 'utf8' });
}

// ---------- Line parser (idx|ja|ko or rank|ja|ko, with TAB fallback) ----------
// Priority 1: TAB separators (idx\tja\tko) — used when ja or ko contains '|' literally.
//   Detected by TAB character anywhere in the line.
// Priority 2: Pipe separators (idx|ja|ko) — splits on first '|' and last '|'.
// Returns [num, ja, ko] or null if invalid.
function parsePipeLine(line) {
  // Strip trailing CR
  line = line.replace(/\r$/, '');
  if (!line) return null;

  // TAB-priority: if line contains TAB, use TAB as separator (handles |-in-content cases)
  if (line.includes('\t')) {
    const parts = line.split('\t');
    if (parts.length !== 3) return null;
    const [num, ja, ko] = parts;
    if (!/^\d+$/.test(num)) return null;
    if (!ja) return null;
    return [parseInt(num, 10), ja, ko];
  }

  // Standard pipe split
  const first = line.indexOf('|');
  if (first < 0) return null;
  const last = line.lastIndexOf('|');
  if (last === first) return null; // only one separator → invalid
  const num = line.slice(0, first);
  const ja  = line.slice(first + 1, last);
  const ko  = line.slice(last + 1);
  if (!/^\d+$/.test(num)) return null;
  if (!ja) return null;
  return [parseInt(num, 10), ja, ko];
}

// ---------- Per-entry validation ----------
function detectIssues(label, num, ja, ko) {
  const issues = [];

  if (!ko || ko.trim() === '') {
    issues.push({ level: 'ERROR', code: 'EMPTY_KO', msg: 'proposed_ko is empty' });
  }

  if (RE_HANGUL.test(ja)) {
    issues.push({ level: 'WARN', code: 'HANGUL_IN_JA', msg: 'ja_value contains Hangul (suspect IME accident)' });
  }
  if (!RE_HIRAGANA.test(ja) && !RE_KATAKANA.test(ja) && !RE_CJK_HAN.test(ja)) {
    issues.push({ level: 'WARN', code: 'NO_CJK', msg: 'ja_value has no CJK chars' });
  }
  if (ko && RE_HIRAGANA.test(ko)) {
    issues.push({ level: 'WARN', code: 'KANA_IN_KO', msg: 'proposed_ko contains hiragana' });
  }
  if (ko && RE_KATAKANA.test(ko)) {
    issues.push({ level: 'WARN', code: 'KATAKANA_IN_KO', msg: 'proposed_ko contains katakana' });
  }
  // Hanzi check intentionally relaxed: Korean Hanja words are rare in our UI strings
  // but technically valid. We only warn if MANY hanzi appear (likely raw Chinese).
  if (ko) {
    const hanzi = (ko.match(/[\u3400-\u4DBF\u4E00-\u9FFF]/g) || []).length;
    if (hanzi >= 2) {
      issues.push({ level: 'WARN', code: 'HANZI_IN_KO', msg: `proposed_ko contains ${hanzi} hanzi chars` });
    }
  }

  return issues;
}

// ---------- Step 1: Parse all batch raw txts ----------
const log = [];
function L(s) { log.push(s); console.log(s); }

L('═'.repeat(70));
L('B8-D: Parse 10 batches + Top 500 → unique mapping → expand to 2,505 rows');
L('═'.repeat(70));
L('');

const map = new Map();           // ja_value -> { ko, source, batch, num }
const conflicts = [];            // { ja, existing, new }
const issuesPerSource = new Map(); // sourceTag -> issue count

function recordIssues(tag, issues) {
  if (!issues.length) return;
  const cnt = (issuesPerSource.get(tag) || 0) + issues.length;
  issuesPerSource.set(tag, cnt);
}

let totalBatchLines = 0;
let totalBatchParsed = 0;

for (const { batch, file } of BATCH_FILES) {
  if (!fs.existsSync(file)) {
    L(`[batch_${batch}] FILE MISSING: ${file}`);
    L(`  → expected from reviewer; aborting to prevent silent skip`);
    process.exit(1);
  }
  const text = fs.readFileSync(file, 'utf8');
  const lines = text.split('\n').filter(s => s.trim().length > 0);
  let parsed = 0;
  let skipped = 0;
  let issues = [];

  for (const raw of lines) {
    totalBatchLines++;
    const r = parsePipeLine(raw);
    if (!r) {
      skipped++;
      continue;
    }
    const [num, ja, ko] = r;
    const entryIssues = detectIssues(`batch_${batch}`, num, ja, ko);
    for (const iss of entryIssues) {
      if (iss.level === 'ERROR') {
        L(`  [ERROR] batch_${batch} idx ${num}: ${iss.msg}`);
        L(`    ja: ${ja}`);
        L(`    ko: "${ko}"`);
        L(`  → aborting (no empty proposed_ko allowed)`);
        process.exit(1);
      }
      issues.push({ num, code: iss.code, msg: iss.msg, ja, ko });
    }

    parsed++;
    totalBatchParsed++;

    if (map.has(ja)) {
      const ex = map.get(ja);
      if (ex.ko !== ko) {
        conflicts.push({
          ja,
          existing: { ko: ex.ko, source: `batch_${ex.batch}`, num: ex.num },
          incoming: { ko, source: `batch_${batch}`, num },
        });
        // Conflict resolution: KEEP FIRST (deterministic)
        // Same ja_value parsed twice → first batch wins
      }
      // else: identical entry, no-op
    } else {
      map.set(ja, { ko, source: 'b8_batch', batch, num });
    }
  }

  recordIssues(`batch_${batch}`, issues);
  L(`[batch_${batch}] parsed ${parsed}/${lines.length} (skipped ${skipped}), issues: ${issues.length}`);

  // Print first 3 issues per batch for quick scan
  for (const iss of issues.slice(0, 3)) {
    L(`  ⚠ idx ${iss.num} [${iss.code}]: ${iss.msg}`);
  }
  if (issues.length > 3) {
    L(`  ... and ${issues.length - 3} more (see full log)`);
  }
}

L('');
L(`Batch parsing summary:`);
L(`  Total lines read: ${totalBatchLines}`);
L(`  Total entries parsed: ${totalBatchParsed}`);
L(`  Unique ja_value: ${map.size}`);
L(`  Cross-batch conflicts: ${conflicts.length}`);

if (conflicts.length > 0) {
  L(`  Sample conflicts (first 5):`);
  for (const c of conflicts.slice(0, 5)) {
    L(`    ja: ${c.ja}`);
    L(`      ${c.existing.source} idx ${c.existing.num}: "${c.existing.ko}"`);
    L(`      ${c.incoming.source} idx ${c.incoming.num}: "${c.incoming.ko}"`);
    L(`      → KEPT: existing (first occurrence)`);
  }
}

// ---------- Step 2: Top 500 fallback (informational only) ----------
L('');
L('─'.repeat(70));
L('Step 2: Top 500 fallback (b7 already applied — informational only)');
L('─'.repeat(70));
let top500Added = 0;
let top500Conflicts = 0;
if (fs.existsSync(IN_TOP500)) {
  const text = fs.readFileSync(IN_TOP500, 'utf8');
  const lines = text.split('\n').filter(s => s.trim().length > 0);
  for (const raw of lines) {
    const r = parsePipeLine(raw);
    if (!r) continue;
    const [num, ja, ko] = r;
    if (!ko || !ko.trim()) continue;
    if (!map.has(ja)) {
      map.set(ja, { ko, source: 'top500_fallback', batch: 'T500', num });
      top500Added++;
    } else {
      // Conflict between top500 and b8_batch — log but keep b8_batch
      const ex = map.get(ja);
      if (ex.ko !== ko) top500Conflicts++;
    }
  }
  L(`  Top 500 lines read: ${lines.length}`);
  L(`  Top 500 added (not in b8 batches): ${top500Added}`);
  L(`  Top 500 conflicts with b8 batches: ${top500Conflicts} (b8 batch kept)`);
} else {
  L(`  Top 500 file not found: ${IN_TOP500} (skipping fallback)`);
}

L('');
L(`Combined map size: ${map.size} unique ja_value`);

// ---------- Step 3: Expand to 2,505 unmapped rows ----------
L('');
L('─'.repeat(70));
L('Step 3: Expand mapping to japanese_b1_b5_unmapped.csv (2,505 rows)');
L('─'.repeat(70));

if (!fs.existsSync(IN_UNMAPPED)) {
  L(`  ERROR: ${IN_UNMAPPED} not found. Run b6 first.`);
  process.exit(1);
}

const unmappedText = fs.readFileSync(IN_UNMAPPED, 'utf8');
const unmappedRows = parseCsv(unmappedText);
if (unmappedRows.length === 0) {
  L(`  ERROR: ${IN_UNMAPPED} is empty.`);
  process.exit(1);
}

const unmappedHeader = unmappedRows[0];
const unmappedData = unmappedRows.slice(1).filter(r => r.length >= 3 && r.some(c => c !== ''));
L(`  unmapped header: [${unmappedHeader.join(', ')}]`);
L(`  unmapped data rows: ${unmappedData.length}`);

// Locate columns
const colPath = unmappedHeader.indexOf('path');
const colKoCurrent = unmappedHeader.indexOf('ko_current');
const colJa = unmappedHeader.indexOf('ja_value');
const colNs = unmappedHeader.indexOf('ns');

if (colPath < 0 || colJa < 0) {
  L(`  ERROR: required columns missing (path=${colPath}, ja_value=${colJa})`);
  process.exit(1);
}

const tailRows = [];
const lookupMisses = [];
const issueRows = [];

for (const row of unmappedData) {
  const p = row[colPath] || '';
  const koCur = colKoCurrent >= 0 ? (row[colKoCurrent] || '') : '';
  const ja = row[colJa] || '';
  const ns = colNs >= 0 ? (row[colNs] || '') : '';

  const m = map.get(ja);
  if (!m) {
    lookupMisses.push({ path: p, ja });
    continue;
  }

  tailRows.push([p, koCur, ja, m.ko, m.source === 'b8_batch' ? `b8_batch_${m.batch}` : m.source, ns]);
}

L('');
L(`Expansion result:`);
L(`  Tail rows mapped: ${tailRows.length} / ${unmappedData.length}`);
L(`  Lookup misses: ${lookupMisses.length}`);

if (lookupMisses.length > 0) {
  L(`  ❌ FIRST 10 MISSES (manual review needed):`);
  for (const m of lookupMisses.slice(0, 10)) {
    L(`    path: ${m.path}`);
    L(`    ja:   ${m.ja}`);
  }
  L('');
  L('  WARNING: lookup misses exist. b8d cannot reach 100% coverage.');
  L('  These ja_values are in unmapped.csv but not in any batch.');
  L('  Possible causes:');
  L('    1. Reviewer skipped some entries');
  L('    2. ja_value normalization mismatch (whitespace, NBSP, etc.)');
  L('    3. b8a splitter dedup logic dropped non-unique appearances');
  L('  → b8d will proceed with partial coverage. Misses must be resolved manually.');
}

// ---------- Step 4: Write outputs ----------
L('');
L('─'.repeat(70));
L('Step 4: Write outputs');
L('─'.repeat(70));

// 4a. Combined mapping (unique ja_value)
const mapRows = [];
const sortedKeys = [...map.keys()].sort();
for (const ja of sortedKeys) {
  const m = map.get(ja);
  mapRows.push([ja, m.ko, m.source, m.batch]);
}
writeCsv(OUT_MAP, ['ja_value', 'proposed_ko', 'source', 'batch'], mapRows);
L(`  ✓ ${OUT_MAP}`);
L(`    rows: ${mapRows.length} unique`);

// 4b. Expanded tail (full path rows for b7v2 reuse)
// Schema matches japanese_b1_b5_merged.csv exactly:
//   path, ko_current, ja_value, proposed_ko, source, ns
writeCsv(OUT_TAIL, ['path', 'ko_current', 'ja_value', 'proposed_ko', 'source', 'ns'], tailRows);
L(`  ✓ ${OUT_TAIL}`);
L(`    rows: ${tailRows.length}`);

// 4c. Validation log
L('');
L('═'.repeat(70));
L('SUMMARY');
L('═'.repeat(70));
L(`  Input unmapped rows:      ${unmappedData.length}`);
L(`  Unique ja_value mapped:   ${map.size}`);
L(`  Expanded tail rows:       ${tailRows.length}`);
L(`  Lookup misses:            ${lookupMisses.length}`);
L(`  Cross-batch conflicts:    ${conflicts.length}`);
L(`  Per-batch issue counts:`);
for (const [tag, cnt] of [...issuesPerSource.entries()].sort()) {
  L(`    ${tag}: ${cnt} warnings`);
}
L('');
if (lookupMisses.length === 0 && tailRows.length === unmappedData.length) {
  L('  ✅ FULL COVERAGE: every unmapped row has a translation.');
  L('  → Next step: b8e applies tail_mapped.csv to ko.js (b7v2 algorithm reuse)');
} else {
  L('  ⚠ PARTIAL COVERAGE: see lookup misses above.');
  L('  → b8e will still apply mapped subset; misses remain Japanese until resolved.');
}

fs.writeFileSync(OUT_LOG, log.join('\n') + '\n', { encoding: 'utf8' });
L('');
L(`Full log written to: ${OUT_LOG}`);
