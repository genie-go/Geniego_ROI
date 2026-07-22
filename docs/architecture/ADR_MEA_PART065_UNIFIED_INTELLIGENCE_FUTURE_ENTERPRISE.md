# ADR — MEA Part 065 · Enterprise Unified Intelligence Platform & Future Enterprise Reference

> 289차 후속(2026-07-22) · **설계 결정 · 코드 변경 0 · NOT_CERTIFIED · 배포 없음** · ★**MEA 최종 Part**
> 근거 전량 [`GT①`](../data/MEA_PART065_EXISTING_IMPLEMENTATION.md)·[`GT②`](../data/MEA_PART065_DUPLICATE_AUDIT.md) 실측. 가설 인용 0.
> ★상속 051~064 **재판정 절대 금지**(종합 성격이라 재판정 유혹 최대).

---

## D-1 (★★최대 결정) — 본 Part는 **신설 명세가 아니라 헌법 V4의 상위 재진술**이다

### 결정
명세 §2 "Unified Intelligence Platform" · §3-1 "Enterprise Unified Intelligence Platform" · §10 "Enterprise Intelligence Hub" 를 **신규 구축 대상으로 채택하지 않는다.**

### 근거 — 헌법 원문(선독 완료)
`docs/UNIFIED_INTELLIGENCE_LAYER_CONSTITUTION.md` **§16 Duplicate Prevention**:
> **"Intelligence Layer는 하나만 존재한다. … 새로운 Intelligence Engine을 중복 생성하지 않는다(개발 헌법 Golden Rule)."**

그리고 GT① 실측상 **엔진은 이미 13종 실재**한다(`Insights`·`Decisioning`·`AutoRecommend`·`AttributionEngine`·`CustomerAI`·`Mmm`·`DataPlatform`·`Rollup`·`Alerting` 등).

### 귀결
> **065 를 "새 플랫폼을 만들라"로 읽으면 헌법 V4 §16 정면 위반이다.**
> 올바른 독법: **이미 제정된 헌법 V4(Unified Intelligence Layer)를 "Enterprise Reference Architecture" 라는 상위 프레임으로 다시 말한 문서**다.

★따라서 §19 Completion Criteria 의 "Enterprise Unified Intelligence Platform 구축" 은 **신설 완료가 아니라 헌법 V4 §18 Completion Rule 충족**으로 해석한다(체크리스트가 이미 존재).

---

## D-2 — 실체 판정: **PARTIAL-substantial**. 없는 것은 도메인이 아니라 **메타 계층**

### 결정
065 를 062(ABSENT-heavy)·064(ABSENT-total)와 **다른 등급**으로 판정한다.

### 실재(GT① §1)
- **정규화**: `KrChannel.php:240`(raw→canonical 스키마) · `:310~311`(alias 맵) · `:18`·`:161`(canonical 정산 필드)
- **아이덴티티 통합**: `CRM.php:107`·`:194`·`:556`·`:597`(**union-find 클러스터링**)·`:877~886`(큰 클러스터를 canonical 로)
- **교차도메인 통합 메트릭**: `DataProduct.jsx:133~135`(Blended/True ROAS·EBITDA Contribution)·`:145`·`:153`
- **Intelligence 엔진 13종** · **관측**(`SystemMetrics`+AI 프로브) · **감사**(`SecurityAudit`) · **SSO**(`EnterpriseAuth`)

### 부재(GT① §2)
§5 엔티티 15종 형식 부재 · `control_tower`·`fabric`·`event_bus`·`service_catalog`·`service_discovery`·`metadata_federation`·`zero_trust` **전량 0** · **Business Health Score 0** · Architecture Repository 0 · Platform Discovery/Registry 0

### ★성격 규정
> **없는 것은 "무엇을 아는가"(도메인 인텔리전스)가 아니라 "플랫폼을 등록·발견·연결·통제하는 메타 계층"이다.**
> 그리고 이 메타 계층은 **단일 모놀리식 Slim 앱에는 원래 필요 없는 구조**다 — 다수의 독립 플랫폼이 물리적으로 분리돼 있을 때 요구되는 것이다.
> → **"미구현"이 아니라 "아키텍처 형태 선행 종속"**(판정 어휘 제6항 성격).

