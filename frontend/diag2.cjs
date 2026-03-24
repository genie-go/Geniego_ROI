const fs = require('fs');

// Check ja.js aiRec structure
const ja = fs.readFileSync('src/i18n/locales/ja.js', 'utf8');
const aIdx = ja.indexOf('aiRec:');
console.log('aiRec section in ja.js:');
console.log(ja.slice(aIdx, aIdx + 500));

// Check how deepGet works in i18n/index.js
const idx = fs.readFileSync('src/i18n/index.js', 'utf8');
const dgIdx = idx.indexOf('deepGet');
console.log('\ndeepGet implementation:');
console.log(idx.slice(dgIdx, dgIdx + 400));

// Fix: direct approach - in AIPredictionInner, add t() directly
const ai = fs.readFileSync('src/pages/AIPrediction.jsx', 'utf8');
const aiLines = ai.split('\n');
// Find line with "function AIPredictionInner"
let funcLine = -1;
aiLines.forEach((l, i) => { if (l.includes('function AIPredictionInner()')) funcLine = i; });
console.log('\nAIPredictionInner at line:', funcLine + 1);
if (funcLine >= 0) {
  console.log('Context:');
  console.log(aiLines.slice(funcLine, funcLine + 10).join('\n'));
}

// Find if const { t } already present
const tDefCount = (ai.match(/const \{ t \} = useI18n\(\)/g) || []).length;
console.log('\nconst { t } = useI18n() count in AIPrediction:', tDefCount);
