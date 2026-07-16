# GeniegoROI Enterprise Data Intelligence Constitution

> **최상위 데이터 헌법 (Data Governance Constitution).** 이 문서는 GeniegoROI의 모든 **데이터 설계·수집·검증·통합·분석·AI 추천·마케팅 자동화**가 따라야 하는 최상위 원칙을 명문화한다.
> 개발 원칙 헌법([`docs/CONSTITUTION.md`](CONSTITUTION.md))과 **동등한 최상위 지위**를 가지며, 데이터 영역에서는 본 문서가 우선한다.
> 구체적 구현 정본은 [`docs/data/DATA_ARCHITECTURE.md`](data/DATA_ARCHITECTURE.md)(표준 데이터 모델·플랫폼)로 연결된다.
> 실행 게이트/레지스트리는 [`docs/CHANGE_GATE.md`](CHANGE_GATE.md)·[`docs/registry/`](registry/README.md)를 따른다.

**Version 1.0 · Volume 1 — Data Intelligence Constitution**
(Volume 2 — Data Source Architecture Constitution 이어짐)

---

## 1. Mission (사명)

GeniegoROI는 단순한 마케팅 분석 플랫폼이 아니다. 다음을 목표로 하는 Enterprise SaaS이다.

- Enterprise Data Intelligence Platform
- Enterprise Marketing Intelligence Platform
- Enterprise Commerce Intelligence Platform
- Enterprise Customer Intelligence Platform
- Enterprise AI Decision Platform
- Enterprise Growth Intelligence Platform

**모든 데이터는 단순 저장이 아니라 의사결정 가능한 Intelligence로 변환되어야 한다.**

---

## 2. Ultimate Goal (최종 목표)

GeniegoROI의 목표는 "가장 많은 데이터"가 아니다. 목표는 다음과 같다.

- 가장 **정확한** 데이터
- 가장 **신뢰할 수 있는** 데이터
- 가장 **최신의** 데이터
- 가장 **가치 있는** 데이터
- 가장 **활용 가능한** 데이터

이를 기반으로 고객의 성장을 지원하는 AI Intelligence를 제공한다.

---

## 3. Data First Principle

데이터는 GeniegoROI의 핵심 자산이다. 모든 기능은 데이터 중심으로 설계한다. 다음 순서를 따른다.

```
Data Collection
   ↓
Data Validation
   ↓
Data Quality Assessment
   ↓
Data Normalization
   ↓
Data Integration
   ↓
Data Intelligence
   ↓
AI Analysis
   ↓
Recommendation
   ↓
Marketing Automation
   ↓
Continuous Learning
```

---

## 4. Data Source Principle

GeniegoROI는 **합법적으로 접근 가능한 데이터만** 수집하고 활용한다. 수집 대상은 다음으로 제한한다.

- 구독회원이 직접 입력하거나 업로드한 데이터
- 구독회원이 권한을 부여하여 연결한 외부 서비스의 데이터
- 공개적으로 제공되는 데이터(Open Data)
- 이용약관 및 계약 범위 내에서 접근 가능한 데이터

**다음은 운영 분석에 사용하지 않는다.**

- 목데이터(mock)
- 더미데이터(dummy)
- 샘플데이터(sample)
- 허위 데이터
- 조작된 데이터
- 출처가 불명확한 데이터
- 권한 없이 접근한 데이터

---

## 5. Trust First Principle

모든 데이터에는 신뢰도가 존재한다. **데이터를 수집했다고 해서 자동으로 분석에 사용하지 않는다.** 다음 항목을 평가한다.

- 출처 신뢰성
- 수집 성공 여부
- 완전성(completeness)
- 최신성(freshness)
- 일관성(consistency)
- 중복 여부
- 이상치 여부(outlier)
- 추적 가능성(traceability)

**신뢰도가 기준 이하인 데이터는 자동화와 AI 의사결정에서 제외하거나 경고를 표시한다.**

---

## 6. Source Transparency

모든 데이터는 출처를 반드시 기록한다. 최소 기록 항목:

| 항목 | 설명 |
|------|------|
| Source System | 원천 시스템 |
| Source Channel | 원천 채널 |
| Source Account | 원천 계정 |
| Source Type | 데이터 종류 |
| Collection Method | 수집 방식(API/업로드/OAuth 등) |
| Collection Time | 수집 시각 |
| Credential ID | 사용 자격증명 식별자 |
| Sync Job ID | 동기화 작업 식별자 |
| Data Version | 데이터 버전 |
| Quality Score | 품질 점수 |
| Trust Score | 신뢰 점수 |

