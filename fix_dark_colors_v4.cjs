/**
 * fix_dark_colors_v4.cjs — 템플릿 리터럴 내 하드코딩된 hex + 테이블 배경 최종 정리
 */
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, 'frontend', 'src');
const SKIP = new Set(['Landing.jsx', 'PricingPublic.jsx', 'Privacy.jsx', 'Refund.jsx', 'Terms.jsx', 'PgTest.jsx', 'AuthPage.jsx']);

const REPLACEMENTS = [
  // ── Template literal hex backgrounds ──
  [/#0a1828/g, '${C?.surface || "var(--surface)"}'],
  [/#111e30/g, '${C?.card || "var(--bg-card)"}'],
  [/#152438/g, 'var(--surface)'],  // cardHover
  [/#0d1525/g, 'var(--surface)'],
  
  // ── Remaining table row backgrounds ──
  [/background:\s*i\s*%\s*2\s*\?\s*"#0a1520"\s*:/g, 'background: i % 2 ? "var(--surface)" :'],
  [/background:\s*i\s*%\s*2\s*\?\s*'#0a1520'\s*:/g, "background: i % 2 ? 'var(--surface)' :"],
  
  // ── Hardcoded glass overlay ──
  [/rgba\(13,\s*24,\s*41,\s*0\.85\)/g, 'var(--surface)'],
  
  // ── cardHover property ──
  [/cardHover:\s*"#152438"/g, 'cardHover: "var(--surface)"'],
  [/cardHover:\s*'#152438'/g, "cardHover: 'var(--surface)'"],
  
  // ── Remaining #0a1828 in template literals ──
  [/, #0a1828/g, ', var(--surface)'],
  [/#0a1828,/g, 'var(--surface),'],
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

console.log('🔍 v4: Template literal hex + table bg fix...\n');
walk(SRC);
console.log(`\n📊 Results: ${modifiedFiles}/${totalFiles} files modified`);
if (changes.length) {
  console.log('Modified files:');
  changes.forEach(f => console.log(`  - ${f}`));
}
