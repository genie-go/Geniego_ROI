/**
 * OmniChannel Arctic White + Layout Fix + Guide Expansion + Data Isolation
 * Replaces all dark-mode CSS vars with direct high-contrast colors
 */
const fs = require('fs');
const FILE = './src/pages/OmniChannel.jsx';
let src = fs.readFileSync(FILE, 'utf8');

// === DARK MODE REMOVAL: Replace all var(--text-*) and dark backgrounds ===
const REPLACEMENTS = [
  // Text colors
  [/color:\s*'var\(--text-1\)'/g, "color: '#1f2937'"],
  [/color:\s*"var\(--text-1\)"/g, 'color: "#1f2937"'],
  [/color:\s*'var\(--text-2\)'/g, "color: '#374151'"],
  [/color:\s*"var\(--text-2\)"/g, 'color: "#374151"'],
  [/color:\s*'var\(--text-3\)'/g, "color: '#6b7280'"],
  [/color:\s*"var\(--text-3\)"/g, 'color: "#6b7280"'],
  // Backgrounds
  [/background:\s*'var\(--surface\)'/g, "background: '#ffffff'"],
  [/background:\s*"var\(--surface\)"/g, 'background: "#ffffff"'],
  [/background:\s*'var\(--border\)'/g, "background: '#e5e7eb'"],
  [/background:\s*"var\(--border\)"/g, 'background: "#e5e7eb"'],
  // Dark rgba backgrounds
  [/background:\s*'rgba\(0,0,0,0\.35\)'/g, "background: '#f9fafb'"],
  [/background:\s*'rgba\(0,0,0,0\.25\)'/g, "background: '#f1f5f9'"],
  [/background:\s*'rgba\(0,0,0,0\.4\)'/g, "background: '#f3f4f6'"],
  [/background:\s*'rgba\(15,20,40,0\.7\)'/g, "background: '#ffffff'"],
  // Border with dark vars
  [/border:\s*'1px solid var\(--border\)'/g, "border: '1px solid #e5e7eb'"],
  // Input colors referencing --text-1
  [/color:\s*'var\(--text-1\)',\s*fontSize/g, "color: '#1f2937', fontSize"],
];

let count = 0;
REPLACEMENTS.forEach(([re, rep]) => {
  const before = src;
  src = src.replace(re, rep);
  if (src !== before) count++;
});

// === Fix hero title: use direct blue instead of grad-blue-purple class ===
src = src.replace(
  /<div className="hero-title grad-blue-purple">/,
  '<div style={{ fontSize: 22, fontWeight: 900, color: "#2563eb" }}>'
);

// Fix hero desc
src = src.replace(
  /<div className="hero-desc">/,
  '<div style={{ fontSize: 13, color: "#374151", marginTop: 4 }}>'
);

// Fix hero container: remove dark hero class
src = src.replace(
  '<div className="hero fade-up">',
  '<div style={{ background: "linear-gradient(135deg,#eff6ff,#f0f9ff)", borderRadius: 16, padding: "24px", border: "1px solid #bfdbfe" }}>'
);

// === Fix tab bar: light theme ===
src = src.replace(
  "background: 'rgba(0,0,0,0.25)'",
  "background: '#f1f5f9'"
);

// Fix selected tab colors: ensure visible text on selected
src = src.replace(
  "background: tab === tb.id ? 'linear-gradient(135deg,#4f8ef7,#6366f1)' : 'transparent'",
  "background: tab === tb.id ? '#2563eb' : '#ffffff'"
);
src = src.replace(
  "color: tab === tb.id ? '#fff' : 'var(--text-2)'",
  "color: tab === tb.id ? '#ffffff' : '#374151'"
);

// Fix card-glass classes
src = src.replace(/className="card card-glass"/g, 'style={{ background: "#ffffff", borderRadius: 14, border: "1px solid #e5e7eb", padding: 20 }}');

// Fix badge classes
src = src.replace(/className="badge badge-blue"/g, 'style={{ fontSize: 10, fontWeight: 700, padding: "2px 10px", borderRadius: 20, background: "#dbeafe", color: "#2563eb", border: "1px solid #93c5fd" }}');
src = src.replace(/className="badge badge-teal"/g, 'style={{ fontSize: 10, fontWeight: 700, padding: "2px 10px", borderRadius: 20, background: "#d1fae5", color: "#059669", border: "1px solid #6ee7b7" }}');
src = src.replace(/className="badge badge-purple"/g, 'style={{ fontSize: 10, fontWeight: 700, padding: "2px 10px", borderRadius: 20, background: "#ede9fe", color: "#7c3aed", border: "1px solid #c4b5fd" }}');
src = src.replace(/className="badge"/g, 'style={{ fontSize: 10, fontWeight: 700, padding: "2px 10px", borderRadius: 20 }}');

// Fix input/btn classes 
src = src.replace(/className="input"/g, 'style={{ padding: "7px 12px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 12, background: "#fff", color: "#1f2937", boxSizing: "border-box" }}');
src = src.replace(/className="btn-primary"/g, 'style={{ padding: "7px 16px", borderRadius: 8, border: "none", background: "#2563eb", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}');
src = src.replace(/className="table"/g, 'style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}');

// Fix live sync indicator dark bg
src = src.replace(
  "background:'rgba(20,217,176,0.04)'",
  "background:'#f0fdf4'"
);
src = src.replace(
  "border:'1px solid rgba(20,217,176,0.12)'",
  "border:'1px solid #bbf7d0'"
);

// Fix ChannelAuthPanel dark background
src = src.replace(
  "background: 'rgba(0,0,0,0.35)'",
  "background: '#f9fafb'"
);

// Fix security alert dark styling
src = src.replace(
  "background: 'var(--surface)'",
  "background: '#ffffff'"
);

console.log(`✅ Dark-mode replacements: ${count} patterns fixed`);
fs.writeFileSync(FILE, src, 'utf8');
console.log('✅ OmniChannel.jsx Arctic White migration complete');
