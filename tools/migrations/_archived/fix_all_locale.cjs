const fs=require('fs'),path=require('path');
const DIR=path.join(__dirname,'frontend/src/i18n/locales');
const LANGS=['ko','en','ja','zh','zh-TW','de','th','vi','id'];

// The \\n removal corrupted values. We need to find ALL truncated strings.
// Pattern: value that was "something,\\n        " became "something,"
// The fix: find strings that end with a lone comma: ,"  followed by key:
// These show up as ,"key: patterns 

LANGS.forEach(lang=>{
  const file=path.join(DIR,`${lang}.js`);
  let code=fs.readFileSync(file,'utf8');
  const orig=code;
  
  // Fix pattern 1: Values truncated to just comma: :",key → :"",key
  // These are places where the \\n removal ate the closing quote and value
  // Pattern: ,"identifier: where the comma+quote combo is actually end of truncated value
  // Real fix: find spots where a value is just "," (nothing between quotes except comma)  
  
  // Fix: Remove leftover \\n artifacts - these are literal backslash-n that shouldn't be in source
  // Replace any remaining ,\n (literal) inside string values that got left over
  
  // Strategy: Find all instances where value looks like it was mangled
  // The safest approach: find "text," where the comma at end doesn't make sense
  // Actually the real issue is values like: "Channel Intelligen," where comma was part of wrapped text
  
  // Fix specific known corruptions from the build output:
  // 1. k_9 value truncated
  code=code.replace(/k_9:"[^"]*Intelligen,"/g,'k_9:"Channel Intelligence"');
  // Korean version
  code=code.replace(/k_9:"[^"]*인텔리젠,"/g,'k_9:"채널 인텔리전스"');
  
  // 2. customers value truncated  
  code=code.replace(/customers:"👤,"/g, lang==='ko'?'customers:"👤 고객"':'customers:"👤 Customers"');
  
  // 3. General: any remaining literal \\n (two chars: backslash + n) in the source
  // that are NOT inside an already-escaped sequence
  // These appear as: text,\n        ",next → should be: text","next
  // After our earlier fix they became: text,",next → fix to: text","next
  
  // Remove any trailing comma inside a string value right before closing quote
  // Pattern: something,"  where the comma is the last char of the value and looks wrong
  // But we can only fix specific known patterns, not all (some values legitimately end with comma)
  
  // Fix the searchPh single-quote string with over-escaped quotes
  code=code.replace(/searchPh:'[^']*\\\\{4,}"[^']*'/g, 
    lang==='ko' ? `searchPh:"예: 뷰티 브랜드 인스타그램 광고 전략 또는 마케팅 목표 입력"` :
    `searchPh:"e.g. Beauty brand Instagram ad strategy or marketing goal"`
  );
  
  // Also fix any single-quoted strings (convert to double-quoted)
  // Find 'xxx' patterns outside of double-quoted strings
  let result='';
  let inDQ=false,esc=false;
  for(let i=0;i<code.length;i++){
    const c=code[i];
    if(esc){esc=false;result+=c;continue}
    if(c==='\\'){esc=true;result+=c;continue}
    if(inDQ){
      if(c==='"')inDQ=false;
      result+=c;
      continue;
    }
    if(c==='"'){inDQ=true;result+=c;continue}
    if(c==="'"){
      // Convert single-quoted string to double-quoted
      let j=i+1;
      let content='';
      let sqEsc=false;
      while(j<code.length){
        const sc=code[j];
        if(sqEsc){sqEsc=false;content+=sc;j++;continue}
        if(sc==='\\'){sqEsc=true;content+=sc;j++;continue}
        if(sc==="'"){j++;break}
        content+=sc;
        j++;
      }
      // Escape any unescaped double quotes in content
      content=content.replace(/(?<!\\)"/g,'\\"');
      // Remove over-escaped quotes
      content=content.replace(/\\{2,}"/g,'\\"');
      result+='"'+content+'"';
      i=j-1;
      continue;
    }
    result+=c;
  }
  code=result;
  
  fs.writeFileSync(file,code,'utf8');
  console.log(`${lang}: ${orig.length} → ${code.length}`);
});

// Verify with ESM import
const {pathToFileURL}=require('url');
const tmpFile=path.join(__dirname,'frontend','_tmp_check.mjs');

setTimeout(async()=>{
  for(const lang of LANGS){
    const file=path.join(DIR,`${lang}.js`);
    const code=fs.readFileSync(file,'utf8');
    fs.writeFileSync(tmpFile,code);
    try{
      // Clear module cache by using unique URL
      const url=pathToFileURL(tmpFile).href+'?v='+lang+Date.now();
      const m=await import(url);
      const o=m.default;
      const oc=o.omniChannel||{};
      console.log(`✅ ${lang}: ${Object.keys(o).length} keys, omni=${Object.keys(oc).length}`);
    }catch(e){
      console.log(`❌ ${lang}: ${e.message.substring(0,60)}`);
    }
  }
  try{fs.unlinkSync(tmpFile)}catch(e){}
},300);
