const fs = require('fs');

// Check what cat_beauty etc look like in zh and de
const c = fs.readFileSync('src/i18n/locales/zh.js', 'utf8');
const idx = c.indexOf('cat_beauty');
if (idx >= 0) console.log('zh cat_beauty:', c.slice(idx, idx+50));

const de = fs.readFileSync('src/i18n/locales/de.js', 'utf8');
const idx2 = de.indexOf('cat_beauty');
if (idx2 >= 0) console.log('de cat_beauty:', de.slice(idx2, idx2+50));

// Also check tag keys
const idx3 = c.indexOf('tag_skincare');
if (idx3 >= 0) console.log('zh tag_skincare:', c.slice(idx3, idx3+50));
