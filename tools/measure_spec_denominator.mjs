#!/usr/bin/env node
/**
 * EPIC 06-A — 스펙 원문 분모 측정기 (289차 9회차)
 *
 * ★왜 이 도구가 존재하는가 — PM(나)의 수기 계수가 반복해서 틀렸다
 *   5-3-3-1: 분모 **과소** 3건 (§28 15→16 · §43 13→14 · §32 15→17)
 *            — 전부 "목록 끝 항목 누락" = 5-3-1 이 발견한 `evidence` 누락 편향의 재현
 *   5-3-3-2: 분모 **과대** 1건 (§3.4 45→42) + **줄번호 오류 3건**
 *            (§3.2 "293~312"→실제 232~252 · §3.4 "322~372"→실제 268~318)
 *   → 방향조차 일정하지 않다 = **수기 계수는 신뢰성 자체가 없다.**
 *
 * ★5-3-1 의 최상위 교훈: **개수는 분모가 아니다.**
 *   이 도구는 **개수만** 센다. 항목명 정합은 보증하지 않는다 —
 *   그것은 ⓒ 전사자가 원문을 직접 Read 해 대조해야 한다(`REQUIREMENT_TYPE` 20/20 인데
 *   축 자체가 날조였던 사례). 이 도구의 용도는 **"몇 개인지 조용히 틀리는 것"을 막는 것뿐**이다.
 *
 * ★계수 규칙 (두 형식 모두 — 놓치면 그게 분모 과소다)
 *   - `* item`   불릿 목록
 *   - `1. item`  번호 목록 (§35 Priority · §46 Conflict Resolution 등이 이 형식이며,
 *                불릿만 세면 **0 으로 나온다** — 실제 자기결함이었다)
 *
 * 사용:
 *   node tools/measure_spec_denominator.mjs <spec.md>            # 전 섹션
 *   node tools/measure_spec_denominator.mjs <spec.md> --sec=11   # 특정 섹션
 *   node tools/measure_spec_denominator.mjs <spec.md> --json
 */
import { readFileSync } from 'node:fs';

const path = process.argv[2];
if (!path || path.startsWith('--')) {
  console.error('사용: node tools/measure_spec_denominator.mjs <spec.md> [--sec=N] [--json]');
  console.error('  스펙 경로를 추정하지 않는다 — 분모를 조용히 바꾸는 것이 이 도구가 막으려는 병이다.');
  process.exit(2);
}
const argOf = (n) => { const h = process.argv.find(a => a.startsWith(`--${n}=`)); return h ? h.slice(n.length + 3) : null; };
const secArg = argOf('sec');

const lines = readFileSync(path, 'utf8').split(/\r?\n/);

// 섹션 = `# N. 제목` (H1 번호절) · 하위절 = `## N.M 제목`
const secs = [];
let cur = null;
lines.forEach((l, i) => {
  const h1 = l.match(/^# (\d+)\.\s*(.*)$/);
  const h2 = l.match(/^## (\d+\.\d+)\s*(.*)$/);
  if (h1 || h2) {
    if (cur) cur.end = i;
    cur = { id: h1 ? h1[1] : h2[1], title: (h1 ? h1[2] : h2[2]).trim(), start: i + 1, bullet: 0, num: 0, sub: [] };
    secs.push(cur);
    return;
  }
  if (!cur) return;
  if (/^\* /.test(l)) cur.bullet++;
  else if (/^\d+\. /.test(l)) cur.num++;
});
if (cur) cur.end = lines.length;

const rows = secs.map(s => ({
  id: s.id, title: s.title,
  lines: `${s.start}-${s.end}`,
  bullet: s.bullet, num: s.num, total: s.bullet + s.num,
}));

const picked = secArg ? rows.filter(r => r.id === secArg || r.id.startsWith(secArg + '.')) : rows;

if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ path, sections: picked }, null, 2));
  process.exit(0);
}

console.log(`스펙 분모 측정 — ${path}`);
console.log('★개수만 센다. 항목명 정합은 보증하지 않는다(ⓒ 전사자가 원문 대조할 것).');
console.log('='.repeat(92));
console.log(`${'§'.padEnd(7)}${'제목'.padEnd(44)}${'줄범위'.padEnd(13)}${'불릿'.padStart(5)}${'번호'.padStart(5)}${'합계'.padStart(6)}`);
console.log('-'.repeat(92));
for (const r of picked) {
  const t = r.title.length > 42 ? r.title.slice(0, 41) + '…' : r.title;
  const flag = (r.bullet === 0 && r.num > 0) ? '  ← 번호목록(불릿만 세면 0)' : '';
  console.log(`${r.id.padEnd(7)}${t.padEnd(44)}${r.lines.padEnd(13)}${String(r.bullet).padStart(5)}${String(r.num).padStart(5)}${String(r.total).padStart(6)}${flag}`);
}
console.log('-'.repeat(92));
console.log(`섹션 ${picked.length} · 항목 합계 ${picked.reduce((a, r) => a + r.total, 0)}`);
