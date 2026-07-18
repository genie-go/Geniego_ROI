# DSAR — Ledger Lock (06-A-03-02-03-01)

> EPIC 06-A-03-02-03-01 Decision Integrity/Immutable Ledger · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§41 LEDGER_LOCK

- **TYPE**: LEDGER_APPEND · PARTITION_APPEND · HEAD_UPDATE · CHECKPOINT_CREATION · CORRECTION_APPEND · RETENTION_ACTION · LEGAL_HOLD_ACTION · MIGRATION_APPEND · RECONCILIATION_REPAIR · CUSTOM.
- **필드**: lock id · tenant id · ledger/partition id · lock type · owner process/worker id · lock token digest foundation · fencing token · acquired/expires/released_at · version · status · evidence.

## 2. 기존 구현 대조

- 코드 기반 판정: **PARTIAL** — 행수준 낙관/비관 잠금(FOR UPDATE SKIP LOCKED) substrate 는 실재하나, **원장 스코프 named/advisory lock(§41 lock type·token·fencing) 은 부재**.
- 실존 substrate:
  - **행수준 비관적 잠금**: `Omnichannel.php:405` `SELECT id FROM omni_outbox ... FOR UPDATE SKIP LOCKED` — 다른 워커가 잠긴 행을 건너뛰는 배치 클레임. 폴백 조건부 UPDATE 클레임(`:429-441`)으로 SKIP LOCKED 미지원 드라이버 처리.
  - **소유권 마킹**: claim_id(`Omnichannel.php:392,410`)로 워커 소유행 식별 — lock owner 개념의 실사례(단 작업큐용).
  - 트랜잭션 경계 안에서 수행(`:404-415`).
- 부재:
  - **named/advisory lock(GET_LOCK) = 0**(EXISTING_IMPLEMENTATION §4 재확인) — 원장 append/head-update 를 직렬화할 이름있는 락 없음.
  - §41 **lock type(LEDGER_APPEND/HEAD_UPDATE/…)·lock token digest·fencing token·version** 컬럼/구조 = no hits.
  - 잠금 대상(Ledger/Partition/Head)이 부재(§15/§16/§20 ABSENT)하므로 잠글 원장 리소스가 없다.

## 3. 판정

- Verdict: **PARTIAL** (행수준 FOR UPDATE SKIP LOCKED substrate 실재 · 원장 named lock/token/fencing 부재)
- 선행 의존: §41 은 §15 Ledger·§16 Partition·§20 Head 리소스를 잠그는 것 — 대상 부재로 실효 없음. named lock/fencing token 은 순신규.
- cover: **행수준 SKIP LOCKED + claim_id 소유권 존재**(`Omnichannel.php:405,429-441,392,410`) · **원장 named lock/token/fencing = 0**.

## 4. 확장/구현 방향 (설계)

- 확장 기반(Golden Rule = Extend): `Omnichannel.php:405` 의 FOR UPDATE SKIP LOCKED + claim_id 소유권 패턴을 원장 append 직렬화의 substrate 로 재사용 — 단 SKIP LOCKED 는 "건너뛰기"(경합행 무시)라 원장 Head 갱신에는 부적합. Head_UPDATE 는 반드시 **대기 잠금 또는 CAS**(§44)로 직렬화해야 순서 보장.
- named/advisory lock 신설: `LEDGER_APPEND`/`HEAD_UPDATE`/`PARTITION_APPEND` 별 named lock(MySQL GET_LOCK 또는 lock row + fencing) — 현재 GET_LOCK 0 이므로 순신규. lock token digest 는 SHA-256(`MediaHost.php:93` 패턴) 재사용.
- Fencing 연동(Mandatory): §43 fencing token 을 lock 레코드에 결합 — 리스 만료 후 부활한 좀비 워커의 낮은 토큰 append 를 차단(§43 로 위임).
- 무후퇴: omni_outbox 클레임 로직은 발송큐 그대로 유지(§68 Regression Gate) — 원장 lock 은 KEEP_SEPARATE 신설.

관련: [[DSAR_APPROVAL_DECISION_LEDGER_LEASE]] · [[DSAR_APPROVAL_DECISION_LEDGER_FENCING_TOKEN]] · [[DSAR_APPROVAL_DECISION_LEDGER_OPTIMISTIC_VERSION]] · [[ADR_DSAR_DECISION_INTEGRITY_CORE_IMMUTABLE_LEDGER]].
