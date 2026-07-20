# DSAR — Runtime SoD Enforcement: 테스트 계약 (Test Contract) (Part 3-10 §39)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_10_RUNTIME_SOD_ENFORCEMENT_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_SOD_ENFORCEMENT_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_SOD_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_SOD_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 정의 (SPEC 근거)

SPEC §39는 6개 테스트 계층을 규정한다.

| 계층 | 항목 | SPEC §39 |
|---|---|---|
| Unit | Rule / Matrix / Runtime Evaluation / Exception / Override | §39 |
| Integration | RBAC / JIT / Effective Resolution Engine / Workflow / Approval | §39 |
| Performance | 200K Runtime Eval/sec · 10M Conflict Checks/day · 1M Concurrent Session | §39 |
| Security | SoD Bypass / Exception Abuse / Override Abuse / Runtime Injection / Matrix Manipulation | §39 |
| Compliance | SOX / ISO 27001 / SOC 2 / PCI DSS / NIST / COBIT | §39 |
| Regression | Authorization / Assignment / Policy / Audit / Compliance | §39 |

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| 계층 | 판정 | 근거(GT/ADR) |
|---|---|---|
| Unit(Rule/Matrix/Eval) | **ABSENT(대상 부재)** | Rule/Matrix/Evaluator 코드 0(GT② §2) → 단위 테스트 대상 없음 |
| Integration-RBAC | **PARTIAL(대상 실존)** | 통합 대상 게이트 실존=`index.php:572-611`·`guardTeamWrite`(`UserAuth.php:1167-1186`)·`guardWarehouse`(`Wms.php:557-590`). SoD 결합 테스트는 신설 |
| Integration-JIT/Eff.Resolution | **선행 종속** | JIT=Part 3-9·Effective Resolution=Part 3-7(ADR D-6·선행계보). 산출(활성 역할집합) 입력 결합 검증 |
| Integration-Approval/Workflow | **PARTIAL** | 승인 선례=`Mapping.php:268-271`(self-approval)·정족수 `:287`. Alerting은 VACUOUS(`Db.php:592-600` maker 부재·GT① §B) |
| Security-SoD Bypass 등 | **ABSENT** | 우회·주입·Matrix 조작 방어 대상(Evaluator/Matrix) 부재 |
| Compliance(SOX 등) | **ABSENT** | 준수 검증 대상 통제 부재 |
| Regression-Audit | **PARTIAL** | 회귀 기준선=`SecurityAudit.php:56-69`(verify 변조탐지)·cross-tenant `index.php:614-619` 유지 검증 |

## 3. 설계 계약 (항목·기준 — SPEC 근거)

- **Unit**: Conflict Rule 불변성(§36)·Matrix 상충판정·Runtime Evaluation 차단(§22)·Exception 자동종료(§19)·Override 사후감사(§20) 단위 검증.
- **Integration**: SoD Evaluator를 RBAC 게이트(`index.php:572-611`) 뒤에 삽입한 상태에서 정적 RBAC 판정 무후퇴(ADR D-1) + JIT(3-9)/Effective Resolution(3-7) 산출 결합 시 상충 재평가(§5 Dynamic SoD·ADR D-6) + Mapping 승인 흐름(`Mapping.php:268-271`) 병존.
- **Security**: SoD Bypass·Exception/Override Abuse·Runtime Injection·Matrix Manipulation 침투 검증(§31 Guard·§32 Lint 대응).
- **Regression**: Authorization/Assignment/Policy/Audit/Compliance 100% — RBAC/ABAC 게이트·maker-checker·`SecurityAudit.php:14-33` 체인·cross-tenant 무후퇴 확인(ADR §4 무후퇴).

## 4. KEEP_SEPARATE / 선행의존

- **KEEP_SEPARATE**: FE `SecurityGuard.js`/`ContaminationGuard.js`(XSS/테넌트오염)는 SoD Static Lint 테스트 아님(GT② B-8). 비즈 simulate/drift(GT② B-6)·"conflict" 409/sync(GT② B-1) 테스트와 무관.
- **선행의존**: 이 repo는 구성된 lint/test 스크립트 부재(CLAUDE.md, 수동 검증). SoD 테스트 스위트 자체가 순신설. Integration-JIT/Eff.Resolution은 Part 3-7/3-9 인증 선행. Alerting VACUOUS는 재플래그 아님(ADR D-7).

## 5. 판정

**NOT_CERTIFIED · 코드 0.** 6개 테스트 계층의 대상(Rule/Matrix/Evaluator/Exception/Override) 대부분 ABSENT. Integration/Regression은 실존 게이트(`index.php:572-611`·`UserAuth.php:1167-1186`·`Wms.php:557-590`)·감사체인(`SecurityAudit.php:14-33`·`:56-69`)·maker-checker(`Mapping.php:268-271`)를 무후퇴 기준선으로 재활용. Compliance(SOX/ISO27001/SOC2/PCI/NIST/COBIT)·Performance(200K/sec 등)·Security 테스트는 **RP-track 실 구현 조건**(선행 Part 1~3-9·3-7·3-9 인증 후). Extend-only.
