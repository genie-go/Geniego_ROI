/**
 * UNDO the catastrophic "}} style={{" → ", " replacement
 * 
 * The problem: fix_styles3.cjs replaced ALL "}} style={{" with ", "
 * which broke cases where "}} " was the end of a JSX attribute expression
 * and "style={{" was the start of a new attribute.
 * 
 * For example: onClick={() => {}} style={{ color: "red" }}
 * became: onClick={() =>, color: "red" }}  ← BROKEN!
 * 
 * The fix: find patterns where ", " appears where "}} style={{" should be
 * and restore them.
 * 
 * Approach: Find every ", " that should be "}} style={{" by looking for
 * JSX lines where the brace count becomes negative
 */
const fs = require('fs');
const esbuild = require('esbuild');
const path = require('path');

const PAGES_DIR = './src/pages';
const files = fs.readdirSync(PAGES_DIR).filter(f => f.endsWith('.jsx'));

let totalReverted = 0;

for (const file of files) {
  const fp = path.join(PAGES_DIR, file);
  let src = fs.readFileSync(fp, 'utf8');
  let reverted = 0;
  
  // The replacement was: /\}\}\s*style=\{\{/g → ", "
  // So we replaced "}} style={{" with ", "
  // We need to find ", " that should be "}} style={{"
  //
  // Key insight: the replacement only happened inside JSX tags (between < and >)
  // When we see a sequence like: ...something}, value }}  — the closing }} was lost
  // 
  // Better approach: just find any line where replacing ", " back to "}} style={{" 
  // would fix the brace balance
  
  const lines = src.split(/\r?\n/);
  let changed = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Quick check: does this line have an unbalanced {} ?
    let depth = 0;
    let hasNegative = false;
    for (const ch of line) {
      if (ch === '{') depth++;
      if (ch === '}') depth--;
      if (depth < -1) { hasNegative = true; break; }
    }
    
    if (!hasNegative) continue;
    
    // This line has unbalanced braces — try to find where ", " should be "}} style={{"
    // Find each ", " and check if replacing it with "}} style={{" fixes the balance
    const commaPositions = [];
    let searchFrom = 0;
    while (true) {
      const idx = line.indexOf(', ', searchFrom);
      if (idx === -1) break;
      commaPositions.push(idx);
      searchFrom = idx + 2;
    }
    
    // Try each comma position (from right to left)
    for (let ci = commaPositions.length - 1; ci >= 0; ci--) {
      const pos = commaPositions[ci];
      const candidate = line.substring(0, pos) + '}} style={{' + line.substring(pos + 2);
      
      // Check if this fixes the brace balance
      let d = 0;
      let neg = false;
      for (const ch of candidate) {
        if (ch === '{') d++;
        if (ch === '}') d--;
        if (d < -1) { neg = true; break; }
      }
      
      if (!neg) {
        lines[i] = candidate;
        reverted++;
        changed = true;
        
        // Re-check this line (might need more fixes)
        i--;
        break;
      }
    }
  }
  
  if (changed) {
    fs.writeFileSync(fp, lines.join('\r\n'), 'utf8');
    console.log(`${file}: reverted ${reverted} replacements`);
    totalReverted += reverted;
  }
}

console.log(`\nTotal reverted: ${totalReverted}`);

// Verify all files
async function verify() {
  let ok = 0, fail = 0;
  for (const file of files) {
    const fp = path.join(PAGES_DIR, file);
    try {
      await esbuild.transform(fs.readFileSync(fp, 'utf8'), { loader: 'jsx' });
      ok++;
    } catch (e) {
      const m = e.message.match(/:(\d+):(\d+):.*?ERROR:\s*(.+)/);
      console.log(`❌ ${file}:${m ? m[1] : '?'} ${m ? m[3].slice(0, 50) : '?'}`);
      fail++;
    }
  }
  console.log(`\n✅ ${ok} files OK, ❌ ${fail} files failing`);
}

verify();
