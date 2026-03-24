# V304 실행 로드맵 (GENIE_ROI V303 → V304)

본 문서는 **업로드된 GENIE_ROI V303 소스 기준**으로, 귀사 요구사항(메타/틱톡/아마존 광고 + 쿠팡/네이버/카페24 커머스 + 인플루언서 추천)을 놓고
1) **지금 바로 가능한 범위(구현 완료)**  
2) **추가 개발이 필요한 범위(스캐폴딩/모의 기반 포함)**  
3) **필수 정책/권한 설계안(RBAC 템플릿)**  
을 한 번에 정리합니다.

## 1) 요구사항별 “실행 로드맵” (표)

| 도메인 | 요구사항(핵심) | V303 현재 상태 | V304에서 “즉시 사용 가능(구현 완료)” | V304에서 “추가 개발 필요(스캐폴딩/모의 기반)” | 실행 단계(권장) | 산출물 |
|---|---|---|---|---|---|---|
| 커머스(쿠팡) | 주문/상품/재고 수집, 자동 송장/출고, 부분배송, 반품/취소/교환 사유 | V303: 쿠팡 커넥터는 **모의/간략 기반**(실제 HMAC/엔드포인트 미완) | **HMAC 인증 + 실제 Ordersheets(주문) 조회 + 반품/취소/교환 요청 조회 + 사유코드 수집 + splitShipping(부분배송 플래그) 이벤트 발행** | 송장 업로드/업데이트, 상품등록/가격/재고 변경(카테고리별 스키마) 등 “쓰기” API 매핑/검증 | Phase A: 주문/클레임 수집 → Phase B: 자동화(송장/출고) | `providers/coupang.ts`(V304), 주문/클레임 이벤트 스키마 |
| 커머스(카페24) | 주문/클레임 수집, 페이지네이션, 반품/교환 사유, 레이트리밋 준수 | V303: 카페24 커넥터는 OAuth refresh + 기본 호출(모의 포함) | **limit/offset 페이지네이션 기반 주문 수집**, 429 재시도, 토큰 갱신 결과를 applied.tokens로 반환 | 클레임(취소/반품/교환) 엔드포인트는 몰/버전별 상이 → 운영 환경 확인 후 경로 고정/필드 매핑 필요. 상품/가격/재고 “쓰기”는 스키마 매핑 필요 | Phase A: 주문 수집 안정화 → Phase B: 클레임/재고/상품 “쓰기” | `providers/cafe24.ts`(V304), pagination helper |
| 커머스(네이버 스마트스토어) | 인증키 등록만으로 연동, 주문/재고/상품/클레임 | V303: 네이버 커넥터는 **토큰 갱신/호출 구조만 존재** | OAuth refresh + 호출 쉘(프로덕션급 HTTP 클라이언트, 토큰 리프레시/에러/재시도) | SmartStore Commerce API는 파트너 권한/엔드포인트가 환경별로 달라 **실제 엔드포인트/스코프 확정 후 완전 구현 필요** | Phase A: 파트너 API 접근권 확보/스펙 확정 → Phase B: 엔드포인트 고정 구현 | `providers/naver_smartstore.ts`(V304) |
| 광고(메타) | 데이터 수집/성과 분석/캠페인 제어 자동화 | V303: 메타 커넥터는 **스캐폴딩 수준** | 없음(인증/리포트/캠페인 API 완전 구현 필요) | 메타(Marketing API) OAuth, Insights 리포트 파이프라인, 캠페인/광고셋/광고 CRUD, 레이트리밋 처리 | Phase A: 읽기(리포트) → Phase B: 자동화(예산/입찰/중지) | Meta 커넥터 확장(미포함) |
| 광고(틱톡) | 광고/픽셀/리포트 수집 + 자동화 | V303: 미구현 | 없음 | TikTok Ads API(사업자/앱 승인) + OAuth + 리포트/캠페인 제어 | Phase A: 리포트 → Phase B: 제어 | TikTok 커넥터 신규 |
| 광고(아마존 Ads) | SP/SB/SD 리포트 + 캠페인 제어 | V303: `amazon_ads`는 **스캐폴딩** | 없음 | 보고서 비동기 생성/다운로드, 계정/프로파일, 캠페인 제어, 리밋/스로틀링 | Phase A: 리포트 → Phase B: 제어 | Amazon Ads 커넥터 확장 |
| 인플루언서 | 추천(매칭), 성과 수집(콘텐츠/링크), 정산/단가 정책 | V303: 기본 구조는 있으나 “추천/정산 엔진”은 제한적 | 내부 데이터 기반 추천(룰/간단 스코어링) 수준은 구성 가능 | 크리에이터/콘텐츠 외부 데이터 수집(플랫폼별 API/스크레이핑), 계약/정산 워크플로, 브랜드-상품-크리에이터 매칭 모델 | Phase A: 캠페인 운영/정산 → Phase B: 추천 고도화 | 추천/정산 모듈 고도화 |

