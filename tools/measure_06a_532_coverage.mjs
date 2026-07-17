#!/usr/bin/env node
/**
 * EPIC 06-A Part 4-5-3-1-5-3-2 — 커버리지 측정기 (289차 9회차)
 *
 * ★설계 원칙 (289차 ② stale 351 교훈)
 *   값을 문서에 손으로 박지 마라. 값은 "측정"하고 문서는 측정기를 가리켜라.
 *   정정값조차 stale 이 된다 → 커버리지 숫자는 이 스크립트가 유일 산출자다.
 *
 * ★역산 금지 (289차 ⑤ 분모 원장 교훈)
 *   분모 = 스펙 원문 항목명(SPEC_..._VERBATIM.md §75 나열 문서의 "## 1. 원문 전사" 표).
 *   분자 = VALIDATED_LEGACY 만. LEGACY_ADAPTER·KEEP_SEPARATE_WITH_REASON 은 커버가 아니다.
 *   (인접 자산이 있다 ≠ 요구를 충족한다. 이를 커버로 세면 갭이 정의상 소멸한다.)
 *
 * 사용: node tools/measure_06a_532_coverage.mjs [--json]
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const DIR = 'docs/segmentation';
const PREFIX = 'DSAR_APPROVAL_WORKFLOW_';

// 커버 판정 = 이것만. 나머지는 전부 미충족.
const COVERS = new Set(['VALIDATED_LEGACY']);
// 정식 판정 어휘 (이 외 토큰은 파싱 노이즈로 계수 제외 후 보고)
const VOCAB = [
  'VALIDATED_LEGACY', 'LEGACY_ADAPTER', 'KEEP_SEPARATE_WITH_REASON',
  'NOT_APPLICABLE', 'CONTRACT_ONLY', 'VACUOUS', 'CONSOLIDATION_REQUIRED',
  'MIGRATION_REQUIRED', 'DEPRECATION_CANDIDATE', 'UNVERIFIED',
  'BLOCKED_CROSS_TENANT', 'BLOCKED_WORKFLOW_BYPASS', 'BLOCKED_MIGRATION_RISK',
  'BLOCKED_SECURITY_RISK', 'BLOCKED_POLICY_DRIFT',
];

const files = readdirSync(DIR).filter(f => f.startsWith(PREFIX) && f.endsWith('.md')).sort();

const rows = [];
const anomalies = [];

for (const f of files) {
  const text = readFileSync(join(DIR, f), 'utf8');
  const lines = text.split(/\r?\n/);

  // "## 1. 원문 전사" 절만 대상 — §0 현행 실측표·§2 규칙·★정정절은 분모가 아니다.
  let start = lines.findIndex(l => /^##\s*1\..*원문\s*전사/.test(l));
  let end = lines.length;
  if (start >= 0) {
    const after = lines.slice(start + 1).findIndex(l => /^##\s/.test(l));
    if (after >= 0) end = start + 1 + after;
  }

  if (start < 0) {
    anomalies.push({ file: f, kind: 'NO_SECTION1', note: '"## 1. 원문 전사" 절 없음 — 원문에 항목 축이 없어 표를 비운 문서일 수 있다(§35/§36/§55).' });
    rows.push({ file: f, total: 0, counts: {}, covered: 0, noise: 0 });
    continue;
  }

  const body = lines.slice(start, end);
  const counts = {};
  let total = 0, noise = 0;

  for (const l of body) {
    // 번호로 시작하는 표 행만 = 원문 항목 1건
    if (!/^\|\s*\d+\s*\|/.test(l)) continue;
    const cells = l.split('|').map(c => c.trim());
    // 마지막 비어있지 않은 셀 = 판정 컬럼
    let judg = '';
    for (let i = cells.length - 1; i >= 0; i--) { if (cells[i]) { judg = cells[i]; break; } }
    const found = VOCAB.filter(v => judg.includes(v));
    total++;
    if (found.length === 0) { noise++; anomalies.push({ file: f, kind: 'NO_VOCAB', note: l.slice(0, 90) }); continue; }
    if (found.length > 1) anomalies.push({ file: f, kind: 'MULTI_VERDICT', note: `${found.join('+')} — ${l.slice(0, 70)}` });
    // 병기 시 가장 보수적으로: 커버가 아닌 쪽을 채택(커버 과대계상 방지)
    const pick = found.find(v => !COVERS.has(v)) ?? found[0];
    counts[pick] = (counts[pick] || 0) + 1;
  }

  const covered = Object.entries(counts).filter(([k]) => COVERS.has(k)).reduce((a, [, v]) => a + v, 0);
  rows.push({ file: f, total, counts, covered, noise });
}

const grand = rows.reduce((a, r) => a + r.total, 0);
const grandCovered = rows.reduce((a, r) => a + r.covered, 0);
const grandNoise = rows.reduce((a, r) => a + r.noise, 0);
const agg = {};
for (const r of rows) for (const [k, v] of Object.entries(r.counts)) agg[k] = (agg[k] || 0) + v;

if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ rows, grand, grandCovered, agg, anomalies }, null, 2));
  process.exit(0);
}

console.log('EPIC 06-A 4-5-3-1-5-3-2 — 커버리지 측정 (측정기 산출 · 손으로 박은 값 아님)');
console.log('='.repeat(78));
console.log(`산출 문서            : ${files.length} 편`);
console.log(`원문 항목(분모)      : ${grand}`);
console.log(`파싱 노이즈(미계수)  : ${grandNoise}`);
console.log('');
console.log('판정 분포:');
for (const [k, v] of Object.entries(agg).sort((a, b) => b[1] - a[1])) {
  const pct = (v / grand * 100).toFixed(1);
  console.log(`  ${k.padEnd(26)} ${String(v).padStart(5)}  ${pct.padStart(5)}%`);
}
console.log('');
console.log(`★커버리지 = VALIDATED_LEGACY / 원문항목 = ${grandCovered} / ${grand} = ${(grandCovered / grand * 100).toFixed(2)}%`);
console.log('  (LEGACY_ADAPTER·KEEP_SEPARATE_WITH_REASON 은 커버 아님 — 인접 자산 존재 ≠ 요구 충족)');
console.log('');
console.log(`이상 항목: ${anomalies.length} 건`);
for (const a of anomalies.slice(0, 12)) console.log(`  [${a.kind}] ${a.file}: ${a.note}`);
if (anomalies.length > 12) console.log(`  … 외 ${anomalies.length - 12} 건 (--json 으로 전수)`);
