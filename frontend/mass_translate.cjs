/**
 * mass_translate.cjs
 * 모든 pages/*.jsx 파일의 한국어 UI 텍스트를 영문으로 일괄 치환
 */
const fs = require('fs');
const path = require('path');

// ── 전역 공통 치환 (모든 파일) ──────────────────────────────
const GLOBAL = [
  // UI 공통
  ['저장', 'Save'], ['취소', 'Cancel'], ['삭제', 'Delete'], ['추가', 'Add'],
  ['수정', 'Edit'], ['검색', 'Search'], ['필터', 'Filter'], ['내보내기', 'Export'],
  ['확인', 'Confirm'], ['닫기', 'Close'], ['뒤로', 'Back'], ['다음', 'Next'],
  ['이전', 'Previous'], ['완료', 'Done'], ['시작', 'Start'], ['중지', 'Stop'],
  ['실행', 'Run'], ['적용', 'Apply'], ['초기화', 'Reset'], ['새로고침', 'Refresh'],
  ['로딩 중', 'Loading'], ['오류', 'Error'], ['성공', 'Success'], ['경고', 'Warning'],
  ['정보', 'Info'], ['데이터 없음', 'No data'], ['전체', 'All'],
  // Status
  ['활성', 'Active'], ['비활성', 'Inactive'], ['대기 중', 'Pending'],
  ['완료됨', 'Completed'], ['실패', 'Failed'], ['진행 중', 'In Progress'],
  ['승인됨', 'Approved'], ['거부됨', 'Rejected'], ['만료됨', 'Expired'],
  ['연결됨', 'Connected'], ['연결 끊김', 'Disconnected'],
  // Time
  ['오늘', 'Today'], ['어제', 'Yesterday'], ['이번 주', 'This Week'],
  ['이번 달', 'This Month'], ['최근 7일', 'Last 7 Days'], ['최근 30일', 'Last 30 Days'],
  ['최근 90일', 'Last 90 Days'], ['분기', 'Quarter'], ['반기', 'Half-year'],
  ['연간', 'Annual'], ['월간', 'Monthly'], ['일일', 'Daily'],
  ['전일 대비', 'vs Yesterday'], ['전주 대비', 'vs Last Week'],
  // Channels 
  ['쿠팡', 'Coupang'], ['네이버', 'Naver'], ['카카오', 'Kakao'],
  ['11번가', '11Street'], ['G마켓', 'Gmarket'], ['위메프', 'WeMakePrice'],
  ['인터파크', 'Interpark'], ['롯데ON', 'Lotte ON'],
  ['자사몰', 'Own Mall'], ['카카오 선물하기', 'Kakao Gift'],
  // Metrics
  ['매출', 'Revenue'], ['주문', 'Orders'], ['전환율', 'Conv. Rate'],
  ['클릭률', 'CTR'], ['노출', 'Impressions'], ['클릭', 'Clicks'],
  ['광고비', 'Ad Spend'], ['ROAS', 'ROAS'], ['CPC', 'CPC'], ['CPM', 'CPM'],
  ['수익', 'Profit'], ['비용', 'Cost'], ['예산', 'Budget'],
  ['소진율', 'Burn Rate'], ['달성률', 'Achievement Rate'],
  ['재고', 'Stock'], ['수량', 'Quantity'],
  // Table headers
  ['상품명', 'Product Name'], ['채널', 'Channel'], ['카테고리', 'Category'],
  ['상태', 'Status'], ['날짜', 'Date'], ['금액', 'Amount'], ['합계', 'Total'],
  ['수수료', 'Commission'], ['세금', 'Tax'], ['이익', 'Profit'],
  ['담당자', 'Owner'], ['생성일', 'Created'], ['수정일', 'Updated'],
  // Plans
  ['무료', 'Free'], ['기본', 'Basic'], ['스탠다드', 'Standard'],
  ['프로', 'Pro'], ['엔터프라이즈', 'Enterprise'],
  ['월간 플랜', 'Monthly Plan'], ['연간 플랜', 'Annual Plan'],
  ['플랜 업그레이드', 'Upgrade Plan'], ['현재 플랜', 'Current Plan'],
  // Common UI
  ['설정', 'Settings'], ['도움말', 'Help'], ['로그아웃', 'Logout'],
  ['프로필', 'Profile'], ['계정', 'Account'], ['비밀번호', 'Password'],
  ['이메일', 'Email'], ['이름', 'Name'], ['전화번호', 'Phone'],
  ['주소', 'Address'], ['국가', 'Country'], ['언어', 'Language'],
  ['통화', 'Currency'], ['시간대', 'Timezone'],
  // Notifications
  ['알림', 'Notification'], ['공지', 'Notice'], ['경보', 'Alert'],
  ['읽음', 'Read'], ['안 읽음', 'Unread'],
  // Analysis
  ['분석', 'Analysis'], ['요약', 'Summary'], ['보고서', 'Report'],
  ['대시보드', 'Dashboard'], ['차트', 'Chart'], ['그래프', 'Graph'],
  ['통계', 'Statistics'], ['지표', 'Metric'], ['KPI', 'KPI'],
  ['성과', 'Performance'], ['예측', 'Forecast'], ['추세', 'Trend'],
  // Products
  ['상품', 'Product'], ['판매가', 'Sale Price'], ['원가', 'Cost Price'],
  ['재고량', 'Stock Qty'], ['등록', 'Register'], ['업데이트', 'Update'],
  // Demo
  ['데모 모드', 'Demo Mode'], ['실제 데이터', 'Live Data'],
  ['가상 데이터', 'Virtual Data'], ['테스트', 'Test'],
];

