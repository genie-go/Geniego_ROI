import React from "react";
import { useT } from '../i18n';
import { useAuth } from "../auth/AuthContext.jsx";
import { useNavigate } from "react-router-dom";

/**
 * ProGate — Pro Plan 잠금 오버레이
 *
 * 사용법:
 *   <ProGate feature="데이터 내보내기">
 *     <ExportButton />
 *   </ProGate>
 *
 * isPro이면 children 렌더, 아니면 잠금 오버레이 표시
 */
export default function ProGate({ children, feature = "This feature", compact = false, blur = true }) {
    const { isPro, isSubscriptionExpired, subscriptionExpiresAt } = useAuth();
    const navigate = useNavigate();

    if (isPro) return children;

    const isExpiry = isSubscriptionExpired && subscriptionExpiresAt;

    if (compact) {
        return (
            <div
                onClick={() => navigate("/pricing")}
                title={`${feature}is for Pro Plan only`}
                style={{
                    display: "inline-flex", alignItems: "center", gap: 4,
                    padding: "4px 10px", borderRadius: 6, cursor: "pointer",
                    background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.3)",
                    fontSize: 11, fontWeight: 700, color: "#f59e0b", whiteSpace: "nowrap",
                }}
            >
                🔒 Pro
            </div>
        );
    }

    return (
        <div style={{ position: "relative", userSelect: "none" }}>
            {/* 블러 처리된 배경 */}
            {blur && (
                <div style={{
                    filter: "blur(4px) brightness(0.4)",
                    pointerEvents: "none",
                    overflow: "hidden",
                    maxHeight: 280,
                }}>
                    {children}
                </div>
            )}

            {/* 잠금 오버레이 */}
            <div style={{
                position: blur ? "absolute" : "relative",
                inset: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 12,
                padding: "32px 24px",
                background: blur
                    ? "rgba(9,15,30,0.75)"
                    : "linear-gradient(135deg,rgba(79,142,247,0.06),rgba(168,85,247,0.05))",
                borderRadius: 14,
                border: blur ? "none" : "1px solid rgba(245,158,11,0.25)",
                backdropFilter: blur ? "blur(2px)" : "none",
                textAlign: "center",
                zIndex: 10,
            }}>
                <div style={{ fontSize: 36 }}>{isExpiry ? "⏰" : "🔒"}</div>
                <div style={{ fontWeight: 900, fontSize: 15, color: "#f59e0b" }}>
                    {isExpiry ? "Pro 구독 만료" : "Pro Plan 전용"}
                </div>
                <div style={{ fontSize: 12, color: "var(--text-3)", lineHeight: 1.6, maxWidth: 280 }}>
                    {isExpiry
                        ? `구독이 만료되었습니다. Pro를 갱신하면 ${feature}을 다시 이용할 수 있습니다.`
                        : `${feature}은 Pro Plan에서만 이용 가능합니다.\nPro로 Upgrade하면 모든 기능을 무제한으로 사용하세요.`
                    }
                </div>
                <button
                    onClick={() => navigate("/pricing")}
                    style={{
                        padding: "10px 28px", borderRadius: 10, border: "none", cursor: "pointer",
                        background: "linear-gradient(135deg,#4f8ef7,#a855f7)",
                        color: 'var(--text-1)', fontWeight: 800, fontSize: 13,
                        boxShadow: "0 4px 16px rgba(79,142,247,0.4)",
                        marginTop: 4,
                    }}
                >
                    {isExpiry ? "🔄 구독 갱신하기" : "🚀 Pro로 Upgrade"}
                </button>
            </div>
        </div>
    );
}