---

## D-3 — ★★058~064 "Registry 부재 7연속"의 **귀착점이 바로 065**다

### 결정
058 Decision · 059 Twin · 060 Automation · 061 Device · 062 Blockchain · 063 ESG · 064 Computing 에서 반복 지적된 **Registry 부재**는, **각 Part 가 개별 Registry 를 만들 문제가 아니라 065 의 "Enterprise Architecture Repository / Platform Registry" 자리에 귀속**된다.

### 근거
- 063 에서 **"공통 Registry 추상화는 개별 Part 결정 범위를 넘으므로 상위 아키텍처 결정으로 승격 필요"** 로 판정했다.
- 064 에서 **"064 는 사업 범위 밖이라 승격 대상에서 제외"** 로 범위를 좁혔다.
- **065 가 그 승격된 상위 결정의 자리다.**

### ★그러나 지금 만들지 않는다
현재 실재 도메인(058~063 중 실체가 있는 것)은 **하나의 모놀리식 앱 안에 있고 물리적으로 분리돼 있지 않다.** Registry 는 **분리된 것을 잇기 위한 장치**이므로, 분리가 없는 상태에서 만들면 **레지스트리를 위한 레지스트리**가 된다.
→ **결론: Registry 는 "필요할 때 만든다". 지금 만들면 과설계.** 단 **필요해지는 조건**(도메인의 물리적 분리·다중 배포 단위 등장)을 본 문서에 명시해 둔다.

---

## D-4 — 신설 금지 목록 (헌법 V4 §16 집행)

| 명세 요구 | 정본(신설 금지) | 근거 |
|---|---|---|
| §3-1·§10 Intelligence Platform/Hub | **엔진 13종**(`Insights`/`Decisioning`/`AutoRecommend`/`AttributionEngine`/`CustomerAI`/`Mmm`/`DataPlatform`/`Rollup`) | 헌법 V4 §16 · 058 |
| §3-8 Enterprise Executive Dashboard · §9 Control Tower | **`/dashboard` 종합 대시보드 + `DashCommerce`/`DashChannelKPI`/`DashSystem`** | 057·064 |
| §3-9 Enterprise Audit Center · §12 Audit Trail · §16 `EnterpriseAudited` | **`SecurityAudit`**(체인 정본은 하나) | 056·062 |
| §8 Unified Monitoring · §18 Availability | **`SystemMetrics`**(목데이터 금지 원칙·AI 프로브) | 057 |
| §9 Enterprise Alerting | **`Alerting`** | 058 |
| §13 Enterprise IAM · Zero Trust | **`EnterpriseAuth`(SSO/SAML) + 전역 RBAC·writeGuard·`api_key`** | EPIC 06-A·064 |
| §13 Key Management | ★**부재 확정(062)** — 재판정 금지 |
| §11 Data Synchronization | **`ChannelSync`·`Connectors`** | 상위 Part |

★★**`menu_audit_log.hash_chain` 을 tamper-evident 로 재오염 금지**([[reference_menu_audit_log_not_tamper_evident]]).

---

## D-5 — 실제로 **결여 보강**인 것은 단 2가지

"중복"과 "결여 보강"을 구분한 결과, **정당한 신설 후보는 2건뿐**이다:

1. **Business Health Score**(§9) — `healthScore`·`health_score`·`businessHealth` **grep 0**. 기업 전체 건강도를 **하나의 값**으로 요약하는 개념이 없다.
   ★단 **구성요소는 이미 전부 있다**(ROAS·순이익·정산율·재고·반품률·이상탐지). → **신규 엔진이 아니라 기존 지표의 합성 뷰**로 설계해야 한다.
   ★★**임의 가중치 금지** — 근거 없는 가중합은 [[feedback_real_value_autoderive]] 위반. 산출 불가 시 **`null` + 사유**(057/058/059 정직 미산출 모범).
