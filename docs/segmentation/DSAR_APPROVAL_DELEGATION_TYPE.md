# DSAR — Approval Delegation Type (§8)

> EPIC 06-A-01 Rebate Delegation Foundation · 289차 12회차(2026-07-18) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_01_DELEGATION_FOUNDATION_VERBATIM.md](SPEC_06A_01_DELEGATION_FOUNDATION_VERBATIM.md) §8 · ⓑ전수조사: [DSAR_APPROVAL_DELEGATION_EXISTING_IMPLEMENTATION.md](DSAR_APPROVAL_DELEGATION_EXISTING_IMPLEMENTATION.md) · ADR(예정): `ADR_DSAR_REBATE_DELEGATION_FOUNDATION_GOVERNANCE.md`(ⓓ)

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| `APPROVAL_DELEGATION_TYPE` 엔티티 | `delegation_type`·`approval_delegate` grep **0** — Delegation Type 분류 개념 부재(ⓑ §0·§1) | `NOT_APPLICABLE`(부재→신설) |
| ACTING_MANAGER 선행 = Manager Resolver | 🔴 **Manager Resolver ABSENT** — `parent_user_id` 판독자 전량 owner/tenant로 붕괴(`UserAuth.php:156-157,1225-1227`)·상급자 반환 0(ⓑ §3.3) → "관리자→위임대상" 산출 불가 | `ABSENT` |
| VACATION/OOO/MEDICAL_LEAVE 선행 = HRIS/Leave/Calendar 소스 | 🔴 5종 외부 소스 **존재조차 안 함**(`calendar`=콘텐츠 캘린더·`hris`=`hig`hRis`k` 오탐·ⓑ §1) | `ABSENT` |
| SUBSTITUTE/BACKUP_APPROVER 개념 | 🔴 `substitute`/`backup_approver`/`alternate_approver` 단어경계 grep **0**(`backup`=DB 백업 오탐·ⓑ §1) — 대리 승인자 지정 개념 없음 | `ABSENT` |
| PARTIAL/FULL 인접 = acl 위임상한 | `TeamPermissions::putMemberPermissions:615-647`의 `actionsCover:194-198` = RBAC 부여 상한 검증(부분/전부 부여 상한) — 단 **기간·수락·재위임 축 전무**(ⓑ §2.1) | `KEEP_SEPARATE_WITH_REASON` |
| evidence 정본 | `SecurityAudit::verify():56-68` — 🔴`menu_audit_log.hash_chain` 인용 금지([[reference_menu_audit_log_not_tamper_evident]]) | `LEGACY_ADAPTER` |

★**Type 엔티티가 통째로 부재하므로 필드 단위 커버는 원천 불가.** 아래는 원문 전사(신설 명세)이며 현행 대조는 "인접 자산/부재 깊이"를 기록한다. **판정 근거는 전부 ⓑ file:line.**

## 1. 원문 전사 + 판정 — **원문 36종**(지원 Type 22 + 필수 필드 14)

### 지원 Type (22)

