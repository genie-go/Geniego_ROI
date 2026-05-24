#!/usr/bin/env node
// Session 153 T7: Full self-nest 1,320 paths usage grep
// Single corpus load + per-path includes() check
// Pattern: re-use of session153_t7_dup_usage_grep.mjs

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { resolve, join } from 'path';

const ROOT = resolve('frontend/src');
const PATHS_FILE = resolve('_s153_selfnest_paths.txt');
const OUT_CSV = resolve('session153_t7_selfnest_full_grep.csv');

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

console.log('========== Session 153 T7 Self-Nest Full Grep ==========');
const files = walk(ROOT);
console.log(`Files: ${files.length}`);
const corpus = files.map(f => ({ path: f, content: readFileSync(f, 'utf8') }));
const totalBytes = corpus.reduce((s, c) => s + c.content.length, 0);
console.log(`Corpus loaded: ${totalBytes.toLocaleString()} bytes`);

const paths = readFileSync(PATHS_FILE, 'utf8').trim().split('\n');
console.log(`Paths to check: ${paths.length}\n`);

function countUsage(key) {
  let count = 0;
  const matches = [];
  for (const { path, content } of corpus) {
    let idx = 0;
    while ((idx = content.indexOf(key, idx)) !== -1) {
      count++;
      if (matches.length < 3) {
        matches.push({ path: path.replace(ROOT, ''), line: content.slice(0, idx).split('\n').length });
      }
      idx += key.length;
    }
  }
  return { count, matches };
}

const results = [];
let processed = 0;
for (const p of paths) {
  const { count, matches } = countUsage(p);
  results.push({ path: p, count, matches });
  processed++;
  if (processed % 200 === 0) console.log(`  Progress: ${processed} / ${paths.length}`);
}

// Categorize
const used = results.filter(r => r.count > 0);
const orphan = results.filter(r => r.count === 0);

console.log('\n========== Categorization ==========');
console.log(`Total paths checked:    ${results.length}`);
console.log(`Used in code:           ${used.length}  (${(used.length/results.length*100).toFixed(2)}%)`);
console.log(`Orphan (0 references):  ${orphan.length}  (${(orphan.length/results.length*100).toFixed(2)}%)`);

if (used.length > 0) {
  console.log('\n========== Used paths (top 10 by count) ==========');
  for (const r of used.sort((a,b) => b.count - a.count).slice(0, 10)) {
    console.log(`  ${r.count.toString().padStart(4)} refs  ${r.path}`);
    for (const m of r.matches) console.log(`         ${m.path}:${m.line}`);
  }

  console.log('\n========== ALL used paths ==========');
  for (const r of used) {
    console.log(`  ${r.path}  (${r.count} refs)`);
  }
}

// Export CSV
const csv = [['path', 'usage_count', 'sample_files']];
for (const r of results) {
  csv.push([r.path, r.count, r.matches.map(m => `${m.path}:${m.line}`).join('; ')]);
}
writeFileSync(OUT_CSV, csv.map(r => r.map(s => {
  const str = String(s);
  return str.includes(',') || str.includes('"') ? '"' + str.replace(/"/g, '""') + '"' : str;
}).join(',')).join('\n'), 'utf8');

console.log(`\nExported: ${OUT_CSV}`);
console.log('\n========== Decision Matrix ==========');
console.log(`If used = 0   → self-nest 100% orphan, cleanup safe (Session 154)`);
console.log(`If used > 0   → partial cleanup needed, identify canonical paths first`);
console.log(`If used >> 0  → cleanup abandoned, preserve as intentional dual-track`);