const fs=require('fs'),path=require('path');
const DIR=path.join(__dirname,'frontend/src/i18n/locales');
const LANGS=['ko','en','ja','zh','zh-TW','de','th','vi','id'];

LANGS.forEach(lang=>{
  const file=path.join(DIR,`${lang}.js`);
  let code=fs.readFileSync(file,'utf8');
  
  // 1. Fix \\\\n patterns (literal 4 backslashes + n or 2 backslashes + n)
  // These corrupt values like: "value,\\\\n        " → "value"
  // We need to remove the ,\\n....." and restore
  code=code.replace(/,\\\\\\\\n\s*"/g,',"');  // ,\\\\n followed by spaces and "
  code=code.replace(/,\\\\n\s*"/g,',"');      // ,\\n followed by spaces and "
  
  // 2. Fix k_9 specifically
  code=code.replace(/k_9:"[^"]*\\\\[^"]*"/g,'k_9:"Channel Intelligence"');
  if(lang==='ko') code=code.replace(/k_9:"Channel Intelligence"/,'k_9:"채널 인텔리전스"');
  
  // 3. Fix customers value
  code=code.replace(/customers:"👤[^"]*\\\\[^"]*"/g, lang==='ko'?'customers:"👤 고객"':'customers:"👤 Customers"');
  
  // 4. Remove orphaned a:"" entries
  code=code.replace(/,a:""\}/g,'}');
  code=code.replace(/,a:"[^"]*"\}/g,'}');
  
  // 5. Now re-fix brace balance using the skip-negative-depth approach
  let result='';
  let depth=0,inStr=false,esc=false;
  for(let i=0;i<code.length;i++){
    const c=code[i];
    if(esc){esc=false;result+=c;continue}
    if(c==='\\' && inStr){esc=true;result+=c;continue}
    if(inStr){if(c==='"')inStr=false;result+=c;continue}
    if(c==='"'){inStr=true;result+=c;continue}
    if(c==='{'){depth++;result+=c;continue}
    if(c==='}'){
      depth--;
      if(depth<0){depth=0;continue;} // skip extra }
      result+=c;
      continue;
    }
    result+=c;
  }
  
  // Add missing closing braces
  if(depth>0){
    result=result.replace(/;\s*$/,'');
    for(let i=0;i<depth;i++) result+='}';
    result+=';\n';
  }
  
  // Final brace count verify
  let fDepth=0;inStr=false;esc=false;
  for(let i=0;i<result.length;i++){
    const c=result[i];
    if(esc){esc=false;continue}
    if(c==='\\'){esc=true;continue}
    if(inStr){if(c==='"')inStr=false;continue}
    if(c==='"'){inStr=true;continue}
    if(c==='{')fDepth++;
    if(c==='}')fDepth--;
  }
  
  fs.writeFileSync(file,result,'utf8');
  console.log(`${lang}: ${code.length} → ${result.length}, finalDepth=${fDepth}`);
});

// Build test
console.log('\nBuilding...');
const {execSync}=require('child_process');
try{
  execSync('npm run build',{cwd:path.join(__dirname,'frontend'),stdio:'pipe',timeout:120000});
  console.log('✅ BUILD SUCCESS!');
}catch(e){
  const out=((e.stdout||'')+(e.stderr||'')).toString();
  const errLine=out.match(/Unexpected token[^(]*\([^)]*\)/);
  if(errLine) console.log('❌',errLine[0]);
  else {
    // Find which file has the error
    const fileErr=out.match(/locales\/(\w+(-\w+)?)\.js/);
    if(fileErr) console.log('❌ Error in',fileErr[0]);
    else console.log('❌ Build failed');
  }
}
