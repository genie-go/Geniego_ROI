# DSAR — EACCRL Governance Mechanisms (Part 3-42 §23~§32)

> **거버넌스 상태**: 실행 게이트/계약 설계 · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-21).
> 인용은 GT①②/ADR 등장분만(반날조).

## §23 Runtime Guard — 차단 대상
Unauthorized Asset Publication · Duplicate Canonical Asset · Invalid Version Promotion · Cross-Tenant Asset Exposure · Metadata Integrity Violation · Governance Policy Bypass.
- 판정 **PARTIAL**. 무단 발행 차단=admin 게이트·CHANGE_GATE·`index.php` RBAC. ★Duplicate Canonical Asset=중복금지 규율([[feedback_no_duplicate_features]]·착수 전 grep) 형식화. Cross-Tenant=`Db.php` 격리.

## §24 Static Lint — 탐지 대상
Missing Owner · Missing Metadata · Broken Reference · Duplicate Capability · Stale Documentation · Missing Review Date.
- **PARTIAL**. ★Duplicate Capability=중복금지 grep 규율·Broken Reference=[[name]] 링크 검사(메모리 패턴). pre-commit 확장.

## §25 Error Contract
CAPABILITY_REGISTRATION_FAILED · REFERENCE_PUBLICATION_FAILED · VERSION_PROMOTION_FAILED · METADATA_VALIDATION_FAILED · KNOWLEDGE_LINK_FAILED · SEMANTIC_INDEX_FAILED · BASELINE_GENERATION_FAILED. — 순신설.

## §26 Warning Contract
Documentation Aging · Capability Review Due · Reference Dependency Broken · Low Reuse Rate · Knowledge Quality Decreasing. — 순신설.

## §27 API (최소 8)
Register Capability · Query Reference Asset · Search Semantic Knowledge · Publish Library Asset · Compare Versions · Export Reference Package · Query Analytics · Validate Baseline.
- **ABSENT**(단 Search Semantic Knowledge=`gen_chatbot_knowledge.mjs` 파이프라인 확장). 최신 버전 프리픽스·`routes.php`+`index.php` bypass 규약(신규 실배선 `/api` 접두·[[reference_api_prefix_routing]]). Publish/Register=admin 게이트(requirePlan('admin')).

## §28 Database Constraint
Immutable Reference History · Version Integrity · Metadata Integrity · Knowledge Graph Integrity · Tenant Isolation · Baseline Integrity.
- Immutable/Version = git + `SecurityAudit::verify` 재사용(신규 체인 금지). Isolation = `Db.php`. Metadata/Baseline 무결성=버전+체인. 나머지 테이블 순신설.

## §29 Index
Capability · Pattern · API · Knowledge · Component · Snapshot. — §28 테이블 종속·테넌트 선도키 권장.

## §30 성능 요구사항
Semantic Search ≤2초 · Asset Publication ≤5초 · Version Comparison ≤3초 · Analytics Refresh ≤5초 · Availability ≥99.999%. — 벤치 대상 미존재(엔티티 신설 후 측정).

## §31 테스트
Unit/Integration(Next Generation Platform Vision·Autonomous Enterprise Governance·Validation Suite·Production Excellence·Knowledge Graph·Global Center of Excellence)/Performance(5M Knowledge Assets·500k Capabilities·2M Metadata·100k Concurrent Search)/Security(Unauthorized Asset Access·Reference Tampering·Metadata Injection·Cross-Tenant Repository Leakage·Semantic Search Abuse)/Compliance(ISO 27001·42001·ISO 30401·COBIT 2019·TOGAF)/Regression 매트릭스. 순신설.

## §32 Completion Gate
26 구성요소 구축 + Performance Benchmark 통과 + Enterprise Reference Library Validation 통과 + Regression 100%.
- **현재 게이트 미충족**(형식 통합 라이브러리 ABSENT/PARTIAL·코드 0). BLOCKED_PREREQUISITE=선행 Part1~3-41 인증.

## 종합 판정
전 메커니즘 **ABSENT-formal/PARTIAL** — Runtime Guard/Static Lint는 CHANGE_GATE/중복금지 규율/pre-commit/RBAC 확장, Immutable/Version은 git+`SecurityAudit` 재사용, Semantic Search는 `gen_chatbot_knowledge.mjs` 확장, Isolation은 `Db.php`. 코드 변경 0. 실행 불가(선행 인증 종속).
