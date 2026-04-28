/**
 * Restore locale files from backup
 * Strategy: 
 * 1. Parse backup files (JS object literals, not strict JSON)
 * 2. Fix known syntax issues
 * 3. Merge any new keys from current files that don't exist in backup
 * 4. Write restored files
 */
const fs = require('fs');
const vm = require('vm');

const backupDir = 'src/i18n/locales_backup';
const currentDir = 'src/i18n/locales';
const outputDir = 'src/i18n/locales'; // Overwrite current

// Parse a locale file using VM sandbox
function parseLocale(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  
  // Check if minified (1-2 lines) or expanded
  if (lines.length <= 5) {
    // Minified: export default {...}
    const code = content.replace(/^export\s+default\s+/, 'M.e = ');
    const m = { e: null };
    try {
      vm.runInNewContext(code, { M: m });
      return m.e;
    } catch(e) {
      console.log(`  Parse error (minified): ${e.message.substring(0, 100)}`);
      return null;
    }
  } else {
    // Expanded: const xx = {...}; xx.yyy = {...}; export default xx;
    // Find the variable name
    const varMatch = content.match(/^(?:const|let|var)\s+(\w+)\s*=/m);
    if (!varMatch) {
      // Try export default directly
      const code = content.replace(/^export\s+default\s+/, 'M.e = ');
      const m = { e: null };
      try { vm.runInNewContext(code, { M: m }); return m.e; } catch(e) { return null; }
    }
    
    const varName = varMatch[1];
    // Remove export default line and convert to runnable code
    let code = content.replace(/^export\s+default\s+\w+;?\s*$/m, '');
    code += `\nM.e = ${varName};`;
    const m = { e: null };
    try {
      vm.runInNewContext(code, { M: m, Object: Object, console: console });
      return m.e;
    } catch(e) {
      console.log(`  Parse error (expanded): ${e.message.substring(0, 100)}`);
      return null;
    }
  }
}

// Deep merge: backup base + current additions
function deepMerge(base, additions) {
  const result = JSON.parse(JSON.stringify(base));
  for (const key of Object.keys(additions)) {
    if (!(key in result)) {
      result[key] = additions[key];
    } else if (typeof result[key] === 'object' && typeof additions[key] === 'object') {
      // Merge sub-keys: backup takes priority
      for (const subKey of Object.keys(additions[key])) {
        if (!(subKey in result[key])) {
          result[key][subKey] = additions[key][subKey];
        }
      }
    }
  }
  return result;
}

// Format object as readable JS
function formatLocale(obj, varName) {
  const json = JSON.stringify(obj, null, 2);
  return `export default ${json};\n`;
}

console.log('=== Locale Restoration Process ===\n');

// Step 1: Parse all backup files
const backupFiles = fs.readdirSync(backupDir).filter(f => f.endsWith('.js'));
const backupData = {};

console.log('Step 1: Parsing backup files...');
for (const file of backupFiles) {
  const lang = file.replace('.js', '');
  const data = parseLocale(`${backupDir}/${file}`);
  if (data) {
    const keyCount = Object.keys(data).length;
    const subCount = Object.values(data).reduce((s, v) => s + (typeof v === 'object' ? Object.keys(v).length : 1), 0);
    console.log(`  ✅ ${file}: ${keyCount} sections, ${subCount} total keys`);
    backupData[lang] = data;
  } else {
    console.log(`  ❌ ${file}: FAILED TO PARSE`);
  }
}

// Step 2: Parse current files
const currentFiles = fs.readdirSync(currentDir).filter(f => f.endsWith('.js'));
const currentData = {};

console.log('\nStep 2: Parsing current files...');
for (const file of currentFiles) {
  const lang = file.replace('.js', '');
  const data = parseLocale(`${currentDir}/${file}`);
  if (data) {
    const keyCount = Object.keys(data).length;
    const subCount = Object.values(data).reduce((s, v) => s + (typeof v === 'object' ? Object.keys(v).length : 1), 0);
    console.log(`  ✅ ${file}: ${keyCount} sections, ${subCount} total keys`);
    currentData[lang] = data;
  } else {
    console.log(`  ❌ ${file}: FAILED TO PARSE`);
  }
}

// Step 3: Merge and restore
console.log('\nStep 3: Merging backup (priority) + current (additions)...');

const restoredLangs = {};
for (const lang of Object.keys(backupData)) {
  const backup = backupData[lang];
  const current = currentData[lang];
  
  if (current) {
    const merged = deepMerge(backup, current);
    const bakSections = Object.keys(backup).length;
    const curSections = Object.keys(current).length;
    const mergedSections = Object.keys(merged).length;
    const bakKeys = Object.values(backup).reduce((s, v) => s + (typeof v === 'object' ? Object.keys(v).length : 1), 0);
    const mergedKeys = Object.values(merged).reduce((s, v) => s + (typeof v === 'object' ? Object.keys(v).length : 1), 0);
    console.log(`  ${lang}: backup(${bakSections}/${bakKeys}) + current(${curSections}) → merged(${mergedSections}/${mergedKeys})`);
    restoredLangs[lang] = merged;
  } else {
    console.log(`  ${lang}: backup only (no current)`);
    restoredLangs[lang] = backup;
  }
}

// For languages only in current (pt, ru, ar, hi)
for (const lang of Object.keys(currentData)) {
  if (!restoredLangs[lang]) {
    console.log(`  ${lang}: current only (no backup, keeping as-is)`);
    restoredLangs[lang] = currentData[lang];
  }
}

// Step 4: Write restored files
console.log('\nStep 4: Writing restored locale files...');
for (const [lang, data] of Object.entries(restoredLangs)) {
  const file = `${outputDir}/${lang}.js`;
  const content = formatLocale(data);
  const size = Buffer.byteLength(content, 'utf8');
  fs.writeFileSync(file, content, 'utf8');
  console.log(`  ✅ ${lang}.js: ${(size / 1024).toFixed(1)}KB written`);
}

// Step 5: Validate all restored files
console.log('\nStep 5: Validation...');
for (const [lang] of Object.entries(restoredLangs)) {
  const file = `${outputDir}/${lang}.js`;
  const restored = parseLocale(file);
  if (restored) {
    const sections = Object.keys(restored).length;
    const keys = Object.values(restored).reduce((s, v) => s + (typeof v === 'object' ? Object.keys(v).length : 1), 0);
    
    // Check critical sections
    const critical = ['dashboard', 'adPerf', 'channelKpi', 'crm', 'nav', 'gNav', 'omniChannel'];
    const missing = critical.filter(k => !restored[k]);
    if (missing.length > 0) {
      console.log(`  ⚠️ ${lang}.js: ${sections} sections, ${keys} keys — MISSING: ${missing.join(', ')}`);
    } else {
      console.log(`  ✅ ${lang}.js: ${sections} sections, ${keys} keys — all critical sections present`);
    }
  } else {
    console.log(`  ❌ ${lang}.js: VALIDATION FAILED`);
  }
}

console.log('\n=== Restoration Complete ===');
