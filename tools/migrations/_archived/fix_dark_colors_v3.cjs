/**
 * fix_dark_colors_v3.cjs — 인라인 style의 하드코딩된 흰색 텍스트 변환
 */
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, 'frontend', 'src');
// Skip public pages that should stay as-is
const SKIP = new Set(['Landing.jsx', 'PricingPublic.jsx', 'Privacy.jsx', 'Refund.jsx', 'Terms.jsx', 'PgTest.jsx', 'AuthPage.jsx']);

const REPLACEMENTS = [
  // ── High-opacity white text → var(--text-1) ──
  [/color:\s*['"]rgba\(255,\s*255,\s*255,\s*0\.8[0-9]?\)['"]/g, "color: 'var(--text-1)'"],
  [/color:\s*['"]rgba\(255,\s*255,\s*255,\s*0\.9[0-9]?\)['"]/g, "color: 'var(--text-1)'"],
  [/color:\s*['"]#fff['"]/g, "color: 'var(--text-1)'"],
  [/color:\s*['"]#ffffff['"]/g, "color: 'var(--text-1)'"],
  
  // ── Medium-opacity white text → var(--text-2) ──
  [/color:\s*['"]rgba\(255,\s*255,\s*255,\s*0\.6[0-9]?\)['"]/g, "color: 'var(--text-2)'"],
  [/color:\s*['"]rgba\(255,\s*255,\s*255,\s*0\.7[0-9]?\)['"]/g, "color: 'var(--text-2)'"],
  
  // ── Low-opacity white text → var(--text-3) ──
  [/color:\s*['"]rgba\(255,\s*255,\s*255,\s*0\.[345][0-9]?\)['"]/g, "color: 'var(--text-3)'"],
  
  // ── Very low opacity white text → var(--text-3) ──
  [/color:\s*['"]rgba\(255,\s*255,\s*255,\s*0\.2[0-9]?\)['"]/g, "color: 'var(--text-3)'"],

  // ── White border → var(--border) ──
  [/border:\s*['"]1px solid rgba\(255,\s*255,\s*255,\s*0\.0[4-9]\)['"]/g, "border: '1px solid var(--border)'"],
  [/border:\s*['"]1px solid rgba\(255,\s*255,\s*255,\s*0\.1[0-9]?\)['"]/g, "border: '1px solid var(--border)'"],
  
  // ── White background overlays → themed ──
  [/background:\s*['"]rgba\(255,\s*255,\s*255,\s*0\.0[12345]\)['"]/g, "background: 'var(--surface)'"],
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

console.log('🔍 v3: Converting inline white text colors...\n');
walk(SRC);
console.log(`\n📊 Results: ${modifiedFiles}/${totalFiles} files modified`);
if (changes.length) {
  console.log('Modified files:');
  changes.forEach(f => console.log(`  - ${f}`));
}
