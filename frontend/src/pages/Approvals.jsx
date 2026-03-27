import React, { useEffect, useState, useMemo } from "react";
import { useI18n } from "../i18n";
import { useAuth } from "../auth/AuthContext.jsx";

import { useT } from '../i18n/index.js';
const MOCK_REQUESTS = [
  { id: 1, status: "pending", action_type: "pause_campaign", policy_id: 3, alert_id: 12, created_at: "2026-03-04T10:23:00Z", decided_by: null, details: "CPC > ₩1,500 Criteria Exceeded — Meta campaign_id:449821 Paused Request" },
  { id: 2, status: "approved", action_type: "budget_cut", policy_id: 1, alert_id: 9, created_at: "2026-03-04T09:15:00Z", decided_by: t('auto.lw3lo2', '김지Count'), details: t('auto.hnr5k5', 'ROAS < 1.8 하락 — TikTok Budget 30% 삭감 Request') },
  { id: 3, status: "executed", action_type: "price_change", policy_id: 5, alert_id: 7, created_at: "2026-03-04T08:00:00Z", decided_by: t('auto.cabjow', '박민준'), details: t('auto.iizx3n', 'Stock 과잉(>500) — SKU WH-1000XM5 Price ₩15,000 인하 Run Done') },
  { id: 4, status: "rejected", action_type: "pause_campaign", policy_id: 2, alert_id: 11, created_at: "2026-03-03T22:47:00Z", decided_by: t('auto.4y1gu9', '김지Count'), details: t('auto.mqutcg', 'CPM 급등 감지 — Naver Ad Paused Request (운영Team 반려)') },
  { id: 5, status: "pending", action_type: "notify_slack", policy_id: 4, alert_id: 15, created_at: "2026-03-03T21:30:00Z", decided_by: null, details: t('auto.rdbgpu', '리뷰 평점 3.0 이하 감지 — #cs-alerts Slack Notification Request') },
  { id: 6, status: "executed", action_type: "budget_increase", policy_id: 1, alert_id: 4, created_at: "2026-03-03T18:00:00Z", decided_by: t('auto.yunwhs', '이서연'), details: t('auto.xzgx4u', 'ROAS > 4.5 달성 — Coupang Ad Budget 20% 증액 Run Done') },
];

const STATUS_CONFIG = {
  pending: { tKey: "approvals.statusPending", badge: "badge-yellow", dot: "dot-yellow", color: "#eab308" },
  approved: { tKey: "approvals.statusApproved", badge: "badge-blue", dot: "dot-blue", color: "#4f8ef7" },
  executed: { tKey: "approvals.statusExecuted", badge: "badge-green", dot: "dot-green", color: "#22c55e" },
  rejected: { tKey: "approvals.statusRejected", badge: "badge-red", dot: "dot-red", color: "#ef4444" },
};

const ACTION_ICONS = {
  pause_campaign: "⏸",
  budget_cut: "📉",
  price_change: "💡",
  notify_slack: "🔔",
  budget_increase: "📈",
};

function timeAgo(iso, t) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return `${Math.floor(s)}${t("audit.secAgo")}`;
  if (s < 3600) return `${Math.floor(s / 60)}${t("audit.minAgo")}`;
  if (s < 86400) return `${Math.floor(s / 3600)}${t("audit.hrAgo")}`;
  return `${Math.floor(s / 86400)}${t("audit.dayAgo")}`;
}

