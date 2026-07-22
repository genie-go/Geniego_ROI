import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PremiumLayout, { LogoOrbit } from "../../layout/PremiumLayout.jsx";
import { st, siteLang } from "./siteI18n.js";

/* 187차 — 운영진 소개 (프리미엄 라이트). chrome 15개국, 콘텐츠는 admin 한글 입력분. */
const PALETTE = ["#4f46e5", "#7c3aed", "#06b6d4", "#0ea5e9", "#10b981", "#f59e0b", "#ec4899", "#6366f1"];

export default function TeamIntro() {
    const [lang, setLang] = useState(siteLang());
    const [team, setTeam] = useState([]);
    const [loaded, setLoaded] = useState(false);
    useEffect(() => {
        const onL = (e) => { if (e?.detail?.lang) setLang(e.detail.lang); };
        window.addEventListener("genie-lang-change", onL);
        return () => window.removeEventListener("genie-lang-change", onL);
    }, []);
    useEffect(() => {
        const base = import.meta.env.VITE_API_BASE || "";
        fetch(`${base}/auth/site/intro`).then(r => r.json()).then(d => { if (d?.ok) setTeam(d.team || []); }).catch(() => {}).finally(() => setLoaded(true));
    }, []);
    const initials = (n) => (n || "?").trim().split(/\s+/).map(w => w[0]).join("").slice(0, 2).toUpperCase();

    return (
        <PremiumLayout>
            <section style={{ padding: "56px 24px 40px", textAlign: "center", background: "linear-gradient(180deg,#f8faff,#ffffff)", position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: -100, left: "50%", transform: "translateX(-50%)", width: 860, height: 400, background: "radial-gradient(ellipse, rgba(124,58,237,0.08) 0%, transparent 70%)", pointerEvents: "none" }} />
                <div style={{ maxWidth: 900, margin: "0 auto", position: "relative" }} className="gl-up">
                    <div style={{ marginBottom: 24 }}><LogoOrbit size={158} /></div>
                    <div style={{ display: "inline-block", padding: "6px 16px", borderRadius: 99, background: "rgba(124,58,237,0.10)", color: "#7c3aed", fontSize: 12, fontWeight: 700, letterSpacing: 0.6, textTransform: "uppercase", marginBottom: 16 }}>{st("navTeam", lang)}</div>
                    <h1 style={{ fontSize: "clamp(28px,4.2vw,42px)", fontWeight: 900, color: "#0f172a", letterSpacing: -1.2, margin: "0 0 12px" }}>{st("teamTitle", lang)}</h1>
                    <p style={{ fontSize: 16, color: "#64748b" }}>{st("teamSub", lang)}</p>
                </div>
            </section>

            <section style={{ padding: "20px 24px 90px" }}>
                <div style={{ maxWidth: 1080, margin: "0 auto" }}>
                    {loaded && team.length === 0 ? (
                        <p style={{ textAlign: "center", color: "#94a3b8", fontSize: 14, padding: "50px 0" }}>{st("empty", lang)}</p>
                    ) : (
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 18 }}>
                            {team.map((m, i) => {
                                const color = PALETTE[i % PALETTE.length];
                                return (
                                    <div key={m.id} className="gl-card" style={{ padding: "34px 24px", borderRadius: 22, background: "#fff", border: "1px solid #eef2f7", textAlign: "center", boxShadow: "0 10px 30px rgba(15,23,42,0.05)" }}>
                                        {m.photo_url
                                            ? <img src={m.photo_url} alt={m.name} style={{ width: 92, height: 92, borderRadius: "50%", objectFit: "cover", margin: "0 auto 16px", display: "block", border: `3px solid ${color}33` }} />
                                            : <div style={{ width: 92, height: 92, borderRadius: "50%", margin: "0 auto 16px", background: `linear-gradient(135deg,${color},${color}aa)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30, fontWeight: 800, color: "#fff", boxShadow: `0 10px 28px ${color}44` }}>{initials(m.name)}</div>}
                                        <div style={{ fontSize: 18, fontWeight: 900, color: "#0f172a", marginBottom: 4 }}>{m.name}</div>
                                        <div style={{ fontSize: 13, fontWeight: 800, color, marginBottom: 12 }}>{m.title}</div>
                                        {m.bio && <div style={{ fontSize: 13, color: "#475569", lineHeight: 1.8, whiteSpace: "pre-line" }}>{m.bio}</div>}
                                        {(m.email || m.linkedin) && (
                                            <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 14 }}>
                                                {m.email && <a href={`mailto:${m.email}`} style={{ fontSize: 13, color: "#94a3b8", textDecoration: "none" }}>✉️</a>}
                                                {m.linkedin && <a href={m.linkedin} target="_blank" rel="noreferrer" style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", textDecoration: "none" }}>in</a>}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                    <div style={{ textAlign: "center", marginTop: 46 }}>
                        <Link to="/" style={{ padding: "12px 30px", borderRadius: 12, background: "#fff", border: "1.5px solid #e2e8f0", color: "#1e293b", fontWeight: 800, fontSize: 14, textDecoration: "none", boxShadow: "0 6px 18px rgba(15,23,42,0.05)" }}>{st("backHome", lang)}</Link>
                    </div>
                </div>
            </section>
        </PremiumLayout>
    );
}