## 2) V304에서 추가된/강화된 핵심 (3채널: 쿠팡/네이버/카페24)

### 2.1 쿠팡: “실제 프로덕션” 수준으로 마감한 항목
- **HMAC 인증 헤더(CEA …)** 기반 서명 생성/요청  
- **주문(Ordersheets) 조회**: `/v2/providers/openapi/apis/api/v5/vendors/{vendorId}/ordersheets`  
- **반품/취소 요청 조회**(Return/Cancellation Request List Query)  
- **교환 요청 조회**: `/v2/providers/openapi/apis/api/v4/vendors/{vendorId}/exchangeRequests`  
- 주문 응답의 `splitShipping` 등 필드로 **부분배송 플래그**를 이벤트로 노출

### 2.2 카페24: 페이지네이션/레이트리밋/토큰
- `limit/offset` 페이지네이션으로 **대량 주문 수집** 안정화
- 429(Too Many Requests) 및 5xx 재시도(공통 jsonFetch)
- 토큰 갱신 시 `applied.tokens`로 반환 → 워커가 DB 저장(기존 구조 활용)

### 2.3 레이트리밋 정책(플랫폼 전체)
- V303의 단일 프로세스 메모리 기반 throttle을 **DB-backed token bucket**으로 교체  
  - `commerce_rate_limits`(rps/burst) + `commerce_rate_limit_state`(tokens/last_refill_at)로 **멀티 워커/멀티 인스턴스에서도 안전**하게 스로틀

## 3) 필수 정책/권한 설계안 (RBAC 템플릿)

V303 문서의 RBAC(roles / role_permissions) 구조를 그대로 사용하면서, 귀사 조직 구조(마케팅팀/재무팀/광고팀/국내팀/글로벌팀/총괄)로 바로 적용 가능한 템플릿입니다.

### 3.1 권한 네임스페이스(예시)
- `admin:*`
- `billing:read`, `billing:write`
- `commerce:read`, `commerce:write`
- `commerce:coupang:read|write`, `commerce:naver:read|write`, `commerce:cafe24:read|write`
- `ads:read`, `ads:write`, `ads:meta:*`, `ads:tiktok:*`, `ads:amazon:*`
- `influencer:read`, `influencer:write`, `influencer:pay`
- `audit:read`

### 3.2 역할 템플릿(예시)
| 역할 | 주요 권한 | 비고(가드레일) |
|---|---|---|
| 총괄(Admin) | `admin:*` | 모든 설정/승인 |
| 국내팀(운영) | `commerce:*:read`, `commerce:*:write` | “쓰기”는 승인 워크플로 강제 가능 |
| 글로벌팀 | `commerce:read`, `ads:read` | 해외 채널만 write 부여 |
| 마케팅팀 | `ads:read`, `ads:write`, `influencer:*` | 예산 상한/승인선(재무) 연동 |
| 광고팀(퍼포먼스) | `ads:*` | 캠페인 자동화 허용(안전장치 필수) |
| 재무팀 | `billing:*`, `audit:read`, `influencer:pay` | 정산/지급/세금계산서 중심 |
| 읽기전용(Viewer) | `commerce:read`, `ads:read`, `influencer:read` | 외부 대행사 공유용 |

### 3.3 필수 정책(실무에서 “반드시” 필요한 것)
- **승인 정책**: `ads:write`/`commerce:write`는 “승인 필요” 플래그(정책 템플릿)로 통제
- **키 관리 정책**: 채널 인증키는 암호화 저장 + 접근 로그(audit)
- **국내/글로벌 분리**: Tenant 내 “사업부/브랜드” 스코프 분리(프로젝트 단위 권한)

## 4) 경쟁사 대비 포지션(간단 평가)
- **멀티채널 운영(상품/주문/재고/리스팅)**은 Linnworks/ChannelAdvisor/ChannelEngine 같은 상용 솔루션이 “성숙한 커넥터 커버리지”와 운영 노하우가 강점입니다. citeturn1search10turn1search6turn1search1
- GENIE_ROI V304는 **(1) 커머스+광고+인플루언서까지 하나의 이벤트/정책/RBAC로 통합**할 수 있는 구조가 강점이지만, 광고/인플루언서 외부 데이터 커버리지는 아직 확장 여지가 큽니다. (메타/아마존 Ads는 V303에서 스캐폴딩) citeturn1search2turn1search5
- 즉, **한국 3채널(쿠팡/카페24/네이버)을 “깊게”** 가져가고, 귀사 업무흐름(승인/정산/권한)을 플랫폼에 녹이는 방향이면 경쟁력이 커집니다.

