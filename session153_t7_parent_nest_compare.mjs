#!/usr/bin/env node
// Session 153 T7: Parent vs self-nest comparison
// Compare pages.marketingIntel.* (parent) vs pages.marketingIntel.marketingIntel.* (self-nest)
// Determine if self-nest is: (a) refactor leftover copy, (b) independent content, (c) override

import { pathToFileURL } from 'url';
import { resolve } from 'path';

const LOCALES = ['ko', 'en', 'ja', 'zh'];
const TARGET_PATH = ['pages', 'marketingIntel'];

function walk(obj, prefix = '') {
  if (typeof obj !== 'object' || obj === null) return [[prefix, obj]];
  return Object.entries(obj).flatMap(([k, v]) => walk(v, prefix ? `${prefix}.${k}` : k));
}

for (const lang of LOCALES) {
  const url = pathToFileURL(resolve(`frontend/src/i18n/locales/${lang}.js`)).href;
  const mod = await import(url);
  const parent = mod.default.pages?.marketingIntel;
  if (!parent) { console.log(`${lang}: pages.marketingIntel not found`); continue; }
  const selfNest = parent.marketingIntel;
  if (!selfNest) { console.log(`${lang}: no self-nest`); continue; }

  const parentKeys = new Set(Object.keys(parent).filter(k => k !== 'marketingIntel'));
  const nestKeys = new Set(Object.keys(selfNest));
  const overlap = [...nestKeys].filter(k => parentKeys.has(k));

  console.log(`\n========== ${lang} ==========`);
  console.log(`Parent top-level (excl. marketingIntel): ${parentKeys.size}`);
  console.log(`  ${[...parentKeys].slice(0, 12).join(', ')}${parentKeys.size > 12 ? '...' : ''}`);
  console.log(`Self-nest top-level: ${nestKeys.size}`);
  console.log(`  ${[...nestKeys].slice(0, 12).join(', ')}${nestKeys.size > 12 ? '...' : ''}`);
  console.log(`Overlap (same top-level key in both): ${overlap.length}`);
  if (overlap.length > 0) console.log(`  ${overlap.slice(0, 12).join(', ')}${overlap.length > 12 ? '...' : ''}`);

  // Deep comparison on overlapping keys: same value or different?
  let sameVal = 0, diffVal = 0;
  const diffSamples = [];
  for (const k of overlap) {
    const pFlat = walk(parent[k]);
    const sFlat = walk(selfNest[k]);
    const pMap = new Map(pFlat);
    const sMap = new Map(sFlat);
    for (const [leafKey, leafVal] of sMap) {
      if (pMap.has(leafKey)) {
        if (pMap.get(leafKey) === leafVal) sameVal++;
        else {
          diffVal++;
          if (diffSamples.length < 5) {
            diffSamples.push({ leaf: `${k}.${leafKey}`, parent: pMap.get(leafKey), nest: leafVal });
          }
        }
      }
    }
  }
  console.log(`Deep leaf compare on overlap: same=${sameVal}, diff=${diffVal}`);
  if (diffSamples.length > 0) {
    console.log(`Sample diff:`);
    for (const s of diffSamples) {
      console.log(`  ${s.leaf}`);
      console.log(`    parent: "${String(s.parent).slice(0, 60)}"`);
      console.log(`    nest:   "${String(s.nest).slice(0, 60)}"`);
    }
  }
}