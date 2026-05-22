// session147_b4_top_freq.mjs
// Top 500 frequency extractor for japanese_unmapped.csv
// Input  : E:\project\GeniegoROI\frontend\japanese_unmapped.csv
// Output : E:\project\GeniegoROI\frontend\japanese_unmapped_top500.csv
//
// Logic:
//   1) Read japanese_unmapped.csv (BOM + CSV)
//   2) Parse rows: path, ko_current, ja_value, proposed_ko, ns, type
//   3) Aggregate by ja_value (count occurrences)
//   4) Sort by count DESC, then ja_value ASC (stable)
//   5) Output Top 500: rank, ja_value, count, sample_path, sample_ns
//   6) Print summary to stdout

import fs from 'node:fs';
import path from 'node:path';

const ROOT      = 'E:/project/GeniegoROI/frontend';
const IN_PATH   = path.join(ROOT, 'japanese_unmapped.csv');
const OUT_PATH  = path.join(ROOT, 'japanese_unmapped_top500.csv');
const TOP_N     = 500;

// ---------- CSV parser (RFC 4180 minimal) ----------
function parseCsv(text) {
  // strip BOM
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);

  const rows = [];
  let cur = [];
  let field = '';
  let inQuote = false;
  let i = 0;
  const n = text.length;

  while (i < n) {
    const ch = text[i];

    if (inQuote) {
      if (ch === '"') {
        if (i + 1 < n && text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuote = false;
        i++;
        continue;
      }
      field += ch;
      i++;
      continue;
    }

    if (ch === '"') {
      inQuote = true;
      i++;
      continue;
    }
    if (ch === ',') {
      cur.push(field);
      field = '';
      i++;
      continue;
    }
    if (ch === '\r') {
      // handle \r\n
      if (i + 1 < n && text[i + 1] === '\n') {
        cur.push(field);
        rows.push(cur);
        cur = [];
        field = '';
        i += 2;
        continue;
      }
      cur.push(field);
      rows.push(cur);
      cur = [];
      field = '';
      i++;
      continue;
    }
    if (ch === '\n') {
      cur.push(field);
      rows.push(cur);
      cur = [];
      field = '';
      i++;
      continue;
    }
    field += ch;
    i++;
  }
  // last field
  if (field.length > 0 || cur.length > 0) {
    cur.push(field);
    rows.push(cur);
  }
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
  // BOM + CRLF for Excel friendliness
  const out = '\uFEFF' + lines.join('\r\n') + '\r\n';
  fs.writeFileSync(filepath, out, { encoding: 'utf8' });
}

// ---------- MAIN ----------
function main() {
  if (!fs.existsSync(IN_PATH)) {
    console.error(`[ERROR] input not found: ${IN_PATH}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(IN_PATH, 'utf8');
  const rows = parseCsv(raw);

  if (rows.length === 0) {
    console.error('[ERROR] CSV is empty');
    process.exit(1);
  }

  const header = rows[0];
  const idx = {
    path:        header.indexOf('path'),
    ko_current:  header.indexOf('ko_current'),
    ja_value:    header.indexOf('ja_value'),
    proposed_ko: header.indexOf('proposed_ko'),
    ns:          header.indexOf('ns'),
    type:        header.indexOf('type'),
  };

  if (idx.ja_value < 0) {
    console.error('[ERROR] column "ja_value" not found in header');
    console.error('header:', header);
    process.exit(1);
  }
  if (idx.path < 0) {
    console.error('[ERROR] column "path" not found in header');
    process.exit(1);
  }

  // Aggregate
  const freq = new Map(); // ja_value -> { count, samplePath, sampleNs }
  let dataRows = 0;
  let emptyJa  = 0;

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.length === 0) continue;
    if (row.length === 1 && row[0] === '') continue; // trailing blank
    dataRows++;

    const ja = row[idx.ja_value] ?? '';
    if (ja === '') { emptyJa++; continue; }

    const p  = row[idx.path] ?? '';
    const ns = idx.ns >= 0 ? (row[idx.ns] ?? '') : '';

    const ex = freq.get(ja);
    if (ex) {
      ex.count++;
      // keep first-seen sample (stable)
    } else {
      freq.set(ja, { count: 1, samplePath: p, sampleNs: ns });
    }
  }

  // Sort by count DESC, ja_value ASC
  const sorted = [...freq.entries()].sort((a, b) => {
    if (b[1].count !== a[1].count) return b[1].count - a[1].count;
    return a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0;
  });

  const totalUnique = sorted.length;
  const topN = Math.min(TOP_N, totalUnique);
  const top = sorted.slice(0, topN);

  // Coverage calc
  let totalCount = 0;
  for (const [, v] of sorted) totalCount += v.count;
  let topCount = 0;
  for (let i = 0; i < topN; i++) topCount += top[i][1].count;
  const coverage = totalCount > 0 ? (topCount / totalCount) * 100 : 0;

  // Build output rows
  const outHeader = ['rank', 'ja_value', 'count', 'sample_path', 'sample_ns', 'proposed_ko'];
  const outRows = top.map((entry, i) => {
    const [ja, info] = entry;
    return [String(i + 1), ja, String(info.count), info.samplePath, info.sampleNs, ''];
  });

  writeCsv(OUT_PATH, outHeader, outRows);

  // Summary
  console.log('================ B4 SUMMARY ================');
  console.log(`input              : ${IN_PATH}`);
  console.log(`output             : ${OUT_PATH}`);
  console.log(`data rows scanned  : ${dataRows}`);
  console.log(`empty ja_value     : ${emptyJa}`);
  console.log(`unique ja values   : ${totalUnique}`);
  console.log(`top extracted      : ${topN}`);
  console.log(`total occurrences  : ${totalCount}`);
  console.log(`top coverage       : ${topCount} / ${totalCount} = ${coverage.toFixed(2)}%`);
  console.log('============================================');
  console.log('Top 10 preview:');
  for (let i = 0; i < Math.min(10, topN); i++) {
    const [ja, info] = top[i];
    const preview = ja.length > 50 ? ja.slice(0, 50) + '...' : ja;
    console.log(`  #${String(i + 1).padStart(3)} x${String(info.count).padStart(3)}  ${preview}`);
  }
  console.log('============================================');
}

main();
