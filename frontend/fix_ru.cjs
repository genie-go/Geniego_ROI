const fs=require('fs');
let c=fs.readFileSync('src/i18n/locales/ru.js','utf8');
// Fix 1: remove stray \r before comma after csSystemOk
c=c.replace(/"csSystemOk": "Система работает нормально"\r,/g, '"csSystemOk": "Система работает нормально",');
// Fix 2: add missing comma between csFmtShort and strictDateFilter
c=c.replace('"csFmtShort": "Короткое"\n    "strictDateFilter"', '"csFmtShort": "Короткое",\n    "strictDateFilter"');
fs.writeFileSync('src/i18n/locales/ru.js',c,'utf8');
console.log('ru.js fixed');
