const fs = require('fs');
const path = require('path');
const LOCALE_DIR = path.join(__dirname, 'src', 'i18n', 'locales');

['ko','en','ja','zh','zh-TW','de','th','vi','id'].forEach(lang => {
  const fp = path.join(LOCALE_DIR, lang + '.js');
  let c = fs.readFileSync(fp, 'utf-8');
  
  // Check if pages.performance exists
  const pagesIdx = c.indexOf('"pages"');
  if (pagesIdx < 0) { console.log(`[${lang}] No pages namespace - skip`); return; }
  
  // Find if "performance" exists anywhere
  const perfIdx = c.indexOf('"performance"');
  if (perfIdx < 0) { console.log(`[${lang}] No performance block at all - skip`); return; }
  
  // Extract the performance block content
  const ob = c.indexOf('{', perfIdx);
  let d = 0, cp = -1;
  for (let i = ob; i < c.length; i++) {
    if (c[i] === '{') d++;
    if (c[i] === '}') { d--; if (d === 0) { cp = i; break; } }
  }
  const perfBlock = c.slice(perfIdx, cp + 1); // "performance": {...}
  
  // Check if performance is inside pages
  const pagesOb = c.indexOf('{', pagesIdx);
  let pd = 0, pcp = -1;
  for (let i = pagesOb; i < c.length; i++) {
    if (c[i] === '{') pd++;
    if (c[i] === '}') { pd--; if (pd === 0) { pcp = i; break; } }
  }
  
  const isInsidePages = perfIdx > pagesOb && perfIdx < pcp;
  
  if (!isInsidePages) {
    console.log(`[${lang}] performance is OUTSIDE pages (at ${perfIdx}, pages: ${pagesOb}-${pcp})`);
    
    // Remove the orphaned performance block
    // Find start (look back for comma)
    let start = perfIdx;
    let j = start - 1;
    while (j >= 0 && /[\s,]/.test(c[j])) j--;
    start = j + 1;
    let end = cp + 1;
    // Check for trailing comma
    let after = end;
    while (after < c.length && /\s/.test(c[after])) after++;
    if (c[after] === ',') after++;
    
    // Remove it from current position
    c = c.slice(0, start) + c.slice(after);
    
    // Recalculate pages closing brace
    const newPagesOb = c.indexOf('{', c.indexOf('"pages"'));
    let npd = 0, npcp = -1;
    for (let i = newPagesOb; i < c.length; i++) {
      if (c[i] === '{') npd++;
      if (c[i] === '}') { npd--; if (npd === 0) { npcp = i; break; } }
    }
    
    // Insert performance block inside pages, before closing brace
    c = c.slice(0, npcp) + ',' + perfBlock + c.slice(npcp);
    
    fs.writeFileSync(fp, c, 'utf-8');
    console.log(`  [FIXED] Moved performance inside pages`);
  } else {
    console.log(`[${lang}] performance is inside pages - OK`);
  }
});
