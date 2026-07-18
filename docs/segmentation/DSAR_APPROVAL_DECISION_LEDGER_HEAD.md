# DSAR — Ledger Head (06-A-03-02-03-01)

> EPIC 06-A-03-02-03-01 Decision Integrity/Immutable Ledger · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§20 LEDGER_HEAD 필수 필드 (원문 전사):
- `head id` · `decision ledger/partition id` · `tenant id`
- `current entry id` · `current ledger/partition sequence`
- `current entry digest foundation`
- `previous head id` · `head version` · `fencing token`
- `updated by transaction id` · `updated at`
- `status` · `evidence`

§20 갱신 규율 (원문 전사): `Expected Head Version` · `Expected Current Sequence` · **CAS(Compare-And-Swap)** · `Lock/Transactional Sequence Allocation` · `Fencing` · `Idempotency` · `Unique Constraint` · `Retry with Full Revalidation`.

## 2. 기존 구현 대조

- **Ledger Head(CAS) 부재.** 원장 tip을 나타내는 `current entry id`/`head version`/`fencing token`/`updated by transaction id` 구조 0.
- 가장 근접한 신호 = `SecurityAudit.php` lastHash(`:35-41`)이지만 이는 **매 조회 `ORDER BY id DESC` 즉석 계산**일 뿐 **CAS도 head version도 fencing token도 없다**. 동시 INSERT가 같은 prev를 읽으면 체인 분기 가능(이론창).
- Expected Version/Expected Sequence 비교, Fencing, Idempotency-key → **no hits**. Optimistic Version(version 컬럼/CAS) 전무.
- 승인 결정은 head 개념 없이 status를 in-place UPDATE(`Mapping.php:285-289,327`) — 병행 갱신 보호 부재.
- 재사용 가능 primitive는 존재하나 head 갱신에 미적용: 트랜잭션 PDO(`Omnichannel.php:404-415`) · SKIP LOCKED 행클레임(`:405,429-441`) · UNIQUE(`Paddle.php:108`). named lock(GET_LOCK)은 부재.

## 3. 판정

- Verdict: **ABSENT** (SecurityAudit lastHash `:35-41` = `ORDER BY id DESC`, CAS 없음)
- 선행 의존: Head는 §15 Ledger·§16 Partition tip이자 §19 Sequence 발급의 원자 경계 — 상위 Ledger/Partition ABSENT, §3.1 Decision Core ABSENT.
- cover: **0** (head row/CAS/fencing 0). SecurityAudit 최신값 조회는 CAS 없는 read라 §20 계약 미충족.

## 4. 확장/구현 방향 (설계)

- 순신규 `ledger_head`(Ledger/Partition당 1행) — `current entry id`·`head version`·`fencing token`·`updated by transaction id`. 갱신은 **CAS(Expected Head Version + Expected Current Sequence 일치 시에만 교체)** + Unique Constraint + Retry with Full Revalidation(§20).
- 재사용 substrate(발명 아닌 조립): 트랜잭션 PDO(`Omnichannel.php:404-415`) 안에서 SKIP LOCKED(`:405,429-441`)로 Sequence Allocation, `head version` CAS로 병행 갱신 보호. `current entry digest foundation` = SHA-256(SecurityAudit `:27`·MediaHost `:93`·Migrate `:50`) 재사용. `updated at` = 서버UTC(`Db.php:438`·`SecurityAudit.php:24`).
- ★현행 SecurityAudit의 `ORDER BY id DESC` lastHash(`:35-41`)를 Head CAS로 승격 — 동시 INSERT 체인분기 이론창(§67 실위험 5)을 닫는 핵심. Fencing token으로 낮은 토큰 지연 커밋 차단(§43).
- named lock(GET_LOCK) 부재 → 트랜잭션 + 행 잠금(FOR UPDATE) + head version CAS 조합으로 advisory lock 대체. Idempotency-key(§40)는 순신규(현재 인프라 0).
- 선행 조립: Decision Core(§3.1) → Ledger/Partition(§15/16) → 본 Head + Sequence(§19). 별도 승인세션(RP-002).
- ★Head=강한 일관성(§65 Cache≠SoT) — 캐시 금지 대상.

관련: [[DSAR_APPROVAL_DECISION_LEDGER_SEQUENCE]] · [[DSAR_APPROVAL_DECISION_LEDGER_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_DECISION_INTEGRITY_CORE_IMMUTABLE_LEDGER]].
