# DSAR — Approval Role Assignment Scope (EPIC 06-A-03-02-03-04 Part 3-3 · per-entity: Role Assignment Scope)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **상위 ADR**: [`ADR_DSAR_ROLE_ASSIGNMENT_GOVERNANCE`](../architecture/ADR_DSAR_ROLE_ASSIGNMENT_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_ROLE_ASSIGNMENT_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_ASSIGNMENT_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_ROLE_ASSIGNMENT_DUPLICATE_AUDIT`](DSAR_APPROVAL_ROLE_ASSIGNMENT_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry/Hierarchy(Part 3-1/3-2)·Decision Core 실 구현 부재
- **불변**: Assignment ≠ 즉시 direct write · 인가 실소비 role에만 · Golden Rule(5분산 write 통합) · 반날조(substrate file:line은 상위 ADR·ground-truth 2문서만·없으면 ABSENT)

## 1. 목적

`APPROVAL_ROLE_ASSIGNMENT_SCOPE`(스펙 §2 Canonical Entity·§8 Assignment Scope)는 Assignment가 유효한 범위를 다축으로 제한한다. ground-truth §7이 지목한 근접 substrate `effectiveScope`(`TeamPermissions.php:236-265`)는 이미 fail-closed DENY_SCOPE 패턴을 실행 중이나, "assignment 엔티티/version 무참조·매 요청 라이브 재계산·캐시 없음"으로 정직 판정된다. 즉 Scope **계산**은 실재하되 Scope가 Assignment Version에 **고정**되는 구조는 없다.

## 2. Canonical 필드

스펙 §8은 축 목록만 정의(필드 섹션 없음). 설계 제안: Scope ID · Assignment ID(참조) · Scope Axis(§3 열거값 중 다중 선택) · Scope Value · Intersection Group(교집합 계산 단위) · Effective As Of.

## 3. 열거형 / 타입

스펙 §8 원문 — **Scope 축**: Tenant · Legal Entity · Organization · Business Unit · Department · Project · Resource Type · Resource Instance · Region · Country · Currency · Amount · Time · Channel · Client · Device · Environment. **Intersection 기본 적용**(스펙 원문 — 여러 축이 지정되면 교집합으로 좁힘).

## 4. 실 substrate 매핑 (PARTIAL/ABSENT·ground-truth만 인용)

- **17축 다차원 Scope = ABSENT**. 현행 substrate는 Tenant 축(`X-Tenant-Id` 격리)과 극히 제한된 data_scope만 다룰 뿐, Legal Entity/Business Unit/Department/Project/Region/Country/Currency/Channel/Client/Device/Environment 축은 grep 0(ground-truth·ADR 어디에도 등장하지 않음 — ABSENT로 정직 판정).
- **근접 substrate = `effectiveScope`(fail-closed DENY_SCOPE)**(`TeamPermissions.php:236-265`·ground-truth §7 표): 유효 스코프를 매 요청 라이브 계산하나, Assignment 엔티티/Version을 참조하지 않고 캐시도 없음 — Scope Cache(스펙 §33 Assignment Cache)와 무관.
- **`replaceScope`(DELETE→INSERT)**(`TeamPermissions.php:337-346`·firsthand 확인): Scope 데이터가 저장은 되지만 in-place 교체이므로 Version 문서(§6)와 동일한 문제 — 이전 Scope가 소실됨(Scope Change Version Type 미대응).
- **Amount/Currency/Time 축 근접 힌트 없음**: ground-truth·ADR·중복감사 3문서 어디에도 금액/통화/시간 기반 스코프 제한이 team_role/api_key/wms_permissions/pm_task_assignees에 존재한다는 인용이 없음 — ABSENT.
- **wms_permissions/pm_task_assignees = Scope 개념 자체 부재**: 두 자원 모두 스코프축 없이 전역 또는 단순 리소스ID 기반(`Wms.php:505-526`·`Assignees.php:17-72`).

## 5. 설계 원칙

- Scope는 Assignment Version에 **고정(fixed)**되어야 하며(§6 Version 원칙과 결합), `effectiveForUser`/`effectiveScope`처럼 매 요청 라이브 재계산되는 패턴을 그대로 승격하지 않는다 — 대신 그 계산 결과를 Version 시점에 Snapshot으로 캡처하는 방향(ADR §3 "Effective Assignment/Permission Resolution: effectiveForUser substrate를 version 기준으로 승격").
- Intersection 기본 적용(스펙 원문)을 준수 — 다축 Scope가 동시 지정되면 합집합이 아닌 교집합으로 제한(현행 fail-closed DENY_SCOPE 사상과 정합).
- 17축 전부를 한 번에 신설하지 않고, 현재 실재하는 Tenant/data_scope 축을 기반으로 확장하는 것이 Golden Rule에 부합(발명이 아니라 조립).

## 6. Gap / BLOCKED_PREREQUISITE

- **BLOCKED_PREREQUISITE(RP-002)**: Resource Type/Resource Instance 축은 Permission Engine(Part 2)의 리소스 모델이 선행되어야 함.
- **Gap**: 17축 중 Tenant/일부 data_scope 외 15개 축은 현행 substrate에 대응물이 전혀 없음(ABSENT) — 대규모 신규 설계 필요. `replaceScope`의 in-place 소실 문제는 Version 엔티티 도입과 함께 해결되어야 함.
- 실 구현 = 선행 Permission Engine·Role Registry/Hierarchy·Decision Core 실구현 후 별도 승인세션(RP-002).
