const fs = require('fs');
const c = fs.readFileSync('d:/project/GeniegoROI/frontend/dist/assets/AutoMarketing-CnB4gXYw.js', 'utf8');
const i = c.indexOf('am-active');
if (i >= 0) {
  console.log(c.substring(i - 100, i + 200));
} else {
  console.log('NOT FOUND');
}
