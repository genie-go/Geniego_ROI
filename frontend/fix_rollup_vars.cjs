// Batch 2: Remove all remaining var() CSS references in RollupDashboard.jsx
const fs = require('fs');
const fp = 'd:\\project\\GeniegoROI\\frontend\\src\\pages\\RollupDashboard.jsx';
let src = fs.readFileSync(fp, 'utf8');
const before = src.length;

// Replace all remaining var(--text-1, ...) patterns
src = src.replace(/color:\s*'var\(--text-1,\s*#1e293b\)'/g, "color:'#1e293b'");
src = src.replace(/color:\s*'var\(--text-1,\s*#[0-9a-fA-F]+\)'/g, "color:'#1e293b'");

// Replace var(--text-2, ...)
src = src.replace(/color:\s*'var\(--text-2,\s*#[0-9a-fA-F]+\)'/g, "color:'#475569'");

// Replace var(--text-3, ...)
src = src.replace(/color:\s*'var\(--text-3,\s*#[0-9a-fA-F]+\)'/g, "color:'#64748b'");
src = src.replace(/color:\s*'var\(--text-3\)'/g, "color:'#64748b'");

// Replace var(--surface, ...)
src = src.replace(/background:\s*'var\(--surface,\s*#ffffff\)'/g, "background:'rgba(255,255,255,0.95)'");
src = src.replace(/background:\s*'var\(--surface,\s*#f1f5f9\)'/g, "background:'rgba(241,245,249,0.9)'");
src = src.replace(/background:\s*'var\(--surface,\s*#f8fafc\)'/g, "background:'rgba(248,250,252,0.95)'");

// Replace var(--border, ...)
src = src.replace(/var\(--border,\s*#e2e8f0\)/g, '#e2e8f0');

// Replace var(--bg, ...)
src = src.replace(/background:\s*'var\(--bg,\s*#f5f7fa\)'/g, "background:'#f5f7fa'");

// Replace var(--blue, ...)
src = src.replace(/var\(--blue,\s*#4f8ef7\)/g, '#4f8ef7');

const after = src.length;
fs.writeFileSync(fp, src, 'utf8');

// Count replacements
const removed = (before !== after) ? 'size changed' : 'same size';
const varCount = (src.match(/var\(--/g) || []).length;
console.log(`✅ Batch 2 complete. Remaining var() references: ${varCount}`);
console.log(`   File: ${before} → ${after} bytes (${removed})`);
