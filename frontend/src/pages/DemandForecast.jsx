import React, { useState, useMemo } from 'react';
import { useGlobalData } from '../context/GlobalDataContext';
import { useCurrency } from '../contexts/CurrencyContext.jsx';

// currency formatting via useCurrency fmt()
const fmtPct = v => (v >= 0 ? '+' : '') + v.toFixed(1) + '%';

/* Mock AI Demand Forecast 데이터 */
const FORECAST_DATA = [
    { sku: 'WH-1000XM5-01', name: 'Wireless Noise-Cancelling 헤드폰', currentStock: 142, safeQty: 50, forecastNext7: 68, forecastNext30: 290, trend: 12.4, confidence: 0.87, suggestedOrder: 200, cost: 45000, channels: { coupang: 102, naver: 78, amazon: 55, tiktok: 35 } },
    { sku: 'KB-MXM-RGB-02', name: 'RGB 기계식 키보드', currentStock: 89, safeQty: 30, forecastNext7: 45, forecastNext30: 190, trend: -3.2, confidence: 0.82, suggestedOrder: 150, cost: 72000, channels: { coupang: 88, naver: 52, amazon: 38, tiktok: 22 } },
    { sku: 'HC-USB4-7P-01', name: 'USB-C 7포트 허브', currentStock: 234, safeQty: 80, forecastNext7: 32, forecastNext30: 140, trend: 5.8, confidence: 0.91, suggestedOrder: 0, cost: 18000, channels: { coupang: 65, naver: 45, amazon: 20, tiktok: 10 } },
    { sku: 'CAM-4K-PRO-01', name: '4K 웹캠 Pro', currentStock: 56, safeQty: 40, forecastNext7: 28, forecastNext30: 120, trend: 8.9, confidence: 0.78, suggestedOrder: 100, cost: 58000, channels: { coupang: 55, naver: 38, amazon: 27, tiktok: 10 } },
    { sku: 'MS-ERG-BL-01', name: '에르고 마우스', currentStock: 167, safeQty: 60, forecastNext7: 55, forecastNext30: 230, trend: 2.1, confidence: 0.85, suggestedOrder: 80, cost: 28000, channels: { coupang: 92, naver: 68, amazon: 45, tiktok: 25 } },
    { sku: 'CH-60W-GAN-01', name: '60W 급속충전기', currentStock: 312, safeQty: 100, forecastNext7: 78, forecastNext30: 320, trend: 15.6, confidence: 0.93, suggestedOrder: 0, cost: 12000, channels: { coupang: 135, naver: 95, amazon: 58, tiktok: 42 } },
];

const WEEK_DATA = Array.from({ length: 8 }, (_, i) => ({
    week: `W${i + 1}`,
    actual: i < 5 ? [120, 145, 132, 158, 171][i] : null,
    forecast: [120, 148, 135, 162, 178, 195, 208, 220][i],
}));

const CHANNEL_COLORS = { coupang: '#ef4444', naver: '#22c55e', amazon: '#f97316', tiktok: '#a855f7' };

function MiniBarChart({ data, maxVal }) {
    return (
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 40 }}>
            {data.map((item, i) => (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                    {item.actual !== null && (
                        <div style={{ width: '100%', background: '#4f8ef7', height: Math.round((item.actual / maxVal) * 40), borderRadius: '2px 2px 0 0', opacity: 0.8 }} />
                    )}
                    {item.forecast !== null && item.actual === null && (
                        <div style={{ width: '100%', background: '#a855f7', height: Math.round((item.forecast / maxVal) * 40), borderRadius: '2px 2px 0 0', border: '1px dashed #a855f760', opacity: 0.6 }} />
                    )}
                    {item.actual === null && item.forecast !== null && null}
                </div>
            ))}
        </div>
    );
}

function ConfidenceBar({ confidence }) {
    const pct = Math.round(confidence * 100);
    const color = pct >= 85 ? '#22c55e' : pct >= 70 ? '#f97316' : '#ef4444';
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ flex: 1, height: 5, background: 'rgba(255,255,255,0.08)', borderRadius: 3 }}>
                <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 3, transition: 'width 0.5s' }} />
            </div>
            <span style={{ fontSize: 10, fontWeight: 700, color, minWidth: 32 }}>{pct}%</span>
        </div>
    );
}

