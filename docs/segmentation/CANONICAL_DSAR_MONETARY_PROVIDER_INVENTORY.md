# CANONICAL DSAR — Monetary Reward Provider & Account Inventory (Provider·Account·Scope·Capability·Credential·Currency·Environment)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-1-1 · 289차(2026-07-16) · **비파괴 설계 명세 — 코드변경 0**
> 정본 쌍: 본 문서(Inventory/Provider/Account/Capability) + [`CANONICAL_DSAR_MONETARY_PROVIDER_GOVERNANCE.md`](CANONICAL_DSAR_MONETARY_PROVIDER_GOVERNANCE.md)(SoT·Mapping·Classification·Coverage·Guard·Test).
> ADR: [`../architecture/ADR_DSAR_MONETARY_PROVIDER_ACCOUNT_INVENTORY.md`](../architecture/ADR_DSAR_MONETARY_PROVIDER_ACCOUNT_INVENTORY.md).
> 선행: Reward Governance(4-4)·Point Ledger(4-3)·Loyalty(4-1/4-2)·Commerce/Transaction·Subscription·Billing·Coupon/Campaign·EPIC05 Identity·EPIC03 Connector Registry.
> **범위**: 본 단계는 Cashback/Rebate/Commission/Wallet **기능 구현이 아니라** Provider·Account **Inventory**(다음 Part 4-5-1-2 Entity Model 기반).

---

## 0. 실측 요약 — 현행 대비(실측 → Canonical) ★정직 최우선

| 프롬프트 요구 | 현행 실측(코드 근거) | Canonical 분류 |
|---|---|---|
| **Provider Registry** | ✅ **REAL** — `channel_registry`(ChannelRegistry): 플랫폼 전역 카탈로그(테넌트 무관 SSOT)·channel_key·name·**group_type**(sales/marketing/logistics/**pg**/messaging)·fields_json·sync_kind·is_active·display_order. admin CRUD. | **CANONICAL_PROVIDER_REGISTRY**(확장 — Monetary Capability/Category 필드 추가) |
| **Credential Binding** | ✅ **REAL** — `channel_credential`(ChannelCreds): 테넌트별 외부 API키/토큰·**AES-256-GCM 암호화**(Genie\Crypto)·읽기 시 마스킹·복호는 실호출 JIT·**tenant=auth_tenant only**(184차 X-Tenant-Id 원시헤더 신뢰제거). | **CANONICAL** Credential Binding(확장 — Vault Reference·Read-only Discovery Scope·Rotation) |
| **Provider Account / Mapping** | ✅ **REAL(준함)** — `data_source`(DataPlatform): tenant_id·**source_type**(subscriber_owned/external_channel)·source_channel·**source_account**·**source_credential_id**·data_kind·**source_priority**·status·last_seen_at. 외부채널은 channel_credential 자동유도(중복입력 0). + `tenant_business_profile`(구독사 프로필). | **CANONICAL_PROVIDER_ACCOUNT_REGISTRY**(확장 — Monetary Account Type·Scope·Currency·Environment) |
| **PG Settlement/Payout/Payment Provider** | ✅ **REAL** — `pg_settlement`(PgSettlement v427): **Stripe**(Balance Transactions·net/fee)·**토스페이먼츠**(Settlements)·**PayPal**(OAuth Transactions)·이니시스·KCP·카카오페이·네이버페이·**Paddle**·**Adyen**(Settlement Detail CSV). creds=channel_credential. tenant 격리·**GENIE_ENV 운영/데모 물리분리**·데모 실호출 없이 pending. | **CANONICAL Monetary Provider(PAYMENT/SETTLEMENT/PAYOUT)** |
| **Marketplace Commission/Settlement** | ✅ **REAL(읽기수집)** — `kr_settlement_line`·`kr_fee_rule`·Rollup: 마켓수수료+광고수수료+배송비+반품비·**net_payout**·fees_source(estimated/실정산)·이중차감 방지(vat/coupon_discount/point_discount 제외). | **CANONICAL(COMMISSION/SETTLEMENT·읽기수집)** |
| **광고비 지출 Wallet/Payout** | ✅ **REAL** — `ad_spend_ledger`+billing_key(BillingMethod): Toss 빌링키(PCI-safe·AES-256-GCM)·월 예산 한도 청구·미설정 시 pending. | **KEEP_SEPARATE_WITH_REASON**(광고비 지출 월렛 — **고객 현금성 보상 아님**) |
| **SaaS Billing Provider** | ✅ **REAL** — Paddle(MoR·paddle_subscriptions). | **KEEP_SEPARATE**(GeniegoROI 자체 구독 billing·고객 리워드 아님·Billing Part 정본) |
| **Referral(현금성?)** | ✅ Referral+free_coupons(Part 4-4) | **KEEP_SEPARATE**(coupon=비현금 보상·Reward Part 정본) |
| **Influencer/Creator Commission Provider** | △ `influencer_store`(Influencer): 인플루언서 **마케팅 데이터** JSON 블롭(creators/ugc/channel_stats)·**커미션/정산 아님** | **KEEP_SEPARATE_WITH_REASON**(마케팅 데이터·현금성 지급 아님) |
| **Customer Cashback / Rebate / Refund Incentive / Wallet / Store Credit / Affiliate Provider** | ❌ 테이블·엔진 **부재(grep 0)**. `적립금`/`point_discount`=마켓 정산(Part 4-3·KEEP_SEPARATE) | **NOT_APPLICABLE**(고객 현금성 보상 provider 엔진 미보유) |
| **Legal Entity / Brand / Store / Workspace / Merchant Account Registry** | ❌ 전용 테이블 **부재(grep 0)**. **tenant_id row-level 격리만**(auth_tenant)·tenant_business_profile=회사 프로필 | **NOT_APPLICABLE**(Tenant만 실체·나머지 향후) |
| **Environment 분리** | ✅ **REAL** — GENIE_ENV(운영/데모) DB 물리분리·IS_DEMO·데모 실호출 없이 pending(오염 차단). SANDBOX/TEST=PG sandbox 키 부분 | **PRODUCTION/DEMO = REAL** · SANDBOX/TEST/STAGING/QA = **부분/NOT_APPLICABLE** |
| **Currency** | △ PG provider currency(net·PgSettlement)·마켓 KRW 중심. multi-currency Ledger·ISO 표준화·FX Source/Version·Rounding = **부분/부재** | **부분 REAL** · ISO/FX/Rounding = **GAP** |

