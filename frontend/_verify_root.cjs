// Quick check: does en.js ROOT marketing block have gf1Title?
const fs = require('fs');
const path = require('path');

const localeDir = path.join(__dirname, 'src', 'i18n', 'locales');
const files = fs.readdirSync(localeDir).filter(f => f.endsWith('.js'));

files.forEach(file => {
  const s = fs.readFileSync(path.join(localeDir, file), 'utf8');
  const lines = s.split('\n');
  
  // Find root marketing (indent 2-4 with metImpressions or gf1Title)
  let rootMktLine = -1;
  for (let i = 0; i < lines.length; i++) {
    const indent = lines[i].search(/\S/);
    if (indent <= 4 && lines[i].trim().startsWith('"marketing"') && lines[i].includes('{')) {
      const nextLines = lines.slice(i+1, i+50).join('\n');
      if (nextLines.includes('metImpressions') || nextLines.includes('pageTitle') || nextLines.includes('gf1Title')) {
        rootMktLine = i;
        break;
      }
    }
  }
  
  if (rootMktLine === -1) {
    // Check if any "marketing": { at indent 2 exists
    for (let i = 0; i < lines.length; i++) {
      const indent = lines[i].search(/\S/);
      if (indent === 2 && lines[i].trim().startsWith('"marketing"') && lines[i].includes('{')) {
        rootMktLine = i;
        break;
      }
    }
  }
  
  if (rootMktLine === -1) {
    console.log(`❌ ${file}: NO root marketing block`);
    return;
  }
  
  // Check if gf1Title is inside this block
  let depth = 0;
  let found = false;
  for (let i = rootMktLine; i < lines.length; i++) {
    for (const ch of lines[i]) {
      if (ch === '{') depth++;
      if (ch === '}') depth--;
    }
    if (lines[i].includes('"gf1Title"')) {
      found = true;
    }
    if (depth === 0 && i > rootMktLine) break;
  }
  
  console.log(`${found ? '✅' : '❌'} ${file}: root marketing at line ${rootMktLine+1}, gf1Title: ${found ? 'YES' : 'MISSING'}`);
});
