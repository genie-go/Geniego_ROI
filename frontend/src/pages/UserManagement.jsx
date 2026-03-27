import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../auth/AuthContext.jsx";
import { useI18n } from '../i18n';
import SubscriptionPricing from './SubscriptionPricing.jsx';

import { useT } from '../i18n/index.js';
const API = "/api";
const PLANS = ["free", "demo", "starter", "growth", "pro", "enterprise", "admin"];
const PLAN_COLORS = {
    free: "#8da4c4", demo: "#64748b", starter: "#22c55e",
    growth: "#4f8ef7", pro: "#8b5cf6",
    enterprise: "#f59e0b", admin: "#ef4444",
};
const PERIODS = [
    { months: 1, label: "Monthly (1개월)" },
    { months: 3, label: "Quarter (3개월)" },
    { months: 6, label: "Half-year (6개월)" },
    { months: 12, label: "Annual (12개월)" },
    { months: 24, label: "2년 (24개월)" },
];
const ALL_PERMS = [
    "read", "write", "marketing", "ops", "wms", "finance", "billing", "admin", "ai", "export",
];

const css = {
    card: { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: "20px 24px", marginBottom: 16 },
    badge: (plan) => ({ display: "inline-block", padding: "2px 10px", borderRadius: 20, fontSize: 10, fontWeight: 700, background: (PLAN_COLORS[plan] || "#64748b") + "22", color: PLAN_COLORS[plan] || "#64748b", textTransform: "uppercase", letterSpacing: 0.5 }),
    input: { width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.04)", color: "#e8eaf6", fontSize: 12, boxSizing: "border-box" },
    btn: (variant = "primary") => ({
        padding: "7px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700,
        background: variant === "primary" ? "linear-gradient(135deg,#4f8ef7,#6366f1)" : variant === "danger" ? "rgba(239,68,68,0.15)" : "rgba(255,255,255,0.07)",
        color: variant === "danger" ? "#ef4444" : "#fff",
    }),
    label: { display: "block", fontSize: 10, color: "rgba(255,255,255,0.5)", marginBottom: 4, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 },
    row: { display: "grid", gap: 12, marginBottom: 12 },
    th: { fontSize: 10, color: "rgba(255,255,255,0.4)", fontWeight: 700, padding: "8px 10px", textAlign: "left", textTransform: "uppercase", letterSpacing: 0.5, borderBottom: "1px solid rgba(255,255,255,0.06)" },
    td: { fontSize: 12, color: "rgba(255,255,255,0.8)", padding: "10px 10px", borderBottom: "1px solid rgba(255,255,255,0.04)", verticalAlign: "middle" },
};

