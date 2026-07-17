# DSAR — Cache 원칙 (§80)

> EPIC 06-A Part 4-5-3-1-5-3-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md) §80 · ADR: [ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md](../architecture/ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md)

## 0. 현행 실측 (file:line)

### 🔴 ★대전제 — **서버 캐시 계층 자체가 부재다**

| 축 | 실측 |
|---|---|
| **Redis** | `backend/src` 전역 **파일 히트 0**(실측 재확인) |
| **Memcached** | **파일 히트 0**(실측 재확인) |
| **APCu** | `apcu_*` 히트 = **`SystemMetrics.php:225-451` 전량** — `apcu_cache_info(true)`(`:235`)·`apcu_sma_info(true)`(`:236`)·`apcu_fetch`(`:428`,`:433`) → 🔴**지표 보고 전용**이지 **애플리케이션 캐시가 아니다** |
| **프론트 캐시** | `g_admin_menu_tree_cache`(`MenuVisibilityContext.jsx:28` · `CACHE_TTL_MS = 5*60*1000` `:29`) — **localStorage 만** |

→ ★**Manager Resolution Cache 는 순수 신규다.** 확장할 기존 캐시 계층이 **하나도 없다.**

### 🔴 §80 의 11개 무효화 요구는 **무효화할 캐시가 없다**(규칙 10)

"Manager 변경 시 Invalidation" 이 **0건 구현**인 것은 **정합이 아니라 캐시와 Manager 축 양쪽의 부재**다. §76 #24("Manager 변경 후 Task Candidate Cache 미무효화")가 **0 인 이유도 동일 — 이중 무대상**이다.

### Cache Key 구성요소의 선행 부재

| 요구 키 | 현행 표현 가능성 |
|---|---|
| `tenant_id` | ✅ **유일하게 실재** — `index.php` 미들웨어가 `auth_tenant` 부여 |
| `subordinate_subject_id` | ❌ Subject 축 0 |
| `subordinate_position_id` | ❌ Position 축 0 |
| `organization_id` | ⚠️ `team.id` 뿐(**`parent_team_id` 없음 → 팀 트리 자체가 없다**) |
| `reporting_line_version_id` | ❌ Version 축 0(`menu_defaults.version` = **리터럴 `'baseline'` 라벨**) |
| `supervisory_hierarchy_version_id` | ❌ 0 |
| `effective_date` | ❌ `effective_to`/`valid_to`/`valid_from` **grep 0** |
| `manager_relationship_type` | ❌ Type 27종 표현 수단 0 |
| `approval_domain` | ❌ 0 |
| `legal_entity_scope` | ❌ 🔴`DATA_SCOPES 'company'` = **무제한 센티넬**(법인 아님) |
| `resource_scope` | ⚠️ `data_scope` 실재하나 **`UNIQUE(tenant_id,subject_type,subject_id)` `TeamPermissions.php:164` = 단일행이 스키마로 강제** |

## 1. 원문 전사 + 판정 — **원문 22종**

> ★측정기 22 / 원문 대조 22 / 전사 22 — **일치**(Cache Key 11 + 적용 원칙 11).

### Manager Resolution Cache Key 구성요소 (11)

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | `tenant_id` | **REAL** — `index.php` 미들웨어 `auth_tenant`+`X-Tenant-Id` 주입 · 선례 `Dependencies.php:91`(매 홉 tenant 필터) | `VALIDATED_LEGACY`(**키 선두 필수**) |
| 2 | `subordinate_subject_id` | Subject 축 0 | `NOT_APPLICABLE`(신설) |
| 3 | `subordinate_position_id` | Position 축 0 | `NOT_APPLICABLE`(신설) |
| 4 | `organization_id` | `team.id` 존재 · 🔴**`parent_team_id` 없음 → 조직 트리 부재**(`TeamPermissions.php:148`/`:168`) | `PARTIAL`(**커버 아님**) |
| 5 | `reporting_line_version_id` | 부재 · ★**`menu_defaults.version` 은 유일 생산자 `AdminMenu.php:309` 가 리터럴 `'baseline'` 고정 = 버전이 아니라 라벨** | `NOT_APPLICABLE`(신설) |
| 6 | `supervisory_hierarchy_version_id` | 부재 | `NOT_APPLICABLE`(신설) |
| 7 | `effective_date` | 🔴**`effective_to`/`valid_to`/`valid_from` grep 0** · `kr_fee_rule.effective_from`(`Db.php:898`) = **컬럼 有·질의 無** | `ABSENT` |
| 8 | `manager_relationship_type` | Type 축 0 · ⚠️`dep_type ENUM('FS','SS','FF','SF')` = **일정 선후행**(무관) | `NOT_APPLICABLE`(신설) |
| 9 | `approval_domain` | 부재 — 승인 4종이 **도메인 축 없이 각자 게이트**(`Mapping`=정족수 · `Catalog`=**구독 플랜** `:2343` · `AgencyPortal`=`isTenantOwner` · `FeedTemplate`=라우트 게이트) | `NOT_APPLICABLE`(신설) |
| 10 | `legal_entity_scope` | **Legal Entity Officer `ABSENT`** · 🔴**`DATA_SCOPES 'company'` 를 법인으로 계산 금지 — 무제한 센티넬**(`effectiveScope():258`) | `NOT_APPLICABLE`(신설) |
| 11 | `resource_scope` | `data_scope` 실재 · 🔴**`UNIQUE(tenant_id,subject_type,subject_id)`(`TeamPermissions.php:164`)가 단일행을 스키마로 강제**(규칙 10 — 정책이 아니라 UNIQUE 가 여러 개를 금지) · ⚠️`ORG_PRESET` 15팀 중 **8팀 scope 실효 없음**(등급 미부여) | `PARTIAL`(**커버 아님**) |

