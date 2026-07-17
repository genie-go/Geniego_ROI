# DSAR — 최소 Runtime Guard (§45·23종)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 통합 정본: [CANONICAL_DSAR_AUTHORIZATION_FOUNDATION.md](CANONICAL_DSAR_AUTHORIZATION_FOUNDATION.md) · [CANONICAL_DSAR_AUTHORIZATION_POLICY_DECISION.md](CANONICAL_DSAR_AUTHORIZATION_POLICY_DECISION.md) · ADR: [ADR_DSAR_REBATE_PERMISSION_RBAC_ABAC_PBAC_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_PERMISSION_RBAC_ABAC_PBAC_FOUNDATION.md)
> **★이 도메인은 부재가 아니라 존재·분산 — 통합이지 신설이 아니다.** 실 구현=후속 승인 세션.

## Guard (23)
Unauthenticated Subject · Inactive Subject · **Tenant Mismatch** · Workspace Mismatch · **Legal Entity Mismatch** · **Environment Mismatch** · **Program Scope Mismatch** · Provider Account Mismatch · **Explicit Deny** · Permission Missing · **Policy Version Invalid** · Role Assignment Expired · Subject Binding Expired · Data Clearance Insufficient · **Financial Clearance Insufficient** · **MFA Required** · Risk Too High · **Program Not Active** · **Version Not Active** · **Field Access Denied** · Export Limit Exceeded · **Policy Conflict** · Kill Switch 활성

## 재사용 가능한 현행 Enforcement
- **Tenant**: `auth_tenant` 서버 주입(**위조불가**·index.php:97-100) · `authedTenant` 64핸들러 · `tenant_id=?` RLS · **action_request IDOR 차단**(208차 P0·Alerting.php:580-582).
- **Scope**: `admin:keys`/`write:*`/`write:ingest` + rank fallback(index.php:562-575) · **★`/api` 별칭 동시 매칭 필수**(192차 권한상승 교훈).
- **화이트리스트 거부**: RuleEngine 미등록 op **422**(RuleEngine.php:120-121).
- **원자적 전이**: 조건부 UPDATE + rowCount(CouponRedeem.php:136).
- **Program/Version Not Active**: 4-5-3-1-4 Lifecycle State/Version 연동(**승인된 Version 만 운영 권한 대상**).

## 상태
**계약 명세만 · 코드 구현 0**. 실 PDP/PEP 인프라 = **5-6**.