| # | 원문 Type | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | TEMPORARY | Delegation Type 엔티티의 enum 값 — 부재(temporary delegation 개념 없음) | `NOT_APPLICABLE` |
| 2 | SCHEDULED | 부재 — Scheduled Delegation 개념 없음(Delegation Period §20 부재) | `NOT_APPLICABLE` |
| 3 | VACATION | 🔴 Vacation/Leave 소스 **존재조차 안 함**(HRIS Leave 엔티티 0·§4 대사 대상 0·ⓑ §1) | `ABSENT` |
| 4 | OUT_OF_OFFICE | 🔴 OOO 소스 **존재조차 안 함**(`calendar`=콘텐츠 캘린더 오탐·M365/Google OOO 연동 0·ⓑ §1) | `ABSENT` |
| 5 | ACTING_MANAGER | 🔴 **Manager Resolver ABSENT**(`parent_user_id`가 owner로 붕괴·`UserAuth.php:156-157,1225-1227`·ⓑ §3.3) → 상급자→위임 산출 불가 | `ABSENT` |
| 6 | ACTING_POSITION | enum 값 — 부재(Position Registry/Position Incumbency 엔티티 0·`position_idx`=Gantt 정렬 오탐·ⓑ §3.3) | `NOT_APPLICABLE` |
| 7 | SUBSTITUTE_APPROVER | 🔴 `substitute` 단어경계 grep **0**(ⓑ §1) — 대리 승인자 지정 개념 없음 | `ABSENT` |
| 8 | BACKUP_APPROVER | 🔴 `backup_approver`/`alternate_approver` grep **0**(`backup`=DB 백업/`.bak` 오탐·ⓑ §1) | `ABSENT` |
| 9 | EMERGENCY | enum 값 — 부재(Emergency/Break-glass grep 0·ⓑ §3.4) | `NOT_APPLICABLE` |
| 10 | MEDICAL_LEAVE | 🔴 HRIS Leave 소스 **존재조차 안 함**(§4 대사 대상 0·ⓑ §1) | `ABSENT` |
| 11 | PARENTAL_LEAVE | enum 값 — 부재(HRIS Leave 소스 0·MEDICAL_LEAVE 계열과 동반 부재) | `NOT_APPLICABLE` |
| 12 | BUSINESS_TRAVEL | enum 값 — 부재(출장/OOO 소스 0) | `NOT_APPLICABLE` |
| 13 | SYSTEM_UNAVAILABLE | enum 값 — 부재 | `NOT_APPLICABLE` |
| 14 | WORKLOAD_OVERFLOW_REFERENCE | enum 값 — 부재(Workload/Assignment Queue는 §0 명시적 out-of-scope·차기 EPIC 06-A-02) | `NOT_APPLICABLE` |
| 15 | LEGAL_ENTITY_COVERAGE | enum 값 — 부재(Legal Entity 엔티티 0·ⓑ §3.3) | `NOT_APPLICABLE` |
| 16 | FUNCTIONAL_COVERAGE | enum 값 — 부재 | `NOT_APPLICABLE` |
| 17 | PROGRAM_SPECIFIC | enum 값 — 부재 | `NOT_APPLICABLE` |
| 18 | TASK_SPECIFIC_REFERENCE | enum 값 — 부재(Task Assignment는 §0 out-of-scope) | `NOT_APPLICABLE` |
| 19 | FULL | 인접 = `acl_permission` 위임상한 전부 부여(`actionsCover:194-198`) — 단 기간·수락·재위임·Delegator→Delegate 관계 전무(ⓑ §2.1) | `KEEP_SEPARATE_WITH_REASON` |
| 20 | PARTIAL | 인접 = `acl_permission` 위임상한 부분 부여(manager assignable 부분집합) — 단 기간·수락 없음(ⓑ §2.1) | `KEEP_SEPARATE_WITH_REASON` |
| 21 | PERMANENT_WITH_REVIEW | enum 값 — 부재(Review Date/Governance Review Cycle 개념 없음·§20 Period 부재) | `NOT_APPLICABLE` |
| 22 | CUSTOM | enum 값 — 부재 | `NOT_APPLICABLE` |

### 필수 필드 (14)

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 23 | approval_delegation_type_id | 엔티티 부재 → PK 없음 | `NOT_APPLICABLE` |
| 24 | type_code | 부재 | `NOT_APPLICABLE` |
| 25 | type_name | 부재 | `NOT_APPLICABLE` |
| 26 | category | 부재 | `NOT_APPLICABLE` |
| 27 | default duration policy | 부재 — Delegation Period(§20) 개념 없음·effective-dating 인접(`kr_fee_rule`)은 수수료 도메인(ⓑ §5) | `NOT_APPLICABLE` |
| 28 | acceptance required | 부재 — Delegate 수락 개념 없음(승인자=진입게이트 통과자 본인·ⓑ §2.2) | `NOT_APPLICABLE` |
| 29 | approval required | 부재 — Delegation 승인 라이프사이클 없음(§3.1 Approval Foundation 커버 0·ⓑ §3.1) | `NOT_APPLICABLE` |
| 30 | re-delegation allowed | 🔴 재위임 표현 **0** — member 재부여 경로 없음(acl 위임상한도 재위임 축 전무·ⓑ §2.1) | `ABSENT` |
| 31 | maximum delegation depth | 🔴 Delegation 전용 depth cap **0** — 인접 depth cap(`PM/Dependencies:79-100`·`AdminMenu::wouldCycle:540-555`)은 PM/메뉴 도메인·Delegation Chain 아님(ⓑ §2.4) | `ABSENT` |
| 32 | monetary delegation allowed | 🔴 Authority/금액축 **선행조건 부재**(§3.2 Authority 개념 없음·`HIGH_VALUE_KRW` 상수뿐·ⓑ §3.2) → 이양할 Monetary Authority 미정의 | `BLOCKED_PREREQUISITE` |
| 33 | emergency override reference | 부재 — Emergency/Break-glass grep 0(ⓑ §3.4) | `NOT_APPLICABLE` |
| 34 | review cycle required | 부재 — Governance Review Cycle 개념 없음(§20 Period 부재) | `NOT_APPLICABLE` |
| 35 | status | 인접 = 상태전이 다수이나 **합법 전이집합 선언 0**(전 도메인)·Delegation Type 상태머신 부재 | `LEGACY_ADAPTER` |
| 36 | evidence | 정본 = `SecurityAudit::verify():56-68`(tenant 해시·preimage ts·검증기·ⓑ §2.5) · 🔴`menu_audit_log.hash_chain` 인용 금지 | `LEGACY_ADAPTER` |

