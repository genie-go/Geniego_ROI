#!/usr/bin/env node
/**
 * session154_placeholder_triage_v2.mjs
 *
 * Session 154 placeholder triage — v2 refinement.
 *
 * v1 (session154_placeholder_triage.mjs) over-counted by treating
 * industry acronyms (ROAS, KPI, ROI) as P4 placeholders. v2 adds:
 *
 *   1. ACRONYM_WHITELIST exclusion (marketing/analytics terms)
 *   2. Pattern auto-labeling for the three known structural groups
 *      identified during sample inspection:
 *
 *        PAT_A  influencer.actionPresets.guide.*  — universal MISSING
 *                (needs new copy authored, all 15 locales)
 *        PAT_B  aiPredict.* leaves where ko PASS but ≥3 other locales
 *                fail   — needs mechanical translation
 *        PAT_C  influencerUGC.txt_* leaves where ko MISSING and others
 *                hold literal Korean key as value — needs ko source
 *                first, then propagation
 *        PAT_X  other / mixed
 *
 * OUTPUT
 *   session154_placeholder_scan_v2.csv with new columns:
 *     pattern (PAT_A | PAT_B | PAT_C | PAT_X),
 *     ko_pass (boolean), n_locales_pass, n_locales_placeholder
 *
 * USAGE
 *   node session154_placeholder_triage_v2.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'acorn';

const REPO_ROOT   = process.cwd();
const LOCALES_DIR = path.join(REPO_ROOT, 'frontend', 'src', 'i18n', 'locales');
const OUT_CSV     = path.join(REPO_ROOT, 'session154_placeholder_scan_v2.csv');
const SUMMARY     = path.join(REPO_ROOT, 'session154_placeholder_summary.md');

const LOCALES = ['ko','en','ja','zh','zh-TW','es','fr','de','pt','ru','ar','hi','id','th','vi'];
const PREFIX  = 'pages.marketingIntel.';
const EXCLUDE_PREFIX = 'pages.marketingIntel.marketingIntel.';

// Industry acronyms — treated as PASS regardless of key match
const ACRONYM_WHITELIST = new Set([
  'roas','roi','kpi','ctr','cpm','cpc','cpa','cpv','arpu','ltv','dau','mau','wau',
  'ugc','seo','sem','sov','crm','crr','cac','aov','gmv','npv','irr','ebitda','ebit',
  'b2b','b2c','d2c','ab','sla','sli','slo','api','sdk','url','utm','rss','json','xml',
  'pv','uv','vv','imp','imps','clicks','views','spend','reach','freq',
  'q1','q2','q3','q4','h1','h2','yoy','mom','wow','qoq','yt','fb','ig','tw','tk','li',
  'usd','krw','jpy','eur','gbp','cny','idr','vnd','thb','php',
  'ok','no','yes','on','off','tbd','tba','na','ai','ml','llm','nlp','ocr','asr','tts',
]);

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
    const np = prefix.length ? `${prefix}.${k}` : k;
    if (p.value.type === 'ObjectExpression') flatten(p.value, np, into);
    else { const sv = strValue(p.value); if (sv != null) into.set(np, sv); }
  }
}

function classify(key, value) {
  if (value == null || value === '') return 'EMPTY';
  const v = value.trim();
  if (v.length < 2) return 'P5';
  // acronym whitelist
  if (ACRONYM_WHITELIST.has(v.toLowerCase())) return 'PASS';
  if (/^[A-Z][A-Z_]*_\d+$/.test(v))           return 'P1';
  if (/^Badge\d+[A-Za-z]*$/.test(v))          return 'P2';
  if (/^[Kk]_\d+[a-z]*$/.test(v))             return 'P3';
  if (key.toLowerCase() === v.toLowerCase())  return 'P4';
  if (/^(TODO|TBD|FIXME|PLACEHOLDER|PENDING)$/i.test(v)) return 'P6';
  if (v.startsWith('{{') || v.startsWith('['))           return 'P7';
  return 'PASS';
}

function autoLabelPattern(keypath, classes, nMissing) {
  // PAT_A: actionPresets.guide.* — guided tour copy, universal MISSING
  if (keypath.startsWith('pages.marketingIntel.influencer.actionPresets.guide.')) {
    return 'PAT_A';
  }
  // PAT_C: influencerUGC.txt_* — broken extraction (ko-source missing, others have literal key)
  if (keypath.startsWith('pages.marketingIntel.influencerUGC.')) {
    const leaf = keypath.split('.').pop();
    if (/^[Tt]xt_/.test(leaf)) return 'PAT_C';
  }
  // PAT_D: key-parity drift — present in some locales, absent in many
  if (nMissing >= 5) return 'PAT_D';
  // PAT_B: ko PASS + ≥3 non-ko locales fail — mechanical translation (generalized)
  if (classes.ko === 'PASS') {
    let fail = 0;
    for (const loc of LOCALES) {
      if (loc === 'ko') continue;
      const c = classes[loc];
      if (c && c !== 'PASS' && c !== 'MISSING') fail++;
    }
    if (fail >= 3) return 'PAT_B';
  }
  // PAT_E: ko fail + others PASS — Korean-side regression (rare but worth flagging)
  if (classes.ko && classes.ko !== 'PASS' && classes.ko !== 'MISSING') {
    let okOthers = 0;
    for (const loc of LOCALES) {
      if (loc === 'ko') continue;
      if (classes[loc] === 'PASS') okOthers++;
    }
    if (okOthers >= 10) return 'PAT_E';
  }
  return 'PAT_X';
}

// -----------------------------------------------------------------------------

console.log('='.repeat(78));
console.log(' Session 154 placeholder triage v2 (acronym-aware + auto-label)');
console.log('='.repeat(78));

const perLocale = new Map();
for (const loc of LOCALES) {
  const root = readLocaleObj(loc);
  const flat = new Map();
  flatten(root, '', flat);
  const inScope = new Map();
  for (const [k, v] of flat) {
    if (k.startsWith(PREFIX) && !k.startsWith(EXCLUDE_PREFIX)) inScope.set(k, v);
  }
  perLocale.set(loc, inScope);
}

const allKeys = new Set();
for (const m of perLocale.values()) for (const k of m.keys()) allKeys.add(k);

const rows = [];
const counts = { PASS: 0, EMPTY: 0, P1: 0, P2: 0, P3: 0, P4: 0, P5: 0, P6: 0, P7: 0, MISSING: 0 };
const patternCounts = { PAT_A: 0, PAT_B: 0, PAT_C: 0, PAT_D: 0, PAT_E: 0, PAT_X: 0 };
let acronymRescues = 0;

for (const key of [...allKeys].sort()) {
  const leaf = key.split('.').pop();
  const row = { keypath: key };
  const classes = {};
  let nPh = 0, nPass = 0, nMissing = 0;
  for (const loc of LOCALES) {
    const v = perLocale.get(loc).get(key);
    let cls;
    if (v == null) { cls = 'MISSING'; nMissing++; }
    else {
      cls = classify(leaf, v);
      // acronym rescue detection (informational)
      if (cls === 'PASS' && /^[A-Z][A-Z_]*_?\d*$/.test(v.trim())) acronymRescues++;
    }
    classes[loc] = cls;
    row[`${loc}_value`] = v == null ? '' : v;
    row[`${loc}_class`] = cls;
    if (cls === 'PASS') nPass++;
    else if (cls !== 'MISSING') nPh++;
    if (counts[cls] != null) counts[cls]++;
  }
  row.ko_pass = classes.ko === 'PASS' ? 1 : 0;
  row.n_locales_pass = nPass;
  row.n_locales_placeholder = nPh;
  row.n_locales_missing = nMissing;
  row.pattern = autoLabelPattern(key, classes, nMissing);
  if (row.pattern in patternCounts) patternCounts[row.pattern]++;
  if (nPh === 0) row.action = 'skip';
  else if (nPh <= 2) row.action = 'review';
  else row.action = 'translate';
  rows.push(row);
}

// CSV
const header = ['keypath','pattern','action','ko_pass','n_locales_pass','n_locales_placeholder','n_locales_missing'];
for (const loc of LOCALES) header.push(`${loc}_value`, `${loc}_class`);

function csvEscape(s) {
  if (s == null) return '';
  const str = String(s);
  if (/[",\n]/.test(str)) return '"' + str.replace(/"/g, '""') + '"';
  return str;
}
const lines = [header.join(',')];
for (const r of rows) lines.push(header.map(h => csvEscape(r[h])).join(','));
fs.writeFileSync(OUT_CSV, lines.join('\n'), 'utf8');

// Summary stats
const phRows = rows.filter(r => r.n_locales_placeholder > 0);
const trRows = rows.filter(r => r.action === 'translate');
const rvRows = rows.filter(r => r.action === 'review');

console.log('');
console.log(`Total keys scanned: ${rows.length}`);
console.log(`Action distribution:`);
console.log(`  translate (≥3 locales placeholder): ${trRows.length}`);
console.log(`  review    (1-2 locales placeholder): ${rvRows.length}`);
console.log(`  skip      (all PASS):                ${rows.length - phRows.length}`);
console.log('');
console.log(`Per-locale × key class counts:`);
for (const [k, n] of Object.entries(counts)) if (n > 0) console.log(`  ${k.padEnd(8)} ${n}`);
console.log('');
console.log(`Pattern auto-labels:`);
for (const [k, n] of Object.entries(patternCounts)) console.log(`  ${k} ${String(n).padStart(4)}`);

// Per-pattern action breakdown
console.log('');
console.log(`Per-pattern × action:`);
for (const pat of Object.keys(patternCounts)) {
  const tr = rows.filter(r => r.pattern === pat && r.action === 'translate').length;
  const rv = rows.filter(r => r.pattern === pat && r.action === 'review').length;
  const sk = rows.filter(r => r.pattern === pat && r.action === 'skip').length;
  console.log(`  ${pat}  translate=${tr}  review=${rv}  skip=${sk}`);
}

console.log('');
console.log(`Report: ${OUT_CSV}`);

// Markdown summary for handover input
const md = [];
md.push('# Session 154 placeholder triage v2 — summary\n');
md.push(`generated: ${new Date().toISOString()}\n`);
md.push(`scope: pages.marketingIntel.* (self-nest excluded)\n`);
md.push(`scanned: ${rows.length} keys across 15 locales\n`);
md.push('\n## Action distribution\n');
md.push(`- translate (≥3 locales placeholder): **${trRows.length}**`);
md.push(`- review (1-2 locales): **${rvRows.length}**`);
md.push(`- skip (clean): **${rows.length - phRows.length}**`);
md.push('\n## Pattern auto-labels\n');
md.push('| Pattern | Count | Description |');
md.push('|---|---|---|');
md.push(`| PAT_A | ${patternCounts.PAT_A} | influencer.actionPresets.guide.* — needs new copy authored across all 15 locales |`);
md.push(`| PAT_B | ${patternCounts.PAT_B} | ko PASS + ≥3 other locales fail — mechanical translation (ko→14) |`);
md.push(`| PAT_C | ${patternCounts.PAT_C} | influencerUGC.txt_* — ko source missing, others hold literal key as value |`);
md.push(`| PAT_D | ${patternCounts.PAT_D} | key-parity drift — present in some locales, missing in ≥5 others |`);
md.push(`| PAT_E | ${patternCounts.PAT_E} | ko regression — ko fail while ≥10 other locales PASS (rare flag) |`);
md.push(`| PAT_X | ${patternCounts.PAT_X} | residual / mixed |`);
md.push('\n## Suggested next-session work splits\n');
md.push(`- **155 phase 1**: PAT_B (mechanical ko→14 translation). Lowest risk, highest leverage.`);
md.push(`- **155 phase 2**: PAT_D (key-parity drift). Decide canonical key set per page section; remove orphans or add MISSING locales.`);
md.push(`- **155 phase 3**: PAT_C (UGC ko-source authoring → propagate).`);
md.push(`- **155 phase 4**: PAT_A (guide tour UX writing).`);
md.push(`- **155 phase 5**: PAT_E spot-fixes (ko regression).`);
md.push(`- **155 phase 6**: PAT_X residual triage.`);
md.push('\n## CSV columns\n');
md.push('`keypath, pattern, action, ko_pass, n_locales_pass, n_locales_placeholder, n_locales_missing, {locale}_value, {locale}_class` for each locale.');
md.push('');
fs.writeFileSync(SUMMARY, md.join('\n'), 'utf8');
console.log(`Summary: ${SUMMARY}`);
