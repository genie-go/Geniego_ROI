# Canonical Audience Build Pipeline — Request, Stages, Identity, Dedup, Preview, Diff, Snapshot & Lineage

> **EPIC 06-A Part 3-1** (2/3) · 289차 (2026-07-16) · **비파괴 설계 명세(코드변경 0)**
> 근거: Part 1(현행 발송루프 즉석필터·Snapshot 부재·refreshSegmentForSend `CRM.php:1512-1527`) · 형제: [`CANONICAL_AUDIENCE_SCHEMA.md`](CANONICAL_AUDIENCE_SCHEMA.md) · [`CANONICAL_AUDIENCE_GOVERNANCE.md`](CANONICAL_AUDIENCE_GOVERNANCE.md)
> **성격**: Build 파이프라인 계약. 실 구현은 후속 승인 세션(Golden Dataset+Equivalence+verify+배포승인). **외부 Destination 업로드·발송 아님(§3.9)**.

---

## 0. 현행 대비
현행은 **Build Pipeline 자체가 부재** — 발송 시점 `refreshSegmentForSend`(멤버십 재물질화, 실패 삼킴) → 발송루프가 per-recipient consent 게이트. Snapshot/Candidate/Diff/Approval 없음. Canonical 은 발송 **앞단**에 재현가능·멱등·승인형 Build 계층을 **추가**(발송 게이트는 Part 3-2/3-3에서 표준화 — 선행 P0 SEG-C1~C4).

---

## 1. Build Request (§10) & Job (§11) & 상태 (§12)

**Request**: `build_request_id, audience_id, audience_version_id, tenant_id, workspace_id, brand_id, requested_by, request_purpose, evaluation_time, as_of_time, exact_or_approximate, preview_or_build, sample_limit, max_member_limit, feature_flag_context, idempotency_key, correlation_id, requested_at`.

**Job**: `build_job_id, build_request_id, audience_version_id, status, started_at, completed_at, failed_at, candidate_count, included_count, excluded_count, duplicate_count, blocked_count, warning_count, snapshot_id, retry_count, checkpoint, error_code, error_detail_reference, lineage_id, audit_reference`.

**Build 상태(§12)**: REQUESTED→VALIDATING→PLANNING→CANDIDATE_BUILDING→IDENTITY_RESOLVING→DEDUPLICATING→EXCLUSION_APPLYING→ELIGIBILITY_CHECKING→SNAPSHOT_CREATING→COMPLETED; 분기 PARTIAL/FAILED/CANCELLED/ROLLED_BACK/EXPIRED.

---

## 2. Segment Membership Input Contract (§13)
Builder 는 Segment Membership 을 다음과 함께 수신: `segment_id, segment_version_id, evaluation_id, membership_snapshot_id, customer_profile_id, person_id, identity_version, membership_status, included_at, effective_from/to, evaluation_time, attribute_version_set, metric_version_set, reason, lineage, tenant_id, workspace_id, brand_id, environment`. **Published Version/Snapshot 고정**(§3.3) — 현행 crm_segment_members(버전없음)는 Part 2 Snapshot 도입 후 연결.

---

## 3. Build Pipeline 22단계 (§35)

1 Request Auth · 2 Actor/Permission · 3 Audience Version 확인 · 4 Definition Validation · 5 **Source Segment/List Version Lock** · 6 Scope Resolution · 7 Candidate Collection · 8 Profile Status Filter · 9 **Identity Resolution(EPIC05)** · 10 Duplicate Detection · 11 Inclusion·Exclusion 적용 · 12 기본 Eligibility · 13 **Consent·Suppression Resolver 호출** · 14 Freshness · 15 Identifier Selection · 16 Final Deduplication · 17 Preview·Diff · 18 **Approval Gate** · 19 Snapshot 생성 · 20 Checksum·Validation · 21 Audit·Metrics · 22 Completion.

**단계 독립성(§36)**: 각 단계 입출력 Contract·Version·Status·Retry·Idempotency·Metrics·Error·Warning·Checkpoint·Audit·Rollback/Rebuild.

**Pipeline Matrix(§87)**: | Stage | Input | Output | Version | Retry | Idempotency | Error | Metric | Audit | Rollback |

---

