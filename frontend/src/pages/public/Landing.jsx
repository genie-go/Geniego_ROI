import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PublicLayout from "../../layout/PublicLayout.jsx";

const FEATURES = [
    { icon: "🛒", title: "OmniChannel Commerce", desc: "Connect 10+ domestic & global marketplaces — Coupang, Naver, Amazon, Shopify, TikTok Shop, and more. Standardize orders, inventory, and fulfillment in one place." },
    { icon: "🏭", title: "WMS — Warehouse & Logistics", desc: "Multi-warehouse inventory tracking, inbound/outbound management, combined-shipment (합포) requests, carrier API integration, and auto-generated commercial invoices for international express." },
    { icon: "📣", title: "Marketing Intelligence", desc: "8-dimensional contribution scoring across ad channels, influencer campaigns, and coupon flows. AI-driven budget recommendations with human-in-the-loop approval gates." },
    { icon: "🤝", title: "Influencer Analytics", desc: "Evaluate influencers by reach, engagement, conversion rate, and estimated ROI. Automated commission recommendations and campaign performance tracking." },
    { icon: "📊", title: "Unified P&L Analytics", desc: "Real-time Profit & Loss by SKU, channel, campaign, and creator. Anomaly detection for ROAS drops, return surges, and coupon abuse." },
    { icon: "💳", title: "Settlement & Reconciliation", desc: "Automated settlement reconciliation across channels. Catch discrepancies between channel payouts and expected amounts." },
    { icon: "🤖", title: "AI Automation Engine", desc: "Rule-based and AI-driven automation with approval workflows. Set thresholds, get AI policy suggestions, approve with one click." },
    { icon: "🔌", title: "30+ Channel Connectors", desc: "Pre-built API connectors for Korean domestic channels (Coupang, Naver, 11st) and global platforms (Amazon, Meta, TikTok). OAuth-ready, API-key-based credential management." },
];

const STATS = [
    { label: "Sales Channels", value: "30+" },
    { label: "SKUs Managed", value: "1M+" },
    { label: "Data Points / Day", value: "500K+" },
    { label: "AI Models", value: "8" },
];

export default function Landing() {
    const [tick, setTick] = useState(0);
    useEffect(() => { const id = setInterval(() => setTick(t => t + 1), 3000); return () => clearInterval(id); }, []);

    return (
        <PublicLayout>
            {/* Hero */}
            <section style={{ maxWidth: 1140, margin: "0 auto", padding: "80px 24px 60px", textAlign: "center" }}>
                <div style={{ display: "inline-block", padding: "4px 16px", borderRadius: 20, background: "rgba(79,142,247,0.1)", border: "1px solid rgba(79,142,247,0.3)", fontSize: 11, color: "#4f8ef7", fontWeight: 700, marginBottom: 24, letterSpacing: 1, textTransform: "uppercase" }}>
                    Unified Revenue Intelligence Platform
                </div>
                <h1 style={{ fontSize: "clamp(32px,5vw,58px)", fontWeight: 900, lineHeight: 1.15, margin: "0 0 20px", background: "linear-gradient(135deg,#fff 40%,#6366f1)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                    One Platform.<br />Every Channel.<br />Total Revenue Clarity.
                </h1>
                <p style={{ fontSize: 16, color: "rgba(255,255,255,0.55)", maxWidth: 620, margin: "0 auto 36px", lineHeight: 1.8 }}>
                    Geniego-ROI connects your warehouses, sales channels, marketing campaigns, and influencers into a single operating system — so you can grow revenue with confidence.
                </p>
                <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
                    <Link to="/pricing" style={{ padding: "14px 32px", borderRadius: 12, background: "linear-gradient(135deg,#4f8ef7,#6366f1)", color: "#fff", fontWeight: 800, fontSize: 14, textDecoration: "none", boxShadow: "0 0 40px rgba(79,142,247,0.4)" }}>
                        Start Free Trial →
                    </Link>
                    <Link to="/login" style={{ padding: "14px 32px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.8)", fontWeight: 700, fontSize: 14, textDecoration: "none" }}>
                        Login to Dashboard
                    </Link>
                </div>

                {/* Stats */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginTop: 60, maxWidth: 720, marginLeft: "auto", marginRight: "auto" }}>
                    {STATS.map(s => (
                        <div key={s.label} style={{ padding: "20px 16px", borderRadius: 14, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", textAlign: "center" }}>
                            <div style={{ fontSize: 28, fontWeight: 900, color: "#4f8ef7" }}>{s.value}</div>
                            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>{s.label}</div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Features */}
            <section style={{ maxWidth: 1140, margin: "0 auto", padding: "0 24px 80px" }}>
                <div style={{ textAlign: "center", marginBottom: 48 }}>
                    <h2 style={{ fontSize: 32, fontWeight: 900, margin: "0 0 12px" }}>Everything You Need to Scale</h2>
                    <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)" }}>From warehouse to wallet — all in one platform</p>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 20 }}>
                    {FEATURES.map(f => (
                        <div key={f.title} style={{ padding: "24px", borderRadius: 16, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", transition: "border-color 200ms" }}
                            onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(79,142,247,0.3)"}
                            onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"}>
                            <div style={{ fontSize: 28, marginBottom: 12 }}>{f.icon}</div>
                            <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 8, color: "#fff" }}>{f.title}</div>
                            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", lineHeight: 1.7 }}>{f.desc}</div>
                        </div>
                    ))}
                </div>
            </section>

            {/* CTA */}
            <section style={{ background: "linear-gradient(135deg,rgba(79,142,247,0.08),rgba(99,102,241,0.08))", borderTop: "1px solid rgba(79,142,247,0.15)", borderBottom: "1px solid rgba(79,142,247,0.15)", padding: "60px 24px", textAlign: "center" }}>
                <h2 style={{ fontSize: 28, fontWeight: 900, margin: "0 0 12px" }}>Ready to unlock your revenue potential?</h2>
                <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", marginBottom: 28 }}>Start with Starter plan at $49/mo. Cancel anytime.</p>
                <Link to="/pricing" style={{ padding: "14px 40px", borderRadius: 12, background: "linear-gradient(135deg,#4f8ef7,#6366f1)", color: "#fff", fontWeight: 800, fontSize: 15, textDecoration: "none", boxShadow: "0 0 40px rgba(79,142,247,0.35)" }}>
                    View Pricing →
                </Link>
            </section>
        </PublicLayout>
    );
}
