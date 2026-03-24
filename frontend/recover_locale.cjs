const fs = require('fs');
const path = require('path');

// Safe fix: for each locale file:
// 1. Find the export default line
// 2. Remove everything between the last complete line BEFORE export default and export default itself
//    (the damaged partial lines added by fix_export_order.cjs)
// 3. Also remove any damaged content BEFORE the export line that was not there originally
// 4. Add proper object property assignments BEFORE export default

const LOCALES_DIR = 'src/i18n/locales';

function getVarName(content) {
  const match = content.match(/^(?:const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=/m);
  return match ? match[1] : null;
}

function fixLocaleFile(lang) {
  const fname = lang === 'zh-TW' ? 'zh-TW.js' : `${lang}.js`;
  const fp = path.join(LOCALES_DIR, fname);
  if (!fs.existsSync(fp)) { console.log(`⚠ ${lang}: not found`); return false; }

  let c = fs.readFileSync(fp, 'utf8');
  const lines = c.split('\n');
  const varName = getVarName(c);
  if (!varName) { console.log(`⚠ ${lang}: var name not found`); return false; }

  // Find export default line index
  const exportIdx = lines.findIndex(l => l.trim().startsWith('export default'));
  if (exportIdx < 0) { console.log(`⚠ ${lang}: export not found`); return false; }

  // Find last good line before export (should be "};" or similar complete statement)
  // Damaged lines are: "varName.pricingDetail = {" (without closing), "varName.cmpRow = {" etc.
  // We need to find where the damage starts
  // Walk backwards from export to find first damaged line
  let damageStart = exportIdx;
  for (let i = exportIdx - 1; i >= 0; i--) {
    const l = lines[i].trim();
    if (l === '' || l.startsWith('//')) {
      damageStart = i;
      continue;
    }
    // Check for damaged lines: "varName.something = {" without closing
    if (l.match(/^[a-zA-Z$_][a-zA-Z0-9$_]*\.[a-zA-Z]/) && !l.endsWith(';')) {
      damageStart = i;
      continue;
    }
    // Found a good line
    break;
  }

  // Reconstruct: keep lines 0..damageStart (before damage), then add export
  const cleanLines = lines.slice(0, damageStart);
  // Remove any trailing empty lines from cleanLines
  while (cleanLines.length > 0 && cleanLines[cleanLines.length - 1].trim() === '') {
    cleanLines.pop();
  }
  cleanLines.push('');
  cleanLines.push(`export default ${varName};`);
  cleanLines.push('');

  const newContent = cleanLines.join('\n');
  fs.writeFileSync(fp, newContent, 'utf8');
  console.log(`✅ ${lang}: cleaned (removing damaged lines from ${damageStart} to ${exportIdx})`);
  return true;
}

// Fix all locale files
const langs = ['ko','en','ja','zh','de','th','vi','id','zh-TW'];
for (const lang of langs) {
  fixLocaleFile(lang);
}
console.log('\n✅ All cleaned. Now need to re-add pricingDetail correctly.');
