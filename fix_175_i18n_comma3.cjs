// 175차 S2 — marker 직전 줄 끝에 comma 보장 (} 또는 string value 둘 다 처리)
const fs = require('fs');
const path = require('path');
const LOCALES_DIR = path.join(__dirname, 'frontend/src/i18n/locales');
const LANGS = ['ko', 'en', 'ja', 'zh', 'zh-TW', 'de', 'th', 'vi', 'id', 'ar', 'es', 'fr', 'pt', 'ru', 'hi'];

for (const lang of LANGS) {
  const fname = lang === 'zh-TW' ? 'zh-TW.js' : `${lang}.js`;
  const fpath = path.join(LOCALES_DIR, fname);
  if (!fs.existsSync(fpath)) continue;
  let txt = fs.readFileSync(fpath, 'utf-8');
  const before = txt.length;

  // marker 위치 찾기
  const m = txt.match(/\n\s*\/\/ \[175차 S2\] missing namespaces/);
  if (!m) { console.log(`· ${lang}: marker 없음`); continue; }
  const markerIdx = m.index;

  // marker 이전 비-공백 마지막 문자 찾기
  let i = markerIdx;
  while (i > 0 && /\s/.test(txt[i - 1])) i--;
  // i 는 첫 비-공백 위치 + 1 (즉 마지막 비-공백의 다음 위치)
  // 그 전 문자가 콤마/괄호 인지 확인
  const lastChar = txt[i - 1];
  if (lastChar === ',' || lastChar === '{') {
    console.log(`· ${lang}: 이미 정상 (${lastChar})`);
    continue;
  }

  // 콤마 삽입
  txt = txt.slice(0, i) + ',' + txt.slice(i);
  fs.writeFileSync(fpath, txt, 'utf-8');
  console.log(`✅ ${lang}: 콤마 추가 (lastChar='${lastChar}', +${txt.length - before} bytes)`);
}
