import React, { useState, useEffect, useCallback, useRef } from "react";
import { useT } from '../i18n/index.js';
import { useAuth } from "../auth/AuthContext";
import PlanGate from "../components/PlanGate";

// By Plan Subscription Pricing Table (Admin SubscriptionPricing에서 Settings한 기준 Pricing과 Sync)
const PLAN_FEES = {
    growth:     { label: 'Growth',     color: '#22c55e', monthly: 79000,  annual: 63200  },
    pro:        { label: 'Pro',        color: '#4f8ef7', monthly: 199000, annual: 159200 },
    enterprise: { label: 'Enterprise', color: '#a855f7', monthly: 499000, annual: 399200 },
    demo:       { label: t('auto.qcyi9i', '체험용'),     color: '#f59e0b', monthly: 0,      annual: 0      },
};

function makeAPI(token) {
    return (path, opts = {}) => {
        const headers = { "Content-Type": "application/json", ...(opts.headers || {}) };
        if (token) headers["Authorization"] = `Bearer ${token}`;
        return fetch(`/api${path}`, { ...opts, headers }).then(r => r.json());
    };
}

const C = {
    bg: "#070f1a", surface: "#0d1829", card: "#111e30",
    border: "rgba(99,102,241,0.15)", accent: "#4f8ef7",
    green: "#22c55e", red: "#f87171", yellow: "#fbbf24",
    purple: "#a78bfa", muted: "rgba(255,255,255,0.4)", text: "#e8eaf0",
    orange: "#fb923c",
};

const CARD = { background: C.card, borderRadius: 16, border: `1px solid ${C.border}`, padding: 24 };
const INPUT = { width: "100%", padding: "9px 13px", borderRadius: 8, background: C.surface, border: `1px solid ${C.border}`, color: C.text, boxSizing: "border-box", fontSize: 13 };

