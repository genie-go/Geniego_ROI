const fs=require('fs'),path=require('path');
const DIR=path.join(__dirname,'frontend/src/i18n/locales');
const LANGS=['ko','en','ja','zh','zh-TW','de','th','vi','id'];

LANGS.forEach(lang=>{
  const file=path.join(DIR,`${lang}.js`);
  let code=fs.readFileSync(file,'utf8');
  
  // The problem: }}} triple braces appear after a:"A"
  // This means there's an extra nesting level from corrupted \\n removal
  // Pattern: ,a:"A"}}} → should be just ,a:"A"}} or ,a:"A"},
  // Actually, a:"A" is a dummy key used as a block separator/fix
  // The }}} closes: 1) aiPredict inner block 2) cmpVal block 3) top-level
  // But dashboard follows, so top-level shouldn't close
  
  // Fix: Replace a:"A"}}} with just removing the extra closing braces
  // Actually let's trace the structure:
  // cmpVal:{...},aiPredict:{...kpi:{...},tab:{...},aiRec:{...},cat:{...},performance:{...}},a:"A"}}
  // The }}} is: 1) close performance 2) close aiPredict 3) extra!
  // But a:"A" is OUTSIDE aiPredict at top-level
  
  // The issue: a:"A" with }}} means:
  // ...performance:{...}},a:"A"}}} → 
  //   } closes performance
  //   } closes aiPredict  
  //   ,a:"A" at cmpVal level
  //   }}} closes: 1) cmpVal 2) extra 3) extra
  
  // Just remove the dummy a:"A" entries and fix braces
  code=code.replace(/,a:"A"\}\}\}/g,'}}}');
  code=code.replace(/,a:"A"\}\}/g,'}}');
  code=code.replace(/,a:"A"\}/g,'}');
  code=code.replace(/,a:"A"/g,'');
  
  fs.writeFileSync(file,code,'utf8');
  console.log(lang+': removed a:"A" artifacts');
});

// Now check again with acorn
const {execSync}=require('child_process');
LANGS.forEach(lang=>{
  const file=path.join(DIR,`${lang}.js`);
  try{
    execSync(`npx -y acorn --ecma2020 --module "${file}" > nul 2>&1`,{stdio:'pipe'});
    console.log(`✅ ${lang}: syntax OK`);
  }catch(e){
    const stderr=e.stderr?.toString()||'';
    const match=stderr.match(/\([\w/.]+\s+(\d+):(\d+)\)/);
    if(match){
      console.log(`❌ ${lang}: error at line ${match[1]} col ${match[2]}`);
      const code=fs.readFileSync(file,'utf8');
      const lines=code.split('\n');
      const line=lines[parseInt(match[1])-1]||'';
      const col=parseInt(match[2]);
      console.log(`   Context: ...${line.substring(Math.max(0,col-30),col+30)}...`);
    }else{
      console.log(`❌ ${lang}: syntax error`);
    }
  }
});
