# Canonical Privacy Schema — Entity, Subject, Data Category, Classification, Purpose, Processing Activity & Lawful Basis

> **EPIC 06-A Part 3-3-3-1** (1/3) · 289차 (2026-07-16) · **비파괴 설계 명세(코드변경 0)**
> 근거: 기존 인프라(GdprConsent 쿠키동의·Compliance SOC2/ISO 리포팅·DataPlatform/DataTrust 272차·No-PII 집계원칙·Decisioning v418.1 PII-free·데이터 헌법 Vol1~5) · Part 3-3-1 Consent·Part 3-3-2 Suppression
> 형제: [`CANONICAL_PRIVACY_PURPOSE_GOVERNANCE.md`](CANONICAL_PRIVACY_PURPOSE_GOVERNANCE.md) · [`CANONICAL_PRIVACY_ENFORCEMENT.md`](CANONICAL_PRIVACY_ENFORCEMENT.md) · ADR=[`../architecture/ADR_PRIVACY_PURPOSE_LIMITATION_GOVERNANCE.md`](../architecture/ADR_PRIVACY_PURPOSE_LIMITATION_GOVERNANCE.md)
> **성격**: 목표 계약. Retention/DSAR/Deletion/Cross-border=Part 3-3-3-2~6. 실 Registry 구현은 후속 승인 세션.

---

## 0. 현행 대비 (실측 → Canonical)

| 현행 | Canonical 목표 |
|---|---|
| 데이터 헌법 Vol1~5(Trust First·수집≠사용·목/더미배제·테넌트격리) | 본 Privacy Foundation 이 그 **런타임 강제 계약** |
| GdprConsent(쿠키 analytics/marketing/personalization) | ANONYMOUS_VISITOR Subject + Purpose(§Consent Part3-3-1 연계) |
| Compliance.php(SOC2/ISO 통제카탈로그·감사로그 리포팅) | Privacy Impact Review·Audit 확장(리포팅→런타임 강제) |
| DataPlatform/DataTrust/DataAssets(272차 출처·품질·계보) | Data Category·Source-to-Purpose·Lineage 편입 |
| No-PII 집계(Decisioning v418.1)·데모격리 IS_DEMO | Consumer PII Level(AGGREGATE_ONLY)·Test/Prod 격리 계약화 |
| **Purpose/Processing Activity/Lawful Basis/Processor Registry 부재**(정식 엔티티 없음) | 신설 |
| ai_settings(ClaudeAI/AiGenerate) | AI_DATA_USAGE_ACTIVITY 등록(§Enforcement) |

**무후퇴**: 데이터 헌법·No-PII 집계·테넌트격리·GdprConsent·Compliance 는 **정본 — 재구현 금지, Privacy Governance 로 확장·강제화**. Consumer/채널/AI별 독립 Privacy Engine 신설 금지(§3.7·§100).

---

## 1. Canonical Privacy Entity Model (§4)

Entity: `PRIVACY_SUBJECT` · `PERSONAL_DATA_CATEGORY` · `SENSITIVE_DATA_CATEGORY` · `PROCESSING_PURPOSE` · `PROCESSING_ACTIVITY(_VERSION)` · `LAWFUL_BASIS` · `PURPOSE_BINDING` · `PURPOSE_COMPATIBILITY_ASSESSMENT` · `DATA_USAGE_POLICY` · `FIELD_USAGE_POLICY` · `DATA_MINIMIZATION_PROFILE` · `DATA_CONSUMER` · `DATA_RECIPIENT` · `PROCESSOR` · `SUBPROCESSOR` · `DATA_SHARING_ACTIVITY` · `PRIVACY_NOTICE(_VERSION)` · `PRIVACY_DISCLOSURE` · `PROCESSING_APPROVAL` · `PRIVACY_IMPACT_REVIEW` · `HIGH_RISK_PROCESSING_CASE` · `PROFILING_ACTIVITY` · `AUTOMATED_DECISION_ACTIVITY` · `AI_DATA_USAGE_ACTIVITY` · `MINOR_PROCESSING_POLICY` · `PRIVACY_EVALUATION` · `PRIVACY_POLICY_DECISION` · `PRIVACY_OVERRIDE` · `PRIVACY_AUDIT_EVENT`. (기존 등가=GdprConsent/Compliance/DataTrust 부분 → 확장·나머지 신규. CE Registry 등재.)

---

## 2. Privacy Subject (§5)
PERSON · CUSTOMER_PROFILE · ANONYMOUS_VISITOR · DEVICE_USER · ACCOUNT_CONTACT · COMPANY_CONTACT · HOUSEHOLD_MEMBER · CREATOR · PARTNER_CONTACT · EMPLOYEE_CONTACT · EXTERNAL_CONTACT. 각 Subject Type에 적용가능 Purpose·Data Category·Rights Scope 정의. (EPIC05 person_id·Consent Subject 정합.)

