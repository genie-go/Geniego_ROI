// Check which locales have guide keys inside marketing namespace
const fs = require('fs');
const path = require('path');
const dir = path.resolve(__dirname, 'src/i18n/locales');
const langs = ['ja','zh','zh-TW','de','es','fr','pt','ru','ar','hi','th','vi','id'];

langs.forEach(l => {
  const fp = path.join(dir, `${l}.js`);
  let src = fs.readFileSync(fp, 'utf8');
  // Convert ESM to evaluatable object
  src = src.replace(/^export\s+default\s*/, '(');
  // Remove trailing semicolons
  src = src.replace(/;\s*$/, ')');
  try {
    const obj = eval(src);
    const mk = obj.marketing || {};
    const keys = ['gf1Title','gf1Desc','gf15Title','gf15Desc','guidePhaseA','guidePhaseE',
                  'guideFullTitle','guideFullSub','guideTabCreativeName','guideTabCreativeDesc',
                  'guideTipsTitle','guideTip1','guideTip6','guideTip7',
                  'guideTabsTitle','guideStartBtn','guideTitle','guideSub'];
    const missing = keys.filter(k => !mk[k]);
    const has = keys.filter(k => mk[k]);
    console.log(`${l}: ${has.length}/${keys.length} OK, missing=${missing.length} [${missing.slice(0,6).join(',')}${missing.length>6?'...':''}]`);
  } catch(e) {
    console.log(`${l}: ERROR ${e.message.substring(0, 100)}`);
  }
});
