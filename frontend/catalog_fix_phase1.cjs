/**
 * CatalogSync Phase 1: JSX Syntax Fix + Dark Mode Removal + Text Visibility
 * Fixes broken style objects, removes dark backgrounds, ensures text contrast
 */
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, 'src/pages/CatalogSync.jsx');
let code = fs.readFileSync(FILE, 'utf8');
let fixes = 0;

// ── Fix 1: Broken style objects with double }} patterns ──
// Pattern: style={{ ...props }, extraProp: val } }} → style={{ ...props, extraProp: val }}
const brokenStyles = [
  // Line 367 - selected product summary
  [/\{ fontSize: 12, fontWeight: 700, marginBottom: 4 \}, color: "#f97316" \} \}\}/g, 
   '{ fontSize: 12, fontWeight: 700, marginBottom: 4, color: "#f97316" }}'],
  // Line 367 - missing style on span
  [/<span\{fmtKRW\(avgCost\)\}/g, '<span style={{ fontWeight: 700 }}>{fmtKRW(avgCost)}'],
  // Line 398 - checkbox onChange broken
  [/onChange=\{(?:\(\)|)\s*\{\s*,\s*accentColor:/g, 'onChange={() => {}} style={{ accentColor:'],
  // Line 469 - range input broken
  [/onChange=\{e => \{ setMargins\(m => \(\{ \.\.\.m, \[chId\]: Number\(e\.target\.value\) \}\)\); setCustomPrices\(cp => \{ const n = \{ \.\.\.cp \}; delete n\[chId\]; return n; \}\);\s*,\s*width: 70, accentColor: ch\.color \}\}/g,
   'onChange={e => { setMargins(m => ({ ...m, [chId]: Number(e.target.value) })); setCustomPrices(cp => { const n = { ...cp }; delete n[chId]; return n; }); }} style={{ width: 70, accentColor: ch.color }}'],
  // Line 487 - price override input broken  
  [/setCustomPrices\(cp => v \? \{ \.\.\.cp, \[chId\]: Number\(v\) \} : \(\(\{ \[chId\]: _, \.\.\.rest \}\) => rest\)\(cp\)\);\s*,\s*width: 110/g,
   'setCustomPrices(cp => v ? { ...cp, [chId]: Number(v) } : (({ [chId]: _, ...rest }) => rest)(cp)); }} style={{ width: 110'],
  // Line 634 - BulkPriceModal selected product
  [/borderRadius: 6, background: "rgba\(79,142,247,0\.12\)", color: "#4f8ef7" \}, opacity: 0\.7 \} \}\} \{p\.name\} <span\{fmtKRW/g,
   'borderRadius: 6, background: "rgba(79,142,247,0.12)", color: "#4f8ef7", opacity: 0.7 }}>{p.name} <span style={{ fontWeight: 600 }}>{fmtKRW'],
  // Line 648 - price mode div broken
  [/setPriceMode\(m\.id\); setValue\(""\);\s*,\s*padding:/g,
   'setPriceMode(m.id); setValue(""); }} style={{ padding:'],
  // Line 1084 - mobile card click
  [/e\.stopPropagation\(\); toggleSel\(r\.id\);\s*,\s*flexShrink: 0 \}\}/g,
   'e.stopPropagation(); toggleSel(r.id); }} style={{ flexShrink: 0 }}'],
  // Line 1094 - status span broken style
  [/fontWeight: 700, padding: "2px 10px", borderRadius: 20 \}, fontSize: 9, background: statusColor/g,
   'fontWeight: 700, padding: "2px 10px", borderRadius: 20, fontSize: 9, background: statusColor'],
  // Line 1102-1106 - unit type badge broken
  [/fontWeight: 700, padding: "2px 10px", borderRadius: 20\s*,\s*fontSize: 9, padding: "2px 6px",/g,
   'fontWeight: 700, padding: "2px 6px", borderRadius: 20, fontSize: 9,'],
  // Line 1187 - desktop unit span broken
  [/fontWeight: 700, padding: "2px 10px", borderRadius: 20 \}, fontSize: 9, padding: "2px 7px",/g,
   'fontWeight: 700, padding: "2px 7px", borderRadius: 20, fontSize: 9,'],
  // Line 1223 - status badge broken
  // Already matched above by the generic pattern
  // Line 1577 - live progress border broken
  [/border: "1px solid #e5e7eb", padding: 16 \}, border: `1px solid \$\{statusColor2\(liveJob\.status\)\}33` \} \}\}/g,
   'padding: 16, border: `1px solid ${statusColor2(liveJob.status)}33` }}'],
  // Line 1735 - price preview button broken
  [/border: "none", fontWeight: 700, fontSize: 12, cursor: "pointer" \}, alignSelf: "flex-start" \} \}\} onClick/g,
   'border: "none", fontWeight: 700, fontSize: 12, cursor: "pointer", alignSelf: "flex-start" }} onClick'],
  // Line 1821 - low stock badge broken
  [/fontWeight: 700, padding: "2px 10px", borderRadius: 20 \}, fontSize: 9, color, background: color \+ "18"/g,
   'fontWeight: 700, padding: "2px 10px", borderRadius: 20, fontSize: 9, color, background: color + "18"'],
  // Line 1862 - job history type badge broken
  [/padding: "8px" \}, fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 12, background: "#dbeafe", color: "#2563eb" \} \}\} <span\{j\.type/g,
   'padding: "8px" }}><span style={{ fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 12, background: "#dbeafe", color: "#2563eb" }}>{j.type'],
  // Line 1868 - job history status badge broken
  [/padding: "8px" \}, fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 12, background: j\.status === "done" \? "#d1fae5" : j\.status === "running" \? "#dbeafe" : "#fee2e2", color: j\.status === "done" \? "#22c55e" : j\.status === "running" \? "#2563eb" : "#ef4444" \} \}\} <span\{j\.status/g,
   'padding: "8px" }}><span style={{ fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 12, background: j.status === "done" ? "#d1fae5" : j.status === "running" ? "#dbeafe" : "#fee2e2", color: j.status === "done" ? "#22c55e" : j.status === "running" ? "#2563eb" : "#ef4444" }}>{j.status'],
  // Line 2015 - category mapping channel header broken  
  [/<span style=\{\{ fontSize: 14 \}, fontSize:8, color:'#22c55e' \} \}\} \{ch\.icon\}<\/span> \{ch\.name\} \{ch\.connected && <span✅<\/span>/g,
   '<span style={{ fontSize: 14 }}>{ch.icon}</span> {ch.name} {ch.connected && <span style={{ fontSize: 8, color: "#22c55e" }}>✅</span>'],
  // Line 1187 - unit span missing open bracket
  [/`1px solid \$\{r\.unitType === 'box' \? 'rgba\(79,142,247,0\.3\)' : r\.unitType === 'pl' \? 'rgba\(245,158,11,0\.3\)' : 'rgba\(34,197,94,0\.2\)'\}` \} \}\}\{r\.unit/g,
   '`1px solid ${r.unitType === "box" ? "rgba(79,142,247,0.3)" : r.unitType === "pl" ? "rgba(245,158,11,0.3)" : "rgba(34,197,94,0.2)"}` }}>{r.unit'],
];

