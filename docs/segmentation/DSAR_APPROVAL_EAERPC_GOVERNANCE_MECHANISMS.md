# DSAR — EAERPC Governance Mechanisms (Part 3-36 §19~§28)

> **거버넌스 상태**: 실행 게이트/계약 설계 · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-21).
> 인용은 GT①②/ADR 등장분만(반날조).

## §19 Runtime Guard — 차단 대상
Uncertified Production Deployment · Expired Certification Usage · Invalid Certification Evidence · Unauthorized Certification Approval · Certification Policy Bypass · Reference Baseline Drift.
- 판정 **PARTIAL**. Uncertified Deployment 차단=기존 `deploy.yml` 게이트·`index.php` RBAC 위 배치(신규 게이트 신설 금지). ★현재 06-A=미인증→설계 문서만 배포(코드 미배포)가 이 가드와 정합.

## §20 Static Lint — 탐지 대상
Missing Certification Evidence · Missing Approval · Missing Benchmark · Missing Compliance Mapping · Missing Renewal Plan · Incomplete Test Coverage.
- **PARTIAL**. Incomplete Test Coverage=E2E 119라우트 커버리지 재사용. pre-commit/CI 확장.

## §21 Error Contract
CERTIFICATION_FAILED · CERTIFICATION_EXPIRED · CERTIFICATION_APPROVAL_DENIED · REFERENCE_PLATFORM_INVALID · CERTIFICATION_EVIDENCE_INVALID · BENCHMARK_VALIDATION_FAILED · RENEWAL_REQUIRED. — 순신설. ★현재=CERTIFICATION_FAILED 해당(06-A 미인증).

## §22 Warning Contract
Certification Near Expiration · Coverage Below Target · Compliance Gap Detected · Benchmark Degradation · Renewal Scheduled. — 순신설.

## §23 API (최소 8)
Register Certification · Execute Certification · Query Certification Status · Generate Certification Report · Export Evidence Package · Renew Certification · Query Analytics · Publish Certification.
- **ABSENT**. 최신 버전 프리픽스·`routes.php`+`index.php` bypass 규약(신규 실배선 `/api` 접두·[[reference_api_prefix_routing]]). 전 API=admin 게이트(requirePlan('admin')). ★Publish Certification=06-A 미인증이라 발행 불가(정합).

## §24 Database Constraint
Immutable Certification History · Evidence Integrity · Approval Integrity · Benchmark Integrity · Tenant Isolation · Version Integrity.
- Immutable/Evidence = `SecurityAudit::verify` 재사용(신규 체인 금지). Isolation = `Db.php`. Signature=신설(artifact signing). 나머지 테이블 순신설.

## §25 Index
Certification · Evidence · Approval · Benchmark · Snapshot · Report. — §24 테이블 종속·테넌트 선도키 권장.

## §26 성능 요구사항
Certification Validation ≤10분 · Evidence Verification ≤2분 · Dashboard Refresh ≤5초 · Report Generation ≤30초 · Availability ≥99.999%. — 벤치 대상 미존재(엔티티 신설 후 측정).

## §27 테스트
Unit/Integration(Program Closure·Executive Governance Dashboard·Strategic Architecture Lifecycle·Global Operations·Validation Suite·Production Excellence)/Performance(100k Certification Records·1M Evidence·100 Regions·10k Concurrent)/Security(Unauthorized Certification·Evidence Tampering·Approval Forgery·Cross-Tenant·Signature Manipulation)/Compliance(ISO 17065·27001·SOC2·NIST·COBIT 2019)/Regression 매트릭스. 순신설.

## §28 Completion Gate
24 구성요소 구축 + Performance Benchmark 통과 + Enterprise Reference Platform Certification 통과 + Regression 100%.
- **★현재 게이트 미충족(근본)**: 대상 플랫폼(06-A) 전건 NOT_CERTIFIED·코드 0 → 인증 실행해도 Not Certified. BLOCKED_PREREQUISITE=선행 Part1~3-35 실 구현·인증.

## 종합 판정
전 메커니즘 **PARTIAL/ABSENT-formal + ★06-A 미인증** — Runtime Guard/Static Lint는 deploy/CI/pre-commit/RBAC 확장, Evidence/Isolation은 `SecurityAudit`/`Db` 재사용, Functional/Security Certification은 Part 3-29 Validator 실행. 코드 변경 0. 인증은 선행 실 구현·인증 완료가 전제.
