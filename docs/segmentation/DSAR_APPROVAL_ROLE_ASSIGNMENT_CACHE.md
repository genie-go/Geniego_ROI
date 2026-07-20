# DSAR — Approval Role Assignment Cache (EPIC 06-A-03-02-03-04 Part 3-3 · per-entity: Assignment Cache + Cache Invalidation · 스펙 §33+§34)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **상위 ADR**: [`ADR_DSAR_ROLE_ASSIGNMENT_GOVERNANCE`](../architecture/ADR_DSAR_ROLE_ASSIGNMENT_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_ROLE_ASSIGNMENT_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_ASSIGNMENT_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_ROLE_ASSIGNMENT_DUPLICATE_AUDIT`](DSAR_APPROVAL_ROLE_ASSIGNMENT_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry(Part 3-1)·Role Hierarchy(Part 3-2)·Assignment Registry/Version(본 Part 본체) 실 구현 부재
- **불변**: Snapshot 불변 · **Cache는 Version 기반**(§33 명문) · Simulation은 실제 변경 없음 · 반날조(모든 `file:line`은 상위 ADR·ground-truth 2문서에서만 인용 — 없으면 ABSENT)

---

## 1. 목적

스펙 §33 Assignment Cache는 Effective Assignment · Effective Permission · Effective Scope · Effective Role을 **Version 기반**으로 캐시하는 엔티티다. §34 Cache Invalidation은 Assignment 생성 · Assignment 변경 · Assignment 종료 · Role 변경 · Permission 변경 · Organization 변경 · Membership 변경 7개 트리거로 무효화를 강제한다. **현재는 effectiveForUser가 요청마다 라이브 재계산되어 캐시 자체가 없다**(EXISTING_IMPLEMENTATION §7 — "매 요청 라이브 재계산·캐시 없음").

## 2. Canonical 필드

| # | 필드 | 의미 |
|---|---|---|
| 1 | cache id / key | Cache 키(Subject+Version 기반) |
| 2 | subject id | 대상 Subject |
| 3 | cached type | 아래 §3 열거형 |
| 4 | assignment version id | 캐시 기준 Version(스펙 §33 "Version 기반") |
| 5 | cached value / payload | 캐시된 산출값 |
| 6 | computed at | 산출 시각 |
| 7 | invalidated at | 무효화 시각 |
| 8 | invalidation trigger | 아래 §3 열거형(§34) |
| 9 | ttl / expiry | 설계 시 결정 |
| 10 | status | Cache 상태 |

## 3. 열거형 / 타입

**Cached Type**(스펙 §33 원문): `EFFECTIVE_ASSIGNMENT` · `EFFECTIVE_PERMISSION` · `EFFECTIVE_SCOPE` · `EFFECTIVE_ROLE`

**Invalidation Trigger**(스펙 §34 원문): `ASSIGNMENT_CREATED` · `ASSIGNMENT_CHANGED` · `ASSIGNMENT_TERMINATED` · `ROLE_CHANGED` · `PERMISSION_CHANGED` · `ORGANIZATION_CHANGED` · `MEMBERSHIP_CHANGED`

## 4. 실 substrate 매핑 (PARTIAL/ABSENT)

| Canonical | 근접 substrate | file:line | 판정 |
|---|---|---|---|
| Cache 저장체(전용) | — | — | **ABSENT** — `effectiveForUser`/`effectiveScope`는 요청마다 라이브 재계산(EXISTING_IMPLEMENTATION §7 "매 요청 라이브 재계산·캐시 없음") |
| EFFECTIVE_ASSIGNMENT/PERMISSION/SCOPE/ROLE 산출 로직(캐시 없이 매번 계산) | `effectiveForUser` · `effectiveScope` | `TeamPermissions.php:366-394,236-265` | 근접(산출 로직 자체는 실재) — 그러나 version 무관·저장/무효화 개념 없음 |
| Version 기반 캐시 키 | — | — | **ABSENT** — Assignment Version 자체 ABSENT(ADR §D-2) |
| Invalidation Trigger 이벤트 소스(team_role 변경) | `updateTeamMember` / `deleteTeamMember` | `UserAuth.php:1392,1445` | 근접(변경 이벤트 자체는 실재) — 그러나 이를 소비해 캐시를 무효화하는 대상 캐시가 없으므로 트리거 개념 자체가 성립하지 않음 |

## 5. 설계 원칙

- Cache는 반드시 Version 기반(§33 명문) — Assignment Version이 바뀌면 캐시 키도 바뀐다(stale read 방지).
- 현재 `effectiveForUser`/`effectiveScope`가 "캐시 없이 매 요청 라이브 재계산"하는 것은 정확성 관점에서는 안전(항상 최신)하지만, Cache 도입 시에는 §34의 7개 트리거 전부가 무효화를 강제해야 하며, 그중 3종(Assignment 생성/변경/종료)은 Assignment Registry 신설 이후에만 의미를 갖는다.
- Cache 신설은 성능 최적화이지 정합성 완화가 아니다 — 무효화 트리거 누락 시 stale 권한 노출 위험이므로 Mandatory Control 후보로 취급한다.

## 6. Gap / BLOCKED_PREREQUISITE

- Cache 저장체·Version 기반 키 = **ABSENT**(Assignment Version 자체 ABSENT).
- 7개 Invalidation Trigger 중 Assignment 관련 3종(생성/변경/종료) = Assignment Registry 신설 후에만 성립.
- 실 엔진 = 선행 Permission Engine·Role Registry/Hierarchy·Assignment Registry 실구현 후 별도 승인세션(RP-002). 본 편 코드 0 · NOT_CERTIFIED.
