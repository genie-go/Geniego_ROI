<?php
/**
 * GeniegoROI i18n Locale Auto-Updater (PHP Enterprise Edition)
 * 기능: 백업 생성, 중복 방지, 정규표현식 기반 안전 업데이트
 */

// [1] 설정 영역: 파일 경로 (사용자 환경에 맞게 수정 가능)
$filePath = 'd:/project/GeniegoROI/frontend/src/i18n/locales/en.js';
$exportPattern = '/\nexport default en;\s*$/s';

// [2] 추가할 다국어 데이터 (제공해주신 데이터셋)
$additions = <<<EOT

// ── Audit Page ─────────────────────────────────────────────────────────────────
en.audit = {
    pageTitle: "Audit Log",
    pageDesc: "Immutable audit records of all operational events",
    tableView: "📋 Table View",
    timelineView: "🕐 Timeline View",
    csvExport: "📥 Export CSV",
    totalEvents: "Total Events",
    totalEventsDesc: "Total audit log entries",
    todayEvents: "Today's Events",
    highRisk: "High Risk Events",
    highRiskDesc: "Immediate review recommended",
    adminActions: "Admin Actions",
    adminActionsDesc: "admin role actors",
    eventDistribution: "📊 Event Type Distribution",
    riskClassification: "🎯 Risk Classification",
    highRiskEvents: "⚠ High Risk Events",
    searchPlaceholder: "🔍 Search events, actors, details...",
    filterEventType: "All Event Types",
    filterActor: "All Actors",
    filterRisk: "All Risk Levels",
    filterReset: "✕ Reset Filters",
    logTable: "📁 Audit Log Table",
    timelineHeader: "🕐 Timeline View",
    noResults: "No results found",
    colId: "#",
    colTime: "Time",
    colActor: "Actor",
    colEvent: "Event",
    colRisk: "Risk",
    colTarget: "Target",
    colIp: "IP",
    colDetail: "Detail",
    countUnit: "",
};

en.reportBuilder = {
    pageTitle: "Report Builder",
    pageDesc: "Select sections, Period/Channel/SKU filters, Live preview",
    csvExport: "📥 Export CSV",
    pdfExport: "🖨 Export PDF",
    downloadReady: "Download ready",
    sectionSelect: "📋 Select Sections",
    filterPanel: "🎛 Report Filters",
    period: "Period",
    channel: "Channel",
    preview: "👁 Live Preview",
    sectionsSelected: " sections selected",
    selectToPreview: "Select sections on the left to display preview",
    noChannelSelected: "No channels selected",
    noSkuSelected: "No SKUs selected",
    period7d: "Last 7 days",
    period30d: "Last 30 days",
    period90d: "Last 90 days",
    periodQ1: "Q1 2026",
    createdDate: "Created",
    includedSections: "Included sections",
    reportTitle: "📊 Geniego-ROI Integrated Report",
    sectionKpi: "Key KPI Summary",
    sectionKpiDesc: "Revenue · Ad Spend · Profit",
    sectionPnl: "P&L Waterfall",
    sectionPnlDesc: "Cost structure analysis",
    sectionCampaign: "Campaign Performance",
    sectionCampaignDesc: "ROAS · Orders by channel",
    sectionCreator: "Creator Performance",
    sectionCreatorDesc: "ROI · Attributed revenue",
    sectionSku: "SKU Analysis",
    sectionSkuDesc: "Margin · Return rate by product",
    sectionAnomaly: "Anomaly Summary",
    sectionAnomalyDesc: "Auto-detected alerts",
    kpiRevenue: "Total Revenue",
    kpiAdSpend: "Ad Spend",
    kpiNetProfit: "Net Profit",
    kpiRoas: "Blended ROAS",
    kpiOrders: "Total Orders",
    kpiReturnRate: "Return Rate",
    colCampaign: "Campaign",
    colChannel: "Channel",
    colAdSpend: "Ad Spend",
    colRoas: "ROAS",
    colOrders: "Orders",
    colCreator: "Creator",
    colTier: "Tier",
    colViews: "Views",
    colRevenue: "Revenue",
    colRoi: "ROI",
    colSku: "SKU",
    colProductName: "Product",
    colMargin: "Margin",
    colReturnRate: "Return Rate",
    pnlRevenue: "Total Revenue",
    pnlAdSpend: "(-) Ad Spend",
    pnlFees: "(-) Platform Fees",
    pnlInfluencer: "(-) Influencer",
    pnlNetProfit: "= Net Profit",
    anomalyTitle: "⚠ Anomaly Summary",
    kpiTitle: "📊 Key KPI",
    campaignTitle: "📣 Campaign Performance",
    creatorTitle: "🤝 Creator Performance",
    skuTitle: "📦 SKU Analysis",
};

