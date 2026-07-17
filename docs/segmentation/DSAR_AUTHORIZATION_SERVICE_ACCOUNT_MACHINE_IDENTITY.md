# DSAR — Service Account·Machine Identity (§37)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 통합 정본: [CANONICAL_DSAR_AUTHORIZATION_FOUNDATION.md](CANONICAL_DSAR_AUTHORIZATION_FOUNDATION.md) · [CANONICAL_DSAR_AUTHORIZATION_POLICY_DECISION.md](CANONICAL_DSAR_AUTHORIZATION_POLICY_DECISION.md) · ADR: [ADR_DSAR_REBATE_PERMISSION_RBAC_ABAC_PBAC_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_PERMISSION_RBAC_ABAC_PBAC_FOUNDATION.md)
> **★이 도메인은 부재가 아니라 존재·분산 — 통합이지 신설이 아니다.** 실 구현=후속 승인 세션.

## 강제 항목 (16)
인간 User 와 **별도 Subject Type** · Owner · Purpose · Tenant Scope · **Environment Scope** · Provider Account Scope · Allowed Actions · Credential Reference · **Token Audience** · **Token Expiry** · **Rotation Policy** · Network Restriction · Workload Identity 지원 · **미사용 Account 비활성화** · **Human Login 금지** · **Impersonation 금지** · Audit Correlation

## 실측
- **Service Account / Machine Identity Subject Type 부재** → 신설.
- **인접 REAL** = `api_key`(**Token Expiry `expires_at` · is_active · use_count · key_hash SHA-256**·Db.php:942-955) → **API_CLIENT 정본으로 재사용**.
- **부재** = Owner · Purpose · Rotation Policy · Network Restriction · Workload Identity.

## 규칙
**Service Account 의 Human Login 가능 = Critical Gap**(§43) · **미사용 Account 자동 비활성화**(use_count/last_used_at 재사용 가능) · Impersonation 은 **5-4**.
