/**
 * translate_batch.cjs
 * Korean → English direct string replacement for large JSX files
 * Targets: SubscriptionPricing.jsx MENU_TREE labels + other large files
 */
const fs = require('fs');
const path = require('path');

// ─── Korean → English label map (for MENU_TREE and data labels) ───────────
const KO_EN_MAP = [
  // Menu sections
  ['🏠 홈', '🏠 Home'],
  ['🚀 AI 마케팅 자동화', '🚀 AI Marketing Automation'],
  ['📣 광고·Channel Analysis', '📣 Ads & Channel Analytics'],
  ['👤 고객·CRM', '👤 Customers & CRM'],
  ['🛒 커머스·물류', '🛒 Commerce & Logistics'],
  ['📊 Analysis·Performance', '📊 Analytics & Performance'],
  ['💳 정산·재무', '💳 Settlements & Finance'],
  ['🤖 자동화·AI', '🤖 Automation & AI'],
  ['🗄️ 데이터·연동', '🗄️ Data & Integrations'],
  ['📁 데이터·연동', '📁 Data & Integrations'],
  ['🔒 관리자·보안', '🔒 Admin & Security'],
  ['🔧 개발자·API', '🔧 Developer & API'],
  ['❓ Help', '❓ Help'],

  // Sub menus - AI Marketing
  ['AI 전략 생성', 'AI Strategy Generator'],
  ['캠페인 관리', 'Campaign Management'],
  ['캠페인 목록', 'Campaign List'],
  ['고객 여정 빌더', 'Customer Journey Builder'],
  ['여정 캔버스', 'Journey Canvas'],
  ['콘텐츠 캘린더', 'Content Calendar'],
  ['콘텐츠 관리', 'Content Management'],
  ['Budget 플래너', 'Budget Planner'],
  ['Budget Settings', 'Budget Settings'],

  // Leaf items - AI Marketing
  ['AI 광고소재', 'AI Ad Creative'],
  ['캠페인 Settings', 'Campaign Settings'],
  ['AI 전략 미리보기', 'AI Strategy Preview'],
  ['이탈·LTV Forecast', 'Churn & LTV Forecast'],
  ['Graph 스코어 · AI', 'Graph Score & AI'],
  ['AI 광고 인사이트', 'AI Ad Insights'],
  ['모델 성능', 'Model Performance'],
  ['콘텐츠 계획', 'Content Planning'],
  ['발행 일정', 'Publish Schedule'],
  ['SNS 연동', 'SNS Integration'],
  ['콘텐츠 Performance', 'Content Performance'],
  ['Budget 배분', 'Budget Allocation'],
  ['지출 Forecast', 'Spend Forecast'],
  ['ROI 계산기', 'ROI Calculator'],
  ['Budget 리포트', 'Budget Report'],

  // Sub menus - Ads & Channel
  ['광고 Performance Analysis', 'Ad Performance Analytics'],
  ['광고 개요', 'Ad Overview'],
  ['마케팅 인텔리전스', 'Marketing Intelligence'],
  ['인텔리전스', 'Intelligence'],
  ['기여도 Analysis', 'Attribution Analysis'],
  ['기여 모델', 'Attribution Model'],
  ['인플루언서 관리', 'Influencer Management'],
  ['인플루언서', 'Influencer'],
  ['🛍️ 디지털 셸프 (SoS Analysis)', '🛍️ Digital Shelf (SoS Analysis)'],
  ['디지털 셸프', 'Digital Shelf'],
  ['🏪 Amazon 리스크 (Account·Buy Box 모니터링)', '🏪 Amazon Risk (Account & Buy Box Monitoring)'],
  ['Amazon 리스크', 'Amazon Risk'],

  // Leaf items - Ads
  ['Channel별 Analysis', 'Channel Analysis'],
  ['Product별 Analysis', 'Product Analysis'],
  ['키워드 Analysis', 'Keyword Analysis'],
  ['경쟁사 Analysis', 'Competitor Analysis'],
  ['트렌드 Analysis', 'Trend Analysis'],
  ['시장 점유율', 'Market Share'],
  ['터치 모델 Settings', 'Touch Model Settings'],
  ['Channel 기여도', 'Channel Attribution'],
  ['ROAS 계산', 'ROAS Calculator'],
  ['전환 경로 Analysis', 'Conversion Path Analysis'],
  ['인플루언서 DB', 'Influencer DB'],
  ['캠페인 연동', 'Campaign Integration'],
  ['정산 관리', 'Settlement Management'],
  ['Search 순위·SoS', 'Search Rank & SoS'],
  ['리스팅 품질 점수', 'Listing Quality Score'],
  ['리뷰 Analysis', 'Review Analysis'],
  ['Account 건강도', 'Account Health'],
  ['정책 준수', 'Policy Compliance'],
  ['리뷰 관리', 'Review Management'],
  ['리스팅 관리', 'Listing Management'],

  // Sub menus - CRM
  ['고객 CRM + AI 세그먼트', 'Customer CRM & AI Segments'],
  ['고객 목록', 'Customer List'],
  ['Email + A/B Test', 'Email & A/B Test'],
  ['Email 템플릿', 'Email Templates'],
  ['Email 캠페인', 'Email Campaigns'],
  ['Kakao Channel', 'Kakao Channel'],
  ['Kakao 템플릿', 'Kakao Templates'],
  ['Kakao 캠페인', 'Kakao Campaigns'],
  ['SMS/LMS 마케팅', 'SMS/LMS Marketing'],
  ['Instagram/Facebook DM', 'Instagram/Facebook DM'],
  ['SNS DM', 'Social DM'],
  ['LINE チャンネル', 'LINE Channel'],
  ['웹팝업·이탈팝업', 'Web Popup & Exit Popup'],
  ['팝업 Settings', 'Popup Settings'],
  ['WhatsApp Business', 'WhatsApp Business'],

  // Leaf items - CRM
  ['고객 DB', 'Customer DB'],
  ['360° 고객 뷰', '360° Customer View'],
  ['태그 관리', 'Tag Management'],
  ['고객 가져오기', 'Import Customers'],
  ['RFM Analysis', 'RFM Analysis'],
  ['AI 세그먼트', 'AI Segments'],
  ['세그먼트 규칙', 'Segment Rules'],
  ['세그먼트 메시지 발송', 'Segment Messaging'],
  ['템플릿 목록', 'Template List'],
  ['Email 에디터', 'Email Editor'],
  ['HTML 가져오기', 'Import HTML'],
  ['발송 캠페인', 'Send Campaign'],
  ['Performance Analysis', 'Performance Analysis'],
  ['수신거부 관리', 'Unsubscribe Management'],
  ['예약 발송', 'Scheduled Send'],
  ['Notification톡', 'Notification Talk'],
  ['친구톡', 'Friend Talk'],
  ['비즈보드', 'Biz Board'],
  ['메시지 발송', 'Send Message'],
  ['발송 Statistics', 'Send Statistics'],
  ['Channel Settings', 'Channel Settings'],
  ['메시지 템플릿', 'Message Templates'],
  ['브로드캐스트', 'Broadcast'],
  ['Account Settings', 'Account Settings'],
  ['문자 발송', 'Send SMS'],
  ['문자 템플릿', 'SMS Templates'],
  ['080 수신거부', '080 Opt-out'],
  ['Instagram DM', 'Instagram DM'],
  ['Facebook DM', 'Facebook DM'],
  ['DM 자동 응답', 'DM Auto Reply'],
  ['DM 캠페인', 'DM Campaign'],
  ['LINE 메시지', 'LINE Message'],
  ['라인 템플릿', 'LINE Templates'],
  ['라인 Channel Settings', 'LINE Channel Settings'],
  ['팝업 에디터', 'Popup Editor'],
  ['이탈 팝업', 'Exit Popup'],
  ['트리거 Settings', 'Trigger Settings'],
  ['팝업 A/B Test', 'Popup A/B Test'],
  ['팝업 Performance', 'Popup Performance'],

  // Sub menus - Commerce
  ['옴니Channel', 'Omni-Channel'],
  ['Channel 관리', 'Channel Management'],
  ['국내 Channel (Coupang/Naver)', 'Domestic Channel (Coupang/Naver)'],
  ['국내 Channel Orders', 'Domestic Channel Orders'],
  ['Orders 허브', 'Orders Hub'],
  ['Orders 조회', 'Order Lookup'],
  ['클레임/반품', 'Claims & Returns'],
  ['배송 추적', 'Delivery Tracking'],
  ['수집 Settings', 'Collection Settings'],
  ['WMS 창고 관리', 'WMS Warehouse Management'],
  ['Stock 관리', 'Inventory Management'],
  ['입고·출고', 'Inbound & Outbound'],
  ['카탈로그 동기화', 'Catalog Sync'],
  ['Product 관리', 'Product Management'],
  ['가격 최적화 (AI)', 'Price Optimization (AI)'],
  ['가격 Settings', 'Price Settings'],
  ['수요 Forecast·자동 발주', 'Demand Forecast & Auto Order'],
  ['수요 Forecast', 'Demand Forecast'],
  ['아시아 물류 허브', 'Asia Logistics Hub'],
  ['아시아 물류', 'Asia Logistics'],
  ['반품 자동화 포털', 'Returns Automation Portal'],
  ['반품 관리', 'Returns Management'],
  ['공급망 가시성', 'Supply Chain Visibility'],
  ['공급망', 'Supply Chain'],
  ['공급업체 포털 (B2B)', 'Supplier Portal (B2B)'],
  ['공급업체', 'Supplier'],

  // Leaf - Commerce
  ['Naver 스마트스토어', 'Naver Smart Store'],
  ['카페24', 'Cafe24'],
  ['일괄 Channel 동기화', 'Batch Channel Sync'],
  ['Orders 목록', 'Order List'],
  ['클레임/반품', 'Claims & Returns'],
  ['클레임 조회', 'Claims Lookup'],
  ['반품 목록', 'Returns List'],
  ['교환 관리', 'Exchange Management'],
  ['배송 현황', 'Delivery Status'],
  ['배송 Notification', 'Delivery Notification'],
  ['배송 엑셀', 'Delivery Excel'],
  ['정산 내역', 'Settlement History'],
  ['월별 정산', 'Monthly Settlement'],
  ['정산 엑셀', 'Settlement Excel'],
  ['Channel별 수집 Settings', 'Per-Channel Collection Settings'],
  ['수집 스케줄', 'Collection Schedule'],
  ['수집 로그', 'Collection Log'],
  ['Stock 현황', 'Inventory Status'],
  ['Stock Notification', 'Stock Alert'],
  ['Stock 조정', 'Inventory Adjustment'],
  ['입고 관리', 'Inbound Management'],
  ['출고 관리', 'Outbound Management'],
  ['로케이션 관리', 'Location Management'],
  ['바코드 스캔', 'Barcode Scan'],
  ['Product 목록', 'Product List'],
  ['일괄 Product 업로드', 'Batch Product Upload'],
  ['Channel Product 동기화', 'Channel Product Sync'],
  ['Product 엑셀 업로드', 'Product Excel Upload'],
  ['가격 관리', 'Price Management'],
  ['가격 규칙', 'Price Rules'],
  ['가격 탄력성', 'Price Elasticity'],
  ['가격 시뮬레이션', 'Price Simulation'],
  ['가격 Recommended', 'Price Recommendations'],
  ['SKU별 수요 Forecast', 'Per-SKU Demand Forecast'],
  ['자동 발주 권고', 'Auto Order Recommendation'],
  ['AI 발주 이력', 'AI Order History'],
  ['Channel별 수요 분포', 'Per-Channel Demand Distribution'],
  ['허브 현황 (6개국)', 'Hub Status (6 Countries)'],
  ['루트 매트릭스', 'Route Matrix'],
  ['관세·규제', 'Customs & Regulations'],
  ['풀필먼트 비교', 'Fulfillment Comparison'],
  ['국내 3PL', 'Domestic 3PL'],
  ['반품 Dashboard', 'Returns Dashboard'],
  ['포털 Settings', 'Portal Settings'],
  ['반품 Analysis', 'Returns Analysis'],
  ['공급망 타임라인', 'Supply Chain Timeline'],
  ['공급사 관리', 'Supplier Management'],
  ['리드타임 Analysis', 'Lead Time Analysis'],
  ['위험 감지', 'Risk Detection'],
  ['공급업체 목록', 'Supplier List'],
  ['견적·발주 관리', 'Quotes & Orders Management'],
  ['자동 발주 Settings', 'Auto Order Settings'],

  // Sub menus - Analytics
  ['퍼포먼스 허브', 'Performance Hub'],
  ['Performance 개요', 'Performance Overview'],
  ['P&L 손익 Analysis', 'P&L Analytics'],
  ['손익 Analysis', 'P&L Analysis'],
  ['AI 인사이트', 'AI Insights'],
  ['인사이트', 'Insights'],
  ['BI 리포트', 'BI Reports'],
  ['리포트 빌더', 'Report Builder'],

  // Leaf - Analytics
  ['Channel별 Performance', 'Per-Channel Performance'],
  ['Product별 Performance', 'Per-Product Performance'],
  ['캠페인별 Performance', 'Per-Campaign Performance'],
  ['코호트 Analysis', 'Cohort Analysis'],
  ['손익 개요', 'P&L Overview'],
  ['Channel별 손익', 'Per-Channel P&L'],
  ['Product별 손익', 'Per-Product P&L'],
  ['손익 트렌드', 'P&L Trend'],
  ['인사이트 피드', 'Insights Feed'],
  ['이상 감지', 'Anomaly Detection'],
  ['자동 리포트', 'Auto Report'],
  ['경쟁사 AI Analysis', 'Competitor AI Analysis'],
  ['커스텀 리포트', 'Custom Report'],
  ['예약 발송 리포트', 'Scheduled Report'],
  ['엑셀 Export', 'Excel Export'],
  ['Dashboard 공유', 'Dashboard Share'],

  // Sub menus - Finance
  ['정산 관리', 'Settlement Management'],
  ['Tax계산서·지급', 'Tax Invoice & Payments'],
  ['지급 정산', 'Payment Settlement'],
  ['요금제 Settings', 'Subscription Settings'],
  ['구독 요금', 'Subscription Plans'],
  ['내 쿠폰', 'My Coupons'],
  ['쿠폰 관리', 'Coupon Management'],
  ['감사 로그', 'Audit Log'],

  // Leaf - Finance
  ['결제 이력', 'Payment History'],
  ['인보이스', 'Invoice'],
  ['Tax계산서', 'Tax Invoice'],
  ['지급 목록', 'Payment List'],
  ['지급 승인', 'Payment Approval'],
  ['지급 엑셀', 'Payment Excel'],
  ['Current Plan', 'Current Plan'],
  ['Upgrade Plan', 'Upgrade Plan'],
  ['보유 쿠폰 목록', 'My Coupon List'],
  ['쿠폰 사용 이력', 'Coupon Usage History'],
  ['로그 조회', 'Log Lookup'],
  ['로그 Export', 'Log Export'],
  ['Channel별 정산', 'Per-Channel Settlement'],
  ['월별 정산', 'Monthly Settlement'],

  // Sub menus - Automation
  ['AI 룰 엔진', 'AI Rule Engine'],
  ['룰 Settings', 'Rule Settings'],
  ['Notification 정책 + 액션 프리셋', 'Alert Policies & Action Presets'],
  ['Notification 정책', 'Alert Policies'],
  ['승인 요청 관리', 'Approval Request Management'],
  ['데이터 되돌리기(Writeback)', 'Data Writeback'],
  ['Start 가이드 (Onboarding)', 'Getting Started (Onboarding)'],

  // Leaf - Automation
  ['AI 정책 Settings', 'AI Policy Settings'],
  ['룰 목록', 'Rule List'],
  ['룰 Test', 'Rule Test'],
  ['Run 로그', 'Execution Log'],
  ['정책 목록', 'Policy List'],
  ['액션 프리셋', 'Action Presets'],
  ['정책 평가', 'Policy Evaluation'],
  ['Notification 로그', 'Alert Log'],
  ['승인 목록', 'Approval List'],
  ['승인/거절', 'Approve/Reject'],
  ['승인 이력', 'Approval History'],
  ['되돌리기 Settings', 'Writeback Settings'],
  ['되돌리기 로그', 'Writeback Log'],
  ['즉시 롤백', 'Immediate Rollback'],
  ['Start 가이드', 'Getting Started Guide'],
  ['Settings 마법사', 'Setup Wizard'],
  ['빠른 Settings', 'Quick Setup'],
  ['튜토리얼', 'Tutorial'],

  // Common patterns
  ['KPI 위젯', 'KPI Widgets'],
  ['실시간 모니터링', 'Real-time Monitoring'],
  ['빠른 링크', 'Quick Links'],
  ['Notification 피드', 'Notification Feed'],
  ['이탈 Forecast', 'Churn Prediction'],
  ['LTV Forecast', 'LTV Prediction'],
  ['구매 확률', 'Purchase Probability'],
  ['Graph 스코어', 'Graph Score'],
  ['AI 광고 인사이트', 'AI Ad Insights'],
  ['터치 모델 Settings', 'Touch Model Settings'],
  ['채널 기여도', 'Channel Attribution'],
  ['Impressions수 / CTR', 'Impressions / CTR'],
  ['Channel 비교', 'Channel Comparison'],

  // Comments in code
  ['/* ① 홈 */', '/* ① Home */'],
  ['/* ② AI 마케팅 자동화 */', '/* ② AI Marketing Automation */'],
  ['/* ③ 광고·Channel Analysis */', '/* ③ Ads & Channel Analytics */'],
  ['/* ④ 고객·CRM */', '/* ④ Customers & CRM */'],
  ['/* ⑤ 커머스·물류 */', '/* ⑤ Commerce & Logistics */'],
  ['/* ⑥ Analysis·Performance */', '/* ⑥ Analytics & Performance */'],
  ['/* ⑦ 정산·재무 */', '/* ⑦ Settlements & Finance */'],
  ['/* ⑧ 자동화·AI */', '/* ⑧ Automation & AI */'],
  ['/* ⑨ 데이터·연동 */', '/* ⑨ Data & Integrations */'],
  ['/* ⑩ 관리자·보안 */', '/* ⑩ Admin & Security */'],
  ['/* ⑪ 개발자·API */', '/* ⑪ Developer & API */'],
  ['/* ⑫ Help */', '/* ⑫ Help */'],
  ['MENU_TREE: 실제 Geniego-ROI Platform 메뉴명칭 as-is', 'MENU_TREE: Geniego-ROI Platform full menu structure'],
  ['Main Menu → 중메뉴 → 하위메뉴 → 최하위메뉴 (4단계)', 'Main Menu → L2 → L3 → L4 (4 levels)'],
];

