# DSAR — Organization Legal Entity Binding (§23)

> EPIC 06-A Part 4-5-3-1-5-3-3-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_1_ORG_HIERARCHY_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_1_ORG_HIERARCHY_VERBATIM.md) §23 · ADR: [ADR_DSAR_REBATE_ORGANIZATION_HIERARCHY_GRAPH_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_ORGANIZATION_HIERARCHY_GRAPH_FOUNDATION.md)

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| **Legal Entity** | `legal_entity`·`legalEntity`·`entity_code`·`biz_no`·`brn`·`corp_reg`·`tax_id` — **backend/src 전역 grep 0**(재확인 완료) | **`ABSENT`**(이름·능력 양쪽) |
| `ORGANIZATION_LEGAL_ENTITY_BINDING` | **grep 0** | `ABSENT` |
| 사업자정보 | `app_user` **프로필 평문 필드** — `business_number`·`ceo_name`·`business_type`·`country`(`UserAuth.php:499` 화이트리스트 · `:1720` liveFields · 노출 `:306-307` · 검증 `:1182-1183`) | 🔴 **엔티티 아님** |
| 🔴 `company_id` | **2건 전부 Adobe Analytics 커넥터 자격증명**(`Connectors.php:3880`·`ChannelRegistry.php:115`) | **법인 아님** |
| 🔴 ★`DATA_SCOPES` 의 `'company'` | `TeamPermissions.php:41` 9종 중 1 — **`effectiveScope():258` `if ($st === 'company') return null;  // 전사 = 무제한`**(재확인) | **무제한 센티넬 — 법인 경계 아님** |
| `app_user.company` | **문자열 1개** — 관계·식별자 아님 | `NAME_ONLY` |
| 세무 집계 | `pnl_vat_summary` tenant 키(`Pnl.php:402-423`) | 🔴 **법인 회계 아님**(구독자별 리포트) |
| 유일 effective date | `kr_fee_rule.effective_from`(`Db.php:898`) · 읽기 전부 `ORDER BY effective_from DESC LIMIT 1` 최신승(`Pnl.php:454`·`KrChannel.php:102`,`:151`,`:459`) · **`WHERE effective_from <= :as_of` 전역 0건** · **`effective_to` 없음** | **as-of 조회 능력 부재** |

### ★최대 함정 — `'company'` 는 법인이 아니라 **무제한 센티넬**
`effectiveScope():258` 은 `scope_type === 'company'` 일 때 **`null` 을 반환**하고, 호출부는 `null` 을 **"미설정 = 무제한"**(`:255-256`)으로 해석한다. 즉 `'company'` 스코프는 **법인 경계를 긋는 게 아니라 지운다.** 🔴 **이름만 보고 Legal Entity Scope 로 계산하면 의미가 정반대다.** `ORG_PRESET` **재무팀**의 `'scope'=>'company'`(`TeamPermissions.php:717`)도 마찬가지로 **재무 법인 경계가 아니라 전사 무제한**이다.

### ★역산 경보 — "테넌트 = 법인" 가정
| 근거 | 실측 |
|---|---|
| 테넌트는 **구독 단위** | plan 을 `parent_user_id IS NULL` owner 계정에서 읽음 — `PlanLimits.php:36-37`(경로 정정: **`backend/src/PlanLimits.php`**, `Handlers/` 아님) `SELECT COALESCE(plans,plan,'free') FROM app_user WHERE tenant_id=? ORDER BY (parent_user_id IS NULL) DESC, id ASC LIMIT 1` |
| 세무 집계도 법인 회계 아님 | `pnl_vat_summary` 의 tenant 키(`Pnl.php:402-423`)는 **구독자별 리포트** |
| 카디널리티 무규정 | **한 법인이 다수 테넌트를 갖거나 그 반대를 막는 것도 표현하는 것도 없다** |
| 테넌트 마스터 부재 | `api_key.tenant_id VARCHAR(100)` **FK 없음**(`Db.php:944`) — 귀속시킬 엔티티 행 자체가 없다 |

🔴 **"테넌트 = 법인" 은 역산이다.** 이 가정을 넣으면 §23 커버리지가 정의상 100% 가 되고 §24 가드 9종이 전부 자명 충족으로 소멸한다.

