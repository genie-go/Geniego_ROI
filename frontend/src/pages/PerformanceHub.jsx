import React, { useState, useEffect, useMemo, useCallback, useRef, memo } from "react";
import { useSubtabPaintFix } from "../utils/subtabPaintFix";
import { tChannelName } from '../utils/tenantStorage.js'; // 180차: 회원 격리 크로스탭
import { useI18n } from "../i18n";
import { useCurrency } from '../contexts/CurrencyContext.jsx';
import { useAuth } from "../auth/AuthContext.jsx";
import { tabAllowedByPlan } from "../auth/tabPlanPolicy.js"; // [현 차수] 플랜별 탭 노출
import { IS_DEMO as _IS_DEMO_TAB } from "../utils/demoEnv";
import { useGlobalData } from '../context/GlobalDataContext.jsx';
import { useConnectorSync } from '../context/ConnectorSyncContext.jsx';
import { getJsonAuth, postJsonAuth } from '../services/apiClient.js';
import ProductSelectBar from '../components/dashboards/ProductSelectBar.jsx';
import ProductMarketingPanel from '../components/dashboards/ProductMarketingPanel.jsx';
import { IS_DEMO } from '../utils/demoEnv.js';
import { PERF_GUIDE } from './perfGuideI18n.js';

/* ─── Security Engine ──────────────────────────────────────── */
const SEC_PATTERNS = [
    { re: /<script/i, type: 'XSS' }, { re: /javascript:/i, type: 'XSS' },
    { re: /on\w+\s*=/i, type: 'XSS' }, { re: /union\s+select/i, type: 'SQL_INJECT' },
    { re: /drop\s+table/i, type: 'SQL_INJECT' }, { re: /\.\.\//g, type: 'PATH_TRAVERSAL' },
];
const secCheck = (v = '') => { for (const p of SEC_PATTERNS) { if (p.re.test(v)) return p.type; } return null; };

const SecurityOverlay = memo(function SecurityOverlay({ threats, onDismiss }) {
    const { t } = useI18n();
    if (!threats.length) return null;
    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: 'linear-gradient(135deg,#1a0000,#2d0a0a)', border: '2px solid #ef4444', borderRadius: 20, padding: 32, maxWidth: 480, width: '90%', textAlign: 'center' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>🚨</div>
                <div style={{ fontSize: 18, fontWeight: 900, color: '#ef4444', marginBottom: 8 }}>{t('performance.securityAlert')}</div>
                <div style={{ fontSize: 12, color: '#fca5a5', marginBottom: 20 }}>{t('performance.securityDesc')}</div>
                {threats.map((th, i) => (
                    <div key={i} style={{ background: 'rgba(239,68,68,0.15)', borderRadius: 8, padding: '8px 12px', marginBottom: 6, fontSize: 11, color: '#fca5a5', textAlign: 'left' }}>
                        <strong style={{ color: '#ef4444' }}>[{th.type}]</strong> {th.value.slice(0, 60)}… — {th.time}
                    </div>
                ))}
                <button onClick={onDismiss} style={{ marginTop: 16, padding: '8px 24px', borderRadius: 8, border: '1px solid #ef4444', background: 'rgba(239,68,68,0.2)', color: '#ef4444', fontWeight: 700, cursor: 'pointer', fontSize: 12 }}>
                    ✕ {t('performance.dismiss')}
                </button>
            </div>
        </div>
    );
});

/* ─── Shared utils ────────────────────────────────────────────── */
const fmtKRW = v => v == null ? "—" : v; // NOTE: replaced by useCurrency in component
const fmtM = v => v >= 1e6 ? (v / 1e6).toFixed(1) + "M" : v >= 1e3 ? (v / 1e3).toFixed(0) + "K" : String(v);
const pct = v => { const n = Number(v); return (Number.isFinite(n) ? n * 100 : 0).toFixed(1) + "%"; }; // [현 차수 P2] grossSales=0 시 Infinity/NaN% 방지
const round2 = v => Number(v).toFixed(2);

const get_EXCHANGE = () => ({ USD: 1330, JPY: 8.8, EUR: 1450, CNY: 183 });
const toKRW = (v, cur) => Math.round(v * (get_EXCHANGE()[cur] || 1));
const API = (import.meta.env.VITE_API_BASE || '').replace(/\/+$/, '');

/* ─── Shared components ──────────────────────────────────────── */
const KpiCard = memo(function KpiCard({ label, value, sub, color = "#4f8ef7", icon }) {
    return (
        <div className="kpi-card" style={{ "--accent": color }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div className="kpi-label">{label}</div>
                {icon && <span style={{ fontSize: 20, opacity: .8 }}>{icon}</span>}
            </div>
            <div className="kpi-value" style={{ color, fontSize: 22, marginTop: 6 }}>{value}</div>
            {sub && <div className="kpi-sub" style={{ marginTop: 4, fontSize: 10 }}>{sub}</div>}
        </div>
    );
});

const MiniBar = memo(function MiniBar({ value, max, color = "#4f8ef7" }) {
    return (
        <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 4, width: "100%" }}>
            <div style={{
                width: `${Math.min(100, (value / max) * 100)}%`, height: "100%", background: color, borderRadius: 4,
                transition: "width 0.5s cubic-bezier(.4,0,.2,1)"
            }} />
        </div>

    );
});

/* ─── Performance Tab ────────────────────────────────────────── */
const FUNNEL_STAGES = ["impressions", "clicks", "carts", "orders"];

