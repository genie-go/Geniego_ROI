const fs = require('fs');

const enKeys = `
        mainTitle: "Unified AI Campaign Builder",
        heroDesc: "From plan to execution, simply enter a budget. AI allocates the optimal mix and instantly launches campaigns. Approval bottlenecks are removed.",
        step1: "Enter Budget",
        step2: "AI Strategy",
        step3: "One-Click Launch",
        qBudget: "How much are you investing in this campaign?",
        budgetSub: "The AI handles complex budget distribution and creative generation per channel.",
        campName: "Campaign Name",
        budgetLabel: "Total Monthly Budget (₩)",
        budgetErr: "Please select a category and enter at least 100,000 KRW.",
        btnSimulate: "Generate AI Strategy",
        simulating: "Formulating AI Strategy...",
        mixTitle: "AI Media Mix Recommendation",
        mixSub: "Optimal distribution for your budget.",
        estRoas: "Expected Integrated ROAS",
        estConv: "Expected Conversions",
        cases: " conversions",
        expRoas: "Expected ROAS:",
        btnRetry: "Back",
        btnNext: "Proceed with this strategy →",
        launchTitle: "One-Click Approval & Launch",
        launchSub: "Complex payment flows combined into one. Your corporate card will be charged instantly, and the campaign will run live immediately.",
        payMethod: "Payment Method",
        corporateCard: "Corporate Card (ending in 4821)",
        totalAmt: "Total Payment",
        btnReview: "Review Strategy",
        btnLaunch: "Approve Payment & Launch Immediately",
        btnLaunching: "Processing Payment...",
        alertSuccess: "Payment Authorized. {camp} is now LIVE!"`;

const koKeys = `
        mainTitle: "통합 AI 캠페인 빌더",
        heroDesc: "계획부터 실전까지, 예산만 입력하면 AI가 미디어 믹스를 짜고 디자인 시안을 만들어 바로 송출합니다. 더 이상의 번거로운 승인이나 세팅 절차는 없습니다.",
        step1: "예산 입력",
        step2: "AI 전략 추천",
        step3: "원클릭 런치",
        qBudget: "이번 캠페인에 얼마를 투자하시겠습니까?",
        budgetSub: "나머지 채널별 복잡한 분배와 소재 생성은 AI가 알아서 해드립니다.",
        campName: "캠페인 명칭",
        budgetLabel: "월 총 투자 예산 (₩)",
        budgetErr: "카테고리를 선택하고 예산을 100,000원 이상 입력해 주세요.",
        btnSimulate: "AI 통합 전략 수립하기",
        simulating: "AI 전략 수립 중...",
        mixTitle: "AI 미디어 믹스 추천",
        mixSub: "입력하신 금액의 최적 분배안입니다.",
        estRoas: "예상 통합 ROAS",
        estConv: "예상 총 전환 수",
        cases: "건",
        expRoas: "예상 ROAS:",
        btnRetry: "다시 입력",
        btnNext: "이 전략으로 결제 진행 →",
        launchTitle: "원클릭 승인 및 라이브 런치",
        launchSub: "기존의 복잡한 결재 라인과 카드 등록 절차를 통합했습니다. 아래 버튼을 클릭하면 사전에 등록된 법인 카드 지갑에서 자동 과금되며 캠페인이 즉시 운영 모드로 진입합니다.",
        payMethod: "결제 수단",
        corporateCard: "법인 공용 카드 (끝자리 4821)",
        totalAmt: "총 결제 금액",
        btnReview: "전략 재검토",
        btnLaunch: "결제 승인 및 즉시 라이브 시작",
        btnLaunching: "결제 및 활성화 진행 중...",
        alertSuccess: "성공적으로 승인되었습니다. {camp} 캠페인이 라이브로 송출됩니다!"`;

function inject(file, payload) {
    let text = fs.readFileSync(file, 'utf8');
    // find `unified: {`
    text = text.replace(/(unified:\s*\{)(\s*whichCategory)/, `$1\n${payload},\n$2`);
    fs.writeFileSync(file, text, 'utf8');
}

inject('frontend/src/i18n/locales/en.js', enKeys);
inject('frontend/src/i18n/locales/ko.js', koKeys);
console.log('done patching full i18n keys');
