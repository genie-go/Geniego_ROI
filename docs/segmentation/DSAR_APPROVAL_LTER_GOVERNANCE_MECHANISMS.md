# DSAR — LTER Governance Mechanisms (Part 3-27 §25~§34)

> **거버넌스 상태**: 실행 게이트/계약 설계 · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-21).
> 상위 SPEC/ADR/GT: Part 3-27 계보. 인용은 GT①②/ADR 등장분만(반날조).

## §25 Runtime Guard — 차단 대상
Unsupported Technology Adoption · Unapproved Architecture Change · End-of-Life Component Deployment · Critical Technical Debt Accumulation · Non-Compliant Vendor Usage.
- 판정 **ABSENT**. 현행 런타임 가드는 인가/쓰기(`index.php` RBAC·`UserAuth::guardTeamWrite`)에 한정되며, 진화/기술채택 가드는 부재. 실행 시 배포 파이프라인(`.github/workflows/deploy.yml`) 게이트로 통합 권장(중복 신설 금지).

## §26 Static Lint — 탐지 대상
Missing Migration Plan · Deprecated Dependency · Unsupported Runtime · Architecture Divergence · Missing Lifecycle Policy · Orphan Capability.
- 판정 **ABSENT**. 현 정적 검사=pre-commit 게이트(자격증명·php -l·sacred SHA·라우트 정합)에 한정. Evolution Lint는 CI 확장 대상.

## §27 Error Contract
ROADMAP_VERSION_INVALID · EVOLUTION_PLAN_MISSING · DEPRECATION_POLICY_VIOLATION · UNSUPPORTED_DEPENDENCY · ARCHITECTURE_EVOLUTION_FAILED · INVESTMENT_PLAN_INVALID · LIFECYCLE_VALIDATION_FAILED. — 순신설(에러코드 상수 부재).

## §28 Warning Contract
Technical Debt Increasing · Major Dependency Near EOL · Roadmap Delay · Investment Gap · Capability Delivery Behind Schedule. — 순신설.

## §29 API (최소 8)
Query Roadmap · Register Capability · Generate Evolution Plan · Compare Versions · Query Technical Debt · Export Roadmap · Query Analytics · Validate Lifecycle.
- 판정 **ABSENT**. 실행 시 최신 버전 프리픽스(현 `/v429` 다음) 아래 신설·`index.php` 공개 bypass 목록 및 `routes.php` 등록 규약 준수(신규 실배선 `/api` 접두 필수·[[reference_api_prefix_routing]]).

## §30 Database Constraint
Immutable Roadmap History · Capability Version Integrity · Investment Audit Trail · Lifecycle Consistency · Tenant Isolation.
- Immutable/Audit Trail = `SecurityAudit::verify` 해시체인 재사용(신규 체인 금지). Tenant Isolation = `Db.php` 격리 술어 재사용. 나머지 제약 테이블 부재 → 순신설.

## §31 Index
Capability · Technology · Version · Lifecycle · Roadmap · Snapshot. — §30 테이블 종속(테이블 부재 시 인덱스 정의 대상 없음). 테넌트 컬럼 선도키 권장.

## §32 성능 요구사항
Roadmap Query ≤2초 · Analytics Refresh ≤30초 · Capability Comparison ≤5초 · Lifecycle Validation ≤10초 · Availability ≥99.999%. — 벤치 대상 미존재(엔티티 신설 후 측정).

## §33 테스트
Unit/Integration/Performance/Security/Compliance/Regression 매트릭스(SPEC §33). — 순신설. 회귀는 Authorization/Governance/Planning/Compliance/Operations 무후퇴 검증.

## §34 Completion Gate
27개 구성요소 구축 + Performance Benchmark 통과 + Roadmap Validation 통과 + Regression 100%.
- **현재 게이트 미충족**(전 구성요소 ABSENT/PARTIAL·코드 0). BLOCKED_PREREQUISITE=선행 Part1~3-26 인증.

## 종합 판정
전 메커니즘 **ABSENT**(순신설) — 단 Immutable/Isolation은 기존 `SecurityAudit`·`Db` 재사용, API/Guard/Lint는 기존 `index.php` RBAC·CI 파이프라인 확장. 코드 변경 0. 실행 불가(선행 인증 종속).
