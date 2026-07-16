# GeniegoROI Enterprise Data Intelligence Constitution

> **Volume 4 — Unified Intelligence Layer Constitution.** Volume 1~3이 "데이터를 신뢰할 수 있게 만드는 단계"였다면, Volume 4는 **그 신뢰된 데이터를 AI가 이해하고 스스로 의사결정을 내릴 수 있는 Intelligence Layer**를 정의한다. 이 레이어로 GeniegoROI는 단순 BI/대시보드가 아니라 **AI Marketing Intelligence Operating System**으로 발전한다.
> 상위: [`DATA_INTELLIGENCE_CONSTITUTION.md`](DATA_INTELLIGENCE_CONSTITUTION.md)(V1)·[`DATA_SOURCE_ARCHITECTURE_CONSTITUTION.md`](DATA_SOURCE_ARCHITECTURE_CONSTITUTION.md)(V2)·[`DATA_TRUST_QUALITY_CONSTITUTION.md`](DATA_TRUST_QUALITY_CONSTITUTION.md)(V3). **AI는 V3 신뢰검증(READY)을 통과한 데이터만 사용한다.**
> 구현 시 기존 자산 확장(제16조): `AttributionEngine`/`Attribution`·`CRM`/`CustomerAI`(360)·`Decisioning`·`Insights`·`Mmm`·`AutoCampaign`·`ClaudeAI`. **Intelligence Engine 난립 금지.**

**Version 1.0 · Volume 4 — Unified Intelligence Layer Constitution**

---

## 1. Mission

GeniegoROI는 여러 채널의 데이터를 단순히 보여주는 플랫폼이 아니다. **모든 데이터를 하나의 통합 Intelligence Layer로 연결하여 AI가 이해하고 의사결정을 수행**할 수 있게 만든다.

모든 데이터는 "무슨 일이 일어났는가"가 아니라 다음까지 설명할 수 있어야 한다.

- **왜** 일어났는가
- **무엇이** 영향을 주었는가
- 앞으로 **무엇을 해야** 하는가

---

## 2. Unified Intelligence Layer 원칙

모든 원천 데이터는 다음 순서를 따른다.

```
Raw Data → Validated Data → Normalized Data → Unified Data Model
   → Business Intelligence → AI Intelligence → Decision Engine
   → Marketing Automation → Continuous Learning
```

---

## 3. Unified Entity Model

AI는 채널이 아니라 **"비즈니스 엔티티"**를 중심으로 이해한다. 다음 엔티티를 통합 관리한다.

`Company · Workspace · Brand · Product · SKU · Customer · Audience · Segment · Campaign · Ad · Creative · Creator · Channel · Order · Payment · Refund · Shipment · Inventory · Review · Event · Session · Conversion · Revenue · Cost · Promotion · Coupon · Subscription · Support Ticket`

---

## 4. Customer 360

모든 고객은 하나의 통합 프로필을 가진다.

`최초 유입 채널 · 방문 이력 · 광고 반응 · 콘텐츠 반응 · 구매 이력 · 환불 이력 · CRM 이력 · 이메일 반응 · SMS 반응 · 멤버십 · LTV · CAC · 재구매율 · 이탈 위험 · 추천 상품 · Next Best Action`

> **테넌트 격리 절대**(V1 §7). PII 미저장 원칙 하에 집계·해시 기반으로 구성.

---

## 5. Product & SKU Intelligence

SKU마다 AI가 계산한다.

`판매량 · 매출 · 순이익 · 광고비 · ROAS · CAC · 재구매율 · 반품률 · 리뷰 평점 · 시즌성 · 국가별 성과 · 채널별 성과 · 크리에이터별 성과 · 콘텐츠별 성과`

---

## 6. Channel Intelligence

채널별 `비용 · 클릭 · 노출 · CTR · CPC · CPM · CPA · ROAS · 매출 · 전환율 · 신규 고객 · 기존 고객 · LTV · CAC`를 통합 계산하고, **AI는 채널 간 기여도를 비교**한다.

---

## 7. Campaign Intelligence

모든 캠페인은 다음 정보를 가진다.

`목적 · 예산 · 광고비 · 매출 · 전환 · ROAS · CAC · LTV · Attribution · Incrementality · Saturation · Creative Effectiveness · Audience Fit`

---

## 8. Creator Intelligence

크리에이터별 `노출 · 참여율 · 클릭 · 전환 · 매출 · LTV · ROAS · 콘텐츠 유형 · 국가별 성과 · 카테고리 적합도`를 계산한다.

---

## 9. Content Intelligence

모든 콘텐츠를 AI가 분석한다.

