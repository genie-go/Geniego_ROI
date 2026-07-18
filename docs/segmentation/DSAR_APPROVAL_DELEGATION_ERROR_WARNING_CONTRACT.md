# DSAR — Approval Delegation Error + Warning Contract (§54+§55 병합)

> EPIC 06-A-01 Delegation Foundation · 289차 12회차(2026-07-18) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_01_DELEGATION_FOUNDATION_VERBATIM.md](SPEC_06A_01_DELEGATION_FOUNDATION_VERBATIM.md) §54·§55 · ⓑ전수조사: [DSAR_APPROVAL_DELEGATION_EXISTING_IMPLEMENTATION.md](DSAR_APPROVAL_DELEGATION_EXISTING_IMPLEMENTATION.md) · ADR(예정): `ADR_DSAR_REBATE_DELEGATION_FOUNDATION_GOVERNANCE.md`
> **헤더 분할 명기**: 본 문서는 원문 **§54 Error Contract(44) + §55 Warning Contract(18)** 두 절을 병합 전사한다. **분모 = 측정기 산출**(`measure_spec_denominator.mjs --sec=54` → 44 · `--sec=55` → 18 · 합 62).

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| Delegation 에러/경고 계약 엔티티 | `APPROVAL_DELEGATION_*` 에러코드·경고코드 발생기 grep **0** — Delegation 개념 자체 부재(ⓑ §0·§1) → **에러/경고를 낼 계약 대상 엔티티가 없다** | `NOT_APPLICABLE`(계약 대상 부재) |
| Tenant 불일치 방어 | 🔴 **REAL** = Tenant Isolation Guard(`index.php:600` 무조건 덮어쓰기)·단 strict 기본 **OFF**(`:585`)(ⓑ §3.4) | `LEGACY_ADAPTER`(TENANT_MISMATCH 인접 실재) |
| 원본 Authority 검증 | Authority Foundation 4축 전량 ABSENT(ⓑ §3.2) — `authority_matrix`·`approval_authority`·`amount_band` grep 0 | `BLOCKED_PREREQUISITE`(ORIGINAL_AUTHORITY_* 선행 부재) |
| Self-delegation / Cycle 차단 | 🔴 Delegator→Delegate 엔티티 부재 → 자기위임·순환 검출 코드 grep 0. 인접 = PM `Dependencies.php:79-100`(DFS·도메인 상이)·`AdminMenu::wouldCycle:540-555`(메뉴트리·도메인 상이)(ⓑ §2.4) | `ABSENT`(신설 필수 §5.8/§5.9) |
| Explicit Deny 표현 | 🔴 `acl_permission`=**allow-only**(deny 표현 없음·`__deny__`=data_scope fail-closed 센티넬)(ⓑ §3.4) — 원문 §54/§55에 **deny 전용 코드 없음** → 별도 행 없음 | `ABSENT`(deny 개념 부재) |

★**계약 대상(Delegation) 엔티티가 통째로 부재하므로 어떤 에러/경고도 실 발생 경로가 없다.** 아래는 원문 44+18 코드 전사(신설 명세)이며 현행 대조는 "인접 방어자산/선행부재 깊이"를 기록한다. **`VALIDATED_LEGACY` 금지**(§58) — 커버 0.

---

## 1-A. §54 Error Contract 원문 전사 + 판정 — **원문 44종**

