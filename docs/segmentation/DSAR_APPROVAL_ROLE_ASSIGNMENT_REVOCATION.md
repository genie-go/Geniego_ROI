# DSAR — Approval Role Assignment Revocation (EPIC 06-A-03-02-03-04 Part 3-3 · per-entity: Assignment Revocation · 스펙 §23)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **상위 ADR**: [`ADR_DSAR_ROLE_ASSIGNMENT_GOVERNANCE`](../architecture/ADR_DSAR_ROLE_ASSIGNMENT_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_ROLE_ASSIGNMENT_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_ASSIGNMENT_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_ROLE_ASSIGNMENT_DUPLICATE_AUDIT`](DSAR_APPROVAL_ROLE_ASSIGNMENT_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry(Part 3-1)·Role Hierarchy(Part 3-2)·Decision Core 실 구현 부재
- **불변**: 만료/정지/취소는 Version 생성 · Assignment Scope Intersection 기본 · Golden Rule(Extend not Replace) · 반날조(file:line은 상위 ADR·ground-truth 2문서만 인용·없으면 ABSENT) · 289차 P1~P4·admin_roles 폐기 재플래그 금지

---

## 1. 목적

스펙 §23 Assignment Revocation은 Immediate·Scheduled·Emergency·Incident Based 방식으로 Assignment를 종료하고, 종료 후 Effective Permission 제거·Audit 생성을 수행하는 능력이다. ★**PARTIAL 판정**: `is_active=0` 이진 토글(또는 하드 DELETE)이 5자원 중 다수의 "취소" 대용으로 실재하나(GROUND_TRUTH §2 표), 이는 **정식 상태머신이 아니며** Scheduled/Emergency/Incident Based 구분·Approval Reference·통일된 감사가 없다.

## 2. Canonical 필드

`APPROVAL_ROLE_ASSIGNMENT_REVOCATION`(전부 신규 · 스펙 §23 원문 그대로)

| # | 필드 | 의미 |
|---|---|---|
| 1 | revocation id | 식별자 |
| 2 | assignment id | 대상 Assignment |
| 3 | revocation type | 아래 §3 |
| 4 | revoked by | 집행자 |
| 5 | reason / incident reference | 사유 |
| 6 | effective permission removal | Effective Permission 제거(§17) |
| 7 | audit reference | 감사 기록 |
| 8 | version reference | Revocation으로 생성된 Version(Version Type=Revocation) |

## 3. 열거형 / 타입

**Revocation Type**(스펙 §23 원문): `IMMEDIATE · SCHEDULED · EMERGENCY · INCIDENT_BASED`

## 4. 실 substrate 매핑 (PARTIAL/ABSENT)

| Revocation Type | 판정 | 실 substrate (file:line·없으면 ABSENT) |
|---|---|---|
| IMMEDIATE(team_role) | **★PARTIAL** | `deleteTeamMember`(`:1426-1451`) UPDATE `is_active=0`(`UserAuth.php:1445`)·세션 폐기(`:1446`)·role 값 자체는 불변(취소 아니라 접근 차단) |
| IMMEDIATE(sub-admin) | **★PARTIAL** | `updateSubAdmin`(`UserAuth.php:1679-1682`) is_active 토글 |
| IMMEDIATE(api_key) | **★PARTIAL(비대칭 감사)** | `Keys.php:135-148`(is_active=0·**감사 0**) vs `UserAuth.php:4364-4377`(is_active=0·**감사 실재** `:4360,4375,4398`) — 동일 자원 2경로 감사 비대칭(DUPLICATE_AUDIT D-2) |
| IMMEDIATE(wms_permissions) | **ABSENT(하드 DELETE만)** | `deletePermission`(`Wms.php:519-526`) — is_active 컬럼 자체 없음, 되돌릴 수 없는 물리 삭제. 감사 0 |
| IMMEDIATE(pm_task_assignees) | **PARTIAL(감사 실재)** | `remove`(`Assignees.php:52-72`) DELETE·**audit** (`:65-70`→pm_audit_log) |
| SCHEDULED | **ABSENT** | 예약 취소(미래 시점 revoke) 개념·워커 부재 |
| EMERGENCY | **ABSENT** | Emergency Assignment 자체 부재(§12)라 그 취소도 부재. break-glass(`UserAuth.php:790-801`)는 인증우회지 role 취소 아님(GROUND_TRUTH §7 표) |
| INCIDENT_BASED | **ABSENT** | Incident Reference 필드·연동 부재 |
| Effective Permission 제거 | **N/A(부작용으로만 발생)** | `effectiveForUser`(`TeamPermissions.php:366-394`)가 매 요청 라이브 재계산이라 is_active=0 반영 시 다음 요청부터 자동 소멸 — "제거"를 위한 전용 로직이 아니라 라이브 재계산의 부작용 |
| Audit 생성 | **비일관(SSOT 아님)** | 실재: sub-admin(`UserAuth.php:1626,1656,1708`)·apiKeys UserAuth 경로(`:4360,4375,4398`)·pm(`Assignees.php:65-70`). 부재: `deleteTeamMember`(팀원 비활성)·`Keys.php` 경로·wms(GROUND_TRUTH §5) |

## 5. 설계 원칙

- Revocation은 **정식 Lifecycle 상태머신**(§7 Requested~Archived 중 Revoked)의 한 전이로 설계하며, 현행 is_active 이진 토글을 그대로 승격하지 않는다 — 이진 토글은 Revoked/Suspended를 구분하지 못한다(§24 Suspension DSAR와 동일 근거).
- wms_permissions 하드 DELETE는 **불가역**이라 Revocation의 "종료 상태로 전이"와 근본적으로 다른 패턴이다(복원 불가) — 신설 시 하드 DELETE를 Revocation의 참조 패턴으로 오흡수하지 않는다.
- api_key.role 2경로 감사 비대칭(`Keys.php:135-148` 감사 0 vs `UserAuth.php:4364-4377` 감사 실재)은 Canonical Assignment Registry가 **단일 진입점으로 중개**해 해소해야 할 통합 대상이다(ADR D-1 `CONSOLIDATION_REQUIRED`) — 신규 Revocation 로직을 2경로 중 한쪽에만 배선하지 않는다.
- Effective Permission 제거(§17)는 §21 Expiration DSAR와 동일하게, "제거 트리거 설계"가 아니라 라이브 재계산의 부작용임을 명시하고 혼동하지 않는다.

## 6. Gap / BLOCKED_PREREQUISITE

- IMMEDIATE = **PARTIAL**(4/5 자원 근접, wms만 ABSENT). SCHEDULED/EMERGENCY/INCIDENT_BASED = **전부 ABSENT**.
- Audit = **비일관**(3/5 자원만 실재) — Revocation Audit을 SecurityAudit tamper-evident 체인(`SecurityAudit.php:56-68`)으로 승격하는 것이 ADR D-1 결정(현재는 role assignment 이벤트 미기록).
- 실 엔진 = 선행 Assignment Registry/Version(본 Part 본체)·Permission Engine·Role Registry/Hierarchy 실구현 후 별도 승인세션(RP-002). NOT_CERTIFIED.
