/**
 * DEFINITIVE FIX v3: Force-inject guide keys into ROOT marketing for all 15 locales
 * 
 * Strategy: Instead of trying to parse brace depth, just search for gf1Title
 * within 2000 lines of the root marketing opening. If not found, inject.
 */
const fs = require('fs');
const path = require('path');

const localeDir = path.join(__dirname, 'src', 'i18n', 'locales');
const files = fs.readdirSync(localeDir).filter(f => f.endsWith('.js'));

let totalInjected = 0;

files.forEach(file => {
  const fp = path.join(localeDir, file);
  let src = fs.readFileSync(fp, 'utf8');
  const lines = src.split('\n');
  
  // Step 1: Extract guide keys from "g" blocks
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
  
  const guideKeyNames = Object.keys(gKeys).filter(k => 
    k.startsWith('gf') || k.startsWith('guide') || k.startsWith('cs')
  );
  
  if (guideKeyNames.length === 0) {
    console.log(`  ⬜ ${file}: no guide keys in g blocks`);
    return;
  }
  
  // Step 2: Find the ROOT marketing block that has "autoTitle" or "budgetSetup"
  let rootMktLine = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().startsWith('"marketing"') && lines[i].includes('{')) {
      // Check next 500 lines for distinctive keys
      const lookAhead = Math.min(i + 500, lines.length);
      let hasAutoTitle = false;
      for (let j = i + 1; j < lookAhead; j++) {
        if (lines[j].includes('"autoTitle"') || lines[j].includes('"budgetSetup"') || 
            lines[j].includes('"autoSub"')) {
          hasAutoTitle = true;
          break;
        }
      }
      if (hasAutoTitle) {
        rootMktLine = i;
        break;
      }
    }
  }
  
  if (rootMktLine === -1) {
    // Fallback: look for root marketing with metImpressions
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim().startsWith('"marketing"') && lines[i].includes('{')) {
        const lookAhead = Math.min(i + 200, lines.length);
        for (let j = i + 1; j < lookAhead; j++) {
          if (lines[j].includes('"metImpressions"')) {
            rootMktLine = i;
            break;
          }
        }
        if (rootMktLine !== -1) break;
      }
    }
  }
  
  if (rootMktLine === -1) {
    console.log(`  ⚠️ ${file}: no root marketing with autoTitle/metImpressions found`);
    return;
  }
  
  // Step 3: Check if gf1Title already exists within 500 lines AFTER root marketing opening
  const searchEnd = Math.min(rootMktLine + 500, lines.length);
  let gf1Found = false;
  for (let i = rootMktLine; i < searchEnd; i++) {
    if (lines[i].includes('"gf1Title"')) {
      gf1Found = true;
      break;
    }
  }
  
  if (gf1Found) {
    console.log(`  ✅ ${file}: gf1Title already in root marketing block (line ${rootMktLine+1})`);
    return;
  }
  
  // Step 4: Inject guide keys right after root marketing opening
  const keysToInject = {};
  guideKeyNames.forEach(k => {
    keysToInject[k] = gKeys[k];
  });
  
  const indent = '    ';
  const injectionLines = Object.entries(keysToInject).map(([k, v]) => `${indent}"${k}": "${v}"`);
  const injection = injectionLines.join(',\n') + ',';
  
  lines.splice(rootMktLine + 1, 0, injection);
  src = lines.join('\n');
  fs.writeFileSync(fp, src, 'utf8');
  
  totalInjected += Object.keys(keysToInject).length;
  console.log(`  ✅ ${file}: INJECTED ${Object.keys(keysToInject).length} guide keys at root marketing (line ${rootMktLine+1})`);
});

console.log(`\n📊 Total guide keys injected: ${totalInjected}`);
