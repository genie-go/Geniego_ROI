import React from "react";
import PublicLayout from "../../layout/PublicLayout.jsx";

const S = {
    hero: { padding: "80px 28px 48px", textAlign: "center", position: "relative" },
    badge: { display: "inline-block", padding: "4px 16px", borderRadius: 99, background: "rgba(79,142,247,0.08)", border: "1px solid rgba(79,142,247,0.25)", fontSize: 11, color: "#4f8ef7", fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 20 },
    title: { fontSize: 40, fontWeight: 900, color: "#fff", margin: "0 0 12px", letterSpacing: -1 },
    subtitle: { fontSize: 14, color: "var(--text-3)", marginBottom: 0 },
    wrap: { maxWidth: 780, margin: "0 auto", padding: "0 28px 80px" },
    section: { marginBottom: 40 },
    h2: { fontSize: 20, fontWeight: 800, color: "#fff", marginBottom: 16, display: "flex", alignItems: "center", gap: 10 },
    h3: { fontSize: 15, fontWeight: 700, color: "rgba(255,255,255,0.85)", marginBottom: 10, marginTop: 20 },
    p: { fontSize: 13, color: "rgba(255,255,255,0.55)", lineHeight: 2, marginBottom: 12 },
    ul: { paddingLeft: 20, marginBottom: 16 },
    li: { fontSize: 13, color: "rgba(255,255,255,0.55)", lineHeight: 2.2 },
    card: { padding: "24px 28px", borderRadius: 16, background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)", marginBottom: 20 },
    divider: { height: 1, background: "rgba(255,255,255,0.06)", margin: "40px 0" },
};

