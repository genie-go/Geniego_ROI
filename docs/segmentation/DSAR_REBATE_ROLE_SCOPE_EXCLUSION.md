# DSAR — Scope Exclusion (§38)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 통합 정본: [CANONICAL_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE.md](CANONICAL_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE.md) · ADR: [ADR_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE_GOVERNANCE.md](../architecture/ADR_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE_GOVERNANCE.md) · 요구 분모: [REQ_06A_4_5_3_1_5_2_ROLE_ORG_SCOPE.md](REQ_06A_4_5_3_1_5_2_ROLE_ORG_SCOPE.md)
> **★이 도메인은 부재가 아니라 존재·분산 — 통합이지 신설이 아니다.** 실 구현=고객 Rebate 도입 시 후속 승인 세션. 본 문서=**계약 명세**.

## 지원 제외(11)
특정 Program · Legal Entity · Country · Brand · Vendor · Merchant · Contract · Provider Account · Environment · Financial Data · Field.

## 🔴 핵심 규칙
**Explicit Scope Exclusion 은 일반 Include 보다 우선한다.**
→ §39 Resolution 우선순위 3위 · Runtime `REBATE_ROLE_SCOPE_EXCLUDED`(§51).

## 5-1 정본과의 정합
5-1 §4가 세운 **Explicit Deny 우선** 원칙의 Scope 판이다. **같은 원리 · 다른 축**이며
**별도 엔진을 만들지 않는다** — Deny 판정 체인에 Scope Exclusion 을 편입한다.

## 실측
Exclusion **부재**. 현행은 **Allow-list 만** 존재(`acl_permission` 매트릭스 · `scopes_json`) — **명시적 제외 개념이 없다.**

> Allow-list 만 있으면 **"전부 주되 하나만 빼기"가 불가능**하다.
> 그래서 실무에서는 **넓게 주게 되고**, 그것이 Privilege Creep 의 출발점이다.

## 분류
**NOT_APPLICABLE → 신설**(5-1 Explicit Deny 체인 확장·**중복 엔진 금지**).
