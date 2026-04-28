// Find problematic patterns in ko.js
const fs=require('fs');
const s=fs.readFileSync('src/i18n/locales/ko.js','utf8');

// Find consecutive empty strings: "":""
let idx=0;
while((idx=s.indexOf('""', idx))!==-1){
  console.log('Found "" at pos '+idx+': '+JSON.stringify(s.substring(Math.max(0,idx-20),idx+20)));
  idx+=2;
}
