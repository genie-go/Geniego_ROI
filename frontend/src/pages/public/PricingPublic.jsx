import React, { useState, useEffect, useCallback, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import PublicLayout from "../../layout/PublicLayout.jsx";

/**
 * 172차 PHASE 1-A — hardcoded PLANS 제거 → backend `/auth/pricing/public-plans` 기반 동적 fetch.
 * admin이 가격/priceId/features 를 DB 에서 편집하면 즉시 반영 (재빌드 불필요).
 * fallback: 옛 build-time env 변수 + hardcoded default (graceful degradation).
 */
const PLAN_UI_META = {
  starter:    { color: "#4f8ef7", tagAuto: null },
  pro:        { color: "#6366f1", tagAuto: "Most Popular" },
  enterprise: { color: "#a855f7", tagAuto: "Custom" },
};

// fallback: backend 응답 실패 시 사용 (운영 cold start 또는 backend 다운)
const FALLBACK_PLANS = [
    {
        id: "starter", name: "Starter", priceMonthly: 49, priceAnnual: 39,
        tag: null, color: "#4f8ef7",
        desc: "Perfect for small teams managing a few channels.",
        priceIdMonthly: import.meta.env.VITE_PADDLE_PRICE_STARTER_MONTHLY || "",
        priceIdAnnual: import.meta.env.VITE_PADDLE_PRICE_STARTER_ANNUAL || "",
        features: [
            "3 sales channels", "1 warehouse (WMS)", "Marketing analytics dashboard",
            "Up to 2 team members", "10,000 API calls / month", "Email support (48h)",
        ],
        notIncluded: ["AI Intelligence", "Influencer evaluation", "International invoice"],
    },
    {
        id: "pro", name: "Pro", priceMonthly: 149, priceAnnual: 119,
        tag: "Most Popular", color: "#6366f1",
        desc: "For growing brands with multi-channel operations.",
        priceIdMonthly: import.meta.env.VITE_PADDLE_PRICE_PRO_MONTHLY || "",
        priceIdAnnual: import.meta.env.VITE_PADDLE_PRICE_PRO_ANNUAL || "",
        features: [
            "Unlimited sales channels", "Unlimited warehouses (WMS)", "AI Marketing Intelligence",
            "Influencer evaluation engine", "Commercial invoice auto-gen", "Up to 10 team members",
            "500,000 API calls / month", "Priority support (8h)",
        ],
        notIncluded: ["Custom AI models", "Dedicated account manager"],
    },
    {
        id: "enterprise", name: "Enterprise", priceMonthly: null, priceAnnual: null,
        tag: "Custom", color: "#a855f7",
        desc: "For large-scale operations requiring full customization.",
        priceIdMonthly: "", priceIdAnnual: "",
        features: [
            "Everything in Pro", "Custom AI model training", "Dedicated account manager",
            "SLA 99.9% uptime guarantee", "Unlimited team members", "Unlimited API calls",
            "Custom integrations & webhooks", "On-premise deployment option",
        ],
        notIncluded: [],
    },
];

/**
 * backend 응답 → frontend PLANS 형식 변환.
 * - price_usd → priceMonthly
 * - price_annual_usd → priceAnnual (이미 월 환산값)
 * - is_custom_quote=true → priceMonthly null (enterprise 패턴)
 * - periods → 173차 신규: 1/3/6/12개월 cycle 별 paddle_price_id 매트릭스
 */
function hydratePlanFromApi(p) {
  const meta = PLAN_UI_META[p.id] || { color: "#4f8ef7", tagAuto: null };
  // 173차 — periods 배열 보존 (cycle 토글 + 자동 priceId 매칭)
  const periods = Array.isArray(p.periods) ? p.periods : [];
  // periods 가 비어있으면 legacy price_id_monthly / price_id_annual 로 fallback period 2종 합성
  const periodsHydrated = periods.length > 0 ? periods : [
    p.price_id_monthly ? { period_months: 1,  price_usd: p.price_usd ?? null, paddle_price_id: p.price_id_monthly, discount_pct: 0, total_charge: p.price_usd ?? null } : null,
    p.price_id_annual  ? { period_months: 12, price_usd: p.price_annual_usd ?? null, paddle_price_id: p.price_id_annual, discount_pct: 20, total_charge: (p.price_annual_usd != null ? p.price_annual_usd * 12 : null) } : null,
  ].filter(Boolean);
  return {
    id: p.id,
    name: p.name || p.id,
    priceMonthly: p.is_custom_quote ? null : (p.price_usd ?? null),
    priceAnnual:  p.is_custom_quote ? null : (p.price_annual_usd ?? null),
    tag: p.is_custom_quote ? "Custom" : meta.tagAuto,
    color: meta.color,
    desc: p.description || "",
    priceIdMonthly: p.price_id_monthly || "",
    priceIdAnnual:  p.price_id_annual  || "",
    features: Array.isArray(p.features) ? p.features : [],
    notIncluded: [],
    isCustomQuote: !!p.is_custom_quote,
    periods: periodsHydrated,
    // 179차 — admin plan_menu_access 와 동기화: 이 플랜이 제공하는 메뉴·기능 수
    menuAccessCount: Array.isArray(p.menuAccess) ? p.menuAccess.length : 0,
  };
}

// 173차 — cycle 옵션 (1/3/6/12 개월). admin DB 의 period_months 와 정합.
const CYCLE_OPTIONS = [
  { months: 1,  label: "Monthly",       short: "1mo" },
  { months: 3,  label: "Quarterly",     short: "3mo" },
  { months: 6,  label: "Semi-Annual",   short: "6mo" },
  { months: 12, label: "Annual",        short: "12mo" },
];

/** plan.periods 에서 month 매칭. 없으면 가장 가까운 (>=) period fallback. */
function findPeriod(plan, months) {
  if (!plan?.periods || plan.periods.length === 0) return null;
  const exact = plan.periods.find(pp => pp.period_months === months);
  if (exact) return exact;
  // fallback: 가장 가까운 더 작은 period (소비자 친화: 작은 약정으로)
  const sorted = [...plan.periods].sort((a, b) => a.period_months - b.period_months);
  const lower = [...sorted].reverse().find(pp => pp.period_months <= months);
  return lower || sorted[0];
}

const FAQS = [
    { q: "Can I cancel anytime?", a: "Yes — cancel any time from your account settings. Your access continues until the end of your current billing cycle. No cancellation fees." },
    { q: "What payment methods are accepted?", a: "Credit and debit cards only (Visa, Mastercard, American Express, and other major networks) via Paddle.com — our Merchant of Record. Paddle handles VAT/GST/sales-tax compliance globally and bills in USD." },
    { q: "Which billing cycles are available?", a: "Four cycles: Monthly (1 month), Quarterly (3 months), Semi-Annual (6 months), and Annual (12 months). Longer cycles unlock larger discounts. All cycles renew automatically at the chosen interval." },
    { q: "Is there a free trial?", a: "Every new account starts on a free Demo plan with no card required. Explore the platform at your own pace, then upgrade when you're ready — backed by our 30-day money-back guarantee." },
    { q: "How does billing work for longer cycles?", a: "Quarterly, semi-annual, and annual plans are billed once upfront for the full cycle. The effective monthly rate is shown next to each cycle option above. You can switch cycles or plans at any time; changes take effect at the next renewal." },
    { q: "Will taxes be added to my bill?", a: "Paddle handles all VAT/GST/sales-tax compliance globally. Applicable taxes are calculated and shown at checkout based on your location. Your invoice will include a detailed tax breakdown." },
    { q: "What happens if my payment fails?", a: "Paddle automatically retries failed card payments on a fixed schedule (typically days 1, 3, 5, 7). You'll receive email notifications at each retry. If all retries fail, your plan is paused (not cancelled) and can be resumed any time within 90 days." },
    { q: "How do refunds work?", a: "First-time subscribers get a full refund within 30 days, no questions asked. Refunds return to the same card and your account is automatically downgraded to the Demo plan. See our Refund Policy for full details." },
];

const COMPARISON = [
    { feature: "Sales Channels", starter: "3", pro: "Unlimited", enterprise: "Unlimited" },
    { feature: "Warehouses (WMS)", starter: "1", pro: "Unlimited", enterprise: "Unlimited" },
    { feature: "Team Members", starter: "2", pro: "10", enterprise: "Unlimited" },
    { feature: "API Calls / Month", starter: "10,000", pro: "500,000", enterprise: "Unlimited" },
    { feature: "AI Marketing Intelligence", starter: "—", pro: "✓", enterprise: "✓" },
    { feature: "Influencer Analytics", starter: "—", pro: "✓", enterprise: "✓" },
    { feature: "Custom AI Models", starter: "—", pro: "—", enterprise: "✓" },
    { feature: "Dedicated Account Manager", starter: "—", pro: "—", enterprise: "✓" },
    { feature: "SLA Guarantee", starter: "—", pro: "99.5%", enterprise: "99.9%" },
    { feature: "Support Response", starter: "48h", pro: "8h", enterprise: "1h" },
];

let paddleInitialized = false;
function loadPaddleV2(clientToken) {
    return new Promise((resolve, reject) => {
        if (paddleInitialized && window.Paddle) { resolve(); return; }
        if (window.Paddle) {
            try {
                const env = import.meta.env.VITE_PADDLE_ENV || "sandbox";
                if (env === "sandbox") window.Paddle.Environment.set("sandbox");
                window.Paddle.Initialize({ token: clientToken });
                paddleInitialized = true; resolve();
            } catch { resolve(); }
            return;
        }
        const s = document.createElement("script");
        s.src = "https://cdn.paddle.com/paddle/v2/paddle.js";
        s.onload = () => {
            const env = import.meta.env.VITE_PADDLE_ENV || "sandbox";
            if (env === "sandbox") window.Paddle.Environment.set("sandbox");
            window.Paddle.Initialize({ token: clientToken });
            paddleInitialized = true; resolve();
        };
        s.onerror = reject;
        document.head.appendChild(s);
    });
}

export default function PricingPublic() {
    // 173차 — monthly/annual toggle → cycle 토글 (1/3/6/12개월) 로 치환
    const [cycleMonths, setCycleMonths] = useState(1);
    const [loading, setLoading] = useState({});
    const [success, setSuccess] = useState(false);
    const [faqOpen, setFaqOpen] = useState(null);
    const [showComparison, setShowComparison] = useState(false);
    const [clientToken, setClientToken] = useState(import.meta.env.VITE_PADDLE_CLIENT_TOKEN || "");
    // 172차 PHASE 1-A — plans 를 backend 에서 동적 fetch
    const [plans, setPlans] = useState(FALLBACK_PLANS);
    const [plansLoaded, setPlansLoaded] = useState(false);
    // 173차 — 가입 후 navigate("/pricing", {state: {autoCheckout: {planId, cycleMonths}}}) 수신
    const location = useLocation();
    const navigate = useNavigate();
    const autoCheckoutPending = useRef(null); // {planId, cycleMonths}
    const [couponBanner, setCouponBanner] = useState(null);

    useEffect(() => {
        // location.state.autoCheckout: AuthPage 가입 완료 후 자동 진입
        const st = location.state;
        if (st?.autoCheckout?.planId) {
            autoCheckoutPending.current = {
                planId: String(st.autoCheckout.planId),
                cycleMonths: Number(st.autoCheckout.cycleMonths) || 1,
            };
            setCycleMonths(autoCheckoutPending.current.cycleMonths);
        }
        if (st?.couponAlert?.ok) setCouponBanner(st.couponAlert);
        // 한 번 처리한 후 navigate state 정리 (새로고침 시 재트리거 방지)
        if (st && (st.autoCheckout || st.couponAlert)) {
            navigate(location.pathname, { replace: true, state: null });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        const apiBase = import.meta.env.VITE_API_BASE || "";
        // Paddle clientToken (backend .env 또는 admin DB)
        fetch(`${apiBase}/api/v423/paddle/config`).then(r => r.json()).then(d => { if (d.clientToken) setClientToken(d.clientToken); }).catch(() => {});
        // Pricing plans (plan_config + plan_period_pricing 기반)
        fetch(`${apiBase}/auth/pricing/public-plans`).then(r => r.json()).then(d => {
            if (d?.ok && Array.isArray(d.plans) && d.plans.length > 0) {
                setPlans(d.plans.map(hydratePlanFromApi));
            }
        })
        .catch(() => { /* fallback to default plans */ })
        .finally(() => setPlansLoaded(true));
    }, []);

    useEffect(() => { if (clientToken) loadPaddleV2(clientToken).catch(console.error); }, [clientToken]);

    const checkout = useCallback(async (plan, cycleArg) => {
        // is_custom_quote (Enterprise) → mailto. period 도 없으면 동일.
        const hasAnyPriceId = plan.priceIdMonthly || plan.priceIdAnnual || (plan.periods || []).some(pp => pp.paddle_price_id);
        if (!hasAnyPriceId || plan.isCustomQuote) {
            window.location.href = `mailto:support@genie-go.com?subject=${encodeURIComponent(plan.name + " Plan Inquiry")}`;
            return;
        }
        const months = Number(cycleArg ?? cycleMonths) || 1;
        // 173차 — periods 우선 매칭. legacy fallback (1m→priceIdMonthly, 12m→priceIdAnnual)
        let priceId = "";
        const period = findPeriod(plan, months);
        if (period?.paddle_price_id) {
            priceId = period.paddle_price_id;
        } else if (months === 12 && plan.priceIdAnnual) {
            priceId = plan.priceIdAnnual;
        } else if (plan.priceIdMonthly) {
            priceId = plan.priceIdMonthly;
        }
        if (!priceId) {
            alert(`${months}-month pricing not yet configured for ${plan.name}. Please choose a different cycle or contact support@genie-go.com.`);
            return;
        }
        setLoading(p => ({ ...p, [plan.id]: true }));
        try {
            if (!clientToken) throw new Error("Payment system not configured");
            await loadPaddleV2(clientToken);
            // customData: webhook 처리 시 cycle/plan 식별 (Paddle 가 webhook payload 에 포함시킴)
            window.Paddle.Checkout.open({
                items: [{ priceId, quantity: 1 }],
                customData: { plan_id: plan.id, cycle_months: months },
                // 168차 N-152-F: 카드 전용 강제 (allowedPaymentMethods=['card']).
                // spec: docs/spec/n152f_billing_usd_card_only.md §2.3
                settings: {
                    displayMode: "overlay",
                    theme: "dark",
                    locale: "en",
                    allowedPaymentMethods: ["card"],
                },
                successCallback: () => setSuccess(true),
            });
        } catch (e) {
            console.error("Paddle checkout error:", e);
            alert("Unable to open checkout. Please try again or contact support@genie-go.com.");
        } finally {
            setLoading(p => ({ ...p, [plan.id]: false }));
        }
    }, [cycleMonths, clientToken]);

    // 173차 — autoCheckout: plans + clientToken 모두 준비되면 자동 호출
    useEffect(() => {
        if (!plansLoaded || !clientToken || !autoCheckoutPending.current) return;
        const pending = autoCheckoutPending.current;
        const plan = plans.find(p => p.id === pending.planId);
        if (!plan) { autoCheckoutPending.current = null; return; }
        autoCheckoutPending.current = null;
        // 소액 지연으로 SDK init 완료 보장
        const t = setTimeout(() => checkout(plan, pending.cycleMonths), 250);
        return () => clearTimeout(t);
    }, [plansLoaded, clientToken, plans, checkout]);

    return (
        <PublicLayout>
            <section style={{ padding: "80px 28px 100px", textAlign: "center", position: "relative" }}>
                <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: 800, height: 300, borderRadius: "50%", background: "radial-gradient(ellipse, rgba(99,102,241,0.08) 0%, transparent 70%)", pointerEvents: "none" }} />

                <div className="pub-section pub-fadeUp">
                    <div style={{ display: "inline-block", padding: "5px 20px", borderRadius: 99, background: "rgba(79,142,247,0.08)", border: "1px solid rgba(79,142,247,0.25)", fontSize: 11, color: "#4f8ef7", fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 24 }}>
                        Simple, Transparent Pricing
                    </div>
                    <h1 style={{ fontSize: 44, fontWeight: 900, margin: "0 0 14px", color: "#fff", letterSpacing: -1.5 }}>Plans that grow with you</h1>
                    <p style={{ fontSize: 15, color: "var(--text-3)", marginBottom: 8 }}>
                        No hidden fees. Cancel anytime.{" "}
                        <Link to="/refund" style={{ color: "#4f8ef7", fontWeight: 600 }}>30-day money-back guarantee.</Link>
                    </p>

                    {success && (
                        <div style={{ margin: "24px auto", maxWidth: 560, padding: "18px 24px", borderRadius: 14, background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.25)", color: "#22c55e", fontSize: 14, fontWeight: 600 }}>
                            ✅ Payment received! Your account is being activated — confirmation via email.
                        </div>
                    )}

                    {couponBanner && (
                        <div style={{ margin: "16px auto 0", maxWidth: 560, padding: "14px 22px", borderRadius: 14, background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)", color: "#f59e0b", fontSize: 13, fontWeight: 600 }}>
                            🎟️ Coupon applied — {couponBanner.message || couponBanner.code || "free access granted"}.
                        </div>
                    )}

                    {/* 173차 — Cycle 토글: 1/3/6/12 개월 */}
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 4, margin: "32px 0 16px", padding: 4, borderRadius: 99, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                        {CYCLE_OPTIONS.map(opt => {
                            const active = cycleMonths === opt.months;
                            return (
                                <button key={opt.months}
                                    onClick={() => setCycleMonths(opt.months)}
                                    style={{
                                        padding: "8px 16px", borderRadius: 99, border: "none",
                                        background: active ? "linear-gradient(135deg,#4f8ef7,#6366f1)" : "transparent",
                                        color: active ? "#fff" : "rgba(255,255,255,0.55)",
                                        fontSize: 12, fontWeight: 700, cursor: "pointer",
                                        transition: "all 200ms",
                                        boxShadow: active ? "0 2px 12px rgba(79,142,247,0.3)" : "none",
                                    }}>
                                    {opt.label}
                                    {opt.months > 1 && (
                                        <span style={{ fontSize: 10, marginLeft: 6, opacity: active ? 0.85 : 0.5 }}>
                                            ({opt.short})
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                    <p style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 32 }}>
                        Longer cycles unlock larger discounts. All cycles billed upfront via Paddle. <strong style={{ color: "rgba(255,255,255,0.45)" }}>Card payments only</strong>.
                    </p>

                    {/* Plan cards */}
                    <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(plans.length, 3)},1fr)`, gap: 16, maxWidth: 1040, margin: "0 auto" }}>
                        {plans.map(plan => {
                            // 173차 — period 기반 가격 산정. periods 가 비어있으면 legacy (1m/12m) fallback.
                            const period = plan.isCustomQuote ? null : findPeriod(plan, cycleMonths);
                            const monthlyPrice = period?.price_usd ?? (cycleMonths === 12 ? plan.priceAnnual : plan.priceMonthly);
                            const totalCharge = period?.total_charge ?? (monthlyPrice != null ? monthlyPrice * cycleMonths : null);
                            const discountPct = period?.discount_pct ?? (cycleMonths === 12 ? 20 : 0);
                            const isPro = plan.id === "pro";
                            return (
                                <div key={plan.id} style={{
                                    padding: "36px 28px", borderRadius: 20, position: "relative", textAlign: "left",
                                    background: isPro ? "linear-gradient(155deg,rgba(99,102,241,0.1),rgba(79,142,247,0.05))" : "rgba(255,255,255,0.02)",
                                    border: isPro ? "1px solid rgba(99,102,241,0.35)" : "1px solid rgba(255,255,255,0.07)",
                                    transform: isPro ? "scale(1.02)" : "none",
                                    boxShadow: isPro ? "0 0 60px rgba(99,102,241,0.1)" : "none",
                                    transition: "all 300ms",
                                }}
                                    onMouseEnter={e => { if (!isPro) { e.currentTarget.style.borderColor = plan.color + "40"; e.currentTarget.style.transform = "translateY(-4px)"; } }}
                                    onMouseLeave={e => { if (!isPro) { e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; e.currentTarget.style.transform = "none"; } }}
                                >
                                    {plan.tag && (
                                        <div style={{ position: "absolute", top: -13, left: "50%", transform: "translateX(-50%)", padding: "4px 20px", borderRadius: 99, background: `linear-gradient(135deg,${plan.color},${plan.color}cc)`, fontSize: 10, fontWeight: 800, color: "#fff", whiteSpace: "nowrap", letterSpacing: 0.5, boxShadow: `0 0 20px ${plan.color}30` }}>{plan.tag}</div>
                                    )}
                                    <div style={{ fontSize: 11, fontWeight: 700, color: plan.color, letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>{plan.name}</div>
                                    <div style={{ fontSize: 12, color: "var(--text-3)", marginBottom: 24, lineHeight: 1.6, minHeight: 38 }}>{plan.desc}</div>

                                    <div style={{ marginBottom: 28 }}>
                                        {monthlyPrice !== null && !plan.isCustomQuote ? (
                                            <>
                                                <span style={{ fontSize: 48, fontWeight: 900, color: "#fff", letterSpacing: -2 }}>${Math.round(monthlyPrice * 100) / 100}</span>
                                                <span style={{ fontSize: 14, color: "var(--text-3)", marginLeft: 4 }}>/mo</span>
                                                {cycleMonths > 1 && totalCharge != null && (
                                                    <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 6 }}>
                                                        Billed every {cycleMonths} months (${Math.round(totalCharge * 100) / 100})
                                                        {discountPct > 0 && (
                                                            <span style={{ color: "#22c55e", fontWeight: 700, marginLeft: 6, padding: "1px 7px", borderRadius: 6, background: "rgba(34,197,94,0.1)" }}>
                                                                Save {discountPct}%
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </>
                                        ) : (
                                            <span style={{ fontSize: 36, fontWeight: 900, color: "#fff" }}>Custom</span>
                                        )}
                                    </div>

                                    <button onClick={() => checkout(plan)} disabled={!!loading[plan.id]}
                                        style={{ width: "100%", padding: "14px 0", borderRadius: 12, border: "none", cursor: loading[plan.id] ? "default" : "pointer", fontWeight: 800, fontSize: 14, background: isPro ? "linear-gradient(135deg,#4f8ef7,#7c3aed)" : "rgba(255,255,255,0.06)", color: "#fff", marginBottom: 28, opacity: loading[plan.id] ? 0.6 : 1, transition: "all 200ms", boxShadow: isPro ? "0 0 30px rgba(79,142,247,0.2)" : "none" }}>
                                        {loading[plan.id] ? "Opening checkout…" : (plan.isCustomQuote || !monthlyPrice) ? "Contact Sales" : "Get Started"}
                                    </button>

                                    {plan.menuAccessCount > 0 && (
                                        <div style={{
                                            display: "flex", alignItems: "center", gap: 8, marginBottom: 16, padding: "8px 12px",
                                            borderRadius: 10, background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)",
                                        }}>
                                            <span style={{ fontSize: 14 }}>🧩</span>
                                            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.78)" }}>
                                                <strong style={{ color: "#22c55e" }}>{plan.menuAccessCount}개</strong> 메뉴·기능 이용 가능
                                            </span>
                                        </div>
                                    )}

                                    <div style={{ display: "grid", gap: 10 }}>
                                        {plan.features.map(f => (
                                            <div key={f} style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 12, color: "rgba(255,255,255,0.7)" }}>
                                                <span style={{ color: "#22c55e", marginTop: 1, flexShrink: 0, fontSize: 12 }}>✓</span>{f}
                                            </div>
                                        ))}
                                        {plan.notIncluded.map(f => (
                                            <div key={f} style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 12, color: "rgba(255,255,255,0.2)" }}>
                                                <span style={{ marginTop: 1, flexShrink: 0 }}>✕</span>{f}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Trust signals */}
                    <div style={{ marginTop: 56, display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, maxWidth: 720, marginLeft: "auto", marginRight: "auto" }}>
                        {[
                            { icon: "🔒", title: "Secure Payments", desc: "PCI DSS Level 1 certified via Paddle", color: "#4f8ef7" },
                            { icon: "↩", title: "30-Day Refund", desc: "Full refund, no questions asked", color: "#22c55e" },
                            { icon: "🌍", title: "Global Billing", desc: "100+ currencies, VAT handled automatically", color: "#a855f7" },
                        ].map(t => (
                            <div key={t.title} style={{ padding: "24px 20px", borderRadius: 16, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", textAlign: "center", transition: "border-color 300ms" }}
                                onMouseEnter={e => e.currentTarget.style.borderColor = t.color + "40"}
                                onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"}>
                                <div style={{ fontSize: 24, marginBottom: 10 }}>{t.icon}</div>
                                <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 6 }}>{t.title}</div>
                                <div style={{ fontSize: 11, color: "var(--text-3)" }}>{t.desc}</div>
                            </div>
                        ))}
                    </div>

                    {/* Comparison button */}
                    <div style={{ marginTop: 48 }}>
                        <button onClick={() => setShowComparison(c => !c)} style={{ padding: "12px 28px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.03)", color: "rgba(255,255,255,0.7)", fontSize: 13, fontWeight: 700, cursor: "pointer", transition: "all 200ms" }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(79,142,247,0.3)"; e.currentTarget.style.color = "#fff"; }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; e.currentTarget.style.color = "rgba(255,255,255,0.7)"; }}>
                            {showComparison ? "Hide" : "View"} Full Feature Comparison {showComparison ? "↑" : "↓"}
                        </button>
                    </div>

                    {/* Comparison table */}
                    {showComparison && (
                        <div style={{ marginTop: 32, maxWidth: 900, marginLeft: "auto", marginRight: "auto", borderRadius: 18, overflow: "hidden", border: "1px solid rgba(255,255,255,0.07)" }}>
                            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                                <thead>
                                    <tr style={{ background: "rgba(79,142,247,0.06)" }}>
                                        <th style={{ padding: "16px 20px", textAlign: "left", color: "rgba(255,255,255,0.6)", fontWeight: 600, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>Feature</th>
                                        <th style={{ padding: "16px 20px", textAlign: "center", color: "#4f8ef7", fontWeight: 700, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>Starter</th>
                                        <th style={{ padding: "16px 20px", textAlign: "center", color: "#6366f1", fontWeight: 700, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>Pro</th>
                                        <th style={{ padding: "16px 20px", textAlign: "center", color: "#a855f7", fontWeight: 700, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>Enterprise</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {COMPARISON.map((row, i) => (
                                        <tr key={row.feature} style={{ background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.015)" }}>
                                            <td style={{ padding: "12px 20px", color: "rgba(255,255,255,0.6)", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>{row.feature}</td>
                                            <td style={{ padding: "12px 20px", textAlign: "center", color: row.starter === "✓" ? "#22c55e" : row.starter === "—" ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.7)", fontWeight: 600, borderBottom: "1px solid rgba(255,255,255,0.04)" }}>{row.starter}</td>
                                            <td style={{ padding: "12px 20px", textAlign: "center", color: row.pro === "✓" ? "#22c55e" : row.pro === "—" ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.7)", fontWeight: 600, borderBottom: "1px solid rgba(255,255,255,0.04)" }}>{row.pro}</td>
                                            <td style={{ padding: "12px 20px", textAlign: "center", color: row.enterprise === "✓" ? "#22c55e" : "rgba(255,255,255,0.7)", fontWeight: 600, borderBottom: "1px solid rgba(255,255,255,0.04)" }}>{row.enterprise}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* FAQ */}
                    <div style={{ marginTop: 80, maxWidth: 720, marginLeft: "auto", marginRight: "auto", textAlign: "left" }}>
                        <div style={{ textAlign: "center", marginBottom: 40 }}>
                            <h2 style={{ fontSize: 28, fontWeight: 900, color: "#fff", letterSpacing: -0.5 }}>Frequently Asked Questions</h2>
                        </div>
                        {FAQS.map((item, i) => (
                            <div key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                                <button onClick={() => setFaqOpen(faqOpen === i ? null : i)}
                                    style={{ width: "100%", textAlign: "left", background: "none", border: "none", padding: "20px 0", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", color: "#fff", fontSize: 14, fontWeight: 700 }}>
                                    {item.q}
                                    <span style={{ fontSize: 20, color: "var(--text-3)", transition: "transform 300ms", transform: faqOpen === i ? "rotate(45deg)" : "none", flexShrink: 0, marginLeft: 16 }}>+</span>
                                </button>
                                <div style={{ maxHeight: faqOpen === i ? 200 : 0, overflow: "hidden", transition: "max-height 300ms ease-in-out" }}>
                                    <div style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", lineHeight: 1.9, paddingBottom: 20 }}>{item.a}</div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Legal */}
                    <p style={{ marginTop: 56, fontSize: 11, color: "rgba(255,255,255,0.25)", lineHeight: 1.8 }}>
                        By purchasing, you agree to our{" "}
                        <Link to="/terms" style={{ color: "#4f8ef7" }}>Terms of Service</Link> and{" "}
                        <Link to="/privacy" style={{ color: "#4f8ef7" }}>Privacy Policy</Link>.<br />
                        All prices in USD. <strong style={{ color: "rgba(255,255,255,0.45)" }}>Card payments only</strong>. Taxes may apply depending on your location. Powered by Paddle.com (Merchant of Record).
                    </p>
                </div>
            </section>
        </PublicLayout>
    );
}
