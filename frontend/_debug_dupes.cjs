const fs = require('fs');
const src = fs.readFileSync('src/i18n/locales/ko.js', 'utf8');

// Count occurrences of guideTitle in the file
const matches = src.match(/"guideTitle"/g);
console.log('guideTitle occurrences:', matches ? matches.length : 0);

// The problem: original campaignMgr already has guideTitle, guideSub, guideStepsTitle, guideTabsTitle, guideTipsTitle, guideTip1-5
// But the STEP titles (guideStep1Title etc) were missing
// My injection added all 38 keys but some already existed = duplicates
// JS object last-wins for duplicates, so the new values may or may not overwrite

// Check for duplicates in campaignMgr
const cmStart = src.indexOf('"campaignMgr"');
const firstBrace = src.indexOf('{', cmStart);
let depth = 0, end = -1, inStr = false, esc = false;
for(let i = firstBrace; i < src.length; i++) {
  const c = src[i];
  if(esc) { esc = false; continue; }
  if(c === '\\') { esc = true; continue; }
  if(c === '"') { inStr = !inStr; continue; }
  if(inStr) continue;
  if(c === '{' || c === '[') depth++;
  if(c === '}' || c === ']') { depth--; if(depth === 0) { end = i; break; } }
}

const block = src.substring(firstBrace, end + 1);
const allKeys = [];
const re = /"([a-zA-Z0-9_]+)"\s*:/g;
let m;
while((m = re.exec(block)) !== null) {
  allKeys.push(m[1]);
}

// Find duplicates
const seen = {};
const dupes = [];
for(const k of allKeys) {
  if(seen[k]) dupes.push(k);
  seen[k] = true;
}
console.log('Total key references:', allKeys.length);
console.log('Unique keys:', Object.keys(seen).length);
console.log('Duplicates:', dupes.length);
if(dupes.length > 0) console.log('Duplicate keys:', dupes.slice(0, 10).join(', '));
