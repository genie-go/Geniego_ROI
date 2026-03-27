import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import PublicLayout from "../../layout/PublicLayout.jsx";

// ── Plans ─────────────────────────────────────────────────────────────────────
const PLANS = [
    {
        id: "starter", name: "Starter",
        priceMonthly: 49, priceAnnual: 39,
        tag: null, tagColor: null,
        desc: "Perfect for small teams managing a few channels.",
        priceIdMonthly: import.meta.env.VITE_PADDLE_PRICE_STARTER_MONTHLY || "",
        priceIdAnnual: import.meta.env.VITE_PADDLE_PRICE_STARTER_ANNUAL || "",
        features: [
            "3 sales channels",
            "1 warehouse (WMS)",
            "Marketing analytics dashboard",
            "Up to 2 team members",
            "10,000 API calls / month",
            "Email support (48h response)",
        ],
        notIncluded: ["AI Intelligence", "Influencer evaluation", "International invoice"],
    },
    {
        id: "pro", name: "Pro",
        priceMonthly: 149, priceAnnual: 119,
        tag: "Most Popular", tagColor: "#4f8ef7",
        desc: "For growing brands with multi-channel operations.",
        priceIdMonthly: import.meta.env.VITE_PADDLE_PRICE_PRO_MONTHLY || "",
        priceIdAnnual: import.meta.env.VITE_PADDLE_PRICE_PRO_ANNUAL || "",
        features: [
            "Unlimited sales channels",
            "Unlimited warehouses (WMS)",
            "AI Marketing Intelligence",
            "Influencer evaluation engine",
            "Commercial invoice auto-generation",
            "Up to 10 team members",
            "500,000 API calls / month",
            "Priority support (8h response)",
        ],
        notIncluded: ["Custom AI model training", "Dedicated account manager"],
    },
    {
        id: "enterprise", name: "Enterprise",
        priceMonthly: null, priceAnnual: null,
        tag: "Custom", tagColor: "#a855f7",
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
    {
        q: "Can I cancel anytime?",
        a: "Yes — cancel any time from your account settings. Access continues until the end of your billing period.",
    },
    {
        q: "What payment methods are accepted?",
        a: "All major credit/debit cards, PayPal, and 100+ local payment methods via Paddle (our Merchant of Record).",
    },
    {
        q: "Is there a free trial?",
        a: "Every new account starts on a Demo plan at no charge. Upgrade when you're ready, with a 30-day money-back guarantee.",
    },
    {
        q: "How does billing work for annual plans?",
        a: "Annual plans are billed once upfront and save ~20% compared to monthly. You'll receive one invoice per year.",
    },
    {
        q: "Will taxes be added to my bill?",
        a: "Paddle handles all VAT/GST compliance globally. Applicable taxes are shown at checkout based on your location.",
    },
];

// ── Paddle Billing v2 Loader ──────────────────────────────────────────────────
let paddleInitialized = false;

function loadPaddleV2(clientToken) {
    return new Promise((resolve, reject) => {
        if (paddleInitialized && window.Paddle) { resolve(); return; }
        if (window.Paddle) {
            try {
                const env = import.meta.env.VITE_PADDLE_ENV || "sandbox";
                if (env === "sandbox") window.Paddle.Environment.set("sandbox");
                window.Paddle.Initialize({ token: clientToken });
                paddleInitialized = true;
                resolve();
            } catch { resolve(); }
            return;
        }
        const s = document.createElement("script");
        s.src = "https://cdn.paddle.com/paddle/v2/paddle.js";
        s.onload = () => {
            const env = import.meta.env.VITE_PADDLE_ENV || "sandbox";
            if (env === "sandbox") window.Paddle.Environment.set("sandbox");
            window.Paddle.Initialize({ token: clientToken });
            paddleInitialized = true;
            resolve();
        };
        s.onerror = reject;
        document.head.appendChild(s);
    });
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function PricingPublic() {
    const [annual, setAnnual] = useState(false);
    const [loading, setLoading] = useState({});
    const [success, setSuccess] = useState(false);
    const [faqOpen, setFaqOpen] = useState(null);
    const [clientToken, setClientToken] = useState(
        import.meta.env.VITE_PADDLE_CLIENT_TOKEN || ""
    );

    // Fetch client token from backend /api/v423/paddle/config (so env vars stay server-side)
    useEffect(() => {
        const apiBase = import.meta.env.VITE_API_BASE || "/api";
        fetch(`${apiBase}/v423/paddle/config`)
            .then(r => r.json())
            .then(d => {
                if (d.clientToken) setClientToken(d.clientToken);
            })
            .catch(() => { /* use env fallback */ });
    }, []);

    // Pre-load Paddle.js when token is available
    useEffect(() => {
        if (clientToken) loadPaddleV2(clientToken).catch(console.error);
    }, [clientToken]);

    const checkout = useCallback(async (plan) => {
        if (!plan.priceIdMonthly && !plan.priceIdAnnual) {
            window.location.href = "mailto:support@genie-go.com?subject=Enterprise%20Inquiry";
            return;
        }
        const priceId = annual ? plan.priceIdAnnual : plan.priceIdMonthly;
        if (!priceId) {
            alert(`${annual ? "Annual" : "Monthly"} pricing unavailable yet — please contact us.`);
            return;
        }

        setLoading(p => ({ ...p, [plan.id]: true }));
        try {
            if (!clientToken) throw new Error("Paddle not configured");
            await loadPaddleV2(clientToken);

            window.Paddle.Checkout.open({
                items: [{ priceId, quantity: 1 }],
                settings: {
                    displayMode: "overlay",
                    theme: "dark",
                    locale: "en",
                },
                successCallback: () => {
                    // Webhook is authoritative — this is just a UX hint
                    setSuccess(true);
                },
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
            <section style={{ maxWidth: 1140, margin: "0 auto", padding: "64px 24px 80px", textAlign: "center" }}>

                {/* Badge */}
                <div style={{ display: "inline-block", padding: "4px 16px", borderRadius: 20, background: "rgba(79,142,247,0.1)", border: "1px solid rgba(79,142,247,0.3)", fontSize: 11, color: "#4f8ef7", fontWeight: 700, marginBottom: 20, letterSpacing: 1, textTransform: "uppercase" }}>
                    Simple, Transparent Pricing
                </div>

                <h1 style={{ fontSize: 40, fontWeight: 900, margin: "0 0 12px", color: "#fff" }}>Plans that grow with you</h1>
                <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", marginBottom: 36 }}>
                    No hidden fees. Cancel anytime.{" "}
                    <Link to="/refund" style={{ color: "#4f8ef7" }}>30-day refund policy.</Link>
                </p>

                {/* Success banner (shown after checkout callback) */}
                {success && (
                    <div style={{ margin: "0 auto 32px", maxWidth: 560, padding: "16px 20px", borderRadius: 14, background: "rgba(34,197,94,0.09)", border: "1px solid rgba(34,197,94,0.3)", color: "#22c55e", fontSize: 14, fontWeight: 600 }}>
                        ✅ Payment received! Your account is being activated — this may take a moment.
                        <br />
                        <span style={{ fontSize: 12, opacity: 0.8 }}>Activation is confirmed via webhook. Please check your email.</span>
                    </div>
                )}

                {/* Annual toggle */}
                <div style={{ display: "inline-flex", alignItems: "center", gap: 12, marginBottom: 48, padding: "8px 16px", borderRadius: 20, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <span style={{ fontSize: 12, color: annual ? "rgba(255,255,255,0.5)" : "#fff", fontWeight: 600 }}>Monthly</span>
                    <button
                        onClick={() => setAnnual(a => !a)}
                        style={{ width: 40, height: 22, borderRadius: 11, border: "none", background: annual ? "#4f8ef7" : "rgba(255,255,255,0.12)", cursor: "pointer", position: "relative", transition: "background 200ms" }}
                    >
                        <div style={{ position: "absolute", width: 16, height: 16, borderRadius: "50%", background: "#fff", top: 3, left: annual ? 21 : 3, transition: "left 200ms" }} />
                    </button>
                    <span style={{ fontSize: 12, color: annual ? "#fff" : "rgba(255,255,255,0.5)", fontWeight: 600 }}>
                        Annual <span style={{ color: "#22c55e", fontSize: 10 }}>Save ~20%</span>
                    </span>
                </div>

                {/* Plan cards */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 20, maxWidth: 1000, margin: "0 auto" }}>
                    {PLANS.map(plan => {
                        const price = plan.priceMonthly
                            ? (annual ? plan.priceAnnual : plan.priceMonthly)
                            : null;
                        const isPro = plan.id === "pro";
                        return (
                            <div key={plan.id} style={{
                                padding: "32px 28px", borderRadius: 20,
                                background: isPro ? "linear-gradient(135deg,rgba(79,142,247,0.1),rgba(99,102,241,0.1))" : "rgba(255,255,255,0.02)",
                                border: isPro ? "1px solid rgba(79,142,247,0.4)" : "1px solid rgba(255,255,255,0.07)",
                                position: "relative", textAlign: "left",
                            }}>
                                {plan.tag && (
                                    <div style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", padding: "3px 16px", borderRadius: 20, background: plan.tagColor, fontSize: 10, fontWeight: 800, color: "#fff", whiteSpace: "nowrap" }}>
                                        {plan.tag}
                                    </div>
                                )}
                                <div style={{ fontSize: 16, fontWeight: 900, color: "#fff", marginBottom: 6 }}>{plan.name}</div>
                                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginBottom: 20, lineHeight: 1.6 }}>{plan.desc}</div>
                                <div style={{ marginBottom: 24 }}>
                                    {price !== null ? (
                                        <>
                                            <span style={{ fontSize: 40, fontWeight: 900, color: "#fff" }}>${price}</span>
                                            <span style={{ fontSize: 14, color: "rgba(255,255,255,0.5)" }}>/mo{annual ? " · billed annually" : ""}</span>
                                        </>
                                    ) : (
                                        <span style={{ fontSize: 28, fontWeight: 900, color: "#fff" }}>Custom</span>
                                    )}
                                </div>
                                <button
                                    onClick={() => checkout(plan)}
                                    disabled={!!loading[plan.id]}
                                    style={{ width: "100%", padding: "12px 0", borderRadius: 10, border: "none", cursor: loading[plan.id] ? "default" : "pointer", fontWeight: 800, fontSize: 13, background: isPro ? "linear-gradient(135deg,#4f8ef7,#6366f1)" : "rgba(255,255,255,0.07)", color: "#fff", marginBottom: 24, opacity: loading[plan.id] ? 0.7 : 1, transition: "opacity 150ms" }}
                                >
                                    {loading[plan.id] ? "Opening checkout…" : plan.priceMonthly ? "Get Started" : "Contact Sales"}
                                </button>
                                <div style={{ display: "grid", gap: 8 }}>
                                    {plan.features.map(f => (
                                        <div key={f} style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 12, color: "rgba(255,255,255,0.75)" }}>
                                            <span style={{ color: "#22c55e", marginTop: 1, flexShrink: 0 }}>✓</span>{f}
                                        </div>
                                    ))}
                                    {plan.notIncluded.map(f => (
                                        <div key={f} style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 12, color: "rgba(255,255,255,0.25)" }}>
                                            <span style={{ marginTop: 1, flexShrink: 0 }}>✕</span>{f}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Trust signals */}
                <div style={{ marginTop: 60, display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 20, maxWidth: 700, marginLeft: "auto", marginRight: "auto" }}>
                    {[
                        { icon: "🔒", title: "Secure Payments", desc: "Powered by Paddle — PCI DSS Level 1 certified" },
                        { icon: "↩", title: "30-Day Refund", desc: "Not happy? Full refund within 30 days" },
                        { icon: "🌍", title: "Global Billing", desc: "100+ currencies, local payment methods, VAT handled" },
                    ].map(t => (
                        <div key={t.title} style={{ padding: "20px", borderRadius: 14, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", textAlign: "center" }}>
                            <div style={{ fontSize: 22, marginBottom: 8 }}>{t.icon}</div>
                            <div style={{ fontSize: 12, fontWeight: 700, color: "#fff", marginBottom: 4 }}>{t.title}</div>
                            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>{t.desc}</div>
                        </div>
                    ))}
                </div>

                {/* FAQ */}
                <div style={{ marginTop: 72, maxWidth: 680, marginLeft: "auto", marginRight: "auto", textAlign: "left" }}>
                    <h2 style={{ fontSize: 22, fontWeight: 900, color: "#fff", textAlign: "center", marginBottom: 32 }}>Frequently Asked Questions</h2>
                    {FAQS.map((item, i) => (
                        <div key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", marginBottom: 0 }}>
                            <button
                                onClick={() => setFaqOpen(faqOpen === i ? null : i)}
                                style={{ width: "100%", textAlign: "left", background: "none", border: "none", padding: "18px 0", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", color: "#fff", fontSize: 14, fontWeight: 700 }}
                            >
                                {item.q}
                                <span style={{ fontSize: 18, color: "rgba(255,255,255,0.4)", transition: "transform 200ms", transform: faqOpen === i ? "rotate(45deg)" : "none" }}>+</span>
                            </button>
                            {faqOpen === i && (
                                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", lineHeight: 1.8, paddingBottom: 20 }}>{item.a}</div>
                            )}
                        </div>
                    ))}
                </div>

                {/* Legal footer */}
                <p style={{ marginTop: 48, fontSize: 11, color: "rgba(255,255,255,0.3)" }}>
                    By purchasing, you agree to our{" "}
                    <Link to="/terms" style={{ color: "#4f8ef7" }}>Terms of Service</Link> and{" "}
                    <Link to="/privacy" style={{ color: "#4f8ef7" }}>Privacy Policy</Link>.<br />
                    All prices in USD. Taxes may apply depending on your location.
                </p>
            </section>
        </PublicLayout>
    );
}

