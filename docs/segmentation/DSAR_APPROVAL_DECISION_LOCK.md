# DSAR — Lock (06-A-03-02-01)

> EPIC 06-A-03-02-01 Decision Processing Core · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

### LOCK (§41)

필드: `lock_id`·`tenant_id`·`slot id`·`instance/step instance id`·`lock type`·`owner process/worker/actor id`·`lock token hash`·`fencing token`·`acquired/expires/released_at`·`version`·`status`·`evidence`.

LOCK TYPE: `DECISION_VALIDATION`·`DECISION_COMMIT`·`DECISION_CORRECTION_REFERENCE`·`DECISION_RECOVERY`·`DECISION_RECONCILIATION`·`SYSTEM`.

## 2. 기존 구현 대조

### 결정 도메인 = ABSENT
- 승인 4핸들러에 **명시적 Lock 엔티티가 없다**. 동시성 제어는 다음뿐:
  - `Mapping::approve`(`Mapping.php:238-293`) — **트랜잭션 없음(TOCTOU)**: approvals_json read(`:273`) → append → UPDATE(`:288`) 사이 잠금 부재. 두 승인자가 동시 진입 시 정족수 계산이 경합.
  - `Catalog::approveQueue`(`Catalog.php:2383-2407`) — WHERE status 조건부 UPDATE(CAS-lite)로 이중 처리 일부 억제하나, lock_id·owner·fencing token·expiry 없음.
  - `AdminGrowth`/`Alerting` — lock 개념 없음. 상태가드 409/UPDATE 뿐.
- lock_id·lock token hash·lock type enum·expiry 기반 lease = **no hits** (결정 도메인).

### 인접 자산 = omni_outbox (KEEP_SEPARATE 참조 원형)
- `Omnichannel::claimBatch`(`Omnichannel.php:390-448`)는 **워커 클레임 락**을 구현: MySQL `SELECT ... FOR UPDATE SKIP LOCKED`(`:405`) 로 행 잠금 후 `claim_id` 마킹(`:410-411`), SQLite 는 조건부 UPDATE 폴백(`:426-448`). 15분 stale 리스 회수(`:394-399`).
- 이는 **아웃박스 배치 소비 락**이지 **결정 Commit 락**이 아니다. slot·fencing token·lock type enum 이 없고, 목적(메시지 발송 중복 방지)이 다르다.

## 3. 판정

- Verdict: **ABSENT** (결정 도메인) / omni_outbox = **KEEP_SEPARATE** (설계 원형 참조).
- 선행 의존: §13 SLOT(lock 은 Slot 단위 점유)·§43 FENCING_TOKEN(lock 은 fencing token 발급 결속)·§33 COMMIT(DECISION_COMMIT lock). Slot/Fencing 부재로 결정 락 성립 불가 → **BLOCKED_PREREQUISITE**.
- cover: **0** (Mapping 은 오히려 TOCTOU 취약·Catalog 는 CAS-lite 부분 억제일 뿐 락 아님).

## 4. 확장/구현 방향 (설계)

- **패턴 재사용(KEEP_SEPARATE)**: `Omnichannel::claimBatch` 의 `FOR UPDATE SKIP LOCKED` + claim 마킹 + stale 리스 회수(`Omnichannel.php:390-448`) 를 **설계 원형으로 참조**하되, Decision Lock 은 **별도 엔티티**(slot·lock type·fencing token·expiry 필수). 아웃박스 락을 그대로 결정에 전용 금지(목적·키 상이).
- **TOCTOU 제거(실위험)**: `Mapping::approve` 의 무트랜잭션 read-append-UPDATE(`Mapping.php:273,288`)는 DECISION_COMMIT 락으로 감싸야 정족수 경합이 해소된다 — 현행 최우선 취약점.
- **Lock ↔ Fencing 결속**: §41 lock 은 §43 fencing token 을 발급하고, §48 Transaction Boundary 1)Lock 검증 → 2)Fencing 검증 순서를 강제. 실 구현 = 별도 승인 세션.

관련: [[DSAR_APPROVAL_DECISION_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_DECISION_PROCESSING_CORE_GOVERNANCE]].