## 4. Idempotency (§37) · Lock (§38) · Checkpoint/Resume (§41) · Partial Failure (§40)

- **Idempotency Key(§37)**: tenant_id + audience_version_id + source_version_set + evaluation_time + policy_version_set + preview_or_build + environment → 재시도 시 Snapshot 중복생성 방지.
- **Lock(§38)**: 동일 Audience Version 동시 Full Build · Build↔Publish · Build↔Rollback · Build↔Delete · 승인중 재Build · Destination 실행중 Snapshot 변경 방지. (285차 교훈: 루프 내 외부API N+1 금지 — Candidate Collection 은 집합연산.)
- **Checkpoint(§41)**: Source/Identity/Dedup/Exclusion/Eligibility/Snapshot-Write/Validation 완료 지점. **Definition·Policy Version 변경 후 재사용 금지**.
- **Partial Failure(§40)**: FAIL_CLOSED / FAIL_BUILD / ALLOW_PARTIAL_PREVIEW / RETRY_STAGE / SKIP_OPTIONAL_SOURCE / MANUAL_REVIEW. **마케팅 실행용 Snapshot 은 기본 불완전 결과 미승인**(fail-closed 우선).

---

## 5. Candidate Collection (§39) & Identity (§30-31)

- **Candidate Collection(§39)**: source priority/count/version/evaluation-time/freshness/overlap/errors/partial-result/lineage 기록.
- **Identity Resolution(§30, §3 원칙)**: **EPIC05 Customer Identity Engine 사용**(자체 Identity Resolution 구현 금지). 확인: Canonical Profile · Person ID · Identity Version · Confidence · Conflict/Merge/Unmerge-Cooldown · Deleted/Anonymized · Verified Identifier · Destination Identifier Eligibility. **현행 정합**: refreshSegmentMembers 가 이미 identity_id 통합(`CRM.php:1600-1601`) → 이 로직 재사용(중복 Identity 엔진 금지).
- **Identity Policy(§31)**: min_identity_confidence · person/profile-level dedup · verified_identifier_required · allowed_identifier_types · conflict_exclusion · merge/unmerge_cooldown · shared_identifier_policy · anonymous/household/company_contact_policy.

---

## 6. Duplicate Detection (§32-34)

- **기준(§32)**: customer_profile_id · person_id · verified identifier hash · destination-specific identifier · external channel ID · source account · household/company shared contact. **Purpose별 Deduplication Key** 정의.
- **상태(§33)**: UNIQUE/DUPLICATE_PROFILE/DUPLICATE_PERSON/DUPLICATE_IDENTIFIER/SHARED_IDENTIFIER/DESTINATION_DUPLICATE/MANUAL_REVIEW/BLOCKED.
- **Dedup 우선순위(§34)**: ① Verified Identity ② Higher Confidence ③ Current Consent ④ Higher Profile Quality ⑤ Most Recent Verified Identifier ⑥ Preferred Source ⑦ **Stable Deterministic Tie-breaker**. **임의/DB반환 순서 금지**(§3.6·§34 — 결정론적).

---

## 7. Inclusion·Exclusion 우선순위 (§25) & Matrix (§88)

처리 순서: ①Source Candidate 수집 ②Scope 검증 ③Profile 상태 ④Identity ⑤Duplicate 후보 ⑥**Explicit Exclusion** ⑦**Legal·Global Suppression** ⑧Holdout·Control ⑨Consent·Channel Eligibility ⑩Freshness ⑪Identifier Selection ⑫Final Duplicate ⑬Snapshot.

**§3.5 우선순위**: Legal Block > Global Suppression > Deletion/Anonymization > Explicit Exclusion > Channel/Brand Suppression > Identity Block > Eligibility Block > **Inclusion** > Segment Membership. **Exclusion·Suppression 이 Inclusion 우선**(세부=Policy Registry).

**Exclusion Matrix(§88)**: | Priority | Exclusion Type | Source | Policy Version | Override | Execution Recheck | Status | Risk |

---

## 8. Preview (§42-44) & Diff (§45-46)

