# Canonical Audience Freshness, Destination Readiness, Jurisdiction & Wrong-target Governance

> **EPIC 06-A Part 3-2** (2/3) · 289차 (2026-07-16) · **비파괴 설계 명세(코드변경 0)**
> 근거: Part 1(AdAdapters 자격 tenant-scoped·is_active=1·Removal/Reconciliation 부재 SEG-H2/H5·286차 platform_growth 하이재킹) · 형제: [`CANONICAL_AUDIENCE_ELIGIBILITY.md`](CANONICAL_AUDIENCE_ELIGIBILITY.md) · [`CANONICAL_AUDIENCE_ELIGIBILITY_GOVERNANCE.md`](CANONICAL_AUDIENCE_ELIGIBILITY_GOVERNANCE.md)
> **성격**: 목표 계약. 실 구현은 후속 승인 세션.

---

## 1. Freshness Engine (§41-50)

### 1.1 Freshness 대상 (§41) & Policy (§42) & 상태 (§43)
대상: Profile · Identifier · Identity · Segment Membership · Audience Candidate · Consent · Suppression · Attribute · Event · Metric · Model Score · Destination Account · Credential · Audience Snapshot Freshness.
Policy(§42): policy_id · target_type · max_age · max_lag · warning_age · stale_age · expiry_age · purpose · channel · stale_behavior · fallback · recheck_required · owner · version.
상태(§43): FRESH/ACCEPTABLE/WARNING/STALE/EXPIRED/**UNKNOWN**/NOT_APPLICABLE.
**Matrix(§101)**: | Target Type | Max Age | Warning Age | Stale Age | Expiry | Stale Behavior | Purpose | Channel | Version |

### 1.2 Stale 처리 (§44)
ALLOW_WITH_WARNING / PREVIEW_ONLY / REQUIRE_REFRESH / REQUIRE_APPROVAL / BLOCK / FALLBACK_TO_SAFE_ATTRIBUTE / EXCLUDE_MEMBER. **고위험 실행=기본 BLOCK 또는 REQUIRE_REFRESH**. Unknown≠Fresh(§3.5 정합).

### 1.3 대상별 (§45-50)
- **Profile(§45)**: last_profile_update/source_sync/identity_resolution/consent_update/suppression_update/identifier_verification/quality_check/reconciliation.
- **Segment Membership(§46)**: segment_version·evaluation_time·effective time·last refreshed·dependency freshness·identity/consent/metric version·stale after·expiry·refresh status. **현행 crm_segment_members=버전없음**(Part 2 Snapshot 도입 후 연결).
- **Attribute(§47)**: observed/recorded/source-sync/verification time·valid_from/to·source reliability·attribute별 max age·purpose별 max age(주소/연락처/구매상태/Lifecycle 상이).
- **Event(§48)**: event_time·processing_time·late arrival·dedup·correction·re-attribution·retention·real-time/batch lag·watermark.
- **Metric(§49)**: metric_id/version·calculated_at·input window·source lag·semantic certification·recomputation pending·stale behavior·purpose eligibility. (EPIC03 정합.)
- **Model Score(§50)**: model_id/version·generated_at·feature freshness·prediction window·expiry·confidence·**drift/calibration status**·automation eligibility. **Expired/Drift Score 를 고위험 Audience 사용 금지**(현행 BG/NBD 미영속 SEG-M4 정합).

---

## 2. Destination Account Readiness (§37-40)

### 2.1 Account Readiness (§37) & 상태 (§38)
확인: destination_account_id · tenant/ws/brand · channel · connector_id · credential_id · external_business_id · environment · account_status · permission_scope · **upload_permission** · **removal_permission** · token_status · last_verified_at · supported_identifier_types · supported_regions · policy_status · rate_limit_status.
상태(§38): READY/READY_WITH_WARNINGS/TOKEN_EXPIRING/PERMISSION_LIMITED/READ_ONLY/UPLOAD_BLOCKED/REMOVAL_BLOCKED/SUSPENDED/DISCONNECTED/UNVERIFIED/**WRONG_ACCOUNT_RISK**/BLOCKED.
**현행 매핑**: AdAdapters 자격 tenant-scoped·is_active=1(`AdAdapters.php:92-99`) → account_status/token_status 확인. **removal_permission=현행 부재**(SEG-H2). WRONG_ACCOUNT_RISK=286차 platform_growth act-as 하이재킹 클래스 회귀방지.

