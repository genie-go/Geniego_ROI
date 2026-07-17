# DSAR — Data Classification Policy (§35·11종)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 통합 정본: [CANONICAL_DSAR_AUTHORIZATION_FOUNDATION.md](CANONICAL_DSAR_AUTHORIZATION_FOUNDATION.md) · [CANONICAL_DSAR_AUTHORIZATION_POLICY_DECISION.md](CANONICAL_DSAR_AUTHORIZATION_POLICY_DECISION.md) · ADR: [ADR_DSAR_REBATE_PERMISSION_RBAC_ABAC_PBAC_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_PERMISSION_RBAC_ABAC_PBAC_FOUNDATION.md)
> **★이 도메인은 부재가 아니라 존재·분산 — 통합이지 신설이 아니다.** 실 구현=후속 승인 세션.

## Classification (11)
PUBLIC · INTERNAL · CONFIDENTIAL · RESTRICTED · HIGHLY_RESTRICTED · **FINANCIAL** · **PII** · **SENSITIVE_PII** · CONTRACT_CONFIDENTIAL · SECURITY_SENSITIVE · **CREDENTIAL_REFERENCE**

## Policy
| Classification | 요구 |
|---|---|
| INTERNAL | Tenant Member 이상 |
| CONFIDENTIAL | Program Role + Scope |
| **FINANCIAL** | **Financial Clearance**(부재→신설) |
| **PII** | **PII Clearance + Purpose**(헌법 No-PII·목적 제한 정합) |
| **SENSITIVE_PII** | **Masking 기본** |
| **CREDENTIAL_REFERENCE** | **Metadata 만 조회** · Secret 원문 금지 |
| SECURITY_SENSITIVE | Security Role 필수 |

## ★규칙
**§4.4 Need-to-Know** — **Role 이 높다는 이유만으로 계약·PII·금융 데이터 조회 불가**. **금액과 PII 를 함께 보려면 Financial + PII Clearance 둘 다**. 미분류 Resource = **최고 민감도 취급**(fail-closed).
