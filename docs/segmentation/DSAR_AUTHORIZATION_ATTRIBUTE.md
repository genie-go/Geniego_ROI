# DSAR — Authorization Attribute (§19)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 통합 정본: [CANONICAL_DSAR_AUTHORIZATION_FOUNDATION.md](CANONICAL_DSAR_AUTHORIZATION_FOUNDATION.md) · [CANONICAL_DSAR_AUTHORIZATION_POLICY_DECISION.md](CANONICAL_DSAR_AUTHORIZATION_POLICY_DECISION.md) · ADR: [ADR_DSAR_REBATE_PERMISSION_RBAC_ABAC_PBAC_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_PERMISSION_RBAC_ABAC_PBAC_FOUNDATION.md)
> **★이 도메인은 부재가 아니라 존재·분산 — 통합이지 신설이 아니다.** 실 구현=후속 승인 세션.

## Subject Attribute (18)
subject_type · **tenant_id**(REAL) · workspace_ids · organization_id · team_id · department_id · **legal_entity_ids**(부재) · country · employment_status · **clearance_level**(부재) · **financial_clearance**(부재) · **PII_clearance**(부재) · **authentication_assurance**(부재) · **MFA_state**(REAL·mfa_policy) · **risk_score**(부재) · **session_age**(부재) · **device_trust**(부재) · **network_zone**(부재)

## Resource Attribute (19)
tenant_id(REAL) · workspace_id · brand_id · merchant_id · vendor_id · **legal_entity_id**(부재) · country · region · **environment**(GENIE_ENV·데이터 격리용) · program_status · program_version_status · **funding_amount** · **payout_amount** · data_classification · financial_sensitivity · PII_sensitivity · provider_account · contract_type

## Context Attribute (12)
request_time · request_channel · source_ip_zone · device_posture · authentication_time · risk_level · incident_state · change_window · approval_state · emergency_state · **requested_amount** · **export_volume** — **전부 부재(신설)**

## 실측 요약
**REAL** = tenant_id · team_role · plan(PlanPolicy::RANK) · MFA_state. **부재** = clearance 3종 · authentication_assurance · risk_score · session_age · device_trust · network_zone · legal_entity · Context 전체.

## 규칙
**속성 부재 시 기본 DENY**(§24 null_behavior·fail-closed) — **현행 반례**: `team_role` 미설정 시 **owner 로 fail-open**(AdminMenu.php:52-54) = 본 계약과 상충 → **5-2 판정**(MIGRATION_REQUIRED 후보·PM 재증명 전 P0 단정 금지).
