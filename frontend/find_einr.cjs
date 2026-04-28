const fs=require('fs');
const p=__dirname+'/src/i18n/locales/de.js';
let s=fs.readFileSync(p,'utf8');

// Find ALL occurrences of einrichten. and check for corruption after each
let idx=0;
while(true){
  const pos=s.indexOf('einrichten.',idx);
  if(pos<0)break;
  const after=s.substring(pos+11,pos+50);
  console.log('einrichten. at',pos,':',JSON.stringify(after));
  idx=pos+11;
}
