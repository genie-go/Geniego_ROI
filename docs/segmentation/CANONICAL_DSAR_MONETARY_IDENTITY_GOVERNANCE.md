# CANONICAL DSAR — Monetary Reward Identity Governance (Verification·Shared·Alias/Merge·Candidate·Reconciliation·Guard·Test)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-1-3 · 289차(2026-07-16) · **비파괴 설계 명세 — 코드변경 0**
> 정본 쌍: [`CANONICAL_DSAR_MONETARY_IDENTITY_MODEL.md`](CANONICAL_DSAR_MONETARY_IDENTITY_MODEL.md)(Profile/Participant/Beneficiary/Role) + 본 문서(Governance).
> ADR: [`../architecture/ADR_DSAR_MONETARY_REWARD_IDENTITY_GOVERNANCE.md`](../architecture/ADR_DSAR_MONETARY_REWARD_IDENTITY_GOVERNANCE.md).

---

## 1. Account Owner (§21) · Payout Recipient (§22) · Beneficial Owner (§23) · Tax Subject (§24) ★Tokenized

- **Account Owner(§21)**: account_owner_identity_id·reward account·owner type·owner identity·legal owner·beneficial owner·administrator·**authorized users**·valid from/to·status·evidence. **★§5.7 Account Owner≠Authorized User**(Shared Account에서 Owner/Contributor/Redeemer/Admin 구분).
- **Payout Recipient(§22)**: payout_recipient_reference_id·beneficiary·recipient type·provider recipient id·**payout destination type·masked destination·destination token·owner verification**·country·currency support·valid from/to·status·evidence. **★원문 금융계좌 저장 금지·Masked/Token만**.
- **Beneficial Owner(§23)**: beneficial_owner_reference_id·organization·beneficiary·**reference token·verification provider·ownership type·ownership range reference**·verified_at·valid from/to·status·evidence. 민감 상세 비율 원문 최소화.
- **Tax Subject(§24)**: tax_subject_reference_id·beneficiary·person/organization reference·**tax jurisdiction·tax classification·tokenized tax identifier reference·tax document reference·withholding profile**·valid from/to·status·evidence.
**현행**: 전부 **부재(grep 0)** → 신설. **★§5.2 Beneficiary≠Payout Recipient≠Tax Subject≠Beneficial Owner 분리·§5.6 Payment Method Holder≠Beneficiary**.

## 2. Shared Account Membership (§25) · Multi-beneficiary Allocation (§26)

- **Shared Account(§25)**: shared_account_membership_id·reward account·member identity·**role·ownership ratio reference·contribution/redemption/payout/admin permission**·joined/left_at·status·evidence. Role(8): OWNER·CO_OWNER·MEMBER·CONTRIBUTOR·REDEEMER·PAYOUT_RECIPIENT·ADMIN·VIEWER.
- **Multi-beneficiary Allocation(§26)**: allocation_id·monetary reward·beneficiary·**allocation method·allocation ratio·allocated amount·currency·priority**·valid from/to·status·evidence. Method(9): FIXED_RATIO·FIXED_AMOUNT·TIERED·PRIORITY·RESIDUAL·CONTRACT_BASED·ATTRIBUTION_BASED·MANUAL·CUSTOM.
**현행**: 부재 → 신설. **★Shared Account 전체를 한 개인에게 자동귀속 금지·Organization Reward를 개인 Reward로 귀속 금지(§39 Critical)**. AgencyPortal scope_json(권한 위임)·PartnerPortal 유형별 권한=권한 격리 패턴 참조(단 보상 계정 아님).

## 3. Recipient Verification (§27·§28) · Identity Confidence (§29)

