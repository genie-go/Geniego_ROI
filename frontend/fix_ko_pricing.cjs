const fs = require('fs');
const filePath = 'src/i18n/locales/ko.js';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Fix damaged team management section (lines 1029-1037)
// The damaged block: object { with just array items, no icon/label/desc
const damagedBlock = `                {
                        "플랜별 계정 수와 요금 설정: 1계정, 5계정, 10계정, 30계정, 무제한 행별 요금 입력",
                        "'+ 계정 수 추가' 버튼으로 새 계정 수 행 추가 가능 / ✕ 버튼으로 삭제",
                        "플랜 삭제: 각 유료 플랜 헤더의 '🗑 삭제' 버튼으로 플랜 제거",
                        "메뉴 접근 권한 탭: 플랜별 체크박스로 메뉴 접근 권한 설정",
                        "저장 버튼 클릭 → Paddle 자동 동기화",
                        "정산·재무 → 요금제 패키지 생성 탭과 연동됨"
                    ], roles: { admin: "전체 플랜 관리 가능 (유일하게 가능)", editor: "불가", viewer: "불가" }
                },`;

const fixedBlock = `                {
                    icon: "👥", label: "팀 관리 (팀 워크스페이스)", path: "/workspace", desc: "유료 구독 회원이 팀/부서를 생성하고, 팀원을 등록하여 메뉴 접근 권한을 부여합니다. 무료 회원은 데모 체험 가능, 유료 결제 후 즉시 활성화됩니다.", how: [
                        "사이드바 '👥 내 팀·도움말' → '팀 관리' 클릭",
                        "팀/부서 생성: 팀 이름 입력 후 '+ 팀 추가' 클릭",
                        "팀원 등록: 팀 선택 → 팀원 이메일·이름·접근 ID·비밀번호 입력",
                        "메뉴 접근 권한 부여: 팀별로 허용할 메뉴(기능) 체크박스 선택",
                        "구독한 플랜 범위 내에서 팀별로 권한 배분 가능",
                        "💡 무료 회원: 샘플 데이터로 체험 가능 / 유료 결제 후 실제 데이터 연동 즉시 활성화",
                        "⚠️ 플랫폼 관리자(admin) 계정과는 완전 분리된 별도 팀 관리 공간"
                    ], roles: { admin: "팀 생성·수정·삭제, 팀원 권한 전체 관리", editor: "본인 소속 팀 관리", viewer: "팀 현황 조회만" }
                },
                {
                    icon: "💰", label: "구독요금 관리 — 플랜 설정 (관리자 전용)", path: "/admin", desc: "플랫폼 관리자가 구독 플랜을 동적으로 생성·삭제하고 메뉴별 접근 권한을 설정합니다. Free / Growth / Pro / Enterprise 4단계로 구성됩니다.", how: [
                        "관리자 센터 (/admin) 로그인 → '구독요금 관리' 탭 클릭",
                        "Free 플랜: 무료 회원가입 시 자동 부여 — 전체 데모 접근 권한 포함 (별도 설정 불필요)",
                        "유료 플랜 추가: '+ 유료 플랜 추가' 버튼 → 플랜 이름 입력 (예: Growth, Pro, Enterprise)",
                        "플랜별 계정 수와 요금 설정: 1계정, 5계정, 10계정, 30계정, 무제한 행별 요금 입력",
                        "'+ 계정 수 추가' 버튼으로 새 계정 수 행 추가 가능 / ✕ 버튼으로 삭제",
                        "플랜 삭제: 각 유료 플랜 헤더의 '🗑 삭제' 버튼으로 플랜 제거",
                        "메뉴 접근 권한 탭: 플랜별 체크박스로 메뉴 접근 권한 설정",
                        "저장 버튼 클릭 → Paddle 자동 동기화",
                        "정산·재무 → 요금제 패키지 생성 탭과 연동됨"
                    ], roles: { admin: "전체 플랜 관리 가능 (유일하게 가능)", editor: "불가", viewer: "불가" }
                },`;

if (content.includes(damagedBlock)) {
    content = content.replace(damagedBlock, fixedBlock);
    console.log('✅ Fixed damaged team section');
} else {
    console.log('⚠ Damaged block not found - checking with CRLF...');
    const damagedCRLF = damagedBlock.replace(/\n/g, '\r\n');
    const fixedCRLF = fixedBlock.replace(/\n/g, '\r\n');
    if (content.includes(damagedCRLF)) {
        content = content.replace(damagedCRLF, fixedCRLF);
        console.log('✅ Fixed damaged team section (CRLF)');
    } else {
        console.log('❌ Could not find damaged block');
    }
}