function useAdminApi(path, deps = []) {
    const { token } = useAuth();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const refetch = useCallback(() => {
        setLoading(true);
        fetch(`${API}/${path}`, { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.json())
            .then(d => { if (d.ok) setData(d); else setError(d.error || "API error"); })
            .catch(e => setError(e.message))
            .finally(() => setLoading(false));
    }, [path, token]);

    useEffect(() => { refetch(); }, [refetch, ...deps]);
    return { data, loading, error, refetch };
}

async function adminPost(token, path, body, method = "POST") {
    const r = await fetch(`${API}/${path}`, {
        method,
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
    return r.json();
}

async function adminDelete(token, path) {
    const r = await fetch(`${API}/${path}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    return r.json();
}

/* ─── TAB: 대시보드 ─────────────────────────────────────────────────────── */
function StatsTab() {
    const { data, loading } = useAdminApi("v423/admin/stats");
    if (loading) return <div style={{ color: "rgba(255,255,255,0.4)", padding: 40, textAlign: "center" }}>로딩 중...</div>;
    if (!data) return null;

    const planColors = { demo: "#64748b", starter: "#3b82f6", pro: "#8b5cf6", enterprise: "#f59e0b", admin: "#ef4444" };

    return (
        <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 24 }}>
                {[
                    { label: "MRR (USD)", value: `$${(data.mrr_usd || 0).toLocaleString()}`, color: "#22c55e" },
                    { label: "신규 가입 (30일)", value: data.new_users_30d ?? 0, color: "#4f8ef7" },
                    { label: "활성 세션", value: data.active_sessions ?? 0, color: "#8b5cf6" },
                    { label: "모든 플랜 종류", value: (data.by_plan || []).length, color: "#f59e0b" },
                ].map(s => (
                    <div key={s.label} style={{ ...css.card, textAlign: "center" }}>
                        <div style={{ fontSize: 28, fontWeight: 900, color: s.color }}>{s.value}</div>
                        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>{s.label}</div>
                    </div>
                ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div style={css.card}>
                    <div style={{ fontWeight: 700, marginBottom: 14, fontSize: 13 }}>플랜per 회원 현황</div>
                    {(data.by_plan || []).map(p => (
                        <div key={p.plan} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                            <span style={css.badge(p.plan)}>{p.plan}</span>
                            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)" }}>활성 <strong style={{ color: "#fff" }}>{p.active}</strong> / All {p.total}</div>
                            <div style={{ width: 80, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                                <div style={{ width: `${(p.active / p.total) * 100}%`, height: "100%", background: planColors[p.plan] || "#64748b" }} />
                            </div>
                        </div>
                    ))}
                </div>
                <div style={css.card}>
                    <div style={{ fontWeight: 700, marginBottom: 14, fontSize: 13 }}>최근 가입 회원</div>
                    {(data.recent || []).map(u => (
                        <div key={u.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, fontSize: 12 }}>
                            <div>
                                <div style={{ color: "#fff", fontWeight: 600 }}>{u.name || u.email}</div>
                                <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 10 }}>{u.email}</div>
                            </div>
                            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                                <span style={css.badge(u.plan)}>{u.plan}</span>
                                <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 10 }}>{u.created_at?.slice(0, 10)}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

/* ─── TAB: 회원 관리 ─────────────────────────────────────────────────────── */
function MembersTab() {
    const { token } = useAuth();
    const [q, setQ] = useState("");
    const [filterPlan, setFilterPlan] = useState("");
    const [page, setPage] = useState(1);
    const [selected, setSelected] = useState(null);
    const [planEdit, setPlanEdit] = useState("");
    const [newPw, setNewPw] = useState("");
    const [createForm, set생성Form] = useState({ email: "", password: "", name: "", company: "", plan: "demo" });
    const [show생성, setShow생성] = useState(false);
    const [msg, setMsg] = useState("");

    const qPath = `v423/admin/users?page=${page}&limit=20${q ? `&q=${encodeURIComponent(q)}` : ""}${filterPlan ? `&plan=${filterPlan}` : ""}`;
    const { data, loading, refetch } = useAdminApi(qPath, [page, q, filterPlan]);

    const { data: rolesData } = useAdminApi("v423/admin/roles");
    const allRoles = rolesData?.roles || [];

    const patch = async (path, body, method = "PATCH") => {
        const d = await adminPost(token, path, body, method);
        setMsg(d.message || (d.ok ? "✅ Save 완료" : `❌ ${d.error}`));
        refetch();
        setTimeout(() => setMsg(""), 3000);
    };

    const do생성 = async () => {
        const d = await adminPost(token, "v423/admin/users", createForm);
        setMsg(d.ok ? `✅ 회원 생성 완료 (ID: ${d.user_id})` : `❌ ${d.error}`);
        if (d.ok) { setShow생성(false); set생성Form({ email: "", password: "", name: "", company: "", plan: "demo" }); refetch(); }
        setTimeout(() => setMsg(""), 3000);
    };

    return (
        <div>
            {/* Toolbar */}
            <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
                <input placeholder="Name/Email 검색..." value={q} onChange={e => { setQ(e.target.value); setPage(1); }} style={{ ...css.input, width: 220 }} />
                <select value={filterPlan} onChange={e => { setFilterPlan(e.target.value); setPage(1); }} style={{ ...css.input, width: 130 }}>
                    <option value="">모든 플랜</option>
                    {PLANS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                <button style={css.btn("primary")} onClick={() => setShow생성(true)}>+ 회원 추가</button>
                {msg && <div style={{ fontSize: 12, color: msg.startsWith("✅") ? "#22c55e" : "#ef4444" }}>{msg}</div>}
            </div>

            {/* 생성 form */}
            {show생성 && (
                <div style={{ ...css.card, borderColor: "rgba(79,142,247,0.3)", marginBottom: 16 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 14 }}>신규 회원 생성</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 12 }}>
                        {["email", "name", "company"].map(f => (
                            <div key={f}>
                                <label style={css.label}>{f}</label>
                                <input style={css.input} value={createForm[f]} onChange={e => set생성Form(p => ({ ...p, [f]: e.target.value }))} />
                            </div>
                        ))}
                        <div>
                            <label style={css.label}>password</label>
                            <input type="password" style={css.input} value={createForm.password} onChange={e => set생성Form(p => ({ ...p, password: e.target.value }))} />
                        </div>
                        <div>
                            <label style={css.label}>plan</label>
                            <select style={css.input} value={createForm.plan} onChange={e => set생성Form(p => ({ ...p, plan: e.target.value }))}>
                                {PLANS.map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                        </div>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                        <button style={css.btn("primary")} onClick={do생성}>생성</button>
                        <button style={css.btn()} onClick={() => setShow생성(false)}>취소</button>
                    </div>
                </div>
            )}

            {/* Table */}
            <div style={{ ...css.card, padding: 0, overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                        <tr>
                            {["ID", "Name/Email", "회사", "플랜", "Status", "Join Date", "마지막 로그인", "Action"].map(h => (
                                <th key={h} style={css.th}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={8} style={{ ...css.td, textAlign: "center", color: "rgba(255,255,255,0.3)", padding: 30 }}>로딩 중...</td></tr>
                        ) : (data?.users || []).map(u => (
                            <tr key={u.id} style={{ cursor: "pointer" }} onClick={() => { setSelected(selected?.id === u.id ? null : u); setPlanEdit(u.plan); }}>
                                <td style={css.td}><span style={{ color: "rgba(255,255,255,0.4)", fontSize: 11 }}>#{u.id}</span></td>
                                <td style={css.td}>
                                    <div style={{ fontWeight: 600, color: "#fff" }}>{u.name}</div>
                                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>{u.email}</div>
                                </td>
                                <td style={css.td}><span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>{u.company || "—"}</span></td>
                                <td style={css.td}><span style={css.badge(u.plan)}>{u.plan}</span></td>
                                <td style={css.td}>
                                    <span style={{ fontSize: 10, fontWeight: 700, color: u.is_active ? "#22c55e" : "#ef4444" }}>
                                        {u.is_active ? "활성" : "비활성"}
                                    </span>
                                </td>
                                <td style={css.td}><span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>{u.created_at?.slice(0, 10)}</span></td>
                                <td style={css.td}><span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>{u.last_login?.slice(0, 10) || "—"}</span></td>
                                <td style={css.td}>
                                    <div style={{ display: "flex", gap: 6 }}>
                                        <button style={{ ...css.btn(), padding: "4px 10px", fontSize: 11 }} onClick={e => { e.stopPropagation(); patch(`v423/admin/users/${u.id}/active`, { active: !u.is_active }); }}>
                                            {u.is_active ? "비활성화" : "활성화"}
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 12 }}>
                {page > 1 && <button style={css.btn()} onClick={() => setPage(p => p - 1)}>← Previous</button>}
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", padding: "7px 10px" }}>
                    {page} / {data?.pages || 1} · Total {data?.total || 0}명
                </span>
                {page < (data?.pages || 1) && <button style={css.btn()} onClick={() => setPage(p => p + 1)}>Next →</button>}
            </div>

            {/* Detail panel */}
            {selected && (
                <div style={{ ...css.card, borderColor: "rgba(79,142,247,0.3)", marginTop: 16 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 16 }}>회원 상세 — {selected.name} ({selected.email})</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
                        {/* Plan change */}
                        <div>
                            <label style={css.label}>플랜 변경</label>
                            <select style={css.input} value={planEdit} onChange={e => setPlanEdit(e.target.value)}>
                                {PLANS.map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                            <button style={{ ...css.btn("primary"), marginTop: 8, width: "100%" }} onClick={() => patch(`v423/admin/users/${selected.id}/plan`, { plan: planEdit })}>
                                플랜 변경 저장
                            </button>
                        </div>
                        {/* PW reset */}
                        <div>
                            <label style={css.label}>비밀번호 초기화</label>
                            <input type="password" placeholder="새 Password (6자 이상)" style={css.input} value={newPw} onChange={e => setNewPw(e.target.value)} />
                            <button style={{ ...css.btn("danger"), marginTop: 8, width: "100%" }} onClick={() => { patch(`v423/admin/users/${selected.id}/reset-password`, { password: newPw }, "POST"); setNewPw(""); }}>
                                비밀번호 초기화
                            </button>
                        </div>
                        {/* Role assign */}
                        <div>
                            <label style={css.label}>역할 부여</label>
                            <select id="roleSelect" style={css.input}>
                                {allRoles.map(r => <option key={r.role_key} value={r.role_key}>{r.name_ko} ({r.role_key})</option>)}
                            </select>
                            <button style={{ ...css.btn("primary"), marginTop: 8, width: "100%" }} onClick={() => {
                                const sel = document.getElementById("roleSelect");
                                patch(`v423/admin/users/${selected.id}/role`, { role_key: sel.value });
                            }}>
                                역할 부여
                            </button>
                        </div>
                    </div>
                    {/* Paddle info */}
                    {selected.paddle_status && (
                        <div style={{ marginTop: 14, padding: "10px 14px", borderRadius: 8, background: "rgba(79,142,247,0.06)", border: "1px solid rgba(79,142,247,0.15)", fontSize: 12 }}>
                            <strong>Paddle Subscription:</strong> {selected.paddle_plan} · {selected.paddle_status} · Next Payment {selected.next_bill_date || "—"} · {selected.currency} {selected.unit_price}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

/* ─── TAB: 구독 요금제 관리 ──────────────────────────────────────────────────── */
function PlanPricesTab() {
    const { token } = useAuth();
    const { data, loading, refetch } = useAdminApi("v423/admin/plan-prices");
    const [form, setForm] = useState({ plan_key: "pro", period_months: 1, price_usd: "", currency: "USD", discount_pct: 0, label_ko: "", label_en: "", paddle_price_id: "", is_active: 1 });
    const [msg, setMsg] = useState("");

    const save = async () => {
        const d = await adminPost(token, "v423/admin/plan-prices", form);
        setMsg(d.ok ? "✅ Save 완료" : `❌ ${d.error}`);
        if (d.ok) refetch();
        setTimeout(() => setMsg(""), 3000);
    };

    const del = async (plan_key, period_months) => {
        if (!confirm(`${plan_key} / ${period_months}개월 Pricing을 Delete할까요?`)) return;
        const d = await adminDelete(token, `v423/admin/plan-prices/${plan_key}/${period_months}`);
        if (d.ok) refetch();
    };

    const editRow = (row) => setForm({ ...row, is_active: row.is_active ? 1 : 0 });

    const prices = data?.prices || [];
    const groups = PLANS.filter(p => p !== "admin").map(pk => ({
        plan: pk,
        rows: prices.filter(r => r.plan_key === pk),
    }));

    return (
        <div>
            {/* Form */}
            <div style={{ ...css.card, borderColor: "rgba(79,142,247,0.2)", marginBottom: 24 }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 14 }}>구독 요금제 등록 및 수정</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10, marginBottom: 10 }}>
                    <div>
                        <label style={css.label}>플랜</label>
                        <select style={css.input} value={form.plan_key} onChange={e => setForm(p => ({ ...p, plan_key: e.target.value }))}>
                            {PLANS.filter(p => p !== "admin").map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                    </div>
                    <div>
                        <label style={css.label}>Period</label>
                        <select style={css.input} value={form.period_months} onChange={e => setForm(p => ({ ...p, period_months: +e.target.value }))}>
                            {PERIODS.map(p => <option key={p.months} value={p.months}>{p.label}</option>)}
                        </select>
                    </div>
                    <div>
                        <label style={css.label}>Price (USD)</label>
                        <input type="number" style={css.input} value={form.price_usd} onChange={e => setForm(p => ({ ...p, price_usd: e.target.value }))} />
                    </div>
                    <div>
                        <label style={css.label}>할인율 (%)</label>
                        <input type="number" style={css.input} value={form.discount_pct} onChange={e => setForm(p => ({ ...p, discount_pct: e.target.value }))} />
                    </div>
                    <div>
                        <label style={css.label}>레이블 (한국어)</label>
                        <input style={css.input} value={form.label_ko} onChange={e => setForm(p => ({ ...p, label_ko: e.target.value }))} />
                    </div>
                    <div>
                        <label style={css.label}>레이블 (영어)</label>
                        <input style={css.input} value={form.label_en} onChange={e => setForm(p => ({ ...p, label_en: e.target.value }))} />
                    </div>
                    <div>
                        <label style={css.label}>Paddle Price ID</label>
                        <input style={css.input} value={form.paddle_price_id} onChange={e => setForm(p => ({ ...p, paddle_price_id: e.target.value }))} placeholder="pri_01xxx..." />
                    </div>
                    <div>
                        <label style={css.label}>활성화</label>
                        <select style={css.input} value={form.is_active} onChange={e => setForm(p => ({ ...p, is_active: +e.target.value }))}>
                            <option value={1}>활성</option>
                            <option value={0}>비활성</option>
                        </select>
                    </div>
                </div>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <button style={css.btn("primary")} onClick={save}>Save</button>
                    {msg && <span style={{ fontSize: 12, color: msg.startsWith("✅") ? "#22c55e" : "#ef4444" }}>{msg}</span>}
                </div>
            </div>

            {/* Price table */}
            {loading ? <div style={{ color: "rgba(255,255,255,0.4)", textAlign: "center", padding: 30 }}>로딩 중...</div> : (
                groups.map(g => (
                    <div key={g.plan} style={{ ...css.card, marginBottom: 14 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                            <span style={css.badge(g.plan)}>{g.plan}</span>
                            <span style={{ fontWeight: 700, fontSize: 13 }}>Pricing Settings</span>
                        </div>
                        {g.rows.length === 0 ? (
                            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>Register된 Pricing None</div>
                        ) : (
                            <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                <thead>
                                    <tr>{["Period", "레이블", "Price (USD)", "할인율", "Paddle ID", "Status", "Action"].map(h => <th key={h} style={css.th}>{h}</th>)}</tr>
                                </thead>
                                <tbody>
                                    {g.rows.map(r => (
                                        <tr key={r.period_months}>
                                            <td style={css.td}>{PERIODS.find(p => p.months === r.period_months)?.label || `${r.period_months}개월`}</td>
                                            <td style={css.td}>{r.label_ko || r.label_en || "—"}</td>
                                            <td style={css.td}><strong style={{ color: "#22c55e" }}>${r.price_usd}</strong></td>
                                            <td style={css.td}>{r.discount_pct > 0 ? <span style={{ color: "#f59e0b" }}>-{r.discount_pct}%</span> : "—"}</td>
                                            <td style={css.td}><span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>{r.paddle_price_id || "미Settings"}</span></td>
                                            <td style={css.td}><span style={{ color: r.is_active ? "#22c55e" : "#ef4444", fontSize: 11, fontWeight: 700 }}>{r.is_active ? "활성" : "비활성"}</span></td>
                                            <td style={css.td}>
                                                <div style={{ display: "flex", gap: 6 }}>
                                                    <button style={{ ...css.btn(), padding: "3px 10px", fontSize: 11 }} onClick={() => editRow(r)}>편집</button>
                                                    <button style={{ ...css.btn("danger"), padding: "3px 10px", fontSize: 11 }} onClick={() => del(r.plan_key, r.period_months)}>Delete</button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                ))
            )}
        </div>
    );
}

/* ─── TAB: Permission(역할) Management ───────────────────────────────────────────────── */
function RolesTab() {
    const { token } = useAuth();
    const { data, loading, refetch } = useAdminApi("v423/admin/roles");
    const [form, setForm] = useState({ role_key: "", name_ko: "", name_en: "", permissions: [], is_active: 1, sort_order: 0 });
    const [msg, setMsg] = useState("");

    const togglePerm = (perm) => {
        setForm(f => ({
            ...f,
            permissions: f.permissions.includes(perm) ? f.permissions.filter(p => p !== perm) : [...f.permissions, perm],
        }));
    };

    const editRole = (r) => {
        let perms = [];
        try { perms = typeof r.permissions === "string" ? JSON.parse(r.permissions) : r.permissions; } catch { }
        setForm({ role_key: r.role_key, name_ko: r.name_ko, name_en: r.name_en, permissions: perms || [], is_active: r.is_active, sort_order: r.sort_order });
    };

    const save = async () => {
        const d = await adminPost(token, "v423/admin/roles", form);
        setMsg(d.ok ? "✅ Save 완료" : `❌ ${d.error}`);
        if (d.ok) { refetch(); setForm({ role_key: "", name_ko: "", name_en: "", permissions: [], is_active: 1, sort_order: 0 }); }
        setTimeout(() => setMsg(""), 3000);
    };

    const del = async (role_key) => {
        if (!confirm(`역할 '${role_key}'을 Delete할까요?`)) return;
        await adminDelete(token, `v423/admin/roles/${role_key}`);
        refetch();
    };

    return (
        <div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                {/* Form */}
                <div style={css.card}>
                    <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 14 }}>역할 생성 / Edit</div>
                    <div style={{ ...css.row, gridTemplateColumns: "1fr 1fr" }}>
                        <div>
                            <label style={css.label}>역할 키 (영문소문자_)</label>
                            <input style={css.input} value={form.role_key} onChange={e => setForm(f => ({ ...f, role_key: e.target.value.replace(/[^a-z0-9_]/g, "") }))} placeholder="e.g. marketing_mgr" />
                        </div>
                        <div>
                            <label style={css.label}>Sort Order</label>
                            <input type="number" style={css.input} value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: +e.target.value }))} />
                        </div>
                    </div>
                    <div style={{ ...css.row, gridTemplateColumns: "1fr 1fr" }}>
                        <div>
                            <label style={css.label}>Name (한국어)</label>
                            <input style={css.input} value={form.name_ko} onChange={e => setForm(f => ({ ...f, name_ko: e.target.value }))} />
                        </div>
                        <div>
                            <label style={css.label}>Name (영어)</label>
                            <input style={css.input} value={form.name_en} onChange={e => setForm(f => ({ ...f, name_en: e.target.value }))} />
                        </div>
                    </div>
                    <div style={{ marginBottom: 12 }}>
                        <label style={css.label}>Permission Settings (복Count Select)</label>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
                            {ALL_PERMS.map(p => (
                                <button key={p} onClick={() => togglePerm(p)} style={{ padding: "4px 12px", borderRadius: 20, border: "1px solid", fontSize: 11, fontWeight: 600, cursor: "pointer", background: form.permissions.includes(p) ? "rgba(79,142,247,0.2)" : "rgba(255,255,255,0.04)", borderColor: form.permissions.includes(p) ? "#4f8ef7" : "rgba(255,255,255,0.1)", color: form.permissions.includes(p) ? "#4f8ef7" : "rgba(255,255,255,0.5)" }}>
                                    {p}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                        <select style={{ ...css.input, width: 100 }} value={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: +e.target.value }))}>
                            <option value={1}>활성</option>
                            <option value={0}>비활성</option>
                        </select>
                        <button style={css.btn("primary")} onClick={save}>Save</button>
                        {msg && <span style={{ fontSize: 12, color: msg.startsWith("✅") ? "#22c55e" : "#ef4444" }}>{msg}</span>}
                    </div>
                </div>

                {/* Role list */}
                <div style={css.card}>
                    <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 14 }}>Register된 역할</div>
                    {loading ? <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 12 }}>로딩 중...</div> : (data?.roles || []).map(r => {
                        let perms = [];
                        try { perms = typeof r.permissions === "string" ? JSON.parse(r.permissions) : r.permissions; } catch { }
                        return (
                            <div key={r.role_key} style={{ padding: "12px 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.07)", marginBottom: 8, position: "relative" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: 13, color: "#fff" }}>{r.name_ko} <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 11 }}>({r.role_key})</span></div>
                                        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 6 }}>
                                            {(perms || []).map(p => (
                                                <span key={p} style={{ padding: "2px 8px", borderRadius: 20, fontSize: 10, background: "rgba(79,142,247,0.1)", color: "#4f8ef7", border: "1px solid rgba(79,142,247,0.2)" }}>{p}</span>
                                            ))}
                                        </div>
                                    </div>
                                    <div style={{ display: "flex", gap: 6 }}>
                                        <button style={{ ...css.btn(), padding: "3px 10px", fontSize: 11 }} onClick={() => editRole(r)}>편집</button>
                                        <button style={{ ...css.btn("danger"), padding: "3px 10px", fontSize: 11 }} onClick={() => del(r.role_key)}>Delete</button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

/* ─── TAB: 결제 내역 ──────────────────────────────────────────────────────── */
function BillingTab() {
    const { data, loading } = useAdminApi("v423/admin/billing");

    const STATUS_COLOR = { active: "#22c55e", cancelled: "#ef4444", payment_failed: "#f59e0b", trial: "#8b5cf6" };

    if (loading) return <div style={{ color: "rgba(255,255,255,0.4)", padding: 40, textAlign: "center" }}>로딩 중...</div>;

    const subs = data?.subscriptions || [];
    const events = data?.events || [];
    const mrr = data?.mrr_by_plan || [];

    return (
        <div>
            {/* MRR summary */}
            <div style={{ display: "flex", gap: 14, marginBottom: 20, flexWrap: "wrap" }}>
                {mrr.map(m => (
                    <div key={m.plan_name || "all"} style={{ ...css.card, flex: "1 1 160px", textAlign: "center", marginBottom: 0 }}>
                        <div style={{ fontSize: 22, fontWeight: 900, color: "#22c55e" }}>${parseFloat(m.mrr || 0).toLocaleString()}</div>
                        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>{m.plan_name || "All"} MRR · {m.count}명</div>
                    </div>
                ))}
                {mrr.length === 0 && <div style={{ ...css.card, color: "rgba(255,255,255,0.3)", fontSize: 12 }}>Paddle Subscription 데이터 없음 (webhook Count신 후 반영됨)</div>}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                {/* Subscriptions */}
                <div style={{ ...css.card, padding: 0, overflow: "hidden" }}>
                    <div style={{ padding: "14px 18px", fontWeight: 700, fontSize: 13, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>Subscription 현황</div>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead><tr>{["회원", "플랜", "Status", "Amount", "NextPayment"].map(h => <th key={h} style={css.th}>{h}</th>)}</tr></thead>
                        <tbody>
                            {subs.length === 0 ? (
                                <tr><td colSpan={5} style={{ ...css.td, textAlign: "center", color: "rgba(255,255,255,0.3)", padding: 20 }}>데이터 없음</td></tr>
                            ) : subs.map((s, i) => (
                                <tr key={i}>
                                    <td style={css.td}><div style={{ fontSize: 12 }}>{s.user_name || "—"}</div><div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>{s.user_email}</div></td>
                                    <td style={css.td}><span style={{ fontSize: 11 }}>{s.paddle_plan || s.plan_name}</span></td>
                                    <td style={css.td}><span style={{ color: STATUS_COLOR[s.status] || "#fff", fontSize: 11, fontWeight: 700 }}>{s.status}</span></td>
                                    <td style={css.td}><strong style={{ color: "#22c55e" }}>{s.currency} {s.unit_price}</strong></td>
                                    <td style={css.td}><span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>{s.next_bill_date || "—"}</span></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Events */}
                <div style={{ ...css.card, padding: 0, overflow: "hidden" }}>
                    <div style={{ padding: "14px 18px", fontWeight: 700, fontSize: 13, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>Payment Event</div>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead><tr>{["Event", "발생시각", "처리상태"].map(h => <th key={h} style={css.th}>{h}</th>)}</tr></thead>
                        <tbody>
                            {events.length === 0 ? (
                                <tr><td colSpan={3} style={{ ...css.td, textAlign: "center", color: "rgba(255,255,255,0.3)", padding: 20 }}>데이터 없음 (Paddle webhook Settings 후 Count신)</td></tr>
                            ) : events.map((e, i) => (
                                <tr key={i}>
                                    <td style={css.td}><span style={{ fontSize: 11, color: e.event_type?.includes("failed") ? "#ef4444" : e.event_type?.includes("refunded") ? "#f59e0b" : "#22c55e" }}>{e.event_type}</span></td>
                                    <td style={css.td}><span style={{ fontSize: 10, color: "rgba(255,255,255,0.5)" }}>{e.occurred_at?.slice(0, 16)}</span></td>
                                    <td style={css.td}><span style={{ fontSize: 10, color: e.processed ? "#22c55e" : "#f59e0b" }}>{e.processed ? "완료" : "처리상태in progress"}</span></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

/* ─── TAB: 감사 로그 ──────────────────────────────────────────────────────── */
function AuditTab() {
    const { data, loading } = useAdminApi("v423/admin/audit-logs");
    const logs = data?.logs || [];

    return (
        <div style={css.card}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 14 }}>감사 로그 (최근 50건)</div>
            {loading ? <div style={{ color: "rgba(255,255,255,0.4)" }}>로딩 중...</div> : (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead><tr>{["시각", "Event ID", "Action", "상세"].map(h => <th key={h} style={css.th}>{h}</th>)}</tr></thead>
                    <tbody>
                        {logs.map((l, i) => (
                            <tr key={i}>
                                <td style={css.td}><span style={{ fontSize: 10, color: "rgba(255,255,255,0.5)" }}>{l.created_at?.slice(0, 16)}</span></td>
                                <td style={css.td}><span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>{l.event_id}</span></td>
                                <td style={css.td}><span style={{ fontSize: 11, fontWeight: 700, color: "#4f8ef7" }}>{l.action}</span></td>
                                <td style={css.td}><span style={{ fontSize: 11, color: "rgba(255,255,255,0.6)" }}>{l.detail}</span></td>
                            </tr>
                        ))}
                        {logs.length === 0 && <tr><td colSpan={4} style={{ ...css.td, textAlign: "center", color: "rgba(255,255,255,0.3)", padding: 20 }}>감사 로그 None</td></tr>}
                    </tbody>
                </table>
            )}
        </div>
    );
}

/* ─── MAIN ────────────────────────────────────────────────────────────────── */
const TABS = [
    { id: "stats", label: "📊 대시보드" },
    { id: "members", label: "👥 회원 관리" },
    { id: "tier", label: "💳 구독 요금제 관리" },
    { id: "roles", label: "🔐 권한 관리" },
    { id: "billing", label: "💰 결제 내역" },
    { id: "audit", label: "📋 감사 로그" },
];

export default function UserManagement() {
    const { user, token } = useAuth();
    const [tab, setTab] = useState("stats");
    const [mig완료, setMig완료] = useState(false);
    const [migMsg, setMigMsg] = useState("");

    if (!user || user.plan !== "admin") {
        return (
            <div style={{ padding: 60, textAlign: "center" }}>
                <div style={{ fontSize: 40, marginBottom: 16 }}>🔒</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 8 }}>관리자 전용 페이지</div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>admin 플랜 접근 권한이 필요합니다.</div>
            </div>
        );
    }

    const runMigrate = async () => {
        const r = await fetch(`${API}/v423/admin/migrate`, { headers: { Authorization: `Bearer ${token}` } });
        const d = await r.json();
        setMigMsg(d.ok ? "✅ " + d.message : "❌ " + d.error);
        setMig완료(true);
        setTimeout(() => setMigMsg(""), 5000);
    };

    return (
        <div style={{ minHeight: "100vh", background: "#0a0c14", color: "#e8eaf6", fontFamily: "'Inter','Segoe UI',sans-serif", padding: "24px 28px" }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: "#fff" }}>⚙️ 통합 관리자 패널</h1>
                    <p style={{ margin: "4px 0 0", fontSize: 12, color: "rgba(255,255,255,0.4)" }}>회원 · Subscription Pricing · Permission · 회원 · 구독 요금제 · 권한 · 결제 통합 관리 | 로그인: {user.email}</p>
                </div>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    {migMsg && <span style={{ fontSize: 11, color: migMsg.startsWith("✅") ? "#22c55e" : "#ef4444" }}>{migMsg}</span>}
                    {!mig완료 && <button style={{ ...css.btn(), fontSize: 11 }} onClick={runMigrate}>🔧 DB 마이그레이션</button>}
                </div>
            </div>

            {/* Tabs */}
            <div style={{ display: "flex", gap: 4, marginBottom: 20, borderBottom: "1px solid rgba(255,255,255,0.07)", paddingBottom: 0 }}>
                {TABS.map(t => (
                    <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: "8px 18px", borderRadius: "8px 8px 0 0", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700, background: tab === t.id ? "rgba(79,142,247,0.12)" : "transparent", color: tab === t.id ? "#4f8ef7" : "rgba(255,255,255,0.5)", borderBottom: tab === t.id ? "2px solid #4f8ef7" : "2px solid transparent", transition: "all 150ms" }}>
                        {t.label}
                    </button>
                ))}
            </div>

            {/* Tab content */}
            {tab === "stats" && <StatsTab />}
            {tab === "members" && <MembersTab />}
            {tab === "tier" && <SubscriptionPricing />}
            {tab === "roles" && <RolesTab />}
            {tab === "billing" && <BillingTab />}
            {tab === "audit" && <AuditTab />}
        </div>
    );
}
