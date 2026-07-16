# CANONICAL DSAR — Rebate Participant & Enrollment Governance (Participant·Role·Enrollment·Registration·Verification·Status·Duplicate Guard·Reconciliation)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-6 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 정본 쌍: [`CANONICAL_DSAR_REBATE_ELIGIBILITY_QUALIFICATION.md`](CANONICAL_DSAR_REBATE_ELIGIBILITY_QUALIFICATION.md)(Eligibility/Criteria/Qualification/Holdback/Maturity/Disqualification/Evaluation) + 본 문서(Participant/Role/Enrollment/Registration/Verification/Status/Duplicate/Reconciliation/Guard).
> ADR: [`../architecture/ADR_DSAR_REBATE_ELIGIBILITY_QUALIFICATION_ENROLLMENT.md`](../architecture/ADR_DSAR_REBATE_ELIGIBILITY_QUALIFICATION_ENROLLMENT.md).
> 선행: Program Master(4-5-3-1-1 **§18/§19 Participant·Beneficiary·Claimant Scope·Merchant≠Seller·Vendor≠Supplier**)·Funding(4-5-3-1-3 **Sponsor≠Funder≠Payer**·Recipient Verification 부재)·Lifecycle(4-5-3-1-4 Grandfathering·in-flight)·Rule(4-5-3-1-5).
> **범위**: 참여자 등록/식별/검증/상태만 — Accrual/Claim/Settlement/Payout 실행 아님(후속 4-5-3-1-7~9).

---

## 0. 실측 요약 — 현행 대비(실측 → Canonical) ★정직 최우선

| 프롬프트 요구 | 현행 실측(코드 근거) | Canonical 분류 |
|---|---|---|
| **Rebate Participant / Enrollment 엔진** | ❌ **부재(grep 0)** — `rebate_particip/rebate_enroll` 전무 | **NOT_APPLICABLE → 신설** |
| **Enrollment Store(실 정본)** | ✅ **REAL** — `journey_enrollments`(tenant_id·journey_id·**customer_id·session_id**·current_node·**status DEFAULT 'active'**·entered_at·completed_at·revenue·[JourneyBuilder.php:42](../../backend/src/Handlers/JourneyBuilder.php)/68)·INSERT(:201)·**상태별 집계**(:243)·인덱스(:70)·**자가치유 ALTER**(:83) | **재사용(§30 Enrollment 구조·상태·진입/완료 시각)** |
| **★역할 분리 참여자(실 정본)** | ✅ **REAL** — `Referral`: **referrer_user_id ≠ referred_user_id**(역할 분리·[Referral.php:51](../../backend/src/Handlers/Referral.php)/53/58 idx_referrer)·**보상 수령=referrer·조건 충족 주체=referred**(:250-252) | **재사용(§28 Role·§4.4 Participant≠Beneficiary 실 사례)** |
| **중복 참여 방지(원자성)** | ✅ **REAL** — **`referred_user_id UNIQUE` + 멱등**("1명당 정확히 1회"·:16/51/65)·**`user_id UNIQUE`/`code UNIQUE`**(:44-45/62-63) · **CouponRedeem 조건부 UPDATE + rowCount 원자화**([CouponRedeem.php:136](../../backend/src/Handlers/CouponRedeem.php)) | **재사용(§32 Duplicate Guard·TOCTOU 정본)** |
| **참여자 Identity(주체)** | ✅ **REAL** — SupplyChain sc_suppliers↔wms_suppliers·PartnerPortal(supplier/logistics/warehouse 서브계정)·channel_credential seller_id·auth_tenant(4-5-3-1-1 §18/§19 재사용) | **재사용(Identity·중복 신설 금지)** |
| **CRM Identity 통합** | ✅ **REAL** — CRM `identity_id`(union-find·RFM/세그/stats 전파·267차)·확률 아이덴티티(read-only 후보→승인 병합·282차) | **재사용(§31 Identity Resolution·자동 병합 금지 정합)** |
| **DSAR 참여 데이터 삭제 경로** | ✅ **REAL** — `Dsar`(journey_enrollments 조회 :466·**자식(journey_node_logs/sent) 선삭제 후 부모**·[Dsar.php:617](../../backend/src/Handlers/Dsar.php)-634) | **참조(§35 Erasure·참조 무결성 순서)** |
| **Recipient Verification(KYC)** | ❌ **부재**(4-5-3-1-1/1-3 확정) | **NOT_APPLICABLE → 신설** |
| **Rebate Participant/Role/Enrollment(rebate)/Registration/Consent/Verification/Status/Reconciliation** | ❌ 부재 | **NOT_APPLICABLE → 신설** |

