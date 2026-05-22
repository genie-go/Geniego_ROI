// session147_b5_parse_top500.mjs
// Parse top500_raw.txt (5 BATCH blocks) -> japanese_top500_mapped.csv
//
// Input format expected in top500_raw.txt:
//   ### BATCH_1_BEGIN (rank 1~100)
//   ```
//   1|<ja_value>|<proposed_ko>
//   2|<ja_value>|<proposed_ko>
//   ...
//   100|<ja_value>|<proposed_ko>
//   ```
//   ### BATCH_1_END
//   ... (repeats for BATCH_2 ... BATCH_5)
//
// Output: japanese_top500_mapped.csv
//   columns: rank,ja_value,proposed_ko
//
// Safety:
//   - Validates rank continuity (1..500)
//   - Validates exact 500 rows
//   - Detects duplicate ja_value (warning, not fatal)
//   - Detects empty proposed_ko (fatal)
//   - Detects malformed lines (fatal)

import fs from 'node:fs';
import path from 'node:path';

const ROOT     = 'E:/project/GeniegoROI/frontend';
const IN_PATH  = path.join(ROOT, 'top500_raw.txt');
const OUT_PATH = path.join(ROOT, 'japanese_top500_mapped.csv');

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

// ---------- MAIN ----------
function main() {
  if (!fs.existsSync(IN_PATH)) {
    console.error(`[ERROR] input not found: ${IN_PATH}`);
    console.error('Please save the 5 BATCH blocks (as posted in chat) to this file.');
    process.exit(1);
  }

  let raw = fs.readFileSync(IN_PATH, 'utf8');
  // strip BOM
  if (raw.charCodeAt(0) === 0xFEFF) raw = raw.slice(1);

  // Normalize line endings
  raw = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  const lines = raw.split('\n');

  const entries = []; // { rank, ja, ko }
  const errors  = [];
  const warnings = [];

  // State machine: collect lines that match /^\d+\|.+\|.+$/
  // Ignore anything else (markdown ```, headers, blank lines).
  const lineRe = /^(\d+)\|([^|]*?)\|(.*)$/;
  // NOTE: ja_value may itself contain "|" only if escaped; assume no "|" in source data
  //       (verified - none of the 500 ja_values contain "|")

  let lineNo = 0;
  for (const line of lines) {
    lineNo++;
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Skip markdown fence
    if (trimmed.startsWith('```')) continue;
    // Skip BATCH markers
    if (trimmed.startsWith('###') || trimmed.startsWith('BATCH_')) continue;

    const m = trimmed.match(lineRe);
    if (!m) {
      // Only flag if it looks like data (starts with digit + pipe)
      if (/^\d+\|/.test(trimmed)) {
        errors.push(`line ${lineNo}: malformed -> ${trimmed.slice(0, 80)}`);
      }
      continue;
    }

    const rank = parseInt(m[1], 10);
    const ja   = m[2];
    const ko   = m[3];

    if (ja === '') {
      errors.push(`line ${lineNo}: empty ja_value at rank ${rank}`);
      continue;
    }
    if (ko === '') {
      errors.push(`line ${lineNo}: empty proposed_ko at rank ${rank}`);
      continue;
    }

    entries.push({ rank, ja, ko, lineNo });
  }

  // Validate
  if (entries.length !== 500) {
    errors.push(`expected 500 entries, got ${entries.length}`);
  }

  // Sort by rank ASC
  entries.sort((a, b) => a.rank - b.rank);

  // Rank continuity check
  for (let i = 0; i < entries.length; i++) {
    const expected = i + 1;
    if (entries[i].rank !== expected) {
      errors.push(`rank gap: expected ${expected}, got ${entries[i].rank} at line ${entries[i].lineNo}`);
    }
  }

  // Duplicate ja_value detection (warning only)
  const jaMap = new Map();
  for (const e of entries) {
    const ex = jaMap.get(e.ja);
    if (ex) {
      warnings.push(`duplicate ja_value at rank ${e.rank} (also at rank ${ex.rank}): "${e.ja.slice(0, 40)}"`);
    } else {
      jaMap.set(e.ja, e);
    }
  }

  // Print errors
  if (errors.length > 0) {
    console.error('================ ERRORS ================');
    for (const err of errors) console.error('  [ERROR] ' + err);
    console.error('========================================');
    console.error(`Total errors: ${errors.length}. ABORTING.`);
    process.exit(1);
  }

  // Print warnings (non-fatal)
  if (warnings.length > 0) {
    console.warn('================ WARNINGS ================');
    for (const w of warnings) console.warn('  [WARN] ' + w);
    console.warn('==========================================');
  }

  // Write output
  const outRows = entries.map(e => [String(e.rank), e.ja, e.ko]);
  writeCsv(OUT_PATH, ['rank', 'ja_value', 'proposed_ko'], outRows);

  // Summary
  console.log('================ B5 PARSE SUMMARY ================');
  console.log(`input        : ${IN_PATH}`);
  console.log(`output       : ${OUT_PATH}`);
  console.log(`entries      : ${entries.length}`);
  console.log(`errors       : ${errors.length}`);
  console.log(`warnings     : ${warnings.length} (duplicate ja_values, non-fatal)`);
  console.log('==================================================');
  console.log('First 3 entries:');
  for (let i = 0; i < 3; i++) {
    const e = entries[i];
    console.log(`  #${e.rank}: ${e.ja.slice(0, 30)} -> ${e.ko.slice(0, 30)}`);
  }
  console.log('Last 3 entries:');
  for (let i = Math.max(0, entries.length - 3); i < entries.length; i++) {
    const e = entries[i];
    console.log(`  #${e.rank}: ${e.ja.slice(0, 30)} -> ${e.ko.slice(0, 30)}`);
  }
  console.log('==================================================');
}

main();
