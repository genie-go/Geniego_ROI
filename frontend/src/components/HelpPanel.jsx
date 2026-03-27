import React, { useState, useEffect, useRef, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useI18n } from "../i18n";

/* ── ko.js menuDocs → path-indexed hook ── */
function useMenuDocIndex() {
    const { t } = useI18n();
    return useMemo(() => {
        const docs = t("help.menuDocs");
        if (!Array.isArray(docs)) return {};
        const idx = {};
        docs.forEach(section => {
            (section.menus || []).forEach(m => {
                if (m.path) {
                    idx[m.path] = {
                        title: m.label || "",
                        icon: m.icon || "📋",
                        summary: m.desc || "",
                        steps: Array.isArray(m.how) ? m.how : [],
                        tips: Array.isArray(m.canDo) ? m.canDo : [],
                        dataFrom: Array.isArray(m.dataFrom) ? m.dataFrom : [],
                        provides: Array.isArray(m.provides) ? m.provides : [],
                        roles: m.roles || null,
                    };
                }
            });
        });
        return idx;
    }, [t]);
}



export default function HelpPanel({ open, onClose }) {
    const { pathname } = useLocation();
    const navigate = useNavigate();
    const panelRef = useRef(null);
    const searchRef = useRef(null);
    const { t } = useI18n();

    /* Build locale-aware static help and defaults */
    const STATIC_HELP = useMemo(() => ({
        "/connectors": { title: t('helpPanel.staticHelp.connectors.title'), icon: "🔌", summary: t('helpPanel.staticHelp.connectors.summary'), steps: t('helpPanel.staticHelp.connectors.steps') || [], tips: t('helpPanel.staticHelp.connectors.tips') || [] },
        "/api-keys": { title: t('helpPanel.staticHelp.apiKeys.title'), icon: "🔑", summary: t('helpPanel.staticHelp.apiKeys.summary'), steps: t('helpPanel.staticHelp.apiKeys.steps') || [], tips: t('helpPanel.staticHelp.apiKeys.tips') || [] },
        "/user-management": { title: t('helpPanel.staticHelp.userMgmt.title'), icon: "👥", summary: t('helpPanel.staticHelp.userMgmt.summary'), steps: t('helpPanel.staticHelp.userMgmt.steps') || [], tips: t('helpPanel.staticHelp.userMgmt.tips') || [] },
        "/help": { title: t('helpPanel.staticHelp.help.title'), icon: "📚", summary: t('helpPanel.staticHelp.help.summary'), steps: t('helpPanel.staticHelp.help.steps') || [], tips: [] },
        "/sms-marketing": { title: t('helpPanel.staticHelp.smsMarketing.title'), icon: "💬", summary: t('helpPanel.staticHelp.smsMarketing.summary'), steps: t('helpPanel.staticHelp.smsMarketing.steps') || [], tips: t('helpPanel.staticHelp.smsMarketing.tips') || [] },
    }), [t]);

    const DEFAULT_HELP = useMemo(() => ({
        title: t('helpPanel.defaultTitle'),
        icon: "❓",
        summary: t('helpPanel.defaultSummary'),
        steps: [t('helpPanel.defaultStep1'), t('helpPanel.defaultStep2')],
        tips: [],
        dataFrom: [],
        provides: [],
    }), [t]);

    const [query, setQuery] = useState("");
    const [viewResult, setViewResult] = useState(null);

    /* ko.js menuDocs → 경로별 인덱스 (단일 소스) */
    const menuDocIndex = useMenuDocIndex();

    /* STATIC_HELP와 병합: menuDocs 우선, 없으면 STATIC_HELP */
    const HELP_DATA = useMemo(() => ({ ...STATIC_HELP, ...menuDocIndex }), [menuDocIndex]);

    const help = viewResult || HELP_DATA[pathname] || DEFAULT_HELP;

    /* Search용 평탄화 인덱스 (menuDocs + STATIC_HELP All) */
    const searchIndex = useMemo(() =>
        Object.entries(HELP_DATA).map(([path, h]) => ({
            path, title: h.title, icon: h.icon, summary: h.summary,
            steps: h.steps || [], tips: h.tips || [],
            dataFrom: h.dataFrom || [], provides: h.provides || [],
            searchText: [h.title, h.summary, ...(h.steps || []), ...(h.tips || []), ...(h.provides || []), ...(h.dataFrom || [])].join(" ").toLowerCase(),
        })),
    [HELP_DATA]);

    /* Search 결과 */
    const searchResults = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return null;
        return searchIndex.filter(item => item.searchText.includes(q));
    }, [query, searchIndex]);

    /* ESC Close */
    useEffect(() => {
        const handler = (e) => { if (e.key === "Escape") onClose(); };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [onClose]);

    /* 패널 열릴 때 Search창 포커스 */
    useEffect(() => {
        if (open) {
            setQuery("");
            setViewResult(null);
            setTimeout(() => searchRef.current?.focus(), 300);
        }
    }, [open]);

    /* Search어 하이라이트 */
    const highlight = (text, q) => {
        if (!q || !text) return text;
        const idx = text.toLowerCase().indexOf(q.toLowerCase());
        if (idx === -1) return text;
        return (
            <>
                {text.slice(0, idx)}
                <mark style={{ background: "rgba(79,142,247,0.4)", color: "#fff", borderRadius: 3, padding: "0 2px" }}>
                    {text.slice(idx, idx + q.length)}
                </mark>
                {text.slice(idx + q.length)}
            </>
        );
    };

    const selectResult = (item) => {
        setViewResult({ title: item.title, icon: item.icon, summary: item.summary, steps: item.steps, tips: item.tips, dataFrom: item.dataFrom, provides: item.provides });
        setQuery("");
    };

    return (
        <>
            {/* Backdrop */}
            {open && (
                <div
                    onClick={onClose}
                    style={{
                        position: "fixed", inset: 0,
                        background: "rgba(0,0,0,0.4)",
                        backdropFilter: "blur(4px)",
                        zIndex: 800,
                    }}
                />
            )}

            {/* Slide-in Panel */}
            <div
                ref={panelRef}
                style={{
                    position: "fixed", top: 0, right: 0, bottom: 0,
                    width: "min(440px, 95vw)",
                    background: "var(--surface, #0d1525)",
                    borderLeft: "1px solid var(--border2, rgba(99,140,255,0.2))",
                    boxShadow: "-24px 0 60px rgba(0,0,0,0.5)",
                    zIndex: 801,
                    transform: open ? "translateX(0)" : "translateX(100%)",
                    transition: "transform 280ms cubic-bezier(.4,0,.2,1)",
                    display: "flex", flexDirection: "column",
                    overflowY: "auto",
                }}
            >
                {/* Header */}
                <div style={{
                    padding: "14px 16px 10px",
                    borderBottom: "1px solid var(--border)",
                    position: "sticky", top: 0,
                    background: "var(--surface)",
                    zIndex: 10,
                }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                        <div style={{
                            width: 36, height: 36, borderRadius: 10,
                            background: "linear-gradient(135deg, rgba(79,142,247,0.2), rgba(168,85,247,0.15))",
                            border: "1px solid rgba(79,142,247,0.3)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 18, flexShrink: 0,
                        }}>
                            {viewResult ? viewResult.icon : help.icon}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 800, fontSize: 13, color: "var(--text-1)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                {viewResult ? viewResult.title : help.title}
                            </div>
                            <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 1 }}>
                                {viewResult ? t('helpPanel.searchResult') : t('helpPanel.currentPageHelp')}
                            </div>
                        </div>
                        {viewResult && (
                            <button
                                onClick={() => { setViewResult(null); setQuery(""); }}
                                style={{ background: "none", cursor: "pointer", color: "var(--text-3)", fontSize: 12, padding: "3px 8px", borderRadius: 6, border: "1px solid var(--border)" }}
                            >{t('helpPanel.goBack')}</button>
                        )}
                        <button
                            onClick={onClose}
                            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-3)", fontSize: 18, padding: "4px 6px" }}
                        >✕</button>
                    </div>

                    {/* 실시간 Search창 */}
                    <div style={{ position: "relative" }}>
                        <span style={{
                            position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)",
                            fontSize: 14, color: "var(--text-3)", pointerEvents: "none",
                        }}>🔍</span>
                        <input
                            ref={searchRef}
                            type="text"
                            value={query}
                            onChange={e => { setQuery(e.target.value); setViewResult(null); }}
                            placeholder={t('helpPanel.searchPlaceholder')}
                            style={{
                                width: "100%", padding: "9px 32px 9px 34px",
                                borderRadius: 9, border: "1px solid rgba(79,142,247,0.25)",
                                background: "rgba(255,255,255,0.05)",
                                color: "var(--text-1)", fontSize: 12,
                                outline: "none", boxSizing: "border-box",
                                transition: "border-color 200ms",
                            }}
                            onFocus={e => e.target.style.borderColor = "rgba(79,142,247,0.6)"}
                            onBlur={e => e.target.style.borderColor = "rgba(79,142,247,0.25)"}
                        />
                        {query && (
                            <button
                                onClick={() => setQuery("")}
                                style={{
                                    position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
                                    background: "none", border: "none", cursor: "pointer",
                                    color: "var(--text-3)", fontSize: 14,
                                }}
                            >✕</button>
                        )}
                    </div>
                </div>

                {/* Search 결과 */}
                {searchResults !== null && (
                    <div style={{ padding: "12px 14px", flex: 1 }}>
                        <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 10, fontWeight: 700 }}>
                            {t('helpPanel.helpResultCount').replace('{{n}}', searchResults.length).replace('{{q}}', query)}
                        </div>

                        {searchResults.length === 0 && (
                            <div style={{
                                textAlign: "center", padding: "24px 16px",
                                color: "var(--text-3)", fontSize: 12,
                                background: "rgba(255,255,255,0.03)", borderRadius: 10, border: "1px solid var(--border)",
                            }}>
                                <div style={{ fontSize: 28, marginBottom: 8 }}>🔍</div>
                                <div>{t('helpPanel.noHelpFound').replace('{{q}}', query)}</div>
                                <div style={{ fontSize: 10, marginTop: 6 }}>{t('helpPanel.tryOther')}</div>
                            </div>
                        )}

                        <div style={{ display: "grid", gap: 8 }}>
                            {searchResults.map((item) => (
                                <div
                                    key={item.path}
                                    onClick={() => selectResult(item)}
                                    style={{
                                        padding: "12px 14px", borderRadius: 10, cursor: "pointer",
                                        background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)",
                                        transition: "all 150ms",
                                    }}
                                    onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(79,142,247,0.4)"; e.currentTarget.style.background = "rgba(79,142,247,0.06)"; }}
                                    onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
                                >
                                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                                        <span style={{ fontSize: 16 }}>{item.icon}</span>
                                        <div style={{ fontWeight: 700, fontSize: 12, color: "var(--text-1)" }}>
                                            {highlight(item.title, query)}
                                        </div>
                                        <span style={{ marginLeft: "auto", fontSize: 10, color: "var(--text-3)" }}>→</span>
                                    </div>
                                    <div style={{ fontSize: 11, color: "var(--text-3)", lineHeight: 1.5 }}>
                                        {highlight(item.summary.slice(0, 80) + (item.summary.length > 80 ? "..." : ""), query)}
                                    </div>
                                    {item.path !== "/help" && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); navigate(item.path); onClose(); }}
                                            style={{
                                                marginTop: 8, padding: "4px 10px", borderRadius: 6,
                                                background: "rgba(79,142,247,0.12)", border: "1px solid rgba(79,142,247,0.25)",
                                                color: "#4f8ef7", fontSize: 10, fontWeight: 700, cursor: "pointer",
                                            }}
                                        >
                                            {t('helpPanel.goToPage').replace('{{path}}', item.path)}
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 기본 콘텐츠 (Search 중이 아닐 때) */}
                {searchResults === null && (
                    <div style={{ padding: "16px 18px", flex: 1, display: "grid", gap: 16, alignContent: "start" }}>
                        {/* Summary */}
                        <div style={{
                            padding: "12px 14px", borderRadius: 10,
                            background: "rgba(79,142,247,0.06)",
                            border: "1px solid rgba(79,142,247,0.15)",
                            fontSize: 12, color: "var(--text-2)", lineHeight: 1.7,
                        }}>
                            💡 {help.summary}
                        </div>

                        {/* 데이터 수집 출처 */}
                        {help.dataFrom && help.dataFrom.length > 0 && (
                            <div>
                                <div style={{ fontSize: 11, fontWeight: 800, color: "var(--text-3)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.6px" }}>
                                    {t('helpPanel.dataFrom')}
                                </div>
                                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                                    {help.dataFrom.map((src, i) => (
                                        <span key={i} style={{
                                            padding: "3px 9px", borderRadius: 20, fontSize: 10, fontWeight: 600,
                                            background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.25)",
                                            color: "rgba(134,239,172,1)", lineHeight: 1.5,
                                        }}>{src}</span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* 제공 정보 */}
                        {help.provides && help.provides.length > 0 && (
                            <div>
                                <div style={{ fontSize: 11, fontWeight: 800, color: "var(--text-3)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.6px" }}>
                                    {t('helpPanel.provides')}
                                </div>
                                <div style={{ display: "grid", gap: 5 }}>
                                    {help.provides.map((prov, i) => (
                                        <div key={i} style={{
                                            padding: "7px 11px", borderRadius: 8, fontSize: 11,
                                            color: "var(--text-2)", lineHeight: 1.5,
                                            background: "rgba(168,85,247,0.06)",
                                            border: "1px solid rgba(168,85,247,0.15)",
                                        }}>▸ {prov}</div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Steps */}
                        {help.steps && help.steps.length > 0 && (
                            <div>
                                <div style={{ fontSize: 11, fontWeight: 800, color: "var(--text-3)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.6px" }}>
                                    {t('helpPanel.howToUse')}
                                </div>
                                <div style={{ display: "grid", gap: 8 }}>
                                    {help.steps.map((step, i) => (
                                        <div key={i} style={{
                                            display: "flex", gap: 10, alignItems: "flex-start",
                                            padding: "10px 12px", borderRadius: 9,
                                            background: "rgba(255,255,255,0.03)",
                                            border: "1px solid var(--border)",
                                        }}>
                                            <span style={{
                                                width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
                                                background: "linear-gradient(135deg, #4f8ef7, #a855f7)",
                                                display: "flex", alignItems: "center", justifyContent: "center",
                                                fontSize: 10, fontWeight: 900, color: "#fff",
                                            }}>{i + 1}</span>
                                            <span style={{ fontSize: 12, color: "var(--text-2)", lineHeight: 1.6 }}>{step}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Tips / 활용 방법 */}
                        {help.tips && help.tips.length > 0 && (
                            <div>
                                <div style={{ fontSize: 11, fontWeight: 800, color: "var(--text-3)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.6px" }}>
                                    {t('helpPanel.canDo')}
                                </div>
                                <div style={{ display: "grid", gap: 6 }}>
                                    {help.tips.map((tip, i) => (
                                        <div key={i} style={{
                                            padding: "8px 12px", borderRadius: 8,
                                            background: "rgba(234,179,8,0.06)",
                                            border: "1px solid rgba(234,179,8,0.15)",
                                            fontSize: 12, color: "var(--text-2)", lineHeight: 1.6,
                                        }}>
                                            → {tip}
                                        </div>
                                    ))}
                                </div>
            
                            </div>
                        )}

                        <div style={{
                            padding: "12px 14px", borderRadius: 10,
                            background: "rgba(168,85,247,0.06)",
                            border: "1px solid rgba(168,85,247,0.15)",
                            textAlign: "center",
                        }}>
                            <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 8 }}>{t('helpPanel.needMoreHelp')}</div>
                            <button onClick={(e) => { e.preventDefault(); navigate('/help'); onClose(); }} style={{
                                display: "inline-flex", alignItems: "center", gap: 6, border: "none", cursor: "pointer",
                                padding: "7px 16px", borderRadius: 8, textDecoration: "none",
                                background: "linear-gradient(135deg, #a855f7, #4f8ef7)",
                                color: "#fff", fontSize: 12, fontWeight: 700,
                            }}>
                                {t('helpPanel.fullManual')}
                            </button>
                        </div>
                    </div>
                )}

                {/* Footer */}
                <div style={{
                    padding: "10px 18px",
                    borderTop: "1px solid var(--border)",
                    fontSize: 10, color: "var(--text-3)",
                    flexShrink: 0,
                }}>
                    {t('helpPanel.footerHelp')}
                </div>
            </div>
        </>
    );
}
