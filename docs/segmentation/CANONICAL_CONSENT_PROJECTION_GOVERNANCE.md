# Canonical Consent Projection & Governance — Projection, Audience/Eligibility Hooks, Merge/Unmerge, API, Cache, Fail-closed, Lint/Guard & Test

> **EPIC 06-A Part 3-3-1** (3/3) · 289차 (2026-07-16) · **비파괴 설계 명세(코드변경 0)**
> 근거: Part 1(isMarketingSendAllowed 가 crm_channel_prefs 발송시점 읽음·EPIC05 merge 시 동의확대 방지) · 형제: [`CANONICAL_CONSENT_SCHEMA.md`](CANONICAL_CONSENT_SCHEMA.md) · [`CANONICAL_CONSENT_EVIDENCE_CAPTURE.md`](CANONICAL_CONSENT_EVIDENCE_CAPTURE.md) · ADR=[`../architecture/ADR_CANONICAL_CONSENT_ENGINE.md`](../architecture/ADR_CANONICAL_CONSENT_ENGINE.md)
> **성격**: 거버넌스 계약. 실 구현·CI 가드는 후속 승인 세션.

---

## 1. Consent Projection (§49-54)

**목적**: 자주 쓰는 Purpose·Channel 판정 빠른 제공(email/sms/push_marketing·personalized_ads·retargeting·profiling·personalization·recommendation·data_sharing·cross_border·automation_execution consent_status).
**Schema(§50)**: consent_projection_id · consent_subject_id · customer_profile_id · person_id · tenant/ws/brand · purpose_id · channel_id · jurisdiction · projected_status · **selected_record_id · source_record_version_set** · policy_id/version · evidence_status · conflict_status · computed_at · valid_until · stale_after · status · lineage_id · audit_reference.
**상태(§51)**: FRESH/STALE/REBUILD_REQUIRED/CONFLICT/BLOCKED/INVALID/DELETED.
**★§3.9·§52 절대원칙**: **Projection ≠ Source Record** — Source Record Version 연결 · Policy Version 연결 · 계산시각/유효기간 기록 · **Withdrawal 시 즉시 무효화** · Conflict 시 실행차단 · Merge/Unmerge 재계산 · Brand/Purpose/Channel/Tenant Scope 유지 · Historical 재현 가능.
**Rebuild Trigger(§53)**: Grant/Deny/Withdraw/Expire · Evidence/Policy Version 변경 · Subject Identity 변경 · Merge/Unmerge · Brand Mapping/Jurisdiction 변경 · Source Correction · Record Invalidated · Profile Deletion · Correction.
**Fail-closed(§54)**: Source Record 삭제 · Withdrawal 수신 · Policy 만료 · Evidence Invalid · Conflict · Identity Conflict · Scope/Jurisdiction 변경 · Rebuild 실패 · Stale 초과 → **GRANTED 로 유지 금지**.
**Matrix(§106)**: | Subject | Purpose | Channel | Brand | Projected Status | Selected Record | Evidence | Conflict | Computed At | Valid Until | Policy Version |

---

## 2. Audience / Eligibility 연계 (§55-60)

- **Audience Builder(§55)**: Purpose/Channel/Brand/Destination Intent/Profile/Person/Identity Version/Evaluation Time/Snapshot Time/Policy Version/Jurisdiction 을 Consent Engine 에 요청. **Builder 가 Consent Boolean 직접 해석 금지**(현행 발송루프가 crm_channel_prefs 직접 읽던 것을 Engine API 경유로).
- **Eligibility Result(§56)**: effective consent status · consent record reference · policy version · evidence status · conflict status · valid until · execution-time recheck requirement · reason codes 포함(Part 3-2 Eligibility 정합).
- **Build-time(§57)**: Purpose/Channel/Brand/Subject/Policy Version/Projection Freshness/Conflict/Withdrawal/Expiry/Evidence/Jurisdiction/Deletion 검증. **최종 실행까지 영구 유효 아님**.
- **Snapshot Approval Recheck(§58)**: 신규 Withdrawal/Denial · Expiry · Policy 변경 · Conflict · Evidence Invalid · Merge/Unmerge · Brand/Jurisdiction 변경 · Projection Stale.
- **Destination Sync Hook(§59)**: sync allowed · blocked/recheck-required/conflict/withdrawal/expired/invalid-evidence members · policy version · valid until · **removal required 여부**(실 Removal Orchestration=Part 3-3-2·SEG-H2).
- **Execution-time Hook(§60) — ★핵심**: Current Consent Status/Purpose/Channel/Brand/Policy Version/Withdrawal/Conflict/Subject Status/Suppression Hook/Kill Switch/Time 재검증. **Part 3-2 Execution-time Recheck + 선행 P0 발송게이트(SEG-C1~C3)와 동일 지점** — 현행 isMarketingSendAllowed 가 원형.

