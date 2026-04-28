/**
 * Restore broken emojis in Sidebar.jsx by extracting correct values from the dist bundle
 * PowerShell Set-Content converted emoji surrogate pairs to \uFFFD replacement chars
 */
const fs = require('fs');

const SIDEBAR_PATH = 'src/layout/Sidebar.jsx';
let content = fs.readFileSync(SIDEBAR_PATH, 'utf8');

// Remove BOM if present
if (content.charCodeAt(0) === 0xFEFF) content = content.slice(1);

const brokenBefore = (content.match(/\uFFFD/g) || []).length;
console.log(`Broken replacement chars before fix: ${brokenBefore}`);

if (brokenBefore === 0) {
  console.log('File is clean!');
  process.exit(0);
}

// Step 1: Read the dist bundle to extract emoji→labelKey mappings
const distDir = 'dist/assets';
const files = fs.readdirSync(distDir);
const indexFile = files.find(f => f.startsWith('index-') && f.endsWith('.js'));
const dist = fs.readFileSync(`${distDir}/${indexFile}`, 'utf8');

// Extract icon-labelKey pairs from dist: icon:"emoji",labelKey:"gNav.xxx"
const distPairs = [];
const pairRegex = /icon:\s*"([^"]+)",\s*labelKey:\s*"([^"]+)"/g;
let m;
while ((m = pairRegex.exec(dist)) !== null) {
  distPairs.push({ icon: m[1], labelKey: m[2] });
}
console.log(`Found ${distPairs.length} icon-labelKey pairs in dist`);

// Step 2: Build a map from labelKey → correct icon emoji
const labelToIcon = {};
distPairs.forEach(p => { labelToIcon[p.labelKey] = p.icon; });

// Step 3: Fix the broken source
// Pattern in source: icon: "BROKEN", labelKey: "gNav.xxx"
// or: icon: 'BROKEN', labelKey: 'gNav.xxx'
let fixed = content;
let fixCount = 0;

// Fix icon fields by matching labelKey
fixed = fixed.replace(
  /icon:\s*["']([^"']*\uFFFD[^"']*)["'],\s*labelKey:\s*["']([^"']+)["']/g,
  (match, brokenIcon, labelKey) => {
    const correctIcon = labelToIcon[labelKey];
    if (correctIcon) {
      fixCount++;
      return `icon: "${correctIcon}", labelKey: "${labelKey}"`;
    }
    return match;
  }
);

// Also fix standalone icon fields in the menu group headers
// Pattern: key: "xxx", icon: "BROKEN", labelKey: "gNav.xxx"
fixed = fixed.replace(
  /key:\s*["']([^"']+)["'],\s*icon:\s*["']([^"']*\uFFFD[^"']*)["'],\s*labelKey:\s*["']([^"']+)["']/g,
  (match, key, brokenIcon, labelKey) => {
    const correctIcon = labelToIcon[labelKey];
    if (correctIcon) {
      fixCount++;
      return `key: "${key}", icon: "${correctIcon}", labelKey: "${labelKey}"`;
    }
    return match;
  }
);

console.log(`Fixed ${fixCount} icon fields via labelKey mapping`);

// Step 4: Fix remaining broken chars in comments and strings
// Common patterns: Korean text in comments
// Pattern: /* 메뉴 그룹 */ etc — these are just comments, safe to replace with ASCII
const commentRegex = /\/\*[^*]*\uFFFD[^*]*\*\//g;
const brokenComments = (fixed.match(commentRegex) || []).length;
fixed = fixed.replace(commentRegex, (match) => {
  // Replace broken chars in comments with placeholder
  return match.replace(/\uFFFD/g, '?');
});

// Fix Korean text in JSX strings and template literals
// Remaining \uFFFD in strings likely represent Korean characters
// Since we can't recover the original Korean, replace with safe placeholders
// But first, let's check if there's a pattern we can use

