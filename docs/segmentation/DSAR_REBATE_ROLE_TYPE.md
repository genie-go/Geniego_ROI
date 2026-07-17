# DSAR — Role Type (§7)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 통합 정본: [CANONICAL_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE.md](CANONICAL_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE.md) · ADR: [ADR_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE_GOVERNANCE.md](../architecture/ADR_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE_GOVERNANCE.md) · 요구 분모: [REQ_06A_4_5_3_1_5_2_ROLE_ORG_SCOPE.md](REQ_06A_4_5_3_1_5_2_ROLE_ORG_SCOPE.md)
> **★이 도메인은 부재가 아니라 존재·분산 — 통합이지 신설이 아니다.** 실 구현=고객 Rebate 도입 시 후속 승인 세션. 본 문서=**계약 명세**.

## Role Type (9)
STANDARD(플랫폼 정의·Version 관리) · CUSTOM(Tenant 생성·보안제한 우회 불가) · SYSTEM(예약) · SERVICE(머신 아이덴티티) · EXTERNAL(Vendor/Partner) · TEMPORARY_TEMPLATE · COMPOSITE(§13) · READ_ONLY · RESTRICTED.

## 실측 대응
현행은 Type 개념 부재 — 3계통이 **암묵적으로** STANDARD 만 사용. `api_key`=사실상 SERVICE/API_CLIENT 성격이나 **Type 필드 없음**(`Db.php:942-955`).

## 분류
**NOT_APPLICABLE → 신설**. **api_key 를 SERVICE Type 으로 승격 시 기존 roleRank 의미 보존 필수**(1-9 Legacy Equivalence · **286차 rank 맵 붕괴 재현 금지**).