---

## 3. Merge/Unmerge/Split & Anonymous (§61-65)

- **Merge(§61)**: **모든 원본 Consent Record 보존** · Source Profile Reference/Evidence/Purpose/Channel/Brand Scope 보존 · Conflict 재평가 · Projection 재계산 · Audience 재평가 Trigger · Cache 무효화 · Audit · Unmerge 복구정보 보존. **★§3.5 단순 통합 금지**(한 Profile GRANTED 가 다른 Profile DENIED/WITHDRAWN 덮어쓰기 금지). EPIC05 ADR(병합 시 동의확대 방지) 구현.
- **Unmerge(§62)**: 원본 Record/Evidence 재귀속 · Subject Reference 복원 · **잘못 확장된 Projection 제거** · Conflict 재평가 · Snapshot 영향분석 · **Destination Removal 필요성 표시** · Cache 무효화 · Audit · 보상조치 Trigger.
- **Split/Re-link(§63)**: 공용 Email/Shared Phone/Household/Company Contact 분리 시 Consent Subject 가 누구인가(Contact Identifier vs Person vs Account Relationship Consent) · Channel/Brand Scope · Evidence Subject · Audience 영향 · Projection 재계산 · Manual Review.
- **Anonymous(§64)**: anonymous_subject_id · cookie/device scope · domain/app scope · purpose · channel · policy version · consent string/source reference · captured/expires_at · identity link policy · withdrawal mechanism · jurisdiction · evidence · status. **Anonymous → Known Person 전 Purpose 자동승격 금지**. 현행 GdprConsent(쿠키) 매핑.
- **Anonymous-to-Known(§65)**: Scope 호환성 · Domain/App Scope · Purpose 일치 · Policy Version · Evidence · Identity Confidence · Link Time · **Reconfirmation 필요 여부** · Conflict · Expiry · Audit.

---

## 4. History/Explain/Lineage (§71-73) & API (§74-78)

- **History Query(§71)**: 현재상태·전체 Version·Purpose/Channel/Brand/Source별·Evidence/Withdrawal/Correction/Policy Version History·As-of Time·Merge/Unmerge 영향·Projection History.
- **Explain(§72)**: 왜 현재 상태 · 선택/제외 Record · Policy Version · Evidence · Scope · Conflict · 만료 · 재검증 시점 · 영향 Audience/Consumer · 철회 시 필요작업.
- **Lineage(§73)**: Capture Source → Evidence → Record → Version → Conflict Resolution → Projection → Audience Eligibility → Snapshot → Destination Sync Hook → Execution Hook. 각 ID/Version/Time/Scope.
- **Query API(§74)** / **Capture API(§75, Grant/Deny/Withdraw/Reconsent/Pending/Evidence/Import/Correction/Anonymous/Link/Idempotent Replay)**.
- **API Scope/Permission(§76)**: Actor 인증 · Tenant/ws/brand Scope · Purpose/Channel Permission · Subject Access · **PII Masking** · Evidence Access 제한 · Export 권한 · Rate Limit · Enumeration 방지 · Idempotency · Audit · Environment. (신규 API `/api` 접두.)
- **Permission Registry(§77)**: VIEW_CONSENT_STATUS/HISTORY/EVIDENCE · CAPTURE_CONSENT/WITHDRAWAL · CORRECT/IMPORT/EXPORT_CONSENT · RESOLVE_CONFLICT · APPROVE/PUBLISH_POLICY · ADMIN_OVERRIDE · VIEW_AUDIT.
- **Evidence 접근 통제(§78)**: 상태조회 권한 ≠ Evidence 원문조회 권한 — 최소권한·PII Masking·Download/Signed URL 제한·Retention·Audit·Cross-Tenant 차단·Search/Bulk Export 제한.

---

