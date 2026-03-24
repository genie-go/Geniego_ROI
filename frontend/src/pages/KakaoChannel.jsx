import React, { useState, useEffect } from "react";
import { useAuth } from "../auth/AuthContext";
import PlanGate from "../components/PlanGate.jsx";
import useDemo from "../hooks/useDemo";
import DemoBanner from "../components/DemoBanner";
import { DEMO_KAKAO_CAMPAIGNS, DEMO_KAKAO_TEMPLATES, DEMO_KAKAO_SETTINGS } from "../utils/DemoDataLayer";
import { useGlobalData } from "../context/GlobalDataContext.jsx";

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
    kakao: "#fee500", kakaoText: "#3c1e1e",
    purple: "#a78bfa", muted: "rgba(255,255,255,0.4)", text: "#e8eaf0",
};

const INPUT = {
    width: "100%", padding: "9px 13px", borderRadius: 8,
    background: C.surface, border: `1px solid ${C.border}`,
    color: C.text, boxSizing: "border-box", fontSize: 13,
};

/* ─── Settings Tab ──────────────────────────────────── */
function SettingsTab() {
    const [settings, setSettings] = useState({
        sender_key: "", api_key: "", channel_id: "",
        channel_name: "", mode: "mock",
    });
    const [msg, setMsg] = useState("");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        API("/kakao/settings").then(r => { if (r.ok && r.settings) setSettings(s => ({ ...s, ...r.settings })); });
    }, []);

    const save = async () => {
        setSaving(true);
        const r = await API("/kakao/settings", { method: "PUT", body: JSON.stringify(settings) });
        setSaving(false);
        setMsg(r.ok ? "✅ Settings이 Save되었습니다" : "❌ Save Failed");
    };

    return (
        <div style={{ maxWidth: 640 }}>
            <div style={{ background: C.card, borderRadius: 14, padding: 24 }}>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>💬 Kakao 비즈니스 Channel Settings</div>
                <div style={{ fontSize: 12, color: C.muted, marginBottom: 20 }}>
                    Kakao Notification톡을 사용하려면 <a href="https://business.kakao.com" target="_blank" rel="noreferrer" style={{ color: C.accent }}>Kakao 비즈니스</a>에서 Channel을 개설하고 Sender Key를 Issue받으세요.
                </div>

                {/* Send 모드 */}
                <div style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 12, color: C.muted, marginBottom: 6 }}>Send 모드</div>
                    <div style={{ display: "flex", gap: 10 }}>
                        {[["mock", "🧪 Mock (Test)"], ["live", "📡 실제 Send"]].map(([val, label]) => (
                            <button key={val} onClick={() => setSettings(s => ({ ...s, mode: val }))} style={{
                                padding: "8px 18px", borderRadius: 9, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 13,
                                background: settings.mode === val ? (val === "live" ? C.green : C.accent) : C.surface,
                                color: settings.mode === val ? "#fff" : C.muted,
                            }}>{label}</button>
                        ))}
                    </div>
                    {settings.mode === "live" && (
                        <div style={{ marginTop: 8, fontSize: 12, background: "#22c55e11", border: "1px solid #22c55e33", borderRadius: 8, padding: "8px 12px", color: C.green }}>
                            ⚠️ 실제 Send 모드 — Kakao API를 통해 실제 Notification톡이 Send됩니다. Sender Key가 필요합니다.
                        </div>
                    )}
                    {settings.mode === "mock" && (
                        <div style={{ marginTop: 8, fontSize: 12, background: "#4f8ef711", border: "1px solid #4f8ef733", borderRadius: 8, padding: "8px 12px", color: C.accent }}>
                            💡 Mock 모드 — 실제 Send 없이 시뮬레이션만 Count행합니다. API 키 없이도 UI Test 가능합니다.
                        </div>
                    )}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    {[
                        ["Channel Name", "channel_name", "예: 우리매장 공식Channel"],
                        ["Channel ID", "channel_id", "@handle"],
                        ["Sender Key (발신 Pro필 키)", "sender_key", "40자리 Sender Key"],
                        ["REST API 키", "api_key", "비즈니스 REST API Key"],
                    ].map(([label, key, placeholder]) => (
                        <div key={key}>
                            <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>{label}</div>
                            <input
                                type={key.includes("key") || key.includes("Key") ? "password" : "text"}
                                value={settings[key] || ""}
                                onChange={e => setSettings(s => ({ ...s, [key]: e.target.value }))}
                                placeholder={placeholder} style={INPUT} />
                        </div>
                    ))}
                </div>

                {msg && <div style={{ marginTop: 14, fontSize: 13, color: msg.startsWith("✅") ? C.green : C.red }}>{msg}</div>}
                <button onClick={save} disabled={saving} style={{ marginTop: 18, padding: "10px 24px", borderRadius: 10, border: "none", background: C.kakao, color: C.kakaoText, fontWeight: 700, cursor: "pointer", fontSize: 14 }}>
                    {saving ? "Save in progress..." : "⚙️ Settings Save"}
                </button>
            </div>
        </div>
    );
}

