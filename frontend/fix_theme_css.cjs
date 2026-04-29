/**
 * Fix CSS theme for Arctic White + Pearl Office:
 * 1. Override --text-1/2/3 vars to dark colors in light themes
 * 2. Ensure sidebar text is readable in both modes
 */
const fs = require('fs');

const fp = 'd:\\project\\GeniegoROI\\frontend\\src\\styles.css';
let css = fs.readFileSync(fp, 'utf8');

// Find the Arctic White sidebar rule and inject variable overrides BEFORE it
const marker = '[data-theme="arctic_white"] .sidebar {';
const idx = css.indexOf(marker);
if (idx === -1) {
  console.log('ERROR: Could not find arctic_white sidebar rule');
  process.exit(1);
}

const injection = `
/* ══ Arctic White: Light-theme CSS variable overrides ══ */
[data-theme="arctic_white"] {
  --text-1: #0f1c3a;
  --text-2: #374151;
  --text-3: #64748b;
  --bg: rgba(245, 247, 250, 0.97);
  --surface: rgba(255, 255, 255, 0.92);
  --border: rgba(79, 142, 247, 0.18);
}

/* Sidebar section header buttons - dark text on light sidebar */
[data-theme="arctic_white"] .sidebar button {
  color: #1e293b !important;
}
[data-theme="arctic_white"] .sidebar button:hover {
  color: #1e56b8 !important;
}

/* Sidebar logo & footer text for light theme */
[data-theme="arctic_white"] .sidebar-logo-name {
  color: #0f1c3a !important;
}
[data-theme="arctic_white"] .sidebar-logo-version {
  color: #64748b !important;
}
[data-theme="arctic_white"] .sidebar-footer {
  color: #64748b !important;
}

/* ══ Pearl Office: Light-theme CSS variable overrides ══ */
[data-theme="pearl_office"] {
  --text-1: #111827;
  --text-2: #374151;
  --text-3: #6b7280;
  --bg: rgba(248, 249, 252, 0.97);
  --surface: rgba(255, 255, 255, 0.95);
  --border: rgba(55, 65, 81, 0.12);
}

[data-theme="pearl_office"] .sidebar button {
  color: #1e293b !important;
}
[data-theme="pearl_office"] .sidebar button:hover {
  color: #374151 !important;
}
[data-theme="pearl_office"] .sidebar-logo-name {
  color: #111827 !important;
}
[data-theme="pearl_office"] .sidebar-logo-version {
  color: #6b7280 !important;
}
[data-theme="pearl_office"] .sidebar-footer {
  color: #6b7280 !important;
}

`;

css = css.substring(0, idx) + injection + css.substring(idx);
fs.writeFileSync(fp, css, 'utf8');

console.log('✅ Arctic White + Pearl Office CSS variable overrides injected');
console.log(`   Injection point: character ${idx}`);
console.log(`   Added ${injection.split('\n').length} lines of CSS overrides`);
