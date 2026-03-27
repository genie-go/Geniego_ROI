import React, { useState, useMemo, useCallback } from "react";
import { useT } from "../i18n";

/* ── Constants ─────────────────────────────────────────────────────────── */
const ACTION_COLORS = {
  ACTION_EXECUTED:     "#22c55e",
  ACTION_APPROVED:     "#4f8ef7",
  ACTION_REJECTED:     "#ef4444",
  ALERT_TRIGGERED:     "#f97316",
  POLICY_UPDATED:      "#a855f7",
  KEY_CREATED:         "#14d9b0",
  KEY_REVOKED:         "#ef4444",
  CONNECTOR_SYNCED:    "#4f8ef7",
  MAPPING_UPDATED:     "#eab308",
  SETTLEMENT_IMPORTED: "#14d9b0",
  REPORT_EXPORTED:     "#6366f1",
  USER_ROLE_CHANGED:   "#ec4899",
};
const ACTION_ICONS = {
  ACTION_EXECUTED:     "⚡",
  ACTION_APPROVED:     "✅",
  ACTION_REJECTED:     "❌",
  ALERT_TRIGGERED:     "🚨",
  POLICY_UPDATED:      "📝",
  KEY_CREATED:         "🔑",
  KEY_REVOKED:         "🗑",
  CONNECTOR_SYNCED:    "🔌",
  MAPPING_UPDATED:     "🧩",
  SETTLEMENT_IMPORTED: "💰",
  REPORT_EXPORTED:     "📤",
  USER_ROLE_CHANGED:   "👤",
};
const RISK_CFG = {
  high:   { label: "HIGH",   color: "#ef4444", bg: "rgba(239,68,68,0.1)" },
  medium: { label: "MED",    color: "#f97316", bg: "rgba(249,115,22,0.08)" },
  low:    { label: "LOW",    color: "#22c55e", bg: "rgba(34,197,94,0.08)" },
};

