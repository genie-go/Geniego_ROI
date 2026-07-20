# DSAR — Operational Readiness Test Matrix (Part 3-25 §32)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_25_FINAL_INTEGRATION_OPERATIONAL_READINESS_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_OPERATIONAL_READINESS_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_OPSREADY_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_OPSREADY_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약(SPEC)
Part 3-25 §32는 도메인의 **테스트 매트릭스(Test Matrix)**를 6계층으로 규정한다:
- **Unit** — Integration Orchestrator / Readiness Manager / Deployment Validator / Certification / Hypercare.
- **Integration** — Fabric / Mesh / Quantum / Digital Twin / Knowledge Graph / Self-Healing.
- **Performance** — 500 Clusters · 10K Packages · 1K Validations · 100 Regions.
- **Security** — Release Tampering / Unauthorized Deployment / Certificate Forgery / Config Drift Attack / Cross-Tenant Deployment.
- **Compliance** — ISO27001 / ISO20000-1 / SOC2 / NIST 800-53 / PCI.
- **Regression** — 무후퇴 회귀.

## 2. Substrate 매핑
| 테스트 계층 | 라이브 표적 substrate | 인용 | 상태 |
|---|---|---|---|
| Unit(전 컴포넌트) | 오케스트레이터/매니저/밸리데이터 부재 | — | 미구현 |
| Integration(6엔진) | Fabric/Mesh/Quantum/Twin/KG/Self-Healing 부재 | — | 미구현 |
| Performance(대규모) | 측정 framework 부재 | — | 미구현 |
| Security: Release Tampering | SecurityAudit verify | `backend/src/SecurityAudit.php:60-64` | 표적 존재 |
| Security: Cross-Tenant Deployment | Db 테넌트 격리 | `backend/src/Db.php:81-84` | 표적 존재 |
| Security: 스캔 게이트 | CI 보안 스캔 | `.github/workflows/security-scan.yml:126-144` | 표적 존재 |
| Compliance(5표준) | Compliance 핸들러(부분) | `backend/src/Handlers/Compliance.php:50-128` | 부분 표적 |

## 3. 설계 계약
- **Unit/Integration/Performance**: 대상 컴포넌트·엔진·측정 framework가 모두 부재하여 테스트 정의는 가능하나 실행 substrate가 없다(미구현). 신설 시 각 유닛은 SecurityAudit 봉인 원장(`SecurityAudit.php:25-31`)을 검증 앵커로 사용.
- **Security 계층**은 라이브 표적이 실재한다:
  - *Release Tampering* → SecurityAudit verify(`SecurityAudit.php:60-64`)로 릴리스 digest 변조 탐지 검증.
  - *Cross-Tenant Deployment* → Db 격리(`Db.php:81-84`) 술어 우회 시도 차단 검증.
  - *스캔 게이트* → CI 보안 스캔(`security-scan.yml:126-144`)이 배포 전 차단하는지 검증.
  - *Unauthorized Deployment / Certificate Forgery / Config Drift Attack* → 대응 거버넌스 테이블(§29) 부재로 현재는 표적 없음(신설 종속).
- **Compliance**: Compliance 핸들러(`Compliance.php:50-128`)가 부분 substrate. ISO27001/ISO20000-1/SOC2/NIST 800-53/PCI 매핑은 이 위에 확장하되 인증 증거 원장은 신설.
- **Performance(500 Clusters·10K Packages·1K Validations·100 Regions)**: RP-track 조건 — §31 측정 framework 선행 없이는 부하 표적 성립 불가.

## 4. 판정
**미구현.**
- framework 부재. 라이브 표적=SecurityAudit verify(`SecurityAudit.php:60-64`)·Db 격리(`Db.php:81-84`)·CI 스캔(`security-scan.yml:126-144`)·Compliance 부분(`Compliance.php:50-128`)에 국한.
- Unit/Integration/Performance 전 계층 미구현·RP-track 조건.
- 코드 변경 0 · NOT_CERTIFIED · 선행 Part1~3-24 인증 후 실행 가능.
