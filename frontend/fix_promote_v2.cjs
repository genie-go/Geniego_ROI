/**
 * Fix: Promote marketing.g.* keys to marketing.* via regex (no JS parse required)
 * 
 * Strategy: Find the "g": { block inside marketing, extract its key-value pairs,
 * and inject them at the start of the marketing block.
 */
const fs = require('fs');
const path = require('path');

const localeDir = path.join(__dirname, 'src', 'i18n', 'locales');
const files = fs.readdirSync(localeDir).filter(f => f.endsWith('.js'));

let totalInjected = 0;

files.forEach(file => {
  const fp = path.join(localeDir, file);
  let src = fs.readFileSync(fp, 'utf8');
  
  // Find ALL "g": { blocks inside the file
  // We need to extract the content of each "g": { ... } block
  const gBlockPattern = /("g"\s*:\s*\{)([\s\S]*?)(\n\s*\})/g;
  
  let match;
  const allKeysToInject = [];
  
  // Reset regex
  const gPositions = [];
  while ((match = gBlockPattern.exec(src)) !== null) {
    const blockContent = match[2];
    
    // Extract individual key-value pairs from the block
    const kvPattern = /"([^"]+)"\s*:\s*"((?:[^"\\]|\\.)*)"/g;
    let kvMatch;
    while ((kvMatch = kvPattern.exec(blockContent)) !== null) {
      allKeysToInject.push({ key: kvMatch[1], value: kvMatch[2] });
    }
    gPositions.push({ start: match.index, end: match.index + match[0].length });
  }
  
  if (allKeysToInject.length === 0) {
    console.log(`  ⬜ ${file}: no keys found in "g" blocks`);
    return;
  }
  
  // Find the marketing: { opening and inject keys there
  const mktMatch = src.match(/"marketing"\s*:\s*\{/);
  if (!mktMatch) {
    console.log(`  ⚠️ ${file}: no marketing block found`);
    return;
  }
  
  const insertPos = mktMatch.index + mktMatch[0].length;
  
  // Check which keys already exist at marketing root level
  // We'll check if the key appears in the marketing block BEFORE the "g": { block
  const mktStart = mktMatch.index;
  const firstGPos = gPositions[0]?.start || src.length;
  const mktRootSection = src.substring(mktStart, firstGPos);
  
  const keysToInject = allKeysToInject.filter(({ key }) => {
    // Check if key already exists in marketing root (before "g" block)
    const keyPattern = new RegExp(`"${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"\\s*:`);
    return !keyPattern.test(mktRootSection);
  });
  
  if (keysToInject.length === 0) {
    console.log(`  ✅ ${file}: all ${allKeysToInject.length} keys already exist at marketing root`);
    return;
  }
  
  // Build injection string
  const lines = keysToInject.map(({ key, value }) => `    "${key}": "${value}"`);
  const injection = '\n' + lines.join(',\n') + ',';
  
  src = src.substring(0, insertPos) + injection + src.substring(insertPos);
  
  fs.writeFileSync(fp, src, 'utf8');
  totalInjected += keysToInject.length;
  console.log(`  ✅ ${file}: promoted ${keysToInject.length} keys to marketing root`);
});

console.log(`\n📊 Total keys promoted: ${totalInjected}`);

// Quick regex verification for ko.js
const koSrc = fs.readFileSync(path.join(localeDir, 'ko.js'), 'utf8');
const testKeys = ['gf1Title', 'gf15Title', 'guideFullTitle', 'guidePhaseA', 'csTitle', 'guideTip6'];
console.log('\n🔍 Verification (ko.js - regex check):');
testKeys.forEach(k => {
  // Check if key appears in marketing block (not inside "g": {)
  const mktMatch = koSrc.match(/"marketing"\s*:\s*\{/);
  if (!mktMatch) { console.log(`  ${k}: ❌ no marketing block`); return; }
  const mktStart = mktMatch.index;
  // Find first "g": { after marketing start
  const gStart = koSrc.indexOf('"g":', mktStart);
  const searchArea = gStart > 0 ? koSrc.substring(mktStart, gStart) : koSrc.substring(mktStart, mktStart + 5000);
  const found = searchArea.includes(`"${k}"`);
  console.log(`  ${k}: ${found ? '✅ found at marketing root' : '❌ NOT at marketing root'}`);
});
