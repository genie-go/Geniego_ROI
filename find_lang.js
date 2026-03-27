const fs = require('fs');
let lines = fs.readFileSync('frontend/src/pages/CRM.jsx', 'utf8').split('\n');
lines.forEach((l, i) => {
  if (/c_[0-9]+/i.test(l)) {
    console.log(i + ': ' + l.trim());
  }
});
