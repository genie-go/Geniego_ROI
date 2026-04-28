const fs = require('fs');
const fp = require('path').join(__dirname, 'src/pages/EmailMarketing.jsx');
let c = fs.readFileSync(fp, 'utf8');

// 1. Add guide tab
c = c.replace(
  `{ id: "settings", label: t('crm.email.tabSettings') || "Settings", icon: "⚙️" },`,
  `{ id: "settings", label: t('crm.email.tabSettings') || "Settings", icon: "⚙️" },
        { id: "guide", label: t('crm.email.tabGuide') || "Guide", icon: "📖" },`
);

// 2. Add guide rendering
const guideJSX = `
            {tab === "guide" && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <div style={{ background: 'linear-gradient(135deg,rgba(79,142,247,0.12),rgba(167,139,250,0.08))', border: '1px solid rgba(79,142,247,0.3)', borderRadius: 14, textAlign: 'center', padding: 32 }}>
                        <div style={{ fontSize: 44 }}>\u{1F4E7}</div>
                        <div style={{ fontWeight: 900, fontSize: 22, marginTop: 8 }}>{t('crm.email.guideTitle')}</div>
                        <div style={{ fontSize: 13, color: C.muted, marginTop: 6, maxWidth: 600, margin: '6px auto 0', lineHeight: 1.7 }}>{t('crm.email.guideSub')}</div>
                    </div>
                    <Card glow>
                        <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 16 }}>{t('crm.email.guideStepsTitle')}</div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 14 }}>
                            {[{n:'1\uFE0F\u20E3',k:'guideStep1',c:'#4f8ef7'},{n:'2\uFE0F\u20E3',k:'guideStep2',c:'#22c55e'},{n:'3\uFE0F\u20E3',k:'guideStep3',c:'#a78bfa'},{n:'4\uFE0F\u20E3',k:'guideStep4',c:'#f97316'},{n:'5\uFE0F\u20E3',k:'guideStep5',c:'#06b6d4'},{n:'6\uFE0F\u20E3',k:'guideStep6',c:'#f472b6'}].map((s,i) => (
                                <div key={i} style={{ background: s.c+'0a', border: \`1px solid \${s.c}25\`, borderRadius: 12, padding: 16 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                                        <span style={{ fontSize: 20 }}>{s.n}</span>
                                        <span style={{ fontWeight: 700, fontSize: 14, color: s.c }}>{t(\`crm.email.\${s.k}Title\`)}</span>
                                    </div>
                                    <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.7 }}>{t(\`crm.email.\${s.k}Desc\`)}</div>
                                </div>
                            ))}
                        </div>
                    </Card>
                    <Card glow>
                        <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 16 }}>{t('crm.email.guideTabsTitle')}</div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 12 }}>
                            {[{icon:'\u{1F680}',k:'guideCamp',c:'#4f8ef7'},{icon:'\u{1F4DD}',k:'guideTpl',c:'#a78bfa'},{icon:'\u{1F4CA}',k:'guideAnalytics',c:'#22c55e'},{icon:'\u2699\uFE0F',k:'guideSet',c:'#f97316'}].map((tb,i) => (
                                <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '10px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: 10, border: '1px solid rgba(99,140,255,0.08)' }}>
                                    <span style={{ fontSize: 20, flexShrink: 0 }}>{tb.icon}</span>
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: 12, color: tb.c }}>{t(\`crm.email.\${tb.k}Name\`)}</div>
                                        <div style={{ fontSize: 10, color: C.muted, marginTop: 2, lineHeight: 1.6 }}>{t(\`crm.email.\${tb.k}Desc\`)}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                    <div style={{ background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 14, padding: 20 }}>
                        <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 12 }}>\u{1F4A1} {t('crm.email.guideTipsTitle')}</div>
                        <ul style={{ margin: 0, padding: '0 0 0 18px', fontSize: 13, color: C.muted, lineHeight: 2.2 }}>
                            <li>{t('crm.email.guideTip1')}</li>
                            <li>{t('crm.email.guideTip2')}</li>
                            <li>{t('crm.email.guideTip3')}</li>
                            <li>{t('crm.email.guideTip4')}</li>
                            <li>{t('crm.email.guideTip5')}</li>
                        </ul>
                    </div>
                </div>
            )}`;

c = c.replace(
  '{tab === "settings" && <SettingsTab />}',
  '{tab === "settings" && <SettingsTab />}' + guideJSX
);

fs.writeFileSync(fp, c, 'utf8');
console.log('✅ Email Marketing guide tab added');
