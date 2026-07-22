# MEA Part 065 — CANONICAL ENTITIES (§5 15엔티티 · §6~§11 도메인 판정)

> 289차 후속(2026-07-22) · **코드 변경 0 · NOT_CERTIFIED · 배포 없음** · ★MEA 최종 Part
> 근거 전량 [`GT①`](MEA_PART065_EXISTING_IMPLEMENTATION.md) 실측.
> ★판정 어휘(065에서 **제6항 추가**): "미달"vs"측정 기반 부재" · "미구현"vs"인프라 선행 종속" · "중복"vs"결여 보강" · "부실"vs"선행 개념 부재" · "미달"vs"사업 범위 밖"(064) · **NEW: "미구현"vs"아키텍처 형태 선행 종속"**

---

## 1. §5 Canonical Entity 15종

★**형식 명칭(`enterprise_*`)은 전량 0**이나, **개념적 대응물이 실재하는 것과 아닌 것을 구분**해야 한다. 뭉뚱그려 ABSENT 처리하면 부재 과장이 된다.

| # | 엔티티 | 판정 | 근거 |
|---|---|---|---|
| 1 | ENTERPRISE_PLATFORM | **ABSENT — 아키텍처 형태 선행 종속** | 등록할 독립 플랫폼이 물리적으로 없음(단일 Slim 앱) |
| 2 | ENTERPRISE_SERVICE | **ABSENT** | `service_catalog`·`service_discovery` 0 |
| 3 | **ENTERPRISE_DOMAIN** | ★**PARTIAL** | `DataProduct.jsx:153`·`:413`·`:417` — **도메인 분류 체계 실재**(`unified` 포함, 도메인별 표준필드·메트릭 집계) |
| 4 | ENTERPRISE_CAPABILITY | **ABSENT** | — |
| 5 | **ENTERPRISE_PROCESS** | ★**PARTIAL** | **`JourneyBuilder`**(워크플로 노드·064 확정) · `RuleEngine`(058) — 프로세스 정의·실행 실재. 단 **"엔터프라이즈 프로세스" 메타 개념은 아님** |
| 6 | **ENTERPRISE_POLICY** | ★**PARTIAL** | `tabPlanPolicy.js`·`planMenuPolicy.js`(플랜 정책) · 전역 writeGuard · `agent_mode` 승인정책 · `CHANGE_GATE` — **정책은 실재하나 통합 정책 레지스트리는 부재** |
| 7 | **ENTERPRISE_STANDARD** | ★**PARTIAL** | **`KrChannel.php:18`·`:161`·`:240`·`:310~311` canonical 정산 스키마** = 표준 정의·정규화 실재 |
| 8 | **ENTERPRISE_KPI** | ★**PARTIAL** | `Rollup`·`DataProduct.jsx:133~135`(Blended/True ROAS·EBITDA) · `Reports::generateKpiSummary`(`Reports.php:116`) |
| 9 | ENTERPRISE_EVENT | **ABSENT** | `event_bus` 0 — 이벤트는 각 핸들러 직접 처리 |
| 10 | ENTERPRISE_RESOURCE | **ABSENT** | 064 판정과 동일(연산/플랫폼 자원 개념 없음) |
| 11 | ENTERPRISE_REFERENCE_MODEL | **ABSENT** | Architecture Repository 부재 |
| 12 | **ENTERPRISE_ANALYTICS** | ★**PARTIAL-strong** | 엔진 13종(`Insights`/`Decisioning`/`AutoRecommend`/`AttributionEngine`/`CustomerAI`/`Mmm`/`DataPlatform`/`Rollup`) |
| 13 | **ENTERPRISE_PORTFOLIO** | ★**PARTIAL** | `PM/Portfolio`(PM 포트폴리오·064 `evm` 확정) — ★단 **프로젝트 포트폴리오**이지 **플랫폼 포트폴리오가 아님**(스코프 분리) |
| 14 | ENTERPRISE_VERSION | **ABSENT** | 버전 관리 메타 엔티티 부재(라우트 `/vNNN` 은 API 버저닝이지 자산 버전 아님) |
| 15 | **ENTERPRISE_AUDIT** | ★**PARTIAL-strong** | **`SecurityAudit`**(`:44~52`·**`verify()`:55~68**) = 저장소 유일 tamper-evident(056·062) |

### ★총계
**ABSENT 8 · PARTIAL 7**(그중 PARTIAL-strong 2).
→ ★**062(13/15 ABSENT)·064(15/15 ABSENT)와 명확히 다른 등급.** **PARTIAL-substantial**.

---

## 2. §6 Enterprise Reference Domain 10종 — ★**대부분 실재**

