#!/usr/bin/env node
// Session 153 T7 Category A analysis
// Quote-aware CSV parsing (RFC 4180), namespace breakdown, locale_count cross-tab
// N-152-A bank-grade: explicit error handling, no silent failures

import { readFileSync } from 'fs';
import { resolve } from 'path';

const CSV_PATH = resolve('session152_t7_drift_category_A_intentional_english.csv');

// RFC 4180 quote-aware CSV parser (minimal, no deps)
function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  let i = 0;
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

const raw = readFileSync(CSV_PATH, 'utf8');
const rows = parseCSV(raw);
const header = rows[0];
const data = rows.slice(1).filter(r => r.length === header.length);

const malformed = rows.slice(1).filter(r => r.length !== header.length).length;

const colIdx = Object.fromEntries(header.map((h, i) => [h.trim(), i]));
const keyI = colIdx['key'];
const nsI = colIdx['namespace_l2'];
const valI = colIdx['value'];
const lcI = colIdx['locale_count'];
const locsI = colIdx['locales'];

// --- 1. locale_count distribution ---
const lcDist = new Map();
for (const r of data) {
  const lc = r[lcI];
  lcDist.set(lc, (lcDist.get(lc) || 0) + 1);
}

// --- 2. empty value count ---
const emptyVal = data.filter(r => r[valI] === '').length;

// --- 3. top-level namespace breakdown (l1 from namespace_l2) ---
const l1Counts = new Map();
for (const r of data) {
  const l1 = (r[nsI] || '').split('.')[0];
  l1Counts.set(l1, (l1Counts.get(l1) || 0) + 1);
}

// --- 4. crm.* sub-namespace ---
const crmSub = new Map();
const pagesSub = new Map();
for (const r of data) {
  const ns = r[nsI] || '';
  if (ns.startsWith('crm.')) crmSub.set(ns, (crmSub.get(ns) || 0) + 1);
  if (ns.startsWith('pages.')) pagesSub.set(ns, (pagesSub.get(ns) || 0) + 1);
}

// --- 5. locale_count x l1 cross-tab (top l1 only) ---
const xtab = new Map(); // l1 -> Map(lc -> count)
const topL1 = [...l1Counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(e => e[0]);
for (const r of data) {
  const l1 = (r[nsI] || '').split('.')[0];
  if (!topL1.includes(l1)) continue;
  const lc = r[lcI];
  if (!xtab.has(l1)) xtab.set(l1, new Map());
  const m = xtab.get(l1);
  m.set(lc, (m.get(lc) || 0) + 1);
}

// --- Output ---
console.log('=== Session 153 T7 Category A Analysis ===');
console.log(`Total rows: ${data.length} (malformed skipped: ${malformed})`);
console.log(`Empty value: ${emptyVal} (${(emptyVal / data.length * 100).toFixed(2)}%)`);
console.log('');

console.log('=== locale_count distribution ===');
for (const [lc, c] of [...lcDist.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${c.toString().padStart(5)} keys @ ${lc} locales (${(c / data.length * 100).toFixed(2)}%)`);
}
console.log('');

console.log('=== top-level namespace (l1) breakdown ===');
for (const [l1, c] of [...l1Counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15)) {
  console.log(`  ${c.toString().padStart(5)} ${l1}`);
}
console.log('');

console.log('=== crm.* sub-namespace top 15 ===');
for (const [ns, c] of [...crmSub.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15)) {
  console.log(`  ${c.toString().padStart(5)} ${ns}`);
}
console.log('');

console.log('=== pages.* sub-namespace top 15 ===');
for (const [ns, c] of [...pagesSub.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15)) {
  console.log(`  ${c.toString().padStart(5)} ${ns}`);
}
console.log('');

console.log('=== locale_count × top-l1 cross-tab ===');
const lcKeys = [...new Set(data.map(r => r[lcI]))].sort((a, b) => Number(b) - Number(a));
console.log('  l1'.padEnd(20) + lcKeys.map(k => k.padStart(7)).join(''));
for (const l1 of topL1) {
  const m = xtab.get(l1) || new Map();
  const line = ('  ' + l1).padEnd(20) + lcKeys.map(k => (m.get(k) || 0).toString().padStart(7)).join('');
  console.log(line);
}