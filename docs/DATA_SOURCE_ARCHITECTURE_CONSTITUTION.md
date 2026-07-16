# GeniegoROI Enterprise Data Intelligence Constitution

> **Volume 2 — Data Source Architecture Constitution.** 이 문서는 전 세계의 **합법적으로 연동 가능한 판매·광고·CRM·분석·물류·결제·콘텐츠 데이터를 하나의 표준 데이터 모델로 연결하는 구조**를 정의한다.
> 상위 원칙은 [`DATA_INTELLIGENCE_CONSTITUTION.md`](DATA_INTELLIGENCE_CONSTITUTION.md)(Volume 1)를 따르며, 데이터 소스·커넥터 영역은 본 문서가 구현 기준의 정본이다.
> 구현 정본(표준 스키마·플랫폼)은 [`docs/data/DATA_ARCHITECTURE.md`](data/DATA_ARCHITECTURE.md), 커넥터 레지스트리 구현은 코드의 `ChannelRegistry`/`Connectors`/`ChannelSync`에 매핑된다(제13조 중복금지 — 신규 구현 전 기존 확장 우선).

**Version 1.0 · Volume 2 — Data Source Architecture Constitution**
(Volume 3 — Data Quality & Trust Engine Constitution 이어짐)

---

## 1. 목적 (Mission)

GeniegoROI는 단순 API 연동 플랫폼이 아니다. 모든 연결 가능한 채널을 하나의 **Enterprise Data Intelligence Platform**으로 통합하는 것을 목표로 한다.

목표는 **"많은 채널"이 아니라 "고객에게 실제 도움이 되는 신뢰 가능한 Intelligence"**이다.

---

## 2. Data Source Architecture

모든 데이터는 아래 구조를 따른다.

```
External Source
   ↓
Connector
   ↓
Authentication
   ↓
Collection
   ↓
Validation
   ↓
Normalization
   ↓
Quality Check
   ↓
Unified Data Model
   ↓
Intelligence Engine
   ↓
Analytics
   ↓
Recommendation
   ↓
Marketing Automation
   ↓
Dashboard
   ↓
API
```

---

## 3. Data Source Classification

모든 데이터 소스는 반드시 아래 카테고리 중 하나로 분류한다.

| 카테고리 | 데이터 유형 |
|----------|------------|
| **Commerce** | 온라인 쇼핑몰 · Marketplace · POS · 주문 · 상품 · SKU · 재고 · 가격 · 쿠폰 · 환불 · 취소 · 정산 · 배송 |
| **Advertising** | 검색광고 · 디스플레이광고 · SNS 광고 · 쇼핑광고 · 리타겟팅 · 브랜딩 · 동영상 광고 · Performance Max · DSP · Programmatic |
| **Analytics** | 웹 분석 · 앱 분석 · 검색 분석 · 광고 분석 · 전환 분석 · 퍼널 분석 · 이벤트 분석 · 세션 분석 · Heatmap · A/B Test |
| **CRM** | 고객 · 회원 · 리드 · 구매 · 문의 · CS · 구독 · 멤버십 · 리텐션 · 재구매 · VIP |
| **Marketing** | 이메일 · SMS · 푸시 · 카카오 · WhatsApp · LINE · Telegram · 콘텐츠 · 캠페인 · 쿠폰 · 자동화 |
| **Social** | Instagram · Facebook · TikTok · YouTube · Pinterest · LinkedIn · Threads · Reddit · Discord · X |
| **Creator** | Influencer · Affiliate · UGC · 파트너 · 콘텐츠 · 성과 · 수익 |
| **Payment** | 결제 · 환불 · 구독 · Recurring Billing · 수수료 · 정산 · 세금 |
| **Logistics** | 배송 · 택배 · 창고 · WMS · OMS · Tracking · 반품 · 교환 · 배송비 |
| **ERP** | 회계 · 재무 · 매입 · 매출 · 구매 · 생산 · 원가 · 세금 |
| **Search Intelligence** | 검색량 · 키워드 · SEO · SERP · 검색 트렌드 |
| **Market Intelligence** | 시장 규모 · 가격 변화 · 상품 트렌드 · 카테고리 성장 · 계절성 · 경쟁 동향 |

> Search/Market Intelligence는 **공개적으로 이용 가능한 데이터(Open Data)와 고객이 권한을 부여한 데이터 범위 내에서만** 활용한다(Volume 1 §4 Data Source Principle 준수).

---

## 4. Connector Principle

각 채널은 반드시 Connector를 가진다. Connector에는 다음이 포함되어야 한다.

- 인증(Authentication)
- 동기화(Sync)
- Retry
- Rate Limit
- Error Handling
- Logging
- Monitoring
- Version

---

