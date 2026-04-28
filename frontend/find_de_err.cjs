const fs=require('fs');
const s=fs.readFileSync(__dirname+'/src/i18n/locales/de.js','utf8');
// Find unescaped quotes inside strings by looking for pattern: ","word  (quote comma quote then text without colon)
const matches=[];
for(let i=1;i<s.length-1;i++){
  if(s[i]==='"' && s[i-1]!=='\\'){
    // Check if next non-space char is a letter (broken string)
    let j=i+1;
    while(j<s.length && s[j]===' ')j++;
    if(j<s.length && /[A-ZÄÖÜa-zäöü]/.test(s[j]) && s[j-1]!==':'){
      // Potential break - check context
      const ctx=s.substring(Math.max(0,i-30),Math.min(s.length,i+30));
      if(!ctx.includes('":"') && !ctx.includes('","')){
        matches.push({pos:i,ctx:ctx});
      }
    }
  }
}
console.log('Potential breaks:',matches.length);
matches.forEach(m=>console.log(m.pos,':',m.ctx));
