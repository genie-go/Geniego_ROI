const fs = require('fs');

// ReviewsUGC.jsx 치환
let r = fs.readFileSync('src/pages/ReviewsUGC.jsx', 'utf8');

// mock 데이터 영문화
r = r.replace(
  `{ id: 1, channel: "Amazon KR", product: "노이즈캔슬링 헤드폰 XM5", rating: 5, sentiment: "positive", text: "음질이 정말 훌륭합니다. 노이즈캔슬링 최고!", category: "음질", date: "2026-03-03", helpful: 42 }`,
  `{ id: 1, channel: "Amazon KR", product: "Noise-Cancelling Headphones XM5", rating: 5, sentiment: "positive", text: "Exceptional sound quality. Best noise cancelling I've ever used!", category: "Sound Quality", date: "2026-03-03", helpful: 42 }`
);
r = r.replace(
  `{ id: 2, channel: "Coupang", product: "RGB 기계식 키보드 MX", rating: 4, sentiment: "positive", text: "타건감 좋고 RGB도 예쁨. 배송 빠름.", category: "타건감", date: "2026-03-03", helpful: 28 }`,
  `{ id: 2, channel: "Coupang", product: "RGB Mechanical Keyboard MX", rating: 4, sentiment: "positive", text: "Great typing feel and beautiful RGB. Fast delivery.", category: "Typing Feel", date: "2026-03-03", helpful: 28 }`
);
r = r.replace(
  `{ id: 3, channel: "Naver", product: "USB4 7포트 허브 Pro", rating: 2, sentiment: "negative", text: "4K 모니터 연결 시 화면 깜박임 발생. AS 대기 중.", category: "호환성", date: "2026-03-02", helpful: 15 }`,
  `{ id: 3, channel: "Naver", product: "USB4 7-Port Hub Pro", rating: 2, sentiment: "negative", text: "Screen flickering when connecting 4K monitor. Waiting for support.", category: "Compatibility", date: "2026-03-02", helpful: 15 }`
);
r = r.replace(
  `{ id: 4, channel: "Amazon KR", product: "게이밍 마우스 Pro X", rating: 3, sentiment: "neutral", text: "그립감은 좋은데 DPI 소프트웨어가 불안정함.", category: "소프트웨어", date: "2026-03-02", helpful: 9 }`,
  `{ id: 4, channel: "Amazon KR", product: "Gaming Mouse Pro X", rating: 3, sentiment: "neutral", text: "Good grip but DPI software is unstable.", category: "Software", date: "2026-03-02", helpful: 9 }`
);
r = r.replace(
  `{ id: 5, channel: "Coupang", product: "노이즈캔슬링 헤드폰 XM5", rating: 1, sentiment: "negative", text: "박스 훼손된 채로 배송. 환불 요청 중.", category: "배송", date: "2026-03-01", helpful: 31 }`,
  `{ id: 5, channel: "Coupang", product: "Noise-Cancelling Headphones XM5", rating: 1, sentiment: "negative", text: "Package arrived damaged. Refund requested.", category: "Shipping", date: "2026-03-01", helpful: 31 }`
);
r = r.replace(
  `{ id: 6, channel: "11st", product: "RGB 기계식 키보드 MX", rating: 5, sentiment: "positive", text: "사무실에서 쓰기 딱 좋은 키보드. 소음도 적당.", category: "소음", date: "2026-03-01", helpful: 19 }`,
  `{ id: 6, channel: "11st", product: "RGB Mechanical Keyboard MX", rating: 5, sentiment: "positive", text: "Perfect for office use. Just the right amount of noise.", category: "Noise Level", date: "2026-03-01", helpful: 19 }`
);
r = r.replace(
  `{ id: 7, channel: "Amazon KR", product: "포터블 충전기 20K", rating: 4, sentiment: "positive", text: "PD 45W 지원으로 노트북까지 빠르게 충전됨.", category: "성능", date: "2026-02-28", helpful: 37 }`,
  `{ id: 7, channel: "Amazon KR", product: "Portable Charger 20K", rating: 4, sentiment: "positive", text: "PD 45W support charges even laptops quickly.", category: "Performance", date: "2026-02-28", helpful: 37 }`
);
r = r.replace(
  `{ id: 8, channel: "Naver", product: "게이밍 마우스 Pro X", rating: 2, sentiment: "negative", text: "클릭 반응이 두달 만에 이상해짐. 내구성 문제 의심.", category: "내구성", date: "2026-02-28", helpful: 22 }`,
  `{ id: 8, channel: "Naver", product: "Gaming Mouse Pro X", rating: 2, sentiment: "negative", text: "Click response started failing after 2 months. Possible durability issue.", category: "Durability", date: "2026-02-28", helpful: 22 }`
);