| # | 원문 에러코드 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | APPROVAL_DELEGATION_REGISTRY_NOT_FOUND | Registry 엔티티 부재 | `NOT_APPLICABLE` |
| 2 | APPROVAL_DELEGATION_TYPE_NOT_FOUND | Type 엔티티 부재 | `NOT_APPLICABLE` |
| 3 | APPROVAL_DELEGATION_DEFINITION_NOT_FOUND | Definition 부재 | `NOT_APPLICABLE` |
| 4 | APPROVAL_DELEGATION_VERSION_NOT_FOUND | 불변 버전체인 선례 0(ⓑ §2.5) | `NOT_APPLICABLE` |
| 5 | APPROVAL_DELEGATION_VERSION_INACTIVE | 버전 상태머신 부재 | `NOT_APPLICABLE` |
| 6 | APPROVAL_DELEGATION_VERSION_IMMUTABLE | immutable 개념 인접=SecurityAudit(§56 소관)·버전 엔티티 부재 | `NOT_APPLICABLE` |
| 7 | APPROVAL_DELEGATION_SCOPE_INVALID | Scope 엔티티 부재 | `NOT_APPLICABLE` |
| 8 | APPROVAL_DELEGATOR_NOT_FOUND | Delegator 관계 엔티티 부재 | `NOT_APPLICABLE` |
| 9 | APPROVAL_DELEGATOR_INACTIVE | Employment/Identity state 판독자 부재(ⓑ §3.3) | `NOT_APPLICABLE` |
| 10 | APPROVAL_DELEGATE_NOT_FOUND | Delegate 관계 엔티티 부재 | `NOT_APPLICABLE` |
| 11 | APPROVAL_DELEGATE_INACTIVE | 동일 사유 | `NOT_APPLICABLE` |
| 12 | APPROVAL_DELEGATION_SELF_DELEGATION_BLOCKED | 🔴 자기위임 차단 코드 grep 0 — §5.9 신설 필수 | `ABSENT` |
| 13 | APPROVAL_DELEGATION_ORIGINAL_AUTHORITY_MISSING | 🔴 Authority Foundation 전량 ABSENT(ⓑ §3.2) → 검증할 원본 권한 미정의 | `BLOCKED_PREREQUISITE` |
| 14 | APPROVAL_DELEGATION_ORIGINAL_AUTHORITY_INACTIVE | 동일 — Authority Version/Resolution 부재 | `BLOCKED_PREREQUISITE` |
| 15 | APPROVAL_DELEGATION_NOT_STARTED | Delegation Period(§20) 부재 | `NOT_APPLICABLE` |
| 16 | APPROVAL_DELEGATION_EXPIRED | 폐구간 만료 저장계층 부재(`valid_to` grep 0·ⓑ §2.1) | `NOT_APPLICABLE` |
| 17 | APPROVAL_DELEGATION_SUSPENDED | Suspension 상태 부재(로그인 스로틀은 권한정지 아님·ⓑ §3.4) | `NOT_APPLICABLE` |
| 18 | APPROVAL_DELEGATION_REVOKED | 🔴 `revoke`=토큰/자격 폐기 오탐(AgencyPortal `revoked_at`·API키)·Delegation revoke 아님(ⓑ §2.3) | `NOT_APPLICABLE` |
| 19 | APPROVAL_DELEGATION_ACCEPTANCE_REQUIRED | 수락 개념 부재(manager 일방 치환 `TeamPermissions:652`·ⓑ §2.1) | `NOT_APPLICABLE` |
| 20 | APPROVAL_DELEGATION_APPROVAL_REQUIRED | Approval Foundation 커버 0(ⓑ §3.1) | `NOT_APPLICABLE` |
| 21 | APPROVAL_DELEGATION_TENANT_MISMATCH | 🔴 **REAL 인접** = Tenant Guard(`index.php:600`)·strict 기본 OFF(`:585`)(ⓑ §3.4) — Delegation 미도착이나 Cross-Tenant 방어 자산 실재 | `LEGACY_ADAPTER` |
| 22 | APPROVAL_DELEGATION_LEGAL_ENTITY_MISMATCH | Legal Entity 엔티티 void(`biz_no`/`corp_reg`/`tax_id` grep 0·ⓑ §3.3) | `NOT_APPLICABLE` |
| 23 | APPROVAL_DELEGATION_ORGANIZATION_MISMATCH | Org Unit/Hierarchy 엔티티 0(ⓑ §3.3) | `NOT_APPLICABLE` |
| 24 | APPROVAL_DELEGATION_GEOGRAPHY_MISMATCH | `Geo`(IP→ISO)=Authority 지리 스코프 아님 | `NOT_APPLICABLE` |
| 25 | APPROVAL_DELEGATION_RESOURCE_MISMATCH | Resource Scope 엔티티 부재 | `NOT_APPLICABLE` |
| 26 | APPROVAL_DELEGATION_ACTION_MISMATCH | Action Binding 부재(`acl_permission`=allow-only 장식) | `NOT_APPLICABLE` |
| 27 | APPROVAL_DELEGATION_AUTHORITY_SCOPE_MISMATCH | Authority Scope 부재(§13/§3.2 선행 미충족) | `NOT_APPLICABLE` |
| 28 | APPROVAL_DELEGATION_AMOUNT_LIMIT_EXCEEDED | 🔴 금액축 부재 — 유일 조건 `HIGH_VALUE_KRW` 상수(boolean·ⓑ §3.2) | `NOT_APPLICABLE` |
| 29 | APPROVAL_DELEGATION_CURRENCY_MISMATCH | 통화 스코프 저장계층 0(ⓑ §3.2) | `NOT_APPLICABLE` |
| 30 | APPROVAL_DELEGATION_PERIOD_LIMIT_EXHAUSTED | 기간 누적한도 부재 | `NOT_APPLICABLE` |
| 31 | APPROVAL_DELEGATION_REDELEGATION_BLOCKED | 🔴 재위임 경로 grep 0(ⓑ §2.1) — §5.7 신설 시 기본 금지 대상 | `NOT_APPLICABLE` |
| 32 | APPROVAL_DELEGATION_MAXIMUM_DEPTH_EXCEEDED | 재위임 깊이캡 부재. 인접 depth cap = PM/AdminMenu(도메인 상이·ⓑ §2.4) | `NOT_APPLICABLE` |
| 33 | APPROVAL_DELEGATION_CYCLE_DETECTED | 🔴 Delegation Chain 순환검출 grep 0 — §5.8 신설 필수(PM DFS 알고리즘 참조만) | `ABSENT` |
| 34 | APPROVAL_DELEGATION_SECURITY_BLOCKED | Break-glass/Security Suspension(권한정지) ABSENT(ⓑ §3.4) | `NOT_APPLICABLE` |
| 35 | APPROVAL_DELEGATION_SOD_FAILED | 🔴 SoD Hook grep 0(ⓑ §3.4) — 계약 부재로 발동 불가·신설 시 선행 | `NOT_APPLICABLE` |
| 36 | APPROVAL_DELEGATION_CONFLICT_OF_INTEREST | 🔴 CoI Hook grep 0(ⓑ §3.4) — 동일 | `NOT_APPLICABLE` |
| 37 | APPROVAL_DELEGATION_CONFLICT_UNRESOLVED | Conflict 엔티티 부재 | `NOT_APPLICABLE` |
| 38 | APPROVAL_DELEGATION_SNAPSHOT_MISSING | Delegation Snapshot 엔티티 0(evidence 정본=SecurityAudit·§56 소관) | `NOT_APPLICABLE` |
| 39 | APPROVAL_DELEGATION_SNAPSHOT_INVALID | 동일 | `NOT_APPLICABLE` |
| 40 | APPROVAL_DELEGATION_TASK_ASSIGNEE_DRIFT | Task Assignment(06-A-02 범위) 미구현 | `NOT_APPLICABLE` |
| 41 | APPROVAL_DELEGATION_DECISION_ACTOR_DRIFT | Decision 재검증(§5.11) 대상 Delegation 부재 | `NOT_APPLICABLE` |
| 42 | APPROVAL_DELEGATION_REVALIDATION_REQUIRED | 재검증 트리거 대상 부재 | `NOT_APPLICABLE` |
| 43 | APPROVAL_DELEGATION_RECONCILIATION_FAILED | Reconciliation(§49) 소스(HRIS/Calendar/ERP) 존재조차 안 함(ⓑ §1) | `NOT_APPLICABLE` |
| 44 | APPROVAL_DELEGATION_RUNTIME_BLOCKED | Runtime Guard 대상 Delegation 부재 | `NOT_APPLICABLE` |

