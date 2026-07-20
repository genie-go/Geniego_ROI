# DSAR — APPROVAL_TWIN_TEST_MATRIX (Part 3-22 §33)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_22_DIGITAL_TWIN_PREDICTIVE_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_DIGITAL_TWIN_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_TWIN_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_TWIN_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 (SPEC §33 Test Matrix)

`APPROVAL_TWIN_TEST_MATRIX`는 권한 승인 디지털 트윈의 **검증 매트릭스**를 계약한다.

- **Unit** — Twin Sync·Replay·Scenario·Prediction·Capacity Forecast.
- **Integration** — Fabric·Knowledge Graph·Federation·AI Governance·Compliance·Observability 연동.
- **Performance** — 100 Twin·10M Events/Hour·100K Scenarios·5Y Replay.
- **Security** — Replay Tampering·Prediction Manipulation·Twin Isolation Failure·Unauthorized Read·Cross-Tenant Replay.
- **Compliance** — ISO27001·ISO42001·SOC2·NIST AI RMF·GDPR.
- **Regression** — 무후퇴 회귀.

## 2. Substrate 매핑

| 계약 테스트 축 | 현행 substrate | file:line | 판정 |
|---|---|---|---|
| Unit(Twin/Replay/Scenario/Prediction/Forecast) | 대상 엔진 부재 | — | 미구현 |
| Integration(Fabric/KG/Federation/AI Gov/Observability) | 대상 연동 부재 | — | 미구현 |
| Performance(100 Twin·10M ev/h·100K scn·5Y replay) | 대상 파이프라인 부재 | — | 미구현 |
| Security: Replay Tampering | SecurityAudit verify(해시 체인 검증) | `SecurityAudit.php:56-67` | PARTIAL(검증 기반=라이브 표적) |
| Security: Cross-Tenant Replay / Twin Isolation | env 기반 DB 격리 | `Db.php:81-84` | PARTIAL(격리 기반=라이브 표적) |
| Security: Unauthorized Read | AI governance 게이트(Compliance) | `Compliance.php:133-151` | PARTIAL-substrate |
| Compliance(ISO/SOC2/NIST/GDPR) | Compliance 핸들러 | `Compliance.php:133-151` | PARTIAL-substrate |
| Regression | 회귀 도구 부재(트윈 대상 없음) | — | 미구현 |

트윈 엔진 부재로 Unit·Integration·Performance·Regression 전 축은 **미구현**이다. 다만 Security 축 일부는 **현행 라이브 substrate를 표적으로 즉시 검증 가능**하다: Replay Tampering은 SecurityAudit verify(`SecurityAudit.php:56-67`)의 해시 체인 무결성 검증에, Cross-Tenant Replay·Twin Isolation Failure는 env DB 격리(`Db.php:81-84`)에 표적을 둘 수 있다.

## 3. 설계 계약

1. **Security 축은 라이브 표적 검증을 확장**한다 — Replay Tampering 시나리오는 `SecurityAudit.php:56-67` verify 경로에, Cross-Tenant Replay는 `Db.php:81-84` 격리 경계에 대해 지금도 회귀 케이스로 고정 가능하며, 트윈 신설 시 그대로 승계한다.
2. **Compliance 매핑(ISO27001/ISO42001/SOC2/NIST AI RMF/GDPR)**은 `Compliance.php:133-151` 게이트를 확장하여 트윈 예측/판독 증거를 귀속시킨다.
3. Unit·Integration·Performance·Regression 케이스는 대상 엔진 순신설에 **종속**(BLOCKED_PREREQUISITE), RP-track 조건.

## 4. 판정

**미구현**(트윈 부재로 대다수 축 실행 불가). Security 축 중 Replay Tampering은 SecurityAudit verify(`SecurityAudit.php:56-67`), Cross-Tenant/Twin Isolation은 env 격리(`Db.php:81-84`)를 라이브 표적으로 확장 가능하고, Compliance는 `Compliance.php:133-151`에 귀속한다. Unit·Integration·Performance·Regression은 대상 엔진 순신설에 종속하는 **RP-track 조건**. 선행 트윈 엔진 부재로 **BLOCKED_PREREQUISITE**. 코드 변경 0 · NOT_CERTIFIED.
