import React from "react";
import { Link } from "react-router-dom";
import PublicLayout from "../../layout/PublicLayout.jsx";

const S = {
    hero: { padding: "80px 28px 48px", textAlign: "center" },
    badge: { display: "inline-block", padding: "4px 16px", borderRadius: 99, background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)", fontSize: 11, color: "#f59e0b", fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 20 },
    title: { fontSize: 40, fontWeight: 900, color: "#fff", margin: "0 0 12px", letterSpacing: -1 },
    subtitle: { fontSize: 14, color: "var(--text-3)" },
    wrap: { maxWidth: 780, margin: "0 auto", padding: "0 28px 80px" },
    section: { marginBottom: 40 },
    h2: { fontSize: 20, fontWeight: 800, color: "#fff", marginBottom: 16, display: "flex", alignItems: "center", gap: 10 },
    p: { fontSize: 13, color: "rgba(255,255,255,0.55)", lineHeight: 2, marginBottom: 12 },
    ul: { paddingLeft: 20, marginBottom: 16 },
    li: { fontSize: 13, color: "rgba(255,255,255,0.55)", lineHeight: 2.2 },
    card: { padding: "24px 28px", borderRadius: 16, background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)", marginBottom: 20 },
};

export default function Refund() {
    return (
        <PublicLayout>
            <section style={S.hero}>
                <div style={S.badge}>Legal · Refund</div>
                <h1 style={S.title}>Refund Policy</h1>
                <p style={S.subtitle}>Last updated: April 1, 2026 · Fair & transparent</p>
            </section>
            <div style={S.wrap}>
                {/* Highlight card */}
                <div style={{ padding: "28px 32px", borderRadius: 18, background: "linear-gradient(135deg,rgba(34,197,94,0.06),rgba(79,142,247,0.06))", border: "1px solid rgba(34,197,94,0.2)", marginBottom: 40, textAlign: "center" }}>
                    <div style={{ fontSize: 36, marginBottom: 12 }}>↩</div>
                    <h2 style={{ fontSize: 24, fontWeight: 900, color: "#22c55e", margin: "0 0 8px" }}>30-Day Money-Back Guarantee</h2>
                    <p style={{ fontSize: 14, color: "rgba(255,255,255,0.55)", margin: 0, maxWidth: 520, marginLeft: "auto", marginRight: "auto" }}>
                        Try Geniego-ROI risk-free. If you're not completely satisfied within 30 days of your first purchase, we'll refund your payment in full — no questions asked.
                    </p>
                </div>

                <div style={S.section}>
                    <h2 style={S.h2}>✅ 1. Eligibility for Refund</h2>
                    <p style={S.p}>You are eligible for a full refund if <strong style={{ color: "#fff" }}>all</strong> of the following conditions are met:</p>
                    <ul style={S.ul}>
                        <li style={S.li}>The refund request is made within <strong style={{ color: "#22c55e" }}>30 calendar days</strong> of your initial subscription purchase</li>
                        <li style={S.li}>It is your <strong style={{ color: "#fff" }}>first subscription</strong> to Geniego-ROI (refunds are not available for re-subscriptions)</li>
                        <li style={S.li}>Your account has not been terminated for violating our Terms of Service</li>
                    </ul>
                </div>

                <div style={S.section}>
                    <h2 style={S.h2}>📋 2. How to Request a Refund</h2>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
                        {[
                            { step: "1", title: "Contact Us", desc: "Email support@genie-go.com with subject 'Refund Request'" },
                            { step: "2", title: "Provide Details", desc: "Include your account email and reason for the refund" },
                            { step: "3", title: "Receive Refund", desc: "Processed within 5–10 business days via Paddle" },
                        ].map(s => (
                            <div key={s.step} style={{ padding: "20px", borderRadius: 14, background: "rgba(79,142,247,0.04)", border: "1px solid rgba(79,142,247,0.1)", textAlign: "center" }}>
                                <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg,#4f8ef7,#7c3aed)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 900, color: "#fff", marginBottom: 10 }}>{s.step}</div>
                                <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 6 }}>{s.title}</div>
                                <div style={{ fontSize: 11, color: "var(--text-3)", lineHeight: 1.6 }}>{s.desc}</div>
                            </div>
                        ))}
                    </div>
                </div>

                <div style={S.section}>
                    <h2 style={S.h2}>💳 3. Refund Method</h2>
                    <p style={S.p}>Refunds are processed by <strong style={{ color: "#fff" }}>Paddle.com</strong>, our Merchant of Record. The refund will be returned to the original payment method used at checkout. Processing times vary by payment provider:</p>
                    <ul style={S.ul}>
                        <li style={S.li}><strong style={{ color: "#fff" }}>Credit/Debit Cards:</strong> 5–10 business days</li>
                        <li style={S.li}><strong style={{ color: "#fff" }}>PayPal:</strong> 3–5 business days</li>
                        <li style={S.li}><strong style={{ color: "#fff" }}>Other methods:</strong> Up to 14 business days depending on the provider</li>
                    </ul>
                </div>

                <div style={S.section}>
                    <h2 style={S.h2}>🚫 4. Non-Refundable Situations</h2>
                    <p style={S.p}>The following situations are <strong style={{ color: "#ef4444" }}>not eligible</strong> for refunds:</p>
                    <ul style={S.ul}>
                        <li style={S.li}>Requests made after the 30-day guarantee period</li>
                        <li style={S.li}>Re-subscriptions (previously cancelled and re-subscribed accounts)</li>
                        <li style={S.li}>Accounts terminated for Terms of Service violations</li>
                        <li style={S.li}>Partial refunds for unused portions of annual plans (after 30 days)</li>
                        <li style={S.li}>Enterprise custom contracts (governed by individual agreements)</li>
                    </ul>
                </div>

                <div style={S.section}>
                    <h2 style={S.h2}>⚡ 5. Cancellation vs. Refund</h2>
                    <p style={S.p}><strong style={{ color: "#fff" }}>Cancellation</strong> and <strong style={{ color: "#fff" }}>Refund</strong> are different:</p>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                        <div style={{ padding: "20px", borderRadius: 14, background: "rgba(79,142,247,0.04)", border: "1px solid rgba(79,142,247,0.12)" }}>
                            <div style={{ fontSize: 13, fontWeight: 800, color: "#4f8ef7", marginBottom: 8 }}>Cancellation</div>
                            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", lineHeight: 1.8 }}>Stops future billing. You retain access until the end of your current billing period. No refund issued.</div>
                        </div>
                        <div style={{ padding: "20px", borderRadius: 14, background: "rgba(34,197,94,0.04)", border: "1px solid rgba(34,197,94,0.12)" }}>
                            <div style={{ fontSize: 13, fontWeight: 800, color: "#22c55e", marginBottom: 8 }}>Refund</div>
                            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", lineHeight: 1.8 }}>Full money back within 30 days. Access is revoked after refund is processed. Account returns to Demo plan.</div>
                        </div>
                    </div>
                </div>

                <div style={S.section}>
                    <h2 style={S.h2}>📧 6. Contact</h2>
                    <div style={S.card}>
                        <p style={{ ...S.p, marginBottom: 0 }}>
                            For refund requests or billing questions:<br />
                            <strong style={{ color: "#fff" }}>Email:</strong> support@genie-go.com<br />
                            <strong style={{ color: "#fff" }}>Subject Line:</strong> "Refund Request — [Your Account Email]"<br />
                            <strong style={{ color: "#fff" }}>Response Time:</strong> Within 24 hours (business days)
                        </p>
                    </div>
                </div>

                {/* Bottom CTA */}
                <div style={{ textAlign: "center", paddingTop: 20 }}>
                    <p style={{ fontSize: 13, color: "var(--text-3)", marginBottom: 20 }}>Have more questions about billing?</p>
                    <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
                        <Link to="/pricing" className="pub-btn-primary" style={{ padding: "12px 28px" }}>View Pricing</Link>
                        <Link to="/terms" className="pub-btn-outline" style={{ padding: "12px 28px" }}>Terms of Service</Link>
                    </div>
                </div>
            </div>
        </PublicLayout>
    );
}
