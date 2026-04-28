const fs=require('fs');
const p=__dirname+'/src/i18n/locales/de.js';
let s=fs.readFileSync(p,'utf8');
s=s.replace('einrichten.,','einrichten.",');
fs.writeFileSync(p,s);
try{require(p);console.log('DE OK!');}catch(e){console.log('ERR:',e.message.substring(0,80));}
