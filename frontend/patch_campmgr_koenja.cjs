const fs = require('fs');
const path = require('path');
const dir = './frontend/src/i18n/locales';

const patches = {
  ko: { abPlaceholder: '예: 여름 캠페인 A/B 비교', abSelectNone: '-- 선택 --', abMetricLabel: '비교 지표', abMetricCtr: 'CTR (클릭률)', abMetricCvr: 'CVR (전환율)', abBaselineLabel: '🅰️ 기준안 (A)', abVariantLabel: '🅱️ 변형안 (B)' },
  en: { abPlaceholder: 'e.g. Summer Campaign A/B Comparison', abSelectNone: '-- Select --', abMetricLabel: 'Comparison Metric', abMetricCtr: 'CTR (Click-Through Rate)', abMetricCvr: 'CVR (Conversion Rate)', abBaselineLabel: '🅰️ Baseline (A)', abVariantLabel: '🅱️ Variant (B)' },
  ja: { abPlaceholder: '例: 夏キャンペーンA/B比較', abSelectNone: '-- 選択 --', abMetricLabel: '比較指標', abMetricCtr: 'CTR (クリック率)', abMetricCvr: 'CVR (コンバージョン率)', abBaselineLabel: '🅰️ 基準案 (A)', abVariantLabel: '🅱️ 変形案 (B)' }
};

for (const [lang, keys] of Object.entries(patches)) {
  const fp = path.join(dir, lang + '.js');
  let c = fs.readFileSync(fp, 'utf8');
  const cm = c.indexOf('"campMgr"');
  if (cm < 0) { console.log(lang + ': no campMgr found'); continue; }
  const braceStart = c.indexOf('{', cm + 9);
  if (braceStart < 0) continue;
  const insert = Object.entries(keys).map(([k, v]) => '"' + k + '":' + JSON.stringify(v)).join(',');
  c = c.slice(0, braceStart + 1) + insert + ',' + c.slice(braceStart + 1);
  fs.writeFileSync(fp, c, 'utf8');
  console.log('✅ ' + lang + '.js: ' + Object.keys(keys).length + ' new keys added to campMgr');
}
