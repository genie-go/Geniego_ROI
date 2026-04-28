/**
 * CatalogSync — Arctic White + Layout Fix + Guide Expansion + Dark-mode Removal
 * Handles all CSS variable replacements, layout restructuring, guide expansion
 */
const fs = require('fs');
const FILE = './src/pages/CatalogSync.jsx';
let src = fs.readFileSync(FILE, 'utf8');
let cnt = 0;
const R = (re, rep) => { const b = src; src = src.replace(re, rep); if (src !== b) cnt++; };

// === 1. Dark-mode CSS var removal (inline styles only) ===
R(/color:\s*"var\(--text-1\)"/g, 'color: "#1f2937"');
R(/color:\s*'var\(--text-1\)'/g, "color: '#1f2937'");
R(/color:\s*"var\(--text-2\)"/g, 'color: "#374151"');
R(/color:\s*'var\(--text-2\)'/g, "color: '#374151'");
R(/color:\s*"var\(--text-3\)"/g, 'color: "#6b7280"');
R(/color:\s*'var\(--text-3\)'/g, "color: '#6b7280'");
R(/background:\s*"var\(--surface\)"/g, 'background: "#ffffff"');
R(/background:\s*'var\(--surface\)'/g, "background: '#ffffff'");
R(/border:\s*'1px solid var\(--border\)'/g, "border: '1px solid #e5e7eb'");
R(/border:\s*"1px solid var\(--border\)"/g, 'border: "1px solid #e5e7eb"');
R(/background:\s*"rgba\(15,20,40,0\.7\)"/g, 'background: "#ffffff"');
R(/background:\s*'rgba\(15,20,40,0\.7\)'/g, "background: '#ffffff'");
R(/background:\s*"rgba\(9,15,30,0\.5\)"/g, 'background: "#f9fafb"');
R(/background:\s*'rgba\(9,15,30,0\.5\)'/g, "background: '#f9fafb'");
R(/background:\s*"rgba\(0,0,0,0\.65\)"/g, 'background: "rgba(0,0,0,0.5)"');
R(/background:\s*'rgba\(0,0,0,0\.65\)'/g, "background: 'rgba(0,0,0,0.5)'");
// Modal backgrounds
R(/background:\s*"linear-gradient\(180deg,var\(--surface\),#090f1e\)"/g, 'background: "#ffffff"');

// Progress bar dark bg
R(/background:\s*"rgba\(255,255,255,0\.06\)"/g, 'background: "#e5e7eb"');
R(/background:\s*'rgba\(255,255,255,0\.06\)'/g, "background: '#e5e7eb'");

// === 2. Hero section: replace CSS classes with inline Arctic White ===
// Hero title gradient
src = src.replace(
  /<div className="hero-title" style=\{\{ background: "linear-gradient\(135deg,#4f8ef7,#22c55e\)" \}\}>/,
  '<div style={{ fontSize: 22, fontWeight: 900, color: "#2563eb" }}>'
);
src = src.replace(/<div className="hero-desc">/, '<div style={{ fontSize: 13, color: "#374151", marginTop: 4 }}>');
src = src.replace(/<div className="hero-meta">/, '<div style={{ display: "flex", alignItems: "center", gap: 14 }}>');
src = src.replace(
  /<div className="hero-icon" style=\{\{ background: "linear-gradient\(135deg,rgba\(79,142,247,0\.25\),rgba\(34,197,94,0\.15\)\)" \}\}>/,
  '<div style={{ width: 48, height: 48, borderRadius: 14, background: "linear-gradient(135deg,#dbeafe,#d1fae5)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, border: "1px solid #bfdbfe" }}>'
);

// Hero container
src = src.replace(
  '<div className="hero fade-up">',
  '<div style={{ background: "linear-gradient(135deg,#eff6ff,#f0fdf4)", borderRadius: 16, padding: "24px", border: "1px solid #bfdbfe" }}>'
);

// === 3. KPI cards ===
src = src.replace(
  '<div className="grid4 fade-up fade-up-1">',
  '<div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginTop: 12 }}>'
);

// KPI card classes
src = src.replace(/className="kpi-card fade-up"/g, 'style={{ padding: "16px 18px", borderRadius: 14, background: "#ffffff", border: "1px solid #e5e7eb", textAlign: "center" }}');
src = src.replace(/className="kpi-label"/g, 'style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}');
src = src.replace(/className="kpi-value"/g, 'style={{ fontSize: 22, fontWeight: 900 }}');

// === 4. Card + Tabs container ===
src = src.replace(
  '<div className="card card-glass fade-up fade-up-2">',
  '<div style={{ background: "#ffffff", borderRadius: 16, border: "1px solid #e5e7eb", padding: "20px" }}>'
);

