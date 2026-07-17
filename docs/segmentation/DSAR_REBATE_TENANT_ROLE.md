# DSAR — Tenant Role (§16)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 통합 정본: [CANONICAL_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE.md](CANONICAL_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE.md) · ADR: [ADR_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE_GOVERNANCE.md](../architecture/ADR_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE_GOVERNANCE.md) · 요구 분모: [REQ_06A_4_5_3_1_5_2_ROLE_ORG_SCOPE.md](REQ_06A_4_5_3_1_5_2_ROLE_ORG_SCOPE.md)
> **★이 도메인은 부재가 아니라 존재·분산 — 통합이지 신설이 아니다.** 실 구현=고객 Rebate 도입 시 후속 승인 세션. 본 문서=**계약 명세**.

## 계약 — Tenant Role(6)
TENANT_VIEWER · TENANT_REBATE_ADMIN · TENANT_ACCESS_ADMIN · TENANT_FINANCE_ADMIN · TENANT_AUDITOR · TENANT_SECURITY_ADMIN.

## 🔴 Tenant Admin 이 자동 획득하지 않아야 할 것(6)
다른 Tenant 접근 · Platform Credential 접근 · **모든 Payout 실행** · Platform Security Policy 수정 · **Platform Audit 삭제** · 다른 Legal Entity 의 금융 데이터 접근.

## 실측 — Tenant Isolation 은 강력하다
🔴 **VALIDATED_LEGACY(재사용 강제)**: `auth_tenant` row-level RLS 전역 · agency 토큰 **서버바인딩 tenant 주입·위조불가**(`index.php:97-100`) · `authedTenant` **64 핸들러** · `tenant_id=?` 관례 · **192차 `/api` 별칭 권한상승 차단**(`index.php:562-575` · **영구 규칙: 신규 게이트도 `/api` 변형 동시 매칭**).

## 🔴 위험 이력 — 286차 platform_growth act-as tenant 하이재킹
Growth Center 진입 **자동 ON → localStorage 고착 → `X-Act-As-Tenant` 헤더 → `authedTenant` 가 실 tenant 대신 platform_growth 반환 → 전 메뉴 공백**.
**Tenant 해석이 요청 시점에 뒤바뀔 수 있음을 보여준 실사례** → Tenant Role 설계 시 **act-as 경로를 반드시 Scope 계산에 포함**해야 한다.

## 분류
Tenant Isolation = **VALIDATED_LEGACY** · Tenant Role 카탈로그 = **NOT_APPLICABLE → 신설**.
