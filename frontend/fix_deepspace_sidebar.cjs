/**
 * Fix Deep Space sidebar text: make it brighter for better visibility
 */
const fs = require('fs');

const fp = 'd:\\project\\GeniegoROI\\frontend\\src\\styles.css';
let css = fs.readFileSync(fp, 'utf8');

// Add Deep Space specific sidebar text brightness boost
const deepSpaceOverride = `
/* ══ Deep Space: Brighter sidebar text for dark background ══ */
[data-theme="deep_space"] .sidebar .nav-item,
body:not([data-theme]) .sidebar .nav-item {
  color: #b8d0f0 !important;
}
[data-theme="deep_space"] .sidebar .nav-item:hover,
body:not([data-theme]) .sidebar .nav-item:hover {
  color: #e8f0ff !important;
}
[data-theme="deep_space"] .sidebar .nav-item.active,
body:not([data-theme]) .sidebar .nav-item.active {
  color: #e8f0ff !important;
}
[data-theme="deep_space"] .sidebar button,
body:not([data-theme]) .sidebar button {
  color: #c0d4ee !important;
}
[data-theme="deep_space"] .sidebar button:hover,
body:not([data-theme]) .sidebar button:hover {
  color: #e8f0ff !important;
}
[data-theme="deep_space"] .sidebar-footer,
body:not([data-theme]) .sidebar-footer {
  color: #7a90ad !important;
}

`;

// Insert before the LIGHT THEME section
const lightThemeMark = 'LIGHT THEME OVERRIDES';
const ltIdx = css.indexOf(lightThemeMark);
if (ltIdx === -1) {
  console.log('ERROR: Could not find LIGHT THEME section');
  process.exit(1);
}

// Find the start of the comment block
const commentStart = css.lastIndexOf('/*', ltIdx);
css = css.substring(0, commentStart) + deepSpaceOverride + css.substring(commentStart);

fs.writeFileSync(fp, css, 'utf8');
console.log('✅ Deep Space sidebar brightness boost injected');
