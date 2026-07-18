# DSAR — Approval Delegation Definition (§9)

> EPIC 06-A-01 Rebate Delegation Foundation · 289차 12회차(2026-07-18) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_01_DELEGATION_FOUNDATION_VERBATIM.md](SPEC_06A_01_DELEGATION_FOUNDATION_VERBATIM.md) §9 · ⓑ전수조사: [DSAR_APPROVAL_DELEGATION_EXISTING_IMPLEMENTATION.md](DSAR_APPROVAL_DELEGATION_EXISTING_IMPLEMENTATION.md) · ADR: [ADR_DSAR_REBATE_DELEGATION_FOUNDATION_GOVERNANCE.md](../architecture/ADR_DSAR_REBATE_DELEGATION_FOUNDATION_GOVERNANCE.md)(예정)
>
> **측정기 분모(육안 금지)**: `node tools/measure_spec_denominator.mjs docs/segmentation/SPEC_06A_01_DELEGATION_FOUNDATION_VERBATIM.md --sec=9` → **§9 = 52**. 분할 = **필수필드 28 + Delegation Effect 8 + Authority Transfer Mode 9 + Responsibility Transfer Mode 7 = 52 = §9 측정기**.

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| `APPROVAL_DELEGATION_DEFINITION` 엔티티 | `delegation_definition`·`approval_delegate`·`delegate_id` grep **0** — Delegator→Delegate 관계 엔티티 개념 부재(ⓑ §1·§4) | `NOT_APPLICABLE`(부재→신설) |
| 유일 이름 히트 | `TeamPermissions.php:645` `DELEGATION_EXCEEDED` = **RBAC 부여 상한 자기정합(monotonicity)** — Delegation Definition 아님(기간/수락/재위임/Cycle 전무·ⓑ §2.1) | `KEEP_SEPARATE_WITH_REASON`(오탐) |
| Delegator→Delegate 관계 산출기 | 🔴 **Manager/Reporting-Line Resolver ABSENT** — `parent_user_id` 판독자 전량 owner/tenant로 붕괴(`UserAuth.php:156-157,1225-1227`)·상급자 반환 0(ⓑ §3.3) | `ABSENT`(관계 엔티티·Resolver 부재) |
| 위임할 Authority 단위 | 🔴 `authority_matrix`·`approval_authority`·`amount_band` grep **0** — Approval Authority 개념 부재(5-3-3-4 확정·ⓑ §3.2) | `BLOCKED_PREREQUISITE`(이양 대상 부재) |
| explicit deny 표현 | 🔴 `acl_permission`=**allow-only**(`__deny__`은 data_scope fail-closed 센티넬·ⓑ §3.4) — DENY effect 표현 불가 | `ABSENT` |

★**엔티티 전체가 부재하므로 필드 단위 커버는 원천 불가.** 아래는 원문 전사(신설 명세)이며 현행 대조는 "인접 자산/부재 깊이"를 기록한다. `VALIDATED_LEGACY`는 §58 금지(커버 0).

## 1. 원문 전사 + 판정 — **원문 52종**(필수 필드 28 + Delegation Effect 8 + Authority Transfer Mode 9 + Responsibility Transfer Mode 7)

