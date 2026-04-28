const fs = require('fs');
const src = fs.readFileSync('src/i18n/locales/ko.js', 'utf8');

// Find campaignMgr start
const cmStart = src.indexOf('"campaignMgr"');
const firstBrace = src.indexOf('{', cmStart);

// Properly count depth considering strings (skip content inside quotes)
let depth = 0, end = -1;
let inStr = false, escape = false;
for(let i = firstBrace; i < src.length; i++) {
  const c = src[i];
  if(escape) { escape = false; continue; }
  if(c === '\\') { escape = true; continue; }
  if(c === '"') { inStr = !inStr; continue; }
  if(inStr) continue;
  if(c === '{' || c === '[') depth++;
  if(c === '}' || c === ']') { depth--; if(depth === 0) { end = i; break; } }
}

console.log('campaignMgr section: char', firstBrace, 'to', end);
console.log('Section length:', end - firstBrace);

// Now extract just that block and check
const block = src.substring(firstBrace, end + 1);
try {
  const parsed = JSON.parse(block);
  const allKeys = Object.keys(parsed);
  console.log('Total keys after JSON.parse:', allKeys.length);
  console.log('Has guideStep1Title?', 'guideStep1Title' in parsed);
  console.log('Has tabCreative?', 'tabCreative' in parsed);
  console.log('Last 5 keys:', allKeys.slice(-5));
} catch(e) {
  console.log('Parse error:', e.message);
}