`조회수 · 시청 지속시간 · 저장 · 공유 · 댓글 · 클릭 · 구매 전환 · ROAS 기여 · 브랜드 기여 · SEO 기여`

---

## 10. Attribution Intelligence

모든 전환은 단일 채널이 아니라 **고객 여정 기준**으로 계산한다. 지원 모델:

`First Touch · Last Touch · Linear · Time Decay · Position Based · Data Driven · Markov · Shapley`

**AI는 선택한 모델과 근거를 함께 제시한다.**

---

## 11. AI Insight Engine

AI는 단순 리포트를 생성하지 않는다. 다음을 생성한다.

`주요 성과 · 주요 문제 · 원인 분석 · 개선 우선순위 · 위험 요소 · 성장 기회 · 다음 행동 추천`

**모든 추천에는 사용된 데이터와 신뢰도 근거를 함께 표시**한다(V3 Explainability).

---

## 12. Recommendation Engine

AI는 사용자 상황에 맞는 추천을 제공한다.

`연결하면 좋은 채널 · 예산 재배분 · 중단해야 할 캠페인 · 확대해야 할 SKU · 재고 부족 예상 · 신규 국가 진출 후보 · 추천 크리에이터 · 추천 콘텐츠 전략 · 추천 CRM 액션`

**검증된 데이터에 기반하며, 사용자가 최종 판단을 내릴 수 있도록 근거를 제공**한다.

---

## 13. Decision Engine

AI는 실행 가능한 의사결정 후보를 생성한다.

`예산 +20% 권장 · 예산 -15% 권장 · 캠페인 일시 중지 권장 · 광고 소재 교체 권장 · 재고 확보 권장 · CRM 리타겟팅 권장`

**자동 실행은 사용자의 설정과 승인 정책을 존중해야 한다**(V3 §16 Automation Safety — 품질 낮으면 자동집행 금지).

---

## 14. Continuous Learning

새로운 데이터가 들어오면 `Intelligence 재계산 · 추천 재생성 · 위험도 재평가 · 예측 업데이트`를 수행한다.

---

## 15. Explainable AI

모든 AI 추천에 다음을 제공한다. **AI는 근거 없이 결론을 제시하지 않는다.**

`사용된 데이터 · 분석 기간 · 주요 영향 요인 · 신뢰도(Confidence) · 예상 효과 · 한계 및 주의사항`

---

## 16. Duplicate Prevention

**Intelligence Layer는 하나만 존재한다.** 동일 Intelligence 계산 로직이 여러 곳에 있으면 기존 구현을 분석하여 가장 안정적인 구현으로 통합한다. **새로운 Intelligence Engine을 중복 생성하지 않는다**(개발 헌법 Golden Rule).

---

## 17. Regression Prevention

Unified Intelligence Layer 수정 시 다음을 반드시 검증한다(무후퇴 원칙).

- 기존 API 유지 · 기존 Dashboard 유지 · 기존 Analytics 유지 · 기존 Automation 유지 · 기존 AI Recommendation 유지

**기능 후퇴가 발생하면 변경을 중단하고 원인을 해결한다.**

---

## 18. Completion Rule

완료 조건:

- [ ] Unified Entity Model 구축 · [ ] Customer 360 구축 · [ ] Product Intelligence 구축
- [ ] Campaign Intelligence 구축 · [ ] Creator Intelligence 구축 · [ ] Content Intelligence 구축
- [ ] Attribution Intelligence 구축 · [ ] AI Insight Engine 구축 · [ ] Recommendation Engine 구축
- [ ] Decision Engine 구축 · [ ] Explainable AI 지원
- [ ] Regression Test 통과 · [ ] PM Change History 갱신 · [ ] Intelligence Registry 갱신

---

## Volume 4 완료 기준

GeniegoROI는 단순한 데이터 분석 플랫폼이 아니라, **다양한 데이터 소스를 하나의 Unified Intelligence Layer로 통합하여 AI가 근거 기반의 인사이트와 추천을 생성하고, 사용자가 신뢰할 수 있는 의사결정을 내릴 수 있도록 지원하는 초엔터프라이즈급 SaaS 플랫폼**이어야 한다.

---

## 다음 단계

**Volume 5 — Marketing Intelligence & Automation Constitution** (예정): AI가 업종·국가·카테고리·상품·고객 행동을 분석하여 **채널 추천·캠페인 전략·예산 최적화·자동화 실행 규칙**까지 정의한다. GeniegoROI를 실제 마케팅 운영 플랫폼으로 완성하는 핵심 구성 요소.

> **개정 이력**
> - v1.0 (Volume 4) — Unified Intelligence Layer Constitution 최초 제정.
