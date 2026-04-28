/**
 * Fix corrupted gNav keys in non-EN/KO/JA locales
 */
const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, 'src/i18n/locales');
const en = require('./src/i18n/locales/en.js').default;
const enGNav = en.gNav;
console.log('EN gNav keys:', Object.keys(enGNav).length);

const fixLangs = ['zh','zh-TW','de','th','vi','id','es','fr','pt','ru','ar','hi'];

for (const lang of fixLangs) {
  const fp = path.join(dir, lang + '.js');
  let src = fs.readFileSync(fp, 'utf8');
  
  const gNavStart = src.indexOf('"gNav"');
  if (gNavStart === -1) { console.log(`SKIP ${lang}: no gNav`); continue; }
  
  const braceStart = src.indexOf('{', gNavStart + 6);
  if (braceStart === -1) { console.log(`ERR ${lang}`); continue; }
  
  let depth = 1, pos = braceStart + 1;
  while (depth > 0 && pos < src.length) {
    if (src[pos] === '{') depth++;
    else if (src[pos] === '}') depth--;
    pos++;
  }
  
  src = src.slice(0, gNavStart) + '"gNav":' + JSON.stringify(enGNav) + src.slice(pos);
  fs.writeFileSync(fp, src, 'utf8');
  console.log(`OK ${lang}`);
}
console.log('Done');
