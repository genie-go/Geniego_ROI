const fs=require('fs');
const s=fs.readFileSync('./src/i18n/locales/ar.js','utf8');
let i=0;
while((i=s.indexOf('tabGuide',i))!==-1){
  console.log('pos',i,':',s.substring(Math.max(0,i-10),i+60));
  i++;
}
