# DSAR — Approval Job Role Assignment (EPIC 06-A-03-02-03-04 Part 3-3 · per-entity: Job Assignment)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **상위 ADR**: [`ADR_DSAR_ROLE_ASSIGNMENT_GOVERNANCE`](../architecture/ADR_DSAR_ROLE_ASSIGNMENT_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_ROLE_ASSIGNMENT_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_ASSIGNMENT_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_ROLE_ASSIGNMENT_DUPLICATE_AUDIT`](DSAR_APPROVAL_ROLE_ASSIGNMENT_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry/Hierarchy(Part 3-1/3-2)·Decision Core 실 구현 부재
- **불변**: Assignment ≠ 즉시 direct write · 인가 실소비 role에만 · Golden Rule(5분산 write 통합) · 반날조(substrate file:line은 상위 ADR·ground-truth 2문서만·없으면 ABSENT · Job 엔티티 부재 날조 금지)

## 1. 목적

스펙 §1-10(Job Assignment)·§3(지원 Assignment 유형에 Job 포함) — 직무(Job) 단위로 Role을 부여하는 Assignment 유형이다. Position Assignment(§1-9)와 함께 ADR D-4 "Position/Job 부재(Team차원 TEAM_TYPES만)" 판정의 대상이다.

## 2. Canonical 필드

스펙 §5 Assignment Definition 원문(공통): Assignment ID · Assignment Code · Subject ID · Subject Type · Role Definition ID · Role Version · Assignment Type(=Job) · Assignment Owner · Assignment Status · Assignment Lifecycle · Assignment Scope · Effective From · Effective To · Created By · Approved By · Snapshot ID · Digest · Evidence.

## 3. 열거형 / 타입

- **Assignment Type** 값 중 Job(§3). 스펙은 Job Assignment를 §1-10에 항목으로만 명시하고 Job 자체의 값 도메인(직무 카테고리 등)을 별도 열거하지 않음.

## 4. 실 substrate 매핑 (PARTIAL/ABSENT · ground-truth만 인용)

**ABSENT — Job 엔티티 자체가 ground-truth 2편에 grep 매치 없음.**

- ADR §1 결론(D-4 대응): "Employee/External/Partner/Vendor=Team 차원(TEAM_TYPES)이지 Subject 차원 아님". Job이라는 축은 ADR·EXISTING·DUPLICATE_AUDIT 어디에도 언급되지 않는다(Position보다 더 근접 substrate조차 없음).
- EXISTING §4 Subject 유형 표에 Job 관련 행 자체가 존재하지 않음. 유일하게 "역할" 개념을 갖는 것은 `pm_task_assignees`(§1.5, ROLE_ENUM owner/contributor/reviewer/observer)이나, 이는 **과제(task) 단위 담당자 역할**이지 직무(Job) 분류가 아니며 team_role과 별개 네임스페이스로 명시되어 있다(EXISTING §1.5 "team_role과 별개 네임스페이스(과제 단위)"). Job으로 오독 금지.

**ABSENT — 거버넌스 계층**: Registry/Definition/Version/Lifecycle/Snapshot/Evidence/Digest 전 구간 순신규(EXISTING §6). Job substrate가 아예 없으므로 이 부재 목록이 전면 적용.

## 5. 설계 원칙

- ADR D-4 "부재 유형을 날조하지 않음"을 그대로 적용 — `pm_task_assignees`(과제 단위 역할)를 Job Assignment로 오흡수하지 않는다. DUPLICATE_AUDIT §2 "중복이 아닌 것" 원칙과 정합(별개 축 보존).
- Job Assignment는 Position Assignment와 마찬가지로 순신규 엔티티 설계가 선행되어야 하며, 이번 Part 3-3에서는 Canonical Interface(Assignment Type 열거값)만 확정한다.

## 6. Gap / BLOCKED_PREREQUISITE

- **BLOCKED_PREREQUISITE(RP-002)**: 선행 Permission Engine·Role Registry/Hierarchy·Decision Core 실구현 필요. 그에 앞서 Job 엔티티 자체가 순신규.
- **Gap**: Job 엔티티·직무 분류 체계·Job→Role 매핑 규칙 전부 부재(grep 0). `pm_task_assignees`(과제 역할)와의 경계를 명확히 유지해야 함(오흡수 금지).
- 실 구현 = Job 엔티티 신설 + 선행 Permission Engine·Role Registry/Hierarchy·Decision Core 실구현 후 별도 승인세션(RP-002). 이번 차수는 설계 명세(코드 0).
