const fs=require('fs');
const FILE='./src/pages/CatalogSync.jsx';
let src=fs.readFileSync(FILE,'utf8');

// Find the line "/* ─── Tab: Usage Guide" and everything after it
const guideIdx=src.indexOf('/* ─── Tab: Usage Guide');
if(guideIdx===-1){console.log('ERROR: guide marker not found');process.exit(1);}

// Keep everything before the guide tab
const before=src.substring(0,guideIdx);

const newGuideAndMain=`/* ─── Tab: Usage Guide ─────────────────────────────────────────────────────── */
function UsageGuideTab() {
    const { t } = useI18n();
    const COLORS=['#4f8ef7','#22c55e','#f59e0b','#a855f7','#6366f1','#ec4899','#14b8a6','#ef4444','#8b5cf6','#10b981','#3b82f6','#e11d48','#06b6d4','#0ea5e9','#f97316'];
    const ICONS=['\\u{1F4DD}','\\u{1F4E1}','\\u{1F4B0}','\\u{1F504}','\\u{1F5C2}\\uFE0F','\\u{1F4E6}','\\u{1F4CB}','\\u23F0','\\u{1F510}','\\u{1F4CA}','\\u{1F9EA}','\\u2699\\uFE0F','\\u{1F6E1}\\uFE0F','\\u{1F4F1}','\\u{1F680}'];
    const steps=[];
    for(let i=1;i<=15;i++){const title=t('catalogSync.guideStep'+i+'Title','');if(title&&!title.includes('catalogSync.'))steps.push({title,desc:t('catalogSync.guideStep'+i+'Desc',''),icon:ICONS[i-1],color:COLORS[i-1]});}
    const tips=[];
    for(let i=1;i<=10;i++){const tip=t('catalogSync.guideTip'+i,'');if(tip&&!tip.includes('catalogSync.'))tips.push(tip);}

    return (
        <div style={{ display: "grid", gap: 18 }}>
            <div style={{ background: "linear-gradient(135deg,#fff7ed,#fef3c7)", borderRadius: 16, border: "1px solid #fed7aa", padding: "28px 24px", textAlign: "center" }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>\\u{1F4D6}</div>
                <div style={{ fontWeight: 700, fontSize: 20, color: "#2563eb", marginBottom: 6 }}>{t('catalogSync.guideTitle')}</div>
                <div style={{ fontSize: 12, color: "#374151", lineHeight: 1.6 }}>{t('catalogSync.guideOverviewDesc')}</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                {steps.map((s, i) => (
                    <div key={i} style={{ background: "#ffffff", borderRadius: 14, border: \\\`1px solid \\\${s.color}25\\\`, padding: 16 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                            <div style={{ width: 36, height: 36, borderRadius: 10, background: \\\`\\\${s.color}12\\\`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>{s.icon}</div>
                            <div>
                                <div style={{ fontSize: 10, color: "#6b7280", fontWeight: 700 }}>STEP {i+1}</div>
                                <div style={{ fontWeight: 700, fontSize: 13, color: s.color }}>{s.title}</div>
                            </div>
                        </div>
                        <div style={{ fontSize: 12, color: "#374151", lineHeight: 1.6 }}>{s.desc}</div>
                    </div>
                ))}
            </div>
            <div style={{ background: "#ffffff", borderRadius: 14, border: "1px solid rgba(245,158,11,0.2)", padding: 20 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: "#f59e0b", marginBottom: 12 }}>\\u{1F4A1} {t('catalogSync.guideTips')}</div>
                <div style={{ display: "grid", gap: 10 }}>
                    {tips.map((tip, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                            <span style={{ color: "#f59e0b", fontWeight: 700, fontSize: 12 }}>\\u2022</span>
                            <span style={{ fontSize: 12, color: "#374151", lineHeight: 1.6 }}>{tip}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
`;

console.log('Guide+Main section rebuilt');
fs.writeFileSync(FILE,before+newGuideAndMain,'utf8');
console.log('✅ Done');
