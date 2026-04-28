/**
 * Final comprehensive locale fix:
 * Current state after phases 1-2:
 *   Line 1: export default {...JSON...}} (extra closing braces added by phase 1)
 *   Line 2: },"alertAuto":{...rest namespaces...} (orphaned content)
 *
 * Fix: Remove the extra closing braces from line 1 end, then merge with line 2
 *       to create a single valid JSON export.
 */
const fs = require('fs');
const path = require('path');

const LOCALE_DIR = path.join(__dirname, 'src', 'i18n', 'locales');
const LANGS = ['ko', 'en', 'ja', 'zh', 'zh-TW', 'de', 'th', 'vi', 'id'];

LANGS.forEach(lang => {
  const fp = path.join(LOCALE_DIR, lang + '.js');
  const c = fs.readFileSync(fp, 'utf-8');
  const lines = c.split('\n');

  console.log(`[${lang}] Lines: ${lines.length}, L1 len: ${lines[0].length}`);

  if (lines.length < 2 || lines[1].trim().length === 0) {
    // Try to validate as-is
    try {
      const jsonStr = c.replace(/^export\s+default\s+/, '').replace(/;\s*$/, '').trim();
      JSON.parse(jsonStr);
      console.log(`  Already valid, skip`);
      return;
    } catch(e) {
      console.log(`  Single line but invalid: ${e.message.substring(0,80)}`);
    }
  }

  // Strategy: merge all lines into one, then parse & re-serialize
  // First, get the raw content after 'export default '
  const fullContent = lines.join('');
  const match = fullContent.match(/^export\s+default\s+([\s\S]+)$/);
  if (!match) {
    console.log(`  ERROR: Cannot find 'export default' prefix`);
    return;
  }

  let jsonBody = match[1].replace(/;\s*$/, '').trim();

  // The issue: line 1 ends with }} but then line 2 starts with },"alertAuto":...
  // This means we have: {...}},"alertAuto":{...}...}
  // The double }} at the junction is wrong - we need to remove the extra closing braces
  // that were added by phase 1

  // Approach: try to find where the JSON becomes invalid and fix iteratively
  // Better approach: find the }} pattern followed by }, which is the junction point

  // Find all occurrences of the pattern }},"  which could be the spurious junction
  // Actually, let's just try a smarter approach: 
  // Parse character by character tracking brace depth, find where it hits 0 (JSON end)
  // and check if there's more content after

  let depth = 0;
  let inString = false;
  let escape = false;
  let jsonEndPos = -1;

  for (let i = 0; i < jsonBody.length; i++) {
    const ch = jsonBody[i];

    if (escape) {
      escape = false;
      continue;
    }

    if (ch === '\\' && inString) {
      escape = true;
      continue;
    }

    if (ch === '"') {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (ch === '{') depth++;
    if (ch === '}') {
      depth--;
      if (depth === 0) {
        jsonEndPos = i;
        break;
      }
    }
  }

  if (jsonEndPos < 0) {
    console.log(`  ERROR: Could not find JSON end`);
    return;
  }

  const mainJson = jsonBody.substring(0, jsonEndPos + 1);
  const remainder = jsonBody.substring(jsonEndPos + 1).trim();

  if (remainder.length === 0) {
    console.log(`  No remainder, validating main JSON...`);
  } else {
    console.log(`  Found remainder after JSON end (${remainder.length} chars): ${remainder.substring(0, 80)}...`);

    // The remainder should be: ,"alertAuto":{...},...} or similar
    // It needs to be merged INSIDE the main JSON object
    // Remove the leading comma if present
    let extra = remainder;
    if (extra.startsWith(',')) extra = extra.substring(1);
    // Remove trailing closing brace (which closes the outer object we already closed)
    // Actually no - the remainder has its own structure
    // The remainder like: ,"alertAuto":{...},...,"demandForecast":{...}}
    // needs to go inside the main JSON before the final }

    // Insert remainder inside the main JSON: before the last }
    jsonBody = mainJson.substring(0, mainJson.length - 1) + ',' + extra;

    // Now check if the new jsonBody is balanced
    depth = 0;
    inString = false;
    escape = false;
    for (let i = 0; i < jsonBody.length; i++) {
      const ch = jsonBody[i];
      if (escape) { escape = false; continue; }
      if (ch === '\\' && inString) { escape = true; continue; }
      if (ch === '"') { inString = !inString; continue; }
      if (inString) continue;
      if (ch === '{') depth++;
      if (ch === '}') depth--;
    }

    console.log(`  After merge, brace balance: ${depth}`);

    if (depth > 0) {
      jsonBody += '}'.repeat(depth);
      console.log(`  Added ${depth} closing braces`);
    } else if (depth < 0) {
      // Remove extra closing braces from the end
      let toRemove = Math.abs(depth);
      while (toRemove > 0 && jsonBody.endsWith('}')) {
        jsonBody = jsonBody.slice(0, -1);
        toRemove--;
      }
      console.log(`  Removed ${Math.abs(depth)} extra closing braces`);
    }
  }

  // Final validation
  try {
    JSON.parse(jsonBody);
    console.log(`  [VALIDATED] JSON is valid!`);
  } catch (e) {
    console.log(`  [STILL INVALID] ${e.message.substring(0, 120)}`);
    const pos = parseInt((e.message.match(/position (\d+)/) || [])[1] || '0');
    if (pos > 0) {
      console.log(`  Context: ...${jsonBody.substring(Math.max(0, pos - 60), pos)}<<<HERE>>>${jsonBody.substring(pos, pos + 60)}...`);
    }
    // Don't save if invalid
    return;
  }

  // Save the fixed file
  const fixed = 'export default ' + jsonBody + '\n';
  fs.writeFileSync(fp, fixed, 'utf-8');
  console.log(`  [SAVED] ${fp}`);

  // Count top-level keys
  const obj = JSON.parse(jsonBody);
  console.log(`  Top-level namespaces: ${Object.keys(obj).length} -> ${Object.keys(obj).join(', ')}`);
});

console.log('\n=== All done! ===');
