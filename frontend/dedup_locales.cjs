// DEDUPLICATE all locale files: keep only the LAST occurrence of each duplicate key
const fs = require('fs');
const DIR = 'src/i18n/locales/';
const ALL = ['ko','en','ja','zh','zh-TW','th','vi','id','de','fr','es','pt','ru','ar','hi'];

ALL.forEach(lang => {
  const p = DIR + lang + '.js';
  let src = fs.readFileSync(p, 'utf8');
  
  // Parse the export default object by evaluating it
  // Since it's ESM, we need to convert it
  const objStr = src.replace(/^export\s+default\s+/, '').replace(/;\s*$/, '');
  
  let obj;
  try {
    obj = eval('(' + objStr + ')');
  } catch(e) {
    console.log(lang + ': EVAL ERROR - ' + e.message.substring(0, 60));
    return;
  }
  
  // Rebuild the file: export default { ... }
  // This automatically deduplicates because JS objects keep only the last value
  const newSrc = 'export default ' + JSON.stringify(obj) + ';\n';
  fs.writeFileSync(p, newSrc, 'utf8');
  
  const keys = Object.keys(obj);
  console.log(lang + ': OK, ' + keys.length + ' top-level keys, ' + newSrc.length + ' bytes');
});
