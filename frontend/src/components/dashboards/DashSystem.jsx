import { useI18n } from '../../i18n';
// ══════════════════════════════════════════════════════════════════════
//  🖥️ 시스템 현황 — Infrastructure Intelligence with Drill-Down
//  모듈/API 클릭 → 상세 성능 지표·에러 분석·트렌드
// ══════════════════════════════════════════════════════════════════════
import { useState } from 'react';
import { LineChart, Spark, seedSeries, fmt } from './ChartUtils.jsx';

const MODULES = {
    api: {
        name: 'Backend API', icon: '⚙️', col: '#22c55e', latency: 48, uptime: 99.98, rpm: 12800, errors: 0.02, status: 'ok',
        latHistory: [42, 44, 46, 48, 45, 47, 48, 46, 44, 48, 47, 46, 48, 48], errHistory: [0.01, 0.02, 0.01, 0.02, 0.02, 0.01, 0.02, 0.01, 0.02, 0.02, 0.01, 0.02, 0.02, 0.02],
        endpoints: [{ path: '/v423/events', calls: 4200, p99: 52, status: 'ok' }, { path: '/v423/channel', calls: 3800, p99: 44, status: 'ok' }, { path: '/v423/auth', calls: 2400, p99: 38, status: 'ok' }, { path: '/v423/reports', calls: 1800, p99: 86, status: 'warn' }],
        memUsage: 42, cpuUsage: 28, ver: 'v2.4.1', deploy: '10분 전'
    },
    attr: {
        name: 'Attribution', icon: '🔗', col: '#4f8ef7', latency: 85, uptime: 100.0, rpm: 4200, errors: 0.00, status: 'ok',
        latHistory: [78, 82, 86, 88, 84, 82, 86, 84, 82, 88, 84, 82, 86, 85], errHistory: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        endpoints: [{ path: '/attr/touch', calls: 2800, p99: 92, status: 'ok' }, { path: '/attr/model', calls: 1400, p99: 148, status: 'warn' }],
        memUsage: 58, cpuUsage: 34, ver: 'v1.8.3', deploy: '2시간 전'
    },
    sync: {
        name: 'KR Channel Sync', icon: '🔄', col: '#14d9b0', latency: 66, uptime: 99.99, rpm: 8400, errors: 0.01, status: 'ok',
        latHistory: [60, 62, 66, 64, 62, 66, 68, 64, 62, 66, 64, 66, 64, 66], errHistory: [0, 0.01, 0, 0.01, 0, 0, 0.01, 0, 0.01, 0, 0.01, 0, 0.01, 0.01],
        endpoints: [{ path: '/sync/coupang', calls: 3200, p99: 72, status: 'ok' }, { path: '/sync/naver', calls: 2800, p99: 68, status: 'ok' }, { path: '/sync/gmarket', calls: 2400, p99: 62, status: 'ok' }],
        memUsage: 36, cpuUsage: 22, ver: 'v3.1.0', deploy: '30분 전'
    },
    propt: {
        name: 'Price Opt', icon: '💲', col: '#f97316', latency: 120, uptime: 99.95, rpm: 2100, errors: 0.05, status: 'warn',
        latHistory: [110, 118, 122, 128, 124, 120, 118, 122, 126, 124, 120, 122, 118, 120], errHistory: [0.04, 0.05, 0.06, 0.05, 0.04, 0.05, 0.06, 0.05, 0.04, 0.05, 0.06, 0.05, 0.04, 0.05],
        endpoints: [{ path: '/price/suggest', calls: 1400, p99: 142, status: 'warn' }, { path: '/price/history', calls: 700, p99: 98, status: 'ok' }],
        memUsage: 74, cpuUsage: 56, ver: 'v2.0.4', deploy: '45분 전'
    },
    graph: {
        name: 'Graph Score', icon: '🕸️', col: '#a855f7', latency: 210, uptime: 99.90, rpm: 840, errors: 0.08, status: 'warn',
        latHistory: [198, 210, 220, 218, 210, 206, 214, 218, 212, 210, 208, 212, 208, 210], errHistory: [0.06, 0.08, 0.09, 0.08, 0.07, 0.08, 0.09, 0.08, 0.07, 0.08, 0.09, 0.08, 0.07, 0.08],
        endpoints: [{ path: '/graph/score', calls: 540, p99: 248, status: 'warn' }, { path: '/graph/batch', calls: 300, p99: 320, status: 'warn' }],
        memUsage: 82, cpuUsage: 68, ver: 'v1.4.2', deploy: '1시간 전'
    },
    alert: {
        name: 'Alert Engine', icon: '🔔', col: '#ec4899', latency: 340, uptime: 99.80, rpm: 520, errors: 0.18, status: 'warn',
        latHistory: [310, 328, 342, 360, 348, 340, 332, 344, 348, 340, 336, 342, 338, 340], errHistory: [0.14, 0.16, 0.20, 0.22, 0.18, 0.16, 0.18, 0.20, 0.18, 0.16, 0.18, 0.20, 0.18, 0.18],
        endpoints: [{ path: '/alert/trigger', calls: 320, p99: 385, status: 'warn' }, { path: '/alert/rule', calls: 200, p99: 178, status: 'ok' }],
        memUsage: 68, cpuUsage: 72, ver: 'v1.2.1', deploy: '2시간 전'
    },
};
const MLIST = Object.entries(MODULES).map(([id, d]) => ({ id, ...d }));
const DAYS = Array.from({ length: 14 }, (_, i) => { const d = new Date('2026-03-07'); d.setDate(d.getDate() - (13 - i)); return `${d.getMonth() + 1}/${d.getDate()}`; });
const G = 10;
const CARD = { background: 'linear-gradient(145deg,rgba(255,255,255,0.04),rgba(13,21,37,0.9))', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '13px 15px' };

