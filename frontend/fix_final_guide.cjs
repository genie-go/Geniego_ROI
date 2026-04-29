/**
 * FINAL FIX: Inject guide keys at the CORRECT marketing namespace (the one with autoMarketing, etc.)
 * 
 * Each locale file has multiple "marketing": entries. The correct one is the TOP-LEVEL
 * marketing namespace that contains keys like "autoMarketing", "budgetSetup", etc.
 * 
 * Strategy: Find the marketing block that contains "autoMarketing" or "budgetSetup" key,
 * then inject guide keys there.
 */
const fs = require('fs');
const path = require('path');

const localeDir = path.join(__dirname, 'src', 'i18n', 'locales');
const files = fs.readdirSync(localeDir).filter(f => f.endsWith('.js'));

// Guide keys to extract from "g": { block and inject at marketing root
const GUIDE_KEY_NAMES = [
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
  'guideTabGuideName','guideTabGuideDesc',
  'guideTip6','guideTip7',
  'guideTabsTitle','guideTipsTitle',
  'guideTabCreativeName','guideTabCreativeDesc',
  'guideTabSetupName','guideTabSetupDesc',
  'guideTabPreviewName','guideTabPreviewDesc',
];

let totalInjected = 0;

files.forEach(file => {
  const fp = path.join(localeDir, file);
  let src = fs.readFileSync(fp, 'utf8');
  
  // Step 1: Extract ALL key-value pairs from ALL "g": { ... } blocks
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
  
  if (Object.keys(allGKeys).length === 0) {
    console.log(`  ⬜ ${file}: no "g" block keys found`);
    return;
  }
  
  // Step 2: Find the CORRECT marketing namespace
  // It's the one containing "autoMarketing" or "budgetSetup" or "autoTitle"
  const markerKeys = ['autoMarketing', 'budgetSetup', 'autoTitle', 'autoTab1', 'channelSelect'];
  
  // Find all "marketing": { positions
  const mktRegex = /"marketing"\s*:\s*\{/g;
  let mktMatch;
  let correctMktPos = -1;
  
  while ((mktMatch = mktRegex.exec(src)) !== null) {
    const afterPos = mktMatch.index + mktMatch[0].length;
    // Check if any marker key exists within the next 2000 chars
    const searchWindow = src.substring(afterPos, afterPos + 5000);
    const hasMarker = markerKeys.some(mk => searchWindow.includes(`"${mk}"`));
    if (hasMarker) {
      correctMktPos = afterPos;
      break;
    }
  }
  
  if (correctMktPos === -1) {
    console.log(`  ⚠️ ${file}: couldn't find correct marketing namespace`);
    return;
  }
  
  // Step 3: Check which keys are already at the correct marketing level
  // Get 10000 chars after the marketing opening
  const mktWindow = src.substring(correctMktPos, correctMktPos + 15000);
  
  const keysToInject = {};
  GUIDE_KEY_NAMES.forEach(k => {
    if (allGKeys[k] && !mktWindow.includes(`"${k}"`)) {
      keysToInject[k] = allGKeys[k];
    }
  });
  
  // Also add any other g-block keys not already present
  Object.keys(allGKeys).forEach(k => {
    if (!keysToInject[k] && !mktWindow.includes(`"${k}"`)) {
      keysToInject[k] = allGKeys[k];
    }
  });
  
  if (Object.keys(keysToInject).length === 0) {
    console.log(`  ✅ ${file}: all keys already at correct marketing root`);
    return;
  }
  
  // Step 4: Inject keys right after the marketing { opening
  const injectionLines = Object.entries(keysToInject).map(([k, v]) => {
    return `    "${k}": "${v}"`;
  });
  const injection = '\n' + injectionLines.join(',\n') + ',';
  
  src = src.substring(0, correctMktPos) + injection + src.substring(correctMktPos);
  
  fs.writeFileSync(fp, src, 'utf8');
  totalInjected += Object.keys(keysToInject).length;
  console.log(`  ✅ ${file}: injected ${Object.keys(keysToInject).length} keys at correct marketing namespace`);
});

console.log(`\n📊 Total keys injected: ${totalInjected}`);

// Verification: check ko.js
const koSrc = fs.readFileSync(path.join(localeDir, 'ko.js'), 'utf8');
const mktRegex2 = /"marketing"\s*:\s*\{/g;
let mktMatch2;
while ((mktMatch2 = mktRegex2.exec(koSrc)) !== null) {
  const afterPos = mktMatch2.index + mktMatch2[0].length;
  const searchWindow = koSrc.substring(afterPos, afterPos + 5000);
  if (searchWindow.includes('"autoMarketing"') || searchWindow.includes('"budgetSetup"')) {
    console.log(`\n🔍 Verification (ko.js correct marketing block at char ${mktMatch2.index}):`);
    ['gf1Title','gf15Title','guideFullTitle','csTitle','guideTip6'].forEach(k => {
      console.log(`  ${k}: ${searchWindow.includes(`"${k}"`) ? '✅' : '❌ NOT FOUND'}`);
    });
    break;
  }
}
