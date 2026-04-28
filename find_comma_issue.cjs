const fs=require('fs'),path=require('path');
const {pathToFileURL}=require('url');
const file=path.join(__dirname,'frontend/src/i18n/locales/ko.js');
let code=fs.readFileSync(file,'utf8');

// Find "Unexpected token ','" - this usually means a bare comma outside of value context
// Look for patterns like: key:, or :"", or ,, etc
// Let's find all commas that are NOT inside strings and check context

let issues=[];
let inStr=false,esc=false;
for(let i=0;i<code.length;i++){
  const c=code[i];
  if(esc){esc=false;continue}
  if(c==='\\' && inStr){esc=true;continue}
  if(inStr){if(c==='"')inStr=false;continue}
  if(c==='"'){inStr=true;continue}
  
  if(c===','){
    // Check what comes before (ignoring whitespace)
    let before='';
    for(let j=i-1;j>=0;j--){
      if(code[j]!==' '&&code[j]!=='\n'&&code[j]!=='\r'&&code[j]!=='\t'){
        before=code.substring(Math.max(0,j-20),j+1);
        break;
      }
    }
    // Check what comes after
    let after='';
    for(let j=i+1;j<code.length;j++){
      if(code[j]!==' '&&code[j]!=='\n'&&code[j]!=='\r'&&code[j]!=='\t'){
        after=code.substring(j,Math.min(code.length,j+20));
        break;
      }
    }
    
    // Problem cases: comma after colon (key:,), comma after open brace ({,), comma after comma (,,)
    if(before.endsWith(':') || before.endsWith('{') || before.endsWith(',')){
      issues.push({pos:i,before:before.substring(before.length-15),after:after.substring(0,15)});
    }
  }
}

console.log('Problematic commas:',issues.length);
issues.slice(0,10).forEach(x=>console.log(`  pos ${x.pos}: ...${x.before} , ${x.after}...`));

// Fix: remove these problem commas and any orphaned content
// The \\n removal created empty values like: key:",  " → key:,
// Let's look for the pattern more specifically
const emptyVals=[...code.matchAll(/:\s*,/g)];
console.log('\nEmpty values (key:,):',emptyVals.length);
emptyVals.slice(0,5).forEach(m=>{
  const ctx=code.substring(Math.max(0,m.index-30),m.index+30);
  console.log('  ',JSON.stringify(ctx));
});
