const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');

const PAGES_DIR = './src/pages';
const files = fs.readdirSync(PAGES_DIR).filter(f => f.endsWith('.jsx'));

let totalFixed = 0;

for (const file of files) {
  const fp = path.join(PAGES_DIR, file);
  let src = fs.readFileSync(fp, 'utf8');
  let fixed = 0;
  
  // Fix duplicate style attributes: style={{ ... }} style={{ ... }}
  // This regex handles the case where style blocks are separated by other attributes
  const re = /style=\{\{([^}]+)\}\}(\s+[^s][^>]*?)?\s*style=\{\{([^}]+)\}\}/g;
  src = src.replace(re, (match, s1, between, s2) => {
    fixed++;
    if (between) {
      return `style={{ ${s1.trim()}, ${s2.trim()} }}${between}`;
    }
    return `style={{ ${s1.trim()}, ${s2.trim()} }}`;
  });
  
  // Also fix simpler case: style={{ ... }} style={{ ... }} (adjacent)
  while (src.match(/style=\{\{([^}]+)\}\}\s*style=\{\{([^}]+)\}\}/)) {
    src = src.replace(/style=\{\{([^}]+)\}\}\s*style=\{\{([^}]+)\}\}/g, (m, a, b) => {
      fixed++;
      return `style={{ ${a.trim()}, ${b.trim()} }}`;
    });
  }
  
  // Fix duplicate object keys (width: X, ... width: Y → keep last)
  // This is harder to do generically but we can fix specific cases
  // Like: width: "100%", ... width: 110  → width: 110
  src = src.replace(/width:\s*"[^"]*",\s*(.*?)width:\s*(\d+)/g, (m, between, val) => {
    if (between.includes('width:')) return m; // Multiple widths, skip
    fixed++;
    return `${between}width: ${val}`;
  });
  
  if (fixed > 0) {
    fs.writeFileSync(fp, src, 'utf8');
    console.log(`${file}: fixed ${fixed} issues`);
    totalFixed += fixed;
  }
}

console.log(`\nTotal fixed: ${totalFixed}`);

// Verify CatalogSync
esbuild.transform(fs.readFileSync('./src/pages/CatalogSync.jsx', 'utf8'), { loader: 'jsx' })
  .then(() => console.log('✅ CatalogSync OK'))
  .catch(e => console.log('❌ CatalogSync:', e.message.slice(0, 200)));

// Verify OmniChannel
esbuild.transform(fs.readFileSync('./src/pages/OmniChannel.jsx', 'utf8'), { loader: 'jsx' })
  .then(() => console.log('✅ OmniChannel OK'))
  .catch(e => console.log('❌ OmniChannel:', e.message.slice(0, 200)));
