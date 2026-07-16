# Canonical DSAR Verification Schema — Entity Model, Assurance Level, Policy/Requirement, Risk-to-Level, Method Registry, Requester Authentication & Session/Attempt/Challenge

> **EPIC 06-A Part 3-3-3-3-2** (1/3) · 289차 (2026-07-16) · **비파괴 설계 명세(코드변경 0)**
> 근거(실측): 기존 인증 인프라 — `UserAuth`(login+189차 email/IP rate-limit·register 이메일검증·MFA `mfa_method` totp/sms/email·verifyTotp·mfaSetup/Enable/Disable·mfaPolicy per plan·mfaRequiredFor·otpDelivery·verifyAdminAccessKey·requirePro/requireAdmin RBAC·logAudit/SecurityAudit) · `EnterpriseAuth`(SSO OIDC/SAML+SCIM·state/nonce CSRF·replay·Crypto AES-256-GCM) · `AgencyPortal`(agency_client_link pending→approved→revoked·scope_json.write=Agent Authorization 실체) · `Dsar::verify`(이메일토큰 sha256 fail-closed) · SMS OTP 계정체계(273차·접속키복구) · 회원 세션대행 · Part 3-3-3-3-1 DSAR Registry(Requester≠Subject·Risk·Scope·Identity/Authorization Hook).
> 형제: [`CANONICAL_DSAR_VERIFICATION_WORKFLOW.md`](CANONICAL_DSAR_VERIFICATION_WORKFLOW.md) · [`CANONICAL_DSAR_VERIFICATION_GOVERNANCE.md`](CANONICAL_DSAR_VERIFICATION_GOVERNANCE.md) · ADR=[`../architecture/ADR_DSAR_IDENTITY_VERIFICATION_AUTHORIZATION.md`](../architecture/ADR_DSAR_IDENTITY_VERIFICATION_AUTHORIZATION.md)
> **성격**: 목표 계약. 실 Access Discovery·Export·Correction·Restriction·Erasure=Part 3-3-3-3-3~6. 실 Engine 구현은 후속 승인 세션.

---

## 0. 현행 대비 (실측 → Canonical)

