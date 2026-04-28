const fs = require('fs');

// Target files with known issues
const files = ['./src/pages/CatalogSync.jsx', './src/pages/OmniChannel.jsx'];

for (const fp of files) {
  let src = fs.readFileSync(fp, 'utf8');
  let fixed = 0;
  
  // Strategy: Find ANY line with two style= attributes and merge them
  // Match: style={{ ... }} ... style={{ ... }} (even with stuff in between)
  // But we need to be careful with the regex to match balanced braces
  
  const lines = src.split(/\r?\n/);
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Count occurrences of "style={{"
    const matches = [...line.matchAll(/style=\{\{/g)];
    if (matches.length >= 2) {
      // Need to merge: find the two style blocks and combine them
      
      // Find first style={{ ... }}
      const first = matches[0].index;
      let depth = 0;
      let firstEnd = -1;
      for (let j = first + 7; j < line.length; j++) {
        if (line[j] === '{') depth++;
        if (line[j] === '}') {
          depth--;
          if (depth === -1) {
            // Found the closing }}
            firstEnd = j + 2; // after }}
            break;
          }
        }
      }
      
      // Find second style={{ ... }}
      const second = matches[1].index;
      let depth2 = 0;
      let secondEnd = -1;
      for (let j = second + 7; j < line.length; j++) {
        if (line[j] === '{') depth2++;
        if (line[j] === '}') {
          depth2--;
          if (depth2 === -1) {
            secondEnd = j + 2;
            break;
          }
        }
      }
      
      if (firstEnd !== -1 && secondEnd !== -1) {
        // Extract style contents
        const style1 = line.substring(first + 9, firstEnd - 2).trim();
        const style2 = line.substring(second + 9, secondEnd - 2).trim();
        
        // Get what's between the two style blocks
        const between = line.substring(firstEnd, second).trim();
        
        // Merge: remove first style, keep between, replace second with merged
        const merged = `style={{ ${style1}, ${style2} }}`;
        
        let newLine;
        if (between) {
          newLine = line.substring(0, first) + merged + ' ' + between + line.substring(secondEnd);
        } else {
          newLine = line.substring(0, first) + merged + line.substring(secondEnd);
        }
        
        lines[i] = newLine;
        fixed++;
        console.log(`  ${fp}:${i+1} merged styles`);
        
        // Re-check this line (might have more)
        i--;
      }
    }
  }
  
  if (fixed > 0) {
    src = lines.join('\r\n');
    
    // Also fix duplicate keys within merged styles
    src = src.replace(/style=\{\{([^}]+)\}\}/g, (match, content) => {
      const pairs = [];
      let depth = 0;
      let current = '';
      for (const ch of content) {
        if (ch === '(' || ch === '{' || ch === '[') depth++;
        if (ch === ')' || ch === '}' || ch === ']') depth--;
        if (ch === ',' && depth === 0) {
          if (current.trim()) pairs.push(current.trim());
          current = '';
        } else {
          current += ch;
        }
      }
      if (current.trim()) pairs.push(current.trim());
      
      const seen = new Map();
      for (const pair of pairs) {
        const colonIdx = pair.indexOf(':');
        if (colonIdx > 0) {
          const key = pair.substring(0, colonIdx).trim().replace(/['"]/g, '');
          seen.set(key, pair);
        } else {
          seen.set('_' + pair, pair);
        }
      }
      
      return `style={{ ${[...seen.values()].join(', ')} }}`;
    });
    
    // Fix double commas
    while (src.includes(',,')) src = src.replace(/,,/g, ',');
    
    fs.writeFileSync(fp, src, 'utf8');
    console.log(`${fp}: ${fixed} style merges`);
  }
}

// Verify
const esbuild = require('esbuild');
for (const fp of files) {
  esbuild.transform(fs.readFileSync(fp, 'utf8'), { loader: 'jsx' })
    .then(() => console.log(`✅ ${fp}`))
    .catch(e => {
      const m = e.message.match(/:(\d+):(\d+):.*?ERROR:\s*(.+)/);
      console.log(`❌ ${fp} ${m ? m[1]+':'+m[2]+' '+m[3] : e.message.slice(0, 200)}`);
    });
}
