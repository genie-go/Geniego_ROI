# Canonical DSAR Verification Governance — Secure Token, Fulfillment/Delivery Recheck, Enumeration/Fraud/Fail-closed/Cooldown, API/Permission/Override, Lint/Guard, Error/Warning, Golden/Conformance/Equivalence, Observability/Alert/Audit & Existing-Impl Classification

> **EPIC 06-A Part 3-3-3-3-2** (3/3) · 289차 (2026-07-16) · **비파괴 설계 명세(코드변경 0)**
> 근거(실측): `UserAuth` SecurityAudit/logAudit·189차 rate-limit·requirePro/requireAdmin RBAC · `EnterpriseAuth` Crypto/session · `AgencyPortal` revoke 즉시 403 · Part 3-3-3-3-1 DSAR Fulfillment Job Contract(Idempotency·Runtime Guard·Kill Switch).
> 형제: [`CANONICAL_DSAR_VERIFICATION_SCHEMA.md`](CANONICAL_DSAR_VERIFICATION_SCHEMA.md) · [`CANONICAL_DSAR_VERIFICATION_WORKFLOW.md`](CANONICAL_DSAR_VERIFICATION_WORKFLOW.md) · ADR=[`../architecture/ADR_DSAR_IDENTITY_VERIFICATION_AUTHORIZATION.md`](../architecture/ADR_DSAR_IDENTITY_VERIFICATION_AUTHORIZATION.md)

---

## 1. Secure Verification Token (§69-70)

**Claims(§69)**: request_id · requester_id · subject_id · tenant_id · brand_id · request_type · **verified_scope** · assurance_level · authorization_status · identity_version · policy_version · issued_at · expires_at · nonce · environment · signature. **★후속 Engine 에 원본 Evidence 대신 제한 Token 전달**(Access/Export/Correction/Restriction/Erasure=Part 3-3-3-3-3~6 입력).
**금지(§70)**: 장기 만료 · 다른 Request/Subject/Tenant 재사용 · Scope 확대 · Client 자체발급 · Signature 미검증 · Revocation 미지원 · Token 원문 로그 · Evidence 원문 포함.

---

## 2. Fulfillment (§71) & Delivery (§72) Recheck · Fail-closed (§76) · Cooldown (§77)

**Fulfillment-time Recheck(§71)**: 실행 직전 Verification Decision·Token Validity·Request Status·Subject ID·Identity Version·Authorization·Scope·Policy Version·Risk·Revocation·Requester Withdrawal·Kill Switch 확인.
**Delivery-time Recheck(§72)**: 전달 직전 Recipient·Verification Session·Assurance Level·Authorization Delivery Scope·Delivery Channel·One-time Link·MFA·Link Expiry·Download Count·Wrong-recipient Risk·Revocation·Request Status 재확인.
**Fail-closed(§76)**: Verification Unknown·Expired·Required Assurance 미달·Identity Conflict·Authorization Pending/Expired/Revoked·Fraud High/Critical·Wrong Subject·Cross-Tenant·Session Revoked·Token Invalid·Document Tampering·Closed/Withdrawn Request → Fulfillment 차단.
**Account Recovery Cooldown(§77·§3.7)**: recovery_event·recovery_method·account_risk·cooldown_duration·allowed_requests·blocked_actions·step_up_requirement·manual_review·notification·audit. **★DSAR Verification ≠ Account Recovery**(비번리셋/MFA해제/Email변경 권한 자동부여 안됨·역도 성립 안함).

---

## 3. Enumeration (§73) · Fraud/Abuse (§74) · Risk 대응 (§75)

**Enumeration 방지(§73·§3.9)**: 일관 응답문구·계정/Email/Phone 존재 비공개·Rate Limit·Generic Failure·Timing 차이 최소화·Request Reference 난수화·Error Detail 내부제한·Audit·Abuse Detection. **★Verification 실패를 Subject 부존재 확인으로 사용 금지**.
**Fraud/Abuse Signals(§74)**: 반복실패·여러 Subject 시도·여러 Tenant 시도·Agent 대량요청·Disposable Email·Suspicious Phone·VPN/Proxy·Impossible Travel·New Device·Account Recovery 직후·Malware Attachment·Document Tampering·Automation Pattern·Credential Stuffing·비정상 Scope 확대·Delivery Redirect 변경.
**대응(§75)**: 추가 Verification·Step-up·Manual Review·Temporary Delay·Security Escalation·Agent Block·Session Lock·Challenge Method 변경·Delivery 제한·Scope 제한·Fulfillment Block·Incident 생성.

---

## 4. API (§78) · Security (§79) · Permission (§80) · Override (§81)

