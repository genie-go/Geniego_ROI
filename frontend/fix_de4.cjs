const fs=require('fs');
const p=__dirname+'/src/i18n/locales/de.js';
let s=fs.readFileSync(p,'utf8');

// The problem is a corrupted guideStep3Desc value
// Current (broken): ...einrichten.\"Ausführen\\\".\",\"guideStep4Title...
// Should be:        ...einrichten.\",\"guideStep4Title...

// Strategy: find guideStep3Desc value start, then find guideStep4Title, replace between
const start=s.indexOf('"guideStep3Desc":"');
const end=s.indexOf('","guideStep4Title"');
if(start>0 && end>0){
  const valStart=start+'"guideStep3Desc":"'.length;
  const currentVal=s.substring(valStart,end);
  console.log('Current guideStep3Desc:',JSON.stringify(currentVal));
  const fixedVal='Verträge mit Festgebühren, Leistungsraten und Rechteumfang einrichten.';
  s=s.substring(0,valStart)+fixedVal+s.substring(end);
  fs.writeFileSync(p,s);
  console.log('Fixed to:',fixedVal);
}

// Check for more issues
const p2=require('@babel/parser');
try{p2.parse(s,{sourceType:'module'});console.log('DE BABEL OK');}
catch(e){
  const pos=parseInt(e.message.match(/\(1:(\d+)\)/)?.[1]);
  if(pos){
    console.log('Still error at',pos,JSON.stringify(s.substring(pos-20,pos+20)));
  } else {
    console.log('Error:',e.message.substring(0,80));
  }
}
try{require(p);console.log('DE REQUIRE OK');}catch(e){console.log('Require ERR:',e.message.substring(0,60));}
