import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PremiumLayout, { LogoOrbit } from "../../layout/PremiumLayout.jsx";
import { st, siteLang } from "./siteI18n.js";

/* 187차 — 회사소개·연혁 (프리미엄 라이트). chrome 15개국, 콘텐츠는 admin 한글 입력분. */
export default function CompanyIntro() {
    const [lang, setLang] = useState(siteLang());
    const [data, setData] = useState(null);
    useEffect(() => {
        const onL = (e) => { if (e?.detail?.lang) setLang(e.detail.lang); };
        window.addEventListener("genie-lang-change", onL);
        return () => window.removeEventListener("genie-lang-change", onL);
    }, []);
    useEffect(() => {
        const base = import.meta.env.VITE_API_BASE || "";
        fetch(`${base}/auth/site/intro`).then(r => r.json()).then(d => { if (d?.ok) setData(d); }).catch(() => {});
    }, []);

    const c = data?.company || {};
    const history = data?.history || [];
    const wrap = { maxWidth: 980, margin: "0 auto" };
    const facts = [
        c.founded && { label: st("founded", lang), value: c.founded },
        c.ceo && { label: st("ceo", lang), value: c.ceo },
        c.address && { label: st("address", lang), value: c.address },
        c.email && { label: st("contact", lang), value: c.email },
    ].filter(Boolean);

    return (
        <PremiumLayout>
            {/* hero */}
            <section style={{ padding: "60px 24px 50px", textAlign: "center", background: "linear-gradient(180deg,#f8faff,#ffffff)", position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: -100, left: "50%", transform: "translateX(-50%)", width: 880, height: 420, background: "radial-gradient(ellipse, rgba(79,70,229,0.08) 0%, transparent 70%)", pointerEvents: "none" }} />
                <div style={{ ...wrap, position: "relative" }} className="gl-up">
                    <div style={{ marginBottom: 26 }}><LogoOrbit size={172} /></div>
                    <div style={{ display: "inline-block", padding: "6px 16px", borderRadius: 99, background: "rgba(79,70,229,0.10)", color: "#4f46e5", fontSize: 12, fontWeight: 800, letterSpacing: 0.6, textTransform: "uppercase", marginBottom: 16 }}>{st("aboutTitle", lang)}</div>
                    <h1 style={{ fontSize: "clamp(30px,4.5vw,46px)", fontWeight: 900, color: "#0f172a", letterSpacing: -1.4, margin: "0 0 14px" }}>{c.name || "GeniegoROI"}</h1>
                    <p style={{ fontSize: 18, fontWeight: 700, marginBottom: 20, background: "linear-gradient(90deg,#4f46e5,#7c3aed)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", display: "inline-block" }}>{c.tagline}</p>
                    {c.summary && <p style={{ fontSize: 16, color: "#475569", maxWidth: 720, margin: "0 auto", lineHeight: 1.9 }}>{c.summary}</p>}
                </div>
            </section>

            {(c.description || c.vision || c.mission) && (
                <section style={{ padding: "20px 24px 56px" }}>
                    <div style={{ maxWidth: 860, margin: "0 auto" }}>
                        {c.description && <p style={{ fontSize: 16, color: "#334155", lineHeight: 2.05, whiteSpace: "pre-line", marginBottom: 36 }}>{c.description}</p>}
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 18 }}>
                            {c.vision && (
                                <div className="gl-card" style={{ padding: "28px 26px", borderRadius: 20, background: "#fff", border: "1px solid #eef2f7", boxShadow: "0 10px 30px rgba(15,23,42,0.05)" }}>
                                    <div style={{ fontSize: 12, fontWeight: 800, color: "#06b6d4", letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 }}>🌐 {st("vision", lang)}</div>
                                    <div style={{ fontSize: 15, color: "#1e293b", lineHeight: 1.8, whiteSpace: "pre-line" }}>{c.vision}</div>
                                </div>
                            )}
                            {c.mission && (
                                <div className="gl-card" style={{ padding: "28px 26px", borderRadius: 20, background: "#fff", border: "1px solid #eef2f7", boxShadow: "0 10px 30px rgba(15,23,42,0.05)" }}>
                                    <div style={{ fontSize: 12, fontWeight: 800, color: "#7c3aed", letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 }}>🎯 {st("mission", lang)}</div>
                                    <div style={{ fontSize: 15, color: "#1e293b", lineHeight: 1.8, whiteSpace: "pre-line" }}>{c.mission}</div>
                                </div>
                            )}
                        </div>
                    </div>
                </section>
            )}

            {facts.length > 0 && (
                <section style={{ padding: "0 24px 50px" }}>
                    <div style={{ maxWidth: 860, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 14 }}>
                        {facts.map(f => (
                            <div key={f.label} style={{ padding: "18px 20px", borderRadius: 16, background: "#f8fafc", border: "1px solid #eef2f7" }}>
                                <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 800, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>{f.label}</div>
                                <div style={{ fontSize: 14.5, color: "#0f172a", fontWeight: 700 }}>{f.value}</div>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {data?.visibility?.history && (
                <section style={{ padding: "56px 24px 90px", background: "#f8fafc", borderTop: "1px solid #eef2f7" }}>
                    <div style={{ maxWidth: 760, margin: "0 auto" }}>
                        <h2 style={{ fontSize: 30, fontWeight: 900, color: "#0f172a", textAlign: "center", letterSpacing: -0.6, marginBottom: 46 }}>{st("historyTitle", lang)}</h2>
                        {history.length === 0 ? (
                            <p style={{ textAlign: "center", color: "#94a3b8", fontSize: 14 }}>{st("empty", lang)}</p>
                        ) : (
                            <div style={{ position: "relative", paddingLeft: 30 }}>
                                <div style={{ position: "absolute", left: 7, top: 6, bottom: 6, width: 2, background: "linear-gradient(180deg,#4f46e5,#7c3aed,#06b6d4)" }} />
                                {history.map(h => (
                                    <div key={h.id} style={{ position: "relative", marginBottom: 26 }}>
                                        <div style={{ position: "absolute", left: -30, top: 4, width: 16, height: 16, borderRadius: "50%", background: "linear-gradient(135deg,#4f46e5,#7c3aed)", border: "3px solid #fff", boxShadow: "0 0 0 2px rgba(79,70,229,0.3)" }} />
                                        <div style={{ fontSize: 13, fontWeight: 800, color: "#4f46e5", marginBottom: 4 }}>{h.ymd}</div>
                                        <div style={{ fontSize: 16.5, fontWeight: 800, color: "#0f172a", marginBottom: 4 }}>{h.title}</div>
                                        {h.description && <div style={{ fontSize: 14, color: "#475569", lineHeight: 1.8, whiteSpace: "pre-line" }}>{h.description}</div>}
                                    </div>
                                ))}
                            </div>
                        )}
                        <div style={{ textAlign: "center", marginTop: 46 }}>
                            <Link to="/" style={{ padding: "12px 30px", borderRadius: 12, background: "#fff", border: "1.5px solid #e2e8f0", color: "#1e293b", fontWeight: 800, fontSize: 14, textDecoration: "none", boxShadow: "0 6px 18px rgba(15,23,42,0.05)" }}>{st("backHome", lang)}</Link>
                        </div>
                    </div>
                </section>
            )}
        </PremiumLayout>
    );
}
