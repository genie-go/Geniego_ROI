const fs = require('fs');
const c = fs.readFileSync('d:/project/GeniegoROI/frontend/src/i18n/locales/ko.js', 'utf-8');

// The locale file exports: export default { ... }
// Find if there's already a top-level "orderHub" object (not a string value)
// Locate the main export default object start
const expIdx = c.indexOf('export default');
const mainObjStart = c.indexOf('{', expIdx);

// Parse top-level keys
let depth = 0; let keyStart = -1; let topKeys = [];
for (let i = mainObjStart; i < c.length; i++) {
    if (c[i] === '{') { depth++; if (depth === 1) keyStart = i + 1; }
    if (c[i] === '}') { depth--; if (depth === 0) break; }
    if (depth === 1 && c[i] === '"') {
        const end = c.indexOf('"', i + 1);
        const key = c.substring(i + 1, end);
        topKeys.push(key);
        i = end;
    }
}

console.log('Top-level keys:', topKeys.length);
topKeys.forEach(k => console.log('  ', k));

// Check if orderHub exists as top-level key
const hasOH = topKeys.includes('orderHub');
console.log('\norderHub as top-level key:', hasOH);

// Find the exact position of the first "orderHub" after export default
const afterExport = c.substring(mainObjStart);
const ohIdx = afterExport.indexOf('"orderHub"');
if (ohIdx > -1) {
    const ctx = afterExport.substring(ohIdx, ohIdx + 80);
    console.log('Context:', JSON.stringify(ctx));
    // Check if it's followed by : { (object) or : " (string)
    const afterColon = afterExport.substring(ohIdx + 12, ohIdx + 15).trim();
    console.log('After colon:', JSON.stringify(afterColon), afterColon.startsWith('{') ? 'OBJECT' : 'STRING');
}
