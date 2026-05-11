# 66차 T-1 fetch 분류 결과 (2026-05-11)

## 작업 범위
- 베이스라인: SESSION_65_T1_BASELINE_counts.txt (56파일 / 207회 fetch)
- 저복잡 추출: SESSION_66_T1_LOWCOMPLEX_35.txt (35파일, 1~2회)
- 디렉터리별 grep: components/ + pages/

## 1. 의도적 직접 fetch 패턴 (표준화 제외, 7건)

| # | 위치 | 패턴 분류 | 사유 |
|---|---|---|---|
| 1 | DashOverview.jsx L154 | 헬스체크 | HEAD method + no-store + AbortSignal.timeout (65차 확인) |
| 2 | errorHandler.js L90 | 유틸리티 래퍼 | fetch(url, fetchOptions) 형태, 다른 파일이 호출 |
| 3 | KakaoChannel.jsx | 로컬 래퍼 함수 내부 | 파일 자체 내 fetch 래퍼 정의 (메신저) |
| 4 | LINEChannel.jsx | 로컬 래퍼 함수 내부 | 동일 (메신저) |
| 5 | OmniChannel.jsx | 로컬 래퍼 함수 내부 | 동일 (메신저, 9회) |
| 6 | WhatsApp.jsx | 로컬 래퍼 함수 내부 | 동일 (메신저, 7회) |
| 7 | InstagramDM.jsx | 로컬 래퍼 함수 내부 | 동일 (메신저) |

→ T-1 범위에서 제외, 표준화 시도 시 우회

## 2. pages/ fetch 패턴 분류 (38파일 / 122회)

| 패턴 | 파일 수 | 대표 파일 | 분류 |
|---|---|---|---|
| fetch(`${API}/v4xx/...`) | ~20 | KrChannel, PriceOpt, EventNorm, AIRecommendTab | API 변수 + 버전 경로 (다수파) |
| fetch('/api/...') | ~10 | AccountPerformance, AlertPolicies, Audit, Connectors | 하드코딩 절대경로 |
| fetch(`${BASE}/api/...`) | ~6 | WmsManager, ReviewsUGC, InfluencerUGC, LicenseActivation | BASE 변수 + /api/ |
| fetch(API(\/...)) | 1 | Reconciliation | 함수형 래퍼 |
| fetch(API+path, ...) | 1 | SmsMarketing | 문자열 연결 |
| 로컬 래퍼 내부 | ~5 | Kakao, LINE, Omni, WhatsApp, Instagram | 이미 표준화됨 (제외) |

## 3. components/ fetch 호출 (7건, B-ext 검증)

| 파일 | 라인 | 패턴 | 분류 |
|---|---|---|---|
| GdprBanner.jsx | L30 | fetch(`${API}/api/gdpr/consent`, ...) | 단순 POST, 전환 용이 |
| InfluencerAIPanel.jsx | L137 | fetch(`${API}/v422/ai/influencer-eval`, ...) | 중복 패턴 (DashInfluencer와) |
| InfluencerAIPanel.jsx | L156 | fetch(`${API}/v422/ai/analyses?...`, ...) | 중복 패턴 |
| DashInfluencer.jsx | L426 | fetch(`${API_BASE}/v422/ai/influencer-eval`, ...) | InfluencerAIPanel과 동일 엔드포인트 |
| DashInfluencer.jsx | L438 | fetch(`${API_BASE}/v422/ai/analyses?...`, ...) | InfluencerAIPanel과 동일 엔드포인트 |
| DashOverview.jsx | L154 | fetch(ep.u, { method: 'HEAD', ... }) | 헬스체크 (제외) |
| EventPopupDisplay.jsx | L174 | fetch("/api/v423/popups/active", ...) | 단순 GET, 전환 용이 |

→ InfluencerAIPanel + DashInfluencer = 동일 엔드포인트 중복 → 공통화 후보

## 4. 표준화 대상 정리

### 고빈도 (~12~20회, 4파일, 52회)
- PriceOpt.jsx (20회) — AUTH(token) 헬퍼 패턴, 일관성 있음
- KrChannel.jsx (12회) — ${API}/v419/kr/ 단일 도메인
- UserManagement.jsx (11회) — 내부 refetch 훅 패턴
- SubscriberTabs.jsx (9회) — ${_API}/api/ 패턴

### 중빈도 (~7~11회)
- SmsMarketing (11회, 문자열 연결 패턴)
- GraphScore (8회)
- AuthContext (8회)
- AIPrediction (7회)
- Reconciliation (7회, 함수형 래퍼 패턴)

### 저빈도 (1~2회, 35파일)
- 상세: SESSION_66_T1_LOWCOMPLEX_35.txt 참조
- 표준화 인프라 검증용 최우선 후보

## 5. API 변수명 불일치 (apiClient 통일 시 정정 대상)
- ${API} (다수파)
- ${API_BASE} (DashInfluencer)
- ${BASE} (Wms/Reviews/Influencer/License UGC)
- ${_API} (SubscriberTabs)
- 절대경로 /api/ (하드코딩 10파일)

→ apiClient.js export 시 단일 변수명 통일 필요

## 6. 67차 첫 표준화 시도 후보 추천

### 1순위: EventPopupDisplay.jsx (1회, components/, 하드코딩)
- 단순 GET 1회
- 하드코딩 절대경로 → apiClient 전환 학습 케이스로 최적
- 회차 ~10

### 2순위: GdprBanner.jsx (1회, components/, 변수 패턴)
- 단순 POST 1회
- ${API} 변수 패턴 → apiClient 변수 통일 검증
- 회차 ~10

### 3순위: AccountPerformance.jsx (1회, pages/, 하드코딩)
- pages/ 첫 표준화 진입
- 회차 ~15

## 7. 67차 인계 체크리스트
- [ ] EventPopupDisplay.jsx 코드 view → fetch 호출 컨텍스트 확인
- [ ] apiClient.js export 형태 결정 (default export vs named export)
- [ ] 첫 표준화 commit 단위 결정 (1파일 1commit vs 묶음)
- [ ] 메신저 5파일 로컬 래퍼 verify (필요 시)