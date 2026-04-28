# GENIE_ROI V389 운영 가이드(체크리스트)

> 목적: **V388 표준 스키마를 ‘실전 운영’에서 안정적으로 굴리기** 위해,
> (1) Meta/TikTok에서 **campaign/adset/creative + demographic(국가/성별/연령대)** 를 어떤 **조합으로** 뽑아야 안정적인지,
> (2) Shopify 매출을 광고(creative/adset)과 **현실적으로 매칭**하는 방법(UTM/discount/landing/product mapping)을
> 체크리스트 형태로 정리합니다.

---

## 0) 먼저 결론(현장에서 가장 안정적인 최소 조합)

### 광고(필수 최소)
- **레벨:** `ad(=creative)` 레벨로 **일 단위(daily)**
- **Breakdown(한 번에 다 하지 말 것):**
  1) `country` (기본)
  2) `age, gender` (가능하면 **별도 호출로**) 

Meta는 Insights API에서 다양한 breakdowns를 지원합니다(예: age, gender, country 등). 
TikTok은 리포팅에서 breakdown(세그먼ენტ) 결합에 제약이 있을 수 있어, 실무에서는 **country 1종을 기본**으로 두고, 나머지는 별도 리포트로 분리하는 운영이 안정적입니다.

## 1) Meta (Facebook/Instagram) Insights 수집 체크리스트

### 1-1. 권한/스코프(필수)
- [ ] Meta 개발자 앱 생성
- [ ] 광고 계정 접근 권한 확보
- [ ] 최소 스코프 확보(예: ads_read)
- [ ] Access Token 만료/갱신 운영(장기 토큰 또는 시스템 사용자)

### 1-2. API 호출 설계(안정성)
- [ ] **level=ad**(소재 단위)로 수집(=creative_id로 바로 추천 가능)
- [ ] time_increment=1(일 단위)
- [ ] breakdowns는 과도하게 결합하지 말고 **분리 호출**

Meta는 Insights API에서 breakdowns를 통해 age/gender/country 등의 분해를 지원합니다.

- 공식 문서: Insights API Breakdowns 
  - age, gender, country 등 breakdown 항목 안내
  - citeturn0search0
- 공식 문서: Insights Best Practices / Limits
  - breakdown 사용 시 기간/비동기 처리 등 베스트 프랙티스(제한 관련)
  - citeturn0search17

### 1-3. 추천용 “최소 필드”
- [ ] spend, impressions, clicks, conversions
- [ ] (가능하면) revenue(또는 purchase_value)
- [ ] dimensions: campaign_id, adset_id, creative_id
- [ ] demographic(집계): country, gender, age_range

### 1-4. 운영 팁(실전)
- [ ] **country** breakdown은 기본 리포트로 매일 적재
- [ ] **age+gender**는 별도 호출로(데이터가 커지고 제한 걸리기 쉬움)
- [ ] 누락 대비: 전날 데이터는 T+1 재수집(지연 반영)

---

## 2) TikTok Ads 리포트 수집 체크리스트

### 2-1. 권한/토큰 운영
- [ ] TikTok Business 계정/앱 권한
- [ ] 광고주(advertiser_id) 단위 권한
- [ ] 토큰 만료/갱신/보안 저장(Secret ref)

### 2-2. 리포팅 “안정 조합”
TikTok은 API/커넥터 구현체에 따라 **여러 breakdown을 동시에 뽑는 것에 제한**이 생길 수 있습니다.
실무에서는:
- [ ] 기본: **country**로만 breakdown
- [ ] 추가: placement 또는 platform은 별도 리포트로 분리

참고(제한 예시): TikTok 데이터 커넥터/리포팅에서 breakdown 제약이 언급됩니다.
- citeturn0search15

### 2-3. 추천용 “최소 필드”
- [ ] spend, impressions, clicks, conversions
- [ ] (가능하면) revenue/purchase_value
- [ ] dimensions: campaign_id, adset_id(=adgroup), creative_id(=ad)
- [ ] demographic(집계): country, gender, age_range(가능할 때)

---

## 3) Shopify 매출을 광고(creative/adset)과 매칭하는 현실적 방법

> 핵심: **완벽한 매칭은 보통 단일 신호로 안 됩니다.**
> 그래서 V389는 “신호 우선순위”를 고정하고, 여러 신호를 조합해 **재현 가능한 규칙**으로 매칭합니다.

### 3-1. Shopify에서 가져올 수 있는 트래픽/유입 신호
- [ ] order.landing_site(랜딩 URL)
- [ ] order.referring_site(레퍼러 URL)
- [ ] discount_codes(할인코드)

Shopify 주문 데이터에는 landing_site/referring_site 및 discount_codes 같은 필드가 존재합니다.
- citeturn0search6turn0search13

또한 UTM은 REST에서 전용 필드로 항상 제공되지 않고, landing_site/referring_site의 쿼리스트링에 포함되는 형태가 “상황에 따라” 관찰됩니다.
- citeturn0search2

### 3-2. “실전 매칭” 체크리스트(우선순위)

#### A) 가장 강력한 매칭: UTM + ad/creative id
- [ ] 광고 링크에 UTM을 강제
  - utm_source=meta|tiktok
  - utm_medium=paid_social
  - utm_campaign=<campaign_id 또는 이름>
  - utm_content=<creative_id>  ← **핵심**
  - utm_term=<adset_id 또는 타겟 식별>
- [ ] Shopify order.landing_site/referring_site에서 UTM 파싱
- [ ] 파싱된 utm_content를 `creative_id`에 매핑

#### B) 보완 매칭: 할인코드(discount code)
- [ ] 광고/인플루언서별 discount_code 발급
- [ ] 주문에 적용된 discount_code를 광고/캠페인/크리에이터에 매핑
- [ ] 할인코드가 있으면 UTM이 없더라도 “캠페인 귀속” 가능

#### C) 보완 매칭: 랜딩 페이지(landing page) 매핑
- [ ] 캠페인/소재별 전용 랜딩 URL(또는 path)
- [ ] landing_site path로 campaign/adset/creative를 추정

#### D) 상품 매칭(product mapping)
- [ ] Shopify line_items의 variant_id/product_id/sku를 이용해 canonical product_id 생성
- [ ] 광고 소재가 특정 상품 상세 URL로 보내면, 해당 상품과 강하게 연결

---

## 4) V389 표준 스키마(요약)

### 4-1. 광고(메타/틱톡) 최소 차원
- campaign_id, adset_id, creative_id
- (선택) country, gender, age_range

### 4-2. 커머스(Shopify) 최소 차원
- product_id(규칙 기반 canonical)
- (선택) utm_source/utm_campaign/utm_content/utm_term
- (선택) discount_code

---

## 5) 운영 루틴(매일/매주)

### 매일(T+1 재수집 포함)
- [ ] Meta ad-level daily + country
- [ ] TikTok ad-level daily + country
- [ ] Shopify orders daily(landing/referrer/discount 포함)
- [ ] V389 ingestion(통합 적재)
- [ ] V387 추천 호출(룰/목표/증분)

### 매주(정책/데이터 품질)
- [ ] UTM 누락율(주문 중 UTM 파싱 성공율)
- [ ] 할인코드 매칭율
- [ ] 세그먼트(국가/성별/연령) 데이터 공백 체크
- [ ] “증분 프록시” 둔화(diminishing returns) 경고 확인

