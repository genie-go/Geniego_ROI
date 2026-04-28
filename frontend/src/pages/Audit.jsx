import React, { useState, useMemo, useCallback, useEffect } from "react";
import { useT } from "../i18n";
import useSecurityMonitor from "../hooks/useSecurityMonitor.js";

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
  LOGIN_SUCCESS:       "#22c55e",
  LOGIN_FAILED:        "#ef4444",
  PERMISSION_DENIED:   "#ef4444",
  DATA_EXPORTED:       "#6366f1",
  SETTINGS_CHANGED:    "#a855f7",
};
const ACTION_ICONS = {
  ACTION_EXECUTED:     "\u26a1",
  ACTION_APPROVED:     "\u2705",
  ACTION_REJECTED:     "\u274c",
  ALERT_TRIGGERED:     "\ud83d\udea8",
  POLICY_UPDATED:      "\ud83d\udcdd",
  KEY_CREATED:         "\ud83d\udd11",
  KEY_REVOKED:         "\ud83d\uddd1",
  CONNECTOR_SYNCED:    "\ud83d\udd0c",
  MAPPING_UPDATED:     "\ud83e\udde9",
  SETTLEMENT_IMPORTED: "\ud83d\udcb0",
  REPORT_EXPORTED:     "\ud83d\udce4",
  USER_ROLE_CHANGED:   "\ud83d\udc64",
  LOGIN_SUCCESS:       "\ud83d\udd13",
  LOGIN_FAILED:        "\ud83d\udeab",
  PERMISSION_DENIED:   "\ud83d\udee1\ufe0f",
  DATA_EXPORTED:       "\ud83d\udce5",
  SETTINGS_CHANGED:    "\u2699\ufe0f",
};
const RISK_CFG = {
  high:   { color: "#ef4444", bg: "rgba(239,68,68,0.1)" },
  medium: { color: "#f97316", bg: "rgba(249,115,22,0.08)" },
  low:    { color: "#22c55e", bg: "rgba(34,197,94,0.08)" },
};

/* ── Helpers ────────────────────────────────────────────────────────────── */
function timeAgo(iso, t) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60)    return `${Math.floor(s)}${t("audit.secAgo")}`;
  if (s < 3600)  return `${Math.floor(s / 60)}${t("audit.minAgo")}`;
  if (s < 86400) return `${Math.floor(s / 3600)}${t("audit.hrAgo")}`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)}${t("audit.dayAgo")}`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function fmtTs(iso) {
  return new Date(iso).toLocaleString(undefined, {
    month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  });
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

/* exportCsv — t passed as parameter to fix scope bug */
function exportCsv(logs, t) {
  const header = [
    t("audit.colId"), t("audit.colTime"), t("audit.colActor"), t("audit.csvRole"),
    t("audit.colEvent"), t("audit.csvEntityType"), t("audit.csvEntityId"),
    t("audit.colRisk"), t("audit.colIp"), t("audit.colDetail"),
  ].join(",");
  const rows = logs.map(l =>
    [l.id, l.at, l.actor, l.role, l.action, l.entity_type, l.entity_id, l.risk, l.ip, `"${(l.detail || "").replace(/"/g, '""')}"`].join(",")
  );
  const bom = "\uFEFF";
  const blob = new Blob([bom + header + "\n" + rows.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `audit_log_${todayStr()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ── Sub-Components ─────────────────────────────────────────────────────── */
function RiskBadge({ risk, t }) {
  const cfg = RISK_CFG[risk] || RISK_CFG.low;
  const label = t(`audit.risk${risk.charAt(0).toUpperCase() + risk.slice(1)}`) || risk.toUpperCase();
  return (
    <span style={{
      padding: "1px 7px", borderRadius: 99, fontSize: 9, fontWeight: 800,
      background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}44`,
      letterSpacing: 0.5 }}>{label}</span>
  );
}

function ActionBadge({ action, t }) {
  const color = ACTION_COLORS[action] || "#4f8ef7";
  const label = t(`audit.action_${action}`) || action.replace(/_/g, " ");
  return (
    <span style={{
      padding: "2px 9px", borderRadius: 99, fontSize: 10, fontWeight: 700,
      background: `${color}18`, color, border: `1px solid ${color}33`,
      whiteSpace: "nowrap" }}>
      {ACTION_ICONS[action] || "\u2022"} {label}
    </span>
  );
}

