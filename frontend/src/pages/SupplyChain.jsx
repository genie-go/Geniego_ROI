import React, { useState } from 'react';
import { useCurrency } from '../contexts/CurrencyContext.jsx';

const SUPPLY_FLOW = [
    {
        id: 'SUP-001', supplier: '(Week)Tech Components', sku: 'DJ-CICA-101', name: 'Wireless Headphones', leadTime: 14,
        stages: [
            { stage: 'Purchase Order', date: '2026-03-01', done: true, note: 'PO-20260301-001 Create' },
            { stage: '생산', date: '2026-03-08', done: true, note: '공장 생산 Done' },
            { stage: '선적', date: '2026-03-10', done: true, note: 'CJ 화물 선적' },
            { stage: '통관', date: '2026-03-14', done: true, note: '인천세관 통관 Done' },
            { stage: '입고', date: '2026-03-15', done: false, note: '인천 허브 예정' },
            { stage: '출고준비', date: '2026-03-16', done: false, note: '—' },
        ],
        risk: 'low', delayRate: 3.2, totalCost: 4500000
    },
    {
        id: 'SUP-002', supplier: 'ABC Electronics', sku: 'DJ-CERA-002', name: 'RGB 키보드', leadTime: 21,
        stages: [
            { stage: 'Purchase Order', date: '2026-02-20', done: true, note: 'PO-20260220-002 Create' },
            { stage: '생산', date: '2026-03-05', done: true, note: '생산 지연 3일' },
            { stage: '선적', date: '2026-03-09', done: false, note: '지연 - 선박 부족' },
            { stage: '통관', date: '2026-03-14', done: false, note: '—' },
            { stage: '입고', date: '2026-03-16', done: false, note: '—' },
            { stage: '출고준비', date: '2026-03-17', done: false, note: '—' },
        ],
        risk: 'high', delayRate: 18.5, totalCost: 10800000
    },
    {
        id: 'SUP-003', supplier: 'USB Korea', sku: 'HC-USB4-7P-01', name: 'USB-C 허브', leadTime: 10,
        stages: [
            { stage: 'Purchase Order', date: '2026-03-05', done: true, note: 'PO-20260305-003' },
            { stage: '생산', date: '2026-03-10', done: true, note: 'Done' },
            { stage: '선적', date: '2026-03-12', done: true, note: 'Domestic 트럭' },
            { stage: '통관', date: '2026-03-12', done: true, note: 'Domestic - 통관 None' },
            { stage: '입고', date: '2026-03-13', done: true, note: 'Done' },
            { stage: '출고준비', date: '2026-03-14', done: true, note: 'Done' },
        ],
        risk: 'low', delayRate: 1.1, totalCost: 1800000
    },
];

const SUPPLIERS = [
    { id: 'SP-001', name: '(Week)Tech Components', country: '🇰🇷 한국', category: '전자부품', leadTime: 14, delayRate: 3.2, orderCount: 45, reliability: 96.8, contact: 'kim@techpart.co.kr' },
    { id: 'SP-002', name: 'ABC Electronics', country: '🇨🇳 in progress국', category: '전자제품', leadTime: 21, delayRate: 18.5, orderCount: 23, reliability: 81.5, contact: 'sales@abcelectronics.cn' },
    { id: 'SP-003', name: 'USB Korea', country: '🇰🇷 한국', category: 'IT Week변기기', leadTime: 10, delayRate: 1.1, orderCount: 67, reliability: 98.9, contact: 'order@usbkorea.com' },
    { id: 'SP-004', name: 'Cam Pro Inc', country: '🇹🇼 대만', category: '영상장비', leadTime: 18, delayRate: 8.3, orderCount: 12, reliability: 91.7, contact: 'b2b@campro.tw' },
];

// currency formatting via useCurrency fmt()

