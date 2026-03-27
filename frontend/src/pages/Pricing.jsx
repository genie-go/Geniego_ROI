import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import { useT } from "../i18n/index.js";

/* ─── Constant ──────────────────────────────────────────────────────────── */
const CYCLE_ORDER = ["monthly", "quarterly", "semi_annual", "yearly"];
const CYCLE_LABEL_KEY = { monthly: "cycleMonthly", quarterly: "cycleQuarterly", semi_annual: "cycleSemiAnnual", yearly: "cycleYearly" };
const CYCLE_MONTHS = { monthly: 1, quarterly: 3, semi_annual: 6, yearly: 12 };
// Discount Rate은 API plans 데이터에서 동적 계산 (하드코딩 제거)
// computeCycleDiscounts(plans) → { quarterly: "N%", semi_annual: "N%", yearly: "N%" }
function computeCycleDiscounts(plans) {
  const discMap = {};
  // Paid Plan(growth/pro/enterprise)의 1Account 티어 기준으로 cycleper Max discount_pct 추출
  const PAID = ["growth", "pro", "enterprise", "starter"];
  plans.forEach(p => {
    if (!PAID.includes(p.id) || !p.tiers) return;
    const tier1 = p.tiers.find(t => t.acct === "1") || p.tiers[0];
    if (!tier1?.cycles) return;
    Object.entries(tier1.cycles).forEach(([ck, cd]) => {
      if (ck === "monthly") return;
      const disc = cd?.discount_pct;
      if (disc > 0) {
        discMap[ck] = Math.max(discMap[ck] || 0, disc);
      }
    });
  });
  // 숫자 → "%" 문자열 변환
  const result = {};
  Object.entries(discMap).forEach(([ck, v]) => {
    result[ck] = Number.isInteger(v) ? `${v}%` : `${parseFloat(v.toFixed(1))}%`;
  });
  return result;
}