### 8.1 Preview(§42, §3.7 동일 Pipeline)
Total Candidate · Unique Person · Unique Profile · Included · Excluded · Blocked · Duplicate · Identity Pending · Consent Pending · Suppression · Stale · Invalid Identifier · Sample Included/Excluded · Source Contribution · Risk Warnings · Estimated Build Cost · Exact/Approximate.
- **★§3.7·§42**: Preview 가 단순 Count Query, 실 Build 가 다른 조건 사용 **금지** → 동일 Definition/Version/Evaluation Time/Identity/Exclusion Policy. **현행=Preview 부재** → 신규.
- **Sample 보호(§43)**: PII Masking · Permission · **Stable Sampling** · Tenant Scope · Sensitive 제외 · Download 제한 · Audit · Size Limit.

### 8.2 Count 정확성 (§44)
Candidate / Unique Profile / Unique Person / Eligible / Final Member / Destination-ready / Approximate / Exact **구분 표기**. "Audience Size" 단일 숫자로 혼용 금지(현행 미구분).

### 8.3 Diff (§45-46)
Added/Removed/Retained Members · Newly Blocked/Eligible · Consent/Suppression/Identity Changed · Duplicate Resolution Changed · Source Contribution Changed · Member Count/% Change · Risk Change · Estimated Destination Impact. 비교 시 previous/current snapshot·정책 versions·evaluation time·source segment versions·destination intent **고정**.

---

## 9. Snapshot Lock (§49) · Refresh (§50-51) · Expiry (§52) · Validation (§53) · Quality (§54)

- **Snapshot Lock(§49)**: 승인 시 Audience Version·Source Segment/Static-List Versions·정책 Versions·Evaluation Time·Member Checksum·Approval·Expiry 잠금.
- **Refresh(§50-51)**: MANUAL/SCHEDULED/EVENT_TRIGGERED/SEGMENT_CHANGE/CONSENT_CHANGE/IDENTITY_CHANGE/FULL_REBUILD/INCREMENTAL. Segment/Membership/Merge-Unmerge/Confidence/Consent/Suppression/삭제/Identifier/Static-List/Policy/Destination 변경 시 Refresh·무효화 검토.
- **Expiry(§52)**: expires_at·refresh_before·stale_after·destination_max_age·retention_after_expiry·expired usage policy·removal·archive. **만료 Snapshot 신규 실행 사용 금지**.
- **Build Validation(§53)**: Scope·Source Version·Candidate Count 합리성·Dedup·Exclusion·Identity·Consent/Suppression Resolver 결과·Deleted Profile 제외·**Test/Demo 제외**·Checksum·Lineage·Approval·Expiry·Error/Warning.
- **Quality Score(§54)**: Source Completeness·Identity·Dedup·Freshness·Consent/Suppression Completeness·Identifier Readiness·Lineage·Approval·Snapshot Integrity. **Quality Score 만으로 자동 실행 승인 금지**.

---

## 10. Lineage (§55) & Explain (§56-57)

**Lineage(§55)**: Customer Profile → Segment Version → Segment Membership → Audience Definition → Candidate → Exclusion·Eligibility → Audience Member → Snapshot → Approval → (향후 Destination Execution). 각 ID·Version·Time·Scope 기록.

**Member Explain(§56)**: 어느 Segment/List 포함 · 어느 Version · 왜 중복에서 선택 · 어느 Identity 기준 통과 · 어느 Exclusion 통과 · 어느 Consent/Suppression 결과 · 어느 Identifier 선택예정 · Warning · 만료시점.
**Excluded Explain(§57)**: exclusion reason/source · policy version · source segment · identity/consent/suppression/deleted/stale status · retry 가능 · manual override 가능.

**Manual Override(§58)**: 권한·사유·대상·기간·정책근거·승인·Audit·**실행전 재검증**·취소가능. **Legal Block/Deletion/Consent Withdrawal 을 일반 Override 로 우회 금지**.

---

## 11. 완료 조건 대응 (본 문서)
§92의 3(Build Request/Job)·6(Membership Input)·12(Pipeline)·13(Idempotency/Lock/Checkpoint/Partial)·14(Preview=Build 동일)·15(Diff/Approval/Snapshot Lock)·16(Refresh/Expiry)·17(Explain/Lineage)·부분 10-11(Identity/Dedup). **코드변경 0** — 실 파이프라인·Preview·Snapshot 구현은 Golden Dataset+Build Equivalence 통과·verify·배포승인 후.
