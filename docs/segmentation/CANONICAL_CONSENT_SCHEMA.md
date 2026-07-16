# Canonical Consent Schema — Entity, Subject, Record, Status, State Machine, Purpose/Channel/Scope & Policy

> **EPIC 06-A Part 3-3-1** (1/3) · 289차 (2026-07-16) · **비파괴 설계 명세(코드변경 0)**
> 근거: Part 1(실 consent store `crm_channel_prefs`·PreferenceCenter opt-out/기본허용 `PreferenceCenter.php:30-134`·GdprConsent=쿠키 별개) · EPIC05 ADR(Consent를 person_id/identity·Purpose/Legal-basis/Brand 차원 승격 `ADR_CANONICAL_CUSTOMER_PROFILE`) · Part 3-2 Eligibility
> 형제: [`CANONICAL_CONSENT_EVIDENCE_CAPTURE.md`](CANONICAL_CONSENT_EVIDENCE_CAPTURE.md) · [`CANONICAL_CONSENT_PROJECTION_GOVERNANCE.md`](CANONICAL_CONSENT_PROJECTION_GOVERNANCE.md) · ADR=[`../architecture/ADR_CANONICAL_CONSENT_ENGINE.md`](../architecture/ADR_CANONICAL_CONSENT_ENGINE.md)
> **성격**: 목표 계약. Suppression 전체=Part 3-3-2·Privacy/Retention/DSAR=Part 3-3-3·Runtime/Certification=Part 3-3-4. 실 스토어 구현은 후속 승인 세션.

---

## 0. 현행 대비 (Part 1 실측 → Canonical)

| 현행 | Canonical 목표 |
|---|---|
| `crm_channel_prefs`(tenant,customer_id,email,channel,**opted_in TINYINT**) — 채널 email/sms/kakao/whatsapp/push + topic:* + global 'all', **opt-out/기본허용** | **CONSENT_RECORD**(purpose/channel/brand/jurisdiction/policy_version/evidence/effective/expiry/status) — Boolean→Contextual Record |
| Purpose/Brand/Jurisdiction/Policy Version/Evidence/Version **전무** | 신설(§3.1 Boolean 금지) |
| 발송시점 `isMarketingSendAllowed`가 crm_channel_prefs 읽음 | Consent Engine Evaluation API + Projection(§Part2 Eligibility 정합) |
| GdprConsent(쿠키 analytics/marketing/personalization) | ANONYMOUS_CONSENT(§64, 별도 subject) |
| EPIC05: consent를 person_id 차원 승격·Purpose/Legal-basis/Brand 분리 설계 | 본 Canonical 이 그 구현 계약(병합 시 동의확대 방지 SEG) |

**무후퇴**: `crm_channel_prefs`·PreferenceCenter·`isMarketingSendAllowed` 는 **정본 — 재구현 금지, Consent Engine 으로 확장**. 채널별 자체 Consent Engine 신설 금지(§3.10·§110).

---

## 1. Canonical Consent Entity Model (§4)

Entity: `CONSENT_SUBJECT` · `CONSENT_RECORD(_VERSION)` · `CONSENT_POLICY(_VERSION)` · `CONSENT_PURPOSE` · `CONSENT_CHANNEL` · `CONSENT_SCOPE` · `CONSENT_EVIDENCE` · `CONSENT_SOURCE` · `CONSENT_CAPTURE_EVENT` · `CONSENT_WITHDRAWAL_EVENT` · `CONSENT_CONFLICT` · `CONSENT_RESOLUTION` · `CONSENT_PROJECTION` · `CONSENT_EVALUATION` · `CONSENT_CORRECTION_CASE` · `CONSENT_IMPORT_JOB` · `CONSENT_AUDIT_EVENT`. (현행 등가=crm_channel_prefs 만 → Record 로 확장·나머지 신규. CE Registry 등재.)

---

## 2. Consent Subject (§5-6)

**유형(§5)**: PERSON · CUSTOMER_PROFILE · ACCOUNT_CONTACT · ANONYMOUS_VISITOR · DEVICE · HOUSEHOLD · COMPANY_CONTACT · SUBSCRIBER · EXTERNAL_CONTACT. **최종 판단은 Person/명확한 Data Subject 기준**(Profile/Device/Cookie Consent 를 Person Consent 와 무조건 동일시 금지). EPIC05 person_id 승격 정합.
**필드(§6)**: consent_subject_id · subject_type · canonical_subject_reference · customer_profile_id · person_id · tenant/ws/brand · source_system · source_account_id · jurisdiction · subject_status · identity_confidence · created/updated/deleted/anonymized_at · lineage_id.

