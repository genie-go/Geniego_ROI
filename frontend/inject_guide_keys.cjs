const fs=require('fs'),vm=require('vm');
const f='src/i18n/locales/ko.js';
const c=fs.readFileSync(f,'utf8');
const code=c.replace(/^export\s+default\s+/,'M.e=');
const M={e:null};
vm.runInNewContext(code,{M});
const ko=M.e;

// Inject all missing guide/tab keys
const inject={
dashGuide:{
  title:"대시보드 이용 가이드",
  desc:"Geniego-ROI 대시보드의 주요 기능과 활용법을 안내합니다. 각 탭별 핵심 지표를 실시간으로 모니터링하고 데이터 기반 의사결정을 내려보세요.",
  badgeBeginner:"초급 가이드",badgeTime:"5분 소요",badgeLang:"15개 언어",
  whereStart:"어디서 시작하나요?",
  step1:"좌측 메뉴에서 \"대시보드\"를 클릭합니다.",
  step2:"상단 KPI 카드를 확인합니다.",
  step3:"하위 탭을 클릭하여 상세 분석을 확인합니다.",
  step4:"보안 배너를 확인합니다.",
  stepsTitle:"대시보드 시작 6단계",
  step1Title:"탭 선택하기",step1Desc:"상단 탭 바에서 원하는 분석 카테고리를 선택합니다.",
  step2Title:"KPI 카드 확인",step2Desc:"각 대시보드의 상단에 있는 KPI 카드에서 핵심 지표를 확인합니다.",
  step3Title:"차트 분석하기",step3Desc:"트렌드 차트, 채널 그래프 등을 활용합니다.",
  step4Title:"기간 필터 사용",step4Desc:"날짜 범위를 변경하여 원하는 기간의 데이터를 분석합니다.",
  step5Title:"데이터 내보내기",step5Desc:"엑셀 다운로드 버튼으로 데이터를 내보냅니다.",
  step6Title:"알림 확인",step6Desc:"실시간 활동 피드에서 최신 알림을 확인합니다."
},
marketing:{
  ...(ko.marketing||{}),
  guideTitle:"마케팅 자동화 이용 가이드",
  guideSub:"AI 기반 마케팅 자동화 플랫폼의 주요 기능과 활용법을 안내합니다.",
  guideStepsTitle:"시작 6단계",
  guideStep1Title:"예산 설정",guideStep1Desc:"월별 광고 예산을 설정하고 채널별 배분 비율을 지정합니다.",
  guideStep2Title:"캠페인 생성",guideStep2Desc:"AI가 추천하는 최적화된 캠페인을 생성합니다.",
  guideStep3Title:"타겟 설정",guideStep3Desc:"AI 세그먼트 기반으로 정밀 타겟팅을 설정합니다.",
  guideStep4Title:"소재 제작",guideStep4Desc:"AI 크리에이티브 도구로 광고 소재를 자동 생성합니다.",
  guideStep5Title:"성과 모니터링",guideStep5Desc:"실시간 대시보드에서 캠페인 성과를 추적합니다.",
  guideStep6Title:"최적화 실행",guideStep6Desc:"AI 추천에 따라 예산과 입찰가를 자동 최적화합니다.",
  guideTabsTitle:"탭별 기능 안내",
  guideTipsTitle:"활용 팁",
  guideTip1:"예산은 주 단위로 검토하여 효율을 극대화하세요.",
  guideTip2:"A/B 테스트를 활용하여 최적의 소재를 찾으세요.",
  guideTip3:"AI 추천 세그먼트를 적극 활용하세요.",
  guideTip4:"성과 리포트를 정기적으로 확인하세요.",
  guideTip5:"시즌별 캠페인 전략을 미리 수립하세요.",
  guideStartBtn:"시작하기",
  autoTab1:"① 캠페인 설정",autoTab2:"③ 캠페인 설정",autoTab3:"③ AI 전략 미리보기",autoTab4:"이용 가이드"
},
campMgr:{
  ...(ko.campMgr||{}),
  guideTitle:"캠페인 관리 이용 가이드",
  guideSub:"AI 마케팅 캠페인 생성·실행·성과 분석 가이드입니다.",
  guideStepsTitle:"시작 6단계",
  guideStep1Title:"캠페인 생성",guideStep1Desc:"새 캠페인 생성 버튼을 클릭하여 캠페인을 만듭니다.",
  guideStep2Title:"목표 설정",guideStep2Desc:"캠페인의 KPI 목표를 설정합니다.",
  guideStep3Title:"예산 배분",guideStep3Desc:"채널별 예산을 배분합니다.",
  guideStep4Title:"일정 설정",guideStep4Desc:"캠페인 시작일과 종료일을 지정합니다.",
  guideStep5Title:"성과 분석",guideStep5Desc:"실시간으로 캠페인 성과를 모니터링합니다.",
  guideStep6Title:"A/B 테스트",guideStep6Desc:"다양한 변수를 테스트하여 최적 전략을 찾습니다.",
  guideTabsTitle:"탭별 기능 안내",
  guideTabDashboardName:"대시보드",guideTabDashboardDesc:"캠페인 전체 현황을 한눈에 확인합니다.",
  guideTabListName:"캠페인 목록",guideTabListDesc:"생성된 캠페인 목록을 관리합니다.",
  guideTabAnalysisName:"성과 분석",guideTabAnalysisDesc:"상세 성과 데이터를 분석합니다.",
  guideTabAbName:"A/B 테스트",guideTabAbDesc:"A/B 테스트 결과를 비교합니다.",
  guideTipsTitle:"활용 팁",
  guideTip1:"캠페인 목표를 명확히 설정하세요.",
  guideTip2:"주간 단위로 성과를 리뷰하세요.",
  guideTip3:"성과가 좋은 캠페인의 예산을 증액하세요.",
  tabGuide:"이용 가이드"
},
jb:{
  ...(ko.jb||{}),
  guideTitle:"고객 여정 빌더 이용 가이드",
  guideSub:"AI 기반 자동화 고객 여정 설계·실행·분석 가이드입니다.",
  guideStepsTitle:"시작 6단계",
  guideStep1Title:"여정 생성",guideStep1Desc:"새로운 고객 여정 시나리오를 만듭니다.",
  guideStep2Title:"트리거 설정",guideStep2Desc:"여정을 시작할 이벤트 조건을 설정합니다.",
  guideStep3Title:"단계 추가",guideStep3Desc:"이메일, SMS, 푸시 등 액션 단계를 추가합니다.",
  guideStep4Title:"조건 분기",guideStep4Desc:"고객 행동에 따른 분기 조건을 설정합니다.",
  guideStep5Title:"테스트 실행",guideStep5Desc:"시뮬레이션으로 여정 플로우를 검증합니다.",
  guideStep6Title:"성과 분석",guideStep6Desc:"여정별 전환율과 참여도를 분석합니다.",
  guideTabsTitle:"탭별 기능 안내",
  guideTipsTitle:"활용 팁",
  tabGuide:"이용 가이드"
},
adPerf:{
  ...(ko.adPerf||{}),
  tabAdStatus:"광고 현황",tabCreative:"크리에이티브",tabCompare:"비교 분석",
  tabAiDesign:"AI 디자인",tabGuide:"이용 가이드",
  guideTitle:"광고 성과 분석 이용 가이드",
  guideSub:"AI 매체 통합 분석 - 종합 광고 성과 분석 지표 관리 가이드입니다.",
  guideStepsTitle:"시작 6단계",
  guideStep1Title:"기간 설정",guideStep1Desc:"분석할 날짜 범위를 설정합니다.",
  guideStep2Title:"KPI 확인",guideStep2Desc:"지출, 노출, 클릭, CTR, ROAS를 확인합니다.",
  guideStep3Title:"채널 비교",guideStep3Desc:"채널별 성과를 비교 분석합니다.",
  guideStep4Title:"크리에이티브 분석",guideStep4Desc:"소재별 성과를 분석합니다.",
  guideStep5Title:"AI 추천",guideStep5Desc:"AI 기반 최적화 추천을 확인합니다.",
  guideStep6Title:"리포트 생성",guideStep6Desc:"분석 결과를 리포트로 내보냅니다.",
  guideTabsTitle:"탭별 기능 안내",guideTipsTitle:"활용 팁"
},
acctPerf:{
  ...(ko.acctPerf||{}),
  tabDashboard:"시각화 대시보드",tabDrilldown:"트리구조 계층 분석",tabGuide:"이용 가이드",
  guideTitle:"어카운트 성과 이용 가이드",
  guideSub:"Team/Account Budget Dashboard · Meta Ads Hierarchy 분석 가이드입니다.",
  guideWhereToStart:"어디서 시작하나요?",
  guideWhereToStartDesc:"좌측 메뉴에서 '어카운트 성과'를 선택하세요.",
  guideStepsTitle:"시작 6단계",
  guideStep1Title:"대시보드 접속",guideStep1Desc:"어카운트 성과 메뉴로 이동합니다.",
  guideStep2Title:"기간 설정",guideStep2Desc:"분석할 날짜 범위를 설정합니다.",
  guideStep3Title:"예산 확인",guideStep3Desc:"팀/계정별 예산 현황을 확인합니다.",
  guideStep4Title:"계층 분석",guideStep4Desc:"트리구조로 광고 계층을 분석합니다.",
  guideStep5Title:"성과 비교",guideStep5Desc:"기간별 성과를 비교합니다.",
  guideStep6Title:"데이터 내보내기",guideStep6Desc:"엑셀로 데이터를 내보냅니다.",
  guideTabsTitle:"탭별 기능 안내",
  guideTabDashboardName:"시각화 대시보드",guideTabDashboardDesc:"전체 예산과 성과를 시각화합니다.",
  guideTabDrilldownName:"트리구조 계층 분석",guideTabDrilldownDesc:"광고 계층별 상세 분석을 제공합니다.",
  guideTipsTitle:"활용 팁",
  guideTip1:"주간 단위로 예산 소진율을 확인하세요.",
  guideTip2:"성과가 낮은 캠페인은 즉시 조정하세요.",
  guideTip3:"계층 분석으로 문제 광고를 빠르게 찾으세요.",
  guideFaqTitle:"자주 묻는 질문",
  guideFaq1Q:"데이터가 표시되지 않아요.",guideFaq1A:"Meta Ads 계정 연동 상태를 확인해주세요.",
  guideFaq2Q:"기간 설정이 안 돼요.",guideFaq2A:"시작일이 종료일보다 앞인지 확인해주세요.",
  guideReadyTitle:"시작할 준비가 되셨나요?",guideReadyDesc:"좌측 메뉴에서 어카운트 성과를 선택하세요."
},
channelKpiPage:{
  ...(ko.channelKpiPage||{}),
  tabGoals:"KPI 목표",tabRoles:"역할 배정",tabSetup:"채널 설정",
  tabSns:"SNS 분석",tabContent:"콘텐츠",tabCommunity:"커뮤니티",
  tabTargets:"목표 관리",tabMonitor:"모니터링",tabGuide:"이용 가이드",
  guideTitle:"채널 KPI 이용 가이드",
  guideSub:"어드밴스드 채널 KPI 관리 및 다면 평가 가이드입니다.",
  guideStepsTitle:"시작 6단계",guideTabsTitle:"탭별 기능 안내",guideTipsTitle:"활용 팁",
  guideTip1:"KPI 목표를 분기별로 설정하세요.",
  guideTip2:"채널별 역할을 명확히 배정하세요.",
  guideTip3:"주간 모니터링으로 이상 징후를 조기 발견하세요.",
  guideTip4:"콘텐츠 성과와 KPI를 연계하여 분석하세요.",
  guideTip5:"커뮤니티 참여도를 정기적으로 확인하세요."
},
crm:{
  ...(ko.crm||{}),
  tabCust:"고객 관리",tabAiSeg:"AI 세그먼트",tabManSeg:"수동 세그먼트",
  tabRfm:"RFM 분석",tabGuide:"이용 가이드",
  guideTitle:"고객/CRM 이용 가이드",
  guideSub:"고객 데이터 관리, AI 세그먼트, RFM 분석 가이드입니다.",
  guideStepsTitle:"시작 6단계",guideTabsTitle:"탭별 기능 안내",guideTipsTitle:"활용 팁",
  guideTip1:"고객 데이터를 정기적으로 업데이트하세요.",
  guideTip2:"AI 세그먼트를 활용하여 정밀 타겟팅하세요.",
  guideTip3:"RFM 분석으로 VIP 고객을 식별하세요.",
  guideTip4:"이탈 위험 고객에게 리텐션 캠페인을 실행하세요.",
  guideTip5:"세그먼트별 맞춤 오퍼를 제공하세요."
},
omniChannel:{
  ...(ko.omniChannel||{}),
  tabChannels:"채널 관리",tabProducts:"상품 관리",tabOrders:"주문 관리",
  tabInventory:"재고 관리",tabOverview:"종합 현황",tabGuide:"이용 가이드",
  tabChannelsDesc:"등록 채널 현황 관리",tabProductsDesc:"채널별 상품 관리",
  tabOrdersDesc:"통합 주문 관리",tabInventoryDesc:"재고 동기화",
  tabOverviewDesc:"전체 현황 대시보드",tabGuideDesc:"이용 가이드",
  guideTitle:"옴니채널 이용 가이드",
  guideSub:"다채널 통합 관리 플랫폼 활용 가이드입니다.",
  guideStepsTitle:"시작 6단계",guideTabsTitle:"탭별 기능 안내",guideTipsTitle:"활용 팁",
  guideStep:"시작",guideTip:"팁",
  guideDashName:"종합 현황",guideDashDesc:"전체 채널 현황을 확인합니다.",
  guideFeedName:"상품 피드",guideFeedDesc:"채널별 상품 피드를 관리합니다.",
  guideTrendName:"트렌드",guideTrendDesc:"매출 트렌드를 분석합니다.",
  guideSettingsName:"설정",guideSettingsDesc:"채널 연동 설정을 관리합니다.",
  guideGuideName:"이용 가이드",guideGuideDesc:"상세 이용 가이드를 확인합니다."
},
attrData:{
  ...(ko.attrData||{}),
  tabMtaLabel:"MTA 분석",tabMtaDesc:"멀티 터치 어트리뷰션 분석",
  tabShapleyLabel:"Shapley",tabShapleyDesc:"Shapley 기반 기여도 분석",
  tabMmmLabel:"MMM",tabMmmDesc:"마케팅 믹스 모델링",
  tabMarkovLabel:"Markov",tabMarkovDesc:"마코프 체인 분석",
  tabAbLabel:"A/B 테스트",tabAbDesc:"A/B 테스트 분석",
  tabCohortLabel:"코호트",tabCohortDesc:"코호트 분석",
  tabLtvLabel:"LTV",tabLtvDesc:"고객 생애 가치 분석",
  tabAnomalyLabel:"이상 탐지",tabAnomalyDesc:"이상 데이터 탐지",
  tabCompareLabel:"모델 비교",tabCompareDesc:"어트리뷰션 모델 비교",
  tabGuideLabel:"이용 가이드",tabGuideDesc:"상세 가이드",
  modelCompareTable:"모델 비교 테이블",
  guideTitle:"어트리뷰션 이용 가이드",
  guideSub:"다양한 어트리뷰션 모델을 활용한 채널 기여도 분석 가이드입니다.",
  guideBeginnerBadge:"초급 가이드",guideTimeBadge:"5분 소요",guideLangBadge:"15개 언어",
  guideWhereToStart:"어디서 시작하나요?",
  guideWhereToStartDesc:"좌측 메뉴에서 '어트리뷰션'을 선택하세요.",
  guideStepsTitle:"시작 6단계",guideTabsTitle:"탭별 기능 안내",guideTipsTitle:"활용 팁",
  guideTip1:"MTA와 MMM을 함께 활용하여 교차 검증하세요.",
  guideTip2:"Shapley 분석으로 공정한 기여도를 파악하세요.",
  guideTip3:"코호트 분석으로 고객 행동 패턴을 이해하세요.",
  guideTip4:"이상 탐지로 데이터 품질을 관리하세요.",
  guideTip5:"모델 비교 기능으로 최적 모델을 선택하세요.",
  guideFaqTitle:"자주 묻는 질문",
  guideFaq1Q:"어떤 모델을 선택해야 하나요?",guideFaq1A:"채널 수가 적으면 MTA, 많으면 MMM을 추천합니다.",
  guideFaq2Q:"데이터가 부족해요.",guideFaq2A:"최소 30일 이상의 데이터가 필요합니다.",
  guideReadyTitle:"시작할 준비가 되셨나요?",guideReadyDesc:"좌측 메뉴에서 어트리뷰션을 선택하세요."
},
budgetTracker:{
  ...(ko.budgetTracker||{}),
  tabOverview:"종합 현황",tabAllocation:"예산 배분",tabBurnRate:"소진율",
  tabAlerts:"알림",tabGuide:"이용 가이드",
  guideTitle:"예산 추적 이용 가이드",guideSub:"실시간 광고 예산 소비 및 최적화 추적 가이드입니다."
},
catalogSync:{
  ...(ko.catalogSync||{}),
  tabCatalog:"카탈로그",tabSyncRun:"동기화 실행",tabCategoryMapping:"카테고리 매핑",
  tabStockPolicy:"재고 정책",tabHistory:"변경 이력",tabGuide:"이용 가이드",
  tabPriceRules:"가격 규칙",
  guideTitle:"카탈로그 동기화 이용 가이드",
  guideOverviewDesc:"다채널 상품 카탈로그 동기화 플랫폼 가이드입니다.",
  guideStepsTitle:"시작 단계",guideTabsTitle:"탭별 기능",guideTipsTitle:"활용 팁",
  selectChannelStep:"채널 선택",setPriceStep:"가격 설정",approveRegisterStep:"승인 및 등록",
  guideStep:"단계",guideTip:"팁",guideTips:"활용 팁"
},
orderHub:{
  ...(ko.orderHub||{}),
  tabOverview:"주문 종합",tabOrders:"주문 관리",tabClaims:"클레임",
  tabDelivery:"배송 관리",tabSettlement:"정산",tabIntl:"해외 배송",
  tabB2B:"B2B 주문",tabSettings:"설정",tabRouting:"라우팅",tabGuide:"이용 가이드",
  guideTitle:"주문 허브 이용 가이드",guideSub:"통합 주문 관리 플랫폼 가이드입니다.",
  guideTipsTitle:"활용 팁",guideStep:"단계",guideTip:"팁",
  intlShipGuide:"해외 배송 가이드"
},
webPopup:{
  ...(ko.webPopup||{}),
  guideTitle:"웹 팝업 이용 가이드",guideSub:"웹 팝업 마케팅 도구 활용 가이드입니다.",
  guideStepsTitle:"시작 단계",guideTabsTitle:"탭별 기능",guideTipsTitle:"활용 팁",
  guideStep:"단계",guideTip:"팁"
}
};

// Merge
for(const[k,v]of Object.entries(inject)){
  if(typeof v==='object'&&!Array.isArray(v)){
    ko[k]={...(ko[k]||{}),...v};
  } else {
    ko[k]=v;
  }
}

// Write
const out=`export default ${JSON.stringify(ko,null,2)};\n`;
fs.writeFileSync(f,out,'utf8');
console.log('ko.js: '+Object.keys(ko).length+' sections, '+(Buffer.byteLength(out,'utf8')/1024).toFixed(1)+'KB');
console.log('✅ Korean guide/tab keys injected');
