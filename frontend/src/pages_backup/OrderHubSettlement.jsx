import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n';
import { useGlobalData } from '../context/GlobalDataContext';
import { useCurrency } from '../contexts/CurrencyContext.jsx';

const CHANNELS = [
    { id: "shopify", name: "Shopify", icon: "🛒", color: "#96bf48" },
    { id: "amazon", name: "Amazon", icon: "📦", color: "#ff9900" },
    { id: "coupang", name: "Coupang", icon: "🇰🇷", color: "#00bae5" },
    { id: "naver", name: "Naver", icon: "🟢", color: "#03c75a" },
    { id: "11st", name: "11Street", icon: "🏬", color: "#ff0000" },
    { id: "tiktok", name: "TikTok Shop", icon: "🎵", color: "#ff0050" },
];
const ch = id => CHANNELS.find(c => c.id === id) || { name: id, icon: "🔌", color: "#4f8ef7" };

function Drawer({ children, onClose }) {
    React.useEffect(() => { const fn = e => { if (e.key === 'Escape') onClose(); }; window.addEventListener('keydown', fn); return () => window.removeEventListener('keydown', fn); }, [onClose]);
    return (<>
        <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', zIndex: 200 }} />
        <div style={{ position: 'fixed', right: 0, top: 0, bottom: 0, width: 520, background: 'linear-gradient(180deg,var(--surface),#090f1e)', borderLeft: '1px solid rgba(99,140,255,0.2)', zIndex: 201, overflowY: 'auto', padding: 26, animation: 'slideIn 0.25s cubic-bezier(.4,0,.2,1)' }}>
            {children}
            <style>{`@keyframes slideIn{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>
    </>
    </div>
);
}

export default function EnhancedSettlementTab() {
    const { t } = useI18n();
    const { settlement, approveSettlement, settlementStats } = useGlobalData();
    const { fmt } = useCurrency();
    const navigate = useNavigate();
    const records = settlement || [];
    const [detail, setDetail] = useState(null);
    const [approvalLog, setApprovalLog] = useState([]);

    const kpis = useMemo(() => ({
        gross: records.reduce((s, r) => s + (r.grossSales || 0), 0),
        fee: records.reduce((s, r) => s + (r.platformFee || 0), 0),
        net: records.reduce((s, r) => s + (r.netPayout || 0), 0),
        settled: records.filter(r => r.status === 'settled').length,
        pending: records.filter(r => r.status !== 'settled').length,
    }), [records]);

    const handleApprove = (channel, period) => {
        approveSettlement(channel, period);
        setApprovalLog(prev => [{ channel, period, at: new Date().toLocaleString('ko-KR', { hour12: false }), by: 'Admin' }, ...prev]);
        setDetail(prev => prev ? { ...prev, status: 'settled' } : null);
    };

    const fmtN = n => fmt ? fmt(n) : `₩${(n || 0).toLocaleString()}`;

    return (
        <div style={{ display: 'grid', gap: 14 }}>
            {/* ── Settlement Bridge Banner ── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, padding: '14px 18px', borderRadius: 12, background: 'linear-gradient(135deg,rgba(168,85,247,0.08),rgba(79,142,247,0.06))', border: '1px solid rgba(168,85,247,0.2)' }}>
                <div>
                    <div style={{ fontWeight: 800, fontSize: 13, color: '#c084fc' }}>💰 {t('orderHub.settleBridgeTitle', '정산 관리 센터')}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{t('orderHub.settleBridgeDesc', '상세 정산 관리·대사(Reconciliation) 기능은 전용 모듈에서 확인하세요.')}</div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                    <button onClick={() => navigate('/settlements')} style={{ padding: '7px 16px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#a855f7,#7c3aed)', color: 'var(--text-1)', fontWeight: 700, fontSize: 11, cursor: 'pointer', boxShadow: '0 2px 10px rgba(168,85,247,0.3)' }}>📋 {t('orderHub.settleBridgeBtnMgmt', '정산 관리')} →</button>
                    <button onClick={() => navigate('/reconciliation')} style={{ padding: '7px 16px', borderRadius: 8, border: '1px solid rgba(168,85,247,0.3)', background: 'transparent', color: '#c084fc', fontWeight: 700, fontSize: 11, cursor: 'pointer' }}>💰 {t('orderHub.settleBridgeBtnRecon', '대사/Recon')} →</button>
            </div>
            {/* KPIs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
                {[
                    { l: t('orderHub.settleGross'), v: fmtN(kpis.gross), c: '#4f8ef7' },
                    { l: t('orderHub.settleFee'), v: fmtN(kpis.fee), c: '#ef4444' },
                    { l: t('orderHub.settleNet'), v: fmtN(kpis.net), c: '#22c55e' },
                    { l: t('orderHub.settleApproved'), v: `${kpis.settled}`, c: '#14d9b0' },
                    { l: t('orderHub.settleUnapproved'), v: `${kpis.pending}`, c: '#eab308' },
                ].map(({ l, v, c }) => (
                    <div key={l} className="kpi-card" style={{ '--accent': c, padding: '12px 14px' }}>
                        <div className="kpi-label">{l}</div>
                        <div className="kpi-value" style={{ color: c, fontSize: 18 }}>{v}</div>
                ))}

            {/* Table */}
            <table className="table">
                <thead><tr><th>{t('orderHub.enhColChannel')}</th><th>{t('orderHub.settlePeriod')}</th><th>{t('orderHub.settleGross')}</th><th>{t('orderHub.settleFee')}</th><th>{t('orderHub.settleNet')}</th><th>{t('orderHub.settleStatusLabel')}</th><th>{t('orderHub.settleAction')}</th></tr></thead>
                <tbody>
                    {records.map(s => (
                        <tr key={s.id}>
                            <td>{ch(s.channel).icon} {ch(s.channel).name}</td>
                            <td>{s.period}</td>
                            <td style={{ fontFamily: 'monospace' }}>{fmtN(s.grossSales)}</td>
                            <td style={{ fontFamily: 'monospace', color: '#ef4444' }}>-{fmtN(s.platformFee)}</td>
                            <td style={{ fontFamily: 'monospace', color: '#22c55e', fontWeight: 700 }}>{fmtN(s.netPayout)}</td>
                            <td>
                                <span className={`badge ${s.status === 'settled' ? 'badge-green' : 'badge-yellow'}`} style={{ fontSize: 9 }}>
                                    {s.status === 'settled' ? t('orderHub.settleApprDone') : t('orderHub.settleApprPending')}
                                </span>
                            </td>
                            <td style={{ display: 'flex', gap: 4 }}>
                                <button className="btn-ghost" style={{ fontSize: 10, padding: '3px 8px' }} onClick={() => setDetail(s)}>{t('orderHub.btnDetail')}</button>
                                {s.status !== 'settled' && (
                                    <button onClick={() => handleApprove(s.channel, s.period)}
                                        style={{ padding: '3px 10px', borderRadius: 6, border: 'none', background: 'linear-gradient(135deg,#22c55e,#16a34a)', color: 'var(--text-1)', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>
                                        {t('orderHub.settleApproveBtn')}
                                    </button>
                                )}
                            </td>
                        </tr>
                    ))}
                    {records.length === 0 && <tr><td colSpan="7" style={{ textAlign: 'center', padding: 20 }}>{t('orderHub.noData')}</td></tr>}
                </tbody>
            </table>

            {/* Approval Log */}
            {approvalLog.length > 0 && (
                <div className="card" style={{ padding: 14 }}>
                    <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 10 }}>{t('orderHub.settleApprLog')}</div>
                    {approvalLog.map((log, i) => (
                        <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 11 }}>
                            <span style={{ color: '#22c55e' }}>✅</span>
                            <span style={{ fontWeight: 600 }}>{ch(log.channel).name}</span>
                            <span style={{ color: 'var(--text-3)' }}>{log.period}</span>
                            <span style={{ color: 'var(--text-3)', marginLeft: 'auto' }}>{log.at} · {log.by}</span>
                    ))}
            )}

            {/* Detail Drawer */}
            {detail && (
                <Drawer onClose={() => setDetail(null)}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                        <div style={{ fontWeight: 900, fontSize: 15, color: '#4f8ef7' }}>{ch(detail.channel).icon} {ch(detail.channel).name}</div>
                        <button className="btn-ghost" style={{ padding: '5px 10px' }} onClick={() => setDetail(null)}>✕</button>
                    {[[t('orderHub.settlePeriod'), detail.period], [t('orderHub.settleGross'), fmtN(detail.grossSales)], [t('orderHub.settleFee'), fmtN(detail.platformFee)], [t('orderHub.settleAdFee'), fmtN(detail.adFee || 0)], [t('orderHub.settleCoupon'), fmtN(detail.couponDiscount || 0)], [t('orderHub.settleReturnFee'), fmtN(detail.returnFee || 0)], [t('orderHub.settleNet'), fmtN(detail.netPayout)], [t('orderHub.settleStatusLabel'), detail.status === 'settled' ? t('orderHub.settleApprDone') : t('orderHub.settleApprPending')]].map(([l, v]) => (
                        <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(99,140,255,0.07)', fontSize: 12 }}>
                            <span style={{ color: 'var(--text-3)' }}>{l}</span><span style={{ fontWeight: 600 }}>{v}</span>
                    ))}
                    {/* Progress Bar */}
                    <div style={{ marginTop: 16 }}>
                        <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4 }}>{t('orderHub.settleFeeRatio')}</div>
                        <div style={{ height: 8, background: 'var(--border)', borderRadius: 4 }}>
                            <div style={{ width: `${detail.grossSales > 0 ? (detail.platformFee / detail.grossSales * 100) : 0}%`, height: '100%', background: 'linear-gradient(90deg,#ef4444,#f97316)', borderRadius: 4, transition: 'width 0.6s' }} />
                        <div style={{ fontSize: 9, color: 'var(--text-3)', marginTop: 2 }}>{detail.grossSales > 0 ? (detail.platformFee / detail.grossSales * 100).toFixed(1) : 0}%</div>
                    {/* Approve Button */}
                    {detail.status !== 'settled' && (
                        <button onClick={() => handleApprove(detail.channel, detail.period)}
                            style={{ marginTop: 20, width: '100%', padding: '12px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#22c55e,#16a34a)', color: 'var(--text-1)', fontSize: 14, fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 20px rgba(34,197,94,0.3)' }}>
                            {t('orderHub.settleApproveAll')}
                        </button>
                    )}
                </Drawer>
            )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
      </div>
);
}
