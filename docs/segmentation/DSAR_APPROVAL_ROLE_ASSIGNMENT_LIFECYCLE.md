# DSAR — Approval Role Assignment Lifecycle (EPIC 06-A-03-02-03-04 Part 3-3 · per-entity: Role Assignment Lifecycle)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **상위 ADR**: [`ADR_DSAR_ROLE_ASSIGNMENT_GOVERNANCE`](../architecture/ADR_DSAR_ROLE_ASSIGNMENT_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_ROLE_ASSIGNMENT_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_ASSIGNMENT_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_ROLE_ASSIGNMENT_DUPLICATE_AUDIT`](DSAR_APPROVAL_ROLE_ASSIGNMENT_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry/Hierarchy(Part 3-1/3-2)·Decision Core 실 구현 부재
- **불변**: Assignment ≠ 즉시 direct write · 인가 실소비 role에만 · Golden Rule(5분산 write 통합) · 반날조(substrate file:line은 상위 ADR·ground-truth 2문서만·없으면 ABSENT)

## 1. 목적

Assignment Lifecycle(스펙 §7)은 Assignment가 생성부터 소멸까지 거치는 12개 상태를 정의한다. ADR D-2가 규정하듯 "Assignment ≠ 즉시 direct write"의 핵심 근거 엔티티로, 현행 5경로가 caller 권한검증 통과 즉시 단일 트랜잭션으로 반영되는 것과 대비하여, Canonical Assignment는 Requested부터 Archived까지 상태를 거쳐야 한다. ground-truth는 이 계층을 "is_active 이진 토글이 유일 근접"으로 정직 판정한다(§2).

## 2. Canonical 필드

스펙 §7은 상태 열거만 정의하고 별도 필드 섹션이 없다. 설계 제안(스펙 §5 Assignment Definition의 "Assignment Lifecycle" 필드를 상태 전이 기록으로 구체화): Lifecycle State(현재 상태) · State Entered At · State Changed By · Prior State · Transition Reason · Transition Version Reference(§6 Version과 연동).

## 3. 열거형 / 타입

스펙 §7 원문 — **Assignment Lifecycle 상태(12)**: Requested · Draft · Pending Review · Pending Approval · Approved · Scheduled · Active · Suspended · Expired · Revoked · Replaced · Archived.

## 4. 실 substrate 매핑 (PARTIAL/ABSENT·ground-truth만 인용)

- **상태머신 자체 = ABSENT**(ground-truth §6 "Lifecycle 상태머신(Requested~Archived 12상태)" 부재 목록 명시). 5개 실행 substrate 어디에도 12상태 중 하나 이상을 구조적으로 표현하는 컬럼이 없다.
- **is_active 이진 토글 = 유일 근접(3/5 자원)**(ground-truth §2 표):
  - team_role(팀원): `deleteTeamMember`(`UserAuth.php:1426-1451`)가 UPDATE `is_active=0`(`:1445`)·역할 값 자체는 불변·**restore 경로 없음**. 이는 Lifecycle의 "Suspended"/"Revoked" 어느 쪽에도 정형 대응하지 않는 단순 이진값.
  - sub-admin: `updateSubAdmin`(`UserAuth.php:1679-1682`) is_active 토글·재활성 시 is_active=1 재토글(=DELETE 라우트 자체 부재).
  - api_key: `Keys.php:135-148`/`UserAuth.php:4364-4377` is_active=0 — **revoke와 suspend가 미구분**(ground-truth §2 표 "revoke=suspend 미구분").
- **wms_permissions/pm_task_assignees = Lifecycle 완전 부재**: 둘 다 하드 DELETE만 존재(`Wms.php:519-526`·`Assignees.php:52-72`)하고 is_active 컬럼조차 없음(ground-truth §2 표).
- **Expired 상태 = 사실상 api_key 1건만 근접**: `Keys.php:119,170`의 `expires_at` + `index.php:518-520` 요청시점 게이트가 유일한 시간기반 실효(ground-truth §2 "★role/permission 만료 cron 부재·유일 시간기반 실효=api_key expires_at 게이트-체크"). 이마저 **워커가 아니라 요청시점 체크**이므로 정형 "Expired" 상태 전이 이벤트가 발생하지 않는다.
- **Pending Review/Pending Approval/Approved = 전면 ABSENT**: 승인 workflow 자체가 5경로 어디에도 없음(ADR §3 "승인 workflow 부재(전수 grep 0)").
- **Scheduled = ABSENT**: 예약 배정 부재(ADR D-5 "Temporary/Scheduled: 만료/예약 role 부재(순신규)").

## 5. 설계 원칙

- is_active 이진 토글을 Lifecycle의 "대용"으로 오흡수하지 않는다 — ground-truth가 명시하듯 "정식 상태머신 아님"(ADR §1 총평). Lifecycle 도입 시 is_active는 하위 substrate의 실행 결과로 매핑되되, 12상태 자체를 대체하지 않는다.
- Lifecycle 전이는 반드시 Version 생성을 동반한다(§6 연동 — 스펙 §7과 §6은 분리 서술되나 ADR D-2가 "Version·Approval·Lifecycle·Snapshot을 갖는 1급 엔티티"로 결합 요구).
- Suspended/Revoked/Expired/Restored 4개 상태는 현재 revoke/suspend가 미구분(api_key)이거나 restore 경로가 없는(team_role) 문제를 직접 해소하는 설계 목표로 삼는다(ground-truth §2 표의 결손 항목과 1:1 대응).
- Runtime Guard(스펙 §35)가 Expired/Suspended/Revoked Assignment의 요청 시점 차단을 담당 — api_key의 `expires_at` 게이트 패턴(`index.php:518-520`)을 다른 4개 substrate로 확장하는 것이 조립 방향(ADR §3 Canonical Interface "Lifecycle 연산").

## 6. Gap / BLOCKED_PREREQUISITE

- **BLOCKED_PREREQUISITE(RP-002)**: Pending Approval/Approved 상태는 Decision Core·Approval workflow 선행 필요. Scheduled는 Part 3-4+ Temporary/Scheduled Assignment 설계 선행 필요.
- **Gap**: role/permission 만료 cron이 bin 스크립트 전수 0(ground-truth §2 "★role/permission 만료 cron 부재") — Expired 상태로의 자동 전이를 위한 워커 자체가 없음. wms_permissions/pm_task_assignees는 Lifecycle 필드를 담을 컬럼조차 없어 스키마 신설 필요.
- 실 구현 = 선행 Permission Engine·Role Registry/Hierarchy·Decision Core 실구현 후 별도 승인세션(RP-002).
