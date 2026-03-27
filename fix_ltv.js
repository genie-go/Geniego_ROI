const fs = require('fs');
let c = fs.readFileSync('frontend/src/pages/Attribution.jsx', 'utf8');

c = c.replace(
  /v:\(\(totalLtv-totalCac\)\/totalCac\*100\)\.toFixed\(0\)\+'/g,
  "v: totalCac > 0 ? ((totalLtv-totalCac)/totalCac*100).toFixed(0)+'%' : '0'"
);

fs.writeFileSync('frontend/src/pages/Attribution.jsx', c);
console.log('done');
