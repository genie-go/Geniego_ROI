#!/usr/bin/env node
/**
 * tools/p5_summary.mjs
 *
 * Session 159 P5 — non-ko collision dry-run plan 집계 보고서.
 *
 * Usage: node tools/p5_summary.mjs <plan-dir>
 * Spec : docs/spec/session159_p5_non_ko_dryrun.md §3.1, §4.2, §7
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const dir = process.argv[2];
if (!dir) {
  console.error('usage: node tools/p5_summary.mjs <plan-dir>');
  process.exit(2);
}

const files = readdirSync(dir).filter(f => f.endsWith('_plan.json')).sort();

const out = [];
out.push('# Session 159 — P5 non-ko locale dry-run summary');
out.push('');
out.push(`Generated: ${new Date().toISOString()}`);
out.push(`Plan count: ${files.length}`);
out.push('');
out.push('| locale | pre_collisions | delete | est Δ | block del | leaf del | demoted | pre_leaves | pre_size |');
out.push('|---|---:|---:|---:|---:|---:|---:|---:|---:|');

const totals = { pre: 0, deletes: 0, estDelta: 0, block: 0, leaf: 0, demoted: 0, leaves: 0, size: 0 };
const warnings = [];

for (const file of files) {
  const plan = JSON.parse(readFileSync(join(dir, file), 'utf-8'));
  const locale = file.replace(/_plan\.json$/, '');
  const pre = plan.gates?.pre_collision_count ?? 0;
  const deletes = plan.summary?.delete ?? 0;
  const estDelta = plan.summary?.estimated_leaf_delta ?? 0;
  const block = plan.decisions.filter(d => d.action === 'delete' && d.kind === 'block').length;
  const leaf = plan.decisions.filter(d => d.action === 'delete' && d.kind === 'leaf').length;
  const demoted = plan.decisions.filter(d => d.action === 'skip' && String(d.rationale ?? '').startsWith('demoted')).length;
  const leaves = plan.gates?.pre_leaves ?? 0;
  const size = plan.gates?.pre_size ?? 0;

  totals.pre += pre;
  totals.deletes += deletes;
  totals.estDelta += estDelta;
  totals.block += block;
  totals.leaf += leaf;
  totals.demoted += demoted;
  totals.leaves += leaves;
  totals.size += size;

  // §7 risk-signal triggers
  if (estDelta < -1000) warnings.push(`${locale}: estimated Δ=${estDelta} (대규모 삭제)`);
  if (block > leaf) warnings.push(`${locale}: block deletes (${block}) > leaf deletes (${leaf})`);
  if (pre > 210) warnings.push(`${locale}: pre_collisions=${pre} (ko baseline 21의 10배 초과)`);
  const totalDec = deletes + demoted;
  if (totalDec > 0 && demoted / totalDec > 0.5) {
    warnings.push(`${locale}: demoted ratio=${((demoted/totalDec)*100).toFixed(1)}% > 50%`);
  }

  out.push(`| ${locale} | ${pre} | ${deletes} | ${estDelta} | ${block} | ${leaf} | ${demoted} | ${leaves.toLocaleString()} | ${size.toLocaleString()} |`);
}

out.push(`| **TOTAL** | **${totals.pre}** | **${totals.deletes}** | **${totals.estDelta}** | **${totals.block}** | **${totals.leaf}** | **${totals.demoted}** | **${totals.leaves.toLocaleString()}** | **${totals.size.toLocaleString()}** |`);
out.push('');

if (warnings.length > 0) {
  out.push('## ⚠️ 위험 신호 (spec §7 트리거)');
  out.push('');
  for (const w of warnings) out.push(`- ${w}`);
  out.push('');
}

out.push('## 검수자 노트');
out.push('');
out.push('- 본 표는 **dry-run** 결과. apply 는 사용자 canonical 결정 후 별도 트랙.');
out.push('- delete count = 0 인 locale 은 detector 가 collision 미발견 (또는 CSV 가 header-only).');
out.push('- estimated Δ ≠ 0 인 항목은 patch03 case 3 (no same-path survivor, no shadow) 의 실손실 추정.');
out.push('');

process.stdout.write(out.join('\n') + '\n');