**API(§78)**: Verification Requirement 조회·Session 생성·Method 선택·Challenge 생성/검증·Account Session 검증·MFA Step-up·Email/Phone Verification·Document 등록·Vendor Verification·Manual Review·Identity Match·Decision 생성·Reverification·Token 발급/검증/폐기·Agent Identity 등록·Authorization 등록/검증/철회·Explain·Lineage·Audit 조회. (현행 UserAuth MFA/OTP 경로 재사용·확장·`/api` 접두 필수.)
**Security(§79)**: Actor 인증·Request/Tenant/Workspace/Brand Scope·Subject/Requester Binding·CSRF·Rate Limit·Attempt Limit·Token Rotation·Replay·PII Masking·Evidence 접근제한·Enumeration 방지·Idempotency·Audit·Environment 분리.
**Permission(§80, 20종)**: VIEW_VERIFICATION_REQUIREMENT·START_DSAR_VERIFICATION·ISSUE_VERIFICATION_CHALLENGE·VERIFY_DSAR_CHALLENGE·REQUEST_STEP_UP_AUTH·VIEW_VERIFICATION_STATUS·VIEW_VERIFICATION_EVIDENCE·UPLOAD_VERIFICATION_DOCUMENT·RUN_IDENTITY_MATCH·REQUEST_MANUAL_VERIFICATION_REVIEW·APPROVE_MANUAL_VERIFICATION·ISSUE_VERIFICATION_TOKEN·REVOKE_VERIFICATION_TOKEN·MANAGE_AGENT_IDENTITY·CREATE_AUTHORIZATION·VERIFY_AUTHORIZATION·REVOKE_AUTHORIZATION·VIEW_AUTHORIZATION_EVIDENCE·VIEW_VERIFICATION_AUDIT·ADMIN_VERIFICATION_OVERRIDE.
**Override(§81·2인승인)**: override_id·request_id·verification_session·original/override_decision·allowed_scope·reason·evidence·risk_controls·first/second_approver·effective_at·expiry·reverification·audit. **금지**: Cross-Tenant·Wrong Subject·Identity Conflict 미해결·Agent 권한없음·Document Fraud·High Account Takeover·Revoked Authorization·Closed Request·Security Incident 미해결.

---

## 5. Static Lint (§82) & Runtime Guard (§83)

**Static Lint(§82)**: Verification 없이 Fulfillment · Assurance Level 없는 Verification · Request Type별 정책없는 Verification · **Email/Phone Control 을 Person Identity 로 직접확정** · OTP 평문저장 · 만료없는 Magic Link · Request Binding 없는 Challenge · 다른 Tenant Challenge 재사용 · Document 원문 무기한보존 · Agent Identity 만 검증하고 Authorization 누락 · Authorization Scope 없는 대리인요청 · Expired Authorization 사용 · Verification Token Scope 누락 · Token Signature 검증누락 · Account Recovery 직후 고위험 Export · Shared Identifier Risk 미검증 · Manual Override 단독승인 · Audit 없는 Verification Decision.
**Runtime Guard(§83)**: Assurance Level 미달 · Session 만료 · Decision 만료 · Invalid Challenge · Replayed OTP/Magic Link · Identity Version 불일치 · Shared Identifier 단독 · Agent Authorization 없음 · Scope 초과 · Authorization 만료/철회 · Document Tampering · Wrong Tenant/Brand · Wrong Subject · Fraud High/Critical · Recovery Cooldown · Token 변조 · Scope 확대 · Closed/Withdrawn · **Kill Switch**.

---

## 6. Error (§84) & Warning (§85)

**Error(§84, 27종)**: VERIFICATION_POLICY_NOT_FOUND·REQUIREMENT_INVALID·SESSION_EXPIRED·METHOD_NOT_ALLOWED·CHALLENGE_INVALID·CHALLENGE_EXPIRED·CHALLENGE_REPLAYED·ATTEMPT_LIMIT·RATE_LIMITED·ASSURANCE_LEVEL_INSUFFICIENT·IDENTITY_MATCH_FAILED·IDENTITY_CONFLICT·SHARED_IDENTIFIER_RISK·DOCUMENT_REQUIRED·DOCUMENT_INVALID·DOCUMENT_TAMPERING_SUSPECTED·MANUAL_REVIEW_REQUIRED·AUTHORIZATION_REQUIRED·AUTHORIZATION_INVALID·AUTHORIZATION_EXPIRED·AUTHORIZATION_REVOKED·AUTHORIZATION_SCOPE_EXCEEDED·VERIFICATION_TOKEN_INVALID·VERIFICATION_TOKEN_EXPIRED·ACCOUNT_RECOVERY_COOLDOWN·VERIFICATION_PERMISSION_DENIED·VERIFICATION_BLOCKED (모두 `DSAR_` 접두).
**Warning(§85, 15종)**: VERIFICATION_EXPIRING·REVERIFICATION_REQUIRED·SESSION_AGE_WARNING·SHARED_IDENTIFIER_WARNING·PARTIAL_IDENTITY_MATCH·DOCUMENT_EXPIRING·LOW_TRUST_EVIDENCE·AGENT_AUTHORIZATION_EXPIRING·MANUAL_REVIEW_DELAY·ACCOUNT_RECOVERY_WARNING·NEW_DEVICE_WARNING·UNUSUAL_LOCATION_WARNING·MULTIPLE_SUBJECT_MATCH·LEGACY_VERIFICATION_USED·DELIVERY_STEP_UP_REQUIRED.