/* Security Alert Banner */
function SecurityBanner({ alerts, t }) {
  if (!alerts || alerts.length === 0) return null;
  return (
    <div style={{ padding: "14px 18px", borderRadius: 12, marginBottom: 4, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)", animation: "fadeUp 0.3s ease" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
        <span style={{ fontSize: 20 }}>{"\ud83d\udea8"}</span>
        <div>
          <div style={{ fontWeight: 800, fontSize: 14, color: "#ef4444" }}>{t("audit.securityAlertTitle")}</div>
          <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{t("audit.securityAlertDesc")}</div>
        </div>
        <span style={{ marginLeft: "auto", padding: "3px 10px", borderRadius: 99, background: "rgba(239,68,68,0.2)", color: "#ef4444", fontSize: 11, fontWeight: 800 }}>{alerts.length} {t("audit.countUnit")}</span>
      </div>
      <div style={{ display: "grid", gap: 6 }}>
        {alerts.slice(0, 3).map((a, i) => (
          <div key={i} style={{ padding: "8px 12px", borderRadius: 8, background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.12)", display: "flex", alignItems: "center", gap: 10, fontSize: 11 }}>
            <span style={{ color: "#ef4444", fontWeight: 800 }}>{ACTION_ICONS[a.action] || "\u26a0\ufe0f"}</span>
            <span style={{ flex: 1, color: "var(--text-2)" }}>{a.detail}</span>
            <span style={{ color: "var(--text-3)", fontSize: 10, whiteSpace: "nowrap" }}>{timeAgo(a.at, t)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* Timeline View */
function TimelineView({ logs, t }) {
  if (logs.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: 40, color: "var(--text-3)", fontSize: 13 }}>
        {t("audit.noResults")}
    </div>
);
  }
  return (
    <div style={{ display: "grid", gap: 0, position: "relative", paddingLeft: 28 }}>
      <div style={{ position: "absolute", left: 9, top: 8, bottom: 8, width: 2, background: "rgba(99,140,255,0.12)", borderRadius: 2 }} />
      {logs.map((l, idx) => {
        const color = ACTION_COLORS[l.action] || "#4f8ef7";
        return (
          <div key={l.id || idx} style={{ display: "flex", gap: 12, padding: "10px 0", borderBottom: idx < logs.length - 1 ? "1px solid rgba(99,140,255,0.05)" : "none", position: "relative" }}>
            <div style={{
              position: "absolute", left: -19, top: 14,
              width: 10, height: 10, borderRadius: "50%",
              background: color, border: "2px solid var(--surface-1, #070f1a)",
              boxShadow: `0 0 8px ${color}66`, flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 4 }}>
                <ActionBadge action={l.action} t={t} />
                <RiskBadge risk={l.risk} t={t} />
                <span style={{ fontSize: 10, color: "var(--text-3)", marginLeft: "auto", whiteSpace: "nowrap" }}>
                  {fmtTs(l.at)}
                </span>
              </div>
              <div style={{ fontSize: 12, color: '#fff', marginBottom: 3, lineHeight: 1.5 }}>{l.detail}</div>
              <div style={{ display: "flex", gap: 12, fontSize: 10, color: "var(--text-3)" }}>
                <span>{"\ud83d\udc64"} {l.actor}</span>
                <span>{"\ud83d\udcc1"} {l.entity_type} #{l.entity_id}</span>
                {l.ip !== "\u2014" && <span>{"\ud83c\udf10"} {l.ip}</span>}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function UsageGuide({ t }) {
  const [open, setOpen] = useState(false);
  const steps = [1, 2, 3, 4, 5, 6];
  const colors = ["#a855f7", "#a855f7", "#4f8ef7", "#4f8ef7", "#22c55e", "#22c55e"];
  return (
    <div style={{ marginTop: 8 }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{ display: "flex", alignItems: "center", gap: 8, margin: "0 auto 16px", padding: "10px 24px", borderRadius: 12, border: "1px solid rgba(168,85,247,0.3)", background: "rgba(168,85,247,0.06)", color: "#a855f7", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
      >
        {open ? `\ud83d\udcd6 ${t("audit.guideTitle")} \u25b2` : `\ud83d\udcd6 ${t("audit.guideTitle")} \u25bc`}
      </button>
      {open && (
        <div style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(168,85,247,0.15)", borderRadius: 16, padding: 24, animation: "fadeUp 0.3s ease" }}>
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>{"\ud83e\uddd0"}</div>
            <h2 style={{ fontSize: 20, fontWeight: 900, margin: "0 0 6px", color: '#fff' }}>{t("audit.guideTitle")}</h2>
            <p style={{ color: 'var(--text-3)', fontSize: 12 }}>{t("audit.guideSub")}</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
            {steps.map(i => (
              <div key={i} style={{ padding: 14, borderRadius: 12, background: "rgba(168,85,247,0.03)", border: "1px solid rgba(168,85,247,0.08)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <span style={{ width: 24, height: 24, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 900, background: "linear-gradient(135deg,#a855f7,#4f8ef7)", color: '#fff' }}>{i}</span>
                  <span style={{ fontWeight: 800, fontSize: 12, color: colors[i - 1] }}>{t(`audit.guideStep${i}Title`)}</span>
                </div>
                <p style={{ fontSize: 11, color: 'var(--text-3)', lineHeight: 1.6, margin: 0 }}>{t(`audit.guideStep${i}Desc`)}</p>
              </div>
            ))}
          </div>
          <div style={{ padding: "14px 16px", borderRadius: 10, background: "rgba(79,142,247,0.05)", border: "1px solid rgba(79,142,247,0.15)" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#4f8ef7", marginBottom: 6 }}>{"\ud83d\udca1"} {t("audit.guideTipTitle")}</div>
            <p style={{ fontSize: 11, color: 'var(--text-3)', lineHeight: 1.6, margin: 0 }}>{t("audit.guideTipDesc")}</p>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Main Component ─────────────────────────────────────────────────────── */
export default function Audit() {
  const t = useT();
  const { locked } = useSecurityMonitor("audit");
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]           = useState("");
  const [filterAction, setFilterAction] = useState("all");
  const [filterActor, setFilterActor]   = useState("all");
  const [filterRisk, setFilterRisk]     = useState("all");
  const [dateFrom, setDateFrom]         = useState("");
  const [dateTo, setDateTo]             = useState("");
  const [viewMode, setViewMode]         = useState("table");

  /* Fetch audit logs from API */
  useEffect(() => {
    setLoading(true);
    fetch("/api/auth/audit-logs", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
        "Content-Type": "application/json",
      },
    })
      .then(r => r.json())
      .then(d => { if (d.ok) setLogs(d.logs || d.items || []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const actors      = useMemo(() => [...new Set(logs.map(l => l.actor))].filter(Boolean), [logs]);
  const actionTypes = useMemo(() => [...new Set(logs.map(l => l.action))].filter(Boolean), [logs]);

  const today = todayStr();

  const filtered = useMemo(() =>
    logs.filter(l => {
      if (filterAction !== "all" && l.action !== filterAction) return false;
      if (filterActor  !== "all" && l.actor  !== filterActor)  return false;
      if (filterRisk   !== "all" && l.risk   !== filterRisk)   return false;
      if (dateFrom && l.at < dateFrom) return false;
      if (dateTo && l.at > dateTo + "T23:59:59") return false;
      if (search) {
        const q = search.toLowerCase();
        if (!((l.detail || "").toLowerCase().includes(q) ||
              (l.action || "").toLowerCase().includes(q) ||
              (l.actor || "").toLowerCase().includes(q) ||
              (l.ip || "").includes(q))) return false;
      }
      return true;
    }), [logs, filterAction, filterActor, filterRisk, dateFrom, dateTo, search]);

  const highRisk   = logs.filter(l => l.risk === "high").length;
  const todayCount = logs.filter(l => (l.at || "").startsWith(today)).length;
  const adminActs  = logs.filter(l => l.role === "admin").length;

  /* Security alerts — high risk events from last 24h */
  const securityAlerts = useMemo(() =>
    logs.filter(l => l.risk === "high" && (Date.now() - new Date(l.at).getTime()) < 86400000)
  , [logs]);

  const actionFreq = useMemo(() => {
    const m = {};
    logs.forEach(l => { m[l.action] = (m[l.action] || 0) + 1; });
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, [logs]);

  const handleExport = useCallback(() => exportCsv(filtered, t), [filtered, t]);

  const resetFilters = () => {
    setSearch(""); setFilterAction("all"); setFilterActor("all"); setFilterRisk("all"); setDateFrom(""); setDateTo("");
  };
  const hasFilters = search || filterAction !== "all" || filterActor !== "all" || filterRisk !== "all" || dateFrom || dateTo;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', margin: '-14px -16px -20px', height: 'calc(100vh - 52px)', overflow: 'hidden' }}>
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '16px', paddingBottom: 80 }}>
    <div style={{ display: "grid", gap: 16 }}>
      {/* Security Alert Banner */}
      <SecurityBanner alerts={securityAlerts} t={t} />

      {/* Hero */}
      <div className="hero fade-up">
        <div className="hero-meta">
          <div className="hero-icon" style={{ background: "linear-gradient(135deg,rgba(168,85,247,0.25),rgba(79,142,247,0.15))" }}>{"\ud83e\uddf0"}</div>
          <div>
            <div className="hero-title" style={{ background: "linear-gradient(135deg,#a855f7,#4f8ef7)" }}>
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
            {"\ud83d\udccb"} {t("audit.tableView")}
          </button>
          <button
            className="btn-ghost"
            style={{ fontSize: 11, padding: "6px 14px", background: viewMode === "timeline" ? "rgba(168,85,247,0.15)" : "transparent", borderColor: viewMode === "timeline" ? "rgba(168,85,247,0.5)" : undefined }}
            onClick={() => setViewMode("timeline")}
          >
            {"\ud83d\udd70"} {t("audit.timelineView")}
          </button>
          <button
            className="btn-primary"
            style={{ fontSize: 11, padding: "6px 14px", background: "linear-gradient(135deg,#22c55e,#14d9b0)", marginLeft: "auto" }}
            onClick={handleExport}
          >
            {"\ud83d\udce5"} {t("audit.csvExport")} ({filtered.length}{t("audit.countUnit")})
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid4 fade-up fade-up-1">
        {[
          { l: t("audit.totalEvents"),   v: logs.length,   s: t("audit.totalEventsDesc"),  c: "#4f8ef7" },
          { l: t("audit.todayEvents"),   v: todayCount,    s: today,                       c: "#14d9b0" },
          { l: t("audit.highRisk"),      v: highRisk,      s: t("audit.highRiskDesc"),      c: "#ef4444" },
          { l: t("audit.adminActions"),  v: adminActs,     s: t("audit.adminActionsDesc"),  c: "#a855f7" },
        ].map(({ l, v, s, c }, i) => (
          <div key={l} className="kpi-card card-hover fade-up" style={{ "--accent": c, animationDelay: `${i * 60}ms` }}>
            <div className="kpi-label">{l}</div>
            <div className="kpi-value" style={{ color: c }}>{loading ? "\u2014" : v}</div>
            <div className="kpi-sub">{s}</div>
          </div>
        ))}
      </div>

      {/* Event Distribution + Risk Summary */}
      <div className="grid2 fade-up fade-up-2">
        <div className="card card-glass">
          <div className="section-title" style={{ marginBottom: 14 }}>{t("audit.eventDistribution")}</div>
          {actionFreq.length === 0 && !loading && (
            <div style={{ textAlign: "center", padding: 24, color: "var(--text-3)", fontSize: 12 }}>{t("audit.noData", "데이터가 없습니다")}</div>
          )}
          {actionFreq.map(([action, cnt]) => {
            const color = ACTION_COLORS[action] || "#4f8ef7";
            return (
              <div key={action} style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 4 }}>
                  <span style={{ color: "var(--text-2)", display: "flex", alignItems: "center", gap: 5 }}>
                    <span>{ACTION_ICONS[action] || "\u2022"}</span>
                    <span>{t(`audit.action_${action}`) || action.replace(/_/g, " ")}</span>
                  </span>
                  <span style={{ fontWeight: 700, color }}>{cnt}{t("audit.countUnit")}</span>
                </div>
                <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 4 }}>
                  <div style={{ width: `${(cnt / (logs.length || 1)) * 100}%`, height: "100%", background: color, borderRadius: 4, transition: "width 0.5s" }} />
                </div>
              </div>
            );
          })}
        </div>

        <div className="card card-glass">
          <div className="section-title" style={{ marginBottom: 14 }}>{t("audit.riskClassification")}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 16 }}>
            {["high", "medium", "low"].map(risk => {
              const cfg = RISK_CFG[risk];
              const cnt = logs.filter(l => l.risk === risk).length;
              const label = t(`audit.risk${risk.charAt(0).toUpperCase() + risk.slice(1)}`);
              return (
                <div key={risk} onClick={() => setFilterRisk(filterRisk === risk ? "all" : risk)}
                  style={{
                    padding: "12px", borderRadius: 10, textAlign: "center", cursor: "pointer",
                    background: filterRisk === risk ? cfg.bg : "rgba(9,15,30,0.6)",
                    border: `1px solid ${filterRisk === risk ? cfg.color + "66" : "rgba(99,140,255,0.08)"}`,
                    transition: "all 150ms" }}>
                  <div style={{ fontSize: 22, fontWeight: 900, color: cfg.color }}>{cnt}</div>
                  <div style={{ fontSize: 10, color: cfg.color, fontWeight: 700, marginTop: 2 }}>{label}</div>
              
                </div>
              );
            })}
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", marginBottom: 8 }}>{t("audit.highRiskEvents")}</div>
          <div style={{ display: "grid", gap: 6 }}>
            {logs.filter(l => l.risk === "high").length === 0 && (
              <div style={{ textAlign: "center", padding: 16, color: "var(--text-3)", fontSize: 11 }}>{t("audit.noHighRisk")}</div>
            )}
            {logs.filter(l => l.risk === "high").slice(0, 5).map((l, i) => (
              <div key={l.id || i} style={{ padding: "8px 10px", background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.15)", borderRadius: 8 }}>
                <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 3 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: "#ef4444" }}>{ACTION_ICONS[l.action]} {t(`audit.action_${l.action}`) || l.action.replace(/_/g, " ")}</span>
                  <span style={{ fontSize: 9, color: "var(--text-3)", marginLeft: "auto" }}>{timeAgo(l.at, t)}</span>
                </div>
                <div style={{ fontSize: 11, color: "var(--text-2)", lineHeight: 1.4 }}>{l.detail}</div>
                <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 3 }}>{t("audit.byActor")} {l.actor}</div>
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
            {actionTypes.map(a => <option key={a} value={a}>{ACTION_ICONS[a]} {t(`audit.action_${a}`) || a.replace(/_/g, " ")}</option>)}
          </select>
          <select className="input" style={{ width: 130, padding: "7px 10px", fontSize: 11 }}
            value={filterActor} onChange={e => setFilterActor(e.target.value)}>
            <option value="all">{t("audit.filterActor")}</option>
            {actors.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <select className="input" style={{ width: 110, padding: "7px 10px", fontSize: 11 }}
            value={filterRisk} onChange={e => setFilterRisk(e.target.value)}>
            <option value="all">{t("audit.filterRisk")}</option>
            <option value="high">{"\ud83d\udd34"} {t("audit.riskHigh")}</option>
            <option value="medium">{"\ud83d\udfe1"} {t("audit.riskMedium")}</option>
            <option value="low">{"\ud83d\udfe2"} {t("audit.riskLow")}</option>
          </select>
          <input type="date" className="input" style={{ width: 130, padding: "7px 10px", fontSize: 11 }}
            value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            title={t("audit.dateFrom")}
          />
          <span style={{ fontSize: 10, color: "var(--text-3)" }}>~</span>
          <input type="date" className="input" style={{ width: 130, padding: "7px 10px", fontSize: 11 }}
            value={dateTo} onChange={e => setDateTo(e.target.value)}
            title={t("audit.dateTo")}
          />
          <span style={{ fontSize: 11, color: "var(--text-3)", whiteSpace: "nowrap" }}>
            {filtered.length}/{logs.length}{t("audit.countUnit")}
          </span>
          {hasFilters && (
            <button className="btn-ghost" style={{ fontSize: 10, padding: "6px 10px" }}
              onClick={resetFilters}>
              {t("audit.filterReset")}
            </button>
          )}
        </div>
      </div>

      {/* Log view */}
      <div className="card card-glass fade-up fade-up-4">
        {loading ? (
          <div style={{ textAlign: "center", padding: 48, color: "var(--text-3)", fontSize: 13 }}>
            <div style={{ fontSize: 32, marginBottom: 12, animation: "glow 1.5s ease infinite" }}>{"\u23f3"}</div>
            {t("audit.loading")}
          </div>
        ) : viewMode === "table" ? (
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
                  {filtered.map((l, idx) => (
                    <tr key={l.id || idx}>
                      <td style={{ color: "var(--text-3)", fontFamily: "monospace" }}>#{l.id}</td>
                      <td style={{ color: "var(--text-3)", whiteSpace: "nowrap" }}>{fmtTs(l.at)}</td>
                      <td>
                        <div style={{ fontWeight: 600, color: l.actor === "system" || l.actor === "operator" ? "var(--text-3)" : "var(--text-1)" }}>
                          {l.actor}
                        </div>
                        <div style={{ fontSize: 9, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: 0.3 }}>{l.role}</div>
                      </td>
                      <td><ActionBadge action={l.action} t={t} /></td>
                      <td><RiskBadge risk={l.risk} t={t} /></td>
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
            </div>
              {filtered.length === 0 && (
                <div style={{ textAlign: "center", padding: 32, color: "var(--text-3)", fontSize: 13 }}>
                  {t("audit.noResults")}
                </div>
              )}
          </>
        ) : (
          <>
            <div className="section-title" style={{ marginBottom: 18 }}>{t("audit.timelineHeader")}</div>
            <TimelineView logs={filtered} t={t} />
          </>
        )}
      </div>

      {/* Usage Guide */}
      <UsageGuide t={t} />
    </div>
    </div>
    </div>
  );
}
