# DSAR — Approval Role Assignment Restoration (EPIC 06-A-03-02-03-04 Part 3-3 · per-entity: Assignment Restoration · 스펙 §25)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **상위 ADR**: [`ADR_DSAR_ROLE_ASSIGNMENT_GOVERNANCE`](../architecture/ADR_DSAR_ROLE_ASSIGNMENT_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_ROLE_ASSIGNMENT_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_ASSIGNMENT_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_ROLE_ASSIGNMENT_DUPLICATE_AUDIT`](DSAR_APPROVAL_ROLE_ASSIGNMENT_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry(Part 3-1)·Role Hierarchy(Part 3-2)·Decision Core 실 구현 부재
- **불변**: 만료/정지/취소는 Version 생성 · Assignment Scope Intersection 기본 · Golden Rule(Extend not Replace) · 반날조(file:line은 상위 ADR·ground-truth 2문서만 인용·없으면 ABSENT) · 289차 P1~P4·admin_roles 폐기 재플래그 금지

---

## 1. 목적

스펙 §25 Assignment Restoration은 정지/취소된 Assignment를 복원할 때 반드시 새 Version을 생성하고, Approval을 확인하고, Snapshot을 생성하는 능력이다. **ABSENT 판정**: 5자원 중 전용 restore 함수는 어디에도 없다(GROUND_TRUTH §2 표 restore 컬럼 전부 "부재" 또는 "is_active=1 재토글"). 유일한 근접은 sub-admin의 `is_active` 재토글이며, 이는 **범용 활성/비활성 setter의 재사용**일 뿐 "복원 전용 함수·Approval 확인·Snapshot 생성"과는 무관하다.

## 2. Canonical 필드

`APPROVAL_ROLE_ASSIGNMENT_RESTORATION`(전부 신규 · 스펙 §25 원문 그대로)

| # | 필드 | 의미 |
|---|---|---|
| 1 | restoration id | 식별자 |
| 2 | assignment id | 대상 Assignment(정지/취소 상태였던) |
| 3 | restored by | 집행자 |
| 4 | reason | 복원 사유 |
| 5 | version reference | Restoration으로 생성된 Version(Version Type=Restoration) |
| 6 | approval confirmation | 복원 승인 확인(§9 결합) |
| 7 | snapshot reference | 복원 시점 Snapshot(§26) |

## 3. 열거형 / 타입

스펙 §25는 별도 열거형(Restoration Type) 없이 3개 필수 절차만 정의: `VERSION 생성 · APPROVAL 확인 · SNAPSHOT 생성`.

## 4. 실 substrate 매핑 (PARTIAL/ABSENT)

| 절차 | 판정 | 실 substrate (file:line·없으면 ABSENT) |
|---|---|---|
| 전용 Restore 함수(team_role) | **ABSENT** | GROUND_TRUTH §2 표 "restore 경로 없음"(soft-delete만·role값 유지) — `deleteTeamMember`(`UserAuth.php:1426-1451`)의 역방향 함수 자체 부재 |
| 전용 Restore 함수(sub-admin) | **근접(유일)이나 전용 아님** | `updateSubAdmin`(`UserAuth.php:1679-1682`) is_active 재토글 — GROUND_TRUTH §2 표 "is_active=1 재토글"로 명기. 정지에 쓴 것과 **동일한 범용 setter**를 반대 방향으로 호출하는 것일 뿐, 복원 전용 함수·검증 로직 없음 |
| 전용 Restore 함수(api_key) | **ABSENT** | GROUND_TRUTH §2 표 restore 컬럼 "부재" — revoke(`Keys.php:135-148`) 이후 되돌리는 경로 없음(rotate는 재발급이지 복원 아님) |
| 전용 Restore 함수(wms_permissions) | **ABSENT(불가역)** | 하드 DELETE(`Wms.php:519-526`)로 물리 삭제되므로 복원 대상 자체가 소멸 |
| 전용 Restore 함수(pm_task_assignees) | **ABSENT(불가역)** | 하드 DELETE(`Assignees.php:52-72`)로 물리 삭제 |
| VERSION 생성 | **ABSENT(전제 부재)** | Assignment Version 자체 없음(§6). `replacePerms`/`replaceScope`(`TeamPermissions.php:324-336,337-346`)는 이전 상태를 보존하지 않아 복원 시 참조할 "이전 Version"이 없음 |
| APPROVAL 확인 | **ABSENT** | 승인 workflow 전수 grep 0(GROUND_TRUTH §3) — 복원 승인 확인 절차 대상 자체 부재 |
| SNAPSHOT 생성 | **근접이나 미적용** | `menu_defaults` snapshot(`AdminMenu.php:119-138,294-311`)이 "변경 전 스냅샷·롤백" 패턴의 근접 substrate이나 메뉴 도메인 전용이며 role assignment에 미적용(GROUND_TRUTH §7 표) |

## 5. 설계 원칙

- Restoration은 **Suspension/Revocation과 대칭인 Lifecycle 전이**로 설계한다 — 복원 가능 여부는 정지(Suspended, 되돌릴 수 있음)와 취소(Revoked/하드 DELETE, 되돌릴 수 없음)를 구분하는 §24 Suspension 설계에 종속된다. 하드 DELETE 자원(wms/pm)은 구조적으로 복원 불가능하므로, Restoration 신설 시 이 두 자원을 Soft-Delete 패턴으로 먼저 전환해야 한다(스키마 변경 선행).
- sub-admin `is_active` 재토글(`UserAuth.php:1679-1682`)을 "Restoration 구현 완료"로 오인하지 않는다 — Version 생성·Approval 확인·Snapshot 생성이라는 §25의 3대 필수 절차가 전무하므로, 값이 되돌아간다는 사실만으로 governance 요건을 충족한 것으로 간주하지 않는다(실재 과신 금지).
- SNAPSHOT 생성은 `menu_defaults`(`AdminMenu.php:119-138,294-311`)의 "변경 전 상태 저장→필요시 되돌리기" **구조 패턴만** 참조하고, 메뉴 스냅샷 자체를 Assignment Snapshot으로 재사용하지 않는다(도메인 분리 유지).

## 6. Gap / BLOCKED_PREREQUISITE

- 전용 Restore 함수 = **전부 ABSENT**(sub-admin의 범용 is_active 재토글만 유일 근접, 전용 아님).
- VERSION/APPROVAL/SNAPSHOT 3대 필수 절차 = **전부 ABSENT**(선행 Version/Approval/Snapshot 엔티티 자체가 본 Part 본체에서 BLOCKED_PREREQUISITE).
- wms_permissions/pm_task_assignees = 하드 DELETE 구조상 **구조적으로 복원 불가**(스키마 전환이 Restoration 신설의 선행 조건).
- 실 엔진 = 선행 Assignment Registry/Version/Approval/Snapshot(본 Part 본체)·Permission Engine·Role Registry/Hierarchy 실구현 후 별도 승인세션(RP-002). NOT_CERTIFIED.