- **Verification(§27)**: verification_id·beneficiary·payout recipient·**verification type·provider·requested/verified_at·expiry·result·mismatch reason·retry count**·status·evidence. Type(10): EMAIL/PHONE_VERIFICATION·ACCOUNT_OWNERSHIP·WALLET_OWNERSHIP·BANK_REFERENCE_OWNERSHIP·KYC_REFERENCE·KYB_REFERENCE·TAX_PROFILE_VERIFICATION·CONTRACT_VERIFICATION·MANUAL_REVIEW. 상태(10): NOT_STARTED·PENDING·VERIFIED·PARTIALLY_VERIFIED·EXPIRED·FAILED·MISMATCH·REJECTED·MANUAL_REVIEW·BLOCKED. **★Verification 만료/실패 Recipient 지급경로 Block(§41)**.
- **Confidence(§29)**: EXACT·VERY_HIGH·HIGH·MEDIUM·LOW·CONFLICTED·UNVERIFIED·BLOCKED. 근거: Exact External ID·Provider Account Match·Tenant Match·Legal Entity Match·Contract Match·Verified Identifier·Reward Account Match·Payout Recipient Match·Historical Validity·**Shared Identifier Risk**·Alias/Merge History·Manual Verification. **★Low-confidence/Multiple Match 자동 지급 확정 금지(§41)**.
**현행**: 부재 → 신설. crm identity=best-effort(email/phone/kakao)·confidence 미계산·Recipient Verification/KYC 전무.

## 4. Alias·Merge·Unmerge (§30) · Historical Validity (§31) ★Append-only

- **Alias/Merge/Unmerge(§30)**: event id·identity type·winning identity·losing identities·aliases·**event type·effective time·actor·reason·affected reward accounts·affected settlements·affected payouts·rollback status**·evidence. Event Type(8): ALIAS_ADDED·MERGED·UNMERGED·SPLIT·REASSIGNED·ORGANIZATION_CONSOLIDATED·ACCOUNT_TRANSFERRED·IDENTITY_CORRECTED.
- **Historical Validity(§31)**: valid_from·valid_to·recorded_at·source version·active·superseded_by·evidence. **현재 Identity만 저장 금지·과거 귀속 보존**.
**★§5.9 Merge 이후 과거 역할 삭제 금지·과거 Settlement Beneficiary를 현재 Identity로 무조건 덮어쓰기 금지(§39 Critical)**. **현행**: crm identity merge=best-effort(원본 행 보존·비파괴)이나 **structured merge/alias/unmerge history 미보존=GAP**. EPIC05 Merge 정합.

## 5. Candidate (§32·§33) · 포함 검증 (§34)

**Candidate(§32)**: candidate_id·request_id·monetary reward id·**participant/beneficiary/account owner identity·payout recipient/beneficial owner/tax subject reference·role assignments·identifier matches**·tenant·brand·legal entity·shared account context·historical validity·identity confidence·verification status·match status·review requirements·evidence.
**Match(§33, 23)**: EXACT_PARTICIPANT/BENEFICIARY/PAYOUT_RECIPIENT/REWARD_ACCOUNT_OWNER_MATCH·STRONG_CUSTOMER/ORGANIZATION_MATCH·VERIFIED_AFFILIATE/CREATOR/SELLER/PARTNER_MATCH·**REFERRER_MATCH·REFEREE_MATCH**·SHARED_ACCOUNT_MEMBER_MATCH·AUTHORIZED_USER_MATCH·PAYOUT_RECIPIENT_ONLY·IDENTIFIER_ONLY·MULTIPLE_IDENTITY_MATCH·WRONG_PARTICIPANT/BENEFICIARY/TENANT/LEGAL_ENTITY·OUT_OF_SCOPE·MANUAL_REVIEW·BLOCKED.
**포함 검증(§34)**: Provider Account·Tenant/Brand·Legal Entity·Reward Account·Participant/Beneficiary Role·**Recipient Verification·Historical Validity·Shared Account Role·Contract Relationship·Payout Destination Ownership·Tax Subject Relationship·Alias/Merge History·Source of Truth Consistency**.

## 6. Reconciliation (§35·§36) · Coverage (§37) · Gap (§38·§39)

