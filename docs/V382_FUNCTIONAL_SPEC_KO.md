# GENIE_ROI V382 통합 기능명세서 (초보자용 + 운영/권한/리스크 포함)

> 목표: V374~V381에서 존재하던 기능을 **중복 제거 + 최신 아키텍처(FastAPI + React + IaC)로 단일 통합**하고,
> 특히 V374~V376의 핵심인 **커머스 운영(커넥터 증분동기화/승인/리포트/정산연계/거버넌스)** 를 V382 런타임에 완전 통합한다.

---

## 1. 플랫폼 한 줄 설명 (비전/역할)

GENIE_ROI는 **여러 오픈마켓/자사몰/광고/소셜 채널에 흩어진 데이터를 표준화**하고,
그 결과로 **상품등록(Write-back)과 운영 자동화(재고/가격/정산/리포트)를 “정책·권한·감사”까지 포함해 안전하게 실행**하는 커머스 운영 플랫폼이다.

---

## 2. V382에서 “완전 통합”되는 레이어

### 2.1 데이터 수집(읽기)
- 주문/매출/반품/클레임/정산(오픈마켓 & 결제)
- 상품/카탈로그/재고/가격
- 광고(Spend/ROAS/전환)
- 리뷰/UGC/디지털쉘프(노출/평점/부정 이슈)

### 2.2 데이터 표준화(정규화)
- 테넌트(회사) 단위 스키마
- 채널별 필드 → 내부 Canonical 모델(Product, Order, Settlement 등)

### 2.3 거버넌스(권한·승인·감사)
- RBAC(역할 기반 권한)
- 승인(승인 워크플로 + 정책 게이트)
- 감사로그(Audit log)
- 금지 데이터 저장 금지 정책

### 2.4 Write-back(쓰기, 상품등록/수정)
- 채널별 payload mapping(카테고리/옵션/필수값)
- 정책 사전검증(금칙어, 제한 카테고리, PII 위험)
- 승인 후에만 게시(특히 Amazon)

---

## 3. 채널별 “자동화 범위/승인 필수/저장 금지” 정책

### 3.1 자동화 단계(Phase)
- **Phase 0**: 템플릿/피드 자동 생성 + 사전검증 (최종 업로드/게시 = 사람)
- **Phase 1**: 초안 자동 생성 + 승인 워크플로 + 제한적 자동 게시
- **Phase 2**: 재고/가격/옵션 동기화(운영 자동화) + 큐/재시도/보상(Saga)
- **Phase 3**: 현지화/SEO/광고 연계(캠페인 자동 생성은 Human-in-the-loop 기본)

### 3.2 채널별 권장 단계 (초기 런칭 기준)
| 채널 | 권장 시작 단계 | 승인이 항상 필요한 항목 | 자동화 금지/제한 |
|---|---:|---|---|
| Shopify | Phase 1→2 | 대규모 가격 변경(예: 10%↑ 이상) | 고객 PII 접근(별도 권한 필요) |
| Amazon (SP-API) | Phase 0→1 | publish, 카테고리/브랜드/속성 변경 | 정책 고위험 카테고리(의약/건기식 등) 자동 publish 금지 |
| Qoo10 | Phase 0→1 | publish, 옵션/가격 변경 | 채널 정책 변경 대응 전 자동화 확장 금지 |
| Rakuten | Phase 0→1 | publish, 카테고리 매핑 변경 | 특정 필수 문구/규격 미충족 시 게시 금지 |
| Meta/TikTok Ads | Phase 1(생성은 승인) | 소재/타게팅/예산 변경 | 개인식별정보 기반 타게팅 데이터 저장 금지 |

### 3.3 절대 저장 금지(보안/정책)
- **토큰 원문/리프레시 토큰**: DB에 저장 금지. `secrets_ref`(KeyVault/SSM/KMS reference)만 저장.
- **민감한 개인식별정보(PII)**: 최소 수집 원칙. 주문 데이터도 보존 기간/마스킹/암호화 정책 적용.
- **성별/연령/지역**: 가능한 경우에도 “개인 단위” 저장 금지. 플랫폼이 제공하는 **집계 인사이트 범위 내**에서만 활용.

---

## 4. 실패 시 재시도/보상(Saga) 시나리오

### 4.1 공통 원칙
- 모든 write-back은 **Idempotency Key** 필수(중복등록 방지).
- 비동기 큐 처리: `queued → running → success/failed`
- 실패는 채널별로 “부분 성공”이 발생할 수 있으므로, 보상 트랜잭션(rollback)이 필요.

