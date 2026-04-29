/**
 * Part 2: Remove all var(--) CSS references from AutoMarketing.jsx
 * Replace dark-mode CSS variables with direct Arctic White safe colors
 */
const fs = require('fs');
const fp = 'd:\\project\\GeniegoROI\\frontend\\src\\pages\\AutoMarketing.jsx';
let src = fs.readFileSync(fp, 'utf8');
const before = src.length;

const replacements = [
  // Text colors
  ["var(--text-1, '#1e293b')", "'#1e293b'"],
  ["var(--text-1, #1e293b)", "#1e293b"],
  ["var(--text-1)", "#1e293b"],
  ['var(--text-2, #475569)', '#475569'],
  ['var(--text-2)', '#475569'],
  ['var(--text-3, #64748b)', '#64748b'],
  ['var(--text-3)', '#64748b'],
  // Backgrounds
  ['var(--surface, rgba(241,245,249,0.7))', 'rgba(241,245,249,0.7)'],
  ['var(--surface)', 'rgba(241,245,249,0.7)'],
  ['var(--bg-card, rgba(255,255,255,0.95))', 'rgba(255,255,255,0.95)'],
  ['var(--bg-card)', 'rgba(255,255,255,0.95)'],
  ['var(--bg, #f5f7fa)', '#f5f7fa'],
  ['var(--bg)', '#f5f7fa'],
  // Borders
  ['var(--border, rgba(99,140,255,0.12))', 'rgba(99,140,255,0.12)'],
  ['var(--border)', 'rgba(99,140,255,0.12)'],
];

let count = 0;
replacements.forEach(([from, to]) => {
  while (src.includes(from)) {
    src = src.replace(from, to);
    count++;
  }
});

fs.writeFileSync(fp, src, 'utf8');
console.log(`Replaced ${count} var(--) references in AutoMarketing.jsx`);
console.log(`File size: ${before} -> ${src.length}`);

// Verify no var(-- left
const remaining = (src.match(/var\(--/g) || []).length;
console.log(`Remaining var(--): ${remaining}`);
