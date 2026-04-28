/**
 * Iterative Build Fixer v2
 * Runs vite build, parses the error, adds missing </div> at component ends
 * for files with negative diff (missing closing tags).
 * Safely handles only the tail-padding pattern.
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const VITE = path.join(__dirname, 'node_modules/vite/bin/vite.js');
const ROOT = __dirname;
const MAX_ITERATIONS = 60;

function countDivBalance(content) {
  const opens = (content.match(/<div[\s>]/g) || []).length - (content.match(/<div[^>]*\/>/g) || []).length;
  const closes = (content.match(/<\/div>/g) || []).length;
  return opens - closes; // positive = missing closes
}

function tryBuild() {
  try {
    execSync(`node "${VITE}" build`, { cwd: ROOT, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
    return { ok: true };
  } catch (err) {
    const msg = (err.stdout || '') + (err.stderr || '');
    // Extract file and error
    const fileMatch = msg.match(/([^\s]+\.jsx):(\d+):\d+: ERROR: (.+)/);
    if (fileMatch) {
      return { ok: false, file: fileMatch[1], line: parseInt(fileMatch[2]), error: fileMatch[3] };
    }
    return { ok: false, error: msg.substring(0, 500) };
  }
}

function fixMissingCloseDivs(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const missing = countDivBalance(content);
  
  if (missing <= 0) return false;
  
  const lines = content.split('\n');
  
  // Find the main component's return closing — look for ");" followed by "}"
  // and insert missing </div> before it
  for (let i = lines.length - 1; i >= 0; i--) {
    const trimmed = lines[i].trim();
    if (trimmed === ');' || trimmed === '  );') {
      // Insert missing closing divs before this line
      const indent = lines[i].match(/^(\s*)/)[1];
      const closeDivs = [];
      for (let j = 0; j < Math.min(missing, 8); j++) {
        const spaces = indent + '  '.repeat(missing - j);
        closeDivs.push(spaces + '</div>');
      }
      lines.splice(i, 0, ...closeDivs);
      fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
      console.log(`  → Added ${Math.min(missing, 8)} closing </div> before line ${i + 1}`);
      return true;
    }
  }
  return false;
}

function fixExcessCloseDivs(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const missing = countDivBalance(content);
  
  if (missing >= 0) return false; // Has excess, not missing
  
  const excess = -missing;
  const lines = content.split('\n');
  let removed = 0;
  
  // Remove excess </div> from the tail of the file
  for (let i = lines.length - 1; i >= 0 && removed < excess; i--) {
    const trimmed = lines[i].trim();
    if (trimmed === '</div>') {
      lines.splice(i, 1);
      removed++;
    } else if (trimmed === '' || trimmed === ');' || trimmed === '}') {
      continue;
    } else {
      break;
    }
  }
  
  if (removed > 0) {
    fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
    console.log(`  → Removed ${removed} excess </div> from tail`);
    return true;
  }
  return false;
}

// ─── Main Loop ───────────────────────────
console.log('═══ Iterative Build Fixer v2 ═══\n');

let iteration = 0;
let lastFile = '';
let sameFileCount = 0;

while (iteration < MAX_ITERATIONS) {
  iteration++;
  const result = tryBuild();
  
  if (result.ok) {
    console.log(`\n✅ BUILD SUCCEEDED on iteration ${iteration}!`);
    break;
  }
  
  if (!result.file) {
    console.log(`\n❌ Build failed with unknown error:\n${result.error}`);
    break;
  }
  
  // Prevent infinite loop on same file
  if (result.file === lastFile) {
    sameFileCount++;
    if (sameFileCount > 3) {
      console.log(`\n⚠️ Stuck on ${result.file} — skipping (manual fix needed)`);
      // Try to continue by making the file export a stub temporarily
      break;
    }
  } else {
    sameFileCount = 0;
  }
  lastFile = result.file;
  
  console.log(`[${iteration}] ${result.file}:${result.line} — ${result.error}`);
  
  const filePath = result.file.replace(/\//g, path.sep);
  if (!fs.existsSync(filePath)) {
    console.log(`  ⚠️ File not found: ${filePath}`);
    break;
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  const balance = countDivBalance(content);
  console.log(`  Balance: ${balance > 0 ? '+' + balance + ' missing closes' : balance < 0 ? Math.abs(balance) + ' excess closes' : 'balanced'}`);
  
  let fixed = false;
  if (balance > 0) {
    fixed = fixMissingCloseDivs(filePath);
  } else if (balance < 0) {
    fixed = fixExcessCloseDivs(filePath);
  }
  
  if (!fixed) {
    console.log(`  ⚠️ Could not auto-fix — manual intervention needed`);
    break;
  }
}

if (iteration >= MAX_ITERATIONS) {
  console.log(`\n⚠️ Reached max iterations (${MAX_ITERATIONS})`);
}
