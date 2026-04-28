const fs=require('fs');
const s=fs.readFileSync('./src/i18n/locales/ko.js','utf8');
const wp=s.indexOf('"webPopup"');
let i=wp;
let count=0;
while((i=s.indexOf('"tabAiDesign"',i))!==-1&&count<5){
  console.log('pos',i,':',s.substring(i,i+50));
  i++;
  count++;
}
// Check if there are duplicate webPopup keys
const wps=s.match(/"webPopup"/g);
console.log('\n"webPopup" occurrences:',wps?wps.length:0);
