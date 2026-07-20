# DSAR — Authorization Observability & Forensics: 테스트 계약 (Part 3-14 §36)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_14_AUTHORIZATION_OBSERVABILITY_FORENSICS_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_OBSERVABILITY_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_OBS_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_OBS_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 정의 (SPEC 근거)

SPEC §36은 6개 테스트 계층을 규정한다: **Unit**(Trace/Correlation/Replay/Timeline/Digital Twin) · **Integration**(PDP/PEP/RBAC/Dynamic Role/JIT/SoD/Audit) · **Performance**(10B Events/100M Traces/10M Replay) · **Security**(Evidence Tampering/Replay Manipulation/Chain Modification/Unauthorized Case Access/Event Forgery) · **Compliance**(ISO 27001/27701·SOC 2·NIST SP 800-61/800-92·PCI DSS) · **Regression**(Authorization/Policy/Workflow/Audit/Compliance).

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| SPEC §36 계층 | 판정 | 근거(파일:라인) |
|---|---|---|
| Unit (Trace/Correlation/Replay/Timeline/Twin) | **ABSENT** | 대상 엔진 부재. Trace/Replay/Digital Twin substrate 순신규 |
| Integration (Audit) | **PARTIAL** | 감사 이중기록 통합 선례(`AccessReview.php:225-233`)·3소스 집계(`Compliance.php:143-190`). PDP/PEP/RBAC/JIT/SoD 관측 배선은 순신규 |
| Integration (RBAC/Dynamic Role/JIT/SoD) | **ABSENT(관측)** | 각 엔진(Part 1~3-13)은 별도·관측 계약 미배선(ADR D-6) |
| Performance (10B Events/100M Traces/10M Replay) | **ABSENT** | Event Store·Trace·Replay 부재→부하 대상 없음(§35 참조) |
| Security (Chain Modification/Event Forgery) | **PARTIAL** | `SecurityAudit.php:56-68`(verify·broken_at 탐지)=체인변조/위조 검증 substrate. menu_audit_log verify 부재(`AdminMenu.php:169-212`)·auth_audit_log 해시 없음(`UserAuth.php:4190`) |
| Security (Evidence Tampering/Replay Manip/Case Access) | **ABSENT** | Evidence/Replay/Case substrate 부재→테스트 대상 없음 |
| Compliance (ISO/SOC2/NIST/PCI) | **PARTIAL** | SIEM forward(`Compliance.php:430-461`)·CEF/LEEF/syslog 직렬화(`Compliance.php:411-428`) 준수 substrate. 인증 테스트는 실 구현 조건 |
| Regression (Authorization/Policy/Workflow/Audit) | **ABSENT(자동화 부재)** | 회귀 스위트 미구성. CLAUDE.md상 PHPUnit 부재 |

## 3. 설계 계약 (항목·기준 — SPEC 근거)

| 계층 | 테스트 기준 (SPEC §36) |
|---|---|
| Unit | Trace·Correlation·Replay·Timeline·Digital Twin 단위 정확성 |
| Integration | PDP·PEP·RBAC·Dynamic Role·JIT·SoD·Audit 이벤트 관측 배선(무재구현·ADR D-6) |
| Performance | 10B Events·100M Traces·10M Replay Requests 부하 |
| Security | Evidence Tampering·Replay Manipulation·Chain Modification·Unauthorized Case Access·Event Forgery 차단(§28 Runtime Guard) |
| Compliance | ISO 27001·27701·SOC 2·NIST SP 800-61·800-92·PCI DSS |
| Regression | Authorization·Policy·Workflow·Audit·Compliance 무후퇴 |

## 4. KEEP_SEPARATE / 선행의존

- **KEEP_SEPARATE**: 마케팅 attribution/percentile(`AttributionEngine.php:1522`)·인프라(`SystemMetrics.php:1-60`)·ML(`ModelMonitor.php`)의 테스트는 authz 관측 테스트 아님.
- **선행의존**: Unit/Integration/Performance는 대응 엔진 신설 후 작성. Security(Chain/Forgery)는 `SecurityAudit.php:56-68` verify 확산으로 부분 성립. Compliance 인증은 RP-track 실 구현 조건.

## 5. 판정 (NOT_CERTIFIED · RP-track 실구현 조건 · 선행의존)

**판정 = ABSENT(Unit·Performance·대부분 Security/Regression) / PARTIAL(Integration-Audit·Security-Chain·Compliance-SIEM — `SecurityAudit.php:56-68`·`Compliance.php:143-190`·`:430-461` 재활용).** 코드 변경 0·NOT_CERTIFIED. Test Contract(Unit/Integration/Performance/Security/Compliance/Regression 100%)는 **실 구현(RP-track) 조건**이며 선행 Part 1~3-13 인증·substrate 신설 후 검증한다. Regression 100%는 Completion Gate(§37) 필수 관문이다.