export default function DemandForecast() {
    const { fmt } = useCurrency();
    const { supplyOrders, addSupplyOrder } = useGlobalData();
    const [selSku, setSelSku] = useState(null);
    const [autoMode, setAutoMode] = useState(false);
    const [orderConfirmed, setOrderConfirmed] = useState({});

    const needOrder = FORECAST_DATA.filter(d => d.currentStock <= d.safeQty * 1.5);
    const totalForecast30 = FORECAST_DATA.reduce((s, d) => s + d.forecastNext30, 0);

    const handleOrder = (item) => {
        addSupplyOrder({
            sku: item.sku, name: item.name, qty: item.suggestedOrder,
            supplier: 'AI Auto발주', unitCost: item.cost,
            eta: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
        });
        setOrderConfirmed(p => ({ ...p, [item.sku]: true }));
    };

    return (
        <div style={{ display: 'grid', gap: 20, padding: 4 }}>
            {/* Hero */}
            <div className="hero fade-up">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
                    <div>
                        <div className="hero-title" style={{ background: 'linear-gradient(135deg,#a855f7,#4f8ef7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                            🤖 AI Demand Forecast & Auto 발주
                        </div>
                        <div className="hero-desc">머신러닝 기반 Channel·SKUper Demand Forecast, 안전Stock 기반 Auto 발주 권고, WMS Auto Sync</div>
                        <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                            <span className="badge badge-purple">{FORECAST_DATA.length}개 SKU Analysis</span>
                            <span className="badge badge-red">⚡ 발주 필요 {needOrder.length}종</span>
                            <span className="badge badge-blue">30일 Forecast {totalForecast30.toLocaleString()}개</span>
                        </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
                        <div style={{ fontSize: 11, color: 'var(--text-3)' }}>Auto 발주 모드</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div onClick={() => setAutoMode(p => !p)} style={{ width: 44, height: 24, borderRadius: 12, background: autoMode ? '#22c55e' : 'rgba(255,255,255,0.1)', cursor: 'pointer', position: 'relative', transition: 'background 0.2s' }}>
                                <div style={{ width: 18, height: 18, borderRadius: 9, background: '#fff', position: 'absolute', top: 3, left: autoMode ? 23 : 3, transition: 'left 0.2s' }} />
                            </div>
                            <span style={{ fontSize: 11, fontWeight: 700, color: autoMode ? '#22c55e' : 'var(--text-3)' }}>{autoMode ? 'ON' : 'OFF'}</span>
                        </div>
                        {autoMode && <div style={{ fontSize: 10, color: '#22c55e', maxWidth: 160, textAlign: 'right' }}>안전Stock 이하 시 Auto으로 발주서 Create</div>}
                    </div>
                </div>
            </div>

            {/* KPI Card */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }} className="fade-up fade-up-1">
                {[
                    { l: '발주 필요 SKU', v: needOrder.length, c: '#ef4444' },
                    { l: '7일 Total Forecast', v: FORECAST_DATA.reduce((s, d) => s + d.forecastNext7, 0).toLocaleString() + '개', c: '#4f8ef7' },
                    { l: '30일 Total Forecast', v: totalForecast30.toLocaleString() + '개', c: '#a855f7' },
                    { l: 'Average Forecast 신뢰도', v: (FORECAST_DATA.reduce((s, d) => s + d.confidence, 0) / FORECAST_DATA.length * 100).toFixed(0) + '%', c: '#22c55e' },
                ].map(({ l, v, c }) => (
                    <div key={l} className="kpi-card" style={{ '--accent': c }}>
                        <div className="kpi-label">{l}</div>
                        <div className="kpi-value" style={{ color: c }}>{v}</div>
                    </div>
                ))}
            </div>

            {/* Demand Forecast Table */}
            <div className="card fade-up fade-up-2">
                <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 14 }}>📊 SKUper AI Demand Forecast</div>
                <table className="table">
                    <thead>
                        <tr>
                            <th>SKU</th><th>Product Name</th><th>현재Stock</th><th>안전Stock</th><th>7일Forecast</th><th>30일Forecast</th><th>Trend</th><th>신뢰도</th><th>권고발주</th><th>발주Cost</th><th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {FORECAST_DATA.map(d => {
                            const stockOk = d.currentStock > d.forecastNext30 * 1.1;
                            const stockLow = d.currentStock <= d.safeQty;
                            return (
                                <tr key={d.sku} style={{ background: stockLow ? 'rgba(239,68,68,0.04)' : '' }}>
                                    <td style={{ fontFamily: 'monospace', fontSize: 10, color: '#4f8ef7' }}>{d.sku}</td>
                                    <td style={{ fontSize: 11, fontWeight: 600 }}>
                                        {d.name}
                                        {stockLow && <span className="badge badge-red" style={{ fontSize: 8, marginLeft: 4 }}>Stock부족</span>}
                                    </td>
                                    <td style={{ textAlign: 'center', fontWeight: 700, color: stockLow ? '#ef4444' : '' }}>{d.currentStock}</td>
                                    <td style={{ textAlign: 'center', color: 'var(--text-3)' }}>{d.safeQty}</td>
                                    <td style={{ textAlign: 'center', fontWeight: 700, color: '#4f8ef7' }}>{d.forecastNext7}</td>
                                    <td style={{ textAlign: 'center', fontWeight: 700, color: '#a855f7' }}>{d.forecastNext30}</td>
                                    <td style={{ textAlign: 'center', fontWeight: 700, color: d.trend > 0 ? '#22c55e' : '#ef4444', fontSize: 11 }}>{fmtPct(d.trend)} {d.trend > 0 ? '↑' : '↓'}</td>
                                    <td style={{ minWidth: 100 }}><ConfidenceBar confidence={d.confidence} /></td>
                                    <td style={{ textAlign: 'center', fontWeight: 700, color: d.suggestedOrder > 0 ? '#f97316' : '#22c55e' }}>{d.suggestedOrder > 0 ? d.suggestedOrder + '개' : '충분'}</td>
                                    <td style={{ fontFamily: 'monospace', fontSize: 11 }}>{d.suggestedOrder > 0 ? fmt(d.suggestedOrder * d.cost) : '—'}</td>
                                    <td>
                                        {d.suggestedOrder > 0 && (
                                            orderConfirmed[d.sku] ? (
                                                <span style={{ fontSize: 10, color: '#22c55e', fontWeight: 700 }}>✅ 발주Done</span>
                                            ) : (
                                                <button style={{ fontSize: 10, padding: '3px 10px', borderRadius: 7, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#f97316,#ef4444)', color: '#fff', fontWeight: 700 }} onClick={() => handleOrder(d)}>
                                                    ⚡ Auto발주
                                                </button>
                                            )
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Channelper Demand 분포 */}
            <div className="card fade-up fade-up-3">
                <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 14 }}>📡 Channelper Demand 분포 (30일 Forecast)</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
                    {FORECAST_DATA.slice(0, 6).map(d => {
                        const total = Object.values(d.channels).reduce((a, b) => a + b, 0);
                        return (
                            <div key={d.sku} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 14, border: '1px solid rgba(255,255,255,0.06)' }}>
                                <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 10 }}>{d.name}</div>
                                {Object.entries(d.channels).map(([ch, qty]) => {
                                    const pct = Math.round(qty / total * 100);
                                    return (
                                        <div key={ch} style={{ marginBottom: 6 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginBottom: 3 }}>
                                                <span style={{ color: CHANNEL_COLORS[ch] || '#64748b', fontWeight: 700 }}>{ch}</span>
                                                <span style={{ color: 'var(--text-3)' }}>{qty}개 ({pct}%)</span>
                                            </div>
                                            <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 3 }}>
                                                <div style={{ width: `${pct}%`, height: '100%', background: CHANNEL_COLORS[ch] || '#64748b', borderRadius: 3 }} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* 발주 이력 */}
            {supplyOrders.length > 0 && (
                <div className="card fade-up">
                    <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 14 }}>📋 AI 발주 이력 ({supplyOrders.length}건)</div>
                    <table className="table">
                        <thead><tr><th>PO번호</th><th>SKU</th><th>Product</th><th>Quantity</th><th>공급사</th><th>발주일</th><th>입고예정</th><th>Total액</th><th>Status</th></tr></thead>
                        <tbody>
                            {supplyOrders.map(po => (
                                <tr key={po.id}>
                                    <td style={{ fontFamily: 'monospace', fontSize: 10, color: '#4f8ef7' }}>{po.id}</td>
                                    <td style={{ fontFamily: 'monospace', fontSize: 10 }}>{po.sku}</td>
                                    <td style={{ fontSize: 11 }}>{po.name}</td>
                                    <td style={{ textAlign: 'center' }}>{po.qty}</td>
                                    <td style={{ fontSize: 11 }}>{po.supplier}</td>
                                    <td style={{ fontSize: 10, color: 'var(--text-3)' }}>{po.orderDate}</td>
                                    <td style={{ fontSize: 10 }}>{po.eta}</td>
                                    <td style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 11 }}>{fmt(po.total)}</td>
                                    <td><span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: 'rgba(79,142,247,0.15)', color: '#4f8ef7' }}>{po.status}</span></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
