const fs = require('fs');
const path = require('path');
const LOCALES_DIR = path.join(__dirname, 'src/i18n/locales');
const LOCALE_FILES = ['ko','en','ja','zh','zh-TW','de','th','vi','id'];

LOCALE_FILES.forEach(lang => {
  const filePath = path.join(LOCALES_DIR, `${lang}.js`);
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf8');

  // 1. Remove ALL old flat "journey.xxx" keys that were injected (dot notation)
  // These are the ones like ,"journey.pageTitle":"..." that don't work with deepGet
  let count = 0;
  content = content.replace(/,"journey\.[a-zA-Z0-9_.]+":"(?:[^"\\]|\\.)*"/g, () => { count++; return ''; });
  if (count > 0) console.log(`  [${lang}] Removed ${count} flat journey.* keys`);

  // 2. Also remove any orphaned flat keys at start of object
  content = content.replace(/"journey\.[a-zA-Z0-9_.]+":"(?:[^"\\]|\\.)*",?/g, () => { count++; return ''; });

  // 3. Fix double commas
  content = content.replace(/,,+/g, ',');

  // 4. Fix leading comma after {
  content = content.replace(/\{,/g, '{');

  // 5. Fix trailing comma before }
  content = content.replace(/,\}/g, '}');

  // 6. Validate by trying to parse
  try {
    // Extract the object part
    const match = content.match(/export\s+default\s+(\{[\s\S]*\});?\s*$/);
    if (match) {
      // Try to parse as JSON (won't work with JS features, but catches basic issues)
      const jsonStr = match[1];
      JSON.parse(jsonStr);
      console.log(`✅ [${lang}] Valid JSON - OK`);
    }
  } catch (e) {
    console.log(`⚠ [${lang}] JSON parse warning at pos ~${e.message.match(/position (\d+)/)?.[1] || '?'}: ${e.message.slice(0, 80)}`);
  }

  fs.writeFileSync(filePath, content, 'utf8');
});

console.log('\n🔧 Cleanup complete. Attempting build validation...');
