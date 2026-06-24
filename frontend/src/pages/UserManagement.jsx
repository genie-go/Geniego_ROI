import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import { useI18n } from '../i18n';

import { useT } from '../i18n/index.js';
const API = "/api";
const PLANS = ["free", "demo", "starter", "growth", "pro", "enterprise", "admin"];
const PLAN_COLORS = {
    free: "#8da4c4", demo: "#64748b", starter: "#22c55e",
    growth: "#4f8ef7", pro: "#8b5cf6",
    enterprise: "#f59e0b", admin: "#ef4444",
};
const ALL_PERMS = [
    "read", "write", "marketing", "ops", "wms", "finance", "billing", "admin", "ai", "export",
];

const css = {
    card: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: "20px 24px", marginBottom: 16 },
    badge: (plan) => ({ display: "inline-block", padding: "2px 10px", borderRadius: 20, fontSize: 10, fontWeight: 700, background: (PLAN_COLORS[plan] || "#64748b") + "22", color: PLAN_COLORS[plan] || "#64748b", textTransform: "uppercase", letterSpacing: 0.5 }),
    input: { width: "100%", padding: "8px 12px", borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: "#0f172a", fontSize: 12, boxSizing: "border-box" },
    btn: (variant = "primary") => ({
        padding: "7px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700,
        background: variant === "primary" ? "linear-gradient(135deg,#4f8ef7,#6366f1)" : variant === "danger" ? "rgba(239,68,68,0.15)" : "#e2e8f0",
        color: variant === "danger" ? "#ef4444" : "#fff",
    }),
    label: { display: "block", fontSize: 10, color: 'var(--text-3)', marginBottom: 4, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 },
    row: { display: "grid", gap: 12, marginBottom: 12 },
    th: { fontSize: 10, color: "var(--text-3)", fontWeight: 700, padding: "8px 10px", textAlign: "left", textTransform: "uppercase", letterSpacing: 0.5, borderBottom: "1px solid #e8edf3" },
    td: { fontSize: 12, color: '#1e293b', padding: "10px 10px", borderBottom: "1px solid #eef2f7", verticalAlign: "middle" },
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
    if (loading) return <div style={{ color: "var(--text-3)", padding: 40, textAlign: "center" }}>로딩 중...</div>;
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
                        <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 4 }}>{s.label}</div>
                    </div>
                ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div style={css.card}>
                    <div style={{ fontWeight: 700, marginBottom: 14, fontSize: 13 }}>플랜per 회원 현황</div>
                    {(data.by_plan || []).map(p => (
                        <div key={p.plan} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                            <span style={css.badge(p.plan)}>{p.plan}</span>
                            <div style={{ fontSize: 12, color: '#fff' }} >활성 <strong>{p.active}</strong> / 전체 {p.total}</div>
                            <div style={{ width: 80, height: 4, borderRadius: 2, background: "#e8edf3", overflow: "hidden" }}>
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
                                <div style={{ color: '#fff', fontWeight: 600 }}>{u.name || u.email}</div>
                                <div style={{ color: "var(--text-3)", fontSize: 10 }}>{u.email}</div>
                            </div>
                            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                                <span style={css.badge(u.plan)}>{u.plan}</span>
                                <div style={{ color: "var(--text-3)", fontSize: 10 }}>{u.created_at?.slice(0, 10)}</div>
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
    const [grantMonths, setGrantMonths] = useState("0"); // 무료 부여 기간(개월). 0=무기한
    const [newPw, setNewPw] = useState("");
    const [createForm, set생성Form] = useState({ email: "", password: "", name: "", company: "", plan: "" });
    const [show생성, setShow생성] = useState(false);
    const [msg, setMsg] = useState("");

    // 구독 상태 파생: 무료/데모/관리자 + 유료(체험/구독중/무기한/만료) — 만료일·cycle 기준
    const subStatus = (u) => {
        const plan = String(u.plan || "").toLowerCase();
        if (plan === "free") return { label: "무료", color: "#64748b" };
        if (plan === "demo") return { label: "데모체험", color: "#a855f7" };
        if (plan === "admin") return { label: "관리자", color: "#ef4444" };
        const expStr = u.subscription_expires_at;
        const exp = expStr ? new Date(expStr) : null;
        const now = new Date();
        if (exp && exp < now) return { label: "만료", color: "#ef4444" };
        if (!exp) return { label: "무기한", color: "#16a34a" };
        const days = Math.max(0, Math.ceil((exp - now) / 86400000));
        if ((u.subscription_cycle || "") === "trial") return { label: `체험 D-${days}`, color: "#f59e0b" };
        if ((u.subscription_cycle || "") === "admin_grant") return { label: `무료부여 D-${days}`, color: "#0ea5e9" };
        return { label: `구독중 D-${days}`, color: "#22c55e" };
    };

    const qPath = `v423/admin/users?page=${page}&limit=20${q ? `&q=${encodeURIComponent(q)}` : ""}${filterPlan ? `&plan=${filterPlan}` : ""}`;
    const { data, loading, refetch } = useAdminApi(qPath, [page, q, filterPlan]);
    // [현 차수] 구독 만료 임박(30일 이내) 회원 — 갱신권유·실시간 파악
    const [expiringView, setExpiringView] = useState(false);
    const { data: expData } = useAdminApi("v423/admin/users-expiring?days=30", []);
    const expSummary = expData?.summary || { total: 0, expired: 0, within7: 0, within30: 0 };

    const { data: rolesData } = useAdminApi("v423/admin/roles");
    const allRoles = rolesData?.roles || [];

    // ★ 201차 통합: 플랜 목록을 PlanPricing(/admin/plan-pricing) 정본(v424/admin/plans)과 동기화.
    //   판매 플랜(동적) + 시스템 플랜(free/demo/admin)을 합쳐 회원 배정에 사용 → 두 화면 플랜 집합 일치.
    const { data: plansData } = useAdminApi("v424/admin/plans");
    const planOptions = useMemo(() => {
        const sellable = (plansData?.plans || []).map(p => p.plan_id).filter(Boolean);
        return sellable.length ? [...new Set(["free", "demo", ...sellable, "admin"])] : PLANS;
    }, [plansData]);

    const patch = async (path, body, method = "PATCH") => {
        const d = await adminPost(token, path, body, method);
        setMsg(d.message || (d.ok ? "✅ 저장 완료" : `❌ ${d.error}`));
        refetch();
        setTimeout(() => setMsg(""), 3000);
    };

    const do생성 = async () => {
        const d = await adminPost(token, "v423/admin/users", createForm);
        setMsg(d.ok ? `✅ 회원 생성 완료 (ID: ${d.user_id})` : `❌ ${d.error}`);
        if (d.ok) { setShow생성(false); set생성Form({ email: "", password: "", name: "", company: "", plan: "" }); refetch(); }
        setTimeout(() => setMsg(""), 3000);
    };

    return (
        <div>
            {/* Toolbar */}
            <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
                <input placeholder="Name/Email 검색..." value={q} onChange={e => { setQ(e.target.value); setPage(1) }} style={{ ...css.input, width: 220 }} />
                <button style={css.btn("primary")} onClick={() => setShow생성(true)}>+ 회원 추가</button>
                {msg && <div style={{ fontSize: 12, color: msg.startsWith("✅") ? "#22c55e" : "#ef4444" }}>{msg}</div>}
            </div>

            {/* 플랜별 구분 필터 탭 (전체/데모체험/Starter/Growth/Pro/Enterprise + 회원수) */}
            <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
                {(() => {
                    const st = data?.stats || {};
                    const sum = Object.values(st).reduce((a, b) => a + (Number(b) || 0), 0);
                    const FILTERS = [
                        { v: "", label: "전체", cnt: sum },
                        { v: "demo", label: "데모체험", cnt: (Number(st.free) || 0) + (Number(st.demo) || 0) },
                        { v: "starter", label: "Starter", cnt: Number(st.starter) || 0 },
                        { v: "growth", label: "Growth", cnt: Number(st.growth) || 0 },
                        { v: "pro", label: "Pro", cnt: Number(st.pro) || 0 },
                        { v: "enterprise", label: "Enterprise", cnt: Number(st.enterprise) || 0 },
                    ];
                    return FILTERS.map(f => {
                        const active = filterPlan === f.v;
                        return (
                            <button key={f.v || "all"} onClick={() => { setFilterPlan(f.v); setPage(1); }}
                                style={{
                                    padding: "7px 16px", borderRadius: 9, cursor: "pointer", fontSize: 12.5, fontWeight: 800,
                                    border: active ? "2px solid #4f8ef7" : "1px solid rgba(99,140,255,0.2)",
                                    background: active ? "rgba(79,142,247,0.14)" : "transparent",
                                    color: active ? "#4f8ef7" : "var(--text-2)",
                                }}>
                                {f.label} <span style={{ opacity: 0.7, fontWeight: 600 }}>({f.cnt})</span>
                            </button>
                        );
                    });
                })()}
            </div>

            {/* [현 차수] 구독 만료 임박(30일) — 갱신권유·실시간 파악 */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, flexWrap: "wrap", padding: "10px 14px", borderRadius: 12, background: expSummary.total > 0 ? "linear-gradient(135deg,rgba(245,158,11,0.1),rgba(239,68,68,0.06))" : "rgba(255,255,255,0.02)", border: "1px solid " + (expSummary.total > 0 ? "rgba(245,158,11,0.3)" : "rgba(255,255,255,0.08)") }}>
                <span style={{ fontSize: 18 }}>⏰</span>
                <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: "var(--text-1)" }}>구독 만료 임박 (30일 이내) — 갱신권유 대상</div>
                    <div style={{ fontSize: 11.5, color: "var(--text-3)", marginTop: 2 }}>
                        총 <b style={{ color: "#f59e0b" }}>{expSummary.total}명</b> · 이미 만료 <b style={{ color: "#ef4444" }}>{expSummary.expired}</b> · 7일내 <b style={{ color: "#f97316" }}>{expSummary.within7}</b> · 30일내 <b style={{ color: "#eab308" }}>{expSummary.within30}</b>
                    </div>
                </div>
                <button onClick={() => setExpiringView(v => !v)} style={{ padding: "8px 16px", borderRadius: 9, border: "none", cursor: "pointer", background: expiringView ? "#ef4444" : "linear-gradient(135deg,#f59e0b,#f97316)", color: "#fff", fontWeight: 800, fontSize: 12.5 }}>
                    {expiringView ? "✕ 닫기" : "임박 회원 보기"}
                </button>
            </div>

            {expiringView && (
                <div style={{ ...css.card, padding: 0, overflow: "hidden", marginBottom: 16, borderColor: "rgba(245,158,11,0.3)" }}>
                    <div style={{ padding: "10px 14px", fontWeight: 800, fontSize: 13, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>⏰ 구독 만료 임박 회원 ({(expData?.users || []).length}명) — 갱신 권유</div>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead><tr>{["회원", "플랜", "남은 일수", "구독 만료일", "연락처", "갱신 권유"].map(h => <th key={h} style={css.th}>{h}</th>)}</tr></thead>
                        <tbody>
                            {(expData?.users || []).length === 0 ? (
                                <tr><td colSpan={6} style={{ ...css.td, textAlign: "center", color: "var(--text-3)", padding: 24 }}>30일 이내 만료 예정 회원이 없습니다.</td></tr>
                            ) : (expData?.users || []).map(u => {
                                const dl = u.days_left;
                                const c = dl < 0 ? "#ef4444" : dl <= 7 ? "#f97316" : "#eab308";
                                return (
                                    <tr key={u.id} style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                                        <td style={css.td}><div style={{ fontWeight: 700, color: "#fff" }}>{u.name}</div><div style={{ fontSize: 10, color: "var(--text-3)" }}>{u.email}</div></td>
                                        <td style={css.td}><span style={css.badge(u.plan)}>{u.plan}</span></td>
                                        <td style={css.td}><span style={{ fontSize: 12, fontWeight: 900, color: c }}>{dl < 0 ? `만료 ${-dl}일 경과` : `D-${dl}`}</span></td>
                                        <td style={css.td}><span style={{ fontSize: 11, color: "var(--text-3)" }}>{u.subscription_expires_at ? String(u.subscription_expires_at).slice(0, 10) : "—"}</span></td>
                                        <td style={css.td}><span style={{ fontSize: 11, color: "var(--text-3)" }}>{u.phone || "—"}</span></td>
                                        <td style={css.td}>{u.email && <a href={`mailto:${u.email}?subject=${encodeURIComponent("[GeniegoROI] 구독 갱신 안내")}`} style={{ fontSize: 11, fontWeight: 700, color: "#4f8ef7", textDecoration: "none", padding: "4px 10px", borderRadius: 6, border: "1px solid rgba(79,142,247,0.3)" }}>✉ 갱신 안내</a>}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

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
                                {planOptions.map(p => <option key={p} value={p}>{p}</option>)}
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
                            {["ID", "Name/Email", "회사", "플랜", "구독상태", "구독만료", "쿠폰사용일", "활성", "가입일", "Action"].map(h => (
                                <th key={h} style={css.th}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={10} style={{ ...css.td, textAlign: "center", color: "var(--text-3)", padding: 30 }}>로딩 중...</td></tr>
                        ) : (data?.users || []).map(u => (
                            <tr key={u.id} style={{ cursor: "pointer" }} onClick={() => { setSelected(selected?.id === u.id ? null : u); setPlanEdit(u.plan); }}>
                                <td style={css.td}><span style={{ color: "var(--text-3)", fontSize: 11 }}>#{u.id}</span></td>
                                <td style={css.td}>
                                    <div style={{ fontWeight: 600, color: '#fff' }}>{u.name}</div>
                                    <div style={{ fontSize: 10, color: "var(--text-3)" }}>{u.email}</div>
                                </td>
                                <td style={css.td}><span style={{ fontSize: 11, color: 'var(--text-3)' }}>{u.company || "—"}</span></td>
                                <td style={css.td}><span style={css.badge(u.plan)}>{u.plan}</span></td>
                                <td style={css.td}>{(() => { const s = subStatus(u); return <span style={{ fontSize: 10.5, fontWeight: 800, padding: "2px 8px", borderRadius: 6, background: s.color + "22", color: s.color, whiteSpace: "nowrap" }}>{s.label}</span>; })()}</td>
                                <td style={css.td}><span style={{ fontSize: 11, color: 'var(--text-3)' }}>{u.subscription_expires_at ? String(u.subscription_expires_at).slice(0, 10) : "—"}</span></td>
                                <td style={css.td}><span style={{ fontSize: 11, color: 'var(--text-3)' }}>{u.coupon_used_at ? String(u.coupon_used_at).slice(0, 10) : "—"}</span></td>
                                <td style={css.td}>
                                    <span style={{ fontSize: 10, fontWeight: 700, color: u.is_active ? "#22c55e" : "#ef4444" }}>
                                        {u.is_active ? "활성" : "비활성"}
                                    </span>
                                </td>
                                <td style={css.td}><span style={{ fontSize: 11, color: 'var(--text-3)' }}>{u.created_at?.slice(0, 10)}</span></td>
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
                <span style={{ fontSize: 12, color: "var(--text-3)", padding: "7px 10px" }}>
                    {page} / {data?.pages || 1} · 총 {data?.total || 0}명
                </span>
                {page < (data?.pages || 1) && <button style={css.btn()} onClick={() => setPage(p => p + 1)}>Next →</button>}
            </div>

            {/* Detail panel */}
            {selected && (
                <div style={{ ...css.card, borderColor: "rgba(79,142,247,0.3)", marginTop: 16 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 16 }}>회원 상세 — {selected.name} ({selected.email})</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
                        {/* Plan grant (결제 없이 무료 부여) */}
                        <div>
                            <label style={css.label}>구독 플랜 부여 (결제 없이 무료)</label>
                            <select style={css.input} value={planEdit} onChange={e => setPlanEdit(e.target.value)}>
                                {planOptions.map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                            <select style={{ ...css.input, marginTop: 6 }} value={grantMonths} onChange={e => setGrantMonths(e.target.value)}
                                title="유료 플랜 부여 기간 (무기한=평생 무료). 체험 중인 회원은 체험 시작일 기준으로 산입됩니다.">
                                <option value="0">기간: 무기한(평생 무료)</option>
                                <option value="1">기간: 1개월 무료</option>
                                <option value="3">기간: 3개월 무료</option>
                                <option value="6">기간: 6개월 무료</option>
                                <option value="12">기간: 12개월 무료</option>
                            </select>
                            <button style={{ ...css.btn("primary"), marginTop: 8, width: "100%" }}
                                onClick={() => patch(`v423/admin/users/${selected.id}/plan`, { plan: planEdit, months: parseInt(grantMonths) || 0 })}>
                                플랜 무료 부여
                            </button>
                            <div style={{ fontSize: 10.5, color: "var(--text-3)", marginTop: 6, lineHeight: 1.5 }}>
                                Starter/Growth/Pro/Enterprise 선택 시 결제 없이 무료 부여됩니다. free/demo 선택 시 무료 회원으로 전환.
                            </div>
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

/* ─── TAB: 권한(역할) 관리 ───────────────────────────────────────────────── */
function RolesTab() {
    const t = useT();
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
        setMsg(d.ok ? "✅ 저장 완료" : `❌ ${d.error}`);
        if (d.ok) { refetch(); setForm({ role_key: "", name_ko: "", name_en: "", permissions: [], is_active: 1, sort_order: 0 }); }
        setTimeout(() => setMsg(""), 3000);
    };

    const del = async (role_key) => {
        if (!confirm(`역할 '${role_key}'을 삭제할까요?`)) return;
        await adminDelete(token, `v423/admin/roles/${role_key}`);
        refetch();
    };

    return (
        <div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                {/* Form */}
                <div style={css.card}>
                    <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 14 }}>역할 생성 / 편집</div>
                    <div style={{ ...css.row, gridTemplateColumns: "1fr 1fr" }}>
                        <div>
                            <label style={css.label}>역할 키 (영문소문자_)</label>
                            <input style={css.input} value={form.role_key} onChange={e => setForm(f => ({ ...f, role_key: e.target.value.replace(/[^a-z0-9_]/g, "") }))} placeholder="e.g. marketing_mgr" />
                        </div>
                        <div>
                            <label style={css.label}>{t('userMgmtPage.sortOrder', '정렬 순서')}</label>
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
                        <label style={css.label}>권한 설정 (복수 선택)</label>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
                            {ALL_PERMS.map(p => (
                                <button key={p} onClick={() => togglePerm(p)} style={{ padding: "4px 12px", borderRadius: 20, border: "1px solid", fontSize: 11, fontWeight: 600, cursor: "pointer", background: form.permissions.includes(p) ? "rgba(79,142,247,0.2)" : "#eef2f7", borderColor: form.permissions.includes(p) ? "#4f8ef7" : "rgba(255,255,255,0.1)", color: form.permissions.includes(p) ? "#4f8ef7" : "#64748b" }}>
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
                        <button style={css.btn("primary")} onClick={save}>{t('save', '저장')}</button>
                        {msg && <span style={{ fontSize: 12, color: msg.startsWith("✅") ? "#22c55e" : "#ef4444" }}>{msg}</span>}
                    </div>
                </div>

                {/* Role list */}
                <div style={css.card}>
                    <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 14 }}>등록된 역할</div>
                    {loading ? <div style={{ color: "var(--text-3)", fontSize: 12 }}>로딩 중...</div> : (data?.roles || []).map(r => {
                        let perms = [];
                        try { perms = typeof r.permissions === "string" ? JSON.parse(r.permissions) : r.permissions; } catch { }
                        return (
                            <div key={r.role_key} style={{ padding: "12px 14px", borderRadius: 10, border: '1px solid var(--border)', marginBottom: 8, position: "relative" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: 11, color: "var(--text-3)" }} >{r.name_ko} <span>({r.role_key})</span></div>
                                        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 6 }}>
                                            {(perms || []).map(p => (
                                                <span key={p} style={{ padding: "2px 8px", borderRadius: 20, fontSize: 10, background: "rgba(79,142,247,0.1)", color: "#4f8ef7", border: "1px solid rgba(79,142,247,0.2)" }}>{p}</span>
                                            ))}
                                        </div>
                                    </div>
                                    <div style={{ display: "flex", gap: 6 }}>
                                        <button style={{ ...css.btn(), padding: "3px 10px", fontSize: 11 }} onClick={() => editRole(r)}>편집</button>
                                        <button style={{ ...css.btn("danger"), padding: "3px 10px", fontSize: 11 }} onClick={() => del(r.role_key)}>{t('delete', '삭제')}</button>
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
    const t = useT();
    const { data, loading } = useAdminApi("v423/admin/billing");

    const STATUS_COLOR = { active: "#22c55e", cancelled: "#ef4444", payment_failed: "#f59e0b", trial: "#8b5cf6" };

    if (loading) return <div style={{ color: "var(--text-3)", padding: 40, textAlign: "center" }}>로딩 중...</div>;

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
                        <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 4 }}>{m.plan_name || "전체"} MRR · {m.count}명</div>
                    </div>
                ))}
                {mrr.length === 0 && <div style={{ ...css.card, color: "var(--text-3)", fontSize: 12 }}>Paddle 구독 데이터 없음 (webhook 수신 후 반영됨)</div>}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                {/* Subscriptions */}
                <div style={{ ...css.card, padding: 0, overflow: "hidden" }}>
                    <div style={{ padding: "14px 18px", fontWeight: 700, fontSize: 13, borderBottom: "1px solid #e8edf3" }}>구독 현황</div>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead><tr>{["회원", "플랜", "Status", "Amount", "NextPayment"].map(h => <th key={h} style={css.th}>{h}</th>)}</tr></thead>
                        <tbody>
                            {subs.length === 0 ? (
                                <tr><td colSpan={5} style={{ ...css.td, textAlign: "center", color: "var(--text-3)", padding: 20 }}>데이터 없음</td></tr>
                            ) : subs.map((s, i) => (
                                <tr key={i}>
                                    <td style={css.td}><div style={{ fontSize: 10, color: "var(--text-3)" }} >{s.user_name || "—"}</div><div>{s.user_email}</div></td>
                                    <td style={css.td}><span style={{ fontSize: 11 }}>{s.paddle_plan || s.plan_name}</span></td>
                                    <td style={css.td}><span style={{ color: STATUS_COLOR[s.status] || "#fff", fontSize: 11, fontWeight: 700 }}>{s.status}</span></td>
                                    <td style={css.td}><strong style={{ color: "#22c55e" }}>{s.currency} {s.unit_price}</strong></td>
                                    <td style={css.td}><span style={{ fontSize: 11, color: 'var(--text-3)' }}>{s.next_bill_date || "—"}</span></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Events */}
                <div style={{ ...css.card, padding: 0, overflow: "hidden" }}>
                    <div style={{ padding: "14px 18px", fontWeight: 700, fontSize: 13, borderBottom: "1px solid #e8edf3" }}>{t('userMgmtPage.paymentEvent', '결제 이벤트')}</div>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead><tr>{["Event", "발생시각", "처리상태"].map(h => <th key={h} style={css.th}>{h}</th>)}</tr></thead>
                        <tbody>
                            {events.length === 0 ? (
                                <tr><td colSpan={3} style={{ ...css.td, textAlign: "center", color: "var(--text-3)", padding: 20 }}>데이터 없음 (Paddle webhook 설정 후 수신)</td></tr>
                            ) : events.map((e, i) => (
                                <tr key={i}>
                                    <td style={css.td}><span style={{ fontSize: 11, color: e.event_type?.includes("failed") ? "#ef4444" : e.event_type?.includes("refunded") ? "#f59e0b" : "#22c55e" }}>{e.event_type}</span></td>
                                    <td style={css.td}><span style={{ fontSize: 10, color: 'var(--text-3)' }}>{e.occurred_at?.slice(0, 16)}</span></td>
                                    <td style={css.td}><span style={{ fontSize: 10, color: e.processed ? "#22c55e" : "#f59e0b" }}>{e.processed ? "완료" : "처리 중"}</span></td>
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
            {loading ? <div style={{ color: "var(--text-3)" }}>로딩 중...</div> : (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead><tr>{["시각", "Event ID", "Action", "상세"].map(h => <th key={h} style={css.th}>{h}</th>)}</tr></thead>
                    <tbody>
                        {logs.map((l, i) => (
                            <tr key={i}>
                                <td style={css.td}><span style={{ fontSize: 10, color: 'var(--text-3)' }}>{l.created_at?.slice(0, 16)}</span></td>
                                <td style={css.td}><span style={{ fontSize: 10, color: "var(--text-3)" }}>{l.event_id}</span></td>
                                <td style={css.td}><span style={{ fontSize: 11, fontWeight: 700, color: "#4f8ef7" }}>{l.action}</span></td>
                                <td style={css.td}><span style={{ fontSize: 11, color: 'var(--text-2)' }}>{l.detail}</span></td>
                            </tr>
                        ))}
                        {logs.length === 0 && <tr><td colSpan={4} style={{ ...css.td, textAlign: "center", color: "var(--text-3)", padding: 20 }}>감사 로그 없음</td></tr>}
                    </tbody>
                </table>
            )}
        </div>
    );
}

/* ─── TAB: 회원 로그(전 테넌트 보안 감사 + 무결성) ─────────────────────────────
 *  admin 전용. 기존 AdminGrowth::securityAudit(GET /v424/admin/security-audit) 재사용.
 *  무결성 배지는 해시체인 verify 결과(변조 시 broken_at).
 */
function MemberAuditTab() {
    const t = useT();
    const { data, loading } = useAdminApi("v424/admin/security-audit");
    const logs = data?.logs || [];
    const integ = data?.integrity || null;
    const detailText = (det) => {
        if (!det || typeof det !== "object") return "—";
        const parts = Object.entries(det).map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : v}`);
        return parts.length ? parts.join(", ") : "—";
    };
    return (
        <div style={css.card}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>🛡️ {t('memberLog.tabMemberLog', '회원 로그')} ({logs.length})</div>
                {integ && (
                    <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 9px", borderRadius: 20, background: integ.ok ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)", color: integ.ok ? "#16a34a" : "#ef4444" }}>
                        {t('memberLog.integrity', '무결성')}: {integ.ok ? "OK" : `BROKEN @${integ.broken_at}`}
                    </span>
                )}
            </div>
            {loading ? <div style={{ color: "var(--text-3)" }}>로딩 중...</div> : (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead><tr>{[t('memberLog.tenant', '테넌트'), t('memberLog.user', '사용자'), t('memberLog.action', '동작'), t('memberLog.ipAddr', 'IP'), t('memberLog.time', '시각'), t('memberLog.detail', '상세')].map(h => <th key={h} style={css.th}>{h}</th>)}</tr></thead>
                    <tbody>
                        {logs.map((l, i) => (
                            <tr key={l.id || i}>
                                <td style={css.td}><span style={{ fontSize: 10, color: "var(--text-3)" }}>{l.tenant_id || "—"}</span></td>
                                <td style={css.td}><span style={{ fontSize: 11 }}>{l.actor || "—"}</span></td>
                                <td style={css.td}><span style={{ fontSize: 11, fontWeight: 700, color: "#4f8ef7" }}>{l.action || "—"}</span></td>
                                <td style={css.td}><span style={{ fontSize: 10, color: "var(--text-3)" }}>{l.ip_address || "—"}</span></td>
                                <td style={css.td}><span style={{ fontSize: 10, color: "var(--text-3)" }}>{(l.created_at || "").replace("T", " ").slice(0, 19)}</span></td>
                                <td style={css.td}><span style={{ fontSize: 11, color: "var(--text-2)" }}>{detailText(l.details)}</span></td>
                            </tr>
                        ))}
                        {logs.length === 0 && <tr><td colSpan={6} style={{ ...css.td, textAlign: "center", color: "var(--text-3)", padding: 20 }}>{t('memberLog.empty', '기록 없음')}</td></tr>}
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
    { id: "roles", label: "🔐 역할·권한(RBAC)" },
    { id: "billing", label: "💰 결제 내역" },
    { id: "audit", label: "📋 감사 로그" },
    { id: "memberlog", label: "🛡️ 회원 로그" },
];

export default function UserManagement() {
    const { user, token } = useAuth();
    const navigate = useNavigate();
    const [tab, setTab] = useState("stats");
    const [mig완료, setMig완료] = useState(false);
    const [migMsg, setMigMsg] = useState("");

    if (!user || user.plan !== "admin") {
        return (
            <div style={{ padding: 60, textAlign: "center" }}>
                <div style={{ fontSize: 40, marginBottom: 16 }}>🔒</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 8 }}>관리자 전용 페이지</div>
                <div style={{ fontSize: 13, color: 'var(--text-3)' }}>admin 플랜 접근 권한이 필요합니다.</div>
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
        <div style={{ minHeight: "100vh", background: "#f8fafc", color: "#0f172a", fontFamily: "'Inter', 'Segoe UI', sans-serif", padding: "24px 28px" }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: '#fff' }}>⚙️ 통합 관리자 패널</h1>
                    <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--text-3)" }}>회원 · 역할(RBAC) · 결제 · 감사 통합 관리 | 로그인: {user.email}</p>
                </div>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    {migMsg && <span style={{ fontSize: 11, color: migMsg.startsWith("✅") ? "#22c55e" : "#ef4444" }}>{migMsg}</span>}
                    {/* ★ 201차 통합: 요금제·플랜·쿠폰은 /admin/plan-pricing 단독 관리(정본). 중복 탭 제거 후 링크로 연결. */}
                    <button style={{ ...css.btn(), fontSize: 11 }} onClick={() => navigate('/admin/plan-pricing')}>💳 요금제·플랜 설정 →</button>
                    {!mig완료 && <button style={{ ...css.btn(), fontSize: 11 }} onClick={runMigrate}>🔧 DB 마이그레이션</button>}
                </div>
            </div>

            {/* Tabs */}
            <div style={{ display: "flex", gap: 4, marginBottom: 20, borderBottom: "1px solid #e2e8f0", paddingBottom: 0 }}>
                {TABS.map(t => (
                    <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: "8px 18px", borderRadius: "8px 8px 0 0", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700, background: tab === t.id ? "rgba(79,142,247,0.12)" : "transparent", color: tab === t.id ? "#4f8ef7" : "#64748b", borderBottom: tab === t.id ? "2px solid #4f8ef7" : "2px solid transparent", transition: "all 150ms" }}>
                        {t.label}
                    </button>
                ))}
            </div>

            {/* Tab content */}
            {tab === "stats" && <StatsTab />}
            {tab === "members" && <MembersTab />}
            {tab === "roles" && <RolesTab />}
            {tab === "billing" && <BillingTab />}
            {tab === "audit" && <AuditTab />}
            {tab === "memberlog" && <MemberAuditTab />}
        </div>
    );
}
