import React, { useState, useEffect } from "react";
import { useAuth } from "../auth/AuthContext";
import { useT } from "../i18n";

/**
 * DemoModeBanner
 *
 * Demo Mode User에게만 표시되는 상단 고정 배너.
 * - 가상 데이터 체험 중임을 안내
 * - API 키 등록 → 실사용 모드 전환 CTA
 * - 실사용 모드 Active화 시 Success 토스트 표시
 */
export default function DemoModeBanner() {
    const { isDemo, hasRealKeys } = useAuth();
    const t = useT();
    const [showActivated, setShowActivated] = useState(false);
    const prevHasRealKeys = React.useRef(hasRealKeys);

    useEffect(() => {
        if (!prevHasRealKeys.current && hasRealKeys) {
            setShowActivated(true);
            const timer = setTimeout(() => setShowActivated(false), 5000);
            prevHasRealKeys.current = true;
            return () => clearTimeout(timer);
        }
        prevHasRealKeys.current = hasRealKeys;
    }, [hasRealKeys]);

    if (showActivated) {
        return (
            <div style={{
                position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
                zIndex: 99999, pointerEvents: "none",
                animation: "slideUpFade 0.4s ease",
            }}>
                <div style={{
                    background: "linear-gradient(135deg, #22c55e, #16a34a)",
                    borderRadius: 16, padding: "14px 24px",
                    display: "flex", alignItems: "center", gap: 12,
                    boxShadow: "0 8px 40px rgba(34,197,94,0.4)",
                    border: "1px solid rgba(255,255,255,0.2)",
                    minWidth: 320,
                }}>
                    <span style={{ fontSize: 28 }}>⚡</span>
                    <div>
                        <div style={{ fontWeight: 800, fontSize: 14, color: "#fff" }}>
                            {t('demo.demoActivatedTitle')}
                        </div>
                        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.85)", marginTop: 2 }}>
                            {t('demo.demoActivatedDesc')}
                        </div>
                    </div>
                </div>
                <style>{`@keyframes slideUpFade { from { opacity:0; transform:translateX(-50%) translateY(20px); } to { opacity:1; transform:translateX(-50%) translateY(0); } }`}</style>
            </div>
        );
    }

    if (!isDemo) return null;

    return (
        <>
            <style>{`
                .demo-banner-wrap {
                    background: linear-gradient(90deg, rgba(234,179,8,0.12) 0%, rgba(251,191,36,0.08) 100%);
                    border-bottom: 1px solid rgba(234,179,8,0.25);
                    padding: 8px 20px;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    flex-shrink: 0;
                    flex-wrap: nowrap;
                }
                .demo-banner-desc {
                    flex: 1;
                    font-size: 11px;
                    color: rgba(255,255,255,0.6);
                    min-width: 0;
                }
                @media (max-width: 768px) {
                    .demo-banner-wrap {
                        flex-wrap: wrap !important;
                        align-items: center;
                        padding: 8px 12px !important;
                        gap: 6px 8px !important;
                    }
                    .demo-banner-badge  { flex-shrink: 0; }
                    .demo-banner-btns   { flex-shrink: 0; margin-left: auto; }
                    .demo-banner-desc {
                        order: 99;
                        flex-basis: 100% !important;
                        flex: none !important;
                        width: 100% !important;
                        font-size: 10px !important;
                        line-height: 1.5;
                        padding: 3px 4px;
                        border-left: 2px solid rgba(234,179,8,0.4);
                        margin-top: 2px;
                        color: rgba(255,255,255,0.55);
                    }
                }
            `}</style>

            <div className="demo-banner-wrap" id="demo-topbar">
                {/* 데모 배지 */}
                <div className="demo-banner-badge" style={{
                    background: "rgba(234,179,8,0.18)",
                    border: "1px solid rgba(234,179,8,0.4)",
                    borderRadius: 99,
                    padding: "3px 10px",
                    fontSize: 10, fontWeight: 800,
                    color: "#f59e0b",
                    whiteSpace: "nowrap",
                }}>
                    {t('demo.demoLockBadge')}
                </div>

                {/* 안내 메시지 */}
                <div className="demo-banner-desc">
                    <span style={{ color: "#fbbf24", fontWeight: 700 }}>
                        {t('demo.demoSampleDesc2')}
                    </span>
                    {t('demo.demoSampleDesc3')}
                </div>

                {/* CTA 버튼 그룹 */}
                <div className="demo-banner-btns" style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <a
                        href="/api-keys"
                        onClick={e => { e.preventDefault(); window.location.pathname = "/api-keys"; }}
                        style={{
                            background: "linear-gradient(135deg, #f59e0b, #d97706)",
                            border: "none",
                            borderRadius: 8,
                            padding: "6px 12px",
                            color: "#fff",
                            fontSize: 11,
                            fontWeight: 800,
                            cursor: "pointer",
                            whiteSpace: "nowrap",
                            textDecoration: "none",
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                            flexShrink: 0,
                            boxShadow: "0 2px 12px rgba(245,158,11,0.4)",
                            transition: "all 200ms",
                        }}
                        onMouseEnter={e => e.currentTarget.style.transform = "scale(1.04)"}
                        onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
                    >
                        {t('demo.demoApiRegister')}
                    </a>

                    <a
                        href="/app-pricing"
                        onClick={e => { e.preventDefault(); window.location.pathname = "/app-pricing"; }}
                        style={{
                            background: "none",
                            border: "1px solid rgba(234,179,8,0.35)",
                            borderRadius: 8,
                            padding: "5px 10px",
                            color: "#fbbf24",
                            fontSize: 11,
                            fontWeight: 700,
                            cursor: "pointer",
                            whiteSpace: "nowrap",
                            textDecoration: "none",
                            flexShrink: 0,
                        }}
                    >
                        {t('demo.demoPricingView')}
                    </a>
                </div>
            </div>
        </>
    );
}

/**
 * DemoDataBadge — 가상 데이터 표시용 소형 배지
 */
export function DemoDataBadge({ style = {} }) {
    const { isDemo } = useAuth();
    const t = useT();
    if (!isDemo) return null;
    return (
        <span style={{
            background: "rgba(234,179,8,0.12)",
            border: "1px solid rgba(234,179,8,0.3)",
            borderRadius: 99,
            padding: "1px 8px",
            fontSize: 9,
            fontWeight: 800,
            color: "#f59e0b",
            letterSpacing: "0.05em",
            ...style,
        }}>
            {t('demo.demoDataBadge')}
        </span>
    );
}
