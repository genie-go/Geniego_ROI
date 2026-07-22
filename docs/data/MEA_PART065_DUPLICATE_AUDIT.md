# MEA Part 065 — GT② DUPLICATE AUDIT (중복 신설 위험 전수 감사)

> 289차 후속(2026-07-22) · **코드 변경 0 · NOT_CERTIFIED · 배포 없음** · ★MEA 최종 Part
> ★★**본 Part는 MEA 시리즈에서 중복 위험이 가장 높다** — 명세가 "모든 플랫폼을 하나로 통합"을 요구하는데, 통합 대상이 **이미 전부 존재**하기 때문이다.
> 정본: **헌법 V4 §16** "Intelligence Layer는 하나만 존재한다. 새로운 Intelligence Engine을 중복 생성하지 않는다."

---

## 0. 요약

| 구분 | 건수 |
|---|---|
| **★DUPLICATE-CRITICAL**(신설 = 헌법 V4 §16 정면 위반) | **3** |
| **★DUPLICATE-HIGH**(신설 시 명백한 중복) | **5** |
| **결여 보강**(정당한 신설 후보) | **2** |
| **아키텍처 형태 선행 종속**(지금 만들면 과설계) | **4** |

---

## 1. ★DUPLICATE-CRITICAL — 신설 시 **헌법 V4 §16 정면 위반**

### DUP-C1 · §3-1 "Enterprise Unified Intelligence Platform" / §2 "Unified Intelligence Platform"
**헌법 V4 자체가 이 플랫폼이다.** `docs/UNIFIED_INTELLIGENCE_LAYER_CONSTITUTION.md` §2 가 파이프라인을, §3 이 Unified Entity Model 28엔티티를, §4~§13 이 각 Intelligence 를 이미 규정한다.
→ **신설 = 헌법을 두 번 만드는 것.**

### DUP-C2 · §3-4·§10 "Enterprise Intelligence Hub"
실재 엔진 **13종**: `Insights` · `Decisioning` · `AutoRecommend` · `AttributionEngine` · `Attribution` · `AttributionMetrics` · `CustomerAI` · `Mmm` · `MmmReportI18n` · `DataPlatform` · `Rollup` · `Alerting` · `EnterpriseAuth`
§10 이 요구하는 Unified Analytics · AI Insight · Recommendation · Decision Intelligence · Predictive 는 **전부 대응 엔진이 있다**(058 확정).
→ **Hub 신설 = 14번째 엔진 = §16 위반.** 필요한 것은 **엔진 위 얇은 조회/조합 계층**뿐.

### DUP-C3 · §3-7 "Cross-Domain Intelligence Service"
`DataProduct.jsx:133~135` 의 **unifiedPnl 메트릭**(Blended ROAS·True ROAS·EBITDA Contribution)이 **이미 광고+정산+물류+크리에이터를 한 수식에 묶고 있다**. `:145` R007 규칙도 `domain:"unified"`.
→ **교차 도메인 계산은 이미 존재.** 신설이 아니라 **확장**.

---

## 2. ★DUPLICATE-HIGH — 신설 금지

| # | 명세 요구 | 정본 | file:line |
|---|---|---|---|
| DUP-1 | §3-2·§9 Enterprise Control Tower / Executive Cockpit | **`/dashboard` 종합 대시보드 + `DashCommerce`/`DashChannelKPI`/`DashSystem`** | `sidebarMenuLabels.js:81` · `DashCommerce.jsx:13` · `DashChannelKPI.jsx:17` · `DashSystem.jsx`(176차 ZERO-MOCK) |
| DUP-2 | §3-9 Enterprise Audit Center · §12 Audit Trail · §16 `EnterpriseAudited` | **`SecurityAudit`** — 체인 정본은 하나 | `SecurityAudit.php:44~52` · **`verify()`:55~68** |
| DUP-3 | §8 Unified Monitoring · §14 Monitoring · §18 Availability | **`SystemMetrics`**(목데이터 금지 원칙 + AI 프로브) | `SystemMetrics.php:15~19` · `probeAi` |
| DUP-4 | §9 Enterprise Alerting | **`Alerting`** | 058 확정 |
| DUP-5 | §11 Data Synchronization · API Integration | **`ChannelSync`·`Connectors`·`OAuth`** | 상위 Part 확정 |

★**신규 페이지·신규 사이드바 메뉴 신설 금지**([[feedback_minimize_new_menus]]) — 특히 DUP-1.

---

## 3. 결여 보강 — **정당한 신설 후보는 단 2건**

### GAP-1 · **Business Health Score**(§9)
`healthScore` · `health_score` · `businessHealth` **grep 0** — 기업 전체 건강도를 하나의 값으로 요약하는 개념이 없다.
★**단 구성요소는 전부 실재**(ROAS·순이익·정산율·재고·반품률·이상탐지) → **신규 엔진이 아니라 기존 지표의 합성 뷰**.
★★**임의 가중치 금지** — 근거 없는 가중합은 **[[feedback_real_value_autoderive]] 위반**. 산출 불가 시 **`null` + 사유**(057 `SystemMetrics` null · 058 `Mmm::frontier` `optimized:false` · 059 `PriceOpt` null/422 · 063 `noData` **4연속 모범 승계**).

### GAP-2 · **Cross Domain Correlation 자동 발견**(§10)
`DataProduct` 의 unifiedPnl 은 **사람이 정의한 수식**이다. 도메인 간 상관을 **자동으로 발견**하는 기능은 없다.
★단 이는 **AI Insight(`Insights`) 확장**이지 새 Hub 가 아니다 — DUP-C2 와 충돌하지 않도록 **기존 엔진 내부 기능으로** 설계.

---

## 4. 아키텍처 형태 선행 종속 — **지금 만들면 과설계**

| 요구 | 부재증명 | 왜 지금이 아닌가 |
|---|---|---|
| Enterprise Architecture Repository(§3-6) | grep 0 | 등록할 "독립 플랫폼"이 물리적으로 존재하지 않음 |
| Platform Discovery / Platform Registry(§14·§16) | `control_tower`·registry 형식 0 | **Registry 는 분리된 것을 잇는 장치** — 분리가 없으면 레지스트리를 위한 레지스트리 |
| Unified Event Bus(§8) | `event_bus` 0 | 단일 프로세스 내 직접 호출로 충분. 버스는 **프로세스 분리 후** 의미 |
| Integration/Knowledge/Automation **Fabric**(§2·§8) | **`fabric` 0** | 동상 |

★**ADR D-3**: 058~064 의 "Registry 부재 7연속" 은 **065 가 귀착점**이나, **필요해지는 조건**(도메인의 물리적 분리·다중 배포 단위 등장)이 충족되기 전에는 만들지 않는다.

---

## 5. 결론

> **065 에서 신설해야 할 것은 사실상 2건(Business Health Score · Cross Domain Correlation)뿐이며, 둘 다 "새 엔진"이 아니라 "기존 자산의 합성/확장"이다.**
> 나머지는 **이미 있거나(DUP 8건), 아키텍처 형태가 바뀌기 전에는 만들면 안 되는 것(4건)** 이다.
>
> ★본 문서의 실질 가치: **MEA 시리즈 최종 Part 의 "통합" 요구가 중복 신설로 번역되지 않도록 막는 방화벽.**
