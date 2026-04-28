/**
 * Restore locales by extracting sections from backup minified files
 * and merging them into the current (structurally valid but incomplete) files.
 * 
 * Strategy:
 * 1. The backup files are minified JS: export default { "section1": {...}, "section2": {...}, ... }
 * 2. We need to extract each section and its keys from backup
 * 3. For each current locale file, inject missing sections from backup
 */
const fs = require('fs');
const vm = require('vm');

const backupDir = 'src/i18n/locales_backup';
const currentDir = 'src/i18n/locales';

// Parse current file (these work with const xx = {...}; xx.yyy = {...}; export default xx; pattern)
function parseCurrent(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  
  // Find variable name
  const varMatch = content.match(/^(?:const|let|var)\s+(\w+)\s*=/m);
  if (!varMatch) {
    // Try direct export default
    try {
      const code = 'M.e = ' + content.replace(/^export\s+default\s+/, '').replace(/;\s*$/, '');
      const m = { e: null };
      vm.runInNewContext(code, { M: m });
      return m.e;
    } catch(e) { return null; }
  }
  
  const varName = varMatch[1];
  let code = content.replace(/export\s+default\s+\w+;?\s*$/m, '');
  code += `\nM.e = ${varName};`;
  const m = { e: null };
  try {
    vm.runInNewContext(code, { M: m, Object: Object });
    return m.e;
  } catch(e) {
    console.log(`  Parse error: ${e.message.substring(0, 100)}`);
    return null;
  }
}

// Extract sections from backup using regex-based approach
function extractBackupSections(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  // Remove export default and trailing semicolon
  let jsonStr = content.replace(/^export\s+default\s+/, '').replace(/;\s*$/, '');
  
  // Fix common JSON issues in the backup files
  // Issue 1: Missing values in key-value pairs like "key":"," 
  // Issue 2: Trailing commas
  
  // Try a more lenient parser approach: split into sections
  // Each top-level section is "sectionName": { ... }
  
  // First, try JSON5-like parsing
  try {
    // Replace problematic patterns
    // Empty values between quotes: "key":"","nextKey" 
    // Actually the issue is JS-style syntax vs JSON
    // Let's try eval approach with careful sandboxing
    
    const sandbox = { result: null };
    const code = `result = (${jsonStr})`;
    vm.runInNewContext(code, sandbox, { timeout: 5000 });
    return sandbox.result;
  } catch(e) {
    // If eval fails, try to fix common issues and retry
    console.log(`  Direct eval failed: ${e.message.substring(0, 80)}`);
    
    // Strategy 2: Use line-by-line section extraction
    // Find sections by looking for top-level keys
    const sections = {};
    
    // Remove outer braces
    let inner = jsonStr.trim();
    if (inner.startsWith('{')) inner = inner.slice(1);
    if (inner.endsWith('}')) inner = inner.slice(0, -1);
    
    // Find each top-level section: "name": { ... }
    // This is complex for minified nested JSON, so let's try a bracket-counting approach
    let pos = 0;
    let sectionCount = 0;
    
    while (pos < inner.length) {
      // Skip whitespace and commas
      while (pos < inner.length && /[\s,]/.test(inner[pos])) pos++;
      if (pos >= inner.length) break;
      
      // Expect a key: "keyName"
      if (inner[pos] !== '"') break;
      const keyEnd = inner.indexOf('"', pos + 1);
      if (keyEnd < 0) break;
      const key = inner.substring(pos + 1, keyEnd);
      pos = keyEnd + 1;
      
      // Skip : and whitespace
      while (pos < inner.length && /[\s:]/.test(inner[pos])) pos++;
      
      // Read value
      if (inner[pos] === '{') {
        // Object value - count braces
        let depth = 0;
        const valueStart = pos;
        let inStr = false;
        let escape = false;
        
        for (; pos < inner.length; pos++) {
          const ch = inner[pos];
          if (escape) { escape = false; continue; }
          if (ch === '\\') { escape = true; continue; }
          if (ch === '"') { inStr = !inStr; continue; }
          if (!inStr) {
            if (ch === '{') depth++;
            if (ch === '}') { depth--; if (depth === 0) { pos++; break; } }
          }
        }
        
        const valueStr = inner.substring(valueStart, pos);
        try {
          const sandbox2 = { result: null };
          vm.runInNewContext(`result = (${valueStr})`, sandbox2, { timeout: 2000 });
          sections[key] = sandbox2.result;
          sectionCount++;
        } catch(e2) {
          // Try JSON.parse
          try {
            sections[key] = JSON.parse(valueStr);
            sectionCount++;
          } catch(e3) {
            // Skip this section
            console.log(`  ⚠️ Section "${key}" failed to parse (${valueStr.length} chars)`);
          }
        }
      } else if (inner[pos] === '"') {
        // String value
        const strEnd = inner.indexOf('"', pos + 1);
        if (strEnd > 0) {
          sections[key] = inner.substring(pos + 1, strEnd);
          pos = strEnd + 1;
          sectionCount++;
        }
      } else {
        // Other value types - skip ahead
        const nextComma = inner.indexOf(',', pos);
        if (nextComma > 0) pos = nextComma + 1;
        else break;
      }
    }
    
    console.log(`  Extracted ${sectionCount} sections from backup`);
    return Object.keys(sections).length > 0 ? sections : null;
  }
}

