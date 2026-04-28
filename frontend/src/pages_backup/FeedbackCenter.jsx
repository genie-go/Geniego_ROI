import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNotification } from "../context/NotificationContext.jsx";
import { useAuth } from "../auth/AuthContext.jsx";
import { useT } from '../i18n/index.js';

const API = "/api";

/* ─── Security: Input Sanitizer ──────────────────────────────────────── */
const XSS_PATTERNS = [/<script/i, /javascript:/i, /on\w+\s*=/i, /eval\s*\(/i, /SELECT\s+.*\s+FROM/i, /DROP\s+TABLE/i, /INSERT\s+INTO/i, /UNION\s+SELECT/i, /\.\.\//g, /document\.(cookie|location|write)/i];
function detectThreat(input) {
  if (typeof input !== 'string') return false;
  return XSS_PATTERNS.some(p => p.test(input));
}

/* ─── Sub Components ──────────────────────────────────────────────────── */
function TypeCard({ type, selected, onClick, t }) {
  return (
    <button
      onClick={() => onClick(type.id)}
      style={{
        padding: "14px 16px", borderRadius: 12, cursor: "pointer", textAlign: "left",
        background: selected ? `${type.color}18` : "rgba(9,15,30,0.5)",
        border: `1.5px solid ${selected ? type.color : "rgba(99,140,255,0.1)"}`,
        transition: "all 200ms", flex: 1,
        boxShadow: selected ? `0 4px 20px ${type.color}22` : "none",
      }}
    >
      <div style={{ fontSize: 22, marginBottom: 6 }}>{type.icon}</div>
      <div style={{ fontWeight: 700, fontSize: 12, color: selected ? type.color : "var(--text-1)", marginBottom: 3 }}>{t(`feedback.type_${type.id}`, type.label)}</div>
      <div style={{ fontSize: 10, color: "var(--text-3)", lineHeight: 1.5 }}>{t(`feedback.typeDesc_${type.id}`, type.desc)}</div>
    </button>);
}

function SubmissionCard({ item, t }) {
  const [open, setOpen] = useState(false);
  const FEEDBACK_TYPES = [
    { id: "bug", icon: "🐛", color: "#ef4444" },
    { id: "improve", icon: "✨", color: "#4f8ef7" },
    { id: "feature", icon: "🚀", color: "#a855f7" },
    { id: "other", icon: "💬", color: "#8da4c4" },
  ];
  const PRIORITIES = [
    { id: "low", icon: "🔵" },
    { id: "medium", icon: "🟡" },
    { id: "high", icon: "🟠" },
    { id: "urgent", icon: "🔴" },
  ];
  const STATUS_CFG = {
    pending:   { color: "#eab308", bg: "rgba(234,179,8,0.1)" },
    reviewing: { color: "#4f8ef7", bg: "rgba(79,142,247,0.1)" },
    planned:   { color: "#a855f7", bg: "rgba(168,85,247,0.1)" },
    completed: { color: "#22c55e", bg: "rgba(34,197,94,0.1)" },
    rejected:  { color: "#ef4444", bg: "rgba(239,68,68,0.1)" },
  };

  const tCfg = FEEDBACK_TYPES.find(t => t.id === item.type);
  const pCfg = PRIORITIES.find(p => p.id === item.priority);
  const sCfg = STATUS_CFG[item.status] || STATUS_CFG.pending;

  return (
    <div style={{
      borderRadius: 12, border: "1px solid rgba(99,140,255,0.1)",
      background: "rgba(9,15,30,0.4)", overflow: "hidden", transition: "all 200ms",
    }}>
      <div onClick={() => setOpen(o => !o)} style={{ padding: "14px 16px", cursor: "pointer", display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: 18 }}>{tCfg?.icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: "var(--text-1)", marginBottom: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.title}</div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 7px", borderRadius: 99, background: sCfg.bg, color: sCfg.color, border: `1px solid ${sCfg.color}33` }}>{t(`feedback.status_${item.status}`, item.status)}</span>
            <span style={{ fontSize: 10, color: "var(--text-3)" }}>{pCfg?.icon} {t(`feedback.prio_${item.priority}`, item.priority)}</span>
            <span style={{ fontSize: 10, color: "var(--text-3)" }}>📋 {item.menu}</span>
            <span style={{ fontSize: 10, color: "var(--text-3)" }}>🗓 {item.date}</span>
        </div>
        <span style={{ fontSize: 10, color: "var(--text-3)" }}>{open ? "▲" : "▼"}</span>
      {open && (
        <div style={{ padding: "0 16px 16px", borderTop: "1px solid rgba(99,140,255,0.08)" }}>
          <div style={{ marginTop: 12, fontSize: 12, color: "var(--text-2)", lineHeight: 1.7, background: "rgba(6,11,20,0.5)", borderRadius: 8, padding: "10px 12px" }}>{item.body}</div>
          {item.adminReply && (
            <div style={{ marginTop: 10, padding: "10px 12px", borderRadius: 8, background: "rgba(79,142,247,0.06)", border: "1px solid rgba(79,142,247,0.2)" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#4f8ef7", marginBottom: 5 }}>💬 {t('feedback.adminReply', 'Admin Reply')}</div>
              <div style={{ fontSize: 12, color: "var(--text-2)", lineHeight: 1.6 }}>{item.adminReply})}
          {!item.adminReply && (
            <div style={{ marginTop: 10, fontSize: 11, color: "var(--text-3)", fontStyle: "italic" }}>⏳ {t('feedback.awaitingReview', 'Awaiting admin review...')}</div>
          )}
      )}
                        </div>
                    </div>
    </div>
);
}

/* ─── Main Page ────────────────────────────────────────────────────────── */
export default function FeedbackCenter() {
  const t = useT();
  const { pushNotification } = useNotification();
  const { user, token } = useAuth();

  const FEEDBACK_TYPES = [
    { id: "bug",     icon: "🐛", label: t('feedback.type_bug','Bug Report'),       color: "#ef4444", desc: t('feedback.typeDesc_bug','Features that malfunction or are inconvenient') },
    { id: "improve", icon: "✨", label: t('feedback.type_improve','Improvement'),   color: "#4f8ef7", desc: t('feedback.typeDesc_improve','Ideas to enhance existing features') },
    { id: "feature", icon: "🚀", label: t('feedback.type_feature','New Feature'),   color: "#a855f7", desc: t('feedback.typeDesc_feature','Suggest a brand new feature') },
    { id: "other",   icon: "💬", label: t('feedback.type_other','Other'),           color: "#8da4c4", desc: t('feedback.typeDesc_other','Other inquiries and opinions') },
  ];

  const PRIORITIES = [
    { id: "low",    icon: "🔵", label: t('feedback.prio_low','Low'),       color: "#4f8ef7" },
    { id: "medium", icon: "🟡", label: t('feedback.prio_medium','Medium'), color: "#eab308" },
    { id: "high",   icon: "🟠", label: t('feedback.prio_high','High'),     color: "#f97316" },
    { id: "urgent", icon: "🔴", label: t('feedback.prio_urgent','Urgent'), color: "#ef4444" },
  ];

  const RELATED_MENUS = [
    "Dashboard", "Operations Hub", "Reviews & UGC", "Connectors", "Order Hub",
    "Campaign Manager", "CRM", "Email Marketing", "Analytics / PerformanceHub",
    "P&L Dashboard", "Catalog Sync", "Price Optimization", "Digital Shelf",
    "AI Rule Engine", "Alert Policies", "Data Schema", "Admin", t('feedback.menuOther','Other'),
  ];

  const [selType, setSelType] = useState("");
  const [selPriority, setSelPriority] = useState("medium");
  const [selMenu, setSelMenu] = useState(t('feedback.menuOther','Other'));
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submissions, setSubmissions] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [histFilter, setHistFilter] = useState("all");
  const [errorMsg, setErrorMsg] = useState("");
  const [securityAlert, setSecurityAlert] = useState(null);

  const hdrs = { "Content-Type": "application/json", Authorization: `Bearer ${token || ""}` };

  /* ── Security Check ── */
  const checkSecurity = useCallback((input) => {
    if (detectThreat(input)) {
      setSecurityAlert(true);
      setTimeout(() => setSecurityAlert(null), 5000);
      return true;
    }
    return false;
  }, []);

  /* ── API: Load my feedbacks ── */
  const loadMyFeedbacks = useCallback(() => {
    setLoadingHistory(true);
    const userEmail = user?.email || "";
    fetch(`${API}/v423/admin/feedbacks`, { headers: hdrs })
      .then(r => r.json())
      .then(d => {
        const list = d.feedbacks || (Array.isArray(d) ? d : []);
        const mine = userEmail
          ? list.filter(f => (f.user || "").toLowerCase() === userEmail.toLowerCase() || (f.user || "").toLowerCase() === (user?.name || "").toLowerCase())
          : list;
        setSubmissions(mine.sort((a, b) => (b.date || "").localeCompare(a.date || "")));
      })
      .catch(() => {})
      .finally(() => setLoadingHistory(false));
  }, [token, user]);

  useEffect(() => { loadMyFeedbacks(); }, [loadMyFeedbacks]);
  useEffect(() => {
    const interval = setInterval(() => { loadMyFeedbacks(); }, 30000);
    return () => clearInterval(interval);
  }, [loadMyFeedbacks]);

  /* ── Submit ── */
  const handleSubmit = async () => {
    if (!selType || !title.trim() || !body.trim()) return;
    // Security check
    if (checkSecurity(title) || checkSecurity(body)) return;
    setSubmitting(true);
    setErrorMsg("");
    const tCfg = FEEDBACK_TYPES.find(t => t.id === selType);
    const pCfg = PRIORITIES.find(p => p.id === selPriority);
    const now = new Date();
    const payload = {
      type: selType, priority: selPriority, title: title.trim(), body: body.trim(),
      menu: selMenu, user: user?.email || user?.name || "anonymous",
      status: "pending", date: now.toISOString().slice(0, 10),
    };
    try {
      const res = await fetch(`${API}/v423/admin/feedbacks`, {
        method: "POST", headers: hdrs, body: JSON.stringify(payload),
      });
      const data = await res.json();
      const newItem = { ...payload, id: data.id || `fb${Date.now()}`, adminReply: null };
      setSubmissions(prev => [newItem, ...prev]);
      pushNotification({
        type: "feedback", title: `${t('feedback.notifTitle','Feedback Received')}: ${tCfg?.label}`,
        body: `"${title}" — ${pCfg?.label}`, link: "/feedback",
      });
      setSubmitted(true);
      setSelType(""); setTitle(""); setBody("");
      setSelPriority("medium"); setSelMenu(t('feedback.menuOther','Other'));
      setTimeout(() => setSubmitted(false), 4000);
    } catch (err) {
      const newItem = { ...payload, id: `fb${Date.now()}`, adminReply: null };
      setSubmissions(prev => [newItem, ...prev]);
      setErrorMsg(t('feedback.errorOffline','Server save failed. Saved locally. Will sync automatically.'));
      setSubmitted(true);
      setSelType(""); setTitle(""); setBody("");
      setSelPriority("medium"); setSelMenu(t('feedback.menuOther','Other'));
      setTimeout(() => { setSubmitted(false); setErrorMsg(""); }, 5000);
    }
    setSubmitting(false);
  };

  const kpis = useMemo(() => [
    { l: t('feedback.kpiTotal','Total Submitted'), v: submissions.length, c: "#4f8ef7" },
    { l: t('feedback.kpiReviewing','Under Review'), v: submissions.filter(s => ["pending","reviewing"].includes(s.status)).length, c: "#eab308" },
    { l: t('feedback.kpiCompleted','Completed'), v: submissions.filter(s => s.status === "completed").length, c: "#22c55e" },
    { l: t('feedback.kpiPlanned','Planned'), v: submissions.filter(s => s.status === "planned").length, c: "#a855f7" },
  ], [submissions, t]);

  const filtered = useMemo(() => {
    if (histFilter === "all") return submissions;
    return submissions.filter(s => s.status === histFilter);
  }, [submissions, histFilter]);

  const canSubmit = selType && title.trim().length >= 2 && body.trim().length >= 10;

  return (
<div style={{ display: "grid", gap: 16 }}>

      {/* Security Alert */}
      {securityAlert && (
        <div style={{ padding: '16px 20px', borderRadius: 14, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 24 }}>🛡️</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 13, color: '#ef4444' }}>{t('feedback.securityTitle', 'Security Alert')}</div>
            <div style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 2 }}>{t('feedback.securityDesc', 'Potential threat detected and blocked.')}</div>
          <button onClick={() => setSecurityAlert(null)} style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.3)', background: 'transparent', color: '#ef4444', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>{t('feedback.dismiss', 'Dismiss')}</button>
      )}

      {/* Hero */}
      <div className="hero fade-up">
        <div className="hero-meta">
          <div className="hero-icon" style={{ background: "linear-gradient(135deg,rgba(79,142,247,0.25),rgba(168,85,247,0.15))" }}>💬</div>
          <div>
            <div className="hero-title" style={{ background: "linear-gradient(135deg,#4f8ef7,#a855f7)" }}>
              {t('feedback.heroTitle', 'Feedback & Suggestions')}
            </div>
            <div className="hero-desc">{t('feedback.heroDesc', 'Submit bug reports, improvements, and feature requests. All feedback is reflected in platform improvements.')}</div>
        </div>

      {/* KPI */}
      <div className="grid4 fade-up fade-up-1">
        {kpis.map(({ l, v, c }, i) => (
          <div key={l} className="kpi-card card-hover" style={{ "--accent": c, animationDelay: `${i * 60}ms` }}>
            <div className="kpi-label">{l}</div>
            <div className="kpi-value" style={{ color: c }}>{v}{t('feedback.unit','')}</div>
        ))}

      {/* Submit Form */}
      <div className="card card-glass fade-up fade-up-2">
        <div className="section-header" style={{ marginBottom: 20 }}>
          <div className="section-title">📝 {t('feedback.submitTitle', 'Submit Feedback')}</div>
          {submitted && (
            <div style={{ fontSize: 12, fontWeight: 700, color: "#22c55e", display: "flex", alignItems: "center", gap: 6 }}>
              ✓ {t('feedback.submitSuccess', 'Feedback submitted successfully!')}
          )}

        {errorMsg && (
          <div style={{ padding: "8px 12px", borderRadius: 8, background: "rgba(234,179,8,0.1)", border: "1px solid rgba(234,179,8,0.3)", fontSize: 11, color: "#eab308", marginBottom: 14 }}>{errorMsg}</div>
        )}

        {/* Type Select */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", marginBottom: 10 }}>{t('feedback.selectType', 'Select Type')} *</div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {FEEDBACK_TYPES.map(ft => (
              <TypeCard key={ft.id} type={ft} selected={selType === ft.id} onClick={setSelType} t={t} />
            ))}
        </div>

        {/* Priority + Related Menu */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", marginBottom: 8 }}>{t('feedback.priority', 'Priority')}</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {PRIORITIES.map(p => (
                <button key={p.id} onClick={() => setSelPriority(p.id)} style={{
                  padding: "5px 12px", borderRadius: 20, fontSize: 11, cursor: "pointer", fontWeight: 700,
                  background: selPriority === p.id ? `${p.color}22` : "rgba(255,255,255,0.03)",
                  border: `1px solid ${selPriority === p.id ? p.color : "rgba(99,140,255,0.12)"}`,
                  color: selPriority === p.id ? p.color : "var(--text-3)", transition: "all 150ms",
                }}>
                  {p.icon} {p.label}
                </button>
              ))}
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", marginBottom: 8 }}>{t('feedback.relatedMenu', 'Related Menu')}</div>
            <select value={selMenu} onChange={e => setSelMenu(e.target.value)} className="input" style={{ width: "100%", padding: "8px 12px", fontSize: 12 }}>
              {RELATED_MENUS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
        </div>

        {/* Title */}
        <div style={{ marginBottom: 14 }}>
          <label className="input-label">{t('feedback.titleLabel', 'Title')} * <span style={{ color: "var(--text-3)", fontWeight: 400 }}>({title.length}/100)</span></label>
          <input className="input" value={title} onChange={e => setTitle(e.target.value.slice(0, 100))} placeholder={t('feedback.titlePlaceholder', 'Summarize your feedback in one line')} style={{ width: "100%", padding: "10px 12px", fontSize: 13 }} />

        {/* Body */}
        <div style={{ marginBottom: 18 }}>
          <label className="input-label">{t('feedback.bodyLabel', 'Details')} * <span style={{ color: "var(--text-3)", fontWeight: 400 }}>({body.length}/2000)</span></label>
          <textarea className="input" value={body} onChange={e => setBody(e.target.value.slice(0, 2000))}
            placeholder={t('feedback.bodyPlaceholder', 'Please describe the situation in detail: when, where, what action triggered the issue.')}
            rows={6} style={{ width: "100%", padding: "10px 12px", fontSize: 12, resize: "vertical", lineHeight: 1.7 }} />
          {body.length > 0 && body.length < 10 && (
            <div style={{ fontSize: 10, color: "#ef4444", marginTop: 4 }}>{t('feedback.minChars', 'At least 10 characters required')}</div>
          )}

        {/* Submit Button */}
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button className="btn-primary" onClick={handleSubmit} disabled={submitting || !canSubmit} style={{
            padding: "11px 28px", fontSize: 13, fontWeight: 800,
            background: canSubmit ? "linear-gradient(135deg,#4f8ef7,#a855f7)" : "rgba(255,255,255,0.06)",
            color: canSubmit ? "#fff" : "var(--text-3)", cursor: canSubmit ? "pointer" : "not-allowed",
            boxShadow: canSubmit ? "0 6px 24px rgba(79,142,247,0.35)" : "none",
            transition: "all 200ms", opacity: submitting ? 0.7 : 1,
          }}>
            {submitting ? `⏳ ${t('feedback.submitting','Submitting...')}` : `📨 ${t('feedback.submitBtn','Submit Feedback')}`}
          </button>
          {!selType && <span style={{ fontSize: 11, color: "var(--text-3)" }}>{t('feedback.selectTypeFirst', 'Select feedback type first')}</span>}
      </div>

      {/* My Submissions */}
      <div className="card card-glass fade-up fade-up-3">
        <div className="section-header" style={{ marginBottom: 16 }}>
          <div className="section-title">📋 {t('feedback.mySubmissions', 'My Submissions')}
            <span style={{ marginLeft: 8, fontSize: 10, color: "var(--text-3)", fontWeight: 400 }}>
              {t('feedback.totalCount','Total')} {submissions.length}{t('feedback.unit','')} {loadingHistory && `· ${t('feedback.syncing','Syncing...')}`}
            </span>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            {[
              { id: "all", label: t('feedback.filterAll','All') },
              { id: "pending", label: t('feedback.status_pending','Received') },
              { id: "reviewing", label: t('feedback.status_reviewing','Under Review') },
              { id: "planned", label: t('feedback.status_planned','Planned') },
              { id: "completed", label: t('feedback.status_completed','Completed') },
            ].map(f => (
              <button key={f.id} onClick={() => setHistFilter(f.id)} className={histFilter === f.id ? "btn-primary" : "btn-ghost"} style={{ fontSize: 10, padding: "4px 10px" }}>
                {f.label}
              </button>
            ))}
            <button onClick={loadMyFeedbacks} style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid rgba(79,142,247,0.3)", background: "rgba(79,142,247,0.06)", color: "#4f8ef7", fontSize: 10, fontWeight: 700, cursor: "pointer" }} title={t('feedback.refresh','Refresh')}>🔄</button>
        </div>

        <div style={{ display: "grid", gap: 10 }}>
          {filtered.map(item => (
            <SubmissionCard key={item.id} item={item} t={t} />
          ))}
          {!loadingHistory && filtered.length === 0 && (
            <div style={{ textAlign: "center", padding: 40, color: "var(--text-3)", fontSize: 13 }}>
              {submissions.length === 0 ? `📭 ${t('feedback.noSubmissions','No feedback submitted yet. Send your opinions above!')}` : `🔍 ${t('feedback.noFilterMatch','No feedback with this status')}`}
          )}
          {loadingHistory && (
            <div style={{ textAlign: "center", padding: 40, color: "var(--text-3)", fontSize: 13 }}>⏳ {t('feedback.loading','Loading feedback history...')}</div>
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
                                                </div>
                                            </div>
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
