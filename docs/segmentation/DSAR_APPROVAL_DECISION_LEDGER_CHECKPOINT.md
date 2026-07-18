# DSAR — Ledger Checkpoint (06-A-03-02-03-01)

> EPIC 06-A-03-02-03-01 Decision Integrity/Immutable Ledger · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

**LEDGER_CHECKPOINT(§21)** 필수 필드:
- checkpoint id
- decision ledger id / partition id
- checkpoint sequence
- first included sequence / last included sequence
- entry count
- previous checkpoint id
- checkpoint digest foundation
- checkpoint policy version
- generated_at / generated_by
- verification status
- status
- evidence

원칙: **★Checkpoint 는 Entry 대체가 아님** · 기존 Entry 수정/삭제 금지(Checkpoint 는 구간 봉인 요약이지 원장 로우를 대체·압축·삭제하지 않는다).

## 2. 기존 구현 대조

- **범용 Checkpoint 부재.** §GROUND_TRUTH: "Immutable Ledger/Entry/Sequence/Head-CAS/Partition/Checkpoint/… = **ABSENT**" · EXISTING_IMPLEMENTATION 대조표 "Ledger Partition·Checkpoint | ABSENT | no hits".
- 유일 실 무결성 자산 `SecurityAudit.php`(security_audit_log `:48-52`)의 검증은 **전체 체인 재계산**(verify `:56-68` hash_equals+prev_hash 이중검증)뿐 — 구간 봉인(Checkpoint)으로 재검증 범위를 잘라내는 계층이 없다. `lastHash`(`:35-41` ORDER BY id DESC)는 Head 조회일 뿐 Checkpoint sequence/digest 산출과 무관.
- `schema_migrations.checksum`(`Migrate.php:50,63-64`)은 저장만 하고 비교 미실행 → Checkpoint 오인 금지(장식).
- 선행 §3.1 Decision Core **ABSENT**(`approval_decision` 0 · 승인=in-place UPDATE `Mapping.php:285-289,327`) → Checkpoint 가 봉인할 불변 Entry 구간 자체가 존재하지 않는다.

## 3. 판정
- Verdict: **ABSENT** (선행 부재 의존 → **BLOCKED_PREREQUISITE**)
- 선행 의존: §3.1 Decision Core ABSENT · IMMUTABLE_LEDGER(§15)/LEDGER_ENTRY(§17)/LEDGER_SEQUENCE(§19)/LEDGER_HEAD(§20) ABSENT → 봉인 대상(Entry/Sequence/Head) 부재
- cover: **0**

## 4. 확장/구현 방향 (설계)

- **재사용 substrate**: SHA-256(SecurityAudit `:27` · MediaHost `:93` · Migrate `:50`) → checkpoint digest foundation 계산에 재사용 · 서버UTC(`Db.php:438`·`SecurityAudit.php:24`) → generated_at.
- **순신규**: Checkpoint 는 `[first included sequence, last included sequence]` 구간의 Entry digest 를 누적 봉인한 요약 로우로 신설한다. previous checkpoint id 로 Checkpoint 자체도 체인(SecurityAudit prev_hash 패턴 확장)하여 Checkpoint 위조 시 상위 봉인 불일치.
- **무후퇴 불변**: Checkpoint 는 Entry 를 **삭제/압축하지 않는다** — 원장 로우는 그대로 두고 검증 시작점만 최근 Checkpoint 로 당긴다(전체 재계산 O(N) → 구간 O(k)). SecurityAudit 전체체인 재계산 방식은 유지하되 Checkpoint 를 그 위 최적화 계층으로 얹는다.
- **선행 요건**: Decision Core(불변 Decision Record) + IMMUTABLE_LEDGER + LEDGER_SEQUENCE(단조·gap 미은폐) 신설이 선행. 그 전엔 Checkpoint 는 봉인 대상이 없어 공회전(BLOCKED_PREREQUISITE).
- **실위험 상충**: `media_gc_cron.php:35,43` 90일 물리 DELETE 는 Checkpoint 가 봉인한 구간의 Entry 를 사후 제거하여 verification status 를 붕괴시킬 수 있음 → Checkpoint 도입 시 Legal Hold/Retention 예외로 봉인 구간 물리삭제 차단 필요.

관련: [[DSAR_APPROVAL_DECISION_LEDGER_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_DECISION_INTEGRITY_CORE_IMMUTABLE_LEDGER]].
