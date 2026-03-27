import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useT } from "../i18n/index.js";
import SubscriptionPricing from "./SubscriptionPricing.jsx";
import { useAuth } from "../auth/AuthContext.jsx";
import { useNotification } from "../context/NotificationContext.jsx";

const API = "/api";

/* Demo admin key */
const DEMO_ADMIN_KEY = "genie_live_demo_key_00000000";

const INTEGRATIONS = [
  { name: "Meta Marketing API", status: "connected", icon: "📘", color: "#4f8ef7", since: "2024-10-01", calls: "12.4K" },
  { name: "TikTok Business API", status: "connected", icon: "🎵", color: "#a855f7", since: "2024-11-15", calls: "8.2K", provider: "tiktok" },
  { name: "Shopify Admin API", status: "connected", icon: "🛍", color: "#22c55e", since: "2024-09-20", calls: "5.9K" },
  { name: "Amazon SP-API", status: "connected", icon: "📦", color: "#eab308", since: "2024-12-01", calls: "4.1K", provider: "amazon" },
  { name: "Coupang Open API", status: "connected", icon: "🏪", color: "#14d9b0", since: "2025-01-10", calls: "7.8K" },
  { name: "Naver Commerce API", status: "warning", icon: "🔍", color: "#f97316", since: "2025-02-01", calls: "2.3K" },
];

const ROLE_COLORS = { Admin: "#ef4444", admin: "#ef4444", Editor: "#f97316", Analyst: "#4f8ef7", analyst: "#4f8ef7", Viewer: "#8da4c4", viewer: "#8da4c4", pro: "#a855f7", enterprise: "#f59e0b" };
const PLAN_LIST = ["free", "starter", "growth", "pro", "enterprise", "admin"];

function authHeaders(key) {
  return { "Content-Type": "application/json", Authorization: `Bearer ${key}` };
}

