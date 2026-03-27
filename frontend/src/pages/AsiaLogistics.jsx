import React, { useState } from 'react';
import { useCurrency } from '../contexts/CurrencyContext.jsx';

// currency formatting via useCurrency fmt()

const HUBS = [
    { id: 'KR-ICN', country: '🇰🇷 Korea', city: 'Incheon', type: 'Main Hub', area: '12,000m²', carriers: ['CJKorea Delivery', 'Coupang로켓', '우체국'], customs: 'FTZ', status: 'active', skus: 2840, dailyOut: 1200, avgDays: 1.2, cost: 2800 },
    { id: 'JP-NRT', country: '🇯🇵 일본', city: '나리타', type: '서브 허브', area: '4,200m²', carriers: ['yamato', 'sagawa', 'Japan Post'], customs: 'AEO', status: 'active', skus: 890, dailyOut: 340, avgDays: 2.1, cost: 4200 },
    { id: 'SG-SIN', country: '🇸🇬 싱가포르', city: '싱가포르', type: '동남아 허브', area: '6,800m²', carriers: ['Ninja Van', 'J&T Express', 'Grab Express'], customs: 'GST-registered', status: 'active', skus: 1240, dailyOut: 580, avgDays: 3.2, cost: 3600 },
    { id: 'TH-BKK', country: '🇹🇭 태국', city: '방콕', type: '파트너 창고', area: '2,100m²', carriers: ['Kerry Express', 'Flash Express'], customs: 'BOI', status: 'active', skus: 420, dailyOut: 180, avgDays: 4.1, cost: 2400 },
    { id: 'MY-KUL', country: '🇲🇾 말레이시아', city: '쿠알라룸푸르', type: '파트너 창고', area: '1,800m²', carriers: ['Pos Laju', 'J&T Malaysia'], customs: '표준', status: 'expanding', skus: 320, dailyOut: 140, avgDays: 3.8, cost: 2200 },
    { id: 'CN-SHA', country: '🇨🇳 in progress국', city: '상하이 보세구', type: '크로스보더 허브', area: '8,500m²', carriers: ['SF Express', 'YTO Express'], customs: 'CBEC', status: 'planning', skus: 0, dailyOut: 0, avgDays: 5.2, cost: 1800 },
];

const ROUTE_MATRIX = [
    { from: 'Incheon', to: '도쿄', mode: '항공', days: 1, cost: 3200, note: 'ANA Cargo 직항' },
    { from: 'Incheon', to: '싱가포르', mode: '항공', days: 2, cost: 4800, note: 'SQ/KE 공동 운항' },
    { from: 'Incheon', to: '방콕', mode: '항공', days: 2, cost: 3600, note: 'TG/KE 코드셰어' },
    { from: 'Incheon', to: '쿠알라룸푸르', mode: '항공', days: 3, cost: 4200, note: 'MH/KE 직항' },
    { from: '싱가포르', to: '방콕', mode: '육로', days: 3, cost: 1800, note: '트럭 운송' },
    { from: '싱가포르', to: '쿠알라룸푸르', mode: '육로', days: 1, cost: 900, note: '1일 트럭' },
    { from: '상하이', to: '도쿄', mode: '해운', days: 3, cost: 1200, note: '주 3회 정기편' },
    { from: '상하이', to: '싱가포르', mode: '해운', days: 5, cost: 2100, note: 'ONE/Evergreen' },
];

const REGULATIONS = [
    { country: '🇰🇷 Korea', threshold: '200달러', taxRate: '부가세 10%', note: 'FTA 혜택 다Count', platform: 'Coupang·Naver·11Street' },
    { country: '🇯🇵 일본', threshold: '1만엔', taxRate: '소비세 10%', note: 'AEO 인증 시 빠른 통관', platform: 'Amazon JP·Rakuten' },
    { country: '🇸🇬 싱가포르', threshold: 'S$400', taxRate: 'GST 9%', note: '2023년 GST 인상', platform: 'Shopee·Lazada' },
    { country: '🇹🇭 태국', threshold: '1,500밧', taxRate: 'VAT 7%', note: '이커머스 규제 강화', platform: 'Shopee·Lazada TH' },
    { country: '🇲🇾 말레이시아', threshold: 'RM500', taxRate: 'SST 10%', note: '할랄 인증 일부 필요', platform: 'Shopee MY·Lazada MY' },
    { country: '🇩🇪 독일(EU)', threshold: '€0(0달러)', taxRate: 'VAT 19%', note: 'OSS 제도 이용', platform: 'Zalando·Amazon DE' },
];

