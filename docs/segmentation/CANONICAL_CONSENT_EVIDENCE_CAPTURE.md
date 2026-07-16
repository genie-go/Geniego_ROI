# Canonical Consent Evidence & Capture — Capture, Source, Evidence, Grant/Deny/Withdraw, Conflict, Temporal & Import

> **EPIC 06-A Part 3-3-1** (2/3) · 289차 (2026-07-16) · **비파괴 설계 명세(코드변경 0)**
> 근거: Part 1(crm_channel_prefs opted_in=legacy boolean·Evidence/Version 부재) · 형제: [`CANONICAL_CONSENT_SCHEMA.md`](CANONICAL_CONSENT_SCHEMA.md) · [`CANONICAL_CONSENT_PROJECTION_GOVERNANCE.md`](CANONICAL_CONSENT_PROJECTION_GOVERNANCE.md)
> **성격**: 목표 계약. 실 파이프라인 구현은 후속 승인 세션.

---

## 1. Capture Contract (§24) & Method (§25) & Source (§26)

**Capture(§24)**: capture_event_id · consent_subject_reference · customer_profile_id · person_id · tenant/ws/brand · source_system · source_account_id · purpose_id · channel_id · requested_status · policy_id/version · capture_method · capture_source · evidence_payload_reference · jurisdiction · locale · occurred_at · received_at · actor · actor_type · idempotency_key · correlation_id · environment.
**Method Registry(§25)**: WEB_FORM/MOBILE_APP/PREFERENCE_CENTER/DOUBLE_OPT_IN/CRM_ENTRY/API/IMPORT/OFFLINE_FORM/SIGNED_DOCUMENT/RECORDED_CALL/CUSTOMER_SUPPORT/PLATFORM_NATIVE/ADMIN_CORRECTION/MIGRATION/**SYSTEM_INFERRED**. **SYSTEM_INFERRED ≠ 명시 Consent**. 현행 PreferenceCenter UI 변경=PREFERENCE_CENTER method.
**Source Registry(§26)**: consent_source_id · source_type · source_system · source_account_id · source_authority · trust_level · supported_purposes/channels · evidence_capability · correction/withdrawal_capability · sync_mode · owner · status · version · certification_status.

---

## 2. Evidence (§27-31)

**Schema(§27)**: evidence_id · consent_record_id · evidence_type · evidence_source · evidence_reference · evidence_hash · content_version · policy_text_version · form_version · checkbox_state · disclosure_text_reference · locale · user_agent · session_reference · (IP=정책상 제한 Reference) · timestamp · actor_reference · verification_status · integrity_status · retention_policy · created_at · expires_at · deleted_at · audit_reference. **원문 PII/Secret 불필요 저장 금지**(No-PII 원칙).
**Type(§28)**: FORM_SUBMISSION/CHECKBOX_SELECTION/DOUBLE_OPT_IN_CONFIRMATION/SIGNED_DOCUMENT/RECORDED_VERBAL_CONSENT/PREFERENCE_CENTER_EVENT/CRM_SOURCE_RECORD/API_CAPTURE_LOG/PLATFORM_NATIVE_RECORD/IMPORT_FILE_RECORD/POLICY_ACCEPTANCE_LOG/SUPPORT_CASE_RECORD/ADMIN_CORRECTION_RECORD.
**상태(§29)**: PENDING/VERIFIED/VERIFIED_WITH_WARNINGS/INVALID/MISSING/CORRUPTED/EXPIRED/REVOKED/DELETED/UNDER_REVIEW.
**Validation(§30)**: Subject/Purpose/Channel/Brand/Policy Version 일치 · Timestamp · Source Authority · **Integrity Hash** · Duplicate · Alteration · Capture Actor · Locale · Disclosure Text · Required Checkbox · Double Opt-in 완료 · Retention · Access Permission · Environment.
**Trust Level(§31)**: HIGH(검증 Double Opt-in·서명문서·무결성 검증 Preference Event·Platform-native Verified) / MEDIUM(신뢰 CRM Record·검증 API Capture·Support 기록) / LOW(**Evidence 없는 Legacy Boolean**·Source 불명 Import·System Inference·수동입력) / UNVERIFIED / INVALID. **★§3.7 Evidence 없는 Consent ≠ 고신뢰**. 현행 crm_channel_prefs.opted_in=Evidence 없는 Legacy Boolean → LOW trust·Manual Review.
**Matrix(§105)**: | Evidence ID | Type | Source | Subject Match | Purpose Match | Policy Version | Integrity | Trust Level | Retention | Status |

---

## 3. Capture Validation Pipeline (§32) & Idempotency (§33)
**18단계(§32)**: Request Auth → Actor Permission → Subject Resolution → Tenant/ws/brand Scope → Purpose → Channel → Policy Version → Jurisdiction → **Evidence Validation** → Existing Record 조회 → Duplicate/Idempotency → State Transition Validation → **Conflict Detection** → New Version 생성 → Projection 갱신 요청 → Cache Invalidation → Audit → Response.
**Idempotency(§33)**: tenant + consent_subject_id + purpose + channel + brand + source_system + source_account_id + source_event_id + requested_status + policy_version + environment. Webhook 재전송/API Retry 로 중복 Version 생성 방지.

---

## 4. Grant/Deny/Withdraw/Expiry (§34-38)

- **Grant(§34)**: Subject/Purpose/Channel/Brand/Policy Version/Evidence/Jurisdiction/Actor/Effective Time/Expiry/Previous Status/Conflict/Permission/Idempotency 검증.
- **Deny(§35)**: Denied Purpose/Channel · Scope · Evidence/Source · Effective Time · Reason · Actor · Previous Status · Projection 영향 · Audit.
- **Withdrawal(§36)**: withdrawn purpose/channel · brand scope · withdrawal source/method/reason · occurred/received/effective_at · source event · actor · **propagation required** · affected audiences/destinations · audit. (실 전파/외부 Removal=Part 3-3-2.)
- **Expiry(§37)**: fixed duration · policy/purpose/inactivity/source expiration · jurisdiction rule · reconsent requirement · grace/warning period · expiry action · projection action · execution block.
- **Validity(§38)**: GRANTED + Policy Version 유효 + Scope/Purpose/Channel/Brand 일치 + Effective 도달 + Expiry 미도달 + Evidence 충족 + Conflict 없음 + Withdrawal 없음 + Deletion 아님 + Source Trust 충족 + Jurisdiction 충족.

---

## 5. Conflict (§39-41) & Resolution (§42-45)

**Conflict 유형(§39)**: GRANTED vs DENIED/WITHDRAWN · Source 간 상태충돌 · Brand/Channel/Purpose Scope 충돌 · Policy Version 충돌 · Effective Time 충돌 · Evidence 충돌 · Subject Identity 충돌 · Duplicate Source Event · **Merge된 Profile 간 충돌** · **Legacy Boolean vs Canonical Record 충돌**.
**Schema(§40)**: conflict_id · consent_subject_id · purpose/channel/brand · conflicting_record_ids · conflict_type · severity · detected_at · current_effective_status · resolution_policy · manual_review_required · resolved_at/by · resolution_reason · audit_reference.
**Severity(§41)**: LOW/MEDIUM/HIGH/CRITICAL. **HIGH/CRITICAL**: 최신 WITHDRAWN vs GRANTED · 타 Brand 오적용 · **타 Tenant 혼입** · Evidence 위조/무결성 실패 · 삭제 Subject 의 Active Consent · Marketing 실행 중 충돌.

**Resolution 원칙(§42)**: ①Legal Block ②**Latest Valid Withdrawal** ③Explicit Denial ④Purpose/Channel/Brand Exact Scope ⑤Policy Version ⑥Effective Time ⑦Evidence Strength ⑧Source Authority ⑨Jurisdiction ⑩Record Freshness ⑪Manual Correction ⑫**Conservative Fallback**. **최신 Record 라는 이유만으로 무조건 우선 금지**(Withdrawal/더 강한 제한 무시 금지).
**보수적 Resolution(§43)**: Conflict 미해결·Scope 불명·Evidence 부족·Policy 불명·Withdrawal 지연·Source Authority 불명·Identity Conflict·Cross-border 불명·Minor 불명 → **더 제한적 상태 선택**. UNKNOWN/CONFLICT/RESTRICTED = 기본 마케팅 차단.
**Source Priority(§44)**: **Purpose·Channel·Brand별** 관리(전역 단일순위 아님). Preference Center > Double Opt-in > Platform Native > CRM Verified > Connector Import > Legacy Migration > Manual Admin > System Inference. **Priority 만으로 Withdrawal 무시 금지**.
**Temporal(§45)**: Current / Audience Evaluation / Snapshot / Campaign Execution / Historical Report / Compliance Request / As-of Time. **과거 캠페인 재현 시 당시 유효 Policy·Record Version 조회 가능**(Part 2 Segment Version 핀 정합).

---

## 6. Import (§66-68) & Correction (§69-70)

**Import Contract(§66)**: import_job_id · source_system · source_account_id · tenant/ws/brand · purpose/channel/status/policy-version/evidence/effective-time/withdrawal/jurisdiction mapping · trust_level · idempotency · validation · error handling · audit.
**Import 상태(§67)**: RECEIVED/VALIDATING/MAPPED/PARTIAL/IMPORTED/REJECTED/MANUAL_REVIEW/ROLLED_BACK/BLOCKED.
**★Legacy Mapping(§68)**: `true/yes/1/subscribed/active/contactable/member/customer/email exists` 를 **자동 GRANTED 로 변환 금지** → 각 필드의 실제 의미·Source·Purpose·Evidence 조사. **현행 crm_channel_prefs.opted_in=1(기본허용)을 GRANTED 로 맹목 변환 금지** — LOW trust·Purpose 미상 상태로 Import 후 재동의/증거 확보 정책.
**Correction(§69-70)**: Subject 검증 → 기존 Record 조회 → SoT 확인 → Evidence 확인 → Correction Case 생성 → 새 Record Version → Conflict 재평가 → Projection 재계산 → Audience 영향 분석 → Cache 무효화 → Audit → 확인. 상태: REQUESTED/IDENTITY_VALIDATION/EVIDENCE_REVIEW/APPROVED/REJECTED/APPLIED/PROPAGATION_PENDING/COMPLETED/FAILED/MANUAL_REVIEW_REQUIRED.

---

## 7. 완료 조건 대응 (본 문서)
§109의 7-13(Capture/Idempotency·Source·Evidence/Validation/Trust·Grant/Deny/Withdraw/Expiry·Conflict/Resolution·Conservative·Temporal)·20(Import/Mapping)·21(Correction). **코드변경 0** — Capture/Evidence/Import 실 구현은 Golden Consent Dataset+Legacy Equivalence 통과·verify·배포승인 후.