---

## 3. Consent Record Schema (§7) & Version (§8)

```
consent_record_id, consent_record_version_id, consent_subject_id, customer_profile_id, person_id,
tenant_id, workspace_id, brand_id, store_id, source_system, source_account_id, connector_id,
purpose_id, channel_id, scope_id, status, policy_id, policy_version, lawful_basis_reference,
jurisdiction, capture_method, capture_source, evidence_id, evidence_status,
captured_at, effective_from, effective_to, expires_at, withdrawn_at, withdrawal_source, withdrawal_reason,
correction_status, confidence, trust_level, data_classification, schema_version,
created_at, updated_at, lineage_id, audit_reference
```
**Version(§8)**: consent_record_version_id · consent_record_id · version_number · previous_version_id · previous/current_status · change_type · change_reason · source_event_id · policy_version · evidence_id · effective_from/to · changed_by/at · correction_case_id · superseded_by · audit_reference. **기존 Version 덮어쓰기 금지**(§3.6 이력 보존).

**★§3.1 Boolean 금지**: `marketing_consent=true`·`opted_in=true` 단일필드 저장 금지 → 최소 Subject+Purpose+Channel+Brand+Jurisdiction+Policy Version+Status+Capture Source+Evidence+Valid Time+Withdrawal+Scope+Audit. 현행 crm_channel_prefs.opted_in 은 legacy-boolean → Import(§Part2)로 매핑(자동 GRANTED 금지 §68).

**Matrix(§103)**: | Record ID | Subject | Purpose | Channel | Brand | Status | Policy Version | Evidence | Effective | Expiry | Source | Conflict |

---

## 4. Consent Status (§9) & 운영 상태 분리 (§10)

**의사 상태(§9)**: UNKNOWN · NOT_REQUESTED · PENDING · GRANTED · DENIED · WITHDRAWN · EXPIRED · RESTRICTED · NOT_REQUIRED · LEGALLY_BLOCKED · CONFLICT · INVALID · DELETION_PENDING · DELETED.
**운영 상태(§10, 분리)**: ACTIVE · SUPERSEDED · INVALIDATED · CORRECTION_PENDING · UNDER_REVIEW · ARCHIVED · DELETED · BLOCKED.
**★§3.2 Unknown≠Granted**: 값없음/미동기화/Evidence누락/Policy불명/Purpose불명/Conflict미해결 = Granted 아님 → 기본 실행 차단 또는 명시정책. (현행 opt-out 기본허용 SEG-M1 정면 교정 — Canonical 은 Unknown 차단.)

---

## 5. State Machine (§11) & 금지 전이 (§12)

허용 전이: UNKNOWN→{PENDING,GRANTED,DENIED} · NOT_REQUESTED→PENDING · PENDING→{GRANTED,DENIED} · GRANTED→{WITHDRAWN,EXPIRED,RESTRICTED} · DENIED→GRANTED · WITHDRAWN→GRANTED · EXPIRED→GRANTED · CONFLICT→{GRANTED,DENIED,WITHDRAWN}. **모든 전이=Actor+Source+Reason+Effective Time+Policy Version+Evidence+Permission+Audit 요구**.
**금지 전이(§12, 무검증)**: WITHDRAWN→GRANTED 자동 · DENIED→GRANTED 임의 · EXPIRED→GRANTED Evidence 없이 · UNKNOWN→GRANTED Import 기본값 · CONFLICT→GRANTED 자동 · DELETED→GRANTED · LEGALLY_BLOCKED→GRANTED 일반 Override · **다른 Brand/Channel/Purpose 의 GRANTED 복사**(§3.3).

---

## 6. Purpose (§13-15)