**§54 실측 개수: 44 / 44 전사.** 분포 = **`VALIDATED_LEGACY` 0** · `LEGACY_ADAPTER` 1 · `BLOCKED_PREREQUISITE` 2 · `ABSENT` 2 · `NOT_APPLICABLE` 39.

---

## 1-B. §55 Warning Contract 원문 전사 + 판정 — **원문 18종**

| # | 원문 경고코드 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | APPROVAL_DELEGATION_SOURCE_WARNING | 🔴 외부 소스(HRIS Leave·Calendar OOO·ERP Delegate) 5종 전량 ABSENT(ⓑ §1) — 경고 낼 소스 없음 | `NOT_APPLICABLE` |
| 2 | APPROVAL_DELEGATION_VERSION_WARNING | 버전 엔티티 부재 | `NOT_APPLICABLE` |
| 3 | APPROVAL_DELEGATION_SCOPE_WARNING | Scope 엔티티 부재 | `NOT_APPLICABLE` |
| 4 | APPROVAL_DELEGATION_PERIOD_WARNING | Period 엔티티 부재(`valid_to` grep 0) | `NOT_APPLICABLE` |
| 5 | APPROVAL_DELEGATION_ACCEPTANCE_WARNING | 수락 개념 부재 | `NOT_APPLICABLE` |
| 6 | APPROVAL_DELEGATION_APPROVAL_WARNING | Approval Foundation 커버 0(ⓑ §3.1) | `NOT_APPLICABLE` |
| 7 | APPROVAL_DELEGATION_AUTHORITY_WARNING | Authority Foundation ABSENT(ⓑ §3.2) — 계약 부재로 경고 무발동 | `NOT_APPLICABLE` |
| 8 | APPROVAL_DELEGATION_MONETARY_WARNING | 금액축 부재(`HIGH_VALUE_KRW` boolean만) | `NOT_APPLICABLE` |
| 9 | APPROVAL_DELEGATION_CURRENCY_WARNING | 통화 스코프 0 | `NOT_APPLICABLE` |
| 10 | APPROVAL_DELEGATION_LEGAL_ENTITY_WARNING | Legal Entity void | `NOT_APPLICABLE` |
| 11 | APPROVAL_DELEGATION_ORGANIZATION_WARNING | Org 엔티티 0 | `NOT_APPLICABLE` |
| 12 | APPROVAL_DELEGATION_REDELEGATION_WARNING | 재위임 경로 0(ⓑ §2.1) | `NOT_APPLICABLE` |
| 13 | APPROVAL_DELEGATION_DEPTH_WARNING | 재위임 깊이 개념 부재 | `NOT_APPLICABLE` |
| 14 | APPROVAL_DELEGATION_CONFLICT_WARNING | Conflict 엔티티 부재 | `NOT_APPLICABLE` |
| 15 | APPROVAL_DELEGATION_CHANGE_IMPACT_WARNING | 버전 변경영향(Version.affected_active_cases) 대상 부재 | `NOT_APPLICABLE` |
| 16 | APPROVAL_DELEGATION_SIMULATION_WARNING | Simulation 엔티티 부재 | `NOT_APPLICABLE` |
| 17 | APPROVAL_DELEGATION_RECONCILIATION_WARNING | Reconciliation 소스 0(ⓑ §1) | `NOT_APPLICABLE` |
| 18 | APPROVAL_DELEGATION_MANUAL_REVIEW_REQUIRED | 수동검토 대상 Delegation 부재 | `NOT_APPLICABLE` |

