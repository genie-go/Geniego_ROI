const fs = require('fs');

// Check AIPrediction
const ai = fs.readFileSync('src/pages/AIPrediction.jsx', 'utf8');
const iIdx = ai.indexOf('useI18n');
console.log('useI18n import count:', (ai.match(/useI18n/g)||[]).length);
console.log('t = useI18n count:', (ai.match(/const \{ t \} = useI18n\(\)/g)||[]).length);
// Show around first t usage
const tIdx = ai.indexOf("const { t } = useI18n()");
if (tIdx >= 0) {
  console.log('Context around t():\n', ai.slice(tIdx-200, tIdx+100));
} else {
  console.log('t() NOT FOUND in AIPrediction!');
}

// Check CustomerDetailPanel
const cpIdx = ai.indexOf('function CustomerDetailPanel');
const cpEnd = ai.indexOf('function ', cpIdx + 10);
const cpBody = ai.slice(cpIdx, Math.min(cpEnd, cpIdx+500));
console.log('\nCustomerDetailPanel start:\n', cpBody);

// Check AIRecommendTab  
const rec = fs.readFileSync('src/pages/AIRecommendTab.jsx', 'utf8');
console.log('\nuseI18n in AIRecommendTab count:', (rec.match(/useI18n/g)||[]).length);
console.log('t = useI18n in AIRecommendTab count:', (rec.match(/const \{ t \} = useI18n\(\)/g)||[]).length);
const tIdx2 = rec.indexOf("const { t } = useI18n()");
if (tIdx2 >= 0) {
  console.log('Context:\n', rec.slice(tIdx2-100, tIdx2+100));
} else {
  console.log('t() NOT FOUND in AIRecommendTab!');
}
