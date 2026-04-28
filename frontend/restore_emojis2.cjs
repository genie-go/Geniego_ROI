/**
 * Fix Sidebar.jsx by rebuilding menu entries from the dist bundle data
 */
const fs = require('fs');

const SIDEBAR_PATH = 'src/layout/Sidebar.jsx';
let content = fs.readFileSync(SIDEBAR_PATH, 'utf8');
if (content.charCodeAt(0) === 0xFEFF) content = content.slice(1);

// Read dist bundle
const distDir = 'dist/assets';
const distFiles = fs.readdirSync(distDir);
const indexFile = distFiles.find(f => f.startsWith('index-') && f.endsWith('.js'));
const dist = fs.readFileSync(`${distDir}/${indexFile}`, 'utf8');

// Extract ALL menu item objects from dist
// Pattern: {to:"/path",icon:"emoji",labelKey:"gNav.xxx",menuKey:"xxx"}  
// or: {key:"xxx",icon:"emoji",labelKey:"gNav.xxx",items:[...]}
const allEntries = {};

// Group headers: key, icon, labelKey
const groupRegex = /key:\s*"([^"]+)",\s*icon:\s*"([^"]+)",\s*labelKey:\s*"([^"]+)"/g;
let m;
while ((m = groupRegex.exec(dist)) !== null) {
  allEntries[m[3]] = { key: m[1], icon: m[2], labelKey: m[3] };
}

// Menu items: to, icon, labelKey, menuKey  
const itemRegex = /to:\s*"([^"]+)",\s*icon:\s*"([^"]+)",\s*labelKey:\s*"([^"]+)",\s*menuKey:\s*"([^"]+)"/g;
while ((m = itemRegex.exec(dist)) !== null) {
  allEntries[m[3]] = { to: m[1], icon: m[2], labelKey: m[3], menuKey: m[4] };
}

// Also: {icon:"emoji",labelKey:"key"} without to
const simpleRegex = /icon:\s*"([^"]+)",\s*labelKey:\s*"([^"]+)"/g;
while ((m = simpleRegex.exec(dist)) !== null) {
  if (!allEntries[m[2]]) {
    allEntries[m[2]] = { icon: m[1], labelKey: m[2] };
  }
}

console.log(`Extracted ${Object.keys(allEntries).length} entries from dist`);

// Now fix each line in the source that has broken structure
const lines = content.split('\n');
let fixCount = 0;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  // Fix pattern: icon: "BROKEN"LABELKEY
  // This happened because the replacement ate the ", labelKey: " part
  // Fix: look for key patterns and rebuild
  
  // Pattern 1: Group headers - key: "xxx", icon: "BROKEN"gNav.xxx",
  const groupMatch = line.match(/key:\s*"([^"]+)",\s*icon:\s*"[^"]*"(gNav\.[^"]+)"/);
  if (groupMatch) {
    const labelKey = groupMatch[2];
    const entry = allEntries[labelKey];
    if (entry) {
      lines[i] = line.replace(
        /key:\s*"([^"]+)",\s*icon:\s*"[^"]*"gNav\.[^"]+"/,
        `key: "${entry.key || groupMatch[1]}", icon: "${entry.icon}", labelKey: "${labelKey}"`
      );
      fixCount++;
      continue;
    }
  }
  
  // Pattern 2: Menu items - icon: "BROKEN"gNav.xxx", menuKey: "xxx"
  const itemMatch = line.match(/icon:\s*"[^"]*"(gNav\.[^"]+)",\s*menuKey:\s*"([^"]+)"/);
  if (itemMatch) {
    const labelKey = itemMatch[1];
    const menuKey = itemMatch[2];
    const entry = allEntries[labelKey];
    if (entry) {
      lines[i] = line.replace(
        /icon:\s*"[^"]*"gNav\.[^"]+"/,
        `icon: "${entry.icon}", labelKey: "${labelKey}"`
      );
      fixCount++;
      continue;
    }
  }

  // Pattern 3: to: "/path", icon: "BROKEN"gNav.xxx"
  const toMatch = line.match(/to:\s*"([^"]+)",\s*icon:\s*"[^"]*"(gNav\.[^"]+)"/);
  if (toMatch) {
    const labelKey = toMatch[2];
    const entry = allEntries[labelKey];
    if (entry) {
      lines[i] = line.replace(
        /icon:\s*"[^"]*"gNav\.[^"]+"/,
        `icon: "${entry.icon}", labelKey: "${labelKey}"`
      );
      fixCount++;
      continue;
    }
  }
  
  // Pattern 4: Plain broken emoji in quotes not caught above
  // "⬡" or similar single broken emoji chars
  if (line.includes('⬡') || line.includes('\uFFFD')) {
    // Try to match by menuKey or labelKey in the same line
    const mkMatch = line.match(/menuKey:\s*"([^"]+)"/);
    const lkMatch = line.match(/labelKey:\s*"([^"]+)"/);
    const key = (lkMatch || mkMatch)?.[1];
    if (key && allEntries[key]) {
      lines[i] = line.replace(/icon:\s*"[^"]*"/, `icon: "${allEntries[key].icon}"`);
      fixCount++;
    }
  }
}

content = lines.join('\n');
console.log(`Fixed ${fixCount} broken entries`);

// Check for remaining issues
const remainingBroken = (content.match(/"gNav\./g) || []).length;
console.log(`Remaining "gNav. patterns (should be 0): ${remainingBroken}`);

// Write fixed file
fs.writeFileSync(SIDEBAR_PATH, content, 'utf8');

// Validate
const esbuild = require('esbuild');
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
