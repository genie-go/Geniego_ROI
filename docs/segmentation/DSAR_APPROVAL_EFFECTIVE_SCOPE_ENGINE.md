# DSAR — Approval Effective Scope Engine (EPIC 06-A-03-02-03-04 Part 3-4 · per-entity: Effective Scope Engine · 스펙 §27)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **상위 ADR**: [`ADR_DSAR_SCOPED_ROLE_GOVERNANCE`](../architecture/ADR_DSAR_SCOPED_ROLE_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_SCOPE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_SCOPE_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_SCOPE_DUPLICATE_AUDIT`](DSAR_APPROVAL_SCOPE_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry/Hierarchy(Part 3-1/3-2)·Role Assignment(Part 3-3)·Decision Core 실 구현 부재
- **불변**: Default Intersection · Scope 자동확대 금지 · Simulation 무변경 · 반날조(모든 `file:line`은 상위 ADR·ground-truth 2문서에서만 인용 — 없으면 ABSENT)

---

## 1. 목적

스펙 §27 Effective Scope Engine은 Assignment · Permission · Runtime · Session · Context를 통합 계산해 Effective Scope를 산출하는 엔진이다. ADR D-4는 이를 "effectiveScope substrate(라이브·data_scope만)를 Assignment/Permission/Session/Runtime/Context 통합 + version 기준 Effective Scope로 승격"으로 결정했다. 근접 substrate `effectiveScope`(`TeamPermissions.php:236-265`)는 fail-closed 판정 로직을 실제로 실행 중이나, **전용 엔진 클래스가 아닌 정적 메서드 하나**이고 매 요청 라이브 재계산이며 Assignment/Permission/Session/Runtime/Context 5요소 중 data_scope 자체만 소비한다 — "근접(PARTIAL)"으로 정직 판정한다.

## 2. Canonical 필드

스펙 §27은 계산 요소만 정의(필드 섹션 없음). 설계 제안: Effective Scope ID · Subject(user/role) · Input Assignment Reference · Input Permission Reference · Runtime Context · Session Reference · Computed Effective Scope Value · Computation Version · Computed At.

## 3. 열거형 / 타입

스펙 §27 원문 — **계산 입력**: Assignment · Permission · Runtime · Session · Context. **출력**: Effective Scope.

## 4. 실 substrate 매핑 (PARTIAL)

| Canonical 계산 입력 | 근접 substrate | file:line | 판정 |
|---|---|---|---|
| 출력(Effective Scope) 산출 로직 | `effectiveScope`(fail-closed: owner/admin=null 무제한·비owner+무tenant=DENY_SCOPE·company=null·미설정=null) | `TeamPermissions.php:236-265` | **PARTIAL/PRESENT** — 계산은 실재하나 라이브 재계산(엔진 클래스 아님) |
| Assignment 입력 | — | — | **ABSENT** — data_scope는 subject_type/subject_id 저장뿐(`TeamPermissions.php:41`), Assignment Version(Part 3-3) 자체가 순신규이므로 결합 불가 |
| Permission 입력 | — | — | **ABSENT** — Permission Engine(Part 2) 자체가 설계 단계(코드 0) |
| Runtime 입력 | data_scope 조회 시점 값 | `TeamPermissions.php:236-265` | **PARTIAL** — 요청 시점 DB 조회가 Runtime 요소에 근접하나 명시적 Runtime Context 모델 없음 |
| Session 입력 | 만료(expires_at)만 | `UserAuth.php:609-611`,`:4243-4268` | **PARTIAL(만료만)** — effectiveScope 계산에 세션 참조 결합 grep 0 |
| Context 입력 | — | — | **ABSENT** |
| Version 기준 계산(D-4 목표) | — | — | **ABSENT** — `replaceScope` DELETE→INSERT(이력 소실)(`TeamPermissions.php:337-346` — EXISTING_IMPLEMENTATION §1) |

## 5. 설계 원칙

- Golden Rule — 신규 Effective Scope Engine 클래스를 백지에서 발명하지 않고, `effectiveScope`(`TeamPermissions.php:236-265`)의 fail-closed 판정 로직을 정본 계산 커널로 승격·확장한다(ADR D-4).
- version 기준 계산으로 전환할 때 현행 fail-closed 판정(owner/admin=null·비owner+무tenant=DENY_SCOPE·예외=DENY_SCOPE)을 약화하지 않는다(무후퇴 — 은행급 보안 판정 보존).
- Assignment/Permission 입력은 각각 Part 3-3/Part 2 실구현 완료 후에만 결합한다 — 선행 부재 상태에서 조기 결합 시도 금지(BLOCKED_PREREQUISITE).
- Default Intersection — Assignment/Permission/Runtime/Session/Context 5입력이 서로 다른 scope 값을 낼 경우 합집합이 아닌 교집합으로 Effective Scope를 좁힌다(ADR D-2).

## 6. Gap / BLOCKED_PREREQUISITE

- **Gap**: Assignment/Permission/Context 입력 자체가 substrate 부재. Runtime/Session은 부분 근접뿐. Version 기준 계산(캐시/스냅샷/diff)은 순신규.
- **BLOCKED_PREREQUISITE(RP-002)**: Effective Scope Engine의 5입력 중 Assignment(Part 3-3)·Permission(Part 2)이 실구현되지 않으면 "통합 계산"이 성립하지 않음 — 지금은 data_scope 단일 입력만 소비 가능.
- 실 구현 = 선행 Permission Engine·Role Registry/Hierarchy/Assignment·Decision Core 실구현 후 별도 승인세션(RP-002). 본 편 코드 0 · NOT_CERTIFIED.
