# GENIE ROI V405 데이터 제품 명세서
(국내/글로벌 광고·마켓·쇼핑몰 + 인플루언서/UGC)

> 목적: 서로 다른 플랫폼의 활동 데이터를 **단일 이벤트 스키마(표준 필드)** 로 수집/표준화하고,
> 그 위에서 **지표(ROI/P&L/리스크)** 를 계산한 뒤, **추천/알림** 으로 고객 액션을 자동화한다.

---

## 1. 아키텍처 개요

### 1) 수집 (Collect)
- 방식: OAuth/API Key, Polling(리포트/정산), Webhook(주문/상태/서명검증)
- 원칙: 원문(payload) + 메타(수신시간/서명검증 결과)를 **RawVendorEvent** 로 저장
- 실패전략: 재시도/지연, 실패 원인(권한/쿼터/서명/포맷) 기록

### 2) 표준화 (Normalize)
- 입력: RawVendorEvent[]
- 출력: NormalizedActivityEvent[] (단일 스키마)
- 규칙:
  - 이벤트명(EventName) 표준화
  - ID/참조키(캠페인/소재/상품/SKU/주문/정산/크리에이터/계약) 공통 refs로 정규화
  - 금액(Money)은 통화 포함, 숫자 단위(major unit)로 통일
  - 품질지표(quality_score) + warnings + debug(raw 보존) 포함

### 3) 지표 (Metrics)
- 광고: impressions/clicks/conversions/spend/revenue → CTR/CVR/ROAS
- 커머스: 주문/취소/반품/환불 → 순매출, 반품률, 배송리드타임
- 정산(P&L): 정산서 라인아이템 + 공제(deductions) 표준화 → 실현매출/실현마진
- 인플루언서: 콘텐츠별 성과 + UTM/쿠폰 + 권리(whitelisting/기간) → 크리에이터 ROI/리스크

### 4) 추천/알림 (Recommend/Alert)
- 룰 기반(초기) → 데이터 누적 후 랭킹/ML로 확장
- 예시:
  - ROAS < 1.0: 예산/소재/오디언스 재배분 권장(High)
  - 정산 공제 급증: 공제 항목(플랫폼수수료/광고비/반품비) 분석 알림(Medium)
  - 화이트리스트 만료 임박: 권리 종료 전에 갱신/중단 알림(High)

---

## 2. 표준 이벤트 스키마 (요약)

### RawVendorEvent (수집 원문)
- platform: 플랫폼(예: naver_ads, coupang, amazon, instagram)
- channel: ads/market/shop/influencer
- event_name: 벤더 원문 이벤트명
- occurred_at: 이벤트 발생시간(플랫폼 기준)
- received_at: 서버 수신시간
- raw: 원문 payload(dict)
- signature_verified: 웹훅 서명 검증 결과
- actor/refs: 가능한 경우만 채움

### NormalizedActivityEvent (표준 이벤트)
- name: EventName (표준 이벤트명)
- occurred_at/received_at
- actor: 시스템/유저/벤더/크리에이터
- refs: account/store/campaign/ad/keyword/creative/product/sku/order/settlement/creator/content/contract/envelope
- spend/revenue/impressions/clicks/conversions 등 공통 KPI 필드
- audience/attribution/commerce/deductions/ugc_rights 등 도메인 확장 필드
- quality_score/warnings/debug

---

## 3. 도메인별 필드(촘촘 버전)

### 3.1 광고 (Campaign/Creative/Keyword/Audience)
- refs.campaign_id, refs.adgroup_id, refs.ad_id, refs.keyword_id, refs.creative_id
- impressions/clicks/conversions
- spend(Money)
- audience:
  - geo[], age_min/age_max, genders[], interests[], placements[]
- attribution:
  - utm_*, click_id, view_through
- 추천/알림 예시:
  - 소재 피로도: CTR 하락/빈도 증가 → 소재 교체 추천
  - 키워드 비효율: CPC 상승 + 전환 저하 → 매칭/입찰 조정 추천

### 3.2 마켓/쇼핑몰 (주문/상품등록/정산 공제 항목)
- 상품/카탈로그:
  - refs.product_id, refs.sku, 이벤트: PRODUCT_CREATED/UPDATED/PAUSED, PRICE_CHANGED, INVENTORY_CHANGED
- 주문 라이프사이클:
  - refs.order_id, refs.shipment_id, 이벤트: ORDER_PLACED/CANCELLED, RETURN_REQUESTED, REFUND_ISSUED, SHIPMENT_CREATED/DELIVERED
- 정산(P&L):
  - refs.settlement_id
  - revenue(Money) = 정산 기준 매출(가능 시)
  - deductions:
    - platform_fee, payment_fee, shipping_fee, return_fee, ad_fee, coupon_subsidy, tax_withheld, other[]
- 추천/알림 예시:
  - 공제 급증: return_fee↑ 또는 ad_fee↑ → 원인 분리 리포트 제공
  - SKU 수익성 악화: 정산 기준 마진↓ → 가격/광고/배송정책 조정 추천

### 3.3 인플루언서/UGC (권리/화이트리스트/브랜디드 표기)
- refs.creator_id, refs.content_id, refs.contract_id, refs.envelope_id
- 이벤트: CREATOR_* / CONTENT_* / WHITELIST_GRANTED/REVOKED / BRANDED_CONTENT_LABELED / CREATOR_PAYOUT_ISSUED
- ugc_rights:
  - rights_scope(유기/유료광고/리셀/2차편집), territory, start_at/end_at
  - whitelist(bool), branded_content_label(bool), usage_notes
- attribution:
  - coupon_code, tracking_url, utm_*
- 추천/알림 예시:
  - 권리 만료 임박: end_at-7일 → 갱신/중단 알림
  - 크리에이터 ROI: 매출/정산 대비 지급액 → 재계약/확장 후보 추천

---

## 4. API (V405)

- GET /v405/spec/activity_event_schema
  - NormalizedActivityEvent JSON Schema
- POST /v405/events/ingest
  - RawVendorEvent[] 입력 → normalize 결과 반환(개발/검증용)
- POST /v405/metrics/compute
  - NormalizedActivityEvent[] → totals/derived 지표 반환
- POST /v405/recommendations/generate
  - metrics → recommendations/alerts 반환

> 운영 확장 포인트:
> - ingest 단계에서 raw 이벤트를 DB/Queue에 적재
> - normalize는 커넥터별 mapper registry로 정밀 매핑
> - metrics는 SKU/캠페인/크리에이터 단위로 rollup(집계) 제공
> - recommendations는 룰 → 랭킹 → ML(멀티암드 밴딧 등)로 진화
