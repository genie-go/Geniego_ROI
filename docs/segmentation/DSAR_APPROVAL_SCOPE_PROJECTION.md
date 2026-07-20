# DSAR — Scope Projection 승인 (EPIC 06-A-03-02-03-04 Part 3-4 · Scoped Role Governance)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **상위 ADR**: [`ADR_DSAR_SCOPED_ROLE_GOVERNANCE`](../architecture/ADR_DSAR_SCOPED_ROLE_GOVERNANCE.md)
- **ground-truth**: [`DSAR_APPROVAL_SCOPE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_SCOPE_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_SCOPE_DUPLICATE_AUDIT`](DSAR_APPROVAL_SCOPE_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry/Hierarchy(Part 3-1/3-2)·Role Assignment(Part 3-3)·Decision Core 실구현 후 별도 승인세션
- **불변**: Default Intersection(§9) · Scope 자동확대 금지 · Scope Hierarchy ≠ Organization Hierarchy(§13·D-3) · 반날조(부재 날조·실재 과신 양방향 금지)

---

## 1. 목적

Scope Projection(스펙 §11)은 Scope Resolution(§10)이 산출한 Effective Scope를 도메인별 투영값(Effective Tenant/Organization/Project/Resource/Dataset/API)으로 **영속화**하는 계층이다. ADR D-4가 "Projection 영속·Snapshot/Digest 신설"을 명시한 순신규 축.

## 2. Canonical 필드

스펙 §2 Canonical Entity `APPROVAL_SCOPE_PROJECTION`. 투영 축(스펙 §11 원문): Effective Tenant · Effective Organization · Effective Project · Effective Resource · Effective Dataset · Effective API.

## 3. 열거형 / 타입

Projection Axis: EFFECTIVE_TENANT · EFFECTIVE_ORGANIZATION · EFFECTIVE_PROJECT · EFFECTIVE_RESOURCE · EFFECTIVE_DATASET · EFFECTIVE_API.

## 4. 실 substrate 매핑 (PARTIAL/PRESENT/ABSENT)

전 축 **ABSENT(영속 없음)** — EXISTING_IMPLEMENTATION §9: "version/projection 영속/digest/snapshot/drift/registry/simulation grep 0 전항목." 라이브 재계산 substrate는 일부 있으나(아래) Projection으로 **저장**되지 않음(요청마다 휘발·version/스냅샷 diff 없음).

| Projection 축 | 인접 라이브 substrate(영속 아님) | 근거 |
|---|---|---|
| EFFECTIVE_TENANT | authedTenant 매 요청 재계산 | `UserAuth.php:401-429` |
| EFFECTIVE_ORGANIZATION | effectiveScope company=null(무제한) 매 요청 재계산 | `TeamPermissions.php:236-265,258` |
| EFFECTIVE_RESOURCE | acl_permission menu_key 조회 매 요청 | `TeamPermissions.php:39,55-82,152-159` |
| EFFECTIVE_PROJECT | 부재 — PM data_scope 미연동 | `PM/Shared.php:59-89` |
| EFFECTIVE_DATASET | 부재 | grep 0 |
| EFFECTIVE_API | api_key scope 게이트(별개 축·투영 아님) | `Keys.php:189-210`·`index.php:573-598` |

## 5. 설계 원칙

- Projection은 Resolution 결과의 **읽기 최적화 투영**이지 판정 로직 자체가 아님 — 판정 정본은 Resolution(§10)이 유지.
- version 기준 Snapshot/Digest(ADR D-4)로 승격해야 Drift(§32)·Reconciliation(§34)·Simulation(§31)이 가능 — 지금은 라이브 재계산이라 이력 비교 자체가 불가능(replaceScope DELETE→INSERT 소실과 동일 패턴).
- 신설 시 기존 라이브 조회 경로(effectiveScope·acl_permission·authedTenant)를 **Projection의 입력 소스**로 재사용 — 병렬 신규 조회 경로 신설 금지.

## 6. Gap / BLOCKED_PREREQUISITE

6개 축 전부 영속 Projection 부재(완전 순신규). 라이브 substrate는 3/6(TENANT/ORGANIZATION/RESOURCE)만 인접, PROJECT/DATASET/API는 substrate조차 인접 없음. BLOCKED_PREREQUISITE: RP-002 — Projection은 Resolution·Assignment 확정 후에만 의미를 가짐.
