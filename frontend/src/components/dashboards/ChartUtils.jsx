import React, { useState, useRef } from 'react';

// ═══════════════════════════════════════════════════════════════════════
//  ChartUtils.jsx — 통일된 차트 컴포넌트
//  폰트 규칙: 축 라벨 11px / 값 라벨 11px / 그리드 11px (모두 동일)
// ═══════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════
//  [283차 P0] 리포트 시각화 타입 — 프론트 단일 소스(SSOT).
//  백엔드 정본은 Reports.php `Reports::VIZ_TYPES` 이며 두 목록은 반드시 동일해야 한다.
//  과거 3회(R2·282차 R3·본 차수) 백엔드 화이트리스트가 뒤처져 저장 시 무음 'table' 강등이 발생했다.
//  이제 백엔드는 미지원 viz 를 422 로 거부하고, savedList 가 viz_types 를 내려주므로
//  ReportBuilder 가 아래 목록과 대조해 불일치를 콘솔 경고한다. ★신규 차트는 양쪽 동시 갱신 필수.
// ═══════════════════════════════════════════════════════════════════════
export const REPORT_VIZ_TYPES = ['table', 'bar', 'line', 'donut', 'stacked', 'combo', 'area', 'heatmap', 'scatter', 'treemap'];
// 단일 차원 전용 차트(2차 차원=피벗이면 표/히트맵으로 안내). heatmap 은 반대로 breakdown 필수.
export const REPORT_FLAT_VIZ = ['bar', 'line', 'donut', 'stacked', 'combo', 'area', 'scatter', 'treemap'];
export const REPORT_VIZ_ICONS = {
    table: '📋', bar: '📊', line: '📈', donut: '🍩', stacked: '🧱',
    combo: '🔀', area: '🏔️', heatmap: '🔥', scatter: '✴️', treemap: '🗂️',
};

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
const FONT = { fontSize: 10, fontFamily: 'inherit', fontWeight: 500 };

