# CANONICAL DSAR — Monetary Reward Identity Model (Profile·Participant·Beneficiary·Role·Source·Identifier·Relationship)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-1-3 · 289차(2026-07-16) · **비파괴 설계 명세 — 코드변경 0**
> 정본 쌍: 본 문서(Profile/Participant/Beneficiary/Role/Identifier) + [`CANONICAL_DSAR_MONETARY_IDENTITY_GOVERNANCE.md`](CANONICAL_DSAR_MONETARY_IDENTITY_GOVERNANCE.md)(Verification·Shared·Alias/Merge·Candidate·Reconciliation·Guard·Test).
> ADR: [`../architecture/ADR_DSAR_MONETARY_REWARD_IDENTITY_GOVERNANCE.md`](../architecture/ADR_DSAR_MONETARY_REWARD_IDENTITY_GOVERNANCE.md).
> 선행: Monetary Reward Entity Model(4-5-1-2)·Provider Inventory(4-5-1-1)·Reward Governance(4-4)·EPIC05 Customer Identity Graph·Merge.

---

## 0. 실측 요약 — 현행 대비(실측 → Canonical) ★정직 최우선

| 프롬프트 요구 | 현행 실측(코드 근거) | Canonical 분류 |
|---|---|---|
| **Canonical Person Identity** | ✅ **REAL(Customer만)** — `crm_customers.identity_id`(CRM.php): 한 사람의 다중 연락처(email/phone/kakao)를 canonical `idt_` identity로 통합·**원본 행 보존(비파괴)**·멱등 ALTER·LTV/세그먼트 파편화 방지·best-effort merge(동일 phone/kakao) | **재사용(§57 Canonical Person Graph 연결·재생성 금지)** — Customer person consolidation. **Monetary Participant/Beneficiary 아님** |
| **Referrer / Referee Identity 분리** | ✅ **REAL** — `referral_signup`(referrer_user_id/referred_user_id 분리·Part 4-4) | **VALIDATED_LEGACY**(역할분리 정본·Referrer↔Referee Relationship 참조) |
| **Partner / Vendor Identity** | △ `PartnerPortal`(partner_account·partner_session·**supplier/logistics/warehouse** 서브계정·본사 분리·유형별 최소권한·bcrypt) | **KEEP_SEPARATE_WITH_REASON**(**공급망 운영 파트너**·현금성 보상 수령자 아님. 격리 패턴 참조) |
| **Agency Identity** | △ `AgencyPortal`(agency_account·**agency_client_link** N:N 위임·approved 게이트·fail-closed·scope_json) | **KEEP_SEPARATE_WITH_REASON**(**마케팅 대행 위임**·보상 수령자 아님. 위임·승인 패턴 참조) |
| **Affiliate / Creator / Influencer / Seller Monetary Identity** | ❌ 보상 수령자로서 부재. seller_id=마켓 채널 field·`influencer_store`=마케팅 데이터(Part 4-5-1-1) | **NOT_APPLICABLE → 신설** |
| **Canonical Organization Identity** | ❌ crm identity=person만(Organization identity graph 부재) | **NOT_APPLICABLE → 신설** |
| **Payout Recipient / Beneficial Owner / Tax Subject Reference** | ❌ **부재(grep 0)** — payout_recipient/beneficial_owner/tax_subject/tax_identifier 전무 | **NOT_APPLICABLE → 신설(Tokenized Reference)** |
| **Recipient Verification (KYC/KYB)** | ❌ **부재(grep 0)** — kyc/kyb/sanctions 전무(프론트 vendor-react 번들 hit는 라이브러리·무관) | **NOT_APPLICABLE → 신설** |
| **Shared Account Membership / Authorized User** | ❌ **부재(grep 0)** — shared_account/authorized_user 전무 | **NOT_APPLICABLE → 신설** |
| **Multi-beneficiary Allocation · Identity Confidence · structured Alias/Merge/Unmerge History** | ❌ 부재(crm merge=best-effort·history 미보존) | **NOT_APPLICABLE → 신설** |
| **Monetary Identity Profile / Participant Identity / Beneficiary Identity / Role Assignment** | ❌ 부재 | **NOT_APPLICABLE → 신설(전방호환)** |

