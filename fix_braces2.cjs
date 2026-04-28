const fs=require('fs'),path=require('path');
const DIR=path.join(__dirname,'frontend/src/i18n/locales');
const LANGS=['ko','en','ja','zh','zh-TW','de','th','vi','id'];

LANGS.forEach(lang=>{
  const file=path.join(DIR,`${lang}.js`);
  let code=fs.readFileSync(file,'utf8');
  
  // Strip trailing whitespace/newlines
  code=code.trimEnd();
  
  // If it ends with just ';' but not '};', we need to add the missing braces
  // Count brace balance
  let opens=0,closes=0,inStr=false,esc=false,strCh='';
  for(let i=0;i<code.length;i++){
    const c=code[i];
    if(esc){esc=false;continue}
    if(c==='\\' && inStr){esc=true;continue}
    if(!inStr && (c==='"' || c==="'" || c==='`')){inStr=true;strCh=c;continue}
    if(inStr && c===strCh){inStr=false;continue}
    if(!inStr){
      if(c==='{')opens++;
      if(c==='}')closes++;
    }
  }
  
  const diff=opens-closes; // positive means we need more closing braces
  console.log(`${lang}: opens=${opens} closes=${closes} need ${diff} more closing braces`);
  
  if(diff>0){
    // Remove trailing semicolon/newline to add braces
    code=code.replace(/;\s*$/,'');
    for(let i=0;i<diff;i++) code+='}';
    code+=';\n';
  }else if(diff<0){
    // Too many closing braces - remove from end
    code=code.replace(/;\s*$/,'');
    let toRemove=Math.abs(diff);
    while(toRemove>0 && code.endsWith('}')){
      code=code.slice(0,-1);
      toRemove--;
    }
    code+=';\n';
  }
  
  fs.writeFileSync(file,code,'utf8');
  
  // Verify
  try{
    // Use a tempfile approach for ESM
    const tmpFile=path.join(__dirname,`_tmp_check_${lang}.mjs`);
    fs.writeFileSync(tmpFile,code,'utf8');
    // Can't dynamic import easily, so just check syntax via acorn-like method
    const body=code.replace(/^export default\s*/,'').replace(/;\s*$/,'');
    const fn=new Function('return ('+body+')');
    const o=fn();
    const oc=o.omniChannel||{};
    console.log(`  ✅ ${lang}: ${Object.keys(o).length} top-level keys, omniChannel=${Object.keys(oc).length}`);
    fs.unlinkSync(tmpFile);
  }catch(e){
    console.log(`  ❌ ${lang}: ${e.message.substring(0,80)}`);
  }
});