// ── LineChart ─────────────────────────────────────────────────────────────
//  hover 크로스헤어 툴팁(채널명+수치) 지원. format(v)=축/툴팁 값 포맷(기본 fmt).
export function LineChart({ data, labels, series, width = 600, height = 180, format }) {
    const svgRef = useRef(null);
    const [hover, setHover] = useState(null); // hovered data index
    const [hoverY, setHoverY] = useState(null); // [225차] 커서 Y(그룹좌표) — 가장 가까운 채널 선 식별용
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

    // 마우스 위치 → 최근접 데이터 인덱스(viewBox 스케일 보정) + 그룹좌표 Y(가장 가까운 선 식별).
    const onMove = (e) => {
        const svg = svgRef.current; if (!svg) return;
        const rect = svg.getBoundingClientRect();
        const ux = (e.clientX - rect.left) / rect.width * width;   // user-space x
        const uy = (e.clientY - rect.top) / rect.height * height;  // user-space y
        const ratio = (ux - pad.l) / (W || 1);
        const idx = Math.round(clamp(ratio, 0, 1) * (data.length - 1));
        setHover(idx);
        setHoverY(uy - pad.t); // translate(pad.l,pad.t) 그룹 내부 좌표로 보정
    };

    // [225차] 커서 Y에 가장 가까운 채널 선 = 사용자가 가리키는 선. "어떤 채널인지" 식별 강조용.
    let nearestKey = null;
    if (hover != null && data[hover] && hoverY != null) {
        let best = Infinity;
        series.forEach(s => {
            const dy = Math.abs(yScale(data[hover][s.key] ?? 0) - hoverY);
            if (dy < best) { best = dy; nearestKey = s.key; }
        });
    }

    // 툴팁 행(선택 인덱스의 채널별 값) — 값 내림차순. hot=커서가 가리키는 선.
    let rows = [];
    if (hover != null && data[hover]) {
        rows = series.map(s => ({ key: s.key, name: s.name || s.key, color: s.color, value: data[hover][s.key] ?? 0, hot: s.key === nearestKey }))
            .sort((a, b) => b.value - a.value).slice(0, 8);
    }
    // [225차] 채널명(좌)·값(우) 겹침 방지: 한글 폭(≈10.5px)·라틴 폭(≈6px)을 글자별로 추정해 필요한 폭 산출.
    //   기존엔 (name+value).length*5.4 로 한글 폭을 과소추정 + W-8 로 좁게 클램프 → 긴 채널명/통화값에서 중첩.
    //   svg overflow:visible 라 W 초과 허용(tipX 플립으로 화면 내 위치). 가독 상한 320.
    const _tw = (s) => { let w = 0; for (const ch of String(s)) { w += /[ᄀ-퟿　-〿＀-￯]/.test(ch) ? 10.5 : 6; } return w; };
    const _rowNeed = (r) => 22 + _tw(r.name) + 14 + _tw(f(r.value)) + 10; // name시작22 + 이름폭 + 간격14 + 값폭 + 우패딩10
    const _headNeed = (labels && hover != null && labels[hover] != null) ? (9 + _tw(String(labels[hover])) + 10) : 0;
    const tipW = rows.length ? Math.max(130, Math.min(320, Math.max(_headNeed, ...rows.map(_rowNeed)))) : 0;
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
                        {series.map(s => {
                            const isHot = s.key === nearestKey;
                            return (
                                <circle key={s.key} cx={xScale(hover)} cy={yScale(data[hover][s.key] ?? 0)}
                                    r={isHot ? 5.5 : 3} fill={s.color} stroke="#fff" strokeWidth={isHot ? 2 : 1}
                                    opacity={nearestKey && !isHot ? 0.45 : 1} />
                            );
                        })}
                    </g>
                )}
                {/* 툴팁 박스 */}
                {rows.length > 0 && (
                    <g pointerEvents="none" transform={`translate(${tipX},${tipY})`}>
                        <rect x={0} y={0} width={tipW} height={tipH} rx={7} fill="rgba(17,24,39,0.97)" stroke="rgba(255,255,255,0.22)" strokeWidth={1} />
                        {labels && labels[hover] != null && (
                            <text className="chart-tip-text" x={9} y={13} fontSize={9.5} fontWeight={800} fill="#f8fafc">{labels[hover]}</text>
                        )}
                        {rows.map((r, i) => {
                            const ry = 14 + (i + 1) * 14 - 4;
                            return (
                                <g key={r.name + i}>
                                    {/* [225차] 커서가 가리키는 채널 행 강조(어떤 채널인지 즉시 식별) */}
                                    {r.hot && <rect x={4} y={ry - 11} width={tipW - 8} height={14} rx={4} fill={r.color} opacity={0.28} />}
                                    <circle cx={13} cy={ry - 3} r={r.hot ? 4 : 3.2} fill={r.color} />
                                    <text className="chart-tip-text" x={22} y={ry} fontSize={r.hot ? 10.5 : 9.5} fontWeight={r.hot ? 900 : 700} fill="#f1f5f9">{r.name}</text>
                                    <text className="chart-tip-text" x={tipW - 9} y={ry} fontSize={r.hot ? 10.5 : 9.5} fontWeight={900} fill="#ffffff" textAnchor="end">{f(r.value)}</text>
                                </g>
                            );
                        })}
                    </g>
                )}
                {/* 이벤트 캡처 오버레이(최상단) */}
                <rect x={0} y={0} width={W} height={H} fill="transparent"
                    onMouseMove={onMove} onMouseLeave={() => { setHover(null); setHoverY(null); }} style={{ cursor: 'crosshair' }} />
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