- **Reconciliation(§35)**: Participant↔Canonical Person·Beneficiary↔Reward Account Owner·Beneficiary↔Payout Recipient·Beneficiary↔Tax Subject·Organization↔Legal Entity·Seller↔Settlement Account·Affiliate↔Commission Account·Creator↔Agency·**Referrer↔Referral Relationship**·Shared Account↔Member Permissions·Provider Identity↔Internal Identity·Historical Identity↔Current Mapping·Payout Recipient↔Destination Owner Verification. 상태(17): MATCH·PARTICIPANT/BENEFICIARY/ACCOUNT_OWNER/PAYOUT_RECIPIENT/BENEFICIAL_OWNER/TAX_SUBJECT_MISMATCH·ORGANIZATION_LEGAL_ENTITY_MISMATCH·AFFILIATE_ACCOUNT/CREATOR_AGENCY/SELLER_SETTLEMENT/REFERRAL_RELATIONSHIP_MISMATCH·SHARED_ACCOUNT_ROLE_MISMATCH·HISTORICAL_VALIDITY_MISMATCH·PROVIDER_INTERNAL_IDENTITY_DRIFT·MANUAL_REVIEW·BLOCKED.
- **Coverage(§37, 23)**: Identity Profile·Participant·Beneficiary·Role Assignment·Person/Organization/Customer Mapping·Affiliate·Creator/Influencer·Seller/Vendor·Partner·Employee·Referrer/Referee·Account Owner·Payout Recipient·Beneficial Owner·Tax Subject·Shared Account·Multi-beneficiary·Verification·Alias/Merge History·Historical Validity·Evidence.
- **Gap(§38, 23)**: PARTICIPANT/BENEFICIARY_IDENTITY_UNRESOLVED·REWARD_ACCOUNT_OWNER_UNKNOWN·**PAYOUT_RECIPIENT_UNVERIFIED·PAYOUT_DESTINATION_OWNER_MISMATCH·BENEFICIAL_OWNER/TAX_SUBJECT_REFERENCE_MISSING**·AFFILIATE/CREATOR/INFLUENCER/SELLER/PARTNER/EMPLOYEE_MAPPING_MISSING·REFERRER_REFEREE_RELATIONSHIP_MISSING·SHARED_ACCOUNT_ROLE_UNRESOLVED·MULTI_BENEFICIARY_ALLOCATION_MISSING·IDENTITY_ALIAS/MERGE_HISTORY_MISSING·HISTORICAL_VALIDITY_MISSING·IDENTITY_CONFIDENCE_LOW·MULTIPLE_IDENTITY_MATCH·PROVIDER_INTERNAL_IDENTITY_DRIFT·CROSS_TENANT_IDENTITY_RISK.
- **Critical Gap(§39)**: 잘못된 Beneficiary 연결·Payout Recipient가 Beneficiary와 무관·Payout Destination Owner Verification 실패·Seller↔Legal Entity 불일치·Affiliate↔Commission Account 불일치·Creator↔Agency 불일치·**Referrer/Referee 뒤바뀜**·Shared Account 전체 개인 귀속·Organization Reward 개인 귀속·**Cross-Tenant Participant·Cross-Legal-Entity Beneficiary**·Merge 이후 과거 Settlement 귀속 변경·Tax Subject/Beneficial Owner 누락·**동일 이메일만으로 Recipient 자동확정·금융계좌 원문 저장**.
**현행 정직 GAP**: Identity Governance 엔진 부재=결함 아니라 **PROVIDER_LIMITATION/NOT_APPLICABLE**(NO_DATA/오탐 금지). Critical Gap 시 Access Review 차단.

## 7. Static Lint (§40) · Runtime Guard (§41)

**Lint(§40)**: **Participant↔Beneficiary·Beneficiary↔Payout Recipient·Customer↔Affiliate 자동 동일시·Referrer↔Referee 혼용·Seller↔Vendor↔Partner 역할 혼용·Payment Method Holder를 Beneficiary로 확정·이메일 단독 Recipient 확정**·Tenant Binding 없는 Participant·Legal Entity 없는 Organization Beneficiary·Shared Account Role 누락·Historical Validity 누락·Identity Confidence 누락·Recipient Verification 누락·**Bank Account/Tax Identifier 원문 저장·Merge History 삭제·Canonical Person/Organization 중복 생성**.
**Guard(§41)**: Wrong Participant/Beneficiary/Reward Account Owner·**Cross-Tenant Identity**·Wrong Brand/Legal Entity·**Unverified Payout Recipient·Payout Destination Owner Mismatch·Shared Account Scope 초과·Referrer/Referee Role Conflict**·Seller/Settlement·Affiliate/Commission·Creator/Agency Mismatch·Expired Identity Relationship·**Low-confidence Recipient 자동확정**·Scope 초과 Identity Export·Critical Identity Drift·Kill Switch.
**현행 실증**: AgencyPortal fail-closed 재검증(Cross-Tenant 차단·매 요청 approved 재검증·철회 즉시 403)·PartnerPortal 본사/파트너 세션 분리·crm identity 원본 보존=격리/비파괴 패턴.

## 8. Error (§42) · Warning (§43)

