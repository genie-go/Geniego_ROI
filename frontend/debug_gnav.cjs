const s=require('fs').readFileSync('./src/i18n/locales/ko.js','utf8');
const gNavIdx=s.indexOf('"gNav"');
const chunk=s.substring(gNavIdx,gNavIdx+300);
console.log(chunk);
