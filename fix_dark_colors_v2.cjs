/**
 * fix_dark_colors_v2.cjs — 더 넓은 범위 일괄 변환
 */
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, 'frontend', 'src');
const SKIP = new Set(['CRM.jsx', 'KakaoChannel.jsx', 'DashGuide.jsx', 'DashOverview.jsx', 'DashSystem.jsx']);

const REPLACEMENTS = [
  // ── const C block replacements ──
  [/card:\s*['"]#1e1e2e['"]/g, 'card: "var(--bg-card, rgba(255,255,255,0.95))"'],
  [/muted:\s*["']rgba\(255,\s*255,\s*255,\s*0\.4[0-9]\)["']/g, 'muted: "var(--text-3)"'],

  // ── Inline style: background: "#1e1e2e" ──
  [/background:\s*"#1e1e2e"/g, 'background: "var(--bg-card, #1e1e2e)"'],
  [/background:\s*'#1e1e2e'/g, "background: 'var(--bg-card, #1e1e2e)'"],
  
  // ── var(--card-bg,#1e1e2e) → var(--bg-card, #1e1e2e) (proper CSS var) ──
  [/var\(--card-bg,#1e1e2e\)/g, 'var(--bg-card, #1e1e2e)'],

  // ── Table borders: #333 → var(--border) ──
  [/1px solid #333/g, '1px solid var(--border)'],

  // ── Sticky header background: "#1e1e2e" → "var(--surface)" ──
  // (these are table headers using inline style)
  
  // ── Remaining hardcoded dark backgrounds ──
  [/background:\s*"#0d1829"/g, 'background: "var(--surface)"'],
  [/background:\s*'#0d1829'/g, "background: 'var(--surface)'"],
  [/background:\s*"#111e30"/g, 'background: "var(--bg-card, #111e30)"'],
  [/background:\s*'#111e30'/g, "background: 'var(--bg-card, #111e30)'"],
  [/background:\s*"#070f1a"/g, 'background: "var(--bg)"'],
  [/background:\s*'#070f1a'/g, "background: 'var(--bg)'"],
  [/background:\s*"#0a0e1a"/g, 'background: "var(--bg)"'],
  [/background:\s*'#0a0e1a'/g, "background: 'var(--bg)'"],
  [/background:\s*"#151d2e"/g, 'background: "var(--bg-card, #151d2e)"'],

  // ── Remaining text colors ──
  [/color:\s*"#e2e8f0"/g, 'color: "var(--text-1)"'],
  [/color:\s*'#e2e8f0'/g, "color: 'var(--text-1)'"],
  [/color:\s*"#e8eaf0"/g, 'color: "var(--text-1)"'],

  // ── Background #0a1520 (common table row) ──
  [/background:\s*"#0a1520"/g, 'background: "var(--surface)"'],
  [/background:\s*'#0a1520'/g, "background: 'var(--surface)'"],
  
  // ── Other hardcoded hex in muted/text patterns ──
  [/color:\s*"rgba\(255,\s*255,\s*255,\s*0\.[34][0-9]?\)"/g, 'color: "var(--text-3)"'],
  [/color:\s*'rgba\(255,\s*255,\s*255,\s*0\.[34][0-9]?\)'/g, "color: 'var(--text-3)'"],
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

console.log('🔍 v2: Extended dark color scan...\n');
walk(SRC);
console.log(`\n📊 Results: ${modifiedFiles}/${totalFiles} files modified`);
if (changes.length) {
  console.log('Modified files:');
  changes.forEach(f => console.log(`  - ${f}`));
}
