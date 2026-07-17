# DSAR — Custom Role (§9)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 통합 정본: [CANONICAL_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE.md](CANONICAL_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE.md) · ADR: [ADR_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE_GOVERNANCE.md](../architecture/ADR_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE_GOVERNANCE.md) · 요구 분모: [REQ_06A_4_5_3_1_5_2_ROLE_ORG_SCOPE.md](REQ_06A_4_5_3_1_5_2_ROLE_ORG_SCOPE.md)
> **★이 도메인은 부재가 아니라 존재·분산 — 통합이지 신설이 아니다.** 실 구현=고객 Rebate 도입 시 후속 승인 세션. 본 문서=**계약 명세**.

## 계약
custom_role_id·rebate_role_id·tenant_id·workspace_id·**based_on_standard_role**·custom role name·business purpose·requested permissions·**excluded permissions**·scope template·field access profile·financial threshold·assignment duration limit·external user support·created_by·approved_by·created_at·reviewed_at·expires_at·status·evidence.

## 🔴 Custom Role 이 우회할 수 없는 것 (8)
Tenant Isolation · **Explicit Deny** · Production Environment Policy · Credential Secret 제한 · Mandatory Field Masking · 고위험 SoD 정책(→5-4) · **시스템 Reserved Permission** · Platform Security Policy.

Static Lint: **Custom Role 의 Reserved Permission 사용 차단**(§49) · Runtime: `REBATE_CUSTOM_ROLE_RESTRICTED_PERMISSION`(§51).

## 실측
Custom Role **부재(grep 0)** — 현행은 고정 Enum 3계통. **고객사가 자기 조직 구조에 맞는 역할을 만들 수 없다.**

## 분류
**NOT_APPLICABLE → 신설**. ★**멀티테넌트 고객용 Governance 의 핵심**(§0: 각 구독 고객사가 자기 Tenant 내부에서 역할을 직접 운영).
