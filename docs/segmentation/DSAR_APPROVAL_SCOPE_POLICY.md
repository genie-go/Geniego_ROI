# DSAR — Approval Scope Policy (EPIC 06-A-03-02-03-04 Part 3-4 · per-entity: Scope Policy)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **상위 ADR**: [`ADR_DSAR_SCOPED_ROLE_GOVERNANCE`](../architecture/ADR_DSAR_SCOPED_ROLE_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_SCOPE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_SCOPE_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_SCOPE_DUPLICATE_AUDIT`](DSAR_APPROVAL_SCOPE_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry/Hierarchy/Assignment(Part 3-1/3-2/3-3)·Decision Core 실 구현 부재
- **불변**: Default Intersection · Scope 자동확대 금지 · Scope Hierarchy ≠ Organization Hierarchy · envLabel ≠ Scope · Golden Rule(7곳 산재 통합) · 반날조(substrate file:line은 상위 ADR·ground-truth 2문서만·없으면 ABSENT)

## 1. 목적

Scope Policy는 여러 Scope 소스(Role Scope·Assignment Scope·Permission Scope·Session Scope·Runtime Scope)가 충돌할 때 **어떻게 병합할지 결정하는 규칙**이다(스펙 §9: Intersection·Union·Most Restrictive·Explicit Mapping·Dynamic Rule, 기본 Intersection). ADR D-2가 명문화하듯 이번 Part의 핵심 불변은 **"Default Intersection · Scope 자동확대 금지"**다. 현행 `effectiveScope`는 명시적 Policy 타입 열거 없이 **fail-closed 단일 알고리즘**으로 이 역할을 암묵 수행한다(EXISTING_IMPLEMENTATION §1). Scope Policy 엔티티는 이 암묵 알고리즘을 명시적 Policy Type으로 승격한다.

## 2. Canonical 필드

| 필드 | 의미 |
|---|---|
| `scope_policy_id` | Policy 식별자(PK) |
| `policy_type` | §3 열거(Intersection/Union/Most Restrictive/Explicit Mapping/Dynamic Rule) |
| `is_default` | 기본 Policy 여부(기본값=Intersection) |
| `applies_to` | 적용 대상 Scope Type 목록 |
| `fail_mode` | 실패 시 동작(fail-closed/fail-open) |
| `expansion_guard_ref` | § Scope Expansion Guard 참조(§29) |

## 3. 열거형 / 타입

- **`policy_type`**(스펙 §9 verbatim): `Intersection` · `Union` · `Most Restrictive` · `Explicit Mapping` · `Dynamic Rule`. **기본값=Intersection**.
- **`fail_mode`**: `FAIL_CLOSED`(DENY 우선) · `FAIL_OPEN`(예외 허용 — 현행 일부 경로에 존재, §4 참조).

## 4. 실 substrate 매핑 (PARTIAL/PRESENT/ABSENT·ground-truth만 인용)

| Canonical | 판정 | 실 substrate (file:line) |
|---|---|---|
| Policy Type 명시 열거(Intersection/Union/…) | **ABSENT** | 명시적 Policy Type 계약 grep 0 — `effectiveScope`가 단일 암묵 알고리즘으로 대체(EXISTING_IMPLEMENTATION §1) |
| Intersection-유사 동작(근접) | **PARTIAL(암묵)** | `effectiveScope`(`TeamPermissions.php:236-265`) — owner/admin=null(무제한 `:246`)·비owner+무tenant=DENY_SCOPE(`:251`)·예외=DENY_SCOPE(`:260-263`) |
| fail-closed 기조 | **PRESENT(부분)** | `TeamPermissions.php:251,260-263` — 대부분 경로 DENY_SCOPE |
| fail-open 예외조항(주의 지점) | **PRESENT(위험)** | `TeamPermissions.php:255-256` — 미설정=null(무제한) fail-open 예외 |
| `company`=사실상 wildcard | **PRESENT(자동확대 위험)** | `TeamPermissions.php:258` — company=null(무제한), Default Intersection 원칙과 긴장 관계(ADR D-2) |
| Union/Most Restrictive/Explicit Mapping/Dynamic Rule 개별 구현 | **ABSENT** | grep 0 |
| Scope Expansion Guard(§29) | **ABSENT(설계 리스크로만 확인)** | manager 위임 시 scope 무검증(`TeamPermissions.php:648-653`) — `putMemberPermissions`가 menus는 clamp(`:627-646`)하나 scope는 body 그대로 기록(DUPLICATE_AUDIT D-5) |

★현행 "Policy"는 단일 fail-closed 알고리즘(effectiveScope)뿐이며, Intersection/Union/Most Restrictive 등 **명시적으로 선택 가능한 Policy Type 개념 자체가 ABSENT**다. 다만 그 알고리즘의 지배적 동작(비owner 경로 대부분 DENY 우선)은 Intersection·Default Intersection 원칙과 정신적으로 가장 가깝다(정직 근사, 동일물 아님).

## 5. 설계 원칙

1. **Default Intersection 명문화** — 현재 암묵적으로 근사되는 fail-closed 동작을 명시적 Policy Type=Intersection으로 승격(ADR D-2). 판정 결과 변경 금지(회귀 0).
2. **fail-open 예외조항 재검토 대상 등재** — `TeamPermissions.php:255-256`(미설정=null 무제한)·`:258`(company wildcard)은 Default Intersection과 충돌하는 지점으로 Gap 등재(수정은 별도 fix 세션).
3. **Scope Expansion Guard 실체화(§29)** — manager scope 위임상한 미구현(DUPLICATE_AUDIT D-5)을 Expansion Guard의 최우선 구현 대상으로 명문화(이번 차수 수정 안 함).
4. **Explicit Mapping/Dynamic Rule은 후속 Part 참조만** — Dynamic Scope(§26)는 Part 3-5로 위임(스펙 §26 verbatim).

## 6. Gap / BLOCKED_PREREQUISITE

- **BLOCKED_PREREQUISITE (RP-002)**: Policy가 Role/Assignment/Permission Scope와 실제로 결합해 계산되는 지점은 선행 Part 2/3-1/3-2/3-3 실 구현 이후. 본 차수 코드 0.
- **Gap-1(ABSENT)**: Policy Type 명시 열거·is_default·applies_to·expansion_guard_ref 전무 — 순신설.
- **Gap-2(★실결함, 별도 fix 트랙)**: manager scope 위임상한 미구현(권한상승) — `putMemberPermissions`(`TeamPermissions.php:615-661`)이 menus는 `assignableMap` 상한 clamp(`:627-646`·DELEGATION_EXCEEDED)하나 scope는 manager 본인 범위와 비교 없이 `replaceScope` 직접 기록(`:649,653`). 주석(`:648`)의 약속이 코드 미구현. 이번 차수 수정 안 함(설계·별도 fix 세션 배포승인 필요, DUPLICATE_AUDIT D-5).
- **Gap-3(fail-open 지점)**: `company` wildcard(`:258`)·미설정 fail-open(`:255-256`)은 Default Intersection 불변과 구조적 긴장 — Policy 설계 시 명문 경고 필요.
- **정직 부재**: Union/Most Restrictive/Explicit Mapping/Dynamic Rule 개별 알고리즘 ABSENT — 결함으로 날조 금지. 289차 P1~P4 재플래그 금지.
- **판정**: NOT_CERTIFIED · 실 엔진 = 선행 Permission Engine·Role Registry/Hierarchy/Assignment·Decision Core 실 구현 + 별도 승인세션(RP-002).
