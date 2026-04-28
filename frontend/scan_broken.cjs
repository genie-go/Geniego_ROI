// Scan all JSX/JS files for broken replacement chars
const fs = require('fs');
const path = require('path');

function scanDir(dir) {
  const results = [];
  const items = fs.readdirSync(dir, { withFileTypes: true });
  for (const item of items) {
    const full = path.join(dir, item.name);
    if (item.isDirectory() && !item.name.startsWith('.') && item.name !== 'node_modules' && item.name !== 'dist') {
      results.push(...scanDir(full));
    } else if (item.isFile() && (item.name.endsWith('.jsx') || item.name.endsWith('.js') || item.name.endsWith('.css'))) {
      try {
        const content = fs.readFileSync(full, 'utf8');
        const broken = (content.match(/\uFFFD/g) || []).length;
        if (broken > 0) {
          results.push({ file: full, broken });
        }
      } catch (e) {}
    }
  }
  return results;
}

const broken = scanDir('src');
console.log(`Found ${broken.length} broken files:`);
broken.forEach(f => console.log(`  ${f.broken} chars - ${f.file}`));
