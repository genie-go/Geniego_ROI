# DSAR — Role Version Migration Policy (§10)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 통합 정본: [CANONICAL_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE.md](CANONICAL_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE.md) · ADR: [ADR_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE_GOVERNANCE.md](../architecture/ADR_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE_GOVERNANCE.md) · 요구 분모: [REQ_06A_4_5_3_1_5_2_ROLE_ORG_SCOPE.md](REQ_06A_4_5_3_1_5_2_ROLE_ORG_SCOPE.md)
> **★이 도메인은 부재가 아니라 존재·분산 — 통합이지 신설이 아니다.** 실 구현=고객 Rebate 도입 시 후속 승인 세션. 본 문서=**계약 명세**.

## Migration Policy (6)
**AUTO_APPLY_NON_BREAKING** · REQUIRE_REVIEW · **REQUIRE_REAPPROVAL** · GRANDFATHER_EXISTING · EXPIRE_EXISTING · MANUAL_MIGRATION.

## 🔴 핵심 판단 — 변경 방향에 따라 정책이 다르다
- **권한 확대 → AUTO_APPLY 금지.** 승인 없이 **전 사용자 권한이 조용히 넓어진다.**
- **권한 축소 → AUTO_APPLY 가능하나 Legacy Equivalence 검증 필수.** 1-9 최우선 명령: **정상 접근을 지우면 즉시 장애**이고, **장애는 롤백을 부르고 롤백은 보안까지 되돌린다.**

## 실측 근거 — 가설 아님
**286차 rank 맵 붕괴**가 이 위험의 **실사례**다. Role 의미 변경이 **대량 회귀**를 냈다(5-1 §58 "회귀 고위험 지점" 1순위).

## 분류
**NOT_APPLICABLE → 신설**.
