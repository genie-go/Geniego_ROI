const fs = require('fs');

// Check AIPrediction for remaining t() calls and hooks
const ai = fs.readFileSync('src/pages/AIPrediction.jsx', 'utf8');

// All t() occurrences and line numbers
const lines = ai.split('\n');
const tLines = [];
lines.forEach((line, i) => {
  if (line.includes('t(\'') || line.includes('t("')) {
    tLines.push({ ln: i+1, text: line.trim().slice(0, 80) });
  }
});
console.log('=== t() calls in AIPrediction.jsx ===');
tLines.forEach(l => console.log(`L${l.ln}: ${l.text}`));

// Check useI18n usage
const uiLines = [];
lines.forEach((line, i) => {
  if (line.includes('useI18n')) {
    uiLines.push({ ln: i+1, text: line.trim() });
  }
});
console.log('\n=== useI18n usage ===');
uiLines.forEach(l => console.log(`L${l.ln}: ${l.text}`));

// Check AIRecommendTab - why t() shows raw keys
const rec = fs.readFileSync('src/pages/AIRecommendTab.jsx', 'utf8');
const recLines = rec.split('\n');
console.log('\n=== AIRecommendTab t() calls ===');
recLines.forEach((line, i) => {
  if (line.includes("t('aiRec") || line.includes('t("aiRec')) {
    console.log(`L${i+1}: ${line.trim().slice(0,80)}`);
  }
});

// Check locale file for aiRec key
const ja = fs.readFileSync('src/i18n/locales/ja.js', 'utf8');
console.log('\n=== ja.js has aiRec:', ja.includes('aiRec'));
console.log('=== ja.js has salesInfo:', ja.includes('salesInfo'));
console.log('=== ja.js nested (aiRec.salesInfo flat):', ja.includes("'salesInfo'"));

// Check how i18n looks up keys
const idx = fs.readFileSync('src/i18n/index.js', 'utf8');
console.log('\n=== i18n index.js t() implementation snippet:');
const tIdx = idx.indexOf('const t =') || idx.indexOf('function t(');
const getFn = idx.indexOf('get(') || idx.indexOf('.get(');
console.log(idx.slice(Math.max(0, tIdx > 0 ? tIdx : getFn), (tIdx > 0 ? tIdx : getFn) + 300));
