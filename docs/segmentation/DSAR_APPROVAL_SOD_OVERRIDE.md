# DSAR — Runtime SoD Enforcement: 비상 오버라이드 (APPROVAL_SOD_OVERRIDE)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_10_RUNTIME_SOD_ENFORCEMENT_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_SOD_ENFORCEMENT_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_SOD_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_SOD_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

**APPROVAL_SOD_OVERRIDE**(SPEC §2 Canonical Entity·§20 Emergency Override)는 SoD Conflict가 정상 통제로 차단되는 상황에서, **Incident · Disaster · Production Failure** 3대 비상 조건 하에 상충 직무 조합을 **일시 강행**하는 통제 엔티티다. §16 Resolution Strategy의 `Break Glass`·`Temporary Override`에 대응한다. §20의 핵심 계약은 **"사후 감사 필수(post-hoc audit mandatory)"** — 오버라이드는 사전 차단을 뚫되 반드시 불변 증거로 사후 추적·정당성 검증된다. 남용은 §31 Runtime Guard `Override Abuse`로 차단하고, §33 Error Contract `SOD_OVERRIDE_DENIED`, §34 Warning Contract `Override Usage Increased`, §26 Analytics `Override Usage`가 감시한다.

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| SPEC 요소 | 판정 | 근거(파일:라인) |
|---|---|---|
| SoD Emergency Override 전용 워크플로(3조건·사후감사) | **ABSENT (grep 0)** | GT② §2 "SoD Exception/Override/Compensating Control 워크플로 ABSENT". Resolution Strategy Override/Break-Glass 전용 코드 0(GT② §1) |
| Break-Glass 비상경로 (재활용 substrate) | **PRESENT** | `UserAuth.php:790-801`(`isMasterAuth` break-glass·env `GENIE_BREAKGLASS_PW` 비상경로) — GT① §F. **로그인 비상통제이지 SoD 예외 아님** |
| 사후 감사 불변 증거체인 (재활용 substrate) | **PRESENT** | `SecurityAudit.php:14-33`(append-only hash_chain)·`:35-41`·`:56-69`(verify 변조탐지) — GT① §F |
| 오버라이드 요청/승인 신원 fail-closed | **PARTIAL** | `Mapping.php:186-190`·`:246-250`(actorId 위조불가 도출·미확인 403)·`:244`(anon 정족수 우회 차단) — GT① §A. SoD 오버라이드 전용 아님 |
| 오버라이드 자체의 결재분리(maker≠checker) | **PARTIAL** | `Mapping.php:268-271` self-approval 차단(dual-control)만 실성립. Alerting VACUOUS(`Db.php:592-600` maker 부재·생산자 grep 0) — GT① §A/§B |

## 3. 설계 계약 (필드·상태·제약 — SPEC 근거·사후감사/테넌트격리)

- **비상 조건(§20)**: `incident` · `disaster` · `production_failure` 중 명시적 사유 필수. 조건 미기재 오버라이드 거부(fail-closed).
- **사후 감사 필수(§20)**: 오버라이드 발동 즉시 SecurityAudit 불변체인(`SecurityAudit.php:14-33`)에 발동자·사유·대상 conflict·시각 append. 사후 정당성 검토(§24 Evidence)·검증(`SecurityAudit.php:56-69` verify) 강제.
- **신원 무결성**: 발동자 신원은 서버도출 fail-closed(`Mapping.php:186-190` 재활용 선례)·미확인 시 거부. 익명 발동 차단(`Mapping.php:244` 패턴).
- **남용 차단(§31)**: `Override Abuse` Runtime Guard로 반복·비정상 오버라이드 차단 → §33 `SOD_OVERRIDE_DENIED`. §34 `Override Usage Increased` 경고·§26 `Override Usage` 지표.
- **테넌트 격리(§36)**: 오버라이드는 발동 테넌트 스코프(`index.php:614-619` X-Tenant-Id 서버도출 강제 재활용). cross-tenant 오버라이드 금지.
- **직교성(ADR D-6)**: JIT(3-9) 시한부 상승과 별개 — 오버라이드는 SoD 차단을 뚫는 비상 우회이지 권한 발급이 아님.

## 4. KEEP_SEPARATE (동음이의 흡수금지)

- **★break-glass(`UserAuth.php:790-801`) = 로그인 비상통제 ≠ SoD Override**: `isMasterAuth`는 인증 비상경로(마스터 자격)이지 SoD 상충 조합의 예외 강행이 아니다. Emergency Override의 **substrate로 재활용만** 하고 SoD Override로 개명·흡수 절대 금지(GT① §F·ADR D-5).
- **MFA 강화 ≠ Override**: `UserAuth.php:929-961`·`:940-945` mfa_policy는 보상통제(Compensating Control) 재활용 대상이지 오버라이드 아님(별도 DSAR).
- **단일승인 게이트 ≠ Override 승인**: `AdminGrowth.php:1294`·`:1313-1331`(requested_by 저장하나 self-approval 비교·정족수 없음)·`Catalog.php:2383-2407`은 SoD 오버라이드 결재 워크플로 아님(GT② B-5).
- **HTTP 409/sync conflict ≠ SoD conflict**: "conflict" 41파일 전부 SoD 무관 decoy(GT② B-1) — 오버라이드 대상 아님.

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

- **판정 = ABSENT 워크플로 / thin-substrate.** SoD Emergency Override 전용 3조건·사후감사·Runtime Guard 연동은 순신규(grep 0·GT② §2).
- **재활용(Extend·개명 금지)**: 비상경로 substrate = `UserAuth.php:790-801` break-glass(SoD 예외 아님·재활용만) · 사후감사 불변증거 = `SecurityAudit.php:14-33`·`:56-69` · 신원 fail-closed 선례 = `Mapping.php:186-190`·`:244` · 테넌트 격리 = `index.php:614-619`.
- **선행 의존(BLOCKED_PREREQUISITE)**: Conflict Matrix·Runtime Evaluator·Resolution Strategy(Break-Glass·§16)가 순신규 선행. Part 1~3-9 인증 후 RP-track 실 구현(ADR §4).
- **NOT_CERTIFIED**: 코드 변경 0. Alerting VACUOUS는 기존 확정·재플래그 아님(ADR D-7).