**★결론(정직)**: **Provider/Account/Credential 인프라는 실체가 견고**(`channel_registry`·`channel_credential`·`data_source`·`pg_settlement`·`kr_settlement_line`·`ad_spend_ledger`). 이들을 **Canonical Monetary Provider Registry로 확장**(중복 신설 금지). 그러나 **고객 대상 Cashback/Rebate/Refund Incentive/Wallet/Store Credit/Affiliate provider 엔진은 부재(NOT_APPLICABLE)** 이며, **Legal Entity/Brand/Store/Merchant Account registry도 부재**(tenant_id row-level만). 광고비 월렛(BillingMethod)·Influencer(마케팅 데이터)·마켓 적립금·Referral coupon·Paddle billing은 **도메인 분리(KEEP_SEPARATE)**. 본 Inventory=멀티테넌트 고객용 미래 현금성 보상 기반의 전방호환 계약. 지어내기·NO_DATA/오탐 금지.

---

## 1. Canonical Entity (25) — §4

`MONETARY_PROVIDER` · `_PROFILE` · `_ACCOUNT` · `_ACCOUNT_RELATIONSHIP` · `_SCOPE_NODE` · `_REGION` · `_CURRENCY` · `_CAPABILITY` · `_API` · `_API_VERSION` · `_ENDPOINT` · `_WEBHOOK` · `_EXPORT` · `_BATCH` · `_HISTORY_PROFILE` · `_RETENTION_PROFILE` · `_CREDENTIAL_BINDING` · `_PERMISSION_PROFILE` · `_SOURCE_OF_TRUTH` · `_MAPPING` · `_INVENTORY_RESULT` · `_COVERAGE` · `_GAP` · `_EVIDENCE` · `_AUDIT_EVENT`.
**현행 실체**: PROVIDER(channel_registry)·CREDENTIAL_BINDING(channel_credential)·ACCOUNT/MAPPING(data_source)·SOURCE_OF_TRUTH(data_source.source_priority) = **REAL 확장**. 나머지(CAPABILITY/API/WEBHOOK/EXPORT/HISTORY/RETENTION/PERMISSION 명시 레지스트리·SCOPE_NODE Legal/Brand/Store) = **신설**.

## 2. Monetary Provider (§5·§6) · Category (§3.1)

