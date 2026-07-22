# MEA Part 065 — GT① EXISTING IMPLEMENTATION (실재 구현 전수조사)

> 289차 후속(2026-07-22) · **코드 변경 0 · NOT_CERTIFIED · 배포 없음** · ★MEA 최종 Part
> 범위: `backend/src`·`backend/bin`·`backend/data`·`tools`·`frontend/src` / 제외: `*.json`·`i18n/**`·`locales_backup/**`·`_archived/**`
> 방법: **단어경계 `\b`(rg -w) + 광의 히트 파일 단위 전수 분류**. file:line 전량 실측.

---

## 0. ★★핵심 판정 — **PARTIAL-substantial**. 062·064와 완전히 다르다

062(ABSENT-heavy)·064(ABSENT-total)와 달리 **065는 실체가 상당히 있다.**

> **본 Part가 요구하는 것의 상당 부분은 이미 `docs/UNIFIED_INTELLIGENCE_LAYER_CONSTITUTION.md`(헌법 V4)로 제정되고 부분 구현되어 있다.**
> 없는 것은 **도메인 기능이 아니라 "메타 계층"** — Registry · Fabric · Repository · Control Tower 같은 **플랫폼을 관리하는 플랫폼**이다.

★그러므로 판정은 **"만들어야 한다"가 아니라 "이미 있는 것을 중복 신설하지 말고, 없는 메타 계층만 얇게 얹어라"** 다(헌법 V4 §16 → ADR D-1).

---

## 1. ★실재 자산 (정직 인정 · 평가절하 금지)

### 1.1 정규화(Canonical) — 헌법 V4 §2 파이프라인의 **Normalized 단계가 실재**

| file:line | 내용 |
|---|---|
| `backend/src/Handlers/KrChannel.php:240` | **"Accepts channel-specific raw field names and normalizes to canonical schema"** |
| `KrChannel.php:310~311` | `$canonical = $aliasMap[$col] ?? $col; $n[$canonical] = $val;` — **alias 맵 기반 실 정규화** |
| `KrChannel.php:18` · `:161` | **Canonical settlement fields** 정의(라인 단위 정산 표준 필드) |

★**채널별 raw 필드명을 표준 스키마로 흡수하는 로직이 실제로 동작한다.** 헌법 V4 §2 `Raw → Validated → Normalized` 의 세 번째 단계에 해당.

### 1.2 아이덴티티 통합 — 헌법 V4 §4 Customer 360 의 **핵심이 실재**

| file:line | 내용 |
|---|---|
| `backend/src/Handlers/CRM.php:107` | "한 사람의 다중 연락처(email/phone/kakao)를 **canonical identity_id 로 통합**" |
| `CRM.php:194` | 동일 phone/kakao 보유 고객과 canonical identity 통합(best-effort) |
| `CRM.php:556`·`:597` | **테넌트 전체 아이덴티티 재해석 — union-find 로 클러스터링**, canonical identity_id 부여 |
| `CRM.php:877`·`:880`·`:884~886` | **더 큰 클러스터를 canonical 로 채택**, 작은 쪽 멤버 전부 이전 · `moved` 건수 반환 |

★**LTV/세그먼트 파편화 방지를 위한 실제 엔티티 해석(entity resolution)** 이다. §3 Unified Entity Model 의 Customer 축 구현.

### 1.3 통합 데이터 모델 — `domain: "unified"` 가 실재

`frontend/src/pages/DataProduct.jsx`

| 위치 | 내용 |
|---|---|
| `:133` | `{ group:"unifiedPnl", name:"Blended ROAS", formula:"attributed_revenue / (spend + ad_fee)", domain:"unified" }` |
| `:134` | `True ROAS = net_payout / (spend + fees)` |
| `:135` | `EBITDA Contribution = net_payout - spend - creator_cost - logistics` |
| `:145` | 규칙 `R007` — `SKU Blended ROAS < avg × 0.7`, `domain:"unified"` |
| `:153` | 도메인 색상표에 `unified` 1급 항목 |
| `:413`·`:417` | 도메인별 표준필드·메트릭 수 집계(UI) |

