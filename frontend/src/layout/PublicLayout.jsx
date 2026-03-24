import React from "react";
import { Link, useLocation } from "react-router-dom";

const NAV = [
    { to: "/", label: "Home" },
    { to: "/pricing", label: "Pricing" },
    { to: "/terms", label: "Terms" },
    { to: "/privacy", label: "Privacy" },
    { to: "/refund", label: "Refund Policy" },
];

export default function PublicLayout({ children }) {
    const { pathname } = useLocation();

    return (
        <div style={{ minHeight: "100vh", background: "#0a0c14", color: "#e8eaf6", fontFamily: "'Inter','Segoe UI',sans-serif" }}>
            {/* Header */}
            <header style={{ borderBottom: "1px solid rgba(255,255,255,0.07)", background: "rgba(10,12,20,0.95)", position: "sticky", top: 0, zIndex: 100, backdropFilter: "blur(10px)" }}>
                <div style={{ maxWidth: 1140, margin: "0 auto", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 60 }}>
                    {/* Logo */}
                    <Link to="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 10, background: "linear-gradient(135deg,#4f8ef7,#6366f1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 900, color: "#fff" }}>⧡</div>
                        <div>
                            <div style={{ fontWeight: 800, fontSize: 14, color: "#fff" }}>Geniego-ROI</div>
                            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", lineHeight: 1 }}>Revenue Intelligence Platform</div>
                        </div>
                    </Link>
                    {/* Nav */}
                    <nav style={{ display: "flex", gap: 4, alignItems: "center" }}>
                        {NAV.map(n => (
                            <Link key={n.to} to={n.to} style={{ padding: "5px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, textDecoration: "none", color: pathname === n.to ? "#4f8ef7" : "rgba(255,255,255,0.6)", background: pathname === n.to ? "rgba(79,142,247,0.1)" : "transparent", transition: "all 150ms" }}>
                                {n.label}
                            </Link>
                        ))}
                        <Link to="/login" style={{ marginLeft: 8, padding: "6px 18px", borderRadius: 9, fontSize: 12, fontWeight: 700, textDecoration: "none", background: "linear-gradient(135deg,#4f8ef7,#6366f1)", color: "#fff" }}>
                            Login →
                        </Link>
                    </nav>
                </div>
            </header>

            {/* Content */}
            <main>{children}</main>

            {/* Footer */}
            <footer style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "32px 24px", marginTop: 60 }}>
                <div style={{ maxWidth: 1140, margin: "0 auto" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 32, marginBottom: 32 }}>
                        <div>
                            <div style={{ fontWeight: 800, fontSize: 14, color: "#fff", marginBottom: 8 }}>⧡ Geniego-ROI</div>
                            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", lineHeight: 1.8 }}>
                                Unified Revenue Intelligence<br />for Global Commerce Teams
                            </div>
                        </div>
                        <div>
                            <div style={{ fontWeight: 700, fontSize: 11, color: "rgba(255,255,255,0.6)", marginBottom: 10, textTransform: "uppercase", letterSpacing: 1 }}>Product</div>
                            {[["Home", "/"], ["Pricing", "/pricing"]].map(([l, t]) => (
                                <div key={t}><Link to={t} style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", textDecoration: "none", lineHeight: 2 }}>{l}</Link></div>
                            ))}
                        </div>
                        <div>
                            <div style={{ fontWeight: 700, fontSize: 11, color: "rgba(255,255,255,0.6)", marginBottom: 10, textTransform: "uppercase", letterSpacing: 1 }}>Legal</div>
                            {[["Terms of Service", "/terms"], ["Privacy Policy", "/privacy"], ["Refund Policy", "/refund"]].map(([l, t]) => (
                                <div key={t}><Link to={t} style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", textDecoration: "none", lineHeight: 2 }}>{l}</Link></div>
                            ))}
                        </div>
                        <div>
                            <div style={{ fontWeight: 700, fontSize: 11, color: "rgba(255,255,255,0.6)", marginBottom: 10, textTransform: "uppercase", letterSpacing: 1 }}>Contact</div>
                            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", lineHeight: 2 }}>
                                support@genie-go.com<br />
                                Seoul, Republic of Korea
                            </div>
                        </div>
                    </div>
                    <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>© 2025–2026 Geniego Co., Ltd. All rights reserved.</div>
                        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>Payments processed by Paddle.com</div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
