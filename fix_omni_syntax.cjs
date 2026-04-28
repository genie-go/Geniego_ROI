const fs=require('fs'),path=require('path');
const DIR=path.join(__dirname,'frontend/src/i18n/locales');
const LANGS=['ko','en','ja','zh','zh-TW','de','th','vi','id'];

// Just verify and fix syntax
LANGS.forEach(lang=>{
  const file=path.join(DIR,`${lang}.js`);
  let code=fs.readFileSync(file,'utf8');
  
  // Fix: find the double }} at end and ensure omniChannel is properly inside
  // The structure should be: export default { ...allTopLevelKeys, omniChannel:{...} };
  // Possible issue: ,omniChannel:{...}} → second } closes the export default, but we get }};
  
  // Let's try to parse and see what happens
  try{
    const fn=new Function(code.replace('export default','return'));
    fn();
    console.log(`✅ ${lang}: syntax OK`);
  }catch(e){
    console.log(`❌ ${lang}: ${e.message.substring(0,60)}`);
    // Fix: the issue is likely }}} or similar
    // Find the pattern }}} at end
    const endMatch=code.match(/\}\s*\}\s*\}\s*;?\s*$/);
    if(endMatch){
      console.log(`   Found triple-brace pattern, fixing...`);
      // Remove last extra }
      const idx=code.lastIndexOf('}};');
      if(idx>0){
        // Check if there's another } just before
        const before=code.substring(idx-5,idx+3);
        console.log(`   Before fix: ${JSON.stringify(before)}`);
        code=code.substring(0,idx)+'};\n';
        fs.writeFileSync(file,code,'utf8');
        try{
          const fn2=new Function(code.replace('export default','return'));
          fn2();
          console.log(`   ✅ Fixed!`);
        }catch(e2){
          console.log(`   Still broken: ${e2.message.substring(0,60)}`);
        }
      }
    }
  }
});
