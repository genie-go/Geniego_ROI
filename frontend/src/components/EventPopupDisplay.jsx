import React, { useState, useEffect } from "react";
import { sanitizeHtml } from '../utils/xssSanitizer.js';


/* ──────────────────────────────────────────────────────────────────────────
   EventPopupDisplay
   - 로그인 후 플랫폼 접속 시 서버에서 Active 팝업을 가져와 자동 표시
   - Today 보지 않기 / 1주일간 보지 않기 → cookie/localStorage Save
   - 여러 팝업이 있으면 순서대로 다음 팝업 표시
   ────────────────────────────────────────────────────────────────────────── */

const DISMISS_PREFIX = "genie_popup_dismiss_";

function isDismissed(popupId) {
    try {
        const val = localStorage.getItem(`${DISMISS_PREFIX}${popupId}`);
        if (!val) return false;
        return Date.now() < parseInt(val, 10);
    } catch { return false; }
}

function dismissPopup(popupId, daysCount) {
    try {
        const expiry = Date.now() + daysCount * 24 * 60 * 60 * 1000;
        localStorage.setItem(`${DISMISS_PREFIX}${popupId}`, expiry.toString());
    } catch { }
}

/* ── 단일 팝업 렌더러 ─────────────────────────────────────────────────── */
function PopupModal({ popup, onClose, onDismissToday, onDismissWeek }) {
    const [closing, setClosing] = useState(false);

    const handleClose = (fn) => {
        setClosing(true);
        setTimeout(() => { fn?.(); onClose(); }, 250);
    };

    return (
        <div style={{
            position: "fixed", inset: 0, zIndex: 99999,
            background: "rgba(0,0,0,0.72)", backdropFilter: "blur(6px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "16px",
            animation: "fadeIn 0.2s ease",
            opacity: closing ? 0 : 1, transition: "opacity 0.25s",
        }}>
            <div style={{
                width: "100%", maxWidth: popup.width || 520,
                borderRadius: 20,
                background: popup.bg_color || "linear-gradient(145deg,#0f1a2e,#1a233a)",
                border: `1px solid ${popup.border_color || "rgba(99,140,255,0.25)"}`,
                boxShadow: "0 32px 80px rgba(0,0,0,0.6)",
                overflow: "hidden",
                transform: closing ? "scale(0.96)" : "scale(1)",
                transition: "transform 0.25s",
            }}>
                {/* 이미지 헤더 */}
                {popup.image_url && (
                    <div style={{ width: "100%", maxHeight: 280, overflow: "hidden" }}>
                        <img src={popup.image_url} alt="팝업 이미지"
                            style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    </div>
                )}

                {/* 헤더 배지 */}
                {popup.badge_text && (
                    <div style={{
                        display: "flex", justifyContent: "center", padding: "16px 0 0",
                    }}>
                        <span style={{
                            padding: "4px 16px", borderRadius: 99,
                            background: popup.badge_color || "rgba(79,142,247,0.15)",
                            border: `1px solid ${popup.badge_color || "rgba(79,142,247,0.3)"}`,
                            color: "#4f8ef7", fontSize: 11, fontWeight: 800,
                        }}>{popup.badge_text}</span>
                    </div>
                )}

                {/* 본문 */}
                <div style={{ padding: "20px 28px 10px" }}>
                    {popup.title && (
                        <h2 style={{
                            fontSize: popup.title_size || 22, fontWeight: 900,
                            color: popup.title_color || "#e2e8f0",
                            margin: "0 0 12px", lineHeight: 1.3, textAlign: "center",
                        }}>{popup.title}</h2>
                    )}
                    {popup.body && (
                        <div style={{
                            fontSize: 14, color: popup.body_color || "rgba(255,255,255,0.7)",
                            lineHeight: 1.7, textAlign: "center",
                            whiteSpace: "pre-line",
                        }}
                            dangerouslySetInnerHTML={{ __html: sanitizeHtml(popup.body) }}
                        />
                    )}
                    {/* CTA 버튼 */}
                    {popup.cta_text && (
                        <div style={{ textAlign: "center", marginTop: 20 }}>
                            <a
                                href={popup.cta_url || "#"}
                                target={popup.cta_new_tab ? "_blank" : "_self"}
                                rel="noopener noreferrer"
                                onClick={() => handleClose(null)}
                                style={{
                                    display: "inline-block", padding: "12px 32px", borderRadius: 12,
                                    background: popup.cta_color || "linear-gradient(135deg,#4f8ef7,#6366f1)",
                                    color: 'var(--text-1)', fontWeight: 800, fontSize: 14,
                                    textDecoration: "none", transition: "opacity 150ms",
                                }}
                                onMouseOver={e => (e.target.style.opacity = "0.85")}
                                onMouseOut={e => (e.target.style.opacity = "1")}
                            >{popup.cta_text}</a>
                        </div>
                    )}
                </div>

                {/* 하단 dismiss 버튼 */}
                <div style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "14px 24px 18px",
                    borderTop: "1px solid rgba(255,255,255,0.05)", marginTop: 14,
                }}>
                    <div style={{ display: "flex", gap: 12 }}>
                        <button
                            onClick={() => handleClose(onDismissToday)}
                            style={{
                                background: "none", border: "none", cursor: "pointer",
                                fontSize: 12, color: "var(--text-3)", display: "flex", alignItems: "center", gap: 4,
                            }}
                        >
                            <input type="checkbox" readOnly checked style={{ width: 12, height: 12, accentColor: "#4f8ef7" }} />
                            Today 보지 않기
                        </button>
                        <button
                            onClick={() => handleClose(onDismissWeek)}
                            style={{
                                background: "none", border: "none", cursor: "pointer",
                                fontSize: 12, color: "var(--text-3)", display: "flex", alignItems: "center", gap: 4,
                            }}
                        >
                            <input type="checkbox" readOnly checked style={{ width: 12, height: 12, accentColor: "#4f8ef7" }} />
                            1주일간 보지 않기
                        </button>
                    </div>
                    <button
                        onClick={() => handleClose(null)}
                        style={{
                            width: 28, height: 28, borderRadius: "50%",
                            background: "rgba(255,255,255,0.08)", border: "none",
                            cursor: "pointer", fontSize: 14, color: 'var(--text-2)',
                            display: "flex", alignItems: "center", justifyContent: "center",
                        }}
                    >✕</button>
                </div>
            </div>

            <style>{`@keyframes fadeIn { from { opacity:0 } to { opacity:1 } }`}</style>
        </div>
    );
}

