const fs=require('fs');
const FILE='./src/pages/CatalogSync.jsx';
const TAIL='./catalog_tail.jsx';
let src=fs.readFileSync(FILE,'utf8');
let tail=fs.readFileSync(TAIL,'utf8');

const marker='/* ─── Tab: Usage Guide';
const idx=src.indexOf(marker);
if(idx===-1){console.log('ERROR');process.exit(1);}
const before=src.substring(0,idx);
fs.writeFileSync(FILE,before+tail,'utf8');
console.log('✅ Spliced at char',idx,'→ total',before.length+tail.length);
