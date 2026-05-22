// session147_b8a_split_unmapped.mjs
// Split japanese_b1_b5_unmapped.csv (2,505 rows) into 10 batches of ~250 rows each.
//
// Input  : frontend\japanese_b1_b5_unmapped.csv
//          columns: path, ko_current, ja_value, ns
// Output : frontend\japanese_unmapped_batch_01.csv ... _batch_10.csv
//          columns: batch, idx, path, ja_value, ns, proposed_ko
//          (idx is 1-based within each batch; batch is 01..10)
//
// Strategy:
//   - Sort by ns then path for predictable grouping (related items together).
//   - Deduplicate by ja_value? NO — keep all rows to preserve path-level granularity
//     for B8-E (ko.js patching). Many paths share the same ja_value; the reviewer
//     only needs to translate each unique ja_value once but we keep all rows for
//     downstream patching.
//   - Actually: we'll deduplicate by ja_value within the SPLIT step to reduce
//     reviewer workload, then expand back via ja_value lookup in B8-D parser.
//
// Decision: split UNIQUE ja_values across 10 batches (more efficient).
//   - 2,486 unique ja_values in tail / 10 batches = ~249 per batch
//   - Reviewer translates 2,486 strings (not 2,505 paths)
//   - B8-D parser builds ja_value -> ko map, then expands to all 2,505 rows
//
// Read-only on locale files.

import fs from 'node:fs';
import path from 'node:path';

const ROOT = 'E:/project/GeniegoROI/frontend';
const IN_PATH  = path.join(ROOT, 'japanese_b1_b5_unmapped.csv');
const OUT_DIR  = ROOT; // batches go directly into frontend/

const BATCH_COUNT = 10;

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
  for (const r of rows) lines.push(r.map(csvEscape).join(','));
  fs.writeFileSync(filepath, '\uFEFF' + lines.join('\r\n') + '\r\n', { encoding: 'utf8' });
}

// ---------- MAIN ----------
function main() {
  if (!fs.existsSync(IN_PATH)) {
    console.error(`[FATAL] input not found: ${IN_PATH}`);
    process.exit(1);
  }

  const rows = rowsToObjects(parseCsv(fs.readFileSync(IN_PATH, 'utf8')));
  console.log(`[load] ${IN_PATH}: ${rows.length} rows`);

  // Collect unique ja_values with first-encountered example path/ns for reference
  const uniqueMap = new Map(); // ja -> { ja, firstPath, firstNs, occurrences }
  for (const r of rows) {
    const ja = r.ja_value;
    if (!ja) continue;
    const ex = uniqueMap.get(ja);
    if (ex) {
      ex.occurrences++;
    } else {
      uniqueMap.set(ja, {
        ja_value: ja,
        sample_path: r.path,
        sample_ns: r.ns,
        occurrences: 1,
      });
    }
  }
  const uniqueList = [...uniqueMap.values()];
  console.log(`[unique] ja_values: ${uniqueList.length}`);

  // Sort by ns then ja_value for grouping
  uniqueList.sort((a, b) => {
    if (a.sample_ns !== b.sample_ns) return a.sample_ns < b.sample_ns ? -1 : 1;
    return a.ja_value < b.ja_value ? -1 : 1;
  });

  // Split into BATCH_COUNT chunks of as-equal size as possible
  const total = uniqueList.length;
  const baseSize = Math.floor(total / BATCH_COUNT);
  const remainder = total % BATCH_COUNT;
  // First `remainder` batches get baseSize+1, rest get baseSize

  const batches = [];
  let cursor = 0;
  for (let b = 0; b < BATCH_COUNT; b++) {
    const size = baseSize + (b < remainder ? 1 : 0);
    batches.push(uniqueList.slice(cursor, cursor + size));
    cursor += size;
  }

  // Write each batch
  const stats = [];
  for (let b = 0; b < BATCH_COUNT; b++) {
    const batchNo = String(b + 1).padStart(2, '0');
    const filename = `japanese_unmapped_batch_${batchNo}.csv`;
    const outPath = path.join(OUT_DIR, filename);

    const outRows = batches[b].map((e, i) => [
      batchNo,
      String(i + 1),
      e.sample_path,
      e.ja_value,
      e.sample_ns,
      String(e.occurrences),
      '', // proposed_ko (empty for reviewer)
    ]);
    writeCsv(outPath, ['batch', 'idx', 'sample_path', 'ja_value', 'ns', 'occurrences', 'proposed_ko'], outRows);

    // Stats
    const nsSet = new Set(batches[b].map(e => e.sample_ns));
    const totalOcc = batches[b].reduce((s, e) => s + e.occurrences, 0);
    stats.push({ batch: batchNo, rows: batches[b].length, totalOcc, nsCount: nsSet.size });
  }

  // Summary
  console.log('================ B8-A SPLIT SUMMARY ================');
  console.log(`input rows                : ${rows.length}`);
  console.log(`unique ja_values          : ${uniqueList.length}`);
  console.log(`batches                   : ${BATCH_COUNT}`);
  console.log('---------------------------------------------------');
  for (const s of stats) {
    console.log(`  batch ${s.batch}: ${String(s.rows).padStart(3)} entries, covers ${String(s.totalOcc).padStart(4)} paths, ${s.nsCount} ns`);
  }
  console.log('---------------------------------------------------');
  const totalCovered = stats.reduce((a, s) => a + s.totalOcc, 0);
  console.log(`total paths covered       : ${totalCovered} (should equal input rows ${rows.length})`);
  console.log('====================================================');
  console.log(`Output: japanese_unmapped_batch_01.csv ... _batch_${String(BATCH_COUNT).padStart(2,'0')}.csv`);
}

main();
