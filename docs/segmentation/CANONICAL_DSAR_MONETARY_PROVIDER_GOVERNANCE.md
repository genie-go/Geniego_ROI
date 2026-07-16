# CANONICAL DSAR — Monetary Provider Governance (Source of Truth·Mapping·Classification·Coverage·Gap·Guard·Test)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-1-1 · 289차(2026-07-16) · **비파괴 설계 명세 — 코드변경 0**
> 정본 쌍: [`CANONICAL_DSAR_MONETARY_PROVIDER_INVENTORY.md`](CANONICAL_DSAR_MONETARY_PROVIDER_INVENTORY.md)(Inventory) + 본 문서(Governance).
> ADR: [`../architecture/ADR_DSAR_MONETARY_PROVIDER_ACCOUNT_INVENTORY.md`](../architecture/ADR_DSAR_MONETARY_PROVIDER_ACCOUNT_INVENTORY.md).

---

## 1. Source of Truth Registry (§20)

**Domain별 SoT 확정**: Cashback Program/Accrual/Balance·Rebate Claim/Approval/Payment·Commission Contract/Accrual/Settlement/Payout·Wallet Balance/Ledger·Accounting Entry·Liability·Tax Reference.
**상태**: PRIMARY·AUTHORITATIVE_SECONDARY·REPLICA·CACHE·WAREHOUSE_COPY·ANALYTICS_COPY·LEGACY·MIGRATING·UNKNOWN. **★동일 Domain에 다중 PRIMARY 금지(예외 사유 기록·§26 Critical)**.
**현행 실 SoT**: PG net/fee=**pg_settlement PRIMARY** · 마켓 net_payout/수수료=**kr_settlement_line PRIMARY**(실정산) / kr_fee_rule(estimated SECONDARY·실정산 적재 시 우선) · 광고비 지출=**ad_spend_ledger PRIMARY** · SaaS billing=**Paddle PRIMARY** · **data_source.source_priority**=source간 우선순위 신호(=SoT priority 실 구현). **Cashback/Rebate/Wallet/Commission(고객) SoT=UNKNOWN/NOT_APPLICABLE(엔진 부재)**. **★fees_source(estimated vs 실정산) 이중차감 방지(vat/coupon_discount/point_discount 제외)=현행 SoT 규율의 실 사례**.

## 2. Provider Mapping (§21)

Mapping 필드: mapping id·provider·account·**provider object·canonical domain·external primary key·account scope field·tenant field·brand field·store field·currency field·amount field·status field·date fields·participant/settlement/payout fields·deleted/archived field**·version·status·owner·evidence. **본 단계=Inventory 수준 Mapping만**(세부 Entity는 Part 4-5-1-2).
**현행**: data_source(source_type/channel/account/credential_id/data_kind)=Provider Object↔Canonical Domain Mapping의 실 뼈대. PG=Balance Tx/Settlement↔net/fee·마켓=kr_settlement_line↔net_payout/수수료. **tenant field=REAL·brand/store/legal entity field=부재(GAP)**.

## 3. Existing Implementation Classification (§22)

