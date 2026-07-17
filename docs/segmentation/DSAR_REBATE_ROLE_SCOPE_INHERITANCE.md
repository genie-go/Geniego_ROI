# DSAR — Scope Inheritance (§36)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 통합 정본: [CANONICAL_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE.md](CANONICAL_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE.md) · ADR: [ADR_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE_GOVERNANCE.md](../architecture/ADR_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE_GOVERNANCE.md) · 요구 분모: [REQ_06A_4_5_3_1_5_2_ROLE_ORG_SCOPE.md](REQ_06A_4_5_3_1_5_2_ROLE_ORG_SCOPE.md)
> **★이 도메인은 부재가 아니라 존재·분산 — 통합이지 신설이 아니다.** 실 구현=고객 Rebate 도입 시 후속 승인 세션. 본 문서=**계약 명세**.

## 계약
scope inheritance id·source scope·target scope·inheritance type·included/excluded dimensions·**maximum depth**·environment restrictions·legal entity restrictions·inheritance priority·valid_from/to·status·evidence.

**Inheritance Type(6)**: FULL · RESTRICTED · READ_ONLY · METADATA_ONLY · **INTERSECTION** · CUSTOM.

## 원칙(§4.6)
**상속은 명시적으로 적용한다.** 자동 상속을 기본값으로 두지 않는다.

## 🔴 maximum depth 가 필요한 이유
조직 계층이 깊어지면 **상위 1회 부여가 말단까지 전파**된다. depth 제한이 없으면
**Tenant Admin 하나가 전 조직 권한**이 되고, 그것은 §16이 금지하는 상태다.

## 실측
상속 **부재** — 6경로 중 5개는 **상위 Registry 자체가 부재**(Workspace·Organization·Department·Legal Entity·Program).

## 분류
**NOT_APPLICABLE → 신설**(상위 Registry 선행).
