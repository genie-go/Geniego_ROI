import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import PlanServiceGuide from "../../components/PlanServiceGuide.jsx"; // 186차: 플랜 제공서비스 상세 안내(초고도화)
import { Link, useLocation, useNavigate } from "react-router-dom";
import PremiumLayout from "../../layout/PremiumLayout.jsx";
import { useT } from "../../i18n/index.js"; // 187차: i18n 배선(앱 내부 한국어 표기 버그 수정)

/**
 * 172차 PHASE 1-A — hardcoded PLANS 제거 → backend `/auth/pricing/public-plans` 기반 동적 fetch.
 * admin이 가격/priceId/features 를 DB 에서 편집하면 즉시 반영 (재빌드 불필요).
 * fallback: 옛 build-time env 변수 + hardcoded default (graceful degradation).
 *
 * 187차 — 3대 수정:
 *  ① i18n: 전 문구를 t('appPricing.*') 로 배선(영어 인라인 fallback). 한국어 등 15개국 현지화.
 *  ② 플랜 선택: 카드 클릭 선택 + 비-Pro 버튼 또렷하게 → 어떤 플랜이든 동등 선택.
 *  ③ 밝은 테마: /app-pricing(앱 내부)은 밝은 테마·찐한 텍스트. 공개 /pricing 은 다크 마케팅 유지.
 */
const PLAN_UI_META = {
  starter:    { color: "#4f8ef7", tagAuto: null },
  pro:        { color: "#6366f1", tagAuto: "Most Popular" },
  enterprise: { color: "#a855f7", tagAuto: "Custom" },
};

// 187차 — 표준 플랜 현지화 메타. 표준 id(starter/pro/enterprise)는 i18n 키로 번역,
// 그 외(admin 신규 플랜)는 API 값을 그대로 사용. 가격/periods 는 항상 API/숫자(언어무관).
const STD_PLAN_CONTENT = {
  starter: {
    desc: "Perfect for small teams managing a few channels.",
    features: [
      "3 sales channels", "1 warehouse (WMS)", "Marketing analytics dashboard",
      "Up to 2 team members", "10,000 API calls / month", "Email support (48h)",
    ],
    notIncluded: ["AI Intelligence", "Influencer evaluation", "International invoice"],
  },
  pro: {
    desc: "For growing brands with multi-channel operations.",
    features: [
      "Unlimited sales channels", "Unlimited warehouses (WMS)", "AI Marketing Intelligence",
      "Influencer evaluation engine", "Commercial invoice auto-gen", "Up to 10 team members",
      "500,000 API calls / month", "Priority support (8h)",
    ],
    notIncluded: ["Custom AI models", "Dedicated account manager"],
  },
  enterprise: {
    desc: "For large-scale operations requiring full customization.",
    features: [
      "Everything in Pro", "Custom AI model training", "Dedicated account manager",
      "SLA 99.9% uptime guarantee", "Unlimited team members", "Unlimited API calls",
      "Custom integrations & webhooks", "On-premise deployment option",
    ],
    notIncluded: [],
  },
};

// fallback: backend 응답 실패 시 사용 (운영 cold start 또는 backend 다운)
const FALLBACK_PLANS = [
    {
        id: "starter", name: "Starter", priceMonthly: 49, priceAnnual: 39,
        tag: null, color: "#4f8ef7", desc: STD_PLAN_CONTENT.starter.desc,
        priceIdMonthly: import.meta.env.VITE_PADDLE_PRICE_STARTER_MONTHLY || "",
        priceIdAnnual: import.meta.env.VITE_PADDLE_PRICE_STARTER_ANNUAL || "",
        features: STD_PLAN_CONTENT.starter.features,
        notIncluded: STD_PLAN_CONTENT.starter.notIncluded,
    },
    {
        id: "pro", name: "Pro", priceMonthly: 149, priceAnnual: 119,
        tag: "Most Popular", color: "#6366f1", desc: STD_PLAN_CONTENT.pro.desc,
        priceIdMonthly: import.meta.env.VITE_PADDLE_PRICE_PRO_MONTHLY || "",
        priceIdAnnual: import.meta.env.VITE_PADDLE_PRICE_PRO_ANNUAL || "",
        features: STD_PLAN_CONTENT.pro.features,
        notIncluded: STD_PLAN_CONTENT.pro.notIncluded,
    },
    {
        id: "enterprise", name: "Enterprise", priceMonthly: null, priceAnnual: null,
        tag: "Custom", color: "#a855f7", desc: STD_PLAN_CONTENT.enterprise.desc,
        priceIdMonthly: "", priceIdAnnual: "",
        features: STD_PLAN_CONTENT.enterprise.features,
        notIncluded: STD_PLAN_CONTENT.enterprise.notIncluded,
    },
];

/**
 * backend 응답 → frontend PLANS 형식 변환.
 */
function hydratePlanFromApi(p) {
  const meta = PLAN_UI_META[p.id] || { color: "#4f8ef7", tagAuto: null };
  const periods = Array.isArray(p.periods) ? p.periods : [];
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
    // 187차 — admin plan_config 동기화: limits(채널/창고/계정수 -1=무제한) + 계정수 티어·계정수별 가격 매트릭스
    limits: (p.limits && typeof p.limits === "object" && !Array.isArray(p.limits)) ? p.limits : {},
    seatTiers: Array.isArray(p.seatTiers) ? p.seatTiers : [],
    seatPricing: (p.seatPricing && typeof p.seatPricing === "object" && !Array.isArray(p.seatPricing)) ? p.seatPricing : {},
    menuAccessCount: Array.isArray(p.menuAccess) ? p.menuAccess.length : 0,
  };
}

