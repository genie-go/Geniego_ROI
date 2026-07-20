# DSAR — Approval Role Assignment Suspension (EPIC 06-A-03-02-03-04 Part 3-3 · per-entity: Assignment Suspension · 스펙 §24)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **상위 ADR**: [`ADR_DSAR_ROLE_ASSIGNMENT_GOVERNANCE`](../architecture/ADR_DSAR_ROLE_ASSIGNMENT_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_ROLE_ASSIGNMENT_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_ASSIGNMENT_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_ROLE_ASSIGNMENT_DUPLICATE_AUDIT`](DSAR_APPROVAL_ROLE_ASSIGNMENT_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry(Part 3-1)·Role Hierarchy(Part 3-2)·Decision Core 실 구현 부재
- **불변**: 만료/정지/취소는 Version 생성 · Assignment Scope Intersection 기본 · Golden Rule(Extend not Replace) · 반날조(file:line은 상위 ADR·ground-truth 2문서만 인용·없으면 ABSENT) · 289차 P1~P4·admin_roles 폐기 재플래그 금지

---

## 1. 목적

스펙 §24 Assignment Suspension은 Temporary·Manual·Policy·Incident 사유로 Assignment를 **일시 정지**(취소와 구분되는 되돌릴 수 있는 상태)시키는 능력이다. ★**PARTIAL 판정**: `is_active` 이진 토글이 유일한 근접 substrate이며, 이 필드는 **Suspension과 Revocation을 구분하지 못한다** — GROUND_TRUTH §2 표에 명시된 대로 api_key는 "revoke=suspend 미구분"이고, 나머지 자원도 동일 필드를 재사용한다.

## 2. Canonical 필드

`APPROVAL_ROLE_ASSIGNMENT_SUSPENSION`(전부 신규 · 스펙 §24 원문 그대로)

| # | 필드 | 의미 |
|---|---|---|
| 1 | suspension id | 식별자 |
| 2 | assignment id | 대상 Assignment |
| 3 | suspension type | 아래 §3 |
| 4 | suspended by | 집행자 |
| 5 | reason | 사유(정책/인시던트/수동) |
| 6 | suspended at / scheduled resume at | 정지 시각/재개 예정 |
| 7 | version reference | Suspension으로 생성된 Version(Version Type=Suspension) |

## 3. 열거형 / 타입

**Suspension Type**(스펙 §24 원문): `TEMPORARY · MANUAL · POLICY · INCIDENT`

## 4. 실 substrate 매핑 (PARTIAL/ABSENT)

| Suspension Type | 판정 | 실 substrate (file:line·없으면 ABSENT) |
|---|---|---|
| MANUAL(team_role) | **★PARTIAL(유일 근접=is_active)** | `deleteTeamMember`(`UserAuth.php:1426-1451`) UPDATE `is_active=0`(`:1445`) — GROUND_TRUTH §2 표에 "is_active=0이 유일"로 명기, revoke와 동일 메커니즘·구분 없음 |
| MANUAL(sub-admin) | **★PARTIAL** | `updateSubAdmin`(`UserAuth.php:1679-1682`) is_active 토글 — 정지 전용 함수 아님(범용 활성/비활성) |
| MANUAL(api_key) | **★PARTIAL(revoke와 미구분)** | `Keys.php:135-148`/`UserAuth.php:4364-4377` is_active=0 — GROUND_TRUTH §2 표 "revoke=suspend 미구분" 명시 |
| TEMPORARY | **ABSENT** | 자동 재개(scheduled resume) 개념·워커 부재. Temporary Assignment 자체(§11)가 순신규이므로 그 정지 축도 부재 |
| POLICY | **ABSENT** | 정책 위반 자동 정지 트리거 부재 |
| INCIDENT | **ABSENT** | Incident 연동 정지 부재 |
| wms_permissions | **ABSENT** | is_active/status 컬럼 자체 없음(`Wms.php:72-76,114`) — 정지 개념 자체가 물리적으로 불가능, 하드 DELETE(`:519-526`)만 존재 |
| pm_task_assignees | **ABSENT** | 정지 개념 없음(assigned_at만 존재), 제거는 하드 DELETE(`Assignees.php:52-72`) |

## 5. 설계 원칙

- Suspension은 Revocation과 **분리된 Lifecycle 상태**(§7의 Suspended vs Revoked)로 설계한다 — 현행 is_active 단일 필드가 두 개념을 뭉뚱그린 것(GROUND_TRUTH "revoke=suspend 미구분")을 그대로 승격하지 않는다. 신설 시 반드시 별도 상태값·재개(§25 Restoration) 경로를 갖는다.
- TEMPORARY Suspension의 자동 재개(scheduled resume)는 §21 Expiration/§22 Renewal과 동일하게 워커 신설이 필요하며, 기존 34개 bin 스크립트 중 이식 가능한 동형 패턴이 없다(전수 0).
- wms_permissions/pm_task_assignees는 **정지라는 상태 자체가 물리적으로 존재할 수 없다**(is_active/status 컬럼 부재·하드 DELETE만) — 이 두 자원에 Suspension을 적용하려면 스키마 신설이 선행돼야 하며, "이미 정지 가능하다"고 오판하지 않는다.

## 6. Gap / BLOCKED_PREREQUISITE

- MANUAL = 3/5 자원 **PARTIAL**(is_active 토글이되 Revocation과 미구분). TEMPORARY/POLICY/INCIDENT = **전부 ABSENT**.
- wms_permissions/pm_task_assignees = 정지 가능한 상태 필드 자체 **ABSENT**(스키마 신설 선행 필요).
- Suspension↔Revocation 구분 자체가 Lifecycle 상태머신(§7) 신설에 종속 — **BLOCKED_PREREQUISITE**(본 Part 본체).
- 실 엔진 = 선행 Assignment Registry/Version/Lifecycle(본 Part 본체)·Permission Engine·Role Registry/Hierarchy 실구현 후 별도 승인세션(RP-002). NOT_CERTIFIED.