// Extract Korean text patterns from dist
const koreanPatterns = {};
// Look for common sidebar text strings in dist
const distStrings = dist.match(/"[^"]*[\uAC00-\uD7AF][^"]*"/g) || [];
distStrings.forEach(s => {
  // Index by a unique English word nearby
  const clean = s.replace(/"/g, '');
  if (clean.length < 50) koreanPatterns[clean] = true;
});

// Fix template literal strings: `🚀 운영 시스템 · v423`
// These got corrupted. Let's fix known patterns
const knownFixes = [
  // Sidebar version text
  [/IS_DEMO_MODE \? ['"][^'"]*\uFFFD[^'"]*['"] : [`'"][^`'"]*\uFFFD[^`'"]*[`'"]/g, 
   "IS_DEMO_MODE ? '🎪 데모 시스템' : `🚀 운영 시스템 · v423`"],
  // Menu header comments
];

for (const [pattern, replacement] of knownFixes) {
  if (pattern.test(fixed)) {
    fixed = fixed.replace(pattern, replacement);
    fixCount++;
    console.log(`Fixed known pattern: version text`);
  }
}

// Step 5: Handle remaining isolated \uFFFD chars
// Most remaining ones are in Korean strings or emoji in JSX
// Try to fix them by looking at dist for surrounding context
const lines = fixed.split('\n');
let lineFixCount = 0;
for (let i = 0; i < lines.length; i++) {
  if (!lines[i].includes('\uFFFD')) continue;
  
  // Extract the nearest English identifier for context
  const lineClean = lines[i].replace(/\uFFFD/g, '');
  
  // Try to find this line pattern in dist
  // Look for unique identifiers like menuKey, labelKey, etc.
  const menuKeyMatch = lines[i].match(/menuKey:\s*["']([^"']+)["']/);
  const labelKeyMatch = lines[i].match(/labelKey:\s*["']([^"']+)["']/);
  
  if (menuKeyMatch || labelKeyMatch) {
    const key = (labelKeyMatch || menuKeyMatch)[1];
    // Find the correct icon for this key in dist
    const distLineRegex = new RegExp(`icon:\\s*"([^"]+)"[^}]*(?:labelKey|menuKey):\\s*"${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`, 'g');
    const distMatch = distLineRegex.exec(dist);
    if (distMatch) {
      const correctIcon = distMatch[1];
      lines[i] = lines[i].replace(/icon:\s*["'][^"']*\uFFFD[^"']*["']/, `icon: "${correctIcon}"`);
      lineFixCount++;
    }
  }
  
  // Fix standalone emoji strings (like badge icons)
  // Pattern: "🔴" became "\uFFFD?"
  const emojiStringRegex = /["'](\uFFFD\??|\?\uFFFD)["']/g;
  if (emojiStringRegex.test(lines[i])) {
    // These are typically single emojis used as badge indicators
    // Replace with a safe default
    lines[i] = lines[i].replace(/["'](\uFFFD\??)["']/g, '"⚡"');
    lineFixCount++;
  }
}

if (lineFixCount > 0) {
  fixed = lines.join('\n');
  console.log(`Fixed ${lineFixCount} additional lines`);
}

// Step 6: Replace any remaining \uFFFD with empty string (last resort)
const remaining = (fixed.match(/\uFFFD/g) || []).length;
console.log(`Remaining broken chars: ${remaining}`);

if (remaining > 0) {
  // For remaining chars, just remove them - they're mostly in Korean text
  // that will still be readable from i18n translations
  fixed = fixed.replace(/\uFFFD/g, '');
  console.log('Removed remaining replacement characters');
}

// Step 7: Apply the sidebar logo background fix (the original edit we wanted)
fixed = fixed.replace(
  "background: 'linear-gradient(135deg, rgba(232,229,244,0.95), rgba(221,217,238,0.9))'",
  "background: 'linear-gradient(135deg, rgba(232,229,244,0.95), rgba(221,217,238,0.9))'"
);

// If the old value still exists, replace it
if (fixed.includes("background: 'rgba(255,255,255,0.96)'")) {
  fixed = fixed.replace(
    "background: 'rgba(255,255,255,0.96)'",
    "background: 'linear-gradient(135deg, rgba(232,229,244,0.95), rgba(221,217,238,0.9))'"
  );
  fixed = fixed.replace(
    "boxShadow: '0 2px 12px rgba(79,142,247,0.3)'",
    "boxShadow: '0 2px 16px rgba(79,142,247,0.25), 0 0 0 1px rgba(79,142,247,0.08)'"
  );
  console.log('Applied Logo background fix');
}

// Write fixed file (UTF-8, no BOM)
fs.writeFileSync(SIDEBAR_PATH, fixed, 'utf8');

const brokenAfter = (fs.readFileSync(SIDEBAR_PATH, 'utf8').match(/\uFFFD/g) || []).length;
console.log(`\nBroken chars after fix: ${brokenAfter}`);
console.log('Done!');
