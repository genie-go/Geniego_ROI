const fs=require('fs');
const p=__dirname+'/src/i18n/locales/de.js';
let s=fs.readFileSync(p,'utf8');
// Position 44944 is where einrichten. is
// Position 44955 starts the broken part (44944+11)
const beforeBreak=s.substring(44944,44956);
console.log('At 44944-44955:',JSON.stringify(beforeBreak));
// Show chars
for(let i=44950;i<44980;i++){
  console.log(i,s.charCodeAt(i),JSON.stringify(s[i]));
}
