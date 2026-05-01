import React, { useState, useMemo, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useI18n } from "../i18n/index.js";
import { useAuth } from "../auth/AuthContext.jsx";
import { sanitizeHtml } from "../utils/xssSanitizer.js";
import ko from '../i18n/locales/ko.js';
const t = (k) => k.split('.').reduce((o, i) => o?.[i], { auto: ko?.auto }) || k;


/* ═══ Main Component ══════════════════════════════════════════════ */

/* ── Enterprise Error Boundary ─────────────────────────── */
function ErrorFallback({ error, onRetry }) {
    /* Enterprise Error Boundary */

    if (_pageError) return <ErrorFallback error={_pageError} onRetry={() => { _setPageError(null); _setRetryCount(c => c + 1); }} />;

    return (
        <div style={{
            padding: '40px 28px', textAlign: 'center', borderRadius: 16,
            background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.15)',
            margin: '20px 0'
        }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
            <div style={{ fontWeight: 800, fontSize: 16, color: '#ef4444', marginBottom: 8 }}>
                An error occurred
            </div>
            <div style={{
                fontSize: 11, color: 'var(--text-3)', marginBottom: 16,
                padding: '8px 12px', borderRadius: 8, background: 'rgba(239,68,68,0.06)',
                fontFamily: 'monospace', wordBreak: 'break-all', maxWidth: 500, margin: '0 auto 16px'
            }}>
                {error?.message || 'Unknown error'}
            </div>
            <button onClick={onRetry} style={{
                padding: '8px 24px', borderRadius: 10, border: 'none', cursor: 'pointer',
                background: 'linear-gradient(135deg,#4f8ef7,#6366f1)', color: '#fff',
                fontWeight: 700, fontSize: 12
            }}>
                🔄 Retry
            </button>
        </div>
    );
}