2. **Cross Domain Correlation**(§10) — `DataProduct.jsx:133~135` 의 unifiedPnl 메트릭이 **부분 구현**이나, 도메인 간 상관을 **자동 발견**하는 기능은 없다.
   ★단 이는 **AI Insight 확장**이지 새 Hub 가 아니다.

나머지 §3 구축 대상 8종은 **전부 기존 자산으로 커버되거나(D-4) 아키텍처 형태 선행 종속(D-2·D-3)**.

---

## D-6 — §17 AI 조항 · §18 SLA · §19 완료 기준

- **§17**: "AI 는 승인 없이 Enterprise Architecture 를 자동 변경하거나 핵심 Governance 정책을 수정하지 않는다" → **현행 충족**(`action_request`+`agent_mode` 승인 게이트·기본값 approval·054 D-2·`CHANGE_GATE`). ★단 **053 Gateway 부재 상속** — AI 호출 단일 통과점이 없다는 구조 문제는 **여전히 미해소**이므로 "완전 통제"라 주장 금지.
- **§18**: API 응답·Availability 는 `SystemMetrics` 관측 대상 / **Platform Discovery·Enterprise Event 처리 SLA 는 "측정 대상 부재"**(스코프 분리·둘 다 참).
- **§19**: **10종 중 다수가 "이미 충족" 또는 "신설 부적절"** 이므로, 본 문서는 **§19 를 그대로 완료 기준으로 채택하지 않는다.** 실질 완료 기준은 **헌법 V4 §18 Completion Rule**(Unified Entity Model·Customer 360·각 Intelligence·Explainable AI·Regression Test·PM History·Intelligence Registry)이다.

---

## D-7 — ★MEA 001~065 종결 선언에 대한 판정

명세 말미는 **"Master Enterprise Architecture(Part 001~065)는 … 통합 엔터프라이즈 아키텍처로 완성되었다"** 고 선언한다.

### 판정: **문서 체계는 완성되었으나, 구현 완성이 아니다.**
- **완성된 것**: 065편의 **설계 명세·판정·거버넌스 문서 체계**
- **완성되지 않은 것**: 051~064 판정상 **PARTIAL/ABSENT 가 다수**(053 Gateway 부재 · 055 RAG · 056 감사 구멍 · 059~062 Registry/엔진 부재 · 063 ESG 공동)

★**"MEA 완성"을 "제품 완성"으로 읽으면 안 된다.** 283차 교훈 **"코드 존재 ≠ 구현 완료"** 의 문서판 — **"명세 완결 ≠ 구현 완결"**.
→ 본 ADR 은 종결 선언을 **문서 체계 종결로만 수용**하고, 구현 상태는 각 Part 판정을 정본으로 유지한다.

---

## 부록 — 오흡수 금지 (상세 GT① §3)

**`enterprise` 405 = 대부분 구독 플랜 등급명 "Enterprise"**(`PlanPricing` 25·`PricingPublic` 24·`planMenuPolicy` 23·`UserAuth` 36·`AuthContext` 14) ≠ Enterprise Architecture **[최대 오탐]** · **`cockpit` 10 = 크리에이티브 코크핏**(`CreativeStudio::cockpit`) ≠ Executive Cockpit · **`iam` 3 = 네이버 SENS 헤더·SSRF 방어 주석** ≠ Enterprise IAM · **`catalog` 248 = 상품 카탈로그** ≠ Service Catalog · **`registry` 38 = OAuth 클라이언트 등록·채널 메타** ≠ Architecture Repository · **`governance` 6 = 데이터 거버넌스(`/data-trust`)** ≠ Enterprise Governance · **`intelligence` 14 = UI 라벨·마케팅 카피·리다이렉트** ≠ Intelligence Hub 엔진 · **`unified` 109 = 대부분 발급가이드·랜딩 카피**(단 `DataProduct.jsx` 7 은 실재)
