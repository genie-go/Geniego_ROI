import React, { useState, useMemo } from "react";
import { useNotification } from "../context/NotificationContext.jsx";
import { useAuth } from "../auth/AuthContext.jsx";

/* ─── Constant ────────────────────────────────────────────────────────────────────── */
const FEEDBACK_TYPES = [
  { id: "bug",     icon: "🐛", label: "Complaints·Bug",    color: "#ef4444", desc: "Usage in progress 불편하거나 오작동하는 Feature" },
  { id: "improve", icon: "✨", label: "Improvement",         color: "#4f8ef7", desc: "기존 Feature을 더 편리하게 개선하는 아이디어" },
  { id: "feature", icon: "🚀", label: "신규 Feature Request",    color: "#a855f7", desc: "없었으면 좋겠다 싶은 새 Feature 제안" },
  { id: "other",   icon: "💬", label: "기타",              color: "#8da4c4", desc: "그 외 문의·의견" },
];

const PRIORITIES = [
  { id: "low",    icon: "🔵", label: "낮음",  color: "#4f8ef7" },
  { id: "medium", icon: "🟡", label: "Normal",  color: "#eab308" },
  { id: "high",   icon: "🟠", label: "High",  color: "#f97316" },
  { id: "urgent", icon: "🔴", label: "Urgent",  color: "#ef4444" },
];

const RELATED_MENUS = [
  "Dashboard", "Operations Hub", "Reviews & UGC", "Connectors", "Order Hub",
  "Campaign Manager", "CRM", "Email Marketing", "Analytics / PerformanceHub",
  "P&L Dashboard", "Catalog Sync", "Price Optimization", "Digital Shelf",
  "AI Rule Engine", "Alert Policies", "Data Schema", "Admin", "기타",
];

const STATUS_CFG = {
  pending:     { label: "Received",   color: "#eab308", bg: "rgba(234,179,8,0.1)" },
  reviewing:   { label: "Reviewing",  color: "#4f8ef7", bg: "rgba(79,142,247,0.1)" },
  planned:     { label: "Planned", color: "#a855f7", bg: "rgba(168,85,247,0.1)" },
  completed:   { label: "Completed", color: "#22c55e", bg: "rgba(34,197,94,0.1)" },
  rejected:    { label: "Rejected",   color: "#ef4444", bg: "rgba(239,68,68,0.1)" },
};

/* ─── 내 제출 내역 (Demo) ────────────────────────────────────────────────────── */
const MY_SUBMISSIONS_DEMO = [
  {
    id: "fb001", type: "improve", priority: "high", title: "Operations Hub Product 일괄 Upload Feature Add",
    body: "현재 Product Register이 1건씩만 가능해 대량 Register 시 불편합니다. CSV 일괄 Upload를 Add해주세요.",
    menu: "Operations Hub", status: "planned", date: "2026-03-10",
    adminReply: "March 릴리즈에 CSV Upload Feature 반영 예정입니다. 감사합니다!",
  },
  {
    id: "fb002", type: "bug", priority: "urgent", title: "Connectors Page TikTok 토큰 갱신 Error",
    body: "토큰 갱신 Clicks 시 간헐적으로 Error가 발생합니다.",
    menu: "Connectors", status: "completed", date: "2026-03-05",
    adminReply: "Edit Done되었습니다. (v422.3.1 패치)",
  },
  {
    id: "fb003", type: "feature", priority: "medium", title: "리뷰 감성 Analysis Excel Export",
    body: "Reviews & UGC의 감성 Analysis 결과를 Excel로 Download하고 싶습니다.",
    menu: "Reviews & UGC", status: "reviewing", date: "2026-03-12",
    adminReply: null,
  },
];

/* ─── 서브 Component ──────────────────────────────────────────────────────────── */
function TypeCard({ type, selected, onClick }) {
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
      <div style={{ fontWeight: 700, fontSize: 12, color: selected ? type.color : "var(--text-1)", marginBottom: 3 }}>{type.label}</div>
      <div style={{ fontSize: 10, color: "var(--text-3)", lineHeight: 1.5 }}>{type.desc}</div>
    </button>
  );
}