/* 플랜per 상세 서비스 Description — i18n 완전 Apply 버전 */
function getPlanDetail(t) {
  return {
  free: {
    emoji: "🆓", color: "#8da4c4",
    tagline: t("pricingDetail.free_tagline"),
    headline: t("pricingDetail.free_headline"),
    desc: t("pricingDetail.free_desc"),
    sections: [
      { icon: "🏠", label: t("pricingDetail.free_s1"), items: [t("pricingDetail.free_s1i1"), t("pricingDetail.free_s1i2"), t("pricingDetail.free_s1i3")] },
      { icon: "📚", label: t("pricingDetail.free_s2"), items: ["FAQ", t("pricingDetail.free_s2i2"), t("pricingDetail.free_s2i3")] },
      { icon: "💳", label: t("pricingDetail.free_s3"), items: [t("pricingDetail.free_s3i1"), t("pricingDetail.free_s3i2")] },
    ],
    limits: [t("pricingDetail.free_l1"), t("pricingDetail.free_l2"), t("pricingDetail.free_l3")],
  },
  growth: {
    emoji: "📈", color: "#4f8ef7",
    tagline: t("pricingDetail.growth_tagline"),
    headline: t("pricingDetail.growth_headline"),
    desc: t("pricingDetail.growth_desc"),
    sections: [
      { icon: "🚀", label: t("pricingDetail.growth_s1"), items: [t("pricingDetail.growth_s1i1"), t("pricingDetail.growth_s1i2"), t("pricingDetail.growth_s1i3"), t("pricingDetail.growth_s1i4"), t("pricingDetail.growth_s1i5")] },
      { icon: "📣", label: t("pricingDetail.growth_s2"), items: [t("pricingDetail.growth_s2i1"), t("pricingDetail.growth_s2i2"), t("pricingDetail.growth_s2i3"), t("pricingDetail.growth_s2i4"), t("pricingDetail.growth_s2i5")] },
      { icon: "👥", label: t("pricingDetail.growth_s3"), items: [t("pricingDetail.growth_s3i1"), t("pricingDetail.growth_s3i2"), t("pricingDetail.growth_s3i3"), t("pricingDetail.growth_s3i4"), t("pricingDetail.growth_s3i5"), t("pricingDetail.growth_s3i6")] },
      { icon: "🛒", label: t("pricingDetail.growth_s4"), items: [t("pricingDetail.growth_s4i1"), t("pricingDetail.growth_s4i2"), t("pricingDetail.growth_s4i3"), t("pricingDetail.growth_s4i4"), t("pricingDetail.growth_s4i5"), t("pricingDetail.growth_s4i6")] },
      { icon: "📊", label: t("pricingDetail.growth_s5"), items: [t("pricingDetail.growth_s5i1"), t("pricingDetail.growth_s5i2"), t("pricingDetail.growth_s5i3"), t("pricingDetail.growth_s5i4")] },
      { icon: "💳", label: t("pricingDetail.growth_s6"), items: [t("pricingDetail.growth_s6i1"), t("pricingDetail.growth_s6i2"), t("pricingDetail.growth_s6i3"), t("pricingDetail.growth_s6i4")] },
      { icon: "🔌", label: t("pricingDetail.growth_s7"), items: [t("pricingDetail.growth_s7i1"), t("pricingDetail.growth_s7i2"), t("pricingDetail.growth_s7i3")] },
      { icon: "👥", label: t("pricingDetail.growth_s8"), items: [t("pricingDetail.growth_s8i1"), t("pricingDetail.growth_s8i2"), t("pricingDetail.growth_s8i3")] },
    ],
    limits: [t("pricingDetail.growth_l1"), t("pricingDetail.growth_l2"), t("pricingDetail.growth_l3"), t("pricingDetail.growth_l4"), t("pricingDetail.growth_l5"), t("pricingDetail.growth_l6")],
  },
  pro: {
    emoji: "🚀", color: "#a855f7",
    tagline: t("pricingDetail.pro_tagline"),
    headline: t("pricingDetail.pro_headline"),
    badge: t("pricingDetail.pro_badge"),
    desc: t("pricingDetail.pro_desc"),
    sections: [
      { icon: "🧠", label: t("pricingDetail.pro_s1"), items: [t("pricingDetail.pro_s1i1"), t("pricingDetail.pro_s1i2"), t("pricingDetail.pro_s1i3"), t("pricingDetail.pro_s1i4"), t("pricingDetail.pro_s1i5"), t("pricingDetail.pro_s1i6")] },
      { icon: "🗺", label: t("pricingDetail.pro_s2"), items: [t("pricingDetail.pro_s2i1"), t("pricingDetail.pro_s2i2"), t("pricingDetail.pro_s2i3"), t("pricingDetail.pro_s2i4")] },
      { icon: "🌏", label: t("pricingDetail.pro_s3"), items: [t("pricingDetail.pro_s3i1"), t("pricingDetail.pro_s3i2"), t("pricingDetail.pro_s3i3"), t("pricingDetail.pro_s3i4"), t("pricingDetail.pro_s3i5")] },
      { icon: "🏭", label: t("pricingDetail.pro_s4"), items: [t("pricingDetail.pro_s4i1"), t("pricingDetail.pro_s4i2"), t("pricingDetail.pro_s4i3"), t("pricingDetail.pro_s4i4")] },
      { icon: "🤖", label: t("pricingDetail.pro_s5"), items: [t("pricingDetail.pro_s5i1"), t("pricingDetail.pro_s5i2"), t("pricingDetail.pro_s5i3"), t("pricingDetail.pro_s5i4"), t("pricingDetail.pro_s5i5")] },
      { icon: "⭐", label: t("pricingDetail.pro_s6"), items: [t("pricingDetail.pro_s6i1"), t("pricingDetail.pro_s6i2"), t("pricingDetail.pro_s6i3"), t("pricingDetail.pro_s6i4")] },
      { icon: "🤝", label: t("pricingDetail.pro_s7"), items: [t("pricingDetail.pro_s7i1"), t("pricingDetail.pro_s7i2"), t("pricingDetail.pro_s7i3"), t("pricingDetail.pro_s7i4")] },
      { icon: "🎯", label: t("pricingDetail.pro_s8"), items: [t("pricingDetail.pro_s8i1"), t("pricingDetail.pro_s8i2"), t("pricingDetail.pro_s8i3"), t("pricingDetail.pro_s8i4"), t("pricingDetail.pro_s8i5")] },
      { icon: "📊", label: t("pricingDetail.pro_s9"), items: [t("pricingDetail.pro_s9i1"), t("pricingDetail.pro_s9i2"), t("pricingDetail.pro_s9i3"), t("pricingDetail.pro_s9i4")] },
      { icon: "💱", label: t("pricingDetail.pro_s10"), items: [t("pricingDetail.pro_s10i1"), t("pricingDetail.pro_s10i2"), t("pricingDetail.pro_s10i3"), t("pricingDetail.pro_s10i4")] },
    ],
    limits: [t("pricingDetail.pro_l1"), t("pricingDetail.pro_l2"), t("pricingDetail.pro_l3"), t("pricingDetail.pro_l4"), t("pricingDetail.pro_l5"), t("pricingDetail.pro_l6"), t("pricingDetail.pro_l7"), t("pricingDetail.pro_l8"), t("pricingDetail.pro_l9")],
  },
  enterprise: {
    emoji: "🌐", color: "#f59e0b",
    tagline: t("pricingDetail.ent_tagline"),
    headline: t("pricingDetail.ent_headline"),
    badge: t("pricingDetail.ent_badge"),
    desc: t("pricingDetail.ent_desc"),
    sections: [
      { icon: "↩", label: t("pricingDetail.ent_s1"), items: [t("pricingDetail.ent_s1i1"), t("pricingDetail.ent_s1i2"), t("pricingDetail.ent_s1i3"), t("pricingDetail.ent_s1i4")] },
      { icon: "🌏", label: t("pricingDetail.ent_s2"), items: [t("pricingDetail.ent_s2i1"), t("pricingDetail.ent_s2i2"), t("pricingDetail.ent_s2i3"), t("pricingDetail.ent_s2i4")] },
      { icon: "📊", label: t("pricingDetail.ent_s3"), items: [t("pricingDetail.ent_s3i1"), t("pricingDetail.ent_s3i2"), t("pricingDetail.ent_s3i3"), t("pricingDetail.ent_s3i4"), t("pricingDetail.ent_s3i5")] },
      { icon: "🗂", label: t("pricingDetail.ent_s4"), items: [t("pricingDetail.ent_s4i1"), t("pricingDetail.ent_s4i2"), t("pricingDetail.ent_s4i3"), t("pricingDetail.ent_s4i4"), t("pricingDetail.ent_s4i5"), t("pricingDetail.ent_s4i6")] },
      { icon: "🤝", label: t("pricingDetail.ent_s5"), items: [t("pricingDetail.ent_s5i1"), t("pricingDetail.ent_s5i2"), t("pricingDetail.ent_s5i3"), t("pricingDetail.ent_s5i4")] },
      { icon: "💡", label: t("pricingDetail.ent_s6"), items: [t("pricingDetail.ent_s6i1"), t("pricingDetail.ent_s6i2"), t("pricingDetail.ent_s6i3"), t("pricingDetail.ent_s6i4"), t("pricingDetail.ent_s6i5"), t("pricingDetail.ent_s6i6")] },
      { icon: "⚡", label: t("pricingDetail.ent_s7"), items: [t("pricingDetail.ent_s7i1"), t("pricingDetail.ent_s7i2"), t("pricingDetail.ent_s7i3"), t("pricingDetail.ent_s7i4"), t("pricingDetail.ent_s7i5"), t("pricingDetail.ent_s7i6")] },
      { icon: "🚀", label: t("pricingDetail.ent_s8"), items: [t("pricingDetail.ent_s8i1"), t("pricingDetail.ent_s8i2"), t("pricingDetail.ent_s8i3"), t("pricingDetail.ent_s8i4")] },
      { icon: "💎", label: t("pricingDetail.ent_s9"), items: [t("pricingDetail.ent_s9i1"), t("pricingDetail.ent_s9i2"), t("pricingDetail.ent_s9i3"), t("pricingDetail.ent_s9i4")] },
    ],
    limits: [],
  },
  };
}


