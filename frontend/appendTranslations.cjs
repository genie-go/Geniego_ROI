const fs = require('fs');

function applyTranslations(file, objName, dashBlock) {
    let content = fs.readFileSync(file, 'utf8');
    const replaceTarget = 'export default ' + objName + ';';
    content = content.replace(replaceTarget, dashBlock + '\n' + replaceTarget);
    fs.writeFileSync(file, content);
    console.log(`Updated ${file}`);
}

const koBlock = `
// Append new definitions
${'ko'}.dashboard = Object.assign(${'ko'}.dashboard || {}, {
    "grossRevenue": "GROSS REVENUE",
    "grossRevSub": "오늘 총 매출",
    "adSpend": "AD SPEND",
    "adSpendSub": "전체 광고 지출",
    "netROAS": "NET ROAS",
    "netROASSub": "순수익 / 광고비",
    "totalOrders": "총 주문 수",
    "totalOrderSub": "오늘 기준",
    "convRateLbl": "전환율",
    "convRateSub": "세션 대비",
    "avgOrder": "평균 주문가"
});

${'ko'}.dash = {
    "vsYesterday": "어제 대비",
    "selectRoleTitle": "당신의 역할을 선택해주세요",
    "selectRoleDesc": "역할에 맞는 맞춤형 옵션과 퀵 액션을 제안합니다.",
    "selectRoleBtn": "역할 선택하기",
    "mode": "모드",
    "todayTasks": "오늘의 할 일",
    "changeRole": "역할 변경",
    "channelMix": "채널 믹스",
    "liveActivity": "실시간 활동",
    "sysStatus": "시스템 현황",
    "moduleShortcuts": "모듈 숏컷",
    "analyticsModules": "애널리틱스 모듈",
    "Attribution": "어트리뷰션",
    "GraphScore": "그래프점수",
    "KRChannel": "국내채널",
    "PriceOpt": "가격최적화",
    "Marketing": "마케팅",
    "Influencer": "인플루언서",
    "Reconcile": "정산대조",
    "Alerts": "알럿",
    "AIPolicy": "AI정책"
};

${'ko'}.tabs = {
    "overview": "종합 대시보드",
    "overviewDesc": "전체 현황 요약",
    "marketing": "마케팅 퍼포먼스",
    "marketingDesc": "광고 성과 분석",
    "channel": "채널 KPI",
    "channelDesc": "채널별 주요 지표",
    "commerce": "커머스 정산",
    "commerceDesc": "커머스 정산 현황",
    "sales": "매출 현황",
    "salesDesc": "매출 및 이익 분석",
    "influencer": "인플루언서",
    "influencerDesc": "크리에이터 분석",
    "system": "시스템 현황",
    "systemDesc": "서버 모니터링"
};
`;

const enBlock = `
// Append new definitions
${'en'}.dashboard = Object.assign(${'en'}.dashboard || {}, {
    "grossRevenue": "GROSS REVENUE",
    "grossRevSub": "Today's Total Sales",
    "adSpend": "AD SPEND",
    "adSpendSub": "Total Ad Spend",
    "netROAS": "NET ROAS",
    "netROASSub": "Net Profit / Ad Spend",
    "totalOrders": "Total Orders",
    "totalOrderSub": "Today's Metrics",
    "convRateLbl": "Conversion Rate",
    "convRateSub": "Per Session",
    "avgOrder": "Avg. Order Value"
});

${'en'}.dash = {
    "vsYesterday": "vs Yesterday",
    "selectRoleTitle": "Please Select Your Role",
    "selectRoleDesc": "Provides customized actions based on your role.",
    "selectRoleBtn": "Select Role",
    "mode": "Mode",
    "todayTasks": "Today's Tasks",
    "changeRole": "Change Role",
    "channelMix": "Channel Mix",
    "liveActivity": "Live Activity Feed",
    "sysStatus": "System Status",
    "moduleShortcuts": "Module Shortcuts",
    "analyticsModules": "Analytics Modules",
    "Attribution": "Attribution",
    "GraphScore": "Graph Score",
    "KRChannel": "KR Channel",
    "PriceOpt": "Price Opt",
    "Marketing": "Marketing",
    "Influencer": "Influencer",
    "Reconcile": "Reconcile",
    "Alerts": "Alerts",
    "AIPolicy": "AI Policy"
};

${'en'}.tabs = {
    "overview": "Overview Summary",
    "overviewDesc": "Overall Dashboard",
    "marketing": "Marketing Perf.",
    "marketingDesc": "Ad Performance",
    "channel": "Channel KPI",
    "channelDesc": "Key Metrics by Channel",
    "commerce": "Commerce Sync",
    "commerceDesc": "Commerce Settlement",
    "sales": "Global Sales",
    "salesDesc": "Sales & Profit",
    "influencer": "Influencer",
    "influencerDesc": "Creator Analysis",
    "system": "System Status",
    "systemDesc": "Server Monitoring"
};
`;

applyTranslations('d:/project/GeniegoROI/frontend/src/i18n/locales/ko.js', 'ko', koBlock);
applyTranslations('d:/project/GeniegoROI/frontend/src/i18n/locales/en.js', 'en', enBlock);