**★결론(정직)**: **현금성 보상의 Participant/Beneficiary/Payout Recipient/Beneficial Owner/Tax Subject를 구분하는 Identity Governance는 부재**. 실체=**Customer person consolidation**(`crm_customers.identity_id`·재사용 기반)·**Referrer/Referee 역할분리**(referral_signup)·**운영 서브계정/위임**(PartnerPortal 공급망·AgencyPortal 대행·KEEP_SEPARATE). **KYC/KYB·payout recipient·beneficial owner·tax subject·shared account·multi-beneficiary·recipient verification·identity confidence 전부 부재(신설)**. **★핵심 구분: crm identity=Customer 통합(보상 Participant/Beneficiary 아님·§57 Canonical Person Graph 재사용 대상) · PartnerPortal/AgencyPortal=운영 계정/위임(보상 수령자 아님)**. 본 Identity Model=멀티테넌트 고객용 미래 현금성 보상 Identity의 전방호환 계약. **기존 Canonical Person/Organization/Partner/Seller 재사용(중복 금지·§57)**·금융 식별정보 원문 저장 금지·지어내기 금지.

---

## 1. Canonical Entity (23) — §6

MONETARY_IDENTITY_PROFILE·PARTICIPANT_IDENTITY·BENEFICIARY_IDENTITY·IDENTITY_SOURCE·IDENTITY_IDENTIFIER·IDENTITY_ROLE_ASSIGNMENT·IDENTITY_RELATIONSHIP·IDENTITY_ALIAS·IDENTITY_MERGE·IDENTITY_UNMERGE·IDENTITY_VALIDITY·RECIPIENT_VERIFICATION·BENEFICIAL_OWNER_REFERENCE·TAX_SUBJECT_REFERENCE·PAYOUT_RECIPIENT_REFERENCE·SHARED_ACCOUNT_MEMBERSHIP·MULTI_BENEFICIARY_ALLOCATION·IDENTITY_CANDIDATE·IDENTITY_RECONCILIATION·IDENTITY_COVERAGE·IDENTITY_GAP·IDENTITY_EVIDENCE·IDENTITY_AUDIT_EVENT.
**현행 실체**: PARTICIPANT/PERSON(crm identity·Customer만·재사용)·Referrer/Referee Relationship(referral_signup) = REAL. 나머지 = **신설**.

## 2. Monetary Identity Profile (§7)

provider·account·program 당: monetary_identity_profile_id·provider_id·provider_account_id·reward_program_id·tenant_id·brand_id·legal_entity_id·**supported participant/beneficiary types·identity sources·primary/secondary identifiers·organization model·shared account model·verification model·beneficial owner model·tax subject model·payout recipient model·merge model·historical coverage·source of truth**·version·status·owner·evidence. → 부재·신설.

## 3. Participant Identity (§8) · Type (§10)

participant_identity_id·participant_id·**participant type**·canonical person id·canonical organization id·customer id·loyalty member id·seller/vendor/partner/affiliate/creator/influencer/employee id·provider participant id·provider account·tenant·brand·legal entity·status·valid from/to·**identity confidence·verification status**·evidence.
**Type(21)**: CUSTOMER·LOYALTY_MEMBER·BUYER·REFERRER·REFEREE·AFFILIATE·CREATOR·INFLUENCER·SALESPERSON·EMPLOYEE·SELLER·VENDOR·PARTNER·AGENCY·RESELLER·ORGANIZATION·MERCHANT·PLATFORM·FUNDING_PARTY·SETTLEMENT_COUNTERPARTY·UNKNOWN.
**현행**: canonical person id=**crm_customers.identity_id 재사용**(Customer/Referrer/Referee만 매핑 가능)·나머지 Type=신설. **★§5.3 Customer≠Affiliate 자동통합 금지·§5.8 이메일/전화 단독 확정 금지**.