Provider 필드: monetary_provider_id·canonical_provider_id·external_provider_code·name·**category**·description·integration type·supported {account types·reward domains·regions·countries·currencies}·{API·webhook·batch·export·portal·historical·archived·deleted·settlement·payout·accounting} support·owner·status·version·last_verified_at·evidence.
**Category(§3.1)**: CASHBACK/REBATE/REFUND_INCENTIVE/WALLET/STORE_CREDIT/AFFILIATE/REFERRAL/COMMISSION/CREATOR_COMMERCE/INFLUENCER/MARKETPLACE/SELLER_SETTLEMENT/PARTNER_SETTLEMENT/PAYMENT/PAYOUT/BANKING/ACCOUNTING/ERP/TAX/INTERNAL_REWARD_ENGINE/INTERNAL_FINANCE_LEDGER/DATA_WAREHOUSE/OTHER.
**상태(§6)**: DISCOVERED·REGISTERED·ACTIVE·ACTIVE_WITH_WARNINGS·PARTIAL_SUPPORT·READ_ONLY·MIGRATING·DEPRECATED·SUSPENDED·TERMINATED·BLOCKED·UNVERIFIED·TEST_ONLY.
**현행 실 Provider**: PAYMENT/SETTLEMENT/PAYOUT=Stripe·토스페이먼츠·PayPal·이니시스·KCP·카카오페이·네이버페이·Paddle·Adyen(pg_settlement, live) · MARKETPLACE/COMMISSION/SELLER_SETTLEMENT=쿠팡·11번가·네이버·스마트스토어 등(kr_settlement_line·읽기수집) · INTERNAL_FINANCE_LEDGER=ad_spend_ledger(광고비·KEEP_SEPARATE). **CASHBACK/REBATE/REFUND_INCENTIVE/WALLET/STORE_CREDIT/AFFILIATE/CREATOR/ERP/BANKING/TAX Provider = NOT_APPLICABLE(부재)**.

## 3. Provider Account (§7·§8) · Account Type (§3.2)

Account 필드: monetary_provider_account_id·provider_id·canonical_account_id·external_account_id·{parent·platform·connected·merchant·seller·partner} account id·account type·name·**tenant_id·workspace_id·brand_ids·store_ids·legal_entity_id**·region·country·environment·{default·supported·settlement·payout} currency·timezone·credential binding·permission profile·source of truth role·status·opened/closed/last_synchronized/last_verified_at·version·evidence.
**Account Type(§3.2)**: PROVIDER_MASTER/ORGANIZATION/PLATFORM/CONNECTED/MERCHANT/SELLER/VENDOR/PARTNER/AFFILIATE/CREATOR/COMMISSION/WALLET/SETTLEMENT/PAYOUT/BANK_REFERENCE/LEGAL_ENTITY/STORE/BRAND/REGION/SANDBOX/TEST.
**상태(§8)**: ACTIVE·ACTIVE_WITH_WARNINGS·READ_ONLY·PARTIAL_ACCESS·ONBOARDING·SUSPENDED·CLOSED·TERMINATED·CREDENTIAL_EXPIRED·PERMISSION_INSUFFICIENT·**WRONG_MAPPING_RISK·CROSS_TENANT_RISK**·UNVERIFIED·BLOCKED·TEST_ONLY.
**현행 실 Account**: data_source(tenant_id·source_account·source_credential_id) = MERCHANT/CONNECTED account 준함. PG=channel_credential per tenant(stripe:secret_key 등). **workspace_id·brand_ids·store_ids·legal_entity_id = 부재(NOT_APPLICABLE·tenant_id만)**. environment=GENIE_ENV(prod/demo).

## 4. Account Relationship (§9) · Scope Node (§10) · §3.3

**Relationship(§9)**: PARENT/CHILD·PLATFORM_CONNECTED·TENANT_OWNER·WORKSPACE_OWNER·BRAND_OWNER·STORE_OWNER·LEGAL_ENTITY_OWNER·MERCHANT/SELLER/VENDOR/PARTNER/AFFILIATE/CREATOR/WALLET/SETTLEMENT/PAYOUT/ACCOUNTING/DATA_WAREHOUSE_BINDING·MIGRATION_PREDECESSOR/SUCCESSOR(Valid From/To·Status·Evidence).
**Scope Hierarchy(§3.3)**: Provider→Account→Platform/Org→**Tenant**→Workspace→Brand→Store→Merchant→Reward Program→Wallet/Commission/Cashback Account→Settlement→Payout Destination. 각 단계 External ID↔Canonical ID 연결.
**Scope Node(§10)**: ORGANIZATION/PLATFORM/ACCOUNT/**TENANT**/WORKSPACE/BRAND/STORE/MERCHANT/SELLER/VENDOR/PARTNER/REWARD_PROGRAM/WALLET/COMMISSION_PROGRAM/CASHBACK_PROGRAM/SETTLEMENT/PAYOUT.
**현행**: TENANT Scope=REAL(auth_tenant·row-level)·ACCOUNT/MERCHANT=data_source·나머지 Scope Node(Workspace/Brand/Store/Legal Entity/Program) = **NOT_APPLICABLE**(향후). **★Provider 이름 동일해도 Region/Environment/Platform Account 다르면 별도 Scope**(§42).

