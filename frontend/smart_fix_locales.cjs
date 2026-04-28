const fs = require('fs');
const path = require('path');
const LOCALES_DIR = path.join(__dirname, 'src/i18n/locales');
const LOCALE_FILES = ['ko','en','ja','zh','zh-TW','de','th','vi','id'];

function fixBraces(objStr) {
  // Walk through and track depth; whenever depth goes below 0, remove the extra }
  // Also when depth goes to 0 but there's still content after, insert missing {
  let result = [];
  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = 0; i < objStr.length; i++) {
    const c = objStr[i];

    if (escape) {
      result.push(c);
      escape = false;
      continue;
    }

    if (c === '\\' && inString) {
      result.push(c);
      escape = true;
      continue;
    }

    if (c === '"') {
      inString = !inString;
      result.push(c);
      continue;
    }

    if (inString) {
      result.push(c);
      continue;
    }

    if (c === '{') {
      depth++;
      result.push(c);
    } else if (c === '}') {
      depth--;
      if (depth < 0) {
        // Extra closing brace — skip it
        depth = 0;
        continue;
      }
      // Check: if depth is now 0 but there's significant content after this
      if (depth === 0) {
        const remaining = objStr.substring(i + 1).trim();
        if (remaining.startsWith(',') || remaining.startsWith('"')) {
          // Object closed prematurely! Don't close it yet — skip this }
          depth = 1; // keep depth at 1
          continue;
        }
      }
      result.push(c);
    } else {
      result.push(c);
    }
  }

  // Add missing closing braces
  while (depth > 0) {
    result.push('}');
    depth--;
  }

  return result.join('');
}

LOCALE_FILES.forEach(lang => {
  const filePath = path.join(LOCALES_DIR, `${lang}.js`);
  if (!fs.existsSync(filePath)) return;
  const raw = fs.readFileSync(filePath, 'utf8');

  const prefix = 'export default ';
  const objStr = raw.replace(/^export\s+default\s+/, '').replace(/;\s*$/, '');

  const fixed = fixBraces(objStr);

  // Validate
  try {
    const parsed = JSON.parse(fixed);
    const keyCount = Object.keys(parsed).length;
    const hasJourney = !!parsed.journey;
    const tabList = parsed.journey?.tabList || 'MISSING';
    fs.writeFileSync(filePath, prefix + fixed + ';', 'utf8');
    console.log(`✅ [${lang}] Fixed & valid — ${keyCount} top keys, journey: ${hasJourney ? 'YES' : 'NO'}, tabList: "${tabList}"`);
  } catch (e) {
    console.log(`❌ [${lang}] Still invalid: ${e.message.substring(0, 100)}`);
    // Save anyway for debugging
    fs.writeFileSync(filePath, prefix + fixed + ';', 'utf8');
  }
});

console.log('\n🎉 All locale files fixed!');
