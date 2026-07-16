# CANONICAL DSAR — Rebate Program Master Registry & Scope Foundation (Master·External Identity·Provider/Account Binding·Hierarchy·Scope)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-1 · 289차(2026-07-16) · **비파괴 설계 명세 — 코드변경 0**
> 정본 쌍: 본 문서(Master/Identity/Binding/Hierarchy/Scope Dimension) + [`CANONICAL_DSAR_REBATE_PROGRAM_SCOPE_GOVERNANCE.md`](CANONICAL_DSAR_REBATE_PROGRAM_SCOPE_GOVERNANCE.md)(Participant/Beneficiary/Claimant·Sponsor·SoT·Candidate·Reconciliation·Duplicate·Guard).
> ADR: [`../architecture/ADR_DSAR_REBATE_PROGRAM_MASTER_SCOPE_FOUNDATION.md`](../architecture/ADR_DSAR_REBATE_PROGRAM_MASTER_SCOPE_FOUNDATION.md).
> 선행: Monetary Reward Foundation(4-5-1-1~1-4)·Cashback Lifecycle(4-5-2-1~2-5)·Provider Inventory·Identity·Value.
> **범위**: Rebate 금액계산/Claim 승인/지급 아님 — **Program Master + Scope Foundation만**(후속 4-5-3-1-2~9 Type/Funding/Lifecycle/Permission/Coverage/Lint/Golden/Legacy). Type/Funding/Lifecycle 중복 구현 금지.

---

## 0. 실측 요약 — 현행 대비(실측 → Canonical) ★정직 최우선

