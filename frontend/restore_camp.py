import re

path = 'D:/project/GeniegoROI/frontend/src/pages/CampaignManager.jsx'

with open(path, 'r', encoding='utf-8') as f:
    text = f.read()

idx = text.find('{tab === "guide" && (')
if idx != -1:
    clean_tail = """{tab === "guide" && (
                    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
                        <div className="card card-glass" style={{ background:'linear-gradient(135deg,rgba(79,142,247,0.12),rgba(168,85,247,0.08))', borderColor:'rgba(79,142,247,0.3)', textAlign:'center', padding:32 }}>
                            <div style={{ fontSize:44 }}>📊</div>
                            <div style={{ fontWeight:900, fontSize:22, marginTop:8 }}>{t('campaignMgr.guideTitle')}</div>
                            <div style={{ fontSize:13, color:'var(--text-3)', marginTop:6, maxWidth:560, margin:'6px auto 0', lineHeight:1.7 }}>{t('campaignMgr.guideSub')}</div>
                        </div>
                        <div className="card card-glass" style={{ padding:20 }}>
                            <div style={{ fontWeight:800, fontSize:17, marginBottom:16 }}>{t('campaignMgr.guideStepsTitle')}</div>
                            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:14 }}>
                                {[{n:'1️⃣',k:'guideStep1',c:'#4f8ef7'},{n:'2️⃣',k:'guideStep2',c:'#22c55e'},{n:'3️⃣',k:'guideStep3',c:'#a855f7'},{n:'4️⃣',k:'guideStep4',c:'#f59e0b'},{n:'5️⃣',k:'guideStep5',c:'#f97316'},{n:'6️⃣',k:'guideStep6',c:'#06b6d4'}].map((s,i) => (
                                    <div key={i} style={{ background:s.c+'0a', border:`1px solid ${s.c}25`, borderRadius:12, padding:16 }}>
                                        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
                                            <span style={{ fontSize:20 }}>{s.n}</span>
                                            <span style={{ fontWeight:700, fontSize:14, color:s.c }}>{t(`campaignMgr.${s.k}Title`)}</span>
                                        </div>
                                        <div style={{ fontSize:12, color:'var(--text-3)', lineHeight:1.7 }}>{t(`campaignMgr.${s.k}Desc`)}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="card card-glass" style={{ padding:20 }}>
                            <div style={{ fontWeight:800, fontSize:17, marginBottom:16 }}>{t('campaignMgr.guideTabsTitle')}</div>
                            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', gap:12 }}>
                                {[{icon:'📣',k:'guideTabOverview',c:'#4f8ef7'},{icon:'🔬',k:'guideTabAnalytics',c:'#06b6d4'},{icon:'🧪',k:'guideTabAb',c:'#22c55e'},{icon:'🔍',k:'guideTabDetail',c:'#a855f7'},{icon:'📅',k:'guideTabGantt',c:'#f59e0b'},{icon:'📧',k:'guideTabCrm',c:'#f97316'},{icon:'📊',k:'guideTabRoi',c:'#06b6d4'},{icon:'📈',k:'guideTabMonitor',c:'#ec4899'},{icon:'🔔',k:'guideTabBudget',c:'#ef4444'},{icon:'💬',k:'guideTabCopy',c:'#8b5cf6'},{icon:'🧠',k:'guideTabAiEngine',c:'#f472b6'}].map((tb,i) => (
                                    <div key={i} style={{ display:'flex', gap:10, alignItems:'flex-start', padding:'10px 12px', background: 'var(--surface)', borderRadius:10, border:'1px solid rgba(99,140,255,0.08)' }}>
                                        <span style={{ fontSize:20, flexShrink:0 }}>{tb.icon}</span>
                                        <div>
                                            <div style={{ fontWeight:700, fontSize:12, color:tb.c }}>{t(`campaignMgr.${tb.k}Name`)}</div>
                                            <div style={{ fontSize:10, color:'var(--text-3)', marginTop:2, lineHeight:1.6 }}>{t(`campaignMgr.${tb.k}Desc`)}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="card card-glass" style={{ padding:20, background:'rgba(34,197,94,0.05)', borderColor:'rgba(34,197,94,0.3)' }}>
                            <div style={{ fontWeight:800, fontSize:17, marginBottom:12 }}>💡 {t('campaignMgr.guideTipsTitle')}</div>
                            <ul style={{ margin:0, padding:'0 0 0 18px', fontSize:13, color:'var(--text-3)', lineHeight:2.2 }}>
                                <li>{t('campaignMgr.guideTip1')}</li>
                                <li>{t('campaignMgr.guideTip2')}</li>
                                <li>{t('campaignMgr.guideTip3')}</li>
                                <li>{t('campaignMgr.guideTip4')}</li>
                                <li>{t('campaignMgr.guideTip5')}</li>
                            </ul>
                        </div>
                    </div>
                )}
                
                {tab === "ab_test" && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <div style={{ fontWeight: 700, fontSize: 15 }}>🧪 {t('campaignMgr.abTitle')}</div>
                                <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{t('campaignMgr.abSub')}</div>
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button onClick={() => navigate('/email-marketing')} style={{ padding: '7px 14px', borderRadius: 9, border: '1px solid rgba(99,102,241,0.2)', background: 'transparent', color: 'var(--text-2)', fontSize: 11, cursor: 'pointer' }}>📧 {t('campaignMgr.emailAb')} →</button>
                                <button onClick={() => navigate('/attribution')} style={{ padding: '7px 14px', borderRadius: 9, border: '1px solid rgba(99,102,241,0.2)', background: 'transparent', color: 'var(--text-2)', fontSize: 11, cursor: 'pointer' }}>📈 Attribution A/B →</button>
                            </div>
                        </div>
                        {abTestResults.length === 0 ? (
                            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>
                                {t('campaignMgr.abEmpty')}
                                <div style={{ marginTop: 16, display: 'flex', gap: 10, justifyContent: 'center' }}>
                                    <button onClick={() => navigate('/email-marketing')} style={{ padding: '9px 18px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#4f8ef7,#6366f1)', color: 'var(--text-1)', fontWeight: 700, cursor: 'pointer', fontSize: 12 }}>📧 {t('campaignMgr.startEmailAb')}</button>
                                    <button onClick={() => navigate('/attribution')} style={{ padding: '9px 18px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#a855f7,#7c3aed)', color: 'var(--text-1)', fontWeight: 700, cursor: 'pointer', fontSize: 12 }}>📈 Attribution A/B</button>
                                </div>
                            </div>
                        ) : (
                            abTestResults.map(test => (
                                <div key={test.id} className="card card-glass" style={{ padding: 16, borderLeft: '3px solid #22c55e' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div>
                                            <div style={{ fontWeight: 700, fontSize: 13 }}>{test.name}</div>
                                            <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2 }}>{t('campaignMgr.completed')}: {test.completedAt} · {t('campaignMgr.source')}: {test.source}</div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontWeight: 900, color: '#22c55e', fontSize: 14 }}>🏆 {test.winner?.toUpperCase()} {t('campaignMgr.winner')}</div>
                                            <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2 }}>{t('campaignMgr.confidence')} {test.confidence}% (p={test.pValue})</div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
"""
    new_text = text[:idx] + clean_tail
    
    with open(path, 'w', encoding='utf-8') as f:
        f.write(new_text)
    print("CampaignManager ending fixed!")
else:
    print("tab guide not found!")
