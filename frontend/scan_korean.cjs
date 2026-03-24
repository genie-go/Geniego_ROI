const fs = require('fs');
const path = require('path');

const pagesDir = path.join(__dirname, 'src/pages');
const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.jsx') || f.endsWith('.js'));

const results = [];
for (const f of files) {
  const content = fs.readFileSync(path.join(pagesDir, f), 'utf8');
  const koreanMatches = content.match(/[\uAC00-\uD7A3]+/g) || [];
  const koreanCount = koreanMatches.length;
  if (koreanCount > 5) {
    const samples = [...new Set(koreanMatches)].slice(0, 5).join(', ');
    results.push({ file: f, count: koreanCount, samples });
  }
}

results.sort((a, b) => b.count - a.count);
console.log('\n=== Korean chars found in pages ===');
for (const r of results) {
  console.log(`[${r.count.toString().padStart(4)}] ${r.file.padEnd(35)} ${r.samples}`);
}
console.log('\nTotal files with Korean:', results.length);
