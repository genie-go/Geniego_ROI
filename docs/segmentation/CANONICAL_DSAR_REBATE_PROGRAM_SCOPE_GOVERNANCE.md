# CANONICAL DSAR — Rebate Program Scope Governance (Participant·Beneficiary·Claimant·Sponsor·Source of Truth·Candidate·Reconciliation·Duplicate·Guard)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-1 · 289차(2026-07-16) · **비파괴 설계 명세 — 코드변경 0**
> 정본 쌍: [`CANONICAL_DSAR_REBATE_PROGRAM_MASTER_REGISTRY.md`](CANONICAL_DSAR_REBATE_PROGRAM_MASTER_REGISTRY.md)(Master/Identity/Binding/Scope Dimension) + 본 문서(Governance).
> ADR: [`../architecture/ADR_DSAR_REBATE_PROGRAM_MASTER_SCOPE_FOUNDATION.md`](../architecture/ADR_DSAR_REBATE_PROGRAM_MASTER_SCOPE_FOUNDATION.md).

---

## 1. Participant (§28) · Beneficiary (§29) · Claimant (§30) Scope ★역할 분리

- **Participant Scope(§28)**: participant_scope_id·program·**participant type·canonical identity requirement·organization/account/contract/verification requirement·country restriction·inclusion/exclusion·validity**·status·evidence. Type(19): CONSUMER·CUSTOMER·BUSINESS_CUSTOMER·LOYALTY_MEMBER·PURCHASER·BUYER_ORGANIZATION·SELLER·VENDOR·SUPPLIER·DISTRIBUTOR·DEALER·RESELLER·PARTNER·EMPLOYEE·SALES_REPRESENTATIVE·AGENCY·ORGANIZATION·OTHER.
- **Beneficiary Scope(§29)**: beneficiary_scope_id·program·**beneficiary type·recipient relationship/account ownership/payout recipient/tax subject/legal entity requirement·country·currency support·inclusion/exclusion·validity**·status·evidence. Type(14): END_CONSUMER·CUSTOMER·BUSINESS_CUSTOMER·DISTRIBUTOR·DEALER·RESELLER·SELLER·VENDOR·PARTNER·EMPLOYEE·ORGANIZATION·LEGAL_ENTITY·SHARED_BENEFICIARY·OTHER.
- **Claimant Scope(§30)**: claimant_scope_id·program·**claimant type·beneficiary relationship/authorization/contract/proof requirement·portal/API channel·geographic scope·valid from/to**·status·evidence. Type(15): CONSUMER·CUSTOMER·MERCHANT·SELLER·DEALER·DISTRIBUTOR·RESELLER·VENDOR·PARTNER·EMPLOYEE·AUTHORIZED_AGENT·ORGANIZATION_ADMIN·API_CLIENT·INTERNAL_OPERATOR·OTHER.
**★§6.4 Customer Rebate≠B2B Rebate·§6.5 Beneficiary≠Claimant(구매자=소비자·Claim 제출=판매점·비용부담=제조사·지급대상=유통사·최종 수혜=소비자)**. **현행**: Participant/Beneficiary/Claimant Scope 부재·신설(Part 4-5-1-3 Monetary Identity·Referral referrer/referee·PartnerPortal 역할 재사용·Claim 상세 Lifecycle=후속).

## 2. Sponsor Reference (§31) · Source of Truth (§32) · 상태 (§33)

- **Sponsor(§31)**: sponsor_reference_id·program·**sponsor type·canonical organization·legal entity·provider account·contract reference·primary sponsor·operational owner·preliminary funding responsibility·validity**·status·evidence. Sponsor Type: Manufacturer·Brand·Merchant·Vendor·Supplier·Distributor·Marketplace·Platform·Partner·Legal Entity·Campaign Budget·Multiple Sponsors. **★§6.6 Sponsor≠Funding Party≠Settlement Party≠Payout Party(이번 블록=Sponsor Reference+연결지점만·상세 Funding=4-5-3-1-3)**.
- **Source of Truth(§32)**: source_of_truth_id·program·**domain·source system·provider account·source role·authoritative field set·effective from/to·last verified·confidence**·status·evidence. Domain(14): Program Master/Name/Status/Scope/Sponsor/Contract·Product/Participant/Beneficiary/Claimant/Country/Currency Scope·Historical/Archived/Deleted Program. **★동일 Domain 다중 Primary=숨기지 말고 Conflict 상태 기록**. → data_source.source_priority 재사용.
- **상태(§33, 20)**: DISCOVERED·REGISTERED·DRAFT·REVIEW_PENDING·ACTIVE·ACTIVE_WITH_WARNINGS·SCHEDULED·PAUSED·SUSPENDED·EXPIRED·TERMINATED·SUPERSEDED·MIGRATING·DEPRECATED·ARCHIVED·DELETED·BLOCKED·UNVERIFIED·TEST_ONLY·UNKNOWN. **상세 Lifecycle 전이=4-5-3-1-4**.

