const fs = require('fs');

// ── DemoDataLayer.js 영문화 ──────────────────────────────
let d = fs.readFileSync('src/utils/DemoDataLayer.js', 'utf8');

const demoReplacements = [
  // CRM names → international names
  ['const NAMES = ["김민준", "이서연", "박지호", "최수아", "정우진", "윤지아", "강현서", "조예린", "임도현", "한소희", "오준혁", "서민아", "권태양", "배나연", "신성민", "류지은", "석하은", "문준서", "고유나", "남승현", "황지수", "송민호", "안서현", "홍기범", "노지현", "구민재", "유승아", "진하은", "전민성", "방보람", "마기훈", "낭수진", "공도희", "심재민", "변소연", "원태준", "차민지", "주성찬", "봉은아", "나승훈", "부지원", "탁현후", "소재원", "도지영", "우민찬", "은혜린", "봉준서", "진소아", "원하준", "설민영"];',
   'const NAMES = ["Alex Kim", "Sarah Lee", "James Park", "Emily Choi", "David Jung", "Yuna Chen", "Kevin Kang", "Rachel Jo", "Daniel Lim", "Sofia Han", "Owen Oh", "Grace Seo", "Marcus Kwon", "Lily Bae", "Aaron Shin", "Mia Ryu", "Hannah Seok", "Ethan Moon", "Chloe Ko", "Nathan Nam", "Zoe Hwang", "Lucas Song", "Ava Ahn", "Ryan Hong", "Isabella Noh", "Mason Gu", "Ella Yu", "Noah Jin", "Avery Jeon", "Layla Bang", "Carter Ma", "Nora Nang", "Elijah Gong", "Scarlett Shim", "Hudson Byun", "Aria Won", "Hudson Cha", "Leo Joo", "Victoria Bong", "Jackson Na", "Luna Bu", "Oliver Tak", "Charlotte So", "Liam Do", "Amelia Woo", "Emma Eun", "Benjamin Bong", "Cora Jin", "Wyatt Won", "Stella Seol"];'],
  // CRM segments
  ['const SEGS = ["VIP 구매자", "재구매 유망", "휴면 복귀", "신규 가입", "이탈 위험"];',
   'const SEGS = ["VIP Buyer", "Repurchase Candidate", "Dormant Return", "New Member", "Churn Risk"];'],
  // CRM plan channels
  ['"쿠팡", "네이버", "카카오 선물하기", "자사몰", "11번가"',
   '"Coupang", "Naver", "Kakao Gift", "Own Mall", "11Street"'],
  // CRM segment names
  ['name: "VIP 구매자"', 'name: "VIP Buyer"'],
  ['name: "재구매 유망"', 'name: "Repurchase Candidate"'],
  ['name: "휴면 복귀"', 'name: "Dormant Return"'],
  ['name: "신규 가입"', 'name: "New Member"'],
  ['name: "이탈 위험"', 'name: "Churn Risk"'],
  // Email campaigns
  ['name: "3월 봄 시즌 프로모션"', 'name: "March Spring Season Promotion"'],
  ['name: "VIP 고객 감사 이메일"', 'name: "VIP Customer Appreciation Email"'],
  ['name: "이탈 고객 재활성화"', 'name: "Churned Customer Reactivation"'],
  // Email templates
  ['name: "봄 시즌 세일 배너"', 'name: "Spring Season Sale Banner"'],
  ['category: "프로모션"', 'category: "Promotion"'],
  ['name: "VIP 감사 메시지"', 'name: "VIP Appreciation Message"'],
  ['category: "관계 관리"', 'category: "Relationship"'],
  ['name: "재구매 유도 쿠폰"', 'name: "Repurchase Coupon"'],
  ['category: "리텐션"', 'category: "Retention"'],
  ['name: "신규 가입 환영"', 'name: "New Member Welcome"'],
  ['category: "온보딩"', 'category: "Onboarding"'],
  ['name: "장바구니 이탈 복구"', 'name: "Cart Abandonment Recovery"'],
  ['category: "전환"', 'category: "Conversion"'],
  // Dashboard KPI
  ['top_channel: "쿠팡"', 'top_channel: "Coupang"'],
  // Kakao campaigns
  ['name: "주문 완료 알림톡"', 'name: "Order Confirmation Alimtalk"'],
  ['name: "배송 출발 안내"', 'name: "Shipping Departure Notice"'],
  ['name: "봄 시즌 친구 추가 이벤트"', 'name: "Spring Season Add Friend Event"'],
  // Kakao templates category
  ['category: "주문"', 'category: "Order"'],
  ['category: "배송"', 'category: "Delivery"'],
  ['category: "마케팅"', 'category: "Marketing"'],
  // DEMO_JOURNEYS nodes
  ['name: "장바구니 이탈 복구"', 'name: "Cart Abandonment Recovery"'],
  ['label: "장바구니 이탈"', 'label: "Cart Abandoned"'],
  ['label: "1시간 대기"', 'label: "Wait 1 Hour"'],
  ['label: "이탈 복구 이메일"', 'label: "Recovery Email"'],
  ['subject: "장바구니에 상품이 남아있어요!"', 'subject: "You have items left in your cart!"'],
  ['label: "이메일 클릭했나?"', 'label: "Email Clicked?"'],
  ['label: "쿠폰 알림톡"', 'label: "Coupon Notification"'],
  ['msg_type: "알림톡"', 'msg_type: "Alimtalk"'],
  ['label: "완료"', 'label: "Done"'],
  ['name: "VIP 고객 케어"', 'name: "VIP Customer Care"'],
  ['label: "구매 완료 (LTV > 1M)"', 'label: "Purchase Complete (LTV > 1M)"'],
  ['label: "VIP 감사 이메일"', 'label: "VIP Thank You Email"'],
  ['subject: "VIP 고객님께 감사드립니다"', 'subject: "Thank you, VIP Customer"'],
  ['label: "A/B 테스트"', 'label: "A/B Test"'],
  ['label: "전용 할인 알림"', 'label: "Exclusive Discount Alert"'],
  ['msg_type: "친구톡"', 'msg_type: "Friendtalk"'],
  ['label: "LINE VIP 알림"', 'label: "LINE VIP Notification"'],
  ['name: "신규 가입 온보딩"', 'name: "New Member Onboarding"'],
  ['label: "신규 가입"', 'label: "New Signup"'],
  ['label: "환영 이메일"', 'label: "Welcome Email"'],
  ['subject: "Geniego에 오신 것을 환영합니다!"', 'subject: "Welcome to Geniego!"'],
  ['label: "3일 대기"', 'label: "Wait 3 Days"'],
  ['label: "첫 구매 쿠폰"', 'label: "First Purchase Coupon"'],
  // DEMO_JOURNEY_TEMPLATES
  ['{ id: "tpl1", name: "장바구니 이탈 복구", description: "이탈 고객을 이메일+카카오로 복구", trigger_type: "cart_abandoned", estimated_duration: "3일", nodes_count: 5 }',
   '{ id: "tpl1", name: "Cart Abandonment Recovery", description: "Recover churned customers via email + Kakao", trigger_type: "cart_abandoned", estimated_duration: "3 days", nodes_count: 5 }'],
  ['{ id: "tpl2", name: "신규 가입 온보딩", description: "가입 후 3단계 자동 케어", trigger_type: "signup", estimated_duration: "7일", nodes_count: 4 }',
   '{ id: "tpl2", name: "New Member Onboarding", description: "3-step auto care after signup", trigger_type: "signup", estimated_duration: "7 days", nodes_count: 4 }'],
  ['{ id: "tpl3", name: "VIP 고객 리텐션", description: "VIP 세그먼트 자동 케어", trigger_type: "segment_entered", estimated_duration: "14일", nodes_count: 6 }',
   '{ id: "tpl3", name: "VIP Customer Retention", description: "Auto care for VIP segment", trigger_type: "segment_entered", estimated_duration: "14 days", nodes_count: 6 }'],
  ['{ id: "tpl4", name: "이탈 방지 캠페인", description: "이탈 위험 고객 자동 저지", trigger_type: "churned", estimated_duration: "30일", nodes_count: 7 }',
   '{ id: "tpl4", name: "Churn Prevention Campaign", description: "Auto stop high-risk churn customers", trigger_type: "churned", estimated_duration: "30 days", nodes_count: 7 }'],
  ['{ id: "tpl5", name: "생일 축하 쿠폰", description: "생일 고객 자동 쿠폰 발송", trigger_type: "birthday", estimated_duration: "1일", nodes_count: 3 }',
   '{ id: "tpl5", name: "Birthday Coupon", description: "Auto coupon for birthday customers", trigger_type: "birthday", estimated_duration: "1 day", nodes_count: 3 }'],
  // Email editor blocks
  ['name: "봄 시즌 세일"', 'name: "Spring Season Sale"'],
  ['"🌸 봄 시즌 특별 할인"', '"🌸 Spring Season Special Discount"'],
  ['alt: "봄 배너 이미지"', 'alt: "Spring banner image"'],
  ['"봄을 맞이하여 전 상품 최대 40% 할인 행사를 진행합니다.\\n이 기회를 놓치지 마세요!"',
   '"Enjoy up to 40% off all products this spring.\\nDon\'t miss this opportunity!"'],
  ['"지금 쇼핑하기"', '"Shop Now"'],
  ['"수신거부 | 주소: 서울시 강남구"', '"Unsubscribe | Address: Seoul, Korea"'],
  ['name: "VIP 감사 메시지"', 'name: "VIP Appreciation Message"'],
  ['"💎 VIP 고객님께"', '"💎 To Our VIP Customers"'],
  ['"항상 Geniego Shop을 이용해 주셔서 감사합니다.\\nVIP 고객님께만 드리는 특별한 혜택을 준비했습니다."',
   '"Thank you for always using Geniego Shop.\\nWe have prepared a special benefit exclusively for our VIP customers."'],
  ['"30% 할인"', '"30% Off"'],
  ['"혜택 적용하기"', '"Apply Benefit"'],
  ['"수신거부 | VIP 멤버십 안내"', '"Unsubscribe | VIP Membership Info"'],
];

