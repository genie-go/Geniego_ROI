// Extract all icon-labelKey pairs from dist and fix Sidebar.jsx
const fs = require('fs');
const esbuild = require('esbuild');

const dist = fs.readFileSync('dist/assets/index-BzKPgTpy.js', 'utf8');

// Extract all labelKey->icon mappings
const map = {};
const r1 = /icon:\s*"([^"]+)",\s*labelKey:\s*"([^"]+)"/g;
let mm;
while ((mm = r1.exec(dist)) !== null) {
  map[mm[2]] = mm[1];
}

// Also extract key->icon for group headers
const r2 = /key:\s*"([^"]+)",\s*icon:\s*"([^"]+)",\s*labelKey:\s*"([^"]+)"/g;
while ((mm = r2.exec(dist)) !== null) {
  map[mm[3]] = mm[2];
}

console.log('Icon mappings from dist:', Object.keys(map).length);
console.log('Sample:', Object.entries(map).slice(0, 5));

// Read Sidebar.jsx
let content = fs.readFileSync('src/layout/Sidebar.jsx', 'utf8');
if (content.charCodeAt(0) === 0xFEFF) content = content.slice(1);

const lines = content.split('\n');
let fixCount = 0;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  // Find all labelKey references in this line
  const labelKeys = [...line.matchAll(/labelKey:\s*"([^"]+)"/g)].map(m => m[1]);
  
  for (const lk of labelKeys) {
    if (map[lk]) {
      // Check if the icon on this line is broken (contains ⬡ or ?? or is wrong)
      const iconMatch = line.match(/icon:\s*"([^"]*)"/);
      if (iconMatch && iconMatch[1] !== map[lk]) {
        lines[i] = lines[i].replace(`icon: "${iconMatch[1]}"`, `icon: "${map[lk]}"`);
        fixCount++;
      }
    }
  }
  
  // Fix lines with broken icon but NO labelKey (labelKey was eaten by previous bad fix)
  // Pattern: icon: "⬡"gNav.xxx"  OR  icon: "??"gNav.xxx"
  const brokenPattern = line.match(/icon:\s*"[^"]*"(gNav\.[^"]+)"/);
  if (brokenPattern) {
    const labelKey = brokenPattern[1];
    const correctIcon = map[labelKey];
    if (correctIcon) {
      lines[i] = line.replace(
        /icon:\s*"[^"]*"(gNav\.[^"]+)"/,
        `icon: "${correctIcon}", labelKey: "${labelKey}"`
      );
      fixCount++;
    }
  }
  
  // Fix icon: "??" patterns (broken emoji remnants)
  const brokenIcon = line.match(/icon:\s*"(\?\?|⬡|)"/);
  if (brokenIcon) {
    // Try to get labelKey from same line
    const lkm = line.match(/labelKey:\s*"([^"]+)"/);
    if (lkm && map[lkm[1]]) {
      lines[i] = lines[i].replace(/icon:\s*"(\?\?|⬡|)"/, `icon: "${map[lkm[1]]}"`);
      fixCount++;
    }
  }
}

content = lines.join('\n');
console.log(`Fixed ${fixCount} entries`);

// Check remaining issues
const remainingBadIcons = (content.match(/"⬡"/g) || []).length;
const remainingBrokenLK = (content.match(/"gNav\./g) || []).length;
console.log(`Remaining ⬡ icons: ${remainingBadIcons}`);
console.log(`Remaining broken "gNav. patterns: ${remainingBrokenLK}`);

// Apply sidebar logo background fix
if (content.includes("background: 'rgba(255,255,255,0.96)'")) {
  content = content.replace(
    "background: 'rgba(255,255,255,0.96)'",
    "background: 'linear-gradient(135deg, rgba(232,229,244,0.95), rgba(221,217,238,0.9))'"
  );
  content = content.replace(
    "boxShadow: '0 2px 12px rgba(79,142,247,0.3)'",
    "boxShadow: '0 2px 16px rgba(79,142,247,0.25), 0 0 0 1px rgba(79,142,247,0.08)'"
  );
  console.log('Applied logo background fix');
}

fs.writeFileSync('src/layout/Sidebar.jsx', content, 'utf8');

// Validate
esbuild.transform(content, { loader: 'jsx', jsx: 'automatic' })
  .then(() => console.log('\n✅ Sidebar.jsx passes esbuild!'))
  .catch(e => {
    const match = e.message.match(/<stdin>:(\d+):(\d+): ERROR: (.+)/);
    if (match) {
      const lineNum = parseInt(match[1]);
      const errLine = content.split('\n')[lineNum - 1];
      console.log(`\n⚠️ L${lineNum}: ${match[3]}`);
      console.log(`   ${errLine?.substring(0, 120)}`);
    }
  });
