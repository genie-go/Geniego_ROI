# DSAR — Zero Trust & Continuous Authorization: 단계상승 인증 (APPROVAL_STEP_UP_AUTH)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_13_ZERO_TRUST_CONTINUOUS_AUTHORIZATION_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_ZERO_TRUST_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_ZT_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_ZT_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

APPROVAL_STEP_UP_AUTH는 이미 인증된 세션에 대해 **민감 작업 직전 추가 인증 강도(MFA/TOTP)를 요구**하는 엔티티다. SPEC §12(Step-up Authentication) Trigger: **Critical Permission · High Risk · Sensitive Data · Finance Approval · Administrator Action**. 결정으로는 SPEC §11의 `Step-up MFA`를 발동한다. ★핵심 구분: **로그인 시점 step-up=PRESENT**(MFA/OTP/TOTP/복구코드)이나 **mid-session step-up=ABSENT**(민감작업 재챌린지 없음·ADR D-2).

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| ZT 요소 | 판정 | 근거(GT 인용) |
|---|---|---|
| 로그인 MFA 챌린지 | **PRESENT(로그인)** | `mfaPolicy`·OTP 챌린지·`mfa_required` 401·`issueLoginOtp` `UserAuth.php:929-980`·`:941`·`:957`·`:973`·`:977` |
| TOTP(RFC6238) | **PRESENT** | `totpAt`/`verifyTotp`(±window)·AES-256-GCM 봉투암호화 `UserAuth.php:3566-3592`·`:3863-3925`·`:959` |
| 복구코드(1회성) | **PRESENT** | `mfa_recovery`/`consumeRecoveryCode` `UserAuth.php:3600-3634`·`:961`·`:975` |
| 테넌트 MFA 정책(완화불가) | **PRESENT** | `mfaPolicy`(max global,tenant·admin/all) `UserAuth.php:3745-3767`·`:3754-3757`·`:3764-3766` |
| 비상 우회 | PRESENT(예외) | break-glass `GENIE_BREAKGLASS_PW`·MFA 우회·`auth.breakglass` 감사 `UserAuth.php:793-798`·`:995-999` |
| mid-session step-up(민감작업/High-risk/Admin action 재챌린지) | **ABSENT** | MFA는 로그인 1회(GT② 표·GT① §B). 민감작업 직전 재인증 없음 |
| 세션 AAL/MFA-passed 상태 저장 | **ABSENT** | 세션에 인증보증등급(AAL)/Trust Score 미저장(ADR D-2 "현행 미저장") |

## 3. 설계 계약 (필드·상태·제약 — SPEC 근거·테넌트격리)

| 항목 | 계약 |
|---|---|
| Trigger | `CRITICAL_PERMISSION`·`HIGH_RISK`·`SENSITIVE_DATA`·`FINANCE_APPROVAL`·`ADMIN_ACTION`(SPEC §12) |
| 인증 수단 | 기존 OTP/TOTP/복구코드 재사용(`UserAuth.php:929-980`·`:3566-3634`)·mid-session 컨텍스트로 확장(ADR D-2) |
| 신규 세션 상태 | `aal`·`mfa_passed_at`·`step_up_valid_until`(신설·SPEC §6 Session Trust Token Freshness/MFA Status) |
| 에러/경고 계약 | `STEP_UP_REQUIRED`(SPEC §30) / `MFA Expiring`(SPEC §31) |
| 성능 | Step-up Trigger ≤ 10ms(SPEC §35) |
| 테넌트 격리 | step-up 정책·이력 `X-Tenant-Id` 격리(SPEC §33)·`user_session`/`mfa_recovery` authz 축 |
| 결합 | Adaptive Authorization(§11) 결정 `STEP_UP_MFA`가 본 엔티티 발동·PDP(3-12) Decision Type 추가(ADR D-6) |

## 4. KEEP_SEPARATE (마케팅 risk/anomaly·방어프리미티브 흡수금지)

- step-up **Trigger의 "High Risk"는 authz risk**(`auth_audit_log.risk` 승격·ADR D-5)이며, 마케팅 risk(`CustomerAI.php:10-18` churn/LTV·`Risk.php:31-55` 공급망 fraud·`AnomalyDetection.php` 광고 SPC)를 트리거 입력으로 흡수 금지(GT② §4 B-2).
- 방어 프리미티브(rate-limit `index.php:527-570`·SSRF `Alerting.php:786`)는 step-up 트리거 아님(GT② §4 B-4).
- break-glass(`UserAuth.php:793-798`)는 예외 경로로 유지·step-up 로직과 병행(무후퇴·ADR §4).

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

- **로그인 step-up=PRESENT / mid-session step-up=ABSENT(순신규)**. MFA 재챌린지·세션 AAL 저장 grep 0(GT② 표·GT① §B).
- **재활용(Extend·대체 아님)**: 로그인 OTP/TOTP/복구코드/mfaPolicy 그대로 재사용, 발동 컨텍스트만 mid-session으로 확장(ADR D-2).
- **선행의존**: 세션 AAL/Trust Score 저장 신설 선행 · Adaptive Authorization(§11)·PDP(3-12) 결합. 실 구현=RP-track 승인세션. 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE.
