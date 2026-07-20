# DSAR — Rollback Readiness Validator (Part 3-25 §14)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_25_FINAL_INTEGRATION_OPERATIONAL_READINESS_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_OPERATIONAL_READINESS_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_OPSREADY_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_OPSREADY_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 (SPEC §14)
Rollback Readiness Validator는 릴리스가 **되돌릴 수 있음(reversibility)**을 배포 전 사전 검증하는 설계 계약이다. 축: **Snapshot Availability**(직전 정상 스냅샷 존재·복원가능), **Rollback Script**(실행가능한 되돌림 절차), **Rollback Approval**(되돌림 승인 게이트), **Rollback Window**(허용 시간창·데이터 발산 한계), **Rollback Validation**(되돌림 후 정상성 재검증). 이는 **릴리스/배포 롤백**(전 버전으로의 서비스 복귀)이지 트랜잭션·스키마 rollback이 아니며, 판정은 READY/BLOCKED로 산출된다.

## 2. Substrate 매핑
| SPEC 요소 | 현행 substrate | 상태 | 근거 |
|---|---|---|---|
| Snapshot/되돌림 절차(스키마) | 마이그레이션 롤백 진입점 | PARTIAL(스키마限) | `migrate.php:34-38` |
| Rollback Script(스키마 down) | 스키마 되돌림 실행 | PARTIAL(스키마限) | `migrate.php:94-133` |
| Release Version 식별 | 헬스/버전 노출 | PARTIAL | `Health.php:56-70` |
| Rollback Approval | maker-checker 승인 | PARTIAL(도메인 승인) | `Mapping.php:238-291` |
| Snapshot Availability(릴리스 아티팩트) | — | ABSENT(grep 0) | 순신설 |
| Rollback Window/Validation | — | ABSENT(grep 0) | 순신설 |

## 3. 설계 계약
- **Snapshot/Script**: 현행 스키마 마이그레이션 롤백(`migrate.php:34-38` 진입, `:94-133` 실행)을 **릴리스/배포 롤백 readiness**로 확장 계약한다. 단 현행은 DB 스키마 down-migration이며, 릴리스 아티팩트 스냅샷 가용성·이전 dist 복귀 절차는 순신설 배선을 요한다.
- **Version 식별**: 되돌림 대상 이전 정상 버전 식별은 헬스/버전 노출(`Health.php:56-70`)을 substrate로 활용하도록 계약한다.
- **Approval**: 롤백 승인 게이트는 maker-checker(`Mapping.php:238-291`)를 재사용하되 릴리스 롤백 승인으로의 확장은 순신설.
- **Window/Validation**: 롤백 허용 시간창·되돌림 후 정상성 재검증은 **grep 0**. 순신설 설계 명세로만 존재. 코드 변경 0.

## 4. KEEP_SEPARATE
- ★**스키마/트랜잭션 rollback**(`Migrate.php:69`·`:162-166`·`:303-334`)은 DB 마이그레이션·트랜잭션 되돌림이지 **릴리스/배포 롤백이 아니다**. Snapshot Availability·release 복귀와 동일시 금지 — KEEP_SEPARATE.
- maker-checker(`Mapping.php:238-291`)는 도메인 매핑 승인이지 롤백 승인 엔진이 아니다. 재사용 substrate일 뿐 동일시 금지.

## 5. 판정
**PARTIAL**. 스키마 마이그레이션 롤백(`migrate.php:34-38`·`:94-133`)·버전 식별(`Health.php:56-70`)·도메인 승인(`Mapping.php:238-291`)을 릴리스/배포 Rollback Readiness로 확장하는 substrate는 존재하나, Snapshot Availability(릴리스 아티팩트)·Rollback Window·Rollback Validation은 **순신설(grep 0)**이다. 스키마/txn rollback(`Migrate.php:69`·`:162-166`·`:303-334`)=release rollback 아님(KEEP_SEPARATE). 순신설 · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE.
