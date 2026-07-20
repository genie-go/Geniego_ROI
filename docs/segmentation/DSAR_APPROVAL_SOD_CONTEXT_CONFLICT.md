# DSAR — Runtime SoD Enforcement: 컨텍스트 충돌 (APPROVAL_SOD_CONTEXT_CONFLICT)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_10_RUNTIME_SOD_ENFORCEMENT_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_SOD_ENFORCEMENT_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_SOD_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_SOD_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

`APPROVAL_SOD_CONTEXT_CONFLICT`(SPEC §2·§8)는 **실행 컨텍스트(Context)에 따라 SoD 상충을 가변 평가**하는 Context-aware SoD 하위 엔티티다. SPEC §8이 열거하는 Context 축:

- Device
- Region
- Project
- Environment (§3 Environment vs Environment 포함)
- Business Calendar
- Risk Level (§17 Risk Engine 연동)

동일 역할 조합이라도 컨텍스트(예: 운영 vs 스테이징 Environment, 고위험 Region, 마감일 Business Calendar)에 따라 Block/Challenge를 달리한다.

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| substrate | 상태 | 근거(파일:라인) |
|---|---|---|
| Context Conflict Engine (Device/Region/Env/Risk 인지 평가) | **ABSENT** | grep 0 (GT② §2 Context Conflict Engine ABSENT) |
| Risk-aware / Context-aware 평가층 | **ABSENT** | Runtime Evaluator 자체 부재 (GT② §2) |
| MFA 컨텍스트 정책 (Compensating Control 재활용) | PRESENT | `UserAuth.php:929-961`·`:940-945` `mfa_policy` 테넌트별 off/admin/all 강제 (GT① §F) |
| break-glass 비상경로 (Emergency Override 재활용) | PRESENT | `UserAuth.php:790-801` `isMasterAuth` env(`GENIE_BREAKGLASS_PW`) (GT① §F) |

판정: Context-aware SoD 평가 **전면 ABSENT(그린필드)**. Device/Region/Environment/Risk 컨텍스트를 SoD 판정 입력으로 쓰는 코드경로 0. MFA·break-glass는 로그인 통제로서 **보상통제 substrate 재활용** 대상일 뿐 컨텍스트 상충평가 아님.

## 3. 설계 계약 (필드·상태·제약 — SPEC 근거·테넌트격리)

- **필드**: `context_type`(Device/Region/Project/Environment/BusinessCalendar/RiskLevel·§8)·`condition`·`conflict_type`·`severity`(§15)·`resolution_strategy`(§16).
- **평가 계약**: Runtime 컨텍스트(§23 Runtime Context 스냅샷)를 입력받아 컨텍스트 조건 충족 시에만 상충 활성화, Risk Engine(§17)이 Environment/Data Classification으로 severity 상향(ADR D-1).
- **제약**: Immutable Rule(§36)·Tenant Isolation. Context 평가는 Runtime Eval ≤10ms(§38) 안에서.
- **보상통제**: 고위험 컨텍스트 상충 시 Mandatory MFA(§21)를 `mfa_policy`(`UserAuth.php:929-961`) 재활용으로 강제(ADR D-5).

## 4. KEEP_SEPARATE (동음이의 흡수금지)

- **시간창 쿨다운** `AbTesting.php:161`(DCO)·`AutoCampaign.php:622`(explore) — Business Calendar/Temporal 컨텍스트 아님(GT② §B-3).
- **비즈 이상탐지/드리프트** `AnomalyDetection.php`(마케팅)·`ModelMonitor.php`(model drift) — Risk Level 컨텍스트 SoD 아님(GT② §B-6).
- **MFA·break-glass** `UserAuth.php:929-961`·`:790-801` — 로그인 통제(재활용 substrate)지 그 자체가 Context Conflict Engine 아님(GT① §F).
- **FE 가드** `SecurityGuard.js`/`ContaminationGuard.js` — XSS/오염 방지지 컨텍스트 SoD 아님(GT② §B-8).

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

**NOT_CERTIFIED · 코드 0.** Context Conflict Engine·Risk-aware 평가 = **순신규(ABSENT·grep 0)**. 재활용(Extend) = MFA(`UserAuth.php:929-961`)·break-glass(`:790-801`)를 Compensating Control/Emergency Override 재료로(ADR D-5). 선행의존: Runtime Context Snapshot(§23)·Risk Engine(§17)·Conflict Matrix 신설 + Part 1~3-9 인증 후 실 구현(BLOCKED_PREREQUISITE). 무후퇴: MFA/break-glass 통제 유지·병행.