/* 플랜 Compare Table — i18n 완전 Apply */
function getCompareRows(t) {
  return [
  { label: t("cmpRow.r1"),  free: t("cmpVal.basic"), growth: "✓ "+t("cmpVal.realtime"), pro: "✓ "+t("cmpVal.all"), enterprise: "✓ "+t("cmpVal.all") },
  { label: t("cmpRow.r2"),  free: "—", growth: "✓ "+t("cmpVal.domestic_core"), pro: "✓ All + A/B", enterprise: "✓ "+t("cmpVal.all") },
  { label: t("cmpRow.r3"),  free: "—", growth: "—", pro: "✓", enterprise: "✓" },
  { label: t("cmpRow.r4"),  free: "—", growth: "—", pro: "✓", enterprise: "✓" },
  { label: t("cmpRow.r5"),  free: "—", growth: "—", pro: "✓ "+t("cmpVal.basic_auto"), enterprise: "✓ "+t("cmpVal.advanced_custom") },
  { label: t("cmpRow.r6"),  free: "—", growth: "✓ "+t("cmpVal.domestic"), pro: "✓ "+t("cmpVal.dom_global"), enterprise: "✓ + "+t("cmpVal.market_share") },
  { label: t("cmpRow.r7"),  free: "—", growth: "—", pro: "✓ Basic", enterprise: "✓ "+t("cmpVal.conv_path_all") },
  { label: t("cmpRow.r8"),  free: "—", growth: "—", pro: "✓ Basic", enterprise: "✓ + "+t("cmpVal.trend_forecast") },
  { label: t("cmpRow.r9"),  free: "—", growth: "✓ "+t("cmpVal.domestic"), pro: "✓ +WhatsApp/DM/LINE", enterprise: "✓ All + "+t("cmpVal.bizboard") },
  { label: t("cmpRow.r10"), free: "—", growth: "—", pro: "✓ AI+UGC", enterprise: "✓ + "+t("cmpVal.competitor_compare") },
  { label: t("cmpRow.r11"), free: "—", growth: "Coupang·Naver·Cafe24", pro: "✓ +Shopify·Amazon", enterprise: "✓ +Rakuten·Temu" },
  { label: t("cmpRow.r12"), free: "—", growth: "✓ Basic", pro: "✓ + "+t("cmpVal.location_barcode"), enterprise: "✓ "+t("cmpVal.all") },
  { label: t("cmpRow.r13"), free: "—", growth: t("cmpVal.list_view"), pro: "✓ Add·Edit", enterprise: "✓ + Delete·"+t("cmpVal.contract") },
  { label: t("cmpRow.r14"), free: "—", growth: "—", pro: "—", enterprise: "✓ "+t("cmpVal.policy_review") },
  { label: t("cmpRow.r15"), free: "—", growth: "✓ Basic", pro: "✓ "+t("cmpVal.cohort_pl"), enterprise: "✓ "+t("cmpVal.all") },
  { label: t("cmpRow.r16"), free: "—", growth: t("cmpVal.notification_basic"), pro: "✓ "+t("cmpVal.rule_writeback"), enterprise: "✓ + "+t("cmpVal.instant_rollback") },
  { label: t("cmpRow.r17"), free: "—", growth: "—", pro: "✓ Basic", enterprise: "✓ "+t("cmpVal.partner_api") },
  { label: t("cmpRow.r18"), free: "—", growth: "—", pro: "✓ "+t("cmpVal.install_analysis"), enterprise: "✓ + "+t("cmpVal.server_side") },
  { label: t("cmpRow.r19"), free: "—", growth: t("cmpVal.domestic_ads"), pro: "✓ All + API·Pixel", enterprise: "✓ + Data Product" },
  { label: t("cmpRow.r20"), free: "—", growth: "—", pro: t("cmpVal.schema_quality_view"), enterprise: "✓ SLA·"+t("cmpVal.owner_streaming") },
  { label: t("cmpRow.r21"), free: "—", growth: "✓ "+t("cmpVal.custom_excel"), pro: "✓ + "+t("cmpVal.anomaly_detect"), enterprise: "✓ + "+t("cmpVal.auto_scheduled_share") },
  { label: t("cmpRow.r22"), free: "—", growth: "✓ "+t("cmpVal.manual"), pro: "✓ "+t("cmpVal.realtime_rate"), enterprise: "✓ "+t("cmpVal.realtime_rate") },
  { label: t("cmpRow.r23"), free: "—", growth: "—", pro: t("cmpVal.perf_view"), enterprise: "✓ DB·"+t("cmpVal.campaign_settle") },
  { label: t("cmpRow.r24"), free: "—", growth: "—", pro: "✓ Run·"+t("cmpVal.reprocess"), enterprise: "✓ + "+t("cmpVal.notification_send") },
  { label: t("cmpRow.r25"), free: "—", growth: t("cmpVal.own_history"), pro: t("cmpVal.own_history"), enterprise: "✓ All·Export" },
  { label: t("cmpRow.r26"), free: "—", growth: t("cmpVal.list_invite"), pro: "✓ + "+t("cmpVal.activity_history"), enterprise: "✓ "+t("cmpVal.rbac_role") },
  { label: t("cmpRow.r27"), free: "1", growth: "1~"+t("cmpVal.unlimited"), pro: "1~"+t("cmpVal.unlimited"), enterprise: t("cmpVal.unlimited") },
  { label: t("cmpRow.r28"), free: "FAQ", growth: t("cmpVal.chat_support"), pro: t("cmpVal.dedicated_manager"), enterprise: t("cmpVal.dedicated_sla") },
  ];
}