/* ─── 템플릿 Tab ──────────────────────────────────── */
function TemplatesTab() {
    const [templates, setTemplates] = useState([]);
    const [form, setForm] = useState({ template_code: "", name: "", content: "", msg_type: "AT", buttons: [] });
    const [test, setTest] = useState({ phone: "", name: "John Doe" });
    const [testResult, setTestResult] = useState(null);
    const [msg, setMsg] = useState("");
    const [testingCode, setTestingCode] = useState(null);

    const load = () => API("/kakao/templates").then(r => r.ok && setTemplates(r.templates));
    useEffect(() => { load(); }, []);

    const save = async () => {
        if (!form.template_code || !form.name || !form.content) { setMsg("❌ 템플릿 코드, Name, 내용 필Count"); return; }
        const r = await API("/kakao/templates", { method: "POST", body: JSON.stringify(form) });
        if (r.ok) { setMsg("✅ Save Done"); setForm({ template_code: "", name: "", content: "", msg_type: "AT", buttons: [] }); load(); }
        else setMsg("❌ " + r.error);
    };

    const doTest = async (code) => {
        if (!test.phone) { alert("Phone를 입력하세요"); return; }
        setTestingCode(code);
        const r = await API(`/kakao/templates/${code}/test`, {
            method: "POST", body: JSON.stringify({ phone: test.phone, name: test.name }),
        });
        setTestingCode(null);
        setTestResult(r);
    };

    const del = async (id) => {
        if (!confirm("Delete?")) return;
        await API(`/kakao/templates/${id}`, { method: "DELETE" });
        load();
    };

    return (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            {/* Register 폼 */}
            <div style={{ background: C.card, borderRadius: 14, padding: 20 }}>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>📝 Notification톡 템플릿 Register</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <div>
                        <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>템플릿 코드* (Kakao Approve 코드)</div>
                        <input value={form.template_code} onChange={e => setForm(f => ({ ...f, template_code: e.target.value }))} placeholder="예: ORDER_COMPLETE" style={INPUT} />
                    </div>
                    <div>
                        <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>템플릿 Name*</div>
                        <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Orders Done 안내" style={INPUT} />
                    </div>
                    <div>
                        <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>Message Type</div>
                        <select value={form.msg_type} onChange={e => setForm(f => ({ ...f, msg_type: e.target.value }))} style={{ ...INPUT }}>
                            <option value="AT">Notification톡 (AT)</option>
                            <option value="FT">Friendtalk (FT)</option>
                        </select>
                    </div>
                    <div>
                        <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>내용* (변Count: {"#{name}"} 또는 {"{{name}}"})</div>
                        <textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} rows={6} placeholder={"안녕하세요 {{name}}님,\nOrders이 정상적으로 접Count되었습니다.\n\nOrders번호: #{order_no}"} style={{ ...INPUT, resize: "vertical", lineHeight: 1.6 }} />
                    </div>
                    {msg && <div style={{ fontSize: 12, color: msg.startsWith("✅") ? C.green : C.red }}>{msg}</div>}
                    <button onClick={save} style={{ padding: "10px", borderRadius: 10, border: "none", background: C.kakao, color: C.kakaoText, fontWeight: 700, cursor: "pointer" }}>
                        템플릿 Save
                    </button>
                </div>
            </div>

            {/* List + Test */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {/* Test Send Settings */}
                <div style={{ background: C.card, borderRadius: 12, padding: 16 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12 }}>🧪 Test Send 번호</div>
                    <div style={{ display: "flex", gap: 10 }}>
                        <input value={test.phone} onChange={e => setTest(t => ({ ...t, phone: e.target.value }))} placeholder="010-0000-0000" style={{ ...INPUT, flex: 1 }} />
                        <input value={test.name} onChange={e => setTest(t => ({ ...t, name: e.target.value }))} placeholder="Customer명" style={{ ...INPUT, width: 100, flex: "none" }} />
                    </div>
                    {testResult && (
                        <div style={{ marginTop: 10, background: testResult.ok ? "#22c55e11" : "#f8717111", border: `1px solid ${testResult.ok ? "#22c55e33" : "#f8717133"}`, borderRadius: 8, padding: "10px 12px", fontSize: 12 }}>
                            {testResult.ok ? (
                                <>
                                    <div style={{ color: C.green, fontWeight: 700, marginBottom: 4 }}>✅ {testResult.message || "Send Done"}</div>
                                    {testResult.mode === "mock" && <div style={{ color: C.muted }}>📋 내용: {testResult.content?.slice(0, 80)}...</div>}
                                </>
                            ) : (
                                <div style={{ color: C.red }}>❌ {testResult.error}</div>
                            )}
                        </div>
                    )}
                </div>

                {/* Register된 템플릿 */}
                {templates.map(t => (
                    <div key={t.id} style={{ background: C.card, borderRadius: 12, padding: 16, border: `1px solid ${C.border}` }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                            <div>
                                <div style={{ fontWeight: 700 }}>{t.name}</div>
                                <div style={{ fontSize: 11, color: C.muted }}>코드: {t.template_code} · Type: {t.msg_type}</div>
                            </div>
                            <div style={{ display: "flex", gap: 6 }}>
                                <button onClick={() => doTest(t.template_code)} disabled={testingCode === t.template_code} style={{ padding: "5px 10px", borderRadius: 7, border: "none", background: C.kakao, color: C.kakaoText, fontWeight: 700, cursor: "pointer", fontSize: 12 }}>
                                    {testingCode === t.template_code ? "..." : "Test"}
                                </button>
                                <button onClick={() => del(t.id)} style={{ padding: "5px 10px", borderRadius: 7, border: "none", background: "#f8717122", color: C.red, cursor: "pointer", fontSize: 12 }}>Delete</button>
                            </div>
                        </div>
                        <div style={{ fontSize: 12, background: C.surface, borderRadius: 8, padding: "8px 12px", color: C.muted, whiteSpace: "pre-line", maxHeight: 80, overflow: "hidden" }}>
                            {t.content}
                        </div>
                    </div>
                ))}
                {templates.length === 0 && <div style={{ color: C.muted, textAlign: "center", padding: 24 }}>Register된 템플릿 None</div>}
            </div>
        </div>
    );
}

/* ─── Campaign Tab ─────────────────────────────────── */
function CampaignsTab() {
    const [campaigns, setCampaigns] = useState([]);
    const [templates, setTemplates] = useState([]);
    const [segments, setSegments] = useState([]);
    const [form, setForm] = useState({ name: "", template_code: "", segment_id: "" });
    const [sending, setSending] = useState(null);
    const [msg, setMsg] = useState("");

    const load = () => {
        API("/kakao/campaigns").then(r => r.ok && setCampaigns(r.campaigns));
        API("/kakao/templates").then(r => r.ok && setTemplates(r.templates));
        API("/crm/segments").then(r => r.ok && setSegments(r.segments));
    };
    useEffect(() => { load(); }, []);

    const create = async () => {
        const r = await API("/kakao/campaigns", { method: "POST", body: JSON.stringify(form) });
        if (r.ok) { setMsg("✅ Create Campaign"); setForm({ name: "", template_code: "", segment_id: "" }); load(); }
        else setMsg("❌ " + r.error);
    };

    const send = async (id) => {
        if (!confirm("Notification톡을 Send하시겠습니까?")) return;
        setSending(id);
        const r = await API(`/kakao/campaigns/${id}/send`, { method: "POST" });
        setSending(null);
        if (r.ok) { setMsg(`✅ ${r.mode === "mock" ? "[Mock] " : ""}Send Done (Success: ${r.success}, Failed: ${r.failed})`); load(); }
        else setMsg("❌ Send Failed");
    };

    const STATUS_COLOR = { draft: C.muted, sent: C.green };

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ background: C.card, borderRadius: 14, padding: 20 }}>
                <div style={{ fontWeight: 700, marginBottom: 14 }}>💬 새 Notification톡 Campaign</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                    <div>
                        <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>Campaign Name*</div>
                        <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={INPUT} />
                    </div>
                    <div>
                        <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>Notification톡 템플릿</div>
                        <select value={form.template_code} onChange={e => setForm(f => ({ ...f, template_code: e.target.value }))} style={{ ...INPUT }}>
                            <option value="">-- Select --</option>
                            {templates.map(t => <option key={t.id} value={t.template_code}>{t.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>대상 세그먼트</div>
                        <select value={form.segment_id} onChange={e => setForm(f => ({ ...f, segment_id: e.target.value }))} style={{ ...INPUT }}>
                            <option value="">All Customer (Phone 보유)</option>
                            {segments.map(s => <option key={s.id} value={s.id}>{(t("demoData." + s.name) !== "demoData." + s.name ? t("demoData." + s.name) : s.name)} ({s.member_count}명)</option>)}
                        </select>
                    </div>
                </div>
                {msg && <div style={{ marginTop: 10, fontSize: 12, color: msg.startsWith("✅") ? C.green : C.red }}>{msg}</div>}
                <button onClick={create} disabled={!form.name} style={{ marginTop: 14, padding: "9px 22px", borderRadius: 10, border: "none", background: C.kakao, color: C.kakaoText, fontWeight: 700, cursor: "pointer" }}>
                    Create Campaign
                </button>
            </div>

            <div style={{ background: C.card, borderRadius: 14, overflow: "hidden" }}>
                <div style={{ padding: "14px 18px", fontWeight: 700, borderBottom: `1px solid ${C.border}` }}>📊 Campaign 현황</div>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                        <tr style={{ background: "#0a1520" }}>
                            {["Name", "템플릿", "세그먼트", "SendCount", "Success", "Failed", "Status", "Action"].map(h => (
                                <th key={h} style={{ padding: "10px 16px", textAlign: "left", color: C.muted, fontWeight: 600, fontSize: 12 }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {campaigns.map((c, i) => (
                            <tr key={c.id} style={{ borderTop: `1px solid ${C.border}`, background: i % 2 ? "#0a1520" : "transparent" }}>
                                <td style={{ padding: "10px 16px", fontWeight: 600 }}>{(t("demoData." + c.name) !== "demoData." + c.name ? t("demoData." + c.name) : c.name)}</td>
                                <td style={{ padding: "10px 16px", color: C.muted }}>{c.template_name || c.template_code || "-"}</td>
                                <td style={{ padding: "10px 16px", color: C.muted }}>{c.segment_name || "All"}</td>
                                <td style={{ padding: "10px 16px" }}>{c.total?.toLocaleString() || 0}</td>
                                <td style={{ padding: "10px 16px", color: C.green }}>{c.success || 0}</td>
                                <td style={{ padding: "10px 16px", color: C.red }}>{c.failed || 0}</td>
                                <td style={{ padding: "10px 16px" }}>
                                    <span style={{ fontSize: 11, fontWeight: 700, color: STATUS_COLOR[c.status] || C.muted }}>●&nbsp;{(t("demoData." + c.status) !== "demoData." + c.status ? t("demoData." + c.status) : c.status)}</span>
                                </td>
                                <td style={{ padding: "10px 16px" }}>
                                    {c.status !== "sent" && (
                                        <button onClick={() => send(c.id)} disabled={sending === c.id} style={{
                                            padding: "5px 12px", borderRadius: 7, border: "none",
                                            background: sending === c.id ? C.surface : C.kakao,
                                            color: C.kakaoText, fontWeight: 700, cursor: "pointer", fontSize: 12,
                                        }}>{sending === c.id ? "Sending..." : "💬 Send"}</button>
                                    )}
                                </td>
                            </tr>
                        ))}
                        {campaigns.length === 0 && <tr><td colSpan={8} style={{ padding: "24px", textAlign: "center", color: C.muted }}>Campaign None</td></tr>}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

/* ─── Kakao Channel 내용 (PlanGate 내부) ──────────── */
function KakaoChannelContent() {
    const { token } = useAuth();
    const { isDemo } = useDemo();

    const [tab, setTab] = useState("campaigns");
    const TABS = [
        { id: "campaigns", label: "💬 Campaign" },
        { id: "templates", label: "📝 Notification톡 템플릿" },
        { id: "settings", label: "⚙️ Channel Settings" },
    ];

    return (
        <div style={{ background: C.bg, minHeight: "100%", color: C.text }}>
            {isDemo && <DemoBanner feature="Kakao Channel Notification톡" />}
            <div style={{ borderRadius: 16, background: `linear-gradient(135deg,${C.surface},#0a1828)`, border: `1px solid ${C.border}`, padding: "22px 28px", marginBottom: 20 }}>
                <div style={{ fontSize: 22, fontWeight: 800, display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ background: C.kakao, color: C.kakaoText, borderRadius: 8, padding: "4px 10px", fontSize: 16 }}>💬</span>
                    Kakao Channel
                </div>
                <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>Notification톡 템플릿 · 세그먼트 타겟 Send · CRM Auto Sync</div>
            </div>

            <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
                {TABS.map(t => (
                    <button key={t.id} onClick={() => setTab(t.id)} style={{
                        padding: "9px 18px", borderRadius: 10, border: "none", cursor: "pointer",
                        background: tab === t.id ? C.kakao : C.card,
                        color: tab === t.id ? C.kakaoText : C.muted,
                        fontWeight: 700, fontSize: 13,
                    }}>{t.label}</button>
                ))}
            </div>

            {/* Demo: Virtual Data 직접 렌더 */}
            {isDemo ? (
                <div>
                    {tab === "campaigns" && (
                        <div style={{ display: "grid", gap: 12 }}>
                            {DEMO_KAKAO_CAMPAIGNS.map(c => (
                                <div key={c.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "16px 20px" }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                                        <div style={{ fontWeight: 700, fontSize: 14 }}>{(t("demoData." + c.name) !== "demoData." + c.name ? t("demoData." + c.name) : c.name)}</div>
                                        <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, fontWeight: 700, background: c.status === "active" ? "rgba(34,197,94,0.15)" : "rgba(234,179,8,0.15)", color: c.status === "active" ? "#22c55e" : "#eab308" }}>{c.status === "active" ? "Active" : "예약"}</span>
                                    </div>
                                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
                                        {[["SendCount", c.sent.toLocaleString()], ["열람율", `${c.open_rate}%`], ["Clicks율", `${c.click_rate}%`]].map(([l, v]) => (
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
                    {tab === "templates" && (
                        <div style={{ display: "grid", gap: 10 }}>
                            {DEMO_KAKAO_TEMPLATES.map(t => (
                                <div key={t.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{t.name}</div>
                                        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>{t.category}</div>
                                    </div>
                                    <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, fontWeight: 700, background: t.status === "approved" ? "rgba(34,197,94,0.15)" : "rgba(234,179,8,0.15)", color: t.status === "approved" ? "#22c55e" : "#eab308" }}>{t.status === "approved" ? "ApproveDone" : "심사in progress"}</span>
                                </div>
                            ))}
                        </div>
                    )}
                    {tab === "settings" && (
                        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "24px" }}>
                            <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 16 }}>Kakao Channel Settings (Demo)</div>
                            {[["소유자 키번호", DEMO_KAKAO_SETTINGS.sender_key], ["대표 번호", DEMO_KAKAO_SETTINGS.phone], ["Channel ID", DEMO_KAKAO_SETTINGS.channel_id], ["Connect Status", DEMO_KAKAO_SETTINGS.status]].map(([l, v]) => (
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
                    {tab === "campaigns" && <CampaignsTab />}
                    {tab === "templates" && <TemplatesTab />}
                    {tab === "settings" && <SettingsTab />}
                </>
            )}
        </div>
    );
}

/* ─── 메인 Kakao Channel Page ────────────────────── */
export default function KakaoChannel() {
    return (
        <PlanGate feature="kakao_channel">
            <KakaoChannelContent />
        </PlanGate>
    );
}
