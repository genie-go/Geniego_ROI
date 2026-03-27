const fs = require('fs');
let c = fs.readFileSync('frontend/src/pages/ChannelKPI.jsx', 'utf8');

c = c.replace(/ph: '3.0'/g, "ph: '0.0'");
c = c.replace(/ph: '5.0'/g, "ph: '0.0'");
c = c.replace(/ph: '15000'/g, "ph: '0'");
c = c.replace(/ph: '300'/g, "ph: '0'");
c = c.replace(/ph: '1000'/g, "ph: '0'");

fs.writeFileSync('frontend/src/pages/ChannelKPI.jsx', c);
console.log('done');
