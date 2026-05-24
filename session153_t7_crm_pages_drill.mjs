#!/usr/bin/env node
// Session 153 T7: crm.contentCal + pages.marketingIntel drill-down
// Output: L3/L4 distribution + locale_count breakdown + sample keys + CSV exports
// N-152-A bank-grade: quote-aware CSV (RFC 4180), explicit error paths

import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const CSV_IN = resolve('session152_t7_drift_category_A_intentional_english.csv');
const CSV_CRM = resolve('session153_t7_crm_contentCal_drill.csv');
const CSV_PAGES = resolve('session153_t7_pages_marketingIntel_drill.csv');

function parseCSV(text) {
  const rows = [];
  let row = [], field = '', inQuotes = false, i = 0;
  while (i < text.length) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
        inQuotes = false; i++; continue;
      }
      field += c; i++; continue;
    }
    if (c === '"') { inQuotes = true; i++; continue; }
    if (c === ',') { row.push(field); field = ''; i++; continue; }
    if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); rows.push(row); row = []; field = ''; i++; continue;
    }
    field += c; i++;
  }
  if (field !== '' || row.length > 0) { row.push(field); rows.push(row); }
  return rows;
}

function csvEscape(s) {
  if (s == null) return '';
  const str = String(s);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

const raw = readFileSync(CSV_IN, 'utf8');
const rows = parseCSV(raw);
const header = rows[0];
const data = rows.slice(1).filter(r => r.length === header.length);

const colIdx = Object.fromEntries(header.map((h, i) => [h.trim(), i]));
const keyI = colIdx['key'];
const nsI = colIdx['namespace_l2'];
const valI = colIdx['value'];
const lcI = colIdx['locale_count'];
const locsI = colIdx['locales'];

function drillNamespace(prefix, outPath) {
  const filtered = data.filter(r => (r[nsI] || '').startsWith(prefix));
  console.log(`\n========== ${prefix} drill-down ==========`);
  console.log(`Total keys: ${filtered.length}`);

  // L3 distribution (4th segment if l2 is prefix.X, take prefix.X.Y)
  const l3 = new Map();
  const l3Lc = new Map(); // l3 -> Map(lc -> count)
  for (const r of filtered) {
    const key = r[keyI] || '';
    const segs = key.split('.');
    // key 형태: crm.contentCal.<L3>.<L4>... — L3 = segs[2]
    const l3key = segs.slice(0, 3).join('.');
    l3.set(l3key, (l3.get(l3key) || 0) + 1);
    if (!l3Lc.has(l3key)) l3Lc.set(l3key, new Map());
    const m = l3Lc.get(l3key);
    const lc = r[lcI];
    m.set(lc, (m.get(lc) || 0) + 1);
  }

  console.log(`\nL3 distribution (top 20):`);
  const sorted = [...l3.entries()].sort((a, b) => b[1] - a[1]);
  console.log('  count'.padStart(8) + '  l3-namespace'.padEnd(50) + '  lc-breakdown');
  for (const [l3key, count] of sorted.slice(0, 20)) {
    const m = l3Lc.get(l3key);
    const lcStr = [...m.entries()].sort((a, b) => Number(b[0]) - Number(a[0])).map(([k, v]) => `${k}:${v}`).join(' ');
    console.log(`  ${count.toString().padStart(6)}  ${l3key.padEnd(50)}  ${lcStr}`);
  }

  // Sample keys (first 5)
  console.log(`\nSample keys (first 5 with value):`);
  for (const r of filtered.slice(0, 5)) {
    const val = (r[valI] || '').slice(0, 60);
    console.log(`  ${r[keyI]}  →  "${val}"  [lc=${r[lcI]}]`);
  }

  // CSV export
  const outRows = [['key', 'l3_namespace', 'value', 'locale_count', 'locales']];
  for (const r of filtered) {
    const segs = (r[keyI] || '').split('.');
    const l3key = segs.slice(0, 3).join('.');
    outRows.push([r[keyI], l3key, r[valI], r[lcI], r[locsI]]);
  }
  const csvOut = outRows.map(r => r.map(csvEscape).join(',')).join('\n');
  writeFileSync(outPath, csvOut, 'utf8');
  console.log(`\nExported: ${outPath} (${outRows.length - 1} rows)`);

  return { total: filtered.length, l3Count: l3.size };
}

const crmStats = drillNamespace('crm.contentCal', CSV_CRM);
const pagesStats = drillNamespace('pages.marketingIntel', CSV_PAGES);

console.log('\n========== Summary ==========');
console.log(`crm.contentCal:        ${crmStats.total} keys across ${crmStats.l3Count} L3 namespaces`);
console.log(`pages.marketingIntel:  ${pagesStats.total} keys across ${pagesStats.l3Count} L3 namespaces`);
console.log(`Combined:              ${crmStats.total + pagesStats.total} keys (Category A의 ${((crmStats.total + pagesStats.total) / 3458 * 100).toFixed(1)}%)`);