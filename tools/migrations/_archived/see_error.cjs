const fs=require('fs');
const code=fs.readFileSync('./frontend/src/i18n/locales/ko.js','utf8');
const lines=code.split('\n');
const line4=lines[3];
console.log('Line 4 length:', line4.length);

// Error at col 98751
const col=98751;
console.log('Around col 98751:');
console.log(line4.substring(col-60,col+40));
console.log(' '.repeat(60)+'^--- ERROR HERE');

// Also check what structure we're in
// Count open/close braces up to that point (approximately)
let depth=0,inStr=false,esc=false;
for(let i=0;i<Math.min(col,line4.length);i++){
  const c=line4[i];
  if(esc){esc=false;continue}
  if(c==='\\'){esc=true;continue}
  if(inStr){if(c==='"')inStr=false;continue}
  if(c==='"'){inStr=true;continue}
  if(c==='{')depth++;
  if(c==='}')depth--;
}
console.log('Depth at error point:', depth);
