const fs = require('fs');
let text = fs.readFileSync('frontend/src/i18n/locales/ko.js', 'utf8');

text = text.replace(/"icon": "🚀",\s*"label": "마케팅 자동화 AI",\s*"path": "\/auto-marketing",/, 
`"icon": "💎",
                        "label": "통합 AI 캠페인 빌더",
                        "path": "/auto-marketing",`);

text = text.replace(/"desc": "월 예산과 상품 카테고리를 선택하면 AI가 Meta·TikTok·네이버 등에 최적화된 마케팅 전략을 자동 생성하는 AI 자동 마케팅 메뉴입니다. 과거 캠페인 성과·경쟁사 벤치마크·상품 특성 데이터를 수집·정규화하여 채널별 예산 배분과 예상 ROAS를 AI가 산출합니다.",/,
`"desc": "예산과 카테고리를 입력하면 AI가 최적의 매체 믹스를 산출하고 원클릭으로 결제 및 라이브 송출까지 완료하는 강력한 통합 마케팅 빌더입니다.",`);

text = text.replace(/"provides": \[\s*"AI 채널별 예산 배분 추천 \(예: Meta 40%·네이버 30%·TikTok 30%\)",\s*"채널별 예상 ROAS·클릭수·전환수 예측값",\s*"상품 카테고리별 최적 광고 소재 형식 추천",\s*"자동 생성된 캠페인 설정 초안 \(목표·기간·입찰 전략\)",\s*"캠페인 승인 요청 워크플로우 \(관리자 → 편집자\)"\s*\],/,
`"provides": [
                            "AI 매체별 예산 자동 배분 및 파이 차트 시각화",
                            "카테고리별 예상 ROAS 및 전환수 정밀 예측",
                            "원클릭 통합 결재 및 광고 실시간 자동 송출"
                        ],`);

text = text.replace(/"canDo": \[\s*"마케팅 기획에 수 시간이 걸리던 채널 예산 배분을 5분 안에 완료",\s*"AI가 추천한 전략을 즉시 '승인 요청 제출'로 관리자 검토 진행",\s*"캠페인 관리 탭에서 운영 중인 모든 캠페인 상태\(대기\/운영\/정지\) 한눈에 관리",\s*"캠페인 리포트 탭에서 ROAS·전환수·비용 실적 추적"\s*\],/,
`"canDo": [
                            "복잡한 광고 매체 구성을 고민할 필요 없이 단 10초 만에 완수",
                            "파편화된 승인 절차를 제거하고 단일 프로세스로 결제 온보딩",
                            "다양한 중복 메뉴 간의 이동 없이 원스톱 실행"
                        ],`);

text = text.replace(/"how": \[\s*"① 캠페인 설정 탭: 월 예산 입력",\s*"상품 카테고리 선택\(뷰티, 패션, 식품 등\)",\s*"광고 채널 선택\(Meta, TikTok, 네이버 등\)",\s*"'AI 마케팅 전략 자동 생성' 버튼 클릭",\s*"② 미리보기 탭: AI가 채널별 예산 배분·예상 ROAS 표시",\s*"'승인 요청 제출' 클릭",\s*"③ 캠페인 관리 탭: 관리자가 승인\/반려 처리"\s*\],/,
`"how": [
                            "① Step 1: 상품 카테고리를 선택하고 월 총 투자 예산을 입력",
                            "② Step 2: 예측된 전환수와 분배 시뮬레이션 표(Pie Chart)를 검토",
                            "③ Step 3: 즉시 결제 및 송출 리스트로 이동하여 승인 (이후 캠페인 관리 메뉴로 이동)"
                        ],`);

// Now replace "AI Budget Allocator" references specifically if they exist outside of auto-marketing
text = text.replace(/"AI Budget Allocator"/g, '"통합 AI 캠페인 빌더"');
text = text.replace(/"AI 전략 생성기"/g, '"통합 AI 캠페인 빌더"');

fs.writeFileSync('frontend/src/i18n/locales/ko.js', text, 'utf8');
console.log('done patching ko.js');
