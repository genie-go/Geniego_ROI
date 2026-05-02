const fs = require('fs');
let content = fs.readFileSync('frontend/src/i18n/locales/ko.js', 'utf8');

const sIdx = content.indexOf('"crm": {');
const endIdx = content.indexOf('},', sIdx);

console.log(content.substring(sIdx, endIdx + 2));
