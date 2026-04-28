import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useT } from '../i18n/index.js';
import { useAuth } from "../auth/AuthContext";
import { useNotification } from "../context/NotificationContext.jsx";
import { useGlobalData } from "../context/GlobalDataContext.jsx";
import PlanGate from "../components/PlanGate";

/* ─── Security Monitor (Anti-Hacking Detection) ────────────────────────── */
const SEC_PATTERNS = [
  /<script/i, /javascript:/i, /on(error|load|click|mouse)=/i,
  /eval\s*\(/i, /document\.(cookie|write)/i, /\\x[0-9a-f]{2}/i,
  /union\s+(all\s+)?select/i, /drop\s+table/i, /;\s*delete\s+from/i,
  /\.\.\/\.\.\/\.\.\//i, /etc\/passwd/i, /base64_decode/i,
];
const SEC_RATE = { max: 30, windowMs: 10000 };

function useSecurityMonitor() {
  const { pushNotification } = useNotification();
  const [threats, setThreats] = useState([]);
  const [locked, setLocked] = useState(false);
  const reqRef = useRef({ count: 0, start: Date.now() });

  const checkInput = useCallback((value, source = 'input') => {
    if (!value || typeof value !== 'string') return false;
    for (const pat of SEC_PATTERNS) {
      if (pat.test(value)) {
        const threat = { id: Date.now(), type: 'injection', source, value: value.slice(0, 60), time: new Date().toISOString(), severity: 'critical' };
        setThreats(p => [...p.slice(-29), threat]);
        pushNotification({ type: 'alert', title: '🛡️ Security Alert', body: `Blocked malicious ${source}: ${pat.source.slice(0, 25)}`, link: '/pixel-tracking' });
        return true;
      }
    }
    return false;
  }, [pushNotification]);

  const checkRate = useCallback(() => {
    const now = Date.now(), ref = reqRef.current;
    if (now - ref.start > SEC_RATE.windowMs) { ref.count = 1; ref.start = now; return false; }
    ref.count++;
    if (ref.count > SEC_RATE.max) {
      setLocked(true);
      pushNotification({ type: 'alert', title: '🛡️ Rate Limit', body: `${ref.count} requests in ${SEC_RATE.windowMs / 1000}s — possible attack`, link: '/pixel-tracking' });
      setTimeout(() => setLocked(false), 30000);
      return true;
    }
    return false;
  }, [pushNotification]);

  return { checkInput, checkRate, threats, locked };
}

/* ─── Cross-Tab Real-Time Sync ─────────────────────────────────────────── */
const SYNC_CH = 'geniego_pxl_sync';
if (!window.__PXL_TAB) window.__PXL_TAB = Math.random().toString(36).slice(2);

function useCrossTabSync() {
  const chRef = useRef(null);
  useEffect(() => {
    try { chRef.current = new BroadcastChannel(SYNC_CH); } catch { return; }
    return () => { try { chRef.current?.close(); } catch {} };
  }, []);

  const broadcast = useCallback((type, data) => {
    try { chRef.current?.postMessage({ type, data, ts: Date.now(), tab: window.__PXL_TAB }); } catch {}
  }, []);

  const onMessage = useCallback((handler) => {
    if (!chRef.current) return () => {};
    const fn = (e) => { if (e.data?.tab !== window.__PXL_TAB) handler(e.data); };
    chRef.current.addEventListener('message', fn);
    return () => chRef.current?.removeEventListener('message', fn);
  }, []);

  return { broadcast, onMessage };
}

/* ─── Security Overlay (Threat Alert UI) ───────────────────────────────── */
function SecurityOverlay({ threats, onDismiss, t }) {
  if (!threats?.length) return null;
  const latest = threats[threats.length - 1];
  return (
    <div style={{
      position: "fixed", bottom: 20, right: 20, zIndex: 9998, width: 370,
      background: "rgba(15,7,7,0.95)", backdropFilter: "blur(16px)",
      border: "1.5px solid rgba(239,68,68,0.5)", borderRadius: 16,
      padding: "16px 20px", boxShadow: "0 16px 48px rgba(239,68,68,0.3)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(239,68,68,0.15)",
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>🛡️</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: 13, color: "#ef4444" }}>{t('pxl.secAlert')}</div>
          <div style={{ fontSize: 10, color: 'var(--text-3)' }}>
            {new Date(latest.time).toLocaleTimeString()} · {latest.type}
        </div>
        <button onClick={onDismiss} style={{ width: 24, height: 24, borderRadius: 6, border: '1px solid var(--border)', background: "transparent", color: "var(--text-3)", cursor: "pointer", fontSize: 12 }}>✕</button>
      <div style={{ fontSize: 11, color: 'var(--text-2)', lineHeight: 1.6, padding: "8px 12px", borderRadius: 8, background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)", fontFamily: "monospace", wordBreak: "break-all" }}>
        {latest.value}
      <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 8 }}>
        {t('pxl.secBlocked')} · {threats.length} {t('pxl.secTotal')}
                    </div>
                </div>
            </div>
        </div>
    </div>
);
}