// ── StackedBarChart ────────────────────────────────────────────────────────
//  [현 차수 BI확장] 수직 누적 막대 — x=dim, 각 series(선택 지표 또는 2차원값)를 색으로 쌓음. Tableau 격차 축소.
//  단일축 규칙 준수(모든 세그먼트 동일 y스케일). 세그먼트 간 2px surface gap. 값 라벨은 hover(<title>)로만.
export function StackedBarChart({ data, xKey, series, width = 680, height = 260, format }) {
    if (!data?.length || !series?.length) return null;
    const f = typeof format === 'function' ? format : (v) => fmt(v);
    const pad = { t: 16, r: 12, b: 40, l: 48 };
    const W = width - pad.l - pad.r;
    const H = height - pad.t - pad.b;
    const totals = data.map(d => series.reduce((s, ser) => s + Math.max(0, Number(d[ser.key] ?? 0)), 0));
    const maxV = Math.max(1, ...totals) * 1.12;
    const gap = W / data.length;
    const bw = Math.min(48, gap * 0.62);
    const yScale = v => (v / maxV) * H;
    const gridT = [0, 0.25, 0.5, 0.75, 1];
    return (
        <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'hidden', display: 'block' }}>
            <g transform={`translate(${pad.l},${pad.t})`}>
                {gridT.map(t => (
                    <g key={t}>
                        <line x1={0} y1={H * (1 - t)} x2={W} y2={H * (1 - t)} stroke="var(--border)" strokeWidth={1} strokeDasharray="3,4" />
                        <text x={-8} y={H * (1 - t) + 4} {...FONT} fill="var(--text-2)" textAnchor="end">{f(maxV * t)}</text>
                    </g>
                ))}
                {data.map((d, i) => {
                    const x = i * gap + (gap - bw) / 2;
                    let acc = 0;
                    return (
                        <g key={i}>
                            {series.map((ser, si) => {
                                const v = Math.max(0, Number(d[ser.key] ?? 0));
                                const segH = yScale(v);
                                if (segH <= 0) return null;
                                const y = H - acc - segH;
                                acc += segH;
                                return (
                                    <rect key={ser.key} x={x} y={y} width={bw} height={Math.max(0, segH - 2)} rx={si === series.length - 1 ? 4 : 2}
                                        fill={ser.color} opacity={0.9}>
                                        <title>{`${d[xKey]} · ${ser.name || ser.key}: ${f(v)}`}</title>
                                    </rect>
                                );
                            })}
                            <text x={x + bw / 2} y={H + 22} {...FONT} fill="var(--text-2)" textAnchor="middle">{d[xKey]}</text>
                        </g>
                    );
                })}
                <line x1={0} y1={H} x2={W} y2={H} stroke="var(--border)" />
            </g>
        </svg>
    );
}

// ── AreaChart ──────────────────────────────────────────────────────────────
//  [현 차수 BI확장] 면적 차트 — LineChart 코어 재사용(area 강제). 시계열 추세의 누적감 표현.
export function AreaChart({ data, labels, series, width = 720, height = 240, format }) {
    if (!data?.length || !series?.length) return null;
    const areaSeries = series.map(s => ({ ...s, area: true }));
    return <LineChart data={data} labels={labels} series={areaSeries} width={width} height={height} format={format} />;
}

