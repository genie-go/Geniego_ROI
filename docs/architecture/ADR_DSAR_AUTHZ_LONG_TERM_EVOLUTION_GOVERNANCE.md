# ADR — Enterprise Authorization Long-Term Evolution Governance (Part 3-27)

> **거버넌스 상태**: 설계 결정 기록(ADR) · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-21).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_27_LONG_TERM_EVOLUTION_ROADMAP_SPEC.md`(canonical v1.0).
> Ground-Truth: `DSAR_APPROVAL_LTER_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_LTER_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②).

## 컨텍스트
Part 3-27은 플랫폼의 10년+ 진화를 규율하는 Evolution Governance Framework를 규정한다. 본 ADR은 그 설계 결정과 현행 substrate 대비 판정을 기록한다. **어떤 코드도 추가하지 않는다**(설계 명세 트랙).

## 결정 (Decision)
- **D-1 (greenfield 선언)**: 형식 Evolution Governance(Registry/Roadmap/Capability/Planner/Lifecycle 상태머신/Drift/Reconciliation/Analytics)는 순신설한다. 백엔드 grep 결과 형식 거버넌스 엔티티 0건.
- **D-2 (비형식 substrate 재사용, 발명 금지)**: 아래 실존 비형식 자산을 **정본 참조**로 삼되 확장한다(중복 엔진 신설 금지).
  - Version Lifecycle/Deprecation → API 버전 라우팅(`backend/src/routes.php`·`/v377`…`/v429` 병렬 유지) = 비형식 lifecycle. 형식 상태(Preview/Beta/GA/LTS/Maintenance/Deprecated/Retired) 부재.
  - Migration/Version 무결성 → `schema_migrations`(`backend/src/Db.php`) 단조 버전 락.
  - Dependency 목록 → `composer.json`·`package.json`(목록만·lifecycle 거버넌스 아님).
  - Technical Debt 로그 → `NEXT_SESSION.md`·`docs/`(비형식·수동).
- **D-3 (BLOCKED_PREREQUISITE)**: LTER 실행은 Part1~3-26의 실행 인증에 종속. 현재 전부 NOT_CERTIFIED → LTER는 설계까지만 가능, 실행은 선행 인증 후 별도 승인세션.
- **D-4 (Immutable History·Tenant Isolation)**: Roadmap/Investment/Certification 이력은 append-only + 테넌트 격리(`Db.php` 격리 술어 재사용). 유일 실 append-only 해시체인 정본=`SecurityAudit::verify`([[reference_menu_audit_log_not_tamper_evident]] 정합 — 다른 해시체인은 장식).
- **D-5 (무후퇴)**: 기존 API 버전 병렬 유지 정책(구버전 stub 보존)은 Deprecation Manager 형식화 시에도 backward compatibility 원칙으로 보존.

## KEEP_SEPARATE (오흡수 금지·동음이의 위험)
- 마케팅 "roadmap/pipeline"(AutoCampaign/Journey/Decisioning) ≠ Evolution Roadmap/Innovation Pipeline.
- ModelMonitor drift ≠ Roadmap/Architecture Drift. Reconciliation(PgSettlement/Connectors) ≠ Roadmap Reconciliation.
- Risk churn(CustomerAI) ≠ Evolution Risk. schema_migrations checksum ≠ Roadmap Version Integrity(장식 아님·단조 락은 실재하나 거버넌스 범위 밖).

## 결과 (Consequences)
- 전 엔티티 판정 = ABSENT(순신설) 또는 PARTIAL-informal(비형식 substrate 존재). 코드 0.
- 실행 순서: 선행 Part 인증 → Evolution Registry 신설 → Lifecycle/Deprecation 형식화(기존 버전 라우팅 승격) → Roadmap/Capability/Analytics → Drift/Reconciliation.
