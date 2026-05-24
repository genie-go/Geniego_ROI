#!/usr/bin/env node
// Session 153 T7: Data Quality Audit
// (a) Duplicate key path (influencerUGC convergence)
// (b) Trivial values (comma-only, whitespace-only, length<3 non-numeric)
// (c) Txt_* auto-gen residue sweep
// Scope: Category A CSV (3,458 keys) + cross-check against ko.js master
// N-152-A bank-grade: RFC 4180 parser, explicit categorization, CSV exports

import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const CSV_IN = resolve('session152_t7_drift_category_A_intentional_english.csv');
const OUT_DUP = resolve('session153_t7_dq_dup_keypaths.csv');
const OUT_TRIVIAL = resolve('session153_t7_dq_trivial_values.csv');
const OUT_AUTOGEN = resolve('session153_t7_dq_txt_autogen.csv');

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
const keyI = colIdx['key'], nsI = colIdx['namespace_l2'];
const valI = colIdx['value'], lcI = colIdx['locale_count'], locsI = colIdx['locales'];

// ===== (a) Duplicate key path detection =====
// Suspect: same leaf segment (last 2-3 segments) appearing under multiple parents
// Example: pages.marketingIntel.influencerUGC.* vs pages.marketingIntel.aiPredict.influencerUGC.*
const leafGroups = new Map(); // leaf_signature -> [{key, parent}]
for (const r of data) {
  const key = r[keyI] || '';
  const segs = key.split('.');
  if (segs.length < 3) continue;
  // Leaf signature: last 2 segments
  const leaf = segs.slice(-2).join('.');
  const parent = segs.slice(0, -2).join('.');
  if (!leafGroups.has(leaf)) leafGroups.set(leaf, []);
  leafGroups.get(leaf).push({ key, parent, value: r[valI], lc: r[lcI] });
}
const dups = [...leafGroups.entries()].filter(([_, arr]) => {
  const parents = new Set(arr.map(x => x.parent));
  return parents.size > 1;
});

console.log('========== (a) Duplicate key paths ==========');
console.log(`Suspect leaf signatures: ${dups.length}`);
console.log('\nTop 10 by parent-count divergence:');
const dupsSorted = dups.map(([leaf, arr]) => ({
  leaf, count: arr.length, parents: new Set(arr.map(x => x.parent)).size, arr
})).sort((a, b) => b.parents - a.parents || b.count - a.count);
for (const { leaf, count, parents, arr } of dupsSorted.slice(0, 10)) {
  console.log(`  ${leaf}  →  ${parents} parents, ${count} occurrences`);
  for (const x of arr.slice(0, 3)) {
    console.log(`    [${x.parent}]  "${(x.value || '').slice(0, 40)}"  lc=${x.lc}`);
  }
}

// Export dup CSV
const dupRows = [['leaf_signature', 'parent', 'full_key', 'value', 'locale_count']];
for (const { leaf, arr } of dupsSorted) {
  for (const x of arr) dupRows.push([leaf, x.parent, x.key, x.value, x.lc]);
}
writeFileSync(OUT_DUP, dupRows.map(r => r.map(csvEscape).join(',')).join('\n'), 'utf8');
console.log(`\nExported: ${OUT_DUP} (${dupRows.length - 1} rows)`);

// ===== (b) Trivial values =====
// Comma-only, whitespace-only, single-char punctuation, length<3 non-meaningful
const trivials = [];
for (const r of data) {
  const v = r[valI] || '';
  const trimmed = v.trim();
  let reason = null;
  if (v === '') reason = 'empty';
  else if (trimmed === '') reason = 'whitespace-only';
  else if (trimmed === ',' || trimmed === '.' || trimmed === '-' || trimmed === '/' || trimmed === ':') reason = 'single-punct';
  else if (/^[,.\-\/:;\s]+$/.test(trimmed)) reason = 'punct-only';
  else if (trimmed.length < 3 && !/^[0-9]+$/.test(trimmed) && !/^[%$€¥₩]/.test(trimmed)) reason = 'too-short';
  if (reason) trivials.push({ key: r[keyI], value: v, reason, lc: r[lcI] });
}

console.log('\n========== (b) Trivial values ==========');
const reasonGroups = new Map();
for (const t of trivials) reasonGroups.set(t.reason, (reasonGroups.get(t.reason) || 0) + 1);
console.log(`Total trivial: ${trivials.length} (${(trivials.length / data.length * 100).toFixed(2)}%)`);
for (const [reason, count] of [...reasonGroups.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${count.toString().padStart(5)}  ${reason}`);
}
console.log('\nSample 10:');
for (const t of trivials.slice(0, 10)) {
  console.log(`  ${t.key}  →  "${t.value}"  [${t.reason}]`);
}

const trivRows = [['key', 'value', 'reason', 'locale_count']];
for (const t of trivials) trivRows.push([t.key, t.value, t.reason, t.lc]);
writeFileSync(OUT_TRIVIAL, trivRows.map(r => r.map(csvEscape).join(',')).join('\n'), 'utf8');
console.log(`\nExported: ${OUT_TRIVIAL} (${trivRows.length - 1} rows)`);

// ===== (c) Txt_* auto-gen residue =====
// Pattern: value starts with "Txt_" or contains "_NN" suffix on words
const autoGen = [];
for (const r of data) {
  const v = r[valI] || '';
  const key = r[keyI] || '';
  let pattern = null;
  if (/^Txt_/.test(v)) pattern = 'value-starts-Txt_';
  else if (/^Txt_/i.test(key.split('.').pop())) pattern = 'key-leaf-Txt_';
  else if (/_[0-9]+$/.test(v) && v.length < 40) pattern = 'value-trailing-_NN';
  if (pattern) autoGen.push({ key, value: v, pattern, lc: r[lcI] });
}

console.log('\n========== (c) Txt_* auto-gen residue ==========');
const patGroups = new Map();
for (const a of autoGen) patGroups.set(a.pattern, (patGroups.get(a.pattern) || 0) + 1);
console.log(`Total auto-gen suspects: ${autoGen.length}`);
for (const [p, c] of [...patGroups.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${c.toString().padStart(5)}  ${p}`);
}
console.log('\nSample 10:');
for (const a of autoGen.slice(0, 10)) {
  console.log(`  ${a.key}  →  "${(a.value || '').slice(0, 60)}"  [${a.pattern}]`);
}

const agRows = [['key', 'value', 'pattern', 'locale_count']];
for (const a of autoGen) agRows.push([a.key, a.value, a.pattern, a.lc]);
writeFileSync(OUT_AUTOGEN, agRows.map(r => r.map(csvEscape).join(',')).join('\n'), 'utf8');
console.log(`\nExported: ${OUT_AUTOGEN} (${agRows.length - 1} rows)`);

console.log('\n========== Summary ==========');
console.log(`(a) Duplicate leaf signatures:  ${dups.length}`);
console.log(`(b) Trivial values:             ${trivials.length}`);
console.log(`(c) Auto-gen residue:           ${autoGen.length}`);
console.log(`Combined unique issues:         ${new Set([...dups.flatMap(([_, arr]) => arr.map(x => x.key)), ...trivials.map(t => t.key), ...autoGen.map(a => a.key)]).size}`);