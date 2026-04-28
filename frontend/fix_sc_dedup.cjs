// Deduplicate supplyChain blocks in all locale files
// Keep only the LAST occurrence (most complete), remove others
const fs=require('fs');
const DIR='src/i18n/locales/';
const ALL=['ko','en','ja','zh','zh-TW','th','vi','id','de','fr','es','pt','ru','ar','hi'];

function findBlockEnd(src, startIdx){
  let braceStart=src.indexOf('{',startIdx);
  if(braceStart===-1)return -1;
  let depth=1,i=braceStart+1,inStr=false,strChar='';
  while(i<src.length&&depth>0){
    let ch=src[i];
    if(inStr){
      if(ch==='\\'){ i+=2; continue; }
      if(ch===strChar) inStr=false;
      i++; continue;
    }
    if(ch==='"'||ch==="'"){ inStr=true; strChar=ch; i++; continue; }
    if(ch==='{') depth++;
    if(ch==='}') depth--;
    i++;
  }
  return depth===0?i:-1;
}

ALL.forEach(lang=>{
  let src=fs.readFileSync(DIR+lang+'.js','utf8');
  
  // Find all supplyChain occurrences
  let positions=[];
  let searchFrom=0;
  while(true){
    let idx=src.indexOf('supplyChain',searchFrom);
    if(idx===-1)break;
    // Find the block end
    let end=findBlockEnd(src,idx);
    if(end===-1)break;
    positions.push({start:idx,end:end});
    searchFrom=end;
  }
  
  if(positions.length<=1){
    console.log(lang+': OK ('+positions.length+' block)');
    return;
  }
  
  console.log(lang+': FOUND '+positions.length+' supplyChain blocks, keeping last');
  
  // Keep the last block, remove all others
  // Work backwards to preserve indices
  for(let i=positions.length-2;i>=0;i--){
    let p=positions[i];
    // Expand start to include key prefix ("supplyChain": or ,supplyChain:)
    let removeStart=p.start;
    // Go back to find comma or quote
    let j=removeStart-1;
    while(j>=0&&' \t\n\r'.includes(src[j]))j--;
    if(src[j]===':'||src[j]==='"'||src[j]==="'"){
      // Go further back to find the key start
      j--;
      while(j>=0&&src[j]!==','&&src[j]!=='{')j--;
      if(src[j]===',')removeStart=j;
    }
    src=src.substring(0,removeStart)+src.substring(p.end);
  }
  
  // Clean up double commas
  src=src.replace(/,,/g,',');
  src=src.replace(/\{,/g,'{');
  
  fs.writeFileSync(DIR+lang+'.js',src);
  
  // Verify
  let cnt=0,s=0;
  while((s=src.indexOf('supplyChain',s))!==-1){cnt++;s++;}
  console.log('  -> After: '+cnt+' block(s)');
});
