const fs=require('fs');
const esbuild=require('esbuild');
const FILE='./src/pages/CatalogSync.jsx';
let src=fs.readFileSync(FILE,'utf8');

// Remove the wrongly added </div> in ProgressBar (line 223)
src=src.replace('        </div>\r\n    \r\n        </div>\r\n    );\r\n}\r\n\r\n/* ───  Banner',
               '        </div>\r\n    );\r\n}\r\n\r\n/* ───  Banner');

// Also remove the extra line 222 whitespace
src=src.replace('        </div>\r\n    \r\n    );\r\n}\r\n\r\n/* ───  Banner',
               '        </div>\r\n    );\r\n}\r\n\r\n/* ───  Banner');

// Check remaining line 1152 extra </div>
const lines=src.split(/\r?\n/);
console.log('Line 1150-1155:');
for(let i=1149;i<1155 && i<lines.length;i++){
  console.log(i+1,':',lines[i].slice(0,80));
}

// Remove if it's an extra </div>
if(lines[1151] && lines[1151].trim()==='</div>'){
  // Check if this is in a function where close > open
  const funcStart=lines.findIndex((l,i)=>i<1151 && l.includes('function CategoryMappingTab'));
  // Let's just check the surrounding context
  console.log('Checking line 1152...');
  // Remove it and test
}

fs.writeFileSync(FILE,src,'utf8');

// Count divs properly (excluding self-closing <div ... />)
const selfClosing=(src.match(/<div\s[^>]*\/>/g)||[]).length;
const allOpen=(src.match(/<div/g)||[]).length;
const realOpen=allOpen-selfClosing;
const closes=(src.match(/<\/div>/g)||[]).length;
console.log(`Divs: allOpen=${allOpen} selfClosing=${selfClosing} realOpen=${realOpen} close=${closes} diff=${realOpen-closes}`);

esbuild.transform(src,{loader:'jsx'})
  .then(()=>console.log('✅ esbuild OK!'))
  .catch(e=>{
    const m=e.message.match(/:(\d+):(\d+):.*?ERROR:\s*(.+)/);
    console.log(`❌ ${m?`${m[1]}:${m[2]} ${m[3]}`:'?'}`);
  });
