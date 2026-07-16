# Canonical Audience Eligibility Governance — Recheck, Reason/Explain, Cache, Reconciliation, Override, Lint/Guard & Test

> **EPIC 06-A Part 3-2** (3/3) · 289차 (2026-07-16) · **비파괴 설계 명세(코드변경 0)**
> 근거: Part 1(무게이트 발송 SEG-C1~C4·중앙게이트 실행시점 recheck) · 형제: [`CANONICAL_AUDIENCE_ELIGIBILITY.md`](CANONICAL_AUDIENCE_ELIGIBILITY.md) · [`CANONICAL_AUDIENCE_FRESHNESS_DESTINATION.md`](CANONICAL_AUDIENCE_FRESHNESS_DESTINATION.md) · ADR=[`../architecture/ADR_CANONICAL_AUDIENCE_ELIGIBILITY_ENGINE.md`](../architecture/ADR_CANONICAL_AUDIENCE_ELIGIBILITY_ENGINE.md)
> **성격**: 거버넌스 계약. 실 CI 가드·구현은 후속 승인 세션.

---

## 1. Reason (§59-60) · Explain (§61) · Policy Lineage (§62)

**Reason Registry(§59)**: reason_code · category · severity · eligible impact · user-facing/admin-facing message · retryable · refresh required · manual review allowed · override allowed · policy reference · documentation reference · owner · version.
**기본 Reason Code(§60)**: PROFILE_DELETED/ANONYMIZED · PROFILE_STATUS_NOT_ALLOWED · IDENTITY_CONFIDENCE_TOO_LOW · IDENTITY_CONFLICT · SHARED_IDENTIFIER · IDENTIFIER_{MISSING,UNVERIFIED,INVALID,EXPIRED} · PROFILE_STALE · MEMBERSHIP_STALE · CONSENT_{REQUIRED,UNKNOWN,WITHDRAWN} · SUPPRESSION_ACTIVE · DESTINATION_ACCOUNT_NOT_READY · DESTINATION_IDENTIFIER_UNSUPPORTED · JURISDICTION_RESTRICTED · SENSITIVE_ATTRIBUTE_RESTRICTED · TEST_DATA_PRODUCTION_BLOCKED · MERGE/UNMERGE_COOLDOWN_ACTIVE · WRONG_TARGET_RISK · EXECUTION_RECHECK_REQUIRED.
**Explain(§61, §3.9)**: 왜 Eligible/Blocked · 사용 Profile 상태 · Identity Confidence · 선택/제외 Identifier · Freshness 정책 · Purpose·Channel Policy · Destination Account 검증 · Consent/Suppression 결과 · 재평가 시점. **Reason 숨김 금지**(현행 UI 가짜녹색 금지 정합).
**Policy Version Lineage(§62)**: customer_schema·identity·identifier·freshness·purpose·channel·consent·suppression·destination·jurisdiction·data_classification policy version 연결.

---

## 2. 단계별 Recheck (§63-67) — ★Build-time 영구신뢰 금지 (§3.4)

- **Build-time(§63)**: Scope·Profile Status·Identity·Identifier 후보·Freshness·Purpose·Channel·Consent/Suppression Hook·Test/Demo·Destination Intent·기본 Wrong-target. **최종 실행 승인과 동일하지 않음.**
- **Snapshot Approval Recheck(§64)**: Snapshot Age·Membership Freshness·Identity Version 변화·Consent/Suppression 변화·Destination Account 변화·Credential·큰 Member Diff·Wrong-target·Removal Capability.
- **Destination Sync Recheck(§65)**: Snapshot 승인/Expiry·Destination Account·Credential·Identifier Format·Hash Version·Current Consent/Suppression·Deleted Profile·Merge/Unmerge·Destination Policy·Wrong-target.
- **Execution-time Recheck(§66) — ★핵심**: Current Profile Status·Identity Version·Identifier·**Consent·Suppression**·Destination·**Frequency Cap**·Cooldown·Deletion·Duplicate Action·Idempotency·**Kill Switch**·Wrong-target. **현행 정합**: isMarketingSendAllowed 가 발송루프에서 이 역할(Email/SMS캠페인/WhatsApp broadcast/WebPush) — 무게이트 경로(SEG-C1~C4)에 **강제 적용**이 선행 P0.
- **Recheck 정책(§67)**: recheck trigger · max result age · stages requiring recheck · fields requiring live read · cache allowed 여부 · failure/timeout behavior · fallback · audit.

---

