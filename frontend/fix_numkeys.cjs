// Fix numeric-prefix property keys: 1Name -> "1Name", 2Title -> "2Title", etc.
const fs=require('fs');
const DIR='src/i18n/locales/';
const files=fs.readdirSync(DIR).filter(f=>f.endsWith('.js'));
files.forEach(f=>{
  let src=fs.readFileSync(DIR+f,'utf8');
  // Fix patterns like: 1Name: -> "1Name":  and  2Title: -> "2Title":
  let changed=false;
  const fixed=src.replace(/(\s)(\d+[A-Za-z]\w*)\s*:/g,(m,ws,key)=>{
    changed=true;
    return ws+'"'+key+'":';
  });
  if(changed){fs.writeFileSync(DIR+f,fixed);console.log(f+': fixed numeric keys');}
  else console.log(f+': OK');
});
