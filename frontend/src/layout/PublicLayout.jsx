import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";

const NAV = [
    { to: "/", label: "Home" },
    { to: "/pricing", label: "Pricing" },
    { to: "/terms", label: "Terms" },
    { to: "/privacy", label: "Privacy" },
    { to: "/refund", label: "Refund" },
];

export default function PublicLayout({ children }) {
    const { pathname } = useLocation();
    const [scrolled, setScrolled] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 30);
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    return (
        <div style={{ minHeight: "100vh", background: "#050810", color: "#e2e8f8", fontFamily: "'Inter','Segoe UI',system-ui,sans-serif" }}>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
                @keyframes pub-float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
                @keyframes pub-glow { 0%,100% { opacity: 0.4; } 50% { opacity: 0.8; } }
                @keyframes pub-gradient { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
                @keyframes pub-fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
                .pub-fadeUp { animation: pub-fadeUp 0.6s ease-out forwards; }
                .pub-btn-primary { padding: 10px 28px; border-radius: 10px; border: none; cursor: pointer; font-weight: 800; font-size: 13px; text-decoration: none; background: linear-gradient(135deg,#4f8ef7,#7c3aed); color: #fff; box-shadow: 0 0 30px rgba(79,142,247,0.3); transition: all 250ms; display: inline-block; }
                .pub-btn-primary:hover { box-shadow: 0 0 50px rgba(79,142,247,0.5); transform: translateY(-1px); }
                .pub-btn-outline { padding: 10px 28px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.15); cursor: pointer; font-weight: 700; font-size: 13px; text-decoration: none; background: transparent; color: rgba(255,255,255,0.8); transition: all 250ms; display: inline-block; }
                .pub-btn-outline:hover { border-color: rgba(79,142,247,0.5); color: #fff; background: rgba(79,142,247,0.08); }
                .pub-nav-link { padding: 6px 16px; border-radius: 8px; font-size: 13px; font-weight: 600; text-decoration: none; transition: all 200ms; }
                .pub-nav-link:hover { background: rgba(79,142,247,0.1); color: #4f8ef7 !important; }
                .pub-section { max-width: 1200px; margin: 0 auto; padding: 0 28px; }
            `}</style>

            {/* ?? Ambient background orbs ?? */}
            <div style={{ position: "fixed", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 0 }}>
                <div style={{ position: "absolute", top: "-20%", left: "-10%", width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle, rgba(79,142,247,0.08) 0%, transparent 70%)", animation: "pub-glow 8s ease-in-out infinite" }} />
                <div style={{ position: "absolute", bottom: "-15%", right: "-5%", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(124,58,237,0.06) 0%, transparent 70%)", animation: "pub-glow 10s ease-in-out infinite 2s" }} />
            </div>

            {/* ?? Header ?? */}
            <header style={{
                position: "fixed", top: 0, left: 0, right: 0, zIndex: 1000,
                background: scrolled ? "rgba(5,8,16,0.85)" : "transparent",
                backdropFilter: scrolled ? "blur(20px) saturate(180%)" : "none",
                borderBottom: scrolled ? "1px solid rgba(255,255,255,0.06)" : "1px solid transparent",
                transition: "all 400ms cubic-bezier(0.4,0,0.2,1)",
            }}>
                <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 28px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 68 }}>
                    <Link to="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 12 }}>
                        <img src="/logo_v5.png" alt="Geniego-ROI" style={{ width: 36, height: 36, borderRadius: 10, objectFit: "cover", boxShadow: "0 0 20px rgba(79,142,247,0.3)" }} />
                        <div>
                            <div style={{ fontWeight: 900, fontSize: 15, color: 'var(--text-1)', letterSpacing: -0.3 }}>Geniego-ROI</div>
                            <div style={{ fontSize: 9, color: "var(--text-3)", letterSpacing: 1.5, textTransform: "uppercase" }}>Revenue Intelligence</div>
                        </div>
                    </Link>
                    <nav style={{ display: "flex", gap: 2, alignItems: "center" }}>
                        {NAV.map(n => (
                            <Link key={n.to} to={n.to} className="pub-nav-link" style={{ color: pathname === n.to ? "#4f8ef7" : "rgba(255,255,255,0.6)", background: pathname === n.to ? "rgba(79,142,247,0.1)" : "transparent" }}>
                                {n.label}
                            </Link>
                        ))}
                        <Link to="/login" className="pub-btn-primary" style={{ marginLeft: 12, fontSize: 12, padding: "8px 22px" }}>
                            Get Started ??                        </Link>
                    </nav>
                </div>
            </header>

            {/* Content */}
            <main style={{ position: "relative", zIndex: 1, paddingTop: 68 }}>{children}</main>

            {/* ?? Footer ?? */}
            <footer style={{ position: "relative", zIndex: 1, borderTop: "1px solid rgba(255,255,255,0.06)", marginTop: 80 }}>
                <div style={{ maxWidth: 1200, margin: "0 auto", padding: "48px 28px 32px" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr 1fr", gap: 40, marginBottom: 40 }}>
                        <div>
                            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                                <img src="/logo_v5.png" alt="Geniego-ROI" style={{ width: 28, height: 28, borderRadius: 8, objectFit: "cover" }} />
                                <span style={{ fontWeight: 800, fontSize: 14, color: 'var(--text-1)' }}>Geniego-ROI</span>
                            </div>
                            <div style={{ fontSize: 12, color: "var(--text-3)", lineHeight: 1.9, maxWidth: 260 }}>
                                Unified Revenue Intelligence Platform for global commerce teams. Connect all your channels, analyze performance, and grow with confidence.
                            </div>
                        </div>
                        <div>
                            <div style={{ fontWeight: 700, fontSize: 11, color: 'var(--text-3)', marginBottom: 16, textTransform: "uppercase", letterSpacing: 1.5 }}>Product</div>
                            {[["Features", "/"], ["Pricing", "/pricing"], ["Integrations", "/"], ["Documentation", "/developer-hub"]].map(([l, to]) => (
                                <div key={l}><Link to={to} style={{ fontSize: 12, color: "var(--text-3)", textDecoration: "none", lineHeight: 2.2, transition: "color 150ms" }} onMouseEnter={e => e.target.style.color = "#4f8ef7"} onMouseLeave={e => e.target.style.color = "rgba(255,255,255,0.45)"}>{l}</Link></div>
                            ))}
                        </div>
                        <div>
                            <div style={{ fontWeight: 700, fontSize: 11, color: 'var(--text-3)', marginBottom: 16, textTransform: "uppercase", letterSpacing: 1.5 }}>Legal</div>
                            {[["Terms of Service", "/terms"], ["Privacy Policy", "/privacy"], ["Refund Policy", "/refund"]].map(([l, to]) => (
                                <div key={to}><Link to={to} style={{ fontSize: 12, color: "var(--text-3)", textDecoration: "none", lineHeight: 2.2, transition: "color 150ms" }} onMouseEnter={e => e.target.style.color = "#4f8ef7"} onMouseLeave={e => e.target.style.color = "rgba(255,255,255,0.45)"}>{l}</Link></div>
                            ))}
                        </div>
                        <div>
                            <div style={{ fontWeight: 700, fontSize: 11, color: 'var(--text-3)', marginBottom: 16, textTransform: "uppercase", letterSpacing: 1.5 }}>Contact</div>
                            <div style={{ fontSize: 12, color: "var(--text-3)", lineHeight: 2.2 }}>
                                support@genie-go.com<br />
                                Seoul, Republic of Korea<br />
                                <span style={{ fontSize: 11, color: "var(--text-3)" }}>Business Registration: 123-45-67890</span>
                            </div>
                        </div>
                    </div>
                    <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 24, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                        <div style={{ fontSize: 11, color: 'var(--text-3)' }}>© 2024??026 Geniego Co., Ltd. All rights reserved.</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 11, color: 'var(--text-3)' }}>
                            <span>Payments securely processed by <strong style={{ color: "var(--text-3)" }}>Paddle.com</strong></span>
                            <span>·</span>
                            <span>PCI DSS Level 1 Certified</span>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