/* ── 메인 컴포넌트 ────────────────────────────────────────────────────── */
export default function EventPopupDisplay() {
    const [queue, setQueue] = useState([]);  // 보여줄 팝업 목록
    const [current, setCurrent] = useState(null); // 현재 표시 중 팝업

    /* 1. 서버에서 Active 팝업 목록 가져오기 */
    useEffect(() => {
        let mounted = true;
        const load = async () => {
            try {
                const token = localStorage.getItem("genie_token") || localStorage.getItem("genie_auth_token") || "";
                const r = await fetch("/api/v423/popups/active", {
                    headers: token ? { Authorization: `Bearer ${token}` } : {}
                });
                if (!r.ok) return;
                const d = await r.json();
                if (!mounted) return;
                const active = (d.popups || []).filter(p => !isDismissed(p.id));
                if (active.length > 0) {
                    setQueue(active);
                    setCurrent(active[0]);
                }
            } catch {
                /* 서버 없으면 무음 실패 */
            }
        };
        // 약간의 지연 후 표시 (페이지 로드 직후 어색함 방지)
        const timer = setTimeout(load, 1200);
        return () => { mounted = false; clearTimeout(timer); };
    }, []);

    if (!current) return null;

    const showNext = () => {
        const next = queue.slice(1);
        setQueue(next);
        setCurrent(next[0] || null);
    };

    const handleDismissToday = () => dismissPopup(current.id, 1);
    const handleDismissWeek = () => dismissPopup(current.id, 7);

    return (
        <PopupModal
            popup={current}
            onClose={showNext}
            onDismissToday={handleDismissToday}
            onDismissWeek={handleDismissWeek}
        />
    );
}
