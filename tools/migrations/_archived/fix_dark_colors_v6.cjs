/**
 * fix_dark_colors_v6.cjs — Hero gradient text → solid text for light theme readability
 * Removes WebkitTextFillColor:"transparent" from hero titles so CSS overrides can force dark text
 */
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, 'frontend', 'src');
const SKIP = new Set(['Landing.jsx', 'PricingPublic.jsx', 'Privacy.jsx', 'Refund.jsx', 'Terms.jsx', 'PgTest.jsx', 'AuthPage.jsx']);

// Convert WebkitTextFillColor:"transparent" (gradient text) to a proper visible color
// In hero titles, replace with var(--text-1) which is dark in light mode
const REPLACEMENTS = [
  // Pattern: background: "linear-gradient(...)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent"
  // → Remove gradient text rendering, just use solid color
  [/,\s*WebkitBackgroundClip:\s*["']text["'],\s*WebkitTextFillColor:\s*["']transparent["']\s*/g, ' '],
  [/,\s*WebkitBackgroundClip:\s*'text',\s*WebkitTextFillColor:\s*'transparent'\s*/g, ' '],
  
  // Also fix the background property when used with background-clip:text
  // These hero titles should inherit color from parent or use explicit color
];

let totalFiles = 0;
let modifiedFiles = 0;
const changes = [];

function walk(dir) {
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) {
      if (f === 'node_modules' || f === 'dist' || f === 'public') continue;
      walk(full);
    } else if (f.endsWith('.jsx')) {
      if (SKIP.has(f)) continue;
      totalFiles++;
      processFile(full, f);
    }
  }
}

function processFile(filePath, name) {
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;
  
  for (const [pat, rep] of REPLACEMENTS) {
    content = content.replace(pat, rep);
  }

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    modifiedFiles++;
    changes.push(name);
    console.log(`  ✅ ${name}`);
  }
}

console.log('🔍 v6: Remove gradient-text (WebkitTextFillColor:transparent) from hero titles...\n');
walk(SRC);
console.log(`\n📊 Results: ${modifiedFiles}/${totalFiles} files modified`);
if (changes.length) {
  console.log('Modified files:');
  changes.forEach(f => console.log(`  - ${f}`));
}