★**교차 도메인 메트릭(광고+정산+물류+크리에이터를 한 수식에)이 실재**한다 — §10 Cross Domain Correlation 의 부분 구현.

### 1.4 Intelligence 엔진 — **13종 실재** (★신설 금지 대상)

`backend/src/Handlers/` 실측:
`Insights.php` · `Decisioning.php` · `AutoRecommend.php` · `AttributionEngine.php` · `Attribution.php` · `AttributionMetrics.php` · `CustomerAI.php` · `Mmm.php` · `MmmReportI18n.php` · `DataPlatform.php` · `Rollup.php` · `Alerting.php` · `EnterpriseAuth.php`

→ §10 Enterprise Intelligence Hub 가 요구하는 **Unified Analytics · AI Insight · Recommendation · Decision Intelligence · Predictive** 는 **이미 엔진이 있다**(058 확정). ★**Hub 를 신설하면 헌법 V4 §16 정면 위반**.

### 1.5 관측·감사·인증 (상위 Part 확정 · ★재판정 금지)

| 자산 | file:line | 상속 |
|---|---|---|
| **`SystemMetrics`** 관측 정본(목데이터 금지 원칙 + **AI Gateway 프로브**) | `SystemMetrics.php:15~19` · `probeAi`(289차 후속 신설·배포) | 057 |
| **`SecurityAudit`** 유일 tamper-evident | `SecurityAudit.php:44~52` · **`verify()`:55~68** | 056·062 |
| **`EnterpriseAuth`** SSO/SAML 서명 검증 | `EnterpriseAuth.php:536`·`:600` | 064 |
| **`Compliance`** SIEM 포워딩(RFC 5424) | `Compliance.php:238`·`:243` | 057 |
| 대시보드 | `DashCommerce.jsx:13`("Platform Intelligence") · `DashChannelKPI.jsx:17`("Channel Intelligence") · `DashSystem.jsx`(176차 ZERO-MOCK) · `/dashboard` 종합 대시보드(`sidebarMenuLabels.js:81`) | 057·064 |
| **크리에이티브 코크핏** | `CreativeStudio::cockpit`(`CreativeStudio.php:324` · 라우트 `routes.php:856~857` · `CreativeStudioTab.jsx:130`·`:196`) | 245차 P1-2 |

---

## 2. ABSENT — 부재증명 (rg -w 실측 0)

### 2.1 §5 Canonical Entity 15종 — **전량 형식 부재**
`enterprise_platform` · `enterprise_service` · `enterprise_domain` · `enterprise_capability` · `enterprise_process` · `enterprise_policy` · `enterprise_standard` · `enterprise_kpi` · `enterprise_event` · `enterprise_resource` · `enterprise_reference_model` · `enterprise_analytics` · `enterprise_portfolio` · `enterprise_version` · `enterprise_audit` → **전부 0**

### 2.2 메타 계층 용어 — 전량 0
`control_tower` · `integration_fabric` · `knowledge_fabric` · `automation_fabric` · **`fabric`** · `service_catalog` · `service_discovery` · `metadata_federation` · **`federation`** · `event_bus` · `canonical_model` · `zero_trust` · `unified_identity`

### 2.3 개별 기능 부재
- **Business Health Score**(§9) — `healthScore`·`health_score`·`businessHealth` **0건**
- **Enterprise Architecture Repository**(§3-6) — 부재
- **Platform Discovery / Platform Registry**(§14·§16 `PlatformRegistered`) — 부재
- **Unified Event Bus**(§8) — 부재(이벤트는 각 핸들러가 직접 처리)

> ★**부재의 성격**: 도메인 기능이 아니라 **"플랫폼을 등록·발견·연결·통제하는 메타 계층"** 이 없다. 이는 **단일 애플리케이션(모놀리식 Slim 앱)에는 원래 필요 없는 계층**이기도 하다 — 다수의 독립 플랫폼이 물리적으로 분리돼 있을 때 필요한 구조다.

