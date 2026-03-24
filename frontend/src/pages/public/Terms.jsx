import React from "react";
import PublicLayout from "../../layout/PublicLayout.jsx";

const LAST_UPDATED = "March 6, 2026";

function Section({ title, children }) {
    return (
        <div style={{ marginBottom: 36 }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: "#fff", marginBottom: 12, paddingBottom: 8, borderBottom: "1px solid rgba(255,255,255,0.07)" }}>{title}</h2>
            {children}
        </div>
    );
}

export default function Terms() {
    return (
        <PublicLayout>
            <div style={{ maxWidth: 820, margin: "0 auto", padding: "60px 24px 80px" }}>
                <div style={{ textAlign: "center", marginBottom: 48 }}>
                    <h1 style={{ fontSize: 36, fontWeight: 900, color: "#fff", margin: "0 0 10px" }}>Terms of Service</h1>
                    <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>Last updated: {LAST_UPDATED} · Effective immediately</p>
                </div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", lineHeight: 1.9 }}>

                    <Section title="1. Agreement to Terms">
                        <p>By accessing or using Geniego-ROI (the "Service"), operated by Geniego Co., Ltd. ("Company", "we", "us"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree, please do not use the Service.</p>
                    </Section>

                    <Section title="2. Description of Service">
                        <p>Geniego-ROI is a cloud-based Revenue Intelligence Platform that provides:</p>
                        <ul style={{ paddingLeft: 24, marginTop: 8 }}>
                            <li>OmniChannel Commerce Management (order standardization across 10+ marketplaces)</li>
                            <li>Warehouse Management System (WMS) for multi-warehouse inventory operations</li>
                            <li>Marketing Analytics, AI-powered campaign evaluation, and influencer performance tracking</li>
                            <li>P&L / Profit & Loss reporting, settlement reconciliation, and finance tooling</li>
                            <li>Automated rule-based and AI-driven policy execution with human approval workflows</li>
                        </ul>
                    </Section>

                    <Section title="3. Accounts &amp; Registration">
                        <p>You must provide accurate and complete information when creating an account. You are responsible for maintaining the security of your credentials. You must notify us immediately of any unauthorized access at <strong>support@genie-go.com</strong>.</p>
                        <p>One account may not be shared among multiple organizations without an Enterprise license.</p>
                    </Section>

                    <Section title="4. Subscription, Billing &amp; Payment">
                        <p><strong>4.1 Plans.</strong> The Service is offered on a subscription basis (Starter $49/mo, Pro $149/mo, Enterprise custom). Prices are in USD and exclusive of applicable taxes.</p>
                        <p><strong>4.2 Payment Processor.</strong> All payments are processed by Paddle.com Market Limited ("Paddle"), our Merchant of Record. Paddle collects payment, issues invoices, and handles VAT/GST compliance on our behalf. By purchasing, you also agree to <a href="https://www.paddle.com/legal/terms" target="_blank" rel="noreferrer" style={{ color: "#4f8ef7" }}>Paddle's Terms of Service</a>.</p>
                        <p><strong>4.3 Billing Cycle.</strong> Subscriptions are billed monthly or annually in advance. Your subscription auto-renews unless cancelled before the renewal date.</p>
                        <p><strong>4.4 Payment Failure.</strong> If payment fails, we will retry up to 3 times over 7 days. If all attempts fail, your account will be downgraded to a restricted-access state.</p>
                        <p><strong>4.5 Upgrades / Downgrades.</strong> Plan changes take effect immediately. Prorated credits are applied to next billing cycle where applicable.</p>
                    </Section>

                    <Section title="5. Refunds">
                        <p>Please refer to our <a href="/refund" style={{ color: "#4f8ef7" }}>Refund Policy</a> for details on eligibility and process.</p>
                    </Section>

                    <Section title="6. Acceptable Use">
                        <p>You agree not to:</p>
                        <ul style={{ paddingLeft: 24, marginTop: 8 }}>
                            <li>Use the Service to violate any law or infringe third-party rights</li>
                            <li>Reverse-engineer, decompile, or extract source code</li>
                            <li>Attempt to gain unauthorized access to other accounts or systems</li>
                            <li>Use the Service for scraping, spam, or fraudulent purposes</li>
                            <li>Exceed API rate limits or intentionally degrade service performance</li>
                        </ul>
                    </Section>

                    <Section title="7. Intellectual Property">
                        <p>All software, AI models, designs, and content in the Service are owned by or licensed to Geniego Co., Ltd. You are granted a limited, non-exclusive, non-transferable license to use the Service during your subscription period. You retain ownership of your data.</p>
                    </Section>

                    <Section title="8. Data &amp; Privacy">
                        <p>Your use of the Service is subject to our <a href="/privacy" style={{ color: "#4f8ef7" }}>Privacy Policy</a>, which is incorporated into these Terms by reference.</p>
                    </Section>

                    <Section title="9. Service Availability">
                        <p>We target 99.5% monthly uptime for Pro and Enterprise plans. Planned maintenance will be announced 24 hours in advance. We are not liable for downtime caused by third-party services (Paddle, AWS, channel APIs).</p>
                    </Section>

                    <Section title="10. Limitation of Liability">
                        <p>To the maximum extent permitted by applicable law, the Company's total liability shall not exceed the amount you paid in the 3 months preceding the claim. We are not liable for indirect, incidental, special, or consequential damages.</p>
                    </Section>

                    <Section title="11. Termination">
                        <p>Either party may terminate the subscription at any time. Upon termination, your access will be revoked at the end of the current billing period. We may immediately terminate accounts that violate these Terms.</p>
                    </Section>

                    <Section title="12. Changes to Terms">
                        <p>We may update these Terms at any time. Material changes will be communicated via email or in-app notice 14 days in advance. Continued use of the Service after the effective date constitutes acceptance.</p>
                    </Section>

                    <Section title="13. Governing Law">
                        <p>These Terms are governed by the laws of the Republic of Korea. Disputes shall be resolved in the Seoul Central District Court as the court of first instance.</p>
                    </Section>

                    <Section title="14. Contact">
                        <p>Geniego Co., Ltd.<br />Email: <a href="mailto:legal@genie-go.com" style={{ color: "#4f8ef7" }}>legal@genie-go.com</a><br />Address: Seoul, Republic of Korea</p>
                    </Section>
                </div>
            </div>
        </PublicLayout>
    );
}