### 4.2 대표 시나리오
1) **이미지 업로드 성공, 상품 생성 실패**
- 재시도: 생성만 재시도
- 보상: 불필요 이미지 리소스 삭제(가능하면), 아니면 TTL 만료로 정리

2) **옵션(variant) 일부만 반영**
- 재시도: 누락된 옵션만 패치
- 보상: 옵션 구조 변경이 정책상 위험하면 “승인 재요청”으로 전환

3) **레이트리밋/일시 장애**
- 재시도: exponential backoff + jitter
- 임계치 초과: status=failed로 전환, 운영자 알림

4) **정책 위반 감지**
- 즉시 중단: 승인/게시 진행 금지
- policy_finding 기록 + 승인 요청 타입을 “legal_review”로 변경

---

## 5. 권한(RBAC) 템플릿 (대행사/제조사/유통사)

> 실제 고객 운영에서 가장 중요한 “누가 무엇을 할 수 있는가”를 표준 템플릿으로 제공한다.

### 5.1 공통 역할 정의
- **Viewer**: 조회만 가능(리포트/대시보드)
- **Editor**: 상품/콘텐츠 초안 작성, 동기화 실행 요청
- **Manager**: 승인(approve/reject), 정산/가격 정책 승인
- **Legal**: 정책 고위험 항목의 최종 승인
- **Admin**: 커넥터 설정, 사용자/권한 관리, 보안 설정

### 5.2 제조사(브랜드) 권한 템플릿
- Editor: 상품 콘텐츠(설명/이미지/속성) 작성
- Manager/Legal: 브랜드 정책/표현 검수 후 승인
- Admin: 채널 연동은 본사 IT만 가능(외부 대행사 금지)

### 5.3 유통/판매사(리셀러) 템플릿
- Editor: 재고/가격/프로모션 초안
- Manager: 가격 변경 승인, 재고 품절 자동화 허용 범위 설정
- Admin: 물류/ERP 연동 설정

### 5.4 대행사(마케팅) 템플릿
- Editor: 광고 캠페인 초안 생성(하지만 publish는 불가)
- Manager/Legal: 광고/소재/타게팅 승인
- Admin: 광고 계정 연동은 고객 Admin만 가능(대행사 Admin 권한 부여 금지)

---

## 6. API 스펙 초안 (V382)

### 6.1 Connectors
- `GET /v382/connectors`
- `POST /v382/connectors/{connector}/configure`
  - 저장: `secrets_ref`만 허용(토큰 원문 저장 금지)

### 6.2 Incremental Sync
- `POST /v382/sync/{channel}/{source}/run`
  - cursor 기반 증분동기화(orders/reviews/ads/catalog)

### 6.3 Catalog
- `POST /v382/products` (upsert)
- `GET /v382/products`

### 6.4 Write-back
- `POST /v382/writeback/{channel}/{sku}/prepare`
  - payload mapping + policy scan + requires_approval 판단
- `POST /v382/approvals` (승인 요청 생성)
- `POST /v382/approvals/{id}/decide` (approve/reject)
- `POST /v382/writeback/{channel}/{sku}/execute?approval_id=...`
  - 승인 완료된 경우에만 publish 실행
- `GET /v382/writeback/jobs`

### 6.5 Settlements
- `POST /v382/settlements/import`
- `GET /v382/settlements`

### 6.6 Audit
- `GET /v382/audit`

---

## 7. 화면 흐름(초보자용)

### 7.1 온보딩(처음 10분)
1) **Connectors**: 채널/광고 계정 연동(관리자만)
2) **Catalog**: SKU/상품 정보 업로드(최소 SKU/제목부터)
3) **Write-back → Prepare**: 채널 선택 후 사전검증 결과 확인
4) **Approvals**: 승인 요청 생성 → 매니저/법무 승인
5) **Write-back → Execute**: 승인 ID 입력 후 게시 실행
6) **Reports/Settlements**: 정산/비용 포함 KPI 확인

### 7.2 운영 루틴(매일)
- 증분동기화(orders/ads/reviews) 자동 스케줄
- 재고 품절 자동 반영(허용 범위 내)
- 정책 위반 finding 발생 시 즉시 승인 게이트로 전환

---

## 8. 구현상 주의(프로덕션 체크리스트)
- Auth: JWT/OIDC 적용(현재는 데모 헤더 기반)
- Secrets: Vault/KeyVault/SSM 강제
- PII: 암호화/마스킹/보존기간/접근로그
- Worker: Celery/RQ/Arq 등 큐 기반 write-back 실행기 분리
- Channel adapters: Amazon/Shopify/Qoo10/Rakuten 별 어댑터 모듈화

