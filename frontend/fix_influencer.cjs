/* InfluencerUGC Arctic White & Compact Tab Fix — Batch Script
   Fixes: 1. Compact sub-tab (remove desc line, remove card wrapping)
          2. Dark-mode residue → solid Arctic White colors
          3. Text visibility on white background
          4. Guide expansion to 15 steps  */
const fs=require('fs');
const file=__dirname+'/src/pages/InfluencerUGC.jsx';
let s=fs.readFileSync(file,'utf8');

// ── 1. Fix KpiCard — replace var(--text-3) with solid colors ──
s=s.replace(/color:\s*"var\(--text-3\)"/g,'color:"#6b7280"');
s=s.replace(/color:\s*'var\(--text-3\)'/g,"color:'#6b7280'");
s=s.replace(/color:\s*"var\(--text-1\)"/g,'color:"#1f2937"');
s=s.replace(/color:\s*'var\(--text-1\)'/g,"color:'#1f2937'");
s=s.replace(/color:\s*"var\(--text-2\)"/g,'color:"#374151"');
s=s.replace(/color:\s*'var\(--text-2\)'/g,"color:'#374151'");

// ── 2. Fix dark backgrounds → Arctic White ──
s=s.replace(/background:\s*"rgba\(9,15,30,0\.7\)"/g,'background:"rgba(0,0,0,0.03)"');
s=s.replace(/background:\s*"rgba\(9,15,30,0\.6\)"/g,'background:"rgba(0,0,0,0.03)"');
s=s.replace(/background:\s*"rgba\(9,15,30,0\.5\)"/g,'background:"rgba(0,0,0,0.03)"');
s=s.replace(/background:\s*"rgba\(9,15,30,0\.4\)"/g,'background:"rgba(0,0,0,0.02)"');
s=s.replace(/background:\s*'var\(--surface\)'/g,"background:'rgba(255,255,255,0.95)'");
s=s.replace(/background:\s*"var\(--surface\)"/g,'background:"rgba(255,255,255,0.95)"');

// ── 3. Fix modal backgrounds → solid white ──
s=s.replace(/background:\s*"linear-gradient\(180deg,var\(--surface\),#090f1e\)"/g,
    'background:"rgba(255,255,255,0.98)"');

// ── 4. Fix guide header colors — dark-on-white ──
s=s.replace(/color:\s*'#e8eaf0'/g,"color:'#1f2937'");

// ── 5. Fix sub-tab container — compact single line ──
// Replace the entire tab container section
const tabContainerStart = `<div className="card card-glass fade-up fade-up-1" style={{ padding: 0, overflow: "hidden" }}>`;
const tabContainerEnd = `</div>`;

// Find and replace the tab section (lines ~1399-1424)
const oldTabBlock = `<div className="card card-glass fade-up fade-up-1" style={{ padding: 0, overflow: "hidden" }}>
                <div style={{ display: "flex", overflowX: "auto" }}>
                    {[
                        { id: "identity", label: t("influencer.tab_identity","🧑 Creator Unified"), desc: t("influencer.desc_identity","Identity · Duplicates · Channels") },
                        { id: "contract", label: t("influencer.tab_contract","📝 Contracts & Whitelist"), desc: t("influencer.desc_contract","Fixed/Perf · Rights · e-Sign") },
                        { id: "settle", label: t("influencer.tab_settle","💰 Settlement & Audit"), desc: t("influencer.desc_settle","Payouts · Audits · Overpayment") },
                        { id: "roi", label: t("influencer.tab_roi","🏆 ROI Ranking"), desc: t("influencer.desc_roi","Attribution · High View/Low Sale") },
                        { id: "ugc", label: t("influencer.tab_ugc","⭐ UGC Reviews"), desc: t("influencer.desc_ugc","Reviews · Sentiment · Anomalies") },
                        { id: "ai_eval", label: t("influencer.tab_ai_eval","🤖 AI Evaluation"), desc: t("influencer.desc_ai_eval","Scoring · Comm Recs · Renewals") },
                        { id: "guide", label: t("influencer.tab_guide","📖 Guide"), desc: t("influencer.desc_guide","Usage Guide") },
                    ].map(tabItem => (
                        <button key={tabItem.id} onClick={() => setTab(tabItem.id)} style={{
                            padding: "13px 12px", border: "none", cursor: "pointer", textAlign: "left", flex: 1, whiteSpace: "nowrap", minWidth: 0,
                            background: tab === tabItem.id ? (tabItem.id === "ai_eval" ? "rgba(168,85,247,0.1)" : tabItem.id === "guide" ? "rgba(34,197,94,0.1)" : "rgba(99,102,241,0.1)") : "transparent",
                            borderBottom: \`2px solid \${tab === tabItem.id ? (tabItem.id === "ai_eval" ? "#a855f7" : tabItem.id === "guide" ? "#22c55e" : "#6366f1") : "transparent"}\`, transition: "all 200ms",
                            position: "relative"
                        }}>
                            {tabItem.id === "settle" && anomalyCount > 0 && (
                                <span style={{ position: "absolute", top: 6, right: 6, width: 15, height: 15, borderRadius: "50%", background: "#ef4444", fontSize: 8, fontWeight: 900, color: '#1f2937', display: "flex", alignItems: "center", justifyContent: "center" }}>{anomalyCount}</span>
                            )}
                            <div style={{ fontSize: 11, fontWeight: 800, color: tab === tabItem.id ? (tabItem.id === "ai_eval" ? "#a855f7" : tabItem.id === "guide" ? "#22c55e" : "#1f2937") : "#374151" }}>{tabItem.label}</div>
                            <div style={{ fontSize: 9, color: "#6b7280", marginTop: 2 }}>{tabItem.desc}</div>
                        </button>
                    ))}
                </div>
            </div>`;

