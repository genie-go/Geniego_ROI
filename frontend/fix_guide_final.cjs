const fs=require('fs'),vm=require('vm');
const f='src/i18n/locales/ko.js';
const c=fs.readFileSync(f,'utf8');
const M={e:null};
vm.runInNewContext(c.replace(/^export\s+default\s+/,'M.e='),{M});
const ko=M.e;

// Fix dashGuide with EXACT key names from DashGuide.jsx
ko.dashGuide={
  ...(ko.dashGuide||{}),
  title:"대시보드 이용 가이드",
  subtitle:"Geniego-ROI 대시보드의 모든 기능을 활용하는 방법을 안내합니다. 각 탭의 역할과 데이터 흐름을 이해하고, 실시간 KPI를 효과적으로 모니터링하세요.",
  beginnerBadge:"초급 가이드",timeBadge:"5분 소요",langBadge:"15개 언어",
  whereToStart:"어디서 시작하나요?",
  whereToStartDesc:"1. 좌측 메뉴에서 \"대시보드\"를 클릭합니다.\n2. 상단 KPI 카드를 확인합니다.\n3. 하위 탭을 클릭하여 상세 분석을 확인합니다.\n4. 보안 배너를 확인합니다.",
  stepsTitle:"🚀 시작하기 — 10단계 가이드",
  step1Title:"대시보드 접속",step1Desc:"로그인 후 좌측 메뉴에서 \"대시보드\"를 클릭합니다.",
  step2Title:"KPI 카드 확인",step2Desc:"상단 6개 KPI 카드를 확인합니다.",
  step3Title:"마케팅 분석",step3Desc:"마케팅 탭에서 채널별 성과를 비교합니다.",
  step4Title:"채널 KPI 확인",step4Desc:"채널별 CTR, CPC, ROAS를 확인합니다.",
  step5Title:"커머스 확인",step5Desc:"마켓플레이스 정산 현황을 확인합니다.",
  step6Title:"글로벌 매출 분석",step6Desc:"세계 지도에서 국가별 매출을 분석합니다.",
  step7Title:"인플루언서 관리",step7Desc:"크리에이터 팔로워와 참여도를 모니터링합니다.",
  step8Title:"시스템 모니터링",step8Desc:"서버 및 보안 상태를 확인합니다.",
  step9Title:"보안 알림 확인",step9Desc:"보안 배너에서 위협을 확인합니다.",
  step10Title:"정기 모니터링",step10Desc:"일일 대시보드 점검 루틴을 만드세요.",
  tabsTitle:"📋 탭별 기능 안내",
  tabOverview:"6대 핵심 KPI를 한눈에 확인합니다.",
  tabMarketing:"채널별 광고 성과를 비교합니다.",
  tabChannel:"채널별 실시간 CTR, CPC, ROAS를 확인합니다.",
  tabCommerce:"마켓플레이스 정산 및 수수료를 관리합니다.",
  tabSales:"세계 지도 기반 국가별 매출을 비교합니다.",
  tabInfluencer:"크리에이터 참여도를 추적합니다.",
  tabSystem:"서버 및 보안 상태를 모니터링합니다.",
  featuresTitle:"✨ 주요 기능",
  feat1Title:"실시간 KPI 대시보드",feat1Desc:"모든 데이터가 실시간으로 동기화됩니다.",
  feat2Title:"자동 데이터 동기화",feat2Desc:"5초마다 최신 데이터가 업데이트됩니다.",
  feat3Title:"15개 언어 지원",feat3Desc:"15개 언어를 자동 감지합니다.",
  feat4Title:"통합 매출 분석",feat4Desc:"채널, 국가, 크리에이터별로 분석합니다.",
  feat5Title:"엔터프라이즈 보안",feat5Desc:"XSS, CSRF, 무차별 대입 공격 방지.",
  feat6Title:"반응형 디자인",feat6Desc:"모든 기기에 최적화되어 있습니다.",
  tipsTitle:"전문가 팁",
  tip1:"매일 아침 KPI 카드 색상을 확인하세요. 빨간색 = 즉시 조치.",
  tip2:"채널 카드를 클릭하면 5섹션 분석을 볼 수 있습니다.",
  tip3:"국가 마커를 클릭하면 상세 분석을 볼 수 있습니다.",
  tip4:"AI 분석으로 크리에이터 포트폴리오를 평가하세요.",
  tip5:"시스템 탭에서 \"SECURE\" 상태를 정기적으로 확인하세요.",
  faqTitle:"자주 묻는 질문",
  faq1Q:"데이터가 표시되지 않아요",faq1A:"캠페인 매니저에서 광고 캠페인을 먼저 생성하세요.",
  faq2Q:"KPI 값이 0이에요",faq2A:"데이터 수집에 몇 시간이 걸립니다.",
  faq3Q:"특정 채널이 누락되었어요",faq3A:"캠페인 매니저에서 채널을 연결하세요.",
  faq4Q:"보안 알림이 계속 나타나요",faq4A:"SecurityGuard가 위협을 감지했습니다. 해제를 사용하세요.",
  faq5Q:"언어는 어떻게 변경하나요?",faq5A:"우측 상단 언어 드롭다운을 사용하세요.",
  readyTitle:"🎉 시작할 준비가 되었습니다!",
  readyDesc:"상단의 종합 현황 탭을 클릭하여 대시보드를 사용해보세요."
};

