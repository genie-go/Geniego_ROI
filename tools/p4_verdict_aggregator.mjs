#!/usr/bin/env node
/**
 * tools/p4_verdict_aggregator.mjs
 *
 * Session 159 P4 — aggregate per-root detector JSON outputs into a single
 * verdict CSV matching triage_apply.mjs's DEAD_SUBTREE_HEADER format
 * (patch07 §3.2). Also derives root_line by source-text grep.
 *
 * Usage:  node tools/p4_verdict_aggregator.mjs <json-dir> <locale-path>
 * Output: verdict CSV on stdout (header + N rows)
 *
 * Spec: docs/spec/session159_p4_dead_subtree_ko_dryrun.md §2.3
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const jsonDir = process.argv[2];
const localePath = process.argv[3];
if (!jsonDir || !localePath) {
  process.stderr.write('usage: node tools/p4_verdict_aggregator.mjs <json-dir> <locale-path>\n');
  process.exit(2);
}

// Build top-level key → line-number map by scanning source text.
//   기준: 2-space indent + key + ':' (정상 prettier 포맷 가정).
//   따옴표/identifier 양쪽 허용.
const src = readFileSync(localePath, 'utf-8').split(/\r?\n/);
const rootLine = new Map();
for (let i = 0; i < src.length; i++) {
  const m = src[i].match(/^  (?:"([^"]+)"|([A-Za-z_$][\w$]*))\s*:\s*\{/);
  if (m) {
    const key = m[1] || m[2];
    if (!rootLine.has(key)) rootLine.set(key, i + 1);  // 1-based
  }
}

function csvField(v) {
  const s = String(v ?? '');
  if (/[",\r\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return '"' + s + '"';  // 항상 quote (downstream parseCsvLine 호환)
}

const header = ['locale','root_path','status','verdict','subtree_leaf_count','total_consumers','root_line'];
const rows = [header.map(csvField).join(',')];

const files = readdirSync(jsonDir).filter(f => f.endsWith('.json') && f.startsWith('verdict_')).sort();
for (const f of files) {
  let j;
  try { j = JSON.parse(readFileSync(join(jsonDir, f), 'utf-8')); }
  catch (e) { process.stderr.write(`skip ${f}: ${e.message}\n`); continue; }
  if (j.mode !== 'dead-subtree') { process.stderr.write(`skip ${f}: not dead-subtree json\n`); continue; }
  const line = rootLine.get(j.root_path) ?? 0;
  rows.push([
    j.locale, j.root_path, j.status, j.verdict,
    j.subtree_leaf_count, j.total_consumers, line,
  ].map(csvField).join(','));
}

process.stdout.write(rows.join('\n') + '\n');
