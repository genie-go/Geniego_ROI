/**
 * FINAL-FINAL fix: inject guide keys into ROOT marketing for remaining 8 locales
 * de, en, es, fr, id, ja, th, vi
 */
const fs = require('fs');
const path = require('path');

const localeDir = path.join(__dirname, 'src', 'i18n', 'locales');
const targetFiles = ['de.js', 'en.js', 'es.js', 'fr.js', 'id.js', 'ja.js', 'th.js', 'vi.js'];

// Source: use ko.js's "g" block keys as reference, but we need localized versions
// Strategy: extract from each file's own "g" block

let totalInjected = 0;

targetFiles.forEach(file => {
  const fp = path.join(localeDir, file);
  let src = fs.readFileSync(fp, 'utf8');
  const lines = src.split('\n');
  
  // Step 1: Extract keys from ALL "g": { blocks in this file
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
  
  console.log(`  📋 ${file}: found ${Object.keys(gKeys).length} keys in "g" blocks`);
  
  if (Object.keys(gKeys).length === 0) {
    console.log(`  ⚠️ ${file}: no g-block keys to inject`);
    return;
  }
  
  // Step 2: Find ROOT marketing block 
  // For these large files, root marketing is at indent 2 and contains "metImpressions" or "pageTitle"
  let rootMktLine = -1;
  for (let i = 0; i < lines.length; i++) {
    const indent = lines[i].search(/\S/);
    if (indent === 2 && lines[i].trim().startsWith('"marketing"') && lines[i].includes('{')) {
      // Check next 200 lines for distinctive root marketing keys
      const nextLines = lines.slice(i+1, Math.min(i+200, lines.length)).join('\n');
      if (nextLines.includes('"metImpressions"') || nextLines.includes('"pageTitle"') || 
          nextLines.includes('"metSpend"') || nextLines.includes('"tabOverview"') ||
          nextLines.includes('"metClicks"')) {
        rootMktLine = i;
        break;
      }
    }
  }
  
  if (rootMktLine === -1) {
    // Try indent 4
    for (let i = 0; i < lines.length; i++) {
      const indent = lines[i].search(/\S/);
      if (indent <= 4 && lines[i].trim().startsWith('"marketing"') && lines[i].includes('{')) {
        const nextLines = lines.slice(i+1, Math.min(i+200, lines.length)).join('\n');
        if (nextLines.includes('"metImpressions"') || nextLines.includes('"pageTitle"') || 
            nextLines.includes('"metSpend"')) {
          rootMktLine = i;
          break;
        }
      }
    }
  }
  
  if (rootMktLine === -1) {
    console.log(`  ❌ ${file}: cannot find root marketing block with metImpressions/pageTitle`);
    return;
  }
  
  // Step 3: Check which keys are missing from root marketing block
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
    console.log(`  ✅ ${file}: all keys already present at root marketing (line ${rootMktLine+1})`);
    return;
  }
  
  // Step 4: Inject
  const indent = '    ';
  const injectionLines = Object.entries(keysToInject).map(([k, v]) => `${indent}"${k}": "${v}"`);
  const injection = injectionLines.join(',\n') + ',';
  
  lines.splice(rootMktLine + 1, 0, injection);
  src = lines.join('\n');
  fs.writeFileSync(fp, src, 'utf8');
  
  totalInjected += Object.keys(keysToInject).length;
  console.log(`  ✅ ${file}: injected ${Object.keys(keysToInject).length} keys at root marketing (line ${rootMktLine+1})`);
});

console.log(`\n📊 Total keys injected: ${totalInjected}`);
