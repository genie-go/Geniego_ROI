# DSAR — Rollback Recovery Engine (Part 3-20 §17)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_20_SELF_HEALING_CONTINUOUS_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_SELF_HEALING_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_HEALING_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_HEALING_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 (SPEC §17 — Rollback Recovery Engine)

Rollback Recovery Engine은 인가 상태가 이탈·손상했을 때 **직전 known-good 지점으로 되돌리는** 복원 집행기다. 5종 롤백 범위를 다루며, 각 롤백은 §18 스냅샷을 목표 기준선으로 삼고 §16 승인 게이트를 통과한다.

| 롤백 대상 | 정의 | 복원 계약 |
|-----------|------|-----------|
| Policy Rollback | 정책 정의를 이전 baseline 버전으로 복원 | 스냅샷 기준·전/후 해시 감사·승인 필수 |
| Configuration Rollback | authz config를 known-good로 복원 | 비파괴 재적용·근거 기록 |
| Snapshot Rollback | §18 point-in-time 상태로 전면 복원 | System State 앵커 대조·부분복원 방지 |
| Region Rollback | 리전 스코프 인가 상태 복원 | 리전 격리 유지·교차오염 금지 |
| Tenant Rollback | 테넌트 스코프 인가 상태 복원 | 테넌트 격리 절대·타 테넌트 무영향 |

핵심 원칙: **롤백은 authz 상태(정책/config/snapshot) 복원이지 스키마 DDL 복원이 아니다**. 모든 롤백은 목표 스냅샷을 기준선으로 전/후를 감사에 남기고, 위험 등급은 승인 게이트를 통과한다(Fail-closed).

## 2. Substrate 매핑

| SPEC 요소 | 현행 substrate | 판정 |
|-----------|----------------|------|
| authz Policy/Config/Snapshot/Region/Tenant 롤백 엔진 | 없음 (grep 0) | **ABSENT** |
| 스키마 마이그레이션 롤백(참조) | 마이그레이터 down/rollback 표면(`Migrate.php:310`·`:421-426`)·CLI(`migrate.php:34-38`) | **PARTIAL** — 물리 스키마만·authz state 아님 |
| 롤백 결정 무결성(참조) | SecurityAudit append-only(`SecurityAudit.php:14-68`)·verify(`SecurityAudit.php:56-68`) | 재사용(전/후·근거 앵커) |

## 3. 설계 계약

- **판정=PARTIAL**: 현행 롤백은 스키마 마이그레이션 계층(`Migrate.php:310`·`:421-426`·`migrate.php:34-38`)에만 존재한다. 이는 테이블/DDL 복원으로 **authz 정책/config/snapshot 상태 복원이 아니다**. 5종 authz 롤백은 이 표면을 흡수하지 않고 **별도로 순신설**한다.
- **스냅샷 기준 복원**: 모든 롤백은 §18 스냅샷 System State를 목표 기준선으로 삼아 전면 복원하고, 부분복원(§18 앵커 불일치)을 금지한다.
- **격리 불변식**: Region/Tenant Rollback은 리전·테넌트 격리를 절대 위반하지 않으며, 롤백 범위가 다른 스코프로 새지 않도록 스코프 경계를 강제한다.
- 롤백 결정·전후 해시·목표 스냅샷 참조는 `SecurityAudit.php:14-68` 체인에 기록하고 `SecurityAudit.php:56-68` verify로 재현 가능하게 한다. 위험 등급은 §16 승인 게이트 통과 후에만 집행.

## 4. KEEP_SEPARATE (흡수 금지)

- ★**SQL/트랜잭션 롤백은 authz 상태 롤백이 아니다**: `TeamPermissions.php:618`·`AdminPlans.php:536`의 트랜잭션 rollback은 단일 DB 트랜잭션 원자성 보장으로, 정책/config/snapshot 상태 복원과 계층이 다르다. Rollback Recovery Engine에 통합하면 트랜잭션 제어와 거버넌스 복원이 뒤섞인다. 별도 유지.
- **스키마 down 마이그레이션**(`Migrate.php:310`·`:421-426`)은 물리 DDL 롤백으로 참조 substrate일 뿐, authz state 롤백 로직으로 재해석 금지.

## 5. 판정

**PARTIAL** — authz Policy/Config/Snapshot/Region/Tenant 롤백 엔진은 grep 0으로 부재하며, 현존 롤백은 스키마 마이그레이션 계층(`Migrate.php:310`·`:421-426`·`migrate.php:34-38`)뿐으로 authz 상태 복원이 아니다. 5종 authz 롤백은 스냅샷 기준·격리 강제로 **순신설**하고, 무결성만 SecurityAudit(`SecurityAudit.php:14-68`·verify `:56-68`)을 재사용한다. ★SQL/트랜잭션 롤백(`TeamPermissions.php:618`·`AdminPlans.php:536`)은 엄격 분리. 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE(선행 §16 승인·§18 스냅샷 계약 부재).
