import React from 'react';

// ── 대시보드 공용 레이아웃 토큰 & 컴포넌트 ──────────────────────────────────
// 모든 대시보드(6개 뷰)가 동일한 규격을 공유합니다.

/** ─ 폰트 스케일 (px) ─ */
export const FS = {};

/** ─ 카드 공통 스타일 ─ */
export const CARD = {};

/** ─ 섹션 타이틀 공통 스타일 ─ */
export const CARD_TITLE = {};

/** ─ 그리드 행/열 간격 ─ */
export const GAP = 12;

// ────────────────────────────────────────────────────────────────────────────
// 초보자 흐름 안내 배너
// 각 대시보드 상단에 "이 화면은 무엇을 보여주나요?" 를 설명합니다.
// ────────────────────────────────────────────────────────────────────────────
export function FlowBanner({ icon, title, desc, steps }) {
    return (
        <div style={{
            background: 'linear-gradient(135deg, rgba(79,142,247,0.08) 0%, rgba(168,85,247,0.06) 100%)',
            border: '1px solid rgba(79,142,247,0.18)',
            borderRadius: 12,
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 14,
        }}>
            <div style={{ fontSize: 26, lineHeight: 1, flexShrink: 0 }}>{icon}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: FS.md, fontWeight: 800, color: 'var(--text-1)', marginBottom: 3 }}>{title}</div>
                <div style={{ fontSize: FS.sm, color: 'var(--text-3)', lineHeight: 1.5, marginBottom: steps ? 8 : 0 }}>{desc}</div>
                {steps && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        {steps.map((s, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <div style={{ background: 'rgba(79,142,247,0.15)', border: '1px solid rgba(79,142,247,0.3)', borderRadius: 8, padding: '3px 10px', fontSize: FS.xs, color: 'var(--text-1)', fontWeight: 700, whiteSpace: 'nowrap' }}>
                                    {i + 1}. {s}
                                </div>
                                {i < steps.length - 1 && <span style={{ color: 'var(--text-3)', fontSize: 14 }}>→</span>}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

// ────────────────────────────────────────────────────────────────────────────
// 상태 태그 (✅ 정상 / ⚠️ 주의 / 🔴 위험)
// ────────────────────────────────────────────────────────────────────────────
export function StatusTag({ status }) {
    const MAP = {};
    const s = MAP[status] || MAP.info;
    return (
        <span style={{ background: s.bg, border: `1px solid ${s.border}`, color: s.color, borderRadius: 8, padding: '2px 8px', fontSize: FS.xs, fontWeight: 700 }}>
            {s.label}
        </span>
    );
}

// ────────────────────────────────────────────────────────────────────────────
// 지표 맥락 박스 (목표 대비 현재 상황)
// ────────────────────────────────────────────────────────────────────────────
export function MetricContext({ items }) {
    return (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
            {items.map((item, i) => (
                <div key={i} style={{ fontSize: FS.xs, color: 'var(--text-3)', background: 'var(--surface)', borderRadius: 6, padding: '2px 8px' }}>
                    {item}
                </div>
            ))}
        </div>
    );
}

/** ─ 카드 래퍼 컴포넌트 ─ */
export function DCard({ children, style }) {
    return <div style={{ ...CARD, ...style }}>{children}</div>;
}

/** ─ 섹션 타이틀 컴포넌트 ─ */
export function DTitle({ children, style }) {
    return <div style={{ ...CARD_TITLE, ...style }}>{children}</div>;
}

/** ─ KPI 카드 (4열/5열/6열 공용) ─ */
export function DKpiCard({ icon, label, value, sub, change, color = '#4f8ef7', hint, children }) {
    return (
        <div style={{ ...CARD, display: 'flex', gap: 10, alignItems: 'flex-start', borderLeft: `3px solid ${color}60` }}>
            {icon && <div style={{ fontSize: 20, lineHeight: 1, flexShrink: 0, marginTop: 1 }}>{icon}</div>}
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: FS.xs, color: 'var(--text-3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 3 }}>{label}</div>
                <div style={{ fontSize: FS.kpi, fontWeight: 800, color, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.4px', lineHeight: 1.1 }}>{value}</div>
                {hint && <div style={{ fontSize: FS.xs, color: 'var(--text-3)', marginTop: 2 }}>{hint}</div>}
                {sub && <div style={{ fontSize: FS.xs, color: 'var(--text-3)', marginTop: 2 }}>{sub}</div>}
                {change != null && (
                    <div style={{ fontSize: FS.sm, color: change >= 0 ? '#22c55e' : '#ef4444', fontWeight: 700, marginTop: 3 }}>
                        {change >= 0 ? '▲' : '▼'} {Math.abs(change).toFixed(1)}%  전일 대비
                    </div>
                )}
                {children}
            </div>
        </div>
    );
}

/** ─ stat 행 (라벨 : 값 + 추세) ─ */
export function DRow({ label, value, valueColor, trend }) {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: FS.base }}>
            <span style={{ color: 'var(--text-3)' }}>{label}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, color: valueColor || 'rgba(255,255,255,0.85)' }}>
                <span>{value}</span>
                {trend != null && (
                    <span style={{ fontSize: FS.sm, color: trend >= 0 ? '#22c55e' : '#ef4444' }}>
                        {trend >= 0 ? '▲' : '▼'}{Math.abs(trend)}%
                    </span>
                )}
            </span>
        </div>
    );
}

/** ─ 선 범례 ─ */
export function DLegend({ items }) {
    return (
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 6 }}>
            {items.map(({ color, label }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: FS.sm, color: 'var(--text-3)' }}>
                    <div style={{ width: 18, height: 2, background: color, borderRadius: 2 }} />
                    {label}
                </div>
            ))}
        </div>
    );
}

/** ─ 점 범례 ─ */
export function DDotLegend({ items }) {
    return (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {items.map(({ color, label }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: FS.sm, color: 'var(--text-3)' }}>
                    <div style={{ width: 7, height: 7, borderRadius: 2, background: color, flexShrink: 0 }} />
                    {label}
                </div>
            ))}
        </div>
    );
}
