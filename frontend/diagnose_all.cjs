/**
 * UNDO the bad "}} style={{" → ", " replacement from fix_styles3.cjs
 * This replacement was wrong because it broke: style={{ ...obj, key: val }} into style={{ ...obj key: val }}
 * 
 * The fix: Replace ", " back to "}} style={{" BUT only where the current content
 * has been incorrectly merged (where a comma replaced }} style={{)
 * 
 * Actually, it's safer to just find every line that has a broken style merge
 * and find where "} }}" needs to be "} }} style={{" 
 * 
 * MUCH SAFER: Just run esbuild on each file individually and only fix those that fail
 */
const fs = require('fs');
const esbuild = require('esbuild');
const path = require('path');

const PAGES_DIR = './src/pages';
const files = fs.readdirSync(PAGES_DIR).filter(f => f.endsWith('.jsx'));

async function check() {
  const failing = [];
  
  for (const file of files) {
    const fp = path.join(PAGES_DIR, file);
    const src = fs.readFileSync(fp, 'utf8');
    try {
      await esbuild.transform(src, { loader: 'jsx' });
    } catch (e) {
      const m = e.message.match(/:(\d+):(\d+):.*?ERROR:\s*(.+)/);
      failing.push({ file, line: m ? parseInt(m[1]) : 0, msg: m ? m[3] : '?', fp });
    }
  }
  
  console.log(`${failing.length} files failing:`);
  for (const f of failing) {
    console.log(`  ${f.file}:${f.line} ${f.msg.slice(0, 50)}`);
  }
  
  return failing;
}

// The core issue: "}} style={{" was replaced with ", " which breaks the JSX
// We need to find instances where ", " should be "}} style={{" and restore them
// 
// The pattern that was broken: 
// Before: style={{ A: 1, B: 2 }} onClick={...} style={{ C: 3 }}
// fix_styles3 first pass "}} style={{" → ", " changed:
// style={{ A: 1, B: 2, C: 3 }} onClick={...} — WRONG if the pattern wasn't adjacent
//
// Even worse: style={{ border: `1px solid ${color}33` }} style={{ ... }}
// became: style={{ border: `1px solid ${color}33`, ... }} — this is actually correct!
//
// The problem case: when }} inside template literal was matched:
// style={{ ...something, color: isX ? "red" : "blue" }} text style={{ ... }}
// The first }} matched is not the style closing

// Actually the simplest fix: just undo ALL changes to non-CatalogSync files
// and only keep CatalogSync changes

async function main() {
  const fails = await check();
  
  // For each failing file, we'll attempt a different fix:
  // Find lines with mismatched braces in style attributes
  for (const f of fails) {
    let src = fs.readFileSync(f.fp, 'utf8');
    const lines = src.split(/\r?\n/);
    
    // Find the error line and fix the specific issue
    const errLine = lines[f.line - 1];
    
    if (f.msg.includes('Expected "}"') && errLine) {
      // Usually means a ", " was inserted where "}} style={{" was
      // Find the position in the line where brace depth goes wrong
      let depth = 0;
      let lastGoodPos = 0;
      for (let i = 0; i < errLine.length; i++) {
        if (errLine[i] === '{') depth++;
        if (errLine[i] === '}') {
          depth--;
          if (depth < 0) {
            // Found the error position - there's a missing {{
            lastGoodPos = i;
            break;
          }
        }
      }
      console.log(`  ${f.file}:${f.line} depth issue at char ${lastGoodPos}`);
    }
  }
}

main();
