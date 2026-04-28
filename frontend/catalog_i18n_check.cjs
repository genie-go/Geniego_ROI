const fs = require('fs');
const locales = ['ko','en','ja','zh','zh-TW','es','fr','de','pt','ru','ar','hi','th','vi','id'];
const needed = [
  'heroTitle','heroDesc','tabCatalog','tabSyncRun','tabCategoryMapping','tabPriceRules',
  'tabStockPolicy','tabHistory','tabGuide','guideStep1Title','guideStep1Desc',
  'guideStep15Title','guideStep15Desc','guideTip1','guideTip10',
  'searchPlaceholder','selectAllBtn','deselectAllBtn','bulkRegisterBtn',
  'registerToChannel','channelPriceRecommendTitle','catMapTitle','scheduleTitle',
  'stockLabel','noHistory','securityBannerTitle','kpiAllProducts'
];

for (const lang of locales) {
  const p = `src/i18n/locales/${lang}.js`;
  if (!fs.existsSync(p)) { console.log(`❌ ${lang}.js not found`); continue; }
  const c = fs.readFileSync(p, 'utf8');
  const hasCatalogSync = c.includes('"catalogSync"');
  const missing = needed.filter(k => !c.includes(`"${k}"`));
  console.log(`${hasCatalogSync ? '✅' : '❌'} ${lang}.js — catalogSync: ${hasCatalogSync}, missing sample keys: ${missing.length}/${needed.length} [${missing.slice(0,3).join(',')}...]`);
}
