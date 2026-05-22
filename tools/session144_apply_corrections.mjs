// corrections.json 의 수동 검수값을 en_translation_workbook_filled.json 에 반영
// 출력: en_translation_workbook_final.json (신규 파일, 덮어쓰기 없음)
// 사용법: node tools/session144_apply_corrections.mjs [--dry|--apply]

import fs from 'node:fs';

const MODE        = process.argv.includes('--apply') ? 'apply' : 'dry';
const INPUT_FILE  = 'en_translation_workbook_filled.json';
const CORR_FILE   = 'corrections.json';
const OUT_FILE    = 'en_translation_workbook_final.json';

for (const f of [INPUT_FILE, CORR_FILE]) {
  if (!fs.existsSync(f)) { console.error(`ERROR: ${f} 없음`); process.exit(1); }
}
if (MODE === 'apply' && fs.existsSync(OUT_FILE)) {
  console.error(`ERROR: ${OUT_FILE} 이미 존재. 덮어쓰기 방지. 삭제 후 재실행.`);
  process.exit(1);
}

const workbook    = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf8'));
const { corrections } = JSON.parse(fs.readFileSync(CORR_FILE, 'utf8'));

// path → correction 인덱스
const corrMap = new Map(corrections.map(c => [c.path, c]));

console.log(`MODE: ${MODE}`);
console.log(`입력: ${INPUT_FILE} (${workbook.length}건)`);
console.log(`보정: ${CORR_FILE} (${corrections.length}건)\n`);

// 표 헤더
console.log(`${'path'.padEnd(42)} ${'before'.padEnd(36)} ${'after'.padEnd(36)} reason`);
console.log('-'.repeat(130));

let cntApplied = 0, cntNotFound = 0;

const result = workbook.map(entry => {
  const corr = corrMap.get(entry.path);
  if (!corr) return entry;

  const before = String(entry.en_suggestion).slice(0, 34);
  const after  = String(corr.en).slice(0, 34);
  console.log(`${entry.path.padEnd(42)} ${before.padEnd(36)} ${after.padEnd(36)} ${corr.reason}`);
  cntApplied++;

  return { ...entry, en_suggestion: corr.en, needs_review: false, _source: `corrected` };
});

// corrections 에 있으나 workbook 에 없는 path 경고
for (const c of corrections) {
  if (!workbook.find(e => e.path === c.path)) {
    console.warn(`[WARN] corrections path 미발견: ${c.path}`);
    cntNotFound++;
  }
}

console.log(`\n--- 결과 ---`);
console.log(`적용: ${cntApplied}건 / corrections ${corrections.length}건`);
if (cntNotFound > 0) console.warn(`미발견: ${cntNotFound}건`);

if (MODE === 'apply') {
  fs.writeFileSync(OUT_FILE, JSON.stringify(result, null, 2));
  console.log(`\n-> ${OUT_FILE} 저장 완료`);
} else {
  console.log(`\n※ --apply 플래그로 실행하면 ${OUT_FILE} 생성됩니다.`);
}