en.auth = {
    quickStart: "⚡ Quick Start",
    tryDemo: "🎯 Try Demo",
    freeRegister: "✨ Free Signup",
    orLoginWith: "or login with account",
    emailLabel: "Email",
    passwordLabel: "Password",
    nameLabel: "Name",
    loginBtn: "🔐 Login",
    loggingIn: "Logging in...",
    noAccount: "Don't have an account?",
    registerLink: "Sign up",
    freeTrialTitle: "Free Trial Signup",
    freeTrialDesc: "Start easily. Experience core features for free",
    passwordConfirm: "Confirm Password",
    passwordHint: "Password (min 6 characters)",
    agreeTerms: "Terms of Service",
    agreeAnd: "and",
    agreePrivacy: "Privacy Policy",
    agreeConsent: "I agree to the",
    demoPlanNote: "📌 Demo plan activated immediately. Business info required for paid upgrade.",
    startFree: "🚀 Start for Free",
    registering: "Registering...",
    alreadyHaveAccount: "Already have an account?",
    loginLink: "Login",
    planTypeTitle: "Select signup type",
    freePlan: "Free Trial (Demo)",
    freePlanDesc: "Sign up with just email and name, experience core features",
    freeBadge: "Free",
    paidPlan: "Paid Plan",
    paidPlanDesc: "Full ad channel integration, all AI features",
    paidBadge: "Paid",
    planQuestion: "💎 What is {{plan}} Plan?",
    recommendedFor: "🎯 Recommended For",
    includedFeatures: "✅ Included Features",
    premiumOnly: "🔒 Higher Plan Only",
    loadingPrice: "Loading...",
    priceNotSet: "Price not set",
    step1Account: "① Account Info",
    step2Business: "② Business Info",
    step3Channels: "③ Channels & Complete",
    paidPlanTitle: "{{plan}} Plan Signup",
    paidPlanNote: "Business registration required for channel integration",
    nextBusiness: "Next → Business Info",
    nextChannels: "Next → Channel Selection",
    businessWarning: "⚠️ This info will be used for channel API integration and ad account connection.",
    companyLabel: "Company (Brand) Name",
    ceoNameLabel: "CEO / Representative Name",
    businessTypeLabel: "Business Type",
    businessNumberLabel: "Business Registration Number",
    businessNumberHint: "Individual or corporation",
    countryLabel: "Country",
    zipCodeLabel: "Zip Code",
    addressLabel: "Address",
    addressDetailLabel: "Address Detail",
    phoneLabel: "Phone",
    websiteLabel: "Website (optional)",
    salesChannelTitle: "🛒 Sales Channels in Use",
    salesChannelNote: "(API auto-integration targets)",
    adChannelTitle: "📢 Ad Channels in Use",
    adChannelNote: "(optional)",
    monthlyRevenueLabel: "Monthly Average Revenue",
    agreeAll: "Please agree to required terms.",
    completionNote: "🎉 {{plan}} plan activated. API integration begins for {{count}} channels.",
    startFree: "🚀 Start with {{plan}} Plan",
    processingRegister: "Processing...",
    selectPlaceholder: "Select",
    adminLoginTitle: "Admin-Only Login",
    adminLoginDesc: "Only admin plan accounts can access",
    adminKeyLabel: "Admin Access Key",
    adminKeyPh: "Enter admin access key",
    verifyKey: "Verify Key",
    keyVerified: "✅ Access key verified.",
    adminEmailLabel: "Admin Email",
    adminLoginBtn: "🔐 Admin Login",
    reenterKey: "← Re-enter access key",
    passwordMismatch: "Passwords do not match.",
    agreeTermsRequired: "Please agree to the terms of service.",
    nameRequired: "Please enter your name.",
    emailRequired: "Please enter your email.",
    passwordTooShort: "Password must be at least 6 characters.",
    companyRequired: "Please enter company/brand name.",
    ceoRequired: "Please enter CEO name.",
    businessTypeRequired: "Please select a business type.",
    businessNumberRequired: "Please enter business registration number.",
    countryRequired: "Please select a country.",
    addressRequired: "Please enter an address.",
    phoneRequired: "Please enter a phone number.",
    salesChannelRequired: "Please select at least one sales channel.",
    termsRequired: "Please agree to required terms.",
    notAdminAccount: "This is not an admin account.",
    wrongAdminKey: "Incorrect admin access key.",
};

export default en;
EOT;

// [3] 실행 로직
echo "[" . date('Y-m-d H:i:s') . "] 업데이트 프로세스 시작 (PHP 버전)\n";

// 1. 파일 존재 확인
if (!file_exists($filePath)) {
    die("[오류] 대상 파일을 찾을 수 없습니다: $filePath\n");
}

try {
    // 2. 안전한 백업 생성 (수정 전 상태 저장)
    $backupPath = $filePath . "." . date('Ymd_His') . ".bak";
    if (copy($filePath, $backupPath)) {
        echo "[완료] 백업 파일 생성됨: $backupPath\n";
    } else {
        throw new Exception("백업 파일 생성 실패");
    }

    // 3. 파일 읽기
    $content = file_get_contents($filePath);

    // 4. 중복 추가 방지 (이미 en.audit 내용이 있는지 검사)
    if (strpos($content, 'en.audit =') !== false) {
        die("[알림] 이미 업데이트된 내용이 감지되어 작업을 중단합니다.\n");
    }

    // 5. 정규표현식으로 마지막 export 구문 제거 및 새로운 내용 결합
    $cleanContent = preg_replace($exportPattern, '', rtrim($content));
    $finalContent = $cleanContent . $additions;

    // 6. 최종 파일 저장
    if (file_put_contents($filePath, $finalContent)) {
        echo "[성공] en.js 파일이 PHP를 통해 초고도화 업데이트되었습니다.\n";
    } else {
        throw new Exception("파일 쓰기 권한 오류");
    }

} catch (Exception $e) {
    echo "[치명적 오류] 발생: " . $e->getMessage() . "\n";
}

?>