// session147_b6_merge_mappings.mjs
// Merge two mapping sources into a unified CSV + emit remaining unmapped CSV.
//
// Inputs:
//   1) japanese_pollution_workbook.csv   (4,627 rows — full polluted entries from b2)
//   2) japanese_auto_mapped.csv          (827 rows from b3, auto-dictionary)
//   3) japanese_top500_mapped.csv        (500 rows from b5, manual review)
//
// Outputs:
//   1) japanese_b1_b5_merged.csv         (path, ko_current, ja_value, proposed_ko, source, ns)
//        source ∈ {auto, top500}
//        Conflict resolution: top500 wins (manual review trumps dictionary)
//   2) japanese_b1_b5_unmapped.csv       (entries from workbook with NO mapping yet)
//        ~2,300 rows expected (tail of long-tail unique values)
//
// Validation:
//   - Total rows in workbook == merged + unmapped (no loss)
//   - Mapping coverage stats by ja_value (occurrence count) and by path
//   - Conflicts logged (auto vs top500 disagree on same ja_value)
//
// Read-only on locale files. Only reads/writes own CSVs.

import fs from 'node:fs';
import path from 'node:path';

const ROOT = 'E:/project/GeniegoROI/frontend';
const IN_WORKBOOK = path.join(ROOT, 'japanese_pollution_workbook.csv');
const IN_AUTO     = path.join(ROOT, 'japanese_auto_mapped.csv');
const IN_TOP500   = path.join(ROOT, 'japanese_top500_mapped.csv');
const OUT_MERGED  = path.join(ROOT, 'japanese_b1_b5_merged.csv');
const OUT_TAIL    = path.join(ROOT, 'japanese_b1_b5_unmapped.csv');

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
    for (let c = 0; c < header.length; c++) {
      o[header[c]] = row[c] ?? '';
    }
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
  // Check inputs
  for (const [name, p] of [['workbook', IN_WORKBOOK], ['auto', IN_AUTO], ['top500', IN_TOP500]]) {
    if (!fs.existsSync(p)) {
      console.error(`[ERROR] ${name} CSV not found: ${p}`);
      process.exit(1);
    }
  }

  // Parse
  const wb     = rowsToObjects(parseCsv(fs.readFileSync(IN_WORKBOOK, 'utf8')));
  const auto   = rowsToObjects(parseCsv(fs.readFileSync(IN_AUTO, 'utf8')));
  const top500 = rowsToObjects(parseCsv(fs.readFileSync(IN_TOP500, 'utf8')));

  console.log(`[load] workbook : ${wb.length} rows`);
  console.log(`[load] auto     : ${auto.length} rows`);
  console.log(`[load] top500   : ${top500.length} rows`);

  // Build ja_value -> proposed_ko maps
  // Auto map (key = ja_value, val = proposed_ko)
  const autoMap = new Map();
  for (const r of auto) {
    const ja = r.ja_value, ko = r.proposed_ko;
    if (!ja || !ko) continue;
    autoMap.set(ja, ko);
  }
  // Top500 map
  const topMap = new Map();
  for (const r of top500) {
    const ja = r.ja_value, ko = r.proposed_ko;
    if (!ja || !ko) continue;
    topMap.set(ja, ko);
  }

  // Detect conflicts (auto vs top500 disagree on same ja_value)
  const conflicts = [];
  for (const [ja, autoKo] of autoMap.entries()) {
    if (topMap.has(ja)) {
      const topKo = topMap.get(ja);
      if (topKo !== autoKo) {
        conflicts.push({ ja, auto: autoKo, top500: topKo });
      }
    }
  }

  // Build merged rows by iterating workbook (preserves path-level granularity)
  const merged = [];
  const unmapped = [];
  let countFromTop = 0, countFromAuto = 0;

  for (const r of wb) {
    const ja = r.ja_value;
    if (!ja) continue;

    // Priority: top500 > auto
    let ko = null, src = null;
    if (topMap.has(ja)) {
      ko = topMap.get(ja);
      src = 'top500';
      countFromTop++;
    } else if (autoMap.has(ja)) {
      ko = autoMap.get(ja);
      src = 'auto';
      countFromAuto++;
    }

    const base = {
      path:        r.path || '',
      ko_current:  r.ko_current || '',
      ja_value:    ja,
      ns:          r.ns || '',
    };

    if (ko !== null) {
      merged.push({ ...base, proposed_ko: ko, source: src });
    } else {
      unmapped.push(base);
    }
  }

  // Validate: no loss
  if (merged.length + unmapped.length !== wb.length) {
    console.warn(`[WARN] count mismatch: merged ${merged.length} + unmapped ${unmapped.length} != workbook ${wb.length}`);
  }

  // Write outputs
  writeCsv(
    OUT_MERGED,
    ['path', 'ko_current', 'ja_value', 'proposed_ko', 'source', 'ns'],
    merged.map(m => [m.path, m.ko_current, m.ja_value, m.proposed_ko, m.source, m.ns])
  );
  writeCsv(
    OUT_TAIL,
    ['path', 'ko_current', 'ja_value', 'ns'],
    unmapped.map(m => [m.path, m.ko_current, m.ja_value, m.ns])
  );

  // Stats: unique ja_values in tail
  const tailJaSet = new Set(unmapped.map(u => u.ja_value));

  console.log('================ B6 MERGE SUMMARY ================');
  console.log(`workbook total      : ${wb.length}`);
  console.log(`merged (mapped)     : ${merged.length}`);
  console.log(`  - from top500     : ${countFromTop}`);
  console.log(`  - from auto       : ${countFromAuto}`);
  console.log(`unmapped (tail)     : ${unmapped.length}`);
  console.log(`unique ja in tail   : ${tailJaSet.size}`);
  console.log(`coverage            : ${merged.length}/${wb.length} = ${(merged.length / wb.length * 100).toFixed(2)}%`);
  console.log('--------------------------------------------------');
  console.log(`conflicts auto vs top500: ${conflicts.length}`);
  if (conflicts.length > 0) {
    console.log('  (top500 wins per priority rule)');
    for (let i = 0; i < Math.min(10, conflicts.length); i++) {
      const c = conflicts[i];
      console.log(`    "${c.ja.slice(0,30)}" : auto="${c.auto.slice(0,20)}" vs top500="${c.top500.slice(0,20)}"`);
    }
    if (conflicts.length > 10) console.log(`    ... (${conflicts.length - 10} more)`);
  }
  console.log('--------------------------------------------------');
  console.log(`output merged       : ${OUT_MERGED}`);
  console.log(`output unmapped     : ${OUT_TAIL}`);
  console.log('==================================================');
}

main();
