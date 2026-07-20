# DSAR — Approval Recovery Index (Part 3-20 §32)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_20_SELF_HEALING_CONTINUOUS_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_SELF_HEALING_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_HEALING_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_HEALING_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약(SPEC) — APPROVAL_RECOVERY_INDEX

§32는 self-healing recovery 데이터의 조회 경로를 §33 성능 목표 내로 유지하기 위한 **인덱스 전략**을 규정한다.
Health Assessment 주기 조회, Recovery Plan 착수, 워크플로우 진행 추적, 스냅샷 baseline 대조, Governance Score
집계는 모두 대규모 이력 테이블에 대한 반복 스캔이므로, 다음 6개 인덱스 계열이 신설 테이블마다 요구된다.

| # | 인덱스 계열 | 목적(조회 패턴) |
|---|-------------|-----------------|
| I1 | Health Assessment | tenant×평가시각 최신순 조회(≤10초 목표 지지) |
| I2 | Recovery Plan | tenant×상태(pending/active)×우선순위 착수 조회 |
| I3 | Recovery Workflow | tenant×워크플로우ID×상태전이 진행 추적 |
| I4 | Recovery Action | tenant×워크플로우×액션순번 원자 집행 추적 |
| I5 | Snapshot | tenant×version×timestamp baseline 대조(before/after) |
| I6 | Governance Score | tenant×기간 집계·health refresh 지지 |

인덱스는 그 자체로 상태를 변경하지 않으며, 대상 테이블(§31)이 신설된 뒤에만 정의 가능하다.

## 2. Substrate 매핑

| SPEC 인덱스 | 현존 substrate | 상태 |
|-------------|----------------|------|
| I1~I6 recovery 테이블 인덱스 | recovery 전용 테이블 (없음) | ABSENT — grep 0 |
| 현 DB 스키마 관리 | app_setting KV(`Db.php:308`)·schema_migrations 트래킹(`Db.php:592`) | 무관(recovery 인덱스 대상 아님) |
| 인덱스/DDL 적용 경로 | 마이그레이션 러너(`Migrate.php:421-426`·`bin/migrate.php:34-38`) | 신설 인덱스의 적용 통로(현재 recovery DDL 없음) |
| 기존 무결성 저장 | SecurityAudit 해시체인(`SecurityAudit.php:14-68`) | 별개(감사 이력·recovery 인덱스 대상 아님) |

## 3. 설계 계약

- **판정=ABSENT**: recovery 전용 테이블이 전무(§31 판정)하므로 그 위의 인덱스도 정의 대상이 없다. I1~I6 전부 순신설.
- **§31 종속**: 인덱스는 대상 테이블(recovery_history·recovery_workflow·snapshot 등)이 §31에서 신설된 뒤에만
  선언 가능하다 — 본 §32는 그 테이블들의 조회 패턴을 §33 성능 목표에 맞춰 사전 규정하는 계약이다.
- **Tenant 선두 강제**: I1~I6 모든 인덱스는 `tenant_id`를 선도 컬럼으로 둔다. 미들웨어 격리(`index.php:610`)와
  정합해 크로스테넌트 스캔을 물리적으로 차단하고, 격리 필터가 인덱스를 타도록 보장한다.
- **적용 통로 정합**: 신설 인덱스 DDL은 마이그레이션 러너(`Migrate.php:421-426`)로만 적용하며, CLAUDE.md 규율상
  마이그레이션은 원격 서버에서만 실행(`bin/migrate.php:34-38` 대상 선택)되므로 운영/데모 양쪽 정합이 필수다.
- **append-only 이력 인덱싱**: Recovery History(I1·I3·I4)는 append-only 원장이므로 인덱스는 시간·상태 조회 최적화용
  이며, UPDATE 경합이 없어 커버링 인덱스 설계가 유리하다.

## 4. 판정

**ABSENT** (recovery 테이블·인덱스 전무·grep 0). 현 DB substrate는 app_setting KV(`Db.php:308`)·schema_migrations
트래킹(`Db.php:592`)뿐으로 self-healing 조회 대상이 없다. I1~I6 인덱스 계열은 §31 테이블 신설에 종속된 **순신설**
이며, 모든 인덱스는 tenant 선두(`index.php:610` 격리 정합)·마이그레이션 러너 경유 적용(`Migrate.php:421-426`·
`bin/migrate.php:34-38`)을 계약한다. 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE(§31 선행).
