# Canonical Audience Eligibility — Core, Policy, Purpose/Channel, Identity, Identifier, Contactability & Reachability

> **EPIC 06-A Part 3-2** (1/3) · 289차 (2026-07-16) · **비파괴 설계 명세(코드변경 0)**
> 근거: Part 1(중앙 게이트 `CRM::isMarketingSendAllowed` `CRM.php:1118`·무게이트 경로 SEG-C1~C4) · Part 3-1 Audience Builder
> 형제: [`CANONICAL_AUDIENCE_FRESHNESS_DESTINATION.md`](CANONICAL_AUDIENCE_FRESHNESS_DESTINATION.md) · [`CANONICAL_AUDIENCE_ELIGIBILITY_GOVERNANCE.md`](CANONICAL_AUDIENCE_ELIGIBILITY_GOVERNANCE.md) · ADR=[`../architecture/ADR_CANONICAL_AUDIENCE_ELIGIBILITY_ENGINE.md`](../architecture/ADR_CANONICAL_AUDIENCE_ELIGIBILITY_ENGINE.md)
> **성격**: 목표 계약. **외부 채널 실행 아님**(§97). Consent/Suppression 상세=Part 3-3. 실 구현은 후속 승인 세션(verify+배포승인).

---

## 0. 현행 대비 (Part 1 실측 → Canonical)

| 현행 | Canonical 목표 |
|---|---|
| `CRM::isMarketingSendAllowed`(채널/토픽 opt-out+email suppression+quiet-hours+freq cap) `CRM.php:1118` | **CANONICAL_ELIGIBILITY_GATE**(정본) — 확장(Identity/Identifier/Freshness/Destination/Jurisdiction 추가) |
| 발송루프 per-recipient 게이트(Email/SMS캠페인/WhatsApp broadcast/WebPush) | 단계별(Build/Approval/Sync/Execution) Recheck 로 형식화 |
| **무게이트 경로**: /sms/send·/whatsapp/send·sendOne·/sms/broadcast(SEG-C1~C4) | **Eligibility Engine 강제**(우회 차단) — 선행 P0 구현세션 |
| Consent=contactability만·email 유효성=email_suppression 부분 | **Contactability ≠ Reachability 분리**(§3.3) |
| phone consent lookup key 아님(fail-open SEG-C4) | phone-키 Reachability·Identifier Eligibility |
| Freshness/Identity Confidence/Destination Readiness 체계 없음 | 신설 |

**무후퇴**: isMarketingSendAllowed·isFrequencyCapped·email_suppression·crm_channel_prefs 는 **정본 — 재구현 금지, Eligibility Core 로 확장**. 채널별 자체 Eligibility 신설 금지(§3.10).

---

## 1. Eligibility Entity Model (§4) & 상태 (§5-6)

Entity: `ELIGIBILITY_POLICY(_VERSION)` · `ELIGIBILITY_REQUEST` · `ELIGIBILITY_EVALUATION` · `ELIGIBILITY_RESULT` · `ELIGIBILITY_REASON` · `PURPOSE_POLICY` · `CHANNEL_ELIGIBILITY_POLICY` · `IDENTITY_ELIGIBILITY_POLICY` · `FRESHNESS_POLICY` · `IDENTIFIER_SELECTION_POLICY` · `DESTINATION_READINESS_POLICY` · `JURISDICTION_POLICY` · `ELIGIBILITY_OVERRIDE` · `ELIGIBILITY_RECHECK` · `ELIGIBILITY_RECONCILIATION`. (기존 동등 없음 — 전부 신규. isMarketingSendAllowed 는 CANONICAL_ELIGIBILITY_ENGINE 승격 대상.)

**상태(§5)**: ELIGIBLE / ELIGIBLE_WITH_WARNINGS / PREVIEW_ONLY / APPROVAL_REQUIRED / RECHECK_REQUIRED / PENDING_{DATA,IDENTITY,CONSENT,DESTINATION} / BLOCKED / EXPIRED / ERROR.
**차단 세분화(§6)**: BLOCKED_{SCOPE,PROFILE_STATUS,IDENTITY_CONFIDENCE,IDENTITY_CONFLICT,SHARED_IDENTIFIER,IDENTIFIER_MISSING,IDENTIFIER_UNVERIFIED,IDENTIFIER_INVALID,IDENTIFIER_EXPIRED,FRESHNESS,CONSENT,SUPPRESSION,JURISDICTION,DATA_CLASSIFICATION,DESTINATION_ACCOUNT,DESTINATION_CAPABILITY,DELETION,ANONYMIZATION,TEST_DATA,DEMO_DATA,POLICY,WRONG_TARGET_RISK}.