console.log('=== Locale Restoration (Merge Strategy) ===\n');

// Process each language that has a backup
const backupFiles = fs.readdirSync(backupDir).filter(f => f.endsWith('.js'));
let totalRestored = 0;

for (const file of backupFiles) {
  const lang = file.replace('.js', '');
  console.log(`\n--- Processing ${lang} ---`);
  
  // Parse backup
  const backupData = extractBackupSections(`${backupDir}/${file}`);
  if (!backupData) {
    console.log(`  ❌ Could not extract backup data`);
    continue;
  }
  
  const backupSections = Object.keys(backupData).length;
  console.log(`  Backup: ${backupSections} sections`);
  
  // Parse current
  const currentPath = `${currentDir}/${file}`;
  if (!fs.existsSync(currentPath)) {
    console.log(`  No current file, creating from backup`);
    const content = `export default ${JSON.stringify(backupData, null, 2)};\n`;
    fs.writeFileSync(currentPath, content, 'utf8');
    totalRestored++;
    continue;
  }
  
  const currentData = parseCurrent(currentPath);
  if (!currentData) {
    console.log(`  ❌ Could not parse current file, replacing with backup`);
    const content = `export default ${JSON.stringify(backupData, null, 2)};\n`;
    fs.writeFileSync(currentPath, content, 'utf8');
    totalRestored++;
    continue;
  }
  
  const currentSections = Object.keys(currentData).length;
  console.log(`  Current: ${currentSections} sections`);
  
  // Merge: backup data takes priority for ALL sections that exist in backup
  // Current data only used for sections NOT in backup
  const merged = {};
  
  // First, add ALL backup sections (these are the authoritative translations)
  for (const [key, value] of Object.entries(backupData)) {
    merged[key] = value;
  }
  
  // Then, add current-only sections (new modules added after backup)
  let addedFromCurrent = 0;
  for (const [key, value] of Object.entries(currentData)) {
    if (!(key in merged)) {
      merged[key] = value;
      addedFromCurrent++;
    } else {
      // For existing sections, merge sub-keys from current that don't exist in backup
      if (typeof merged[key] === 'object' && typeof value === 'object') {
        for (const [subKey, subValue] of Object.entries(value)) {
          if (!(subKey in merged[key])) {
            merged[key][subKey] = subValue;
          }
        }
      }
    }
  }
  
  console.log(`  Merged: ${Object.keys(merged).length} sections (${addedFromCurrent} new from current)`);
  
  // Write restored file
  const content = `export default ${JSON.stringify(merged, null, 2)};\n`;
  fs.writeFileSync(currentPath, content, 'utf8');
  const size = Buffer.byteLength(content, 'utf8');
  console.log(`  ✅ Written: ${(size / 1024).toFixed(1)}KB`);
  totalRestored++;
}

// Verify results
console.log('\n=== Verification ===');
const allFiles = fs.readdirSync(currentDir).filter(f => f.endsWith('.js'));
for (const file of allFiles) {
  const data = parseCurrent(`${currentDir}/${file}`);
  if (data) {
    const sections = Object.keys(data).length;
    const keys = Object.values(data).reduce((s, v) => s + (typeof v === 'object' ? Object.keys(v).length : 1), 0);
    
    // Check for dashboard guide text (the most visible issue)
    const hasDashGuide = data.dashboard && (
      data.dashboard.guideTitle || data.dashboard.heroTitle || 
      Object.values(data.dashboard || {}).some(v => typeof v === 'string' && v.includes('가이드'))
    );
    
    console.log(`  ${file}: ${sections} sections, ${keys} keys ${hasDashGuide ? '✅ has dashboard guide' : '(no ko dashboard guide)'}`);
  } else {
    console.log(`  ❌ ${file}: PARSE FAILED`);
  }
}

console.log(`\n=== Restored ${totalRestored} files ===`);