export default function Approvals() {
  const { t } = useI18n();
  const { isDemo } = useAuth();
  const [rows, setRows] = useState(MOCK_REQUESTS);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const filtered = useMemo(() =>
    filterStatus === "all" ? rows : rows.filter(r => r.status === filterStatus)
    , [rows, filterStatus]);

  const counts = useMemo(() => {
    const c = { pending: 0, approved: 0, executed: 0, rejected: 0 };
    rows.forEach(r => { if (c[r.status] !== undefined) c[r.status]++; });
    return c;
  }, [rows]);

  async function decide(id, decision) {
    // ── Demo Guard ──────────────────────────────────────
    if (isDemo) {
      setMsg(t('approvals.demoGuardDecide'));
      return;
    }
    setBusy(true); setMsg("");
    try {
      const r = await fetch(`/v410/action_requests/${id}/decide`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer genie_live_demo_key_00000000" },
        body: JSON.stringify({ decision, decided_by: "operator" }),
      });
      if (r.ok) {
        setRows(prev => prev.map(row => row.id === id ? { ...row, status: decision === "approve" ? "approved" : "rejected", decided_by: "operator" } : row));
        setMsg(`✓ ID #${id} ${decision === "approve" ? t('approvals.statusApproved') : t('approvals.statusRejected')}`);
      }
    } catch {
      // demo mode: update locally
      setRows(prev => prev.map(row => row.id === id ? { ...row, status: decision === "approve" ? "approved" : "rejected", decided_by: "operator" } : row));
      setMsg(`✓ ID #${id} ${decision === "approve" ? t('approvals.statusApproved') : t('approvals.statusRejected')} (demo)`);
    }
    setBusy(false);
  }

  async function execute(id) {
    // ── Demo Guard ──────────────────────────────────────
    if (isDemo) {
      setMsg(t('approvals.demoGuardExecute'));
      return;
    }
    setBusy(true); setMsg("");
    try {
      await fetch(`/v410/action_requests/${id}/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer genie_live_demo_key_00000000" },
        body: JSON.stringify({}),
      });
    } catch { }
    setRows(prev => prev.map(row => row.id === id ? { ...row, status: "executed" } : row));
    setMsg(`✓ ID #${id} ${t('approvals.executeDone')}`);
    setBusy(false);
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {/* Hero */}
      <div className="hero fade-up">
        <div className="hero-meta">
          <div className="hero-icon" style={{ background: "linear-gradient(135deg,rgba(34,197,94,0.25),rgba(79,142,247,0.15))" }}>✅</div>
          <div>
            <div className="hero-title" style={{ background: "linear-gradient(135deg,#22c55e,#4f8ef7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              {t("approvals.pageTitle") || "Action Center"}
            </div>
            <div className="hero-desc">{t("approvals.pageSub") || "Policy → Approval → Execution → Audit"}</div>
          </div>
        </div>
      </div>

      {/* Status KPIs */}
      <div className="grid4 fade-up fade-up-1">
        {[
          { l: t('approvals.statusPending'), v: counts.pending, c: "#eab308", icon: "⏳" },
          { l: t('approvals.statusApproved'), v: counts.approved, c: "#4f8ef7", icon: "✓" },
          { l: t('approvals.statusExecuted'), v: counts.executed, c: "#22c55e", icon: "⚡" },
          { l: t('approvals.statusRejected'), v: counts.rejected, c: "#ef4444", icon: "✕" },
        ].map(({ l, v, c, icon }, i) => (
          <div key={l} className="kpi-card card-hover fade-up" style={{ "--accent": c, animationDelay: `${i * 60}ms` }}>
            <div className="kpi-label">{icon} {l}</div>
            <div className="kpi-value" style={{ color: c }}>{v}</div>
          </div>
        ))}
      </div>

      {/* Filter + List */}
      <div className="card card-glass fade-up fade-up-2">
        <div className="section-header">
          <div className="section-title">📋 {t('approvals.requestList')}</div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {msg && <span style={{ fontSize: 11, color: "#22c55e" }}>{msg}</span>}
            <div className="tabs">
              {["all", "pending", "approved", "executed", "rejected"].map(s => (
                <button key={s} className={`tab ${filterStatus === s ? "active" : ""}`}
                  onClick={() => setFilterStatus(s)}>
                  {s === "all" ? t('approvals.filterAll') : t(`approvals.status${s.charAt(0).toUpperCase() + s.slice(1)}`)}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gap: 10 }}>
          {filtered.map(r => {
            const sc = STATUS_CONFIG[r.status];
            return (
              <div key={r.id} style={{
                padding: "14px 16px",
                background: r.status === "pending" ? "rgba(234,179,8,0.04)" : r.status === "executed" ? "rgba(34,197,94,0.03)" : "rgba(9,15,30,0.5)",
                borderRadius: 10,
                border: `1px solid ${r.status === "pending" ? "rgba(234,179,8,0.2)" : r.status === "rejected" ? "rgba(239,68,68,0.15)" : "rgba(99,140,255,0.08)"}`,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={{ fontSize: 18 }}>{ACTION_ICONS[r.action_type] || "⚙"}</span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13, color: "var(--text-1)" }}>
                        {r.action_type.replace(/_/g, " ").toUpperCase()}
                      </div>
                      <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 2 }}>
                        Policy #{r.policy_id} · Alert #{r.alert_id} · {timeAgo(r.created_at, t)}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    {r.decided_by && <span style={{ fontSize: 11, color: "var(--text-3)" }}>by {r.decided_by}</span>}
                    <span className={`badge ${sc.badge}`} style={{ fontSize: 10 }}>
                      <span className={`dot ${sc.dot}`} />{t(sc.tKey)}
                    </span>
                  </div>
                </div>

                <div style={{ fontSize: 12, color: "var(--text-2)", lineHeight: 1.6, marginBottom: 10 }}>{r.details}</div>

                {r.status === "pending" && (
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="btn-primary" style={{ fontSize: 11, padding: "5px 14px" }}
                      onClick={() => decide(r.id, "approve")} disabled={busy}>
                      ✓ {t('approvals.btnApprove')}
                    </button>
                    <button className="btn-ghost" style={{ fontSize: 11, padding: "5px 14px", borderColor: "rgba(239,68,68,0.3)", color: "#ef4444" }}
                      onClick={() => decide(r.id, "reject")} disabled={busy}>
                      ✕ {t('approvals.btnReject')}
                    </button>
                  </div>
                )}
                {r.status === "approved" && (
                  <button className="btn-primary" style={{ fontSize: 11, padding: "5px 14px", background: "linear-gradient(135deg,#22c55e,#14d9b0)" }}
                    onClick={() => execute(r.id)} disabled={busy}>
                    ⚡ {t('approvals.btnExecute')}
                  </button>
                )}
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div style={{ textAlign: "center", padding: 32, color: "var(--text-3)", fontSize: 13 }}>
              {t('approvals.noRequests')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
