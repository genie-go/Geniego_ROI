const fs=require('fs');

// Check all backup locale files
const backupDir = 'src/i18n/locales_backup';
const files = fs.readdirSync(backupDir).filter(f=>f.endsWith('.js'));

console.log('=== Backup Locale Validation ===');
const results = {};

for(const file of files) {
  const content = fs.readFileSync(backupDir+'/'+file, 'utf8');
  let jsonStr = content.replace(/^export\s+default\s+/, '').replace(/;\s*$/, '');
  
  // Fix known issues
  jsonStr = jsonStr.replace(/"chIntelDesc3":"(,|)"(,)/g, '"chIntelDesc3":"하면"$2');
  
  try {
    const obj = JSON.parse(jsonStr);
    const keys = Object.keys(obj);
    const totalSubKeys = keys.reduce((s,k) => s + (typeof obj[k]==='object'? Object.keys(obj[k]).length : 1), 0);
    console.log(`✅ ${file}: ${keys.length} top keys, ${totalSubKeys} total sub-keys`);
    results[file] = { valid: true, topKeys: keys.length, subKeys: totalSubKeys, keys };
    
    // Check critical sections
    const critical = ['dashboard','adPerf','channelKpi','crm','omniChannel','attribution','catalog','wms','priceOpt','supplyChain','nav','gNav'];
    const missing = critical.filter(k => !obj[k]);
    if(missing.length) console.log(`   ⚠️ Missing: ${missing.join(', ')}`);
  } catch(e) {
    console.log(`❌ ${file}: ${e.message.substring(0,150)}`);
    results[file] = { valid: false, error: e.message.substring(0,100) };
  }
}

// Also check current locale files
console.log('\n=== Current Locale Validation ===');
const currentDir = 'src/i18n/locales';
const currentFiles = fs.readdirSync(currentDir).filter(f=>f.endsWith('.js'));

for(const file of currentFiles) {
  const content = fs.readFileSync(currentDir+'/'+file, 'utf8');
  
  // Try different parsing approaches
  let parsed = false;
  
  // Approach 1: export default {...} (minified)
  let jsonStr = content.replace(/^export\s+default\s+/, '').replace(/;\s*$/, '');
  try {
    const obj = JSON.parse(jsonStr);
    const keys = Object.keys(obj);
    const totalSubKeys = keys.reduce((s,k) => s + (typeof obj[k]==='object'? Object.keys(obj[k]).length : 1), 0);
    console.log(`✅ ${file}: ${keys.length} top keys, ${totalSubKeys} total sub-keys`);
    parsed = true;
  } catch(e) {}
  
  // Approach 2: const xx = {...}; export default xx;
  if(!parsed) {
    try {
      const fn = new Function(content.replace(/^export\s+default\s+.*$/m, '').replace(/^const\s+\w+\s*=\s*/, 'return '));
      const obj = fn();
      console.log(`✅ ${file}: parsed (const pattern)`);
      parsed = true;
    } catch(e) {}
  }
  
  if(!parsed) {
    console.log(`❌ ${file}: PARSE FAILED`);
  }
}
