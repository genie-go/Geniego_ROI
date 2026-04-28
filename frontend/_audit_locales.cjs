// Audit all locale files for dashGuide key completeness
const fs = require('fs');
const path = require('path');

const LOCALE_DIR = path.join(__dirname, 'src/i18n/locales');
const langs = ['ko','en','ja','zh','de','th','vi','id','es','fr','pt','ru','ar','hi','zh-TW'];

// Reference keys from en.js dashGuide
const refKeys = [
  'title','subtitle','stepsTitle',
  'step1Title','step1Desc','step2Title','step2Desc','step3Title','step3Desc',
  'step4Title','step4Desc','step5Title','step5Desc','step6Title','step6Desc',
  'step7Title','step7Desc','step8Title','step8Desc','step9Title','step9Desc',
  'step10Title','step10Desc',
  'tabOverview','tabMarketing','tabChannel','tabCommerce','tabSales','tabInfluencer','tabSystem',
  'feat1Title','feat1Desc','feat2Title','feat2Desc','feat3Title','feat3Desc',
  'feat4Title','feat4Desc','feat5Title','feat5Desc','feat6Title','feat6Desc',
  'tipsTitle','tip1','tip2','tip3','tip4','tip5',
  'faq1Q','faq1A','faq2Q','faq2A','faq3Q','faq3A','faq4Q','faq4A','faq5Q','faq5A',
  'faqTitle','featuresTitle','tabsTitle','whereToStart','whereToStartDesc',
  'beginnerBadge','timeBadge','langBadge',
  'readyTitle','readyDesc',
];

console.log(`Auditing ${langs.length} locales for ${refKeys.length} dashGuide keys...\n`);

let hasIssues = false;
for (const lang of langs) {
  const file = lang === 'zh-TW' ? 'zh-TW.js' : `${lang}.js`;
  const filePath = path.join(LOCALE_DIR, file);
  if (!fs.existsSync(filePath)) { console.log(`❌ ${lang}: FILE NOT FOUND`); hasIssues = true; continue; }
  
  // Dynamic import won't work in CJS, so we read and eval
  const content = fs.readFileSync(filePath, 'utf-8');
  
  // Check if dashGuide exists
  const hasDashGuide = content.includes('dashGuide');
  if (!hasDashGuide) {
    console.log(`❌ ${lang}: NO dashGuide section at all`);
    hasIssues = true;
    continue;
  }
  
  // Check for key presence
  const missing = [];
  for (const key of refKeys) {
    // Look for key in dashGuide context
    if (!content.includes(`${key}:`)) {
      // Also check quoted version
      if (!content.includes(`"${key}":`)) {
        missing.push(key);
      }
    }
  }
  
  if (missing.length > 0) {
    console.log(`⚠️  ${lang}: Missing ${missing.length} keys: ${missing.join(', ')}`);
    hasIssues = true;
  } else {
    console.log(`✅ ${lang}: All ${refKeys.length} dashGuide keys present`);
  }
}

if (!hasIssues) {
  console.log('\n🎉 All locales have complete dashGuide translations!');
} else {
  console.log('\n⚠️  Some locales need attention.');
}
