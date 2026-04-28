// Force fresh read
const path = require('path');
const fullPath = path.resolve('src/i18n/locales/ko.js');
Object.keys(require.cache).forEach(k => delete require.cache[k]);
const m = require(fullPath);
const def = m.default || m;
console.log('campaignMgr keys:', Object.keys(def.campaignMgr || {}).length);
console.log('Has guideStep1Title?', 'guideStep1Title' in (def.campaignMgr || {}));

// Try eval approach
const fs = require('fs');
const src = fs.readFileSync(fullPath, 'utf8');
// The file uses export default {...} - extract the object
const objStart = src.indexOf('export default ') + 'export default '.length;
const objStr = src.substring(objStart);
// Parse as JSON-like
try {
  const fn = new Function('return ' + objStr);
  const obj = fn();
  console.log('Eval campaignMgr keys:', Object.keys(obj.campaignMgr || {}).length);
  console.log('Eval has guideStep1Title?', 'guideStep1Title' in (obj.campaignMgr || {}));
} catch(e) {
  console.log('Eval error:', e.message.substring(0, 200));
}
