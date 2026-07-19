# DSAR — Approval Role Hierarchy Static Lint (EPIC 06-A-03-02-03-04 Part 3-2 · per-entity: Role Hierarchy Static Lint)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
- **상위 ADR**: [`ADR_DSAR_ROLE_HIERARCHY_COMPOSITE_GOVERNANCE`](../architecture/ADR_DSAR_ROLE_HIERARCHY_COMPOSITE_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_ROLE_HIERARCHY_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_HIERARCHY_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_ROLE_HIERARCHY_DUPLICATE_AUDIT`](DSAR_APPROVAL_ROLE_HIERARCHY_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Definition Version(Part 3-1)·Role Graph(Part 3-2 본체) 실 구현 부재
- **불변**: Role ≠ Organization Hierarchy ≠ Permission Hierarchy ≠ Permission Group · Golden Rule(Extend not Replace) · **Organization Parent를 Role Parent로 재사용 금지** · 반날조(substrate file:line은 상위 ADR·ground-truth 2문서만·없으면 ABSENT)

---

## 1. 목적

§68 최소 Static Lint는 Role Hierarchy/Composite를 **저장·커밋하는 시점에 결손을 잡는 정적 검사** 목록이다. 이 저장소에는 **Canonical Role Hierarchy/Composite/Graph 스키마 자체가 통째로 부재**하므로, 대부분 lint는 검사 대상 저장 스키마가 없어 `NOT_APPLICABLE`(엔티티 신설 시 함께 켤 규칙)이다. 단 **"Organization Parent를 Role Parent로 재사용"·"Hardcoded Parent/Child Role"·"Unversioned Hierarchy"에 해당하는 안티패턴 원형(prototype)은 이 저장소의 다른 도메인(계정/메뉴/api_key rank)에 실재**하므로, 신규 Role Hierarchy Registry가 이들을 오흡수하지 않도록 lint가 겨눌 구체적 대상으로 등재한다.

## 2. 열거 / 항목 (§68 Static Lint 차단 목록 + 판정)

| # | §68 lint 규칙 | 현행 대조 (substrate file:line) | 판정 |
|---|---|---|---|
| 1 | Hardcoded Parent/Child Role | api_key roleRank 리터럴 3곳 하드코딩 중복(`index.php:573`·`AdminMenu.php:74`·`AdminMenu.php:338`·DUPLICATE_AUDIT D-6) — 순서 하드코딩 실재(parent/child edge 아님) | REAL(정형화 대상) |
| 2 | `parentRoleId`만 있고 Edge Type 없음 | Role 도메인에 `parentRoleId` 필드 자체 부재(순신규) | NOT_APPLICABLE |
| 3 | Unversioned Hierarchy/Composite | Hierarchy/Composite Version 컬럼 부재 → 검사 대상 없음 | NOT_APPLICABLE |
| 4 | Role Self-reference | Role Edge 개념 부재. 근접 패턴은 메뉴 `wouldCycle`의 `id===newParent` 즉시차단(`AdminMenu.php:540-555`·메뉴 대상) | NOT_APPLICABLE(참조 패턴만 비-Role) |
| 5 | Direct/Indirect Cycle | Role Cycle Detection 부재. 근접 패턴 동일(`AdminMenu.php:540-555`·`PM/Dependencies.php:10`) | NOT_APPLICABLE(참조 패턴만 비-Role) |
| 6 | Cross-Tenant Edge | Role Edge 자체 부재 | NOT_APPLICABLE |
| 7 | Retired/Suspended Role Edge | Role Lifecycle 부재 | NOT_APPLICABLE |
| 8 | Deprecated Role 신규 Edge | 동일 | NOT_APPLICABLE |
| 9 | Missing Role/Permission Version | Role/Permission Version 컬럼 부재(Part 1/2/3-1 BLOCKED) | BLOCKED_PREREQUISITE |
| 10 | Permission Union without Deny | Permission Aggregation 계약 부재 | NOT_APPLICABLE |
| 11 | Scope Union without Guard | Scope Aggregation 계약 부재 | NOT_APPLICABLE |
| 12 | Human·Machine Role Mixing | Actor Eligibility 계약 부재 | NOT_APPLICABLE |
| 13 | Composite Risk Downgrade | Composite 자체 부재 | NOT_APPLICABLE |
| 14 | Diamond Inheritance Ignored | Role Graph 부재 | NOT_APPLICABLE |
| 15 | Duplicate Component/Edge | Component/Edge 스키마 부재 | NOT_APPLICABLE |
| 16 | Optional Component Auto-enabled | Composite Component 부재 | NOT_APPLICABLE |
| 17 | Conditional Component without Rule | 동일 | NOT_APPLICABLE |
| 18 | Mutable Graph Snapshot | Graph Snapshot 스키마 부재. (근접 비-Role 패턴: `menu_defaults`·`AdminMenu.php:119-122,295-311,583-589`) | NOT_APPLICABLE |
| 19 | Graph Cache without Version | Role Graph Cache 부재 | NOT_APPLICABLE |
| 20 | Role Graph Bypass Feature Flag | Role Graph 자체 부재. (근접 실재 anti-pattern: plan 'admin' god flag가 사실상 전역 bypass·`TeamPermissions.php:132`·`AuthContext.jsx:720` — Role Graph 아니지만 "Bypass Flag" 계열 실재 사례) | REAL(참조 anti-pattern) |
| 21 | **Organization Parent를 Role Parent로 재사용** | ★**정확히 이 저장소의 실재 위험**: `parent_user_id`(계정 owner→member 위계·`UserAuth.php:176,316,423-426`)·`menu_tree.parent_id`(메뉴 인접리스트·`AdminMenu.php:108,117,268`)를 신규 Role Hierarchy Edge로 재사용하려는 시도를 이 lint가 차단해야 함(ADR D-2·§6.1) | **REAL(최우선 lint 대상)** |
| 22 | Alias 기반 Graph Edge | Legacy Alias 개념 부재 | NOT_APPLICABLE |
| 23 | Error 후 Inheritance Allow | Role Graph Runtime 부재 | NOT_APPLICABLE |
| 24 | Recursive Resolver Depth Limit 없음 | Role Resolver 부재. 근접 패턴은 메뉴 `wouldCycle`의 `depth<100` 가드(`AdminMenu.php:540-555`) | NOT_APPLICABLE(참조 패턴만 비-Role) |

**전사 24항.** 커버리지 = `REAL`(정형화/참조 anti-pattern 대상) 3(#1·#20·#21) · `BLOCKED_PREREQUISITE` 1(#9) · `NOT_APPLICABLE`(참조 패턴 포함) 나머지.

## 3. substrate 매핑 (§5.2)

| lint 대상 | §5.2 태그 | 실 substrate (file:line) |
|---|---|---|
| Hardcoded Role 순서 3곳 중복 | **CONSOLIDATION_REQUIRED** | `index.php:573`·`AdminMenu.php:74`·`AdminMenu.php:338` |
| plan god flag(Bypass 계열 anti-pattern) | **ANTI_PATTERN(참조)** | `TeamPermissions.php:132`·`AuthContext.jsx:720` |
| **Organization Parent 오재사용 위험**(#21 최우선) | **HIGH_UNPREVENTED(§67 #24와 동일 근거)** | `UserAuth.php:176,316,423-426`(parent_user_id)·`AdminMenu.php:108,117,268`(menu_tree) |
| Cycle Detection/Depth Guard 참조 알고리즘(Role 아님) | 근접 substrate(비-Role) | `AdminMenu.php:540-555`(wouldCycle)·`PM/Dependencies.php:10` |
| Graph Snapshot 참조(Role 아님) | 근접 substrate(비-Role) | `AdminMenu.php:119-122,295-311,583-589`(menu_defaults) |
| Role Hierarchy/Composite/Edge/Version 스키마 | ABSENT → 신설 | 없음 |

## 4. 설계 원칙

1. **#21(Organization Parent를 Role Parent로 재사용 금지)이 이 저장소에 가장 절박한 lint** — `parent_user_id`/`menu_tree.parent_id`가 실재하고, ADR D-2·§6.1이 정확히 이 오용을 겨냥한다. 신규 Role Hierarchy Edge 스키마를 설계할 때 이 lint를 **1순위**로 함께 커밋한다.
2. **엔티티 신설 = lint 동시 발동이 완료조건** — Role Hierarchy/Edge/Composite DDL 신설 커밋에 §68 lint를 같은 PR로 붙인다. lint 없는 스키마 신설은 §67 Critical Gap을 구조적으로 재초대한다(Part 3-1 Static Lint DSAR와 동일 원칙).
3. **참조 알고리즘 패턴(Cycle/Depth Guard/Snapshot)은 비-Role 도메인 실재이지 Role lint의 현재 대상이 아니다** — `AdminMenu.php:540-555`·`PM/Dependencies.php:10`·`AdminMenu.php:119-122` 등은 향후 실 lint 구현 시 알고리즘 참조로만 재사용하고, 이번 문서는 이를 `NOT_APPLICABLE`로 정직 등재한다.
4. **roleRank 하드코딩 중복(#1)은 삭제·재구현이 아니라 Registry substrate로 흡수** — 중복 Resolver 신설 금지(Golden Rule).
5. plan god flag(#20)는 Role Graph Bypass Flag의 직접 사례는 아니나 "Bypass"라는 anti-pattern 계열의 유일한 실재 참조이므로 lint 설계 시 참고 사례로만 인용.

## 5. Gap / BLOCKED_PREREQUISITE

- **BLOCKED_PREREQUISITE(RP-002)**: Missing Role/Permission Version lint(#9)는 Part 1/2/3-1 실 구현 이후.
- **REAL(최우선)**: Organization Parent 재사용 금지(#21) — `parent_user_id`/`menu_tree` 오용 차단이 신규 Role Hierarchy 스키마 설계와 동시에 필요.
- **REAL(정형화)**: Hardcoded 순서 중복(#1)·Bypass Flag 참조(#20).
- **NOT_APPLICABLE**: 나머지 20항은 검사할 저장 스키마 부재(엔티티 신설 시 동시 활성). 그중 Cycle/Depth Guard/Snapshot 3항은 비-Role 도메인에 참조 가능한 알고리즘 원형이 실재함을 함께 등재.
- **판정**: NOT_CERTIFIED · 실 lint 활성 = 스키마 신설 + 별도 승인세션(RP-002).
