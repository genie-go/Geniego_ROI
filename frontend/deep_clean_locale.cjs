const fs = require('fs');
const path = require('path');
const LOCALES_DIR = 'src/i18n/locales';

// Step 1: Clean ALL locale files - remove any lines that are partial/damaged pricingDetail
// These look like: "zh.pricingDetail = {" without closing on same line
// or "zh.cmpRow = {" without content

function cleanLocale(lang) {
  const fname = lang === 'zh-TW' ? 'zh-TW.js' : `${lang}.js`;
  const fp = path.join(LOCALES_DIR, fname);
  if (!fs.existsSync(fp)) return;

  let c = fs.readFileSync(fp, 'utf8');
  const lines = c.split('\n');
  
  // Find the export default line
  const exportIdx = lines.findIndex(l => l.trim().startsWith('export default'));
  
  // Remove all lines between exportIdx and pricingDetail (i.e., remove damaged additions before export)
  // Find where the last clean closing is (};  before export)
  // Walk backwards from exportIdx to find last "};" line
  let lastClean = exportIdx - 1;
  while (lastClean >= 0 && lines[lastClean].trim() === '') lastClean--;
  
  // Check if lines between lastClean+1 and exportIdx have damaged content
  const suspectLines = lines.slice(lastClean + 1, exportIdx);
  const hasDamage = suspectLines.some(l => {
    const t = l.trim();
    return t.match(/^[a-zA-Z$_][a-zA-Z0-9$_]*\.(pricingDetail|cmpRow|cmpVal|pricing)\s*=/) && !t.endsWith(';');
  });

  if (hasDamage) {
    // Remove lines from lastClean+1 to exportIdx
    const newLines = [
      ...lines.slice(0, lastClean + 1),
      '',
      ...lines.slice(exportIdx)
    ];
    fs.writeFileSync(fp, newLines.join('\n'), 'utf8');
    console.log(`✅ ${lang}: Removed damaged lines (${suspectLines.length} lines)`);
  } else {
    // Also remove any partial lines that are just "var.key = {" without closing on same line
    let modified = false;
    const filteredLines = [];
    for (const line of lines) {
      const t = line.trim();
      // Skip incomplete object openings like "zh.pricingDetail = {" (no content, no closing)
      if (t.match(/^[a-zA-Z$_][a-zA-Z0-9$_]*\.(pricingDetail|cmpRow|cmpVal)\s*=\s*\{$/) && !t.endsWith('};')) {
        console.log(`  Skipping damaged line: ${t.slice(0, 60)}`);
        modified = true;
        continue;
      }
      filteredLines.push(line);
    }
    if (modified) {
      fs.writeFileSync(fp, filteredLines.join('\n'), 'utf8');
      console.log(`✅ ${lang}: Filtered partial lines`);
    } else {
      console.log(`⏭ ${lang}: No damage found`);
    }
  }
}

const langs = ['ko', 'en', 'ja', 'zh', 'de', 'th', 'vi', 'id', 'zh-TW'];
langs.forEach(cleanLocale);

console.log('\n--- Verification ---');
langs.forEach(lang => {
  const fname = lang === 'zh-TW' ? 'zh-TW.js' : `${lang}.js`;
  const fp = path.join(LOCALES_DIR, fname);
  if (!fs.existsSync(fp)) return;
  const c = fs.readFileSync(fp, 'utf8');
  const lines = c.split('\n');
  const ei = lines.findIndex(l => l.trim().startsWith('export default'));
  const pi = lines.findIndex(l => l.includes('.pricingDetail'));
  console.log(`${lang}: export=${ei} pricingDetail=${pi} after=${pi > ei} hasExport=${ei >= 0}`);
});
