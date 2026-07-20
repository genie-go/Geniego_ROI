# DSAR — Approval Role Assignment Drift (EPIC 06-A-03-02-03-04 Part 3-3 · per-entity: Assignment Drift · 스펙 §29)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **상위 ADR**: [`ADR_DSAR_ROLE_ASSIGNMENT_GOVERNANCE`](../architecture/ADR_DSAR_ROLE_ASSIGNMENT_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_ROLE_ASSIGNMENT_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_ASSIGNMENT_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_ROLE_ASSIGNMENT_DUPLICATE_AUDIT`](DSAR_APPROVAL_ROLE_ASSIGNMENT_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry(Part 3-1)·Role Hierarchy(Part 3-2)·Assignment Registry/Version(본 Part 본체) 실 구현 부재
- **불변**: Snapshot 불변 · Cache는 Version 기반 · Simulation은 실제 변경 없음 · Historical Immutability(과거 Version 불변·ADR §D-2) · 반날조(모든 `file:line`은 상위 ADR·ground-truth 2문서에서만 인용 — 없으면 ABSENT)

---

## 1. 목적

스펙 §29 Assignment Drift = 배포·확정된 Assignment 상태가 이후 발생한 **Role Version · Scope · Permission · Policy · Approval · Organization · Membership** 변경과 불일치하는 조건을 정형 탐지하는 엔티티. Drift는 스스로 Assignment를 수정하지 않으며(무후퇴·Historical Immutability), §30 Revalidation의 트리거 신호원으로만 작동한다.

- **순신규**: Assignment Version/Registry 자체가 ABSENT(ADR §1·EXISTING_IMPLEMENTATION §6) → 배포 상태와 현재 상태를 비교할 대상 자체가 없음.

## 2. Canonical 필드

| # | 필드 | 의미 |
|---|---|---|
| 1 | drift id | Drift PK |
| 2 | assignment id | 대상 Assignment |
| 3 | assignment version id | Drift가 관측된 Version |
| 4 | drift type | 아래 §3 열거형 |
| 5 | previous digest | 이전(배포/확정) 상태 다이제스트(§28) |
| 6 | current digest | 현재(재계산) 상태 다이제스트(§28) |
| 7 | affected subject | 영향받는 Subject |
| 8 | affected scope | 영향받는 Scope |
| 9 | severity | 심각도 |
| 10 | runtime blocked | 런타임 인가 차단 여부 |
| 11 | revalidation required | 재검증 요구 여부(§30 트리거 연동) |
| 12 | detected at | 탐지 시각 |
| 13 | resolved at | 해소 시각 |
| 14 | status | Drift 상태 |
| 15 | evidence | 근거(§27 참조) |

## 3. 열거형 (Drift Type — 스펙 §29 원문 그대로)

`ROLE_VERSION_DRIFT` · `SCOPE_DRIFT` · `PERMISSION_DRIFT` · `POLICY_DRIFT` · `APPROVAL_DRIFT` · `ORGANIZATION_DRIFT` · `MEMBERSHIP_DRIFT`

## 4. 실 substrate 매핑 (PARTIAL/ABSENT)

| Drift Type | 근접 substrate | file:line | 판정 |
|---|---|---|---|
| ROLE_VERSION_DRIFT | — | — | **ABSENT** — Part 3-1 Role Definition Version 코드 0 |
| PERMISSION_DRIFT | — | — | **ABSENT** — Part 2 Permission Engine 코드 0 |
| SCOPE_DRIFT(근접) | `replaceScope`(DELETE→INSERT·변경이력 미보존) | `TeamPermissions.php:337-346` | 근접(scope가 실제로 바뀌는 지점)이나 이전값 대비 diff 계산·drift 탐지 로직 없음(즉시 교체) |
| POLICY_DRIFT / APPROVAL_DRIFT | — | — | **ABSENT** — 승인 workflow 자체 부재(EXISTING_IMPLEMENTATION §3) |
| ORGANIZATION_DRIFT / MEMBERSHIP_DRIFT(근접) | `updateTeamMember` UPDATE team_role · `deleteTeamMember` is_active=0 | `UserAuth.php:1392,1445` | 근접(조직/멤버십 변경 이벤트는 실재)이나 이 변경이 기존 Assignment와의 불일치를 탐지·기록하는 Drift 엔티티로 연결되지 않음 — 변경이 동일 컬럼에 즉시 반영되므로 "배포 상태 vs 현재 상태"의 구분 자체가 성립하지 않음 |

## 5. 설계 원칙

- Drift는 비파괴 신호원 — 관측만 하고 Assignment를 in-place 수정하지 않는다(§6 Version 불변 원칙과 동형).
- SCOPE_DRIFT 참조 패턴(`replaceScope`)은 "변경이 즉시 반영되어 이전 상태가 소실"되는 현재 동작을 보여줄 뿐, Drift 탐지(구버전 vs 신버전 비교) 로직 자체가 아니다 — 오흡수 금지.
- ORGANIZATION_DRIFT/MEMBERSHIP_DRIFT는 team_role 변경과 개념적으로 인접하나, "조직 변경이 기존 Assignment를 무효화하지 않고 방치되는" 상태를 탐지하는 것이 Drift의 목적이므로, 현재처럼 변경이 즉시 동일 컬럼에 반영되는 구조에서는 Drift 개념 자체가 아직 성립하지 않는다(설계 시 유의 — Assignment Registry 신설이 선행되어야 함).
- runtime_blocked·revalidation_required는 §30 Revalidation 트리거로 연결(Mandatory Control 후보).

## 6. Gap / BLOCKED_PREREQUISITE

- ROLE_VERSION_DRIFT/PERMISSION_DRIFT = Part 2·Part 3-1 코드 0로 BLOCKED_PREREQUISITE.
- POLICY_DRIFT/APPROVAL_DRIFT = 승인 workflow 자체 ABSENT.
- previous/current digest 비교 = §28 Digest 선행 신설 대상.
- 실 엔진 = 선행 Permission Engine·Role Registry/Hierarchy·Assignment Registry 실구현 후 별도 승인세션(RP-002). 본 편 코드 0 · NOT_CERTIFIED.
