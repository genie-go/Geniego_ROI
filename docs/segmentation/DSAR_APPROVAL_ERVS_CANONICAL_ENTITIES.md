# DSAR — ERVS Canonical Entities Design & Judgment (Part 3-29 §2~§25)

> **거버넌스 상태**: per-entity 설계·판정 · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-21).
> file:line 인용은 GT①②/ADR 등장분만(반날조).

## 20 Canonical Entity — substrate 매핑·판정
| # | Entity | 현행 substrate | 인용 | 판정 |
|---|---|---|---|---|
| 1 | APPROVAL_VALIDATION_REGISTRY | 부재 | — | ABSENT |
| 2 | APPROVAL_VALIDATION_PROFILE | 부재 | — | ABSENT |
| 3 | APPROVAL_VALIDATION_PLAN | E2E 시나리오 목록 | `tools/e2e` | ABSENT-formal(profile/plan 스키마 신설) |
| 4 | APPROVAL_VALIDATION_EXECUTION | E2E/CI 실행 | `render.mjs`·`deploy.yml` | PARTIAL(오케스트레이션 신설) |
| 5 | APPROVAL_VALIDATION_RESULT | smoke pass/fail·CI status | `render.mjs`·CI | PARTIAL(구조화 result 신설) |
| 6 | APPROVAL_VALIDATION_EVIDENCE | append-only 정본 | `SecurityAudit.php` | PARTIAL(체인 재사용·스키마 신설) |
| 7 | APPROVAL_VALIDATION_SNAPSHOT | 부재 | — | ABSENT |
| 8 | APPROVAL_VALIDATION_ANALYTICS | 부재 | — | ABSENT |
| 9 | APPROVAL_VALIDATION_DIGEST | 부재 | — | ABSENT |
| 10 | APPROVAL_REFERENCE_REQUIREMENT | 부재 | — | ABSENT |
| 11 | APPROVAL_REFERENCE_CONTROL | 컴플라이언스 control inventory | `Compliance.php` | PARTIAL |
| 12 | APPROVAL_REFERENCE_ASSERTION | 계약가드(rollup kpi 등) | `tools/e2e` | ABSENT-formal(assertion 엔진 신설) |
| 13 | APPROVAL_REFERENCE_BASELINE | sacred SHA baseline | `.githooks/baseline.json` | KEEP_SEPARATE(로케일 ≠ Reference·순신설) |
| 14 | APPROVAL_VALIDATION_EXCEPTION | 부재 | — | ABSENT |
| 15 | APPROVAL_VALIDATION_WAIVER | 부재 | — | ABSENT |
| 16 | APPROVAL_VALIDATION_VERSION | 부재 | — | ABSENT |
| 17 | APPROVAL_VALIDATION_SCORE | 부재 | — | ABSENT |
| 18 | APPROVAL_VALIDATION_STATUS | CI job status | `deploy.yml` | ABSENT-formal |
| 19 | APPROVAL_VALIDATION_CERTIFICATE | 부재 | — | ABSENT |
| 20 | APPROVAL_VALIDATION_HISTORY | 부재(CI run history=GitHub) | — | ABSENT-formal |

## 도메인 설계 계약(§3~§25 Validators 요지)
- **§5 Architecture Validator**: 현 아키텍처=Slim 모놀리식(`public/index.php`)·layer separation 비형식 → conformance rule 신설.
- **§6 Authorization Validator**: 실 substrate 강함 — RBAC(`index.php` middleware)·effective permission(`TeamPermissions::effectiveForUser`)·writeGuard. Validator는 이 실 강제를 **검증**(재구현 아님).
- **§9 Zero Trust·§10 Federation·§12 AI Governance**: 개별 실 기능(MFA·SSO·ClaudeAI) 실재·통합 Validator 부재.
- **§13~15 Digital Twin/Knowledge Graph/Governance Mesh Validator**: 대상 시스템 자체가 ABSENT(설계 트랙) → Validator도 ABSENT.
- **§16 Runtime·§19 Security·§21 Operational Validator**: Health/SystemMetrics·SecurityAudit·Alerting을 검증 소스로 승격.
- **§17 Deployment Validator**: CI 빌드/스캔 PARTIAL·SBOM/signing 부재(Part3-25 정합).

## 판정
**PARTIAL(§4~6·§11~12 execution/result/evidence/assertion=E2E/CI/Compliance/SecurityAudit substrate) / ABSENT-formal(Registry·Certificate·Score·Snapshot·Analytics·PDP/PEP/Zero Trust/Digital Twin/KG/Mesh Validator).** 코드 0. BLOCKED_PREREQUISITE. 실행 시 기존 검증 자산 확장(러너/해시체인 신설 금지).