---

## 3. Personal Data Category (§6-7) & Sensitive (§8-9) & Classification (§10)

**Personal Category(§6, 32종)**: BASIC_IDENTITY · CONTACT_INFORMATION · ACCOUNT_INFORMATION · AUTHENTICATION_INFORMATION · DEVICE_INFORMATION · ONLINE_IDENTIFIER · LOCATION_INFORMATION · TRANSACTION/ORDER/PAYMENT_RELATED/DELIVERY_INFORMATION · ENGAGEMENT_INFORMATION · COMMUNICATION/SUPPORT_HISTORY · MARKETING_PREFERENCE · CONSENT/SUPPRESSION_RECORD · BEHAVIORAL_INFORMATION · PROFILE_ATTRIBUTE · **SEGMENT_MEMBERSHIP · AUDIENCE_MEMBERSHIP · PREDICTED_ATTRIBUTE · MODEL_SCORE**(§3.5 파생/예측도 대상) · RECOMMENDATION/AUTOMATION_HISTORY · ADVERTISING/SOCIAL_PLATFORM_IDENTIFIER · BUSINESS_RELATIONSHIP · CONTRACT_INFORMATION · COMPLIANCE_RECORD · SECURITY_EVENT · FRAUD_SIGNAL.
**필수(§7)**: data_category_id · name · classification · sensitivity · source_types · **allowed_purposes · prohibited_purposes · allowed_consumers · allowed_destinations** · masking/encryption_requirement · export_allowed · third_party_sharing_allowed · profiling_allowed · automated_decision_allowed · default_retention_class · owner · version · status.

**Sensitive Category(§8)**: PRECISE_LOCATION · FINANCIAL_ACCOUNT_DETAIL · PAYMENT_CREDENTIAL · GOVERNMENT_IDENTIFIER · BIOMETRIC · HEALTH_RELATED · RELIGIOUS/POLITICAL/SEXUAL_ORIENTATION/UNION_MEMBERSHIP_INFERENCE · MINOR_INFORMATION · SECURITY_CREDENTIAL · FRAUD_INVESTIGATION_DETAIL · HIGH_RISK_BEHAVIORAL_INFERENCE · VULNERABILITY_INFERENCE. **★실 코드/데이터 기준 등록**(허구 Category 선언 금지). **상태(§9)**: PROHIBITED/RESTRICTED/APPROVAL_REQUIRED/PURPOSE_LIMITED/INTERNAL_ONLY/ENCRYPTED_ONLY/PSEUDONYMOUS_ONLY/ALLOWED/DEPRECATED.

**Classification(§10)**: PUBLIC/INTERNAL/CONFIDENTIAL/PERSONAL/SENSITIVE_PERSONAL/HIGHLY_RESTRICTED/SECURITY_SECRET/PAYMENT_RESTRICTED/LEGAL_PRIVILEGED/PSEUDONYMOUS/ANONYMIZED/AGGREGATED. **Anonymized/Aggregated 는 재식별 위험·생성방식 검증 후 부여**(No-PII 집계 원칙 정합).

**Matrix(§93)**: | Category | Classification | Sensitivity | Allowed Purposes | Prohibited Purposes | Consumers | Destinations | Masking | Retention Class | Status |

---

## 4. Processing Purpose (§11-14)

**Registry(§11)**: purpose_id · name · description · purpose_category · business_process · subject_types · data_categories · sensitive_categories · allowed_sources/consumers/destinations · lawful_basis_options · consent/suppression_requirements · minimization_profile · retention_class · profiling/automated_decision/third_party_sharing/cross_border/minor_allowed/high_risk 여부 · notice/approval_requirement · owner · version · status.
**Category(§12)**: SERVICE_DELIVERY · CUSTOMER_SUPPORT · ACCOUNT_MANAGEMENT · TRANSACTION_PROCESSING · DELIVERY_OPERATION · SECURITY · FRAUD_PREVENTION · COMPLIANCE · ANALYTICS · PRODUCT_IMPROVEMENT · MARKETING · ADVERTISING · PERSONALIZATION · RECOMMENDATION · AI_ASSISTANCE · AUTOMATION · RESEARCH · THIRD_PARTY_SHARING · LEGAL_RESPONSE.
**상태(§13)**: DRAFT/REVIEW_REQUIRED/APPROVED/ACTIVE/RESTRICTED/SUSPENDED/REVOKED/DEPRECATED/BLOCKED. Deprecated/Suspended 로 신규 Activity 금지.
**★Granularity(§14·§3.2)**: 포괄 Purpose(BUSINESS/MARKETING/ANALYTICS/AI/PERSONALIZATION/CUSTOMER_MANAGEMENT) **운영 승인 금지** → 구체적(EMAIL_MARKETING_CAMPAIGN_TARGETING·PURCHASE_PROPENSITY_SCORING·RETARGETING_AUDIENCE_CREATION·FRAUD_TRANSACTION_REVIEW…). Purpose 는 "누구/무엇/어떤행위/누가사용/누구에게/어떤결과/얼마나오래/어떤근거"에 답해야 함. **현행 crm_channel_prefs 는 채널만·purpose 없음 → Part3-3-1 Consent Purpose Registry 와 단일 Purpose Registry 로 통합**.

