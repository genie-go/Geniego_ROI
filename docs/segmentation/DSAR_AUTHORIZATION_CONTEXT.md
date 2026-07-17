# DSAR — Authorization Context (§27)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 통합 정본: [CANONICAL_DSAR_AUTHORIZATION_FOUNDATION.md](CANONICAL_DSAR_AUTHORIZATION_FOUNDATION.md) · [CANONICAL_DSAR_AUTHORIZATION_POLICY_DECISION.md](CANONICAL_DSAR_AUTHORIZATION_POLICY_DECISION.md) · ADR: [ADR_DSAR_REBATE_PERMISSION_RBAC_ABAC_PBAC_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_PERMISSION_RBAC_ABAC_PBAC_FOUNDATION.md)
> **★이 도메인은 부재가 아니라 존재·분산 — 통합이지 신설이 아니다.** 실 구현=후속 승인 세션.

## Entity `AUTHORIZATION_CONTEXT`
authorization_context_id · **request_id · session_id · correlation_id** · tenant_id · workspace_id · environment · request_channel · source_network_zone · device_trust · **authentication_assurance · MFA_state** · current_risk_level · incident_state · request_time · timezone · **requested_financial_amount · export_row_estimate** · approval_reference · emergency_reference · feature_flag_reference · evidence

## 실측
**대부분 부재(신설)**. REAL = session(genie_token) · **MFA_state**(mfa_policy) · tenant/environment(GENIE_ENV) · timezone(DEFAULT_TZ 'Asia/Seoul').
부재 = device_trust · network_zone · risk_level · incident_state · **requested_financial_amount** · export_row_estimate · feature_flag(Registry 부재·1-4 실측).

## 규칙
**Context 없는 고위험 Decision 금지** · Production 고위험 Action 은 **MFA + 강화 Assurance + 신뢰 Device + 낮은 Risk + Audit Logging 요구**(§36) · **feature_flag_reference 는 Registry 부재 → Reference 만·허구 배선 금지**.
