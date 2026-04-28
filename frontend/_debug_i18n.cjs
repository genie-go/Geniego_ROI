const fs=require('fs');
const s=fs.readFileSync('src/i18n/locales/ko.js','utf8');

// Find all occurrences of guideStep1Title
let idx = 0;
let count = 0;
while((idx = s.indexOf('guideStep1Title', idx)) !== -1) {
  count++;
  // Check what section this is in - search backwards for nearest section key
  const before = s.substring(Math.max(0, idx-100), idx);
  console.log(`[${count}] Found at pos ${idx}, context before: ...${before.slice(-50)}`);
  idx++;
}
console.log(`Total occurrences: ${count}`);

// Check if the campaignMgr section has nested braces that confused the brace counter
const cmIdx = s.indexOf('"campaignMgr"');
const cmBrace = s.indexOf('{', cmIdx);
// Count chars to next }
let depth = 0, closes = [];
for(let i=cmBrace; i<Math.min(cmBrace+50000, s.length); i++) {
  if(s[i]==='{') depth++;
  if(s[i]==='}') { depth--; if(depth===0) { closes.push(i); break; } }
}
console.log('campaignMgr ends at:', closes[0]);
console.log('guideStep1Title first occurrence at:', s.indexOf('guideStep1Title'));
console.log('Is inside campaignMgr?', s.indexOf('guideStep1Title') < closes[0]);
