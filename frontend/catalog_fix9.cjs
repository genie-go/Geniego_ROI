/**
 * Clean approach: Remove all misinserted lines and fix from scratch
 * The real issue is that fix7 and fix8 added </div> at wrong places
 * and the original phase1 removed some divs but not their closing tags
 * 
 * Let's find lines that are standalone </div> on a line that breaks balance
 * and also find functions with balance issues
 */
const fs=require('fs');
const esbuild=require('esbuild');
const FILE='./src/pages/CatalogSync.jsx';

// First: let's see the current state by trying to parse with proper JSX parser
let src=fs.readFileSync(FILE,'utf8');
let lines=src.split(/\r?\n/);

// Remove fix7/fix8 artifacts: lines that are just "            </div>" 
// inserted before ProgressBar's return closing
// Check ProgressBar area (around line 211-228)
console.log('ProgressBar area:');
for(let i=220;i<230 && i<lines.length;i++){
  console.log(i+1,':',lines[i]);
}

// The ProgressBar function had its original </div> removed by phase1
// when it changed background: "rgba(255,255,255,0.06)" to "#e5e7eb"
// But the closing </div> is still there. The issue is something else.

// Let's check if there's a "</div>" that was added by fix8
// Look for any line that's just whitespace + </div> and was added
// Actually, let's just check what the diff count is now
const opens=(src.match(/<div/g)||[]).length;
const closes=(src.match(/<\/div>/g)||[]).length;
console.log(`Global: open=${opens} close=${closes} diff=${opens-closes}`);

// If diff is now negative (too many closes), we need to remove some
// If diff is positive, we need to add some
// Each function should have balanced divs

// Remove the misinserted </div> from fix8 in ProgressBar
if(lines[222] && lines[222].trim() === '</div>'){
  // Check if this is the fix8 insertion
  if(lines[221] && lines[221].trim() === '' && lines[223] && lines[223].trim() === ');'){
    console.log('Found fix8 insertion at line 223, removing');
    lines.splice(222,1);
    src=lines.join('\r\n');
    fs.writeFileSync(FILE,src,'utf8');
    lines=src.split(/\r?\n/);
  }
}

// Now recount
const o2=(src.match(/<div/g)||[]).length;
const c2=(src.match(/<\/div>/g)||[]).length;
console.log(`After cleanup: open=${o2} close=${c2} diff=${o2-c2}`);

// Now let's check per-function
const funcStarts=[];
for(let i=0;i<lines.length;i++){
  if(lines[i].match(/^function\s+\w|^export\s+default\s+function/)){
    funcStarts.push(i);
  }
}

for(let fi=0;fi<funcStarts.length;fi++){
  const start=funcStarts[fi];
  const end=fi<funcStarts.length-1?funcStarts[fi+1]-1:lines.length-1;
  const block=lines.slice(start,end+1).join('\n');
  const od=(block.match(/<div/g)||[]).length;
  const cd=(block.match(/<\/div>/g)||[]).length;
  if(od!==cd){
    const name=lines[start].match(/function\s+(\w+)/)?.[1]||'?';
    console.log(`  ${name} (${start+1}-${end+1}): +${od} -${cd} = ${od-cd}`);
  }
}

// Try esbuild
esbuild.transform(src,{loader:'jsx'})
  .then(()=>console.log('✅ esbuild OK'))
  .catch(e=>{
    const m=e.message.match(/:(\d+):(\d+):.*?ERROR:\s*(.+)/);
    console.log(`❌ ${m?`${m[1]}:${m[2]} ${m[3]}`:'?'}`);
  });
