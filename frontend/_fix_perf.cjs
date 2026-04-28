const fs = require('fs');
const path = require('path');
const LOCALE_DIR = path.join(__dirname, 'src', 'i18n', 'locales');

['ko','en','ja','zh','zh-TW','de','th','vi','id'].forEach(lang => {
  const fp = path.join(LOCALE_DIR, lang + '.js');
  if (!fs.existsSync(fp)) return;
  let c = fs.readFileSync(fp, 'utf-8');
  
  // Find ALL "performance" occurrences
  const allIdx = [];
  let searchFrom = 0;
  while (true) {
    const idx = c.indexOf('"performance"', searchFrom);
    if (idx < 0) break;
    allIdx.push(idx);
    searchFrom = idx + 1;
  }
  
  if (allIdx.length <= 1) { console.log(`[${lang}] Only ${allIdx.length} performance block - skip`); return; }
  
  console.log(`[${lang}] Found ${allIdx.length} performance blocks at: ${allIdx.join(', ')}`);
  
  // Extract all keys from ALL blocks, merge them (first occurrence wins for values)
  const allKeys = {};
  const blocks = [];
  
  for (const idx of allIdx) {
    const ob = c.indexOf('{', idx);
    let d = 0, cp = -1;
    for (let i = ob; i < c.length; i++) {
      if (c[i] === '{') d++;
      if (c[i] === '}') { d--; if (d === 0) { cp = i; break; } }
    }
    if (cp < 0) continue;
    const block = c.slice(ob, cp + 1);
    blocks.push({ idx, ob, cp, block });
    
    // Parse keys from this block
    try {
      const obj = JSON.parse(block);
      for (const [k, v] of Object.entries(obj)) {
        if (!allKeys[k]) allKeys[k] = v; // First occurrence wins (our injected keys)
      }
    } catch (e) {
      console.log(`  Block at ${idx}: parse error, trying regex`);
      const rx = /"([^"]+)"\s*:\s*"((?:[^"\\]|\\.)*)"/g;
      let m;
      while ((m = rx.exec(block)) !== null) {
        if (!allKeys[m[1]]) allKeys[m[1]] = m[2];
      }
    }
  }
  
  console.log(`  Merged keys: ${Object.keys(allKeys).length}`);
  
  // Build merged JSON block
  const mergedBlock = JSON.stringify(allKeys);
  
  // Remove all but the LAST performance block, replace it with merged
  // Work backwards to preserve indices
  for (let i = blocks.length - 1; i >= 0; i--) {
    const b = blocks[i];
    if (i === blocks.length - 1) {
      // Replace the last block with merged content
      c = c.slice(0, b.ob) + mergedBlock + c.slice(b.cp + 1);
    } else {
      // Remove this entire "performance": {...} entry
      // Find the start including "performance":
      let start = b.idx;
      // Look backwards for comma
      let j = start - 1;
      while (j >= 0 && (c[j] === ' ' || c[j] === '\n' || c[j] === '\r' || c[j] === ',')) j--;
      if (c[j + 1] === ',' || c.slice(j + 1, start).includes(',')) {
        start = j + 1;
      }
      const end = b.cp + 1;
      // Check for trailing comma
      let after = end;
      while (after < c.length && (c[after] === ' ' || c[after] === '\n' || c[after] === '\r')) after++;
      if (c[after] === ',') after++;
      
      c = c.slice(0, start) + c.slice(after);
    }
  }
  
  fs.writeFileSync(fp, c, 'utf-8');
  console.log(`  [OK] ${lang}.js: merged ${blocks.length} blocks into 1 (${Object.keys(allKeys).length} keys)`);
});
