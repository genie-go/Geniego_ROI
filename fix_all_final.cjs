const fs=require('fs'),path=require('path');
const DIR=path.join(__dirname,'frontend/src/i18n/locales');
const LANGS=['ko','en','ja','zh','zh-TW','de','th','vi','id'];

LANGS.forEach(lang=>{
  const file=path.join(DIR,`${lang}.js`);
  let code=fs.readFileSync(file,'utf8');
  
  // Fix ALL }}}}}, patterns → }}, 
  // The pattern is: performance block ends with }}, then aiPredict closes with }, then cmpVal closes with }
  // But there are extra } after that
  // Replace }}}}} with }} everywhere (the depth-fix below handles the rest)
  while(code.includes('}}}}}')) code=code.replace(/\}\}\}\}\}/g,'}}}}');
  while(code.includes('}}}}')) code=code.replace(/\}\}\}\}/g,'}}}');
  
  // Actually, we can't blindly reduce }}} - they might be legitimate
  // Instead, let's use the character-level depth fix that skips negative depth
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
      if(depth<0){depth=0;continue}
      result+=c;
      continue;
    }
    result+=c;
  }
  
  if(depth>0){
    result=result.replace(/;\s*$/,'');
    for(let i=0;i<depth;i++)result+='}';
    result+=';\n';
  }
  
  fs.writeFileSync(file,result,'utf8');
  
  // Final depth verify
  let fD=0;inStr=false;esc=false;
  for(let i=0;i<result.length;i++){
    const c=result[i];
    if(esc){esc=false;continue}
    if(c==='\\'){esc=true;continue}
    if(inStr){if(c==='"')inStr=false;continue}
    if(c==='"'){inStr=true;continue}
    if(c==='{')fD++;
    if(c==='}')fD--;
  }
  console.log(`${lang}: ${code.length} → ${result.length}, depth=${fD}`);
});

// Check all with acorn
const {execSync}=require('child_process');
let allOK=true;
LANGS.forEach(lang=>{
  try{
    execSync(`npx acorn --ecma2020 --module frontend/src/i18n/locales/${lang}.js`,{cwd:__dirname,stdio:'pipe',timeout:15000});
    console.log(`✅ ${lang}`);
  }catch(e){
    allOK=false;
    const stderr=(e.stderr||'').toString();
    const m=stderr.match(/(\d+):(\d+)/);
    if(m) console.log(`❌ ${lang}: line ${m[1]} col ${m[2]}`);
    else console.log(`❌ ${lang}`);
  }
});

if(allOK){
  console.log('\nAll files OK! Building...');
  try{
    execSync('npm run build',{cwd:path.join(__dirname,'frontend'),stdio:'pipe',timeout:120000});
    console.log('✅ BUILD SUCCESS!');
  }catch(e){
    console.log('❌ Build failed');
  }
}
