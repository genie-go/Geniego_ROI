/**
 * Arctic White contrast fix: strengthen #a855f7 text to #7c3aed
 * Only changes COLOR properties (not background gradients)
 */
const fs = require('fs');

const fp = 'd:\\project\\GeniegoROI\\frontend\\src\\pages\\AutoMarketing.jsx';
let src = fs.readFileSync(fp, 'utf8');
const before = src;

// Pattern 1: color: '#a855f7' or color: "#a855f7" (direct text color)
let count = 0;

// Replace color: '#a855f7' → color: '#7c3aed'
src = src.replace(/color:\s*['"]#a855f7['"]/g, (match) => {
  count++;
  return match.replace('#a855f7', '#7c3aed');
});

// Replace color: "#a855f7" → color: "#7c3aed" (shouldn't match since we already did above, but just in case)

// Pattern 2: Inside ternary expressions like ? "#a855f7" : '#1e293b'
// These are already caught by the general pattern above

// DON'T replace background gradients — they look fine

fs.writeFileSync(fp, src, 'utf8');
console.log(`✅ Replaced ${count} text color references: #a855f7 → #7c3aed`);

// Also fix the TAB_CLR constant (line 550) which is decorative but used for text
const tabClrCount = (src.match(/#a855f7/g) || []).length;
console.log(`📊 Remaining #a855f7 references (background/gradient): ${tabClrCount}`);
