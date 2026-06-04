// PixelTracking.jsx — 191차 복원·실배선(clean rewrite).
//   184차에 고아 dead-code 로 삭제됐던 페이지를, 190차 부활 백엔드(/api/pixel/*)에 맞춰 깨끗이 재작성.
//   백업본(pages_backup/PixelTracking.jsx)은 JSX 손상으로 컴파일 불가 → 동일 3탭을 well-formed 로 복원.
//   ★i18n: pxl 네임스페이스가 페이지 삭제 시 purge 됨 → t('pxl.x','한글초안') 인라인폴백(추후 15개국 정식화).
//   운영=실 /api/pixel/*(세션토큰+requirePro+테넌트격리), 데모=세션 미달 시 honest 빈 상태(가짜데이터 없음).
import React, { useState, useEffect, useCallback } from "react";
import { useT } from "../i18n/index.js";
import { useAuth } from "../auth/AuthContext";
import PlanGate from "../components/PlanGate";

/* 인증 API 헬퍼: /api 접두(상대 /pixel 은 nginx SPA 폴백) + Bearer 세션토큰 */
function makeAPI(token) {
  return (path, opts = {}) => {
    if (/[<>'"\\]/.test(path)) return Promise.resolve({ ok: false, error: "Blocked" });
    const headers = { "Content-Type": "application/json", ...(opts.headers || {}) };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    return fetch(`/api${path}`, { ...opts, headers }).then(r => r.json()).catch(() => ({ ok: false }));
  };
}

const C = {
  surface: "var(--surface)", card: "var(--bg-card, rgba(255,255,255,0.95))",
  border: "var(--border)", accent: "#4f8ef7", green: "#22c55e", red: "#f87171",
  yellow: "#fbbf24", purple: "#a78bfa", muted: "var(--text-3)", text: "var(--text-1)",
};
const CARD = { background: C.card, borderRadius: 16, border: `1px solid ${C.border}`, padding: 24 };
const INPUT = { width: "100%", padding: "9px 13px", borderRadius: 8, background: C.surface, border: `1px solid ${C.border}`, color: C.text, boxSizing: "border-box", fontSize: 13, outline: "none" };

/* pxl 네임스페이스 한글 폴백(purge 됨). t('pxl.key') 호출 시 키 부재면 이 값으로 렌더. */
const PXL_FB = {
  heroTitle: "1st-Party 픽셀 트래킹", heroDesc: "쿠키리스 시대의 서버사이드 전환 추적 (Meta CAPI · TikTok Events API)",
  tabDashboard: "대시보드", tabSettings: "픽셀 설정", tabEvents: "이벤트 스트림",
  loading: "분석 데이터를 불러오는 중…", days: "일",
  noDataTitle: "아직 수집된 데이터가 없습니다", noDataDesc: "‘픽셀 설정’ 탭에서 픽셀을 생성하고 스니펫을 사이트에 설치하면 이벤트가 수집됩니다.",
  totalEvents: "총 이벤트", purchases: "구매", totalRevenue: "총 매출", convRate: "전환율",
  metaForward: "Meta 전송", tiktokForward: "TikTok 전송", serverSideCAPI: "서버사이드 CAPI", serverSideEvent: "서버사이드 이벤트",
  funnelTitle: "전환 퍼널", funnelVisit: "방문", funnelProduct: "상품 조회", funnelCart: "장바구니", funnelCheckout: "결제 시작", funnelPurchase: "구매 완료",
  channelAttr: "채널 기여 분석", noChannelData: "채널 데이터가 없습니다",
  source: "소스", medium: "매체", sessions: "세션", conversions: "전환", revenue: "매출",
  createPixel: "새 픽셀 생성", pixelName: "픽셀 이름", pixelNamePh: "예: 메인 쇼핑몰 픽셀", domain: "도메인",
  metaCAPIToken: "Meta CAPI 토큰", nameRequired: "픽셀 이름을 입력하세요", secInputBlocked: "입력이 차단되었습니다",
  createSuccess: "픽셀이 생성되었습니다.", createError: "생성 실패", creating: "생성 중…", createPixelBtn: "픽셀 생성",
  pixelList: "픽셀 목록", noPixels: "등록된 픽셀이 없습니다", snippet: "스니펫", delete: "삭제", deleteConfirm: "이 픽셀을 삭제할까요? 수집이 중단됩니다.",
  snippetTitle: "설치 스니펫", copy: "복사", copied: "복사됨",
  snippetGuide1: "이 코드를 사이트의 ", snippetGuide2: " 태그 안에 붙여넣으세요.", snippetGuide3: "설치 후 페이지뷰·구매 이벤트가 자동 수집되며 Meta/TikTok 으로 서버사이드 전송됩니다.",
  testEventSend: "테스트 이벤트 전송", eventType: "이벤트 유형", amount: "금액", sending: "전송 중…", sendEvent: "이벤트 전송",
  realtimeStream: "실시간 이벤트 스트림", noEvents: "전송된 이벤트가 없습니다. 위에서 테스트 이벤트를 보내보세요.",
};

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

/* pxl 폴백 주입 t */
function usePxlT() {
  const t = useT();
  return useCallback((key, vars) => {
    const fb = key && key.indexOf("pxl.") === 0 ? PXL_FB[key.slice(4)] : undefined;
    return t(key, fb, vars);
  }, [t]);
}

/* ── Dashboard Tab ── */
function DashboardTab({ API }) {
  const t = usePxlT();
  const [data, setData] = useState(null);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    API(`/pixel/analytics?days=${days}`).then(r => { setData(r); setLoading(false); }).catch(() => setLoading(false));
  }, [days]);

  if (loading) return <div style={{ color: C.muted, padding: 40, textAlign: "center" }}>📊 {t("pxl.loading")}</div>;

  const hasData = data?.ok && (data.events?.length || data.funnel?.page_view);
  const funnel = data?.funnel || {};
  const totalEvents = data?.events?.reduce((s, e) => s + parseInt(e.total || 0, 10), 0) || 0;
  const purchaseEvt = data?.events?.find(e => e.event_name === "purchase");
  const revenue = purchaseEvt ? parseFloat(purchaseEvt.total_value || 0) : 0;
  const convRate = funnel.page_view > 0 ? ((funnel.purchase || 0) / funnel.page_view * 100).toFixed(2) : "0.00";
  const fwd = data?.forwarding || {};
  const fwdTotal = parseInt(fwd.total_events || 0, 10) || 1;
  const funnelSteps = [
    { name: t("pxl.funnelVisit"), count: funnel.page_view || 0, color: "#4f8ef7" },
    { name: t("pxl.funnelProduct"), count: funnel.view_content || 0, color: "#818cf8" },
    { name: t("pxl.funnelCart"), count: funnel.add_to_cart || 0, color: "#a78bfa" },
    { name: t("pxl.funnelCheckout"), count: funnel.initiate_checkout || 0, color: "#c084fc" },
    { name: t("pxl.funnelPurchase"), count: funnel.purchase || 0, color: "#22c55e" },
  ];
  const maxCount = Math.max(...funnelSteps.map(s => s.count), 1);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        {[7, 14, 30, 90].map(d => (
          <button key={d} onClick={() => setDays(d)} style={{ padding: "6px 16px", borderRadius: 8, border: "none", cursor: "pointer", background: days === d ? C.accent : C.surface, color: days === d ? "#fff" : C.muted, fontWeight: 700, fontSize: 12 }}>{d}{t("pxl.days")}</button>
        ))}
      </div>

      {!hasData && (
        <div style={{ ...CARD, textAlign: "center", padding: 48 }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>📊</div>
          <div style={{ fontWeight: 800, fontSize: 18, color: C.text, marginBottom: 8 }}>{t("pxl.noDataTitle")}</div>
          <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.7 }}>{t("pxl.noDataDesc")}</div>
        </div>
      )}

      {hasData && (
        <>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <StatCard icon="📊" label={t("pxl.totalEvents")} value={totalEvents.toLocaleString()} color={C.accent} />
            <StatCard icon="🛒" label={t("pxl.purchases")} value={(funnel.purchase || 0).toLocaleString()} color={C.green} />
            <StatCard icon="💰" label={t("pxl.totalRevenue")} value={`₩${revenue.toLocaleString()}`} color={C.yellow} />
            <StatCard icon="📈" label={t("pxl.convRate")} value={`${convRate}%`} sub={`${t("pxl.funnelVisit")} → ${t("pxl.funnelPurchase")}`} color={C.purple} />
            <StatCard icon="🔵" label={t("pxl.metaForward")} value={`${Math.round((parseInt(fwd.meta_forwarded || 0, 10)) / fwdTotal * 100)}%`} sub={t("pxl.serverSideCAPI")} color="#60a5fa" />
            <StatCard icon="⚫" label={t("pxl.tiktokForward")} value={`${Math.round((parseInt(fwd.tiktok_forwarded || 0, 10)) / fwdTotal * 100)}%`} sub={t("pxl.serverSideEvent")} color="#94a3b8" />
          </div>

          <div style={CARD}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 20 }}>🔽 {t("pxl.funnelTitle")}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {funnelSteps.map((step, i) => {
                const widthPct = step.count / maxCount * 100;
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

          <div style={CARD}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>📡 {t("pxl.channelAttr")}</div>
            {!data.channels?.length ? (
              <div style={{ color: C.muted, textAlign: "center", padding: 20 }}>{t("pxl.noChannelData")}</div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ color: C.muted, borderBottom: `1px solid ${C.border}` }}>
                    <th style={{ textAlign: "left", padding: "8px 0" }}>{t("pxl.source")}</th>
                    <th style={{ textAlign: "left", padding: "8px 0" }}>{t("pxl.medium")}</th>
                    <th style={{ textAlign: "right", padding: "8px 0" }}>{t("pxl.sessions")}</th>
                    <th style={{ textAlign: "right", padding: "8px 0" }}>{t("pxl.conversions")}</th>
                    <th style={{ textAlign: "right", padding: "8px 0" }}>{t("pxl.revenue")}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.channels.slice(0, 10).map((ch, i) => (
                    <tr key={i} style={{ borderBottom: `1px solid ${C.border}` }}>
                      <td style={{ padding: "8px 0", color: C.text }}>{ch.source}</td>
                      <td style={{ padding: "8px 0", color: C.muted }}>{ch.medium}</td>
                      <td style={{ padding: "8px 0", textAlign: "right" }}>{parseInt(ch.sessions || 0, 10).toLocaleString()}</td>
                      <td style={{ padding: "8px 0", textAlign: "right", color: C.green }}>{parseInt(ch.conversions || 0, 10)}</td>
                      <td style={{ padding: "8px 0", textAlign: "right", color: C.yellow }}>₩{parseInt(ch.revenue || 0, 10).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/* ── Pixel Config Tab ── */
function PixelConfigTab({ API }) {
  const t = usePxlT();
  const [configs, setConfigs] = useState([]);
  const [form, setForm] = useState({ name: "", domain: "", meta_pixel_id: "", meta_api_token: "", tiktok_pixel_id: "", tiktok_access_token: "" });
  const [snippet, setSnippet] = useState("");
  const [selectedPixelId, setSelectedPixelId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const load = useCallback(() => { API("/pixel/configs").then(r => setConfigs(r.configs || [])); }, [API]);
  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!form.name.trim()) { setMsg(`❌ ${t("pxl.nameRequired")}`); return; }
    setSaving(true);
    const r = await API("/pixel/configs", { method: "POST", body: JSON.stringify(form) });
    setSaving(false);
    if (r.ok) {
      setMsg(`✅ ${t("pxl.createSuccess")} (pixel_id: ${r.pixel_id})`);
      setForm({ name: "", domain: "", meta_pixel_id: "", meta_api_token: "", tiktok_pixel_id: "", tiktok_access_token: "" });
      load();
    } else setMsg(`❌ ${t("pxl.createError")}: ${r.error || ""}`);
  };

  const loadSnippet = async (pixelId) => {
    const r = await API(`/pixel/snippet/${pixelId}`);
    if (r.ok) { setSnippet(r.snippet || ""); setSelectedPixelId(pixelId); }
  };

  const deleteConfig = async (id) => {
    if (!window.confirm(t("pxl.deleteConfirm"))) return;
    await API(`/pixel/configs/${id}`, { method: "DELETE" });
    load();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={CARD}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>➕ {t("pxl.createPixel")}</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div><label style={{ fontSize: 12, color: C.muted }}>{t("pxl.pixelName")}</label>
            <input style={INPUT} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder={t("pxl.pixelNamePh")} /></div>
          <div><label style={{ fontSize: 12, color: C.muted }}>{t("pxl.domain")}</label>
            <input style={INPUT} value={form.domain} onChange={e => setForm({ ...form, domain: e.target.value })} placeholder="example.com" /></div>
          <div><label style={{ fontSize: 12, color: C.muted }}>Meta Pixel ID</label>
            <input style={INPUT} value={form.meta_pixel_id} onChange={e => setForm({ ...form, meta_pixel_id: e.target.value })} placeholder="1234567890" /></div>
          <div><label style={{ fontSize: 12, color: C.muted }}>{t("pxl.metaCAPIToken")}</label>
            <input style={INPUT} type="password" value={form.meta_api_token} onChange={e => setForm({ ...form, meta_api_token: e.target.value })} placeholder="EAAxxxxxx..." /></div>
          <div><label style={{ fontSize: 12, color: C.muted }}>TikTok Pixel ID</label>
            <input style={INPUT} value={form.tiktok_pixel_id} onChange={e => setForm({ ...form, tiktok_pixel_id: e.target.value })} placeholder="CXXXXXX" /></div>
          <div><label style={{ fontSize: 12, color: C.muted }}>TikTok Access Token</label>
            <input style={INPUT} type="password" value={form.tiktok_access_token} onChange={e => setForm({ ...form, tiktok_access_token: e.target.value })} placeholder="xxxxxx..." /></div>
        </div>
        {msg && <div style={{ marginTop: 10, fontSize: 13, color: msg.startsWith("✅") ? C.green : C.red }}>{msg}</div>}
        <button onClick={save} disabled={saving} style={{ marginTop: 16, padding: "10px 28px", borderRadius: 10, border: "none", cursor: "pointer", background: `linear-gradient(135deg, ${C.accent}, #6366f1)`, color: "#fff", fontWeight: 700 }}>
          {saving ? t("pxl.creating") : `🔧 ${t("pxl.createPixelBtn")}`}
        </button>
      </div>

      <div style={CARD}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>📋 {t("pxl.pixelList")}</div>
        {!configs.length ? (
          <div style={{ color: C.muted, textAlign: "center", padding: 20 }}>{t("pxl.noPixels")}</div>
        ) : (
          configs.map(cfg => (
            <div key={cfg.id} style={{ padding: "14px 0", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 700 }}>{cfg.name}</div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>ID: {cfg.pixel_id} | {t("pxl.domain")}: {cfg.domain || "-"}</div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => loadSnippet(cfg.pixel_id)} style={{ padding: "6px 14px", borderRadius: 8, border: "none", background: "var(--surface)", color: C.accent, cursor: "pointer", fontSize: 12 }}>{"</>"} {t("pxl.snippet")}</button>
                <button onClick={() => deleteConfig(cfg.id)} style={{ padding: "6px 14px", borderRadius: 8, border: "none", background: "var(--surface)", color: C.red, cursor: "pointer", fontSize: 12 }}>🗑 {t("pxl.delete")}</button>
              </div>
            </div>
          ))
        )}
      </div>

      {snippet && (
        <div style={CARD}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>📋 {t("pxl.snippetTitle")} ({selectedPixelId})</div>
          <div style={{ background: "#0a0f1a", borderRadius: 10, padding: 16, fontFamily: "monospace", fontSize: 12, color: "#7dd3fc", whiteSpace: "pre-wrap", wordBreak: "break-all", overflow: "auto", maxHeight: 300 }}>{snippet}</div>
          <button onClick={() => { try { navigator.clipboard.writeText(snippet); } catch {} }} style={{ marginTop: 12, padding: "8px 20px", borderRadius: 8, border: "none", cursor: "pointer", background: C.surface, color: C.text, fontSize: 12 }}>📋 {t("pxl.copy")}</button>
          <div style={{ marginTop: 12, fontSize: 12, color: C.muted }}>
            ℹ️ {t("pxl.snippetGuide1")}<code style={{ background: "var(--surface)", padding: "2px 6px", borderRadius: 4 }}>&lt;head&gt;</code>{t("pxl.snippetGuide2")} {t("pxl.snippetGuide3")}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Event Stream Tab (테스트 전송 + 실시간 표시) ── */
function EventStreamTab() {
  const t = usePxlT();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ pixel_id: "", event_name: "purchase", value: "50000" });
  const eventTypes = ["page_view", "view_content", "add_to_cart", "initiate_checkout", "purchase", "lead", "subscribe"];

  const sendTest = async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/pixel/collect", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pixel_id: form.pixel_id, event_name: form.event_name, value: parseFloat(form.value) || 0, session_id: "test_" + Date.now(), utm_source: "test", utm_medium: "manual_test" }),
      }).then(x => x.json());
      if (r.ok) setEvents(prev => [{ ...form, event_id: r.event_id, time: new Date().toLocaleTimeString() }, ...prev.slice(0, 49)]);
    } catch {}
    setLoading(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={CARD}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>🧪 {t("pxl.testEventSend")}</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <div><label style={{ fontSize: 12, color: C.muted }}>Pixel ID</label>
            <input style={INPUT} value={form.pixel_id} onChange={e => setForm({ ...form, pixel_id: e.target.value })} placeholder="px_..." /></div>
          <div><label style={{ fontSize: 12, color: C.muted }}>{t("pxl.eventType")}</label>
            <select style={INPUT} value={form.event_name} onChange={e => setForm({ ...form, event_name: e.target.value })}>{eventTypes.map(et => <option key={et} value={et}>{et}</option>)}</select></div>
          <div><label style={{ fontSize: 12, color: C.muted }}>{t("pxl.amount")}</label>
            <input style={INPUT} value={form.value} onChange={e => setForm({ ...form, value: e.target.value })} placeholder="50000" /></div>
        </div>
        <button onClick={sendTest} disabled={loading || !form.pixel_id} style={{ marginTop: 12, padding: "9px 24px", borderRadius: 10, border: "none", cursor: "pointer", background: C.green, color: "#fff", fontWeight: 700, opacity: (!form.pixel_id || loading) ? 0.5 : 1 }}>
          {loading ? t("pxl.sending") : `▶ ${t("pxl.sendEvent")}`}
        </button>
      </div>

      <div style={CARD}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>📡 {t("pxl.realtimeStream")}</div>
        {!events.length ? (
          <div style={{ color: C.muted, textAlign: "center", padding: 24 }}>{t("pxl.noEvents")}</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {events.map((ev, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: C.surface, borderRadius: 10, fontSize: 12 }}>
                <div>
                  <span style={{ background: C.accent + "30", color: C.accent, padding: "2px 10px", borderRadius: 999, fontWeight: 700, fontSize: 11 }}>{ev.event_name}</span>
                  <span style={{ marginLeft: 10, color: C.muted }}>{ev.time}</span>
                </div>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  {parseFloat(ev.value) > 0 && <span style={{ color: C.yellow }}>₩{parseFloat(ev.value).toLocaleString()}</span>}
                  <span style={{ color: C.green }}>✅ CAPI</span>
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

/* ── Main ── */
export default function PixelTracking() {
  const t = usePxlT();
  const { token } = useAuth();
  const API = makeAPI(token);
  const [tab, setTab] = useState("dashboard");

  const TABS = [
    { id: "dashboard", label: `📊 ${t("pxl.tabDashboard")}` },
    { id: "pixels", label: `🔧 ${t("pxl.tabSettings")}` },
    { id: "events", label: `📡 ${t("pxl.tabEvents")}` },
  ];

  return (
    <PlanGate feature="pixel_tracking">
      <div style={{ padding: "0 0 40px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <div style={{ fontSize: 28 }}>🎯</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 22, color: C.text }}>{t("pxl.heroTitle")}</div>
            <div style={{ fontSize: 13, color: C.muted }}>{t("pxl.heroDesc")}</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 4, marginTop: 16, marginBottom: 20 }}>
          {TABS.map(tb => (
            <button key={tb.id} onClick={() => setTab(tb.id)} style={{ padding: "8px 18px", borderRadius: 10, border: "none", cursor: "pointer", background: tab === tb.id ? C.accent : C.surface, color: tab === tb.id ? "#fff" : C.muted, fontWeight: 700, fontSize: 13 }}>{tb.label}</button>
          ))}
        </div>

        {tab === "dashboard" && <DashboardTab API={API} />}
        {tab === "pixels" && <PixelConfigTab API={API} />}
        {tab === "events" && <EventStreamTab />}
      </div>
    </PlanGate>
  );
}
