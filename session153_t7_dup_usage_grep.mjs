#!/usr/bin/env node
// Session 153 T7: Duplicate key path usage grep
// Scan frontend/src/ for t('namespace.key') usage of duplicate-suspect paths
// Output: which canonical path is referenced in code, which is orphan
// N-152-A bank-grade: explicit results, no silent skips

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { resolve, join } from 'path';

const ROOT = resolve('frontend/src');
const DUP_CSV = resolve('session153_t7_dq_dup_keypaths.csv');
const OUT_CSV = resolve('session153_t7_dup_usage_results.csv');

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

// Walk frontend/src/ collecting .js/.jsx/.ts/.tsx files, EXCLUDING locales/
function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (entry === 'locales' || entry === 'node_modules' || entry === '_quarantine') continue;
      walk(full, out);
    } else if (/\.(js|jsx|ts|tsx)$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

console.log('Scanning frontend/src/ (excluding locales/, node_modules/, _quarantine/)...');
const files = walk(ROOT);
console.log(`Files to scan: ${files.length}`);

// Build corpus: read all files once
const corpus = files.map(f => ({ path: f, content: readFileSync(f, 'utf8') }));
console.log(`Corpus loaded (total bytes: ${corpus.reduce((s, c) => s + c.content.length, 0)})`);

// Load dup CSV
const dupRaw = readFileSync(DUP_CSV, 'utf8');
const dupRows = parseCSV(dupRaw).slice(1).filter(r => r.length >= 3);

// Group by leaf_signature → check each parent path
const leafGroups = new Map();
for (const r of dupRows) {
  const [leaf, parent, full_key] = r;
  if (!leafGroups.has(leaf)) leafGroups.set(leaf, new Map());
  leafGroups.get(leaf).set(parent, full_key);
}

console.log(`\nUnique leaf signatures to check: ${leafGroups.size}`);

// For each unique full_key, count occurrences in corpus
// Match patterns: t('key'), t("key"), i18nKey="key", t(`key`) — common React i18n patterns
function countUsage(key) {
  // Escape regex special chars
  const esc = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // Quick: just substring search (fast, false positives possible but acceptable for ranking)
  let count = 0;
  const matches = [];
  for (const { path, content } of corpus) {
    let idx = 0;
    while ((idx = content.indexOf(key, idx)) !== -1) {
      count++;
      if (matches.length < 3) matches.push({ path: path.replace(ROOT, ''), line: content.slice(0, idx).split('\n').length });
      idx += key.length;
    }
  }
  return { count, matches };
}

// Results
const outRows = [['leaf', 'parent_count', 'parent', 'full_key', 'usage_count', 'sample_files']];
const summary = []; // { leaf, parents: [{key, parent, count}] }

let processed = 0;
for (const [leaf, parents] of leafGroups) {
  const parentResults = [];
  for (const [parent, fullKey] of parents) {
    const { count, matches } = countUsage(fullKey);
    parentResults.push({ parent, fullKey, count, matches });
    outRows.push([
      leaf,
      parents.size,
      parent,
      fullKey,
      count,
      matches.map(m => `${m.path}:${m.line}`).join('; ')
    ]);
  }
  summary.push({ leaf, parents: parentResults });
  processed++;
  if (processed % 100 === 0) console.log(`  Progress: ${processed} / ${leafGroups.size}`);
}

writeFileSync(OUT_CSV, outRows.map(r => r.map(csvEscape).join(',')).join('\n'), 'utf8');

// Categorize
let bothUsed = 0, oneUsed = 0, noneUsed = 0;
const noneUsedLeafs = [], oneUsedLeafs = [];
for (const { leaf, parents } of summary) {
  const usedParents = parents.filter(p => p.count > 0);
  if (usedParents.length === parents.length) bothUsed++;
  else if (usedParents.length === 0) { noneUsed++; noneUsedLeafs.push(leaf); }
  else { oneUsed++; oneUsedLeafs.push({ leaf, parents }); }
}

console.log('\n========== Usage Categorization ==========');
console.log(`All parents used (genuine dup):     ${bothUsed}`);
console.log(`Only some used (orphan candidates): ${oneUsed}`);
console.log(`None used (full orphan):            ${noneUsed}`);

console.log('\n========== TOP 10: Only-Some-Used (orphan deletion candidates) ==========');
for (const { leaf, parents } of oneUsedLeafs.slice(0, 10)) {
  console.log(`  ${leaf}`);
  for (const p of parents) {
    const marker = p.count > 0 ? '✓ USED' : '✗ ORPHAN';
    console.log(`    ${marker.padEnd(10)} ${p.fullKey}  (${p.count} refs)`);
  }
}

console.log(`\nExported: ${OUT_CSV} (${outRows.length - 1} rows)`);
console.log('\n========== Specific patterns of interest ==========');

// Check pages.marketingIntel.marketingIntel.* self-nesting specifically
const selfNest = summary.filter(s => s.parents.some(p => p.fullKey.includes('marketingIntel.marketingIntel')));
console.log(`pages.marketingIntel.marketingIntel.* self-nest leafs: ${selfNest.length}`);
let selfNestUsed = 0, selfNestOrphan = 0;
for (const { parents } of selfNest) {
  for (const p of parents) {
    if (p.fullKey.includes('marketingIntel.marketingIntel')) {
      if (p.count > 0) selfNestUsed++;
      else selfNestOrphan++;
    }
  }
}
console.log(`  Self-nest paths used in code:   ${selfNestUsed}`);
console.log(`  Self-nest paths orphan in code: ${selfNestOrphan}`);
console.log(`  → if orphan = total, safe to delete entire marketingIntel.marketingIntel sub-tree`);