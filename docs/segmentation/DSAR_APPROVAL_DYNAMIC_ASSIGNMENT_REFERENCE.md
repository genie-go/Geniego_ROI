# DSAR — Approval Dynamic Assignment Reference (EPIC 06-A-03-02-03-04 Part 3-3 · per-entity: Dynamic Assignment Reference)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **상위 ADR**: [`ADR_DSAR_ROLE_ASSIGNMENT_GOVERNANCE`](../architecture/ADR_DSAR_ROLE_ASSIGNMENT_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_ROLE_ASSIGNMENT_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_ASSIGNMENT_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_ROLE_ASSIGNMENT_DUPLICATE_AUDIT`](DSAR_APPROVAL_ROLE_ASSIGNMENT_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry/Hierarchy(Part 3-1/3-2)·Decision Core 실 구현 부재. ★추가로 Part 3-5(Dynamic Role) 실 구현 선행 필요.
- **불변**: Assignment ≠ 즉시 direct write · 인가 실소비 role에만 · Golden Rule(5분산 write 통합) · 반날조(substrate file:line은 상위 ADR·ground-truth 2문서만·없으면 ABSENT)

## 1. 목적

스펙 §1-11(Dynamic Assignment Reference)·§3(지원 Assignment 유형에 Dynamic Assignment Reference 포함)·§15(Effective Assignment Resolution 계산 축에 Dynamic Assignment Reference 포함) — 정적으로 값을 저장하는 대신, 동적 조건/규칙 평가 결과를 **참조**하여 Role을 산출하는 Assignment 유형이다. ADR §3 Canonical Interface가 명시하듯, Part 3-3 이번 차수는 이 유형의 **Reference Interface만** 제공하고 실제 동적 평가 엔진은 Part 3-5(Dynamic Role)의 몫이다.

## 2. Canonical 필드

스펙 §5 Assignment Definition 원문(공통) 중 Dynamic Assignment Reference에 적용되는 부분: Assignment ID · Subject ID · Subject Type · Role Definition ID · Role Version · Assignment Type(=Dynamic Assignment Reference) · Assignment Source(=Rule Reference) · Assignment Status · Assignment Lifecycle · Effective From · Effective To. ADR §3이 명시하는 Adapter 계약: "Conditional Assignment Rule Reference만 제공" — Reference 필드는 실 Rule 정의 자체가 아니라 **Rule을 가리키는 참조값**만 담는다.

## 3. 열거형 / 타입

- **Assignment Type** 값 중 Dynamic Assignment Reference(§3).
- **Effective Assignment Resolution**(§15) 계산 입력 축 중 하나: Direct · Group · Organization · Position · Delegated · Temporary · Emergency · **Dynamic Assignment Reference**. 모든 결과는 Version 기준.

## 4. 실 substrate 매핑 (PARTIAL/ABSENT · ground-truth만 인용)

**ABSENT — 동적 조건/규칙 평가 기반 Role 산출 substrate는 ground-truth 2편에 grep 매치 없음.**

- ADR §3 Canonical Interface: "Adapter(Part 3-4 Scoped·3-5 Dynamic·3-6 Service/System·3-7 Effective Resolution): Assignment Resolution Contract·Affected Subject/Assignment Reference·**Conditional Assignment Rule Reference만 제공**." — 즉 Part 3-3는 Part 3-5가 소비할 참조 인터페이스만 설계하고, Rule 평가 엔진 자체는 Part 3-5 몫으로 명시적으로 이관되어 있다.
- 근접 substrate로 오인될 수 있는 것은 EXISTING §7 "거버넌스 계층 근접 substrate 3종" 표의 `effectiveForUser`/`effectiveScope`(`TeamPermissions.php:366-394,236-265`)이나, 이는 **정적 team_role 값에 기반한 라이브 재계산**이지 규칙(Rule) 참조 기반 동적 평가가 아니며, 같은 표가 명시하듯 "assignment 엔티티/version 무참조"다. Dynamic Assignment Reference로 오흡수 금지.

**ABSENT — 거버넌스 계층**: Rule Reference Interface·Registry/Definition/Version/Lifecycle/Snapshot/Evidence/Digest 전 구간 순신규(EXISTING §6).

## 5. 설계 원칙

- ADR §3에 따라 이번 Part 3-3은 Dynamic Assignment Reference의 **Reference Interface(포인터 계약)만** 확정한다 — 실 Rule 평가 로직·Rule Engine은 Part 3-5(Dynamic Role, 스펙 §42 다음구현순서 2번)에서 별도 설계.
- `effectiveForUser`/`effectiveScope`(근접 substrate)를 Dynamic Assignment Reference의 대체 substrate로 오인·오흡수하지 않는다(DUPLICATE_AUDIT §2 "중복이 아닌 것" 원칙과 정합 — 근접 패턴은 각기 정당한 별개 기능).
- Reference 값은 Rule 정의 자체를 인라인 저장하지 않고 참조만 담아, Rule Engine(Part 3-5)이 신설되기 전까지 Dynamic Assignment Reference가 활성화되지 않도록 설계한다(§6 Conditional Assignment 문서와 동일한 안전장치 원칙).

## 6. Gap / BLOCKED_PREREQUISITE

- **BLOCKED_PREREQUISITE(RP-002 + Part 3-5 미착수)**: Dynamic Assignment Reference가 실제로 Role을 산출하려면 Part 3-5 Dynamic Role의 Rule Engine이 먼저 실구현되어야 한다(스펙 §42 다음구현순서). 이번 Part 3-3은 참조 계약만 제공.
- **Gap**: Rule Reference의 구체 스키마(Rule ID·Rule Version·평가 트리거)는 스펙에 세부 정의가 없어 Part 3-5 설계 시 확정 필요. Effective Assignment Resolution(§15)이 Dynamic Assignment Reference 결과를 Version 기준으로 병합하는 방식도 순신규.
- 실 구현 = Part 3-5 Dynamic Role Rule Engine 실구현 + 선행 Permission Engine·Role Registry/Hierarchy·Decision Core 실구현 후 별도 승인세션(RP-002). 이번 차수는 설계 명세(코드 0).