const PerformanceTab = memo(function PerformanceTab() {
    const { t } = useI18n();
    const { fmt: fmtC } = useCurrency();
    const { hasMenuAccess, token, isDemo } = useAuth();
    const { channelBudgets, orderStats } = useGlobalData(); // 204차: 데모 성과=채널예산 단일소스 파생(마케팅 메뉴 정합)
    const [sort, setSort] = useState("revenue");
    const [team, setTeam] = useState("All");
    const [account, setAccount] = useState("All");
    const [summary, setSummary] = useState([]);

    const isMultiTeamAllowed = hasMenuAccess ? hasMenuAccess("analytics||multi_team_analysis") : true;

    useEffect(() => {
        const filters = {};
        if (team !== "All") filters.team = team;
        if (account !== "All") filters.account = account;

        const qs = new URLSearchParams(filters).toString();
        getJsonAuth(`/api/v1/ad-performance/summary?${qs}`)
            .then(data => {
                if (Array.isArray(data)) {
                    setSummary(data);
                } else {
                    console.error("Expected array, got:", data);
                    setSummary([]);
                }
            })
            .catch(err => {
                // 🛡️ GUARD: API 실패 → 운영은 빈 배열. 데모는 단일소스(channelBudgets) 파생(마케팅·예산 메뉴와 정합, 임의값 X).
                //   ★데모 판별은 빌드 플래그 IS_DEMO(demoEnv) 사용 — useAuth().isDemo(사용자 plan 기반)는 데모 빌드에서도 false 가능.
                if (IS_DEMO) {
                    const cb = channelBudgets || {};
                    const totClk = Object.values(cb).reduce((s, b) => s + Number(b.clicks || 0), 0);
                    const totOrd = Number(orderStats?.totalOrders || orderStats?.count || 0);
                    const cvr = totClk > 0 && totOrd > 0 ? totOrd / totClk : 0.018; // 클릭→전환율(단일소스 파생)
                    // [현 차수] 죽은 team/account 선택자 수정 — 데모는 팀/계정 차원이 없어 결정적 점유율로 세그먼트 스코프
                    //   (USA 45%·Japan 30%·Europe 25%, 하위계정=팀의 1/3). 선택 시 KPI가 그 세그먼트만큼 변동. 비율(ROAS) 보존.
                    const _teamShare = { All: 1, USA: 0.45, Japan: 0.30, Europe: 0.25 };
                    const segF = (_teamShare[team] ?? 1) * (account && account !== 'All' ? (1 / 3) : 1);
                    setSummary(Object.entries(cb).map(([key, b]) => {
                        const clicks = Math.round(Number(b.clicks || 0) * segF);
                        return {
                            channel: key, name: b.name, color: b.color,
                            impressions: Math.round(Number(b.impressions || 0) * segF), clicks,
                            conversions: Math.round(clicks * cvr),
                            revenue: Math.round(Number(b.revenue || 0) * segF), spend: Math.round(Number(b.spent || 0) * segF),
                        };
                    }));
                } else {
                    setSummary([]);  // ← 운영: 항상 빈 배열
                }
            });
    }, [team, account, token, isDemo, channelBudgets, orderStats]);

    const teams = ["All", "USA", "Japan", "Europe"];
    const accounts = useMemo(() => {
        if (team === "All") return ["All"];
        if (team === "USA") return ["All", "usa_meta_001", "usa_tiktok_002", "usa_amzn_003"];
        if (team === "Japan") return ["All", "japan_meta_001", "japan_tiktok_002", "japan_amzn_003"];
        if (team === "Europe") return ["All", "europe_meta_001", "europe_tiktok_002", "europe_amzn_003"];
        return ["All"];
    }, [team]);

    const CHANNELS_PERF = useMemo(() => {
        // 204차: 채널 목록을 summary(데모=channelBudgets 파생/운영=실데이터)에서 동적 생성 — 하드코딩 3채널 제거.
        const ICO = { meta: "📘", google: "🔍", tiktok: "🎵", naver_sa: "🟢", kakao_moment: "💬", coupang_ads: "🟠", amazon: "📦", snapchat: "👻", linkedin: "💼", criteo: "🟧", pinterest: "📌" };
        const COL = { meta: "#1877f2", google: "#22c55e", tiktok: "#ff0050", naver_sa: "#14d9b0", kakao_moment: "#eab308", coupang_ads: "#E31937", amazon: "#ff9900", snapchat: "#facc15", linkedin: "#0a66c2", criteo: "#f47521", pinterest: "#e60023" };
        const channels = (Array.isArray(summary) ? summary : []).map(s => ({
            id: s.channel, name: s.name || s.channel, icon: ICO[s.channel] || "📊", color: s.color || COL[s.channel] || "#4f8ef7",
        }));
        if (!channels.length) return [];

        return channels.map(ch => {
            const s = summary.find(i => i.channel === ch.id) || {};
            const rev = Number(s.revenue || 0);
            const spend = Number(s.spend || 0);
            return {
                ...ch,
                impressions: Number(s.impressions || 0),
                clicks: Number(s.clicks || 0),
                carts: IS_DEMO ? Math.round(Number(s.clicks || 0) * 0.15) : 0, // [259차] 장바구니추가는 매체 summary 미보고 필드 → 운영은 하드코딩비율(0.15) 미노출(AdStatus reach와 동일 게이트)
                orders: Number(s.conversions || 0),
                revenue: rev,
                adSpend: spend,
                ctr: s.impressions ? s.clicks / s.impressions : 0,
                cvr: s.clicks ? s.conversions / s.clicks : 0,
                roas: spend ? rev / spend : 0,
                acos: rev ? spend / rev : 0
            };
        });
    }, [summary]);

    const totals = useMemo(() => {
        const result = CHANNELS_PERF.reduce((acc, c) => ({
            impressions: acc.impressions + c.impressions,
            clicks: acc.clicks + c.clicks,
            carts: acc.carts + c.carts,
            orders: acc.orders + c.orders,
            revenue: acc.revenue + c.revenue,
            adSpend: acc.adSpend + c.adSpend,
        }), { impressions: 0, clicks: 0, carts: 0, orders: 0, revenue: 0, adSpend: 0 });

        result.roas = result.adSpend ? result.revenue / result.adSpend : 0;
        result.acos = result.revenue ? result.adSpend / result.revenue : 0;

        return result;
    }, [CHANNELS_PERF]);

    const sorted = useMemo(() => [...CHANNELS_PERF].sort((a, b) => b[sort] - a[sort]), [CHANNELS_PERF, sort]);

    return (
        <div style={{ display: "grid", gap: 18 }}>
            <div className="card card-glass" style={{ padding: "12px 20px", display: "flex", gap: 20, alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, opacity: isMultiTeamAllowed ? 1 : 0.5 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)" }}>{t("performance.team")}:</span>
                    <select value={team} onChange={e => { setTeam(e.target.value); setAccount("All"); }} disabled={!isMultiTeamAllowed} style={{ background: 'var(--surface)', border: "1px solid var(--border)", borderRadius: 6, color: '#fff', fontSize: 11, padding: "4px 8px", cursor: isMultiTeamAllowed ? "pointer" : "not-allowed" }}>
                        {teams.map(t_id => <option key={t_id} value={t_id}>{t_id === "All" ? t("performance.allTeams") : t_id}</option>)}
                    </select>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, opacity: isMultiTeamAllowed ? 1 : 0.5 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)" }}>{t("performance.account")}:</span>
                    <select value={account} onChange={e => setAccount(e.target.value)} disabled={!isMultiTeamAllowed} style={{ background: 'var(--surface)', border: "1px solid var(--border)", borderRadius: 6, color: '#fff', fontSize: 11, padding: "4px 8px", cursor: isMultiTeamAllowed ? "pointer" : "not-allowed" }}>
                        {accounts.map(a_id => <option key={a_id} value={a_id}>{a_id === "All" ? t("performance.allAccounts") : a_id}</option>)}
                    </select>
                    {!isMultiTeamAllowed && <span style={{ fontSize: 10, color: "var(--accent)" }}>🔒 {t("performance.upgradeLabel", "업그레이드")}</span>}
                </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 10 }}>
                <KpiCard label={t('performance.totalImpressions')} value={fmtM(totals.impressions)} color="#a855f7" icon="👁" sub={t('performance.teamSpecificTotal')} />
                <KpiCard label={t('performance.totalClicks')} value={fmtM(totals.clicks)} color="#4f8ef7" icon="🖱" sub={`CTR ${pct(totals.clicks / (totals.impressions || 1))}`} />
                <KpiCard label={t('performance.cartAdds')} value={fmtM(totals.carts)} color="#14d9b0" icon="🛒" sub={`Click→Cart ${pct(totals.carts / (totals.clicks || 1))}`} />
                <KpiCard label={t('performance.purchases')} value={fmtM(totals.orders)} color="#22c55e" icon="✅" sub={`CVR ${pct(totals.orders / (totals.clicks || 1))}`} />
                <KpiCard label={t('performance.totalRevenue')} value={fmtC(totals.revenue)} color="#f97316" icon="💰" sub={t('performance.adAttributedRevenue')} />
                <KpiCard label={t('performance.roas')} value={round2(totals.roas) + "x"} color="#eab308" icon="📈"
                    sub={`ACOS ${pct(totals.acos)}`} />
            </div>

            <div className="card card-glass" style={{ padding: 20 }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 16 }}>{t('performance.conversionFunnel')}</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14 }}>
                    {FUNNEL_STAGES.map((stage, si) => {
                        const FUNNEL_LABELS_I18N = { impressions: t('performance.funnelImpressions'), clicks: t('performance.funnelClicks'), carts: t('performance.funnelCarts'), orders: t('performance.funnelOrders') };
                        const max = Math.max(...CHANNELS_PERF.map(c => c[stage]), 1);
                        return (
                            <div key={stage}>
                                <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-3)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.8px" }}>{FUNNEL_LABELS_I18N[stage]}</div>
                                <div style={{ display: "grid", gap: 6 }}>
                                    {CHANNELS_PERF.map(ch => (
                                        <div key={ch.id}>
                                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                                                <span style={{ fontSize: 10, color: "var(--text-2)" }}>{ch.icon} {ch.name}</span>
                                                <span style={{ fontSize: 10, fontFamily: "monospace", color: ch.color, fontWeight: 700 }}>
                                                    {fmtM(ch[stage])}
                                                </span>
                                            </div>
                                            <MiniBar value={ch[stage]} max={max} color={ch.color} />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="card card-glass" style={{ padding: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16, alignItems: "center" }}>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{t('performance.channelPerfDetail')}</div>
                    <div style={{ display: "flex", gap: 6 }}>
                        {[["revenue", t('performance.sortRevenue')], ["roas", "ROAS"], ["orders", t('performance.sortOrders')], ["acos", "ACOS"]].map(([k, l]) => (
                            <button key={k} onClick={() => setSort(k)} style={{ padding: "3px 10px", borderRadius: 6, border: "1px solid", borderColor: sort === k ? "#4f8ef7" : "var(--border)", background: sort === k ? "rgba(79,142,247,0.15)" : "transparent", color: sort === k ? "#4f8ef7" : "var(--text-3)", fontSize: 10, cursor: "pointer", fontWeight: 700 }}>{l}</button>
                        ))}
                    </div>
                </div>
                <div style={{ overflowX: "auto" }}>
                    <table className="table">
                        <thead>
                            <tr>
                                <th>{t('performance.channel')}</th>
                                <th style={{ textAlign: "right" }}>{t('performance.impressions')}</th>
                                <th style={{ textAlign: "right" }}>{t('performance.clicks')} (CTR)</th>
                                <th style={{ textAlign: "right" }}>{t('performance.cartAdds')}</th>
                                <th style={{ textAlign: "right" }}>{t('performance.purchases')} (CVR)</th>
                                <th style={{ textAlign: "right" }}>{t('performance.revenue')}</th>
                                <th style={{ textAlign: "right" }}>{t('performance.adSpend')}</th>
                                <th style={{ textAlign: "right" }}>{t('performance.roas')}</th>
                                <th style={{ textAlign: "right" }}>{t('performance.acos')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sorted.map(ch => (
                                <tr key={ch.id}>
                                    <td>
                                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                            <span style={{ width: 8, height: 8, borderRadius: "50%", background: ch.color, display: "inline-block" }} />
                                            <span style={{ fontWeight: 700 }}>{ch.icon} {ch.name}</span>
                                        </div>
                                    </td>
                                    <td style={{ textAlign: "right", fontFamily: "monospace" }}>{fmtM(ch.impressions)}</td>
                                    <td style={{ textAlign: "right" }}>
                                        <div style={{ fontFamily: "monospace" }}>{fmtM(ch.clicks)}</div>
                                        <div style={{ fontSize: 10, color: "var(--text-3)" }}>{pct(ch.ctr)}</div>
                                    </td>
                                    <td style={{ textAlign: "right", fontFamily: "monospace" }}>{fmtM(ch.carts)}</td>
                                    <td style={{ textAlign: "right" }}>
                                        <div style={{ fontFamily: "monospace" }}>{fmtM(ch.orders)}</div>
                                        <div style={{ fontSize: 10, color: "var(--text-3)" }}>{pct(ch.cvr)}</div>
                                    </td>
                                    <td style={{ textAlign: "right", fontFamily: "monospace", fontWeight: 700, color: "#f97316" }}>{fmtM(ch.revenue)}</td>
                                    <td style={{ textAlign: "right", fontFamily: "monospace", color: "#ef4444" }}>{fmtM(ch.adSpend)}</td>
                                    <td style={{ textAlign: "right" }}>
                                        <span style={{ fontWeight: 800, color: ch.roas >= 2 ? "#22c55e" : ch.roas >= 1 ? "#eab308" : "#ef4444" }}>
                                            {round2(ch.roas)}x
                                        </span>
                                    </td>
                                    <td style={{ textAlign: "right" }}>
                                        <span style={{ fontWeight: 700, color: ch.acos <= 0.4 ? "#22c55e" : ch.acos <= 0.6 ? "#eab308" : "#ef4444" }}>
                                            {pct(ch.acos)}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr style={{ borderTop: "2px solid rgba(99,140,255,0.2)", background: "rgba(79,142,247,0.04)" }}>
                                <td style={{ fontWeight: 700, fontSize: 11 }}>{t('performance.totalAvg')}</td>
                                <td style={{ textAlign: "right", fontFamily: "monospace", fontWeight: 700 }}>{fmtM(totals.impressions)}</td>
                                <td style={{ textAlign: "right", fontFamily: "monospace", fontWeight: 700 }}>{fmtM(totals.clicks)}</td>
                                <td style={{ textAlign: "right", fontFamily: "monospace", fontWeight: 700 }}>{fmtM(totals.carts)}</td>
                                <td style={{ textAlign: "right", fontFamily: "monospace", fontWeight: 700 }}>{fmtM(totals.orders)}</td>
                                <td style={{ textAlign: "right", fontFamily: "monospace", fontWeight: 800, color: "#f97316" }}>{fmtM(totals.revenue)}</td>
                                <td style={{ textAlign: "right", fontFamily: "monospace", fontWeight: 700, color: "#ef4444" }}>{fmtM(totals.adSpend)}</td>
                                <td style={{ textAlign: "right", fontWeight: 800, color: "#22c55e" }}>{round2(totals.roas)}x</td>
                                <td style={{ textAlign: "right", fontWeight: 800, color: "#22c55e" }}>{pct(totals.acos)}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        </div>
    );
});

const Trend = memo(function Trend({ v }) {
    const up = v > 0;
    return (
        <div style={{ fontSize: 10, color: up ? "#22c55e" : "#ef4444", fontWeight: 700 }}>
            {up ? "▲" : "▼"} {Math.abs(v).toFixed(1)}%
        </div>
    );
});


/* ═══════════════════════════════════════════════════════════════
   TAB 2: Settlement Dashboard (Settlement Dashboard)
═══════════════════════════════════════════════════════════════ */
const FX_RATES = [
    { cur: 'USD', rate: 1330, prev: 1318, flag: '🇺🇸' },
    { cur: 'JPY', rate: 8.82, prev: 8.95, flag: '🇯🇵' },
    { cur: 'EUR', rate: 1452, prev: 1438, flag: '🇪🇺' },
    { cur: 'CNY', rate: 183, prev: 185, flag: '🇨🇳' },
];

// 204차: 하드코딩 SETTLE_CHANNELS 제거 — 데모/운영 모두 gd.settlement 단일소스 집계로 통일(동기화).
const SETTLE_META ={ naver:{name:'Naver Store',icon:'🟢',color:'#03CF5D'}, coupang:{name:'Coupang',icon:'🛒',color:'#F43E37'}, oliveyoung:{name:'Olive Young',icon:'💚',color:'#A4CA42'}, gmarket:{name:'G-Market',icon:'🔵',color:'#1A8CFF'}, amazon_jp:{name:'Amazon Japan',icon:'📦',color:'#FF9900'}, shopify:{name:'Shopify',icon:'🏪',color:'#96BF48'}, eleven:{name:'11번가',icon:'🟠',color:'#f97316'}, kakao:{name:'Kakao',icon:'💬',color:'#fbbf24'}, smartstore:{name:'SmartStore',icon:'🟢',color:'#03CF5D'} };

const SettlementTab = memo(function SettlementTab() {
    const { t } = useI18n();
    const { fmt: fmtC } = useCurrency();
    const { settlement = [] } = useGlobalData();   // 데모=시드, 운영=/api/v424/orderhub/settlements(테넌트 격리 실데이터)
    const [baseCur, setBaseCur] = useState("KRW");

    // Convert all to KRW for totals
    const toBase = useCallback((v, cur) => cur === "KRW" ? v : toKRW(v, cur), []);

    // 204차 동기화: 데모도 단일 소스(gd.settlement=DEMO_SETTLEMENT)에서 채널별 집계 — Settlements 페이지와 정합.
    //   과거 IS_DEMO 분기는 독립 하드코딩 SETTLE_CHANNELS(타 메뉴 불일치 임의값)를 반환했음 → 제거.
    //   운영도 동일 경로(테넌트 격리 settlement). 데모/운영 단일 집계 로직.
    const channels = useMemo(() => {
        const by = {};
        for (const s of (Array.isArray(settlement) ? settlement : [])) {
            const k = s.channel || s.channelId || 'etc';
            const m = SETTLE_META[k] || {};
            if (!by[k]) by[k] = { id: k, name: s.channelName || m.name || k, icon: m.icon || '🏷️', color: m.color || '#64748b', currency: 'KRW', grossSales: 0, platformFee: 0, adFee: 0, paymentFee: 0, refund: 0, netPayout: 0 };
            by[k].grossSales += Number(s.grossSales) || 0;
            by[k].platformFee += Number(s.platformFee) || 0;
            by[k].adFee += Number(s.adFee) || 0;
            by[k].paymentFee += Number(s.couponDiscount ?? s.paymentFee) || 0;
            by[k].refund += Number(s.returnFee ?? s.refund) || 0;
            by[k].netPayout += Number(s.netPayout) || 0;
        }
        return Object.values(by);
    }, [settlement]);

    const totals = useMemo(() => ({
        grossSales: channels.reduce((s, c) => s + toBase(c.grossSales, c.currency), 0),
        platformFee: channels.reduce((s, c) => s + toBase(c.platformFee, c.currency), 0),
        adFee: channels.reduce((s, c) => s + toBase(c.adFee, c.currency), 0),
        paymentFee: channels.reduce((s, c) => s + toBase(c.paymentFee, c.currency), 0),
        refund: channels.reduce((s, c) => s + toBase(c.refund, c.currency), 0),
        netPayout: channels.reduce((s, c) => s + toBase(c.netPayout, c.currency), 0),
    }), [toBase, channels]);

    const netRate = useMemo(() => totals.grossSales ? totals.netPayout / totals.grossSales : 0, [totals]);
    // [259차] 아래 두 useMemo 는 이른 반환(빈 정산상태) 앞으로 이동 — 운영에서 정산 데이터가 []→도착 전이 시
    //   훅 개수가 렌더 간 달라져 "Rendered more hooks than previous render" 크래시가 나던 조건부 훅 위반 수정.
    const totalDeductions = useMemo(() => totals.platformFee + totals.adFee + totals.paymentFee + totals.refund, [totals]);
    // Deduction breakdown for pie-style display
    const deductions = useMemo(() => [
        { label: t('performance.deductPlatformFee'), value: totals.platformFee, color: "#ef4444" },
        { label: t('performance.deductAdSpend'), value: totals.adFee, color: "#f97316" },
        { label: t('performance.deductPaymentFee'), value: totals.paymentFee, color: "#eab308" },
        { label: t('performance.deductRefund'), value: totals.refund, color: "#a855f7" },
    ], [t, totals]);

    // 운영에서 실 정산 데이터가 없으면 정직한 빈 상태(가짜 수치 금지)
    if (!IS_DEMO && !channels.length) {
        return (
            <div className="card card-glass" style={{ textAlign: 'center', padding: '48px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                <div style={{ fontSize: 44, opacity: 0.85 }}>💳</div>
                <div style={{ fontWeight: 800, fontSize: 14, color: '#fff' }}>{t('performance.settleEmptyTitle', '정산 데이터가 아직 없습니다')}</div>
                <div style={{ fontSize: 12.5, color: 'var(--text-3)', maxWidth: 460, lineHeight: 1.7 }}>{t('performance.settleEmptyDesc', '주문·정산 채널을 연동하면 채널별 실제 정산 내역이 테넌트 단위로 안전하게 집계되어 여기에 표시됩니다.')}</div>
            </div>
        );
    }

    return (
        <div style={{ display: "grid", gap: 18 }}>
            {/* FX Rates — 시장 환율(참고). 운영은 단일통화(KRW) 실데이터라 미표시(가상 환율 노출 방지) */}
            {IS_DEMO && (
            <div className="card card-glass" style={{ padding: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <div style={{ fontWeight: 700, fontSize: 12 }}>{t('performance.liveFxRates')}</div>
                    <div style={{ fontSize: 10, color: "var(--text-3)" }}>{new Date().toLocaleString()}</div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
                    {FX_RATES.map(fx => {
                        const chg = ((fx.rate - fx.prev) / fx.prev) * 100;
                        return (
                            <div key={fx.cur} style={{ padding: "10px 14px", borderRadius: 12, background: "rgba(9,15,30,0.6)", border: "1px solid rgba(99,140,255,0.08)", textAlign: "center" }}>
                                <div style={{ fontSize: 16, marginBottom: 4 }}>{fx.flag}</div>
                                <div style={{ fontWeight: 800, fontSize: 16, color: '#fff' }}>
                                    {fx.rate < 100 ? fx.rate.toFixed(1) : fx.rate.toLocaleString()}
                                </div>
                                <div style={{ fontSize: 10, color: "var(--text-3)", marginBottom: 3 }}>1 {fx.cur} = {fmtC(fx.rate < 100 ? Number(fx.rate.toFixed(1)) : fx.rate)}</div>
                                <Trend v={chg} />
                            </div>
                        );
                    })}
                </div>
            </div>
            )}

            {/* KPIs */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 10 }}>
                <KpiCard label={t('performance.totalRevenueKrw')} value={fmtC(totals.grossSales)} color="#4f8ef7" icon="💰" />
                <KpiCard label={t('performance.platformFee')} value={fmtC(totals.platformFee)} color="#ef4444" icon="🏪"
                    sub={pct(totals.platformFee / totals.grossSales)} />
                <KpiCard label={t('performance.adSpend')} value={fmtC(totals.adFee)} color="#f97316" icon="📣"
                    sub={pct(totals.adFee / totals.grossSales)} />
                <KpiCard label={t('performance.totalDeductions')} value={fmtC(totalDeductions)} color="#a855f7" icon="📉"
                    sub={pct(totalDeductions / totals.grossSales)} />
                <KpiCard label={t('performance.netSettlement')} value={fmtC(totals.netPayout)} color="#22c55e" icon="✅"
                    sub={`${t('performance.effectiveRate')} ${pct(netRate)}`} />
            </div>

            {/* Deduction breakdown bar */}
            <div className="card card-glass" style={{ padding: 20 }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 14 }}>{t('performance.deductionBreakdown')}</div>
                <div style={{ display: "flex", height: 18, borderRadius: 9, overflow: "hidden", marginBottom: 14 }}>
                    {deductions.map((d, i) => (
                        <div key={d.label} style={{ flex: d.value, background: d.color, position: "relative" }}
                            title={`${d.label}: ${fmtC(d.value)}`} />
                    ))}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
                    {deductions.map(d => (
                        <div key={d.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{ width: 10, height: 10, borderRadius: 2, background: d.color, flexShrink: 0 }} />
                            <div>
                                <div style={{ fontSize: 10, color: "var(--text-3)" }}>{d.label}</div>
                                <div style={{ fontWeight: 700, fontSize: 12, color: '#fff' }}>{fmtC(d.value)}</div>
                                <div style={{ fontSize: 10, color: d.color }}>{pct(d.value / totals.grossSales)}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Per-channel table */}
            <div className="card card-glass" style={{ padding: 20 }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 14 }}>{t('performance.settleByChannel')}</div>
                <div style={{ overflowX: "auto" }}>
                    <table className="table">
                        <thead>
                            <tr>
                                <th>{t('performance.channel')}</th>
                                <th style={{ textAlign: "center" }}>{t('performance.currency')}</th>
                                <th style={{ textAlign: "right" }}>{t('performance.grossSales')}</th>
                                <th style={{ textAlign: "right" }}>{t('performance.platformFee')}</th>
                                <th style={{ textAlign: "right" }}>{t('performance.adSpend')}</th>
                                <th style={{ textAlign: "right" }}>{t('performance.paymentFee')}</th>
                                <th style={{ textAlign: "right" }}>{t('performance.refundReturn')}</th>
                                <th style={{ textAlign: "right" }}>{t('performance.netPayout')}</th>
                                <th style={{ textAlign: "right" }}>{t('performance.krwEquiv')}</th>
                                <th style={{ textAlign: "right" }}>{t('performance.settleRate')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {channels.map(ch => {
                                const kr = toBase(ch.netPayout, ch.currency);
                                const rate = ch.grossSales > 0 ? ch.netPayout / ch.grossSales : 0; // [현 차수 P2] 0나눗셈 가드
                                const fmt = v => ch.currency === "KRW" ? fmtC(v) : "$" + fmtM(v);
                                return (
                                    <tr key={ch.id}>
                                        <td>
                                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                <span style={{ width: 8, height: 8, borderRadius: "50%", background: ch.color, display: "inline-block" }} />
                                                <span style={{ fontWeight: 700 }}>{ch.icon} {ch.name}</span>
                                            </div>
                                        </td>
                                        <td style={{ textAlign: "center" }}>
                                            <span style={{ fontFamily: "monospace", fontSize: 10, padding: "2px 6px", borderRadius: 4, background: "rgba(99,140,255,0.1)", border: "1px solid rgba(99,140,255,0.15)" }}>{ch.currency}</span>
                                        </td>
                                        <td style={{ textAlign: "right", fontFamily: "monospace", fontWeight: 700 }}>{fmt(ch.grossSales)}</td>
                                        <td style={{ textAlign: "right", fontFamily: "monospace", color: "#ef4444" }}>{fmt(ch.platformFee)}<br />
                                            <span style={{ fontSize: 10, color: "var(--text-3)" }}>{pct(ch.platformFee / ch.grossSales)}</span>
                                        </td>
                                        <td style={{ textAlign: "right", fontFamily: "monospace", color: "#f97316" }}>{fmt(ch.adFee)}</td>
                                        <td style={{ textAlign: "right", fontFamily: "monospace", color: "#eab308" }}>{fmt(ch.paymentFee)}</td>
                                        <td style={{ textAlign: "right", fontFamily: "monospace", color: "#a855f7" }}>{fmt(ch.refund)}</td>
                                        <td style={{ textAlign: "right", fontFamily: "monospace", fontWeight: 800, color: "#22c55e" }}>{fmt(ch.netPayout)}</td>
                                        <td style={{ textAlign: "right", fontFamily: "monospace", color: "var(--text-2)" }}>{fmtC(kr)}</td>
                                        <td style={{ textAlign: "right" }}>
                                            <span style={{ fontWeight: 700, color: rate >= 0.8 ? "#22c55e" : rate >= 0.7 ? "#eab308" : "#ef4444" }}>
                                                {pct(rate)}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
});

/* ═══════════════════════════════════════════════════════════════
   TAB 3: Creator Settlement (Creator Settlement)
═══════════════════════════════════════════════════════════════ */
/* 🛡️ GUARD: Creator data is now sourced from GlobalDataContext (demo=seed, prod=API)
   Hardcoded demo data has been removed to prevent production contamination. */
const _PERF_CREATORS_FALLBACK = [];  // ← 운영: 항상 빈 배열

const TIER_COLOR = { Nano: "#14d9b0", Micro: "#4f8ef7", Mid: "#a855f7", Macro: "#f97316" };
const PLATFORM_ICO = { youtube: "▶", instagram: "📸", tiktok: "🎵" };

const today = new Date(); // [현 차수] 로그인 시점 기준(고정 2026-03-04 제거) — 실환경처럼 잔여일 계산
const daysLeft = d => Math.ceil((new Date(d) - today) / (1000 * 60 * 60 * 24));

const CreatorTab = memo(function CreatorTab() {
    const { t } = useI18n();
    const { fmt: fmtC } = useCurrency();
    const { creators: ctxCreators = [] } = useGlobalData();
    const [expanded, setExpanded] = useState(null);
    const [modal, setModal] = useState(null);
    const [selected, setSelected] = useState(null);
    // [259차] 크리에이터 정산 "완료" 실배선 상태(가짜 setModal(null) → 실 정산기록 POST)
    const [payBank, setPayBank] = useState('KakaoBank');
    const [payAccount, setPayAccount] = useState('');
    const [settling, setSettling] = useState(false);
    const submitSettlement = async () => {
        if (!selected) return;
        setSettling(true);
        const gross = Number(selected.contractRate) || 0;
        const tax = Math.round(gross * 0.03) + Math.round(gross * 0.003); // [현 차수 P2] 표준 3.3%(소득세3%+지방0.3%). 기존 3.63% 과다공제
        try {
            const r = await postJsonAuth('/api/v423/influencer/settlement-record', {
                creator_id: String(selected.id ?? ''), creator_name: selected.name || '',
                gross, tax, net_payout: gross - tax, bank: payBank, account: payAccount,
            });
            if (r?.ok) { setModal(null); setPayAccount(''); }
            else alert(t('performance.settleFail', '정산 기록에 실패했습니다.'));
        } catch { alert(t('performance.settleFail', '정산 기록에 실패했습니다.')); }
        finally { setSettling(false); }
    };

    // 🛡️ GUARD: Use GlobalDataContext creators (demo=seed, prod=API). Never hardcoded.
    const CREATORS = useMemo(() => ctxCreators.length > 0 ? ctxCreators.map(c => ({
        id: c.id, name: c.name, handle: c.identities?.[0]?.handle || '', platform: c.identities?.[0]?.type || 'instagram',
        tier: c.tier, status: c.settle?.status === 'unpaid' && c.contract?.esign === 'rejected' ? 'expired' : 'active',
        contractRate: c.contract?.flatFee || 0, revenue: c.stats?.revenue || 0, orders: c.stats?.orders || 0,
        // 204차 fix: whitelistExpiry/period 는 이미 'YYYY-MM-DD' 문자열(isoDate). 과거 new Date(Date.now()+문자열)은
        //   숫자+문자열 연결로 Invalid Date → toISOString() RangeError 크래시(크리에이터 서브탭 화면 오류). 직접 사용.
        attribution: c.stats?.engagement || 0, rightsExpiry: c.contract?.whitelistExpiry || '2027-12-31',
        contractEnd: c.contract?.period?.[1] || '2027-12-31',
        content: (c.content || []).map(ct => ({ title: ct.title, views: ct.views || 0, orders: ct.orders || 0, revenue: ct.revenue || 0, attrib: ct.engRate || 0 })),
    })) : (IS_DEMO ? _PERF_CREATORS_FALLBACK : []), [ctxCreators]); // [259차 철칙] 운영은 하드코딩 폴백 미노출(무데이터=빈배열)·데모만 시드

    const totPayout = useMemo(() => CREATORS.reduce((s, c) => s + (c.contractRate || 0), 0), [CREATORS]);
    const totRevenue = useMemo(() => CREATORS.reduce((s, c) => s + (c.revenue || 0), 0), [CREATORS]);
    const totOrders = useMemo(() => CREATORS.reduce((s, c) => s + (c.orders || 0), 0), [CREATORS]);
    const avgAttrib = useMemo(() => CREATORS.length > 0 ? CREATORS.reduce((s, c) => s + (c.attribution || 0), 0) / CREATORS.length : 0, [CREATORS]);
    const expiredSoon = useMemo(() => CREATORS.filter(c => daysLeft(c.rightsExpiry) <= 90 && c.status !== "expired").length, [CREATORS]);

    const openSettle = useCallback(c => { setSelected(c); setModal("settle"); }, []);

    return (
        <div style={{ display: "grid", gap: 18 }}>
            {/* KPIs */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 10 }}>
                <KpiCard label={t('performance.totalCreators')} value={CREATORS.length + t('performance.people')} color="#4f8ef7" icon="👤" />
                <KpiCard label={t('performance.totalPayoutEst')} value={fmtC(totPayout)} color="#a855f7" icon="💸" />
                <KpiCard label={t('performance.creatorRevenue')} value={fmtC(totRevenue)} color="#f97316" icon="📊" />
                <KpiCard label={t('performance.avgAttribution')} value={pct(avgAttrib || 0)} color="#22c55e" icon="🎯" />
                <KpiCard label={t('performance.rightsExpiringSoon')} value={expiredSoon + t('performance.items')} color={expiredSoon > 0 ? "#ef4444" : "#22c55e"} icon="⚠" sub={t('performance.within90Days')} />
            </div>

            {/* Rights expiry alerts */}
            {CREATORS.filter(c => daysLeft(c.rightsExpiry) <= 90).map(c => {
                const dl = daysLeft(c.rightsExpiry);
                const expired = dl < 0;
                return (
                    <div key={c.id} style={{
                        padding: "10px 16px", borderRadius: 10,
                        background: expired ? "rgba(239,68,68,0.08)" : "rgba(234,179,8,0.07)",
                        border: `1px solid ${expired ? "rgba(239,68,68,0.25)" : "rgba(234,179,8,0.2)"}`,
                        display: "flex", justifyContent: "space-between", alignItems: "center"
                    }}>
                        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                            <span style={{ fontSize: 16 }}>{expired ? "🔴" : "🟡"}</span>
                            <div>
                                <span style={{ fontWeight: 700, fontSize: 12 }}>{c.name}</span>
                                <span style={{ fontSize: 11, color: "var(--text-3)", marginLeft: 8 }}>{c.handle}</span>
                            </div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                            <div style={{ fontWeight: 700, fontSize: 11, color: expired ? "#ef4444" : "#eab308" }}>
                                {expired ? t('performance.expired') : `${t('performance.rightsExpiry')} ${dl}${t('performance.daysUnit')}`}
                            </div>
                            <div style={{ fontSize: 10, color: "var(--text-3)" }}>{t('performance.expiryDate')}: {c.rightsExpiry}</div>
                        </div>
                        <button onClick={() => { window.location.href = '/influencer-ugc'; }} className="btn-primary" style={{ fontSize: 10, padding: "5px 12px", cursor: "pointer", background: expired ? "linear-gradient(135deg,#ef4444,#a855f7)" : "linear-gradient(135deg,#eab308,#f97316)" }}>
                            {expired ? t('performance.requestRenewal') : t('performance.renewRights')}
                        </button>
                    </div>
                );
            })}

            {/* Creator cards */}
            <div style={{ display: "grid", gap: 14 }}>
                {CREATORS.map(c => {
                    const dl = daysLeft(c.rightsExpiry);
                    const expired = c.status === "expired" || dl < 0;
                    const roi = c.contractRate ? c.revenue / c.contractRate : 0; // [259차] 계약료 0 시 Infinity("Infinityx") 표시 방지
                    const tax = Math.round(c.contractRate * 0.033);
                    const net = c.contractRate - tax;

                    return (
                        <div key={c.id} className="card card-glass" style={{
                            borderLeft: `3px solid ${TIER_COLOR[c.tier]}`,
                            opacity: expired ? 0.75 : 1
                        }}>
                            {/* Header */}
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
                                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                                    <div style={{
                                        width: 44, height: 44, borderRadius: 12, display: "flex", alignItems: "center",
                                        justifyContent: "center", fontSize: 20, background: `${TIER_COLOR[c.tier]}18`,
                                        border: `1px solid ${TIER_COLOR[c.tier]}33`
                                    }}>
                                        {PLATFORM_ICO[c.platform]}
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 800, fontSize: 14 }}>{c.name}</div>
                                        <div style={{ fontSize: 11, color: "#4f8ef7" }}>{c.handle}</div>
                                        <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                                            <span style={{
                                                fontSize: 10, padding: "2px 7px", borderRadius: 99, fontWeight: 700,
                                                background: `${TIER_COLOR[c.tier]}18`, color: TIER_COLOR[c.tier],
                                                border: `1px solid ${TIER_COLOR[c.tier]}33`
                                            }}>{c.tier}</span>
                                            <span style={{
                                                fontSize: 10, padding: "2px 7px", borderRadius: 99, fontWeight: 700,
                                                background: expired ? "rgba(239,68,68,0.1)" : "rgba(34,197,94,0.1)",
                                                color: expired ? "#ef4444" : "#22c55e",
                                                border: `1px solid ${expired ? "rgba(239,68,68,0.25)" : "rgba(34,197,94,0.25)"}`
                                            }}>
                                                {expired ? t('performance.expired') : t('performance.active')}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div style={{ display: "flex", gap: 6 }}>
                                    <button className="btn-ghost" style={{ fontSize: 10, padding: "4px 10px" }}
                                        onClick={() => setExpanded(expanded === c.id ? null : c.id)}>
                                        {expanded === c.id ? `▲ ${t('performance.collapse')}` : `▼ ${t('performance.contentAttribution')}`}
                                    </button>
                                    <button className="btn-primary" style={{ fontSize: 10, padding: "4px 12px", background: "linear-gradient(135deg,#a855f7,#ec4899)" }}
                                        onClick={() => openSettle(c)}>💰 {t('performance.settle')}</button>
                                </div>
                            </div>

                            {/* Metrics grid */}
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 10, marginBottom: expanded === c.id ? 14 : 0 }}>
                                {[
                                    [t('performance.contractFee'), fmtC(c.contractRate), "#a855f7"],
                                    [t('performance.attributedOrders'), c.orders + t('performance.items'), "#4f8ef7"],
                                    [t('performance.attributedRevenue'), fmtC(c.revenue), "#f97316"],
                                    [t('performance.attribution'), pct(c.attribution), "#22c55e"],
                                    [t('performance.roi'), round2(roi) + "x", roi >= 50 ? "#22c55e" : "#eab308"],
                                    [t('performance.rightsExpiry'), expired ? t('performance.expired') : dl + t('performance.daysUnit'), dl < 0 ? "#ef4444" : dl < 90 ? "#eab308" : "#22c55e"],
                                ].map(([l, v, col]) => (
                                    <div key={l} style={{ padding: "8px 10px", borderRadius: 10, background: "rgba(9,15,30,0.6)", textAlign: "center" }}>
                                        <div style={{ fontSize: 10, color: "var(--text-3)", fontWeight: 700, marginBottom: 3 }}>{l}</div>
                                        <div style={{ fontSize: 13, fontWeight: 800, color: col }}>{v}</div>
                                    </div>
                                ))}
                            </div>

                            {/* Attribution progress */}
                            <div style={{ marginTop: expanded === c.id ? 0 : 10 }}>
                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 10 }}>
                                    <span style={{ color: "var(--text-3)" }}>{t('performance.contentAttribRate')}</span>
                                    <span style={{ fontWeight: 700, color: "#22c55e" }}>{pct(c.attribution)}</span>
                                </div>
                                <MiniBar value={c.attribution} max={1} color={TIER_COLOR[c.tier]} />
                            </div>

                            {/* Content detail (expanded) */}
                            {expanded === c.id && (
                                <div style={{ marginTop: 14, padding: "14px", borderRadius: 12, background: "rgba(9,15,30,0.5)", border: "1px solid rgba(99,140,255,0.08)" }}>
                                    <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 10, color: "var(--text-2)" }}>
                                        {t('performance.contentAttribBreakdown')}
                                    </div>
                                    <table className="table" style={{ fontSize: 11 }}>
                                        <thead>
                                            <tr><th>{t('performance.content')}</th><th style={{ textAlign: "right" }}>{t('performance.views')}</th>
                                                <th style={{ textAlign: "right" }}>{t('performance.attributedOrders')}</th>
                                                <th style={{ textAlign: "right" }}>{t('performance.attributedRevenue')}</th>
                                                <th style={{ textAlign: "right" }}>{t('performance.attribution')}</th></tr>
                                        </thead>
                                        <tbody>
                                            {c.content.map((ct, i) => (
                                                <tr key={i}>
                                                    <td style={{ fontWeight: 600 }}>{ct.title}</td>
                                                    <td style={{ textAlign: "right", fontFamily: "monospace" }}>{fmtM(ct.views)}</td>
                                                    <td style={{ textAlign: "right", fontFamily: "monospace" }}>{ct.orders}{t('performance.items')}</td>
                                                    <td style={{ textAlign: "right", fontFamily: "monospace", color: "#f97316", fontWeight: 700 }}>{fmtC(ct.revenue)}</td>
                                                    <td style={{ textAlign: "right" }}>
                                                        <div style={{ display: "flex", gap: 6, alignItems: "center", justifyContent: "flex-end" }}>
                                                            <MiniBar value={ct.attrib} max={1} color={TIER_COLOR[c.tier]} />
                                                            <span style={{ fontWeight: 700, color: TIER_COLOR[c.tier], minWidth: 36 }}>{pct(ct.attrib)}</span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Settlement modal */}
            {modal === "settle" && selected && (
                <>
                    <div onClick={() => setModal(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)", zIndex: 300 }} />
                    <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: "min(540px,95vw)", background: "linear-gradient(180deg,var(--surface),#090f1e)", border: "1px solid rgba(168,85,247,0.25)", borderRadius: 20, padding: 28, zIndex: 301, boxShadow: "0 24px 64px rgba(0,0,0,0.7)", animation: "popIn 0.2s cubic-bezier(.4,0,.2,1)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20, alignItems: "center" }}>
                            <div style={{ fontWeight: 800, fontSize: 16 }}>{t('performance.creatorSettlement')}</div>
                            <button onClick={() => setModal(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-3)", fontSize: 18 }}>✕</button>
                        </div>
                        {/* Creator info */}
                        <div style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(168,85,247,0.06)", border: "1px solid rgba(168,85,247,0.15)", marginBottom: 16 }}>
                            <div style={{ fontWeight: 400, color: "#4f8ef7", fontSize: 12 }} >{selected.name} <span>{selected.handle}</span></div>
                            <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>{selected.tier} · {selected.platform} · {t('performance.contractEnd')} {selected.contractEnd}</div>
                        </div>
                        {/* Calculation */}
                        {[
                            [t('performance.contractAmount'), fmtC(selected.contractRate), "var(--text-1)"],
                            [t('performance.bizIncomeTax'), "- " + fmtC(Math.round(selected.contractRate * 0.03)), "#ef4444"],
                            [t('performance.localIncomeTax'), "- " + fmtC(Math.round(selected.contractRate * 0.003)), "#f97316"],
                        ].map(([l, v, c]) => (
                            <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: "1px solid rgba(99,140,255,0.07)", fontSize: 12 }}>
                                <span style={{ color: "var(--text-3)" }}>{l}</span>
                                <span style={{ fontWeight: 700, color: c }}>{v}</span>
                            </div>
                        ))}
                        <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", fontSize: 14 }}>
                            <span style={{ fontWeight: 700 }}>{t('performance.netPayoutInclTax')}</span>
                            <span style={{ fontWeight: 900, color: "#22c55e", fontSize: 18 }}>
                                {fmtC(selected.contractRate - Math.round(selected.contractRate * 0.03) - Math.round(selected.contractRate * 0.003))}
                            </span>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 4 }}>
                            <div><label className="input-label">{t('performance.bank')}</label>
                                <select className="input" value={payBank} onChange={e => setPayBank(e.target.value)}><option>KakaoBank</option><option>TossBank</option><option>Shinhan</option><option>Kookmin</option></select></div>
                            <div><label className="input-label">{t('performance.accountNo')}</label>
                                <input className="input" placeholder={t('performance.accountNoPh', '계좌번호 입력')} value={payAccount} onChange={e => setPayAccount(e.target.value)} /></div>
                        </div>
                        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 14 }}>
                            <button className="btn-ghost" onClick={() => setModal(null)}>{t('performance.cancel')}</button>
                            <button className="btn-primary" style={{ background: "linear-gradient(135deg,#a855f7,#ec4899)", opacity: settling ? 0.6 : 1 }}
                                disabled={settling} onClick={submitSettlement}>{settling ? '⏳' : t('performance.completeSettlement')}</button>
                        </div>
                    </div>
                    <style>{`@keyframes popIn{from{opacity:0;transform:translate(-50%,-50%) scale(0.95)}to{opacity:1;transform:translate(-50%,-50%) scale(1)}}`}</style>
                </>
            )}
        </div>


    );
});

/* ═══════════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════════ */
const TABS = [
    { id: "performance", label: "📊 Performance", desc: "Impressions · Clicks · ROAS · ACOS" },
    { id: "settlement", label: "💳 Settlement", desc: "Fees · Ad Spend · FX" },
    { id: "creator", label: "🤝 Creator Settlement", desc: "Payout · Attribution · Rights" },
    { id: "sku_profit", label: "📈 SKU Profitability", desc: "Revenue · COGS · Ad Cost · P&L" },
];

/* ── SKU Profitability Tab ───────────────────────────────────────────── */
const SKUProfitTab = memo(function SKUProfitTab() {
    const { t } = useI18n();
    const { fmt: fmtC } = useCurrency();
    const [sortCol, setSortCol] = useState('margin_rate');
    const [sortDir, setSortDir] = useState('desc');

    const { inventory = [], orders = [], isDemo } = useGlobalData();

    // 204차 동기화: SKU 손익을 실판매(orders)+실원가(product.cost)에서 파생 — 과거 price×stock×2 임의배수 제거.
    //   매출=Σ주문total(대시보드/롤업/P&L 정합), COGS=원가×수량, 광고/수수료=주문 실비. 전 메뉴 reconcile.
    const SKU_DATA = useMemo(() => {
        const prodBySku = {};
        (Array.isArray(inventory) ? inventory : []).forEach(p => { if (p && p.sku) prodBySku[p.sku] = p; });
        const by = {};
        (Array.isArray(orders) ? orders : []).forEach(o => {
            if (!o || !o.sku) return;
            if (!by[o.sku]) by[o.sku] = { sku: o.sku, name: o.name, revenue: 0, qty: 0, ad: 0, platform: 0 };
            by[o.sku].revenue += Number(o.total || 0);
            by[o.sku].qty += Number(o.qty || 0);
            by[o.sku].ad += Number(o.adFee || 0);
            by[o.sku].platform += Number(o.total || 0) * Number(o.platformFeeRate || 0);
        });
        return Object.values(by).map(s => {
            const prod = prodBySku[s.sku] || {};
            const cog = (Number(prod.cost) || 0) * s.qty;
            const logistics = IS_DEMO ? Math.round(s.revenue * 0.05) : 0; // [259차] 실 물류비 SSOT 부재 → 운영은 하드코딩 5% 미차감(임의숫자 금지·마진 왜곡 방지)
            const ad = Math.round(s.ad);
            const platform = Math.round(s.platform);
            const margin = s.revenue - cog - logistics - ad - platform;
            return {
                sku: s.sku, name: s.name, revenue: Math.round(s.revenue), cog: Math.round(cog),
                logistics, ad, platform, margin: Math.round(margin),
                total_cost: Math.round(cog + logistics + ad + platform), margin_rate: s.revenue ? (margin / s.revenue) : 0,
            };
        }).sort((a, b) => b.revenue - a.revenue).slice(0, 12);
    }, [inventory, orders]);

    const sorted = useMemo(() => [...SKU_DATA].sort((a, b) => sortDir === 'desc' ? b[sortCol] - a[sortCol] : a[sortCol] - b[sortCol]), [SKU_DATA, sortCol, sortDir]);
    const totalRevenue = useMemo(() => SKU_DATA.reduce((s, x) => s + x.revenue, 0), [SKU_DATA]);
    const totalMargin = useMemo(() => SKU_DATA.reduce((s, x) => s + x.margin, 0), [SKU_DATA]);
    const avgMarginRate = useMemo(() => totalRevenue ? totalMargin / totalRevenue : 0, [totalRevenue, totalMargin]);

    const handleSort = useCallback(col => { if (sortCol === col) setSortDir(d => d === 'desc' ? 'asc' : 'desc'); else { setSortCol(col); setSortDir('desc'); } }, [sortCol]);
    const SortArrow = useCallback(({ col }) => sortCol === col ? (sortDir === 'desc' ? '▼' : '▲') : '', [sortCol, sortDir]);

    return (
        <div style={{ display: 'grid', gap: 18 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
                {[
                    { l: t('performance.skuTotalRevenue'), v: fmtC(totalRevenue), c: '#4f8ef7' },
                    { l: t('performance.skuTotalMargin'), v: fmtC(totalMargin), c: '#22c55e' },
                    { l: t('performance.skuAvgMarginRate'), v: pct(avgMarginRate), c: '#a855f7' },
                    { l: t('performance.skuTopMarginSku'), v: sorted[0]?.sku || '-', c: '#f97316' },
                ].map(({ l, v, c }) => (
                    <KpiCard key={l} label={l} value={v} color={c} />
                ))}
            </div>

            <div className="card card-glass" style={{ padding: 20 }}>
                <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 14 }}>📊 {t('performance.skuProfitDetail')}</div>
                {SKU_DATA.length === 0 && <div style={{ textAlign: 'center', padding: 24, color: '#64748b', fontSize: 12 }}>{t('performance.noData')}</div>}
                {SKU_DATA.length > 0 && <div style={{ overflowX: 'auto' }}>
                    <table className="table" style={{ fontSize: 11 }}>
                        <thead>
                            <tr>
                                {[['sku', 'SKU'], ['name', t('performance.skuProduct')], ['revenue', t('performance.revenue')], ['cog', t('performance.skuCogs')], ['logistics', t('performance.skuLogistics')], ['ad', t('performance.adSpend')], ['platform', t('performance.platformFee')], ['margin', t('performance.skuMargin')], ['margin_rate', t('performance.skuMarginRate')]].map(([col, label]) => (
                                    <th key={col} onClick={() => handleSort(col)} style={{ cursor: 'pointer', userSelect: 'none', textAlign: col !== 'name' ? 'right' : 'left', color: '#4f8ef7' }} >{label} <span><SortArrow col={col} /></span></th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {sorted.map(s => (
                                <tr key={s.sku}>
                                    <td style={{ fontFamily: 'monospace', fontWeight: 700, color: '#4f8ef7' }}>{s.sku}</td>
                                    <td style={{ fontSize: 11 }}>{s.name}</td>
                                    <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 700 }}>{fmtC(s.revenue)}</td>
                                    <td style={{ textAlign: 'right', fontFamily: 'monospace', color: '#ef4444' }}>{fmtC(s.cog)}</td>
                                    <td style={{ textAlign: 'right', fontFamily: 'monospace', color: '#f97316' }}>{fmtC(s.logistics)}</td>
                                    <td style={{ textAlign: 'right', fontFamily: 'monospace', color: '#eab308' }}>{fmtC(s.ad)}</td>
                                    <td style={{ textAlign: 'right', fontFamily: 'monospace', color: '#a855f7' }}>{fmtC(s.platform)}</td>
                                    <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 800, color: s.margin_rate >= 0.2 ? '#22c55e' : s.margin_rate >= 0.1 ? '#eab308' : '#ef4444' }}>{fmtC(s.margin)}</td>
                                    <td style={{ textAlign: 'right' }}>
                                        <span style={{ fontWeight: 800, color: s.margin_rate >= 0.2 ? '#22c55e' : s.margin_rate >= 0.1 ? '#eab308' : '#ef4444' }}>{pct(s.margin_rate)}</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr style={{ borderTop: '2px solid rgba(99,140,255,0.2)', background: 'rgba(79,142,247,0.04)' }}>
                                <td colSpan="2" style={{ fontWeight: 700, fontSize: 11 }}>{t('performance.totalAvg')}</td>
                                <td style={{ textAlign: 'right', fontWeight: 800, color: '#4f8ef7' }}>{fmtC(totalRevenue)}</td>
                                <td colSpan="4"></td>
                                <td style={{ textAlign: 'right', fontWeight: 900, color: '#22c55e', fontSize: 13 }}>{fmtC(totalMargin)}</td>
                                <td style={{ textAlign: 'right', fontWeight: 900, color: '#22c55e' }}>{pct(avgMarginRate)}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>}
            </div>
        </div>
    );
});


/* ═══ Cohort Analysis Tab ═══════════════════ */
const CohortTab = memo(function CohortTab() {
    const { t } = useI18n();
    const { orders = [] } = useGlobalData();
    const [view, setView] = useState('retention');
    // [현 차수] 219 P2: 코호트를 단일소스 orders 에서 "실측" 파생 — 과거 하드코딩 월/가중치(0.78~1.34)+
    //   고정 리텐션(62/44/31%) 모델값 제거. 구매자별 첫 구매월을 코호트로, 첫 구매 이후 D+30/60/90 창에서
    //   실제 재구매한 구매자 수로 리텐션을 산출(누적). 매출=코호트 구매자의 실 주문 합. 구매자 식별 불가
    //   주문은 코호트 제외(허위 리텐션 방지). 데이터 쌓일수록 정확.
    const COHORT_DATA = useMemo(() => {
        const src = Array.isArray(orders) ? orders : [];
        if (!src.length) return [];
        const DAY = 86400000;
        const dateOf = (o) => { const c = o.atISO || o.ordered_at || o.created_at || o.at || (o.month ? o.month + '-01' : null); if (!c) return null; const d = new Date(c); return isNaN(d.getTime()) ? null : d; };
        const byBuyer = {};
        src.forEach(o => {
            const buyer = o.buyer || o.buyer_name; if (!buyer) return;          // 식별 불가 → 제외
            const d = dateOf(o); if (!d) return;
            (byBuyer[buyer] = byBuyer[buyer] || []).push({ d, rev: Number(o.total ?? o.total_price ?? 0) });
        });
        const cohorts = {};
        Object.values(byBuyer).forEach(list => {
            list.sort((a, b) => a.d - b.d);
            const first = list[0].d;
            const m = `${first.getFullYear()}-${String(first.getMonth() + 1).padStart(2, '0')}`;
            const c = cohorts[m] = cohorts[m] || { newUsers: 0, r30: 0, r60: 0, r90: 0, revenue: 0 };
            c.newUsers++;
            c.revenue += list.reduce((s, x) => s + x.rev, 0);
            const repurch = list.slice(1);                                       // 첫 구매 이후 재구매
            const within = (hi) => repurch.some(x => { const dd = (x.d - first) / DAY; return dd > 0 && dd <= hi; });
            if (within(30)) c.r30++;
            if (within(60)) c.r60++;                                             // 누적(D+60은 D+30 포함)
            if (within(90)) c.r90++;
        });
        return Object.keys(cohorts).sort().map(m => ({
            month: m, newUsers: cohorts[m].newUsers,
            retained30: cohorts[m].r30, retained60: cohorts[m].r60, retained90: cohorts[m].r90,
            revenue: Math.round(cohorts[m].revenue),
        }));
    }, [orders]);
    const fmtPct = (a, b) => b === 0 ? '-' : (a / b * 100).toFixed(1) + '%';
    const { fmt: fmtC } = useCurrency(); // [269차 수정] 코호트 매출을 통화 포맷(과거 raw 정수 노출)
    const btnStyle = active => ({
        padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700,
        background: active ? 'linear-gradient(135deg,#a855f7,#6366f1)' : 'rgba(255,255,255,0.07)', color: active ? '#fff' : 'var(--text-2)'
    });
    return (
        <div style={{ display: 'grid', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <div>
                    <div style={{ fontWeight: 800, fontSize: 14 }}>👥 {t('performance.cohortTitle')}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{t('performance.cohortSub')}</div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                    <button style={btnStyle(view === 'retention')} onClick={() => setView('retention')}>{t('performance.retentionRate')}</button>
                    <button style={btnStyle(view === 'revenue')} onClick={() => setView('revenue')}>{t('performance.cohortRevenue')}</button>
                </div>
            </div>

            {COHORT_DATA.length === 0 && <div style={{ textAlign: 'center', padding: 24, color: '#64748b', fontSize: 12 }}>{t('performance.noData')}</div>}

            {COHORT_DATA.length > 0 && <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                    {COHORT_DATA.slice(0, 4).map(c => (
                        <div key={c.month} style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(168,85,247,0.07)', border: '1px solid rgba(168,85,247,0.2)', textAlign: 'center' }}>
                            <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4 }}>{c.month}</div>
                            <div style={{ fontSize: 20, fontWeight: 900, color: '#a855f7' }}>{c.newUsers.toLocaleString()}</div>
                            <div style={{ fontSize: 10, color: 'var(--text-3)' }}>{t('performance.newUsers')}</div>
                        </div>
                    ))}
                </div>

                <div style={{ overflow: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                        <thead>
                            <tr style={{ background: 'rgba(168,85,247,0.08)' }}>
                                {[t('performance.cohortMonth'), t('performance.newLabel'), 'D+30', 'D+60', 'D+90',
                                view === 'retention' ? t('performance.retention90') : t('performance.ltvRevenue')].map(h => (
                                    <th key={h} style={{ padding: '10px 14px', textAlign: h === t('performance.cohortMonth') ? 'left' : 'center', color: 'var(--text-3)', fontWeight: 700 }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {COHORT_DATA.map(c => (
                                <tr key={c.month} style={{ borderBottom: '1px solid var(--border)' }}>
                                    <td style={{ padding: '10px 14px', fontWeight: 700 }}>{c.month}</td>
                                    <td style={{ padding: '10px 14px', textAlign: 'center' }}>{c.newUsers.toLocaleString()}</td>
                                    <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                                        <span style={{ color: '#22c55e', fontWeight: 700 }}>{fmtPct(c.retained30, c.newUsers)}</span>
                                    </td>
                                    <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                                        <span style={{ color: '#4f8ef7', fontWeight: 700 }}>{fmtPct(c.retained60, c.newUsers)}</span>
                                    </td>
                                    <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                                        <span style={{ color: '#f59e0b', fontWeight: 700 }}>{fmtPct(c.retained90, c.newUsers)}</span>
                                    </td>
                                    <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 700, color: '#a855f7' }}>
                                        {view === 'retention' ? fmtPct(c.retained90, c.newUsers) : fmtC(c.revenue)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </>}
        </div>
    );
});

/* ═══ ESG Reporting Tab — 준비 중(미구현) ═══════════════════
 * [289차 후속 / MEA Part 063 · FIND-063-1]
 *   이 탭에는 백엔드가 없다. ESG 핸들러·테이블·라우트가 저장소에 존재하지 않으므로
 *   채널을 연동하거나 시간이 지나도 값이 채워지지 않는다(부재증명 = MEA_PART063 GT①).
 *   종전엔 각 셀이 t('performance.noData')="데이터가 없습니다" 를 렌더해
 *   **"내가 연동을 안 해서 비었다"(사용자 귀책)** 로 오독됐다 — 실제로는 **기능 미제공**이다.
 *   → 제품 상태를 명시하는 esgNotReady 로 교체(정직 표기).
 *   ★구현 착수 시에도 추정치·업계평균·목표치를 실측값처럼 표시하지 말 것.
 *     산출 불가는 0 이 아니라 null + 사유(057/058/059 정직 미산출 모범 승계).
 */
const ESGTab = memo(function ESGTab() {
    const { t } = useI18n();
    // 백엔드 미구현 — 값을 가져올 API 자체가 없다(MEA Part 063 판정).
    return (
        <div style={{ display: 'grid', gap: 16 }}>
            <div>
                <div style={{ fontWeight: 800, fontSize: 14 }}>🌿 {t('performance.esgTitle')}</div>
                <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{t('performance.esgSub')}</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                {[
                    { area: `E — ${t('performance.esgEnvironment')}`, color: '#22c55e' },
                    { area: `S — ${t('performance.esgSocial')}`, color: '#4f8ef7' },
                    { area: `G — ${t('performance.esgGovernance')}`, color: '#a855f7' },
                ].map(r => (
                    <div key={r.area} style={{ padding: 16, borderRadius: 12, background: `${r.color}08`, border: `1px solid ${r.color}22` }}>
                        <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 10 }}>{r.area}</div>
                        <div style={{ textAlign: 'center', padding: 16, color: '#64748b', fontSize: 12 }}>{t('performance.esgNotReady')}</div>
                    </div>
                ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                {[
                    { label: t('performance.esgCarbon'), color: '#22c55e' },
                    { label: t('performance.esgEnergy'), color: '#4f8ef7' },
                    { label: t('performance.esgPackaging'), color: '#f59e0b' },
                    { label: t('performance.esgRecycleRate'), color: '#a855f7' },
                ].map(d => (
                    <div key={d.label} style={{ padding: '12px 16px', borderRadius: 12, background: 'var(--surface)', border: '1px solid var(--border)' }}>
                        <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4 }}>{d.label}</div>
                        <div style={{ fontSize: 12, color: '#64748b', marginTop: 6 }}>{t('performance.esgNotReady')}</div>
                    </div>
                ))}
            </div>
        </div>
    );
});

const PerfGuideTab = memo(function PerfGuideTab() {
    const { t, lang } = useI18n();
    const G = PERF_GUIDE[lang] || PERF_GUIDE.en;
    const g = (k) => G[k] || PERF_GUIDE.en[k] || PERF_GUIDE.ko[k] || '';
    const STEPS = Array.from({ length: 8 }, (_, i) => ({ num: i + 1, title: g(`guideStep${i + 1}Title`), desc: g(`guideStep${i + 1}Desc`) }));
    const ICONS = ['📊', '🔄', '💳', '💱', '🤝', '📈', '👥', '🌿'];
    const COLORS = ['#a855f7', '#4f8ef7', '#22c55e', '#f97316', '#ec4899', '#eab308', '#14b8a6', '#6366f1'];
    const TIPS = Array.from({ length: 5 }, (_, i) => g(`guideTip${i + 1}`));

    const TAB_REF = [
        { icon: '📊', tab: t('performance.tabPerformance'), desc: g('guideTabPerfDesc'), color: '#a855f7' },
        { icon: '💳', tab: t('performance.tabSettlement'), desc: g('guideTabSettleDesc'), color: '#22c55e' },
        { icon: '🤝', tab: t('performance.tabCreator'), desc: g('guideTabCreatorDesc'), color: '#ec4899' },
        { icon: '📈', tab: t('performance.tabSkuProfit'), desc: g('guideTabSkuDesc'), color: '#f97316' },
        { icon: '👥', tab: t('performance.tabCohort'), desc: g('guideTabCohortDesc'), color: '#6366f1' },
        { icon: '🌿', tab: t('performance.tabEsg'), desc: g('guideTabEsgDesc'), color: '#14b8a6' },
        { icon: '📖', tab: t('performance.tabGuide'), desc: g('guideTabGuideDesc'), color: '#64748b' },
    ];

    return (
        <div style={{ display: 'grid', gap: 24 }}>
            <div>
                <div style={{ fontSize: 22, fontWeight: 900, color: '#fff', marginBottom: 6 }}>📖 {g('guideTitle')}</div>
                <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.6 }}>{g('guideSub')}</div>
            </div>
            <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#fff', marginBottom: 14 }}>{g('guideStepsTitle')}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
                    {STEPS.map((s, i) => (
                        <div key={i} style={{ display: 'flex', gap: 14, padding: 16, borderRadius: 12, background: 'var(--surface)', border: `1px solid ${COLORS[i]}22`, transition: 'transform 150ms, border-color 150ms' }}
                            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = COLORS[i] + '55'; }}
                            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = COLORS[i] + '22'; }}>
                            <div style={{ fontSize: 28, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', width: 48, height: 48, borderRadius: 12, background: `${COLORS[i]}15` }}>{ICONS[i]}</div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 12, fontWeight: 700, color: COLORS[i], marginBottom: 4 }}>{s.num}. {s.title}</div>
                                <div style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.5 }}>{s.desc}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            <div style={{ padding: '20px 24px', borderRadius: 14, background: 'rgba(234,179,8,0.05)', border: '1px solid rgba(234,179,8,0.15)' }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#eab308', marginBottom: 12 }}>💡 {g('guideTipsTitle')}</div>
                <ol style={{ margin: 0, paddingLeft: 20 }}>
                    {TIPS.map((tip, i) => <li key={i} style={{ fontSize: 12, color: '#22c55e', lineHeight: 1.8, marginBottom: 4, fontWeight: 700 }} ><span>{i + 1}.</span> {tip}</li>)}
                </ol>
            </div>
            {/* Tab Reference Grid */}
            <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#fff', marginBottom: 14 }}>📑 {g('guideTabsTitle')}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10 }}>
                    {TAB_REF.map((tr, i) => (
                        <div key={i} style={{ padding: '12px 14px', borderRadius: 10, background: 'var(--surface)', border: `1px solid ${tr.color}22`, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                            <div style={{ fontSize: 20, flexShrink: 0 }}>{tr.icon}</div>
                            <div>
                                <div style={{ fontSize: 11, fontWeight: 700, color: tr.color, marginBottom: 3 }}>{tr.tab}</div>
                                <div style={{ fontSize: 10, color: '#94a3b8', lineHeight: 1.5 }}>{tr.desc}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
});

export default function PerformanceHub() {
    const { t } = useI18n();
    const { fmt } = useCurrency();
    const { addAlert, creators: ctxCreators = [] } = useGlobalData();
    const { connectedChannels = {}, connectedCount = 0 } = useConnectorSync?.() || {};
    const { user: _tabUser, isAdmin: _tabIsAdmin } = useAuth(); // [현 차수] 구독플랜별 탭 노출
    const _tabPlan = (_tabUser && (_tabUser.plans || _tabUser.plan)) || 'free';
    const _tabVisible = (id) => (_IS_DEMO_TAB || _tabIsAdmin) ? true : tabAllowedByPlan(_tabPlan, 'performance', id);
    const [tab, setTab] = useState("performance");
    useSubtabPaintFix(tab);
    const [threats, setThreats] = useState([]);
    const [syncTick, setSyncTick] = useState(0);
    const bcRef = useRef(null);
    const pollingRef = useRef(null);

    const expiredSoon = useMemo(() => (ctxCreators || []).filter(c => {
        // [266차] whitelistExpiry 는 'YYYY-MM-DD' 문자열(CreatorTab 과 동일) — epoch millis 로 오판해
        //   Number.isFinite 가 항상 false→뱃지 영구 0 이던 것 날짜 파싱으로 복구.
        const exp = c?.contract?.whitelistExpiry;
        if (!exp) return false;
        const ts = new Date(exp).getTime();
        if (isNaN(ts)) return false;
        return (ts - Date.now()) / 86400000 <= 90; // 90일 내 만료(이미 만료 포함)
    }).length, [ctxCreators]);

    /* ── BroadcastChannel: Cross-tab Sync ── */
    useEffect(() => {
        if (typeof BroadcastChannel === 'undefined') return;
        const ch1 = new BroadcastChannel(tChannelName('genie_performance_sync'));
        bcRef.current = ch1; // [259차] 크로스탭 하트비트 발신 채널 배선(과거 bcRef 미할당→postMessage 영구 no-op)
        const ch2 = new BroadcastChannel(tChannelName('genie_connector_sync'));
        const ch3 = new BroadcastChannel(tChannelName('genie_product_sync'));
        const handler = () => setSyncTick(p => p + 1);
        ch1.onmessage = handler;
        ch2.onmessage = (e) => { if (['CHANNEL_REGISTERED', 'CHANNEL_REMOVED'].includes(e.data?.type)) handler(); };
        ch3.onmessage = handler;
        return () => { ch1.close(); ch2.close(); ch3.close(); bcRef.current = null; };
    }, []);

    /* ── 30-second Real-time Polling ── */
    useEffect(() => {
        pollingRef.current = setInterval(() => {
            setSyncTick(prev => prev + 1);
            try { bcRef.current?.postMessage({ type: 'PERF_UPDATE', ts: Date.now() }); } catch (_) { /* 실패 무시(best-effort) */ }
        }, 30000);
        return () => clearInterval(pollingRef.current);
    }, []);

    /* ── Security: Scan user inputs ── */
    const safeguardInput = useCallback((value, fieldName) => {
        const threat = secCheck(value);
        if (threat) {
            const entry = { type: threat, value, field: fieldName, time: new Date().toLocaleTimeString() };
            setThreats(prev => [...prev, entry]);
            try {
                addAlert({
                    id: `sec_perf_${Date.now()}`,
                    type: 'security',
                    severity: 'critical',
                    title: `🚨 [Performance Hub] ${threat} ${t('performance.threatDetectedLabel')}`,
                    body: `${t('performance.threatBodyPrefix')} "${fieldName}" — ${threat}: ${value.slice(0, 50)}`,
                    timestamp: new Date().toISOString(),
                    read: false,
                });
            } catch (_) { /* 알림/감사 훅 실패 무시(best-effort) */ }
            return '';
        }
        return value;
    }, [addAlert]);

    const TABS = [
        { id: "performance", label: t('performance.tabPerformance'), desc: t('performance.descPerformance') },
        { id: "settlement", label: t('performance.tabSettlement'), desc: t('performance.descSettlement') },
        { id: "creator", label: t('performance.tabCreator'), desc: t('performance.descCreator') },
        { id: "sku_profit", label: t('performance.tabSkuProfit'), desc: t('performance.descSkuProfit') },
        { id: "cohort", label: t('performance.tabCohort'), desc: t('performance.descCohort') },
        { id: "esg", label: t('performance.tabEsg'), desc: t('performance.descEsg') },
        { id: "guide", label: t('performance.tabGuide'), desc: t('performance.descGuide') },
    ];

    return (
        <div style={{ display: "flex", flexDirection: "column", margin: "-14px -16px -20px", height: "calc(100vh - 52px)", overflow: "hidden" }}>
            {/* ── Security Overlay ── */}
            <SecurityOverlay threats={threats} onDismiss={() => setThreats([])} />

            {/* ─── Sticky Header: Hero + Tab Nav ─── */}
            <div style={{ flexShrink: 0, padding: "14px 16px 0", background: "var(--surface-1, #070f1a)", zIndex: 10, borderBottom: "1px solid rgba(99,140,255,0.06)" }}>
                {/* Hero + Sync indicator */}
                <div className="hero fade-up" style={{ background: "linear-gradient(135deg,rgba(168,85,247,0.08),rgba(34,197,94,0.05))", borderColor: "rgba(168,85,247,0.15)", marginBottom: 12 }}>
                    <div className="hero-meta">
                        <div className="hero-icon" style={{ background: "linear-gradient(135deg,rgba(168,85,247,0.25),rgba(249,115,22,0.15))" }}>📊</div>
                        <div>
                            <div className="hero-title" style={{ background: "linear-gradient(135deg,#a855f7,#22c55e)" }}>{t('performance.pageTitle')}</div>
                            <div className="hero-desc">
                                {t('performance.pageSub')}
                            </div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8, flexWrap: 'wrap' }}>
                        {/* Real-time sync badge */}
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 6, fontSize: 10, fontWeight: 600, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.15)', color: '#22c55e' }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', animation: 'pulse 2s infinite' }} />
                            {t('performance.realtimeSync')}
                        </div>
                        {/* Security status */}
                        <div style={{
                            display: 'inline-flex', alignItems: 'center', gap: 5,
                            padding: '4px 10px', borderRadius: 6, fontSize: 10, fontWeight: 600,
                            background: threats.length > 0 ? 'rgba(239,68,68,0.08)' : 'rgba(34,197,94,0.08)',
                            border: `1px solid ${threats.length > 0 ? 'rgba(239,68,68,0.2)' : 'rgba(34,197,94,0.15)'}`,
                            color: threats.length > 0 ? '#ef4444' : '#22c55e'
                        }}>
                            {threats.length > 0 ? '🔴' : '🟢'} {threats.length > 0 ? `${threats.length} ${t('performance.threatsDetected')}` : t('performance.securityNormal')}
                        </div>
                        {/* Enterprise Badges */}
                        <span style={{ fontSize: 10, padding: '3px 10px', borderRadius: 20, background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)', color: '#22c55e', fontWeight: 700 }}>
                            📡 {connectedCount}{t('performance.badgeChannelUnit', '개 채널 연동')}
                        </span>
                        <span style={{ fontSize: 10, padding: '3px 10px', borderRadius: 20, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', fontWeight: 700 }}>
                            🛡️ {t('performance.badgeSecurity')}
                        </span>
                        {expiredSoon > 0 && (
                            <div style={{ padding: "4px 10px", borderRadius: 6, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", fontSize: 10, color: "#ef4444", display: "inline-flex", gap: 5, fontWeight: 600 }}>
                                🔴 {t('performance.rightsExpiryAlert', { count: expiredSoon })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Tab nav — sticky */}
                <div className="card card-glass" style={{ padding: 0, overflow: "hidden", marginBottom: 0, borderRadius: "12px 12px 0 0" }}>
                    <div className="gx-subtab-bar" style={{ display: "grid", gridTemplateColumns: `repeat(${TABS.filter(tb => _tabVisible(tb.id)).length || 7},1fr)` }}>
                        {TABS.filter(tb => _tabVisible(tb.id)).map(tb => (
                            <button key={tb.id} className={tab === tb.id ? "gx-on" : ""} onClick={() => setTab(tb.id)} style={{
                                padding: "14px 10px", border: "none", cursor: "pointer", textAlign: "left",
                                background: tab === tb.id ? "rgba(168,85,247,0.1)" : "transparent",
                                borderBottom: `2px solid ${tab === tb.id ? "#a855f7" : "transparent"}`,
                                transition: "all 200ms"
                            }}>
                                <div style={{ fontSize: 13, fontWeight: 800, color: tab === tb.id ? "var(--text-1)" : "var(--text-2)" }}>{tb.label}</div>
                                <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 2 }}>{tb.desc}</div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* ─── Scrollable Content ─── */}
            <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: "16px", paddingBottom: "80px" }}>
                {/* [현 차수] 특정상품 성과 조회 — 선택 시 그 상품 매출·순이익·채널/국가별·광고성과를 인라인(주문 SSOT·SKU별손익 탭과 동기화). */}
                <div style={{ marginBottom: 16, display: 'grid', gap: 12 }}>
                    <ProductSelectBar />
                    <ProductMarketingPanel period="monthly" />
                </div>
                <div className="card card-glass fade-up">
                    {tab === "performance" && <PerformanceTab />}
                    {tab === "settlement" && <SettlementTab />}
                    {tab === "creator" && <CreatorTab />}
                    {tab === "sku_profit" && <SKUProfitTab />}
                    {tab === "cohort" && <CohortTab />}
                    {tab === "esg" && <ESGTab />}
                    {tab === "guide" && <PerfGuideTab />}
                </div>
            </div>

            {/* Pulse animation for sync indicator */}
            <style>{`@keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
        </div>
    );
}
