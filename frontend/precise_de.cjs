const fs=require('fs');
const s=fs.readFileSync(__dirname+'/src/i18n/locales/de.js','utf8');
// Try parsing increasing chunks
const body=s.replace('export default ','');
for(let sz=1000;sz<body.length;sz+=1000){
  const chunk=body.substring(0,sz);
  // Close any open braces
  let opens=0;
  for(const c of chunk){if(c==='{')opens++;if(c==='}')opens--;}
  const closed=chunk+('}'.repeat(Math.max(0,opens)));
  try{new Function('return '+closed);} 
  catch(e){
    console.log('Error between',sz-1000,'and',sz);
    console.log(e.message.substring(0,60));
    // Narrow down
    for(let i=sz-1000;i<sz;i+=100){
      const c2=body.substring(0,i);
      let o2=0;for(const ch of c2){if(ch==='{')o2++;if(ch==='}')o2--;}
      try{new Function('return '+c2+('}'.repeat(Math.max(0,o2))));}
      catch(e2){console.log('  Narrowed:',i-100,'-',i,body.substring(i-20,i+20));break;}
    }
    break;
  }
}
