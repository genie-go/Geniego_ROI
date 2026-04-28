const fs=require('fs');
const FILE='./src/pages/CatalogSync.jsx';
let src=fs.readFileSync(FILE,'utf8');
let lines=src.split(/\r?\n/);

// For each function with unclosed divs, we need to find where </div> is missing
// Strategy: track div depth within each function
function findMissing(funcLines, funcName, startLine) {
  let depth=0;
  let maxDepth=0;
  let issues=[];
  for(let i=0;i<funcLines.length;i++){
    const line=funcLines[i];
    const opens=(line.match(/<div/g)||[]).length;
    const closes=(line.match(/<\/div>/g)||[]).length;
    depth+=opens-closes;
    if(depth>maxDepth)maxDepth=depth;
    // If depth drops, check for potential issues
  }
  return {depth, maxDepth};
}

// Functions with issues and their approximate line ranges:
const issues = [
  // BulkRegister: 229-590, diff=2
  // BulkPrice: 593-739, diff=1
  // CatalogTab: 742-1289, diff=2
  // ProductDetail: 1291-1409, diff=1
  // PriceSync: 1624-1786, diff=1
  // JobHistory: 1853-1870, diff=1 (new version is a single div)
  // Guide: 2018-2063, diff=2
];

// Check JobHistoryTab - the new version should be fine
const jobLines=lines.slice(1852,1871);
console.log('JobHistory div count:',
  (jobLines.join('\n').match(/<div/g)||[]).length,
  (jobLines.join('\n').match(/<\/div>/g)||[]).length
);

// Check Guide tab
const guideLines=lines.slice(2017,2064);
console.log('Guide div count:',
  (guideLines.join('\n').match(/<div/g)||[]).length,
  (guideLines.join('\n').match(/<\/div>/g)||[]).length
);

// For all functions with missing </div>, add </div> before the final ");" of each function
// This is the simplest fix for functions that are missing closing tags

// Let's be more precise. Find each function's return JSX and check div balance
function fixFuncDivs(src, funcName, startLine, endLine) {
  const lines = src.split(/\r?\n/);
  const funcLines = lines.slice(startLine-1, endLine);
  
  // Find "return (" in these lines
  let returnIdx = -1;
  for(let i=0;i<funcLines.length;i++){
    if(funcLines[i].trim().startsWith('return (') || funcLines[i].trim() === 'return ('){
      returnIdx = i;
      break;
    }
  }
  
  if(returnIdx === -1) {
    console.log(`  No return found in ${funcName}`);
    return src;
  }
  
  // Count divs from return to end
  let depth = 0;
  let insertLine = -1;
  for(let i=returnIdx;i<funcLines.length;i++){
    const opens=(funcLines[i].match(/<div/g)||[]).length;
    const closes=(funcLines[i].match(/<\/div>/g)||[]).length;
    depth+=opens-closes;
    
    // Find the line with ");" that closes return
    if(funcLines[i].trim() === ');' && depth > 0){
      insertLine = startLine - 1 + i;
      break;
    }
  }
  
  if(depth > 0 && insertLine > 0){
    console.log(`  ${funcName}: need ${depth} </div> before line ${insertLine+1}`);
    const closingDivs = '            </div>\n'.repeat(depth);
    const linesArr = src.split(/\r?\n/);
    linesArr.splice(insertLine, 0, ...closingDivs.trim().split('\n'));
    return linesArr.join('\r\n');
  }
  
  return src;
}

// Fix each function in reverse order (so line numbers don't shift)
const funcsToFix = [
  {name: 'UsageGuideTab', start: 2018, end: 2063},
  {name: 'JobHistoryTab', start: 1853, end: 1895},
  {name: 'PriceSyncTab', start: 1624, end: 1786},
  {name: 'ProductDetail', start: 1291, end: 1409},
  {name: 'CatalogTab', start: 742, end: 1289},
  {name: 'BulkPriceModal', start: 593, end: 739},
  {name: 'BulkRegisterModal', start: 229, end: 590},
];

for(const f of funcsToFix){
  const ls=src.split(/\r?\n/).slice(f.start-1,f.end);
  const od=(ls.join('\n').match(/<div/g)||[]).length;
  const cd=(ls.join('\n').match(/<\/div>/g)||[]).length;
  if(od!==cd){
    console.log(`${f.name}: open=${od} close=${cd} diff=${od-cd}`);
    src = fixFuncDivs(src, f.name, f.start, f.end);
  }
}

fs.writeFileSync(FILE,src,'utf8');

// Verify
const esbuild=require('esbuild');
esbuild.transform(fs.readFileSync(FILE,'utf8'),{loader:'jsx'})
  .then(()=>console.log('✅ esbuild OK'))
  .catch(e=>{const m=e.message.match(/:(\d+):\d+:.*?ERROR:\s*(.+)/);console.log('❌',m?`line ${m[1]}: ${m[2]}`:'?',e.message.slice(0,300));});