// ─── Additional replacements for Pricing.jsx ─────────────────────────────
const PRICING_FIXES = [
  // Hard-coded Korean in Pricing.jsx
  ["Account 수 선택", "Select # of Accounts"],
  ["/월", "/mo"],
  ["현재 이용 중인 플랜입니다.", "This is your current plan."],
  ["Enterprise 요금 문의", "Enterprise Pricing Inquiry"],
  ["선택한 주기의 요금 Info가 아직 Register되지 않았습니다.", "Pricing for the selected cycle is not yet available."],
  ["카드", "Card"],
  ["결제 중 Error: ", "Payment Error: "],
  // Dev alert message
  ["플랜: ", "Plan: "],
  ["Account: ", "Account: "],
  ["Amount: ", "Amount: "],
  ["주기: ", "Cycle: "],
  ["VITE_TOSS_CLIENT_KEY Settings 시 실제 결제 진행.", "Payment will proceed when VITE_TOSS_CLIENT_KEY is configured."],
];

function applyReplacements(content, replacements) {
  let result = content;
  for (const [ko, en] of replacements) {
    // Replace all occurrences using split/join for literal strings
    result = result.split(ko).join(en);
  }
  return result;
}

// ─── Process files ─────────────────────────────────────────────────────────
const PAGES_DIR = path.join(__dirname, 'src/pages');

// Process SubscriptionPricing.jsx with MENU_TREE translations
const subscFile = path.join(PAGES_DIR, 'SubscriptionPricing.jsx');
if (fs.existsSync(subscFile)) {
  let content = fs.readFileSync(subscFile, 'utf8');
  const before = content;
  content = applyReplacements(content, KO_EN_MAP);
  if (content !== before) {
    fs.writeFileSync(subscFile, content, 'utf8');
    console.log('✓ SubscriptionPricing.jsx updated');
  } else {
    console.log('- SubscriptionPricing.jsx: no changes');
  }
}

// Process Pricing.jsx with pricing-specific fixes
const pricingFile = path.join(PAGES_DIR, 'Pricing.jsx');
if (fs.existsSync(pricingFile)) {
  let content = fs.readFileSync(pricingFile, 'utf8');
  const before = content;
  content = applyReplacements(content, PRICING_FIXES);
  if (content !== before) {
    fs.writeFileSync(pricingFile, content, 'utf8');
    console.log('✓ Pricing.jsx updated');
  } else {
    console.log('- Pricing.jsx: no changes');
  }
}

console.log('\nDone!');
