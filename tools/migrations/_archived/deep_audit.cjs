const fs = require('fs');
const path = require('path');
const dir = 'frontend/src/pages';

// Check for duplicate function definitions
const files = fs.readdirSync(dir).filter(f => f.endsWith('.jsx'));
const exportMap = {};

files.forEach(f => {
  const c = fs.readFileSync(path.join(dir, f), 'utf8');
  const match = c.match(/export default function (\w+)/);
  if (match) {
    const name = match[1];
    if (!exportMap[name]) exportMap[name] = [];
    exportMap[name].push(f);
  }
});

console.log('=== DUPLICATE EXPORTS ===');
Object.entries(exportMap).filter(([k,v]) => v.length > 1).forEach(([name, files]) => {
  console.log(`  ${name}: ${files.join(', ')}`);
});

// Check for toLocaleString hardcoded Korean
console.log('\n=== HARDCODED ko-KR LOCALE ===');
files.forEach(f => {
  const c = fs.readFileSync(path.join(dir, f), 'utf8');
  const matches = c.match(/toLocale.*\(['"]ko-KR['"]/g);
  if (matches) console.log(`  ${f}: ${matches.length} instances`);
});

// Check for direct fetch without demo guard
console.log('\n=== DIRECT FETCH/API CALLS WITHOUT DEMO CHECK ===');
files.forEach(f => {
  const c = fs.readFileSync(path.join(dir, f), 'utf8');
  if (/fetch\s*\(/.test(c) && !/_isDemo|isDemo/.test(c)) {
    const count = (c.match(/fetch\s*\(/g) || []).length;
    console.log(`  ${f}: ${count} fetch calls, NO demo guard`);
  }
});

// Check for console.log in production code
console.log('\n=== CONSOLE.LOG IN PRODUCTION CODE (top 10) ===');
const logResults = [];
files.forEach(f => {
  const c = fs.readFileSync(path.join(dir, f), 'utf8');
  const count = (c.match(/console\.(log|warn|error)/g) || []).length;
  if (count > 5) logResults.push({ f, count });
});
logResults.sort((a, b) => b.count - a.count);
logResults.slice(0, 10).forEach(r => console.log(`  ${r.f}: ${r.count} console calls`));

// Check for missing error boundaries
console.log('\n=== ERROR HANDLING CHECK ===');
files.forEach(f => {
  const c = fs.readFileSync(path.join(dir, f), 'utf8');
  const lines = c.split('\n').length;
  if (lines > 200 && !/try\s*\{|catch\s*\(|\.catch\(/.test(c)) {
    console.log(`  ${f}: ${lines} lines, NO error handling`);
  }
});
