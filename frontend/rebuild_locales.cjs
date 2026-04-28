const fs = require('fs');
const path = require('path');
const vm = require('vm');
const LOCALES_DIR = path.join(__dirname, 'src/i18n/locales');
const LOCALE_FILES = ['ko','en','ja','zh','zh-TW','de','th','vi','id'];

LOCALE_FILES.forEach(lang => {
  const filePath = path.join(LOCALES_DIR, `${lang}.js`);
  if (!fs.existsSync(filePath)) return;
  const raw = fs.readFileSync(filePath, 'utf8');

  // Extract the object string between "export default " and the final ";"
  const objStr = raw.replace(/^export\s+default\s+/, '').replace(/;\s*$/, '');

  // Find the error position
  try {
    JSON.parse(objStr);
    console.log(`✅ [${lang}] Already valid`);
    return;
  } catch (e) {
    const posMatch = e.message.match(/position (\d+)/);
    if (posMatch) {
      const errorPos = parseInt(posMatch[1]);
      console.log(`[${lang}] Error at position ${errorPos}: char="${objStr[errorPos]}", context: "${objStr.substring(errorPos-20, errorPos+20)}"`);

      // Approach: try to parse up to the error position and find what's wrong
      // The issue is likely extra }} from nested objects
      // Let's try a different approach: evaluate the JS export and re-serialize

      try {
        const sandbox = {};
        vm.runInNewContext(`var result = ${objStr.substring(0, errorPos)}`, sandbox);
        // If we can parse up to the error, the rest is junk
        // Count remaining braces needed
        let depth = 0;
        for (const c of objStr.substring(0, errorPos)) {
          if (c === '{') depth++;
          if (c === '}') depth--;
        }
        console.log(`  Depth at error: ${depth}, need ${depth} more '}' to close`);
      } catch(e2) {
        // Different approach
      }
    }
  }

  // Nuclear option: Use eval to load the current content, then re-export
  try {
    // The file is valid JS even if not valid JSON (might have trailing commas etc)
    const sandbox = { exports: {} };
    vm.runInNewContext(`exports.default = ${objStr}`, sandbox);
    const obj = sandbox.exports.default;

    // Re-serialize as clean JSON
    const clean = JSON.stringify(obj);
    const newContent = `export default ${clean};`;

    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log(`✅ [${lang}] Rebuilt and cleaned (${Object.keys(obj).length} top-level keys)`);

    // Verify journey key exists
    if (obj.journey) {
      console.log(`   journey keys: ${Object.keys(obj.journey).length}, tabList: "${obj.journey.tabList}"`);
    } else {
      console.log(`   ⚠ NO journey object found!`);
    }
  } catch (evalErr) {
    console.log(`❌ [${lang}] Could not eval: ${evalErr.message.substring(0, 120)}`);
  }
});

console.log('\n🎉 Locale files rebuilt!');