## 4. Beneficiary Identity (§9) · Type (§11)

beneficiary_identity_id·beneficiary id·monetary reward id·participant id·**beneficiary type**·canonical person/organization id·reward account owner·**payout recipient reference·beneficial owner reference·tax subject reference·allocation ratio·allocated amount reference**·tenant·brand·legal entity·verification status·identity confidence·valid from/to·status·evidence.
**Type(21)**: INDIVIDUAL_CUSTOMER·LOYALTY_MEMBER·REFERRER·REFEREE·AFFILIATE·CREATOR·INFLUENCER·SALESPERSON·EMPLOYEE·SELLER·VENDOR·PARTNER·AGENCY·RESELLER·ORGANIZATION·LEGAL_ENTITY·SHARED_ACCOUNT·JOINT_BENEFICIARY·BENEFICIAL_OWNER·OTHER·UNKNOWN.
**현행**: Beneficiary Identity 부재·신설. **★§5.1 Participant≠Beneficiary·§5.2 Beneficiary≠Payout Recipient(조직 Beneficiary·대표 Payout·법인 Tax Subject·개인 Beneficial Owner)**.

## 5. Role Assignment (§12)

role_assignment_id·monetary reward id·identity id·**role type**·source·assigned_at·effective from/to·confidence·verification status·status·evidence.
**Role Type(25)**: TRIGGERING_CUSTOMER·PURCHASER·REWARD_EARNER·PARTICIPANT·ACCOUNT_OWNER·BENEFICIARY·PAYOUT_RECIPIENT·BENEFICIAL_OWNER·TAX_SUBJECT·REFERRER·REFEREE·ATTRIBUTED_AFFILIATE·ATTRIBUTED_CREATOR·ATTRIBUTED_INFLUENCER·SELLER·VENDOR·PARTNER·AGENCY·RESELLER·EMPLOYEE·APPROVER·FUNDING_PARTY·SETTLEMENT_COUNTERPARTY·ADMIN·UNKNOWN.
**현행**: 부재·신설. **한 Reward에 다중 Role 동시 존재 가능**(Triggering Customer·Reward Earner·Beneficiary·Payout Recipient 각각). **Referral referrer(수령 Role)≠referee(발생 Role)=실 사례**.

## 6. Identity Source (§13) · Identifier (§14)

- **Source(21)**: CRM·CDP·COMMERCE·SUBSCRIPTION·LOYALTY·PAYMENT·REWARD_PROVIDER·AFFILIATE_PLATFORM·CREATOR_PLATFORM·MARKETPLACE·SELLER_PORTAL·PARTNER_PORTAL·HR_SYSTEM·ERP·ACCOUNTING·PAYOUT_PROVIDER·KYC_PROVIDER·KYB_PROVIDER·TAX_PROVIDER·MANUAL_ADMIN·DATA_WAREHOUSE. → 현행 CRM·COMMERCE·LOYALTY·PAYMENT·PARTNER_PORTAL(PartnerPortal)·MANUAL_ADMIN=REAL·KYC/KYB/TAX/AFFILIATE/CREATOR_PLATFORM=부재.
- **Identifier(22)**: CANONICAL_PERSON_ID·CANONICAL_ORGANIZATION_ID·CUSTOMER_ID·LOYALTY_MEMBER_ID·REWARD_ACCOUNT_ID·PARTICIPANT_ID·BENEFICIARY_ID·AFFILIATE_ID·CREATOR_ID·INFLUENCER_ID·SELLER_ID·VENDOR_ID·PARTNER_ID·EMPLOYEE_ID·PAYOUT_RECIPIENT_ID·**BENEFICIAL_OWNER_REFERENCE·TAX_SUBJECT_REFERENCE(Tokenized)**·VERIFIED_EMAIL·VERIFIED_PHONE·EXTERNAL_ACCOUNT_ID·CONTRACT_REFERENCE·WALLET_REFERENCE·**BANK_REFERENCE_TOKEN**. **★§5.10 금융 식별정보 원문 금지·Tokenized/Masked Reference만**. → CANONICAL_PERSON_ID(crm identity_id)·CUSTOMER_ID·VERIFIED_EMAIL/PHONE·SELLER_ID(마켓)=REAL·나머지 신설.