## 5. Cache (§79-81) & Queue (§82-84) & Fail-closed (§85) & Override (§86)
- **Cache Key(§79)**: tenant/ws/brand · consent_subject_id · customer_profile_id · person_id · purpose/channel · jurisdiction · policy_version · record_version_set · identity_version · evaluation_stage · environment. **TTL(§80)**: Marketing Execution/Withdrawal/Conflict/Deletion/Policy 만료/Destination Sync/Automation Consent = 짧은 TTL 또는 Live Recheck. **무효화(§81)**: Grant/Deny/Withdraw/Expire/Restrict · Evidence/Conflict/Policy Version/Brand Mapping/Jurisdiction 변경 · Merge/Unmerge · Profile Delete · Correction · Import Correction · Anonymous-to-Known Link.
- **Queue Event(§82-83)**: event_id · type · subject/profile/person · tenant/ws/brand · purpose/channel · previous/current_status · policy_version · effective/occurred_at · source_system/account · correlation/idempotency · environment. **PII/Evidence 원문 Payload 불포함**. 유형: CONSENT_GRANTED/DENIED/WITHDRAWN/EXPIRED/RESTRICTED/INVALIDATED/CONFLICT_DETECTED/RESOLVED/POLICY_CHANGED/EVIDENCE_CHANGED/CORRECTED/SUBJECT_MERGED/UNMERGED/PROJECTION_STALE/REBUILT.
- **Queue 격리(§84)**: Tenant Partition · Workspace/Brand/Source Account Scope · Environment 분리 · Duplicate/Out-of-order · Retry/DLQ/Poison · Old Policy Version Event · **Withdrawal 우선처리** · Projection Rebuild 순서 · Deleted Subject Event 차단.
- **Fail-closed(§85)**: Subject/Scope/Policy/Evidence/Withdrawal 조회 실패 · Conflict 미해결 · Projection Stale 초과 · Record Version 불일치 · Tenant/Brand 불일치 · Jurisdiction 불명 · Cache↔Primary 불일치 · Engine Timeout · Execution Recheck 실패 → **실 마케팅 실행 차단**.
- **Override(§86)**: override_id · 대상 Subject/Purpose/Channel/Brand · 원래/Override 상태 · 사유/근거 · 유효기간 · 승인자 · Audit · 취소가능 · 재평가 시점. **일반 Override 금지**: Explicit Withdrawal/Denial · Legal Block · Deleted Subject · Cross-Tenant · Evidence Fraud · Critical Conflict.

---

## 6. Static Lint (§87) & Runtime Guard (§88) & Error/Warning (§89-90)
**Static Lint(§87, CI 신규 G-가드 후보)**: Consent Boolean 직접사용 · Purpose/Channel/Brand 없는 조회 · Policy Version 없는 평가 · **Projection 을 Source Record 로 사용** · Unknown→Granted · Withdrawal 무시 · Evidence Requirement 우회 · Merge 시 Consent 덮어쓰기 · **Consent Engine 우회** · Direct Consent Store Write · Raw PII Evidence 로그 · Tenant Filter 없는 Query · Source Account 없는 External Import · Audit 없는 Correction · Version 없는 Policy 변경.
**Runtime Guard(§88)**: Cross-Tenant/Brand/Purpose/Channel Consent 사용 · Withdrawn/Denied/Expired/Conflict/Invalid-Evidence/Deleted-Subject Consent 사용 · Stale Projection 실행 · Policy Version/Source Account 불일치 · **Unknown Consent Marketing 실행** · Recheck 실패 · Unauthorized Override.
**Error(§89)**: CONSENT_SUBJECT_NOT_FOUND · CONSENT_SCOPE_VIOLATION · PURPOSE/CHANNEL/POLICY_NOT_FOUND · POLICY_VERSION_MISMATCH · EVIDENCE_REQUIRED/INVALID · STATE_TRANSITION_INVALID · CONSENT_CONFLICT/WITHDRAWN/DENIED/EXPIRED/UNKNOWN · PROJECTION_STALE · PERMISSION_DENIED · IMPORT_INVALID · CORRECTION_FAILED · EXECUTION_RECHECK_FAILED · CROSS_BRAND/CROSS_TENANT_CONSENT_BLOCKED.
**Warning(§90)**: CONSENT/EVIDENCE/POLICY_EXPIRING · PROJECTION_STALE_WARNING · SOURCE_LOW_TRUST · LEGACY_CONSENT_USED · SCOPE_INHERITED · CONFLICT_REVIEW_REQUIRED · RECONFIRMATION_RECOMMENDED · ANONYMOUS_CONSENT_LINK_WARNING · MIGRATION_WARNING · EXECUTION_RECHECK_REQUIRED · MANUAL_REVIEW_RECOMMENDED.

---

