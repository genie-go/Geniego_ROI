/**
 * CatalogSync surgical line-by-line fixer
 * Fixes remaining broken JSX syntax on specific lines
 */
const fs = require('fs');
const P = require('path').join(__dirname, 'src/pages/CatalogSync.jsx');
let lines = fs.readFileSync(P, 'utf8').split('\n');
let f = 0;
function fix(n, from, to) {
  const i = n - 1;
  if (lines[i] && lines[i].includes(from)) {
    lines[i] = lines[i].replace(from, to);
    f++;
    console.log(`✅ L${n} fixed`);
  } else {
    console.log(`⚠️ L${n} pattern not found`);
  }
}

// L397: dark bg in label
fix(397, 'background: selChs.has(c.id) ? `${c.color}08` : "rgba(9,15,30,0.5)"',
         'background: selChs.has(c.id) ? `${c.color}08` : "#ffffff"');

// L398: broken onChange + style
fix(398, 'onChange={() => { ,  accentColor: c.color }}',
         'onChange={() => {}} style={{ accentColor: c.color }}');

// L469-470: range input — check current state
const l469 = lines[468];
if (l469 && l469.includes('}} style={{ width: 70')) {
  console.log('✅ L469 already fixed');
} else if (l469) {
  // Try a different approach
  lines[468] = lines[468]
    .replace(/setCustomPrices\(cp => \{ const n = \{ \.\.\.cp \}; delete n\[chId\]; return n; \}\);\s*\}\}\s*style=\{\{\s*width: 70, accentColor: ch\.color\s*\}\}/,
      'setCustomPrices(cp => { const n = { ...cp }; delete n[chId]; return n; }); }} style={{ width: 70, accentColor: ch.color }}');
  console.log('✅ L469 re-fixed');
  f++;
}

// L487: price override input
const l487 = lines[486];
if (l487 && l487.includes('}); }} style={{ width: 110')) {
  console.log('✅ L487 already fixed');  
} else if (l487 && l487.includes('style={{ width: 110')) {
  console.log('✅ L487 looks ok');
} else {
  console.log('⚠️ L487 needs manual check:', l487?.slice(0,80));
}

// L634: BulkPriceModal selected product span
const l634 = lines[633];
if (l634 && l634.includes('opacity: 0.7 }}>{p.name}')) {
  console.log('✅ L634 already fixed');
} else if (l634) {
  console.log('⚠️ L634:', l634.slice(0,80));
}

// L648: price mode div
const l648 = lines[647];
if (l648 && l648.includes('}} style={{ padding:')) {
  console.log('✅ L648 already fixed');
}

// L668: duplicate style attribute on input
fix(668, 'style={{ paddingLeft: 28, fontSize: 14, fontWeight: 700 }}',
         'style={{ width: "100%", padding: "6px 10px 6px 28px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", color: "#1f2937", fontSize: 14, fontWeight: 700 }}');
// Also remove the first style attribute
fix(663, 'style={{ width: "100%", padding: "6px 10px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", color: "#1f2937", fontSize: 12 }}',
         '');

// L1053: button text color on gradient  
fix(1053, "color: '#ffffff'", "color: '#ffffff'"); // verify

// L1526: dark bg in sync mode selector
fix(1526, 'background: mode === m.k ? "rgba(79,142,247,0.06)" : "rgba(9,15,30,0.4)"',
         'background: mode === m.k ? "rgba(79,142,247,0.06)" : "#ffffff"');

// L1446: schedule save button text color
fix(1446, "color: '#ffffff'", "color: '#ffffff'"); // verify it was fixed

// L1577: live progress panel - check
const l1577 = lines[1576];
if (l1577 && l1577.includes('padding: 16, border: `1px solid')) {
  console.log('✅ L1577 already fixed');
}

// L1665-1769: PriceSyncTab has nested flex layout issue - fix
fix(1666, 'display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", background: "#f8fafc"',
         'display: "grid", gap: 16');

// Remove the extra wrapper divs in PriceSyncTab
fix(1667, '      <div style={{ padding: "18px 24px 0", flexShrink: 0 }}>',
         '');
fix(1769, '      </div>',
         '');
fix(1770, '      </div>',
         '');

fs.writeFileSync(P, lines.join('\n'), 'utf8');
console.log(`\nDone: ${f} fixes applied`);
