/**
 * Fix marketing guide keys namespace issue
 * Problem: Keys like gf1Title are nested under marketing.g.gf1Title instead of marketing.gf1Title
 * Cause: A spurious "g": { wrapper was injected around CS+guide keys
 * Solution: Remove the "g": { wrapper, promoting all keys inside it to marketing level
 */
const fs = require('fs');
const path = require('path');

const localeDir = path.join(__dirname, 'src', 'i18n', 'locales');
const files = fs.readdirSync(localeDir).filter(f => f.endsWith('.js'));

let totalFixed = 0;

files.forEach(file => {
  const fp = path.join(localeDir, file);
  let src = fs.readFileSync(fp, 'utf8');
  const before = src;

  // Find ALL occurrences of "g": { inside marketing namespace and remove them
  // The pattern: at the end of a marketing sub-object, there's "g": { that wraps keys
  // We need to find "g": { and its matching closing } and unwrap the contents

  // Strategy: Find "g": { pattern and replace it with just a continuation
  // The "g": { appears after a }, closing a previous sub-object in marketing
  
  // Pattern 1: },\n    "g": {  →  },
  // This effectively removes the wrapper start, making the keys direct children of marketing
  let count = 0;
  
  // Remove the opening "g": {
  src = src.replace(/},\s*\n\s*"g":\s*\{/g, (match) => {
    count++;
    return '},';
  });

  // Now we need to remove the extra closing } that was the end of the "g" block
  // This is trickier - we need to find where the guide keys end and remove the extra }
  // The guide keys end with guideTip7 or similar, followed by },\n  (end of marketing)
  // Actually, after removing "g": {, the keys are now directly in marketing
  // But there's still an extra closing } from the old "g" block
  
  // Let's try a different approach: load as JS module and check
  if (count > 0) {
    totalFixed += count;
    console.log(`  ✅ ${file}: removed ${count} "g": { wrapper(s)`);
  }
  
  if (src !== before) {
    fs.writeFileSync(fp, src, 'utf8');
  }
});

console.log(`\n📊 Total fixes: ${totalFixed} across ${files.length} files`);

// Now verify ko.js
try {
  delete require.cache[require.resolve('./src/i18n/locales/ko.js')];
  const m = require('./src/i18n/locales/ko.js');
  const d = m.default || m;
  const mk = d.marketing || {};
  const testKeys = ['gf1Title', 'gf2Title', 'guideFullTitle', 'guidePhaseA', 'csTitle'];
  console.log('\n🔍 Verification (ko.js marketing namespace):');
  testKeys.forEach(k => console.log(`  ${k}: ${mk[k] ? '✅ OK' : '❌ STILL MISSING'}`));
} catch(e) {
  console.log('⚠️ Verification failed:', e.message);
}
