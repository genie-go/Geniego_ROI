const fs = require('fs');
const file = 'D:/project/GeniegoROI/frontend/src/styles.css';
let c = fs.readFileSync(file, 'utf8');

// Remove old topbar-logo-pc CSS if exists
c = c.replace(/\n\/\* Topbar logo PC only \*\/[\s\S]*?@media \(max-width: 768px\) \{\s*\.topbar-logo-pc \{ display: none !important; \}\s*\}\s*/g, '\n');
c = c.replace(/\n\/\* Topbar PC logo \*\/[\s\S]*?@media \(max-width: 768px\) \{\s*\.topbar-logo-pc \{ display: none !important; \}\s*\}\s*/g, '\n');

const add = `
/* Topbar mobile cleanup */
@media (max-width: 768px) {
  .topbar-btn-text { display: none !important; }
  .topbar-btn-kbd  { display: none !important; }
  .topbar-logo-pc  { display: none !important; }
}
`;
c += add;
fs.writeFileSync(file, c, 'utf8');
console.log('OK');
