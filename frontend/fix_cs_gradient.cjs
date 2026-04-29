/**
 * Fix CS active tab: Add CSS rule to preserve gradient background
 * AND fix the specific CSS selector that kills gradient backgrounds
 */
const fs = require('fs');

const cssPath = 'd:\\project\\GeniegoROI\\frontend\\src\\styles.css';
let css = fs.readFileSync(cssPath, 'utf8');

// Add stronger CSS rules for cs-active-tab (with background protection)
const cssFix = `
/* ══ DEFINITIVE: Protect CS active tab gradient background ══ */
[data-theme="arctic_white"] button.cs-active-tab,
[data-theme="pearl_office"] button.cs-active-tab {
  background: linear-gradient(135deg, #4f8ef7, #6366f1) !important;
  color: #ffffff !important;
  box-shadow: 0 3px 14px rgba(79, 142, 247, 0.35) !important;
}
`;

css += cssFix;
fs.writeFileSync(cssPath, css, 'utf8');
console.log('✅ CS active tab gradient protection added');
