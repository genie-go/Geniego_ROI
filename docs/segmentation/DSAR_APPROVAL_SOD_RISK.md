# DSAR — Runtime SoD Enforcement: 위험 기반 동적 직무분리 (APPROVAL_SOD_RISK)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_10_RUNTIME_SOD_ENFORCEMENT_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_SOD_ENFORCEMENT_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_SOD_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_SOD_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

`APPROVAL_SOD_RISK`는 SPEC §17(Risk Engine) 및 §5(Dynamic SoD)의 위험 기반 동적 직무분리 대상이다. 충돌의 위험도를 산정하여 Severity·Resolution Strategy를 위험 가중으로 결정하고, 고위험 조합에는 보상통제(Compensating Control)를 강제한다.

SPEC §17 Risk Engine 평가 요소: **Critical Permission** · **Financial Impact** · **Compliance Impact** · Data Classification · Environment · Runtime Behavior.
SPEC §5 Dynamic SoD 평가: Session · Runtime Role · Dynamic Role · Temporary Role · JIT Access.
SPEC §21 Compensating Control: Additional Approval · Enhanced Logging · **Mandatory MFA** · Continuous Monitoring · Manual Audit.

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| SPEC 요소 | 판정 | 근거(GT file:line) |
|---|---|---|
| Mandatory MFA(보상통제 재활용) | PRESENT(재활용) | `UserAuth.php:929-961`·`:940-945` `mfa_policy` 테넌트별 off/admin/all 강제(GT① §F) — Compensating Control(강화 MFA) 재활용 |
| Emergency Override substrate | PRESENT(재활용) | break-glass `isMasterAuth` `UserAuth.php:790-801` env 비상경로(GT① §F) — 고위험 Override 재활용 |
| 검토·증거 저장(위험검토 패턴) | PRESENT(재활용) | `AccessReview.php:66-80`·`:219-224`·`:225` justification 필수(`:192` fail-secure) 추가전용(GT① §F) |
| **Conflict Risk Engine(위험 산정)** | **ABSENT** | SoD 충돌 위험도 산정·Severity 가중 코드경로 grep 0(GT② §2) |
| Dynamic SoD(JIT/동적역할 충돌 재평가) | **ABSENT** | 세션 단일 team_role(`UserAuth.php:263-316`)·다중 활성역할 데이터 기반 부재(GT② §2 Dynamic SoD) |
| Risk 전용 Analytics/Drift | **ABSENT** | SoD 전용 Analytics/Drift grep 0(GT② §2) |

**핵심**: 위험을 산정하는 SoD Risk Engine 자체는 ABSENT이며, MFA(`UserAuth.php:929-961`)·break-glass(`:790-801`)는 위험 대응 **보상통제 substrate**로만 재활용된다(ADR §D-5).

## 3. 설계 계약 (필드·상태·제약 — SPEC 근거·테넌트격리)

- **위험 산정**: SPEC §17 6요소(Critical Permission/Financial/Compliance Impact/Data Classification/Environment/Runtime Behavior)로 충돌 위험도 산출 → §15 Severity(Low/Medium/High/Critical/Regulatory) 매핑.
- **동적 재평가**: SPEC §5 Dynamic SoD — JIT grant·Dynamic Role·Temporary Role 산출(3-7 Effective Resolution·3-9 JIT)을 입력으로 상충 재평가(ADR §D-6). JIT가 시한부 상승 발급 시에도 SoD Evaluator가 상충·위험 재평가.
- **보상통제(재활용)**: 고위험 충돌 → SPEC §21 Compensating Control. 강화 MFA는 `mfa_policy`(`UserAuth.php:929-961`) 재활용, Emergency Override 사후감사는 break-glass(`:790-801`)+SecurityAudit(`SecurityAudit.php:14-33`) 재활용(ADR §D-5).
- **해소 전략**: §16 Resolution(Block/Challenge/Approval Required/Escalation/Temporary Override/Break Glass)을 위험 가중 선택.
- **테넌트 격리**: `index.php:614-619` X-Tenant-Id 서버도출 강제 위에서 테넌트별 위험 산정·통제(§36).
- **증거**: 위험 결정은 SecurityAudit 불변체인(`SecurityAudit.php:14-33`·`:56-69`)·access_review justification(`AccessReview.php:192`) 패턴 재활용.

## 4. KEEP_SEPARATE (동음이의 흡수금지)

- **비즈니스 anomaly/drift/simulate ≠ SoD Risk**: `AnomalyDetection.php`(마케팅)·`ModelMonitor.php`(model drift)·`RuleEngine.php`/`Decisioning.php`/`PriceOpt.php`(비즈 simulate)는 SoD 위험/Drift/Simulation 아님(GT② B-6). ★마케팅 리스크 엔진 흡수 금지.
- **MFA/break-glass = 로그인 보상통제 substrate**: `UserAuth.php:929-961`·`:790-801`은 재활용 대상이나 로그인 통제이지 SoD 위험 산정 엔진 아님(ADR §D-5·GT② §3-5).
- **위임상한 클램프 ≠ 위험 SoD**: `TeamPermissions.php:599-621`·`:642-658`은 권한상승 방지 클램프이지 충돌 위험 산정 아님(GT② B-4).

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

- **판정 = ABSENT(엔진 순신규)·재활용 substrate = MFA/break-glass/access_review 보상통제**. Conflict Risk Engine·Dynamic SoD 재평가·Risk Analytics 전부 grep 0(GT② §2).
- **선행 의존**: Conflict Matrix/Rule(§14·ADR §D-2)·Conflict Snapshot(§23 Active Roles·ADR §D-4)·Effective Resolution(3-7)·JIT(3-9) 결합 선행. Part 1~3-9 인증 후 실구현(BLOCKED_PREREQUISITE).
- **정직 분리**: MFA/break-glass는 보상통제 재활용이지 위험 산정 엔진 아님. 마케팅 anomaly/drift/simulate는 전부 비-SoD decoy(ADR §D-7·GT② B-6).
- **무후퇴·Extend-only**: `mfa_policy`·break-glass·access_review·SecurityAudit 유지·병행.
- **코드 변경 0 · NOT_CERTIFIED**. 실 엔진 구현은 별도 RP-track 승인세션 대상.
