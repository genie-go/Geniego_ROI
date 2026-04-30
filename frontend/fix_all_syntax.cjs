const fs=require('fs'),p=require('path');
const D=p.join(__dirname,'src','i18n','locales');
const langs=['ko','en','ja','zh','zh-TW','de','id','th','vi','es','fr','pt','ru','ar','hi'];
for(const l of langs){
  const f=p.join(D,l+'.js');
  let c=fs.readFileSync(f,'utf8');
  let fixed=false;
  // Fix missing comma between csFmtShort and next key
  if(c.includes('"csFmtShort"')){
    const re=/"csFmtShort": "[^"]*"\s*\n(\s*"[a-zA-Z])/g;
    const m=re.exec(c);
    if(m && !c.substring(m.index, m.index+m[0].length).includes(',')){
      // missing comma
    }
  }
  // Fix stray \r, pattern  
  const before=c;
  c=c.replace(/"\r,\n/g, '",\n');
  // Fix missing comma between last new key and next existing key
  c=c.replace(/"csFmtShort": "([^"]*)"\n(\s*")/g, '"csFmtShort": "$1",\n$2');
  c=c.replace(/"csLastSync": "([^"]*)"\n(\s*")/g, '"csLastSync": "$1",\n$2');
  c=c.replace(/"csUnitCount": "([^"]*)"\n(\s*")/g, '"csUnitCount": "$1",\n$2');
  if(c!==before){fixed=true;fs.writeFileSync(f,c,'utf8');}
  console.log(`${l}.js: ${fixed?'FIXED':'OK'}`);
}