## 3. Cache (§68-70)
**Key(§68)**: tenant/ws/brand · customer_profile_id · identity_version · purpose · channel · destination_account_id · policy_version_set · consent_version · suppression_version · identifier_version · freshness_reference · evaluation_stage · environment.
**장기 Cache 금지/짧은 TTL(§69)**: Consent · Suppression · Deletion 상태 · Merge/Unmerge · Destination Credential · Wrong-target Risk · Frequency Cap · Kill Switch.
**무효화(§70)**: Profile Status · Identifier · Verification · Identity Link · Merge/Unmerge · Consent · Suppression · 삭제/익명화 · Membership · Destination Account · Credential · Policy · Jurisdiction · Data Classification · Test/Production 변경 시 즉시.

---

## 4. Batch (§71) · Realtime (§72) · Fail-closed (§73)
- **Batch(§71)**: Tenant Partition · Snapshot · Policy Version Pinning · Chunking · Retry · Idempotency · Partial Failure · Reason Aggregation · Checkpoint · Cancellation · Reconciliation · Audit.
- **Realtime(§72)**: Event Time · Identity/Consent/Suppression Lag · Profile Cache · Merge/Unmerge/Deletion/Identifier Revocation Event · Destination Account 상태 · Kill Switch · Reconciliation.
- **Fail-closed(§73)**: Scope/Identity/Consent/Suppression/Deletion/Destination Account/Credential Unknown·Wrong-target Unknown·Policy Version 불일치·Execution Recheck 실패 = **기본 Fail-closed**. Preview 는 Warning/Partial 허용, **실 실행은 차단**. (현행 게이트 fail-open SEG-M1 정면 교정.)

---

## 5. Reconciliation (§74-76) & Override (§77)
- **Reconciliation(§74) & 상태(§75)**: Audience Member vs Current Profile/Identifier/Consent/Suppression/Membership/Destination · Cached vs Live · Deleted Profile 잔존 · Merge/Unmerge 영향 · Test/Demo 혼입. 상태: MATCH/STALE_{PROFILE,IDENTITY,IDENTIFIER,CONSENT,SUPPRESSION}/DESTINATION_DRIFT/POLICY_DRIFT/DELETED_PROFILE_PRESENT/TEST_DATA_PRESENT/WRONG_TARGET_RISK/REBUILD_REQUIRED/REMOVAL_REQUIRED. (SEG-H5 Audience Reconciliation 계약.)
- **Re-evaluation Trigger(§76)**: Profile Updated · Identifier Added/Verified/Revoked · Identity Linked/Merged/Unmerged · Consent Granted/Withdrawn/Expired · Suppression Added/Removed · Profile Deleted/Anonymized · Membership Added/Removed · Destination Account Changed · Credential Refreshed/Revoked · Policy Version Changed · Model Score Updated/Expired · Jurisdiction Changed.
- **Override(§77)**: override_id · 대상 Member/Purpose/Channel · 원래 차단이유 · Override 이유 · 근거 · 유효기간 · 승인자 · 재검증 시점 · Audit · 취소가능. **일반 Override 금지**: Profile Deleted/Anonymized · Legal Block · Consent Withdrawn · Cross-Tenant · Wrong Destination Account · Critical Wrong-target.

---

## 6. API (§78-79) · UI (§80-81)
**API(§78)**: 단일/Batch Eligibility 평가 · Preview · Reason/Explain · Identifier 후보/Selected 조회 · Channel/Destination Readiness · Freshness · Recheck · Override 요청 · Reconciliation · Policy 조회.
**API 보안(§79)**: Actor 인증 · Tenant/ws/brand Scope · Purpose 권한 · PII Masking · **Identifier 원문 제한** · Destination Account 권한 · Rate Limit · Batch Size Limit · Audit · Idempotency · Enumeration 방지. (신규 API `/api` 접두 필수.)
**UI(§80)**: Eligibility Summary · Eligible/Blocked Count · Reason Breakdown · Identity/Identifier Readiness · Contactability · Reachability · Freshness · Consent/Suppression Status · Destination Readiness · Wrong-target Risk · Recheck Status · Override Request · Policy Version · Explain · Audit.
**UI 금지(§81)**: Blocked 이유 숨김 · Consent와 Eligibility 혼용 · Reachability·Contactability 혼용 · Stale를 최신처럼 · **Unknown을 Eligible로** · Destination Account 자동추정 · Identifier 원문 무단표시 · Test/Demo 숨김 · Execution Recheck 필요 숨김.

---

