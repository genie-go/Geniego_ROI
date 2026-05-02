const fs=require('fs'),path=require('path');
const DIR=path.join(__dirname,'frontend/src/i18n/locales');
const LANGS=['ko','en','ja','zh','zh-TW','de','th','vi','id'];
const {execSync}=require('child_process');

LANGS.forEach(lang=>{
  const file=path.join(DIR,`${lang}.js`);
  let code=fs.readFileSync(file,'utf8');
  
  // Fix: }}}}}, → }}}, (remove 2 extra closing braces before ,dashboard)
  // The pattern is: performance data ends, then excess braces before dashboard
  code=code.replace(/livePerformance:"[^"]*"\}\}\}\}\}/g, (m)=>{
    // Replace 5 closing braces with 3
    return m.replace(/\}\}\}\}\}$/,'}}}');
  });
  
  // Also check for similar patterns with other keys
  // General: find },dashboard where depth would be negative
  // Fix }}}} → }} patterns
  code=code.replace(/\}\}\}\}\},dashboard/g,'}},dashboard');
  code=code.replace(/\}\}\}\}\},/g,'}},');
  
  fs.writeFileSync(file,code,'utf8');
  
  // Quick acorn check
  try{
    execSync(`npx -y acorn --ecma2020 --module "${file}" > nul 2>&1`,{stdio:'pipe',timeout:10000});
    console.log(`✅ ${lang}: OK`);
  }catch(e){
    const stderr=(e.stderr||'').toString();
    const m=stderr.match(/(\d+):(\d+)\)/);
    if(m){
      const lines=code.split('\n');
      const line=lines[parseInt(m[1])-1]||'';
      const col=parseInt(m[2]);
      console.log(`❌ ${lang}: line ${m[1]} col ${m[2]}: ...${line.substring(Math.max(0,col-40),col+20)}...`);
    }else{
      console.log(`❌ ${lang}: error`);
    }
  }
});
