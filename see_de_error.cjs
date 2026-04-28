const fs=require('fs');
const code=fs.readFileSync('./frontend/src/i18n/locales/de.js','utf8');
const col=142464;
console.log('Around col',col);
console.log(code.substring(col-60,col+40));
console.log(' '.repeat(60)+'^--- ERROR');