---

## 2. Request (§7) & Stage (§8) & Result (§9)

**Request(§7)**: eligibility_request_id · tenant/ws/brand/store · audience_id/version/snapshot · customer_profile_id · person_id · identity_version · purpose · channel · destination_account_id · requested_identifier_types · policy_version · evaluation_stage · evaluation_time · as_of_time · actor · environment · correlation_id · idempotency_key.

**Stage(§8)**: SEGMENT_PREVIEW / AUDIENCE_PREVIEW / AUDIENCE_BUILD / SNAPSHOT_APPROVAL / DESTINATION_PREPARE / DESTINATION_SYNC / CAMPAIGN_PREVIEW / AUTOMATION_PREVIEW / EXECUTION / RECONCILIATION / REMOVAL. 단계마다 허용 Warning·필수조건 상이.

**Result(§9)**: eligibility_result_id · status · **eligible · contactable · reachable**(분리) · purpose_eligible · channel_eligible · identity_eligible · freshness_eligible · destination_ready · consent_result_reference · suppression_result_reference · selected_identifier(_type/_version) · reasons · warnings · policy_versions · evaluated_at · valid_until · recheck_required_at · manual_review_required · override_allowed · lineage_id · audit_reference.

---

## 3. 핵심 분리 원칙

### 3.1 Segment Membership ≠ Eligibility (§3.1)
Segment 포함이어도 Profile 상태·Identity Confidence·Verified Identifier·Purpose·Channel·Brand·Region·Freshness·Consent·Suppression·Destination Account·Data Classification·Deletion 통과 못하면 실행 불가.

### 3.2 Eligibility ≠ Consent (§3.2)
Eligibility=종합 실행자격. **Consent Granted 여도 다른 조건으로 차단 가능.**

### 3.3 Contactability ≠ Reachability (§3.3) — ★현행 미분리 해소
- **Contactability**(§28): 정책상 연락 가능(purpose·channel·profile status·consent·suppression·legal·brand relationship·jurisdiction·frequency).
- **Reachability**(§29): 유효 Identifier 존재+기술적 전달가능(identifier exists/valid/verified·destination supports·provider ready·technical suppression·bounce/complaint·token expiry·channel availability).
- 예: 이메일 동의 有·유효 이메일 無 / 전화 有·SMS 불가 / Push 동의·유효 토큰 無 / 광고 개인화 허용·Destination 미지원 Identifier.

### 3.4 Unknown ≠ Eligible (§3.5)
Identity/Consent/Identifier Verification/Freshness/Destination/Jurisdiction/Classification Unknown = **기본 차단 또는 명시정책**. (현행 fail-open SEG-C4/M1 정면 교정.)

### 3.5 단일 Identifier 존재 ≠ 실행허용 (§3.6)
Verification·Validity·Expiry·Ownership·Source·Tenant/Brand Scope·Shared·Bounce/Complaint·Destination 지원·Hash Version·last verified 확인.

---

## 4. Policy Registry (§10-11) & Matrix (§99)

**Policy(§10)**: policy_id · policy_type · version · purpose · channel · jurisdiction · tenant/ws/brand/destination scope · required/excluded/warning conditions · recheck_policy · expiry · owner · approver · status · effective_from/to · test_suite · certification_status.
상태(§11): DRAFT/VALIDATING/VALID/APPROVED/ACTIVE/SUPERSEDED/DEPRECATED/SUSPENDED/REVOKED/BLOCKED.
**Matrix(§99)**: | Policy ID | Purpose | Channel | Identity Threshold | Identifier | Freshness | Destination | Recheck | Status | Version |

---

## 5. Purpose (§12-14)

