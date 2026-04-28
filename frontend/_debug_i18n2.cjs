const m = require('./src/i18n/locales/ko.js').default;
const keys = Object.keys(m.campaignMgr || {});
console.log('Total keys:', keys.length);
console.log('Has guideStep1Title?', keys.includes('guideStep1Title'));
console.log('Has tabCreative?', keys.includes('tabCreative'));

// Check if JSON.parse can find them
const fs = require('fs');
const src = fs.readFileSync('src/i18n/locales/ko.js', 'utf8');
// Extract the campaignMgr block
const start = src.indexOf('"campaignMgr"');
const brace = src.indexOf('{', start);
let depth = 0, end = -1;
for(let i=brace;i<src.length;i++){
  if(src[i]==='{')depth++;
  if(src[i]==='}'){depth--;if(depth===0){end=i;break;}}
}
const block = src.substring(brace, end+1);
try {
  const parsed = JSON.parse(block);
  console.log('Parsed keys:', Object.keys(parsed).length);
  console.log('Has guideStep1Title?', 'guideStep1Title' in parsed);
} catch(e) {
  console.log('Parse error:', e.message.substring(0, 100));
  // Find the position of error
  const errPos = parseInt(e.message.match(/position (\d+)/)?.[1] || '0');
  if(errPos) console.log('At:', block.substring(errPos-30, errPos+30));
}
