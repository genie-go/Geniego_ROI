import React, { useState, useRef } from 'react';

// ═══════════════════════════════════════════════════════════════════════
//  ChartUtils.jsx — 통일된 차트 컴포넌트
//  폰트 규칙: 축 라벨 11px / 값 라벨 11px / 그리드 11px (모두 동일)
// ═══════════════════════════════════════════════════════════════════════

export function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

export function fmt(n, { prefix = '', suffix = '', digits = 1 } = {}) {
    if (n == null) return '—';
    const abs = Math.abs(n);
    if (abs >= 1e9) return prefix + (n / 1e9).toFixed(digits) + 'B' + suffix;
    if (abs >= 1e6) return prefix + (n / 1e6).toFixed(digits) + 'M' + suffix;
    if (abs >= 1e3) return prefix + (n / 1e3).toFixed(digits) + 'K' + suffix;
    return prefix + Number(n).toFixed(digits) + suffix;
}

// 차트 공통 텍스트 속성 — 모두 11px로 통일
// 206차: 차트 SVG(viewBox)가 컨테이너 폭으로 확대 렌더되어 11px 축 라벨이 화면에서 ~16-20px로
//   커져 HTML 텍스트와 불일치. 9px로 축소해 확대 후 일반 텍스트(~11-13px)와 일관성 유지.
const FONT = { fontSize: 9, fontFamily: 'inherit', fontWeight: 500 };

