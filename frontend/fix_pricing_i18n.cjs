const fs = require('fs');

// ── Pricing.jsx: i18n (useT) 전면 적용 ──────────────────────────────────
const filePath = 'src/pages/Pricing.jsx';
let c = fs.readFileSync(filePath, 'utf8');

// 1. Add useT import after existing imports
if (!c.includes('useT') && !c.includes('useI18n')) {
    c = c.replace(
        `import { useAuth } from "../auth/AuthContext.jsx";`,
        `import { useAuth } from "../auth/AuthContext.jsx";\nimport { useTranslation } from "react-i18next";`
    );
    console.log('✅ Added useTranslation import');
}

// 2. Replace CYCLE_LABEL with i18n-aware version (computed inside component)
c = c.replace(
    `const CYCLE_LABEL = { monthly: "Monthly", quarterly: "3months", semi_annual: "6months", yearly: "Annual" };`,
    `const CYCLE_LABEL_KEY = { monthly: "cycleMonthly", quarterly: "cycleQuarterly", semi_annual: "cycleSemiAnnual", yearly: "cycleYearly" };`
);
console.log('✅ Replaced CYCLE_LABEL constant');

// 3. Add useTranslation inside PlanCard component
c = c.replace(
    `function PlanCard({ plan, cycle, selectedAcct, onAcctChange, onSubscribe, paying, currentPlanId, cycleDiscountMap }) {
  const [showDetail, setShowDetail] = useState(false);`,
    `function PlanCard({ plan, cycle, selectedAcct, onAcctChange, onSubscribe, paying, currentPlanId, cycleDiscountMap }) {
  const { t } = useTranslation();
  const [showDetail, setShowDetail] = useState(false);`
);
console.log('✅ Added useTranslation to PlanCard');

// 4. Replace hardcoded texts in PlanCard
// Account 수 선택 label
c = c.replace(
    `Account 수 선택`,
    `{t("pricing.acctSelect")}`
);

// months total text
c = c.replace(
    `{months}months Total{" "}`,
    `{months}{t("pricing.totalLabel")}{" "}`
);

// Free (영구) text
c = c.replace(
    `>Free (영구)<`,
    `>{t("pricing.freeForever")}<`
);

// 요금 Register 예정
c = c.replace(
    `>요금 Register 예정<`,
    `>{t("pricing.registerSoon")}<`
);

// CTA button texts
c = c.replace(
    `{isCurrent ? "✓ 현재 이용 중"
          : paying === plan.id ? "결제 처리 중..."
            : plan.id === "free" ? "Free로 Start"
              : "구독 Start"}`,
    `{isCurrent ? t("pricing.btnCurrent")
          : paying === plan.id ? t("pricing.btnPaying")
            : plan.id === "free" ? t("pricing.btnFreeStart")
              : t("pricing.btnSubscribe")}`
);

// Service detail toggle buttons
c = c.replace(
    `{showDetail ? "▴ 서비스 간략히" : "▾ 서비스 All 보기"}`,
    `{showDetail ? t("pricing.btnViewLess") : t("pricing.btnViewAll")}`
);

// 이 플랜에서 제한되는 기능
c = c.replace(
    `<div style={{ fontSize: 10, fontWeight: 700, color: "#ef4444", marginBottom: 5 }}>⚠ 이 플랜에서 제한되는 기능</div>`,
    `<div style={{ fontSize: 10, fontWeight: 700, color: "#ef4444", marginBottom: 5 }}>{t("pricing.limitedFeat")}</div>`
);

console.log('✅ Replaced PlanCard hardcoded texts');

// 5. Add useTranslation inside CompareTable
c = c.replace(
    `function CompareTable({ plans }) {
  const planIds = ["free", "growth", "pro", "enterprise"];`,
    `function CompareTable({ plans }) {
  const { t } = useTranslation();
  const planIds = ["free", "growth", "pro", "enterprise"];`
);

// Compare table feature header
c = c.replace(
    `<th style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, color: "rgba(255,255,255,0.35)", fontWeight: 700, borderBottom: "1px solid rgba(255,255,255,0.07)", minWidth: 160 }}>기능</th>`,
    `<th style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, color: "rgba(255,255,255,0.35)", fontWeight: 700, borderBottom: "1px solid rgba(255,255,255,0.07)", minWidth: 160 }}>{t("pricing.compareFeature")}</th>`
);
console.log('✅ Updated CompareTable');

// 6. Add useTranslation inside main Pricing component and replace texts
c = c.replace(
    `export default function Pricing() {
  const [cycle, setCycle] = useState("monthly");`,
    `export default function Pricing() {
  const { t } = useTranslation();
  const [cycle, setCycle] = useState("monthly");`
);

// SUBSCRIPTION PLANS badge
c = c.replace(
    `          SUBSCRIPTION PLANS`,
    `          {t("pricing.badge").toUpperCase()}`
);

// Hero title
c = c.replace(
    `          Geniego‑ROI 구독 요금제`,
    `          {t("pricing.heroTitle")}`
);

// Hero desc and saving
c = c.replace(
    `          마케팅 자동화 · 이커머스 Analysis · WMS · AI 인사이트를 하나의 플랫폼에서<br />
          개별 툴 대비 최대 <strong style={{ color: "#22c55e" }}>85% 절감</strong>`,
    `          {t("pricing.heroDesc")}<br />
          {t("pricing.heroSaving")} <strong style={{ color: "#22c55e" }}>{t("pricing.heroSavingBold")}</strong>`
);

