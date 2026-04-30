const fs=require('fs'),p=require('path');
const D=p.join(__dirname,'src','i18n','locales');
const langs=['ko','en','ja','zh','zh-TW','de','id','th','vi','es','fr','pt','ru','ar','hi'];
for(const l of langs){
  const f=p.join(D,l+'.js');
  let c=fs.readFileSync(f,'utf8');
  const before=c;
  // Fix: ",\r," → ","
  c=c.replace(/",\r,/g, '",');
  // Fix: missing comma before next key (csFmtShort without comma)
  c=c.replace(/"csFmtShort": "([^"]*)"\n(\s*")/g, '"csFmtShort": "$1",\n$2');
  // Fix: missing comma after csSystemOk
  c=c.replace(/"csSystemOk": "([^"]*)"\n(\s*")/g, '"csSystemOk": "$1",\n$2');
  // Fix: missing comma after csLastSync
  c=c.replace(/"csLastSync": "([^"]*)"\n(\s*")/g, '"csLastSync": "$1",\n$2');
  // Fix: double commas
  c=c.replace(/,,/g, ',');
  if(c!==before){
    fs.writeFileSync(f,c,'utf8');
    console.log('[FIXED] '+l+'.js');
  } else {
    console.log('[OK] '+l+'.js');
  }
}
// Validate all files parse correctly
for(const l of langs){
  try{
    const f=p.join(D,l+'.js');
    const c=fs.readFileSync(f,'utf8');
    new Function(c.replace('export default','return'));
    console.log('[PARSE OK] '+l);
  }catch(e){
    console.log('[PARSE FAIL] '+l+': '+e.message.substring(0,80));
  }
}