// 187차 — admin NAMED_PERIODS 정합(월간/분기/반기/연간/2년/3년 + N개월 fallback). admin 이 1~60개월 자유 추가.
const NAMED_PERIODS = { 1: "monthly", 3: "quarterly", 6: "semiAnnual", 12: "annual", 24: "biennial", 36: "triennial" };
const NAMED_PERIOD_FALLBACK = { 1: "Monthly", 3: "Quarterly", 6: "Semi-Annual", 12: "Annual", 24: "2 Years", 36: "3 Years" };

/** 배열에서 period_months 매칭(없으면 ≤ 가장 가까운, 그래도 없으면 최소). */
function findPeriodIn(arr, months) {
  if (!Array.isArray(arr) || arr.length === 0) return null;
  const exact = arr.find(pp => pp.period_months === months);
  if (exact) return exact;
  const sorted = [...arr].sort((a, b) => a.period_months - b.period_months);
  const lower = [...sorted].reverse().find(pp => pp.period_months <= months);
  return lower || sorted[0];
}

/** 선택한 계정수(seat)의 기간 배열. seatPricing 없으면 legacy periods(계정1) fallback. */
function periodsForSeat(plan, seatKey) {
  const sp = plan && plan.seatPricing ? plan.seatPricing[seatKey] : null;
  if (Array.isArray(sp) && sp.length) return sp;
  return (plan && Array.isArray(plan.periods)) ? plan.periods : [];
}

/** limits 값 표기: -1/null/unlimited → 무제한, 그 외 숫자. */
function limitDisplay(v, unlimitedLabel) {
  if (v === -1 || v === null || v === undefined || v === "unlimited") return unlimitedLabel;
  return String(v);
}

// 173차 — cycle 옵션 (1/3/6/12 개월). admin DB 의 period_months 와 정합 (fallback 용).
const CYCLE_OPTIONS = [
  { months: 1,  key: "monthly",    label: "Monthly",      short: "1mo" },
  { months: 3,  key: "quarterly",  label: "Quarterly",    short: "3mo" },
  { months: 6,  key: "semiAnnual", label: "Semi-Annual",  short: "6mo" },
  { months: 12, key: "annual",     label: "Annual",       short: "12mo" },
];

/** plan.periods 에서 month 매칭. 없으면 가장 가까운 (>=) period fallback. */
function findPeriod(plan, months) {
  if (!plan?.periods || plan.periods.length === 0) return null;
  const exact = plan.periods.find(pp => pp.period_months === months);
  if (exact) return exact;
  const sorted = [...plan.periods].sort((a, b) => a.period_months - b.period_months);
  const lower = [...sorted].reverse().find(pp => pp.period_months <= months);
  return lower || sorted[0];
}

// 187차 — FAQ: i18n 키 + 영어 인라인 fallback.
const FAQS = [
    { key: "cancel",   q: "Can I cancel anytime?", a: "Yes — cancel any time from your account settings. Your access continues until the end of your current billing cycle. No cancellation fees." },
    { key: "payment",  q: "What payment methods are accepted?", a: "Credit and debit cards only (Visa, Mastercard, American Express, and other major networks) via Paddle.com — our Merchant of Record. Paddle handles VAT/GST/sales-tax compliance globally and bills in USD." },
    { key: "cycles",   q: "Which billing cycles are available?", a: "Four cycles: Monthly (1 month), Quarterly (3 months), Semi-Annual (6 months), and Annual (12 months). Longer cycles unlock larger discounts. All cycles renew automatically at the chosen interval." },
    { key: "trial",    q: "Is there a free trial?", a: "Every new account starts on a free Demo plan with no card required. Explore the platform at your own pace, then upgrade when you're ready — backed by our 30-day money-back guarantee." },
    { key: "longCycle",q: "How does billing work for longer cycles?", a: "Quarterly, semi-annual, and annual plans are billed once upfront for the full cycle. The effective monthly rate is shown next to each cycle option above. You can switch cycles or plans at any time; changes take effect at the next renewal." },
    { key: "tax",      q: "Will taxes be added to my bill?", a: "Paddle handles all VAT/GST/sales-tax compliance globally. Applicable taxes are calculated and shown at checkout based on your location. Your invoice will include a detailed tax breakdown." },
    { key: "failed",   q: "What happens if my payment fails?", a: "Paddle automatically retries failed card payments on a fixed schedule (typically days 1, 3, 5, 7). You'll receive email notifications at each retry. If all retries fail, your plan is paused (not cancelled) and can be resumed any time within 90 days." },
    { key: "refund",   q: "How do refunds work?", a: "First-time subscribers get a full refund within 30 days, no questions asked. Refunds return to the same card and your account is automatically downgraded to the Demo plan. See our Refund Policy for full details." },
];