**★결론(정직)**: **Rebate Participant/Enrollment 엔진은 부재(NOT_APPLICABLE·grep 0)**. 실 인접=Enrollment 구조(journey_enrollments status/entered_at/completed_at)·**역할 분리(Referral referrer≠referred·보상 수령자와 조건 충족 주체가 다름)**·**중복 방지(UNIQUE+조건부 UPDATE rowCount)**·Identity(SupplyChain/PartnerPortal/channel_credential/CRM identity_id)·Erasure(Dsar 참조 무결성 순서). **★핵심 정직: §4.3 Enrollment≠Eligibility(등록≠자격·자격≠자동 등록)·§4.4 Participant≠Beneficiary≠Claimant(4-5-3-1-1 계승·Referral 실 사례)·§4.7 중복 참여=UNIQUE+원자적 조건부 UPDATE(사전체크만으론 TOCTOU)**. **기존 Identity/Enrollment 인프라 재사용(중복 신설 금지·§40)**·Recipient Verification 부재(신설)·지어내기·NO_DATA/오탐 금지·전방호환 계약.

### ★인접 관찰(설계 근거·본 세션 코드변경 0)
- **journey_enrollments에는 `program/rule version pin`·`consent`·`verification` 개념이 없다**(마케팅 저니 참여용). Rebate Enrollment는 **금전 귀속 주체**이므로 Version pin(4-5-3-1-4)·Verification(KYC)·Legal Entity가 필수 — **journey_enrollments를 이름만 바꿔 복제 금지(§4.13·4-5-3-1-1 §4 "Cashback Registry 복제 금지" 정신 계승)**.
- **CouponRedeem 주석 실측**: "사전체크는 빠른 실패용 유지"(:136) — **사전 체크는 UX·원자성은 조건부 UPDATE+rowCount가 담당**. Rebate Enrollment/Claim 중복 방지도 **동일 2층 구조 계승(사전체크만 신뢰 금지)**.

---

## 1. Canonical Entity (17) — §5 (이번 블록)

REBATE_PARTICIPANT·PARTICIPANT_ROLE·PARTICIPANT_IDENTITY_BINDING·ENROLLMENT·ENROLLMENT_REQUEST·ENROLLMENT_APPROVAL·ENROLLMENT_STATUS_HISTORY·REGISTRATION_SOURCE·PARTICIPANT_CONSENT·RECIPIENT_VERIFICATION·VERIFICATION_DOCUMENT_REFERENCE·PARTICIPANT_SUSPENSION·DUPLICATE_GUARD·PARTICIPANT_MERGE_CANDIDATE·ENROLLMENT_RECONCILIATION·PARTICIPANT_EVIDENCE·PARTICIPANT_AUDIT_EVENT.
**현행 실체**: Enrollment 구조(journey_enrollments)·역할 분리(Referral referrer/referred)·중복 방지(UNIQUE+rowCount)·Identity(SupplyChain/PartnerPortal/channel_credential/CRM identity_id)·Erasure(Dsar) = REAL 재사용. Recipient Verification/Consent(rebate)/Approval = **신설**.

## 2. Participant (§27) · Role (§28) ★Participant≠Beneficiary≠Claimant

- **Participant(§27)**: rebate_participant_id·program·**canonical_organization/customer_id·participant_type·identity binding·tenant·legal_entity·region/country·currency·external_participant_id·source_of_truth·status·valid_from/to**·version·evidence. Type(14): MERCHANT·SELLER·VENDOR·SUPPLIER·DISTRIBUTOR·DEALER·RESELLER·RETAILER·PARTNER·MANUFACTURER·BRAND·CUSTOMER·EMPLOYEE·OTHER. → **4-5-3-1-1 §18/§19 Scope 재사용(Merchant≠Seller·Vendor≠Supplier·동일 조직 다중 역할=Organization과 Role 분리)**.
- **Role(§28, 10)**: PARTICIPANT(참여 주체)·**BENEFICIARY**(수혜자)·**CLAIMANT**(청구 주체)·**QUALIFYING_ENTITY**(조건 충족 주체)·PURCHASER·SELLER_OF_RECORD·PAYEE(지급 수령)·AUTHORIZED_REPRESENTATIVE·DATA_SOURCE·AUDIT_CONTACT. **하나의 Participant 다중 Role·Role별 Validity**.
**★§4.4 Participant≠Beneficiary≠Claimant≠Payee(4-5-3-1-1 계승)** — **현행 실 사례**: Referral에서 **조건 충족 주체=referred(피추천·30일 유지)·보상 수령=referrer(추천인)**(Referral.php:51/250-252) = **QUALIFYING_ENTITY≠BENEFICIARY의 실 정본**. Rebate: **구매자(Purchaser)≠수혜자(Beneficiary)≠청구자(Claimant)≠수령자(Payee) 자동 동일시 금지**(Sell-through rebate에서 구매=Distributor·수혜=Retailer 가능).

