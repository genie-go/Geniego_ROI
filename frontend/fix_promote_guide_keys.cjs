/**
 * Fix: Inject guide keys at the correct marketing namespace level for ALL 15 locales.
 * 
 * Problem: Guide keys (gf1Title, guideFullTitle, etc.) are nested under marketing.g.*
 * but the component calls t('marketing.gf1Title').
 * 
 * Solution: Copy keys from marketing.g.* to marketing.* level for each locale file.
 * This is non-destructive — existing keys won't be overwritten.
 */
const fs = require('fs');
const path = require('path');

const localeDir = path.join(__dirname, 'src', 'i18n', 'locales');
const files = fs.readdirSync(localeDir).filter(f => f.endsWith('.js'));

// Keys to promote from marketing.g.* to marketing.*
const GUIDE_KEYS = [
  'csTitle','csSubtitle','csTabGallery','csTabCreateNew','csTabPerformance','csTabBrandAssets',
  'csKpiCreatives','csKpiFormats','csKpiApproved','csKpiTopCtr',
  'csFeatMultiFormat','csFeatAiCopy','csFeatPerfAnalytics','csFeatBrandCheck','csSystemOk',
  'guideFullTitle','guideFullSub',
  'guidePhaseA','guidePhaseB','guidePhaseC','guidePhaseD','guidePhaseE',
  'gf1Title','gf1Desc','gf2Title','gf2Desc','gf3Title','gf3Desc',
  'gf4Title','gf4Desc','gf5Title','gf5Desc','gf6Title','gf6Desc',
  'gf7Title','gf7Desc','gf8Title','gf8Desc','gf9Title','gf9Desc',
  'gf10Title','gf10Desc','gf11Title','gf11Desc','gf12Title','gf12Desc',
  'gf13Title','gf13Desc','gf14Title','gf14Desc','gf15Title','gf15Desc',
  'guideTabGuideName','guideTip6','guideTip7'
];

let totalInjected = 0;

files.forEach(file => {
  const fp = path.join(localeDir, file);
  let src = fs.readFileSync(fp, 'utf8');
  
  // Parse the file to extract marketing.g values
  const tmpSrc = src.replace('export default', 'module.exports =');
  const tmpPath = path.join(__dirname, `_tmp_${file.replace('.js','')}.js`);
  fs.writeFileSync(tmpPath, tmpSrc);
  
  let obj;
  try {
    delete require.cache[require.resolve(tmpPath)];
    obj = require(tmpPath);
  } catch(e) {
    console.log(`  ⚠️ ${file}: parse error, skipping`);
    try { fs.unlinkSync(tmpPath); } catch {}
    return;
  }
  try { fs.unlinkSync(tmpPath); } catch {}
  
  const mk = obj.marketing || {};
  const gBlock = mk.g || {};
  
  if (Object.keys(gBlock).length === 0) {
    console.log(`  ⬜ ${file}: no marketing.g block found`);
    return;
  }
  
  // Find keys in g that aren't already in marketing root
  const keysToAdd = {};
  GUIDE_KEYS.forEach(k => {
    if (gBlock[k] && !mk[k]) {
      keysToAdd[k] = gBlock[k];
    }
  });
  
  // Also check for any OTHER keys in g that we might have missed
  Object.keys(gBlock).forEach(k => {
    if (!mk[k] && !keysToAdd[k]) {
      keysToAdd[k] = gBlock[k];
    }
  });
  
  if (Object.keys(keysToAdd).length === 0) {
    console.log(`  ✅ ${file}: all keys already at marketing root`);
    return;
  }
  
  // Inject keys into the marketing block
  // Find the first line after "marketing": { and inject there
  const mktMatch = src.match(/"marketing"\s*:\s*\{/);
  if (!mktMatch) {
    console.log(`  ⚠️ ${file}: can't find marketing: { pattern`);
    return;
  }
  
  const insertPos = mktMatch.index + mktMatch[0].length;
  
  // Build the injection string
  const injectionLines = Object.entries(keysToAdd).map(([k, v]) => {
    const escaped = typeof v === 'string' ? v.replace(/\\/g, '\\\\').replace(/"/g, '\\"') : v;
    return `    "${k}": "${escaped}"`;
  });
  
  const injection = '\n' + injectionLines.join(',\n') + ',';
  
  src = src.substring(0, insertPos) + injection + src.substring(insertPos);
  
  fs.writeFileSync(fp, src, 'utf8');
  totalInjected += Object.keys(keysToAdd).length;
  console.log(`  ✅ ${file}: injected ${Object.keys(keysToAdd).length} keys to marketing root`);
});

console.log(`\n📊 Total keys injected: ${totalInjected}`);

// Final verification
console.log('\n🔍 Final verification (ko.js)...');
const testSrc = fs.readFileSync(path.join(localeDir, 'ko.js'), 'utf8')
  .replace('export default', 'module.exports =');
const tmpPath = path.join(__dirname, '_verify.js');
fs.writeFileSync(tmpPath, testSrc);
try {
  delete require.cache[require.resolve(tmpPath)];
  const obj = require(tmpPath);
  const mk = obj.marketing || {};
  const check = ['gf1Title','gf1Desc','gf15Title','guideFullTitle','guidePhaseA','csTitle','guideTip6','guideTip7'];
  check.forEach(k => console.log(`  ${k}: ${mk[k] ? '✅ "'+mk[k].substring(0,30)+'..."' : '❌ MISSING'}`));
} catch(e) {
  console.log('❌ Parse error:', e.message);
}
try { fs.unlinkSync(tmpPath); } catch {}
