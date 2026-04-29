// Check ar, hi, pt, ru for their marketing block structure
const fs = require('fs');
const path = require('path');

const localeDir = path.join(__dirname, 'src', 'i18n', 'locales');
['ar.js', 'hi.js', 'pt.js', 'ru.js'].forEach(file => {
  const s = fs.readFileSync(path.join(localeDir, file), 'utf8');
  const lines = s.split('\n');
  console.log(`\n=== ${file} ===`);
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('"marketing"') && lines[i].includes('{')) {
      const indent = lines[i].search(/\S/);
      console.log(`  Line ${i+1} (indent ${indent}): ${lines[i].trim().substring(0,60)}`);
      if (i+1 < lines.length) console.log(`    Next: ${lines[i+1].trim().substring(0,60)}`);
    }
  }
  // Check total lines
  console.log(`  Total lines: ${lines.length}`);
});
