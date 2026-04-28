const fs=require('fs');
const src=fs.readFileSync('./src/i18n/locales/ar.js','utf8');
const mIdx=src.indexOf('"marketing"');
console.log('"marketing" first at:',mIdx);
// Find all tabCreative after marketing
let pos=mIdx;
let count=0;
while(true){
  const i=src.indexOf('"tabCreative"',pos);
  if(i===-1)break;
  console.log('tabCreative at',i,':',src.substring(i,i+80));
  pos=i+1;
  count++;
  if(count>5)break;
}
// Same for tabGuide
pos=mIdx;count=0;
while(true){
  const i=src.indexOf('"tabGuide"',pos);
  if(i===-1)break;
  console.log('tabGuide at',i,':',src.substring(i,i+60));
  pos=i+1;
  count++;
  if(count>3)break;
}
