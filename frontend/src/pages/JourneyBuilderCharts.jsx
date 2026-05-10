import React, { memo } from 'react';
import { K, TRIGGER_CFG, CH_COLORS } from './JourneyBuilderConstants.js';

/* ── SVG Mini-Charts ─────────────────────────────────── */
export const DonutChart = memo(function DonutChart({ data, size = 150, thickness = 22, centerLabel, centerValue }) {
    const total = data.reduce((s, d) => s + d.value, 0) || 1;
    const r = (size - thickness) / 2, cx = size / 2, cy = size / 2, circ = 2 * Math.PI * r;
    let offset = 0;
    return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f1f5f9" strokeWidth={thickness} />
            {data.map((d, i) => { const p = d.value / total; const da = p * circ; const g = circ - da; const o = offset; offset += p; return (<circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={d.color} strokeWidth={thickness} strokeLinecap="round" strokeDasharray={`${da} ${g}`} strokeDashoffset={-o * circ} transform={`rotate(-90 ${cx} ${cy})`} style={{ transition: 'stroke-dasharray 0.8s cubic-bezier(.4,0,.2,1)' }} />); })}
            <text x={cx} y={cy - 6} textAnchor="middle" fill="#334155" fontSize="20" fontWeight="900">{centerValue}</text>
            <text x={cx} y={cy + 12} textAnchor="middle" fill="#94a3b8" fontSize="10" fontWeight="600">{centerLabel}</text>
        </svg>
    );
});
export const HBarChart = memo(function HBarChart({ items, maxValue }) {
    const mv = maxValue || Math.max(...items.map(i => i.value), 1);
    return (
        <div style={{ display: 'grid', gap: 10 }}>
            {items.map((item, i) => {
                const pct = Math.min(Math.round((item.value / mv) * 100), 100);
                return (
                    <div key={i}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3, fontSize: 12, fontWeight: 700, color: '#334155' }}>
                            <span style={{ maxWidth: '60%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</span>
                            <span style={{ fontWeight: 800, color: item.color || '#4f8ef7' }}>{item.displayValue || item.value}</span>
                        </div>
                        <div style={{ height: 8, borderRadius: 6, background: '#f1f5f9', overflow: 'hidden' }}>
                            <div style={{ width: pct + '%', height: '100%', borderRadius: 6, background: `linear-gradient(90deg,${item.color || '#4f8ef7'},${item.colorEnd || item.color || '#6366f1'})`, transition: 'width 0.8s' }} />
                        </div>
                    </div>
                );
            })}
        </div>
    );
});

/* ── Modal ────────────────────────────────────────────── */
export const Backdrop = ({ children, onClose }) => (
    <>
        <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(6px)', zIndex: 400 }} />
        <div onClick={e => e.stopPropagation()} style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 'min(94vw,680px)', maxHeight: '88vh', overflowY: 'auto', borderRadius: 20, border: '1px solid rgba(255,255,255,0.18)', padding: 32, boxShadow: '0 24px 64px rgba(0,0,0,0.18)', background: 'linear-gradient(180deg,#ffffff,#f8faff)', zIndex: 401 }}>
            {children}
        </div>
    </>
);

/* ── Flow Preview Component ──────────────────────────── */
export const FlowPreview = memo(function FlowPreview({ journey, tr }) {
    const steps = [
        { type: 'trigger', icon: TRIGGER_CFG[journey.trigger_type]?.icon || '⚡', label: tr(K.stepTrigger), detail: journey.trigger_label, color: TRIGGER_CFG[journey.trigger_type]?.color || '#4f8ef7' },
    ];
    if (journey.delay && journey.delay !== 'none') {
        steps.push({ type: 'delay', icon: '⏳', label: tr(K.stepDelay), detail: journey.delay_label, color: '#f59e0b' });
    }
    (journey.channels || []).forEach(ch => {
        steps.push({ type: 'action', icon: ch === 'email' ? '📧' : ch === 'kakao' ? '💬' : ch === 'sms' ? '📱' : ch === 'push' ? '🔔' : '💚', label: ch.toUpperCase(), detail: tr(K.stepAction), color: CH_COLORS[ch] || '#64748b' });
    });
    steps.push({ type: 'end', icon: '🏁', label: tr(K.stepEnd), detail: '', color: '#22c55e' });
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 0, overflowX: 'auto', padding: '8px 0' }}>
            {steps.map((s, i) => (
                <React.Fragment key={i}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 80, flexShrink: 0, padding: '8px 4px' }}>
                        <div style={{ width: 44, height: 44, borderRadius: 14, background: `${s.color}12`, border: `2px solid ${s.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, marginBottom: 6 }}>{s.icon}</div>
                        <div style={{ fontSize: 10, fontWeight: 800, color: s.color, textAlign: 'center' }}>{s.label}</div>
                        {s.detail && <div style={{ fontSize: 9, color: '#94a3b8', textAlign: 'center', marginTop: 2 }}>{s.detail}</div>}
                    </div>
                    {i < steps.length - 1 && <div style={{ width: 32, height: 2, background: `linear-gradient(90deg, ${s.color}40, ${steps[i + 1].color}40)`, flexShrink: 0, borderRadius: 1 }} />}
                </React.Fragment>
            ))}
        </div>
    );
});
