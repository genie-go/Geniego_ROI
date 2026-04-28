const fs = require('fs');
const path = require('path');
const PAGES = path.join(__dirname, 'src/pages');
const files = fs.readdirSync(PAGES).filter(f => f.endsWith('.jsx'));
files.forEach(f => {
  const fp = path.join(PAGES, f);
  const c = fs.readFileSync(fp, 'utf8');
  // Simple heuristic count
  const opens = (c.match(/<div[\s>]/g) || []).length - (c.match(/<div[^>]*\/>/g) || []).length;
  const closes = (c.match(/<\/div>/g) || []).length;
  const diff = closes - opens;
  if (diff !== 0) console.log(f + ': opens=' + opens + ' closes=' + closes + ' diff=' + diff);
});