## 7. Identity Relationship (§15) · Referrer·Referee (§16) · Affiliate/Creator/Seller/Employee (§17~§20)

- **Relationship(§15, 24)**: PERSON_TO_{CUSTOMER/LOYALTY_MEMBER/AFFILIATE/CREATOR/INFLUENCER/EMPLOYEE}·ORGANIZATION_TO_{SELLER/VENDOR/PARTNER/AGENCY/RESELLER}·PARTICIPANT_TO_REWARD_ACCOUNT·PARTICIPANT_TO_BENEFICIARY·BENEFICIARY_TO_{PAYOUT_RECIPIENT/BENEFICIAL_OWNER/TAX_SUBJECT}·**REFERRER_TO_REFEREE**·CREATOR_TO_AGENCY·SELLER_TO_LEGAL_ENTITY·PARTNER_TO_LEGAL_ENTITY·ACCOUNT_OWNER_TO_AUTHORIZED_USER·SHARED_ACCOUNT_TO_MEMBER·ORGANIZATION_TO_ADMIN·PREVIOUS_IDENTITY_TO_CURRENT_IDENTITY. → PERSON_TO_CUSTOMER(crm)·REFERRER_TO_REFEREE(referral_signup)=REAL·나머지 신설.
- **Referrer·Referee(§16)**: referral_identity_relationship_id·referrer/referee identity·referral code reference·provider·campaign·qualifying event·valid from/to·**fraud state**·status·evidence. → **REAL(referral_signup·referrer_user_id/referred_user_id·먹튀게이트 fraud state·Part 4-4)**·Identity Governance 계약으로 승격.
- **Affiliate(§18)/Creator·Influencer Attribution(§17)/Seller·Vendor(§19)/Employee·Salesperson(§20)**: 각 external id·network/platform·contract reference·commission/settlement account·**payout recipient·beneficial owner·tax subject reference**·legal entity·valid from/to·status·evidence. **★§5.5 Seller/Vendor/Partner 동일 Organization 자동통합 금지·HR 민감정보 원문 복제 금지(§20)**. → 전부 부재·신설(seller_id는 마켓 field·Influencer=마케팅 데이터·PartnerPortal=공급망 운영 KEEP_SEPARATE).

## 8. Identity Matrix (§51) — 현행 실측

| Reward | Participant | Role | Beneficiary | Account Owner | Payout Recipient | Legal Entity | Verification | Confidence | Status |
|---|---|---|---|---|---|---|---|---|---|
| 구독 추천보상(Part 4-4) | referrer(app_user·crm identity) | REFERRER(수령)/REFEREE(발생) 분리 | referrer(수령) | N/A | N/A(coupon 비현금) | N/A | usable_from/retained gate | best-effort(crm) | REAL(역할분리) |
| (outbound 현금성 보상 Participant/Beneficiary) | — | — | — | — | — | — | — | — | **NOT_APPLICABLE(신설)** |
| Customer(person 통합·재사용 기반) | crm_customers.identity_id | N/A(보상 Role 아님) | — | — | — | N/A | N/A | best-effort | **재사용(§57)** |
| 공급망 파트너/대행(운영) | PartnerPortal/AgencyPortal 계정 | N/A(보상 수령자 아님) | — | — | — | N/A | bcrypt/approved gate | N/A | **KEEP_SEPARATE** |
