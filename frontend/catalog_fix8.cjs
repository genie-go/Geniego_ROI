/**
 * Smart div balance fixer for CatalogSync.jsx
 * Finds unclosed <div> tags within each function's return JSX
 * and adds closing </div> tags right before the function's closing ");"
 * 
 * Strategy: Instead of trying to fix insertions at wrong places,
 * we'll restore deleted closing tags after className replacements
 */
const fs=require('fs');
const FILE='./src/pages/CatalogSync.jsx';
let src=fs.readFileSync(FILE,'utf8');

// Revert the bad fix7 insertions first
// Just reload original (fix7 hasn't been saved if esbuild failed... but it was)
// Actually fix7 DID write to file. Let's undo those inserted </div> tags
// They were inserted as standalone lines. Find and remove:
src = src.replace(/^            <\/div>\r?\n(?=            <\/div>\r?\n)/gm, '');

// Actually, let's find the exact problem differently.
// The original phase1 script replaced className="badge" with a style= attribute
// but "badge" is a self-contained <span>, not a <div>, so no div was lost there.
// The real issue: className="card" was replaced to style={...} on a <div>,
// but somehow some </div> tags were lost.

// Let's just count and see where div balance breaks within each function
const lines=src.split(/\r?\n/);

// Find function boundaries more precisely
const funcs=[];
let depth=0;
for(let i=0;i<lines.length;i++){
  if(lines[i].match(/^function\s+\w|^export\s+default\s+function/)){
    funcs.push({name:lines[i].match(/function\s+(\w+)/)?.[1]||'default',start:i});
  }
}
// Set each function's end
for(let i=0;i<funcs.length;i++){
  if(i<funcs.length-1) funcs[i].end=funcs[i+1].start-1;
  else funcs[i].end=lines.length-1;
}

// Check div balance for each function
let totalFix=0;
for(const f of funcs){
  const funcLines=lines.slice(f.start,f.end+1);
  const od=(funcLines.join('\n').match(/<div/g)||[]).length;
  const cd=(funcLines.join('\n').match(/<\/div>/g)||[]).length;
  const diff=od-cd;
  if(diff!==0){
    console.log(`${f.name} (${f.start+1}-${f.end+1}): open=${od} close=${cd} diff=${diff}`);
    
    // For positive diff: add </div> before the last ");" of the function
    if(diff>0){
      // Find last ");" in this function
      let lastReturn=-1;
      for(let i=f.end;i>=f.start;i--){
        if(lines[i].trim()===');'){
          lastReturn=i;
          break;
        }
      }
      if(lastReturn>0){
        // Insert closing divs before the ");"
        // Match indentation of the ");" line
        const indent=lines[lastReturn].match(/^(\s*)/)[1];
        const closings=[];
        for(let d=0;d<diff;d++){
          closings.push(indent+'    </div>');
        }
        lines.splice(lastReturn,0,...closings);
        totalFix+=diff;
        // Adjust subsequent function boundaries
        for(const f2 of funcs){
          if(f2.start>lastReturn){f2.start+=diff;f2.end+=diff;}
          else if(f2.end>=lastReturn){f2.end+=diff;}
        }
        console.log(`  → Added ${diff} </div> at line ${lastReturn+1}`);
      }
    }
  }
}

fs.writeFileSync(FILE,lines.join('\r\n'),'utf8');
console.log(`Total fixes: ${totalFix}`);

// Check with esbuild
const esbuild=require('esbuild');
esbuild.transform(fs.readFileSync(FILE,'utf8'),{loader:'jsx'})
  .then(()=>console.log('✅ esbuild OK!'))
  .catch(e=>{
    const m=e.message.match(/:(\d+):(\d+):.*?ERROR:\s*(.+)/);
    if(m) console.log(`❌ line ${m[1]}:${m[2]}: ${m[3]}`);
    else console.log('❌',e.message.slice(0,300));
  });
