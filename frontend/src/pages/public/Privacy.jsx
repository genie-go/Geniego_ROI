import React from "react";
import PublicLayout from "../../layout/PublicLayout.jsx";

const S = {
    hero: { padding: "80px 28px 48px", textAlign: "center" },
    badge: { display: "inline-block", padding: "4px 16px", borderRadius: 99, background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.25)", fontSize: 11, color: "#22c55e", fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 20 },
    title: { fontSize: 40, fontWeight: 900, color: "#fff", margin: "0 0 12px", letterSpacing: -1 },
    subtitle: { fontSize: 14, color: "var(--text-3)" },
    wrap: { maxWidth: 780, margin: "0 auto", padding: "0 28px 80px" },
    section: { marginBottom: 40 },
    h2: { fontSize: 20, fontWeight: 800, color: "#fff", marginBottom: 16, display: "flex", alignItems: "center", gap: 10 },
    h3: { fontSize: 15, fontWeight: 700, color: "rgba(255,255,255,0.85)", marginBottom: 10, marginTop: 20 },
    p: { fontSize: 13, color: "rgba(255,255,255,0.55)", lineHeight: 2, marginBottom: 12 },
    ul: { paddingLeft: 20, marginBottom: 16 },
    li: { fontSize: 13, color: "rgba(255,255,255,0.55)", lineHeight: 2.2 },
    card: { padding: "24px 28px", borderRadius: 16, background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)", marginBottom: 20 },
};