// 2. Expand ko.pricing section with full set of translation keys
const oldPricing = `ko.pricing = {
    pageTitle: "💳 플랜·결제",
    pageSub: "서비스 플랜 선택·결제·구독 관리",
    currentPlan: "현재 플랜", nextBilling: "다음 결제일", monthlyFee: "월 요금",
    upgrade: "업그레이드", downgrade: "다운그레이드", cancel: "구독 취소",
    planStarter: "Starter", planPro: "Pro", planEnterprise: "Enterprise",
    perMonth: "/ 월", mostPopular: "가장 인기",
    features: "주요 기능", selectPlan: "이 플랜 선택",
    billingHistory: "결제 이력", date: "날짜", amount: "금액", status: "상태",
    downloadReceipt: "영수증 다운로드",
};`;

const newPricing = `ko.pricing = {
    pageTitle: "💳 플랜·결제",
    pageSub: "서비스 플랜 선택·결제·구독 관리",
    currentPlan: "현재 플랜", nextBilling: "다음 결제일", monthlyFee: "월 요금",
    upgrade: "업그레이드", downgrade: "다운그레이드", cancel: "구독 취소",
    planStarter: "Starter", planPro: "Pro", planEnterprise: "Enterprise",
    perMonth: "/ 월", mostPopular: "가장 인기",
    features: "주요 기능", selectPlan: "이 플랜 선택",
    billingHistory: "결제 이력", date: "날짜", amount: "금액", status: "상태",
    downloadReceipt: "영수증 다운로드",
    cycleMonthly: "월간", cycleQuarterly: "3개월", cycleSemiAnnual: "6개월", cycleYearly: "연간",
    badge: "구독 요금제",
    heroTitle: "Geniego‑ROI 구독 요금제",
    heroDesc: "마케팅 자동화 · 이커머스 분석 · WMS · AI 인사이트를 하나의 플랫폼에서",
    heroSaving: "개별 툴 대비 최대",
    heroSavingBold: "85% 절감",
    currentPlanLabel: "현재 이용 중인 플랜",
    btnFreeStart: "무료로 시작",
    btnSubscribe: "구독 시작",
    btnCurrent: "✓ 현재 이용 중",
    btnPaying: "결제 처리 중...",
    btnViewAll: "▾ 서비스 전체 보기",
    btnViewLess: "▴ 서비스 간략히",
    acctSelect: "계정 수 선택",
    registerSoon: "요금 등록 예정",
    freeForever: "Free (영구)",
    totalLabel: "개월 합계",
    compareBtnShow: "▾ 플랜별 상세 기능 비교표 보기",
    compareBtnHide: "▴ 플랜 비교표 숨기기",
    compareTitle: "📊 플랜별 기능 비교",
    compareFeature: "기능",
    savingTitle: "💡 개별 도구 합산 vs. Geniego‑ROI",
    savingDesc: "HubSpot Pro + Klaviyo + Shopify WMS + Supermetrics 개별 구독 시 월",
    savingDesc2: "Geniego‑ROI Pro 구독 시 —",
    savingBold: "최대 85% 비용 절감",
    faqTitle: "자주 묻는 질문",
    faq1q: "플랜을 언제든지 변경할 수 있나요?",
    faq1a: "네, 언제든지 상위/하위 플랜으로 즉시 전환 가능합니다. 일할 계산으로 차액이 조정됩니다.",
    faq2q: "계정 수는 무엇을 의미하나요?",
    faq2a: "동시에 접속 가능한 독립 사용자 계정 수입니다. Enterprise는 무제한입니다.",
    faq3q: "구독 취소 시 환불은 어떻게 되나요?",
    faq3a: "월간은 당일 취소 시 100% 환불, 분기/반기/연간은 나머지 기간 비율로 환불됩니다.",
    faq4q: "Free 플랜과 유료 플랜의 차이는?",
    faq4a: "Free는 데모 데이터 기반 체험 플랜입니다. 실제 채널 연동, 실시간 데이터, AI 자동화는 Growth 이상에서 제공됩니다.",
    faq5q: "요금이 '등록 예정'으로 표시되는 이유는?",
    faq5a: "관리자 센터에서 해당 플랜·주기의 요금이 아직 등록되지 않은 상태입니다. 곧 업데이트됩니다.",
    faq6q: "Enterprise 플랜 구매 방법은?",
    faq6a: "Enterprise는 별도 상담 후 맞춤 계약을 진행합니다. contact@genie-roi.com으로 문의주세요.",
    terms: "이용약관",
    termsNote: "구독 시 이용약관에 동의하는 것으로 간주됩니다. 모든 요금은 VAT 포함 기준이며, VAT가 별도로 발생할 수 있습니다.",
    loadingText: "요금 정보를 불러오는 중…",
    limitedFeat: "⚠ 이 플랜에서 제한되는 기능",
};`;

