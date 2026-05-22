// ko_value → en_suggestion 번역 워크북 생성
// ns_missing_reportBuilder.json + ns_missing_userMgmt.json 통합
// 출력: en_translation_workbook.json

import fs from 'node:fs';

const SOURCES = [
  'ns_missing_reportBuilder.json',
  'ns_missing_userMgmt.json',
];

// unique path → ko_value 수집
const pathMap = new Map(); // path -> ko_value

for (const src of SOURCES) {
  if (!fs.existsSync(src)) {
    console.error(`ERROR: ${src} 없음. 먼저 extract 도구를 실행하세요.`);
    process.exit(1);
  }
  const data = JSON.parse(fs.readFileSync(src, 'utf8'));
  for (const entries of Object.values(data.langs)) {
    for (const { path, ko_value } of entries) {
      if (!pathMap.has(path)) pathMap.set(path, ko_value);
    }
  }
}

const workbook = [...pathMap.entries()]
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([path, ko_value]) => ({
    path,
    ko_value,
    en_suggestion: '',
    needs_review: true,
  }));

fs.writeFileSync('en_translation_workbook.json', JSON.stringify(workbook, null, 2));

// 콘솔 표 출력
console.log(`총 unique path: ${workbook.length}개\n`);
console.log(`${'path'.padEnd(52)} ko_value`);
console.log('-'.repeat(110));
for (const { path, ko_value } of workbook) {
  const val = String(ko_value).replace(/\n/g, ' ').slice(0, 55);
  console.log(`${path.padEnd(52)} ${val}`);
}

console.log(`\n-> en_translation_workbook.json 저장 완료 (${workbook.length}건)`);
console.log('en_suggestion 컬럼을 채운 뒤 apply 도구에 사용하세요.');