## 3. Relationship Graph (§34) · Candidate (§35·§36)

**Graph(§34)**: Monetary Reward Program → Rebate Program → {Provider·Provider Account·Tenant·Workspace·Brand·Store·Merchant·Seller·Vendor·Supplier·Distributor·Partner·Legal Entity·Product·SKU·Category·Service·Subscription·Contract·Sales Channel·Region·Country·Currency·Participant/Beneficiary/Claimant Scope·Sponsor·Source of Truth} · Parent→Child · Previous→Successor.
**Candidate(§35)**: candidate_id·request/discovery_task id·program·external identity·provider/account·source system·tenant·workspace·brand·stores·**merchants·sellers·vendors·suppliers·distributors·partners·legal entity·products·SKUs·categories·services·subscription plans·contracts·channels·regions·countries·currencies·participant/beneficiary/claimant scope·sponsor·environment·current status·source of truth·historical validity·duplicate group reference·confidence·manual review requirement**·evidence. Match(§36, 21): EXACT_PROGRAM_ID/PROVIDER_PROGRAM/CONTRACT_PROGRAM_MATCH·STRONG_PROGRAM/SCOPE_MATCH·PARENT/CHILD/SUCCESSOR/LEGACY_PROGRAM_MATCH·MULTIPLE_PROGRAM_MATCH·WRONG_PROVIDER_ACCOUNT/TENANT/BRAND/LEGAL_ENTITY/ENVIRONMENT·SCOPE/SOURCE_CONFLICT·OUT_OF_SCOPE·MANUAL_REVIEW·BLOCKED·UNKNOWN.

## 4. Reconciliation (§37·§38) · Duplicate (§40)

- **Reconciliation(§37)**: Provider Program↔Internal·Provider Account↔Tenant·Program Legal Entity↔Account Legal Entity·Brand Scope↔Store Brand·**Merchant Scope↔Seller Scope·Vendor Scope↔Contract Party**·Product Scope↔SKU Scope·Category↔Product Taxonomy·Country↔Legal Entity Country·Currency↔Country/Provider Support·Environment↔Provider Account Environment·**Participant Scope↔Beneficiary Scope·Claimant Scope↔Authorization·Sponsor↔Contract Party**·Program Status↔Source Status·Source of Truth↔Warehouse Copy·Historical↔Current·Parent Scope↔Child Scope. 필드: reconciliation_id·program·**comparison type·source/canonical value reference·result·difference summary·severity·detected/resolved_at·resolution**·evidence. 상태(§38, 24): MATCH·PROVIDER_ACCOUNT/TENANT/WORKSPACE/BRAND/STORE/MERCHANT_SELLER/VENDOR_CONTRACT/PRODUCT_SKU/CATEGORY_TAXONOMY/LEGAL_ENTITY/COUNTRY/CURRENCY/ENVIRONMENT/PARTICIPANT_SCOPE/BENEFICIARY_SCOPE/CLAIMANT_SCOPE/SPONSOR/STATUS_MISMATCH·SOURCE_OF_TRUTH_CONFLICT·PARENT_CHILD_SCOPE_CONFLICT·HISTORICAL_MAPPING_MISMATCH·MANUAL_REVIEW·BLOCKED·UNKNOWN.
- **Duplicate(§40)**: Key 조합 — Provider+Account+External Program ID·Tenant+Program Code·Legal Entity+Contract·Sponsor+Name+Period·Vendor+Product Scope+Period·Merchant+SKU+Country+Currency·Parent+Regional Variant·Source System+Program Key·Name+Scope Hash·Contract+Classification·Historical Predecessor/Successor. **★Duplicate 즉시 Merge/삭제 금지→duplicate group·candidate programs·proposed winner·scope/contract/provider/historical difference·merge risk·migration/manual review requirement·evidence 기록**. → 현행 정본: pg/coupon UNIQUE·OrderHub order_id 멱등 패턴 계승.

## 5. 기존 구현 분류 (§39) · Evidence (§41) · Audit (§42)

