const fs = require('fs');
let ja = fs.readFileSync('frontend/src/i18n/locales/ja.js', 'utf8');
ja = ja.replace(/\n\}\n\s*attrData/g, '\n},\n  attrData');
fs.writeFileSync('frontend/src/i18n/locales/ja.js', ja, 'utf8');

let ko = fs.readFileSync('frontend/src/i18n/locales/ko.js', 'utf8');
ko = ko.replace(/\},\), \.\.\.{"tabDashboard":"시각화 대시보드"[\s\S]*?\}\s*\}, \.\.\.{"pageTitle":"어카운트\(팀\).*?\}\s*\}/g, '}');
// also fix missing comma before attrData in ko if it exists
ko = ko.replace(/\n\}\n\s*attrData/g, '\n},\n  attrData');
fs.writeFileSync('frontend/src/i18n/locales/ko.js', ko, 'utf8');
