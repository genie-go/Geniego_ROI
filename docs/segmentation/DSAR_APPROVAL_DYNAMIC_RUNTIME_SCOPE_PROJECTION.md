# DSAR — Approval Dynamic Runtime Scope Projection (EPIC 06-A-03-02-03-04 Part 3-5 · per-entity: Runtime Scope Projection)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **상위 ADR**: [`ADR_DSAR_DYNAMIC_ROLE_GOVERNANCE`](../architecture/ADR_DSAR_DYNAMIC_ROLE_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_DYNAMIC_ROLE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_DYNAMIC_ROLE_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_DYNAMIC_ROLE_DUPLICATE_AUDIT`](DSAR_APPROVAL_DYNAMIC_ROLE_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry/Hierarchy/Assignment/Scoped(Part 3-1~3-4)·Decision Core 실 구현 부재
- **불변**: UNKNOWN Permit 금지 · ★Dynamic Role ≠ 정적 role(현행 Scope는 version 무관 라이브 계산) · 반날조(substrate file:line은 상위 ADR·ground-truth 2문서만 · 없으면 ABSENT)

## 1. 목적

`APPROVAL_DYNAMIC_ROLE_PROJECTION`(스펙 §2 Canonical Entity·§15 Runtime Scope Projection)은 Tenant·Organization·Project·Dataset·API 5축에서 "지금 이 요청이 접근 가능한 실효 범위"를 산출하는 절차다. 근접 substrate는 `effectiveScope`(`TeamPermissions.php:236-265`)이며, ground-truth §3·§10이 명시하듯 이는 **ABAC data_scope 9차원 행필터**로서 이미 fail-closed DENY_SCOPE(`:234,251,263`)를 실행 중이다 — 그러나 Version과 무관하게 매 요청 라이브 재계산되며, 스펙 §15의 5축(Tenant/Organization/Project/Dataset/API)과 1:1 대응하지 않는다.

## 2. Canonical 필드

스펙 §15는 5축 열거만 정의(필드 섹션 없음). 설계 제안: Scope Projection ID · User ID · Scope Axis(§3 열거값) · Scope Value · Computed At · Source Version(Rule/Assignment Version 참조) · Cache Key.

## 3. 열거형 / 타입

스펙 §15 원문 — **Runtime Scope 축**: Tenant · Organization · Project · Dataset · API.

## 4. 실 substrate 매핑 (PARTIAL/ABSENT · ground-truth만 인용)

- **Tenant 축 = 근접 실재**: `X-Tenant-Id` 격리(중복감사 §D-2 "ABAC scope(effectiveScope)" 표 항목 — data_scope 행필터의 상위 경계)와 `effectiveScope`(`TeamPermissions.php:236-265`)가 사실상 Tenant 경계 내에서 동작. api_key rank 게이트(`index.php:572-598`)도 Tenant 인가와 결합되어 동작(§6 PDP/PEP 근접).
- **★핵심 substrate = `effectiveScope`(DATA_SCOPES 9차원)**(`TeamPermissions.php:236-265`·9차원 `:41`·fail-closed DENY_SCOPE `:234,251,263`·`scopeSql`/`scopeSqlNamed`/`scopeChannelProduct` `:286-322`): 스펙 §15의 5축과 이름이 겹치지 않는 데이터 행필터 축(ground-truth §3 "ABAC 최근접이나 단일목적(데이터 행필터) 축소판") — Organization/Project/Dataset/API 축과 직접 대응하지 않음.
- **API 축 = 근접**: `index.php:572-598`의 api_key RBAC 게이트(`:573` roleRank·method별 rank/scope 비교)가 라우트(=API 표면) 단위 접근을 통제한다는 점에서 API 축과 가장 가까우나, 이는 **이진 게이트**(PEP 근접·ground-truth §6)이지 Scope Projection 산출물이 아니다.
- **Organization/Project/Dataset 축 = ABSENT**. ground-truth·ADR·중복감사 3문서 어디에도 조직/프로젝트/데이터셋 단위 스코프 제한이 등장하지 않음 — grep 0.
- **Version 결합 = ABSENT**: `effectiveScope`는 저장된 scope_type/scope_values를 매 요청 라이브 조회할 뿐(ground-truth §3), Rule Version·Assignment Version(별도 DSAR)과 무관하게 계산된다 — Scope Projection이 요구하는 "Version 기준 실효 범위" 개념 자체가 없음.

## 5. 설계 원칙

- Tenant/data_scope 축은 `effectiveScope`를 결정 입력으로 그대로 편입하고(ADR D-1 ABAC_SUBSTRATE 확장·결정입력), API 축은 index.php RBAC 게이트를 PEP_NEAR로 확장 편입한다(ADR D-1 PEP_NEAR).
- Organization/Project/Dataset 3축은 순신규이며, 기존 5개 산재 write 경로(중복감사 §D-2 무통합 정적 rank 4곳)에 얹지 않고 단일 Scope Projection 산출 지점으로 수렴한다(Golden Rule — 중복 Rule/Policy Engine 신설 금지).
- Version 기반 Cache(스펙 §22 Projection Cache)는 `effectiveScope`의 라이브 재계산 패턴을 Version 시점 Snapshot으로 승격하는 방향으로 설계하되, 이번 차수는 승격 대상 지정만(코드 0).

## 6. Gap / BLOCKED_PREREQUISITE

- **BLOCKED_PREREQUISITE(RP-002)**: Organization/Project/Dataset 축은 Permission Engine(Part 2)의 리소스 모델·Role Registry(Part 3-1) 실 구현이 선행되어야 함.
- **Gap**: 5축 중 Tenant/API만 근접 substrate 존재, Organization/Project/Dataset 3축은 완전 ABSENT — 대규모 신규 설계 필요. Version 무관 라이브 계산 구조는 Version 엔티티(별도 DSAR) 도입과 함께 해결되어야 함.
- 실 구현 = 선행 Permission Engine·Role Registry/Hierarchy/Assignment/Scoped·Decision Core 실구현 후 별도 승인세션(RP-002).