/* ─── Auth-Aware API Helper ──────────────────────────────────────────── */
function makeAPI(token) {
    return (path, opts = {}) => {
        // Security: block suspicious paths
        if (/[<>'"\\]/.test(path)) return Promise.resolve({ ok: false, error: "Blocked" });
        const headers = { "Content-Type": "application/json", ...(opts.headers || {}) };
        if (token) headers["Authorization"] = `Bearer ${token}`;
        return fetch(`/api${path}`, { ...opts, headers }).then(r => r.json());
    };
}

/* ─── Design Tokens ──────────────────────────────────────────────────── */
const C = {
    bg: "var(--bg)", surface: "var(--surface)", card: "var(--bg-card, rgba(255,255,255,0.95))",
    border: "var(--border)", accent: "#4f8ef7",
    green: "#22c55e", red: "#f87171", yellow: "#fbbf24",
    purple: "#a78bfa", muted: "var(--text-3)", text: "var(--text-1)",
    orange: "#fb923c",
};
const CARD = { background: C.card, borderRadius: 16, border: `1px solid ${C.border}`, padding: 24 };
const INPUT = { width: "100%", padding: "9px 13px", borderRadius: 8, background: C.surface, border: `1px solid ${C.border}`, color: C.text, boxSizing: "border-box", fontSize: 13, outline: "none" };

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

/* ═══════════════════════════════════════════════════════════════════════
   Dashboard Tab — Real-time Analytics
   ═══════════════════════════════════════════════════════════════════════ */
function DashboardTab({ API }) {
    const t = useT();
    const [data, setData] = useState(null);
    const [days, setDays] = useState(30);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        API(`/pixel/analytics?days=${days}`).then(r => { setData(r); setLoading(false); }).catch(() => setLoading(false));
    }, [days]);

    if (loading) return <div style={{ color: C.muted, padding: 40, textAlign: "center" }}>📊 {t('pxl.loading')}</div>;

    const hasData = data?.ok;
    const totalEvents = hasData ? (data.events?.reduce((s, e) => s + parseInt(e.total || 0), 0) || 0) : 0;
    const purchases = hasData ? (data.events?.find(e => e.event_name === "purchase")) : null;
    const revenue = purchases ? parseFloat(purchases.total_value || 0) : 0;
    const convRate = hasData && data.funnel?.page_view > 0
        ? ((data.funnel.purchase / data.funnel.page_view) * 100).toFixed(2) : "0.00";

    const funnelSteps = [
        { name: t('pxl.funnelVisit'), count: hasData ? (data.funnel?.page_view || 0) : 0, color: "#4f8ef7" },
        { name: t('pxl.funnelProduct'), count: hasData ? (data.funnel?.view_content || 0) : 0, color: "#818cf8" },
        { name: t('pxl.funnelCart'), count: hasData ? (data.funnel?.add_to_cart || 0) : 0, color: "#a78bfa" },
        { name: t('pxl.funnelCheckout'), count: hasData ? (data.funnel?.initiate_checkout || 0) : 0, color: "#c084fc" },
        { name: t('pxl.funnelPurchase'), count: hasData ? (data.funnel?.purchase || 0) : 0, color: "#22c55e" },
    ];
    const maxCount = Math.max(...funnelSteps.map(s => s.count), 1);

    const fwdMeta = hasData ? parseInt(data.forwarding?.meta_forwarded || 0) : 0;
    const fwdTiktok = hasData ? parseInt(data.forwarding?.tiktok_forwarded || 0) : 0;
    const fwdTotal = hasData ? parseInt(data.forwarding?.total_events || 1) : 1;

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Period Select */}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                {[7, 14, 30, 90].map(d => (
                    <button key={d} onClick={() => setDays(d)} style={{
                        padding: "6px 16px", borderRadius: 8, border: "none", cursor: "pointer",
                        background: days === d ? C.accent : C.surface,
                        color: days === d ? "#fff" : C.muted, fontWeight: 700, fontSize: 12,
                    }}>{d}{t('pxl.days')}</button>
                ))}

            {/* No data guidance */}
            {!hasData && (
                <div style={{ ...CARD, textAlign: "center", padding: 48 }}>
                    <div style={{ fontSize: 56, marginBottom: 16 }}>📊</div>
                    <div style={{ fontWeight: 800, fontSize: 18, color: C.text, marginBottom: 8 }}>{t('pxl.noDataTitle')}</div>
                    <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.7 }}>{t('pxl.noDataDesc')}</div>
            )}

            {/* Summary Cards */}
            {hasData && (
                <>
                    <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                        <StatCard icon="📊" label={t('pxl.totalEvents')} value={totalEvents.toLocaleString()} color={C.accent} />
                        <StatCard icon="🛒" label={t('pxl.purchases')} value={(data.funnel?.purchase || 0).toLocaleString()} color={C.green} />
                        <StatCard icon="💰" label={t('pxl.totalRevenue')} value={`₩${revenue.toLocaleString()}`} color={C.yellow} />
                        <StatCard icon="📈" label={t('pxl.convRate')} value={`${convRate}%`} sub={`${t('pxl.funnelVisit')} → ${t('pxl.funnelPurchase')}`} color={C.purple} />
                        <StatCard icon="🔵" label={t('pxl.metaForward')} value={`${fwdTotal > 0 ? Math.round(fwdMeta / fwdTotal * 100) : 0}%`} sub={t('pxl.serverSideCAPI')} color="#60a5fa" />
                        <StatCard icon="⚫" label={t('pxl.tiktokForward')} value={`${fwdTotal > 0 ? Math.round(fwdTiktok / fwdTotal * 100) : 0}%`} sub={t('pxl.serverSideEvent')} color="#94a3b8" />

                    {/* Funnel Chart */}
                    <div style={CARD}>
                        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 20 }}>🔽 {t('pxl.funnelTitle')}</div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                            {funnelSteps.map((step, i) => {
                                const widthPct = maxCount > 0 ? (step.count / maxCount * 100) : 0;
                                const convPct = i > 0 ? (funnelSteps[i - 1].count > 0 ? (step.count / funnelSteps[i - 1].count * 100).toFixed(1) : "0") : "100";
                                return (
                                    <div key={step.name}>
                                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 13 }}>
                                            <span style={{ color: C.text }}>{step.name}</span>
                                            <span style={{ color: C.muted }}>{step.count.toLocaleString()} <span style={{ color: step.color }}>({convPct}%)</span></span>
                                        <div style={{ height: 10, background: C.surface, borderRadius: 5, overflow: "hidden" }}>
                                            <div style={{ height: "100%", width: `${widthPct}%`, background: `linear-gradient(90deg, ${step.color}cc, ${step.color})`, borderRadius: 5, transition: "width 0.8s ease" }} />
                                    </div>
                                
                                
                                  </div>
        </div>
);
         
                   })}
                    </div>

                    {/* Channel Attribution */}
                    <div style={CARD}>
                        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>📡 {t('pxl.channelAttr')}</div>
                        {!data.channels?.length ? (
                            <div style={{ color: C.muted, textAlign: "center", padding: 20 }}>{t('pxl.noChannelData')}</div>
                        ) : (
                            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                                <thead>
                                    <tr style={{ color: C.muted, borderBottom: `1px solid ${C.border}` }}>
                                        <th style={{ textAlign: "left", padding: "8px 0" }}>{t('pxl.source')}</th>
                                        <th style={{ textAlign: "left", padding: "8px 0" }}>{t('pxl.medium')}</th>
                                        <th style={{ textAlign: "right", padding: "8px 0" }}>{t('pxl.sessions')}</th>
                                        <th style={{ textAlign: "right", padding: "8px 0" }}>{t('pxl.conversions')}</th>
                                        <th style={{ textAlign: "right", padding: "8px 0" }}>{t('pxl.revenue')}</th>
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
                </>
            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
/* ═══════════════════════════════════════════════════════════ */
function PixelConfigTab({ API, broadcast, checkInput, checkRate }) {
    const t = useT();
    const [configs, setConfigs] = useState([]);
    const [form, setForm] = useState({ name: "", domain: "", meta_pixel_id: "", meta_api_token: "", tiktok_pixel_id: "", tiktok_access_token: "" });
    const [snippet, setSnippet] = useState("");
    const [selectedPixelId, setSelectedPixelId] = useState(null);
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState("");

    const load = useCallback(() => API("/pixel/configs").then(r => setConfigs(r.configs || [])).catch(() => {}), [API]);
    useEffect(() => { load(); }, [load]);

    const save = async () => {
        if (!form.name.trim()) { setMsg(`❌ ${t('pxl.nameRequired')}`); return; }
        // Security: validate inputs
        if (checkInput && (checkInput(form.name, 'pixel_name') || checkInput(form.domain, 'domain'))) { setMsg(`❌ ${t('pxl.secInputBlocked')}`); return; }
        if (checkRate && checkRate()) return;
        setSaving(true);
        const r = await API("/pixel/configs", { method: "POST", body: JSON.stringify(form) });
        if (r.ok) {
            setMsg(`✅ ${t('pxl.createSuccess')} pixel_id: ${r.pixel_id}`);
            load();
            setForm({ name: "", domain: "", meta_pixel_id: "", meta_api_token: "", tiktok_pixel_id: "", tiktok_access_token: "" });
            if (broadcast) broadcast('pixel_config_change', { action: 'create', pixel_id: r.pixel_id });
        }
        else setMsg(`❌ ${t('pxl.createError')}: ${r.error || ''}`);
        setSaving(false);
    };

    const loadSnippet = async (pixelId) => {
        const r = await API(`/pixel/snippet/${pixelId}`);
        if (r.ok) { setSnippet(r.snippet); setSelectedPixelId(pixelId); }
    };

    const deleteConfig = async (id) => {
        if (!confirm(t('pxl.deleteConfirm'))) return;
        if (checkRate && checkRate()) return;
        await API(`/pixel/configs/${id}`, { method: "DELETE" });
        load();
        if (broadcast) broadcast('pixel_config_change', { action: 'delete', id });
    };

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Create New Pixel */}
            <div style={CARD}>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>➕ {t('pxl.createPixel')}</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div><label style={{ fontSize: 12, color: C.muted }}>{t('pxl.pixelName')}</label>
                        <input style={INPUT} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder={t('pxl.pixelNamePh')} /></div>
                    <div><label style={{ fontSize: 12, color: C.muted }}>{t('pxl.domain')}</label>
                        <input style={INPUT} value={form.domain} onChange={e => setForm({ ...form, domain: e.target.value })} placeholder="example.com" /></div>
                    <div><label style={{ fontSize: 12, color: C.muted }}>Meta Pixel ID</label>
                        <input style={INPUT} value={form.meta_pixel_id} onChange={e => setForm({ ...form, meta_pixel_id: e.target.value })} placeholder="1234567890" /></div>
                    <div><label style={{ fontSize: 12, color: C.muted }}>{t('pxl.metaCAPIToken')}</label>
                        <input style={INPUT} type="password" value={form.meta_api_token} onChange={e => setForm({ ...form, meta_api_token: e.target.value })} placeholder="EAAxxxxxx..." /></div>
                    <div><label style={{ fontSize: 12, color: C.muted }}>TikTok Pixel ID</label>
                        <input style={INPUT} value={form.tiktok_pixel_id} onChange={e => setForm({ ...form, tiktok_pixel_id: e.target.value })} placeholder="CXXXXXX" /></div>
                    <div><label style={{ fontSize: 12, color: C.muted }}>TikTok Access Token</label>
                        <input style={INPUT} type="password" value={form.tiktok_access_token} onChange={e => setForm({ ...form, tiktok_access_token: e.target.value })} placeholder="xxxxxx..." /></div>
                {msg && <div style={{ marginTop: 10, fontSize: 13, color: msg.startsWith("✅") ? C.green : C.red }}>{msg}</div>}
                <button onClick={save} disabled={saving} style={{ marginTop: 16, padding: "10px 28px", borderRadius: 10, border: "none", cursor: "pointer", background: `linear-gradient(135deg, ${C.accent}, #6366f1)`, color: 'var(--text-1)', fontWeight: 700 }}>
                    {saving ? t('pxl.creating') : `🔧 ${t('pxl.createPixelBtn')}`}
                </button>

            {/* Pixel List */}
            <div style={CARD}>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>📋 {t('pxl.pixelList')}</div>
                {!configs.length ? (
                    <div style={{ color: C.muted, textAlign: "center", padding: 20 }}>{t('pxl.noPixels')}</div>
                ) : (
                    configs.map(cfg => (
                        <div key={cfg.id} style={{ padding: "14px 0", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div>
                                <div style={{ fontWeight: 700 }}>{cfg.name}</div>
                                <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>ID: {cfg.pixel_id} | {t('pxl.domain')}: {cfg.domain || "-"}</div>
                            <div style={{ display: "flex", gap: 8 }}>
                                <button onClick={() => loadSnippet(cfg.pixel_id)} style={{ padding: "6px 14px", borderRadius: 8, border: "none", background: "#1e293b", color: C.accent, cursor: "pointer", fontSize: 12 }}>{"</>"} {t('pxl.snippet')}</button>
                                <button onClick={() => deleteConfig(cfg.id)} style={{ padding: "6px 14px", borderRadius: 8, border: "none", background: "#1e293b", color: C.red, cursor: "pointer", fontSize: 12 }}>🗑 {t('pxl.delete')}</button>
                        </div>
                    ))
                )}

            {/* SDK Snippet Code */}
            {snippet && (
                <div style={CARD}>
                    <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>📋 {t('pxl.snippetTitle')} ({selectedPixelId})</div>
                    <div style={{ background: "#0a0f1a", borderRadius: 10, padding: 16, fontFamily: "monospace", fontSize: 12, color: "#7dd3fc", whiteSpace: "pre-wrap", wordBreak: "break-all", overflow: "auto", maxHeight: 300 }}>
                        {snippet}
                    <button onClick={() => { navigator.clipboard.writeText(snippet); }} style={{ marginTop: 12, padding: "8px 20px", borderRadius: 8, border: "none", cursor: "pointer", background: C.surface, color: C.text, fontSize: 12 }}>📋 {t('pxl.copy')}</button>
                    <div style={{ marginTop: 12, fontSize: 12, color: C.muted }}>
                        ℹ️ {t('pxl.snippetGuide1')}<code style={{ background: "#1e293b", padding: "2px 6px", borderRadius: 4 }}>&lt;head&gt;</code> {t('pxl.snippetGuide2')}<br />
                        {t('pxl.snippetGuide3')}
                </div>
            )}
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

/* ═══════════════════════════════════════════════════════════════════════
   Event Stream Tab — Real-time Event Testing
   ═══════════════════════════════════════════════════════════════════════ */
function EventStreamTab({ API, broadcast, checkInput }) {
    const t = useT();
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(false);
    const [testForm, setTestForm] = useState({ pixel_id: "", event_name: "purchase", value: "50000", session_id: "test_session_" + Date.now() });

    const sendTest = async () => {
        // Security: validate pixel_id input
        if (checkInput && checkInput(testForm.pixel_id, 'pixel_id')) return;
        setLoading(true);
        try {
            const r = await fetch("/api/pixel/collect", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...testForm, value: parseFloat(testForm.value), utm_source: "test", utm_medium: "manual_test" }),
            }).then(r => r.json());

            if (r.ok) {
                setEvents(prev => [{ ...testForm, event_id: r.event_id, time: new Date().toLocaleTimeString(), forwarded: "✅" }, ...prev.slice(0, 49)]);
                if (broadcast) broadcast('pixel_event_sent', { event_id: r.event_id });
            }
        } catch {}
        setLoading(false);
    };

    const eventTypes = ["page_view", "view_content", "add_to_cart", "initiate_checkout", "purchase", "lead", "subscribe"];

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={CARD}>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>🧪 {t('pxl.testEventSend')}</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                    <div>
                        <label style={{ fontSize: 12, color: C.muted }}>Pixel ID</label>
                        <input style={INPUT} value={testForm.pixel_id} onChange={e => setTestForm({ ...testForm, pixel_id: e.target.value })} placeholder="px_..." />
                    <div>
                        <label style={{ fontSize: 12, color: C.muted }}>{t('pxl.eventType')}</label>
                        <select style={{ ...INPUT }} value={testForm.event_name} onChange={e => setTestForm({ ...testForm, event_name: e.target.value })}>
                            {eventTypes.map(et => <option key={et} value={et}>{et}</option>)}
                        </select>
                    <div>
                        <label style={{ fontSize: 12, color: C.muted }}>{t('pxl.amount')}</label>
                        <input style={INPUT} value={testForm.value} onChange={e => setTestForm({ ...testForm, value: e.target.value })} placeholder="50000" />
                </div>
                <button onClick={sendTest} disabled={loading || !testForm.pixel_id} style={{ marginTop: 12, padding: "9px 24px", borderRadius: 10, border: "none", cursor: "pointer", background: C.green, color: 'var(--text-1)', fontWeight: 700, opacity: (!testForm.pixel_id || loading) ? 0.5 : 1 }}>
                    {loading ? t('pxl.sending') : `▶ ${t('pxl.sendEvent')}`}
                </button>

            <div style={CARD}>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>📡 {t('pxl.realtimeStream')}</div>
                {!events.length ? (
                    <div style={{ color: C.muted, textAlign: "center", padding: 24 }}>{t('pxl.noEvents')}</div>
                ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {events.map((ev, i) => (
                            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: C.surface, borderRadius: 10, fontSize: 12 }}>
                                <div>
                                    <span style={{ background: C.accent + "30", color: C.accent, padding: "2px 10px", borderRadius: 999, fontWeight: 700, fontSize: 11 }}>{ev.event_name}</span>
                                    <span style={{ marginLeft: 10, color: C.muted }}>{ev.time}</span>
                                <div style={{ display: "flex", gap: 12 }}>
                                    {parseFloat(ev.value) > 0 && <span style={{ color: C.yellow }}>₩{parseFloat(ev.value).toLocaleString()}</span>}
                                    <span style={{ color: C.green }}>{ev.forwarded} CAPI</span>
                                    <span style={{ color: C.muted, fontSize: 10 }}>#{ev.event_id?.slice(-8)}</span>
                            </div>
                        ))}
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
);
}

