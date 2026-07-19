# DSAR — Role Scope Propagation (EPIC 06-A-03-02-03-04 Part 3-2 · per-entity: §39 Role Scope Propagation)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
- **상위 ADR**: [`ADR_DSAR_ROLE_HIERARCHY_COMPOSITE_GOVERNANCE`](../architecture/ADR_DSAR_ROLE_HIERARCHY_COMPOSITE_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_ROLE_HIERARCHY_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_HIERARCHY_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_ROLE_HIERARCHY_DUPLICATE_AUDIT`](DSAR_APPROVAL_ROLE_HIERARCHY_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Definition Version(Part 3-1) 실 구현 부재
- **불변**: Role ≠ Organization Hierarchy ≠ Permission Hierarchy ≠ Permission Group · Golden Rule(Extend not Replace) · Cycle 금지·Scope Intersection 기본·Explicit Deny 보존·Actor 교집합·Risk 상향 · 반날조(substrate file:line은 상위 ADR·ground-truth 2문서만·없으면 ABSENT)

## 1. 목적

Role Scope Propagation(스펙 §39)은 Role Hierarchy Edge(§12) 하나하나에 붙는 정책으로, 상위(Parent/Source) Role의 Scope가 하위(Child/Target) Role로 전파될 때 **자동 확대되지 않도록** 하는 것이 핵심이다. 기본값은 `INTERSECTION`(교집합) — 상위 Role의 Broad Scope가 하위 Role의 Narrow Scope를 덮어쓰지 않는다(§6.7). 저장소에는 Edge 단위 Scope 전파 정책 자체가 없으나, 유사한 "실패 시 축소(fail-closed)" 형태의 Effective Scope 계산 로직이 team_role 층에 실재한다.

## 2. Canonical 필드

| 필드 | 의미 |
|---|---|
| scope propagation policy id | Policy PK |
| hierarchy version id | 소속 Hierarchy Version(§10) 참조 |
| edge id | 대상 `APPROVAL_ROLE_HIERARCHY_EDGE`(§12) 참조 — "scope propagation policy" 필드값 |
| policy type | 아래 Scope Propagation Policy enum |
| is default | 기본값(`INTERSECTION`) 여부 |
| override justification | 기본값이 아닌 경우 사유(Manual Review 대상) |
| tenant id | 소속 테넌트 |
| status | 생명주기 상태 |
| immutable digest | 불변 다이제스트 |
| evidence | 근거 레코드 참조 |

## 3. 열거형 / 타입

**Scope Propagation Policy**: `NO_PROPAGATION` · `INTERSECTION`(기본값) · `CHILD_RESTRICTS_PARENT` · `PARENT_RESTRICTS_CHILD` · `MOST_SPECIFIC` · `EXPLICIT_MAPPING` · `CUSTOM`

## 4. 실 substrate 매핑 (§5.2)

| Canonical | §5.2 태그 | 실 substrate (file:line·ground-truth만·없으면 ABSENT) |
|---|---|---|
| Scope Propagation Policy 자체(Edge 단위) | ABSENT(순신규) | Role Hierarchy Edge/Graph 전무(GROUND_TRUTH §4) — Edge 단위 전파 정책 개념 없음 |
| `INTERSECTION` 기본값(근접 — fail-closed 축소 패턴) | Role Inclusion Candidate 아님·Effective Scope 계산(fail-closed) | `effectiveScope`(owner=null·상속·실패 시 DENY_SCOPE)(`TeamPermissions.php:236-265`) — GROUND_TRUTH §5가 "§39 Scope Propagation 참조"로 명시한 근접 패턴이나, Role↔Role Edge 전파가 아니라 team_role 계층(owner/manager/member) 내부의 단일 Effective Scope 계산임 |
| Cross-Tenant Scope 전파 차단(오용 위험 참조) | Organization Hierarchy Candidate(오용 위험) | `parent_user_id` tenant 상속(`UserAuth.php:423-426`) — 계정 도메인의 교차테넌트 차단이지 Role Hierarchy Edge의 Scope 전파 정책이 아님(§6.1 오용 대상) |

## 5. 설계 원칙

- 기본 정책은 `INTERSECTION`이다(§6.7·스펙 §39) — Edge를 신설할 때 정책을 명시하지 않으면 자동으로 Scope가 좁아지는 방향으로만 결합된다.
- `effectiveScope`(`TeamPermissions.php:236-265`)의 fail-closed 원칙(계산 실패 시 DENY_SCOPE)은 참조 가능한 안전 패턴이나, 이는 team_role 3단(owner/manager/member) 내부 단일 상속이지 Role Hierarchy Edge 단위의 다대다 전파가 아니다 — 그대로 이식 금지, 원칙만 재사용.
- 상위 Broad Scope가 하위 Narrow Scope를 덮어쓰는 것을 금지한다(스펙 §39 명시 질문 "상위 Role의 Broad Scope가 하위 Role의 Narrow Scope를 덮어쓰는가" → 항상 아니오).
- `NO_PROPAGATION`·`CUSTOM` 정책 선택 시 Manual Review 대상으로 별도 evidence를 남긴다(§42 Scope Expansion Guard와 연계).
- Role Scope Propagation은 Part 3-1 `ROLE_SCOPE_REQUIREMENT`(부여 시 요구 구조)와 다른 층이다 — 이 문서는 Hierarchy Edge를 타고 전파되는 정책이고, Part 3-1 Scope Requirement는 Assignment 시점 요구 구조다. 혼동 금지.

## 6. Gap / BLOCKED_PREREQUISITE

Role Scope Propagation은 **완전 ABSENT(순신규)** 판정이다. 저장소에는 Role Hierarchy Edge 자체가 없으므로 Edge 단위 Scope 전파 정책도 존재하지 않는다. 유일한 근접 substrate는 `effectiveScope`(`TeamPermissions.php:236-265`)의 fail-closed 계산이며, 이는 GROUND_TRUTH가 직접 "§39 참조"로 지목한 패턴이나 대상(team_role 내부 계층)이 다르므로 그대로 승격 금지. 실 구현은 선행 Permission Engine(Part 2)·Role Definition Version(Part 3-1) 실 코드 완성 후 별도 승인세션(RP-002)에서 진행하며, 이번 차수는 설계 명세·코드 0·NOT_CERTIFIED로 종결한다.