/* ── Admin 사용자 관리 Panel ─────────────────────────────────────────────── */
function UserManagementPanel() {
  const { token } = useAuth();
  const authKey = token || DEMO_ADMIN_KEY;
  const hdrs = { "Content-Type": "application/json", Authorization: `Bearer ${authKey}` };

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState({ text: "", type: "ok" });
  const [showAddForm, setShowAddForm] = useState(false);
  const [editUser, setEditUser] = useState(null); // 플랜 변경 대상
  const [form, setForm] = useState({ name: "", email: "", password: "", plan: "demo" });
  const [saving, setSaving] = useState(false);

  const loadUsers = useCallback(() => {
    setLoading(true);
    fetch(`${API}/v423/admin/users`, { headers: hdrs })
      .then(r => r.json())
      .then(d => { if (d.명) setUsers(d.명); else if (d.ok === false) setMsg({ text: d.error || "Lookup Failed", type: "err" }); })
      .catch(() => setMsg({ text: "사용자 목록 Lookup Failed (Demo 데이터 표시)", type: "warn" }))
      .finally(() => setLoading(false));
  }, [authKey]);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const showMsg = (text, type = "ok") => { setMsg({ text, type }); setTimeout(() => setMsg({ text: "", type: "ok" }), 4000); };

  const handleAddUser = async () => {
    if (!form.name || !form.email || !form.password) { showMsg("이름, 이메일, 비밀번호를 모두 입력해주세요.", "err"); return; }
    setSaving(true);
    const r = await fetch(`${API}/v423/admin/users`, { method: "POST", headers: hdrs, body: JSON.stringify(form) });
    const d = await r.json();
    setSaving(false);
    if (d.ok) { showMsg("사용자가 등록되었습니다.", "ok"); setShowAddForm(false); setForm({ name: "", email: "", password: "", plan: "demo" }); loadUsers(); }
    else showMsg(d.error || "등록 실패", "err");
  };

  const handlePlanChange = async (userId, newPlan) => {
    const r = await fetch(`${API}/v423/admin/users/${userId}/plan`, { method: "PATCH", headers: hdrs, body: JSON.stringify({ plan: newPlan }) });
    const d = await r.json();
    if (d.ok) { showMsg("플랜이 업데이트되었습니다.", "ok"); setEditUser(null); loadUsers(); }
    else showMsg(d.error || "업데이트 실패", "err");
  };

  const handleToggleActive = async (userId, currentActive) => {
    const r = await fetch(`${API}/v423/admin/users/${userId}/active`, { method: "PATCH", headers: hdrs, body: JSON.stringify({ active: !currentActive }) });
    const d = await r.json();
    if (d.ok) { showMsg(currentActive ? "계정이 비활성화되었습니다." : "계정이 활성화되었습니다.", "ok"); loadUsers(); }
    else showMsg(d.error || "업데이트 실패", "err");
  };

  const handleResetPw = async (userId) => {
    if (!window.confirm("비밀번호를 초기화하시겠습니까? 임시 비밀번호가 발급됩니다.")) return;
    const r = await fetch(`${API}/v423/admin/users/${userId}/reset-password`, { method: "POST", headers: hdrs });
    const d = await r.json();
    if (d.ok) showMsg(`Temporary password: ${d.temp_password || "(sent via server email)"}`, "ok");
    else showMsg(d.error || "초기화 실패", "err");
  };

  const pc = (plan) => ROLE_COLORS[plan] || "#8da4c4";

  return (
    <div style={{ display: "grid", gap: 14 }}>
      {/* Message */}
      {msg.text && (
        <div style={{
          padding: "10px 14px", borderRadius: 8, fontSize: 12, fontWeight: 700,
          background: msg.type === "ok" ? "rgba(34,197,94,0.1)" : msg.type === "warn" ? "rgba(234,179,8,0.08)" : "rgba(239,68,68,0.1)",
          border: `1px solid ${msg.type === "ok" ? "rgba(34,197,94,0.3)" : msg.type === "warn" ? "rgba(234,179,8,0.3)" : "rgba(239,68,68,0.3)"}`,
          color: msg.type === "ok" ? "#22c55e" : msg.type === "warn" ? "#fbbf24" : "#ef4444",
        }}>
          {msg.text}
        </div>
      )}

      {/* Header + Admin Add Button */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontWeight: 800, fontSize: 14, color: "#e2e8f0" }}>👥 사용자 목록 ({users.length}명)</div>
        <button
          onClick={() => setShowAddForm(v => !v)}
          style={{
            padding: "8px 18px", borderRadius: 9, border: "none", cursor: "pointer",
            background: showAddForm ? "rgba(239,68,68,0.1)" : "linear-gradient(135deg,#4f8ef7,#6366f1)",
            color: showAddForm ? "#ef4444" : "#fff", fontWeight: 800, fontSize: 12,
            boxShadow: showAddForm ? "none" : "0 4px 14px rgba(79,142,247,0.3)",
          }}
        >
          {showAddForm ? "✕ Cancel" : "+ 사용자 추가"}
        </button>
      </div>

      {/* User Register 폼 */}
      {showAddForm && (
        <div style={{
          padding: "18px 20px", borderRadius: 14,
          background: "rgba(79,142,247,0.06)", border: "1px solid rgba(79,142,247,0.25)",
          display: "grid", gap: 12,
        }}>
          <div style={{ fontWeight: 800, fontSize: 13, color: "#93c5fd" }}>🆕 신규 사용자 등록</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label style={{ fontSize: 10, color: "#7c8fa8", display: "block", marginBottom: 4, fontWeight: 700 }}>이름 *</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="John Doe" style={{ width: "100%", background: "#0a1628", border: "1px solid #1e3a5f", borderRadius: 7, color: "#e2e8f0", padding: "8px 10px", fontSize: 12, boxSizing: "border-box" }} />
            </div>
            <div>
              <label style={{ fontSize: 10, color: "#7c8fa8", display: "block", marginBottom: 4, fontWeight: 700 }}>이메일 *</label>
              <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="user@company.com" type="email" style={{ width: "100%", background: "#0a1628", border: "1px solid #1e3a5f", borderRadius: 7, color: "#e2e8f0", padding: "8px 10px", fontSize: 12, boxSizing: "border-box" }} />
            </div>
            <div>
              <label style={{ fontSize: 10, color: "#7c8fa8", display: "block", marginBottom: 4, fontWeight: 700 }}>비밀번호 *</label>
              <input value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder="8+ characters" type="password" style={{ width: "100%", background: "#0a1628", border: "1px solid #1e3a5f", borderRadius: 7, color: "#e2e8f0", padding: "8px 10px", fontSize: 12, boxSizing: "border-box" }} />
            </div>
            <div>
              <label style={{ fontSize: 10, color: "#7c8fa8", display: "block", marginBottom: 4, fontWeight: 700 }}>플랜 및 권한</label>
              <select value={form.plan} onChange={e => setForm(f => ({ ...f, plan: e.target.value }))}
                style={{ width: "100%", background: "#0a1628", border: "1px solid #1e3a5f", borderRadius: 7, color: "#e2e8f0", padding: "8px 10px", fontSize: 12, boxSizing: "border-box" }}>
                {PLAN_LIST.map(p => <option key={p} value={p}>{p === "admin" ? "🔴 admin (Admin)" : p === "pro" ? "🚀 pro" : p === "enterprise" ? "🌐 enterprise" : p === "demo" ? "🟡 demo" : `🌱 ${p}`}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button onClick={() => setShowAddForm(false)} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #1e3a5f", background: "transparent", color: "#94a3b8", fontSize: 12, cursor: "pointer" }}>취소</button>
            <button onClick={handleAddUser} disabled={saving} style={{ padding: "8px 20px", borderRadius: 8, border: "none", background: "linear-gradient(135deg,#4f8ef7,#6366f1)", color: "#fff", fontSize: 12, fontWeight: 800, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}>
              {saving ? "등록 중..." : "✓ 등록"}
            </button>
          </div>
        </div>
      )}

      {/* 사용자 목록 */}
      {loading ? (
        <div style={{ textAlign: "center", color: "#3b4d6e", padding: "40px 0", fontSize: 13 }}>⏳ 사용자 목록 불러오는 중...</div>
      ) : users.length === 0 ? (
        <div style={{ textAlign: "center", color: "#3b4d6e", padding: "40px 0", fontSize: 13 }}>📭 등록된 사용자가 없습니다.</div>
      ) : (
        <div style={{ display: "grid", gap: 6 }}>
          {/* Header */}
          <div style={{ display: "grid", gridTemplateColumns: "2fr 2fr 1fr 1fr 1fr auto", gap: 10, padding: "6px 14px", fontSize: 10, fontWeight: 700, color: "#7c8fa8", background: "rgba(255,255,255,0.02)", borderRadius: 8 }}>
            <span>이름 / 이메일</span><span>가입일</span><span>플랜</span><span>상태</span><span>플랜 변경</span><span>작업</span>
          </div>
          {users.map(u => (
            <div key={u.id} style={{
              display: "grid", gridTemplateColumns: "2fr 2fr 1fr 1fr 1fr auto", gap: 10,
              padding: "12px 14px", borderRadius: 10, alignItems: "center",
              background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
            }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13, color: "#e2e8f0" }}>{u.name}</div>
                <div style={{ fontSize: 10, color: "#7c8fa8", marginTop: 1 }}>{u.email}</div>
              </div>
              <div style={{ fontSize: 11, color: "#7c8fa8" }}>{u.created_at ? u.created_at.slice(0, 10) : "-"}</div>
              <span style={{
                fontSize: 10, padding: "3px 10px", borderRadius: 99, fontWeight: 700, textAlign: "center",
                background: `${pc(u.plan)}18`, border: `1px solid ${pc(u.plan)}33`, color: pc(u.plan),
              }}>{u.plan || "demo"}</span>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: u.active ? "#22c55e" : "#ef4444", display: "inline-block" }} />
                <span style={{ fontSize: 10, color: u.active ? "#22c55e" : "#ef4444" }}>{u.active ? "활성" : "비활성"}</span>
              </div>
              {/* 플랜 변경 Dropdown */}
              {editUser === u.id ? (
                <div style={{ display: "flex", gap: 4 }}>
                  <select defaultValue={u.plan}
                    onChange={e => handlePlanChange(u.id, e.target.value)}
                    style={{ flex: 1, background: "#0a1628", border: "1px solid #1e3a5f", borderRadius: 6, color: "#e2e8f0", padding: "4px 6px", fontSize: 10 }}>
                    {PLAN_LIST.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                  <button onClick={() => setEditUser(null)} style={{ padding: "3px 7px", borderRadius: 5, border: "1px solid #1e3a5f", background: "transparent", color: "#94a3b8", fontSize: 10, cursor: "pointer" }}>✕</button>
                </div>
              ) : (
                <button onClick={() => setEditUser(u.id)} style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid rgba(79,142,247,0.3)", background: "rgba(79,142,247,0.08)", color: "#4f8ef7", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>수정↗</button>
              )}
              <div style={{ display: "flex", gap: 5 }}>
                <button onClick={() => handleToggleActive(u.id, u.active)}
                  style={{ padding: "4px 8px", borderRadius: 5, border: `1px solid ${u.active ? "rgba(239,68,68,0.3)" : "rgba(34,197,94,0.3)"}`, background: u.active ? "rgba(239,68,68,0.06)" : "rgba(34,197,94,0.06)", color: u.active ? "#ef4444" : "#22c55e", fontSize: 9, cursor: "pointer", fontWeight: 700 }}>
                  {u.active ? "비활성화" : "활성화"}
                </button>
                <button onClick={() => handleResetPw(u.id)}
                  style={{ padding: "4px 8px", borderRadius: 5, border: "1px solid rgba(234,179,8,0.3)", background: "rgba(234,179,8,0.06)", color: "#fbbf24", fontSize: 9, cursor: "pointer", fontWeight: 700 }}>
                  PWReset
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── API Key Panel ────────────────────────────────────────────────────────── */
function ApiKeyPanel() {
  const [apiKey, setApiKey] = useState(DEMO_ADMIN_KEY);
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newKey, setNewKey] = useState(null);
  const [form, setForm] = useState({ name: "", role: "analyst", expires_at: "" });
  const [msg, setMsg] = useState("");

  const load = () => {
    if (!apiKey) return;
    setLoading(true);
    fetch(`${API}/v421/keys`, { headers: authHeaders(apiKey) })
      .then(r => r.json())
      .then(d => setKeys(d.keys || []))
      .catch(e => setMsg("Error: " + e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const create = async () => {
    if (!form.name) return setMsg("이름을 입력하세요");
    setMsg(""); setNewKey(null);
    const r = await fetch(`${API}/v421/keys`, {
      method: "POST",
      headers: authHeaders(apiKey),
      body: JSON.stringify(form),
    });
    const d = await r.json();
    if (d.api_key) { setNewKey(d.api_key); load(); }
    else setMsg(d.error || JSON.stringify(d));
  };

  const revoke = async (id) => {
    await fetch(`${API}/v421/keys/${id}`, { method: "DELETE", headers: authHeaders(apiKey) });
    load();
  };

  const rotate = async (id) => {
    setNewKey(null);
    const r = await fetch(`${API}/v421/keys/${id}/rotate`, { method: "POST", headers: authHeaders(apiKey) });
    const d = await r.json();
    if (d.api_key) setNewKey(d.api_key);
    load();
  };

  const ROLE_C = { admin: "#ef4444", analyst: "#4f8ef7", connector: "#22c55e", viewer: "#8da4c4" };

  return (
    <div>
      {/* Auth Key input */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "center" }}>
        <input
          style={{ flex: 1, background: "#0f172a", border: "1px solid #3b4d6e", borderRadius: 6, color: "#e2e8f0", padding: "6px 10px", fontSize: 11, fontFamily: "monospace" }}
          value={apiKey} onChange={e => setApiKey(e.target.value)}
          placeholder="Enter Bearer key"
        />
        <button className="btn" onClick={load} disabled={loading}>{loading ? "⏳" : "🔄 Load"}</button>
      </div>

      {/* NEW key notification */}
      {newKey && (
        <div style={{ background: "#14532d33", border: "1px solid #22c55e55", borderRadius: 8, padding: "10px 14px", marginBottom: 12, fontSize: 12 }}>
          <div style={{ color: "#22c55e", fontWeight: 700, marginBottom: 4 }}>🔑 지금 복사하세요 (다시 표시되지 않음)</div>
          <code style={{ color: "#86efac", wordBreak: "break-all" }}>{newKey}</code>
          <button
            style={{ marginLeft: 10, padding: "2px 8px", fontSize: 10, background: "#22c55e22", border: "1px solid #22c55e44", borderRadius: 4, color: "#22c55e", cursor: "pointer" }}
            onClick={() => { navigator.clipboard.writeText(newKey); }}>Copy</button>
        </div>
      )}

      {/* Create form */}
      <div style={{ background: "#0d1526", border: "1px solid #1c2842", borderRadius: 8, padding: "12px 14px", marginBottom: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>+ 🔑 API 키 발급</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 6, alignItems: "end" }}>
          <input
            style={{ background: "#0f172a", border: "1px solid #1c2842", borderRadius: 6, color: "#e2e8f0", padding: "6px 10px", fontSize: 11 }}
            placeholder="키 이름" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          />
          <select
            style={{ background: "#0f172a", border: "1px solid #1c2842", borderRadius: 6, color: "#e2e8f0", padding: "6px 10px", fontSize: 11 }}
            value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
          >
            {["admin", "analyst", "connector", "viewer"].map(r => <option key={r}>{r}</option>)}
          </select>
          <button className="btn" onClick={create} disabled={!form.name}>발급</button>
        </div>
      </div>
      {msg && <div style={{ color: "#ef4444", fontSize: 11, marginBottom: 8 }}>{msg}</div>}

      {/* Key list */}
      <div style={{ display: "grid", gap: 6 }}>
        {keys.map(k => (
          <div key={k.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: "#0d1526", borderRadius: 7, border: "1px solid #1c2842" }}>
            <span style={{ fontSize: 10, padding: "1px 7px", borderRadius: 4, background: `${ROLE_C[k.role] || "#666"}22`, border: `1px solid ${ROLE_C[k.role] || "#666"}44`, color: ROLE_C[k.role] || "#666", fontWeight: 700, minWidth: 60, textAlign: "center" }}>{k.role}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 600 }}>{k.name}</div>
              <div style={{ fontSize: 10, color: "#7c8fa8", fontFamily: "monospace" }}>{k.key_prefix}••••••</div>
            </div>
            <div style={{ fontSize: 10, color: "#7c8fa8", textAlign: "right" }}>
              {k.last_used_at ? `Last used: ${k.last_used_at.slice(0, 10)}` : "미사용"}
            </div>
            <button onClick={() => rotate(k.id)} style={{ fontSize: 10, padding: "3px 8px", background: "#1c2842", border: "1px solid #3b4d6e", borderRadius: 4, color: "#94a3b8", cursor: "pointer" }}>🔄 Rotate</button>
            <button onClick={() => revoke(k.id)} style={{ fontSize: 10, padding: "3px 8px", background: "#2d0f0f", border: "1px solid #ef444433", borderRadius: 4, color: "#ef4444", cursor: "pointer" }}>❌ Revoke</button>
          </div>
        ))}
        {keys.length === 0 && !loading && <div style={{ color: "#7c8fa8", fontSize: 12, textAlign: "center", padding: 16 }}>API 키가 없습니다 → 위에서 발급하세요</div>}
      </div>
    </div>
  );
}

/* ── Connector Test Panel ─────────────────────────────────────────────────── */
function ConnectorPanel({ apiKey }) {
  const [status, setStatus] = useState(null);
  const [ttResult, setTtResult] = useState(null);
  const [amResult, setAmResult] = useState(null);
  const [ttLoading, setTtLoading] = useState(false);
  const [amLoading, setAmLoading] = useState(false);
  const [ttForm, setTtForm] = useState({ start_date: new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10), end_date: new Date().toISOString().slice(0, 10) });
  const [amForm, setAmForm] = useState({ start_date: new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10), end_date: new Date().toISOString().slice(0, 10) });

  useEffect(() => {
    fetch(`${API}/v421/connectors/status`, { headers: { Authorization: `Bearer ${apiKey}` } })
      .then(r => r.json()).then(setStatus).catch(() => { });
  }, [apiKey]);

  const testTikTok = async () => {
    setTtLoading(true); setTtResult(null);
    const params = new URLSearchParams(ttForm);
    const r = await fetch(`${API}/v421/connectors/tiktok/report?${params}`, { headers: { Authorization: `Bearer ${apiKey}` } });
    setTtResult(await r.json());
    setTtLoading(false);
  };

  const testAmazon = async () => {
    setAmLoading(true); setAmResult(null);
    const r = await fetch(`${API}/v421/connectors/amazon/reports?${new URLSearchParams(amForm)}`, { headers: { Authorization: `Bearer ${apiKey}` } });
    setAmResult(await r.json());
    setAmLoading(false);
  };

  const StatusDot = ({ p }) => {
    const st = status?.providers?.[p];
    if (!st) return null;
    return <span style={{ fontSize: 10, padding: "1px 7px", borderRadius: 4, background: st.connected ? "#22c55e22" : "#ef444422", border: `1px solid ${st.connected ? "#22c55e" : "#ef4444"}55`, color: st.connected ? "#22c55e" : "#ef4444" }}>{st.connected ? (st.via === "env" ? "ENV ✓" : "Token ✓") : "Disconnected"}</span>;
  };

  const DateInput = (label, val, setter) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <label style={{ fontSize: 10, color: "#7c8fa8" }}>{label}</label>
      <input type="date" style={{ background: "#0f172a", border: "1px solid #1c2842", borderRadius: 5, color: "#e2e8f0", padding: "4px 8px", fontSize: 11 }}
        value={val} onChange={e => setter(e.target.value)} />
    </div>
  );

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
      {/* TikTok */}
      <div style={{ background: "#0d1526", border: "1px solid #1c2842", borderRadius: 8, padding: "14px 16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 20 }}>🎵</span>
            <span style={{ fontWeight: 700, fontSize: 13, color: "#a855f7" }}>TikTok Business API</span>
          </div>
          <StatusDot p="tiktok" />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 10 }}>
          {DateInput("Start Date", ttForm.start_date, v => setTtForm(f => ({ ...f, start_date: v })))}
          {DateInput("End Date", ttForm.end_date, v => setTtForm(f => ({ ...f, end_date: v })))}
        </div>
        <button className="btn" style={{ width: "100%", background: "#a855f711", borderColor: "#a855f7" }}
          onClick={testTikTok} disabled={ttLoading}>
          {ttLoading ? "⏳ Requesting…" : "📊 Fetch Report"}
        </button>
        {ttResult && (
          <div style={{ marginTop: 10, fontSize: 11 }}>
            <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
              <span style={{ color: ttResult.live ? "#22c55e" : "#eab308" }}>{ttResult.live ? "🟢 LIVE" : "🟡 MOCK"}</span>
              <span style={{ color: "#7c8fa8" }}>{ttResult.rows?.length ?? 0} items</span>
            </div>
            {ttResult.mock && <div style={{ color: "#7c8fa8", marginBottom: 4 }}>{ttResult.note}</div>}
            {(ttResult.rows || []).slice(0, 3).map((row, i) => (
              <div key={i} style={{ padding: "5px 8px", background: "#0f172a", borderRadius: 5, marginBottom: 3 }}>
                <div style={{ color: "#e2e8f0" }}>{row.dimensions?.stat_time_day}</div>
                <div style={{ color: "#7c8fa8", display: "flex", gap: 8 }}>
                  <span>💰 ${row.metrics?.spend}</span>
                  <span>👆 {row.metrics?.clicks}</span>
                  <span>👁 {row.metrics?.impressions}</span>
                </div>
              </div>
            ))}
            {(ttResult.rows || []).length > 3 && <div style={{ color: "#7c8fa8", fontSize: 10 }}>+{ttResult.rows.length - 3}건 더…</div>}
          </div>
        )}
      </div>

      {/* Amazon */}
      <div style={{ background: "#0d1526", border: "1px solid #1c2842", borderRadius: 8, padding: "14px 16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 20 }}>📦</span>
            <span style={{ fontWeight: 700, fontSize: 13, color: "#eab308" }}>Amazon SP-API</span>
          </div>
          <StatusDot p="amazon" />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 10 }}>
          {DateInput("Start Date", amForm.start_date, v => setAmForm(f => ({ ...f, start_date: v })))}
          {DateInput("End Date", amForm.end_date, v => setAmForm(f => ({ ...f, end_date: v })))}
        </div>
        <button className="btn" style={{ width: "100%", background: "#eab30811", borderColor: "#eab308" }}
          onClick={testAmazon} disabled={amLoading}>
          {amLoading ? "⏳ Requesting…" : "📦 Fetch Reports"}
        </button>
        {amResult && (
          <div style={{ marginTop: 10, fontSize: 11 }}>
            <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
              <span style={{ color: amResult.live ? "#22c55e" : "#eab308" }}>{amResult.live ? "🟢 LIVE" : "🟡 MOCK"}</span>
              <span style={{ color: "#7c8fa8" }}>{amResult.reports?.length ?? 0} Reports</span>
            </div>
            {amResult.mock && <div style={{ color: "#7c8fa8", marginBottom: 4 }}>{amResult.note}</div>}
            {(amResult.reports || []).slice(0, 3).map((rpt, i) => (
              <div key={i} style={{ padding: "5px 8px", background: "#0f172a", borderRadius: 5, marginBottom: 3 }}>
                <div style={{ color: "#e2e8f0", fontFamily: "monospace", fontSize: 10 }}>{rpt.reportId}</div>
                <div style={{ color: "#7c8fa8" }}>{rpt.reportType?.split("_").slice(-3).join("_")} · {rpt.processingStatus}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Main Admin Page ──────────────────────────────────────────────────────── */
/* ── 라이선스 키 Issue Panel ──────────────────────────────────────────────── */
function LicenseKeyPanel() {
  const { token } = useAuth();
  const hdrs = { "Content-Type": "application/json", Authorization: `Bearer ${token || DEMO_ADMIN_KEY}` };
  const [users, setUsers] = useState([]);
  const [keys, setKeys] = useState([]);
  const [selectedUser, setSelectedUser] = useState("");
  const [expiresDays, setExpiresDays] = useState(365);
  const [plan, setPlan] = useState("pro");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ text: "", type: "ok" });

  const showMsg = (text, type = "ok") => { setMsg({ text, type }); setTimeout(() => setMsg({ text: "", type: "ok" }), 4000); };

  const loadUsers = useCallback(() => {
    fetch(`${API}/v423/admin/users`, { headers: hdrs })
      .then(r => r.json())
      .then(d => { if (d.명) setUsers(d.명); })
      .catch(() => {});
  }, [token]);

  const loadKeys = useCallback(() => {
    setLoading(true);
    fetch(`${API}/auth/license/list`, { headers: hdrs })
      .then(r => r.json())
      .then(d => { if (d.keys) setKeys(d.keys); })
      .catch(() => { /* endpoint ignore if endpoint not implemented */ })
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => { loadUsers(); loadKeys(); }, [loadUsers, loadKeys]);

  const handleIssue = async () => {
    if (!selectedUser) { showMsg("사용자를 선택해주세요.", "err"); return; }
    setLoading(true);
    const r = await fetch(`${API}/auth/license`, {
      method: "POST",
      headers: hdrs,
      body: JSON.stringify({ user_id: selectedUser, plan, expires_days: expiresDays }),
    });
    const d = await r.json();
    setLoading(false);
    if (d.ok) {
      showMsg(`✓ License key issued: ${d.license_key || "(서버 Issue)"}`, "ok");
      loadKeys();
    } else {
      showMsg(d.error || "발급 실패", "err");
    }
  };

  return (
    <div style={{ display: "grid", gap: 18 }}>
      {msg.text && (
        <div style={{
          padding: "10px 14px", borderRadius: 8, fontSize: 12, fontWeight: 700,
          background: msg.type === "ok" ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
          border: `1px solid ${msg.type === "ok" ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`,
          color: msg.type === "ok" ? "#22c55e" : "#ef4444",
        }}>{msg.text}</div>
      )}

      {/* Issue 폼 */}
      <div style={{ padding: "18px 20px", borderRadius: 14, background: "rgba(79,142,247,0.06)", border: "1px solid rgba(79,142,247,0.25)" }}>
        <div style={{ fontWeight: 800, fontSize: 14, color: "#93c5fd", marginBottom: 16 }}>🎫 라이선스 키 발급</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 14 }}>
          <div>
            <label style={{ fontSize: 10, color: "#7c8fa8", display: "block", marginBottom: 4, fontWeight: 700 }}>대상 사용자 *</label>
            <select value={selectedUser} onChange={e => setSelectedUser(e.target.value)}
              style={{ width: "100%", background: "#0a1628", border: "1px solid #1e3a5f", borderRadius: 7, color: "#e2e8f0", padding: "8px 10px", fontSize: 12, boxSizing: "border-box" }}>
              <option value="">-- 사용자 선택 --</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.email}) [{u.plan}]</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 10, color: "#7c8fa8", display: "block", marginBottom: 4, fontWeight: 700 }}>발급할 플랜</label>
            <select value={plan} onChange={e => setPlan(e.target.value)}
              style={{ width: "100%", background: "#0a1628", border: "1px solid #1e3a5f", borderRadius: 7, color: "#e2e8f0", padding: "8px 10px", fontSize: 12, boxSizing: "border-box" }}>
              {["pro", "enterprise", "admin"].map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 10, color: "#7c8fa8", display: "block", marginBottom: 4, fontWeight: 700 }}>유효기간 (일)</label>
            <input type="number" min="1" max="3650" value={expiresDays} onChange={e => setExpiresDays(+e.target.value)}
              style={{ width: "100%", background: "#0a1628", border: "1px solid #1e3a5f", borderRadius: 7, color: "#e2e8f0", padding: "8px 10px", fontSize: 12, boxSizing: "border-box" }} />
          </div>
        </div>
        <button onClick={handleIssue} disabled={loading || !selectedUser}
          style={{ padding: "9px 24px", borderRadius: 9, border: "none", background: loading ? "rgba(107,114,128,0.3)" : "linear-gradient(135deg,#4f8ef7,#6366f1)", color: "#fff", fontWeight: 800, fontSize: 12, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1 }}>
          {loading ? "⏳ 발급 중..." : "🎫 라이선스 키 발급"}
        </button>
      </div>

      {/* Issue 현황 */}
      <div style={{ padding: "16px 20px", borderRadius: 14, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}>
        <div style={{ fontWeight: 800, fontSize: 14, color: "#e2e8f0", marginBottom: 14 }}>📋 발급된 라이선스</div>
        {keys.length === 0 ? (
          <div style={{ textAlign: "center", color: "#3b4d6e", padding: "30px 0", fontSize: 13 }}>📭 발급된 라이선스가 없습니다.</div>
        ) : (
          <div style={{ display: "grid", gap: 6 }}>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr auto", gap: 10, padding: "6px 14px", fontSize: 10, fontWeight: 700, color: "#7c8fa8", background: "rgba(255,255,255,0.02)", borderRadius: 8 }}>
              <span>User</span><span>플랜</span><span>만료일</span><span>상태</span><span>작업</span>
            </div>
            {keys.map((k, i) => (
              <div key={k.id || i} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr auto", gap: 10, padding: "10px 14px", borderRadius: 10, alignItems: "center", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 12, color: "#e2e8f0" }}>{k.user_name || k.email}</div>
                  <div style={{ fontSize: 10, color: "#7c8fa8", fontFamily: "monospace" }}>{k.license_key?.slice(0, 16)}••••</div>
                </div>
                <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 4, background: "rgba(79,142,247,0.1)", color: "#4f8ef7", fontWeight: 700 }}>{k.plan}</span>
                <span style={{ fontSize: 10, color: "#7c8fa8" }}>{k.expires_at?.slice(0, 10) || "No Expiry"}</span>
                <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 4, fontWeight: 700, background: k.active ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)", color: k.active ? "#22c55e" : "#ef4444" }}>{k.active ? "활성" : "만료됨"}</span>
                <button style={{ padding: "3px 8px", borderRadius: 5, border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.06)", color: "#ef4444", fontSize: 9, cursor: "pointer", fontWeight: 700 }}>취소</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── 피드백 Management Panel ───────────────────────────────────────────────── */
const DEMO_FEEDBACKS = [
  { id: "fb001", user: "kim@pro.kr", type: "improve", priority: "high", title: "Operations Hub: Batch Product Upload Feature", body: "Currently only one product can be registered at a time, which is inconvenient for bulk registration. Please add CSV batch upload.", menu: "Operations Hub", status: "planned", date: "2026-03-10", adminReply: "CSV upload planned for March release" },
  { id: "fb002", user: "park@enterprise.kr", type: "bug", priority: "urgent", title: "Connectors TikTok Token Refresh Error", body: "Intermittent errors occur when clicking token refresh.", menu: "Connectors", status: "completed", date: "2026-03-05", adminReply: "Fixed (v422.3.1 patch)" },
  { id: "fb003", user: "lee@pro.kr", type: "feature", priority: "medium", title: "Review Sentiment Analysis Excel Export", body: "I would like to download the sentiment analysis results from Reviews & UGC as Excel.", menu: "Reviews & UGC", status: "reviewing", date: "2026-03-12", adminReply: null },
  { id: "fb004", user: "choi@pro.kr", type: "bug", priority: "high", title: "PnL Dashboard Mobile Layout Issue", body: "When accessed on iPad, KPI cards overflow outside the screen.", menu: "P&L Dashboard", status: "pending", date: "2026-03-13", adminReply: null },
  { id: "fb005", user: "jung@enterprise.kr", type: "improve", priority: "low", title: "Request: Collapsible Sidebar Feature", body: "It would be great to fully collapse the sidebar to expand the document area.", menu: "기타", status: "pending", date: "2026-03-13", adminReply: null },
];

const FB_TYPE_CFG = {
  bug:     { icon: "🐛", label: "오류 및 버그",  color: "#ef4444" },
  improve: { icon: "\u2728", label: "개선 사항",      color: "#4f8ef7" },
  feature: { icon: "🚀", label: "기능 요청", color: "#a855f7" },
  other:   { icon: "💬", label: "기타",           color: "#8da4c4" },
};
const FB_PRIO_CFG = {
  low:    { icon: "🔵", label: "낮음",  color: "#4f8ef7" },
  medium: { icon: "🟡", label: "보통",  color: "#eab308" },
  high:   { icon: "🟠", label: "높음",  color: "#f97316" },
  urgent: { icon: "🔴", label: "긴급",  color: "#ef4444" },
};
const FB_STATUS_CFG = {
  pending:   { label: "접수됨",    color: "#eab308" },
  reviewing: { label: "검토 중",   color: "#4f8ef7" },
  planned:   { label: "진행 예정", color: "#a855f7" },
  completed: { label: "완료됨", color: "#22c55e" },
  rejected:  { label: "반려됨",    color: "#ef4444" },
};

function FeedbackMgmtPanel() {
  const { pushNotification } = useNotification();
  const [feedbacks, setFeedbacks] = useState(DEMO_FEEDBACKS);
  const [selected, setSelected] = useState(null);
  const [reply, setReply] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPrio, setFilterPrio] = useState("all");
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const showMsg = (text) => { setMsg(text); setTimeout(() => setMsg(""), 3000); };

  const filtered = useMemo(() => {
    return feedbacks.filter(f => {
      if (filterType !== "all" && f.type !== filterType) return false;
      if (filterStatus !== "all" && f.status !== filterStatus) return false;
      if (filterPrio !== "all" && f.priority !== filterPrio) return false;
      if (search && !f.title.includes(search) && !f.user.includes(search)) return false;
      return true;
    });
  }, [feedbacks, filterType, filterStatus, filterPrio, search]);

  const kpis = useMemo(() => [
    { l: "All", v: feedbacks.length, c: "#4f8ef7" },
    { l: "New", v: feedbacks.filter(f => f.status === "pending").length, c: "#eab308" },
    { l: "검토 중", v: feedbacks.filter(f => f.status === "reviewing").length, c: "#4f8ef7" },
    { l: "완료됨", v: feedbacks.filter(f => f.status === "completed").length, c: "#22c55e" },
  ], [feedbacks]);

  const handleStatusChange = (id, newStatus) => {
    setFeedbacks(prev => prev.map(f => f.id === id ? { ...f, status: newStatus } : f));
    showMsg(`\u2713 Status changed to ${FB_STATUS_CFG[newStatus]?.label}.`);
  };

  const handleReply = async (fb) => {
    if (!reply.trim()) return;
    setSaving(true);
    await new Promise(r => setTimeout(r, 600));
    setFeedbacks(prev => prev.map(f => f.id === fb.id ? { ...f, adminReply: reply, status: "reviewing" } : f));
    pushNotification({
      type: "feedback",
      title: "Admin Reply Saved",
      body: `"${fb.title}" Admin reply has been saved for the feedback.`,
      link: "/feedback",
    });
    showMsg("\u2713 Reply has been saved.");
    setReply("");
    setSelected(null);
    setSaving(false);
  };

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {/* KPI */}
      <div className="grid4">
        {kpis.map(({ l, v, c }) => (
          <div key={l} className="kpi-card" style={{ "--accent": c }}>
            <div className="kpi-label">{l}</div>
            <div className="kpi-value" style={{ color: c }}>{v}건</div>
          </div>
        ))}
      </div>

      {msg && (
        <div style={{ padding: "10px 14px", borderRadius: 8, fontSize: 12, fontWeight: 700, background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)", color: "#22c55e" }}>{msg}</div>
      )}

      {/* Filter */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <input className="input" placeholder="제목 또는 사용자 검색" value={search} onChange={e => setSearch(e.target.value)}
          style={{ width: 180, padding: "6px 10px", fontSize: 11 }} />
        <select className="input" value={filterType} onChange={e => setFilterType(e.target.value)} style={{ width: 120, padding: "6px 10px", fontSize: 11 }}>
          <option value="all">모든 유형</option>
          {Object.entries(FB_TYPE_CFG).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
        </select>
        <select className="input" value={filterPrio} onChange={e => setFilterPrio(e.target.value)} style={{ width: 110, padding: "6px 10px", fontSize: 11 }}>
          <option value="all">모든 우선순위</option>
          {Object.entries(FB_PRIO_CFG).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
        </select>
        <select className="input" value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ width: 110, padding: "6px 10px", fontSize: 11 }}>
          <option value="all">모든 상태</option>
          {Object.entries(FB_STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <span style={{ fontSize: 11, color: "var(--text-3)" }}>{filtered.length}개 항목이 표시됨</span>
      </div>

      {/* List */}
      <div style={{ display: "grid", gap: 6 }}>
        {/* Header */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 90px 70px 70px 80px 80px auto", gap: 8, padding: "6px 12px", fontSize: 10, fontWeight: 700, color: "#7c8fa8", background: "rgba(255,255,255,0.02)", borderRadius: 8 }}>
          <span>사용자 / 제목</span><span>분류</span><span>중요도</span><span>메뉴</span><span>상태</span><span>날짜</span><span>답변</span>
        </div>
        {filtered.map(fb => {
          const tc = FB_TYPE_CFG[fb.type] || {};
          const pc = FB_PRIO_CFG[fb.priority] || {};
          const sc = FB_STATUS_CFG[fb.status] || {};
          const isSelected = selected?.id === fb.id;
          return (
            <div key={fb.id} style={{ borderRadius: 10, background: "rgba(255,255,255,0.02)", border: `1px solid ${isSelected ? "rgba(79,142,247,0.3)" : "rgba(255,255,255,0.06)"}`, overflow: "hidden" }}>
              <div
                onClick={() => { setSelected(isSelected ? null : fb); setReply(fb.adminReply || ""); }}
                style={{ display: "grid", gridTemplateColumns: "1fr 90px 70px 70px 80px 80px auto", gap: 8, padding: "12px 14px", cursor: "pointer", alignItems: "center" }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: 12, color: "var(--text-1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{fb.title}</div>
                  <div style={{ fontSize: 10, color: "#4f8ef7", marginTop: 2 }}>{fb.user}</div>
                </div>
                <span style={{ fontSize: 10, fontWeight: 700, color: tc.color }}>{tc.icon} {tc.label}</span>
                <span style={{ fontSize: 10, fontWeight: 700, color: pc.color }}>{pc.icon} {pc.label}</span>
                <span style={{ fontSize: 10, color: "var(--text-3)" }}>{fb.menu}</span>
                <span style={{ fontSize: 9, padding: "2px 8px", borderRadius: 99, fontWeight: 700, background: `${sc.color}18`, color: sc.color, border: `1px solid ${sc.color}33`, textAlign: "center" }}>{sc.label}</span>
                <span style={{ fontSize: 10, color: "var(--text-3)" }}>{fb.date}</span>
                <span style={{ fontSize: 10, color: "var(--text-3)" }}>{isSelected ? "▲" : "▼"}</span>
              </div>

              {isSelected && (
                <div style={{ padding: "0 14px 14px", borderTop: "1px solid rgba(99,140,255,0.08)" }}>
                  {/* 내용 */}
                  <div style={{ marginTop: 12, padding: "10px 12px", background: "rgba(6,11,20,0.6)", borderRadius: 8, fontSize: 12, color: "var(--text-2)", lineHeight: 1.7, marginBottom: 12 }}>{fb.body}</div>

                  {/* Status Change */}
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-3)", marginBottom: 6 }}>처리 상태</div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {Object.entries(FB_STATUS_CFG).map(([k, v]) => (
                        <button key={k} onClick={() => handleStatusChange(fb.id, k)}
                          style={{
                            padding: "4px 12px", borderRadius: 99, fontSize: 10, cursor: "pointer", fontWeight: 700,
                            background: fb.status === k ? `${v.color}22` : "rgba(255,255,255,0.03)",
                            border: `1px solid ${fb.status === k ? v.color : "rgba(99,140,255,0.12)"}`,
                            color: fb.status === k ? v.color : "var(--text-3)",
                          }}>{v.label}</button>
                      ))}
                    </div>
                  </div>

                  {/* Admin 답변 */}
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-3)", marginBottom: 6 }}>\uad00\ub9ac\uc790 \ub2f5\ubcc0</div>
                    {fb.adminReply && (
                      <div style={{ marginBottom: 8, padding: "8px 10px", background: "rgba(79,142,247,0.06)", border: "1px solid rgba(79,142,247,0.2)", borderRadius: 8, fontSize: 12, color: "var(--text-2)", lineHeight: 1.6 }}>{fb.adminReply}</div>
                    )}
                    <textarea className="input" value={reply} onChange={e => setReply(e.target.value)}
                      placeholder="\ub2f5\ubcc0\uc744 \uc785\ub825\ud558\uc138\uc694..."
                      rows={3} style={{ width: "100%", padding: "8px 10px", fontSize: 12, resize: "vertical", marginBottom: 8 }} />
                    <button className="btn-primary" onClick={() => handleReply(fb)} disabled={saving || !reply.trim()}
                      style={{ padding: "7px 18px", fontSize: 11, opacity: saving ? 0.7 : 1 }}>
                      {saving ? "\uc800\uc7a5 \uc911..." : "\ud53c\ub4dc\ubc31 \ub2f5\ubcc0 \ub4f1\ub85d"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-3)", fontSize: 13 }}>\uc811\uc218\ub41c \ud53c\ub4dc\ubc31\uc774 \uc5c6\uc2b5\ub2c8\ub2e4</div>
        )}
      </div>
    </div>
  );
}

/* ── Free 쿠폰 발급 여정 관리 Panel ────────────────────────────────────────── */
const PLAN_OPTIONS  = [
  { v:"growth",     l:"Growth",      d:30 },
  { v:"starter",   l:"Starter",     d:7 },
  { v:"pro",       l:"Pro",         d:30 },
  { v:"enterprise",l:"Enterprise",  d:30 }
];

const DURATION_OPTS = [7,14,30,60,90,180,365];

const DEMO_USERS = [
  { id:1, email:"kim@demo.kr",  name:"James Kim", plan:"demo",       is_active:1 },
  { id:2, email:"lee@free.kr",  name:"Sarah Lee", plan:"free",       is_active:1 },
  { id:3, email:"park@pro.kr",  name:"Min-jun Park", plan:"demo",       is_active:1 },
  { id:4, email:"choi@ex.kr",   name:"Soo-hyun Choi", plan:"starter",   is_active:1 },
  { id:5, email:"jung@ex.kr",   name:"Sung-hwa Jung", plan:"demo",       is_active:0 },
];

let _demoCoups = [
  { id:1, code:"GENIE-FREE-AB1C2D3E", plan:"pro", duration_days:30, max_uses:1, use_count:0, issued_to_email:"kim@demo.kr", note:"30-day gift for new signups", is_revoked:0, redeemed_at:null, created_at:"2026-03-14" },
  { id:2, code:"GENIE-FREE-FF001122", plan:"starter", duration_days:7,  max_uses:1, use_count:1, issued_to_email:"lee@free.kr",  note:"Coupon Test",     is_revoked:0, redeemed_at:"2026-03-14", created_at:"2026-03-13" },
];

/* ── Auto 규칙 BasicValue ── */
const DEFAULT_RULES = [
  {
    trigger: "signup",
    trigger_label: "On New Signup",
    trigger_icon: "🆕",
    trigger_desc: "Free(demo) 회원이 신규 가입할 때 Auto으로 Coupon을 Issue합니다",
    is_active: false,
    plan: "starter",
    duration_days: 7,
    max_uses: 1,
    note: "신규가입 환영 Coupon",
  },
  {
    trigger: "upgrade",
    trigger_label: "Paid Plan Conversion 시",
    trigger_icon: "⬆️",
    trigger_desc: "Free/Demo 회원이 Paid Plan(Starter/Pro/Enterprise)으로 업그레이드할 때 Auto Issue합니다",
    is_active: false,
    plan: "pro",
    duration_days: 30,
    max_uses: 1,
    note: "PaidConversion 감사 Coupon",
  },
  {
    trigger: "renewal",
    trigger_label: "Paid 연장·갱신 시",
    trigger_icon: "🔄",
    trigger_desc: "Paid Subscription을 연장하거나 갱신할 때 Auto으로 보너스 Coupon을 Issue합니다",
    is_active: false,
    plan: "pro",
    duration_days: 14,
    max_uses: 1,
    note: "갱신 감사 보너스 Coupon",
  },
];

function CouponMgmtPanel() {
  const { token } = useAuth();
  const { pushNotification } = useNotification();
  const authKey = token || DEMO_ADMIN_KEY;
  const hdrs = { "Content-Type":"application/json", Authorization:`Bearer ${authKey}` };
  const isDemo = !token || token === DEMO_ADMIN_KEY;

  const [users,   setUsers]   = useState(DEMO_USERS);
  const [coupons, setCoupons] = useState(_demoCoups);
  const [search,  setSearch]  = useState("");
  const [selUser, setSelUser] = useState(null);
  const [form,    setForm]    = useState({ plan:"pro", duration_days:30, max_uses:1, note:"" });
  const [busy,    setBusy]    = useState(false);
  const [msg,     setMsg]     = useState(null);
  const [view,    setView]    = useState("issue"); // "issue" | "list" | "rules"

  // Auto 규칙 state
  const [rules, setRules]     = useState(DEFAULT_RULES);
  const [rulesBusy, setRulesBusy] = useState(false);

  const flash = (text, ok=true) => { setMsg({text,ok}); setTimeout(()=>setMsg(null),4000); };

  // 회원 List 불러오기 (All 유저 Search — plan 컬럼으로 free/demo 구분)
  useEffect(()=>{
    if (isDemo) return;
    fetch(`/api/v423/admin/users?limit=200`, { headers:hdrs })
      .then(r=>r.json()).then(d=>{ if(d.명) setUsers(d.명); }).catch(()=>{});
  }, []);


  // Coupon List
  useEffect(()=>{
    if (isDemo) { setCoupons(_demoCoups); return; }
    fetch(`/api/v423/admin/coupons?limit=50`, { headers:hdrs })
      .then(r=>r.json()).then(d=>{ if(d.coupons) setCoupons(d.coupons); }).catch(()=>{});
  }, [view]);

  const filtered = users.filter(u =>
    !search || u.email.includes(search) || (u.name||'').includes(search)
  );

  const handleIssue = async () => {
    if (!selUser) { flash("회원을 Select하세요",false); return; }
    setBusy(true);
    try {
      if (isDemo) {
        await new Promise(r=>setTimeout(r,700));
        const code = 'GENIE-FREE-' + Math.random().toString(36).slice(2,10).toUpperCase();
        const isFreeMember = ['demo','free'].includes(selUser.plan);
        const c = { id:_demoCoups.length+1, code, plan:form.plan,
          duration_days:form.duration_days, max_uses:form.max_uses, use_count:0,
          issued_to_email:selUser.email,
          note: isFreeMember ? (form.note ? form.note + ' [profile_required]' : '[profile_required]') : form.note,
          is_revoked:0, redeemed_at:null, created_at:new Date().toISOString().slice(0,10) };
        _demoCoups = [c,..._demoCoups];
        setCoupons([c,...coupons]);
        const extraMsg = isFreeMember
          ? `
import { useI18n } from '../i18n/index.js';\n⚠️ Free회원 → Coupon [${code}] 사용 전 비즈니스 Info를 반드시 Register해야 합니다.`
          : '';
        flash(`✓ Coupon Issue Done: ${code}${extraMsg}`);
        pushNotification({ type:"alert", title:"Coupon Issue", body:`${selUser.email}님게 ${form.plan} ${form.duration_days}일짜리 Coupon이 Issue되었습니다.`, link:"/admin" });
        setSelUser(null);
      } else {
        const r = await fetch(`/api/v423/admin/coupons`, {
          method:"POST", headers:hdrs,
          body:JSON.stringify({ user_id:selUser.id, plan:form.plan, duration_days:form.duration_days, max_uses:form.max_uses, note:form.note }),
        });
        const d = await r.json();
        if (!d.ok) { flash(d.error||'Error',false); return; }
        const extraMsg = d.requires_profile
          ? `\n⚠️ Free회원 → Coupon [${d.code}] 사용 전 비즈니스 Info Register이 필Count입니다.`
          : '';
        flash(`✓ Coupon Issue: ${d.code}${extraMsg}`);
        pushNotification({ type:"alert", title:"Coupon Issue", body:`${selUser.email}`, link:"/admin" });
        setSelUser(null);
      }
    } finally { setBusy(false); }
  };


  const handleRevoke = async (coupon) => {
    if (!confirm(`Coupon ${coupon.code}를 Cancel하시겠습니까?`)) return;
    if (isDemo) {
      _demoCoups = _demoCoups.map(c => c.id===coupon.id ? {...c,is_revoked:1} : c);
      setCoupons(prev=>prev.map(c=>c.id===coupon.id?{...c,is_revoked:1}:c));
      flash('파 Cancel되었습니다');
      return;
    }
    const r = await fetch(`/api/v423/admin/coupons/${coupon.id}/revoke`, { method:"POST", headers:hdrs });
    const d = await r.json();
    if (d.ok) { flash(d.message); setCoupons(prev=>prev.map(c=>c.id===coupon.id?{...c,is_revoked:1}:c)); }
    else flash(d.error||'Error',false);
  };

  const kpis = useMemo (()=>[
    { l:"All Issue", v:coupons.length,                                          c:"#4f8ef7" },
    { l:"사용 가능", v:coupons.filter(c=>!c.is_revoked&&!c.redeemed_at).length, c:"#22c55e" },
    { l:"사용 Done", v:coupons.filter(c=>c.redeemed_at).length,                c:"#a855f7" },
    { l:"취 소됨",   v:coupons.filter(c=>c.is_revoked).length,                  c:"#ef4444" },
  ],[coupons]);

  return (
    <div style={{ display:"grid", gap:16 }}>
      {/* KPI */}
      <div className="grid4">
        {kpis.map(({l,v,c})=>(
          <div key={l} className="kpi-card" style={{"--accent":c}}>
            <div className="kpi-label">{l}</div>
            <div className="kpi-value" style={{color:c}}>{v}</div>
          </div>
        ))}
      </div>

      {msg && (
        <div style={{ padding:"10px 14px", borderRadius:8, fontSize:12, fontWeight:700,
          background: msg.ok ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
          border: `1px solid ${msg.ok?"rgba(34,197,94,0.3)":"rgba(239,68,68,0.3)"}`,
          color: msg.ok ? "#22c55e" : "#ef4444" }}>{msg.text}</div>
      )}

      {/* Tab */}
      <div style={{ display:"flex", gap:0, background:"rgba(0,0,0,0.3)", borderRadius:10, overflow:"hidden", border:"1px solid rgba(99,140,255,0.15)" }}>
        {[
          {k:"issue", l:"🎁 Coupon Issue"},
          {k:"list",  l:"📋 Issue 내역"},
          {k:"rules", l:"⚙️ Auto Issue 규칙"},
        ].map(t=>(
          <button key={t.k} onClick={()=>setView(t.k)} style={{
            flex:1, padding:"10px 0", fontSize:12, fontWeight:700, cursor:"pointer",
            background: view===t.k ? "rgba(79,142,247,0.15)" : "transparent",
            border:"none", color: view===t.k ? "#4f8ef7" : "var(--text-3)",
            borderBottom: view===t.k ? "2px solid #4f8ef7" : "2px solid transparent",
          }}>{t.l}</button>
        ))}
      </div>

      {/* ── Coupon Issue 폼 ── */}
      {view==="issue" && (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
          {/* 좌: 회원 Search */}
          <div className="card card-glass" style={{ padding:"16px 18px" }}>
            <div style={{ fontWeight:800, fontSize:13, marginBottom:12 }}>👤 회원 Select</div>
            <input className="input" placeholder="Email 또는 Name Search..." value={search}
              onChange={e=>setSearch(e.target.value)}
              style={{ width:"100%", padding:"7px 10px", fontSize:11, marginBottom:8 }} />
            <div style={{ display:"grid", gap:5, maxHeight:280, overflowY:"auto" }}>
              {filtered.length===0 && <div style={{ fontSize:11, color:"var(--text-3)", textAlign:"center", padding:20 }}>Search 결과가 없습니다</div>}
              {filtered.map(u=>(
                <div key={u.id} onClick={()=>setSelUser(selUser?.id===u.id?null:u)}
                  style={{
                    padding:"9px 12px", borderRadius:9, cursor:"pointer",
                    background: selUser?.id===u.id ? "rgba(79,142,247,0.15)" : "rgba(255,255,255,0.02)",
                    border: `1px solid ${selUser?.id===u.id ? "rgba(79,142,247,0.4)" : "rgba(255,255,255,0.06)"}`,
                    display:"flex", alignItems:"center", gap:10, transition:"all 150ms",
                  }}>
                  <div style={{ width:32, height:32, borderRadius:"50%", background:"rgba(79,142,247,0.15)",
                    display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, flexShrink:0 }}>
                    {(u.name||u.email)[0].toUpperCase()}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:700, fontSize:12, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{u.name||'(NameNone)'}</div>
                    <div style={{ fontSize:10, color:"#4f8ef7", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{u.email}</div>
                  </div>
                  <span style={{ fontSize:9, padding:"2px 7px", borderRadius:99, fontWeight:700,
                    background: u.plan==="pro"||u.plan==="enterprise" ? "rgba(168,85,247,0.15)" : "rgba(234,179,8,0.15)",
                    color:       u.plan==="pro"||u.plan==="enterprise" ? "#a855f7" : "#eab308",
                  }}>{u.plan||"free"}</span>
                  {selUser?.id===u.id && <span style={{color:"#4f8ef7",fontSize:16}}>✓</span>}
                </div>
              ))}
            </div>
            {selUser && (
              <div style={{ marginTop:10, padding:"8px 12px", borderRadius:8, background:"rgba(34,197,94,0.07)", border:"1px solid rgba(34,197,94,0.25)", fontSize:11 }}>
                ✅ <strong style={{color:"#22c55e"}}>{selUser.name}</strong> ({selUser.email}) Select됨
              </div>
            )}
            {/* Free회원 Pro필 필Count 안내 */}
            {selUser && ['demo','free'].includes(selUser.plan) && (
              <div style={{ marginTop:8, padding:"10px 12px", borderRadius:8, background:"rgba(234,179,8,0.08)", border:"1px solid rgba(234,179,8,0.25)", fontSize:11, color:"#ca8a04", lineHeight:1.6 }}>
                ⚠️ <strong>Free회원 Coupon 조건:</strong> 이 회원이 Coupon을 사용하려면 <strong>비즈니스 Info(회사명·Phone·대표자 명)</strong>를 먼저 Register해야 합니다. 미Register 시 Coupon Activate가 Auto Block됩니다.
              </div>
            )}
          </div>

          {/* 우: Coupon Issue 폼 */}
          <div className="card card-glass" style={{ padding:"16px 18px", display:"grid", gap:14 }}>
            <div style={{ fontWeight:800, fontSize:13 }}>🎁 Coupon Settings</div>

            <div>
              <label style={{ fontSize:11, color:"var(--text-3)", fontWeight:700, display:"block", marginBottom:6 }}>Apply Plan</label>
              <div style={{ display:"grid", gap:6 }}>
                {[
                  { v:"growth",      l:"Growth",      sub:"핵심 Feature 이용권",    c:"#22c55e" },
                  { v:"starter",     l:"Starter",     sub:"Basic Feature 이용권",    c:"#4f8ef7" },
                  { v:"pro",         l:"Pro",         sub:"All Feature 이용권",    c:"#a855f7" },
                  { v:"enterprise",  l:"Enterprise",  sub:"Enterprise 이용권", c:"#f59e0b" },
                ].map(p=>(
                  <button key={p.v} onClick={()=>setForm(f=>({...f,plan:p.v}))}
                    style={{
                      padding:"10px 14px", borderRadius:9, cursor:"pointer", textAlign:"left",
                      background: form.plan===p.v ? `${p.c}1A` : "rgba(255,255,255,0.02)",
                      border: `1.5px solid ${form.plan===p.v ? p.c : "rgba(99,140,255,0.1)"}`,
                      display:"flex", alignItems:"center", gap:10,
                    }}>
                    <span style={{ width:8, height:8, borderRadius:"50%", background:p.c, display:"inline-block", flexShrink:0 }}/>
                    <div>
                      <div style={{ fontWeight:700, fontSize:12 }}>{p.l}</div>
                      <div style={{ fontSize:10, color:"var(--text-3)" }}>{p.sub}</div>
                    </div>
                    {form.plan===p.v && <span style={{ marginLeft:"auto", color:p.c }}>✓</span>}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label style={{ fontSize:11, color:"var(--text-3)", fontWeight:700, display:"block", marginBottom:6 }}>이용 Period</label>
              <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                {DURATION_OPTS.map(d=>(
                  <button key={d} onClick={()=>setForm(f=>({...f,duration_days:d}))}
                    style={{
                      padding:"6px 14px", borderRadius:99, fontSize:11, fontWeight:700, cursor:"pointer",
                      background: form.duration_days===d ? "rgba(79,142,247,0.2)" : "rgba(255,255,255,0.03)",
                      border: `1px solid ${form.duration_days===d?"#4f8ef7":"rgba(99,140,255,0.12)"}`,
                      color: form.duration_days===d ? "#4f8ef7" : "var(--text-3)",
                    }}>{d}일</button>
                ))}
              </div>
            </div>

            <div>
              <label style={{ fontSize:11, color:"var(--text-3)", fontWeight:700, display:"block", marginBottom:6 }}>Issue Note (내부용)</label>
              <input className="input" placeholder="예: 2026년 3월 Event 당첨자 Coupon"
                value={form.note} onChange={e=>setForm(f=>({...f,note:e.target.value}))}
                style={{ width:"100%", padding:"8px 10px", fontSize:11 }} />
            </div>

            {/* 미리보기 */}
            <div style={{ padding:"12px 14px", borderRadius:10,
              background:"linear-gradient(135deg,rgba(79,142,247,0.06),rgba(168,85,247,0.04))",
              border:"1px solid rgba(79,142,247,0.2)" }}>
              <div style={{ fontSize:11, fontWeight:700, color:"#4f8ef7", marginBottom:6 }}>📋 Issue 미리보기</div>
              <div style={{ fontSize:11, color:"var(--text-2)", lineHeight:1.8 }}>
                <div>Count신자: <strong style={{color:"#e2e8f0"}}>{selUser ? `${selUser.name} (${selUser.email})` : "미Select"}</strong></div>
                <div>Plan: <strong style={{color:"#a855f7"}}>{form.plan}</strong> · Period: <strong style={{color:"#4f8ef7"}}>{form.duration_days}일</strong></div>
                <div>코드: <code style={{fontFamily:"monospace",color:"#f59e0b",fontSize:10}}>GENIE-FREE-XXXXXXXX</code> 형식으로 Auto Generate</div>
              </div>
            </div>

            <button onClick={handleIssue} disabled={busy||!selUser}
              style={{
                padding:"13px 0", borderRadius:12, border:"none",
                background: selUser ? "linear-gradient(135deg,#4f8ef7,#a855f7)" : "rgba(99,140,255,0.1)",
                color: selUser ? "#fff" : "var(--text-3)",
                fontWeight:800, fontSize:14, cursor: selUser?"pointer":"not-allowed",
                boxShadow: selUser ? "0 6px 20px rgba(79,142,247,0.3)" : "none",
              }}>
              {busy ? "⏳ 발급 중..." : "🎁 Free 이용 Coupon Issue"}
            </button>
          </div>
        </div>
      )}

      {/* ── 에서 List ── */}
      {view==="list" && (
        <div style={{ display:"grid", gap:8 }}>
          <div style={{ display:"grid", gridTemplateColumns:"2fr 70px 60px 60px 80px 80px 60px auto",
            gap:8, padding:"6px 12px", fontSize:10, fontWeight:700, color:"#7c8fa8",
            background:"rgba(255,255,255,0.02)", borderRadius:8 }}>
            <span>코드 / Count신자</span><span>플랜</span><span>Period</span><span>사용</span><span>상태</span><span>Issue일</span><span>소진</span><span>Action</span>
          </div>
          {coupons.length===0 && <div style={{textAlign:"center",padding:40,color:"var(--text-3)",fontSize:12}}>Issue된 Coupon이 없습니다</div>}
          {coupons.map(c=>{
            const status = c.is_revoked ? {l:"Cancel됨",col:"#ef4444"}
              : c.redeemed_at ? {l:"사용됨",col:"#a855f7"}
              : {l:"유효",col:"#22c55e"};
            return (
              <div key={c.id} style={{
                display:"grid", gridTemplateColumns:"2fr 70px 60px 60px 80px 80px 60px auto",
                gap:8, padding:"11px 13px", borderRadius:10, alignItems:"center",
                background:"rgba(255,255,255,0.02)", border:`1px solid ${c.is_revoked?"rgba(239,68,68,0.15)":"rgba(255,255,255,0.06)"}`,
              }}>
                <div>
                  <div style={{ fontFamily:"monospace", fontSize:10, color:"#f59e0b", fontWeight:700 }}>{c.code}</div>
                  <div style={{ fontSize:10, color:"#4f8ef7", marginTop:2 }}>{c.issued_to_email||"범용"}</div>
                  {c.note && <div style={{ fontSize:9, color:"var(--text-3)", marginTop:1 }}>{c.note}</div>}
                </div>
                <span style={{ fontSize:10, fontWeight:700, color:"#a855f7" }}>{c.plan}</span>
                <span style={{ fontSize:10, color:"var(--text-2)" }}>{c.duration_days}일</span>
                <span style={{ fontSize:10 }}>{c.use_count}/{c.max_uses}</span>
                <span style={{ fontSize:9, padding:"2px 8px", borderRadius:99, fontWeight:700,
                  background:`${status.col}18`, color:status.col, border:`1px solid ${status.col}33`,
                  textAlign:"center" }}>{status.l}</span>
                <span style={{ fontSize:10, color:"var(--text-3)" }}>{c.created_at?.slice(0,10)}</span>
                <span style={{ fontSize:10, color:c.redeemed_at?"#a855f7":"var(--text-3)" }}>
                  {c.redeemed_at ? "✓" : "-"}
                </span>
                {!c.is_revoked && !c.redeemed_at ? (
                  <button onClick={()=>handleRevoke(c)} style={{
                    fontSize:9, color:"#ef4444", background:"rgba(239,68,68,0.07)",
                    border:"1px solid rgba(239,68,68,0.25)", borderRadius:5,
                    cursor:"pointer", padding:"3px 8px", fontWeight:700,
                  }}>취소</button>
                ) : <span/>}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Auto Issue 규칙 Tab ── */}
      {view==="rules" && (
        <div style={{ display:"grid", gap:16 }}>

          {/* 안내 Banner */}
          <div style={{ padding:"14px 18px", borderRadius:12,
            background:"linear-gradient(135deg,rgba(79,142,247,0.06),rgba(168,85,247,0.04))",
            border:"1px solid rgba(79,142,247,0.2)" }}>
            <div style={{ fontWeight:800, fontSize:13, marginBottom:6 }}>⚙️ Auto Coupon Issue 규칙 Settings</div>
            <div style={{ fontSize:11, color:"var(--text-2)", lineHeight:1.7 }}>
              아래 3가지 Event 발생 시 회원에게 Auto으로 Free Coupon이 Issue됩니다.<br/>
              각 규칙을 Activate하고 Issue할 Plan과 Period을 Settings하세요.
            </div>
          </div>

          {/* 규칙 Card List */}
          {rules.map((rule, idx) => (
            <div key={rule.trigger} className="card card-glass" style={{
              padding:"18px 20px",
              border:`1.5px solid ${rule.is_active ? "rgba(34,197,94,0.3)" : "rgba(99,140,255,0.12)"}`,
              transition:"border-color 200ms",
            }}>
              {/* Header */}
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
                <div style={{ display:"flex", gap:10, alignItems:"center" }}>
                  <span style={{ fontSize:22 }}>{rule.trigger_icon}</span>
                  <div>
                    <div style={{ fontWeight:800, fontSize:14, color: rule.is_active ? "#22c55e" : "var(--text-1)" }}>
                      {rule.trigger_label}
                    </div>
                    <div style={{ fontSize:11, color:"var(--text-3)", marginTop:2 }}>{rule.trigger_desc}</div>
                  </div>
                </div>
                {/* ON/OFF Toggle */}
                <button
                  onClick={() => setRules(prev => prev.map((r,i) => i===idx ? {...r, is_active:!r.is_active} : r))}
                  style={{
                    padding:"7px 18px", borderRadius:99, fontSize:12, fontWeight:800, cursor:"pointer",
                    background: rule.is_active ? "rgba(34,197,94,0.15)" : "rgba(99,140,255,0.08)",
                    border: `1.5px solid ${rule.is_active ? "#22c55e" : "rgba(99,140,255,0.2)"}`,
                    color: rule.is_active ? "#22c55e" : "var(--text-3)",
                    transition:"all 150ms",
                  }}
                >
                  {rule.is_active ? "✓ Active" : "OFF"}
                </button>
              </div>

              {/* Settings 영역 */}
              <div style={{
                display:"grid", gridTemplateColumns:"1fr 1fr", gap:14,
                opacity: rule.is_active ? 1 : 0.4, pointerEvents: rule.is_active ? "all" : "none",
                transition:"opacity 200ms",
              }}>
                {/* Plan to Issue */}
                <div>
                  <label style={{ fontSize:11, color:"var(--text-3)", fontWeight:700, display:"block", marginBottom:8 }}>발급할 플랜</label>
                  <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                    {[
                      {v:"starter",l:"Starter",c:"#4f8ef7"},
                      {v:"growth", l:"Growth", c:"#22c55e"},
                      {v:"pro",    l:"Pro",    c:"#a855f7"},
                      {v:"enterprise",l:"ENT", c:"#f59e0b"},
                    ].map(p=>(
                      <button key={p.v}
                        onClick={() => setRules(prev => prev.map((r,i) => i===idx ? {...r, plan:p.v} : r))}
                        style={{
                          padding:"5px 12px", borderRadius:99, fontSize:11, fontWeight:700, cursor:"pointer",
                          background: rule.plan===p.v ? `${p.c}1A` : "rgba(255,255,255,0.03)",
                          border:`1px solid ${rule.plan===p.v ? p.c : "rgba(99,140,255,0.12)"}`,
                          color: rule.plan===p.v ? p.c : "var(--text-3)",
                        }}
                      >{p.l}</button>
                    ))}
                  </div>
                </div>

                {/* Issue Period */}
                <div>
                  <label style={{ fontSize:11, color:"var(--text-3)", fontWeight:700, display:"block", marginBottom:8 }}>이용 Period</label>
                  <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                    {[7,14,30,60,90].map(d=>(
                      <button key={d}
                        onClick={() => setRules(prev => prev.map((r,i) => i===idx ? {...r, duration_days:d} : r))}
                        style={{
                          padding:"5px 12px", borderRadius:99, fontSize:11, fontWeight:700, cursor:"pointer",
                          background: rule.duration_days===d ? "rgba(79,142,247,0.18)" : "rgba(255,255,255,0.03)",
                          border:`1px solid ${rule.duration_days===d ? "#4f8ef7" : "rgba(99,140,255,0.12)"}`,
                          color: rule.duration_days===d ? "#4f8ef7" : "var(--text-3)",
                        }}
                      >{d}일</button>
                    ))}
                  </div>
                </div>

                {/* Note */}
                <div style={{ gridColumn:"1/-1" }}>
                  <label style={{ fontSize:11, color:"var(--text-3)", fontWeight:700, display:"block", marginBottom:6 }}>Issue Note (Coupon note 필드)</label>
                  <input className="input" value={rule.note}
                    onChange={e => setRules(prev => prev.map((r,i) => i===idx ? {...r, note:e.target.value} : r))}
                    placeholder="예: 신규가입 환영 7일 Free 체험"
                    style={{ width:"100%", padding:"7px 10px", fontSize:11 }} />
                </div>
              </div>

              {/* 규칙 미리보기 */}
              {rule.is_active && (
                <div style={{ marginTop:12, padding:"9px 12px", borderRadius:8,
                  background:"rgba(34,197,94,0.05)", border:"1px solid rgba(34,197,94,0.2)",
                  fontSize:11, color:"var(--text-2)", lineHeight:1.7 }}>
                  ✅ <strong style={{color:"#22c55e"}}>{t('super.aaActive')}</strong> · {rule.trigger_label}에 <strong>{rule.plan}</strong> Plan <strong>{rule.duration_days}일</strong> Coupon(GENIE-FREE-XXXXXX) Auto Issue
                </div>
              )}
            </div>
          ))}

          {/* 대량 Issue / Save Button */}
          <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
            <button
              onClick={async () => {
                setRulesBusy(true);
                try {
                  if (isDemo) {
                    await new Promise(r=>setTimeout(r,800));
                    flash("✓ Auto Issue 규칙이 Save되었습니다 (Demo Mode)");
                  } else {
                    const r = await fetch(`/api/v423/admin/coupon-rules`, {
                      method:"POST", headers:hdrs,
                      body:JSON.stringify({ rules }),
                    });
                    const d = await r.json();
                    if (d.ok) flash("✓ Auto Issue 규칙 Save Done");
                    else flash(d.error||"Save Failed", false);
                  }
                } finally { setRulesBusy(false); }
              }}
              disabled={rulesBusy}
              style={{
                padding:"11px 28px", borderRadius:12, border:"none", cursor:"pointer",
                background:"linear-gradient(135deg,#22c55e,#16a34a)",
                color:"#fff", fontWeight:800, fontSize:13,
                boxShadow:"0 6px 20px rgba(34,197,94,0.25)",
                opacity: rulesBusy ? 0.7 : 1,
              }}
            >
              {rulesBusy ? "⏳ Save in progress..." : "💾 규칙 Save"}
            </button>

            {/* Active 규칙 기반 일괄 Issue */}
            <button
              onClick={async () => {
                const activeRules = rules.filter(r=>r.is_active);
                if (activeRules.length===0) { flash("Activate된 규칙이 없습니다. 먼저 규칙을 ON으로 Settings하세요.", false); return; }
                if (!confirm(`현재 Active 규칙(${activeRules.map(r=>r.trigger_label).join(", ")})을 기반으로 대상 회원에게 일괄 Coupon을 Issue하시겠습니까?`)) return;
                setBusy(true);
                try {
                  if (isDemo) {
                    await new Promise(r=>setTimeout(r,1000));
                    const newCoupons = users.slice(0,3).map((u,i) => ({
                      id:_demoCoups.length+i+1,
                      code:`GENIE-FREE-${Math.random().toString(36).slice(2,10).toUpperCase()}`,
                      plan:activeRules[0].plan, duration_days:activeRules[0].duration_days,
                      max_uses:1, use_count:0, issued_to_email:u.email,
                      note:activeRules[0].note, is_revoked:0, redeemed_at:null,
                      created_at:new Date().toISOString().slice(0,10),
                    }));
                    _demoCoups = [...newCoupons, ..._demoCoups];
                    setCoupons(prev => [...newCoupons, ...prev]);
                    flash(`✓ ${newCoupons.length}명에게 Coupon이 일괄 Issue되었습니다 (Demo)`);
                    pushNotification({type:"alert",title:"일괄 Coupon Issue",body:`${newCoupons.length}명 대상 Auto Issue Done`,link:"/admin"});
                  } else {
                    const r = await fetch(`/api/v423/admin/coupons/batch-issue`, {
                      method:"POST", headers:hdrs,
                      body:JSON.stringify({ rules: activeRules }),
                    });
                    const d = await r.json();
                    if (d.ok) flash(`✓ ${d.issued_count||"??"}건 일괄 Issue Done`);
                    else flash(d.error||"발급 실패", false);
                  }
                } finally { setBusy(false); }
              }}
              disabled={busy}
              style={{
                padding:"11px 28px", borderRadius:12, border:"none", cursor:"pointer",
                background:"linear-gradient(135deg,#4f8ef7,#6366f1)",
                color:"#fff", fontWeight:800, fontSize:13,
                boxShadow:"0 6px 20px rgba(79,142,247,0.25)",
                opacity: busy ? 0.7 : 1,
              }}
            >
              {busy ? "⏳ 발급 중..." : "🚀 대상 회원 일괄 Coupon Issue"}
            </button>
          </div>

          {/* 현재 규칙 Summary */}
          <div style={{ padding:"14px 18px", borderRadius:12,
            background:"rgba(255,255,255,0.02)", border:"1px solid rgba(99,140,255,0.1)" }}>
            <div style={{ fontWeight:700, fontSize:12, marginBottom:10, color:"var(--text-2)" }}>📋 현재 규칙 Summary</div>
            <div style={{ display:"grid", gap:6 }}>
              {rules.map(r=>(
                <div key={r.trigger} style={{
                  display:"flex", alignItems:"center", gap:10, padding:"8px 12px",
                  borderRadius:8, background:"rgba(255,255,255,0.02)",
                  border:`1px solid ${r.is_active?"rgba(34,197,94,0.2)":"rgba(99,140,255,0.08)"}`,
                }}>
                  <span>{r.trigger_icon}</span>
                  <span style={{ flex:1, fontSize:12, fontWeight:700, color:r.is_active?"var(--text-1)":"var(--text-3)" }}>{r.trigger_label}</span>
                  <span style={{ fontSize:10, padding:"2px 8px", borderRadius:99, fontWeight:700,
                    background:r.is_active?"rgba(34,197,94,0.1)":"rgba(99,140,255,0.07)",
                    color:r.is_active?"#22c55e":"var(--text-3)",
                    border:`1px solid ${r.is_active?"rgba(34,197,94,0.25)":"rgba(99,140,255,0.15)"}`,
                  }}>{r.is_active?`${r.plan} · ${r.duration_days}일`:"비활성"}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Event Popup Management Panel ───────────────────────────────────────────── */
let _demoPopups = [
  {
    id: 1, title: "🎉 3월 봄맞이 Event", body: "3월 한 달간 Pro Plan 가입 시\n첫 달 <b>50% 할인</b> 혜택을 드립니다!",
    image_url: "", badge_text: "LIMITED", badge_color: "rgba(250,204,21,0.2)",
    cta_text: "지금 업그레이드", cta_url: "/pricing", cta_color: "linear-gradient(135deg,#f59e0b,#f97316)", cta_new_tab: false,
    start_date: "2026-03-01", end_date: "2026-03-31",
    is_active: 1, width: 480, created_at: "2026-03-01",
  },
];
let _nextPopupId = 2;

function PopupMgmtPanel() {
  const { token } = useAuth();
  const { pushNotification } = useNotification();
  const authKey = token || DEMO_ADMIN_KEY;
  const hdrs = { "Content-Type": "application/json", Authorization: `Bearer ${authKey}` };
  const isDemo = !token || token === DEMO_ADMIN_KEY;

  const today = new Date().toISOString().slice(0, 10);

  const [popups, setPopups] = useState(_demoPopups);
  const [view,   setView]   = useState("list"); // list | create | edit
  const [editing, setEditing] = useState(null);
  const [busy,   setBusy]   = useState(false);
  const [msg,    setMsg]    = useState(null);
  const [preview, setPreview] = useState(false);

  const emptyForm = { title:"", body:"", image_url:"", badge_text:"", badge_color:"rgba(79,142,247,0.2)",
    cta_text:"", cta_url:"", cta_color:"linear-gradient(135deg,#4f8ef7,#6366f1)", cta_new_tab:false,
    start_date:today, end_date: new Date(Date.now()+7*86400000).toISOString().slice(0,10),
    width:520, is_active:1 };
  const [form, setForm] = useState(emptyForm);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const flash = (text, ok=true) => { setMsg({text,ok}); setTimeout(()=>setMsg(null),4000); };

  /* List 불러오기 */
  const loadPopups = () => {
    if (isDemo) { setPopups([..._demoPopups]); return; }
    fetch(`/api/v423/admin/popups`, { headers: hdrs })
      .then(r=>r.json()).then(d=>{ if(d.popups) setPopups(d.popups); }).catch(()=>{});
  };
  useEffect(loadPopups, [view]);

  /* Save */
  const handleSave = async () => {
    if (!form.title.trim()) { flash("Popup 제목을 입력해주세요.", false); return; }
    if (!form.start_date || !form.end_date) { flash("표시 Period을 Settings해주세요.", false); return; }
    setBusy(true);
    if (isDemo) {
      await new Promise(r => setTimeout(r, 400));
      if (editing) {
        _demoPopups = _demoPopups.map(p => p.id === editing.id ? { ...p, ...form, id: editing.id } : p);
        flash("Popup이 Edit되었습니다.");
      } else {
        const newP = { ...form, id: _nextPopupId++, created_at: today };
        _demoPopups = [newP, ..._demoPopups];
        flash("Popup이 Register되었습니다.");
      }
      setPopups([..._demoPopups]);
      pushNotification?.({ title:"📣 Popup Register Done", body:`"${form.title}" Popup이 ${form.start_date} ~ ${form.end_date} Period 동안 표시됩니다.`, type:"success" });
      setBusy(false); setView("list"); setEditing(null); setForm(emptyForm);
      return;
    }
    const method = editing ? "PUT" : "POST";
    const url    = editing ? `/api/v423/admin/popups/${editing.id}` : "/api/v423/admin/popups";
    const r = await fetch(url, { method, headers: hdrs, body: JSON.stringify(form) }).then(r=>r.json()).catch(()=>({}));
    setBusy(false);
    if (r.ok) { flash("Save되었습니다."); setView("list"); setEditing(null); setForm(emptyForm); }
    else flash(r.error || "Save Failed", false);
  };

  /* Activate/Inactive화 Toggle */
  const handleToggle = async (p) => {
    if (isDemo) {
      _demoPopups = _demoPopups.map(x => x.id === p.id ? { ...x, is_active: x.is_active ? 0 : 1 } : x);
      setPopups([..._demoPopups]); return;
    }
    await fetch(`/api/v423/admin/popups/${p.id}/toggle`, { method:"POST", headers:hdrs });
    loadPopups();
  };

  /* Delete */
  const handleDelete = async (p) => {
    if (!window.confirm(`"${p.title}" Popup을 Delete하시겠습니까?`)) return;
    if (isDemo) {
      _demoPopups = _demoPopups.filter(x => x.id !== p.id);
      setPopups([..._demoPopups]); flash("Delete되었습니다."); return;
    }
    await fetch(`/api/v423/admin/popups/${p.id}`, { method:"DELETE", headers:hdrs });
    loadPopups(); flash("Delete되었습니다.");
  };

  const startEdit = (p) => { setEditing(p); setForm({ ...p }); setView("edit"); };

  const isActive = (p) => {
    if (!p.is_active) return false;
    const now = today;
    return (!p.start_date || p.start_date <= now) && (!p.end_date || p.end_date >= now);
  };

  /* ── 폼 UI ── */
  const FormView = () => (
    <div style={{ display:"grid", gap:14, maxWidth:600 }}>
      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
        <button onClick={()=>{ setView("list"); setEditing(null); setForm(emptyForm); }}
          style={{ background:"none", border:"none", color:"#4f8ef7", cursor:"pointer", fontSize:13, fontWeight:700 }}>← List</button>
        <span style={{ fontWeight:800, fontSize:15, color:"#e2e8f0" }}>{editing ? "✏️ Popup Edit" : "➕ 새 Popup Register"}</span>
      </div>

      {/* Basic Info */}
      <div style={{ padding:"16px", borderRadius:12, background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.08)", display:"grid", gap:12 }}>
        <div style={{ fontSize:11, fontWeight:800, color:"#94a3b8", marginBottom:2 }}>📋 Basic Info</div>
        <Field2 label="Popup 제목 *" value={form.title} onChange={v=>set("title",v)} placeholder="3월 Event 안내" />
        <div style={{ display:"grid", gap:4 }}>
          <label style={{ fontSize:11, fontWeight:700, color:"#94a3b8" }}>본문 내용 (HTML Allow)</label>
          <textarea value={form.body} onChange={e=>set("body",e.target.value)}
            rows={4} placeholder="Event 상세 내용을 입력하세요.\n\n<b>굵게</b> <br> 줄바꿈 등 HTML 사용 가능"
            style={{ padding:"10px 12px", borderRadius:10, border:"1px solid rgba(255,255,255,0.1)",
              background:"rgba(255,255,255,0.04)", color:"var(--text-1)", fontSize:13,
              outline:"none", resize:"vertical", fontFamily:"inherit" }} />
        </div>
        <Field2 label="Image URL (Select)" value={form.image_url} onChange={v=>set("image_url",v)} placeholder="https://cdn.example.com/banner.png" />
      </div>

      {/* 배지 & CTA */}
      <div style={{ padding:"16px", borderRadius:12, background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.08)", display:"grid", gap:12 }}>
        <div style={{ fontSize:11, fontWeight:800, color:"#94a3b8", marginBottom:2 }}>🎨 배지 & Button</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
          <Field2 label="배지 Text (Select)" value={form.badge_text} onChange={v=>set("badge_text",v)} placeholder="LIMITED" />
          <Field2 label="CTA Button Text" value={form.cta_text} onChange={v=>set("cta_text",v)} placeholder="지금 Confirm하기" />
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr auto", gap:8 }}>
          <Field2 label="CTA Link URL" value={form.cta_url} onChange={v=>set("cta_url",v)} placeholder="/pricing 또는 https://..." />
          <div style={{ display:"grid", gap:4, alignItems:"center" }}>
            <label style={{ fontSize:11, fontWeight:700, color:"#94a3b8" }}>새 Tab 열기</label>
            <div style={{ display:"flex", gap:6 }}>
              {[true, false].map(v => (
                <button key={String(v)} type="button" onClick={()=>set("cta_new_tab",v)}
                  style={{ padding:"6px 10px", borderRadius:8, cursor:"pointer", fontSize:11, fontWeight:700,
                    border:`1px solid ${form.cta_new_tab===v ? "#4f8ef7" : "rgba(255,255,255,0.1)"}`,
                    background: form.cta_new_tab===v ? "rgba(79,142,247,0.12)" : "transparent",
                    color: form.cta_new_tab===v ? "#4f8ef7" : "#94a3b8" }}>{v ? "새 Tab" : "현재 Tab"}</button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 표시 Period */}
      <div style={{ padding:"16px", borderRadius:12, background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.08)", display:"grid", gap:12 }}>
        <div style={{ fontSize:11, fontWeight:800, color:"#94a3b8", marginBottom:2 }}>📅 표시 Period</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr auto 1fr", gap:8, alignItems:"center" }}>
          <div style={{ display:"grid", gap:4 }}>
            <label style={{ fontSize:11, fontWeight:700, color:"#94a3b8" }}>Start일 *</label>
            <input type="date" value={form.start_date} onChange={e=>set("start_date",e.target.value)}
              style={{ padding:"9px 12px", borderRadius:10, border:"1px solid rgba(255,255,255,0.1)",
                background:"rgba(255,255,255,0.04)", color:"var(--text-1)", fontSize:13, outline:"none" }} />
          </div>
          <span style={{ color:"#94a3b8", fontSize:18, textAlign:"center" }}>~</span>
          <div style={{ display:"grid", gap:4 }}>
            <label style={{ fontSize:11, fontWeight:700, color:"#94a3b8" }}>End Date *</label>
            <input type="date" value={form.end_date} onChange={e=>set("end_date",e.target.value)}
              style={{ padding:"9px 12px", borderRadius:10, border:"1px solid rgba(255,255,255,0.1)",
                background:"rgba(255,255,255,0.04)", color:"var(--text-1)", fontSize:13, outline:"none" }} />
          </div>
        </div>
        <label style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer" }}>
          <input type="checkbox" checked={!!form.is_active} onChange={e=>set("is_active", e.target.checked ? 1 : 0)}
            style={{ accentColor:"#22c55e", width:15, height:15 }} />
          <span style={{ fontSize:12, color:"#94a3b8" }}>즉시 Activate (Period 내 접속 시 Popup Auto 표시)</span>
        </label>
      </div>

      {msg && (
        <div style={{ padding:"10px 14px", borderRadius:8, fontSize:12, fontWeight:700,
          background: msg.ok ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)",
          border: `1px solid ${msg.ok ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`,
          color: msg.ok ? "#22c55e" : "#ef4444" }}>{msg.text}</div>
      )}

      <button onClick={handleSave} disabled={busy} style={{
        padding:"13px 0", borderRadius:12, border:"none", cursor: busy ? "not-allowed" : "pointer",
        background: busy ? "rgba(79,142,247,0.4)" : "linear-gradient(135deg,#4f8ef7,#6366f1)",
        color:"#fff", fontWeight:800, fontSize:14,
      }}>{busy ? "Save in progress..." : (editing ? "✅ Edit Done" : "📣 Popup Register")}</button>
    </div>
  );

  /* ── List UI ── */
  return (
    <div style={{ display:"grid", gap:16 }}>
      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div>
          <div style={{ fontWeight:900, fontSize:16, color:"#e2e8f0" }}>📣 Event Popup Management</div>
          <div style={{ fontSize:11, color:"#94a3b8", marginTop:3 }}>Platform 접속 시 Auto 표시할 Popup을 Register·Management합니다.</div>
        </div>
        {view === "list" && (
          <button onClick={()=>{ setForm(emptyForm); setEditing(null); setView("create"); }}
            style={{ padding:"9px 18px", borderRadius:10, border:"none", cursor:"pointer",
              background:"linear-gradient(135deg,#4f8ef7,#6366f1)", color:"#fff", fontWeight:800, fontSize:12 }}>
            ➕ 새 Popup Register
          </button>
        )}
      </div>

      {msg && view === "list" && (
        <div style={{ padding:"10px 14px", borderRadius:8, fontSize:12, fontWeight:700,
          background: msg.ok ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)",
          border: `1px solid ${msg.ok ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`,
          color: msg.ok ? "#22c55e" : "#ef4444" }}>{msg.text}</div>
      )}

      {(view === "create" || view === "edit") ? <FormView /> : (
        <>
          {/* 안내 Banner */}
          <div style={{ padding:"12px 16px", borderRadius:10, background:"rgba(79,142,247,0.06)", border:"1px solid rgba(79,142,247,0.15)", fontSize:11, color:"#4f8ef7", lineHeight:1.7 }}>
            💡 <strong>작동 방식:</strong> Register된 Popup은 <strong>표시 Period 내 Platform 접속 시 Auto으로 표시</strong>됩니다.<br />
            User가 <strong>"Today 보지 않기"</strong>를 Clicks하면 24Time, <strong>"1주Daily 보지 않기"</strong>를 Clicks하면 7Daily 해당 디바이스에 Popup이 표시되지 않습니다.
          </div>

          {/* KPI */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10 }}>
            {[
              { l:"All Popup", v:popups.length, c:"#4f8ef7" },
              { l:"현재 Active", v:popups.filter(isActive).length, c:"#22c55e" },
              { l:"Inactive/Expired", v:popups.filter(p=>!isActive(p)).length, c:"#94a3b8" },
            ].map(({ l, v, c }) => (
              <div key={l} style={{ padding:"14px 16px", borderRadius:12, background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.06)", textAlign:"center" }}>
                <div style={{ fontSize:22, fontWeight:900, color:c }}>{v}</div>
                <div style={{ fontSize:11, color:"#94a3b8", marginTop:3 }}>{l}</div>
              </div>
            ))}
          </div>

          {/* Popup List */}
          {popups.length === 0 ? (
            <div style={{ textAlign:"center", padding:"40px 0", color:"#94a3b8", fontSize:13 }}>Register된 Popup이 없습니다.</div>
          ) : popups.map(p => {
            const active = isActive(p);
            return (
              <div key={p.id} style={{
                padding:"16px 20px", borderRadius:12,
                background: active ? "rgba(34,197,94,0.04)" : "rgba(255,255,255,0.02)",
                border: `1px solid ${active ? "rgba(34,197,94,0.2)" : "rgba(255,255,255,0.07)"}`,
                display:"grid", gap:10,
              }}>
                <div style={{ display:"flex", alignItems:"flex-start", gap:12 }}>
                  {/* Status 배지 */}
                  <span style={{
                    padding:"3px 10px", borderRadius:99, fontSize:10, fontWeight:800, flexShrink:0, marginTop:2,
                    background: active ? "rgba(34,197,94,0.12)" : "rgba(148,163,184,0.08)",
                    color: active ? "#22c55e" : "#94a3b8",
                  }}>{active ? "● Active" : p.is_active ? "⏸ Period외" : "○ Inactive"}</span>

                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:800, fontSize:14, color:"#e2e8f0" }}>{p.title}</div>
                    {p.body && <div style={{ fontSize:11, color:"#94a3b8", marginTop:3, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:400, }}>{p.body.replace(/<[^>]+>/g,"")}</div>}
                    <div style={{ fontSize:10, color:"#64748b", marginTop:5, display:"flex", gap:12 }}>
                      <span>📅 {p.start_date} ~ {p.end_date}</span>
                      {p.cta_text && <span>🔗 {p.cta_text}</span>}
                    </div>
                  </div>

                  {/* Action Button */}
                  <div style={{ display:"flex", gap:6, flexShrink:0 }}>
                    <button onClick={()=>handleToggle(p)} style={{
                      padding:"5px 10px", borderRadius:7, fontSize:10, cursor:"pointer", fontWeight:700,
                      background: p.is_active ? "rgba(239,68,68,0.07)" : "rgba(34,197,94,0.07)",
                      border: `1px solid ${p.is_active ? "rgba(239,68,68,0.25)" : "rgba(34,197,94,0.25)"}`,
                      color: p.is_active ? "#ef4444" : "#22c55e",
                    }}>{p.is_active ? "비활성화" : "활성화"}</button>
                    <button onClick={()=>startEdit(p)} style={{
                      padding:"5px 10px", borderRadius:7, fontSize:10, cursor:"pointer", fontWeight:700,
                      background:"rgba(79,142,247,0.07)", border:"1px solid rgba(79,142,247,0.25)", color:"#4f8ef7",
                    }}>Edit</button>
                    <button onClick={()=>handleDelete(p)} style={{
                      padding:"5px 10px", borderRadius:7, fontSize:10, cursor:"pointer", fontWeight:700,
                      background:"rgba(239,68,68,0.07)", border:"1px solid rgba(239,68,68,0.2)", color:"#ef4444",
                    }}>Delete</button>
                  </div>
                </div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}

function Field2({ label, value, onChange, placeholder, type="text" }) {
  return (
    <div style={{ display:"grid", gap:4 }}>
      <label style={{ fontSize:11, fontWeight:700, color:"#94a3b8" }}>{label}</label>
      <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
        style={{ padding:"9px 12px", borderRadius:10, border:"1px solid rgba(255,255,255,0.1)",
          background:"rgba(255,255,255,0.04)", color:"var(--text-1)", fontSize:13, outline:"none",
          transition:"border-color 150ms" }}
        onFocus={e=>(e.target.style.borderColor="#4f8ef7")}
        onBlur={e=>(e.target.style.borderColor="rgba(255,255,255,0.1)")} />
    </div>
  );
}

/* ── 경쟁 Platform Analysis 기반 Recommend Permission 매트릭스 ──────────────────────────────
 *  참고: Triple Whale(Growth/Pro/Enterprise), Northbeam(Starter/Pro/Enterprise),
 *         Rockerbox, Klaviyo Plan 구조 Analysis 후 Geniego-ROI에 최적화
 *
 *  핵심 차per화 원칙:
 *  📈 Growth  — 운영·현황 파악 (ChannelIntegration, Basic Analysis, CRM, 정산, Team Collaboration)
 *  🚀 Pro     — Advanced Analysis·AI·Auto화 (AI Forecast, 코호트, P&L, 인플루언서, API)
 *  🌐 Enterprise — Enterprise급 거버넌스 (RBAC, Data Pipeline, Price최적화AI,
 *                                            Data Warehouse Sync, 전용 CSM Feature)
 */
const RECOMMENDED_PERMS = {
  // ── 🏠 홈 Dashboard ──────────────────────────────────────────────────────
  dashboard:        { admin:"✅", enterprise:"✅", pro:"✅", growth:"✅", free:"👁", demo:"👁" },
  kpi_widget:       { admin:"✅", enterprise:"✅", pro:"✅", growth:"✅", free:"👁", demo:"👁" },
  realtime_monitor: { admin:"✅", enterprise:"✅", pro:"✅", growth:"✅", free:"🔒", demo:"🔒" },
  alert_feed:       { admin:"✅", enterprise:"✅", pro:"✅", growth:"✅", free:"🔒", demo:"🔒" },

  // ── 🚀 AI Marketing Auto화 ─────────────────────────────────────────────────
  marketing:        { admin:"✅", enterprise:"✅", pro:"✅", growth:"✅", free:"👁", demo:"👁" },
  campaign_mgr:     { admin:"✅", enterprise:"✅", pro:"✅", growth:"✅", free:"👁", demo:"👁" },
  auto_marketing:   { admin:"✅", enterprise:"✅", pro:"✅", growth:"✅", free:"🔒", demo:"🔒" },
  content_cal:      { admin:"✅", enterprise:"✅", pro:"✅", growth:"✅", free:"👁", demo:"👁" },
  budget_planner:   { admin:"✅", enterprise:"✅", pro:"✅", growth:"✅", free:"🔒", demo:"🔒" },
  // Pro 전용: Customer Journey·AI Forecast·인플루언서 (Triple Whale Pro = CDP+cohort)
  journey_builder:  { admin:"✅", enterprise:"✅", pro:"✅", growth:"🔒", free:"🔒", demo:"🔒" },
  ai_prediction:    { admin:"✅", enterprise:"✅", pro:"✅", growth:"🔒", free:"🔒", demo:"🔒" },
  influencer:       { admin:"✅", enterprise:"✅", pro:"✅", growth:"🔒", free:"🔒", demo:"🔒" },
  ai_marketing_hub: { admin:"✅", enterprise:"✅", pro:"✅", growth:"✅", free:"🔒", demo:"🔒" },
  ai_recommend:     { admin:"✅", enterprise:"✅", pro:"✅", growth:"🔒", free:"🔒", demo:"🔒" },

  // ── 📣 Ad·Channel Analysis ─────────────────────────────────────────────────────
  account_performance:{ admin:"✅", enterprise:"✅", pro:"✅", growth:"✅", free:"👁", demo:"👁" },
  attribution:      { admin:"✅", enterprise:"✅", pro:"✅", growth:"✅", free:"👁", demo:"👁" },
  channel_kpi:      { admin:"✅", enterprise:"✅", pro:"✅", growth:"✅", free:"👁", demo:"🔒" },
  // Pro 전용: 이상감지·모델Compare·Graph Score·Marketing 인텔리전스 (Northbeam Pro=creative analytics)
  anomaly_det:      { admin:"✅", enterprise:"✅", pro:"✅", growth:"🔒", free:"🔒", demo:"🔒" },
  model_compare:    { admin:"✅", enterprise:"✅", pro:"✅", growth:"🔒", free:"🔒", demo:"🔒" },
  graph_score:      { admin:"✅", enterprise:"✅", pro:"✅", growth:"🔒", free:"🔒", demo:"🔒" },
  mkt_intelligence: { admin:"✅", enterprise:"✅", pro:"✅", growth:"🔒", free:"🔒", demo:"🔒" },

  // ── 👤 Customer·CRM ─────────────────────────────────────────────────────────
  crm_list:         { admin:"✅", enterprise:"✅", pro:"✅", growth:"✅", free:"🔒", demo:"🔒" },
  rfm_segment:      { admin:"✅", enterprise:"✅", pro:"✅", growth:"✅", free:"🔒", demo:"🔒" },
  // Pro 전용: AI 세그먼트·LINE/WhatsApp (Global Channel)
  ai_segment:       { admin:"✅", enterprise:"✅", pro:"✅", growth:"🔒", free:"🔒", demo:"🔒" },
  email_campaign:   { admin:"✅", enterprise:"✅", pro:"✅", growth:"✅", free:"🔒", demo:"🔒" },
  kakao_channel:    { admin:"✅", enterprise:"✅", pro:"✅", growth:"✅", free:"🔒", demo:"🔒" },
  line_wa_dm:       { admin:"✅", enterprise:"✅", pro:"✅", growth:"🔒", free:"🔒", demo:"🔒" },

  // ── 🛒 커머스·물류 ──────────────────────────────────────────────────────
  order_hub:        { admin:"✅", enterprise:"✅", pro:"✅", growth:"✅", free:"🔒", demo:"🔒" },
  inventory:        { admin:"✅", enterprise:"✅", pro:"✅", growth:"✅", free:"🔒", demo:"🔒" },
  // Pro 전용: WMS Advanced (Northbeam Pro = Advanced 물류 Management)
  wms_advanced:     { admin:"✅", enterprise:"✅", pro:"✅", growth:"🔒", free:"🔒", demo:"🔒" },
  catalog_sync:     { admin:"✅", enterprise:"✅", pro:"✅", growth:"✅", free:"🔒", demo:"🔒" },
  // Enterprise 전용: AI Price Optimization (Triple Whale Enterprise = Advanced Price·경쟁 Analysis)
  price_opt:        { admin:"✅", enterprise:"✅", pro:"🔒", growth:"🔒", free:"🔒", demo:"🔒" },
  commerce_ops:     { admin:"✅", enterprise:"✅", pro:"✅", growth:"✅", free:"🔒", demo:"🔒" },
  reviews_ugc:      { admin:"✅", enterprise:"✅", pro:"✅", growth:"✅", free:"🔒", demo:"🔒" },

  // ── 📊 Analysis·Performance ─────────────────────────────────────────────────────────
  perf_hub:         { admin:"✅", enterprise:"✅", pro:"✅", growth:"✅", free:"🔒", demo:"🔒" },
  // Pro 전용: P&L·코호트 (Triple Whale Pro = Cohort Analysis)
  pnl:              { admin:"✅", enterprise:"✅", pro:"✅", growth:"🔒", free:"🔒", demo:"🔒" },
  cohort:           { admin:"✅", enterprise:"✅", pro:"✅", growth:"🔒", free:"🔒", demo:"🔒" },
  ai_insights:      { admin:"✅", enterprise:"✅", pro:"✅", growth:"✅", free:"🔒", demo:"🔒" },
  report_builder:   { admin:"✅", enterprise:"✅", pro:"✅", growth:"✅", free:"🔒", demo:"🔒" },
  // Enterprise 전용: API Export·Data Warehouse Sync (Northbeam Enterprise)
  api_export:       { admin:"✅", enterprise:"✅", pro:"🔒", growth:"🔒", free:"🔒", demo:"🔒" },
  // Pro 전용: Rollup Layer
  rollup:           { admin:"✅", enterprise:"✅", pro:"✅", growth:"🔒", free:"🔒", demo:"🔒" },

  // ── 💳 정산·재무 ─────────────────────────────────────────────────────────
  reconciliation:   { admin:"✅", enterprise:"✅", pro:"✅", growth:"✅", free:"🔒", demo:"🔒" },
  // Pro 전용: 월per Unified정산·Tax계산서
  recon_month:      { admin:"✅", enterprise:"✅", pro:"✅", growth:"🔒", free:"🔒", demo:"🔒" },
  tax_invoice:      { admin:"✅", enterprise:"✅", pro:"✅", growth:"🔒", free:"🔒", demo:"🔒" },
  settlements:      { admin:"✅", enterprise:"✅", pro:"✅", growth:"✅", free:"🔒", demo:"🔒" },
  my_plan:          { admin:"✅", enterprise:"✅", pro:"✅", growth:"✅", free:"✅", demo:"✅" },

  // ── 🤖 Auto화·AI ─────────────────────────────────────────────────────────
  // Pro 전용: AI Rule 엔진·Rule Test (Northbeam Pro = Advanced 규칙 Auto화)
  ai_rule_engine:   { admin:"✅", enterprise:"✅", pro:"✅", growth:"🔒", free:"🔒", demo:"🔒" },
  rule_test:        { admin:"✅", enterprise:"✅", pro:"✅", growth:"🔒", free:"🔒", demo:"🔒" },
  alert_policies:   { admin:"✅", enterprise:"✅", pro:"✅", growth:"✅", free:"🔒", demo:"🔒" },
  // Pro 전용: Action Presets·Write-back
  action_presets:   { admin:"✅", enterprise:"✅", pro:"✅", growth:"🔒", free:"🔒", demo:"🔒" },
  approvals:        { admin:"✅", enterprise:"✅", pro:"✅", growth:"✅", free:"🔒", demo:"🔒" },
  writeback:        { admin:"✅", enterprise:"✅", pro:"✅", growth:"🔒", free:"🔒", demo:"🔒" },

  // ── 🔌 데이터·Integration ───────────────────────────────────────────────────────
  connectors:       { admin:"✅", enterprise:"✅", pro:"✅", growth:"✅", free:"🔒", demo:"👁" },
  // Pro 전용: Global Channel·Event Schema·API Key·Pixel·Mapping Registry
  global_connectors:{ admin:"✅", enterprise:"✅", pro:"✅", growth:"🔒", free:"🔒", demo:"🔒" },
  event_schema:     { admin:"✅", enterprise:"✅", pro:"✅", growth:"🔒", free:"🔒", demo:"🔒" },
  // Enterprise 전용: Event 정규화·Data Product (Northbeam Enterprise = DWH bi-directional sync)
  event_normalize:  { admin:"✅", enterprise:"✅", pro:"🔒", growth:"🔒", free:"🔒", demo:"🔒" },
  api_keys:         { admin:"✅", enterprise:"✅", pro:"✅", growth:"🔒", free:"🔒", demo:"🔒" },
  pixel_config:     { admin:"✅", enterprise:"✅", pro:"✅", growth:"🔒", free:"🔒", demo:"🔒" },
  mapping_reg:      { admin:"✅", enterprise:"✅", pro:"✅", growth:"🔒", free:"🔒", demo:"🔒" },
  data_product:     { admin:"✅", enterprise:"✅", pro:"🔒", growth:"🔒", free:"🔒", demo:"🔒" },

  // ── 👥 내 Team·Help ──────────────────────────────────────────────────────
  team_members:     { admin:"✅", enterprise:"✅", pro:"✅", growth:"✅", free:"🔒", demo:"🔒" },
  // Enterprise 전용: RBAC Role Settings (Triple Whale Enterprise = dedicated security+compliance)
  team_roles:       { admin:"✅", enterprise:"✅", pro:"🔒", growth:"🔒", free:"🔒", demo:"🔒" },
  // Pro 전용: Team 활동 내역
  team_activity:    { admin:"✅", enterprise:"✅", pro:"✅", growth:"🔒", free:"🔒", demo:"🔒" },
  help_center:      { admin:"✅", enterprise:"✅", pro:"✅", growth:"✅", free:"✅", demo:"✅" },
  support_ticket:   { admin:"✅", enterprise:"✅", pro:"✅", growth:"✅", free:"🔒", demo:"🔒" },

  // ── ⚙️ 시스템 ───────────────────────────────────────────────────────────
  admin:            { admin:"✅", enterprise:"🔒", pro:"🔒", growth:"🔒", free:"🔒", demo:"🔒" },
  // Enterprise: 감사로그 읽기, admin: 풀 제어
  audit_log:        { admin:"✅", enterprise:"✅", pro:"👁", growth:"🔒", free:"🔒", demo:"🔒" },
  // Enterprise 전용: 시스템 모니터 (Northbeam Enterprise = 전용 인프라 가시성)
  sys_monitor:      { admin:"✅", enterprise:"✅", pro:"🔒", growth:"🔒", free:"🔒", demo:"🔒" },
  pricing:          { admin:"✅", enterprise:"🔒", pro:"🔒", growth:"🔒", free:"🔒", demo:"🔒" },

  // ── ⭐ UX 편의 ──────────────────────────────────────────────────────────
  sidebar_fav:      { admin:"✅", enterprise:"✅", pro:"✅", growth:"✅", free:"✅", demo:"✅" },
  sidebar_recent:   { admin:"✅", enterprise:"✅", pro:"✅", growth:"✅", free:"✅", demo:"✅" },
};

// Recommend Analysis 데이터 (경쟁사 대비 차per화 포인트)
const RECOMMEND_ANALYSIS = [
  { plan:"📈 Growth",  color:"#4f8ef7", features:"Channel 커넥터·Basic Analysis·CRM·정산·Team Collaboration·AI Campaign", exclusive:"실Time 모니터, Notification 정책, Orders 허브, 카탈로그 Sync", locked:"AI Forecast·코호트·P&L·API Export·RBAC" },
  { plan:"🚀 Pro",    color:"#a855f7", features:"Growth All + AI Forecast·LTV·이탈·코호트·P&L·인플루언서·Write-back", exclusive:"AI Rule 엔진, 1st-Party Pixel, WMS Advanced, Team 활동 내역, Global Channel", locked:"Price최적화AI·Event 정규화·RBAC·Data Product·DWH Sync" },
  { plan:"🌐 Enterprise", color:"#f59e0b", features:"Pro All + RBAC·Data Pipeline·Price최적화AI·DWH Sync", exclusive:"Event 정규화, Data Product, 시스템 모니터, Audit Log, Price최적화 AI", locked:"Admin Settings (admin 전용)" },
];

/* ── 메뉴 접근Permission 매트릭스 ─────────────────────────────────────────────── */
// 메뉴 Access Control 행 — Starter Plan 제거 (Free/Growth/Pro/Enterprise 4단계로 단순화)
const MENU_ACCESS_ROWS = [
  // ── 대메뉴: 🏠 홈 Dashboard ──────────────────────────────────────────────
  { group: "🏠 홈 Dashboard",  id: "dashboard",       label: "📊 Unified Dashboard",          desc: "KPI Widget·실Time 모니터·Notification 피드",                   default: { admin:"✅", enterprise:"✅", pro:"✅", growth:"✅", free:"👁", demo:"👁" } },
  { group: "🏠 홈 Dashboard",  id: "kpi_widget",      label: "└ KPI Widget",               desc: "Dashboard Top 핵심 Metric Card",                       default: { admin:"✅", enterprise:"✅", pro:"✅", growth:"✅", free:"👁", demo:"👁" } },
  { group: "🏠 홈 Dashboard",  id: "realtime_monitor",label: "└ 실Time 모니터",            desc: "Event·Channel 실Time 스트림 Search",                     default: { admin:"✅", enterprise:"✅", pro:"✅", growth:"✅", free:"🔒", demo:"🔒" } },
  { group: "🏠 홈 Dashboard",  id: "alert_feed",      label: "└ Notification 피드",              desc: "Anomaly Detection·정책 Notification 피드 (Pro 이상)",                default: { admin:"✅", enterprise:"✅", pro:"✅", growth:"🔒", free:"🔒", demo:"🔒" } },

  // ── 대메뉴: 🚀 AI Marketing Auto화 ─────────────────────────────────────────
  { group: "🚀 AI Marketing Auto화", id: "marketing",      label: "📣 Marketing 허브",           desc: "Channel Campaign·Ad Performance Unified Management",                    default: { admin:"✅", enterprise:"✅", pro:"✅", growth:"✅", free:"👁", demo:"👁" } },
  { group: "🚀 AI Marketing Auto화", id: "campaign_mgr",   label: "└ Campaign Admin",          desc: "Create Campaign·Edit·Performance 추적",                        default: { admin:"✅", enterprise:"✅", pro:"✅", growth:"✅", free:"👁", demo:"👁" } },
  { group: "🚀 AI Marketing Auto화", id: "auto_marketing", label: "└ AI Auto화 Marketing",       desc: "AI 기반 Campaign Auto Run (Growth 이상)",             default: { admin:"✅", enterprise:"✅", pro:"✅", growth:"✅", free:"🔒", demo:"🔒" } },
  { group: "🚀 AI Marketing Auto화", id: "content_cal",    label: "└ 콘텐츠 캘린더",          desc: "콘텐츠 일정 Plan·발행 Management",                        default: { admin:"✅", enterprise:"✅", pro:"✅", growth:"✅", free:"👁", demo:"👁" } },
  { group: "🚀 AI Marketing Auto화", id: "budget_planner", label: "└ Budget 플래너",            desc: "Channelper Budget 배분·최적화 (Growth 이상)",              default: { admin:"✅", enterprise:"✅", pro:"✅", growth:"✅", free:"🔒", demo:"🔒" } },
  { group: "🚀 AI Marketing Auto화", id: "journey_builder",label: "└ Customer Journey 빌더",          desc: "멀티Channel Customer Journey 설계·Auto화 (Pro 이상)",          default: { admin:"✅", enterprise:"✅", pro:"✅", growth:"🔒", free:"🔒", demo:"🔒" } },
  { group: "🚀 AI Marketing Auto화", id: "ai_prediction",  label: "└ AI Forecast (LTV·이탈)",    desc: "Customer 이탈·LTV·구매확률 AI Forecast (Pro 이상)",         default: { admin:"✅", enterprise:"✅", pro:"✅", growth:"🔒", free:"🔒", demo:"🔒" } },
  { group: "🚀 AI Marketing Auto화", id: "influencer",     label: "└ Influencer Hub",       desc: "인플루언서 계약·정산·Performance Management (Pro 이상)",         default: { admin:"✅", enterprise:"✅", pro:"✅", growth:"🔒", free:"🔒", demo:"🔒" } },
  { group: "🚀 AI Marketing Auto화", id: "ai_marketing_hub",label: "└ AI Marketing 허브",         desc: "Channel·Campaign Unified AI 허브 (Growth 이상)",            default: { admin:"✅", enterprise:"✅", pro:"✅", growth:"✅", free:"🔒", demo:"🔒" } },
  { group: "🚀 AI Marketing Auto화", id: "ai_recommend",   label: "└ AI Recommend 엔진",          desc: "Product·Channel·콘텐츠 Personal화 Recommend (Pro 이상)",           default: { admin:"✅", enterprise:"✅", pro:"✅", growth:"🔒", free:"🔒", demo:"🔒" } },

  // ── 대메뉴: 📣 Ad·Channel Analysis ────────────────────────────────────────────
  { group: "📣 Ad·Channel Analysis", id: "account_performance",label:"🏢 계정별 성과 분석",          desc: "계정/팀별 마케팅 효과 및 성과 분석",                       default: { admin:"✅", enterprise:"✅", pro:"✅", growth:"✅", free:"👁", demo:"👁" } },
  { group: "📣 Ad·Channel Analysis", id: "attribution",     label: "📊 기여도 Analysis",           desc: "터치포인트·모델per 기여 Analysis",                        default: { admin:"✅", enterprise:"✅", pro:"✅", growth:"✅", free:"👁", demo:"👁" } },
  { group: "📣 Ad·Channel Analysis", id: "channel_kpi",     label: "└ Channel KPI",              desc: "Channelper ROAS·Impressions·Clicks·Conversion Metric",                   default: { admin:"✅", enterprise:"✅", pro:"✅", growth:"✅", free:"👁", demo:"🔒" } },
  { group: "📣 Ad·Channel Analysis", id: "anomaly_det",     label: "└ 🚨 Anomaly Detection",          desc: "Channel Performance 이상 Auto 감지·Notification (Pro 이상)",           default: { admin:"✅", enterprise:"✅", pro:"✅", growth:"🔒", free:"🔒", demo:"🔒" } },
  { group: "📣 Ad·Channel Analysis", id: "model_compare",   label: "└ 🕸️ 모델 Compare",          desc: "Last Click·데이터기반 등 모델 Compare (Pro 이상)",      default: { admin:"✅", enterprise:"✅", pro:"✅", growth:"🔒", free:"🔒", demo:"🔒" } },
  { group: "📣 Ad·Channel Analysis", id: "graph_score",     label: "└ Graph Scoring",        desc: "인플루언서·Product·Orders Graph 스코어 (Pro 이상)",      default: { admin:"✅", enterprise:"✅", pro:"✅", growth:"🔒", free:"🔒", demo:"🔒" } },
  { group: "📣 Ad·Channel Analysis", id: "mkt_intelligence",label: "└ Marketing 인텔리전스",      desc: "경쟁사·시장 트렌드 AI Analysis (Pro 이상)",              default: { admin:"✅", enterprise:"✅", pro:"✅", growth:"🔒", free:"🔒", demo:"🔒" } },

  // ── 대메뉴: 👤 Customer·CRM ───────────────────────────────────────────────────
  { group: "👤 Customer·CRM",    id: "crm_list",        label: "👥 Customer List",             desc: "All Customer List·Search·Filter",                          default: { admin:"✅", enterprise:"✅", pro:"✅", growth:"✅", free:"🔒", demo:"🔒" } },
  { group: "👤 Customer·CRM",    id: "rfm_segment",     label: "└ RFM 세그먼트",          desc: "구매 빈도·Amount 기반 Customer 분류 (Growth 이상)",       default: { admin:"✅", enterprise:"✅", pro:"✅", growth:"✅", free:"🔒", demo:"🔒" } },
  { group: "👤 Customer·CRM",    id: "ai_segment",      label: "└ AI 세그먼트",            desc: "AI 클러스터·Forecast 기반 세그먼트 (Pro 이상)",          default: { admin:"✅", enterprise:"✅", pro:"✅", growth:"🔒", free:"🔒", demo:"🔒" } },
  { group: "👤 Customer·CRM",    id: "email_campaign",  label: "└ Email Campaign",          desc: "Email Send·템플릿·Statistics (Growth 이상)",             default: { admin:"✅", enterprise:"✅", pro:"✅", growth:"✅", free:"🔒", demo:"🔒" } },
  { group: "👤 Customer·CRM",    id: "kakao_channel",   label: "└ Kakao Channel",            desc: "Kakao Notification톡·친구톡 Send (Growth 이상)",            default: { admin:"✅", enterprise:"✅", pro:"✅", growth:"✅", free:"🔒", demo:"🔒" } },
  { group: "👤 Customer·CRM",    id: "line_wa_dm",      label: "└ LINE·WhatsApp DM",     desc: "Global Message Channel (Pro 이상)",                     default: { admin:"✅", enterprise:"✅", pro:"✅", growth:"🔒", free:"🔒", demo:"🔒" } },

  // ── 대메뉴: 🛒 커머스·물류 ────────────────────────────────────────────────
  { group: "🛒 커머스·물류",  id: "order_hub",       label: "📦 Orders 허브",             desc: "Channelper Orders·클레임·배송 Unified Management (Growth)",         default: { admin:"✅", enterprise:"✅", pro:"✅", growth:"✅", free:"🔒", demo:"🔒" } },
  { group: "🛒 커머스·물류",  id: "inventory",       label: "└ Stock Management",             desc: "Stock Search·Notification·조정 (Growth+Pro)",                  default: { admin:"✅", enterprise:"✅", pro:"✅", growth:"✅", free:"🔒", demo:"🔒" } },
  { group: "🛒 커머스·물류",  id: "wms_advanced",    label: "└ WMS Advanced (위치·바코드)",desc: "입출고·로케이션·바코드 Management (Pro 이상)",             default: { admin:"✅", enterprise:"✅", pro:"✅", growth:"🔒", free:"🔒", demo:"🔒" } },
  { group: "🛒 커머스·물류",  id: "wms_supplier",    label: "└ 공급업체 Management",          desc: "거래처 CRUD·Payment조건·리드타임·발주이력 (Growth 이상)", default: { admin:"✅", enterprise:"✅", pro:"✅", growth:"✅", free:"🔒", demo:"👁" } },
  { group: "🛒 커머스·물류",  id: "wms_audit",       label: "└ Stock 실사",             desc: "Stock 실사·Quantity 입력·차이 조정 (Pro 이상)",           default: { admin:"✅", enterprise:"✅", pro:"✅", growth:"🔒", free:"🔒", demo:"🔒" } },
  { group: "🛒 커머스·물류",  id: "catalog_sync",    label: "└ 카탈로그 Sync",        desc: "Product Register·Sync·Price Management (Growth 이상)",           default: { admin:"✅", enterprise:"✅", pro:"✅", growth:"✅", free:"🔒", demo:"🔒" } },
  { group: "🛒 커머스·물류",  id: "ops_product",     label: "└ ProductManagement 허브",          desc: "Cost Price·마진 Analysis·SKU 마스터·Channelper Register (Growth 이상)", default: { admin:"✅", enterprise:"✅", pro:"✅", growth:"✅", free:"🔒", demo:"👁" } },
  { group: "🛒 커머스·물류",  id: "ops_margin",      label: "└ Cost Price/마진 Analysis 뷰",      desc: "Cost Price·공급가·마진율 Analysis Advanced 뷰 (Pro 이상)",         default: { admin:"✅", enterprise:"✅", pro:"✅", growth:"🔒", free:"🔒", demo:"🔒" } },
  { group: "🛒 커머스·물류",  id: "price_opt",       label: "└ Price Optimization AI",         desc: "AI 탄성·시뮬레이션·Recommend (Enterprise)",              default: { admin:"✅", enterprise:"✅", pro:"🔒", growth:"🔒", free:"🔒", demo:"🔒" } },
  { group: "🛒 커머스·물류",  id: "commerce_ops",    label: "└ Commerce Ops",         desc: "Global Channel·Amazon 운영·디지털 셀프",               default: { admin:"✅", enterprise:"✅", pro:"✅", growth:"✅", free:"🔒", demo:"🔒" } },
  { group: "🛒 커머스·물류",  id: "reviews_ugc",     label: "└ Reviews & UGC",        desc: "리뷰 Management·UGC Performance·AI 답변 (Growth 이상)",          default: { admin:"✅", enterprise:"✅", pro:"✅", growth:"✅", free:"🔒", demo:"🔒" } },

  // ── 대메뉴: 📊 Analysis·Performance ─────────────────────────────────────────────────
  { group: "📊 Analysis·Performance",    id: "perf_hub",        label: "📈 퍼포먼스 허브",         desc: "Channel·Product·Campaignper Performance Unified",                      default: { admin:"✅", enterprise:"✅", pro:"✅", growth:"✅", free:"🔒", demo:"🔒" } },
  { group: "📊 Analysis·Performance",    id: "pnl",             label: "└ P&L Dashboard",          desc: "Channel·Productper 손익 Analysis (Pro 이상)",                  default: { admin:"✅", enterprise:"✅", pro:"✅", growth:"🔒", free:"🔒", demo:"🔒" } },
  { group: "📊 Analysis·Performance",    id: "cohort",          label: "└ 코호트 Analysis",            desc: "Periodper 유지율·LTV 코호트 (Pro 이상)",               default: { admin:"✅", enterprise:"✅", pro:"✅", growth:"🔒", free:"🔒", demo:"🔒" } },
  { group: "📊 Analysis·Performance",    id: "ai_insights",     label: "└ AI 인사이트 피드",       desc: "AI Auto Anomaly Detection·개선안 제안 (Growth 이상)",       default: { admin:"✅", enterprise:"✅", pro:"✅", growth:"✅", free:"🔒", demo:"🔒" } },
  { group: "📊 Analysis·Performance",    id: "report_builder",  label: "└ 리포트 빌더",            desc: "커스텀 리포트·예약 Send (Growth부터 Basic)",          default: { admin:"✅", enterprise:"✅", pro:"✅", growth:"✅", free:"🔒", demo:"🔒" } },
  { group: "📊 Analysis·Performance",    id: "api_export",      label: "└ API 데이터 Export",    desc: "데이터 스트리밍·API 파이프라인 (Enterprise)",       default: { admin:"✅", enterprise:"✅", pro:"🔒", growth:"🔒", free:"🔒", demo:"🔒" } },
  { group: "📊 Analysis·Performance",    id: "rollup",          label: "└ Rollup Layer",          desc: "Aggregate·Roll-up 데이터 Search (Pro 이상)",               default: { admin:"✅", enterprise:"✅", pro:"✅", growth:"🔒", free:"🔒", demo:"🔒" } },

  // ── 대메뉴: 💳 정산·재무 ─────────────────────────────────────────────────
  { group: "💳 정산·재무",    id: "reconciliation",  label: "📋 Settlement History",             desc: "Channelper 정산·엑셀 Export (Growth 이상)",           default: { admin:"✅", enterprise:"✅", pro:"✅", growth:"✅", free:"🔒", demo:"🔒" } },
  { group: "💳 정산·재무",    id: "recon_month",     label: "└ 월per Unified 정산",         desc: "멀티Channel 월per 정산 Unified (Pro 이상)",               default: { admin:"✅", enterprise:"✅", pro:"✅", growth:"🔒", free:"🔒", demo:"🔒" } },
  { group: "💳 정산·재무",    id: "tax_invoice",     label: "└ Tax계산서",             desc: "Tax계산서 발행·Management (Pro 이상)",                   default: { admin:"✅", enterprise:"✅", pro:"✅", growth:"🔒", free:"🔒", demo:"🔒" } },
  { group: "💳 정산·재무",    id: "settlements",     label: "└ 지급 Management",             desc: "지급 List·Approval·엑셀 (Growth 이상)",                default: { admin:"✅", enterprise:"✅", pro:"✅", growth:"✅", free:"🔒", demo:"🔒" } },
  { group: "💳 정산·재무",    id: "my_plan",         label: "└ 내 Plan·Payment 이력",      desc: "Subscription Plan Confirm·Payment 이력·업그레이드 (All)",       default: { admin:"✅", enterprise:"✅", pro:"✅", growth:"✅", free:"✅", demo:"✅" } },

  // ── 대메뉴: 🤖 Auto화·AI ─────────────────────────────────────────────────
  { group: "🤖 Auto화·AI",    id: "ai_rule_engine",  label: "🛠 AI Rule 엔진",           desc: "조건·Action 기반 AI Auto화 Rule (Pro 이상)",            default: { admin:"✅", enterprise:"✅", pro:"✅", growth:"🔒", free:"🔒", demo:"🔒" } },
  { group: "🤖 Auto화·AI",    id: "rule_test",       label: "└ Rule Test",             desc: "Rule 조건 Test·시뮬레이션 (Pro 이상)",              default: { admin:"✅", enterprise:"✅", pro:"✅", growth:"🔒", free:"🔒", demo:"🔒" } },
  { group: "🤖 Auto화·AI",    id: "alert_policies",  label: "└ Notification 정책",             desc: "Notification 임계Value·Channel Settings (Growth 이상)",               default: { admin:"✅", enterprise:"✅", pro:"✅", growth:"✅", free:"🔒", demo:"🔒" } },
  { group: "🤖 Auto화·AI",    id: "action_presets",  label: "└ Action Presets",       desc: "Auto Run Action 프리셋 (Pro 이상)",                  default: { admin:"✅", enterprise:"✅", pro:"✅", growth:"🔒", free:"🔒", demo:"🔒" } },
  { group: "🤖 Auto화·AI",    id: "approvals",       label: "└ Action Center",        desc: "Approval 요청·결재 List (Growth 이상)",                 default: { admin:"✅", enterprise:"✅", pro:"✅", growth:"✅", free:"🔒", demo:"🔒" } },
  { group: "🤖 Auto화·AI",    id: "writeback",       label: "└ Write-back",           desc: "AdChannel Auto 반영 (Pro 이상) / 즉시 롤백=Enterprise", default: { admin:"✅", enterprise:"✅", pro:"✅", growth:"🔒", free:"🔒", demo:"🔒" } },

  // ── 대메뉴: 🔌 데이터·Integration ───────────────────────────────────────────────
  { group: "🔌 데이터·Integration",  id: "connectors",      label: "🔗 Channel 커넥터",          desc: "Meta·Google·Kakao·Coupang 등 Domestic Channel Integration",         default: { admin:"✅", enterprise:"✅", pro:"✅", growth:"✅", free:"🔒", demo:"👁" } },
  { group: "🔌 데이터·Integration",  id: "global_connectors",label:"└ Global Channel Integration",        desc: "Shopify·Amazon·LINE 등 Global Channel (Pro 이상)",     default: { admin:"✅", enterprise:"✅", pro:"✅", growth:"🔒", free:"🔒", demo:"🔒" } },
  { group: "🔌 데이터·Integration",  id: "event_schema",    label: "└ Event Schema",         desc: "Event Count집·스키마 Management (Pro 이상)",                default: { admin:"✅", enterprise:"✅", pro:"✅", growth:"🔒", free:"🔒", demo:"🔒" } },
  { group: "🔌 데이터·Integration",  id: "event_normalize", label: "└ Event 정규화",          desc: "데이터 클렌징·정규화 파이프라인 (Enterprise)",       default: { admin:"✅", enterprise:"✅", pro:"🔒", growth:"🔒", free:"🔒", demo:"🔒" } },
  { group: "🔌 데이터·Integration",  id: "api_keys",        label: "└ API 키 관리",          desc: "외부 API Key Create·Delete·로그 (Pro 이상)",             default: { admin:"✅", enterprise:"✅", pro:"✅", growth:"🔒", free:"🔒", demo:"🔒" } },
  { group: "🔌 데이터·Integration",  id: "pixel_config",    label: "└ 1st-Party Pixel",        desc: "Pixel Settings·스니펫·검증 (Pro 이상)",                  default: { admin:"✅", enterprise:"✅", pro:"✅", growth:"🔒", free:"🔒", demo:"🔒" } },
  { group: "🔌 데이터·Integration",  id: "mapping_reg",     label: "└ Mapping Registry",     desc: "데이터 매핑 규칙·제안·Apply (Pro 이상)",             default: { admin:"✅", enterprise:"✅", pro:"✅", growth:"🔒", free:"🔒", demo:"🔒" } },
  { group: "🔌 데이터·Integration",  id: "data_product",    label: "└ Data Product",         desc: "데이터 제품·거버넌스·SLA (Enterprise)",             default: { admin:"✅", enterprise:"✅", pro:"🔒", growth:"🔒", free:"🔒", demo:"🔒" } },

  // ── 대메뉴: 👥 내 Team·Help ──────────────────────────────────────────────
  { group: "👥 내 Team·Help", id: "team_members",    label: "👤 Team원 Management",             desc: "Team원 List·Invite (Growth 이상)",                      default: { admin:"✅", enterprise:"✅", pro:"✅", growth:"✅", free:"🔒", demo:"🔒" } },
  { group: "👥 내 Team·Help", id: "team_roles",      label: "└ Role·RBAC Settings",        desc: "Role 기반 접근 제어 (Enterprise)",                  default: { admin:"✅", enterprise:"✅", pro:"🔒", growth:"🔒", free:"🔒", demo:"🔒" } },
  { group: "👥 내 Team·Help", id: "team_activity",   label: "└ Team 활동 내역",          desc: "Team원 활동·Audit Log 열람 (Pro 이상)",               default: { admin:"✅", enterprise:"✅", pro:"✅", growth:"🔒", free:"🔒", demo:"🔒" } },
  { group: "👥 내 Team·Help", id: "help_center",     label: "└ Help·FAQ",            desc: "Help·FAQ·동영상 튜토리얼 (All Free)",            default: { admin:"✅", enterprise:"✅", pro:"✅", growth:"✅", free:"✅", demo:"✅" } },
  { group: "👥 내 Team·Help", id: "support_ticket",  label: "└ 지원 티켓",             desc: "1:1 기술 지원 티켓 (Growth 이상)",                  default: { admin:"✅", enterprise:"✅", pro:"✅", growth:"✅", free:"🔒", demo:"🔒" } },

  // ── 대메뉴: ⚙️ 시스템 (Admin 전용) ─────────────────────────────────────
  { group: "⚙️ 시스템 (Admin)", id: "admin",         label: "🔐 Admin Settings",           desc: "Platform 전반 Management (admin 전용)",                     default: { admin:"✅", enterprise:"🔒", pro:"🔒", growth:"🔒", free:"🔒", demo:"🔒" } },
  { group: "⚙️ 시스템 (Admin)", id: "audit_log",     label: "└ All Audit Log",         desc: "All User 활동 감사 (admin·Enterprise)",           default: { admin:"✅", enterprise:"✅", pro:"👁", growth:"🔒", free:"🔒", demo:"🔒" } },
  { group: "⚙️ 시스템 (Admin)", id: "sys_monitor",   label: "└ 시스템 모니터",          desc: "API Status·디스크·DB 모니터 (admin·Enterprise)",      default: { admin:"✅", enterprise:"✅", pro:"🔒", growth:"🔒", free:"🔒", demo:"🔒" } },
  { group: "⚙️ 시스템 (Admin)", id: "pricing",       label: "└ Subscription Pricing·Plan Management",    desc: "Plan Pricing·메뉴 접근Permission Settings (admin 전용)",          default: { admin:"✅", enterprise:"🔒", pro:"🔒", growth:"🔒", free:"🔒", demo:"🔒" } },
  { group: "⭐ UX 편의",       id: "sidebar_fav",    label: "⭐ 즐겨찾기",             desc: "사이드바 메뉴 즐겨찾기 (All)",                    default: { admin:"✅", enterprise:"✅", pro:"✅", growth:"✅", free:"✅", demo:"✅" } },
  { group: "⭐ UX 편의",       id: "sidebar_recent", label: "🕐 최근 방문",            desc: "최근 방문 메뉴 빠른 접근 (All)",                  default: { admin:"✅", enterprise:"✅", pro:"✅", growth:"✅", free:"✅", demo:"✅" } },
];

const PERM_CYCLE = ["✅", "👁", "🔒"];
const PERM_COLOR = { "✅": "#22c55e", "👁": "#f59e0b", "🔒": "#ef4444" };
const PERM_LABEL = { "✅": "Allow", "👁": "읽기전용", "🔒": "잠금" };
// Starter Plan 제거 — Free / Growth / Pro / Enterprise 4단계
const ROLES_COLS = ["admin", "enterprise", "pro", "growth", "free", "demo"];
const ROLE_COLORS_MA = { admin: "#ef4444", enterprise: "#f59e0b", pro: "#a855f7", growth: "#4f8ef7", free: "#8da4c4", demo: "#64748b" };

function MenuAccessTab() {
  const STORAGE_KEY = "genie_menu_access";
  const [perms, setPerms] = React.useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (saved) return saved;
    } catch (_) {}
    const init = {};
    MENU_ACCESS_ROWS.forEach(r => { init[r.id] = { ...r.default }; });
    return init;
  });
  const [saved, setSaved] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [filterGroup, setFilterGroup] = React.useState("all");
  const [showRecommend, setShowRecommend] = React.useState(false);
  const [recApplied, setRecApplied] = React.useState(false);
  const { token, reloadMenuAccess } = useAuth();

  const groups = ["all", ...Array.from(new Set(MENU_ACCESS_ROWS.map(r => r.group)))];

  const cyclePerm = (menuId, role) => {
    setPerms(prev => {
      const cur = prev[menuId]?.[role] || "\uD83D\uDD12";
      const idx = PERM_CYCLE.indexOf(cur);
      const next = PERM_CYCLE[(idx + 1) % PERM_CYCLE.length];
      return { ...prev, [menuId]: { ...prev[menuId], [role]: next } };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    // 1) localStorage 즉시 Save (fallback)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(perms));

    // 2) 백엔드 Sync: ✅Allow=price_krw:1, 👁읽기전용=price_krw:2, 🔒 = Save 제외
    try {
      const items = [];
      MENU_ACCESS_ROWS.forEach(row => {
        ROLES_COLS.forEach(role => {
          const perm = perms[row.id]?.[role] || "\uD83D\uDD12";
          if (perm !== "\uD83D\uDD12") {
            items.push({
              menu_key: row.id,
              menu_path: row.label,
              plan: role,
              cycle: "monthly",
              price_krw: perm === "\u2705" ? 1 : 2,
              discount_pct: 0,
            });
          }
        });
      });
      await fetch("/api/auth/pricing/menu-access", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token || ""}` },
        body: JSON.stringify({ permissions: perms, items }),
      });
      // 3) Sidebar·AuthContext 즉시 갱신
      if (reloadMenuAccess) reloadMenuAccess();
    } catch (e) {
      console.warn("[MenuAccess] 백엔드 Save Failed, localStorage만 사용:", e);
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleReset = () => {
    const init = {};
    MENU_ACCESS_ROWS.forEach(r => { init[r.id] = { ...r.default }; });
    setPerms(init);
    localStorage.removeItem(STORAGE_KEY);
  };

  // Recommend Permission Apply 함Count
  const applyRecommended = () => {
    const newPerms = {};
    MENU_ACCESS_ROWS.forEach(r => {
      newPerms[r.id] = RECOMMENDED_PERMS[r.id]
        ? { ...RECOMMENDED_PERMS[r.id] }
        : { ...r.default };
    });
    setPerms(newPerms);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newPerms));
    setRecApplied(true);
    setShowRecommend(false);
    setTimeout(() => setRecApplied(false), 4000);
  };

  const filtered = filterGroup === "all" ? MENU_ACCESS_ROWS : MENU_ACCESS_ROWS.filter(r => r.group === filterGroup);
  let lastGroup = null;

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {/* Header */}
      <div style={{ padding: "14px 18px", borderRadius: 12, background: "rgba(79,142,247,0.06)", border: "1px solid rgba(79,142,247,0.25)", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 15, color: "#93c5fd" }}>🔐 메뉴 Access Control 매트릭스</div>
          <div style={{ fontSize: 11, color: "#7c8fa8", marginTop: 4 }}>Roleper 메뉴·Feature Access Control을 Clicks으로 Change (✅ Allow · 👁 읽기전용 · 🔒 잠금)</div>
          <div style={{ fontSize: 10, color: "#64748b", marginTop: 6 }}>새로운 메뉴·Feature Add 시 즉시 반영됩니다 (이상감지·모델Compare·즐겨찾기 포함)</div>
          {recApplied && <div style={{ marginTop: 6, fontSize: 11, color: "#22c55e", fontWeight: 700 }}>✓ 경쟁 Platform Analysis 기반 최적 Permission이 Apply되었습니다. Save Button을 눌러 반영하세요.</div>}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <button onClick={() => setShowRecommend(v => !v)} style={{
            padding: "7px 14px", borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: "pointer",
            background: showRecommend ? "rgba(168,85,247,0.2)" : "rgba(168,85,247,0.08)",
            border: `1px solid ${showRecommend ? "rgba(168,85,247,0.6)" : "rgba(168,85,247,0.3)"}`,
            color: "#c084fc", transition: "all 200ms",
          }}>🤖 AI Recommend 보기 {showRecommend ? "▲" : "▼"}</button>
          <button onClick={handleReset} disabled={saving} style={{ padding: "7px 14px", borderRadius: 8, border: "1px solid rgba(234,179,8,0.3)", background: "rgba(234,179,8,0.06)", color: "#fbbf24", fontSize: 11, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1 }}>↩ BasicValue Reset</button>
          <button onClick={handleSave} disabled={saving} style={{ padding: "7px 18px", borderRadius: 8, border: "none", background: saved ? "rgba(34,197,94,0.15)" : saving ? "rgba(79,142,247,0.4)" : "linear-gradient(135deg,#4f8ef7,#6366f1)", color: saved ? "#22c55e" : "#fff", fontSize: 11, fontWeight: 800, cursor: saving ? "not-allowed" : "pointer", boxShadow: (saved || saving) ? "none" : "0 4px 12px rgba(79,142,247,0.3)" }}>
            {saving ? "⏳ Save in progress..." : saved ? "✓ Save Done (Sidebar 반영됨)" : "💾 Save하기"}
          </button>
        </div>
      </div>

      {/* AI Recommend Panel */}
      {showRecommend && (
        <div style={{ borderRadius: 14, border: "1px solid rgba(168,85,247,0.35)", background: "linear-gradient(135deg, rgba(168,85,247,0.06) 0%, rgba(79,142,247,0.04) 100%)", padding: "18px 20px", display: "grid", gap: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 14, color: "#c084fc" }}>🤖 경쟁 Platform Analysis 기반 — 최적 접근Permission Recommend</div>
              <div style={{ fontSize: 10, color: "#7c8fa8", marginTop: 4 }}>
                Triple Whale · Northbeam · Rockerbox · Klaviyo Plan 구조를 Analysis하여 Geniego-ROI 에 최적화된 Growth / Pro / Enterprise 접근Permission을 제안합니다.
              </div>
            </div>
            <button onClick={applyRecommended} style={{
              padding: "9px 22px", borderRadius: 10, border: "none", cursor: "pointer", fontWeight: 800, fontSize: 12,
              background: "linear-gradient(135deg, #a855f7, #6366f1)", color: "#fff",
              boxShadow: "0 4px 16px rgba(168,85,247,0.35)", transition: "all 200ms",
            }}>✨ Recommend Permission 즉시 Apply</button>
          </div>

          {/* 경쟁사 참고 섹션 */}
          <div style={{ background: "rgba(0,0,0,0.2)", borderRadius: 10, padding: "12px 16px", fontSize: 10, color: "#64748b", lineHeight: 1.8 }}>
            <span style={{ color: "#7c8fa8", fontWeight: 700 }}>📊 경쟁 Platform Plan 구조 참고:</span>
            {"  "}
            <span style={{ color: "#4f8ef7" }}>Triple Whale</span> Growth→Pro→Enterprise (CDP·코호트·DWH Sync 단계적 개방){"  "}|{"  "}
            <span style={{ color: "#22d3ee" }}>Northbeam</span> Starter→Pro→Enterprise (창의 Analysis·API export→전용 CSM·무한 도메인){"  "}|{"  "}
            <span style={{ color: "#f472b6" }}>Rockerbox</span> MTA·창의 Analysis·멀티유저 (Pro부터){"  "}|{"  "}
            <span style={{ color: "#fb923c" }}>Klaviyo</span> Email→Email+SMS→Enterprise (ForecastAI·Advanced 세그→커스텀)
          </div>

          {/* Planper Card */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
            {RECOMMEND_ANALYSIS.map(a => (
              <div key={a.plan} style={{ borderRadius: 12, border: `1px solid ${a.color}33`, background: `${a.color}08`, padding: "14px 16px", display: "grid", gap: 10 }}>
                <div style={{ fontWeight: 800, fontSize: 13, color: a.color }}>{a.plan}</div>
                <div>
                  <div style={{ fontSize: 9, color: "#64748b", fontWeight: 700, marginBottom: 4, letterSpacing: "0.5px" }}>포함 Feature</div>
                  <div style={{ fontSize: 10, color: "#94a3b8", lineHeight: 1.6 }}>{a.features}</div>
                </div>
                <div>
                  <div style={{ fontSize: 9, color: "#22c55e", fontWeight: 700, marginBottom: 4, letterSpacing: "0.5px" }}>✅ 단독 제공 (이 Plan만)</div>
                  <div style={{ fontSize: 10, color: "#86efac", lineHeight: 1.6 }}>{a.exclusive}</div>
                </div>
                <div>
                  <div style={{ fontSize: 9, color: "#ef4444", fontWeight: 700, marginBottom: 4, letterSpacing: "0.5px" }}>🔒 잠금 (상위 Plan 필요)</div>
                  <div style={{ fontSize: 10, color: "#fca5a5", lineHeight: 1.6 }}>{a.locked}</div>
                </div>
              </div>
            ))}
          </div>

          {/* 차per화 핵심 포인트 */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
            {[
              { label: "🌐 Enterprise 전용 Feature", items: ["RBAC Role·Permission Settings","Price Optimization AI","Event 정규화·DWH Sync","Data Product·거버넌스","시스템 모니터"], color: "#f59e0b" },
              { label: "🚀 Pro 전용 Feature", items: ["AI Forecast (LTV·이탈·구매)","코호트 Analysis·P&L","인플루언서 Hub·Write-back","AI Rule 엔진·1st-Party Pixel","Global Channel·WMS Advanced"], color: "#a855f7" },
              { label: "📈 Growth 제공 Feature", items: ["실Time 모니터·Notification 피드","Basic Channel 커넥터·CRM","Orders허브·Stock·카탈로그","AI Campaign·Budget 플래너","정산·지급·Team원 Management"], color: "#4f8ef7" },
            ].map(s => (
              <div key={s.label} style={{ borderRadius: 10, border: `1px solid ${s.color}22`, background: `${s.color}06`, padding: "12px 14px" }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: s.color, marginBottom: 8 }}>{s.label}</div>
                {s.items.map(i => <div key={i} style={{ fontSize: 10, color: "#7c8fa8", lineHeight: 1.7 }}>• {i}</div>)}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 범례 */}
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", fontSize: 11 }}>
        {Object.entries(PERM_LABEL).map(([icon, lbl]) => (
          <span key={icon} style={{ display: "flex", alignItems: "center", gap: 5, color: PERM_COLOR[icon] }}>
            <span style={{ fontSize: 14 }}>{icon}</span>{lbl}
          </span>
        ))}
        <span style={{ color: "#64748b" }}>|</span>
        <span style={{ color: "#7c8fa8", fontSize: 10 }}>각 셀을 Clicks하면 Permission이 순환 Change됩니다</span>
      </div>

      {/* 그룹 Filter */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {groups.map(g => (
          <button key={g} onClick={() => setFilterGroup(g)} style={{
            padding: "4px 12px", borderRadius: 99, fontSize: 10, fontWeight: 700, cursor: "pointer", border: "1px solid",
            background: filterGroup === g ? "rgba(79,142,247,0.15)" : "transparent",
            borderColor: filterGroup === g ? "rgba(79,142,247,0.5)" : "rgba(255,255,255,0.1)",
            color: filterGroup === g ? "#4f8ef7" : "#94a3b8",
          }}>{g === "all" ? "All" : g}</button>
        ))}
      </div>

      {/* Table */}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
          <thead>
            <tr style={{ background: "rgba(15,23,42,0.9)" }}>
              <th style={{ padding: "10px 14px", textAlign: "left", color: "#7c8fa8", fontWeight: 700, borderBottom: "1px solid #1c2842", minWidth: 200 }}>메뉴·Feature</th>
              <th style={{ padding: "10px 14px", textAlign: "left", color: "#475569", fontWeight: 600, borderBottom: "1px solid #1c2842", minWidth: 180, fontSize: 10 }}>Feature Description / 제공 Plan</th>
              {ROLES_COLS.map(r => (
                <th key={r} style={{ padding: "10px 8px", textAlign: "center", color: ROLE_COLORS_MA[r], fontWeight: 800, borderBottom: "1px solid #1c2842", minWidth: 72 }}>
                  <div style={{ fontSize: 12 }}>{r === "admin" ? "👑" : r === "enterprise" ? "🌐" : r === "pro" ? "🚀" : r === "growth" ? "📈" : r === "free" ? "🆓" : "👁"}</div>
                  <div style={{ fontSize: 9, marginTop: 2 }}>{r.toUpperCase()}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(row => {
              const showGroupHeader = row.group !== lastGroup;
              lastGroup = row.group;
              return (
                <React.Fragment key={row.id}>
                  {showGroupHeader && (
                    <tr>
                      <td colSpan={ROLES_COLS.length + 2} style={{
                        padding: "12px 14px 6px", fontSize: 11, fontWeight: 900,
                        color: "#93c5fd", background: "rgba(79,142,247,0.06)",
                        borderTop: "1px solid rgba(79,142,247,0.15)",
                        borderBottom: "1px solid rgba(79,142,247,0.1)",
                        letterSpacing: "0.3px",
                      }}>
                        {row.group}
                      </td>
                    </tr>
                  )}
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(79,142,247,0.04)"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <td style={{ padding: "7px 14px", color: row.label.startsWith("└") ? "#a5b4fc" : "#e2e8f0", fontWeight: row.label.startsWith("└") ? 500 : 700 }}>
                      {row.label}
                    </td>
                    <td style={{ padding: "7px 10px", color: "#475569", fontSize: 10, lineHeight: 1.4, maxWidth: 200 }}>
                      {row.desc}
                    </td>
                    {ROLES_COLS.map(role => {
                      const perm = perms[row.id]?.[role] || "🔒";
                      return (
                        <td key={role} style={{ padding: "7px 8px", textAlign: "center" }}>
                          <button
                            onClick={() => cyclePerm(row.id, role)}
                            title={`${row.label}\n${role.toUpperCase()}: ${PERM_LABEL[perm] || perm}\nClicks하여 Permission Change`}
                            style={{
                              fontSize: 15, border: "none", background: "transparent", cursor: "pointer",
                              padding: "2px 6px", borderRadius: 6, transition: "all 100ms",
                              opacity: perm === "🔒" ? 0.4 : 1,
                            }}
                          >{perm}</button>
                        </td>
                      );
                    })}
                  </tr>
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Role Description */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
        {[
          { role: "admin",      desc: "모든 Feature 접근 + 설정 변경 가능",             color: "#ef4444" },
          { role: "enterprise", desc: "All Feature + API 무제한 + 커스텀 설정",         color: "#f59e0b" },
          { role: "pro",        desc: "Paid Feature All + 리포트 생성",                 color: "#a855f7" },
          { role: "growth",     desc: "핵심 Feature + 일부 Advanced Feature (Growth 이상)",     color: "#4f8ef7" },
          { role: "free",       desc: "Free 가입 — Virtual Data 체험 전용",            color: "#8da4c4" },
          { role: "demo",       desc: "체험 Demo — Virtual Data로 All Feature 미리보기", color: "#64748b" },
        ].map(({ role, desc, color }) => (
          <div key={role} style={{ padding: "10px 14px", borderRadius: 10, background: `${color}08`, border: `1px solid ${color}22` }}>
            <div style={{ fontWeight: 800, color, fontSize: 12, marginBottom: 4 }}>{role.toUpperCase()}</div>
            <div style={{ fontSize: 10, color: "#94a3b8", lineHeight: 1.5 }}>{desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Admin 그룹·Tab 정의 ────────────────────────────────────────────────── */
const ADMIN_GROUPS = [
  {
    id: "users",
    icon: "👥",
    label: "사용자·권한",
    desc: "회원 및 권한",
    color: "#4f8ef7",
    subs: [
      { id: "overview",      label: "👥 사용자 및 권한 관리" },
      { id: "feedback_mgmt", label: "💬 사용자 피드백 관리" },
    ],
  },
  {
    id: "billing",
    icon: "💳",
    label: "구독·결제·메뉴",
    desc: "결제 및 플랜",
    color: "#a855f7",
    subs: [
      { id: "subscription_pricing", label: "💳 구독 및 요금제 관리" },
      { id: "coupons",              label: "🎁 무료 쿠폰 발급 여정 관리" },
      { id: "popup_mgmt",          label: "📣 이벤트 팝업 관리" },
      { id: "license",             label: "🎟 라이선스 발급" },
    ],
  },
  {
    id: "system",
    icon: "🖥️",
    label: "시스템·운영",
    desc: "시스템·운영",
    color: "#14d9b0",
    subs: [
      { id: "ai_policy",   label: "🤖 AI 정책 관리" },
      { id: "mapping",     label: "🧩 매핑 레지스트리" },
      { id: "apikeys",     label: "🔑 API 키 관리" },
      { id: "connectors",  label: "🔌 외부 커넥터 연동" },
      { id: "system_mon",  label: "🖥️ 시스템 모니터링" },
      { id: "operations",  label: "⚡ 운영 작업 관리" },
      { id: "audit",       label: "🧧 감사(Audit) 로그" },
    ],
  },
];

export default function Admin() {
  const t = useT();
  const [adminKey] = useState(DEMO_ADMIN_KEY);
  const [tab, setTab] = useState("overview"); // 기존 tab Status 보전
  const [activeGroup, setActiveGroup] = useState("users");

  const handleGroupChange = (gId) => {
    setActiveGroup(gId);
    const g = ADMIN_GROUPS.find(x => x.id === gId);
    if (g && g.subs.length > 0) setTab(g.subs[0].id);
    else setTab("overview");
  };

  const activeGroupData = ADMIN_GROUPS.find(g => g.id === activeGroup);

  const ROLES = [
    { name: "admin",   perms: ["모든 읽기", "모든 쓰기", "설정 변경", "사용자 관리", "플랜 변경"], color: "#ef4444", desc: "Admin - 모든 기능 접근 가능" },
    { name: "pro",     perms: ["모든 읽기", "데이터 쓰기", "리포트 생성", "API 키 관리"], color: "#a855f7", desc: "Pro - 모든 유료 기능" },
    { name: "demo",    perms: ["제한적 읽기", "Demo 데이터만"], color: "#eab308", desc: "Demo - 체험용" },
    { name: "enterprise", perms: ["모든 읽기", "모든 쓰기", "커스텀 설정", "API 무제한"], color: "#f59e0b", desc: "Enterprise - 최고 사양" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 80px)", gap: 0 }}>

      {/* KPI Strip — 고정 Header 영역 */}
      <div className="grid4" style={{ flexShrink: 0, padding: "0 0 12px" }}>
        {[
          { l: "Active User", v: "4", c: "#4f8ef7" },
          { l: "Connect된 API", v: "6", c: "#22c55e" },
          { l: "정책 규칙", v: "28", c: "#a855f7" },
          { l: "가동률", v: "99.97%", c: "#14d9b0" },
        ].map(({ l, v, c }, i) => (
          <div key={l} className="kpi-card card-hover fade-up" style={{ "--accent": c, animationDelay: `${i * 60}ms` }}>
            <div className="kpi-label">{l}</div>
            <div className="kpi-value" style={{ color: c }}>{v}</div>
          </div>
        ))}
      </div>

      {/* Tab + 콘텐츠 컨테이너 */}
      <div className="card card-glass" style={{ padding: 0, flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {/* 5개 주 Tab 그룹 바 */}
      <div style={{
        flexShrink: 0, padding: "0 16px",
        borderBottom: "1px solid #1c2842",
        background: "rgba(10,15,30,0.97)",
        backdropFilter: "blur(12px)",
        display: "flex", gap: 2,
      }}>
        {ADMIN_GROUPS.map(g => {
          const isActive = activeGroup === g.id;
          return (
            <button key={g.id} onClick={() => handleGroupChange(g.id)} style={{
              padding: "14px 18px", border: "none", background: "transparent", cursor: "pointer",
              borderBottom: `2px solid ${isActive ? g.color : "transparent"}`,
              transition: "all 150ms", textAlign: "center", whiteSpace: "nowrap",
            }}>
              <div style={{ fontSize: 16, marginBottom: 1 }}>{g.icon}</div>
              <div style={{ fontSize: 11, fontWeight: isActive ? 800 : 500, color: isActive ? "#e2e8f0" : "#7c8fa8" }}>{g.label}</div>
              <div style={{ fontSize: 8, color: isActive ? g.color : "#374151", marginTop: 1 }}>{g.desc}</div>
            </button>
          );
        })}
      </div>

      {/* 서브Tab 바 (해당 그룹에 서브Tab이 있을 때만 표시) */}
      {activeGroupData && activeGroupData.subs.length > 0 && (
        <div style={{
          flexShrink: 0, padding: "0 16px",
          borderBottom: "1px solid rgba(255,255,255,0.04)",
          background: "rgba(8,12,24,0.6)",
          display: "flex", gap: 0,
        }}>
          {activeGroupData.subs.map(st => (
            <button key={st.id} onClick={() => setTab(st.id)} style={{
              padding: "9px 16px", border: "none", background: "transparent", cursor: "pointer",
              borderBottom: `2px solid ${tab === st.id ? activeGroupData.color : "transparent"}`,
              color: tab === st.id ? "#e2e8f0" : "#64748b",
              fontSize: 11, fontWeight: tab === st.id ? 700 : 400,
              transition: "all 120ms", whiteSpace: "nowrap",
              display: "flex", alignItems: "center", gap: 5,
            }}>
              <span>{st.label}</span>
              {tab === st.id && <span style={{ width: 4, height: 4, borderRadius: "50%", background: activeGroupData.color, display: "inline-block" }} />}
            </button>
          ))}
        </div>
      )}

        {/* 콘텐츠 — 스크롤 가능 */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 16px" }}>
          {/* TAB: User & Permission */}
          {tab === "overview" && (
            <div style={{ display: "grid", gap: 24 }}>
              {/* 사용자 관리 Panel (API Integration) */}
              <UserManagementPanel />

              {/* Role·Permission 정의 */}
              <div style={{ padding: "16px 20px", borderRadius: 14, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <div style={{ fontWeight: 800, fontSize: 14, color: "#e2e8f0", marginBottom: 14 }}>🔐 플랜별 권한 정의</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
                  {ROLES.map(r => (
                    <div key={r.name} style={{ padding: "12px 14px", borderRadius: 10, background: `${r.color}08`, border: `1px solid ${r.color}33` }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                        <span style={{ fontSize: 11, padding: "2px 10px", borderRadius: 99, fontWeight: 800, background: `${r.color}1e`, color: r.color }}>{r.name}</span>
                      </div>
                      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginBottom: 8 }}>{r.desc}</div>
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                        {r.perms.map(p => (
                          <span key={p} style={{ fontSize: 9, padding: "2px 7px", borderRadius: 4, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)" }}>{p}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB: 피드백 Management */}
          {tab === "feedback_mgmt" && <FeedbackMgmtPanel />}

          {/* TAB: SubscriptionPricing Management */}
          {tab === "subscription_pricing" && <SubscriptionPricing />}

          {/* TAB: Free 쿠폰 발급 여정 관리 */}
          {tab === "coupons" && <CouponMgmtPanel />}

          {/* TAB: 라이선스 Issue */}
          {tab === "license" && <LicenseKeyPanel />}

          {/* TAB: API 키 관리 */}
          {tab === "apikeys" && <ApiKeyPanel />}

          {/* TAB: 커넥터 Test */}
          {tab === "connectors" && (
            <div style={{ display: "grid", gap: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
                {INTEGRATIONS.map(api => (
                  <div key={api.name} className="card card-hover" style={{ padding: "12px 14px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <span style={{ fontSize: 20 }}>{api.icon}</span>
                      <span className={`badge ${api.status === "connected" ? "badge-green" : "badge-yellow"}`} style={{ fontSize: 10 }}>
                        <span className={`dot ${api.status === "connected" ? "dot-green" : "dot-yellow"}`} />
                        {api.status === "connected" ? "연결됨" : "주의"}
                      </span>
                    </div>
                    <div style={{ marginTop: 8, fontWeight: 700, fontSize: 13, color: api.color }}>{api.name}</div>
                    <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 6, display: "grid", gap: 2 }}>
                      <span>최초 연결일: {api.since}</span>
                      <span>호출량: {api.calls}/일</span>
                    </div>
                  </div>
                ))}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>
                  🔌 실제 API 호출 Test
                  <span style={{ fontSize: 10, color: "#7c8fa8", marginLeft: 8, fontWeight: 400 }}>크레덴셜 없으면 mock 데이터 반환</span>
                </div>
                <ConnectorPanel apiKey={adminKey} />
              </div>
            </div>
          )}

          {/* TAB: AI 정책 (AIPolicy Unified) */}
          {tab === "ai_policy" && (
            <div style={{ display: "grid", gap: 16 }}>
              <div style={{ padding: "12px 16px", borderRadius: 12, background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.2)" }}>
                <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 4 }}>🤖 AI Auto화 정책 Management</div>
                <div style={{ fontSize: 11, color: "var(--text-3)" }}>LLM 기반 의사결정 규칙 · AutoRun 조건 · Safety Guardrail Settings</div>
              </div>
              {[
                { name: "이탈 Forecast Auto Action", desc: "이탈 확률 70% 이상 → Auto Coupon Send", status: "active", model: "XGBoost v2", trigger: "실Time", action: "Kakao Message", accuracy: "87%" },
                { name: "LTV 기반 세그먼트 재분류", desc: "월per LTV Change 15% 이상 → 세그먼트 Auto Move", status: "active", model: "LightGBM", trigger: "일 1회", action: "CRM Update", accuracy: "91%" },
                { name: "Ad Budget Auto 최적화", desc: "ROAS < 1.5 → Budget 30% Auto 삭감", status: "paused", model: "Rule-based", trigger: "6Time", action: "Meta API", accuracy: "-" },
                { name: "Product 재입고 Forecast Notification", desc: "30일 내 Stock 소진 Forecast → 발주 Notification", status: "active", model: "SARIMA", trigger: "매일 09:00", action: "Email Notification", accuracy: "78%" },
              ].map(p => (
                <div key={p.name} style={{ padding: "14px 16px", borderRadius: 10, background: "var(--card)", border: "1px solid var(--border)", display: "grid", gridTemplateColumns: "1fr auto", gap: 12, alignItems: "center" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                      <span style={{ fontWeight: 700, fontSize: 13 }}>{p.name}</span>
                      <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 99, fontWeight: 700, background: p.status === "active" ? "rgba(34,197,94,0.15)" : "rgba(234,179,8,0.15)", color: p.status === "active" ? "#22c55e" : "#eab308" }}>{p.status === "active" ? "활성" : "일시정지"}</span>
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 8 }}>{p.desc}</div>
                    <div style={{ display: "flex", gap: 12, fontSize: 10, color: "var(--text-3)" }}>
                      <span>모델: <b style={{ color: "var(--text-2)" }}>{p.model}</b></span>
                      <span>트리거: <b style={{ color: "var(--text-2)" }}>{p.trigger}</b></span>
                      <span>Action: <b style={{ color: "#4f8ef7" }}>{p.action}</b></span>
                      <span>정확도: <b style={{ color: "#22c55e" }}>{p.accuracy}</b></span>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button className="btn" style={{ fontSize: 10, padding: "4px 10px" }}>편집</button>
                    <button className="btn" style={{ fontSize: 10, padding: "4px 10px", background: p.status === "active" ? "rgba(234,179,8,0.1)" : "rgba(34,197,94,0.1)", color: p.status === "active" ? "#eab308" : "#22c55e" }}>{p.status === "active" ? "일시정지" : "활성화"}</button>
                  </div>
                </div>
              ))}
              <button className="btn-primary" style={{ width: "fit-content", padding: "8px 20px" }}>+ 새 AI 정책 Add</button>
            </div>
          )}

          {/* TAB: 매핑 레지스트리 (MappingRegistry Unified) */}
          {tab === "mapping" && (
            <div style={{ display: "grid", gap: 16 }}>
              <div style={{ padding: "12px 16px", borderRadius: 12, background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.2)" }}>
                <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 4 }}>🧩 필드 매핑 레지스트리</div>
                <div style={{ fontSize: 11, color: "var(--text-3)" }}>Channelper 필드명 표준화 · 스키마 매핑 · 네임스페이스 Management</div>
              </div>
              <div style={{ display: "grid", gap: 8 }}>
                {[
                  { src: "meta.campaign_name", dst: "campaign.name", type: "string", status: "ok" },
                  { src: "shopify.total_price", dst: "order.revenue", type: "decimal", status: "ok" },
                  { src: "cafe24.member_id", dst: "customer.external_id", type: "string", status: "ok" },
                  { src: "naver.ad_cost", dst: "ad.spend", type: "decimal", status: "ok" },
                  { src: "tiktok.video_views", dst: "ad.impressions", type: "integer", status: "warn" },
                  { src: "google.clicks", dst: "ad.clicks", type: "integer", status: "ok" },
                  { src: "kakao.message_sent", dst: "crm.sent_count", type: "integer", status: "ok" },
                  { src: "amazon.asin", dst: "product.sku", type: "string", status: "ok" },
                ].map((m, i) => (
                  <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 20px 1fr auto auto", gap: 10, alignItems: "center", padding: "8px 12px", borderRadius: 8, background: "var(--card)", border: "1px solid var(--border)" }}>
                    <code style={{ fontSize: 11, color: "#f59e0b" }}>{m.src}</code>
                    <span style={{ color: "var(--text-3)", textAlign: "center" }}>→</span>
                    <code style={{ fontSize: 11, color: "#4f8ef7" }}>{m.dst}</code>
                    <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 4, background: "rgba(99,102,241,0.1)", color: "#818cf8" }}>{m.type}</span>
                    <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 4, fontWeight: 700, background: m.status === "ok" ? "rgba(34,197,94,0.1)" : "rgba(234,179,8,0.1)", color: m.status === "ok" ? "#22c55e" : "#eab308" }}>{m.status === "ok" ? "✓" : "!"}</span>
                  </div>
                ))}
              </div>
              <button className="btn-primary" style={{ width: "fit-content", padding: "8px 20px" }}>+ 새 매핑 Add</button>
            </div>
          )}

          {/* TAB: 시스템 모니터 */}
          {tab === "system_mon" && (
            <div style={{ display: "grid", gap: 16 }}>
              <div className="grid4">
                {[
                  { l: "CPU 사용률", v: "34%", c: "#22c55e" },
                  { l: "Note리", v: "2.1 / 8 GB", c: "#4f8ef7" },
                  { l: "DB 쿼리/s", v: "128", c: "#a855f7" },
                  { l: "API 응답Time", v: "82ms", c: "#14d9b0" },
                ].map(({ l, v, c }) => (
                  <div key={l} className="kpi-card" style={{ "--accent": c }}>
                    <div className="kpi-label">{l}</div>
                    <div className="kpi-value" style={{ color: c }}>{v}</div>
                  </div>
                ))}
              </div>
              <div style={{ padding: "16px", borderRadius: 10, background: "var(--card)", border: "1px solid var(--border)" }}>
                <div style={{ fontWeight: 700, marginBottom: 12 }}>📡 서비스 Status</div>
                {[
                  { name: "API Gateway", status: "online", latency: "45ms", uptime: "99.97%" },
                  { name: "Database (MySQL)", status: "online", latency: "12ms", uptime: "99.99%" },
                  { name: "Redis Cache", status: "online", latency: "2ms", uptime: "100%" },
                  { name: "AI Forecast 서비스", status: "online", latency: "230ms", uptime: "99.8%" },
                  { name: "Email Send 서버", status: "online", latency: "180ms", uptime: "99.5%" },
                  { name: "Webhook Count신기", status: "online", latency: "28ms", uptime: "99.9%" },
                ].map(s => (
                  <div key={s.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid rgba(99,140,255,0.07)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e", display: "inline-block" }} />
                      <span style={{ fontSize: 12, fontWeight: 600 }}>{s.name}</span>
                    </div>
                    <div style={{ display: "flex", gap: 16, fontSize: 11, color: "var(--text-3)" }}>
                      <span>지연: <b style={{ color: "#4f8ef7" }}>{s.latency}</b></span>
                      <span>가동률: <b style={{ color: "#22c55e" }}>{s.uptime}</b></span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB: 운영 Management */}
          {tab === "operations" && (
            <div style={{ display: "grid", gap: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div style={{ padding: "16px", borderRadius: 10, background: "var(--card)", border: "1px solid var(--border)" }}>
                  <div style={{ fontWeight: 700, marginBottom: 12 }}>⚡ 최근 Actions</div>
                  {[
                    { time: "12:13", action: "META Campaign Budget 조정", user: "admin", status: "Done" },
                    { time: "11:45", action: "CRM 세그먼트 재분류 Run", user: "system", status: "Done" },
                    { time: "10:30", action: "Shopify Orders Sync", user: "system", status: "Done" },
                    { time: "09:00", action: "Daily KPI 리포트 생성", user: "system", status: "Done" },
                    { time: "08:45", action: "Email Campaign Auto Send", user: "system", status: "Done" },
                  ].map((op, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid rgba(99,140,255,0.07)", fontSize: 12 }}>
                      <div>
                        <span style={{ color: "var(--text-3)", marginRight: 8 }}>{op.time}</span>
                        <span>{op.action}</span>
                      </div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <span style={{ fontSize: 10, color: "var(--text-3)" }}>{op.user}</span>
                        <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 4, background: "rgba(34,197,94,0.1)", color: "#22c55e" }}>{op.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ padding: "16px", borderRadius: 10, background: "var(--card)", border: "1px solid var(--border)" }}>
                  <div style={{ fontWeight: 700, marginBottom: 12 }}>🔧 빠른 Run</div>
                  {[
                    { label: "All Channel Sync Run", icon: "🔄", color: "#4f8ef7" },
                    { label: "AI 모델 재학습 트리거", icon: "🤖", color: "#a855f7" },
                    { label: "Cache Reset", icon: "🗑️", color: "#f59e0b" },
                    { label: "Daily 리포트 즉시 Create", icon: "📋", color: "#22c55e" },
                    { label: "Backup 즉시 Run", icon: "💾", color: "#14d9b0" },
                  ].map((op, i) => (
                    <button key={i} className="btn" style={{ width: "100%", marginBottom: 8, display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", textAlign: "left" }}>
                      <span style={{ fontSize: 16 }}>{op.icon}</span>
                      <span style={{ color: op.color, fontWeight: 600, fontSize: 12 }}>{op.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB: Event Popup Management */}
          {tab === "popup_mgmt" && <PopupMgmtPanel />}

          {/* TAB: Audit Log */}
          {tab === "audit" && (
            <div style={{ display: "grid", gap: 12 }}>
              <div style={{ padding: "12px 16px", borderRadius: 10, background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.2)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontWeight: 700 }}>🧾 Audit Log (최근 50건)</div>
                <button className="btn" style={{ fontSize: 11 }}>CSV Export</button>
              </div>
              {[
                { time: "2026-03-11 12:13", user: "admin@demo.kr", action: "user.invite", target: "newuser@demo.kr", ip: "203.0.113.1", result: "success" },
                { time: "2026-03-11 11:45", user: "system", action: "crm.segment_update", target: "VIP 세그먼트", ip: "-", result: "success" },
                { time: "2026-03-11 11:30", user: "analyst@demo.kr", action: "report.export", target: "monthly_report.csv", ip: "203.0.113.2", result: "success" },
                { time: "2026-03-11 10:00", user: "admin@demo.kr", action: "api_key.rotate", target: "meta_ads_key", ip: "203.0.113.1", result: "success" },
                { time: "2026-03-11 09:30", user: "unknown", action: "auth.login_fail", target: "admin@demo.kr", ip: "198.51.100.5", result: "failed" },
                { time: "2026-03-11 09:00", user: "system", action: "backup.complete", target: "db_backup_20260311.sql", ip: "-", result: "success" },
              ].map((log, i) => (
                <div key={i} style={{ padding: "10px 14px", borderRadius: 8, background: "var(--card)", border: `1px solid ${log.result === "failed" ? "rgba(239,68,68,0.25)" : "var(--border)"}`, display: "grid", gridTemplateColumns: "130px 1fr 1fr 1fr auto", gap: 12, alignItems: "center", fontSize: 11 }}>
                  <span style={{ color: "var(--text-3)" }}>{log.time}</span>
                  <span style={{ color: "#4f8ef7", fontWeight: 600 }}>{log.user}</span>
                  <code style={{ fontSize: 10, color: "#f59e0b" }}>{log.action}</code>
                  <span style={{ color: "var(--text-2)" }}>{log.target}</span>
                  <span style={{ padding: "2px 8px", borderRadius: 4, fontWeight: 700, background: log.result === "success" ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)", color: log.result === "success" ? "#22c55e" : "#ef4444" }}>{log.result}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