| 구현 | 분류 | 근거 |
|---|---|---|
| `ChannelRegistry`(channel_registry)·`data_source`(source_priority) | **재사용(Provider Registry·SoT)** | 플랫폼 provider 카탈로그·source 우선순위. Rebate Provider Binding·SoT 재사용 |
| `SupplyChain`(sc_suppliers↔wms_suppliers)·`PartnerPortal` | **재사용·KEEP_SEPARATE_WITH_REASON** | Vendor/Supplier/Distributor scope 실 인프라·공급망 가시성(rebate 아님·Scope Reference 재사용) |
| channel_credential(seller_id)·kr_settlement_line | **재사용** | Merchant/Seller scope·Account Binding |
| `Catalog`/`channel_products`/`Mapping`(catalog_category) | **재사용** | Product/SKU/Category scope |
| `ChannelContract` | **KEEP_SEPARATE_WITH_REASON** | 채널 필수필드 선언적 계약(rebate contract registry 아님·Tokenized Reference 연결) |
| auth_tenant·fxToKrw·GENIE_ENV | **재사용** | Tenant/Currency/Environment scope |
| Rebate Program Master/External Identity/Binding(rebate)/Scope(rebate)/Participant·Beneficiary·Claimant Scope/Sponsor/SoT(rebate)/Hierarchy/Candidate/Reconciliation·Legal Entity/Workspace/Brand/Store registry | **UNVERIFIED → NOT_APPLICABLE** | 부재(grep 0)·신설 |

**Evidence(§41)**: evidence_id·request/discovery_task id·program·provider/account·source system·external object type/id·source role·account scope·tenant·legal entity·environment·API/export/webhook/database reference·schema version·source/discovered/effective timestamp·result hash·lineage·confidence·data classification·retention/audit reference. **★Credential Secret/금융계좌/Tax Identifier/계약 원문/불필요 PII/Claim 증빙 원문 저장 금지**.
**Audit(§42, 19)**: PROGRAM_DISCOVERED/REGISTERED/UPDATED·SCOPE_ADDED/REMOVED/EXCLUDED·PROVIDER/ACCOUNT_BOUND·SPONSOR_LINKED·SOURCE_CHANGED·PARENT/SUCCESSOR_LINKED·ARCHIVED/DELETED/RESTORED·DUPLICATE_DETECTED·RECONCILIATION_FAILED·BLOCKED·MANUAL_REVIEW_REQUESTED.

## 6. Error (§43) · Warning (§44)

**Error(23)**: REBATE_PROGRAM_NOT_FOUND·PROVIDER/ACCOUNT_BINDING_MISSING·**TENANT/WORKSPACE_SCOPE_MISSING·LEGAL_ENTITY_MISSING**·BRAND_SCOPE_MISSING·**MERCHANT/VENDOR_SCOPE_MISMATCH**·PRODUCT/CONTRACT/COUNTRY/CURRENCY_SCOPE_MISSING·**ENVIRONMENT_MISMATCH**·PARTICIPANT/BENEFICIARY/CLAIMANT_SCOPE_MISSING·SPONSOR_UNRESOLVED·SOURCE_OF_TRUTH_UNKNOWN·**MULTIPLE_PRIMARY_SOURCE·SCOPE_CONFLICT·DUPLICATE_RISK·CROSS_TENANT_RISK**·RUNTIME_BLOCKED.
**Warning(15)**: PARTIAL_SCOPE·HISTORICAL_SCOPE·ARCHIVED/DELETED_SOURCE·PROVIDER·ACCOUNT·LEGAL_ENTITY·PRODUCT_SCOPE·CONTRACT·COUNTRY·CURRENCY·SPONSOR·SOURCE_CONFLICT·DUPLICATE_WARNING·MANUAL_REVIEW_REQUIRED.

## 7. 최소 Static Lint (§45) · Runtime Guard (§46)