function ModuleDetail({ id }) {
    const { t } = useI18n();
    const m = MODULES[id];
    const isWarn = m.status === 'warn';
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto', height: '100%' }}>
            <div style={{ ...CARD, background: `linear-gradient(145deg,${m.col}14,rgba(13,21,37,0.95))`, border: `1px solid ${m.col}28` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 12, background: `${m.col}22`, border: `1px solid ${m.col}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, boxShadow: `0 0 16px ${m.col}44` }}>{m.icon}</div>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 15, fontWeight: 900, color: m.col, textShadow: `0 0 14px ${m.col}55` }}>{m.name}</div>
                        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.38)' }}>{m.ver} · 배포: {m.deploy}</div>
                    </div>
                    <div style={{ background: isWarn ? 'rgba(251,191,36,0.12)' : 'rgba(34,197,94,0.12)', border: `1px solid ${isWarn ? 'rgba(251,191,36,0.3)' : 'rgba(34,197,94,0.3)'}`, borderRadius: 8, padding: '3px 10px', fontSize: 11, fontWeight: 900, color: isWarn ? '#fbbf24' : '#4ade80' }}>{isWarn ? '⚠️ WARN' : '✅ OK'}</div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6 }}>
                    {[{ l: 'Avg Latency', v: `${m.latency}ms`, c: m.latency < 100 ? '#22c55e' : m.latency < 200 ? '#eab308' : '#ef4444' }, { l: 'Uptime', v: `${m.uptime}%`, c: '#22c55e' }, { l: 'RPM', v: m.rpm.toLocaleString(), c: m.col }, { l: 'Error Rate', v: `${m.errors}%`, c: m.errors < 0.05 ? '#22c55e' : '#f87171' }, { l: 'CPU', v: `${m.cpuUsage}%`, c: m.cpuUsage < 60 ? '#22c55e' : '#f97316' }, { l: 'Memory', v: `${m.memUsage}%`, c: m.memUsage < 70 ? '#4f8ef7' : '#f97316' }].map(k => (
                        <div key={k.l} style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 8, padding: '7px 10px', textAlign: 'center' }}>
                            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 2 }}>{k.l}</div>
                            <div style={{ fontSize: 14, fontWeight: 900, color: k.c }}>{k.v}</div>
                        </div>
                    ))}
                </div>
            </div>
            {/* 지연시간 추이 */}
            <div style={CARD}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.8 }}>📈 14일 응답시간 추이 (ms)</div>
                <svg width="100%" height="60" viewBox="0 0 280 60" style={{ overflow: 'visible' }}>
                    {(() => {
                        const data = m.latHistory; const mn = Math.min(...data), mx = Math.max(...data), rng = mx - mn || 1;
                        const pts = data.map((v, i) => `${(i / (data.length - 1)) * 280},${60 - ((v - mn) / rng) * 50}`).join(' ');
                        const lastX = 280, lastY = 60 - ((data[data.length - 1] - mn) / rng) * 50;
                        return (<>
                            <polygon points={`${pts} 280,60 0,60`} fill={m.col} opacity={0.08} />
                            <polyline points={pts} fill="none" stroke={m.col} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
                            <circle cx={lastX} cy={lastY} r={3} fill={m.col} />
                        </>);
                    })()}
                </svg>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>
                    <span>Min: {Math.min(...m.latHistory)}ms</span>
                    <span>Max: {Math.max(...m.latHistory)}ms</span>
                    <span>Now: {m.latency}ms</span>
                </div>
            </div>
            {/* 리소스 사용률 */}
            <div style={CARD}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.8 }}>🖥️ 리소스 사용률</div>
                {[{ l: 'CPU', v: m.cpuUsage, c: m.cpuUsage < 60 ? '#22c55e' : '#f97316' }, { l: 'Memory', v: m.memUsage, c: m.memUsage < 70 ? '#4f8ef7' : '#f97316' }].map(r => (
                    <div key={r.l} style={{ marginBottom: 8 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 11 }}>
                            <span style={{ color: 'rgba(255,255,255,0.55)' }}>{r.l}</span>
                            <span style={{ fontWeight: 800, color: r.c }}>{r.v}%</span>
                        </div>
                        <div style={{ height: 10, background: 'rgba(255,255,255,0.05)', borderRadius: 5, overflow: 'hidden' }}>
                            <div style={{ width: `${r.v}%`, height: '100%', background: `linear-gradient(90deg,${r.c},${r.c}88)`, borderRadius: 5, boxShadow: `0 0 6px ${r.c}55` }} />
                        </div>
                    </div>
                ))}
            </div>
            {/* 엔드포인트 */}
            <div style={CARD}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.8 }}>🔌 Endpoint Status</div>
                {m.endpoints.map(ep => (
                    <div key={ep.path} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: 11 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: ep.status === 'ok' ? '#22c55e' : '#fbbf24', boxShadow: `0 0 6px ${ep.status === 'ok' ? '#22c55e' : '#fbbf24'}88`, flexShrink: 0 }} />
                        <span style={{ flex: 1, color: 'rgba(255,255,255,0.65)', fontFamily: 'monospace', fontSize: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ep.path}</span>
                        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, width: 56, textAlign: 'right' }}>{ep.calls.toLocaleString()} rpm</span>
                        <span style={{ color: ep.p99 < 100 ? '#22c55e' : ep.p99 < 200 ? '#eab308' : '#ef4444', fontWeight: 800, width: 46, textAlign: 'right' }}>{ep.p99}ms</span>
                    </div>
                ))}
            </div>
            {/* 에러율 */}
            <div style={CARD}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.8 }}>⛔ 에러율 추이</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ fontSize: 26, fontWeight: 900, color: m.errors < 0.05 ? '#22c55e' : '#f87171', textShadow: `0 0 16px ${m.errors < 0.05 ? '#22c55e' : '#f87171'}55` }}>{m.errors}%</div>
                    <div style={{ flex: 1, fontSize: 11 }}>
                        <div style={{ color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>SLO 목표: {'<'}0.1%</div>
                        <div style={{ color: m.errors < 0.05 ? '#4ade80' : '#fbbf24', fontWeight: 700 }}>{m.errors < 0.05 ? '✅ SLO 달성 중' : '⚠️ SLO 주의 구간'}</div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function DashSystem() {
    const { t } = useI18n();
    const [sel, setSel] = useState(null);
    const okCount = MLIST.filter(m => m.status === 'ok').length;
    const avgLat = (MLIST.reduce((s, m) => s + m.latency, 0) / MLIST.length).toFixed(0);
    const totalRPM = MLIST.reduce((s, m) => s + m.rpm, 0);
    const lineData = DAYS.map((d, i) => ({ d, ...Object.fromEntries(MLIST.slice(0, 3).map(m => [m.id, m.latHistory[i]])) }));

    return (
        <div style={{ display: 'grid', gap: G }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: G }}>
                {[{ ico: '✅', l: 'System Status', v: `${okCount}/${MLIST.length} OK`, d: 0, col: '#22c55e', h: 'All Systems' },
                { ico: '⚡', l: 'Avg Latency', v: `${avgLat}ms`, d: -4.2, col: '#4f8ef7', h: 'p50 응답' },
                { ico: '📊', l: 'Total RPM', v: totalRPM.toLocaleString(), d: 6.1, col: '#a855f7', h: '요청 처리량' },
                { ico: '⛔', l: 'Error Rate', v: '0.06%', d: -0.02, col: '#14d9b0', h: 'SLO: 0.1%' },
                ].map(m => (
                    <div key={m.l} style={{ position: 'relative', borderRadius: 14, padding: '1px', overflow: 'hidden', background: `linear-gradient(135deg,${m.col}44,rgba(255,255,255,0.04))`, boxShadow: `0 4px 20px ${m.col}18` }}>
                        <div style={{ background: 'linear-gradient(145deg,#0d1525,#060b14)', borderRadius: 13, padding: '13px 16px', height: 90, boxSizing: 'border-box', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <div>
                                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.36)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>{m.l}</div>
                                    <div style={{ fontSize: 22, fontWeight: 900, color: m.col, lineHeight: 1.1, marginTop: 3, textShadow: `0 0 18px ${m.col}55` }}>{m.v}</div>
                                </div>
                                <div style={{ width: 36, height: 36, borderRadius: 10, background: `${m.col}18`, border: `1px solid ${m.col}28`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17 }}>{m.ico}</div>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ fontSize: 11, color: m.d <= 0 ? '#4ade80' : '#f87171', fontWeight: 800, background: m.d <= 0 ? 'rgba(74,222,128,0.1)' : 'rgba(248,113,113,0.1)', padding: '1px 6px', borderRadius: 6 }}>{m.d <= 0 ? '▼' : '▲'} {Math.abs(m.d)}</span>
                                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)' }}>{m.h}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: G }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: G }}>
                    {/* 모듈 카드 6열 */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: G }}>
                        {MLIST.map(m => {
                            const isSel = sel === m.id;
                            const isWarn = m.status === 'warn';
                            return (
                                <div key={m.id} onClick={() => setSel(isSel ? null : m.id)} style={{ position: 'relative', borderRadius: 13, padding: '1px', overflow: 'hidden', cursor: 'pointer', background: isSel ? `linear-gradient(135deg,${m.col}70,${m.col}28)` : `linear-gradient(135deg,${m.col}35,rgba(255,255,255,0.04))`, boxShadow: isSel ? `0 0 0 2px ${m.col},0 8px 24px ${m.col}40` : `0 4px 14px ${m.col}12`, transform: isSel ? 'scale(1.02)' : 'scale(1)', transition: 'all 0.25s' }}>
                                    <div style={{ background: 'linear-gradient(145deg,#0d1525,#060b14)', borderRadius: 12, padding: '11px 13px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 7 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                                                <div style={{ position: 'relative', width: 8, height: 8, borderRadius: '50%', background: isWarn ? '#fbbf24' : '#22c55e', boxShadow: `0 0 8px ${isWarn ? '#fbbf24' : '#22c55e'}88` }} />
                                                <span style={{ fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.82)' }}>{m.name}</span>
                                            </div>
                                            <span style={{ fontSize: 9, fontWeight: 800, color: isWarn ? '#fbbf24' : '#4ade80', background: isWarn ? 'rgba(251,191,36,0.1)' : 'rgba(34,197,94,0.1)', padding: '1px 6px', borderRadius: 5 }}>{isWarn ? 'WARN' : 'OK'}</span>
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                                            {[{ l: 'Latency', v: `${m.latency}ms`, c: m.latency < 100 ? '#22c55e' : m.latency < 200 ? '#eab308' : '#ef4444' }, { l: 'Uptime', v: `${m.uptime}%`, c: '#22c55e' }, { l: 'RPM', v: m.rpm.toLocaleString(), c: m.col }, { l: 'Err', v: `${m.errors}%`, c: m.errors < 0.05 ? '#22c55e' : '#f87171' }].map(k => (
                                                <div key={k.l} style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 6, padding: '4px 8px' }}>
                                                    <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{k.l}</div>
                                                    <div style={{ fontSize: 12, fontWeight: 900, color: k.c }}>{k.v}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    {/* Latency 트렌드 */}
                    <div style={CARD}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.88)' }}>Infrastructure Latency Trend (14일, ms)</span>
                            <div style={{ display: 'flex', gap: 12 }}>
                                {MLIST.slice(0, 3).map(m => (
                                    <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'rgba(255,255,255,0.45)', cursor: 'pointer' }} onClick={() => setSel(sel === m.id ? null : m.id)}>
                                        <div style={{ width: 12, height: 2.5, background: m.col, borderRadius: 2, boxShadow: `0 0 5px ${m.col}88` }} />
                                        {m.name}
                                    </div>
                                ))}
                            </div>
                        </div>
                        <LineChart data={lineData} labels={DAYS} series={MLIST.slice(0, 3).map(m => ({ key: m.id, color: m.col, width: sel === m.id ? 2.8 : 1.6, area: sel === m.id }))} width={660} height={130} />
                    </div>
                    {/* API 연동 상태 */}
                    <div style={CARD}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.88)', marginBottom: 10 }}>🔌 External API Integration</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                            {[{ n: 'Meta Ads API', s: 'LIVE', lat: 42, sync: '1분 전', c: '#22c55e' }, { n: 'Google Ads', s: 'LIVE', lat: 68, sync: '3분 전', c: '#22c55e' },
                            { n: 'Coupang API', s: 'LIVE', lat: 54, sync: '2분 전', c: '#22c55e' }, { n: 'Naver API', s: 'LIVE', lat: 38, sync: '5분 전', c: '#22c55e' },
                            { n: 'TikTok Ads', s: 'LIVE', lat: 72, sync: '4분 전', c: '#22c55e' }, { n: 'Amazon SP', s: 'WARN', lat: 148, sync: '15분 전', c: '#fbbf24' },
                            ].map(a => (
                                <div key={a.n} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.025)', border: `1px solid ${a.c}18` }}>
                                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: a.c, boxShadow: `0 0 6px ${a.c}88`, flexShrink: 0 }} />
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.78)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.n}</div>
                                        <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)' }}>sync {a.sync} · {a.lat}ms</div>
                                    </div>
                                    <span style={{ fontSize: 10, fontWeight: 900, color: a.c, background: `${a.c}14`, padding: '2px 7px', borderRadius: 6, border: `1px solid ${a.c}28`, flexShrink: 0 }}>{a.s}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                {/* 우측 패널 */}
                <div>
                    {sel ? <ModuleDetail id={sel} /> : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <div style={CARD}>
                                <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.88)', marginBottom: 10 }}>📊 모듈 헬스 요약</div>
                                {MLIST.map(m => (
                                    <div key={m.id} onClick={() => setSel(m.id)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8, marginBottom: 4, cursor: 'pointer', background: `${m.col}08`, border: `1px solid ${m.col}14`, transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = `${m.col}18`} onMouseLeave={e => e.currentTarget.style.background = `${m.col}08`}>
                                        <span style={{ fontSize: 14 }}>{m.icon}</span>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.82)' }}>{m.name}</div>
                                            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.38)' }}>{m.uptime}% uptime · {m.latency}ms</div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                            <div style={{ width: 7, height: 7, borderRadius: '50%', background: m.status === 'ok' ? '#22c55e' : '#fbbf24', boxShadow: `0 0 6px ${m.status === 'ok' ? '#22c55e' : '#fbbf24'}88` }} />
                                            <span style={{ fontSize: 10, fontWeight: 900, color: m.status === 'ok' ? '#4ade80' : '#fbbf24' }}>{m.status.toUpperCase()}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div style={CARD}>
                                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', lineHeight: 1.8 }}>💡 모듈 카드 클릭 시<br /><span style={{ color: '#14d9b0' }}>지연시간 추이·리소스·엔드포인트·에러율</span> 상세 분석</div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
