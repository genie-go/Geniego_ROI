const fs=require('fs');
const p=__dirname+'/src/i18n/locales/de.js';
let s=fs.readFileSync(p,'utf8');
// Binary search for error
const prefix='var x=';const suffix='';
let lo=100,hi=s.length,errPos=-1;
while(lo<hi){
  const mid=Math.floor((lo+hi)/2);
  const chunk=s.substring(0,mid);
  try{new Function(prefix+chunk.replace('export default',''));lo=mid+1;}
  catch(e){hi=mid;errPos=mid;}
}
if(errPos>0){
  console.log('Error near pos',errPos);
  console.log('Context:',JSON.stringify(s.substring(Math.max(0,errPos-40),errPos+40)));
}