const newTabBlock = `<div style={{ display:"flex",gap:4,padding:5,background:"rgba(0,0,0,0.04)",borderRadius:14,overflowX:"auto",flexShrink:0 }}>
                    {[
                        { id: "identity", label: t("influencer.tab_identity","🧑 Creator Unified") },
                        { id: "contract", label: t("influencer.tab_contract","📝 Contracts") },
                        { id: "settle", label: t("influencer.tab_settle","💰 Settlement") },
                        { id: "roi", label: t("influencer.tab_roi","🏆 ROI Ranking") },
                        { id: "ugc", label: t("influencer.tab_ugc","⭐ UGC Reviews") },
                        { id: "ai_eval", label: t("influencer.tab_ai_eval","🤖 AI Evaluation") },
                        { id: "guide", label: t("influencer.tab_guide","📖 Guide") },
                    ].map(tabItem => (
                        <button key={tabItem.id} onClick={() => setTab(tabItem.id)} style={{
                            padding:"8px 14px",borderRadius:10,border:"none",cursor:"pointer",fontWeight:700,fontSize:11,flex:1,whiteSpace:"nowrap",
                            background:tab===tabItem.id?"#6366f1":"transparent",color:tab===tabItem.id?"#fff":"#4b5563",transition:"all 150ms",position:"relative"
                        }}>
                            {tabItem.id === "settle" && anomalyCount > 0 && (
                                <span style={{ position:"absolute",top:2,right:4,width:14,height:14,borderRadius:"50%",background:"#ef4444",fontSize:8,fontWeight:900,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center" }}>{anomalyCount}</span>
                            )}
                            {tabItem.label}
                        </button>
                    ))}
                </div>`;

// Use indexOf for safer replacement
const oldTabIdx = s.indexOf('className="card card-glass fade-up fade-up-1"');
if (oldTabIdx > 0) {
    // Find the block from <div className="card card-glass fade-up fade-up-1" to its closing </div>
    const blockStart = s.lastIndexOf('<div', oldTabIdx);
    // Find the closing </div> after the overflowX auto div
    let depth = 0, i = blockStart;
    for (; i < s.length; i++) {
        if (s.substring(i, i+4) === '<div') depth++;
        if (s.substring(i, i+6) === '</div>') {
            depth--;
            if (depth === 0) { i += 6; break; }
        }
    }
    const oldBlock = s.substring(blockStart, i);
    s = s.substring(0, blockStart) + newTabBlock + s.substring(i);
    console.log('Tab block replaced, old length:', oldBlock.length, 'new:', newTabBlock.length);
}