## 5. Currency (§3.4) · Region·Country (§3.5) · Environment (§3.6)

- **Currency(§3.4)**: Account Default·Supported·Settlement·Payout·Reward Calc·Customer Display·Accounting Currency·FX Provider·FX Rate Source/Version·Conversion Time·**Precision·Rounding Rule·Zero-decimal·Multi-currency Ledger**. **★ISO Currency Code 사용(이름 문자열 금지)**. → 현행 PG provider currency(net) REAL·**ISO/FX/Rounding/Multi-currency = GAP(부분)**.
- **Region/Country(§3.5)**: Provider/Data Residency Region·Merchant/Legal Entity/Customer/Settlement/Payout Country·Tax Jurisdiction·Restricted Country·Cross-border Payout·Region별 Endpoint/Credential/Retention/Currency. → PG region endpoint 부분·**Data Residency/Tax Jurisdiction = 부재(GAP)**.
- **Environment(§3.6)**: PRODUCTION/SANDBOX/TEST/DEVELOPMENT/STAGING/QA/DEMO/TRAINING/ARCHIVED. **★Production Discovery에 Test/Sandbox 기본 포함 금지**. → **PRODUCTION/DEMO=REAL(GENIE_ENV 물리분리·IS_DEMO)**·SANDBOX(PG sandbox 키)=부분·나머지 N/A.

## 6. Capability Registry (§11·§12)

Cashback(PROGRAM/RULE/ACCRUAL/BALANCE/REDEMPTION/REVERSAL/EXPIRATION_SEARCH)·Rebate(PROGRAM/CLAIM/APPROVAL/PAYOUT/EXPIRATION_SEARCH)·Commission(PROGRAM/PARTICIPANT/ACCRUAL/STATEMENT/SETTLEMENT/PAYOUT/CLAWBACK_SEARCH)·Wallet(ACCOUNT/BALANCE/LEDGER/STORE_CREDIT/EXPIRATION_SEARCH)·Financial(SETTLEMENT/PAYOUT/ACCOUNTING_ENTRY/LIABILITY/TAX_REFERENCE_SEARCH)·Technical(EXACT_ID_LOOKUP/DATE_RANGE/PAGINATION/CURSOR_PAGINATION/BULK_EXPORT/ASYNC_EXPORT/INCREMENTAL_EXPORT/WEBHOOK/AUDIT_LOG/DELETED_RECORD/ARCHIVED_RECORD/MANUAL_PORTAL_SEARCH).
**상태(§12)**: SUPPORTED·PARTIALLY_SUPPORTED·UNSUPPORTED·PROVIDER_LIMITED·PERMISSION_BLOCKED·CREDENTIAL_BLOCKED·REGION_LIMITED·DEPRECATED·UNKNOWN·MANUAL_ONLY.
**현행 실 Capability**: PG=SETTLEMENT_SEARCH·PAYOUT_SEARCH·DATE_RANGE(Stripe Balance Tx·Toss Settlements·Adyen CSV)=SUPPORTED·Cashback/Rebate/Commission/Wallet Search=**UNSUPPORTED(엔진 부재)**·마켓 정산=SETTLEMENT_SEARCH(kr_settlement_line·INCREMENTAL 수집).

## 7. API (§13) · Webhook (§14·§15) · Export (§16)

- **API(§13)**: api_id·provider·account·type(REST/GRAPHQL/SOAP/RPC/SDK/SFTP/FILE_EXPORT/DATABASE/MESSAGE_QUEUE/INTERNAL_SERVICE)·base/region endpoint·version·auth type·**OAuth scopes·permission**·supported objects·filters·pagination·rate limit·retry·timeout·idempotency·historical limit·deleted support·environment·status·evidence. → PG=REST(Stripe/Toss/PayPal/Adyen)·auth(Bearer/Basic/OAuth2)=REAL·명시 API Inventory 레지스트리 신설.
- **Webhook(§14)**: webhook id·provider·account·event type·external/canonical event·endpoint·**signature verification·secret binding**·retry·ordering·duplicate·retention·schema version·environment·status·evidence. **★Webhook Secret 원문 저장 금지**. Event(§15): CASHBACK_*/REBATE_*/COMMISSION_*/WALLET_*/SETTLEMENT_*/PAYOUT_*/ACCOUNT_*. → 현행 `Webhooks.php` 존재(PG/채널 webhook)·Monetary event 매핑 신설.
- **Export(§16)**: export id·provider·account·type(API_BULK/ASYNC_JOB/CSV/JSON/PARQUET/SFTP/PORTAL/DB_SNAPSHOT/WAREHOUSE_SHARE)·objects·filter/date/incremental/full snapshot·async·delivery·**encryption·checksum·compression**·format·max range/rows·retention·cleanup·environment·status·evidence. → Adyen Settlement CSV·`DataExport.php` 존재·명시 Export Inventory 신설.

