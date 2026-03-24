/**
 * patch_hardcoded.cjs
 * Patches specific hardcoded Korean strings in AIPrediction, AIRecommendTab, campaignConstants
 */
const fs = require('fs');
const path = require('path');

const PATCHES = {
  'src/pages/AIPrediction.jsx': [
    // Sub-title
    ['구매확률 · LTV Forecast · 이탈 스코어 · Product Recommend 엔진 · ML 모델 성능',
     'Purchase Probability · LTV Forecast · Churn Score · Product Recommend Engine · ML Model Performance'],
    // Mode badges
    ['🟢 실Time DB', '🟢 Live DB'],
    ['🟡 Demo 시뮬레이션', '🟡 Demo Simulation'],
    ['⚡ 시뮬레이션', '⚡ Simulation'],
    // KPI card labels
    ['{ icon: "👥", label: "Forecast 대상"',
     '{ icon: "👥", label: "Forecast Target"'],
    ['{ icon: "⚠️", label: "이탈 위험"',
     '{ icon: "⚠️", label: "Churn Risk"'],
    ['"즉시 개입 필요"', '"Immediate action needed"'],
    ['{ icon: "💎", label: "고LTV 잠재"',
     '{ icon: "💎", label: "High LTV Potential"'],
    ['"CLV ₩3M 이상"', '"CLV ₩3M+"'],
    ['{ icon: "💰", label: "30일 Forecast Revenue"',
     '{ icon: "💰", label: "30-day Forecast Revenue"'],
    ['"+18% 성장 예상"', '"+18% Growth Expected"'],
    ['{ icon: "⚙️", label: "ML 모델 Accuracy"',
     '{ icon: "⚙️", label: "ML Model Accuracy"'],
    ['"매일 04:00 재학습"', '"Daily retrain at 04:00"'],
    // Tab labels
    ['["ltv", "💰 LTV 세그먼트"]', '["ltv", "💰 LTV Segments"]'],
    ['["graph_score", "🕸️ Graph 스코어"]', '["graph_score", "🕸️ Graph Score"]'],
    ['["model", "⚙️ 모델 성능"]', '["model", "⚙️ Model Performance"]'],
    ['["integration", "🔗 Integration 현황"]', '["integration", "🔗 Integration Status"]'],
    // Loading text
    ['ML 모델에서 Forecast 데이터를 불러오는 in progress...', 'Loading forecast data from ML models...'],
    // Filter options
    ['<option value="all">All 위험도</option>', '<option value="all">All Risk Levels</option>'],
    ['<option value="high">🔴 이탈위험</option>', '<option value="high">🔴 Churn Risk</option>'],
    ['<option value="medium">🟡 in progress간위험</option>', '<option value="medium">🟡 Medium Risk</option>'],
    ['<option value="low">🟢 안전</option>', '<option value="low">🟢 Safe</option>'],
    // Bulk action button
    ['⚡ 이탈위험 일괄 대응', '⚡ Bulk Churn Action'],
    // Table headers
    ['"30일 구매확률"', '"30-day Purchase Prob."'],
    ['"이탈 위험"', '"Churn Risk"'],
    ['"LTV 12개월"', '"LTV 12-month"'],
    ['"Next 구매 Forecast"', '"Next Purchase Est."'],
    // Detail button
    ['→ 상세</button>', '→ Details</button>'],
    // Search empty state
    ['Search 결과 None', 'No results found'],
    // Retry button
    ['<button onClick={loadData}', '<button onClick={loadData}'],
    // Error retry label
    ['>재시도</button>', '>Retry</button>'],
    // Detail panel title
    ['Customer AI Analysis 상세', 'Customer AI Analysis Detail'],
    // Detail tabs
    ['["overview", "개요"]', '["overview", "Overview"]'],
    ['["recommend", "ProductRecommend"]', '["recommend", "Recommendations"]'],
    // Overview fields
    ['"구매 횟Count"', '"Purchases"'],
    ['"마지막 구매"', '"Last Purchase"'],
    ['"누적 LTV"', '"Cumulative LTV"'],
    ['"90일 구매확률"', '"90-day Purchase Prob."'],
    ['"Next 구매 Forecast"', '"Next Purchase Est."'],
    // RFM labels
    ['RFM 스코어', 'RFM Score'],
    ['label="최근성"', 'label="Recency"'],
    ['label="빈도"', 'label="Frequency"'],
    // Detail gauges
    ['30일 구매확률', '30-day Purchase Prob.'],
    ['이탈 위험 스코어', 'Churn Risk Score'],
    // LTV label
    ['만\u003c/div\u003e\r\n                        \u003c/div\u003e\r\n                    ))}\r\n                \u003c/div\u003e\r\n            \u003c/div\u003e\r\n\r\n            {/* Tab */}', 'K</div>\r\n                        </div>\r\n                    ))}\r\n                </div>\r\n            </div>\r\n\r\n            {/* Tab */}'],
    // Customer grade data
    ['챔피언스', 'Champions'],
    ['충성Customer', 'Loyal Customer'],
    ['이탈위험', 'Churn Risk'],
    // Risk labels
    ['🔴 이탈위험', '🔴 Churn Risk'],
    ['🟡 in progress간위험', '🟡 Medium Risk'],
    ['🟢 안전', '🟢 Safe'],
    // LTV tab 명 단위
    ['"명\u003c/span\u003e\u003c/div\u003e"', '"users</span></div>"'],
    // 명 unit in LTV segments
    ['고객\u003c/span\u003e', 'customers</span>'],
    // Max LTV label
    ['"최고 LTV"', '"Max LTV"'],
    // Email campaign alert msg
    ['세그먼트 Email Create Campaign됨', 'segment Email Campaign created'],
    ['Kakao Create Campaign됨', 'Kakao Campaign created'],
    // Action buttons
    ['🎯 웹Popup Popup Integration', '🎯 Web Popup Integration'],
    ['🗺️ Journey 여정 Register', '🗺️ Add to Journey'],
    // Graph score
    ['Graph 스코어\u003c/b\u003e — Customer Connect망 Analysis, 인플루언서 스코어, 구매 영향력 지Count',
     'Graph Score\u003c/b> — Customer Network Analysis, Influencer Score, Purchase Influence Index'],
    ['"네트워크 노드"', '"Network Nodes"'],
    ['"Average Connect 강도"', '"Avg. Connection Strength"'],
    ['"인플루언서 Customer"', '"Influencer Customers"'],
    ['"바이럴 계Count(K)"', '"Viral Coefficient (K)"'],
    ['🏆 Top 10 영향력 Customer', '🏆 Top 10 Influential Customers'],
    ['인플루언서 지Count', 'Influencer Index'],
    // Model tab
    ['All 시스템 점Count', 'System Score'],
    ['학습 스케줄: 매일 04:00 KST Auto 재학习', 'Training Schedule: Daily 04:00 KST Auto-retrain'],
    ['모델 버전:', 'Model Version:'],
    ['마지막 학습:', 'Last Trained:'],
    ['학습 스케줄: 매일 04:00 KST Auto 재학습', 'Training Schedule: Daily 04:00 KST Auto-retrain'],
    // Integration tab
    ['AI Forecast 시스템이 모든 Marketing Channel과 유기적으로 Integration되어 있습니다',
     'AI Forecast system is fully integrated with all Marketing Channels'],
    // Integration cards
    ['"세그먼트 4개 실Time Integration"', '"Real-time sync with 4 segments"'],
    ['"A/B Test + 세그먼트 Integration"', '"A/B Test + Segment Integration"'],
    ['"Notification톡 Auto Send"', '"Notification Auto Send"'],
    ['"이탈 Forecast 기반 Auto화"', '"Churn Forecast Automation"'],
    ['"CRM 세그먼트 타겟팅"', '"CRM Segment Targeting"'],
    ['"판매 Forecast → Stock Integration"', '"Demand Forecast → Inventory Integration"'],
    // Integration card detail items
    ['세그먼트 ${crmSegments.length}개 Share', '${crmSegments.length} segments shared'],
    ['구매이력 Auto 갱신', 'Purchase history auto-updated'],
    ['RFM 스코어 Sync', 'RFM score synced'],
    ['세그먼트 → Campaign Auto Generate', 'Segment → Campaign auto-generated'],
    ['본문 A/B Test', 'Content A/B Test'],
    ['Statistics 유의성 Analysis', 'Statistical significance analysis'],
    ['고위험 → Auto Notification톡', 'High-risk → Auto Notification'],
    ['친구톡 Personal화', 'Personalized Friend Talk'],
    ['이탈 감지 트리거', 'Churn detection trigger'],
    ['이탈 위험 → Auto 여정 Register', 'Churn Risk → Auto journey enrollment'],
    ['구매확률 기반 Quarter', 'Purchase prob.-based segmentation'],
    ['멀티Channel Auto화', 'Multi-channel automation'],
    ['세그먼트 타겟팅 Popup', 'Segment targeting popup'],
    ['이탈의도 감지 Integration', 'Exit intent detection integration'],
    ['Personal화 CTA', 'Personalized CTA'],
    ['30일 Count요 Forecast Integration', '30-day demand forecast integration'],
    ['Stock 부족 사전 Alert', 'Pre-emptive low stock alert'],
    ['Auto 발주 트리거', 'Auto order trigger'],
    // Integration card names
    ['"여정 빌더"', '"Journey Builder"'],
    ['"웹Popup"', '"Web Popup"'],
    // Integration status
    ['● Integration in progress', '● Integrated'],
    // Model card titles
    ['🎯 이탈 Forecast', '🎯 Churn Forecast'],
    ['🛒 구매확률', '🛒 Purchase Probability'],
    ['정밀도', 'Precision'],
    ['커버리지', 'Coverage'],
    ['학습:', 'Trained:'],
    // Recommended action in detail
    ['특per 재방문 할인 제공', 'Offer special return discount'],
    ['맞춤 Product Recommend Email', 'Personalized Product Recommendation Email'],
    // Auto action
    ['✅ ${c.name}님 대상 ${r.message}', '✅ Action completed for ${c.name}: ${r.message}'],
    // Bulk action alert
    ['이탈 위험 Customer Auto Create Campaign (Email + Kakao)',
     'At-risk Customer Campaign Auto-created (Email + Kakao)'],
    ['in progress간 위험', 'Medium Risk'],
    // Graph score KPI items
    ['김민준 (인플루언서 지Count 9.4)', 'Min-jun Kim (Influencer Index 9.4)'],
    ['이Count연 (인플루언서 지Count 8.9)', 'Su-yeon Lee (Influencer Index 8.9)'],
    ['박지훈 (인플루언서 지Count 8.7)', 'Ji-hun Park (Influencer Index 8.7)'],
    ['최예린 (인플루언서 지Count 8.2)', 'Ye-rin Choi (Influencer Index 8.2)'],
    ['정태민 (인플루언서 지Count 7.9)', 'Tae-min Jung (Influencer Index 7.9)'],
    // demo customer names
    ['김지현', 'Ji-hyeon Kim'],
    ['박민Count', 'Min Park'],
    ['이Count진', 'Jin Lee'],
    ['최동혁', 'Donghyeok Choi'],
    ['정애련', 'Aeryeon Jung'],
    ['강태영', 'Taeyoung Kang'],
    ['임채원', 'Chaewon Im'],
    ['유승호', 'Seungho Yoo'],
    ['배소연', 'Soyeon Bae'],
    ['서지훈', 'Jihun Seo'],
    // LTV segments
    ['💎 다이아몬드', '💎 Diamond'],
    ['🥇 골드', '🥇 Gold'],
    ['🥈 실버', '🥈 Silver'],
    ['🥉 브론즈', '🥉 Bronze'],
    ['🌱 신규', '🌱 New'],
    ['VIP 전용 혜택 제공', 'Provide exclusive VIP benefits'],
    ['프리미엄 멤버십 업그레이드', 'Premium membership upgrade'],
    ['골드 업그레이드 유도 Campaign', 'Gold upgrade incentive campaign'],
    ['재구매 인센티브 Email', 'Repurchase incentive email'],
    ['온보딩 시리즈 여정 Start', 'Start onboarding journey series'],
  ],
  'src/pages/campaignConstants.js': [
    // Category labels
    ['💄 뷰티·코스메틱', '💄 Beauty & Cosmetics'],
    ['Domestic외 뷰티 제품 판매', 'Beauty products (domestic & global)'],
    ['스킨케어·메이크업·향Count·헤어케어 등 K-뷰티 제품 브랜드', 'Skincare, makeup, fragrance, haircare K-beauty brands'],
    ['뷰티 브랜드 인스타그램 Ad 전략', 'Beauty brand Instagram ad strategy'],
    ['스킨케어 SNS Marketing Recommend', 'Skincare SNS marketing recommendations'],
    ['코스메틱 타겟팅 Ad 효과', 'Cosmetic targeting ad effectiveness'],
    ['뷰티 틱톡 Ad Budget 배분', 'Beauty TikTok ad budget allocation'],
    ['👗 패션·의류', '👗 Fashion & Apparel'],
    ['Domestic외 패션 제품 판매', 'Fashion products (domestic & global)'],
    ['여성복·남성복·아우터·잡화 등 패션 브랜드', "Women's, men's wear, outerwear, accessories fashion brands"],
    ['패션 브랜드 SNS Ad 전략', 'Fashion brand SNS ad strategy'],
    ['의류 쇼핑몰 Ad Channel Recommend', 'Apparel shopping mall ad channel recommendations'],
    ['패션 인플루언서 Marketing 효과', 'Fashion influencer marketing effectiveness'],
    ['시즌 패션 Ad Budget 배분', 'Seasonal fashion ad budget allocation'],
    ['🛍 생활·잡화', '🛍 General & Household'],
    ['생활용품 커머스', 'Household goods e-commerce'],
    ['주방용품·청소용품·인테리어·생활소품 커머스', 'Kitchen, cleaning, interior, lifestyle goods e-commerce'],
    ['생활용품 Naver Shopping Ad', 'Household goods Naver Shopping ad'],
    ['잡화 Coupang Ad vs Naver 효과 Compare', 'General goods Coupang vs Naver ad comparison'],
    ['홈인테리어 Kakao Ad 전략', 'Home interior Kakao ad strategy'],
    ['생활잡화 Ad Channelper Budget Recommend', 'Household goods per-channel budget recommendations'],
    ['🥗 식품·건강', '🥗 Food & Health'],
    ['식품 및 건강Feature식품 판매', 'Food and health supplement sales'],
    ['건강Feature식품·가공식품·유기농 식품 브랜드', 'Health supplements, processed foods, organic food brands'],
    ['건강Feature식품 Ad Marketing Recommend', 'Health supplement ad marketing recommendations'],
    ['식품 브랜드 유튜브 Ad 효과', 'Food brand YouTube ad effectiveness'],
    ['유기농 식품 SNS Marketing 전략', 'Organic food SNS marketing strategy'],
    ['식품 Coupang Ad vs Naver Shopping Compare', 'Food Coupang vs Naver Shopping comparison'],
    ['📱 전자·IT', '📱 Electronics & IT'],
    ['전자제품 및 IT기기 판매', 'Electronics and IT devices sales'],
    ['스마트폰 액세서리·가전제품·컴퓨터·IT기기 판매', 'Smartphone accessories, home appliances, computers, IT devices'],
    ['전자제품 구글 Ad 효과', 'Electronics Google ad effectiveness'],
    ['IT기기 유튜브 Ad 전략', 'IT devices YouTube ad strategy'],
    ['전자 브랜드 Channelper Budget 배분', 'Electronics brand per-channel budget allocation'],
    ['스마트 기기 Ad Marketing Recommend', 'Smart device ad marketing recommendations'],
    ['🚢 배송대행', '🚢 Freight Forwarding'],
    ['한국에서 해외로 국제특송 배송대행 서비스 (Korea → Overseas International Forwarding)', 'Korea → Overseas international freight forwarding service'],
    ['배송대행 Ad효과', 'Forwarding ad effectiveness'],
    ['해외배송대행 Marketing 전략', 'Overseas forwarding marketing strategy'],
    ['국제특송 SNS Ad', 'International courier SNS ad'],
    ['배송대행 Naver vs 구글 Compare', 'Forwarding Naver vs Google comparison'],
    ['해외배송 키워드 Ad', 'Overseas shipping keyword ad'],
    ['🛒 구매대행', '🛒 Personal Shopping'],
    ['해외에서 한국으로 구매대행 서비스 (Overseas → Korea Purchase & Customs Clearance)', 'Overseas → Korea personal shopping & customs clearance service'],
    ['구매대행 Ad Marketing 전략', 'Personal shopping ad marketing strategy'],
    ['해외직구 대행 SNS Ad', 'Overseas direct purchase SNS ad'],
    ['구매대행 인스타그램 Ad', 'Personal shopping Instagram ad'],
    ['미국직구 대행 키워드 Ad', 'US purchase agent keyword ad'],
    ['✈️ 여행·숨박', '✈️ Travel & Accommodation'],
    ['여행·관광·숨박 서비스', 'Travel, tourism & accommodation services'],
    ['Domestic외 여행 패키지·호텔·항공권·투어·레저 서비스', 'Domestic/overseas travel packages, hotels, flights, tours, leisure'],
    ['여행 Product 구글 Ad 전략', 'Travel product Google ad strategy'],
    ['숨박 메타 Ad 타겟팅', 'Accommodation Meta ad targeting'],
    ['항공권 SearchAd 최적화', 'Flight search ad optimization'],
    ['여행 시즘 SNS Ad Budget 배분', 'Travel season SNS ad budget allocation'],
    ['호텔 인스타그램 Ad 효과', 'Hotel Instagram ad effectiveness'],
    ['💻 디지털·앱', '💻 Digital & Apps'],
    ['SaaS·앱·디지털 콘텐츠', 'SaaS, apps, digital content'],
    ['SaaS 서비스·모바일 앱·디지털 콘텐츠·Subscription 서비스', 'SaaS, mobile apps, digital content, subscription services'],
    ['앱 구글 UAC Ad 전략', 'App Google UAC ad strategy'],
    ['SaaS Marketing Channel Recommend', 'SaaS marketing channel recommendations'],
    ['디지털 서비스 리타겟팅 Ad', 'Digital service retargeting ad'],
    ['앱 설치 Ad Budget 배분', 'App install ad budget allocation'],
    ['Subscription형 서비스 Ad ROI', 'Subscription service ad ROI'],
    ['⚽ 스포츠·레저', '⚽ Sports & Leisure'],
    ['스포츠 및 레저용품 판매', 'Sports and leisure goods sales'],
    ['헬스·요가·아웃도어·스포츠웨어 브랜드', 'Fitness, yoga, outdoor, sportswear brands'],
    ['스포츠 브랜드 Ad Channel Recommend', 'Sports brand ad channel recommendations'],
    ['운동용품 인스타그램 Ad 효과', 'Sports goods Instagram ad effectiveness'],
    ['아웃도어 브랜드 유튜브 Ad', 'Outdoor brand YouTube ad'],
    ['스포츠레저 Ad Budget 배분', 'Sports & leisure ad budget allocation'],
    // Product catalog categories
    ['전자/음향', 'Electronics/Audio'],
    ['전자/입력장치', 'Electronics/Input'],
    ['전자/주변기기', 'Electronics/Peripherals'],
    ['전자/카메라', 'Electronics/Camera'],
    ['전자/충전', 'Electronics/Charging'],
    // CAT_TO_PRODUCT keys (these are value strings)
    ["'뷰티/스킨케어'", "'Beauty/Skincare'"],
    ["'뷰티/메이크업'", "'Beauty/Makeup'"],
    ["'패션/의류'", "'Fashion/Apparel'"],
    ["'패션/잡화'", "'Fashion/Accessories'"],
    ["'식품/건강식품'", "'Food/Health'"],
    ["'생활/주방용품'", "'Household/Kitchen'"],
    ["'여행/숨박'", "'Travel/Accommodation'"],
    ["'여행/항공'", "'Travel/Aviation'"],
    ["'여행/투어'", "'Travel/Tours'"],
    ["'디지털/앱'", "'Digital/Apps'"],
    ["'디지털/SaaS'", "'Digital/SaaS'"],
    ["'디지털/콘텐츠'", "'Digital/Content'"],
    ["'스포츠/운동용품'", "'Sports/Equipment'"],
  ],
  'src/pages/AIRecommendTab.jsx': [
    // Page title & subtitle
    ['🤖 AI Marketing Recommend & Auto화 엔진', '🤖 AI Marketing Recommend & Automation Engine'],
    ['Search 한 번으로 최적 Channel·Budget·Ads 소재를 Claude AI가 Auto Analysis합니다',
     'Claude AI analyzes optimal Channels, Budgets, and Ad creatives in one search'],
    // Product info section title
    ['📦 판매 Product Info 입력', '📦 Sales Product Info'],
    // Catalog auto label
    ['카탈로그 Auto Aggregate', 'Catalog Auto-filled'],
    // Form field labels
    ["['월 판매 Goal', 'monthlyQty', '개']", "['Monthly Sales Goal', 'monthlyQty', 'units']"],
    ["['Average 단가', 'avgPrice', '원']", "['Avg. Unit Price', 'avgPrice', '₩']"],
    ["['마진율', 'marginRate', '%']", "['Margin Rate', 'marginRate', '%']"],
    // Sales channel label
    ['주요 판매 Channel (복Count Select)', 'Main Sales Channels (multi-select)'],
    // Search placeholder
    ['예: "${SUGGESTIONS[0]}" 또는 원하는 Marketing Goal를 입력하세요',
     'e.g. "${SUGGESTIONS[0]}" or enter your marketing goal'],
    // Loading
    ['"${searchQ}" — ${cat.label} 최적 Channel·Budget·소재를 Analysis합니다',
     '"${searchQ}" — Analyzing optimal Channels, Budgets & Creatives for ${cat.label}'],
    ['Claude AI → 전문가 지식 베이스 순으로 최적 데이터를 Count집합니다',
     'Claude AI → Expert knowledge base: gathering optimal data'],
    // Banner SVG button text (escaped unicode)
    ['\\u2B07 PNG \\uC800\\uC7A5', '⬇ Save PNG'],
    ['\\uD83D\\uDD04 \\uC7AC\\uC0DD\\uC131', '🔄 Regenerate'],
    // Budget panel labels (unicode escaped)
    ['\\uc6d4\\uac04 \\ucd94\\ucc9c \\uc608\\uc0b0', 'Monthly Recommended Budget'],
    ['\\u270f\\ufe0f \\uc218\\uc815', '✏️ Edit'],
    ['\\uc5f0\\uac04 \\ucd94\\ucc9c \\uc608\\uc0b0', 'Annual Recommended Budget'],
    ['\\u00d7 \\uc790\\ub3d9', '× Auto'],  // ×12 auto
    ['\\uc608\\uc0c1 ROAS', 'Expected ROAS'],
    ['\\uc6d0\\ubcf8:', 'Original:'],
    ['\\ub418\\ub3cc\\ub9ac\\uae30', 'Reset'],
    // Channel bar card
    ['\\uC6D4', 'Monthly'],
    ['\\u00b7 \\uD6A8\\uACFC ', '· Effectiveness '],
    ['\\uC810', 'pts'],
    // Ad content
    ['신청하기', 'Apply Now'],
    ['자세히 보기', 'Learn More'],
    ['\\uAD11\\uACE0\\uC774\\uBBF8\\uC9C0', 'ad_image'],
    ['배송대행', 'Forwarding'],
    ['\\uC9C0\\uAE08 \\uC2DC\\uC791', 'Start Now'],
    ['\\uC9C0\\uAE08 \\uBC14\\uB85C \\uC2E0\\uCCAD', 'Apply Now'],
    ['\\uD3EC\\uD568', 'included'],
    // Tips label
    ['\\uD83D\\uDCA1 \\uC6B4\\uC601 \\uD301:', '💡 Tip:'],
    // Ad creative button label
    ['광고이미지.png', 'ad_image.png'],
    // Suggestions from cat
    ['${cat.label} Channelper Budget 배분', '${cat.label} per-channel budget allocation'],
    ['${cat.label} SNS Ads 전략', '${cat.label} SNS ads strategy'],
    ['${cat.label} Ads 효율 극대화', '${cat.label} maximize ad efficiency'],
  ],
};

function applyPatches(content, patches) {
  let result = content;
  for (const [from, to] of patches) {
    result = result.split(from).join(to);
  }
  return result;
}

const BASE = path.join(__dirname);

for (const [relPath, patches] of Object.entries(PATCHES)) {
  const filePath = path.join(BASE, relPath);
  if (!require('fs').existsSync(filePath)) { console.log(`SKIP (not found): ${relPath}`); continue; }
  let content = fs.readFileSync(filePath, 'utf8');
  const before = content;
  content = applyPatches(content, patches);
  if (content !== before) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✓ ${relPath}`);
  } else {
    console.log(`- ${relPath}: no changes`);
  }
}
console.log('\nDone!');
