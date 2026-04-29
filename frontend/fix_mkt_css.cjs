// Batch 2: Remove all CSS var() references from AutoMarketing.jsx
const fs = require('fs');
const fp = 'd:\\project\\GeniegoROI\\frontend\\src\\pages\\AutoMarketing.jsx';
let src = fs.readFileSync(fp, 'utf8');
const before = src.length;

// Replace all var(--text-1, #...) patterns
src = src.replace(/color:\s*['"]var\(--text-1,\s*#[0-9a-fA-F]+\)['"]/g, "color: '#1e293b'");
src = src.replace(/color:\s*['"]var\(--text-1\)['"]/g, "color: '#1e293b'");

// Replace var(--text-2, #...)
src = src.replace(/color:\s*['"]var\(--text-2,\s*#[0-9a-fA-F]+\)['"]/g, "color: '#475569'");
src = src.replace(/color:\s*['"]var\(--text-2\)['"]/g, "color: '#475569'");

// Replace var(--text-3, #...)
src = src.replace(/color:\s*['"]var\(--text-3,\s*#[0-9a-fA-F]+\)['"]/g, "color: '#64748b'");
src = src.replace(/color:\s*['"]var\(--text-3\)['"]/g, "color: '#64748b'");

// Replace standalone "var(--text-3)" (without color: prefix — e.g. in ternary)
src = src.replace(/["']var\(--text-3\)["']/g, "'#64748b'");
src = src.replace(/["']var\(--text-2\)["']/g, "'#475569'");
src = src.replace(/["']var\(--text-1\)["']/g, "'#1e293b'");

// Replace var(--surface, ...)
src = src.replace(/['"]var\(--surface,\s*rgba\([^)]+\)\)['"]|['"]var\(--surface\)['"]|['"]var\(--surface,\s*#[0-9a-fA-F]+\)['"]/g, "'rgba(241,245,249,0.7)'");

// Replace var(--bg, ...)
src = src.replace(/background:\s*['"]var\(--bg,\s*[^)]+\)['"]/g, "background: 'rgba(245,247,250,0.97)'");

// Replace var(--border, ...)
src = src.replace(/var\(--border,\s*rgba\([^)]+\)\)/g, 'rgba(99,140,255,0.1)');
src = src.replace(/var\(--border,\s*#[0-9a-fA-F]+\)/g, '#e2e8f0');

const after = src.length;
fs.writeFileSync(fp, src, 'utf8');

// Count remaining
const remaining = (src.match(/var\(--/g) || []).length;
console.log(`✅ CSS var() fix complete`);
console.log(`   File: ${before} → ${after} bytes`);
console.log(`   Remaining var() references: ${remaining}`);
