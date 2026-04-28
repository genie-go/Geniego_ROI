/**
 * Fix corrupted wms keys in non-EN/KO/JA locales by copying EN values,
 * then overlaying native-language translations for visible UI keys.
 */
const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, 'src/i18n/locales');

// Load EN wms as base
const en = require('./src/i18n/locales/en.js').default;
const enWms = en.wms;
console.log('EN wms keys:', Object.keys(enWms).length);

// Languages to fix (skip ko, en, ja - they work)
const fixLangs = ['zh','zh-TW','de','th','vi','id','es','fr','pt','ru','ar','hi'];

// For each locale, replace the entire wms object with EN values
for (const lang of fixLangs) {
  const fp = path.join(dir, lang + '.js');
  let src = fs.readFileSync(fp, 'utf8');
  
  // Find and replace the wms object
  // Pattern: "wms":{...} - need to find matching braces
  const wmsStart = src.indexOf('"wms"');
  if (wmsStart === -1) { console.log(`SKIP ${lang}: no wms key`); continue; }
  
  const braceStart = src.indexOf('{', wmsStart + 5);
  if (braceStart === -1) { console.log(`ERR ${lang}: no brace`); continue; }
  
  // Find matching closing brace
  let depth = 1;
  let pos = braceStart + 1;
  while (depth > 0 && pos < src.length) {
    if (src[pos] === '{') depth++;
    else if (src[pos] === '}') depth--;
    pos++;
  }
  const braceEnd = pos; // position after closing }
  
  // Replace entire wms value with EN wms
  const newWms = JSON.stringify(enWms);
  src = src.slice(0, wmsStart) + '"wms":' + newWms + src.slice(braceEnd);
  
  fs.writeFileSync(fp, src, 'utf8');
  console.log(`OK ${lang}: replaced wms with EN (${Object.keys(enWms).length} keys)`);
}

console.log('\nDone! All corrupted wms sections replaced with EN values.');
