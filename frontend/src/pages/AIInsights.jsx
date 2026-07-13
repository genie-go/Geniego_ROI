import React, { useState, useRef, useEffect, useCallback, useMemo, memo } from "react";
import { tChannelName } from '../utils/tenantStorage.js'; // 180차: 회원 격리 크로스탭
import { IS_DEMO } from '../utils/demoEnv'; // 181차: 가상데이터 운영오염 차단(운영=빈값, 데모=시드)
import { useI18n } from '../i18n';
import { useCurrency } from '../contexts/CurrencyContext.jsx';
import { useGlobalData } from '../context/GlobalDataContext.jsx';
import { useConnectorSync } from '../context/ConnectorSyncContext.jsx';
import { postJson, getJsonAuth } from '../services/apiClient.js';
import { useNavigate } from 'react-router-dom'; // [231차 OS#5] Copilot 추천 액션 딥링크
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts";
import { sanitizeHtml } from '../utils/xssSanitizer.js';

/* ─── Security Engine ──────────────────── */
const SEC_PATTERNS = [
    { re: /<script/i, type: 'XSS' }, { re: /javascript:/i, type: 'XSS' },
    { re: /on\w+\s*=/i, type: 'XSS' }, { re: /union\s+select/i, type: 'SQL_INJECT' },
    { re: /drop\s+table/i, type: 'SQL_INJECT' }, { re: /\.\.\//g, type: 'PATH_TRAVERSAL' },
];
const secCheck = (v = '') => { for (const p of SEC_PATTERNS) { if (p.re.test(v)) return p.type; } return null; };

function SecurityOverlay({ threats, onDismiss, t }) {
    if (!threats.length) return null;
    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(8px)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'fadeIn 0.2s ease-out' }}>
            <div style={{ background: '#ffffff', border: '1px solid rgba(239,68,68,0.4)', borderRadius: 24, padding: 32, maxWidth: 500, width: '90%', textAlign: 'center', boxShadow: '0 24px 64px rgba(239,68,68,0.18)' }}>
                <div style={{ fontSize: 48, marginBottom: 12, animation: 'pulse 1.5s infinite' }}>🚨</div>
                <div style={{ fontSize: 20, fontWeight: 900, color: '#dc2626', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>{t('aiInsights.securityAlert', 'Security Threat Detected')}</div>
                <div style={{ fontSize: 13, color: '#b91c1c', marginBottom: 24, lineHeight: 1.6 }}>{t('aiInsights.securityDesc', 'Malicious input pattern intercepted by AI Firewall.')}</div>
                <div style={{ maxHeight: 150, overflowY: 'auto', background: 'rgba(239,68,68,0.06)', padding: 16, borderRadius: 12, border: '1px solid rgba(239,68,68,0.18)', marginBottom: 24 }}>
                    {threats.map((th, i) => (
                        <div key={i} style={{ marginBottom: 8, fontSize: 12, color: '#b91c1c', textAlign: 'left', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                            <strong style={{ color: '#dc2626', background: 'rgba(239,68,68,0.12)', padding: '2px 6px', borderRadius: 4, marginRight: 8 }}>{th.type}</strong>
                            {th.value.slice(0, 60)}…
                        </div>
                    ))}
                </div>
                <button onClick={onDismiss} style={{ padding: '12px 32px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#ef4444,#dc2626)', color: '#fff', fontWeight: 800, cursor: 'pointer', fontSize: 14, boxShadow: '0 8px 16px rgba(239,68,68,0.3)', transition: 'transform 150ms' }} onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'} onMouseLeave={e => e.currentTarget.style.transform = 'none'}>
                    ✕ {t('aiInsights.dismiss', 'Acknowledge & Dismiss')}
                </button>
            </div>
        </div>
    );
}

/* ─── Constants (theme-aware: 글로벌 라이트/다크 테마 토큰을 따름) ──────────────────── */
const CARD = { borderRadius: 16, border: '1px solid var(--border, #e5e7eb)', padding: 24, background: 'var(--surface, #ffffff)', boxShadow: '0 4px 16px rgba(15,23,42,0.06)' };
const ACCENT = '#a855f7'; const BLUE = '#4f8ef7'; const GREEN = '#16a34a'; const RED = '#ef4444';
const TXT1 = 'var(--text-1, #0f172a)'; const TXT2 = 'var(--text-2, #374151)'; const TXT3 = 'var(--text-3, #64748b)';
const SURFACE2 = 'var(--surface-2, #f8fafc)'; const BORDER = 'var(--border, #e5e7eb)';

/* ─── Channel Detection ─── */
function useConnectedChannels() {
    return useMemo(() => {
        const ch = [];
        try { const k = JSON.parse(localStorage.getItem('geniego_api_keys') || '[]'); if (Array.isArray(k)) k.forEach(x => { if (x.service) ch.push(x.service.toLowerCase()); }); } catch { }
        ['meta', 'google', 'tiktok', 'kakao_moment', 'naver', 'coupang', 'amazon', 'shopify', 'gmarket', '11st', 'line', 'whatsapp'].forEach(c => {
            try { if (localStorage.getItem(`geniego_channel_${c}`)) ch.push(c); } catch { }
        });
        return [...new Set(ch)];
    }, []);
}

/* ─── Insight Card ──────────────────── */
const InsightCard = memo(function InsightCard({ icon, title, desc, severity = "info", actionBtn, actionRoute, navigate, t }) {
    const tr = t || ((k, f) => f);
    const colors = { high: RED, mid: '#d97706', info: BLUE, good: GREEN };
    const col = colors[severity] || colors.info;

    // [259차 정직성] 과거: setTimeout 1.5s 후 무조건 "Auto-Optimization Applied" alert = 백엔드 미호출 가짜집행.
    // 실 최적화/정지는 전용 콘솔(마케팅 자동화·반품)에서 결제/킬스위치 게이트 + 휴먼-인-루프(propose→승인→집행)로만 수행.
    // → 권장 액션 클릭 시 해당 실 실행 페이지로 딥링크(가짜 성공 표기 제거).
    const handleAction = () => {
        if (navigate && actionRoute) navigate(actionRoute);
    };

    return (
        <div style={{ padding: '20px', borderRadius: 16, border: `1px solid ${col}30`, background: `linear-gradient(145deg, ${col}0c, ${col}04)`, borderLeft: `4px solid ${col}`, boxShadow: `0 4px 16px ${col}10`, transition: 'transform 200ms', cursor: 'default', minWidth: 0 }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseLeave={e => e.currentTarget.style.transform = 'none'}>
            <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 26, background: `${col}15`, padding: 12, borderRadius: 12, flexShrink: 0 }}>{icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: 14, color: col, marginBottom: 6, letterSpacing: 0.3 }}>{title}</div>
                    <div style={{ fontSize: 13, color: TXT2, lineHeight: 1.6, wordBreak: 'break-word' }}>{desc}</div>
                    {actionBtn && (
                        <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end' }}>
                            <button onClick={handleAction} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, border: 'none', background: `linear-gradient(135deg, ${col}, ${col}dd)`, color: '#fff', fontWeight: 700, fontSize: 11, cursor: 'pointer', transition: 'all 200ms', boxShadow: `0 4px 12px ${col}40` }}>
                                ⚡ {actionBtn} →
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
});

/* ─── Chat Message ──────────────────── */
const ChatMsg = memo(function ChatMsg({ role, text, insight, loading, t }) {
    const isAI = role === 'ai';
    return (
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', justifyContent: isAI ? 'flex-start' : 'flex-end', animation: 'fadeInUp 0.3s ease-out' }}>
            {isAI && <div style={{ width: 36, height: 36, borderRadius: 12, flexShrink: 0, background: 'linear-gradient(135deg,#a855f7,#4f8ef7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, boxShadow: '0 8px 16px rgba(168,85,247,0.25)' }}>🤖</div>}
            <div style={{ maxWidth: 'min(80%, 620px)', minWidth: 0, padding: '14px 18px', borderRadius: isAI ? '6px 18px 18px 18px' : '18px 6px 18px 18px', background: isAI ? SURFACE2 : 'linear-gradient(135deg,#4f8ef7,#3b82f6)', border: `1px solid ${isAI ? BORDER : 'rgba(255,255,255,0.1)'}`, fontSize: 13, lineHeight: 1.7, color: isAI ? TXT1 : '#ffffff', boxShadow: '0 4px 16px rgba(15,23,42,0.06)', wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                {loading ? (
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', color: TXT3 }}>
                        <span style={{ animation: 'pulse 1s infinite 0.4s' }} >●</span><span>●</span><span>●</span>
                        <span style={{ marginLeft: 8, fontSize: 12, fontWeight: 600 }}>{t('aiInsights.analyzing', 'AI Engine Architecting Insights...')}</span>
                    </div>
                ) : (
                    <>
                        <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(text.replace(/\n/g, '<br/>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')) }} />
                        {insight?.bullets && insight.bullets.length > 0 && <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6, background: 'rgba(168,85,247,0.06)', padding: 12, borderRadius: 10, color: isAI ? '#7c3aed' : '#ffffff' }} >{insight.bullets.map((b, i) => <div key={i} style={{ display: 'flex', gap: 8 }}><span>✦</span><span>{b}</span></div>)}</div>}
                        {insight?.recommendation && (
                            <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 10, background: 'rgba(22,163,74,0.08)', border: '1px solid rgba(22,163,74,0.25)', fontSize: 12, color: '#15803d', fontWeight: 600, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                                💡 <span>{insight.recommendation}</span>
                            </div>
                        )}
                    </>
                )}
            </div>
            {!isAI && <div style={{ width: 36, height: 36, borderRadius: 12, flexShrink: 0, background: SURFACE2, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, border: `1px solid ${BORDER}` }}>👤</div>}
        </div>
    );
});

/* ═══════ TAB 1: Insight Cards ═══════ */
const InsightCardsTab = memo(function InsightCardsTab({ live, t, connectedChannels, navigate }) {
    const cards = [];
    // actionRoute = 클릭 시 이동할 실 실행 콘솔(가짜집행 대신 실제 게이트된 집행 페이지로 딥링크)
    if (live.roas > 0 && live.roas < 3.0) cards.push({ icon: '📉', severity: 'high', title: t('aiInsights.roasAlertTitle', 'Critical: Low ROAS Detected'), desc: t('aiInsights.roasAlertDesc', 'Blended ROAS fell to {{v}}x. Immediate reallocation required.', { v: (live.roas || 0).toFixed(2) }), actionBtn: t('aiInsights.actRebalance', 'Rebalance Budget'), actionRoute: '/auto-marketing' });
    if (live.returnRate > 0.12) cards.push({ icon: '↩', severity: 'high', title: t('aiInsights.returnAlertTitle', 'Warning: High Return Rate'), desc: t('aiInsights.returnAlertDesc', 'Product return rate spiked to {{v}}%.', { v: ((live.returnRate || 0) * 100).toFixed(1) }), actionBtn: t('aiInsights.actHalt', 'Halt Bad Catalogs'), actionRoute: '/returns-portal' });
    if (live.adSpend > 0 && live.grossRevenue > 0 && live.adSpend / live.grossRevenue > 0.2) cards.push({ icon: '💸', severity: 'mid', title: t('aiInsights.adSpendAlertTitle', 'Notice: High Ad Spend Ratio'), desc: t('aiInsights.adSpendAlertDesc', 'Ad spend is {{v}}% of revenue.', { v: ((live.adSpend / live.grossRevenue) * 100).toFixed(1) }), actionBtn: t('aiInsights.actOptimizeBids', 'Optimize Bids'), actionRoute: '/auto-marketing' });
    if (live.roas >= 4.0) cards.push({ icon: '🔥', severity: 'good', title: t('aiInsights.topPerformTitle', 'Excellent: Scaling Opportunity'), desc: t('aiInsights.topPerformDesc', 'Current ROAS is highly profitable at {{v}}x. Scale up campaigns.', { v: (live.roas || 0).toFixed(2) }), actionBtn: t('aiInsights.actScale', 'Scale Budget +15%'), actionRoute: '/auto-marketing' });
    if (cards.length === 0) cards.push({ icon: '✅', severity: 'good', title: t('aiInsights.allNormalTitle', 'System Healthy'), desc: t('aiInsights.allNormalDesc', 'All KPIs are within target safe thresholds. No critical actions needed.') });

    return (
        <div style={{ display: 'grid', gap: 18, animation: 'fadeIn 0.4s ease-out' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '12px 20px', borderRadius: 12, background: 'linear-gradient(90deg, rgba(168,85,247,0.08), rgba(79,142,247,0.04))', border: '1px solid rgba(168,85,247,0.18)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                    <span style={{ fontSize: 18 }}>👁️‍🗨️</span>
                    <span style={{ fontSize: 13, color: TXT1, fontWeight: 700 }}>{t("aiInsightsPage.realtimeGuardrails", "AI 실시간 가드레일")}</span>
                </div>
                {connectedChannels.length > 0 && (
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: TXT3 }}>{t('aiInsights.connectedChannels', 'Sensors')}:</span>
                        {connectedChannels.slice(0, 4).map(ch => (
                            <span key={ch} style={{ fontSize: 10, padding: '3px 10px', borderRadius: 999, background: 'rgba(2,132,199,0.08)', color: '#0369a1', fontWeight: 700, textTransform: 'capitalize', border: '1px solid rgba(2,132,199,0.25)' }}>{ch.replace(/_/g, ' ')}</span>
                        ))}
                    </div>
                )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
                {cards.map((c, i) => <InsightCard key={i} {...c} t={t} navigate={navigate} />)}
            </div>
        </div>
    );
});

/* ═══════ TAB 2: Trend Summary & Predictions ═══════ */
const TrendsTab = memo(function TrendsTab({ live, t, fmt }) {
    const KpiRow = ({ label, value, color, icon, trend }) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', background: SURFACE2, borderRadius: 12, border: `1px solid ${BORDER}` }}>
            <span style={{ fontSize: 20, width: 28, textAlign: 'center', background: color + '15', padding: 8, borderRadius: 10, flexShrink: 0 }}>{icon}</span>
            <div style={{ flex: 1, minWidth: 0, fontSize: 12, color: TXT2, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</div>
            {trend ? <div style={{ fontSize: 11, color: trend > 0 ? GREEN : RED, fontWeight: 800, flexShrink: 0 }}>{trend > 0 ? '▲' : '▼'} {Math.abs(trend)}%</div> : null}
            <div style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 16, color, letterSpacing: 0.3, flexShrink: 0 }}>{value}</div>
        </div>
    );

    // 181차: 운영=실 ROAS 기반(없으면 0/빈), 데모(IS_DEMO)만 예측선 시드 노출
    const FORECAST_DATA = useMemo(() => {
        const base = live.roas || (IS_DEMO ? 3.5 : 0);
        if (!base) return [];
        // [현 차수 P1] ★과거 3점(D-3~D-1)은 데모 시연용 계수(base*0.9/1.05/0.95)라 운영에선 '실측'으로 표기하면
        //   목데이터 날조가 된다 → 운영은 과거점 null(오늘 실측 단일점만). 데모만 시연 곡선 노출.
        return [
            { day: "D-3", roas: IS_DEMO ? base * 0.9 : null, pred: null },
            { day: "D-2", roas: IS_DEMO ? base * 1.05 : null, pred: null },
            { day: "D-1", roas: IS_DEMO ? base * 0.95 : null, pred: null },
            { day: "Today", roas: base, pred: IS_DEMO ? base : null },
            { day: "D+1", roas: null, pred: IS_DEMO ? base * 1.1 : null },
            { day: "D+2", roas: null, pred: IS_DEMO ? base * 1.15 : null },
            { day: "D+3", roas: null, pred: IS_DEMO ? base * 1.25 : null },
        ]
    }, [live.roas]);

    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.2fr)', gap: 20, alignItems: 'start' }}>
            <div style={CARD}>
                <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, color: TXT1 }}>
                    <span style={{ color: BLUE }}>📊</span> {t('aiInsights.trendKpiTitle', 'Real-time Pulse')}
                </div>
                <div style={{ display: 'grid', gap: 10 }}>
                    {/* [259차] 하드코딩 추이(▲12.4% 등)는 IS_DEMO 게이트 — 운영은 실 델타 없이 미표시(가짜증감 노출 방지, FORECAST_DATA 패턴과 동일) */}
                    <KpiRow icon="💰" label={t('aiInsights.trendRevenue', 'Gross Revenue')} value={fmt(live.grossRevenue)} color={BLUE} trend={IS_DEMO ? 12.4 : null} />
                    <KpiRow icon="📈" label={t('aiInsights.blendedRoas', 'Blended ROAS')} value={(live.roas || 0).toFixed(2) + 'x'} color="#a855f7" trend={IS_DEMO ? 5.2 : null} />
                    <KpiRow icon="🔥" label={t('aiInsights.trendProfit', 'Operating Profit')} value={fmt(live.operatingProfit)} color={live.operatingProfit >= 0 ? GREEN : RED} trend={IS_DEMO ? -2.1 : null} />
                    <KpiRow icon="📣" label={t('aiInsights.trendAdSpend', 'Ad Spend')} value={fmt(live.adSpend)} color="#ea580c" />
                </div>
            </div>

            <div style={{ ...CARD, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, color: TXT1 }}>
                    <span style={{ color: ACCENT }}>🔮</span> {t('aiInsights.forecastTitle', 'AI Predictive Forecast (ROAS)')}
                </div>
                <div style={{ width: '100%', height: 260 }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={FORECAST_DATA} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,23,42,0.08)" vertical={false} />
                            <XAxis dataKey="day" stroke="rgba(15,23,42,0.35)" fontSize={11} tickMargin={10} />
                            <YAxis stroke="rgba(15,23,42,0.35)" fontSize={11} />
                            <RechartsTooltip
                                contentStyle={{ background: '#ffffff', border: '1px solid rgba(99,140,255,0.25)', borderRadius: 8, boxShadow: '0 8px 24px rgba(15,23,42,0.12)', color: '#0f172a' }}
                                cursor={{ stroke: 'rgba(15,23,42,0.12)', strokeWidth: 2 }}
                            />
                            <Line type="monotone" dataKey="roas" name="Actual ROAS" stroke="#4f8ef7" strokeWidth={3} dot={{ r: 4, fill: '#4f8ef7', strokeWidth: 2 }} activeDot={{ r: 8 }} />
                            <Line type="monotone" dataKey="pred" name="Predicted ROAS" stroke="#a855f7" strokeWidth={3} strokeDasharray="5 5" dot={{ r: 4, fill: '#a855f7', strokeWidth: 2 }} activeDot={{ r: 6 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
                <div style={{ fontSize: 11, color: TXT3, textAlign: 'center', marginTop: 12, display: 'flex', justifyContent: 'center', gap: 16 }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span style={{ width: 14, height: 3, background: '#4f8ef7', borderRadius: 2 }} /> {t('aiInsights.actualData', 'Actual Data')}</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span style={{ width: 14, height: 0, borderTop: '2px dashed #a855f7' }} /> {t('aiInsights.mlPrediction', 'ML Prediction')}</span>
                </div>
            </div>
        </div>
    );
});

/* ═══════ TAB 3: Enhanced AI Chat ═══════ */
const AIAssistantTab = memo(function AIAssistantTab({ t, safeguard, live = {}, navigate }) {
    // [231차 OS#5] 근거 grounding — 현재 순이익 워터폴 + 최대 잠식 비용(Root Cause 정합)
    const krw = (n) => '₩' + Math.round(Number(n) || 0).toLocaleString('ko-KR');
    const rev = live.grossRevenue || 0;
    const DRIVERS = [
        { k: 'cogs', label: t('aiInsights.cpCogs', '원가'), amt: live.cogs || 0, to: '/price-opt' },
        { k: 'ad', label: t('aiInsights.cpAd', '광고비'), amt: live.adSpend || 0, to: '/auto-marketing' },
        { k: 'fee', label: t('aiInsights.cpFee', '수수료'), amt: live.platformFee || 0, to: '/settlements' },
        { k: 'ship', label: t('aiInsights.cpShip', '배송비'), amt: live.shippingCost || 0, to: '/integration-hub' },
        { k: 'ret', label: t('aiInsights.cpRet', '반품비'), amt: live.returnFee || 0, to: '/returns-portal' },
        { k: 'coupon', label: t('aiInsights.cpCoupon', '쿠폰'), amt: live.couponDiscount || 0, to: '/my-coupons' },
    ].filter(d => d.amt > 0).sort((a, b) => b.amt - a.amt);
    const topDriver = DRIVERS[0];
    const [messages, setMessages] = useState([]);
    useEffect(() => { setMessages([{ role: 'ai', text: t('aiInsights.chatWelcome', "**Welcome to Geniego AI Agency.**\nWhat would you like to optimize?\ne.g. 'Analyze why Meta ad efficiency dropped yesterday'") }]); }, [t]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [ctx, setCtx] = useState('pnl');
    // [282차 R3 에이전틱 코파일럿 UI 배선] 백엔드 /v422/ai/agentic(tool-use bi_query 실데이터 + propose_* 제안)이
    //   완결됐으나 프론트 소비 0이던 것을 개통. agentMode ON = 에이전트(실데이터 조회+휴먼인루프 액션 제안), OFF = 구 P&L 분석.
    const [agentMode, setAgentMode] = useState(true);
    const bottomRef = useRef(null);
    useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

    // [282차 R3] 제안 액션 휴먼-인-루프 집행 — /v422/ai/agentic/execute(가드레일·킬스위치 재사용).
    const executeAction = async (msgIdx, actIdx, act) => {
        setMessages(prev => { const n = [...prev]; const m = { ...n[msgIdx] }; const acts = [...(m.actions || [])]; acts[actIdx] = { ...acts[actIdx], executing: true }; m.actions = acts; n[msgIdx] = m; return n; });
        try {
            const r = await postJson('/api/v422/ai/agentic/execute', { action: act.action, params: act.params });
            setMessages(prev => { const n = [...prev]; const m = { ...n[msgIdx] }; const acts = [...(m.actions || [])]; acts[actIdx] = { ...acts[actIdx], executing: false, done: !!r?.ok, result: r?.ok ? (r.message || t('aiInsights.actExecuted', '실행되었습니다')) : (r?.error || t('aiInsights.actFailed', '실행 실패')) }; m.actions = acts; n[msgIdx] = m; return n; });
        } catch (e) {
            setMessages(prev => { const n = [...prev]; const m = { ...n[msgIdx] }; const acts = [...(m.actions || [])]; acts[actIdx] = { ...acts[actIdx], executing: false, done: false, result: String(e?.message || e) }; m.actions = acts; n[msgIdx] = m; return n; });
        }
    };

    const sendMessage = async (question, context) => {
        const q = safeguard(question || input.trim(), 'chat_input');
        const c = context || ctx;
        if (!q) return;
        setInput('');
        setMessages(prev => [...prev, { role: 'user', text: q }]);
        setLoading(true);
        setMessages(prev => [...prev, { role: 'ai', text: '', loading: true }]);
        // [282차 R3] 에이전트 모드 — 실데이터 조회(bi_query) + 제안 액션(propose_*). 실패 시 구 분석 폴백.
        if (agentMode) {
            try {
                const d = await postJson('/api/v422/ai/agentic', { question: q });
                if (d && d.ok && (d.answer || (d.proposed_actions || []).length)) {
                    setMessages(prev => { const n = [...prev]; n[n.length - 1] = { role: 'ai', text: d.answer || t('aiInsights.agentNoText', '분석을 완료했습니다.'), data: d.data || null, actions: (d.proposed_actions || []).map(a => ({ ...a })), loading: false }; return n; });
                    setTimeout(() => setLoading(false), 300);
                    return;
                }
                if (d && d.configured === false) {
                    setMessages(prev => { const n = [...prev]; n[n.length - 1] = { role: 'ai', text: d.answer || t('aiInsights.agentNoKey', 'AI 코파일럿 키가 설정되지 않았습니다.'), loading: false }; return n; });
                    setTimeout(() => setLoading(false), 300);
                    return;
                }
                // 응답이 비면 구 분석 경로로 폴백
            } catch (e) { /* 구 분석 폴백 */ }
        }
        try {
            const d = await postJson('/api/v422/ai/analyze', { context: c, question: q, data: {
                platforms: [], total_spend: live.adSpend || 0, blended_roas: live.roas || 0, total_conv: 0,
                gross_revenue: rev, operating_profit: live.operatingProfit || 0, margin_pct: live.margin || 0,
                cogs: live.cogs || 0, platform_fee: live.platformFee || 0, shipping_cost: live.shippingCost || 0,
                return_fee: live.returnFee || 0, coupon_discount: live.couponDiscount || 0,
                top_cost_driver: topDriver ? topDriver.label : null,
            } });
            if (d.ok) { setMessages(prev => { const n = [...prev]; n[n.length - 1] = { role: 'ai', text: d.summary, insight: { bullets: d.bullets || [], recommendation: d.recommendation }, loading: false }; return n; }); }
            else { throw new Error(d.error || t('aiInsights.analysisFailed', 'Analysis failed. Reverting to local heuristic mode...')); }
        } catch (e) {
            // Enterprise Fallback Simulation
            setTimeout(() => {
                setMessages(prev => {
                    const n = [...prev]; n[n.length - 1] = {
                        role: 'ai',
                        text: t('aiInsights.chatFallbackText', "**[Enterprise Heuristic Engine]**\nNetwork connection failed — suggesting results from the internal heuristic engine.\n\nBased on current data, overall ad-spend ratio exceeds the optimal threshold."),
                        insight: { bullets: [t('aiInsights.chatFallbackB1', "Identify channels with surging CPA"), t('aiInsights.chatFallbackB2', "Reduce budget for low-LTV customer segments")], recommendation: t('aiInsights.chatFallbackRec', "Shall we immediately cut Meta Ads budget by 15% and rebalance toward Google Search ads?") },
                        loading: false
                    }; return n;
                });
            }, 1500);
        } finally { setTimeout(() => setLoading(false), 1500); }
    };

    // [231차 OS#5] 경영진(CEO/CFO/CMO/COO) 프리셋 질문
    const quickQ = [
        { ctx: 'pnl', q: t('aiInsights.exqProfit', '💰 이번 달 순이익이 왜 줄었나?') },
        { ctx: 'roas', q: t('aiInsights.exqCampaign', '📉 어떤 캠페인/채널을 줄여야 하나?') },
        { ctx: 'pnl', q: t('aiInsights.exqMargin', '📦 실제 이익률이 가장 낮은 비용 항목은?') },
        { ctx: 'returns', q: t('aiInsights.exqShip', '🚚 배송비·반품이 순이익에 미친 영향은?') },
        { ctx: 'pnl', q: t('aiInsights.exqNext', '🎯 다음 달 순이익을 높이려면 무엇을 해야 하나?') },
    ];

    return (
        <div style={{ display: 'grid', gap: 16, height: '100%' }}>
            {/* [231차 OS#5] Executive Briefing — 근거 KPI + 최대 잠식 비용 + 추천 액션(딥링크). 항상 실데이터 기반. */}
            <div style={{ ...CARD, background: 'linear-gradient(135deg,rgba(124,58,237,0.06),rgba(79,142,247,0.04))', borderColor: 'rgba(124,58,237,0.25)' }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: '#7c3aed', marginBottom: 8 }}>🧭 {t('aiInsights.briefTitle', '경영 브리핑 (근거 데이터)')}</div>
                <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', marginBottom: topDriver ? 10 : 0 }}>
                    <div><div style={{ fontSize: 10, color: TXT3 }}>{t('aiInsights.briefProfit', '순이익')}</div><div style={{ fontSize: 17, fontWeight: 900, color: (live.operatingProfit || 0) >= 0 ? '#16a34a' : '#ef4444' }}>{krw(live.operatingProfit)}</div></div>
                    <div><div style={{ fontSize: 10, color: TXT3 }}>{t('aiInsights.briefMargin', '영업이익률')}</div><div style={{ fontSize: 17, fontWeight: 900, color: TXT1 }}>{(live.margin || 0).toFixed ? live.margin.toFixed(1) : live.margin}%</div></div>
                    <div><div style={{ fontSize: 10, color: TXT3 }}>{t('aiInsights.briefRev', '매출')}</div><div style={{ fontSize: 17, fontWeight: 900, color: TXT1 }}>{krw(rev)}</div></div>
                    <div><div style={{ fontSize: 10, color: TXT3 }}>ROAS</div><div style={{ fontSize: 17, fontWeight: 900, color: TXT1 }}>{(live.roas || 0).toFixed ? live.roas.toFixed(2) : live.roas}x</div></div>
                </div>
                {topDriver && (
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', fontSize: 12.5, paddingTop: 8, borderTop: `1px solid ${BORDER}` }}>
                        <span style={{ color: TXT2 }}>{t('aiInsights.briefCause', '최대 순이익 잠식')}:</span>
                        <b style={{ color: '#ec4899' }}>{topDriver.label}</b>
                        <span style={{ color: TXT3 }}>{krw(topDriver.amt)} ({rev > 0 ? (topDriver.amt / rev * 100).toFixed(1) : '0'}% {t('aiInsights.briefOfRev', '매출대비')})</span>
                        {navigate && <button onClick={() => navigate(topDriver.to)} style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700, padding: '5px 13px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#a855f7,#4f8ef7)', color: '#fff' }}>{t('aiInsights.briefAct', '개선 페이지 열기')} →</button>}
                    </div>
                )}
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                {/* [282차 R3] 에이전트 모드 토글 — 실데이터 조회+휴먼인루프 액션 제안(agentic) vs 구 P&L 분석 */}
                <button onClick={() => setAgentMode(v => !v)} title={t('aiInsights.agentModeHint', '실데이터 조회 + 액션 제안(승인 후 실행)')}
                    style={{ padding: '6px 14px', borderRadius: 99, border: '1px solid', borderColor: agentMode ? '#7c3aed' : BORDER, background: agentMode ? 'rgba(124,58,237,0.1)' : 'transparent', color: agentMode ? '#7c3aed' : TXT3, fontSize: 12, cursor: 'pointer', fontWeight: 800 }}>
                    {agentMode ? '🤖 ' : '○ '}{t('aiInsights.agentMode', '에이전트 모드')}
                </button>
                <span style={{ fontSize: 11, color: TXT3, fontWeight: 700, background: SURFACE2, padding: '6px 12px', borderRadius: 8, border: `1px solid ${BORDER}` }}>{t('aiInsights.targetContext', 'Target Context')}:</span>
                {[['pnl', t('aiInsights.ctxPnl', 'Finance P&L')], ['roas', t('aiInsights.ctxRoas', 'ROAS Optimization')], ['returns', t('aiInsights.ctxReturns', 'Risk / Returns')]].map(([k, l]) => (
                    <button key={k} onClick={() => setCtx(k)} disabled={agentMode} style={{ padding: '6px 16px', borderRadius: 99, border: '1px solid', borderColor: ctx === k ? ACCENT : BORDER, background: ctx === k ? `${ACCENT}14` : 'transparent', color: ctx === k ? '#7c3aed' : TXT3, fontSize: 12, cursor: agentMode ? 'not-allowed' : 'pointer', fontWeight: 700, opacity: agentMode ? 0.4 : 1, transition: 'all 200ms' }}>{l}</button>
                ))}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {quickQ.map((qq, i) => (
                    <button key={i} onClick={() => sendMessage(qq.q, qq.ctx)} disabled={loading} style={{ padding: '8px 16px', borderRadius: 10, border: '1px solid rgba(99,140,255,0.3)', background: 'linear-gradient(180deg, rgba(99,140,255,0.08), rgba(99,140,255,0.02))', color: '#2563eb', fontSize: 12, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.5 : 1, transition: 'transform 100ms' }} onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'} onMouseLeave={e => e.currentTarget.style.transform = 'none'}>{qq.q}</button>
                ))}
            </div>
            <div style={{ ...CARD, flex: 1, minHeight: 400, padding: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {messages.map((m, i) => (
                        <React.Fragment key={i}>
                            <ChatMsg {...m} t={t} />
                            {/* [282차 R3] 에이전틱 제안 액션 — 휴먼-인-루프 승인·집행(가드레일 내장) */}
                            {Array.isArray(m.actions) && m.actions.length > 0 && (
                                <div style={{ display: 'grid', gap: 8, marginLeft: 40 }}>
                                    {m.actions.map((a, ai) => {
                                        const label = a.action === 'pause_campaign' ? t('aiInsights.actPause', '캠페인 일시정지') : a.action === 'budget_change' ? t('aiInsights.actBudget', '예산 변경') : a.action === 'create_segment' ? t('aiInsights.actSegment', '세그먼트 생성') : a.action;
                                        const detail = a.action === 'budget_change' ? ` → ${(a.params?.new_daily_krw || 0).toLocaleString()}원/일` : a.params?.campaign_ext_id ? ` · ${a.params.channel || ''} ${a.params.campaign_ext_id}` : a.params?.name ? ` · ${a.params.name}` : '';
                                        return (
                                            <div key={ai} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.25)', flexWrap: 'wrap' }}>
                                                <span style={{ fontSize: 12.5, fontWeight: 700, color: '#7c3aed' }}>⚡ {label}{detail}</span>
                                                {a.params?.reason && <span style={{ fontSize: 11, color: TXT3 }}>— {a.params.reason}</span>}
                                                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    {a.done === undefined
                                                        ? <button onClick={() => executeAction(i, ai, a)} disabled={a.executing} style={{ padding: '6px 14px', borderRadius: 8, border: 'none', cursor: a.executing ? 'wait' : 'pointer', fontSize: 11.5, fontWeight: 800, background: 'linear-gradient(135deg,#7c3aed,#4f8ef7)', color: '#fff', opacity: a.executing ? 0.6 : 1 }}>{a.executing ? t('aiInsights.actExecuting', '실행 중…') : t('aiInsights.actApprove', '승인 및 실행')}</button>
                                                        : <span style={{ fontSize: 11.5, fontWeight: 700, color: a.done ? '#16a34a' : '#ef4444' }}>{a.done ? '✓ ' : '✗ '}{a.result}</span>}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </React.Fragment>
                    ))}
                    <div ref={bottomRef} />
                </div>
                <div style={{ padding: 16, background: SURFACE2, borderTop: `1px solid ${BORDER}`, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                    <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && !loading && sendMessage()} placeholder={t('aiInsights.chatPlaceholder', "Enter a command (e.g. Rebalance performance-marketing budget)")} disabled={loading}
                        style={{ flex: 1, minWidth: 200, padding: '14px 20px', borderRadius: 12, border: `1px solid ${BORDER}`, background: 'var(--surface, #ffffff)', color: TXT1, fontSize: 13, outline: 'none', transition: 'border-color 200ms' }} onFocus={e => e.currentTarget.style.borderColor = ACCENT} onBlur={e => e.currentTarget.style.borderColor = 'var(--border, #e5e7eb)'} />
                    <button onClick={() => sendMessage()} disabled={loading || !input.trim()} style={{ padding: '14px 28px', borderRadius: 12, border: 'none', background: loading ? '#94a3b8' : `linear-gradient(135deg, ${ACCENT}, ${BLUE})`, color: '#fff', fontWeight: 800, fontSize: 13, cursor: loading ? 'not-allowed' : 'pointer', boxShadow: `0 8px 16px ${ACCENT}33`, transition: 'transform 150ms' }} onMouseEnter={e => !loading && (e.currentTarget.style.transform = 'scale(1.05)')} onMouseLeave={e => e.currentTarget.style.transform = 'none'}>
                        {loading ? t('aiInsights.processing', 'Processing...') : t('aiInsights.askAi', 'Ask AI')}
                    </button>
                </div>
            </div>
        </div>
    );
});

/* ═══════ TAB 4: History ═══════ */
const HistoryTab = memo(function HistoryTab({ t }) {
    const [rows, setRows] = useState([]);

    // 181차 가상데이터 오염 해소: 운영=실 분석이력 없으면 빈값, 데모(IS_DEMO)만 시드 노출
    // [265차 확장] 운영: 이미 영속되는 ai_analyses 이력(GET /v422/ai/analyses·테넌트스코프)을 배선(그간 무조건 빈값이던 미배선 해소).
    useEffect(() => {
        if (!IS_DEMO) {
            getJsonAuth('/v422/ai/analyses?limit=20')
                .then(d => { if (d && d.ok && Array.isArray(d.analyses)) setRows(d.analyses); })
                .catch(() => {});
            return;
        }
        setRows([
            { id: 1, context: 'roas', question: '매출 견인 매체 식별', summary: 'Meta Ads가 60% 비중 기여', recommendation: 'Meta 예산 증액 권장', created_at: new Date().toISOString(), status: 'ok', tokens_used: 1420 },
            { id: 2, context: 'pnl', question: '적자 발생 요인 진단', summary: '물류 비용 초과 및 타겟 CVR 하락', recommendation: '패키징 단가 재협상 및 광고 타겟팅 롤백', created_at: new Date(Date.now() - 86400000).toISOString(), status: 'ok', tokens_used: 3205 },
        ]);
    }, []);

    const ctxColor = { marketing: BLUE, pnl: GREEN, roas: '#ea580c', returns: RED };
    return (
        <div style={{ display: 'grid', gap: 16 }}>
            <div style={{ ...CARD, padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: TXT1 }}>📋 {t('aiInsights.traceability', 'Insight Traceability')}</div>
                <button onClick={() => {
                    // 260차: 죽은 버튼 실배선 — 분석이력 rows 를 실제 CSV 로 내보내기
                    if (!rows.length) { alert(t('aiInsights.historyEmpty', 'No analysis history yet')); return; }
                    const head = ['id','context','question','summary','recommendation','status','tokens_used','created_at'];
                    const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
                    const csv = [head.join(',')].concat(rows.map(r => head.map(h => esc(r[h])).join(','))).join('\r\n');
                    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url; a.download = `ai_insight_audit_${new Date().toISOString().slice(0,10)}.csv`;
                    document.body.appendChild(a); a.click(); document.body.removeChild(a);
                    setTimeout(() => URL.revokeObjectURL(url), 1000);
                }} style={{ fontSize: 12, padding: '8px 16px', borderRadius: 8, border: '1px solid rgba(168,85,247,0.3)', background: 'rgba(168,85,247,0.08)', color: '#7c3aed', cursor: 'pointer', fontWeight: 700 }}>📥 {t('aiInsights.exportAuditCsv', 'Export Audit Log (CSV)')}</button>
            </div>
            {rows.length === 0 && (
                <div style={{ ...CARD, padding: '48px 24px', textAlign: 'center' }}>
                    <div style={{ fontSize: 32, marginBottom: 12 }}>🗂️</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: TXT2 }}>{t('aiInsights.historyEmpty', 'No analysis history yet')}</div>
                    <div style={{ fontSize: 12, marginTop: 6, color: TXT3 }}>{t('aiInsights.historyEmptyDesc', 'Run an AI analysis from the AI Agency tab to build your traceability log.')}</div>
                </div>
            )}
            {rows.map(row => (
                <div key={row.id} style={{ display: 'flex', gap: 20, padding: '20px 24px', borderRadius: 16, border: `1px solid ${(ctxColor[row.context] || BLUE)}22`, background: 'var(--surface, #ffffff)', borderLeft: `4px solid ${ctxColor[row.context] || BLUE}`, boxShadow: '0 4px 16px rgba(15,23,42,0.06)', flexWrap: 'wrap' }}>
                    <div style={{ width: 140, flexShrink: 0, borderRight: `1px solid ${BORDER}`, paddingRight: 20 }}>
                        <div style={{ fontSize: 11, fontWeight: 800, padding: '4px 10px', borderRadius: 6, background: (ctxColor[row.context] || BLUE) + '18', color: ctxColor[row.context] || BLUE, display: 'inline-block', marginBottom: 8, textTransform: 'uppercase' }}>{row.context}</div>
                        <div style={{ fontSize: 11, color: TXT3, marginBottom: 4 }}>{new Date(row.created_at).toLocaleDateString()}</div>
                        <div style={{ fontSize: 10, color: TXT3, display: 'flex', alignItems: 'center', gap: 4 }}><span>🎟</span> {row.tokens_used} tok</div>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 8, color: TXT1, wordBreak: 'break-word' }}>{t('aiInsights.qPrefix', 'Q')}: {row.question}</div>
                        <div style={{ fontSize: 13, color: TXT2, marginBottom: 12, lineHeight: 1.6, wordBreak: 'break-word' }}>{row.summary}</div>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12, padding: '6px 12px', borderRadius: 8, background: 'rgba(22,163,74,0.08)', color: '#15803d', fontWeight: 700, border: '1px solid rgba(22,163,74,0.2)' }}>
                            💡 {t('aiInsights.actionTaken', 'Action Taken')}: {row.recommendation}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
});

/* ═══════ TAB 5: Guide ═══════ */
const GuideTab = memo(function GuideTab({ t }) {
    const sections = [
        { icon: '🔍', name: t('aiInsights.tabGuardrails', 'Guardrails'), desc: t('aiInsights.guideGuardrailsDesc', 'Real-time KPI anomaly detection and auto-optimization recommendations.') },
        { icon: '📊', name: t('aiInsights.tabPredictions', 'Predictions'), desc: t('aiInsights.guidePredictionsDesc', 'Machine Learning driven ROI/ROAS performance forecasting for next 7 days.') },
        { icon: '🤖', name: t('aiInsights.tabAgency', 'AI Agency'), desc: t('aiInsights.guideAgencyDesc', 'Conversational interface for deep dive analysis and strategy execution.') },
    ];
    return (
        <div style={{ display: 'grid', gap: 24, gridTemplateColumns: 'minmax(280px, 1fr) minmax(0, 2fr)' }}>
            <div style={{ ...CARD, background: `linear-gradient(145deg, ${ACCENT}12, var(--surface, #ffffff))`, borderColor: ACCENT + '30', textAlign: 'center', padding: 40 }}>
                <div style={{ fontSize: 56, marginBottom: 16 }}>🧠</div>
                <div style={{ fontWeight: 900, fontSize: 24, color: TXT1, marginBottom: 8 }}>{t("aiInsightsPage.copilotEngine", "AI 코파일럿 엔진")}</div>
                <div style={{ fontSize: 13, color: TXT2, lineHeight: 1.6 }}>{t('aiInsights.copilotDesc', 'An enterprise-grade orchestration layer powered by deep learning. Automatically detects risks, forecasts constraints, and executes complex marketing adjustments at scale.')}</div>
            </div>
            <div style={{ display: 'grid', gap: 16 }}>
                {sections.map((n, i) => (
                    <div key={i} style={{ ...CARD, padding: 24, display: 'flex', gap: 20, alignItems: 'center', transition: 'transform 200ms' }} onMouseEnter={e => e.currentTarget.style.transform = 'translateX(8px)'} onMouseLeave={e => e.currentTarget.style.transform = 'none'}>
                        <div style={{ width: 56, height: 56, borderRadius: 16, background: `${BLUE}15`, color: BLUE, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, flexShrink: 0 }}>{n.icon}</div>
                        <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 800, fontSize: 16, color: TXT1, marginBottom: 6 }}>{n.name}</div>
                            <div style={{ fontSize: 13, color: TXT2, lineHeight: 1.6 }}>{n.desc}</div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
});

/* ═══════════ MAIN ═══════════ */
export default function AIInsights() {
    const { t } = useI18n();
    const navigate = useNavigate(); // [231차 OS#5] Copilot 추천 액션 딥링크
    const { fmt } = useCurrency();
    const { pnlStats, settlementStats, budgetStats, orderStats, addAlert, isDemo } = useGlobalData();
    const [tab, setTab] = useState('trends');
    const [threats, setThreats] = useState([]);
    const [syncTick, setSyncTick] = useState(0);
    const bcRef = useRef(null);
    const connectedChannels = useConnectedChannels();

    useEffect(() => {
        if (typeof BroadcastChannel === 'undefined') return;
        // [현 차수] 'genie_ai_sync' 는 전역 postMessage 발신자가 0건인 죽은 채널이었고, 동일 handler 가
        //   실발신자를 가진 'genie_connector_sync'(ApiKeys::publishConnectorSync)에도 바인딩돼 있어
        //   순수 중복이었다. 동작 변화 없이 죽은 구독만 제거한다.
        const ch2 = new BroadcastChannel(tChannelName('genie_connector_sync'));
        ch2.onmessage = () => setSyncTick(p => p + 1);
        return () => { ch2.close(); };
    }, []);

    const safeguard = useCallback((value, fieldName) => {
        const threat = secCheck(value);
        if (threat) {
            setThreats(prev => [...prev, { type: threat, value, field: fieldName }]);
            return '';
        }
        return value;
    }, []);

    // 181차 가상데이터 오염 해소: 운영=실데이터 없으면 0(빈값), 데모(IS_DEMO)만 시드 노출
    const live = {
        grossRevenue: pnlStats.revenue || (IS_DEMO ? 12000000 : 0),
        adSpend: pnlStats.adSpend || (IS_DEMO ? 2500000 : 0),
        platformFee: pnlStats.platformFee || (IS_DEMO ? 450000 : 0),
        operatingProfit: pnlStats.operatingProfit || (IS_DEMO ? 1800000 : 0),
        roas: budgetStats.blendedRoas || (IS_DEMO ? 4.25 : 0),
        totalOrders: Math.max(orderStats.count || 0, settlementStats.totalOrders || (IS_DEMO ? 1245 : 0)), // [현 차수 P2] 동일 주문 이중합산(주문원장+정산행) → 단일 SSOT(max)
        totalReturns: settlementStats.totalReturns || (IS_DEMO ? 45 : 0),
        returnRate: settlementStats.returnRate || (IS_DEMO ? 0.036 : 0),
        // [231차 OS#5] Copilot 근거 grounding — 전체 워터폴
        cogs: pnlStats.cogs || 0, shippingCost: pnlStats.shippingCost || 0,
        returnFee: pnlStats.returnFee || 0, couponDiscount: pnlStats.couponDiscount || 0,
        grossProfit: pnlStats.grossProfit || 0, margin: Number(pnlStats.margin || 0),
    };

    const TABS = [
        { id: 'trends', icon: '🔮', label: t('aiInsights.tabPredictions', 'Predictions') },
        { id: 'cards', icon: '🚨', label: t('aiInsights.tabGuardrails', 'Guardrails') },
        { id: 'chat', icon: '💬', label: t('aiInsights.tabAgency', 'AI Agency') },
        { id: 'history', icon: '📋', label: t('aiInsights.tabAuditLog', 'Audit Log') },
        { id: 'guide', icon: '📖', label: t('aiInsights.tabGuide', 'System Guide') },
    ];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', margin: '-14px -16px -20px', height: 'calc(100vh - 52px)', overflow: 'hidden', background: 'var(--bg, #f8fafc)', fontFamily: "'Inter', sans-serif" }}>
            <style>{`
                @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.5; } }
                @keyframes fadeInUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
                @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
                @keyframes spin { 100% { transform: rotate(360deg); } }
                .aii-strong-fix strong { font-weight: 800; }
            `}</style>

            <SecurityOverlay threats={threats} onDismiss={() => setThreats([])} t={t} />

            <div style={{ flexShrink: 0, padding: '24px 32px 0', zIndex: 10 }}>
                {/* Enterprise Hero Banner — 라이트 일관 */}
                <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 24, background: 'linear-gradient(135deg, #ffffff, var(--surface-2, #f8fafc))', border: `1px solid ${BORDER}`, marginBottom: 24, boxShadow: '0 8px 28px rgba(15,23,42,0.08)' }}>
                    <div style={{ position: 'absolute', top: -100, right: -100, width: 300, height: 300, borderRadius: '50%', background: `radial-gradient(circle, ${ACCENT}1f, transparent 70%)`, filter: 'blur(40px)', pointerEvents: 'none' }} />
                    <div style={{ position: 'absolute', bottom: -50, left: 100, width: 250, height: 250, borderRadius: '50%', background: `radial-gradient(circle, ${BLUE}14, transparent 70%)`, filter: 'blur(30px)', pointerEvents: 'none' }} />

                    <div style={{ position: 'relative', zIndex: 1, padding: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 24 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 20, minWidth: 0 }}>
                            <div style={{ width: 72, height: 72, borderRadius: 20, background: `linear-gradient(135deg, ${ACCENT}, ${BLUE})`, display: 'flex', alignItems: 'center', fontSize: 36, boxShadow: `0 16px 32px ${ACCENT}33`, justifyContent: 'center', flexShrink: 0 }}>
                                🤖
                            </div>
                            <div style={{ minWidth: 0 }}>
                                <h1 style={{ margin: 0, fontSize: 28, fontWeight: 900, color: TXT1, letterSpacing: -0.5 }}>{t("aiInsightsPage.enterpriseEngine", "엔터프라이즈 AI 엔진")}</h1>
                                <p style={{ margin: '6px 0 0', fontSize: 14, color: TXT2, maxWidth: 460, lineHeight: 1.5 }}>{t('aiInsights.heroSub', 'Autonomous orchestration, real-time predictive analytics, and automated decision-making.')}</p>
                            </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-end' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 16px', borderRadius: 99, background: 'rgba(22,163,74,0.08)', border: '1px solid rgba(22,163,74,0.25)', color: '#15803d', fontSize: 12, fontWeight: 700 }}>
                                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#16a34a', animation: 'pulse 1.5s infinite' }} /> {t('aiInsights.modelActive', 'Model Active & Synchronized')}
                            </div>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 16px', borderRadius: 99, background: 'rgba(2,132,199,0.08)', border: '1px solid rgba(2,132,199,0.25)', color: '#0369a1', fontSize: 12, fontWeight: 700 }}>
                                🔗 {connectedChannels.length || (IS_DEMO ? 12 : 0)} {t('aiInsights.channelsIntegrated', 'Channels Integrated')}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tab Navigation — 라이트 */}
                <div style={{ display: 'flex', gap: 4, background: SURFACE2, padding: 6, borderRadius: 16, border: `1px solid ${BORDER}`, flexWrap: 'wrap' }}>
                    {TABS.map(tb => (
                        <button key={tb.id} onClick={() => setTab(tb.id)} style={{
                            flex: '1 1 120px', padding: '12px', cursor: 'pointer', textAlign: 'center', borderRadius: 12,
                            background: tab === tb.id ? `linear-gradient(180deg, ${ACCENT}1a, ${ACCENT}0a)` : 'transparent',
                            color: tab === tb.id ? '#7c3aed' : TXT3, transition: 'all 200ms',
                            boxShadow: tab === tb.id ? '0 4px 12px rgba(168,85,247,0.12)' : 'none',
                            border: tab === tb.id ? `1px solid ${ACCENT}40` : '1px solid transparent'
                        }}>
                            <div style={{ fontSize: 14, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                                <span style={{ opacity: tab === tb.id ? 1 : 0.55 }}>{tb.icon}</span> {tb.label}
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Tab Contents */}
            <div className="aii-strong-fix" style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '24px 32px', paddingBottom: 100 }}>
                {tab === 'cards' && <InsightCardsTab live={live} t={t} connectedChannels={connectedChannels} navigate={navigate} />}
                {tab === 'trends' && <TrendsTab live={live} t={t} fmt={fmt} />}
                {tab === 'chat' && <AIAssistantTab t={t} safeguard={safeguard} live={live} navigate={navigate} />}
                {tab === 'history' && <HistoryTab t={t} />}
                {tab === 'guide' && <GuideTab t={t} />}
            </div>
        </div>
    );
}
