import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useT } from "../i18n";

/**
 * DemoTopBar — Demo Mode 전역 고정 상단 바
 * - demo/free Plan User에게만 표시
 * - 모바일: 컴팩트 단행 레이아웃 (화면 방해 최소화)
 * - PC: All 정보 표시
 * - Close 버튼으로 세션 내 숨기기 가능
 */
export default function DemoTopBar() {
    const { isDemo } = useAuth();
    const navigate = useNavigate();
    const t = useT();
    const [hidden, setHidden] = useState(false);

    if (!isDemo || hidden) return null;

    return (
        <div
            id="demo-topbar"
            style={{
                position: "sticky",
                top: 0,
                zIndex: 200,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
                padding: "6px 12px",
                background: "linear-gradient(90deg,rgba(30,16,101,0.98) 0%,rgba(26,16,64,0.98) 40%,rgba(17,10,48,0.98) 100%)",
                borderBottom: "1px solid rgba(99,102,241,0.3)",
                minHeight: 40,
                flexWrap: "nowrap",
            }}
        >
            {/* 왼쪽: 데모 배지 + 안내 */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
                <span style={{
                    padding: "2px 8px", borderRadius: 99, fontSize: 9, fontWeight: 900,
                    background: "rgba(168,85,247,0.22)", color: "#c4b5fd",
                    border: "1px solid rgba(168,85,247,0.38)", letterSpacing: "0.3px",
                    whiteSpace: "nowrap", flexShrink: 0,
                }}>{t('demo.demoBadge') || '🎭 Demo'}</span>
                {/* 모바일에서는 짧은 문구만 */}
                <span style={{
                    fontSize: 10, color: "rgba(255,255,255,0.55)", whiteSpace: "nowrap",
                    overflow: "hidden", textOverflow: "ellipsis",
                }} className="demo-topbar-desc">
                    {t('demo.demoRunning') || 'Exploring with virtual data'}
                </span>
            </div>

            {/* 오른쪽: CTA 버튼 + Close */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                {/* 요금 Confirm 버튼 (모바일에서는 숨기거나 아이콘만) */}
                <button
                    onClick={() => navigate("/app-pricing")}
                    className="demo-topbar-pricing-btn"
                    style={{
                        padding: "4px 10px", borderRadius: 7,
                        background: "rgba(79,142,247,0.13)", color: "#93c5fd",
                        border: "1px solid rgba(79,142,247,0.32)",
                        fontSize: 9, fontWeight: 700, whiteSpace: "nowrap",
                        cursor: "pointer", transition: "all 150ms",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = "rgba(79,142,247,0.25)"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "rgba(79,142,247,0.13)"; }}
                >
                    📋 {t('demo.demoPriceCheck') || 'Pricing'}
                </button>

                {/* 유료 회원 가입 — 핵심 CTA */}
                <button
                    onClick={() => navigate("/login?tab=register")}
                    style={{
                        padding: "5px 12px", borderRadius: 7,
                        background: "linear-gradient(135deg,#4f8ef7,#6366f1)",
                        color: "#fff", fontWeight: 800, fontSize: 10, whiteSpace: "nowrap",
                        border: "none", cursor: "pointer",
                        boxShadow: "0 2px 10px rgba(79,142,247,0.38)",
                        transition: "all 150ms",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 4px 16px rgba(79,142,247,0.6)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
                    onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 2px 10px rgba(79,142,247,0.38)"; e.currentTarget.style.transform = "none"; }}
                >
                    {t('demo.demoJoin') || '🚀 Upgrade'}
                </button>

                {/* Close */}
                <button
                    onClick={() => setHidden(true)}
                    title={t('demo.close') || 'Close'}
                    style={{
                        width: 22, height: 22, borderRadius: 6,
                        border: "1px solid rgba(255,255,255,0.1)",
                        background: "transparent", color: "rgba(255,255,255,0.3)",
                        cursor: "pointer", fontSize: 10, display: "flex",
                        alignItems: "center", justifyContent: "center", flexShrink: 0,
                    }}
                >✕</button>
            </div>
        </div>
    );
}
