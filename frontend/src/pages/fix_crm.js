
const fs = require('fs');
let c = fs.readFileSync('frontend/src/pages/CRM.jsx', 'utf8');

c = c.replace(/stats: demoRfm\.stats \|\| \{ champions: 127, loyal: 345, at_risk: 412, lost: 89, new: 234 \},/g, "stats: demoRfm.stats || { champions: 0, loyal: 0, at_risk: 0, lost: 0, new: 0 },");

const startIdx = c.indexOf('const DEMO_AI_SEGMENTS = [');
if (startIdx !== -1) {
  const endIdx = c.indexOf('];', startIdx);
  if (endIdx !== -1) {
    c = c.substring(0, startIdx) + 'const DEMO_AI_SEGMENTS = [];' + c.substring(endIdx + 2);
  }
}
fs.writeFileSync('frontend/src/pages/CRM.jsx', c);
console.log('done');
