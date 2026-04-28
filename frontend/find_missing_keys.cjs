/**
 * Find ALL i18n keys used by page components that are showing raw keys
 * Focus on: marketing, campMgr, jb, adPerf, dashboard guide, budgetTracker
 */
const fs = require('fs');
const path = require('path');

const pagesDir = 'src/pages';
const targetComponents = [
  'AutoMarketing.jsx',
  'CampaignManager.jsx', 
  'JourneyBuilder.jsx',
  'AdvertisingPerformance.jsx',
  'Dashboard.jsx',
  'BudgetTracker.jsx',
  'AccountPerformance.jsx',
  'ChannelKPI.jsx',
  'CRM.jsx',
  'OmniChannel.jsx',
  'Attribution.jsx',
  'CatalogSync.jsx',
  'WmsManager.jsx',
  'InfluencerHub.jsx',
  'OrderHub.jsx',
  'WebPopup.jsx',
];

for (const comp of targetComponents) {
  const filePath = path.join(pagesDir, comp);
  if (!fs.existsSync(filePath)) continue;
  
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Find t("key") patterns
  const tCalls = content.match(/t\(\s*["'`]([^"'`]+)["'`]/g) || [];
  const keys = new Set();
  for (const call of tCalls) {
    const match = call.match(/t\(\s*["'`]([^"'`]+)["'`]/);
    if (match) keys.add(match[1]);
  }
  
  // Find guide-related keys specifically
  const guideKeys = [...keys].filter(k => 
    k.includes('guide') || k.includes('Guide') || 
    k.includes('tab') || k.includes('Tab') ||
    k.includes('Step')
  );
  
  if (guideKeys.length > 0) {
    console.log(`\n=== ${comp} (${guideKeys.length} guide/tab keys) ===`);
    guideKeys.forEach(k => console.log(`  ${k}`));
  }
}

// Now check which of these keys are missing from ko.js
console.log('\n\n=== Checking ko.js for missing guide keys ===');
const vm = require('vm');
const koContent = fs.readFileSync('src/i18n/locales/ko.js', 'utf8');
const code = koContent.replace(/^export\s+default\s+/, 'M.e = ');
const m = { e: null };
vm.runInNewContext(code, { M: m });
const ko = m.e;

// Deep get helper
function deepGet(obj, path) {
  return path.split('.').reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), obj);
}

// Check specific known problem keys
const problemKeys = [
  'marketing.guideTitle', 'marketing.guideSub', 'marketing.guideStepsTitle',
  'marketing.guideStep1Title', 'marketing.guideStep1Desc',
  'marketing.guideStep2Title', 'marketing.guideStep2Desc',
  'marketing.guideStep3Title', 'marketing.guideStep3Desc',
  'marketing.guideStep4Title', 'marketing.guideStep4Desc',
  'marketing.guideStep5Title', 'marketing.guideStep5Desc',
  'marketing.guideStep6Title', 'marketing.guideStep6Desc',
  'campMgr.guideTitle', 'campMgr.guideSub', 'campMgr.guideStepsTitle',
  'campMgr.guideStep1Title', 'campMgr.tabGuide',
  'jb.guideTitle', 'jb.guideSub', 'jb.guideStepsTitle',
  'jb.tabGuide',
  'dashGuide.title', 'dashGuide.desc', 'dashGuide.whereStart',
  'dashGuide.step1', 'dashGuide.step2',
  'adPerf.tabAdStatus', 'adPerf.tabCreative', 'adPerf.tabCompare', 
  'adPerf.tabAiDesign', 'adPerf.tabGuide',
];

console.log('\nMissing keys (❌):');
const missing = [];
const found = [];
for (const key of problemKeys) {
  const val = deepGet(ko, key);
  if (val === undefined) {
    console.log(`  ❌ ${key}`);
    missing.push(key);
  } else {
    found.push(key);
  }
}
console.log(`\nFound keys (✅): ${found.length}`);
found.forEach(k => console.log(`  ✅ ${k} = ${JSON.stringify(deepGet(ko, k)).substring(0, 60)}`));