| 구현 | 분류 | 근거 |
|---|---|---|
| `channel_registry`(ChannelRegistry) | **CANONICAL_PROVIDER_REGISTRY** | 플랫폼 전역 provider 카탈로그 SSOT·group_type(pg 포함)·admin CRUD. Monetary Category/Capability 확장 |
| `channel_credential`(ChannelCreds) | **CANONICAL** Credential Binding | AES-256-GCM 암호화·마스킹·JIT 복호·tenant=auth_tenant only(184차). Vault Reference/Read-only Scope 확장 |
| `data_source`+`tenant_business_profile`(DataPlatform) | **CANONICAL_PROVIDER_ACCOUNT_REGISTRY** | source_type/channel/account/credential_id/**priority**. Monetary Account Type/Scope/Currency 확장 |
| `pg_settlement`(PgSettlement) | **CANONICAL_MONETARY_PROVIDER_EXTENSION** | Stripe/Toss/PayPal/이니시스/KCP/카카오페이/네이버페이/Paddle/Adyen 실어댑터·net/fee·GENIE_ENV 격리 |
| `kr_settlement_line`·`kr_fee_rule`·Rollup | **CANONICAL(COMMISSION/SETTLEMENT·읽기수집)** | 마켓 수수료·net_payout·fees_source·이중차감 방지 |
| `ad_spend_ledger`+billing_key(BillingMethod) | **KEEP_SEPARATE_WITH_REASON** | 광고비 지출 월렛(Toss 빌링키)·고객 현금성 보상 아님 |
| `paddle_subscriptions`(Paddle) | **KEEP_SEPARATE_WITH_REASON** | GeniegoROI 자체 구독 billing(MoR)·고객 리워드 아님 |
| `influencer_store`(Influencer) | **KEEP_SEPARATE_WITH_REASON** | 인플루언서 마케팅 데이터·커미션/정산 아님 |
| `Webhooks.php`·`DataExport.php` | **VALIDATED_LEGACY**(확장) | webhook/export 실 인프라·Monetary event/object 매핑 신설 |
| Cashback/Rebate/Wallet/Affiliate(고객) Provider·Legal Entity/Brand/Store/Merchant Registry | **UNVERIFIED → NOT_APPLICABLE** | 부재(grep 0)·향후 신설 |

## 4. Duplicate Implementation Audit (§23)

전수 탐지: 여러 Cashback/Wallet/Commission Provider Registry·여러 Provider Account Registry·여러 Merchant/Currency Mapping·여러 API Client/Webhook Handler/Export Job·여러 Historical/Credential Binding/Settlement Account/Source of Truth Registry·Provider별 독립 DSAR Registry·Reward 유형별 독립 Tenant Mapping.
**현행 감사**: Provider 카탈로그 단일(channel_registry — 과거 4곳 하드코딩 ApiKeys/OmniChannel/AdChannelConnect/ConnectorSync를 대체한 SSOT)·Credential 단일(channel_credential)·Account 단일(data_source). **중복 Registry 없음(SSOT 통합 완료)**. ★도입 시 **Provider별 독립 DSAR Registry/Candidate Store 생성 금지**. 중복 발견 시 즉시 삭제 금지 → 위치·Domain·사용여부·호출자·데이터/기능 차이·통합후보·폐기위험·Migration/회귀위험 기록.

## 5. Coverage (§24) · Gap (§25) · Critical Gap (§26)

**Coverage(§24)**: Provider·Account·Tenant/Brand/Store/Merchant/Legal Entity Mapping·Region·Currency·Environment·Credential·Permission·API·Webhook·Export·Historical·Archived·Deleted·Source of Truth·Existing Implementation·Evidence.
**Gap Type(§25)**: MONETARY_PROVIDER(_ACCOUNT)_UNREGISTERED·TENANT/BRAND/STORE/MERCHANT/LEGAL_ENTITY/REGION/CURRENCY/ENVIRONMENT_MAPPING_MISSING·CREDENTIAL_BINDING_MISSING·PERMISSION_PROFILE_UNKNOWN·API/WEBHOOK/EXPORT_CAPABILITY_UNKNOWN·HISTORICAL_COVERAGE_UNKNOWN·ARCHIVED/DELETED_DATA_UNAVAILABLE·SOURCE_OF_TRUTH_UNKNOWN·**MULTIPLE_PRIMARY_SOURCE**·DUPLICATE_CONNECTOR·DUPLICATE_PROVIDER_REGISTRY·**CROSS_TENANT_ACCOUNT_RISK·PRODUCTION_SANDBOX_MIXED**·FINANCIAL_SCOPE_UNVERIFIED.
**Critical Gap(§26)**: Provider Account 잘못된 Tenant 연결·하나의 Account가 여러 Tenant에 근거없이 연결·**Production·Sandbox 혼합**·Merchant↔Legal Entity 불일치·Settlement Account Owner 불명확·Payout Account 잘못된 Brand·**Currency Mapping 없어 금액 비교 불가**·SoT 불명확·두 시스템 동시 Primary·**Credential에 Write/Payout 권한 과도**·Deleted/Archived Financial Data 검색경로 없음·Cross-border Account Scope 미검증·기존 Connector가 Tenant Binding 없이 검색.
**현행 정직 GAP**: **고객 현금성 보상 provider 부재=결함 아니라 `PROVIDER_LIMITATION`/NOT_APPLICABLE**(NO_DATA/오탐 금지). 실 GAP=①**Legal Entity/Brand/Store/Merchant Mapping 부재**(tenant_id row-level만) ②**Currency ISO/FX/Rounding/Multi-currency 부분** ③Historical/Archived/Deleted Coverage 명시 프로파일 부재 ④SANDBOX/TEST 환경 명시 부분. Critical Gap 시 Access Review 차단.

## 6. Discovery Evidence (§ — Provider Registration별)

request_id·discovery_task_id·provider·account·endpoint/query·API version·scope/identity version·date range·filters·환경·pagination·async job·결과 count·error·started/completed_at·result hash·audit ref. **Secret/Financial 원문 미포함**.

## 7. Static Lint (§27) — CI 차단

Provider Account Binding 없는 Monetary Query·**Tenant Binding 없는 Provider Mapping**·Environment 필드 없는 Account·**Production·Sandbox 혼용**·Currency 없는 Monetary Account·Legal Entity 없는 Settlement Account·Source of Truth 미정의·동일 Domain 다중 Primary·**Secret 원문 저장**·Webhook Signature Verification 누락·**Read Discovery Credential에 Payout 권한 포함**·전체 Provider Account 무필터 Export·Pagination/Historical Coverage 정의 누락·Evidence 없는 Provider Registration·**기존 Provider Registry와 중복 Entity 생성**.

## 8. Runtime Guard (§28)

Wrong Provider Account·**Cross-Tenant Account**·Wrong Brand/Store/Merchant/Legal Entity·**Production·Sandbox 혼합**·Unsupported Currency·Invalid/Expired Credential·Permission Insufficient·Unverified Source of Truth·**Scope 없는 Bulk Export**·Region Endpoint Mismatch·Webhook Signature Invalid·Critical Mapping Drift·Kill Switch.
**현행 실증**: channel_credential이 **tenant=auth_tenant only**(Cross-Tenant read/write 차단·184차 P0)·**GENIE_ENV 운영/데모 물리분리**(Production·Demo 혼합 차단)·데모 실호출 없이 pending(오염 차단)·AES-256-GCM(Secret 보호) = §28 Guard의 실 구현.

## 9. Error (§29) · Warning (§30) Contract

**Error(20)**: MONETARY_PROVIDER(_ACCOUNT)_NOT_REGISTERED·_ACCOUNT_SCOPE_MISMATCH·_TENANT/BRAND/STORE/MERCHANT/LEGAL_ENTITY/REGION/CURRENCY/ENVIRONMENT_MAPPING_MISSING·_CREDENTIAL_BINDING_MISSING·_PERMISSION_INSUFFICIENT·_API/EXPORT_CAPABILITY_UNKNOWN·_HISTORICAL_COVERAGE_UNKNOWN·_SOURCE_OF_TRUTH_UNKNOWN·**_MULTIPLE_PRIMARY_SOURCE·_CROSS_TENANT_RISK**·_RUNTIME_BLOCKED.
**Warning(13)**: _PROVIDER_PARTIAL_SUPPORT·_ACCOUNT_PARTIAL_ACCESS·_CURRENCY/_REGION/_HISTORICAL/_ARCHIVE/_DELETED_DATA_WARNING·_CREDENTIAL_EXPIRY/_RATE_LIMIT/_WEBHOOK_RETRY_WARNING·_DUPLICATE_CONNECTOR_WARNING·_SOURCE_DRIFT_WARNING·_MANUAL_REVIEW_REQUIRED.

## 10. Golden Inventory Dataset (§31) — 테스트 전용

단일 Provider·단일/다중 Tenant Account·단일 Tenant·다중 Provider·단일 Brand·다중 Store·다중 Merchant·Platform/Connected·Seller Settlement·Affiliate·Creator·Wallet·Commission·Legal Entity별·Multi-region·Multi-currency·**Settlement Currency≠Display Currency**·**Production·Sandbox 분리**·**Wrong Tenant/Brand/Merchant/Legal Entity 차단**·Credential 만료·Permission 부족·API 지원·Manual-only·Webhook·Bulk Export·Historical API 제한·Archived Export·Deleted 미지원·**Multiple Primary Source 오류**·**Duplicate Connector 탐지**·Source of Truth 정상·Cross-border Payout·Region Endpoint Mismatch·**Evidence 누락 차단**·Coverage Complete·Critical Gap.
**현행 실 회귀 시드**: Cross-Tenant credential 차단(auth_tenant)·Production/Demo 물리분리·Secret 암호화·마켓 fees_source 이중차감 방지·PG 미설정 pending 정직 — 즉시 Golden 등록 가능.

## 11. Conformance Test (§32) · 기능 후퇴 방지 (§33)

**Conformance(§32)**: Cashback/Rebate/Wallet/Affiliate/Commission/Marketplace/Payout/Payment/Accounting/ERP/Internal Reward Engine/Data Warehouse Provider에 동일 Inventory Contract(Provider/Account Registration·Scope Hierarchy·Tenant/Brand/Store·Merchant/Legal Entity·Region/Currency·Environment·Credential·Permission·API·Webhook·Export·Historical Coverage·Source of Truth·Evidence·Audit).
**후퇴 방지(§33)**: Existing Provider 연결·Provider Account Mapping·API Client·Webhook·Export·Historical/Admin Search·Customer/Partner Portal·Settlement/Currency Mapping·Credential Rotation·Monitoring·Audit·**Existing API Compatibility**(`/v423/creds`·`/v426/channels`·`/v427/pg/*`·DataPlatform·BillingMethod). 승인되지 않은 기능 감소 시 전환 차단.

## 12. 검증 게이트 (§39) · 영구 규칙

**게이트(§39)**: 모든 Monetary Provider 조사·모든 Account Registry화·**Production/Sandbox/Test 분리**·Tenant/Brand/Store Mapping 검증·Merchant/Seller/Partner 구분·Legal Entity 연결·Region/Country/Timezone·Default/Settlement/Payout Currency·API/Webhook/Export Capability·Historical/Archived/Deleted Coverage·**Credential Vault Reference·Discovery Credential Read-only**·Permission Profile 검증·Domain별 SoT 확정·**Multiple Primary 차단**·기존 구현 분류·중복 Connector 탐지·Coverage/Gap/Evidence·Lint/Guard·Golden/Conformance·기존 정상 기능 유지·ADR/PM/Repeat Problem/Agent History 갱신.
**영구 규칙(§42)**: 신규 Monetary Provider/Account 추가 전 Provider·Account를 **Canonical Provider Registry(channel_registry)에 연결·중복 Registry 생성 금지**. Account를 Tenant/Workspace/Brand/Store/Merchant/Seller/Vendor/Partner/Legal Entity/Region/Country/Environment/Timezone/Currency 연결. **Production/Sandbox/Test/Demo/Archived 명확 분리**. **Provider 이름 동일해도 다른 Account 통합 금지·동일 External Account ID라도 Region/Environment/Platform Account 다르면 별도 Scope**. Secret 원문 저장 금지(Vault Reference)·**Discovery Credential Read-only(Reward 발급/Balance 변경/Payout 실행/Bank 변경/Financial 삭제 권한 미포함)**. Domain별 SoT 확정·다중 Primary=Critical Gap. **광고비 월렛/Influencer/마켓 적립금/Referral/Paddle=도메인 분리(현금성 고객보상과 오혼입 금지)**.

## 13. Source of Truth Matrix (§38) — 현행

| Domain | Primary Source | Secondary | Warehouse Copy | Account Scope | Historical | Status | Evidence |
|---|---|---|---|---|---|---|---|
| PG 결제/정산 net·fee | pg_settlement | — | Rollup(분석) | tenant+channel_credential | provider限 | PRIMARY | Stripe/Toss/Adyen 응답 |
| 마켓 net_payout·수수료 | kr_settlement_line(실정산) | kr_fee_rule(estimated) | Rollup | tenant+seller_id | 수집분 | PRIMARY | 채널 정산 API/CSV |
| 광고비 지출 | ad_spend_ledger | — | — | tenant | MTD | PRIMARY(KEEP_SEPARATE) | Toss 빌링 |
| SaaS billing | Paddle | — | — | user_email | Paddle限 | PRIMARY(KEEP_SEPARATE) | paddle_subscriptions |
| Cashback/Rebate/Wallet/Commission(고객) | — | — | — | — | — | **UNKNOWN/N/A(엔진 부재)** | — |
