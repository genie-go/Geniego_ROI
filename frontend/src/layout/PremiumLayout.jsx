import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { LANG_OPTIONS } from "../i18n/index.js";
import { st, siteLang } from "../pages/public/siteI18n.js";

/* 187차 — 공유 프리미엄 라이트 레이아웃 (랜딩과 동일 톤). Pretendard 고급 타이포 + 로고 애니메이션. */

const FONT_STACK = "'Pretendard','Inter','Apple SD Gothic Neo','Segoe UI',system-ui,sans-serif";

export function PremiumStyles() {
    return (
        <style>{`
            @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css');
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
            @keyframes glFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }
            @keyframes glSpin { to { transform: rotate(360deg) } }
            @keyframes glSpinR { to { transform: rotate(-360deg) } }
            @keyframes glPulse { 0%,100%{opacity:.55; transform:scale(1)} 50%{opacity:.9; transform:scale(1.08)} }
            @keyframes glOrbit { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
            @keyframes glBob { 0%,100%{transform:scale(1)} 50%{transform:scale(1.14)} }
            @keyframes glDash { to { stroke-dashoffset: -28; } }
            @keyframes glUp { from{opacity:0;transform:translateY(22px)} to{opacity:1;transform:translateY(0)} }
            .gl-up { animation: glUp .6s cubic-bezier(.2,.7,.2,1) forwards; }
            .gl-card { transition: transform .28s cubic-bezier(.2,.7,.2,1), box-shadow .28s, border-color .28s; }
            .gl-card:hover { transform: translateY(-6px); box-shadow: 0 24px 60px rgba(15,23,42,0.12) !important; }
            @media (max-width:860px){ .gl-nav,.gl-loginbtn,.gl-langlabel{ display:none !important; } }
        `}</style>
    );
}

/* GeniegoROI 동적 플랫폼 애니메이션 — 마케팅·커머스·물류·데이터·정산·AI가 로고를 중심으로
   공전(궤도)하며 실시간 데이터가 흐르는 모션. "플랫폼이 실제로 일하고 있는" 느낌. */