| 현행 | Canonical 목표 |
|---|---|
| `UserAuth` login/register·MFA(totp/sms/email·verifyTotp·mfaPolicy per plan)·admin access key·rate-limit(189차) | **정본 인증엔진 — 확장·재사용**(DSAR Verification 이 위에 Assurance Level·Session 계층 추가·중복 MFA/OTP 신설 금지) |
| `Dsar::verify` 이메일토큰 sha256 fail-closed(Part 3-3-3-3-1) | Email Ownership Verification(Identifier Control ≠ Person Identity)·Challenge Schema 형식화 |
| SMS OTP 계정체계(273차·가입인증·접속키복구) | Phone Ownership Verification·OTP Security(Hash/Expiry/One-time/Replay/Binding) |
| `AgencyPortal` agency_client_link(pending→approved→revoked·scope_json.write) | Authorization Record/Type/Scope/Version/**Revocation** 로 일반화(대행사=Agent 특수형·중복 Store 금지) |
| `EnterpriseAuth` SSO/SCIM·state/nonce·replay·Crypto | Verified Identity Provider Method·Replay/CSRF 방어 재사용 |
| **DSAR별 Assurance Level·Risk-to-Level·Verification Session/Attempt·Identity Match(→Customer Identity Graph)·Document Verification·Reverification·Scope-bound Token 부재** | 신설 |
| Account Recovery(비번리셋)=DSAR 무관 | Account Recovery Cooldown·DSAR Verification 분리(§3.7) |

**무후퇴**: UserAuth login/MFA/OTP/access key/rate-limit·EnterpriseAuth SSO/SCIM·AgencyPortal 위임·Dsar 이메일 fail-closed·SecurityAudit·Session/Token/Crypto 는 **정본 — 재구현 금지, Canonical DSAR Verification Engine 아래 통합**. Request Type별(Access/Export/Correction/Restriction/Erasure) 독립 Verification Engine 신설 금지(§106).

---

## 1. Canonical Verification Entity Model (§4)

Entity: `DSAR_VERIFICATION_POLICY(_VERSION)` · `DSAR_VERIFICATION_REQUIREMENT` · `DSAR_VERIFICATION_SESSION` · `DSAR_VERIFICATION_ATTEMPT` · `DSAR_VERIFICATION_METHOD` · `DSAR_VERIFICATION_CHALLENGE` · `DSAR_VERIFICATION_RESPONSE` · `DSAR_VERIFICATION_EVIDENCE` · `DSAR_VERIFICATION_DECISION` · `DSAR_IDENTITY_MATCH` · `DSAR_VERIFICATION_RISK` · `DSAR_VERIFICATION_TOKEN` · `DSAR_REVERIFICATION_REQUEST` · `DSAR_MANUAL_REVIEW` · `DSAR_AGENT_IDENTITY` · `DSAR_AUTHORIZATION_RECORD(_VERSION)` · `DSAR_AUTHORIZATION_EVIDENCE` · `DSAR_AUTHORIZATION_REVOCATION` · `DSAR_VERIFICATION_AUDIT_EVENT`. (기존 등가=UserAuth MFA/OTP·AgencyPortal link → 확장·나머지 신규. CE Registry 등재.)

---

## 2. Assurance Level (§5)

| Level | 정의 | 예시 사용 |
|---|---|---|
| `LEVEL_0_UNVERIFIED` | 접수만 완료 | Fulfillment 불가 |
| `LEVEL_1_LOW` | Email Link·제한 Identifier Challenge | 일반문의·상태확인 |
| `LEVEL_2_MODERATE` | Authenticated Account·복수신호 | 제한 Access |
| `LEVEL_3_HIGH` | Step-up/MFA·강한 Identity Match | Full Export·Correction·Erasure |
| `LEVEL_4_VERY_HIGH` | Document·Manual Review·Agent Authorization | 매우민감 Data·고위험 대리인 |

**★실제 Level 기준=Policy Registry + Security Review 확정**(임의 단정 금지).

---

## 3. Verification Policy (§6-7) & Requirement (§8) & Risk-to-Level (§9)

**Policy Schema(§6)**: verification_policy_id · policy_name · applicable_request_types/subtypes · data_categories · sensitivity_levels · requester_types · subject_types · jurisdiction_scope · minimum_assurance_level · accepted_methods · prohibited_methods · required_factor_count · step_up_conditions · document_conditions · manual_review_conditions · session_max_age · result_validity · reverification_conditions · failure_behavior · retry_policy · lockout_policy · owner · security_approver · privacy_approver · version · status · effective_from/to. **상태(§7)**: DRAFT/REVIEW_REQUIRED/APPROVED/ACTIVE/RESTRICTED/SUSPENDED/SUPERSEDED/REVOKED/EXPIRED/BLOCKED. **Matrix(§99)**: | Policy ID | Request Type | Sensitivity | Requester Type | Required Level | Methods | Step-up | Validity | Recheck | Version | Status |
**Requirement(§8)**: verification_requirement_id · request_id · requester_id · subject_id · requester_type · request_type · request_scope · data_sensitivity · risk_level · minimum_assurance_level · required_methods · optional_methods · disallowed_methods · step_up_required · document_required · manual_review_required · valid_until · policy_version · created_at · lineage_id.
**Risk-to-Level Mapping(§9)**: Request Type·Data Sensitivity·Full Export·Agent 요청·Minor·Account 로그인·Session Age·Account Recovery 최근·Shared Identifier·Identity Conflict·Cross-border Delivery·New Device·Unusual Location·Failed Attempts·Scope 크기·Multiple Account·Security Incident·Deletion 상태·Merge/Unmerge 상태 → Required Level 산출.

---

## 4. Verification Method Registry (§10-12)

**Method(§10, 24종)**: AUTHENTICATED_ACCOUNT_SESSION · PASSWORD_REAUTHENTICATION · PASSKEY · MFA_TOTP · MFA_PUSH · MFA_SMS · MFA_EMAIL · MAGIC_LINK · EMAIL_OTP · PHONE_OTP · VERIFIED_DEVICE · RECOVERY_CODE · SUPPORT_ASSISTED_VERIFICATION · DOCUMENT_VERIFICATION · VIDEO_VERIFICATION · IN_PERSON_VERIFICATION · BANK_OR_PAYMENT_RELATIONSHIP_CONFIRMATION · CONTRACT_RELATIONSHIP_CONFIRMATION · AUTHORIZED_AGENT_DOCUMENT · GUARDIANSHIP_DOCUMENT · LEGAL_REPRESENTATIVE_DOCUMENT · COMPANY_AUTHORITY_CONFIRMATION · MANUAL_PRIVACY_REVIEW · EXTERNAL_IDENTITY_PROVIDER. (현행=UserAuth totp/sms/email OTP·EnterpriseAuth SSO → 재사용·나머지 신규.)
**필수 항목(§11)**: method_id · name · assurance_contribution · factor_type · possession/knowledge/inherence_factor 여부 · **identity_proof 여부 · identifier_control_proof 여부**(★구분 핵심) · supported requester/subject/jurisdictions · security_requirements · privacy_risks · retention_policy · owner · version · status. **상태(§12)**: ACTIVE/RESTRICTED/FALLBACK_ONLY/DEPRECATED/SUSPENDED/BLOCKED/TEST_ONLY. **Matrix(§102)**: | Method | Factor Type | Identity Proof | Identifier Control | Assurance Contribution | Privacy Risk | Retention | Status |

---

## 5. Requester Authentication (§13-17)

**Contract(§13)**: requester_identity · account_authentication_state · session_id · authentication_method · authentication_time · MFA_level · device_trust · account_risk · recovery_status · identifier_control · fraud_signals · requested_scope · assurance_level · valid_until.
**상태(§14)**: NOT_AUTHENTICATED/PARTIALLY_AUTHENTICATED/AUTHENTICATED/STEP_UP_REQUIRED/AUTHENTICATED_HIGH_ASSURANCE/SESSION_EXPIRED/ACCOUNT_RISK_DETECTED/RECOVERY_COOLDOWN/BLOCKED.
**Account-based(§15)**: Account ID·Customer Profile·Person ID·Tenant/Brand·Authenticated Session·Session Age·Login Method·MFA·Device·Recent Recovery·Recent Credential Change·Account Lock·Suspicious Activity·Customer Merge 상태·Ownership Conflict. **★로그인 Session 만으로 고위험 요청 자동승인 금지**(§3.2).
**Session Max Age(§16)**: Request Type별 Policy — 일반 Intake(긴 Session)·Scope 확인(중간)·Export 승인(짧게)·Download Link(매우짧게)·Identifier Rectification/Agent Authorization(매우짧게).
**Step-up Trigger(§17)**: Full Export·Sensitive Data·New Device·Unusual Location·Session Age 초과·최근 Password Reset·최근 MFA 변경·최근 Email/Phone 변경·Account Recovery 직후·Agent 연결·Delivery Channel 변경·Scope 확대·Reopened·High Fraud·Multiple Failed Attempt.

---

## 6. Verification Session (§37-38) · Attempt (§39-40) · Challenge (§22-24) · Retry/Lockout (§41)

**Session(§37)**: verification_session_id · request_id · requester_id · subject_id · policy_id · required/current_assurance_level · methods_attempted · status · risk_level · started/expires/completed/failed/locked_at · correlation_id · environment · audit_reference. **상태(§38)**: CREATED/METHOD_SELECTION/CHALLENGE_PENDING/IN_PROGRESS/PARTIALLY_VERIFIED/VERIFIED/VERIFIED_WITH_LIMITS/FAILED/EXPIRED/LOCKED/CANCELLED/MANUAL_REVIEW/BLOCKED.
**Attempt(§39)**: attempt_id · verification_session_id · method · factor_type · target_reference · started/completed_at · result · failure_reason · risk_signals · device_reference · network_risk_reference · retry_count · audit_reference. **상태(§40)**: STARTED/SUCCEEDED/FAILED/EXPIRED/CANCELLED/RATE_LIMITED/FRAUD_BLOCKED/MANUAL_REVIEW_REQUIRED.
**Challenge(§22)**: challenge_id · verification_session_id · method · target_reference · challenge_type · **challenge_hash**(원문 저장 금지) · issued_at · expires_at · maximum_attempts · attempt_count · status · consumed_at · revoked_at · correlation_id · audit_reference. **상태(§23)**: CREATED/ISSUED/DELIVERED/DELIVERY_FAILED/VERIFIED/FAILED/EXPIRED/CONSUMED/REVOKED/BLOCKED.
**OTP/Magic Link Security(§24)**: Cryptographically Secure Random · 짧은 Expiry · One-time Use · Hash 저장 · Attempt Limit · Rate Limit · IP/Device Risk · **Request/Subject/Tenant/Brand Binding** · Redirect Allowlist · Replay Detection · Revocation · Audit. (현행 Dsar sha256·SMS OTP·189차 rate-limit 확장.)
**Retry/Lockout(§41)**: Method별/Session별 최대 Attempt·시간 Window·Progressive Delay·Temporary Lock·Permanent Security Review·Alternate Method·Support Escalation·Fraud Alert·User Notification·Audit. **★Lockout 이 Account DoS 수단이 되지 않도록**.
