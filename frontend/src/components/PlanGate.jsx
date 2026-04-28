/**
 * PlanGate.jsx — 구독 요금제 기반 기능 접근 제어 공통 컴포넌트
 *
 * 사용법:
 *   <PlanGate feature="pixel_tracking">
 *     <PixelTrackingPage />
 *   </PlanGate>
 *
 *   또는 직접 plan 지정:
 *   <PlanGate minPlan="pro">
 *     <SomeProFeature />
 *   </PlanGate>
 */
import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import { useGlobalData } from "../context/GlobalDataContext.jsx";

import ko from '../i18n/locales/ko.js';
const t = (k) => k.split('.').reduce((o,i)=>o?.[i], {auto: ko?.auto}) || k;


/* Plan 계층 */
const PLAN_RANK = { demo: 0, pro: 1, starter: 1, enterprise: 2, admin: 3 };
const PLAN_LABEL = { demo: "", pro: "Pro", enterprise: "Enterprise", admin: "Admin" };

/* 기능별 최소 Plan 요구사항 */
const FEATURE_PLANS = {
    crm: { minPlan: "pro", icon: "👤", label: "CRM 고객관리" },
    email_marketing: { minPlan: "pro", icon: "📧", label: "이메일 마케팅" },
    kakao_channel: { minPlan: "pro", icon: "💬", label: "Kakao Channel" },
    line_channel: { minPlan: "pro", icon: "💚", label: "LINE チャンネル (일본 시장)" },
    pixel_tracking: { minPlan: "pro", icon: "🎯", label: "1st-Party 픽셀 트래킹" },
    journey_builder: { minPlan: "pro", icon: "🗺️", label: "고객 여정 빌더" },
    customer_ai: { minPlan: "pro", icon: "🤖", label: "AI 이탈/LTV 예측" },
    ab_testing: { minPlan: "pro", icon: "🔀", label: "A/B Test" },
    sms: { minPlan: "pro", icon: "📱", label: "SMS 발송" },
    omni_channel: { minPlan: "pro", icon: "🌐", label: "옴니Channel 통합관리" },
    budget_planner: { minPlan: "pro", icon: "💰", label: "광고 Budget 플래너" },
    campaign_manager: { minPlan: "pro", icon: "📣", label: "캠페인 Admin" },
    ai_rule_engine: { minPlan: "pro", icon: "🤖", label: "AI 룰 엔진" },
    wms: { minPlan: "pro", icon: "🏭", label: "WMS 창고관리" },
    ai_insights: { minPlan: "growth", icon: "💡", label: "AI 인사이트" },
    whatsapp: { minPlan: "pro", icon: "💬", label: "WhatsApp Business" },
    instagram_dm: { minPlan: "pro", icon: "📸", label: "Instagram/Facebook DM" },
    api_access: { minPlan: "enterprise", icon: "🔑", label: "API 직접 접근" },
    white_label: { minPlan: "enterprise", icon: "🏷️", label: "화이트 레이블" },
    admin_panel: { minPlan: "admin", icon: "⚙️", label: "Admin 패널" },
};

/* 결제 가격 안내 — 기본값 (GlobalDataContext planPricing으로 오버라이드 됨) */
const DEFAULT_PLAN_PRICING = {
    growth:     { monthly: "$49",  quarterly: "$39/mo",  yearly: "$29/mo" },
    pro:        { monthly: "$99",  quarterly: "$79/mo",  yearly: "$59/mo" },
    enterprise: { monthly: "$299", quarterly: "$249/mo", yearly: "$199/mo" },
    starter:    { monthly: "$19",  quarterly: "$15/mo",  yearly: "$9.90/mo" },
};

