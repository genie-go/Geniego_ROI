/**
 * Fix Batch 1: Remove orphaned closing braces from the old "g": { wrapper
 * After fix_mkt_guide_ns.cjs removed "g": {, an extra } remains at the end
 * of the guide block that was the closing brace of the "g" object.
 * 
 * Strategy: Parse each locale file, find marketing object, check if it parses.
 * If not, find and remove the orphaned }.
 * 
 * Actually, let's just validate by trying to parse and fixing structurally.
 */
const fs = require('fs');
const path = require('path');

const localeDir = path.join(__dirname, 'src', 'i18n', 'locales');
const files = fs.readdirSync(localeDir).filter(f => f.endsWith('.js'));

let totalFixed = 0;

files.forEach(file => {
  const fp = path.join(localeDir, file);
  let src = fs.readFileSync(fp, 'utf8');

  // After removing "g": {, the old closing brace of "g" block is still present.
  // The pattern we need to fix: the "g" block originally ended with:
  //   "lastKeyInG": "value"
  //   }   <-- this was closing "g", now orphaned
  //
  // But since "g" is gone, these keys are now in marketing directly.
  // We need to find the extra } that follows the last key from the old "g" block
  // and was before the marketing object's own closing }.
  //
  // The simplest approach: try to parse, find syntax errors, fix them.
  // Let's use a brace-counting approach on the marketing object.

  // Find all "g": positions that were already removed - look for the guide keys
  // that are now direct children of marketing without a parent "g" wrapper
  // The old pattern was:
  //   }, "g": { ...keys... }
  // Now it's:
  //   }, ...keys...
  // But the old } from "g" is still there, creating an extra close

  // Approach: Find patterns like:
  //   "guideTip7": "...",\n      "sidebarUpgrade"
  // OR the old "g" closing brace between guide keys and sidebar keys
  
  // Actually the issue is simpler: there's likely a "}\n  }" sequence where
  // one } is the orphaned g-close. Let me check the structure more carefully.
  
  // For ko.js specifically:
  // Line 967: "guideTip7": "...",
  // Line 968: "sidebarUpgrade": "..."
  // This looks correct - no extra } between them.
  // Line 977: "quickRecents": "..."
  // Line 978: }   <-- this closes marketing
  // Line 979: },  <-- this closes the parent
  
  // Wait - let me recheck. There might be TWO closing braces where only ONE is needed.
  // The original structure was:
  //   marketing: { ...keys..., "g": { ...guidekeys... }, sidebarUpgrade, ... }
  // After removing "g": { wrapper:
  //   marketing: { ...keys..., ...guidekeys... }, sidebarUpgrade, ... }
  //                                             ^-- orphaned } from old "g" close
  //
  // So there should be an extra } RIGHT AFTER the guide keys and BEFORE sidebarUpgrade etc.
  // But looking at the file, it seems the } was already part of the flow.
  // Let me just try to load and see what happens.
  
  // Let's try a targeted fix: count braces in the marketing section
  // If there are more } than { we need to remove one.
  
  const mkStart = src.indexOf('"marketing"');
  if (mkStart === -1) {
    console.log(`  ⚠️ ${file}: no marketing key found`);
    return;
  }
  
  // Find the opening { of marketing
  const mkBraceStart = src.indexOf('{', mkStart);
  if (mkBraceStart === -1) return;
  
  // Count braces to find the correct end
  let depth = 0;
  let mkEnd = -1;
  for (let i = mkBraceStart; i < src.length; i++) {
    if (src[i] === '{') depth++;
    if (src[i] === '}') depth--;
    if (depth === 0) {
      mkEnd = i;
      break;
    }
  }
  
  if (mkEnd === -1) {
    console.log(`  ⚠️ ${file}: couldn't find marketing end brace`);
    return;
  }
  
  // Extract marketing block and check for issues
  const mkBlock = src.substring(mkBraceStart, mkEnd + 1);
  
  // Check: does the marketing block parse as JSON?
  try {
    JSON.parse(mkBlock);
    console.log(`  ✅ ${file}: marketing block parses OK (${mkBlock.length} chars)`);
  } catch(e) {
    console.log(`  ❌ ${file}: parse error: ${e.message}`);
    // The issue is likely an extra } somewhere in the block
    // Let's find it by looking for }}\n that should be just }
    totalFixed++;
  }
});

console.log(`\n📊 Files with parse errors: ${totalFixed}`);
console.log('\nNow attempting full file parse...');

// Try loading ko.js
try {
  delete require.cache[require.resolve('./src/i18n/locales/ko.js')];
  const m = require('./src/i18n/locales/ko.js');
  console.log('✅ ko.js loads successfully');
  const d = m.default || m;
  const mk = d.marketing || {};
  console.log('gf1Title:', mk.gf1Title || 'MISSING');
} catch(e) {
  console.log('❌ ko.js load failed:', e.message.substring(0, 200));
}
