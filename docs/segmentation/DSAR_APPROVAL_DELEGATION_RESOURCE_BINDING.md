# DSAR — Approval Delegation Resource Binding (§13)

> EPIC 06-A-01 Rebate Delegation Foundation · 289차 12회차(2026-07-18) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_01_DELEGATION_FOUNDATION_VERBATIM.md](SPEC_06A_01_DELEGATION_FOUNDATION_VERBATIM.md) §13(줄 885-911) · ⓑ전수조사: [DSAR_APPROVAL_DELEGATION_EXISTING_IMPLEMENTATION.md](DSAR_APPROVAL_DELEGATION_EXISTING_IMPLEMENTATION.md) §2·§3.3
> 분모: 측정기 `node tools/measure_spec_denominator.mjs SPEC_06A_01_DELEGATION_FOUNDATION_VERBATIM.md --sec=13` = **18**(불릿 18·번호 0). 육안 계수 금지.

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| `APPROVAL_DELEGATION_RESOURCE_BINDING` 엔티티 | `delegation_resource_binding`·`resource_type`(Delegation 문맥) grep **0** — Delegation-bound Resource 개념 부재(ⓑ §1) | `NOT_APPLICABLE`(부재→신설) |
| 마케팅/업무 엔티티 인접(일부 실재) | `pm_projects`(`PM/Projects.php:30`)·`brand_name`(`DataPlatform.php:57`)·`customer_id`(`Crm.php:60`)·`budget`(`AutoCampaign.php:50`)·`partner_id`(`ChannelSync.php:1797`·`AgencyPortal` agency_client_link) — **전부 도메인 엔티티 · Delegation 에 bound 되지 않음** | `KEEP_SEPARATE_WITH_REASON` |
| 회계 스코프 축 | 🔴 `cost_center`·`profit_center` grep **0** — 원가/이익 센터 엔티티 자체 부재 | `ABSENT` |
| Resource Scope 해석기 | 인접 = `acl_permission` scopeSql 데이터-행 필터(`TeamPermissions.php:286`) — 메뉴×action 스코프이지 Delegation Resource 스코프 아님(장식) | `LEGACY_ADAPTER` |

★**엔티티 전체가 부재하므로 필드 단위 커버는 원천 불가.** 아래는 원문 전사(신설 명세)이며, 마케팅 엔티티 인접은 "존재하되 Delegation-bound 아님(KEEP_SEPARATE)"으로, 부재 축은 grep 0 근거로 기록한다.