export function LogoOrbit({ size = 200 }) {
    const ICONS = [
        { e: "📣", c: "#ef4444" }, // 마케팅
        { e: "🛒", c: "#4f46e5" }, // 커머스
        { e: "🚚", c: "#10b981" }, // 물류
        { e: "📊", c: "#06b6d4" }, // 데이터 분석
        { e: "💳", c: "#f59e0b" }, // 정산
        { e: "🤖", c: "#7c3aed" }, // AI 자동화
    ];
    const cx = size / 2;
    const R = size * 0.43, CHIP = Math.round(size * 0.2), PR = size * 0.3;
    const pos = (i, n, r, off) => { const a = (i / n) * 2 * Math.PI + (off || 0); return { x: cx + Math.cos(a) * r, y: cx + Math.sin(a) * r }; };
    const pcol = ["#06b6d4", "#4f46e5", "#7c3aed", "#10b981", "#f59e0b"];
    return (
        <div style={{ width: size, height: size, position: "relative", margin: "0 auto", animation: "glFloat 6s ease-in-out infinite" }}>
            {/* glow */}
            <div style={{ position: "absolute", inset: size * 0.13, borderRadius: "50%", background: "radial-gradient(circle, rgba(124,58,237,0.26), transparent 70%)", animation: "glPulse 3.6s ease-in-out infinite" }} />
            {/* conic gradient ring */}
            <div style={{ position: "absolute", inset: size * 0.06, borderRadius: "50%", background: "conic-gradient(from 0deg,#4f46e5,#7c3aed,#06b6d4,#10b981,#f59e0b,#4f46e5)", opacity: 0.5,
                WebkitMask: "radial-gradient(farthest-side, transparent calc(100% - 2px), #000 calc(100% - 2px))", mask: "radial-gradient(farthest-side, transparent calc(100% - 2px), #000 calc(100% - 2px))", animation: "glSpin 13s linear infinite" }} />
            {/* dashed data ring (reverse) */}
            <div style={{ position: "absolute", inset: size * 0.17, borderRadius: "50%", border: "1.5px dashed rgba(79,70,229,0.22)", animation: "glSpinR 24s linear infinite" }} />
            {/* fast data particles (데이터 흐름) */}
            <div style={{ position: "absolute", inset: 0, animation: "glSpin 8s linear infinite" }}>
                {[0, 1, 2, 3, 4].map(i => { const p = pos(i, 5, PR); return <div key={i} style={{ position: "absolute", left: p.x - 3.5, top: p.y - 3.5, width: 7, height: 7, borderRadius: "50%", background: pcol[i], boxShadow: "0 0 10px " + pcol[i] }} />; })}
            </div>
            {/* 활동 아이콘 공전 (마케팅·커머스·물류·데이터·정산·AI) */}
            <div style={{ position: "absolute", inset: 0, animation: "glSpin 30s linear infinite" }}>
                {ICONS.map((ic, i) => { const p = pos(i, ICONS.length, R, -Math.PI / 2); return (
                    <div key={i} style={{ position: "absolute", left: p.x - CHIP / 2, top: p.y - CHIP / 2, width: CHIP, height: CHIP, animation: "glSpinR 30s linear infinite" }}>
                        <div style={{ width: "100%", height: "100%", borderRadius: "50%", background: "#fff", border: "2px solid " + ic.c + "33", boxShadow: "0 6px 18px " + ic.c + "3a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: CHIP * 0.5, animation: "glBob 2.8s ease-in-out " + (i * 0.4) + "s infinite" }}>{ic.e}</div>
                    </div>
                ); })}
            </div>
            {/* 중앙 로고 */}
            <div style={{ position: "absolute", inset: size * 0.31, borderRadius: size * 0.15, background: "#fff", boxShadow: "0 14px 42px rgba(79,70,229,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <img src="/logo_v5.png" alt="GeniegoROI" style={{ width: "64%", height: "64%", objectFit: "contain", borderRadius: size * 0.1 }} />
            </div>
        </div>
    );
}

function PremiumHeader({ lang, setLang }) {
    const [scrolled, setScrolled] = useState(false);
    const [langOpen, setLangOpen] = useState(false);
    const [vis, setVis] = useState({ about: false, team: false });
    const lref = useRef(null);
    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener("scroll", onScroll, { passive: true });
        const onClick = (e) => { if (lref.current && !lref.current.contains(e.target)) setLangOpen(false); };
        document.addEventListener("mousedown", onClick);
        const base = import.meta.env.VITE_API_BASE || "";
        fetch(base + "/auth/site/intro").then(r => r.json()).then(d => { if (d?.visibility) setVis(d.visibility); }).catch(() => {});
        return () => { window.removeEventListener("scroll", onScroll); document.removeEventListener("mousedown", onClick); };
    }, []);
    const cur = LANG_OPTIONS.find(l => l.code === lang) || LANG_OPTIONS[1];
    const navLink = { fontSize: 14, fontWeight: 600, color: "#334155", textDecoration: "none", padding: "8px 12px", borderRadius: 8, transition: "all 150ms" };
    const hov = (e, on) => e.currentTarget.style.background = on ? "#f1f5f9" : "transparent";
    return (
        <header style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 1000, transition: "all 300ms",
            background: scrolled ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.62)", backdropFilter: "blur(18px) saturate(160%)",
            borderBottom: scrolled ? "1px solid #eef2f7" : "1px solid transparent", boxShadow: scrolled ? "0 4px 24px rgba(15,23,42,0.05)" : "none" }}>
            <div style={{ maxWidth: 1220, margin: "0 auto", padding: "0 24px", height: 66, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
                <Link to="/" style={{ display: "flex", alignItems: "center", gap: 11, textDecoration: "none" }}>
                    <img src="/logo_v5.png" alt="Geniego-ROI" style={{ width: 34, height: 34, borderRadius: 9, objectFit: "cover", boxShadow: "0 4px 14px rgba(79,70,229,0.25)" }} />
                    <span style={{ fontWeight: 900, fontSize: 17, color: "#0f172a", letterSpacing: -0.4 }}>Geniego<span style={{ color: "#4f46e5" }}>ROI</span></span>
                </Link>
                <nav style={{ display: "flex", alignItems: "center", gap: 2 }} className="gl-nav">
                    {vis.about && <Link to="/about" style={navLink} onMouseEnter={e => hov(e, 1)} onMouseLeave={e => hov(e, 0)}>{st("navAbout", lang)}</Link>}
                    {vis.team && <Link to="/team" style={navLink} onMouseEnter={e => hov(e, 1)} onMouseLeave={e => hov(e, 0)}>{st("navTeam", lang)}</Link>}
                    <Link to="/pricing" style={navLink} onMouseEnter={e => hov(e, 1)} onMouseLeave={e => hov(e, 0)}>Pricing</Link>
                </nav>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div ref={lref} style={{ position: "relative" }}>
                        <button onClick={() => setLangOpen(o => !o)} style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 11px", borderRadius: 9, background: "#fff", border: "1px solid #e2e8f0", color: "#334155", cursor: "pointer", fontSize: 12.5, fontWeight: 600 }}>
                            <span style={{ fontSize: 15 }}>{cur.flag}</span><span className="gl-langlabel">{cur.label}</span><span style={{ fontSize: 9, opacity: .5 }}>▼</span>
                        </button>
                        {langOpen && <div style={{ position: "absolute", top: "100%", right: 0, marginTop: 6, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 6, minWidth: 168, maxHeight: 360, overflowY: "auto", boxShadow: "0 16px 48px rgba(15,23,42,0.16)" }}>
                            {LANG_OPTIONS.map(l => (
                                <button key={l.code} onClick={() => { setLang(l.code); setLangOpen(false); localStorage.setItem("landing_lang", l.code); localStorage.setItem("genie_roi_lang", l.code); try { window.dispatchEvent(new CustomEvent("genie-lang-change", { detail: { lang: l.code } })); } catch {} }}
                                    style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "8px 12px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, background: lang === l.code ? "#eef2ff" : "transparent", color: lang === l.code ? "#4f46e5" : "#334155" }}>
                                    <span style={{ fontSize: 15 }}>{l.flag}</span><span>{l.label}</span>
                                </button>
                            ))}
                        </div>}
                    </div>
                    <Link to="/login" style={{ ...navLink, color: "#475569" }} className="gl-loginbtn">Log in</Link>
                    <Link to="/login?tab=register" style={{ padding: "9px 20px", borderRadius: 10, background: "linear-gradient(135deg,#4f46e5,#7c3aed)", color: "#fff", fontWeight: 800, fontSize: 13.5, textDecoration: "none", boxShadow: "0 6px 20px rgba(79,70,229,0.32)", whiteSpace: "nowrap" }}>Start free</Link>
                </div>
            </div>
        </header>
    );
}

export default function PremiumLayout({ children }) {
    const [lang, setLang] = useState(siteLang());
    useEffect(() => {
        const onL = (e) => { if (e?.detail?.lang) setLang(e.detail.lang); };
        window.addEventListener("genie-lang-change", onL);
        return () => window.removeEventListener("genie-lang-change", onL);
    }, []);
    return (
        <div style={{ minHeight: "100vh", background: "#ffffff", color: "#0f172a", fontFamily: FONT_STACK }}>
            <PremiumStyles />
            <PremiumHeader lang={lang} setLang={setLang} />
            <main style={{ paddingTop: 66 }}>{children}</main>
            <footer style={{ borderTop: "1px solid #eef2f7", background: "#fafbfc" }}>
                <div style={{ maxWidth: 1180, margin: "0 auto", padding: "44px 24px 30px", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 16, alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <img src="/logo_v5.png" alt="Geniego-ROI" style={{ width: 28, height: 28, borderRadius: 8, objectFit: "cover" }} />
                        <span style={{ fontWeight: 900, fontSize: 15, color: "#0f172a" }}>Geniego<span style={{ color: "#4f46e5" }}>ROI</span></span>
                    </div>
                    <div style={{ display: "flex", gap: 18, fontSize: 13, color: "#64748b", flexWrap: "wrap" }}>
                        <Link to="/pricing" style={{ color: "#64748b", textDecoration: "none" }}>Pricing</Link>
                        <Link to="/terms" style={{ color: "#64748b", textDecoration: "none" }}>Terms</Link>
                        <Link to="/privacy" style={{ color: "#64748b", textDecoration: "none" }}>Privacy</Link>
                        <Link to="/refund" style={{ color: "#64748b", textDecoration: "none" }}>Refund</Link>
                    </div>
                    <div style={{ fontSize: 12, color: "#94a3b8" }}>© 2024–2026 OCIELL Co., Ltd.</div>
                </div>
            </footer>
        </div>
    );
}
