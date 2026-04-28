// Check ja.js structure - find all "wms" key occurrences
const c=require('fs').readFileSync('src/i18n/locales/ja.js','utf8');
let p=0,n=0;
while(true){
    p=c.indexOf('"wms"',p);
    if(p===-1)break;
    n++;
    console.log('#'+n+' pos:'+p+' ctx:'+c.substring(p,p+40));
    p+=5;
}
console.log('Total "wms" sections:',n);

// Also check if invSearchPh appears outside of wms
p=0; n=0;
while(true){
    p=c.indexOf('invSearchPh',p);
    if(p===-1)break;
    n++;
    // Show surrounding context to see which section it's in
    const start=Math.max(0,p-100);
    const ctx=c.substring(start,p);
    const lastBrace=ctx.lastIndexOf('"wms"');
    console.log('invSearchPh #'+n+' at pos '+p+', nearby wms at: '+(lastBrace>-1?'found':'NOT in wms'));
    console.log('  value: '+c.substring(p,p+60));
    p+=11;
}
