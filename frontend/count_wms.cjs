// Count exact "wms": occurrences (as object key) in ja.js
const c = require('fs').readFileSync('src/i18n/locales/ja.js', 'utf8');
let count = 0, p = 0;
const search = '"wms":';
while (true) {
    p = c.indexOf(search, p);
    if (p === -1) break;
    count++;
    // Show what follows: { means object, " means string
    const after = c.substring(p, p + 30);
    console.log('#' + count + ' pos:' + p + ' -> ' + after);
    p += search.length;
}
console.log('\nTotal "wms": occurrences:', count);

// If count > 1, the SECOND one overwrites the first in JS parsing!
// In JSON, duplicate keys → last wins