## 8. Historical (§17) · Credential Binding (§18) · Permission (§19)

- **Historical(§17)**: earliest/latest available date·online API·archive·export·warehouse·webhook·deleted/soft-deleted/hard-deleted coverage·retention·legal retention·provider retention·migration history·known gaps·confidence·last_verified_at. → PG API 90일~ 제한 등 provider별 상이·명시 History Profile 신설.
- **Credential Binding(§18)**: binding id·provider·account·credential reference·auth type·environment·region·**allowed scopes·read/export/payout/write permissions**·**secret vault reference**·rotation·expiry·last_tested_at·status·evidence. **★Secret 원문 저장 금지·Discovery Credential=Read-only 원칙**. → **현행 channel_credential=AES-256-GCM 암호화·마스킹·JIT 복호 = REAL(Vault Reference 준함)**·Read-only Discovery Scope 분리 신설.
- **Permission(§19)**: READ_{ACCOUNT/PROGRAM/CUSTOMER/PARTICIPANT/CASHBACK/REBATE/COMMISSION/WALLET/LEDGER/SETTLEMENT/PAYOUT/ACCOUNTING_REFERENCE/ARCHIVED/DELETED/AUDIT}·RUN_EXPORT·MANUAL_PORTAL_ACCESS. **★Discovery 권한과 분리 필수**: ISSUE_REWARD·MODIFY_BALANCE·EXECUTE_PAYOUT·APPROVE_SETTLEMENT·CHANGE_BANK_ACCOUNT·DETOKENIZE_FINANCIAL_DATA·DELETE_FINANCIAL_RECORD. → 현행 RBAC(viewer<connector<analyst<admin)·requirePro/requirePlan(admin)·TeamPermissions 확장(신규 권한 스토어 금지).

## 9. Provider Account Matrix (§36) — 현행 실측

| Provider | Category | Account | Tenant | Brand | Store | Merchant | Legal Entity | Region | Currency | Environment | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Stripe | PAYMENT/SETTLEMENT | channel_credential(stripe) | ✅auth_tenant | N/A | N/A | data_source.account | N/A | provider | net currency | prod/demo | ACTIVE(live) |
| 토스페이먼츠 | PAYMENT/SETTLEMENT | channel_credential(toss) | ✅ | N/A | N/A | N/A | N/A | KR | KRW | prod/demo | ACTIVE |
| PayPal·이니시스·KCP·카카오페이·네이버페이·Paddle·Adyen | PAYMENT/SETTLEMENT/PAYOUT | channel_credential | ✅ | N/A | N/A | N/A | N/A | 상이 | 상이 | prod/demo | ACTIVE/pending |
| 쿠팡·11번가·네이버·스마트스토어 등 | MARKETPLACE/COMMISSION | channel_credential+kr_settlement_line | ✅ | N/A | N/A | seller_id | N/A | KR | KRW | prod/demo | ACTIVE(읽기수집) |
| (광고비 월렛) | INTERNAL_FINANCE_LEDGER | ad_spend_ledger+billing_key | ✅ | N/A | N/A | N/A | N/A | KR | KRW | prod | **KEEP_SEPARATE** |
| Cashback/Rebate/Wallet/Affiliate(고객) | — | — | — | — | — | — | — | — | — | — | **NOT_APPLICABLE(부재)** |

## 10. Capability Matrix (§37) — 현행

| Provider Account | Cashback | Rebate | Commission | Wallet | Settlement | Payout | API | Webhook | Export | History | Deleted |
|---|---|---|---|---|---|---|---|---|---|---|---|
| PG(Stripe/Toss/…) | ✗ | ✗ | ✗ | ✗ | ✅ | ✅ | ✅REST | △Webhooks.php | △CSV(Adyen) | △provider限 | ✗ |
| 마켓(쿠팡/11번가/…) | ✗ | ✗ | ✅수수료(읽기) | ✗ | ✅net_payout | ✗ | ✅ | △ | △ | △ | ✗ |
| (고객 현금성 보상) | **N/A** | **N/A** | **N/A** | **N/A** | — | — | — | — | — | — | — |
