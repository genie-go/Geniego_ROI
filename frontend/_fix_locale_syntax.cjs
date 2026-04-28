/**
 * Fix locale file syntax errors:
 * All 9 locale files have the same structural issue:
 *   - Line 1: giant JSON starting with `export default {` (open braces)
 *   - Lines 2-151: loose key-value pairs in `key: 'value'` format (not valid inside JSON)
 *   - Line 152: rest of the JSON closing braces and more namespaces
 *
 * Fix: Convert lines 2-151 into proper JSON key-value pairs and merge them
 *       into the end of line 1, then join with line 152+.
 */
const fs = require('fs');
const path = require('path');

const LOCALE_DIR = path.join(__dirname, 'src', 'i18n', 'locales');
const LANGS = ['ko', 'en', 'ja', 'zh', 'zh-TW', 'de', 'th', 'vi', 'id'];

LANGS.forEach(lang => {
  const fp = path.join(LOCALE_DIR, lang + '.js');
  const c = fs.readFileSync(fp, 'utf-8');
  const lines = c.split('\n');

  if (lines.length <= 5) {
    console.log(`[${lang}] Already single-line or small, skip`);
    return;
  }

  console.log(`[${lang}] Processing: ${lines.length} lines, L1=${lines[0].length} chars`);

  // Identify the loose property lines (lines 2 to N, before the big closing line)
  // These are lines like:  `    boxDetailsTitle: '📦 박스 단위 상세',`
  const looseLines = [];
  let lastBigLineIdx = -1;

  for (let i = 1; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (trimmed === '') continue;
    // If line is very long (>500 chars), it's probably the continuation JSON block
    if (lines[i].length > 500) {
      lastBigLineIdx = i;
      break;
    }
    looseLines.push(trimmed);
  }

  if (looseLines.length === 0) {
    console.log(`  No loose lines found, skip`);
    return;
  }

  console.log(`  Found ${looseLines.length} loose property lines`);
  console.log(`  Big continuation line at index: ${lastBigLineIdx}`);

  // Convert loose lines from `key: 'value',` to `"key":"value",` format
  const convertedPairs = [];
  for (const line of looseLines) {
    // Match patterns like: key: 'value' or key: 'value',
    const m = line.match(/^(\w+)\s*:\s*'((?:[^'\\]|\\.)*)'\s*,?$/);
    if (m) {
      const key = m[1];
      const val = m[2]
        .replace(/\\/g, '\\\\')  // escape backslashes
        .replace(/"/g, '\\"');    // escape double quotes
      convertedPairs.push(`"${key}":"${val}"`);
    } else {
      // Try double-quote format: key: "value",
      const m2 = line.match(/^(\w+)\s*:\s*"((?:[^"\\]|\\.)*)"\s*,?$/);
      if (m2) {
        convertedPairs.push(`"${m2[1]}":"${m2[2]}"`);
      } else {
        console.log(`  WARNING: Could not parse line: ${line.substring(0, 80)}`);
        // Try to include as-is if it looks like JSON
        convertedPairs.push(line.replace(/,\s*$/, ''));
      }
    }
  }

  // Build the fixed content:
  // Line 1 ends with a comma, so we can append the converted pairs
  let line1 = lines[0];
  // Ensure line 1 ends with comma
  if (!line1.trimEnd().endsWith(',')) {
    line1 = line1.trimEnd() + ',';
  }

  // The continuation line (line 152) starts with `},` which closes the current namespace
  const continuationLine = lastBigLineIdx >= 0 ? lines[lastBigLineIdx] : '';

  // Combine: line1 + converted pairs + continuation
  const fixedContent = line1 + convertedPairs.join(',') + '\n' + continuationLine + '\n';

  // Validate brace balance
  let braceCount = 0;
  for (let i = 0; i < fixedContent.length; i++) {
    if (fixedContent[i] === '{') braceCount++;
    if (fixedContent[i] === '}') braceCount--;
  }
  console.log(`  Brace balance after fix: ${braceCount}`);

  if (braceCount !== 0) {
    console.log(`  WARNING: Brace imbalance detected! Attempting auto-fix...`);
    // If positive, we need to close braces
    if (braceCount > 0) {
      const closing = '}'.repeat(braceCount);
      // Insert before the very end
      const trimmed = fixedContent.trimEnd();
      const fixed2 = trimmed + closing + '\n';
      fs.writeFileSync(fp, fixed2, 'utf-8');
      console.log(`  Added ${braceCount} closing braces`);
    }
  } else {
    fs.writeFileSync(fp, fixedContent, 'utf-8');
    console.log(`  [OK] Fixed and saved`);
  }

  // Verify by checking if the file can be parsed
  try {
    // Quick validation: check export default pattern and try JSON parse
    const saved = fs.readFileSync(fp, 'utf-8');
    const jsonStr = saved.replace(/^export\s+default\s+/, '').replace(/;\s*$/, '').trim();
    JSON.parse(jsonStr);
    console.log(`  [VALIDATED] JSON parse successful`);
  } catch (e) {
    console.log(`  [VALIDATION FAILED] ${e.message.substring(0, 100)}`);
    // Try to find the error position
    const saved = fs.readFileSync(fp, 'utf-8');
    const jsonStr = saved.replace(/^export\s+default\s+/, '').replace(/;\s*$/, '').trim();
    const pos = parseInt((e.message.match(/position (\d+)/) || [])[1] || '0');
    if (pos > 0) {
      console.log(`  Error context: ...${jsonStr.substring(Math.max(0, pos - 50), pos)}<<<HERE>>>${jsonStr.substring(pos, pos + 50)}...`);
    }
  }
});

console.log('\nDone!');