---

## 3. ★역방향 오흡수 금지 (실측 분류)

| 토큰 | 히트 | 실제 정체 | 판정 |
|---|---|---|---|
| **`enterprise`** | **405** | ★**압도적 다수가 구독 플랜 등급명 "Enterprise"** — `PlanPricing.jsx` 25 · `PricingPublic.jsx` 24 · `planMenuPolicy.js` 23 · `UserAuth.php` 36 · `AuthContext.jsx` 14. 나머지는 `EnterpriseAuth`(SSO) 라우트(`routes.php` 43) | ★**Enterprise Architecture 아님 — 최대 오탐** |
| **`unified`** | 109 | `issuanceGuide.*.js`(15개국 발급가이드 8×) · `Landing.jsx` 7 마케팅 카피 · **`DataProduct.jsx` 7 = 실재 도메인**(§1.3) | 혼재 — **DataProduct 만 실재** |
| **`intelligence`** | 14 | `/marketing-intelligence` → `/ai-insights` **리다이렉트**(`App.jsx:532`) · `PublicLayout.jsx:103` **마케팅 카피** "Unified Revenue Intelligence Platform" · 대시보드 제목 주석 · `CommandPalette.jsx:27` 키워드 · `GlobalSearch.jsx:15` 라벨 | ★**UI 라벨/카피** — Intelligence Hub 엔진 아님 |
| **`cockpit`** | 10 | **`CreativeStudio::cockpit`** — **크리에이티브 코크핏**(광고 소재 성과·Triple Whale 대응) | ★**Executive Cockpit(경영 관제) 아님** — 인접하나 스코프 상이 |
| **`registry`** | 38 | `routes.php` 8 · **`OAuth.php` 7**(OAuth 클라이언트 등록) · `channelMeta.js` 3 · `Wms.php` 3 · `ApiKeys.jsx` 2 | ★**Enterprise Architecture Repository 아님** |
| **`governance`** | 6 | **데이터 거버넌스 → `/data-trust`**(`RoleViewBar.jsx:20`) · 사이드바 푸터 카피(`Sidebar.jsx:702`) · ESG 가이드 문구(`perfGuideI18n.js` — 289차 후속 수정분) | ★**Enterprise Governance 아님**(063 동일 판정) |
| **`iam`** | 3 | **네이버 SENS 헤더 `x-ncp-iam-access-key`**(`NaverSms.php:68`) · 파트너 패널 주석 · **SSRF 방어 주석**("IAM 크리덴셜 탈취" `JourneyBuilder.php:928`) | ★**Enterprise IAM 아님 — 완전 오탐** |
| **`catalog`** | 248 | **상품 카탈로그**(catalog-sync 등) | ★**Enterprise Service Catalog 아님** |
| `canonical` | 54 | ★**§1.1·§1.2 실재 자산** + `RulesEditorV2`·`Paddle`·`PgSettlement`·`triage_apply.mjs` | **실재**(오탐 아님) |

---

## 4. 부수 발견

**신규 실결함 0건.**

★단 참고: `PublicLayout.jsx:103` 공개 마케팅 카피 **"Unified Revenue Intelligence Platform for global commerce teams"** 는 **063 ESG 유형의 허위 약속이 아니다** — §1.1~§1.4 실재 자산(정규화·아이덴티티 통합·교차도메인 메트릭·엔진 13종)이 이 문구를 **실질적으로 뒷받침**한다. **과대주장 아님으로 판정.**

---

## 5. 인용 무결성

file:line 전량 본 세션 rg 실측. 가설 인용 0. ★064 인계서의 조사 후보(`Decisioning`·`AutoRecommend`·`Insights`·`AttributionEngine`·`CustomerAI`·`Mmm`·`DataPlatform`)는 **가설로만 사용**했고, 실제 인용은 재검증분만 채택했다(핸들러 존재는 `ls` 실측).
