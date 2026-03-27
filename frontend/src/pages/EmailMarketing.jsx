import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../auth/AuthContext";
import { useI18n } from "../i18n/index.js";
import PlanGate from "../components/PlanGate.jsx";
import useDemo from "../hooks/useDemo";


import { useGlobalData } from "../context/GlobalDataContext.jsx";

import { useT } from '../i18n/index.js';

/* Mocked defaults for removed DemoDataLayer */
const DEMO_EMAIL_BLOCKS = [{ id: "empty", name: "Empty", blocks: [] }];
const DEMO_EMAIL_CAMPAIGNS = [];
const DEMO_EMAIL_TEMPLATES = [];
const DEMO_EMAIL_SETTINGS = {};

function makeAPI(token) {
    return (path, opts = {}) => {
        const headers = { "Content-Type": "application/json", ...(opts.headers || {}) };
        if (token) headers["Authorization"] = `Bearer ${token}`;
        return fetch(`/api${path}`, { ...opts, headers }).then(r => r.json());
    };
}


const API = (path, opts = {}) =>
    fetch(`/api${path}`, { headers: { "Content-Type": "application/json", ...opts.headers }, ...opts }).then(r => r.json());

const C = {
    bg: "#070f1a", surface: "#0d1829", card: "#111e30",
    border: "rgba(99,102,241,0.15)", accent: "#4f8ef7",
    green: "#22c55e", red: "#f87171", yellow: "#fbbf24",
    purple: "#a78bfa", muted: "rgba(255,255,255,0.4)", text: "#e8eaf0",
};

const INPUT = {
    width: "100%", padding: "9px 13px", borderRadius: 8,
    background: C.surface, border: `1px solid ${C.border}`,
    color: C.text, boxSizing: "border-box", fontSize: 13,
};

/* ─── A/B Test Tab (Advanced: Body + Statistics 유의성) ──── */
const DEMO_AB_DATA = [
    {
        id: "ab1", name: "봄 Pro모션 풀 A/B", status: "running", created: "2026-03-10",
        testVar: ["subject", "body", "cta"],
        winnerMetric: "click",
        a: {
            subject: "🌸 봄맞이 특가 30% 할인", sender: "GeniegoTeam",
            body: "안녕하세요! 봄을 맞아 전 Product 30% 특가를 In Progress합니다. Today 한정 Quantity만 제공되니 서두르세요.",
            cta: "지금 쇼핑하기", ctaColor: "#4f8ef7",
            openRate: 24.8, clickRate: 6.2, revenue: 4200000, sent: 1200,
        },
        b: {
            subject: "Today만! 봄 시즌 Max 할인 혜택", sender: "[Customer명]님을 위한 봄 선물",
            body: "[Customer명]님, 지금 딱 맞는 봄 신상이 도착했어요. Today 자정까지만 Max 30% 할인을 드립니다!",
            cta: "내 할인 혜택 Confirm하기", ctaColor: "#22c55e",
            openRate: 31.4, clickRate: 8.7, revenue: 6100000, sent: 1200,
        },
        winner: "b", sampleSize: 2400, testDurationH: 12,
        pValue: 0.021, confidence: 97.9,
    },
    {
        id: "ab2", name: "재구매 유도 멀티바리언트", status: "completed", created: "2026-03-05",
        testVar: ["subject", "sender"],
        winnerMetric: "open",
        a: {
            subject: "다시 돌아오세요 💌 10% Coupon", sender: "CustomerTeam",
            body: "오랫동안 방문이 없으셨네요. 10% 특per 할인 Coupon을 드립니다.",
            cta: "Coupon Use하기", ctaColor: "#f59e0b",
            openRate: 18.2, clickRate: 4.1, revenue: 1800000, sent: 800,
        },
        b: {
            subject: "[Customer명]님을 위한 특per 제안", sender: "김지Count (CSTeam장)",
            body: "안녕하세요, [Customer명]님. 오랜만에 연락드려요. 특per히 준비한 Coupon이 있습니다.",
            cta: "특per 혜택 받기", ctaColor: "#a78bfa",
            openRate: 26.5, clickRate: 7.3, revenue: 3200000, sent: 800,
        },
        winner: "b", sampleSize: 1600, testDurationH: 24,
        pValue: 0.008, confidence: 99.2,
    },
];

const AB_VARS = [
    { id: "subject", label: "Subject" },
    { id: "sender", label: "Sender명" },
    { id: "body", label: "Body" },
    { id: "cta", label: "CTA Button" },
];
const WINNER_METRICS = [
    { id: "open", label: "오픈율" },
    { id: "click", label: "Clicks율" },
    { id: "revenue", label: "Revenue" },
];

function EmailMiniPreview({ data, color, label, wins }) {
    return (
        <div style={{ background: C.surface, borderRadius: 10, padding: 16, border: `2px solid ${wins ? color : C.border}`, position: "relative", overflow: "hidden", flex: 1 }}>
            {wins && <div style={{ position: "absolute", top: 8, right: 8, fontSize: 10, background: color, color: "#fff", padding: "2px 8px", borderRadius: 99, fontWeight: 800 }}>🏆 WINNER</div>}
            <div style={{ fontSize: 10, fontWeight: 800, color, marginBottom: 10 }}>{label} 안</div>
            {/* Email 미니 미리보기 */}
            <div style={{ background: "#fff", borderRadius: 8, overflow: "hidden", marginBottom: 12, minHeight: 80 }}>
                <div style={{ background: "#1a2240", padding: "8px 12px", fontSize: 10, fontWeight: 800, color: "#f59e0b" }}>{data.subject}</div>
                <div style={{ padding: "10px 12px", fontSize: 10, color: "#333", lineHeight: 1.6 }}>{data.body?.slice(0, 100)}{data.body?.length > 100 ? "..." : ""}</div>
                <div style={{ padding: "6px 12px 10px" }}>
                    <div style={{ display: "inline-block", padding: "5px 14px", borderRadius: 6, background: data.ctaColor || "#4f8ef7", color: "#fff", fontSize: 9, fontWeight: 700 }}>{data.cta}</div>
                </div>
            </div>
            <div style={{ fontSize: 10, color: C.muted, marginBottom: 6 }}>Sender: <strong style={{ color: C.text }}>{data.sender}</strong></div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 6 }}>
                {[["Send", data.sent?.toLocaleString(), C.muted], ["오픈율", `${data.openRate}%`, data.openRate > 20 ? C.green : C.yellow], ["Clicks율", `${data.clickRate}%`, data.clickRate > 5 ? C.green : C.yellow], ["Revenue", `₩${Math.round((data.revenue || 0) / 10000)}만`, C.green]].map(([l, val, c]) => (
                    <div key={l} style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 8, color: C.muted }}>{l}</div>
                        <div style={{ fontWeight: 800, fontSize: 12, color: c }}>{val}</div>
                    </div>
                ))}
            </div>
            {data.openRate > 0 && (
                <div style={{ marginTop: 8 }}>
                    <div style={{ height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 2 }}>
                        <div style={{ width: `${Math.min(data.openRate * 2.5, 100)}%`, height: "100%", background: color, borderRadius: 2, transition: "width 0.5s" }} />
                    </div>
                </div>
            )}
        </div>
    );
}