// ── LineChart ─────────────────────────────────────────────────────────────
//  hover 크로스헤어 툴팁(채널명+수치) 지원. format(v)=축/툴팁 값 포맷(기본 fmt).
export function LineChart({ data, labels, series, width = 600, height = 180, format }) {
    const svgRef = useRef(null);
    const [hover, setHover] = useState(null); // hovered data index
    if (!data?.length) return null;
    const f = typeof format === 'function' ? format : (v) => fmt(v);
    const pad = { t: 16, r: 14, b: 34, l: 46 };
    const W = width - pad.l - pad.r;
    const H = height - pad.t - pad.b;
    const allVals = series.flatMap(s => data.map(d => d[s.key] ?? 0));
    const minV = Math.min(...allVals) * 0.92;
    const maxV = Math.max(...allVals) * 1.06;
    const xScale = i => (i / Math.max(1, data.length - 1)) * W;
    const yScale = v => H - ((v - minV) / (maxV - minV || 1)) * H;
    const gridLines = [0, 0.25, 0.5, 0.75, 1];

    // 마우스 위치 → 최근접 데이터 인덱스(viewBox 스케일 보정).
    const onMove = (e) => {
        const svg = svgRef.current; if (!svg) return;
        const rect = svg.getBoundingClientRect();
        const ux = (e.clientX - rect.left) / rect.width * width;   // user-space x
        const ratio = (ux - pad.l) / (W || 1);
        const idx = Math.round(clamp(ratio, 0, 1) * (data.length - 1));
        setHover(idx);
    };

    // 툴팁 행(선택 인덱스의 채널별 값) — 값 내림차순.
    let rows = [];
    if (hover != null && data[hover]) {
        rows = series.map(s => ({ name: s.name || s.key, color: s.color, value: data[hover][s.key] ?? 0 }))
            .sort((a, b) => b.value - a.value).slice(0, 8);
    }
    const tipW = Math.min(W - 8, Math.max(120, 30 + Math.max(...(rows.length ? rows.map(r => (r.name + f(r.value)).length) : [10])) * 5.4));
    const tipH = rows.length ? (rows.length + 1) * 14 + 10 : 0;
    let tipX = hover != null ? xScale(hover) + 12 : 0;
    if (tipX + tipW > W) tipX = xScale(hover) - tipW - 12;
    if (tipX < 0) tipX = 2;
    const tipY = 2;

    return (
        <svg ref={svgRef} width="100%" viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible', display: 'block' }}>
            <g transform={`translate(${pad.l},${pad.t})`}>
                {/* 그리드 */}
                {gridLines.map(t => {
                    const y = H * (1 - t);
                    const val = minV + t * (maxV - minV);
                    return (
                        <g key={t}>
                            <line x1={0} y1={y} x2={W} y2={y} stroke="var(--border)" strokeWidth={1} />
                            <text x={-8} y={y + 4} {...FONT} fill="var(--text-2)" textAnchor="end">{f(val)}</text>
                        </g>
                    );
                })}
                {/* X 축 라벨 */}
                {labels && data.map((_, i) => {
                    if (i % Math.ceil(data.length / 7) !== 0) return null;
                    return <text key={i} x={xScale(i)} y={H + 22} {...FONT} fill="var(--text-2)" textAnchor="middle">{labels[i]}</text>;
                })}
                <line x1={0} y1={H} x2={W} y2={H} stroke="var(--border)" />
                {/* 시리즈 */}
                {series.map(s => {
                    const pts = data.map((d, i) => `${xScale(i)},${yScale(d[s.key] ?? 0)}`);
                    const line = pts.join(' ');
                    const area = `${pts.join(' ')} ${xScale(data.length - 1)},${H} 0,${H}`;
                    return (
                        <g key={s.key}>
                            {s.area && <polygon points={area} fill={s.color} opacity={0.07} />}
                            <polyline points={line} fill="none" stroke={s.color} strokeWidth={s.width ?? 2.2} strokeLinejoin="round" strokeLinecap="round" />
                        </g>
                    );
                })}
                {/* hover 크로스헤어 + 포인트 */}
                {hover != null && data[hover] && (
                    <g pointerEvents="none">
                        <line x1={xScale(hover)} y1={0} x2={xScale(hover)} y2={H} stroke="var(--text-3)" strokeWidth={1} strokeDasharray="3,3" opacity={0.7} />
                        {series.map(s => (
                            <circle key={s.key} cx={xScale(hover)} cy={yScale(data[hover][s.key] ?? 0)} r={3} fill={s.color} stroke="#fff" strokeWidth={1} />
                        ))}
                    </g>
                )}
                {/* 툴팁 박스 */}
                {rows.length > 0 && (
                    <g pointerEvents="none" transform={`translate(${tipX},${tipY})`}>
                        <rect x={0} y={0} width={tipW} height={tipH} rx={7} fill="rgba(17,24,39,0.97)" stroke="rgba(255,255,255,0.22)" strokeWidth={1} />
                        {labels && labels[hover] != null && (
                            <text x={9} y={13} fontSize={9.5} fontWeight={800} fill="#f8fafc">{labels[hover]}</text>
                        )}
                        {rows.map((r, i) => {
                            const ry = 14 + (i + 1) * 14 - 4;
                            return (
                                <g key={r.name + i}>
                                    <circle cx={13} cy={ry - 3} r={3.2} fill={r.color} />
                                    <text x={22} y={ry} fontSize={9.5} fontWeight={700} fill="#f1f5f9">{r.name}</text>
                                    <text x={tipW - 9} y={ry} fontSize={9.5} fontWeight={900} fill="#ffffff" textAnchor="end">{f(r.value)}</text>
                                </g>
                            );
                        })}
                    </g>
                )}
                {/* 이벤트 캡처 오버레이(최상단) */}
                <rect x={0} y={0} width={W} height={H} fill="transparent"
                    onMouseMove={onMove} onMouseLeave={() => setHover(null)} style={{ cursor: 'crosshair' }} />
            </g>
        </svg>
    );
}

// ── BarChart ──────────────────────────────────────────────────────────────
export function BarChart({ data, xKey, yKey, color = '#4f8ef7', width = 400, height = 160 }) {
    if (!data?.length) return null;
    const pad = { t: 20, r: 10, b: 38, l: 38 };
    const W = width - pad.l - pad.r;
    const H = height - pad.t - pad.b;
    const maxV = Math.max(...data.map(d => d[yKey] ?? 0)) * 1.18;
    const gap = W / data.length;
    const bw = gap * 0.6;

    return (
        <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'hidden', display: 'block' }}>
            <g transform={`translate(${pad.l},${pad.t})`}>
                {[0.25, 0.5, 0.75, 1].map(t => (
                    <line key={t} x1={0} y1={H * (1 - t)} x2={W} y2={H * (1 - t)}
                        stroke="var(--border)" strokeWidth={1} strokeDasharray="3,4" />
                ))}
                {data.map((d, i) => {
                    const v = d[yKey] ?? 0;
                    const fc = Array.isArray(color) ? color[i % color.length] : color;
                    const bh = Math.max(2, (v / maxV) * H);
                    const x = i * gap + (gap - bw) / 2;
                    return (
                        <g key={i}>
                            {/* 막대 그라데이션 효과 */}
                            <rect x={x} y={H - bh} width={bw} height={bh} rx={4}
                                fill={fc} opacity={0.82} />
                            <rect x={x} y={H - bh} width={bw} height={Math.min(12, bh)} rx={4}
                                fill={fc} opacity={0.3} />
                            {/* 값 라벨 */}
                            <text x={x + bw / 2} y={H - bh - 5} {...FONT} fill="var(--text-2)" textAnchor="middle">{fmt(v)}</text>
                            {/* X 라벨 */}
                            <text x={x + bw / 2} y={H + 24} {...FONT} fill="var(--text-2)" textAnchor="middle">{d[xKey]}</text>
                        </g>
                    );
                })}
                <line x1={0} y1={H} x2={W} y2={H} stroke="var(--border)" />
            </g>
        </svg>
    );
}

