const fs = require('fs');
const filePath = 'src/i18n/locales/zh-TW.js';
let content = fs.readFileSync(filePath, 'utf8');

const pricingStr = `
// ── Pricing Page i18n ──────────────────────────────────────────────────────────
zhTW.pricing = Object.assign(zhTW.pricing || {}, {
    badge: "訂閱方案",
    heroTitle: "Geniego\u2011ROI 訂閱方案",
    heroDesc: "行銷自動化 · 電商分析 · WMS · AI洞察 — 全在一個平台",
    heroSaving: "最高節省",
    heroSavingBold: "85% 費用",
    currentPlanLabel: "目前方案",
    cycleMonthly: "月付", cycleQuarterly: "3個月", cycleSemiAnnual: "6個月", cycleYearly: "年付",
    btnFreeStart: "免費開始", btnSubscribe: "立即訂閱", btnCurrent: "✓ 目前方案",
    btnPaying: "處理中...", btnViewAll: "▾ 查看所有功能", btnViewLess: "▴ 收起",
    acctSelect: "選擇帳戶數量", registerSoon: "定價即將公布", freeForever: "永久免費",
    totalLabel: "個月合計",
    compareBtnShow: "▾ 查看詳細功能對比", compareBtnHide: "▴ 隱藏對比",
    compareTitle: "📊 方案功能對比", compareFeature: "功能",
    savingTitle: "💡 個別工具 vs. Geniego\u2011ROI",
    savingDesc: "HubSpot Pro + Klaviyo + Shopify WMS + Supermetrics 月費合計",
    savingDesc2: "Geniego\u2011ROI Pro —", savingBold: "最高節省85%費用",
    faqTitle: "常見問題",
    faq1q: "可以隨時更改方案嗎？", faq1a: "可以，隨時升降級。差額按日計算。",
    faq2q: "帳戶數量是什麼意思？", faq2a: "可同時存取的獨立用戶帳戶數。Enterprise無限制。",
    faq3q: "取消訂閱的退款政策？", faq3a: "月付：當天取消全額退款。季付/半年/年付：按剩餘期限比例退款。",
    faq4q: "免費與付費方案的區別？", faq4a: "免費是示範資料體驗方案。實際資料連接、AI自動化需要Growth方案以上。",
    faq5q: "為什麼顯示「即將公布」？", faq5a: "該方案/週期的定價尚未在管理中心設置，即將更新。",
    faq6q: "如何購買Enterprise方案？", faq6a: "Enterprise需單獨諮詢。請聯繫 contact@genie-roi.com。",
    terms: "服務條款", termsNote: "訂閱即表示同意服務條款。所有價格含VAT。",
    loadingText: "正在載入定價資訊…", limitedFeat: "⚠ 此方案中受限的功能",
    pageTitle: "💳 方案與帳單", pageSub: "選擇方案·支付·訂閱管理",
    currentPlan: "目前方案", upgrade: "升級", perMonth: "/ 月",
});
`;

content += pricingStr;
fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ zh-TW.js updated with pricing keys');
