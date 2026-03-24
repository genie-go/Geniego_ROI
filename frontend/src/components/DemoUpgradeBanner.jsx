/**
 * DemoUpgradeBanner.jsx
 * 데모 유저가 페이지를 열람할 때 하단에 노출되는 sticky 유인 배너
 * Admin 제외 모든 페이지에서 표시
 */
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import { useT } from "../i18n";

export default function DemoUpgradeBanner() {
    const { plan } = useAuth();
    const navigate = useNavigate();
    const t = useT();
    const [dismissed, setDismissed] = useState(false);

    const isDemo = plan === "demo" || plan === "free" || !plan;
    if (!isDemo || dismissed) return null;

    return (
        <div style={{
            position: "fixed",
            bottom: 0,
            left: 200,
            right: 0,
            zIndex: 1000,
            background: "linear-gradient(90deg,rgba(10,15,35,0.97),rgba(15,20,45,0.97))",
            borderTop: "1px solid rgba(168,85,247,0.35)",
            backdropFilter: "blur(20px)",
            padding: "14px 28px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
            boxShadow: "0 -8px 32px rgba(0,0,0,0.4)",
        }}>
            {/* 왼쪽: 텍스트 */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1 }}>
                <div style={{
                    width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                    background: "linear-gradient(135deg,rgba(168,85,247,0.25),rgba(99,102,241,0.2))",
                    border: "1px solid rgba(168,85,247,0.35)",
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
                }}>🎯</div>
                <div>
                    <div style={{ fontWeight: 800, fontSize: 13, color: "#fff" }}>
                        {t('demo.upgradeBarTitle')}
                    </div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 2 }}>
                        {t('demo.upgradeBarDesc')}
                    </div>
                </div>
            </div>

            {/* 오른쪽: CTA 버튼 */}
            <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                <button
                    onClick={() => navigate("/my-coupons")}
                    style={{
                        padding: "9px 18px", borderRadius: 10,
                        border: "1px solid rgba(34,197,94,0.5)",
                        background: "rgba(34,197,94,0.1)", color: "#22c55e",
                        fontWeight: 700, fontSize: 12, cursor: "pointer",
                        transition: "all 150ms",
                    }}
                    onMouseOver={e => { e.currentTarget.style.background = "rgba(34,197,94,0.2)"; }}
                    onMouseOut={e => { e.currentTarget.style.background = "rgba(34,197,94,0.1)"; }}
                >
                    🎁 {t('demo.upgradeBarCoupon')}
                </button>
                <button
                    onClick={() => navigate("/pricing")}
                    style={{
                        padding: "9px 20px", borderRadius: 10, border: "none",
                        background: "linear-gradient(135deg,#a855f7,#6366f1)",
                        color: "#fff", fontWeight: 800, fontSize: 12, cursor: "pointer",
                        boxShadow: "0 4px 16px rgba(168,85,247,0.4)",
                        transition: "all 150ms",
                    }}
                    onMouseOver={e => { e.currentTarget.style.transform = "translateY(-1px)"; }}
                    onMouseOut={e => { e.currentTarget.style.transform = "none"; }}
                >
                    💎 {t('demo.upgradeBarMembership')}
                </button>
                <button
                    onClick={() => setDismissed(true)}
                    style={{
                        width: 30, height: 30, borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)",
                        background: "transparent", color: "rgba(255,255,255,0.3)",
                        fontSize: 14, cursor: "pointer", display: "flex",
                        alignItems: "center", justifyContent: "center",
                    }}
                    title={t('close') || 'Close'}
                >✕</button>
            </div>
        </div>
    );
}
