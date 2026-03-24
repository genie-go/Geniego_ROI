import React from "react";
import { Link } from "react-router-dom";
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

function Highlight({ children }) {
    return (
        <div style={{ padding: "16px 20px", borderRadius: 12, background: "rgba(79,142,247,0.07)", border: "1px solid rgba(79,142,247,0.2)", marginBottom: 16 }}>
            {children}
        </div>
    );
}

export default function Refund() {
    return (
        <PublicLayout>
            <div style={{ maxWidth: 820, margin: "0 auto", padding: "60px 24px 80px" }}>
                <div style={{ textAlign: "center", marginBottom: 48 }}>
                    <h1 style={{ fontSize: 36, fontWeight: 900, color: "#fff", margin: "0 0 10px" }}>Refund Policy</h1>
                    <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>Last updated: {LAST_UPDATED}</p>
                </div>

                <Highlight>
                    <p style={{ fontSize: 14, margin: 0, color: "#4f8ef7", fontWeight: 700 }}>📋 Summary</p>
                    <p style={{ fontSize: 13, margin: "8px 0 0", color: "rgba(255,255,255,0.75)", lineHeight: 1.7 }}>
                        We offer a <strong>30-day full refund</strong> for new subscriptions, no questions asked. After 30 days, refunds are considered on a case-by-case basis for documented service failures. Enterprise contracts follow the terms in your signed agreement.
                    </p>
                </Highlight>

                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", lineHeight: 1.9 }}>

                    <Section title="1. 30-Day Money-Back Guarantee">
                        <p>If you are not satisfied with Geniego-ROI for any reason, you may request a full refund within <strong>30 calendar days</strong> of your first payment. This applies to:</p>
                        <ul style={{ paddingLeft: 24 }}>
                            <li>New subscriptions (Starter, Pro plans)</li>
                            <li>First payment on annual cycle</li>
                        </ul>
                        <p>To request a refund within 30 days, email <a href="mailto:billing@genie-go.com" style={{ color: "#4f8ef7" }}>billing@genie-go.com</a> with your account email and order ID. We will process refunds within 5–7 business days.</p>
                    </Section>

                    <Section title="2. Refunds After 30 Days">
                        <p>After the 30-day window, refunds are considered only in the following circumstances:</p>
                        <ul style={{ paddingLeft: 24 }}>
                            <li><strong>Documented Service Failure:</strong> If the platform experienced verified downtime exceeding our SLA (99.5%) and we failed to apply credits</li>
                            <li><strong>Billing Error:</strong> If you were charged incorrectly due to a system error on our end</li>
                            <li><strong>Duplicate Charge:</strong> If you were charged more than once for the same period</li>
                        </ul>
                        <p>Refunds are not available for:</p>
                        <ul style={{ paddingLeft: 24 }}>
                            <li>Partial month usage after cancellation (subscriptions remain active until period end)</li>
                            <li>Unused features or API quota</li>
                            <li>Account suspension due to Terms of Service violations</li>
                            <li>Dissatisfaction with AI analysis results (AI outputs are probabilistic estimates)</li>
                        </ul>
                    </Section>

                    <Section title="3. Annual Subscriptions">
                        <p>For annual plans:</p>
                        <ul style={{ paddingLeft: 24 }}>
                            <li>Full refund available within 30 days of first payment</li>
                            <li>After 30 days, no prorated refunds for unused months on annual plans unless there is a documented service failure</li>
                            <li>Cancellation stops auto-renewal; access continues until the annual period ends</li>
                        </ul>
                    </Section>

                    <Section title="4. Subscription Cancellation">
                        <p>You may cancel your subscription at any time from within the app (Settings → Billing → Cancel Subscription) or by emailing <a href="mailto:billing@genie-go.com" style={{ color: "#4f8ef7" }}>billing@genie-go.com</a>.</p>
                        <p>Cancellation takes effect at the <strong>end of your current billing period</strong>. You retain full access until that date. No charges are made after cancellation.</p>
                    </Section>

                    <Section title="5. Refund Processing">
                        <p>Because payments are collected by <strong>Paddle.com</strong> (our Merchant of Record), refunds are issued by Paddle back to your original payment method. Processing time:</p>
                        <ul style={{ paddingLeft: 24 }}>
                            <li>Credit/Debit card: 5–10 business days</li>
                            <li>PayPal: 3–5 business days</li>
                            <li>Bank transfer: 7–14 business days</li>
                        </ul>
                        <p>Refunds are issued in the original currency and amount paid. Currency conversion fees charged by your bank are outside our control.</p>
                    </Section>

                    <Section title="6. Enterprise Plans">
                        <p>Enterprise contracts are governed by individual service agreements (MSA/SOW). Refund terms for Enterprise customers are specified in the signed agreement. Contact your Account Manager for details.</p>
                    </Section>

                    <Section title="7. How to Request a Refund">
                        <p>Send an email to <a href="mailto:billing@genie-go.com" style={{ color: "#4f8ef7" }}>billing@genie-go.com</a> with:</p>
                        <ul style={{ paddingLeft: 24 }}>
                            <li>Subject: "Refund Request — [Your Account Email]"</li>
                            <li>Your account email address</li>
                            <li>Paddle order ID or receipt number</li>
                            <li>Reason for refund (optional for 30-day requests)</li>
                        </ul>
                        <p>We will respond within 2 business days and process eligible refunds within 5–7 business days.</p>
                    </Section>

                    <Section title="8. Questions">
                        <p>For questions about billing or refunds, contact us at:</p>
                        <p><a href="mailto:billing@genie-go.com" style={{ color: "#4f8ef7" }}>billing@genie-go.com</a><br />Geniego Co., Ltd. · Seoul, Republic of Korea</p>
                        <p style={{ marginTop: 12 }}>
                            See also: <Link to="/terms" style={{ color: "#4f8ef7" }}>Terms of Service</Link> · <Link to="/privacy" style={{ color: "#4f8ef7" }}>Privacy Policy</Link>
                        </p>
                    </Section>
                </div>
            </div>
        </PublicLayout>
    );
}
