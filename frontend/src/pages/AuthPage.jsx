import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import { useT } from "../i18n";

/* ─── CONSTANTS ────────────────────────────────────────────── */
const COUNTRIES = [
  "South Korea", "USA", "Japan", "China", "Singapore", "UK", "Germany", "France",
  "Australia", "Canada", "Vietnam", "Thailand", "Indonesia", "Malaysia", "Philippines",
  "India", "Brazil", "Mexico", "UAE", "Saudi Arabia", "Other",
];

const BUSINESS_TYPES = [
  "E-Commerce", "Brand Manufacturer", "Distribution & Wholesale", "Online Marketing Agency",
  "IT & Software", "Fashion & Beauty", "Food & Beverage", "Electronics", "Health & Medical",
  "Travel & Accommodation", "Education & Content", "Finance & Fintech", "Other",
];

const SALES_CHANNELS = [
  { key: "naver", label: "Naver SmartStore", icon: "🟢" },
  { key: "coupang", label: "Coupang", icon: "🟡" },
  { key: "kakao", label: "KakaoShopping", icon: "💛" },
  { key: "gmarket", label: "Gmarket · Auction", icon: "🔵" },
  { key: "11st", label: "11Street", icon: "🔴" },
  { key: "shopify", label: "Shopify", icon: "🛍" },
  { key: "amazon", label: "Amazon", icon: "📦" },
  { key: "rakuten", label: "Rakuten", icon: "🏪" },
  { key: "lazada", label: "Lazada", icon: "🌏" },
  { key: "tiktok_shop", label: "TikTok Shop", icon: "🎵" },
  { key: "own_mall", label: "Own Mall", icon: "🏠" },
  { key: "other_global", label: "Other Global", icon: "🌐" },
];

const AD_CHANNELS = [
  { key: "meta", label: "Meta (Facebook/Instagram)" },
  { key: "google", label: "Google Ads" },
  { key: "tiktok", label: "TikTok Ads" },
  { key: "naver_ads", label: "Naver Search Ads (SA)" },
  { key: "kakao_moment", label: "Kakao Moment" },
  { key: "youtube", label: "YouTube Ads" },
  { key: "twitter", label: "Twitter/X Ads" },
  { key: "line", label: "LINE Ads" },
];

const PAID_PLANS = [
  {
    id: "growth",
    label: "Growth",
    priceFallback: "Checking price",
    desc: "Growing brand · Core features to start",
    color: "#4f8ef7",
    badge: "Starter Pick",
    tagline: "Grow revenue with core marketing, commerce & CRM features",
    target: "Growing brands with monthly revenue ₩100M–₩2B, small team sellers",
    features: [
      { emoji: "📣", text: "Major ad channel integration (Meta/Google/TikTok/Naver/Kakao/Coupang)" },
      { emoji: "📧", text: "Email · Kakao · SMS campaign sends" },
      { emoji: "🛒", text: "Product catalog sync · Order Hub · Basic WMS" },
      { emoji: "📊", text: "Performance Hub · P&L overview · Custom reports · Excel export" },
      { emoji: "👤", text: "Customer CRM · RFM segments · Basic automation" },
      { emoji: "🔒", text: "License management · Onboarding guide" },
    ],
    notIncluded: ["AI Prediction (Churn·LTV)", "Journey Builder", "AI Rule Engine", "Full Channel API"],
  },
  {
    id: "pro",
    label: "Pro",
    priceFallback: "Checking price",
    desc: "Growth brand · Agency · Full AI automation",
    color: "#a855f7",
    popular: true,
    badge: "Most Popular",
    tagline: "Maximize marketing efficiency with AI prediction & automation",
    target: "Brands with monthly revenue ₩2B–₩10B, marketing agencies, data-driven ops teams",
    features: [
      { emoji: "🤖", text: "AI Prediction: Customer churn · LTV · Purchase probability" },
      { emoji: "🗺", text: "Journey Builder · Trigger settings · Action node management" },
      { emoji: "⚙", text: "AI Rule Engine · Alert policy evaluation · Writeback" },
      { emoji: "🌐", text: "Full channel integration (LINE/WhatsApp/Instagram DM included)" },
      { emoji: "📈", text: "Attribution · Competitor AI analysis · Anomaly detection · Auto reports" },
      { emoji: "💳", text: "Invoice · Payment approval · Monthly channel/product P&L analysis" },
      { emoji: "🔌", text: "Event collection · Data schema · API key mgmt · 1st-Party pixel" },
      { emoji: "📣", text: "All Growth features included" },
    ],
    notIncluded: ["Instant Rollback (wb_rollback)", "Dedicated Support"],
  },
  {
    id: "enterprise",
    label: "Enterprise",
    priceFallback: "Contact Us",
    desc: "Large brands · Agencies · Multi-entity",
    color: "#f59e0b",
    badge: "Custom Design",
    tagline: "Enterprise-grade operations with unlimited features + dedicated support",
    target: "Large brands with monthly revenue ₩10B+, multi-entity corporations, large agencies",
    features: [
      { emoji: "✅", text: "All Pro features included" },
      { emoji: "🔄", text: "Writeback instant rollback (wb_rollback) — immediate recovery from large-scale mistakes" },
      { emoji: "👥", text: "Unlimited accounts · Multi-brand unified management" },
      { emoji: "🛡", text: "Dedicated CS & Tech support team" },
      { emoji: "📄", text: "Custom contracts · SLA guarantee · Dedicated infrastructure" },
      { emoji: "🏢", text: "ERP integration · Multi-country · Multi-entity financial settlement" },
    ],
    notIncluded: [],
  },
];

