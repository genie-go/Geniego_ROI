/**
 * fix_remaining_sidebar.cjs — Fix graphScoreLabel + crm/commerce group labels
 */
const fs = require('fs');
const path = require('path');
const DIR = path.join(__dirname, 'src', 'i18n', 'locales');

const FIXES = {
  ko: {"graphScoreLabel":"그래프 스코어","crmLabel":"고객 & 채널","commerceLabel":"커머스 & 물류"},
  en: {"graphScoreLabel":"Graph Score","crmLabel":"CRM & Channels","commerceLabel":"Commerce & Logistics"},
  ja: {"graphScoreLabel":"グラフスコア","crmLabel":"顧客＆チャネル","commerceLabel":"コマース＆物流"},
  zh: {"graphScoreLabel":"图谱评分","crmLabel":"客户和渠道","commerceLabel":"电商和物流"},
};

const LANGS = ['ko','en','ja','zh','zh-TW','es','fr','de','th','vi','id','pt','ru','ar','hi'];
let total = 0;

LANGS.forEach(lang => {
  const file = path.join(DIR, `${lang}.js`);
  if (!fs.existsSync(file)) return;
  let src = fs.readFileSync(file, 'utf8');
  const keys = FIXES[lang] || FIXES.en;
  let added = 0;
  
  Object.entries(keys).forEach(([k, v]) => {
    const escaped = v.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    const entry = `"${k}":"${escaped}"`;
    if (src.includes(`"${k}"`)) return;
    const nsMatch = /"gNav"\s*:\s*\{/.exec(src);
    if (nsMatch) {
      const idx = nsMatch.index + nsMatch[0].length;
      src = src.slice(0, idx) + entry + ',' + src.slice(idx);
      added++;
    }
  });
  
  if (added > 0) {
    fs.writeFileSync(file, src, 'utf8');
    console.log(`✅ ${lang}: ${added} keys`);
    total += added;
  }
});
console.log(`Total: ${total}`);
