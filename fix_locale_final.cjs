const fs=require('fs'),path=require('path');
const DIR=path.join(__dirname,'frontend/src/i18n/locales');
const LANGS=['ko','en','ja','zh','zh-TW','de','th','vi','id'];
const {pathToFileURL}=require('url');

LANGS.forEach(lang=>{
  const file=path.join(DIR,`${lang}.js`);
  let code=fs.readFileSync(file,'utf8');
  
  // Fix 1: depth=1 means we need one more closing brace at the end
  code=code.trimEnd();
  if(code.endsWith(';')){
    code=code.slice(0,-1)+'};\n';
  }
  
  // Fix 2: consecutive commas ,,  
  code=code.replace(/,,+/g,',');
  
  // Fix 3: comma before } like ,}
  code=code.replace(/,\s*\}/g,'}');
  
  // Fix 4: orphan \\n inside strings (literal backslash-n)
  // Pattern like: "value,\\n    ","next...  → "value","next...
  code=code.replace(/",\\\\n\s*"/g,'","');
  
  fs.writeFileSync(file,code,'utf8');
  
  // Check brace balance
  let depth=0,inStr=false,esc=false;
  for(let i=code.indexOf('{');i<code.length;i++){
    const ch=code[i];
    if(esc){esc=false;continue}
    if(ch==='\\' && inStr){esc=true;continue}
    if(inStr){if(ch==='"')inStr=false;continue}
    if(ch==='"'){inStr=true;continue}
    if(ch==='{')depth++;
    if(ch==='}')depth--;
  }
  console.log(`${lang}: depth=${depth}`);
});

// Wait a bit then verify
setTimeout(async()=>{
  console.log('\n--- Verification ---');
  for(const lang of LANGS){
    const file=path.join(DIR,`${lang}.js`);
    try{
      const m=await import(pathToFileURL(file).href);
      const o=m.default;
      const oc=o.omniChannel||{};
      console.log(`✅ ${lang}: OK, ${Object.keys(o).length} top-level, omniChannel=${Object.keys(oc).length}, hero="${(oc.heroTitle||'?').substring(0,20)}"`);
    }catch(e){
      console.log(`❌ ${lang}: ${e.message.substring(0,100)}`);
    }
  }
},500);
