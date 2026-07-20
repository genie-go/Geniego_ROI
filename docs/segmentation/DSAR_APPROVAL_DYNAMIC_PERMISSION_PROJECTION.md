# DSAR — Approval Dynamic Runtime Permission Projection (EPIC 06-A-03-02-03-04 Part 3-5 · per-entity: Runtime Permission Projection)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **상위 ADR**: [`ADR_DSAR_DYNAMIC_ROLE_GOVERNANCE`](../architecture/ADR_DSAR_DYNAMIC_ROLE_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_DYNAMIC_ROLE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_DYNAMIC_ROLE_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_DYNAMIC_ROLE_DUPLICATE_AUDIT`](DSAR_APPROVAL_DYNAMIC_ROLE_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry/Hierarchy/Assignment/Scoped(Part 3-1~3-4)·Decision Core 실 구현 부재
- **불변**: UNKNOWN Permit 금지 · ★Dynamic Role ≠ 정적 role · 반날조(substrate file:line은 상위 ADR·ground-truth 2문서만 · 없으면 ABSENT)

## 1. 목적

`APPROVAL_DYNAMIC_ROLE_PROJECTION`(스펙 §2 Canonical Entity·§14 Runtime Permission Projection)은 정적 Permission과 동적으로 계산된 Constraint/Scope를 합성해 "실효(effective) Permission"을 산출하는 절차다. 근접 substrate는 `effectiveForUser`(`TeamPermissions.php:366-394`·중복감사 §D-2)이며, 매 요청 **라이브 재계산**한다는 점에서 "Projection" 개념과 방향은 일치하나, Version/Cache/Snapshot 없이 매번 재계산되고 Dynamic Permission·Runtime Constraint 축은 아예 존재하지 않는다.

## 2. Canonical 필드

스펙 §14는 4개 구성요소 열거만 정의(필드 섹션 없음). 설계 제안: Projection ID · User ID · Static Permission Set(참조) · Dynamic Permission Set(Rule Evaluation 결과 참조) · Runtime Constraint Set(§16 참조) · Runtime Scope Set(별도 DSAR `DSAR_APPROVAL_DYNAMIC_RUNTIME_SCOPE_PROJECTION`) · Computed At · Version(Cache invalidation 결합).

## 3. 열거형 / 타입

스펙 §14 원문 — **구성요소**: Static Permission · Dynamic Permission · Runtime Constraint · Runtime Scope.

## 4. 실 substrate 매핑 (ABSENT/근접 · ground-truth만 인용)

- **Static Permission**: `TeamPermissions.php:10,227` 등 team_role 기반 권한 저장이 근접 substrate로 실재(ground-truth §3) — 단 본 DSAR는 Permission Engine(Part 2) 소관이므로 여기서는 입력 축으로만 인용.
- **Dynamic Permission = ABSENT**. Rule Evaluation 결과가 Permission을 증감시키는 로직 자체가 grep 0(ground-truth §2 RBAC Rule Engine ABSENT와 동일 근거).
- **Runtime Constraint(Read Only/Amount/Time/Device/Network/Session) = ABSENT**. Require MFA 로그인 게이트(`UserAuth.php:929-1036,3719-3760`)가 "특정 동작에 조건부 제약을 부여한다"는 방향성만 유사(ground-truth §8) — 단 이는 로그인 시점 1회 게이트일 뿐 Permission 단위 Runtime Constraint(예: 특정 API에 Amount 상한 부여)가 아니다. `UserAuth.php:3929`(MFA disable current_password 재확인)는 좁은 개별 사례.
- **Runtime Scope**: `effectiveScope`(`TeamPermissions.php:236-265`)가 근접(별도 DSAR `DSAR_APPROVAL_DYNAMIC_RUNTIME_SCOPE_PROJECTION`에서 상세 취급).
- **★가장 근접한 전체 합성 지점 = `effectiveForUser`**(`TeamPermissions.php:366-394`·3단 위계 owner/manager/member+team clamp·중복감사 §D-2): 여러 축(role rank + team clamp)을 합성해 최종 권한을 산출한다는 점에서 "Projection"과 구조적으로 가장 가깝다. 그러나 (a) Dynamic Permission·Runtime Constraint 축 자체가 없고 (b) Version 결합·Cache·Snapshot 없이 **매 요청 라이브 재계산**되어(ground-truth §5·중복감사 §D-2) Projection Cache(스펙 §22)와 무관하다.

## 5. 설계 원칙

- `effectiveForUser`의 라이브 재계산 결과를 Version 시점 Snapshot으로 캡처하는 방향으로 확장한다(대체가 아니라, 계산 로직 자체는 보존하고 그 위에 Projection/Cache 계층을 얹음).
- Dynamic Permission 축은 Rule Evaluation(별도 DSAR)의 TRUE 판정 결과만 반영하며, UNKNOWN/ERROR는 Static Permission 이하로 결코 확장하지 않는다(fail-closed — ADR D-2 준수).
- Runtime Constraint는 즉시 조립 가능한 근접 입력이 없으므로(MFA 게이트는 로그인 게이트일 뿐 Permission 단위 제약이 아님), 별도 순신규 축으로 취급한다.

## 6. Gap / BLOCKED_PREREQUISITE

- **BLOCKED_PREREQUISITE(RP-002)**: Static Permission 축 자체가 Permission Engine(Part 2) 실 구현에 종속되므로, Projection은 Part 2 완료 이전 착수 불가.
- **Gap**: Dynamic Permission·Runtime Constraint 2축은 대응 substrate가 전무해(ABSENT) 순신규 설계·구현이 필요. Version 기반 Cache(스펙 §22)는 `effectiveForUser`의 라이브 재계산 패턴 전체를 재설계해야 도입 가능(단순 캐시 레이어 추가로 부족).
- 실 구현 = 선행 Permission Engine·Role Registry/Hierarchy/Assignment/Scoped·Decision Core 실구현 후 별도 승인세션(RP-002).
