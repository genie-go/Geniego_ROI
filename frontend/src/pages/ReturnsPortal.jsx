import React, { useState, useMemo } from 'react';
import { useCurrency } from '../contexts/CurrencyContext.jsx';

// currency formatting via useCurrency fmt()

const RETURN_REASONS = ['Change of Mind', 'Wrong Size', 'Product불량/Damaged', 'Wrong Item', 'Description과다름', '기타'];
const RETURN_STATUS = { pending: '접Count', inspecting: '검Countin progress', approved: 'Approval', rejected: '반려', refunded: '환불Done', restocked: '재입고Done' };
const STATUS_COLOR = { pending: '#f97316', inspecting: '#4f8ef7', approved: '#22c55e', rejected: '#ef4444', refunded: '#a855f7', restocked: '#06b6d4' };

const DEMO_RETURNS = [
    { id: 'RT-2026-0001', orderId: 'ORD-20260304-0001', sku: 'WH-1000XM5-01', name: '무선 노이즈캔슬링 헤드폰', channel: 'coupang', qty: 1, reason: 'Wrong Size', status: 'approved', reqDate: '2026-03-10', trackNo: 'CJ1234567890', refundAmt: 89000, defective: false, wmsLinked: true },
    { id: 'RT-2026-0002', orderId: 'ORD-20260304-0003', sku: 'KB-MXM-RGB-02', name: 'RGB 기계식 키보드', channel: 'naver', qty: 1, reason: 'Product불량/Damaged', status: 'inspecting', reqDate: '2026-03-12', trackNo: 'CJ9876543210', refundAmt: 149000, defective: true, wmsLinked: false },
    { id: 'RT-2026-0003', orderId: 'ORD-20260304-0005', sku: 'HC-USB4-7P-01', name: 'USB-C 7포트 허브', channel: '11st', qty: 2, reason: 'Change of Mind', status: 'refunded', reqDate: '2026-03-08', trackNo: 'CJ1122334455', refundAmt: 98000, defective: false, wmsLinked: true },
    { id: 'RT-2026-0004', orderId: 'ORD-20260304-0007', sku: 'CAM-4K-PRO-01', name: '4K 웹캠 Pro', channel: 'amazon', qty: 1, reason: 'Wrong Item', status: 'restocked', reqDate: '2026-03-05', trackNo: 'DHL7788990011', refundAmt: 129000, defective: false, wmsLinked: true },
    { id: 'RT-2026-0005', orderId: 'ORD-20260304-0009', sku: 'MS-ERG-BL-01', name: '에르고 마우스', channel: 'coupang', qty: 1, reason: 'Description과다름', status: 'pending', reqDate: '2026-03-15', trackNo: '', refundAmt: 69000, defective: false, wmsLinked: false },
    { id: 'RT-2026-0006', orderId: 'ORD-20260304-0011', sku: 'CH-60W-GAN-01', name: '60W 급속충전기', channel: 'naver', qty: 3, reason: 'Product불량/Damaged', status: 'rejected', reqDate: '2026-03-13', trackNo: 'CJ5566778899', refundAmt: 117000, defective: true, wmsLinked: false },
];

const CH_COLORS = { coupang: '#ef4444', naver: '#22c55e', '11st': '#f97316', amazon: '#f97316', tiktok: '#a855f7', shopee: '#f97316' };

