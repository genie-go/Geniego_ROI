import React, { useState, useEffect, useCallback } from "react";
import { getJsonAuth, requestJsonAuth } from "../services/apiClient";
import { SITE_LANGS } from "./public/siteI18n.js";
import { useI18n } from "../i18n/index.js";

/**
 * [239차+] 관리자 법적 페이지 편집기 — 이용약관·개인정보·환불을 15개국 다국어 편집.
 *   GET /v424/admin/legal (전체) · PUT /v424/admin/legal/{key}/{lang} (저장).
 *   본문은 lite-markdown(## 헤딩 / ### 소제목 / - 불릿 / 빈줄 문단 / **굵게**). 공개 페이지가 동일 규칙으로 렌더.
 */
const DOC_LABELS = { terms: "이용약관 (Terms)", privacy: "개인정보 (Privacy)", refund: "환불 (Refund)" };
const DOC_KEYS = ["terms", "privacy", "refund"];

export default function LegalDocsAdmin() {
    const { t } = useI18n();
    const [docs, setDocs] = useState({});
    const [key, setKey] = useState("terms");
    const [lang, setLang] = useState("ko");
    const [title, setTitle] = useState("");
    const [subtitle, setSubtitle] = useState("");
    const [body, setBody] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState("");

    const load = useCallback(() => {
        setLoading(true);
        getJsonAuth("/v424/admin/legal")
            .then(d => { if (d && d.ok) setDocs(d.docs || {}); })
            .catch(() => setMsg("로드 실패"))
            .finally(() => setLoading(false));
    }, []);
    useEffect(() => { load(); }, [load]);

    // 선택 변경 시 편집 폼을 해당 (key,lang) 콘텐츠로 동기화
    useEffect(() => {
        const row = docs?.[key]?.[lang];
        setTitle(row?.title || "");
        setSubtitle(row?.subtitle || "");
        setBody(row?.body || "");
        setMsg("");
    }, [key, lang, docs]);

    const save = async () => {
        if (!body.trim()) { setMsg("본문을 입력하세요."); return; }
        setSaving(true); setMsg("");
        try {
            const d = await requestJsonAuth(`/v424/admin/legal/${key}/${lang}`, "PUT", { title, subtitle, body });
            if (d && d.ok) {
                setMsg(`✓ 저장됨 (${key}/${lang}) — 공개 페이지에 즉시 반영`);
                setDocs(prev => ({ ...prev, [key]: { ...(prev[key] || {}), [lang]: { doc_key: key, lang, title, subtitle, body, updated_at: d.updated_at } } }));
            } else { setMsg("저장 실패: " + (d?.error || "")); }
        } catch (e) { setMsg("저장 오류: " + (e?.message || "")); }
        setSaving(false);
    };

    const has = (k, l) => !!(docs?.[k]?.[l]?.body || "").trim();
    const filledCount = (k) => SITE_LANGS.filter(l => has(k, l.code)).length;

    const card = { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: "18px 20px" };
    const inp = { width: "100%", padding: "9px 12px", borderRadius: 9, border: "1px solid var(--border)", background: "var(--surface-2, #fff)", color: "var(--text-1)", fontSize: 13, boxSizing: "border-box", outline: "none" };

    return (
        <div style={{ display: "grid", gap: 16, maxWidth: 980, margin: "0 auto", padding: "8px 4px 40px" }}>
            <div>
                <div style={{ fontSize: 22, fontWeight: 900, color: "var(--text-1)" }}>{t('legalDocsAdmin.title', '📜 법적 페이지 편집')}</div>
                <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 4 }}>{t('legalDocsAdmin.desc', '이용약관·개인정보·환불을 15개국 현지 자연어로 편집합니다. 저장 즉시 공개 페이지(/terms·/privacy·/refund)에 반영됩니다. ★법적 효력 텍스트이므로 발행 전 법무 검토를 권장합니다.')}</div>
            </div>

            {/* 문서 선택 */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {DOC_KEYS.map(k => (
                    <button key={k} onClick={() => setKey(k)} style={{
                        padding: "10px 16px", borderRadius: 10, border: "none", cursor: "pointer", fontWeight: 800, fontSize: 13,
                        background: key === k ? "linear-gradient(135deg,#4f8ef7,#6366f1)" : "var(--surface-2,#eef2f7)",
                        color: key === k ? "#fff" : "var(--text-2)",
                    }}>{DOC_LABELS[k]} <span style={{ opacity: 0.8, fontWeight: 600 }}>· {filledCount(k)}/15</span></button>
                ))}
            </div>

            {/* 언어 선택 */}
            <div style={{ ...card }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", marginBottom: 8 }}>{t('legalDocsAdmin.langLabel', '언어 (채워진 언어 ●)')}</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {SITE_LANGS.map(l => (
                        <button key={l.code} onClick={() => setLang(l.code)} style={{
                            padding: "5px 11px", borderRadius: 8, border: lang === l.code ? "2px solid #4f8ef7" : "1px solid var(--border)",
                            cursor: "pointer", fontSize: 12, fontWeight: lang === l.code ? 800 : 600,
                            background: lang === l.code ? "rgba(79,142,247,0.1)" : "transparent", color: "var(--text-1)",
                        }}>{has(key, l.code) ? "● " : "○ "}{l.label}</button>
                    ))}
                </div>
            </div>

            {/* 편집 폼 */}
            {loading ? <div style={{ ...card, color: "var(--text-3)" }}>로드 중…</div> : (
                <div style={{ ...card, display: "grid", gap: 12 }}>
                    <div>
                        <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)" }}>{t('legalDocsAdmin.titleLabel', '제목 (Title)')}</label>
                        <input style={inp} value={title} onChange={e => setTitle(e.target.value)} placeholder="예: 이용약관 / Terms of Service" />
                    </div>
                    <div>
                        <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)" }}>{t('legalDocsAdmin.subtitleLabel', '부제 (Subtitle)')}</label>
                        <input style={inp} value={subtitle} onChange={e => setSubtitle(e.target.value)} placeholder="예: 최종 수정일 2026-04-01 · 즉시 발효" />
                    </div>
                    <div>
                        <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)" }}>{t('legalDocsAdmin.bodyLabel', '본문 (lite-markdown)')}</label>
                        <textarea style={{ ...inp, minHeight: 360, fontFamily: "ui-monospace, monospace", lineHeight: 1.6, resize: "vertical" }}
                            value={body} onChange={e => setBody(e.target.value)}
                            placeholder={"## 1. 제목\n문단 내용...\n\n- 항목 1\n- 항목 2\n\n### 소제목\n**굵게** 강조도 가능합니다."} />
                        <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 6 }}>{t('legalDocsAdmin.formatLabel', '형식:')} <code>{t('legalDocsAdmin.formatH1', '## 제목')}</code> · <code>{t('legalDocsAdmin.formatH2', '### 소제목')}</code> · <code>{t('legalDocsAdmin.formatBullet', '- 불릿')}</code> {t('legalDocsAdmin.formatParagraphSep', '· 빈 줄 = 문단 구분 ·')} <code>{t('legalDocsAdmin.formatBold', '**굵게**')}</code></div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <button onClick={save} disabled={saving} style={{
                            padding: "10px 22px", borderRadius: 10, border: "none", cursor: saving ? "default" : "pointer",
                            fontWeight: 800, fontSize: 13, background: saving ? "#cbd5e1" : "linear-gradient(135deg,#22c55e,#16a34a)", color: "#fff",
                        }}>{saving ? "저장 중…" : t('legalDocsAdmin.saveButton', '💾 저장')}</button>
                        {msg && <span style={{ fontSize: 12, fontWeight: 700, color: msg.startsWith("✓") ? "#16a34a" : "#ef4444" }}>{msg}</span>}
                    </div>
                </div>
            )}
        </div>
    );
}
