# DSAR — Temporary Assignment (§30)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 통합 정본: [CANONICAL_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE.md](CANONICAL_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE.md) · ADR: [ADR_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE_GOVERNANCE.md](../architecture/ADR_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE_GOVERNANCE.md) · 요구 분모: [REQ_06A_4_5_3_1_5_2_ROLE_ORG_SCOPE.md](REQ_06A_4_5_3_1_5_2_ROLE_ORG_SCOPE.md)
> **★이 도메인은 부재가 아니라 존재·분산 — 통합이지 신설이 아니다.** 실 구현=고객 Rebate 도입 시 후속 승인 세션. 본 문서=**계약 명세**.

## 계약 — 필수
valid_from · valid_to · **maximum duration** · reason · approver · **expiration action** · notification schedule · review requirement · **session invalidation at expiry** · **cache invalidation** · evidence.

## 🔴 규칙
**만료 후 자동 회수되며 연장은 새 요청 또는 명시적 갱신으로 처리한다.**
Static Lint: **Validity 없는 Temporary Assignment 차단**(§49) · **Assignment Expiry 후 Cache 유지 차단**(§49).

## 🔴 실측 — Cache 무효화 위험이 현행엔 없다
5-5 판정 계승: **Authorization Cache 부재**(5-1 §51 "여러 Authorization Cache → **0(캐시 부재)**").
**캐시가 없으므로 매 요청 DB 재조회 → 만료가 즉시 반영된다.**

> **이것은 성능 부채이지 보안 결함이 아니다.** 오히려 **캐시를 도입하는 순간
> "만료됐는데 캐시가 살아있는" 문제가 새로 생긴다.**
> → **캐시 도입 시 무효화 설계가 동시에 와야 한다**(§30 요구가 그 시점에 발효).

## api_key 선례
`expires_at` REAL(`Db.php:942-955`) — **Temporary Assignment 의 Validity 패턴이 이미 존재**한다.

## 분류
api_key `expires_at` = **VALIDATED_LEGACY(패턴 재사용)** · Temporary Assignment 체계 = **NOT_APPLICABLE → 신설**.