// Try both CRLF and LF versions
const tryReplace = (old, nw) => {
    if (content.includes(old)) {
        content = content.replace(old, nw);
        return true;
    }
    const oldCRLF = old.replace(/\n/g, '\r\n');
    const newCRLF = nw.replace(/\n/g, '\r\n');
    if (content.includes(oldCRLF)) {
        content = content.replace(oldCRLF, newCRLF);
        return true;
    }
    return false;
};

if (tryReplace(oldPricing, newPricing)) {
    console.log('✅ Expanded ko.pricing section');
} else {
    console.log('⚠ ko.pricing not found exactly - will append new keys after existing section');
    // Find end of ko.pricing and insert before the }; 
    const pricingStart = content.indexOf('ko.pricing = {');
    if (pricingStart >= 0) {
        const endIdx = content.indexOf('\n};', pricingStart);
        if (endIdx >= 0) {
            const extraKeys = `
    cycleMonthly: "월간", cycleQuarterly: "3개월", cycleSemiAnnual: "6개월", cycleYearly: "연간",
    badge: "구독 요금제",
    heroTitle: "Geniego‑ROI 구독 요금제",
    heroDesc: "마케팅 자동화 · 이커머스 분석 · WMS · AI 인사이트를 하나의 플랫폼에서",
    heroSaving: "개별 툴 대비 최대", heroSavingBold: "85% 절감",
    currentPlanLabel: "현재 이용 중인 플랜",
    btnFreeStart: "무료로 시작", btnSubscribe: "구독 시작", btnCurrent: "✓ 현재 이용 중",
    btnPaying: "결제 처리 중...", btnViewAll: "▾ 서비스 전체 보기", btnViewLess: "▴ 서비스 간략히",
    acctSelect: "계정 수 선택", registerSoon: "요금 등록 예정", freeForever: "Free (영구)",
    totalLabel: "개월 합계",
    compareBtnShow: "▾ 플랜별 상세 기능 비교표 보기", compareBtnHide: "▴ 플랜 비교표 숨기기",
    compareTitle: "📊 플랜별 기능 비교", compareFeature: "기능",
    savingTitle: "💡 개별 도구 합산 vs. Geniego‑ROI",
    savingDesc: "HubSpot Pro + Klaviyo + Shopify WMS + Supermetrics 개별 구독 시 월",
    savingDesc2: "Geniego‑ROI Pro 구독 시 —", savingBold: "최대 85% 비용 절감",
    faqTitle: "자주 묻는 질문",
    faq1q: "플랜을 언제든지 변경할 수 있나요?", faq1a: "네, 언제든지 상위/하위 플랜으로 즉시 전환 가능합니다. 일할 계산으로 차액이 조정됩니다.",
    faq2q: "계정 수는 무엇을 의미하나요?", faq2a: "동시에 접속 가능한 독립 사용자 계정 수입니다. Enterprise는 무제한입니다.",
    faq3q: "구독 취소 시 환불은 어떻게 되나요?", faq3a: "월간은 당일 취소 시 100% 환불, 분기/반기/연간은 나머지 기간 비율로 환불됩니다.",
    faq4q: "Free 플랜과 유료 플랜의 차이는?", faq4a: "Free는 데모 데이터 기반 체험 플랜입니다. 실제 채널 연동, 실시간 데이터, AI 자동화는 Growth 이상에서 제공됩니다.",
    faq5q: "요금이 '등록 예정'으로 표시되는 이유는?", faq5a: "관리자 센터에서 해당 플랜·주기의 요금이 아직 등록되지 않은 상태입니다. 곧 업데이트됩니다.",
    faq6q: "Enterprise 플랜 구매 방법은?", faq6a: "Enterprise는 별도 상담 후 맞춤 계약을 진행합니다. contact@genie-roi.com으로 문의주세요.",
    terms: "이용약관",
    termsNote: "구독 시 이용약관에 동의하는 것으로 간주됩니다. 모든 요금은 VAT 포함 기준이며, VAT가 별도로 발생할 수 있습니다.",
    loadingText: "요금 정보를 불러오는 중…", limitedFeat: "⚠ 이 플랜에서 제한되는 기능",`;
            content = content.slice(0, endIdx) + extraKeys + '\n' + content.slice(endIdx);
            console.log('✅ Appended extra pricing keys before };');
        }
    }
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ File saved successfully');
