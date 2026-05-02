const fs=require('fs'),path=require('path');
const DIR=path.join(__dirname,'frontend/src/i18n/locales');
const LANGS=['ko','en','ja','zh','zh-TW','de','th','vi','id'];

LANGS.forEach(lang=>{
  const file=path.join(DIR,`${lang}.js`);
  let code=fs.readFileSync(file,'utf8');
  const origLen=code.length;
  
  // Fix 1: Replace \\n (double-escaped newlines) with actual content
  // These are cases like: ",\\n    " which should be just ","
  // Pattern: ,\\n followed by whitespace and then "
  code=code.replace(/,\\\\n\s*"/g,',"');
  code=code.replace(/,\\\\n\s*,/g,',');
  
  // Fix 2: Find and fix extra } that cause depth < 0
  // Parse and find the first position where depth goes negative
  let startPos=code.indexOf('{');
  let depth=0;
  let inStr=false;
  let esc=false;
  let extraBraces=[];
  
  for(let i=startPos;i<code.length;i++){
    const ch=code[i];
    if(esc){esc=false;continue}
    if(ch==='\\' && inStr){esc=true;continue}
    if(inStr){if(ch==='"')inStr=false;continue}
    if(ch==='"'){inStr=true;continue}
    if(ch==='{')depth++;
    if(ch==='}'){
      depth--;
      if(depth<0){
        extraBraces.push(i);
        depth=0; // reset to keep searching
      }
    }
  }
  
  // Remove extra braces from the end (reverse order to preserve positions)
  if(extraBraces.length>0){
    console.log(`${lang}: Found ${extraBraces.length} extra } at positions: ${extraBraces.join(', ')}`);
    for(let i=extraBraces.length-1;i>=0;i--){
      code=code.substring(0,extraBraces[i])+code.substring(extraBraces[i]+1);
    }
  }
  
  // Ensure clean ending: };
  code=code.trimEnd();
  if(!code.endsWith(';'))code+=';';
  code+='\n';
  
  // Verify final brace balance  
  let finalDepth=0;
  inStr=false;esc=false;
  for(let i=code.indexOf('{');i<code.length;i++){
    const ch=code[i];
    if(esc){esc=false;continue}
    if(ch==='\\' && inStr){esc=true;continue}
    if(inStr){if(ch==='"')inStr=false;continue}
    if(ch==='"'){inStr=true;continue}
    if(ch==='{')finalDepth++;
    if(ch==='}')finalDepth--;
  }
  
  fs.writeFileSync(file,code,'utf8');
  console.log(`  ${lang}: ${origLen} → ${code.length} bytes, final depth=${finalDepth}, \\\\n fixes=${origLen-code.length+extraBraces.length}`);
});

console.log('\n--- Verification ---');
// Now try to verify with proper ESM handling
const {pathToFileURL}=require('url');
LANGS.forEach(async lang=>{
  const file=path.join(DIR,`${lang}.js`);
  try{
    const m=await import(pathToFileURL(file).href);
    const o=m.default;
    const oc=o.omniChannel||{};
    console.log(`✅ ${lang}: OK, ${Object.keys(o).length} top-level, omniChannel=${Object.keys(oc).length}`);
  }catch(e){
    console.log(`❌ ${lang}: ${e.message.substring(0,100)}`);
  }
});