const PLAN_COLOR = {
  free: "#8da4c4", starter: "#22c55e", growth: "#4f8ef7", pro: "#a855f7", enterprise: "#f59e0b"
};

const KRW = (v) => (v > 0 ? "₩" + Number(v).toLocaleString("ko-KR") : null);

function loadTossPayments(clientKey) {
  return new Promise((resolve, reject) => {
    if (window.TossPayments) { resolve(window.TossPayments(clientKey)); return; }
    const s = document.createElement("script");
    s.src = "https://js.tosspayments.com/v1/payment";
    s.onload = () => resolve(window.TossPayments(clientKey));
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

/* ─── 플랜 Card ─────────────────────────────────────────────────────── */
function PlanCard({ plan, cycle, selectedAcct, onAcctChange, onSubscribe, paying, currentPlanId, cycleDiscountMap }) {
  const t = useT();
  const [showDetail, setShowDetail] = useState(false);
  const PLAN_DETAIL = getPlanDetail(t);
  const detail = PLAN_DETAIL[plan.id] || {};
  const isPro = plan.id === "pro";
  const isEnt = plan.id === "enterprise";
  const isCurrent = currentPlanId === plan.id;

  const tierData = useMemo(() => {
    if (!plan.tiers || plan.tiers.length === 0) return null;
    const key = selectedAcct[plan.id] || plan.tiers[0]?.acct;
    // acct==='1'(1Account)을 우선 사용 — Select된 Account이 없으면 가장 낮은 Account Count tier
    const byAcct = plan.tiers.find(t => t.acct === key);
    return byAcct || plan.tiers.find(t => t.acct === "1") || plan.tiers[0];
  }, [plan, selectedAcct]);

  const cycleData = tierData?.cycles?.[cycle] || null;
  const price = cycleData?.monthly_price || null;
  const total = cycleData?.total_price || null;
  const months = CYCLE_MONTHS[cycle] || 1;
  const isMonthly = cycle === "monthly";

  const planColor = detail.color || plan.color || "#4f8ef7";

  return (
    <div style={{
      position: "relative", display: "flex", flexDirection: "column",
      borderRadius: 20, padding: "26px 20px 22px",
      background: isPro
        ? "linear-gradient(160deg,rgba(168,85,247,0.13),rgba(79,142,247,0.09))"
        : isEnt
          ? "linear-gradient(160deg,rgba(245,158,11,0.10),rgba(239,68,68,0.06))"
          : "rgba(255,255,255,0.025)",
      border: `1px solid ${(isPro || isEnt) ? planColor + "55" : "rgba(255,255,255,0.08)"}`,
      boxShadow: isPro ? `0 0 48px ${planColor}1a` : isEnt ? `0 0 36px ${planColor}14` : "none",
      transition: "transform 200ms, box-shadow 200ms",
    }}>
      {/* 배지 */}
      {detail.badge && (
        <div style={{
          position: "absolute", top: -13, left: "50%", transform: "translateX(-50%)",
          fontSize: 10, padding: "3px 14px", borderRadius: 20, whiteSpace: "nowrap",
          background: `linear-gradient(135deg,${planColor},${isPro ? "#4f8ef7" : "#ec4899"})`,
          color: "#fff", fontWeight: 900, letterSpacing: 0.5,
        }}>
          {detail.badge}
        </div>
      )}

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
        <span style={{ fontSize: 24 }}>{detail.emoji || plan.emoji}</span>
        <div>
          <div style={{ fontSize: 15, fontWeight: 900, color: "#fff" }}>{plan.name}</div>
          <div style={{ fontSize: 10, color: planColor, fontWeight: 700, marginTop: 1 }}>{detail.headline || plan.tagline}</div>
        </div>
      </div>
      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", marginBottom: 14, lineHeight: 1.5, minHeight: 32 }}>
        {detail.desc || plan.tagline}
      </div>

      {/* {t("pricing.acctSelect")} */}
      {plan.tiers && plan.tiers.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", fontWeight: 700, display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: 1 }}>
            Select # of Accounts
          </label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
            {plan.tiers.map(t => {
              const chosen = (selectedAcct[plan.id] || plan.tiers[0]?.acct) === t.acct;
              return (
                <button key={t.acct} onClick={() => onAcctChange(plan.id, t.acct)}
                  style={{
                    padding: "4px 10px", borderRadius: 20,
                    border: `1px solid ${chosen ? planColor + "88" : "rgba(255,255,255,0.1)"}`,
                    background: chosen ? planColor + "22" : "transparent",
                    color: chosen ? planColor : "rgba(255,255,255,0.5)",
                    fontSize: 10, fontWeight: 700, cursor: "pointer", transition: "all 150ms",
                  }}>
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Price */}
      <div style={{ minHeight: 72, marginBottom: 14 }}>
        {plan.hasPricing && price ? (
          <div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
              <span style={{ fontSize: 30, fontWeight: 900, color: planColor }}>{KRW(price)}</span>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>/mo</span>
            </div>
            {!isMonthly && total && (
              <div style={{ marginTop: 4, fontSize: 11, color: "rgba(255,255,255,0.5)" }}>
                {months}{t("pricing.totalLabel")}{" "}
                <strong style={{ color: "#22c55e" }}>{KRW(total)}</strong>
                {(cycleDiscountMap?.[cycle]) && (
                  <span style={{
                    marginLeft: 6, fontSize: 9, padding: "1px 6px", borderRadius: 8,
                    background: "rgba(34,197,94,0.12)", color: "#22c55e", fontWeight: 800,
                  }}>
                    -{cycleDiscountMap[cycle]}
                  </span>
                )}
              </div>
            )}
            {plan.id === "free" && (
              <div style={{ fontSize: 12, fontWeight: 800, color: "#8da4c4", marginTop: 6 }}>{t("pricing.freeForever")}</div>
            )}
          </div>
        ) : plan.id === "free" ? (
          <div style={{ fontSize: 24, fontWeight: 900, color: "#8da4c4", paddingTop: 8 }}>Free</div>
        ) : (
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.25)", fontStyle: "italic", paddingTop: 8 }}>{t("pricing.registerSoon")}</div>
        )}
      </div>

      {/* CTA Button */}
      <button
        onClick={() => onSubscribe(plan, tierData, cycleData)}
        disabled={paying === plan.id || isCurrent}
        style={{
          width: "100%", padding: "12px 0", borderRadius: 12,
          fontWeight: 800, fontSize: 13, cursor: (paying === plan.id || isCurrent) ? "not-allowed" : "pointer",
          background: isCurrent
            ? "rgba(34,197,94,0.1)"
            : paying === plan.id
              ? "rgba(255,255,255,0.07)"
              : isPro
                ? `linear-gradient(135deg,${planColor},#4f8ef7)`
                : isEnt
                  ? `linear-gradient(135deg,${planColor},#ec4899)`
                  : `rgba(${plan.id === "free" ? "141,164,196" : "79,142,247"},0.12)`,
          border: isCurrent
            ? "1px solid rgba(34,197,94,0.4)"
            : (isPro || isEnt)
              ? "none"
              : `1px solid ${planColor}44`,
          color: isCurrent ? "#22c55e" : paying === plan.id ? "rgba(255,255,255,0.3)" : "#fff",
          marginBottom: 16,
          transition: "all 200ms",
          opacity: paying === plan.id ? 0.7 : 1,
        }}
      >
        {isCurrent ? t("pricing.btnCurrent")
          : paying === plan.id ? t("pricing.btnPaying")
            : plan.id === "free" ? t("pricing.btnFreeStart")
              : t("pricing.btnSubscribe")}
      </button>

      {/* 서비스 항목 (간단 List) */}
      <div style={{ flex: 1, display: "grid", gap: 6, marginBottom: 12 }}>
        {(detail.sections || []).slice(0, 3).map((sec, si) => (
          <div key={si} style={{ display: "flex", alignItems: "flex-start", gap: 7, fontSize: 11, color: "rgba(255,255,255,0.7)" }}>
            <span style={{ color: planColor, fontWeight: 900, flexShrink: 0, marginTop: 1 }}>{sec.icon}</span>
            <span>{sec.label} — {sec.items.slice(0, 2).join(", ")}{sec.items.length > 2 ? ` ${t("pricing.moreItems", { count: sec.items.length - 2 })}` : ""}</span>
          </div>
        ))}
        {(detail.limits || []).slice(0, 2).map((l, li) => (
          <div key={"l" + li} style={{ display: "flex", alignItems: "flex-start", gap: 7, fontSize: 11, color: "rgba(255,255,255,0.28)" }}>
            <span style={{ fontWeight: 900, flexShrink: 0, marginTop: 1 }}>✕</span>
            <span>{l}</span>
          </div>
        ))}
      </div>

      {/* 상세 보기 Toggle */}
      {(detail.sections || []).length > 0 && (
        <button
          onClick={() => setShowDetail(v => !v)}
          style={{
            background: "none", border: `1px solid ${planColor}33`,
            borderRadius: 8, cursor: "pointer",
            fontSize: 10, color: planColor, fontWeight: 700,
            padding: "6px 0", display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
            transition: "all 150ms",
          }}
        >
          {showDetail ? t("pricing.btnViewLess") : t("pricing.btnViewAll")}
        </button>
      )}

      {/* 상세 섹션 */}
      {showDetail && (
        <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
          {(detail.sections || []).map((sec, si) => (
            <div key={si} style={{
              padding: "10px 12px", borderRadius: 10,
              background: planColor + "0d", border: `1px solid ${planColor}22`,
            }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: planColor, marginBottom: 6 }}>
                {sec.icon} {sec.label}
              </div>
              <div style={{ display: "grid", gap: 4 }}>
                {sec.items.map((item, ii) => (
                  <div key={ii} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, color: "rgba(255,255,255,0.65)" }}>
                    <span style={{ color: "#22c55e", fontWeight: 900, fontSize: 9 }}>✓</span>
                    {item}
                  </div>
                ))}
              </div>
            </div>
          ))}
          {(detail.limits || []).length > 0 && (
            <div style={{ padding: "8px 12px", borderRadius: 10, background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.15)" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#ef4444", marginBottom: 5 }}>{t("pricing.limitedFeat")}</div>
              {detail.limits.map((l, li) => (
                <div key={li} style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", display: "flex", gap: 5, marginBottom: 2 }}>
                  <span>✕</span><span>{l}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── 플랜 Compare Table ──────────────────────────────────────────────── */
function CompareTable({ plans }) {
  const t = useT();
  const planIds = ["free", "growth", "pro", "enterprise"];
  const visiblePlans = planIds.filter(id => plans.some(p => p.id === id));

  return (
    <div style={{ overflowX: "auto", marginTop: 4 }}>
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 560 }}>
        <thead>
          <tr>
            <th style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, color: "rgba(255,255,255,0.35)", fontWeight: 700, borderBottom: "1px solid rgba(255,255,255,0.07)", minWidth: 160 }}>{t("pricing.compareFeature")}</th>
            {visiblePlans.map(id => {
              const p = plans.find(pl => pl.id === id);
              const d = PLAN_DETAIL[id] || {};
              return (
                <th key={id} style={{
                  padding: "10px 8px", textAlign: "center", fontSize: 11, fontWeight: 800,
                  color: d.color || "#fff", borderBottom: "1px solid rgba(255,255,255,0.07)",
                  minWidth: 110,
                }}>
                  {d.emoji || p?.emoji} {p?.name || id}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {getCompareRows(t).map((row, i) => (
            <tr key={i} style={{ background: i % 2 === 0 ? "rgba(255,255,255,0.015)" : "transparent" }}>
              <td style={{ padding: "8px 14px", fontSize: 11, color: "rgba(255,255,255,0.6)", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>{row.label}</td>
              {visiblePlans.map(id => {
                const val = row[id] || "—";
                const isCheck = val === "✓" || val.startsWith("✓");
                const isDash = val === "—";
                return (
                  <td key={id} style={{ padding: "8px 8px", textAlign: "center", fontSize: 10, borderBottom: "1px solid rgba(255,255,255,0.04)", fontWeight: isCheck ? 700 : 400, color: isDash ? "rgba(255,255,255,0.2)" : isCheck ? (PLAN_DETAIL[id]?.color || "#22c55e") : "rgba(255,255,255,0.6)" }}>
                    {val}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ─── 메인 Pricing Component ─────────────────────────────────────────── */
export default function Pricing() {
  const t = useT();
  const PLAN_DETAIL = getPlanDetail(t);
  const [cycle, setCycle] = useState("monthly");
  const [plans, setPlans] = useState([]);
  const [allPlans, setAllPlans] = useState([]); // Discount Rate 계산용 (hidden 포함)
  const [cycles, setCycles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(null);
  const [selectedAcct, setSelectedAcct] = useState({});
  const [faqOpen, setFaqOpen] = useState(null);
  const [showCompare, setShowCompare] = useState(false);
  const { user, token } = useAuth();
  const navigate = useNavigate();

  // API 데이터 기반 cycleper 실제 Discount Rate 동적 계산
  const cycleDiscountMap = useMemo(() => computeCycleDiscounts(allPlans), [allPlans]);

  useEffect(() => {
    fetch("/api/auth/pricing/public-plans")
      .then(r => r.json())
      .then(d => {
        if (d.ok) {
          const rawPlans = d.plans || [];
          setAllPlans(rawPlans); // Discount Rate 계산용 All Save
          // Starter 플랜 제외 — Free / Growth / Pro / Enterprise 4단계만 표시
          const HIDDEN_PLANS = ["starter"];
          const filteredPlans = rawPlans.filter(p => !HIDDEN_PLANS.includes(p.id));
          setPlans(filteredPlans);
          const availCycles = CYCLE_ORDER.filter(ck => (d.cycles || []).some(c => c.key === ck));
          setCycles(availCycles.length > 0 ? availCycles : CYCLE_ORDER);
          const initAcct = {};
          filteredPlans.forEach(p => { if (p.tiers && p.tiers.length > 0) initAcct[p.id] = p.tiers[0].acct; });
          setSelectedAcct(initAcct);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleAcctChange = (planId, acct) => setSelectedAcct(prev => ({ ...prev, [planId]: acct }));

  const handleSubscribe = async (plan, tierData, cycleData) => {
    if (plan.id === "free") { navigate("/register"); return; }
    if (!user || !token) { navigate(`/login?redirect=/app-pricing`); return; }
    if (user.plan === plan.id) { alert("This is your current plan."); return; }
    if (!cycleData || !cycleData.total_price) {
      if (plan.id === "enterprise") { window.location.href = "mailto:contact@genie-roi.com?subject=Enterprise Pricing Inquiry"; return; }
      alert("Pricing for the selected cycle is not yet available."); return;
    }
    const clientKey = import.meta.env?.VITE_TOSS_CLIENT_KEY;
    if (!clientKey) {
      alert(`[개발] Plan: ${plan.name}
import { useI18n } from '../i18n/index.js';\nAccount: ${tierData?.label || ""}\nAmount: ${KRW(cycleData.total_price)}\nCycle: ${t("pricing." + CYCLE_LABEL_KEY[cycle])}\n\nPayment will proceed when VITE_TOSS_CLIENT_KEY is configured.`);
      return;
    }
    setPaying(plan.id);
    try {
      const tp = await loadTossPayments(clientKey);
      const orderId = `GENIEGO-${user.id || "u"}-${Date.now()}`;
      const successUrl = `${window.location.origin}/payment-success?plan=${plan.id}&cycle=${cycle}&amount=${cycleData.total_price}&acct=${tierData?.acct || "1"}`;
      const failUrl = `${window.location.origin}/payment-fail`;
      await tp.requestPayment("Card", {
        amount: cycleData.total_price, orderId,
        orderName: `Geniego-ROI ${plan.name} (${cycle}, ${tierData?.label || ""})`,
        customerName: user.name || user.email, customerEmail: user.email,
        successUrl, failUrl,
      });
    } catch (e) {
      if (e?.code !== "USER_CANCEL") alert("Payment Error: " + (e?.message || e));
    } finally { setPaying(null); }
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg,#060610 0%,#0a0f2a 50%,#060610 100%)",
      padding: "48px 24px 80px",
      fontFamily: "'Inter','Segoe UI',sans-serif",
      color: "#e8eaf6",
    }}>
      <style>{`
        @keyframes glow { 0%,100%{opacity:.6} 50%{opacity:1} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
        .plan-card:hover { transform: translateY(-4px) !important; box-shadow: 0 20px 56px rgba(0,0,0,0.4) !important; }
        .cycle-btn:hover { opacity: 0.9; }
      `}</style>

      {/* Header */}
      <div style={{ textAlign: "center", maxWidth: 760, margin: "0 auto 48px", animation: "fadeUp 0.5s ease" }}>
        <div style={{
          display: "inline-block", padding: "4px 18px", borderRadius: 20, marginBottom: 18,
          background: "rgba(79,142,247,0.1)", border: "1px solid rgba(79,142,247,0.3)",
          fontSize: 11, color: "#4f8ef7", fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase",
        }}>
          {t("pricing.badge").toUpperCase()}
        </div>
        <h1 style={{
          fontSize: "clamp(26px,4vw,44px)", fontWeight: 900, margin: "0 0 14px",
          background: "linear-gradient(135deg,#fff 0%,#a5b4fc 100%)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        }}>
          {t("pricing.heroTitle")}
        </h1>
        <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", lineHeight: 1.8, margin: "0 0 20px" }}>
          {t("pricing.heroDesc")}<br />
          {t("pricing.heroSaving")} <strong style={{ color: "#22c55e" }}>{t("pricing.heroSavingBold")}</strong>
        </p>

        {/* Current Plan 표시 */}
        {user?.plan && (
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "8px 18px", borderRadius: 20, marginBottom: 8,
            background: `${PLAN_COLOR[user.plan] || "#4f8ef7"}18`,
            border: `1px solid ${PLAN_COLOR[user.plan] || "#4f8ef7"}44`,
            fontSize: 12, color: PLAN_COLOR[user.plan] || "#4f8ef7", fontWeight: 700,
          }}>
            <span>✓</span>
            <span>{t("pricing.currentPlanLabel")}: {PLAN_DETAIL[user.plan]?.headline || user.plan}</span>
          </div>
        )}
      </div>

      {/* Payment 주기 Tab */}
      <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 40, flexWrap: "wrap" }}>
        {CYCLE_ORDER.map(ck => {
          const active = cycle === ck;
          const discLabel = cycleDiscountMap[ck]; // API 기반 동적 Discount Rate
          return (
            <button key={ck} className="cycle-btn" onClick={() => setCycle(ck)} style={{
              position: "relative", padding: "8px 20px", borderRadius: 30,
              border: `1px solid ${active ? "#4f8ef7" : "rgba(255,255,255,0.1)"}`,
              background: active ? "rgba(79,142,247,0.15)" : "transparent",
              color: active ? "#4f8ef7" : "rgba(255,255,255,0.45)",
              fontWeight: 700, fontSize: 12, cursor: "pointer", transition: "all 200ms",
            }}>
              {t("pricing." + CYCLE_LABEL_KEY[ck])}
              {discLabel && (
                <span style={{
                  position: "absolute", top: -9, right: -6, fontSize: 9, padding: "1px 6px",
                  borderRadius: 9, background: "#22c55e", color: "#fff", fontWeight: 900, whiteSpace: "nowrap",
                }}>
                  -{discLabel}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 플랜 Card 그리드 */}
      {loading ? (
        <div style={{ textAlign: "center", color: "rgba(255,255,255,0.35)", padding: "80px 0", fontSize: 14 }}>
          <div style={{ fontSize: 32, marginBottom: 12, animation: "glow 1.5s ease infinite" }}>⏳</div>
          {t("pricing.loadingText")}
        </div>
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 16, maxWidth: 1360, margin: "0 auto",
        }}>
          {plans.map(plan => (
            <div key={plan.id} className="plan-card" style={{ transition: "transform 200ms, box-shadow 200ms" }}>
              <PlanCard
                plan={plan} cycle={cycle}
                selectedAcct={selectedAcct} onAcctChange={handleAcctChange}
                onSubscribe={handleSubscribe} paying={paying} currentPlanId={user?.plan}
                cycleDiscountMap={cycleDiscountMap}
              />
            </div>
          ))}
        </div>
      )}

      {/* 플랜 Compare Table */}
      {!loading && plans.length > 0 && (
        <div style={{ maxWidth: 960, margin: "52px auto 0" }}>
          <button
            onClick={() => setShowCompare(v => !v)}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              margin: "0 auto 20px", padding: "10px 24px", borderRadius: 12,
              border: "1px solid rgba(79,142,247,0.3)", background: "rgba(79,142,247,0.06)",
              color: "#4f8ef7", fontSize: 13, fontWeight: 700, cursor: "pointer",
              transition: "all 200ms",
            }}
          >
            {showCompare ? t("pricing.compareBtnHide") : t("pricing.compareBtnShow")}
          </button>

          {showCompare && (
            <div style={{
              background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 16, overflow: "hidden", animation: "fadeUp 0.3s ease",
            }}>
              <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.07)", fontWeight: 800, fontSize: 14 }}>
                {t("pricing.compareTitle")}
              </div>
              <div style={{ padding: "0 8px 12px" }}>
                <CompareTable plans={plans} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Cost 절감 Banner */}
      <div style={{
        maxWidth: 860, margin: "52px auto 0",
        background: "rgba(79,142,247,0.05)", border: "1px solid rgba(79,142,247,0.17)",
        borderRadius: 16, padding: "22px 28px",
        display: "flex", flexWrap: "wrap", gap: 20, alignItems: "center", justifyContent: "space-between",
      }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 15, color: "#fff", marginBottom: 6 }}>
            {t("pricing.savingTitle")}
          </div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", lineHeight: 2 }}>
            {t("pricing.savingDesc")}{" "}
            <strong style={{ color: "#ef4444" }}>₩3,249,000↑</strong>
            <br />
            {t("pricing.savingDesc2")} <strong style={{ color: "#22c55e" }}>{t("pricing.savingBold")}</strong>
          </div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 44, fontWeight: 900, color: "#22c55e", lineHeight: 1 }}>85%</div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", fontWeight: 700, marginTop: 3 }}>{t("pricing.savingBold")}</div>
        </div>
      </div>

      {/* FAQ */}
      <div style={{ maxWidth: 680, margin: "44px auto 0" }}>
        <h2 style={{ textAlign: "center", fontSize: 18, fontWeight: 900, color: "#fff", marginBottom: 20 }}>
          {t("pricing.faqTitle")}
        </h2>
        {[
          [t("pricing.faq1q"), t("pricing.faq1a")],
          [t("pricing.faq2q"), t("pricing.faq2a")],
          [t("pricing.faq3q"), t("pricing.faq3a")],
          [t("pricing.faq4q"), t("pricing.faq4a")],
          [t("pricing.faq5q"), t("pricing.faq5a")],
          [t("pricing.faq6q"), t("pricing.faq6a")],
        ].map(([q, a], i) => (
          <div key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <button
              onClick={() => setFaqOpen(faqOpen === i ? null : i)}
              style={{
                width: "100%", textAlign: "left", background: "none", border: "none",
                padding: "16px 0", cursor: "pointer", display: "flex",
                justifyContent: "space-between", alignItems: "center",
                color: "#fff", fontSize: 13, fontWeight: 700,
              }}
            >
              {q}
              <span style={{
                fontSize: 18, color: "rgba(255,255,255,0.35)", transition: "transform 200ms",
                transform: faqOpen === i ? "rotate(45deg)" : "none",
              }}>+</span>
            </button>
            {faqOpen === i && (
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", lineHeight: 1.8, paddingBottom: 16 }}>
                {a}
              </div>
            )}
          </div>
        ))}
      </div>

      <p style={{ textAlign: "center", marginTop: 44, fontSize: 11, color: "rgba(255,255,255,0.25)" }}>
        {t("pricing.termsNote").split(t("pricing.terms")).map((part, i, arr) =>
          i === 0 ? <span key={i}>{part}<a href="/terms" style={{ color: "#4f8ef7" }}>{t("pricing.terms")}</a></span>
                  : <span key={i}>{part}</span>
        )}
      </p>
    </div>
  );
}