for (const [from, to] of demoReplacements) {
  d = d.split(from).join(to);
}

fs.writeFileSync('src/utils/DemoDataLayer.js', d, 'utf8');
console.log('DemoDataLayer.js done');

// ── 주요 locale 파일들에서 남은 한국어 주석 제거 ──────────
// campaignConstants.js 영문화
let cc = fs.readFileSync('src/pages/campaignConstants.js', 'utf8');
const ccReplacements = [
  ['// 공통 상수', '// Common constants'],
  ['// 캠페인 유형', '// Campaign types'],
  ['무선 노이즈캔슬링', 'Wireless Noise-Cancelling'],
  ['실리콘 케이스', 'Silicone Case'],
  ['USB-C 케이블', 'USB-C Cable'],
  ['모니터 스탠드', 'Monitor Stand'],
  ['스마트 워치', 'Smart Watch'],
  ['블루투스 스피커', 'Bluetooth Speaker'],
  ['와이어리스 이어폰', 'Wireless Earbuds'],
  ['게이밍 마우스', 'Gaming Mouse'],
  ['기계식 키보드', 'Mechanical Keyboard'],
  ['노이즈캔슬링', 'Noise-Cancelling'],
  ['블루투스', 'Bluetooth'],
  ['화이트', 'White'],
  ['블랙', 'Black'],
  ['실버', 'Silver'],
  ['네이버 쇼핑', 'Naver Shopping'],
  ['카카오 선물하기', 'Kakao Gift'],
  ['11번가', '11Street'],
  ['카카오광고', 'Kakao Ads'],
  ['네이버 검색광고', 'Naver Search Ads'],
  ['와, 공통, 상수', '// constants'],
  ['적용됨', 'applied'],
  ['춘', 'spring'],
];
for (const [from, to] of ccReplacements) {
  cc = cc.split(from).join(to);
}
fs.writeFileSync('src/pages/campaignConstants.js', cc, 'utf8');
console.log('campaignConstants.js done');