function StatCard({ icon, label, value, sub, color = C.accent }) {
    return (
        <div style={{ ...CARD, flex: 1, minWidth: 140 }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>{icon}</div>
            <div style={{ fontSize: 26, fontWeight: 800, color }}>{value}</div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>{label}</div>
            {sub && <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{sub}</div>}
        </div>
    );
}

/* ─── Dashboard Tab ──────────────────────────────── */
function DashboardTab({ API }) {
    const [data, setData] = useState(null);
    const [days, setDays] = useState(30);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        API(`/pixel/analytics?days=${days}`).then(r => { setData(r); setLoading(false); });
    }, [days]);

    if (loading) return <div style={{ color: C.muted, padding: 40, textAlign: "center" }}>{t('auto.kbdhh1', '📊 데이터 Loading...')}</div>;
    if (!data?.ok) return <div style={{ color: C.red, padding: 40, textAlign: "center" }}>{t('auto.pdo0ms', '데이터를 불러올 Count 없습니다.')}</div>;

    const totalEvents = data.events?.reduce((s, e) => s + parseInt(e.total), 0) || 0;
    const purchases = data.events?.find(e => e.event_name === "purchase");
    const revenue = purchases ? parseFloat(purchases.total_value) : 0;
    const convRate = data.funnel?.page_view > 0 ? ((data.funnel.purchase / data.funnel.page_view) * 100).toFixed(2) : "0.00";

    const funnelSteps = [
        { name: t('auto.2cxu00', '방문'), count: data.funnel?.page_view || 0, color: "#4f8ef7" },
        { name: "Product Search", count: data.funnel?.view_content || 0, color: "#818cf8" },
        { name: t('auto.2iewpa', '장바구니'), count: data.funnel?.add_to_cart || 0, color: "#a78bfa" },
        { name: "Payment Start", count: data.funnel?.initiate_checkout || 0, color: "#c084fc" },
        { name: t('auto.sh9eeu', '구매'), count: data.funnel?.purchase || 0, color: "#22c55e" },
    ];
    const maxCount = Math.max(...funnelSteps.map(s => s.count), 1);

    const fwdMeta = parseInt(data.forwarding?.meta_forwarded || 0);
    const fwdTiktok = parseInt(data.forwarding?.tiktok_forwarded || 0);
    const fwdTotal = parseInt(data.forwarding?.total_events || 1);

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Period Select */}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                {[7, 14, 30, 90].map(d => (
                    <button key={d} onClick={() => setDays(d)} style={{
                        padding: "6px 16px", borderRadius: 8, border: "none", cursor: "pointer",
                        background: days === d ? C.accent : C.surface,
                        color: days === d ? "#fff" : C.muted, fontWeight: 700, fontSize: 12,
                    }}>{d}일</button>
                ))}
            </div>

            {/* Summary Card */}
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                <StatCard icon="📊" label="Total Event" value={totalEvents.toLocaleString()} color={C.accent} />
                <StatCard icon="🛒" label={t('auto.26vi9e', '구매 Done')} value={(data.funnel?.purchase || 0).toLocaleString()} color={C.green} />
                <StatCard icon="💰" label="Total Revenue" value={`₩${revenue.toLocaleString()}`} color={C.yellow} />
                <StatCard icon="📈" label="Conv. Rate" value={`${convRate}%`} sub="방문 → 구매" color={C.purple} />
                <StatCard icon="🔵" label={t('auto.yhv0nz', 'Meta 포워딩')} value={`${fwdTotal > 0 ? Math.round(fwdMeta / fwdTotal * 100) : 0}%`} sub="서버사이드 CAPI" color="#60a5fa" />
                <StatCard icon="⚫" label={t('auto.k3lnll', 'TikTok 포워딩')} value={`${fwdTotal > 0 ? Math.round(fwdTiktok / fwdTotal * 100) : 0}%`} sub="서버사이드 Event" color="#94a3b8" />
            </div>

            {/* 퍼널 Chart */}
            <div style={CARD}>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 20 }}>{t('auto.vqy1so', '🔽 Conversion 퍼널 (방문 → 구매)')}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {funnelSteps.map((step, i) => {
                        const widthPct = maxCount > 0 ? (step.count / maxCount * 100) : 0;
                        const convPct = i > 0 ? (funnelSteps[i - 1].count > 0 ? (step.count / funnelSteps[i - 1].count * 100).toFixed(1) : "0") : "100";
                        return (
                            <div key={step.name}>
                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 13 }}>
                                    <span style={{ color: C.text }}>{step.name}</span>
                                    <span style={{ color: C.muted }}>{step.count.toLocaleString()} <span style={{ color: step.color }}>({convPct}%)</span></span>
                                </div>
                                <div style={{ height: 10, background: C.surface, borderRadius: 5, overflow: "hidden" }}>
                                    <div style={{ height: "100%", width: `${widthPct}%`, background: `linear-gradient(90deg, ${step.color}cc, ${step.color})`, borderRadius: 5, transition: "width 0.8s ease" }} />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Channel 어트리뷰션 */}
            <div style={CARD}>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>{t('auto.l3mpkg', '📡 Channelper 어트리뷰션')}</div>
                {!data.channels?.length ? (
                    <div style={{ color: C.muted, textAlign: "center", padding: 20 }}>{t('auto.7rplb8', 'No data — Pixel Count집 후 Confirm 가능')}</div>
                ) : (
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                        <thead>
                            <tr style={{ color: C.muted, borderBottom: `1px solid ${C.border}` }}>
                                <th style={{ textAlign: "left", padding: "8px 0" }}>{t('auto.3xio09', '소스')}</th>
                                <th style={{ textAlign: "left", padding: "8px 0" }}>{t('auto.sgm5hm', '매체')}</th>
                                <th style={{ textAlign: "right", padding: "8px 0" }}>{t('auto.jb8g43', '세션')}</th>
                                <th style={{ textAlign: "right", padding: "8px 0" }}>Conversion</th>
                                <th style={{ textAlign: "right", padding: "8px 0" }}>Revenue</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.channels.slice(0, 10).map((ch, i) => (
                                <tr key={i} style={{ borderBottom: `1px solid ${C.border}20` }}>
                                    <td style={{ padding: "8px 0", color: C.text }}>{ch.source}</td>
                                    <td style={{ padding: "8px 0", color: C.muted }}>{ch.medium}</td>
                                    <td style={{ padding: "8px 0", textAlign: "right" }}>{parseInt(ch.sessions).toLocaleString()}</td>
                                    <td style={{ padding: "8px 0", textAlign: "right", color: C.green }}>{parseInt(ch.conversions)}</td>
                                    <td style={{ padding: "8px 0", textAlign: "right", color: C.yellow }}>₩{parseInt(ch.revenue).toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}

/* ─── Pixel Settings Tab ─────────────────────────────── */
function PixelConfigTab({ API }) {
    const [configs, setConfigs] = useState([]);
    const [form, setForm] = useState({ name: "", domain: "", meta_pixel_id: "", meta_api_token: "", tiktok_pixel_id: "", tiktok_access_token: "" });
    const [snippet, setSnippet] = useState("");
    const [selectedPixelId, setSelectedPixelId] = useState(null);
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState("");

    const load = () => API("/pixel/configs").then(r => setConfigs(r.configs || []));
    useEffect(() => { load(); }, []);

    const save = async () => {
        setSaving(true);
        const r = await API("/pixel/configs", { method: "POST", body: JSON.stringify(form) });
        if (r.ok) { setMsg("✅ Pixel Create Done! pixel_id: " + r.pixel_id); load(); }
        else setMsg("❌ Error: " + r.error);
        setSaving(false);
    };

    const loadSnippet = async (pixelId) => {
        const r = await API(`/pixel/snippet/${pixelId}`);
        if (r.ok) { setSnippet(r.snippet); setSelectedPixelId(pixelId); }
    };

    const deleteConfig = async (id) => {
        if (!confirm(t('auto.bn86sn', 'Pixel을 Delete하시겠습니까?'))) return;
        await API(`/pixel/configs/${id}`, { method: "DELETE" });
        load();
    };

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* 신규 Pixel Create */}
            <div style={CARD}>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>{t('auto.b5zymf', '➕ 새 Pixel Create')}</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div><label style={{ fontSize: 12, color: C.muted }}>Pixel Name</label><input style={INPUT} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder={t('auto.g1tf5h', '메인 쇼핑몰 Pixel')} /></div>
                    <div><label style={{ fontSize: 12, color: C.muted }}>{t('auto.yf23q2', '도메인')}</label><input style={INPUT} value={form.domain} onChange={e => setForm({ ...form, domain: e.target.value })} placeholder="example.com" /></div>
                    <div><label style={{ fontSize: 12, color: C.muted }}>Meta Pixel ID</label><input style={INPUT} value={form.meta_pixel_id} onChange={e => setForm({ ...form, meta_pixel_id: e.target.value })} placeholder="1234567890" /></div>
                    <div><label style={{ fontSize: 12, color: C.muted }}>{t('auto.oxs85r', 'Meta CAPI 토큰')}</label><input style={INPUT} type="password" value={form.meta_api_token} onChange={e => setForm({ ...form, meta_api_token: e.target.value })} placeholder="EAAxxxxxx..." /></div>
                    <div><label style={{ fontSize: 12, color: C.muted }}>TikTok Pixel ID</label><input style={INPUT} value={form.tiktok_pixel_id} onChange={e => setForm({ ...form, tiktok_pixel_id: e.target.value })} placeholder="CXXXXXX" /></div>
                    <div><label style={{ fontSize: 12, color: C.muted }}>TikTok Access Token</label><input style={INPUT} type="password" value={form.tiktok_access_token} onChange={e => setForm({ ...form, tiktok_access_token: e.target.value })} placeholder="xxxxxx..." /></div>
                </div>
                {msg && <div style={{ marginTop: 10, fontSize: 13, color: msg.startsWith("✅") ? C.green : C.red }}>{msg}</div>}
                <button onClick={save} disabled={saving} style={{ marginTop: 16, padding: "10px 28px", borderRadius: 10, border: "none", cursor: "pointer", background: `linear-gradient(135deg, ${C.accent}, #6366f1)`, color: "#fff", fontWeight: 700 }}>
                    {saving ? "Creating..." : "🔧 Pixel Create"}
                </button>
            </div>

            {/* Pixel List */}
            <div style={CARD}>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>📋 Pixel List</div>
                {!configs.length ? (
                    <div style={{ color: C.muted, textAlign: "center", padding: 20 }}>{t('auto.kg2h3k', 'Create된 Pixel이 없습니다')}</div>
                ) : (
                    configs.map(cfg => (
                        <div key={cfg.id} style={{ padding: "14px 0", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div>
                                <div style={{ fontWeight: 700 }}>{cfg.name}</div>
                                <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>ID: {cfg.pixel_id} | 도메인: {cfg.domain || "-"}</div>
                            </div>
                            <div style={{ display: "flex", gap: 8 }}>
                                <button onClick={() => loadSnippet(cfg.pixel_id)} style={{ padding: "6px 14px", borderRadius: 8, border: "none", background: "#1e293b", color: C.accent, cursor: "pointer", fontSize: 12 }}>{"</>"} 스니펫</button>
                                <button onClick={() => deleteConfig(cfg.id)} style={{ padding: "6px 14px", borderRadius: 8, border: "none", background: "#1e293b", color: C.red, cursor: "pointer", fontSize: 12 }}>🗑 Delete</button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* 스니펫 코드 */}
            {snippet && (
                <div style={CARD}>
                    <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>📋 설치 스니펫 코드 ({selectedPixelId})</div>
                    <div style={{ background: "#0a0f1a", borderRadius: 10, padding: 16, fontFamily: "monospace", fontSize: 12, color: "#7dd3fc", whiteSpace: "pre-wrap", wordBreak: "break-all", overflow: "auto", maxHeight: 300 }}>
                        {snippet}
                    </div>
                    <button onClick={() => { navigator.clipboard.writeText(snippet); }} style={{ marginTop: 12, padding: "8px 20px", borderRadius: 8, border: "none", cursor: "pointer", background: C.surface, color: C.text, fontSize: 12 }}>📋 Copy</button>
                    <div style={{ marginTop: 12, fontSize: 12, color: C.muted }}>
                        {t('auto.6iyk24', 'ℹ️ 위 코드를 쇼핑몰')}<code style={{ background: "#1e293b", padding: "2px 6px", borderRadius: 4 }}>&lt;head&gt;</code> {t('auto.ygihcn', 'Tag 안에 붙여넣으세요.')}<br />
                        {t('auto.yxudni', 'Meta CAPI와 TikTok Events API로 서버사이드 Auto 포워딩됩니다.')}
                    </div>
                </div>
            )}
        </div>
    );
}

/* ─── Event 스트림 Tab ─────────────────────────── */
function EventStreamTab({ API }) {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(false);
    const [testForm, setTestForm] = useState({ pixel_id: "", event_name: "purchase", value: "50000", session_id: "test_session_" + Date.now() });

    const sendTest = async () => {
        setLoading(true);
        const r = await fetch("/api/pixel/collect", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...testForm, value: parseFloat(testForm.value), utm_source: "test", utm_medium: "manual_test" }),
        }).then(r => r.json());

        if (r.ok) {
            setEvents(prev => [{ ...testForm, event_id: r.event_id, time: new Date().toLocaleTimeString(), forwarded: "✅" }, ...prev.slice(0, 49)]);
        }
        setLoading(false);
    };

    const eventTypes = ["page_view", "view_content", "add_to_cart", "initiate_checkout", "purchase", "lead", "subscribe"];

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={CARD}>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>🧪 Test Event Send</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                    <div>
                        <label style={{ fontSize: 12, color: C.muted }}>Pixel ID</label>
                        <input style={INPUT} value={testForm.pixel_id} onChange={e => setTestForm({ ...testForm, pixel_id: e.target.value })} placeholder="px_..." />
                    </div>
                    <div>
                        <label style={{ fontSize: 12, color: C.muted }}>Event Type</label>
                        <select style={{ ...INPUT }} value={testForm.event_name} onChange={e => setTestForm({ ...testForm, event_name: e.target.value })}>
                            {eventTypes.map(et => <option key={et} value={et}>{et}</option>)}
                        </select>
                    </div>
                    <div>
                        <label style={{ fontSize: 12, color: C.muted }}>Amount (KRW)</label>
                        <input style={INPUT} value={testForm.value} onChange={e => setTestForm({ ...testForm, value: e.target.value })} placeholder="50000" />
                    </div>
                </div>
                <button onClick={sendTest} disabled={loading || !testForm.pixel_id} style={{ marginTop: 12, padding: "9px 24px", borderRadius: 10, border: "none", cursor: "pointer", background: C.green, color: "#fff", fontWeight: 700 }}>
                    {loading ? "Sending..." : "▶ Event Send"}
                </button>
            </div>

            <div style={CARD}>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>{t('auto.z99yxj', '📡 실Time Event 스트림')}</div>
                {!events.length ? (
                    <div style={{ color: C.muted, textAlign: "center", padding: 24 }}>{t('auto.py8pyc', 'Event None — Test Event를 Send하거나 Pixel을 설치하세요')}</div>
                ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {events.map((ev, i) => (
                            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: C.surface, borderRadius: 10, fontSize: 12 }}>
                                <div>
                                    <span style={{ background: C.accent + "30", color: C.accent, padding: "2px 10px", borderRadius: 999, fontWeight: 700, fontSize: 11 }}>{ev.event_name}</span>
                                    <span style={{ marginLeft: 10, color: C.muted }}>{ev.time}</span>
                                </div>
                                <div style={{ display: "flex", gap: 12 }}>
                                    {parseFloat(ev.value) > 0 && <span style={{ color: C.yellow }}>₩{parseFloat(ev.value).toLocaleString()}</span>}
                                    <span style={{ color: C.green }}>{ev.forwarded} CAPI</span>
                                    <span style={{ color: C.muted, fontSize: 10 }}>#{ev.event_id?.slice(-8)}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

/* ─── 메인 Page ─────────────────────────────── */
export default function PixelTracking() {
  const t = useT();
    const { isPro, token, user } = useAuth();
    const API = makeAPI(token);

    // ⚠️ React Hook 규칙: 모든 useState는 조건부 return Previous에 선언
    const [tab, setTab] = useState("dashboard");
    const TABS = [
        { id: "dashboard", label: "📊 Analysis Dashboard" },
        { id: "pixels", label: "🔧 Pixel Settings" },
        { id: "events", label: t('auto.q46ypc', '📡 Event 스트림') },
    ];

    // Demo·비Paid 유저 → PlanGate (훅 After에 조건부 return)
    if (!isPro) return <PlanGate feature="pixel_tracking" />;

    return (
        <div style={{ padding: "0 0 40px 0" }}>
            <div style={{ marginBottom: 24 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                    <div style={{ fontSize: 28 }}>🎯</div>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 800, fontSize: 22, color: C.text }}>{t('auto.gdphlw', '1st-Party Pixel 트래킹')}</div>
                        <div style={{ fontSize: 13, color: C.muted }}>{t('auto.o3mk6d', 'iOS14+ After Ad 과소Aggregate 문제 해결 · Meta CAPI + TikTok 서버사이드 Auto 포워딩 · 퍼널 Analysis')}</div>
                    </div>
                    {/* Subscription Pricing Sync 배지 */}
                    {(() => {
                        const planKey = isPro ? (user?.planName?.toLowerCase() || 'pro') : 'demo';
                        const fee = PLAN_FEES[planKey] || PLAN_FEES.pro;
                        return (
                            <div style={{ background: `${fee.color}14`, border: `1px solid ${fee.color}40`, borderRadius: 12, padding: '10px 16px', textAlign: 'center', minWidth: 140 }}>
                                <div style={{ fontSize: 9, color: C.muted, fontWeight: 700, marginBottom: 2 }}>{t('auto.s9kp8h', '현재 Subscription 플랜')}</div>
                                <div style={{ fontSize: 14, fontWeight: 900, color: fee.color }}>{fee.label}</div>
                                {fee.monthly > 0 ? (
                                    <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                                        월 ₩{fee.monthly.toLocaleString()}<br />
                                        <span style={{ fontSize: 9, color: C.green }}>Annual ₩{fee.annual.toLocaleString()}/월</span>
                                    </div>
                                ) : (
                                    <div style={{ fontSize: 11, color: C.yellow, marginTop: 2 }}>{t('auto.cwe2np', 'Free 체험 in progress')}</div>
                                )}
                            </div>
                        );
                    })()}
                </div>
                <div style={{ display: "flex", gap: 4, marginTop: 16 }}>
                    {TABS.map(t => (
                        <button key={t.id} onClick={() => setTab(t.id)} style={{
                            padding: "8px 18px", borderRadius: 10, border: "none", cursor: "pointer",
                            background: tab === t.id ? C.accent : C.surface,
                            color: tab === t.id ? "#fff" : C.muted, fontWeight: 700, fontSize: 13,
                        }}>{t.label}</button>
                    ))}
                </div>
            </div>

            {tab === "dashboard" && <DashboardTab API={API} />}
            {tab === "pixels" && <PixelConfigTab API={API} />}
            {tab === "events" && <EventStreamTab API={API} />}
        </div>
    );
}