// ── ComboChart (bar + line, 단일 y축) ───────────────────────────────────────
//  [현 차수 BI확장] 막대+선 콤보. ★단일축 규칙 준수 — 막대·선 모두 동일 y스케일(이중축 금지, dataviz 원칙).
//  용례: 같은 지표를 막대(값)+선(추세/이동평균)으로 병기, 또는 동일 스케일대의 두 지표.
export function ComboChart({ data, xKey, barKey, lineKey, barColor = '#4f8ef7', lineColor = '#f59e0b', barName, lineName, width = 680, height = 260, format }) {
    if (!data?.length) return null;
    const f = typeof format === 'function' ? format : (v) => fmt(v);
    const pad = { t: 16, r: 14, b: 40, l: 48 };
    const W = width - pad.l - pad.r;
    const H = height - pad.t - pad.b;
    const vals = data.flatMap(d => [Number(d[barKey] ?? 0), lineKey ? Number(d[lineKey] ?? 0) : 0]);
    const maxV = Math.max(1, ...vals) * 1.12;
    const gap = W / data.length;
    const bw = Math.min(46, gap * 0.55);
    const yScale = v => H - (v / maxV) * H;
    const gridT = [0, 0.25, 0.5, 0.75, 1];
    const linePts = lineKey ? data.map((d, i) => `${i * gap + gap / 2},${yScale(Number(d[lineKey] ?? 0))}`).join(' ') : '';
    return (
        <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'hidden', display: 'block' }}>
            <g transform={`translate(${pad.l},${pad.t})`}>
                {gridT.map(t => (
                    <g key={t}>
                        <line x1={0} y1={H * (1 - t)} x2={W} y2={H * (1 - t)} stroke="var(--border)" strokeWidth={1} strokeDasharray="3,4" />
                        <text x={-8} y={H * (1 - t) + 4} {...FONT} fill="var(--text-2)" textAnchor="end">{f(maxV * t)}</text>
                    </g>
                ))}
                {data.map((d, i) => {
                    const v = Number(d[barKey] ?? 0);
                    const bh = Math.max(0, (v / maxV) * H);
                    const x = i * gap + (gap - bw) / 2;
                    return (
                        <g key={i}>
                            <rect x={x} y={H - bh} width={bw} height={bh} rx={4} fill={barColor} opacity={0.85}>
                                <title>{`${d[xKey]} · ${barName || barKey}: ${f(v)}`}</title>
                            </rect>
                            <text x={i * gap + gap / 2} y={H + 22} {...FONT} fill="var(--text-2)" textAnchor="middle">{d[xKey]}</text>
                        </g>
                    );
                })}
                {lineKey && <polyline points={linePts} fill="none" stroke={lineColor} strokeWidth={2.2} strokeLinejoin="round" strokeLinecap="round" />}
                {lineKey && data.map((d, i) => (
                    <circle key={i} cx={i * gap + gap / 2} cy={yScale(Number(d[lineKey] ?? 0))} r={3.2} fill={lineColor} stroke="var(--surface)" strokeWidth={1.5}>
                        <title>{`${d[xKey]} · ${lineName || lineKey}: ${f(Number(d[lineKey] ?? 0))}`}</title>
                    </circle>
                ))}
                <line x1={0} y1={H} x2={W} y2={H} stroke="var(--border)" />
            </g>
        </svg>
    );
}

// ── Heatmap ────────────────────────────────────────────────────────────────
//  [현 차수 BI확장] 히트맵 — 2D(행×열) 강도맵. 순차 스케일(단일 hue, 값→불투명도) → 명/암 테마 모두 안전.
//  matrix[r][c] 숫자. rows/cols = 라벨 배열. dim×breakdown 피벗 시각화에 최적.
export function Heatmap({ rows, cols, matrix, color = '#4f8ef7', width = 720, cellH = 30, rowLabelW = 110, format }) {
    if (!rows?.length || !cols?.length) return null;
    const f = typeof format === 'function' ? format : (v) => fmt(v);
    let maxV = 0;
    matrix.forEach(r => r.forEach(v => { const n = Number(v ?? 0); if (n > maxV) maxV = n; }));
    maxV = maxV || 1;
    const gridW = Math.max(60, width - rowLabelW - 8);
    const cw = gridW / cols.length;
    const H = rows.length * cellH + 26; // + column header row
    return (
        <div style={{ overflowX: 'auto' }}>
            <svg width="100%" viewBox={`0 0 ${width} ${H}`} style={{ display: 'block', minWidth: Math.max(width, rowLabelW + cols.length * 44) }}>
                {/* 열 헤더 */}
                {cols.map((c, ci) => (
                    <text key={ci} x={rowLabelW + ci * cw + cw / 2} y={16} {...FONT} fill="var(--text-2)" textAnchor="middle">{String(c).length > 8 ? String(c).slice(0, 7) + '…' : c}</text>
                ))}
                {rows.map((r, ri) => (
                    <g key={ri}>
                        <text x={rowLabelW - 8} y={26 + ri * cellH + cellH / 2 + 4} {...FONT} fill="var(--text-2)" textAnchor="end">{String(r).length > 14 ? String(r).slice(0, 13) + '…' : r}</text>
                        {cols.map((c, ci) => {
                            const v = Number(matrix?.[ri]?.[ci] ?? 0);
                            const op = maxV > 0 ? 0.12 + 0.78 * (v / maxV) : 0.12; // 순차: 값→불투명도(0.12~0.9)
                            return (
                                <g key={ci}>
                                    <rect x={rowLabelW + ci * cw + 1} y={26 + ri * cellH + 1} width={Math.max(1, cw - 2)} height={cellH - 2} rx={3}
                                        fill={color} opacity={v > 0 ? op : 0.04} stroke="var(--surface)" strokeWidth={1}>
                                        <title>{`${r} · ${c}: ${f(v)}`}</title>
                                    </rect>
                                    {cw > 34 && v > 0 && (
                                        <text x={rowLabelW + ci * cw + cw / 2} y={26 + ri * cellH + cellH / 2 + 3.5} fontSize={8.5} fontFamily="inherit" fontWeight={600}
                                            fill={op > 0.55 ? '#fff' : 'var(--text-1)'} textAnchor="middle">{f(v)}</text>
                                    )}
                                </g>
                            );
                        })}
                    </g>
                ))}
            </svg>
        </div>
    );
}

