/**
 * 대시보드 다국어 완전 진단 — 누락 키 전수 조사
 */
const path = require('path');
const LOCALES_DIR = path.join(__dirname, 'src/i18n/locales');
const LANGS = ['ko','en','ja','zh','zh-TW','de','fr','es','vi','th','id','pt','ru','ar','hi'];

// Load Korean as reference (most complete)
const ko = require(path.join(LOCALES_DIR, 'ko.js')).default;
const en = require(path.join(LOCALES_DIR, 'en.js')).default;

// Check key groups
const GROUPS = ['dashTabs','dashPeriod','dash','dashGuide','dashboard'];

console.log('═══ Dashboard i18n Completeness Audit ═══\n');

GROUPS.forEach(group => {
  const koObj = ko[group];
  const enObj = en[group];
  if (!koObj && !enObj) { console.log(`[SKIP] ${group}: not found in ko/en`); return; }
  
  const refObj = (typeof koObj === 'object' && koObj) || (typeof enObj === 'object' && enObj);
  if (!refObj) { console.log(`[SKIP] ${group}: not an object`); return; }
  
  const refKeys = Object.keys(refObj);
  console.log(`\n── ${group} (${refKeys.length} keys) ──`);
  
  LANGS.forEach(lang => {
    delete require.cache[require.resolve(path.join(LOCALES_DIR, `${lang}.js`))];
    const locale = require(path.join(LOCALES_DIR, `${lang}.js`)).default;
    const obj = locale[group];
    
    if (!obj || typeof obj !== 'object') {
      console.log(`  ${lang}: ❌ MISSING (${group} is ${typeof obj})`);
      return;
    }
    
    const keys = Object.keys(obj);
    const missing = refKeys.filter(k => !obj[k]);
    const english = Object.entries(obj).filter(([k, v]) => {
      if (lang === 'en') return false;
      // Check if value is still English (same as en version)
      return enObj && enObj[k] && v === enObj[k];
    });
    
    if (missing.length === 0 && english.length === 0) {
      console.log(`  ${lang}: ✅ ${keys.length}/${refKeys.length} keys, all native`);
    } else {
      console.log(`  ${lang}: ⚠️  ${keys.length}/${refKeys.length} keys | ${missing.length} missing | ${english.length} still English`);
      if (english.length > 0 && english.length <= 5) {
        english.forEach(([k]) => console.log(`    → ${k}: "${obj[k]}"`));
      }
    }
  });
});