---

## 5. Processing Activity (§15-17)

**Schema(§15)**: processing_activity_id · activity_version_id · name · tenant/ws/brand · environment · subject_types · purpose_id · data_category_ids · sensitive_category_ids · source_systems · source_account_ids · processing_operations · consumers · recipients · processors · subprocessors · destinations · lawful_basis_id · consent_policy_id · suppression_policy_id · minimization_profile_id · retention_policy_id · notice_version_id · jurisdiction/region_scope · security/privacy_controls · profiling_activity_id · automated_decision_activity_id · high_risk_status · approval_status · effective_from/to · owner · created/updated_at · audit_reference.
**Operation Registry(§16)**: COLLECT/INGEST/NORMALIZE/ENRICH/COMBINE/MATCH/LINK/MERGE/PROFILE/SCORE/SEGMENT/PREDICT/RECOMMEND/TARGET/CONTACT/EXPORT/SHARE/TRANSFER/STORE/CACHE/INDEX/ANALYZE/REPORT/DELETE/ANONYMIZE/ARCHIVE/RESTORE.
**Versioning(§17)**: Purpose/Data Category/Sensitive/Consumer/Recipient/Processor/Third-party Sharing/AI Model/Automated Decision/Cross-border/Retention 연장/Notice/Lawful Basis/Scope 확대 = **새 Version**. Published 직접수정 금지.
**Matrix(§94)**: | Activity ID | Purpose | Subjects | Data Categories | Consumer | Recipient | Basis | Notice | Profiling | High Risk | Approval | Status |

---

## 6. Lawful Basis (§18-20)

**Registry(§18)**: CONSENT · CONTRACT · LEGAL_OBLIGATION · VITAL_INTEREST · PUBLIC_TASK · LEGITIMATE_INTEREST · BUSINESS_OPERATION_BASIS · OTHER_JURISDICTION_SPECIFIC_BASIS. **★법률 적합성을 코드가 자동 확정 가정 금지** → 필요 시 `LEGAL_REVIEW_REQUIRED`.
**필수(§19)**: lawful_basis_id · name · jurisdiction · allowed_purposes/data_categories · sensitive_data_allowed · consent_required · balancing_test_required · notice_required · objection_handling · withdrawal_effect · retention_constraint · owner · legal_approver · version · status.
**상태(§20)**: DRAFT/LEGAL_REVIEW_REQUIRED/APPROVED/ACTIVE/RESTRICTED/SUSPENDED/REVOKED/EXPIRED/BLOCKED.

---

## 7. 절대 원칙 요약 (§3)
①수집가능≠사용가능(§3.1 모든 처리에 Category/Source/Purpose/Basis/Consent/Consumer/Destination/Retention/Notice/Approval 연결) ②포괄 Purpose 금지(§3.2) ③Consent≠Purpose Limitation 우회(§3.3 필드/민감/제3자/AI학습/장기보존/자동결정 자동허용 아님) ④Analytics→Marketing 자동전환 금지(§3.4) ⑤파생/예측도 Governance 대상(§3.5) ⑥Sensitive Proxy 우회 금지(§3.6) ⑦Consumer별 최소데이터(§3.7 Full Profile 무차별 제공 금지) ⑧Third-party Sharing=별도 Activity(§3.8) ⑨Notice/Policy Version 없이 처리 금지(§3.9) ⑩기존 Privacy 후퇴 금지(§3.10).

---

## 8. 완료 조건 대응 (본 문서)
§99의 1-7(Entity/Data Category/Sensitive/Classification/Purpose/Activity·Versioning/Lawful Basis). Purpose Binding/Minimization/Notice/Processor=[`CANONICAL_PRIVACY_PURPOSE_GOVERNANCE.md`](CANONICAL_PRIVACY_PURPOSE_GOVERNANCE.md). Profiling/AI/Runtime/Enforcement=[`CANONICAL_PRIVACY_ENFORCEMENT.md`](CANONICAL_PRIVACY_ENFORCEMENT.md). **코드변경 0** — Registry 구현·Legacy Equivalence 는 후속 승인 세션.
