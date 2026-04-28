const fs=require('fs'),path=require('path');
const file=path.join(__dirname,'frontend/src/i18n/locales/ko.js');
const code=fs.readFileSync(file,'utf8');
const body=code.replace(/^export default\s*/,'').replace(/;\s*$/,'');

// Binary search for the exact error position
function tryParse(s){
  try{
    new Function('return ('+s+')')();
    return true;
  }catch(e){return false}
}

// Find the last position where parsing still works
let lo=0,hi=body.length;
while(lo<hi-1){
  const mid=Math.floor((lo+hi)/2);
  // Try to close all open braces at mid
  let depth=0,inStr=false,esc=false;
  for(let i=0;i<mid;i++){
    const c=body[i];
    if(esc){esc=false;continue}
    if(c==='\\' && inStr){esc=true;continue}
    if(inStr){if(c==='"')inStr=false;continue}
    if(c==='"'){inStr=true;continue}
    if(c==='{')depth++;
    if(c==='}')depth--;
  }
  
  let test=body.substring(0,mid);
  // Close any open string
  if(inStr) test+='"';
  // Close all open braces
  for(let i=0;i<depth;i++)test+='}';
  
  if(tryParse(test)){
    lo=mid;
  }else{
    hi=mid;
  }
}

console.log('Error between positions',lo,'and',hi);
console.log('Context at error:');
console.log(JSON.stringify(body.substring(Math.max(0,lo-50),lo+50)));
