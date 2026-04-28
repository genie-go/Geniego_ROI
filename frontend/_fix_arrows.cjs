const fs = require('fs');
const fp = 'src/components/dashboards/DashInfluencer.jsx';
let c = fs.readFileSync(fp, 'utf-8');

// Fix known corrupted patterns
c = c.replace(/{delta >= 0 \? '\?\?' : '\?\?'}/g, "{delta >= 0 ? '▲' : '▼'}");
c = c.replace(/'[?]{2}'/g, (m, offset) => {
  // Check context to determine correct replacement
  const ctx = c.substring(Math.max(0, offset - 50), offset);
  if (ctx.includes('delta') || ctx.includes('change')) return "'▲'";
  return m;
});

// Fix any remaining double-question-mark patterns that are broken unicode
// Pattern: '??' -> likely corrupted Korean/Unicode chars from PowerShell
// These commonly appear in the component code (not LOC dictionary which was replaced)

// Common corrupted patterns we know about:
// '▲' → '??'  and '▼' → '??'
c = c.replace(/'\?\? : '\?\?'/g, "'▲' : '▼'");
c = c.replace(/'\?\?'/g, (m, offset) => {
  const before = c.substring(Math.max(0, offset - 30), offset);
  if (before.includes('>= 0') || before.includes('> 0')) return "'▲'";
  if (before.includes(': ')) return "'▼'";
  return m;
});

fs.writeFileSync(fp, c, 'utf-8');

// Verify it compiles
const lines = c.split('\n');
console.log('Fixed L284:', lines[283]?.substring(0,60));
console.log('Total lines:', lines.length);
console.log('Done!');