export default function Privacy() {
    return (
        <PublicLayout>
            <section style={S.hero}>
                <div style={S.badge}>Legal · Privacy</div>
                <h1 style={S.title}>Privacy Policy</h1>
                <p style={S.subtitle}>Last updated: April 1, 2026 · GDPR & CCPA Compliant</p>
            </section>
            <div style={S.wrap}>
                <div style={S.card}>
                    <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", lineHeight: 1.9 }}>
                        This Privacy Policy describes how <strong style={{ color: "#fff" }}>Geniego Co., Ltd.</strong> ("Company", "we", "us") collects, uses, and protects personal information when you use the Geniego-ROI platform ("Service"). We are committed to protecting your privacy and complying with applicable data protection laws including <strong style={{ color: "#22c55e" }}>GDPR</strong>, <strong style={{ color: "#22c55e" }}>CCPA</strong>, and <strong style={{ color: "#22c55e" }}>PIPA (Korea)</strong>.
                    </div>
                </div>

                <div style={S.section}>
                    <h2 style={S.h2}>📋 1. Information We Collect</h2>
                    <h3 style={S.h3}>1.1 Information You Provide</h3>
                    <ul style={S.ul}>
                        <li style={S.li}><strong style={{ color: "#fff" }}>Account Information:</strong> Name, email address, company name, role</li>
                        <li style={S.li}><strong style={{ color: "#fff" }}>Business Data:</strong> Sales channel credentials, product catalogs, inventory data, marketing campaign data</li>
                        <li style={S.li}><strong style={{ color: "#fff" }}>Communication:</strong> Support tickets, feedback, survey responses</li>
                    </ul>
                    <h3 style={S.h3}>1.2 Information Collected Automatically</h3>
                    <ul style={S.ul}>
                        <li style={S.li}><strong style={{ color: "#fff" }}>Usage Data:</strong> Pages viewed, features used, session duration, click patterns</li>
                        <li style={S.li}><strong style={{ color: "#fff" }}>Device Data:</strong> Browser type, operating system, IP address, device identifiers</li>
                        <li style={S.li}><strong style={{ color: "#fff" }}>Cookies:</strong> Essential cookies for authentication and session management</li>
                    </ul>
                    <h3 style={S.h3}>1.3 Payment Information</h3>
                    <p style={S.p}>Payment information (credit card numbers, billing addresses) is processed directly by <strong style={{ color: "#fff" }}>Paddle.com</strong>, our payment processor and Merchant of Record. We do not store, process, or have access to your full payment card details.</p>
                </div>

                <div style={S.section}>
                    <h2 style={S.h2}>🔧 2. How We Use Your Information</h2>
                    <ul style={S.ul}>
                        <li style={S.li}>To provide, maintain, and improve the Service</li>
                        <li style={S.li}>To process transactions and manage subscriptions</li>
                        <li style={S.li}>To send service-related communications (billing, security, updates)</li>
                        <li style={S.li}>To provide customer support</li>
                        <li style={S.li}>To analyze usage patterns and improve user experience</li>
                        <li style={S.li}>To enforce our Terms of Service and prevent fraud</li>
                        <li style={S.li}>To comply with legal obligations</li>
                    </ul>
                    <p style={S.p}>We <strong style={{ color: "#ef4444" }}>do not sell</strong> your personal information to third parties. We do not use your business data for purposes beyond providing the Service.</p>
                </div>

                <div style={S.section}>
                    <h2 style={S.h2}>🤝 3. Data Sharing</h2>
                    <p style={S.p}>We share your information only with the following categories of third parties, and only as necessary:</p>
                    <ul style={S.ul}>
                        <li style={S.li}><strong style={{ color: "#fff" }}>Paddle.com:</strong> Payment processing, invoicing, tax compliance (as Merchant of Record)</li>
                        <li style={S.li}><strong style={{ color: "#fff" }}>Cloud Infrastructure:</strong> Amazon Web Services (AWS) for secure hosting and data storage</li>
                        <li style={S.li}><strong style={{ color: "#fff" }}>Analytics:</strong> Anonymized usage analytics to improve the Service</li>
                        <li style={S.li}><strong style={{ color: "#fff" }}>Legal Requirements:</strong> When required by law, court order, or government request</li>
                    </ul>
                </div>

                <div style={S.section}>
                    <h2 style={S.h2}>🔒 4. Data Security</h2>
                    <p style={S.p}>We implement industry-standard security measures to protect your data:</p>
                    <ul style={S.ul}>
                        <li style={S.li}>TLS 1.3 encryption for all data in transit</li>
                        <li style={S.li}>AES-256 encryption for data at rest</li>
                        <li style={S.li}>Regular security audits and penetration testing</li>
                        <li style={S.li}>Role-based access control (RBAC) for internal systems</li>
                        <li style={S.li}>SOC 2 Type II compliance (in progress)</li>
                        <li style={S.li}>Regular automated backups with point-in-time recovery</li>
                    </ul>
                </div>

                <div style={S.section}>
                    <h2 style={S.h2}>🌍 5. International Data Transfers</h2>
                    <p style={S.p}>Your data may be processed in the Republic of Korea and other jurisdictions where our infrastructure is located. When transferring data internationally, we ensure appropriate safeguards are in place, including Standard Contractual Clauses (SCCs) approved by relevant authorities.</p>
                </div>

                <div style={S.section}>
                    <h2 style={S.h2}>⚖️ 6. Your Rights (GDPR / CCPA)</h2>
                    <p style={S.p}>Depending on your jurisdiction, you may have the following rights:</p>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                        {[
                            ["Right to Access", "Request a copy of your personal data"],
                            ["Right to Rectification", "Correct inaccurate or incomplete data"],
                            ["Right to Erasure", "Request deletion of your personal data"],
                            ["Right to Portability", "Receive your data in a structured format"],
                            ["Right to Restrict", "Limit how we process your data"],
                            ["Right to Object", "Object to certain processing activities"],
                        ].map(([title, desc]) => (
                            <div key={title} style={{ padding: "14px 18px", borderRadius: 12, background: "rgba(34,197,94,0.04)", border: "1px solid rgba(34,197,94,0.1)" }}>
                                <div style={{ fontSize: 12, fontWeight: 700, color: "#22c55e", marginBottom: 4 }}>{title}</div>
                                <div style={{ fontSize: 11, color: "var(--text-3)" }}>{desc}</div>
                            </div>
                        ))}
                    </div>
                    <p style={{ ...S.p, marginTop: 16 }}>To exercise any of these rights, contact us at <strong style={{ color: "#4f8ef7" }}>support@genie-go.com</strong>. We will respond within 30 days.</p>
                </div>

                <div style={S.section}>
                    <h2 style={S.h2}>🍪 7. Cookies</h2>
                    <p style={S.p}>We use essential cookies required for authentication and session management. We do not use advertising or tracking cookies without your explicit consent. You can manage cookie preferences through your browser settings.</p>
                </div>

                <div style={S.section}>
                    <h2 style={S.h2}>👶 8. Children's Privacy</h2>
                    <p style={S.p}>The Service is not directed to individuals under 18. We do not knowingly collect personal information from children. If we learn that we have collected data from a child under 18, we will take steps to delete it promptly.</p>
                </div>

                <div style={S.section}>
                    <h2 style={S.h2}>📧 9. Contact Us</h2>
                    <div style={S.card}>
                        <p style={{ ...S.p, marginBottom: 0 }}>
                            For privacy-related inquiries or to exercise your data rights:<br />
                            <strong style={{ color: "#fff" }}>Data Protection Officer:</strong> privacy@genie-go.com<br />
                            <strong style={{ color: "#fff" }}>General Support:</strong> support@genie-go.com<br />
                            <strong style={{ color: "#fff" }}>Company:</strong> Geniego Co., Ltd., Seoul, Republic of Korea
                        </p>
                    </div>
                </div>
            </div>
        </PublicLayout>
    );
}
