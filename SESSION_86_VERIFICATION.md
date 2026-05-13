# 86th 세션 검증 (defc22c 기준)

## 86th 완료 커밋 (11개)

| # | 커밋 | 파일 | 교체 수 | 비고 |
|---|------|------|---------|------|
| 1 | 963deaa | AIPrediction.jsx | 5 (GET×4, POST×1) | apiFetch 헬퍼 삭제, useT/API 제거 |
| 2 | 1b25a49 | AIInsights.jsx | 1 (POST) | postJson, genie_auth_token 호환 확인 |
| 3 | 39bc673 | AdvertisingPerformance.jsx | 1 (GET) | getJson, useT 제거 |
| 4 | 780abb5 | AlertPolicies.jsx | 1 (POST) | postJsonAuth, credentials:include → 토큰 기반으로 전환, useT 제거 |
| 5 | ca711c0 | AuthPage.jsx | 2 (GET×2) | getJson, public-plans (무인증) |
| 6 | 59dcc27 | InstagramDM.jsx | 5 (GET×3, POST×2) | apiFetch 헬퍼 삭제, const API 제거 |
| 7 | b0c569e | LINEChannel.jsx | 4 (GET×4) | makeAPI factory 삭제, getJson |
| 8 | e327a33 | OmniChannel.jsx | 8 (GET×4, POST×4) | apiFetch 헬퍼 삭제, const API 제거 |
| 9 | 6e31712 | PaymentSuccess.jsx | 1 (POST) | postJson, useAuth token 호환 확인 |
| 10 | 03d94d4 | PerformanceHub.jsx | 1 (GET) | getJsonAuth, const headers 제거 |
| 11 | defc22c | Pricing.jsx | 1 (GET) | getJson, public-plans (무인증) |

## 86th 유지 결정 파일 (교체 불가 사유)

| 파일 | 사유 |
|------|------|
| WmsManager.jsx | r.ok HTTP 상태 체크 필수 (L906, L1949) |
| CatalogSync.jsx | r.ok HTTP 상태 체크 필수 (L303-304) |
| AccountPerformance.jsx | AbortController + r.ok 혼용 |
| Audit.jsx | "token" localStorage 키 - apiClient defaultHeaders 불일치 |
| ChannelKPI.jsx | credentials:include + API=/api 상대경로 패턴 |
| AIRecommendTab.jsx | credentials:include + API 변수 미선언 |
| EventNorm.jsx | r.ok HTTP 상태 체크 필수 (L399-401, L414, L432) |
| GraphScore.jsx | g_token 커스텀 키 - apiClient 미지원 |
| KakaoChannel.jsx | authorizedAPI prop drilling factory 패턴 |
| MarketingIntelligence.jsx | VITE_API_BASE 없는 순수 상대경로 (/v422/...) |

## 87th 우선순위 (미완료 잔존)

### 검토 미완료 (fetch 잔존 확인 필요)
- Reconciliation.jsx - 7개 (credentials:include 혼재, 검토 중단)
- ReviewsUGC.jsx
- RollupDashboard.jsx
- Settlements.jsx
- SmsMarketing.jsx
- TierPricingTab.jsx
- UserManagement.jsx
- WhatsApp.jsx
- public/PgTest.jsx
- public/PricingPublic.jsx
- Connectors.jsx (3개, 검토 완료이나 미교체)

### 참고: grep 명령으로 잔존 목록 재확인
```
git grep -l "fetch(" -- "frontend/src/pages/*.jsx"
```

## 86th 교훈
- apiFetch/makeAPI 로컬 헬퍼 패턴은 대부분 apiClient.getJson/postJson으로 직접 교체 가능
- r.ok HTTP 상태 체크가 있는 경우 교체 불가 (apiClient은 내부 throw만 함)
- credentials:include 사용 파일은 인증 방식 변경 위험 → 유지
- genie_token 외 커스텀 키(g_token, token) 사용 파일은 유지
- apiClient.defaultHeaders(): genie_token → accessToken → genie_auth_token 순서로 fallback
