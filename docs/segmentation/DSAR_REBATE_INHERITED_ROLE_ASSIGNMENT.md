# DSAR — Inherited Assignment (§29)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 통합 정본: [CANONICAL_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE.md](CANONICAL_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE.md) · ADR: [ADR_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE_GOVERNANCE.md](../architecture/ADR_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE_GOVERNANCE.md) · 요구 분모: [REQ_06A_4_5_3_1_5_2_ROLE_ORG_SCOPE.md](REQ_06A_4_5_3_1_5_2_ROLE_ORG_SCOPE.md)
> **★이 도메인은 부재가 아니라 존재·분산 — 통합이지 신설이 아니다.** 실 구현=고객 Rebate 도입 시 후속 승인 세션. 본 문서=**계약 명세**.

## 상속 경로(6)
Tenant → Workspace · Organization → Department · Department → Team · Workspace → Program · Legal Entity → Country Operation · Role Hierarchy Parent → Child.

## 계약
inherited from assignment · **inheritance path** · inherited permissions · inherited scope · excluded permissions · local override · effective validity · evidence.

## 🔴 규칙
**상속 후 최종 Scope 는 명시적 계산 결과로 저장한다.**

> 계산을 매번 런타임에만 하면 **"왜 이 사람이 이걸 볼 수 있는가"를 사후에 설명할 수 없다.**
> §0 질문 **"Role 의 실제 사용 현황과 부여 근거를 설명할 수 있는가"**의 직답이 이 저장이다.

## 실측
상속 **부재** — 현행 6경로 중 **상위 Registry 자체가 없는 것이 5개**(Workspace·Organization·Department·Legal Entity·Program).
유일하게 가능한 것은 **Role Hierarchy Parent→Child** 인데 이 역시 부재(§12).

## 원칙(§4.6)
**상속은 명시적으로 적용한다** — 상위 Role 이 하위 Scope 로 **자동 상속되는지 여부를 Role·Assignment 별로 명시**.

## 분류
**NOT_APPLICABLE → 신설**(상위 Registry 선행 필요).