/* ─── Input Field ──────────────────────────────────────────── */
function Field({ label, type = "text", value, onChange, placeholder, required, autoComplete, hint }) {
  return (
    <div style={{ display: "grid", gap: 4 }}>
      <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-2)" }}>
        {label}{required && <span style={{ color: "#ef4444" }}> *</span>}
      </label>
      <input
        type={type} value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder} required={required} autoComplete={autoComplete}
        style={{
          padding: "10px 14px", borderRadius: 10, border: "1px solid var(--border)",
          background: "rgba(255,255,255,0.04)", color: "var(--text-1)", fontSize: 13,
          outline: "none", transition: "border-color 150ms", width: "100%", boxSizing: "border-box",
        }}
        onFocus={e => (e.target.style.borderColor = "#4f8ef7")}
        onBlur={e => (e.target.style.borderColor = "var(--border)")}
      />
      {hint && <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 1 }}>{hint}</div>}
    </div>
  );
}

function SelectField({ label, value, onChange, options, required }) {
  return (
    <div style={{ display: "grid", gap: 4 }}>
      <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-2)" }}>
        {label}{required && <span style={{ color: "#ef4444" }}> *</span>}
      </label>
      <select value={value} onChange={e => onChange(e.target.value)}
        style={{
          padding: "10px 14px", borderRadius: 10, border: "1px solid var(--border)",
          background: "rgba(20,30,50,0.9)", color: "var(--text-1)", fontSize: 13,
          outline: "none", cursor: "pointer", width: "100%", boxSizing: "border-box",
        }}>
        <option value="">{/*selectPlaceholder — set by parent*/}Select</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

/* ─── Login Form ─────────────────────────────────────────── */
function LoginForm({ onSwitch }) {
  const t = useT();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null); setLoading(true);
    try {
      await login(email, password);
      navigate("/dashboard", { replace: true });
    } catch (err) { setError(err.message); }
    setLoading(false);
  };



  return (
    <form onSubmit={handleSubmit} style={{ display: "grid", gap: 16 }}>
      {/* Quick start */}
      <div style={{ display: "grid", gap: 6 }}>
        <div style={{ fontSize: 10, color: "var(--text-3)", fontWeight: 700 }}>{t("auth.quickStart")}</div>
        <div style={{ display: "flex", gap: 6 }}>
          <button type="button" onClick={() => onSwitch("free")} style={{
            flex: 1, padding: "8px 0", borderRadius: 8, border: "1px solid rgba(34,197,94,0.3)",
            background: "rgba(34,197,94,0.07)", color: "#22c55e", fontSize: 11, cursor: "pointer", fontWeight: 700,
          }}>{t("auth.freeRegister")}</button>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ flex: 1, height: 1, background: "rgba(99,140,255,0.15)" }} />
        <span style={{ fontSize: 10, color: "var(--text-3)" }}>{t("auth.orLoginWith")}</span>
        <div style={{ flex: 1, height: 1, background: "rgba(99,140,255,0.15)" }} />
      </div>

      <Field label={t("auth.emailLabel")} type="email" value={email} onChange={setEmail} placeholder="you@example.com" required autoComplete="email" />
      <Field label={t("auth.passwordLabel")} type="password" value={password} onChange={setPassword} placeholder="••••••••" required autoComplete="current-password" />
      {error && <div style={{ padding: "8px 12px", borderRadius: 8, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)", color: "#ef4444", fontSize: 11 }}>{error}</div>}
      <button type="submit" disabled={loading} style={{
        padding: "12px 0", borderRadius: 10, border: "none",
        background: loading ? "rgba(79,142,247,0.4)" : "linear-gradient(135deg,#4f8ef7,#6366f1)",
        color: "#fff", fontWeight: 800, fontSize: 14, cursor: loading ? "not-allowed" : "pointer",
      }}>
        {loading ? t("auth.loggingIn") : t("auth.loginBtn")}
      </button>
      <div style={{ textAlign: "center", fontSize: 11, color: "var(--text-3)" }}>
        {t("auth.noAccount")}{" "}
        <button type="button" onClick={() => onSwitch("register")} style={{ background: "none", border: "none", color: "#4f8ef7", fontWeight: 700, cursor: "pointer", fontSize: 11 }}>
          {t("auth.registerLink")}
        </button>
      </div>
    </form>
  );
}