function SubmissionCard({ item }) {
  const [open, setOpen] = useState(false);
  const tCfg = FEEDBACK_TYPES.find(t => t.id === item.type);
  const pCfg = PRIORITIES.find(p => p.id === item.priority);
  const sCfg = STATUS_CFG[item.status] || STATUS_CFG.pending;

  return (
    <div style={{
      borderRadius: 12, border: "1px solid rgba(99,140,255,0.1)",
      background: "rgba(9,15,30,0.4)", overflow: "hidden",
      transition: "all 200ms",
    }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{ padding: "14px 16px", cursor: "pointer", display: "flex", alignItems: "center", gap: 12 }}
      >
        <span style={{ fontSize: 18 }}>{tCfg?.icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: "var(--text-1)", marginBottom: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.title}</div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 7px", borderRadius: 99, background: sCfg.bg, color: sCfg.color, border: `1px solid ${sCfg.color}33` }}>{sCfg.label}</span>
            <span style={{ fontSize: 10, color: "var(--text-3)" }}>{pCfg?.icon} {pCfg?.label}</span>
            <span style={{ fontSize: 10, color: "var(--text-3)" }}>📋 {item.menu}</span>
            <span style={{ fontSize: 10, color: "var(--text-3)" }}>🗓 {item.date}</span>
          </div>
        </div>
        <span style={{ fontSize: 10, color: "var(--text-3)" }}>{open ? "▲" : "▼"}</span>
      </div>
      {open && (
        <div style={{ padding: "0 16px 16px", borderTop: "1px solid rgba(99,140,255,0.08)" }}>
          <div style={{ marginTop: 12, fontSize: 12, color: "var(--text-2)", lineHeight: 1.7, background: "rgba(6,11,20,0.5)", borderRadius: 8, padding: "10px 12px" }}>{item.body}</div>
          {item.adminReply && (
            <div style={{ marginTop: 10, padding: "10px 12px", borderRadius: 8, background: "rgba(79,142,247,0.06)", border: "1px solid rgba(79,142,247,0.2)" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#4f8ef7", marginBottom: 5 }}>💬 Management자 답변</div>
              <div style={{ fontSize: 12, color: "var(--text-2)", lineHeight: 1.6 }}>{item.adminReply}</div>
            </div>
          )}
          {!item.adminReply && (
            <div style={{ marginTop: 10, fontSize: 11, color: "var(--text-3)", fontStyle: "italic" }}>⏳ Management자 검토 Pending...</div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── 메인 Page ────────────────────────────────────────────────────────────── */
export default function FeedbackCenter() {
  const { pushNotification } = useNotification();
  const { user } = useAuth();

  const [selType, setSelType] = useState("");
  const [selPriority, setSelPriority] = useState("medium");
  const [selMenu, setSelMenu] = useState("기타");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submissions, setSubmissions] = useState(MY_SUBMISSIONS_DEMO);
  const [histFilter, setHistFilter] = useState("all");

  const handleSubmit = async () => {
    if (!selType || !title.trim() || !body.trim()) return;
    setSubmitting(true);
    await new Promise(r => setTimeout(r, 900));

    const tCfg = FEEDBACK_TYPES.find(t => t.id === selType);
    const pCfg = PRIORITIES.find(p => p.id === selPriority);
    const now = new Date();

    // 신규 제출 내역 Add
    const newItem = {
      id: `fb${Date.now()}`,
      type: selType,
      priority: selPriority,
      title,
      body,
      menu: selMenu,
      status: "pending",
      date: now.toISOString().slice(0, 10),
      adminReply: null,
    };
    setSubmissions(prev => [newItem, ...prev]);

    // 전역 푸시 Notification Send
    pushNotification({
      type: "feedback",
      title: `피드백 접Count: ${tCfg?.label}`,
      body: `"${title}" — ${pCfg?.label} Priority로 접Count되었습니다.`,
      link: "/feedback",
    });

    setSubmitting(false);
    setSubmitted(true);
    setSelType("");
    setTitle("");
    setBody("");
    setSelPriority("medium");
    setSelMenu("기타");

    setTimeout(() => setSubmitted(false), 4000);
  };

  const kpis = useMemo(() => [
    { l: "All 제출", v: submissions.length, c: "#4f8ef7" },
    { l: "Reviewing", v: submissions.filter(s => ["pending","reviewing"].includes(s.status)).length, c: "#eab308" },
    { l: "Completed", v: submissions.filter(s => s.status === "completed").length, c: "#22c55e" },
    { l: "Planned", v: submissions.filter(s => s.status === "planned").length, c: "#a855f7" },
  ], [submissions]);

  const filtered = useMemo(() => {
    if (histFilter === "all") return submissions;
    return submissions.filter(s => s.status === histFilter);
  }, [submissions, histFilter]);

  const canSubmit = selType && title.trim().length >= 2 && body.trim().length >= 10;

  return (
    <div style={{ display: "grid", gap: 16 }}>

      {/* ── Hero ── */}
      <div className="hero fade-up">
        <div className="hero-meta">
          <div className="hero-icon" style={{ background: "linear-gradient(135deg,rgba(79,142,247,0.25),rgba(168,85,247,0.15))" }}>💬</div>
          <div>
            <div className="hero-title" style={{ background: "linear-gradient(135deg,#4f8ef7,#a855f7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              피드백 & 개선 제안
            </div>
            <div className="hero-desc">Complaints·Bug Report·Improvement·신규 Feature Request을 보내주세요. 모든 의견은 Platform 개선에 반영됩니다.</div>
          </div>
        </div>
      </div>

      {/* ── KPI ── */}
      <div className="grid4 fade-up fade-up-1">
        {kpis.map(({ l, v, c }, i) => (
          <div key={l} className="kpi-card card-hover" style={{ "--accent": c, animationDelay: `${i * 60}ms` }}>
            <div className="kpi-label">{l}</div>
            <div className="kpi-value" style={{ color: c }}>{v}건</div>
          </div>
        ))}
      </div>

      {/* ── 제출 폼 ── */}
      <div className="card card-glass fade-up fade-up-2">
        <div className="section-header" style={{ marginBottom: 20 }}>
          <div className="section-title">📝 의견 제출</div>
          {submitted && (
            <div style={{ fontSize: 12, fontWeight: 700, color: "#22c55e", display: "flex", alignItems: "center", gap: 6 }}>
              ✓ Success적으로 접Count되었습니다!
            </div>
          )}
        </div>

        {/* Type Select */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", marginBottom: 10 }}>의견 Type Select *</div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {FEEDBACK_TYPES.map(t => (
              <TypeCard key={t.id} type={t} selected={selType === t.id} onClick={setSelType} />
            ))}
          </div>
        </div>

        {/* Priority + Related Feature */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", marginBottom: 8 }}>Priority</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {PRIORITIES.map(p => (
                <button
                  key={p.id}
                  onClick={() => setSelPriority(p.id)}
                  style={{
                    padding: "5px 12px", borderRadius: 20, fontSize: 11, cursor: "pointer", fontWeight: 700,
                    background: selPriority === p.id ? `${p.color}22` : "rgba(255,255,255,0.03)",
                    border: `1px solid ${selPriority === p.id ? p.color : "rgba(99,140,255,0.12)"}`,
                    color: selPriority === p.id ? p.color : "var(--text-3)",
                    transition: "all 150ms",
                  }}
                >
                  {p.icon} {p.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", marginBottom: 8 }}>Related Feature·메뉴</div>
            <select
              value={selMenu}
              onChange={e => setSelMenu(e.target.value)}
              className="input"
              style={{ width: "100%", padding: "8px 12px", fontSize: 12 }}
            >
              {RELATED_MENUS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>

        {/* 제목 */}
        <div style={{ marginBottom: 14 }}>
          <label className="input-label">제목 * <span style={{ color: "var(--text-3)", fontWeight: 400 }}>({title.length}/100자)</span></label>
          <input
            className="input"
            value={title}
            onChange={e => setTitle(e.target.value.slice(0, 100))}
            placeholder="의견을 한 줄로 Summary해주세요"
            style={{ width: "100%", padding: "10px 12px", fontSize: 13 }}
          />
        </div>

        {/* 내용 */}
        <div style={{ marginBottom: 18 }}>
          <label className="input-label">상세 내용 * <span style={{ color: "var(--text-3)", fontWeight: 400 }}>({body.length}/2000자)</span></label>
          <textarea
            className="input"
            value={body}
            onChange={e => setBody(e.target.value.slice(0, 2000))}
            placeholder={"구체적인 상황, 재현 방법, 원하는 동작 등을 상세히 작성해주세요.\n\n예: 언제, 어떤 Screen에서, 어떤 동작을 했을 때 문제가 발생하는지 기술해주세요."}
            rows={6}
            style={{ width: "100%", padding: "10px 12px", fontSize: 12, resize: "vertical", lineHeight: 1.7 }}
          />
          {body.length > 0 && body.length < 10 && (
            <div style={{ fontSize: 10, color: "#ef4444", marginTop: 4 }}>10자 이상 입력해주세요</div>
          )}
        </div>

        {/* 제출 Button */}
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button
            className="btn-primary"
            onClick={handleSubmit}
            disabled={submitting || !canSubmit}
            style={{
              padding: "11px 28px", fontSize: 13, fontWeight: 800,
              background: canSubmit
                ? "linear-gradient(135deg,#4f8ef7,#a855f7)"
                : "rgba(255,255,255,0.06)",
              color: canSubmit ? "#fff" : "var(--text-3)",
              cursor: canSubmit ? "pointer" : "not-allowed",
              boxShadow: canSubmit ? "0 6px 24px rgba(79,142,247,0.35)" : "none",
              transition: "all 200ms",
              opacity: submitting ? 0.7 : 1,
            }}
          >
            {submitting ? "⏳ 접Count in progress..." : "📨 Submit Feedback"}
          </button>
          {!selType && <span style={{ fontSize: 11, color: "var(--text-3)" }}>의견 Type을 먼저 Select하세요</span>}
        </div>
      </div>

      {/* ── 내 제출 내역 ── */}
      <div className="card card-glass fade-up fade-up-3">
        <div className="section-header" style={{ marginBottom: 16 }}>
          <div className="section-title">📋 내 제출 내역
            <span style={{ marginLeft: 8, fontSize: 10, color: "var(--text-3)", fontWeight: 400 }}>
              Total {submissions.length}건
            </span>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {[
              { id: "all", label: "All" },
              { id: "pending", label: "Received" },
              { id: "reviewing", label: "Reviewing" },
              { id: "planned", label: "Planned" },
              { id: "completed", label: "Completed" },
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setHistFilter(f.id)}
                className={histFilter === f.id ? "btn-primary" : "btn-ghost"}
                style={{ fontSize: 10, padding: "4px 10px" }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: "grid", gap: 10 }}>
          {filtered.map(item => (
            <SubmissionCard key={item.id} item={item} />
          ))}
          {filtered.length === 0 && (
            <div style={{ textAlign: "center", padding: 40, color: "var(--text-3)", fontSize: 13 }}>
              제출 내역이 없습니다
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
