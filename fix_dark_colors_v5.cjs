/**
 * fix_dark_colors_v5.cjs — 최종 정리: 남은 rgba(255,255,255,0.0x), 
 * rgba(0,0,0,0.x), 하드코딩된 hex 배경을 모두 CSS 변수로 변환
 */
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, 'frontend', 'src');
const SKIP = new Set(['Landing.jsx', 'PricingPublic.jsx', 'Privacy.jsx', 'Refund.jsx', 'Terms.jsx', 'PgTest.jsx', 'AuthPage.jsx']);

const REPLACEMENTS = [
  // ── Panel background with dark gradient ──
  // linear-gradient(145deg,rgba(255,255,255,0.04),rgba(13,21,37,0.9))
  [/linear-gradient\(145deg,\s*rgba\(255,255,255,0\.04\),\s*rgba\(13,21,37,0\.9\)\)/g, 
   'var(--bg-card, rgba(255,255,255,0.95))'],
  
  // linear-gradient(145deg,var(--surface),#060b14)
  [/linear-gradient\(145deg,\s*var\(--surface\),\s*#060b14\)/g,
   'var(--bg-card, rgba(255,255,255,0.95))'],

  // ── Progress bar bg: rgba(255,255,255,0.06) → var(--border) ──
  [/background:\s*'rgba\(255,\s*255,\s*255,\s*0\.0[2-9]\)'/g, "background: 'var(--border)'"],

  // ── border separators in tables: rgba(255,255,255,0.0xx) ──  
  [/borderBottom:\s*'1px solid rgba\(255,\s*255,\s*255,\s*0\.0[2-9][0-9]?\)'/g, "borderBottom: '1px solid var(--border)'"],
  [/'1px solid rgba\(255,\s*255,\s*255,\s*0\.0[4-9]\)'/g, "'1px solid var(--border)'"],
  
  // ── Even-row background rgba(255,255,255,0.015) ──
  [/rgba\(255,255,255,0\.015\)/g, 'var(--surface)'],
  
  // ── Dark background overlays: rgba(0,0,0,0.2) ──
  [/background:\s*'rgba\(0,\s*0,\s*0,\s*0\.2\)'/g, "background: 'var(--surface)'"],
  [/background:\s*'rgba\(0,\s*0,\s*0,\s*0\.3\)'/g, "background: 'var(--surface)'"],
  
  // ── Remaining #060b14 references ──
  [/#060b14/g, 'var(--bg)'],

  // ── Glass background: rgba(13,24,41,0.95) and similar ──
  [/rgba\(13,\s*21,\s*37,\s*0\.9[0-9]?\)/g, 'var(--bg-card, rgba(255,255,255,0.95))'],
  [/rgba\(13,\s*24,\s*41,\s*0\.8[0-9]?\)/g, 'var(--bg-card, rgba(255,255,255,0.95))'],

  // ── #93c5fd → proper text variable (it's a light blue only visible on dark) ──
  [/color:\s*'#93c5fd'/g, "color: 'var(--text-1)'"],
  
  // ── FlowBanner text fix ──
  [/color: '#93c5fd'/g, "color: 'var(--text-1)'"],
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

console.log('🔍 v5: Final dark pattern cleanup...\n');
walk(SRC);
console.log(`\n📊 Results: ${modifiedFiles}/${totalFiles} files modified`);
if (changes.length) {
  console.log('Modified files:');
  changes.forEach(f => console.log(`  - ${f}`));
}
