import React, { useEffect, useState, useCallback } from "react";
import { getJsonAuth, requestJsonAuth, postJsonAuth } from "../services/apiClient.js";

/* 187차 Phase2 — 회사소개·연혁·운영진 관리 (admin, 한글).
   숨기기 체크 시 첫페이지(공개) 메뉴/섹션 비표시. 수시 수정·등록 가능. */

const C = { card: "#ffffff", border: "#e2e8f0", text1: "#0f172a", text2: "#475569", text3: "#64748b", accent: "#4f8ef7", bg: "#f8fafc" };
const inputStyle = { width: "100%", boxSizing: "border-box", padding: "9px 12px", borderRadius: 8, border: `1px solid ${C.border}`, background: "#fff", color: C.text1, fontSize: 13.5, fontFamily: "inherit" };
const labelStyle = { display: "block", fontSize: 12, fontWeight: 700, color: C.text2, marginBottom: 5 };
const btn = (bg, fg = "#fff") => ({ padding: "9px 18px", borderRadius: 9, border: "none", background: bg, color: fg, fontSize: 13, fontWeight: 800, cursor: "pointer" });

function Field({ label, value, onChange, textarea, rows = 3, placeholder, half }) {
    return (
        <label style={{ display: "block", marginBottom: 12, ...(half ? {} : {}) }}>
            <span style={labelStyle}>{label}</span>
            {textarea
                ? <textarea value={value || ""} onChange={e => onChange(e.target.value)} rows={rows} placeholder={placeholder} style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }} />
                : <input value={value || ""} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={inputStyle} />}
        </label>
    );
}

function Section({ title, emoji, open, setOpen, hidden, onToggleHidden, children }) {
    return (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, marginBottom: 18, overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 18px", borderBottom: open ? `1px solid ${C.border}` : "none", background: "#f1f5f9" }}>
                <button onClick={() => setOpen(o => !o)} style={{ background: "none", border: "none", cursor: "pointer", flex: 1, textAlign: "left", display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 18 }}>{emoji}</span>
                    <span style={{ fontSize: 15, fontWeight: 900, color: C.text1 }}>{title}</span>
                    <span style={{ fontSize: 12, color: C.text3 }}>{open ? "▼ 접기" : "▶ 펼치기"}</span>
                </button>
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 700, color: hidden ? "#dc2626" : C.text2, cursor: "pointer", whiteSpace: "nowrap" }}>
                    <input type="checkbox" checked={!!hidden} onChange={e => onToggleHidden(e.target.checked)} style={{ width: 16, height: 16, cursor: "pointer" }} />
                    숨기기 {hidden ? "(첫페이지 미표시)" : ""}
                </label>
            </div>
            {open && <div style={{ padding: 18 }}>{children}</div>}
        </div>
    );
}

