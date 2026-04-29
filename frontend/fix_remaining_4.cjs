/**
 * Fix remaining 4 locales (ar, hi, pt, ru) - inject guide keys at their
 * root marketing block at line ~176
 */
const fs = require('fs');
const path = require('path');

const localeDir = path.join(__dirname, 'src', 'i18n', 'locales');

// Get guide keys from ko.js's "g": { block as a reference
const koSrc = fs.readFileSync(path.join(localeDir, 'ko.js'), 'utf8');

// For these 4 languages, we'll use the ENGLISH g-block keys since they may not have localized ones
const enSrc = fs.readFileSync(path.join(localeDir, 'en.js'), 'utf8');

const files = ['ar.js', 'hi.js', 'pt.js', 'ru.js'];

files.forEach(file => {
  const fp = path.join(localeDir, file);
  let src = fs.readFileSync(fp, 'utf8');
  const lines = src.split('\n');
  
  // Find root marketing block (indent 2)
  let rootMktLine = -1;
  for (let i = 0; i < lines.length; i++) {
    const indent = lines[i].search(/\S/);
    if (indent === 2 && lines[i].trim().startsWith('"marketing"') && lines[i].includes('{')) {
      rootMktLine = i;
      break;
    }
  }
  
  if (rootMktLine === -1) {
    console.log(`  ⚠️ ${file}: no root marketing found`);
    return;
  }
  
  // Extract keys from g block in this file
  const gBlockRegex = /"g"\s*:\s*\{([\s\S]*?)\n\s*\}/g;
  const gKeys = {};
  let gMatch;
  while ((gMatch = gBlockRegex.exec(src)) !== null) {
    const blockContent = gMatch[1];
    const kvRegex = /"([^"]+)"\s*:\s*"((?:[^"\\]|\\.)*)"/g;
    let kvMatch;
    while ((kvMatch = kvRegex.exec(blockContent)) !== null) {
      if (!gKeys[kvMatch[1]]) {
        gKeys[kvMatch[1]] = kvMatch[2];
      }
    }
  }
  
  // Check which keys are missing from root marketing
  let depth = 0;
  let rootMktEnd = rootMktLine;
  for (let i = rootMktLine; i < lines.length; i++) {
    for (const ch of lines[i]) {
      if (ch === '{') depth++;
      if (ch === '}') depth--;
    }
    if (depth === 0 && i > rootMktLine) {
      rootMktEnd = i;
      break;
    }
  }
  
  const rootMktContent = lines.slice(rootMktLine, rootMktEnd + 1).join('\n');
  
  const keysToInject = {};
  Object.keys(gKeys).forEach(k => {
    if (!rootMktContent.includes(`"${k}"`)) {
      keysToInject[k] = gKeys[k];
    }
  });
  
  if (Object.keys(keysToInject).length === 0) {
    console.log(`  ✅ ${file}: all keys present at root marketing`);
    return;
  }
  
  const indent = '    ';
  const injectionLines = Object.entries(keysToInject).map(([k, v]) => {
    return `${indent}"${k}": "${v}"`;
  });
  const injection = injectionLines.join(',\n') + ',';
  
  lines.splice(rootMktLine + 1, 0, injection);
  
  src = lines.join('\n');
  fs.writeFileSync(fp, src, 'utf8');
  totalInjected = Object.keys(keysToInject).length;
  console.log(`  ✅ ${file}: injected ${totalInjected} keys at ROOT marketing (line ${rootMktLine+1})`);
});
