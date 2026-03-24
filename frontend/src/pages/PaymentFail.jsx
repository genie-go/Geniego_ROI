import React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

export default function PaymentFail() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const message = searchParams.get("message") || "Payment was cancelled or an error occurred.";
    const code = searchParams.get("code") || "";

    return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", padding: "40px 20px", textAlign: "center" }}>
            <div style={{ fontSize: 52, marginBottom: 16 }}>😞</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: "#ef4444", marginBottom: 10 }}>Payment Failed</div>
            <div style={{ fontSize: 13, color: "var(--text-3)", marginBottom: 8, lineHeight: 1.7, maxWidth: 360 }}>{message}</div>
            {code && <div style={{ fontSize: 11, color: "var(--text-4)", marginBottom: 24, fontFamily: "monospace" }}>Error 코드: {code}</div>}
            <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
                <button onClick={() => navigate("/pricing")} style={{
                    padding: "11px 28px", borderRadius: 10, border: "none", cursor: "pointer",
                    background: "linear-gradient(135deg,#4f8ef7,#a855f7)", color: "#fff", fontWeight: 800, fontSize: 14,
                }}>Try Again</button>
                <button onClick={() => navigate("/dashboard")} style={{
                    padding: "11px 24px", borderRadius: 10, border: "1px solid var(--border)",
                    background: "var(--surface-2)", color: "var(--text-2)", fontWeight: 700, fontSize: 13, cursor: "pointer",
                }}>Dashboard로</button>
            </div>
        </div>
    );
}
