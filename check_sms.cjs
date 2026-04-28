const fs = require('fs');
const c = fs.readFileSync('frontend/src/i18n/locales/ko.js', 'utf8');
// Find "sms" namespace block (not the node type label)
// The i18n engine uses dot notation: t('sms.tabCompose') looks for key 'tabCompose' inside 'sms' block
// Let's find the sms: {...} block
const match = c.match(/"sms"\s*:\s*\{/g);
console.log('sms block matches:', match?.length);

// Find first match that's actually the namespace block (large one)
let pos = 0;
let blockIdx = -1;
while (true) {
  const idx = c.indexOf('"sms":{', pos);
  const idx2 = c.indexOf('"sms": {', pos);
  const found = idx >= 0 ? idx : idx2;
  if (found < 0) break;
  // Check what comes after - is it big?
  const snippet = c.substring(found, found + 200);
  console.log(`Found at ${found}: ${snippet.substring(0, 100)}`);
  pos = found + 5;
  if (snippet.includes('tabCompose')) { blockIdx = found; break; }
}

if (blockIdx >= 0) {
  // Find the end of the block
  let depth = 0;
  let endIdx;
  for (let i = blockIdx; i < c.length; i++) {
    if (c[i] === '{') depth++;
    if (c[i] === '}') { depth--; if (depth === 0) { endIdx = i; break; } }
  }
  const block = c.substring(blockIdx, endIdx+1);
  console.log('\nSMS BLOCK LENGTH:', block.length);
  console.log('Contains guideStep1Title:', block.includes('guideStep1Title'));
  console.log('Contains ihubLinked:', block.includes('ihubLinked'));
  console.log('Last 200 chars:', block.substring(block.length-200));
}
