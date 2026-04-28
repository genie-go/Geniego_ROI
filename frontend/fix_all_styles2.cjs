const fs = require('fs');
const path = require('path');

const PAGES_DIR = './src/pages';
const files = fs.readdirSync(PAGES_DIR).filter(f => f.endsWith('.jsx'));

let totalFixed = 0;

for (const file of files) {
  const fp = path.join(PAGES_DIR, file);
  let src = fs.readFileSync(fp, 'utf8');
  let fixed = 0;
  const orig = src;

  // Pass 1: Fix duplicate style attributes (various patterns)
  // Pattern: style={{ ... }} ... style={{ ... }} where ... can include onClick etc
  let prevLen;
  do {
    prevLen = src.length;
    // Adjacent duplicate style
    src = src.replace(/style=\{\{([^}]+)\}\}\s*style=\{\{([^}]+)\}\}/g, (m, a, b) => {
      fixed++;
      return `style={{ ${a.trim()}, ${b.trim()} }}`;
    });
    
    // Duplicate style separated by onClick or other props
    src = src.replace(/style=\{\{([^}]+)\}\}(\s+(?:onClick|onChange|onClose|disabled|placeholder|value|checked|type|className|id)=[^>]*?)\s*style=\{\{([^}]+)\}\}/g, (m, a, between, b) => {
      fixed++;
      return `style={{ ${a.trim()}, ${b.trim()} }}${between}`;
    });
  } while (src.length !== prevLen);

  // Pass 2: Fix duplicate keys within style objects
  // Find style={{ ... }} and remove duplicate keys (keep last occurrence)
  src = src.replace(/style=\{\{([^}]+)\}\}/g, (match, content) => {
    // Parse key-value pairs (simple: split by comma outside nested structures)
    const pairs = [];
    let depth = 0;
    let current = '';
    for (const ch of content) {
      if (ch === '(' || ch === '{' || ch === '[') depth++;
      if (ch === ')' || ch === '}' || ch === ']') depth--;
      if (ch === ',' && depth === 0) {
        pairs.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    if (current.trim()) pairs.push(current.trim());
    
    // Extract keys and deduplicate (keep last)
    const seen = new Map();
    for (const pair of pairs) {
      const colonIdx = pair.indexOf(':');
      if (colonIdx > 0) {
        const key = pair.substring(0, colonIdx).trim().replace(/['"]/g, '');
        seen.set(key, pair);
      } else {
        // Spread or shorthand
        seen.set(pair, pair);
      }
    }
    
    const deduped = [...seen.values()].join(', ');
    if (deduped !== pairs.join(', ')) {
      fixed++;
    }
    return `style={{ ${deduped} }}`;
  });

  // Pass 3: Fix double commas again
  while (src.includes(',,')) {
    src = src.replace(/,,/g, ',');
    fixed++;
  }
  
  // Fix trailing comma before }}
  src = src.replace(/,\s*\}\}/g, ' }}');

  if (src !== orig) {
    fs.writeFileSync(fp, src, 'utf8');
    console.log(`${file}: fixed ${fixed} issues`);
    totalFixed += fixed;
  }
}

console.log(`\nTotal: ${totalFixed} fixes across ${files.length} files`);
