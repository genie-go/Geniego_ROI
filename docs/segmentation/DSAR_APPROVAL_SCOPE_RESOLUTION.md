# DSAR — Scope Resolution 승인 (EPIC 06-A-03-02-03-04 Part 3-4 · Scoped Role Governance)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **상위 ADR**: [`ADR_DSAR_SCOPED_ROLE_GOVERNANCE`](../architecture/ADR_DSAR_SCOPED_ROLE_GOVERNANCE.md)
- **ground-truth**: [`DSAR_APPROVAL_SCOPE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_SCOPE_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_SCOPE_DUPLICATE_AUDIT`](DSAR_APPROVAL_SCOPE_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry/Hierarchy(Part 3-1/3-2)·Role Assignment(Part 3-3)·Decision Core 실구현 후 별도 승인세션
- **불변**: Default Intersection(§9) · Scope 자동확대 금지 · Scope Hierarchy ≠ Organization Hierarchy(§13·D-3) · 반날조(부재 날조·실재 과신 양방향 금지)

---

## 1. 목적

Scope Resolution(스펙 §10)은 Role Scope · Assignment Scope · Permission Scope · Session Scope · Runtime Scope를 통합해 최종 **Effective Scope**를 산출하는 핵심 계산 계층이다. Part 3-4 6개 엔티티 중 **유일하게 PARTIAL(근접 substrate 실재)** 판정 — `effectiveScope()`가 이미 유사 역할을 라이브로 수행 중이다.

## 2. Canonical 필드

스펙 §2 Canonical Entity `APPROVAL_SCOPE_RESOLUTION`. 입력(스펙 §10 원문): Role Scope · Assignment Scope · Permission Scope · Session Scope · Runtime Scope. 출력: Effective Scope.

## 3. 열거형 / 타입

Resolution Input: ROLE_SCOPE · ASSIGNMENT_SCOPE · PERMISSION_SCOPE · SESSION_SCOPE · RUNTIME_SCOPE. Output: EFFECTIVE_SCOPE.

## 4. 실 substrate 매핑 (PARTIAL/PRESENT/ABSENT)

**PARTIAL** — `effectiveScope()`(`TeamPermissions.php:236-265`)가 근접 substrate:
- owner/admin → null(무제한)(`:246`)
- 비owner + 무tenant → DENY_SCOPE(`:251`)
- 예외 발생 → DENY_SCOPE(`:260-263`·은행급 fail-closed)
- company 차원 → null(`:258`)
- 미설정 → null(fail-open 예외조항·`:255-256`)

★단, §10이 요구하는 5축(Role/Assignment/Permission/Session/Runtime Scope) **통합 계산이 아니라 data_scope 단일 테이블만 조회**(role/session/runtime 별도 입력 경로 없음). ★**라이브 재계산·version 무관**(요청마다 SELECT, 캐시/버전/스냅샷 diff 없음 — EXISTING_IMPLEMENTATION §9). replaceScope는 DELETE→INSERT 전량교체로 이력 소실(`TeamPermissions.php:337-346`).

| §10 입력 | 판정 | 근거 |
|---|---|---|
| Role Scope | ABSENT(Role Registry 자체가 Part 3-1 설계뿐·코드 0) | ADR 선행 블록 참조 |
| Assignment Scope | ABSENT(Role Assignment Part 3-3 설계뿐) | ADR 선행 블록 참조 |
| Permission Scope | PARTIAL(data_scope로 근접 대체) | `TeamPermissions.php:236-265` |
| Session Scope | ABSENT(만료 외) | `UserAuth.php:609-611` |
| Runtime Scope | ABSENT | grep 0 |
| Effective Scope(출력) | **PARTIAL(라이브·version 무관)** | `TeamPermissions.php:236-265` |

## 5. 설계 원칙

- ADR D-4: effectiveScope substrate를 Assignment/Permission/Session/Runtime/Context 통합 + **version 기준** Effective Scope Engine(§27)으로 승격 — 신규 병렬 Resolver 신설 금지, 기존 effectiveScope를 확장.
- Default Intersection(§9) 유지 — 5축 통합 시에도 상위 scope가 하위를 덮어쓰지 않게(ADR D-2).
- fail-closed 원칙(현행 `:251,260-263`) 보존 — 승격 후에도 예외/무tenant는 DENY.
- company=null(사실상 wildcard, `:258,372`)은 승격 시 Scope Expansion Guard(§29) 대상으로 재검토 필요(ADR D-2 자동확대 위험 지점).

## 6. Gap / BLOCKED_PREREQUISITE

5축 중 4축(Role/Assignment/Session/Runtime Scope) 입력 자체가 ABSENT — Permission Scope(=data_scope)만 근접. Effective Scope 출력은 존재하나 version 개념이 없어 §10이 요구하는 "버전 기준 계산"은 미충족. BLOCKED_PREREQUISITE: RP-002 — Role Registry(Part 3-1) · Hierarchy(3-2) · Assignment(3-3) · Permission Engine(Part 2) 실구현이 선행돼야 5축 입력이 실재화된다.
