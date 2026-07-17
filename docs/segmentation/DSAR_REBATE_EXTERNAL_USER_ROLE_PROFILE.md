# DSAR — External User Role Profile (§40)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 통합 정본: [CANONICAL_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE.md](CANONICAL_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE.md) · ADR: [ADR_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE_GOVERNANCE.md](../architecture/ADR_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE_GOVERNANCE.md) · 요구 분모: [REQ_06A_4_5_3_1_5_2_ROLE_ORG_SCOPE.md](REQ_06A_4_5_3_1_5_2_ROLE_ORG_SCOPE.md)
> **★이 도메인은 부재가 아니라 존재·분산 — 통합이지 신설이 아니다.** 실 구현=고객 Rebate 도입 시 후속 승인 세션. 본 문서=**계약 명세**.

## External User Type (10)
VENDOR_USER · PARTNER_USER · MERCHANT_USER · DISTRIBUTOR_USER · DEALER_USER · RESELLER_USER · CONTRACTOR · EXTERNAL_AUDITOR · AGENCY_USER · AUTHORIZED_AGENT.

## 계약
external user type·organization·tenant relationship·contract reference·**allowed role catalog**·**prohibited roles**·**maximum assignment duration**·permitted programs/contracts/countries·field access profile·**export limit**·authentication requirement·**MFA requirement**·sponsor required·periodic review frequency·deprovisioning trigger·status·evidence.

## 원칙 §4.8
**Vendor·Partner·Contractor 사용자는 내부 Employee 보다 좁은 Scope 와 짧은 Validity 를 기본값으로 사용한다.**

## 🔴 실측 — 외부 사용자 체계는 REAL
| Type | 실측 |
|---|---|
| **AGENCY_USER** | ✅ **REAL** — `AgencyPortal`(agency_client_link · **매 요청 approved 재검증 fail-closed** · 272차) · `/api/agency/*` |
| **VENDOR_USER·PARTNER_USER** | ✅ **REAL** — `PartnerPortal`(supplier/logistics/warehouse 서브계정) · `SupplyChain`(sc_suppliers ↔ wms_suppliers) |
| **MERCHANT_USER** | △ `channel_credential.seller_id` 근사(사용자 계정 아님) |
| CONTRACTOR · EXTERNAL_AUDITOR · DISTRIBUTOR · DEALER · RESELLER · AUTHORIZED_AGENT | ❌ 부재 |

## 🔴 AgencyPortal 의 fail-closed 가 정본이다
**매 요청 approved 재검증**은 §28의 **"동기화 지연 중 고위험 접근 지속 방지"** 요구를
**이미 만족**한다. **외부 Role 전체의 참조 구현**으로 삼는다.

## 분류
AgencyPortal·PartnerPortal·SupplyChain = **VALIDATED_LEGACY(재사용 강제)** · 제한 프로파일(prohibited roles·export limit·MFA·sponsor) = **NOT_APPLICABLE → 신설**.
