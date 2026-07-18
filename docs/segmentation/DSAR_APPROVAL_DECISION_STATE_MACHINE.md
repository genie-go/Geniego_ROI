# DSAR — Approval Decision State Machine (06-A-03-02-01)

> EPIC 06-A-03-02-01 Decision Processing Core · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

`§27 STATE_MACHINE` — STATE(원문 전사):

`DRAFT` · `RECEIVED` · `VALIDATION_PENDING` · `VALIDATING` · `VALID` · `VALID_WITH_WARNINGS` · `INVALID` · `COMMIT_PENDING` · `COMMITTING` · `COMMITTED` · `COMMITTED_WITH_WARNINGS` · `REJECTED_BY_SYSTEM` · `RETRY_PENDING` · `RECOVERY_PENDING` · `CONFLICT` · `SUPERSEDED_REFERENCE` · `CANCELLED` · `FAILED` · `ARCHIVED`.

Terminal(6): `COMMITTED` · `COMMITTED_WITH_WARNINGS` · `REJECTED_BY_SYSTEM` · `CANCELLED` · `FAILED` · `ARCHIVED`.

## 2. 기존 구현 대조

- **암묵 2~3상태만 존재**: 실 구현은 `pending → approved | rejected`의 비형식 status 컬럼 전이뿐이다. 19개 형식 상태 중 결정 처리 생애(RECEIVED→VALIDATION_PENDING→VALIDATING→VALID→COMMIT_PENDING→COMMITTING→COMMITTED) 중간 상태가 전무하다.
- `AdminGrowth::approvalDecide`(:1321) enum `['approved','rejected']` 2종 화이트리스트 · 단일 UPDATE status/decided_by(:1330) · 이미처리 409(:1327). → pending에서 곧바로 terminal-유사 값으로 **직접 UPDATE**, 중간 상태 없음.
- `Alerting::decideAction`(:594) 단일 UPDATE — `approve` 아니면 rejected. 집행은 별도 `executeAction`(:601-665)에서 :631 pause + :653 UPDATE로 **비원자** 진행 → COMMIT_PENDING/COMMITTING/COMMITTED 구분 없음.
- `Catalog::approveQueue`(:2397) bulk UPDATE status='queued' + processWritebackQueue(:2404) — 승인=큐잉 상태 flip, 형식 상태기계 아님.
- `AgencyPortal.php:20,80,381,400` — 하드코딩 status flip(§3.5 Sequential ABSENT의 근거). 이진상태.
- **시스템 거부/재시도/복구/충돌/상위대체 상태 부재**: `REJECTED_BY_SYSTEM`·`RETRY_PENDING`·`RECOVERY_PENDING`·`CONFLICT`·`SUPERSEDED_REFERENCE`는 사용자 rejected와 구분되지 않으며 대응 상태가 없다.
- **비원자성**: `Mapping::approve` read(:273)→UPDATE(:288) 트랜잭션 없음(TOCTOU) → COMMITTING↔COMMITTED 사이 원자 전이 개념 부재.

## 3. 판정

- Verdict: **PARTIAL** — 암묵 `pending → approved/rejected` status 전이만, 형식 상태기계(19 상태·6 terminal·전이 불변성) 없음.
- 선행 의존: §25 Validation Result(ABSENT)·§29 Transition Definition(ABSENT)·§28 Event(ABSENT). VALIDATION_*/COMMIT_* 상태군은 검증 파이프라인·전이 정의가 선행해야 존재.
- cover: pending/approved/rejected 3상태 근사(비형식). 나머지 16 상태 = 0.

## 4. 확장/구현 방향 (설계)

- **직접 UPDATE → 상태기계 전이**: `AdminGrowth`(:1330)·`Alerting`(:594)·`Catalog`(:2397)의 `status=` 직접 UPDATE를 Transition Definition(§29) 기반 가드된 전이로 대체. 각 전이는 source/target·guard·lock/snapshot/audit/outbox 요구를 명시.
- **사용자 거부 vs 시스템 거부 분리**: 현행 rejected가 뒤섞은 `REJECTED_BY_SYSTEM`(검증 실패)와 사용자 REJECT를 상태로 구분(§27 terminal 정의 준수).
- **원자 커밋 상태**: `Mapping` TOCTOU(:273→:288) 제거하고 COMMIT_PENDING→COMMITTING→COMMITTED를 Lock/Fencing(§41/§43) 하 원자 전이로 구성.
- **재사용 자산**: omni_outbox claim/lease/SKIP LOCKED(`Omnichannel.php:390-448`)를 RETRY_PENDING/RECOVERY_PENDING 처리의 Lock-Lease 설계 원형으로 참조(KEEP_SEPARATE·마케팅 아웃박스와 도메인 분리).
- 실 구현 = §28/§29 신설 후 별도 승인 세션. 코드 변경 0.

관련: [[DSAR_APPROVAL_DECISION_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_DECISION_PROCESSING_CORE_GOVERNANCE]].
