import React, { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext.jsx";
import { useNavigate } from "react-router-dom";import { useCurrency } from '../contexts/CurrencyContext.jsx';


import { useT } from '../i18n/index.js';
/* ─── PG사 메타데이터 ──────────────────────────────────────────────────────── */
const PG_PROVIDERS = [
    {
        id: "toss", name: "Toss Payments", emoji: "💳", color: "#4f8ef7",
        desc: "Domestic 1위 PG사 · Card/계좌이체/간편Payment",
        testCk: "test_ck_D5GePWvyJnrK0W0k6q8gLzN97Eoq", testSk: "test_sk_zXLkKEypNArWmo50nX3lmeaxYZ2M",
        ckLabel: "Client Key (ck_...)", skLabel: "Secret Key (sk_...)", docsUrl: "https://docs.tosspayments.com"
    },
    {
        id: "nicepay", name: "NicePay", emoji: "🔷", color: "#1a56db",
        desc: "기업/법인 전용 · 가상계좌/에스크로",
        testCk: "", testSk: "", ckLabel: "MID (상점 아이디)", skLabel: "Secret Key", docsUrl: "https://developer.nicepay.co.kr"
    },
    {
        id: "stripe", name: "Stripe", emoji: "🌐", color: "#6772e5",
        desc: "해외Payment · SubscriptionManagement · 다Currency 지원",
        testCk: "", testSk: "", ckLabel: "Publishable Key (pk_...)", skLabel: "Secret Key (sk_...)", docsUrl: "https://stripe.com/docs"
    },
    {
        id: "kakaopay", name: "KakaoPay", emoji: "💛", color: "#d4a000",
        desc: "Kakao 간편Payment 전문",
        testCk: "", testSk: "", ckLabel: "App Admin Key", skLabel: "CID (가맹점 코드)", docsUrl: "https://developers.kakaopay.com"
    },
];

const CYCLE_META = {
    monthly: { label: "Monthly", months: 1 },
    quarterly: { label: "Quarter", months: 3 },
    yearly: { label: "Annual", months: 12 },
};

function fmt(n) { return Number(n).toLocaleString("ko-KR"); }

/* ─── Price/할인율 Tab ────────────────────────────────────────────────────────── */
function PricingTab({ token }) {
    const { fmt } = useCurrency();
    const [rows, setRows] = useState([
        { plan: "pro", cycle: "monthly", base_price: 99000, discount_pct: 0 },
        { plan: "pro", cycle: "quarterly", base_price: 99000, discount_pct: 20 },
        { plan: "pro", cycle: "yearly", base_price: 99000, discount_pct: 40 },
    ]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState(null);

    useEffect(() => {
        (async () => {
            setLoading(true);
            try {
                const r = await fetch("/api/auth/pricing/config", { headers: { Authorization: `Bearer ${token}` } });
                const d = await r.json();
                if (d.ok && d.pricing?.length) setRows(d.pricing.map(p => ({
                    plan: p.plan, cycle: p.cycle,
                    base_price: Number(p.base_price),
                    discount_pct: Number(p.discount_pct),
                })));
            } catch { }
            setLoading(false);
        })();
    }, [token]);

    const update = (idx, field, val) => setRows(r => r.map((row, i) => i === idx ? { ...row, [field]: val } : row));

    const save = async () => {
        setSaving(true); setMsg(null);
        try {
            const r = await fetch("/api/auth/pricing/config", {
                method: "POST",
                headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
                body: JSON.stringify({ pricing: rows }),
            });
            const d = await r.json();
            setMsg({ type: d.ok ? "ok" : "err", text: d.msg || d.error });
        } catch (e) { setMsg({ type: "err", text: e.message }); }
        setSaving(false);
    };

    const calcTotal = (row) => {
        const disc = Math.max(0, Math.min(99, Number(row.discount_pct)));
        const perMonth = Math.round(row.base_price * (1 - disc / 100));
        return perMonth * CYCLE_META[row.cycle].months;
    };

    if (loading) return <div style={{ textAlign: "center", padding: 40, color: "var(--text-3)" }}>로드 in progress…</div>;

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {msg && (
                <div style={{
                    padding: "10px 14px", borderRadius: 10, fontSize: 12, fontWeight: 600,
                    background: msg.type === "ok" ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)",
                    border: `1px solid ${msg.type === "ok" ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`,
                    color: msg.type === "ok" ? "#22c55e" : "#ef4444",
                }}>{msg.text}</div>
            )}

            {/* Description */}
            <div style={{ fontSize: 11, color: "var(--text-3)", lineHeight: 1.7, padding: "0 2px" }}>
                💡 <b>Basic 단가</b>를 입력하고, Quarter/Annual 할인율(%)을 조정하세요.<br />
                실제 Payment Amount = <code>Basic단가 × (1 - 할인율%) × 개월Count</code>
            </div>

            {/* Price Table */}
            <div className="card card-glass" style={{ overflow: "hidden", paddingBottom: 0 }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead>
                        <tr style={{ borderBottom: "1px solid var(--border)" }}>
                            {["플랜", "주기", "Basic 단가 (원/월)", "할인율 (%)", "할인 후 단가", "Total Payment Amount"].map(h => (
                                <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontWeight: 700, color: "var(--text-2)", fontSize: 11 }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, idx) => {
                            const disc = Math.max(0, Math.min(99, Number(row.discount_pct)));
                            const perMonth = Math.round(row.base_price * (1 - disc / 100));
                            const total = perMonth * CYCLE_META[row.cycle].months;
                            return (
                                <tr key={`${row.plan}-${row.cycle}`} style={{ borderBottom: "1px solid var(--border-subtle, rgba(99,140,255,0.07))" }}>
                                    <td style={{ padding: "10px 12px" }}>
                                        <span style={{ padding: "2px 8px", borderRadius: 99, background: "rgba(79,142,247,0.12)", color: "#4f8ef7", fontSize: 10, fontWeight: 800 }}>
                                            {row.plan.toUpperCase()}
                                        </span>
                                    </td>
                                    <td style={{ padding: "10px 12px", fontWeight: 700, color: "var(--text-1)" }}>
                                        {CYCLE_META[row.cycle]?.label || row.cycle}
                                    </td>
                                    <td style={{ padding: "8px 12px" }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                            <input
                                                type="number"
                                                value={row.base_price}
                                                min={1000}
                                                step={1000}
                                                onChange={e => update(idx, "base_price", parseInt(e.target.value) || 0)}
                                                style={{
                                                    width: 100, padding: "6px 8px", borderRadius: 7,
                                                    border: "1px solid var(--border)", background: "var(--surface-1)",
                                                    color: "var(--text-1)", fontSize: 12, textAlign: "right",
                                                }}
                                            />
                                            <span style={{ fontSize: 10, color: "var(--text-3)" }}>₩</span>
                                        </div>
                                    </td>
                                    <td style={{ padding: "8px 12px" }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                            <input
                                                type="number"
                                                value={row.discount_pct}
                                                min={0} max={99} step={1}
                                                onChange={e => update(idx, "discount_pct", parseFloat(e.target.value) || 0)}
                                                style={{
                                                    width: 70, padding: "6px 8px", borderRadius: 7,
                                                    border: "1px solid var(--border)", background: "var(--surface-1)",
                                                    color: disc > 0 ? "#22c55e" : "var(--text-1)", fontSize: 12, textAlign: "right",
                                                    fontWeight: disc > 0 ? 700 : 400,
                                                }}
                                            />
                                            <span style={{ fontSize: 10, color: disc > 0 ? "#22c55e" : "var(--text-3)", fontWeight: disc > 0 ? 700 : 400 }}>
                                                {disc > 0 ? `${disc}% 할인` : "%"}
                                            </span>
                                        </div>
                                    </td>
                                    <td style={{ padding: "10px 12px", color: "var(--text-2)", fontWeight: 600 }}>₩{fmt(perMonth)}/월</td>
                                    <td style={{ padding: "10px 12px", fontWeight: 800, color: "#4f8ef7" }}>₩{fmt(total)}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <button
                onClick={save}
                disabled={saving}
                style={{
                    padding: "12px 0", borderRadius: 10, border: "none",
                    background: "linear-gradient(135deg,#22c55e,#16a34a)",
                    color: "#fff", fontWeight: 800, fontSize: 14, cursor: saving ? "not-allowed" : "pointer",
                    opacity: saving ? 0.7 : 1, transition: "all 150ms",
                }}
            >{saving ? "Save in progress…" : "💾 Price/할인율 Save (즉시 반영)"}</button>

            <div style={{ fontSize: 10, color: "var(--text-4)", textAlign: "center" }}>
                Save 즉시 모든 신규 Payment에 새 Price이 Apply됩니다. 기존 Subscription은 갱신 시 Apply됩니다.
            </div>
        </div>
    );
}

/* ─── PG 키 Tab ──────────────────────────────────────────────────────────────── */
function PgKeyTab({ token }) {
    const [configs, setConfigs] = useState([]);
    const [selPg, setSelPg] = useState("toss");
    const [form, setForm] = useState({ client_key: "", secret_key: "", is_test: true });
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState(null);

    useEffect(() => {
        (async () => {
            try {
                const r = await fetch("/api/auth/pg/config", { headers: { Authorization: `Bearer ${token}` } });
                const d = await r.json();
                if (d.ok) {
                    setConfigs(d.configs || []);
                    const active = d.configs?.find(c => c.is_active);
                    if (active) {
                        setSelPg(active.provider);
                        setForm({ client_key: active.client_key || "", secret_key: "", is_test: active.is_test });
                    } else {
                        const toss = PG_PROVIDERS[0];
                        setForm({ client_key: toss.testCk, secret_key: "", is_test: true });
                    }
                }
            } catch {
                setForm({ client_key: PG_PROVIDERS[0].testCk, secret_key: "", is_test: true });
            }
        })();
    }, [token]);

    const save = async () => {
        setSaving(true); setMsg(null);
        try {
            const r = await fetch("/api/auth/pg/config", {
                method: "POST",
                headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
                body: JSON.stringify({ provider: selPg, ...form }),
            });
            const d = await r.json();
            setMsg({ type: d.ok ? "ok" : "err", text: d.msg || d.error });
            if (d.ok) setForm(f => ({ ...f, secret_key: "" }));
        } catch (e) { setMsg({ type: "err", text: e.message }); }
        setSaving(false);
    };

    const pg = PG_PROVIDERS.find(p => p.id === selPg) || PG_PROVIDERS[0];

    return (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: 16, alignItems: "start" }}>
            {/* PG Select */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {PG_PROVIDERS.map(p => {
                    const cfg = configs.find(c => c.provider === p.id);
                    return (
                        <div key={p.id} onClick={() => { setSelPg(p.id); setMsg(null); setForm({ client_key: cfg?.client_key || (p.id === "toss" ? p.testCk : ""), secret_key: "", is_test: cfg?.is_test ?? true }); }}
                            style={{
                                padding: "11px 13px", borderRadius: 10, cursor: "pointer", border: "1.5px solid", transition: "all 150ms",
                                borderColor: selPg === p.id ? p.color : "var(--border)",
                                background: selPg === p.id ? p.color + "12" : "var(--surface-2)",
                                display: "flex", alignItems: "center", gap: 10
                            }}>
                            <span style={{ fontSize: 18 }}>{p.emoji}</span>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 12, fontWeight: 800, color: selPg === p.id ? p.color : "var(--text-1)" }}>{p.name}</div>
                                <div style={{ fontSize: 10, color: "var(--text-3)" }}>{p.desc}</div>
                            </div>
                            {cfg?.is_active && <span style={{ padding: "2px 7px", borderRadius: 99, background: "rgba(34,197,94,0.15)", color: "#22c55e", fontSize: 9, fontWeight: 800 }}>{t('super.aaActive')}</span>}
                        </div>
                    );
                })}
            </div>

            {/* 키 입력 */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {msg && (
                    <div style={{
                        padding: "10px 14px", borderRadius: 10, fontSize: 12, fontWeight: 600,
                        background: msg.type === "ok" ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)",
                        border: `1px solid ${msg.type === "ok" ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`,
                        color: msg.type === "ok" ? "#22c55e" : "#ef4444"
                    }}>{msg.text}</div>
                )}
                <div style={{ display: "flex", gap: 8 }}>
                    {[{ val: true, label: "🧪 Test", color: "#f59e0b" }, { val: false, label: "🚀 운영", color: "#22c55e" }].map(opt => (
                        <button key={String(opt.val)} onClick={() => setForm(f => ({ ...f, is_test: opt.val, client_key: opt.val ? pg.testCk : "", secret_key: opt.val ? pg.testSk : "" }))}
                            style={{
                                flex: 1, padding: "9px 8px", borderRadius: 9, cursor: "pointer", border: "1.5px solid",
                                borderColor: form.is_test === opt.val ? opt.color : "var(--border)",
                                background: form.is_test === opt.val ? opt.color + "18" : "var(--surface-2)",
                                color: form.is_test === opt.val ? opt.color : "var(--text-2)", fontWeight: 700, fontSize: 11
                            }}>
                            {opt.label}
                        </button>
                    ))}
                </div>
                {[{ key: "client_key", label: pg.ckLabel }, { key: "secret_key", label: `${pg.skLabel} (Change시만)`, type: "password" }].map(f => (
                    <div key={f.key}>
                        <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-2)", display: "block", marginBottom: 5 }}>{f.label}</label>
                        <input type={f.type || "text"} value={form[f.key]}
                            onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                            style={{
                                width: "100%", padding: "9px 11px", borderRadius: 8, border: "1px solid var(--border)",
                                background: "var(--surface-1)", color: "var(--text-1)", fontSize: 11, fontFamily: "monospace", boxSizing: "border-box"
                            }} />
                    </div>
                ))}
                <button onClick={save} disabled={saving || !form.client_key}
                    style={{
                        padding: "11px 0", borderRadius: 10, border: "none", cursor: saving || !form.client_key ? "not-allowed" : "pointer",
                        background: "linear-gradient(135deg,#4f8ef7,#a855f7)", color: "#fff", fontWeight: 800, fontSize: 13, opacity: saving || !form.client_key ? 0.6 : 1
                    }}>
                    {saving ? "Save in progress…" : `💾 ${pg.name} 키 Save & Activate`}
                </button>
                <a href={pg.docsUrl} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: "#4f8ef7", textAlign: "center" }}>📖 {pg.name} 공식 문서</a>
            </div>
        </div>
    );
}

