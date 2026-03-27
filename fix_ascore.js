const fs = require('fs');
let c = fs.readFileSync('frontend/src/pages/Attribution.jsx', 'utf8');

c = c.replace(
  /const score = Math\.max\(0, Math\.min\(100, Math\.round\(100 - std \* 4\)\)\);/g,
  "const score = mean === 0 ? 0 : Math.max(0, Math.min(100, Math.round(100 - std * 4)));"
);

fs.writeFileSync('frontend/src/pages/Attribution.jsx', c);
console.log('done');
