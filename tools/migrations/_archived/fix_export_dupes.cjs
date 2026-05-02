const fs=require('fs'),path=require('path');
const DIR=path.join(__dirname,'frontend/src/i18n/locales');
const LANGS=['ko','en','ja','zh','zh-TW','de','th','vi','id'];

LANGS.forEach(lang=>{
  const file=path.join(DIR,`${lang}.js`);
  const c=fs.readFileSync(file,'utf8');
  
  // Find all 'export default' occurrences
  let idx=0;
  const positions=[];
  while(true){
    const p=c.indexOf('export default',idx);
    if(p<0)break;
    positions.push(p);
    idx=p+1;
  }
  console.log(`${lang}: ${positions.length} 'export default' at positions: ${positions.join(', ')}`);
  
  if(positions.length>1){
    console.log(`  PROBLEM: Multiple export default! Keeping only the first one.`);
    // Keep content from first export default to end
    // But we need to merge the objects
    // Strategy: extract all blocks, merge them
    const blocks=[];
    for(let i=0;i<positions.length;i++){
      const start=positions[i];
      const end=i<positions.length-1?positions[i+1]:c.length;
      blocks.push(c.substring(start,end));
    }
    console.log(`  Found ${blocks.length} blocks`);
    
    // Parse each block to get the object content
    const allKeys={};
    blocks.forEach((block,bi)=>{
      // Extract the object body between first { and matching }
      const bodyStart=block.indexOf('{');
      if(bodyStart<0)return;
      
      // Find matching }
      let depth=0,inStr=false,esc=false;
      let bodyEnd=-1;
      for(let i=bodyStart;i<block.length;i++){
        const ch=block[i];
        if(esc){esc=false;continue}
        if(ch==='\\'&&inStr){esc=true;continue}
        if(ch==='"'){inStr=!inStr;continue}
        if(!inStr){
          if(ch==='{')depth++;
          if(ch==='}'){depth--;if(depth===0){bodyEnd=i;break}}
        }
      }
      if(bodyEnd<0)bodyEnd=block.length-1;
      
      const inner=block.substring(bodyStart+1,bodyEnd);
      
      // Find top-level keys (key:{...} or key:"...")
      let j=0;
      while(j<inner.length){
        const km=inner.substring(j).match(/^([a-zA-Z_]\w*):\{/);
        if(km){
          const key=km[1];
          // Find matching }
          let d2=0,s2=false,e2=false,end2=-1;
          for(let k=j+km[0].length-1;k<inner.length;k++){
            const ch=inner[k];
            if(e2){e2=false;continue}
            if(ch==='\\'&&s2){e2=true;continue}
            if(ch==='"'){s2=!s2;continue}
            if(!s2){
              if(ch==='{')d2++;
              if(ch==='}'){d2--;if(d2===0){end2=k;break}}
            }
          }
          if(end2>0){
            allKeys[key]=inner.substring(j,end2+1);
            j=end2+1;
          }else{
            j++;
          }
        }else{
          j++;
        }
        // Skip comma
        while(j<inner.length&&(inner[j]===','||inner[j]===' '||inner[j]==='\n'))j++;
      }
    });
    
    console.log(`  Merged ${Object.keys(allKeys).length} top-level keys`);
    
    // Rebuild
    const merged='export default {'+Object.values(allKeys).join(',')+'};\n';
    fs.writeFileSync(file,merged,'utf8');
    
    try{
      const fn=new Function(merged.replace('export default','return'));
      const o=fn();
      console.log(`  ✅ ${lang}: Fixed! Top-level keys: ${Object.keys(o).length}, omniChannel: ${Object.keys(o.omniChannel||{}).length}`);
    }catch(e){
      console.log(`  ❌ ${lang}: Still broken: ${e.message.substring(0,80)}`);
    }
  }else{
    try{
      const fn=new Function(c.replace('export default','return'));
      const o=fn();
      console.log(`  ✅ ${lang}: OK, ${Object.keys(o).length} top-level keys`);
    }catch(e){
      console.log(`  ❌ ${lang}: Syntax error: ${e.message.substring(0,80)}`);
    }
  }
});
