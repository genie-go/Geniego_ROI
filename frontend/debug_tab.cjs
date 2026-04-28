const fs=require('fs');
const s=fs.readFileSync('./src/i18n/locales/ko.js','utf8');
let i=0;
while((i=s.indexOf('tabAiDesign',i))!==-1){
  console.log('pos',i,':',s.substring(Math.max(0,i-20),i+60));
  i++;
}
