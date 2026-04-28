/**
 * Phase 2: Fix missing commas in locale files.
 * The pattern is: "fixed":"VALUE""system":{ -> needs comma between
 * Also do a comprehensive pass to find all places where }"key": or ""key": patterns exist without commas.
 */
const fs = require('fs');
const path = require('path');

const LOCALE_DIR = path.join(__dirname, 'src', 'i18n', 'locales');
const LANGS = ['ko', 'en', 'ja', 'zh', 'zh-TW', 'de', 'th', 'vi', 'id'];

LANGS.forEach(lang => {
  const fp = path.join(LOCALE_DIR, lang + '.js');
  let c = fs.readFileSync(fp, 'utf-8');

  // Fix pattern: value""key" -> value","key" (missing comma between properties)
  // This catches cases where closing quote of value is immediately followed by opening quote of next key
  let count = 0;

  // Pattern 1: "value""key": -> "value","key":
  c = c.replace(/"("[a-zA-Z])/g, (match, p1) => {
    count++;
    return '",'+p1;
  });

  // Pattern 2: }"key": without comma -> },"key":
  c = c.replace(/\}("[a-zA-Z])/g, (match, p1) => {
    count++;
    return '},'+p1;
  });

  console.log(`[${lang}] Fixed ${count} missing commas/separators`);

  fs.writeFileSync(fp, c, 'utf-8');

  // Validate
  try {
    const saved = fs.readFileSync(fp, 'utf-8');
    const jsonStr = saved.replace(/^export\s+default\s+/, '').replace(/;\s*$/, '').trim();
    JSON.parse(jsonStr);
    console.log(`  [VALIDATED] JSON parse successful!`);
  } catch (e) {
    console.log(`  [FAILED] ${e.message.substring(0, 120)}`);
    const saved = fs.readFileSync(fp, 'utf-8');
    const jsonStr = saved.replace(/^export\s+default\s+/, '').replace(/;\s*$/, '').trim();
    const pos = parseInt((e.message.match(/position (\d+)/) || [])[1] || '0');
    if (pos > 0) {
      console.log(`  Context: ...${jsonStr.substring(Math.max(0, pos - 60), pos)}<<<HERE>>>${jsonStr.substring(pos, pos + 60)}...`);
    }
  }
});

console.log('\nDone!');
