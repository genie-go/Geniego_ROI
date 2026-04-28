/**
 * Restore v3: Robust extraction of ALL sections from backup files,
 * including large sections (pages, dash, nav, marketing, etc.) that failed in v2.
 * 
 * Strategy: Instead of trying to parse sections individually (which fails on
 * unescaped quotes and JS-specific syntax), we'll:
 * 1. Read the entire backup as a string
 * 2. Use a streaming bracket-counter that handles strings/escapes perfectly
 * 3. Extract each top-level key-value pair as raw text
 * 4. For values that fail JSON.parse, try to fix common issues
 * 5. As a last resort, wrap in a Function constructor for JS eval
 */
const fs = require('fs');
const vm = require('vm');

const backupDir = 'src/i18n/locales_backup';
const currentDir = 'src/i18n/locales';

/**
 * Extract ALL top-level sections from a minified JS object literal.
 * Returns { key: rawValueString } for each top-level key.
 */
function extractRawSections(content) {
  // Remove "export default " prefix and trailing ";"
  let s = content.replace(/^export\s+default\s+/, '').replace(/;\s*$/, '').trim();
  
  // Remove outer braces
  if (s[0] === '{') s = s.slice(1);
  if (s[s.length - 1] === '}') s = s.slice(0, -1);
  
  const sections = {};
  let pos = 0;
  
  while (pos < s.length) {
    // Skip whitespace and commas
    while (pos < s.length && /[\s,]/.test(s[pos])) pos++;
    if (pos >= s.length) break;
    
    // Read key (must start with ")
    if (s[pos] !== '"') { pos++; continue; }
    pos++; // skip opening "
    let key = '';
    while (pos < s.length && s[pos] !== '"') {
      if (s[pos] === '\\') { key += s[pos] + s[pos + 1]; pos += 2; }
      else { key += s[pos]; pos++; }
    }
    pos++; // skip closing "
    
    // Skip colon and whitespace
    while (pos < s.length && /[\s:]/.test(s[pos])) pos++;
    
    // Read value
    if (s[pos] === '{') {
      // Object value - count braces, handle strings
      const start = pos;
      let depth = 0;
      let inStr = false;
      let escaped = false;
      
      while (pos < s.length) {
        const ch = s[pos];
        if (escaped) { escaped = false; pos++; continue; }
        if (ch === '\\' && inStr) { escaped = true; pos++; continue; }
        if (ch === '"') { inStr = !inStr; pos++; continue; }
        if (!inStr) {
          if (ch === '{') depth++;
          if (ch === '}') {
            depth--;
            if (depth === 0) { pos++; break; }
          }
        }
        pos++;
      }
      
      sections[key] = s.substring(start, pos);
    } else if (s[pos] === '"') {
      // String value
      pos++; // skip opening "
      let val = '';
      while (pos < s.length) {
        if (s[pos] === '\\') { val += s[pos] + s[pos + 1]; pos += 2; }
        else if (s[pos] === '"') { pos++; break; }
        else { val += s[pos]; pos++; }
      }
      sections[key] = '"' + val + '"';
    } else if (s[pos] === '[') {
      // Array value
      const start = pos;
      let depth = 0;
      let inStr = false;
      let escaped = false;
      while (pos < s.length) {
        const ch = s[pos];
        if (escaped) { escaped = false; pos++; continue; }
        if (ch === '\\' && inStr) { escaped = true; pos++; continue; }
        if (ch === '"') { inStr = !inStr; pos++; continue; }
        if (!inStr) {
          if (ch === '[') depth++;
          if (ch === ']') { depth--; if (depth === 0) { pos++; break; } }
        }
        pos++;
      }
      sections[key] = s.substring(start, pos);
    } else {
      // Primitive value (number, boolean, null)
      const start = pos;
      while (pos < s.length && s[pos] !== ',' && s[pos] !== '}') pos++;
      sections[key] = s.substring(start, pos).trim();
    }
  }
  
  return sections;
}

/**
 * Parse a raw value string into a JS object.
 * Tries multiple strategies.
 */
function parseValue(rawStr, key) {
  // Strategy 1: JSON.parse
  try {
    return JSON.parse(rawStr);
  } catch(e) {}
  
  // Strategy 2: VM eval (handles JS-specific syntax like unquoted keys, trailing commas)
  try {
    const sandbox = { result: null };
    vm.runInNewContext('result = (' + rawStr + ')', sandbox, { timeout: 3000 });
    return sandbox.result;
  } catch(e) {}
  
  // Strategy 3: Fix common issues and retry
  let fixed = rawStr;
  // Fix trailing commas before closing braces
  fixed = fixed.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');
  // Fix single quotes to double quotes (careful with content)
  
  try {
    return JSON.parse(fixed);
  } catch(e) {}
  
  try {
    const sandbox = { result: null };
    vm.runInNewContext('result = (' + fixed + ')', sandbox, { timeout: 3000 });
    return sandbox.result;
  } catch(e) {}
  
  // Strategy 4: If it's a nested object, try to extract its sub-keys
  if (rawStr.startsWith('{')) {
    try {
      const subSections = extractRawSections('export default ' + rawStr);
      const result = {};
      for (const [subKey, subRaw] of Object.entries(subSections)) {
        const parsed = parseValue(subRaw, subKey);
        if (parsed !== null) result[subKey] = parsed;
      }
      if (Object.keys(result).length > 0) return result;
    } catch(e) {}
  }
  
  return null;
}

/**
 * Parse current locale file
 */
