# DSAR — Role Hierarchy Drift (EPIC 06-A-03-02-03-04 Part 3-2 · per-entity 설계 · 스펙 §58)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
- **판정**: BLOCKED_PREREQUISITE (RP-002 — 선행 Permission Engine(Part 2) + Role Registry(Part 3-1) + Decision Core 실 구현 후 별도 승인세션)
- **상위 ADR**: [`ADR_DSAR_ROLE_HIERARCHY_COMPOSITE_GOVERNANCE`](../architecture/ADR_DSAR_ROLE_HIERARCHY_COMPOSITE_GOVERNANCE.md)
- **전수조사(ⓑ) ground-truth**: [`DSAR_APPROVAL_ROLE_HIERARCHY_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_HIERARCHY_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_ROLE_HIERARCHY_DUPLICATE_AUDIT`](DSAR_APPROVAL_ROLE_HIERARCHY_DUPLICATE_AUDIT.md)
- **불변**: Role Hierarchy ≠ Organization Hierarchy ≠ Permission Hierarchy ≠ Permission Group(ADR §D-2·스펙 §6.1~6.3) · Golden Rule(Extend not Replace·중복 Graph/Resolver 신설 금지) · Historical Immutability(스펙 §6.15) · Cache Key는 Version+Tenant-aware 필수(스펙 §56)
- **반날조 규율**: 모든 `file:line`은 위 ADR·전수조사 2문서에서만 인용한다. 그 밖은 **ABSENT**. 폐기 `admin_roles`/`user_roles`(289차 P3) 재부활 금지 · 289차 P1~P4(writeGuard·featurePlan·admin폐기·resolveAdminByToken) 재플래그 금지.

---

## 1. 목적

Role Hierarchy Drift = 배포·캐시된 Role Hierarchy(Graph) 상태가, 이후 발생한 Role/Node/Edge/Permission/Scope/Actor/Conflict/Dependency/Exclusion/Validity 변경과 **불일치(Drift)**하는 조건을 정형 탐지하는 엔티티(스펙 §58). Drift는 스스로 Hierarchy를 수정하지 않으며(무후퇴·Historical Immutability), "런타임 차단(runtime_blocked)"과 "재검증 요구(revalidation_required)"의 신호원으로만 작동한다.

- **순신규**: Role Graph/Hierarchy Version 자체가 ABSENT(ADR §1·EXISTING_IMPLEMENTATION §4) → 배포 상태와 현재 상태를 비교할 대상 자체가 없음.

## 2. Canonical 필드

`APPROVAL_ROLE_HIERARCHY_DRIFT` (전부 신규 · 실값 아님 · 스펙 §58 원문 그대로)

| # | 필드 | 의미 |
|---|---|---|
| 1 | drift id | Drift 식별자 |
| 2 | hierarchy id | 대상 Role Hierarchy |
| 3 | hierarchy version id | Drift가 관측된 Hierarchy Version |
| 4 | source resolution reference | Drift를 유발한 판정/해석 참조 |
| 5 | drift type | 아래 §3 열거형 |
| 6 | previous digest | 이전(배포/캐시된) 상태 다이제스트(§54) |
| 7 | current digest | 현재(재계산) 상태 다이제스트(§54) |
| 8 | affected role count | 영향받는 Role 수 |
| 9 | affected assignment reference count | 영향받는 Assignment 참조 수(Part 3-3) |
| 10 | severity | 심각도 |
| 11 | runtime blocked | 런타임 인가 차단 여부 |
| 12 | revalidation required | 재검증 요구 여부(§60 Revalidation 트리거) |
| 13 | detected at | 탐지 시각 |
| 14 | resolved at | 해소 시각 |
| 15 | status | Drift 상태 |
| 16 | evidence | 근거(§52/§53 참조) |

## 3. 열거형 (Drift Type — 스펙 §58 원문 그대로)