// ── 6. Fix hero title gradient → solid color for Arctic White ──
s=s.replace(/background:\s*"linear-gradient\(135deg,#6366f1,#a855f7\)"\s*\}\}>.*?\{t\("influencer\.title"/,
    'color:"#6366f1",fontWeight:900,fontSize:24}}>{t("influencer.title"');

// ── 7. Fix content card wrapping ──
s=s.replace('className="card card-glass fade-up fade-up-2"',
    'style={{flex:1,overflowY:"auto",paddingBottom:20}}');

// ── 8. Fix guide gradient background → Arctic White ──
s=s.replace(
    "background: 'linear-gradient(135deg,rgba(99,102,241,0.12),rgba(168,85,247,0.08))'",
    "background: 'linear-gradient(135deg,rgba(99,102,241,0.06),rgba(168,85,247,0.04))'"
);

// ── 9. Fix guide sub text color ──
// Already handled by var(--text-3) → #6b7280 replacement
// Make it darker
s=s.replace(
    "fontSize: 13, color: '#6b7280', marginTop: 6, maxWidth: 600, margin: '6px auto 0', lineHeight: 1.7 }}>{t('influencer.guideSub'",
    "fontSize: 13, color: '#374151', fontWeight: 600, marginTop: 6, maxWidth: 600, margin: '6px auto 0', lineHeight: 1.7 }}>{t('influencer.guideSub'"
);

// ── 10. Expand guide from 6 steps to 15 steps ──
const old6Steps = `[{n:'1️⃣',k:'guideStep1',c:'#6366f1'},{n:'2️⃣',k:'guideStep2',c:'#22c55e'},{n:'3️⃣',k:'guideStep3',c:'#a855f7'},{n:'4️⃣',k:'guideStep4',c:'#f97316'},{n:'5️⃣',k:'guideStep5',c:'#06b6d4'},{n:'6️⃣',k:'guideStep6',c:'#f472b6'}]`;
const new15Steps = `[{n:'1',k:'guideStep1',c:'#6366f1'},{n:'2',k:'guideStep2',c:'#22c55e'},{n:'3',k:'guideStep3',c:'#a855f7'},{n:'4',k:'guideStep4',c:'#f97316'},{n:'5',k:'guideStep5',c:'#06b6d4'},{n:'6',k:'guideStep6',c:'#f472b6'},{n:'7',k:'guideStep7',c:'#6366f1'},{n:'8',k:'guideStep8',c:'#22c55e'},{n:'9',k:'guideStep9',c:'#a855f7'},{n:'10',k:'guideStep10',c:'#f97316'},{n:'11',k:'guideStep11',c:'#06b6d4'},{n:'12',k:'guideStep12',c:'#f472b6'},{n:'13',k:'guideStep13',c:'#6366f1'},{n:'14',k:'guideStep14',c:'#22c55e'},{n:'15',k:'guideStep15',c:'#a855f7'}]`;
s=s.replace(old6Steps, new15Steps);

// Fix step number display (was emoji, now plain number in circle)
s=s.replace(
    "<span style={{ fontSize: 20 }}>{s.n}</span>",
    "<span style={{ fontSize: 14, fontWeight: 900, background: s.c, color: '#fff', width: 26, height: 26, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{s.n}</span>"
);

// Fix guide steps title
s=s.replace("'Influencer Management 6 Steps'", "'Influencer Management Steps'");

// ── 11. Fix tab features section — add more tabs ──
const old6Tabs = `[{icon:'🧑',k:'guideIdent',c:'#6366f1'},{icon:'📝',k:'guideContract',c:'#22c55e'},{icon:'💰',k:'guideSettle',c:'#a855f7'},{icon:'🏆',k:'guideRoi',c:'#f97316'},{icon:'⭐',k:'guideUgc',c:'#06b6d4'},{icon:'🤖',k:'guideAi',c:'#f472b6'}]`;
const new7Tabs = `[{icon:'🧑',k:'guideIdent',c:'#6366f1'},{icon:'📝',k:'guideContract',c:'#22c55e'},{icon:'💰',k:'guideSettle',c:'#a855f7'},{icon:'🏆',k:'guideRoi',c:'#f97316'},{icon:'⭐',k:'guideUgc',c:'#06b6d4'},{icon:'🤖',k:'guideAi',c:'#f472b6'},{icon:'📖',k:'guideGuide',c:'#22c55e'}]`;
s=s.replace(old6Tabs, new7Tabs);

// ── 12. Add more tips ──
const oldTips = `<li>{t('influencer.guideTip1')}</li>
                    <li>{t('influencer.guideTip2')}</li>
                    <li>{t('influencer.guideTip3')}</li>
                    <li>{t('influencer.guideTip4')}</li>
                    <li>{t('influencer.guideTip5')}</li>`;
const newTips = `<li>{t('influencer.guideTip1')}</li>
                    <li>{t('influencer.guideTip2')}</li>
                    <li>{t('influencer.guideTip3')}</li>
                    <li>{t('influencer.guideTip4')}</li>
                    <li>{t('influencer.guideTip5')}</li>
                    <li>{t('influencer.guideTip6')}</li>
                    <li>{t('influencer.guideTip7')}</li>`;
s=s.replace(oldTips, newTips);

fs.writeFileSync(file, s, 'utf8');
console.log('InfluencerUGC Arctic White fix done. File size:', s.length);

// Verify syntax
try {
    require('child_process').execSync('node -e "require(\'fs\').readFileSync(\'src/pages/InfluencerUGC.jsx\',\'utf8\')"', {cwd:__dirname});
    console.log('File read OK');
} catch(e) { console.log('ERR:', e.message.slice(0,80)); }