**§55 실측 개수: 18 / 18 전사.** 분포 = **`VALIDATED_LEGACY` 0** · `NOT_APPLICABLE` 18.

---

## 1-C. 병합 집계 (§54+§55)

**총 실측 개수: 62 / 62 전사**(§54=44 + §55=18). 커버리지 = **`VALIDATED_LEGACY` 0** · `LEGACY_ADAPTER` 1 · `BLOCKED_PREREQUISITE` 2 · `ABSENT` 2 · `NOT_APPLICABLE` 57.

> 🔴 **커버 0.** 에러/경고 계약이 올라앉을 Delegation 엔티티가 통째로 부재하므로 어떤 코드도 `VALIDATED_LEGACY` 가 아니다. `LEGACY_ADAPTER` 1건(TENANT_MISMATCH=Tenant Guard)은 **확장 대상 인접 방어자산**이지 커버가 아니다.

## 2. 규칙

- 🔴 **TENANT_MISMATCH 를 신규 검사로 재구현하지 마라** — Tenant Isolation Guard(`index.php:600`)가 REAL이다(ⓑ §3.4). Delegation 신설 시 이 게이트를 확장하되 **strict 기본을 ON**으로(현재 `:585` OFF) 켜 Cross-Tenant Delegation(§5.4)을 fail-closed 로. **중복 게이트 금지.**
- 🔴 **ORIGINAL_AUTHORITY_MISSING/INACTIVE 은 선행조건이지 신규 에러가 아니다** — Authority Foundation(§3.2) 신설이 **선행**돼야 발생 경로가 생긴다(ⓑ §3.2). 이 두 코드를 "구현했다"고 표기하려면 Authority Registry/Resolution 실 엔티티가 선결이다.
- 🔴 **SELF_DELEGATION_BLOCKED/CYCLE_DETECTED 은 신설(ABSENT)이며 PM/메뉴 순환검출을 통째로 이식하지 마라** — `Dependencies.php:79-100`·`AdminMenu::wouldCycle:540-555`는 **알고리즘 참조**만(도메인 상이·ⓑ §2.4). Delegator→Delegate 체인 전용 cycle/depth 검출로 신설하라.
- 🔴 **Explicit Deny 를 "있음"으로 표기 금지** — `acl_permission`=allow-only(deny 표현 없음·ⓑ §3.4). 원문 §54/§55에 deny 전용 코드가 없으므로 본 계약엔 별도 행이 없다. Delegation Effect `DENY`(§9) 실장 시 deny 표현 계층 신설이 선행.
- 🔴 **나머지 39+18 코드를 "미구현 결함"으로 오판 금지** — Delegation 계약 대상 엔티티 자체가 부재(§59 "중복 아니라 부재")이므로 `NOT_APPLICABLE`이며, 실 발생 경로는 §3 선행조건(Approval/Authority/Org/Legal Entity/Position) 신설 후 **별도 승인세션**에서만 생긴다.