### ★"정산/세무 메뉴가 있으니 법인이 있다" 도 역산
`ORG_PRESET` 재무팀 perms 의 `settlement`·`billing`·`finance`(`TeamPermissions.php:717`)는 **메뉴 키**이지 회계 책임 엔티티가 아니다. 형태 유사 ≠ 의미 동일.

## 1. 원문 전사 + 판정 — **원문 27종**(필수 필드 17 + Relationship Type 10)

### 1-1. `ORGANIZATION_LEGAL_ENTITY_BINDING` 필수 필드 — **원문 17종**

> 레코드 타입도 대상 엔티티도 부재 → 전 필드 신설.

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | legal entity binding id | 부재 | `NOT_APPLICABLE` |
| 2 | organization unit | 부재 — `org_unit`/`organization_unit` **전역 0**(삭제 이력도 0) | `NOT_APPLICABLE` |
| 3 | legal entity id | 부재 — 🔴 `company_id` 2건 = **Adobe Analytics 자격증명**(`Connectors.php:3880`·`ChannelRegistry.php:115`) · `business_number` 는 `app_user` **프로필 평문 필드**(`UserAuth.php:499`·`:1720`)이지 엔티티 PK 아님 | `NOT_APPLICABLE` |
| 4 | relationship type | 부재 | `NOT_APPLICABLE` |
| 5 | primary 여부 | 부재 | `NOT_APPLICABLE` |
| 6 | employing entity 여부 | 부재 — HRIS/payroll 커넥터 **0** · `reports_to` **0** | `NOT_APPLICABLE` |
| 7 | operating entity 여부 | 부재 | `NOT_APPLICABLE` |
| 8 | funding entity 여부 | 부재 — treasury **0** | `NOT_APPLICABLE` |
| 9 | liability entity 여부 | 부재 | `NOT_APPLICABLE` |
| 10 | accounting entity 여부 | 부재 — 🔴 `pnl_vat_summary`(`Pnl.php:402-423`)의 tenant 키는 **구독자별 리포트**이지 회계 책임 엔티티 아님. ERP/finance 커넥터 **0**(`ChannelRegistry.php:12`,`:79` `group_type` 열거 = sales/marketing/logistics/pg/messaging + analytics·cs·esp·review — **`erp`·`finance`·`hr` 값 없음**) | `NOT_APPLICABLE` |
| 11 | settlement entity 여부 | 부재 — `settlement` 은 **메뉴 키**(`TeamPermissions.php:717`) | `NOT_APPLICABLE` |
| 12 | payout entity 여부 | 부재 · 인접 = `BillingMethod`(`:88` parent 1홉 tenant 해석) — **구독 결제수단**이지 지급 법인 아님 | `NOT_APPLICABLE` |
| 13 | tax entity 여부 | 부재 — **`tax_id` grep 0** · VAT 는 `kr_fee_rule` 율 적용(`Pnl.php:449-454`)이지 납세 주체 모델 아님 | `NOT_APPLICABLE` |
| 14 | valid_from | 부재 — 유일 선례 `kr_fee_rule.effective_from`(`Db.php:898`, 채널 수수료 도메인) · **as-of 술어 `WHERE effective_from <= :as_of` 전역 0건** | `NOT_APPLICABLE` |
| 15 | valid_to | 부재 — **`valid_to`/`effective_to` grep 0** → **폐구간 모델 자체가 신규** | `NOT_APPLICABLE` |
| 16 | status | 부재 · 인접 선례 = `agency_client_link.status`(pending/approved/revoked · `AgencyPortal.php:64-72`) | `LEGACY_ADAPTER`(선례) |
| 17 | evidence | 부재 | `NOT_APPLICABLE` |

**실측 개수: 17 / 17 전사.**

