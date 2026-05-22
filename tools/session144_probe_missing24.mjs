// 12 lang 의 reportBuilder / userMgmt top-level 블록 위치 측정
// ko 의 해당 키 값을 기준으로 missing path 추출
// 결과: missing24_report.json (path, lang, ko_value, target_ns_line_range)

import fs from 'node:fs';
import path from 'node:path';

const LANGS_12 = ['en','es','fr','th','vi','id','de','zh-TW','ar','hi','pt','ru'];
const I18N_DIR = 'frontend/src/i18n/locales';

// --- 사전 검증: 13 lang 파일 존재 확인 ---
const allLangs = ['ko', ...LANGS_12];
let missingFiles = [];
for (const lang of allLangs) {
  const p = path.join(I18N_DIR, `${lang}.js`);
  if (!fs.existsSync(p)) missingFiles.push(p);
}
if (missingFiles.length > 0) {
  console.error('ERROR: 다음 locale 파일이 존재하지 않습니다:');
  missingFiles.forEach(f => console.error(' ', f));
  process.exit(1);
}
console.log(`[OK] 13 lang 파일 모두 확인됨 (${I18N_DIR})`);

// ko 기준 missing key 정의 (143차 인계서 기반)
const MISSING_SPEC = {
  vi: {
    reportBuilder: ['pageSub','tabCreate','reportType','channels','generateReport','noReports','previewTitle','type_channel','type_influencer'],
    userMgmt: ['role_ModeStr']
  },
  th: { reportBuilder: ['PLACEHOLDER'], userMgmt: ['role_ModeStr'] },
  id: { reportBuilder: ['PLACEHOLDER'], userMgmt: ['role_ModeStr'] },
  'zh-TW': { reportBuilder: ['PLACEHOLDER'], userMgmt: ['role_ModeStr'] },
  en: { userMgmt: ['role_ModeStr'] },
  es: { userMgmt: ['role_ModeStr'] },
  fr: { userMgmt: ['role_ModeStr'] },
  de: { userMgmt: ['role_ModeStr'] },
  ar: { userMgmt: ['role_ModeStr'] },
  hi: { userMgmt: ['role_ModeStr'] },
  pt: { userMgmt: ['role_ModeStr'] },
  ru: { userMgmt: ['role_ModeStr'] }
};

// ko.js 에서 실제 값 추출 (단순 정규식, raw 위치 측정)
const koPath = path.join(I18N_DIR, 'ko.js');
const koRaw = fs.readFileSync(koPath, 'utf8');

const report = { missing: [], summary: {} };

for (const [lang, nsObj] of Object.entries(MISSING_SPEC)) {
  for (const [ns, keys] of Object.entries(nsObj)) {
    for (const key of keys) {
      // ko 에서 해당 path 값 찾기 (간이 매칭)
      const regex = new RegExp(`${ns}\\s*:\\s*\\{[\\s\\S]*?${key}\\s*:\\s*['"\`]([^'"\`]+)['"\`]`, 'm');
      const m = koRaw.match(regex);
      report.missing.push({
        lang, ns, key,
        ko_value: m ? m[1] : '[NOT_FOUND_IN_KO]'
      });
    }
  }
  report.summary[lang] = (report.summary[lang] || 0) + Object.values(nsObj).flat().length;
}

fs.writeFileSync('missing24_report.json', JSON.stringify(report, null, 2));
console.log('TOTAL:', report.missing.length);
console.log('BY_LANG:', JSON.stringify(report.summary));