**Registry(§13)**: EMAIL_MARKETING · SMS_MARKETING · PUSH_MARKETING · PERSONALIZED_ADVERTISING · RETARGETING · LOOKALIKE_SOURCE · PROFILING · PERSONALIZATION · RECOMMENDATION · ANALYTICS · PERFORMANCE_MEASUREMENT · DATA_COMBINATION · THIRD_PARTY_SHARING · CROSS_BORDER_TRANSFER · CRM_CONTACT · CUSTOMER_SUPPORT · TRANSACTIONAL_COMMUNICATION · LOCATION_USE · DEVICE_IDENTIFIER_USE · AI_PERSONALIZATION · AUTOMATION_EXECUTION.
**필수(§14)**: purpose_id · name · description · category · allowed_channels · required_evidence_level · default_unknown_policy · withdrawal_effect · expiry_policy · retention_policy · allowed_data_classifications · third_party_sharing · cross_border · minor_restriction · approval_requirement · owner · status · version.
**상태(§15)**: DRAFT/ACTIVE/RESTRICTED/DEPRECATED/SUSPENDED/REVOKED/BLOCKED. Deprecated Purpose 신규 Capture 차단.
**★§3.3 목적 확대 금지**: 뉴스레터 동의≠SMS 마케팅 · 이용약관≠광고개인화 · Cookie 분석≠Retargeting · Brand A≠Brand B · Transactional≠Marketing · 저장동의≠제3자 공유. 현행 crm_channel_prefs 는 채널만 있고 purpose 없음 → 채널 opt-out 을 전 목적으로 확대하던 암묵을 Purpose 분리로 교정.

---

## 7. Channel (§16) & Scope (§17-20)

**Channel Registry(§16)**: EMAIL/SMS/PUSH/PHONE/DIRECT_MAIL/ONSITE/IN_APP/CRM/META_ADS/GOOGLE_ADS/TIKTOK_ADS/LINKEDIN_ADS/NAVER_ADS/KAKAO_ADS/API_DESTINATION/THIRD_PARTY_EXPORT/OFFLINE/ALL_MARKETING_CHANNELS. `ALL_MARKETING_CHANNELS`=법적·정책 명확 시만(현행 global 'all' 매핑).
**Scope(§17)**: tenant/ws/brand/store · source_system · source_account_id · purpose_id · channel_id · jurisdiction · data_category · processing_activity · recipient_category · destination_type · environment. **Scope 다르면 동일 Consent 아님**.
**Scope Matching(§18)**: EXACT/BRAND_WIDE/TENANT_WIDE/CHANNEL_WIDE/PURPOSE_WIDE/INHERITED/NO/CONFLICTING_MATCH. **확장은 Policy+Evidence 명시 허용 시만**.
**Brand(§19)**: Single/Multi-brand/Parent Company/Store-specific/Marketplace/Partner/Franchise Consent — Brand 간 자동확장 금지(EPIC05 병합 시 동의확대 방지 정합).
**Source Account(§20)**: source_system · source_account_id · external_contact_id · external_consent_id · external_policy_version · external_captured_at · sync_time · source_authority · source_confidence — 동일 플랫폼 타 Account Consent 혼합 금지.

---

## 8. Consent Policy (§21-23)

**Schema(§21)**: consent_policy_id · policy_name/type · tenant/brand/purpose/channel/jurisdiction/data_category scope · required_status · evidence_requirement · capture_requirement · expiry_rule · withdrawal_rule · unknown_policy · conflict_policy · source_priority · projection_rule · execution_recheck · owner · approvers · status · version · effective_from/to.
**Versioning(§22)**: Purpose 의미·Channel/Brand 범위·Evidence 요구·Expiry·Withdrawal 효과·Unknown/Conflict 처리·Source Priority·Projection Logic·Execution Recheck·Jurisdiction·Data Sharing 변경 = **새 Version**. Published 직접수정 금지.
**상태(§23)**: DRAFT/VALIDATING/REVIEW_REQUIRED/APPROVED/ACTIVE/SUPERSEDED/SUSPENDED/REVOKED/EXPIRED/BLOCKED.
**Matrix(§104)**: | Policy ID | Purpose | Channel | Brand Scope | Jurisdiction | Evidence Level | Unknown Policy | Conflict Policy | Expiry | Recheck | Version | Status |

---

## 9. 완료 조건 대응 (본 문서)
§109의 1-6(Entity/Subject/Record·Version/Status·State Machine/Purpose·Channel·Brand·Jurisdiction Scope/Policy·Versioning). Capture/Evidence/Conflict=[`CANONICAL_CONSENT_EVIDENCE_CAPTURE.md`](CANONICAL_CONSENT_EVIDENCE_CAPTURE.md). Projection/Hooks/Governance=[`CANONICAL_CONSENT_PROJECTION_GOVERNANCE.md`](CANONICAL_CONSENT_PROJECTION_GOVERNANCE.md). **코드변경 0** — crm_channel_prefs 확장·Import 는 후속 승인 세션(Legacy Equivalence+verify+배포승인).
