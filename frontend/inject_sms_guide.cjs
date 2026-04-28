const fs = require('fs');
const fp = require('path').join(__dirname, 'src/pages/SmsMarketing.jsx');
let c = fs.readFileSync(fp, 'utf8');

// 1. Fix mock stats - use real API values only
c = c.replace(
  "const stats = settings?.stats || { sent: 324, delivered: 318, failed: 6 };",
  "const stats = settings?.stats || { sent: 0, delivered: 0, failed: 0 };"
);

// 2. Fix hardcoded mock values in stats tab
c = c.replace(
  "{ l: 'Budget 잔여', c: '#eab308', v: '₩270,000' }",
  "{ l: 'Budget 잔여', c: '#eab308', v: settings?.balance ? `₩${Number(settings.balance).toLocaleString()}` : '₩0' }"
);

// 3. Add guide tab to TABS
c = c.replace(
  "{ id: 'settings', label: '⚙️ 인증 Settings' },",
  "{ id: 'settings', label: '⚙️ 인증 Settings' },\n    { id: 'guide', label: '📖 가이드' },"
);

// 4. Add guide rendering after settings tab
const guideJSX = `
            {tab === 'guide' && (
                <div style={{ display: 'grid', gap: 18 }}>
                    <div style={{ background: 'linear-gradient(135deg,rgba(79,142,247,0.12),rgba(167,139,250,0.08))', border: '1px solid rgba(79,142,247,0.3)', borderRadius: 14, textAlign: 'center', padding: 32 }}>
                        <div style={{ fontSize: 44 }}>\u{1F4F1}</div>
                        <div style={{ fontWeight: 900, fontSize: 22, marginTop: 8, color: '#e8eaf0' }}>SMS/LMS 마케팅 이용 가이드</div>
                        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 6, maxWidth: 600, margin: '6px auto 0', lineHeight: 1.7 }}>NHN Cloud, Aligo, CoolSMS 프로바이더 연동부터 개별/일괄 발송, 통계 분석까지 전체 워크플로우를 안내합니다.</div>
                    </div>
                    <div className="card card-glass" style={{ padding: 20 }}>
                        <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 16, color: '#e8eaf0' }}>SMS 마케팅 6단계</div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 14 }}>
                            {[{n:'1️⃣',t:'프로바이더 선택',d:'NHN Cloud, Aligo, CoolSMS 중 프로바이더를 선택합니다.',c:'#4f8ef7'},
                              {n:'2️⃣',t:'API 키 등록',d:'App Key, Secret Key, 발신번호를 등록하고 연결 테스트합니다.',c:'#22c55e'},
                              {n:'3️⃣',t:'SMS 작성',d:'수신번호와 메시지를 입력하고 SMS/LMS를 발송합니다.',c:'#a78bfa'},
                              {n:'4️⃣',t:'일괄 발송',d:'최대 500개 번호에 동시 발송합니다.',c:'#f97316'},
                              {n:'5️⃣',t:'발송 내역',d:'발송 이력과 성공/실패 상태를 확인합니다.',c:'#06b6d4'},
                              {n:'6️⃣',t:'통계 분석',d:'월별 발송 건수, 성공률, 잔여 예산을 분석합니다.',c:'#f472b6'}
                            ].map((s,i) => (
                                <div key={i} style={{ background: s.c+'0a', border: '1px solid '+s.c+'25', borderRadius: 12, padding: 16 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                                        <span style={{ fontSize: 20 }}>{s.n}</span>
                                        <span style={{ fontWeight: 700, fontSize: 14, color: s.c }}>{s.t}</span>
                                    </div>
                                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 1.7 }}>{s.d}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="card card-glass" style={{ padding: 20 }}>
                        <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 16, color: '#e8eaf0' }}>탭별 상세 안내</div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 12 }}>
                            {[{icon:'✏️',n:'SMS 작성',d:'개별 SMS/LMS 발송',c:'#4f8ef7'},
                              {icon:'📡',n:'일괄 발송',d:'최대 500건 동시 발송',c:'#a78bfa'},
                              {icon:'📜',n:'발송 내역',d:'발송 이력 조회',c:'#22c55e'},
                              {icon:'📊',n:'통계',d:'발송 성공률 분석',c:'#f97316'},
                              {icon:'⚙️',n:'인증 설정',d:'API 키 등록',c:'#06b6d4'}
                            ].map((tb,i) => (
                                <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '10px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: 10, border: '1px solid rgba(99,140,255,0.08)' }}>
                                    <span style={{ fontSize: 18, flexShrink: 0 }}>{tb.icon}</span>
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: 12, color: tb.c }}>{tb.n}</div>
                                        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{tb.d}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div style={{ background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 14, padding: 20 }}>
                        <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 12, color: '#e8eaf0' }}>💡 유용한 팁</div>
                        <ul style={{ margin: 0, padding: '0 0 0 18px', fontSize: 13, color: 'rgba(255,255,255,0.4)', lineHeight: 2.2 }}>
                            <li>90자 이하는 SMS, 초과하면 자동으로 LMS로 전환됩니다.</li>
                            <li>발신번호는 통신사에 사전 등록된 번호만 사용 가능합니다.</li>
                            <li>CRM 세그먼트와 연동하면 타겟팅 정밀도가 향상됩니다.</li>
                            <li>일괄 발송 시 최대 500개 번호까지 동시 발송 가능합니다.</li>
                            <li>모든 발송 기록은 API를 통해 실시간 추적됩니다.</li>
                        </ul>
                    </div>
                </div>
            )}`;

c = c.replace(
  "{tab === 'settings' && <AuthPanel onSaved={loadData} />}",
  "{tab === 'settings' && <AuthPanel onSaved={loadData} />}" + guideJSX
);

fs.writeFileSync(fp, c, 'utf8');
console.log('✅ SMS Marketing: guide tab added + mock data removed');