// AI reply function
r = r.replace(
  `/* AI 답변 초안 생성 (mock) */\nfunction generateAiReply(review) {\n  if (review.sentiment === "positive") {\n    return \`안녕하세요, 고객님! 😊\\n\\n\${review.product}에 만족해 주셔서 정말 감사합니다. 고객님의 따뜻한 리뷰가 저희 팀에게 큰 힘이 됩니다.\\n\\n앞으로도 더 좋은 제품과 서비스로 보답하겠습니다. 다음에 또 방문해 주세요! 🙏\`;\n  } else if (review.sentiment === "neutral") {\n    return \`안녕하세요, 고객님.\\n\\n\${review.product}를 이용해 주셔서 감사합니다. \${review.category} 관련 불편함을 느끼셨군요.\\n\\n해당 문제는 저희 기술팀에 전달하여 개선하겠습니다. 더 나은 경험을 드리기 위해 최선을 다하겠습니다. 추가 문의는 고객센터(1:1 문의)로 연락 주세요.\`;\n  } else {\n    return \`안녕하세요, 고객님.\\n\\n먼저 \${review.product} 관련하여 불편한 경험을 드려 진심으로 사과드립니다.\\n\\n\${review.category} 문제로 어려움을 겪고 계신 것으로 확인됩니다. 빠른 해결을 위해 전담 CS 담당자가 배정되어 24시간 내로 연락드리겠습니다.\\n\\n고객님의 소중한 피드백 덕분에 더 나은 서비스를 만들 수 있습니다. 불편을 드려 다시 한번 사과드립니다. 🙇\`;\n  }\n}`,
  `/* Generate AI reply draft (mock) */\nfunction generateAiReply(review) {\n  if (review.sentiment === "positive") {\n    return \`Hello! 😊\\n\\nThank you so much for your wonderful review of \${review.product}! Your positive feedback means a great deal to our team.\\n\\nWe'll continue to deliver great products and service. Hope to see you again! 🙏\`;\n  } else if (review.sentiment === "neutral") {\n    return \`Hello,\\n\\nThank you for using \${review.product}. We're sorry to hear you experienced issues with \${review.category}.\\n\\nWe've forwarded this to our technical team for improvement. We'll do our best to provide a better experience. For further inquiries, please contact our support team.\`;\n  } else {\n    return \`Hello,\\n\\nWe sincerely apologize for the inconvenience you experienced with \${review.product}.\\n\\nWe've identified the \${review.category} issue you mentioned. A dedicated CS representative has been assigned and will contact you within 24 hours.\\n\\nYour valuable feedback helps us improve. We are truly sorry for the trouble. 🙇\`;\n  }\n}`
);

// hero desc
r = r.replace('채널별 리뷰 데이터와 AI 감성 분석 · 자동 답변 초안 생성 · 부정 리뷰 CS 에스컬레이션을 통해 고객 불만을 선제적으로 해결합니다.', 
  'Channel review data with AI sentiment analysis · Automated reply drafts · Negative review CS escalation for proactive customer issue resolution.');

// review feed section title
r = r.replace('💬 리뷰 피드', '💬 Review Feed');
r = r.replace('AI 답변 초안 생성 · CS 에스컬레이션 지원', 'AI reply drafts · CS escalation support');

// KPI: 건 → items
r = r.replace("v: `${negCount}건`", 'v: `${negCount} items`');
r = r.replace('`${repliedCount}건`', '`${repliedCount} items`');
r = r.replace('`${MOCK_REVIEWS.length}건 중`', '`out of ${MOCK_REVIEWS.length}`');

// helpful label
r = r.replace('👍 {r.helpful}명 도움됨', '👍 {r.helpful} found helpful');

fs.writeFileSync('src/pages/ReviewsUGC.jsx', r, 'utf8');
console.log('ReviewsUGC.jsx done');
