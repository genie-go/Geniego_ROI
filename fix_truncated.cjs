const fs=require('fs'),path=require('path');
const DIR=path.join(__dirname,'frontend/src/i18n/locales');
const LANGS=['ko','en','ja','zh','zh-TW','de','th','vi','id'];

LANGS.forEach(lang=>{
  const file=path.join(DIR,`${lang}.js`);
  let code=fs.readFileSync(file,'utf8');

  // Fix truncated values - these have pattern like: "value," (value ending with comma inside string)
  // k_9:"Channel Intelligen," → k_9:"Channel Intelligence"
  // tab:{customers:"👤," → tab:{customers:"👤 Customers"
  
  // Find and fix k_9 value
  code=code.replace(/k_9:"Channel Intelligen,"/g,'k_9:"Channel Intelligence"');
  code=code.replace(/k_9:"채널 인텔리전,"/g,'k_9:"채널 인텔리전스"');
  
  // Fix tab:{customers:"👤," 
  code=code.replace(/customers:"👤,"/g,'customers:"👤 고객"');
  code=code.replace(/customers:"👤 고객"/g, lang==='ko' ? 'customers:"👤 고객"' : 'customers:"👤 Customers"');
  
  // General fix: find any string value that ends with just a comma before the closing quote
  // Pattern: :"text," where text looks truncated (ends with comma inside quotes)
  // Actually the real issue is the \\n replacement corrupted values
  // Let's be more surgical: look for the exact bad patterns
  
  // Fix: ,",  patterns that are orphaned from \\n removal 
  // These are: key:"partial value,", which should be key:"partial value"
  // But we can't blindly remove all trailing commas in strings
  // The specific known patterns:
  code=code.replace(/"Channel Intelligen,"/, '"Channel Intelligence"');
  code=code.replace(/"👤,"/, '"👤 Customers"');
  
  // For ko.js specific
  if(lang==='ko'){
    code=code.replace(/"👤 Customers"/, '"👤 고객"');
  }
  
  fs.writeFileSync(file,code,'utf8');
});

// Quick build test
const {pathToFileURL}=require('url');
setTimeout(async()=>{
  for(const lang of LANGS){
    const file=path.join(DIR,`${lang}.js`);
    try{
      const m=await import(pathToFileURL(file).href);
      console.log(`✅ ${lang}: OK`);
    }catch(e){
      // Find the specific position
      const code=fs.readFileSync(file,'utf8');
      const errMsg=e.message;
      console.log(`❌ ${lang}: ${errMsg.substring(0,80)}`);
      
      // Search for comma-in-string patterns
      const badPats=[...code.matchAll(/"[^"]*,"/g)];
      const suspicious=badPats.filter(m=>{
        const val=m[0];
        // If the value looks truncated (short, ends with comma before quote)
        return val.length<15 && val.endsWith(',"');
      });
      if(suspicious.length>0){
        console.log(`  Suspicious values:`);
        suspicious.slice(0,5).forEach(m=>console.log(`    pos ${m.index}: ${m[0]}`));
      }
    }
  }
},500);