/* ─── Plan Selector ────────────────────────────────────────── */
function PlanSelector({ planType, setPlanType, selectedPaid, setSelectedPaid }) {
  const t = useT();
  const [planPrices, setPlanPrices] = useState({});    // { growth: "₩120,000/mo", pro: "₩150,000/mo", ... }
  const [priceLoading, setPriceLoading] = useState(true);

  useEffect(() => {
    // Management자가 Register한 Latest Pricing을 public-plans API에서 실Time 불러오기
    fetch("/api/auth/pricing/public-plans")
      .then(r => r.json())
      .then(d => {
        if (!d.ok) return;
        const prices = {};
        (d.plans || []).forEach(p => {
          if (!p.hasPricing || !p.tiers || p.tiers.length === 0) return;
          // 1Account(acct==='1') 기준 Monthly Min Pricing 사용 — tiers[0]이 아닌 acct==='1'을 명시적으로 찾음
          const firstTier = p.tiers.find(t => t.acct === "1") || p.tiers[0];
          const monthly = firstTier?.cycles?.monthly;
          if (monthly?.monthly_price > 0) {
            prices[p.id] = "₩" + Number(monthly.monthly_price).toLocaleString("ko-KR") + "/월~";
          } else if (p.id === "enterprise") {
            prices[p.id] = "Contact Us";
          }
        });
        // enterprise는 per도 표기
        if (!prices["enterprise"]) prices["enterprise"] = "Contact Us";
        setPlanPrices(prices);
      })
      .catch(() => {})
      .finally(() => setPriceLoading(false));
  }, []);

  // Actual display price: API data first, fallback if not available
  const getDisplayPrice = (planId, fallback) => {
    if (priceLoading) return t("auth.loadingPrice");
    return planPrices[planId] || fallback || t("auth.priceNotSet");
  };

  const selectedPlanCfg = PAID_PLANS.find(p => p.id === selectedPaid);

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div style={{ fontSize: 12, fontWeight: 800, color: "var(--text-1)", textAlign: "center" }}>
        {t("auth.planTypeTitle")}
      </div>

      {/* Free tier */}
      <button type="button" onClick={() => setPlanType("free")} style={{
        padding: "14px 16px", borderRadius: 12, cursor: "pointer", textAlign: "left",
        background: planType === "free" ? "rgba(34,197,94,0.1)" : "rgba(255,255,255,0.02)",
        border: `2px solid ${planType === "free" ? "#22c55e" : "rgba(99,140,255,0.12)"}`,
        transition: "all 150ms",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 22 }}>🌱</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 13, color: "#22c55e" }}>{t("auth.freePlan")}</div>
            <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>{t("auth.freePlanDesc")}</div>
          </div>
          <div style={{ padding: "3px 10px", borderRadius: 99, background: "rgba(34,197,94,0.12)", color: "#22c55e", fontSize: 10, fontWeight: 800 }}>{t("auth.freeBadge")}</div>
        </div>
      </button>

      {/* Paid tier */}
      <div style={{
        borderRadius: 12,
        border: `2px solid ${planType === "paid" ? "#a855f7" : "rgba(99,140,255,0.12)"}`,
        background: planType === "paid" ? "rgba(168,85,247,0.06)" : "rgba(255,255,255,0.02)",
        overflow: "hidden", transition: "all 150ms",
      }}>
        <button type="button" onClick={() => setPlanType("paid")} style={{
          width: "100%", padding: "14px 16px", cursor: "pointer", textAlign: "left",
          background: "transparent", border: "none",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 22 }}>💎</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: 13, color: "#a855f7" }}>{t("auth.paidPlan")}</div>
              <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>{t("auth.paidPlanDesc")}</div>
            </div>
            <div style={{ padding: "3px 10px", borderRadius: 99, background: "rgba(168,85,247,0.15)", color: "#a855f7", fontSize: 10, fontWeight: 800 }}>{t("auth.paidBadge")}</div>
          </div>
        </button>

        {/* Plan options shown only when paid is selected */}
        {planType === "paid" && (
          <div style={{ padding: "0 14px 14px" }}>
            {/* Plan cards */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
              {PAID_PLANS.map(p => (
                <button key={p.id} type="button" onClick={() => setSelectedPaid(p.id)} style={{
                  padding: "12px 10px", borderRadius: 10, cursor: "pointer", textAlign: "center",
                  background: selectedPaid === p.id ? `${p.color}1A` : "rgba(255,255,255,0.02)",
                  border: `1.5px solid ${selectedPaid === p.id ? p.color : "rgba(99,140,255,0.15)"}`,
                  position: "relative", transition: "all 150ms",
                }}>
                  {p.popular && <div style={{ position: "absolute", top: -8, left: "50%", transform: "translateX(-50%)", background: p.color, color: "#fff", fontSize: 8, fontWeight: 800, padding: "2px 7px", borderRadius: 99 }}>POPULAR</div>}
                  {p.badge && !p.popular && <div style={{ position: "absolute", top: -8, left: "50%", transform: "translateX(-50%)", background: p.color, color: "#fff", fontSize: 8, fontWeight: 800, padding: "2px 7px", borderRadius: 99 }}>{p.badge}</div>}
                  <div style={{ fontWeight: 800, fontSize: 12, color: p.color }}>{p.label}</div>
                  <div style={{ fontSize: 11, color: "#e2e8f0", marginTop: 2, fontWeight: 700 }}>
                    {getDisplayPrice(p.id, p.priceFallback)}
                  </div>
                  <div style={{ fontSize: 9, color: "var(--text-3)", marginTop: 1 }}>{p.desc}</div>
                  {selectedPaid === p.id && <div style={{ fontSize: 14, color: p.color, marginTop: 4 }}>✓</div>}
                </button>
              ))}
            </div>

            {/* Selected plan detail card */}
            {selectedPlanCfg && (
              <div style={{
                padding: "16px", borderRadius: 12,
                background: `${selectedPlanCfg.color}08`,
                border: `1px solid ${selectedPlanCfg.color}33`,
              }}>
                {/* Header */}
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontWeight: 900, fontSize: 13, color: selectedPlanCfg.color, marginBottom: 4 }}>
                    {t("auth.planQuestion", { plan: selectedPlanCfg.label })}
                  </div>
                  <div style={{ fontSize: 11, color: "#94a3b8", fontStyle: "italic", lineHeight: 1.6 }}>
                    {selectedPlanCfg.tagline}
                  </div>
                </div>

                {/* Target */}
                <div style={{ padding: "8px 10px", borderRadius: 8, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", marginBottom: 10 }}>
                  <div style={{ fontSize: 9, color: "#7c8fa8", fontWeight: 700, marginBottom: 2 }}>{t("auth.recommendedFor")}</div>
                  <div style={{ fontSize: 10, color: "#cbd5e1", lineHeight: 1.5 }}>{selectedPlanCfg.target}</div>
                </div>

                {/* Features */}
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 9, color: "#7c8fa8", fontWeight: 700, marginBottom: 6 }}>{t("auth.includedFeatures")}</div>
                  <div style={{ display: "grid", gap: 4 }}>
                    {selectedPlanCfg.features.map((f, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 6, fontSize: 10, color: "#cbd5e1", lineHeight: 1.5 }}>
                        <span style={{ fontSize: 12, flexShrink: 0, marginTop: -1 }}>{f.emoji}</span>
                        <span>{f.text}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Not included */}
                {selectedPlanCfg.notIncluded && selectedPlanCfg.notIncluded.length > 0 && (
                  <div>
                    <div style={{ fontSize: 9, color: "#7c8fa8", fontWeight: 700, marginBottom: 4 }}>{t("auth.premiumOnly")}</div>
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      {selectedPlanCfg.notIncluded.map((item, i) => (
                        <span key={i} style={{ fontSize: 9, padding: "2px 8px", borderRadius: 99, background: "rgba(99,140,255,0.06)", border: "1px solid rgba(99,140,255,0.12)", color: "#475569" }}>{item}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Free Register Form ─────────────────────────────────────── */
function FreeRegisterForm({ onSwitch, onBack }) {
  const t = useT();
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (password !== confirm) { setError(t("auth.passwordMismatch")); return; }
    if (!agreeTerms) { setError(t("auth.agreeTermsRequired")); return; }
    setLoading(true);
    try {
      const result = await register(email, password, name, "", { plan: "demo" });
      // Coupon Issue Success 시 Dashboard로 Move하면서 Coupon Notification state 전달
      navigate("/dashboard", {
        replace: true,
        state: result?.coupon ? { couponAlert: result.coupon } : undefined,
      });
    } catch (err) { setError(err.message); }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 10, background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.2)" }}>
        <span style={{ fontSize: 18 }}>🌱</span>
        <div>
          <div style={{ fontWeight: 800, fontSize: 12, color: "#22c55e" }}>{t("auth.freeTrialTitle")}</div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginTop: 1 }}>{t("auth.freeTrialDesc")}</div>
        </div>
        <button type="button" onClick={onBack} style={{ marginLeft: "auto", background: "none", border: "none", color: "var(--text-3)", cursor: "pointer", fontSize: 18 }}>←</button>
      </div>

      <Field label={t("auth.nameLabel")} value={name} onChange={setName} placeholder="John Doe" required autoComplete="name" />
      <Field label={t("auth.emailLabel")} type="email" value={email} onChange={setEmail} placeholder="you@example.com" required autoComplete="email" />
      <Field label={t("auth.passwordHint")} type="password" value={password} onChange={setPassword} placeholder="••••••••" required autoComplete="new-password" />
      <Field label={t("auth.passwordConfirm")} type="password" value={confirm} onChange={setConfirm} placeholder="••••••••" required autoComplete="new-password" />

      {/* Terms */}
      <label style={{ display: "flex", alignItems: "flex-start", gap: 8, cursor: "pointer" }}>
        <input type="checkbox" checked={agreeTerms} onChange={e => setAgreeTerms(e.target.checked)}
          style={{ marginTop: 2, accentColor: "#22c55e", width: 14, height: 14, flexShrink: 0 }} />
        <span style={{ fontSize: 10, color: "var(--text-3)", lineHeight: 1.5 }}>
          <span style={{ color: "#4f8ef7", cursor: "pointer" }}>{t("auth.agreeTerms")}</span> {t("auth.agreeAnd")} <span style={{ color: "#4f8ef7", cursor: "pointer" }}>{t("auth.agreePrivacy")}</span>{t("auth.agreeConsent")} <span style={{ color: "#ef4444" }}>*</span>
        </span>
      </label>

      {error && <div style={{ padding: "8px 12px", borderRadius: 8, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)", color: "#ef4444", fontSize: 11 }}>{error}</div>}

      <div style={{ padding: "8px 12px", borderRadius: 8, background: "rgba(79,142,247,0.06)", border: "1px solid rgba(79,142,247,0.2)", fontSize: 10, color: "#4f8ef7" }}>
        {t("auth.demoPlanNote")}
      </div>

      <button type="submit" disabled={loading} style={{
        padding: "13px 0", borderRadius: 10, border: "none",
        background: loading ? "rgba(34,197,94,0.4)" : "linear-gradient(135deg,#22c55e,#16a34a)",
        color: "#fff", fontWeight: 800, fontSize: 14, cursor: loading ? "not-allowed" : "pointer",
      }}>
        {loading ? t("auth.registering") : t("auth.startFree")}
      </button>

      <div style={{ textAlign: "center", fontSize: 11, color: "var(--text-3)" }}>
        {t("auth.alreadyHaveAccount")}{" "}
        <button type="button" onClick={() => onSwitch("login")} style={{ background: "none", border: "none", color: "#4f8ef7", fontWeight: 700, cursor: "pointer", fontSize: 11 }}>{t("auth.loginLink")}</button>
      </div>
    </form>
  );
}

/* ─── Paid Register Form ────────────────────────────────────── */
function PaidRegisterForm({ selectedPlan, onBack, onSwitch }) {
  const t = useT();
  const { register } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: account, 2: business, 3: channels

  /* Step 1 - Account */
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  /* Step 2 - Business Info */
  const [company, setCompany] = useState("");
  const [ceoName, setCeoName] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [businessNumber, setBusinessNumber] = useState(""); // 사업자번호
  const [country, setCountry] = useState("대한민국");
  const [zipCode, setZipCode] = useState("");
  const [address, setAddress] = useState("");
  const [addressDetail, setAddressDetail] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");

  /* Step 3 - Channels */
  const [salesChannels, setSalesChannels] = useState([]);
  const [adChannels, setAdChannels] = useState([]);
  const [monthlyRevenue, setMonthlyRevenue] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [agreeMarketing, setAgreeMarketing] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const PLAN_CFG = PAID_PLANS.find(p => p.id === selectedPlan) || PAID_PLANS[1];

  const toggleChannel = (arr, setArr, key) =>
    setArr(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);

  const validateStep1 = () => {
    if (!name.trim()) return t("auth.nameRequired");
    if (!email.trim()) return t("auth.emailRequired");
    if (password.length < 6) return t("auth.passwordTooShort");
    if (password !== confirm) return t("auth.passwordMismatch");
    return null;
  };

  const validateStep2 = () => {
    if (!company.trim()) return t("auth.companyRequired");
    if (!ceoName.trim()) return t("auth.ceoRequired");
    if (!businessType) return t("auth.businessTypeRequired");
    if (!businessNumber.trim()) return t("auth.businessNumberRequired");
    if (!country) return t("auth.countryRequired");
    if (!address.trim()) return t("auth.addressRequired");
    if (!phone.trim()) return t("auth.phoneRequired");
    return null;
  };

  const validateStep3 = () => {
    if (salesChannels.length === 0) return t("auth.salesChannelRequired");
    if (!agreeTerms || !agreePrivacy) return t("auth.termsRequired");
    return null;
  };

  const nextStep = () => {
    setError(null);
    if (step === 1) {
      const err = validateStep1();
      if (err) { setError(err); return; }
    } else if (step === 2) {
      const err = validateStep2();
      if (err) { setError(err); return; }
    }
    setStep(s => s + 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = validateStep3();
    if (err) { setError(err); return; }
    setLoading(true);
    try {
      const extraData = {
        plan: selectedPlan,
        company, ceo_name: ceoName, business_type: businessType,
        business_number: businessNumber, country, zip_code: zipCode,
        address: `${address} ${addressDetail}`.trim(), phone, website,
        sales_channels: salesChannels, ad_channels: adChannels,
        monthly_revenue: monthlyRevenue, agree_marketing: agreeMarketing,
      };
      const result = await register(email, password, name, company, extraData);
      navigate("/dashboard", {
        replace: true,
        state: result?.coupon ? { couponAlert: result.coupon } : undefined,
      });
    } catch (err) { setError(err.message); }
    setLoading(false);
  };

  const StepIndicator = () => (
    <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 16 }}>
      {[1, 2, 3].map(s => (
        <React.Fragment key={s}>
          <div style={{
            width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 11, fontWeight: 800, flexShrink: 0,
            background: step >= s ? PLAN_CFG.color : "rgba(99,140,255,0.1)",
            color: step >= s ? "#fff" : "var(--text-3)",
            boxShadow: step === s ? `0 0 0 3px ${PLAN_CFG.color}33` : "none",
          }}>{s}</div>
          {s < 3 && <div style={{ flex: 1, height: 2, background: step > s ? PLAN_CFG.color : "rgba(99,140,255,0.1)", borderRadius: 1 }} />}
        </React.Fragment>
      ))}
      <div style={{ fontSize: 10, color: "var(--text-3)", marginLeft: 6, whiteSpace: "nowrap" }}>
        {step === 1 ? t("auth.step1Account") : step === 2 ? t("auth.step2Business") : t("auth.step3Channels")}
      </div>
    </div>
  );

  return (
    <div style={{ display: "grid", gap: 14 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 10, background: `${PLAN_CFG.color}0D`, border: `1px solid ${PLAN_CFG.color}33` }}>
        <span style={{ fontSize: 20 }}>💎</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: 12, color: PLAN_CFG.color }}>{PLAN_CFG.label} {t("auth.paidPlanTitle", { plan: "" })}</div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginTop: 1 }}>{t("auth.paidPlanNote")}</div>
        </div>
        <button type="button" onClick={step === 1 ? onBack : () => setStep(s => s - 1)}
          style={{ background: "none", border: "none", color: "var(--text-3)", cursor: "pointer", fontSize: 18 }}>←</button>
      </div>

      <StepIndicator />

      {/* ─── STEP 1: Account ─── */}
      {step === 1 && (
        <div style={{ display: "grid", gap: 12 }}>
          <Field label={t("auth.nameLabel")} value={name} onChange={setName} placeholder="John Doe" required autoComplete="name" />
          <Field label={t("auth.emailLabel")} type="email" value={email} onChange={setEmail} placeholder="business@company.com" required autoComplete="email" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <Field label={t("auth.passwordHint")} type="password" value={password} onChange={setPassword} placeholder="••••••••" required autoComplete="new-password" />
            <Field label={t("auth.passwordConfirm")} type="password" value={confirm} onChange={setConfirm} placeholder="••••••••" required autoComplete="new-password" />
          </div>
          {error && <div style={{ padding: "8px 12px", borderRadius: 8, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)", color: "#ef4444", fontSize: 11 }}>{error}</div>}
          <button type="button" onClick={nextStep} style={{
            padding: "12px 0", borderRadius: 10, border: "none",
            background: `linear-gradient(135deg,${PLAN_CFG.color},${PLAN_CFG.color}cc)`,
            color: "#fff", fontWeight: 800, fontSize: 14, cursor: "pointer",
          }}>{t("auth.nextBusiness")}</button>
        </div>
      )}

      {/* ─── STEP 2: Business Info ─── */}
      {step === 2 && (
        <div style={{ display: "grid", gap: 10 }}>
          <div style={{ padding: "8px 12px", borderRadius: 8, background: "rgba(234,179,8,0.06)", border: "1px solid rgba(234,179,8,0.2)", fontSize: 10, color: "#eab308" }}>
            {t("auth.businessWarning")}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <Field label={t("auth.companyLabel")} value={company} onChange={setCompany} placeholder="Geniego Inc." required />
            <Field label={t("auth.ceoNameLabel")} value={ceoName} onChange={setCeoName} placeholder="John Smith" required />
          </div>
          <SelectField label={t("auth.businessTypeLabel")} value={businessType} onChange={setBusinessType} options={BUSINESS_TYPES} required />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <Field label={t("auth.businessNumberLabel")} value={businessNumber} onChange={setBusinessNumber} placeholder="000-00-00000" required hint={t("auth.businessNumberHint")} />
            <Field label={t("auth.phoneLabel")} type="tel" value={phone} onChange={setPhone} placeholder="010-0000-0000" required autoComplete="tel" />
          </div>
          <SelectField label={t("auth.countryLabel")} value={country} onChange={setCountry} options={COUNTRIES} required />
          <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 8 }}>
            <Field label={t("auth.zipCodeLabel")} value={zipCode} onChange={setZipCode} placeholder="12345" autoComplete="postal-code" />
            <Field label={t("auth.addressLabel")} value={address} onChange={setAddress} placeholder="서울시 강남구 테헤란로 123" required autoComplete="street-address" />
          </div>
          <Field label={t("auth.addressDetailLabel")} value={addressDetail} onChange={setAddressDetail} placeholder="○○빌딩 5층" autoComplete="address-line2" />
          <Field label={t("auth.websiteLabel")} value={website} onChange={setWebsite} placeholder="https://www.myshop.com" type="url" />

          {error && <div style={{ padding: "8px 12px", borderRadius: 8, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)", color: "#ef4444", fontSize: 11 }}>{error}</div>}

          <button type="button" onClick={nextStep} style={{
            padding: "12px 0", borderRadius: 10, border: "none",
            background: `linear-gradient(135deg,${PLAN_CFG.color},${PLAN_CFG.color}cc)`,
            color: "#fff", fontWeight: 800, fontSize: 14, cursor: "pointer",
          }}>{t("auth.nextChannels")}</button>
        </div>
      )}

      {/* ─── STEP 3: Channels & Agree ─── */}
      {step === 3 && (
        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12 }}>
          {/* Sales Channels */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: "var(--text-2)", marginBottom: 8 }}>
              {t("auth.salesChannelTitle")} <span style={{ color: "#ef4444" }}>*</span>{" "}
              <span style={{ fontSize: 10, color: "var(--text-3)", fontWeight: 400 }}>{t("auth.salesChannelNote")}</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              {SALES_CHANNELS.map(ch => (
                <button key={ch.key} type="button" onClick={() => toggleChannel(salesChannels, setSalesChannels, ch.key)} style={{
                  padding: "8px 10px", borderRadius: 8, cursor: "pointer", textAlign: "left",
                  background: salesChannels.includes(ch.key) ? "rgba(79,142,247,0.12)" : "rgba(255,255,255,0.02)",
                  border: `1px solid ${salesChannels.includes(ch.key) ? "#4f8ef7" : "rgba(99,140,255,0.12)"}`,
                  display: "flex", alignItems: "center", gap: 6,
                }}>
                  <span style={{ fontSize: 13 }}>{ch.icon}</span>
                  <span style={{ fontSize: 11, color: salesChannels.includes(ch.key) ? "#4f8ef7" : "var(--text-2)", fontWeight: salesChannels.includes(ch.key) ? 700 : 400 }}>{ch.label}</span>
                  {salesChannels.includes(ch.key) && <span style={{ marginLeft: "auto", color: "#4f8ef7", fontSize: 12 }}>✓</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Ad Channels */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: "var(--text-2)", marginBottom: 8 }}>
              {t("auth.adChannelTitle")}{" "}
              <span style={{ fontSize: 10, color: "var(--text-3)", fontWeight: 400 }}>{t("auth.adChannelNote")}</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
              {AD_CHANNELS.map(ch => (
                <label key={ch.key} style={{ display: "flex", alignItems: "center", gap: 7, cursor: "pointer", padding: "6px 8px", borderRadius: 7, background: adChannels.includes(ch.key) ? "rgba(168,85,247,0.08)" : "transparent", border: `1px solid ${adChannels.includes(ch.key) ? "rgba(168,85,247,0.3)" : "transparent"}` }}>
                  <input type="checkbox" checked={adChannels.includes(ch.key)}
                    onChange={() => toggleChannel(adChannels, setAdChannels, ch.key)}
                    style={{ accentColor: "#a855f7", width: 13, height: 13, flexShrink: 0 }} />
                  <span style={{ fontSize: 11, color: adChannels.includes(ch.key) ? "#a855f7" : "var(--text-3)" }}>{ch.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Monthly Revenue */}
          <SelectField label={t("auth.monthlyRevenueLabel")} value={monthlyRevenue} onChange={setMonthlyRevenue}
            options={["1억 미만", "1억~5억", "5억~20억", "20억~100억", "100억 이상"]} />

          {/* Agreements */}
          <div style={{ display: "grid", gap: 8, padding: "12px 14px", borderRadius: 10, background: "rgba(99,140,255,0.04)", border: "1px solid rgba(99,140,255,0.12)" }}>
            {[
              { key: "terms", val: agreeTerms, set: setAgreeTerms, label: t("auth.agreeTerms"), required: true },
              { key: "privacy", val: agreePrivacy, set: setAgreePrivacy, label: t("auth.agreePrivacy"), required: true },
              { key: "marketing", val: agreeMarketing, set: setAgreeMarketing, label: t("auth.agreeMarketing"), required: false },
            ].map(({ key, val, set, label, required }) => (
              <label key={key} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                <input type="checkbox" checked={val} onChange={e => set(e.target.checked)}
                  style={{ accentColor: "#4f8ef7", width: 14, height: 14, flexShrink: 0 }} />
                <span style={{ fontSize: 11, color: "var(--text-2)" }}>
                  <span style={{ color: "#4f8ef7" }}>{label}</span>
                  {required && <span style={{ color: "#ef4444" }}> *</span>}
                </span>
              </label>
            ))}
          </div>

          {error && <div style={{ padding: "8px 12px", borderRadius: 8, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)", color: "#ef4444", fontSize: 11 }}>{error}</div>}

          <div style={{ padding: "10px 14px", borderRadius: 10, background: `${PLAN_CFG.color}0D`, border: `1px solid ${PLAN_CFG.color}33`, fontSize: 11, color: PLAN_CFG.color }}>
            {t("auth.completionNote", { plan: PLAN_CFG.label, count: salesChannels.length })}
          </div>

          <button type="submit" disabled={loading} style={{
            padding: "14px 0", borderRadius: 10, border: "none",
            background: loading ? `${PLAN_CFG.color}66` : `linear-gradient(135deg,${PLAN_CFG.color},${PLAN_CFG.color}cc)`,
            color: "#fff", fontWeight: 800, fontSize: 14, cursor: loading ? "not-allowed" : "pointer",
            boxShadow: `0 6px 20px ${PLAN_CFG.color}33`,
          }}>
            {loading ? t("auth.processingRegister") : `🚀 ${PLAN_CFG.label} ${t("auth.startPlan", { plan: "" }).replace("🚀 ", "").replace(" 플랜으로 Start하기", " 플랜으로 Start하기")}`}
          </button>

          <div style={{ textAlign: "center", fontSize: 11, color: "var(--text-3)" }}>
            {t("auth.alreadyHaveAccount")}{" "}
            <button type="button" onClick={() => onSwitch("login")} style={{ background: "none", border: "none", color: "#4f8ef7", fontWeight: 700, cursor: "pointer", fontSize: 11 }}>{t("auth.loginLink")}</button>
          </div>
        </form>
      )}
    </div>
  );
}

/* ─── Admin Login Form ─────────────────────────────────────── */
function AdminLoginForm() {
  const t = useT();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [adminKey, setAdminKey] = useState("");
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const ADMIN_GATE = "GENIEGO-ADMIN";

  const verifyKey = (e) => {
    e.preventDefault();
    if (adminKey.trim().toUpperCase() !== ADMIN_GATE) { setError(t("auth.wrongAdminKey")); return; }
    setError(null); setStep(2);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null); setLoading(true);
    try {
      const user = await login(email, password);
      const effectivePlan = user.plans || user.plan;
      if (effectivePlan !== "admin") throw new Error(t("auth.notAdminAccount"));
      navigate("/admin", { replace: true });
    } catch (err) { setError(err.message); }
    setLoading(false);
  };

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 10, background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)" }}>
        <span style={{ fontSize: 20 }}>🔐</span>
        <div>
          <div style={{ fontWeight: 800, fontSize: 12, color: "#ef4444" }}>{t("auth.adminLoginTitle")}</div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>{t("auth.adminLoginDesc")}</div>
        </div>
      </div>
      {step === 1 ? (
        <form onSubmit={verifyKey} style={{ display: "grid", gap: 12 }}>
          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--text-2)", marginBottom: 5 }}>{t("auth.adminKeyLabel")}</label>
            <input type="password" value={adminKey} onChange={e => setAdminKey(e.target.value)} placeholder={t("auth.adminKeyPh")} required
              style={{ width: "100%", boxSizing: "border-box", padding: "10px 14px", borderRadius: 10, border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.04)", color: "var(--text-1)", fontSize: 13, outline: "none" }} />
          </div>
          {error && <div style={{ padding: "8px 12px", borderRadius: 8, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)", color: "#ef4444", fontSize: 11 }}>{error}</div>}
          <button type="submit" style={{ padding: "12px 0", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#ef4444,#dc2626)", color: "#fff", fontWeight: 800, fontSize: 14, cursor: "pointer" }}>{t("auth.verifyKey")}</button>
        </form>
      ) : (
        <form onSubmit={handleLogin} style={{ display: "grid", gap: 12 }}>
          <div style={{ padding: "6px 12px", borderRadius: 8, background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)", fontSize: 11, color: "#22c55e" }}>{t("auth.keyVerified")}</div>
          <Field label={t("auth.adminEmailLabel")} type="email" value={email} onChange={setEmail} placeholder="admin@example.com" required autoComplete="email" />
          <Field label={t("auth.passwordLabel")} type="password" value={password} onChange={setPassword} placeholder="••••••••" required autoComplete="current-password" />
          {error && <div style={{ padding: "8px 12px", borderRadius: 8, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)", color: "#ef4444", fontSize: 11 }}>{error}</div>}
          <button type="submit" disabled={loading} style={{ padding: "12px 0", borderRadius: 10, border: "none", background: loading ? "rgba(239,68,68,0.4)" : "linear-gradient(135deg,#ef4444,#dc2626)", color: "#fff", fontWeight: 800, fontSize: 14, cursor: loading ? "not-allowed" : "pointer" }}>
            {loading ? t("auth.loggingIn") : t("auth.adminLoginBtn")}
          </button>
          <button type="button" onClick={() => { setStep(1); setError(null); setAdminKey(""); }} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: 11, cursor: "pointer" }}>{t("auth.reenterKey")}</button>
        </form>
      )}
    </div>
  );
}

/* ─── MAIN ──────────────────────────────────────────────────── */
export default function AuthPage() {
  const [mode, setMode] = useState("login"); // login | register | free | paid | admin
  const [planType, setPlanType] = useState("free");    // free | paid
  const [selectedPaid, setSelectedPaid] = useState("pro");

  const handleSwitch = (target) => {
    if (target === "register") { setMode("register"); return; }
    setMode(target);
  };

  const handlePlanContinue = () => {
    if (planType === "free") setMode("free");
    else setMode("paid");
  };

  const t = useT();
  const TABS = [
    { id: "login", label: t("auth.loginBtn").replace("🔐 ", "") },
    { id: "register", label: t("auth.registerLink") },
    { id: "admin", label: "🔐 Admin" },
  ];

  const isFullFlow = ["free", "paid"].includes(mode);

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "var(--surface-1)", padding: "24px 16px",
    }}>
      {/* Background decorations */}
      <div style={{ position: "fixed", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
        <div style={{ position: "absolute", top: "-20%", right: "-10%", width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle,rgba(79,142,247,0.06) 0%,transparent 70%)" }} />
        <div style={{ position: "absolute", bottom: "-20%", left: "-10%", width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle,rgba(168,85,247,0.05) 0%,transparent 70%)" }} />
        {mode === "admin" && <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 700, height: 700, borderRadius: "50%", background: "radial-gradient(circle,rgba(239,68,68,0.04) 0%,transparent 70%)" }} />}
      </div>

      <div style={{ width: "100%", maxWidth: mode === "paid" ? 520 : 420, position: "relative", zIndex: 1 }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <img
            src="/logo_v3.png"
            alt="Geniego-ROI"
            style={{
              width: 150, height: 150,
              objectFit: "contain",
              margin: "0 auto 8px",
              display: "block",
              imageRendering: "-webkit-optimize-contrast",
              filter: "brightness(1.1)",
            }}
          />
          <div style={{ fontWeight: 900, fontSize: 22, letterSpacing: "-0.5px" }}>
            <span style={{ background: mode === "admin" ? "linear-gradient(135deg,#ef4444,#dc2626)" : "linear-gradient(135deg,#4f8ef7,#a855f7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Geniego-ROI</span>
          </div>
          <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 4 }}>Revenue + Risk + Governance · Settlement OS</div>
        </div>

        {/* Card */}
        <div style={{
          padding: "24px 24px", borderRadius: 20,
          background: "rgba(255,255,255,0.03)", backdropFilter: "blur(20px)",
          border: `1px solid ${mode === "admin" ? "rgba(239,68,68,0.15)" : "rgba(99,140,255,0.12)"}`,
          boxShadow: "0 24px 64px rgba(0,0,0,0.3)",
          maxHeight: "80vh", overflowY: "auto",
        }}>
          {/* Tab bar — only for login/register/admin views */}
          {!isFullFlow && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 4, marginBottom: 22, background: "rgba(99,140,255,0.06)", borderRadius: 10, padding: 4 }}>
              {TABS.map(({ id, label }) => (
                <button key={id} onClick={() => setMode(id)} style={{
                  padding: "8px 0", borderRadius: 8, border: "none", fontWeight: 800, fontSize: 11, cursor: "pointer",
                  background: mode === id ? (id === "admin" ? "rgba(239,68,68,0.12)" : "rgba(79,142,247,0.12)") : "transparent",
                  color: mode === id ? (id === "admin" ? "#ef4444" : "#4f8ef7") : "var(--text-3)",
                  transition: "all 150ms",
                }}>{label}</button>
              ))}
            </div>
          )}

          {/* Login */}
          {mode === "login" && <LoginForm onSwitch={handleSwitch} />}

          {/* Register — plan selector */}
          {mode === "register" && (
            <div style={{ display: "grid", gap: 14 }}>
              <PlanSelector planType={planType} setPlanType={setPlanType} selectedPaid={selectedPaid} setSelectedPaid={setSelectedPaid} />
              <button type="button" onClick={handlePlanContinue} style={{
                padding: "13px 0", borderRadius: 10, border: "none",
                background: planType === "free" ? "linear-gradient(135deg,#22c55e,#16a34a)" : "linear-gradient(135deg,#a855f7,#7c3aed)",
                color: "#fff", fontWeight: 800, fontSize: 14, cursor: "pointer",
              }}>
                {planType === "free" ? t("auth.startFree") : `💎 ${t("auth.paidPlan")} →`}
              </button>
              <div style={{ textAlign: "center", fontSize: 11, color: "var(--text-3)" }}>
                {t("auth.alreadyHaveAccount")}{" "}
                <button type="button" onClick={() => setMode("login")} style={{ background: "none", border: "none", color: "#4f8ef7", fontWeight: 700, cursor: "pointer", fontSize: 11 }}>{t("auth.loginLink")}</button>
              </div>
            </div>
          )}

          {/* Free register */}
          {mode === "free" && <FreeRegisterForm onSwitch={handleSwitch} onBack={() => setMode("register")} />}

          {/* Paid register */}
          {mode === "paid" && <PaidRegisterForm selectedPlan={selectedPaid} onBack={() => setMode("register")} onSwitch={handleSwitch} />}

          {/* Admin login */}
          {mode === "admin" && <AdminLoginForm />}
        </div>

        <div style={{ textAlign: "center", marginTop: 16, fontSize: 10, color: "var(--text-3)" }}>
          v423.0.0 · © 2026 Geniego-ROI. All rights reserved.
        </div>
      </div>
    </div>
  );
}