## 3. Identity Binding (§29) · Merge Candidate (§31)

- **Identity Binding(§29)**: identity_binding_id·participant·**canonical identity reference(SupplyChain sc_suppliers/wms_suppliers·PartnerPortal 서브계정·channel_credential seller_id·CRM identity_id·auth_tenant)·external_id·source_system·binding confidence·verified**·valid from/to·evidence. **★기존 Identity 재사용(중복 Identity Store 신설 금지·4-5-3-1-1 §6.10)·이름만으로 동일 판단 금지(§11 계승)**.
- **Merge Candidate(§31)**: 후보 participant 쌍·매칭 근거·confidence·**read-only 후보→승인 병합→되돌리기**. **★현행 정본 재사용**: CRM identity_id(union-find·267차)·**확률 아이덴티티=read-only 후보→승인 병합→되돌리기(282차)** = **자동 병합 금지 정합**. **★금전 귀속 주체 자동 병합 금지(오병합=타인에게 지급)·승인+되돌리기 필수**.

## 4. Enrollment (§30) · Request/Approval (§30b) · Status (§30c) ★Enrollment≠Eligibility

- **Enrollment(§30)**: enrollment_id·program·participant·**program version pin(4-5-3-1-4)·enrollment_mode·registration source·enrolled_at·effective_from/to·status·terms version reference·consent reference·verification reference·grandfathered version(4-5-3-1-4 §18)·idempotency_key**·evidence. **★현행 구조 재사용**: journey_enrollments(status DEFAULT 'active'·entered_at·completed_at·상태별 집계 :243) — **단, Version pin/Consent/Verification/Legal Entity는 부재→신설(복제 금지·§0 관찰)**.
- **Mode(§30a, 6)**: OPT_IN(명시 신청)·AUTO_ENROLL(자격 충족 시 자동)·CONTRACT_BOUND(계약 발효 시)·INVITATION·MANUAL_OPERATOR·IMPORT/MIGRATION(4-5-3-1-4 §27 Legacy). **★§4.3 Enrollment≠Eligibility — 등록했다고 자격 아님(자격은 별도 평가·Eligibility 문서 §22)·자격 있다고 자동 등록 아님(AUTO_ENROLL은 명시 정책일 때만·묵시적 자동 등록 금지)**. **★Enrollment 요구 여부는 Program 정책(Eligibility 문서 §18)에서 선언·미선언 시 기본=등록 필요(fail-closed)**.
- **Request/Approval(§30b)**: 신청·심사·승인/거절·사유·승인자·만료(4-5-3-1-4 §11 Approval 재사용·**승인 없는 등록 금지**).
- **Status(§30c, 9)**: PENDING_APPROVAL·PENDING_VERIFICATION·ACTIVE·SUSPENDED·GRANDFATHERED·CLOSED_TO_NEW·WITHDRAWN·TERMINATED·ARCHIVED. **Status History**: 전이 이력 Append-only(**물리 삭제 금지**·4-5-3-1-4 §4.13 계승)·전이 사유·행위자.

## 5. Consent (§33) · Recipient Verification (§34) · Erasure (§35)

- **Consent(§33)**: participant_consent_id·participant·**terms version reference·consent type·granted/withdrawn_at·evidence(IP/시각/방법)·language·withdrawal 처리**·evidence. Type(6): PROGRAM_TERMS·DATA_PROCESSING·TAX_REPORTING·PAYOUT_TERMS·MARKETING(**KEEP_SEPARATE — crm_channel_prefs/isMarketingSendAllowed 재사용·rebate consent와 혼용 금지**)·CUSTOM. **★Terms 개정 시 재동의 정책 필수(4-5-3-1-4 §24 UNFAVORABLE 변경=통지/Grandfathering 정합)**.
- **Recipient Verification(§34)**: verification_id·participant·**verification_type·status·verified_at·expires_at·재검증 주기·document reference(★원문 저장 금지·Authorized Reference·4-5-3-1-3 §9 계승)·검증 기관·실패 사유**·evidence. Type(8): IDENTITY(KYC)·BUSINESS_REGISTRATION·TAX_ID·BANK_ACCOUNT·SANCTIONS_SCREENING·ADDRESS·AUTHORIZED_SIGNATORY·CUSTOM. **★부재→신설(4-5-3-1-1/1-3 확정)·★검증 미통과 참여자에 Payout 금지(fail-closed·실 지급은 4-5-3-1-8 후속)·검증 만료 시 재검증(1회 검증 영구 신뢰 금지·Eligibility §22a 정합)**.
- **Erasure(§35)**: DSAR 삭제/익명화 요청 시 **금전 원장(Accrual/Claim/Settlement/Payout)은 법정 보존기간 내 삭제 금지 → 참여자 PII만 익명화·원장은 pseudonymous reference 유지**(헌법 No-PII·4-5-3-1-4 Archive/Retention 정합). **★현행 참조**: Dsar가 **자식(journey_node_logs/sent) 선삭제 후 부모(journey_enrollments) 삭제**(Dsar.php:617-634)=**참조 무결성 순서 정본**. **★Rebate는 "삭제"가 아니라 "익명화+보존"이 기본(금전/세무 의무)·삭제 요청을 무조건 물리 삭제로 처리 금지**.