`HIERARCHY_VERSION_DRIFT` · `NODE_VERSION_DRIFT` · `EDGE_VERSION_DRIFT` · `ROLE_STATUS_DRIFT` · `ROLE_VERSION_DRIFT` · `PERMISSION_VERSION_DRIFT` · `PERMISSION_GROUP_DRIFT` · `PERMISSION_BUNDLE_DRIFT` · `DENY_DRIFT` · `SCOPE_POLICY_DRIFT` · `ACTOR_POLICY_DRIFT` · `CONFLICT_POLICY_DRIFT` · `DEPENDENCY_DRIFT` · `EXCLUSION_DRIFT` · `VALIDITY_DRIFT` · `GRAPH_DIGEST_DRIFT` · `CUSTOM`

## 4. 실 substrate 매핑 (§5.2)

| Drift Type | 최근접 substrate | file:line | 판정 |
|---|---|---|---|
| ROLE_STATUS_DRIFT(근접·재사용 아님) | team_role→acl_permission `roleOf` fail-closed(미해결→member) | `TeamPermissions.php:120-131` | 근접 패턴 — Role 상태 미해결 시 안전측 폴백하는 fail-closed 설계는 참조 가능하나, 이는 Role→Permission 매핑이지 Hierarchy 상태 drift 탐지 substrate 자체는 아님 |
| 참고(실 결함·Drift 탐지 substrate 아님) | AdminMenu `required_role` 쓰기 ROLE_ENUM ↔ 읽기 rank 데드락(super_admin/moderator 저장 시 메뉴 영구 비노출) | `AdminMenu.php:247,338,343-346` | ★DUPLICATE_AUDIT §D-8 확인 **실 결함**이나 본 편의 Drift Detection substrate가 아님 — 수정 대상 아님(설계 거버넌스 범위 밖·후속 fix 세션 후보로만 기록) |
| HIERARCHY_VERSION_DRIFT / NODE_VERSION_DRIFT / EDGE_VERSION_DRIFT / GRAPH_DIGEST_DRIFT | — | **ABSENT** | Role Graph/Hierarchy/Node/Edge/Version 자체 순신규 |
| ROLE_VERSION_DRIFT | — | **ABSENT** | Part 3-1 Role Definition Version 코드 0 |
| PERMISSION_VERSION_DRIFT / PERMISSION_GROUP_DRIFT / PERMISSION_BUNDLE_DRIFT / DENY_DRIFT | — | **ABSENT** | Part 2 Permission Engine 코드 0 |
| SCOPE_POLICY_DRIFT / ACTOR_POLICY_DRIFT / CONFLICT_POLICY_DRIFT / DEPENDENCY_DRIFT / EXCLUSION_DRIFT / VALIDITY_DRIFT | — | **ABSENT** | 순신규 |
| affected_assignment_reference_count | — | **ABSENT** | Part 3-3 Role Assignment Governance 미설계 |

## 5. 설계 원칙

- **비파괴 신호원**: Drift는 관측만 하고 Hierarchy를 In-place Update 하지 않는다(§6.5·§6.15). 해소는 신 버전/재검증(§60)으로 처리.
- **runtime_blocked = Mandatory Control**(§6.16): Retired/Suspended Role 관련 Drift·CRITICAL severity는 고객 설정으로 비활성 불가.
- **ROLE_STATUS_DRIFT는 Part 3-1 Role Drift(별도 문서)와 구분**: 본 Drift는 **Hierarchy Version 결합 상태**의 drift이며, 단일 Role Definition 축의 drift가 아니다(레벨 분리).
- **오탐 방지**: AdminMenu `required_role` 쓰기/읽기 rank 데드락(§D-8)은 실 결함이나, 본 설계 거버넌스(코드 0)에서 수정하지 않는다 — Drift로 재분류하거나 이번 차수에 fix하지 않는다.

## 6. Gap / BLOCKED_PREREQUISITE

- Role Graph/Hierarchy/Node/Edge/Version = **전부 ABSENT** → drift_type 대다수 순신규.
- Permission Version/Group/Bundle/Deny 결합 = **BLOCKED_PREREQUISITE**(Part 2 코드 0).
- affected_assignment_reference_count = **BLOCKED_PREREQUISITE**(Part 3-3 코드 0).
- previous/current digest 비교 = §54 Role Graph Digest 선행 신설 대상.
- 실 엔진 = 선행 Permission Engine·Role Registry 실구현 후 **별도 승인세션(RP-002)**. 본 편 코드/DB 0 · NOT_CERTIFIED.
