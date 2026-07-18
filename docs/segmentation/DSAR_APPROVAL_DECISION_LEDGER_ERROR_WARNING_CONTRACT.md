# DSAR — Ledger Error / Warning Contract (06-A-03-02-03-01)

> EPIC 06-A-03-02-03-01 Decision Integrity/Immutable Ledger · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§59 `LEDGER_ERROR_CONTRACT` — **Error 40코드** (범위 앵커: `INTEGRITY_REGISTRY_NOT_FOUND` … `LEDGER_RUNTIME_BLOCKED`).
§60 `LEDGER_WARNING_CONTRACT` — **Warning 13코드**.

> 규율: 40/13 전체 코드 문자열의 축자 나열은 §59/§60 **원문 정본**에 있으며, 여기서는 날조 없이 **앵커 코드 + §CONTRACTS 엔티티로부터 파생되는 오류군(family)**만 전사한다.

### Error 40 — 오류군 (§CONTRACTS 엔티티 앵커)

1. **Registry/Definition/Version/Profile 부재군** — `INTEGRITY_REGISTRY_NOT_FOUND`(앵커)·Definition/Version/Profile Not Found·Version Not Active(§7~§11).
2. **Append-only 위반군** — Update/Delete/Upsert/Replace/Patch/Truncate/Resequence Attempt·Generic CRUD·Overwrite Payload(§24/§26/§27).
3. **Mandatory Reference 누락군** — Required Reference Missing·Invalid Reference Type·Cross-Tenant Link Blocked(§18/§23).
4. **Sequence 오류군** — Duplicate Sequence·Client Sequence Rejected·Sequence Reuse/Renumbering Blocked·Sequence Gap Detected(§19/§46).
5. **Head 오류군** — Head Version Mismatch·Head Sequence Conflict·Head Overwrite Blocked·Fencing Token Rejected(§20/§43/§44).
6. **Idempotency 오류군** — Idempotency Conflict(same key, different request)·Idempotency Key Missing(§40).
7. **Lock/Lease 오류군** — Lock Acquisition Failed·Lease Expired·Concurrent Append Rejected(§41/§42).
8. **Transaction/Outbox 오류군** — Transaction Boundary Violation·Ledger Append Not Atomic·Outbox↔Ledger Mismatch(§38/§39).
9. **Duplicate/Conflict 오류군** — Duplicate Entry·Duplicate Decision Commit Entry·Order Conflict·Previous Entry Conflict(§45/§47).
10. **Correction/Supersession 오류군** — Original Mutation Blocked·Correction Target Conflict·Circular Correction·Supersession Target Conflict(§29~§32).
11. **Retention/Legal Hold 오류군** — Retention Row Delete Blocked·Legal Hold Active(Delete Prohibited)·Sequence/Metadata Removal Blocked(§36/§37).
12. **Completeness/Consistency 오류군** — Completeness Validation Failed·Consistency Validation Failed·Gap Detected·Reconciliation Required(§49/§50/§54).
13. **Runtime 종결군** — Static Lint Blocked·`LEDGER_RUNTIME_BLOCKED`(앵커, 런타임 가드 차단, §57/§58).

### Warning 13 — 경고군

- Checkpoint 미생성 임박·Verification 주기 경과·Reconciliation Mismatch(비차단)·Simulation-only Result·Recorded Time 역전 근접·Retention 기한 임박·Legal Hold 만료 임박·Migration Incomplete Source·Head 재조회 권고·Manual Review 권고·Gap 근접·Cache Invalidation 권고 등 **비차단 경고 13종**(§60 원문).

## 2. 기존 구현 대조

- **표준 Error/Warning 계약 부재 → 미구현(ABSENT).** 원장 무결성에 통일된 오류 코드 체계 없음.
- 실재 반응은 산발적·비표준:
  - in-place status UPDATE(`Mapping.php:285-289,327`·`JourneyBuilder.php:1192`)는 Append-only 위반(오류군2)을 **오류가 아니라 정상 경로**로 처리 — 계약 위반의 원형(정직판정).
  - Head Version Mismatch/Idempotency Conflict(오류군5/6) 대응 코드 **부재** — Head·Idempotency Key 자체가 ABSENT이므로 발생 불가.
  - Retention Row Delete/Legal Hold Active(오류군11) 코드 **부재** — `media_gc_cron.php:35,43` 물리삭제가 오류 없이 실행됨(차단 코드 없음). `legal_hold` 0.
  - Reconciliation Required·Gap Detected(오류군12) 코드 부재 — `SecurityAudit::verify()`(`:56-68`)는 연속체인 실패만 boolean 반환·표준 에러코드 아님.
- 부분 대비: `MediaHost`는 Invalid MIME를 예외로 거부(`:81-91`)하나 표준 코드가 아니라 핸들러 로컬 예외.

## 3. 판정

- Verdict: **ABSENT** (표준 Error/Warning 계약 미구현)
- 선행 의존: 오류군 대부분이 부재 엔티티(Ledger/Entry/Head/Sequence/Idempotency/Lock/Retention/Legal Hold/Reconciliation)를 참조 → **BLOCKED_PREREQUISITE**. 단 오류군2(Append-only 위반)·오류군11(Retention/Legal Hold)은 **현행 in-place UPDATE·media_gc 물리삭제를 지금 코드에서도 지목 가능한 실 결함**.
- cover: **0** (핸들러 로컬 예외/무음 경로만 산발).

## 4. 확장/구현 방향 (설계)

- 순신규 표준 Error 40 / Warning 13 코드 테이블 — 각 코드를 §56 Critical Gap·§57 Lint·§58 Runtime Guard·§54 Reconciliation과 1:1 매핑(오류=차단, 경고=진행+로그).
- **최우선 제거**:
  1. Append-only 위반군: in-place status UPDATE(`Mapping.php:288`)를 `LEDGER_UPDATE_ATTEMPT_BLOCKED`/`OVERWRITE_PAYLOAD_BLOCKED`로 명시 거부.
  2. Retention/Legal Hold군: `media_gc_cron.php:35,43` 물리삭제를 `RETENTION_ROW_DELETE_BLOCKED`/`LEGAL_HOLD_ACTIVE`로 차단(§36 논리삭제 유도).
- Golden Rule(Extend): 기존 `MediaHost` 예외 거부·`SecurityAudit::verify` boolean 결과를 표준 코드로 승격(예: verify 실패→`CONSISTENCY_VALIDATION_FAILED`).
- **Retention/Legal Hold 코드는 §36/§37 신설과 동시 도입**(현재 부재로 사문화 방지). Idempotency/Head Version 코드는 §40/§20 신설과 동시.
- 무후퇴: 기존 MediaHost 예외 거부·SecurityAudit verify 동작은 표준 코드로 승격하되 거부/검증 동작 자체는 회귀 없이 보존(§68).

관련: [[DSAR_APPROVAL_DECISION_LEDGER_API_CONTRACT]] · [[DSAR_APPROVAL_DECISION_LEDGER_CRITICAL_GAP_POLICY]] · [[ADR_DSAR_DECISION_INTEGRITY_CORE_IMMUTABLE_LEDGER]].