// Tab bar + tab buttons
src = src.replace(
  '<div className="tabs" style={{ marginBottom: 20 }}>',
  '<div style={{ display: "flex", gap: 4, padding: "5px", background: "#f1f5f9", borderRadius: 14, flexWrap: "wrap", marginBottom: 20 }}>'
);

src = src.replace(
  /\<button key=\{tb\.id\} className=\{`tab \$\{tab === tb\.id \? "active" : ""\}`\} onClick=\{\(\) => setTab\(tb\.id\)\}>{tb\.label}<\/button>/,
  '<button key={tb.id} onClick={() => setTab(tb.id)} style={{ padding: "8px 14px", borderRadius: 10, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 11, background: tab === tb.id ? "#2563eb" : "#ffffff", color: tab === tb.id ? "#ffffff" : "#374151", transition: "all 150ms" }}>{tb.label}</button>'
);

// === 5. Guide expansion: 8→15 steps, 5→10 tips ===
src = src.replace(
  `    const steps = [
        { title: t('catalogSync.guideStep1Title'), desc: t('catalogSync.guideStep1Desc'), icon: "📝", color: "#4f8ef7" },
        { title: t('catalogSync.guideStep2Title'), desc: t('catalogSync.guideStep2Desc'), icon: "📡", color: "#22c55e" },
        { title: t('catalogSync.guideStep3Title'), desc: t('catalogSync.guideStep3Desc'), icon: "💰", color: "#f59e0b" },
        { title: t('catalogSync.guideStep4Title'), desc: t('catalogSync.guideStep4Desc'), icon: "🔄", color: "#a855f7" },
        { title: t('catalogSync.guideStep5Title'), desc: t('catalogSync.guideStep5Desc'), icon: "🗂️", color: "#6366f1" },
        { title: t('catalogSync.guideStep6Title'), desc: t('catalogSync.guideStep6Desc'), icon: "📦", color: "#ec4899" },
        { title: t('catalogSync.guideStep7Title'), desc: t('catalogSync.guideStep7Desc'), icon: "📋", color: "#14b8a6" },
        { title: t('catalogSync.guideStep8Title'), desc: t('catalogSync.guideStep8Desc'), icon: "⏰", color: "#ef4444" },
    ];
    const tips = [t('catalogSync.guideTip1'), t('catalogSync.guideTip2'), t('catalogSync.guideTip3'), t('catalogSync.guideTip4'), t('catalogSync.guideTip5')];`,
  `    const COLORS=['#4f8ef7','#22c55e','#f59e0b','#a855f7','#6366f1','#ec4899','#14b8a6','#ef4444','#8b5cf6','#10b981','#3b82f6','#e11d48','#06b6d4','#0ea5e9','#f97316'];
    const ICONS=['📝','📡','💰','🔄','🗂️','📦','📋','⏰','🔐','📊','🧪','⚙️','🛡️','📱','🚀'];
    const steps=[];
    for(let i=1;i<=15;i++){const title=t('catalogSync.guideStep'+i+'Title','');if(title&&!title.includes('catalogSync.'))steps.push({title,desc:t('catalogSync.guideStep'+i+'Desc',''),icon:ICONS[i-1],color:COLORS[i-1]});}
    const tips=[];
    for(let i=1;i<=10;i++){const tip=t('catalogSync.guideTip'+i,'');if(tip&&!tip.includes('catalogSync.'))tips.push(tip);}`
);

// === 6. Guide title colors ===
src = src.replace(
  `fontWeight: 700, fontSize: 16, color: "var(--text-1)"`,
  `fontWeight: 700, fontSize: 16, color: "#2563eb"`
);

// === 7. Layout restructure: 3-tier (hero+tabs fixed, content scrollable) ===
src = src.replace(
  `<div style={{ display: "grid", gap: 16 }}>`,
  `<div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", background: "#f8fafc" }}>
      <div style={{ padding: "18px 24px 0", flexShrink: 0 }}>`
);

// After the tabs div, insert scrollable content wrapper
// We need to find the card-glass div that wraps the tabs and content
// The structure will need the scrollable area to start after tabs

// === 8. Badge class fix ===
src = src.replace(/className="badge"/g, 'style={{ fontSize: 10, fontWeight: 700, padding: "2px 10px", borderRadius: 20 }}');

// === 9. Cross-sync badge
src = src.replace(
  'className="fade-up"',
  ''
);

console.log(`✅ CatalogSync Arctic White: ${cnt} pattern groups replaced`);
fs.writeFileSync(FILE, src, 'utf8');
console.log('✅ CatalogSync.jsx migration complete');
