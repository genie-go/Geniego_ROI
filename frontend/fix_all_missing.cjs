const fs=require('fs'),vm=require('vm');
const f='src/i18n/locales/ko.js';
const c=fs.readFileSync(f,'utf8');
const code=c.replace(/^export\s+default\s+/,'M.e=');
const M={e:null};
vm.runInNewContext(code,{M});
const ko=M.e;

// Fix Marketing tab keys (used in Marketing.jsx L666-671)
ko.marketing = {
  ...(ko.marketing||{}),
  mktTabOverview:"종합 현황",
  mktTabAdStatus:"광고 현황",
  mktTabCreative:"크리에이티브",
  mktTabCompare:"비교 분석",
  mktTabAiDesign:"AI 디자인",
  mktTabGuide:"이용 가이드"
};

// Now scan ALL components for guide keys that are still missing
const pagesDir='src/pages';
const pages=fs.readdirSync(pagesDir).filter(f=>f.endsWith('.jsx'));
const allMissing=new Set();

for(const page of pages){
  const src=fs.readFileSync(pagesDir+'/'+page,'utf8');
  // Find t("key", "fallback") or t("key") patterns
  const matches=src.matchAll(/t\(\s*["']([^"']+)["'](?:\s*,\s*["']([^"']*?)["'])?\s*\)/g);
  for(const m of matches){
    const key=m[1];
    if(key.includes('${')||key.includes('`')) continue; // skip template literals
    // Check if key exists in ko
    const parts=key.split('.');
    let val=ko;
    for(const p of parts){val=val?.[p];}
    if(val===undefined){
      const fallback=m[2]||'';
      allMissing.add(key+'|||'+fallback+'|||'+page);
    }
  }
}

// Group by section
const sections={};
for(const entry of allMissing){
  const[key,fallback,page]=entry.split('|||');
  const dot=key.indexOf('.');
  if(dot<0) continue;
  const section=key.substring(0,dot);
  const subKey=key.substring(dot+1);
  if(!sections[section]) sections[section]={};
  sections[section][subKey]={fallback,page};
}

console.log('Missing keys by section:');
let totalMissing=0;
for(const[section,keys]of Object.entries(sections).sort((a,b)=>Object.keys(b[1]).length-Object.keys(a[1]).length)){
  const count=Object.keys(keys).length;
  totalMissing+=count;
  if(count>3){
    console.log(`  ${section}: ${count} keys (from ${[...new Set(Object.values(keys).map(v=>v.page))].join(', ')})`);
    // Show first 5
    for(const[k,v]of Object.entries(keys).slice(0,5)){
      console.log(`    ${k} = "${v.fallback}"`);
    }
    if(count>5) console.log(`    ... +${count-5} more`);
  }
}
console.log(`\nTotal missing: ${totalMissing} keys in ${Object.keys(sections).length} sections`);

// Auto-inject: for keys with English fallbacks, inject the fallback as Korean placeholder
// This ensures no raw keys are shown
let injected=0;
for(const[section,keys]of Object.entries(sections)){
  if(!ko[section]) ko[section]={};
  for(const[subKey,{fallback}]of Object.entries(keys)){
    if(fallback && !ko[section][subKey]){
      ko[section][subKey]=fallback; // Use English fallback for now
      injected++;
    }
  }
}

const out=`export default ${JSON.stringify(ko,null,2)};\n`;
fs.writeFileSync(f,out,'utf8');
console.log(`\nInjected ${injected} fallback values into ko.js`);
console.log('Total size: '+(Buffer.byteLength(out,'utf8')/1024).toFixed(1)+'KB');
