import { useI18n } from '../i18n';
import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../auth/AuthContext";
import PlanGate from "../components/PlanGate.jsx";
import useDemo from "../hooks/useDemo";
import { useNavigate } from "react-router-dom";
import { useGlobalData } from "../context/GlobalDataContext.jsx";
import AIRecommendBanner from '../components/AIRecommendBanner.jsx';

import { useT } from '../i18n/index.js';

/* Mocked defaults for removed DemoDataLayer */
const DEMO_CRM_CUSTOMERS = [];
const DEMO_CRM_SEGMENTS = [];
const DEMO_RFM = [];

/* Token 인식 API Helper */
function makeAPI(token) {
    return (path, opts = {}) => {
        const headers = { "Content-Type": "application/json", ...(opts.headers || {}) };
        if (token) headers["Authorization"] = `Bearer ${token}`;
        return fetch(`/api${path}`, { ...opts, headers }).then(r => r.json());
    };
}

const C = {
    bg: "#070f1a", surface: "#0d1829", card: "#111e30",
    border: "rgba(99,102,241,0.15)", accent: "#4f8ef7",
    green: "#22c55e", red: "#f87171", yellow: "#fbbf24",
    purple: "#a78bfa", muted: "rgba(255,255,255,0.4)", text: "#e8eaf0",
};

/* ─── AI Segmentation Recommendation 데이터 ─────────────────────── */
const DEMO_AI_SEGMENTS = [
    {
        id: "ai_vip", name: "VIP 재Activate 유도", icon: "💎", priority: "urgent", count: 127, ltv_avg: 2840000,
        reason: "LTV 코호트 상위 10% in progress 60일 이상 미접속자",
        ai_insight: "이 Customer군은 Average 구매 주기가 30일에서 90일로 늘어나 VIP를 이탈 위기에 있습니다. 전용 웰컴백Card 20% 제공 + Personal화 Message가 효과적입니다.",
        predicted_revenue: 36100000, color: "#22c55e"
    },
    {
        id: "ai_churn", name: "이탈 위기 Customer", icon: "🚨", priority: "high", count: 412, ltv_avg: 450000,
        reason: "RFM 점Count 급락 + 전달 열람으로 Start된 이탈 신호",
        ai_insight: "3개월 동안 구매 None. 미Confirm 장바구니 Coupon + Kakao Notification톡 동시 Marketing이 회Count율 23% 예상.",
        predicted_revenue: 18540000, color: "#f87171"
    },
    {
        id: "ai_potential", name: "잠재 챔피언즈", icon: "🚀", priority: "high", count: 89, ltv_avg: 1200000,
        reason: "3회 이상 구매 + 소셜 Share 패턴 감지",
        ai_insight: "성장 가능성이 높습니다. 시크레트 혜택 제공으로 VIP Conversion을 유도하세요.",
        predicted_revenue: 10680000, color: "#a78bfa"
    },
    {
        id: "ai_newbie", name: "신규 브랜드 로열링", icon: "🌱", priority: "medium", count: 234, ltv_avg: 120000,
        reason: "7일 이내 첫 구매 Customer",
        ai_insight: "첫 구매 30일 내 2차 구매를 유도하면 LTV가 5배 Increase합니다. 온보딩 Email 시리즈 + D+3 Coupon Auto화를 권장합니다.",
        predicted_revenue: 28080000, color: "#fbbf24"
    },
    {
        id: "ai_bigspender", name: "고단가 구매자 타겟팅", icon: "👑", priority: "medium", count: 56, ltv_avg: 5600000,
        reason: "1회 Average OrdersAmount 상위 5% 판정",
        ai_insight: "프리미엄 콘텐츠를 선호합니다. 플래그십 멤버십 + 신제품 프리뷰 연락을 제공하세요.",
        predicted_revenue: 31360000, color: "#4f8ef7"
    },
];

const PRIORITY_BADGE = {
    urgent: { label: "Urgent", color: "#f87171", bg: "rgba(248,113,113,0.12)" },
    high: { label: "in progress요", color: "#fbbf24", bg: "rgba(251,191,36,0.12)" },
    medium: { label: "일반", color: "#4f8ef7", bg: "rgba(79,142,247,0.12)" },
};