## 5. Connector Registry

모든 Connector는 다음 메타데이터를 가진다.

| 필드 | 필드 |
|------|------|
| Connector ID | Sync Type |
| Connector Name | Status |
| Version | Last Sync |
| Vendor | Retry Policy |
| Category | Monitoring |
| Authentication Type | Supported Objects |
| OAuth Scope | Supported Metrics |
| API Version | Supported Dimensions |
| — | Permission Level |

---

## 6. Authentication Rule

지원 가능한 인증: **OAuth 2.0 · API Key · JWT · Webhook · Basic Auth · Bearer Token · Service Account · Signed Request**.

Connector마다 다음을 지원한다.

- Token Refresh
- Expiration
- Rotation
- Secret Encryption

---

## 7. Collection Rule

데이터 수집은 **실시간 · 배치 · 증분(Incremental) · Webhook · 이벤트 · CSV Import · Manual Import**를 지원한다.

**가능하면 증분 동기화를 우선한다.**

---

## 8. Normalization Rule

채널마다 이름이 달라도 GeniegoROI Standard Schema로 변환한다.

```
Order · Purchase · Transaction        →  Unified Order
Campaign · Ad · Promotion             →  Marketing Campaign
Customer · Member · Buyer             →  Customer
Product · Item · SKU                  →  SKU
```

---

## 9. Unified Data Model

모든 데이터는 다음 표준 모델로 연결한다.

`Customer · Company · Brand · Product · SKU · Order · Campaign · Ad · Creative · Creator · Content · Channel · Session · Event · Conversion · Revenue · Cost · Inventory · Review · Support Ticket · Subscription · Warehouse · Shipment · Invoice · Refund · Coupon · Promotion · Audience · Segment · Automation · Workflow · Recommendation`

---

## 10. Quality Gate

데이터는 Quality Gate를 통과해야 한다. 검사 항목:

- Schema
- Integrity
- Duplicate
- Missing
- Outlier
- Currency
- Timezone
- Reference Integrity
- Tenant Isolation
- Permission
- Freshness
- Completeness

---

## 11. Trust Engine

각 데이터에 **Trust Score**를 부여한다. 기준:

- Source Reliability
- Update Frequency
- API Reliability
- Collection Success Rate
- Consistency
- Cross Validation
- Historical Accuracy
- Completeness

---

## 12. Connector Recommendation

GeniegoROI AI는 **업종 · 국가 · 판매채널 · 상품 · 광고 · CRM · 성과**를 분석하여 필요한 Connector를 추천한다.

예)
- "Google Search Console을 연결하면 SEO 분석 정확도가 향상됩니다."
- "Meta Ads를 연결하면 Attribution 정확도가 향상됩니다."
- "CRM을 연결하면 LTV 분석 정확도가 향상됩니다."
- "결제 시스템을 연결하면 순이익 분석이 가능합니다."

---

## 13. Duplicate Prevention

다음이 존재하면 **새로 구현하지 않는다. 기존 Connector를 확장한다** (개발 헌법 Golden Rule — Replace가 아니라 Extend).

- 동일 Connector · 동일 API · 동일 Sync · 동일 Object · 동일 Schema · 동일 Mapping · 동일 Event · 동일 Workflow

---

## 14. Completion Rule

완료 조건:

- [ ] Connector Registry 등록 완료
- [ ] Authentication 검증 완료
- [ ] Collection 검증 완료
- [ ] Normalization 검증 완료
- [ ] Unified Data Model 연결 완료
- [ ] Quality Gate 통과
- [ ] Trust Score 계산 완료
- [ ] Analytics 연결 완료
- [ ] Marketing Automation 연결 완료
- [ ] Dashboard 연결 완료
- [ ] API 연결 완료
- [ ] Regression Test 통과
- [ ] PM Change History 기록 완료

---

## Volume 2 완료 기준

GeniegoROI는 단순히 여러 채널을 연결하는 것이 아니라, **고객이 권한을 부여한 다양한 데이터 소스를 하나의 표준 데이터 모델로 통합**하여 **신뢰도 검증을 거친 Intelligence를 생성**하고, 이를 **분석·추천·마케팅 자동화에 일관되게 활용하는 구조**를 갖추어야 한다.

---

## 다음 단계

**Volume 3 — [Data Trust & Quality Intelligence Constitution](DATA_TRUST_QUALITY_CONSTITUTION.md)** ✅ 적용됨 — 허위·스팸·봇·사기·중복·이상치 필터링 + Cross Validation + Trust/Quality/Confidence Score 엔진. GeniegoROI 분석 정확도를 좌우하는 핵심 경쟁력.

> **개정 이력**
> - v1.0 (Volume 2) — Data Source Architecture Constitution 최초 제정.
