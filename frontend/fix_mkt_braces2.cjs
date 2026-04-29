/**
 * Comprehensive fix: Repair all locale files after "g": { removal
 * 
 * Problem: The previous fix removed "g": { but left orphaned keys floating
 * outside their parent namespace. We need to:
 * 1. Find keys that are now orphaned (between } and next namespace)
 * 2. Move them into the correct parent namespace
 * 
 * Strategy: The safest approach is to find orphaned key blocks
 * (lines with "key": "value" that appear between }, and the next "namespace": {)
 * and wrap them back into the last open namespace.
 * 
 * Actually, the cleanest fix: find the pattern where },\n  "key": "value"
 * appears (closing brace followed by keys without an opening brace)
 * and change }, to just , (remove the closing brace, keeping keys in parent)
 */
const fs = require('fs');
const path = require('path');

const localeDir = path.join(__dirname, 'src', 'i18n', 'locales');
const files = fs.readdirSync(localeDir).filter(f => f.endsWith('.js'));

let totalFixed = 0;

files.forEach(file => {
  const fp = path.join(localeDir, file);
  let src = fs.readFileSync(fp, 'utf8');
  const originalLen = src.length;
  
  // Pattern: a namespace closing like:
  //   "lastKey": "value"
  //   },                  <-- this closes a sub-namespace like "hub"
  //   "orphanedKey": "value",  <-- these should be inside the parent namespace
  //
  // After removing "g": {, the keys that were inside "g" are now
  // between the close of the previous sub-namespace and the next one.
  // They're at the wrong nesting level.
  //
  // Fix: Find these orphaned blocks and ensure they're inside a namespace.
  
  // Actually let's just try a different approach: 
  // Find the specific "b2bSku" line (or similar last key before the orphaned block)
  // and fix the structure.
  
  // Better approach: Find all cases where },\n followed by "key": "value" 
  // (indented at same level) without an opening { on the line between.
  // This indicates the } closed too early.
  
  // Simplest surgical fix: the orphaned keys after the "g" removal are:
  // sidebarAlertCount, sidebarCampaignActive, sidebarUpgrade, sidebarLogout,
  // upgradalTitle, etc. These were in a "g" block. Now they're floating.
  // They need to be inside the marketing (or sidebar/common) namespace.
  
  // Let's find the pattern: },\n    "sidebarAlertCount" and change }, to just ,
  // Actually that won't work because }, closes a legitimate sub-namespace.
  
  // Real fix: these orphaned keys need to go back into a namespace.
  // The original structure was: marketing: { ..., "g": { sidebar keys }, ... }
  // Now: marketing: { ... }, sidebar keys, ...
  // Fix: marketing: { ..., sidebar keys, ... }
  
  // Find the orphaned block: it starts after a "}\s*," that was a sub-namespace close,
  // followed by keys at the wrong indent level
  
  // Let's just scan for the specific patterns and fix:
  // Pattern 1: After the WMS or similar namespace closes with },\n  keys...
  
  const lines = src.split('\n');
  let fixed = false;
  
  for (let i = 0; i < lines.length - 1; i++) {
    const line = lines[i].trimEnd();
    const nextLine = lines[i + 1]?.trim() || '';
    
    // Find: line ends with }, or }  and next line is a bare "key": "value" 
    // (not a "key": { which would be a namespace start)
    if (/^\s*\},?\s*$/.test(line) && /^"[a-zA-Z]/.test(nextLine) && !nextLine.includes(': {')) {
      // Check if the next line is at the root level of the export (which would be wrong for keys)
      // Root level keys should be inside a namespace
      
      // Get indent of the }, line
      const closingIndent = line.search(/\S/);
      const nextIndent = lines[i + 1].search(/\S/);
      
      // If the orphaned keys have SAME or LESS indent than the closing }, 
      // they were supposed to be inside
      if (nextIndent >= closingIndent && closingIndent >= 2) {
        // This }, is premature. Change it to , to keep keys in parent
        lines[i] = line.replace(/\}\s*,?\s*$/, ',');
        
        // Now find where the orphaned block ends and add back the }
        // The orphaned block ends when we hit a line that starts a new namespace "key": {
        // or when we hit the actual parent closing }
        
        // Actually, the orphaned keys may already flow into the next namespace correctly
        // if we just remove the premature }. Let's check.
        fixed = true;
        totalFixed++;
        console.log(`  📌 ${file}:${i + 1}: removed premature closing brace`);
        // Only fix the FIRST occurrence per file, then re-check
        break;
      }
    }
  }
  
  if (fixed) {
    src = lines.join('\n');
    fs.writeFileSync(fp, src, 'utf8');
  }
});

console.log(`\n📊 Total fixes: ${totalFixed}`);

// Verify ko.js
console.log('\n🔍 Verification...');
try {
  const s = fs.readFileSync(path.join(localeDir, 'ko.js'), 'utf8')
    .replace(/^export default\s*/, 'module.exports = ')
    .replace(/;\s*$/, '');
  const tmpPath = path.join(__dirname, '_tmp_ko_check.js');
  fs.writeFileSync(tmpPath, s);
  delete require.cache[require.resolve(tmpPath)];
  const obj = require(tmpPath);
  const mk = obj.marketing || {};
  console.log('gf1Title:', mk.gf1Title ? '✅ EXISTS' : '❌ MISSING');
  console.log('csTitle:', mk.csTitle ? '✅ EXISTS' : '❌ MISSING');
  console.log('guideFullTitle:', mk.guideFullTitle ? '✅ EXISTS' : '❌ MISSING');
  fs.unlinkSync(tmpPath);
} catch(e) {
  console.log('❌ Still broken:', e.message.substring(0, 200));
  // Try to find the error location
  try {
    const tmpPath = path.join(__dirname, '_tmp_ko_check.js');
    if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
  } catch {}
}
