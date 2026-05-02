const fs=require('fs'),path=require('path');
const DIR=path.join(__dirname,'frontend/src/i18n/locales');
const LANGS=['ko','en','ja','zh','zh-TW','de','th','vi','id'];

LANGS.forEach(lang=>{
  const file=path.join(DIR,`${lang}.js`);
  let code=fs.readFileSync(file,'utf8');
  
  // Count and fix brace imbalance
  // Remove 'export default ' prefix and trailing ';\n'
  let body=code.replace(/^export default\s*/,'').replace(/;\s*$/,'').trim();
  
  // Count braces (not counting those inside strings)
  let opens=0,closes=0,inStr=false,esc=false;
  for(let i=0;i<body.length;i++){
    const c=body[i];
    if(esc){esc=false;continue}
    if(c==='\\' && inStr){esc=true;continue}
    if(c==='"'){inStr=!inStr;continue}
    if(!inStr){
      if(c==='{')opens++;
      if(c==='}')closes++;
    }
  }
  
  console.log(`${lang}: opens=${opens} closes=${closes} diff=${closes-opens}`);
  
  if(closes>opens){
    // Remove extra closing braces from the end
    let extra=closes-opens;
    let trimmed=body;
    while(extra>0){
      const lastClose=trimmed.lastIndexOf('}');
      if(lastClose>0){
        // Check if there's a matching open
        trimmed=trimmed.substring(0,lastClose)+trimmed.substring(lastClose+1);
        extra--;
      }else break;
    }
    body=trimmed;
  }
  
  code='export default '+body+';\n';
  fs.writeFileSync(file,code,'utf8');
  
  try{
    const fn=new Function(code.replace('export default','return'));
    const o=fn();
    const oc=o.omniChannel||{};
    console.log(`  ✅ ${lang}: ${Object.keys(oc).length} omniChannel keys, hero="${(oc.heroTitle||'').substring(0,25)}"`);
  }catch(e){
    console.log(`  ❌ ${lang}: ${e.message.substring(0,80)}`);
  }
});
