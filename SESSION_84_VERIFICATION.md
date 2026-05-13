# 84차 검증 결과 (85차 인계용)

## fetch 건수 분포 (33파일)
- 11건: UserManagement.jsx
- 7건: Reconciliation.jsx
- 6건: public/PgTest.jsx
- 5건: EventNorm.jsx
- 3건: AIRecommendTab.jsx, Connectors.jsx, ReviewsUGC.jsx, TierPricingTab.jsx
- 2건: AuthPage.jsx, ChannelKPI.jsx, OrderHub.jsx, WmsManager.jsx
- 1건: 19개 파일

## 상위 7개 파일 useT/fetch 매핑
- AIInsights.jsx: fetch 1건 (84차 #1 미해결, 마이그레이션 5+ 회차 위험)
- AIPrediction.jsx: useT L15 + fetch L29 (1건)
- AIRecommendTab.jsx: useT L9 + fetch L338/L359/L385 (3건, /v422/ai/)
- UserManagement.jsx: fetch 11건 (대규모, 후순위)
- OrderHub.jsx: useT 미사용, fetch L111(GET /api/crm/customers) + L117(POST /api/crm/customers/activities)
- WmsManager.jsx: useT 미사용, fetch L891/L1941 (동일 POST BASE/api/carrier-track, 1941라인 대규모)
- AuthPage.jsx/ChannelKPI.jsx: useT 다중 사용 (8/10 컴포넌트, 복잡)

## 84차 결론
- 단순 dead import 케이스 없음 (75차 #4 패턴 적용 불가)
- 모든 후보 fetch 마이그레이션 동반 필요
- 85차 권장 작업: OrderHub.jsx 우선 (2건, /api/crm/, useT 미사용)

## 84차 신규 교훈
- PowerShell findstr -> Bash grep ':1`$' 자율 변환 발생 (83차 #1 재발)
- CC 자율 cat/Get-Content/grep Read 명령 빈발 (10+ 회), 모두 차단 성공
- dead import 후보 탐색 시 useT/fetch 동시 검증 필수
- SubscriberTabs 패턴 (단일 useT dead import) 재현 불가, 대안 필요

## 84차 master HEAD
- ea8559b (83차 종결과 동일, 코드 변경 없음)
- SESSION_84_VERIFICATION.md 추가 (untracked)
