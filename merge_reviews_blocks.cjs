/**
 * Merge all duplicate reviews:{} blocks in locale files into a single block.
 * Same strategy as the influencer module fix.
 */
const fs = require('fs');
const path = require('path');
const DIR = path.join(__dirname, 'frontend/src/i18n/locales');
const LANGS = ['ko','en','ja','zh','zh-TW','de','th','vi','id'];

function findBlockEnd(code, startBrace) {
  let depth = 0, inStr = false, esc = false;
  for (let i = startBrace; i < code.length; i++) {
    const ch = code[i];
    if (esc) { esc = false; continue; }
    if (ch === '\\' && inStr) { esc = true; continue; }
    if (inStr) { if (ch === '"') inStr = false; continue; }
    if (ch === '"') { inStr = true; continue; }
    if (ch === '{') depth++;
    if (ch === '}') { depth--; if (depth === 0) return i; }
  }
  return -1;
}

LANGS.forEach(lang => {
  const file = path.join(DIR, `${lang}.js`);
  let code = fs.readFileSync(file, 'utf8');
  
  // Find all reviews:{ blocks
  const blocks = [];
  let searchFrom = 0;
  while (true) {
    const idx = code.indexOf('reviews:{', searchFrom);
    if (idx < 0) break;
    const braceStart = idx + 8;
    const braceEnd = findBlockEnd(code, braceStart);
    if (braceEnd < 0) break;
    // Extract keys inside the braces (without outer {})
    const inner = code.substring(braceStart + 1, braceEnd);
    blocks.push({ start: idx, end: braceEnd, inner });
    searchFrom = braceEnd + 1;
  }
  
  if (blocks.length <= 1) {
    console.log(`${lang}: ${blocks.length} reviews block(s) - no merge needed`);
    return;
  }
  
  console.log(`${lang}: Found ${blocks.length} reviews blocks - MERGING...`);
  
  // Parse all keys from all blocks
  const allKeys = new Map();
  for (const block of blocks) {
    // Simple key:value parser
    const content = block.inner;
    const regex = /([a-zA-Z_][a-zA-Z0-9_]*):"((?:[^"\\]|\\.)*)"/g;
    let m;
    while ((m = regex.exec(content)) !== null) {
      allKeys.set(m[1], m[2]);
    }
  }
  
  console.log(`  Total unique keys: ${allKeys.size}`);
  
  // Build merged block
  const mergedEntries = Array.from(allKeys.entries())
    .map(([k, v]) => `${k}:"${v}"`)
    .join(',');
  const mergedBlock = `reviews:{${mergedEntries}}`;
  
  // Remove all reviews blocks from code (work backwards to preserve indices)
  const blocksReversed = [...blocks].reverse();
  for (const block of blocksReversed) {
    // Check for leading comma
    let removeStart = block.start;
    if (removeStart > 0 && code[removeStart - 1] === ',') removeStart--;
    code = code.substring(0, removeStart) + code.substring(block.end + 1);
  }
  
  // Insert merged block before the final closing }
  const lastBrace = code.lastIndexOf('}');
  code = code.substring(0, lastBrace) + ',' + mergedBlock + code.substring(lastBrace);
  
  fs.writeFileSync(file, code, 'utf8');
  
  // Verify
  try {
    const fn = new Function(code.replace('export default', 'return'));
    const obj = fn();
    const count = obj.reviews ? Object.keys(obj.reviews).length : 0;
    const hasGuide = !!(obj.reviews || {}).guideTitle;
    const hasTabs = !!(obj.reviews || {}).tabDashboard;
    console.log(`  ✅ ${count} reviews keys, guideTitle=${hasGuide}, tabDashboard=${hasTabs}`);
  } catch (e) {
    console.log(`  ❌ PARSE ERROR: ${e.message.substring(0, 100)}`);
  }
});