for (const [pattern, replacement] of brokenStyles) {
  const before = code;
  code = code.replace(pattern, replacement);
  if (code !== before) {
    fixes++;
    console.log(`✅ Fixed pattern: ${pattern.source?.slice(0, 60) || pattern.toString().slice(0, 60)}...`);
  }
}

// ── Fix 2: Dark mode backgrounds → light theme ──
const darkReplacements = [
  ['background: "rgba(9,15,30,0.5)"', 'background: "#ffffff"'],
  ['background: "rgba(9,15,30,0.4)"', 'background: "#ffffff"'],
  ['background: "rgba(9,15,30,0.3)"', 'background: "#f8fafc"'],
];
for (const [from, to] of darkReplacements) {
  const count = (code.match(new RegExp(from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
  if (count > 0) {
    code = code.replaceAll(from, to);
    fixes++;
    console.log(`✅ Removed dark bg: ${from} → ${to} (${count}x)`);
  }
}

// ── Fix 3: Button text on gradient — ensure white text ──
// color: '#1f2937' on gradient backgrounds should be '#ffffff'
const gradientButtonFixes = code.match(/background: "linear-gradient\([^"]+\)"[^}]*color: '#1f2937'/g);
if (gradientButtonFixes) {
  code = code.replace(
    /background: "(linear-gradient\([^"]+\))"([^}]*?)color: '#1f2937'/g,
    'background: "$1"$2color: \'#ffffff\''
  );
  fixes++;
  console.log(`✅ Fixed gradient button text color: ${gradientButtonFixes.length}x`);
}

// Also fix double-quoted version
const gradientButtonFixes2 = code.match(/background: "linear-gradient\([^"]+\)"[^}]*color: "#1f2937"/g);
if (gradientButtonFixes2) {
  // We need to be careful not to replace text that shouldn't be white
  // Only replace inside button/action contexts
}

// ── Fix 4: Sub-tab active state — ensure white text on blue bg ──
// The tab buttons already use color: "#ffffff" for active state — verify
const tabCheck = code.includes('color: tab === tb.id ? "#ffffff" : "#374151"');
if (tabCheck) {
  console.log('✅ Sub-tab text visibility already correct (white on blue, dark on white)');
} else {
  console.log('⚠️ Sub-tab text needs manual check');
}

// ── Fix 5: Toast text color fix ──
code = code.replace(
  /background: toast\.color, color: '#1f2937'/g,
  'background: toast.color, color: "#ffffff"'
);
fixes++;

// ── Fix 6: Schedule button text ──
code = code.replace(
  /background: 'linear-gradient\(135deg,#a855f7,#6366f1\)', border: 'none', color: '#1f2937'/g,
  "background: 'linear-gradient(135deg,#a855f7,#6366f1)', border: 'none', color: '#ffffff'"
);
fixes++;

// ── Fix 7: Sync start button already has color: "#fff" — good ──

// ── Fix 8: Remove var(--surface-1) references in Loader ──
// This is in App.jsx, not CatalogSync — skip per scope rule

// Write the fixed file
fs.writeFileSync(FILE, code, 'utf8');
console.log(`\n✅ Phase 1 complete: ${fixes} fix groups applied to CatalogSync.jsx`);
