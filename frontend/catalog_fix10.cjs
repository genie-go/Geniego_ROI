const fs=require('fs');
const esbuild=require('esbuild');
const FILE='./src/pages/CatalogSync.jsx';
let src=fs.readFileSync(FILE,'utf8');

// Remove fix7 artifacts: find lines that are just "</div>" with wrong indentation
// that were inserted by fix7/fix8

// 1. Line 414: "</div>" after "</label>" - this is wrong (fix7 insertion)
// 2. Line 415: "            </div>" - also fix7
// Both these were inserted before the ");" of BulkRegisterModal step 0

// Remove the two extra </div> at lines 414-415
const pattern1='                                    </label>\r\n</div>\r\n            </div>\r\n                                );\r\n                            })}';
const replacement1='                                    </label>\r\n                                );\r\n                            })}';
if(src.includes(pattern1)){
  src=src.replace(pattern1,replacement1);
  console.log('✅ Removed fix7 artifacts from BulkRegisterModal');
}

// Find other fix7 insertions in BulkPriceModal, PriceSyncTab, CategoryMappingTab
// These functions have 1 extra </div>

// BulkPriceModal: find the extra </div>  
// Look for pattern where </div> appears with wrong indentation
const funcs=['BulkPriceModal','PriceSyncTab','CategoryMappingTab'];

// For each function, look for standalone </div> that shouldn't be there
// Actually, let's try a different approach - find the fix7 inserted lines
// fix7 inserted lines at "            </div>" before the ");" of each function

// Let's find patterns like:
// "            </div>\r\n    );\r\n}" where the </div> is extra
// Or more precisely, find ");\r\n}" patterns and check if there's an extra </div> before

// For BulkPriceModal (ends around line 745)
// For PriceSyncTab (ends around line 1797)  
// For CategoryMappingTab (ends around line 2047)

// Search for pattern: "</div>\r\n    );\r\n}" with extra </div> before it
const lines=src.split(/\r?\n/);
const extraCloses=[];
for(let i=0;i<lines.length;i++){
  // Look for lines that are just "            </div>" or similar
  // that have an imbalance
  if(lines[i].trim()==='</div>' && i>0 && i<lines.length-1){
    // Check if previous line also ends with </div>
    // and next line is ");" or also "</div>"
    const prev=lines[i-1].trim();
    const next=lines[i+1].trim();
    
    // Check indentation anomalies
    const indent=lines[i].match(/^\s*/)[0].length;
    const prevIndent=lines[i-1].match(/^\s*/)[0].length;
    
    // Fix7 inserted lines would have consistent 12-char indent
    if(indent===12 && next===');'){
      // This might be a fix7 insertion - check div balance around here
      // Count divs in the function containing this line
      extraCloses.push(i);
    }
  }
}

console.log('Potential fix7 insertions:', extraCloses.map(i=>i+1));

// For each potential extra </div>, check if removing it improves balance
for(let idx=extraCloses.length-1;idx>=0;idx--){
  const lineNum=extraCloses[idx];
  // Find which function this belongs to
  let funcStart=-1;
  for(let i=lineNum;i>=0;i--){
    if(lines[i].match(/^function\s|^export\s+default\s+function/)){
      funcStart=i;
      break;
    }
  }
  let funcEnd=-1;
  for(let i=lineNum+1;i<lines.length;i++){
    if(lines[i].match(/^function\s|^export\s+default\s+function/) || lines[i].match(/^\/\* ─── /)){
      funcEnd=i-1;
      break;
    }
  }
  if(funcEnd===-1)funcEnd=lines.length-1;
  
  const block=lines.slice(funcStart,funcEnd+1).join('\n');
  const od=(block.match(/<div/g)||[]).length;
  const cd=(block.match(/<\/div>/g)||[]).length;
  
  if(cd>od){
    console.log(`Line ${lineNum+1} in function at ${funcStart+1}: open=${od} close=${cd} → removing`);
    lines.splice(lineNum,1);
  }
}

// Also fix ProgressBar: open=2 close=1
// Need to add a </div> in ProgressBar
// Find ProgressBar
for(let i=0;i<lines.length;i++){
  if(lines[i].includes('function ProgressBar')){
    const end=i+20;
    const block=lines.slice(i,end).join('\n');
    const od=(block.match(/<div/g)||[]).length;
    const cd=(block.match(/<\/div>/g)||[]).length;
    if(od>cd){
      // Find the ");" and add </div> before it
      for(let j=i;j<end;j++){
        if(lines[j].trim()===');'){
          lines.splice(j,0,'        </div>');
          console.log('Added </div> in ProgressBar before line',j+1);
          break;
        }
      }
    }
    break;
  }
}

src=lines.join('\r\n');
fs.writeFileSync(FILE,src,'utf8');

// Final check
const finalSrc=fs.readFileSync(FILE,'utf8');
const fo=(finalSrc.match(/<div/g)||[]).length;
const fc=(finalSrc.match(/<\/div>/g)||[]).length;
console.log(`Final: open=${fo} close=${fc} diff=${fo-fc}`);

esbuild.transform(finalSrc,{loader:'jsx'})
  .then(()=>console.log('✅ esbuild OK!'))
  .catch(e=>{
    const m=e.message.match(/:(\d+):(\d+):.*?ERROR:\s*(.+)/);
    console.log(`❌ ${m?`${m[1]}:${m[2]} ${m[3]}`:'?'}`);
  });