**Registry(§12)**: ANALYTICS/REPORTING/CRM_READ/CRM_WRITE/EMAIL_MARKETING/TRANSACTIONAL_EMAIL/SMS_MARKETING/TRANSACTIONAL_SMS/PUSH_MARKETING/TRANSACTIONAL_PUSH/PERSONALIZED_ADVERTISING/RETARGETING/LOOKALIKE_SOURCE/PERSONALIZATION/RECOMMENDATION/AI_INSIGHT/AUTOMATION_PREVIEW/AUTOMATION_EXECUTION/EXPERIMENT/HOLDOUT/CUSTOMER_SUPPORT/EXPORT/COMPLIANCE.

**Purpose Eligibility Contract(§13)**: required profile status · min identity confidence · allowed identifier types · required consent purposes · suppression types · allowed data classifications · allowed attributes · freshness requirements · destination requirement · approval requirement · execution-time recheck · audit · fallback · prohibited conditions.

**Marketing ≠ Transactional(§14)**: Marketing Email ≠ 주문안내 Email · Marketing SMS ≠ 배송안내 · Marketing Push ≠ 보안알림 · 광고개인화 ≠ 분석 · CRM 조회 ≠ CRM 발송 · Audience 분석 ≠ 업로드. **Transactional 이 모든 제한 자동면제 아님**(현행 /sms/send 등 무게이트가 이 혼동의 위험사례 SEG-C1).

---

## 6. Profile Status Eligibility (§15-16)

**기본 허용**: IDENTIFIED/KNOWN/LEAD/PROSPECT/CUSTOMER/ACTIVE_CUSTOMER/RETURNING_CUSTOMER/SUBSCRIBER/REACTIVATED.
**제한/목적별**: ANONYMOUS/CHURN_RISK/CHURNED/FRAUD_SUSPECTED/SUPPRESSED/BLOCKED.
**기본 차단**: DELETION_PENDING/DELETED/ANONYMIZED.

**Anonymous(§16)**: Aggregate Analytics·Onsite Personalization·Session Recommendation·Consent내 Retargeting·Experiment 만 제한 허용. Email/SMS/CRM Write/PII Export/장기 자동화/Verified Identity 필요 Audience=기본 차단.

---

## 7. Identity Eligibility (§17-21)

**평가(§17)**: profile_id 존재 · person_id 필요여부 · identity_version · confidence · match/conflict/merge/unmerge status · shared identifier risk · manual review · deletion · identity freshness.
**Confidence 정책(§18)**: Purpose/Channel별 최소기준(Aggregate 낮음·Onsite 중간·CRM Write/발송 높음·Advertising Verified Identifier 필요·고위험 자동화 최고+승인). **정확 Threshold=Golden Dataset+운영증거로 확정**(임의 숫자 금지).
**Conflict 차단(§19)**: CONFLICT/POSSIBLE_MATCH/MANUAL_REVIEW/SHARED_IDENTIFIER_UNRESOLVED/MERGE_IN_PROGRESS/UNMERGE_IN_PROGRESS/PROFILE_SPLIT_PENDING/IDENTITY_VERSION_MISMATCH = 기본 차단.
**Merge·Unmerge Cooldown(§20-21)**: merge/unmerge/split/relink cooldown · affected channels/consumers · revalidation · cache purge · segment/audience refresh · override. **시간경과만으로 종료 금지** — Profile/Identity Graph Reconciliation·Consent/Suppression Projection·Membership/Snapshot 재생성·Cache Purge·Destination Removal·Audit 완료 검증. (EPIC05 Identity Graph·합성 buyer_email 자동병합 금지 승계.)

---

## 8. Identifier Eligibility & Selection (§22-27)

**Identifier 확인(§22)**: type · normalized value reference · verification/validation status · ownership confidence · source system/account · first_seen/last_verified · valid_from/to · expiry · bounce/complaint · shared · deletion · destination support · hash version · consent linkage.
**상태(§23)**: VERIFIED/UNVERIFIED/INVALID/EXPIRED/BOUNCED/COMPLAINT/SHARED/REUSED/REVOKED/DELETED/BLOCKED/PENDING_VERIFICATION.
**Type Registry(§24)**: EMAIL/PHONE/HASHED_EMAIL/HASHED_PHONE/PUSH_TOKEN/DEVICE_TOKEN/MOBILE_ADVERTISING_ID/PLATFORM_USER_ID/CRM_CONTACT_ID/COMMERCE_CUSTOMER_ID/ADVERTISING_ID/COOKIE_ID/ANONYMOUS_ID — 각 허용 Purpose/Destination 연결. (현행 AdAdapters=HASHED_EMAIL만.)

