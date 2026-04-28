const fs = require('fs');
let ja = fs.readFileSync('frontend/src/i18n/locales/ja.js', 'utf8');
ja = ja.replace(/\}\r?\n\s*attrData:/g, '},\n  attrData:');
fs.writeFileSync('frontend/src/i18n/locales/ja.js', ja, 'utf8');

let ko = fs.readFileSync('frontend/src/i18n/locales/ko.js', 'utf8');
ko = ko.replace(/\}\r?\n\s*attrData:/g, '},\n  attrData:');
fs.writeFileSync('frontend/src/i18n/locales/ko.js', ko, 'utf8');
