/**
 * fix_dark_colors.cjs — 모든 JSX 파일의 하드코딩된 다크 색상을 CSS 변수로 일괄 변환
 * 
 * 변환 규칙:
 *   bg/background 계열:  #070f1a, #0a0e1a, #060e1e, #030810 → var(--bg)
 *   surface 계열:        #0d1829, #111827, #0a1520, #0a1828 → var(--surface)
 *   card 계열:           #111e30, #151d2e, #0d1525, #060b14 → var(--bg-card, rgba(255,255,255,0.95))
 *   border 계열:         rgba(99,102,241,0.15), rgba(255,255,255,0.08) → var(--border)
 *   text 계열:           #e2e8f0, #e8eaf0 → var(--text-1)
 *   muted 계열:          rgba(255,255,255,0.4), rgba(255,255,255,0.45) → var(--text-3)
 */
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, 'frontend', 'src');

// Files already converted (skip them)
const SKIP = new Set([
  'CRM.jsx',
  'KakaoChannel.jsx',
  'DashGuide.jsx',
  'DashOverview.jsx',
  'DashSystem.jsx',
]);

// ── Color mapping: const C = { ... } block replacements ──
// Pattern: const C = { ... } where bg/surface/card/border/text/muted are hardcoded
const C_REPLACEMENTS = [
  // bg values
  [/bg:\s*["']#0(?:70f1a|a0e1a|60e1e|30810|a1520)["']/g, 'bg: "var(--bg)"'],
  // surface values  
  [/surface:\s*["']#(?:0d1829|111827|0a1520|0a1828)["']/g, 'surface: "var(--surface)"'],
  // card values
  [/card:\s*["']#(?:111e30|151d2e|0d1525|060b14)["']/g, 'card: "var(--bg-card, rgba(255,255,255,0.95))"'],
  // border values
  [/border:\s*["']rgba\(99,\s*102,\s*241,\s*0\.15\)["']/g, 'border: "var(--border)"'],
  [/border:\s*["']rgba\(255,\s*255,\s*255,\s*0\.0[68]\)["']/g, 'border: "var(--border)"'],
  // text values
  [/text:\s*["']#(?:e2e8f0|e8eaf0)["']/g, 'text: "var(--text-1)"'],
  // muted values
  [/muted:\s*["']rgba\(255,\s*255,\s*255,\s*0\.4[05]?\)["']/g, 'muted: "var(--text-3)"'],
];

// ── Inline style replacements (outside const C) ──
const INLINE_REPLACEMENTS = [
  // Table header/row backgrounds
  [/background:\s*["']#0a1520["']/g, 'background: "var(--surface)"'],
  [/background:\s*"#0a1520"/g, 'background: "var(--surface)"'],
  // Common dark backgrounds in inline styles
  [/background:\s*C\.surface/g, 'background: C.surface'],  // keep as-is if using C
];

let totalFiles = 0;
let modifiedFiles = 0;
const changes = [];

function walk(dir) {
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) {
      if (f === 'node_modules' || f === 'dist') continue;
      walk(full);
    } else if (f.endsWith('.jsx') || f.endsWith('.js')) {
      if (SKIP.has(f)) continue;
      totalFiles++;
      processFile(full, f);
    }
  }
}

function processFile(filePath, name) {
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;
  
  // Apply C_REPLACEMENTS
  for (const [pat, rep] of C_REPLACEMENTS) {
    content = content.replace(pat, rep);
  }
  
  // Apply INLINE_REPLACEMENTS
  for (const [pat, rep] of INLINE_REPLACEMENTS) {
    content = content.replace(pat, rep);
  }

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    modifiedFiles++;
    changes.push(name);
    console.log(`  ✅ ${name}`);
  }
}

console.log('🔍 Scanning all JSX/JS files for hardcoded dark colors...\n');
walk(SRC);
console.log(`\n📊 Results: ${modifiedFiles}/${totalFiles} files modified`);
if (changes.length) {
  console.log('Modified files:');
  changes.forEach(f => console.log(`  - ${f}`));
}