function AISegmentsTab({ isDemo, navigate }) { 
    const { t } = useI18n();
    const [expanded, setExpanded] = useState(null);
    const [actionMsg, setActionMsg] = useState({});

    const triggerAction = (segId, action) => {
        const msgs = { email: "📧 Email Marketing Page로 Connect되었습니다!", kakao: "💬 Kakao Notification톡 Integration Done!", journey: "🗺️ Customer Journey 빌더로 Connect되었습니다!" };
        setActionMsg(p => ({ ...p, [segId + action]: msgs[action] }));
        setTimeout(() => setActionMsg(p => { const n = { ...p }; delete n[segId + action]; return n; }), 3000);
        if (!isDemo) {
            if (action === "email") navigate("/email-marketing");
            else if (action === "kakao") navigate("/kakao-channel");
            else if (action === "journey") navigate("/journey-builder");
        }
    };

    const totalPredicted = DEMO_AI_SEGMENTS.reduce((s, x) => s + x.predicted_revenue, 0);

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {isDemo && (
                <div style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)", borderRadius: 10, padding: "10px 16px", fontSize: 12, color: "#fbbf24", fontWeight: 600 }}>
                    🎭 Demo 시뮬레이션 — 실제 Customer Data로 AI Segmentation을 받으려면 Pro로 업그레이드를 하세요
                </div>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
                {[
                    { label: "AI Segment Count", value: DEMO_AI_SEGMENTS.length, icon: "🤖", color: C.accent },
                    { label: "대상 Customer 합", value: DEMO_AI_SEGMENTS.reduce((s, x) => s + x.count, 0).toLocaleString() + "명", icon: "👥", color: C.green },
                    { label: "예상 Revenue 신규", value: `₩${Math.round(totalPredicted / 1000000)}M`, icon: "💰", color: C.purple },
                ].map(({ label, value, icon, color }) => (
                    <div key={label} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "16px 18px", textAlign: "center" }}>
                        <div style={{ fontSize: 20, marginBottom: 6 }}>{icon}</div>
                        <div style={{ fontSize: 22, fontWeight: 800, color }}>{value}</div>
                        <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{label}</div>
                    </div>
                ))}
            </div>
            {DEMO_AI_SEGMENTS.map(seg => {
                const pBadge = PRIORITY_BADGE[seg.priority];
                const isExp = expanded === seg.id;
                return (
                    <div key={seg.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, overflow: "hidden", borderLeft: `4px solid ${seg.color}` }}>
                        <div style={{ padding: "16px 20px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                            onClick={() => setExpanded(isExp ? null : seg.id)}>
                            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                <span style={{ fontSize: 22 }}>{seg.icon}</span>
                                <div>
                                    <div style={{ fontWeight: 700, fontSize: 14, display: "flex", alignItems: "center", gap: 8 }}>
                                        {seg.name}
                                        <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 99, background: pBadge.bg, color: pBadge.color, fontWeight: 700 }}>{pBadge.label}</span>
                                    </div>
                                    <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{seg.reason}</div>
                                </div>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                                <div style={{ textAlign: "right" }}>
                                    <div style={{ fontSize: 20, fontWeight: 800, color: seg.color }}>{seg.count.toLocaleString()}</div>
                                    <div style={{ fontSize: 10, color: C.muted }}>명</div>
                                </div>
                                <div style={{ textAlign: "right" }}>
                                    <div style={{ fontSize: 14, fontWeight: 700, color: C.green }}>₩{Math.round(seg.predicted_revenue / 1000000)}M</div>
                                    <div style={{ fontSize: 9, color: C.muted }}>예상Revenue</div>
                                </div>
                                <span style={{ fontSize: 12, color: C.muted }}>{isExp ? "▲" : "▼"}</span>
                            </div>
                        </div>
                        {isExp && (
                            <div style={{ padding: "0 20px 20px", borderTop: `1px solid ${C.border}` }}>
                                <div style={{ marginTop: 16, padding: "12px 14px", borderRadius: 10, background: `${seg.color}0d`, border: `1px solid ${seg.color}30`, fontSize: 12, color: C.text, lineHeight: 1.7 }}>
                                    🤖 <strong>AI 인사이트:</strong> {seg.ai_insight}
                                </div>
                                <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
                                    {[
                                        { action: "email", label: "📧 Email Marketing", color: C.accent, border: C.accent },
                                        { action: "kakao", label: "💬 Kakao Notification톡", color: "#c8a000", border: "#fee500" },
                                        { action: "journey", label: "🗺️ Customer Journey Integration", color: C.purple, border: C.purple },
                                    ].map(({ action, label, color, border }) => (
                                        <button key={action} onClick={() => triggerAction(seg.id, action)} style={{
                                            padding: "7px 14px", borderRadius: 8, border: `1px solid ${border}40`,
                                            background: `${color}15`, color, cursor: "pointer", fontWeight: 700, fontSize: 12,
                                        }}>{label}</button>
                                    ))}
                                    {Object.entries(actionMsg).filter(([k]) => k.startsWith(seg.id)).map(([k, msg]) => (
                                        <span key={k} style={{ fontSize: 12, color: C.green, alignSelf: "center", fontWeight: 700 }}>{msg}</span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

/* ─── RFM Grade 배지 ──────────────────────────────────── */
const RFM_GRADE = {
    champions: { label: "챔피언", color: "#22c55e" },
    loyal: { label: "충성 고객", color: "#4f8ef7" },
    at_risk: { label: "이탈 위험", color: "#fbbf24" },
    lost: { label: "이탈 고객", color: "#f87171" },
    new: { label: "신규 방문", color: "#a78bfa" },
    normal: { label: "일반", color: "#64748b" },
};

/* ─── Statistics Card ─────────────────────────────────────── */
function StatCard({ icon, label, value, sub, color }) { 
    const { t } = useI18n();
    return (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "18px 22px" }}>
            <div style={{ fontSize: 22, marginBottom: 6 }}>{icon}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: color || C.accent }}>{value}</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginTop: 2 }}>{label}</div>
            {sub && <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{sub}</div>}
        </div>
    );
}

/* ─── Customer Details Panel (360° 뷰) ───────────────────────── */
function CustomerPanel({ customerId, onClose, onSendEmail, onSendKakao, apiFunc }) { 
    const { t } = useI18n();
    const [data, setData] = useState(null);
    useEffect(() => {
        if (!customerId || !apiFunc) return;
        apiFunc(`/crm/customers/${customerId}`).then(r => r.ok && setData(r));
    }, [customerId, apiFunc]);

    if (!customerId) return null;
    const c = data?.customer;
    const grade = RFM_GRADE[c?.grade] || RFM_GRADE.normal;

    return (
        <div style={{
            position: "fixed", right: 0, top: 0, bottom: 0, width: 420,
            background: C.surface, borderLeft: `1px solid ${C.border}`,
            zIndex: 200, overflowY: "auto", display: "flex", flexDirection: "column",
        }}>
            <div style={{ padding: "20px 24px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontWeight: 800, fontSize: 16 }}>👤 Customer Details</div>
                <button onClick={onClose} style={{ background: "none", border: "none", color: C.muted, fontSize: 20, cursor: "pointer" }}>✕</button>
            </div>
            {!c ? (
                <div style={{ padding: 24, color: C.muted }}>Loading...</div>
            ) : (
                <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
                    <div style={{ background: C.card, borderRadius: 12, padding: 18 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <div style={{ width: 48, height: 48, borderRadius: "50%", background: `${grade.color}22`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
                                {c.name?.[0] || "?"}
                            </div>
                            <div>
                                <div style={{ fontWeight: 700, fontSize: 16 }}>{c.name || "(Name None)"}</div>
                                <div style={{ fontSize: 12, color: C.muted }}>{c.email}</div>
                            </div>
                            <span style={{ marginLeft: "auto", fontSize: 11, fontWeight: 700, background: `${grade.color}22`, color: grade.color, borderRadius: 6, padding: "3px 8px" }}>
                                {grade.label}
                            </span>
                        </div>
                        <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                            {[
                                ["📞 전화", c.phone || "-"],
                                ["💰 LTV", `₩${Number(c.ltv || 0).toLocaleString()}`],
                                ["📅 Register일", c.created_at?.slice(0, 10)],
                                ["🏷", (c.tags || []).join(", ") || "-"],
                            ].map(([k, v]) => (
                                <div key={k} style={{ background: C.surface, borderRadius: 8, padding: "8px 12px" }}>
                                    <div style={{ fontSize: 10, color: C.muted }}>{k}</div>
                                    <div style={{ fontSize: 13, fontWeight: 600 }}>{v}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div style={{ display: "flex", gap: 10 }}>
                        <button onClick={() => onSendEmail(c)} style={{ flex: 1, padding: "10px", borderRadius: 10, border: "none", background: `${C.accent}22`, color: C.accent, fontWeight: 700, cursor: "pointer", fontSize: 13 }}>
                            ✉️ Email Send
                        </button>
                        <button onClick={() => onSendKakao(c)} style={{ flex: 1, padding: "10px", borderRadius: 10, border: "none", background: "#fee08b22", color: "#fbbf24", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>
                            💬 Kakao Send
                        </button>
                    </div>

                    {data.segments?.length > 0 && (
                        <div>
                            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>📂 소속 Segment</div>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                                {data.segments.map(s => (
                                    <span key={s.id} style={{ fontSize: 11, fontWeight: 700, background: `${s.color || "#4f8ef7"}22`, color: s.color || "#4f8ef7", borderRadius: 6, padding: "3px 8px" }}>
                                        {(t("demoData." + s.name) !== "demoData." + s.name ? t("demoData." + s.name) : s.name)}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    <div>
                        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>📋 활동 이력</div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                            {(data.activities || []).slice(0, 10).map(a => {
                                const typeIcon = { purchase: "💳", email_sent: "✉️", kakao_sent: "💬", visit: "👁" };
                                return (
                                    <div key={a.id} style={{ background: C.card, borderRadius: 8, padding: "8px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                            <span>{typeIcon[a.type] || "📌"}</span>
                                            <div>
                                                <div style={{ fontSize: 12, fontWeight: 600 }}>{a.type}</div>
                                                <div style={{ fontSize: 10, color: C.muted }}>{a.channel}</div>
                                            </div>
                                        </div>
                                        <div style={{ textAlign: "right" }}>
                                            {a.amount > 0 && <div style={{ fontSize: 12, fontWeight: 700, color: C.green }}>₩{Number(a.amount).toLocaleString()}</div>}
                                            <div style={{ fontSize: 10, color: C.muted }}>{a.created_at?.slice(0, 10)}</div>
                                        </div>
                                    </div>
                                );
                            })}
                            {(data.activities || []).length === 0 && <div style={{ color: C.muted, fontSize: 12 }}>활동 기록 None</div>}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

/* ─── Segment Tab ─────────────────────────────────────── */
function SegmentsTab({ segments, crmSegments, onRefresh, linkMsg, setLinkMsg, createEmailCampaignFromSegment, createKakaoCampaignFromSegment, apiFunc }) { 
    const { t } = useI18n();
    const [form, setForm] = useState({ name: "", description: "", color: "#4f8ef7", rules: [] });
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState("");

    const addRule = () => setForm(f => ({ ...f, rules: [...f.rules, { field: "ltv", op: "gte", value: "" }] }));
    const removeRule = (i) => setForm(f => { const r = [...f.rules]; r.splice(i, 1); return { ...f, rules: r }; });
    const updateRule = (i, k, v) => setForm(f => { const r = [...f.rules]; r[i] = { ...r[i], [k]: v }; return { ...f, rules: r }; });

    const save = async () => {
        if (!apiFunc) { setMsg("✅ Demo Mode — Segment Create 시뮬레이션"); return; }
        setSaving(true);
        const r = await apiFunc("/crm/segments", { method: "POST", body: JSON.stringify(form) });
        setSaving(false);
        if (r.ok) { setMsg(`✅ Create Done (${r.member_count}명)`); setForm({ name: "", description: "", color: "#4f8ef7", rules: [] }); onRefresh(); }
        else setMsg("❌ " + r.error);
    };

    const allSegments = [...(crmSegments || [])];

    return (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            {/* Create 폼 */}
            <div style={{ background: C.card, borderRadius: 14, padding: 20 }}>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>➕ 새 Segment</div>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Segment Name"
                    style={{ width: "100%", padding: "8px 12px", borderRadius: 8, background: C.surface, border: `1px solid ${C.border}`, color: C.text, marginBottom: 10, boxSizing: "border-box" }} />
                <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Description (Select)"
                    style={{ width: "100%", padding: "8px 12px", borderRadius: 8, background: C.surface, border: `1px solid ${C.border}`, color: C.text, marginBottom: 10, boxSizing: "border-box" }} />
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                    <span style={{ fontSize: 12, color: C.muted }}>Color</span>
                    <input type="color" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} style={{ width: 36, height: 28, borderRadius: 6, border: "none", cursor: "pointer", background: "none" }} />
                </div>
                <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, marginBottom: 8 }}>조건 (AND 결합)</div>
                    {form.rules.map((rule, i) => (
                        <div key={i} style={{ display: "flex", gap: 6, marginBottom: 6, alignItems: "center" }}>
                            <select value={rule.field} onChange={e => updateRule(i, "field", e.target.value)} style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.text, borderRadius: 6, padding: "4px 8px", fontSize: 12 }}>
                                <option value="ltv">LTV</option>
                                <option value="rfm_score">RFM 점Count</option>
                                <option value="rfm_f">구매횟Count</option>
                                <option value="grade">Grade</option>
                            </select>
                            <select value={rule.op} onChange={e => updateRule(i, "op", e.target.value)} style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.text, borderRadius: 6, padding: "4px 8px", fontSize: 12 }}>
                                <option value="gte">≥</option><option value="lte">≤</option>
                                <option value="gt">&gt;</option><option value="lt">&lt;</option>
                                <option value="eq">=</option>
                            </select>
                            <input value={rule.value} onChange={e => updateRule(i, "value", e.target.value)} style={{ flex: 1, background: C.surface, border: `1px solid ${C.border}`, color: C.text, borderRadius: 6, padding: "4px 8px", fontSize: 12 }} />
                            <button onClick={() => removeRule(i)} style={{ background: "none", border: "none", color: C.red, cursor: "pointer", fontSize: 16 }}>✕</button>
                        </div>
                    ))}
                    <button onClick={addRule} style={{ fontSize: 12, color: C.accent, background: "none", border: `1px dashed ${C.accent}`, borderRadius: 6, padding: "4px 10px", cursor: "pointer" }}>+ 조건 Add</button>
                </div>
                {msg && <div style={{ fontSize: 12, color: msg.startsWith("✅") ? C.green : C.red, marginBottom: 8 }}>{msg}</div>}
                <button onClick={save} disabled={saving || !form.name} style={{ width: "100%", padding: "10px", borderRadius: 10, border: "none", background: C.accent, color: "#fff", fontWeight: 700, cursor: "pointer" }}>
                    {saving ? t('crm.c_18') : "Segment Create"}
                </button>
            </div>

            {/* List */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {allSegments.map(s => (
                    <div key={s.id} style={{ background: C.card, borderRadius: 12, padding: "14px 18px", borderLeft: `4px solid ${s.color || "#4f8ef7"}` }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                            <div>
                                <div style={{ fontWeight: 700 }}>{(t("demoData." + s.name) !== "demoData." + s.name ? t("demoData." + s.name) : s.name)}</div>
                                <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{s.condition || s.description}</div>
                            </div>
                            <div style={{ textAlign: "right" }}>
                                <div style={{ fontSize: 22, fontWeight: 800, color: s.color || "#4f8ef7" }}>{s.count || s.member_count || 0}</div>
                                <div style={{ fontSize: 10, color: C.muted }}>명</div>
                            </div>
                        </div>
                        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                            <button
                                onClick={() => {
                                    if (createEmailCampaignFromSegment) createEmailCampaignFromSegment(s.id);
                                    if (setLinkMsg) setLinkMsg(p => ({ ...p, [s.id]: "📧 Email Create CampaignDone!" }));
                                    setTimeout(() => { if (setLinkMsg) setLinkMsg(p => ({ ...p, [s.id]: "" })); }, 3000);
                                }}
                                style={{ fontSize: 11, padding: "4px 10px", borderRadius: 8, border: "1px solid #4f8ef7", background: "rgba(79,142,247,0.1)", color: "#4f8ef7", cursor: "pointer", fontWeight: 700 }}>
                                📧 Email Integration
                            </button>
                            <button
                                onClick={() => {
                                    if (createKakaoCampaignFromSegment) createKakaoCampaignFromSegment(s.id);
                                    if (setLinkMsg) setLinkMsg(p => ({ ...p, [s.id]: "💬 Kakao Notification톡 CreateDone!" }));
                                    setTimeout(() => { if (setLinkMsg) setLinkMsg(p => ({ ...p, [s.id]: "" })); }, 3000);
                                }}
                                style={{ fontSize: 11, padding: "4px 10px", borderRadius: 8, border: "1px solid #fee500", background: "rgba(254,229,0,0.1)", color: "#c8a000", cursor: "pointer", fontWeight: 700 }}>
                                💬 Kakao Integration
                            </button>
                            {linkMsg && linkMsg[s.id] && <span style={{ fontSize: 11, color: "#22c55e", alignSelf: "center" }}>{linkMsg[s.id]}</span>}
                        </div>
                    </div>
                ))}
                {/* 실API Segment */}
                {(segments || []).map(s => (
                    <div key={s.id} style={{ background: C.card, borderRadius: 12, padding: "14px 18px", borderLeft: `4px solid ${s.color || "#888"}`, opacity: 0.7 }}>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <div>
                                <div style={{ fontWeight: 700 }}>{(t("demoData." + s.name) !== "demoData." + s.name ? t("demoData." + s.name) : s.name)}</div>
                                <div style={{ fontSize: 12, color: C.muted }}>{s.description}</div>
                            </div>
                            <div style={{ textAlign: "right" }}>
                                <div style={{ fontSize: 20, fontWeight: 800, color: s.color || "#4f8ef7" }}>{s.member_count?.toLocaleString()}</div>
                                <div style={{ fontSize: 10, color: C.muted }}>명</div>
                            </div>
                        </div>
                    </div>
                ))}
                {(allSegments.length === 0 && (segments || []).length === 0) &&
                    <div style={{ color: C.muted, textAlign: "center", padding: 24, fontSize: 13 }}>Segment None — 좌측에서 Create하세요</div>}
            </div>
        </div>
    );
}

/* ─── RFM Analysis Tab ────────────────────────────────────── */
function RFMTab({ isDemo, apiFunc }) { 
    const { t } = useI18n();
    const [data, setData] = useState(null);

    useEffect(() => {
        if (isDemo) {
            // DEMO_RFM 형식에 맞게 변환
            const demoRfm = DEMO_RFM || {};
            setData({
                ok: true,
                stats: demoRfm.stats || { champions: 127, loyal: 345, at_risk: 412, lost: 89, new: 234 },
                customers: demoRfm.customers || DEMO_CRM_CUSTOMERS.map(c => ({
                    ...c,
                    rfm_grade: c.grade || "loyal",
                    monetary: c.ltv || 0,
                    frequency: c.purchase_count || 1,
                    last_purchase: c.last_purchase || "2026-02-01",
                })),
            });
            return;
        }
        if (!apiFunc) return;
        apiFunc("/crm/rfm").then(r => r.ok && setData(r));
    }, [isDemo, apiFunc]); // eslint-disable-line

    if (!data) return <div style={{ color: C.muted, padding: 24 }}>RFM Analysis Loading...</div>;
    const stats = data.stats || {};

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Grade 분포 */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
                {Object.entries(RFM_GRADE).filter(([k]) => k !== "normal").map(([key, { label, color }]) => (
                    <div key={key} style={{ background: C.card, borderRadius: 12, padding: "16px", textAlign: "center", borderTop: `3px solid ${color}` }}>
                        <div style={{ fontSize: 28, fontWeight: 800, color }}>{stats[key] || 0}</div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{label}</div>
                    </div>
                ))}
            </div>
            {/* Customer List */}
            <div style={{ background: C.card, borderRadius: 14, overflow: "hidden" }}>
                <div style={{ padding: "14px 18px", fontWeight: 700, borderBottom: `1px solid ${C.border}` }}>RFM Customer List (상위 50)</div>
                <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                        <thead>
                            <tr style={{ background: "#0a1520" }}>
                                {[t('crm.c_13'), "Email", "구매Amount", "구매횟Count", "최근구매", "RFM Grade"].map(h => (
                                    <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: C.muted, fontWeight: 600 }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {(data.customers || []).slice(0, 50).map((c, i) => {
                                const g = RFM_GRADE[c.rfm_grade] || RFM_GRADE.normal;
                                return (
                                    <tr key={c.id || i} style={{ borderTop: `1px solid ${C.border}`, background: i % 2 ? "#0a1520" : "transparent" }}>
                                        <td style={{ padding: "8px 14px", fontWeight: 600 }}>{c.name || "-"}</td>
                                        <td style={{ padding: "8px 14px", color: C.muted }}>{c.email}</td>
                                        <td style={{ padding: "8px 14px", color: C.green, fontWeight: 700 }}>₩{Number(c.monetary || 0).toLocaleString()}</td>
                                        <td style={{ padding: "8px 14px" }}>{c.frequency || 0}회</td>
                                        <td style={{ padding: "8px 14px", color: C.muted, fontSize: 12 }}>{c.last_purchase?.slice(0, 10) || "-"}</td>
                                        <td style={{ padding: "8px 14px" }}>
                                            <span style={{ fontSize: 11, fontWeight: 700, background: `${g.color}22`, color: g.color, borderRadius: 6, padding: "3px 8px" }}>{g.label}</span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

/* ─── CRM 내용 (PlanGate 내부) ───────────────────────── */
function CRMContent() {
    const { t } = useI18n();
    const { token } = useAuth();
    const { isDemo } = useDemo();
    const navigate = useNavigate();
    const API = makeAPI(token);

    // GlobalDataContext에서 Segment Related 함Count Import
    const globalData = useGlobalData();
    const crmSegments = globalData?.crmSegments || [];
    const createEmailCampaignFromSegment = globalData?.createEmailCampaignFromSegment || null;
    const createKakaoCampaignFromSegment = globalData?.createKakaoCampaignFromSegment || null;

    const [tab, setTab] = useState("customers");
    const [customers, setCustomers] = useState([]);
    const [segments, setSegments] = useState([]);
    const [stats, setStats] = useState(null);
    const [selectedId, setSelectedId] = useState(null);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ email: "", name: "", phone: "", grade: "normal", tags: "" });
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState("");
    const [linkMsg, setLinkMsg] = useState({});

    const load = useCallback(() => {
        if (isDemo) {
            setCustomers(DEMO_CRM_CUSTOMERS);
            setTotal(DEMO_CRM_CUSTOMERS.length);
            setSegments(DEMO_CRM_SEGMENTS);
            setStats(DEMO_RFM);
            return;
        }
        const q = new URLSearchParams({ q: search, page, limit: 20 }).toString();
        API(`/crm/customers?${q}`).then(r => { if (r.ok) { setCustomers(r.customers); setTotal(r.total); } });
        API("/crm/segments").then(r => r.ok && setSegments(r.segments));
        API("/crm/stats").then(r => r.ok && setStats(r));
    }, [isDemo, search, page]); // eslint-disable-line

    useEffect(() => { load(); }, [load]);

    const saveCustomer = async () => {
        setSaving(true);
        const payload = { ...form, tags: form.tags ? form.tags.split(",").map(t => t.trim()) : [] };
        const r = await API("/crm/customers", { method: "POST", body: JSON.stringify(payload) });
        setSaving(false);
        if (r.ok) { setMsg("✅ Customer이 Register되었습니다"); setShowForm(false); setForm({ email: "", name: "", phone: "", grade: "normal", tags: "" }); load(); }
        else setMsg("❌ " + (r.error || "Error 발생"));
    };

    const TABS = [
        { id: "customers", label: t('crm.c_6') },
        { id: "ai_segments", label: t('crm.c_7') },
        { id: "segments", label: t('crm.c_8') },
        { id: "rfm", label: t('crm.c_9') },
    ];

    // Demo Statistics 처리
    const displayStats = stats ? {
        total: stats.total || stats.total_customers || DEMO_CRM_CUSTOMERS.length,
        active_30d: stats.active_30d || Math.floor(DEMO_CRM_CUSTOMERS.length * 0.6),
        total_ltv: stats.total_ltv || DEMO_CRM_CUSTOMERS.reduce((s, c) => s + (c.ltv || 0), 0),
    } : null;

    return (
        <div style={{ background: C.bg, minHeight: "100%", color: C.text }}>
                        {/* [v8] AI Recommendation Banner */}
            <AIRecommendBanner context="crm" />

            {/* Header */}
            <div style={{ borderRadius: 16, background: `linear-gradient(135deg,${C.surface},#0a1828)`, border: `1px solid ${C.border}`, padding: "22px 28px", marginBottom: 20 }}>
                <div style={{ fontSize: 22, fontWeight: 800 }}>👤 Customer CRM</div>
                <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>Customer ProFile · RFM Analysis · Segment · 360° 활동 뷰</div>
            </div>

            {/* Statistics Card */}
            {displayStats && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 20 }}>
                    <StatCard icon="👥" label={t('crm.c_2')} value={displayStats.total?.toLocaleString()} color={C.accent} />
                    <StatCard icon="🔥" label={t('crm.c_3')} value={displayStats.active_30d?.toLocaleString()} color={C.green} />
                    <StatCard icon="💰" label={t('crm.c_4')} value={`₩${Math.round((displayStats.total_ltv || 0) / 1000000)}M`} color={C.purple} />
                    <StatCard icon="🏷" label={t('crm.c_5')} value={(segments.length + crmSegments.length)} color={C.yellow} />
                </div>
            )}

            {/* Tab */}
            <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
                {TABS.map(t => (
                    <button key={t.id} onClick={() => setTab(t.id)} style={{
                        padding: "9px 18px", borderRadius: 10, border: "none", cursor: "pointer",
                        background: tab === t.id ? C.accent : C.card,
                        color: tab === t.id ? "#fff" : C.muted, fontWeight: 700, fontSize: 13,
                    }}>{t.label}</button>
                ))}
                {tab === "customers" && (
                    <button onClick={() => setShowForm(f => !f)} style={{
                        marginLeft: "auto", padding: "9px 18px", borderRadius: 10, border: "none",
                        background: C.green, color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 13,
                    }}>+ Customer Register</button>
                )}
            </div>

            {/* Customer Register 폼 */}
            {showForm && tab === "customers" && (
                <div style={{ background: C.card, borderRadius: 14, padding: 20, marginBottom: 20, border: `1px solid ${C.border}` }}>
                    <div style={{ fontWeight: 700, marginBottom: 14 }}>신규 Customer Register</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                        {[
                            [t('crm.c_12'), "email", "email@example.com"],
                            [t('crm.c_13'), "name", "John Doe"],
                            [t('crm.c_14'), "phone", "010-0000-0000"],
                        ].map(([label, key, placeholder]) => (
                            <div key={key}>
                                <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>{label}</div>
                                <input value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} placeholder={placeholder}
                                    style={{ width: "100%", padding: "8px 12px", borderRadius: 8, background: C.surface, border: `1px solid ${C.border}`, color: C.text, boxSizing: "border-box" }} />
                            </div>
                        ))}
                        <div>
                            <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>Grade</div>
                            <select value={form.grade} onChange={e => setForm(f => ({ ...f, grade: e.target.value }))} style={{ width: "100%", padding: "8px 12px", borderRadius: 8, background: C.surface, border: `1px solid ${C.border}`, color: C.text }}>
                                <option value="normal">General</option>
                                <option value="silver">실버</option>
                                <option value="gold">골드</option>
                                <option value="vip">VIP</option>
                            </select>
                        </div>
                        <div style={{ gridColumn: "span 2" }}>
                            <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>Tag (콤마 구분)</div>
                            <input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} placeholder="VIP, 재구매, 이탈위험"
                                style={{ width: "100%", padding: "8px 12px", borderRadius: 8, background: C.surface, border: `1px solid ${C.border}`, color: C.text, boxSizing: "border-box" }} />
                        </div>
                    </div>
                    {msg && <div style={{ marginTop: 10, fontSize: 12, color: msg.startsWith("✅") ? C.green : C.red }}>{msg}</div>}
                    <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                        <button onClick={saveCustomer} disabled={saving || !form.email} style={{ padding: "9px 22px", borderRadius: 9, border: "none", background: C.accent, color: "#fff", fontWeight: 700, cursor: "pointer" }}>
                            {saving ? t('crm.c_18') : t('crm.c_17')}
                        </button>
                        <button onClick={() => setShowForm(false)} style={{ padding: "9px 22px", borderRadius: 9, border: `1px solid ${C.border}`, background: "none", color: C.muted, cursor: "pointer" }}>Cancel</button>
                    </div>
                </div>
            )}

            {/* Tab 콘텐츠 */}
            {tab === "customers" && (
                <>
                    <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
                        <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder={t('crm.c_19')}
                            style={{ flex: 1, padding: "9px 14px", borderRadius: 10, background: C.card, border: `1px solid ${C.border}`, color: C.text }} />
                    </div>
                    <div style={{ background: C.card, borderRadius: 14, overflow: "hidden" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                            <thead>
                                <tr style={{ background: "#0a1520" }}>
                                    {[t('crm.c_13'), "Email", "전화", t('crm.c_15'), "LTV", "구매Count", "마지막구매", ""].map(h => (
                                        <th key={h} style={{ padding: "12px 16px", textAlign: "left", color: C.muted, fontWeight: 600, fontSize: 12 }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {customers.map((c, i) => {
                                    const g = RFM_GRADE[c.grade] || RFM_GRADE.normal;
                                    return (
                                        <tr key={c.id} onClick={() => setSelectedId(c.id)} style={{ borderTop: `1px solid ${C.border}`, cursor: "pointer", background: i % 2 ? "#0a1520" : "transparent", transition: "background 0.15s" }}
                                            onMouseEnter={e => e.currentTarget.style.background = "#1a2840"}
                                            onMouseLeave={e => e.currentTarget.style.background = i % 2 ? "#0a1520" : "transparent"}>
                                            <td style={{ padding: "10px 16px", fontWeight: 600 }}>{c.name || "-"}</td>
                                            <td style={{ padding: "10px 16px", color: C.muted }}>{c.email}</td>
                                            <td style={{ padding: "10px 16px", color: C.muted }}>{c.phone || "-"}</td>
                                            <td style={{ padding: "10px 16px" }}>
                                                <span style={{ fontSize: 11, fontWeight: 700, background: `${g.color}22`, color: g.color, borderRadius: 6, padding: "3px 8px" }}>{g.label}</span>
                                            </td>
                                            <td style={{ padding: "10px 16px", color: C.green, fontWeight: 700 }}>₩{Number(c.ltv || 0).toLocaleString()}</td>
                                            <td style={{ padding: "10px 16px" }}>{c.purchase_count || 0}회</td>
                                            <td style={{ padding: "10px 16px", fontSize: 12, color: C.muted }}>{c.last_purchase?.slice(0, 10) || "-"}</td>
                                            <td style={{ padding: "10px 16px" }}>
                                                <span style={{ fontSize: 11, color: C.accent }}>→ 상세</span>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {customers.length === 0 && (
                                    <tr><td colSpan={8} style={{ padding: "32px", textAlign: "center", color: C.muted }}>Register된 Customer이 없습니다.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    {/* Page네이션 */}
                    <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 16 }}>
                        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} style={{ padding: "6px 14px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.card, color: C.muted, cursor: "pointer" }}>Previous</button>
                        <span style={{ padding: "6px 14px", color: C.muted, fontSize: 13 }}>{page} / {Math.max(1, Math.ceil(total / 20))}</span>
                        <button onClick={() => setPage(p => p + 1)} disabled={page * 20 >= total} style={{ padding: "6px 14px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.card, color: C.muted, cursor: "pointer" }}>Next</button>
                    </div>
                </>
            )}
            {tab === "segments" && (
                <SegmentsTab
                    segments={segments}
                    crmSegments={crmSegments}
                    onRefresh={load}
                    linkMsg={linkMsg}
                    setLinkMsg={setLinkMsg}
                    createEmailCampaignFromSegment={createEmailCampaignFromSegment}
                    createKakaoCampaignFromSegment={createKakaoCampaignFromSegment}
                    apiFunc={isDemo ? null : API}
                />
            )}
            {tab === "rfm" && <RFMTab isDemo={isDemo} apiFunc={isDemo ? null : API} />}
            {tab === "ai_segments" && <AISegmentsTab isDemo={isDemo} navigate={navigate} />}

            {/* 360° 상세 Panel */}
            <CustomerPanel
                customerId={selectedId}
                onClose={() => setSelectedId(null)}
                onSendEmail={c => window.location.href = `/email-marketing?prefill_email=${encodeURIComponent(c.email)}`}
                onSendKakao={c => window.location.href = `/kakao-channel?prefill_phone=${encodeURIComponent(c.phone || "")}`}
                apiFunc={isDemo ? null : API}
            />
        </div>
    );
}

/* ─── 메인 CRM Page ─────────────────────────────────── */
export default function CRM() {

    const { t } = useI18n();
    return (
        <PlanGate feature="crm">
            <CRMContent />
        </PlanGate>
    );
}
