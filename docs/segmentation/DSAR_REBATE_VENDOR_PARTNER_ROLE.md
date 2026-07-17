# DSAR — Vendor·Partner Role (§21)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 통합 정본: [CANONICAL_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE.md](CANONICAL_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE.md) · ADR: [ADR_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE_GOVERNANCE.md](../architecture/ADR_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE_GOVERNANCE.md) · 요구 분모: [REQ_06A_4_5_3_1_5_2_ROLE_ORG_SCOPE.md](REQ_06A_4_5_3_1_5_2_ROLE_ORG_SCOPE.md)
> **★이 도메인은 부재가 아니라 존재·분산 — 통합이지 신설이 아니다.** 실 구현=고객 Rebate 도입 시 후속 승인 세션. 본 문서=**계약 명세**.

## 계약 — 외부 조직 Role(7)
REBATE_VENDOR_VIEWER · REBATE_VENDOR_CLAIM_SUBMITTER · REBATE_VENDOR_CLAIM_REVIEWER · REBATE_PARTNER_VIEWER · REBATE_PARTNER_OPERATOR · REBATE_DISTRIBUTOR_CLAIMANT · REBATE_AUDIT_PARTNER.

## 🔴 외부 Role 기본 제한(9)
지정 Program 만 · 지정 Contract 만 · 지정 Legal Entity Relationship 만 · 제한된 Claim Evidence 만 · **내부 Risk·Fraud Signal 비공개** · **다른 Party Funding 정보 비공개** · Export 제한 · **짧은 Validity** · 정기 재검토.

## 실측 — 외부 사용자 기반 REAL
| 요소 | 실측 |
|---|---|
| **Partner 서브계정** | ✅ **REAL** — `PartnerPortal`(supplier/logistics/warehouse 서브계정) |
| **Vendor/Supplier** | ✅ **REAL** — `SupplyChain`(sc_suppliers·sc_lines·sc_stages ↔ `wms_suppliers` wms_id·tenant 격리) · `wms_supply_orders` |
| **Agency(외부 대행사)** | ✅ **REAL** — `AgencyPortal`(agency_client_link · **매 요청 approved 재검증 fail-closed** · 272차) |
| **DATA_SCOPES partner** | ✅ **REAL** — `TeamPermissions.php:41` |

## 🔴 AgencyPortal 이 좋은 선례다
**매 요청마다 approved 를 재검증하고 fail-closed** 한다(272차). 이는 §28의
**"동기화 지연 중 고위험 접근이 지속되지 않도록"** 요구를 **이미 만족하는 패턴**이다 → **확장 대상**.

## 분류
PartnerPortal·SupplyChain·AgencyPortal = **VALIDATED_LEGACY(재사용 강제)** · 외부 Role 카탈로그·제한 프로파일 = **NOT_APPLICABLE → 신설**.