**Selection Policy(§25) — ★결정론**: ①Purpose ②Channel ③Verification ④Validity ⑤Consent linkage ⑥Suppression ⑦Destination 지원 ⑧Source Authority ⑨Recency ⑩Quality ⑪Stable Tie-breaker. **DB 반환순서 금지**(SEG dedup 원칙 정합).
**Ranking Result(§26)**: candidate identifiers · selected · selection score · selected reason · rejected reasons · verification · freshness · destination compatibility · warning · valid_until.

**Shared Identifier(§27)**: 가족/회사 공용 이메일·공용 전화·Shared Device Token·매장/대행사 공용·B2B 대표·Household·재사용 전화 식별. Purpose별: 개인화 Marketing=기본 차단/제한 · 회사 공지=Account 관계 필요 · Aggregate Ads=Provider 정책+동의 · Support=Actor 확인 · Transactional=주문/계약 관계 확인. (현행 phone 재사용/공유 미처리 SEG-C4 관련.)

---

## 9. Channel Eligibility (§30-36)

**Channel Registry(§30)**: EMAIL/SMS/PUSH/CRM/META_ADS/GOOGLE_ADS/TIKTOK_ADS/LINKEDIN_ADS/NAVER_ADS/KAKAO_ADS/ONSITE_PERSONALIZATION/APP_PERSONALIZATION/EXPORT/API_DESTINATION (실 지원=Connector Registry 기준). 공통 Core + 채널 Policy Adapter(§3.10 독립 엔진 금지).

| 채널 | 핵심 확인(현행 매핑) |
|---|---|
| **Email(§31)** | Valid/Verification/Hard·Soft Bounce/Complaint/Unsubscribe(=email_suppression)/Brand/Purpose/Freq Cap/Deliverability/Shared/Domain Risk/Transactional·Marketing |
| **SMS(§32)** | E.164/국가코드/Verification/재사용번호/SMS 지원/Opt-out/Quiet Hours/Jurisdiction/Freq Cap/Carrier/Shared/M·T 구분 (현행 phone opt-out fail-open SEG-C4 교정) |
| **Push(§33)** | Push Token/App ID/Device Ownership/Validity/Expiry/Permission/App Env/Platform/Logout/Shared Device/Freq Cap/M·T |
| **CRM(§34)** | Contact Mapping/Dest Account/Write Ownership/Field Authority/Status/Consent/Suppression/Dup/Merge/Deletion/Sync Loop/Retry·Idempotency |
| **Advertising(§35)** | Personalized Ad Purpose/Data Sharing/Dest Account/Verified·Supported Identifier/Hash Version/Geo/Provider Policy/Min Size/Exclusion/Deleted/Suppression/Lookalike 허용/**Removal Capability**/Retention (현행 AdAdapters Removal 부재 SEG-H2) |
| **Onsite/App(§36)** | Session/Device Scope/Consent Context/Anonymous·Known/Sensitive 제한/Confidence/Current Session/Cross-device 제한/Freshness/Experiment/User Control/Real-time Recheck |

---

## 10. 완료 조건 대응 (본 문서)
§105의 1-11(Entity/Request/Result/Policy/Purpose/Marketing·Transactional/Profile Status/Anonymous/Identity/Identifier/Shared/Contactability·Reachability/채널정책). Freshness/Destination/Jurisdiction=[`CANONICAL_AUDIENCE_FRESHNESS_DESTINATION.md`](CANONICAL_AUDIENCE_FRESHNESS_DESTINATION.md). Recheck/Cache/Reconcile/Lint/Test=[`CANONICAL_AUDIENCE_ELIGIBILITY_GOVERNANCE.md`](CANONICAL_AUDIENCE_ELIGIBILITY_GOVERNANCE.md). **코드변경 0** — isMarketingSendAllowed 확장·채널 Adapter 통합은 후속 승인 세션(Channel Conformance+Equivalence+verify+배포승인).