## 7. Static Lint (§82) & Runtime Guard (§83)
**Static Lint(§82, CI 신규 G-가드 후보)**: **Eligibility Engine 우회** · 채널별 자체 Eligibility 구현 · **Customer ID만으로 실행 허용** · Identity Confidence 미검증 · Unverified Identifier 사용 · Destination Account 미지정 · Purpose 미지정 · Freshness 정책 누락 · **Consent/Suppression Resolver 미호출** · Deleted Profile 미차단 · Test/Demo Production 사용 · **Unknown 상태 Eligible 처리** · Execution Recheck 누락 · **Hardcoded Threshold** · Policy Version 없는 판정 · Audit 없는 Override · **Raw Identifier 로그 출력**.
- **★현행 직접 대상**: /sms/send·/whatsapp/send·sendOne·/sms/broadcast(SEG-C1~C4)가 "Consent/Suppression Resolver 미호출"·"Customer ID만으로 실행"에 해당 → Lint 도입 시 이 경로 플래그. (기존 G9/G10/G11 패턴·오탐 검증 후.)
**Runtime Guard(§83)**: Cross-Tenant/Cross-Brand Member · Wrong Destination Account · Deleted/Anonymized · Identity Conflict/Version 불일치 · Low Confidence · Merge/Unmerge Cooldown · Identifier Missing/Invalid/Expired · Consent Missing/Withdrawn · Suppression Active · Freshness Expired · Destination Not Ready · Credential Invalid · Jurisdiction Restricted · Sensitive Restricted · Test/Demo · **Wrong-target High/Critical/Unknown** · Recheck 실패 · Kill Switch 활성 → 차단.

---

## 8. Error (§84) & Warning (§85)
**Error**: ELIGIBILITY_REQUEST_INVALID · POLICY_NOT_FOUND · POLICY_VERSION_MISMATCH · PURPOSE/CHANNEL_NOT_ALLOWED · PROFILE_STATUS_NOT_ALLOWED · IDENTITY_CONFIDENCE_TOO_LOW · IDENTITY_CONFLICT · IDENTIFIER_{NOT_FOUND,NOT_VERIFIED,INVALID,EXPIRED} · PROFILE/MEMBERSHIP_FRESHNESS_EXPIRED · CONSENT_{REQUIRED,WITHDRAWN} · SUPPRESSION_ACTIVE · DESTINATION_ACCOUNT_NOT_READY · DESTINATION_IDENTIFIER_UNSUPPORTED · JURISDICTION_RESTRICTED · SENSITIVE_DATA_RESTRICTED · TEST_DATA_PRODUCTION_BLOCKED · EXECUTION_RECHECK_FAILED · WRONG_TARGET_RISK_DETECTED · ELIGIBILITY_PERMISSION_DENIED.
**Warning**: PROFILE_FRESHNESS_WARNING · MEMBERSHIP_STALE_WARNING · IDENTIFIER_EXPIRING · DESTINATION_TOKEN_EXPIRING · SHARED_IDENTIFIER_WARNING · MERGE_COOLDOWN_WARNING · CONSENT/SUPPRESSION_RECHECK_REQUIRED · APPROVAL_REQUIRED · PREVIEW_ONLY · MANUAL_REVIEW_RECOMMENDED · MODEL_SCORE_EXPIRING · DESTINATION_REMOVAL_LIMITED · LEGACY_ELIGIBILITY_USED · POLICY_DEPRECATION_WARNING.

---

## 9. Golden Dataset (§86) · Channel Conformance (§87) · Equivalence (§88-89)
**Golden Eligibility Dataset(§86, 운영 Customer 미사용)**: 40+ 시나리오 — Active+Verified/Unverified Email · Invalid/Hard Bounce/Complaint · Verified/Reused Phone · Shared Email/Phone · Valid/Expired Push Token · Anonymous Onsite(허용)/Anonymous Email(차단) · High/Low Confidence · Identity Conflict · Merge/Unmerge Cooldown · Deleted/Anonymized · Consent Granted/Unknown/Withdrawn · Suppression Active · Fresh/Stale Profile · Stale Membership · Expired Model Score · Destination Ready/Disconnected · **Wrong Destination Account** · Unsupported Identifier · Wrong Hash Version · Restricted Jurisdiction · Sensitive Block · **Test Profile Production 차단** · **Sandbox Destination Production 차단** · **Build-time 통과 후 Execution-time 차단** · Cache Invalidation · Reconciliation Drift · Override 허용/금지.
**Channel Conformance(§87)**: Email/SMS/Push/CRM/Advertising/Onsite/Export 에 **동일 Core Eligibility 테스트**(Scope/Purpose/Identity/Identifier/Freshness/Consent/Suppression/Destination/Reason/Recheck/Audit). 채널별 의미분기 금지(§3.10).
**Equivalence(§88-89)**: 기존(isMarketingSendAllowed 등) vs Canonical — Eligible/Blocked Count·Selected Identifier·Contactability·Reachability·Freshness·Consent/Suppression·Destination·Reason·Execution Result·Latency. 상태: MATCH/EXPECTED_{IDENTITY,IDENTIFIER,FRESHNESS,CONSENT,SUPPRESSION,DESTINATION}_CORRECTION/EXPECTED_TEST_DATA_REMOVAL/LEGACY_SECURITY_DEFECT/**LEGACY_WRONG_TARGET_RISK**/CANONICAL_ELIGIBILITY_DEFECT/UNSUPPORTED_POLICY/**UNEXPLAINED**/BLOCKED. **UNEXPLAINED/LEGACY_WRONG_TARGET_RISK → 운영 전환 차단.**

