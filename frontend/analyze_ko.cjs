// Analyze ko.js for duplicate keys that cause build failure
const fs = require('fs');
const src = fs.readFileSync('src/i18n/locales/ko.js', 'utf8');

// Find all top-level keys in the minified export default {...}
// The pattern is "keyName":{...} or "keyName":"value"
const keyRegex = /,"([a-zA-Z0-9_]+)":\s*[{"\[]/g;
const keys = {};
let match;
while ((match = keyRegex.exec(src)) !== null) {
  const key = match[1];
  if (!keys[key]) keys[key] = [];
  keys[key].push(match.index);
}

// Find duplicates
const dupes = Object.entries(keys).filter(([k, positions]) => positions.length > 1);
console.log('Total unique keys:', Object.keys(keys).length);
console.log('Duplicate keys:', dupes.length);
dupes.forEach(([key, positions]) => {
  console.log(`  "${key}" appears ${positions.length} times at positions: ${positions.join(', ')}`);
});
