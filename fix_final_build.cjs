const fs=require('fs'),path=require('path');
const DIR=path.join(__dirname,'frontend/src/i18n/locales');
const LANGS=['ko','en','ja','zh','zh-TW','de','th','vi','id'];

LANGS.forEach(lang=>{
  const file=path.join(DIR,`${lang}.js`);
  let code=fs.readFileSync(file,'utf8');
  const lines=code.split('\n');
  
  // Main content is on a single long line (line 4, index 3)
  // But it might span multiple lines after our fixes
  // Join all lines for processing
  let oneLine=code.replace(/\n/g,'');
  
  // Fix: livePerformance:"..."}}}}} → livePerformance:"..."}}}
  // There should be exactly 3 } after performance block:
  // 1) close performance, 2) close aiPredict, 3) close cmpVal
  // then ,dashboard follows
  
  // Find the pattern with excess trailing braces before ,dashboard
  oneLine=oneLine.replace(/livePerformance:"[^"]*"(\}+),/g,(match,braces)=>{
    const needed=3; // performance + aiPredict + cmpVal
    if(braces.length>needed){
      return match.replace(braces,'}}'.repeat(1).padEnd(needed,'}'));
    }
    return match;
  });
  
  // More general: fix all }}} patterns that cause negative depth
  // Iterate and find positions where depth goes below 0
  let result='';
  let depth=0,inStr=false,esc=false;
  let start=oneLine.indexOf('{');
  result=oneLine.substring(0,start);
  
  for(let i=start;i<oneLine.length;i++){
    const c=oneLine[i];
    if(esc){esc=false;result+=c;continue}
    if(c==='\\' && inStr){esc=true;result+=c;continue}
    if(inStr){if(c==='"')inStr=false;result+=c;continue}
    if(c==='"'){inStr=true;result+=c;continue}
    
    if(c==='{'){depth++;result+=c;continue}
    if(c==='}'){
      depth--;
      if(depth<0){
        // Skip this extra brace
        depth=0;
        continue;
      }
      result+=c;
      continue;
    }
    result+=c;
  }
  
  // Now check if we need more closing braces
  if(depth>0){
    // Remove trailing semicolon
    result=result.replace(/;\s*$/,'');
    for(let i=0;i<depth;i++) result+='}';
    result+=';\n';
  }
  
  // Verify brace balance
  let finalDepth=0;
  inStr=false;esc=false;
  for(let i=0;i<result.length;i++){
    const c=result[i];
    if(esc){esc=false;continue}
    if(c==='\\'){esc=true;continue}
    if(inStr){if(c==='"')inStr=false;continue}
    if(c==='"'){inStr=true;continue}
    if(c==='{')finalDepth++;
    if(c==='}')finalDepth--;
  }
  
  fs.writeFileSync(file,result,'utf8');
  console.log(`${lang}: depth=${finalDepth}, ${code.length} → ${result.length}`);
});

// Test build
console.log('\nBuilding...');
const {execSync}=require('child_process');
try{
  const out=execSync('npm run build',{cwd:path.join(__dirname,'frontend'),stdio:'pipe',timeout:120000});
  console.log('✅ BUILD SUCCESS!');
  const outStr=out.toString();
  const built=outStr.match(/built in [\d.]+s/);
  if(built)console.log(built[0]);
}catch(e){
  const stderr=(e.stderr||'').toString();
  const stdout=(e.stdout||'').toString();
  const all=stdout+stderr;
  // Find the first error mention
  const lines=all.split('\n');
  const errLines=lines.filter(l=>l.includes('rror')||l.includes('Unexpected'));
  console.log('❌ BUILD FAILED');
  errLines.slice(0,3).forEach(l=>console.log(' ',l.trim().substring(0,120)));
}