function parseCurrent(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Try export default {...} format
  if (content.trimStart().startsWith('export default')) {
    const code = content.replace(/^export\s+default\s+/, 'M.e = ');
    const m = { e: null };
    try {
      vm.runInNewContext(code, { M: m });
      return m.e;
    } catch(e) {}
  }
  
  // Try const xx = {...}; xx.yyy = {...}; export default xx; format
  const varMatch = content.match(/^(?:const|let|var)\s+(\w+)\s*=/m);
  if (varMatch) {
    const varName = varMatch[1];
    let code = content.replace(/export\s+default\s+\w+;?\s*$/m, '');
    code += '\nM.e = ' + varName + ';';
    const m = { e: null };
    try {
      vm.runInNewContext(code, { M: m, Object: Object });
      return m.e;
    } catch(e) {}
  }
  
  return null;
}

// ═══════════════════════════════════════════════════════
// MAIN EXECUTION
// ═══════════════════════════════════════════════════════

console.log('═══ Locale Restoration v3 (Complete) ═══\n');

const backupFiles = fs.readdirSync(backupDir).filter(f => f.endsWith('.js'));

for (const file of backupFiles) {
  const lang = file.replace('.js', '');
  console.log(`\n─── ${lang} ───`);
  
  // Step 1: Extract raw sections from backup
  const bakContent = fs.readFileSync(`${backupDir}/${file}`, 'utf8');
  const rawSections = extractRawSections(bakContent);
  console.log(`  Raw sections extracted: ${Object.keys(rawSections).length}`);
  
  // Step 2: Parse each section
  const backupData = {};
  let parsed = 0, failed = 0;
  const failedKeys = [];
  
  for (const [key, rawStr] of Object.entries(rawSections)) {
    const value = parseValue(rawStr, key);
    if (value !== null) {
      backupData[key] = value;
      parsed++;
    } else {
      failed++;
      failedKeys.push(`${key}(${rawStr.length}ch)`);
    }
  }
  
  console.log(`  Parsed: ${parsed}, Failed: ${failed}`);
  if (failed > 0) console.log(`  Failed: ${failedKeys.join(', ')}`);
  
  // Step 3: Parse current file
  const currentPath = `${currentDir}/${file}`;
  if (!fs.existsSync(currentPath)) {
    console.log(`  No current file, creating from backup only`);
    fs.writeFileSync(currentPath, `export default ${JSON.stringify(backupData, null, 2)};\n`, 'utf8');
    continue;
  }
  
  const currentData = parseCurrent(currentPath);
  if (!currentData) {
    console.log(`  ⚠️ Current file parse failed, using backup only`);
    fs.writeFileSync(currentPath, `export default ${JSON.stringify(backupData, null, 2)};\n`, 'utf8');
    continue;
  }
  
  // Step 4: Merge - backup priority for ALL sections
  const merged = {};
  
  // Add all backup sections first (authoritative)
  for (const [key, value] of Object.entries(backupData)) {
    if (typeof value === 'object' && !Array.isArray(value)) {
      merged[key] = { ...value };
    } else {
      merged[key] = value;
    }
  }
  
  // Add current-only sections
  let addedNew = 0;
  for (const [key, value] of Object.entries(currentData)) {
    if (!(key in merged)) {
      merged[key] = value;
      addedNew++;
    } else if (typeof merged[key] === 'object' && typeof value === 'object' && !Array.isArray(merged[key])) {
      // Merge sub-keys from current that don't exist in backup
      for (const [subKey, subValue] of Object.entries(value)) {
        if (!(subKey in merged[key])) {
          merged[key][subKey] = subValue;
        }
      }
    }
  }
  
  // Step 5: Write
  const output = `export default ${JSON.stringify(merged, null, 2)};\n`;
  fs.writeFileSync(currentPath, output, 'utf8');
  const totalSections = Object.keys(merged).length;
  const totalKeys = Object.values(merged).reduce((s, v) => 
    s + (typeof v === 'object' && !Array.isArray(v) ? Object.keys(v).length : 1), 0);
  const size = (Buffer.byteLength(output, 'utf8') / 1024).toFixed(1);
  console.log(`  ✅ ${totalSections} sections, ${totalKeys} keys, ${size}KB (+${addedNew} from current)`);
}

// ═══════════════════════════════════════════════════════
// VERIFICATION
// ═══════════════════════════════════════════════════════

console.log('\n═══ Verification ═══');

const allFiles = fs.readdirSync(currentDir).filter(f => f.endsWith('.js'));
for (const file of allFiles) {
  const data = parseCurrent(`${currentDir}/${file}`);
  if (!data) { console.log(`  ❌ ${file}: PARSE FAILED`); continue; }
  
  const sections = Object.keys(data).length;
  const keys = Object.values(data).reduce((s, v) => 
    s + (typeof v === 'object' && !Array.isArray(v) ? Object.keys(v).length : 1), 0);
  
  // Check critical guide keys
  const checks = {
    'dashGuide': data.dashGuide?.title,
    'marketing.guideTitle': data.marketing?.guideTitle,
    'campMgr.guideTitle': data.campMgr?.guideTitle,
    'jb.guideTitle': data.jb?.guideTitle,
    'adPerf tabs': data.adPerf?.tabAdStatus || data.adPerf?.tabStatus,
  };
  
  const missing = Object.entries(checks).filter(([k, v]) => !v).map(([k]) => k);
  const found = Object.entries(checks).filter(([k, v]) => v).map(([k]) => k);
  
  console.log(`  ${file}: ${sections} sections, ${keys} keys`);
  if (found.length) console.log(`    ✅ Found: ${found.join(', ')}`);
  if (missing.length) console.log(`    ⚠️ Missing: ${missing.join(', ')}`);
}

console.log('\n═══ Done ═══');
