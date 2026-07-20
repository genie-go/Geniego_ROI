# DSAR — Approval Role Assignment Status (EPIC 06-A-03-02-03-04 Part 3-3 · per-entity: Role Assignment Status)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **상위 ADR**: [`ADR_DSAR_ROLE_ASSIGNMENT_GOVERNANCE`](../architecture/ADR_DSAR_ROLE_ASSIGNMENT_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_ROLE_ASSIGNMENT_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_ASSIGNMENT_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_ROLE_ASSIGNMENT_DUPLICATE_AUDIT`](DSAR_APPROVAL_ROLE_ASSIGNMENT_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry/Hierarchy(Part 3-1/3-2)·Decision Core 실 구현 부재
- **불변**: Assignment ≠ 즉시 direct write · 인가 실소비 role에만 · Golden Rule(5분산 write 통합) · 반날조(substrate file:line은 상위 ADR·ground-truth 2문서만·없으면 ABSENT)

## 1. 목적

Assignment Status는 스펙 §5(Assignment Definition 필수 필드)의 "Assignment Status" 필드가 담는 값 자체를 다루는 엔티티로, §7 Lifecycle(상태 전이의 상태머신)과 짝을 이루되 초점이 다르다 — Lifecycle이 "어떻게 전이하는가"라면 Status는 "현재 어떤 상태로 조회·필터링되는가"의 스냅샷 값이다. Part 3-3에서는 이 둘을 동일 열거값 집합(스펙 §7의 12상태)을 공유하도록 설계하며, Status는 그중 한 시점의 값을 노출하는 읽기 계층에 가깝다.

## 2. Canonical 필드

스펙은 Status를 위한 별도 필드 섹션을 두지 않는다(§5 "Assignment Status" 단일 필드로만 언급). 설계 제안: Assignment ID(참조) · Current Status(§7 열거값) · Status As Of(조회 시점) · Derived From Version(§6 Version 참조 — 현재 상태는 최신 Version의 결과).

## 3. 열거형 / 타입

Status 값 도메인은 스펙 §7 Lifecycle 열거를 공유: Requested · Draft · Pending Review · Pending Approval · Approved · Scheduled · Active · Suspended · Expired · Revoked · Replaced · Archived. (본 문서는 이 12값의 "현재 조회값"으로서의 성격을 다루며, 전이 규칙은 `DSAR_APPROVAL_ROLE_ASSIGNMENT_LIFECYCLE.md` 참조.)

## 4. 실 substrate 매핑 (PARTIAL/ABSENT·ground-truth만 인용)

- **12값 Status 자체 = ABSENT**(Lifecycle 문서와 동일 근거 — ground-truth §6). 조회 가능한 "현재 상태"로서 실재하는 값은 사실상 **이진(active/inactive)** 뿐이다.
- **근접 substrate = is_active 컬럼(3/5 자원)**: team_role(`UserAuth.php:1445`)·sub-admin(`UserAuth.php:1679-1682`)·api_key(`Keys.php:135-148`/`UserAuth.php:4364-4377`)가 조회 가능한 boolean 상태를 제공. 이는 Status 값공간(12값) 중 사실상 Active/Revoked(또는 Suspended, 구분 안 됨) 2값만 표현하는 축소판.
- **wms_permissions/pm_task_assignees = Status 컬럼 자체 없음**: 레코드 존재 여부(DELETE로 소멸) 자체가 유일한 "상태" — 즉 Active/Not-Exists 2값(`Wms.php:505-526`·`Assignees.php:17-72`).
- **api_key만 3번째 값 근접**: `expires_at`(`Keys.php:119,170`) 경과 시 요청시점 게이트(`index.php:518-520`)가 사실상 "Expired"에 해당하는 판정을 내리나, 이는 저장된 Status 값이 아니라 매 요청 시 즉석 계산되는 파생값이다(ground-truth §2 "요청시점 강제·워커 아님").
- **조회 API 부재**: "현재 Assignment Status가 무엇인가"를 정형 조회하는 API/함수 자체가 5경로 어디에도 없음 — 각 도메인이 자기 레코드의 is_active/존재여부만 자체 조회할 뿐, Assignment 전용 Status 조회 계층은 grep 0.

## 5. 설계 원칙

- Status는 Lifecycle 상태 전이의 **파생 읽기 값**으로 설계하며, 별도의 독립 쓰기 경로를 갖지 않는다(단일 소스는 Lifecycle/Version, ADR D-2 "1급 엔티티" 원칙과 정합).
- is_active 이진값을 Status 12값으로 확장할 때, 기존 3개 자원(team_role/sub-admin/api_key)의 boolean 의미(현재 "정지"와 "취소"가 뒤섞여 있음 — ground-truth §2 "revoke=suspend 미구분")를 먼저 Suspended/Revoked로 명확히 분리하는 것이 설계 전제.
- wms_permissions/pm_task_assignees처럼 Status 컬럼 자체가 없는 자원은 하드 DELETE 대신 Status 필드를 갖도록 확장하는 것이 목표(Golden Rule — 파괴적 삭제를 상태전이로 대체).

## 6. Gap / BLOCKED_PREREQUISITE

- **BLOCKED_PREREQUISITE(RP-002)**: Status 조회 계층은 Lifecycle 상태머신 구현이 선행되어야 의미를 가짐(RP-002 동일 전제).
- **Gap**: Suspended/Revoked 미구분(api_key)·Expired가 저장값이 아닌 파생값·wms_permissions/pm_task_assignees의 Status 컬럼 부재 — 3가지 모두 스키마 신설 필요.
- 실 구현 = 선행 Permission Engine·Role Registry/Hierarchy·Decision Core 실구현 후 별도 승인세션(RP-002).
