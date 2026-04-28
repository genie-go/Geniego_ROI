import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import PublicLayout from "../../layout/PublicLayout.jsx";

const PLANS = [
    {
        id: "starter", name: "Starter", priceMonthly: 49, priceAnnual: 39,
        tag: null, color: "#4f8ef7",
        desc: "Perfect for small teams managing a few channels.",
        priceIdMonthly: import.meta.env.VITE_PADDLE_PRICE_STARTER_MONTHLY || "",
        priceIdAnnual: import.meta.env.VITE_PADDLE_PRICE_STARTER_ANNUAL || "",
        features: [
            "3 sales channels",
            "1 warehouse (WMS)",
            "Marketing analytics dashboard",
            "Up to 2 team members",
            "10,000 API calls / month",
            "Email support (48h)",
        ],
        notIncluded: ["AI Intelligence", "Influencer evaluation", "International invoice"],
    },
    {
        id: "pro", name: "Pro", priceMonthly: 149, priceAnnual: 119,
        tag: "Most Popular", color: "#6366f1",
        desc: "For growing brands with multi-channel operations.",
        priceIdMonthly: import.meta.env.VITE_PADDLE_PRICE_PRO_MONTHLY || "",
        priceIdAnnual: import.meta.env.VITE_PADDLE_PRICE_PRO_ANNUAL || "",
        features: [
            "Unlimited sales channels",
            "Unlimited warehouses (WMS)",
            "AI Marketing Intelligence",
            "Influencer evaluation engine",
            "Commercial invoice auto-gen",
            "Up to 10 team members",
            "500,000 API calls / month",
            "Priority support (8h)",
        ],
        notIncluded: ["Custom AI models", "Dedicated account manager"],
    },
    {
        id: "enterprise", name: "Enterprise", priceMonthly: null, priceAnnual: null,
        tag: "Custom", color: "#a855f7",
        desc: "For large-scale operations requiring full customization.",
        priceIdMonthly: "", priceIdAnnual: "",
        features: [
            "Everything in Pro",
            "Custom AI model training",
            "Dedicated account manager",
            "SLA 99.9% uptime guarantee",
            "Unlimited team members",
            "Unlimited API calls",
            "Custom integrations & webhooks",
            "On-premise deployment option",
        ],
        notIncluded: [],
    },
];

const FAQS = [
    { q: "Can I cancel anytime?", a: "Yes — cancel any time from your account settings. Your access continues until the end of your billing period. No cancellation fees." },
    { q: "What payment methods are accepted?", a: "All major credit/debit cards, PayPal, Apple Pay, Google Pay, and 100+ local payment methods via Paddle (our Merchant of Record). Paddle handles VAT/GST compliance globally." },
    { q: "Is there a free trial?", a: "Every new account starts on a free Demo plan with no credit card required. Explore the platform at your own pace, then upgrade when you're ready — backed by our 30-day money-back guarantee." },
    { q: "How does billing work for annual plans?", a: "Annual plans are billed once upfront and save approximately 20% compared to monthly plans. You'll receive one invoice per year. You can switch between monthly and annual at any time." },
    { q: "Will taxes be added to my bill?", a: "Paddle handles all VAT/GST/sales tax compliance globally. Applicable taxes are calculated and shown at checkout based on your location. Your invoice will include a detailed tax breakdown." },
    { q: "What happens if my payment fails?", a: "Paddle will attempt to retry failed payments automatically. You'll receive email notifications. Your subscription remains active during the retry period. If payment ultimately fails, your plan will be paused (not cancelled) and can be resumed." },
];