### 적용 원칙 (11)

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 12 | Version-aware Cache | 🔴**캐시 계층 부재 + Version 축 부재 = 이중 무대상** | `NOT_APPLICABLE`(신설) |
| 13 | Tenant-isolated Cache | 캐시 부재 · ⚠️**프론트 `g_admin_menu_tree_cache`(`MenuVisibilityContext.jsx:28`) = localStorage · 테넌트 격리 미확인** — 🔴**286차 하이재킹이 localStorage 고착에서 비롯**된 전례 | `NOT_APPLICABLE`(신설 · ⚠️localStorage 전례 경고) |
| 14 | Effective-date-aware Cache | 이중 무대상(캐시 0 · effective date 0) | `NOT_APPLICABLE`(신설) |
| 15 | Manager Change 시 Invalidation | 🔴**무효화할 캐시가 없다**(규칙 10) | `NOT_APPLICABLE`(신설) |
| 16 | Position Incumbent Change 시 Invalidation | 이중 무대상 | `NOT_APPLICABLE`(신설) |
| 17 | Acting Assignment 시작·종료 시 Invalidation | 이중 무대상(`acting` grep 0) | `NOT_APPLICABLE`(신설) |
| 18 | Temporary·Interim 변경 시 Invalidation | 이중 무대상 | `NOT_APPLICABLE`(신설) |
| 19 | Organization Transfer 시 Invalidation | 이중 무대상 · ⚠️`app_user.team_id` **단일 컬럼 = 1인 1팀**(이력·유효기간 0) → **Transfer 개념 자체가 없다** | `NOT_APPLICABLE`(신설) |
| 20 | Employment Termination 시 Invalidation | 🔴**Termination 축 0**(`terminated`·`deleted_at` grep 0) · **`is_active` 는 계정 상태이지 고용 상태가 아니다**(base DDL `Db.php:1106` · 소비처 전부 **인증 게이트**) · ✅**단 세션 즉시 폐기는 REAL**(`UserAuth.php:1381`·`EnterpriseAuth.php:400`,`:413`) = **무효화 훅의 유일한 인접 선례** | `LEGACY_ADAPTER`(**훅 지점만 이식**) |
| 21 | Reconciliation Critical Drift 시 Cache 차단 | 🔴**삼중 무대상** — 캐시 0 · Reconciliation **좌우변 양쪽 부재** · Drift 0 | `NOT_APPLICABLE`(신설) |
| 22 | 과거 Snapshot은 Current Cache로 재생성 금지 | 🔴**정면 반례 실재**: `AgencyPortal.php:304`·`:381` 이 **`revoked_at=NULL` 로 이전 해지 시각을 소거** → **이력 물리적 소멸**(§55 위반) · `pm_baseline.captured_at` = **JSON 키**(`Handlers/PM/Enterprise.php:360`) → as-of 재현 불가 | `BLOCKED_HISTORICAL_INTEGRITY_RISK`(**차단 대상 실재**) |

**실측 개수: 22 / 22 전사.** 커버(`VALIDATED_LEGACY`) = **1**(#1 `tenant_id`) · `LEGACY_ADAPTER` 1 · `PARTIAL` 2 · `ABSENT` 1 · `BLOCKED_*` 1 · `NOT_APPLICABLE` 16.

## 2. 규칙

- 🔴 **★Manager Resolution Cache = 순수 신규.** Redis/Memcached **0** · APCu 는 **지표 보고 전용**(`SystemMetrics.php:225-451`) · 프론트는 **localStorage 뿐**. **"기존 캐시를 확장한다"는 선택지가 존재하지 않는다.**
- 🔴 **"무효화 0건"을 정합으로 계산 금지**(규칙 10). §80 의 **11개 무효화 요구는 무효화할 캐시가 없어서 0**이다.
- 🔴 **캐시 신설 전 Cache Key 11요소 중 10 이 표현 불가**임을 직시하라 — `tenant_id` 하나만 실재한다. **키를 구성할 수 없는 상태에서 캐시부터 만들면 키 없는 캐시 = 오염**이다. **Canonical 선언이 캐시에 선행**한다.
- 🔴 **localStorage 캐시 전례 경고** — 286차 platform_growth 하이재킹은 **localStorage 고착**이 원인이었다. Manager Resolution 을 프론트 localStorage 에 캐시하면 **동형 사고**가 재발한다. **서버 권위 + 요청시점 tenant 해석**을 유지하라.
- 🔴 **fail-open 금지** — 인접 선례 `index.php:508-545` 레이트리밋이 **fail-open**(가용성 우선)이나, **Manager Resolution 은 권한 판정 입력**이므로 캐시 오류 시 **fail-closed**(캐시 미스로 원본 조회 · 판정 생략 금지)여야 한다. **`Mapping::actorId:52` → 403 fail-closed** 가 올바른 선례다.
- 🔴 **#22 는 "지키면 된다"가 아니라 "현행이 이미 위반 중"이다** — `AgencyPortal.php:304`·`:381` 의 `revoked_at=NULL` 소거를 **참조 구현으로 삼지 마라**.
- ⚠️ **등급 미부여 관찰**: `ORG_PRESET` 15팀 중 8팀 scope 실효 없음(`'재무팀' => 'company'` `:717` = **무제한 센티넬** · `partner`(`:720-721`)·`campaign`(`:708-710`,`:718`) **소비처 0**). **설계 의도 미확인** → 등급 부여하지 않는다.