/* ═══════════════════════════════════════════════════════════════════════
   Main Page — Enterprise Security + Real-time Sync
   ═══════════════════════════════════════════════════════════════════════ */
export default function PixelTracking() {
    const t = useT();
    const { isPro, token, user } = useAuth();
    const API = makeAPI(token);
    const [tab, setTab] = useState("dashboard");

    // Security Monitor
    const { checkInput, checkRate, threats, locked } = useSecurityMonitor();
    const [showSecAlert, setShowSecAlert] = useState(true);

    // Cross-Tab Sync
    const { broadcast, onMessage } = useCrossTabSync();

    // Listen for cross-tab pixel config changes
    useEffect(() => {
        return onMessage((msg) => {
            if (msg.type === 'pixel_config_change' || msg.type === 'pixel_event_sent') {
                // Force re-render by toggling tab
                setTab(prev => prev);
            }
        });
    }, [onMessage]);

    const TABS = [
        { id: "dashboard", label: `📊 ${t('pxl.tabDashboard')}` },
        { id: "pixels", label: `🔧 ${t('pxl.tabSettings')}` },
        { id: "events", label: `📡 ${t('pxl.tabEvents')}` },
    ];

    if (!isPro) return <PlanGate feature="pixel_tracking" />;

    // Security lockdown screen
    if (locked) return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh", textAlign: "center" }}>
            <div style={{ padding: "48px 40px", borderRadius: 24,
                background: "linear-gradient(135deg,rgba(239,68,68,0.06),rgba(220,38,38,0.03))",
                border: "2px solid rgba(239,68,68,0.3)", maxWidth: 480 }}>
                <div style={{ fontSize: 64, marginBottom: 16 }}>🛡️</div>
                <div style={{ fontWeight: 900, fontSize: 22, color: "#ef4444", marginBottom: 12 }}>{t('pxl.secLockTitle')}</div>
                <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.7, marginBottom: 24 }}>{t('pxl.secLockDesc')}</div>
                <div style={{ fontSize: 11, color: C.muted }}>{t('pxl.secLockWait')}</div>
        </div>
    </div>
);

    return (
        <div style={{ padding: "0 0 40px 0" }}>
            <div style={{ marginBottom: 24 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                    <div style={{ fontSize: 28 }}>🎯</div>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 800, fontSize: 22, color: C.text }}>{t('pxl.heroTitle')}</div>
                        <div style={{ fontSize: 13, color: C.muted }}>{t('pxl.heroDesc')}</div>
                </div>
                <div style={{ display: "flex", gap: 4, marginTop: 16 }}>
                    {TABS.map(tb => (
                        <button key={tb.id} onClick={() => setTab(tb.id)} style={{
                            padding: "8px 18px", borderRadius: 10, border: "none", cursor: "pointer",
                            background: tab === tb.id ? C.accent : C.surface,
                            color: tab === tb.id ? "#fff" : C.muted, fontWeight: 700, fontSize: 13,
                        }}>{tb.label}</button>
                    ))}
            </div>

            {tab === "dashboard" && <DashboardTab API={API} />}
            {tab === "pixels" && <PixelConfigTab API={API} broadcast={broadcast} checkInput={checkInput} checkRate={checkRate} />}
            {tab === "events" && <EventStreamTab API={API} broadcast={broadcast} checkInput={checkInput} />}

            {/* Security Alert Overlay */}
            {showSecAlert && threats.length > 0 && (
                <SecurityOverlay threats={threats} onDismiss={() => setShowSecAlert(false)} t={t} />
            )}
      </div>
      </div>
      </div>
);
}
