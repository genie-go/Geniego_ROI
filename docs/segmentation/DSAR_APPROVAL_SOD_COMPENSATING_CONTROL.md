# DSAR — Runtime SoD Enforcement: 보상통제 (APPROVAL_SOD_COMPENSATING_CONTROL)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_10_RUNTIME_SOD_ENFORCEMENT_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_SOD_ENFORCEMENT_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_SOD_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_SOD_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

**APPROVAL_SOD_COMPENSATING_CONTROL**(SPEC §2 Canonical Entity·§21 Compensating Control)은 SoD 상충을 완전 차단(Block)하지 않고 **허용하되 위험을 상쇄하는 추가 통제를 부과**하는 엔티티다. SPEC §21은 5종을 지원한다: **Additional Approval · Enhanced Logging · Mandatory MFA · Continuous Monitoring · Manual Audit**. Exception(§18·기한부 예외)·Override(§20·비상 강행)가 SoD 차단을 **우회**한다면, Compensating Control은 우회에 **동반 부과되어 잔여 위험을 통제**한다. §33 Error Contract `SOD_COMPENSATING_CONTROL_REQUIRED`는 보상통제 미충족 시 차단을 명령한다.

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| SPEC §21 보상통제 | 판정 | 근거(파일:라인) |
|---|---|---|
| SoD 보상통제 전용 워크플로(5종·상충 시 자동부과) | **ABSENT (grep 0)** | GT② §2 "SoD Exception/Override/Compensating Control 워크플로 ABSENT" |
| **Mandatory MFA** (강화 인증 재활용 substrate) | **PRESENT** | `UserAuth.php:929-961`·`:940-945`(mfa_policy 테넌트별 off/admin/all 강제) — GT① §F. Compensating Control(MFA) 재활용(ADR D-5) |
| **Additional Approval** (정족수·dual-control 재활용) | **PARTIAL** | `Mapping.php:287`(정족수 `>= required_approvals` 기본 2)·`:268-271`(self-approval 차단)·`Db.php:632-634`(required_approvals DEFAULT 2) — GT① §A. Alerting은 VACUOUS(`Db.php:592-600`) |
| **Enhanced Logging** (불변 감사체인 재활용) | **PRESENT** | `SecurityAudit.php:14-33`(hash_chain append-only)·`:35-41`·`:56-69`(verify) — GT① §F |
| **Manual Audit** (검토·증거 저장 재활용) | **PRESENT** | `AccessReview.php:66-80`(access_review_item DDL)·`:192`(justification 필수)·`:219-224`·`:225`(SecurityAudit 연동) — GT① §F |
| **Continuous Monitoring** (SoD 상충 상시 감시) | **ABSENT (grep 0)** | SoD 전용 Analytics/Drift 코드경로 0(GT② §2). SecurityAudit는 범용 로거(재활용 substrate) |

## 3. 설계 계약 (필드·상태·제약 — SPEC 근거·MFA/추가승인/테넌트격리)

- **5종 통제 선택·조합(§21)**: 상충 severity(§15 Low~Regulatory)·risk(§17)에 따라 `additional_approval`·`enhanced_logging`·`mandatory_mfa`·`continuous_monitoring`·`manual_audit` 중 1개 이상 부과. 미충족 시 §33 `SOD_COMPENSATING_CONTROL_REQUIRED` 차단.
- **Mandatory MFA**: mfa_policy 강제(`UserAuth.php:929-961` 재활용) — SoD 상충 행위 실행 전 강화 인증 요구.
- **Additional Approval**: 정족수·결재분리(`Mapping.php:287`·`:268-271` dual-control 재활용) — 상충 조합 실행에 추가 승인자 요구. self-approval 차단 유지.
- **Enhanced Logging / Manual Audit**: 보상통제 부과·이행은 SecurityAudit 불변체인(`SecurityAudit.php:14-33`) append + access_review_item(`AccessReview.php:66-80` justification 필수) 검토 기록.
- **테넌트 격리(§36)**: 보상통제는 발급 테넌트 스코프(`index.php:614-619` 재활용).
- **연동**: Exception(§18)·Override(§20)에 동반 부과 가능. §26 Analytics·§27 Drift(신규)로 상시 감시.

## 4. KEEP_SEPARATE (동음이의 흡수금지)

- **MFA(`UserAuth.php:929-961`) = 로그인 인증정책 ≠ SoD 보상통제 엔티티**: mfa_policy는 인증 강화 통제다. Compensating Control의 Mandatory MFA로 **재활용만** 하고 SoD 전용 엔티티로 개명·흡수 금지(GT① §F·ADR D-5).
- **Maker-Checker dual-control ≠ SoD**: `Mapping.php:268-271`·`:287`은 "두 명 필요"(dual-control)이지 "한 사람 상충역할 동시보유"(SoD)가 아니다. Additional Approval 선례로 재활용하되 SoD로 개명 금지(GT② B-2).
- **SecurityAudit 범용 로거 ≠ SoD Continuous Monitoring**: `SecurityAudit.php:14-33`은 범용 감사체인이다. Enhanced Logging substrate로 재활용하되 SoD 전용 감시엔진과 별개 관심사(GT② §2).
- **menu_audit_log ≠ SoD 보상감사**: `AdminMenu.php:123-140`·`:200`·`:216` menu_audit_log는 메뉴 거버넌스 체인 — SoD 충돌 증거 아님(GT② B-7).
- **비즈 drift/recon/simulate ≠ SoD Continuous Monitoring**: `ModelMonitor.php`·`AnomalyDetection.php`·`PgSettlement.php` 등은 비즈니스 동음이의 decoy(GT② B-6).

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

- **판정 = ABSENT 워크플로 / thin-substrate.** SoD 보상통제 5종 자동부과·Continuous Monitoring은 순신규(grep 0·GT② §2).
- **재활용(Extend·개명 금지)**: Mandatory MFA = `UserAuth.php:929-961` · Additional Approval = `Mapping.php:287`·`:268-271` dual-control · Enhanced Logging = `SecurityAudit.php:14-33`·`:56-69` · Manual Audit = `AccessReview.php:66-80`·`:192` · 테넌트 격리 = `index.php:614-619`. 전부 대체 아닌 재활용(ADR D-5).
- **ABSENT**: Continuous Monitoring(SoD 전용 상시 감시)은 실 substrate 없음 — 순신규.
- **선행 의존(BLOCKED_PREREQUISITE)**: Conflict Matrix·Runtime Evaluator·Risk Engine(§17)이 severity·risk 산출을 선행. Part 1~3-9 인증 후 RP-track 실 구현(ADR §4).
- **NOT_CERTIFIED**: 코드 변경 0. 본 DSAR은 계약 확정용 설계 명세.
