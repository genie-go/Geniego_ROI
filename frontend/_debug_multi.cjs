const fs = require('fs');
const src = fs.readFileSync('src/i18n/locales/ko.js', 'utf8');

// Find ALL occurrences of "campaignMgr"
let idx = 0, positions = [];
while((idx = src.indexOf('"campaignMgr"', idx)) !== -1) {
  positions.push(idx);
  idx++;
}
console.log('Total "campaignMgr" occurrences:', positions.length);

// For each, find the brace-counted end
for(const pos of positions) {
  const brace = src.indexOf('{', pos);
  let depth = 0, end = -1, inStr = false, esc = false;
  for(let i = brace; i < src.length; i++) {
    const c = src[i];
    if(esc) { esc = false; continue; }
    if(c === '\\') { esc = true; continue; }
    if(c === '"') { inStr = !inStr; continue; }
    if(inStr) continue;
    if(c === '{' || c === '[') depth++;
    if(c === '}' || c === ']') { depth--; if(depth === 0) { end = i; break; } }
  }
  const block = src.substring(brace, end+1);
  // Count keys in first level
  const kcount = (block.match(/"[a-zA-Z0-9_]+":/g) || []).length;
  const hasGuide = block.includes('guideStep1Title');
  console.log(`  pos ${pos}: ${kcount} keys, hasGuide=${hasGuide}, ends at ${end}`);
}

// Now check: which occurrence is in the RIGHT place (top-level export)?
// The top-level export should be the first { after "export default"
const exportIdx = src.indexOf('export default');
console.log('\nexport default at:', exportIdx);
// Find the correct campaignMgr that is a child of this top-level object
const topBrace = src.indexOf('{', exportIdx);
console.log('Top-level { at:', topBrace);
