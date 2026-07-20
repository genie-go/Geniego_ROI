# DSAR — Approval Role Assignment Simulation (EPIC 06-A-03-02-03-04 Part 3-3 · per-entity: Assignment Simulation · 스펙 §32)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **상위 ADR**: [`ADR_DSAR_ROLE_ASSIGNMENT_GOVERNANCE`](../architecture/ADR_DSAR_ROLE_ASSIGNMENT_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_ROLE_ASSIGNMENT_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_ASSIGNMENT_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_ROLE_ASSIGNMENT_DUPLICATE_AUDIT`](DSAR_APPROVAL_ROLE_ASSIGNMENT_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry(Part 3-1)·Role Hierarchy(Part 3-2)·Assignment Registry/Version(본 Part 본체) 실 구현 부재
- **불변**: Snapshot 불변 · Cache는 Version 기반 · **Simulation은 실제 Assignment/Version/Cache를 절대 변경하지 않는다**(§32 명문) · Legacy 자동활성화 금지 · 반날조(모든 `file:line`은 상위 ADR·ground-truth 2문서에서만 인용 — 없으면 ABSENT)

---

## 1. 목적

스펙 §32 Assignment Simulation은 Add Role · Remove Role · Change Scope · Change Duration · Change Approval · Expiration을 **실제 Assignment에 반영하기 전에 what-if로 미리 계산**하는 절차이며, 결과는 Permission 영향 · Scope 영향 · SoD 영향 · Risk 영향으로 산출한다. 대상 Assignment Registry/Version 자체가 ABSENT이므로 지금은 시뮬레이션할 실 Assignment가 없다. 저장소에는 이와 동형인 "실제 반영 전 미리보기" 패턴이 Role 아닌 도메인(메뉴 스냅샷/롤백)에만 존재하며, 본 문서는 이를 참조 패턴으로만 인용하고 Assignment로 오흡수하지 않는다.

## 2. Canonical 필드

| # | 필드 | 의미 |
|---|---|---|
| 1 | simulation id | Simulation Result PK |
| 2 | target assignment id / subject id | 시뮬레이션 대상 |
| 3 | baseline assignment version id | 시뮬레이션 시작 시점 Version |
| 4 | simulation type | 아래 §3 열거형 |
| 5 | simulated change payload | 가상 변경 내용 |
| 6 | current permission projection / simulated permission projection | 전후 비교용 |
| 7 | scope impact | 산출 항목(스펙 §32) |
| 8 | SoD impact | 산출 항목(스펙 §32) |
| 9 | risk impact | 산출 항목(스펙 §32) |
| 10 | affected assignment references | 영향받는 Assignment 참조 |
| 11 | activation recommendation | 권고일 뿐 자동 적용 아님 |
| 12 | status | 시뮬레이션 상태 |

## 3. 열거형 (Simulation Type — 스펙 §32 원문 그대로)

`ADD_ROLE` · `REMOVE_ROLE` · `CHANGE_SCOPE` · `CHANGE_DURATION` · `CHANGE_APPROVAL` · `EXPIRATION`

## 4. 실 substrate 매핑 (PARTIAL/ABSENT)

| Canonical | 근접 substrate | file:line | 판정 |
|---|---|---|---|
| Simulation 대상(Assignment Registry/Version) | — | — | **ABSENT** — Assignment Registry/Version 자체가 ABSENT(ADR §1) → 시뮬레이션할 실체 없음 |
| 근접("변경 전 미리보기·롤백" 동형 UX·비-Role 도메인) | `menu_defaults`(snapshot_data·version·reset 롤백지점) | `AdminMenu.php:119-122,294-311` | 메뉴 스냅샷/롤백이지 Assignment what-if Simulation 아님 |
| SCOPE 영향 계산 근접(비-Role 도메인) | `effectiveScope`(owner=null 상속·실패 DENY_SCOPE) | `TeamPermissions.php:236-265` | 실제 적용 계산이지 가상 변경 미리보기가 아님 |
| SoD 영향 | — | — | **ABSENT** — SoD/Conflict 개념 자체 부재(EXISTING_IMPLEMENTATION §6) |
| RISK 영향 | — | — | **ABSENT** — Assignment Risk(§20) 자체 순신규 |

## 5. 설계 원칙

- Simulation은 어떤 경우에도 **실제 Assignment/Version/Cache를 변경하지 않는다**(§32 명문). 산출은 읽기전용 Result로만 저장한다.
- `effectiveScope` 계산 로직은 "권한이 실제로 어떻게 적용되는지"의 참조 알고리즘으로만 재사용하고, what-if 가상 변경 계산기로 오흡수하지 않는다(라이브 재계산이지 시뮬레이션이 아니라는 EXISTING_IMPLEMENTATION §7 판정과 동일 경계).
- `menu_defaults` 스냅샷/롤백은 Simulation의 산출물 저장 방식(전후 비교)에 참조 패턴이 될 수 있으나, 메뉴 도메인 실체를 Assignment Snapshot으로 재사용하지 않는다.
- ACTIVATION_RECOMMENDATION은 권고에 그치며 자동 적용(auto-activate)하지 않는다 — Legacy 자동 활성화 금지 원칙과 동일 규율(Part 3-2 Simulation과 동형).

## 6. Gap / BLOCKED_PREREQUISITE

- Simulation 대상 Assignment Registry/Version = **ABSENT**.
- SoD/Risk 영향 계산 = 대상 개념(§18 Conflict/SoD, §20 Risk) 자체 **ABSENT**.
- 실 엔진 = 선행 Permission Engine·Role Registry/Hierarchy·Assignment Registry 실구현 후 별도 승인세션(RP-002). 본 편 코드 0 · NOT_CERTIFIED.