// Fix campMgr guide sub-keys
ko.campMgr={
  ...(ko.campMgr||{}),
  guideStartBtn:"시작하기",
  guideTabOverviewName:"대시보드",guideTabOverviewDesc:"캠페인 전체 현황을 한눈에 확인합니다.",
  guideTabListName:"캠페인 목록",guideTabListDesc:"생성된 캠페인 목록을 관리합니다.",
  guideTabAnalysisName:"성과 분석",guideTabAnalysisDesc:"상세 성과 데이터를 분석합니다.",
  guideTabAbName:"A/B 테스트",guideTabAbDesc:"A/B 테스트 결과를 비교합니다.",
  guideTabGuideName:"이용 가이드",guideTabGuideDesc:"사용법 안내를 확인합니다.",
  guideTip1:"캠페인 목표를 명확히 설정하세요.",
  guideTip2:"주간 단위로 성과를 리뷰하세요.",
  guideTip3:"성과가 좋은 캠페인의 예산을 증액하세요.",
  guideTip4:"A/B 테스트로 최적 전략을 찾으세요.",
  guideTip5:"시즌별 캠페인을 미리 준비하세요.",
  guideFaqTitle:"자주 묻는 질문",
  guideFaq1Q:"캠페인이 생성되지 않아요.",guideFaq1A:"필수 항목을 모두 입력했는지 확인하세요.",
  guideFaq2Q:"성과가 표시되지 않아요.",guideFaq2A:"캠페인 시작 후 데이터 수집에 시간이 걸립니다.",
  guideReadyTitle:"시작할 준비가 되셨나요?",guideReadyDesc:"좌측 메뉴에서 캠페인 관리를 선택하세요."
};

