# DSAR — Rebate Permission Registry (§12)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 통합 정본: [CANONICAL_DSAR_AUTHORIZATION_FOUNDATION.md](CANONICAL_DSAR_AUTHORIZATION_FOUNDATION.md) · [CANONICAL_DSAR_AUTHORIZATION_POLICY_DECISION.md](CANONICAL_DSAR_AUTHORIZATION_POLICY_DECISION.md) · ADR: [ADR_DSAR_REBATE_PERMISSION_RBAC_ABAC_PBAC_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_PERMISSION_RBAC_ABAC_PBAC_FOUNDATION.md)
> **★이 도메인은 부재가 아니라 존재·분산 — 통합이지 신설이 아니다.** 실 구현=후속 승인 세션.

## Permission Code 후보 (예시)
`REBATE_PROGRAM_READ` · `REBATE_PROGRAM_CREATE` · `REBATE_PROGRAM_UPDATE` · `REBATE_PROGRAM_ACTIVATE` · `REBATE_FUNDING_VIEW` · **`REBATE_FUNDING_MANAGE`** · `REBATE_CLAIM_EVIDENCE_READ` · **`REBATE_PAYOUT_APPROVE`** · **`REBATE_PAYOUT_EXECUTE`** · `REBATE_AUDIT_EXPORT` · **`REBATE_PROVIDER_CREDENTIAL_USE`**

## Permission 속성 필수 지정
| Permission | production_restricted | financial_approval_required | PII_clearance | MFA | field_access_profile |
|---|---|---|---|---|---|
| REBATE_PROGRAM_READ | N | N | N | N | 기본 |
| REBATE_PROGRAM_ACTIVATE | **Y** | N | N | **Y** | — |
| REBATE_FUNDING_MANAGE | **Y** | **Y**(Threshold 초과 시) | N | **Y** | Funding Amount |
| REBATE_CLAIM_EVIDENCE_READ | N | N | **Y** | 정책별 | Claim Evidence(MASKED 기본) |
| REBATE_PAYOUT_APPROVE | **Y** | **Y** | N | **Y** | Payout Amount |
| **REBATE_PAYOUT_EXECUTE** | **Y** | **Y** | N | **Y** | Bank Destination(TOKENIZED) |
| REBATE_AUDIT_EXPORT | **Y** | N | 정책별 | **Y** | Audit Actor · EXPORT_RESTRICTED |
| **REBATE_PROVIDER_CREDENTIAL_USE** | **Y** | N | N | **Y**(Step-up) | Credential Metadata 만 |

## ★규칙
**APPROVE 와 EXECUTE Permission 을 동일 Subject 에 결합 금지**(§43 Critical) · **Credential Secret Read Permission 생성 금지**(§44 Lint) · 전 Permission 에 **Tenant Scope 필수**(없으면 Lint 차단).
