const fs = require('fs');
const dict = JSON.parse(fs.readFileSync('tmp_dict_api_keys.json', 'utf8'));

const koCode = fs.readFileSync('frontend/src/i18n/locales/ko.js', 'utf8');

const insertIndex = koCode.indexOf('auto: {');
let injected = koCode.slice(0, insertIndex) + 'apiKeys: ' + JSON.stringify(dict.apiKeys, null, 4) + ',\n    ' + koCode.slice(insertIndex);

fs.writeFileSync('frontend/src/i18n/locales/ko.js', injected, 'utf8');

const enCode = fs.readFileSync('frontend/src/i18n/locales/en.js', 'utf8');
const enInsertIndex = enCode.indexOf('auto: {');
let injectedEn = enCode.slice(0, enInsertIndex) + 'apiKeys: ' + JSON.stringify(dict.apiKeys, null, 4) + ',\n    ' + enCode.slice(enInsertIndex);
fs.writeFileSync('frontend/src/i18n/locales/en.js', injectedEn, 'utf8');

console.log('Injected translations into ko.js and en.js');