/* ── Mock Audit Logs ───────────────────────────────────────────────────── */
const MOCK_LOGS = [
  { id: 1,  at: "2026-03-04T15:23:11Z", actor: "operator",  role: "system",    action: "ACTION_EXECUTED",     entity_type: "action_request", entity_id: "3",       detail: "price_change SKU WH-1000XM5 ₩428,000 → ₩413,000", risk: "medium", ip: "10.0.1.12" },
  { id: 2,  at: "2026-03-04T14:55:03Z", actor: t('auto.00cu0o', '김지Count'),    role: "analyst",   action: "ACTION_APPROVED",     entity_type: "action_request", entity_id: "2",       detail: "budget_cut TikTok campaign Allowed",                   risk: "low",    ip: "192.168.1.44" },
  { id: 3,  at: "2026-03-04T13:30:45Z", actor: "system",    role: "system",    action: "ALERT_TRIGGERED",     entity_type: "alert_policy",   entity_id: "3",       detail: "CPC > ₩1,500 Threshold Exceeded Detected",                     risk: "high",   ip: "—" },
  { id: 4,  at: "2026-03-04T12:10:27Z", actor: t('auto.w0gft2', '박민준'),    role: "admin",     action: "POLICY_UPDATED",      entity_type: "alert_policy",   entity_id: "1",       detail: "ROAS Threshold 1.5 → 1.8 Change",                        risk: "medium", ip: "10.0.2.8" },
  { id: 5,  at: "2026-03-04T11:05:18Z", actor: "operator",  role: "system",    action: "ACTION_EXECUTED",     entity_type: "action_request", entity_id: "6",       detail: "budget_increase Coupang +20% Apply",                  risk: "medium", ip: "10.0.1.12" },
  { id: 6,  at: "2026-03-04T10:23:00Z", actor: "system",    role: "system",    action: "ALERT_TRIGGERED",     entity_type: "alert_policy",   entity_id: "3",       detail: t('auto.qdp6o6', 'CPC 이상 Detected → Action 요청 Create됨 #1'),                risk: "high",   ip: "—" },
  { id: 7,  at: "2026-03-03T22:47:00Z", actor: t('auto.8qn1sq', '김지Count'),    role: "analyst",   action: "ACTION_REJECTED",     entity_type: "action_request", entity_id: "4",       detail: t('auto.lt7xsw', 'Naver Ad 정지 요청 반려 — Count동 검토 필요'),          risk: "low",    ip: "192.168.1.44" },
  { id: 8,  at: "2026-03-03T20:00:00Z", actor: t('auto.qztzz6', 'Management자'),    role: "admin",     action: "KEY_CREATED",         entity_type: "api_key",        entity_id: "ana_001", detail: t('auto.ezp0y5', '신규 Analyst 키 Issue'),                               risk: "medium", ip: "10.0.0.1" },
  { id: 9,  at: "2026-03-03T18:00:00Z", actor: t('auto.7qd6h1', '이서연'),    role: "analyst",   action: "ACTION_APPROVED",     entity_type: "action_request", entity_id: "6",       detail: t('auto.x4g7s5', 'budget_increase 요청 Approval'),                          risk: "low",    ip: "172.16.0.5" },
  { id: 10, at: "2026-03-03T16:45:00Z", actor: "system",    role: "system",    action: "CONNECTOR_SYNCED",    entity_type: "connector",      entity_id: "amazon",  detail: "Amazon SP-API token refresh Done",                   risk: "low",    ip: "—" },
  { id: 11, at: "2026-03-03T15:30:00Z", actor: t('auto.e15f53', '박민준'),    role: "admin",     action: "MAPPING_UPDATED",     entity_type: "mapping_entry",  entity_id: "42",      detail: t('auto.7pd3kv', 'Platform 매핑 Update: gender_f → female'),            risk: "low",    ip: "10.0.2.8" },
  { id: 12, at: "2026-03-03T14:00:00Z", actor: "system",    role: "system",    action: "SETTLEMENT_IMPORTED", entity_type: "settlement",     entity_id: "4",       detail: t('auto.vrih8w', '11st 2월 정산 임포트 — ₩18.6M'),                     risk: "low",    ip: "—" },
  { id: 13, at: "2026-03-03T11:20:00Z", actor: t('auto.d64iy8', '박민준'),    role: "admin",     action: "KEY_REVOKED",         entity_type: "api_key",        entity_id: "old_003", detail: t('auto.las526', 'Expired API 키 Revoke — connector role'),                  risk: "high",   ip: "10.0.2.8" },
  { id: 14, at: "2026-03-03T09:05:00Z", actor: t('auto.y7c14d', '이서연'),    role: "analyst",   action: "REPORT_EXPORTED",     entity_type: "report",         entity_id: "pnl_feb", detail: t('auto.c3zuch', 'P&L 2월 Report CSV Export (₩2.4B 포함)'),           risk: "medium", ip: "172.16.0.5" },
  { id: 15, at: "2026-03-02T21:30:00Z", actor: "system",    role: "system",    action: "ALERT_TRIGGERED",     entity_type: "alert_policy",   entity_id: "7",       detail: t('auto.wyocgk', '반품률 14.2% > 12% Threshold Exceeded'),                     risk: "high",   ip: "—" },
  { id: 16, at: "2026-03-02T18:00:00Z", actor: t('auto.v9pyz4', 'Management자'),    role: "admin",     action: "USER_ROLE_CHANGED",   entity_type: "user",           entity_id: "usr_44",  detail: t('auto.zxy8yq', '이서연 Permission: viewer → analyst 승격'),                  risk: "high",   ip: "10.0.0.1" },
  { id: 17, at: "2026-03-02T15:45:00Z", actor: t('auto.qznx16', '김지Count'),    role: "analyst",   action: "CONNECTOR_SYNCED",    entity_type: "connector",      entity_id: "meta",    detail: t('auto.6qo8eq', 'Meta Ads OAuth 토큰 갱신 Done'),                      risk: "low",    ip: "192.168.1.44" },
  { id: 18, at: "2026-03-02T12:10:00Z", actor: "operator",  role: "system",    action: "ACTION_EXECUTED",     entity_type: "action_request", entity_id: "9",       detail: t('auto.k9hl43', 'pause_campaign Meta retargeting — ROAS 1.2x 이하'),  risk: "medium", ip: "10.0.1.12" },
  { id: 19, at: "2026-03-01T20:00:00Z", actor: "system",    role: "system",    action: "ALERT_TRIGGERED",     entity_type: "alert_policy",   entity_id: "2",       detail: "Google CTR 0.3% < 0.5% Threshold",                      risk: "medium", ip: "—" },
  { id: 20, at: "2026-03-01T08:30:00Z", actor: t('auto.mt2b72', 'Management자'),    role: "admin",     action: "POLICY_UPDATED",      entity_type: "alert_policy",   entity_id: "5",       detail: t('auto.4jfhay', 'Coupon율 Threshold 15% → 18% 완화'),                       risk: "medium", ip: "10.0.0.1" },
];

