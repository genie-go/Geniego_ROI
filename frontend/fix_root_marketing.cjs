/**
 * DEFINITIVE FIX: Inject guide keys at the ROOT-LEVEL marketing namespace
 * 
 * The root marketing namespace is at indent level 2 (e.g., "  \"marketing\": {")
 * This is what t('marketing.xxx') resolves to.
 * 
 * Previous injections went to indent-6 blocks (nested inside pages/other ns).
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
  
  // Step 1: Find ROOT-LEVEL marketing block (indent 2-4, containing real marketing keys)
  let rootMktLine = -1;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const indent = line.search(/\S/);
    if (indent >= 2 && indent <= 4 && 
        line.trim().startsWith('"marketing"') && 
        line.includes('{')) {
      // Verify this is the REAL marketing block by checking next lines
      const nextLines = lines.slice(i+1, i+30).join('\n');
      if (nextLines.includes('autoTitle') || nextLines.includes('budgetSetup') || 
          nextLines.includes('metImpressions') || nextLines.includes('pageTitle')) {
        rootMktLine = i;
        break;
      }
    }
  }
  
  if (rootMktLine === -1) {
    console.log(`  ⚠️ ${file}: no root-level marketing block found`);
    return;
  }
  
  // Step 2: Extract ALL guide keys from "g": { blocks (at any nesting level)
  const gBlockRegex = /"g"\s*:\s*\{([\s\S]*?)\n\s*\}/g;
  const allGKeys = {};
  let gMatch;
  while ((gMatch = gBlockRegex.exec(src)) !== null) {
    const blockContent = gMatch[1];
    const kvRegex = /"([^"]+)"\s*:\s*"((?:[^"\\]|\\.)*)"/g;
    let kvMatch;
    while ((kvMatch = kvRegex.exec(blockContent)) !== null) {
      if (!allGKeys[kvMatch[1]]) {
        allGKeys[kvMatch[1]] = kvMatch[2];
      }
    }
  }
  
  // Step 3: Check which keys are MISSING from root marketing block
  // Get the content of root marketing block
  const rootMktStart = rootMktLine;
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
  
  const rootMktContent = lines.slice(rootMktStart, rootMktEnd + 1).join('\n');
  
  const keysToInject = {};
  Object.keys(allGKeys).forEach(k => {
    if (!rootMktContent.includes(`"${k}"`)) {
      keysToInject[k] = allGKeys[k];
    }
  });
  
  if (Object.keys(keysToInject).length === 0) {
    console.log(`  ✅ ${file}: all keys already at root marketing (line ${rootMktLine+1})`);
    return;
  }
  
  // Step 4: Inject keys right after the opening { of root marketing
  const insertAfterLine = rootMktLine; // Insert after "marketing": {
  const indent = '    '; // 4 spaces for root-level keys
  const injectionLines = Object.entries(keysToInject).map(([k, v]) => {
    return `${indent}"${k}": "${v}"`;
  });
  const injection = injectionLines.join(',\n') + ',';
  
  lines.splice(insertAfterLine + 1, 0, injection);
  
  src = lines.join('\n');
  fs.writeFileSync(fp, src, 'utf8');
  totalInjected += Object.keys(keysToInject).length;
  console.log(`  ✅ ${file}: injected ${Object.keys(keysToInject).length} keys at ROOT marketing (line ${rootMktLine+1})`);
});

console.log(`\n📊 Total keys injected: ${totalInjected}`);

// Final verification
console.log('\n🔍 Verification...');
const koSrc = fs.readFileSync(path.join(localeDir, 'ko.js'), 'utf8');
const koLines = koSrc.split('\n');
for (let i = 0; i < koLines.length; i++) {
  if (koLines[i].includes('"gf1Title"')) {
    const indent = koLines[i].search(/\S/);
    console.log(`  gf1Title found at line ${i+1} (indent ${indent}): ${koLines[i].trim().substring(0,50)}`);
  }
}
