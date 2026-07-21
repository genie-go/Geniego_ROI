# DSAR — EAFTAF Governance Mechanisms (Part 3-43 §22~§32)

> **거버넌스 상태**: 실행 게이트/계약 설계 · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-21).
> 인용은 GT①②/ADR 등장분만(반날조).

## §22 Runtime Guard — 차단 대상
Unauthorized Technology Adoption · Unsupported Technology Deployment · Missing Security Validation · Missing Executive Approval · Technology Baseline Drift · Policy Bypass.
- 판정 **PARTIAL**. 무단 기술 채택/배포 차단=CHANGE_GATE(`docs/CHANGE_GATE.md`)·`deploy.yml` 게이트·`index.php` RBAC. ★Security Before Adoption=CI 스캔(`security-scan.yml`)·보안검증 게이트 필수(원칙 정합).

## §23 Static Lint — 탐지 대상
Missing Evaluation Report · Missing POC Result · Missing Security Assessment · Missing Lifecycle State · Missing Architecture Validation · Duplicate Technology Entry.
- **ABSENT**. Duplicate Technology Entry=중복금지 규율. Missing Architecture Validation=Part 3-33 정합. pre-commit 확장.

## §24 Error Contract
TECHNOLOGY_EVALUATION_FAILED · TECHNOLOGY_ADOPTION_DENIED · POC_VALIDATION_FAILED · PILOT_VALIDATION_FAILED · ARCHITECTURE_COMPATIBILITY_FAILED · TECHNOLOGY_STANDARDIZATION_FAILED · TECHNOLOGY_RETIREMENT_REQUIRED. — 순신설.

## §25 Warning Contract
Technology Becoming Obsolete · Vendor Risk Increasing · Pilot Delayed · Adoption Below Target · Investment Review Required. — 순신설.

## §26 API (최소 8)
Register Technology · Query Technology Radar · Execute Technology Evaluation · Register POC · Query Adoption Status · Export Technology Report · Query Analytics · Publish Technology Baseline.
- **ABSENT**. 최신 버전 프리픽스·`routes.php`+`index.php` bypass 규약(신규 실배선 `/api` 접두·[[reference_api_prefix_routing]]). 전 API=admin 게이트(requirePlan('admin')). 대부분 조직 프로세스라 API보다 거버넌스/조직 본질.

## §27 Database Constraint
Immutable Technology History · Evaluation Integrity · POC Integrity · Vendor Assessment Integrity · Tenant Isolation · Baseline Integrity.
- Immutable/Evidence = git + `SecurityAudit::verify` 재사용(신규 체인 금지). Isolation = `Db.php`. Evaluation/POC 무결성=버전+체인. 나머지 테이블 순신설.

## §28 Index
Technology · Evaluation · POC · Vendor · Snapshot · Evidence. — §27 테이블 종속·테넌트 선도키 권장.

## §29 성능 요구사항
Technology Registration ≤3초 · Technology Evaluation ≤5분 · Dashboard Refresh ≤5초 · Analytics Calculation ≤30초 · Availability ≥99.999%. — 벤치 대상 미존재(엔티티 신설 후 측정).

## §30 테스트
Unit/Integration(Capability Catalog & Reference Library·Next Generation Platform Vision·Autonomous Enterprise Governance·Validation Suite·Production Excellence·Executive Governance Dashboard)/Performance(100k Technology Profiles·25k POCs·5k Pilots·1k Vendors)/Security(Unauthorized Technology Approval·Evaluation Tampering·Vendor Data Manipulation·Cross-Tenant Information Leakage)/Compliance(ISO 27001·42001·COBIT 2019·TOGAF·ITIL 4)/Regression 매트릭스. 순신설.

## §31 Completion Gate
25 구성요소 구축 + Performance Benchmark 통과 + Future Technology Adoption Validation 통과 + Regression 100%.
- **현재 게이트 미충족**(형식 엔티티 ABSENT/PARTIAL·조직 부재·코드 0). BLOCKED_PREREQUISITE=선행 Part1~3-42 인증 + 조직 신설.

## 종합 판정
전 메커니즘 **ABSENT-formal/PARTIAL** — Runtime Guard는 CHANGE_GATE/CI 스캔/deploy/RBAC 확장, Immutable/Evidence는 git+`SecurityAudit` 재사용, Radar/POC/Architecture는 상위 Part 통합. 코드 변경 0. 실행 불가(선행 인증+조직 종속).
