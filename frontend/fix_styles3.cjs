const fs = require('fs');

// Simpler approach: just replace "}} style={{" with ", " in all pages
const PAGES_DIR = './src/pages';
const files = fs.readdirSync(PAGES_DIR).filter(f => f.endsWith('.jsx'));

let totalFixed = 0;

for (const file of files) {
  const fp = PAGES_DIR + '/' + file;
  let src = fs.readFileSync(fp, 'utf8');
  let fixed = 0;
  
  // Pattern 1: }} style={{ (adjacent, possibly with whitespace)
  while (src.match(/\}\}\s*style=\{\{/)) {
    src = src.replace(/\}\}\s*style=\{\{/g, ', ');
    fixed++;
  }
  
  // Pattern 2: }} onClick={...} style={{ (with prop between)
  // This is trickier - find lines with two "style={{" and use a simpler merge
  const lines = src.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const firstIdx = line.indexOf('style={{');
    if (firstIdx === -1) continue;
    const secondIdx = line.indexOf('style={{', firstIdx + 7);
    if (secondIdx === -1) continue;
    
    // Find the }}" that ends the first style - scan for matching }}
    // Simple approach: find first "}}" after "style={{"
    const closingIdx = line.indexOf('}}', firstIdx + 7);
    if (closingIdx === -1 || closingIdx >= secondIdx) continue;
    
    // We have: ... style={{ A }} BETWEEN style={{ B }} ...
    // We want: ... style={{ A, B }} BETWEEN ...
    
    // Find the closing }} of second style
    const secondClosing = line.indexOf('}}', secondIdx + 7);
    if (secondClosing === -1) continue;
    
    const styleA = line.substring(firstIdx + 9, closingIdx);
    const between = line.substring(closingIdx + 2, secondIdx).trim();
    const styleB = line.substring(secondIdx + 9, secondClosing);
    
    const merged = `style={{ ${styleA.trim()}, ${styleB.trim()} }}`;
    
    let newLine;
    if (between) {
      newLine = line.substring(0, firstIdx) + merged + ' ' + between + line.substring(secondClosing + 2);
    } else {
      newLine = line.substring(0, firstIdx) + merged + line.substring(secondClosing + 2);
    }
    
    lines[i] = newLine;
    fixed++;
    i--; // Re-check same line
  }
  
  if (fixed > 0) {
    src = lines.join('\r\n');
    
    // Fix duplicate keys
    src = src.replace(/style=\{\{([^}]*)\}\}/g, (match, content) => {
      // Simple dedup: split by comma (careful with template literals)
      const parts = [];
      let depth = 0;
      let current = '';
      let inString = false;
      let stringChar = '';
      let inTemplate = false;
      
      for (let j = 0; j < content.length; j++) {
        const ch = content[j];
        
        if (!inString && !inTemplate) {
          if (ch === '"' || ch === "'") { inString = true; stringChar = ch; }
          else if (ch === '`') { inTemplate = true; }
          else if (ch === '(' || ch === '[') depth++;
          else if (ch === ')' || ch === ']') depth--;
          else if (ch === ',' && depth === 0) {
            if (current.trim()) parts.push(current.trim());
            current = '';
            continue;
          }
        } else if (inString) {
          if (ch === stringChar && content[j-1] !== '\\') inString = false;
        } else if (inTemplate) {
          if (ch === '`' && content[j-1] !== '\\') inTemplate = false;
        }
        
        current += ch;
      }
      if (current.trim()) parts.push(current.trim());
      
      // Dedup by key (keep last)
      const seen = new Map();
      for (const pair of parts) {
        const m = pair.match(/^(\w+)\s*:/);
        if (m) {
          seen.set(m[1], pair);
        } else {
          seen.set('_' + parts.indexOf(pair), pair);
        }
      }
      
      return `style={{ ${[...seen.values()].join(', ')} }}`;
    });
    
    // Fix double commas
    while (src.includes(',,')) src = src.replace(/,,/g, ',');
    
    fs.writeFileSync(fp, src, 'utf8');
    console.log(`${file}: ${fixed} fixes`);
    totalFixed += fixed;
  }
}

console.log(`Total: ${totalFixed}`);

// Verify
const esbuild = require('esbuild');
Promise.all(files.filter(f => ['CatalogSync.jsx', 'OmniChannel.jsx'].includes(f)).map(f => {
  const fp = PAGES_DIR + '/' + f;
  return esbuild.transform(fs.readFileSync(fp, 'utf8'), { loader: 'jsx' })
    .then(() => console.log(`✅ ${f}`))
    .catch(e => {
      const m = e.message.match(/:(\d+):(\d+):.*?ERROR:\s*(.+)/);
      console.log(`❌ ${f} ${m ? m[1]+':'+m[2]+' '+m[3] : '?'}`);
    });
}));