### 필수 필드 (28)

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | approval_delegation_definition_id | 엔티티 부재 → PK 없음 | `NOT_APPLICABLE` |
| 2 | approval_delegation_registry_id | Delegation Registry(§7) 엔티티 부재 → FK 대상 없음 | `NOT_APPLICABLE` |
| 3 | delegation_code | 부재 | `NOT_APPLICABLE` |
| 4 | delegation_name | 부재 | `NOT_APPLICABLE` |
| 5 | delegation_description | 부재 | `NOT_APPLICABLE` |
| 6 | delegation_type_id | Delegation Type(§8) 엔티티 부재 → FK 대상 없음 | `NOT_APPLICABLE` |
| 7 | delegator_id | 🔴 Delegator→Delegate **관계 엔티티 부재**·Manager Resolver ABSENT(`UserAuth.php:156-157,1225-1227` parent_user_id owner 붕괴·ⓑ §3.3) | `ABSENT` |
| 8 | delegate_id | 🔴 관계 엔티티 부재 — 위임 대상 Subject 참조 저장계층 0 | `ABSENT` |
| 9 | delegation effect | 아래 Effect 8종 참조 · 필드 자체 저장계층 0(effect 표현 개념 부재) | `ABSENT` |
| 10 | authority transfer mode | 🔴 위임할 Authority 자체 부재(`approval_authority` grep 0·ⓑ §3.2) → transfer mode 의미 성립 불가 | `BLOCKED_PREREQUISITE` |
| 11 | responsibility transfer mode | 🔴 Task 도메인 미구현(`reassign`=별 도메인·이번 블록 미구현 대상·ⓑ §4·SPEC §128) | `ABSENT` |
| 12 | acceptance policy | Delegate 수락 개념 0 — 승인 4경로 전부 수락 단계 없음(mapping 정족수는 actor 본인·ⓑ §2.2) | `ABSENT` |
| 13 | approval policy | 위임 승인 정책 0 — `admin_growth_approval`=단일결정·`catalog_writeback_approval`=고아(ⓑ §3.1) | `ABSENT` |
| 14 | activation policy | Schedule/Activate 라이프사이클 0 | `ABSENT` |
| 15 | revocation policy | 🔴 `revoke`=토큰/자격 폐기 오탐(`AgencyPortal.revoked_at`·API키)·Delegation revocation 0(ⓑ §2.3) | `ABSENT` |
| 16 | expiration policy | 🔴 Effective dating 부재 — `valid_to`/`effective_to` grep 0·자동만료 0 | `ABSENT` |
| 17 | re-delegation policy | 🔴 재위임 경로 0(`redelegation`/`delegated_ceiling` 복합어 grep 0·ⓑ §2.1) | `ABSENT` |
| 18 | maximum depth | 인접 depth 캡 = `PM/Dependencies.php:79-100`(depth<10000)·`AdminMenu::wouldCycle:540-555`(depth<100) — **PM/메뉴 도메인·Delegation Chain 아님**(ⓑ §2.4) → 위임깊이 개념 부재 | `ABSENT` |
| 19 | scope reference | Delegation Scope(§11·문서2) 엔티티 부재 → 참조 대상 없음 | `ABSENT` |
| 20 | period reference | Delegation Period(§20) 부재 → 참조 대상 없음 | `ABSENT` |
| 21 | source | 🔴 외부 위임 소스(HRIS Leave/Calendar OOO/ERP Delegate) **존재조차 안 함**(ⓑ §1·§4·§58)·`calendar`=콘텐츠 캘린더 오탐 | `ABSENT` |
| 22 | source record id | 소스 부재 → 원천 레코드 참조 없음 | `ABSENT` |
| 23 | owner | 인접 = `parent_user_id IS NULL` owner 판별(ⓑ §3.3) — 소유자 개념은 있으나 delegation owner 아님 | `LEGACY_ADAPTER` |
| 24 | active_version | 🔴 Delegation Version(§10) 부재·불변 prev-링크 버전체인 선례 0 | `ABSENT` |
| 25 | valid_from | 인접 = `kr_fee_rule.effective_from`(수수료 도메인·open-interval·ⓑ §3) — Delegation 엔티티엔 없음 | `LEGACY_ADAPTER` |
| 26 | valid_to | 🔴 `valid_to`/`effective_to` grep 0(오탐 `Onsite.php` invalid_token 제외) → 폐구간 신규 | `ABSENT` |
| 27 | status | 인접 = 상태전이 다수이나 **합법 전이집합 선언 0**(전 도메인·§10 상태 16종 미시드) | `LEGACY_ADAPTER` |
| 28 | evidence | 정본 = `SecurityAudit::verify():56-68`(tenant 해시·preimage ts·hash_equals+prev_hash·ⓑ §2.5) · 🔴`menu_audit_log.hash_chain` 인용 금지([[reference_menu_audit_log_not_tamper_evident]]) | `LEGACY_ADAPTER` |

### Delegation Effect (8)

| # | 원문 Effect | 현행 대조 | 판정 |
|---|---|---|---|
| 29 | ALLOW | 인접 = 상태전이(`acl_permission` allow-only·승인 4경로 상태머신) — 위임 효과 아님(권한 부여 자체) | `LEGACY_ADAPTER` |
| 30 | RESTRICT | 위임 축소(scope 제한) 표현 0 | `ABSENT` |
| 31 | SUBSTITUTE | `substitute` grep 0(단어경계·`Migrate.php:203` 타입매핑 주석 오탐·ⓑ §1) | `ABSENT` |
| 32 | ACTING | `\bacting\b` grep 0(`tr`acting`/`ex`tracting` 부분문자열 오탐 제외·ⓑ §1) | `ABSENT` |
| 33 | BACKUP | `backup`=DB 백업/`.bak` 오탐 — backup_approver 0(ⓑ §1) | `ABSENT` |
| 34 | EMERGENCY | `emergency` 위임 부재(ⓑ §1) | `ABSENT` |
| 35 | DENY | 🔴 `acl_permission`=allow-only·explicit deny 표현 없음(`__deny__`=data_scope 센티넬·ⓑ §3.4) | `ABSENT` |
| 36 | CUSTOM | 부재 | `NOT_APPLICABLE` |

### Authority Transfer Mode (9) — 전부 `BLOCKED_PREREQUISITE`(위임할 Authority 부재)