export default function SiteIntroAdmin() {
    const [company, setCompany] = useState(null);
    const [team, setTeam] = useState([]);
    const [history, setHistory] = useState([]);
    const [open, setOpen] = useState({ company: true, history: false, team: false });
    const [msg, setMsg] = useState("");
    const [busy, setBusy] = useState(false);

    const load = useCallback(async () => {
        try {
            const d = await getJsonAuth("/v424/admin/site/intro");
            if (d?.ok) { setCompany(d.company || {}); setTeam(d.team || []); setHistory(d.history || []); }
        } catch (e) { setMsg("불러오기 실패: " + (e.message || e)); }
    }, []);
    useEffect(() => { load(); }, [load]);

    const flash = (t) => { setMsg(t); setTimeout(() => setMsg(""), 3000); };
    const setC = (k, v) => setCompany(c => ({ ...c, [k]: v }));

    const saveCompany = async () => {
        setBusy(true);
        try {
            const b = {}; ["name", "tagline", "summary", "description", "founded", "ceo", "address", "email", "phone", "website", "vision", "mission", "biz_reg", "copyright"].forEach(k => b[k] = company[k] || "");
            const r = await requestJsonAuth("/v424/admin/site/company", "PUT", b);
            if (r?.ok) flash("✅ 회사소개 저장됨 (공개 페이지 즉시 반영)");
        } catch (e) { flash("저장 실패: " + (e.message || e)); } finally { setBusy(false); }
    };
    const toggleVis = async (key, hidden) => {
        const map = { company: "about_visible", history: "history_visible", team: "team_visible" };
        const k = map[key];
        setCompany(c => ({ ...c, [k]: !hidden }));
        try { await requestJsonAuth("/v424/admin/site/visibility", "PUT", { [k]: hidden ? 0 : 1 }); flash(hidden ? "숨김 적용 — 첫페이지에서 미표시" : "표시 적용"); }
        catch (e) { flash("실패: " + (e.message || e)); load(); }
    };

    // history CRUD
    const blankH = { ymd: "", title: "", description: "", display_order: 0, is_active: true };
    const [hForm, setHForm] = useState(blankH);
    const saveHistory = async () => {
        if (!hForm.title.trim()) return flash("연혁 제목을 입력하세요");
        setBusy(true);
        try { const r = await postJsonAuth("/v424/admin/site/history", hForm); if (r?.ok) { setHistory(r.history || []); setHForm(blankH); flash("✅ 연혁 저장됨"); } }
        catch (e) { flash("실패: " + (e.message || e)); } finally { setBusy(false); }
    };
    const editHistory = (h) => setHForm({ ...h });
    const delHistory = async (id) => { if (!window.confirm("이 연혁을 삭제할까요?")) return; try { const r = await requestJsonAuth(`/v424/admin/site/history/${id}`, "DELETE"); if (r?.ok) { setHistory(r.history || []); flash("삭제됨"); } } catch (e) { flash("실패: " + e.message); } };

    // team CRUD
    const blankT = { name: "", title: "", bio: "", photo_url: "", email: "", linkedin: "", display_order: 0, is_active: true };
    const [tForm, setTForm] = useState(blankT);
    const saveTeam = async () => {
        if (!tForm.name.trim()) return flash("운영진 이름을 입력하세요");
        setBusy(true);
        try { const r = await postJsonAuth("/v424/admin/site/team", tForm); if (r?.ok) { setTeam(r.team || []); setTForm(blankT); flash("✅ 운영진 저장됨"); } }
        catch (e) { flash("실패: " + (e.message || e)); } finally { setBusy(false); }
    };
    const editTeam = (m) => setTForm({ ...m });
    const delTeam = async (id) => { if (!window.confirm("이 운영진을 삭제할까요?")) return; try { const r = await requestJsonAuth(`/v424/admin/site/team/${id}`, "DELETE"); if (r?.ok) { setTeam(r.team || []); flash("삭제됨"); } } catch (e) { flash("실패: " + e.message); } };

    if (!company) return <div style={{ padding: 30, color: C.text2 }}>불러오는 중…</div>;

    return (
        <div style={{ padding: 24, paddingBottom: 80, background: C.bg, minHeight: "100%" }}>
            <div style={{ marginBottom: 8 }}>
                <h1 style={{ fontSize: 22, fontWeight: 900, color: C.text1, margin: 0 }}>🏢 회사소개 · 연혁 · 운영진 관리</h1>
                <p style={{ fontSize: 13, color: C.text3, marginTop: 4 }}>한글로 등록·수정하면 공개 소개 페이지(15개국 현지화 chrome)에 즉시 반영됩니다. <strong>숨기기</strong> 체크 시 첫페이지에서 해당 메뉴/섹션이 보이지 않습니다.</p>
            </div>
            {msg && <div style={{ margin: "10px 0", padding: "10px 16px", borderRadius: 10, background: "rgba(34,197,94,0.10)", border: "1px solid rgba(34,197,94,0.3)", color: "#15803d", fontSize: 13, fontWeight: 700 }}>{msg}</div>}

            {/* 회사소개 */}
            <Section title="회사소개" emoji="📄" open={open.company} setOpen={(f) => setOpen(o => ({ ...o, company: typeof f === "function" ? f(o.company) : f }))}
                hidden={!company.about_visible} onToggleHidden={(h) => toggleVis("company", h)}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                    <Field label="회사명" value={company.name} onChange={v => setC("name", v)} />
                    <Field label="태그라인 (한 줄 소개)" value={company.tagline} onChange={v => setC("tagline", v)} />
                </div>
                <Field label="요약 (히어로 하단)" value={company.summary} onChange={v => setC("summary", v)} textarea rows={2} />
                <Field label="상세 소개" value={company.description} onChange={v => setC("description", v)} textarea rows={5} />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                    <Field label="비전" value={company.vision} onChange={v => setC("vision", v)} textarea rows={2} />
                    <Field label="미션" value={company.mission} onChange={v => setC("mission", v)} textarea rows={2} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
                    <Field label="설립" value={company.founded} onChange={v => setC("founded", v)} />
                    <Field label="대표" value={company.ceo} onChange={v => setC("ceo", v)} />
                    <Field label="이메일" value={company.email} onChange={v => setC("email", v)} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 14 }}>
                    <Field label="주소" value={company.address} onChange={v => setC("address", v)} />
                    <Field label="전화" value={company.phone} onChange={v => setC("phone", v)} />
                    <Field label="웹사이트" value={company.website} onChange={v => setC("website", v)} />
                </div>
                {/* [239차+] 공개 footer 정보(전 공개페이지 하단 — 약관/개인정보/환불 포함) */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 14 }}>
                    <Field label="사업자등록번호 (footer)" value={company.biz_reg} onChange={v => setC("biz_reg", v)} placeholder="104-81-65037" />
                    <Field label="저작권 표기 (footer · 전 페이지)" value={company.copyright} onChange={v => setC("copyright", v)} placeholder="© 2001. 09. 11. Ociell Co., Ltd. All rights reserved." />
                </div>
                <button onClick={saveCompany} disabled={busy} style={{ ...btn("#16a34a"), opacity: busy ? 0.6 : 1 }}>💾 회사소개 저장</button>
            </Section>

            {/* 연혁 */}
            <Section title="연혁" emoji="📅" open={open.history} setOpen={(f) => setOpen(o => ({ ...o, history: typeof f === "function" ? f(o.history) : f }))}
                hidden={!company.history_visible} onToggleHidden={(h) => toggleVis("history", h)}>
                <div style={{ display: "grid", gridTemplateColumns: "120px 1fr 90px", gap: 10, alignItems: "end", marginBottom: 12 }}>
                    <Field label="시점 (예: 2024.01)" value={hForm.ymd} onChange={v => setHForm(f => ({ ...f, ymd: v }))} />
                    <Field label="제목" value={hForm.title} onChange={v => setHForm(f => ({ ...f, title: v }))} />
                    <Field label="순서" value={String(hForm.display_order)} onChange={v => setHForm(f => ({ ...f, display_order: parseInt(v) || 0 }))} />
                </div>
                <Field label="설명" value={hForm.description} onChange={v => setHForm(f => ({ ...f, description: v }))} textarea rows={2} />
                <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                    <button onClick={saveHistory} disabled={busy} style={btn("#4f8ef7")}>{hForm.id ? "✏️ 수정 저장" : "➕ 연혁 추가"}</button>
                    {hForm.id && <button onClick={() => setHForm(blankH)} style={btn("#e2e8f0", C.text2)}>새로 입력</button>}
                </div>
                <div style={{ display: "grid", gap: 8 }}>
                    {history.map(h => (
                        <div key={h.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 10, background: "#f8fafc", border: `1px solid ${C.border}` }}>
                            <span style={{ fontSize: 12, fontWeight: 800, color: C.accent, width: 70 }}>{h.ymd}</span>
                            <span style={{ flex: 1, fontSize: 13.5, fontWeight: 700, color: C.text1 }}>{h.title}</span>
                            <button onClick={() => editHistory(h)} style={btn("#eef2ff", "#4338ca")}>편집</button>
                            <button onClick={() => delHistory(h.id)} style={btn("#fef2f2", "#dc2626")}>삭제</button>
                        </div>
                    ))}
                    {history.length === 0 && <div style={{ fontSize: 13, color: C.text3, padding: "8px 0" }}>등록된 연혁이 없습니다.</div>}
                </div>
            </Section>

            {/* 운영진 */}
            <Section title="운영진" emoji="🧑‍💼" open={open.team} setOpen={(f) => setOpen(o => ({ ...o, team: typeof f === "function" ? f(o.team) : f }))}
                hidden={!company.team_visible} onToggleHidden={(h) => toggleVis("team", h)}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 90px", gap: 10 }}>
                    <Field label="이름" value={tForm.name} onChange={v => setTForm(f => ({ ...f, name: v }))} />
                    <Field label="직책" value={tForm.title} onChange={v => setTForm(f => ({ ...f, title: v }))} />
                    <Field label="순서" value={String(tForm.display_order)} onChange={v => setTForm(f => ({ ...f, display_order: parseInt(v) || 0 }))} />
                </div>
                <Field label="소개 (약력)" value={tForm.bio} onChange={v => setTForm(f => ({ ...f, bio: v }))} textarea rows={3} />
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 10 }}>
                    <Field label="사진 URL (선택)" value={tForm.photo_url} onChange={v => setTForm(f => ({ ...f, photo_url: v }))} />
                    <Field label="이메일 (선택)" value={tForm.email} onChange={v => setTForm(f => ({ ...f, email: v }))} />
                    <Field label="LinkedIn (선택)" value={tForm.linkedin} onChange={v => setTForm(f => ({ ...f, linkedin: v }))} />
                </div>
                <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                    <button onClick={saveTeam} disabled={busy} style={btn("#4f8ef7")}>{tForm.id ? "✏️ 수정 저장" : "➕ 운영진 추가"}</button>
                    {tForm.id && <button onClick={() => setTForm(blankT)} style={btn("#e2e8f0", C.text2)}>새로 입력</button>}
                </div>
                <div style={{ display: "grid", gap: 8 }}>
                    {team.map(m => (
                        <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 10, background: "#f8fafc", border: `1px solid ${C.border}` }}>
                            <span style={{ fontSize: 14, fontWeight: 800, color: C.text1, width: 120 }}>{m.name}</span>
                            <span style={{ flex: 1, fontSize: 13, color: C.text2 }}>{m.title}</span>
                            <button onClick={() => editTeam(m)} style={btn("#eef2ff", "#4338ca")}>편집</button>
                            <button onClick={() => delTeam(m.id)} style={btn("#fef2f2", "#dc2626")}>삭제</button>
                        </div>
                    ))}
                    {team.length === 0 && <div style={{ fontSize: 13, color: C.text3, padding: "8px 0" }}>등록된 운영진이 없습니다.</div>}
                </div>
            </Section>
        </div>
    );
}
