const fs = require('fs');

// ── Step 1: Understand current ko.js structure ──
const content = fs.readFileSync('src/i18n/locales/ko.js', 'utf8');
const lines = content.split('\n');

console.log('=== Current ko.js Structure ===');
console.log('Total lines:', lines.length);

// Find all top-level assignments
const topAssignments = [];
for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim();
  if (/^ko\.\w+\s*=/.test(line)) {
    topAssignments.push({ line: i + 1, code: line.substring(0, 80) });
  }
  if (/^const\s+ko\s*=/.test(line)) {
    topAssignments.push({ line: i + 1, code: 'const ko = { ... (main object)' });
  }
  if (/^export\s+default/.test(line)) {
    topAssignments.push({ line: i + 1, code: line.substring(0, 80) });
  }
}

console.log('\nTop-level assignments:');
topAssignments.forEach(a => console.log(`  L${a.line}: ${a.code}`));

// ── Step 2: Find structure breaks ──
// Check where const ko = { ends
let braceCount = 0;
let constKoStart = -1;
let constKoEnd = -1;
for (let i = 0; i < lines.length; i++) {
  if (/^const\s+ko\s*=/.test(lines[i].trim())) {
    constKoStart = i + 1;
  }
  if (constKoStart > 0 && constKoEnd < 0) {
    for (const ch of lines[i]) {
      if (ch === '{') braceCount++;
      if (ch === '}') braceCount--;
    }
    if (braceCount === 0 && constKoStart > 0) {
      constKoEnd = i + 1;
      break;
    }
  }
}
console.log(`\nMain object: L${constKoStart}-L${constKoEnd}`);
console.log(`Lines in main object: ${constKoEnd - constKoStart + 1}`);
console.log(`Remaining lines after main object: ${lines.length - constKoEnd}`);

// Show what's after the main object
console.log('\nContent after main object (first 20 lines):');
for (let i = constKoEnd; i < Math.min(constKoEnd + 20, lines.length); i++) {
  if (lines[i].trim()) {
    console.log(`  L${i + 1}: ${lines[i].trim().substring(0, 100)}`);
  }
}

// ── Step 3: Check backup structure ──
const bakContent = fs.readFileSync('src/i18n/locales_backup/ko.js', 'utf8');
console.log('\n=== Backup ko.js ===');
console.log('Total chars:', bakContent.length);
console.log('Lines:', bakContent.split('\n').length);
console.log('Starts with:', bakContent.substring(0, 50));

// Count sections in backup by looking for common key patterns
const bakSections = bakContent.match(/"(\w+)":\{/g);
if (bakSections) {
  console.log('Top-level sections found:', bakSections.length);
  // Get unique top-level keys
  const topKeys = new Set();
  // More precise: find keys at position right after { or ,
  let depth = 0;
  let inString = false;
  let keyBuffer = '';
  let collectingKey = false;
  
  // Simplified: just count known section names
  const knownSections = ['writebackPage','auto','campaignManager','nav','gNav','adPerf','channelKpi','crm','omniChannel','attribution','catalog','wms','priceOpt','supplyChain','returnsPortal','dashboard','marketing','webPopup','influencer','orderHub','inventoryPage','budgetTracker','brandManagement'];
  for (const section of knownSections) {
    if (bakContent.includes('"'+section+'":')) {
      topKeys.add(section);
    }
  }
  console.log('Known sections in backup:', [...topKeys].join(', '));
}
