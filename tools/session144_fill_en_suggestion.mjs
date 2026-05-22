// en_suggestion 자동 채움
// en_existing_check.json → en_translation_workbook.json 갱신
// 출력: en_translation_workbook_filled.json

import fs from 'node:fs';

const CHECK_FILE    = 'en_existing_check.json';
const WORKBOOK_FILE = 'en_translation_workbook.json';
const OUT_FILE      = 'en_translation_workbook_filled.json';

// 히라가나 + 가타카나 + 한글
const POLLUTED = /[぀-ゟ゠-ヿ가-힯]/;

for (const f of [CHECK_FILE, WORKBOOK_FILE]) {
  if (!fs.existsSync(f)) { console.error(`ERROR: ${f} 없음`); process.exit(1); }
}

const checkData  = JSON.parse(fs.readFileSync(CHECK_FILE, 'utf8'));
const workbook   = JSON.parse(fs.readFileSync(WORKBOOK_FILE, 'utf8'));

// check 데이터를 path → entry 로 인덱싱
const checkMap = new Map(checkData.map(e => [e.path, e]));

let cntExact = 0, cntSimilar = 0, cntNone = 0, cntSkip = 0;

const filled = workbook.map(entry => {
  const { path, ko_value } = entry;
  const check = checkMap.get(path);

  if (!check) {
    cntNone++;
    return { ...entry, en_suggestion: '', needs_review: true, _source: 'none' };
  }

  // 1) exact 매칭
  if (check.exact_en !== null && check.exact_en !== undefined) {
    const v = String(check.exact_en);
    if (!POLLUTED.test(v)) {
      cntExact++;
      return { ...entry, en_suggestion: v, needs_review: false, _source: 'exact' };
    } else {
      cntSkip++;
      // 오염된 exact → similar 시도로 계속
    }
  }

  // 2) similar 매칭 (오염 없는 첫 번째)
  const similars = check.similar_matches || [];
  for (const sim of similars) {
    const v = String(sim.value ?? '');
    if (v && !POLLUTED.test(v)) {
      cntSimilar++;
      return { ...entry, en_suggestion: v, needs_review: true, _source: `similar:${sim.path}` };
    }
  }

  // 3) 미채움
  if (similars.length > 0) cntSkip++; // similar 있었으나 전부 오염
  cntNone++;
  return { ...entry, en_suggestion: '', needs_review: true, _source: 'none' };
});

fs.writeFileSync(OUT_FILE, JSON.stringify(filled, null, 2));

// 콘솔 표
console.log(`${'path'.padEnd(42)} ${'ko_value'.padEnd(24)} ${'en_suggestion'.padEnd(36)} source`);
console.log('-'.repeat(120));
for (const r of filled) {
  const ko  = String(r.ko_value).slice(0, 22);
  const en_ = String(r.en_suggestion).slice(0, 34);
  const src = r._source;
  console.log(`${r.path.padEnd(42)} ${ko.padEnd(24)} ${en_.padEnd(36)} ${src}`);
}

console.log(`\n--- 통계 ---`);
console.log(`exact 자동 채움  : ${cntExact}건`);
console.log(`similar 자동 채움: ${cntSimilar}건`);
console.log(`미채움           : ${cntNone}건`);
console.log(`오염 skip        : ${cntSkip}건`);
console.log(`\n-> ${OUT_FILE} 저장 완료`);
