const fs = require('fs');

// th/vi/id/zh-TW files have orphan pricingDetail/cmpRow/cmpVal blocks
// that were inserted as object properties but aren't inside any containing object.
// These look like:
//   },
//   cmpRow: {
//     ...
//   },
//   cmpVal: {
//     ...
//   },
// };     <- closes orphan container that was removed

// Strategy: find the FIRST occurrence of "  cmpRow:" or "  pricingDetail:" or "  cmpVal:"
// that is not inside a proper containing assignment,
// then remove from there to the matching closing "};", and also remove the orphan closing "};".

const FIXES = [
  { fp: 'src/i18n/locales/th.js', v: 'th', mi: 'อีก {{count}} รายการ' },
  { fp: 'src/i18n/locales/vi.js', v: 'vi', mi: '+ {{count}} mục khác' },
  { fp: 'src/i18n/locales/id.js', v: 'id', mi: '+ {{count}} lainnya' },
  { fp: 'src/i18n/locales/zh-TW.js', v: 'zhTW', mi: '另外 {{count}} 項' },
];

for (const { fp, v, mi } of FIXES) {
  let c = fs.readFileSync(fp, 'utf8');
  
  // Find the first orphan block start
  // Look for pattern where "  pricingDetail:" or "  cmpRow:" appears right after a line ending with "},"
  // These are indented keys not preceded by a proper containing assignment
  
  // Simpler: find all lines, identify a block starting with "  pricingDetail:" or "  cmpRow:" or "  cmpVal:"
  // that appears after the last proper Object.assign or assignment statement
  
  const lines = c.split('\n');
  
  // Find first orphan line index (lines starting with 2 spaces + keyword)
  let orphanStart = -1;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (l.match(/^  (pricingDetail|cmpRow|cmpVal)\s*:/)) {
      // Check if this is inside an assignment (prev non-empty line should be something = {)
      orphanStart = i;
      break;
    }
  }
  
  if (orphanStart < 0) {
    console.log(`${v}: No orphan block found`);
    // Try syntax check
    try { delete require.cache[require.resolve('./' + fp)]; require('./' + fp); console.log(`${v}: OK`); }
    catch(e) { console.log(`${v} ERROR: ${e.message.slice(0,60)}`); }
    continue;
  }
  
  // Find where this orphan block ends: walk back from orphanStart to find the "},\n" or something before it
  // and forward to find the closing "}"
  
  // Walk backwards to find start of orphan section (look for line that's "},")
  let sectionStart = orphanStart;
  for (let i = orphanStart - 1; i >= 0; i--) {
    const l = lines[i].trim();
    if (l === '},' || l === '' || l.match(/^\/\//)) {
      sectionStart = i + 1;
    } else {
      break;
    }
  }
  
  // Walk forward from orphanStart to find the "}" that closes the orphan container 
  // (which itself has no parent - it's a "}" at column 0 or "};")
  let sectionEnd = orphanStart;
  let depth = 0;
  for (let i = orphanStart; i < lines.length; i++) {
    const l = lines[i];
    for (const ch of l) {
      if (ch === '{') depth++;
      else if (ch === '}') depth--;
    }
    sectionEnd = i;
    // After processing all nested blocks, if we're back at depth 0 and hit a "};", stop
    if (depth <= 0 && (l.trim() === '};' || l.trim() === '}')) {
      break;
    }
  }
  
  console.log(`${v}: orphan at lines ${sectionStart}-${sectionEnd} (out of ${lines.length})`);
  console.log(`  Start: ${lines[sectionStart].slice(0,60)}`);
  console.log(`  End: ${lines[sectionEnd].slice(0,60)}`);
  
  // Remove the orphan section
  const newLines = [...lines.slice(0, sectionStart), ...lines.slice(sectionEnd + 1)];
  c = newLines.join('\n');
  
  // Ensure moreItems is set
  if (!c.includes(`${v}.pricing.moreItems`)) {
    const expMatch = `\nexport default ${v};\n`;
    c = c.replace(expMatch, `\n${v}.pricing = ${v}.pricing || {}; ${v}.pricing.moreItems = "${mi}";\n${expMatch}`);
  }
  
  fs.writeFileSync(fp, c, 'utf8');
  
  try { delete require.cache[require.resolve('./' + fp)]; require('./' + fp); console.log(`  ✓ ${v}: OK`); }
  catch(e) { console.log(`  ✗ ${v} ERROR: ${e.message.slice(0,80)}`); }
}