// Fix jb guide sub-keys
ko.jb={
  ...(ko.jb||{}),
  guideStartBtn:"시작하기",
  guideTabBuilderName:"여정 빌더",guideTabBuilderDesc:"고객 여정 시나리오를 설계합니다.",
  guideTabListName:"여정 목록",guideTabListDesc:"생성된 여정 목록을 관리합니다.",
  guideTabLogName:"실행 로그",guideTabLogDesc:"여정 실행 이력을 확인합니다.",
  guideTabAnalysisName:"분석",guideTabAnalysisDesc:"여정 성과를 분석합니다.",
  guideTabGuideName:"이용 가이드",guideTabGuideDesc:"사용법 안내를 확인합니다.",
  guideTip1:"간단한 여정부터 시작하세요.",
  guideTip2:"분기 조건을 활용하여 개인화하세요.",
  guideTip3:"A/B 테스트로 최적 메시지를 찾으세요.",
  guideTip4:"실행 로그를 정기적으로 확인하세요.",
  guideTip5:"성과 분석으로 여정을 최적화하세요.",
  guideFaqTitle:"자주 묻는 질문",
  guideFaq1Q:"여정이 실행되지 않아요.",guideFaq1A:"트리거 조건 설정을 확인하세요.",
  guideFaq2Q:"이메일이 발송되지 않아요.",guideFaq2A:"이메일 채널 연동 상태를 확인하세요.",
  guideReadyTitle:"시작할 준비가 되셨나요?",guideReadyDesc:"좌측 메뉴에서 여정 빌더를 선택하세요."
};

// Fix marketing guide sub-keys (aiGuide keys from AdStatusAnalysis used in Marketing.jsx)
ko.marketing={
  ...(ko.marketing||{}),
  aiGuideStep1Title:"기간 설정",aiGuideStep1Desc:"분석할 날짜 범위를 설정합니다.",
  aiGuideStep2Title:"KPI 확인",aiGuideStep2Desc:"지출, 노출, 클릭, CTR, ROAS를 확인합니다.",
  aiGuideStep3Title:"채널 비교",aiGuideStep3Desc:"채널별 성과를 비교 분석합니다.",
  aiGuideStep4Title:"크리에이티브 분석",aiGuideStep4Desc:"소재별 성과를 분석합니다.",
  aiGuideStep5Title:"AI 추천",aiGuideStep5Desc:"AI 기반 최적화 추천을 확인합니다.",
  aiGuideStep6Title:"리포트 생성",aiGuideStep6Desc:"분석 결과를 리포트로 내보냅니다.",
  guideTabOverviewName:"종합 현황",guideTabOverviewDesc:"전체 광고 성과를 확인합니다.",
  guideTabAdStatusName:"광고 현황",guideTabAdStatusDesc:"광고 상태별 성과를 분석합니다.",
  guideTabCreativeName:"크리에이티브",guideTabCreativeDesc:"소재별 성과를 분석합니다.",
  guideTabCompareName:"비교 분석",guideTabCompareDesc:"채널 간 성과를 비교합니다.",
  guideTabAiDesignName:"AI 디자인",guideTabAiDesignDesc:"AI 기반 크리에이티브를 생성합니다.",
  guideTabGuideName:"이용 가이드",guideTabGuideDesc:"사용법 안내를 확인합니다.",
  guideStartBtn:"시작하기",
  guideTip1:"예산은 주 단위로 검토하세요.",
  guideTip2:"A/B 테스트로 최적의 소재를 찾으세요.",
  guideTip3:"AI 추천 세그먼트를 적극 활용하세요.",
  guideTip4:"성과 리포트를 정기적으로 확인하세요.",
  guideTip5:"시즌별 캠페인 전략을 미리 수립하세요.",
  guideFaqTitle:"자주 묻는 질문",
  guideFaq1Q:"데이터가 표시되지 않아요.",guideFaq1A:"광고 캠페인을 먼저 등록하세요.",
  guideFaq2Q:"ROAS가 0이에요.",guideFaq2A:"캠페인 실행 후 데이터 수집에 시간이 걸립니다.",
  guideReadyTitle:"시작할 준비가 되셨나요?",guideReadyDesc:"좌측 메뉴에서 광고성과를 선택하세요."
};

const out=`export default ${JSON.stringify(ko,null,2)};\n`;
fs.writeFileSync(f,out,'utf8');
console.log('✅ All dashGuide/campMgr/jb/marketing keys fixed');
console.log('Size: '+(Buffer.byteLength(out,'utf8')/1024).toFixed(1)+'KB');
