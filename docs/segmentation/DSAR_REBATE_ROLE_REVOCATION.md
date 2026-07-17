# DSAR — Role Revocation (§34)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 통합 정본: [CANONICAL_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE.md](CANONICAL_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE.md) · ADR: [ADR_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE_GOVERNANCE.md](../architecture/ADR_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE_GOVERNANCE.md) · 요구 분모: [REQ_06A_4_5_3_1_5_2_ROLE_ORG_SCOPE.md](REQ_06A_4_5_3_1_5_2_ROLE_ORG_SCOPE.md)
> **★이 도메인은 부재가 아니라 존재·분산 — 통합이지 신설이 아니다.** 실 구현=고객 Rebate 도입 시 후속 승인 세션. 본 문서=**계약 명세**.

## 계약
role_revocation_id·role_assignment·revocation type·reason·requested_by·approved_by·revoked_by·requested_at·effective_at·revoked_at·**session invalidation**·**token revocation**·**cache invalidation**·**downstream provider revocation**·status·evidence.

## 🔴 실측 — Session Invalidation 은 REAL 이다
✅ **VALIDATED_LEGACY**: `EnterpriseAuth.php:400` — `if (\$active === 0) DELETE FROM user_session WHERE user_id=?` **// 즉시 deprovision**.
✅ Impersonation 토큰: `imp_` prefix · **2h 만료** · auditLog(`UserAdmin.php:493/495/499`).
✅ api_key: `is_active` · `expires_at`(`Db.php:942-955`).

## 🔴 부재
**downstream provider revocation** — 외부 광고/커머스 Provider 측 접근 회수는 **개념 부재**.
**cache invalidation** — 캐시 자체가 부재(무해·§30 참조).

## 규칙
**Revocation 은 실 회수까지 확인해야 한다** — 5-7 판정 계승: **"Review 가 REVOKE 했는데 권한이 잔존하면 Review 자체가 무의미"**.
→ §47 **REVOKED_ROLE_STILL_ACTIVE**.

## 분류
세션 무효화 = **VALIDATED_LEGACY(재사용 강제)** · Revocation 원장·downstream 회수 = **NOT_APPLICABLE → 신설**.
