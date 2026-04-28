const fs=require('fs');
const DIR='./src/i18n/locales/';
const LANGS=['ko','en','ja','zh','zh-TW','es','fr','de','th','vi','id','pt','ru','ar','hi'];
const vals={ko:'그래프 스코어',en:'Graph Score',ja:'グラフスコア',zh:'图谱评分'};
LANGS.forEach(l=>{
  const f=DIR+l+'.js';
  let s=fs.readFileSync(f,'utf8');
  const v=vals[l]||vals.en;
  // Force inject into gNav namespace  
  const m = s.match(/"gNav"\s*:\s*\{/);
  if(m) {
    // Check if it already exists INSIDE gNav
    const gnavStart = m.index + m[0].length;
    // Find the closing brace of gNav by counting braces
    let depth = 1; let pos = gnavStart;
    while(depth > 0 && pos < s.length) {
      if(s[pos]==='{') depth++;
      if(s[pos]==='}') depth--;
      pos++;
    }
    const gnavContent = s.substring(gnavStart, pos-1);
    if(!gnavContent.includes('"graphScoreLabel"')) {
      s = s.slice(0,gnavStart) + '"graphScoreLabel":"'+v+'",' + s.slice(gnavStart);
      fs.writeFileSync(f,s,'utf8');
      console.log(l+': injected into gNav');
    } else {
      console.log(l+': already in gNav');
    }
  }
});