// ── ScatterChart ─────────────────────────────────────────────────────────
// [282차 R3] 산점도 — 두 지표 상관(예: 광고비 vs 매출·가격 vs 판매량). 의존성 없는 SVG.
//   points: [{x, y, label?, color?, r?}]. 선택적 회귀추세선(trend). 축 자동 스케일.
export function ScatterChart({ points = [], width = 640, height = 300, xLabel = '', yLabel = '', color = '#4f8ef7', trend = false, format }) {
    if (!points.length) return null;
    const f = typeof format === 'function' ? format : (v) => fmt(v);
    const padL = 48, padB = 30, padT = 12, padR = 12;
    const xs = points.map(p => Number(p.x) || 0), ys = points.map(p => Number(p.y) || 0);
    let xmin = Math.min(...xs), xmax = Math.max(...xs), ymin = Math.min(...ys), ymax = Math.max(...ys);
    if (xmin === xmax) { xmin -= 1; xmax += 1; } if (ymin === ymax) { ymin -= 1; ymax += 1; }
    const plotW = width - padL - padR, plotH = height - padT - padB;
    const sx = (v) => padL + ((v - xmin) / (xmax - xmin)) * plotW;
    const sy = (v) => padT + plotH - ((v - ymin) / (ymax - ymin)) * plotH;
    // 최소제곱 회귀선(옵션)
    let line = null;
    if (trend && points.length >= 2) {
        const n = points.length, mx = xs.reduce((a, b) => a + b, 0) / n, my = ys.reduce((a, b) => a + b, 0) / n;
        let num = 0, den = 0; for (let i = 0; i < n; i++) { num += (xs[i] - mx) * (ys[i] - my); den += (xs[i] - mx) ** 2; }
        if (den !== 0) { const b = num / den, a = my - b * mx; line = { x1: sx(xmin), y1: sy(a + b * xmin), x2: sx(xmax), y2: sy(a + b * xmax) }; }
    }
    const ticks = 4;
    return (
        <div style={{ overflowX: 'auto' }}>
            <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block', minWidth: 320 }}>
                {Array.from({ length: ticks + 1 }, (_, i) => {
                    const gy = padT + (plotH / ticks) * i, val = ymax - ((ymax - ymin) / ticks) * i;
                    return (<g key={i}><line x1={padL} y1={gy} x2={width - padR} y2={gy} stroke="var(--border)" strokeWidth={0.5} opacity={0.5} />
                        <text x={padL - 5} y={gy + 3} {...FONT} fill="var(--text-2)" textAnchor="end">{f(val)}</text></g>);
                })}
                {Array.from({ length: ticks + 1 }, (_, i) => {
                    const gx = padL + (plotW / ticks) * i, val = xmin + ((xmax - xmin) / ticks) * i;
                    return (<text key={i} x={gx} y={height - padB + 14} {...FONT} fill="var(--text-2)" textAnchor="middle">{f(val)}</text>);
                })}
                {line && <line x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2} stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="5 3" opacity={0.85} />}
                {points.map((p, i) => (
                    <circle key={i} cx={sx(Number(p.x) || 0)} cy={sy(Number(p.y) || 0)} r={p.r || 4} fill={p.color || color} opacity={0.72} stroke="var(--surface)" strokeWidth={0.8}>
                        <title>{`${p.label ? p.label + ' · ' : ''}${xLabel || 'x'}: ${f(Number(p.x) || 0)} · ${yLabel || 'y'}: ${f(Number(p.y) || 0)}`}</title>
                    </circle>
                ))}
                {xLabel && <text x={padL + plotW / 2} y={height - 2} fontSize={9.5} fontFamily="inherit" fontWeight={600} fill="var(--text-2)" textAnchor="middle">{xLabel}</text>}
                {yLabel && <text x={11} y={padT + plotH / 2} fontSize={9.5} fontFamily="inherit" fontWeight={600} fill="var(--text-2)" textAnchor="middle" transform={`rotate(-90 11 ${padT + plotH / 2})`}>{yLabel}</text>}
            </svg>
        </div>
    );
}