**Lint(§45, 이번 블록 최소·전체=4-5-3-1-7)**: **Tenant Scope 없는 Program·Provider Account Binding 없는 외부 Program·Environment 없는 Program·Production+Sandbox Account 연결·Legal Entity 없는 Settlement 가능 Program·Currency Scope 없는 Monetary Program·Program 이름만 Deduplication·Beneficiary↔Claimant 자동 동일시·Merchant↔Seller 자동 동일시·Vendor↔Supplier 자동 동일시·Product Scope 문자열만 저장·Contract 원문 복제·다중 Primary Source 숨김·Evidence 없는 Registration·기존 Canonical Registry 중복 생성**.
**Guard(§46, 이번 블록 최소·Enforcement Hook)**: Wrong Provider Account·**Cross-Tenant Program**·Wrong Workspace/Brand/Store/Merchant/Seller/Vendor/Legal Entity·**Environment Mismatch**·Unsupported Country/Currency·Program Scope Conflict·Participant/Beneficiary Out of Scope·**Claimant Unauthorized·Multiple Primary Source·Duplicate Program Ambiguity**·Critical Mapping Drift·Kill Switch.
**현행 실증**: auth_tenant(Cross-Tenant 차단)·GENIE_ENV 물리분리(Production/Sandbox)·data_source priority(Multiple Primary)·pg/coupon UNIQUE·OrderHub order_id 멱등(Duplicate) 재사용.

## 8. 기능 후퇴 방지 · 검증 게이트 (§53) · 영구 규칙

**후퇴 방지**: ChannelRegistry·data_source·SupplyChain·PartnerPortal·channel_credential·Catalog·channel_products·ChannelContract·`/v426/channels`·`/api/catalog/*`·Existing Rebate Admin/API/ERP/Provider Connector/Report/Warehouse 기능 보존(회귀 0).
**게이트(§53)**: 모든 Program 후보 조사·Master↔Monetary Reward Program 연결·External Identity↔Provider Account·Tenant/Workspace Scope 검증·Brand/Store Scope·**Merchant≠Seller·Vendor/Supplier/Distributor 역할 분리**·Legal Entity·Product/SKU/Category·Service/Subscription·Contract Reference·Sales≠Order Channel·Region/Country·**Monetary Program Currency Scope**·Production/Sandbox/Test 분리·**Participant/Beneficiary/Claimant 분리**·Sponsor Reference·Domain별 SoT·**다중 Primary Conflict 표시**·Parent/Child/Successor 보존·Scope Validity·Candidate/Reconciliation·**Duplicate 후보 삭제 없이 Group화**·Evidence/Audit·**기존 Registry 중복 없음**·회귀 0·ADR/PM/Repeat Problem/Agent History·다음 Type Registry 실행 가능.
**영구 규칙(§56)**: 신규 Rebate Program 도입 전 **기존 Scope Registry(ChannelRegistry/SupplyChain/Catalog/channel_products/channel_credential/auth_tenant/fxToKrw) 재사용(중복 신설 금지)** · **Rebate≠Cashback(Cashback Registry 이름만 복제 금지)·Program≠Rule(이번 블록=Master+Scope만·Type/Funding/Lifecycle=후속 중복 금지)** · Program 이름/External ID Tenant 공유 금지(Provider Account+Source System 복합키) · Parent Scope 무조건 복사 금지(Inheritance/Override) · **Merchant≠Seller·Vendor≠Supplier·동일 조직 다중 역할(Organization과 Role 분리)** · **Beneficiary≠Claimant≠Sponsor≠Payer** · Scope=Canonical Reference+Validity(문자열 배열 금지) · Contract Tokenized Reference(원문 복제 금지) · Currency/Environment 분리(Production에 Sandbox/Test 연결 금지) · Domain별 SoT·다중 Primary Conflict · Duplicate 후보 삭제 금지(Group 기록) · Evidence(Secret/금융/Tax/계약 원문 금지) · Reconciliation/Coverage · Lint/Guard · 중복/후퇴 검사 · ADR/PM 기록. **Rebate↔Cashback·Merchant↔Seller·Vendor↔Supplier·Beneficiary↔Claimant·SupplyChain/ChannelContract(공급망/채널 계약)↔Rebate Program·기존 Registry 중복 오혼입/생성 금지.**

## 9. Participant Scope Matrix (§51) · Source of Truth Matrix (§52) — 현행

| Program | Participant | Beneficiary | Claimant | Account Requirement | Contract Requirement | Verification | Country | Currency | Status |
|---|---|---|---|---|---|---|---|---|---|
| (Rebate Participant) | — | — | — | — | — | — | — | — | **NOT_APPLICABLE(신설·역할 분리)** |

| Program Domain | Primary Source | Secondary | Provider Account | Effective Period | Conflict | Confidence | Last Verified | Status | Evidence |
|---|---|---|---|---|---|---|---|---|---|
| (Rebate SoT) | — | — | — | — | — | — | — | — | **N/A(신설)** |
| 인접(재사용): source priority | data_source | — | channel_credential | last_seen_at | priority | — | last_seen_at | active | data_source |