/* ── Helpers ────────────────────────────────────────────────────────────── */
function timeAgo(iso, t) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60)    return `${Math.floor(s)}${t("audit.secAgo") || t('auto.imx43v', '초 전')}`;
  if (s < 3600)  return `${Math.floor(s / 60)}${t("audit.minAgo") || t('auto.9cpaci', '분 전')}`;
  if (s < 86400) return `${Math.floor(s / 3600)}${t("audit.hrAgo") || t('auto.uq20z5', 'Time 전')}`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)}${t("audit.dayAgo") || t('auto.2hnb5b', '일 전')}`;
  return new Date(iso).toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
}

function fmtTs(iso) {
  return new Date(iso).toLocaleString("ko-KR", {
    month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  });
}

function exportCsv(logs) {
  const header = t('auto.4ndk1j', 'ID,시각,행위자,역할,Event,대상Type,대상ID,위험도,IP,내용');
  const rows = logs.map(l =>
    [l.id, l.at, l.actor, l.role, l.action, l.entity_type, l.entity_id, l.risk, l.ip, `"${l.detail}"`].join(",")
  );
  const blob = new Blob([header + "\n" + rows.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `audit_log_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ── Sub-Components ─────────────────────────────────────────────────────── */
function RiskBadge({ risk }) {
  const cfg = RISK_CFG[risk] || RISK_CFG.low;
  return (
    <span style={{
      padding: "1px 7px", borderRadius: 99, fontSize: 9, fontWeight: 800,
      background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}44`,
      letterSpacing: 0.5,
    }}>{cfg.label}</span>
  );
}

function ActionBadge({ action }) {
  const color = ACTION_COLORS[action] || "#4f8ef7";
  return (
    <span style={{
      padding: "2px 9px", borderRadius: 99, fontSize: 10, fontWeight: 700,
      background: `${color}18`, color, border: `1px solid ${color}33`,
      whiteSpace: "nowrap",
    }}>
      {ACTION_ICONS[action] || "•"} {action.replace(/_/g, " ")}
    </span>
  );
}

/* Timeline View */
function TimelineView({ logs, t }) {
  return (
    <div style={{ display: "grid", gap: 0, position: "relative", paddingLeft: 28 }}>
      {/* vertical line */}
      <div style={{
        position: "absolute", left: 9, top: 8, bottom: 8,
        width: 2, background: "rgba(99,140,255,0.12)", borderRadius: 2,
      }} />

      {logs.map((l, idx) => {
        const color = ACTION_COLORS[l.action] || "#4f8ef7";
        return (
          <div key={l.id} style={{ display: "flex", gap: 12, padding: "10px 0", borderBottom: idx < logs.length - 1 ? "1px solid rgba(99,140,255,0.05)" : "none", position: "relative" }}>
            {/* timeline dot */}
            <div style={{
              position: "absolute", left: -19, top: 14,
              width: 10, height: 10, borderRadius: "50%",
              background: color, border: "2px solid var(--surface-1, #070f1a)",
              boxShadow: `0 0 8px ${color}66`,
              flexShrink: 0,
            }} />

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 4 }}>
                <ActionBadge action={l.action} />
                <RiskBadge risk={l.risk} />
                <span style={{ fontSize: 10, color: "var(--text-3)", marginLeft: "auto", whiteSpace: "nowrap" }}>
                  {fmtTs(l.at)}
                </span>
              </div>
              <div style={{ fontSize: 12, color: "var(--text-1)", marginBottom: 3, lineHeight: 1.5 }}>{l.detail}</div>
              <div style={{ display: "flex", gap: 12, fontSize: 10, color: "var(--text-3)" }}>
                <span>👤 {l.actor}</span>
                <span>📁 {l.entity_type} #{l.entity_id}</span>
                {l.ip !== "—" && <span>🌐 {l.ip}</span>}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Main Component ─────────────────────────────────────────────────────── */
export default function Audit() {
  const t = useT();
  const [search, setSearch]           = useState("");
  const [filterAction, setFilterAction] = useState("all");
  const [filterActor, setFilterActor]   = useState("all");
  const [filterRisk, setFilterRisk]     = useState("all");
  const [viewMode, setViewMode]         = useState("table"); // table | timeline

  const actors      = useMemo(() => [...new Set(MOCK_LOGS.map(l => l.actor))], []);
  const actionTypes = useMemo(() => [...new Set(MOCK_LOGS.map(l => l.action))], []);

  const filtered = useMemo(() =>
    MOCK_LOGS.filter(l => {
      if (filterAction !== "all" && l.action !== filterAction) return false;
      if (filterActor  !== "all" && l.actor  !== filterActor)  return false;
      if (filterRisk   !== "all" && l.risk   !== filterRisk)   return false;
      if (search && !l.detail.toLowerCase().includes(search.toLowerCase()) &&
          !l.action.toLowerCase().includes(search.toLowerCase()) &&
          !l.actor.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    }), [filterAction, filterActor, filterRisk, search]);

  const highRisk   = MOCK_LOGS.filter(l => l.risk === "high").length;
  const todayCount = MOCK_LOGS.filter(l => l.at.startsWith("2026-03-04")).length;
  const adminActs  = MOCK_LOGS.filter(l => l.role === "admin").length;

  const actionFreq = useMemo(() => {
    const m = {};
    MOCK_LOGS.forEach(l => { m[l.action] = (m[l.action] || 0) + 1; });
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, []);

  const handleExport = useCallback(() => exportCsv(filtered), [filtered]);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {/* Hero */}
      <div className="hero fade-up">
        <div className="hero-meta">
          <div className="hero-icon" style={{ background: "linear-gradient(135deg,rgba(168,85,247,0.25),rgba(79,142,247,0.15))" }}>🧾</div>
          <div>
            <div className="hero-title" style={{ background: "linear-gradient(135deg,#a855f7,#4f8ef7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              {t("audit.pageTitle")}
            </div>
            <div className="hero-desc">
              {t("audit.pageDesc")}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
          <button
            className="btn-ghost"
            style={{ fontSize: 11, padding: "6px 14px", background: viewMode === "table" ? "rgba(79,142,247,0.15)" : "transparent", borderColor: viewMode === "table" ? "rgba(79,142,247,0.5)" : undefined }}
            onClick={() => setViewMode("table")}
          >
            {t("audit.tableView")}
          </button>
          <button
            className="btn-ghost"
            style={{ fontSize: 11, padding: "6px 14px", background: viewMode === "timeline" ? "rgba(168,85,247,0.15)" : "transparent", borderColor: viewMode === "timeline" ? "rgba(168,85,247,0.5)" : undefined }}
            onClick={() => setViewMode("timeline")}
          >
            {t("audit.timelineView")}
          </button>
          <button
            className="btn-primary"
            style={{ fontSize: 11, padding: "6px 14px", background: "linear-gradient(135deg,#22c55e,#14d9b0)", marginLeft: "auto" }}
            onClick={handleExport}
          >
            {t("audit.csvExport")} ({filtered.length}{t("audit.countUnit")})
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid4 fade-up fade-up-1">
        {[
          { l: t("audit.totalEvents"),   v: MOCK_LOGS.length,  s: t("audit.totalEventsDesc"),  c: "#4f8ef7" },
          { l: t("audit.todayEvents"),   v: todayCount,         s: "2026-03-04",                 c: "#14d9b0" },
          { l: t("audit.highRisk"),      v: highRisk,           s: t("audit.highRiskDesc"),      c: "#ef4444" },
          { l: t("audit.adminActions"),  v: adminActs,          s: t("audit.adminActionsDesc"),  c: "#a855f7" },
        ].map(({ l, v, s, c }, i) => (
          <div key={l} className="kpi-card card-hover fade-up" style={{ "--accent": c, animationDelay: `${i * 60}ms` }}>
            <div className="kpi-label">{l}</div>
            <div className="kpi-value" style={{ color: c }}>{v}</div>
            <div className="kpi-sub">{s}</div>
          </div>
        ))}
      </div>

      {/* Event Distribution + Risk Summary */}
      <div className="grid2 fade-up fade-up-2">
        {/* Event type distribution */}
        <div className="card card-glass">
          <div className="section-title" style={{ marginBottom: 14 }}>{t("audit.eventDistribution")}</div>
          {actionFreq.map(([action, cnt]) => {
            const color = ACTION_COLORS[action] || "#4f8ef7";
            return (
              <div key={action} style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 4 }}>
                  <span style={{ color: "var(--text-2)", display: "flex", alignItems: "center", gap: 5 }}>
                    <span>{ACTION_ICONS[action] || "•"}</span>
                    <span>{action.replace(/_/g, " ")}</span>
                  </span>
                  <span style={{ fontWeight: 700, color }}>{cnt}{t("audit.countUnit")}</span>
                </div>
                <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 4 }}>
                  <div style={{ width: `${(cnt / MOCK_LOGS.length) * 100}%`, height: "100%", background: color, borderRadius: 4, transition: "width 0.5s" }} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Risk summary + high risk list */}
        <div className="card card-glass">
          <div className="section-title" style={{ marginBottom: 14 }}>{t("audit.riskClassification")}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 16 }}>
            {["high", "medium", "low"].map(risk => {
              const cfg = RISK_CFG[risk];
              const cnt = MOCK_LOGS.filter(l => l.risk === risk).length;
              return (
                <div key={risk} onClick={() => setFilterRisk(filterRisk === risk ? "all" : risk)}
                  style={{
                    padding: "12px", borderRadius: 10, textAlign: "center", cursor: "pointer",
                    background: filterRisk === risk ? cfg.bg : "rgba(9,15,30,0.6)",
                    border: `1px solid ${filterRisk === risk ? cfg.color + "66" : "rgba(99,140,255,0.08)"}`,
                    transition: "all 150ms",
                  }}>
                  <div style={{ fontSize: 22, fontWeight: 900, color: cfg.color }}>{cnt}</div>
                  <div style={{ fontSize: 10, color: cfg.color, fontWeight: 700, marginTop: 2 }}>{cfg.label}</div>
                </div>
              );
            })}
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", marginBottom: 8 }}>{t("audit.highRiskEvents")}</div>
          <div style={{ display: "grid", gap: 6 }}>
            {MOCK_LOGS.filter(l => l.risk === "high").map(l => (
              <div key={l.id} style={{ padding: "8px 10px", background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.15)", borderRadius: 8 }}>
                <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 3 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: "#ef4444" }}>{ACTION_ICONS[l.action]} {l.action.replace(/_/g, " ")}</span>
                  <span style={{ fontSize: 9, color: "var(--text-3)", marginLeft: "auto" }}>{timeAgo(l.at, t)}</span>
                </div>
                <div style={{ fontSize: 11, color: "var(--text-2)", lineHeight: 1.4 }}>{l.detail}</div>
                <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 3 }}>by {l.actor}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Search/Filter bar */}
      <div className="card card-glass fade-up fade-up-3" style={{ padding: "12px 16px" }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <input
            className="input" style={{ flex: 1, minWidth: 180, padding: "7px 10px", fontSize: 11 }}
            placeholder={t("audit.searchPlaceholder")} value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <select className="input" style={{ width: 170, padding: "7px 10px", fontSize: 11 }}
            value={filterAction} onChange={e => setFilterAction(e.target.value)}>
            <option value="all">{t("audit.filterEventType")}</option>
            {actionTypes.map(a => <option key={a} value={a}>{ACTION_ICONS[a]} {a.replace(/_/g, " ")}</option>)}
          </select>
          <select className="input" style={{ width: 130, padding: "7px 10px", fontSize: 11 }}
            value={filterActor} onChange={e => setFilterActor(e.target.value)}>
            <option value="all">{t("audit.filterActor")}</option>
            {actors.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <select className="input" style={{ width: 110, padding: "7px 10px", fontSize: 11 }}
            value={filterRisk} onChange={e => setFilterRisk(e.target.value)}>
            <option value="all">{t("audit.filterRisk")}</option>
            <option value="high">🔴 HIGH</option>
            <option value="medium">🟡 MEDIUM</option>
            <option value="low">🟢 LOW</option>
          </select>
          <span style={{ fontSize: 11, color: "var(--text-3)", whiteSpace: "nowrap" }}>
            {filtered.length}/{MOCK_LOGS.length}{t("audit.countUnit")}
          </span>
          {(search || filterAction !== "all" || filterActor !== "all" || filterRisk !== "all") && (
            <button className="btn-ghost" style={{ fontSize: 10, padding: "6px 10px" }}
              onClick={() => { setSearch(""); setFilterAction("all"); setFilterActor("all"); setFilterRisk("all"); }}>
              {t("audit.filterReset")}
            </button>
          )}
        </div>
      </div>

      {/* Log view */}
      <div className="card card-glass fade-up fade-up-4">
        {viewMode === "table" ? (
          <>
            <div className="section-title" style={{ marginBottom: 14 }}>{t("audit.logTable")}</div>
            <div style={{ overflowX: "auto" }}>
              <table className="table" style={{ fontSize: 11 }}>
                <thead>
                  <tr>
                    <th>{t("audit.colId")}</th>
                    <th>{t("audit.colTime")}</th>
                    <th>{t("audit.colActor")}</th>
                    <th>{t("audit.colEvent")}</th>
                    <th>{t("audit.colRisk")}</th>
                    <th>{t("audit.colTarget")}</th>
                    <th>{t("audit.colIp")}</th>
                    <th>{t("audit.colDetail")}</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(l => (
                    <tr key={l.id}>
                      <td style={{ color: "var(--text-3)", fontFamily: "monospace" }}>#{l.id}</td>
                      <td style={{ color: "var(--text-3)", whiteSpace: "nowrap" }}>{fmtTs(l.at)}</td>
                      <td>
                        <div style={{ fontWeight: 600, color: l.actor === "system" || l.actor === "operator" ? "var(--text-3)" : "var(--text-1)" }}>
                          {l.actor}
                        </div>
                        <div style={{ fontSize: 9, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: 0.3 }}>{l.role}</div>
                      </td>
                      <td><ActionBadge action={l.action} /></td>
                      <td><RiskBadge risk={l.risk} /></td>
                      <td style={{ color: "var(--text-3)", fontSize: 10 }}>
                        {l.entity_type}<br />
                        <span style={{ fontFamily: "monospace", color: "#4f8ef7" }}>#{l.entity_id}</span>
                      </td>
                      <td style={{ fontFamily: "monospace", fontSize: 10, color: "var(--text-3)" }}>{l.ip}</td>
                      <td style={{ color: "var(--text-2)", maxWidth: 320 }}>{l.detail}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filtered.length === 0 && (
                <div style={{ textAlign: "center", padding: 32, color: "var(--text-3)", fontSize: 13 }}>
                  {t("audit.noResults")}
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="section-title" style={{ marginBottom: 18 }}>{t("audit.timelineHeader")}</div>
            <TimelineView logs={filtered} t={t} />
            {filtered.length === 0 && (
              <div style={{ textAlign: "center", padding: 32, color: "var(--text-3)", fontSize: 13 }}>
                {t("audit.noResults")}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