| 도메인 | 판정 | 근거 |
|---|---|---|
| **Enterprise Data Platform** | ★**실재** | `DataPlatform` · `DataSchema` · `DataProduct` · 데이터 신뢰(`/data-trust`) |
| **ROI Intelligence Platform** | ★**실재**(제품의 본체) | `Rollup`·`Pnl`·`Mmm`·`AttributionEngine`·`Insights` |
| **Commerce Platform** | ★**실재** | `ChannelSync`·`OrderHub`·`KrChannel`·카탈로그 |
| **Logistics Platform** | ★**실재** | `Wms`·`Logistics`·`SupplyChain`·`ReturnsPortal` |
| **Developer Platform** | ★**실재** | `OpenPlatform`·`ApiKeys`·개발자 포털·웹훅 |
| **Security Platform** | ★**실재** | `SecurityAudit`·`EnterpriseAuth`(SSO/SAML)·`Crypto`·RBAC·writeGuard |
| **AI Platform** | ★**실재** | `ClaudeAI`·`AiGenerate`·`CustomerAI`·`Decisioning`·`AutoRecommend` |
| **IoT Platform** | **ABSENT**(061 확정·재판정 금지) | `WmsCctv` 는 영상장치이지 Device 플랫폼 아님 |
| **ESG Platform** | **ABSENT**(063 확정·재판정 금지) | 표면만 존재 → 289차 후속에 **정직화 수정·배포 완료** |
| **Enterprise Governance** | ★**PARTIAL** | `CHANGE_GATE`·헌법 5권·`action_request` 승인·RBAC — **거버넌스는 실재하나 통합 정책 레지스트리는 부재** |

> ★**10개 중 7개가 실재**한다. 065 의 "모든 플랫폼을 통합" 요구에서 **통합 대상이 실제로 존재**한다는 뜻이며, 이것이 **중복 신설 위험을 최고로 만드는 이유**다(GT② §1).

---

## 3. §7 Enterprise Lifecycle 10단계

**메타 개념으로는 ABSENT** — Strategy/Architecture/Design/Build/Integration/Operation/Optimization/Innovation/Modernization/Continuous Evolution 을 **자산으로 관리하는 체계**는 없다.

★단 **실질적으로는 이 저장소가 그 자체로 수행 중**이다: 헌법 5권(Strategy/Architecture) · MEA 001~065(Architecture/Design) · `CHANGE_GATE`(Build 게이트) · PM 이력 2편(Operation 기록) · 289차 감사 시리즈(Optimization/Modernization).
→ **"미구현"이 아니라 "문서·프로세스로 수행되고 코드 엔티티로 관리되지 않음"**(정직 표기).

---

## 4. §8 Unified Intelligence Platform 8종

| 기능 | 판정 |
|---|---|
| **Cross Platform Integration** | ★**PARTIAL** — `ChannelSync`/`Connectors`/`OAuth` 로 외부 통합 실재. 단 **내부 플랫폼 간 표준 인터페이스는 부재**(같은 앱이라 직접 호출) |
| **Unified Metadata** | ★**PARTIAL** — `KrChannel` canonical 스키마 · `DataProduct` 도메인/표준필드. **메타데이터 페더레이션(`metadata_federation` 0)은 부재** |
| Unified Event Bus | **ABSENT — 아키텍처 형태 선행 종속** |
| Enterprise Knowledge Fabric | **ABSENT**(`fabric` 0) ★단 **챗봇 지식 파이프라인**(`gen_chatbot_knowledge.mjs`·270차)·`geniegoFeatureDetails`(053) 는 **인접 실재** |
| Enterprise AI Fabric | **ABSENT** ★053 Gateway 부재 상속 — **AI 호출 단일 통과점이 없다**는 것이 곧 AI Fabric 부재의 실질 |
| **Unified Identity** | ★**PARTIAL** — `EnterpriseAuth`(SSO/SAML) · `api_key` · 세션 · **`CRM` canonical identity**(`:597`·`:877~886`). 단 형식 `unified_identity` 0 |
| **Unified Monitoring** | ★**실재** — `SystemMetrics`(057·AI 프로브 포함) → **신설 금지**(GT② DUP-3) |
| Enterprise Control Tower | **ABSENT**(형식) ★`/dashboard` 종합 대시보드가 인접 → **신설 금지**(GT② DUP-1) |

---

## 5. §9 Control Tower 8종 · §10 Intelligence Hub 8종 · §11 Integration Framework 8종

| 절 | 판정 요약 |
|---|---|
| **§9** | **Real-Time Monitoring·Cross Domain Analytics·Enterprise Alerting = 실재**(`SystemMetrics`·`DataProduct` unifiedPnl·`Alerting`) / **Business Health Score = ABSENT**(grep 0·★**결여 보강 정당**·GT② GAP-1) / Executive Cockpit·Strategic Decision Dashboard = **인접 실재**(`/dashboard`·`CreativeStudio::cockpit` — ★단 코크핏은 **크리에이티브 스코프**) |
| **§10** | ★**8종 중 6종 대응 엔진 실재**(Unified Analytics·AI Insight·Recommendation·Predictive·Decision Intelligence·Executive Intelligence). **Cross Domain Correlation 자동발견 = 결여 보강**(GAP-2) · Knowledge Discovery = 055 판정 상속(PARTIAL-weak) |
| **§11** | **API/Event/Data Sync = 외부 연동으로 실재**(`ChannelSync`·`Connectors`) / **Metadata Federation·Service Discovery·Service Catalog = ABSENT — 아키텍처 형태 선행 종속** / **Cross Platform Workflow = `JourneyBuilder` 인접**(단 마케팅 여정 스코프) |

---

## 6. ★부재의 성격 (한 줄 요약)

> **없는 것은 "무엇을 아는가"(도메인 인텔리전스)가 아니라 "플랫폼을 등록·발견·연결·통제하는 메타 계층"이다.**
> 그리고 그 메타 계층은 **단일 모놀리식 앱에는 원래 필요 없다** — 도메인이 물리적으로 분리될 때 비로소 의미를 갖는다(ADR D-2·D-3).