**Error(20)**: MONETARY_PARTICIPANT/BENEFICIARY_IDENTITY_NOT_FOUND·_IDENTITY_ROLE_UNRESOLVED·_REWARD_ACCOUNT_OWNER_UNKNOWN·**_PAYOUT_RECIPIENT_NOT_VERIFIED·_PAYOUT_DESTINATION_OWNER_MISMATCH·_BENEFICIAL_OWNER/_TAX_SUBJECT_REFERENCE_MISSING**·_AFFILIATE/_CREATOR/_SELLER/_PARTNER_MAPPING_MISSING·_REFERRAL_RELATIONSHIP_MISSING·_SHARED_ACCOUNT_ROLE_UNRESOLVED·_MULTI_BENEFICIARY_ALLOCATION_MISSING·**_IDENTITY_CONFIDENCE_LOW·_MULTIPLE_IDENTITY_MATCH·_CROSS_TENANT_IDENTITY_RISK**·_IDENTITY_RECONCILIATION_FAILED·_IDENTITY_RUNTIME_BLOCKED.
**Warning(13)**: _IDENTITY_MULTIPLE_MATCH·_BENEFICIARY·_PAYOUT_RECIPIENT·_SHARED_ACCOUNT·_REFERRAL_ROLE·_CREATOR_AGENCY·_SELLER_LEGAL_ENTITY·_AFFILIATE_ACCOUNT·_HISTORICAL_IDENTITY·_IDENTITY_CONFIDENCE·_VERIFICATION_EXPIRY_WARNING·_PROVIDER_INTERNAL_IDENTITY_DRIFT·_IDENTITY_MANUAL_REVIEW_REQUIRED.

## 9. Golden Identity Dataset (§44) · Conformance (§45) · Legacy Equivalence (§46)

**Golden(§44)**: Customer=Beneficiary·**Customer≠Beneficiary·Buyer≠Referrer·Referrer≠Referee·Payment Method Holder≠Beneficiary·Account Owner≠Payout Recipient**·Organization/Individual/Shared Beneficiary·Multi-beneficiary Allocation · Affiliate 정상/불일치·Creator 직접/Agency 지급·Influencer Attribution·Seller Organization/Legal Entity 불일치·Vendor/Partner/Reseller 정산 · Family/Team/Organization Shared Account·Owner/Co-owner/Contributor/Redeemer/Authorized User·**Unauthorized Payout·Shared Scope 초과 차단** · Verified/Partial/Expired Verification·Bank/Wallet Ownership Mismatch·Tax Profile/Beneficial Owner Missing·Contract/Manual Review · Alias/Merge/Unmerge/Split/Account Transfer/Organization Consolidation·**Historical Role 변경·과거 Settlement 귀속 유지·Low-confidence·Multiple Match·Cross-Tenant 차단**.
**실 회귀 시드**: Referral referrer≠referee·AgencyPortal Cross-Tenant fail-closed·PartnerPortal 세션 분리·crm identity 원본 보존 — 즉시 Golden 등록 가능.
**Conformance(§45)**: Customer/Loyalty Member/Referrer/Referee/Affiliate/Creator/Influencer/Salesperson/Employee/Seller/Vendor/Partner/Agency/Reseller/Organization/Account Owner/Beneficiary/Payout Recipient/Beneficial Owner/Tax Subject에 동일 Contract(Provider Account·Tenant/Brand·Legal Entity·Identifier·Role·Historical Validity·Verification·Shared Scope·Confidence·Candidate·Reconciliation·Coverage·Evidence·Audit).
**Legacy Equivalence(§46)**: 기존 Customer(crm identity)·Partner(PartnerPortal)·Agency(AgencyPortal)·Referral(referral_signup) Mapping과 Participant/Beneficiary/Referral/Account Owner Count·Historical Identity·Error·Warning·Latency·Audit 비교. **UNEXPLAINED·잘못된 수령자·Cross-Tenant→전환차단**.

## 10. 기존 구현 분류 (§47) · 중복 감사 (§48)