export default function Terms() {
    return (
        <PublicLayout>
            <section style={S.hero}>
                <div style={S.badge}>Legal</div>
                <h1 style={S.title}>Terms of Service</h1>
                <p style={S.subtitle}>Last updated: April 1, 2026 · Effective immediately</p>
            </section>
            <div style={S.wrap}>
                <div style={S.card}>
                    <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", lineHeight: 1.9 }}>
                        These Terms of Service ("Terms") govern your access to and use of the Geniego-ROI platform ("Service"), operated by <strong style={{ color: "#fff" }}>Geniego Co., Ltd.</strong> ("Company", "we", "us"). By accessing or using the Service, you agree to be bound by these Terms.
                    </div>
                </div>

                <div style={S.section}>
                    <h2 style={S.h2}>📋 1. Acceptance of Terms</h2>
                    <p style={S.p}>By creating an account or using any part of the Service, you acknowledge that you have read, understood, and agree to be bound by these Terms and our Privacy Policy. If you do not agree, you must not access or use the Service.</p>
                    <p style={S.p}>You must be at least 18 years old and have the legal authority to enter into binding agreements to use this Service. If you are using the Service on behalf of a company or organization, you represent that you have the authority to bind that entity to these Terms.</p>
                </div>

                <div style={S.section}>
                    <h2 style={S.h2}>🔑 2. Account Registration</h2>
                    <p style={S.p}>To access the Service, you must create an account with accurate, complete, and current information. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.</p>
                    <ul style={S.ul}>
                        <li style={S.li}>You must provide a valid email address</li>
                        <li style={S.li}>You are responsible for all activity under your account</li>
                        <li style={S.li}>Notify us immediately of any unauthorized access</li>
                        <li style={S.li}>We reserve the right to suspend accounts that violate these Terms</li>
                    </ul>
                </div>

                <div style={S.section}>
                    <h2 style={S.h2}>💳 3. Subscription & Billing</h2>
                    <p style={S.p}>The Service offers free (Demo) and paid subscription plans (Starter, Pro, Enterprise). Paid subscriptions are billed in advance on a monthly or annual basis through our payment processor, <strong style={{ color: "#fff" }}>Paddle.com</strong> (the Merchant of Record).</p>
                    <h3 style={S.h3}>3.1 Payment Processing</h3>
                    <p style={S.p}>All payments are processed by Paddle.com, which acts as the Merchant of Record for all transactions. Paddle handles all billing, invoicing, tax compliance (VAT/GST/sales tax), and payment method management. Your financial data is processed directly by Paddle and is never stored on our servers.</p>
                    <h3 style={S.h3}>3.2 Pricing</h3>
                    <p style={S.p}>Prices are stated in USD. Applicable taxes may be added based on your location and will be shown at checkout. We reserve the right to change pricing with 30 days' advance notice. Existing subscribers will be grandfathered at their current rate until the end of their current billing period.</p>
                    <h3 style={S.h3}>3.3 Auto-Renewal</h3>
                    <p style={S.p}>Subscriptions automatically renew unless cancelled before the end of the current billing period. You may cancel at any time from your account settings or by contacting support.</p>
                </div>

                <div style={S.section}>
                    <h2 style={S.h2}>↩ 4. Refund & Cancellation</h2>
                    <p style={S.p}>We offer a <strong style={{ color: "#22c55e" }}>30-day money-back guarantee</strong> for first-time subscribers. If you are not satisfied within 30 days of your initial purchase, contact us for a full refund. See our <a href="/refund" style={{ color: "#4f8ef7" }}>Refund Policy</a> for full details.</p>
                    <p style={S.p}>After the 30-day period, cancellations take effect at the end of the current billing cycle. No partial refunds are provided for the remaining period.</p>
                </div>

                <div style={S.section}>
                    <h2 style={S.h2}>📦 5. Acceptable Use</h2>
                    <p style={S.p}>You agree not to misuse the Service. Prohibited activities include but are not limited to:</p>
                    <ul style={S.ul}>
                        <li style={S.li}>Reverse engineering, decompiling, or disassembling the Service</li>
                        <li style={S.li}>Using the Service for any illegal purpose</li>
                        <li style={S.li}>Attempting to gain unauthorized access to other accounts or systems</li>
                        <li style={S.li}>Uploading malicious code, viruses, or harmful content</li>
                        <li style={S.li}>Reselling or redistributing the Service without authorization</li>
                        <li style={S.li}>Exceeding API rate limits or abusing system resources</li>
                    </ul>
                </div>

                <div style={S.section}>
                    <h2 style={S.h2}>🔒 6. Intellectual Property</h2>
                    <p style={S.p}>The Service, including all code, design, branding, documentation, and proprietary AI models, is the intellectual property of Geniego Co., Ltd. Your subscription grants you a limited, non-exclusive, non-transferable license to use the Service for its intended purpose.</p>
                    <p style={S.p}>You retain ownership of all data you upload to the Service. We do not claim ownership of your data and will not use it for purposes beyond providing the Service to you.</p>
                </div>

                <div style={S.section}>
                    <h2 style={S.h2}>⚠️ 7. Limitation of Liability</h2>
                    <p style={S.p}>TO THE MAXIMUM EXTENT PERMITTED BY LAW, THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND. IN NO EVENT SHALL GENIEGO CO., LTD. BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUE, WHETHER INCURRED DIRECTLY OR INDIRECTLY.</p>
                    <p style={S.p}>Our total aggregate liability shall not exceed the amount you paid to us in the twelve (12) months preceding the event giving rise to the claim.</p>
                </div>

                <div style={S.section}>
                    <h2 style={S.h2}>🌍 8. Governing Law</h2>
                    <p style={S.p}>These Terms shall be governed by and construed in accordance with the laws of the Republic of Korea. Any disputes arising under these Terms shall be subject to the exclusive jurisdiction of the courts of Seoul, Republic of Korea.</p>
                </div>

                <div style={S.section}>
                    <h2 style={S.h2}>📧 9. Contact</h2>
                    <div style={S.card}>
                        <p style={{ ...S.p, marginBottom: 0 }}>
                            For questions about these Terms, please contact us:<br />
                            <strong style={{ color: "#fff" }}>Email:</strong> support@genie-go.com<br />
                            <strong style={{ color: "#fff" }}>Company:</strong> Geniego Co., Ltd.<br />
                            <strong style={{ color: "#fff" }}>Address:</strong> Seoul, Republic of Korea
                        </p>
                    </div>
                </div>
            </div>
        </PublicLayout>
    );
}