// ── Treemap ──────────────────────────────────────────────────────────────
// [282차 R3] 트리맵 — 구성비 시각화(예: 채널/카테고리 매출 점유). squarified 근사(행 스트립 배치).
//   items: [{ label, value, color? }]. 의존성 없는 SVG.
export function Treemap({ items = [], width = 640, height = 300, format }) {
    const data = (items || []).filter(d => (Number(d.value) || 0) > 0).sort((a, b) => b.value - a.value);
    if (!data.length) return null;
    const f = typeof format === 'function' ? format : (v) => fmt(v);
    const total = data.reduce((s, d) => s + Number(d.value), 0) || 1;
    const PALETTE = ['#4f8ef7', '#22c55e', '#f59e0b', '#a855f7', '#ef4444', '#14b8a6', '#eab308', '#ec4899', '#6366f1', '#84cc16'];
    // squarified 근사: 남은 영역에 행 단위로 채움.
    const rects = []; let x = 0, y = 0, rw = width, rh = height, idx = 0;
    let rem = data.slice();
    while (rem.length) {
        const horizontal = rw >= rh;              // 긴 변 기준으로 스트립(한 항목씩 배치·단순·안정)
        const remTotal = rem.reduce((s, d) => s + d.value, 0) || 1;
        const item = rem.shift();
        const frac = item.value / remTotal;
        if (horizontal) {
            const w = rw * frac;
            rects.push({ ...item, x, y, w, h: rh, idx });
            x += w; rw -= w;
        } else {
            const h = rh * frac;
            rects.push({ ...item, x, y, w: rw, h, idx });
            y += h; rh -= h;
        }
        idx++;
    }
    return (
        <div style={{ overflowX: 'auto' }}>
            <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block', minWidth: 320 }}>
                {rects.map((r, i) => {
                    const c = r.color || PALETTE[i % PALETTE.length];
                    const pct = ((r.value / total) * 100).toFixed(1);
                    const showLabel = r.w > 46 && r.h > 24;
                    return (
                        <g key={i}>
                            <rect x={r.x + 1} y={r.y + 1} width={Math.max(0, r.w - 2)} height={Math.max(0, r.h - 2)} rx={4} fill={c} opacity={0.86}>
                                <title>{`${r.label}: ${f(r.value)} (${pct}%)`}</title>
                            </rect>
                            {showLabel && (<>
                                <text x={r.x + 7} y={r.y + 16} fontSize={10} fontFamily="inherit" fontWeight={700} fill="#fff">{String(r.label).length > 14 ? String(r.label).slice(0, 13) + '…' : r.label}</text>
                                <text x={r.x + 7} y={r.y + 29} fontSize={9} fontFamily="inherit" fill="#fff" opacity={0.9}>{f(r.value)} · {pct}%</text>
                            </>)}
                        </g>
                    );
                })}
            </svg>
        </div>
    );
}

// ── seedSeries ────────────────────────────────────────────────────────────