## 7. Golden Dataset (§91) · Conformance (§92) · Equivalence (§93-94)
**Golden Consent Dataset(§91, 운영 Customer 미사용)**: 40+ 시나리오 — Email Granted/Denied/Withdrawn · SMS Unknown · Push Expired · Ads Granted · Retargeting Denied · Transactional · Purpose/Channel/Brand Mismatch · **Cross-Tenant/Cross-Source Account 차단** · Policy Version Mismatch · Evidence Verified/Missing/Invalid · Double Opt-in 완료/미완료 · **Latest Withdrawal 우선** · Source 간 Conflict · Manual Resolution · Expiry · Reconsent · Anonymous · Anonymous-to-Known · **Merge Consent 보존** · **Unmerge Consent 복원** · Shared Email Subject Conflict · **Legacy Boolean Migration** · Correction · Projection Rebuild/Stale · Cache Invalidation · **Build-time Granted 후 Execution-time Withdrawn** · Deleted Subject 차단 · Override 허용/금지 · Historical As-of.
**Conformance(§92)**: Audience Builder/Eligibility/CRM/Email/SMS/Push/Advertising/Retargeting/Personalization/AI Recommendation/Automation/Export 에 **동일 Canonical Consent 의미**(Subject/Purpose/Channel/Brand/Policy Version/Evidence/Conflict/Withdrawal/Expiry/Evaluation Time/Reason/Audit).
**Equivalence(§93-94)**: 기존 Resolver(isMarketingSendAllowed+crm_channel_prefs) vs Canonical — Current Status/Purpose/Channel/Brand/Selected Record/Evidence/Conflict/Expiry/Projection/Audience Eligible Count/Execution Result/History. 상태: MATCH/EXPECTED_{SCOPE,PURPOSE,CHANNEL,BRAND,WITHDRAWAL,EVIDENCE,POLICY_VERSION}_CORRECTION/**LEGACY_PRIVACY_DEFECT**/LEGACY_SECURITY_DEFECT/CANONICAL_CONSENT_DEFECT/UNSUPPORTED_LEGACY_STATE/MANUAL_REVIEW/**UNEXPLAINED**/BLOCKED. **UNEXPLAINED·고객영향 있는 LEGACY_PRIVACY_DEFECT → Production 전환 차단.**

---

## 8. Observability (§95) · Audit (§96) · 분류 (§97) · 중복 (§98) · 후퇴 (§99)
- **Observability(§95)**: Capture/Grant/Deny/Withdrawal/Expiry/Conflict/Evidence-Missing/Invalid/Projection-Rebuild/Stale/Evaluation/Block/Cross-Tenant/Cross-Brand-Block/Policy-Mismatch/Import-Error/Correction/Cache-Invalidation/Execution-Recheck-Failure/**Legacy Consent Usage**/P50·95·99 Count. → ModelMonitor 확장.
- **Audit(§96)**: SUBJECT_CREATED · CAPTURE_REQUESTED · GRANTED/DENIED/WITHDRAWN/EXPIRED/RESTRICTED/INVALIDATED · EVIDENCE_CREATED/VERIFIED/INVALIDATED · CONFLICT_DETECTED/RESOLVED · POLICY_CREATED/VERSION_CREATED/APPROVED/PUBLISHED · EVALUATED · PROJECTION_CREATED/REBUILT/INVALIDATED · IMPORTED · CORRECTED · OVERRIDE_REQUESTED/APPROVED/REVOKED · SUBJECT_MERGED/UNMERGED. → AuditRegistry 확장.
- **분류(§97)**: `crm_channel_prefs`=**VALIDATED_LEGACY→CANONICAL_CONSENT_STORE 승격**(Record 확장) · PreferenceCenter Resolver(isChannelAllowed/isTopicAllowed)=CANONICAL_CONSENT_ENGINE 편입 · `isMarketingSendAllowed`=발송 Consent Hook(Eligibility 편입) · GdprConsent(쿠키)=ANONYMOUS_CONSENT KEEP_SEPARATE · Purpose/Policy/Evidence/Projection Store=**부재(신규)**.
- **중복(§98)**: 현행 **Consent Resolver 단일**(PreferenceCenter 경유 isMarketingSendAllowed) — 채널별 자체 Consent Engine 다중 없음(양호). 통합=단일 Engine+채널 없이 Purpose/Channel Policy(§3.10·§110 채널별 독립 Engine 금지). email_suppression 은 Suppression(Part 3-3-2, Consent 와 분리 §3.4).
- **후퇴 방지(§99)**: Purpose/Channel/Brand Scope·Status·Grant/Deny/Withdraw/Expiry·Evidence·Double Opt-in·Preference·History·Correction·Conflict·Projection·Anonymous·Merge/Unmerge·Audience Filter·Execution Check·Export·Audit·**기존 API Compatibility** 비교. 승인 안 된 감소 시 전환 차단. crm_channel_prefs 채널/토픽/global-all·quiet-hours 보존 필수.

---

## 9. 완료 조건 대응 (본 문서)
§109의 14-19(Projection/Rebuild·분리·Audience/Eligibility 연결·Hook·Merge/Unmerge/Split·Anonymous)·22-34(History/Explain/Lineage·API/Permission·Evidence 통제·Cache/Queue·Fail-closed·Override·Lint/Guard·Golden/Conformance/Equivalence·분류/중복/후퇴·ADR/PM). **코드변경 0** — Projection/Hook/CI가드 실 구현은 Golden+Conformance+Equivalence+verify+배포승인 후.

**다음**: EPIC 06-A Part 3-3-2 — Suppression Engine, Preference Center, Revocation Propagation & Execution-time Validation. **선행 P0(구현세션)**: 발송 게이트 SEG-C4(phone DNC = Suppression 영역)·Audience Removal(SEG-H2 = Withdrawal Propagation).