### 2.2 Destination Capability (§39) & Channel Readiness (§40)
Capability(§39): supported audience types/identifier types · identifier format · hash algorithm · min/max size · chunk size · incremental add/**remove** · full replace · expiry · region restrictions · data sharing requirements · **deletion support** · **reconciliation support** · rate limits · error mapping. (현행: Meta 5k배치·Google 540일·TikTok 파일업로드·Removal/Reconcile 미지원 SEG-H2/H5.)
Channel Readiness(§40): channel · destination account · account/identifier/policy/permission/region/**removal**/**reconciliation** readiness · final readiness · warnings · blockers · valid_until.
**Matrix(§102)**: | Channel | Destination Account | Supported Identifier | Account Status | Credential | Removal | Reconciliation | Final Readiness | Risk |

**§3.7**: 같은 고객·채널이라도 Destination Account/Brand/Region/Credential Scope/Identifier 형식/Provider 정책/최소크기/금지지역/권한에 따라 Eligibility 상이.

---

## 3. Jurisdiction & Geography (§51-52)

**Jurisdiction Eligibility(§51)**: customer country/region · tenant legal entity · destination region · processing region · data transfer region · purpose · channel · age/minor restriction · consent requirement · retention requirement · **cross-border restriction** · legal review status. **법률해석 필요 항목=`LEGAL_REVIEW_REQUIRED` 차단/조건부**(자동허용 금지).
**Geography(§52)**: Customer Residence / Shipping / Billing / Current Location / Device Location / Account Region / Campaign Target Region **구분** — 단일 위치를 모든 법적·마케팅 판단에 사용 금지.

---

## 4. Data Classification & Sensitive (§53-55)

**Classification(§53)**: PUBLIC/INTERNAL/CONFIDENTIAL/PERSONAL/SENSITIVE_PERSONAL/FINANCIAL/BEHAVIORAL/LOCATION/DEVICE_IDENTIFIER/MARKETING_PREFERENCE/CONSENT_RECORD/SECURITY_RESTRICTED — Purpose/Channel별 허용범위. (EPIC Data Classification Registry·No-PII 원칙 정합.)
**Sensitive Attribute(§54)**: 건강·종교/정치 추론·미성년·정밀위치·금융취약성·보호대상속성·민감행동추론·고위험 예측 Score = 사용금지 또는 강화승인.
**Purpose·Attribute Allowlist(§55)**: Purpose별 허용 Attribute Allowlist. 금지: Consumer 임의 Attribute 요청 · Segment 사용을 이유로 Destination Export 허용 · Analytics Attribute→Marketing Export 자동사용 · Sensitive→광고 Audience 무단 · Model Feature Explain 없이 직접사용.

---

## 5. Test/Demo/Sandbox (§56)
상태: PRODUCTION/SANDBOX/TEST/DEMO/QA/LOAD_TEST/SAMPLE. 원칙: **Test/Demo Profile → Production Destination 차단** · Production Profile → Sandbox Export 명시승인 없이 금지 · Sandbox Credential → Production Audience 차단 · Test Audience → Production Automation 차단 · **Environment 혼합=Critical Blocker**. (Part 1 Mock/Demo 운영혼입 원칙·데모 격리 IS_DEMO 정합.)

---

## 6. Wrong-target Risk (§57-58)
**평가(§57)**: Cross-Tenant/Cross-Workspace/Cross-Brand · Wrong Destination Account · Stale Snapshot/Membership/Consent/Suppression · Merge·Unmerge 미반영 · Shared Identifier · Reused Phone · Invalid Email · Wrong Hash Version · Deleted Profile · Duplicate Action · Queue Replay · Cache Drift · Environment 혼합.
**상태(§58)**: NONE/LOW/MEDIUM/HIGH/CRITICAL/**UNKNOWN**. **HIGH/CRITICAL/UNKNOWN=기본 실행 차단**.
**현행 정합**: SEG-C1~C4(무게이트 발송)·SEG-H1(업로드 consent 부재)가 Wrong-target 직접 원인 — Eligibility Engine 이 이를 실행차단으로 전환(선행 P0 구현세션).

---

## 7. 완료 조건 대응 (본 문서)
§105의 12(Destination Account/Capability/Channel Readiness)·13-14(Freshness/Stale)·15-16(Jurisdiction/Geography/Data Classification/Sensitive/Allowlist)·17(Test/Demo/Sandbox)·18(Wrong-target Risk). **코드변경 0** — Freshness/Destination Readiness 실 평가는 후속 승인 세션.