const COMPARISON = [
    { feature: "Sales Channels", starter: "3", pro: "Unlimited", enterprise: "Unlimited" },
    { feature: "Warehouses (WMS)", starter: "1", pro: "Unlimited", enterprise: "Unlimited" },
    { feature: "Team Members", starter: "2", pro: "10", enterprise: "Unlimited" },
    { feature: "API Calls / Month", starter: "10,000", pro: "500,000", enterprise: "Unlimited" },
    { feature: "AI Marketing Intelligence", starter: "—", pro: "✓", enterprise: "✓" },
    { feature: "Influencer Analytics", starter: "—", pro: "✓", enterprise: "✓" },
    { feature: "Custom AI Models", starter: "—", pro: "—", enterprise: "✓" },
    { feature: "Dedicated Account Manager", starter: "—", pro: "—", enterprise: "✓" },
    { feature: "SLA Guarantee", starter: "—", pro: "99.5%", enterprise: "99.9%" },
    { feature: "Support Response", starter: "48h", pro: "8h", enterprise: "1h" },
];

let paddleInitialized = false;
function loadPaddleV2(clientToken) {
    return new Promise((resolve, reject) => {
        if (paddleInitialized && window.Paddle) { resolve(); return; }
        if (window.Paddle) {
            try {
                const env = import.meta.env.VITE_PADDLE_ENV || "sandbox";
                if (env === "sandbox") window.Paddle.Environment.set("sandbox");
                window.Paddle.Initialize({ token: clientToken });
                paddleInitialized = true; resolve();
            } catch { resolve(); }
            return;
        }
        const s = document.createElement("script");
        s.src = "https://cdn.paddle.com/paddle/v2/paddle.js";
        s.onload = () => {
            const env = import.meta.env.VITE_PADDLE_ENV || "sandbox";
            if (env === "sandbox") window.Paddle.Environment.set("sandbox");
            window.Paddle.Initialize({ token: clientToken });
            paddleInitialized = true; resolve();
        };
        s.onerror = reject;
        document.head.appendChild(s);
    });
}

