const fs=require('fs');
const p=__dirname+'/src/i18n/locales/de.js';
let s=fs.readFileSync(p,'utf8');
// Position 44944+11 = 44955 starts the broken segment
// Replace: einrichten.\"Ausführen\\.\" with einrichten.
const broken='einrichten.\\"Ausf\u00FChr';
const idx=s.indexOf(broken);
console.log('Found at:',idx);
if(idx>0){
  // Find end of this broken value - next proper ","guideStep4Title"
  const rest=s.substring(idx);
  const nextKey=rest.indexOf('","guideStep4Title"');
  if(nextKey>0){
    const toRemove=s.substring(idx+11,idx+nextKey);
    console.log('Removing:',JSON.stringify(toRemove));
    s=s.substring(0,idx+11)+s.substring(idx+nextKey);
    fs.writeFileSync(p,s);
  }
}
try{require(p);console.log('DE OK!');}catch(e){console.log('ERR:',e.message.substring(0,60));}
