/**
 * fix_locale_exports.cjs
 * Fixes locale files that may have lost their export default statement
 */
const fs = require('fs');
const langs = ['en','ja','zh','de','th','vi','id','zh-TW','ko'];
const BASE = 'src/i18n/locales';

for (const lang of langs) {
  const p = `${BASE}/${lang}.js`;
  let c = fs.readFileSync(p, 'utf8');
  const varName = lang.replace('-','_').replace('TW','TW');  // zh_TW -> zh_TW
  const actualVar = lang === 'zh-TW' ? 'zh_TW' : lang;
  
  const hasExport = c.includes('export default');
  const hasConst = c.includes(`const ${actualVar} =`) || c.includes(`const ${lang} =`);
  
  if (!hasExport && hasConst) {
    // Add export default at end
    c = c.trimEnd();
    if (!c.endsWith(';')) c += ';';
    c += `\n\nexport default ${actualVar};\n`;
    fs.writeFileSync(p, c, 'utf8');
    console.log(`FIXED: ${lang} - added export default ${actualVar}`);
  } else if (hasExport) {
    console.log(`OK: ${lang}`);
  } else {
    console.log(`WARN: ${lang} - cannot determine variable name`);
    console.log('  First 100 chars:', c.slice(0,100));
  }
}
console.log('\nDone!');
