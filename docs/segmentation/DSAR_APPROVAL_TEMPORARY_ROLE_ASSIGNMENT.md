# DSAR — Temporary Role Assignment (EPIC 06-A-03-02-03-04 Part 3-3 · per-entity 설계 · 스펙 §11)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **판정**: BLOCKED_PREREQUISITE (RP-002 — 선행 Permission Engine(Part 2) + Role Registry(Part 3-1) + Role Hierarchy(Part 3-2) 실 구현 후 별도 승인세션)
- **상위 ADR**: [`ADR_DSAR_ROLE_ASSIGNMENT_GOVERNANCE`](../architecture/ADR_DSAR_ROLE_ASSIGNMENT_GOVERNANCE.md)
- **전수조사(ⓑ) ground-truth**: [`DSAR_APPROVAL_ROLE_ASSIGNMENT_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_ASSIGNMENT_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_ROLE_ASSIGNMENT_DUPLICATE_AUDIT`](DSAR_APPROVAL_ROLE_ASSIGNMENT_DUPLICATE_AUDIT.md)
- **불변**: Delegated Assignment ≤ 원 Assignment Scope · Emergency Assignment = Auto Expiration + Mandatory Audit(스펙 §12·§14) · 과거 Version 수정 금지(ADR §D-2) · Golden Rule(Extend not Replace·중복 신설 금지)
- **반날조 규율**: 모든 `file:line`은 위 ADR·전수조사 2문서에서만 인용한다. 그 밖은 **ABSENT**. 폐기 `admin_roles`/`user_roles`(289차 P3) 재부활 금지 · break-glass MFA 우회는 289차 BLOCKED_SECURITY 등재분(재플래그 금지).

---

## 1. 목적

Temporary Role Assignment = 한시적으로 부여되는 Role Assignment로, 지정된 Expiration 시점에 **자동 제거(Automatic Removal)**되어야 하는 Assignment 유형(스펙 §11). 사용자가 명시적으로 revoke하지 않아도 시간 경과만으로 권한이 소멸하는 것이 핵심 특성이며, 임시 Scope·임시 Permission Projection·Renewal·Reminder를 포함한다.

- **순신규**: 만료 시 자동 제거되는 role 개념 자체가 부재(ADR §D-5·EXISTING §2) → is_active 이진 토글은 "정지" 대용일 뿐 시간 기반 만료가 아니다.

## 2. Canonical 필드

`APPROVAL_ROLE_ASSIGNMENT`(Temporary 하위유형·스펙 §5·§11 원문 그대로)

| # | 필드 | 의미 |
|---|---|---|
| 1 | assignment id | Assignment 식별자 |
| 2 | subject id / subject type | 대상 Subject(스펙 §3) |
| 3 | temporary role | 임시로 부여되는 Role |
| 4 | temporary scope | 임시 Assignment Scope(스펙 §8) |
| 5 | temporary permission projection | 임시 Effective Permission 투영(스펙 §17) |
| 6 | expiration | 만료 시점(Fixed Date/Relative Duration — 스펙 §21) |
| 7 | automatic removal | 만료 시 자동 제거 플래그 |
| 8 | renewal | 갱신 여부/정책(스펙 §22) |
| 9 | reminder | 만료 임박 알림(스펙 §38 Assignment Expiring Warning 연동) |
| 10 | assignment lifecycle | Requested~Archived 상태(스펙 §7) |
| 11 | assignment version | 변경 이력(스펙 §6) |

## 3. 열거형 / 타입

Assignment Lifecycle(스펙 §7 공통) 중 Temporary와 직결되는 상태: `Approved` → `Scheduled`/`Active` → `Expired`. Expiration 유형(스펙 §21): `Fixed Date` · `Relative Duration` · `Scheduled Expiration` · `Immediate Expiration`. Renewal 유형(스펙 §22): `Manual` · `Auto` · `Approval Required` · `Review Required`.

## 4. 실 substrate 매핑 (PARTIAL/ABSENT)

| Temporary 요소 | 최근접 substrate | file:line | 판정 |
|---|---|---|---|
| Automatic Removal(만료 시 자동 제거) | — | ABSENT(EXISTING §2·§6 — "role/permission 만료 cron 부재·bin 34 스크립트 전수 0") | **ABSENT** — 시간 기반 자동 제거 워커 전무 |
| Expiration(가장 근접 아날로그) | api_key `expires_at` 요청시점 게이트 | `Keys.php:119,170`·`index.php:518-520` | ★근접이나 **API Client(api_key) 전용**·team_role/wms_permissions/pm_task_assignees는 만료 컬럼 자체 없음(EXISTING §2 표 "부재(grep 0)·role_expires 컬럼 없음") · 게이트-체크 방식이지 자동 revoke 워커 아님 |
| is_active 이진 토글 | 소프트삭제(정지 대용) | `UserAuth.php:1445`(deleteTeamMember) | 근접이나 **시간 무관 수동 토글**·role 값 자체는 불변·restore 경로 없음(EXISTING §1.1) |
| Renewal | — | ABSENT | Assignment Version 자체(ADR §D-2) 미신설 → Renewal Version Type 대상 없음 |
| Reminder | — | ABSENT | Warning Contract(스펙 §38) 미구현 |
| Temporary Permission Projection | effectiveForUser(라이브 재계산이나 Temporary 개념 무관) | `TeamPermissions.php:366-394` | 근접(유효권한 계산 substrate)이나 Temporary Assignment를 입력으로 소비하지 않음(DUPLICATE_AUDIT D-4) |

## 5. 설계 원칙

- **자동 제거는 Mandatory Control**(스펙 §11 "만료 시 자동 제거") — 고객 설정으로 비활성 불가. 신설 시 Expiration Worker + Cache Invalidation(스펙 §34) 동시 설계 필수.
- **api_key expires_at 패턴을 확장 substrate로만 재사용**(ADR §3 "Lifecycle 연산… api_key expires_at 패턴 확장") — team_role/wms/pm에 동일 컬럼을 직접 이식하지 않고 Canonical Assignment Version의 Effective To 필드로 통합.
- **is_active 토글을 Temporary Assignment로 오흡수 금지**: is_active는 수동 정지 신호이지 시간 계산 결과가 아니다(정직 판정 유지).
- **오탐 방지**: "만료 워커 부재"는 289차 P1~P4·break-glass 재플래그 대상이 아닌 순수 신규 Gap이다.

## 6. Gap / BLOCKED_PREREQUISITE

- Automatic Removal 워커 = **전 구간 ABSENT**(cron 0) → Temporary Assignment 실 엔진의 최우선 신설 항목.
- Assignment Version/Lifecycle 자체 = **BLOCKED_PREREQUISITE**(ADR §D-2 코드 0) → Renewal Version Type 대상 없음.
- Temporary Permission Projection = **BLOCKED_PREREQUISITE**(Part 2 Permission Engine 코드 0).
- api_key expires_at 확장 시에도 scope 상한 통합(Keys.php/UserAuth.php 2경로 divergent — DUPLICATE_AUDIT D-2)까지 선결 필요.
- 실 엔진 = 선행 Permission Engine·Role Registry/Hierarchy·Decision Core 실구현 후 **별도 승인세션(RP-002)**. 본 편 코드/DB 0 · NOT_CERTIFIED.