---

## 10. Performance (§90) · Observability (§91) · Audit (§92)
- Performance(§90): Single P50/P95/P99 · Batch Throughput · Identifier Ranking · Freshness · Destination Readiness · Consent/Suppression Resolver Latency · Execution Recheck · Cache Hit · Reconciliation · Queue Lag · Tenant 간 간섭 · External Provider 조회 비용.
- Observability(§91): Request/Eligible/Blocked/Preview-Only/Approval-Required/Recheck-Required Count · Identity/Identifier/Freshness/Consent/Suppression/Destination/Jurisdiction/Test-Data/Wrong-target Block Count · Cache Hit · Reconciliation Drift · Override Count · Runtime Guard Block · **Legacy Eligibility Usage** · P50/95/99. → ModelMonitor/관측 확장.
- Audit(§92): ELIGIBILITY_POLICY_CREATED/VERSION_CREATED/APPROVED · EVALUATED/BLOCKED/RECHECKED/EXPIRED · IDENTIFIER_SELECTED/REJECTED · DESTINATION_READINESS_CHECKED · WRONG_TARGET_RISK_DETECTED · OVERRIDE_REQUESTED/APPROVED/REVOKED · RECONCILIATION_STARTED/COMPLETED · CACHE_INVALIDATED. → AuditRegistry 확장.

---

## 11. 기존 분류 (§93) · 중복 감사 (§94) · 후퇴 방지 (§95)
### 분류
| 구현 | 분류 |
|---|---|
| `CRM::isMarketingSendAllowed` | **CANONICAL_ELIGIBILITY_ENGINE 승격**(채널/토픽 opt-out+suppression+quiet+freq) |
| `CRM::isFrequencyCapped` | CANONICAL(Frequency, Eligibility 내 편입) |
| email_suppression / crm_channel_prefs | VALIDATED_LEGACY(Consent/Suppression Resolver, Part3-3) |
| AdAdapters 자격 tenant-scoped 확인 | CANONICAL_DESTINATION_READINESS(부분)·Removal 부재 확장 |
| 발송루프 per-recipient 게이트 | LEGACY_ADAPTER→Execution-time Recheck 로 형식화 |
| **무게이트 경로(SEG-C1~C4)** | **BLOCKED_WRONG_TARGET**(Engine 강제 대상, P0) |
| Identity Confidence/Freshness/Contactability≠Reachability 분리 | **부재(신규)** |

### 중복 감사 (§94)
현행 **Eligibility 는 단일 게이트(isMarketingSendAllowed)** — 채널별 자체 Eligibility 다중 없음(양호). 단 무게이트 경로가 게이트 **미호출**(중복 아니라 누락, SEG-C1~C4). 통합=단일 Core+채널 Adapter(§3.10·§106 채널별 독립 Engine 금지).

### 후퇴 방지 (§95)
비교: Purpose/Channel·Identity Confidence·Identifier Verification·Shared Identifier·Contactability·Reachability·Freshness·Destination Account·Jurisdiction·Data Classification·Reason Code·Explain·Recheck·Override·Cache Invalidation·Reconciliation·Runtime Guard·**기존 Consumer Compatibility**. 승인 안 된 감소 시 전환 차단. isMarketingSendAllowed 의 채널/토픽/suppression/quiet/freq 로직 **보존 필수**.

---

## 12. 완료 조건 대응 (본 문서)
§105의 19-30(Reason/Explain/Lineage·Recheck·Cache/Invalidation·Batch/Realtime·Fail-closed·Override·Lint/Guard·Golden/Conformance/Equivalence·분류·중복·후퇴·ADR/PM). **코드변경 0** — Recheck/Reconciliation/CI가드 실 구현은 후속 승인 세션(Channel Conformance+Equivalence+verify+배포승인).

**다음**: EPIC 06-A Part 3-3 — Audience Consent, Suppression, Purpose Limitation & Privacy Governance. **선행 P0(구현세션)**: 발송 게이트 표준화(SEG-C1~C4, Execution-time Recheck 강제)·Audience Removal/Reconciliation(SEG-H2/H5).