### 1-2. Relationship Type — **원문 10종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | LEGALLY_PART_OF | 부재 — 법인 엔티티 자체가 없음 | `NOT_APPLICABLE` |
| 2 | OPERATED_BY | 부재 | `NOT_APPLICABLE` |
| 3 | EMPLOYED_BY | 부재 — HRIS/workday/payroll 커넥터 **0** | `NOT_APPLICABLE` |
| 4 | FUNDED_BY | 부재 | `NOT_APPLICABLE` |
| 5 | ACCOUNTED_BY | 부재 — ERP/finance 커넥터 **0**(헌법 Vol2 `docs/DATA_SOURCE_ARCHITECTURE_CONSTITUTION.md:71` 이 ERP 를 12분류로 정의하나 **이름만 있고 커넥터·수집·정규화 어느 층도 없다**) | `NOT_APPLICABLE` |
| 6 | SETTLED_BY | 부재 | `NOT_APPLICABLE` |
| 7 | PAID_BY | 부재 · 인접 = Paddle 결제(`Payment.php:1295-1296`) = **플랫폼↔구독자 과금**이지 법인 간 지급 아님 | `NOT_APPLICABLE` |
| 8 | TAX_REPORTED_BY | 부재 — `pnl_vat_summary` 는 tenant 축(`Pnl.php:402-423`) | `NOT_APPLICABLE` |
| 9 | SHARED_SERVICE_BY | 부재 | `NOT_APPLICABLE` |
| 10 | INTERCOMPANY_SUPPORTED_BY | 부재 — intercompany 개념 **0**(테넌트 격리가 크로스 흐름을 원천 차단 `index.php:600`) | `NOT_APPLICABLE` |

**실측 개수: 10 / 10 전사.**

**총 실측 개수: 27 / 27 전사.** 커버리지 = **`VALIDATED_LEGACY` 0** · 부재 26 · 어댑터 1.

## 2. 규칙

- 🔴 **`DATA_SCOPES` 의 `'company'` 를 Legal Entity Scope 로 계산 금지 — 의미가 정반대다.** `effectiveScope():258` 에서 **무제한 센티넬**(`return null`)이다. 법인 경계를 긋는 게 아니라 **지운다**.
- 🔴 **"테넌트 = 법인" 가정 금지 — 역산이다.** 테넌트는 **구독 단위**(plan 을 owner 계정에서 읽음 `backend/src/PlanLimits.php:36-37`)이며, 법인↔테넌트 카디널리티는 **막는 것도 표현하는 것도 없다**.
- 🔴 **`company_id`(Adobe Analytics 자격증명 2건)·`app_user.company`(문자열)·`business_number`(프로필 평문 필드)를 Legal Entity 근거로 계산 금지.**
- 🔴 **`pnl_vat_summary` 를 회계 엔티티 근거로 계산 금지** — tenant 키 = **구독자별 리포트**.
- 🔴 **`settlement`/`billing`/`finance` 메뉴 키를 entity 여부 필드로 계산 금지.**
- **원문 말미 요구**(`Financial Approval Routing에서 단순 Primary Legal Entity만 사용하지 말고 해당 Financial Responsibility Binding을 선택할 수 있게 하라`)는 **현행에서 착수 불가** — Primary 도 Binding 도 Routing 도 전부 부재. 8종 재무 책임 플래그(employing/operating/funding/liability/accounting/settlement/payout/tax)를 **단일 primary 로 축약하는 설계는 원문 위반**이다.
- **시점 모델은 신규다.** `kr_fee_rule.effective_from` 은 **개구간·최신승**이며 as-of 조회 능력이 없다. 🔴 관찰 사실: `Pnl.php:449` 가 기간(`$from`,`$to`)을 받고도 `:454` 는 기간을 무시해 **과거 기간 P&L 도 오늘자 최신 VAT율로 계산**된다 — 주석(`:451`)이 *"테넌트 최신 kr_fee_rule(채널 무관 최신)"* 로 의도를 명시하므로 **설계 선택일 수 있음 · 등급 미부여 · 라이브 확인 필요**. **§23 의 valid_from/valid_to 는 이 선례를 복제하지 말고 폐구간으로 신설**하라.
- **ERP/HRIS 커넥터 신설 시 `ChannelRegistry` 확장 강제** — `group_type`(`:12`,`:79`)·`sync_kind` 열거에 값 증설(선례: analytics `:112`·cs `:116`·esp `:121`·review `:125`). **두 번째 커넥터 엔진 금지**(헌법 Vol2 §14: Connector Registry 등록·Quality Gate·Trust Score·회귀테스트까지 완료해야 완료).
- **스키마 도입 제약**(§20): `ensureTables` 멱등 패턴 · **MySQL/SQLite 두 방언 동시 작성 의무** · **백필 수단 없음**.