function ABTestTab({ isDemo }) {
    const { t } = useI18n();
    const [tests, setTests] = useState(DEMO_AB_DATA);
    const [showCreate, setShowCreate] = useState(false);
    const [form, setForm] = useState({
        name: "", testVar: ["subject"], winnerMetric: "open", splitPct: 50, waitH: 12,
        aSubject: "", bSubject: "", aSender: "GeniegoTeam", bSender: "GeniegoTeam",
        aBody: "", bBody: "", aCta: "지금 Confirm하기", bCta: "바로 보기",
        aCtaColor: "#4f8ef7", bCtaColor: "#22c55e",
    });

    const createTest = () => {
        const newTest = {
            id: `ab${Date.now()}`, name: form.name, status: "draft", created: new Date().toISOString().slice(0, 10),
            testVar: form.testVar, winnerMetric: form.winnerMetric,
            a: { subject: form.aSubject, sender: form.aSender, body: form.aBody, cta: form.aCta, ctaColor: form.aCtaColor, openRate: 0, clickRate: 0, revenue: 0, sent: 0 },
            b: { subject: form.bSubject, sender: form.bSender, body: form.bBody, cta: form.bCta, ctaColor: form.bCtaColor, openRate: 0, clickRate: 0, revenue: 0, sent: 0 },
            winner: null, sampleSize: 0, testDurationH: form.waitH, pValue: null, confidence: null,
        };
        setTests(p => [newTest, ...p]);
        setShowCreate(false);
    };

    const inp = { width: "100%", padding: "8px 12px", borderRadius: 8, background: C.surface, border: `1px solid ${C.border}`, color: C.text, fontSize: 13, boxSizing: "border-box" };
    const toggleVar = v => setForm(f => ({ ...f, testVar: f.testVar.includes(v) ? f.testVar.filter(x => x !== v) : [...f.testVar, v] }));

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {isDemo && (
                <div style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)", borderRadius: 10, padding: "10px 16px", fontSize: 12, color: "#fbbf24", fontWeight: 600 }}>
                    🎭 Demo 시뮬레이션 — Pro 업그레이드 시 실제 Email Send A/B Test Run
                </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>🧪 Email A/B Test</div>
                    <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>Subject·Sender·Body·CTA까지 완전한 A/B Compare + Statistics적 유의성 Analysis</div>
                </div>
                <button onClick={() => setShowCreate(s => !s)} style={{ padding: "8px 18px", borderRadius: 10, border: "none", background: `linear-gradient(135deg,${C.accent},#6366f1)`, color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>
                    {showCreate ? "Cancel" : "+ 새 A/B Test"}
                </button>
            </div>

            {showCreate && (
                <div style={{ background: C.card, border: `1px solid rgba(99,102,241,0.3)`, borderRadius: 14, padding: 22 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 16, color: C.accent }}>✨ A/B Test 설계</div>
                    <div style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>Test Name</div>
                        <input style={inp} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="예: 봄 Event 멀티바리언트" />
                    </div>
                    {/* Test 변Count Select */}
                    <div style={{ marginBottom: 14 }}>
                        <div style={{ fontSize: 11, color: C.muted, marginBottom: 8 }}>Test 변Count Select (복Count 가능)</div>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            {AB_VARS.map(v => (
                                <button key={v.id} onClick={() => toggleVar(v.id)} style={{ padding: "6px 14px", borderRadius: 8, border: `2px solid ${form.testVar.includes(v.id) ? C.accent : C.border}`, background: form.testVar.includes(v.id) ? `${C.accent}15` : "transparent", color: form.testVar.includes(v.id) ? C.accent : C.muted, cursor: "pointer", fontWeight: 700, fontSize: 12 }}>
                                    {form.testVar.includes(v.id) ? "✓ " : ""}{v.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    {/* A/B 입력 */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 14 }}>
                        {["a", "b"].map(v => (
                            <div key={v} style={{ background: C.surface, borderRadius: 10, padding: 14, border: `2px solid ${v === "a" ? `${C.accent}44` : `${C.purple}44`}` }}>
                                <div style={{ fontSize: 11, fontWeight: 800, color: v === "a" ? C.accent : C.purple, marginBottom: 10 }}>{v.toUpperCase()} 안</div>
                                {form.testVar.includes("subject") && <><div style={{ fontSize: 10, color: C.muted, marginBottom: 3 }}>Subject</div><input style={{ ...inp, marginBottom: 8 }} value={form[`${v}Subject`]} onChange={e => setForm(f => ({ ...f, [`${v}Subject`]: e.target.value }))} placeholder="Email Subject" /></>}
                                {form.testVar.includes("sender") && <><div style={{ fontSize: 10, color: C.muted, marginBottom: 3 }}>Sender명</div><input style={{ ...inp, marginBottom: 8 }} value={form[`${v}Sender`]} onChange={e => setForm(f => ({ ...f, [`${v}Sender`]: e.target.value }))} placeholder="Sender명" /></>}
                                {form.testVar.includes("body") && <><div style={{ fontSize: 10, color: C.muted, marginBottom: 3 }}>Body</div><textarea rows={3} style={{ ...inp, marginBottom: 8, resize: "vertical" }} value={form[`${v}Body`]} onChange={e => setForm(f => ({ ...f, [`${v}Body`]: e.target.value }))} placeholder="Email Body 내용" /></>}
                                {form.testVar.includes("cta") && (
                                    <div style={{ display: "flex", gap: 8 }}>
                                        <div style={{ flex: 1 }}><div style={{ fontSize: 10, color: C.muted, marginBottom: 3 }}>CTA 문구</div><input style={inp} value={form[`${v}Cta`]} onChange={e => setForm(f => ({ ...f, [`${v}Cta`]: e.target.value }))} placeholder="Button Text" /></div>
                                        <div><div style={{ fontSize: 10, color: C.muted, marginBottom: 3 }}>Color</div><input type="color" value={form[`${v}CtaColor`]} onChange={e => setForm(f => ({ ...f, [`${v}CtaColor`]: e.target.value }))} style={{ width: 40, height: 36, borderRadius: 6, border: "none", cursor: "pointer", background: "none" }} /></div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                    {/* Settings */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
                        <div>
                            <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>승자 결정 기준</div>
                            <select value={form.winnerMetric} onChange={e => setForm(f => ({ ...f, winnerMetric: e.target.value }))} style={{ ...inp, padding: "8px 12px" }}>
                                {WINNER_METRICS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                            </select>
                        </div>
                        <div>
                            <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>A/B 그룹 각 Rate(%)</div>
                            <input type="number" min={10} max={50} style={inp} value={form.splitPct} onChange={e => setForm(f => ({ ...f, splitPct: parseInt(e.target.value) }))} />
                            <div style={{ fontSize: 10, color: C.muted, marginTop: 3 }}>A: {form.splitPct}% · B: {form.splitPct}% · 승자전송: {100 - form.splitPct * 2}%</div>
                        </div>
                        <div>
                            <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>승자 결정 Pending(Time)</div>
                            <input type="number" min={1} max={72} style={inp} value={form.waitH} onChange={e => setForm(f => ({ ...f, waitH: parseInt(e.target.value) }))} />
                        </div>
                    </div>
                    <button onClick={createTest} disabled={!form.name}
                        style={{ padding: "10px 24px", borderRadius: 10, border: "none", background: C.green, color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>
                        🧪 {isDemo ? "A/B Test 시뮬레이션" : "A/B Test Start"}
                    </button>
                </div>
            )}

            {tests.map(test => {
                const aWins = test.winner === "a";
                const bWins = test.winner === "b";
                const pOk = test.pValue !== null && test.pValue < 0.05;
                return (
                    <div key={test.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                            <div>
                                <div style={{ fontWeight: 700, fontSize: 14, display: "flex", alignItems: "center", gap: 8 }}>
                                    {test.name}
                                    {test.testVar && test.testVar.map(v => (
                                        <span key={v} style={{ fontSize: 10, padding: "1px 7px", borderRadius: 99, background: `${C.accent}15`, color: C.accent }}>{AB_VARS.find(x => x.id === v)?.label}</span>
                                    ))}
                                </div>
                                <div style={{ fontSize: 11, color: C.muted, marginTop: 3 }}>
                                    샘플 {test.sampleSize.toLocaleString()}명 · {test.testDurationH}h · 승자기준: {WINNER_METRICS.find(m => m.id === test.winnerMetric)?.label}
                                    {test.confidence && <span style={{ marginLeft: 8, color: pOk ? C.green : C.yellow, fontWeight: 700 }}>
                                        신뢰Count준 {test.confidence}% {pOk ? "✅ 유의함" : "⚠️ Add 관찰 필요"}
                                    </span>}
                                </div>
                            </div>
                            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                                {test.winner && <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 99, background: "rgba(34,197,94,0.15)", color: C.green, fontWeight: 700 }}>✅ Done · {test.winner.toUpperCase()}안 승</span>}
                                {test.status === "running" && <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 99, background: "rgba(79,142,247,0.15)", color: C.accent, fontWeight: 700 }}>🔄 Test in progress</span>}
                                {test.status === "draft" && <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 99, background: "rgba(255,255,255,0.07)", color: C.muted, fontWeight: 700 }}>📝 초안</span>}
                            </div>
                        </div>
                        <div style={{ display: "flex", gap: 12 }}>
                            <EmailMiniPreview data={test.a} color={C.accent} label="A" wins={aWins} />
                            <EmailMiniPreview data={test.b} color={C.purple} label="B" wins={bWins} />
                        </div>
                        {test.winner && (
                            <div style={{ marginTop: 12, padding: "10px 14px", borderRadius: 8, background: `${C.green}0d`, border: `1px solid ${C.green}25`, fontSize: 12, color: C.green }}>
                                ✅ {test.winner.toUpperCase()}안이 Clicks율 {Math.abs((test.a.clickRate || 0) - (test.b.clickRate || 0)).toFixed(1)}%p 우위
                                {test.pValue && ` (p=${test.pValue}, 신뢰Count준 ${test.confidence}%)`}
                                — 나머지 {100 - (test.splitPct || 50) * 2}% Recipients에게 Auto Send Done
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}


/* ─── 드래그앤드롭 Block Email 에디터 ──────────── */
const BLOCK_TYPES = [
    { type: "header", icon: "H1", label: "Subject" },
    { type: "text", icon: "T", label: "Text" },
    { type: "image", icon: "IMG", label: "Image" },
    { type: "button", icon: "BTN", label: "Button" },
    { type: "coupon", icon: "%", label: "Coupon" },
    { type: "divider", icon: "—", label: "구분선" },
    { type: "footer", icon: "FT", label: "푸터" },
];

const DEFAULT_BLOCK_CONTENT = {
    header: { text: "✉️ Subject을 입력하세요", fontSize: 28, align: "center", color: "#f59e0b", bgColor: "#1a2240" },
    text: { text: "여기에 Body을 입력하세요.", align: "left", color: "#333" },
    image: { url: "", alt: "Image Description", width: "100%" },
    button: { text: "지금 Confirm하기", url: "#", bgColor: "#4f8ef7", textColor: "#fff", borderRadius: 8 },
    coupon: { code: "PROMO10", discount: "10% 할인", expires: "2026-12-31" },
    divider: {},
    footer: { text: "Count신거부 | Address: 서울시 강남구", color: "rgba(0,0,0,0.35)" },
};

function BlockPreview({ block }) {
    const c = block.content || {};
    const s = { padding: "10px 14px", width: "100%", boxSizing: "border-box" };
    if (block.type === "header") return (
        <div style={{ ...s, background: c.bgColor || "#1a2240", textAlign: c.align || "center" }}>
            <div style={{ fontSize: (c.fontSize || 28) * 0.65, fontWeight: 800, color: c.color || "#f59e0b", fontFamily: "sans-serif" }}>{c.text}</div>
        </div>
    );
    if (block.type === "text") return (
        <div style={{ ...s, textAlign: c.align || "left" }}>
            <div style={{ fontSize: 12, color: c.color || "#333", lineHeight: 1.7, whiteSpace: "pre-line", fontFamily: "sans-serif" }}>{c.text}</div>
        </div>
    );
    if (block.type === "image") return (
        <div style={{ ...s, textAlign: "center" }}>
            {c.url ? <img src={c.url} alt={c.alt} style={{ maxWidth: "100%", borderRadius: 6 }} /> : <div style={{ height: 60, background: "rgba(0,0,0,0.06)", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(0,0,0,0.3)", fontSize: 11, fontFamily: "sans-serif" }}>Image URL 입력</div>}
        </div>
    );
    if (block.type === "button") return (
        <div style={{ ...s, textAlign: "center" }}>
            <div style={{ display: "inline-block", padding: "9px 24px", borderRadius: c.borderRadius || 8, background: c.bgColor || "#4f8ef7", color: c.textColor || "#fff", fontWeight: 700, fontSize: 12, fontFamily: "sans-serif" }}>{c.text}</div>
        </div>
    );
    if (block.type === "coupon") return (
        <div style={{ ...s, textAlign: "center" }}>
            <div style={{ border: "2px dashed #f59e0b", borderRadius: 10, padding: "10px 16px", display: "inline-block" }}>
                <div style={{ fontSize: 9, color: "rgba(0,0,0,0.4)", marginBottom: 4, fontFamily: "sans-serif" }}>Coupon Code</div>
                <div style={{ fontFamily: "monospace", fontSize: 16, fontWeight: 800, color: "#f59e0b", letterSpacing: 2 }}>{c.code}</div>
                <div style={{ fontSize: 11, color: "#22c55e", marginTop: 4, fontFamily: "sans-serif" }}>{c.discount}</div>
            </div>
        </div>
    );
    if (block.type === "divider") return <div style={{ padding: "6px 14px" }}><hr style={{ border: "none", borderTop: "1px solid rgba(0,0,0,0.12)", margin: 0 }} /></div>;
    if (block.type === "footer") return (
        <div style={{ ...s, textAlign: "center" }}>
            <div style={{ fontSize: 10, color: c.color || "rgba(0,0,0,0.35)", fontFamily: "sans-serif" }}>{c.text}</div>
        </div>
    );
    return null;
}

function BlockAttrEditor({ block, onChange }) {
    const c = block.content || {};
    const inp = { width: "100%", padding: "6px 10px", borderRadius: 6, background: C.surface, border: `1px solid ${C.border}`, color: C.text, fontSize: 12, boxSizing: "border-box", marginBottom: 8 };
    const upd = (key, val) => onChange({ ...block, content: { ...c, [key]: val } });
    if (block.type === "header") return <div>
        <div style={{ fontSize: 10, color: C.muted, marginBottom: 4 }}>Subject Text</div>
        <input style={inp} value={c.text || ""} onChange={e => upd("text", e.target.value)} placeholder="Subject" />
        <div style={{ display: "flex", gap: 8 }}>
            <div style={{ flex: 1 }}><div style={{ fontSize: 10, color: C.muted, marginBottom: 4 }}>FontSize</div><input style={inp} type="number" value={c.fontSize || 28} onChange={e => upd("fontSize", +e.target.value)} /></div>
            <div style={{ flex: 1 }}><div style={{ fontSize: 10, color: C.muted, marginBottom: 4 }}>Sort</div><select style={inp} value={c.align || "center"} onChange={e => upd("align", e.target.value)}><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option></select></div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
            <div style={{ flex: 1 }}><div style={{ fontSize: 10, color: C.muted, marginBottom: 4 }}>Text색</div><input style={{ ...inp, marginBottom: 0, padding: "3px" }} type="color" value={c.color || "#f59e0b"} onChange={e => upd("color", e.target.value)} /></div>
            <div style={{ flex: 1 }}><div style={{ fontSize: 10, color: C.muted, marginBottom: 4 }}>Background색</div><input style={{ ...inp, marginBottom: 0, padding: "3px" }} type="color" value={c.bgColor || "#1a2240"} onChange={e => upd("bgColor", e.target.value)} /></div>
        </div>
    </div>;
    if (block.type === "text") return <div>
        <div style={{ fontSize: 10, color: C.muted, marginBottom: 4 }}>Body</div>
        <textarea style={{ ...inp, resize: "vertical", lineHeight: 1.5, color: C.text }} rows={4} value={c.text || ""} onChange={e => upd("text", e.target.value)} />
        <div style={{ display: "flex", gap: 8 }}>
            <div style={{ flex: 1 }}><div style={{ fontSize: 10, color: C.muted, marginBottom: 4 }}>Sort</div><select style={{ ...inp, marginBottom: 0 }} value={c.align || "left"} onChange={e => upd("align", e.target.value)}><option value="left">Left</option><option value="center">Center</option></select></div>
            <div style={{ flex: 1 }}><div style={{ fontSize: 10, color: C.muted, marginBottom: 4 }}>Text색</div><input style={{ ...inp, marginBottom: 0, padding: "3px" }} type="color" value={c.color || "#333"} onChange={e => upd("color", e.target.value)} /></div>
        </div>
    </div>;
    if (block.type === "image") return <div>
        <div style={{ fontSize: 10, color: C.muted, marginBottom: 4 }}>Image URL</div>
        <input style={inp} value={c.url || ""} onChange={e => upd("url", e.target.value)} placeholder="https://..." />
        <div style={{ fontSize: 10, color: C.muted, marginBottom: 4 }}>Alt Text</div>
        <input style={inp} value={c.alt || ""} onChange={e => upd("alt", e.target.value)} />
    </div>;
    if (block.type === "button") return <div>
        <div style={{ fontSize: 10, color: C.muted, marginBottom: 4 }}>Button Text</div>
        <input style={inp} value={c.text || ""} onChange={e => upd("text", e.target.value)} />
        <div style={{ fontSize: 10, color: C.muted, marginBottom: 4 }}>URL</div>
        <input style={inp} value={c.url || ""} onChange={e => upd("url", e.target.value)} />
        <div style={{ display: "flex", gap: 8 }}>
            <div style={{ flex: 1 }}><div style={{ fontSize: 10, color: C.muted, marginBottom: 4 }}>Background</div><input style={{ ...inp, marginBottom: 0, padding: "3px" }} type="color" value={c.bgColor || "#4f8ef7"} onChange={e => upd("bgColor", e.target.value)} /></div>
            <div style={{ flex: 1 }}><div style={{ fontSize: 10, color: C.muted, marginBottom: 4 }}>글자</div><input style={{ ...inp, marginBottom: 0, padding: "3px" }} type="color" value={c.textColor || "#fff"} onChange={e => upd("textColor", e.target.value)} /></div>
        </div>
    </div>;
    if (block.type === "coupon") return <div>
        <div style={{ fontSize: 10, color: C.muted, marginBottom: 4 }}>Coupon Code</div>
        <input style={inp} value={c.code || ""} onChange={e => upd("code", e.target.value)} />
        <div style={{ fontSize: 10, color: C.muted, marginBottom: 4 }}>할인내용</div>
        <input style={inp} value={c.discount || ""} onChange={e => upd("discount", e.target.value)} />
        <div style={{ fontSize: 10, color: C.muted, marginBottom: 4 }}>Expiry Date</div>
        <input style={inp} type="date" value={c.expires || ""} onChange={e => upd("expires", e.target.value)} />
    </div>;
    if (block.type === "footer") return <div>
        <div style={{ fontSize: 10, color: C.muted, marginBottom: 4 }}>푸터 Text</div>
        <input style={inp} value={c.text || ""} onChange={e => upd("text", e.target.value)} />
    </div>;
    return <div style={{ fontSize: 11, color: C.muted }}>Settings None</div>;
}

function BlockEmailEditor() {
    const { t } = useI18n();
    const [blocks, setBlocks] = useState(
        DEMO_EMAIL_BLOCKS[0].blocks.map(b => ({ ...b, id: b.id + "_" + Math.random().toString(36).slice(2, 7) }))
    );
    const [selectedId, setSelectedId] = useState(null);
    const [dragOver, setDragOver] = useState(null);
    const [dragIdx, setDragIdx] = useState(null);
    const [tplName, setTplName] = useState("봄 시즌 세일");
    const [previewMode, setPreviewMode] = useState(false);
    const [savedMsg, setSavedMsg] = useState("");

    const selected = blocks.find(b => b.id === selectedId);

    const addBlock = (type) => {
        const nb = { id: type + "_" + Math.random().toString(36).slice(2, 7), type, content: { ...DEFAULT_BLOCK_CONTENT[type] } };
        setBlocks(prev => [...prev, nb]);
        setSelectedId(nb.id);
    };

    const updateBlock = (updated) => setBlocks(prev => prev.map(b => b.id === updated.id ? updated : b));

    const removeBlock = (id) => {
        setBlocks(prev => prev.filter(b => b.id !== id));
        if (selectedId === id) setSelectedId(null);
    };

    const moveBlock = (fromIdx, toIdx) => {
        const next = [...blocks];
        const [moved] = next.splice(fromIdx, 1);
        next.splice(toIdx, 0, moved);
        setBlocks(next);
    };

    const loadTemplate = (tpl) => {
        setBlocks(tpl.blocks.map(b => ({ ...b, id: b.id + "_" + Math.random().toString(36).slice(2, 7) })));
        setTplName(tpl.name);
        setSelectedId(null);
    };

    return (
        <div style={{ display: "grid", gridTemplateColumns: "160px 1fr 260px", gap: 14, minHeight: 560 }}>
            {/* 좌측: Block 팔레트 */}
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 2 }}>+ Block Add</div>
                {BLOCK_TYPES.map(bt => (
                    <button key={bt.type} onClick={() => addBlock(bt.type)}
                        style={{ padding: "8px 10px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.card, color: C.text, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 600 }}
                        onMouseOver={e => e.currentTarget.style.borderColor = C.accent}
                        onMouseOut={e => e.currentTarget.style.borderColor = C.border}>
                        <span style={{ width: 26, height: 26, borderRadius: 6, background: `${C.accent}22`, color: C.accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 800, flexShrink: 0 }}>{bt.icon}</span>
                        {bt.label}
                    </button>
                ))}
                <div style={{ marginTop: "auto", paddingTop: 10, borderTop: `1px solid ${C.border}` }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, marginBottom: 5 }}>Template</div>
                    {DEMO_EMAIL_BLOCKS.map(tpl => (
                        <button key={tpl.id} onClick={() => loadTemplate(tpl)}
                            style={{ width: "100%", padding: "5px 8px", borderRadius: 7, border: `1px solid ${C.border}`, background: C.surface, color: C.muted, cursor: "pointer", fontSize: 10, marginBottom: 4, textAlign: "left" }}>
                            📧 {(t("demoData." + tpl.name) !== "demoData." + tpl.name ? t("demoData." + tpl.name) : tpl.name)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Center: 캔버스 */}
            <div style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <input value={tplName} onChange={e => setTplName(e.target.value)}
                        style={{ background: "transparent", border: "none", color: C.text, fontWeight: 700, fontSize: 13, outline: "none", flex: 1 }} />
                    <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
                        {savedMsg && <span style={{ fontSize: 11, color: C.green }}>{savedMsg}</span>}
                        <button onClick={() => setPreviewMode(p => !p)}
                            style={{ padding: "4px 12px", borderRadius: 7, border: `1px solid ${C.border}`, background: previewMode ? C.accent : C.card, color: previewMode ? "#fff" : C.muted, cursor: "pointer", fontSize: 11, fontWeight: 700 }}>
                            {previewMode ? "✏️ 편집" : "👁 미리보기"}
                        </button>
                        <button onClick={() => { setSavedMsg("✅ Save됨"); setTimeout(() => setSavedMsg(""), 2000); }}
                            style={{ padding: "4px 14px", borderRadius: 7, border: "none", background: C.accent, color: "#fff", cursor: "pointer", fontSize: 11, fontWeight: 700 }}>
                            Save
                        </button>
                    </div>
                </div>

                <div style={{ background: "#fff", borderRadius: 10, overflow: "hidden", border: `1px solid ${C.border}`, minHeight: 400, flex: 1 }}>
                    {blocks.length === 0 ? (
                        <div style={{ padding: 40, textAlign: "center", color: "#aaa", fontSize: 12 }}>← 좌측에서 Block을 Select하여 Add하세요</div>
                    ) : (
                        blocks.map((b, idx) => (
                            <div key={b.id}
                                draggable={!previewMode}
                                onDragStart={() => setDragIdx(idx)}
                                onDragOver={e => { e.preventDefault(); setDragOver(idx); }}
                                onDrop={() => { if (dragIdx !== null && dragIdx !== idx) moveBlock(dragIdx, idx); setDragOver(null); setDragIdx(null); }}
                                onDragEnd={() => { setDragOver(null); setDragIdx(null); }}
                                onClick={() => !previewMode && setSelectedId(b.id)}
                                style={{
                                    position: "relative", cursor: previewMode ? "default" : "grab",
                                    outline: !previewMode && selectedId === b.id ? `2px solid ${C.accent}` : dragOver === idx ? `2px dashed ${C.accent}` : "none",
                                    outlineOffset: -2, opacity: dragIdx === idx ? 0.4 : 1,
                                }}>
                                <BlockPreview block={b} />
                                {!previewMode && selectedId === b.id && (
                                    <button onClick={e => { e.stopPropagation(); removeBlock(b.id); }}
                                        style={{ position: "absolute", top: 4, right: 6, padding: "1px 7px", borderRadius: 5, border: "none", background: "#ef4444", color: "#fff", cursor: "pointer", fontSize: 10, fontWeight: 700 }}>
                                        × Delete
                                    </button>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* 우측: 속성 Panel */}
            <div style={{ background: C.card, borderRadius: 12, padding: 16, border: `1px solid ${C.border}` }}>
                {selected ? (
                    <div>
                        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12, color: C.accent }}>
                            편집: {BLOCK_TYPES.find(bt => bt.type === selected.type)?.label}
                        </div>
                        <BlockAttrEditor block={selected} onChange={updateBlock} />
                        <div style={{ marginTop: 12, paddingTop: 8, borderTop: `1px solid ${C.border}`, display: "flex", gap: 6 }}>
                            <button onClick={() => { const idx = blocks.indexOf(selected); if (idx > 0) moveBlock(idx, idx - 1); }}
                                style={{ flex: 1, padding: "4px", borderRadius: 6, border: `1px solid ${C.border}`, background: C.surface, color: C.muted, cursor: "pointer", fontSize: 11 }}>↑ 위로</button>
                            <button onClick={() => { const idx = blocks.indexOf(selected); if (idx < blocks.length - 1) moveBlock(idx, idx + 1); }}
                                style={{ flex: 1, padding: "4px", borderRadius: 6, border: `1px solid ${C.border}`, background: C.surface, color: C.muted, cursor: "pointer", fontSize: 11 }}>↓ 아래로</button>
                        </div>
                    </div>
                ) : (
                    <div style={{ color: C.muted, fontSize: 12, textAlign: "center", padding: 20 }}>Block을 Select하면 속성을 편집할 Count 있습니다</div>
                )}
            </div>
        </div>
    );
}

/* ─── Settings Tab ──────────────────────────────────── */
function SettingsTab() {
    const { t } = useI18n();
    const [settings, setSettings] = useState({
        provider: "smtp", smtp_host: "", smtp_port: 587,
        smtp_user: "", smtp_pass: "", from_email: "", from_name: "",
        aws_region: "ap-northeast-2", aws_key: "", aws_secret: "",
    });
    const [msg, setMsg] = useState("");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        API("/email/settings").then(r => { if (r.ok && r.settings) setSettings(s => ({ ...s, ...r.settings })); });
    }, []);

    const save = async () => {
        setSaving(true);
        const r = await API("/email/settings", { method: "PUT", body: JSON.stringify(settings) });
        setSaving(false);
        setMsg(r.ok ? "✅ Settings이 Save되었습니다" : "❌ Save Failed");
    };

    return (
        <div style={{ maxWidth: 640 }}>
            <div style={{ background: C.card, borderRadius: 14, padding: 24 }}>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 20 }}>📮 Email Send Settings</div>

                {/* Send 방식 */}
                <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 12, color: C.muted, marginBottom: 6 }}>Send 방식</div>
                    <div style={{ display: "flex", gap: 10 }}>
                        {[["smtp", "SMTP"], ["ses", "AWS SES"], ["mock", "Mock (Test)"]].map(([val, label]) => (
                            <button key={val} onClick={() => setSettings(s => ({ ...s, provider: val }))} style={{
                                padding: "8px 16px", borderRadius: 9, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 13,
                                background: settings.provider === val ? C.accent : C.surface,
                                color: settings.provider === val ? "#fff" : C.muted,
                            }}>{label}</button>
                        ))}
                    </div>
                </div>

                {settings.provider === "smtp" && (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                        {[
                            ["SMTP 호스트", "smtp_host", "smtp.gmail.com"],
                            ["포트", "smtp_port", "587"],
                            ["User명", "smtp_user", "user@example.com"],
                            ["Password", "smtp_pass", "••••••••"],
                            ["발신 Email", "from_email", "noreply@yourdomain.com"],
                            ["Sender명", "from_name", "Geniego-ROI"],
                        ].map(([label, key, placeholder]) => (
                            <div key={key}>
                                <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>{label}</div>
                                <input type={key === "smtp_pass" ? "password" : "text"}
                                    value={settings[key] || ""} onChange={e => setSettings(s => ({ ...s, [key]: e.target.value }))}
                                    placeholder={placeholder} style={INPUT} />
                            </div>
                        ))}
                    </div>
                )}

                {settings.provider === "ses" && (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                        {[
                            ["AWS 리전", "aws_region", "ap-northeast-2"],
                            ["Access Key ID", "aws_key", "AKIA..."],
                            ["Secret Access Key", "aws_secret", "••••••••"],
                            ["발신 Email", "from_email", "noreply@yourdomain.com"],
                            ["Sender명", "from_name", "Geniego-ROI"],
                        ].map(([label, key, placeholder]) => (
                            <div key={key} style={{ gridColumn: key === "aws_secret" ? "span 2" : undefined }}>
                                <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>{label}</div>
                                <input type={key.includes("secret") ? "password" : "text"}
                                    value={settings[key] || ""} onChange={e => setSettings(s => ({ ...s, [key]: e.target.value }))}
                                    placeholder={placeholder} style={INPUT} />
                            </div>
                        ))}
                    </div>
                )}

                {settings.provider === "mock" && (
                    <div style={{ background: "#fbbf2411", border: "1px solid #fbbf2433", borderRadius: 10, padding: 14, color: "#fbbf24", fontSize: 13 }}>
                        💡 Mock 모드: 실제 Email을 Send하지 않고 DB에만 기록됩니다. 실제 Send을 원하면 SMTP 또는 AWS SES를 Select하세요.
                    </div>
                )}

                {msg && <div style={{ marginTop: 14, fontSize: 13, color: msg.startsWith("✅") ? C.green : C.red }}>{msg}</div>}
                <button onClick={save} disabled={saving} style={{ marginTop: 18, padding: "10px 24px", borderRadius: 10, border: "none", background: C.accent, color: "#fff", fontWeight: 700, cursor: "pointer" }}>
                    {saving ? "Save in progress..." : "Settings Save"}
                </button>
            </div>
        </div>
    );
}

/* ─── Template Tab ──────────────────────────────────── */
function TemplatesTab() {
    const { t } = useI18n();
    const [templates, setTemplates] = useState([]);
    const [editId, setEditId] = useState("new");
    const [form, setForm] = useState({
        name: "", subject: "", html_body: `<h2>안녕하세요 {{name}}님,</h2>\n<p>내용을 입력하세요.</p>`, category: "general",
    });
    const [msg, setMsg] = useState("");

    const load = () => API("/email/templates").then(r => r.ok && setTemplates(r.templates));
    useEffect(() => { load(); }, []);

    const save = async () => {
        const isNew = editId === "new";
        const url = isNew ? "/email/templates" : `/email/templates/${editId}`;
        const method = isNew ? "POST" : "PUT";
        const r = await API(url, { method, body: JSON.stringify(form) });
        if (r.ok) { setMsg("✅ Save Done"); load(); setEditId("new"); setForm({ name: "", subject: "", html_body: "", category: "general" }); }
        else setMsg("❌ " + r.error);
    };

    const del = async (id) => {
        if (!confirm("Delete하시겠습니까?")) return;
        await API(`/email/templates/${id}`, { method: "DELETE" });
        load();
    };

    const selectTemplate = async (id) => {
        setEditId(id);
        const r = await API(`/email/templates/${id}`);
        if (r.ok) setForm({ name: r.template.name, subject: r.template.subject, html_body: r.template.html_body, category: r.template.category });
    };

    return (
        <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 20 }}>
            {/* List */}
            <div>
                <button onClick={() => { setEditId("new"); setForm({ name: "", subject: "", html_body: "<h2>안녕하세요 {{name}}님,</h2>\n<p>내용을 입력하세요.</p>", category: "general" }); }} style={{ width: "100%", padding: "9px", borderRadius: 10, border: `1px dashed ${C.accent}`, background: "none", color: C.accent, fontWeight: 700, cursor: "pointer", marginBottom: 12 }}>
                    + 새 Template
                </button>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {templates.map(t => (
                        <div key={t.id} onClick={() => selectTemplate(t.id)} style={{ background: editId === t.id ? `${C.accent}22` : C.card, border: `1px solid ${editId === t.id ? C.accent : C.border}`, borderRadius: 10, padding: "10px 14px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div>
                                <div style={{ fontWeight: 600, fontSize: 13 }}>{t.name}</div>
                                <div style={{ fontSize: 11, color: C.muted }}>{t.category}</div>
                            </div>
                            <button onClick={e => { e.stopPropagation(); del(t.id); }} style={{ background: "none", border: "none", color: C.red, cursor: "pointer", fontSize: 14 }}>🗑</button>
                        </div>
                    ))}
                </div>
            </div>

            {/* 에디터 */}
            <div style={{ background: C.card, borderRadius: 14, padding: 22 }}>
                <div style={{ fontWeight: 700, marginBottom: 16 }}>{editId === "new" ? "새 Template 작성" : "Template Edit"}</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                    <div>
                        <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>Template Name*</div>
                        <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={INPUT} />
                    </div>
                    <div>
                        <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>Category</div>
                        <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} style={{ ...INPUT }}>
                            <option value="general">General</option>
                            <option value="welcome">웰컴</option>
                            <option value="promotion">Pro모션</option>
                            <option value="cart_abandon">장바구니 이탈</option>
                            <option value="repurchase">재구매 유도</option>
                        </select>
                    </div>
                </div>
                <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>Subject*</div>
                    <input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} placeholder="{{name}}님, 특per 혜택을 Confirm하세요!" style={INPUT} />
                </div>
                <div>
                    <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>HTML Body* (변Count: {"{{name}}"} 사용 가능)</div>
                    <textarea value={form.html_body} onChange={e => setForm(f => ({ ...f, html_body: e.target.value }))} rows={12}
                        style={{ ...INPUT, resize: "vertical", fontFamily: "monospace", lineHeight: 1.5 }} />
                </div>
                {msg && <div style={{ fontSize: 12, color: msg.startsWith("✅") ? C.green : C.red, marginTop: 8 }}>{msg}</div>}
                <button onClick={save} disabled={!form.name || !form.subject || !form.html_body} style={{ marginTop: 14, padding: "10px 24px", borderRadius: 10, border: "none", background: C.accent, color: "#fff", fontWeight: 700, cursor: "pointer" }}>
                    {editId === "new" ? "Template Save" : "Edit Save"}
                </button>
            </div>
        </div>
    );
}

/* ─── Campaign Tab ─────────────────────────────────── */
function CampaignsTab() {
    const { t } = useI18n();
    const [campaigns, setCampaigns] = useState([]);
    const [templates, setTemplates] = useState([]);
    const [segments, setSegments] = useState([]);
    const [form, setForm] = useState({ name: "", template_id: "", segment_id: "", status: "draft" });
    const [sending, setSending] = useState(null);
    const [msg, setMsg] = useState("");

    const load = () => {
        API("/email/campaigns").then(r => r.ok && setCampaigns(r.campaigns));
        API("/email/templates").then(r => r.ok && setTemplates(r.templates));
        API("/crm/segments").then(r => r.ok && setSegments(r.segments));
    };
    useEffect(() => { load(); }, []);

    const create = async () => {
        const r = await API("/email/campaigns", { method: "POST", body: JSON.stringify(form) });
        if (r.ok) { setMsg("✅ Create Campaign"); setForm({ name: "", template_id: "", segment_id: "", status: "draft" }); load(); }
        else setMsg("❌ " + r.error);
    };

    const send = async (id) => {
        if (!confirm("Send하시겠습니까?")) return;
        setSending(id);
        const r = await API(`/email/campaigns/${id}/send`, { method: "POST" });
        setSending(null);
        if (r.ok) { setMsg(`✅ Send Done (Success: ${r.sent}, Failed: ${r.failed})`); load(); }
        else setMsg("❌ Send Failed");
    };

    const STATUS_COLOR = { draft: C.muted, sent: C.green, sending: C.yellow };

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Create 폼 */}
            <div style={{ background: C.card, borderRadius: 14, padding: 20 }}>
                <div style={{ fontWeight: 700, marginBottom: 14 }}>✉️ 새 Campaign</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                    <div>
                        <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>Campaign Name*</div>
                        <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={INPUT} />
                    </div>
                    <div>
                        <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>Template</div>
                        <select value={form.template_id} onChange={e => setForm(f => ({ ...f, template_id: e.target.value }))} style={{ ...INPUT }}>
                            <option value="">-- Select --</option>
                            {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>대상 Segment (미Select 시 All)</div>
                        <select value={form.segment_id} onChange={e => setForm(f => ({ ...f, segment_id: e.target.value }))} style={{ ...INPUT }}>
                            <option value="">All Customer</option>
                            {segments.map(s => <option key={s.id} value={s.id}>{(t("demoData." + s.name) !== "demoData." + s.name ? t("demoData." + s.name) : s.name)} ({s.member_count}명)</option>)}
                        </select>
                    </div>
                </div>
                {msg && <div style={{ marginTop: 10, fontSize: 12, color: msg.startsWith("✅") ? C.green : C.red }}>{msg}</div>}
                <button onClick={create} disabled={!form.name} style={{ marginTop: 14, padding: "9px 22px", borderRadius: 10, border: "none", background: C.accent, color: "#fff", fontWeight: 700, cursor: "pointer" }}>
                    Create Campaign
                </button>
            </div>

            {/* List */}
            <div style={{ background: C.card, borderRadius: 14, overflow: "hidden" }}>
                <div style={{ padding: "14px 18px", fontWeight: 700, borderBottom: `1px solid ${C.border}` }}>📊 Campaign 현황</div>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                        <tr style={{ background: "#0a1520" }}>
                            {["Name", "Template", "Segment", "SendCount", "오픈율", "Status", "Action"].map(h => (
                                <th key={h} style={{ padding: "10px 16px", textAlign: "left", color: C.muted, fontWeight: 600, fontSize: 12 }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {campaigns.map((c, i) => {
                            const openRate = c.total_sent > 0 ? Math.round(c.opened / c.total_sent * 100) : 0;
                            return (
                                <tr key={c.id} style={{ borderTop: `1px solid ${C.border}`, background: i % 2 ? "#0a1520" : "transparent" }}>
                                    <td style={{ padding: "10px 16px", fontWeight: 600 }}>{(t("demoData." + c.name) !== "demoData." + c.name ? t("demoData." + c.name) : c.name)}</td>
                                    <td style={{ padding: "10px 16px", color: C.muted }}>{c.template_name || "-"}</td>
                                    <td style={{ padding: "10px 16px", color: C.muted }}>{c.segment_name || "All"}</td>
                                    <td style={{ padding: "10px 16px" }}>{c.total_sent?.toLocaleString() || 0}</td>
                                    <td style={{ padding: "10px 16px", color: openRate > 20 ? C.green : C.muted }}>{openRate}%</td>
                                    <td style={{ padding: "10px 16px" }}>
                                        <span style={{ fontSize: 11, fontWeight: 700, color: STATUS_COLOR[c.status] || C.muted }}>●&nbsp;{(t("demoData." + c.status) !== "demoData." + c.status ? t("demoData." + c.status) : c.status)}</span>
                                    </td>
                                    <td style={{ padding: "10px 16px" }}>
                                        {c.status !== "sent" && (
                                            <button onClick={() => send(c.id)} disabled={sending === c.id} style={{
                                                padding: "5px 12px", borderRadius: 7, border: "none",
                                                background: sending === c.id ? C.surface : C.green,
                                                color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 12,
                                            }}>{sending === c.id ? "Sending..." : "📤 Send"}</button>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                        {campaigns.length === 0 && <tr><td colSpan={7} style={{ padding: "24px", textAlign: "center", color: C.muted }}>Campaign None</td></tr>}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

/* ─── Email Marketing 내용 (PlanGate 내부) ────────── */
function EmailMarketingContent() {
    const { t } = useI18n();
    const { token } = useAuth();
    const { isDemo } = useDemo();
    const { emailCampaignsLinked } = useGlobalData();

    const [tab, setTab] = useState("campaigns");
    const TABS = [
        { id: "campaigns", label: "📊 Campaign" },
        { id: "ai_generate", label: "🤖 AI Create" },
        { id: "abtest", label: "🧪 A/B Test" },
        { id: "editor", label: "🎨 Block 빌더" },
        { id: "templates", label: "📝 Template" },
        { id: "settings", label: "⚙️ Settings" },
    ];
    const [aiForm, setAiForm] = useState({ product: '', audience: 'VIP Customer', goal: '구매 Conversion', tone: '친근하고 전문적', discount: '', lang: 'ko' });
    const [aiResult, setAiResult] = useState(null);
    const [aiLoading, setAiLoading] = useState(false);
    const [aiApiKey, setAiApiKey] = useState('');
    const [aiSaved, setAiSaved] = useState(false);

    const makeFallbackResult = (product) => ({
        subjects: [
            '🔥 ' + (product || 'Product') + ' 지금 구매하면 특per 혜택!',
            '⏰ ' + (product || 'Product') + ' 한정 특가 마감 임박',
            '[' + (product || 'Product') + '] 당신을 위한 맞춤 제안',
        ],
        preview_text: '지금 Confirm하지 않으면 놓치는 기회!',
        body: {
            greeting: '안녕하세요, {{Customer명}}님 👋',
            main: (product || 'Product') + '을 찾고 계셨나요?\n\n저희가 특per히 준비한 혜택을 Confirm해보세요. 기존 Customer님들께서 Average 4.8점을 주신 제품을 지금 가장 좋은 조건으로 만나보실 Count 있습니다.',
            cta: '지금 바로 Confirm하기 →',
            ps: 'P.S. 이 혜택은 48Time 한정입니다. 서두르세요! ⏰',
        },
        a_variant: { subject: '💡 ' + (product || 'Product') + ' Today만 특가!', cta: '특가 Confirm하기' },
        b_variant: { subject: (product || 'Product') + ' Customer 후기 98%가 만족한 이유', cta: '후기 보러가기' },
    });

    const handleAiGenerate = async () => {
        setAiLoading(true); setAiResult(null);
        try {
            const t = localStorage.getItem('genie_token') || 'demo-token';
            const r = await fetch('/api/ai/generate/email', {
                method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${t}` },
                body: JSON.stringify(aiForm),
            });
            if (!r.ok) {
                // 401/403/500 등 비정상 응답 시 즉시 폴백
                setAiResult(makeFallbackResult(aiForm.product));
            } else {
                const d = await r.json();
                setAiResult(d.result || makeFallbackResult(aiForm.product));
            }
        } catch (e) {
            setAiResult(makeFallbackResult(aiForm.product));
        }
        setAiLoading(false);
    };

    const handleSaveAiKey = async () => {
        const t = localStorage.getItem('genie_token') || 'demo-token';
        await fetch('/api/ai/settings', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${t}` }, body: JSON.stringify({ api_key: aiApiKey, model: 'claude-3-5-haiku-20241022' }) });
        setAiSaved(true); setTimeout(() => setAiSaved(false), 2000);
    };

    // CRM Segment Integration Campaign (Paid 모드)
    const linkedCamps = emailCampaignsLinked.filter(c => c.targetSegmentId);

    return (
        <div style={{ background: C.bg, minHeight: "100%", color: C.text }}>
            
            <div style={{ borderRadius: 16, background: `linear-gradient(135deg,${C.surface},#0a1828)`, border: `1px solid ${C.border}`, padding: "22px 28px", marginBottom: 20 }}>
                <div style={{ fontSize: 22, fontWeight: 800 }}>✉️ Email Marketing</div>
                <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>Template 작성 · Segment 타겟 Send · CRM Auto Sync</div>
            </div>

            <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
                {TABS.map(t => (
                    <button key={t.id} onClick={() => setTab(t.id)} style={{
                        padding: "9px 18px", borderRadius: 10, border: "none", cursor: "pointer",
                        background: tab === t.id ? C.accent : C.card, color: tab === t.id ? "#fff" : C.muted,
                        fontWeight: 700, fontSize: 13,
                    }}>{t.label}</button>
                ))}
            </div>

            {/* Demo: Virtual Data 직접 렌더 */}
            {isDemo ? (
                <div>
                    {tab === "campaigns" && (
                        <div style={{ display: "grid", gap: 12 }}>
                            {DEMO_EMAIL_CAMPAIGNS.map(c => (
                                <div key={c.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "16px 20px" }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                                        <div style={{ fontWeight: 700, fontSize: 14 }}>{(t("demoData." + c.name) !== "demoData." + c.name ? t("demoData." + c.name) : c.name)}</div>
                                        <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, fontWeight: 700, background: c.status === "sent" ? "rgba(34,197,94,0.15)" : "rgba(234,179,8,0.15)", color: c.status === "sent" ? "#22c55e" : "#eab308" }}>{c.status === "sent" ? "전송Done" : "예약"}</span>
                                    </div>
                                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
                                        {[["SendCount", c.sent.toLocaleString()], ["열람율", `${c.open_rate}%`], ["Clicks율", `${c.click_rate}%`], ["매스Profit", c.revenue > 0 ? `₩${c.revenue.toLocaleString()}` : "-"]].map(([l, v]) => (
                                            <div key={l} style={{ background: "rgba(255,255,255,0.03)", borderRadius: 8, padding: "10px 12px" }}>
                                                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginBottom: 4 }}>{l}</div>
                                                <div style={{ fontWeight: 800, fontSize: 14 }}>{v}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    {tab === "abtest" && <ABTestTab isDemo={true} />}
                    {tab === "ai_generate" && (
                        <div style={{ padding: '12px 0', color: C.text }}>
                            <div style={{ padding: '14px 18px', borderRadius: 14, background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)', marginBottom: 16 }}>
                                <div style={{ fontWeight: 800, fontSize: 12, color: '#818cf8', marginBottom: 4 }}>🤖 AI Email Create — Demo Mode</div>
                                <div style={{ fontSize: 11, color: C.muted }}>Claude API Key 없이도 AI 샘플 Email을 Create할 Count 있습니다.</div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                <div style={{ display: 'grid', gap: 10 }}>
                                    {[{ l: 'Product/서비스명', k: 'product', ph: 'ex. 에어팟 Pro Max' },
                                    { l: '대상 Customer', k: 'audience', ph: 'ex. VIP Customer' },
                                    { l: 'Campaign Goal', k: 'goal', ph: 'ex. 구매 Conversion' },
                                    { l: '톤 & Style', k: 'tone', ph: 'ex. 친근하고 전문적' },
                                    { l: 'Pro모션 (Select)', k: 'discount', ph: 'ex. 20% 할인' },
                                    ].map(f => (
                                        <div key={f.k}>
                                            <div style={{ fontSize: 10, color: C.muted, marginBottom: 3, fontWeight: 600 }}>{f.l}</div>
                                            <input value={aiForm[f.k] || ''} onChange={e => setAiForm(x => ({ ...x, [f.k]: e.target.value }))} placeholder={f.ph} style={{ width: '100%', padding: '9px 13px', borderRadius: 8, background: C.surface, border: `1px solid ${C.border}`, color: C.text, boxSizing: 'border-box', fontSize: 13 }} />
                                        </div>
                                    ))}
                                    <button onClick={handleAiGenerate} disabled={aiLoading || !aiForm.product}
                                        style={{ padding: '11px', borderRadius: 10, border: 'none', background: aiLoading || !aiForm.product ? 'rgba(107,114,128,0.3)' : 'linear-gradient(135deg,#6366f1,#4f8ef7)', color: '#fff', fontWeight: 900, fontSize: 13, cursor: aiLoading || !aiForm.product ? 'not-allowed' : 'pointer' }}>
                                        {aiLoading ? '⏳ AI Creating...' : '✨ AI Email Create'}
                                    </button>
                                </div>
                                <div style={{ background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, padding: 16, minHeight: 280 }}>
                                    {aiResult ? (
                                        <div style={{ display: 'grid', gap: 14 }}>
                                            <div style={{ fontWeight: 800, fontSize: 12, color: '#818cf8' }}>✨ Create 결과</div>
                                            <div>
                                                <div style={{ fontSize: 10, color: C.muted, marginBottom: 6, fontWeight: 700 }}>Subject 후보 (3개)</div>
                                                {(aiResult.subjects || []).map((s, i) => (
                                                    <div key={i} style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)', marginBottom: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                                                        title="Clicks 시 Copy">
                                                        {i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'} {s}
                                                    </div>
                                                ))}
                                            </div>
                                            <div style={{ padding: '10px 12px', borderRadius: 10, background: 'rgba(0,0,0,0.3)', fontSize: 12, lineHeight: 1.8 }}>
                                                <div style={{ fontWeight: 700, marginBottom: 6 }}>📧 Body 미리보기</div>
                                                <div style={{ color: 'rgba(255,255,255,0.7)' }}>{aiResult.body?.greeting}<br /><br />{aiResult.body?.main}<br /><br /><strong style={{ color: '#4f8ef7' }}>[{aiResult.body?.cta}]</strong></div>
                                            </div>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                                {[{ l: 'A 변형', v: aiResult.a_variant, c: '#4f8ef7' }, { l: 'B 변형', v: aiResult.b_variant, c: '#a855f7' }].map(v => (
                                                    <div key={v.l} style={{ padding: '10px', borderRadius: 10, background: `${v.c}08`, border: `1px solid ${v.c}22`, fontSize: 11 }}>
                                                        <div style={{ fontWeight: 700, color: v.c, marginBottom: 4 }}>{v.l}</div>
                                                        <div style={{ marginBottom: 4 }}>📌 {v.v?.subject}</div>
                                                        <div style={{ color: v.c }}>→ {v.v?.cta}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: C.muted, gap: 12 }}>
                                            <div style={{ fontSize: 40 }}>🤖</div>
                                            <div style={{ fontSize: 13, textAlign: 'center' }}>Left에서 조건을 입력하고<br />AI Create Button을 Clicks하세요</div>
                                            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', textAlign: 'center' }}>API Key 없이도 샘플 Email을<br />즉시 Create합니다</div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                    {tab === "editor" && <BlockEmailEditor />}
                    {tab === "templates" && (
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px,1fr))", gap: 12 }}>
                            {DEMO_EMAIL_TEMPLATES.map(t => (
                                <div key={t.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "20px 16px", textAlign: "center" }}>
                                    <div style={{ fontSize: 32, marginBottom: 12 }}>📧</div>
                                    <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>{t.name}</div>
                                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>{t.category}</div>
                                </div>
                            ))}
                        </div>
                    )}
                    {tab === "settings" && (
                        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "24px" }}>
                            <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 16 }}>SMTP Settings (Demo)</div>
                            {[["서버", DEMO_EMAIL_SETTINGS.smtp_host], ["포트", String(DEMO_EMAIL_SETTINGS.smtp_port)], ["Sender명", DEMO_EMAIL_SETTINGS.sender_name], ["Email", DEMO_EMAIL_SETTINGS.sender_email]].map(([l, v]) => (
                                <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                                    <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 13 }}>{l}</span>
                                    <span style={{ fontWeight: 600, fontSize: 13 }}>{v}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ) : (
                <>
                    {/* CRM Segment Integration Campaign 현황 (Paid 전용) */}
                    {linkedCamps.length > 0 && tab === "campaigns" && (
                        <div style={{ background: "rgba(79,142,247,0.08)", border: "1px solid rgba(79,142,247,0.25)", borderRadius: 12, padding: "14px 18px", marginBottom: 14 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: "#4f8ef7", marginBottom: 8 }}>🔗 CRM Segment Integration Campaign ({linkedCamps.length}개)</div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                {linkedCamps.map(c => (
                                    <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(0,0,0,0.2)", borderRadius: 8, padding: "8px 12px" }}>
                                        <div>
                                            <span style={{ fontSize: 12, fontWeight: 700 }}>{(t("demoData." + c.name) !== "demoData." + c.name ? t("demoData." + c.name) : c.name)}</span>
                                            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginLeft: 8 }}>→ {c.targetSegmentName}</span>
                                        </div>
                                        <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 10, fontWeight: 700, background: c.status === "sent" ? "rgba(34,197,94,0.15)" : "rgba(234,179,8,0.15)", color: c.status === "sent" ? "#22c55e" : "#eab308" }}>{c.status === "sent" ? "전송Done" : c.status === "scheduled" ? "Send예정" : "초안"}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    {tab === "campaigns" && <CampaignsTab />}
                    {tab === "ai_generate" && (
                        <div style={{ display: 'grid', gap: 16 }}>
                            {/* API Key Settings */}
                            <div style={{ padding: '14px 18px', borderRadius: 14, background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)' }}>
                                <div style={{ fontWeight: 800, fontSize: 12, marginBottom: 10, color: '#818cf8' }}>🔑 Claude API Key (Select — 없으면 Demo Create)</div>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <input type="password" value={aiApiKey} onChange={e => setAiApiKey(e.target.value)} placeholder="sk-ant-api03-..." style={{ ...INPUT, flex: 1, fontSize: 12 }} />
                                    <button onClick={handleSaveAiKey} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#4f8ef7,#6366f1)', color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>{aiSaved ? '✅ Save됨' : 'Save'}</button>
                                </div>
                            </div>
                            {/* 입력 Panel */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                <div style={{ display: 'grid', gap: 10 }}>
                                    <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 4 }}>🤖 AI Email Create 조건 입력</div>
                                    {[{ l: 'Product/서비스명', k: 'product', ph: 'ex. 에어팟 Pro 4세대' },
                                    { l: '대상 Customer', k: 'audience', ph: 'ex. VIP Customer, 30대 여성' },
                                    { l: 'Campaign Goal', k: 'goal', ph: 'ex. 구매 Conversion, 재구매 유도' },
                                    { l: '톤 & Style', k: 'tone', ph: 'ex. 친근하고 전문적' },
                                    { l: 'Pro모션 (Select)', k: 'discount', ph: 'ex. 20% 할인, Free 배송' },
                                    ].map(f => (
                                        <div key={f.k}>
                                            <div style={{ fontSize: 10, color: C.muted, marginBottom: 3, fontWeight: 600 }}>{f.l}</div>
                                            <input value={aiForm[f.k] || ''} onChange={e => setAiForm(x => ({ ...x, [f.k]: e.target.value }))} placeholder={f.ph} style={INPUT} />
                                        </div>
                                    ))}
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        {['ko', 'en', 'ja'].map(l => (
                                            <button key={l} onClick={() => setAiForm(x => ({ ...x, lang: l }))} style={{ flex: 1, padding: '6px', borderRadius: 8, border: `1px solid ${aiForm.lang === l ? '#4f8ef7' : 'rgba(255,255,255,0.1)'}`, background: aiForm.lang === l ? 'rgba(79,142,247,0.15)' : 'transparent', color: aiForm.lang === l ? '#4f8ef7' : 'var(--text-2)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>{l === 'ko' ? '🇰🇷 한국어' : l === 'en' ? '🇺🇸 English' : '🇯🇵 日本語'}</button>
                                        ))}
                                    </div>
                                    <button onClick={handleAiGenerate} disabled={aiLoading || !aiForm.product} style={{ padding: '11px', borderRadius: 10, border: 'none', background: aiLoading || !aiForm.product ? 'rgba(107,114,128,0.3)' : 'linear-gradient(135deg,#6366f1,#4f8ef7)', color: '#fff', fontWeight: 900, fontSize: 13, cursor: aiLoading || !aiForm.product ? 'not-allowed' : 'pointer' }}>
                                        {aiLoading ? '⏳ AI Creating...' : '✨ AI Email Create'}
                                    </button>
                                </div>
                                {/* 결과 Panel */}
                                <div style={{ background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, padding: 16, minHeight: 300 }}>
                                    {aiResult ? (
                                        <div style={{ display: 'grid', gap: 14 }}>
                                            <div style={{ fontWeight: 800, fontSize: 12, color: '#818cf8' }}>✨ Create 결과</div>
                                            <div>
                                                <div style={{ fontSize: 10, color: C.muted, marginBottom: 6, fontWeight: 700 }}>Subject 후보 (3개)</div>
                                                {(aiResult.subjects || []).map((s, i) => (
                                                    <div key={i} style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)', marginBottom: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                                                        onClick={() => navigator.clipboard?.writeText(s)}>
                                                        {i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'} {s}
                                                    </div>
                                                ))}
                                            </div>
                                            <div style={{ padding: '10px 12px', borderRadius: 10, background: 'rgba(0,0,0,0.3)', fontSize: 12, lineHeight: 1.8 }}>
                                                <div style={{ fontWeight: 700, marginBottom: 6 }}>📧 Body 미리보기</div>
                                                <div style={{ color: 'rgba(255,255,255,0.7)' }}>{aiResult.body?.greeting}<br /><br />{aiResult.body?.main}<br /><br /><strong style={{ color: '#4f8ef7' }}>[{aiResult.body?.cta}]</strong><br /><br /><em style={{ fontSize: 11, color: C.muted }}>{aiResult.body?.ps}</em></div>
                                            </div>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                                {[{ l: 'A 변형', v: aiResult.a_variant, c: '#4f8ef7' }, { l: 'B 변형', v: aiResult.b_variant, c: '#a855f7' }].map(v => (
                                                    <div key={v.l} style={{ padding: '10px', borderRadius: 10, background: `${v.c}08`, border: `1px solid ${v.c}22`, fontSize: 11 }}>
                                                        <div style={{ fontWeight: 700, color: v.c, marginBottom: 4 }}>{v.l}</div>
                                                        <div style={{ marginBottom: 4 }}>📌 {v.v?.subject}</div>
                                                        <div style={{ color: v.c }}>→ {v.v?.cta}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: C.muted, gap: 12 }}>
                                            <div style={{ fontSize: 40 }}>🤖</div>
                                            <div style={{ fontSize: 13, textAlign: 'center' }}>Left에서 조건을 입력하고<br />AI Create Button을 Clicks하세요</div>
                                            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', textAlign: 'center' }}>Claude AI가 Subject 3가지 + Body + A/B 변형을<br />Auto으로 작성합니다</div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                    {tab === "abtest" && <ABTestTab isDemo={false} />}
                    {tab === "editor" && <BlockEmailEditor />}
                    {tab === "templates" && <TemplatesTab />}
                    {tab === "settings" && <SettingsTab />}
                </>
            )}
        </div>
    );
}

/* ─── 메인 Email Marketing Page ──────────────────── */
export default function EmailMarketing() {
    const { t } = useI18n();
    return (
        <PlanGate feature="email_marketing">
            <EmailMarketingContent />
        </PlanGate>
    );
}
