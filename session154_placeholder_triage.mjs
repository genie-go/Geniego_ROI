#!/usr/bin/env node
/**
 * session154_placeholder_triage.mjs
 *
 * Session 154 — pages.marketingIntel.* placeholder triage scan.
 *
 * GOAL
 *   Identify untranslated/placeholder leaves under pages.marketingIntel.*
 *   (excluding the already-removed self-nest) across all 15 locales, and
 *   emit a triage CSV for the next-step translation patch.
 *
 * DEFINITION OF PLACEHOLDER (value-side, robust)
 *   P1  value matches /^[A-Z][A-Z_]*_\d+$/         e.g. U_0, K_3, BADGE_20
 *   P2  value matches /^Badge\d+[A-Za-z]*$/         e.g. Badge20kpi
 *   P3  value matches /^K_\d+[a-z]*$/i              e.g. K_3, k_8b
 *   P4  value === key (case-insensitive exact)     auto-id fallback
 *   P5  value length < 2 chars                     empty/space/single char
 *   P6  value === 'TODO' || 'TBD' || 'FIXME'       deliberate marker
 *   P7  value contains '{{' or starts with '['     unrendered placeholder
 *
 * OUTPUT
 *   session154_placeholder_scan.csv with columns:
 *     keypath, ko_value, ko_class, en_value, en_class, ja_value, …,
 *     n_placeholder_locales, recommend_action
 *
 *   class = PASS | P1..P7 | EMPTY
 *
 *   recommend_action:
 *     'translate'        — ≥3 locales still placeholder; high-leverage
 *     'review'           — 1-2 locales placeholder; partial translation in
 *     'skip'             — 0 placeholders (already translated everywhere)
 *
 * USAGE
 *   node session154_placeholder_triage.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'acorn';

const REPO_ROOT   = process.cwd();
const LOCALES_DIR = path.join(REPO_ROOT, 'frontend', 'src', 'i18n', 'locales');
const OUT_CSV     = path.join(REPO_ROOT, 'session154_placeholder_scan.csv');

const LOCALES = ['ko','en','ja','zh','zh-TW','es','fr','de','pt','ru','ar','hi','id','th','vi'];
const PREFIX  = 'pages.marketingIntel.';
const EXCLUDE_PREFIX = 'pages.marketingIntel.marketingIntel.'; // already removed

function readLocaleObj(loc) {
  const fp = path.join(LOCALES_DIR, `${loc}.js`);
  const src = fs.readFileSync(fp, 'utf8');
  const ast = parse(src, { ecmaVersion: 'latest', sourceType: 'module' });
  for (const n of ast.body) {
    if (n.type === 'ExportDefaultDeclaration') {
      let d = n.declaration;
      while (d && d.type !== 'ObjectExpression') d = d.expression;
      return d;
    }
  }
  throw new Error(`No export default in ${loc}.js`);
}

function keyName(p) {
  if (p.key.type === 'Identifier') return p.key.name;
  if (p.key.type === 'Literal' && typeof p.key.value === 'string') return p.key.value;
  return null;
}

function strValue(v) {
  if (v.type === 'Literal' && typeof v.value === 'string') return v.value;
  if (v.type === 'TemplateLiteral' && v.quasis.length === 1) return v.quasis[0].value.cooked;
  return null;
}

function flatten(node, prefix, into) {
  if (!node || node.type !== 'ObjectExpression') return;
  for (const p of node.properties) {
    if (p.type !== 'Property') continue;
    const k = keyName(p);
    if (k == null) continue;
    const path = prefix.length ? `${prefix}.${k}` : k;
    if (p.value.type === 'ObjectExpression') {
      flatten(p.value, path, into);
    } else {
      const sv = strValue(p.value);
      if (sv != null) into.set(path, sv);
    }
  }
}

// Placeholder classifier
function classify(key, value) {
  if (value == null) return 'NULL';
  if (value.length < 2) return 'P5';
  const v = value.trim();
  if (/^[A-Z][A-Z_]*_\d+$/.test(v))      return 'P1';
  if (/^Badge\d+[A-Za-z]*$/.test(v))     return 'P2';
  if (/^[Kk]_\d+[a-z]*$/.test(v))        return 'P3';
  if (key.toLowerCase() === v.toLowerCase()) return 'P4';
  if (/^(TODO|TBD|FIXME|PLACEHOLDER|PENDING)$/i.test(v)) return 'P6';
  if (v.startsWith('{{') || v.startsWith('[')) return 'P7';
  return 'PASS';
}

// -----------------------------------------------------------------------------
// Main
// -----------------------------------------------------------------------------

console.log('='.repeat(78));
console.log(' Session 154 placeholder triage — pages.marketingIntel.* (15 locales)');
console.log('='.repeat(78));

const perLocale = new Map(); // locale -> Map(keypath -> value)
for (const loc of LOCALES) {
  const root = readLocaleObj(loc);
  const flat = new Map();
  flatten(root, '', flat);
  const inScope = new Map();
  for (const [k, v] of flat) {
    if (k.startsWith(PREFIX) && !k.startsWith(EXCLUDE_PREFIX)) {
      inScope.set(k, v);
    }
  }
  perLocale.set(loc, inScope);
  console.log(`  ${loc.padEnd(6)} pages.marketingIntel.* leaves: ${inScope.size}`);
}

// Union of all keys
const allKeys = new Set();
for (const m of perLocale.values()) for (const k of m.keys()) allKeys.add(k);
console.log(`\n  union of keys: ${allKeys.size}`);

// Classify each key per locale
const rows = [];
const counts = { PASS: 0, P1: 0, P2: 0, P3: 0, P4: 0, P5: 0, P6: 0, P7: 0, NULL: 0 };
for (const key of [...allKeys].sort()) {
  const leaf = key.split('.').pop();
  const row = { keypath: key };
  let nPh = 0;
  for (const loc of LOCALES) {
    const v = perLocale.get(loc).get(key);
    const cls = v == null ? 'MISSING' : classify(leaf, v);
    row[`${loc}_value`] = v == null ? '' : v;
    row[`${loc}_class`] = cls;
    if (cls !== 'PASS' && cls !== 'MISSING') {
      nPh++;
      if (counts[cls] != null) counts[cls]++;
    }
    if (cls === 'PASS') counts.PASS++;
  }
  row.n_placeholder = nPh;
  if (nPh === 0)       row.action = 'skip';
  else if (nPh <= 2)   row.action = 'review';
  else                 row.action = 'translate';
  rows.push(row);
}

// CSV
const header = ['keypath'];
for (const loc of LOCALES) header.push(`${loc}_value`, `${loc}_class`);
header.push('n_placeholder', 'action');

function csvEscape(s) {
  if (s == null) return '';
  const str = String(s);
  if (/[",\n]/.test(str)) return '"' + str.replace(/"/g, '""') + '"';
  return str;
}
const lines = [header.join(',')];
for (const r of rows) {
  lines.push(header.map(h => csvEscape(r[h])).join(','));
}
fs.writeFileSync(OUT_CSV, lines.join('\n'), 'utf8');

// Summary
const phRows = rows.filter(r => r.n_placeholder > 0);
const trRows = rows.filter(r => r.action === 'translate');
const rvRows = rows.filter(r => r.action === 'review');

console.log('');
console.log(`Classification counts (across locale × key matrix):`);
for (const [k, n] of Object.entries(counts)) {
  if (n > 0) console.log(`  ${k.padEnd(5)} ${n}`);
}
console.log('');
console.log(`Per-key action:`);
console.log(`  translate (≥3 locales placeholder): ${trRows.length}`);
console.log(`  review    (1-2 locales placeholder): ${rvRows.length}`);
console.log(`  skip      (all PASS):                ${rows.length - phRows.length}`);
console.log('');

// Top hotspots
const byL3 = new Map();
for (const r of phRows) {
  const parts = r.keypath.split('.');
  const l3 = parts.slice(0, 3).join('.'); // e.g. pages.marketingIntel.aiPredict
  byL3.set(l3, (byL3.get(l3) || 0) + 1);
}
const top = [...byL3.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
console.log(`Top L3 hotspots (≥1 placeholder):`);
for (const [k, n] of top) console.log(`  ${String(n).padStart(4)}  ${k}`);

console.log('');
console.log(`Report: ${OUT_CSV}`);
console.log(`Total rows: ${rows.length}  (placeholder rows: ${phRows.length})`);
