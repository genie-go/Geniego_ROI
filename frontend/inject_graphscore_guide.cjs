const fs = require('fs');
const fp = require('path').join(__dirname, 'src/pages/GraphScore.jsx');
let c = fs.readFileSync(fp, 'utf8');

const guideJSX = `                {tab === "guide" && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                        <div style={{ background: 'linear-gradient(135deg,rgba(168,85,247,0.12),rgba(6,182,212,0.08))', border: '1px solid rgba(168,85,247,0.3)', borderRadius: 14, textAlign: 'center', padding: 32 }}>
                            <div style={{ fontSize: 44 }}>\u{1F578}\uFE0F</div>
                            <div style={{ fontWeight: 900, fontSize: 22, marginTop: 8 }}>{t('graphScore.guideTitle')}</div>
                            <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 6, maxWidth: 600, margin: '6px auto 0', lineHeight: 1.7 }}>{t('graphScore.guideSub')}</div>
                        </div>
                        <div style={{ padding: 20 }}>
                            <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 16 }}>{t('graphScore.guideStepsTitle')}</div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 14 }}>
                                {[{n:'1\uFE0F\u20E3',k:'guideStep1',c:'#a855f7'},{n:'2\uFE0F\u20E3',k:'guideStep2',c:'#06b6d4'},{n:'3\uFE0F\u20E3',k:'guideStep3',c:'#f97316'},{n:'4\uFE0F\u20E3',k:'guideStep4',c:'#22c55e'},{n:'5\uFE0F\u20E3',k:'guideStep5',c:'#4f8ef7'},{n:'6\uFE0F\u20E3',k:'guideStep6',c:'#f472b6'}].map((s,i) => (
                                    <div key={i} style={{ background: s.c+'0a', border: \`1px solid \${s.c}25\`, borderRadius: 12, padding: 16 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                                            <span style={{ fontSize: 20 }}>{s.n}</span>
                                            <span style={{ fontWeight: 700, fontSize: 14, color: s.c }}>{t(\`graphScore.\${s.k}Title\`)}</span>
                                        </div>
                                        <div style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.7 }}>{t(\`graphScore.\${s.k}Desc\`)}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div style={{ padding: 20 }}>
                            <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 16 }}>{t('graphScore.guideTabsTitle')}</div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 12 }}>
                                {[{icon:'\u{1F4CA}',k:'guideSummary',c:'#a855f7'},{icon:'\u{1F50D}',k:'guideBrowser',c:'#06b6d4'},{icon:'\u{1F91D}',k:'guideInfluencer',c:'#f97316'},{icon:'\u{1F4E6}',k:'guideSku',c:'#22c55e'}].map((tb,i) => (
                                    <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '10px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: 10, border: '1px solid rgba(99,140,255,0.08)' }}>
                                        <span style={{ fontSize: 20, flexShrink: 0 }}>{tb.icon}</span>
                                        <div>
                                            <div style={{ fontWeight: 700, fontSize: 12, color: tb.c }}>{t(\`graphScore.\${tb.k}Name\`)}</div>
                                            <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2, lineHeight: 1.6 }}>{t(\`graphScore.\${tb.k}Desc\`)}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div style={{ padding: 20, background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 14 }}>
                            <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 12 }}>\u{1F4A1} {t('graphScore.guideTipsTitle')}</div>
                            <ul style={{ margin: 0, padding: '0 0 0 18px', fontSize: 13, color: 'var(--text-3)', lineHeight: 2.2 }}>
                                <li>{t('graphScore.guideTip1')}</li>
                                <li>{t('graphScore.guideTip2')}</li>
                                <li>{t('graphScore.guideTip3')}</li>
                                <li>{t('graphScore.guideTip4')}</li>
                                <li>{t('graphScore.guideTip5')}</li>
                            </ul>
                        </div>
                    </div>
                )}`;

const target = '{tab === "sku" && <SkuScoreTab />}';
if (c.includes(target)) {
  c = c.replace(target, target + '\r\n' + guideJSX);
  fs.writeFileSync(fp, c, 'utf8');
  console.log('✅ Guide tab rendering added to GraphScore.jsx');
} else {
  console.log('❌ Target not found');
}
