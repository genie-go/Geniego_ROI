const fs = require('fs');
const esbuild = require('esbuild');
const FILE = './src/pages/CatalogSync.jsx';
let src = fs.readFileSync(FILE, 'utf8');

// Find and remove all misplaced </div> that have 0 indent (column 0)
// These are artifacts from fixDivBalance
let lines = src.split(/\r?\n/);
const toRemove = [];

for (let i = 0; i < lines.length; i++) {
  // Lines that are exactly "</div>" with no indent or very little indent
  // while surrounded by deeply indented code
  if (lines[i].trim() === '</div>' || lines[i].trim() === '</div>\r') {
    const indent = lines[i].search(/\S/);
    if (indent <= 0) {
      // Zero indent </div> is almost certainly wrong in a JSX return
      // Check surrounding context
      const prevIndent = i > 0 ? lines[i-1].search(/\S/) : 0;
      const nextIndent = i < lines.length - 1 ? lines[i+1].search(/\S/) : 0;
      
      if (prevIndent > 8 || nextIndent > 8) {
        toRemove.push(i);
        console.log(`Will remove line ${i+1}: "${lines[i]}" (indent=${indent}, prev=${prevIndent}, next=${nextIndent})`);
      }
    }
  }
}

// Also find </div> lines with indent 12 that appear right before a function close
// These are from fixDivBalance too
for (let i = 0; i < lines.length; i++) {
  if (lines[i].trim() === '</div>') {
    const indent = lines[i].search(/\S/);
    if (indent === 12) {
      // Check if next non-empty line is ");" or "return" or function end
      let nextIdx = i + 1;
      while (nextIdx < lines.length && lines[nextIdx].trim() === '') nextIdx++;
      if (nextIdx < lines.length && (lines[nextIdx].trim() === ');' || lines[nextIdx].trim() === '}')) {
        // This might be inserted - check function div balance without it
        // For safety, only remove if prev line is also a closing tag
        const prevTrim = i > 0 ? lines[i-1].trim() : '';
        if (prevTrim === '</>' || prevTrim === '</div>' || prevTrim.endsWith(')') || prevTrim === '}') {
          if (!toRemove.includes(i)) {
            // Check the function's div balance
            let funcStart = i;
            while (funcStart > 0 && !lines[funcStart].match(/^function\s|^export\s+default/)) funcStart--;
            let funcEnd = i + 1;
            while (funcEnd < lines.length && !lines[funcEnd].match(/^function\s|^export\s+default/)) funcEnd++;
            
            const block = lines.slice(funcStart, funcEnd).join('\n');
            const od = (block.match(/<div[\s>]/g) || []).length;
            const sc = (block.match(/<div\s[^>]*\/>/g) || []).length;
            const cd = (block.match(/<\/div>/g) || []).length;
            
            if (cd > od - sc) {
              toRemove.push(i);
              const name = lines[funcStart].match(/function\s+(\w+)/)?.[1] || '?';
              console.log(`Will remove line ${i+1} from ${name}: closes=${cd} > opens=${od-sc}`);
            }
          }
        }
      }
    }
  }
}

// Sort and remove in reverse
toRemove.sort((a, b) => b - a);
for (const idx of toRemove) {
  lines.splice(idx, 1);
}

src = lines.join('\r\n');
fs.writeFileSync(FILE, src, 'utf8');
console.log(`Removed ${toRemove.length} lines`);

// Check remaining CSS var references
const vars = src.match(/var\(--[^)]+\)/g) || [];
console.log('Remaining CSS vars:', [...new Set(vars)]);

// Replace any remaining CSS vars
src = src.replace(/var\(--text-1\)/g, '#1f2937');
src = src.replace(/var\(--text-2\)/g, '#374151');
src = src.replace(/var\(--text-3\)/g, '#6b7280');
src = src.replace(/var\(--surface\)/g, '#ffffff');
src = src.replace(/var\(--border\)/g, '#e5e7eb');
src = src.replace(/var\(--accent\)/g, '#2563eb');
fs.writeFileSync(FILE, src, 'utf8');

esbuild.transform(fs.readFileSync(FILE, 'utf8'), { loader: 'jsx' })
  .then(() => console.log('✅ esbuild OK!'))
  .catch(e => {
    const m = e.message.match(/:(\d+):(\d+):.*?ERROR:\s*(.+)/);
    console.log(`❌ ${m ? `line ${m[1]}:${m[2]} ${m[3]}` : e.message.slice(0, 300)}`);
  });
