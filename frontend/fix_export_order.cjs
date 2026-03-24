const fs = require('fs');
const path = require('path');
const LOCALES_DIR = 'src/i18n/locales';

// Fix: pricingDetail/cmpRow/cmpVal were added AFTER export default
// Need to move them BEFORE export default

const langs = ['ko','en','ja','zh','de','th','vi','id','zh-TW'];

for (const lang of langs) {
  const fname = lang === 'zh-TW' ? 'zh-TW.js' : `${lang}.js`;
  const fp = path.join(LOCALES_DIR, fname);
  if (!fs.existsSync(fp)) continue;

  let c = fs.readFileSync(fp, 'utf8');
  
  // Find the export default line position
  const exportMatch = c.match(/\nexport default [^\n]+\n/);
  if (!exportMatch) { console.log(`⚠ ${lang}: no export default found`); continue; }
  
  const exportPos = c.indexOf(exportMatch[0]);
  const exportEnd = exportPos + exportMatch[0].length;

  // Check if pricingDetail/cmpRow/cmpVal appear AFTER export
  const afterExport = c.slice(exportEnd);
  const hasAfter = afterExport.includes('pricingDetail') || afterExport.includes('cmpRow') || afterExport.includes('cmpVal') || afterExport.includes('.pricing.moreItems');
  
  if (!hasAfter) {
    console.log(`✅ ${lang}: nothing to move`);
    continue;
  }

  // Extract all assignments after export default
  const beforeExport = c.slice(0, exportPos + 1); // keep \n before export
  const exportLine = exportMatch[0];
  
  // Split afterExport into lines and collect the translator suffixes
  const afterLines = afterExport.split('\n');
  
  // Find suffix lines: lines that start with "varName." or are comments starting with "//"
  const suffixBlock = [];
  let inSuffix = false;
  
  for (const line of afterLines) {
    const trimmed = line.trim();
    // A suffix line starts with variable.key = or is a comment, or closing }; or ;
    if (trimmed.startsWith('//') || 
        trimmed.match(/^[a-zA-Z$_][a-zA-Z0-9$_]*\.[a-zA-Z]/) ||
        trimmed === '' ) {
      suffixBlock.push(line);
      inSuffix = true;
    }
  }
  
  // Build new content: everything before export + suffix lines + export line
  // Remove suffix lines from their current position
  let newContent = beforeExport.trimEnd();
  newContent += '\n\n';
  newContent += suffixBlock.filter(l => l.trim()).map(l => l).join('\n');
  newContent += '\n\n';
  newContent += exportLine.trim();
  newContent += '\n';
  
  fs.writeFileSync(fp, newContent, 'utf8');
  console.log(`✅ ${lang}: moved pricingDetail/cmpRow/cmpVal before export default`);
}

console.log('\n✅ Done!');
