const fs=require('fs');
const DIR='./src/i18n/locales/';
const LANGS=['ko','en','ja','zh','zh-TW','es','fr','de','th','vi','id','pt','ru','ar','hi'];
const vals={ko:'그래프 스코어',en:'Graph Score',ja:'グラフスコア',zh:'图谱评分'};
LANGS.forEach(l=>{
  const f=DIR+l+'.js';
  let s=fs.readFileSync(f,'utf8');
  const v=vals[l]||vals.en;
  // Check if graphScoreLabel exists as a proper key-value pair in gNav
  if(s.includes('"graphScoreLabel":"')) {
    console.log(l+': already has graphScoreLabel value');
    return;
  }
  // If graphScoreLabel exists without value (from previous bad inject), skip
  const m = s.match(/"gNav"\s*:\s*\{/);
  if(m) {
    const idx = m.index + m[0].length;
    s = s.slice(0,idx) + '"graphScoreLabel":"'+v+'",' + s.slice(idx);
    fs.writeFileSync(f,s,'utf8');
    console.log(l+': injected graphScoreLabel = '+v);
  }
});

// Also fix crm and commerce section labelKeys in Sidebar
const sidebar = fs.readFileSync('./src/layout/Sidebar.jsx','utf8');
let fixed = sidebar;
fixed = fixed.replace('"gNav.crm"', '"gNav.crmLabel"');
fixed = fixed.replace('"gNav.commerce"', '"gNav.commerceLabel"');
if(fixed !== sidebar) {
  fs.writeFileSync('./src/layout/Sidebar.jsx', fixed, 'utf8');
  console.log('Sidebar: crm -> crmLabel, commerce -> commerceLabel');
}
