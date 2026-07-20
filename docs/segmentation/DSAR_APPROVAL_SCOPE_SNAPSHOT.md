# DSAR — Approval Scope Snapshot (EPIC 06-A-03-02-03-04 Part 3-4 · per-entity: Scope Snapshot · 스펙 §35)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **상위 ADR**: [`ADR_DSAR_SCOPED_ROLE_GOVERNANCE`](../architecture/ADR_DSAR_SCOPED_ROLE_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_SCOPE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_SCOPE_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_SCOPE_DUPLICATE_AUDIT`](DSAR_APPROVAL_SCOPE_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry(Part 3-1)·Role Hierarchy(Part 3-2)·Role Assignment(Part 3-3)·Scope Registry/Version(본 Part 본체) 실 구현 부재
- **불변**: **Snapshot 불변**(§35 명문) · Cache는 Version 기반 · Default Intersection(Scope 자동확대 금지·ADR D-2) · 반날조(모든 `file:line`은 상위 ADR·ground-truth 2문서에서만 인용 — 없으면 ABSENT)

---

## 1. 목적

스펙 §35 Scope Snapshot = **Effective Scope · Assignment · Version · Projection** 4종 상태를 특정 시점에 불변으로 고정·영속하는 엔티티. §34 Reconciliation·§36 Evidence·§37 Digest가 모두 이 Snapshot을 원재료로 삼는다.

- **순신규**: 4종 전부 저장 영속체 ABSENT. effectiveScope는 계산만 하고 저장하지 않는다(매 요청 재계산 — EXISTING_IMPLEMENTATION §9·§10).

## 2. Canonical 필드

| # | 필드 | 의미 |
|---|---|---|
| 1 | snapshot id | Snapshot PK |
| 2 | scope id / subject id | 대상 Scope/Subject |
| 3 | snapshot type | 아래 §3 열거형 |
| 4 | scope version id | 스냅샷 기준 Version |
| 5 | payload | 계산된 값 |
| 6 | digest | 다이제스트(§37 참조) |
| 7 | taken at | 촬영 시각 |
| 8 | taken by / trigger | 촬영 주체/트리거 |
| 9 | immutable | 항상 true |
| 10 | status | Snapshot 상태 |

## 3. 열거형 / 타입

**Snapshot Type**(스펙 §35 원문): `EFFECTIVE_SCOPE` · `ASSIGNMENT` · `VERSION` · `PROJECTION`

## 4. 실 substrate 매핑 (PARTIAL/ABSENT)

| Snapshot Type | 근접 substrate | file:line | 판정 |
|---|---|---|---|
| EFFECTIVE_SCOPE(근접) | effectiveScope 산출 로직(fail-closed·owner/admin=null·company=null·비owner+무tenant=DENY_SCOPE) | `TeamPermissions.php:236-265` | 근접(산출 로직 자체는 실재)이나 산출 결과를 저장하지 않고 매 요청 재계산 — Snapshot 개념 자체가 없음 |
| ASSIGNMENT(근접) | data_scope 테이블 현재값 1행(UNIQUE 제약) | `TeamPermissions.php:160-166` | 근접(현재 배정 저장은 실재)이나 `replaceScope`가 DELETE→INSERT로 이전 값을 즉시 소거(`TeamPermissions.php:337-346`) — "시점 고정"이 아니라 "최신 덮어쓰기" |
| VERSION | — | — | **ABSENT** — Scope Version 자체 코드 0(ADR §D-4) |
| PROJECTION | — | — | **ABSENT** — Effective Tenant/Org/Project/Resource/Dataset/API Projection(ADR §D-4) grep 0 |

## 5. 설계 원칙

- Snapshot은 불변이어야 한다(§35 명문) — `replaceScope`의 현재 동작(DELETE→INSERT 즉시 소거)은 Snapshot과 정반대 패턴이므로, Snapshot 신설 시 `replaceScope`를 대체하는 것이 아니라 "교체 직전 상태를 Snapshot으로 먼저 고정"하는 절차를 앞단에 추가해야 한다(Extend 원칙).
- EFFECTIVE_SCOPE Snapshot이 신설되면 §34 Reconciliation·§38 Cache가 즉시 원재료를 얻는다 — 4개 타입 중 최우선 신설 후보.
- fail-closed 판정(owner/admin=null·DENY_SCOPE 등·`TeamPermissions.php:246,251,258,260-263`)은 Snapshot에도 그대로 보존되어야 한다(무후퇴) — Snapshot화 과정에서 fail-open으로 완화 금지.

## 6. Gap / BLOCKED_PREREQUISITE

- VERSION/PROJECTION = 완전 ABSENT(선행 substrate 없음).
- EFFECTIVE_SCOPE/ASSIGNMENT = 근접 substrate 존재하나 영속·불변화 로직 ABSENT.
- 실 엔진 = 선행 Permission Engine·Role Registry/Hierarchy/Assignment·Scope Registry 실구현 후 별도 승인세션(RP-002). 본 편 코드 0 · NOT_CERTIFIED.