---

## 7. Golden Dataset (§86) · Conformance (§87) · Equivalence (§88-89)

**Golden(§86·50+ 시나리오)**: Authenticated Account L2·MFA Step-up L3·Passkey·Expired Session·New Device Step-up·Account Recovery Cooldown·Verified/Shared Email·Email Link Replay·Expired Email Link·Verified/Recycled/Shared Family Phone·OTP Attempt/Rate Limit·Document Verified/Expired/Mismatch/Tampering·Manual Review Approved/Rejected·Four-eyes·Identity Exact/Partial/Multiple/Conflict·Merge/Unmerge In Progress·Anonymous Cookie·Deleted Subject·Agent Valid/Expired/Scope Exceeded·Authorization Revoked·Guardian Valid/Conflict·Legal Rep Valid·Company Rep Limited·Deceased Executor·Cross-Tenant/Wrong Brand 차단·Token Valid/Expired/Scope Tampering·Fulfillment/Delivery Recheck·High Fraud Block·Enumeration Attempt·Override 허용/금지.
**Conformance(§87)**: Access·Portability·Rectification·Restriction·Erasure·Objection·Automated Decision Review·Complaint 에 위험기반 Verification(Required Level·Method·Requester Auth·Subject Match·Agent Authorization·Session Age·Step-up·Risk·Validity·Reverification·Token·Audit) 적용.
**Equivalence(§88)**: 기존 Login·MFA·Support Verification·Agent Workflow 와 비교(Authentication State·Assurance·Method·Identity Match·Agent Authorization·Document·Session Validity·Reverification·Fraud·Decision·Fulfillment Allowance·Error·Warning). **Difference 상태(§89)**: MATCH·EXPECTED_{ASSURANCE/STEP_UP/IDENTITY_MATCH/AGENT_AUTHORIZATION}_CORRECTION·EXPECTED_DOCUMENT_MINIMIZATION·EXPECTED_FRAUD_CORRECTION·LEGACY_SECURITY_DEFECT·LEGACY_PRIVACY_DEFECT·**LEGACY_WRONG_SUBJECT_RISK**·CANONICAL_VERIFICATION_DEFECT·MANUAL_REVIEW·LEGAL_REVIEW_REQUIRED·UNEXPLAINED·BLOCKED. **★`UNEXPLAINED`·`LEGACY_WRONG_SUBJECT_RISK`·고객영향 `LEGACY_SECURITY_DEFECT` = 운영전환 차단**.

---

## 8. Observability (§90) · Alert (§91) · Audit (§92)

**Metrics(§90)**: Session/Success/Failure Count·Assurance 분포·Method별 성공률·Step-up·MFA Failure·Email/Phone Challenge·Replay Block·Attempt/Rate Limit Block·Document/Tampering·Manual Review·Identity Conflict·Shared Identifier·Agent Authorization·Authorization Expiry·Revocation·Fraud Block·Token/Token Failure·Reverification·Recovery Cooldown Block·Legacy Usage·P50/P95/P99.
**Alert(§91)**: Verification Failure 급증·OTP Replay·Attempt Limit 급증·Enumeration 패턴·Agent 대량요청·Document Tampering·Wrong-subject Match·Cross-Tenant·Token 위조·Expired/Revoked Authorization 사용·Recovery 직후 Export·Manual Override 증가·Shared Identifier 자동승인·Verification Service 장애·Vendor Drift·Legacy 신규사용.
**Audit Event(§92, 32종)**: VERIFICATION_REQUIREMENT_CREATED·SESSION_STARTED·METHOD_SELECTED·CHALLENGE_ISSUED/SUCCEEDED/FAILED·SESSION_LOCKED·STEP_UP_REQUIRED·MFA_COMPLETED·EMAIL/PHONE_VERIFIED·DOCUMENT_UPLOADED/VERIFIED/REJECTED·MANUAL_REVIEW_REQUESTED/APPROVED/REJECTED·IDENTITY_MATCH_EVALUATED·IDENTITY_CONFLICT_DETECTED·VERIFICATION_DECISION_CREATED·REVERIFICATION_REQUESTED·TOKEN_ISSUED/REVOKED·AGENT_IDENTITY_VERIFIED·AUTHORIZATION_CREATED/VERIFIED/LIMITED/REVOKED·RUNTIME_BLOCKED·OVERRIDE_REQUESTED/APPROVED/REVOKED (모두 `DSAR_` 접두·SecurityAudit 확장·삭제금지).

