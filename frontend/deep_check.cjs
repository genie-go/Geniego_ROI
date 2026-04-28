const fs = require('fs');
const vm = require('vm');

// Parse backup files using VM (they use JS object literals, not strict JSON)
function parseBackup(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  // Convert export default {...} to module.exports = {...}
  const code = content.replace(/^export\s+default\s+/, 'module.exports = ');
  const m = { exports: {} };
  try {
    vm.runInNewContext(code, { module: m, exports: m.exports });
    return m.exports;
  } catch(e) {
    return null;
  }
}

// Parse current files using VM  
function parseCurrent(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  // Handle const xx = {...}; export default xx;
  const code = content
    .replace(/^export\s+default\s+\w+;?\s*$/m, '')
    .replace(/^(const|let|var)\s+(\w+)\s*=/, 'module.exports =');
  const m = { exports: {} };
  try {
    vm.runInNewContext(code, { module: m, exports: m.exports });
    return m.exports;
  } catch(e) {
    // Try another approach
    const code2 = content.replace(/^export\s+default\s+/, 'module.exports = ');
    try {
      vm.runInNewContext(code2, { module: m, exports: m.exports });
      return m.exports;
    } catch(e2) {
      return null;
    }
  }
}

// Check ko.js specifically
const koBackup = parseBackup('src/i18n/locales_backup/ko.js');
const koCurrent = parseCurrent('src/i18n/locales/ko.js');

if (!koBackup) {
  console.log('❌ Cannot parse backup ko.js');
} else {
  console.log('✅ Backup ko.js parsed successfully');
  console.log('Top keys:', Object.keys(koBackup).length);
}

if (!koCurrent) {
  console.log('❌ Cannot parse current ko.js');
} else {
  console.log('✅ Current ko.js parsed successfully');
  console.log('Top keys:', Object.keys(koCurrent).length);
}

if (koBackup && koCurrent) {
  console.log('\n=== KEY COMPARISON (ko.js) ===');
  const bakKeys = new Set(Object.keys(koBackup));
  const curKeys = new Set(Object.keys(koCurrent));
  
  const onlyInBackup = [...bakKeys].filter(k => !curKeys.has(k));
  const onlyInCurrent = [...curKeys].filter(k => !bakKeys.has(k));
  const common = [...bakKeys].filter(k => curKeys.has(k));
  
  console.log('\nKeys ONLY in backup (LOST in current):');
  for (const k of onlyInBackup) {
    const subCount = typeof koBackup[k] === 'object' ? Object.keys(koBackup[k]).length : 1;
    console.log(`  ⚠️ ${k}: ${subCount} sub-keys`);
  }
  
  console.log('\nKeys ONLY in current (NEW):');
  for (const k of onlyInCurrent) {
    const subCount = typeof koCurrent[k] === 'object' ? Object.keys(koCurrent[k]).length : 1;
    console.log(`  🆕 ${k}: ${subCount} sub-keys`);
  }
  
  console.log('\nCommon keys with sub-key count changes:');
  for (const k of common) {
    const bakCount = typeof koBackup[k] === 'object' ? Object.keys(koBackup[k]).length : 1;
    const curCount = typeof koCurrent[k] === 'object' ? Object.keys(koCurrent[k]).length : 1;
    if (bakCount !== curCount) {
      console.log(`  📊 ${k}: backup=${bakCount} → current=${curCount} (${curCount < bakCount ? '⚠️ REDUCED' : '🆕 ADDED'})`);
    }
  }
  
  // Total sub-key comparison
  const bakTotal = Object.values(koBackup).reduce((s,v) => s + (typeof v === 'object' ? Object.keys(v).length : 1), 0);
  const curTotal = Object.values(koCurrent).reduce((s,v) => s + (typeof v === 'object' ? Object.keys(v).length : 1), 0);
  console.log(`\nTotal sub-keys: backup=${bakTotal} → current=${curTotal} (${bakTotal-curTotal} keys LOST)`);
}
