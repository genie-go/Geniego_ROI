#!/usr/bin/env node
/**
 * EPIC 06-A — 블록 공용 커버리지 측정기 (289차 9회차)
 *
 * ★측정기를 블록마다 복제하지 마라(289차 ④ 규칙 SSOT 교훈)
 *   `tools/scan_secrets.sh` 를 CI 에 복사하면 규칙이 분기하듯,
 *   측정기를 5-3-2용·5-3-3-1용으로 복제하면 커버 판정 규칙이 분기한다.
 *   → 접두사만 파라미터로 받고 **판정 규칙은 한 벌만 유지**한다.
 *   (레포 기지 병증: 백오프 3공식 병존 · 타임존 축 3벌 · isDemo 술어 12벌 — 같은 실수 금지)
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
 * 사용:
 *   node tools/measure_06a_coverage.mjs --block=532      # 5-3-2 Approval Workflow
 *   node tools/measure_06a_coverage.mjs --block=5331     # 5-3-3-1 Organization Hierarchy
 *   node tools/measure_06a_coverage.mjs --prefix=<임의접두사>
 *   (+ --json 으로 전수 출력)
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const DIR = 'docs/segmentation';

// 블록 → 문서 접두사. 신규 블록은 여기에만 추가하라(측정기 복제 금지).
//
// ★prefix 는 **배열**이다 — 블록마다 접두사가 하나라고 가정하지 마라.
//   5-3-3-2 는 원문 §83 이 4계열로 명명했다(REPORTING_LINE / MANAGER / SUPERVISORY / 개별 타입).
//   접두사 하나만 재면 **분모가 조용히 줄어든다** = 이 측정기가 막으려는 병 그 자체.
const BLOCKS = {
  '532':  {
    prefix: ['DSAR_APPROVAL_WORKFLOW_'],
    label: '4-5-3-1-5-3-2 Approval Workflow Execution Engine',
  },
  '5331': {
    prefix: ['DSAR_ORGANIZATION_'],
    label: '4-5-3-1-5-3-3-1 Organization Hierarchy & Graph',
  },
  '5332': {
    // ★원문 §83(85항목) 기준. DSAR_ORGANIZATION_MANAGER_BINDING 은 5-3-3-2 소속이나
    //   5-3-3-1 의 DSAR_ORGANIZATION_ 접두와 충돌하므로 exact 로 지정한다(중복 계수 방지).
    prefix: ['DSAR_REPORTING_LINE_', 'DSAR_MANAGER_', 'DSAR_SUPERVISORY_',
             'DSAR_ACTING_MANAGER', 'DSAR_ADMINISTRATIVE_MANAGER', 'DSAR_FUNCTIONAL_MANAGER',
             'DSAR_DIRECT_MANAGER', 'DSAR_DOTTED_LINE_MANAGER', 'DSAR_INTERIM_MANAGER',
             'DSAR_TEMPORARY_MANAGER', 'DSAR_CO_MANAGER', 'DSAR_SUBJECT_MANAGER_BINDING',
             'DSAR_POSITION_MANAGER_BINDING', 'DSAR_PROJECT_MANAGER_RELATIONSHIP',
             'DSAR_PROGRAM_MANAGER_RELATIONSHIP', 'DSAR_REGIONAL_MANAGER_RELATIONSHIP',
             'DSAR_COUNTRY_MANAGER_RELATIONSHIP', 'DSAR_BRAND_MANAGER_RELATIONSHIP',
             'DSAR_COST_CENTER_MANAGER_RELATIONSHIP', 'DSAR_PROFIT_CENTER_MANAGER_RELATIONSHIP',
             'DSAR_MISSING_MANAGER_POLICY', 'DSAR_PARENT_ORGANIZATION_MANAGER_FALLBACK',
             'DSAR_HISTORICAL_MANAGER_RECONSTRUCTION'],
    exact: ['DSAR_ORGANIZATION_MANAGER_BINDING.md'],
    label: '4-5-3-1-5-3-3-2 Reporting Line & Manager Relationship',
  },
};

const argOf = (name) => {
  const hit = process.argv.find(a => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : null;
};
const blockArg = argOf('block');
const prefixArg = argOf('prefix');
if (!blockArg && !prefixArg) {
  console.error('오류: --block=<532|5331> 또는 --prefix=<접두사> 필요.');
  console.error('  블록을 추정하지 않는다 — 분모를 조용히 바꾸는 것이 이 측정기가 막으려는 병이다.');
  process.exit(2);
}
if (blockArg && !BLOCKS[blockArg]) {
  console.error(`오류: 미등록 블록 "${blockArg}". 등록된 블록 = ${Object.keys(BLOCKS).join(', ')}`);
  process.exit(2);
}
const PREFIXES = prefixArg ? [prefixArg] : BLOCKS[blockArg].prefix;
const EXACT = blockArg ? (BLOCKS[blockArg].exact ?? []) : [];
const LABEL = blockArg ? BLOCKS[blockArg].label : `(임의 접두사 ${prefixArg})`;
const PREFIX = PREFIXES.join(' | ') + (EXACT.length ? ` + exact ${EXACT.length}` : '');
// ★5-3-3-1(DSAR_ORGANIZATION_)과 5-3-3-2(DSAR_ORGANIZATION_MANAGER_BINDING)의 접두 충돌 차단.
//   블록 5331 은 5-3-3-2 소속 파일을 제 분모에 넣으면 안 된다.
const EXCLUDE = blockArg === '5331' ? ['DSAR_ORGANIZATION_MANAGER_BINDING.md'] : [];
const matches = (f) =>
  !EXCLUDE.includes(f) && (EXACT.includes(f) || PREFIXES.some(p => f.startsWith(p)));

// 커버 판정 = 이것만. 나머지는 전부 미충족.
const COVERS = new Set(['VALIDATED_LEGACY']);
// 정식 판정 어휘 (이 외 토큰은 파싱 노이즈로 계수 제외 후 보고)
//
// ★어휘는 블록 공용이다 — 블록별로 분기시키지 마라.
//   초판은 5-3-2 어휘만 담아 5-3-3-1 의 ABSENT/PARTIAL/KV_ONLY/NAME_ONLY 456행을
//   전부 NO_VOCAB(노이즈)로 오분류했다. 접두사만 파라미터화하고 어휘를 그대로 둔 것이
//   바로 이 파일이 막으려던 "규칙 분기"였다(289차 9회차 자기결함).
//   신규 어휘는 여기에만 추가하고, 커버 여부는 COVERS 가 단독 결정한다.
const VOCAB = [
  // 커버
  'VALIDATED_LEGACY',
  // 인접/분리 (커버 아님)
  'LEGACY_ADAPTER', 'KEEP_SEPARATE_WITH_REASON',
  // 부분/저급 실재 (커버 아님)
  'PARTIAL', 'KV_ONLY', 'NAME_ONLY',
  // 부재/계약 (커버 아님)
  'NOT_APPLICABLE', 'ABSENT', 'CONTRACT_ONLY', 'VACUOUS',
  // 조치 요구 (커버 아님)
  'CONSOLIDATION_REQUIRED', 'MIGRATION_REQUIRED', 'DEPRECATION_CANDIDATE', 'UNVERIFIED',
  // 차단 (커버 아님)
  'BLOCKED_CROSS_TENANT', 'BLOCKED_WORKFLOW_BYPASS', 'BLOCKED_MIGRATION_RISK',
  'BLOCKED_SECURITY_RISK', 'BLOCKED_POLICY_DRIFT',
];

const files = readdirSync(DIR).filter(f => f.endsWith('.md') && matches(f)).sort();

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

console.log(`EPIC 06-A ${LABEL} — 커버리지 측정 (측정기 산출 · 손으로 박은 값 아님)`);
console.log('='.repeat(78));
console.log(`문서 접두사          : ${PREFIX}`);
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
