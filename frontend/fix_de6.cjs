const fs=require('fs');
const p=__dirname+'/src/i18n/locales/de.js';
let s=fs.readFileSync(p,'utf8');
// Remove chars 44955 to 44967 (the broken "Ausführen\.")
// 44954 is . (end of einrichten.)
// 44955 is " (start of broken Ausführen segment)  
// 44968 is , (start of next key separator)
// We want: ...einrichten.","guideStep4...
s = s.substring(0, 44955) + s.substring(44968);
fs.writeFileSync(p,s);
try{require(p);console.log('DE OK!');}catch(e){console.log('ERR:',e.message.substring(0,80));}
