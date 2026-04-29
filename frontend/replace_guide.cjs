// Replace guide tab in AutoMarketing.jsx
const fs = require('fs');
const fp = 'd:\\project\\GeniegoROI\\frontend\\src\\pages\\AutoMarketing.jsx';
let src = fs.readFileSync(fp, 'utf8');

// Find the guide tab section
const startMarker = '{/* ══ TAB: GUIDE';
const endMarker = '{/* ══ TAB: CREATIVE STUDIO';

const startIdx = src.indexOf(startMarker);
if (startIdx < 0) { console.log('START not found'); process.exit(1); }

const endIdx = src.indexOf(endMarker);
if (endIdx < 0) { console.log('END not found'); process.exit(1); }

console.log(`Found guide section: ${startIdx} to ${endIdx}`);

const newGuide = `{/* ══ TAB: GUIDE — 15-Step Complete Guide ═══════════════════════════ */}
            {tab === "guide" && (
                <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
                    <div style={{ ...cardStyle, background:'linear-gradient(135deg,rgba(79,142,247,0.12),rgba(168,85,247,0.08))', borderColor:'rgba(79,142,247,0.3)', textAlign:'center', padding:32 }}>
                        <div style={{ fontSize:44 }}>🤖</div>
                        <div style={{ fontWeight:900, fontSize:22, marginTop:8, color:'#1e293b' }}>{t('marketing.guideTitle')}</div>
                        <div style={{ fontSize:13, color:'#64748b', marginTop:6, maxWidth:600, margin:'6px auto 0', lineHeight:1.7 }}>{t('marketing.guideSub')}</div>
                        <button onClick={() => setTab('setup')} style={{ marginTop:16, padding:'12px 28px', borderRadius:12, border:'none', cursor:'pointer', background:'linear-gradient(135deg,#4f8ef7,#a855f7)', color:'#fff', fontWeight:800, fontSize:14 }}>{t('marketing.guideStartBtn')}</button>
                    </div>
                    <div style={cardStyle}>
                        <div style={{ fontWeight:800, fontSize:17, marginBottom:6, color:'#1e293b' }}>{t('marketing.guideFullTitle','📋 시작부터 마무리까지 — 완전 가이드')}</div>
                        <div style={{ fontSize:12, color:'#64748b', marginBottom:18, lineHeight:1.6 }}>{t('marketing.guideFullSub','AI 마케팅 자동화 플랫폼의 전체 워크플로우를 단계별로 안내합니다.')}</div>
                        {[
                          {phase:'A',phaseKey:'guidePhaseA',phaseDefault:'Phase A — 시작 준비',phaseIcon:'🚀',phaseColor:'#4f8ef7',steps:[{n:'1',k:'gf1',c:'#4f8ef7',icon:'🔐'},{n:'2',k:'gf2',c:'#6366f1',icon:'🔗'},{n:'3',k:'gf3',c:'#8b5cf6',icon:'📊'}]},
                          {phase:'B',phaseKey:'guidePhaseB',phaseDefault:'Phase B — 캠페인 설계',phaseIcon:'⚙️',phaseColor:'#a855f7',steps:[{n:'4',k:'gf4',c:'#a855f7',icon:'💰'},{n:'5',k:'gf5',c:'#c026d3',icon:'🏷️'},{n:'6',k:'gf6',c:'#d946ef',icon:'📡'},{n:'7',k:'gf7',c:'#e879f9',icon:'🎯'}]},
                          {phase:'C',phaseKey:'guidePhaseC',phaseDefault:'Phase C — AI 전략 & 소재 생성',phaseIcon:'🤖',phaseColor:'#22c55e',steps:[{n:'8',k:'gf8',c:'#22c55e',icon:'🤖'},{n:'9',k:'gf9',c:'#16a34a',icon:'🎨'},{n:'10',k:'gf10',c:'#15803d',icon:'👁️'}]},
                          {phase:'D',phaseKey:'guidePhaseD',phaseDefault:'Phase D — 실행 & 모니터링',phaseIcon:'📈',phaseColor:'#f97316',steps:[{n:'11',k:'gf11',c:'#f97316',icon:'✅'},{n:'12',k:'gf12',c:'#ea580c',icon:'📊'}]},
                          {phase:'E',phaseKey:'guidePhaseE',phaseDefault:'Phase E — 최적화 & 마무리',phaseIcon:'🏆',phaseColor:'#06b6d4',steps:[{n:'13',k:'gf13',c:'#06b6d4',icon:'🔄'},{n:'14',k:'gf14',c:'#0891b2',icon:'📋'},{n:'15',k:'gf15',c:'#0e7490',icon:'🏆'}]},
                        ].map((ph,pi) => (
                          <div key={pi} style={{ marginBottom:20 }}>
                            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12, padding:'8px 14px', borderRadius:10, background:\`linear-gradient(135deg,\${ph.phaseColor}14,\${ph.phaseColor}06)\` }}>
                              <span style={{ fontSize:16 }}>{ph.phaseIcon}</span>
                              <span style={{ fontWeight:800, fontSize:14, color:ph.phaseColor }}>{t(\`marketing.\${ph.phaseKey}\`, ph.phaseDefault)}</span>
                            </div>
                            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:12 }}>
                              {ph.steps.map((s,si) => (
                                <div key={si} style={{ background:s.c+'08', border:\`1px solid \${s.c}20\`, borderRadius:12, padding:16 }}>
                                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                                    <span style={{ width:28, height:28, borderRadius:8, background:s.c, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:800, flexShrink:0 }}>{s.n}</span>
                                    <span style={{ fontSize:15 }}>{s.icon}</span>
                                    <span style={{ fontWeight:700, fontSize:13, color:s.c }}>{t(\`marketing.\${s.k}Title\`)}</span>
                                  </div>
                                  <div style={{ fontSize:12, color:'#64748b', lineHeight:1.7 }}>{t(\`marketing.\${s.k}Desc\`)}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                    </div>
                    <div style={cardStyle}>
                        <div style={{ fontWeight:800, fontSize:17, marginBottom:16, color:'#1e293b' }}>{t('marketing.guideTabsTitle')}</div>
                        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))', gap:12 }}>
                            {[{icon:'🎨',k:'guideTabCreative',c:'#06b6d4'},{icon:'⚙',k:'guideTabSetup',c:'#a855f7'},{icon:'🤖',k:'guideTabPreview',c:'#4f8ef7'},{icon:'📖',k:'guideTabGuide',c:'#6366f1'}].map((tb,i) => (
                                <div key={i} style={{ display:'flex', gap:12, alignItems:'flex-start', padding:'12px 14px', background:'rgba(241,245,249,0.7)', borderRadius:10, border:'1px solid rgba(99,140,255,0.08)' }}>
                                    <span style={{ fontSize:22, flexShrink:0 }}>{tb.icon}</span>
                                    <div>
                                        <div style={{ fontWeight:700, fontSize:13, color:tb.c }}>{t(\`marketing.\${tb.k}Name\`)}</div>
                                        <div style={{ fontSize:11, color:'#64748b', marginTop:3, lineHeight:1.6 }}>{t(\`marketing.\${tb.k}Desc\`)}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div style={{ ...cardStyle, background:'rgba(34,197,94,0.05)', borderColor:'rgba(34,197,94,0.3)' }}>
                        <div style={{ fontWeight:800, fontSize:17, marginBottom:12, color:'#1e293b' }}>💡 {t('marketing.guideTipsTitle')}</div>
                        <ul style={{ margin:0, padding:'0 0 0 18px', fontSize:13, color:'#64748b', lineHeight:2.2 }}>
                            <li>{t('marketing.guideTip1')}</li>
                            <li>{t('marketing.guideTip2')}</li>
                            <li>{t('marketing.guideTip3')}</li>
                            <li>{t('marketing.guideTip4')}</li>
                            <li>{t('marketing.guideTip5')}</li>
                            <li>{t('marketing.guideTip6','AI 추천 채널과 직접 선택 채널을 비교하여 최적 조합을 찾으세요.')}</li>
                            <li>{t('marketing.guideTip7','캠페인 실행 전 반드시 관리자 승인을 거치면 예산 초과를 방지할 수 있습니다.')}</li>
                        </ul>
                    </div>
                </div>
            )}

            `;

src = src.substring(0, startIdx) + newGuide + src.substring(endIdx);
fs.writeFileSync(fp, src, 'utf8');
console.log('✅ Guide tab replaced successfully');
