// Find which "marketing": { blocks are at root level (indent 2) vs nested (indent 4+)
const fs = require('fs');
const s = fs.readFileSync('./src/i18n/locales/ko.js', 'utf8');
const lines = s.split('\n');
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('"marketing"') && lines[i].includes('{')) {
    const indent = lines[i].search(/\S/);
    console.log(`Line ${i+1} (indent ${indent}): ${lines[i].trim().substring(0,60)}`);
    if (i+1 < lines.length) console.log(`  Next: ${lines[i+1].trim().substring(0,60)}`);
  }
}
