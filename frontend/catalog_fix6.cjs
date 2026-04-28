const fs=require('fs');
const FILE='./src/pages/CatalogSync.jsx';
let src=fs.readFileSync(FILE,'utf8');

// Fix duplicate style attributes: style={{ ... }} style={{ ... }} → merge into one
// Pattern: "}} style={{"
const re=/style=\{\{([^}]+)\}\}\s*style=\{\{([^}]+)\}\}/g;
let matches=0;
src=src.replace(re,(match,s1,s2)=>{
  matches++;
  return `style={{ ${s1.trim()}, ${s2.trim()} }}`;
});
console.log('Fixed',matches,'duplicate style attributes');
fs.writeFileSync(FILE,src,'utf8');

// Verify
const esbuild=require('esbuild');
esbuild.transform(fs.readFileSync(FILE,'utf8'),{loader:'jsx'})
  .then(()=>console.log('✅ esbuild OK'))
  .catch(e=>{const m=e.message.match(/:(\d+):\d+:.*?ERROR:\s*(.+)/);console.log('❌',m?`line ${m[1]}: ${m[2]}`:'unknown');});
