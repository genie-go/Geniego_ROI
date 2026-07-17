# DSAR — Field Access Profile (§14)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 통합 정본: [CANONICAL_DSAR_AUTHORIZATION_FOUNDATION.md](CANONICAL_DSAR_AUTHORIZATION_FOUNDATION.md) · [CANONICAL_DSAR_AUTHORIZATION_POLICY_DECISION.md](CANONICAL_DSAR_AUTHORIZATION_POLICY_DECISION.md) · ADR: [ADR_DSAR_REBATE_PERMISSION_RBAC_ABAC_PBAC_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_PERMISSION_RBAC_ABAC_PBAC_FOUNDATION.md)
> **★이 도메인은 부재가 아니라 존재·분산 — 통합이지 신설이 아니다.** 실 구현=후속 승인 세션.

## 대상 Field (22)
Customer Identity · Beneficiary Identity · Claimant Identity · Email · Phone · Address · **Tax Identifier Reference** · **Bank Destination Reference** · Payout Recipient · **Claim Evidence** · **Contract Commercial Terms** · **Funding Percentage** · **Funding Amount** · Accrual Amount · Liability Amount · Settlement Amount · **Payout Amount** · Fraud Reference · Internal Risk Score · **Credential Metadata** · Audit Actor · Security Incident Reference

## Access Level (8)
NONE · **MASKED** · **TOKENIZED_REFERENCE** · SUMMARY_ONLY · PARTIAL · FULL · EXPORT_RESTRICTED · APPROVAL_REQUIRED

## 실측 — CONSOLIDATION_REQUIRED
**현행 Field Masking 은 3+ 곳에 산재**(AttributionEngine · ChannelCreds · UserAuth 개별 구현) · **단일 Field Access Profile 부재** → **통합 필요**(중복 Masking Engine 신설 금지·§51).
REAL 인접 = channel_credential **AES-256-GCM at-rest**(267차 Crypto fail-closed) · ChannelCreds 마스킹.

## 규칙
- **Sensitive Field 기본 = MASKED 또는 TOKENIZED_REFERENCE**(§61).
- **Bank Destination / Tax Identifier / Credential = 원문 조회 권한 생성 금지** → TOKENIZED_REFERENCE 만.
- **Field-level Sensitive 정책 누락 = Lint 차단**(§44) · **Field Masking Policy ↔ 실 반환 데이터 Reconciliation**(§41 FIELD_MASKING_MISMATCH).
- 헌법 No-PII 정합 — 금액·PII 를 **함께** 보려면 Financial + PII Clearance 둘 다.