// Current Plan label
c = c.replace(
    `            <span>Current Plan: {PLAN_DETAIL[user.plan]?.headline || user.plan}</span>`,
    `            <span>{t("pricing.currentPlanLabel")}: {PLAN_DETAIL[user.plan]?.headline || user.plan}</span>`
);

// Cycle button labels - replace CYCLE_LABEL[ck]
c = c.replace(
    `              {CYCLE_LABEL[ck]}`,
    `              {t("pricing." + CYCLE_LABEL_KEY[ck])}`
);

// Loading text
c = c.replace(
    `          요금 Info를 불러오는 중…`,
    `          {t("pricing.loadingText")}`
);

// Compare buttons
c = c.replace(
    `            {showCompare ? "▴ 플랜 비교표 숨기기" : "▾ 플랜별 상세 기능 비교표 보기"}`,
    `            {showCompare ? t("pricing.compareBtnHide") : t("pricing.compareBtnShow")}`
);

// Compare section title
c = c.replace(
    `              <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.07)", fontWeight: 800, fontSize: 14 }}>
                📊 플랜별 기능 비교`,
    `              <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.07)", fontWeight: 800, fontSize: 14 }}>
                {t("pricing.compareTitle")}`
);

// Saving banner
c = c.replace(
    `            💡 개별 도구 합산 vs. Geniego‑ROI`,
    `            {t("pricing.savingTitle")}`
);
c = c.replace(
    `            HubSpot Pro + Klaviyo + Shopify WMS + Supermetrics 개별 구독 시 월{" "}
            <strong style={{ color: "#ef4444" }}>₩3,249,000↑</strong>
            <br />
            Geniego‑ROI Pro 구독 시 — <strong style={{ color: "#22c55e" }}>최대 85% Cost 절감</strong>`,
    `            {t("pricing.savingDesc")}{" "}
            <strong style={{ color: "#ef4444" }}>₩3,249,000↑</strong>
            <br />
            {t("pricing.savingDesc2")} <strong style={{ color: "#22c55e" }}>{t("pricing.savingBold")}</strong>`
);

// Cost 절감 label
c = c.replace(
    `          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", fontWeight: 700, marginTop: 3 }}>Cost 절감</div>`,
    `          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", fontWeight: 700, marginTop: 3 }}>{t("pricing.savingBold")}</div>`
);

// FAQ title
c = c.replace(
    `          자주 묻는 질문`,
    `          {t("pricing.faqTitle")}`
);

// FAQ items - replace hardcoded Q&A with t() calls
c = c.replace(
    `          {[
          ["플랜을 언제든지 변경할 수 있나요?", "네, 언제든지 상위/하위 플랜으로 즉시 전환 가능합니다. 일할 계산으로 차액이 조정됩니다."],
          ["Account 수는 무엇을 의미하나요?", "동시에 접속 가능한 독립 사용자 Account 수입니다. Enterprise는 무제한입니다."],
          ["구독 Cancel 시 환불은 어떻게 되나요?", "Monthly은 당일 Cancel 시 100% 환불, Quarter/Half-year/Annual은 나머지 기간 비율로 환불됩니다."],
          ["Free 플랜과 유료 플랜의 차이는?", "Free는 데모 데이터 기반 체험 플랜입니다. 실제 Channel 연동, 실시간 데이터, AI 자동화는 Growth 이상에서 제공됩니다."],
          ["요금이 'Register 예정'으로 표시되는 이유는?", "관리자 센터에서 해당 플랜·주기의 요금이 아직 Register되지 않은 Status입니다. 곧 Update됩니다."],
          ["Enterprise 플랜 구매 방법은?", "Enterprise는 별도 상담 후 맞춤 계약을 진행합니다. contact@genie-roi.com으로 문의주세요."],
        ].map(([q, a], i) => (`,
    `          {[
          [t("pricing.faq1q"), t("pricing.faq1a")],
          [t("pricing.faq2q"), t("pricing.faq2a")],
          [t("pricing.faq3q"), t("pricing.faq3a")],
          [t("pricing.faq4q"), t("pricing.faq4a")],
          [t("pricing.faq5q"), t("pricing.faq5a")],
          [t("pricing.faq6q"), t("pricing.faq6a")],
        ].map(([q, a], i) => (`
);

// Terms note
c = c.replace(
    `        구독 시 <a href="/terms" style={{ color: "#4f8ef7" }}>이용약관</a>에 동의하는 것으로 간주됩니다.
        모든 요금은 VAT 포함 기준이며, VAT가 별도로 발생할 수 있습니다.`,
    `        {t("pricing.termsNote").split(t("pricing.terms")).map((part, i, arr) =>
          i === 0 ? <span key={i}>{part}<a href="/terms" style={{ color: "#4f8ef7" }}>{t("pricing.terms")}</a></span>
                  : <span key={i}>{part}</span>
        )}`
);

// CYCLE_LABEL usage in handleSubscribe (orderName)
c = c.replace(
    `orderName: \`Geniego-ROI \${plan.name} (\${CYCLE_LABEL[cycle]}, \${tierData?.label || ""})\`,`,
    `orderName: \`Geniego-ROI \${plan.name} (\${cycle}, \${tierData?.label || ""})\`,`
);

console.log('✅ Replaced main component hardcoded texts');

fs.writeFileSync(filePath, c, 'utf8');
console.log('✅ Pricing.jsx saved successfully');