export default function HelpCenter() {
    const [_pageError, _setPageError] = React.useState(null);
    const [_retryCount, _setRetryCount] = React.useState(0);

    const navigate = useNavigate();
    const { t, lang } = useI18n();
    const { isDemo } = useAuth();
    const [tab, setTab] = useState("menus");
    const [openMenu, setOpenMenu] = useState(null);
    const [faqOpen, setFaqOpen] = useState(null);
    const [query, setQuery] = useState("");
    const searchRef = useRef(null);

    const card = {
        background: "var(--surface, var(--surface))",
        border: "1px solid var(--border, rgba(99,140,255,0.12))",
        borderRadius: 16, padding: 20,
    };

    /* ── Translation 데이터 (lang Change 시 재계산) ────────────────────── */
    const TABS = useMemo(() => [
        { id: "menus", label: t("help.tabMenus") },
        { id: "faq", label: t("help.tabFaq") },
        { id: "apikeys", label: t("help.tabApi") },
        { id: "roles", label: t("help.tabRoles") },
    ], [t]);

    const MENU_DOCS = useMemo(() => t("help.menuDocs"), [t]);
    const FAQS = useMemo(() => t("help.faqs"), [t]);
    const API_GUIDE = useMemo(() => t("help.apiGuide"), [t]);
    const ROLES = useMemo(() => t("help.roles"), [t]);

    /* ── 실Time Search 결과 ──────────────────────────────────────── */
    const searchResults = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return null;

        const results = [];

        // MENU_DOCS Search
        if (Array.isArray(MENU_DOCS)) {
            MENU_DOCS.forEach(section => {
                section.menus?.forEach(m => {
                    const text = [m.label, m.path, m.desc, ...(m.how || [])].join(" ").toLowerCase();
                    if (text.includes(q)) {
                        results.push({
                            type: "menu",
                            section: section.section,
                            icon: m.icon,
                            label: m.label,
                            path: m.path,
                            desc: m.desc,
                            how: m.how || [],
                        });
                    }
                });
            });
        }

        // FAQS Search
        if (Array.isArray(FAQS)) {
            FAQS.forEach((faq, i) => {
                const text = [faq.q, faq.a].join(" ").toLowerCase();
                if (text.includes(q)) {
                    results.push({ type: "faq", index: i, q: faq.q, a: faq.a });
                }
            });
        }

        // API_GUIDE Search
        if (Array.isArray(API_GUIDE)) {
            API_GUIDE.forEach(g => {
                const text = [g.service, ...(g.steps || [])].join(" ").toLowerCase();
                if (text.includes(q)) {
                    results.push({ type: "api", icon: g.icon, service: g.service, steps: g.steps || [], color: g.color });
                }
            });
        }

        // ROLES Search
        if (Array.isArray(ROLES)) {
            ROLES.forEach(r => {
                const text = [r.role, r.desc, ...(r.tasks || []), ...(r.daily || [])].join(" ").toLowerCase();
                if (text.includes(q)) {
                    results.push({ type: "role", icon: r.icon, role: r.role, desc: r.desc, color: r.color });
                }
            });
        }

        return results;
    }, [query, MENU_DOCS, FAQS, API_GUIDE, ROLES]);

    /* Search어에서 Tab Auto Move */
    const goToResult = (result) => {
        setQuery("");
        if (result.type === "menu") {
            setTab("menus");
            setOpenMenu(result.path);
            setTimeout(() => {
                document.getElementById(`menu-${result.path.replace(/\//g, "_")}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
            }, 100);
        } else if (result.type === "faq") {
            setTab("faq");
            setFaqOpen(result.index);
        } else if (result.type === "api") {
            setTab("apikeys");
        } else if (result.type === "role") {
            setTab("roles");
        }
    };

    /* Search창 Ctrl+F or / 단축키 */
    useEffect(() => {
        const handler = (e) => {
            if ((e.ctrlKey && e.key === "f") || e.key === "/") {
                // 입력창 포커스 in progress이 아닐 때만
                if (document.activeElement.tagName !== "INPUT" && document.activeElement.tagName !== "TEXTAREA") {
                    e.preventDefault();
                    searchRef.current?.focus();
                }
            }
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, []);

    /* Search어 하이라이트 */
    const highlight = (text, q) => {
        if (!q || !text) return text;
        const idx = text.toLowerCase().indexOf(q.toLowerCase());
        if (idx === -1) return text;
        return (
            <>
                {text.slice(0, idx)}
                <mark style={{ background: "rgba(79,142,247,0.35)", color: '#fff', borderRadius: 3, padding: "0 2px" }}>
                    {text.slice(idx, idx + q.length)}
                </mark>
                {text.slice(idx + q.length)}
            </>
        );
    };

    return (
        <div style={{ display: "grid", gap: 18, maxWidth: 1000 }}>
            {/* ── [ 전용] 체험 안내 Banner ─────────────────────────── */}
            {isDemo && (
                <div style={{ padding: "12px 18px", borderRadius: 12, background: "linear-gradient(135deg, rgba(234,179,8,0.08), rgba(249,115,22,0.06))", border: "1px solid rgba(234,179,8,0.3)", display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontSize: 20 }}>🎯</span>
                    <div>
                        <div style={{ fontWeight: 700, fontSize: 13, color: "#eab308" }}>체험  Mode — 가상 샘플 데이터로 열람 in progress</div>
                        <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>
                            Platform Management자(Admin) Page를 제외한 모든 메뉴를 자유롭게 열람할 Count 있습니다.
                            <span style={{ marginLeft: 6, color: "#4f8ef7", cursor: "pointer" }} onClick={() => navigate('/pricing')}>→ Paid Conversion으로 실데이터 사용 Start</span>
                        </div>
                    </div>
                </div>
            )}
            {/* Hero */}
            <div style={{ ...card, padding: "28px 24px", background: "linear-gradient(135deg, rgba(79,142,247,0.08), rgba(168,85,247,0.06))", borderColor: "rgba(79,142,247,0.25)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
                    <div style={{ width: 56, height: 56, borderRadius: 16, background: "linear-gradient(135deg, #4f8ef7, #a855f7)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, boxShadow: "0 8px 24px rgba(79,142,247,0.35)" }}>📚</div>
                    <div>
                        <div style={{ fontWeight: 900, fontSize: 22, color: '#fff' }}>
                            {t("help.heroTitle")}
                        </div>
                        <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 4 }}>
                            {t("help.heroSub")}
                        </div>
                    </div>
                </div>

                {/* ── 실Time Search창 ── */}
                <div style={{ position: "relative", marginBottom: 14 }}>
                    <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 16, color: "var(--text-3)", pointerEvents: "none" }}>🔍</span>
                    <input
                        ref={searchRef}
                        type="text"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        placeholder={t("help.searchPlaceholder")}
                        style={{ width: "100%", padding: "13px 42px 13px 44px", borderRadius: 12, border: "1px solid rgba(79,142,247,0.3)", background: "rgba(255,255,255,0.06)", color: '#fff', fontSize: 14, outline: "none", boxSizing: "border-box", transition: "border-color 200ms" }}
                        onFocus={e => e.target.style.borderColor = "rgba(79,142,247,0.7)"}
                        onBlur={e => e.target.style.borderColor = "rgba(79,142,247,0.3)"}
                    />
                    {query && (
                        <button
                            onClick={() => setQuery("")}
                            style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-3)", fontSize: 16 }}
                        >✕</button>
                    )}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px,1fr))", gap: 10 }}>
                    {[
                        { icon: "📖", v: t("help.heroCard1title"), d: t("help.heroCard1desc") },
                        { icon: "❓", v: t("help.heroCard2title"), d: t("help.heroCard2desc") },
                        { icon: "🔑", v: t("help.heroCard3title"), d: t("help.heroCard3desc") },
                        { icon: "👥", v: t("help.heroCard4title"), d: t("help.heroCard4desc") },
                    ].map(({ icon, v, d }) => (
                        <div key={v} style={{ padding: "10px 14px", borderRadius: 10, background: 'var(--surface)', border: "1px solid var(--border)" }}>
                            <div style={{ fontSize: 18, marginBottom: 4 }}>{icon}</div>
                            <div style={{ fontWeight: 700, fontSize: 12, color: '#fff' }}>{v}</div>
                            <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 2 }}>{d}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ══ 실Time Search 결과 ══ */}
            {searchResults !== null && (
                <div style={{ display: "grid", gap: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12, fontWeight: 700, color: "var(--text-3)", paddingBottom: 4, borderBottom: "1px solid var(--border)" }}>
                        <span>🔍</span>
                        <span>"{query}" {t("help.searchResultCount", { n: searchResults.length })}</span>
                        {searchResults.length === 0 && (
                            <span style={{ color: "#ef4444", fontWeight: 400 }}>— {t("help.searchNoMatch")}</span>
                        )}
                    </div>

                    {searchResults.length === 0 && (
                        <div style={{ ...card, padding: "24px", textAlign: "center", color: "var(--text-3)", fontSize: 13 }}>
                            <div style={{ fontSize: 32, marginBottom: 10 }}>🔍</div>
                            <div>'{query}' {t("help.searchEmpty")}</div>
                            <div style={{ fontSize: 11, marginTop: 6 }}>{t("help.searchTip")}</div>
                        </div>
                    )}

                    {searchResults.map((r, i) => (
                        <div
                            key={i}
                            onClick={() => goToResult(r)}
                            style={{
                                ...card, padding: "14px 16px", cursor: "pointer", borderColor: r.type === "menu" ? "rgba(79,142,247,0.3)"
                                    : r.type === "faq" ? "rgba(34,197,94,0.3)"
                                        : r.type === "api" ? "rgba(168,85,247,0.3)"
                                            : "rgba(234,179,8,0.3)", transition: "transform 150ms, box-shadow 150ms"
                            }}
                            onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.25)"; }}
                            onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}
                        >
                            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                                <span style={{ fontSize: 18 }}>
                                    {r.type === "menu" ? r.icon
                                        : r.type === "faq" ? "❓"
                                            : r.type === "api" ? (r.icon || "🔑")
                                                : (r.icon || "👥")}
                                </span>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 700, fontSize: 13, color: '#fff' }}>
                                        {r.type === "menu" && highlight(r.label, query)}
                                        {r.type === "faq" && highlight(r.q, query)}
                                        {r.type === "api" && highlight(r.service, query)}
                                        {r.type === "role" && highlight(r.role, query)}
                                    </div>
                                    <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 2 }}>
                                        {r.type === "menu" && `${t("help.searchTypeMenu")} · ${r.section}`}
                                        {r.type === "faq" && t("help.searchTypeFaq")}
                                        {r.type === "api" && t("help.searchTypeApi")}
                                        {r.type === "role" && t("help.searchTypeRole")}
                                    </div>
                                </div>
                                <span style={{ fontSize: 11, color: "var(--text-3)" }}>{t("help.searchClickTo")} →</span>
                            </div>
                            <div style={{ fontSize: 11, color: "var(--text-2)", lineHeight: 1.6, background: 'var(--surface)', borderRadius: 7, padding: "7px 10px" }}>
                                {r.type === "menu" && highlight(r.desc, query)}
                                {r.type === "faq" && highlight(r.a, query)}
                                {r.type === "api" && r.steps.slice(0, 2).map((s, si) => (
                                    <div key={si}>{si + 1}. {highlight(s, query)}</div>
                                ))}
                                {r.type === "role" && highlight(r.desc, query)}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ── Search in progress에는 Tab 숨김 ── */}
            {!query && (
                <>
                    {/* Tabs */}
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {TABS.map(tb => (
                            <button key={tb.id} onClick={() => setTab(tb.id)} style={{ padding: "9px 18px", borderRadius: 10, cursor: "pointer", fontWeight: 700, fontSize: 12, border: "none", background: tab === tb.id ? "linear-gradient(135deg,#4f8ef7,#a855f7)" : "var(--surface)", color: tab === tb.id ? "#fff" : "var(--text-2)", boxShadow: tab === tb.id ? "0 4px 14px rgba(79,142,247,0.3)" : "none", transition: "all 180ms" }}>
                                {tb.label}
                            </button>
                        ))}
                    </div>

                    {/* ══ TAB: 메뉴per Description ══ */}
                    {tab === "menus" && Array.isArray(MENU_DOCS) && (
                        <div style={{ display: "grid", gap: 14 }}>
                            {MENU_DOCS.map(section => (
                                <div key={section.section} style={card}>
                                    <div style={{ fontWeight: 800, fontSize: 15, color: '#fff', marginBottom: 12 }}>
                                        {section.section}
                                    </div>
                                    <div style={{ display: "grid", gap: 8 }}>
                                        {section.menus.map(m => (
                                            <div key={m.path} id={`menu-${m.path.replace(/\//g, "_")}`}
                                                style={{ borderRadius: 12, border: "1px solid var(--border)", overflow: "hidden" }}>
                                                <button
                                                    onClick={() => setOpenMenu(openMenu === m.path ? null : m.path)}
                                                    style={{
                                                        width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: openMenu === m.path
                                                            ? "rgba(79,142,247,0.06)" : "rgba(255,255,255,0.02)", border: "none", cursor: "pointer", textAlign: "left", fontSize: 20
                                                    }}
                                                >
                                                    <span>{m.icon}</span>
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{ fontWeight: 700, fontSize: 13, color: '#fff' }}>{m.label}</div>
                                                        <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>{m.path}</div>
                                                    </div>
                                                    <span style={{ fontSize: 14, color: "var(--text-3)", transform: openMenu === m.path ? "rotate(90deg)" : "none", transition: "200ms" }}>▶</span>
                                                </button>

                                                {openMenu === m.path && (
                                                    <div style={{ padding: "12px 14px 16px", borderTop: "1px solid var(--border)" }}>
                                                        {/* 메뉴 개요 */}
                                                        <div style={{ padding: "12px 14px", borderRadius: 10, marginBottom: 14, background: "linear-gradient(135deg,rgba(79,142,247,0.08),rgba(168,85,247,0.06))", border: "1px solid rgba(79,142,247,0.2)", fontSize: 12, color: "var(--text-2)", lineHeight: 1.8 }}>
                                                            <div style={{ fontSize: 10, fontWeight: 800, color: "#4f8ef7", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.8px" }}>📌 {t("help.menuOverview")}</div>
                                                            💡 {m.desc}
                                                        </div>

                                                        {/* 데이터 Count집·정규화 출처 */}
                                                        {m.dataFrom && m.dataFrom.length > 0 && (
                                                            <div style={{ marginBottom: 14 }}>
                                                                <div style={{ fontSize: 11, fontWeight: 800, color: "#22c55e", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                                                                    <span style={{ background: "rgba(34,197,94,0.15)", padding: "2px 8px", borderRadius: 20, border: "1px solid rgba(34,197,94,0.3)" }}>📥 {t("help.dataSource")}</span>
                                                                </div>
                                                                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                                                                    {m.dataFrom.map((src, i) => (
                                                                        <span key={i} style={{ fontSize: 11, padding: "4px 10px", borderRadius: 20, background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.25)", color: "#4ade80", fontWeight: 600 }}>▸ {src}</span>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* 제공 Info */}
                                                        {m.provides && m.provides.length > 0 && (
                                                            <div style={{ marginBottom: 14 }}>
                                                                <div style={{ fontSize: 11, fontWeight: 800, color: "#a855f7", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                                                                    <span style={{ background: "rgba(168,85,247,0.15)", padding: "2px 8px", borderRadius: 20, border: "1px solid rgba(168,85,247,0.3)" }}>📊 {t("help.menuProvides")}</span>
                                                                </div>
                                                                <div style={{ display: "grid", gap: 5 }}>
                                                                    {m.provides.map((p, i) => (
                                                                        <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "6px 10px", borderRadius: 8, background: "rgba(168,85,247,0.05)", border: "1px solid rgba(168,85,247,0.15)" }}>
                                                                            <span style={{ color: "#a855f7", fontWeight: 900, flexShrink: 0, fontSize: 13, marginTop: 1 }}>✦</span>
                                                                            <span style={{ fontSize: 12, color: "var(--text-2)", lineHeight: 1.6 }}>{p}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* 이 메뉴로 무엇을 할 Count 있나 */}
                                                        {m.canDo && m.canDo.length > 0 && (
                                                            <div style={{ marginBottom: 14 }}>
                                                                <div style={{ fontSize: 11, fontWeight: 800, color: "#f59e0b", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                                                                    <span style={{ background: "rgba(245,158,11,0.15)", padding: "2px 8px", borderRadius: 20, border: "1px solid rgba(245,158,11,0.3)" }}>🎯 {t("help.menuCanDo")}</span>
                                                                </div>
                                                                <div style={{ display: "grid", gap: 5 }}>
                                                                    {m.canDo.map((c, i) => (
                                                                        <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "6px 10px", borderRadius: 8, background: "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.15)" }}>
                                                                            <span style={{ color: "#f59e0b", fontWeight: 900, flexShrink: 0, fontSize: 12, marginTop: 1 }}>→</span>
                                                                            <span style={{ fontSize: 12, color: "var(--text-2)", lineHeight: 1.6 }}>{c}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* 사용 단계 */}
                                                        <div style={{ fontSize: 11, fontWeight: 800, color: "var(--text-3)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.6px" }}>
                                                            📋 {t("help.howToUse")}
                                                        </div>
                                                        <div style={{ display: "grid", gap: 6, marginBottom: 14 }}>
                                                            {(m.how || []).map((step, i) => (
                                                                <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "8px 10px", borderRadius: 8, background: 'var(--surface)', border: "1px solid var(--border)" }}>
                                                                    <span style={{ width: 20, height: 20, borderRadius: "50%", flexShrink: 0, background: "linear-gradient(135deg,#4f8ef7,#a855f7)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 900, color: '#fff' }}>{i + 1}</span>
                                                                    <span style={{ fontSize: 12, color: "var(--text-2)", lineHeight: 1.6 }}>{step}</span>
                                                                </div>
                                                            ))}
                                                        </div>

                                                        {/* Permissionper 가능 Actions */}
                                                        <div style={{ fontSize: 11, fontWeight: 800, color: "var(--text-3)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.6px" }}>
                                                            👥 {t("help.rolePermissions")}
                                                        </div>
                                                        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6, marginBottom: 12 }}>
                                                            {[
                                                                { role: t("help.roleAdmin"), color: "#f59e0b", task: m.roles?.admin || "모든 권한(조회/수정) 허용" },
                                                                { role: t("help.roleEditor"), color: "#4f8ef7", task: m.roles?.editor || "수정 및 등록 허용" },
                                                                { role: t("help.roleViewer"), color: "#22c55e", task: m.roles?.viewer || "데이터 조회만 허용" },
                                                            ].map(r => (
                                                                <div key={r.role} style={{
                                                                    padding: "8px 10px", borderRadius: 8,
                                                                    background: `${r.color}08`, border: `1px solid ${r.color}25`
                                                                }}>
                                                                    <div style={{ fontSize: 10, fontWeight: 800, color: r.color, marginBottom: 4 }}>{r.role}</div>
                                                                    <div style={{ fontSize: 11, color: "var(--text-2)", lineHeight: 1.5 }}>{r.task}</div>
                                                                </div>
                                                            ))}
                                                        </div>

                                                        <button
                                                            onClick={() => navigate(m.path)}
                                                            style={{ padding: "10px 18px", borderRadius: 8, border: "none", cursor: "pointer", background: "linear-gradient(135deg,#38bdf8,#818cf8)", color: '#fff', fontWeight: 800, fontSize: 13, display: "flex", gap: "6px", alignItems: "center" }}
                                                        >
                                                            🚀 {m.icon} 해당 {m.label} 페이지로 이동하기
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* ══ TAB: Q&A ══ */}
                    {tab === "faq" && Array.isArray(FAQS) && (
                        <div style={card}>
                            <div style={{ fontWeight: 800, fontSize: 16, color: '#fff', marginBottom: 16 }}>
                                {t("help.faqTitle")}
                            </div>
                            <div style={{ display: "grid", gap: 8 }}>
                                {FAQS.map((faq, i) => (
                                    <div key={i} style={{ borderRadius: 10, border: "1px solid var(--border)", overflow: "hidden" }}>
                                        <button
                                            onClick={() => setFaqOpen(faqOpen === i ? null : i)}
                                            style={{ width: "100%", padding: "14px 16px", background: faqOpen === i ? "rgba(79,142,247,0.06)" : "rgba(255,255,255,0.02)", border: "none", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: "#4f8ef7", fontWeight: 800, flexShrink: 0 }}
                                        >
                                            <span>Q</span>
                                            <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: '#fff' }}>{faq.q}</span>
                                            <span style={{ fontSize: 12, color: "var(--text-3)", transform: faqOpen === i ? "rotate(180deg)" : "none", transition: "200ms" }}>▼</span>
                                        </button>
                                        {faqOpen === i && (
                                            <div style={{ padding: "12px 16px", background: "rgba(34,197,94,0.04)", borderTop: "1px solid rgba(34,197,94,0.1)", display: "flex", gap: 10 }}>
                                                <span style={{ fontSize: 14, color: "#22c55e", fontWeight: 800, flexShrink: 0 }}>A</span>
                                                <div style={{ fontSize: 12, color: "var(--text-2)", lineHeight: 1.8 }}>{faq.a}</div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ══ TAB: API 키 ══ */}
                    {tab === "apikeys" && Array.isArray(API_GUIDE) && (
                        <div style={{ display: "grid", gap: 14 }}>
                            <div style={{ ...card, padding: "14px 18px" }}>
                                <div style={{ fontWeight: 800, fontSize: 15, color: '#fff', marginBottom: 6 }}>{t("help.apiTitle")}</div>
                                <div style={{ fontSize: 12, color: "var(--text-3)", lineHeight: 1.7 }}
                                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(t("help.apiSubtitle")) }} />
                            </div>
                            {API_GUIDE.map(g => (
                                <div key={g.service} style={{ ...card, borderLeft: `3px solid ${g.color}` }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                                        <span style={{ fontSize: 24 }}>{g.icon}</span>
                                        <div style={{ fontWeight: 800, fontSize: 14, color: '#fff' }}>{g.service}</div>
                                    </div>
                                    <div style={{ display: "grid", gap: 8 }}>
                                        {g.steps.map((step, i) => (
                                            <div key={i} style={{
                                                display: "flex", gap: 10, alignItems: "center",
                                                padding: "8px 12px", borderRadius: 8,
                                                background: `${g.color}08`, border: `1px solid ${g.color}22`
                                            }}>
                                                <span style={{ width: 22, height: 22, borderRadius: "50%", flexShrink: 0, background: g.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 900, color: '#fff' }}>{i + 1}</span>
                                                <span style={{ fontSize: 12, color: "var(--text-2)" }}>{step}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <button
                                        onClick={() => navigate("/api-keys")}
                                        style={{ marginTop: 12, padding: "7px 14px", borderRadius: 7, border: "none", cursor: "pointer", background: g.color, color: '#fff', fontWeight: 700, fontSize: 11 }}
                                    >
                                        {t("help.apiGoTo")}
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* ══ TAB: Permissionper ══ */}
                    {tab === "roles" && Array.isArray(ROLES) && (
                        <div style={{ display: "grid", gap: 16 }}>
                            <div style={{ ...card, padding: "14px 18px" }}>
                                <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 6 }}>{t("help.rolesTitle")}</div>
                                <div style={{ fontSize: 12, color: "var(--text-3)" }}>{t("help.rolesSub")}</div>
                            </div>
                            {ROLES.map(r => (
                                <div key={r.role} style={{ ...card, borderTop: `3px solid ${r.color}` }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                                        <div style={{
                                            width: 44, height: 44, borderRadius: 12,
                                            background: `${r.color}18`, border: `2px solid ${r.color}55`,
                                            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22
                                        }}>{r.icon}</div>
                                        <div>
                                            <div style={{ fontWeight: 900, fontSize: 16, color: r.color }}>{r.role}</div>
                                            <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>{r.desc}</div>
                                        </div>
                                    </div>

                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                                        <div>
                                            <div style={{ fontSize: 11, fontWeight: 800, color: "var(--text-3)", marginBottom: 8, textTransform: "uppercase" }}>{t("help.accessRights")}</div>
                                            <div style={{ display: "grid", gap: 4 }}>
                                                {r.tasks.map((task, i) => (
                                                    <div key={i} style={{
                                                        fontSize: 11, color: task.startsWith("✅") ? "var(--text-2)" : "var(--text-3)",
                                                        padding: "5px 8px", borderRadius: 6,
                                                        background: task.startsWith("✅") ? `${r.color}08` : "rgba(239,68,68,0.04)"
                                                    }}>{task}</div>
                                                ))}
                                            </div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: 11, fontWeight: 800, color: "var(--text-3)", marginBottom: 8, textTransform: "uppercase" }}>{t("help.dailyChecklist")}</div>
                                            <div style={{ display: "grid", gap: 4 }}>
                                                {r.daily.map((d, i) => (
                                                    <div key={i} style={{ fontSize: 11, color: "var(--text-2)", padding: "6px 10px", borderRadius: 6, background: 'var(--surface)', border: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 8 }}>
                                                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: r.color, flexShrink: 0 }} />
                                                        {d}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>

    );
}