## 1. 원문 전사 + 판정 — **원문 18종**(필수 필드 18)

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | approval_delegation_resource_binding_id | Delegation 엔티티 부재 → PK 없음 | `NOT_APPLICABLE` |
| 2 | approval_delegation_version_id | Delegation Version(§10) 부재(ⓑ §2.5) | `NOT_APPLICABLE` |
| 3 | resource_type | 🔴 Delegation 문맥 `resource_type` grep **0** — 위임 리소스 타입 축 부재 | `ABSENT` |
| 4 | resource_id | 🔴 Delegation-bound `resource_id` grep **0** | `ABSENT` |
| 5 | include descendants 여부 | 🔴 리소스 계층 하강 포함 플래그 — Delegation 리소스 계층 개념 자체 부재 | `ABSENT` |
| 6 | program_id | 🔴 `program_id` 컬럼 grep **0** — "program" 히트는 WhatsApp 템플릿명·LiveCommerce 스트림명(`LiveCommerce.php:857`) 오탐. Rebate/Loyalty Program 엔티티 부재 | `ABSENT` |
| 7 | project_id | 인접 = `pm_projects`(`PM/Projects.php:30`·PM 태스크 도메인) — Delegation-bound 아님 | `KEEP_SEPARATE_WITH_REASON` |
| 8 | brand_id | 인접 = `tenant_business_profile.brand_name`(`DataPlatform.php:57`·마케팅 프로필) — Delegation-bound 아님 | `KEEP_SEPARATE_WITH_REASON` |
| 9 | partner_id | 인접 = `ChannelSync.php:1797`(Shopee OAuth 자격 partner_id·오탐)·`AgencyPortal` agency_client_link(대행사 접근 N:N) — Delegation-bound 아님 | `KEEP_SEPARATE_WITH_REASON` |
| 10 | customer_id | 인접 = CRM `customer_id`(`Crm.php:60`) — Delegation-bound 아님 | `KEEP_SEPARATE_WITH_REASON` |
| 11 | cost_center_id | 🔴 `cost_center` grep **0** — 원가센터 엔티티 부재 | `ABSENT` |
| 12 | profit_center_id | 🔴 `profit_center` grep **0** — 이익센터 엔티티 부재 | `ABSENT` |
| 13 | budget_id | 인접 = `AutoCampaign` `budget` 컬럼(`AutoCampaign.php:50`·캠페인 예산) — `budget_id` 별도 엔티티 아님·Delegation-bound 아님 | `KEEP_SEPARATE_WITH_REASON` |
| 14 | exclusion references | 🔴 Delegation Scope 제외 참조 표현 0 — `acl_permission`=allow-only·explicit deny/exclusion 부재(ⓑ §3.4) | `ABSENT` |
| 15 | valid_from | 인접 = `kr_fee_rule.effective_from`(수수료 open-interval·질의계층·Resource Binding 아님) — Binding 엔티티엔 없음 | `LEGACY_ADAPTER` |
| 16 | valid_to | 🔴 `valid_to`/`effective_to` grep **0** → 폐구간 신규 | `ABSENT` |
| 17 | status | 인접 = 상태전이 다수이나 **합법 전이집합 선언 0**(전 도메인·ⓑ §2.2) | `LEGACY_ADAPTER` |
| 18 | evidence | 정본 = `SecurityAudit::verify()`(`SecurityAudit.php:56-68`) · 🔴`menu_audit_log.hash_chain` 인용 금지([[reference_menu_audit_log_not_tamper_evident]]) | `LEGACY_ADAPTER` |

**실측 개수: 18 / 18 전사.** 커버리지 = **`VALIDATED_LEGACY` 0** · `KEEP_SEPARATE_WITH_REASON` 5 · `ABSENT` 8 · `LEGACY_ADAPTER` 3 · `NOT_APPLICABLE` 2 · `BLOCKED_PREREQUISITE` 0.

> 🔴 **커버 0.** Resource Binding 엔티티가 통째로 부재하므로 어떤 필드도 `VALIDATED_LEGACY` 가 아니다. `KEEP_SEPARATE_WITH_REASON` 5건(project/brand/partner/customer/budget)은 **다른 도메인에 실재하는 엔티티**이나 Delegation 에 bound 되지 않으므로 **통합 대상이 아니라 분리 유지**다 — Delegation Resource Binding 이 이들을 참조하려면 신규 조인 테이블이 필요하지 이들 컬럼을 재사용해선 안 된다. `program_id`/`cost_center_id`/`profit_center_id`(ABSENT)는 grep 0 로 부재 확정.

## 2. 규칙

- 🔴 **마케팅/업무 엔티티(project/brand/partner/customer/budget)를 Delegation Resource 로 오인 재사용 금지**(KEEP_SEPARATE) — 이들은 각 도메인 SoT 다. Delegation Resource Binding 은 **별도 조인 엔티티**로 이들 id 를 참조하되, 스코프 축소·include descendants·exclusion 은 Binding 자체가 소유하라.
- 🔴 **`cost_center_id`/`profit_center_id` 를 "있음"으로 표기 금지**(grep 0) — 원가/이익 센터 엔티티가 부재다. 재무 경계 위임을 표현하려면 Cost/Profit Center 마스터를 선결해야 한다.
- 🔴 **`resource_type`/`resource_id` 를 느슨한 VARCHAR 로 두지 마라** — polymorphic FK 는 무결성 검증 불가하다. 참조 대상 도메인별 화이트리스트 + include descendants 상한(§15 Organization Binding maximum descendant depth 패턴 참조)으로 강제하라.
- 🔴 **`exclusion references` 를 생략하지 마라**(5.6 최소권한) — 기본값은 Full 이 아니라 Partial 이며 명시적 제외가 필요하다. `acl_permission` allow-only(ⓑ §3.4)를 상속하지 말고 Binding 에 exclusion 을 1급 필드로 두라.
