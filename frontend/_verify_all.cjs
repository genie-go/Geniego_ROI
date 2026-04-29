// Verify which locales have guide keys at ROOT marketing level
const fs = require('fs');
const path = require('path');

const localeDir = path.join(__dirname, 'src', 'i18n', 'locales');
const files = fs.readdirSync(localeDir).filter(f => f.endsWith('.js'));

files.forEach(file => {
  const s = fs.readFileSync(path.join(localeDir, file), 'utf8');
  const lines = s.split('\n');
  
  // Find root marketing block
  let rootMktLine = -1;
  for (let i = 0; i < lines.length; i++) {
    const indent = lines[i].search(/\S/);
    if (indent <= 4 && lines[i].trim().startsWith('"marketing"') && lines[i].includes('{')) {
      const nextLines = lines.slice(i+1, i+30).join('\n');
      // Root block should have marketing-specific keys
      if (nextLines.includes('metImpressions') || nextLines.includes('pageTitle') || nextLines.includes('gf1Title')) {
        rootMktLine = i;
        break;
      }
    }
  }
  
  if (rootMktLine === -1) {
    // Check if gf1Title exists anywhere
    let gf1Line = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('"gf1Title"')) {
        gf1Line = i;
        break;
      }
    }
    console.log(`❌ ${file}: no root marketing, gf1Title at line ${gf1Line+1} (indent ${gf1Line>=0 ? lines[gf1Line].search(/\\S/) : 'N/A'})`);
    return;
  }
  
  // Check if gf1Title is in root marketing block
  let depth = 0;
  let found = false;
  for (let i = rootMktLine; i < lines.length; i++) {
    for (const ch of lines[i]) {
      if (ch === '{') depth++;
      if (ch === '}') depth--;
    }
    if (lines[i].includes('"gf1Title"')) {
      found = true;
      break;
    }
    if (depth === 0 && i > rootMktLine) break;
  }
  
  console.log(`${found ? '✅' : '❌'} ${file}: root marketing at line ${rootMktLine+1}, gf1Title in block: ${found}`);
});
