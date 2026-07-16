# GeniegoROI Enterprise Data Intelligence Constitution

> **Volume 3 — Data Trust & Quality Intelligence Constitution.** 이 문서는 GeniegoROI의 **핵심 경쟁력** — 수집한 데이터를 그대로 쓰지 않고 **"진짜인가·믿을 수 있는가·AI가 써도 되는가·자동화가 써도 되는가"를 판정하는 Data Trust Intelligence Engine** — 을 정의한다.
> 대부분의 SaaS(Triple Whale·Northbeam·Hyros·GA4·HubSpot·Shopify Analytics 등)는 "데이터를 모아 분석"한다. GeniegoROI는 그 위 단계 — **신뢰 검증을 통과한 데이터만 분석·AI 추천·자동화에 사용** — 를 지향한다.
> 상위 원칙은 [`DATA_INTELLIGENCE_CONSTITUTION.md`](DATA_INTELLIGENCE_CONSTITUTION.md)(Volume 1)·[`DATA_SOURCE_ARCHITECTURE_CONSTITUTION.md`](DATA_SOURCE_ARCHITECTURE_CONSTITUTION.md)(Volume 2)를 따른다.
> 구현 시 기존 품질/이상탐지 자산(`DataPlatform`·`AnomalyDetection`·`ModelMonitor`·`GraphScore`)을 **확장**한다(제19조 중복금지 — 신규 엔진 난립 금지).

**Version 1.0 · Volume 3 — Data Trust & Quality Intelligence Constitution**

---

## 1. Mission

GeniegoROI는 데이터를 많이 수집하는 플랫폼이 아니다. **가장 신뢰할 수 있는 데이터를 가장 많이 확보하는 플랫폼**이다.

---

## 2. Golden Rule

다음은 **절대로 허용하지 않는다.** AI는 **신뢰된 데이터만** 사용한다.

❌ Fake Data · ❌ Dummy Data · ❌ Test Data · ❌ Sample Data · ❌ Invalid Data · ❌ Bot Data · ❌ Spam Data · ❌ Fraud Data · ❌ Duplicate Data · ❌ Corrupted Data · ❌ Unauthorized Data · ❌ Expired Data · ❌ Unknown Source

---

## 3. Data Trust Pipeline

모든 데이터는 반드시 다음 파이프라인을 통과한다.

```
Collection
   ↓
Authentication Check → Integrity Check → Schema Validation → Permission Validation
   ↓
Duplicate Detection → Cross Validation → Fraud Detection → Bot Detection → Spam Detection → Anomaly Detection
   ↓
Quality Scoring → Trust Scoring
   ↓
Normalization → Unified Intelligence
   ↓
Analytics → Marketing Automation
```

---

## 4. Data Integrity

다음 항목을 검사한다.

`Primary Key · Foreign Key · Missing Value · Null Value · Invalid Value · Broken Relation · Reference Integrity · Schema Version · Timezone · Currency · Language · Encoding · Date · Precision`

---

## 5. Duplicate Detection

**중복 데이터는 절대 분석하지 않는다.** 다음 기준으로 검사하고 AI가 **중복률**을 계산한다.

`Customer · Email · Phone · SKU · Order · Transaction · Campaign · Creative · Ad · Click · Conversion · Session · Shipment · Invoice · Review · Event · Log · Webhook · API Response`

---

## 6. Fake Detection

허위 데이터를 검사한다. 신뢰도가 낮으면 **자동화에서 제외**한다.

예: 비정상적인 클릭 · 비정상적인 리뷰 · 허위 평점 · 가짜 구매 · 가짜 회원가입 · 허위 광고 클릭 · 허위 Conversion · 허위 Impression · 허위 Session · 허위 Event · 허위 Traffic · 허위 Lead · 허위 CRM 데이터

---

## 7. Bot Detection

Bot을 검사하고 **Bot Score**를 계산한다.

`Crawler · Spam Bot · Click Bot · Fake Browser · Headless Browser · Automation Script · Emulator · Abnormal User Agent · Suspicious IP · Rate Abuse · Bot Traffic`

---

## 8. Spam Detection

Spam 여부를 검사한다.

`Spam Email · Spam Phone · Spam Review · Spam Comment · Spam Lead · Spam CRM · Spam Referral · Spam Campaign · Spam Landing · Spam Click · Spam Domain · Spam URL`

---

## 9. Fraud Detection

**Fraud Score**를 계산한다.

`비정상 결제 · Refund Abuse · Coupon Abuse · Fake Purchase · Fake Revenue · Affiliate Fraud · Creator Fraud · Ad Fraud · Traffic Fraud · Identity Fraud`

---

## 10. Cross Validation ★ (가장 중요)

**하나의 채널만 믿지 않는다.** 여러 소스의 데이터가 일치하는지 AI가 교차 검증한다.