export default function PlanGate({ children, feature, minPlan, fallback }) {
    const { isPro, isAdmin, plan, isSubscriptionExpired } = useAuth();
    const navigate = useNavigate();
    // 어드민 Save 요금 동적 읽기 (GlobalDataContext) — hooks 규칙 준수
    const globalData = useGlobalData();
    const planPricingFromCtx = globalData?.planPricing
        ? { ...DEFAULT_PLAN_PRICING, ...globalData.planPricing }
        : DEFAULT_PLAN_PRICING;

    /* 요구 Plan 결정 */
    let requiredPlan = minPlan;
    let featureInfo = null;
    if (feature && FEATURE_PLANS[feature]) {
        featureInfo = FEATURE_PLANS[feature];
        requiredPlan = featureInfo.minPlan;
    }
    requiredPlan = requiredPlan || "pro";

    const userRank = PLAN_RANK[plan] ?? 0;
    const requiredRank = PLAN_RANK[requiredPlan] ?? 1;

    // ── 데모 제한 정책 (데모/Free 유저 처리 제거, 철저한 권한 체크) ──
    const isFreeUser = plan === "" || plan === "free" || !plan;
    const isAdminFeature = feature === "admin_panel" || requiredPlan === "admin";

    // admin 기능은 계속 차단, 나머지는 Plan 등급에 따라 허용
    const hasAccess = isAdminFeature
        ? (PLAN_RANK[plan] ?? 0) >= PLAN_RANK["admin"]
        : userRank >= requiredRank;

    if (hasAccess) return <>{children}</>;

    /* 잠금 화면 표시 */
    if (fallback) return <>{fallback}</>;

    const pricing = planPricingFromCtx[requiredPlan] || {};

    return (
        <div style={{
            minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center",
            padding: "48px 24px",
        }}>
            <div style={{
                maxWidth: 520, width: "100%", textAlign: "center",
                background: 'var(--surface)', borderRadius: 24,
                border: "1px solid rgba(99,140,255,0.15)",
                padding: "48px 40px",
                boxShadow: "0 24px 64px rgba(0,0,0,0.3)",
            }}>
                {/* 아이콘 */}
                <div style={{
                    width: 80, height: 80, borderRadius: 22, margin: "0 auto 20px",
                    background: isFreeUser
                        ? "linear-gradient(135deg,rgba(168,85,247,0.2),rgba(79,142,247,0.15))"
                        : "linear-gradient(135deg,rgba(79,142,247,0.15),rgba(168,85,247,0.15))",
                    border: "1px solid rgba(79,142,247,0.25)",
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36,
                }}>
                    {featureInfo ? featureInfo.icon : "🔒"}
                </div>

                {/* 제목 */}
                <div style={{ fontWeight: 900, fontSize: 20, marginBottom: 10 }}>
                    {isFreeUser
                        ? `${featureInfo ? featureInfo.icon + " " + featureInfo.label : "프리미엄 기능"}을 사용하려면 Upgrade가 필요합니다`
                        : `${PLAN_LABEL[requiredPlan]} Plan 전용 기능입니다`}
                </div>
                <div style={{ fontSize: 13, color: "var(--text-2)", marginBottom: 8, lineHeight: 1.6 }}>
                    {isFreeUser
                        ? <>기능을 열람하고 실제 캠페인을 운영하려면 <strong style={{ color: "#c084fc" }}>유료 구독 또는 Free 쿠폰</strong>이 필요합니다.</>
                        : <>{featureInfo ? featureInfo.label : "이 기능"}은 <strong style={{ color: "#4f8ef7" }}>{PLAN_LABEL[requiredPlan]} Plan 이상</strong>에서 이용 가능합니다.</>}
                </div>

                {/* 구독 만료 메시지 */}
                {isSubscriptionExpired && (
                    <div style={{
                        padding: "8px 14px", borderRadius: 10, marginBottom: 16,
                        background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)",
                        color: "#ef4444", fontSize: 12,
                    }}>
                        ⚠️ 구독이 만료되었습니다. 갱신하면 즉시 이용 가능합니다.
                    </div>
                )}

                {/* 현재 Plan 표시 */}
                <div style={{
                    display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 14px",
                    borderRadius: 20, background: 'var(--surface)',
                    border: '1px solid var(--border)', fontSize: 11,
                    color: "var(--text-3)", marginBottom: 24,
                }}>
                    현재 Plan: <strong style={{ color: plan === "pro" ? "#4f8ef7" : "var(--text-2)" }}>
                        {isSubscriptionExpired ? "만료됨" : isFreeUser ? "Free" : PLAN_LABEL[plan] || plan}
                    </strong>
                </div>

                {/* 가격 안내 */}
                {pricing.monthly && (
                    <div style={{
                        display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 24,
                    }}>
                        {[
                            { label: "Monthly", price: pricing.monthly },
                            { label: "분기 (20% 할인)", price: pricing.quarterly },
                            { label: "Annual (40% 할인)", price: pricing.yearly },
                        ].map(({ label, price }) => (
                            <div key={label} style={{
                                padding: "10px 8px", borderRadius: 12,
                                background: "rgba(79,142,247,0.06)", border: "1px solid rgba(79,142,247,0.15)",
                                fontSize: 10, color: "var(--text-2)",
                            }}>
                                <div style={{ fontWeight: 700, color: "#4f8ef7", fontSize: 12, marginBottom: 2 }}>{price}</div>
                                <div>{label}</div>
                            </div>
                        ))}
                    </div>
                )}

                {/* CTA 버튼 */}
                <div style={{ display: "grid", gap: 10 }}>
                    <button
                        onClick={() => navigate("/pricing")}
                        style={{
                            padding: "14px 0", borderRadius: 12, border: "none",
                            background: isFreeUser
                                ? "linear-gradient(135deg,#a855f7,#6366f1)"
                                : "linear-gradient(135deg,#4f8ef7,#6366f1)",
                            color: 'var(--text-1)', fontWeight: 800, fontSize: 14, cursor: "pointer",
                            boxShadow: "0 8px 24px rgba(79,142,247,0.3)",
                            transition: "all 150ms",
                        }}
                        onMouseOver={e => (e.currentTarget.style.transform = "translateY(-1px)")}
                        onMouseOut={e => (e.currentTarget.style.transform = "none")}
                    >
                        💎 지금 {PLAN_LABEL[requiredPlan] || "Pro"} Upgrade
                    </button>
                    {isFreeUser && (
                        <button
                            onClick={() => navigate("/my-coupons")}
                            style={{
                                padding: "12px 0", borderRadius: 12,
                                border: "1px solid rgba(34,197,94,0.4)",
                                background: "rgba(34,197,94,0.08)", color: "#22c55e",
                                fontWeight: 700, fontSize: 13, cursor: "pointer",
                            }}
                        >
                            🎁 Free 쿠폰으로 시작하기
                        </button>
                    )}
                    <button
                        onClick={() => navigate(-1)}
                        style={{
                            padding: "10px 0", borderRadius: 12, border: '1px solid var(--border)',
                            background: "transparent", color: "var(--text-3)", fontSize: 12, cursor: "pointer",
                        }}
                    >
                        ← 돌아가기
                    </button>
                </div>

                {/* Pro 기능 목록 */}
                {requiredPlan === "pro" && (
                    <div style={{ marginTop: 28, paddingTop: 24, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                        <div style={{ fontSize: 10, color: "var(--text-3)", marginBottom: 12 }}>
                            Pro Plan에서 이용 가능한 기능
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center" }}>
                            {Object.entries(FEATURE_PLANS)
                                .filter(([, v]) => v.minPlan === "pro")
                                .map(([key, { icon, label }]) => (
                                    <div key={key} style={{
                                        padding: "4px 10px", borderRadius: 20, fontSize: 10,
                                        background: "rgba(79,142,247,0.06)", border: "1px solid rgba(79,142,247,0.15)",
                                        color: "var(--text-2)",
                                    }}>
                                        {icon} {label}
                                    </div>
                                ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
