const fs = require('fs');
const c = fs.readFileSync('src/i18n/locales/en.js', 'utf8');
const idx = c.indexOf('.pricing');
if (idx < 0) { console.log('no pricing section'); process.exit(0); }
const section = c.slice(idx, idx + 3000);
console.log(section.slice(0, 2000));
