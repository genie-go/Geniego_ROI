#!/usr/bin/env node
// Session 153 T7: Self-nest extraction (DRY-RUN + QUARANTINE ONLY)
// Extracts pages.marketingIntel.marketingIntel.* sub-tree to JSON
// Does NOT modify active locale files (separate tool required for that, AST-based)

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, join } from 'path';

const LOCALES_DIR = resolve('frontend/src/i18n/locales');
const QUAR_DIR = resolve('frontend/_quarantine/orphan_keys_s153_self_nest');
const LOCALES = ['ko', 'ja', 'zh', 'zh-TW', 'en', 'es', 'fr', 'de', 'pt', 'ru', 'ar', 'hi', 'id', 'th', 'vi'];
const TARGET_PREFIX = ['pages', 'marketingIntel', 'marketingIntel'];

console.log('========== Session 153 T7 Self-Nest Extraction (DRY-RUN) ==========');
console.log(`Target: pages.marketingIntel.marketingIntel.*`);
console.log(`Quarantine: ${QUAR_DIR}\n`);

if (!existsSync(QUAR_DIR)) mkdirSync(QUAR_DIR, { recursive: true });

function findTarget(obj, pathArr) {
  let cur = obj;
  for (const seg of pathArr) {
    if (!cur || typeof cur !== 'object' || !(seg in cur)) return null;
    cur = cur[seg];
  }
  return cur;
}

function countLeaves(o) {
  if (typeof o !== 'object' || o === null) return 1;
  return Object.values(o).reduce((s, v) => s + countLeaves(v), 0);
}

const summary = [];

for (const lang of LOCALES) {
  const path = join(LOCALES_DIR, `${lang}.js`);
  const url = `file:///${path.replace(/\\/g, '/')}`;
  const mod = await import(url);
  const data = mod.default;
  const sub = findTarget(data, TARGET_PREFIX);
  if (!sub) {
    summary.push({ lang, status: 'not-found', leaves: 0 });
    console.log(`  ${lang.padEnd(6)} not found`);
    continue;
  }
  const leaves = countLeaves(sub);
  const outPath = join(QUAR_DIR, `${lang}.json`);
  writeFileSync(outPath, JSON.stringify(sub, null, 2), 'utf8');
  summary.push({ lang, status: 'extracted', leaves, outPath });
  console.log(`  ${lang.padEnd(6)} extracted, ${leaves} leaves → ${outPath}`);
}

console.log('\n========== Summary ==========');
const totalLeaves = summary.reduce((s, x) => s + x.leaves, 0);
const found = summary.filter(x => x.status === 'extracted').length;
console.log(`Locales with self-nest: ${found} / ${LOCALES.length}`);
console.log(`Total leaves quarantined: ${totalLeaves}`);
console.log(`\nFiles saved to ${QUAR_DIR}/`);
console.log(`\nNEXT STEPS (manual review required):`);
console.log(`  1. Inspect quarantine JSON files for unexpected content`);
console.log(`  2. Cross-check against active locale file structure`);
console.log(`  3. Decide actual cleanup tool (AST-based vs manual regex)`);
console.log(`  4. Active locale modification = SEPARATE TOOL (this is extraction-only)`);