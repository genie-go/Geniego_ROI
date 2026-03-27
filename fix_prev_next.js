const fs = require('fs');
let c = fs.readFileSync('frontend/src/pages/CRM.jsx', 'utf8');

c = c.replace(/>Previous</g, ">이전<");
c = c.replace(/>Next</g, ">다음<");

fs.writeFileSync('frontend/src/pages/CRM.jsx', c);
console.log('done');
