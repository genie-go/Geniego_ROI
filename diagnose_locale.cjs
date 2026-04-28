const fs=require('fs'),path=require('path');

// Check ko.js for issues
const file=path.join(__dirname,'frontend/src/i18n/locales/ko.js');
const c=fs.readFileSync(file,'utf8');

// Find problematic escaped sequences
let issues=[];
for(let i=0;i<c.length;i++){
  // Look for \\n that should be \n
  if(c[i]==='\\' && c[i+1]==='\\' && c[i+2]==='n'){
    issues.push({pos:i,ctx:JSON.stringify(c.substring(Math.max(0,i-20),i+20))});
  }
  // Look for unescaped quotes in strings
  if(c[i]==='"' && i>0 && c[i-1]!=='\\'){
    // Check if this breaks a string
  }
}
console.log('Double-escaped \\\\n found:',issues.length);
issues.slice(0,3).forEach(x=>console.log('  pos',x.pos,x.ctx));

// More importantly - try to find the EXACT error location
// Let's parse character by character and find where the colon doesn't belong
let depth=0;
let inStr=false;
let esc=false;
let afterKey=false; // after a key, expecting ':'
let afterColon=false; // after ':', expecting value
let afterValue=false; // after value, expecting ',' or '}'
let errLine=0;

// Skip 'export default '
let startPos=c.indexOf('{');

for(let i=startPos;i<c.length;i++){
  const ch=c[i];
  
  if(esc){esc=false;continue}
  if(ch==='\\' && inStr){esc=true;continue}
  
  if(inStr){
    if(ch==='"') inStr=false;
    continue;
  }
  
  if(ch==='"'){inStr=true;continue}
  if(ch==='{'){depth++;continue}
  if(ch==='}'){depth--;if(depth<0){console.log('Extra } at pos',i);break}continue}
  if(ch===',')continue;
  if(ch===':')continue;
  if(ch==='\n')errLine++;
  if(ch===' '||ch==='\t'||ch==='\r')continue;
  
  // A-Z, a-z, 0-9, _
  if(/[a-zA-Z0-9_]/.test(ch))continue;
  
  // Other characters are fine inside
}

console.log('Final depth:',depth);
console.log('Total lines:',errLine);

// Try with acorn or just run as ESM
const tmpFile=path.join(__dirname,'_tmp_locale_check.mjs');
fs.writeFileSync(tmpFile,c);

import(tmpFile).then(m=>{
  console.log('✅ ESM import OK! Keys:',Object.keys(m.default).length);
  const oc=m.default.omniChannel||{};
  console.log('omniChannel keys:',Object.keys(oc).length);
  fs.unlinkSync(tmpFile);
}).catch(e=>{
  console.log('❌ ESM import failed:',e.message.substring(0,200));
  fs.unlinkSync(tmpFile);
});