**출처가 확인되지 않는 데이터는 "검증 대기(pending)" 상태로 관리한다.**

---

## 7. Customer Data Ownership

고객이 제공하거나 고객 계정에서 수집된 데이터의 **원본은 해당 고객의 데이터**이다. GeniegoROI는 이를 안전하게 저장·분석하고, 고객에게 분석 결과를 제공한다.

- **고객의 원본 데이터를 다른 고객에게 제공하거나 노출해서는 안 된다** (테넌트 격리 절대 원칙).
- 다만, 개인·기업을 **식별할 수 없도록 익명화·집계화한 통계**는 서비스 개선과 벤치마크에 활용할 수 있다.

---

## 8. Unified Intelligence Principle

각 채널의 데이터를 단순히 나열하지 않는다. **모든 데이터를 GeniegoROI 표준 데이터 모델로 정규화하고 연결한다.**

```
[ 광고 데이터 · 주문 데이터 · CRM 데이터 · 콘텐츠 데이터 ]
              ↓
       Unified Intelligence
              ↓
  ROAS · LTV · CAC · Attribution · Budget Optimization · Marketing Automation
```

---

## 9. No Duplicate Intelligence

동일한 의미의 데이터를 여러 형태로 중복 관리하지 않는다. 동일 데이터가 여러 채널에서 수집되면 다음 절차를 따른다.

1. 원천 확인
2. 중복 여부 판단
3. 충돌 해결 규칙 적용
4. 가장 신뢰도 높은 값 선정
5. 통합 데이터 생성
6. 원천 데이터는 별도 보존

---

## 10. Continuous Intelligence

데이터 분석은 일회성이 아니다. **새로운 데이터가 수집될 때마다** 다음을 반복 수행한다.

- 품질 검증
- 정규화
- 통합
- 분석
- AI 재평가
- 자동화 조건 재계산
- 추천 업데이트

**GeniegoROI는 시간이 지날수록 더 정확하고 더 가치 있는 Intelligence를 제공하는 플랫폼이 되어야 한다.**

---

## Volume 1 완료 기준

다음 조건을 만족해야 한다.

- [ ] 데이터 수집보다 데이터 신뢰성을 우선하는 원칙이 적용된다.
- [ ] 데이터 출처 추적 정책이 정의된다.
- [ ] 고객 데이터 소유권과 테넌트 분리 원칙이 정의된다.
- [ ] 통합 데이터(Intelligence) 생성 원칙이 정의된다.
- [ ] 허위·더미·비검증 데이터 배제 정책이 정의된다.
- [ ] AI와 마케팅 자동화는 검증된 데이터만 활용하도록 정의된다.

이 문서는 GeniegoROI의 모든 데이터 설계, 분석, AI 추천, 마케팅 자동화가 따라야 하는 **최상위 Data Intelligence 헌법**으로 사용한다.

---

## 다음 단계 · 시리즈 구성

- **Volume 1 — Data Intelligence Constitution** (본 문서) — 데이터 최상위 원칙.
- **Volume 2 — [Data Source Architecture Constitution](DATA_SOURCE_ARCHITECTURE_CONSTITUTION.md)** ✅ 적용됨 — 카테고리별 데이터 수집 구조·커넥터 표준·Unified Data Model.
- **Volume 3 — [Data Trust & Quality Intelligence Constitution](DATA_TRUST_QUALITY_CONSTITUTION.md)** ✅ 적용됨 — 허위/스팸/봇/사기/중복/이상치 필터링 + Cross Validation + Quality/Trust/Confidence Score + Intelligence Readiness(READY/WARNING/BLOCKED).
- **Volume 4 — [Unified Intelligence Layer Constitution](UNIFIED_INTELLIGENCE_LAYER_CONSTITUTION.md)** ✅ 적용됨 — Unified Entity Model·Customer360·Product/Channel/Campaign/Creator/Content/Attribution Intelligence·AI Insight/Recommendation/Decision Engine·Explainable AI. (AI Marketing Intelligence OS)
- **Volume 5 — [Marketing Intelligence & Automation Constitution](MARKETING_INTELLIGENCE_AUTOMATION_CONSTITUTION.md)** ✅ 적용됨 — Marketing OS(목표엔진·채널/캠페인 추천·예산최적화·Audience/Creative Intelligence·안전한 자동화·Health Score·Opportunity Detection).
- **Volume 6 — Enterprise AI Decision Engine & Predictive Intelligence Constitution** (예정) — 예측/시나리오/AI의사결정/이상탐지/성장예측 통합.

> **개정 이력**
> - v1.0 (Volume 1) — Data Intelligence Constitution 최초 제정.
