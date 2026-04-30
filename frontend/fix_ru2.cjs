const fs=require('fs');
let c=fs.readFileSync('src/i18n/locales/ru.js');
// Find and replace \r, pattern (0x0D 0x2C)
let s=c.toString('utf8');
// Replace the specific problematic pattern: ",\r," → ","
s=s.replace(/",\r,/g, '",');
// Also line 292-293 missing comma
s=s.replace(/"csFmtShort": "Короткое"\n/g, '"csFmtShort": "Короткое",\n');
fs.writeFileSync('src/i18n/locales/ru.js', s, 'utf8');
console.log('done');
// Verify
const v=fs.readFileSync('src/i18n/locales/ru.js','utf8');
const line242=v.split('\n')[241];
console.log('Line 242:', JSON.stringify(line242));