| # | 원문 Mode | 현행 대조 | 판정 |
|---|---|---|---|
| 37 | NO_AUTHORITY_TRANSFER | 🔴 Authority 개념 부재(`approval_authority` grep 0·5-3-3-4) → transfer 여부 판정 불가 | `BLOCKED_PREREQUISITE` |
| 38 | ELIGIBILITY_ONLY | Authority Eligibility 자체 부재 | `BLOCKED_PREREQUISITE` |
| 39 | LIMITED_AUTHORITY_TRANSFER | 이양할 Authority 단위 미정의 | `BLOCKED_PREREQUISITE` |
| 40 | FULL_WITHIN_ORIGINAL_SCOPE | Original Authority Scope 부재(Authority Resolution 0) | `BLOCKED_PREREQUISITE` |
| 41 | CHAIN_LEVEL_SPECIFIC | Approval Chain/Level(§3.1) 커버 0.00% | `BLOCKED_PREREQUISITE` |
| 42 | ACTION_SPECIFIC | Authority Action Binding 부재 | `BLOCKED_PREREQUISITE` |
| 43 | RESOURCE_SPECIFIC | Authority Resource Scope 부재 | `BLOCKED_PREREQUISITE` |
| 44 | MONETARY_LIMITED | 🔴 금액축 부재 — 유일 = `Catalog.php:1016` HIGH_VALUE_KRW 상수(boolean·ⓑ §3.2) | `BLOCKED_PREREQUISITE` |
| 45 | CUSTOM | Authority 부재로 커스텀 모드 기반 없음 | `BLOCKED_PREREQUISITE` |

### Responsibility Transfer Mode (7) — 전부 `ABSENT`(Task 도메인 미구현)

| # | 원문 Mode | 현행 대조 | 판정 |
|---|---|---|---|
| 46 | NONE | 🔴 Approval Task 도메인 자체 미구현(이번 블록 비대상·SPEC §128 EPIC 06-A-02 예정) → responsibility 이양 축 부재 | `ABSENT` |
| 47 | NEW_TASKS_ONLY | Task Queue 부재 | `ABSENT` |
| 48 | UNCLAIMED_TASKS | Claim/Unclaimed 상태 부재 | `ABSENT` |
| 49 | ACTIVE_TASKS_REFERENCE | Active Task 참조 대상 0 | `ABSENT` |
| 50 | FUTURE_STAGES | Approval Stage(§3.1) 커버 0 | `ABSENT` |
| 51 | ALL_ELIGIBLE_REFERENCE | Eligible Task 집합 부재 | `ABSENT` |
| 52 | CUSTOM | Task 도메인 부재로 기반 없음 | `ABSENT` |

**실측 개수: 52 / 52 전사.** 커버리지 = **`VALIDATED_LEGACY` 0** · `LEGACY_ADAPTER` 5 · `BLOCKED_PREREQUISITE` 10 · `ABSENT` 30 · `NOT_APPLICABLE` 7.

> 🔴 **커버 0.** Definition 엔티티가 통째로 부재하므로 어떤 필드도 `VALIDATED_LEGACY` 가 아니다. `LEGACY_ADAPTER` 5건(owner=parent_user_id·valid_from=kr_fee_rule·status=상태전이·evidence=SecurityAudit·ALLOW=acl allow)은 **확장 대상 인접 자산**이지 커버가 아니다. `BLOCKED_PREREQUISITE` 10건은 **선행 Authority(§3.2) 신설 전 판정 자체 불가**다.

## 2. 규칙

- 🔴 **Definition 은 신설이나, 하위 필드의 인접 선례를 재구현하지 마라** — evidence=`SecurityAudit::verify()` 확장 · owner/status=플랫 RBAC(`team_role`) 판독자 확장 · valid_from=`kr_fee_rule.effective_from` 질의계층 확장. **중복 엔진 금지.**
- 🔴 **`delegator_id`/`delegate_id` 를 `parent_user_id` 로 대체하지 마라** — `parent_user_id` 는 owner/tenant 로 붕괴(Manager Resolver ABSENT·ⓑ §3.3). Delegator→Delegate 는 **§3.3 Reporting-Line/Manager Resolution 신설이 선행**돼야 산출 가능.
- 🔴 **`authority transfer mode` 를 "구현됨"으로 표기 금지** — 이양할 Authority 자체가 부재다(§3.2·5-3-3-4). Authority Foundation 선설 전에는 9종 전부 `BLOCKED_PREREQUISITE` 이며, 임의로 ALLOW/FULL 로 채우면 §5.2 "Delegate 가 Original Authority 를 초과" 무게이트 위임을 구조적으로 유발한다.
- 🔴 **DENY effect 를 `acl_permission` 으로 표현하려 하지 마라** — acl 은 allow-only 다(`__deny__`=data_scope fail-closed 센티넬). explicit deny 는 신설 표현 계층이 필요하다.
- 🔴 **`expiration`/`revocation`/`acceptance policy` 를 "있음"으로 오기 금지** — Effective dating·수락·폐기 라이프사이클이 저장계층부터 부재다(§5.3·§5.11 Decision 시점 재검증의 토대 없음). `revoke` grep 히트는 전부 토큰/자격 폐기 오탐이다.
- 🔴 **Responsibility Transfer Mode 7종을 채우지 마라** — Approval Task 도메인은 본 블록 비대상(EPIC 06-A-02)이다. Task 없이 responsibility 이양을 정의하면 §5.10 "Delegation ≠ Task Reassignment" 분리 원칙을 위반한다.
