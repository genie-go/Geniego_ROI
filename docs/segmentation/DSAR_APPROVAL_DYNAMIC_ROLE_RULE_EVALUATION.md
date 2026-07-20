# DSAR — Approval Dynamic Role Rule Evaluation (EPIC 06-A-03-02-03-04 Part 3-5 · per-entity: Rule Evaluation)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **상위 ADR**: [`ADR_DSAR_DYNAMIC_ROLE_GOVERNANCE`](../architecture/ADR_DSAR_DYNAMIC_ROLE_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_DYNAMIC_ROLE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_DYNAMIC_ROLE_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_DYNAMIC_ROLE_DUPLICATE_AUDIT`](DSAR_APPROVAL_DYNAMIC_ROLE_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry/Hierarchy/Assignment/Scoped(Part 3-1~3-4)·Decision Core 실 구현 부재
- **불변**: ★UNKNOWN Permit 금지(fail-closed) · Dynamic Role ≠ 정적 role · 반날조(substrate file:line은 상위 ADR·ground-truth 2문서만 · 없으면 ABSENT)

## 1. 목적

`APPROVAL_DYNAMIC_ROLE_EVALUATION`(스펙 §2 Canonical Entity·§9 Rule Evaluation)은 Rule Engine이 산출하는 판정 결과 계약을 정형화한다. 스펙 §9 원문의 핵심 안전 규율은 "★UNKNOWN은 Permit하지 않는다"이며, ADR D-2가 이를 이번 Part 5 전역 원칙으로 채택했다. ground-truth가 지목한 가장 근접한 실재 substrate는 `effectiveScope`의 fail-closed DENY_SCOPE 패턴(`TeamPermissions.php:234,251,263`)이다 — 이는 이미 "판정 불가/모호 시 거부"라는 동일 철학을 데이터 스코프 축에서 실행 중이나, TRUE/FALSE/UNKNOWN/ERROR 4상태 계약 자체는 존재하지 않는다.

## 2. Canonical 필드

스펙 §9는 출력 값 열거만 정의(필드 섹션 없음). 설계 제안: Evaluation ID · Rule ID(참조, `APPROVAL_DYNAMIC_ROLE_RULE_VERSION` 결합) · Runtime Context Snapshot · Evaluation Result(§3 열거값) · Evaluated At · Evaluator(system/user) · Fallback Decision(UNKNOWN/ERROR 시 강제 DENY).

## 3. 열거형 / 타입

스펙 §9 원문 — **Rule Evaluation Result**: TRUE · FALSE · UNKNOWN · ERROR. ★**UNKNOWN은 Permit하지 않는다**(스펙 원문 그대로 · ADR D-2 전역 원칙으로 승격).

## 4. 실 substrate 매핑 (ABSENT/근접 · ground-truth만 인용)

- **RBAC Rule Evaluation 자체 = ABSENT**(ground-truth §2). `RuleEngine.php`의 `evaluateTenant`(`:194-220`)는 마케팅 조건(channel_roas/sku_stock)을 평가할 뿐 role/permission 판정이 아니며, TRUE/FALSE/UNKNOWN/ERROR 4상태 계약도 없음.
- **★가장 근접한 fail-closed 실증 = `effectiveScope`**(`TeamPermissions.php:236-265`·DATA_SCOPES 9차원 `:41`·fail-closed DENY_SCOPE `:234,251,263`·`scopeSql`/`scopeSqlNamed`/`scopeChannelProduct`(`:286-322`)). 판정 모호/실패 시 접근을 거부하는 방향성은 Rule Evaluation의 UNKNOWN/ERROR→Deny 안전 규율과 정합하나, 이는 **2치(허용/거부) 결정**일 뿐 TRUE/FALSE/UNKNOWN/ERROR 4상태 결과 타입이 아니다.
- **PDP/PEP = ABSENT(용어 grep 0)**(ground-truth §6). 근접=`index.php:572-598` api_key RBAC 게이트(`:573` roleRank·method별 rank/scope 비교·403/통과 **이진**)·`guardTeamWrite`(`:82-89` 이진). Permit/Deny/Challenge/Escalate/Manual Review(§18 Policy Decision) 다중 결정 모델 자체가 없어, Rule Evaluation 결과를 소비할 PDP 계층도 부재.
- **Runtime Risk(계산형) = ABSENT**(ground-truth §7): `auth_audit_log.risk`(`UserAuth.php:4165`)는 호출부 하드코딩 low/medium/high 정적 라벨(`:4174,4203`·실사용 `:970,983`)이며 Rule Evaluation 입력으로 계산되는 값이 아니다.

## 5. 설계 원칙

- Rule Evaluation Result 4상태(TRUE/FALSE/UNKNOWN/ERROR)를 신설하되, UNKNOWN/ERROR는 **반드시 DENY로 폴백**한다(스펙 §9 원문·ADR D-2). `effectiveScope`의 fail-closed DENY_SCOPE(`TeamPermissions.php:234,251,263`)를 이 안전 규율의 근접 선례로 참조하되, 그 이진 로직을 4상태 계약으로 그대로 승격하지 않고 별도 Evaluation 계층에서 감싼다(Golden Rule — 대체 아닌 확장).
- Rule Evaluation은 Rule Version(별도 DSAR)에 바인딩되어야 하며, Version 미지정 평가는 허용하지 않는다(스펙 §30 Error Contract `RULE_VERSION_INVALID`와 결합 예정).
- index.php RBAC 이진 게이트(`:572-598,82-89`)를 PEP 근접 substrate로 삼아 Rule Evaluation 결과를 소비하도록 확장 설계하되, 현재 이진 판정을 다중 Policy Decision(§18)으로 대체하는 것은 이번 차수 범위 밖(설계만).

## 6. Gap / BLOCKED_PREREQUISITE

- **BLOCKED_PREREQUISITE(RP-002)**: Rule Evaluation은 Rule Engine 본체·Rule Version(둘 다 ABSENT)이 선행되어야 평가할 대상이 생긴다.
- **Gap**: UNKNOWN/ERROR→DENY 안전 규율을 강제할 Runtime Guard(스펙 §28 "Unknown Decision" 차단)가 아직 코드로 존재하지 않아, 이 원칙은 향후 구현 시 최우선 강제 규칙으로 명문화되어야 함.
- 실 구현 = 선행 Permission Engine·Role Registry/Hierarchy/Assignment/Scoped·Decision Core·Rule Engine 본체 실구현 후 별도 승인세션(RP-002).
