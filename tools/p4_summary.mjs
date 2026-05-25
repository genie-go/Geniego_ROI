#!/usr/bin/env node
/**
 * tools/p4_summary.mjs
 *
 * Session 159 P4 — verdict CSV + dry-run plan JSON → SUMMARY.md.
 *
 * Usage:  node tools/p4_summary.mjs <out-dir>
 * Output: SUMMARY.md content on stdout
 *
 * Spec: docs/spec/session159_p4_dead_subtree_ko_dryrun.md §2.5 + §6
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const dir = process.argv[2];
if (!dir) { process.stderr.write('usage: node tools/p4_summary.mjs <out-dir>\n'); process.exit(2); }

const verdictsPath = join(dir, 'ko_all_verdicts.csv');
const planPath     = join(dir, 'ko_plan.json');

if (!existsSync(verdictsPath)) { process.stderr.write(`missing: ${verdictsPath}\n`); process.exit(2); }
if (!existsSync(planPath))     { process.stderr.write(`missing: ${planPath}\n`); process.exit(2); }

// ── Parse verdict CSV ───────────────────────────────────────────
function parseCsvLine(line) {
  const out = []; let cur = ''; let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQ) {
      if (c === '"' && line[i+1] === '"') { cur += '"'; i++; }
      else if (c === '"') inQ = false;
      else cur += c;
    } else {
      if (c === '"') inQ = true;
      else if (c === ',') { out.push(cur); cur = ''; }
      else cur += c;
    }
  }
  out.push(cur);
  return out;
}

const vTxt = readFileSync(verdictsPath, 'utf-8');
const vLines = vTxt.split(/\r?\n/).filter(l => l.length > 0);
const vHeader = parseCsvLine(vLines[0]);
const vRows = vLines.slice(1).map(l => {
  const f = parseCsvLine(l);
  const r = {}; vHeader.forEach((k, i) => { r[k] = f[i] ?? ''; });
  return r;
});

// ── Parse plan JSON ─────────────────────────────────────────────
const plan = JSON.parse(readFileSync(planPath, 'utf-8'));

// ── Counts ──────────────────────────────────────────────────────
const totalRoots = vRows.length;
const byStatus = {};
const byVerdict = {};
for (const r of vRows) {
  byStatus[r.status] = (byStatus[r.status] || 0) + 1;
  byVerdict[r.verdict] = (byVerdict[r.verdict] || 0) + 1;
}
const safeToDelete = byVerdict['safe_to_delete'] || 0;
const doNotDelete  = byVerdict['do_not_delete'] || 0;
const reviewResolver = byVerdict['review_resolver'] || 0;

const decisions = plan.decisions || [];
const deleteCount = decisions.filter(d => d.action === 'delete').length;
const skipCount = decisions.filter(d => d.action === 'skip').length;

// Skip 분해
const skipBreakdown = { direct: 0, prefix: 0, dynamic: 0, ast_drift: 0, verdict: 0, consumers: 0, conservative: 0, other: 0 };
for (const d of decisions.filter(x => x.action === 'skip')) {
  const r = String(d.rationale || '');
  if (r.includes('direct consumer'))         skipBreakdown.direct++;
  else if (r.includes('prefix consumer'))    skipBreakdown.prefix++;
  else if (r.includes('dynamic suspect'))    skipBreakdown.dynamic++;
  else if (r.includes('not in current AST')) skipBreakdown.ast_drift++;
  else if (r.includes('not dead'))           skipBreakdown.verdict++;
  else if (r.includes('consumers'))          skipBreakdown.consumers++;
  else if (r.includes('conservative skip'))  skipBreakdown.conservative++;
  else                                       skipBreakdown.other++;
}

const estDelta = plan.summary?.estimated_leaf_delta ?? 0;

// ── Risk signals (§6) ───────────────────────────────────────────
const risks = [];
if (deleteCount === 0) risks.push(`delete 후보가 **0** — manifest 가 과보호 (또는 detector 가 모두 do_not_delete). manifest precision 재검토 가능.`);
if (deleteCount > 100) risks.push(`delete 후보가 **${deleteCount}** (>100) — 사용자 review 부담 ↑, 분할 apply 권장.`);
const largeBlocks = decisions.filter(d => d.action === 'delete' && (d.target?.leaf_count ?? 0) > 50);
if (largeBlocks.length > 0) {
  risks.push(`subtree_leaf_count >50 인 delete 후보 ${largeBlocks.length}건 — 대규모 삭제, 별도 검수 권장.`);
}

// ── Top 10 delete candidates ────────────────────────────────────
const topDeletes = decisions
  .filter(d => d.action === 'delete')
  .sort((a, b) => (b.target?.leaf_count ?? 0) - (a.target?.leaf_count ?? 0))
  .slice(0, 10);

// ── Markdown ────────────────────────────────────────────────────
const out = [];
out.push('# Session 159 — P4 ko dead-subtree dry-run SUMMARY');
out.push('');
out.push(`Generated: ${new Date().toISOString()}`);
out.push(`Locale: **ko**, Manifest: \`tools/resolver_consumer_manifest.json\``);
out.push('');

if (risks.length > 0) {
  out.push('## ⚠️ 위험 신호 (spec §6 트리거)');
  out.push('');
  for (const r of risks) out.push(`- ${r}`);
  out.push('');
}

out.push('## 집계');
out.push('');
out.push('| 항목 | 값 |');
out.push('|---|---:|');
out.push(`| ko top-level roots 검사 | ${totalRoots} |`);
out.push(`| verdict=safe_to_delete | ${safeToDelete} |`);
out.push(`| verdict=do_not_delete | ${doNotDelete} |`);
out.push(`| verdict=review_resolver | ${reviewResolver} |`);
out.push(`| dry-run plan delete | **${deleteCount}** |`);
out.push(`| dry-run plan skip | ${skipCount} |`);
out.push(`| ┃ skip — direct consumer | ${skipBreakdown.direct} |`);
out.push(`| ┃ skip — prefix consumer | ${skipBreakdown.prefix} |`);
out.push(`| ┃ skip — dynamic suspect | ${skipBreakdown.dynamic} |`);
out.push(`| ┃ skip — AST drift | ${skipBreakdown.ast_drift} |`);
out.push(`| ┃ skip — verdict not dead | ${skipBreakdown.verdict} |`);
out.push(`| ┃ skip — has consumers | ${skipBreakdown.consumers} |`);
out.push(`| ┃ skip — conservative (manifest unavailable) | ${skipBreakdown.conservative} |`);
out.push(`| ┃ skip — other | ${skipBreakdown.other} |`);
out.push(`| total estimated leaf Δ | ${estDelta} |`);
out.push('');

out.push('## Status 분포');
out.push('');
out.push('| status | count |');
out.push('|---|---:|');
for (const [s, c] of Object.entries(byStatus).sort()) out.push(`| ${s} | ${c} |`);
out.push('');

out.push('## Top delete candidates (subtree_leaf_count desc, max 10)');
out.push('');
if (topDeletes.length === 0) {
  out.push('_(no delete candidates)_');
} else {
  out.push('| # | root_path | leaf_count | rationale |');
  out.push('|---:|---|---:|---|');
  topDeletes.forEach((d, i) =>
    out.push(`| ${i+1} | \`${d.key_path}\` | ${d.target?.leaf_count ?? 0} | ${d.rationale} |`)
  );
}
out.push('');

out.push('## 검수자 노트');
out.push('');
out.push('- 본 표는 **dry-run** 결과. 실 apply 는 사용자 review 후 별도 트랙.');
out.push('- delete 후보는 detector + manifest 4-step 통과 (AST drift 없음, verdict=safe_to_delete, 0 consumers, manifest direct/prefix/dynamic 미차단).');
out.push('- manifest 차단 = false-positive 보호 작동 (resolver 가 실제 사용 중인 path 를 dead 로 잘못 판정한 경우).');
out.push('- 진행 권장 시 우선순위: subtree_leaf_count 작은 것 → 큰 것 (저위험 → 고위험).');
out.push('');

process.stdout.write(out.join('\n') + '\n');
