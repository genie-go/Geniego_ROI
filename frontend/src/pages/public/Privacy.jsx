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

export default function Privacy() {
    return (
        <PublicLayout>
            <div style={{ maxWidth: 820, margin: "0 auto", padding: "60px 24px 80px" }}>
                <div style={{ textAlign: "center", marginBottom: 48 }}>
                    <h1 style={{ fontSize: 36, fontWeight: 900, color: "#fff", margin: "0 0 10px" }}>Privacy Policy</h1>
                    <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>Last updated: {LAST_UPDATED} · GDPR-aware</p>
                </div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", lineHeight: 1.9 }}>

                    <Section title="1. Who We Are">
                        <p>Geniego Co., Ltd. ("we", "us", "Company") operates Geniego-ROI, a Revenue Intelligence Platform. We are the data controller for personal data processed in connection with the Service.</p>
                        <p>Contact: <a href="mailto:privacy@genie-go.com" style={{ color: "#4f8ef7" }}>privacy@genie-go.com</a></p>
                    </Section>

                    <Section title="2. Data We Collect">
                        <p><strong>Account Data:</strong> Name, email address, company name, job title, and password hash when you register.</p>
                        <p><strong>Payment Data:</strong> We do not store credit card numbers. Payment details are processed exclusively by Paddle.com. We receive only subscription status, plan ID, and anonymized transaction identifiers.</p>
                        <p><strong>Usage Data:</strong> Pages visited, features used, API call logs, and browser/device information (user agent, screen resolution).</p>
                        <p><strong>Commerce Data:</strong> Order data, inventory levels, SKUs, channel credentials, and settlement data you import into the platform. This data is processed on your behalf as a data processor.</p>
                        <p><strong>AI Evaluation Data:</strong> Marketing campaign metrics, influencer performance scores, and contribution scores computed by our AI engine.</p>
                    </Section>

                    <Section title="3. How We Use Your Data">
                        <ul style={{ paddingLeft: 24 }}>
                            <li>To provide, maintain, and improve the Service</li>
                            <li>To process your subscription and billing (via Paddle)</li>
                            <li>To send transactional emails (receipts, password resets, alerts)</li>
                            <li>To train and evaluate AI models on aggregated, anonymized data</li>
                            <li>To comply with legal obligations (tax, accounting, fraud prevention)</li>
                            <li>To detect and prevent security incidents and abuse</li>
                        </ul>
                    </Section>

                    <Section title="4. Legal Basis for Processing (GDPR)">
                        <p>For users in the EEA/UK, our legal bases are:</p>
                        <ul style={{ paddingLeft: 24 }}>
                            <li><strong>Contract:</strong> Processing necessary to provide the Service</li>
                            <li><strong>Legitimate Interest:</strong> Platform security, analytics, fraud prevention</li>
                            <li><strong>Legal Obligation:</strong> Tax records, regulatory compliance</li>
                            <li><strong>Consent:</strong> Marketing emails (you may withdraw at any time)</li>
                        </ul>
                    </Section>

                    <Section title="5. Data Sharing">
                        <p>We share data with the following categories of third parties:</p>
                        <ul style={{ paddingLeft: 24 }}>
                            <li><strong>Paddle.com:</strong> Payment processing and subscription management (Merchant of Record)</li>
                            <li><strong>Amazon Web Services (AWS):</strong> Cloud hosting and database storage (Seoul region)</li>
                            <li><strong>Anthropic (Claude AI):</strong> AI analysis of marketing and influencer data (aggregated only, no PII)</li>
                            <li><strong>Transactional Email Provider:</strong> Sending system emails</li>
                        </ul>
                        <p>We do not sell personal data. We do not share data with advertising networks.</p>
                    </Section>

                    <Section title="6. Data Retention">
                        <p>We retain account data for the duration of your subscription plus 90 days after termination (for dispute resolution). Raw channel data is retained for up to 24 months. Audit logs are retained for 5 years for compliance purposes.</p>
                    </Section>

                    <Section title="7. International Transfers">
                        <p>Your data is primarily stored in AWS Seoul (ap-northeast-2). If data is transferred outside the EEA, we implement appropriate safeguards (Standard Contractual Clauses or adequacy decisions).</p>
                    </Section>

                    <Section title="8. Your Rights">
                        <p>You have the right to:</p>
                        <ul style={{ paddingLeft: 24 }}>
                            <li><strong>Access:</strong> Request a copy of your personal data</li>
                            <li><strong>Rectification:</strong> Correct inaccurate data</li>
                            <li><strong>Erasure:</strong> Request deletion ("right to be forgotten")</li>
                            <li><strong>Portability:</strong> Receive data in machine-readable format</li>
                            <li><strong>Objection:</strong> Object to processing based on legitimate interest</li>
                            <li><strong>Restriction:</strong> Restrict processing in certain circumstances</li>
                        </ul>
                        <p>To exercise your rights, contact <a href="mailto:privacy@genie-go.com" style={{ color: "#4f8ef7" }}>privacy@genie-go.com</a>. We will respond within 30 days.</p>
                    </Section>

                    <Section title="9. Cookies">
                        <p>We use strictly necessary cookies for authentication (session token) and performance cookies to measure feature usage. We do not use third-party advertising cookies. You can disable cookies in your browser, but some features may be unavailable.</p>
                    </Section>

                    <Section title="10. Security">
                        <p>We implement industry-standard security measures: TLS 1.3 in transit, AES-256 at rest, role-based access control, regular penetration testing, and audit logging of all administrative actions. Despite these measures, no system is 100% secure.</p>
                    </Section>

                    <Section title="11. Children's Privacy">
                        <p>The Service is intended for business use and is not directed at individuals under 18. We do not knowingly collect data from minors.</p>
                    </Section>

                    <Section title="12. Changes to This Policy">
                        <p>We may update this Privacy Policy periodically. For material changes, we will provide 14 days' notice by email or in-app notification.</p>
                    </Section>

                    <Section title="13. Contact &amp; Data Protection Officer">
                        <p>Geniego Co., Ltd.<br />Email: <a href="mailto:privacy@genie-go.com" style={{ color: "#4f8ef7" }}>privacy@genie-go.com</a><br />Address: Seoul, Republic of Korea</p>
                    </Section>
                </div>
            </div>
        </PublicLayout>
    );
}
