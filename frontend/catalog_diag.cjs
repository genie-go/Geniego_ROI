const fs=require('fs');
const FILE='./src/pages/CatalogSync.jsx';
let src=fs.readFileSync(FILE,'utf8');
let lines=src.split(/\r?\n/);
let braces=0;
for(let i=0;i<lines.length;i++){
  for(const c of lines[i]){if(c==='{')braces++;if(c==='}')braces--;}
  if(braces<0){console.log(`❌ line ${i+1}: depth=${braces} → "${lines[i].trim().slice(0,60)}"`);}
}
console.log('Final depth:',braces);

// Find function boundaries
for(let i=0;i<lines.length;i++){
  if(lines[i].match(/^function\s|^export\sdefault\sfunction/))
    console.log(`🔹 ${i+1}: ${lines[i].trim().slice(0,60)}`);
}
