/**
 * PRECISE fix: Remove "g": { wrapper line from all locale files
 * The wrapper appears as a single line: "g": { 
 * Just remove that one line. The closing } of "g" is actually the marketing namespace closer,
 * so it should stay.
 * 
 * Original structure:
 *   marketing: { ...keys..., hub: { ...}, "g": { cs/guide keys + sidebar keys } }
 *                                          ^^^^^ REMOVE THIS LINE ONLY
 * 
 * Result:
 *   marketing: { ...keys..., hub: { ...}, cs/guide keys + sidebar keys }
 */
const fs = require('fs');
const path = require('path');

const localeDir = path.join(__dirname, 'src', 'i18n', 'locales');
const files = fs.readdirSync(localeDir).filter(f => f.endsWith('.js'));

let totalFixed = 0;

files.forEach(file => {
  const fp = path.join(localeDir, file);
  let src = fs.readFileSync(fp, 'utf8');
  const before = src.length;
  
  // Remove ALL lines that are just "g": { (with any whitespace/indentation)
  // This is a very precise regex: matches a line that is ONLY "g": {
  const pattern = /^[ \t]*"g"\s*:\s*\{\s*\r?\n/gm;
  const matches = src.match(pattern);
  
  if (matches) {
    src = src.replace(pattern, '');
    const count = matches.length;
    totalFixed += count;
    console.log(`  ✅ ${file}: removed ${count} "g": { line(s)`);
    fs.writeFileSync(fp, src, 'utf8');
  } else {
    console.log(`  ⬜ ${file}: no "g": { found`);
  }
});

console.log(`\n📊 Total line removals: ${totalFixed} across ${files.length} files`);

// Also fix a known issue: gf10Desc line is missing comma at end (line 955)
// Let's verify and fix
files.forEach(file => {
  const fp = path.join(localeDir, file);
  let src = fs.readFileSync(fp, 'utf8');
  let changed = false;
  
  // Fix missing commas after values (common injection error)
  // Pattern: "value"\n    "nextKey" -> "value",\n    "nextKey"
  src = src.replace(/(["'])\s*\r?\n(\s*"(?:gf|guide|cs|sidebar|upgrad))/g, (m, q, next) => {
    // Check if there's already a comma
    if (m.includes(',')) return m;
    changed = true;
    return q + ',\n' + next;
  });
  
  if (changed) {
    fs.writeFileSync(fp, src, 'utf8');
    console.log(`  🔧 ${file}: fixed missing commas`);
  }
});

// Final verification
console.log('\n🔍 Final verification...');
const testFile = path.join(localeDir, 'ko.js');
const testSrc = fs.readFileSync(testFile, 'utf8')
  .replace('export default', 'module.exports =');
const tmpPath = path.join(__dirname, '_tmp_verify.js');
fs.writeFileSync(tmpPath, testSrc);
try {
  delete require.cache[require.resolve(tmpPath)];
  const obj = require(tmpPath);
  const mk = obj.marketing || {};
  const keys = ['gf1Title','gf2Title','gf15Title','guideFullTitle','guidePhaseA','csTitle','guideTabGuideName','guideTip6','guideTip7','sidebarUpgrade'];
  console.log('Marketing keys check:');
  keys.forEach(k => console.log(`  ${k}: ${mk[k] ? '✅' : '❌ MISSING'}`));
  console.log(`  Total marketing keys: ${Object.keys(mk).length}`);
} catch(e) {
  console.log('❌ Parse error:', e.message);
}
try { fs.unlinkSync(tmpPath); } catch {}
