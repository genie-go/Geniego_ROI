/**
 * Fix the ROOT CAUSE: The CSS rule at lines 3419-3423 that kills ALL gradient backgrounds
 * should EXCLUDE buttons (button elements should keep their gradient backgrounds)
 * 
 * Also: the style attribute matching might not work because React renders
 * inline styles as individual CSS properties (background-image vs background)
 */
const fs = require('fs');

const cssPath = 'd:\\project\\GeniegoROI\\frontend\\src\\styles.css';
let css = fs.readFileSync(cssPath, 'utf8');

// Replace the problematic rule to exclude buttons
const oldRule = `/* Tab bar backgrounds that use gradients or dark surfaces */
[data-theme="arctic_white"] .container > div:last-child [style*="background: linear-gradient"],
[data-theme="pearl_office"] .container > div:last-child [style*="background: linear-gradient"] {
  background: linear-gradient(135deg, rgba(255,255,255,0.95), rgba(248,250,255,0.9)) !important;
  color: #111827 !important;
}`;

const newRule = `/* Tab bar backgrounds that use gradients or dark surfaces (EXCLUDE buttons) */
[data-theme="arctic_white"] .container > div:last-child div[style*="background: linear-gradient"]:not(button),
[data-theme="pearl_office"] .container > div:last-child div[style*="background: linear-gradient"]:not(button) {
  background: linear-gradient(135deg, rgba(255,255,255,0.95), rgba(248,250,255,0.9)) !important;
  color: #111827 !important;
}`;

if (css.includes(oldRule)) {
  css = css.replace(oldRule, newRule);
  console.log('✅ Modified gradient killer rule to exclude buttons');
} else {
  console.log('⚠️ Could not find exact old rule, trying alternative...');
  // Try without the comment
  const alt1 = '[data-theme="arctic_white"] .container > div:last-child [style*="background: linear-gradient"],';
  if (css.includes(alt1)) {
    // Replace with div-specific selector
    css = css.replace(
      '[data-theme="arctic_white"] .container > div:last-child [style*="background: linear-gradient"],\n[data-theme="pearl_office"] .container > div:last-child [style*="background: linear-gradient"] {\n  background: linear-gradient(135deg, rgba(255,255,255,0.95), rgba(248,250,255,0.9)) !important;\n  color: #111827 !important;\n}',
      '[data-theme="arctic_white"] .container > div:last-child div[style*="background: linear-gradient"],\n[data-theme="pearl_office"] .container > div:last-child div[style*="background: linear-gradient"] {\n  background: linear-gradient(135deg, rgba(255,255,255,0.95), rgba(248,250,255,0.9)) !important;\n  color: #111827 !important;\n}'
    );
    console.log('✅ Modified (alt) gradient rule to target div only');
  }
}

fs.writeFileSync(cssPath, css, 'utf8');
console.log('✅ CSS saved');
