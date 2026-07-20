# DSAR — Approval Position Role Assignment (EPIC 06-A-03-02-03-04 Part 3-3 · per-entity: Position Assignment)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **상위 ADR**: [`ADR_DSAR_ROLE_ASSIGNMENT_GOVERNANCE`](../architecture/ADR_DSAR_ROLE_ASSIGNMENT_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_ROLE_ASSIGNMENT_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_ASSIGNMENT_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_ROLE_ASSIGNMENT_DUPLICATE_AUDIT`](DSAR_APPROVAL_ROLE_ASSIGNMENT_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry/Hierarchy(Part 3-1/3-2)·Decision Core 실 구현 부재
- **불변**: Assignment ≠ 즉시 direct write · 인가 실소비 role에만 · Golden Rule(5분산 write 통합) · 반날조(substrate file:line은 상위 ADR·ground-truth 2문서만·없으면 ABSENT · Position 엔티티 부재 날조 금지)

## 1. 목적

스펙 §1-9(Position Assignment)·§3(지원 Assignment 유형에 Position 포함)·§19(Assignment Eligibility에 Position 포함) — 직위/직책(Position) 단위로 Role을 부여하는 Assignment 유형이다. 본 문서는 ADR D-4가 명시하는 "Position/Job 부재(Team차원 TEAM_TYPES만)" 판정을 per-entity 수준에서 정직하게 기록한다.

## 2. Canonical 필드

스펙 §5 Assignment Definition 원문(공통): Assignment ID · Assignment Code · Subject ID · Subject Type · Role Definition ID · Role Version · Assignment Type(=Position) · Assignment Owner · Assignment Status · Assignment Lifecycle · Assignment Scope · Effective From · Effective To · Created By · Approved By · Snapshot ID · Digest · Evidence. §19 Assignment Eligibility 원문에 Position이 Eligibility 판단 축(Actor Type · Tenant · Organization · **Position** · Employment Status · Authentication Assurance · Required Membership · Required Certification)으로 명시.

## 3. 열거형 / 타입

- **Assignment Type** 값 중 Position(§3).
- **Assignment Eligibility** 축(§19) 중 Position.
- Position 자체의 값 도메인(직위 레벨 등)은 스펙 비열거·ground-truth 미언급 — 설계 확정 필요.

## 4. 실 substrate 매핑 (PARTIAL/ABSENT · ground-truth만 인용)

**ABSENT — Position 엔티티 자체가 ground-truth 2편에 grep 매치 없음.**

- ADR §1 결론: "Employee/External/Partner/Vendor=Team 차원(TEAM_TYPES)이지 Subject 차원 아님. Canonical Assignment는 Subject Type을 1급 축으로 신설·**부재 유형을 날조하지 않음**." (§4 Subject 유형·Actor Eligibility)
- EXISTING §4 Subject 유형 표: Human(app_user+team_role) · API Client(api_key) · Service Account/System Actor/Robot(부재) · Employee/External/Partner/Vendor(Team 차원만) · pm 담당자(pm_task_assignees) · acl_permission subject('team'|'member'만) — **Position이라는 축 자체가 표에 존재하지 않음**.
- 유일하게 유사해 보이는 것은 `TeamPermissions::TEAM_TYPES`(`TeamPermissions.php:44-49`)인데, 이는 Team의 하위 분류(partner_* 등)이며 개인 직위/직책 개념이 아니다 — Position으로 오독 금지.

**ABSENT — 거버넌스 계층**: Registry/Definition/Version/Lifecycle/Snapshot/Evidence/Digest 전 구간 순신규(EXISTING §6). Position Assignment는 substrate가 아예 없으므로 이 부재 목록이 전면 적용.

## 5. 설계 원칙

- ADR D-4 "부재 유형을 날조하지 않음" 원칙을 그대로 적용 — Position Assignment는 TEAM_TYPES를 Position으로 재해석하지 않는다.
- Position Assignment 설계는 Part 3-3 이번 차수에서 Canonical Interface(§3 Assignment 대상 열거·§19 Eligibility 축)만 확정하고, 실 Position 엔티티·직위 계층은 순신규로 별도 설계 단계가 필요함을 명시.
- Organization Assignment(§1-8)와 마찬가지로 조직 계층에 종속되는 개념이므로, Organization 엔티티 설계와 연동해 중복 계층 신설을 피한다(Golden Rule).

## 6. Gap / BLOCKED_PREREQUISITE

- **BLOCKED_PREREQUISITE(RP-002)**: 선행 Permission Engine·Role Registry/Hierarchy·Decision Core 실구현 필요. 그에 앞서 Position 엔티티 자체가 순신규.
- **Gap**: Position 엔티티·직위 계층·Position→Role 매핑 규칙 전부 부재(grep 0). Organization Assignment와의 의존관계(직위는 조직에 종속) 설계 미정.
- 실 구현 = Position 엔티티 신설 + 선행 Permission Engine·Role Registry/Hierarchy·Decision Core 실구현 후 별도 승인세션(RP-002). 이번 차수는 설계 명세(코드 0).
