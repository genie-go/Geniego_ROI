/**
 * Add BASE CSS rules for cs-active-tab and cs-inactive-tab
 * These will work in ALL themes because they don't rely on inline styles
 */
const fs = require('fs');

const cssPath = 'd:\\project\\GeniegoROI\\frontend\\src\\styles.css';
let css = fs.readFileSync(cssPath, 'utf8');

const baseCssRules = `
/* ══ CS Tab Buttons — Universal (all themes) ══ */
button.cs-active-tab {
  background: linear-gradient(135deg, #4f8ef7, #6366f1) !important;
  color: #ffffff !important;
  box-shadow: 0 3px 14px rgba(79, 142, 247, 0.35) !important;
}
button.cs-inactive-tab {
  background: transparent !important;
  color: #475569 !important;
}
/* Light theme: inactive tab text darker */
[data-theme="arctic_white"] button.cs-inactive-tab,
[data-theme="pearl_office"] button.cs-inactive-tab {
  color: #1e293b !important;
}
`;

css += baseCssRules;
fs.writeFileSync(cssPath, css, 'utf8');
console.log('✅ Base CS tab button CSS rules added (universal)');
