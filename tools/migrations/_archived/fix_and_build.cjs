const fs=require('fs'),path=require('path');
const DIR=path.join(__dirname,'frontend/src/i18n/locales');
const LANGS=['ko','en','ja','zh','zh-TW','de','th','vi','id'];

LANGS.forEach(lang=>{
  const file=path.join(DIR,`${lang}.js`);
  let code=fs.readFileSync(file,'utf8');
  
  // Count real brace balance
  let opens=0,closes=0,inStr=false,esc=false;
  for(let i=0;i<code.length;i++){
    const c=code[i];
    if(esc){esc=false;continue}
    if(c==='\\'){esc=true;continue}
    if(inStr){if(c==='"')inStr=false;continue}
    if(c==='"'){inStr=true;continue}
    if(c==='{')opens++;
    if(c==='}')closes++;
  }
  
  const need=opens-closes;
  console.log(`${lang}: opens=${opens} closes=${closes} need=${need}`);
  
  // Fix: add or remove braces at end
  code=code.trimEnd();
  if(code.endsWith(';'))code=code.slice(0,-1);
  
  if(need>0){
    for(let i=0;i<need;i++)code+='}';
  }else if(need<0){
    // Remove excess } from end
    let toRemove=Math.abs(need);
    while(toRemove>0&&code.endsWith('}')){
      code=code.slice(0,-1);
      toRemove--;
    }
  }
  
  code+=';\n';
  fs.writeFileSync(file,code,'utf8');
});

// Now test build
console.log('\nTesting build...');
const {execSync}=require('child_process');
try{
  execSync('npm run build',{cwd:path.join(__dirname,'frontend'),stdio:'pipe',timeout:120000});
  console.log('✅ BUILD SUCCESS!');
}catch(e){
  const stdout=(e.stdout||'').toString();
  const stderr=(e.stderr||'').toString();
  const allOut=stdout+stderr;
  // Extract error line
  const errMatch=allOut.match(/Unexpected token[^(]*\(([^)]+)\)/);
  if(errMatch) console.log('❌ BUILD FAILED:',errMatch[0]);
  else console.log('❌ BUILD FAILED at end');
  // Show last meaningful lines
  const lines=allOut.split('\n').filter(l=>l.trim()).slice(-5);
  lines.forEach(l=>console.log(' ',l.substring(0,120)));
}