export default function SupplyChain() {
    const { fmt } = useCurrency();
    const [activeTab, setActiveTab] = useState('visibility');
    const [selectedFlow, setSelectedFlow] = useState(null);

    const highRisk = SUPPLY_FLOW.filter(f => f.risk === 'high');

    return (
        <div style={{ display: 'grid', gap: 20, padding: 4 }}>
            {/* Hero */}
            <div className="hero fade-up">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
                    <div>
                        <div className="hero-title" style={{ background: 'linear-gradient(135deg,#06b6d4,#4f8ef7,#a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                            🔭 Supply Chain 가시성 (Supply Chain Visibility)
                        </div>
                        <div className="hero-desc">공급사 → 생산 → 선적 → 통관 → 입고 → 출고 All 플로우 실Time 추적, 리드타임 Auto Calculate, 공급 위험 감지</div>
                        <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                            <span className="badge badge-blue">{SUPPLY_FLOW.length}개 공급라인 추적</span>
                            {highRisk.length > 0 && <span className="badge badge-red">⚠️ 공급위험 {highRisk.length} items</span>}
                            <span className="badge badge-purple">{SUPPLIERS.length}개 공급사 Register</span>
                        </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10, minWidth: 220 }}>
                        {[
                            { l: '추적 라인', v: SUPPLY_FLOW.length + '개', c: '#4f8ef7' },
                            { l: '위험 라인', v: highRisk.length + '개', c: '#ef4444' },
                            { l: 'Average 리드타임', v: Math.round(SUPPLY_FLOW.reduce((s, f) => s + f.leadTime, 0) / SUPPLY_FLOW.length) + '일', c: '#f97316' },
                            { l: 'Total Purchase OrderAmount', v: fmt(SUPPLY_FLOW.reduce((s, f) => s + f.totalCost, 0)), c: '#a855f7' },
                        ].map(({ l, v, c }) => (
                            <div key={l} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '10px 12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                                <div style={{ fontSize: 9, color: 'var(--text-3)', fontWeight: 700 }}>{l}</div>
                                <div style={{ fontSize: 16, fontWeight: 900, color: c, marginTop: 3 }}>{v}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Warning Banner */}
            {highRisk.length > 0 && (
                <div style={{ padding: '12px 16px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 12, fontSize: 12 }} className="fade-up">
                    <span style={{ color: '#ef4444', fontWeight: 700 }}>⚠️ 공급 위험 감지:</span>
                    {highRisk.map(f => (
                        <span key={f.id} style={{ marginLeft: 12, color: '#f97316' }}>
                            [{f.name}] 공급사 {f.supplier} — 지연율 {f.delayRate}%, 선적 단계 지연
                        </span>
                    ))}
                </div>
            )}

            {/* Tab */}
            <div style={{ display: 'flex', gap: 4, background: 'rgba(0,0,0,0.2)', borderRadius: 12, padding: 5, flexWrap: 'wrap' }}>
                {[['visibility', '🔭 Supply Chain 타임라인'], ['suppliers', '🏭 공급사 Management'], ['leadtime', '⏱ 리드타임 Analysis'], ['risk', '⚠️ 위험 감지']].map(([id, lbl]) => (
                    <button key={id} onClick={() => setActiveTab(id)}
                        style={{ padding: '7px 16px', borderRadius: 9, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 11, background: activeTab === id ? 'linear-gradient(135deg,#06b6d4,#4f8ef7)' : 'transparent', color: activeTab === id ? '#fff' : 'var(--text-3)', transition: 'all 150ms' }}>
                        {lbl}
                    </button>
                ))}
            </div>

            {activeTab === 'visibility' && (
                <div style={{ display: 'grid', gap: 14 }} className="fade-up">
                    {SUPPLY_FLOW.map(flow => (
                        <div key={flow.id} style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${flow.risk === 'high' ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.06)'}`, borderRadius: 14, padding: 16, cursor: 'pointer' }}
                            onClick={() => setSelectedFlow(selectedFlow?.id === flow.id ? null : flow)}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                <div>
                                    <div style={{ fontSize: 13, fontWeight: 800 }}>{flow.name}</div>
                                    <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2 }}>{flow.id} · {flow.supplier} · 리드타임 {flow.leadTime}일</div>
                                </div>
                                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                    <span style={{ fontSize: 9, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: flow.risk === 'high' ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)', color: flow.risk === 'high' ? '#ef4444' : '#22c55e' }}>
                                        {flow.risk === 'high' ? '⚠️ 고위험' : '✅ 정상'}
                                    </span>
                                    <span style={{ fontSize: 10, color: '#a855f7', fontWeight: 700 }}>{fmt(flow.totalCost)}</span>
                                </div>
                            </div>
                            {/* 스테이지 타임라인 */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                                {flow.stages.map((s, i) => (
                                    <React.Fragment key={s.stage}>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                                            <div style={{ width: 28, height: 28, borderRadius: 14, background: s.done ? 'linear-gradient(135deg,#22c55e,#16a34a)' : 'rgba(255,255,255,0.08)', border: `2px solid ${s.done ? '#22c55e' : 'rgba(255,255,255,0.15)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>
                                                {s.done ? '✓' : (i + 1)}
                                            </div>
                                            <div style={{ fontSize: 9, fontWeight: 700, marginTop: 4, color: s.done ? '#22c55e' : 'var(--text-3)', textAlign: 'center' }}>{s.stage}</div>
                                            <div style={{ fontSize: 8, color: 'var(--text-3)', marginTop: 1, textAlign: 'center' }}>{s.date}</div>
                                        </div>
                                        {i < flow.stages.length - 1 && (
                                            <div style={{ height: 2, flex: 0.5, background: s.done ? '#22c55e' : 'rgba(255,255,255,0.08)', margin: '0 2px', marginBottom: 24 }} />
                                        )}
                                    </React.Fragment>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {activeTab === 'suppliers' && (
                <div className="card fade-up">
                    <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 14 }}>🏭 공급사 Management</div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                        <thead><tr style={{ borderBottom: '1px solid rgba(99,140,255,0.15)' }}>
                            {['ID', '공급사', 'Country', 'Category', '리드타임', '지연율', 'TotalPurchase OrderCount', '신뢰도', '연락처'].map(h => <th key={h} style={{ padding: '8px 4px', textAlign: 'left', fontSize: 10, color: 'var(--text-3)', fontWeight: 700 }}>{h}</th>)}
                        </tr></thead>
                        <tbody>
                            {SUPPLIERS.map(sp => (
                                <tr key={sp.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                    <td style={{ fontFamily: 'monospace', fontSize: 10, color: '#4f8ef7', padding: '8px 4px' }}>{sp.id}</td>
                                    <td style={{ fontSize: 11, fontWeight: 700, padding: '8px 4px' }}>{sp.name}</td>
                                    <td style={{ fontSize: 11, padding: '8px 4px' }}>{sp.country}</td>
                                    <td style={{ fontSize: 11, padding: '8px 4px' }}>{sp.category}</td>
                                    <td style={{ textAlign: 'center', fontWeight: 700, padding: '8px 4px', color: sp.leadTime <= 14 ? '#22c55e' : '#f97316' }}>{sp.leadTime}일</td>
                                    <td style={{ textAlign: 'center', fontWeight: 700, padding: '8px 4px', color: sp.delayRate >= 10 ? '#ef4444' : '#22c55e' }}>{sp.delayRate}%</td>
                                    <td style={{ textAlign: 'center', padding: '8px 4px' }}>{sp.orderCount}</td>
                                    <td style={{ padding: '8px 4px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <div style={{ flex: 1, height: 5, background: 'rgba(255,255,255,0.08)', borderRadius: 3 }}>
                                                <div style={{ width: `${sp.reliability}%`, height: '100%', background: sp.reliability >= 95 ? '#22c55e' : sp.reliability >= 85 ? '#f97316' : '#ef4444', borderRadius: 3 }} />
                                            </div>
                                            <span style={{ fontSize: 10, fontWeight: 700, color: sp.reliability >= 95 ? '#22c55e' : sp.reliability >= 85 ? '#f97316' : '#ef4444', minWidth: 38 }}>{sp.reliability}%</span>
                                        </div>
                                    </td>
                                    <td style={{ fontSize: 9, color: '#4f8ef7', padding: '8px 4px' }}>{sp.contact}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {activeTab === 'leadtime' && (
                <div className="card fade-up">
                    <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 14 }}>⏱ 리드타임 Analysis</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 16 }}>
                        {SUPPLY_FLOW.map(flow => (
                            <div key={flow.id} style={{ padding: 16, background: 'rgba(255,255,255,0.03)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)' }}>
                                <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 12 }}>{flow.name}</div>
                                {flow.stages.map(s => (
                                    <div key={s.stage} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                                        <div style={{ width: 6, height: 6, borderRadius: 3, background: s.done ? '#22c55e' : 'rgba(255,255,255,0.2)', flexShrink: 0 }} />
                                        <div style={{ flex: 1, fontSize: 10 }}>{s.stage}</div>
                                        <div style={{ fontSize: 10, color: 'var(--text-3)' }}>{s.date}</div>
                                        {s.note !== '—' && <div style={{ fontSize: 8, color: '#4f8ef7', maxWidth: 100 }}>{s.note}</div>}
                                    </div>
                                ))}
                                <div style={{ marginTop: 10, padding: '8px', background: 'rgba(79,142,247,0.08)', borderRadius: 8, fontSize: 10 }}>
                                    리드타임: <strong style={{ color: '#4f8ef7' }}>{flow.leadTime}일</strong> · 지연율: <strong style={{ color: flow.delayRate > 10 ? '#ef4444' : '#22c55e' }}>{flow.delayRate}%</strong>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {activeTab === 'risk' && (
                <div style={{ display: 'grid', gap: 14 }} className="fade-up">
                    {SUPPLY_FLOW.filter(f => f.risk === 'high').map(flow => (
                        <div key={flow.id} style={{ padding: 16, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 14 }}>
                            <div style={{ fontWeight: 800, fontSize: 13, color: '#ef4444', marginBottom: 8 }}>⚠️ {flow.name} — 공급 위험</div>
                            <div style={{ fontSize: 11, color: 'var(--text-2)', marginBottom: 12 }}>공급사: {flow.supplier} · 지연율: {flow.delayRate}% · 현재 단계: 선적 지연</div>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button style={{ fontSize: 11, padding: '5px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#f97316,#ef4444)', color: '#fff', fontWeight: 700 }}>📧 공급사 연락</button>
                                <button style={{ fontSize: 11, padding: '5px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'rgba(79,142,247,0.15)', color: '#4f8ef7', fontWeight: 700 }}>🔄 대체 공급사 Search</button>
                                <button style={{ fontSize: 11, padding: '5px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'rgba(168,85,247,0.15)', color: '#a855f7', fontWeight: 700 }}>🔔 Slack Notification</button>
                            </div>
                        </div>
                    ))}
                    <div className="card">
                        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12 }}>🛡️ Auto 위험 감지 규칙</div>
                        {[
                            { rule: '지연율 ≥ 10%', action: 'Slack Notification + Owner 에스컬레이션', active: true },
                            { rule: '선적 단계 3일 초과', action: '대체 공급사 Auto Search', active: true },
                            { rule: '입고 예정일 D-1 미입고', action: 'Orders PartialCancel 제안', active: false },
                            { rule: '공급사 신뢰도 < 85%', action: '블랙리스트 Warning', active: true },
                        ].map(r => (
                            <div key={r.rule} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: 12, fontWeight: 700 }}>{r.rule}</div>
                                    <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2 }}>→ {r.action}</div>
                                </div>
                                <div style={{ width: 32, height: 18, borderRadius: 9, background: r.active ? '#22c55e' : 'rgba(255,255,255,0.1)', position: 'relative' }}>
                                    <div style={{ width: 14, height: 14, borderRadius: 7, background: '#fff', position: 'absolute', top: 2, left: r.active ? 16 : 2 }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