```
Meta Ads ↔ Google Analytics ↔ Shopify ↔ CRM ↔ Payment ↔ Order ↔ Invoice ↔ 배송 ↔ Review
```

> GeniegoROI 288차의 **취소제외 2축 통일·가짜녹색 제거**가 이 원칙의 실사례 — 매체 자기보고(over-report)를 실주문·정산과 교차검증해 진실값 산출.

---

## 11. Quality Score

모든 데이터는 100점 만점의 **Quality Score**를 가진다. 평가 항목:

`Completeness · Freshness · Consistency · Accuracy · Uniqueness · Integrity · Validation · Availability · Lineage · Recoverability`

---

## 12. Trust Score

모든 데이터는 **Trust Score**를 가진다. 평가:

`Source · Authentication · Sync Success · History · Cross Validation · Duplicate Rate · Fraud Score · Bot Score · Spam Score · Integrity`

---

## 13. Confidence Score

AI가 얼마나 자신 있게 추천 가능한지 계산한다.

예: `ROAS 92% · LTV 88% · Attribution 96% · Automation 81%` Confidence.

---

## 14. Intelligence Readiness

AI가 사용 가능한 데이터인지 검사한다 — 3단계 상태:

| 상태 | 의미 |
|------|------|
| **READY** | AI/자동화 사용 가능 |
| **WARNING** | 사용하되 경고 표시 |
| **BLOCKED** | 사용 금지 |

---

## 15. AI Recommendation Rule

AI는 **Quality가 낮으면 추천하지 않는다.** 대신 개선 안내:

- "Google Ads 데이터 품질이 낮습니다."
- "CRM 연결이 필요합니다."
- "SKU 데이터가 부족합니다."
- "Meta Ads 권한이 만료되었습니다."

---

## 16. Marketing Automation Safety

**Quality가 낮은 데이터는 자동화에 사용하지 않는다.**

- ROAS 계산 실패 → **광고 중지 금지**
- LTV 부족 → **VIP 자동 분류 금지**
- Duplicate Customer → **CRM 자동 실행 금지**

---

## 17. Trust Dashboard

대시보드 제공: `Quality Score · Trust Score · Fraud Score · Spam Score · Bot Score · Freshness · Connector Status · Last Sync · Sync Health · Confidence`

---

## 18. Enterprise Audit

모든 품질 검사는 **Audit Log**를 남긴다: `언제 · 누가 · 무엇을 · 왜 · 어떻게 · 결과 · Risk · Recommendation`

---

## 19. Duplicate Consolidation

이미 품질 검사 기능이 중복 구현되어 있으면 **새로 만들지 않는다. 단일 Engine으로 통합한다** (Golden Rule — Extend).

---

## 20. Completion Rule

완료 조건:

- [ ] Fake Detection · [ ] Spam Detection · [ ] Fraud Detection · [ ] Bot Detection · [ ] Duplicate Detection
- [ ] Quality Score · [ ] Trust Score · [ ] Confidence Score · [ ] Cross Validation
- [ ] Audit · [ ] Dashboard · [ ] API · [ ] Automation · [ ] Regression Test · [ ] PM Change History

---

## Volume 3 완료 기준

GeniegoROI는 **수집한 데이터를 그대로 분석하는 시스템이 아니라, 데이터의 신뢰성과 품질을 검증한 뒤에만 분석·AI 추천·마케팅 자동화를 수행하는 플랫폼**이어야 한다.

---

## 부록 — 엔터프라이즈 강화 원칙 (구현 시 함께 준수)

Volume 3를 실제 구현할 때 다음을 함께 포함한다.

1. **법적·계약적 준수 (Compliance-by-Design)**: 각 외부 서비스의 API 이용약관·권한 범위 내에서만 데이터를 수집·사용한다(Volume 1 §4 준수). ToS 위반 스크래핑·무권한 접근 금지.
2. **설명 가능한 AI (Explainability / XAI)**: AI 추천마다 "왜 이런 추천을 했는지" 근거(사용된 데이터·신뢰도·주요 요인)를 제공한다. 블랙박스 추천 금지.
3. **데이터·모델 버전 관리 (Lineage & Versioning)**: 분석 결과가 어떤 데이터 버전·어떤 분석 모델 버전으로 생성됐는지 추적 가능하게 설계한다(§6 Source Transparency의 Data Version과 연계).
4. **모델 성능 모니터링 (Continuous Model Monitoring)**: AI 추천 정확도와 실제 성과를 지속 비교·학습해 추천 품질을 개선한다(기존 `ModelMonitor` 확장).

이로써 GeniegoROI는 단순 데이터 집계 도구가 아니라 **신뢰 기반의 AI 마케팅 의사결정 플랫폼**으로 차별화된다.

> **개정 이력**
> - v1.0 (Volume 3) — Data Trust & Quality Intelligence Constitution 최초 제정.
