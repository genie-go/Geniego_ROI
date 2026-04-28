const fs = require('fs');
const esbuild = require('esbuild');
const FILE = './src/pages/CatalogSync.jsx';
let src = fs.readFileSync(FILE, 'utf8');

// Remove all lines that are just "</div>" added by fixDivBalance
// These appear right before ");" at the end of functions
// Pattern: a standalone "</div>" line followed by ");" on the next line

// Fix: Remove extra </div> lines that were inserted by fixDivBalance
// These are lines that have only whitespace + </div> and appear right before ");"

let lines = src.split(/\r?\n/);
const toRemove = [];

for (let i = 0; i < lines.length - 1; i++) {
  // Check for lines that are just </div> (with any whitespace)
  // that appear right before ");" and were inserted by fixDivBalance
  if (lines[i].trim() === '</div>' && lines[i + 1] && lines[i + 1].trim() === ');') {
    // Check if this </div> was on a line by itself with unusual indentation
    // compared to surrounding code
    const prevLine = i > 0 ? lines[i - 1] : '';
    
    // If the previous line is also </div>, </>, or a closing tag, 
    // this might be an inserted line
    // Check if removing this line fixes the div balance of the containing function
    
    // Find function start
    let funcStart = -1;
    for (let j = i; j >= 0; j--) {
      if (lines[j].match(/^function\s|^export\s+default\s+function/)) {
        funcStart = j;
        break;
      }
    }
    
    // Find function end
    let funcEnd = lines.length;
    for (let j = i + 1; j < lines.length; j++) {
      if (lines[j].match(/^function\s|^export\s+default\s+function/)) {
        funcEnd = j;
        break;
      }
    }
    
    const funcBlock = lines.slice(funcStart, funcEnd).join('\n');
    const opens = (funcBlock.match(/<div[\s>]/g) || []).length;
    const selfClose = (funcBlock.match(/<div\s[^>]*\/>/g) || []).length;
    const realOpens = opens - selfClose;
    const closes = (funcBlock.match(/<\/div>/g) || []).length;
    
    if (closes > realOpens) {
      toRemove.push(i);
      const name = lines[funcStart].match(/function\s+(\w+)/)?.[1] || '?';
      console.log(`Remove line ${i + 1} (extra </div> in ${name}): opens=${realOpens} closes=${closes}`);
    }
  }
}

// Remove lines in reverse order
for (let i = toRemove.length - 1; i >= 0; i--) {
  lines.splice(toRemove[i], 1);
}

src = lines.join('\r\n');
fs.writeFileSync(FILE, src, 'utf8');

console.log(`Removed ${toRemove.length} extra </div> lines`);

// Verify
esbuild.transform(fs.readFileSync(FILE, 'utf8'), { loader: 'jsx' })
  .then(() => console.log('✅ esbuild OK!'))
  .catch(e => {
    const m = e.message.match(/:(\d+):(\d+):.*?ERROR:\s*(.+)/);
    console.log(`❌ ${m ? `line ${m[1]}:${m[2]} ${m[3]}` : e.message.slice(0, 300)}`);
  });