/* ─── 메인 Component ──────────────────────────────────────────────────────────── */
export default function PgConfig() {
  const { fmt } = useCurrency();
    const { token, isAdmin } = useAuth();
    const navigate = useNavigate();

    useEffect(() => { if (!isAdmin) navigate("/dashboard"); }, [isAdmin, navigate]);
    if (!isAdmin) return null;

    return (
        <div style={{ display: "grid", gap: 18 }}>
            <div className="hero fade-up" style={{ background: "linear-gradient(135deg,rgba(79,142,247,0.06),rgba(168,85,247,0.05))", borderColor: "rgba(79,142,247,0.15)" }}>
                <div className="hero-meta">
                    <div className="hero-icon" style={{ background: "linear-gradient(135deg,rgba(79,142,247,0.2),rgba(168,85,247,0.15))" }}>💳</div>
                    <div>
                        <div className="hero-title">PG (Payment Gateway) 관리</div>
                        <div className="hero-desc">사용할 PG사(결제 대행사)의 시크릿 키 및 API 인증 정보를 설정합니다. 변경 사항은 저장 즉시 시스템에 반영됩니다. (요금제 설정은 구독메뉴 이용)</div>
                    </div>
                </div>
            </div>
            <PgKeyTab token={token} />
        </div>
    );
}
