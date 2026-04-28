const fs=require('fs'),path=require('path');
const file=path.join(__dirname,'frontend/src/i18n/locales/ko.js');
const code=fs.readFileSync(file,'utf8');

// Find all single-quoted strings which aren't valid in strict JSON-style but ARE valid in JS
// The issue might be a single-quoted string
const singleQuotePositions=[];
let inDQ=false,esc=false;
for(let i=0;i<code.length;i++){
  const c=code[i];
  if(esc){esc=false;continue}
  if(c==='\\'&&inDQ){esc=true;continue}
  if(c==='"'){inDQ=!inDQ;continue}
  if(!inDQ && c==="'"){
    singleQuotePositions.push(i);
  }
}
console.log('Single quotes outside double-quoted strings:',singleQuotePositions.length);
if(singleQuotePositions.length>0){
  singleQuotePositions.slice(0,5).forEach(p=>{
    console.log(`  pos ${p}: ${JSON.stringify(code.substring(Math.max(0,p-20),p+20))}`);
  });
}

// Check for bare \\\" in strings (triple escaped quotes)  
const tripleEsc=[...code.matchAll(/\\\\\\\\\\\\"/g)];
console.log('\nTriple-escaped quotes:',tripleEsc.length);
tripleEsc.slice(0,3).forEach(m=>{
  console.log(`  pos ${m.index}: ${JSON.stringify(code.substring(Math.max(0,m.index-15),m.index+20))}`);
});

// Manually parse from beginning, character by character, tracking state
let state='key'; // key, colon, value, comma
let depth=0;
let inStr=false;
let strQuote='';
esc=false;
let start=code.indexOf('{');
let errPos=-1;

for(let i=start;i<code.length;i++){
  const c=code[i];
  if(esc){esc=false;continue}
  if(c==='\\'&&inStr){esc=true;continue}
  
  if(inStr){
    if(c===strQuote)inStr=false;
    continue;
  }
  
  if(c==='"'||c==="'"){inStr=true;strQuote=c;continue}
  if(c===' '||c==='\n'||c==='\r'||c==='\t')continue;
  
  if(c==='{'){depth++;continue}
  if(c==='}'){depth--;if(depth<0){console.log('Extra } at',i);break}continue}
  if(c===','){continue}
  if(c===':'){continue}
  if(/[a-zA-Z_$0-9]/.test(c)){continue}
  
  // Unexpected character
  console.log(`Unexpected char '${c}' (0x${c.charCodeAt(0).toString(16)}) at pos ${i}`);
  console.log(`  Context: ${JSON.stringify(code.substring(Math.max(0,i-30),i+30))}`);
  errPos=i;
  break;
}

if(errPos<0)console.log('No unexpected characters found, depth=',depth);