// ── 파일별 특화 치환 ────────────────────────────────────────
const FILE_SPECIFIC = {
  'SubscriptionPricing.jsx': [
    ['구독 요금제', 'Subscription Plans'], ['월 결제', 'Monthly Billing'],
    ['연 결제', 'Annual Billing'], ['개월 무료', 'months free'],
    ['할인', 'Discount'], ['인기', 'Popular'], ['추천', 'Recommended'],
    ['기능 포함', 'Features Included'], ['채널 연동', 'Channel Integration'],
    ['무제한', 'Unlimited'], ['제한 없음', 'No Limit'],
    ['API 호출', 'API Calls'], ['사용자', 'Users'], ['팀원', 'Team Members'],
    ['스토리지', 'Storage'], ['지원', 'Support'], ['우선 지원', 'Priority Support'],
    ['전용 매니저', 'Dedicated Manager'], ['온보딩', 'Onboarding'],
    ['결제 방법', 'Payment Method'], ['카드 결제', 'Card Payment'],
    ['청구서 결제', 'Invoice Payment'], ['자동 갱신', 'Auto Renewal'],
    ['해지', 'Cancel'], ['환불', 'Refund'], ['결제 내역', 'Payment History'],
    ['다음 결제일', 'Next Billing Date'], ['구독 중', 'Subscribed'],
    ['구독 만료', 'Subscription Expired'], ['플랜 변경', 'Change Plan'],
    ['업그레이드', 'Upgrade'], ['다운그레이드', 'Downgrade'],
    ['현재 플랜', 'Current Plan'], ['플랜 비교', 'Compare Plans'],
    ['모든 기능', 'All Features'], ['핵심 기능', 'Core Features'],
    ['고급 기능', 'Advanced Features'], ['베타 기능', 'Beta Features'],
    ['실제 메뉴명칭', 'Menu Labels'], ['그대로', 'as-is'],
    ['대메뉴', 'Main Menu'], ['플랫폼', 'Platform'],
  ],
  'Admin.jsx': [
    ['관리자', 'Admin'], ['관리자 패널', 'Admin Panel'],
    ['사용자 관리', 'User Management'], ['권한 관리', 'Permission Management'],
    ['시스템 설정', 'System Settings'], ['감사 로그', 'Audit Log'],
    ['접근 권한', 'Access Control'], ['역할', 'Role'],
    ['슈퍼 관리자', 'Super Admin'], ['일반 관리자', 'Admin'],
    ['사용자', 'User'], ['게스트', 'Guest'], ['초대', 'Invite'],
    ['계정 정지', 'Suspend Account'], ['계정 활성화', 'Activate Account'],
    ['비밀번호 초기화', 'Reset Password'], ['이메일 인증', 'Email Verification'],
    ['2단계 인증', '2FA'], ['API 키', 'API Key'], ['웹훅', 'Webhook'],
    ['플랜', 'Plan'], ['사용량', 'Usage'], ['한도', 'Limit'],
    ['시스템 상태', 'System Status'], ['서버 상태', 'Server Status'],
    ['데이터베이스', 'Database'], ['캐시', 'Cache'], ['큐', 'Queue'],
    ['배포', 'Deploy'], ['점검', 'Maintenance'], ['백업', 'Backup'],
  ],
  'WmsManager.jsx': [
    ['창고 관리', 'Warehouse Management'], ['입고', 'Inbound'],
    ['출고', 'Outbound'], ['재고 조정', 'Stock Adjustment'],
    ['발주', 'Purchase Order'], ['입고 검수', 'Receiving Inspection'],
    ['피킹', 'Picking'], ['패킹', 'Packing'], ['출하', 'Shipping'],
    ['반품', 'Returns'], ['폐기', 'Disposal'], ['이동', 'Transfer'],
    ['위치', 'Location'], ['빈', 'Bin'], ['랙', 'Rack'],
    ['창고', 'Warehouse'], ['물류 센터', 'Fulfillment Center'],
    ['안전 재고', 'Safety Stock'], ['최소 재고', 'Min Stock'],
    ['최대 재고', 'Max Stock'], ['재고 회전율', 'Inventory Turnover'],
    ['유통기한', 'Expiry Date'], ['FIFO', 'FIFO'], ['LIFO', 'LIFO'],
    ['바코드', 'Barcode'], ['QR코드', 'QR Code'],
    ['모바일 감지', 'Mobile Detection'], ['초기', 'Initial'],
    ['훅', 'Hook'], ['유틸', 'Util'],
  ],
  'Pricing.jsx': [
    ['상수', 'Constant'], ['월간', 'Monthly'], ['개월', 'months'],
    ['연간', 'Annual'], ['할인율', 'Discount Rate'],
    ['기본 요금', 'Base Price'], ['추가 요금', 'Additional Fee'],
    ['총 요금', 'Total Price'], ['부가세', 'VAT'],
    ['무료 체험', 'Free Trial'], ['14일 무료', '14 days free'],
    ['체험 종료', 'Trial Ended'], ['유료 전환', 'Convert to Paid'],
  ],
  'OrderHub.jsx': [
    ['주문 허브', 'Order Hub'], ['주문 목록', 'Order List'],
    ['주문 상세', 'Order Details'], ['주문 번호', 'Order No.'],
    ['주문자', 'Buyer'], ['배송지', 'Shipping Address'],
    ['상품 합계', 'Product Total'], ['배송비', 'Shipping Fee'],
    ['결제 금액', 'Payment Amount'], ['결제 방법', 'Payment Method'],
    ['주문 상태', 'Order Status'], ['배송 상태', 'Shipping Status'],
    ['취소 요청', 'Cancel Request'], ['반품 요청', 'Return Request'],
    ['교환 요청', 'Exchange Request'], ['환불 완료', 'Refund Complete'],
    ['긴급', 'Urgent'], ['해외', 'International'],
    ['다운로드', 'Download'], ['유틸', 'Util'],
    ['로켓배송', 'Rocket Delivery'], ['번가', 'Street'],
  ],
  'ApiKeys.jsx': [
    ['API 키 관리', 'API Key Management'], ['키 생성', 'Generate Key'],
    ['키 이름', 'Key Name'], ['키 값', 'Key Value'],
    ['권한', 'Permissions'], ['읽기', 'Read'], ['쓰기', 'Write'],
    ['만료일', 'Expiry Date'], ['마지막 사용', 'Last Used'],
    ['키 삭제', 'Delete Key'], ['키 재생성', 'Regenerate Key'],
    ['키 비활성화', 'Disable Key'], ['사용량 제한', 'Rate Limit'],
    ['IP 화이트리스트', 'IP Whitelist'], ['웹훅 URL', 'Webhook URL'],
    ['글로벌', 'Global'], ['광고', 'Ads'], ['플랫폼', 'Platform'],
    ['앱', 'App'],
  ],
  'AIRuleEngine.jsx': [
    ['AI 규칙 엔진', 'AI Rule Engine'], ['규칙 생성', 'Create Rule'],
    ['규칙 목록', 'Rule List'], ['규칙 편집', 'Edit Rule'],
    ['조건', 'Condition'], ['액션', 'Action'], ['트리거', 'Trigger'],
    ['필드', 'Field'], ['연산자', 'Operator'], ['값', 'Value'],
    ['규칙 활성화', 'Activate Rule'], ['규칙 비활성화', 'Deactivate Rule'],
    ['실행 횟수', 'Run Count'], ['마지막 실행', 'Last Run'],
    ['우선순위', 'Priority'], ['그룹', 'Group'],
    ['공통', 'Common'], ['학습', 'Learning'],
    ['패턴', 'Pattern'], ['데이터', 'Data'],
  ],
  'EmailMarketing.jsx': [
    ['이메일 마케팅', 'Email Marketing'], ['캠페인 생성', 'Create Campaign'],
    ['수신자', 'Recipients'], ['발신자', 'Sender'],
    ['제목', 'Subject'], ['본문', 'Body'], ['서명', 'Signature'],
    ['템플릿', 'Template'], ['블록', 'Block'],
    ['예약 발송', 'Scheduled Send'], ['즉시 발송', 'Send Now'],
    ['개봉률', 'Open Rate'], ['클릭률', 'Click Rate'],
    ['수신 거부율', 'Unsubscribe Rate'], ['반송율', 'Bounce Rate'],
    ['발송 성공', 'Sent Successfully'], ['발송 실패', 'Send Failed'],
    ['A/B 테스트', 'A/B Test'], ['세그먼트', 'Segment'],
    ['탭', 'Tab'], ['고도화', 'Advanced'], ['통계', 'Statistics'],
  ],
  'LicenseActivation.jsx': [
    ['라이선스 활성화', 'License Activation'], ['라이선스 키', 'License Key'],
    ['활성화 코드', 'Activation Code'], ['라이선스 유형', 'License Type'],
    ['만료일', 'Expiry Date'], ['활성화 완료', 'Activated'],
    ['활성화 실패', 'Activation Failed'], ['라이선스 갱신', 'Renew License'],
    ['채널별', 'By Channel'], ['키', 'Key'], ['발급', 'Issue'],
    ['가이드', 'Guide'], ['광고', 'Ads'],
  ],
  'DataProduct.jsx': [
    ['데이터 상품', 'Data Product'], ['데이터 카탈로그', 'Data Catalog'],
    ['스키마', 'Schema'], ['필드', 'Field'], ['타입', 'Type'],
    ['설명', 'Description'], ['샘플', 'Sample'], ['미리보기', 'Preview'],
    ['색상', 'Color'], ['토큰', 'Token'], ['광고', 'Ads'],
    ['마켓', 'Market'], ['공통', 'Common'],
  ],
  'CreativeStudio.jsx': [
    ['크리에이티브 스튜디오', 'Creative Studio'], ['광고 소재', 'Ad Creative'],
    ['이미지', 'Image'], ['영상', 'Video'], ['배너', 'Banner'],
    ['텍스트', 'Text'], ['버튼', 'Button'], ['로고', 'Logo'],
    ['제목', 'Headline'], ['설명 문구', 'Description'],
    ['CTA', 'CTA'], ['크기', 'Size'], ['형식', 'Format'],
    ['카테고리', 'Category'], ['목록', 'List'],
    ['순서', 'Order'], ['유지', 'Maintain'], ['아이콘', 'Icon'],
  ],
  'SmartConnect.jsx': [
    ['스마트 연동', 'Smart Connect'], ['채널 연동', 'Channel Integration'],
    ['연동 상태', 'Connection Status'], ['연동 설정', 'Integration Settings'],
    ['마스터', 'Master'], ['데이터', 'Data'], ['글로벌', 'Global'],
    ['광고', 'Ads'],
  ],
  'Onboarding.jsx': [
    ['온보딩', 'Onboarding'], ['시작하기', 'Get Started'],
    ['역할 선택', 'Select Role'], ['마케터', 'Marketer'],
    ['개발자', 'Developer'], ['재무', 'Finance'],
    ['커머스', 'Commerce'], ['분석가', 'Analyst'],
    ['조직', 'Organization'], ['팀', 'Team'],
    ['첫 설정', 'Initial Setup'], ['가이드', 'Guide'],
    ['다음 단계', 'Next Step'], ['완료', 'Complete'],
    ['역할별', 'By Role'], ['페르소나', 'Persona'],
    ['정의', 'Definition'], ['광고', 'Ads'],
  ],
  'AIPrediction.jsx': [
    ['AI 예측', 'AI Prediction'], ['예측 모델', 'Prediction Model'],
    ['예측값', 'Predicted Value'], ['실제값', 'Actual Value'],
    ['정확도', 'Accuracy'], ['신뢰도', 'Confidence'],
    ['예측 기간', 'Forecast Period'], ['변수', 'Variable'],
    ['특성', 'Feature'], ['가중치', 'Weight'],
    ['허브', 'Hub'], ['실제', 'Actual'], ['연동', 'Integration'],
  ],
  'OperationsHub.jsx': [
    ['운영 허브', 'Operations Hub'], ['작업 목록', 'Task List'],
    ['작업 상태', 'Task Status'], ['담당자', 'Assignee'],
    ['처리 시간', 'Processing Time'], ['오류 처리', 'Error Handling'],
    ['재처리', 'Reprocess'], ['자동화', 'Automation'],
    ['번가', 'Street'], ['상품', 'Product'], ['관리', 'Management'],
    ['카테고리', 'Category'], ['공급처', 'Supplier'],
  ],
  'DataTrustDashboard.jsx': [
    ['데이터 신뢰', 'Data Trust'], ['데이터 품질', 'Data Quality'],
    ['무결성', 'Integrity'], ['신선도', 'Freshness'],
    ['완전성', 'Completeness'], ['정확성', 'Accuracy'],
    ['일관성', 'Consistency'], ['데이터 소스', 'Data Source'],
    ['플랜', 'Plan'], ['헬퍼', 'Helper'], ['데모', 'Demo'],
    ['모드', 'Mode'], ['배너', 'Banner'],
  ],
  'MarketingIntelligence.jsx': [
    ['마케팅 인텔리전스', 'Marketing Intelligence'],
    ['인사이트', 'Insights'], ['기회', 'Opportunity'],
    ['위험', 'Risk'], ['경쟁사', 'Competitor'],
    ['시장', 'Market'], ['트렌드', 'Trend'],
    ['유틸', 'Util'], ['테크바이브', 'TechVibe'],
    ['테크 언박싱', 'Tech Unboxing'], ['데일리 가젯', 'Daily Gadget'],
  ],
  'AsiaLogistics.jsx': [
    ['아시아 물류', 'Asia Logistics'], ['물류 네트워크', 'Logistics Network'],
    ['배송 경로', 'Shipping Route'], ['예상 도착', 'Est. Arrival'],
    ['인천', 'Incheon'], ['메인 허브', 'Main Hub'],
    ['대한통운', 'Korea Delivery'], ['한국', 'Korea'],
  ],
  'DigitalShelf.jsx': [
    ['디지털 셀프', 'Digital Shelf'], ['진열 위치', 'Shelf Position'],
    ['순위', 'Rank'], ['노출', 'Impression'], ['클릭', 'Click'],
    ['무선 이어폰', 'Wireless Earbuds'], ['블루투스 스피커', 'Bluetooth Speaker'],
    ['번가', 'Street'],
  ],
  'PriceOpt.jsx': [
    ['가격 최적화', 'Price Optimization'], ['추천 가격', 'Recommended Price'],
    ['현재 가격', 'Current Price'], ['최적 가격', 'Optimal Price'],
    ['가격 범위', 'Price Range'], ['탄력성', 'Elasticity'],
    ['경쟁사 가격', 'Competitor Price'], ['가격 변경', 'Price Change'],
    ['로딩 중', 'Loading'], ['등록', 'Register'], ['상품', 'Product'],
  ],
  'CRM.jsx': [
    ['고객 관계 관리', 'CRM'], ['고객 목록', 'Customer List'],
    ['고객 상세', 'Customer Details'], ['세그먼트', 'Segment'],
    ['RFM 분석', 'RFM Analysis'], ['고객 가치', 'Customer Value'],
    ['최근 구매', 'Last Purchase'], ['구매 빈도', 'Purchase Frequency'],
    ['생애 가치', 'Lifetime Value'], ['이탈 위험', 'Churn Risk'],
    ['토큰', 'Token'], ['헬퍼', 'Helper'],
    ['세그멘테이션', 'Segmentation'], ['추천', 'Recommendation'],
  ],
  'Attribution.jsx': [
    ['기여도 분석', 'Attribution Analysis'], ['터치포인트', 'Touchpoint'],
    ['기여 모델', 'Attribution Model'], ['라스트 클릭', 'Last Click'],
    ['퍼스트 클릭', 'First Click'], ['선형', 'Linear'],
    ['시간 감소', 'Time Decay'], ['포지션 기반', 'Position Based'],
    ['데이터 기반', 'Data-Driven'], ['채널 기여도', 'Channel Attribution'],
    ['오가닉', 'Organic'], ['인스타그램', 'Instagram'],
  ],
  'InstagramDM.jsx': [
    ['인스타그램 DM', 'Instagram DM'], ['DM 자동화', 'DM Automation'],
    ['메시지', 'Message'], ['답변', 'Reply'], ['팔로워', 'Follower'],
    ['통합', 'Integration'], ['관리', 'Management'],
    ['페이지', 'Page'], ['입력', 'Input'],
  ],
  'OmniChannel.jsx': [
    ['옴니채널', 'Omni-Channel'], ['채널 마스터', 'Channel Master'],
    ['정의', 'Definition'], ['글로벌', 'Global'], ['일본', 'Japan'],
    ['동남아', 'SE Asia'], ['유럽', 'Europe'],
  ],
  'Connectors.jsx': [
    ['커넥터', 'Connectors'], ['연동 현황', 'Integration Status'],
    ['API 연동', 'API Integration'], ['웹훅', 'Webhook'],
    ['인증', 'Auth'], ['토큰', 'Token'], ['스코프', 'Scope'],
    ['연동 해제', 'Disconnect'], ['재연동', 'Reconnect'],
    ['일', 'Day'], ['시간', 'Hour'], ['필수', 'Required'],
    ['무제한', 'Unlimited'], ['서명', 'Signature'],
  ],
  'KakaoChannel.jsx': [
    ['카카오 채널', 'Kakao Channel'], ['알림톡', 'Alimtalk'],
    ['친구톡', 'Friendtalk'], ['비즈메시지', 'BizMessage'],
    ['발신 프로필', 'Sender Profile'], ['발신 키', 'Sender Key'],
    ['탬플릿', 'Template'], ['승인', 'Approve'],
    ['설정이 저장되었습니다', 'Settings saved'], ['저장', 'Save'],
  ],
  'AlertPolicies.jsx': [
    ['알림 정책', 'Alert Policies'], ['알림 조건', 'Alert Condition'],
    ['알림 채널', 'Alert Channel'], ['발송', 'Send'],
    ['테스트 발송', 'Test Send'], ['정책 생성', 'Create Policy'],
    ['데모 모드', 'Demo Mode'],
  ],
  'ContentCalendar.jsx': [
    ['콘텐츠 캘린더', 'Content Calendar'], ['콘텐츠 등록', 'Add Content'],
    ['예약 발행', 'Schedule Publish'], ['작성중', 'Draft'],
    ['심사중', 'In Review'], ['예약완료', 'Scheduled'],
    ['발행완료', 'Published'], ['취소', 'Cancelled'],
  ],
  'AutoMarketing.jsx': [
    ['자동 마케팅', 'Auto Marketing'], ['자동화 규칙', 'Automation Rule'],
    ['상수', 'Constant'], ['기본값', 'Default'],
    ['컴포넌트', 'Component'], ['내에서', 'within'],
  ],
  'Reconciliation.jsx': [
    ['정산 대사', 'Reconciliation'], ['정산 기간', 'Settlement Period'],
    ['채널 정산', 'Channel Settlement'], ['정산 차이', 'Settlement Diff'],
    ['목록', 'List'], ['기간', 'Period'], ['필터', 'Filter'],
  ],
  'FeedbackCenter.jsx': [
    ['피드백 센터', 'Feedback Center'], ['피드백 제출', 'Submit Feedback'],
    ['버그 리포트', 'Bug Report'], ['기능 요청', 'Feature Request'],
    ['불편사항', 'Complaints'], ['버그', 'Bug'],
    ['사용', 'Usage'], ['상수', 'Constant'],
  ],
  'EventNorm.jsx': [
    ['이벤트 정규화', 'Event Normalization'], ['이벤트 매핑', 'Event Mapping'],
    ['브랜드', 'Brand'], ['헤드폰', 'Headphones'],
    ['원문', 'Original'], ['그대로', 'as-is'],
    ['플랫폼', 'Platform'],
  ],
  'GraphScore.jsx': [
    ['그래프 점수', 'Graph Score'], ['노드', 'Node'], ['엣지', 'Edge'],
    ['관계', 'Relationship'], ['점수', 'Score'],
    ['협업', 'Collaboration'], ['헤드셋', 'Headset'],
  ],
  'Approvals.jsx': [
    ['승인 관리', 'Approvals'], ['승인 요청', 'Approval Request'],
    ['승인 대기', 'Pending Approval'], ['승인 완료', 'Approved'],
    ['승인 거부', 'Rejected'], ['기준', 'Criteria'],
    ['초과', 'Exceeded'], ['일시정지', 'Paused'],
    ['요청', 'Request'],
  ],
  'Audit.jsx': [
    ['감사 로그', 'Audit Log'], ['활동 기록', 'Activity Record'],
    ['허용', 'Allowed'], ['임계값', 'Threshold'],
    ['초과', 'Exceeded'], ['감지', 'Detected'],
  ],
  'KrChannel.jsx': [
    ['국내 채널', 'KR Channels'], ['매월', 'Monthly'],
    ['로켓배송', 'Rocket Delivery'], ['수수료', 'Commission'],
  ],
  'ReturnsPortal.jsx': [
    ['반품 포털', 'Returns Portal'], ['반품 사유', 'Return Reason'],
    ['단순변심', 'Change of Mind'], ['사이즈불량', 'Wrong Size'],
    ['상품불량', 'Product Defect'], ['파손', 'Damaged'],
    ['오배송', 'Wrong Item'],
  ],
  'SupplierPortal.jsx': [
    ['공급업체 포털', 'Supplier Portal'], ['공급업체', 'Supplier'],
    ['신규 공급사', 'New Supplier'], ['발주', 'Purchase Order'],
  ],
  'SupplyChain.jsx': [
    ['공급망', 'Supply Chain'], ['발주', 'Purchase Order'],
    ['주', 'Week'], ['테크부품', 'Tech Components'],
    ['무선 헤드폰', 'Wireless Headphones'],
  ],
  'SmsMarketing.jsx': [
    ['SMS 마케팅', 'SMS Marketing'], ['국내', 'Domestic'],
    ['최대', 'Max'], ['통신망', 'Network'],
    ['알리고', 'Aligo'], ['소규모', 'Small Scale'],
  ],
  'WhatsApp.jsx': [
    ['WhatsApp 연동', 'WhatsApp Integration'],
    ['인증', 'Auth'], ['정보', 'Info'],
    ['선택', 'Select'], ['연결', 'Connect'],
  ],
  'SystemMonitor.jsx': [
    ['시스템 모니터', 'System Monitor'],
    ['분 전', 'min ago'], ['방금', 'just now'],
    ['레이턴시', 'Latency'], ['증가', 'Increase'],
  ],
  'PaymentSuccess.jsx': [
    ['결제 성공', 'Payment Successful'],
    ['결제 정보가 올바르지 않습니다', 'Invalid payment information'],
    ['확인', 'Confirm'],
  ],
  'PaymentFail.jsx': [
    ['결제 실패', 'Payment Failed'],
    ['결제가 취소되었거나 오류가 발생했습니다', 'Payment was cancelled or an error occurred'],
  ],
  'AuthPage.jsx': [
    ['선택하세요', 'Select'], ['관리자가 등록한 최신', 'Latest registered by admin'],
  ],
  'MyCoupons.jsx': [
    ['내 쿠폰', 'My Coupons'], ['개월', 'months'],
    ['년', 'year'], ['사용 가능', 'Available'],
    ['사용됨', 'Used'],
  ],
  'LogoDownload.jsx': [
    ['버전', 'Version'], ['지니', 'Genie'],
    ['데이터 분석', 'Data Analysis'], ['강조형', 'Emphasis'],
  ],
  'Writeback.jsx': [
    ['샘플 상품명', 'Sample Product Name'],
    ['바로 테스트 가능한', 'Ready to test'],
  ],
  'AIPolicy.jsx': [
    ['AI 정책', 'AI Policy'], ['정책', 'Policy'],
    ['문장', 'Sentence'], ['근거', 'Basis'],
    ['수치', 'Metric'], ['요약', 'Summary'],
  ],
  'CampaignManager.jsx': [
    ['억', 'B'], ['만', 'M'],
    ['캠페인', 'Campaign'], ['활성화', 'Activate'], ['승인', 'Approve'],
  ],
  'DemandForecast.jsx': [
    ['수요 예측', 'Demand Forecast'],
    ['수요', 'Demand'], ['예측', 'Forecast'],
    ['무선 노이즈캔슬링', 'Wireless Noise-Cancelling'],
  ],
  'RollupDashboard.jsx': [
    ['세션', 'Session'], ['토큰', 'Token'],
    ['우선', 'Priority'], ['없으면', 'if not exists'], ['데모', 'Demo'],
  ],
  'DeveloperHub.jsx': [
    ['개발자 허브', 'Developer Hub'], ['플랜', 'Plan'],
    ['헬퍼', 'Helper'], ['데모', 'Demo'],
    ['배너', 'Banner'], ['시뮬레이션', 'Simulation'],
  ],
  'HelpCenter.jsx': [
    ['도움말 센터', 'Help Center'], ['메인 컴포넌트', 'Main Component'],
    ['번역', 'Translation'], ['변경', 'Change'],
  ],
  'DbAdmin.jsx': [
    ['데이터베이스 관리', 'DB Admin'], ['실행 중', 'Running'],
    ['초기화', 'Reset'], ['행', 'Row'],
  ],
  'TeamWorkspace.jsx': [
    ['팀 워크스페이스', 'Team Workspace'], ['플랜별 허용', 'Allowed by Plan'],
    ['최대 계정 수', 'Max Accounts'],
  ],
  'SubscriberTabs.jsx': [
    ['구독자 탭', 'Subscriber Tabs'], ['월간', 'Monthly'],
    ['분기', 'Quarter'], ['연간', 'Annual'],
    ['유료회원', 'Paid Member'],
  ],
  'TierPricingTab.jsx': [
    ['단계 요금', 'Tier Pricing'], ['단계', 'Tier'],
    ['메뉴', 'Menu'], ['트리', 'Tree'],
    ['마케팅', 'Marketing'], ['광고', 'Ads'],
  ],
  'MappingRegistry.jsx': [
    ['매핑 레지스트리', 'Mapping Registry'], ['임팩트', 'Impact'],
    ['시뮬레이션', 'Simulation'], ['대상', 'Target'], ['공제', 'Deduction'],
  ],
  'MappingRegistryParts.jsx': [
    ['로컬스토리지', 'LocalStorage'], ['훅', 'Hook'],
    ['초기 데이터', 'Initial Data'], ['월', 'Month'],
  ],
  'PgConfig.jsx': [
    ['결제 게이트웨이', 'Payment Gateway'], ['국내', 'Domestic'],
    ['카드', 'Card'],
  ],
  'LINEChannel.jsx': [
    ['라인 채널', 'LINE Channel'], ['그린', 'Green'],
    ['통계', 'Statistics'], ['카드', 'Card'],
    ['캠페인', 'Campaign'], ['탭', 'Tab'],
  ],
  'AIRecommendTab.jsx': [
    ['AI 추천', 'AI Recommend'], ['다운로드', 'Download'],
    ['유틸', 'Utils'], ['채널별', 'By Channel'], ['광고', 'Ads'],
  ],
  'ImgCreativeEditor.jsx': [
    ['이미지 에디터', 'Image Creative Editor'],
    ['대제목', 'Main Headline'], ['헤드라인', 'Headline'],
    ['임팩트', 'Impact'], ['있는', 'with'],
  ],
  'PixelTracking.jsx': [
    ['픽셀 추적', 'Pixel Tracking'], ['플랜별', 'By Plan'],
    ['구독', 'Subscription'], ['관리자', 'Admin'],
  ],
  'CommerceUnifiedSearch.jsx': [
    ['통합 검색', 'Unified Search'],
    ['채널별', 'By Channel'], ['아이콘', 'Icon'],
  ],
  'DLQ.jsx': [
    ['DLQ 관리', 'DLQ Management'], ['재시도', 'Retry'],
    ['정책에서 최종 실패한 요청이', 'Requests that finally failed from policy'],
    ['최종 실패한', 'Finally Failed'],
  ],
  'RulesEditorV2.jsx': [
    ['규칙 편집기', 'Rules Editor V2'],
    ['를, 어떤 채널 필드로 매핑할까요', 'to which channel field?'],
  ],
  'Settlements.jsx': [
    ['정산', 'Settlements'], ['다운로드', 'Download'],
    ['번가', 'Street'], ['기간', 'Period'],
    ['목록', 'List'], ['필터', 'Filter'],
  ],
  'PerformanceHub.jsx': [
    ['성과 허브', 'Performance Hub'], ['성과', 'Performance'],
    ['지표', 'Metrics'], ['정산', 'Settlement'],
    ['크리에이터', 'Creator'],
  ],
  'ResultSection.jsx': [
    ['결과 섹션', 'Result Section'], ['분석 요약', 'Analysis Summary'],
    ['카드', 'Card'], ['출처', 'Source'],
  ],
  'AIInsights.jsx': [
    ['AI 인사이트', 'AI Insights'], ['인사이트', 'Insights'],
    ['트렌드', 'Trend'], ['차트', 'Chart'], ['채팅', 'Chat'],
  ],
  'CaseStudy.jsx': [
    ['도입 사례', 'Case Study'], ['브랜드', 'Brand'],
    ['레퍼런스', 'Reference'], ['공개', 'Public'],
  ],
  'UserManagement.jsx': [
    ['사용자 관리', 'User Management'], ['월간', 'Monthly'],
    ['분기', 'Quarter'], ['반기', 'Half-year'], ['연간', 'Annual'],
  ],
};

// ── 실행 ──────────────────────────────────────────────────
const pagesDir = path.join(__dirname, 'src/pages');
const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.jsx') || f.endsWith('.js'));

let totalChanged = 0;
for (const f of files) {
  const filePath = path.join(pagesDir, f);
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;

  // Apply global replacements
  for (const [from, to] of GLOBAL) {
    content = content.split(from).join(to);
  }

  // Apply file-specific replacements
  const specific = FILE_SPECIFIC[f];
  if (specific) {
    for (const [from, to] of specific) {
      content = content.split(from).join(to);
    }
  }

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    const korBefore = (original.match(/[\uAC00-\uD7A3]/g) || []).length;
    const korAfter = (content.match(/[\uAC00-\uD7A3]/g) || []).length;
    console.log(`✓ ${f.padEnd(40)} ${korBefore} → ${korAfter} Korean chars`);
    totalChanged++;
  }
}

console.log(`\nTotal files changed: ${totalChanged}`);