// 187차 — 비교표: feature 라벨 i18n + 값(Unlimited 등) i18n.
const COMPARISON = [
    { key: "channels",  feature: "Sales Channels",            starter: "3",       pro: "{unlimited}", enterprise: "{unlimited}" },
    { key: "wms",       feature: "Warehouses (WMS)",          starter: "1",       pro: "{unlimited}", enterprise: "{unlimited}" },
    { key: "members",   feature: "Team Members",              starter: "2",       pro: "10",          enterprise: "{unlimited}" },
    { key: "api",       feature: "API Calls / Month",         starter: "10,000",  pro: "500,000",     enterprise: "{unlimited}" },
    { key: "aiMkt",     feature: "AI Marketing Intelligence", starter: "—",       pro: "✓",           enterprise: "✓" },
    { key: "influencer",feature: "Influencer Analytics",      starter: "—",       pro: "✓",           enterprise: "✓" },
    { key: "customAi",  feature: "Custom AI Models",          starter: "—",       pro: "—",           enterprise: "✓" },
    { key: "manager",   feature: "Dedicated Account Manager", starter: "—",       pro: "—",           enterprise: "✓" },
    { key: "sla",       feature: "SLA Guarantee",             starter: "—",       pro: "99.5%",       enterprise: "99.9%" },
    { key: "support",   feature: "Support Response",          starter: "48h",     pro: "8h",          enterprise: "1h" },
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

// 187차 — 테마 토큰. 앱 내부(light=true)는 밝은 배경·찐한 텍스트, 공개(light=false)는 다크 마케팅.
function buildTheme(light) {
    if (light) {
        return {
            light: true,
            pageBg: "#f8fafc",
            glow: "radial-gradient(ellipse, rgba(99,102,241,0.06) 0%, transparent 70%)",
            badgeBg: "rgba(79,142,247,0.10)", badgeBorder: "rgba(79,142,247,0.30)", badgeText: "#2563eb",
            title: "#0f172a", sub: "#475569", text3: "#64748b", link: "#2563eb",
            cycleBarBg: "#eef2f7", cycleBarBorder: "#dbe3ec", cycleInactiveText: "#475569",
            cardBg: "#ffffff", cardBorder: "#e2e8f0",
            // 187차 — Pro 카드 배경은 단색(그라데이션 금지). styles.css 의 light-theme override
            //   `[style*="background: linear-gradient"] * { color:#fff !important }` 가 그라데이션 하위
            //   모든 텍스트를 흰색으로 강제 → 밝은 카드 위 흰 글자(투명) 버그 회피.
            proCardBg: "#eef1ff", proCardBorder: "#6366f1",
            priceText: "#0f172a", featureText: "#334155", featureMuted: "#94a3b8",
            ghostBtnBg: "#ffffff",
            trustCardBg: "#ffffff", trustCardBorder: "#e2e8f0", trustTitle: "#0f172a",
            compBtnBg: "#ffffff", compBtnBorder: "#cbd5e1", compBtnText: "#334155",
            tableBorder: "#e2e8f0", tableHeadBg: "#eef2ff", tableRowAlt: "#f8fafc", tableCellText: "#475569", tableCellMuted: "#cbd5e1",
            faqBorder: "#e2e8f0", faqQ: "#0f172a", faqA: "#475569",
            legalText: "#94a3b8", legalStrong: "#64748b",
            guideHeading: "#0f172a", guideSub: "#64748b",
            selectedShadow: "0 0 0 3px rgba(99,102,241,0.18)",
            successBg: "rgba(34,197,94,0.10)", successBorder: "rgba(34,197,94,0.30)", successText: "#15803d",
            couponBg: "rgba(245,158,11,0.10)", couponBorder: "rgba(245,158,11,0.30)", couponText: "#b45309",
        };
    }
    return {
        light: false,
        pageBg: "transparent",
        glow: "radial-gradient(ellipse, rgba(99,102,241,0.08) 0%, transparent 70%)",
        badgeBg: "rgba(79,142,247,0.08)", badgeBorder: "rgba(79,142,247,0.25)", badgeText: "#4f8ef7",
        title: "#fff", sub: "rgba(255,255,255,0.55)", text3: "rgba(255,255,255,0.45)", link: "#4f8ef7",
        cycleBarBg: "rgba(255,255,255,0.03)", cycleBarBorder: "rgba(255,255,255,0.08)", cycleInactiveText: "rgba(255,255,255,0.55)",
        cardBg: "rgba(255,255,255,0.02)", cardBorder: "rgba(255,255,255,0.07)",
        proCardBg: "linear-gradient(155deg,rgba(99,102,241,0.1),rgba(79,142,247,0.05))", proCardBorder: "rgba(99,102,241,0.35)",
        priceText: "#fff", featureText: "rgba(255,255,255,0.7)", featureMuted: "rgba(255,255,255,0.2)",
        ghostBtnBg: "rgba(255,255,255,0.06)",
        trustCardBg: "rgba(255,255,255,0.02)", trustCardBorder: "rgba(255,255,255,0.06)", trustTitle: "#fff",
        compBtnBg: "rgba(255,255,255,0.03)", compBtnBorder: "rgba(255,255,255,0.1)", compBtnText: "rgba(255,255,255,0.7)",
        tableBorder: "rgba(255,255,255,0.07)", tableHeadBg: "rgba(79,142,247,0.06)", tableRowAlt: "rgba(255,255,255,0.015)", tableCellText: "rgba(255,255,255,0.6)", tableCellMuted: "rgba(255,255,255,0.2)",
        faqBorder: "rgba(255,255,255,0.06)", faqQ: "#fff", faqA: "rgba(255,255,255,0.55)",
        legalText: "rgba(255,255,255,0.25)", legalStrong: "rgba(255,255,255,0.45)",
        guideHeading: "#fff", guideSub: "#94a3b8",
        selectedShadow: "0 0 0 3px rgba(99,102,241,0.35)",
        successBg: "rgba(34,197,94,0.08)", successBorder: "rgba(34,197,94,0.25)", successText: "#22c55e",
        couponBg: "rgba(245,158,11,0.08)", couponBorder: "rgba(245,158,11,0.25)", couponText: "#f59e0b",
    };
}

export default function PricingPublic() {
    const t = useT();
    const location = useLocation();
    const navigate = useNavigate();
    // 187차 — /app-pricing(앱 내부 진입)은 밝은 테마. 공개 /pricing 은 다크 마케팅 유지.
    const isAppContext = location.pathname === "/app-pricing";
    // 187차 — 공개 /pricing 도 프리미엄 라이트로 통일(랜딩/소개와 일관). 항상 light.
    const T = buildTheme(true);

    const [cycleMonths, setCycleMonths] = useState(1);
    const [loading, setLoading] = useState({});
    const [success, setSuccess] = useState(false);
    const [faqOpen, setFaqOpen] = useState(null);
    const [showComparison, setShowComparison] = useState(false);
    const [clientToken, setClientToken] = useState(import.meta.env.VITE_PADDLE_CLIENT_TOKEN || "");
    const [plans, setPlans] = useState(FALLBACK_PLANS);
    const [plansLoaded, setPlansLoaded] = useState(false);
    // 187차 — 플랜 선택 상태 (카드 클릭). 기본 'pro'.
    const [selectedPlanId, setSelectedPlanId] = useState("pro");
    // 187차 — 계정수(seat) 선택 상태. admin seat_tier 동기화. 기본 '1'(최소 계정수).
    const [seatTier, setSeatTier] = useState("1");
    const autoCheckoutPending = useRef(null); // {planId, cycleMonths}
    const [couponBanner, setCouponBanner] = useState(null);

    // 187차 — admin 동기화: 표시 콘텐츠(이름/설명/기능)는 admin API 가 source of truth.
    //   API features 있으면 그대로(완벽 동기화), 없을 때만(오프라인 fallback) i18n STD 사용.
    const localizePlan = useCallback((plan) => {
        const std = STD_PLAN_CONTENT[plan.id];
        const hasApiFeatures = Array.isArray(plan.features) && plan.features.length > 0;
        const dispFeatures = hasApiFeatures
            ? plan.features
            : (std ? std.features.map((f, i) => t(`appPricing.plans.${plan.id}.features.${i}`, f)) : []);
        const dispDesc = plan.desc || (std ? t(`appPricing.plans.${plan.id}.desc`, std.desc) : "");
        return {
            ...plan,
            dispName: plan.name || t(`appPricing.plans.${plan.id}.name`, plan.id),
            dispDesc,
            dispFeatures,
            dispNotIncluded: plan.notIncluded || [],
        };
    }, [t]);

    // 187차 — admin 동기화 파생: 사용 가능한 기간(period_months) / 계정수(seat) 티어를 plans 에서 추출.
    //   admin 이 1~60개월·계정티어를 자유 추가하면 사용자 페이지가 자동 반영(하드코딩 X).
    const availablePeriods = useMemo(() => {
        const set = new Set();
        plans.forEach(pl => {
            const sp = pl.seatPricing || {};
            Object.values(sp).forEach(arr => Array.isArray(arr) && arr.forEach(e => set.add(e.period_months)));
            (pl.periods || []).forEach(e => set.add(e.period_months));
        });
        let list = [...set].filter(n => Number.isFinite(n)).sort((a, b) => a - b);
        if (list.length === 0) list = CYCLE_OPTIONS.map(o => o.months);
        return list;
    }, [plans]);
    const availableSeatTiers = useMemo(() => {
        const pl = plans.find(p => Array.isArray(p.seatTiers) && p.seatTiers.length > 0);
        return pl ? pl.seatTiers : [];
    }, [plans]);
    const hasSeatPricing = useMemo(() => plans.some(p => p.seatPricing && Object.keys(p.seatPricing).length > 0), [plans]);

    // 선택값이 사용 가능 목록에 없으면 보정.
    useEffect(() => {
        if (availablePeriods.length && !availablePeriods.includes(cycleMonths)) {
            setCycleMonths(availablePeriods.includes(1) ? 1 : availablePeriods[0]);
        }
    }, [availablePeriods]); // eslint-disable-line react-hooks/exhaustive-deps
    useEffect(() => {
        if (availableSeatTiers.length && !availableSeatTiers.some(s => s.key === seatTier)) {
            setSeatTier(availableSeatTiers[0].key);
        }
    }, [availableSeatTiers]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        const st = location.state;
        if (st?.autoCheckout?.planId) {
            autoCheckoutPending.current = {
                planId: String(st.autoCheckout.planId),
                cycleMonths: Number(st.autoCheckout.cycleMonths) || 1,
            };
            setCycleMonths(autoCheckoutPending.current.cycleMonths);
            setSelectedPlanId(autoCheckoutPending.current.planId);
        }
        if (st?.couponAlert?.ok) setCouponBanner(st.couponAlert);
        if (st && (st.autoCheckout || st.couponAlert)) {
            navigate(location.pathname, { replace: true, state: null });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        const apiBase = import.meta.env.VITE_API_BASE || "";
        fetch(`${apiBase}/api/v423/paddle/config`).then(r => r.json()).then(d => { if (d.clientToken) setClientToken(d.clientToken); }).catch(() => {});
        fetch(`${apiBase}/auth/pricing/public-plans`).then(r => r.json()).then(d => {
            if (d?.ok && Array.isArray(d.plans) && d.plans.length > 0) {
                setPlans(d.plans.map(hydratePlanFromApi));
            }
        })
        .catch(() => { /* fallback to default plans */ })
        .finally(() => setPlansLoaded(true));
    }, []);

    useEffect(() => { if (clientToken) loadPaddleV2(clientToken).catch(console.error); }, [clientToken]);

    const checkout = useCallback(async (plan, cycleArg, seatArg) => {
        setSelectedPlanId(plan.id);
        // 187차 — 선택한 계정수(seat)의 기간별 가격에서 paddle_price_id 산정.
        const seatKey = String(seatArg ?? seatTier ?? "1");
        const seatPeriods = periodsForSeat(plan, seatKey);
        const hasAnyPriceId = plan.priceIdMonthly || plan.priceIdAnnual || seatPeriods.some(pp => pp.paddle_price_id);
        if (!hasAnyPriceId || plan.isCustomQuote) {
            window.location.href = `mailto:support@genie-go.com?subject=${encodeURIComponent(plan.name + " Plan Inquiry")}`;
            return;
        }
        const months = Number(cycleArg ?? cycleMonths) || 1;
        let priceId = "";
        const period = findPeriodIn(seatPeriods, months);
        if (period?.paddle_price_id) {
            priceId = period.paddle_price_id;
        } else if (months === 12 && plan.priceIdAnnual) {
            priceId = plan.priceIdAnnual;
        } else if (plan.priceIdMonthly) {
            priceId = plan.priceIdMonthly;
        }
        if (!priceId) {
            alert(t("appPricing.alert.noCycle", "{{months}}-month pricing not yet configured for {{name}}. Please choose a different cycle or contact support@genie-go.com.", { months, name: plan.name }));
            return;
        }
        setLoading(p => ({ ...p, [plan.id]: true }));
        try {
            if (!clientToken) throw new Error("Payment system not configured");
            await loadPaddleV2(clientToken);
            window.Paddle.Checkout.open({
                items: [{ priceId, quantity: 1 }],
                customData: { plan_id: plan.id, cycle_months: months, seat_tier: seatKey },
                settings: {
                    displayMode: "overlay",
                    theme: isAppContext ? "light" : "dark",
                    locale: "en",
                    allowedPaymentMethods: ["card"],
                },
                successCallback: () => setSuccess(true),
            });
        } catch (e) {
            console.error("Paddle checkout error:", e);
            alert(t("appPricing.alert.checkoutError", "Unable to open checkout. Please try again or contact support@genie-go.com."));
        } finally {
            setLoading(p => ({ ...p, [plan.id]: false }));
        }
    }, [cycleMonths, seatTier, clientToken, isAppContext, t]);

    useEffect(() => {
        if (!plansLoaded || !clientToken || !autoCheckoutPending.current) return;
        const pending = autoCheckoutPending.current;
        const plan = plans.find(p => p.id === pending.planId);
        if (!plan) { autoCheckoutPending.current = null; return; }
        autoCheckoutPending.current = null;
        const tm = setTimeout(() => checkout(plan, pending.cycleMonths), 250);
        return () => clearTimeout(tm);
    }, [plansLoaded, clientToken, plans, checkout]);

    const inner = (
        <section style={{ padding: isAppContext ? "44px 28px 90px" : "48px 28px 100px", textAlign: "center", position: "relative" }}>
            <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: 800, height: 300, borderRadius: "50%", background: T.glow, pointerEvents: "none" }} />

            <div className="pub-section pub-fadeUp" style={{ position: "relative", zIndex: 1 }}>
                <div data-gp="brandText" style={{ display: "inline-block", padding: "5px 20px", borderRadius: 99, background: T.badgeBg, border: `1px solid ${T.badgeBorder}`, fontSize: 11, color: T.badgeText, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 24 }}>
                    {t("appPricing.hero.badge", "Simple, Transparent Pricing")}
                </div>
                <h1 style={{ fontSize: 44, fontWeight: 900, margin: "0 0 14px", color: T.title, letterSpacing: -1.5 }}>{t("appPricing.hero.title", "Plans that grow with you")}</h1>
                <p style={{ fontSize: 15, color: T.sub, marginBottom: 8 }}>
                    {t("appPricing.hero.subtitle", "No hidden fees. Cancel anytime.")}{" "}
                    <Link to="/refund" style={{ color: T.link, fontWeight: 600 }}>{t("appPricing.hero.guarantee", "30-day money-back guarantee.")}</Link>
                </p>

                {success && (
                    <div style={{ margin: "24px auto", maxWidth: 560, padding: "18px 24px", borderRadius: 14, background: T.successBg, border: `1px solid ${T.successBorder}`, color: T.successText, fontSize: 14, fontWeight: 600 }}>
                        {t("appPricing.banner.success", "✅ Payment received! Your account is being activated — confirmation via email.")}
                    </div>
                )}

                {couponBanner && (
                    <div style={{ margin: "16px auto 0", maxWidth: 560, padding: "14px 22px", borderRadius: 14, background: T.couponBg, border: `1px solid ${T.couponBorder}`, color: T.couponText, fontSize: 13, fontWeight: 600 }}>
                        🎟️ {t("appPricing.banner.coupon", "Coupon applied")} — {couponBanner.message || couponBanner.code || t("appPricing.banner.couponFree", "free access granted")}.
                    </div>
                )}

                {/* 187차 — admin 동기화: 계정수(seat) 선택 + 기간(period) 선택. 둘 다 admin 매트릭스에서 파생. */}
                {hasSeatPricing && availableSeatTiers.length > 1 && (
                    <div style={{ marginTop: 30 }}>
                        <div style={{ fontSize: 11, color: T.text3, fontWeight: 800, letterSpacing: 0.8, marginBottom: 8, textTransform: "uppercase" }}>
                            {t("appPricing.accountsLabel", "Number of accounts")}
                        </div>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: 4, borderRadius: 99, background: T.cycleBarBg, border: `1px solid ${T.cycleBarBorder}` }}>
                            {availableSeatTiers.map(stier => {
                                const active = seatTier === stier.key;
                                return (
                                    <button key={stier.key} data-gp={active ? "onColor" : undefined}
                                        onClick={() => setSeatTier(stier.key)}
                                        style={{
                                            padding: "8px 18px", borderRadius: 99, border: "none",
                                            background: active ? "linear-gradient(135deg,#4f8ef7,#6366f1)" : "transparent",
                                            color: active ? "#fff" : T.cycleInactiveText,
                                            fontSize: 12, fontWeight: 700, cursor: "pointer", transition: "all 200ms",
                                            boxShadow: active ? "0 2px 12px rgba(79,142,247,0.3)" : "none",
                                        }}>
                                        {stier.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                <div style={{ fontSize: 11, color: T.text3, fontWeight: 800, letterSpacing: 0.8, margin: "20px 0 8px", textTransform: "uppercase" }}>
                    {t("appPricing.periodHeader", "Billing period")}
                </div>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 4, marginBottom: 14, padding: 4, borderRadius: 99, background: T.cycleBarBg, border: `1px solid ${T.cycleBarBorder}` }}>
                    {availablePeriods.map(months => {
                        const active = cycleMonths === months;
                        const nk = NAMED_PERIODS[months];
                        const label = nk ? t(`appPricing.cycle.${nk}`, NAMED_PERIOD_FALLBACK[months]) : t("appPricing.nMonths", "{{n}} months", { n: months });
                        return (
                            <button key={months} data-gp={active ? "onColor" : undefined}
                                onClick={() => setCycleMonths(months)}
                                style={{
                                    padding: "8px 16px", borderRadius: 99, border: "none",
                                    background: active ? "linear-gradient(135deg,#4f8ef7,#6366f1)" : "transparent",
                                    color: active ? "#fff" : T.cycleInactiveText,
                                    fontSize: 12, fontWeight: 700, cursor: "pointer", transition: "all 200ms",
                                    boxShadow: active ? "0 2px 12px rgba(79,142,247,0.3)" : "none",
                                }}>
                                {label}
                                {months > 1 && <span style={{ fontSize: 10, marginLeft: 6, opacity: active ? 0.85 : 0.5 }}>({months}mo)</span>}
                            </button>
                        );
                    })}
                </div>
                <p style={{ fontSize: 11, color: T.text3, marginBottom: 32 }}>
                    {t("appPricing.cycle.note", "Longer cycles unlock larger discounts. All cycles billed upfront via Paddle.")} <strong style={{ color: T.legalStrong }}>{t("appPricing.cardOnly", "Card payments only")}</strong>.
                </p>

                {/* Plan cards */}
                {/* 206차: 3컬럼 제한 → 최대 4컬럼(플랜 4개가 한 화면 한 줄에 모두 보이도록). 1fr 컬럼이 컨테이너 폭에 맞춰 축소되어 가로 스크롤 없음. */}
                <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(plans.length, 4)},1fr)`, gap: 14, maxWidth: plans.length >= 4 ? 1280 : 1040, margin: "0 auto" }}>
                    {plans.map(rawPlan => {
                        const plan = localizePlan(rawPlan);
                        // 187차 — 선택한 계정수(seat)의 기간별 가격 사용(admin 매트릭스 동기화).
                        const seatPeriods = periodsForSeat(plan, seatTier);
                        const period = plan.isCustomQuote ? null : findPeriodIn(seatPeriods, cycleMonths);
                        const monthlyPrice = period?.price_usd ?? (cycleMonths === 12 ? plan.priceAnnual : plan.priceMonthly);
                        const totalCharge = period?.total_charge ?? (monthlyPrice != null ? monthlyPrice * cycleMonths : null);
                        const discountPct = period?.discount_pct ?? (cycleMonths === 12 ? 20 : 0);
                        const isPro = plan.id === "pro";
                        const isSelected = selectedPlanId === plan.id;
                        return (
                            <div key={plan.id}
                                onClick={() => setSelectedPlanId(plan.id)}
                                role="button"
                                tabIndex={0}
                                onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelectedPlanId(plan.id); } }}
                                aria-pressed={isSelected}
                                style={{
                                    padding: plans.length >= 4 ? "26px 20px" : "36px 28px", borderRadius: 20, position: "relative", textAlign: "left", cursor: "pointer",
                                    background: isPro ? T.proCardBg : T.cardBg,
                                    border: isSelected ? `2px solid ${plan.color}` : (isPro ? `1px solid ${T.proCardBorder}` : `1px solid ${T.cardBorder}`),
                                    transform: isSelected ? "translateY(-4px)" : (isPro ? "scale(1.02)" : "none"),
                                    boxShadow: isSelected ? T.selectedShadow : (isPro && !T.light ? "0 0 60px rgba(99,102,241,0.1)" : (T.light ? "0 1px 3px rgba(15,23,42,0.06)" : "none")),
                                    transition: "all 220ms",
                                }}
                                onMouseEnter={e => { if (!isSelected) { e.currentTarget.style.borderColor = plan.color + (T.light ? "" : "40"); e.currentTarget.style.transform = "translateY(-4px)"; } }}
                                onMouseLeave={e => { if (!isSelected) { e.currentTarget.style.borderColor = isPro ? T.proCardBorder : T.cardBorder; e.currentTarget.style.transform = isPro ? "scale(1.02)" : "none"; } }}
                            >
                                {plan.tag && (
                                    // 187차 — 밝은테마 단색 브랜드색 + data-gp="onColor"(글로벌 override 가 글자 회색강제 → 흰색 복원).
                                    <div data-gp="onColor" style={{ position: "absolute", top: -13, left: "50%", transform: "translateX(-50%)", padding: "4px 20px", borderRadius: 99, background: T.light ? plan.color : `linear-gradient(135deg,${plan.color},${plan.color}cc)`, fontSize: 10, fontWeight: 800, color: "#fff", whiteSpace: "nowrap", letterSpacing: 0.5, boxShadow: `0 0 20px ${plan.color}30` }}>{t(`appPricing.tag.${plan.id}`, plan.tag)}</div>
                                )}
                                {isSelected && (
                                    <div data-gp="onColor" style={{ position: "absolute", top: 14, right: 14, display: "flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 99, background: plan.color, color: "#fff", fontSize: 10, fontWeight: 800, letterSpacing: 0.3 }}>
                                        ✓ {t("appPricing.selected", "Selected")}
                                    </div>
                                )}
                                <div style={{ fontSize: 11, fontWeight: 700, color: plan.color, letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>{plan.dispName}</div>
                                <div style={{ fontSize: 12, color: T.text3, marginBottom: 24, lineHeight: 1.6, minHeight: 38 }}>{plan.dispDesc}</div>

                                <div style={{ marginBottom: 28 }}>
                                    {monthlyPrice !== null && !plan.isCustomQuote ? (
                                        <>
                                            <span style={{ fontSize: 48, fontWeight: 900, color: T.priceText, letterSpacing: -2 }}>${Math.round(monthlyPrice * 100) / 100}</span>
                                            <span style={{ fontSize: 14, color: T.text3, marginLeft: 4 }}>{t("appPricing.perMonth", "/mo")}</span>
                                            {cycleMonths > 1 && totalCharge != null && (
                                                <div style={{ fontSize: 11, color: T.text3, marginTop: 6 }}>
                                                    {t("appPricing.billedEvery", "Billed every {{months}} months ({{total}})", { months: cycleMonths, total: "$" + Math.round(totalCharge * 100) / 100 })}
                                                    {discountPct > 0 && (
                                                        <span style={{ color: "#16a34a", fontWeight: 700, marginLeft: 6, padding: "1px 7px", borderRadius: 6, background: "rgba(34,197,94,0.12)" }}>
                                                            {t("appPricing.save", "Save {{pct}}%", { pct: discountPct })}
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <span style={{ fontSize: 36, fontWeight: 900, color: T.priceText }}>{t("appPricing.custom", "Custom")}</span>
                                    )}
                                </div>

                                <button onClick={(e) => { e.stopPropagation(); checkout(plan); }} disabled={!!loading[plan.id]}
                                    style={{
                                        width: "100%", padding: "14px 0", borderRadius: 12, cursor: loading[plan.id] ? "default" : "pointer",
                                        fontWeight: 800, fontSize: 14, marginBottom: 28, opacity: loading[plan.id] ? 0.6 : 1, transition: "all 200ms",
                                        // 187차 — 밝은테마 비-Pro 버튼은 단색 브랜드색 배경+흰글자(흰배경+흰글자 강제 버그 회피). 다크는 기존 ghost 유지.
                                        border: (isPro || T.light) ? "none" : `1.5px solid ${plan.color}`,
                                        background: isPro ? "linear-gradient(135deg,#4f8ef7,#7c3aed)" : (T.light ? plan.color : (isSelected ? plan.color : T.ghostBtnBg)),
                                        color: (isPro || T.light) ? "#fff" : (isSelected ? "#fff" : plan.color),
                                        boxShadow: isPro ? "0 0 30px rgba(79,142,247,0.25)" : "none",
                                    }}>
                                    {loading[plan.id]
                                        ? t("appPricing.btn.opening", "Opening checkout…")
                                        : (plan.isCustomQuote || !monthlyPrice)
                                            ? t("appPricing.btn.contact", "Contact Sales")
                                            : t("appPricing.btn.start", "Get Started")}
                                </button>

                                {plan.menuAccessCount > 0 && (
                                    <div style={{
                                        display: "flex", alignItems: "center", gap: 8, marginBottom: 16, padding: "8px 12px",
                                        borderRadius: 10, background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)",
                                    }}>
                                        <span style={{ fontSize: 14 }}>🧩</span>
                                        <span style={{ fontSize: 12, color: T.featureText }}>
                                            {t("appPricing.menuAccess", "{{count}} menus & features available", { count: plan.menuAccessCount })}
                                        </span>
                                    </div>
                                )}

                                <div style={{ display: "grid", gap: 10 }}>
                                    {plan.dispFeatures.map((f, i) => (
                                        <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 12, color: T.featureText }}>
                                            <span style={{ color: "#16a34a", marginTop: 1, flexShrink: 0, fontSize: 12 }}>✓</span>{f}
                                        </div>
                                    ))}
                                    {plan.dispNotIncluded.map((f, i) => (
                                        <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 12, color: T.featureMuted }}>
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
                        { k: "secure",  icon: "🔒", title: "Secure Payments", desc: "PCI DSS Level 1 certified via Paddle", color: "#4f8ef7" },
                        { k: "refund",  icon: "↩", title: "30-Day Refund", desc: "Full refund, no questions asked", color: "#22c55e" },
                        { k: "global",  icon: "🌍", title: "Global Billing", desc: "100+ currencies, VAT handled automatically", color: "#a855f7" },
                    ].map(tr => (
                        <div key={tr.k} style={{ padding: "24px 20px", borderRadius: 16, background: T.trustCardBg, border: `1px solid ${T.trustCardBorder}`, textAlign: "center", transition: "border-color 300ms" }}
                            onMouseEnter={e => e.currentTarget.style.borderColor = tr.color + "40"}
                            onMouseLeave={e => e.currentTarget.style.borderColor = T.trustCardBorder}>
                            <div style={{ fontSize: 24, marginBottom: 10 }}>{tr.icon}</div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: T.trustTitle, marginBottom: 6 }}>{t(`appPricing.trust.${tr.k}.title`, tr.title)}</div>
                            <div style={{ fontSize: 11, color: T.text3 }}>{t(`appPricing.trust.${tr.k}.desc`, tr.desc)}</div>
                        </div>
                    ))}
                </div>

                {/* Comparison button */}
                <div style={{ marginTop: 48 }}>
                    <button onClick={() => setShowComparison(c => !c)} style={{ padding: "12px 28px", borderRadius: 10, border: `1px solid ${T.compBtnBorder}`, background: T.compBtnBg, color: T.compBtnText, fontSize: 13, fontWeight: 700, cursor: "pointer", transition: "all 200ms" }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(79,142,247,0.4)"; e.currentTarget.style.color = T.title; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = T.compBtnBorder; e.currentTarget.style.color = T.compBtnText; }}>
                        {showComparison ? t("appPricing.comparison.hide", "Hide") : t("appPricing.comparison.view", "View")} {t("appPricing.comparison.label", "Full Feature Comparison")} {showComparison ? "↑" : "↓"}
                    </button>
                </div>

                {/* 187차 — admin 동기화 비교표: plan_config.limits(채널/창고/계정 -1=무제한)에서 동적 파생.
                    플랜 수·이름·한도 모두 admin DB 기준 → 사용자 표기와 admin 완벽 일치. */}
                {showComparison && (() => {
                    const unlimited = t("appPricing.unlimited", "Unlimited");
                    const limitRows = [
                        { lk: "channels",   ik: "channels", label: t("appPricing.comparison.row.channels", "Sales channels") },
                        { lk: "warehouses", ik: "wms",      label: t("appPricing.comparison.row.wms",      "Warehouses (WMS)") },
                        { lk: "users",      ik: "members",  label: t("appPricing.comparison.row.members",  "Team accounts") },
                    ];
                    return (
                        <div style={{ marginTop: 32, maxWidth: 900, marginLeft: "auto", marginRight: "auto", borderRadius: 18, overflow: "hidden", border: `1px solid ${T.tableBorder}` }}>
                            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                                <thead>
                                    <tr style={{ background: T.tableHeadBg }}>
                                        <th style={{ padding: "16px 20px", textAlign: "left", color: T.tableCellText, fontWeight: 600, borderBottom: `1px solid ${T.tableBorder}` }}>{t("appPricing.comparison.feature", "Feature")}</th>
                                        {plans.map(p => (
                                            <th key={p.id} style={{ padding: "16px 20px", textAlign: "center", color: p.color || "#4f8ef7", fontWeight: 700, borderBottom: `1px solid ${T.tableBorder}` }}>{p.name}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {limitRows.map((row, i) => (
                                        <tr key={row.key} style={{ background: i % 2 === 0 ? "transparent" : T.tableRowAlt }}>
                                            <td style={{ padding: "12px 20px", color: T.tableCellText, borderBottom: `1px solid ${T.tableBorder}` }}>{row.label}</td>
                                            {plans.map(p => {
                                                const v = limitDisplay((p.limits || {})[row.lk], unlimited);
                                                const isUnlim = v === unlimited;
                                                return (
                                                    <td key={p.id} style={{ padding: "12px 20px", textAlign: "center", color: isUnlim ? "#16a34a" : T.tableCellText, fontWeight: isUnlim ? 700 : 600, borderBottom: `1px solid ${T.tableBorder}` }}>{v}</td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    );
                })()}

                {/* 186차 — 플랜별 제공 서비스 상세 안내 */}
                <div style={{ marginTop: 72, maxWidth: 980, marginLeft: "auto", marginRight: "auto", textAlign: "left" }}>
                    <div style={{ textAlign: "center", marginBottom: 24 }}>
                        <h2 style={{ fontSize: 26, fontWeight: 900, color: T.guideHeading, letterSpacing: -0.5 }}>{t("appPricing.guide.title", "Detailed services by plan")}</h2>
                        <p style={{ fontSize: 13, color: T.guideSub, marginTop: 8 }}>{t("appPricing.guide.subtitle", "See exactly which services each plan provides.")}</p>
                    </div>
                    <div style={{ display: "grid", gap: 14 }}>
                        {/* 187차 — 기본 펼침: 각 플랜 상세 서비스 설명서(9개 섹션) 즉시 노출(구버전 수준 상세). */}
                        {plans.map(pl => (
                            <PlanServiceGuide key={pl.id} planId={pl.id} defaultOpen={true} light={true} />
                        ))}
                    </div>
                </div>

                {/* FAQ */}
                <div style={{ marginTop: 80, maxWidth: 720, marginLeft: "auto", marginRight: "auto", textAlign: "left" }}>
                    <div style={{ textAlign: "center", marginBottom: 40 }}>
                        <h2 style={{ fontSize: 28, fontWeight: 900, color: T.title, letterSpacing: -0.5 }}>{t("appPricing.faq.title", "Frequently Asked Questions")}</h2>
                    </div>
                    {FAQS.map((item, i) => (
                        <div key={item.key} style={{ borderBottom: `1px solid ${T.faqBorder}` }}>
                            <button onClick={() => setFaqOpen(faqOpen === i ? null : i)}
                                style={{ width: "100%", textAlign: "left", background: "none", border: "none", padding: "20px 0", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", color: T.faqQ, fontSize: 14, fontWeight: 700 }}>
                                {t(`appPricing.faq.${item.key}.q`, item.q)}
                                <span style={{ fontSize: 20, color: T.text3, transition: "transform 300ms", transform: faqOpen === i ? "rotate(45deg)" : "none", flexShrink: 0, marginLeft: 16 }}>+</span>
                            </button>
                            <div style={{ maxHeight: faqOpen === i ? 320 : 0, overflow: "hidden", transition: "max-height 300ms ease-in-out" }}>
                                <div style={{ fontSize: 13, color: T.faqA, lineHeight: 1.9, paddingBottom: 20 }}>{t(`appPricing.faq.${item.key}.a`, item.a)}</div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Legal */}
                <p style={{ marginTop: 56, fontSize: 11, color: T.legalText, lineHeight: 1.8 }}>
                    {t("appPricing.legal.agree", "By purchasing, you agree to our")}{" "}
                    <Link to="/terms" style={{ color: T.link }}>{t("appPricing.legal.terms", "Terms of Service")}</Link> {t("appPricing.legal.and", "and")}{" "}
                    <Link to="/privacy" style={{ color: T.link }}>{t("appPricing.legal.privacy", "Privacy Policy")}</Link>.<br />
                    {t("appPricing.legal.usd", "All prices in USD.")} <strong style={{ color: T.legalStrong }}>{t("appPricing.cardOnly", "Card payments only")}</strong>. {t("appPricing.legal.tax", "Taxes may apply depending on your location. Powered by Paddle.com (Merchant of Record).")}
                </p>
            </div>
        </section>
    );

    // 187차 — 앱 내부(/app-pricing)는 밝은 컨테이너로 직접 렌더(앱 셸이 헤더/사이드바 제공).
    if (isAppContext) {
        // 187차 — id=genie-pricing-root: styles.css 끝 가독성 override(ID specificity)의 스코프 앵커.
        return <div id="genie-pricing-root" className="genie-pricing-root" style={{ minHeight: "100%", background: T.pageBg, color: T.title, fontFamily: "'Inter','Segoe UI',system-ui,sans-serif" }}>{inner}</div>;
    }
    // 187차 — 공개 /pricing: 프리미엄 라이트 레이아웃(랜딩/소개와 일관).
    return <PremiumLayout><div id="genie-pricing-root" className="genie-pricing-root">{inner}</div></PremiumLayout>;
}