**실측 개수: 36 / 36 전사.** 커버리지 = **`VALIDATED_LEGACY` 0** · `LEGACY_ADAPTER` 2 · `KEEP_SEPARATE_WITH_REASON` 2 · `BLOCKED_PREREQUISITE` 1 · `ABSENT` 8 · `NOT_APPLICABLE` 23.

> 🔴 **커버 0.** Type 엔티티가 통째로 부재하므로 어떤 항목도 `VALIDATED_LEGACY` 가 아니다. `KEEP_SEPARATE_WITH_REASON` 2건(FULL·PARTIAL)은 acl 위임상한 인접이나 **기간·수락·재위임 축이 없어 Delegation Type 아님**. `ABSENT` 8건은 소스/Resolver/대리자 개념이 저장계층부터 부재(ACTING_MANAGER·VACATION·OUT_OF_OFFICE·MEDICAL_LEAVE·SUBSTITUTE_APPROVER·BACKUP_APPROVER·re-delegation allowed·maximum delegation depth). `monetary delegation allowed` 1건은 **선행조건(Authority) 부재**로 `BLOCKED_PREREQUISITE`(부재 이전에 이양 대상 자체 미정의).

## 2. 규칙

- 🔴 **Type 카탈로그를 ENUM 하드코딩하지 마라** — `pm_audit_log.entity_type` ENUM 신규값 INSERT 예외 선례(5-3-3-1 §8) 반복 금지·확장 가능 카탈로그로. 22종 대부분이 **선행 소스/Resolver 신설 후에만 실효**(ACTING_MANAGER→Manager Resolver·VACATION/OOO→HRIS/Calendar 커넥터).
- 🔴 **`ACTING_MANAGER`/`ACTING_POSITION` 을 "지원"으로 표기 금지** — Manager Resolver·Position Registry 가 §3.3 선행조건부터 ABSENT(ⓑ §3.3). Type 존재가 Resolver 존재를 의미하지 않게 하고, Acting 계열은 조직 계층 신설이 **선행**.
- 🔴 **`monetary delegation allowed` 는 Authority Foundation 신설 전까지 `BLOCKED_PREREQUISITE`** — 이양할 Monetary Authority 단위가 없다(§3.2·ⓑ §3.2). Type 플래그가 능력을 초과 선언하면 §5.2 "Delegate가 Delegator 한도 초과" gap 을 유발한다.
- 🔴 **`re-delegation allowed` 기본값은 금지(§5.7)·`maximum delegation depth` 는 Delegation Chain 전용 cap 신설** — 인접 depth cap(`PM/Dependencies`·`AdminMenu::wouldCycle`)은 PM/메뉴 도메인이니 재사용은 **알고리즘 참조**에 한하고 Delegator→Delegate Chain 을 그 위에 올리지 마라(ⓑ §2.4·`KEEP_SEPARATE`).
- 🔴 **FULL/PARTIAL 을 acl 위임상한으로 대체 구현하지 마라** — acl 은 member 절대 권한 매트릭스의 부여 상한(기간·수락·재위임 없음·ⓑ §2.1)이지 Delegation Type 아님. §5.6 최소권한(기본=PARTIAL)은 Delegation Scope(§11)에서 정의하되 monotonicity 패턴만 참조.
- 🔴 **실 Type 구현은 별도 승인세션** — §3 선행조건 신설 후에만 가능(ⓑ §7). 본 문서는 비파괴 설계 명세이며 `backend/src`·`frontend/src` 코드 변경 0.