export default function PricingPublic() {
    const [annual, setAnnual] = useState(false);
    const [loading, setLoading] = useState({});
    const [success, setSuccess] = useState(false);
    const [faqOpen, setFaqOpen] = useState(null);
    const [showComparison, setShowComparison] = useState(false);
    const [clientToken, setClientToken] = useState(import.meta.env.VITE_PADDLE_CLIENT_TOKEN || "");

    useEffect(() => {
        const apiBase = import.meta.env.VITE_API_BASE || "/api";
        fetch(`${apiBase}/v423/paddle/config`).then(r => r.json()).then(d => { if (d.clientToken) setClientToken(d.clientToken); }).catch(() => {});
    }, []);

    useEffect(() => { if (clientToken) loadPaddleV2(clientToken).catch(console.error); }, [clientToken]);

    const checkout = useCallback(async (plan) => {
        if (!plan.priceIdMonthly && !plan.priceIdAnnual) {
            window.location.href = "mailto:support@genie-go.com?subject=Enterprise%20Plan%20Inquiry";
            return;
        }
        const priceId = annual ? plan.priceIdAnnual : plan.priceIdMonthly;
        if (!priceId) { alert(`${annual ? "Annual" : "Monthly"} pricing not yet configured. Please contact support@genie-go.com.`); return; }
        setLoading(p => ({ ...p, [plan.id]: true }));
        try {
            if (!clientToken) throw new Error("Payment system not configured");
            await loadPaddleV2(clientToken);
            window.Paddle.Checkout.open({
                items: [{ priceId, quantity: 1 }],
                settings: { displayMode: "overlay", theme: "dark", locale: "en" },
                successCallback: () => setSuccess(true),
            });
        } catch (e) {
            console.error("Paddle checkout error:", e);
            alert("Unable to open checkout. Please try again or contact support@genie-go.com.");
        } finally {
            setLoading(p => ({ ...p, [plan.id]: false }));
        }
    }, [annual, clientToken]);

    return (
        <PublicLayout>
            <section style={{ padding: "80px 28px 100px", textAlign: "center", position: "relative" }}>
                <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: 800, height: 300, borderRadius: "50%", background: "radial-gradient(ellipse, rgba(99,102,241,0.08) 0%, transparent 70%)", pointerEvents: "none" }} />

                <div className="pub-section pub-fadeUp">
                    <div style={{ display: "inline-block", padding: "5px 20px", borderRadius: 99, background: "rgba(79,142,247,0.08)", border: "1px solid rgba(79,142,247,0.25)", fontSize: 11, color: "#4f8ef7", fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 24 }}>
                        Simple, Transparent Pricing
                    </div>
                    <h1 style={{ fontSize: 44, fontWeight: 900, margin: "0 0 14px", color: "#fff", letterSpacing: -1.5 }}>Plans that grow with you</h1>
                    <p style={{ fontSize: 15, color: "var(--text-3)", marginBottom: 8 }}>
                        No hidden fees. Cancel anytime.{" "}
                        <Link to="/refund" style={{ color: "#4f8ef7", fontWeight: 600 }}>30-day money-back guarantee.</Link>
                    </p>

                    {success && (
                        <div style={{ margin: "24px auto", maxWidth: 560, padding: "18px 24px", borderRadius: 14, background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.25)", color: "#22c55e", fontSize: 14, fontWeight: 600 }}>
                            ✅ Payment received! Your account is being activated — confirmation via email.
                        </div>
                    )}

                    {/* Toggle */}
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 14, margin: "32px 0 48px", padding: "8px 20px", borderRadius: 99, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                        <span style={{ fontSize: 13, color: annual ? "rgba(255,255,255,0.45)" : "#fff", fontWeight: 700, transition: "color 200ms" }}>Monthly</span>
                        <button onClick={() => setAnnual(a => !a)} style={{ width: 44, height: 24, borderRadius: 12, border: "none", background: annual ? "linear-gradient(135deg,#4f8ef7,#6366f1)" : "rgba(255,255,255,0.12)", cursor: "pointer", position: "relative", transition: "background 300ms" }}>
                            <div style={{ position: "absolute", width: 18, height: 18, borderRadius: "50%", background: "#fff", top: 3, left: annual ? 23 : 3, transition: "left 300ms cubic-bezier(0.4,0,0.2,1)", boxShadow: "0 1px 4px rgba(0,0,0,0.3)" }} />
                        </button>
                        <span style={{ fontSize: 13, color: annual ? "#fff" : "rgba(255,255,255,0.45)", fontWeight: 700, transition: "color 200ms" }}>
                            Annual <span style={{ color: "#22c55e", fontSize: 11, fontWeight: 800, marginLeft: 4, padding: "2px 8px", borderRadius: 6, background: "rgba(34,197,94,0.1)" }}>Save 20%</span>
                        </span>
                    </div>

                    {/* Plan cards */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, maxWidth: 1040, margin: "0 auto" }}>
                        {PLANS.map(plan => {
                            const price = plan.priceMonthly ? (annual ? plan.priceAnnual : plan.priceMonthly) : null;
                            const isPro = plan.id === "pro";
                            return (
                                <div key={plan.id} style={{
                                    padding: "36px 28px", borderRadius: 20, position: "relative", textAlign: "left",
                                    background: isPro ? "linear-gradient(155deg,rgba(99,102,241,0.1),rgba(79,142,247,0.05))" : "rgba(255,255,255,0.02)",
                                    border: isPro ? "1px solid rgba(99,102,241,0.35)" : "1px solid rgba(255,255,255,0.07)",
                                    transform: isPro ? "scale(1.02)" : "none",
                                    boxShadow: isPro ? "0 0 60px rgba(99,102,241,0.1)" : "none",
                                    transition: "all 300ms",
                                }}
                                    onMouseEnter={e => { if (!isPro) { e.currentTarget.style.borderColor = plan.color + "40"; e.currentTarget.style.transform = "translateY(-4px)"; } }}
                                    onMouseLeave={e => { if (!isPro) { e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; e.currentTarget.style.transform = "none"; } }}
                                >
                                    {plan.tag && (
                                        <div style={{ position: "absolute", top: -13, left: "50%", transform: "translateX(-50%)", padding: "4px 20px", borderRadius: 99, background: `linear-gradient(135deg,${plan.color},${plan.color}cc)`, fontSize: 10, fontWeight: 800, color: "#fff", whiteSpace: "nowrap", letterSpacing: 0.5, boxShadow: `0 0 20px ${plan.color}30` }}>{plan.tag}</div>
                                    )}
                                    <div style={{ fontSize: 11, fontWeight: 700, color: plan.color, letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>{plan.name}</div>
                                    <div style={{ fontSize: 12, color: "var(--text-3)", marginBottom: 24, lineHeight: 1.6, minHeight: 38 }}>{plan.desc}</div>

                                    <div style={{ marginBottom: 28 }}>
                                        {price !== null ? (
                                            <>
                                                <span style={{ fontSize: 48, fontWeight: 900, color: "#fff", letterSpacing: -2 }}>${price}</span>
                                                <span style={{ fontSize: 14, color: "var(--text-3)", marginLeft: 4 }}>/mo</span>
                                                {annual && <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 4 }}>Billed annually (${price * 12}/yr)</div>}
                                            </>
                                        ) : (
                                            <span style={{ fontSize: 36, fontWeight: 900, color: "#fff" }}>Custom</span>
                                        )}
                                    </div>

                                    <button onClick={() => checkout(plan)} disabled={!!loading[plan.id]}
                                        style={{ width: "100%", padding: "14px 0", borderRadius: 12, border: "none", cursor: loading[plan.id] ? "default" : "pointer", fontWeight: 800, fontSize: 14, background: isPro ? "linear-gradient(135deg,#4f8ef7,#7c3aed)" : "rgba(255,255,255,0.06)", color: "#fff", marginBottom: 28, opacity: loading[plan.id] ? 0.6 : 1, transition: "all 200ms", boxShadow: isPro ? "0 0 30px rgba(79,142,247,0.2)" : "none" }}>
                                        {loading[plan.id] ? "Opening checkout…" : plan.priceMonthly ? "Get Started" : "Contact Sales"}
                                    </button>

                                    <div style={{ display: "grid", gap: 10 }}>
                                        {plan.features.map(f => (
                                            <div key={f} style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 12, color: "rgba(255,255,255,0.7)" }}>
                                                <span style={{ color: "#22c55e", marginTop: 1, flexShrink: 0, fontSize: 12 }}>✓</span>{f}
                                            </div>
                                        ))}
                                        {plan.notIncluded.map(f => (
                                            <div key={f} style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 12, color: "rgba(255,255,255,0.2)" }}>
                                                <span style={{ marginTop: 1, flexShrink: 0 }}>✕</span>{f}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Trust signals */}
                    <div style={{ marginTop: 56, display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, maxWidth: 720, marginLeft: "auto", marginRight: "auto" }}>
                        {[
                            { icon: "🔒", title: "Secure Payments", desc: "PCI DSS Level 1 certified via Paddle", color: "#4f8ef7" },
                            { icon: "↩", title: "30-Day Refund", desc: "Full refund, no questions asked", color: "#22c55e" },
                            { icon: "🌍", title: "Global Billing", desc: "100+ currencies, VAT handled automatically", color: "#a855f7" },
                        ].map(t => (
                            <div key={t.title} style={{ padding: "24px 20px", borderRadius: 16, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", textAlign: "center", transition: "border-color 300ms" }}
                                onMouseEnter={e => e.currentTarget.style.borderColor = t.color + "40"}
                                onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"}>
                                <div style={{ fontSize: 24, marginBottom: 10 }}>{t.icon}</div>
                                <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 6 }}>{t.title}</div>
                                <div style={{ fontSize: 11, color: "var(--text-3)" }}>{t.desc}</div>
                            </div>
                        ))}
                    </div>

                    {/* Comparison button */}
                    <div style={{ marginTop: 48 }}>
                        <button onClick={() => setShowComparison(c => !c)} style={{ padding: "12px 28px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.03)", color: "rgba(255,255,255,0.7)", fontSize: 13, fontWeight: 700, cursor: "pointer", transition: "all 200ms" }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(79,142,247,0.3)"; e.currentTarget.style.color = "#fff"; }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; e.currentTarget.style.color = "rgba(255,255,255,0.7)"; }}>
                            {showComparison ? "Hide" : "View"} Full Feature Comparison {showComparison ? "↑" : "↓"}
                        </button>
                    </div>

                    {/* Comparison table */}
                    {showComparison && (
                        <div style={{ marginTop: 32, maxWidth: 900, marginLeft: "auto", marginRight: "auto", borderRadius: 18, overflow: "hidden", border: "1px solid rgba(255,255,255,0.07)" }}>
                            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                                <thead>
                                    <tr style={{ background: "rgba(79,142,247,0.06)" }}>
                                        <th style={{ padding: "16px 20px", textAlign: "left", color: "rgba(255,255,255,0.6)", fontWeight: 600, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>Feature</th>
                                        <th style={{ padding: "16px 20px", textAlign: "center", color: "#4f8ef7", fontWeight: 700, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>Starter</th>
                                        <th style={{ padding: "16px 20px", textAlign: "center", color: "#6366f1", fontWeight: 700, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>Pro</th>
                                        <th style={{ padding: "16px 20px", textAlign: "center", color: "#a855f7", fontWeight: 700, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>Enterprise</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {COMPARISON.map((row, i) => (
                                        <tr key={row.feature} style={{ background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.015)" }}>
                                            <td style={{ padding: "12px 20px", color: "rgba(255,255,255,0.6)", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>{row.feature}</td>
                                            <td style={{ padding: "12px 20px", textAlign: "center", color: row.starter === "✓" ? "#22c55e" : row.starter === "—" ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.7)", fontWeight: 600, borderBottom: "1px solid rgba(255,255,255,0.04)" }}>{row.starter}</td>
                                            <td style={{ padding: "12px 20px", textAlign: "center", color: row.pro === "✓" ? "#22c55e" : row.pro === "—" ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.7)", fontWeight: 600, borderBottom: "1px solid rgba(255,255,255,0.04)" }}>{row.pro}</td>
                                            <td style={{ padding: "12px 20px", textAlign: "center", color: row.enterprise === "✓" ? "#22c55e" : "rgba(255,255,255,0.7)", fontWeight: 600, borderBottom: "1px solid rgba(255,255,255,0.04)" }}>{row.enterprise}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* FAQ */}
                    <div style={{ marginTop: 80, maxWidth: 720, marginLeft: "auto", marginRight: "auto", textAlign: "left" }}>
                        <div style={{ textAlign: "center", marginBottom: 40 }}>
                            <h2 style={{ fontSize: 28, fontWeight: 900, color: "#fff", letterSpacing: -0.5 }}>Frequently Asked Questions</h2>
                        </div>
                        {FAQS.map((item, i) => (
                            <div key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                                <button onClick={() => setFaqOpen(faqOpen === i ? null : i)}
                                    style={{ width: "100%", textAlign: "left", background: "none", border: "none", padding: "20px 0", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", color: "#fff", fontSize: 14, fontWeight: 700 }}>
                                    {item.q}
                                    <span style={{ fontSize: 20, color: "var(--text-3)", transition: "transform 300ms", transform: faqOpen === i ? "rotate(45deg)" : "none", flexShrink: 0, marginLeft: 16 }}>+</span>
                                </button>
                                <div style={{ maxHeight: faqOpen === i ? 200 : 0, overflow: "hidden", transition: "max-height 300ms ease-in-out" }}>
                                    <div style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", lineHeight: 1.9, paddingBottom: 20 }}>{item.a}</div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Legal */}
                    <p style={{ marginTop: 56, fontSize: 11, color: "rgba(255,255,255,0.25)", lineHeight: 1.8 }}>
                        By purchasing, you agree to our{" "}
                        <Link to="/terms" style={{ color: "#4f8ef7" }}>Terms of Service</Link> and{" "}
                        <Link to="/privacy" style={{ color: "#4f8ef7" }}>Privacy Policy</Link>.<br />
                        All prices in USD. Taxes may apply depending on your location. Powered by Paddle.com (Merchant of Record).
                    </p>
                </div>
            </section>
        </PublicLayout>
    );
}