export default function AsiaLogistics() {
  const t = useT();
    const { fmt } = useCurrency();
    const [activeHub, setActiveHub] = useState(null);
    const [activeTab, setActiveTab] = useState('hubs');

    // ─── Domestic 3PL 업체 Management state ───────────────────────────────────
    const [carriers3pl, setCarriers3pl] = useState([
        { id: 1, name:'CJKorea Delivery', icon:'🟠', color:'#f97316', apiStatus:'IntegrationDone', features:['로켓배송 호환','당일배송(서울)','냉장 풀필먼트'], daily:'4,200건', avgDays:'1.1일', cost:'₩2,800/건', coverage:'전국 86%', channels:['Coupang','Naver','Own Mall'] },
        { id: 2, name:'한진택배', icon:'🔵', color:'#4f8ef7', apiStatus:'IntegrationDone', features:['반품 Auto회Count','in progress량화물 특화','도서산간 배송'], daily:'2,800건', avgDays:'1.4일', cost:'₩2,600/건', coverage:'전국 92%', channels:['11Street','Gmarket','Own Mall'] },
        { id: 3, name:'롯데택배', icon:'🔴', color:'#ef4444', apiStatus:'SettingsPending', features:['롯데마트 Integration','식품 냉동배송','주말배송 가능'], daily:'1,200건', avgDays:'1.8일', cost:'₩2,450/건', coverage:'전국 78%', channels:['롯데온','11Street'] },
    ]);
    const [showAddForm, setShowAddForm] = useState(false);
    const [newCarrier, setNewCarrier] = useState({ name:'', icon:'🚚', color:'#22c55e', apiKey:'', daily:'', avgDays:'', cost:'', coverage:'', channels:'' });
    const addCarrierMsg = (carrier) => {
        if (!carrier.name.trim()) return;
        setCarriers3pl(prev => [...prev, { ...carrier, id: Date.now(), apiStatus:'SettingsPending', features:[], channels: carrier.channels ? carrier.channels.split(',').map(s=>s.trim()) : [] }]);
        setNewCarrier({ name:'', icon:'🚚', color:'#22c55e', apiKey:'', daily:'', avgDays:'', cost:'', coverage:'', channels:'' });
        setShowAddForm(false);
    };
    const removeCarrier = (id) => setCarriers3pl(prev => prev.filter(c => c.id !== id));

    const totalSkus = HUBS.filter(h => h.status === 'active').reduce((s, h) => s + h.skus, 0);
    const totalDaily = HUBS.filter(h => h.status === 'active').reduce((s, h) => s + h.dailyOut, 0);
    const avgCost = Math.round(HUBS.filter(h => h.status === 'active').reduce((s, h) => s + h.cost, 0) / HUBS.filter(h => h.status === 'active').length);

    const STATUS_COLOR = { active: '#22c55e', expanding: '#f97316', planning: '#4f8ef7' };
    const STATUS_LABEL = { active: '운영in progress', expanding: '확장in progress', planning: 'Planin progress' };

    return (
        <div style={{ display: 'grid', gap: 20, padding: 4 }}>
            {/* Hero */}
            <div className="hero fade-up">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
                    <div>
                        <div className="hero-title" style={{ background: 'linear-gradient(135deg,#f97316,#ef4444,#a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                            🌏 Asia Logistics 네트워크
                        </div>
                        <div className="hero-desc">Korea · 일본 · 동남아 특화 풀필먼트 허브, 루트 최적화, 관세·규제 Management</div>
                        <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                            <span className="badge badge-green">{HUBS.filter(h=>h.status==='active').length}개 허브 운영in progress</span>
                            <span className="badge badge-orange" style={{ background:'rgba(249,115,22,0.15)', color:'#f97316', border:'1px solid rgba(249,115,22,0.3)' }}>Total SKU {totalSkus.toLocaleString()}개</span>
                            <span className="badge badge-blue">일 출고 {totalDaily.toLocaleString()} items</span>
                        </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10, minWidth: 240 }}>
                        {[{ l:'운영 허브', v: HUBS.filter(h=>h.status==='active').length+'개', c:'#22c55e' },
                          { l:'커버 Country', v: '6개국', c:'#4f8ef7' },
                          { l:'일 Total 출고', v: totalDaily.toLocaleString()+'건', c:'#a855f7' },
                          { l:'Average 배송비', v: fmt(avgCost)+'/kg', c:'#f97316' }].map(({l,v,c})=>(
                            <div key={l} style={{ background:'rgba(255,255,255,0.04)', borderRadius:10, padding:'10px 12px', border:'1px solid rgba(255,255,255,0.06)' }}>
                                <div style={{ fontSize:9, color:'var(--text-3)', fontWeight:700 }}>{l}</div>
                                <div style={{ fontSize:18, fontWeight:900, color:c, marginTop:3 }}>{v}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Tab */}
            <div style={{ display: 'flex', gap: 4, background: 'rgba(0,0,0,0.2)', borderRadius: 12, padding: 5, flexWrap: 'wrap' }}>
                {[['hubs','🏭 허브 현황'],['routes','✈️ 루트 매트릭스'],['regulations','📋 관세·규제'],['fulfillment','📦 풀필먼트 Compare'],['domestic','🇰🇷 Domestic 3PL']].map(([id,lbl])=>(
                    <button key={id} onClick={() => setActiveTab(id)}
                        style={{ padding:'7px 16px', borderRadius:9, border:'none', cursor:'pointer', fontWeight:700, fontSize:11,
                            background: activeTab===id?'linear-gradient(135deg,#f97316,#a855f7)':'transparent',
                            color: activeTab===id?'#fff':'var(--text-3)', transition:'all 150ms' }}>
                        {lbl}
                    </button>
                ))}
            </div>

            {activeTab === 'hubs' && (
                <div className="fade-up">
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
                        {HUBS.map(hub => (
                            <div key={hub.id} style={{ background:'rgba(255,255,255,0.03)', border:`1px solid ${STATUS_COLOR[hub.status]}30`, borderRadius:14, padding:16, cursor:'pointer', transition:'all 0.2s', boxShadow: activeHub===hub.id?`0 0 0 2px ${STATUS_COLOR[hub.status]}`:'none' }}
                                onClick={() => setActiveHub(activeHub===hub.id?null:hub.id)}>
                                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:10 }}>
                                    <div>
                                        <div style={{ fontSize:16, fontWeight:900 }}>{hub.country}</div>
                                        <div style={{ fontSize:12, color:'var(--text-3)' }}>{hub.city} — {hub.type}</div>
                                    </div>
                                    <span style={{ fontSize:9, fontWeight:700, padding:'3px 8px', borderRadius:20, height:'fit-content', background:STATUS_COLOR[hub.status]+'18', color:STATUS_COLOR[hub.status] }}>{STATUS_LABEL[hub.status]}</span>
                                </div>
                                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:10 }}>
                                    {[['면적',hub.area],['SKUCount',hub.status==='active'?hub.skus.toLocaleString()+'개':'—'],['일출고',hub.status==='active'?hub.dailyOut.toLocaleString()+'건':'—'],['배송비',fmt(hub.cost)+'/kg']].map(([l,v])=>(
                                        <div key={l} style={{ background:'rgba(255,255,255,0.03)', borderRadius:8, padding:'7px 10px' }}>
                                            <div style={{ fontSize:9, color:'var(--text-3)', fontWeight:600 }}>{l}</div>
                                            <div style={{ fontSize:13, fontWeight:800, color:'var(--text-1)', marginTop:2 }}>{v}</div>
                                        </div>
                                    ))}
                                </div>
                                {activeHub === hub.id && (
                                    <div style={{ marginTop:10, paddingTop:10, borderTop:'1px solid rgba(255,255,255,0.08)' }}>
                                        <div style={{ fontSize:10, marginBottom:6 }}>🚚 이용 택배사</div>
                                        <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
                                            {hub.carriers.map(c=><span key={c} style={{ fontSize:9, padding:'2px 8px', borderRadius:20, background:'rgba(99,140,255,0.12)', color:'#7c9ef5' }}>{c}</span>)}
                                        </div>
                                        <div style={{ fontSize:10, marginTop:8, marginBottom:4 }}>🛃 통관 방식</div>
                                        <span style={{ fontSize:10, color:'#22c55e', fontWeight:700 }}>{hub.customs}</span>
                                        <div style={{ fontSize:10, marginTop:8, marginBottom:4 }}>⏱ Average 배송일</div>
                                        <span style={{ fontSize:13, fontWeight:900, color:'#4f8ef7' }}>{hub.avgDays}일</span>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {activeTab === 'routes' && (
                <div className="card fade-up">
                    <div style={{ fontWeight:800, fontSize:14, marginBottom:14 }}>✈️ 국제 물류 루트 매트릭스</div>
                    <table className="table">
                        <thead><tr><th>출발지</th><th>도착지</th><th>운송 방식</th><th>소요일</th><th>Cost/kg</th><th>비고</th></tr></thead>
                        <tbody>
                            {ROUTE_MATRIX.map((r, i) => (
                                <tr key={i}>
                                    <td style={{ fontWeight:700 }}>{r.from}</td>
                                    <td style={{ fontWeight:700 }}>{r.to}</td>
                                    <td><span style={{ fontSize:9, fontWeight:700, padding:'2px 8px', borderRadius:20, background: r.mode==='항공'?'rgba(79,142,247,0.15)':r.mode==='해운'?'rgba(34,197,94,0.15)':'rgba(249,115,22,0.15)', color: r.mode==='항공'?'#4f8ef7':r.mode==='해운'?'#22c55e':'#f97316' }}>{r.mode}</span></td>
                                    <td style={{ textAlign:'center', fontWeight:700, color:r.days<=2?'#22c55e':r.days<=4?'#f97316':'#ef4444' }}>{r.days}일</td>
                                    <td style={{ fontFamily:'monospace', fontWeight:700 }}>{fmt(r.cost)}</td>
                                    <td style={{ fontSize:11, color:'var(--text-3)' }}>{r.note}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {activeTab === 'regulations' && (
                <div className="card fade-up">
                    <div style={{ fontWeight:800, fontSize:14, marginBottom:14 }}>📋 Countryper 관세·규제 현황</div>
                    <table className="table">
                        <thead><tr><th>Country</th><th>면세 한도</th><th>세율</th><th>특이사항</th><th>주요 Platform</th></tr></thead>
                        <tbody>
                            {REGULATIONS.map((r, i) => (
                                <tr key={i}>
                                    <td style={{ fontWeight:700, fontSize:13 }}>{r.country}</td>
                                    <td style={{ fontFamily:'monospace', fontSize:11, color:'#f97316', fontWeight:700 }}>{r.threshold}</td>
                                    <td style={{ fontWeight:700, color:'#ef4444' }}>{r.taxRate}</td>
                                    <td style={{ fontSize:11, color:'var(--text-3)' }}>{r.note}</td>
                                    <td style={{ fontSize:10 }}>{r.platform}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {activeTab === 'fulfillment' && (
                <div className="card fade-up">
                    <div style={{ fontWeight:800, fontSize:14, marginBottom:14 }}>📦 풀필먼트 방식 Compare</div>
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14 }}>
                        {[
                            { title:'자사 직영 허브', icon:'🏭', pros:['Stock 완전 통제','브랜드 패키징','빠른 처리속도'], cons:['초기 투자 High','고정 운영비'], cost:'₩2,800-4,200/kg', recommend:'고회전 Product' },
                            { title:'3PL 파트너', icon:'🤝', pros:['유연한 확장','고정비 None','현지 인력'], cons:['가시성 Limit','품질 편차'], cost:'₩1,800-3,200/kg', recommend:'in progress장기 Test' },
                            { title:'크로스보더 직배', icon:'✈️', pros:['Stock 불필요','즉시 Start 가능','낮은 초기Cost'], cons:['배송 7-15일','통관 리스크'], cost:'₩800-1,500/kg', recommend:'신규 시장 Test' },
                        ].map(fc => (
                            <div key={fc.title} style={{ background:'rgba(255,255,255,0.03)', borderRadius:14, padding:20, border:'1px solid rgba(255,255,255,0.07)' }}>
                                <div style={{ fontSize:28, marginBottom:10 }}>{fc.icon}</div>
                                <div style={{ fontSize:14, fontWeight:900, marginBottom:4 }}>{fc.title}</div>
                                <div style={{ fontSize:11, color:'#f97316', fontWeight:700, marginBottom:12 }}>{fc.cost}</div>
                                <div style={{ fontSize:10, color:'var(--text-3)', marginBottom:6, fontWeight:700 }}>장점</div>
                                {fc.pros.map(p => <div key={p} style={{ fontSize:11, color:'#22c55e', marginBottom:3 }}>✓ {p}</div>)}
                                <div style={{ fontSize:10, color:'var(--text-3)', margin:'10px 0 6px', fontWeight:700 }}>단점</div>
                                {fc.cons.map(c => <div key={c} style={{ fontSize:11, color:'#ef4444', marginBottom:3 }}>✗ {c}</div>)}
                                <div style={{ marginTop:14, padding:'8px 12px', background:'rgba(79,142,247,0.08)', borderRadius:8 }}>
                                    <div style={{ fontSize:9, color:'var(--text-3)', fontWeight:700 }}>Recommend Apply</div>
                                    <div style={{ fontSize:11, color:'#4f8ef7', fontWeight:700, marginTop:2 }}>{fc.recommend}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {activeTab === 'domestic' && (
                <div className="fade-up" style={{ display:'grid', gap:14 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                        <div>
                            <div style={{ fontWeight:800, fontSize:14 }}>🇰🇷 Domestic 3PL 업체 Management</div>
                            <div style={{ fontSize:11, color:'var(--text-3)', marginTop:2 }}>CJKorea Delivery·한진택배·롯데택배 및 신규 3PL 파트너 API Integration 현황</div>
                        </div>
                        <button onClick={() => setShowAddForm(v => !v)} style={{ padding:'8px 16px', borderRadius:10, border:'none', background:'linear-gradient(135deg,#22c55e,#16a34a)', color:'#fff', fontWeight:700, fontSize:12, cursor:'pointer' }}>
                            {showAddForm ? '✕ Close' : '+ 업체 Add'}
                        </button>
                    </div>

                    {/* 업체 Add 폼 */}
                    {showAddForm && (
                        <div style={{ background:'rgba(34,197,94,0.04)', border:'1px solid rgba(34,197,94,0.2)', borderRadius:14, padding:18 }}>
                            <div style={{ fontWeight:700, fontSize:13, marginBottom:14, color:'#22c55e' }}>➕ 새 3PL 업체 Add</div>
                            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
                                {[
                                    ['업체명 *', 'name', 'text', 'CJKorea Delivery'],
                                    ['Icon (이모지)', 'icon', 'text', '🚚'],
                                    ['일 처리량', 'daily', 'text', '1,000건'],
                                    ['Average배송일', 'avgDays', 'text', '1.5일'],
                                    ['건당 Cost', 'cost', 'text', '₩3,000/건'],
                                    ['커버리지', 'coverage', 'text', '전국 80%'],
                                    ['API Key', 'apiKey', 'password', 'API 키 입력'],
                                    ['Integration Channel (쉼표 구분)', 'channels', 'text', 'Coupang, Naver'],
                                ].map(([label, key, type, ph]) => (
                                    <div key={key}>
                                        <div style={{ fontSize:9, color:'var(--text-3)', fontWeight:700, marginBottom:4 }}>{label}</div>
                                        <input type={type} value={newCarrier[key]} placeholder={ph}
                                            onChange={e => setNewCarrier(prev => ({ ...prev, [key]: e.target.value }))}
                                            style={{ width:'100%', padding:'7px 10px', borderRadius:8, border:'1px solid rgba(255,255,255,0.1)', background:'rgba(255,255,255,0.04)', color:'var(--text-1)', fontSize:12, boxSizing:'border-box' }} />
                                    </div>
                                ))}
                            </div>
                            <button onClick={() => addCarrierMsg(newCarrier)} style={{ marginTop:14, padding:'9px 24px', borderRadius:10, border:'none', background:'linear-gradient(135deg,#4f8ef7,#6366f1)', color:'#fff', fontWeight:700, fontSize:12, cursor:'pointer' }}>
                                업체 Register
                            </button>
                        </div>
                    )}

                    {/* 업체 Card List (state 기반) */}
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14 }}>
                        {carriers3pl.map(c => (
                            <div key={c.id} style={{ background:'rgba(255,255,255,0.03)', borderRadius:14, padding:18, border:`1px solid ${c.color}25`, position:'relative' }}>
                                <button onClick={() => removeCarrier(c.id)} title="Delete"
                                    style={{ position:'absolute', top:10, right:10, width:22, height:22, borderRadius:'50%', border:'none', background:'rgba(239,68,68,0.15)', color:'#ef4444', cursor:'pointer', fontSize:12, display:'flex', alignItems:'center', justifyContent:'center' }}>×</button>
                                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12, paddingRight:28 }}>
                                    <div style={{ fontSize:16, fontWeight:900 }}>{c.icon} {c.name}</div>
                                    <span style={{ fontSize:9, fontWeight:700, padding:'3px 8px', borderRadius:20, background: c.apiStatus==='IntegrationDone'?'rgba(34,197,94,0.15)':'rgba(249,115,22,0.15)', color: c.apiStatus==='IntegrationDone'?'#22c55e':'#f97316' }}>{c.apiStatus}</span>
                                </div>
                                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:12 }}>
                                    {[['일 처리',c.daily],['Average배송일',c.avgDays],['건당 Cost',c.cost],['커버리지',c.coverage]].map(([l,v]) => (
                                        <div key={l} style={{ background:'rgba(255,255,255,0.03)', borderRadius:8, padding:'8px 10px' }}>
                                            <div style={{ fontSize:9, color:'var(--text-3)', fontWeight:600 }}>{l}</div>
                                            <div style={{ fontSize:13, fontWeight:800, color:c.color, marginTop:2 }}>{v || '-'}</div>
                                        </div>
                                    ))}
                                </div>
                                {c.features?.length > 0 && (
                                    <>
                                        <div style={{ fontSize:11, fontWeight:700, marginBottom:6, color:'var(--text-3)' }}>주요 Feature</div>
                                        {c.features.map(f => <div key={f} style={{ fontSize:11, color:'#22c55e', marginBottom:3 }}>✓ {f}</div>)}
                                    </>
                                )}
                                {c.channels?.length > 0 && (
                                    <div style={{ marginTop:10, display:'flex', gap:4, flexWrap:'wrap' }}>
                                        {c.channels.map(ch => <span key={ch} style={{ fontSize:9, padding:'2px 8px', borderRadius:20, background:'rgba(79,142,247,0.12)', color:'#7c9ef5', fontWeight:700 }}>{ch}</span>)}
                                    </div>
                                )}
                                {c.apiStatus === 'SettingsPending' && (
                                    <button style={{ marginTop:12, width:'100%', padding:'8px', borderRadius:8, background:'linear-gradient(135deg,#f97316,#ef4444)', border:'none', color:'#fff', fontWeight:700, fontSize:11, cursor:'pointer' }}>
                                        API Integration Settings
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>

                    <div style={{ padding:'12px 16px', borderRadius:10, background:'rgba(34,197,94,0.05)', border:'1px solid rgba(34,197,94,0.15)', fontSize:12, color:'var(--text-2)', lineHeight:1.7 }}>
                        💡 <strong>Auto 라우팅 Integration</strong>: OrderHub Auto라우팅 엔진과 Connect하면 Orders 조건(지역·무게·Channel)에 따라 업체를 Auto 배정합니다.
                    </div>
                </div>
            )}
        </div>
    );
}

import { useI18n } from '../i18n/index.js';
import { useT } from '../i18n/index.js';