// ── DonutChart ────────────────────────────────────────────────────────────
export function DonutChart({ data, size = 130, thickness = 24, label, sub }) {
    const total = data.reduce((s, d) => s + d.value, 0) || 1;
    const cx = size / 2, cy = size / 2, r = (size - thickness) / 2;
    const circ = 2 * Math.PI * r;
    let offset = 0;
    return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth={thickness} />
            {data.map((d, i) => {
                const dash = (d.value / total) * circ;
                const el = (
                    <circle key={i} cx={cx} cy={cy} r={r} fill="none"
                        stroke={d.color} strokeWidth={thickness}
                        strokeDasharray={`${Math.max(0, dash - 2.5)} ${circ - dash + 2.5}`}
                        strokeDashoffset={-offset + circ * 0.25} strokeLinecap="round" />
                );
                offset += dash;
                return el;
            })}
            {label && <text x={cx} y={cy - 4} textAnchor="middle" fontSize={size * 0.12} fontWeight="900" fill="var(--text-1, #111827)">{label}</text>}
            {sub && <text x={cx} y={cy + 14} textAnchor="middle" fontSize={size * 0.082} fill="var(--text-3, #9ca3af)">{sub}</text>}
        </svg>
    );
}

// ── Gauge (반원) ───────────────────────────────────────────────────────────
export function Gauge({ pct, color = '#4f8ef7', size = 100, label }) {
    const r = size * 0.38, cx = size / 2, cy = size * 0.62;
    const circ = Math.PI * r;
    const dash = (clamp(pct, 0, 100) / 100) * circ;
    const sw = size * 0.09;
    const lSize = Math.max(11, Math.round(size * 0.16));
    return (
        <svg width={size} height={size * 0.72} viewBox={`0 0 ${size} ${size * 0.72}`}>
            <path d={`M ${cx - r},${cy} A ${r},${r} 0 0 1 ${cx + r},${cy}`}
                fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth={sw} strokeLinecap="round" />
            <path d={`M ${cx - r},${cy} A ${r},${r} 0 0 1 ${cx + r},${cy}`}
                fill="none" stroke={color} strokeWidth={sw}
                strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
            {label && <text x={cx} y={cy - 2} textAnchor="middle"
                fontSize={lSize} fontWeight="900" fill={color}>{label}</text>}
        </svg>
    );
}

// ── Sparkline ─────────────────────────────────────────────────────────────
export function Spark({ data = [], color = '#4f8ef7', h = 36, w = 90, area = false }) {
    if (data.length < 2) return null;
    const mn = Math.min(...data), mx = Math.max(...data), rng = mx - mn || 1;
    const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - mn) / rng) * h}`).join(' ');
    const lx = w, ly = h - ((data[data.length - 1] - mn) / rng) * h;
    return (
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ overflow: 'visible' }}>
            {area && <polygon points={`${pts} ${w},${h} 0,${h}`} fill={color} opacity={0.1} />}
            <polyline points={pts} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            <circle cx={lx} cy={ly} r={3} fill={color} />
        </svg>
    );
}

// ── StackBar ──────────────────────────────────────────────────────────────
export function StackBar({ segments, height = 10, borderRadius = 6 }) {
    const total = segments.reduce((s, x) => s + x.value, 0) || 1;
    return (
        <div style={{ display: 'flex', height, borderRadius, overflow: 'hidden', gap: 1 }}>
            {segments.map((s, i) => (
                <div key={i} title={`${s.label}: ${fmt(s.value)}`}
                    style={{ flex: s.value / total, background: s.color, minWidth: 2, transition: 'flex 0.6s ease' }} />
            ))}
        </div>
    );
}

// ── seedSeries ────────────────────────────────────────────────────────────