## 6. Duplicate Guard (§32) · Suspension (§36) · Reconciliation (§37) · Guard/Error (§38)

- **★Duplicate Guard(§32)**: **①선언적 UNIQUE**(현행 정본: `referred_user_id UNIQUE`·`user_id UNIQUE`·`code UNIQUE`·Referral.php:44-45/51/62-65) **②원자적 조건부 UPDATE + rowCount**(현행 정본: CouponRedeem `use_count<max_uses` 조건부 UPDATE·"사전체크는 빠른 실패용 유지"·:136) **③Idempotency Key**. **★사전 SELECT 체크만으로 중복 방지 금지(TOCTOU)·"1 Participant × 1 Program × 1 Period = 최대 1 Enrollment" UNIQUE 강제·동일 거래 다중 Participant 귀속 금지(4-5-3-1-3 §4.10 Double Funding 대칭)**.
- **Suspension(§36)**: participant 단위 정지(program 단위=4-5-3-1-4 §13과 구별)·사유·기간·기 발생 Accrual 처리(Eligibility §23 정합)·복권.
- **Reconciliation(§37, 12)**: Participant↔Identity·Role↔실 수령자·Enrollment↔Eligibility 평가·Enrollment↔Program Version pin·Status↔전이 이력·Consent↔Terms Version·Verification↔만료·Duplicate↔UNIQUE·Participant↔Provider/외부 명세·Grandfathered↔pinned Version·Merge 후보↔승인 이력·Erasure↔보존 의무.
- **Guard/Error(§38, 14)**: ENROLLMENT_WITHOUT_APPROVAL·ENROLLMENT_VERSION_PIN_MISSING·DUPLICATE_ENROLLMENT·DUPLICATE_IDENTITY_AUTO_MERGE_BLOCKED·CONSENT_MISSING·TERMS_VERSION_STALE·VERIFICATION_MISSING/EXPIRED·PAYEE_NOT_VERIFIED·ROLE_CONFLATION(Participant/Beneficiary/Claimant/Payee 동일시)·CROSS_TENANT_PARTICIPANT·WRONG_LEGAL_ENTITY·ENROLLMENT_HISTORY_DELETE_BLOCKED·ERASURE_LEDGER_DELETE_BLOCKED·TOCTOU_PRECHECK_ONLY. → Critical 시 Access Review 차단.

## 7. Participant Matrix (§45) · Enrollment Matrix (§46) — 현행

| Program | Participant | Role 분리 | Identity | Verification | Consent | 중복 방지 | Version Pin | Evidence |
|---|---|---|---|---|---|---|---|---|
| (Rebate Participant) | — | — | — | — | — | — | — | **NOT_APPLICABLE(신설)** |
| **인접(정본): 추천보상** | referrer / referred | **★수혜=referrer·조건충족=referred**(:250-252) | user_id | N/A(부재) | N/A | **referred_user_id UNIQUE + 멱등**(:16/51) | N/A | referral_signup |
| 인접(재사용): 저니 | customer/session | N/A | customer_id | N/A | (마케팅 동의 별도) | N/A | **N/A(부재·복제 금지)** | journey_enrollments(:42/243) |
| 인접(재사용): 공급사 | supplier | N/A | sc_suppliers↔wms_suppliers | N/A | N/A | wms_id 매핑 | N/A | SupplyChain |
| 인접(재사용): CRM | customer | N/A | **identity_id(union-find)** | N/A | crm_channel_prefs | **확률병합=승인+되돌리기** | N/A | CRM(267/282차) |

| Enrollment | Mode | Status | 승인 | 상태 이력 | Erasure | 현행 정본 |
|---|---|---|---|---|---|---|
| (Rebate Enrollment) | — | — | — | — | — | **N/A(신설)** |
| 인접(재사용): 저니 | 조건 진입 | **status 'active'**·completed_at | N/A | N/A | **자식 선삭제 후 부모**(Dsar.php:617-634) | journey_enrollments(:42/201) |
| 인접(재사용): 쿠폰 | 발급/리딤 | is_revoked·redeemed_at | N/A | N/A | N/A | **조건부 UPDATE+rowCount**(:136) |
