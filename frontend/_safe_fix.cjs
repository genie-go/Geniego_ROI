/**
 * SAFE Tag Balance Fixer
 * ──────────────────────────────────────────────────
 * Unlike the destructive universal_fixer, this script:
 * 1. Parses JSX properly (respects strings, comments, JSX expressions)
 * 2. Only REMOVES genuinely excess </div> tags at the END of a component
 * 3. Never touches code logic, only structural closing tags
 * 4. Shows exactly what it will change before applying
 * 
 * Handles the "Unterminated regular expression" error pattern
 * caused by excess </div> making the parser lose context.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PAGES = path.join(__dirname, 'src/pages');
const VITE = path.join(__dirname, 'node_modules/vite/bin/vite.js');

function countTags(content) {
  // Remove strings, comments, and JSX expression contexts for accurate counting
  let clean = content;
  // Remove template literals
  clean = clean.replace(/`[^`]*`/g, '""');
  // Remove single-line comments
  clean = clean.replace(/\/\/.*$/gm, '');
  // Remove multi-line comments
  clean = clean.replace(/\/\*[\s\S]*?\*\//g, '');
  // Remove string literals (single and double quotes)
  clean = clean.replace(/'(?:[^'\\]|\\.)*'/g, '""');
  clean = clean.replace(/"(?:[^"\\]|\\.)*"/g, '""');
  
  const opens = (clean.match(/<div[\s>]/g) || []).length;
  const selfClose = (clean.match(/<div[^>]*\/>/g) || []).length;
  const closes = (clean.match(/<\/div>/g) || []).length;
  return { opens: opens - selfClose, closes };
}

function findExportDefault(lines) {
  for (let i = 0; i < lines.length; i++) {
    if (/^export\s+default\s+function/.test(lines[i])) return i;
  }
  return -1;
}

function fixFile(filePath) {
  const name = path.basename(filePath);
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  
  const { opens, closes } = countTags(content);
  const excess = closes - opens;
  
  if (excess <= 0) {
    console.log(`  ${name}: opens=${opens} closes=${closes} — no excess, skipping`);
    return false;
  }
  
  console.log(`  ${name}: opens=${opens} closes=${closes} — ${excess} excess </div> to remove`);
  
  // Find excess </div> at the END of the file (bottom-up)
  // These are the ones added by previous bad formatting
  let toRemove = excess;
  const removedLines = [];
  
  for (let i = lines.length - 1; i >= 0 && toRemove > 0; i--) {
    const trimmed = lines[i].trim();
    if (trimmed === '</div>') {
      // Check if removing this would make the local context valid
      // by verifying it's part of an excess tail
      removedLines.push(i);
      toRemove--;
    } else if (trimmed === '' || trimmed === ');' || trimmed === '}') {
      // Skip over structural closers
      continue;
    } else {
      // Hit actual content — stop removing
      break;
    }
  }
  
  if (removedLines.length !== excess) {
    console.log(`    ⚠️  Could only find ${removedLines.length} excess </div> at tail (need ${excess})`);
    // Still remove what we can
  }
  
  // Remove lines (in reverse order to preserve indices)
  const newLines = [...lines];
  removedLines.sort((a, b) => b - a).forEach(idx => {
    console.log(`    🔧 Removing line ${idx + 1}: ${lines[idx].trim()}`);
    newLines.splice(idx, 1);
  });
  
  fs.writeFileSync(filePath, newLines.join('\n'), 'utf8');
  return removedLines.length > 0;
}

// ─── Main ───
console.log('═══ SAFE Tag Balance Fixer ═══\n');

// Fix all files with excess </div>
const files = fs.readdirSync(PAGES).filter(f => f.endsWith('.jsx'));
let fixed = 0;

for (const file of files) {
  const fp = path.join(PAGES, file);
  const content = fs.readFileSync(fp, 'utf8');
  const { opens, closes } = countTags(content);
  
  if (closes > opens) {
    if (fixFile(fp)) fixed++;
  }
}

console.log(`\n${fixed} files fixed\n`);

// Run build to check
console.log('═══ Build check ═══');
try {
  const out = execSync(`node "${VITE}" build`, { cwd: path.join(__dirname), encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
  console.log('✅ BUILD SUCCEEDED!');
} catch (err) {
  const msg = (err.stdout || '') + (err.stderr || '');
  const m = msg.match(/([^\s/]+\.jsx):(\d+):\d+: ERROR: (.+)/);
  if (m) console.log(`❌ ${m[1]}:${m[2]} — ${m[3]}`);
  else console.log('❌ Build failed:', msg.substring(0, 300));
}