| 프롬프트 요구 | 현행 실측(코드 근거) | Canonical 분류 |
|---|---|---|
| **Rebate Program (Vendor/Manufacturer/Volume/Scan-back/Bill-back/MDF/Co-op…)** | ❌ **부재(grep 0)** — `rebate/scan-back/ship-and-debit/bill-back/MDF/co-op` 전무 | **NOT_APPLICABLE → 신설(전방호환)** |
| **Provider Registry / Account Binding / Source of Truth** | ✅ **REAL** — `ChannelRegistry`(channel_registry·플랫폼 provider 카탈로그)·`data_source`(source_type/account/**source_priority**=SoT) | **재사용(§6.10 Provider Registry·SoT priority)** |
| **Vendor / Supplier / Distributor Scope** | ✅ **REAL** — `SupplyChain`(sc_suppliers·sc_lines·sc_stages↔wms_suppliers wms_id·tenant 격리)·`wms_supply_orders`·`PartnerPortal`(supplier/logistics/warehouse 서브계정) | **재사용**(Vendor/Supplier/Distributor scope) |
| **Merchant / Seller Scope** | ✅ **REAL** — channel_credential seller_id·kr_settlement_line·ChannelRegistry | **재사용** |
| **Product / SKU / Category Scope** | ✅ **REAL** — `Catalog`(catalog_listing/catalog_category)·`channel_products`(sku/channel_product_id·Wms)·`Mapping`(SKU 매핑)·kr_settlement_line(sku) | **재사용** |
| **Contract Scope** | △ `ChannelContract`(채널 필수필드 선언적 계약)·AgencyPortal(agency_client_link) | **KEEP_SEPARATE**(채널 계약·formal rebate contract registry 아님·Reference 연결) |
| **Tenant Scope** | ✅ **REAL** — auth_tenant(row-level) | **재사용** · Workspace/Brand/Store registry = 부재(NOT_APPLICABLE) |
| **Legal Entity Scope** | ❌ **부재**(Part 4-5-1-1·tenant_id row-level만) | **NOT_APPLICABLE → 신설** |
| **Currency / Environment Scope** | ✅ fxToKrw(Currency)·GENIE_ENV(prod/demo)·IS_DEMO(Environment) | **재사용** |
| **Monetary Reward Program 연결** | ✅ Canonical(4-5-1-1/1-2) | **연결(monetary_reward_program_id)** |
| **Rebate Master/External Identity/Binding/Hierarchy/Participant·Beneficiary·Claimant Scope/Sponsor/SoT(rebate)/Candidate/Reconciliation/Duplicate** | ❌ 부재 | **NOT_APPLICABLE → 신설** |

**★결론(정직)**: **Rebate Program 엔진은 부재(NOT_APPLICABLE)**. 그러나 **Scope registry 실 인프라가 풍부**: Provider(ChannelRegistry·data_source SoT priority)·Vendor/Supplier(SupplyChain sc_suppliers↔wms_suppliers·PartnerPortal)·Merchant/Seller(channel_credential·kr_settlement_line)·Product/SKU/Category(Catalog·channel_products·Mapping)·Tenant(auth_tenant)·Currency(fxToKrw)·Environment(GENIE_ENV). **★핵심 정직: Rebate≠Cashback(계약/누적실적/Claim/검증/정산 조건 사후 확정·B2B vendor/manufacturer/distributor)→Cashback Program Registry 이름만 바꿔 복제 금지(§4)**. **기존 Scope Registry 재사용(중복 신설 금지·§6.10)**·Legal Entity/Workspace/Brand/Store registry 부재(신설). SupplyChain/PartnerPortal/ChannelContract/Catalog=KEEP_SEPARATE(공급망/채널 계약·rebate 아님·Reference 연결). 지어내기·NO_DATA/오탐 금지·본 Master=멀티테넌트 고객용 미래 rebate 전방호환 계약.

---

## 1. Canonical Entity (17) — §7 (이번 블록)

REBATE_PROGRAM_DISCOVERY_PROFILE·REBATE_PROGRAM·EXTERNAL_IDENTITY·PROVIDER_BINDING·ACCOUNT_BINDING·SCOPE·SCOPE_RELATIONSHIP·PARTICIPANT_SCOPE·BENEFICIARY_SCOPE·CLAIMANT_SCOPE·SPONSOR_REFERENCE·SOURCE_OF_TRUTH·RELATIONSHIP·CANDIDATE·RECONCILIATION·EVIDENCE·AUDIT_EVENT.
**후속 블록(4-5-3-1-2~9)**: PROGRAM_TYPE·BUSINESS_MODEL·FUNDING_MODEL·PROGRAM_VERSION·APPROVAL·COVERAGE·GAP·CERTIFICATION(**이번 블록 중복 구현 금지·Reference Field만 준비**).
**현행 실체**: Provider Binding(ChannelRegistry)·Account Binding(channel_credential/SupplyChain)·Scope(vendor/product/seller/tenant 재사용)·SoT(data_source priority) = REAL 재사용. Master/Identity/Hierarchy(rebate) = **신설**.

## 2. Discovery Profile (§8) · Program Master (§9)

- **Profile(§8)**: rebate_program_discovery_profile_id·provider/account·tenant·workspace·environment·**supported program objects·external program id/hierarchy/parent-child/participant/beneficiary/claimant/sponsor/merchant/vendor/distributor/product scope/contract scope/geography/currency model·historical/archived/deleted program support·API/export/webhook/manual portal search support·source of truth**·last_verified_at·version·status·owner·evidence. → 부재·신설.
- **Master(§9)**: rebate_program_id·**monetary_reward_program_id**·provider/account·external_program_id/key·**parent/root_rebate_program_id**·program_name·internal_name·customer_facing_name·program_code·description reference·**preliminary program classification·preliminary business model reference**·tenant·workspace·primary_brand/legal_entity/region/country·default_currency·environment·**source_of_truth_reference·sponsor_reference**·current_status·valid_from/to·created/updated/archived/deleted_at·last_discovered/verified_at·owner·version/evidence/audit reference. **★preliminary classification=Discovery 분류값·최종 Type=4-5-3-1-2**. **★§4 Rebate≠Cashback·§6.1 Program≠Rule(Definition/Rule/Tier/Threshold/Calculation/Eligibility/Claim/Accrual/Approval/Settlement/Payment=후속)**.

## 3. Hierarchy (§10) · External Identity (§11)

- **Hierarchy(§10)**: Master/Regional/Country/Brand/Channel/Merchant/Distributor/Product/Campaign/Contract Program·Sub-program·Exception Program. 관계(16): PARENT/CHILD_OF·REGIONAL/COUNTRY/BRAND/CHANNEL/PRODUCT/CONTRACT_VARIANT_OF·SUCCESSOR/PREDECESSOR_OF·REPLACES/REPLACED_BY·DERIVED_FROM·OVERRIDES·SUPPLEMENTS·EXCEPTION_TO. **★부모 Scope 자식에 무조건 복사 금지·상속/Override 명시 기록**.
- **External Identity(§11)**: rebate_program_external_identity_id·program·provider/account·**source_system·external_program_id/code·external_contract_id/campaign_id/agreement_id·external_object_type·region·environment·valid_from/to·primary**·status·evidence. **★§6.2 Program 이름만으로 동일 판단 금지·§6.3 External ID Tenant 공유 금지(Source System+Account Binding 복합키)**.

## 4. Provider Binding (§12) · Account Binding (§13)

- **Provider Binding(§12)**: provider_binding_id·program·provider/account·**provider program/organization/merchant/partner id·API object type·endpoint reference·region endpoint·environment·credential binding reference·permission profile reference·source of truth role**·valid from/to·status·evidence. SoT Role(9): PRIMARY·AUTHORITATIVE_SECONDARY·REPLICA·ANALYTICS/WAREHOUSE_COPY·LEGACY·MIGRATING·MANUAL_REFERENCE·UNKNOWN. **★동일 Program 2+ PRIMARY=Gap Critical 후보 표시**. → **현행**: ChannelRegistry(provider)·channel_credential(credential binding)·data_source(SoT priority) 재사용.
- **Account Binding(§13, 17 Type)**: Provider/Organization/Merchant/Seller/Vendor/Supplier/Distributor/Dealer/Reseller/Partner/Customer/Rebate/Settlement/Payout/ERP Company/Accounting Entity/Clearing Account. 필드: account_binding_id·program·**account_type·canonical_account_id·external_account_id·owner identity·tenant·legal entity·region·country·currency·environment·binding role**·valid from/to·status·evidence. → SupplyChain(supplier account)·channel_credential(provider/merchant)·kr_settlement(seller) 재사용·나머지 신설.

## 5. Program Scope (§14) · Scope Relationship (§15) ★Canonical Reference

- **Scope(§14)**: rebate_program_scope_id·program·**scope_dimension·inclusion mode·inheritance mode·default behavior·effective from/to·timezone**·status·version reference·evidence. Dimension(31): TENANT·WORKSPACE·BRAND·STORE·MERCHANT·SELLER·VENDOR·SUPPLIER·DISTRIBUTOR·DEALER·RESELLER·PARTNER·LEGAL_ENTITY·PRODUCT·SKU·CATEGORY·SERVICE·SUBSCRIPTION·CONTRACT·SALES_CHANNEL·ORDER_CHANNEL·MARKETPLACE·REGION·COUNTRY·CURRENCY·CUSTOMER_SEGMENT·PARTICIPANT/BENEFICIARY/CLAIMANT_TYPE·CUSTOM. Inclusion(7): INCLUDE_ONLY·INCLUDE_ALL_EXCEPT·EXCLUDE_ONLY·INHERIT·OVERRIDE·UNRESTRICTED·UNKNOWN. Inheritance(6): NONE·PARENT_INHERITED·PARENT_WITH_OVERRIDE·CONTRACT/PROVIDER_INHERITED·CUSTOM.
- **Scope Relationship(§15)**: scope_relationship_id·scope·**scope_dimension·canonical_entity_type/id·external_entity_id·relationship type·inclusion/exclusion·priority·inherited·inherited from program·override·valid from/to**·status·evidence. Relationship(14): APPLIES_TO·EXCLUDES·LIMITED_TO·SPONSORED_BY·OPERATED_BY·SOLD_BY·PURCHASED_FROM·DISTRIBUTED_BY·CLAIMED_THROUGH·SETTLED_THROUGH·PAID_THROUGH·REPORTED_BY·FULFILLED_BY·ACCOUNTED_BY.
**★§6.7 Scope=문자열 배열 금지(Canonical Entity Reference+Validity Relationship)·§6.8 현재 Scope만 보존 금지(valid_from/to/recorded_at·상세 Version=4-5-3-1-4)**. → **현행 Canonical Entity 재사용**: TENANT(auth_tenant)·VENDOR/SUPPLIER(SupplyChain)·MERCHANT/SELLER(channel_credential)·PRODUCT/SKU(Catalog/channel_products)·CATEGORY(catalog_category)·CURRENCY(fxToKrw)·CHANNEL(channel_registry). LEGAL_ENTITY/WORKSPACE/BRAND/STORE=신설(부재).

## 6. Scope 도메인 (§16~§27) — 현행 재사용 매핑

Tenant/Workspace(§16·auth_tenant REAL·Workspace 신설)·Brand/Store(§17·신설·Program Owner/Eligible/Excluded/Selling/Manufacturer/Private Label Brand 구분)·**Merchant/Seller(§18·channel_credential seller_id·§6.4 Merchant≠Seller 자동 동일시 금지)**·**Vendor/Supplier/Distributor(§19·SupplyChain sc_suppliers·§6.4 Vendor≠Supplier·동일 조직 다중 역할=Organization과 Role 분리)**·**Product/SKU(§20·Catalog/channel_products·Product Family 적용+특정 SKU 제외 지원)**·Category(§21·catalog_category·Taxonomy Version·현재 Category로 과거 Scope 덮어쓰기 금지)·Service/Subscription(§22·물리상품 가정 금지·SaaS Plan/Renewal/Usage/Membership)·Contract(§23·ChannelContract 인접·**Tokenized/Authorized Reference만·계약 원문 복제 금지**)·Channel(§24·channel_registry·Sales Channel≠Order Channel)·Geography(§25·GLOBAL/MULTI_REGION/COUNTRY_SPECIFIC/CROSS_BORDER)·**Currency(§26·fxToKrw 재사용·Program/Purchase/Invoice/Claim/Settlement/Credit Memo/Payout/Accounting/Budget Currency·상세 FX=Monetary Value 재사용)**·Environment(§27·GENIE_ENV·**Production에 Test Account/Sandbox Credential/Demo Customer/Synthetic 연결 금지**).

## 7. Program Master Matrix (§49) · Scope Matrix (§50) — 현행

| Program | Provider | External ID | Tenant | Legal Entity | Sponsor | Environment | Status | Source of Truth | Evidence |
|---|---|---|---|---|---|---|---|---|---|
| (Rebate Program) | — | — | — | — | — | — | — | — | **NOT_APPLICABLE(신설)** |
| 인접(재사용): 채널 | ChannelRegistry | channel_credential | auth_tenant | N/A(부재) | N/A | GENIE_ENV | is_active | data_source priority | channel_credential |

| Program | Brand | Store | Merchant | Seller | Vendor | Product·SKU | Contract | Country | Currency |
|---|---|---|---|---|---|---|---|---|---|
| (Rebate Scope) | — | — | — | — | — | — | — | — | — |
| 인접(재사용) | N/A(부재) | N/A(부재) | channel_credential | seller_id | SupplyChain sc_suppliers | Catalog/channel_products | ChannelContract(Ref) | kr country | fxToKrw |