| 구현 | 분류 | 근거 |
|---|---|---|
| `crm_customers.identity_id`(CRM) | **재사용(§57 Canonical Person Graph)** | Customer person consolidation(email/phone/kakao·비파괴). Monetary Participant/Beneficiary 아님·재생성 금지 |
| `referral_signup`(Referral) | **VALIDATED_LEGACY** | Referrer/Referee 역할분리 정본(Part 4-4)·Referrer·Referee Relationship 참조 |
| `PartnerPortal`(partner_account) | **KEEP_SEPARATE_WITH_REASON** | 공급망 운영 파트너 서브계정(supplier/logistics/warehouse)·보상 수령자 아님. 격리 패턴 참조 |
| `AgencyPortal`(agency_client_link) | **KEEP_SEPARATE_WITH_REASON** | 마케팅 대행 위임(approved 게이트·fail-closed)·보상 수령자 아님. 위임 패턴 참조 |
| Participant/Beneficiary Identity·Role Assignment·Payout Recipient/Beneficial Owner/Tax Subject·Recipient Verification(KYC/KYB)·Shared Account·Multi-beneficiary·Identity Confidence·structured Alias/Merge/Unmerge·Canonical Organization·Affiliate/Creator/Seller monetary identity | **UNVERIFIED → NOT_APPLICABLE** | 부재(grep 0)·신설 |

**중복 감사(§48)**: **Canonical Person=crm identity 단일(재사용·중복 금지)**·Partner=PartnerPortal·Agency=AgencyPortal(도메인 분리·중복 없음). ★도입 시 **Reward 유형별 독립 Identity Registry 금지·Canonical Person/Organization 중복 생성 금지**. 중복 발견 시 즉시 삭제 금지→Migration/Compatibility.

## 11. 기능 후퇴 방지 · 검증 게이트 (§54) · 영구 규칙

**후퇴 방지**: crm identity·referral_signup·PartnerPortal·AgencyPortal·`/api/agency/*`·`/api/partner/*`·기존 Customer/Partner/Seller Identity·Portal·Settlement·Payout 기능 보존(회귀 0).
**게이트(§54)**: Participant≠Beneficiary·Beneficiary≠Payout Recipient·Customer/Affiliate/Creator/Seller 역할구분·Referrer≠Referee·Person/Organization Mapping·**Account Owner≠Authorized User·Shared Account Role·Multi-beneficiary Allocation·Payout Recipient Verification·Beneficial Owner/Tax Subject Reference·금융 식별정보 원문 미저장·Historical Validity·Alias/Merge/Unmerge History·Identity Confidence**·Candidate Role/Verification/Scope·Reconciliation·Coverage/Gap/Evidence·Wrong-recipient/Cross-tenant Guard·Golden/Conformance·**기존 Identity 중복 생성 없음**·회귀 0·ADR/PM/Repeat Problem/Agent History.
**영구 규칙(§57)**: 신규 현금성 보상 Identity 도입 전 **기존 Canonical Person(crm identity)/Organization/Partner/Seller 재사용(중복 금지)** · Participant/Beneficiary/Payout Recipient/Beneficial Owner/Tax Subject 역할분리 · **이메일/전화 단독 확정 금지(Provider Account+External ID+Reward Account+Contract+Tenant+Legal Entity+Verified Identifier+Historical Validity 종합)** · Shared Account Role·Multi-beneficiary Allocation · Recipient Verification·Low-confidence 자동확정 금지 · **금융 식별정보 Tokenized/Masked만** · Append-only Alias/Merge/Historical Validity(과거 귀속 보존) · Candidate/Reconciliation/Coverage · Lint/Guard · 중복/후퇴 검사 · ADR/PM 기록. **crm identity(Customer)↔Monetary Participant/Beneficiary·PartnerPortal/AgencyPortal(운영)↔보상 수령자 오혼입 금지 · Reward 유형별 독립 Identity Registry 중복 생성 금지.**

## 12. Shared Account Matrix (§52) · Verification Matrix (§53) — 현행

| Account | Owner | Member | Role | Contribution | Redemption | Payout | Valid From | Valid To | Status |
|---|---|---|---|---|---|---|---|---|---|
| (Shared Reward Account) | — | — | — | — | — | — | — | — | **N/A(신설)** |
| AgencyPortal(위임·참조) | agency_account | client tenant | scope_json.write | N/A | N/A | N/A | link created | revoked | KEEP_SEPARATE |

| Beneficiary | Recipient | Verification Type | Provider | Requested | Verified | Expiry | Result | Mismatch | Status |
|---|---|---|---|---|---|---|---|---|---|
| (Payout Recipient) | — | — | — | — | — | — | — | — | **N/A(신설·KYC/KYB 부재)** |
