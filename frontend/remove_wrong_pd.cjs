const fs = require('fs');
const path = require('path');

const LOCALE_FILES = {
  ko: 'src/i18n/locales/ko.js',
  en: 'src/i18n/locales/en.js',
  ja: 'src/i18n/locales/ja.js',
  zh: 'src/i18n/locales/zh.js',
  de: 'src/i18n/locales/de.js',
  th: 'src/i18n/locales/th.js',
  vi: 'src/i18n/locales/vi.js',
  id: 'src/i18n/locales/id.js',
  'zh-TW': 'src/i18n/locales/zh-TW.js',
};

// Remove any existing pricingDetail (wherever it is) and reinsert at the correct position
// The correct position is just before the VERY FIRST "};" in the file 
// (which closes the main const object, at indentation level 0)

function findMainConstClose(content) {
  // The main const close is the first "}\n;" or "};\n" at column 0
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i] === '};') {
      // Verify this is the main object close (not nested)
      return i;
    }
  }
  return -1;
}

for (const [lang, fp] of Object.entries(LOCALE_FILES)) {
  if (!fs.existsSync(fp)) continue;
  let c = fs.readFileSync(fp, 'utf8');

  // Step 1: Remove existing pricingDetail block (wherever it is)
  // Find "pricingDetail:" and remove everything from there to the matching closing
  // This is complex, so instead remove any line matching:
  // "en.pricing = en.pricing || {  pricingDetail:" pattern
  
  // First remove the entire block we inserted in wrong place
  // The block starts with "  pricingDetail: {" and ends with a matching "}," 
  // We look for "pricingDetail:" in any form
  const pdIdx = c.indexOf('pricingDetail:');
  if (pdIdx >= 0) {
    // Find start of this block (back to nearest line start)
    let blockStart = pdIdx;
    while (blockStart > 0 && c[blockStart-1] !== '\n') blockStart--;
    
    // Find the matching end by counting braces
    let depth = 0;
    let i = pdIdx;
    while (i < c.length) {
      if (c[i] === '{') depth++;
      else if (c[i] === '}') {
        depth--;
        if (depth === 0) break;
      }
      i++;
    }
    // Include the closing comma/newline
    let blockEnd = i + 1;
    while (blockEnd < c.length && (c[blockEnd] === ',' || c[blockEnd] === '\n' || c[blockEnd] === '\r')) {
      blockEnd++;
      if (c[blockEnd-1] === '\n') break;
    }
    
    const removed = c.slice(blockStart, blockEnd);
    console.log(`${lang}: Removing block at ${blockStart}-${blockEnd}:`);
    console.log('  >', removed.slice(0, 80));
    
    // Also check if the line before blockStart is now "en.pricing = en.pricing || {" without content
    let lineBeforeStart = blockStart;
    while (lineBeforeStart > 0 && c[lineBeforeStart-1] !== '\n') lineBeforeStart--;
    const lineBeforeContent = c.slice(lineBeforeStart, blockStart);
    console.log('  line before:', JSON.stringify(lineBeforeContent).slice(0, 60));
    
    c = c.slice(0, blockStart) + c.slice(blockEnd);
  }

  // Step 2: Fix any dangling "en.pricing = en.pricing || {" without content
  // Look for patterns like "var = var || {  \n" or "var = var || {  \r\n" 
  c = c.replace(/([a-zA-Z_$][a-zA-Z0-9_$]*\.pricing = [a-zA-Z_$][a-zA-Z0-9_$]*\.pricing \|\| \{)\s*\n/g, 
    (match, p1) => p1 + '\n');
  // Also remove completely empty Object.assign wrappers
  c = c.replace(/[a-zA-Z_$][a-zA-Z0-9_$]*\.pricing = Object\.assign\([a-zA-Z_$][a-zA-Z0-9_$]*\.pricing \|\| \{\}, \{\s*\n\s*\}\);\n/g, '');
  c = c.replace(/[a-zA-Z_$][a-zA-Z0-9_$]*\.pricing = [a-zA-Z_$][a-zA-Z0-9_$]*\.pricing \|\| \{\s*\};\n/g, '');

  fs.writeFileSync(fp, c, 'utf8');
  console.log(`✅ ${lang}: cleaned`);
}

console.log('\nNow use add_pricing_toplevel.cjs to add pricingDetail at top level');