---

## 9. Existing Implementation Classification (§93) & Duplicate Audit (§94) & Regression Gate (§95)

**분류(§93)**: 실측 결과 —
| 구현 | 분류 | 근거 |
|---|---|---|
| `UserAuth` login/MFA(totp/sms/email·verifyTotp·mfaPolicy)/access key/rate-limit | `VALIDATED_LEGACY` → `CANONICAL_DSAR_CHALLENGE_SERVICE` 재사용 | 정본 인증·DSAR Assurance/Session 계층 add-on·중복 MFA/OTP 신설 금지 |
| `Dsar::verify` 이메일토큰 fail-closed | `LEGACY_ADAPTER` | Email Ownership Verification 으로 형식화·Identifier Control 표기 |
| SMS OTP 계정체계(273차) | `LEGACY_ADAPTER` → Phone Ownership Verification | OTP Security(Hash/Replay/Binding) 강화 |
| `AgencyPortal` agency_client_link(pending→approved→revoked·scope_json·revoke 403) | `MIGRATION_REQUIRED` → `CANONICAL_DSAR_AUTHORIZATION_REGISTRY` | 대행사=Authorized Agent 특수형·Authorization Record/Version/Scope/Revocation 로 일반화 |
| `EnterpriseAuth` SSO/SCIM·state/nonce·replay·Crypto | `VALIDATED_LEGACY` | EXTERNAL_IDENTITY_PROVIDER Method·Replay 방어 재사용 |
| 회원 세션대행(impersonation) | `KEEP_SEPARATE_WITH_REASON` | 내부 운영대행≠DSAR Requester Authentication(혼용 금지·§3.7 정합) |
| **DSAR Assurance/Identity Match/Document/Reverification/Scope-bound Token 부재** | 신설(`CANONICAL_DSAR_VERIFICATION_ENGINE`) | 현행 부재 |
**Duplicate Audit(§94)**: 실측 — MFA/OTP 단일(`UserAuth`)·SSO 단일(`EnterpriseAuth`)·Agent 위임 단일(`AgencyPortal`). **중복 Verification/OTP/Token Service 신설 위험만 차단**(§106 Request Type별 독립 Verification Engine 금지).
**Regression Gate(§95)**: 변경 전후 Account Authentication·MFA·Passkey·Email/Phone Challenge·OTP Security·Session Expiry·Step-up·Document·Manual Review·Identity Match·Shared Identifier·Merge/Unmerge·Agent/Guardian/Legal/Company Authorization·Scope·Revocation·Reverification·Fraud·Enumeration·Token Revocation·Audit·**Existing API Compatibility**(UserAuth/EnterpriseAuth/AgencyPortal 경로 보존) 비교. 승인없는 기능감소=전환차단.

---

## 10. 완료 상태 요약

Verification Entity 20 · Assurance Level 5 · Policy Schema(Version) · Risk-to-Level 19입력 · Method 24 · Authentication 9상태 · Step-up Trigger 15 · Email/Phone Verification·OTP Security · MFA 7 · Document Type 12/Minimization/결과 10 · Provider Adapter · Manual/Four-eyes · Session 13상태/Attempt 8상태/Challenge 10상태/Retry-Lockout · Identity Match 10상태/Score 10차원·Conflict 7상태·Merge/Unmerge·Shared·Deleted·Anonymous · Agent Identity · Authorization Type 10/상태 11/Scope/Version/Revocation · Guardian/Legal/Company/Deceased · Verification Evidence/Trust 5 · Decision 10 · Validity·Reverification 18트리거 · Secure Token(Scope-bound) · Fulfillment/Delivery Recheck · Enumeration/Fraud 16/Fail-closed/Cooldown · Permission 20/Override(2인) · Static Lint 19/Runtime Guard 19 · Error 27/Warning 15 · Golden 50+/Conformance/Equivalence · **계약 명세 확정**(코드변경 0). **실 Verification Engine·Identity Match·Document·Token·SLA 연동·CI가드 구현 = Part 3-3-3-3-3~8(후속 승인 세션·verify+배포승인).**