export default function ReturnsPortal() {
    const { fmt } = useCurrency();
    const registerClaimReturn = (data) => {
        console.log('[ReturnsPortal] WMS 반품입고 Integration:', data);
    };
    const [activeTab, setActiveTab] = useState('dashboard');
    const [statusFilter, setStatusFilter] = useState('all');
    const [selected, setSelected] = useState(null);
    const [portalLink] = useState('https://returns.genie-go.com/rp/aBc3Xy');
    const [linkCopied, setLinkCopied] = useState(false);

    const returns = DEMO_RETURNS;
    const filtered = statusFilter === 'all' ? returns : returns.filter(r => r.status === statusFilter);

    const stats = useMemo(() => ({
        total: returns.length,
        pending: returns.filter(r => r.status === 'pending').length,
        defective: returns.filter(r => r.defective).length,
        totalRefund: returns.reduce((s, r) => s + r.refundAmt, 0),
        wmsLinked: returns.filter(r => r.wmsLinked).length,
        refundRate: Math.round(returns.filter(r => r.status === 'refunded' || r.status === 'restocked').length / returns.length * 100),
    }), [returns]);

    const reasonDist = useMemo(() => {
        const dist = {};
        returns.forEach(r => { dist[r.reason] = (dist[r.reason] || 0) + 1; });
        return Object.entries(dist).sort((a, b) => b[1] - a[1]);
    }, [returns]);

    const handleWmsLink = (ret) => {
        registerClaimReturn({ id: ret.orderId, channel: ret.channel, sku: ret.sku, name: ret.name });
        alert(`✅ ${ret.id} → WMS 반품입고 Auto Register Done`);
    };

    const copyLink = () => { navigator.clipboard?.writeText(portalLink); setLinkCopied(true); setTimeout(() => setLinkCopied(false), 2000); };

    return (
        <div style={{ display: 'grid', gap: 20, padding: 4 }}>
            {/* Hero */}
            <div className="hero fade-up">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
                    <div>
                        <div className="hero-title" style={{ background: 'linear-gradient(135deg,#ef4444,#f97316,#eab308)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                            🔄 반품 Auto화 포탈
                        </div>
                        <div className="hero-desc">소비자 반품 신청 → Auto Classify → WMS 반품입고 → 환불 처리 완전 Auto화</div>
                        <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                            <span className="badge badge-red">⏳ 접CountPending {stats.pending} items</span>
                            <span className="badge badge-orange" style={{ background: 'rgba(249,115,22,0.15)', color: '#f97316', border: '1px solid rgba(249,115,22,0.3)' }}>Total {stats.total} items</span>
                            <span className="badge badge-green">WMSIntegration {stats.wmsLinked}/{stats.total}</span>
                            <span className="badge badge-purple">환불율 {stats.refundRate}%</span>
                        </div>
                    </div>
                    {/* 소비자 반품 Link */}
                    <div style={{ padding: '12px 16px', background: 'rgba(79,142,247,0.08)', border: '1px solid rgba(79,142,247,0.2)', borderRadius: 12, minWidth: 280 }}>
                        <div style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 700, marginBottom: 6 }}>🔗 소비자 반품 신청 Link</div>
                        <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#4f8ef7', marginBottom: 8, wordBreak: 'break-all' }}>{portalLink}</div>
                        <button style={{ fontSize: 10, padding: '5px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', background: linkCopied ? '#22c55e' : 'linear-gradient(135deg,#4f8ef7,#6366f1)', color: '#fff', fontWeight: 700 }} onClick={copyLink}>
                            {linkCopied ? '✅ Copy됨!' : '📋 Link Copy'}
                        </button>
                    </div>
                </div>
            </div>

            {/* KPI */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 12 }} className="fade-up fade-up-1">
                {[
                    { l: 'All 반품', v: stats.total + '건', c: '#4f8ef7' },
                    { l: '접CountPending', v: stats.pending + '건', c: '#f97316' },
                    { l: '불량품', v: stats.defective + '건', c: '#ef4444' },
                    { l: 'Total 환불액', v: fmt(stats.totalRefund), c: '#a855f7' },
                    { l: 'WMS AutoIntegration', v: stats.wmsLinked + '/' + stats.total, c: '#22c55e' },
                ].map(({ l, v, c }) => (
                    <div key={l} style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${c}22`, borderRadius: 12, padding: '12px 14px' }}>
                        <div style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 700 }}>{l}</div>
                        <div style={{ fontSize: 20, fontWeight: 900, color: c, marginTop: 4 }}>{v}</div>
                    </div>
                ))}
            </div>

            {/* Tab */}
            <div style={{ display: 'flex', gap: 4, background: 'rgba(0,0,0,0.2)', borderRadius: 12, padding: 5, flexWrap: 'wrap' }}>
                {[['dashboard', '📊 Dashboard'], ['list', '📋 반품 List'], ['portal', '🔗 포탈 Settings'], ['analytics', '📈 반품 Analysis']].map(([id, lbl]) => (
                    <button key={id} onClick={() => setActiveTab(id)}
                        style={{ padding: '7px 16px', borderRadius: 9, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 11, background: activeTab === id ? 'linear-gradient(135deg,#ef4444,#f97316)' : 'transparent', color: activeTab === id ? '#fff' : 'var(--text-3)', transition: 'all 150ms' }}>
                        {lbl}
                    </button>
                ))}
            </div>

            {activeTab === 'dashboard' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }} className="fade-up">
                    {/* 최근 반품 */}
                    <div className="card">
                        <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 12 }}>⏳ 처리 Pending 반품</div>
                        {returns.filter(r => ['pending', 'inspecting'].includes(r.status)).map(r => (
                            <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: 11, fontWeight: 700 }}>{r.name}</div>
                                    <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2 }}>{r.id} · {r.channel} · {r.reason}</div>
                                </div>
                                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                    <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: (STATUS_COLOR[r.status] || '#64748b') + '18', color: STATUS_COLOR[r.status] || '#64748b' }}>{RETURN_STATUS[r.status]}</span>
                                    {!r.wmsLinked && <button style={{ fontSize: 9, padding: '2px 8px', borderRadius: 7, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#22c55e,#4f8ef7)', color: '#fff', fontWeight: 700 }} onClick={() => handleWmsLink(r)}>WMSIntegration</button>}
                                </div>
                            </div>
                        ))}
                    </div>
                    {/* 불량품 Stock */}
                    <div className="card">
                        <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 12 }}>⚠️ 불량품 Stock 분리 현황</div>
                        {returns.filter(r => r.defective).map(r => (
                            <div key={r.id} style={{ padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <div style={{ fontSize: 11, fontWeight: 700, color: '#ef4444' }}>{r.name}</div>
                                        <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2 }}>{r.sku} · {r.reason} · {r.qty}개</div>
                                    </div>
                                    <span style={{ fontSize: 9, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}>불량 분리</span>
                                </div>
                            </div>
                        ))}
                        <div style={{ marginTop: 12, padding: '10px', background: 'rgba(239,68,68,0.06)', borderRadius: 8, fontSize: 11, color: 'var(--text-3)' }}>
                            불량품은 General Stock와 분리 보관. 제조사 클레임 처리 후 Revoke 또는 Count리 재입고.
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'list' && (
                <div className="card fade-up">
                    <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
                        {['all', ...Object.keys(RETURN_STATUS)].map(s => (
                            <button key={s} onClick={() => setStatusFilter(s)}
                                style={{ fontSize: 10, padding: '4px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700, background: statusFilter === s ? 'linear-gradient(135deg,#ef4444,#f97316)' : 'rgba(255,255,255,0.06)', color: statusFilter === s ? '#fff' : 'var(--text-3)' }}>
                                {s === 'all' ? 'All' : RETURN_STATUS[s]}
                            </button>
                        ))}
                        <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-3)', alignSelf: 'center' }}>{filtered.length} items</span>
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                        <thead><tr style={{ borderBottom: '1px solid rgba(99,140,255,0.15)' }}>
                            {['반품ID', 'Orders번호', 'SKU', 'Product Name', 'Channel', 'Quantity', '사유', '신청일', '운송장', '환불액', 'Status', 'WMS', '처리'].map(h => <th key={h} style={{ padding: '8px 4px', textAlign: 'left', fontSize: 10, color: 'var(--text-3)', fontWeight: 700 }}>{h}</th>)}
                        </tr></thead>
                        <tbody>
                            {filtered.map(r => (
                                <tr key={r.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: r.defective ? 'rgba(239,68,68,0.03)' : '' }}>
                                    <td style={{ fontFamily: 'monospace', fontSize: 10, color: '#ef4444', padding: '8px 4px' }}>{r.id}</td>
                                    <td style={{ fontFamily: 'monospace', fontSize: 10, padding: '8px 4px' }}>{r.orderId.slice(-6)}</td>
                                    <td style={{ fontFamily: 'monospace', fontSize: 10, padding: '8px 4px' }}>{r.sku.slice(0, 10)}</td>
                                    <td style={{ fontSize: 11, fontWeight: 600, padding: '8px 4px' }}>{r.name}</td>
                                    <td style={{ padding: '8px 4px' }}><span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: (CH_COLORS[r.channel] || '#64748b') + '18', color: CH_COLORS[r.channel] || '#64748b' }}>{r.channel}</span></td>
                                    <td style={{ textAlign: 'center', padding: '8px 4px' }}>{r.qty}</td>
                                    <td style={{ fontSize: 10, padding: '8px 4px' }}>{r.reason}</td>
                                    <td style={{ fontSize: 10, color: 'var(--text-3)', padding: '8px 4px' }}>{r.reqDate}</td>
                                    <td style={{ fontFamily: 'monospace', fontSize: 8, padding: '8px 4px', color: r.trackNo ? '#4f8ef7' : 'var(--text-3)' }}>{r.trackNo || '—'}</td>
                                    <td style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 11, padding: '8px 4px', color: '#a855f7' }}>{fmt(r.refundAmt)}</td>
                                    <td style={{ padding: '8px 4px' }}><span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: (STATUS_COLOR[r.status] || '#64748b') + '18', color: STATUS_COLOR[r.status] || '#64748b' }}>{RETURN_STATUS[r.status]}</span></td>
                                    <td style={{ padding: '8px 4px' }}>{r.wmsLinked ? <span style={{ fontSize: 9, color: '#22c55e', fontWeight: 700 }}>✅</span> : <span style={{ fontSize: 9, color: '#ef4444' }}>❌</span>}</td>
                                    <td style={{ padding: '8px 4px' }}>
                                        {!r.wmsLinked && r.status !== 'rejected' && (
                                            <button style={{ fontSize: 9, padding: '2px 8px', borderRadius: 7, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#22c55e,#16a34a)', color: '#fff', fontWeight: 700 }} onClick={() => handleWmsLink(r)}>WMS↑</button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {activeTab === 'portal' && (
                <div className="card fade-up">
                    <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 16 }}>🔗 소비자 반품 신청 포탈 Settings</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <div style={{ padding: '16px', background: 'rgba(79,142,247,0.06)', borderRadius: 12, border: '1px solid rgba(79,142,247,0.15)' }}>
                            <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 12 }}>📋 포탈 Settings</div>
                            {[['반품 가능 Period', '7일'], ['무상 반품 기준', '불량/Wrong Item'], ['반품 배송비 부담', '소비자 (Change of Mind)'], ['Auto 환불 조건', '검Count 통과 후 24Time 내']].map(([k, v]) => (
                                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: 11 }}>
                                    <span style={{ color: 'var(--text-3)' }}>{k}</span>
                                    <span style={{ fontWeight: 700 }}>{v}</span>
                                </div>
                            ))}
                        </div>
                        <div style={{ padding: '16px', background: 'rgba(34,197,94,0.06)', borderRadius: 12, border: '1px solid rgba(34,197,94,0.15)' }}>
                            <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 12 }}>⚡ Auto화 Settings</div>
                            {[
                                { label: '사유 Auto Classify (AI)', checked: true },
                                { label: 'WMS 반품입고 Auto Sync', checked: true },
                                { label: '환불 Auto 처리', checked: false },
                                { label: '불량품 Auto 분리', checked: true },
                                { label: 'Slack Notification (접Count 시)', checked: true },
                            ].map(opt => (
                                <div key={opt.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: 11 }}>
                                    <span>{opt.label}</span>
                                    <div style={{ width: 32, height: 18, borderRadius: 9, background: opt.checked ? '#22c55e' : 'rgba(255,255,255,0.1)', position: 'relative' }}>
                                        <div style={{ width: 14, height: 14, borderRadius: 7, background: '#fff', position: 'absolute', top: 2, left: opt.checked ? 16 : 2, transition: 'left 0.2s' }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'analytics' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }} className="fade-up">
                    <div className="card">
                        <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 12 }}>📊 Return Reason 분포</div>
                        {reasonDist.map(([reason, cnt]) => {
                            const pct = Math.round(cnt / returns.length * 100);
                            return (
                                <div key={reason} style={{ marginBottom: 10 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
                                        <span>{reason}</span><span style={{ fontWeight: 700, color: '#4f8ef7' }}>{cnt}건 ({pct}%)</span>
                                    </div>
                                    <div style={{ height: 6, background: 'rgba(255,255,255,0.07)', borderRadius: 4 }}>
                                        <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(135deg,#ef4444,#f97316)', borderRadius: 4 }} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <div className="card">
                        <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 12 }}>📡 Channelper 반품율</div>
                        {Object.entries(CH_COLORS).map(([ch, color]) => {
                            const chReturns = returns.filter(r => r.channel === ch);
                            if (!chReturns.length) return null;
                            const pct = Math.round(chReturns.length / returns.length * 100);
                            return (
                                <div key={ch} style={{ marginBottom: 10 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
                                        <span style={{ color, fontWeight: 700 }}>{ch}</span><span>{chReturns.length}건 ({pct}%)</span>
                                    </div>
                                    <div style={{ height: 6, background: 'rgba(255,255,255,0.07)', borderRadius: 4 }}>
                                        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 4, opacity: 0.8 }} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
