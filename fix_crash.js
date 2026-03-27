const fs = require('fs');
let c = fs.readFileSync('frontend/src/pages/ChannelKPI.jsx', 'utf8');

c = c.replace(
  /const latest = DATA\[DATA.length - 1\];/g,
  "const latest = DATA.length ? DATA[DATA.length - 1] : { views: 0, visitors: 0, avgTime: 0, searchIn: 0 };"
);

fs.writeFileSync('frontend/src/pages/ChannelKPI.jsx', c);
console.log('done');
